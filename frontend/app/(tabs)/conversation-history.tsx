import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	RefreshControl,
	Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Markdown from 'react-native-markdown-display';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { conversationHistoryService, Conversation } from '@/api/conversationHistoryService';

export default function ConversationHistoryScreen() {
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [expandedConversation, setExpandedConversation] = useState<string | null>(null);

	useEffect(() => {
		loadConversationHistory();
	}, []);

	const loadConversationHistory = async () => {
		try {
			setLoading(true);
			const data = await conversationHistoryService.getConversationHistory();
			// Sort conversations by updated_at in descending order (newest first)
			const sortedData = data.sort((a, b) => 
				new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
			);
			setConversations(sortedData);
		} catch (error: any) {
			console.error('Failed to load conversation history:', error);
			Alert.alert('Error', 'Failed to load conversation history. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await loadConversationHistory();
		setRefreshing(false);
	};

	const toggleConversation = (sessionId: string) => {
		setExpandedConversation(expandedConversation === sessionId ? null : sessionId);
	};

	const getSessionTypeIcon = (sessionType: string) => {
		switch (sessionType) {
			case 'chat':
				return 'message-text';
			case 'nudge':
				return 'lightbulb';
			case 'question':
				return 'help-circle';
			default:
				return 'message';
		}
	};

	const getSessionTypeColor = (sessionType: string) => {
		switch (sessionType) {
			case 'chat':
				return COLORS.primary;
			case 'nudge':
				return COLORS.warning;
			case 'question':
				return COLORS.info;
			default:
				return COLORS.textSecondary;
		}
	};

	const formatTimestamp = (timestamp: string) => {
		const date = new Date(timestamp);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	const truncateText = (text: string, maxLength: number = 100) => {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	};

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
				<Text style={styles.loadingText}>Loading conversation history...</Text>
			</View>
		);
	}

	if (conversations.length === 0) {
		return (
			<ScrollView
				style={styles.container}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			>
				<View style={styles.emptyContainer}>
					<MaterialCommunityIcons
						name="message-text-outline"
						size={64}
						color={COLORS.textSecondary}
					/>
					<Text style={styles.emptyTitle}>No Conversations Yet</Text>
					<Text style={styles.emptySubtitle}>
						Start chatting with the AI assistant to see your conversation history here.
					</Text>
				</View>
			</ScrollView>
		);
	}

	return (
		<ScrollView
			style={styles.container}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
		>
			<View style={styles.header}>
				<Text style={styles.title}>Conversation History</Text>
				<Text style={styles.subtitle}>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</Text>
			</View>

			{conversations.map((conversation) => (
				<View key={conversation.session_id} style={styles.conversationCard}>
					<TouchableOpacity
						style={styles.conversationHeader}
						onPress={() => toggleConversation(conversation.session_id)}
					>
						<View style={styles.conversationHeaderLeft}>
							<MaterialCommunityIcons
								name={getSessionTypeIcon(conversation.session_type)}
								size={24}
								color={getSessionTypeColor(conversation.session_type)}
							/>
							<View style={styles.conversationInfo}>
								<Text style={styles.sessionType}>
									{conversation.session_type.charAt(0).toUpperCase() + conversation.session_type.slice(1)} Session
								</Text>
								<Text style={styles.conversationDate}>
									{formatTimestamp(conversation.updated_at)}
								</Text>
								<Text style={styles.messageCount}>
									{conversation.message_count} message{conversation.message_count !== 1 ? 's' : ''}
								</Text>
								{conversation.summary && (
									<Text style={styles.conversationSummary}>
										{truncateText(conversation.summary.replace(/[*#_`]/g, ''), 120)}
									</Text>
								)}
							</View>
						</View>
						<MaterialCommunityIcons
							name={expandedConversation === conversation.session_id ? 'chevron-up' : 'chevron-down'}
							size={24}
							color={COLORS.textSecondary}
						/>
					</TouchableOpacity>

					{expandedConversation === conversation.session_id && (
						<View style={styles.messagesContainer}>
							{conversation.summary ? (
								<View style={styles.summaryContainer}>
									<Text style={styles.summaryTitle}>Conversation Summary</Text>
									<Markdown style={markdownStyles}>{conversation.summary}</Markdown>
								</View>
							) : (
								<>
									{conversation.messages.sort((a, b) => 
										new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
									).map((message, index) => (
										<View key={message.id || index} style={styles.messageContainer}>
											<View style={styles.messageHeader}>
												<MaterialCommunityIcons
													name={
														message.role === 'user'
															? 'account'
															: message.role === 'assistant'
															? 'robot'
															: 'cog'
													}
													size={16}
													color={
														message.role === 'user'
															? COLORS.primary
															: message.role === 'assistant'
															? COLORS.success
															: COLORS.warning
													}
												/>
												<Text style={styles.messageRole}>
													{message.role.charAt(0).toUpperCase() + message.role.slice(1)}
												</Text>
												<Text style={styles.messageTimestamp}>
													{formatTimestamp(message.timestamp)}
												</Text>
											</View>
											<Text style={styles.messageContent}>
												{message.content}
											</Text>
										</View>
									))}
								</>
							)}
						</View>
					)}
				</View>
			))}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
		padding: 16,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: COLORS.background,
	},
	loadingText: {
		marginTop: 16,
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 64,
	},
	emptyTitle: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginTop: 16,
	},
	emptySubtitle: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		textAlign: 'center',
		marginTop: 8,
		paddingHorizontal: 32,
	},
	header: {
		marginBottom: 24,
	},
	title: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
	},
	subtitle: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
	conversationCard: {
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	conversationHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
	},
	conversationHeaderLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	conversationInfo: {
		marginLeft: 12,
		flex: 1,
	},
	sessionType: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.semibold,
		color: COLORS.textPrimary,
	},
	conversationDate: {
		fontSize: FONT_SIZES.small,
		color: COLORS.textSecondary,
		marginTop: 2,
	},
	messageCount: {
		fontSize: FONT_SIZES.small,
		color: COLORS.textSecondary,
		marginTop: 2,
	},
	conversationSummary: {
		fontSize: FONT_SIZES.small,
		color: COLORS.textPrimary,
		marginTop: 6,
		fontStyle: 'italic',
		lineHeight: 18,
	},
	messagesContainer: {
		borderTopWidth: 1,
		borderTopColor: COLORS.border,
		padding: 16,
	},
	summaryContainer: {
		backgroundColor: COLORS.background,
		borderRadius: 8,
		padding: 16,
	},
	summaryTitle: {
		fontSize: FONT_SIZES.body,
		fontWeight: FONT_WEIGHTS.semibold,
		color: COLORS.primary,
		marginBottom: 8,
	},
	summaryText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
		lineHeight: 22,
	},
	messageContainer: {
		marginBottom: 12,
		padding: 12,
		backgroundColor: COLORS.background,
		borderRadius: 8,
	},
	messageHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	messageRole: {
		fontSize: FONT_SIZES.small,
		fontWeight: FONT_WEIGHTS.semibold,
		color: COLORS.textPrimary,
		marginLeft: 6,
	},
	messageTimestamp: {
		fontSize: FONT_SIZES.small,
		color: COLORS.textSecondary,
		marginLeft: 'auto',
	},
	messageContent: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
		lineHeight: 20,
	},
});

const markdownStyles = {
	body: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
		lineHeight: 22,
	},
	heading1: {
		fontSize: FONT_SIZES.heading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginBottom: 8,
	},
	heading2: {
		fontSize: FONT_SIZES.subheading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
		marginBottom: 6,
	},
	paragraph: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
		lineHeight: 22,
		marginBottom: 8,
	},
	strong: {
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.textPrimary,
	},
	em: {
		fontStyle: 'italic',
		color: COLORS.textPrimary,
	},
	list_item: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
		marginBottom: 4,
	},
	bullet_list: {
		marginBottom: 8,
	},
	ordered_list: {
		marginBottom: 8,
	},
	code_inline: {
		backgroundColor: COLORS.surface,
		color: COLORS.primary,
		paddingHorizontal: 4,
		paddingVertical: 2,
		borderRadius: 4,
		fontSize: FONT_SIZES.small,
		fontFamily: 'monospace',
	},
	fence: {
		backgroundColor: COLORS.surface,
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
	},
	code_block: {
		backgroundColor: COLORS.surface,
		color: COLORS.textPrimary,
		fontSize: FONT_SIZES.small,
		fontFamily: 'monospace',
		lineHeight: 18,
	},
};