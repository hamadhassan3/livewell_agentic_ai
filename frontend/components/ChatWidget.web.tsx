// components/ChatWidget.web.tsx
import React, { useEffect, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Platform,
	Animated,
	Image,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import avatarImage from '@/assets/images/avatar.png';
import { ChatWindow } from './ChatWindow';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ChatWidgetProps {
	isOpen: boolean;
	onClose: () => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
	isOpen,
	onClose,
}) => {
	const { isMobile } = useMediaQuery();
	const slideAnim = useRef(new Animated.Value(1000)).current; // Start off-screen at bottom
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const [shouldRender, setShouldRender] = React.useState(false);
	
	useEffect(() => {
		if (isOpen) {
			setShouldRender(true);
			// Open animation
			Animated.parallel([
				Animated.spring(slideAnim, {
					toValue: 0,
					damping: 25,
					stiffness: 120,
					mass: 1,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true,
				}),
			]).start();
		} else if (shouldRender) {
			// Close animation
			Animated.parallel([
				Animated.timing(slideAnim, {
					toValue: 1000,
					duration: 350,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 250,
					useNativeDriver: true,
				}),
			]).start(() => {
				setShouldRender(false);
			});
		}
	}, [isOpen, slideAnim, fadeAnim, shouldRender]);
	
	if (!shouldRender) return null;

	return (
		<Animated.View 
			style={[
				styles.container,
				{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }]
				}
			]}
		>
			{/* Header */}
			<View style={[styles.header, isMobile && styles.headerMobile]}>
				<View style={styles.headerLeft}>
					<View style={styles.avatarPlaceholder}>
						<Image 
							source={avatarImage}
							style={styles.avatarImage}
						/>
					</View>
					<View>
						<Text style={styles.headerTitle}>Ava – Your Wellness Companion</Text>
						<Text style={styles.headerSubtitle}>Always here to help</Text>
					</View>
				</View>
				<View style={styles.headerActions}>
					<TouchableOpacity
						onPress={onClose}
						style={styles.headerButton}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
					>
						<MaterialCommunityIcons
							name="close"
							size={20}
							color={COLORS.textPrimary}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{/* Chat Content */}
			<View style={styles.chatContent}>
				<ChatWindow />
			</View>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute' as any,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: '100%',
		height: '100%',
		backgroundColor: COLORS.background,
		zIndex: 999,
		display: 'flex',
		flexDirection: 'column',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		paddingTop: Platform.OS === 'ios' ? 50 : 30, // Account for status bar
		backgroundColor: COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 4,
	},
	headerMobile: {
		paddingTop: 76, // 60px mobile header + 16px padding
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	avatarPlaceholder: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: COLORS.primary,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
		overflow: 'hidden',
	},
	avatarImage: {
		width: 50,
		height: 50,
		borderRadius: 25,
	},
	headerTitle: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
	},
	headerSubtitle: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
		marginTop: 2,
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	headerButton: {
		padding: 8,
		borderRadius: 20,
		backgroundColor: COLORS.surface,
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		...Platform.select({
			web: {
				cursor: 'pointer',
			},
		}),
	},
	chatContent: {
		flex: 1,
		backgroundColor: COLORS.background,
		overflow: 'hidden',
	},
});
