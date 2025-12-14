/**
 * Campaign System Implementation
 * Requirements: 4.1, 4.2, 4.3, 4.4, 7.2, 7.3, 7.7, 9.1, 9.2, 9.3
 * 
 * Manages level progression, star calculation, and reward distribution
 */

import { LEVELS, LevelConfig, getLevelById, getTotalLevels } from '../data/levels';
import { useGameStore } from '../store/gameStore';

/**
 * Result of a level attempt (input for star rating calculation)
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export interface LevelResult {
  completed: boolean;
  distanceTraveled: number;
  shardsCollected: number;
  totalShardsAvailable: number;
  damageTaken: number;
  healthRemaining: number;
}

/**
 * Star rating result with individual criteria flags
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export interface StarRating {
  stars: number;                // 0-3
  survivor: boolean;            // 1 star criteria met (health > 0)
  collector: boolean;           // 2 star criteria met (>= 80% shards)
  perfectionist: boolean;       // 3 star criteria met (no damage)
}

/**
 * Level statistics tracking for reward calculation
 * Requirements: 9.1, 9.2, 9.3
 */
export interface LevelStats {
  bestDistance: number;
  bestShardsCollected: number;
  bestStars: number;
  timesPlayed: number;
  firstClearBonus: boolean;     // Whether first-clear bonus has been awarded
}

/**
 * Reward calculation result
 * Requirements: 9.1, 9.2, 9.3
 */
export interface RewardResult {
  baseReward: number;           // Base reward from formula
  firstClearBonus: number;      // First-clear bonus (0 if already cleared)
  totalReward: number;          // Total reward to award
  isFirstClear: boolean;        // Whether this is the first clear
}

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
 * Calculate star rating based on level result
 * Requirements: 4.1, 4.2, 4.3, 4.4
 * 
 * Star criteria (highest applicable rating is awarded):
 * - 1 star (Survivor): Complete with health > 0
 * - 2 stars (Collector): Collect >= 80% of available shards
 * - 3 stars (Perfectionist): No damage taken
 * 
 * @param result - Level result containing completion stats
 * @returns StarRating with stars count and individual criteria flags
 */
export function calculateStarRating(result: LevelResult): StarRating {
  // Check each criterion independently
  // Requirements 4.1: 1 star for completing with health > 0
  const survivor = result.completed && result.healthRemaining > 0;
  
  // Requirements 4.2: 2 stars for collecting >= 80% shards
  const collectorThreshold = 0.8;
  const shardPercentage = result.totalShardsAvailable > 0 
    ? result.shardsCollected / result.totalShardsAvailable 
    : 0;
  const collector = survivor && shardPercentage >= collectorThreshold;
  
  // Requirements 4.3: 3 stars for no damage taken
  const perfectionist = survivor && result.damageTaken === 0;
  
  // Requirements 4.4: Award highest applicable rating
  let stars = 0;
  if (perfectionist) {
    stars = 3;
  } else if (collector) {
    stars = 2;
  } else if (survivor) {
    stars = 1;
  }
  
  return {
    stars,
    survivor,
    collector,
    perfectionist,
  };
}

/**
 * Calculate first-clear bonus for a level
 * Requirements: 9.1
 * 
 * Formula: 50 + (level * 10) Echo Shards
 * 
 * @param level - Level number (1-100)
 * @returns First-clear bonus amount in Echo Shards
 */
export function calculateFirstClearBonus(level: number): number {
  if (level < 1) return 0;
  return 50 + (level * 10);
}

/**
 * Calculate base reward for completing a level
 * Requirements: 9.3
 * 
 * Formula: 10 + (level * 3) + (stars * 5) Echo Shards
 * 
 * @param level - Level number (1-100)
 * @param stars - Stars earned (0-3)
 * @returns Base reward amount in Echo Shards
 */
export function calculateBaseReward(level: number, stars: number): number {
  if (level < 1 || stars < 0) return 0;
  return 10 + (level * 3) + (stars * 5);
}

/**
 * Calculate replay reward (difference between new and previous reward)
 * Requirements: 9.2
 * 
 * When replaying a level, only award the difference if achieving higher stars.
 * 
 * @param level - Level number (1-100)
 * @param newStars - Stars earned in this attempt (0-3)
 * @param previousStars - Best stars from previous attempts (0-3)
 * @returns Reward difference (0 if no improvement)
 */
export function calculateReplayReward(level: number, newStars: number, previousStars: number): number {
  if (level < 1 || newStars <= previousStars) return 0;
  
  const newReward = calculateBaseReward(level, newStars);
  const previousReward = calculateBaseReward(level, previousStars);
  
  return newReward - previousReward;
}

/**
 * Calculate total reward for completing a level
 * Requirements: 9.1, 9.2, 9.3
 * 
 * Combines first-clear bonus (if applicable) with base/replay reward.
 * 
 * @param level - Level number (1-100)
 * @param stars - Stars earned (0-3)
 * @param isFirstClear - Whether this is the first time completing the level
 * @param previousStars - Best stars from previous attempts (0 if first clear)
 * @returns RewardResult with breakdown of rewards
 */
export function calculateLevelReward(
  level: number,
  stars: number,
  isFirstClear: boolean,
  previousStars: number = 0
): RewardResult {
  // No reward for 0 stars (failed level)
  if (stars === 0) {
    return {
      baseReward: 0,
      firstClearBonus: 0,
      totalReward: 0,
      isFirstClear: false,
    };
  }

  const baseReward = calculateBaseReward(level, stars);
  
  if (isFirstClear) {
    // First clear: full base reward + first-clear bonus
    const firstClearBonus = calculateFirstClearBonus(level);
    return {
      baseReward,
      firstClearBonus,
      totalReward: baseReward + firstClearBonus,
      isFirstClear: true,
    };
  } else {
    // Replay: only award difference if improved
    const replayReward = calculateReplayReward(level, stars, previousStars);
    return {
      baseReward: replayReward, // Only the difference
      firstClearBonus: 0,
      totalReward: replayReward,
      isFirstClear: false,
    };
  }
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
