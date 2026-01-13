import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from "../constants/theme";
import { Frequency, GoalCategory } from "../types";

interface GoalSettingFormProps {
    currentStep: number;
    // Step 1 props
    selectedFrequency: Frequency | null;
    onSelectFrequency: (frequency: Frequency) => void;
    // Step 2 props
    selectedCategory: GoalCategory | null;
    onSelectCategory: (category: GoalCategory) => void;
    // Step 3 props
    goalTitle: string;
    onTitleChange: (text: string) => void;
    // Navigation and state
    onNext: () => void;
    onBack: () => void;
    onSubmit: () => void;
    isSaving: boolean;
}

const FREQUENCIES = [
  { id: "daily", name: "Daily", icon: "calendar-day" },
  { id: "weekly", name: "Weekly", icon: "calendar-week" },
  { id: "fortnightly", name: "Fortnightly", icon: "calendar-alt" },
  { id: "monthly", name: "Monthly", icon: "calendar" },
] as const;

const USER_CATEGORIES = [
  { id: "activity", name: "Physical Activity", icon: "walking" },
  { id: "social", name: "Social Connection", icon: "user-friends" },
  { id: "nutrition", name: "Diet & Nutrition", icon: "apple-alt" },
  { id: "mind", name: "Mindfulness", icon: "brain" },
] as const;

// --- Main Stepper Component ---
const GoalSettingForm: React.FC<GoalSettingFormProps> = (props) => {
    const { currentStep, onNext, onBack, onSubmit, isSaving } = props;

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return <Step1Frequency {...props} />;
            case 2: return <Step2Category {...props} />;
            case 3: return <Step3Title {...props} />;
            default: return null;
        }
    };

    return (
        <View style={styles.container}>
            {renderStepContent()}
            <View style={styles.buttonContainer}>
                {currentStep > 1 && (
                    <TouchableOpacity style={[styles.button, styles.backButton]} onPress={onBack}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                )}
                {currentStep < 3 && (
                    <TouchableOpacity style={[styles.button, styles.nextButton]} onPress={onNext}>
                        <Text style={styles.nextButtonText}>Next</Text>
                    </TouchableOpacity>
                )}
                {currentStep === 3 && (
                    <TouchableOpacity
                        style={[styles.button, styles.nextButton, isSaving && styles.disabledButton]}
                        onPress={onSubmit}
                        disabled={isSaving}
                    >
                        {isSaving ? <ActivityIndicator color={COLORS.textOnPrimary} /> : <Text style={styles.nextButtonText}>Set Goal</Text>}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};


// --- Step Sub-components ---
const Step1Frequency: React.FC<GoalSettingFormProps> = ({ selectedFrequency, onSelectFrequency }) => (
    <>
        <Text style={styles.stepHeader}>How often?</Text>
        <View style={styles.cardContainer}>
            {FREQUENCIES.map((freq) => (
                <TouchableOpacity key={freq.id} style={[styles.card, selectedFrequency === freq.id && styles.cardSelected]} onPress={() => onSelectFrequency(freq.id)}>
                    <FontAwesome5 name={freq.icon} size={30} color={selectedFrequency === freq.id ? COLORS.primary : COLORS.textPrimary} />
                    <Text style={[styles.cardText, selectedFrequency === freq.id && styles.cardTextSelected]}>{freq.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </>
);

const Step2Category: React.FC<GoalSettingFormProps> = ({ selectedCategory, onSelectCategory }) => (
    <>
        <Text style={styles.stepHeader}>What area to focus on?</Text>
        <View style={styles.cardContainer}>
            {USER_CATEGORIES.map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.card, selectedCategory === cat.id && styles.cardSelected]} onPress={() => onSelectCategory(cat.id)}>
                    <FontAwesome5 name={cat.icon} size={30} color={selectedCategory === cat.id ? COLORS.primary : COLORS.textPrimary} />
                    <Text style={[styles.cardText, selectedCategory === cat.id && styles.cardTextSelected]}>{cat.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
    </>
);

const Step3Title: React.FC<GoalSettingFormProps> = ({ goalTitle, onTitleChange, selectedFrequency, selectedCategory }) => {
    const frequency = FREQUENCIES.find((f) => f.id === selectedFrequency);
    const category = USER_CATEGORIES.find((c) => c.id === selectedCategory);

    return (
        <>
            <Text style={styles.stepHeader}>Describe your goal</Text>
            <View style={styles.summaryContainer}>
                {frequency && (
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Frequency:</Text>
                        <View style={styles.summaryValue}>
                            <FontAwesome5 name={frequency.icon} size={20} color={COLORS.textPrimary} />
                            <Text style={styles.summaryText}>{frequency.name}</Text>
                        </View>
                    </View>
                )}
                {category && (
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Category:</Text>
                        <View style={styles.summaryValue}>
                            <FontAwesome5 name={category.icon} size={20} color={COLORS.textPrimary} />
                            <Text style={styles.summaryText}>{category.name}</Text>
                        </View>
                    </View>
                )}
            </View>
            <TextInput
                style={styles.input}
                placeholder={`e.g., "Walk around the block"`}
                placeholderTextColor={COLORS.textSecondary}
                value={goalTitle}
                onChangeText={onTitleChange}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        flex: 1,
    },
    stepHeader: {
        fontSize: FONT_SIZES.heading,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: 30,
        textAlign: 'center',
    },
    cardContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        backgroundColor: COLORS.surface,
        width: '48%',
        minHeight: 140,
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    cardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: '#E9F1EA',
    },
    cardText: {
        marginTop: 15,
        fontSize: FONT_SIZES.subheading,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    cardTextSelected: {
        color: COLORS.primary,
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
    summaryContainer: {
        marginBottom: 25,
        padding: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    summaryTitle: {
        fontSize: FONT_SIZES.body,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        marginBottom: 15,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    summaryLabel: {
        fontSize: FONT_SIZES.body,
        color: COLORS.textSecondary,
        fontWeight: FONT_WEIGHTS.medium,
    },
    summaryValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryText: {
        marginLeft: 10,
        fontSize: FONT_SIZES.body,
        color: COLORS.textPrimary,
        fontWeight: FONT_WEIGHTS.bold,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    button: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        backgroundColor: COLORS.surface,
        borderWidth: 2,
        borderColor: COLORS.border,
        marginRight: 10,
    },
    backButtonText: {
        color: COLORS.textPrimary,
        fontSize: FONT_SIZES.button,
        fontWeight: FONT_WEIGHTS.bold,
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        marginLeft: 10,
    },
    nextButtonText: {
        color: COLORS.textOnPrimary,
        fontSize: FONT_SIZES.button,
        fontWeight: FONT_WEIGHTS.bold,
    },
    disabledButton: {
        backgroundColor: COLORS.primaryLight,
    },
});

export default GoalSettingForm;
