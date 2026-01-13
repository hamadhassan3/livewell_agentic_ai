import { Modal } from '@/components/Modal';
import { useModal } from '@/hooks/useModal';
import { router, useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import AddMedicationForm from '../components/AddMedicationForm';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useMedicationStore } from '../stores/medicationStore';
import { NewMedication } from '../types';
import { WebContainer } from '@/components/layout';

const AddMedicationScreen: React.FC = () => {
	const navigation = useNavigation();

	const { addMedication, isLoading, error } = useMedicationStore();
	const { modalConfig, hideModal, showError, showConfirm } = useModal();

	const initialFormState: NewMedication = {
		name: '',
		dosage: '',
		notes: '',
		frequencyType: 'daily',
		reminderTimes: [],
	};

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
			<ScrollView style={styles.container}>
				<WebContainer maxWidth={700}>
					<View style={styles.header}>
						<Text style={styles.title}>Add a New Medication</Text>
						<Text style={styles.subtitle}>Fill in the details for your medication</Text>
					</View>

					{error && <Text style={styles.errorText}>{error}</Text>}

					<View style={styles.formContainer}>
						<AddMedicationForm
							formData={formData}
							onFieldChange={handleFieldChange}
							onSubmit={handleSubmit}
							onCancel={() => navigation.goBack()}
							isSaving={isLoading}
						/>
					</View>
				</WebContainer>
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
		marginBottom: 16,
		fontSize: FONT_SIZES.subheading,
	},
});

export default AddMedicationScreen;
