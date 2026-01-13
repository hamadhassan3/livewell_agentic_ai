// api/chatService.ts
import { OPENAI_WHISPER_API_URL } from '@/constants/common';
import { ChatMessageResponse } from '@/hooks/useChat';
import { getToolExecutor, ToolRequest } from '@/src/services/tools';
import apiClient from './apiClient';

export type MessageFeedback = 'like' | 'dislike' | 'love';

export interface ChatMessage {
	id?: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp?: string;
	feedback?: MessageFeedback;
}

export interface ChatRequest {
	prompt: string;
}

export interface ChatResponse {
	id: string;
	response: string;
	tool_requests?: ToolRequest[];
}

export interface TranscribeResponse {
	text: string;
}

export interface ConversationHistoryResponse {
	conversations: {
		session_id: string;
		session_type: string;
		created_at: string;
		updated_at: string;
		message_count: number;
		messages: ChatMessage[];
		summary?: string;
	}[];
}

export interface ApiError {
	message: string;
	code?: string;
	status?: number;
}

export interface BubbleMessagesResponse {
	messages: string[];
	count: number;
	is_fallback?: boolean;
}

class ChatService {
	/**
	 * Send a message to the chat API
	 */
	async sendMessage(prompt: string): Promise<ChatMessageResponse> {
		try {
			const response = await apiClient.post<ChatResponse>('/agent/chat/', {
				prompt,
			});
			
			// Check if there are tool requests to execute
			if (response.data.tool_requests && response.data.tool_requests.length > 0) {
				const toolExecutor = getToolExecutor();
				const toolResults = await toolExecutor.executeToolRequests(response.data.tool_requests);
				
				// Get the final response from the last tool response
				const lastResult = toolResults[toolResults.length - 1];
				
				// If we have an AI response and all tools are completed, use that as the final message
				if (lastResult?.ai_response && lastResult.all_tools_completed !== false) {
					return lastResult.ai_response;
				}
				
				// If there's an error, throw it
				if (lastResult?.error) {
					throw new Error(lastResult.error);
				}
				
				// Fallback if no AI response
				return {id:'', response: 'Tools executed successfully.'};
			}
			return { id: response.data.id, response: response.data.response };
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Transcribe audio using the OpenAI Whisper API directly
	 */
	async transcribeAudio(audioUri: string): Promise<string> {
		const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
		if (!apiKey) {
			const errorMessage =
				'OpenAI API key is not configured. Please set EXPO_PUBLIC_OPENAI_API_KEY in your .env file.';
			console.error(errorMessage);
			// Throwing an error here will be caught by the handleApiError in the catch block
			throw new Error(errorMessage);
		}

		try {
			const formData = new FormData();

			// The file object needs to be compatible with what `fetch` expects for `multipart/form-data`.
			// The structure `{ uri, name, type }` is common in React Native.
			formData.append('file', {
				uri: audioUri,
				name: `recording.m4a`,
				type: 'audio/m4a',
			} as any);
			formData.append('model', 'whisper-1');

			const response = await fetch(OPENAI_WHISPER_API_URL, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					// 'Content-Type': 'multipart/form-data' is set automatically by fetch when using FormData
				},
				body: formData,
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error?.message || 'Failed to transcribe audio with OpenAI.');
			}

			return data.text;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Get conversation history for the current chat session only
	 */
	async getConversationHistory(): Promise<ChatMessage[]> {
		try {
			const response = await apiClient.get<{messages: ChatMessage[]}>(
				'/agent/current-chat-history/'
			);
			// Messages are already sorted by timestamp from the backend
			return response.data.messages;
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Create a new conversation session
	 * Note: This is handled automatically by the backend chat endpoint
	 */
	async createConversation(): Promise<string> {
		// Backend creates conversations automatically
		// Return a timestamp-based session ID for local tracking
		return `session_${Date.now()}`;
	}

	/**
	 * Clear conversation history
	 * Note: This would require a backend endpoint to delete conversation
	 */
	async clearConversation(): Promise<void> {
		try {
			// TODO: Implement when backend adds conversation deletion endpoint
			// await apiClient.delete('/agent/conversation/clear/');
			console.log('Clearing conversation (not implemented in backend yet)');
		} catch (error: any) {
			throw this.handleApiError(error);
		}
	}

	/**
	 * Get bubble messages after a chat interaction
	 */
	async getBubbleMessages(conversationId?: string): Promise<string[]> {
		try {
			const params = conversationId ? { conversation_id: conversationId } : {};
			const response = await apiClient.get<BubbleMessagesResponse>(
				'/agent/bubble/after-chat/',
				{ params }
			);
			return response.data.messages;
		} catch (error: any) {
			console.error('Failed to get bubble messages:', error);
			// Return fallback messages on error
			return [
				"Check today's weather for outdoor activities",
				"Track your medication schedule",
				"Find local senior events near you"
			];
		}
	}

	/**
	 * Generate custom bubble messages with context
	 */
	async generateBubbleMessages(
		numMessages: number = 4,
		lastMessage?: string,
		toolUsed?: string
	): Promise<string[]> {
		try {
			const response = await apiClient.post<BubbleMessagesResponse>(
				'/agent/bubble/generate/',
				{
					num_messages: numMessages,
					last_message: lastMessage,
					tool_used: toolUsed
				}
			);
			return response.data.messages;
		} catch (error: any) {
			console.error('Failed to generate bubble messages:', error);
			// Return fallback messages on error
			return [
				"Check today's weather for outdoor activities",
				"Track your medication schedule",
				"Find local senior events near you"
			].slice(0, numMessages);
		}
	}

	/**
	 * Centralized error handling for API calls
	 */
	private handleApiError(error: any): ApiError {
		if (error.response) {
			// Server responded with error status
			return {
				message:
					error.response.data?.error ||
					error.response.data?.detail ||
					'An error occurred',
				code: error.response.data?.code,
				status: error.response.status,
			};
		} else if (error.request) {
			// Network error
			return {
				message: 'Network error. Please check your connection.',
				code: 'NETWORK_ERROR',
			};
		} else {
			// Other error
			return {
				message: error.message || 'An unexpected error occurred',
				code: 'UNKNOWN_ERROR',
			};
		}
	}

	async sendFeedback(messageId: string, feedback: MessageFeedback): Promise<void> {
		try {
			await apiClient.post('/agent/chat/feedback/', {
				message_id: messageId,
				feedback: feedback,
			});
			console.log(`Feedback '${feedback}' sent for message ${messageId}`);
		} catch (error) {
			console.error('Failed to send chat feedback:', error);
			throw new Error('Could not submit feedback.');
		}
	}
}

// Export singleton instance
export const chatService = new ChatService();
