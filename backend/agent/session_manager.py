"""
Session management service for handling user sessions across different API endpoints.
"""
import uuid
from datetime import timedelta
from typing import Optional, Tuple
from django.utils import timezone
from .models import Conversation


class SessionManager:
    """
    Manages session creation, expiry, and type prefixing for different API endpoints.
    """
    
    SESSION_TYPE_CHAT = "chat"
    SESSION_TYPE_NUDGE = "nudge"
    SESSION_TYPE_QUESTION = "question"
    SESSION_TYPE_GOAL = "goal"

    def __init__(self):
        pass

    def get_or_create_session(
        self,
        user_id: str,
        session_type: str,
        expiry_hours: Optional[int] = None
    ) -> Tuple[str, bool]:
        """
        Get existing session or create new one based on session type and expiry.

        Args:
            user_id: User ID string
            session_type: Type of session (chat, nudge, question)
            expiry_hours: Hours after which session expires (None for no expiry)

        Returns:
            Tuple of (session_id, is_new_session)
        """
        # Generate session prefix
        session_prefix = f"{session_type}_"

        # Try to find existing session for this user and type
        existing_conversation = self._get_existing_session(user_id, session_prefix)

        if existing_conversation:
            # Check if session has expired
            if expiry_hours and self._is_session_expired(existing_conversation, expiry_hours):
                # Session expired, create new one
                new_session_id = self._generate_session_id(session_type)
                return new_session_id, True
            # Session still valid, return existing
            return existing_conversation.session_id, False
        # No existing session, create new one
        new_session_id = self._generate_session_id(session_type)
        return new_session_id, True
    
    def _get_existing_session(self, user_id: str, session_prefix: str) -> Optional[Conversation]:
        """
        Find the most recent conversation for user with given session prefix.
        """
        return Conversation.objects.filter(
            user_id=user_id,
            session_id__startswith=session_prefix
        ).order_by('-updated_at').first()

    def _is_session_expired(self, conversation: Conversation, expiry_hours: int) -> bool:
        """
        Check if session has expired based on last activity (updated_at).
        """
        if not conversation.updated_at:
            return True

        expiry_time = conversation.updated_at + timedelta(hours=expiry_hours)
        return timezone.now() > expiry_time

    def _generate_session_id(self, session_type: str) -> str:
        """
        Generate new session ID with appropriate prefix.
        """
        session_uuid = str(uuid.uuid4())
        return f"{session_type}_{session_uuid}"

    def get_chat_session(self, user_id: str) -> Tuple[str, bool]:
        """
        Get or create chat session with 1-hour expiry.
        """
        return self.get_or_create_session(user_id, self.SESSION_TYPE_CHAT, expiry_hours=1)

    def get_nudge_session(self, user_id: str) -> Tuple[str, bool]:
        """
        Get or create nudge session (no expiry).
        """
        return self.get_or_create_session(user_id, self.SESSION_TYPE_NUDGE)

    def get_question_session(self, user_id: str) -> Tuple[str, bool]:
        """
        Get or create question session (no expiry).
        """
        return self.get_or_create_session(user_id, self.SESSION_TYPE_QUESTION)

    def get_goal_session(self, user_id: str) -> Tuple[str, bool]:
        """
        Get or create goal session (no expiry).
        """
        return self.get_or_create_session(user_id, self.SESSION_TYPE_GOAL)

    def is_valid_session_format(self, session_id: str, session_type: str) -> bool:
        """
        Validate that session ID has correct format for given type.
        """
        expected_prefix = f"{session_type}_"
        return session_id.startswith(expected_prefix)