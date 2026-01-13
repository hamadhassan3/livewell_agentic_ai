from .constants import AVAILABLE_MODELS, NUDGE_SYSTEM_PROMPT, QUESTION_NUDGE_SYSTEM_PROMPT, QUESTION_RESPONSE_SYSTEM_PROMPT, GOAL_NUDGE_SYSTEM_PROMPT, GOAL_RESPONSE_SYSTEM_PROMPT
from .models import Message, Nudge, QuestionNudge, GoalNudge
from tools.langchain_tools import LANGCHAIN_TOOLS
from tools.langchain_tools_notification import LANGCHAIN_TOOLS_NOTIFICATION
from tools.services import ToolExecutionService
from tools.models import ToolRequest
from profiles.services import get_user_questionnaire_responses, get_user_details
from tracking.models import Goal, Medication, MedicationTaken, GoalCompleted

from abc import ABC

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import ToolMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

from langfuse.langchain import CallbackHandler

from django.contrib.auth import get_user_model
from datetime import datetime

from documents.services import DocumentService
from documents.models import Document
from .models import Conversation, ConversationSummary

import os

class BaseAIService(ABC):
    """
    Defines a generic interface for streaming responses from an AI model.
    """
    def __init__(self, llm_instance):
        self.llm = llm_instance.bind_tools(LANGCHAIN_TOOLS)
        self.llm_notification = llm_instance.bind_tools(LANGCHAIN_TOOLS_NOTIFICATION)
        self.output_parser = StrOutputParser()
        self.tools = LANGCHAIN_TOOLS

    def get_response(self, user_prompt: str, system_prompt: str, user_id: str = None, session_id: str = None, conversation=None):
        """
        Builds a prompt and chain to get a response, handling tool calls in a loop.
        
        Args:
            user_prompt: The user's input message
            system_prompt: System instructions for the AI
            user_id: User identifier for context tracking
            session_id: Session identifier for conversation context
            conversation: Conversation object for tracking tool requests
        """
        # Retrieve memory context
        memory_context = self._retrieve_memory_context(user_prompt, user_id, session_id)
        
        # Build the complete prompt with all context
        prompt_messages = self._build_prompt_messages(
            system_prompt=system_prompt,
            user_id=user_id,
            memory_context=memory_context
        )
        
        # Add the user prompt as the final message
        prompt_messages.append(("human", user_prompt))
        
        # Debug: Print prompt messages count
        print(f"Built {len(prompt_messages)} prompt messages for user_id={user_id}")
        
        # Create configuration for the LLM
        config = self._create_llm_config(user_id, session_id)
        
        # Process the conversation with tool handling
        return self._process_conversation(prompt_messages, config, conversation=conversation, user_id=user_id)
    
    def _retrieve_memory_context(self, user_prompt: str, user_id: str = None, session_id: str = None):
        """
        Retrieve memory context using database messages, conversation summaries, and document retrieval.
        
        Args:
            user_prompt: The current user prompt for document retrieval
            user_id: User identifier
            session_id: Session identifier
            
        Returns:
            Dictionary containing short-term messages, summaries, and document context
        """
        short_term_messages = self._get_short_term_memory(user_id, session_id, limit=10)
        
        # Get relevant context from ChromaDB
        context_items = []
        if user_id:
            # Get relevant conversation summaries
            from rag.services import retrieve_relevant_summaries
            relevant_summaries = retrieve_relevant_summaries(user_prompt, user_id, limit=3)
            
            # Get relevant documents (user documents + global documents)
            user_documents = self._get_relevant_documents(user_prompt, user_id, limit=3)
            global_documents = self._get_relevant_global_documents(user_prompt, limit=2)
            
            # Combine summaries and documents
            context_items = relevant_summaries + user_documents + global_documents
        
        return {
            'short_term': short_term_messages,
            'long_term': context_items  # Includes summaries, user documents, and global documents
        }
    
    def _build_prompt_messages(self, system_prompt: str, user_id: str = None, memory_context: dict = None, is_nudge: bool = False, is_question: bool = False):
        """
        Build the complete prompt messages list with all context.
        
        Args:
            system_prompt: System instructions
            user_id: User identifier
            memory_context: Dictionary containing memory messages
            is_nudge: Whether this is for nudge generation (affects context formatting)
            is_question: Whether this is for question nudge generation (affects context formatting)
            
        Returns:
            List of prompt messages
        """
        prompt_messages = [("system", system_prompt)]
        
        # Add user context if available
        if user_id:
            user_context = self._build_user_context(user_id, is_nudge=is_nudge, is_question=is_question)
            if user_context:
                prompt_messages.extend(user_context)
        
        # Add document context from ChromaDB
        if memory_context and memory_context.get('long_term'):
            document_context = self._format_long_term_memory(memory_context['long_term'], is_nudge=is_nudge)
            if is_nudge:
                prompt_messages.append(
                    ("system", f"Relevant Documents:\n{document_context}")
                )
            else:
                prompt_messages.append(
                    ("system", f"Relevant Documents:\n{document_context}")
                )
        
        # Add short-term memory as conversation turns
        if memory_context and memory_context.get('short_term'):
            # For nudges, only use last 5 interactions
            short_term_to_use = memory_context['short_term'][-5:] if is_nudge else memory_context['short_term']
            
            if is_nudge and short_term_to_use:
                # Format as recent interactions for nudges
                recent_interactions = []
                for message_data in short_term_to_use:
                    if message_data['role'] == 'user':
                        recent_interactions.append(f"User: {message_data['content']}")
                    elif message_data['role'] == 'assistant':
                        recent_interactions.append(f"Assistant: {message_data['content']}")
                
                if recent_interactions:
                    prompt_messages.append(
                        ("system", f"Most Recent Interactions:\n" + "\n".join(recent_interactions))
                    )
            else:
                # Regular conversation format
                for message_data in short_term_to_use:
                    if message_data['role'] == 'user':
                        prompt_messages.append(("human", message_data['content']))
                    elif message_data['role'] == 'assistant':
                        prompt_messages.append(("assistant", message_data['content']))
        
        return prompt_messages
    
    def _build_user_context(self, user_id: str, is_nudge: bool = False, is_question: bool = False):
        """
        Build user-specific context including details and questionnaire responses.
        
        Args:
            user_id: User identifier
            is_nudge: Whether this is for nudge generation (affects context headings)
            is_question: Whether this is for question nudge generation (affects context headings)
            
        Returns:
            List of system messages with user context
        """
        context_messages = []
        
        try:
            user_id_int = int(user_id)
            
            # Add user details
            user_details = get_user_details(user_id_int)
            if user_details:
                user_info = self._format_user_details(user_details)
                if is_question:
                    context_messages.append(("system", f"User Profile:\n{user_info}"))
                elif is_nudge:
                    context_messages.append(("system", f"User Profile:\n{user_info}"))
                else:
                    context_messages.append(("system", user_info))
            
            # Add questionnaire responses
            questionnaire_responses = self._get_user_questionnaire_context(user_id_int)
            if questionnaire_responses:
                if is_question:
                    context_messages.append(
                        ("system", f"User Health Context:\n{questionnaire_responses}")
                    )
                elif is_nudge:
                    context_messages.append(
                        ("system", f"User Health Context:\n{questionnaire_responses}")
                    )
                else:
                    context_messages.append(
                        ("system", f"User Questionnaire Responses:\n{questionnaire_responses}")
                    )
            
            # Add goals and medications tracking context
            tracking_context = self._get_user_tracking_context(user_id_int)
            if tracking_context:
                if is_question:
                    context_messages.append(
                        ("system", f"User Tracking Data:\n{tracking_context}")
                    )
                elif is_nudge:
                    context_messages.append(
                        ("system", f"User Tracking Data:\n{tracking_context}")
                    )
                else:
                    context_messages.append(
                        ("system", f"User Goals and Medications:\n{tracking_context}")
                    )
            
            # Add user preferences context
            preferences_context = self._get_user_preferences_context(user_id_int, is_question=is_question)
            if preferences_context:
                if is_question:
                    context_messages.append(
                        ("system", f"User Preferences with Timestamps:\n{preferences_context}")
                    )
                else:
                    context_messages.append(
                        ("system", f"User Preferences:\n{preferences_context}")
                    )
        except (ValueError, TypeError):
            pass
        
        return context_messages
    
    def _format_user_details(self, user_details: dict) -> str:
        """
        Format user details into a readable string.
        
        Args:
            user_details: Dictionary containing user information
            
        Returns:
            Formatted user details string
        """
        return (
            f"User ID: {user_details['user_id']}\n"
            f"User Name: {user_details['user_name']}\n"
            f"User Email: {user_details['user_email']}\n"
            f"Gender: {user_details['gender']}\n"
            f"Date of Birth: {user_details['date_of_birth']}\n"
            f"Height: {user_details['height']}\n"
            f"Weight: {user_details['weight']}\n"
        )
    
    def _create_llm_config(self, user_id: str = None, session_id: str = None):
        """
        Create configuration for the LLM.
        
        Args:
            user_id: User identifier
            session_id: Session identifier
            
        Returns:
            Configuration dictionary
        """
        handler = CallbackHandler()
        return {
            "callbacks": [handler],
            "configurable": {
                "user_id": user_id,
                "session_id": session_id,
            }
        }
    
    def get_nudge(self, user_id: str, session_id: str = None, system_prompt: str = None, prompt: str = None, use_notification_tools: bool = False, is_question: bool = False, force_regenerate: bool = False, conversation=None):
        """
        Generate or retrieve a proactive nudge for the user based on their context and history.
        
        Args:
            user_id: User identifier for context and personalization
            session_id: Session identifier for conversation context
            system_prompt: Custom system prompt for nudge generation (defaults to NUDGE_SYSTEM_PROMPT)
            prompt: Custom user prompt for nudge generation (defaults to standard nudge request)
            use_notification_tools: Whether to use notification-specific tools instead of full tool set
            is_question: Whether this is a question nudge (affects context formatting)
            force_regenerate: Force generation of a new nudge even if one exists
            conversation: Conversation object for tracking tool requests
            
        Returns:
            A personalized nudge message for the user
        """
        from django.contrib.auth import get_user_model
        from datetime import datetime
        
        User = get_user_model()
        
        # Try to get the user object
        try:
            user = User.objects.get(id=int(user_id))
        except (User.DoesNotExist, ValueError):
            user = None
        
        # If not forcing regeneration, try to get the latest nudge from database
        if not force_regenerate and user:
            latest_nudge = Nudge.objects.filter(user=user).first()
            if latest_nudge:
                # Mark as shown and return the stored content
                if not latest_nudge.shown_at:
                    latest_nudge.shown_at = datetime.now()
                    latest_nudge.save()
                return latest_nudge.content
        
        # Use default values if not provided
        if system_prompt is None:
            system_prompt = NUDGE_SYSTEM_PROMPT
        
        if prompt is None:
            prompt = "Based on my profile, health data, and recent activities, generate a helpful nudge or reminder."
        
        # Retrieve memory context (using the prompt for relevance)
        memory_context = self._retrieve_memory_context(prompt, user_id, session_id)
        
        # Build prompt messages with nudge-specific formatting
        prompt_messages = self._build_prompt_messages(
            system_prompt=system_prompt,
            user_id=user_id,
            memory_context=memory_context,
            is_nudge=True,
            is_question=is_question
        )
        
        # Add the nudge generation request
        prompt_messages.append(("human", prompt))
        
        # Create configuration for the LLM
        config = self._create_llm_config(user_id, session_id)
        
        # Choose the appropriate LLM based on tool requirements
        llm_to_use = self.llm_notification
        
        # Process the conversation with tool handling using the selected LLM
        nudge_content = self._process_conversation(
            prompt_messages, 
            config, 
            conversation=conversation,
            user_id=user_id,
            llm=llm_to_use
        )
        
        # Save the nudge to database if we have a user
        if user and nudge_content:
            Nudge.objects.create(
                user=user,
                content=nudge_content,
                nudge_type='general',
                shown_at=datetime.now()
            )
        
        return nudge_content
    
    def get_question_nudge(self, user_id: str, session_id: str = None, force_regenerate: bool = False, conversation=None):
        """
        Generate or retrieve a question nudge to gather or update user preference information.
        Uses a specialized session for question nudges to maintain conversation context
        for user responses.
        
        Args:
            user_id: User identifier for context and personalization
            session_id: Session identifier for conversation context (defaults to question session)
            force_regenerate: Force generation of a new question even if pending questions exist
            
        Returns:
            A personalized question for the user
        """
        
        User = get_user_model()
        
        # Try to get the user object
        try:
            user = User.objects.get(id=int(user_id))
        except (User.DoesNotExist, ValueError):
            user = None
        
        # Use specialized session for question nudges
        question_session_id = f"{user_id}_question_session" if not session_id else session_id
        
        # If not forcing regeneration, try to get a pending question from database
        if not force_regenerate and user:
            pending_question = QuestionNudge.objects.filter(
                user=user, 
                status='pending'
            ).first()
            if pending_question:
                # Mark as shown and return the stored question
                if not pending_question.shown_at:
                    pending_question.shown_at = datetime.now()
                    pending_question.save()
                return pending_question.question
            else:
                return None  # No pending question available
        
        # Use question nudge system prompt
        system_prompt = QUESTION_NUDGE_SYSTEM_PROMPT
        
        # Default prompt for question generation
        prompt = "Generate a personalized question to help improve my health profile based on missing or outdated preference information."
        
        # Retrieve memory context (using the prompt for relevance)
        memory_context = self._retrieve_memory_context(prompt, user_id, question_session_id)
        
        # Build prompt messages with question-specific formatting
        prompt_messages = self._build_prompt_messages(
            system_prompt=system_prompt,
            user_id=user_id,
            memory_context=memory_context,
            is_nudge=False,
            is_question=True
        )
        
        # Add the question generation request
        prompt_messages.append(("human", prompt))
        
        # Create configuration for the LLM
        config = self._create_llm_config(user_id, question_session_id)
        
        # Use notification tools for question nudges
        llm_to_use = self.llm_notification
        
        # Get or create conversation if not provided
        if not conversation:
            conversation, _ = Conversation.objects.get_or_create(
                session_id=question_session_id,
                defaults={'user_id': int(user_id) if user_id else None}
            )
        
        # Process the conversation with tool handling
        question_content = self._process_conversation(
            prompt_messages, 
            config, 
            conversation=conversation,
            user_id=user_id,
            llm=llm_to_use
        )
        
        # Save the question nudge to database if we have a user
        if user and question_content:
            
            QuestionNudge.objects.create(
                user=user,
                question=question_content,
                question_type='general',
                status='pending',
                conversation=conversation,
                shown_at=datetime.now()
            )
        
        return question_content
    
    def respond_to_question_nudge(self, user_id: str, user_response: str, session_id: str = None, conversation=None):
        """
        Process user's response to a question nudge and update their profile.
        
        Args:
            user_id: User identifier
            user_response: User's answer to the question
            session_id: Session identifier for the question conversation
            
        Returns:
            AI response acknowledging the update
        """
        
        User = get_user_model()
        
        # Try to get the user object
        try:
            user = User.objects.get(id=int(user_id))
        except (User.DoesNotExist, ValueError):
            user = None
        
        # Use the same question session
        question_session_id = f"{user_id}_question_session" if not session_id else session_id
        
        # Get the pending question nudge to provide context
        pending_question = None
        original_question = ""
        if user:
            pending_question = QuestionNudge.objects.filter(
                user=user,
                status='pending'
            ).first()
            
            if pending_question:
                original_question = pending_question.question
        
        # Use the system prompt for processing responses
        system_prompt = QUESTION_RESPONSE_SYSTEM_PROMPT
        
        # Retrieve memory context from the question session
        memory_context = self._retrieve_memory_context(user_response, user_id, question_session_id)
        
        # Build prompt messages
        prompt_messages = self._build_prompt_messages(
            system_prompt=system_prompt,
            user_id=user_id,
            memory_context=memory_context,
            is_nudge=False,
            is_question=False
        )
        
        # Add context about the original question
        context_message = f"User was asked: '{original_question}' and responded: '{user_response}'"
        prompt_messages.append(("human", context_message))
        
        # Create configuration for the LLM
        config = self._create_llm_config(user_id, question_session_id)
        
        # Use full tools for profile updates
        llm_to_use = self.llm
        
        # Get or create conversation if not provided
        if not conversation:
            conversation, _ = Conversation.objects.get_or_create(
                session_id=question_session_id,
                defaults={'user_id': int(user_id) if user_id else None}
            )
        
        # Process the conversation with tool handling
        ai_response = self._process_conversation(
            prompt_messages, 
            config, 
            conversation=conversation,
            user_id=user_id,
            llm=llm_to_use
        )
        
        # Update the question nudge in the database if we have a user
        if user:
            # Find the most recent pending question for this user
            pending_question = QuestionNudge.objects.filter(
                user=user,
                status='pending'
            ).first()
            
            if pending_question:
                pending_question.user_response = user_response
                pending_question.ai_response = ai_response
                pending_question.status = 'answered'
                pending_question.answered_at = datetime.now()
                pending_question.save()
        
        return ai_response
    
    def get_goal_nudge(self, user_id: str, session_id: str = None, force_regenerate: bool = False, conversation=None):
        """
        Generate or retrieve a goal nudge to suggest new goals that push the user higher.
        Uses a specialized session for goal nudges to maintain conversation context.
        
        Args:
            user_id: User identifier for context and personalization
            session_id: Session identifier for conversation context (defaults to goal session)
            force_regenerate: Force generation of a new goal even if pending goals exist
            conversation: Existing conversation object (optional)
            
        Returns:
            Goal nudge content or None if no new goal should be generated
        """
        
        User = get_user_model()
        
        # Try to get the user object
        try:
            user = User.objects.get(id=int(user_id))
        except (User.DoesNotExist, ValueError):
            user = None
        
        # Use default goal session if none provided
        goal_session_id = f"{user_id}_goal_session" if not session_id else session_id
        
        # Check if there's already a pending goal nudge (unless forcing regeneration)
        if user and not force_regenerate:
            pending_goal = GoalNudge.objects.filter(
                user=user,
                status='pending'
            ).first()
            
            if pending_goal:
                return pending_goal.goal_suggestion  # Don't generate a new goal if one is pending
        
        # Use the goal nudge system prompt
        system_prompt = GOAL_NUDGE_SYSTEM_PROMPT
        
        # Retrieve memory context from the goal session
        memory_context = self._retrieve_memory_context("Generate a goal suggestion", user_id, goal_session_id)
        
        # Build prompt messages
        prompt_messages = self._build_prompt_messages(
            system_prompt=system_prompt,
            user_id=user_id,
            memory_context=memory_context,
            is_nudge=True,
            is_question=False
        )
        
        # Add the goal generation request
        prompt_messages.append(("human", "Generate a personalized goal suggestion that pushes me towards higher achievements."))
        
        # Create configuration for the LLM
        config = self._create_llm_config(user_id, goal_session_id)
        
        # Use full tools for goal generation
        llm_to_use = self.llm
        
        # Get or create conversation if not provided
        if not conversation:
            conversation, _ = Conversation.objects.get_or_create(
                session_id=goal_session_id,
                defaults={'user_id': int(user_id) if user_id else None}
            )
        
        # Process the conversation with tool handling
        goal_content = self._process_conversation(
            prompt_messages, 
            config, 
            conversation=conversation,
            user_id=user_id,
            llm=llm_to_use
        )
        
        # Save the goal nudge to the database if we have a user and content
        if user and goal_content:
            GoalNudge.objects.create(
                user=user,
                goal_suggestion=goal_content,
                goal_type='general',
                status='pending',
                conversation=conversation,
                shown_at=datetime.now()
            )
        
        return goal_content
    
    def respond_to_goal_nudge(self, user_id: str, user_response: str, session_id: str = None, conversation=None):
        """
        Process user's response to a goal nudge and create goal if accepted.
        
        Args:
            user_id: User identifier
            user_response: User's yes/no answer to the goal suggestion
            session_id: Session identifier for the goal conversation
            conversation: Existing conversation object (optional)
            
        Returns:
            AI response acknowledging the decision
        """
        
        User = get_user_model()
        
        # Try to get the user object
        try:
            user = User.objects.get(id=int(user_id))
        except (User.DoesNotExist, ValueError):
            user = None
        
        # Use the same goal session
        goal_session_id = f"{user_id}_goal_session" if not session_id else session_id
        
        # Use the system prompt for processing responses
        system_prompt = GOAL_RESPONSE_SYSTEM_PROMPT
        
        # Get the pending goal nudge to provide context
        pending_goal = None
        original_goal_suggestion = ""
        if user:
            pending_goal = GoalNudge.objects.filter(
                user=user,
                status='pending'
            ).first()
            
            if pending_goal:
                original_goal_suggestion = pending_goal.goal_suggestion
        
        # Retrieve memory context from the goal session
        memory_context = self._retrieve_memory_context(user_response, user_id, goal_session_id)
        
        # Build prompt messages
        prompt_messages = self._build_prompt_messages(
            system_prompt=system_prompt,
            user_id=user_id,
            memory_context=memory_context,
            is_nudge=False,
            is_question=False
        )
        
        # Add context about the original goal suggestion
        context_message = f"User was asked: '{original_goal_suggestion}' and responded: '{user_response}'"
        prompt_messages.append(("human", context_message))
        
        # Create configuration for the LLM
        config = self._create_llm_config(user_id, goal_session_id)
        
        # Use full tools for goal creation
        llm_to_use = self.llm
        
        # Get or create conversation if not provided
        if not conversation:
            conversation, _ = Conversation.objects.get_or_create(
                session_id=goal_session_id,
                defaults={'user_id': int(user_id) if user_id else None}
            )
        
        # Process the conversation with tool handling
        ai_response = self._process_conversation(
            prompt_messages, 
            config, 
            conversation=conversation,
            user_id=user_id,
            llm=llm_to_use
        )
        
        # Update the goal nudge in the database if we have a user
        if user:
            # Find the most recent pending goal for this user
            pending_goal = GoalNudge.objects.filter(
                user=user,
                status='pending'
            ).first()
            
            if pending_goal:
                pending_goal.user_response = user_response
                pending_goal.ai_response = ai_response
                pending_goal.status = 'answered'
                pending_goal.answered_at = datetime.now()
                pending_goal.save()
        
        return ai_response
    
    def check_conversation_summary_exists(self, session_id: str) -> bool:
        """
        Check if a summary exists for a given conversation session.
        
        Args:
            session_id: Session identifier for the conversation
            
        Returns:
            True if a summary exists, False otherwise
        """        
        try:
            conversation = Conversation.objects.filter(session_id=session_id).first()
            if not conversation:
                return False
            
            return ConversationSummary.objects.filter(conversation=conversation).exists()
        except Exception:
            return False
    
    def generate_missing_summaries(self):
        """
        Find all conversations without summaries or with outdated summaries and generate/update them.
        A summary is considered outdated if there are newer messages than the summary's last update time.
        
        Returns:
            Dict with statistics on summary generation
        """
        stats = {
            'total_conversations': 0,
            'missing_summaries': 0,
            'summaries_generated': 0,
            'errors': 0
        }
        
        try:
            # Get only chat conversations (session_id starts with 'chat_')
            conversations = Conversation.objects.filter(session_id__startswith='chat_')
            stats['total_conversations'] = conversations.count()
            
            for conversation in conversations:
                # Check if conversation has messages
                if not conversation.messages.exists():
                    continue
                
                # Get the latest message timestamp
                latest_message = conversation.messages.order_by('-timestamp').first()
                
                # Check if summary exists
                existing_summary = ConversationSummary.objects.filter(conversation=conversation).first()
                
                needs_summary = False
                if not existing_summary:
                    # No summary exists
                    stats['missing_summaries'] += 1
                    needs_summary = True
                elif latest_message.timestamp > existing_summary.updated_at:
                    # Summary exists but there are newer messages
                    stats['missing_summaries'] += 1
                    needs_summary = True
                
                if needs_summary:
                    try:
                        # Generate summary
                        summary_text = self.get_conversation_summary(
                            session_id=conversation.session_id,
                            user_id=conversation.user_id if conversation.user else None
                        )
                        
                        # Save or update summary
                        if summary_text and not summary_text.startswith("No ") and not summary_text.startswith("Error "):
                            if existing_summary:
                                # Update existing summary
                                existing_summary.summary = summary_text
                                existing_summary.save()
                            else:
                                # Create new summary
                                ConversationSummary.objects.create(
                                    conversation=conversation,
                                    summary=summary_text
                                )
                            
                            # Store/update summary in ChromaDB
                            from rag.services import embed_and_store_summary
                            embed_and_store_summary(
                                summary_text=summary_text,
                                session_id=conversation.session_id,
                                user_id=conversation.user_id if conversation.user else None
                            )
                            
                            stats['summaries_generated'] += 1
                    except Exception as e:
                        stats['errors'] += 1
            
            return stats
            
        except Exception as e:
            stats['errors'] += 1
            return stats
    
    def get_conversation_summary(self, session_id: str, user_id: str = None):
        """
        Generate a concise summary of a conversation session without any additional context.
        
        Args:
            session_id: Session identifier for the conversation to summarize
            user_id: User identifier for filtering (optional but recommended for security)
            
        Returns:
            A summary of the conversation (max 150 words)
        """
        try:
            from .models import Conversation
            # Get the conversation
            conversation_filter = {'session_id': session_id}
            if user_id:
                conversation_filter['user_id'] = int(user_id)

            conversation = Conversation.objects.filter(**conversation_filter).first()
            
            if not conversation:
                return "No conversation found for this session."
            
            # Get all messages for this conversation
            messages = conversation.messages.all().order_by('timestamp')
            
            if not messages.exists():
                return "No messages found in this conversation."
            
            # Build the conversation text for summarization
            conversation_text = []
            for message in messages:
                role_label = message.role.title()
                conversation_text.append(f"{role_label}: {message.content}")
            
            full_conversation = "\n".join(conversation_text)
            
            # Create summary prompt (no additional context)
            summary_prompt = (
                "Please provide a concise summary of the following conversation in no more than 100 words. "
                "Focus on the main topics discussed, key questions asked, and important outcomes or decisions made. "
                "The summary must be as short as possible. You have to reduce unnecessary details."
                "\n\n"
                f"Conversation:\n{full_conversation}"
            )
            
            # Use a simple system prompt for summarization
            system_prompt = "You are a helpful assistant that creates concise conversation summaries."
            
            # Build minimal prompt messages (no user context, no memory context)
            prompt_messages = [
                ("system", system_prompt),
                ("human", summary_prompt)
            ]
            
            # Create basic LLM configuration
            config = self._create_llm_config(user_id, session_id)
            
            # Use LLM for simple summarization
            prompt_template = ChatPromptTemplate.from_messages(prompt_messages)
            chain = prompt_template | self.llm
            
            # Get summary response
            ai_message = chain.invoke({}, config=config)
            
            return ai_message.content.strip()
            
        except Exception as e:
            return f"Error generating summary: {str(e)}"
    
    def _process_conversation(self, prompt_messages: list, config: dict, conversation=None, user_id=None, llm=None):
        """
        Process the conversation with the LLM, handling tool calls.
        
        Args:
            prompt_messages: List of prompt messages
            config: LLM configuration
            conversation: Conversation object for tracking client tool requests
            user_id: User ID for tool request tracking
            llm: Optional LLM instance to use (defaults to self.llm)
            
        Returns:
            Final AI response content with any pending tool requests
        """
        pending_tool_requests = []
        
        # Use provided LLM or default to self.llm
        llm_to_use = llm if llm is not None else self.llm
        
        while True:
            print(f"Processing conversation with {len(prompt_messages)} messages")
            prompt_template = ChatPromptTemplate.from_messages(prompt_messages)
            chain = prompt_template | llm_to_use
            
            print("Invoking AI chain...")
            ai_message = chain.invoke({}, config=config)
            print(f"AI response received: {type(ai_message)}")
            
            if not ai_message.tool_calls:
                # Return response with any pending tool requests
                if pending_tool_requests:
                    # Store conversation context in each tool request for resumption
                    self._store_conversation_context(
                        pending_tool_requests, 
                        prompt_messages,
                        conversation,
                        user_id
                    )
                    return {
                        'content': ai_message.content,
                        'tool_requests': pending_tool_requests,
                        'type': 'response_with_tool_requests'
                    }
                return ai_message.content
            
            prompt_messages.append(ai_message)
            
            # Execute tools and add results to messages
            tool_requests = self._execute_tools(
                ai_message.tool_calls, 
                prompt_messages,
                conversation=conversation,
                user_id=user_id
            )
            
            # If there are client tool requests, stop processing and return them
            if tool_requests:
                pending_tool_requests.extend(tool_requests)
                # Store the full conversation state including the AI message with tool calls
                self._store_conversation_context(
                    pending_tool_requests, 
                    prompt_messages,
                    conversation,
                    user_id,
                    ai_message.tool_calls  # Store the original tool calls
                )
                return {
                    'content': 'I need to use some tools on your device to help you.',
                    'tool_requests': pending_tool_requests,
                    'type': 'response_with_tool_requests'
                }
    
    def _execute_tools(self, tool_calls: list, prompt_messages: list, conversation=None, user_id=None):
        """
        Execute tool calls and append results to prompt messages.
        
        Args:
            tool_calls: List of tool calls from the AI
            prompt_messages: List to append tool results to
            conversation: Conversation object for client tool requests
            user_id: User ID for tool request tracking
            
        Returns:
            List of client tool requests that need client-side execution
        """
        client_tool_requests = []
        
        for tool_call in tool_calls:
            tool_name = tool_call["name"]
            
            # Check if it's a client tool that needs special handling
            if ToolExecutionService.is_client_tool(tool_name):
                # Create a tool request for client-side execution
                from django.contrib.auth import get_user_model
                User = get_user_model()
                
                user = None
                if user_id:
                    try:
                        user = User.objects.get(id=int(user_id))
                    except (User.DoesNotExist, ValueError):
                        pass
                
                result = ToolExecutionService.handle_tool_call(
                    tool_name=tool_name,
                    parameters=tool_call["args"],
                    conversation=conversation,
                    user=user
                )
                
                if result.get('type') == 'tool_call_request':
                    # Add tool call ID to the request for later matching
                    result['tool_call_id'] = tool_call["id"]
                    client_tool_requests.append(result)
                    # DON'T add a message for client tools - wait for actual execution
                    continue
                else:
                    # This shouldn't happen for client tools, but handle it just in case
                    tool_output = str(result)
                    prompt_messages.append(
                        ToolMessage(content=str(tool_output), tool_call_id=tool_call["id"])
                    )
            else:
                # Execute server tool normally
                tool_to_run = next(
                    (tool for tool in self.tools if tool.name == tool_name), 
                    None
                )
                
                if tool_to_run:
                    tool_output = self._execute_single_tool(tool_to_run, tool_call["args"], tool_name)
                else:
                    tool_output = f"Tool '{tool_name}' not found."
                
                # Add message for server tools
                prompt_messages.append(
                    ToolMessage(content=str(tool_output), tool_call_id=tool_call["id"])
                )
        
        return client_tool_requests
    
    def _execute_single_tool(self, tool, args: dict, tool_name: str) -> str:
        """
        Execute a single tool with error handling.
        
        Args:
            tool: The tool to execute
            args: Arguments for the tool
            tool_name: Name of the tool for error messages
            
        Returns:
            Tool output or error message
        """
        try:
            return tool.invoke(args)
        except Exception as e:
            return f"Error executing tool {tool_name}: {e}"
    
    def _get_user_questionnaire_context(self, user_id: int) -> str:
        """
        Retrieves and formats questionnaire responses for the user.
        """
        responses = get_user_questionnaire_responses(user_id)

        if not responses:
            return ""
        
        context_str = ""

        if responses:
            for response in responses["questionnaires"]:
                context_str += f"Questionnaire: {response['questionnaire']}\n"

                if response['questionnaire'] == "EFS" and response['is_completed']:
                    score = response['total_score']
                    frailty_level = ""
                    if score <= 5:
                        frailty_level = "Not frail"
                    elif 6 <= score <= 7:
                        frailty_level = "Vulnerable"
                    elif 8 <= score <= 9:
                        frailty_level = "Mild frailty"
                    elif 10 <= score <= 11:
                        frailty_level = "Moderate frailty"
                    elif score >= 12:
                        frailty_level = "Severe frailty"
                    
                    context_str += f"  Frailty Level: {frailty_level} (Score: {score})\n"

                for answer in response['answers']:
                    question_text = answer['question']
                    answer_text = ""
                    if isinstance(answer['answer'], dict):
                        answer_text = ", ".join(f"{k}: {v}" for k, v in answer['answer'].items())
                    else:
                        answer_text = str(answer['answer'])

                    context_str += f"  Q: {question_text}\n"
                    context_str += f"  A: {answer_text}\n"

        return context_str

    def _get_user_tracking_context(self, user_id: int) -> str:
        """
        Retrieves and formats user's active goals and medications with taken status.
        
        Args:
            user_id: User identifier
            
        Returns:
            Formatted string containing goals and medications with taken status
        """
        try:
            from datetime import date
            
            # Get active goals
            goals = Goal.objects.filter(user_id=user_id, is_active=True).order_by('created_at')
            
            # Get active medications  
            medications = Medication.objects.filter(user_id=user_id, is_active=True).order_by('created_at')
            
            context_parts = []
            
            if goals.exists():
                context_parts.append("Active Goals:")
                
                # Get today's completed goals for this user
                today = date.today()
                completed_goals = GoalCompleted.objects.filter(
                    user_id=user_id,
                    date_completed=today
                ).select_related('goal')
                
                # Create a set of completed goal IDs for quick lookup
                completed_goal_ids = set(record.goal_id for record in completed_goals)
                
                for goal in goals:
                    is_completed = goal.id in completed_goal_ids
                    status = "✓ Completed" if is_completed else "⏰ Pending"
                    context_parts.append(f"ID: {goal.id}  - {goal.title} ({goal.category}, {goal.frequency}) - Today: {status}")
                    
            if medications.exists():
                if context_parts:  # Add spacing if goals exist
                    context_parts.append("")
                context_parts.append("Current Medications:")
                
                # Get today's taken medications for this user
                today = date.today()
                taken_records = MedicationTaken.objects.filter(
                    user_id=user_id,
                    date_taken=today
                ).select_related('medication')
                
                # Create a mapping of medication_id + scheduled_time to taken status
                taken_map = {}
                for record in taken_records:
                    key = f"{record.medication_id}_{record.scheduled_time}"
                    taken_map[key] = True
                
                for medication in medications:
                    med_info = f"  - {medication.name} ({medication.dosage})"
                    if medication.frequency_type:
                        med_info += f" - {medication.frequency_type}"
                    if medication.reminder_times:
                        times = ", ".join(medication.reminder_times)
                        med_info += f" - Times: {times}"
                        
                        # Add taken status for each reminder time
                        taken_statuses = []
                        for reminder_time in medication.reminder_times:
                            key = f"{medication.id}_{reminder_time}"
                            is_taken = taken_map.get(key, False)
                            status = "✓ Taken" if is_taken else "⏰ Pending"
                            taken_statuses.append(f"{reminder_time}: {status}")
                        
                        if taken_statuses:
                            med_info += f" - Today's Status: {', '.join(taken_statuses)}"
                            
                    if medication.notes:
                        med_info += f" - Notes: {medication.notes}"
                    context_parts.append(med_info)
            
            return "\n".join(context_parts) if context_parts else ""
            
        except Exception:
            return ""
    
    def _get_user_preferences_context(self, user_id: int, is_question: bool = False) -> str:
        """
        Retrieves and formats user preferences data including health conditions,
        activity levels, social preferences, and other wellness settings.
        
        Args:
            user_id: User identifier
            is_question: Whether this is for question generation (includes timestamps)
            
        Returns:
            Formatted string containing user preferences
        """
        try:
            from profiles.models import UserPreferences
            
            # Get user preferences - create with defaults if they don't exist (for existing users)
            try:
                preferences = UserPreferences.objects.get(user_id=user_id)
            except UserPreferences.DoesNotExist:
                # Create default preferences for existing users who don't have them yet
                from django.contrib.auth import get_user_model
                User = get_user_model()
                try:
                    user = User.objects.get(id=user_id)
                    preferences, created = UserPreferences.objects.get_or_create(
                        user=user,
                        defaults={}
                    )
                except User.DoesNotExist:
                    return ""
            
            context_parts = []
            
            def format_with_timestamp(value, field_name, preferences):
                """Helper function to format preference with timestamp if available"""
                timestamp_field = f"{field_name}_updated_at"
                timestamp = getattr(preferences, timestamp_field, None)
                if is_question:
                    if timestamp:
                        timestamp_str = timestamp.strftime('%Y-%m-%d %H:%M')
                        return f"{value} (updated: {timestamp_str})"
                    else:
                        return f"{value} (never updated)"
                return value

            # Health conditions
            health_conditions = []
            if preferences.is_diabetic:
                condition = format_with_timestamp("Diabetic", "is_diabetic", preferences)
                health_conditions.append(condition)
            if preferences.is_hypertensive:
                condition = format_with_timestamp("Hypertensive", "is_hypertensive", preferences)
                health_conditions.append(condition)
            if preferences.has_heart_disease:
                condition = format_with_timestamp("Heart Disease", "has_heart_disease", preferences)
                health_conditions.append(condition)
            if preferences.has_arthritis:
                condition = format_with_timestamp("Arthritis", "has_arthritis", preferences)
                health_conditions.append(condition)
            if preferences.has_osteoporosis:
                condition = format_with_timestamp("Osteoporosis", "has_osteoporosis", preferences)
                health_conditions.append(condition)
            if preferences.has_vision_impairment:
                condition = format_with_timestamp("Vision Impairment", "has_vision_impairment", preferences)
                health_conditions.append(condition)
            if preferences.has_hearing_impairment:
                condition = format_with_timestamp("Hearing Impairment", "has_hearing_impairment", preferences)
                health_conditions.append(condition)
            if preferences.has_memory_concerns:
                condition = format_with_timestamp("Memory Concerns", "has_memory_concerns", preferences)
                health_conditions.append(condition)
            
            if health_conditions:
                context_parts.append(f"Health Conditions: {', '.join(health_conditions)}")
            else:
                context_parts.append("Health Conditions: None reported")
            
            if preferences.other_health_conditions:
                other_conditions = format_with_timestamp(preferences.other_health_conditions, "other_health_conditions", preferences)
                context_parts.append(f"Additional Health Notes: {other_conditions}")
            
            # Medication status
            if preferences.takes_medications:
                med_reminder = "enabled" if preferences.medication_reminder_enabled else "disabled"
                takes_meds = format_with_timestamp(f"Yes (reminders {med_reminder})", "takes_medications", preferences)
                context_parts.append(f"Takes Medications: {takes_meds}")
                if preferences.medication_reminder_times:
                    times = ", ".join(preferences.medication_reminder_times)
                    reminder_times = format_with_timestamp(times, "medication_reminder_times", preferences)
                    context_parts.append(f"Medication Reminder Times: {reminder_times}")
            else:
                takes_meds = format_with_timestamp("No", "takes_medications", preferences)
                context_parts.append(f"Takes Medications: {takes_meds}")
            
            # Activity and mobility
            if preferences.activity_level:
                activity = format_with_timestamp(preferences.activity_level.replace('_', ' ').title(), "activity_level", preferences)
                context_parts.append(f"Activity Level: {activity}")
            
            if preferences.exercise_goal_minutes_per_week:
                exercise_goal = format_with_timestamp(f"{preferences.exercise_goal_minutes_per_week} minutes", "exercise_goal_minutes_per_week", preferences)
                context_parts.append(f"Weekly Exercise Goal: {exercise_goal}")
            
            if preferences.mobility_level:
                mobility = format_with_timestamp(preferences.mobility_level.replace('_', ' ').title(), "mobility_level", preferences)
                context_parts.append(f"Mobility: {mobility}")
            
            if preferences.needs_transportation_assistance:
                transport = format_with_timestamp("Needs assistance", "needs_transportation_assistance", preferences)
                context_parts.append(f"Transportation: {transport}")
            
            # Social preferences
            if preferences.social_preference:
                social = format_with_timestamp(preferences.social_preference.replace('_', ' ').title(), "social_preference", preferences)
                context_parts.append(f"Social Preference: {social}")
            
            if preferences.interested_in_group_activities is not None:
                group_interest = "Yes" if preferences.interested_in_group_activities else "No"
                group_activities = format_with_timestamp(group_interest, "interested_in_group_activities", preferences)
                context_parts.append(f"Interested in Group Activities: {group_activities}")
            
            # Mental wellness
            if preferences.stress_level:
                stress = format_with_timestamp(preferences.stress_level.title(), "stress_level", preferences)
                context_parts.append(f"Stress Level: {stress}")
            
            wellness_interests = []
            if preferences.interested_in_mindfulness:
                mindfulness = format_with_timestamp("Mindfulness", "interested_in_mindfulness", preferences)
                wellness_interests.append(mindfulness)
            if preferences.interested_in_meditation:
                meditation = format_with_timestamp("Meditation", "interested_in_meditation", preferences)
                wellness_interests.append(meditation)
            
            if wellness_interests:
                context_parts.append(f"Wellness Interests: {', '.join(wellness_interests)}")
            
            # Sleep and nutrition
            if preferences.typical_bedtime:
                bedtime = format_with_timestamp(preferences.typical_bedtime.strftime('%H:%M'), "typical_bedtime", preferences)
                context_parts.append(f"Typical Bedtime: {bedtime}")
            
            if preferences.typical_wake_time:
                wake_time = format_with_timestamp(preferences.typical_wake_time.strftime('%H:%M'), "typical_wake_time", preferences)
                context_parts.append(f"Typical Wake Time: {wake_time}")
            
            if preferences.sleep_quality_rating:
                sleep_quality = format_with_timestamp(f"{preferences.sleep_quality_rating}/10", "sleep_quality_rating", preferences)
                context_parts.append(f"Sleep Quality Rating: {sleep_quality}")
            
            if preferences.diet_type:
                diet = format_with_timestamp(preferences.diet_type.replace('_', ' ').title(), "diet_type", preferences)
                context_parts.append(f"Diet Type: {diet}")
            
            if preferences.food_allergies:
                allergies = format_with_timestamp(preferences.food_allergies, "food_allergies", preferences)
                context_parts.append(f"Food Allergies/Restrictions: {allergies}")
            
            if preferences.water_intake_goal_liters:
                water_goal = format_with_timestamp(f"{preferences.water_intake_goal_liters}L", "water_intake_goal_liters", preferences)
                context_parts.append(f"Daily Water Goal: {water_goal}")
            
            # Technology and notifications
            if preferences.tech_comfort_level:
                tech_comfort = format_with_timestamp(preferences.tech_comfort_level.replace('_', ' ').title(), "tech_comfort_level", preferences)
                context_parts.append(f"Tech Comfort: {tech_comfort}")
            
            if preferences.notification_frequency:
                notif_freq = format_with_timestamp(preferences.notification_frequency.replace('_', ' ').title(), "notification_frequency", preferences)
                context_parts.append(f"Notification Frequency: {notif_freq}")
            
            if preferences.notification_time_preference:
                notif_time = format_with_timestamp(preferences.notification_time_preference.title(), "notification_time_preference", preferences)
                context_parts.append(f"Preferred Notification Time: {notif_time}")
            
            # Personality and motivation
            if preferences.personality_type:
                personality = format_with_timestamp(preferences.personality_type.title(), "personality_type", preferences)
                context_parts.append(f"Personality Type: {personality}")
            
            if preferences.motivation_type:
                motivation = format_with_timestamp(preferences.motivation_type.replace('_', ' ').title(), "motivation_type", preferences)
                context_parts.append(f"Motivation Type: {motivation}")
            
            goal_preferences = []
            if preferences.prefers_short_term_goals:
                short_term = format_with_timestamp("Short-term", "prefers_short_term_goals", preferences)
                goal_preferences.append(short_term)
            if preferences.prefers_long_term_goals:
                long_term = format_with_timestamp("Long-term", "prefers_long_term_goals", preferences)
                goal_preferences.append(long_term)
            
            if goal_preferences:
                context_parts.append(f"Goal Preferences: {', '.join(goal_preferences)} goals")
            
            if preferences.goal_reminder_enabled is not None:
                goal_reminder = "enabled" if preferences.goal_reminder_enabled else "disabled"
                goal_reminders = format_with_timestamp(goal_reminder, "goal_reminder_enabled", preferences)
                context_parts.append(f"Goal Reminders: {goal_reminders}")
            
            # Emergency contact
            if preferences.emergency_contact_name:
                contact_info = preferences.emergency_contact_name
                if preferences.emergency_contact_relationship:
                    contact_info += f" ({preferences.emergency_contact_relationship})"
                if preferences.emergency_contact_phone:
                    contact_info += f" - {preferences.emergency_contact_phone}"
                emergency_contact = format_with_timestamp(contact_info, "emergency_contact_name", preferences)
                context_parts.append(f"Emergency Contact: {emergency_contact}")
            
            # Add computed health insights
            health_risk_factors = preferences.get_health_risk_factors()
            if health_risk_factors:
                context_parts.append(f"Health Risk Factors: {', '.join(health_risk_factors)}")
            
            recommended_exercise = preferences.get_recommended_exercise_duration()
            if recommended_exercise:
                context_parts.append(f"Recommended Weekly Exercise: {recommended_exercise} minutes")
            
            if preferences.is_high_risk_user():
                context_parts.append("Health Status: High-risk user - requires special attention")
            
            # Add last update information
            if preferences.updated_at:
                update_text = f"Preferences Last Updated: {preferences.updated_at.strftime('%Y-%m-%d %H:%M')}"
                context_parts.append(update_text)
                
                # For question nudges, add additional context about preference completeness
                if is_question:
                    import datetime
                    now = datetime.datetime.now()
                    days_since_update = (now - preferences.updated_at.replace(tzinfo=None)).days
                    
                    context_parts.append(f"Days Since Last Update: {days_since_update}")
                    context_parts.append("Note: Individual field timestamps shown above indicate when each preference was last updated")
                    
                    # Check for missing preference information
                    missing_prefs = []
                    if not preferences.activity_level:
                        last_updated = getattr(preferences, 'activity_level_updated_at', None)
                        timestamp_info = f" (last updated: {last_updated.strftime('%Y-%m-%d %H:%M')})" if last_updated else " (never updated)"
                        missing_prefs.append(f"Activity Level{timestamp_info}")
                    if not preferences.social_preference:
                        last_updated = getattr(preferences, 'social_preference_updated_at', None)
                        timestamp_info = f" (last updated: {last_updated.strftime('%Y-%m-%d %H:%M')})" if last_updated else " (never updated)"
                        missing_prefs.append(f"Social Preference{timestamp_info}")
                    if not preferences.stress_level:
                        last_updated = getattr(preferences, 'stress_level_updated_at', None)
                        timestamp_info = f" (last updated: {last_updated.strftime('%Y-%m-%d %H:%M')})" if last_updated else " (never updated)"
                        missing_prefs.append(f"Stress Level{timestamp_info}")
                    if not preferences.sleep_quality_rating:
                        last_updated = getattr(preferences, 'sleep_quality_rating_updated_at', None)
                        timestamp_info = f" (last updated: {last_updated.strftime('%Y-%m-%d %H:%M')})" if last_updated else " (never updated)"
                        missing_prefs.append(f"Sleep Quality{timestamp_info}")
                    if not preferences.diet_type:
                        last_updated = getattr(preferences, 'diet_type_updated_at', None)
                        timestamp_info = f" (last updated: {last_updated.strftime('%Y-%m-%d %H:%M')})" if last_updated else " (never updated)"
                        missing_prefs.append(f"Diet Type{timestamp_info}")
                    
                    if missing_prefs:
                        context_parts.append(f"Missing Preferences: {', '.join(missing_prefs)}")
                    else:
                        context_parts.append("All Core Preferences: Completed")
            
            return "\n".join(context_parts) if context_parts else ""
            
        except Exception as e:
            print("Error retrieving user preferences", e)
            return ""

    def _store_conversation_context(self, pending_tool_requests, prompt_messages, conversation, user_id, tool_calls=None):
        """
        Store conversation context in tool requests for later resumption.
        
        Args:
            pending_tool_requests: List of pending tool request dicts
            prompt_messages: Current conversation messages
            conversation: Conversation object (unused but kept for future use)
            user_id: User ID (unused but kept for future use)
            tool_calls: Original tool calls from the AI
        """
        # Note: conversation and user_id are kept for potential future use
        
        # Serialize prompt messages for storage
        serialized_messages = []
        for msg in prompt_messages:
            if hasattr(msg, 'content'):
                msg_dict = {
                    'type': type(msg).__name__,
                    'content': msg.content
                }
                # Store tool calls if this is an AI message with tools
                if hasattr(msg, 'tool_calls') and msg.tool_calls:
                    msg_dict['tool_calls'] = msg.tool_calls
                serialized_messages.append(msg_dict)
            elif isinstance(msg, tuple):
                serialized_messages.append({
                    'type': 'tuple',
                    'role': msg[0],
                    'content': msg[1]
                })
        
        context = {
            'prompt_messages': serialized_messages,
            'pending_tool_requests': pending_tool_requests,
            'original_tool_calls': tool_calls if tool_calls else []
        }
        
        # Update each tool request with the context
        for req in pending_tool_requests:
            if 'request_id' in req:
                try:
                    tool_request = ToolRequest.objects.get(id=req['request_id'])
                    tool_request.conversation_context = context
                    tool_request.save()
                except ToolRequest.DoesNotExist:
                    pass
    
    def resume_after_tool_completion(self, tool_request: ToolRequest, system_prompt: str = None):
        """
        Resume conversation after a client tool has been completed.
        
        Args:
            tool_request: The completed ToolRequest object
            system_prompt: Optional system prompt override (unused but kept for future use)
            
        Returns:
            Final AI response after processing the tool result
        """
        from langchain_core.messages import ToolMessage, HumanMessage, AIMessage, SystemMessage
        import json
        
        # Note: system_prompt parameter kept for potential future customization
        
        # Get conversation and user info
        conversation = tool_request.conversation
        user = tool_request.user
        user_id = str(user.id) if user else None
        session_id = conversation.session_id if conversation else None
        
        # Reconstruct the conversation context
        if not tool_request.conversation_context:
            return {
                'error': 'No conversation context found for this tool request',
                'type': 'error'
            }
        
        context = tool_request.conversation_context
        serialized_messages = context.get('prompt_messages', [])
        pending_tool_requests = context.get('pending_tool_requests', [])
        original_tool_calls = context.get('original_tool_calls', [])
        
        # Reconstruct the prompt messages
        prompt_messages = []
        for msg in serialized_messages:
            if msg['type'] == 'tuple':
                prompt_messages.append((msg['role'], msg['content']))
            elif msg['type'] == 'HumanMessage':
                prompt_messages.append(HumanMessage(content=msg['content']))
            elif msg['type'] == 'AIMessage':
                ai_msg = AIMessage(content=msg['content'])
                if 'tool_calls' in msg:
                    ai_msg.tool_calls = msg['tool_calls']
                prompt_messages.append(ai_msg)
            elif msg['type'] == 'SystemMessage':
                prompt_messages.append(SystemMessage(content=msg['content']))
            elif msg['type'] == 'ToolMessage':
                prompt_messages.append(ToolMessage(
                    content=msg['content'],
                    tool_call_id=msg.get('tool_call_id', 'unknown')
                ))
        
        # Add the tool result
        tool_result = tool_request.result if tool_request.status == 'completed' else {
            'error': tool_request.error_message or 'Tool execution failed'
        }
        
        # Find the matching tool call ID
        tool_call_id = None
        for req in pending_tool_requests:
            if req.get('request_id') == tool_request.id:
                tool_call_id = req.get('tool_call_id')
                req['completed'] = True
                req['result'] = tool_result
                break
        
        # Add tool result message with the correct tool_call_id
        if tool_call_id:
            prompt_messages.append(
                ToolMessage(
                    content=json.dumps(tool_result),
                    tool_call_id=tool_call_id
                )
            )
        
        # Check if all pending tools are completed
        all_completed = all(req.get('completed', False) for req in pending_tool_requests)
        
        if all_completed:
            # Continue conversation with LLM
            config = self._create_llm_config(user_id, session_id)
            
            # Continue from where we left off
            return self._process_conversation(
                prompt_messages, 
                config, 
                conversation=conversation, 
                user_id=user_id
            )
        else:
            # Still waiting for other tools - update context
            updated_context = {
                'prompt_messages': self._serialize_messages(prompt_messages),
                'pending_tool_requests': pending_tool_requests,
                'original_tool_calls': original_tool_calls
            }
            
            # Update all pending tool requests with new context
            for req in pending_tool_requests:
                if 'request_id' in req and not req.get('completed'):
                    try:
                        other_tool_request = ToolRequest.objects.get(id=req['request_id'])
                        other_tool_request.conversation_context = updated_context
                        other_tool_request.save()
                    except ToolRequest.DoesNotExist:
                        pass
            
            return {
                'content': 'Tool result received, waiting for other pending tools...',
                'all_tools_completed': False,
                'pending_count': sum(1 for req in pending_tool_requests if not req.get('completed', False)),
                'type': 'partial_response'
            }
    
    def _serialize_messages(self, prompt_messages):
        """Helper to serialize messages for storage"""
        serialized = []
        for msg in prompt_messages:
            if hasattr(msg, 'content'):
                msg_dict = {
                    'type': type(msg).__name__,
                    'content': msg.content
                }
                if hasattr(msg, 'tool_calls') and msg.tool_calls:
                    msg_dict['tool_calls'] = msg.tool_calls
                if hasattr(msg, 'tool_call_id'):
                    msg_dict['tool_call_id'] = msg.tool_call_id
                serialized.append(msg_dict)
            elif isinstance(msg, tuple):
                serialized.append({
                    'type': 'tuple',
                    'role': msg[0],
                    'content': msg[1]
                })
        return serialized
    
    def _format_long_term_memory(self, long_term_messages, is_nudge: bool = False):
        """
        Format long-term memory messages into a single context string.
        
        Args:
            long_term_messages: List of RAG-retrieved relevant messages and document chunks
            is_nudge: Whether this is for nudge generation (affects formatting)
            
        Returns:
            Formatted string containing all long-term memory context
        """
        if not long_term_messages:
            return ""
        
        context_parts = []
        for i, msg in enumerate(long_term_messages, 1):
            content = msg['content'].strip()
            similarity_score = msg.get('similarity_score', 0)
            memory_type = msg.get('memory_type', 'long_term')
            msg_type = msg.get('type', '')
            
            # Handle different types of content
            if msg_type == 'summary':
                role = 'Conversation Summary'
                session_id = msg.get('session_id', '')
                if is_nudge:
                    context_parts.append(f"[{i}] {role} (Session {session_id}): {content}")
                else:
                    context_parts.append(f"[{i}] {role} (Session {session_id}): {content} (relevance: {similarity_score:.2f})")
            elif msg.get('role') == 'Document' or memory_type == 'document':
                role = 'Document'
                # For documents, the content already includes the document name
                if is_nudge:
                    context_parts.append(f"[{i}] {role}: {content}")
                else:
                    context_parts.append(f"[{i}] {role}: {content} (relevance: {similarity_score:.2f})")
            else:
                # Regular conversation messages
                role = msg.get('role', 'unknown').title()
                if is_nudge:
                    # Simpler format for nudges without relevance scores
                    context_parts.append(f"[{i}] {role}: {content}")
                else:
                    context_parts.append(f"[{i}] {role}: {content} (relevance: {similarity_score:.2f})")
        
        return "\n".join(context_parts)

    def _get_short_term_memory(self, user_id: str = None, session_id: str = None, limit: int = 10):
        """
        Retrieve the 10 most recent messages from the conversation (short-term memory).
        
        Args:
            user_id: User identifier for filtering
            session_id: Session identifier for filtering  
            limit: Number of recent messages to retrieve (default 10)
            
        Returns:
            List of recent messages in chronological order
        """
        if not user_id:
            return []
            
        try:
            user_id_int = int(user_id)
            
            # Get recent messages from the database
            recent_messages = Message.objects.filter(
                conversation__user_id=user_id_int,
                conversation__session_id=session_id
            ).order_by('-timestamp')[:limit]
            
            # Convert to the expected format and reverse to get chronological order
            formatted_messages = []
            for msg in reversed(recent_messages):
                formatted_messages.append({
                    'role': msg.role,
                    'content': msg.content,
                    'timestamp': msg.timestamp,
                    'memory_type': 'short_term'
                })
                
            return formatted_messages
            
        except (ValueError, TypeError):
            return []


    def _get_relevant_documents(self, user_prompt: str, user_id: str, limit: int = 5):
        """
        Retrieve relevant document chunks from ChromaDB based on the user prompt.
        
        Args:
            user_prompt: The current user prompt to find relevant documents for
            user_id: User identifier for filtering (ensures data isolation)
            limit: Maximum number of relevant document chunks to retrieve
            
        Returns:
            List of relevant document chunks formatted as memory messages
        """
        try:
            # Only search if user has uploaded documents
            user_id_int = int(user_id)
            if not Document.objects.filter(user_id=user_id_int).exists():
                return []
            
            # Search through user's documents using ChromaDB
            document_service = DocumentService()
            search_results = document_service.search_user_documents(
                user_id=user_id_int,
                query=user_prompt,
                n_results=limit
            )
            
            document_context = []
            results = search_results.get('results', {})
            
            # Extract document chunks and format them as memory messages
            if 'documents' in results and results['documents']:
                documents = results['documents'][0] if results['documents'] else []
                distances = results.get('distances', [[]])[0] if results.get('distances') else []
                metadatas = results.get('metadatas', [[]])[0] if results.get('metadatas') else []
                
                for i, (doc_chunk, metadata) in enumerate(zip(documents, metadatas)):
                    # Convert distance to similarity score (lower distance = higher similarity)
                    distance = distances[i] if i < len(distances) else 2.0
                    # For ChromaDB, distances are typically 0-2, so we normalize differently
                    similarity_score = max(0.0, 1.0 - (distance / 2.0))  # Normalize distance to 0-1 similarity
                    
                    # Format as a memory message compatible with conversation history
                    document_message = {
                        'role': 'document',
                        'content': f"From PDF '{metadata.get('document_name', 'Unknown')}': {doc_chunk}",
                        'similarity_score': similarity_score,
                        'memory_type': 'document',
                        'document_name': metadata.get('document_name', 'Unknown'),
                        'chunk_index': metadata.get('chunk_index', 0),
                        'source': 'pdf_documents'
                    }
                    
                    document_context.append(document_message)
            
            return document_context
            
        except Exception:
            # Silently fail document retrieval to not break the conversation
            return []
    
    def _get_relevant_global_documents(self, user_prompt: str, limit: int = 5):
        """
        Retrieve relevant global document chunks from ChromaDB based on the user prompt.
        
        Args:
            user_prompt: The current user prompt to find relevant documents for
            limit: Maximum number of relevant document chunks to retrieve
            
        Returns:
            List of relevant global document chunks formatted as memory messages
        """
        try:
            # Search through global documents using ChromaDB
            document_service = DocumentService()
            search_results = document_service.search_global_documents(
                query=user_prompt,
                n_results=limit
            )
            
            document_context = []
            results = search_results.get('results', {})
            
            # Extract document chunks and format them as memory messages
            if 'documents' in results and results['documents']:
                documents = results['documents'][0] if results['documents'] else []
                distances = results.get('distances', [[]])[0] if results.get('distances') else []
                metadatas = results.get('metadatas', [[]])[0] if results.get('metadatas') else []
                
                for i, (doc_chunk, metadata) in enumerate(zip(documents, metadatas)):
                    # Convert distance to similarity score (lower distance = higher similarity)
                    distance = distances[i] if i < len(distances) else 2.0
                    # For ChromaDB, distances are typically 0-2, so we normalize differently
                    similarity_score = max(0.0, 1.0 - (distance / 2.0))  # Normalize distance to 0-1 similarity
                    
                    # Format as a memory message compatible with conversation history
                    document_message = {
                        'role': 'document',
                        'content': f"From health guide '{metadata.get('document_name', 'Unknown')}': {doc_chunk}",
                        'similarity_score': similarity_score,
                        'memory_type': 'global_document',
                        'document_name': metadata.get('document_name', 'Unknown'),
                        'chunk_index': metadata.get('chunk_index', 0),
                        'source': 'global_health_documents'
                    }
                    
                    document_context.append(document_message)
            
            return document_context
            
        except Exception:
            # Silently fail document retrieval to not break the conversation
            return []


