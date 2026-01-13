import { generateGoalNudge, respondToGoalNudge, getDashboardGoals } from '@/api/dashboardService';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { Goal, GoalNudgeData, GoalNudgeResponse, Frequency, GoalCategory } from '@/types';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
    Modal as RNModal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import GoalNudgeView from '@/components/GoalNudgeView';
import GoalsSection from '@/components/GoalsSection';
import { WebContainer } from '@/components/layout';
import GoalSettingForm from '@/components/GoalSettingForm';
import ProgressBar from '@/components/ProgressBar';
import { useGoalStore } from '@/stores/goalStore';
import { Modal } from '@/components/Modal';
import { useModal } from '@/hooks/useModal';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const TOTAL_STEPS = 3;

const GoalsListScreenWeb: React.FC = () => {
    const router = useRouter();
    const { isMobile } = useMediaQuery();
    const [goalNudge, setGoalNudge] = useState<GoalNudgeData | null>(null);
    const [goalNudgeResponse, setGoalNudgeResponse] = useState<GoalNudgeResponse | null>(null);
    const [isGoalNudgeLoading, setIsGoalNudgeLoading] = useState(false);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isGoalsLoading, setIsGoalsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Goal setting modal state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [step, setStep] = useState(1);
    const [selectedFrequency, setSelectedFrequency] = useState<Frequency | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null);
    const [goalTitle, setGoalTitle] = useState('');

    const { addGoal, isLoading: isGoalLoading, error: goalError } = useGoalStore();
    const { modalConfig, hideModal, showError, showConfirm } = useModal();

    const loadGoals = async () => {
        try {
            setIsGoalsLoading(true);
            const goalsData = await getDashboardGoals();
            setGoals(goalsData);
        } catch (error) {
            console.error("Failed to load goals:", error);
        } finally {
            setIsGoalsLoading(false);
        }
    };

    const generateNewGoalNudge = async () => {
        try {
            console.log('Starting goal nudge generation...');
            setIsGoalNudgeLoading(true);
            setGoalNudgeResponse(null); // Clear any previous response
            const nudge = await generateGoalNudge();
            console.log('Goal nudge received:', nudge);
            setGoalNudge(nudge);
        } catch (error) {
            console.error("Failed to generate goal nudge:", error);
        } finally {
            setIsGoalNudgeLoading(false);
        }
    };

    const handleGoalNudgeResponse = async (response: string, sessionId: string) => {
        try {
            const result = await respondToGoalNudge(response, sessionId);
            if (result) {
                setGoalNudgeResponse(result);
                // If user accepted the goal, refresh the goals list
                if (result.accepted) {
                    setTimeout(() => {
                        loadGoals();
                    }, 1000); // Small delay to allow backend to process
                }
            }
        } catch (error) {
            console.error("Failed to respond to goal nudge:", error);
            throw error;
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([
            loadGoals(),
            generateNewGoalNudge()
        ]);
        setIsRefreshing(false);
    };

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
                    loadGoals();
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

    useEffect(() => {
        console.log('GoalsListScreenWeb mounted');
        loadGoals();
        // Always generate goal nudge on load for testing
        console.log('Generating goal nudge...');
        generateNewGoalNudge();
    }, []);

    return (
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
                        <Text style={styles.headerTitle}>Goals</Text>
                        <Text style={styles.headerSubtitle}>Track your wellness journey</Text>
                    </View>

                    <View style={styles.content}>
                        {/* Goal Nudge Section */}
                        {console.log('Rendering GoalNudgeView with:', { goalNudge, isGoalNudgeLoading, goalNudgeResponse })}
                        <GoalNudgeView
                            data={goalNudge}
                            onResponse={handleGoalNudgeResponse}
                            isLoading={isGoalNudgeLoading}
                            response={goalNudgeResponse}
                        />

                        {/* Goals List Section */}
                        {isGoalsLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.loadingText}>Loading your goals...</Text>
                            </View>
                        ) : goals.length > 0 ? (
                            <GoalsSection
                                goals={goals}
                                onGoalUpdate={loadGoals}
                                onAddGoal={navigateToAddGoal}
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons 
                                    name="target" 
                                    size={64} 
                                    color={COLORS.textSecondary} 
                                />
                                <Text style={styles.emptyStateTitle}>No Goals Yet</Text>
                                <Text style={styles.emptyStateText}>
                                    Set your first goal to start your wellness journey!
                                </Text>
                                <TouchableOpacity 
                                    style={styles.emptyStateButton} 
                                    onPress={navigateToAddGoal}
                                >
                                    <Text style={styles.emptyStateButtonText}>Set Your First Goal</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Motivational Section */}
                        <View style={styles.motivationSection}>
                            <Text style={styles.motivationTitle}>💪 Keep Going!</Text>
                            <Text style={styles.motivationText}>
                                Every small step counts towards a healthier, happier you. 
                                Your consistency today builds the strength for tomorrow.
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </WebContainer>

            {/* Goal Setting Modal */}
            <RNModal
                visible={isModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Set a New Goal</Text>
                            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                                <MaterialCommunityIcons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
        </View>
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
    motivationSection: {
        backgroundColor: COLORS.surface,
        marginBottom: 20,
        padding: 20,
        borderRadius: 12,
    },
    motivationTitle: {
        fontSize: FONT_SIZES.heading,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    motivationText: {
        fontSize: FONT_SIZES.body,
        color: COLORS.textSecondary,
        lineHeight: 24,
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

export default GoalsListScreenWeb;