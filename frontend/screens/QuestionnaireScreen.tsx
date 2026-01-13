import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	SafeAreaView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Button from '../components/Button';
import OptionSelector from '../components/OptionSelector';
import ProgressBar from '../components/ProgressBar';
import QuestionCard from '../components/QuestionCard';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useQuestionnaire } from '../hooks';
import { useAuthStore } from '../hooks/useAuthStore';

const QuestionnaireScreen = () => {
	const [showIntro, setShowIntro] = useState(true);

	const router = useRouter();
	const { user } = useAuthStore();

	const {
		state,
		isLoading,
		error,
		selectedOption,
		isSubmitting,
		handleSelectOption,
		handleNextQuestion,
	} = useQuestionnaire();

	const handleGoToDashboard = () => {
		router.navigate('/(tabs)');
	};

	const handleSkipQuestionnaire = () => {
		router.navigate('/(tabs)');
	};

	if (showIntro) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={styles.content}>
					<Text style={styles.greetingText}>
						Hello, {user?.name || 'there'}!
					</Text>
					<Text style={styles.infoText}>
						To complete your profile, we would like to ask you a few questions
						about your well-being.
					</Text>
				</View>
				<View style={styles.footer}>
					<Button title='Proceed' onPress={() => setShowIntro(false)} />
					{/* <View style={styles.skipButtonContainer}>
            <Button 
              title="Skip for now" 
              onPress={handleSkipQuestionnaire}
              variant="secondary"
            />
          </View> */}
				</View>
			</SafeAreaView>
		);
	}

	if (isLoading && !state) {
		return (
			<SafeAreaView style={styles.centered}>
				<ActivityIndicator size='large' color={COLORS.primary} />
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView style={styles.container}>
				<View style={[styles.content, styles.centered]}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
				<View style={styles.footer}>
					<Button title='Retry' onPress={() => setShowIntro(true)} />
				</View>
			</SafeAreaView>
		);
	}

	if (state?.is_completed) {
		return (
			<SafeAreaView style={styles.completionContainer}>
				<View style={styles.completionContent}>
					<Text style={styles.completionText}>Thank you!</Text>
					<Text style={styles.completionSubText}>
						You have completed the questionnaire.
					</Text>
				</View>
				<View style={styles.footer}>
					<Button title='Go to Dashboard' onPress={handleGoToDashboard} />
				</View>
			</SafeAreaView>
		);
	}

	if (!state) {
		return null;
	}

	const { question, current_order, total_questions } = state;

	return (
		<SafeAreaView style={styles.container}>
			<ProgressBar current={current_order} total={total_questions} />
			<View style={styles.content}>
				<QuestionCard text={question.text} />
				<OptionSelector
					options={question.options}
					onSelect={handleSelectOption}
					selectedValue={selectedOption?.value}
				/>
			</View>
			<View style={styles.footer}>
				<Button
					title={current_order === total_questions ? 'Finish' : 'Next'}
					onPress={handleNextQuestion}
					disabled={!selectedOption}
					loading={isSubmitting}
				/>
			</View>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: COLORS.background,
		padding: 20,
	},
	content: {
		flex: 1,
		justifyContent: 'center',
	},
	footer: {
		padding: 20,
	},
	errorText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.error,
	},
	completionContainer: {
		flex: 1,
		backgroundColor: COLORS.background,
		justifyContent: 'space-between',
		padding: 20,
	},
	completionContent: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	completionText: {
		fontSize: FONT_SIZES.completionHeading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
		textAlign: 'center',
	},
	completionSubText: {
		fontSize: FONT_SIZES.completionSubheading,
		color: COLORS.textPrimary,
		marginTop: 10,
		textAlign: 'center',
	},
	greetingText: {
		fontSize: FONT_SIZES.completionHeading,
		fontWeight: FONT_WEIGHTS.bold,
		color: COLORS.primary,
		textAlign: 'center',
	},
	infoText: {
		fontSize: FONT_SIZES.body,
		color: COLORS.textPrimary,
		textAlign: 'center',
		marginTop: 20,
		lineHeight: 28,
		padding: wp(5),
	},
	skipButtonContainer: {
		marginTop: 10,
	},
});

export default QuestionnaireScreen;
