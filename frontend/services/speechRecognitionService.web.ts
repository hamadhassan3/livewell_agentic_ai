// services/speechRecognitionService.web.ts
// Web Speech API implementation for speech-to-text

class SpeechRecognitionService {
	private recognition: SpeechRecognition | null = null;
	private isListening: boolean = false;
	private finalTranscript: string = '';
	private initialized: boolean = false;

	private initializeRecognition(): void {
		if (this.initialized) return;

		this.initialized = true;

		// Check if we're in a browser environment
		if (typeof window === 'undefined') {
			return;
		}

		// Check if browser supports Web Speech API
		const SpeechRecognition =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;

		if (SpeechRecognition) {
			const recognition = new SpeechRecognition();
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.lang = 'en-US';
			recognition.maxAlternatives = 1;
			this.recognition = recognition;
		}
	}

	isSupported(): boolean {
		this.initializeRecognition();
		return this.recognition !== null;
	}

	startRecording(
		onResult?: (transcript: string, isFinal: boolean) => void,
		onError?: (error: string) => void
	): Promise<void> {
		return new Promise((resolve, reject) => {
			this.initializeRecognition();

			if (!this.recognition) {
				const error = 'Speech recognition is not supported in this browser.';
				onError?.(error);
				reject(new Error(error));
				return;
			}

			if (this.isListening) {
				resolve();
				return;
			}

			this.finalTranscript = '';

			this.recognition.onstart = () => {
				this.isListening = true;
				console.log('Speech recognition started');
				resolve();
			};

			this.recognition.onresult = (event: SpeechRecognitionEvent) => {
				let interimTranscript = '';
				let finalTranscript = this.finalTranscript;

				for (let i = event.resultIndex; i < event.results.length; i++) {
					const transcript = event.results[i][0].transcript;
					if (event.results[i].isFinal) {
						finalTranscript += transcript + ' ';
					} else {
						interimTranscript += transcript;
					}
				}

				this.finalTranscript = finalTranscript;

				// Call callback with current transcript
				const currentTranscript = (finalTranscript + interimTranscript).trim();
				onResult?.(currentTranscript, false);
			};

			this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
				console.error('Speech recognition error:', event.error);
				this.isListening = false;

				let errorMessage = 'Speech recognition error occurred.';
				switch (event.error) {
					case 'no-speech':
						errorMessage = 'No speech was detected. Please try again.';
						break;
					case 'audio-capture':
						errorMessage = 'No microphone was found or microphone is not working.';
						break;
					case 'not-allowed':
						errorMessage = 'Microphone permission was denied. Please allow microphone access.';
						break;
					case 'network':
						errorMessage = 'Network error occurred during speech recognition.';
						break;
					case 'aborted':
						errorMessage = 'Speech recognition was aborted.';
						break;
				}

				onError?.(errorMessage);
			};

			this.recognition.onend = () => {
				this.isListening = false;
				console.log('Speech recognition ended');
			};

			try {
				this.recognition.start();
			} catch (err) {
				this.isListening = false;
				const error = 'Failed to start speech recognition.';
				onError?.(error);
				reject(new Error(error));
			}
		});
	}

	stopRecording(): Promise<string> {
		return new Promise((resolve, reject) => {
			if (!this.recognition) {
				reject(new Error('Speech recognition is not initialized.'));
				return;
			}

			if (!this.isListening) {
				resolve(this.finalTranscript.trim());
				return;
			}

			// Set up one-time handler for the end event
			this.recognition.onend = () => {
				this.isListening = false;
				const finalText = this.finalTranscript.trim();
				console.log('Speech recognition stopped. Final transcript:', finalText);
				resolve(finalText);
			};

			try {
				this.recognition.stop();
			} catch (err) {
				reject(new Error('Failed to stop speech recognition.'));
			}
		});
	}

	abort(): void {
		if (this.recognition && this.isListening) {
			this.recognition.abort();
			this.isListening = false;
		}
	}

	getIsListening(): boolean {
		return this.isListening;
	}
}

export const speechRecognitionService = new SpeechRecognitionService();
