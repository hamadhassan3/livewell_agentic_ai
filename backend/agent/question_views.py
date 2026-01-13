from .constants import QUESTION_NUDGE_SYSTEM_PROMPT
from .services import get_ai_service
from .models import Conversation, Message
from .session_manager import SessionManager
import threading
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class GenerateQuestionNudgeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Generate a personalized question nudge for the authenticated user
        """
        try:
            user_id = str(request.user.id)
            
            # Get AI service
            service = get_ai_service("gemini")
            
            # Use SessionManager to get question session
            session_manager = SessionManager()
            question_session_id, _ = session_manager.get_question_session(user_id)
            
            conversation = self._get_or_create_conversation(
                user_id=user_id,
                session_id=question_session_id
            )
            
            # Generate question nudge using the new get_question_nudge method
            question_response = service.get_question_nudge(
                user_id=user_id,
                conversation=conversation
            )
            
            if (question_response is None) or (question_response.strip() == ""):
                return Response(
                    {"error": "No new question nudge available at this time."},
                    status=status.HTTP_204_NO_CONTENT
                )
            
            # Save the question nudge as a system message
            self._save_message(conversation, 'system', f"Question nudge generated: {question_response}")
            
            # Format response for frontend
            response_data = {
                "question": question_response.strip(),
                "session_id": question_session_id
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to generate question nudge: {str(e)}"},
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


class RespondToQuestionNudgeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Process user's response to a question nudge
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
            
            # Use SessionManager to get question session if not provided
            if not session_id:
                session_manager = SessionManager()
                session_id, _ = session_manager.get_question_session(user_id)
            
            # Get AI service
            service = get_ai_service("gemini")
            
            # Get or create conversation for the question session
            conversation = self._get_or_create_conversation(
                user_id=user_id,
                session_id=session_id
            )
            
            # Save user's response
            self._save_message(conversation, 'user', user_response)
            
            # Process the response and update profile
            ai_response = service.respond_to_question_nudge(
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
                "session_id": session_id
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