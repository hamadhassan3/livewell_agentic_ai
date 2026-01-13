import { Frequency } from "./commonTypes";

export type ReminderTimeId = 'morning' | 'noon' | 'evening' | 'bedtime';

/**
 * Represents a medication that has been saved and has an ID from the database.
 */
export interface MedicationModel {
    id: string; // Unique identifier from the server
    name: string;
    dosage: string;
    notes: string;
    frequencyType: Frequency;
    reminderTimes: ReminderTimeId[];
}

/**
 * Represents the data for a new medication before it has been saved to the database.
 * It does not have an ID yet.
 */
export interface NewMedication {
    name: string;
    dosage: string;
    notes: string;
    frequencyType: Frequency;
    reminderTimes: ReminderTimeId[];
}