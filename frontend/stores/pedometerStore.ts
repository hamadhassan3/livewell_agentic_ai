import { create } from "zustand";

interface PedometerState {
  steps: number;
  isAvailable: boolean;
  lastFetched: Date | null;
  setSteps: (count: number) => void;
  setIsAvailable: (available: boolean) => void;
  setLastFetched: (date: Date) => void;
  reset: () => void;
}

export const usePedometerStore = create<PedometerState>((set) => ({
  steps: 0,
  isAvailable: false,
  lastFetched: null,

  setSteps: (count) => set({ steps: count }),
  setIsAvailable: (available) => set({ isAvailable: available }),
  setLastFetched: (date) => set({ lastFetched: date }),
  reset: () => set({ steps: 0, lastFetched: null }),
}));