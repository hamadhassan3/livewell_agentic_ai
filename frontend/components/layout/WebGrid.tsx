import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface WebGridProps {
	children: React.ReactNode;
	columns?: number;
	gap?: number;
	style?: ViewStyle;
}

/**
 * Web-optimized grid layout.
 * Creates a multi-column grid on web, single column on small screens.
 */
export function WebGrid({ children, columns = 2, gap = 16, style }: WebGridProps) {
	const itemWidth = `${100 / columns}%`;

	return (
		<View style={[styles.grid, { gap }, style]}>
			{React.Children.map(children, (child, index) => (
				<View style={[styles.gridItem, { width: itemWidth }]}>
					{child}
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		width: '100%',
	},
	gridItem: {
		minWidth: 300,
	},
});
