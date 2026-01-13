import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { useEventsStore } from '@/hooks/useEventsStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Event } from '@/types/eventTypes';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import { router, Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Image,
	RefreshControl,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

const EventCard: React.FC<{
	item: Event;
	onAddToGoal: (event: Event) => void;
	onCancel: (eventId: string) => void;
	isTracking: boolean;
	isTracked: boolean;
	isCompleted: boolean;
}> = ({ item, onAddToGoal, onCancel, isTracking, isTracked, isCompleted }) => (
	<View style={styles.card}>
		<View style={styles.thumbnailContainer}>
			<Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
			{/* {item.event_location_map?.image && (
				<Image source={{ uri: item.event_location_map.image }} style={styles.thumbnail} />
			)} */}
		</View>
		<View style={styles.cardContent}>
			<Text style={styles.cardTitle}>{item.title}</Text>
			<Text style={styles.cardDate}>{item.date.when}</Text>
			<Text style={styles.cardAddress}>{item.address.join(', ')}</Text>
			<Text style={styles.cardDescription} numberOfLines={2}>
				{item.description}
			</Text>
			<View style={styles.cardActions}>
				<TouchableOpacity
					style={[styles.button, isCompleted ? styles.completedButton : isTracked && styles.trackedButton]}
					onPress={() => onAddToGoal(item)}
					disabled={isTracking || isTracked || isCompleted}
				>
					{isTracking ? (
						<ActivityIndicator size="small" color={COLORS.textOnPrimary} />
					) : isCompleted ? (
						<MaterialCommunityIcons name="check-all" size={18} color={COLORS.textOnPrimary} />
					) : isTracked ? (
						<MaterialCommunityIcons name="check-circle" size={18} color={COLORS.textOnPrimary} />
					) : (
						<MaterialCommunityIcons name="star-outline" size={18} color={COLORS.textOnPrimary} />
					)}
					<Text style={styles.buttonText}>
						{isCompleted ? 'Completed' : isTracked ? 'Going' : 'Interested'}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.button, styles.detailsButton]}
					onPress={() => {
						router.push({
							pathname: `/events/${item.id}`,
							params: { link: item.link, title: item.title },
						})
					}}
				>
					<Text style={[styles.buttonText, styles.detailsButtonText]}>Details</Text>
				</TouchableOpacity>
			</View>
		</View>
		{isTracked && !isCompleted && (
			<TouchableOpacity
				style={styles.cancelButton}
				onPress={() => onCancel(item.id)}
			>
				<Text style={styles.cancelButtonText}>Cancel</Text>
			</TouchableOpacity>
		)}
	</View>
);

