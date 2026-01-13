import React from 'react';

import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
} from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

interface ButtonProps {
	title: string;
	onPress: () => void;
	disabled?: boolean;
	loading?: boolean;
	variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({
	title,
	onPress,
	disabled,
	loading,
	variant = 'primary',
}) => {
	const buttonStyle = variant === 'secondary' ? styles.secondaryButton : styles.button;
	const textStyle = variant === 'secondary' ? styles.secondaryText : styles.text;
	const activityColor = variant === 'secondary' ? COLORS.primary : COLORS.textOnPrimary;

	return (
		<TouchableOpacity
			style={[buttonStyle, (disabled || loading) && styles.disabled]}
			onPress={onPress}
			disabled={disabled || loading}
		>
			{loading ? (
				<ActivityIndicator color={activityColor} />
			) : (
				<Text style={textStyle}>{title}</Text>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	button: {
		backgroundColor: COLORS.primary,
		padding: 18,
		borderRadius: 12,
		marginHorizontal: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 20,
	},
	secondaryButton: {
		backgroundColor: 'transparent',
		padding: 18,
		borderRadius: 12,
		marginHorizontal: 20,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 20,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	disabled: {
		backgroundColor: COLORS.primaryLight,
	},
	text: {
		color: COLORS.textOnPrimary,
		fontSize: FONT_SIZES.button,
		fontWeight: FONT_WEIGHTS.bold,
	},
	secondaryText: {
		color: COLORS.textSecondary,
		fontSize: FONT_SIZES.button,
		fontWeight: FONT_WEIGHTS.medium,
	},
});

export default Button;
