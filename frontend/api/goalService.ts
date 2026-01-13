import { Goal, NewGoal } from '../types';
import apiClient from './apiClient';

/**
 * Posts a new goal to the server.
 * @param goalData The data for the new goal (category and title).
 * @returns The newly created goal object with an ID from the server.
 */
export const postNewGoal = async (goalData: NewGoal): Promise<Goal> => {
    try {
        const payload = { is_active: true, ...goalData}
        const response = await apiClient.post<Goal>(`tracking/goals/`, payload);
        return response.data;
    } catch (error) {
        console.error('Failed to post new goal:', error);
        throw new Error('An error occurred while saving your goal.');
    }
};