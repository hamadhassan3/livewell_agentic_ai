import GoalSettingForm from '@/components/GoalSettingForm';
import { Modal } from '@/components/Modal';
import ProgressBar from '@/components/ProgressBar';
import { WebContainer } from '@/components/layout';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { useModal } from '@/hooks/useModal';
import { useGoalStore } from '@/stores/goalStore';
import { Frequency, GoalCategory } from '@/types';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const TOTAL_STEPS = 3;

const GoalSettingWeb: React.FC = () => {
	const router = useRouter();
	const { addGoal, isLoading, error } = useGoalStore();

	const { modalConfig, hideModal, showError, showConfirm } = useModal();

	// State for the entire wizard form
	const [step, setStep] = useState(1);
	const [selectedFrequency, setSelectedFrequency] = useState<Frequency | null>(
		null
	);
	const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(
		null
	);
	const [goalTitle, setGoalTitle] = useState('');

	/**
	 * Resets the entire form back to its initial state (Step 1).
	 */
	const resetForm = () => {
		setStep(1);
		setSelectedFrequency(null);
		setSelectedCategory(null);
		setGoalTitle('');
	};

	/**
	 * Validates the current step and moves to the next one if valid.
	 */
	const handleNext = () => {
		if (step === 1 && !selectedFrequency) {
			showError('Error!', 'Please select a frequency to continue.');
			return;
		}
		if (step === 2 && !selectedCategory) {
			showError('Error!', 'Please select a category to continue.');
			return;
		}
		if (step < TOTAL_STEPS) {
			setStep(step + 1);
		}
	};

	/**
	 * Moves to the previous step.
	 */
	const handleBack = () => {
		if (step > 1) {
			setStep(step - 1);
		}
	};

	/**
	 * Handles the final submission of the form.
	 */
	const handleSubmit = async () => {
		if (!goalTitle.trim()) {
			showError('Error!', 'Please describe your goal to continue.');
			return;
		}

		// We can safely assume frequency and category are selected due to the stepper validation
		const success = await addGoal({
			frequency: selectedFrequency!,
			category: selectedCategory!,
			title: goalTitle,
		});

		if (success) {
			showConfirm(
				'Goal Set!',
				'You can view your new goal on your dashboard.',
				() => {
					resetForm();
				},
				() => {
					resetForm();
					router.navigate('/(tabs)/goals');
				},
				{
					confirmText: 'Add Another',
					cancelText: 'Go to Goals',
				}
			);
		}
	};

	return (
		<>
			<View style={styles.container}>
				<WebContainer maxWidth={1200} style={styles.webContainer}>
					<View style={styles.header}>
						<Text style={styles.headerTitle}>Goal Setting</Text>
						<Text style={styles.headerSubtitle}>Create and track your wellness goals</Text>
					</View>

					<View style={styles.content}>
						<View style={styles.formWrapper}>
							<ProgressBar current={step} total={TOTAL_STEPS} />
							{error && <Text style={styles.errorText}>{error}</Text>}
							<GoalSettingForm
								currentStep={step}
								selectedFrequency={selectedFrequency}
								onSelectFrequency={setSelectedFrequency}
								selectedCategory={selectedCategory}
								onSelectCategory={setSelectedCategory}
								goalTitle={goalTitle}
								onTitleChange={setGoalTitle}
								onNext={handleNext}
								onBack={handleBack}
								onSubmit={handleSubmit}
								isSaving={isLoading}
							/>
						</View>
					</View>
				</WebContainer>
			</View>

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
	webContainer: {
		flex: 1,
		paddingVertical: 0,
	},
	header: {
		paddingTop: 24,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	headerTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginBottom: 4,
	},
	headerSubtitle: {
		fontSize: FONT_SIZES.subheading,
		color: COLORS.textSecondary,
	},
	content: {
		flex: 1,
		paddingVertical: 20,
	},
	formWrapper: {
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
	errorText: {
		color: COLORS.error,
		textAlign: 'center',
		marginHorizontal: 20,
		marginBottom: 10,
	},
});

export default GoalSettingWeb;