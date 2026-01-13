// screens/ChatScreen.tsx
import React from 'react';
import {
	SafeAreaView,
	StyleSheet,
	View,
	TouchableOpacity,
	Text,
} from 'react-native';
import { ChatWindow } from '@/components/ChatWindow';
import { useChat } from '@/hooks/useChat';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';

interface ChatScreenProps {
	onBack?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onBack }) => {
	const { clearMessages } = useChat();

	const handleClearChat = () => {
		clearMessages();
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Optional header with actions */}
			{onBack && (
				<View style={styles.headerActions}>
					<TouchableOpacity onPress={onBack} style={styles.backButton}>
						<Text style={styles.backButtonText}>← Back</Text>
					</TouchableOpacity>
					{/* <TouchableOpacity
						onPress={handleClearChat}
						style={styles.clearButton}
					>
						<Text style={styles.clearButtonText}>Clear</Text>
					</TouchableOpacity> */}
				</View>
			)}

			<ChatWindow />
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	headerActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 16,
		backgroundColor: COLORS.surface,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 2,
	},
	backButton: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: COLORS.surface,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	backButtonText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.primary,
		fontWeight: FONT_WEIGHTS.high,
	},
	clearButton: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		backgroundColor: COLORS.error + '15',
		borderWidth: 1,
		borderColor: COLORS.error + '30',
	},
	clearButtonText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.error,
		fontWeight: FONT_WEIGHTS.high,
	},
});
