// screens/ChatScreen.web.tsx
import React from 'react';
import {
	StyleSheet,
	View,
	TouchableOpacity,
	Text,
	Pressable,
} from 'react-native';
import { ChatWindow } from '@/components/ChatWindow';
import { useChat } from '@/hooks/useChat';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { WebContainer } from '@/components/layout';

interface ChatScreenProps {
	onBack?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onBack }) => {
	const { clearMessages } = useChat();

	const handleClearChat = () => {
		clearMessages();
	};

	return (
		<View style={styles.container}>
			{/* Optional header with actions */}
			{onBack && (
				<View style={styles.headerWrapper}>
					<WebContainer maxWidth={1000}>
						<View style={styles.headerActions}>
							<Pressable onPress={onBack} style={styles.backButton}>
								<Text style={styles.backButtonText}>← Back</Text>
							</Pressable>
						</View>
					</WebContainer>
				</View>
			)}

			<WebContainer maxWidth={1000} style={styles.chatContainer}>
				<View style={styles.chatWrapper}>
					<ChatWindow />
				</View>
			</WebContainer>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	headerWrapper: {
		backgroundColor: COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 2,
	},
	headerActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 16,
	},
	backButton: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: COLORS.surface,
		borderWidth: 1,
		borderColor: COLORS.border,
		cursor: 'pointer',
	},
	backButtonText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.high,
	},
	chatContainer: {
		flex: 1,
		paddingVertical: 0,
	},
	chatWrapper: {
		flex: 1,
		backgroundColor: COLORS.surface,
		borderRadius: 12,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 5,
		marginVertical: 16,
	},
});
