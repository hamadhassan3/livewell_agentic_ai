import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { notificationService, Notification } from '@/api/notificationService';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onMarkAsRead?: (notificationId: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onPress, onMarkAsRead }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        notification.status === 'failed' && styles.failedNotification,
        !notification.is_read && styles.unreadNotification
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIcon}>
          <MaterialCommunityIcons
            name={notification.status === 'failed' ? "alert-circle" : notification.is_read ? "check-circle" : "circle"}
            size={20}
            color={notification.status === 'failed' ? COLORS.error : notification.is_read ? COLORS.primary : COLORS.textSecondary}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            !notification.is_read && styles.unreadText
          ]} numberOfLines={2}>
            {notification.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={3}>
            {notification.body}
          </Text>
          <View style={styles.notificationMeta}>
            <Text style={styles.notificationTime}>
              {formatDate(notification.created_at)}
            </Text>
            {!notification.is_read && (
              <TouchableOpacity
                style={styles.markReadButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onMarkAsRead?.(notification.id);
                }}
              >
                <Text style={styles.markReadText}>Mark as read</Text>
              </TouchableOpacity>
            )}
            {notification.status === 'failed' && (
              <Text style={styles.errorBadge}>Failed</Text>
            )}
          </View>
        </View>
      </View>
      {notification.image_url && (
        <View style={styles.imageIndicator}>
          <MaterialCommunityIcons name="image" size={16} color={COLORS.textSecondary} />
          <Text style={styles.imageText}>Image attached</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible]);

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read when pressed if not already read
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    // Handle notification tap - could navigate to relevant screen based on notification.data
    console.log('Notification pressed:', notification);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, status: 'read' as const }
            : notification
        )
      );
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      const result = await notificationService.markAllNotificationsAsRead();
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          is_read: true,
          status: 'read' as const
        }))
      );
      console.log(`Marked ${result.count} notifications as read`);
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onMarkAsRead={handleMarkAsRead}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="bell-off"
        size={64}
        color={COLORS.textSecondary}
      />
      <Text style={styles.emptyStateTitle}>No notifications</Text>
      <Text style={styles.emptyStateSubtitle}>
        You'll see your notifications here when you receive them
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <MaterialCommunityIcons
        name="alert-circle"
        size={64}
        color={COLORS.error}
      />
      <Text style={styles.errorTitle}>Failed to load notifications</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerActions}>
            {notifications.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : error ? (
            renderError()
          ) : notifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  failedNotification: {
    borderColor: COLORS.error,
    backgroundColor: '#fef2f2',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIcon: {
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: FONT_WEIGHTS.bold,
  },
  notificationBody: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  multicastBadge: {
    fontSize: 10,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: FONT_WEIGHTS.medium,
  },
  errorBadge: {
    fontSize: 10,
    color: COLORS.error,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: FONT_WEIGHTS.medium,
  },
  markReadButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  markReadText: {
    fontSize: 10,
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  imageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  imageText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: FONT_SIZES.subheading,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.button,
    fontWeight: FONT_WEIGHTS.medium,
  },
});