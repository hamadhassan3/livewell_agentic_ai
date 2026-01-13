from django.contrib import admin
from .models import UserFCMToken, NotificationLog


@admin.register(UserFCMToken)
class UserFCMTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_active', 'updated_at', 'created_at')
    list_filter = ('is_active', 'created_at', 'updated_at')
    search_fields = ('user__email', 'user__name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-updated_at',)


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient', 'success', 'is_multicast', 'sent_at')
    list_filter = ('success', 'is_multicast', 'sent_at')
    search_fields = ('title', 'body', 'recipient__email')
    readonly_fields = ('sent_at',)
    ordering = ('-sent_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('recipient')
