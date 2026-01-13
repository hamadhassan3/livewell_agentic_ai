from rest_framework import serializers
from .models import ToolRequest
from .registry import tool_registry


class ToolSchemaSerializer(serializers.Serializer):
    """Serializer for tool schema information"""
    name = serializers.CharField()
    type = serializers.CharField()
    description = serializers.CharField()
    schema = serializers.DictField()


class ToolRequestSerializer(serializers.ModelSerializer):
    """Serializer for ToolRequest model"""
    tool_schema = serializers.SerializerMethodField()
    
    class Meta:
        model = ToolRequest
        fields = [
            'id', 'tool_name', 'parameters', 'status', 'result', 
            'error_message', 'created_at', 'updated_at', 'executed_at',
            'tool_schema'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_tool_schema(self, obj):
        """Get the schema for the requested tool"""
        tool = tool_registry.get_tool(obj.tool_name)
        if tool:
            return tool.to_dict()
        return None


class ToolRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tool requests"""
    class Meta:
        model = ToolRequest
        fields = ['tool_name', 'parameters', 'conversation', 'user']
        
    def validate_tool_name(self, value):
        """Validate that the tool exists and is a client tool"""
        if not tool_registry.is_client_tool(value):
            raise serializers.ValidationError(f"'{value}' is not a valid client tool")
        return value


class ToolResponseSerializer(serializers.Serializer):
    """Serializer for tool execution responses from client"""
    request_id = serializers.IntegerField()
    result = serializers.JSONField(required=False, allow_null=True)
    error_message = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    def validate(self, attrs):
        """Ensure either result or error_message is provided"""
        if 'result' not in attrs and 'error_message' not in attrs:
            raise serializers.ValidationError(
                "Either 'result' or 'error_message' must be provided"
            )
        return attrs


class PendingToolRequestsSerializer(serializers.Serializer):
    """Serializer for requesting pending tool requests"""
    conversation_id = serializers.IntegerField(required=False)
    include_executing = serializers.BooleanField(default=False)