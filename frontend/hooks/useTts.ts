// hooks/useTts.ts
import { ttsService } from '@/services';
import { create } from 'zustand';

interface TtsState {
	speakingMessageId: string | null;
	isSpeaking: boolean;
	speak: (messageId: string, text: string) => void;
	stop: () => void;
}

export const useTtsStore = create<TtsState>((set, get) => ({
	speakingMessageId: null,
	isSpeaking: false,

	speak: async (messageId: string, text: string) => {
		const { isSpeaking, speakingMessageId, stop } = get();

		if (isSpeaking && speakingMessageId === messageId) {
			stop();
		} else {
			// Stop any currently playing speech before starting a new one
			if (isSpeaking) {
				stop();
			}
			set({ isSpeaking: true, speakingMessageId: messageId });
			// The onDone callback will reset the state when speech finishes
			await ttsService.speak(text, { onDone: () => get().stop() });
		}
	},

	stop: () => {
		ttsService.stop();
		set({ isSpeaking: false, speakingMessageId: null });
	},
}));