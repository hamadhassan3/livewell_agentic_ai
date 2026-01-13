from typing import Dict, Any, List, Optional
from .registry import tool_registry
from .base import ToolType


class ToolExecutionService:
    @staticmethod
    def execute_tool(tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with given parameters"""
        tool = tool_registry.get_tool(tool_name)
        
        if not tool:
            return {"error": f"Tool '{tool_name}' not found"}
        
        try:
            return tool.execute(**parameters)
        except Exception as e:
            return {"error": f"Tool execution failed: {str(e)}"}
    
    @staticmethod
    def create_tool_request(tool_name: str, parameters: Dict[str, Any], 
                          conversation=None, user=None) -> 'ToolRequest':
        """
        Create a tool request for client-side execution
        
        Args:
            tool_name: Name of the tool to execute
            parameters: Tool parameters
            conversation: Conversation object this request belongs to
            user: User making the request
            
        Returns:
            ToolRequest object
        """
        from .models import ToolRequest
        
        if not tool_registry.is_client_tool(tool_name):
            raise ValueError(f"'{tool_name}' is not a client tool")
        
        tool_request = ToolRequest.objects.create(
            conversation=conversation,
            user=user,
            tool_name=tool_name,
            parameters=parameters,
            status='pending'
        )
        
        return tool_request
    
    @staticmethod
    def handle_tool_call(tool_name: str, parameters: Dict[str, Any], 
                        conversation=None, user=None) -> Dict[str, Any]:
        """
        Handle a tool call, routing to server execution or client request creation
        
        Args:
            tool_name: Name of the tool to execute
            parameters: Tool parameters
            conversation: Conversation object (for client tools)
            user: User making the request (for client tools)
            
        Returns:
            Tool result or tool request information
        """
        if ToolExecutionService.is_server_tool(tool_name):
            # Execute server tool immediately
            return ToolExecutionService.execute_tool(tool_name, parameters)
        elif ToolExecutionService.is_client_tool(tool_name):
            # Create a request for client execution
            tool_request = ToolExecutionService.create_tool_request(
                tool_name, parameters, conversation, user
            )
            return {
                "type": "tool_call_request",
                "request_id": tool_request.id,
                "tool_name": tool_name,
                "parameters": parameters,
                "message": f"Client tool '{tool_name}' requires client-side execution. Request ID: {tool_request.id}"
            }
        else:
            return {"error": f"Tool '{tool_name}' not found"}
    
    @staticmethod
    def wait_for_tool_response(tool_request_id: int, timeout: int = 30) -> Optional[Dict[str, Any]]:
        """
        Wait for a client tool response (with polling)
        
        Args:
            tool_request_id: ID of the tool request
            timeout: Maximum time to wait in seconds
            
        Returns:
            Tool result or None if timeout
        """
        import time
        from .models import ToolRequest
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                tool_request = ToolRequest.objects.get(id=tool_request_id)
                if tool_request.status == 'completed':
                    return tool_request.result
                elif tool_request.status == 'failed':
                    return {"error": tool_request.error_message or "Tool execution failed"}
                elif tool_request.status in ['timeout', 'cancelled']:
                    return {"error": f"Tool request was {tool_request.status}"}
            except ToolRequest.DoesNotExist:
                return {"error": "Tool request not found"}
            
            time.sleep(0.5)  # Poll every 500ms
        
        # Mark as timeout if we've waited too long
        try:
            tool_request = ToolRequest.objects.get(id=tool_request_id)
            if tool_request.status in ['pending', 'executing']:
                tool_request.status = 'timeout'
                tool_request.error_message = f"Timeout waiting for response after {timeout} seconds"
                tool_request.save()
        except ToolRequest.DoesNotExist:
            pass
        
        return None
    
    @staticmethod
    def get_available_tools() -> List[Dict[str, Any]]:
        """Get list of all available tools with their schemas"""
        return tool_registry.get_tools_schema()
    
    @staticmethod
    def get_server_tools() -> List[Dict[str, Any]]:
        """Get list of server tools only"""
        server_tools = tool_registry.get_server_tools()
        return [tool.to_dict() for tool in server_tools.values()]
    
    @staticmethod
    def get_client_tools() -> List[Dict[str, Any]]:
        """Get list of client tools only"""
        client_tools = tool_registry.get_client_tools()
        return [tool.to_dict() for tool in client_tools.values()]
    
    @staticmethod
    def is_server_tool(tool_name: str) -> bool:
        """Check if a tool should be executed on the server"""
        return tool_registry.is_server_tool(tool_name)
    
    @staticmethod
    def is_client_tool(tool_name: str) -> bool:
        """Check if a tool requires client execution"""
        return tool_registry.is_client_tool(tool_name)