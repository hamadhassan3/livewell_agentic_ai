from typing import Dict, Any
from .base import ClientTool


class GetCurrentLocationTool(ClientTool):
    def __init__(self):
        super().__init__(
            name="get_current_location",
            description="Retrieve user's GPS location from device"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "precision": {
                    "type": "string",
                    "enum": ["high", "medium", "low"],
                    "description": "GPS precision level",
                    "default": "medium"
                }
            },
            "required": []
        }


class SendNotificationTool(ClientTool):
    def __init__(self):
        super().__init__(
            name="send_notification",
            description="Send a local notification to the user"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Notification title"
                },
                "message": {
                    "type": "string",
                    "description": "Notification message"
                },
                "delay": {
                    "type": "integer",
                    "description": "Delay in seconds before showing notification",
                    "default": 0
                }
            },
            "required": ["title", "message"]
        }


class GetCurrentTimeTool(ClientTool):
    def __init__(self):
        super().__init__(
            name="get_current_time",
            description="Get the current date and time from the device"
        )
    
    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": "Timezone to use (e.g., 'UTC', 'America/New_York', 'local')",
                    "default": "local"
                },
                "format": {
                    "type": "string",
                    "enum": ["iso", "unix", "readable"],
                    "description": "Time format to return",
                    "default": "readable"
                }
            },
            "required": []
        }