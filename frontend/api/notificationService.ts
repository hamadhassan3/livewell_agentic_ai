import apiClient from './apiClient';

export interface Notification {
  id: number;
  title: string;
  body: string;
  data?: Record<string, any>;
  image_url?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
  read_at?: string;
  is_read: boolean;
}

export interface FCMTokenStatus {
  fcm_token: string | null;
  updated_at: string | null;
  is_active: boolean;
}

export interface SendNotificationRequest {
  title: string;
  body: string;
  data?: Record<string, any>;
  image_url?: string;
  user_id?: number;
  send_to_all?: boolean;
}

export interface NotificationLog {
  id: number;
  recipient_email?: string;
  title: string;
  body: string;
  data: Record<string, any>;
  image_url?: string;
  sent_at: string;
  success: boolean;
  error_message?: string;
  is_multicast: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

class NotificationService {
  /**
   * Update FCM token for the current user
   */
  async updateFCMToken(fcmToken: string): Promise<{ message: string; fcm_token: string; updated_at: string }> {
    try {
      const response = await apiClient.post('/notifications/fcm/token/', {
        fcm_token: fcmToken,
      });
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Remove FCM token for the current user
   */
  async removeFCMToken(): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete('/notifications/fcm/token/');
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get FCM token status for the current user
   */
  async getFCMTokenStatus(): Promise<FCMTokenStatus> {
    try {
      const response = await apiClient.get<FCMTokenStatus>('/notifications/fcm/token/status/');
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Send a notification
   */
  async sendNotification(notificationData: SendNotificationRequest): Promise<any> {
    try {
      const response = await apiClient.post('/notifications/send/', notificationData);
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get notifications for the current user (with read status)
   */
  async getNotifications(): Promise<Notification[]> {
    try {
      const response = await apiClient.get<Notification[]>('/notifications/');
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Get notification logs for the current user (admin/debug purposes)
   */
  async getNotificationLogs(recipientId?: number): Promise<NotificationLog[]> {
    try {
      const params = recipientId ? { recipient_id: recipientId } : {};
      const response = await apiClient.get<NotificationLog[]>('/notifications/logs/', { params });
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: number): Promise<{ message: string }> {
    try {
      const response = await apiClient.patch(`/notifications/${notificationId}/`, {
        action: 'mark_read'
      });
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<{ message: string; count: number }> {
    try {
      const response = await apiClient.post('/notifications/mark-all-read/');
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Alias for markNotificationAsRead - matches component usage
   */
  async markAsRead(notificationId: number): Promise<{ message: string }> {
    return this.markNotificationAsRead(notificationId);
  }

  /**
   * Alias for markAllNotificationsAsRead - matches component usage
   */
  async markAllAsRead(): Promise<{ message: string; count: number }> {
    return this.markAllNotificationsAsRead();
  }

  /**
   * Centralized error handling for API calls
   */
  private handleApiError(error: any): ApiError {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.detail || error.response.data?.message || 'An error occurred',
        code: error.response.data?.code,
        status: error.response.status,
      };
    } else if (error.request) {
      // Network error
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    } else {
      // Other error
      return {
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      };
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export individual functions for easier importing
export const {
  updateFCMToken,
  removeFCMToken,
  getFCMTokenStatus,
  sendNotification,
  getNotifications,
  getNotificationLogs,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markAsRead,
  markAllAsRead,
} = notificationService;