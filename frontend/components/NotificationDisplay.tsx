import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useNotifications } from '../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';

interface NotificationProps {
  notification: {
    title: string;
    body: string;
    data?: any;
    image?: string;
  };
  onPress?: () => void;
  onDismiss?: () => void;
  autoHide?: boolean;
  hideDelay?: number;
}

const NotificationBanner: React.FC<NotificationProps> = ({
  notification,
  onPress,
  onDismiss,
  autoHide = true,
  hideDelay = 10000,
}) => {
  const [visible, setVisible] = useState(true);
  const slideAnim = useState(new Animated.Value(-100))[0];
  const opacityAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onDismiss?.();
    });
  };

  const handlePress = () => {
    onPress?.();
    handleDismiss();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.notification}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.solidContainer}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="notifications"
                size={24}
                color="#007AFF"
              />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={2}>
                {notification.title}
              </Text>
              <Text style={styles.body} numberOfLines={3}>
                {notification.body}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface NotificationDisplayProps {
  onNotificationPress?: (notification: any) => void;
}

export const NotificationDisplay: React.FC<NotificationDisplayProps> = ({
  onNotificationPress,
}) => {
  const { lastNotification, clearLastNotification } = useNotifications();
  const [currentNotification, setCurrentNotification] = useState<any>(null);

  useEffect(() => {
    if (lastNotification && lastNotification !== currentNotification) {
      setCurrentNotification(lastNotification);
    }
  }, [lastNotification]);

  const handleNotificationPress = () => {
    if (currentNotification && onNotificationPress) {
      onNotificationPress(currentNotification);
    }
  };

  const handleDismiss = () => {
    setCurrentNotification(null);
    clearLastNotification();
  };

  if (!currentNotification) return null;

  return (
    <NotificationBanner
      notification={currentNotification}
      onPress={handleNotificationPress}
      onDismiss={handleDismiss}
    />
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 80 : 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  notification: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  solidContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 18,
  },
  dismissButton: {
    padding: 4,
  },
});