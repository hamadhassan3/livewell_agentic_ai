from django.contrib import admin

# Registering models for admin interface
from .models import Conversation, Message, ConversationSummary

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'user', 'created_at', 'updated_at')
    search_fields = ('session_id', 'user__email')
    list_filter = ('created_at', 'updated_at')
    ordering = ('-updated_at',)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'role', 'timestamp', 'feedback', 'embedding_stored')
    search_fields = ('content', 'conversation__session_id')
    list_filter = ('role', 'feedback', 'embedding_stored', 'timestamp')
    ordering = ('-timestamp',)


@admin.register(ConversationSummary)
class ConversationSummaryAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'created_at', 'updated_at')
    search_fields = ('conversation__session_id', 'summary')
    list_filter = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
