// components/ChatWindow.tsx
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { Message, useChat } from '@/hooks/useChat';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
	Animated,
	Dimensions,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { MessageItem } from './MessageItem';

const { width: screenWidth } = Dimensions.get('window');

// Removed animated bubble component - using static bubbles to prevent re-animation issues

// Animated typing dot
const TypingDot: React.FC<{ delay: number }> = ({ delay }) => {
	const scale = React.useRef(new Animated.Value(0.6)).current;
	const opacity = React.useRef(new Animated.Value(0.4)).current;

	useEffect(() => {
		const seq = Animated.sequence([
			Animated.delay(delay),
			Animated.parallel([
				Animated.sequence([
					Animated.timing(scale, {
						toValue: 1,
						duration: 300,
						useNativeDriver: true,
					}),
					Animated.timing(scale, {
						toValue: 0.6,
						duration: 300,
						useNativeDriver: true,
					}),
				]),
				Animated.sequence([
					Animated.timing(opacity, {
						toValue: 1,
						duration: 300,
						useNativeDriver: true,
					}),
					Animated.timing(opacity, {
						toValue: 0.4,
						duration: 300,
						useNativeDriver: true,
					}),
				]),
			]),
		]);
		Animated.loop(seq).start();
	}, [delay, opacity, scale]);

	return (
		<Animated.View style={[styles.dot, { transform: [{ scale }], opacity }]} />
	);
};

const TypingIndicator = () => (
	<View style={styles.typingContainer}>
		<View style={styles.typingBubble}>
			<View style={styles.typingDots}>
				<TypingDot delay={0} />
				<TypingDot delay={150} />
				<TypingDot delay={300} />
			</View>
		</View>
	</View>
);

