/**
 * Level System (Sync Rate) for Echo Shift Progression
 * Handles XP calculations, level progression, and daily rewards
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.2, 5.3, 5.4
 */

import type { LevelInfo } from '../types';

// Maximum level cap
export const MAX_LEVEL = 100;

/**
 * Calculate required XP for a given level
 * Formula: RequiredXP = 100 × (Level ^ 1.5)
 * 
 * Requirements 4.2: WHEN calculating required XP for a level 
 * THEN the Level_System SHALL use the formula: RequiredXP = 100 × (Level ^ 1.5)
 * 
 * @param level - The level to calculate XP for (must be >= 1)
 * @returns The XP required to reach this level
 */
export function calculateRequiredXP(level: number): number {
  if (level < 1) {
    return 0;
  }
  return Math.floor(100 * Math.pow(level, 1.5));
}

/**
 * Calculate cumulative XP needed to reach a level from level 1
 * This is the sum of all XP thresholds from level 1 to level-1
 * 
 * @param level - Target level
 * @returns Total XP needed to reach this level
 */
export function calculateCumulativeXP(level: number): number {
  if (level <= 1) {
    return 0;
  }
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += calculateRequiredXP(i);
  }
  return total;
}

/**
 * Calculate level from total XP using binary search
 * 
 * Requirements 4.1: WHEN the player earns XP THEN the Level_System 
 * SHALL add the XP to the player's total and check for level advancement
 * 
 * Requirements 4.3: WHEN the player's total XP exceeds the threshold for the next level 
 * THEN the Level_System SHALL increment the Sync Rate
 * 
 * @param totalXP - The player's total accumulated XP
 * @returns The current level based on total XP
 */
export function calculateLevelFromXP(totalXP: number): number {
  if (totalXP < 0) {
    return 1;
  }
  
  // Binary search for the correct level
  let low = 1;
  let high = MAX_LEVEL;
  
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const cumulativeXP = calculateCumulativeXP(mid);
    
    if (cumulativeXP <= totalXP) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  
  return low;
}

/**
 * Get full level information for display
 * 
 * Requirements 4.4: WHEN displaying player profile THEN the Level_System 
 * SHALL show current Sync Rate, current XP, and XP needed for next level
 * 
 * @param totalXP - The player's total accumulated XP
 * @returns LevelInfo object with all level data
 */
export function getLevelInfo(totalXP: number): LevelInfo {
  const clampedXP = Math.max(0, totalXP);
  const level = calculateLevelFromXP(clampedXP);
  
  const xpForCurrentLevel = calculateCumulativeXP(level);
  const xpForNextLevel = level >= MAX_LEVEL 
    ? xpForCurrentLevel 
    : calculateCumulativeXP(level + 1);
  
  const xpInCurrentLevel = clampedXP - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  
  const progress = xpNeededForNextLevel > 0 
    ? xpInCurrentLevel / xpNeededForNextLevel 
    : 1;
  
  return {
    level,
    currentXP: clampedXP,
    xpForCurrentLevel,
    xpForNextLevel,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

/**
 * Check if a level up occurred between old and new XP values
 * 
 * @param oldXP - Previous total XP
 * @param newXP - New total XP
 * @returns Object with levelUp flag and new level if applicable
 */
export function checkLevelUp(oldXP: number, newXP: number): { levelUp: boolean; newLevel: number } {
  const oldLevel = calculateLevelFromXP(oldXP);
  const newLevel = calculateLevelFromXP(newXP);
  
  return {
    levelUp: newLevel > oldLevel,
    newLevel,
  };
}

/**
 * Calculate daily login reward based on player level
 * Tiered formula:
 * - Level 1-9: 100 + 10*level
 * - Level 10-49: 200 + 8*(level-10)
 * - Level 50+: 600 + 5*(level-50)
 * 
 * Requirements 5.2: Level 1-9: 100 base Shards plus 10 Shards per level
 * Requirements 5.3: Level 10-49: 200 base Shards plus 8 Shards per level above 10
 * Requirements 5.4: Level 50+: 600 base Shards plus 5 Shards per level above 50
 * 
 * @param level - The player's current level (Sync Rate)
 * @returns The number of shards to award
 */
export function calculateDailyReward(level: number): number {
  const clampedLevel = Math.max(1, Math.min(level, MAX_LEVEL));
  
  if (clampedLevel < 10) {
    // Level 1-9: 100 + 10*level
    return 100 + 10 * clampedLevel;
  } else if (clampedLevel < 50) {
    // Level 10-49: 200 + 8*(level-10)
    return 200 + 8 * (clampedLevel - 10);
  } else {
    // Level 50+: 600 + 5*(level-50)
    return 600 + 5 * (clampedLevel - 50);
  }
}
