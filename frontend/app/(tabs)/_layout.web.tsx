import { getQuestion } from '@/api/questionnaireService';
import { notificationService } from '@/api/notificationService';
import { ChatWidget } from '@/components/ChatWidget.web';
import { FloatingChatButton } from '@/components/FloatingChatButton';
import { NotificationDisplay } from '@/components/NotificationDisplay';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useChatWidgetStore } from '@/stores/chatWidgetStore';
import { QuestionnaireState } from '@/types/questionnaireTypes';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type NavItem = {
	name: string;
	title: string;
	icon: keyof typeof MaterialCommunityIcons.glyphMap;
	path: string;
};

const NAV_ITEMS: NavItem[] = [
	{ name: 'index', title: 'Dashboard', icon: 'view-dashboard', path: '/(tabs)' },
	{ name: 'goals', title: 'Goals', icon: 'progress-check', path: '/(tabs)/goals' },
	{ name: 'medication', title: 'Medication', icon: 'pill', path: '/(tabs)/medication' },
	{ name: 'leaderboard', title: 'Leaderboard', icon: 'trophy', path: '/(tabs)/leaderboard' },
	{ name: 'forest', title: 'My Forest', icon: 'tree', path: '/(tabs)/forest' },
	{ name: 'documents', title: 'Health Records', icon: 'file-document-multiple', path: '/(tabs)/documents' },
	{ name: 'conversation-history', title: 'History', icon: 'message-text-outline', path: '/(tabs)/conversation-history' },
	{ name: 'notifications', title: 'Notifications', icon: 'bell', path: '/(tabs)/notifications' },
	{ name: 'events', title: 'Events', icon: 'calendar', path: '/(tabs)/events' },
	{ name: 'profile', title: 'Profile', icon: 'account', path: '/(tabs)/profile' },
];

