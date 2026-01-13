"""
Standalone notification scheduler tasks that can be run independently.
"""
import os
import sys
import django
import threading
import time
from datetime import date, datetime

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'livewell.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from tracking.models import Goal, Medication, GoalCompleted, MedicationTaken, ReminderTime
from notification.models import UserFCMToken, ScheduledNotification, Notification
from notification.firebase_service import firebase_service
from agent.services import get_ai_service
from agent.constants import NOTIFICATION_NUDGE_SYSTEM_PROMPT
from profiles.models import UserPreferences

User = get_user_model()


class NotificationScheduler:
    """Handles all notification scheduling and sending logic."""
    
    def __init__(self, verbose=True, force_goals=False, force_medications=False, 
                 force_nudges=False, force_question_nudges=False, force_summaries=False, force_all=False):
        """Initialize the scheduler with optional verbose output and force flags."""
        self.verbose = verbose
        self.force_goals = force_goals or force_all
        self.force_medications = force_medications or force_all
        self.force_nudges = force_nudges or force_all
        self.force_question_nudges = force_question_nudges or force_all
        self.force_summaries = force_summaries or force_all
    
    def log(self, message):
        """Log a message if verbose mode is enabled."""
        if self.verbose:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")
    
    def has_notification_been_sent_today(self, user, notification_type):
        """Check if a specific type of notification has been sent to user today."""
        today = date.today()
        return Notification.objects.filter(
            recipient=user,
            data__type=notification_type,
            created_at__date=today
        ).exists()
    
    def has_goal_reminder_been_sent_today(self, goal):
        """Check if a goal reminder has been sent today for a specific goal."""
        today = date.today()
        return Notification.objects.filter(
            recipient=goal.user,
            data__type="goal_reminder",
            data__goal_id=str(goal.id),
            created_at__date=today
        ).exists()
    
    def has_medication_reminder_been_sent_today(self, medication, reminder_time):
        """Check if a medication reminder has been sent today for a specific medication and time."""
        today = date.today()
        return Notification.objects.filter(
            recipient=medication.user,
            data__type="medication_reminder",
            data__medication_id=str(medication.id),
            data__reminder_time=reminder_time,
            created_at__date=today
        ).exists()
    
    def has_combined_goal_reminder_been_sent_today(self, user):
        """Check if a combined goal reminder has been sent today for a user."""
        today = date.today()
        return Notification.objects.filter(
            recipient=user,
            data__type="combined_goal_reminder",
            created_at__date=today
        ).exists()
    
    def has_combined_medication_reminder_been_sent_today(self, user, reminder_time):
        """Check if a combined medication reminder has been sent today for a user at a specific time."""
        today = date.today()
        return Notification.objects.filter(
            recipient=user,
            data__type="combined_medication_reminder",
            data__reminder_time=reminder_time,
            created_at__date=today
        ).exists()
    
    def should_send_nudge_based_on_time(self, user_preferences, current_hour):
        """Check if nudge should be sent based on user's time preference."""
        if not user_preferences:
            return True  # Default behavior if no preferences
        
        time_pref = user_preferences.notification_time_preference
        
        if time_pref == 'morning' and 6 <= current_hour < 12:
            return True
        elif time_pref == 'afternoon' and 12 <= current_hour < 18:
            return True
        elif time_pref == 'evening' and 18 <= current_hour < 22:
            return True
        elif time_pref == 'flexible':
            return True
        
        return False
    
    def should_send_nudge_based_on_frequency(self, user_preferences, current_hour):
        """Check if nudge should be sent based on user's frequency preference."""
        if not user_preferences:
            return True  # Default behavior if no preferences
        
        frequency = user_preferences.notification_frequency
        
        if frequency == 'none':
            return False
        elif frequency == 'daily':
            # Send once per day at preferred time
            return self.should_send_nudge_based_on_time(user_preferences, current_hour)
        elif frequency == 'twice_daily':
            # Send at morning (9 AM) and evening (6 PM)
            return current_hour == 9 or current_hour == 18
        elif frequency == 'three_times_daily':
            # Send at morning (9 AM), afternoon (2 PM), and evening (6 PM)
            return current_hour in [9, 14, 18]
        elif frequency == 'hourly':
            # Send every hour during active hours (8 AM - 9 PM)
            return 8 <= current_hour <= 21
        
        return True
    
    def check_scheduled_notifications(self, current_time):
        """Check for scheduled notifications that need to be sent."""
        try:
            due_notifications = ScheduledNotification.objects.filter(
                status='pending',
            )
            
            for scheduled_notification in due_notifications:
                self.send_scheduled_notification(scheduled_notification)
        
        except Exception as e:
            self.log(f'Error in send_scheduled_notification: {str(e)}')
    
    def send_scheduled_notification(self, scheduled_notification):
        """Send a scheduled notification."""
        try:
            fcm_token_record = UserFCMToken.objects.filter(
                user=scheduled_notification.recipient,
                is_active=True
            ).first()
            
            if not fcm_token_record:
                scheduled_notification.status = 'failed'
                scheduled_notification.save()
                return
            
            try:
                response = firebase_service.send_notification(
                    token=fcm_token_record.fcm_token,
                    title=scheduled_notification.title,
                    body=scheduled_notification.body,
                    data=scheduled_notification.data,
                    user_id=scheduled_notification.recipient.id
                )
                
                if scheduled_notification.frequency == 'once':
                    scheduled_notification.status = 'sent'
                    scheduled_notification.save()
                else:
                    scheduled_notification.mark_as_sent()
                    if scheduled_notification.next_send_at:
                        scheduled_notification.scheduled_time = scheduled_notification.next_send_at
                        scheduled_notification.status = 'pending'
                        scheduled_notification.save()
            
            except Exception as e:
                scheduled_notification.status = 'failed'
                scheduled_notification.save()
        
        except Exception as e:
            scheduled_notification.status = 'failed'
            scheduled_notification.save()
    
    def send_goal_reminder(self, goal):
        """Send reminder notification for incomplete goal."""
        try:
            fcm_token_record = UserFCMToken.objects.filter(
                user=goal.user,
                is_active=True
            ).first()
            
            if fcm_token_record:
                title = "Goal Reminder"
                body = f"Don't forget to complete your goal: {goal.title}"
                data = {
                    "type": "goal_reminder",
                    "goal_id": str(goal.id),
                    "category": goal.category
                }
                
                firebase_service.send_notification(
                    token=fcm_token_record.fcm_token,
                    title=title,
                    body=body,
                    data=data,
                    user_id=goal.user.id
                )
        
        except Exception as e:
            pass
    
    def send_medication_reminder(self, medication, reminder_time):
        """Send reminder notification for medication."""
        try:
            fcm_token_record = UserFCMToken.objects.filter(
                user=medication.user,
                is_active=True
            ).first()
            
            if fcm_token_record:
                title = "Medication Reminder"
                body = f"Time to take your medication: {medication.name} ({medication.dosage})"
                data = {
                    "type": "medication_reminder",
                    "medication_id": str(medication.id),
                    "reminder_time": reminder_time,
                    "dosage": medication.dosage
                }
                
                firebase_service.send_notification(
                    token=fcm_token_record.fcm_token,
                    title=title,
                    body=body,
                    data=data,
                    user_id=medication.user.id
                )
        
        except Exception as e:
            pass
    
    def send_combined_goal_reminders(self, goals):
        """Send a single combined notification for multiple goal reminders."""
        if not goals:
            return
        
        user = goals[0].user
        try:
            fcm_token_record = UserFCMToken.objects.filter(
                user=user,
                is_active=True
            ).first()
            
            if fcm_token_record:
                if len(goals) == 1:
                    title = "Goal Reminder"
                    body = f"Don't forget to complete your goal: {goals[0].title}"
                else:
                    title = f"{len(goals)} Goal Reminders"
                    goal_titles = [goal.title for goal in goals]
                    if len(goal_titles) <= 3:
                        body = f"Don't forget to complete your goals: {', '.join(goal_titles)}"
                    else:
                        displayed_goals = ', '.join(goal_titles[:2])
                        remaining_count = len(goal_titles) - 2
                        body = f"Don't forget to complete your goals: {displayed_goals}, and {remaining_count} more"
                
                data = {
                    "type": "combined_goal_reminder",
                    "goal_ids": ",".join([str(goal.id) for goal in goals]),
                    "categories": ",".join(list(set([goal.category for goal in goals]))),
                    "count": str(len(goals))
                }
                
                firebase_service.send_notification(
                    token=fcm_token_record.fcm_token,
                    title=title,
                    body=body,
                    data=data,
                    user_id=user.id
                )
        
        except Exception as e:
            pass
    
    def send_combined_medication_reminders(self, medications, reminder_time):
        """Send a single combined notification for multiple medication reminders."""
        if not medications:
            return
        
        user = medications[0].user
        try:
            fcm_token_record = UserFCMToken.objects.filter(
                user=user,
                is_active=True
            ).first()
            
            if fcm_token_record:
                if len(medications) == 1:
                    med = medications[0]
                    title = "Medication Reminder"
                    body = f"Time to take your medication: {med.name} ({med.dosage})"
                else:
                    title = f"{len(medications)} Medication Reminders"
                    med_names = [f"{med.name} ({med.dosage})" for med in medications]
                    if len(med_names) <= 3:
                        body = f"Time to take your medications: {', '.join(med_names)}"
                    else:
                        displayed_meds = ', '.join(med_names[:2])
                        remaining_count = len(med_names) - 2
                        body = f"Time to take your medications: {displayed_meds}, and {remaining_count} more"
                
                data = {
                    "type": "combined_medication_reminder",
                    "medication_ids": ",".join([str(med.id) for med in medications]),
                    "reminder_time": reminder_time,
                    "dosages": ",".join([med.dosage for med in medications]),
                    "count": str(len(medications))
                }
                
                firebase_service.send_notification(
                    token=fcm_token_record.fcm_token,
                    title=title,
                    body=body,
                    data=data,
                    user_id=user.id
                )
        
        except Exception as e:
            pass
    
    def send_nudge_notifications(self):
        """Send AI-generated nudges to users based on their preferences."""
        try:
            # Get current hour for timing checks
            current_hour = datetime.now().hour
            
            # Get all active users with FCM tokens
            active_users = User.objects.filter(
                is_active=True,
                fcm_token_record__is_active=True
            ).distinct()
            
            # Get AI service
            service = get_ai_service("gemini")
            
            for user in active_users:
                try:
                    # Get user preferences
                    try:
                        user_preferences = user.preferences
                    except UserPreferences.DoesNotExist:
                        user_preferences = None
                    
                    # Skip if forced nudges are not enabled and user preferences don't allow nudges
                    if not self.force_nudges:
                        # Check if nudge has already been sent today
                        if self.has_notification_been_sent_today(user, "nudge"):
                            continue
                        
                        # Check frequency and timing preferences
                        if not self.should_send_nudge_based_on_frequency(user_preferences, current_hour):
                            continue
                    
                    # Get FCM token for user
                    fcm_token_record = UserFCMToken.objects.filter(
                        user=user,
                        is_active=True
                    ).first()
                    
                    if not fcm_token_record:
                        continue
                    
                    # Generate personalized nudge
                    user_id = str(user.id)
                    session_id = user_id  # Using user_id as session_id
                    
                    # Generate nudge with custom prompt if needed
                    nudge_response = service.get_nudge(
                        user_id=user_id,
                        session_id=session_id,
                        system_prompt=NOTIFICATION_NUDGE_SYSTEM_PROMPT,
                        prompt="Based on my profile, health data, and recent activities, generate a helpful nudge or reminder.",
                        use_notification_tools=True,
                        is_question=False,
                        force_regenerate=True
                    )
                    
                    # Extract text from response if it's a dict
                    if isinstance(nudge_response, dict):
                        nudge_text = nudge_response.get('content', str(nudge_response))
                    else:
                        nudge_text = str(nudge_response).strip()
                    
                    # Send nudge as notification
                    title = "Wellness Nudge"
                    body = nudge_text
                    data = {
                        "type": "nudge",
                        "nudge_type": "daily_wellness"
                    }
                    
                    firebase_service.send_notification(
                        token=fcm_token_record.fcm_token,
                        title=title,
                        body=body,
                        data=data,
                        user_id=user.id
                    )
                
                except Exception as e:
                    # Log individual user failures but continue with others
                    self.log(f'Failed to send nudge to user {user.id}: {str(e)}')
                    continue
        
        except Exception as e:
            self.log(f'Error in nudge notification process: {str(e)}')
            pass
    
    def send_question_nudge_notifications(self):
        """Send AI-generated question nudges to users based on their preferences."""
        try:
            # Get current hour for timing checks
            current_hour = datetime.now().hour
            
            # Get all active users with FCM tokens
            active_users = User.objects.filter(
                is_active=True,
                fcm_token_record__is_active=True
            ).distinct()
            
            # Get AI service
            service = get_ai_service("gemini")
            
            for user in active_users:
                try:
                    # Get user preferences
                    try:
                        user_preferences = user.preferences
                    except UserPreferences.DoesNotExist:
                        user_preferences = None
                    
                    # Skip if forced question nudges are not enabled and smart checks apply
                    if not self.force_question_nudges:
                        # Check if question nudge has already been sent today
                        if self.has_notification_been_sent_today(user, "question_nudge"):
                            continue
                        
                        # Check frequency and timing preferences (using same as regular nudges)
                        if not self.should_send_nudge_based_on_frequency(user_preferences, current_hour):
                            continue
                    
                    # Get FCM token for user
                    fcm_token_record = UserFCMToken.objects.filter(
                        user=user,
                        is_active=True
                    ).first()
                    
                    if not fcm_token_record:
                        continue
                    
                    # Generate personalized question nudge
                    user_id = str(user.id)
                    
                    # Generate question nudge
                    question_response = service.get_question_nudge(
                        user_id=user_id,
                        force_regenerate=True
                    )
                    
                    # Skip if no question was generated (user might have all preferences up to date)
                    if not question_response:
                        continue
                    
                    # Extract text from response if it's a dict
                    if isinstance(question_response, dict):
                        question_text = question_response.get('content', str(question_response))
                    else:
                        question_text = str(question_response).strip()
                    
                    # Send question nudge as notification
                    title = "Health Profile Question"
                    body = question_text
                    data = {
                        "type": "question_nudge",
                        "nudge_type": "question"
                    }
                    
                    firebase_service.send_notification(
                        token=fcm_token_record.fcm_token,
                        title=title,
                        body=body,
                        data=data,
                        user_id=user.id
                    )
                
                except Exception as e:
                    # Log individual user failures but continue with others
                    self.log(f'Failed to send question nudge to user {user.id}: {str(e)}')
                    continue
        
        except Exception as e:
            self.log(f'Error in question nudge notification process: {str(e)}')
            pass
    
    def check_and_generate_summaries(self):
        """Check all chat sessions and generate summaries for those without."""
        try:
            # Import the AI service
            service = get_ai_service("gemini")
            
            # Generate missing summaries
            stats = service.generate_missing_summaries()
            
            # Log only if summaries were generated or errors occurred
            if stats['summaries_generated'] > 0 or stats['errors'] > 0:
                self.log(
                    f"Summary generation: {stats['summaries_generated']} generated/updated, "
                    f"{stats['missing_summaries']} needed updates, "
                    f"{stats['errors']} errors"
                )
        except Exception as e:
            self.log(f'Error in summary generation process: {str(e)}')
    
    def check_and_send_notifications(self):
        """Check for incomplete goals and medications and send notifications."""
        try:
            today = date.today()
            current_time = datetime.now().time()
            current_hour = current_time.hour
            current_minute = current_time.minute
            now = timezone.now()
            
            # Always check scheduled notifications (they have their own schedule)
            self.check_scheduled_notifications(now)
            
            if 6 <= current_hour < 12:
                reminder_time = ReminderTime.MORNING
            elif 12 <= current_hour < 17:
                reminder_time = ReminderTime.NOON
            elif 17 <= current_hour < 21:
                reminder_time = ReminderTime.EVENING
            else:
                reminder_time = ReminderTime.BEDTIME
            
            # Check goals if forced or not completed (grouped by user)
            if self.force_goals:
                self.log("Force sending goal reminders...")
                active_goals = Goal.objects.filter(is_active=True).select_related('user')
                # Group goals by user
                user_goals = {}
                for goal in active_goals:
                    if goal.user not in user_goals:
                        user_goals[goal.user] = []
                    user_goals[goal.user].append(goal)
                
                # Send combined reminders for each user
                for user, goals in user_goals.items():
                    self.send_combined_goal_reminders(goals)
            else:
                active_goals = Goal.objects.filter(is_active=True).select_related('user')
                # Group pending goals by user
                user_pending_goals = {}
                
                for goal in active_goals:
                    is_completed_today = GoalCompleted.objects.filter(
                        goal=goal,
                        user=goal.user,
                        date_completed=today
                    ).exists()
                    
                    if not is_completed_today:
                        if goal.user not in user_pending_goals:
                            user_pending_goals[goal.user] = []
                        user_pending_goals[goal.user].append(goal)
                
                # Send combined reminders for users with pending goals (if not already sent today)
                for user, goals in user_pending_goals.items():
                    if not self.has_combined_goal_reminder_been_sent_today(user):
                        self.send_combined_goal_reminders(goals)
            
            # Check medications if forced or scheduled (grouped by user)
            if self.force_medications:
                self.log("Force sending medication reminders...")
                active_medications = Medication.objects.filter(is_active=True).select_related('user')
                # Group medications by user
                user_medications = {}
                for medication in active_medications:
                    if medication.user not in user_medications:
                        user_medications[medication.user] = []
                    user_medications[medication.user].append(medication)
                
                # Send combined reminders for each user
                for user, medications in user_medications.items():
                    self.send_combined_medication_reminders(medications, reminder_time)
            else:
                active_medications = Medication.objects.filter(is_active=True).select_related('user')
                # Group pending medications by user
                user_pending_medications = {}
                
                for medication in active_medications:
                    if reminder_time in medication.reminder_times:
                        is_taken_today = MedicationTaken.objects.filter(
                            medication=medication,
                            user=medication.user,
                            date_taken=today,
                            scheduled_time=reminder_time
                        ).exists()
                        
                        if not is_taken_today:
                            if medication.user not in user_pending_medications:
                                user_pending_medications[medication.user] = []
                            user_pending_medications[medication.user].append(medication)
                
                # Send combined reminders for users with pending medications (if not already sent today)
                for user, medications in user_pending_medications.items():
                    if not self.has_combined_medication_reminder_been_sent_today(user, reminder_time):
                        self.send_combined_medication_reminders(medications, reminder_time)
            
            # Check nudges if forced or at the hour
            if self.force_nudges or (current_minute == 0):
                if self.force_nudges:
                    self.log("Force sending nudge notifications...")
                self.send_nudge_notifications()
            
            # Check question nudges if forced
            if self.force_question_nudges:
                self.log("Force sending question nudge notifications...")
                self.send_question_nudge_notifications()
            
            # Check summaries if forced or every 5 minutes
            if self.force_summaries or (current_minute % 5 == 0):
                if self.force_summaries:
                    self.log("Force generating summaries...")
                self.check_and_generate_summaries()
        
        except Exception as e:
            self.log(f'Error in check_and_send_notifications: {str(e)}')
            import traceback
            self.log(f'Traceback: {traceback.format_exc()}')
    
    def run_once(self):
        """Run the notification check once."""
        self.log('Running notification check...')
        self.check_and_send_notifications()
        self.log('Notification check completed.')
    
    def run_continuous(self, interval_seconds=60):
        """Run the notification checker continuously with the specified interval."""
        self.log(f'Starting continuous notification scheduler (checking every {interval_seconds} seconds)...')
        if self.force_goals:
            self.log('Force mode enabled for: GOALS')
        if self.force_medications:
            self.log('Force mode enabled for: MEDICATIONS')
        if self.force_nudges:
            self.log('Force mode enabled for: NUDGES')
        if self.force_question_nudges:
            self.log('Force mode enabled for: QUESTION NUDGES')
        if self.force_summaries:
            self.log('Force mode enabled for: SUMMARIES')
        
        try:
            while True:
                self.check_and_send_notifications()
                time.sleep(interval_seconds)
        except KeyboardInterrupt:
            self.log('Scheduler stopped by user.')
        except Exception as e:
            self.log(f'Scheduler stopped due to error: {str(e)}')


