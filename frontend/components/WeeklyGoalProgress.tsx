import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Goal } from '../types';

interface WeeklyGoalProgressProps {
    goals: Goal[];
}

const WeeklyGoalProgress: React.FC<WeeklyGoalProgressProps> = ({ goals }) => {
    // Calculate actual progress based on completed goals
    const completedGoals = goals.filter(goal => goal.completed).length;
    const totalGoals = goals.length;
    const progressPercentage = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;
    
    // Determine encouraging message based on progress
    const getEncouragingMessage = () => {
        if (progressPercentage === 0) {
            return "Let's get started! You've got this! 💪";
        } else if (progressPercentage < 25) {
            return "Great start! Keep going! 🌟";
        } else if (progressPercentage < 50) {
            return "You're making progress! Well done! 👏";
        } else if (progressPercentage < 75) {
            return "Halfway there! Amazing work! 🎯";
        } else if (progressPercentage < 100) {
            return "Almost there! You're doing fantastic! 🚀";
        } else {
            return "Incredible! All goals completed! 🎉";
        }
    };

    // Determine progress bar color based on completion
    const getProgressColor = () => {
        if (progressPercentage < 50) return COLORS.error;
        if (progressPercentage < 75) return '#003366'; // Dark blue
        return '#004400'; // Dark green for 75%+
    };

    // Animated value for progress bar
    const animatedWidth = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: progressPercentage,
            duration: 1000,
            useNativeDriver: false,
        }).start();
    }, [progressPercentage, animatedWidth]);

    const progressIcon = progressPercentage === 100 ? 'trophy' : 
                         progressPercentage >= 75 ? 'star' :
                         progressPercentage >= 50 ? 'thumb-up' :
                         progressPercentage >= 25 ? 'trending-up' : 'flag-checkered';

    return (
        <View style={styles.card}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Weekly Goal Progress</Text>
                <MaterialCommunityIcons 
                    name={progressIcon} 
                    size={28} 
                    color={getProgressColor()} 
                />
            </View>

            {/* Progress Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{completedGoals}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.progressCircle}>
                    <Text style={[styles.percentageText, { color: getProgressColor() }]}>
                        {progressPercentage}%
                    </Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{totalGoals}</Text>
                    <Text style={styles.statLabel}>Total Goals</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <Animated.View 
                    style={[
                        styles.progressBar, 
                        { 
                            width: animatedWidth.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%']
                            }),
                            backgroundColor: getProgressColor()
                        }
                    ]} 
                >
                    {progressPercentage > 10 && (
                        <View style={styles.progressBarGlow} />
                    )}
                </Animated.View>
                
                {/* Milestone markers */}
                <View style={styles.milestoneContainer}>
                    {[25, 50, 75].map((milestone) => (
                        <View 
                            key={milestone}
                            style={[
                                styles.milestone,
                                { left: `${milestone}%` },
                                progressPercentage >= milestone && styles.milestoneReached
                            ]}
                        >
                            <View style={styles.milestoneMarker} />
                        </View>
                    ))}
                </View>
            </View>

            {/* Encouraging Message */}
            <Text style={styles.encouragingMessage}>{getEncouragingMessage()}</Text>

            {/* Goals Breakdown */}
            {totalGoals > 0 && (
                <View style={styles.breakdownContainer}>
                    <View style={styles.breakdownRow}>
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownText}>
                                {goals.filter(g => g.completed && g.category === 'activity').length} Physical Activity
                            </Text>
                        </View>
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownText}>
                                {goals.filter(g => g.completed && g.category === 'social').length} Social Connection
                            </Text>
                        </View>
                    </View>
                    <View style={styles.breakdownRow}>
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownText}>
                                {goals.filter(g => g.completed && g.category === 'nutrition').length} Nutrition
                            </Text>
                        </View>
                        <View style={styles.breakdownItem}>
                            <Text style={styles.breakdownText}>
                                {goals.filter(g => g.completed && g.category === 'mind').length} Mindfulness
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 22,
        marginBottom: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    header: {
        fontSize: FONT_SIZES.heading,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        fontFamily: 'sans-serif',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.textPrimary,
        fontFamily: 'sans-serif',
    },
    statLabel: {
        fontSize: FONT_SIZES.subheading,
        color: COLORS.textSecondary,
        fontFamily: 'sans-serif',
        marginTop: 4,
    },
    progressCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.border,
    },
    percentageText: {
        fontSize: 28,
        fontWeight: FONT_WEIGHTS.bold,
        fontFamily: 'sans-serif',
    },
    progressBarContainer: {
        height: 35,
        backgroundColor: COLORS.border,
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
    },
    progressBar: {
        height: '100%',
        borderRadius: 18,
        position: 'relative',
    },
    progressBarGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 5,
    },
    milestoneContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    milestone: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    milestoneMarker: {
        width: 2,
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    milestoneReached: {
        opacity: 0.7,
    },
    encouragingMessage: {
        fontSize: FONT_SIZES.body,
        marginTop: 16,
        textAlign: 'center',
        color: COLORS.textPrimary,
        fontFamily: 'sans-serif',
        fontWeight: FONT_WEIGHTS.medium,
        fontStyle: 'italic',
    },
    breakdownContainer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 6,
    },
    breakdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    breakdownDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    breakdownText: {
        fontSize: FONT_SIZES.body,
        color: COLORS.textPrimary,
        fontFamily: 'sans-serif',
        fontWeight: FONT_WEIGHTS.medium,
    },
});

export default WeeklyGoalProgress;