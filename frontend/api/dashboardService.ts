import { ActivityDataPoint, DashboardData, Goal, GoalNudgeData, GoalNudgeResponse, Medication, NudgeData, QuestionNudgeData, QuestionNudgeResponse } from "../types";
import apiClient from "./apiClient";

/**
 * Fetches the nudge from the backend API
 */
const getNudgeFromBackend = async (): Promise<NudgeData | null> => {
  try {
    const response = await apiClient.post('/agent/nudge/generate/', {}, {
      timeout: 60000 // 30 seconds for AI generation
    });
    // The backend now returns { text: "..." }
    return {
      text: response.data.text
    } as NudgeData;
  } catch (error) {
    console.error("Failed to fetch nudge from backend:", error);
    return null;
  }
};

/**
 * Fetches goals formatted for dashboard
 */
export const getDashboardGoals = async (): Promise<Goal[]> => {
  try {
    const response = await apiClient.get('/tracking/goals/dashboard/');
    const goalsData = response.data;
    
    // Transform backend data to frontend format
    const goals: Goal[] = goalsData.map((goal: any) => ({
      id: goal.id.toString(),
      title: goal.title,
      frequency: goal.frequency,
      category: goal.category,
      completed: goal.completed_today || false
    }));
    
    return goals;
  } catch (error) {
    console.error("Failed to fetch dashboard goals:", error);
    // Return empty array as fallback
    return [];
  }
};

/**
 * Fetches medications formatted for dashboard
 */
const getDashboardMedications = async (): Promise<Medication[]> => {
  try {
    const response = await apiClient.get('/tracking/medications/dashboard/');
    const medicationsData = response.data;
    
    // Transform backend data to frontend format
    const medications: Medication[] = [];
    
    for (const med of medicationsData) {
      for (const reminderTime of med.reminder_times) {
        const timeDisplayMap: { [key: string]: string } = {
          'morning': '8:00 AM',
          'noon': '12:00 PM', 
          'evening': '6:00 PM',
          'bedtime': '10:00 PM'
        };
        
        medications.push({
          id: `${med.id}_${reminderTime}`,
          name: med.name,
          time: timeDisplayMap[reminderTime] || reminderTime,
          taken: med.taken_today[reminderTime] || false,
          medicationId: med.id,
          scheduledTime: reminderTime
        });
      }
    }
    
    return medications;
  } catch (error) {
    console.error("Failed to fetch dashboard medications:", error);
    // Return empty array as fallback
    return [];
  }
};


/**
 * Fetches step counts formatted for dashboard
 */
const getDashboardStepCounts = async (): Promise<ActivityDataPoint[]> => {
  try {
    const response = await apiClient.get<ActivityDataPoint[]>('/tracking/step-counts/dashboard/');
    return response.data;
  } catch (error) {
    console.error("Failed to fetch dashboard step count:", error);
    // Return empty array as fallback
    return [];
  }
};

/**
 * Fetches all the data needed for the dashboard screen.
 */
