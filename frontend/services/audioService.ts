// services/audioService.ts
import { Audio } from 'expo-av';

class AudioService {
	private recording: Audio.Recording | null = null;

	async requestPermissions(): Promise<boolean> {
		const response = await Audio.requestPermissionsAsync();
		return response.status === 'granted';
	}

	async startRecording(): Promise<void> {
		try {
			const hasPermission = await this.requestPermissions();
			if (!hasPermission) {
				throw new Error('Microphone permission is not granted.');
			}

			await Audio.setAudioModeAsync({
				allowsRecordingIOS: true,
				playsInSilentModeIOS: true,
			});

			const { recording } = await Audio.Recording.createAsync(
				Audio.RecordingOptionsPresets.HIGH_QUALITY
			);
			this.recording = recording;
		} catch (err) {
			console.error('Failed to start recording', err);
			throw new Error('Could not start recording.');
		}
	}

	async stopRecording(): Promise<string | null> {
		if (!this.recording) {
			return null;
		}

		try {
			await this.recording.stopAndUnloadAsync();
			await Audio.setAudioModeAsync({
				allowsRecordingIOS: false,
			});
			const uri = this.recording.getURI();
			this.recording = null;
			return uri;
		} catch (err) {
			console.error('Failed to stop recording', err);
			throw new Error('Could not stop recording.');
		}
	}
}

export const audioService = new AudioService();