import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Switch,
	Platform,
} from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { Modal } from '@/components/Modal';
import Button from '@/components/Button';
import { UserPreferences, preferencesService } from '@/api/preferencesService';

interface UserPreferencesComponentProps {
	visible: boolean;
	onClose: () => void;
	onSave?: (preferences: UserPreferences) => void;
}

const ACTIVITY_LEVEL_OPTIONS = [
	{ value: 'sedentary', label: 'Mostly resting' },
	{ value: 'lightly_active', label: 'Light activity' },
	{ value: 'moderately_active', label: 'Regular activity' },
	{ value: 'very_active', label: 'Very active' },
	{ value: 'extremely_active', label: 'Extremely active' },
];

const SOCIAL_PREFERENCE_OPTIONS = [
	{ value: 'very_social', label: 'Love being with others' },
	{ value: 'moderately_social', label: 'Enjoy some company' },
	{ value: 'occasionally_social', label: 'Prefer small groups' },
	{ value: 'prefer_solitude', label: 'Enjoy quiet time' },
];

const STRESS_LEVEL_OPTIONS = [
	{ value: 'low', label: 'Generally calm' },
	{ value: 'moderate', label: 'Sometimes stressed' },
	{ value: 'high', label: 'Often stressed' },
];

const DIET_TYPE_OPTIONS = [
	{ value: 'omnivore', label: 'Regular diet' },
	{ value: 'vegetarian', label: 'Vegetarian' },
	{ value: 'vegan', label: 'Plant-based' },
	{ value: 'pescatarian', label: 'Fish and vegetables' },
	{ value: 'mediterranean', label: 'Mediterranean style' },
	{ value: 'low_sodium', label: 'Low salt' },
	{ value: 'diabetic_friendly', label: 'Diabetes-friendly' },
	{ value: 'other', label: 'Other special diet' },
];

const MOBILITY_LEVEL_OPTIONS = [
	{ value: 'fully_mobile', label: 'Move around easily' },
	{ value: 'uses_walking_aid', label: 'Use walking assistance' },
	{ value: 'wheelchair_user', label: 'Use wheelchair' },
	{ value: 'limited_mobility', label: 'Some movement difficulties' },
];

const TECH_COMFORT_OPTIONS = [
	{ value: 'very_comfortable', label: 'Very comfortable with technology' },
	{ value: 'comfortable', label: 'Comfortable with basics' },
	{ value: 'somewhat_comfortable', label: 'Need occasional help' },
	{ value: 'needs_assistance', label: 'Prefer assistance with technology' },
];

const NOTIFICATION_FREQUENCY_OPTIONS = [
	{ value: 'none', label: 'No reminders' },
	{ value: 'daily', label: 'Once daily' },
	{ value: 'twice_daily', label: 'Twice daily' },
	{ value: 'three_times_daily', label: 'Three times daily' },
];

