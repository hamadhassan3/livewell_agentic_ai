import { create } from 'zustand';
import { chatService } from '@/api/chatService';

interface BubbleMessagesState {
	messages: string[];
	isLoading: boolean;
	hasFetched: boolean; // Track if we've ever fetched messages
	setMessages: (messages: string[]) => void;
	clearMessages: () => void;
	fetchMessagesIfNeeded: () => Promise<void>;
	refreshMessages: () => Promise<void>; // Force refresh after sending chat message
}

export const useBubbleMessagesStore = create<BubbleMessagesState>((set, get) => ({
	messages: [],
	isLoading: false,
	hasFetched: false,
	
	setMessages: (messages: string[]) => {
		set({ messages, hasFetched: true });
	},
	
	clearMessages: () => {
		set({ messages: [], hasFetched: false });
	},
	
	fetchMessagesIfNeeded: async () => {
		const { hasFetched, isLoading } = get();
		
		// Don't fetch if we already have messages or if we're currently loading
		if (hasFetched || isLoading) {
			return;
		}
		
		set({ isLoading: true });
		
		try {
			const bubbles = await chatService.getBubbleMessages();
			set({ messages: bubbles, hasFetched: true, isLoading: false });
		} catch (error) {
			console.error('Failed to fetch bubble messages:', error);
			// Set fallback bubble messages
			set({ 
				messages: [
					"Check today's weather",
					"Track your medications", 
					"Find local events"
				], 
				hasFetched: true,
				isLoading: false 
			});
		}
	},
	
	refreshMessages: async () => {
		set({ isLoading: true });
		
		try {
			const bubbles = await chatService.getBubbleMessages();
			set({ messages: bubbles, hasFetched: true, isLoading: false });
		} catch (error) {
			console.error('Failed to refresh bubble messages:', error);
			// Set fallback bubble messages
			set({ 
				messages: [
					"Check today's weather",
					"Track your medications",
					"Find local events"
				], 
				hasFetched: true,
				isLoading: false 
			});
		}
	},
}));