export type NudgeFeedback = "like" | "dislike";

export interface NudgeData {
  text: string;
}

export interface QuestionNudgeData {
  question: string;
  sessionId: string;
}

export interface QuestionNudgeResponse {
  response: string;
  sessionId: string;
}

export interface GoalNudgeData {
  goal: string;
  sessionId: string;
}

export interface GoalNudgeResponse {
  response: string;
  sessionId: string;
  accepted: boolean;
}


export interface ActivityDataPoint {
    day: string;
    steps: number;
}

export interface Medication {
    id: string;
    name: string;
    time: string;
    taken: boolean;
    medicationId?: string; // Backend medication ID
    scheduledTime?: string; // Backend scheduled time (morning, noon, etc.)
}

export interface Goal {
    id: string;
    title: string;
    frequency: string;
    category: string;
    completed: boolean;
}

export interface DashboardData {
    nudge: NudgeData | null;
    questionNudge: QuestionNudgeData | null;
    goalProgress: number;
    activityData: ActivityDataPoint[];
    medications: Medication[];
    goals: Goal[];
}