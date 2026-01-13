import apiClient from './apiClient';

export interface ConversationMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: string;
}

export interface Conversation {
	session_id: string;
	session_type: 'chat' | 'nudge' | 'question' | 'unknown';
	created_at: string;
	updated_at: string;
	message_count: number;
	messages: ConversationMessage[];
	summary?: string;
}

export interface ConversationHistoryResponse {
	conversations: Conversation[];
}

export interface ApiError {
	message: string;
	code?: string;
	status?: number;
}

class ConversationHistoryService {
	/**
	 * Get all conversation history for the authenticated user
	 */
	async getConversationHistory(): Promise<Conversation[]> {
		try {
			const response = await apiClient.get<ConversationHistoryResponse>(
				'/agent/conversation-history/'
			);
			return response.data.conversations;
		} catch (error: any) {
			throw this.handleApiError(error);
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
}

// Export singleton instance
export const conversationHistoryService = new ConversationHistoryService();