export default function WebTabLayout() {
	const [questionnaireState, setQuestionnaireState] =
		useState<QuestionnaireState | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [unreadNotifications, setUnreadNotifications] = useState(0);
	const pathname = usePathname();
	const router = useRouter();
	const { isMobile, isTablet } = useMediaQuery();
	const { isOpen: isChatOpen, closeWidget } = useChatWidgetStore();
	const [previousPathname, setPreviousPathname] = useState(pathname);

	// Fetch unread notification count
	const fetchUnreadCount = async () => {
		try {
			const notifications = await notificationService.getNotifications();
			const unreadCount = notifications.filter(n => !n.is_read).length;
			setUnreadNotifications(unreadCount);
		} catch (error) {
			console.error('[WebLayout] Failed to fetch notification count:', error);
			setUnreadNotifications(0);
		}
	};

	// Close sidebar when navigating on mobile
	useEffect(() => {
		if (isMobile) {
			setIsSidebarOpen(false);
		}
	}, [pathname, isMobile]);

	// Fetch questionnaire state on mount
	useEffect(() => {
		const checkQuestionnaireState = async () => {
			try {
				const data = await getQuestion();
				setQuestionnaireState(data);
			} catch (error) {
				console.error('Failed to load questionnaire state:', error);
			}
		};

		checkQuestionnaireState();
	}, []);

	// Fetch notification count on mount and set up auto-refresh
	useEffect(() => {
		fetchUnreadCount();

		// Auto-refresh every 30 seconds
		const interval = setInterval(fetchUnreadCount, 30000);

		return () => clearInterval(interval);
	}, []);

	// Refetch notification count when navigating to/from notifications page
	useEffect(() => {
		if (pathname.includes('/notifications')) {
			// Refetch when navigating to notifications (user might mark as read)
			fetchUnreadCount();
		}
	}, [pathname]);

	// Close chat widget when navigating to different pages
	useEffect(() => {
		if (pathname !== previousPathname && isChatOpen) {
			closeWidget();
		}
		setPreviousPathname(pathname);
	}, [pathname, previousPathname, isChatOpen, closeWidget]);

	const isActive = (item: NavItem) => {
		// Handle index/dashboard page specially
		if (item.name === 'index') {
			return pathname === '/(tabs)' || pathname === '/(tabs)/' || pathname === '/' || pathname === '';
		}
		
		// For other pages, check if pathname includes the page name
		// This handles both exact matches and nested routes
		return pathname.includes(`/(tabs)/${item.name}`) || pathname.endsWith(`/${item.name}`);
	};

	const toggleSidebar = () => {
		setIsSidebarOpen(!isSidebarOpen);
	};

	// Show sidebar on desktop, or when open on mobile/tablet
	const shouldShowSidebar = !isMobile || isSidebarOpen;

	return (
		<View style={styles.container}>
			{/* Mobile Header with Hamburger */}
			{isMobile && (
				<View style={styles.mobileHeader}>
					<TouchableOpacity onPress={toggleSidebar} style={styles.hamburger}>
						<MaterialCommunityIcons
							name={isSidebarOpen ? 'close' : 'menu'}
							size={28}
							color={COLORS.textPrimary}
						/>
					</TouchableOpacity>
					<Text style={styles.mobileTitle}>LiveWell</Text>
				</View>
			)}

			{/* Sidebar */}
			{shouldShowSidebar && (
				<View style={[
					styles.sidebar,
					isMobile && styles.sidebarMobile,
					isMobile && !isSidebarOpen && styles.sidebarHidden
				]}>
				<View style={styles.sidebarHeader}>
					<Text style={styles.appTitle}>LiveWell</Text>
				</View>

				<ScrollView style={styles.navContainer}>
					{NAV_ITEMS.map((item) => (
						<Pressable
							key={item.name}
							style={[
								styles.navItem,
								isActive(item) && styles.navItemActive,
							]}
							onPress={() => {
								// Close chat widget when any tab is pressed
								if (isChatOpen) {
									closeWidget();
								}
								router.push(item.path as any);
							}}
						>
							<MaterialCommunityIcons
								name={item.icon}
								size={24}
								color={isActive(item) ? COLORS.primary : COLORS.textSecondary}
							/>
							<Text
								style={[
									styles.navItemText,
									isActive(item) && styles.navItemTextActive,
								]}
							>
								{item.title}
							</Text>
							{item.name === 'notifications' && unreadNotifications > 0 && (
								<View style={styles.badge}>
									<Text style={styles.badgeText}>
										{unreadNotifications > 99 ? '99+' : unreadNotifications}
									</Text>
								</View>
							)}
						</Pressable>
					))}
				</ScrollView>
				</View>
			)}

			{/* Overlay for mobile when sidebar is open */}
			{isMobile && isSidebarOpen && (
				<Pressable
					style={styles.overlay}
					onPress={() => setIsSidebarOpen(false)}
				/>
			)}

			{/* Main content */}
			<View style={styles.mainContent}>
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name='index' />
					<Stack.Screen name='goals' />
					<Stack.Screen name='medication' />
					<Stack.Screen name='leaderboard' />
					<Stack.Screen name='forest' />
					<Stack.Screen name='documents' />
					<Stack.Screen name='conversation-history' />
					<Stack.Screen name='notifications' />
					<Stack.Screen name='profile' />
					<Stack.Screen name='chat' />
				</Stack>

				{/* Floating Chat Button - hide when chat widget is open */}
				{!isChatOpen && <FloatingChatButton bottomOffset={16} />}

				{/* Chat Widget for Web */}
				<ChatWidget
					isOpen={isChatOpen}
					onClose={closeWidget}
				/>

				<NotificationDisplay />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'row',
		backgroundColor: COLORS.background,
	},
	mobileHeader: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: 60,
		backgroundColor: COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		zIndex: 100,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	hamburger: {
		padding: 8,
		marginRight: 12,
	},
	mobileTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
	},
	sidebar: {
		width: 250,
		backgroundColor: COLORS.surface,
		borderRightWidth: 1,
		borderRightColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 2, height: 0 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	sidebarMobile: {
		position: 'absolute',
		top: 60,
		left: 0,
		bottom: 0,
		zIndex: 99,
		shadowOffset: { width: 4, height: 0 },
		shadowOpacity: 0.2,
		shadowRadius: 12,
	},
	sidebarHidden: {
		display: 'none',
	},
	overlay: {
		position: 'absolute',
		top: 60,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		zIndex: 98,
	},
	sidebarHeader: {
		padding: 24,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	appTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
	},
	navContainer: {
		flex: 1,
		paddingTop: 16,
	},
	navItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		marginHorizontal: 12,
		marginVertical: 4,
		borderRadius: 8,
		cursor: 'pointer',
	},
	navItemActive: {
		backgroundColor: COLORS.primary + '20',
		borderLeftWidth: 4,
		borderLeftColor: COLORS.primary,
	},
	navItemText: {
		marginLeft: 12,
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		fontWeight: FONT_WEIGHTS.medium,
	},
	navItemTextActive: {
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.bold,
	},
	badge: {
		marginLeft: 'auto',
		minWidth: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: COLORS.error,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 6,
	},
	badgeText: {
		fontSize: 12,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.surface,
	},
	mainContent: {
		flex: 1,
		position: 'relative',
	},
});
