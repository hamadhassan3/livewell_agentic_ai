from django.db import models
from django.conf import settings


class Conversation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['session_id', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"Conversation {self.session_id} - {self.user}"


class Message(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    FEEDBACK_CHOICES = [
        ('like', 'Like'),
        ('dislike', 'Dislike'),
        ('love', 'Love')
    ]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # For vector DB integration
    embedding_stored = models.BooleanField(default=False)
    embedding_id = models.CharField(max_length=255, null=True, blank=True)
    feedback = models.CharField(max_length=10, choices=FEEDBACK_CHOICES, null=True, blank=True)
    
    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['conversation', 'timestamp']),
            models.Index(fields=['embedding_stored']),
        ]


class Nudge(models.Model):
    NUDGE_TYPE_CHOICES = [
        ('health', 'Health'),
        ('medication', 'Medication'),
        ('activity', 'Activity'),
        ('wellness', 'Wellness'),
        ('general', 'General'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    nudge_type = models.CharField(max_length=20, choices=NUDGE_TYPE_CHOICES, default='general')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Track if this nudge was shown to the user
    shown_at = models.DateTimeField(null=True, blank=True)
    
    # Track user feedback
    feedback = models.CharField(max_length=20, null=True, blank=True)
    feedback_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"Nudge for {self.user} - {self.nudge_type} - {self.created_at}"


class ConversationSummary(models.Model):
    conversation = models.OneToOneField(Conversation, on_delete=models.CASCADE, related_name='summary')
    summary = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
        ]
    
    def __str__(self):
        return f"Summary for {self.conversation.session_id}"


class QuestionNudge(models.Model):
    QUESTION_TYPE_CHOICES = [
        ('preference', 'Preference'),
        ('health_update', 'Health Update'),
        ('medication', 'Medication'),
        ('activity', 'Activity'),
        ('feedback', 'Feedback'),
        ('general', 'General'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('answered', 'Answered'),
        ('skipped', 'Skipped'),
        ('expired', 'Expired'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default='general')
    question = models.TextField()
    user_response = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Related conversation session for context
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='question_nudges')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Track when question was shown and answered
    shown_at = models.DateTimeField(null=True, blank=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    
    # AI response to user's answer
    ai_response = models.TextField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"Question for {self.user} - {self.question_type} - {self.status}"


class GoalNudge(models.Model):
    GOAL_TYPE_CHOICES = [
        ('physical', 'Physical Activity'),
        ('nutrition', 'Nutrition'),
        ('sleep', 'Sleep'),
        ('cognitive', 'Cognitive'),
        ('social', 'Social'),
        ('wellness', 'Wellness'),
        ('general', 'General'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('answered', 'Answered'),
        ('skipped', 'Skipped'),
        ('expired', 'Expired'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    goal_type = models.CharField(max_length=20, choices=GOAL_TYPE_CHOICES, default='general')
    goal_suggestion = models.TextField()
    user_response = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Related conversation session for context
    conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='goal_nudges')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Track when goal was shown and answered
    shown_at = models.DateTimeField(null=True, blank=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    
    # AI response to user's answer
    ai_response = models.TextField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"Goal for {self.user} - {self.goal_type} - {self.status}"
