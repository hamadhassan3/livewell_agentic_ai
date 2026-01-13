import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

const EventDetailScreen = () => {
	const { link, title } = useLocalSearchParams<{ link: string; title: string }>();

	// A simple loading indicator for the WebView
	const renderLoading = () => (
		<View style={styles.loadingContainer}>
			<ActivityIndicator size="large" color={COLORS.primary} />
		</View>
	);

	return (
		<View style={styles.container}>
			<Stack.Screen
				options={{
					title: title || 'Event Details',
					headerLeft: () => (
						<TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
							<MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.primary} />
							<Text style={styles.headerButtonText}>Go Back</Text>
						</TouchableOpacity>
					),
				}}
			/>
			{Platform.OS === 'web' ? (
				// Use a standard iframe for the web for better performance and compatibility
				<iframe
					src={link}
					style={{ flex: 1, border: 'none' }}
					title={title || 'Event Details'}
				/>
			) : (
				// Use WebView for native platforms (iOS, Android)
				<WebView
					source={{ uri: link }}
					style={styles.webview}
					startInLoadingState={true}
					renderLoading={renderLoading}
				/>	
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background },
	webview: { flex: 1 },
	loadingContainer: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
	},
	headerButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		// Add platform-specific margin if needed
		marginRight: Platform.OS === 'ios' ? 0 : 15,
	},
	headerButtonText: {
		color: COLORS.primary,
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium,
		paddingBottom: 2, // Minor vertical alignment adjustment
	},
});

export default EventDetailScreen;