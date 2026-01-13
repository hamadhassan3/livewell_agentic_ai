import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

interface ProgressBarProps {
  current: number;
  total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const progress = (current / total) * 100;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{`Question ${current} of ${total}`}</Text>
      <View style={styles.barContainer}>
        <View style={[styles.bar, { width: `${progress}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  text: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  barContainer: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },
  bar: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
});

export default ProgressBar;