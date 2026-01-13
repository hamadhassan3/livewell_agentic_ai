import { Modal } from '@/components/Modal';
import { useModal } from '@/hooks/useModal';
import { router, useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import AddMedicationForm from '../components/AddMedicationForm';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme'; // Import the new theme
import { useMedicationStore } from '../stores/medicationStore';
import { NewMedication } from '../types';

const AddMedicationScreen: React.FC = () => {
	const navigation = useNavigation();

	// Get actions and state from the Zustand store
	const { addMedication, isLoading, error } = useMedicationStore();
	const { modalConfig, hideModal, showError, showConfirm } = useModal();

	const initialFormState: NewMedication = {
		name: '',
		dosage: '',
		notes: '',
		frequencyType: 'daily',
		reminderTimes: [],
	};

	// Manage the form's data locally
	const [formData, setFormData] = useState<NewMedication>(initialFormState);

	const handleFieldChange = <K extends keyof NewMedication>(
		field: K,
		value: NewMedication[K]
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async () => {
		if (!formData.name.trim()) {
			showError(
				'Missing Information',
				'Please enter a name for the medication.'
			);
			return;
		}

		if (!formData.dosage.trim()) {
			showError(
				'Missing Information',
				'Please enter a dosage for the medication.'
			);
			return;
		}

		// For daily medications, at least one reminder time should be selected.
		if (
			formData.frequencyType === 'daily' &&
			formData.reminderTimes.length === 0
		) {
			showError(
				'Missing Information',
				'Please select at least one reminder time for a daily medication.'
			);
			return;
		}

		const success = await addMedication(formData);

		if (success) {
			showConfirm(
				'Success!',
				'Your medication has been saved.',
				() => {
					setFormData(initialFormState);
				},
				() => {
					setFormData(initialFormState);
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
			<ScrollView
				style={styles.container}
				contentContainerStyle={styles.contentContainer}
			>
				<Text style={styles.header}>Add a New Medication</Text>
				{error && <Text style={styles.errorText}>{error}</Text>}
				<AddMedicationForm
					formData={formData}
					onFieldChange={handleFieldChange}
					onSubmit={handleSubmit}
					onCancel={() => navigation.goBack()}
					isSaving={isLoading}
				/>
			</ScrollView>
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
		backgroundColor: COLORS.background, // Use theme background color
	},
	contentContainer: {
		paddingBottom: 40,
	},
	header: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		textAlign: 'center',
		marginVertical: 30,
	},
	errorText: {
		color: COLORS.error,
		textAlign: 'center',
		marginHorizontal: 20,
		marginBottom: 10,
		fontSize: FONT_SIZES.subheading,
	},
});

export default AddMedicationScreen;
