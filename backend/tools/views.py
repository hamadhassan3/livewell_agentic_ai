from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone

from .models import ToolRequest
from .serializers import (
    ToolSchemaSerializer, 
    ToolRequestSerializer,
    ToolResponseSerializer,
    PendingToolRequestsSerializer
)
from .services import ToolExecutionService
from .registry import tool_registry
from agent.models import Conversation
from agent.services import get_ai_service
from agent.constants import DEFAULT_SYSTEM_PROMPT


class AvailableToolsAPIView(APIView):
    """
    Get list of available tools and their schemas
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request):
        """
        Returns all available tools with their schemas
        Query params:
        - type: Filter by tool type ('client', 'server', or 'all')
        """
        tool_type = request.query_params.get('type', 'all')
        
        if tool_type == 'client':
            tools = tool_registry.get_client_tools()
        elif tool_type == 'server':
            tools = tool_registry.get_server_tools()
        else:
            tools = tool_registry.get_all_tools()
        
        tool_schemas = [tool.to_dict() for tool in tools.values()]
        serializer = ToolSchemaSerializer(tool_schemas, many=True)
        
        return Response({
            'count': len(tool_schemas),
            'tools': serializer.data
        }, status=status.HTTP_200_OK)


class PendingToolRequestsAPIView(APIView):
    """
    Get pending tool requests for a conversation or user
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Get pending tool requests
        Body params:
        - conversation_id: Filter by specific conversation
        - include_executing: Include requests currently being executed
        """
        serializer = PendingToolRequestsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Build query
        query = Q(status='pending')
        if serializer.validated_data.get('include_executing'):
            query |= Q(status='executing')
        
        # Filter by conversation or user
        if 'conversation_id' in serializer.validated_data:
            conversation = get_object_or_404(
                Conversation, 
                id=serializer.validated_data['conversation_id']
            )
            # Verify user has access to this conversation
            if conversation.user_id and str(conversation.user_id) != str(request.user.id):
                return Response(
                    {"error": "You don't have access to this conversation"},
                    status=status.HTTP_403_FORBIDDEN
                )
            tool_requests = ToolRequest.objects.filter(
                query, 
                conversation=conversation
            )
        else:
            # Get all requests for the authenticated user
            tool_requests = ToolRequest.objects.filter(
                query,
                user=request.user
            )
        
        serializer = ToolRequestSerializer(tool_requests, many=True)
        
        # Mark retrieved requests as 'executing' if they were pending
        pending_ids = [
            tr.id for tr in tool_requests 
            if tr.status == 'pending'
        ]
        if pending_ids:
            ToolRequest.objects.filter(id__in=pending_ids).update(
                status='executing',
                updated_at=timezone.now()
            )
        
        return Response({
            'count': len(serializer.data),
            'requests': serializer.data
        }, status=status.HTTP_200_OK)


class ToolResponseAPIView(APIView):
    """
    Submit tool execution response from client
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, request_id):
        """
        Submit execution result for a tool request
        Path params:
        - request_id: ID of the tool request
        Body params:
        - result: Successful execution result (JSON)
        - error_message: Error message if execution failed
        """
        tool_request = get_object_or_404(ToolRequest, id=request_id)
        
        # Verify user has access
        if tool_request.user and tool_request.user != request.user:
            return Response(
                {"error": "You don't have access to this tool request"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify request is in a valid state
        if tool_request.status not in ['pending', 'executing']:
            return Response(
                {"error": f"Tool request is {tool_request.status}, cannot update"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ToolResponseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update tool request based on response
        if 'result' in serializer.validated_data and serializer.validated_data['result'] is not None:
            tool_request.mark_completed(serializer.validated_data['result'])
            message = "Tool executed successfully"
        else:
            tool_request.mark_failed(
                serializer.validated_data.get('error_message', 'Unknown error')
            )
            message = "Tool execution failed"
        
        # Resume the conversation with the AI agent
        try:
            # Get the appropriate AI service (using same as chat)
            service = get_ai_service("gemini")
            
            # Resume the conversation after tool completion
            response = service.resume_after_tool_completion(
                tool_request=tool_request,
                system_prompt=DEFAULT_SYSTEM_PROMPT
            )
            
            # If all tools are completed and we have a final response, save it to the database
            if isinstance(response, dict):
                all_tools_completed = response.get('all_tools_completed', True)
                response_type = response.get('type', 'final_response')
                ai_response = response.get('content', '')
                tool_requests = response.get('tool_requests', [])
            else:
                all_tools_completed = True
                response_type = 'final_response'
                ai_response = response
                tool_requests = []
            
            # Save the final assistant message to the database only if:
            # 1. It's a final response (no more tool requests)
            # 2. We have a conversation to save to
            if response_type not in ['partial_response', 'response_with_tool_requests'] and tool_request.conversation and ai_response:
                from agent.models import Message
               
                assistant_message = Message.objects.create(
                    conversation=tool_request.conversation,
                    role='assistant',
                    content=ai_response
                )
                            
            # Build response data
            response_data = {
                'message': message,
                'tool_request': ToolRequestSerializer(tool_request).data,
                'ai_response': ai_response,
                'all_tools_completed': all_tools_completed,
                'type': response_type
            }
            
            # Add tool_requests if there are new ones
            if tool_requests:
                response_data['tool_requests'] = tool_requests
            
            # Return the AI response along with tool completion info
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # If resumption fails, still return the tool completion status
            return Response({
                'message': message,
                'tool_request': ToolRequestSerializer(tool_request).data,
                'error': f"Failed to resume conversation: {str(e)}"
            }, status=status.HTTP_200_OK)


class ToolRequestStatusAPIView(APIView):
    """
    Get status of a specific tool request
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, request_id):
        """
        Get the current status of a tool request
        """
        tool_request = get_object_or_404(ToolRequest, id=request_id)
        
        # Verify user has access
        if tool_request.user and tool_request.user != request.user:
            return Response(
                {"error": "You don't have access to this tool request"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ToolRequestSerializer(tool_request)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExecuteServerToolAPIView(APIView):
    """
    Execute a server-side tool directly (for testing/debugging)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Execute a server tool
        Body params:
        - tool_name: Name of the tool to execute
        - parameters: Tool parameters
        """
        tool_name = request.data.get('tool_name')
        parameters = request.data.get('parameters', {})
        
        if not tool_name:
            return Response(
                {"error": "tool_name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify it's a server tool
        if not tool_registry.is_server_tool(tool_name):
            return Response(
                {"error": f"'{tool_name}' is not a server tool or doesn't exist"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Execute the tool
        result = ToolExecutionService.execute_tool(tool_name, parameters)
        
        # Check for errors in execution
        if isinstance(result, dict) and 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'tool_name': tool_name,
            'parameters': parameters,
            'result': result
        }, status=status.HTTP_200_OK)