import { COLORS } from '@/constants/theme';
import { default as React, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { DashboardData, NudgeFeedback, QuestionNudgeResponse } from '../types';
import NudgeView from './NudgeView';
import QuestionNudgeView from './QuestionNudgeView';
import MedicationSection from './MedicationSection';
import GoalsSection from './GoalsSection';
import ActivityHistory from './ActivityHistory';
import WeeklyGoalProgress from './WeeklyGoalProgress';
import EventsSection from './EventsSection';

interface DashboardViewProps {
    data: DashboardData;
    onNudgeFeedback: (feedback: NudgeFeedback) => void;
    isNudgeLoading: boolean;
    onQuestionNudgeResponse: (response: string, sessionId: string) => void;
    isQuestionNudgeLoading: boolean;
    questionNudgeResponse: QuestionNudgeResponse | null;
    onMedicationUpdate?: () => void; // Callback to refresh data after medication update
    onGoalUpdate?: () => void; // Callback to refresh data after goal update
    onAddGoal?: () => void; // Callback to open add goal modal
    onAddMedication?: () => void; // Callback to open add medication modal
}

const DashboardView: React.FC<DashboardViewProps> = ({
    data,
    onNudgeFeedback,
    isNudgeLoading,
    onQuestionNudgeResponse,
    isQuestionNudgeLoading,
    questionNudgeResponse,
    onMedicationUpdate,
    onGoalUpdate,
    onAddGoal,
    onAddMedication
}) => {
    const handleQuestionResponse = async (response: string, sessionId: string) => {
        try {
            await onQuestionNudgeResponse(response, sessionId);
            // The parent component should handle the response and update data
        } catch (error) {
            console.error('Failed to submit question response:', error);
            throw error; // Re-throw to let the component handle the error
        }
    };

    return (
        <ScrollView style={styles.container}>
            <NudgeView
                data={data.nudge}
                onFeedback={onNudgeFeedback}
                isLoading={isNudgeLoading}
            />

            <QuestionNudgeView
                data={data.questionNudge}
                onResponse={handleQuestionResponse}
                isLoading={isQuestionNudgeLoading}
                response={questionNudgeResponse}
            />

            <WeeklyGoalProgress goals={data.goals} />

            <ActivityHistory activityData={data.activityData} />

            <GoalsSection
                goals={data.goals}
                onGoalUpdate={onGoalUpdate}
                onAddGoal={onAddGoal}
            />

            <MedicationSection
                medications={data.medications}
                onMedicationUpdate={onMedicationUpdate}
                onAddMedication={onAddMedication}
            />

            <EventsSection />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: wp('5%'),
    },
});

export default DashboardView;