import { generateGoalNudge, respondToGoalNudge, getDashboardGoals } from '@/api/dashboardService';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { Goal, GoalNudgeData, GoalNudgeResponse } from '@/types';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    SafeAreaView,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import GoalNudgeView from '@/components/GoalNudgeView';
import GoalsSection from '@/components/GoalsSection';

const GoalsListScreen: React.FC = () => {
    const router = useRouter();
    const [goalNudge, setGoalNudge] = useState<GoalNudgeData | null>(null);
    const [goalNudgeResponse, setGoalNudgeResponse] = useState<GoalNudgeResponse | null>(null);
    const [isGoalNudgeLoading, setIsGoalNudgeLoading] = useState(false);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isGoalsLoading, setIsGoalsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
        router.push('/goal-setting');
    };

    useEffect(() => {
        console.log('GoalsListScreen mounted');
        loadGoals();
        // Auto-generate goal nudge on load if none exists
        if (!goalNudge && !isGoalNudgeLoading) {
            console.log('Generating goal nudge...');
            generateNewGoalNudge();
        }
    }, []);

    return (
        <SafeAreaView style={styles.container}>
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
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Goals</Text>
                    <TouchableOpacity style={styles.addButton} onPress={navigateToAddGoal}>
                        <MaterialCommunityIcons name="plus" size={24} color={COLORS.textOnPrimary} />
                    </TouchableOpacity>
                </View>

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
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: wp('5%'),
        paddingVertical: hp('2%'),
        marginBottom: hp('1%'),
    },
    headerTitle: {
        fontSize: FONT_SIZES.title,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        width: wp('12%'),
        height: wp('12%'),
        borderRadius: wp('6%'),
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        padding: wp('5%'),
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: hp('20%'),
    },
    loadingText: {
        marginTop: hp('2%'),
        fontSize: FONT_SIZES.body,
        color: COLORS.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp('8%'),
        paddingVertical: hp('5%'),
        backgroundColor: COLORS.surface,
        marginHorizontal: wp('5%'),
        borderRadius: 15,
        marginBottom: hp('3%'),
    },
    emptyStateTitle: {
        fontSize: FONT_SIZES.heading,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginTop: hp('2%'),
        marginBottom: hp('1%'),
    },
    emptyStateText: {
        fontSize: FONT_SIZES.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: hp('3%'),
        marginBottom: hp('3%'),
    },
    emptyStateButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: wp('8%'),
        paddingVertical: hp('1.5%'),
        borderRadius: 25,
    },
    emptyStateButtonText: {
        color: COLORS.textOnPrimary,
        fontSize: FONT_SIZES.body,
        fontWeight: FONT_WEIGHTS.medium,
    },
    motivationSection: {
        backgroundColor: COLORS.surface,
        marginHorizontal: wp('5%'),
        marginBottom: hp('3%'),
        padding: wp('5%'),
        borderRadius: 15,
    },
    motivationTitle: {
        fontSize: FONT_SIZES.heading,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: hp('1%'),
    },
    motivationText: {
        fontSize: FONT_SIZES.body,
        color: COLORS.textSecondary,
        lineHeight: hp('3%'),
    },
});

export default GoalsListScreen;