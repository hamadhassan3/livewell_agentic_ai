import { create } from 'zustand';
import { cancelTrackedEvent, getNearbyEvents, getTrackedEvents, trackEvent } from '../api/eventsService';
import { Event } from '../types/eventTypes';
export type { Event };

interface EventsState {
	events: Event[];
	isLoading: boolean;
	error: string | null;
	trackedEventIds: Set<string>;
	completedEventIds: Set<string>;
	trackingEventId: string | null;
	cancellingEventId: string | null;
	fetchAndSyncEvents: (location: string) => Promise<void>;
	addEventToGoal: (event: Event) => Promise<boolean>; // Returns true on success
	cancelEventTracking: (eventId: string) => Promise<boolean>;
}

export const useEventsStore = create<EventsState>((set, get) => ({
	events: [],
	isLoading: false,
	error: null,
	trackedEventIds: new Set(),
	completedEventIds: new Set(),
	trackingEventId: null,
	cancellingEventId: null,

	fetchAndSyncEvents: async (location: string) => {
		set({ isLoading: true, error: null });
		try {
			// Fetch nearby events and tracked events concurrently
			const city = location.split(',')[0];
			const query = `Elderly Friendly Events near ${city}`;
			const eventsPromise = getNearbyEvents(query, location);
			const trackedEventsPromise = getTrackedEvents();

			const [eventsData, trackedEvents] = await Promise.all([eventsPromise, trackedEventsPromise]);

			// Create a map of tracked events by their link for efficient lookup and ID retrieval
			const trackedEventsByLink = new Map(trackedEvents.map((e) => [e.link, e]));

			// Add a unique ID to each event and determine if it's already tracked
			const newTrackedIds = new Set<string>();
			const newCompletedIds = new Set<string>();
			const eventsWithIds = eventsData.map((event, index) => {
				const existingTrackedEvent = trackedEventsByLink.get(event.link);
				let eventWithId: Event;

				if (existingTrackedEvent) {
					// If the event is already tracked, use its database ID
					eventWithId = { ...event, id: existingTrackedEvent.id };
					newTrackedIds.add(existingTrackedEvent.id);
					if (existingTrackedEvent.is_attended) {
						newCompletedIds.add(existingTrackedEvent.id);
					}
				} else {
					// If it's a new event, generate a temporary, client-side ID
					eventWithId = { ...event, id: `temp-${event.title}-${index}` };
				}
				return eventWithId;
			});

			set({
				events: eventsWithIds,
				trackedEventIds: newTrackedIds,
				completedEventIds: newCompletedIds,
				isLoading: false,
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
			set({ error: errorMessage, isLoading: false });
		}
	},

	addEventToGoal: async (event: Event) => {
		set({ trackingEventId: event.id });
		try {
			const newTrackedEvent = await trackEvent({
				title: event.title,
				address: event.address,
				link: event.link,
				start_date: event.date.start_date,
				when: event.date.when,
				json_data: JSON.stringify(event),
				is_attended: false,
			});

			// Update the store state
			set((state) => {
				// Replace the event with the temporary ID with the new event containing the database ID
				const updatedEvents = state.events.map((e) =>
					e.id === event.id ? { ...e, id: newTrackedEvent.id } : e
				);
				// Add the new database ID to the set of tracked IDs
				const updatedTrackedIds = new Set(state.trackedEventIds).add(newTrackedEvent.id);

				return { events: updatedEvents, trackedEventIds: updatedTrackedIds };
			});
			return true; // Indicate success
		} catch (error) {
			return false; // Indicate failure
		} finally {
			set({ trackingEventId: null });
		}
	},

	cancelEventTracking: async (eventId: string) => {
		set({ cancellingEventId: eventId });
		try {
			await cancelTrackedEvent(eventId);
			set((state) => {
				const updatedTrackedIds = new Set(state.trackedEventIds);
				updatedTrackedIds.delete(eventId);
				return { trackedEventIds: updatedTrackedIds };
			});
			return true; // Success
		} catch (error) {
			return false; // Failure
		} finally {
			set({ cancellingEventId: null });
		}
	},
}));
