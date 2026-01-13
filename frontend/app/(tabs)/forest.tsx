import React, { useState, useEffect, useCallback } from 'react';
import {
	SafeAreaView,
	StyleSheet,
	Text,
	View,
	ScrollView,
	ActivityIndicator,
	RefreshControl,
} from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import {
	heightPercentageToDP as hp,
	widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import GrowingPlantProgress from '@/components/GrowingPlantProgress';
import {
	getForestData,
	getUserTrees,
	ForestConfig,
	CompletedTree,
	ForestConfiguration,
} from '@/api/forestService';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const ANIMATIONS = {
	yoga: require('../../assets/animations/yoga.json'),
	birds: require('../../assets/animations/birds-flying.json'),
	flowers: require('../../assets/animations/flowers-small.json'),
	sunny: require('../../assets/animations/weather-sunny.json'),
} as const;

interface DailyGoals {
	mindfulness: boolean;
	socialConnection: boolean;
	nutrition: boolean;
	medications: boolean;
	activity: boolean;
}

interface OverallAchievements {
	mindfulness: number;
	socialConnection: number;
	nutrition: number;
	medications: number;
	points: number;
	activity: number;
}

interface AnimatedIconProps {
	source: unknown;
	style: unknown;
	speed?: number;
}
const AnimatedIcon: React.FC<AnimatedIconProps> = ({
	source,
	style,
	speed = 0.5,
}) => {
	const handleError = () => {
		// Silent error handling for animations
	};

	return (
		<LottieView
			source={source}
			style={style}
			autoPlay={true}
			loop={true}
			speed={speed}
			resizeMode='contain'
			onError={handleError}
		/>
	);
};

interface AchievementCardProps {
	iconName: string;
	color: string;
	label: string;
	value: number;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
	iconName,
	color,
	label,
	value,
}) => {
	return (
		<View style={styles.achievementCard}>
			<MaterialCommunityIcons name={iconName as any} size={32} color={color} />
			<Text style={[styles.achievementLabel, { color }]}>{label}</Text>
			<Text style={[styles.achievementStatus, { color }]}>{value}</Text>
		</View>
	);
};

interface WellnessElementCardProps {
	title: string;
	description: string;
	isCompleted: boolean;
	completedText: string;
	pendingText: string;
	successMessage: string;
	color: string;
	iconActive: string;
	iconInactive: string;
	isHalfWidth?: boolean;
	animationSource?: unknown;
}

const WellnessElementCard: React.FC<WellnessElementCardProps> = ({
	title,
	description,
	isCompleted,
	completedText,
	pendingText,
	successMessage,
	color,
	iconActive,
	iconInactive,
	isHalfWidth = false,
	animationSource,
}) => {
	const cardStyle = isHalfWidth ? styles.elementCardHalf : styles.elementCard;

	return (
		<View style={cardStyle}>
			<View style={styles.elementHeader}>
				<View style={styles.elementIconContainer}>
					{isCompleted ? (
						animationSource ? (
							<AnimatedIcon
								source={animationSource}
								style={styles.elementAnimation}
								speed={0.5}
							/>
						) : (
							<MaterialCommunityIcons
								name={iconActive as any}
								size={60}
								color={color}
							/>
						)
					) : (
						<MaterialCommunityIcons
							name={iconInactive as any}
							size={60}
							color={COLORS.textSecondary}
						/>
					)}
				</View>
				<View style={styles.elementInfo}>
					<Text style={styles.elementTitle}>{title}</Text>
					{!isCompleted && (
						<Text style={styles.elementDescription}>{description}</Text>
					)}
					<Text
						style={[
							styles.elementProgress,
							{ color: isCompleted ? color : COLORS.textSecondary },
						]}
					>
						{isCompleted ? completedText : pendingText}
					</Text>
					{isCompleted && (
						<Text style={[styles.elementStatus, { color: '#4CAF50' }]}>
							{successMessage}
						</Text>
					)}
				</View>
			</View>
		</View>
	);
};

