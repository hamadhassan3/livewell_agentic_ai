from .constants import DEFAULT_SYSTEM_PROMPT, NUDGE_SYSTEM_PROMPT, QUESTION_NUDGE_SYSTEM_PROMPT
from .services import get_ai_service
from .models import Conversation, Message, ConversationSummary
from .serializers import NudgeFlowSerializer, ChatMessageFeedbackSerializer
from .session_manager import SessionManager
from documents.services import DocumentService
import threading
import json
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class AIChatStreamAPIView(APIView):

    def post(self, request, *args, **kwargs):

        prompt = request.data.get('prompt')

        try:
            service = get_ai_service("gemini")

            # Get user and session information from request
            user_id = str(request.user.id) if request.user.is_authenticated else None

            # Use SessionManager to get or create chat session with 1-hour expiry
            session_manager = SessionManager()
            session_id, is_new_session = session_manager.get_chat_session(user_id)
            
            print(f"User ID: {user_id}, Session ID: {session_id}, New Session: {is_new_session}")

            # Get or create conversation
            conversation = self._get_or_create_conversation(
                user_id=user_id,
                session_id=session_id
            )

            # Save user message
            user_message = self._save_message(conversation, 'user', prompt)

            # Call the generic response method
            response = service.get_response(
                user_prompt=prompt,
                system_prompt=DEFAULT_SYSTEM_PROMPT,
                user_id=user_id,
                session_id=session_id,
                conversation=conversation
            )

            # Handle response based on type
            if isinstance(response, dict) and response.get('type') == 'response_with_tool_requests':
                assistant_response = response['content']
                tool_requests = response.get('tool_requests', [])
                # Don't save message yet if there are tool requests pending
                assistant_message = None
            else:
                assistant_response = response
                tool_requests = []
                # Save complete assistant response only when no tool requests
                assistant_message = self._save_message(conversation, 'assistant', assistant_response)

            # Embedding removed - no longer storing messages in ChromaDB

            # Build response with tool requests if any
            response_data = {"response": assistant_response}
            if assistant_message:
                response_data["id"] = assistant_message.id
            if tool_requests:
                response_data["tool_requests"] = tool_requests
            
            return Response(response_data, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An unexpected error occurred: {e}"},
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


class ChatMessageFeedbackAPIView(APIView):
    """
    API view to handle user feedback (like/dislike) for a specific chat message.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Records feedback for a given message_id.
        """
        serializer = ChatMessageFeedbackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        message_id = validated_data['message_id']
        feedback = validated_data['feedback']
        user = request.user

        try:
            # Ensure the message exists and belongs to the user's conversation
            message = Message.objects.get(id=message_id, conversation__user_id=user.id)

            # Update the feedback field on the message object
            message.feedback = feedback
            message.save(update_fields=['feedback'])

            return Response({"message": "Feedback recorded successfully"}, status=status.HTTP_200_OK)

        except Message.DoesNotExist:
            return Response({"error": "Message not found or access denied"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NudgeFeedbackAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Record user feedback for a nudge (like/dislike)
        """
        try:
            user_id = str(request.user.id)
            
            # Use SessionManager to get nudge session
            session_manager = SessionManager()
            session_id, _ = session_manager.get_nudge_session(user_id)
            
            feedback = request.data.get('feedback')
            
            # Validate feedback
            if feedback not in ['like', 'dislike']:
                return Response(
                    {"error": "Feedback must be 'like' or 'dislike'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get or create conversation
            conversation, created = Conversation.objects.get_or_create(
                session_id=session_id,
                defaults={
                    'user_id': user_id if user_id else None
                }
            )
            
            # Save feedback as a message
            feedback_message = f"User feedback on nudge: {feedback}"
            Message.objects.create(
                conversation=conversation,
                role='user',
                content=feedback_message
            )
            
            # Also send to chat for context
            service = get_ai_service("gemini")
            service.get_response(
                user_prompt=feedback_message,
                system_prompt=DEFAULT_SYSTEM_PROMPT,
                user_id=user_id,
                session_id=session_id
            )
            
            # Regenerate nudge for both like and dislike feedback
            # Generate a new nudge with force_regenerate=True
            nudge_response = service.get_nudge(
                user_id=user_id,
                session_id=session_id,
                system_prompt=NUDGE_SYSTEM_PROMPT,
                prompt="Based on my profile, health data, and recent activities, generate a helpful nudge or reminder.",
                force_regenerate=True,
                conversation=conversation
            )
            
            # Save the new nudge as a system message
            Message.objects.create(
                conversation=conversation,
                role='system',
                content=f"New nudge generated after {feedback}: {nudge_response}"
            )
            
            return Response(
                {
                    "message": "Feedback recorded and new nudge generated",
                    "new_nudge": nudge_response.strip()
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            return Response(
                {"error": f"Failed to record feedback: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConversationHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get all conversation history for the authenticated user, organized by session
        """
        try:
            user_id = str(request.user.id)
            
            # Get only chat conversations for this user
            conversations = Conversation.objects.filter(
                user_id=user_id,
                session_id__startswith='chat_'
            ).order_by('-updated_at')
            
            if not conversations.exists():
                return Response({
                    "conversations": []
                }, status=status.HTTP_200_OK)
            
            # Initialize document service for summary retrieval
            document_service = DocumentService()
            
            # Format conversations with their messages
            formatted_conversations = []
            for conversation in conversations:
                # Get all messages for this conversation
                messages = conversation.messages.all().order_by('timestamp')
                
                # Format messages for frontend
                formatted_messages = []
                for message in messages:
                    formatted_messages.append({
                        "id": str(message.id),
                        "role": message.role,
                        "content": message.content,
                        "timestamp": message.timestamp.isoformat()
                    })
                
                # Get summary if it exists
                try:
                    summary_obj = ConversationSummary.objects.filter(conversation=conversation).first()
                    summary = summary_obj.summary if summary_obj else None
                except ConversationSummary.DoesNotExist:
                    summary = None
                
                # Determine session type from session_id prefix (will always be "chat" now)
                session_type = "chat"
                
                conversation_data = {
                    "session_id": conversation.session_id,
                    "session_type": session_type,
                    "created_at": conversation.created_at.isoformat(),
                    "updated_at": conversation.updated_at.isoformat(),
                    "message_count": len(formatted_messages),
                    "messages": formatted_messages
                }
                
                # Add summary if it exists
                if summary:
                    conversation_data["summary"] = summary
                
                formatted_conversations.append(conversation_data)
            
            return Response({
                "conversations": formatted_conversations
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to retrieve conversation history: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CurrentChatHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get conversation history for the current chat session only
        """
        try:
            user_id = str(request.user.id)
            
            # Use SessionManager to get current chat session
            session_manager = SessionManager()
            session_id, _ = session_manager.get_chat_session(user_id)
            
            if not session_id:
                return Response({
                    "messages": []
                }, status=status.HTTP_200_OK)
            
            # Get conversation for current session
            try:
                conversation = Conversation.objects.get(
                    session_id=session_id,
                    user_id=user_id
                )
            except Conversation.DoesNotExist:
                return Response({
                    "messages": []
                }, status=status.HTTP_200_OK)
            
            # Get all messages for this conversation
            messages = conversation.messages.all().order_by('timestamp')
            
            # Format messages for frontend
            formatted_messages = []
            for message in messages:
                formatted_messages.append({
                    "id": str(message.id),
                    "role": message.role,
                    "content": message.content,
                    "timestamp": message.timestamp.isoformat(),
                    "feedback": message.feedback if message.feedback else ""
                })
            
            return Response({
                "messages": formatted_messages
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to retrieve current chat history: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GenerateNudgeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Generate a personalized nudge for the authenticated user
        """
        try:
            user_id = str(request.user.id)
            
            # Use SessionManager to get nudge session
            session_manager = SessionManager()
            session_id, _ = session_manager.get_nudge_session(user_id)
            
            # Get AI service
            service = get_ai_service("gemini")
            
            # Get or create conversation for tracking
            conversation = self._get_or_create_conversation(
                user_id=user_id,
                session_id=session_id
            )
            
            # Generate nudge using the new get_nudge method
            # Using default NUDGE_SYSTEM_PROMPT and default prompt
            nudge_response = service.get_nudge(
                user_id=user_id,
                session_id=session_id,
                system_prompt=NUDGE_SYSTEM_PROMPT,
                prompt="Based on my profile, health data, and recent activities, generate a helpful nudge or reminder.",
                conversation=conversation
            )
            
            # Save the nudge as a system message
            self._save_message(conversation, 'system', f"Nudge generated: {nudge_response}")
            
            # Format response for frontend - just return the text
            response_data = {
                "text": nudge_response.strip()
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {"error": f"Failed to generate nudge: {str(e)}"},
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