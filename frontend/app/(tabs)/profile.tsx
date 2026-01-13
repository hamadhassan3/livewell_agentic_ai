import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useModal } from '@/hooks/useModal';
import Button from '@/components/Button';
import { Modal } from '@/components/Modal';
import UserPreferences from '@/components/UserPreferences';
import { Skeleton, SkeletonInput } from '@/components/Skeleton';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { UpdateProfileRequest } from '@/api/profileService';

const GENDER_OPTIONS = [
	{ value: 'M', label: 'Male' },
	{ value: 'F', label: 'Female' },
	{ value: 'O', label: 'Other' },
	{ value: 'P', label: 'Prefer not to say' },
];

export default function ProfileScreen() {
	const { user, updateUserProfile, signOut, isLoading, loadUserProfile } = useAuthStore();
	const { modalConfig, hideModal, showSuccess, showError, showConfirm } = useModal();

	// Form state
	const [name, setName] = useState('');
	const [gender, setGender] = useState('');
	const [dateOfBirth, setDateOfBirth] = useState('');
	const [height, setHeight] = useState('');
	const [weight, setWeight] = useState('');
	const [showGenderPicker, setShowGenderPicker] = useState(false);
	const [isLoadingProfile, setIsLoadingProfile] = useState(false);
	const [showPreferences, setShowPreferences] = useState(false);

	// Fetch profile data when screen comes into focus
	// Note: AuthProvider ensures auth is initialized and user exists before this component renders
	useFocusEffect(
		React.useCallback(() => {
			let isCancelled = false;

			const fetchProfile = async () => {
				setIsLoadingProfile(true);
				try {
					console.log('[Profile] Fetching profile data on focus...');
					await loadUserProfile();
					if (!isCancelled) {
						console.log('[Profile] Profile loaded successfully');
					}
				} catch (error) {
					if (!isCancelled) {
						console.error('[Profile] Failed to load profile:', error);
						showError(
							'Failed to load profile',
							'Unable to fetch your profile data. Please try again.',
							() => fetchProfile()
						);
					}
				} finally {
					if (!isCancelled) {
						setIsLoadingProfile(false);
					}
				}
			};

			fetchProfile();

			// Cleanup function to prevent state updates if component unmounts
			return () => {
				isCancelled = true;
			};
		}, [loadUserProfile, showError])
	);

	// Initialize form with user data whenever user state changes
	useEffect(() => {
		console.log('User state changed, updating form fields:', user);
		if (user) {
			console.log('Populating form with:', {
				name: user.name,
				gender: user.gender,
				date_of_birth: user.date_of_birth,
				height: user.height,
				weight: user.weight
			});
			setName(user.name || '');
			setGender(user.gender || '');
			setDateOfBirth(user.date_of_birth || '');
			setHeight(user.height?.toString() || '');
			setWeight(user.weight?.toString() || '');
		} else {
			console.log('User is null, clearing form fields');
			setName('');
			setGender('');
			setDateOfBirth('');
			setHeight('');
			setWeight('');
		}
	}, [user]);

	const handleSave = async () => {
		try {
			const profileData: UpdateProfileRequest = {};

			// Only include fields that have values
			if (name.trim()) profileData.name = name.trim();
			if (gender) profileData.gender = gender;
			if (dateOfBirth) profileData.date_of_birth = dateOfBirth;
			if (height) profileData.height = parseFloat(height);
			if (weight) profileData.weight = parseFloat(weight);

			await updateUserProfile(profileData);

			showSuccess(
				'Profile Updated',
				'Your profile has been updated successfully!',
				() => {
					// Profile data is automatically updated in session storage
					console.log('Profile updated and session refreshed');
				}
			);
		} catch (error: any) {
			showError(
				'Update Failed',
				error.message || 'Failed to update profile. Please try again.',
				() => {
					console.log('Retry profile update');
				}
			);
		}
	};

	const validateDate = (date: string) => {
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		return dateRegex.test(date);
	};

	const validateNumber = (value: string) => {
		const num = parseFloat(value);
		return !isNaN(num) && num > 0;
	};

	const isFormValid = () => {
		return (
			(!dateOfBirth || validateDate(dateOfBirth)) &&
			(!height || validateNumber(height)) &&
			(!weight || validateNumber(weight))
		);
	};

	const getSelectedGenderLabel = () => {
		const selected = GENDER_OPTIONS.find(option => option.value === gender);
		return selected ? selected.label : 'Select Gender';
	};

	const handleLogout = async () => {
		showConfirm(
			'Log Out',
			'Are you sure you want to log out?',
			async () => {
				try {
					console.log('Logout initiated by user');
					await signOut();
					console.log('User logged out successfully - navigation will happen automatically');
					// Navigation to login screen happens automatically via app/index.tsx
					// when isAuthenticated becomes false
				} catch (error) {
					console.error('Logout error:', error);
					showError(
						'Logout Failed',
						'Failed to log out. Please try again.',
						() => handleLogout()
					);
				}
			},
			undefined, // onCancel - let it use default behavior
			{
				confirmText: 'Log Out',
				confirmStyle: 'danger'
			}
		);
	};

	return (
		<>
			<KeyboardAvoidingView
				style={styles.container}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<ScrollView contentContainerStyle={styles.scrollContainer}>
					<View style={styles.header}>
						<Text style={styles.title}>Profile</Text>
						<Text style={styles.subtitle}>
							{isLoadingProfile ? 'Loading your profile...' : 'Update your personal information'}
						</Text>
					</View>

					<View style={styles.formContainer}>
						{isLoadingProfile ? (
							<>
								{/* Skeleton loaders */}
								<SkeletonInput label={true} helperText={false} />
								<SkeletonInput label={true} helperText={false} />
								<SkeletonInput label={true} helperText={true} />
								<SkeletonInput label={true} helperText={true} />
								<SkeletonInput label={true} helperText={true} />

								{/* Button skeleton */}
								<Skeleton width="100%" height={48} style={{ marginTop: 4 }} />

								{/* Advanced section skeleton */}
								<View style={styles.advancedSection}>
									<Skeleton width={180} height={24} style={{ marginBottom: 8 }} />
									<Skeleton width="90%" height={16} style={{ marginBottom: 12 }} />
									<Skeleton width="100%" height={48} />
								</View>

								{/* Logout button skeleton */}
								<View style={styles.logoutContainer}>
									<Skeleton width="100%" height={48} />
								</View>
							</>
						) : (
							<>
								{/* Name */}
								<View style={styles.inputContainer}>
									<Text style={styles.label}>Name (optional)</Text>
									<TextInput
										style={styles.input}
										placeholder="Enter your name"
										placeholderTextColor={COLORS.textSecondary}
										value={name}
										onChangeText={setName}
										autoCapitalize="words"
										editable={!isLoading}
									/>
								</View>

								{/* Gender */}
								<View style={styles.inputContainer}>
									<Text style={styles.label}>Gender (optional)</Text>
									<TouchableOpacity
										style={[styles.input, styles.pickerButton]}
										onPress={() => setShowGenderPicker(true)}
										disabled={isLoading}
									>
										<Text
											style={[
												styles.pickerText,
												!gender && styles.placeholderText
											]}
										>
											{getSelectedGenderLabel()}
										</Text>
										<Text style={styles.dropdownIcon}>▼</Text>
									</TouchableOpacity>
								</View>

								{/* Date of Birth */}
								<View style={styles.inputContainer}>
									<Text style={styles.label}>Date of Birth (optional)</Text>
									<TextInput
										style={styles.input}
										placeholder="YYYY-MM-DD"
										placeholderTextColor={COLORS.textSecondary}
										value={dateOfBirth}
										onChangeText={setDateOfBirth}
										editable={!isLoading}
									/>
									<Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 1990-01-15)</Text>
								</View>

								{/* Height */}
								<View style={styles.inputContainer}>
									<Text style={styles.label}>Height (optional)</Text>
									<TextInput
										style={styles.input}
										placeholder="Enter height in cm"
										placeholderTextColor={COLORS.textSecondary}
										value={height}
										onChangeText={setHeight}
										keyboardType="numeric"
										editable={!isLoading}
									/>
									<Text style={styles.helperText}>Height in centimeters (e.g., 175.5)</Text>
								</View>

								{/* Weight */}
								<View style={styles.inputContainer}>
									<Text style={styles.label}>Weight (optional)</Text>
									<TextInput
										style={styles.input}
										placeholder="Enter weight in kg"
										placeholderTextColor={COLORS.textSecondary}
										value={weight}
										onChangeText={setWeight}
										keyboardType="numeric"
										editable={!isLoading}
									/>
									<Text style={styles.helperText}>Weight in kilograms (e.g., 70.5)</Text>
								</View>

								{/* Calculated fields display */}
								{user?.age && (
									<View style={styles.calculatedField}>
										<Text style={styles.calculatedLabel}>Age:</Text>
										<Text style={styles.calculatedValue}>{user.age} years</Text>
									</View>
								)}

								{user?.bmi && (
									<View style={styles.calculatedField}>
										<Text style={styles.calculatedLabel}>BMI:</Text>
										<Text style={styles.calculatedValue}>{user.bmi}</Text>
									</View>
								)}

								<Button
									title="Save Profile"
									onPress={handleSave}
									disabled={isLoading || !isFormValid()}
									loading={isLoading}
								/>

								{/* Advanced Options Section */}
								<View style={styles.advancedSection}>
									<Text style={styles.advancedTitle}>Advanced Options</Text>
									<Text style={styles.advancedDescription}>
										Our AI automatically collects your wellness data
									</Text>
									<Text style={styles.aiNotice}>
										💡 Review and update what our AI has learned about you
									</Text>
									<Button
										title="Health & Wellness Profile"
										onPress={() => setShowPreferences(true)}
										disabled={isLoading}
									/>
								</View>

								<View style={styles.logoutContainer}>
									<Button
										title="Log Out"
										onPress={handleLogout}
										disabled={isLoading}
										variant="secondary"
									/>
								</View>
							</>
						)}
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			{/* Gender Picker Modal */}
			{showGenderPicker && (
				<Modal
					visible={showGenderPicker}
					title="Select Gender"
					onClose={() => setShowGenderPicker(false)}
					closeOnBackdrop={true}
					showCloseButton={true}
				>
					<View style={styles.genderPickerContainer}>
						{GENDER_OPTIONS.map((option) => (
							<TouchableOpacity
								key={option.value}
								style={[
									styles.genderOption,
									gender === option.value && styles.selectedGenderOption
								]}
								onPress={() => {
									setGender(option.value);
									setShowGenderPicker(false);
								}}
							>
								<Text
									style={[
										styles.genderOptionText,
										gender === option.value && styles.selectedGenderOptionText
									]}
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</Modal>
			)}

			{/* Preferences Modal */}
			<UserPreferences
				visible={showPreferences}
				onClose={() => setShowPreferences(false)}
				onSave={() => {
					// Preferences saved successfully
					console.log('Preferences saved');
				}}
			/>

			{/* Success/Error Modal */}
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
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	scrollContainer: {
		flexGrow: 1,
		padding: 20,
	},
	header: {
		marginBottom: 24,
		paddingTop: 20,
	},
	title: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
	},
	formContainer: {
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
	},
	inputContainer: {
		marginBottom: 20,
	},
	label: {
		fontSize: FONT_SIZES.body,
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
	helperText: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
	pickerButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	pickerText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
	},
	placeholderText: {
		color: COLORS.textSecondary,
	},
	dropdownIcon: {
		fontSize: 12,
		color: COLORS.textSecondary,
	},
	calculatedField: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		marginBottom: 16,
	},
	calculatedLabel: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textSecondary,
	},
	calculatedValue: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.primary,
	},
	genderPickerContainer: {
		paddingTop: 16,
	},
	genderOption: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	selectedGenderOption: {
		backgroundColor: COLORS.primary + '20',
	},
	genderOptionText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
	},
	selectedGenderOptionText: {
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.medium,
	},
	advancedSection: {
		marginTop: 32,
		paddingTop: 20,
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
		marginBottom: 16,
	},
	advancedTitle: {
		fontSize: 20,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginBottom: 8,
	},
	advancedDescription: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
		marginBottom: 12,
		lineHeight: 20,
	},
	aiNotice: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.primary,
		marginBottom: 16,
		lineHeight: 20,
		fontStyle: 'italic',
	},
	logoutContainer: {
		marginTop: 32,
		paddingTop: 20,
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
	},
});