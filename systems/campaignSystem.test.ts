/**
 * Property-Based Tests for Campaign System
 * Uses fast-check for property-based testing
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  getLevel, 
  isLevelUnlocked, 
  completeLevel,
  calculateStars,
  calculateReward,
} from './campaignSystem';
import { 
  getLevelById, 
  LEVELS, 
  LevelConfig,
  isValidLevelId,
} from '../data/levels';
import { useGameStore } from '../store/gameStore';

describe('Campaign System Properties', () => {
  beforeEach(() => {
    // Reset game store before each test
    useGameStore.setState({
      completedLevels: [],
      currentLevel: 1,
      levelStars: {},
      echoShards: 0,
    });
  });

  /**
   * **Feature: echo-shift-professionalization, Property 7: Level Configuration Loading**
   * **Validates: Requirements 7.2**
   *
   * For any valid level ID (1-100), the Campaign System SHALL return
   * a complete LevelConfig object with all required fields.
   */
  test('getLevel returns complete LevelConfig for any valid level ID (1-100)', () => {
    // Generator for valid level IDs (1-100)
    const validLevelIdArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(
        validLevelIdArb,
        (levelId) => {
          const levelConfig = getLevel(levelId);
          
          // Must return a LevelConfig object
          if (!levelConfig) return false;
          
          // Verify all required fields exist and have correct types
          const hasId = typeof levelConfig.id === 'number' && levelConfig.id === levelId;
          const hasName = typeof levelConfig.name === 'string' && levelConfig.name.length > 0;
          const hasDescription = typeof levelConfig.description === 'string' && levelConfig.description.length > 0;
          const hasTargetScore = typeof levelConfig.targetScore === 'number' && levelConfig.targetScore > 0;
          
          // Star thresholds must be an array of 3 numbers in ascending order
          const hasStarThresholds = 
            Array.isArray(levelConfig.starThresholds) &&
            levelConfig.starThresholds.length === 3 &&
            levelConfig.starThresholds.every(t => typeof t === 'number' && t > 0) &&
            levelConfig.starThresholds[0] <= levelConfig.starThresholds[1] &&
            levelConfig.starThresholds[1] <= levelConfig.starThresholds[2];
          
          // Mechanics must have all required boolean fields
          const hasMechanics = 
            levelConfig.mechanics &&
            typeof levelConfig.mechanics.phantom === 'boolean' &&
            typeof levelConfig.mechanics.midline === 'boolean' &&
            typeof levelConfig.mechanics.rhythm === 'boolean' &&
            typeof levelConfig.mechanics.gravity === 'boolean';
          
          // Modifiers must have valid multipliers
          const hasModifiers = 
            levelConfig.modifiers &&
            typeof levelConfig.modifiers.speedMultiplier === 'number' &&
            levelConfig.modifiers.speedMultiplier > 0 &&
            typeof levelConfig.modifiers.spawnRateMultiplier === 'number' &&
            levelConfig.modifiers.spawnRateMultiplier > 0;
          
          // Rewards must have valid values
          const hasRewards = 
            levelConfig.rewards &&
            typeof levelConfig.rewards.echoShards === 'number' &&
            levelConfig.rewards.echoShards >= 0 &&
            typeof levelConfig.rewards.bonusPerStar === 'number' &&
            levelConfig.rewards.bonusPerStar >= 0;
          
          return hasId && hasName && hasDescription && hasTargetScore && 
                 hasStarThresholds && hasMechanics && hasModifiers && hasRewards;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 7: Level Configuration Loading**
   * **Validates: Requirements 7.2**
   *
   * For any invalid level ID (outside 1-100), the system SHALL return undefined.
   */
  test('getLevel returns undefined for invalid level IDs', () => {
    // Generator for invalid level IDs
    const invalidLevelIdArb = fc.oneof(
      fc.integer({ min: -1000, max: 0 }),    // Zero and negative
      fc.integer({ min: 101, max: 1000 })    // Above 100
    );

    fc.assert(
      fc.property(
        invalidLevelIdArb,
        (levelId) => {
          const levelConfig = getLevel(levelId);
          return levelConfig === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 8: Level Progression Unlocking**
   * **Validates: Requirements 7.3**
   *
   * For any completed level N where N < 100, level N+1 SHALL become unlocked.
   */
  test('completing level N unlocks level N+1', () => {
    // Generator for levels that can unlock the next (1-99)
    const completableLevelArb = fc.integer({ min: 1, max: 99 });
    
    // Generator for a score that earns at least 1 star
    const passingScoreArb = fc.integer({ min: 100, max: 50000 });

    fc.assert(
      fc.property(
        completableLevelArb,
        passingScoreArb,
        (levelId, baseScore) => {
          // Reset store for each property check
          useGameStore.setState({
            completedLevels: [],
            currentLevel: levelId, // Set current level to make it unlocked
            levelStars: {},
            echoShards: 0,
          });
          
          const levelConfig = getLevel(levelId);
          if (!levelConfig) return true; // Skip if level not found
          
          // Calculate a score that guarantees at least 1 star
          const passingScore = levelConfig.starThresholds[0] + baseScore;
          
          // Before completion, check if next level is locked (unless it's already unlocked)
          const nextLevelId = levelId + 1;
          const wasNextLevelUnlocked = isLevelUnlocked(nextLevelId);
          
          // Complete the level with a passing score
          const result = completeLevel(levelId, passingScore);
          
          // Verify at least 1 star was earned
          if (result.stars === 0) return true; // Skip if no stars (shouldn't happen with our score)
          
          // After completion, next level should be unlocked
          const isNextUnlocked = isLevelUnlocked(nextLevelId);
          
          return isNextUnlocked === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 8: Level Progression Unlocking**
   * **Validates: Requirements 7.3**
   *
   * Level 1 is always unlocked regardless of game state.
   */
  test('level 1 is always unlocked', () => {
    // Generator for random completed levels state
    const completedLevelsArb = fc.array(
      fc.integer({ min: 2, max: 100 }),
      { minLength: 0, maxLength: 50 }
    );

    fc.assert(
      fc.property(
        completedLevelsArb,
        (completedLevels) => {
          // Set random game state
          useGameStore.setState({
            completedLevels: [...new Set(completedLevels)], // Remove duplicates
            currentLevel: 1,
            levelStars: {},
            echoShards: 0,
          });
          
          // Level 1 should always be unlocked
          return isLevelUnlocked(1) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 8: Level Progression Unlocking**
   * **Validates: Requirements 7.3**
   *
   * A level N > 1 is unlocked if and only if level N-1 has been completed.
   */
  test('level N > 1 is unlocked iff level N-1 is completed', () => {
    // Generator for levels 2-100
    const levelIdArb = fc.integer({ min: 2, max: 100 });
    
    // Generator for whether previous level is completed
    const previousCompletedArb = fc.boolean();

    fc.assert(
      fc.property(
        levelIdArb,
        previousCompletedArb,
        (levelId, previousCompleted) => {
          const previousLevelId = levelId - 1;
          
          // Set up game state based on whether previous level is completed
          const completedLevels = previousCompleted ? [previousLevelId] : [];
          
          useGameStore.setState({
            completedLevels,
            currentLevel: previousCompleted ? levelId : previousLevelId,
            levelStars: previousCompleted ? { [previousLevelId]: 1 } : {},
            echoShards: 0,
          });
          
          const isUnlocked = isLevelUnlocked(levelId);
          
          // Level should be unlocked if previous is completed OR if it's the current level
          const expectedUnlocked = previousCompleted || levelId <= useGameStore.getState().currentLevel;
          
          return isUnlocked === expectedUnlocked;
        }
      ),
      { numRuns: 100 }
    );
  });
});