const ForestScreen: React.FC = () => {
	const { isMobile } = useMediaQuery();
	const [userPoints, setUserPoints] = useState<number>(0);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
		mindfulness: false,
		socialConnection: false,
		nutrition: false,
		medications: false,
		activity: false,
	});

	const [overallAchievements, setOverallAchievements] =
		useState<OverallAchievements>({
			mindfulness: 0,
			socialConnection: 0,
			nutrition: 0,
			medications: 0,
			points: 0,
			activity: 0,
		});

	const [forestConfig, setForestConfig] = useState<ForestConfig>({
		pointsPerTree: 200,
	});

	const fetchForestData = useCallback(
		async (isRefresh = false): Promise<void> => {
			try {
				if (isRefresh) {
					setRefreshing(true);
				} else {
					setLoading(true);
				}
				setError(null);

				// Fetch both forest data and tree history in parallel
				const [forestData, trees] = await Promise.all([
					getForestData(),
					getUserTrees(),
				]);

				setUserPoints(forestData.userPoints);
				setDailyGoals(forestData.dailyGoals);
				setOverallAchievements(forestData.overallAchievements);
				setForestConfig({
					pointsPerTree: forestData.treeProgress.pointsPerTree,
				});
				setTreeProgress({
					currentCycle: forestData.treeProgress.currentCycle,
					completedTrees: forestData.treeProgress.completedTrees,
				});
				setTreeHistory(trees);
				setForestConfiguration(forestData.configuration);
			} catch (err) {
				setError('Failed to load your forest data. Please try again.');
				setUserPoints(0);
				setTreeHistory([]);
			} finally {
				setLoading(false);
				setRefreshing(false);
			}
		},
		[]
	);

	useEffect(() => {
		fetchForestData();
	}, []);

	useFocusEffect(
		useCallback(() => {
			fetchForestData();
		}, [fetchForestData])
	);

	const onRefresh = useCallback(() => {
		fetchForestData(true);
	}, [fetchForestData]);

	const [treeProgress, setTreeProgress] = useState({
		currentCycle: 0,
		completedTrees: 0,
	});

	const [treeHistory, setTreeHistory] = useState<CompletedTree[]>([]);
	const [forestConfiguration, setForestConfiguration] = useState<
		ForestConfiguration | undefined
	>(undefined);

	const completedTrees = treeProgress.completedTrees;

	const getEncouragementMessage = useCallback(() => {
		const completedToday = Object.values(dailyGoals).filter(Boolean).length;
		const totalAchievements: number = Object.values(overallAchievements).reduce(
			(sum: number, count: number) => sum + count,
			0
		) as number;

		if (completedToday === 4) {
			return `Perfect day! You've completed all daily wellness activities and your forest is thriving with ${totalAchievements} total achievements!`;
		} else if (completedToday >= 2) {
			return `Great progress today! You've completed ${completedToday} wellness activities. Keep going to make your forest flourish!`;
		} else if (completedToday === 1) {
			return `Good start! You've completed 1 wellness activity today. Try adding more activities to enrich your forest ecosystem.`;
		} else if (totalAchievements > 20) {
			return `You're a wellness champion with ${totalAchievements} achievements! Complete today's activities to keep your forest growing.`;
		} else if (totalAchievements > 0) {
			return `You've made ${totalAchievements} wellness achievements so far. Complete today's activities to continue your journey!`;
		} else {
			return 'Welcome to your wellness forest! Complete your first activity to plant the seeds of a healthier, happier you.';
		}
	}, [dailyGoals, overallAchievements]);

	if (loading) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.centered}>
					<ActivityIndicator size='large' color={COLORS.primary} />
				</View>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.centered}>
					<MaterialCommunityIcons
						name='tree-outline'
						size={64}
						color={COLORS.textSecondary}
					/>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.contentContainer,
					{ padding: isMobile ? 16 : 20 },
				]}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={COLORS.primary}
						colors={[COLORS.primary]}
					/>
				}
			>
				<View style={[styles.header, { paddingTop: isMobile ? 60 : 0 }]}>
					<View style={styles.headerTitleRow}>
						<View style={styles.headerTextContainer}>
							<Text style={styles.headerTitle}>My Wellness Forest</Text>
							<Text style={styles.headerSubtitle}>
								Watch your dedication grow into a beautiful forest
							</Text>
						</View>
					</View>
				</View>

				<View style={styles.encouragementSection}>
					<MaterialCommunityIcons
						name='leaf'
						size={24}
						color={COLORS.primary}
					/>
					<Text style={styles.encouragementText}>
						{getEncouragementMessage()}
					</Text>
				</View>

				<View style={styles.wellnessElementsSection}>
					<Text style={styles.sectionTitle}>Your Wellness Garden</Text>

					<View style={styles.elementsRow}>
						<WellnessElementCard
							title='Mindfulness'
							description='Complete 1 mindfulness goal to add peace to your forest'
							isCompleted={dailyGoals.mindfulness}
							completedText='✓ Goal completed today'
							pendingText='○ No goals completed yet'
							successMessage='🧘 Your forest feels peaceful and calm'
							color={COLORS.primary}
							iconActive='meditation'
							iconInactive='meditation'
							isHalfWidth={true}
							animationSource={ANIMATIONS.yoga}
						/>

						<WellnessElementCard
							title='Social Connection'
							description='Complete 1 social goal to bring birds to your forest'
							isCompleted={dailyGoals.socialConnection}
							completedText='✓ Goal completed today'
							pendingText='○ No goals completed yet'
							successMessage='🦜 Birds are singing in your forest!'
							color='#2196F3'
							iconActive='account-group-outline'
							iconInactive='account-group-outline'
							isHalfWidth={true}
							animationSource={ANIMATIONS.birds}
						/>
					</View>

					<View style={styles.elementsRow}>
						<WellnessElementCard
							title='Diet & Nutrition'
							description='Complete 1 nutrition goal to grow flowers in your forest'
							isCompleted={dailyGoals.nutrition}
							completedText='✓ Goal completed today'
							pendingText='○ No goals completed yet'
							successMessage='🌸 Beautiful flowers bloom in your forest!'
							color='#FF9800'
							iconActive='food-apple-outline'
							iconInactive='food-apple-outline'
							isHalfWidth={true}
							animationSource={ANIMATIONS.flowers}
						/>

						<WellnessElementCard
							title='Medications'
							description='Take all medications to add a healthy heart to your forest'
							isCompleted={dailyGoals.medications}
							completedText='✓ All medications taken'
							pendingText='○ Some medications pending'
							successMessage='❤️ Your forest pulses with health and vitality!'
							color='#E91E63'
							iconActive='heart-pulse'
							iconInactive='pill'
							isHalfWidth={true}
						/>
					</View>

					<WellnessElementCard
						title='Activity'
						description='Complete physical activities to energize your forest'
						isCompleted={dailyGoals.activity}
						completedText='✓ Activity completed today'
						pendingText='○ No activity completed yet'
						successMessage='🏃‍♂️ Your forest vibrates with energy and movement!'
						color='#4CAF50'
						iconActive='run-fast'
						iconInactive='run'
						isHalfWidth={false}
					/>
				</View>

				<View style={styles.currentPlantSection}>
					<Text style={styles.sectionTitle}>Your Progress Tree</Text>
					<Text style={styles.treeGrowthTip}>
						Complete more wellness activities to accelerate your tree's growth!
						With enough achievements, you can even grow multiple trees in a
						single day.
					</Text>
					<View style={styles.growingPlantContainer}>
						<GrowingPlantProgress
							points={userPoints}
							completedTrees={completedTrees}
							configuration={forestConfiguration}
						/>
						<View style={styles.sunnyAnimationOverlay}>
							<AnimatedIcon
								source={ANIMATIONS.sunny}
								style={styles.sunnyAnimation}
								speed={0.5}
							/>
						</View>
					</View>
				</View>

				{/* Tree History Section */}
				<View style={styles.treeHistorySection}>
					<Text style={styles.sectionTitle}>Your Forest Gallery</Text>
					<Text style={styles.gallerySubtitle}>
						Every tree represents your dedication to wellness
					</Text>
					{treeHistory.length > 0 ? (
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							style={styles.treeHistoryScroll}
						>
							{treeHistory.map((tree) => {
								const completedDate = new Date(tree.completed_date);

								// Generate meaningful description based on what was achieved
								const getTreeDescription = () => {
									const qualities = [];

									// Use configuration category mappings if available
									const categoryMappings =
										forestConfiguration?.category_mappings;

									if (tree.mindfulness_count > 0) {
										qualities.push(categoryMappings?.mind?.quality || 'Peace');
									}
									if (tree.social_count > 0) {
										qualities.push(
											categoryMappings?.social?.quality || 'Connection'
										);
									}
									if (tree.nutrition_count > 0) {
										qualities.push(
											categoryMappings?.nutrition?.quality || 'Nourishment'
										);
									}
									if (tree.activity_count > 0) {
										qualities.push(
											categoryMappings?.activity?.quality || 'Vitality'
										);
									}

									if (qualities.length === 0) return 'A growing tree';
									if (qualities.length === 1)
										return `A tree of ${qualities[0]}`;
									if (qualities.length === 2)
										return `${qualities[0]} & ${qualities[1]}`;
									return `${qualities.slice(0, -1).join(', ')} & ${
										qualities[qualities.length - 1]
									}`;
								};

								// Get tree color based on dominant achievement
								const getTreeColor = () => {
									const counts = {
										mindfulness: tree.mindfulness_count,
										social: tree.social_count,
										nutrition: tree.nutrition_count,
										activity: tree.activity_count,
									};
									const dominant = Object.keys(counts).reduce((a, b) =>
										counts[a] > counts[b] ? a : b
									);

									// Use configuration colors if available
									const categoryMappings =
										forestConfiguration?.category_mappings;
									if (categoryMappings) {
										const categoryKey =
											dominant === 'mindfulness' ? 'mind' : dominant;
										return (
											categoryMappings[categoryKey]?.color || COLORS.primary
										);
									}

									// Fallback colors
									const colors = {
										mindfulness: COLORS.primary,
										social: '#2196F3',
										nutrition: '#FF9800',
										activity: '#4CAF50',
									};
									return colors[dominant] || COLORS.primary;
								};

								return (
									<View key={tree.id} style={styles.treeCard}>
										<MaterialCommunityIcons
											name='tree'
											size={50}
											color={getTreeColor()}
										/>
										<Text style={styles.treeNumber}>
											Tree #{tree.tree_number}
										</Text>
										<Text style={styles.treeDescription}>
											{getTreeDescription()}
										</Text>
										<Text style={styles.treeDate}>
											{completedDate.toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric',
											})}
										</Text>
										<View style={styles.treeStats}>
											{tree.mindfulness_count > 0 && (
												<Text style={styles.treeStat}>
													🧘 {tree.mindfulness_count}
												</Text>
											)}
											{tree.social_count > 0 && (
												<Text style={styles.treeStat}>
													👥 {tree.social_count}
												</Text>
											)}
											{tree.nutrition_count > 0 && (
												<Text style={styles.treeStat}>
													🍎 {tree.nutrition_count}
												</Text>
											)}
											{tree.activity_count > 0 && (
												<Text style={styles.treeStat}>
													🏃 {tree.activity_count}
												</Text>
											)}
										</View>
										<Text style={styles.treeGoals}>
											{tree.total_goals} achievements
										</Text>
									</View>
								);
							})}
						</ScrollView>
					) : (
						<View style={styles.emptyGallery}>
							<Text style={styles.emptyGalleryText}>
								Complete your first tree to see it appear here! 🌱
							</Text>
						</View>
					)}
				</View>

				<View style={styles.statsSection}>
					<Text style={styles.sectionTitle}>Overall Achievements</Text>
					<View style={styles.achievementGrid}>
						<AchievementCard
							iconName='meditation'
							color={COLORS.primary}
							label='Mindfulness'
							value={overallAchievements.mindfulness}
						/>
						<AchievementCard
							iconName='account-group'
							color='#2196F3'
							label='Social'
							value={overallAchievements.socialConnection}
						/>
						<AchievementCard
							iconName='food-apple'
							color='#FF9800'
							label='Nutrition'
							value={overallAchievements.nutrition}
						/>
						<AchievementCard
							iconName='pill'
							color='#E91E63'
							label='Medications'
							value={overallAchievements.medications}
						/>
						<AchievementCard
							iconName='run'
							color='#4CAF50'
							label='Activity'
							value={overallAchievements.activity}
						/>
						<AchievementCard
							iconName='star'
							color='#9C27B0'
							label='Points'
							value={overallAchievements.points}
						/>
					</View>

					<View style={styles.statsGrid}>
						<View style={styles.statCard}>
							<MaterialCommunityIcons
								name='tree'
								size={32}
								color={COLORS.primary}
							/>
							<Text style={styles.statValue}>{completedTrees}</Text>
							<Text style={styles.statLabel}>Trees Grown</Text>
						</View>
						<View style={styles.statCard}>
							<MaterialCommunityIcons
								name='star'
								size={32}
								color={COLORS.primary}
							/>
							<Text style={styles.statValue}>{userPoints}</Text>
							<Text style={styles.statLabel}>Total Points</Text>
						</View>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	scrollView: {
		flex: 1,
	},
	contentContainer: {
		maxWidth: 1200,
		width: '100%',
		alignSelf: 'center',
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	header: {
		marginBottom: 24,
	},
	headerTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerTextContainer: {
		flex: 1,
		alignItems: 'center',
	},
	headerTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold as any,
		color: COLORS.textPrimary,
		textAlign: 'center',
		marginBottom: 8,
	},
	headerSubtitle: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		textAlign: 'center',
		paddingHorizontal: 20,
		lineHeight: hp('3%'),
	},
	headerIconContainer: {
		width: 60,
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 10,
	},
	growingPlantContainer: {
		position: 'relative',
	},
	sunnyAnimationOverlay: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 120,
		height: 120,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1,
	},
	sunnyAnimation: {
		width: 120,
		height: 120,
	},
	currentPlantSection: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold as any,
		color: COLORS.textPrimary,
		marginBottom: 16,
	},
	treeGrowthTip: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		marginBottom: 16,
		lineHeight: hp('3%'),
		fontStyle: 'italic',
		textAlign: 'center',
		paddingHorizontal: 10,
	},
	statsSection: {
		marginBottom: 20,
	},
	achievementGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		gap: 12,
		marginBottom: 20,
	},
	achievementCard: {
		flex: 1,
		minWidth: 100,
		maxWidth: 180,
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		padding: 12,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	achievementCompleted: {
		borderWidth: 2,
		borderColor: COLORS.primary,
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	achievementLabel: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium as any,
		marginTop: 4,
	},
	achievementStatus: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold as any,
		marginTop: 2,
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-around',
		gap: 16,
	},
	statCard: {
		flex: 1,
		minWidth: 150,
		backgroundColor: COLORS.surface,
		borderRadius: 18,
		padding: 16,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	statValue: {
		fontSize: 28,
		fontWeight: FONT_WEIGHTS.bold as any,
		color: COLORS.primary,
		marginTop: 8,
	},
	statLabel: {
		fontSize: FONT_SIZES.heading,
		color: COLORS.textSecondary,
		textAlign: 'center',
		marginTop: 4,
		fontWeight: FONT_WEIGHTS.medium as any,
	},
	gallerySection: {
		marginBottom: 24,
	},
	gallerySubtitle: {
		fontSize: 20,
		color: COLORS.textSecondary,
		marginBottom: 16,
		fontStyle: 'italic',
		lineHeight: hp('3%'),
		fontWeight: FONT_WEIGHTS.medium as any,
	},
	treesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		justifyContent: 'space-between',
	},
	treeHistorySection: {
		marginBottom: 24,
	},
	emptyGallery: {
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		marginTop: 16,
	},
	emptyGalleryText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		textAlign: 'center',
		fontStyle: 'italic',
	},
	debugText: {
		fontSize: 12,
		color: '#ff0000',
		textAlign: 'center',
		marginTop: 8,
	},
	treeHistoryScroll: {
		marginTop: 16,
	},
	treeCard: {
		width: 160,
		minWidth: 140,
		maxWidth: 200,
		backgroundColor: COLORS.surface,
		borderRadius: 18,
		padding: 16,
		alignItems: 'center',
		marginRight: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	treeNumber: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold as any,
		color: COLORS.textPrimary,
		marginTop: 8,
	},
	treeDescription: {
		fontSize: 12,
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.medium as any,
		marginTop: 4,
		textAlign: 'center',
		fontStyle: 'italic',
	},
	treeDate: {
		fontSize: 11,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
	treeStats: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		marginTop: 8,
		gap: 4,
	},
	treeStat: {
		fontSize: 12,
		color: COLORS.textSecondary,
	},
	treeGoals: {
		fontSize: 11,
		color: COLORS.textSecondary,
		fontWeight: FONT_WEIGHTS.medium as any,
		marginTop: 8,
	},
	encouragementSection: {
		backgroundColor: COLORS.surface,
		borderRadius: 18,
		padding: 20,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	encouragementText: {
		flex: 1,
		fontSize: FONT_SIZES.body,
		color: COLORS.primary,
		marginLeft: 12,
		fontStyle: 'italic',
		lineHeight: hp('3%'),
	},
	errorText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.error,
		textAlign: 'center',
		marginTop: 16,
	},
	ecosystemSection: {
		backgroundColor: COLORS.surface,
		borderRadius: 18,
		padding: 20,
		marginBottom: 24,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	weatherContainer: {
		alignItems: 'center',
		flex: 1,
	},
	weatherAnimationWrapper: {
		width: 80,
		height: 80,
		position: 'relative',
	},
	weatherAnimation: {
		width: 80,
		height: 80,
	},
	treeWithFallback: {
		position: 'relative',
		width: 60,
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
	},
	fallbackTreeIcon: {
		position: 'absolute',
		zIndex: -1,
	},
	fallbackFlowerIcon: {
		position: 'absolute',
		bottom: 0,
		left: 5,
		zIndex: -1,
	},
	fallbackBirdIcon: {
		position: 'absolute',
		top: 0,
		right: 0,
		zIndex: -1,
	},
	fallbackButterflyIcon: {
		position: 'absolute',
		top: 0,
		left: 0,
		zIndex: -1,
	},
	weatherText: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.primary,
		marginTop: 4,
		fontWeight: FONT_WEIGHTS.medium as any,
	},
	treeContainer: {
		position: 'relative',
		width: 60,
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
	},
	treeAnimation: {
		width: 60,
		height: 60,
	},
	flowersContainer: {
		position: 'absolute',
		bottom: -5,
		left: -10,
		right: -10,
	},
	flowerAnimation: {
		width: 30,
		height: 20,
	},
	birdsContainer: {
		position: 'absolute',
		top: -15,
		right: -20,
	},
	birdsAnimation: {
		width: 40,
		height: 30,
	},
	butterfliesContainer: {
		position: 'absolute',
		top: -10,
		left: -15,
	},
	butterfliesAnimation: {
		width: 35,
		height: 35,
	},
	wellnessElementsSection: {
		marginBottom: 24,
	},
	elementsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		gap: 16,
		marginBottom: 16,
	},
	elementCard: {
		backgroundColor: COLORS.surface,
		borderRadius: 18,
		padding: 20,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	elementCardHalf: {
		flex: 1,
		minWidth: 280,
		maxWidth: '100%',
		backgroundColor: COLORS.surface,
		borderRadius: 18,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	elementHeader: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	elementIconContainer: {
		width: 80,
		height: 80,
		marginRight: 16,
		position: 'relative',
		justifyContent: 'center',
		alignItems: 'center',
	},
	elementAnimation: {
		width: 80,
		height: 80,
	},
	elementInfo: {
		flex: 1,
	},
	elementTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold as any,
		color: COLORS.textPrimary,
		marginBottom: 4,
	},
	elementDescription: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		marginBottom: 6,
	},
	elementProgress: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium as any,
		color: COLORS.primary,
	},
	elementStatus: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium as any,
		marginTop: 4,
	},
});

export default ForestScreen;
