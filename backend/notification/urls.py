from django.urls import path
from .views import (
    UpdateFCMTokenView, SendNotificationView, 
    NotificationLogListView, FCMTokenStatusView,
    NotificationListView, NotificationDetailView, NotificationMarkAllReadView,
    ScheduleNotificationView, ScheduledNotificationDetailView
)

urlpatterns = [
    # FCM token management
    path("fcm/token/", UpdateFCMTokenView.as_view(), name="update_fcm_token"),
    path("fcm/token/status/", FCMTokenStatusView.as_view(), name="fcm_token_status"),
    
    # Notification sending
    path("send/", SendNotificationView.as_view(), name="send_notification"),
    
    # Notification logs (admin/debug purposes)
    path("logs/", NotificationLogListView.as_view(), name="notification_logs"),
    
    # User notifications (with read status)
    path("", NotificationListView.as_view(), name="notifications"),
    path("<int:notification_id>/", NotificationDetailView.as_view(), name="notification_detail"),
    path("mark-all-read/", NotificationMarkAllReadView.as_view(), name="mark_all_read"),
    
    # Scheduled notifications
    path("schedule/", ScheduleNotificationView.as_view(), name="schedule_notification"),
    path("schedule/<int:pk>/", ScheduledNotificationDetailView.as_view(), name="scheduled_notification_detail"),
]