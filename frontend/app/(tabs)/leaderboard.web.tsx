import { getLeaderboard } from '@/api/leaderboardService';
import { getForestData, ForestData } from '@/api/forestService';
import { WebContainer } from '@/components/layout';
import { UserStatsCard } from '@/components/UserStatsCard';
import { TopThreePodium } from '@/components/TopThreePodium';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { LeaderboardData, LeaderboardEntry } from '@/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';

const LeaderboardWeb: React.FC = () => {
	const [leaderboardData, setLeaderboardData] =
		useState<LeaderboardData | null>(null);
	const [forestData, setForestData] = useState<ForestData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		try {
			setError(null);
			// Fetch both leaderboard and forest data in parallel
			const [leaderboard, forest] = await Promise.all([
				getLeaderboard(),
				getForestData(),
			]);
			setLeaderboardData(leaderboard);
			setForestData(forest);
		} catch (err) {
			setError('Failed to load data. Please try again.');
			console.error('Data fetch error:', err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const onRefresh = () => {
		setRefreshing(true);
		fetchData();
	};

	const renderLeaderboardEntry = ({ item }: { item: LeaderboardEntry }) => {
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
				]}
			>
				<View style={styles.rankContainer}>
					{medalIcon && medalColor ? (
						<MaterialCommunityIcons
							name={medalIcon}
							size={24}
							color={medalColor}
						/>
					) : (
						<Text style={styles.rankText}>#{item.rank}</Text>
					)}
				</View>
				<View style={styles.emailContainer}>
					<Text style={styles.emailText} numberOfLines={1}>
						{item.email}
					</Text>
					{isCurrent && <Text style={styles.youLabel}>(You)</Text>}
				</View>
				<View style={styles.pointsContainer}>
					<Text style={styles.pointsText}>{item.points}</Text>
					<Text style={styles.pointsLabel}>pts</Text>
				</View>
			</View>
		);
	};

	if (loading) {
		return (
			<View style={styles.container}>
				<WebContainer maxWidth={1200} style={styles.webContainer}>
					<View style={styles.loadingContainer}>
						<ActivityIndicator size='large' color={COLORS.primary} />
						<Text style={styles.loadingText}>Loading leaderboard...</Text>
					</View>
				</WebContainer>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.container}>
				<WebContainer maxWidth={1200} style={styles.webContainer}>
					<View style={styles.errorContainer}>
						<MaterialCommunityIcons
							name='alert-circle'
							size={48}
							color={COLORS.error}
						/>
						<Text style={styles.errorText}>{error}</Text>
					</View>
				</WebContainer>
			</View>
		);
	}

	// Get top 3 users for podium
	const topThree = leaderboardData?.top_users?.slice(0, 3) || [];
	const remaining = leaderboardData?.top_users?.slice(3) || [];

	return (
		<View style={styles.container}>
			<WebContainer maxWidth={1200} style={styles.webContainer}>
				{/* Header with Background */}
				<View style={styles.header}>
					<MaterialCommunityIcons
						name='trophy'
						size={32}
						color={COLORS.primary}
					/>
					<View style={styles.headerTextContainer}>
						<Text style={styles.headerTitle}>Leaderboard</Text>
						<Text style={styles.headerSubtitle}>
							Growing together, thriving together
						</Text>
					</View>
				</View>

				<ScrollView
					style={styles.content}
					contentContainerStyle={styles.scrollContent}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={COLORS.primary}
						/>
					}
				>
					{/* User Stats Card */}
					<UserStatsCard
						forestData={forestData}
						userRank={leaderboardData?.current_user?.rank}
						loading={loading}
					/>

					{/* Top 3 Podium */}
					<TopThreePodium
						topThree={topThree}
						currentUserEmail={leaderboardData?.current_user?.email}
						loading={loading}
					/>

					{/* Rest of Leaderboard */}
					<View style={styles.leaderboardSection}>
						<Text style={styles.sectionTitle}>
							{remaining.length > 0 ? 'Other Top Performers' : 'All Performers'}
						</Text>
						{remaining.length === 0 ? (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>
									No additional leaderboard data available
								</Text>
							</View>
						) : (
							remaining.map((item) => (
								<View key={item.email}>{renderLeaderboardEntry({ item })}</View>
							))
						)}
					</View>
				</ScrollView>
			</WebContainer>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	webContainer: {
		flex: 1,
		paddingVertical: 0,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 24,
		paddingBottom: 20,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		backgroundColor: COLORS.primary + '15',
	},
	headerTextContainer: {
		flex: 1,
		marginLeft: 16,
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		fontStyle: 'italic',
	},
	content: {
		flex: 1,
	},
	scrollContent: {
		paddingVertical: 20,
		paddingBottom: 40,
	},
	leaderboardSection: {
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
	},
	sectionTitle: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginBottom: 12,
	},
	entryContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		backgroundColor: COLORS.background,
		borderRadius: 8,
		marginBottom: 8,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	topThreeEntry: {
		backgroundColor: COLORS.primary + '10',
	},
	currentUserEntry: {
		borderColor: COLORS.primary,
		borderWidth: 2,
	},
	rankContainer: {
		width: 50,
		alignItems: 'center',
	},
	rankText: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
	},
	emailContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 12,
	},
	emailText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
	},
	youLabel: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.primary,
		marginLeft: 8,
		fontWeight: FONT_WEIGHTS.medium,
	},
	pointsContainer: {
		flexDirection: 'row',
		alignItems: 'baseline',
	},
	pointsText: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
	},
	pointsLabel: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
		marginLeft: 4,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 16,
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	errorText: {
		marginTop: 16,
		fontSize: FONT_SIZES.body,
		color: COLORS.error,
		textAlign: 'center',
	},
	emptyContainer: {
		padding: 32,
		alignItems: 'center',
	},
	emptyText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
	},
});

export default LeaderboardWeb;
