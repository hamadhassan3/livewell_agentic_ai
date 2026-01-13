import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

interface QuestionCardProps {
  text: string;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ text }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.questionText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.high,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});

export default QuestionCard;