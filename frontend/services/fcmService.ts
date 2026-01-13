import { Platform } from 'react-native';
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported,
  Messaging,
  MessagePayload
} from 'firebase/messaging';
import { app } from './firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

const FCM_TOKEN_KEY = '@fcm_token';
const VAPID_KEY = 'BCq-EtirAyUGGB9gUyGNJTsgJVDeQwg2VI2YdSSsWJUzza8sWXwdhKV4Ztu7D9tJICjdIp9G-Svj-4K7t99r4z4'; // You'll need to get this from Firebase Console

class FCMService {
  private messaging: Messaging | null = null;
  private unsubscribeOnMessage: (() => void) | null = null;
  private notificationListeners: ((notification: any) => void)[] = [];

  async initialize() {
    console.log('🔥 FCM Service: Starting initialization...');
    console.log('🔥 FCM Service: Platform:', Platform.OS);
    console.log('🔥 FCM Service: User Agent:', navigator.userAgent);
    console.log('🔥 FCM Service: Current URL:', window.location.href);
    
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      console.log('🔥 FCM Service: Web platform detected, checking support...');
      const supported = await isSupported();
      console.log('🔥 FCM Service: Firebase messaging supported:', supported);
      
      if (supported) {
        // Register service worker first
        await this.registerServiceWorker();
        
        this.messaging = getMessaging(app);
        console.log('🔥 FCM Service: Messaging instance created, setting up web notifications...');
        await this.setupWebNotifications();
      } else {
        console.warn('🔥 FCM Service: Firebase messaging not supported on this browser');
      }
    } else {
      console.log('🔥 FCM Service: Mobile platform detected, setting up mobile notifications...');
      await this.setupMobileNotifications();
    }
    
