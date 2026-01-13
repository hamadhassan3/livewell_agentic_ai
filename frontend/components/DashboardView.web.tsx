import { COLORS } from '@/constants/theme';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { default as React } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DashboardData, NudgeFeedback, QuestionNudgeResponse } from '../types';
import ActivityHistory from './ActivityHistory';
import EventsSection from './EventsSection';
import GoalsSection from './GoalsSection';
import MedicationSection from './MedicationSection';
import NudgeView from './NudgeView';
import QuestionNudgeView from './QuestionNudgeView';
import WeeklyGoalProgress from './WeeklyGoalProgress';
import { WebContainer } from './layout';

interface DashboardViewProps {
	data: DashboardData;
	onNudgeFeedback: (feedback: NudgeFeedback) => void;
	isNudgeLoading: boolean;
	onQuestionNudgeResponse: (response: string, sessionId: string) => void;
	isQuestionNudgeLoading: boolean;
	questionNudgeResponse: QuestionNudgeResponse | null;
	onMedicationUpdate?: () => void;
	onGoalUpdate?: () => void;
	onAddGoal?: () => void;
	onAddMedication?: () => void;
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
	onAddMedication,
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
	const { isMobile, isTablet } = useMediaQuery();

	// On mobile/tablet, use single column. On desktop, use two columns
	const useSingleColumn = isMobile || isTablet;

	return (
		<ScrollView style={styles.container}>
			<WebContainer maxWidth={1400}>
				{/* Question Nudge section */}
				<QuestionNudgeView
						data={data.questionNudge}
						onResponse={handleQuestionResponse}
						isLoading={isQuestionNudgeLoading}
						response={questionNudgeResponse}
					/>
				{/* Nudge section */}
				<View style={styles.nudgeContainer}>
					<NudgeView
						data={data.nudge}
						onFeedback={onNudgeFeedback}
						isLoading={isNudgeLoading}
					/>
				</View>

				{/* Responsive grid layout */}
				{useSingleColumn ? (
					// Single column for mobile/tablet
					<View style={styles.singleColumn}>
						<View style={styles.section}>
							<WeeklyGoalProgress goals={data.goals} />
						</View>

						<View style={styles.section}>
							<ActivityHistory activityData={data.activityData} />
						</View>

						<View style={styles.section}>
							<GoalsSection goals={data.goals} onGoalUpdate={onGoalUpdate} onAddGoal={onAddGoal} />
						</View>

						<View style={styles.section}>
							<MedicationSection
								medications={data.medications}
								onMedicationUpdate={onMedicationUpdate}
								onAddMedication={onAddMedication}
							/>
						</View>

						<View style={styles.section}>
							<EventsSection />
						</View>
					</View>
				) : (
					// Two column grid for desktop
					<View>
						{/* Full-width section for Activity History */}
						<View style={styles.section}>
							<ActivityHistory activityData={data.activityData} />
						</View>

						{/* Two-column grid for other components */}
						<View style={styles.gridContainer}>
							{/* Left column */}
							<View style={styles.leftColumn}>
								<View style={styles.section}>
									<WeeklyGoalProgress goals={data.goals} />
								</View>
								<View style={styles.section}>
									<EventsSection />
								</View>
							</View>

							{/* Right column */}
							<View style={styles.rightColumn}>
								<View style={styles.section}>
									<GoalsSection goals={data.goals} onGoalUpdate={onGoalUpdate} onAddGoal={onAddGoal} />
								</View>
								<View style={styles.section}>
									<MedicationSection
										medications={data.medications}
										onMedicationUpdate={onMedicationUpdate}
										onAddMedication={onAddMedication}
									/>
								</View>
							</View>

							
						</View>
					</View>
				)}
			</WebContainer>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	nudgeContainer: {
		marginBottom: 24,
	},
	singleColumn: {
		width: '100%',
	},
	gridContainer: {
		flexDirection: 'row',
		gap: 24,
		flexWrap: 'wrap',
	},
	leftColumn: {
		flex: 1,
		minWidth: 400,
		gap: 24,
	},
	rightColumn: {
		flex: 1,
		minWidth: 400,
		gap: 24,
	},
	section: {
		marginBottom: 24,
	},
});

export default DashboardView;
