from django.urls import path
from .views import (
    AvailableToolsAPIView,
    PendingToolRequestsAPIView,
    ToolResponseAPIView,
    ToolRequestStatusAPIView,
    ExecuteServerToolAPIView
)

urlpatterns = [
    # Public endpoint to get available tools
    path('available/', AvailableToolsAPIView.as_view(), name='available_tools'),
    
    # Client tool request management
    path('requests/pending/', PendingToolRequestsAPIView.as_view(), name='pending_tool_requests'),
    path('requests/<int:request_id>/response/', ToolResponseAPIView.as_view(), name='tool_response'),
    path('requests/<int:request_id>/status/', ToolRequestStatusAPIView.as_view(), name='tool_request_status'),
    
    # Server tool execution (for testing/debugging)
    path('execute/', ExecuteServerToolAPIView.as_view(), name='execute_server_tool'),
]