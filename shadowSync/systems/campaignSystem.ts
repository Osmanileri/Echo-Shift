/**
 * Campaign System Implementation
 * Requirements: 7.2, 7.3, 7.7
 * 
 * Manages level progression, star calculation, and reward distribution
 */

import { LevelConfig, getLevelById, LEVELS, getTotalLevels } from '../data/levels';
import { useGameStore } from '../store/gameStore';

/**
 * Result of completing a level
 */
export interface LevelCompletionResult {
  levelId: number;
  score: number;
  stars: number;
  echoShardsEarned: number;
  isNewHighScore: boolean;
  nextLevelUnlocked: boolean;
}

/**
 * Campaign progress summary
 */
export interface CampaignProgress {
  completed: number;
  total: number;
  totalStars: number;
  maxStars: number;
  percentComplete: number;
}

/**
 * Get the current level configuration
 * Requirements: 7.2
 * @returns Current level config or level 1 if not found
 */
export function getCurrentLevel(): LevelConfig {
  const currentLevelId = useGameStore.getState().currentLevel;
  return getLevelById(currentLevelId) || getLevelById(1)!;
}

/**
 * Get a specific level configuration
 * Requirements: 7.2
 * @param levelId - Level number (1-100)
 * @returns LevelConfig or undefined
 */
export function getLevel(levelId: number): LevelConfig | undefined {
  return getLevelById(levelId);
}

/**
 * Check if a level is unlocked
 * Requirements: 7.3
 * @param levelId - Level number to check
 * @returns true if level is unlocked
 */
export function isLevelUnlocked(levelId: number): boolean {
  if (levelId <= 0 || levelId > 100) {
    return false;
  }
  
  // Level 1 is always unlocked
  if (levelId === 1) {
    return true;
  }
  
  const state = useGameStore.getState();
  
  // Level is unlocked if:
  // 1. It's the current level (next to complete)
  // 2. Previous level has been completed
  return levelId <= state.currentLevel || state.completedLevels.includes(levelId - 1);
}

/**
 * Calculate stars earned based on score and level thresholds
 * @param score - Player's score
 * @param levelConfig - Level configuration with star thresholds
 * @returns Number of stars (0-3)
 */
export function calculateStars(score: number, levelConfig: LevelConfig): number {
  const [oneStar, twoStar, threeStar] = levelConfig.starThresholds;
  
  if (score >= threeStar) return 3;
  if (score >= twoStar) return 2;
  if (score >= oneStar) return 1;
  return 0;
}

/**
 * Calculate Echo Shards reward based on performance
 * Requirements: 7.7
 * @param levelConfig - Level configuration
 * @param stars - Stars earned (0-3)
 * @returns Total Echo Shards earned
 */
export function calculateReward(levelConfig: LevelConfig, stars: number): number {
  if (stars === 0) {
    return 0; // No reward for failing to reach target
  }
  
  const baseReward = levelConfig.rewards.echoShards;
  const starBonus = levelConfig.rewards.bonusPerStar * stars;
  
  return baseReward + starBonus;
}

/**
 * Complete a level and update game state
 * Requirements: 7.3, 7.7
 * @param levelId - Level that was completed
 * @param score - Final score achieved
 * @returns Completion result with rewards
 */
export function completeLevel(levelId: number, score: number): LevelCompletionResult {
  const levelConfig = getLevelById(levelId);
  
  if (!levelConfig) {
    throw new Error(`Invalid level ID: ${levelId}`);
  }
  
  const state = useGameStore.getState();
  const previousStars = state.levelStars[levelId] || 0;
  
  // Calculate stars and rewards
  const stars = calculateStars(score, levelConfig);
  const echoShardsEarned = calculateReward(levelConfig, stars);
  
  // Check if this is a new high score (more stars than before)
  const isNewHighScore = stars > previousStars;
  
  // Only award shards for improvement
  const actualShardsEarned = isNewHighScore 
    ? echoShardsEarned - calculateReward(levelConfig, previousStars)
    : 0;
  
  // Update game store if level was completed (at least 1 star)
  if (stars > 0) {
    // Update level completion in store
    state.completeLevel(levelId, stars);
    
    // Award Echo Shards for improvement
    if (actualShardsEarned > 0) {
      state.addEchoShards(actualShardsEarned);
    }
  }
  
  // Check if next level was unlocked
  const nextLevelUnlocked = stars > 0 && levelId < 100 && !state.completedLevels.includes(levelId);
  
  return {
    levelId,
    score,
    stars,
    echoShardsEarned: actualShardsEarned,
    isNewHighScore,
    nextLevelUnlocked,
  };
}

/**
 * Get campaign progress summary
 * @returns Progress statistics
 */
export function getProgress(): CampaignProgress {
  const state = useGameStore.getState();
  const total = getTotalLevels();
  const completed = state.completedLevels.length;
  
  // Calculate total stars earned
  const totalStars = Object.values(state.levelStars).reduce((sum, stars) => sum + stars, 0);
  const maxStars = total * 3;
  
  return {
    completed,
    total,
    totalStars,
    maxStars,
    percentComplete: Math.round((completed / total) * 100),
  };
}

/**
 * Get stars earned for a specific level
 * @param levelId - Level number
 * @returns Stars earned (0-3) or 0 if not completed
 */
export function getLevelStars(levelId: number): number {
  const state = useGameStore.getState();
  return state.levelStars[levelId] || 0;
}

/**
 * Check if a level has been completed
 * @param levelId - Level number
 * @returns true if level has been completed with at least 1 star
 */
export function isLevelCompleted(levelId: number): boolean {
  const state = useGameStore.getState();
  return state.completedLevels.includes(levelId);
}

/**
 * Get all levels with their unlock and completion status
 * @returns Array of levels with status
 */
export function getAllLevelsWithStatus(): Array<{
  config: LevelConfig;
  unlocked: boolean;
  completed: boolean;
  stars: number;
}> {
  return LEVELS.map(config => ({
    config,
    unlocked: isLevelUnlocked(config.id),
    completed: isLevelCompleted(config.id),
    stars: getLevelStars(config.id),
  }));
}

/**
 * Set the current level to play
 * @param levelId - Level number to set as current
 * @returns true if level was set successfully
 */
export function setCurrentLevel(levelId: number): boolean {
  if (!isLevelUnlocked(levelId)) {
    console.warn(`[CampaignSystem] Cannot set locked level: ${levelId}`);
    return false;
  }
  
  const levelConfig = getLevelById(levelId);
  if (!levelConfig) {
    console.warn(`[CampaignSystem] Invalid level ID: ${levelId}`);
    return false;
  }
  
  // Note: currentLevel in store represents the highest unlocked level
  // For selecting a level to play, we'd need additional state
  // This function validates the selection is valid
  return true;
}

/**
 * Get the next level to play (first incomplete level)
 * @returns Next level config or undefined if all complete
 */
export function getNextLevel(): LevelConfig | undefined {
  const state = useGameStore.getState();
  
  for (let i = 1; i <= 100; i++) {
    if (!state.completedLevels.includes(i)) {
      return getLevelById(i);
    }
  }
  
  return undefined; // All levels complete
}
