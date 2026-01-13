import { getTrackedEvents, markEventAsAttended } from '@/api/eventsService';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { TrackedEvent } from '@/types/eventTypes';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const EventsSection: React.FC = () => {
	const [events, setEvents] = useState<TrackedEvent[]>([]);
	const [attendingEventId, setAttendingEventId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchEvents = async () => {
			try {
				setIsLoading(true);
				setError(null);
				const trackedEvents = await getTrackedEvents();
				// Filter for events that are not yet attended
				const upcomingEvents = trackedEvents.filter(event => !event.is_attended);
				setEvents(upcomingEvents);
			} catch (err) {
				setError('Failed to load upcoming events.');
				console.error(err);
			} finally {
				setIsLoading(false);
			}
		};
		fetchEvents();
	}, []);

	const navigateToEvents = () => {
		router.push('/(tabs)/events');
	};

	const handleMarkAsAttended = async (eventId: string) => {
		setAttendingEventId(eventId);
		try {
			await markEventAsAttended(eventId);
			// Remove the event from the list of upcoming events
			setEvents((prevEvents) => prevEvents.filter((event) => event.id !== eventId));
		} catch (err) {
			console.error(err);
			Alert.alert('Error', 'Could not mark the event as attended. Please try again.');
		} finally {
			setAttendingEventId(null);
		}
	};

	return (
		<View style={styles.card}>
			<View style={styles.header}>
				<Text style={styles.headerText}>My Events</Text>
				<TouchableOpacity style={styles.viewAllButton} onPress={navigateToEvents}>
					<Text style={styles.viewAllText}>View All</Text>
					<MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.primary} />
				</TouchableOpacity>
			</View>
			{isLoading ? (
				<View style={styles.centered}>
					<ActivityIndicator color={COLORS.primary} />
					<Text style={styles.loadingText}>Loading events...</Text>
				</View>
			) : error ? (
				<View style={styles.centered}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			)
			: events.length > 0 ?
				<ScrollView style={styles.eventsScroll}>
					{events.map((event, index) => (
						<View key={event.id} style={[styles.eventItem, index === events.length - 1 && styles.lastEventItem]}>
							<TouchableOpacity
								style={styles.eventInfoContainer}
								onPress={() =>
									router.push({
										pathname: `/events/${event.id}`,
										params: { link: event.link, title: event.title },
									})
								}
							>
								<View style={styles.eventInfo}>
									<Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
									<Text style={styles.eventDetails}>{event.when}</Text>
								</View>
								<MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
							</TouchableOpacity>
							{(() => {
								const eventDate = new Date(event.start_date + ", " + new Date().getFullYear());
								const isFutureEvent = eventDate > new Date();

								if (isFutureEvent) {
									return (
										<View style={[styles.attendedButton, styles.upcomingButton]}>
											<Text style={styles.upcomingButtonText}>Upcoming Event</Text>
										</View>
									);
								}
								return(
									<TouchableOpacity
										style={styles.attendedButton}
										onPress={() => handleMarkAsAttended(event.id)}
										disabled={attendingEventId === event.id}
									>
										{attendingEventId === event.id ? (<ActivityIndicator size="small" color={COLORS.primary} />) : (<Text style={styles.attendedButtonText}>Mark as Attended</Text>)}
									</TouchableOpacity>
								);
							})()}
						</View>
					))}
				</ScrollView>
				: (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>You have no upcoming events.</Text>
					<TouchableOpacity style={styles.findEventsButton} onPress={navigateToEvents}>
						<Text style={styles.findEventsButtonText}>Find Events</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: COLORS.surface,
		borderRadius: 18,
		padding: 22,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 4,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 18,
	},
	headerText: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
	},
	viewAllButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	viewAllText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.medium,
	},
	eventsScroll: {
		maxHeight: 320, // Limit height to show ~3 items before scrolling
	},
	lastEventItem: {
		borderBottomWidth: 0,
	},
	eventItem: {
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	eventInfoContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	eventInfo: { flex: 1, marginRight: 12 },
	eventTitle: { fontSize: FONT_SIZES.body, fontWeight: FONT_WEIGHTS.medium, color: COLORS.textPrimary },
	eventDetails: { fontSize: FONT_SIZES.subheading, color: COLORS.textSecondary, marginTop: 4 },
	attendedButton: {
		marginTop: 12,
		backgroundColor: COLORS.background,
		borderColor: COLORS.primary,
		borderWidth: 1,
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		alignSelf: 'flex-start',
	},
	attendedButtonText: {
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.medium,
		fontSize: FONT_SIZES.subheading,
	},
	upcomingButton: {
		borderColor: COLORS.success,
	},
	upcomingButtonText: {
		color: COLORS.success,
	},
	emptyState: { alignItems: 'center', paddingVertical: 20 },
	centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
	loadingText: { marginTop: 8, color: COLORS.textSecondary },
	errorText: { color: COLORS.error },
	emptyText: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, marginBottom: 16 },
	findEventsButton: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25 },
	findEventsButtonText: { color: COLORS.textOnPrimary, fontWeight: FONT_WEIGHTS.bold },
});

export default EventsSection;