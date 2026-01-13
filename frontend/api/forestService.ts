
import apiClient from './apiClient';

export interface ForestConfiguration {
  id: number;
  points_per_achievement: number;
  points_per_stage: number;
  stages_per_tree: number;
  points_per_tree: number;
  category_mappings: {
    [key: string]: {
      display_name: string;
      quality: string;
      color: string;
      icon: string;
      emoji: string;
    };
  };
  stage_definitions: {
    [key: string]: {
      name: string;
      label: string;
      icon: string;
    };
  };
  is_active: boolean;
}

export interface ForestConfig {
  pointsPerTree: number;
}

export interface ForestData {
  userPoints: number;
  dailyGoals: {
    mindfulness: boolean;
    socialConnection: boolean;
    nutrition: boolean;
    medications: boolean;
    activity: boolean;
  };
  overallAchievements: {
    mindfulness: number;
    socialConnection: number;
    nutrition: number;
    medications: number;
    points: number;
    activity: number;
  };
  treeProgress: {
    pointsPerTree: number;
    currentCycle: number;
    completedTrees: number;
  };
  configuration: ForestConfiguration;
}

export interface CompletedTree {
  id: number;
  tree_number: number;
  completed_date: string;
  mindfulness_count: number;
  social_count: number;
  nutrition_count: number;
  medications_count: number;
  activity_count: number;
  total_points: number;
  total_goals: number;
}

/**
 * Fetches comprehensive forest data from the backend
 */
export const getForestData = async (): Promise<ForestData> => {
  try {
    const response = await apiClient.get('profiles/forest/data/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch forest data:', error);
    throw new Error('Could not fetch forest data.');
  }
};

/**
 * Fetches user's completed trees history
 */
export const getUserTrees = async (): Promise<CompletedTree[]> => {
  try {
    const response = await apiClient.get('profiles/forest/trees/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user trees:', error);
    throw new Error('Could not fetch tree history.');
  }
};

/**
 * Fetches current forest configuration
 */
export const getForestConfiguration = async (): Promise<ForestConfiguration> => {
  try {
    const response = await apiClient.get('profiles/forest/config/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch forest configuration:', error);
    throw new Error('Could not fetch forest configuration.');
  }
};

/**
 * Get tree animation based on current cycle points
 */
export const getTreeAnimation = (currentCycle: number, pointsPerTree: number) => {
  const percentage = (currentCycle / pointsPerTree) * 100;

  if (percentage < 20) {
    return require('@/assets/animations/plant-seed.json');
  } else if (percentage < 40) {
    return require('@/assets/animations/plant-sprout.json');
  } else if (percentage < 60) {
    return require('@/assets/animations/plant-sapling.json');
  } else {
    return require('@/assets/animations/tree-healthy.json');
  }
};

/**
 * Get tree stage name based on current cycle points
 */
export const getTreeStageName = (currentCycle: number, pointsPerTree: number): string => {
  const percentage = (currentCycle / pointsPerTree) * 100;

  if (percentage < 20) return 'Seed';
  if (percentage < 40) return 'Sprout';
  if (percentage < 60) return 'Sapling';
  if (percentage < 80) return 'Young Tree';
  return 'Mature Tree';
};

/**
 * Get small tree animation based on completed tree count
 */
export const getSmallTreeAnimation = (completedTrees: number) => {
  if (completedTrees >= 10) {
    return require('@/assets/animations/tree-healthy.json');
  } else if (completedTrees >= 5) {
    return require('@/assets/animations/plant-sapling.json');
  } else {
    return require('@/assets/animations/plant-seed.json');
  }
};