class GeminiService(BaseAIService):
    """Service for interacting with the Gemini AI model."""

    def __init__(self):
        model_name = AVAILABLE_MODELS["gemini"]
        llm = ChatGoogleGenerativeAI(model=model_name)
        super().__init__(llm_instance=llm)


class OpenAIService(BaseAIService):
    """Service for interacting with the OpenAI model."""

    def __init__(self):
        model_name = AVAILABLE_MODELS["openai"]
        llm = ChatOpenAI(model=model_name, temperature=0.7)
        super().__init__(llm_instance=llm)


class ClaudeService(BaseAIService):
    """Service for interacting with the Claude AI model."""

    def __init__(self):
        model_name = AVAILABLE_MODELS["claude"]
        llm = ChatAnthropic(model=model_name)
        super().__init__(llm_instance=llm)

# Service mapping for easy retrieval
SERVICE_MAPPING = {
    "gemini": GeminiService,
    "openai": OpenAIService,
    "claude": ClaudeService,
}

# Factory function to get the appropriate AI service based on the model name
def get_ai_service(service_name: str) -> BaseAIService:
    """
    Factory function to return the appropriate AI service instance based on the service name.
    """

    service_class = SERVICE_MAPPING.get(service_name)
    if not service_class:
        raise ValueError(f"No service found for model {service_name}.")

    return service_class()