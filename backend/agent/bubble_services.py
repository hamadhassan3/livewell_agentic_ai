"""Service for generating bubble messages that showcase AI capabilities."""

from typing import List, Dict
from .services import BaseAIService, get_ai_service
from .constants import AVAILABLE_MODELS
from django.contrib.auth import get_user_model
from datetime import datetime
import json
import random


class BubbleMessageService:
    """
    Service for generating bubble messages that showcase AI capabilities
    and available tools to guide user interactions.
    """
    
    def __init__(self, ai_service: BaseAIService = None):
        """
        Initialize the bubble message service.
        
        Args:
            ai_service: Optional AI service instance. Defaults to Gemini.
        """
        self.ai_service = ai_service or get_ai_service("gemini")
    
    def generate_bubble_messages(
        self, 
        user_id: str, 
        session_id: str = None,
        num_messages: int = 4,
        conversation_context: str = None
    ) -> List[str]:
        """
        Generate bubble messages that showcase AI capabilities based on user context.
        
        Args:
            user_id: User identifier for personalization
            session_id: Session identifier for conversation context
            num_messages: Number of bubble messages to generate (default: 4)
            conversation_context: Optional recent conversation context to make suggestions relevant
            
        Returns:
            List of bubble message strings
        """
        try:
            print(f"Starting bubble message generation for user {user_id}")
            
            # Get the bubble message system prompt
            system_prompt = self._get_bubble_system_prompt()
            print(f"Got system prompt: {len(system_prompt)} characters")
            
            # Build the prompt for generating bubble messages
            user_prompt = self._build_bubble_prompt(num_messages, conversation_context)
            print(f"Built user prompt: {user_prompt}")
            
            # Generate the bubble messages using the AI service
            print(f"Calling AI service with user_id={user_id}, session_id={session_id}")
            response = self.ai_service.get_response(
                user_prompt=user_prompt,
                system_prompt=system_prompt,
                user_id=user_id,
                session_id=session_id
            )
            print(f"AI service response type: {type(response)}")
            
            # Extract the response content
            if isinstance(response, dict):
                response_content = response.get('content', '')
                print(f"Extracted content from dict: {response_content}")
            else:
                response_content = response
                print(f"Using response directly: {response_content}")
            
            # Parse the bubble messages from the response
            bubble_messages = self._parse_bubble_messages(response_content, num_messages)
            print(f"Parsed {len(bubble_messages)} bubble messages: {bubble_messages}")
            
            return bubble_messages
        except Exception as e:
            print(f"Error generating bubble messages: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            # Return fallback messages on error
            return self._get_fallback_messages()[:num_messages]
    
    def _get_bubble_system_prompt(self) -> str:
        """
        Get the system prompt for generating bubble messages.
        
        Returns:
            System prompt string
        """
        from .constants import BUBBLE_SYSTEM_PROMPT
        return BUBBLE_SYSTEM_PROMPT
    
    def _build_bubble_prompt(self, num_messages: int, conversation_context: str = None) -> str:
        """
        Build the user prompt for generating bubble messages.
        
        Args:
            num_messages: Number of messages to generate
            conversation_context: Optional conversation context
            
        Returns:
            User prompt string
        """
        prompt = f"Generate exactly {num_messages} bubble messages that showcase different capabilities I can help with. "
        prompt += "Each message should be a specific, actionable suggestion that demonstrates a unique tool or feature. "
        prompt += "Make them engaging and personalized based on the user's profile and context. "
        prompt += "Format: Return each message on a new line, starting with a number (1., 2., etc.)."
        
        if conversation_context:
            prompt += f"\n\nRecent conversation context: {conversation_context}"
        
        return prompt
    
    def _parse_bubble_messages(self, response_content: str, expected_count: int) -> List[str]:
        """
        Parse bubble messages from AI response.
        
        Args:
            response_content: Raw AI response
            expected_count: Expected number of messages
            
        Returns:
            List of parsed bubble messages
        """
        print(f"Parsing response content: '{response_content}'")
        
        if not response_content or not response_content.strip():
            print("Empty response content, returning fallback messages")
            return self._get_fallback_messages()[:expected_count]
        
        # Split by newlines and clean up
        lines = response_content.strip().split('\n')
        print(f"Split into {len(lines)} lines: {lines}")
        
        messages = []
        for i, line in enumerate(lines):
            # Remove numbering (1., 2., etc.) and clean up
            line = line.strip()
            if line:
                # Remove leading numbers and dots
                import re
                cleaned = re.sub(r'^\d+\.\s*', '', line)
                # Also remove bullet points and dashes
                cleaned = re.sub(r'^[-•]\s*', '', cleaned)
                if cleaned:
                    messages.append(cleaned)
                    print(f"Line {i}: '{line}' -> '{cleaned}'")
        
        print(f"Extracted {len(messages)} messages: {messages}")
        
        # Ensure we have the expected number of messages
        if len(messages) < expected_count:
            print(f"Need more messages, adding fallback messages")
            # Add fallback messages if needed
            fallback_messages = self._get_fallback_messages()
            while len(messages) < expected_count and fallback_messages:
                messages.append(fallback_messages.pop(0))
        elif len(messages) > expected_count:
            # Trim to expected count
            messages = messages[:expected_count]
        
        print(f"Final messages: {messages}")
        return messages
    
    def _get_fallback_messages(self) -> List[str]:
        """
        Get fallback bubble messages in case AI generation fails.
        
        Returns:
            List of fallback messages
        """
        return [
            "Check today's weather for outdoor activities 🌤️",
            "Track your medication schedule 💊",
            "Find local senior events near you 📍",
            "Calculate your BMI and health metrics 📊",
            "Set a new wellness goal 🎯",
            "Get personalized exercise recommendations 🏃",
            "Review your sleep quality trends 😴",
            "Connect with community activities 👥"
        ]
    
    def get_contextual_bubbles(
        self,
        user_id: str,
        last_message: str = None,
        tool_used: str = None
    ) -> List[str]:
        """
        Generate contextual bubble messages based on the last interaction.
        
        Args:
            user_id: User identifier
            last_message: Last message from the conversation
            tool_used: Name of the last tool used (if any)
            
        Returns:
            List of contextual bubble messages
        """
        print(f"get_contextual_bubbles called with user_id={user_id}, last_message={last_message}, tool_used={tool_used}")
        
        # Build context from last interaction
        context = ""
        if last_message:
            context += f"Last message: {last_message}\n"
        if tool_used:
            context += f"Last tool used: {tool_used}\n"
        
        print(f"Built context: {context}")
        
        # Generate bubble messages with context
        result = self.generate_bubble_messages(
            user_id=user_id,
            num_messages=3,
            conversation_context=context
        )
        print(f"get_contextual_bubbles returning: {result}")
        return result