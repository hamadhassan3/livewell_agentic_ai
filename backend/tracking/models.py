import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.contrib.postgres.fields import ArrayField
from django.db.models import JSONField


class ReminderTime(models.TextChoices):
    MORNING = 'morning', _('Morning')
    NOON = 'noon', _('Noon')
    EVENING = 'evening', _('Evening')
    BEDTIME = 'bedtime', _('Bedtime')


class Frequency(models.TextChoices):
    DAILY = 'daily', _('Daily')
    WEEKLY = 'weekly', _('Weekly')
    FORTNIGHTLY = 'fortnightly', _('Fortnightly')
    MONTHLY = 'monthly', _('Monthly')


class GoalCategory(models.TextChoices):
    ACTIVITY = 'activity', _('Activity')
    SOCIAL = 'social', _('Social')
    NUTRITION = 'nutrition', _('Nutrition')
    MIND = 'mind', _('Mind')


class Goal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='goals')
    title = models.CharField(max_length=255)
    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    category = models.CharField(max_length=50, choices=GoalCategory.choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} - {self.title}"


class Medication(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='medications')
    name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100)
    notes = models.TextField(blank=True, null=True)
    frequency_type = models.CharField(max_length=20, choices=Frequency.choices, blank=True, null=True)
    reminder_times = ArrayField(
        models.CharField(max_length=10, choices=ReminderTime.choices),
        default=list,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} - {self.name}"


class MedicationTaken(models.Model):
    """
    Model to track when medications are taken by users.
    """
    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name='taken_records')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='medication_taken_records')
    taken_at = models.DateTimeField(auto_now_add=True)
    scheduled_time = models.CharField(max_length=10, choices=ReminderTime.choices, blank=True, null=True)
    date_taken = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('medication', 'user', 'scheduled_time', 'date_taken')
        ordering = ['-taken_at']

    def __str__(self):
        return f"{self.user.email} - {self.medication.name} - {self.date_taken} {self.scheduled_time or ''}"


class GoalCompleted(models.Model):
    """
    Model to track when goals are completed by users.
    """
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='completed_records')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='goal_completed_records')
    completed_at = models.DateTimeField(auto_now_add=True)
    date_completed = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('goal', 'user', 'date_completed')
        ordering = ['-completed_at']

    def __str__(self):
        return f"{self.user.email} - {self.goal.title} - {self.date_completed}"


class Event(models.Model):
    """
    Model to store events, potentially from SerpAPI or created by users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='events')
    title = models.CharField(max_length=255)
    address = ArrayField(models.CharField(max_length=255), blank=True, default=list)
    link = models.URLField(max_length=500, blank=True)
    start_date = models.CharField(max_length=100) # From SerpAPI, can be "Mar 23" or a full date
    when = models.CharField(max_length=255, blank=True)
    json_data = JSONField(blank=True, null=True) # To store the original JSON from SerpAPI
    is_attended = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.title}"

    class Meta:
        unique_together = ('user', 'link')


class StepCount(models.Model):
    """
    Model to store daily step counts for a user.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='step_counts')
    date = models.DateField()
    steps = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date') # Ensure only one step count per user per day
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.email} - {self.date}: {self.steps} steps"
