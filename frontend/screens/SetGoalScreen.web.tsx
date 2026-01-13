import { Modal } from '@/components/Modal';
import { useModal } from '@/hooks/useModal';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GoalSettingForm from '../components/GoalSettingForm';
import ProgressBar from '../components/ProgressBar';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useGoalStore } from '../stores/goalStore';
import { Frequency, GoalCategory } from '../types';
import { WebContainer } from '@/components/layout';

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

	const resetForm = () => {
		setStep(1);
		setSelectedFrequency(null);
		setSelectedCategory(null);
		setGoalTitle('');
	};

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

	const handleBack = () => {
		if (step > 1) {
			setStep(step - 1);
		}
	};

	const handleSubmit = async () => {
		if (!goalTitle.trim()) {
			showError('Error!', 'Please describe your goal to continue.');
			return;
		}

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
			<View style={styles.container}>
				<WebContainer maxWidth={700}>
					<View style={styles.header}>
						<Text style={styles.title}>Set a New Goal</Text>
						<Text style={styles.subtitle}>Follow the steps to create your personalized goal</Text>
					</View>

					<View style={styles.formContainer}>
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
		padding: 32,
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
		marginTop: 16,
	},
});

export default SetGoalScreen;