def main():
    """Main function to run the scheduler from command line."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Run notification scheduler tasks')
    parser.add_argument(
        '--once',
        action='store_true',
        help='Run the scheduler once and exit'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=60,
        help='Interval in seconds between checks (default: 60)'
    )
    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Run without verbose output'
    )
    
    # Force flags for different notification types
    parser.add_argument(
        '--force-goals',
        action='store_true',
        help='Force send goal reminders regardless of completion status'
    )
    parser.add_argument(
        '--force-medications',
        action='store_true',
        help='Force send medication reminders regardless of schedule'
    )
    parser.add_argument(
        '--force-nudges',
        action='store_true',
        help='Force send nudge notifications regardless of schedule'
    )
    parser.add_argument(
        '--force-summaries',
        action='store_true',
        help='Force generate conversation summaries regardless of schedule'
    )
    parser.add_argument(
        '--force-question-nudges',
        action='store_true',
        help='Force send question nudges to gather user preference information'
    )
    parser.add_argument(
        '--force-all',
        action='store_true',
        help='Force all notification types to run'
    )
    
    args = parser.parse_args()
    
    scheduler = NotificationScheduler(
        verbose=not args.quiet,
        force_goals=args.force_goals,
        force_medications=args.force_medications,
        force_nudges=args.force_nudges,
        force_question_nudges=args.force_question_nudges,
        force_summaries=args.force_summaries,
        force_all=args.force_all
    )
    
    if args.once:
        scheduler.run_once()
    else:
        scheduler.run_continuous(interval_seconds=args.interval)


if __name__ == '__main__':
    main()