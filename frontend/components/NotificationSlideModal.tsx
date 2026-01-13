import React, { useEffect, useRef, useState } from 'react';
import {
	Modal,
	View,
	StyleSheet,
	Animated,
	TouchableOpacity,
	Dimensions,
	PanResponder,
	Platform,
	Text,
	FlatList,
	ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { notificationService, Notification } from '@/api/notificationService';

const SWIPE_THRESHOLD = 50; // Minimum distance to trigger close

interface NotificationSlideModalProps {
	visible: boolean;
	onClose: () => void;
	refreshTrigger?: number;
}

interface NotificationItemProps {
	notification: Notification;
	onMarkAsRead?: (notificationId: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
	notification,
	onMarkAsRead,
}) => {
	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInHours = Math.floor(
			(now.getTime() - date.getTime()) / (1000 * 60 * 60)
		);

		if (diffInHours < 1) {
			return 'Just now';
		} else if (diffInHours < 24) {
			return `${diffInHours}h ago`;
		} else {
			const diffInDays = Math.floor(diffInHours / 24);
			return `${diffInDays}d ago`;
		}
	};

	return (
		<View
			style={[
				styles.notificationItem,
				notification.status === 'failed' && styles.failedNotification,
				!notification.is_read && styles.unreadNotification,
			]}
		>
			<View style={styles.notificationHeader}>
				<View style={styles.notificationIcon}>
					<MaterialCommunityIcons
						name={
							notification.status === 'failed'
								? 'alert-circle'
								: notification.is_read
								? 'check-circle'
								: 'circle'
						}
						size={20}
						color={
							notification.status === 'failed'
								? COLORS.error
								: notification.is_read
								? COLORS.primary
								: COLORS.textSecondary
						}
					/>
				</View>
				<View style={styles.notificationContent}>
					<Text
						style={[
							styles.notificationTitle,
							!notification.is_read && styles.unreadText,
						]}
						numberOfLines={2}
					>
						{notification.title}
					</Text>
					<Text style={styles.notificationBody} numberOfLines={3}>
						{notification.body}
					</Text>
					<View style={styles.notificationMeta}>
						<Text style={styles.notificationTime}>
							{formatDate(notification.created_at)}
						</Text>
						{!notification.is_read && (
							<TouchableOpacity
								style={styles.markReadButton}
								onPress={() => onMarkAsRead?.(notification.id)}
							>
								<Text style={styles.markReadText}>Mark as read</Text>
							</TouchableOpacity>
						)}
						{notification.status === 'failed' && (
							<Text style={styles.errorBadge}>Failed</Text>
						)}
					</View>
				</View>
			</View>
		</View>
	);
};

