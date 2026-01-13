// hooks/useChat.ts
import { chatService, MessageFeedback } from '@/api/chatService';
import { useBubbleMessagesStore } from '@/stores/bubbleMessagesStore';
import { produce } from 'immer';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from './useAuthStore';

export interface Message {
	id: string;
	text: string;
	isUser: boolean;
	timestamp: Date;
	feedback?: MessageFeedback;
	status?: 'sending' | 'sent' | 'failed';
}

export interface ChatMessageResponse {
	id: string;
	response: string;
}

export interface ChatState {
	messages: Message[];
	isLoading: boolean;
	isBotThinking: boolean;
	error: string | null;
	bubbleMessages: string[];
}

export interface ChatActions {
	sendMessage: (text: string) => Promise<void>;
	clearMessages: () => void;
	clearError: () => void;
	retryMessage: (messageId: string) => Promise<void>;
	sendBubbleMessage: (text: string) => Promise<void>;
	sendFeedback: (messageId: string, feedback: MessageFeedback) => Promise<void>;
}

export interface ExtendedChatState extends ChatState {
	sessionId: string | null;
	isAuthenticated: boolean;
}

export const useChat = (): ExtendedChatState & ChatActions => {
	const { isAuthenticated } = useAuthStore();
	const { 
		messages: bubbleMessages, 
		fetchMessagesIfNeeded, 
		refreshMessages, 
		clearMessages: clearBubbleMessages 
	} = useBubbleMessagesStore();
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [messages, setMessages] = useState<Message[]>([
		{
			id: '1',
			text: 'Hello! How can I help you today?',
			isUser: false,
			timestamp: new Date(),
			status: 'sent',
		},
	]);
	const [isLoading, setIsLoading] = useState(false);
	const [isBotThinking, setIsBotThinking] = useState(false);
	const [error, setError] = useState<string | null>(null);


	// Initialize session and load conversation history when component mounts
	useEffect(() => {
		const initializeChat = async () => {
			try {
				// Create session ID
				const newSessionId = await chatService.createConversation();
				setSessionId(newSessionId);

				// Load conversation history if user is authenticated
				if (isAuthenticated) {
					try {
						const history = await chatService.getConversationHistory();
						if (history && history.length > 0) {
							// Convert backend messages to frontend format
							const formattedMessages: Message[] = history.map(msg => ({
								id: msg.id || `msg_${Date.now()}_${Math.random()}`,
								text: msg.content,
								isUser: msg.role === 'user',
								timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
								status: 'sent',
								feedback: msg.feedback as MessageFeedback | undefined
							}));
							setMessages(formattedMessages);
						}
					} catch (error) {
						console.error('Failed to load conversation history:', error);
						// Keep default welcome message if history loading fails
					}
				}
			} catch (error) {
				console.error('Failed to initialize chat session:', error);
				// Fallback to timestamp-based session ID
				setSessionId(`fallback_${Date.now()}`);
			}
		};

		initializeChat();
	}, [isAuthenticated]);

	// Fetch bubble messages if needed when chat initializes
	useEffect(() => {
		fetchMessagesIfNeeded();
	}, [fetchMessagesIfNeeded]);


	// Real API call to backend
	const callChatAPI = useCallback(
		async (message: string): Promise<ChatMessageResponse> => {
			try {
				const response = await chatService.sendMessage(message);
				return response;
			} catch (error: any) {
				// Handle different types of errors
				if (error.status === 401) {
					throw new Error('Please sign in to continue chatting.');
				} else if (error.status === 429) {
					throw new Error('Too many messages. Please wait a moment before sending another.');
				} else if (error.code === 'NETWORK_ERROR') {
					throw new Error('Network error. Please check your connection and try again.');
				} else {
					throw new Error(error.message || 'Failed to get response. Please try again.');
				}
			}
		},
		[]
	);

	const sendMessage = useCallback(
		async (text: string) => {
			if (!text.trim()) return;

			const userMessage: Message = {
				id: `user_${Date.now()}`,
				text: text.trim(),
				isUser: true,
				timestamp: new Date(),
				status: 'sending',
			};

			// Add user message immediately
			setMessages((prev) => [...prev, userMessage]);
			setError(null);
			setIsLoading(true);
			setIsBotThinking(true);

			try {
				// Update user message status to sent
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
					)
				);

				// Call real chat API
				const response = await callChatAPI(text);

				// Add bot response
				const botMessage: Message = {
					id: response.id,
					text: response.response,
					isUser: false,
					timestamp: new Date(),
					status: 'sent',
				};

				setMessages((prev) => [...prev, botMessage]);
				setIsBotThinking(false);

				// Refresh bubble messages after chat response (always fetch new ones after sending message)
				await refreshMessages();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Something went wrong';
				setError(errorMessage);
				setIsBotThinking(false);

				// Mark user message as failed
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === userMessage.id ? { ...msg, status: 'failed' } : msg
					)
				);
			} finally {
				setIsLoading(false);
			}
		},
		[callChatAPI]
	);

	const retryMessage = useCallback(
		async (messageId: string) => {
			const failedMessage = messages.find(
				(msg) => msg.id === messageId && msg.status === 'failed'
			);
			if (!failedMessage || !failedMessage.isUser) return;

			// Reset message status and retry
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === messageId ? { ...msg, status: 'sending' } : msg
				)
			);

			await sendMessage(failedMessage.text);
		},
		[messages, sendMessage]
	);

	const clearMessages = useCallback(async () => {
		try {
			// Clear conversation on backend
			await chatService.clearConversation();
		} catch (error) {
			console.error('Failed to clear conversation on backend:', error);
			// Continue with local clear even if backend fails
		}

		// Reset local messages and bubble messages
		setMessages([
			{
				id: '1',
				text: 'Hello! How can I help you today?',
				isUser: false,
				timestamp: new Date(),
				status: 'sent',
			},
		]);
		clearBubbleMessages(); // Clear bubble messages so they get refreshed
		setError(null);

		// Create new session
		try {
			const newSessionId = await chatService.createConversation();
			setSessionId(newSessionId);
		} catch (error) {
			console.error('Failed to create new session:', error);
		}
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	const sendBubbleMessage = useCallback(
		async (text: string) => {
			// Clear bubble messages when one is clicked
			clearBubbleMessages();
			// Send the bubble message text as a regular message
			await sendMessage(text);
		},
		[sendMessage, clearBubbleMessages]
	);

	const sendFeedback = useCallback(
		async (messageId: string, feedback: MessageFeedback) => {
			const originalMessages = messages;

			// Optimistically update the UI
			const newMessages = produce(originalMessages, (draft) => {
				const message = draft.find((m) => m.id === messageId);
				if (message) {
					message.feedback = feedback;
				}
			});
			setMessages(newMessages);

			try {
				await chatService.sendFeedback(messageId, feedback);
			} catch (error) {
				console.error('Failed to submit feedback, reverting UI change.');
				// Revert the change if the API call fails
				setMessages(originalMessages);
				throw error; // Re-throw to allow UI to show an error
			}
		},
		[messages]
	);

	return {
		messages,
		isLoading,
		isBotThinking,
		error,
		bubbleMessages,
		sendMessage,
		clearMessages,
		clearError,
		retryMessage,
		sendBubbleMessage,
		sessionId,
		isAuthenticated,
		sendFeedback,
	};
};
