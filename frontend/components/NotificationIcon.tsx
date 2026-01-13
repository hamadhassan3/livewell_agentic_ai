import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS } from '@/constants/theme';
import { notificationService, Notification } from '@/api/notificationService';

interface NotificationIconProps {
  onPress?: () => void;
  size?: number;
  color?: string;
  refreshTrigger?: number; // Add this to trigger refresh from parent
}

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  onPress,
  size = 24,
  color = COLORS.textPrimary,
  refreshTrigger,
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotificationCount = async () => {
    try {
      setLoading(true);
      const notifications = await notificationService.getNotifications();
      // Count unread notifications
      const unreadNotifications = notifications.filter(
        (notification: any) => !notification.is_read
      );
      setUnreadCount(unreadNotifications.length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationCount();
    
    // Refresh notification count every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchNotificationCount();
    }
  }, [refreshTrigger]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    // Optionally refresh count after press
    fetchNotificationCount();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name="bell"
        size={size}
        color={color}
      />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount.toString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.error || '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});