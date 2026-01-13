import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PlantAnimation from './PlantAnimation';
import { COLORS, FONT_SIZES, FONT_WEIGHTS } from '@/constants/theme';
import { ForestConfiguration } from '@/api/forestService';

interface GrowingPlantProgressProps {
  points: number;
  completedTrees?: number;
  configuration?: ForestConfiguration;
}

const GrowingPlantProgress: React.FC<GrowingPlantProgressProps> = ({ 
  points, 
  completedTrees = 0, 
  configuration 
}) => {
  const plantStage = useMemo(() => {
    // Use configuration values or fallback to defaults
    const POINTS_PER_STAGE = configuration?.points_per_stage || 50;
    const POINTS_PER_CYCLE = configuration?.points_per_tree || 200;
    
    const cyclePoints = points % POINTS_PER_CYCLE;
    // Use actual completed trees count from backend
    const cycleNumber = completedTrees;
    
    let stage: 'seed' | 'sprout' | 'sapling' | 'tree';
    let stageProgress: number;
    let nextStagePoints: number;
    
    // Determine stage based on cycle points
    if (cyclePoints < POINTS_PER_STAGE) {
      stage = 'seed';
      stageProgress = (cyclePoints / POINTS_PER_STAGE) * 100;
      nextStagePoints = POINTS_PER_STAGE - cyclePoints;
    } else if (cyclePoints < POINTS_PER_STAGE * 2) {
      stage = 'sprout';
      stageProgress = ((cyclePoints - POINTS_PER_STAGE) / POINTS_PER_STAGE) * 100;
      nextStagePoints = (POINTS_PER_STAGE * 2) - cyclePoints;
    } else if (cyclePoints < POINTS_PER_STAGE * 3) {
      stage = 'sapling';
      stageProgress = ((cyclePoints - POINTS_PER_STAGE * 2) / POINTS_PER_STAGE) * 100;
      nextStagePoints = (POINTS_PER_STAGE * 3) - cyclePoints;
    } else {
      // Tree stage (150+ points in current cycle)
      stage = 'tree';
      const treeStagePoints = cyclePoints - (POINTS_PER_STAGE * 3);
      stageProgress = (treeStagePoints / POINTS_PER_STAGE) * 100;
      
      // If we're at or past the completion point, show 100%
      if (cyclePoints >= POINTS_PER_CYCLE || stageProgress >= 100) {
        stageProgress = 100;
        nextStagePoints = 0;
      } else {
        nextStagePoints = POINTS_PER_CYCLE - cyclePoints;
      }
    }
    
    return {
      stage,
      stageProgress,
      nextStagePoints,
      cycleNumber,
      isFullyGrown: stage === 'tree' && stageProgress >= 100
    };
  }, [points, completedTrees, configuration]);


  const getStageLabel = () => {
    // Special handling for completed tree case
    if (plantStage.stage === 'tree' && plantStage.stageProgress >= 100) {
      // When tree is complete, show the tree that just finished
      const completedTreeNumber = plantStage.cycleNumber + 1;
      return `Tree #${completedTreeNumber} Complete! 🌳`;
    }
    
    // Always show which tree number we're growing
    const currentTreeNumber = plantStage.cycleNumber + 1;
    
    // Use configuration stage definitions if available
    const stageDefinitions = configuration?.stage_definitions;
    
    if (stageDefinitions && stageDefinitions[plantStage.stage]) {
      const stageDef = stageDefinitions[plantStage.stage];
      return `Tree #${currentTreeNumber}: ${stageDef.label}`;
    }
    
    // Fallback to hardcoded labels
    switch (plantStage.stage) {
      case 'seed':
        return `Tree #${currentTreeNumber}: Planting...`;
      case 'sprout':
        return `Tree #${currentTreeNumber}: Growing Sprout...`;
      case 'sapling':
        return `Tree #${currentTreeNumber}: Nurturing Sapling...`;
      case 'tree':
        return `Tree #${currentTreeNumber}: Flourishing...`;
      default:
        return 'Growing';
    }
  };

  const getEncouragementMessage = () => {
    const messages = {
      seed: [
        "Great start! Your wellness journey begins with a single seed.",
        "Every journey starts small. Keep going!",
        "Your seed is planted. Water it with consistent healthy habits!"
      ],
      sprout: [
        "Amazing! Your efforts are sprouting into results!",
        "Look at that growth! Keep nurturing your wellness.",
        "Your healthy habits are taking root!"
      ],
      sapling: [
        "Fantastic progress! Your wellness tree is getting stronger!",
        "You're building strong foundations for lasting health!",
        "Your dedication is showing beautiful results!"
      ],
      tree: [
        "Incredible! You've grown a mighty wellness tree!",
        "Your commitment to health has blossomed beautifully!",
        "You're an inspiration! Keep flourishing!"
      ]
    };
    
    const stageMessages = messages[plantStage.stage];
    const messageIndex = Math.floor(plantStage.stageProgress / 34) % stageMessages.length;
    return stageMessages[messageIndex];
  };

  return (
    <View style={styles.card}>
      
      <View style={styles.animationContainer}>
        <PlantAnimation points={points} size={200} configuration={configuration} />
      </View>
      
      <View style={styles.progressSection}>
        <Text style={styles.stageLabel}>{getStageLabel()}</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${plantStage.stageProgress}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(plantStage.stageProgress)}% to next stage
        </Text>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.encouragement}>{getEncouragementMessage()}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{points}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {plantStage.nextStagePoints === 0 && plantStage.isFullyGrown ? 'Complete!' : plantStage.nextStagePoints}
            </Text>
            <Text style={styles.statLabel}>
              {plantStage.nextStagePoints === 0 && plantStage.isFullyGrown ? 'Tree Done!' : 'To Next Stage'}
            </Text>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.textPrimary,
  },
  cycleIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cycleText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  animationContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    position: 'relative',
  },
  newSeedIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 20,
    alignItems: 'center',
  },
  newSeedText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  progressSection: {
    marginVertical: 16,
  },
  stageLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: FONT_WEIGHTS.medium as any,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoSection: {
    marginTop: 16,
  },
  encouragement: {
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    fontWeight: FONT_WEIGHTS.medium as any,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold as any,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default GrowingPlantProgress;