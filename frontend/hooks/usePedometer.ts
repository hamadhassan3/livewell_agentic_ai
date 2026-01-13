import { syncPedometerData } from '@/api/activityService';
import { preferenceStorage } from '@/services/preferenceStorage';
import { Pedometer, PedometerResult } from 'expo-sensors';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from './useAuthStore';

const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

/**
 * Hook to manage pedometer syncing in the background.
 * Fetches steps since last sync, sends them to server, and repeats every SYNC_INTERVAL.
 * Only runs when the user is authenticated.
 */
export const usePedometer = () => {
	const { isAuthenticated } = useAuthStore();

  const syncSteps = useCallback(async () => {
    console.log('👟 Pedometer: Syncing daily steps...');
    try {
      let lastSyncDate = await preferenceStorage.getStepCountLastFetchedTime();
      const now = new Date();
      const today = new Date(now);

      // If never synced, start from yesterday
      const startDate = lastSyncDate ? new Date(lastSyncDate) : new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (let currentDay = new Date(startDate); currentDay <= today; currentDay.setDate(currentDay.getDate() + 1)) {
        // Create a new Date object for the start of the day to avoid mutation issues.
        const dayStart = new Date(currentDay);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        console.log(`👟 Pedometer: Fetching steps for ${formatDate(dayStart)}`);
        const result: PedometerResult = await Pedometer.getStepCountAsync(dayStart, dayEnd);
        
        if (result.steps > 0) {
          await syncPedometerData({ date: formatDate(dayStart), steps: result.steps });
        }
      }

      await preferenceStorage.saveStepCountLastFetchedTime(now);
      console.log('👟 Pedometer: Sync complete.');
    } catch (error) {
      console.error('👟 Pedometer: Failed to sync steps', error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const setup = async () => {
      console.log('👟 Pedometer: Setup started. Sync will occur on app start and foreground.');

      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) return;

      const permission = await Pedometer.requestPermissionsAsync();
      if (!permission.granted) return;

      await syncSteps();
			console.log('👟 Pedometer: Setup complete. Sync will occur on app start and foreground.');
    };

    setup();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') syncSteps();
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, syncSteps]);
};