const NearbyEventsScreen = () => {
	const {
		events,
		isLoading,
		error,
		fetchAndSyncEvents,
		addEventToGoal,
		trackedEventIds,
		cancelEventTracking,
		completedEventIds,
		trackingEventId,
		cancellingEventId,
	} = useEventsStore();
	const [location, setLocation] = useState<Location.LocationObject | null>(null);
	const [locationError, setLocationError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const { isMobile } = useMediaQuery();
	const [selectedCategory, setSelectedCategory] = useState('All');

	useEffect(() => {
		const initializeEvents = async () => {
			let { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') {
				setLocationError('Permission to access location was denied. Please enable it in your settings to find nearby events.');
				return;
			}

			try {
				const location = await Location.getCurrentPositionAsync({});
				setLocation(location);
			} catch (error) {
				setLocationError('Could not fetch location. Please ensure location services are enabled.');
			}
		};
		initializeEvents();
	}, []);

	useEffect(() => {
		if (location) {
			// Use reverse geocoding to get a user-friendly location name
			Location.reverseGeocodeAsync({
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
			}).then(geocode => {
				// if (geocode.length > 0) {
				// 	const { city, region, country } = geocode[0];
				// 	const locationString = [city, region, country].filter(Boolean).join(', ');
				// 	fetchAndSyncEvents(locationString);
				// } 
				fetchAndSyncEvents('Adelaide, South Australia, Australia');
			});
		}
	}, [location, fetchAndSyncEvents]);

	const filteredEvents = useMemo(() => {
		let filtered = events;

		// Filter by category first
		if (selectedCategory !== 'All') {
			const lowercasedCategory = selectedCategory.toLowerCase();
			filtered = filtered.filter(event => 
				(event.category || '').toLowerCase().includes(lowercasedCategory)
			);
		}

		// Then filter by search query
		if (searchQuery) {
			const lowercasedQuery = searchQuery.toLowerCase();
			filtered = filtered.filter(event => {
				const searchableText = [event.title, event.description, event.address.join(' ')].join(' ').toLowerCase();
				return searchableText.includes(lowercasedQuery);
			});
		}

		return filtered;
	}, [events, searchQuery, selectedCategory]);

	const handleAddToGoal = async (event: Event) => {
		const success = await addEventToGoal(event);
		if (success) {
			Alert.alert('Success', `The event "${event.title}" has been added to your tracked events.`);
		} else {
			Alert.alert('Error', 'Failed to add the event. Please try again.');
		}
	};

	const handleCancel = async (eventId: string) => {
		const success = await cancelEventTracking(eventId);
		if (success) {
			Alert.alert('Success', 'You are no longer going to this event.');
		} else {
			Alert.alert('Error', 'Failed to cancel the event. Please try again.');
		}
	};

	const onRefresh = () => {
		// Re-run the full initialization logic on refresh
		if (!isLoading && location) {
			Location.reverseGeocodeAsync({
				latitude: location!.coords.latitude,
				longitude: location!.coords.longitude,
			}).then(geocode => {
				// if (geocode.length > 0) {
				// 	const { city, region, country } = geocode[0];
				// 	const locationString = [city, region, country].filter(Boolean).join(', ');
				// 	fetchAndSyncEvents(locationString);
				// }
				fetchAndSyncEvents('Adelaide, South Australia, Australia');
			});
		}
	};

	if (locationError) {
		return (
			<View style={styles.centered}>
				<Text style={styles.errorText}>{locationError}</Text>
			</View>
		);
	}

	if (isLoading && events.length === 0) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size="large" color={COLORS.primary} animating={isLoading} />
				<Text style={styles.loadingText}>Finding events near you...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Stack.Screen options={{ title: 'Nearby Events' }} />
			{error && !isLoading && <Text style={styles.errorText}>{error}</Text>}
			<FlatList
				ListHeaderComponent={
					<>
						<Text style={styles.headerTitle}>
							Discover Events & Connect with Your Community
						</Text>
						<View style={[styles.searchContainer, !isMobile && { width: '30%', alignSelf: 'center' }]}>
							<MaterialCommunityIcons name="magnify" size={22} color={COLORS.textSecondary} style={styles.searchIcon} />
							<TextInput
								style={styles.searchInput}
								placeholder="Search events by title, description..."
								value={searchQuery}
								onChangeText={setSearchQuery}
								placeholderTextColor={COLORS.textSecondary}
							/>
						</View>
					</>
				}
				key={isMobile ? 1 : 2}
				numColumns={isMobile ? 1 : 2}
				data={filteredEvents}
				renderItem={({ item }) => (
					<EventCard
						item={item}
						onAddToGoal={handleAddToGoal}
						onCancel={handleCancel}
						isTracking={trackingEventId === item.id || cancellingEventId === item.id}
						isTracked={trackedEventIds.has(item.id)}
						isCompleted={completedEventIds.has(item.id)}
					/>
				)}
				keyExtractor={(item) => item.id}
				contentContainerStyle={[styles.listContent, isMobile && { paddingTop: 60 }]}
				columnWrapperStyle={isMobile ? null : styles.columnWrapper}
				ListEmptyComponent={
					isLoading ? (
						<View style={styles.centered}>
							<ActivityIndicator size="large" color={COLORS.primary} />
						</View>
					) : (
						<View style={styles.centered}><Text>No events found nearby.</Text></View>
					)
				}
				refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[COLORS.primary]} />}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background },
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
	loadingText: { marginTop: 10, color: COLORS.textSecondary, fontSize: FONT_SIZES.body },
	errorText: { color: COLORS.error, textAlign: 'center', margin: 20, fontSize: FONT_SIZES.body },
	headerTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		textAlign: 'center',
		marginHorizontal: 16,
		marginTop: 16,
		marginBottom: 8,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		marginHorizontal: 16,
		marginTop: 16,
		marginBottom: 8,
		paddingHorizontal: 16,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	searchIcon: {
		marginRight: 12,
	},
	searchInput: {
		flex: 1,
		height: 50,
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
		fontWeight: FONT_WEIGHTS.medium,
	},
	categoryContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		flexWrap: 'wrap',
		gap: 12,
		marginHorizontal: 16,
		marginBottom: 16,
	},
	categoryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: COLORS.surface,
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	categoryButtonSelected: {
		backgroundColor: COLORS.primary,
		borderColor: COLORS.primary,
	},
	categoryButtonText: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.primary,
	},
	categoryButtonTextSelected: {
		color: COLORS.textOnPrimary,
		fontWeight: FONT_WEIGHTS.bold,
	},
	listContent: { paddingHorizontal: 16, paddingBottom: 16, rowGap: 16 },
	columnWrapper: { gap: 16 },
	card: {
		flex: 1,
		backgroundColor: COLORS.surface,
		borderRadius: 16,
		overflow: 'hidden',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	thumbnailContainer: {
		flexDirection: 'row',
		padding: 8,
		gap: 8,
	},
	thumbnail: {
		width: 120,
		height: 120,
		borderRadius: 12,
		resizeMode: 'cover',
	},
	cardContent: { padding: 16 },
	cardTitle: { fontSize: FONT_SIZES.heading, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
	cardDate: { fontSize: FONT_SIZES.subheading, fontWeight: FONT_WEIGHTS.medium, color: COLORS.primary, marginBottom: 8 },
	cardAddress: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, marginBottom: 8 },
	cardDescription: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },
	cardActions: { flexDirection: 'row', gap: 12 },
	button: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: COLORS.primary,
		paddingVertical: 12,
		borderRadius: 25,
		gap: 8,
	},
	buttonText: {
		color: COLORS.textOnPrimary,
		fontWeight: FONT_WEIGHTS.bold,
		fontSize: FONT_SIZES.body,
	},
	trackedButton: {
		backgroundColor: COLORS.success, // A green color to indicate success
		opacity: 0.8,
	},
	completedButton: {
		backgroundColor: COLORS.primaryLight, // A different color for completed
		opacity: 0.7,
	},
	detailsButton: {
		backgroundColor: 'transparent',
		borderWidth: 1,
		borderColor: COLORS.primary,
	},
	detailsButtonText: {
		color: COLORS.primary,
	},
	cancelButton: {
		position: 'absolute',
		top: 8,
		right: 8,
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		paddingVertical: 4,
		paddingHorizontal: 10,
		borderWidth: 1,
		borderColor: COLORS.error,
	},
	cancelButtonText: {
		color: COLORS.error,
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
	},
});

export default NearbyEventsScreen;