import AddMedicationForm from "@/components/AddMedicationForm";
import { Modal } from '@/components/Modal';
import { WebContainer } from '@/components/layout';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { useModal } from '@/hooks/useModal';
import { useMedicationStore } from '@/stores/medicationStore';
import { NewMedication, Medication } from '@/types';
import { router, useNavigation } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { getDashboardData } from '@/api/dashboardService';
import MedicationSection from '@/components/MedicationSection';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl, Modal as RNModal, TouchableOpacity } from 'react-native';

const MedicationWeb: React.FC = () => {
	const navigation = useNavigation();
	const { isMobile } = useMediaQuery();

	// Get actions and state from the Zustand store
	const { addMedication, isLoading, error } = useMedicationStore();
	const { modalConfig, hideModal, showError, showConfirm } = useModal();

	// Medication list state
	const [medications, setMedications] = useState<Medication[]>([]);
	const [isMedicationsLoading, setIsMedicationsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Modal state
	const [isModalVisible, setIsModalVisible] = useState(false);

	const initialFormState: NewMedication = {
		name: '',
		dosage: '',
		notes: '',
		frequencyType: 'daily',
		reminderTimes: [],
	};

	// Manage the form's data locally
	const [formData, setFormData] = useState<NewMedication>(initialFormState);

	const loadMedications = async () => {
		try {
			setIsMedicationsLoading(true);
			const dashboardData = await getDashboardData();
			setMedications(dashboardData.medications);
		} catch (error) {
			console.error("Failed to load medications:", error);
		} finally {
			setIsMedicationsLoading(false);
		}
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);
		await loadMedications();
		setIsRefreshing(false);
	};

	const openModal = () => {
		setIsModalVisible(true);
	};

	const closeModal = () => {
		setIsModalVisible(false);
		setFormData(initialFormState);
	};

	useEffect(() => {
		loadMedications();
	}, []);

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
			closeModal();
			showConfirm(
				'Success!',
				'Your medication has been saved.',
				() => {
					// Refresh medications
					loadMedications();
				},
				() => {
					// Open modal again to add another
					setIsModalVisible(true);
					setFormData(initialFormState);
				},
				{
					confirmText: 'Okay',
					cancelText: 'Add Another',
				}
			);
		}
	};

	return (
		<>
			<View style={styles.container}>
				<WebContainer maxWidth={1200} style={styles.webContainer}>
					<ScrollView
						style={styles.scrollView}
						refreshControl={
							<RefreshControl
								refreshing={isRefreshing}
								onRefresh={handleRefresh}
								colors={[COLORS.primary]}
							/>
						}
					>
						<View style={[styles.header, { paddingTop: isMobile ? 60 : 0 }]}>
							<Text style={styles.headerTitle}>Medications</Text>
							<Text style={styles.headerSubtitle}>Track your daily medications</Text>
						</View>

						<View style={styles.content}>
							{isMedicationsLoading ? (
								<View style={styles.loadingContainer}>
									<ActivityIndicator size="large" color={COLORS.primary} />
									<Text style={styles.loadingText}>Loading your medications...</Text>
								</View>
							) : medications.length > 0 ? (
								<MedicationSection
									medications={medications}
									onMedicationUpdate={loadMedications}
									onAddMedication={openModal}
								/>
							) : (
								<View style={styles.emptyState}>
									<MaterialCommunityIcons
										name="pill"
										size={64}
										color={COLORS.textSecondary}
									/>
									<Text style={styles.emptyStateTitle}>No Medications Yet</Text>
									<Text style={styles.emptyStateText}>
										Add your first medication to start tracking your daily doses!
									</Text>
									<TouchableOpacity
										style={styles.emptyStateButton}
										onPress={openModal}
									>
										<Text style={styles.emptyStateButtonText}>Add Your First Medication</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					</ScrollView>
				</WebContainer>

				{/* Add Medication Modal */}
				<RNModal
					visible={isModalVisible}
					transparent={true}
					animationType="fade"
					onRequestClose={closeModal}
				>
					<View style={styles.modalOverlay}>
						<View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>Add Medication</Text>
								<TouchableOpacity onPress={closeModal} style={styles.closeButton}>
									<MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
								</TouchableOpacity>
							</View>
							<ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
								{error && <Text style={styles.errorText}>{error}</Text>}
								<AddMedicationForm
									formData={formData}
									onFieldChange={handleFieldChange}
									onSubmit={handleSubmit}
									onCancel={closeModal}
									isSaving={isLoading}
								/>
							</ScrollView>
						</View>
					</View>
				</RNModal>
			</View>

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
	scrollView: {
		flex: 1,
	},
	header: {
		marginBottom: 24,
	},
	headerTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		textAlign: 'center',
		marginBottom: 8,
	},
	headerSubtitle: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		textAlign: 'center',
	},
	content: {
		flex: 1,
		paddingVertical: 10,
	},
	loadingContainer: {
		padding: 30,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 150,
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		marginBottom: 20,
	},
	loadingText: {
		marginTop: 16,
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 20,
		paddingVertical: 40,
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		marginBottom: 20,
	},
	emptyStateTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginTop: 16,
		marginBottom: 8,
	},
	emptyStateText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 24,
		paddingHorizontal: 10,
	},
	emptyStateButton: {
		backgroundColor: COLORS.primary,
		paddingHorizontal: 32,
		paddingVertical: 12,
		borderRadius: 8,
	},
	emptyStateButtonText: {
		color: COLORS.textOnPrimary,
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.medium,
	},
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
	errorText: {
		color: COLORS.error,
		textAlign: 'center',
		marginVertical: 12,
		fontSize: FONT_SIZES.body,
	},
});

export default MedicationWeb;
