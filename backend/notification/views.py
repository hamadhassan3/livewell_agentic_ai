from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import UserFCMToken, NotificationLog, Notification, ScheduledNotification
from .serializers import (
    UserFCMTokenSerializer, UpdateFCMTokenSerializer, 
    SendNotificationSerializer, NotificationLogSerializer, NotificationSerializer,
    ScheduledNotificationSerializer
)
from .firebase_service import firebase_service

User = get_user_model()


class UpdateFCMTokenView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = UpdateFCMTokenSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        fcm_token = serializer.validated_data['fcm_token']
        user = request.user
        
        # Create or update the FCM token record
        fcm_token_record, created = UserFCMToken.objects.update_or_create(
            user=user,
            defaults={
                'fcm_token': fcm_token,
                'is_active': True
            }
        )
        
        return Response({
            'message': 'FCM token updated successfully',
            'fcm_token': fcm_token,
            'updated_at': fcm_token_record.updated_at
        })
    
    def delete(self, request):
        user = request.user
        try:
            fcm_token_record = UserFCMToken.objects.get(user=user)
            fcm_token_record.is_active = False
            fcm_token_record.save()
        except UserFCMToken.DoesNotExist:
            pass
        
        return Response({
            'message': 'FCM token removed successfully'
        })


class SendNotificationView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SendNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        title = data['title']
        body = data['body']
        notification_data = data.get('data', {})
        image_url = data.get('image_url')
        user_id = data.get('user_id')
        send_to_all = data.get('send_to_all', False)
        
        try:
            if send_to_all:
                # Send to all users with active FCM tokens
                active_tokens = UserFCMToken.objects.filter(is_active=True).select_related('user')
                tokens = [token_record.fcm_token for token_record in active_tokens]
                
                if not tokens:
                    return Response({
                        'error': 'No users with active FCM tokens found'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                try:
                    response = firebase_service.send_multicast_notification(
                        tokens=tokens,
                        title=title,
                        body=body,
                        data=notification_data,
                        image_url=image_url
                    )
                    
                    # Log the notification
                    NotificationLog.objects.create(
                        recipient=None,  # Multiple users
                        title=title,
                        body=body,
                        data=notification_data,
                        image_url=image_url,
                        fcm_response=str(response.success_count),
                        success=response.success_count > 0,
                        is_multicast=True
                    )
                    
                    return Response({
                        'message': 'Notifications sent',
                        'success_count': response.success_count,
                        'failure_count': response.failure_count
                    })
                except ValueError as ve:
                    return Response({
                        'error': f'Firebase not configured: {str(ve)}'
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
            elif user_id:
                # Send to specific user
                try:
                    user = User.objects.get(id=user_id)
                    fcm_token_record = UserFCMToken.objects.get(user=user, is_active=True)
                except User.DoesNotExist:
                    return Response(
                        {'error': 'User not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                except UserFCMToken.DoesNotExist:
                    return Response(
                        {'error': 'User has no active FCM token'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    response = firebase_service.send_notification(
                        token=fcm_token_record.fcm_token,
                        title=title,
                        body=body,
                        data=notification_data,
                        image_url=image_url
                    )
                    
                    # Log the notification
                    NotificationLog.objects.create(
                        recipient=user,
                        title=title,
                        body=body,
                        data=notification_data,
                        image_url=image_url,
                        fcm_response=str(response),
                        success=True,
                        is_multicast=False
                    )
                    
                    return Response({
                        'message': 'Notification sent successfully',
                        'response': response
                    })
                except ValueError as ve:
                    return Response({
                        'error': f'Firebase not configured: {str(ve)}'
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                except Exception as e:
                    # Log failed notification
                    NotificationLog.objects.create(
                        recipient=user,
                        title=title,
                        body=body,
                        data=notification_data,
                        image_url=image_url,
                        success=False,
                        error_message=str(e),
                        is_multicast=False
                    )
                    raise
                
        except Exception as e:
            return Response(
                {'error': f'Failed to send notification: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationLogListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Allow filtering by recipient if user is admin or getting their own logs
        user = request.user
        recipient_id = request.query_params.get('recipient_id')
        
        if recipient_id and (user.is_staff or str(user.id) == recipient_id):
            logs = NotificationLog.objects.filter(recipient_id=recipient_id)
        elif user.is_staff:
            logs = NotificationLog.objects.all()
        else:
            logs = NotificationLog.objects.filter(recipient=user)
        
        serializer = NotificationLogSerializer(logs[:50], many=True)  # Limit to last 50
        return Response(serializer.data)


class FCMTokenStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        try:
            fcm_token_record = UserFCMToken.objects.get(user=user)
            serializer = UserFCMTokenSerializer(fcm_token_record)
            return Response(serializer.data)
        except UserFCMToken.DoesNotExist:
            return Response({
                'fcm_token': None,
                'updated_at': None,
                'is_active': False
            })


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        notifications = Notification.objects.filter(recipient=user).order_by('-created_at')[:50]
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class NotificationDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, notification_id):
        user = request.user
        try:
            notification = Notification.objects.get(id=notification_id, recipient=user)
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        action = request.data.get('action')
        if action == 'mark_read':
            notification.mark_as_read()
            return Response({'message': 'Notification marked as read'})
        
        return Response(
            {'error': 'Invalid action'},
            status=status.HTTP_400_BAD_REQUEST
        )


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        unread_notifications = Notification.objects.filter(
            recipient=user
        ).exclude(status='read')
        
        count = 0
        for notification in unread_notifications:
            notification.mark_as_read()
            count += 1
        
        return Response({
            'message': f'Marked {count} notifications as read',
            'count': count
        })


class ScheduleNotificationView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Schedule a new notification"""
        serializer = ScheduledNotificationSerializer(data=request.data)
        if serializer.is_valid():
            # If no recipient specified, use the requesting user
            if 'recipient' not in request.data:
                serializer.save(recipient=request.user)
            else:
                serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request):
        """Get list of scheduled notifications for the user"""
        user = request.user
        # Users can see their own scheduled notifications
        notifications = ScheduledNotification.objects.filter(
            recipient=user
        ).exclude(status='sent').order_by('scheduled_time')
        
        serializer = ScheduledNotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class ScheduledNotificationDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        """Get details of a specific scheduled notification"""
        try:
            notification = ScheduledNotification.objects.get(
                pk=pk, 
                recipient=request.user
            )
        except ScheduledNotification.DoesNotExist:
            return Response(
                {'error': 'Scheduled notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ScheduledNotificationSerializer(notification)
        return Response(serializer.data)
    
    def patch(self, request, pk):
        """Update a scheduled notification"""
        try:
            notification = ScheduledNotification.objects.get(
                pk=pk, 
                recipient=request.user,
                status='pending'  # Can only update pending notifications
            )
        except ScheduledNotification.DoesNotExist:
            return Response(
                {'error': 'Scheduled notification not found or cannot be modified'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ScheduledNotificationSerializer(
            notification, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        """Cancel/delete a scheduled notification"""
        try:
            notification = ScheduledNotification.objects.get(
                pk=pk, 
                recipient=request.user,
                status='pending'
            )
        except ScheduledNotification.DoesNotExist:
            return Response(
                {'error': 'Scheduled notification not found or already sent'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        notification.delete()
        return Response(
            {'message': 'Scheduled notification cancelled'},
            status=status.HTTP_204_NO_CONTENT
        )
