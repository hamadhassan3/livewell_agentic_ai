import { Tabs, useRouter, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { HapticTab } from '@/components/HapticTab';
import { NotificationDisplay } from '@/components/NotificationDisplay';
import { NotificationIcon } from '@/components/NotificationIcon';
import { NotificationSlideModal } from '@/components/NotificationSlideModal';
import { COLORS } from '@/constants/theme';
import { useAuthStore } from '@/hooks/useAuthStore';
import { getQuestion } from '@/api/questionnaireService';
import { QuestionnaireState } from '@/types/questionnaireTypes';
import { FloatingChatButton } from '@/components/FloatingChatButton';
import { ChatModal } from '@/components/ChatModal';
import { useChatModalStore } from '@/stores/chatModalStore';

/**
 * Tab Layout - Protected route for authenticated users with completed questionnaire
 *
 * Note: Primary auth protection is handled by AuthProvider
 * This is an additional safety check
 */
export default function TabLayout() {
	const { isAuthenticated, isInitialized } = useAuthStore();
	const { isVisible: isChatModalVisible } = useChatModalStore();
	const router = useRouter();
	const pathname = usePathname();
	const [previousPathname, setPreviousPathname] = useState(pathname);
	const [questionnaireState, setQuestionnaireState] =
		useState<QuestionnaireState | null>(null);
	const [notificationModalVisible, setNotificationModalVisible] =
		useState(false);
	const [notificationRefreshTrigger, setNotificationRefreshTrigger] =
		useState(0);
	const isWeb = Platform.OS === 'web';

	// Safety check: redirect if not authenticated (AuthProvider should handle this, but double-check)
	useEffect(() => {
		if (isInitialized && !isAuthenticated) {
			console.log('[TabLayout] User not authenticated, redirecting to index');
			router.replace('/');
		}
	}, [isInitialized, isAuthenticated, router]);

	useEffect(() => {
		const checkQuestionnaireState = async () => {
			try {
				const data = await getQuestion();
				setQuestionnaireState(data);
			} catch (error) {
				console.error('[TabLayout] Failed to load questionnaire state:', error);
			}
		};

		if (isAuthenticated) {
			checkQuestionnaireState();
		}
	}, [isAuthenticated]);

	// Track pathname changes for other purposes
	useEffect(() => {
		setPreviousPathname(pathname);
	}, [pathname]);

	// Show loading while auth initializes
	if (!isInitialized) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size='large' color={COLORS.primary} />
			</View>
		);
	}

	// Redirect handled by useEffect, show loading
	if (!isAuthenticated) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size='large' color={COLORS.primary} />
			</View>
		);
	}

	const tabBarHeight = Platform.OS === 'ios' ? 85 : 65;

	return (
		<>
			<Tabs
				screenOptions={{
					tabBarActiveTintColor: COLORS.primary,
					tabBarInactiveTintColor: COLORS.textSecondary,
					tabBarActiveBackgroundColor: COLORS.primary + '15',
					headerShown: true,
					headerRight: () => (
						<View style={{ marginRight: 15 }}>
							<NotificationIcon
								onPress={() => {
									if (isWeb) {
										router.push('/(tabs)/notifications');
									} else {
										setNotificationModalVisible(true);
									}
								}}
								refreshTrigger={notificationRefreshTrigger}
							/>
						</View>
					),
					headerStyle: {
						backgroundColor: COLORS.surface,
					},
					headerTintColor: COLORS.textPrimary,
					tabBarButton: HapticTab,
					tabBarStyle: {
						backgroundColor: COLORS.surface,
						borderTopColor: COLORS.border,
						borderTopWidth: 1,
						paddingTop: 8,
						paddingBottom: Platform.OS === 'ios' ? 20 : 8,
						height: tabBarHeight,
					},
					tabBarItemStyle: {
						borderRadius: 8,
						marginHorizontal: 2,
					},
					tabBarLabelStyle: {
						fontSize: 12,
						fontWeight: '500',
					},
				}}
			>
				<Tabs.Screen
					name='index'
					options={{
						title: 'Dashboard',
						tabBarIcon: ({ color }) => (
							// <IconSymbol size={28} name='space' color={color} />
							<MaterialCommunityIcons
								name='view-dashboard'
								size={24}
								color={color}
							/>
						),
					}}
				/>
				<Tabs.Screen
					name='goals'
					options={{
						title: 'Goals',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons
								name='progress-check'
								size={24}
								color={color}
							/>
						),
						// Hide from native apps - only show on web
						href: Platform.OS === 'web' ? undefined : null,
					}}
				/>
				<Tabs.Screen
					name='medication'
					options={{
						title: 'Medication',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons name='pill' size={24} color={color} />
						),
						// Hide from native apps - only show on web
						href: Platform.OS === 'web' ? undefined : null,
					}}
				/>

				<Tabs.Screen
					name='leaderboard'
					options={{
						title: 'Leaderboard',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons name='trophy' size={24} color={color} />
						),
					}}
				/>

				<Tabs.Screen
					name='forest'
					options={{
						title: 'My Forest',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons name='tree' size={24} color={color} />
						),
					}}
				/>

				<Tabs.Screen
					name='events'
					options={{
						title: 'Events',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons name='calendar' size={24} color={color} />
						),
						// Hide from web - only show on native
						href: Platform.OS === 'web' ? null : undefined,
					}}
				/>

				<Tabs.Screen
					name='profile'
					options={{
						title: 'Profile',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons name='account' size={24} color={color} />
						),
					}}
				/>

				<Tabs.Screen
					name='documents'
					options={{
						title: 'Health Records',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons
								name='file-document-multiple'
								size={24}
								color={color}
							/>
						),
						// Hide from native apps - only show on web
						href: Platform.OS === 'web' ? undefined : null,
					}}
				/>

				<Tabs.Screen
					name='conversation-history'
					options={{
						title: 'History',
						tabBarIcon: ({ color }) => (
							<MaterialCommunityIcons
								name='message-text-outline'
								size={24}
								color={color}
							/>
						),
						// Hide from native apps - only show on web
						href: Platform.OS === 'web' ? undefined : null,
					}}
				/>

				{/* Hidden screens - not shown in tab bar */}
				<Tabs.Screen
					name='chat'
					options={{
						href: null, // Hide from tab bar
					}}
				/>
				<Tabs.Screen
					name='notifications'
					options={{
						href: null, // Hide from tab bar
					}}
				/>
				{/* {questionnaireState && !questionnaireState.is_completed && (
				<Tabs.Screen
					name='questionnaire'
					options={{
						title: 'Questionnaire',
						tabBarIcon: ({ color }) => (
							<IconSymbol size={28} name='list.clipboard.fill' color={color} />
						),
					}}
				/>
			)} */}
			</Tabs>

			{/* Floating Chat Button - hide when modal is visible */}
			{!isChatModalVisible && (
				<FloatingChatButton bottomOffset={tabBarHeight + 16} />
			)}

			{/* Chat Modal */}
			<ChatModal />

			{/* Notification Display - only on web */}
			{isWeb && <NotificationDisplay />}

			{/* Notification Slide Modal - only on native */}
			{!isWeb && (
				<NotificationSlideModal
					visible={notificationModalVisible}
					onClose={() => setNotificationModalVisible(false)}
					refreshTrigger={notificationRefreshTrigger}
				/>
			)}
		</>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: COLORS.background,
	},
});
