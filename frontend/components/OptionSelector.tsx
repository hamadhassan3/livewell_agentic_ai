import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { Option } from '../types';

interface OptionSelectorProps {
  options: Option[];
  onSelect: (option: Option) => void;
  selectedValue?: number | string;
}

const OptionSelector: React.FC<OptionSelectorProps> = ({ options, onSelect, selectedValue }) => {
  return (
    <View style={styles.container}>
      {options.map(option => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.optionButton,
            selectedValue === option.value && styles.selectedOption,
          ]}
          onPress={() => onSelect(option)}>
          <Text
            style={[
              styles.optionText,
              selectedValue === option.value && styles.selectedText,
            ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    marginHorizontal: 20,
  },
  optionButton: {
    backgroundColor: COLORS.surface,
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  selectedOption: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  selectedText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHTS.bold,
  },
});

export default OptionSelector;