// components/SignUpScreen.tsx
import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from 'react-native';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useModal } from '@/hooks/useModal';
import Button from '@/components/Button';
import { Modal } from '@/components/Modal';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';

interface SignUpScreenProps {
	onNavigateToSignIn: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
	onNavigateToSignIn,
}) => {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const { signUp, isLoading, clearError } = useAuthStore();
	const { modalConfig, hideModal, showAlert, showSuccess, showError } =
		useModal();

	const handleSignUp = async () => {
		// Validation
		if (
			!name.trim() ||
			!email.trim() ||
			!password.trim() ||
			!confirmPassword.trim()
		) {
			showAlert('Error', 'Please fill in all fields');
			return;
		}

		if (!isValidEmail(email)) {
			showAlert('Error', 'Please enter a valid email address');
			return;
		}

		if (password !== confirmPassword) {
			showAlert('Error', 'Passwords do not match');
			return;
		}

		if (password.length < 6) {
			showAlert('Error', 'Password must be at least 6 characters long');
			return;
		}

		clearError();

		try {
			await signUp(email.trim().toLowerCase(), password, name.trim());

			// Success - show success modal and navigate
			showSuccess(
				'Success!',
				'Your account has been created successfully. Please sign in with your credentials.',
				() => {
					// Clear form fields
					setName('');
					setEmail('');
					setPassword('');
					setConfirmPassword('');
					// Navigate to sign in
					onNavigateToSignIn();
				}
			);
		} catch (err: any) {
			// Error - show error modal with retry option
			const errorMessage =
				err.message || 'Registration failed. Please try again.';
			showError('Registration Failed', errorMessage, () => {
				// Retry action - clear password fields for security
				setPassword('');
				setConfirmPassword('');
				clearError();
			});
		}
	};

	const isValidEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	};

	const getPasswordStrength = (password: string) => {
		if (password.length < 6) return { strength: 'Weak', color: COLORS.error };
		if (password.length < 8) return { strength: 'Medium', color: '#ffa502' };
		if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) {
			return { strength: 'Strong', color: COLORS.primary };
		}
		return { strength: 'Medium', color: '#ffa502' };
	};

	return (
		<>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView contentContainerStyle={styles.scrollContainer}>
					<View style={styles.formContainer}>
						<Text style={styles.title}>Create Account</Text>
						<Text style={styles.subtitle}>Sign up to get started</Text>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>Full Name</Text>
							<TextInput
								style={styles.input}
								placeholder='Enter your full name'
								placeholderTextColor={COLORS.textSecondary}
								value={name}
								onChangeText={setName}
								autoCapitalize='words'
								autoComplete='name'
								editable={!isLoading}
							/>
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
									autoComplete='password-new'
									editable={!isLoading}
								/>
								<TouchableOpacity
									style={styles.eyeButton}
									onPress={() => setShowPassword(!showPassword)}
								>
									<Text style={styles.eyeText}>
										{showPassword ? '🙈' : '👁'}
									</Text>
								</TouchableOpacity>
							</View>
							{password.length > 0 && (
								<View style={styles.passwordStrength}>
									<Text
										style={[
											styles.strengthText,
											{ color: getPasswordStrength(password).color },
										]}
									>
										Password strength: {getPasswordStrength(password).strength}
									</Text>
								</View>
							)}
						</View>

						<View style={styles.inputContainer}>
							<Text style={styles.label}>Confirm Password</Text>
							<View style={styles.passwordContainer}>
								<TextInput
									style={styles.passwordInput}
									placeholder='Confirm your password'
									placeholderTextColor={COLORS.textSecondary}
									value={confirmPassword}
									onChangeText={setConfirmPassword}
									secureTextEntry={!showConfirmPassword}
									autoComplete='password-new'
									editable={!isLoading}
								/>
								<TouchableOpacity
									style={styles.eyeButton}
									onPress={() => setShowConfirmPassword(!showConfirmPassword)}
								>
									<Text style={styles.eyeText}>
										{showConfirmPassword ? '🙈' : '👁'}
									</Text>
								</TouchableOpacity>
							</View>
							{confirmPassword.length > 0 && password !== confirmPassword && (
								<Text style={styles.errorText}>Passwords do not match</Text>
							)}
						</View>

						<Button
							title='Register'
							onPress={handleSignUp}
							disabled={isLoading}
							loading={isLoading}
						/>

						<View style={styles.divider}>
							<View style={styles.dividerLine} />
							<Text style={styles.dividerText}>or</Text>
							<View style={styles.dividerLine} />
						</View>

						<TouchableOpacity
							style={styles.signInLink}
							onPress={onNavigateToSignIn}
							disabled={isLoading}
						>
							<Text style={styles.signInLinkText}>
								Already have an account?{' '}
								<Text style={styles.signInLinkBold}>Sign In</Text>
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
	passwordStrength: {
		marginTop: 4,
	},
	strengthText: {
		fontSize: 12,
		fontWeight: FONT_WEIGHTS.medium,
	},
	errorText: {
		fontSize: 12,
		color: COLORS.error,
		marginTop: 4,
	},
	divider: {
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
	signInLink: {
		alignItems: 'center',
	},
	signInLinkText: {
		fontSize: 14,
		color: COLORS.textSecondary,
	},
	signInLinkBold: {
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.medium,
	},
});
