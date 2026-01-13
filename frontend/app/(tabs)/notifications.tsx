import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	TouchableOpacity,
	RefreshControl,
	Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { notificationService, Notification } from '@/api/notificationService';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

export default function NotificationsScreen() {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchNotifications = async () => {
		try {
			setError(null);
			const data = await notificationService.getNotifications();
			setNotifications(data);
		} catch (err) {
			console.error('Failed to fetch notifications:', err);
			setError('Failed to load notifications. Please try again.');
		} finally {
			setIsLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchNotifications();
	}, []);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchNotifications();
	};

	const handleMarkAsRead = async (notificationId: number) => {
		try {
			await notificationService.markAsRead(notificationId);
			// Update local state
			setNotifications((prev) =>
				prev.map((n) =>
					n.id === notificationId ? { ...n, is_read: true, status: 'read' } : n
				)
			);
		} catch (err) {
			console.error('Failed to mark notification as read:', err);
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			await notificationService.markAllAsRead();
			// Update local state
			setNotifications((prev) =>
				prev.map((n) => ({ ...n, is_read: true, status: 'read' }))
			);
		} catch (err) {
			console.error('Failed to mark all as read:', err);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

		if (diffInHours < 1) {
			return 'Just now';
		} else if (diffInHours < 24) {
			return `${diffInHours}h ago`;
		} else {
			const diffInDays = Math.floor(diffInHours / 24);
			return `${diffInDays}d ago`;
		}
	};

	const renderNotificationItem = ({ item }: { item: Notification }) => (
		<TouchableOpacity
			style={[
				styles.notificationItem,
				!item.is_read && styles.unreadNotification,
			]}
			onPress={() => handleMarkAsRead(item.id)}
		>
			<View style={styles.notificationIcon}>
				<MaterialCommunityIcons
					name='bell'
					size={24}
					color={item.is_read ? COLORS.textSecondary : COLORS.primary}
				/>
			</View>
			<View style={styles.notificationContent}>
				<Text style={styles.notificationTitle}>{item.title}</Text>
				<Text style={styles.notificationBody}>{item.body}</Text>
				<Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
			</View>
			{!item.is_read && <View style={styles.unreadDot} />}
		</TouchableOpacity>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<MaterialCommunityIcons name='bell-off' size={64} color={COLORS.textSecondary} />
			<Text style={styles.emptyText}>No notifications yet</Text>
			<Text style={styles.emptySubtext}>
				You'll see notifications here when you receive them
			</Text>
		</View>
	);

	const unreadCount = notifications.filter((n) => !n.is_read).length;

	return (
		<SafeAreaView style={styles.container} edges={['bottom']}>
			<View style={styles.header}>
				<View>
					<Text style={styles.headerTitle}>Notifications</Text>
					{unreadCount > 0 && (
						<Text style={styles.headerSubtitle}>
							{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
						</Text>
					)}
				</View>
				{unreadCount > 0 && (
					<TouchableOpacity
						style={styles.markAllButton}
						onPress={handleMarkAllAsRead}
					>
						<Text style={styles.markAllText}>Mark all as read</Text>
					</TouchableOpacity>
				)}
			</View>

			{isLoading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' color={COLORS.primary} />
					<Text style={styles.loadingText}>Loading notifications...</Text>
				</View>
			) : error ? (
				<View style={styles.errorContainer}>
					<MaterialCommunityIcons name='alert-circle' size={48} color={COLORS.error} />
					<Text style={styles.errorText}>{error}</Text>
					<TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
						<Text style={styles.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			) : (
				<FlatList
					data={notifications}
					renderItem={renderNotificationItem}
					keyExtractor={(item) => item.id.toString()}
					ListEmptyComponent={renderEmptyState}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={handleRefresh}
							colors={[COLORS.primary]}
							tintColor={COLORS.primary}
						/>
					}
					contentContainerStyle={
						notifications.length === 0 ? styles.emptyListContainer : undefined
					}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: wp('5%'),
		paddingVertical: 16,
		backgroundColor: COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	headerTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
	},
	headerSubtitle: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
	markAllButton: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		backgroundColor: COLORS.primary + '20',
	},
	markAllText: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.medium,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 12,
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: wp('10%'),
	},
	errorText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.error,
		textAlign: 'center',
		marginTop: 16,
		marginBottom: 24,
	},
	retryButton: {
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 8,
		backgroundColor: COLORS.primary,
	},
	retryText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textOnPrimary,
		fontWeight: FONT_WEIGHTS.medium,
	},
	emptyListContainer: {
		flex: 1,
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: wp('10%'),
	},
	emptyText: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		textAlign: 'center',
		marginTop: 8,
	},
	notificationItem: {
		flexDirection: 'row',
		padding: 16,
		marginHorizontal: wp('5%'),
		marginVertical: 6,
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	unreadNotification: {
		backgroundColor: COLORS.primary + '10',
		borderColor: COLORS.primary + '40',
	},
	notificationIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: COLORS.background,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	notificationContent: {
		flex: 1,
	},
	notificationTitle: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginBottom: 4,
	},
	notificationBody: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
		marginBottom: 8,
		lineHeight: 18,
	},
	notificationTime: {
		fontSize: 12,
		color: COLORS.textSecondary,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: COLORS.primary,
		marginLeft: 8,
		alignSelf: 'center',
	},
});
