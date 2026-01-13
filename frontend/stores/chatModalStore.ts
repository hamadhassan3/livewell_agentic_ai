import { create } from 'zustand';

interface ChatModalState {
    isVisible: boolean;
    openModal: () => void;
    closeModal: () => void;
    toggleModal: () => void;
}

export const useChatModalStore = create<ChatModalState>((set) => ({
    isVisible: false,
    openModal: () => set({ isVisible: true }),
    closeModal: () => set({ isVisible: false }),
    toggleModal: () => set((state) => ({ isVisible: !state.isVisible })),
}));