const NOTIFICATION_TIME_OPTIONS = [
	{ value: 'morning', label: 'Morning (6 AM - 12 PM)' },
	{ value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' },
	{ value: 'evening', label: 'Evening (6 PM - 10 PM)' },
	{ value: 'flexible', label: 'Any time is fine' },
];

export default function UserPreferencesComponent({ visible, onClose, onSave }: UserPreferencesComponentProps) {
	const [preferences, setPreferences] = useState<Partial<UserPreferences>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [activeSection, setActiveSection] = useState<string | null>(null);
	const [showPicker, setShowPicker] = useState<string | null>(null);

	useEffect(() => {
		if (visible) {
			loadPreferences();
		}
	}, [visible]);

	const loadPreferences = async () => {
		setIsLoading(true);
		try {
			const userPrefs = await preferencesService.getPreferences();
			setPreferences(userPrefs);
		} catch (error) {
			console.log('No existing preferences found, starting with defaults');
			setPreferences({});
		} finally {
			setIsLoading(false);
		}
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const savedPreferences = await preferencesService.updatePreferences(preferences);
			onSave?.(savedPreferences);
			onClose();
		} catch (error) {
			console.error('Failed to save preferences:', error);
		} finally {
			setIsSaving(false);
		}
	};

	const updatePreference = (key: keyof UserPreferences, value: any) => {
		setPreferences(prev => ({
			...prev,
			[key]: value
		}));
	};

	const renderSelector = (
		title: string,
		currentValue: string | undefined,
		options: Array<{ value: string; label: string }>,
		onChange: (value: string) => void,
		pickerKey: string
	) => (
		<View style={styles.inputContainer}>
			<Text style={styles.label}>{title}</Text>
			<TouchableOpacity
				style={[styles.input, styles.pickerButton]}
				onPress={() => setShowPicker(pickerKey)}
				disabled={isLoading}
			>
				<Text style={[styles.pickerText, !currentValue && styles.placeholderText]}>
					{currentValue ? options.find(opt => opt.value === currentValue)?.label : `Select ${title.toLowerCase()}`}
				</Text>
				<Text style={styles.dropdownIcon}>▼</Text>
			</TouchableOpacity>
		</View>
	);

	const renderBooleanOption = (
		title: string,
		subtitle: string,
		currentValue: boolean | undefined,
		onChange: (value: boolean) => void
	) => (
		<View style={styles.switchContainer}>
			<View style={styles.switchTextContainer}>
				<Text style={styles.switchLabel}>{title}</Text>
				<Text style={styles.switchSubtitle}>{subtitle}</Text>
			</View>
			<Switch
				value={currentValue || false}
				onValueChange={onChange}
				trackColor={{ false: COLORS.border, true: COLORS.primary + '40' }}
				thumbColor={currentValue ? COLORS.primary : COLORS.textSecondary}
				disabled={isLoading}
			/>
		</View>
	);

	const renderSection = (title: string, sectionKey: string, children: React.ReactNode) => (
		<View style={styles.section}>
			<TouchableOpacity
				style={styles.sectionHeader}
				onPress={() => setActiveSection(activeSection === sectionKey ? null : sectionKey)}
			>
				<Text style={styles.sectionTitle}>{title}</Text>
				<Text style={[styles.sectionIcon, activeSection === sectionKey && styles.sectionIconExpanded]}>
					▼
				</Text>
			</TouchableOpacity>
			{activeSection === sectionKey && (
				<View style={styles.sectionContent}>
					{children}
				</View>
			)}
		</View>
	);

	const formatTimestamp = (timestamp: string | undefined) => {
		if (!timestamp) return 'Never updated';
		const date = new Date(timestamp);
		return 'Last updated: ' + date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	return (
		<Modal
			visible={visible}
			title="Health & Wellness Profile"
			onClose={onClose}
			closeOnBackdrop={false}
			showCloseButton={true}
		>
			<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<Text style={styles.loadingText}>Loading your preferences...</Text>
					</View>
				) : (
					<>
						<Text style={styles.description}>
							Our AI collects this data automatically. Review and correct what we've learned about you.
						</Text>

						{/* Health Conditions */}
						{renderSection("Health Information", "health", (
							<>
								{renderBooleanOption(
									"Diabetes management",
									"I manage diabetes",
									preferences.is_diabetic,
									(value) => updatePreference('is_diabetic', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.is_diabetic_updated_at)}
								</Text>

								{renderBooleanOption(
									"Blood pressure monitoring",
									"I monitor my blood pressure",
									preferences.is_hypertensive,
									(value) => updatePreference('is_hypertensive', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.is_hypertensive_updated_at)}
								</Text>

								{renderBooleanOption(
									"Heart health considerations",
									"I have heart health considerations",
									preferences.has_heart_disease,
									(value) => updatePreference('has_heart_disease', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.has_heart_disease_updated_at)}
								</Text>

								{renderBooleanOption(
									"Joint comfort",
									"I experience joint discomfort",
									preferences.has_arthritis,
									(value) => updatePreference('has_arthritis', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.has_arthritis_updated_at)}
								</Text>

								{renderBooleanOption(
									"Bone health awareness",
									"I'm mindful of bone health",
									preferences.has_osteoporosis,
									(value) => updatePreference('has_osteoporosis', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.has_osteoporosis_updated_at)}
								</Text>

								{renderBooleanOption(
									"Vision considerations",
									"I have vision considerations",
									preferences.has_vision_impairment,
									(value) => updatePreference('has_vision_impairment', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.has_vision_impairment_updated_at)}
								</Text>

								{renderBooleanOption(
									"Hearing considerations",
									"I have hearing considerations",
									preferences.has_hearing_impairment,
									(value) => updatePreference('has_hearing_impairment', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.has_hearing_impairment_updated_at)}
								</Text>

								{renderBooleanOption(
									"Memory support",
									"I appreciate memory support",
									preferences.has_memory_concerns,
									(value) => updatePreference('has_memory_concerns', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.has_memory_concerns_updated_at)}
								</Text>
							</>
						))}

						{/* Activity Preferences */}
						{renderSection("Activity Preferences", "activity", (
							<>
								{renderSelector(
									"Activity level",
									preferences.activity_level,
									ACTIVITY_LEVEL_OPTIONS,
									(value) => updatePreference('activity_level', value),
									'activity_level'
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.activity_level_updated_at)}
								</Text>

								<View style={styles.inputContainer}>
									<Text style={styles.label}>Weekly activity goal (minutes)</Text>
									<TextInput
										style={styles.input}
										placeholder="150"
										placeholderTextColor={COLORS.textSecondary}
										value={preferences.exercise_goal_minutes_per_week?.toString() || ''}
										onChangeText={(text) => updatePreference('exercise_goal_minutes_per_week', parseInt(text) || 150)}
										keyboardType="numeric"
										editable={!isLoading}
									/>
									<Text style={styles.helperText}>Recommended: 150 minutes per week</Text>
								</View>
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.exercise_goal_minutes_per_week_updated_at)}
								</Text>

								{renderSelector(
									"Social preference",
									preferences.social_preference,
									SOCIAL_PREFERENCE_OPTIONS,
									(value) => updatePreference('social_preference', value),
									'social_preference'
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.social_preference_updated_at)}
								</Text>

								{renderBooleanOption(
									"Group activities",
									"I enjoy group activities",
									preferences.interested_in_group_activities,
									(value) => updatePreference('interested_in_group_activities', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.interested_in_group_activities_updated_at)}
								</Text>
							</>
						))}

						{/* Wellness Preferences */}
						{renderSection("Wellness Preferences", "wellness", (
							<>
								{renderSelector(
									"Stress level",
									preferences.stress_level,
									STRESS_LEVEL_OPTIONS,
									(value) => updatePreference('stress_level', value),
									'stress_level'
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.stress_level_updated_at)}
								</Text>

								{renderBooleanOption(
									"Mindfulness activities",
									"I'm interested in mindfulness",
									preferences.interested_in_mindfulness,
									(value) => updatePreference('interested_in_mindfulness', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.interested_in_mindfulness_updated_at)}
								</Text>

								{renderBooleanOption(
									"Meditation practices",
									"I'm interested in meditation",
									preferences.interested_in_meditation,
									(value) => updatePreference('interested_in_meditation', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.interested_in_meditation_updated_at)}
								</Text>

								{renderSelector(
									"Eating preferences",
									preferences.diet_type,
									DIET_TYPE_OPTIONS,
									(value) => updatePreference('diet_type', value),
									'diet_type'
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.diet_type_updated_at)}
								</Text>

								<View style={styles.inputContainer}>
									<Text style={styles.label}>Daily water goal (glasses)</Text>
									<TextInput
										style={styles.input}
										placeholder="8"
										placeholderTextColor={COLORS.textSecondary}
										value={preferences.water_intake_goal_liters ? (preferences.water_intake_goal_liters * 4).toString() : ''}
										onChangeText={(text) => updatePreference('water_intake_goal_liters', (parseInt(text) || 8) / 4)}
										keyboardType="numeric"
										editable={!isLoading}
									/>
									<Text style={styles.helperText}>Recommended: 8 glasses per day</Text>
								</View>
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.water_intake_goal_liters_updated_at)}
								</Text>
							</>
						))}

						{/* Independence & Mobility */}
						{renderSection("Mobility & Independence", "mobility", (
							<>
								{renderSelector(
									"Mobility level",
									preferences.mobility_level,
									MOBILITY_LEVEL_OPTIONS,
									(value) => updatePreference('mobility_level', value),
									'mobility_level'
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.mobility_level_updated_at)}
								</Text>

								{renderBooleanOption(
									"Transportation assistance",
									"I sometimes need transportation help",
									preferences.needs_transportation_assistance,
									(value) => updatePreference('needs_transportation_assistance', value)
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.needs_transportation_assistance_updated_at)}
								</Text>

								{renderSelector(
									"Technology comfort",
									preferences.tech_comfort_level,
									TECH_COMFORT_OPTIONS,
									(value) => updatePreference('tech_comfort_level', value),
									'tech_comfort_level'
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.tech_comfort_level_updated_at)}
								</Text>
							</>
						))}

						{/* Notification Preferences */}
						{renderSection("Reminder Preferences", "notifications", (
							<>
								{renderSelector(
									"Nudge frequency",
									preferences.notification_frequency,
									NOTIFICATION_FREQUENCY_OPTIONS,
									(value) => updatePreference('notification_frequency', value),
									'notification_frequency'
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.notification_frequency_updated_at)}
								</Text>

								{renderSelector(
									"Nudge time",
									preferences.notification_time_preference,
									NOTIFICATION_TIME_OPTIONS,
									(value) => updatePreference('notification_time_preference', value),
									'notification_time_preference'
								)}
								<Text style={styles.timestampText}>
									{formatTimestamp(preferences.notification_time_preference_updated_at)}
								</Text>
							</>
						))}

						<View style={styles.buttonContainer}>
							<Button
								title="Save Preferences"
								onPress={handleSave}
								disabled={isSaving}
								loading={isSaving}
							/>
						</View>
					</>
				)}
			</ScrollView>

			{/* Picker Modal */}
			{showPicker && (
				<Modal
					visible={!!showPicker}
					title="Select Option"
					onClose={() => setShowPicker(null)}
					closeOnBackdrop={true}
					showCloseButton={true}
				>
					<View style={styles.pickerContainer}>
						{(() => {
							let options: Array<{ value: string; label: string }> = [];
							let currentValue = '';
							let onChange = (value: string) => {};

							switch (showPicker) {
								case 'activity_level':
									options = ACTIVITY_LEVEL_OPTIONS;
									currentValue = preferences.activity_level || '';
									onChange = (value) => updatePreference('activity_level', value);
									break;
								case 'social_preference':
									options = SOCIAL_PREFERENCE_OPTIONS;
									currentValue = preferences.social_preference || '';
									onChange = (value) => updatePreference('social_preference', value);
									break;
								case 'stress_level':
									options = STRESS_LEVEL_OPTIONS;
									currentValue = preferences.stress_level || '';
									onChange = (value) => updatePreference('stress_level', value);
									break;
								case 'diet_type':
									options = DIET_TYPE_OPTIONS;
									currentValue = preferences.diet_type || '';
									onChange = (value) => updatePreference('diet_type', value);
									break;
								case 'mobility_level':
									options = MOBILITY_LEVEL_OPTIONS;
									currentValue = preferences.mobility_level || '';
									onChange = (value) => updatePreference('mobility_level', value);
									break;
								case 'tech_comfort_level':
									options = TECH_COMFORT_OPTIONS;
									currentValue = preferences.tech_comfort_level || '';
									onChange = (value) => updatePreference('tech_comfort_level', value);
									break;
								case 'notification_frequency':
									options = NOTIFICATION_FREQUENCY_OPTIONS;
									currentValue = preferences.notification_frequency || '';
									onChange = (value) => updatePreference('notification_frequency', value);
									break;
								case 'notification_time_preference':
									options = NOTIFICATION_TIME_OPTIONS;
									currentValue = preferences.notification_time_preference || '';
									onChange = (value) => updatePreference('notification_time_preference', value);
									break;
							}

							return options.map((option) => (
								<TouchableOpacity
									key={option.value}
									style={[
										styles.pickerOption,
										currentValue === option.value && styles.selectedPickerOption
									]}
									onPress={() => {
										onChange(option.value);
										setShowPicker(null);
									}}
								>
									<Text
										style={[
											styles.pickerOptionText,
											currentValue === option.value && styles.selectedPickerOptionText
										]}
									>
										{option.label}
									</Text>
								</TouchableOpacity>
							));
						})()}
					</View>
				</Modal>
			)}
		</Modal>
	);
}

const styles = StyleSheet.create({
	container: {
		maxHeight: 600,
	},
	loadingContainer: {
		padding: 40,
		alignItems: 'center',
	},
	loadingText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
	},
	description: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		marginBottom: 24,
		lineHeight: 20,
	},
	section: {
		marginBottom: 16,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		overflow: 'hidden',
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		backgroundColor: COLORS.surface,
	},
	sectionTitle: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textPrimary,
	},
	sectionIcon: {
		fontSize: 12,
		color: COLORS.textSecondary,
		transform: [{ rotate: '-90deg' }],
	},
	sectionIconExpanded: {
		transform: [{ rotate: '0deg' }],
	},
	sectionContent: {
		padding: 16,
		backgroundColor: COLORS.background,
	},
	inputContainer: {
		marginBottom: 16,
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
		backgroundColor: COLORS.surface,
		color: COLORS.textPrimary,
	},
	helperText: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
	timestampText: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
		fontStyle: 'italic',
		marginTop: 4,
		marginBottom: 8,
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
	switchContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		paddingVertical: 8,
	},
	switchTextContainer: {
		flex: 1,
		marginRight: 16,
	},
	switchLabel: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textPrimary,
		marginBottom: 2,
	},
	switchSubtitle: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
	},
	buttonContainer: {
		marginTop: 24,
		marginBottom: 16,
	},
	pickerContainer: {
		paddingTop: 16,
		maxHeight: 300,
	},
	pickerOption: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	selectedPickerOption: {
		backgroundColor: COLORS.primary + '20',
	},
	pickerOptionText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
	},
	selectedPickerOptionText: {
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.medium,
	},
});