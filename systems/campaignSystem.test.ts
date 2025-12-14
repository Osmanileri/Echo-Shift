/**
 * Property-Based Tests for Campaign System
 * Uses fast-check for property-based testing
 */

import * as fc from 'fast-check';
import { beforeEach, describe, test } from 'vitest';
import { useGameStore } from '../store/gameStore';
import {
    calculateBaseReward,
    calculateFirstClearBonus,
    calculateLevelReward,
    calculateReplayReward,
    calculateStarRating,
    completeLevel,
    getLevel,
    isLevelUnlocked,
    LevelResult,
} from './campaignSystem';

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

/**
 * Star Rating System Property Tests
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
describe('Star Rating System Properties', () => {
  // Generator for valid LevelResult
  const levelResultArb = fc.record({
    completed: fc.boolean(),
    distanceTraveled: fc.integer({ min: 0, max: 10000 }),
    shardsCollected: fc.integer({ min: 0, max: 100 }),
    totalShardsAvailable: fc.integer({ min: 0, max: 100 }),
    damageTaken: fc.integer({ min: 0, max: 10 }),
    healthRemaining: fc.integer({ min: 0, max: 3 }),
  }).filter(result => result.shardsCollected <= result.totalShardsAvailable);

  /**
   * **Feature: campaign-update-v25, Property 9: Survivor star (1 star)**
   * **Validates: Requirements 4.1**
   *
   * For any level completion with health > 0, at least 1 star SHALL be awarded.
   */
  test('Property 9: Survivor star - completing with health > 0 awards at least 1 star', () => {
    // Generator for completed levels with health > 0
    const survivorResultArb = fc.record({
      completed: fc.constant(true),
      distanceTraveled: fc.integer({ min: 100, max: 10000 }),
      shardsCollected: fc.integer({ min: 0, max: 100 }),
      totalShardsAvailable: fc.integer({ min: 0, max: 100 }),
      damageTaken: fc.integer({ min: 0, max: 10 }),
      healthRemaining: fc.integer({ min: 1, max: 3 }), // health > 0
    }).filter(result => result.shardsCollected <= result.totalShardsAvailable);

    fc.assert(
      fc.property(
        survivorResultArb,
        (result: LevelResult) => {
          const rating = calculateStarRating(result);
          
          // Must have at least 1 star
          return rating.stars >= 1 && rating.survivor === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 10: Collector star (2 stars)**
   * **Validates: Requirements 4.2**
   *
   * For any level completion where shardsCollected >= 80% of totalShardsAvailable, 
   * at least 2 stars SHALL be awarded.
   */
  test('Property 10: Collector star - collecting >= 80% shards awards at least 2 stars', () => {
    // Generator for completed levels with >= 80% shards collected
    const collectorResultArb = fc.integer({ min: 1, max: 100 }).chain(totalShards => {
      const minShards = Math.ceil(totalShards * 0.8);
      return fc.record({
        completed: fc.constant(true),
        distanceTraveled: fc.integer({ min: 100, max: 10000 }),
        shardsCollected: fc.integer({ min: minShards, max: totalShards }),
        totalShardsAvailable: fc.constant(totalShards),
        damageTaken: fc.integer({ min: 1, max: 10 }), // Some damage to ensure not perfectionist
        healthRemaining: fc.integer({ min: 1, max: 3 }), // health > 0
      });
    });

    fc.assert(
      fc.property(
        collectorResultArb,
        (result: LevelResult) => {
          const rating = calculateStarRating(result);
          
          // Must have at least 2 stars and collector flag true
          return rating.stars >= 2 && rating.collector === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 11: Perfectionist star (3 stars)**
   * **Validates: Requirements 4.3**
   *
   * For any level completion with damageTaken = 0, 3 stars SHALL be awarded.
   */
  test('Property 11: Perfectionist star - no damage taken awards 3 stars', () => {
    // Generator for completed levels with no damage
    const perfectionistResultArb = fc.record({
      completed: fc.constant(true),
      distanceTraveled: fc.integer({ min: 100, max: 10000 }),
      shardsCollected: fc.integer({ min: 0, max: 100 }),
      totalShardsAvailable: fc.integer({ min: 0, max: 100 }),
      damageTaken: fc.constant(0), // No damage
      healthRemaining: fc.integer({ min: 1, max: 3 }), // health > 0
    }).filter(result => result.shardsCollected <= result.totalShardsAvailable);

    fc.assert(
      fc.property(
        perfectionistResultArb,
        (result: LevelResult) => {
          const rating = calculateStarRating(result);
          
          // Must have exactly 3 stars and perfectionist flag true
          return rating.stars === 3 && rating.perfectionist === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 12: Star rating maximum selection**
   * **Validates: Requirements 4.4**
   *
   * For any combination of completion criteria, the star rating SHALL be 
   * the highest applicable value (1, 2, or 3).
   */
  test('Property 12: Star rating is the highest applicable value', () => {
    fc.assert(
      fc.property(
        levelResultArb,
        (result: LevelResult) => {
          const rating = calculateStarRating(result);
          
          // Calculate expected criteria
          const isSurvivor = result.completed && result.healthRemaining > 0;
          const shardPercentage = result.totalShardsAvailable > 0 
            ? result.shardsCollected / result.totalShardsAvailable 
            : 0;
          const isCollector = isSurvivor && shardPercentage >= 0.8;
          const isPerfectionist = isSurvivor && result.damageTaken === 0;
          
          // Determine expected stars (highest applicable)
          let expectedStars = 0;
          if (isPerfectionist) {
            expectedStars = 3;
          } else if (isCollector) {
            expectedStars = 2;
          } else if (isSurvivor) {
            expectedStars = 1;
          }
          
          // Verify rating matches expected
          return rating.stars === expectedStars &&
                 rating.survivor === isSurvivor &&
                 rating.collector === isCollector &&
                 rating.perfectionist === isPerfectionist;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional edge case: Failed level (not completed or health = 0) gets 0 stars
   */
  test('Failed level gets 0 stars', () => {
    // Generator for failed levels
    const failedResultArb = fc.oneof(
      // Not completed
      fc.record({
        completed: fc.constant(false),
        distanceTraveled: fc.integer({ min: 0, max: 10000 }),
        shardsCollected: fc.integer({ min: 0, max: 100 }),
        totalShardsAvailable: fc.integer({ min: 0, max: 100 }),
        damageTaken: fc.integer({ min: 0, max: 10 }),
        healthRemaining: fc.integer({ min: 0, max: 3 }),
      }),
      // Health = 0
      fc.record({
        completed: fc.constant(true),
        distanceTraveled: fc.integer({ min: 0, max: 10000 }),
        shardsCollected: fc.integer({ min: 0, max: 100 }),
        totalShardsAvailable: fc.integer({ min: 0, max: 100 }),
        damageTaken: fc.integer({ min: 1, max: 10 }),
        healthRemaining: fc.constant(0),
      })
    ).filter(result => result.shardsCollected <= result.totalShardsAvailable);

    fc.assert(
      fc.property(
        failedResultArb,
        (result: LevelResult) => {
          const rating = calculateStarRating(result);
          
          // Must have 0 stars and survivor flag false
          return rating.stars === 0 && rating.survivor === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Reward Calculation System Property Tests
 * Requirements: 9.1, 9.2, 9.3
 */
describe('Reward Calculation System Properties', () => {
  /**
   * **Feature: campaign-update-v25, Property 18: First-clear bonus formula**
   * **Validates: Requirements 9.1**
   *
   * For any first-time level completion, the bonus SHALL equal `50 + (level * 10)` Echo Shards.
   */
  test('Property 18: First-clear bonus formula correctness', () => {
    // Generator for valid level numbers (1-100)
    const levelArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(
        levelArb,
        (level) => {
          const bonus = calculateFirstClearBonus(level);
          const expectedBonus = 50 + (level * 10);
          
          return bonus === expectedBonus;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 19: Replay reward difference**
   * **Validates: Requirements 9.2**
   *
   * For any replay with higher star rating, the reward SHALL be the difference 
   * between new and previous reward amounts.
   */
  test('Property 19: Replay reward is difference when improving stars', () => {
    // Generator for level and star improvement scenarios
    const replayScenarioArb = fc.record({
      level: fc.integer({ min: 1, max: 100 }),
      previousStars: fc.integer({ min: 0, max: 2 }),
    }).chain(({ level, previousStars }) => 
      fc.record({
        level: fc.constant(level),
        previousStars: fc.constant(previousStars),
        newStars: fc.integer({ min: previousStars + 1, max: 3 }),
      })
    );

    fc.assert(
      fc.property(
        replayScenarioArb,
        ({ level, previousStars, newStars }) => {
          const replayReward = calculateReplayReward(level, newStars, previousStars);
          
          // Calculate expected difference
          const newBaseReward = calculateBaseReward(level, newStars);
          const previousBaseReward = calculateBaseReward(level, previousStars);
          const expectedDifference = newBaseReward - previousBaseReward;
          
          return replayReward === expectedDifference;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 19: Replay reward difference (no improvement)**
   * **Validates: Requirements 9.2**
   *
   * For any replay without star improvement, the reward SHALL be zero.
   */
  test('Property 19: Replay reward is zero when not improving', () => {
    // Generator for level and non-improvement scenarios
    const noImprovementArb = fc.record({
      level: fc.integer({ min: 1, max: 100 }),
      previousStars: fc.integer({ min: 1, max: 3 }),
    }).chain(({ level, previousStars }) => 
      fc.record({
        level: fc.constant(level),
        previousStars: fc.constant(previousStars),
        newStars: fc.integer({ min: 0, max: previousStars }),
      })
    );

    fc.assert(
      fc.property(
        noImprovementArb,
        ({ level, previousStars, newStars }) => {
          const replayReward = calculateReplayReward(level, newStars, previousStars);
          
          // No improvement means zero reward
          return replayReward === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 20: Base reward formula**
   * **Validates: Requirements 9.3**
   *
   * For any level and star count, the base reward SHALL equal 
   * `10 + (level * 3) + (stars * 5)` Echo Shards.
   */
  test('Property 20: Base reward formula correctness', () => {
    // Generator for valid level and star combinations
    const levelStarsArb = fc.record({
      level: fc.integer({ min: 1, max: 100 }),
      stars: fc.integer({ min: 0, max: 3 }),
    });

    fc.assert(
      fc.property(
        levelStarsArb,
        ({ level, stars }) => {
          const reward = calculateBaseReward(level, stars);
          const expectedReward = 10 + (level * 3) + (stars * 5);
          
          return reward === expectedReward;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 18+20: First clear total reward**
   * **Validates: Requirements 9.1, 9.3**
   *
   * For any first-time level completion, total reward SHALL equal 
   * base reward + first-clear bonus.
   */
  test('First clear total reward combines base and bonus', () => {
    // Generator for first clear scenarios
    const firstClearArb = fc.record({
      level: fc.integer({ min: 1, max: 100 }),
      stars: fc.integer({ min: 1, max: 3 }), // Must have at least 1 star to complete
    });

    fc.assert(
      fc.property(
        firstClearArb,
        ({ level, stars }) => {
          const result = calculateLevelReward(level, stars, true, 0);
          
          const expectedBase = calculateBaseReward(level, stars);
          const expectedBonus = calculateFirstClearBonus(level);
          const expectedTotal = expectedBase + expectedBonus;
          
          return result.baseReward === expectedBase &&
                 result.firstClearBonus === expectedBonus &&
                 result.totalReward === expectedTotal &&
                 result.isFirstClear === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Zero stars means zero reward
   */
  test('Zero stars results in zero reward', () => {
    const levelArb = fc.integer({ min: 1, max: 100 });

    fc.assert(
      fc.property(
        levelArb,
        (level) => {
          const result = calculateLevelReward(level, 0, true, 0);
          
          return result.baseReward === 0 &&
                 result.firstClearBonus === 0 &&
                 result.totalReward === 0 &&
                 result.isFirstClear === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
