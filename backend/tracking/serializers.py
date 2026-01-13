from rest_framework import serializers
from .models import Goal, Medication, MedicationTaken, GoalCompleted, ReminderTime, Event, StepCount


class GoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Goal
        fields = ['id', 'title', 'frequency', 'category', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class MedicationSerializer(serializers.ModelSerializer):
    reminder_times = serializers.ListField(
        child=serializers.ChoiceField(choices=ReminderTime.choices),
        allow_empty=True,
        required=False
    )

    class Meta:
        model = Medication
        fields = [
            'id', 'name', 'dosage', 'notes', 'frequency_type', 
            'reminder_times', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MedicationTakenSerializer(serializers.ModelSerializer):
    medication_name = serializers.CharField(source='medication.name', read_only=True)
    
    class Meta:
        model = MedicationTaken
        fields = [
            'id', 'medication', 'medication_name', 'taken_at', 
            'scheduled_time', 'date_taken', 'notes'
        ]
        read_only_fields = ['id', 'taken_at', 'date_taken']


class DashboardMedicationSerializer(serializers.ModelSerializer):
    """
    Serializer for medications in dashboard view with taken status.
    """
    taken_today = serializers.SerializerMethodField()
    
    class Meta:
        model = Medication
        fields = ['id', 'name', 'reminder_times', 'taken_today']
    
    def get_taken_today(self, obj):
        """
        Get medication taken status for today grouped by reminder times.
        """
        from django.utils import timezone
        from datetime import date
        
        user = self.context.get('request').user if self.context.get('request') else None
        if not user:
            return {}
            
        today = date.today()
        taken_records = MedicationTaken.objects.filter(
            medication=obj,
            user=user,
            date_taken=today
        )
        
        # Create a mapping of reminder times to taken status
        taken_status = {}
        for reminder_time in obj.reminder_times:
            taken_status[reminder_time] = taken_records.filter(
                scheduled_time=reminder_time
            ).exists()
            
        return taken_status


class GoalCompletedSerializer(serializers.ModelSerializer):
    goal_title = serializers.CharField(source='goal.title', read_only=True)
    
    class Meta:
        model = GoalCompleted
        fields = [
            'id', 'goal', 'goal_title', 'completed_at', 
            'date_completed', 'notes'
        ]
        read_only_fields = ['id', 'completed_at', 'date_completed']


class DashboardGoalSerializer(serializers.ModelSerializer):
    """
    Serializer for goals in dashboard view with completion status.
    """
    completed_today = serializers.SerializerMethodField()
    
    class Meta:
        model = Goal
        fields = ['id', 'title', 'frequency', 'category', 'completed_today']
    
    def get_completed_today(self, obj):
        """
        Get goal completion status for today.
        """
        from datetime import date
        
        user = self.context.get('request').user if self.context.get('request') else None
        if not user:
            return False
            
        today = date.today()
        return GoalCompleted.objects.filter(
            goal=obj,
            user=user,
            date_completed=today
        ).exists()


class EventSerializer(serializers.ModelSerializer):
    """
    Serializer for user-saved events.
    """
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'address', 'link', 'start_date', 'when', 
            'json_data', 'is_attended', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StepCountSerializer(serializers.ModelSerializer):
    """
    Serializer for daily step counts.
    """
    class Meta:
        model = StepCount
        fields = ['id', 'date', 'steps', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']