// services/speechRecognitionService.ts
// Native speech recognition implementation using @react-native-voice/voice

let Voice: any = null;
try {
	Voice = require('@react-native-voice/voice').default;
} catch (error) {
	console.warn('@react-native-voice/voice not available:', error);
}

class SpeechRecognitionService {
	private isListening: boolean = false;
	private finalTranscript: string = '';
	private onResultCallback?: (transcript: string, isFinal: boolean) => void;
	private onErrorCallback?: (error: string) => void;
	private voiceAvailable: boolean = false;

	constructor() {
		// Check if Voice is available (not available in Expo Go)
		if (Voice) {
			try {
				// Initialize voice recognition event listeners
				Voice.onSpeechStart = this.onSpeechStart;
				Voice.onSpeechEnd = this.onSpeechEnd;
				Voice.onSpeechResults = this.onSpeechResults;
				Voice.onSpeechPartialResults = this.onSpeechPartialResults;
				Voice.onSpeechError = this.onSpeechError;
				this.voiceAvailable = true;
			} catch (error) {
				console.warn('Failed to initialize Voice:', error);
				this.voiceAvailable = false;
			}
		}
	}

	private onSpeechStart = () => {
		console.log('Native speech recognition started');
		this.isListening = true;
	};

	private onSpeechEnd = () => {
		console.log('Native speech recognition ended');
		this.isListening = false;
	};

	private onSpeechResults = (event: SpeechResultsEvent) => {
		if (event.value && event.value.length > 0) {
			const transcript = event.value[0];
			this.finalTranscript = transcript;
			console.log('Final speech result:', transcript);
			this.onResultCallback?.(transcript, true);
		}
	};

	private onSpeechPartialResults = (event: SpeechResultsEvent) => {
		if (event.value && event.value.length > 0) {
			const transcript = event.value[0];
			console.log('Partial speech result:', transcript);
			this.onResultCallback?.(transcript, false);
		}
	};

	private onSpeechError = (event: SpeechErrorEvent) => {
		console.error('Native speech recognition error:', event.error);
		this.isListening = false;

		let errorMessage = 'Speech recognition error occurred.';
		if (event.error) {
			switch (event.error.code) {
				case '7': // ERROR_NO_MATCH
					errorMessage = 'No speech was detected. Please try again.';
					break;
				case '6': // ERROR_SPEECH_TIMEOUT
					errorMessage = 'Speech timeout. Please try again.';
					break;
				case '5': // ERROR_CLIENT
					errorMessage = 'Client error occurred.';
					break;
				case '9': // ERROR_INSUFFICIENT_PERMISSIONS
					errorMessage =
						'Microphone permission was denied. Please allow microphone access.';
					break;
				case '8': // ERROR_NETWORK
					errorMessage = 'Network error occurred during speech recognition.';
					break;
				default:
					errorMessage = event.error.message || errorMessage;
			}
		}

		this.onErrorCallback?.(errorMessage);
	};

	isSupported(): boolean {
		// Voice recognition requires a development build (not available in Expo Go)
		return this.voiceAvailable;
	}

	async startRecording(
		onResult?: (transcript: string, isFinal: boolean) => void,
		onError?: (error: string) => void
	): Promise<void> {
		try {
			this.onResultCallback = onResult;
			this.onErrorCallback = onError;
			this.finalTranscript = '';

			// Check if Voice module is available
			if (!Voice || !this.voiceAvailable) {
				const error =
					'Native speech recognition is not available. This feature requires a development build or standalone build (not available in Expo Go). Please build the app or use the web version.';
				onError?.(error);
				throw new Error(error);
			}

			// Check if speech recognition is available on device
			const isAvailable = await Voice.isAvailable();
			if (!isAvailable) {
				const error = 'Speech recognition is not available on this device.';
				onError?.(error);
				throw new Error(error);
			}

			// Start speech recognition
			await Voice.start('en-US', {
				EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
				EXTRA_MAX_RESULTS: 1,
				EXTRA_PARTIAL_RESULTS: true,
				REQUEST_PERMISSIONS_AUTO: true,
			});

			this.isListening = true;
		} catch (error) {
			this.isListening = false;
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to start recording.';
			onError?.(errorMessage);
			throw error;
		}
	}

	async stopRecording(): Promise<string> {
		try {
			if (Voice && this.isListening) {
				await Voice.stop();
				this.isListening = false;
			}
			return this.finalTranscript.trim();
		} catch (error) {
			this.isListening = false;
			throw new Error('Failed to stop speech recognition.');
		}
	}

	abort(): void {
		if (Voice && this.isListening) {
			Voice.cancel().catch((error: any) => {
				console.error('Failed to cancel speech recognition:', error);
			});
			this.isListening = false;
		}
	}

	getIsListening(): boolean {
		return this.isListening;
	}

	async destroy(): Promise<void> {
		if (Voice) {
			try {
				await Voice.destroy();
				Voice.removeAllListeners();
			} catch (error) {
				console.error('Failed to destroy voice recognition:', error);
			}
		}
	}
}

export const speechRecognitionService = new SpeechRecognitionService();
