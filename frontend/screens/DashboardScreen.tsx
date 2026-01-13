import {
	sendNudgeFeedback,
	respondToQuestionNudge,
} from '@/api/dashboardService';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { NudgeFeedback, Frequency, GoalCategory, NewMedication } from '@/types';
import React, { useState, useEffect, useRef } from 'react';
import {
	ActivityIndicator,
	Button,
	StyleSheet,
	Text,
	View,
	Modal as RNModal,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import DashboardView from '../components/DashboardView';
import { useDashboardData } from '../hooks';
import { useGoalStore } from '@/stores/goalStore';
import { useMedicationStore } from '@/stores/medicationStore';
import { Modal } from '@/components/Modal';
import { useModal } from '@/hooks/useModal';
import GoalSettingForm from '@/components/GoalSettingForm';
import AddMedicationForm from '@/components/AddMedicationForm';
import ProgressBar from '@/components/ProgressBar';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const TOTAL_STEPS = 3;

const DashboardScreen: React.FC = () => {
	const { isMobile } = useMediaQuery();
	const {
		data,
		loading,
		error,
		isNudgeLoading,
		setIsNudgeLoading,
		isQuestionNudgeLoading,
		updateNudge,
		updateQuestionNudge,
		generateNewQuestionNudge,
		questionNudgeResponse,
		setQuestionNudgeResponse,
		refetch,
		refreshMedicationsOnly,
		userPoints,
	} = useDashboardData();
	const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
	const hasAttemptedQuestionNudge = useRef(false);

	// Goal setting modal state
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [step, setStep] = useState(1);
	const [selectedFrequency, setSelectedFrequency] = useState<Frequency | null>(
		null
	);
	const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(
		null
	);
	const [goalTitle, setGoalTitle] = useState('');

	const {
		addGoal,
		isLoading: isGoalLoading,
		error: goalError,
	} = useGoalStore();
	const {
		addMedication,
		isLoading: isMedicationLoading,
		error: medicationError,
	} = useMedicationStore();
	const { modalConfig, hideModal, showError, showConfirm } = useModal();

	// Medication modal state
	const [isMedicationModalVisible, setIsMedicationModalVisible] =
		useState(false);
	const initialMedicationFormState: NewMedication = {
		name: '',
		dosage: '',
		notes: '',
		frequencyType: 'daily',
		reminderTimes: [],
	};
	const [medicationFormData, setMedicationFormData] = useState<NewMedication>(
		initialMedicationFormState
	);

	const navigateToAddGoal = () => {
		setIsModalVisible(true);
	};

	const resetGoalForm = () => {
		setStep(1);
		setSelectedFrequency(null);
		setSelectedCategory(null);
		setGoalTitle('');
	};

	const closeModal = () => {
		setIsModalVisible(false);
		resetGoalForm();
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

	const handleGoalSubmit = async () => {
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
			closeModal();
			showConfirm(
				'Goal Set!',
				'Your new goal has been added successfully.',
				() => {
					// Refresh goals
					refreshMedicationsOnly();
				},
				() => {
					// Open modal again to add another
					setIsModalVisible(true);
					resetGoalForm();
				},
				{
					confirmText: 'Okay',
					cancelText: 'Add Another',
				}
			);
		}
	};

	const navigateToAddMedication = () => {
		setIsMedicationModalVisible(true);
	};

	const closeMedicationModal = () => {
		setIsMedicationModalVisible(false);
		setMedicationFormData(initialMedicationFormState);
	};

	const handleMedicationFieldChange = <K extends keyof NewMedication>(
		field: K,
		value: NewMedication[K]
	) => {
		setMedicationFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleMedicationSubmit = async () => {
		if (!medicationFormData.name.trim()) {
			showError(
				'Missing Information',
				'Please enter a name for the medication.'
			);
			return;
		}

		if (!medicationFormData.dosage.trim()) {
			showError(
				'Missing Information',
				'Please enter a dosage for the medication.'
			);
			return;
		}

		// For daily medications, at least one reminder time should be selected.
		if (
			medicationFormData.frequencyType === 'daily' &&
			medicationFormData.reminderTimes.length === 0
		) {
			showError(
				'Missing Information',
				'Please select at least one reminder time for a daily medication.'
			);
			return;
		}

		const success = await addMedication(medicationFormData);

		if (success) {
			closeMedicationModal();
			showConfirm(
				'Success!',
				'Your medication has been saved.',
				() => {
					// Refresh medications
					refreshMedicationsOnly();
				},
				() => {
					// Open modal again to add another
					setIsMedicationModalVisible(true);
					setMedicationFormData(initialMedicationFormState);
				},
				{
					confirmText: 'Okay',
					cancelText: 'Add Another',
				}
			);
		}
	};

	const handleNudgeFeedback = async (feedback: NudgeFeedback) => {
		try {
			setIsFeedbackLoading(true);
			const nextNudge = await sendNudgeFeedback(feedback);
			console.log(nextNudge, new Date());
			updateNudge(nextNudge);
		} catch (error) {
			console.error('Failed to update nudge:', error);
			updateNudge(null);
		} finally {
			setIsFeedbackLoading(false);
		}
	};

	const handleQuestionNudgeResponse = async (
		response: string,
		sessionId: string
	) => {
		try {
			const result = await respondToQuestionNudge(response, sessionId);
			if (result) {
				setQuestionNudgeResponse(result);
				// Keep the question nudge but mark it as responded
				// Don't clear it - we want to show the response
			}
		} catch (error) {
			console.error('Failed to respond to question nudge:', error);
			throw error; // Re-throw to let the component handle the error
		}
	};

	// Auto-generate question nudge once when data is loaded
	useEffect(() => {
		// Only generate once when data is first loaded and we haven't attempted yet
		if (
			data &&
			!data.questionNudge &&
			!isQuestionNudgeLoading &&
			!hasAttemptedQuestionNudge.current
		) {
			hasAttemptedQuestionNudge.current = true;
			generateNewQuestionNudge();
		}
	}, [data, isQuestionNudgeLoading, generateNewQuestionNudge]);

	if (loading && !data) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator size='large' color={COLORS.primary} />
				{/* <Text>Loading Dashboard...</Text> */}
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centered}>
				<Text style={styles.errorText}>{error}</Text>
				<Button title='Retry' onPress={refetch} />
			</View>
		);
	}

	const nudgeLoading = isNudgeLoading || isFeedbackLoading;
	return data ? (
		<>
			<DashboardView
				data={data}
				onNudgeFeedback={handleNudgeFeedback}
				isNudgeLoading={nudgeLoading}
				onQuestionNudgeResponse={handleQuestionNudgeResponse}
				isQuestionNudgeLoading={isQuestionNudgeLoading}
				questionNudgeResponse={questionNudgeResponse}
				onMedicationUpdate={refreshMedicationsOnly}
				onGoalUpdate={refreshMedicationsOnly}
				onAddGoal={navigateToAddGoal}
				onAddMedication={navigateToAddMedication}
			/>

			{/* Goal Setting Modal */}
			{isModalVisible &&
				<RNModal
					visible={isModalVisible}
					transparent={true}
					animationType='fade'
					onRequestClose={closeModal}
				>
					<View style={styles.modalOverlay}>
						<View
							style={[styles.modalContent, isMobile && styles.modalContentMobile]}
						>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>Set a New Goal</Text>
								<TouchableOpacity onPress={closeModal} style={styles.closeButton}>
									<MaterialCommunityIcons
										name='close'
										size={24}
										color={COLORS.textSecondary}
									/>
								</TouchableOpacity>
							</View>
							<ScrollView
								style={styles.modalBody}
								showsVerticalScrollIndicator={false}
							>
								<ProgressBar current={step} total={TOTAL_STEPS} />
								{goalError && <Text style={styles.errorText}>{goalError}</Text>}
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
									onSubmit={handleGoalSubmit}
									isSaving={isGoalLoading}
								/>
							</ScrollView>
						</View>
					</View>
				</RNModal>
			}

			{/* Add Medication Modal */}
			<RNModal
				visible={isMedicationModalVisible}
				transparent={true}
				animationType='fade'
				onRequestClose={closeMedicationModal}
			>
				<View style={styles.modalOverlay}>
					<View
						style={[styles.modalContent, isMobile && styles.modalContentMobile]}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Add Medication</Text>
							<TouchableOpacity
								onPress={closeMedicationModal}
								style={styles.closeButton}
							>
								<MaterialCommunityIcons
									name='close'
									size={24}
									color={COLORS.textSecondary}
								/>
							</TouchableOpacity>
						</View>
						<ScrollView
							style={styles.modalBody}
							showsVerticalScrollIndicator={false}
						>
							{medicationError && (
								<Text style={styles.errorText}>{medicationError}</Text>
							)}
							<AddMedicationForm
								formData={medicationFormData}
								onFieldChange={handleMedicationFieldChange}
								onSubmit={handleMedicationSubmit}
								onCancel={closeMedicationModal}
								isSaving={isMedicationLoading}
							/>
						</ScrollView>
					</View>
				</View>
			</RNModal>

			{/* Confirmation Modal */}
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
	) : null;
};

const styles = StyleSheet.create({
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	errorText: { color: 'red', marginBottom: 20 },
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 10,
		zIndex: 1000,
	},
	modalContent: {
		backgroundColor: COLORS.background,
		borderRadius: 12,
		width: '100%',
		maxWidth: 700,
		maxHeight: '90%',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 10,
		zIndex: 1001,
	},
	modalContentMobile: {
		maxHeight: '95%',
		marginHorizontal: 0,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	modalTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		flex: 1,
	},
	closeButton: {
		padding: 4,
		marginLeft: 12,
	},
	modalBody: {
		padding: 20,
		flexGrow: 0,
	},
});

export default DashboardScreen;