export const NotificationSlideModal: React.FC<NotificationSlideModalProps> = ({
	visible,
	onClose,
	refreshTrigger = 0,
}) => {
	const [screenDimensions, setScreenDimensions] = useState(
		Dimensions.get('screen')
	);
	const slideAnim = useRef(new Animated.Value(-screenDimensions.height));
	const fadeAnim = useRef(new Animated.Value(0));
	const panY = useRef(new Animated.Value(0));
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Listen for screen dimension changes and update animation values
	useEffect(() => {
		const subscription = Dimensions.addEventListener('change', ({ screen }) => {
			setScreenDimensions(screen);
			// Update animation initial value when dimensions change
			if (!visible) {
				slideAnim.current.setValue(-screen.height);
			}
		});

		return () => subscription?.remove();
	}, [visible]);

	// Fetch notifications when modal becomes visible
	useEffect(() => {
		if (visible) {
			fetchNotifications();
		}
	}, [visible, refreshTrigger]);

	const fetchNotifications = async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await notificationService.getNotifications();
			setNotifications(data);
		} catch (err) {
			setError('Failed to load notifications');
			console.error('Failed to fetch notifications:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleMarkAsRead = async (notificationId: number) => {
		try {
			await notificationService.markAsRead(notificationId);
			setNotifications((prev) =>
				prev.map((n) =>
					n.id === notificationId ? { ...n, is_read: true } : n
				)
			);
		} catch (err) {
			console.error('Failed to mark notification as read:', err);
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			await notificationService.markAllAsRead();
			setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
		} catch (err) {
			console.error('Failed to mark all as read:', err);
		}
	};

	// Pan responder for swipe-up gesture
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: (_, gestureState) => {
				// Only activate if swiping up
				return gestureState.dy < -5;
			},
			onPanResponderMove: (_, gestureState) => {
				// Only allow upward swipes
				if (gestureState.dy < 0) {
					panY.current.setValue(gestureState.dy);
				}
			},
			onPanResponderRelease: (_, gestureState) => {
				if (gestureState.dy < -SWIPE_THRESHOLD) {
					// Close modal if swiped up enough
					closeModalWithAnimation();
				} else {
					// Snap back to original position
					Animated.spring(panY.current, {
						toValue: 0,
						useNativeDriver: true,
					}).start();
				}
			},
		})
	).current;

	const closeModalWithAnimation = () => {
		Animated.parallel([
			Animated.timing(slideAnim.current, {
				toValue: -screenDimensions.height,
				duration: 350,
				useNativeDriver: true,
			}),
			Animated.timing(fadeAnim.current, {
				toValue: 0,
				duration: 250,
				useNativeDriver: true,
			}),
		]).start(() => {
			onClose();
			panY.current.setValue(0);
		});
	};

	useEffect(() => {
		if (visible) {
			// Open animation - slide down from top
			Animated.parallel([
				Animated.spring(slideAnim.current, {
					toValue: 0,
					damping: 25,
					stiffness: 120,
					mass: 1,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim.current, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}),
			]).start();
		} else {
			// Reset animations when closed
			slideAnim.current.setValue(-screenDimensions.height);
			fadeAnim.current.setValue(0);
			panY.current.setValue(0);
		}
	}, [visible]);

	const unreadCount = notifications.filter((n) => !n.is_read).length;

	return (
		<Modal
			visible={visible}
			transparent={true}
			animationType='none'
			onRequestClose={closeModalWithAnimation}
			statusBarTranslucent={true}
		>
			<Animated.View
				style={[
					styles.fullScreenContainer,
					{
						opacity: fadeAnim.current,
						transform: [
							{ translateY: slideAnim.current },
							{ translateY: panY.current },
						],
					},
				]}
				{...panResponder.panHandlers}
			>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.swipeIndicator} />
					<View style={styles.headerContent}>
						<View style={styles.headerLeft}>
							<MaterialCommunityIcons
								name='bell'
								size={24}
								color={COLORS.primary}
							/>
							<Text style={styles.headerTitle}>Notifications</Text>
							{unreadCount > 0 && (
								<View style={styles.unreadBadge}>
									<Text style={styles.unreadBadgeText}>{unreadCount}</Text>
								</View>
							)}
						</View>
						<View style={styles.headerRight}>
							{unreadCount > 0 && (
								<TouchableOpacity
									onPress={handleMarkAllAsRead}
									style={styles.markAllButton}
								>
									<Text style={styles.markAllText}>Mark all read</Text>
								</TouchableOpacity>
							)}
							<TouchableOpacity
								style={styles.closeButton}
								onPress={closeModalWithAnimation}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								<MaterialCommunityIcons
									name='close'
									size={24}
									color={COLORS.textPrimary}
								/>
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{/* Notifications List */}
				<View style={styles.notificationsContainer}>
					{loading ? (
						<View style={styles.centered}>
							<ActivityIndicator size='large' color={COLORS.primary} />
							<Text style={styles.loadingText}>Loading notifications...</Text>
						</View>
					) : error ? (
						<View style={styles.centered}>
							<MaterialCommunityIcons
								name='alert-circle'
								size={48}
								color={COLORS.error}
							/>
							<Text style={styles.errorText}>{error}</Text>
							<TouchableOpacity
								onPress={fetchNotifications}
								style={styles.retryButton}
							>
								<Text style={styles.retryText}>Retry</Text>
							</TouchableOpacity>
						</View>
					) : notifications.length === 0 ? (
						<View style={styles.centered}>
							<MaterialCommunityIcons
								name='bell-off'
								size={64}
								color={COLORS.textSecondary}
							/>
							<Text style={styles.emptyText}>No notifications</Text>
							<Text style={styles.emptySubtext}>
								You're all caught up!
							</Text>
						</View>
					) : (
						<FlatList
							data={notifications}
							keyExtractor={(item) => item.id.toString()}
							renderItem={({ item }) => (
								<NotificationItem
									notification={item}
									onMarkAsRead={handleMarkAsRead}
								/>
							)}
							contentContainerStyle={styles.listContent}
							showsVerticalScrollIndicator={true}
						/>
					)}
				</View>
			</Animated.View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	fullScreenContainer: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: COLORS.background,
	},
	header: {
		paddingTop: Platform.OS === 'ios' ? 50 : 20,
		paddingBottom: 16,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		backgroundColor: COLORS.surface,
	},
	swipeIndicator: {
		width: 40,
		height: 4,
		backgroundColor: COLORS.border,
		borderRadius: 2,
		alignSelf: 'center',
		marginBottom: 12,
	},
	headerContent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	headerTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginLeft: 12,
	},
	unreadBadge: {
		backgroundColor: COLORS.error,
		borderRadius: 10,
		paddingHorizontal: 6,
		paddingVertical: 2,
		marginLeft: 8,
		minWidth: 20,
		alignItems: 'center',
	},
	unreadBadgeText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: FONT_WEIGHTS.bold,
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	markAllButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: COLORS.primary + '15',
	},
	markAllText: {
		color: COLORS.primary,
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium,
	},
	closeButton: {
		padding: 4,
	},
	notificationsContainer: {
		flex: 1,
	},
	listContent: {
		paddingVertical: 8,
	},
	notificationItem: {
		backgroundColor: COLORS.surface,
		padding: 16,
		marginHorizontal: 16,
		marginVertical: 4,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	unreadNotification: {
		backgroundColor: COLORS.primary + '10',
		borderColor: COLORS.primary + '30',
	},
	failedNotification: {
		backgroundColor: COLORS.error + '10',
		borderColor: COLORS.error + '30',
	},
	notificationHeader: {
		flexDirection: 'row',
	},
	notificationIcon: {
		marginRight: 12,
		paddingTop: 2,
	},
	notificationContent: {
		flex: 1,
	},
	notificationTitle: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textPrimary,
		marginBottom: 4,
	},
	unreadText: {
		fontWeight: FONT_WEIGHTS.bold,
	},
	notificationBody: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
		marginBottom: 8,
		lineHeight: 20,
	},
	notificationMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8,
	},
	notificationTime: {
		fontSize: 12,
		color: COLORS.textSecondary,
	},
	markReadButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		backgroundColor: COLORS.primary + '15',
	},
	markReadText: {
		fontSize: 12,
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.medium,
	},
	errorBadge: {
		fontSize: 12,
		color: COLORS.error,
		fontWeight: FONT_WEIGHTS.bold,
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
	},
	loadingText: {
		marginTop: 16,
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
	},
	errorText: {
		marginTop: 16,
		fontSize: FONT_SIZES.body,
		color: COLORS.error,
		textAlign: 'center',
	},
	retryButton: {
		marginTop: 16,
		paddingHorizontal: 24,
		paddingVertical: 12,
		backgroundColor: COLORS.primary,
		borderRadius: 8,
	},
	retryText: {
		color: '#FFFFFF',
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
	},
	emptyText: {
		marginTop: 16,
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		textAlign: 'center',
	},
	emptySubtext: {
		marginTop: 8,
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		textAlign: 'center',
	},
});
