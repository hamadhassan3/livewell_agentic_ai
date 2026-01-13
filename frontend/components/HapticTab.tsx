import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { useChatModalStore } from '@/stores/chatModalStore';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { isVisible: isChatModalVisible, closeModal } = useChatModalStore();

  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        // Close chat modal when any tab is pressed
        if (isChatModalVisible) {
          closeModal();
        }
        
        props.onPressIn?.(ev);
      }}
    />
  );
}
