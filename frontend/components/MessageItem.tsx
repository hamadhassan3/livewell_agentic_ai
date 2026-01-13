// components/MessageItem.tsx
import { MessageFeedback } from '@/api/chatService';
import avatarImage from '@/assets/images/avatar.png';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { Message } from '@/hooks/useChat';
import { useTtsStore } from '@/hooks/useTts';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import {
	Dimensions,
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface MessageItemProps {
	item: Message;
	onRetry: (messageId: string) => void;
	onFeedback: (messageId: string, feedback: MessageFeedback) => void;
}

const formatTime = (date: Date): string =>
	new Date(date).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	});

export const MessageItem: React.FC<MessageItemProps> = React.memo(
	({ item, onRetry, onFeedback }) => {
		const { speak, speakingMessageId } = useTtsStore();
		const isSpeaking = speakingMessageId === item.id;
		const [isFeedbackLoading, setIsFeedbackLoading] = React.useState(false);

		console.log(item);

		return (
			<View
				style={[
					styles.messageContainer,
					item.isUser
						? styles.userMessageContainer
						: styles.botMessageContainer,
				]}
			>
				{/* Icon above message */}
				<View
					style={[
						styles.iconContainer,
						item.isUser ? styles.userIconContainer : styles.botIconContainer,
					]}
				>
					{item.isUser ? (
						<Text style={[styles.messageIcon, styles.userIcon]}>👤</Text>
					) : (
						<Image
							source={avatarImage}
							style={[styles.messageIcon, styles.botIcon]}
						/>
					)}
				</View>

				<View style={styles.rowContainer}>
					<View
						style={[
							styles.messageBubble,
							item.isUser ? styles.userBubble : styles.botBubble,
						]}
					>
						<Text
							style={[
								styles.messageText,
								item.isUser ? styles.userText : styles.botText,
							]}
						>
							{item.text}
						</Text>
						<View style={styles.messageInfo}>
							{!item.isUser && (
								<TouchableOpacity
									style={[
										styles.sideButton,
										isSpeaking && styles.sideButtonActive,
									]}
									onPress={() => speak(item.id, item.text)}
								>
									<Ionicons
										name={isSpeaking ? 'volume-mute' : 'volume-high'}
										style={[
											styles.sideButtonIcon,
											isSpeaking && styles.sideButtonIconActive,
										]}
									/>
								</TouchableOpacity>
							)}
							<Text
								style={[
									styles.timestamp,
									item.isUser ? styles.userTimestamp : styles.botTimestamp,
								]}
							>
								{formatTime(item.timestamp)}
							</Text>
							{item.isUser && (
								<TouchableOpacity
									onPress={() => item.status === 'failed' && onRetry(item.id)}
								>
									<Text style={styles.status}>
										{item.status === 'sending'
											? '○'
											: item.status === 'sent'
											? '✓'
											: '✗'}
									</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
				</View>

				{/* Feedback section - placeholder */}
				{!item.isUser && (
					<View
						style={[
							styles.feedbackContainer,
							item.isUser ? {} : styles.botFeedbackContainer,
						]}
					>
						<TouchableOpacity
							style={[styles.feedbackButton, item.feedback === 'like' && styles.feedbackButtonSelected]}
							onPress={() => onFeedback(item.id, 'like')}
							disabled={isFeedbackLoading}
						>
							<Text style={styles.feedbackIcon}>👍</Text>
							<Text style={styles.feedbackText}>GOOD</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.feedbackButton, item.feedback === 'dislike' && styles.feedbackButtonSelected]}
							onPress={() => onFeedback(item.id, 'dislike')}
							disabled={isFeedbackLoading}
						>
							<Text style={styles.feedbackIcon}>👎</Text>
							<Text style={styles.feedbackText}>BAD</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.feedbackButton, item.feedback === 'love' && styles.feedbackButtonSelected]}
							onPress={() => onFeedback(item.id, 'love')}
							disabled={isFeedbackLoading}
						>
							<Text style={styles.feedbackIcon}>❤️</Text>
							<Text style={styles.feedbackText}>LOVE</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.feedbackButton}
							onPress={() => {
								Clipboard.setStringAsync(item.text);
							}}
						>
							<Text style={styles.feedbackIcon}>📋</Text>
							<Text style={styles.feedbackText}>COPY</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		);
	}
);

const styles = StyleSheet.create({
	messageContainer: {
		paddingVertical: 6,
		marginVertical: 2,
	},
	userMessageContainer: { alignItems: 'flex-end' },
	botMessageContainer: { alignItems: 'flex-start' },

	rowContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
	},
	iconContainer: {
		marginHorizontal: 8,
		marginVertical: 4,
	},
	messageIcon: {
		fontSize: 30,
		backgroundColor: COLORS.surface,
		borderRadius: 25,
		width: 50,
		height: 50,
		textAlign: 'center',
		lineHeight: 50,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	userIcon: {
		backgroundColor: COLORS.primary + '20',
		borderWidth: 2,
		borderColor: COLORS.primary,
	},
	botIcon: {
		backgroundColor: COLORS.surface,
		borderWidth: 2,
		borderColor: COLORS.border,
	},
	contentContainer: {
		flexDirection: 'row', // For bot message + side button
		alignItems: 'flex-end', // For bot message + side button
	},
	botContentContainer: {
		flex: 1,
		maxWidth: '100%',
	},
	messageBubble: {
		maxWidth: '100%',
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderRadius: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 3,
	},
	userBubble: {
		backgroundColor: COLORS.primary,
		borderBottomRightRadius: 8,
	},
	botBubble: {
		backgroundColor: COLORS.surface,
		borderBottomLeftRadius: 8,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	messageText: {
		fontSize: FONT_SIZES.body,
		lineHeight: 24,
		fontWeight: FONT_WEIGHTS.regular,
	},
	userText: { color: COLORS.textOnPrimary },
	botText: { color: COLORS.textPrimary },
	messageInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 6,
		justifyContent: 'flex-end',
	},
	timestamp: {
		fontSize: 16,
		marginRight: 6,
		fontWeight: FONT_WEIGHTS.medium,
	},
	userTimestamp: { color: 'rgba(255,255,255,0.8)' },
	botTimestamp: { color: COLORS.textSecondary },
	status: {
		fontSize: 13,
		color: 'rgba(255,255,255,0.9)',
		fontWeight: FONT_WEIGHTS.medium,
	},

	feedbackContainer: {
		flexDirection: 'row',
		marginTop: 10,
		gap: 8,
	},
	botFeedbackContainer: {
		// marginLeft: 50,
		alignItems: 'flex-start',
	},
	feedbackButton: {
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 2,
		minWidth: 70,
	},
	feedbackButtonSelected: {
		borderColor: COLORS.primary,
		backgroundColor: COLORS.primary + '20',
	},
	feedbackIcon: {
		fontSize: 24,
		marginBottom: 4,
		textAlign: 'center',
	},
	feedbackText: {
		fontSize: 12,
		fontWeight: FONT_WEIGHTS.high,
		color: COLORS.textPrimary,
		textAlign: 'center',
	},
	sideButton: {
		marginRight: 12,
		marginBottom: 0,
		padding: 8,
		borderRadius: 20,
		backgroundColor: COLORS.surface,
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	sideButtonIcon: {
		fontSize: 24,
		color: COLORS.primary,
	},
	sideButtonActive: {
		backgroundColor: COLORS.primary,
		borderColor: COLORS.primary,
	},
	sideButtonIconActive: {
		color: COLORS.textOnPrimary,
	},
});
