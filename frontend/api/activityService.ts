import apiClient from './apiClient';

export interface DailyPedometerDataPayload {
	date: string; // YYYY-MM-DD format
	steps: number;
}

/**
 * Sends daily step count data to the backend.
 * @param data - The pedometer data including the date and step count for that day.
 * @returns A promise that resolves on successful submission.
 */
export const syncPedometerData = async (data: DailyPedometerDataPayload): Promise<void> => {
	try {
		// This endpoint might need to be adjusted based on your actual backend API.
		// Using a more RESTful endpoint name.
		console.log('👟 Pedometer: Syncing data for', data.date, 'with steps:', data.steps);
		await apiClient.post('/tracking/step-counts/', data);
	} catch (error) {
		console.error('Error syncing pedometer data:', error);
		// We throw the error so the calling hook can handle it, e.g., by not updating the last sync time.
		throw new Error('Could not sync pedometer data with the server.');
	}
};