import { useCallback, useEffect, useState } from 'react';
import { getDashboardData, getInitialNudge, generateQuestionNudge } from '../api/dashboardService';
import { getLeaderboard } from '../api/leaderboardService';
import { DashboardData, NudgeData, QuestionNudgeData, QuestionNudgeResponse } from '../types';

export const useDashboardData = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isNudgeLoading, setIsNudgeLoading] = useState<boolean>(true);
    const [isQuestionNudgeLoading, setIsQuestionNudgeLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [userPoints, setUserPoints] = useState<number>(0);
    const [questionNudgeResponse, setQuestionNudgeResponse] = useState<QuestionNudgeResponse | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // Fetch dashboard data immediately (without nudge)
            const result = await getDashboardData();
            // Initialize questionNudge as null
            const initialData = { ...result, questionNudge: null };
            setData(initialData);
            setLoading(false);
            
            // Fetch nudge separately
            setIsNudgeLoading(true);
            const nudge = await getInitialNudge();
            setData(prevData => prevData ? { ...prevData, nudge } : null);
            setIsNudgeLoading(false);
                        
            // Fetch user points from leaderboard
            try {
                const leaderboardData = await getLeaderboard();
                if (leaderboardData?.current_user?.points !== undefined) {
                    setUserPoints(leaderboardData.current_user.points);
                } else {
                    // If current_user is null, user is not in leaderboard yet (0 points)
                    setUserPoints(0);
                }
            } catch (err) {
                console.log('Failed to fetch user points:', err);
                // Set to 0 points on error
                setUserPoints(0);
            }
        } catch (err) {
            setError('Failed to load dashboard. Please try again later.');
            setIsNudgeLoading(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateNudge = (newNudge: NudgeData | null) => {
        setData(prevData => {
            if (!prevData) return null; // If there's no data, do nothing
            return {
                ...prevData, // Keep all the existing dashboard data
                nudge: newNudge, // Only replace the nudge part
            };
        });
    };

    const updateQuestionNudge = (newQuestionNudge: QuestionNudgeData | null) => {
        setData(prevData => {
            if (!prevData) return null;
            return {
                ...prevData,
                questionNudge: newQuestionNudge,
            };
        });
    };

    const generateNewQuestionNudge = useCallback(async () => {
        try {
            setIsQuestionNudgeLoading(true);
            const questionNudge = await generateQuestionNudge();
            updateQuestionNudge(questionNudge);
        } catch (error) {
            console.error('Failed to generate question nudge:', error);
        } finally {
            setIsQuestionNudgeLoading(false);
        }
    }, []);

    const refreshMedicationsOnly = useCallback(async () => {
        try {
            console.log('refreshMedicationsOnly called');
            // Only fetch dashboard data (which includes medications) without nudge
            const result = await getDashboardData();
            setData(prevData => {
                if (!prevData) return result;
                return {
                    ...result, // New data including updated medications
                    nudge: prevData.nudge, // Keep the existing nudge
                    questionNudge: prevData.questionNudge, // Keep the existing question nudge
                };
            });
        } catch (err) {
            console.error('Failed to refresh medications:', err);
        }
    }, []);

    return { 
        data, 
        loading, 
        error, 
        isNudgeLoading, 
        setIsNudgeLoading,
        isQuestionNudgeLoading,
        setIsQuestionNudgeLoading,
        updateNudge,
        updateQuestionNudge,
        generateNewQuestionNudge,
        questionNudgeResponse,
        setQuestionNudgeResponse,
        refetch: fetchData,
        refreshMedicationsOnly,
        userPoints 
    };
};