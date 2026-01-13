import { LeaderboardData } from '../types';
import apiClient from './apiClient';

/**
 * Fetches the leaderboard data from the server.
 * Returns top 20 users and current user's position if not in top 20.
 */
export const getLeaderboard = async (): Promise<LeaderboardData> => {
    try {
        const response = await apiClient.get<LeaderboardData>('profiles/leaderboard/');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        throw new Error('An error occurred while fetching the leaderboard.');
    }
};
