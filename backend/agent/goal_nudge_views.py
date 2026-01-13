from .constants import GOAL_NUDGE_SYSTEM_PROMPT
from .services import get_ai_service
from .models import Conversation, Message
from .session_manager import SessionManager
import threading
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class GenerateGoalNudgeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Generate a personalized goal nudge for the authenticated user
        """
        try:
            user_id = str(request.user.id)
            
            # Get AI service
            service = get_ai_service("gemini")
            
            # Use SessionManager to get goal session
            session_manager = SessionManager()
            goal_session_id, _ = session_manager.get_goal_session(user_id)
            
            conversation = self._get_or_create_conversation(
                user_id=user_id,
                session_id=goal_session_id
            )
            
            # Generate goal nudge using the new get_goal_nudge method
            goal_response = service.get_goal_nudge(
                user_id=user_id,
                conversation=conversation
            )
            
            if (goal_response is None) or (goal_response.strip() == ""):
                return Response(
                    {"error": "No new goal nudge available at this time."},
                    status=status.HTTP_204_NO_CONTENT
                )
            
            # Save the goal nudge as a system message
            self._save_message(conversation, 'system', f"Goal nudge generated: {goal_response}")
            
            # Format response for frontend
            response_data = {
                "goal": goal_response.strip(),
                "session_id": goal_session_id
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to generate goal nudge: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_or_create_conversation(self, user_id: str, session_id: str):
        """Get or create conversation based on session_id"""
        if not session_id:
            # Create new conversation without session_id
            return Conversation.objects.create(
                user_id=user_id if user_id else None,
                session_id=f"anon_{hash(str(user_id))}" if user_id else "anonymous"
            )
        
        conversation, created = Conversation.objects.get_or_create(
            session_id=session_id,
            defaults={
                'user_id': user_id if user_id else None
            }
        )
        return conversation
    
    def _save_message(self, conversation: Conversation, role: str, content: str):
        """Save message to conversation"""
        return Message.objects.create(
            conversation=conversation,
            role=role,
            content=content
        )


class RespondToGoalNudgeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Process user's yes/no response to a goal nudge
        """
        try:
            user_id = str(request.user.id)
            user_response = request.data.get('response')
            session_id = request.data.get('session_id')
            
            # Validate input
            if not user_response:
                return Response(
                    {"error": "Response is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate that response is yes/no
            response_lower = user_response.lower().strip()
            if response_lower not in ['yes', 'no', 'y', 'n']:
                return Response(
                    {"error": "Response must be 'yes' or 'no'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use SessionManager to get goal session if not provided
            if not session_id:
                session_manager = SessionManager()
                session_id, _ = session_manager.get_goal_session(user_id)
            
            # Get AI service
            service = get_ai_service("gemini")
            
            # Get or create conversation for the goal session
            conversation = self._get_or_create_conversation(
                user_id=user_id,
                session_id=session_id
            )
            
            # Save user's response
            self._save_message(conversation, 'user', user_response)
            
            # Process the response and potentially create goal
            ai_response = service.respond_to_goal_nudge(
                user_id=user_id,
                user_response=user_response,
                session_id=session_id,
                conversation=conversation
            )
            
            # Handle response based on type
            if isinstance(ai_response, dict) and ai_response.get('type') == 'response_with_tool_requests':
                assistant_response = ai_response['content']
                tool_requests = ai_response.get('tool_requests', [])
            else:
                assistant_response = ai_response
                tool_requests = []
            
            # Save assistant response
            self._save_message(conversation, 'assistant', assistant_response)
            
            # Embedding removed - no longer storing messages in ChromaDB
            
            # Build response
            response_data = {
                "response": assistant_response,
                "session_id": session_id,
                "accepted": response_lower in ['yes', 'y']
            }
            if tool_requests:
                response_data["tool_requests"] = tool_requests
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to process response: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_or_create_conversation(self, user_id: str, session_id: str):
        """Get or create conversation based on session_id"""
        if not session_id:
            # Create new conversation without session_id
            return Conversation.objects.create(
                user_id=user_id if user_id else None,
                session_id=f"anon_{hash(str(user_id))}" if user_id else "anonymous"
            )
        
        conversation, created = Conversation.objects.get_or_create(
            session_id=session_id,
            defaults={
                'user_id': user_id if user_id else None
            }
        )
        return conversation
    
    def _save_message(self, conversation: Conversation, role: str, content: str):
        """Save message to conversation"""
        return Message.objects.create(
            conversation=conversation,
            role=role,
            content=content
        )