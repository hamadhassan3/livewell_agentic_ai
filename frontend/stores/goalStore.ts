import { create } from 'zustand';
import { postNewGoal } from '../api/goalService';
import { Goal, NewGoal } from '../types';

interface GoalState {
    goals: Goal[];
    isLoading: boolean;
    error: string | null;
    addGoal: (newGoal: NewGoal) => Promise<boolean>;
}

export const useGoalStore = create<GoalState>((set) => ({
    goals: [],
    isLoading: false,
    error: null,

    addGoal: async (newGoal: NewGoal) => {
        set({ isLoading: true, error: null });
        try {
            const addedGoal = await postNewGoal(newGoal);
            set((state) => ({
                goals: [addedGoal, ...state.goals],
                isLoading: false,
            }));
            return true; // Indicate success
        } catch (err: any) {
            set({ isLoading: false, error: err.message || 'An unknown error occurred.' });
            return false; // Indicate failure
        }
    },
}));
