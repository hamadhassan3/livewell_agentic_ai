"""Views for bubble message generation."""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .bubble_services import BubbleMessageService
from .models import Message


class GenerateBubbleMessagesAPIView(APIView):
    """
    API endpoint for generating bubble messages that showcase AI capabilities.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        """
        Generate bubble messages based on user context.
        
        Request body:
            - num_messages (int, optional): Number of messages to generate (default: 4)
            - last_message (str, optional): Last message from conversation for context
            - tool_used (str, optional): Last tool used for contextual suggestions
            
        Returns:
            - messages (list): List of bubble message strings
        """
        try:
            # Get user ID and session ID
            user_id = str(request.user.id)
            session_id = str(user_id)  # Using user_id as session_id for consistency
            
            # Get request parameters
            num_messages = request.data.get('num_messages', 4)
            last_message = request.data.get('last_message')
            tool_used = request.data.get('tool_used')
            
            # Validate num_messages
            if not isinstance(num_messages, int) or num_messages < 1 or num_messages > 10:
                return Response(
                    {"error": "num_messages must be an integer between 1 and 10"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Initialize the bubble message service
            service = BubbleMessageService()
            
            # Generate bubble messages based on context
            try:
                if last_message or tool_used:
                    # Use contextual generation if context is provided
                    print(f"Generating contextual bubbles with last_message: {last_message}")
                    messages = service.get_contextual_bubbles(
                        user_id=user_id,
                        last_message=last_message,
                        tool_used=tool_used
                    )
                else:
                    # Get recent conversation context
                    conversation_context = self._get_recent_conversation_context(user_id, session_id)
                    print(f"Generating bubbles with context: {conversation_context}")
                    
                    # Generate general bubble messages
                    messages = service.generate_bubble_messages(
                        user_id=user_id,
                        session_id=session_id,
                        num_messages=num_messages,
                        conversation_context=conversation_context
                    )
                print(f"Successfully generated {len(messages)} bubble messages")
            except Exception as bubble_error:
                print(f"Error generating bubble messages: {str(bubble_error)}")
                import traceback
                print(f"Traceback: {traceback.format_exc()}")
                # Fallback to simple messages
                messages = [
                    "Check today's weather for outdoor activities",
                    "Track your medication schedule",
                    "Find local senior events near you",
                    "Calculate your BMI and health metrics"
                ][:num_messages]
            
            # Return the bubble messages
            return Response(
                {
                    "messages": messages,
                    "count": len(messages)
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {"error": f"Failed to generate bubble messages: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_recent_conversation_context(self, user_id: str, session_id: str) -> str:
        """
        Get recent conversation context for bubble message generation.
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            
        Returns:
            String containing recent conversation context
        """
        try:
            # Get last 3 messages from the conversation
            recent_messages = Message.objects.filter(
                conversation__user_id=int(user_id),
                conversation__session_id=session_id
            ).order_by('-timestamp')[:3]
            
            # Format messages as context
            if recent_messages:
                context_parts = []
                for msg in reversed(recent_messages):
                    role = "User" if msg.role == "user" else "Assistant"
                    # Truncate long messages
                    content = msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
                    context_parts.append(f"{role}: {content}")
                
                return "\n".join(context_parts)
            
            return ""
            
        except Exception:
            return ""


class GetBubbleMessagesAfterChatAPIView(APIView):
    """
    API endpoint to get bubble messages after each chat interaction.
    This is designed to be called automatically after chat responses.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """
        Get bubble messages after a chat interaction.
        
        Query parameters:
            - conversation_id (int, optional): ID of the conversation
            
        Returns:
            - messages (list): List of 4 bubble message strings
        """
        try:
            # Get user ID
            user_id = str(request.user.id)
            session_id = str(user_id)
            
            # Get conversation ID if provided
            conversation_id = request.query_params.get('conversation_id')
            
            # Get the last message if conversation ID is provided
            last_message = None
            if conversation_id:
                try:
                    last_msg = Message.objects.filter(
                        conversation_id=conversation_id,
                        role='assistant'
                    ).order_by('-timestamp').first()
                    
                    if last_msg:
                        last_message = last_msg.content
                except Exception:
                    pass
            
            # Initialize the bubble message service
            service = BubbleMessageService()
            
            # Generate bubble messages using LLM
            try:
                print(f"Generating bubble messages for user {user_id}")
                messages = service.get_contextual_bubbles(
                    user_id=user_id,
                    last_message=last_message,
                    tool_used=None
                )
                print(f"Generated messages: {messages}")
            except Exception as gen_error:
                print(f"Error in get_contextual_bubbles: {str(gen_error)}")
                import traceback
                print(f"Traceback: {traceback.format_exc()}")
                # Use smart fallback if generation fails
                messages = self._get_smart_fallback_messages(user_id, last_message)
            
            # Ensure exactly 3 messages
            messages = messages[:3]
            
            return Response(
                {
                    "messages": messages,
                    "count": 3
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            # Log the error for debugging
            import traceback
            print(f"Error generating bubble messages: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            
            # Return fallback messages on error
            service = BubbleMessageService()
            fallback_messages = service._get_fallback_messages()[:4]
            
            return Response(
                {
                    "messages": fallback_messages,
                    "count": 4,
                    "is_fallback": True,
                    "error": str(e)  # Include error for debugging
                },
                status=status.HTTP_200_OK
            )
    
    def _get_smart_fallback_messages(self, user_id: str, last_message: str = None):
        """
        Get contextually relevant fallback messages based on user state.
        
        Args:
            user_id: User identifier
            last_message: Last message from conversation
            
        Returns:
            List of contextual bubble messages
        """
        import random
        from datetime import datetime
        
        # Define contextual message pools
        morning_messages = [
            "Check today's weather for your morning walk 🌅",
            "Review your morning medication schedule 💊",
            "Find gentle morning exercise routines 🧘",
            "Track your sleep quality from last night 😴"
        ]
        
        afternoon_messages = [
            "Calculate your daily water intake progress 💧",
            "Find local afternoon activities for seniors 🎯",
            "Check your afternoon medication reminders ⏰",
            "Track your daily step count 🚶"
        ]
        
        evening_messages = [
            "Review today's wellness achievements 🌟",
            "Plan tomorrow's health goals 📝",
            "Find relaxing evening activities 🎵",
            "Set your bedtime reminder 🛏️"
        ]
        
        general_messages = [
            "Update your health profile information 👤",
            "Calculate your BMI and health metrics 📊",
            "Find senior-friendly events near you 📍",
            "Track today's medication schedule 💊",
            "Check the weather for outdoor activities 🌤️",
            "Search for healthy recipe ideas 🥗",
            "Review your weekly goal progress 🎯",
            "Find gentle exercise videos 🏃",
            "Schedule a medication reminder 🔔",
            "Calculate your daily calorie needs 🧮"
        ]
        
        # Determine time of day
        current_hour = datetime.now().hour
        
        # Select appropriate message pool
        if 5 <= current_hour < 12:
            primary_pool = morning_messages
        elif 12 <= current_hour < 17:
            primary_pool = afternoon_messages
        elif 17 <= current_hour < 22:
            primary_pool = evening_messages
        else:
            primary_pool = general_messages
        
        # Combine pools for variety
        all_messages = list(set(primary_pool + general_messages))
        
        # Shuffle for randomness
        random.shuffle(all_messages)
        
        # Return top 4 unique messages
        return all_messages[:4]