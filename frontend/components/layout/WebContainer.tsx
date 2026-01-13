import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/theme';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface WebContainerProps {
	children: React.ReactNode;
	maxWidth?: number;
	style?: ViewStyle;
}

/**
 * Web-optimized container with max-width and centered content.
 * Responsive padding based on screen size.
 */
export function WebContainer({ children, maxWidth = 1200, style }: WebContainerProps) {
	const { isMobile, isTablet } = useMediaQuery();

	// Adjust padding based on screen size
	const paddingHorizontal = isMobile ? 16 : isTablet ? 20 : 24;
	const paddingVertical = isMobile ? 16 : 20;

	return (
		<View style={[
			styles.container,
			{
				maxWidth,
				paddingHorizontal,
				paddingVertical,
				marginTop: isMobile ? 60 : 0, // Account for mobile header
			},
			style
		]}>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		marginHorizontal: 'auto',
	},
});
