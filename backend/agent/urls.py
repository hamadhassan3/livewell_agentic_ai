from django.urls import path
from .views import AIChatStreamAPIView, ChatMessageFeedbackAPIView, ConversationHistoryAPIView, CurrentChatHistoryAPIView, GenerateNudgeAPIView, NudgeFeedbackAPIView
from .question_views import GenerateQuestionNudgeAPIView, RespondToQuestionNudgeAPIView
from .goal_nudge_views import GenerateGoalNudgeAPIView, RespondToGoalNudgeAPIView
from .bubble_views import GenerateBubbleMessagesAPIView, GetBubbleMessagesAfterChatAPIView

urlpatterns = [
    path('chat/', AIChatStreamAPIView.as_view(), name='chat_stream'),
    path('conversation-history/', ConversationHistoryAPIView.as_view(), name='conversation_history'),
    path('current-chat-history/', CurrentChatHistoryAPIView.as_view(), name='current_chat_history'),
    path('nudge/generate/', GenerateNudgeAPIView.as_view(), name='generate_nudge'),
    path('nudge/feedback/', NudgeFeedbackAPIView.as_view(), name='nudge_feedback'),
    path('nudge/question/generate/', GenerateQuestionNudgeAPIView.as_view(), name='generate_question_nudge'),
    path('nudge/question/respond/', RespondToQuestionNudgeAPIView.as_view(), name='respond_to_question_nudge'),
    path('nudge/goal/generate/', GenerateGoalNudgeAPIView.as_view(), name='generate_goal_nudge'),
    path('nudge/goal/respond/', RespondToGoalNudgeAPIView.as_view(), name='respond_to_goal_nudge'),
    path('bubble/generate/', GenerateBubbleMessagesAPIView.as_view(), name='generate_bubble_messages'),
    path('bubble/after-chat/', GetBubbleMessagesAfterChatAPIView.as_view(), name='get_bubble_messages_after_chat'),
    path('chat/feedback/', ChatMessageFeedbackAPIView.as_view(), name='chat_feedback'),
]
