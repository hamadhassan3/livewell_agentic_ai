from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from enum import Enum


class ToolType(Enum):
    SERVER_TOOL = "server_tool"
    CLIENT_TOOL = "client_tool"


class BaseTool(ABC):
    def __init__(self, name: str, description: str, tool_type: ToolType):
        self.name = name
        self.description = description
        self.tool_type = tool_type
    
    @abstractmethod
    def get_schema(self) -> Dict[str, Any]:
        """Return the JSON schema for this tool's parameters"""
        pass
    
    @abstractmethod
    def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool with given parameters"""
        pass
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert tool to dictionary representation"""
        return {
            "name": self.name,
            "type": self.tool_type.value,
            "description": self.description,
            "schema": self.get_schema()
        }


class ServerTool(BaseTool):
    def __init__(self, name: str, description: str):
        super().__init__(name, description, ToolType.SERVER_TOOL)


class ClientTool(BaseTool):
    def __init__(self, name: str, description: str):
        super().__init__(name, description, ToolType.CLIENT_TOOL)
    
    def execute(self, **kwargs) -> Dict[str, Any]:
        """Client tools return a tool call request instead of executing"""
        return {
            "type": "tool_call_request",
            "tool_name": self.name,
            "parameters": kwargs
        }