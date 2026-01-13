import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { ActivityDataPoint } from '@/types';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface ActivityHistoryProps {
    activityData: ActivityDataPoint[];
}

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ activityData }) => {
    const { isMobile } = useMediaQuery();
    const [containerWidth, setContainerWidth] = useState(300);

    // Prepare data for the chart
    const chartData = {
        labels: activityData.map(item => item.day),
        datasets: [{
            data: activityData.map(item => item.steps),
            strokeWidth: 3
        }]
    };

    // Elder-friendly chart configuration
    const chartConfig = {
        backgroundColor: COLORS.surface,
        backgroundGradientFrom: COLORS.surface,
        backgroundGradientTo: COLORS.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(136, 171, 142, ${opacity})`, // Using primary color
        labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`, // Using textPrimary
        style: {
            borderRadius: 18
        },
        propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: COLORS.primary
        },
        propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: COLORS.border,
            strokeWidth: 1
        }
    };

    // Calculate statistics
    const totalSteps = activityData.reduce((sum, day) => sum + day.steps, 0);
    const avgSteps = Math.round(totalSteps / activityData.length);
    const maxSteps = Math.max(...activityData.map(d => d.steps));
    const minSteps = Math.min(...activityData.map(d => d.steps));

    return (
        <View
            style={[styles.card, isMobile && styles.cardMobile]}
            onLayout={(event) => {
                const { width } = event.nativeEvent.layout;
                // Account for card padding (22 on desktop, 16 on mobile)
                const padding = isMobile ? 32 : 44;
                setContainerWidth(width - padding);
            }}
        >
            <Text style={[styles.header, isMobile && styles.headerMobile]}>This Week&apos;s Activity Trend</Text>

            <View style={styles.chartContainer}>
                <LineChart
                    data={chartData}
                    width={containerWidth}
                    height={isMobile ? 200 : 220}
                    yAxisSuffix=""
                    yAxisInterval={1}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    withInnerLines={true}
                    withOuterLines={false}
                    withVerticalLines={false}
                    withHorizontalLines={true}
                    formatYLabel={(value) => {
                        const numValue = parseFloat(value);
                        if (numValue >= 1000) {
                            return `${(numValue / 1000).toFixed(1)}k`;
                        }
                        return value;
                    }}
                    segments={4}
                />
            </View>

            <View style={[styles.statsContainer, isMobile && styles.statsContainerMobile]}>
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Daily Average</Text>
                    <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{(avgSteps / 1000).toFixed(1)}k</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Best Day</Text>
                    <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{(maxSteps / 1000).toFixed(1)}k</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, isMobile && styles.statLabelMobile]}>Total Steps</Text>
                    <Text style={[styles.statValue, isMobile && styles.statValueMobile]}>{(totalSteps / 1000).toFixed(1)}k</Text>
                </View>
            </View>

            {/* Elderly-friendly legend */}
            <View style={[styles.legendContainer, isMobile && styles.legendContainerMobile]}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                    <Text style={[styles.legendText, isMobile && styles.legendTextMobile]}>Steps taken this week</Text>
                </View>
            </View>
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
    cardMobile: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    header: {
        fontSize: FONT_SIZES.heading,
        fontWeight: FONT_WEIGHTS.bold,
        marginBottom: 18,
        color: COLORS.textPrimary,
        fontFamily: 'sans-serif',
    },
    headerMobile: {
        fontSize: FONT_SIZES.body,
        marginBottom: 12,
    },
    chartContainer: {
        overflow: 'hidden',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 18,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statsContainerMobile: {
        marginTop: 16,
        paddingTop: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: FONT_SIZES.subheading,
        color: COLORS.textSecondary,
        marginBottom: 4,
        fontFamily: 'sans-serif',
    },
    statLabelMobile: {
        fontSize: 11,
        marginBottom: 2,
    },
    statValue: {
        fontSize: FONT_SIZES.heading - 2,
        fontWeight: FONT_WEIGHTS.bold,
        color: COLORS.primary,
        fontFamily: 'sans-serif',
    },
    statValueMobile: {
        fontSize: FONT_SIZES.body,
    },
    statDivider: {
        width: 1,
        backgroundColor: COLORS.border,
    },
    legendContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    legendContainerMobile: {
        marginTop: 12,
        paddingTop: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    legendText: {
        fontSize: FONT_SIZES.body,
        color: COLORS.textSecondary,
        fontFamily: 'sans-serif',
    },
    legendTextMobile: {
        fontSize: FONT_SIZES.subheading,
    },
});

export default ActivityHistory;