export const ChatWindow: React.FC = () => {
	const { messages, isLoading, isBotThinking, error, sendMessage, retryMessage, bubbleMessages, sendBubbleMessage, sendFeedback } = useChat();
	const [inputText, setInputText] = React.useState('');
	const [isInputFocused, setIsInputFocused] = React.useState(false);
	const { isRecording, sttError, interimTranscript, startRecording, stopRecording } =
		useSpeechToText();

	// Individual bubble animations only

	const recordingAnimation = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		if (isRecording) {
			Animated.loop(
				Animated.sequence([
					Animated.timing(recordingAnimation, {
						toValue: 0.5,
						duration: 1000,
						useNativeDriver: true,
					}),
					Animated.timing(recordingAnimation, {
						toValue: 1,
						duration: 1000,
						useNativeDriver: true,
					}),
				])
			).start();
		} else {
			recordingAnimation.stopAnimation();
			recordingAnimation.setValue(1);
		}
	}, [isRecording, recordingAnimation]);

	// Combine chat error with STT error
	const displayError = error || sttError;
	const flatListRef = useRef<FlatList<Message>>(null);

	// With inverted list, new messages automatically appear at the bottom
	// No need for manual scrolling

	// No container animation - just show/hide based on bubbles existence

	const handleSend = () => {
		if (inputText.trim()) {
			sendMessage(inputText.trim());
			setInputText('');
		}
	};

	const handleToggleRecording = async () => {
		if (isRecording) {
			const transcribedText = await stopRecording();
			if (transcribedText) {
				setInputText(
					(prev) => (prev ? prev + ' ' : '') + transcribedText
				);
			}
		} else {
			setInputText(''); // Clear input before starting new recording
			startRecording();
		}
	};

	const availableTools = [
		{
			icon: "🌤️",
			title: "Weather",
			description: "Check weather",
			example: "What's the weather today?"
		},
		{
			icon: "🍳",
			title: "Recipes",
			description: "Find healthy recipes",
			example: "Find diabetic-friendly recipes"
		},
		{
			icon: "📍",
			title: "Places",
			description: "Find nearby locations",
			example: "Find pharmacies near me"
		},
		{
			icon: "🎯",
			title: "Goals",
			description: "Track health goals",
			example: "I completed my walk"
		},
		{
			icon: "💊",
			title: "Medication",
			description: "Track medications",
			example: "I took my medicine"
		},
		{
			icon: "🧮",
			title: "Calculator",
			description: "Calculate BMI, calories",
			example: "Calculate my BMI"
		}
	];

	const handleToolSuggestionPress = (example: string) => {
		setInputText(example);
	};

	const renderHelperBubbles = () => {
		// Show helper bubbles only when there's just the welcome message
		
		return (
			<View style={styles.helperBubblesContainer}>
				<Text style={styles.helperTitle}>Try asking me about:</Text>
				<View style={styles.helperBubblesWrapper}>
					{availableTools.map((tool, index) => (
						<TouchableOpacity
							key={index}
							style={styles.helperBubble}
							onPress={() => handleToolSuggestionPress(tool.example)}
							activeOpacity={0.7}
						>
							<Text style={styles.helperBubbleIcon}>{tool.icon}</Text>
							<View style={styles.helperBubbleContent}>
								<Text style={styles.helperBubbleTitle}>{tool.title}</Text>
								<Text style={styles.helperBubbleDescription}>{tool.description}</Text>
								<Text style={styles.helperBubbleExample}>"{tool.example}"</Text>
							</View>
						</TouchableOpacity>
					))}
				</View>
			</View>
		);
	};

	const renderMessage = ({ item }: { item: Message }) => <MessageItem item={item} onRetry={retryMessage} onFeedback={sendFeedback} />;

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
		>
			{/* Messages */}
			<FlatList
				ref={flatListRef}
				data={messages.slice().reverse()} // Reverse messages for inverted list
				renderItem={renderMessage}
				keyExtractor={(item) => item.id}
				style={styles.messagesList}
				contentContainerStyle={styles.messagesContent}
				showsVerticalScrollIndicator={false}
				inverted={true} // Start from bottom
				ListHeaderComponent={() => (
					<View>
						{isBotThinking ? <TypingIndicator /> : null}
						{/* Bubble Messages as part of scrollable content */}
						{bubbleMessages.length > 0 && !isBotThinking && (
							<View style={styles.bubbleMessagesContainer}>
								{/* Suggestions header */}
								<View style={styles.suggestionsHeader}>
									<Text style={styles.suggestionsText}>💡 Suggestions</Text>
								</View>
								{bubbleMessages.map((bubble, index) => (
									<View key={`${bubble}-${index}`} style={[
										styles.bubbleMessageRow,
										index === bubbleMessages.length - 1 && styles.lastBubbleRow
									]}>
										<TouchableOpacity
											style={styles.bubbleMessage}
											onPress={() => sendBubbleMessage(bubble)}
											activeOpacity={0.7}
										>
											<Text style={styles.bubbleMessageText}>{bubble}</Text>
										</TouchableOpacity>
									</View>
								))}
							</View>
						)}
					</View>
				)}
				ListFooterComponent={() => (
					<View style={styles.helperBubblesTopContainer}>
						{renderHelperBubbles()}
					</View>
				)}
			/>

			{/* Error display */}
			{displayError && (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{displayError}</Text>
				</View>
			)}

			{/* Input */}
			<View style={styles.inputContainer}>
				<View style={styles.textInputContainer}>
					<TextInput
						style={[
							styles.textInput,
							isInputFocused && styles.textInputFocused,
							isRecording && interimTranscript && styles.textInputRecording,
						]}
						value={isRecording && interimTranscript ? interimTranscript : inputText}
						onChangeText={setInputText}
						onFocus={() => setIsInputFocused(true)}
						onBlur={() => setIsInputFocused(false)}
						placeholder={
							isRecording ? 'Listening... Speak now' : 'Type your message here...'
						}
						placeholderTextColor={COLORS.textSecondary}
						selectionColor={COLORS.primary}
						cursorColor={COLORS.primary}
						multiline
						maxLength={500}
						editable={!isRecording}
						blurOnSubmit={false}
					/>
					<Animated.View style={[styles.micButtonInside, { opacity: recordingAnimation }]}>
						<TouchableOpacity
							style={[
								styles.micButton,
								isRecording && styles.micButtonRecording,
							]}
							onPress={handleToggleRecording}
						>
							<Ionicons
								name={isRecording ? 'stop' : 'mic'}
								style={[styles.micIcon, isRecording && styles.micIconRecording]}
							/>
						</TouchableOpacity>
					</Animated.View>
				</View>
				<TouchableOpacity
					style={[
						styles.sendButton,
						inputText.trim()
							? styles.sendButtonActive
							: styles.sendButtonInactive,
					]}
					onPress={handleSend}
					disabled={!inputText.trim() || isRecording || isBotThinking}
				>
					<Ionicons name="send" style={styles.sendIcon} />
				</TouchableOpacity>
			</View>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	
	messagesList: {
		flex: 1,
		paddingHorizontal: 4, // Balanced padding
	},
	messagesContent: {
		paddingVertical: 20,
		paddingHorizontal: 12, // Balanced padding
	},
	messageContainer: {
	},

	typingContainer: {
		paddingHorizontal: 16,
		paddingVertical: 6,
		alignItems: 'flex-start',
		marginRight: 40,
	},
	typingBubble: {
		backgroundColor: COLORS.surface,
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderRadius: 24,
		borderBottomLeftRadius: 8,
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 3,
	},
	typingDots: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: COLORS.primary,
		marginHorizontal: 3,
	},

	errorContainer: {
		backgroundColor: COLORS.error + '15',
		borderWidth: 1,
		borderColor: COLORS.error + '30',
		borderRadius: 12,
		marginHorizontal: 16,
		marginBottom: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	errorText: {
		color: COLORS.error,
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium,
		textAlign: 'center',
	},

	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.surface,
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 4,
	},
	textInputContainer: {
		flex: 1,
		position: 'relative',
		marginRight: 12,
	},
	textInput: {
		borderWidth: 2,
		borderColor: COLORS.border,
		borderRadius: 24,
		paddingHorizontal: 20,
		paddingVertical: 14,
		paddingRight: 50,
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.regular,
		maxHeight: 110,
		backgroundColor: COLORS.surface,
		color: COLORS.textPrimary,
		outlineWidth: 0,
	},
	micButtonInside: {
		position: 'absolute',
		right: 8,
		top: '50%',
		transform: [{ translateY: -20 }],
	},
	textInputFocused: {
		borderColor: COLORS.primary,
		borderWidth: 2,
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.2,
	},
	textInputRecording: {
		borderColor: COLORS.error,
		backgroundColor: COLORS.error + '10',
		shadowRadius: 6,
		elevation: 4,
	},

	micButton: {
		padding: 8,
		borderRadius: 20,
		backgroundColor: 'transparent',
	},
	micButtonRecording: {
		backgroundColor: COLORS.error + '20',
	},
	micIcon: {
		fontSize: 28,
		color: COLORS.primary,
		lineHeight: 28,
	},
	micIconRecording: {
		color: COLORS.error,
	},


	sendButton: {
		padding: 14,
		borderRadius: 24,
		width: 48,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 3,
	},
	sendButtonActive: { backgroundColor: COLORS.primary },
	sendButtonInactive: { backgroundColor: COLORS.primaryLight },
	sendIcon: {
		fontSize: 20,
		color: COLORS.textOnPrimary,
	},

	helperBubblesContainer: {
		paddingHorizontal: 16,
		paddingVertical: 20,
	},
	helperTitle: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.high,
		color: COLORS.textPrimary,
		marginBottom: 16,
		textAlign: 'center',
	},
	helperBubblesWrapper: {
		gap: 12,
	},
	helperBubble: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: COLORS.surface,
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 3,
	},
	helperBubbleIcon: {
		fontSize: 32,
		marginRight: 16,
		textAlign: 'center',
		minWidth: 40,
	},
	helperBubbleContent: {
		flex: 1,
	},
	helperBubbleTitle: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.high,
		color: COLORS.textPrimary,
		marginBottom: 4,
	},
	helperBubbleDescription: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.regular,
		color: COLORS.textSecondary,
		marginBottom: 6,
	},
	helperBubbleExample: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.primary,
		fontStyle: 'italic',
	},
	
	// Bubble Messages Styles - Scrollable Content
	bubbleMessagesContainer: {
		paddingLeft: 16,
		paddingRight: 8, // Match regular message right margin
		paddingVertical: 6,
		paddingBottom: 0, // No bottom space
	},
	suggestionsHeader: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginBottom: 8,
		marginRight: 0, // No right margin
	},
	suggestionsText: {
		fontSize: FONT_SIZES.caption,
		fontWeight: FONT_WEIGHTS.medium,
		color: COLORS.textSecondary,
	},
	bubbleMessageRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginBottom: 4,
		marginRight: 0, // No right margin
	},
	lastBubbleRow: {
		marginBottom: 0, // No bottom margin for last bubble
	},
	bubbleMessage: {
		backgroundColor: COLORS.surface,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 20,
		borderBottomRightRadius: 6,
		borderWidth: 2,
		borderColor: COLORS.primary,
		maxWidth: '80%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 1,
	},
	bubbleMessageText: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.regular,
		color: COLORS.textPrimary,
		textAlign: 'left',
	},
	messagesFooter: {
		paddingBottom: 0, // No extra space
	},
	helperBubblesTopContainer: {
		paddingTop: 40, // Add top padding to prevent cut-off
	},
});
