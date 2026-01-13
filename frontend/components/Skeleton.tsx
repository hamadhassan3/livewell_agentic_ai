import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/theme';

interface SkeletonProps {
	width?: number | string;
	height?: number;
	borderRadius?: number;
	style?: ViewStyle;
}

export function Skeleton({
	width = '100%',
	height = 20,
	borderRadius = 8,
	style
}: SkeletonProps) {
	const animatedValue = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(animatedValue, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(animatedValue, {
					toValue: 0,
					duration: 1000,
					useNativeDriver: true,
				}),
			])
		);
		animation.start();
		return () => animation.stop();
	}, [animatedValue]);

	const opacity = animatedValue.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 0.7],
	});

	return (
		<Animated.View
			style={[
				styles.skeleton,
				{
					width,
					height,
					borderRadius,
					opacity,
				},
				style,
			]}
		/>
	);
}

interface SkeletonInputProps {
	label?: boolean;
	helperText?: boolean;
}

export function SkeletonInput({ label = true, helperText = false }: SkeletonInputProps) {
	return (
		<View style={styles.inputContainer}>
			{label && <Skeleton width={120} height={16} style={styles.labelSkeleton} />}
			<Skeleton width="100%" height={48} />
			{helperText && <Skeleton width={200} height={14} style={styles.helperSkeleton} />}
		</View>
	);
}

const styles = StyleSheet.create({
	skeleton: {
		backgroundColor: COLORS.border,
	},
	inputContainer: {
		marginBottom: 20,
	},
	labelSkeleton: {
		marginBottom: 8,
	},
	helperSkeleton: {
		marginTop: 4,
	},
});
