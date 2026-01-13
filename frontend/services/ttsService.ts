// services/ttsService.ts
import * as Speech from 'expo-speech';

interface SpeechOptions {
	onDone?: () => void;
	rate?: number;
	pitch?: number;
}

class TtsService {
	public async speak(text: string, options?: SpeechOptions) {
		// Get available voices
		const voices = await Speech.getAvailableVoicesAsync();
		
		// Find a female voice (look for common female voice names)
		const femaleVoice = voices.find(voice => 
			voice.name.toLowerCase().includes('female') ||
			voice.name.toLowerCase().includes('karen') ||
			voice.name.toLowerCase().includes('victoria') ||
			voice.name.toLowerCase().includes('samantha') ||
			voice.name.toLowerCase().includes('allison') ||
			voice.name.toLowerCase().includes('susan')
		);

		Speech.speak(text, {
			...options,
			// Elderly-friendly settings
			rate: 0.7, // Much slower speech rate for elderly users
			pitch: 0.9, // Lower pitch for warmer, more mature voice
			voice: femaleVoice?.identifier || undefined,
			language: 'en-US',
		});
	}

	public async stop() {
		if (await Speech.isSpeakingAsync()) {
			Speech.stop();
		}
	}
}

export const ttsService = new TtsService();
