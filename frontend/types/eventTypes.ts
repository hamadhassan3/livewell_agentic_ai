/**
 * Represents the entire event data object.
 */
export interface Event {
	id: string;
	title: string;
	date: EventDate;
	address: string[];
	link: string;
	event_location_map: EventLocationMap;
	description: string;
	ticket_info: TicketInfo[];
	thumbnail: string;
}

/**
 * Defines the structure for event date information.
 */
export interface EventDate {
	start_date: string;
	when: string;
}

/**
 * Describes the location data related to the event's map.
 */
export interface EventLocationMap {
	image: string;
	link: string;
	serpapi_link: string;
}

/**
 * Defines the structure for ticket or booking information.
 */
export interface TicketInfo {
	source: string;
	link: string;
	link_type: string;
}

/**
 * Represents the payload for tracking an event.
 */
export interface TrackedEventPayload {
	title: string;
	address: string[];
	link: string;
	start_date: string;
	when: string;
	json_data: string; // The full event object, stringified
	is_attended?: boolean;
}

/**
 * Represents a tracked event object fetched from the backend.
 */
export interface TrackedEvent {
	id: string;
	title: string;
	address: string[];
	link: string;
	start_date: string;
	when: string;
	json_data: string;
	is_attended: boolean;
	created_at: string;
}