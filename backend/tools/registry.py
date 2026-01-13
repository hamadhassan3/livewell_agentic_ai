from typing import Dict, List, Optional
from .base import BaseTool, ToolType
from .server_tools import (
    GetWeatherTool, CalculatorTool, UpdateUserProfileTool, UpdateUserPreferencesTool,
    RecordMedicationTakenTool, GetMedicationHistoryTool,
    RecordGoalCompletedTool, GetGoalProgressTool, WebSearchTool, CreateGoalTool, UpdateGoalTool,
    ScheduleNotificationTool, GetEventsListTool, CreateEventTool, SearchEventsTool,
    ReverseGeocodeTool, UpdateEventTool, FetchRecipesTool, FindPlacesTool
)
from .client_tools import GetCurrentLocationTool, SendNotificationTool, GetCurrentTimeTool

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}

        print("Registering tools...")
        # Register all tools
        self.register(GetWeatherTool())
        self.register(CalculatorTool())
        self.register(UpdateUserProfileTool())
        self.register(UpdateUserPreferencesTool())
        self.register(RecordMedicationTakenTool())
        self.register(GetMedicationHistoryTool())
        self.register(RecordGoalCompletedTool())
        self.register(GetGoalProgressTool())
        self.register(CreateGoalTool())
        self.register(UpdateGoalTool())
        self.register(WebSearchTool())
        self.register(ScheduleNotificationTool())
        self.register(GetEventsListTool())
        self.register(CreateEventTool())
        self.register(SearchEventsTool())
        self.register(ReverseGeocodeTool())
        self.register(UpdateEventTool())
        self.register(FetchRecipesTool())
        self.register(FindPlacesTool())
        self.register(GetCurrentLocationTool())
        self.register(SendNotificationTool())
        self.register(GetCurrentTimeTool())

        print(f"Registered tools: {list(self.get_all_tools().keys())}")
    
    def register(self, tool: BaseTool):
        """Register a tool in the registry"""
        self._tools[tool.name] = tool
    
    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name"""
        return self._tools.get(name)
    
    def get_all_tools(self) -> Dict[str, BaseTool]:
        """Get all registered tools"""
        return self._tools.copy()
    
    def get_server_tools(self) -> Dict[str, BaseTool]:
        """Get only server tools"""
        return {
            name: tool for name, tool in self._tools.items() 
            if tool.tool_type == ToolType.SERVER_TOOL
        }
    
    def get_client_tools(self) -> Dict[str, BaseTool]:
        """Get only client tools"""
        return {
            name: tool for name, tool in self._tools.items() 
            if tool.tool_type == ToolType.CLIENT_TOOL
        }
    
    def get_tools_schema(self) -> List[Dict]:
        """Get schema for all tools"""
        return [tool.to_dict() for tool in self._tools.values()]
    
    def is_server_tool(self, name: str) -> bool:
        """Check if a tool is a server tool"""
        tool = self.get_tool(name)
        return tool is not None and tool.tool_type == ToolType.SERVER_TOOL
    
    def is_client_tool(self, name: str) -> bool:
        """Check if a tool is a client tool"""
        tool = self.get_tool(name)
        return tool is not None and tool.tool_type == ToolType.CLIENT_TOOL


# Global registry instance
tool_registry = ToolRegistry()
