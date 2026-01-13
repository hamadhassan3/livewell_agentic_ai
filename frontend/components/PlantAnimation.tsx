import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { COLORS } from '@/constants/theme';
import { ForestConfiguration } from '@/api/forestService';

interface PlantAnimationProps {
  points: number;
  size?: number;
  configuration?: ForestConfiguration;
}

const PlantAnimation: React.FC<PlantAnimationProps> = ({ points, size = 70, configuration }) => {
  const [lottieError, setLottieError] = useState(false); // Try Lottie first

  // Determine plant stage based on points
  const getPlantStage = (points: number) => {
    const pointsPerStage = configuration?.points_per_stage || 50;
    const pointsPerTree = configuration?.points_per_tree || 200;
    
    const cyclePoints = points % pointsPerTree;
    if (cyclePoints < pointsPerStage) return 'seed';
    if (cyclePoints < pointsPerStage * 2) return 'sprout';
    if (cyclePoints < pointsPerStage * 3) return 'sapling';
    return 'tree';
  };

  const stage = getPlantStage(points);

  // Fallback to icons if Lottie fails
  const getIconName = () => {
    switch (stage) {
      case 'seed':
        return 'seed';
      case 'sprout':
        return 'sprout';
      case 'sapling':
        return 'tree-outline';
      case 'tree':
        return 'tree';
      default:
        return 'seed';
    }
  };

  const getIconColor = () => {
    switch (stage) {
      case 'seed':
        return '#8B4513'; // Brown
      case 'sprout':
        return '#90EE90'; // Light green
      case 'sapling':
        return '#32CD32'; // Lime green
      case 'tree':
        return '#228B22'; // Forest green
      default:
        return COLORS.primary;
    }
  };

  // Try Lottie first, fallback to icons
  if (!lottieError) {
    try {
      const LottieView = require('lottie-react-native').default;
      
      const getAnimationSource = () => {
        switch (stage) {
          case 'seed':
            return require('@/assets/animations/plant-seed.json');
          case 'sprout':
            return require('@/assets/animations/plant-sprout.json');
          case 'sapling':
            return require('@/assets/animations/plant-sapling.json');
          case 'tree':
            return require('@/assets/animations/plant-tree.json');
          default:
            return require('@/assets/animations/plant-seed.json');
        }
      };

      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <LottieView
            source={getAnimationSource()}
            autoPlay
            loop
            style={{ width: size, height: size }}
            onAnimationFailure={() => setLottieError(true)}
          />
        </View>
      );
    } catch (error) {
      console.log('Lottie failed, using icon fallback');
      setLottieError(true);
    }
  }

  // Fallback to icons
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <MaterialCommunityIcons 
        name={getIconName() as any} 
        size={size * 0.8} 
        color={getIconColor()} 
      />
      <Text style={styles.stageText}>{stage}</Text>
      <Text style={{ fontSize: 8, color: COLORS.textSecondary, marginTop: 2 }}>
        {points}pts
      </Text>
    </View>
  )
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageText: {
    fontSize: 8,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default PlantAnimation;