from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class UserFCMToken(models.Model):
    """
    Model to store FCM tokens for users for push notifications
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='fcm_token_record')
    fcm_token = models.TextField(help_text="Firebase Cloud Messaging token for push notifications")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, help_text="Whether this token is active")
    
    class Meta:
        verbose_name = "FCM Token"
        verbose_name_plural = "FCM Tokens"
    
    def __str__(self):
        return f"{self.user.email} - FCM Token"


class NotificationLog(models.Model):
    """
    Model to log sent notifications for tracking and debugging
    """
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_notifications', null=True, blank=True)
    title = models.CharField(max_length=255)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    image_url = models.URLField(blank=True, null=True)
    fcm_response = models.TextField(blank=True, null=True, help_text="FCM service response")
    sent_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    is_multicast = models.BooleanField(default=False, help_text="Whether this was sent to multiple users")
    
    class Meta:
        verbose_name = "Notification Log"
        verbose_name_plural = "Notification Logs"
        ordering = ['-sent_at']
    
    def __str__(self):
        recipient_info = self.recipient.email if self.recipient else "Multiple users"
        return f"{recipient_info} - {self.title}"


class Notification(models.Model):
    """
    Model to store received notifications
    """
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    image_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    fcm_message_id = models.CharField(max_length=255, blank=True, null=True, help_text="FCM message ID from Firebase")
    
    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.recipient.email} - {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        from django.utils import timezone
        if self.status != 'read':
            self.status = 'read'
            self.read_at = timezone.now()
            self.save()


class ScheduledNotification(models.Model):
    """
    Model to schedule notifications for future delivery
    """
    FREQUENCY_CHOICES = [
        ('once', 'One Time'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]
    
    NOTIFICATION_TYPE_CHOICES = [
        ('reminder', 'Reminder'),
        ('alert', 'Alert'),
        ('info', 'Information'),
    ]
    
    # Notification content
    title = models.CharField(max_length=255)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES, default='reminder')
    
    # Recipient
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scheduled_notifications')
    
    # Scheduling
    scheduled_time = models.DateTimeField()
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='once')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Tracking
    last_sent_at = models.DateTimeField(null=True, blank=True)
    next_send_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Scheduled Notification"
        verbose_name_plural = "Scheduled Notifications"
        ordering = ['scheduled_time']
        indexes = [
            models.Index(fields=['status', 'scheduled_time']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.email} - {self.scheduled_time}"
    
    def calculate_next_send_time(self):
        """Calculate the next send time based on frequency"""
        if self.frequency == 'once':
            return None
        
        from datetime import timedelta
        
        if self.frequency == 'daily':
            next_time = self.last_sent_at + timedelta(days=1) if self.last_sent_at else self.scheduled_time
        elif self.frequency == 'weekly':
            next_time = self.last_sent_at + timedelta(weeks=1) if self.last_sent_at else self.scheduled_time
        elif self.frequency == 'monthly':
            if self.last_sent_at:
                # Add roughly a month (30 days)
                next_time = self.last_sent_at + timedelta(days=30)
            else:
                next_time = self.scheduled_time
        else:
            return None
        
        return next_time
    
    def mark_as_sent(self):
        """Update notification after successful sending"""
        self.last_sent_at = timezone.now()
        self.next_send_at = self.calculate_next_send_time()
        
        if self.frequency == 'once':
            self.status = 'sent'
        
        self.save()
