// components/SignInScreen.tsx
import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from 'react-native';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useModal } from '@/hooks/useModal';
import Button from '@/components/Button';
import { Modal } from '@/components/Modal';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';

interface SignInScreenProps {
	onNavigateToSignUp: () => void;
	onSuccessfulLogin?: () => void; // Add callback for successful login
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
	onNavigateToSignUp,
	onSuccessfulLogin,
}) => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);

	const { signIn, signInWithGoogle, isLoading, clearError } = useAuthStore();
	const { modalConfig, hideModal, showAlert, showError } = useModal();

	const handleSignIn = async () => {
		// Validation
		if (!email.trim() || !password.trim()) {
			showAlert('Error', 'Please fill in all fields');
			return;
		}

		// if (!isValidEmail(email)) {
		// 	showAlert('Error', 'Please enter a valid email address');
		// 	return;
		// }

		clearError();

		try {
			await signIn(email.trim().toLowerCase(), password);

			// Clear form fields on success
			setEmail('');
			setPassword('');

			// Navigate to the main app (ChatScreen or Dashboard)
			if (onSuccessfulLogin) {
				onSuccessfulLogin();
			}
		} catch (err: any) {
			const errorMessage =
				err.message || 'Failed to sign in. Please check your credentials.';
			showError('Sign In Failed', errorMessage, () => {
				// Retry - clear password for security
				setPassword('');
				clearError();
			});
		}
	};

	const handleGoogleSignIn = async () => {
		clearError();

		try {
			await signInWithGoogle();

			// Navigate to the main app on success
			if (onSuccessfulLogin) {
				onSuccessfulLogin();
			}
		} catch (err: any) {
			const errorMessage =
				err.message || 'Google sign-in failed. Please try again.';
			showAlert('Sign In Failed', errorMessage);
		}
	};

	const isValidEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	return (
		<>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView contentContainerStyle={styles.scrollContainer}>
					<View style={styles.formContainer}>
						<Text style={styles.title}>Welcome Back</Text>
						<Text style={styles.subtitle}>Sign in to your account</Text>

						{/* Google Sign-In Button */}
						<TouchableOpacity
							style={styles.googleButton}
							onPress={handleGoogleSignIn}
							disabled={isLoading}
						>
							{isLoading ? (
								<ActivityIndicator color={COLORS.textSecondary} size='small' />
							) : (
								<>
									<Text style={styles.googleIcon}>🇬</Text>
									<Text style={styles.googleButtonText}>
										Continue with Google
									</Text>
								</>
							)}
						</TouchableOpacity>

						<View style={styles.divider}>
							<View style={styles.dividerLine} />
							<Text style={styles.dividerText}>or continue with email</Text>
							<View style={styles.dividerLine} />
						</View>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>Email</Text>
							<TextInput
								style={styles.input}
								placeholder='Enter your email'
								placeholderTextColor={COLORS.textSecondary}
								value={email}
								onChangeText={setEmail}
								keyboardType='email-address'
								autoCapitalize='none'
								autoComplete='email'
								editable={!isLoading}
							/>
						</View>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>Password</Text>
							<View style={styles.passwordContainer}>
								<TextInput
									style={styles.passwordInput}
									placeholder='Enter your password'
									placeholderTextColor={COLORS.textSecondary}
									value={password}
									onChangeText={setPassword}
									secureTextEntry={!showPassword}
									autoComplete='password'
									editable={!isLoading}
								/>
								<TouchableOpacity
									style={styles.eyeButton}
									onPress={() => setShowPassword(!showPassword)}
								>
									<Text style={styles.eyeText}>
										{showPassword ? '🙈' : '👁️'}
									</Text>
								</TouchableOpacity>
							</View>
						</View>

						<Button
							title='Sign In'
							onPress={handleSignIn}
							disabled={isLoading}
							loading={isLoading}
						/>

						<View style={styles.bottomDivider}>
							<View style={styles.dividerLine} />
							<Text style={styles.dividerText}>or</Text>
							<View style={styles.dividerLine} />
						</View>

						<TouchableOpacity
							style={styles.signUpLink}
							onPress={onNavigateToSignUp}
							disabled={isLoading}
						>
							<Text style={styles.signUpLinkText}>
								Dont have an account?{' '}
								<Text style={styles.signUpLinkBold}>Sign Up</Text>
							</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			{/* Modal Component */}
			<Modal
				visible={modalConfig.visible}
				title={modalConfig.title}
				message={modalConfig.message}
				buttons={modalConfig.buttons}
				onClose={hideModal}
				closeOnBackdrop={modalConfig.closeOnBackdrop}
				showCloseButton={modalConfig.showCloseButton}
			/>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	scrollContainer: {
		flexGrow: 1,
		justifyContent: 'center',
		padding: 20,
	},
	formContainer: {
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		padding: 24,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
	},
	title: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		textAlign: 'center',
		marginBottom: 8,
		color: COLORS.textPrimary,
	},
	subtitle: {
		fontSize: FONT_SIZES.subheading,
		textAlign: 'center',
		marginBottom: 32,
		color: COLORS.textSecondary,
	},
	googleButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: COLORS.surface,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		padding: 12,
		marginBottom: 24,
		minHeight: 48,
	},
	googleIcon: {
		fontSize: 18,
		marginRight: 12,
	},
	googleButtonText: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textPrimary,
	},
	inputContainer: {
		marginBottom: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: FONT_WEIGHTS.medium,
		marginBottom: 8,
		color: COLORS.textPrimary,
	},
	input: {
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		padding: 12,
		fontSize: FONT_SIZES.body,
		backgroundColor: COLORS.background,
		color: COLORS.textPrimary,
	},
	passwordContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		backgroundColor: COLORS.background,
	},
	passwordInput: {
		flex: 1,
		padding: 12,
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
	},
	eyeButton: {
		padding: 12,
	},
	eyeText: {
		fontSize: 16,
	},
	divider: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
	},
	bottomDivider: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 24,
	},
	dividerLine: {
		flex: 1,
		height: 1,
		backgroundColor: COLORS.border,
	},
	dividerText: {
		marginHorizontal: 16,
		color: COLORS.textSecondary,
		fontSize: 14,
	},
	signUpLink: {
		alignItems: 'center',
	},
	signUpLinkText: {
		fontSize: 14,
		color: COLORS.textSecondary,
	},
	signUpLinkBold: {
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.medium,
	},
});
