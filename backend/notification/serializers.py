from rest_framework import serializers
from .models import UserFCMToken, NotificationLog, Notification, ScheduledNotification


class UserFCMTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFCMToken
        fields = ['fcm_token', 'updated_at', 'is_active']
        read_only_fields = ['updated_at']


class UpdateFCMTokenSerializer(serializers.Serializer):
    fcm_token = serializers.CharField(max_length=1000, required=True)
    
    def validate_fcm_token(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("FCM token cannot be empty")
        return value.strip()


class SendNotificationSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=True)
    body = serializers.CharField(required=True)
    data = serializers.JSONField(required=False, default=dict)
    image_url = serializers.URLField(required=False, allow_blank=True)
    user_id = serializers.IntegerField(required=False)
    send_to_all = serializers.BooleanField(required=False, default=False)
    
    def validate(self, attrs):
        user_id = attrs.get('user_id')
        send_to_all = attrs.get('send_to_all', False)
        
        if not user_id and not send_to_all:
            raise serializers.ValidationError(
                "Either 'user_id' or 'send_to_all' must be provided"
            )
        
        if user_id and send_to_all:
            raise serializers.ValidationError(
                "Cannot specify both 'user_id' and 'send_to_all'"
            )
        
        return attrs


class NotificationLogSerializer(serializers.ModelSerializer):
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)
    
    class Meta:
        model = NotificationLog
        fields = [
            'id', 'recipient_email', 'title', 'body', 'data', 
            'image_url', 'sent_at', 'success', 'error_message', 'is_multicast'
        ]
        read_only_fields = ['id', 'sent_at']


class NotificationSerializer(serializers.ModelSerializer):
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)
    is_read = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient_email', 'title', 'body', 'data', 
            'image_url', 'status', 'created_at', 'read_at', 'is_read'
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'recipient_email']
    
    def get_is_read(self, obj):
        return obj.status == 'read'


class ScheduledNotificationSerializer(serializers.ModelSerializer):
    recipient_email = serializers.CharField(source='recipient.email', read_only=True)
    
    class Meta:
        model = ScheduledNotification
        fields = [
            'id', 'title', 'body', 'data', 'notification_type',
            'recipient', 'recipient_email', 'scheduled_time', 
            'frequency', 'status', 'last_sent_at', 'next_send_at',
            'created_at'
        ]
        read_only_fields = ['id', 'recipient_email', 'status', 'last_sent_at', 'next_send_at', 'created_at']
    
    def validate_scheduled_time(self, value):
        from django.utils import timezone
        if value < timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future")
        return value