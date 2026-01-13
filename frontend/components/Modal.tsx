// components/Modal.tsx
import React from 'react';
import {
	View,
	Text,
	Modal as RNModal,
	TouchableOpacity,
	StyleSheet,
	Platform,
	Pressable,
	ScrollView,
} from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';

export interface ModalButton {
	text: string;
	onPress?: () => void;
	style?: 'primary' | 'secondary' | 'danger';
	disabled?: boolean;
}

interface ModalProps {
	visible: boolean;
	title?: string;
	message?: string;
	children?: React.ReactNode;
	buttons?: ModalButton[];
	onClose?: () => void;
	closeOnBackdrop?: boolean;
	showCloseButton?: boolean;
	maxHeight?: number | string;
}

export const Modal: React.FC<ModalProps> = ({
	visible,
	title,
	message,
	children,
	buttons = [],
	onClose,
	closeOnBackdrop = true,
	showCloseButton = false,
	maxHeight,
}) => {
	const handleBackdropPress = () => {
		if (closeOnBackdrop && onClose) {
			onClose();
		}
	};

	const handleButtonPress = (button: ModalButton) => {
		if (button.onPress) {
			button.onPress();
		}
		if (onClose) {
			onClose();
		}
	};

	const getButtonStyle = (style?: string, disabled?: boolean) => {
		if (disabled) {
			return [styles.button, styles.disabledButton];
		}

		switch (style) {
			case 'secondary':
				return [styles.button, styles.secondaryButton];
			case 'danger':
				return [styles.button, styles.dangerButton];
			case 'primary':
			default:
				return [styles.button, styles.primaryButton];
		}
	};

	const getButtonTextStyle = (style?: string, disabled?: boolean) => {
		if (disabled) {
			return [styles.buttonText, styles.disabledButtonText];
		}

		switch (style) {
			case 'secondary':
				return [styles.buttonText, styles.secondaryButtonText];
			case 'danger':
				return [styles.buttonText, styles.dangerButtonText];
			case 'primary':
			default:
				return [styles.buttonText, styles.primaryButtonText];
		}
	};

	return (
		<RNModal
			visible={visible}
			transparent
			animationType='fade'
			onRequestClose={onClose}
		>
			<Pressable style={styles.overlay} onPress={handleBackdropPress}>
				<Pressable
					style={[styles.modalContainer, maxHeight && { maxHeight }]}
					onPress={(e) => e.stopPropagation()}
				>
					{showCloseButton && (
						<TouchableOpacity
							style={styles.closeButton}
							onPress={onClose}
							activeOpacity={0.7}
						>
							<Text style={styles.closeButtonText}>✕</Text>
						</TouchableOpacity>
					)}

					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.modalContent}>
							{title && <Text style={styles.title}>{title}</Text>}
							{message && <Text style={styles.message}>{message}</Text>}
							{children}
						</View>
					</ScrollView>

					{buttons.length > 0 && (
						<View style={styles.buttonContainer}>
							{buttons.map((button, index) => (
								<TouchableOpacity
									key={index}
									style={getButtonStyle(button.style, button.disabled)}
									onPress={() => !button.disabled && handleButtonPress(button)}
									activeOpacity={button.disabled ? 1 : 0.8}
									disabled={button.disabled}
								>
									<Text
										style={getButtonTextStyle(button.style, button.disabled)}
									>
										{button.text}
									</Text>
								</TouchableOpacity>
							))}
						</View>
					)}
				</Pressable>
			</Pressable>
		</RNModal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
		zIndex: 2000,
	},
	modalContainer: {
		width: '100%',
		maxWidth: Platform.select({
			web: 400,
			default: 340,
		}),
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		overflow: 'hidden',
		zIndex: 2001,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.25,
				shadowRadius: 4,
			},
			android: {
				elevation: 5,
			},
			web: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.25,
				shadowRadius: 4,
			},
		}),
	},
	scrollView: {
		flexGrow: 0,
	},
	scrollContent: {
		flexGrow: 1,
	},
	modalContent: {
		padding: 24,
	},
	closeButton: {
		position: 'absolute',
		top: 12,
		right: 12,
		zIndex: 1,
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: COLORS.background,
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeButtonText: {
		fontSize: 18,
		color: COLORS.textSecondary,
		fontWeight: FONT_WEIGHTS.medium,
	},
	title: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		textAlign: 'center',
		marginBottom: 12,
		color: COLORS.textPrimary,
	},
	message: {
		fontSize: FONT_SIZES.body,
		textAlign: 'center',
		marginBottom: 4,
		color: COLORS.textSecondary,
		lineHeight: 24,
	},
	buttonContainer: {
		paddingHorizontal: 24,
		paddingBottom: 24,
		paddingTop: 0,
		gap: 12,
	},
	button: {
		paddingVertical: 14,
		paddingHorizontal: 24,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 48,
	},
	primaryButton: {
		backgroundColor: COLORS.primary,
	},
	secondaryButton: {
		backgroundColor: COLORS.background,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	dangerButton: {
		backgroundColor: COLORS.error,
	},
	disabledButton: {
		backgroundColor: COLORS.primaryLight,
		opacity: 0.6,
	},
	buttonText: {
		fontSize: FONT_SIZES.button,
		fontWeight: FONT_WEIGHTS.medium,
	},
	primaryButtonText: {
		color: COLORS.textOnPrimary,
	},
	secondaryButtonText: {
		color: COLORS.textPrimary,
	},
	dangerButtonText: {
		color: COLORS.textOnPrimary,
	},
	disabledButtonText: {
		color: COLORS.textOnPrimary,
	},
});
