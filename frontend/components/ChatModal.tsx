import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Dimensions,
    PanResponder,
    Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ChatScreen } from '@/screens/ChatScreen';
import { useChatModalStore } from '@/stores/chatModalStore';
import { COLORS } from '@/constants/theme';

const SWIPE_THRESHOLD = 50; // Minimum distance to trigger close

export const ChatModal: React.FC = () => {
    const { isVisible, closeModal } = useChatModalStore();
    const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('screen')); // Use 'screen' for full device height
    const slideAnim = useRef(new Animated.Value(screenDimensions.height));
    const fadeAnim = useRef(new Animated.Value(0));
    const panY = useRef(new Animated.Value(0));

    // Listen for screen dimension changes and update animation values
    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ screen }) => {
            setScreenDimensions(screen);
            // Update animation initial value when dimensions change
            if (!isVisible) {
                slideAnim.current.setValue(screen.height);
            }
        });

        return () => subscription?.remove();
    }, [isVisible]);

    // Pan responder for swipe-down gesture
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only activate if swiping down
                return gestureState.dy > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                // Only allow downward swipes
                if (gestureState.dy > 0) {
                    panY.current.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > SWIPE_THRESHOLD) {
                    // Close modal if swiped down enough
                    closeModalWithAnimation();
                } else {
                    // Snap back to original position
                    Animated.spring(panY.current, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const closeModalWithAnimation = () => {
        Animated.parallel([
            Animated.timing(slideAnim.current, {
                toValue: screenDimensions.height,
                duration: 350,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim.current, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            closeModal();
            panY.current.setValue(0);
        });
    };

    useEffect(() => {
        if (isVisible) {
            // Open animation
            Animated.parallel([
                Animated.spring(slideAnim.current, {
                    toValue: 0,
                    damping: 25,
                    stiffness: 120,
                    mass: 1,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim.current, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Reset animations when closed
            slideAnim.current.setValue(screenDimensions.height);
            fadeAnim.current.setValue(0);
            panY.current.setValue(0);
        }
    }, [isVisible]);

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="none"
            onRequestClose={closeModalWithAnimation}
            statusBarTranslucent={true}
        >
            <Animated.View 
                style={[
                    styles.fullScreenContainer,
                    {
                        opacity: fadeAnim.current,
                        transform: [
                            { translateY: slideAnim.current },
                            { translateY: panY.current }
                        ]
                    }
                ]}
                {...panResponder.panHandlers}
            >
                {/* Close Button */}
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closeModalWithAnimation}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialCommunityIcons
                        name="close"
                        size={28}
                        color={COLORS.textPrimary}
                    />
                </TouchableOpacity>

                {/* Chat Content */}
                <View style={styles.chatContainer}>
                    <ChatScreen onBack={closeModalWithAnimation} />
                </View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.background,
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30, // Account for status bar
        right: 20,
        zIndex: 1000, // Above the container
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
    },
    chatContainer: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 44 : 0, // Safe area for status bar
    },
});
