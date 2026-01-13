import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { LeaderboardEntry } from '@/types/leaderboardTypes';
import { Skeleton } from '@/components/Skeleton';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface TopThreePodiumProps {
	topThree: LeaderboardEntry[];
	currentUserEmail?: string;
	loading?: boolean;
}

const MEDAL_COLORS = {
	1: '#FFD700', // Gold
	2: '#C0C0C0', // Silver
	3: '#CD7F32', // Bronze
};

const PODIUM_HEIGHTS = {
	1: 240,
	2: 220,
	3: 200,
};

const PODIUM_HEIGHTS_MOBILE = {
	1: 200,
	2: 180,
	3: 160,
};

export const TopThreePodium: React.FC<TopThreePodiumProps> = ({
	topThree,
	currentUserEmail,
	loading = false,
}) => {
	const { isMobile } = useMediaQuery();

	if (loading) {
		const heights = isMobile ? PODIUM_HEIGHTS_MOBILE : PODIUM_HEIGHTS;
		return (
			<View style={[styles.container, isMobile && styles.containerMobile]}>
				<View style={[styles.podiumRow, isMobile && styles.podiumRowMobile]}>
					{/* Second Place */}
					<View style={[styles.podiumItem, { height: heights[2] }, isMobile && styles.podiumItemMobile]}>
						<Skeleton
							width={isMobile ? 48 : 60}
							height={isMobile ? 48 : 60}
							borderRadius={isMobile ? 24 : 30}
							style={{ marginBottom: 8 }}
						/>
						<Skeleton width={60} height={16} style={{ marginBottom: 4 }} />
						<Skeleton width={50} height={20} />
					</View>

					{/* First Place */}
					<View style={[styles.podiumItem, { height: heights[1] }, isMobile && styles.podiumItemMobile]}>
						<Skeleton
							width={isMobile ? 48 : 60}
							height={isMobile ? 48 : 60}
							borderRadius={isMobile ? 24 : 30}
							style={{ marginBottom: 8 }}
						/>
						<Skeleton width={80} height={18} style={{ marginBottom: 4 }} />
						<Skeleton width={60} height={24} />
					</View>

					{/* Third Place */}
					<View style={[styles.podiumItem, { height: heights[3] }, isMobile && styles.podiumItemMobile]}>
						<Skeleton
							width={isMobile ? 48 : 60}
							height={isMobile ? 48 : 60}
							borderRadius={isMobile ? 24 : 30}
							style={{ marginBottom: 8 }}
						/>
						<Skeleton width={50} height={14} style={{ marginBottom: 4 }} />
						<Skeleton width={45} height={18} />
					</View>
				</View>
			</View>
		);
	}

	if (topThree.length === 0) {
		return null;
	}

	// Arrange in podium order: [2nd, 1st, 3rd]
	const first = topThree.find((u) => u.rank === 1);
	const second = topThree.find((u) => u.rank === 2);
	const third = topThree.find((u) => u.rank === 3);

	const renderPodiumPosition = (
		user: LeaderboardEntry | undefined,
		rank: number
	) => {
		if (!user) return null;

		const isCurrentUser = user.email === currentUserEmail;
		const medalColor = MEDAL_COLORS[rank as keyof typeof MEDAL_COLORS];
		const podiumHeight = isMobile
			? PODIUM_HEIGHTS_MOBILE[rank as keyof typeof PODIUM_HEIGHTS_MOBILE]
			: PODIUM_HEIGHTS[rank as keyof typeof PODIUM_HEIGHTS];

		return (
			<View
				key={user.email}
				style={[
					styles.podiumItem,
					{ height: podiumHeight },
					isMobile && styles.podiumItemMobile
				]}
			>
				{/* Congratulations Animation
				<View style={styles.animationContainer}>
					<LottieView
						source={congratulationsAnimation}
						autoPlay
						loop
						style={{ width: animationSize, height: animationSize }}
					/>
				</View> */}

				{/* User Info */}
				<View style={styles.userInfo}>
					{/* Medal */}
					<View
						style={[
							styles.medalContainer,
							{ backgroundColor: medalColor },
							isMobile && styles.medalContainerMobile
						]}
					>
						<MaterialCommunityIcons
							name='medal'
							size={isMobile ? (rank === 1 ? 32 : 24) : (rank === 1 ? 40 : 32)}
							color='#FFFFFF'
						/>
					</View>
					<Text
						style={[
							styles.email,
							rank === 1 && styles.emailLarge,
							isMobile && styles.emailMobile
						]}
						numberOfLines={1}
					>
						{user.email.split('@')[0]}
					</Text>
					{isCurrentUser && <Text style={[styles.youBadge, isMobile && styles.youBadgeMobile]}>You!</Text>}
				</View>

				{/* Points */}
				<View
					style={[
						styles.pointsContainer,
						{ backgroundColor: medalColor + '20' },
						isMobile && styles.pointsContainerMobile
					]}
				>
					<Text style={[
						styles.points,
						rank === 1 && styles.pointsLarge,
						isMobile && styles.pointsMobile
					]}>
						{user.points}
					</Text>
					<Text style={[styles.pointsLabel, isMobile && styles.pointsLabelMobile]}>pts</Text>
				</View>

				{/* Podium Base */}
				<View
					style={[
						styles.podiumBase,
						{ backgroundColor: medalColor + '30' },
						isMobile && styles.podiumBaseMobile
					]}
				>
					<Text style={[styles.rankText, isMobile && styles.rankTextMobile]}>#{rank}</Text>
				</View>
			</View>
		);
	};

	return (
		<View style={[styles.container, isMobile && styles.containerMobile]}>
			<Text style={[styles.title, isMobile && styles.titleMobile]}>🏆 Top Performers 🏆</Text>

			<View style={[styles.podiumRow, isMobile && styles.podiumRowMobile]}>
				{/* Second Place */}
				{second && renderPodiumPosition(second, 2)}

				{/* First Place (Middle) */}
				{first && renderPodiumPosition(first, 1)}

				{/* Third Place */}
				{third && renderPodiumPosition(third, 3)}
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
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 8,
	},
	title: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		textAlign: 'center',
		marginBottom: 24,
	},
	podiumRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'flex-end',
		gap: 12,
	},
	podiumItem: {
		flex: 1,
		maxWidth: 150,
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingTop: 20,
		paddingBottom: 12,
		paddingHorizontal: 8,
		backgroundColor: COLORS.background,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		overflow: 'hidden',
		position: 'relative',
	},
	medalContainer: {
		width: 60,
		height: 60,
		borderRadius: 30,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8,
		marginTop: 4,
	},
	animationContainer: {
		marginBottom: 8,
		alignItems: 'center',
	},
	userInfo: {
		alignItems: 'center',
		marginBottom: 8,
		paddingHorizontal: 8,
		width: '100%',
	},
	email: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textPrimary,
		textAlign: 'center',
	},
	emailLarge: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
	},
	youBadge: {
		fontSize: 10,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
		backgroundColor: COLORS.primary + '20',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
		marginTop: 4,
	},
	pointsContainer: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		marginBottom: 40,
	},
	points: {
		fontSize: 20,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		textAlign: 'center',
	},
	pointsLarge: {
		fontSize: 24,
	},
	pointsLabel: {
		fontSize: 10,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textSecondary,
		textAlign: 'center',
	},
	podiumBase: {
		width: '100%',
		paddingVertical: 8,
		borderBottomLeftRadius: 10,
		borderBottomRightRadius: 10,
		marginTop: 'auto',
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
	},
	rankText: {
		fontSize: 16,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		textAlign: 'center',
	},
	// Mobile styles
	containerMobile: {
		padding: 12,
		marginBottom: 12,
	},
	titleMobile: {
		fontSize: FONT_SIZES.body,
		marginBottom: 16,
	},
	podiumRowMobile: {
		gap: 8,
	},
	podiumItemMobile: {
		maxWidth: 110,
		paddingTop: 12,
		paddingHorizontal: 6,
		borderRadius: 8,
	},
	medalContainerMobile: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginBottom: 6,
	},
	emailMobile: {
		fontSize: 11,
	},
	youBadgeMobile: {
		fontSize: 8,
		paddingHorizontal: 4,
		paddingVertical: 1,
		marginTop: 2,
	},
	pointsContainerMobile: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginBottom: 32,
	},
	pointsMobile: {
		fontSize: 16,
	},
	pointsLabelMobile: {
		fontSize: 9,
	},
	podiumBaseMobile: {
		paddingVertical: 6,
	},
	rankTextMobile: {
		fontSize: 14,
	},
});
