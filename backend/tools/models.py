from django.db import models
from django.contrib.auth import get_user_model
from agent.models import Conversation

User = get_user_model()


class ToolRequest(models.Model):
    """
    Tracks tool execution requests from the AI that require client-side execution
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('executing', 'Executing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('timeout', 'Timeout'),
        ('cancelled', 'Cancelled'),
    ]
    
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE,
        related_name='tool_requests'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tool_requests',
        null=True,
        blank=True
    )
    tool_name = models.CharField(max_length=100)
    parameters = models.JSONField(default=dict)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    result = models.JSONField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    
    # Tracking fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    
    # Optional metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Store conversation context for resumption
    conversation_context = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['conversation', 'status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.tool_name} - {self.status} ({self.conversation.session_id})"
    
    def mark_completed(self, result):
        """Mark the request as completed with result"""
        from django.utils import timezone
        self.status = 'completed'
        self.result = result
        self.executed_at = timezone.now()
        self.save()
    
    def mark_failed(self, error_message):
        """Mark the request as failed with error message"""
        from django.utils import timezone
        self.status = 'failed'
        self.error_message = error_message
        self.executed_at = timezone.now()
        self.save()
