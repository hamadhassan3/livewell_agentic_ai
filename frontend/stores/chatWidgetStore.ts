// stores/chatWidgetStore.ts
import { create } from 'zustand';

interface ChatWidgetState {
	isOpen: boolean;
	isMinimized: boolean;
	openWidget: () => void;
	closeWidget: () => void;
	toggleWidget: () => void;
	minimizeWidget: () => void;
}

export const useChatWidgetStore = create<ChatWidgetState>((set) => ({
	isOpen: false,
	isMinimized: false,
	openWidget: () => set({ isOpen: true, isMinimized: false }),
	closeWidget: () => set({ isOpen: false, isMinimized: false }),
	toggleWidget: () => set((state) => ({ isOpen: !state.isOpen, isMinimized: false })),
	minimizeWidget: () => set((state) => ({ isMinimized: !state.isMinimized })),
}));
