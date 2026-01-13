import { useState, useEffect, useCallback } from 'react';
import { fcmService } from '../services/fcmService';
import { useAuthStore } from './useAuthStore';

interface NotificationState {
  isInitialized: boolean;
  hasPermission: boolean;
  token: string | null;
  lastNotification: any | null;
  isLoading: boolean;
  error: string | null;
}

interface UseNotificationsReturn extends NotificationState {
  initializeNotifications: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  clearError: () => void;
  clearLastNotification: () => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [state, setState] = useState<NotificationState>({
    isInitialized: false,
    hasPermission: false,
    token: null,
    lastNotification: null,
    isLoading: false,
    error: null,
  });

  const { isAuthenticated } = useAuthStore();

  const updateState = useCallback((updates: Partial<NotificationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const clearLastNotification = useCallback(() => {
    updateState({ lastNotification: null });
  }, [updateState]);

  const initializeNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      await fcmService.initialize();
      const storedToken = await fcmService.getStoredToken();
      
      updateState({
        isInitialized: true,
        hasPermission: !!storedToken,
        token: storedToken,
        isLoading: false
      });
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize notifications'
      });
    }
  }, [isAuthenticated, updateState]);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    updateState({ isLoading: true, error: null });

    try {
      const newToken = await fcmService.refreshToken();
      updateState({
        token: newToken,
        hasPermission: !!newToken,
        isLoading: false
      });
      return newToken;
    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh token'
      });
      return null;
    }
  }, [updateState]);


  useEffect(() => {
    if (!state.isInitialized) {
      console.log('🔔 useNotifications: Not initialized yet, skipping listener setup');
      return;
    }

    console.log('🔔 useNotifications: Setting up notification listener');
    const unsubscribe = fcmService.subscribeToNotifications((notification) => {
      console.log('🔔 useNotifications: Received notification from FCM service:', notification);
      updateState({ lastNotification: notification });
    });

    return unsubscribe;
  }, [state.isInitialized, updateState]);

  useEffect(() => {
    if (isAuthenticated && !state.isInitialized) {
      initializeNotifications();
    }
  }, [isAuthenticated, state.isInitialized, initializeNotifications]);

  useEffect(() => {
    return () => {
      fcmService.cleanup();
    };
  }, []);

  return {
    ...state,
    initializeNotifications,
    refreshToken,
    clearError,
    clearLastNotification,
  };
};