    console.log('🔥 FCM Service: Initialization complete');
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('🔥 FCM Service: Registering service worker...');
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('🔥 FCM Service: Service worker registered successfully:', registration);
        return registration;
      } catch (error) {
        console.error('🔥 FCM Service: Service worker registration failed:', error);
        throw error;
      }
    } else {
      throw new Error('Service workers are not supported in this browser');
    }
  }

  private async setupWebNotifications() {
    if (!this.messaging) {
      console.error('🔥 FCM Service: No messaging instance available');
      return;
    }

    try {
      console.log('🔥 FCM Service: Requesting notification permission...');
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      console.log('🔥 FCM Service: Permission result:', permission);
      
      if (permission === 'granted') {
        console.log('🔥 FCM Service: Notification permission granted, getting FCM token...');
        
        // Get FCM token
        const token = await this.getFCMToken();
        console.log('🔥 FCM Service: Token received:', token ? 'YES' : 'NO');
        
        if (token) {
          console.log('🔥 FCM Service: Sending token to backend...');
          await this.sendTokenToBackend(token);
          console.log('🔥 FCM Service: Token sent to backend successfully');
        } else {
          console.warn('🔥 FCM Service: No token received from getFCMToken');
        }
        
        // Listen for messages when app is in foreground
        this.setupForegroundListener();
        console.log('🔥 FCM Service: Foreground listener set up');
      } else {
        console.warn('🔥 FCM Service: Notification permission denied or dismissed:', permission);
      }
    } catch (error) {
      console.error('🔥 FCM Service: Error setting up web notifications:', error);
    }
  }

  private async setupMobileNotifications() {
    try {
      // For React Native, you would typically use a library like
      // @react-native-firebase/messaging
      // Since we're using Expo, we'll use expo-notifications
      
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');
      
      if (!Device.default.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id' // Replace with your project ID
      });
      
      console.log('Expo Push Token:', token.data);
      
      // For FCM, you would need to get the native FCM token
      // This requires ejecting from Expo or using EAS Build
      
      // Set up notification handlers
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Handle notifications when app is in foreground
      const subscription = Notifications.addNotificationReceivedListener((notification: any) => {
        console.log('Notification received:', notification);
        this.handleNotification(notification);
      });

      // Handle notification clicks
      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log('Notification clicked:', response);
        this.handleNotificationClick(response.notification);
      });

      // Store subscriptions for cleanup
      this.unsubscribeOnMessage = () => {
        subscription.remove();
        responseSubscription.remove();
      };
      
    } catch (error) {
      console.error('Error setting up mobile notifications:', error);
    }
  }

  private async getFCMToken(): Promise<string | null> {
    if (!this.messaging) {
      console.error('🔥 FCM Service: No messaging instance for token generation');
      return null;
    }

    try {
      console.log('🔥 FCM Service: Attempting to get token with VAPID key...');
      console.log('🔥 FCM Service: VAPID key (first 10 chars):', VAPID_KEY.substring(0, 10) + '...');
      
      const currentToken = await getToken(this.messaging, { 
        vapidKey: VAPID_KEY 
      });
      
      if (currentToken) {
        console.log('🔥 FCM Service: FCM Token generated successfully');
        console.log('🔥 FCM Service: Token (first 20 chars):', currentToken);
        await this.saveTokenLocally(currentToken);
        return currentToken;
      } else {
        console.warn('🔥 FCM Service: No registration token available - this might indicate a configuration issue');
        return null;
      }
    } catch (error) {
      console.error('🔥 FCM Service: Error occurred while retrieving token:', error);
      return null;
    }
  }

  private async saveTokenLocally(token: string) {
    try {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving FCM token locally:', error);
    }
  }

  private async sendTokenToBackend(token: string) {
    try {
      console.log('🔥 FCM Service: Sending token to backend...');
      console.log('🔥 FCM Service: Backend URL:', '/notifications/fcm/token/');
      console.log('🔥 FCM Service: Token length:', token.length);
      
      const response = await apiClient.post('/notifications/fcm/token/', {
        fcm_token: token
      });
      
      console.log('🔥 FCM Service: Backend response:', response.status, response.data);
    } catch (error: any) {
      console.error('🔥 FCM Service: Error sending FCM token to backend:', error);
      if (error.response) {
        console.error('🔥 FCM Service: Backend error response:', error.response.status, error.response.data);
      }
    }
  }

  private setupForegroundListener() {
    if (!this.messaging) return;

    this.unsubscribeOnMessage = onMessage(this.messaging, (payload: MessagePayload) => {
      console.log('Message received in foreground:', payload);
      this.handleWebNotification(payload);
    });
  }

  private handleWebNotification(payload: MessagePayload) {
    console.log('🔔 FCM Service: Handling web notification:', payload);
    
    const notification = {
      title: payload.notification?.title || 'New Notification',
      body: payload.notification?.body || '',
      data: payload.data,
      image: payload.notification?.image
    };

    console.log('🔔 FCM Service: Processed notification:', notification);

    // Show notification using browser Notification API
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: notification.image || '/icon.png',
        data: notification.data
      });
    }

    // Notify listeners (this will trigger the in-app banner)
    console.log('🔔 FCM Service: Notifying', this.notificationListeners.length, 'listeners');
    this.notifyListeners(notification);
  }

  private handleNotification(notification: any) {
    // Process notification data
    const processedNotification = {
      title: notification.request?.content?.title || 'New Notification',
      body: notification.request?.content?.body || '',
      data: notification.request?.content?.data || {},
    };

    // Notify listeners
    this.notifyListeners(processedNotification);
  }

  private handleNotificationClick(notification: any) {
    // Handle navigation based on notification data
    const data = notification.request?.content?.data || {};
    
    // Example: Navigate to specific screen based on notification type
    if (data.type === 'medication') {
      // Navigate to medication screen
      console.log('Navigate to medication screen');
    } else if (data.type === 'questionnaire') {
      // Navigate to questionnaire screen
      console.log('Navigate to questionnaire screen');
    }
    // Add more navigation logic as needed
  }

  private notifyListeners(notification: any) {
    this.notificationListeners.forEach(listener => {
      listener(notification);
    });
  }

  // Public methods

  async refreshToken() {
    const token = await this.getFCMToken();
    if (token) {
      await this.sendTokenToBackend(token);
    }
    return token;
  }

  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(FCM_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting stored FCM token:', error);
      return null;
    }
  }

  async deleteToken() {
    try {
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      await apiClient.delete('/notifications/fcm/token/');
      console.log('FCM token deleted');
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  }

  subscribeToNotifications(listener: (notification: any) => void) {
    this.notificationListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.notificationListeners.indexOf(listener);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);
      }
    };
  }

  async subscribeToTopic(topic: string) {
    try {
      const response = await apiClient.post('/profiles/notifications/subscribe/', {
        topic
      });
      console.log(`Subscribed to topic: ${topic}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
      throw error;
    }
  }

  async unsubscribeFromTopic(topic: string) {
    try {
      const response = await apiClient.delete('/profiles/notifications/subscribe/', {
        data: { topic }
      });
      console.log(`Unsubscribed from topic: ${topic}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
      throw error;
    }
  }

  cleanup() {
    if (this.unsubscribeOnMessage) {
      this.unsubscribeOnMessage();
      this.unsubscribeOnMessage = null;
    }
    this.notificationListeners = [];
  }

  // Debug method - call this from browser console to test FCM
  async debugFCM() {
    console.log('🔥 FCM Debug: Starting manual FCM test...');
    console.log('🔥 FCM Debug: Current messaging instance:', this.messaging ? 'EXISTS' : 'NULL');
    
    try {
      await this.initialize();
      console.log('🔥 FCM Debug: Manual initialization completed');
      
      const storedToken = await this.getStoredToken();
      console.log('🔥 FCM Debug: Stored token:', storedToken ? storedToken.substring(0, 20) + '...' : 'NONE');
      
      if (this.messaging) {
        const newToken = await this.getFCMToken();
        console.log('🔥 FCM Debug: New token generation result:', newToken ? 'SUCCESS' : 'FAILED');
      }
    } catch (error) {
      console.error('🔥 FCM Debug: Error during manual test:', error);
    }
  }

  // Test method to manually trigger a notification display
  testNotification() {
    console.log('🔔 FCM Test: Triggering test notification...');
    const testNotification = {
      title: 'Test Notification',
      body: 'This is a test notification to verify the display is working!',
      data: { type: 'test' }
    };
    
    console.log('🔔 FCM Test: Current listeners:', this.notificationListeners.length);
    this.notifyListeners(testNotification);
    console.log('🔔 FCM Test: Test notification sent to listeners');
  }
}

export const fcmService = new FCMService();

// Make fcmService available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).fcmService = fcmService;
}