import { Modal } from '@/components/Modal';
import { useModal } from '@/hooks/useModal';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';
import GoalSettingForm from '../components/GoalSettingForm';
import ProgressBar from '../components/ProgressBar';
import { COLORS } from '../constants/theme';
import { useGoalStore } from '../stores/goalStore';
import { Frequency, GoalCategory } from '../types';

const TOTAL_STEPS = 3;

const SetGoalScreen: React.FC = () => {
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
					router.navigate('/');
				},
				{
					confirmText: 'Add Another',
					cancelText: 'Okay',
				}
			);
		}
	};

	return (
		<>
			<SafeAreaView style={styles.container}>
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
			</SafeAreaView>
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
	errorText: {
		color: COLORS.error,
		textAlign: 'center',
		marginHorizontal: 20,
		marginBottom: 10,
	},
});

export default SetGoalScreen;
