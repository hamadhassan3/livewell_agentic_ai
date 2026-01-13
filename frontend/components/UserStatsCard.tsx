import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { ForestData, getTreeStageName } from '@/api/forestService';
import { Skeleton } from '@/components/Skeleton';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface UserStatsCardProps {
	forestData: ForestData | null;
	userRank?: number;
	loading?: boolean;
}

const CATEGORY_ICONS: Record<
	string,
	keyof typeof MaterialCommunityIcons.glyphMap
> = {
	mindfulness: 'meditation',
	socialConnection: 'account-group',
	nutrition: 'food-apple',
	medications: 'pill',
	activity: 'run',
};

const CATEGORY_COLORS: Record<string, string> = {
	mindfulness: '#9C27B0',
	socialConnection: '#2196F3',
	nutrition: '#4CAF50',
	medications: '#FF9800',
	activity: '#F44336',
};

export const UserStatsCard: React.FC<UserStatsCardProps> = ({
	forestData,
	userRank,
	loading = false,
}) => {
	const { isMobile } = useMediaQuery();

	if (loading) {
		return (
			<View style={[styles.container, isMobile && styles.containerMobile]}>
				<View style={styles.header}>
					<Skeleton width={150} height={24} style={{ marginBottom: 8 }} />
				</View>
				<View style={styles.content}>
					<View style={styles.animationContainer}>
						<Skeleton width={120} height={120} borderRadius={60} />
					</View>
					<View style={styles.statsContainer}>
						<Skeleton width='100%' height={20} style={{ marginBottom: 8 }} />
						<Skeleton width='80%' height={20} style={{ marginBottom: 8 }} />
						<Skeleton width='90%' height={20} style={{ marginBottom: 12 }} />
						<Skeleton width='100%' height={8} borderRadius={4} />
					</View>
				</View>
				<View style={styles.dailyGoalsContainer}>
					<Skeleton width={100} height={16} style={{ marginBottom: 12 }} />
					<View style={styles.goalsRow}>
						{[1, 2, 3, 4, 5].map((i) => (
							<Skeleton
								key={i}
								width={40}
								height={40}
								borderRadius={20}
								style={{ marginHorizontal: 4 }}
							/>
						))}
					</View>
				</View>
			</View>
		);
	}

	if (!forestData) {
		return null;
	}

	const { treeProgress, dailyGoals, userPoints } = forestData;
	const progress =
		(treeProgress.currentCycle / treeProgress.pointsPerTree) * 100;
	const congratulationsAnimation = require('@/assets/animations/congratulations.json');
	const treeStageName = getTreeStageName(
		treeProgress.currentCycle,
		treeProgress.pointsPerTree
	);

	return (
		<View style={[styles.container, isMobile && styles.containerMobile]}>
			<View style={[styles.header, isMobile && styles.headerMobile]}>
				<Text
					style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}
				>
					Your Stats
				</Text>
			</View>

			<View style={[styles.content, isMobile && styles.contentMobile]}>
				{/* Congratulations Animation */}
				<View
					style={[
						styles.animationContainer,
						isMobile && styles.animationContainerMobile,
					]}
				>
					<LottieView
						source={congratulationsAnimation}
						autoPlay
						loop
						style={[styles.animation, isMobile && styles.animationMobile]}
					/>
				</View>

				{/* Stats */}
				<View style={styles.statsContainer}>
					{userRank !== undefined && (
						<View style={[styles.statRow, isMobile && styles.statRowMobile]}>
							<MaterialCommunityIcons
								name='trophy'
								size={isMobile ? 16 : 20}
								color={COLORS.primary}
							/>
							<Text
								style={[styles.statLabel, isMobile && styles.statLabelMobile]}
							>
								Rank:
							</Text>
							<Text
								style={[styles.statValue, isMobile && styles.statValueMobile]}
							>
								#{userRank}
							</Text>
						</View>
					)}

					<View style={[styles.statRow, isMobile && styles.statRowMobile]}>
						<MaterialCommunityIcons
							name='star'
							size={isMobile ? 16 : 20}
							color={COLORS.primary}
						/>
						<Text
							style={[styles.statLabel, isMobile && styles.statLabelMobile]}
						>
							Points:
						</Text>
						<Text
							style={[styles.statValue, isMobile && styles.statValueMobile]}
						>
							{userPoints}
						</Text>
					</View>

					<View style={[styles.statRow, isMobile && styles.statRowMobile]}>
						<MaterialCommunityIcons
							name='tree'
							size={isMobile ? 16 : 20}
							color={COLORS.primary}
						/>
						<Text
							style={[styles.statLabel, isMobile && styles.statLabelMobile]}
						>
							Trees Completed:
						</Text>
						<Text
							style={[styles.statValue, isMobile && styles.statValueMobile]}
						>
							{treeProgress.completedTrees}
						</Text>
					</View>

					{/* Progress Bar */}
					<View
						style={[
							styles.progressSection,
							isMobile && styles.progressSectionMobile,
						]}
					>
						<View style={styles.progressLabelRow}>
							<Text
								style={[
									styles.progressLabel,
									isMobile && styles.progressLabelMobile,
								]}
							>
								Current Tree Progress
							</Text>
							<Text
								style={[
									styles.progressText,
									isMobile && styles.progressTextMobile,
								]}
							>
								{treeProgress.currentCycle}/{treeProgress.pointsPerTree} pts
							</Text>
						</View>
						<View
							style={[
								styles.progressBarContainer,
								isMobile && styles.progressBarContainerMobile,
							]}
						>
							<View
								style={[
									styles.progressBar,
									{ width: `${Math.min(progress, 100)}%` },
								]}
							/>
						</View>
					</View>
				</View>
			</View>

			{/* Daily Goals */}
			<View
				style={[
					styles.dailyGoalsContainer,
					isMobile && styles.dailyGoalsContainerMobile,
				]}
			>
				<Text
					style={[
						styles.dailyGoalsTitle,
						isMobile && styles.dailyGoalsTitleMobile,
					]}
				>
					Today&apos;s Goals
				</Text>
				<View style={[styles.goalsRow, isMobile && styles.goalsRowMobile]}>
					{Object.entries(dailyGoals).map(([category, completed]) => {
						const icon =
							CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
						const color = CATEGORY_COLORS[category];

						return (
							<View key={category} style={styles.goalIcon}>
								<View
									style={[
										styles.iconCircle,
										completed
											? { backgroundColor: color }
											: styles.iconCircleEmpty,
										isMobile && styles.iconCircleMobile,
									]}
								>
									<MaterialCommunityIcons
										name={icon}
										size={isMobile ? 18 : 24}
										color={completed ? '#FFFFFF' : COLORS.textSecondary}
									/>
								</View>
								<Text
									style={[styles.goalLabel, isMobile && styles.goalLabelMobile]}
								>
									{category === 'mindfulness' && '🧘'}
									{category === 'socialConnection' && '👥'}
									{category === 'nutrition' && '🥗'}
									{category === 'medications' && '💊'}
									{category === 'activity' && '🏃'}
								</Text>
							</View>
						);
					})}
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: COLORS.surface,
		borderRadius: 16,
		padding: 20,
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
		borderWidth: 2,
		borderColor: COLORS.primary + '30',
	},
	header: {
		marginBottom: 16,
	},
	headerTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
		textAlign: 'center',
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	animationContainer: {
		alignItems: 'center',
		marginRight: 20,
	},
	animation: {
		width: 120,
		height: 120,
	},
	stageName: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textSecondary,
		marginTop: 8,
	},
	statsContainer: {
		flex: 1,
	},
	statRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	statLabel: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textSecondary,
		marginLeft: 8,
	},
	statValue: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginLeft: 4,
	},
	progressSection: {
		marginTop: 8,
	},
	progressLabelRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
	},
	progressLabel: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textSecondary,
	},
	progressText: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
	},
	progressBarContainer: {
		height: 6,
		backgroundColor: COLORS.border,
		borderRadius: 4,
		overflow: 'hidden',
	},
	progressBar: {
		height: '100%',
		backgroundColor: COLORS.primary,
		borderRadius: 4,
	},
	dailyGoalsContainer: {
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
		paddingTop: 16,
	},
	dailyGoalsTitle: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginBottom: 12,
		textAlign: 'center',
	},
	goalsRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		alignItems: 'center',
	},
	goalIcon: {
		alignItems: 'center',
	},
	iconCircle: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 4,
	},
	iconCircleEmpty: {
		backgroundColor: COLORS.background,
		borderWidth: 2,
		borderColor: COLORS.border,
	},
	goalLabel: {
		fontSize: 16,
	},
	// Mobile styles
	containerMobile: {
		padding: 12,
		borderRadius: 12,
		marginBottom: 12,
	},
	headerMobile: {
		marginBottom: 12,
	},
	headerTitleMobile: {
		fontSize: FONT_SIZES.body,
	},
	contentMobile: {
		flexDirection: 'column',
		marginBottom: 12,
	},
	animationContainerMobile: {
		marginRight: 0,
		marginBottom: 12,
	},
	animationMobile: {
		width: 100,
		height: 100,
	},
	statRowMobile: {
		marginBottom: 6,
	},
	statLabelMobile: {
		fontSize: FONT_SIZES.subheading,
		marginLeft: 6,
	},
	statValueMobile: {
		fontSize: FONT_SIZES.subheading,
	},
	progressSectionMobile: {
		marginTop: 8,
	},
	progressLabelMobile: {
		fontSize: 11,
	},
	progressTextMobile: {
		fontSize: 11,
	},
	progressBarContainerMobile: {
		height: 6,
	},
	dailyGoalsContainerMobile: {
		paddingTop: 12,
	},
	dailyGoalsTitleMobile: {
		fontSize: FONT_SIZES.subheading,
		marginBottom: 10,
	},
	goalsRowMobile: {
		gap: 6,
	},
	iconCircleMobile: {
		width: 36,
		height: 36,
		borderRadius: 18,
		marginBottom: 2,
	},
	goalLabelMobile: {
		fontSize: 14,
	},
});
