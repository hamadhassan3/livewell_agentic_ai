import React, { useEffect, useState } from 'react';
import {
	StyleSheet,
	Text,
	View,
	FlatList,
	ActivityIndicator,
	RefreshControl,
	Pressable,
} from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { LeaderboardData, LeaderboardEntry } from '../types';
import { getLeaderboard } from '../api/leaderboardService';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { WebContainer } from '@/components/layout';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { TopThreePodium } from '@/components/TopThreePodium';

const LeaderboardScreen: React.FC = () => {
	const { isMobile } = useMediaQuery();
	const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchLeaderboard = async () => {
		try {
			setError(null);
			const data = await getLeaderboard();
			setLeaderboardData(data);
		} catch (err) {
			setError('Failed to load leaderboard. Please try again.');
			console.error('Leaderboard fetch error:', err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchLeaderboard();
	}, []);

	const onRefresh = () => {
		setRefreshing(true);
		fetchLeaderboard();
	};

	const renderLeaderboardEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
		const isTopThree = item.rank <= 3;
		const isCurrent = leaderboardData?.current_user?.email === item.email;

		let medalIcon: keyof typeof MaterialCommunityIcons.glyphMap | null = null;
		let medalColor: string | null = null;

		if (item.rank === 1) {
			medalIcon = 'medal';
			medalColor = '#FFD700'; // Gold
		} else if (item.rank === 2) {
			medalIcon = 'medal';
			medalColor = '#C0C0C0'; // Silver
		} else if (item.rank === 3) {
			medalIcon = 'medal';
			medalColor = '#CD7F32'; // Bronze
		}

		return (
			<View
				style={[
					styles.entryContainer,
					isTopThree && styles.topThreeEntry,
					isCurrent && styles.currentUserEntry,
					isMobile && styles.entryContainerMobile,
				]}
			>
				<View style={[styles.rankContainer, isMobile && styles.rankContainerMobile]}>
					{medalIcon ? (
						<MaterialCommunityIcons name={medalIcon} size={isMobile ? 20 : 28} color={medalColor} />
					) : (
						<Text style={[styles.rankText, isMobile && styles.rankTextMobile]}>#{item.rank}</Text>
					)}
				</View>
				<View style={[styles.emailContainer, isMobile && styles.emailContainerMobile]}>
					<Text style={[styles.emailText, isMobile && styles.emailTextMobile]} numberOfLines={1}>
						{item.email}
					</Text>
					{isCurrent && <Text style={[styles.youLabel, isMobile && styles.youLabelMobile]}>(You)</Text>}
				</View>
				<View style={[styles.pointsContainer, isMobile && styles.pointsContainerMobile]}>
					<Text style={[styles.pointsText, isMobile && styles.pointsTextMobile]}>{item.points}</Text>
					<Text style={[styles.pointsLabel, isMobile && styles.pointsLabelMobile]}>pts</Text>
				</View>
			</View>
		);
	};

	const renderCurrentUserPosition = () => {
		if (!leaderboardData?.current_user) {
			return null;
		}

		return (
			<View style={[styles.currentUserSection, isMobile && styles.currentUserSectionMobile]}>
				<Text style={[styles.currentUserTitle, isMobile && styles.currentUserTitleMobile]}>Your Position</Text>
				{renderLeaderboardEntry({ item: leaderboardData.current_user, index: 0 })}
			</View>
		);
	};

	if (loading) {
		return (
			<View style={styles.container}>
				<WebContainer maxWidth={900}>
					<View style={styles.centered}>
						<ActivityIndicator size="large" color={COLORS.primary} />
					</View>
				</WebContainer>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.container}>
				<WebContainer maxWidth={900}>
					<View style={styles.centered}>
						<Text style={styles.errorText}>{error}</Text>
						<Pressable onPress={fetchLeaderboard} style={styles.retryButton}>
							<Text style={styles.retryText}>Tap to retry</Text>
						</Pressable>
					</View>
				</WebContainer>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<WebContainer maxWidth={900}>
				<View style={[styles.header, isMobile && styles.headerMobile]}>
					<MaterialCommunityIcons name="trophy" size={isMobile ? 28 : 36} color={COLORS.primary} />
					<Text style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}>Leaderboard</Text>
				</View>

				<View style={[styles.contentContainer, isMobile && styles.contentContainerMobile]}>
					<FlatList
						data={leaderboardData?.top_users || []}
						renderItem={renderLeaderboardEntry}
						keyExtractor={(item) => item.email}
						contentContainerStyle={[styles.listContent, isMobile && styles.listContentMobile]}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={onRefresh}
								tintColor={COLORS.primary}
							/>
						}
						ListHeaderComponent={
							<TopThreePodium
								topThree={leaderboardData?.top_users?.slice(0, 3) || []}
								currentUserEmail={leaderboardData?.current_user?.email}
								loading={loading}
							/>
						}
						ListEmptyComponent={
							<View style={styles.centered}>
								<Text style={[styles.emptyText, isMobile && styles.emptyTextMobile]}>No leaderboard data available</Text>
							</View>
						}
						ListFooterComponent={renderCurrentUserPosition}
					/>
				</View>
			</WebContainer>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	contentContainer: {
		flex: 1,
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
		paddingHorizontal: 20,
		marginBottom: 16,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginLeft: 12,
	},
	listContent: {
		padding: 20,
	},
	entryContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.background,
		padding: 16,
		marginBottom: 8,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
		cursor: 'default',
	},
	topThreeEntry: {
		backgroundColor: '#FFF9E6',
		borderColor: COLORS.primary,
	},
	currentUserEntry: {
		borderWidth: 2,
		borderColor: COLORS.primary,
		backgroundColor: '#E8F5E9',
	},
	rankContainer: {
		width: 60,
		alignItems: 'center',
	},
	rankText: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
	},
	emailContainer: {
		flex: 1,
		marginLeft: 12,
	},
	emailText: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textPrimary,
	},
	youLabel: {
		fontSize: 12,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.primary,
		marginTop: 2,
	},
	pointsContainer: {
		alignItems: 'flex-end',
		marginLeft: 12,
	},
	pointsText: {
		fontSize: 22,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
	},
	pointsLabel: {
		fontSize: 12,
		fontWeight: FONT_WEIGHTS.regular,
		color: COLORS.textSecondary,
	},
	currentUserSection: {
		marginTop: 24,
		paddingTop: 16,
		borderTopWidth: 2,
		borderTopColor: COLORS.border,
	},
	currentUserTitle: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginBottom: 12,
		textAlign: 'center',
	},
	errorText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.error,
		textAlign: 'center',
		marginBottom: 10,
	},
	retryButton: {
		marginTop: 8,
	},
	retryText: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.primary,
		textAlign: 'center',
		textDecorationLine: 'underline',
	},
	emptyText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		textAlign: 'center',
	},
	// Mobile styles
	headerMobile: {
		paddingVertical: 16,
		paddingHorizontal: 12,
		marginBottom: 12,
		paddingTop: 60,
	},
	headerTitleMobile: {
		fontSize: 22,
	},
	contentContainerMobile: {
		borderRadius: 8,
	},
	listContentMobile: {
		padding: 12,
	},
	entryContainerMobile: {
		padding: 12,
		marginBottom: 6,
		borderRadius: 8,
	},
	rankContainerMobile: {
		width: 40,
	},
	rankTextMobile: {
		fontSize: FONT_SIZES.subheading,
	},
	emailContainerMobile: {
		marginLeft: 8,
	},
	emailTextMobile: {
		fontSize: 12,
	},
	youLabelMobile: {
		fontSize: 10,
	},
	pointsContainerMobile: {
		marginLeft: 8,
	},
	pointsTextMobile: {
		fontSize: 18,
	},
	pointsLabelMobile: {
		fontSize: 10,
	},
	currentUserSectionMobile: {
		marginTop: 16,
		paddingTop: 12,
	},
	currentUserTitleMobile: {
		fontSize: FONT_SIZES.subheading,
		marginBottom: 8,
	},
	emptyTextMobile: {
		fontSize: FONT_SIZES.subheading,
	},
});

export default LeaderboardScreen;
