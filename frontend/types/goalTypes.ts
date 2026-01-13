import { Frequency } from "./commonTypes";

/**
 * Defines the possible categories for a goal.
 */
export type GoalCategory = "activity" | "social" | "nutrition" | "mind";

/**
 * Represents a goal that has been saved to the database.
 */
export interface Goal {
    id: string;
    frequency: Frequency; // <-- Added
    category: GoalCategory;
    title: string;
    isCompleted: boolean;
    createdAt: string;
}

/**
 * Represents the data needed to create a new goal.
 */
export interface NewGoal {
    frequency: Frequency; // <-- Added
    category: GoalCategory;
    title: string;
}