export const getDashboardData = async (): Promise<DashboardData> => {
  try {
    // Fetch medications and goals from backend
    const [medications, goals, activityData] = await Promise.all([
      getDashboardMedications(),
      getDashboardGoals(),
      getDashboardStepCounts(),
    ]);
    
    return {
      nudge: null, // Will be loaded separately
      goalProgress: 70,
      activityData: activityData,
      medications,
      goals,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    throw new Error("Could not fetch dashboard data.");
  }
};

/**
 * Fetches the initial nudge for the dashboard
 */
export const getInitialNudge = async (): Promise<NudgeData | null> => {
  return await getNudgeFromBackend();
};

/**
 * Sends nudge feedback (like or dislike) to the backend.
 * @param feedback "like" or "dislike" to indicate the user's feedback
 */
export const sendNudgeFeedback = async (
  feedback: "like" | "dislike"
): Promise<NudgeData | null> => {
  try {
    console.log("Sending nudge feedback to backend:", feedback);
    
    // Send the feedback to the feedback endpoint which also returns a new nudge
    const response = await apiClient.post('/agent/nudge/feedback/', {
      feedback: feedback
    }, {
      timeout: 60000 // 60 seconds timeout
    });
    
    // The feedback endpoint now returns the new nudge
    if (response.data.new_nudge) {
      return {
        text: response.data.new_nudge
      } as NudgeData;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to send nudge feedback:", error);
    return null;
  }
};

/**
 * Marks a medication as taken for a specific time
 */
export const markMedicationTaken = async (medicationId: string, scheduledTime: string): Promise<void> => {
  try {
    await apiClient.post(`/tracking/medications/${medicationId}/mark-taken/`, {
      scheduled_time: scheduledTime
    });
  } catch (error) {
    console.error("Failed to mark medication as taken:", error);
    throw new Error("Could not mark medication as taken.");
  }
};

/**
 * Unmarks a medication as taken for a specific time
 */
export const unmarkMedicationTaken = async (medicationId: string, scheduledTime: string): Promise<void> => {
  try {
    await apiClient.delete(`/tracking/medications/${medicationId}/unmark-taken/`, {
      data: { scheduled_time: scheduledTime }
    });
  } catch (error) {
    console.error("Failed to unmark medication as taken:", error);
    throw new Error("Could not unmark medication as taken.");
  }
};

/**
 * Delete a medication
 */
export const deleteMedication = async (medicationId: string): Promise<void> => {
  try {
    await apiClient.delete(`/tracking/medications/${medicationId}/`);
  } catch (error) {
    console.error("Failed to delete medications:", error);
    throw new Error("Could not delete medications.");
  }
};

/**
 * Marks a goal as completed for today
 */
export const markGoalCompleted = async (goalId: string): Promise<void> => {
  try {
    await apiClient.post(`/tracking/goals/${goalId}/mark-completed/`, {});
  } catch (error) {
    console.error("Failed to mark goal as completed:", error);
    throw new Error("Could not mark goal as completed.");
  }
};

/**
 * Delete a goal
 */
export const deleteGoal = async (goalId: string): Promise<void> => {
  try {
    await apiClient.delete(`/tracking/goals/${goalId}/`);
  } catch (error) {
    console.error("Failed to delete goal:", error);
    throw new Error("Could not delete goal.");
  }
};

/**
 * Unmarks a goal as completed for today
 */
export const unmarkGoalCompleted = async (goalId: string): Promise<void> => {
  try {
    await apiClient.delete(`/tracking/goals/${goalId}/unmark-completed/`);
  } catch (error) {
    console.error("Failed to unmark goal as completed:", error);
    throw new Error("Could not unmark goal as completed.");
  }
};

/**
 * Generates a question nudge from the backend API
 */
export const generateQuestionNudge = async (): Promise<QuestionNudgeData | null> => {
  try {
    const response = await apiClient.post('/agent/nudge/question/generate/', {}, {
      timeout: 60000 // 60 seconds for AI generation
    });
    
    return {
      question: response.data.question,
      sessionId: response.data.session_id
    } as QuestionNudgeData;
  } catch (error) {
    console.error("Failed to generate question nudge:", error);
    return null;
  }
};

/**
 * Sends user response to question nudge
 */
export const respondToQuestionNudge = async (
  userResponse: string, 
  sessionId: string
): Promise<QuestionNudgeResponse | null> => {
  try {
    const response = await apiClient.post('/agent/nudge/question/respond/', {
      response: userResponse,
      session_id: sessionId
    }, {
      timeout: 60000 // 30 seconds
    });
    
    return {
      response: response.data.response,
      sessionId: response.data.session_id
    } as QuestionNudgeResponse;
  } catch (error) {
    console.error("Failed to respond to question nudge:", error);
    return null;
  }
};

/**
 * Generates a goal nudge
 */
export const generateGoalNudge = async (): Promise<GoalNudgeData | null> => {
  try {
    const response = await apiClient.post('/agent/nudge/goal/generate/', {}, {
      timeout: 60000 // 60 seconds for AI generation
    });
    
    return {
      goal: response.data.goal,
      sessionId: response.data.session_id
    } as GoalNudgeData;
  } catch (error) {
    console.error("Failed to generate goal nudge:", error);
    return null;
  }
};

/**
 * Sends user response to goal nudge (yes/no)
 */
export const respondToGoalNudge = async (
  userResponse: string, 
  sessionId: string
): Promise<GoalNudgeResponse | null> => {
  try {
    const response = await apiClient.post('/agent/nudge/goal/respond/', {
      response: userResponse,
      session_id: sessionId
    }, {
      timeout: 60000 // 30 seconds
    });
    
    return {
      response: response.data.response,
      sessionId: response.data.session_id,
      accepted: response.data.accepted
    } as GoalNudgeResponse;
  } catch (error) {
    console.error("Failed to respond to goal nudge:", error);
    return null;
  }
};