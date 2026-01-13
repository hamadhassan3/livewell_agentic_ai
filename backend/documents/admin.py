from django.contrib import admin
from .models import Document, DocumentSearchHistory


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'user', 'file_size', 'chunks_count', 'uploaded_at', 'processed_at']
    list_filter = ['uploaded_at', 'processed_at']
    search_fields = ['filename', 'user__email']
    readonly_fields = ['uploaded_at', 'processed_at']
    ordering = ['-uploaded_at']


@admin.register(DocumentSearchHistory)
class DocumentSearchHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'query_preview', 'results_count', 'searched_at']
    list_filter = ['searched_at']
    search_fields = ['user__email', 'query']
    readonly_fields = ['searched_at']
    ordering = ['-searched_at']
    
    def query_preview(self, obj):
        return obj.query[:50] + "..." if len(obj.query) > 50 else obj.query
    query_preview.short_description = 'Query'
