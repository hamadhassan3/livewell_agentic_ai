import { Event, TrackedEvent, TrackedEventPayload } from '../types/eventTypes';
import apiClient from './apiClient';
/**
 * Fetches nearby events from your backend, which in turn calls SerpAPI.
 * @param query - The search query for events (e.g., "concerts").
 * @param location - The location to search for events in (e.g., "Austin, Texas").
 * @returns A promise that resolves to an array of events.
 */
export const getNearbyEvents = async (
	query: string,
	location: string
): Promise<Omit<Event, 'id'>[]> => {
	try {
		console.log(`Fetching events for query: "${query}" near "${location}"`);
		const response = await apiClient.get('/tracking/search-events/', {
			params: {
				query,
				location,
			},
		});
		return response.data || [];
	} catch (error) {
		console.error('Error fetching nearby events:', error);
		return [];
	}
};

/**
 * Posts a new event to be tracked by the user.
 * @param eventData The event data to track.
 * @returns A promise that resolves when the event is successfully posted.
 */
export const trackEvent = async (eventData: TrackedEventPayload): Promise<TrackedEvent> => {
	try {
		console.log('Tracking event:', eventData.title);
		const response = await apiClient.post<TrackedEvent>('/tracking/events/', eventData);
		return response.data;
	} catch (error) {
		console.error('Error tracking event:', error);
		throw new Error('Could not track the event.');
	}
};

/**
 * Fetches all events tracked by the user.
 * @returns A promise that resolves to an array of tracked events.
 */
export const getTrackedEvents = async (): Promise<TrackedEvent[]> => {
	try {
		console.log('Fetching tracked events...');
		const response = await apiClient.get('/tracking/events/');
		return response.data || [];
	} catch (error) {
		console.error('Error fetching tracked events:', error);
		return []; // Return empty array on error to prevent UI crashes
	}
};

/**
 * Cancels the tracking of an event for the user.
 * @param eventId The ID of the tracked event to cancel.
 * @returns A promise that resolves when the cancellation is successful.
 */
export const cancelTrackedEvent = async (eventId: string): Promise<void> => {
	try {
		console.log(`Cancelling tracking for event ID: ${eventId}`);
		await apiClient.delete(`/tracking/events/${eventId}/`);
	} catch (error) {
		console.error('Error cancelling event tracking:', error);
		throw new Error('Could not cancel the event tracking.');
	}
};

/**
 * Marks a tracked event as attended.
 * @param eventId The ID of the tracked event to mark as attended.
 * @returns A promise that resolves when the action is successful.
 */
export const markEventAsAttended = async (eventId: string): Promise<void> => {
	try {
		await apiClient.patch(`/tracking/events/${eventId}/`, { is_attended: true });
	} catch (error) {
		console.error('Error marking event as attended:', error);
		throw new Error('Could not mark the event as attended.');
	}
};