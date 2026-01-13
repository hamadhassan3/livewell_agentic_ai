import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Platform, Image } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useChatModalStore } from '@/stores/chatModalStore';
import { useChatWidgetStore } from '@/stores/chatWidgetStore';
import avatarImage from '@/assets/images/avatar.png';

interface FloatingChatButtonProps {
	/** Bottom offset to avoid overlapping with tab bar */
	bottomOffset?: number;
}

export const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({
	bottomOffset = Platform.OS === 'ios' ? 100 : 80,
}) => {
	const { openModal } = useChatModalStore();
	const { toggleWidget, isOpen: isWidgetOpen } = useChatWidgetStore();
	const pulseAnim = useRef(new Animated.Value(1)).current;

	const handlePress = () => {
		if (Platform.OS === 'web') {
			toggleWidget();
		} else {
			openModal();
		}
	};

	useEffect(() => {
		// Create subtle pulse animation
		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.1,
					duration: 1500,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 1500,
					useNativeDriver: true,
				}),
			])
		);

		pulse.start();

		return () => {
			pulse.stop();
		};
	}, [pulseAnim]);

	return (
		<Animated.View
			style={[
				styles.container,
				{
					bottom: bottomOffset,
					transform: [{ scale: pulseAnim }],
				},
			]}
		>
			<TouchableOpacity
				style={[
					styles.button,
					Platform.OS === 'web' && isWidgetOpen && styles.buttonActive,
				]}
				onPress={handlePress}
				activeOpacity={0.8}
			>
				<Image
					source={avatarImage}
					style={styles.avatarImage}
				/>
			</TouchableOpacity>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		right: 20,
		zIndex: 1000,
	},
	button: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: COLORS.surface,
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 8,
	},
	buttonActive: {
		backgroundColor: COLORS.primary,
	},
	avatarImage: {
		width: 56,
		height: 56,
		borderRadius: 28,
	},
});
