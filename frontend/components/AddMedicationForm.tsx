import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme'; // Import the new theme
import { Frequency, NewMedication, ReminderTimeId } from '../types';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const REMINDER_TIMES: { id: ReminderTimeId; label: string; icon: string }[] = [
    { id: 'morning', label: 'Morning', icon: 'coffee' },
    { id: 'noon', label: 'Noon', icon: 'utensils' },
    { id: 'evening', label: 'Evening', icon: 'moon' },
    { id: 'bedtime', label: 'Bedtime', icon: 'bed' },
];

const FREQUENCY_TYPES: { id: Frequency; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'fortnightly', label: 'Fortnightly' },
    { id: 'monthly', label: 'Monthly' },
];

interface AddMedicationFormProps {
    formData: NewMedication;
    onFieldChange: <K extends keyof NewMedication>(field: K, value: NewMedication[K]) => void;
    onSubmit: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

export const AddMedicationForm: React.FC<AddMedicationFormProps> = ({
    formData,
    onFieldChange,
    onSubmit,
    onCancel,
    isSaving,
}) => {
    const { isMobile } = useMediaQuery();

    const handleToggleTime = (timeId: ReminderTimeId) => {
        const newTimes = formData.reminderTimes.includes(timeId)
            ? formData.reminderTimes.filter((t) => t !== timeId)
            : [...formData.reminderTimes, timeId];
        onFieldChange('reminderTimes', newTimes);
    };

    const handleFrequencyTypeSelect = (type: Frequency) => {
        onFieldChange('frequencyType', type);
        if (type !== 'daily') {
            onFieldChange('reminderTimes', []);
        }
    };

    return (
        <View style={[styles.container, isMobile && styles.containerMobile]}>
            <View style={[styles.fieldContainer, isMobile && styles.fieldContainerMobile]}>
                <Text style={[styles.label, isMobile && styles.labelMobile]}>Medication Name</Text>
                <TextInput
                    style={[styles.input, isMobile && styles.inputMobile]}
                    placeholder="e.g., Lisinopril"
                    placeholderTextColor={COLORS.textSecondary}
                    value={formData.name}
                    onChangeText={(text) => onFieldChange('name', text)}
                />
            </View>

            <View style={[styles.fieldContainer, isMobile && styles.fieldContainerMobile]}>
                <Text style={[styles.label, isMobile && styles.labelMobile]}>Dosage</Text>
                <TextInput
                    style={[styles.input, isMobile && styles.inputMobile]}
                    placeholder="e.g., 1 pill"
                    placeholderTextColor={COLORS.textSecondary}
                    value={formData.dosage}
                    onChangeText={(text) => onFieldChange('dosage', text)}
                />
            </View>

            <View style={[styles.fieldContainer, isMobile && styles.fieldContainerMobile]}>
                <Text style={[styles.label, isMobile && styles.labelMobile]}>How Often?</Text>
                <View style={[styles.frequencyContainer, isMobile && styles.frequencyContainerMobile]}>
                    {FREQUENCY_TYPES.map((freq) => {
                        const isSelected = formData.frequencyType === freq.id;
                        return (
                            <TouchableOpacity
                                key={freq.id}
                                style={[
                                    styles.frequencyButton,
                                    isSelected && styles.frequencyButtonSelected,
                                    isMobile && styles.frequencyButtonMobile
                                ]}
                                onPress={() => handleFrequencyTypeSelect(freq.id)}
                            >
                                <Text style={[
                                    styles.frequencyButtonText,
                                    isSelected && styles.frequencyButtonTextSelected,
                                    isMobile && styles.frequencyButtonTextMobile
                                ]}>
                                    {freq.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {formData.frequencyType === 'daily' && (
                <View style={[styles.fieldContainer, isMobile && styles.fieldContainerMobile]}>
                    <Text style={[styles.label, isMobile && styles.labelMobile]}>What Time of Day?</Text>
                    <Text style={[styles.subLabel, isMobile && styles.subLabelMobile]}>Select one or more. This covers taking it 1, 2, or 3+ times a day.</Text>
                    <View style={styles.timesContainer}>
                        {REMINDER_TIMES.map((time) => {
                            const isSelected = formData.reminderTimes.includes(time.id);
                            return (
                                <TouchableOpacity
                                    key={time.id}
                                    style={[
                                        styles.timeButton,
                                        isSelected && styles.timeButtonSelected,
                                        isMobile && styles.timeButtonMobile
                                    ]}
                                    onPress={() => handleToggleTime(time.id)}
                                >
                                    <FontAwesome5 name={time.icon} size={isMobile ? 20 : 24} color={isSelected ? COLORS.primary : COLORS.textPrimary} />
                                    <Text style={[
                                        styles.timeButtonText,
                                        isSelected && styles.timeButtonTextSelected,
                                        isMobile && styles.timeButtonTextMobile
                                    ]}>{time.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            <View style={[styles.fieldContainer, isMobile && styles.fieldContainerMobile]}>
                <Text style={[styles.label, isMobile && styles.labelMobile]}>Notes</Text>
                <TextInput
                    style={[styles.input, isMobile && styles.inputMobile]}
                    placeholder={
                        formData.frequencyType === 'weekly'
                            ? 'e.g., Every Monday morning'
                            : formData.frequencyType === 'fortnightly'
                            ? 'e.g., On the 1st and 15th of the month'
                            : 'e.g., Take with food'
                    }
                    placeholderTextColor={COLORS.textSecondary}
                    value={formData.notes}
                    onChangeText={(text) => onFieldChange('notes', text)}
                />
            </View>

            <TouchableOpacity
                style={[
                    styles.button,
                    styles.saveButton,
                    isSaving && styles.disabledButton,
                    isMobile && styles.buttonMobile
                ]}
                onPress={onSubmit}
                disabled={isSaving}
            >
                {isSaving ? (
                    <ActivityIndicator color={COLORS.textOnPrimary} />
                ) : (
                    <Text style={[styles.saveButtonText, isMobile && styles.saveButtonTextMobile]}>Save Medication</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, styles.cancelButton, isMobile && styles.buttonMobile]}
                onPress={onCancel}
                disabled={isSaving}
            >
                <Text style={[styles.cancelButtonText, isMobile && styles.cancelButtonTextMobile]}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    containerMobile: {
        padding: 12,
    },
    fieldContainer: {
        marginBottom: 25,
    },
    fieldContainerMobile: {
        marginBottom: 18,
    },
    label: {
        fontSize: FONT_SIZES.body,
        color: COLORS.textPrimary,
        marginBottom: 10,
        fontWeight: FONT_WEIGHTS.bold,
    },
    labelMobile: {
        fontSize: FONT_SIZES.subheading,
        marginBottom: 8,
    },
    subLabel: {
        fontSize: FONT_SIZES.subheading,
        color: COLORS.textSecondary,
        marginBottom: 15,
        marginTop: -5,
    },
    subLabelMobile: {
        fontSize: 12,
        marginBottom: 12,
    },
    input: {
        backgroundColor: COLORS.surface,
        fontSize: FONT_SIZES.body,
        padding: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        color: COLORS.textPrimary,
    },
    inputMobile: {
        padding: 12,
        fontSize: FONT_SIZES.subheading,
        borderRadius: 8,
    },
    button: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 15,
    },
    buttonMobile: {
        paddingVertical: 14,
        borderRadius: 25,
        marginTop: 10,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
    },
    saveButtonText: {
        color: COLORS.textOnPrimary,
        fontSize: FONT_SIZES.button,
        fontWeight: FONT_WEIGHTS.bold,
    },
    saveButtonTextMobile: {
        fontSize: FONT_SIZES.body,
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    cancelButtonText: {
        color: COLORS.primary,
        fontSize: FONT_SIZES.button,
        fontWeight: FONT_WEIGHTS.bold,
    },
    cancelButtonTextMobile: {
        fontSize: FONT_SIZES.body,
    },
    disabledButton: {
        backgroundColor: COLORS.primaryLight,
    },
    frequencyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    frequencyContainerMobile: {
        gap: 6,
    },
    frequencyButton: {
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.border,
        flex: 1,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    frequencyButtonMobile: {
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderRadius: 8,
        marginHorizontal: 0,
    },
    frequencyButtonSelected: {
        borderColor: COLORS.primary,
        backgroundColor: '#E9F1EA',
    },
    frequencyButtonText: {
        fontSize: FONT_SIZES.body,
        fontWeight: FONT_WEIGHTS.medium,
        color: COLORS.textPrimary,
    },
    frequencyButtonTextMobile: {
        fontSize: FONT_SIZES.subheading,
    },
    frequencyButtonTextSelected: {
        color: COLORS.primary,
        fontWeight: FONT_WEIGHTS.bold,
    },
    timesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    timeButton: {
        backgroundColor: COLORS.surface,
        width: '48%',
        minHeight: 100,
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    timeButtonMobile: {
        minHeight: 85,
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
    },
    timeButtonSelected: {
        borderColor: COLORS.primary,
        backgroundColor: '#E9F1EA',
    },
    timeButtonText: {
        marginTop: 10,
        fontSize: FONT_SIZES.body,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
    },
    timeButtonTextMobile: {
        marginTop: 8,
        fontSize: FONT_SIZES.subheading,
    },
    timeButtonTextSelected: {
        color: COLORS.primary,
    },
});

export default AddMedicationForm;