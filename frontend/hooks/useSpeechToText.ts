// hooks/useSpeechToText.ts
import { speechRecognitionService } from '@/services/speechRecognitionService';
import { useCallback, useState } from 'react';

export const useSpeechToText = () => {
	const [isRecording, setIsRecording] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [interimTranscript, setInterimTranscript] = useState<string>('');

	const startRecording = useCallback(async () => {
		try {
			setError(null);
			setInterimTranscript('');

			// Use native speech recognition for both web and native
			if (!speechRecognitionService.isSupported()) {
				throw new Error(
					'Speech recognition is not supported on this device/browser.'
				);
			}

			await speechRecognitionService.startRecording(
				(transcript) => {
					// Update interim transcript as user speaks
					setInterimTranscript(transcript);
				},
				(errorMsg) => {
					setError(errorMsg);
					setIsRecording(false);
				}
			);
			setIsRecording(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to start recording.');
			setIsRecording(false);
		}
	}, []);

	const stopRecording = useCallback(async (): Promise<string | null> => {
		if (!isRecording) return null;

		try {
			// Stop speech recognition and get final transcript
			const transcribedText = await speechRecognitionService.stopRecording();
			setInterimTranscript('');
			setIsRecording(false);
			return transcribedText;
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to process audio.'
			);
			setIsRecording(false);
			setInterimTranscript('');
			return null;
		}
	}, [isRecording]);

	const cancelRecording = useCallback(() => {
		speechRecognitionService.abort();
		setIsRecording(false);
		setInterimTranscript('');
		setError(null);
	}, []);

	return {
		isRecording,
		sttError: error,
		interimTranscript,
		startRecording,
		stopRecording,
		cancelRecording,
	};
};
