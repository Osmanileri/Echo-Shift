/**
 * Integration Tests for Campaign Update v2.5
 * Task 19.1: Full flow integration testing
 * 
 * Tests the complete level flow:
 * - Level selection → play → complete → victory → return
 * - First-clear vs replay reward scenarios
 * - Chapter transitions
 * - Animation triggers
 * 
 * Requirements: All campaign-update-v25 requirements
 */

import * as fc from 'fast-check';
import { beforeEach, describe, expect, test } from 'vitest';
import { calculateBaseSpeed, calculateTargetDistance, ChapterType, getChapterForLevel, getLevelById } from '../data/levels';
import { useGameStore } from '../store/gameStore';
import {
    calculateBaseReward,
    calculateFirstClearBonus,
    calculateLevelReward,
    calculateStarRating,
    LevelResult,
} from './campaignSystem';
import { calculateFOVMultiplier, DEFAULT_CLIMAX_VFX_CONFIG } from './climaxVFX';
import { createDistanceTracker, shouldTriggerGameOver } from './distanceTracker';
import { DEFAULT_HOLOGRAPHIC_GATE_CONFIG, shouldGateBeVisible } from './holographicGate';
import { createSpeedController } from './speedController';

describe('Campaign Integration: Level Flow', () => {
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
   * Integration Test: Complete level flow from selection to victory
   * Tests: select → play → complete → victory → return
   */
  test('Complete level flow: select → play → complete → victory', () => {
    fc.assert(
      fc.property(
        // Level number (1-50 for reasonable test time)
        fc.integer({ min: 1, max: 50 }),
        // Shard collection percentage (0-100%)
        fc.float({ min: 0, max: 1, noNaN: true }),
        // Whether player takes damage
        fc.boolean(),
        (level, shardPercent, takesDamage) => {
          // 1. LEVEL SELECTION: Get level configuration
          const levelConfig = getLevelById(level);
          expect(levelConfig).toBeDefined();
          if (!levelConfig) return true;

          // 2. PLAY: Initialize distance tracker and speed controller
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);
          const speedController = createSpeedController(level);

          // Verify initial state
          expect(distanceTracker.getCurrentDistance()).toBe(0);
          expect(distanceTracker.isLevelComplete()).toBe(false);

          // 3. SIMULATE GAMEPLAY: Progress through the level
          const baseSpeed = calculateBaseSpeed(level);
          let currentTime = 0;
          const deltaTime = 0.016; // ~60fps

          // Simulate until level complete
          while (!distanceTracker.isLevelComplete() && currentTime < 1000) {
            const distanceState = distanceTracker.getState();
            speedController.update(deltaTime * 1000, distanceState.isInClimaxZone);
            const speed = speedController.calculateSpeed(distanceState, level);
            distanceTracker.update(deltaTime, speed);
            currentTime += deltaTime;
          }

          // 4. LEVEL COMPLETE: Verify completion
          expect(distanceTracker.isLevelComplete()).toBe(true);
          expect(distanceTracker.getCurrentDistance()).toBeGreaterThanOrEqual(targetDistance);

          // 5. VICTORY: Calculate star rating
          const totalShards = 50; // Assume 50 shards available
          const shardsCollected = Math.floor(totalShards * shardPercent);
          const damageTaken = takesDamage ? 1 : 0;

          const levelResult: LevelResult = {
            completed: true,
            distanceTraveled: distanceTracker.getCurrentDistance(),
            shardsCollected,
            totalShardsAvailable: totalShards,
            damageTaken,
            healthRemaining: takesDamage ? 2 : 3,
          };

          const starRating = calculateStarRating(levelResult);

          // Verify star rating logic
          expect(starRating.stars).toBeGreaterThanOrEqual(1); // At least 1 star for completion
          if (!takesDamage) {
            expect(starRating.stars).toBe(3); // Perfectionist
            expect(starRating.perfectionist).toBe(true);
          }
          if (shardPercent >= 0.8 && takesDamage) {
            expect(starRating.stars).toBe(2); // Collector
            expect(starRating.collector).toBe(true);
          }

          // 6. REWARDS: Calculate rewards
          const reward = calculateLevelReward(level, starRating.stars, true, 0);
          expect(reward.isFirstClear).toBe(true);
          expect(reward.firstClearBonus).toBe(calculateFirstClearBonus(level));
          expect(reward.baseReward).toBe(calculateBaseReward(level, starRating.stars));
          expect(reward.totalReward).toBe(reward.baseReward + reward.firstClearBonus);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: First-clear vs replay reward scenarios
   */
  test('First-clear vs replay reward scenarios', () => {
    fc.assert(
      fc.property(
        // Level number
        fc.integer({ min: 1, max: 100 }),
        // First clear stars (1-3)
        fc.integer({ min: 1, max: 3 }),
        // Replay stars (0-3)
        fc.integer({ min: 0, max: 3 }),
        (level, firstClearStars, replayStars) => {
          // First clear
          const firstClearReward = calculateLevelReward(level, firstClearStars, true, 0);
          
          expect(firstClearReward.isFirstClear).toBe(true);
          expect(firstClearReward.firstClearBonus).toBe(50 + level * 10);
          expect(firstClearReward.baseReward).toBe(10 + level * 3 + firstClearStars * 5);

          // Replay
          const replayReward = calculateLevelReward(level, replayStars, false, firstClearStars);
          
          expect(replayReward.isFirstClear).toBe(false);
          expect(replayReward.firstClearBonus).toBe(0);

          // Replay reward should only be difference if improved
          if (replayStars > firstClearStars) {
            const expectedDiff = (10 + level * 3 + replayStars * 5) - (10 + level * 3 + firstClearStars * 5);
            expect(replayReward.totalReward).toBe(expectedDiff);
          } else {
            expect(replayReward.totalReward).toBe(0);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Integration Test: Chapter transitions
   */
  test('Chapter transitions occur at correct level boundaries', () => {
    const chapterBoundaries: Array<{ level: number; expectedChapter: ChapterType }> = [
      { level: 1, expectedChapter: 'SUB_BASS' },
      { level: 10, expectedChapter: 'SUB_BASS' },
      { level: 11, expectedChapter: 'BASS' },
      { level: 20, expectedChapter: 'BASS' },
      { level: 21, expectedChapter: 'MID' },
      { level: 30, expectedChapter: 'MID' },
      { level: 31, expectedChapter: 'HIGH' },
      { level: 40, expectedChapter: 'HIGH' },
      { level: 41, expectedChapter: 'PRESENCE' },
      { level: 50, expectedChapter: 'PRESENCE' },
    ];

    for (const { level, expectedChapter } of chapterBoundaries) {
      const chapter = getChapterForLevel(level);
      expect(chapter).toBe(expectedChapter);

      const levelConfig = getLevelById(level);
      expect(levelConfig?.chapter).toBe(expectedChapter);
    }
  });

  /**
   * Integration Test: Moving obstacles introduced at MID chapter
   */
  test('Moving obstacles introduced at MID chapter (level 21+)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const levelConfig = getLevelById(level);
          if (!levelConfig) return true;

          const expectedMovingObstacles = level >= 21;
          expect(levelConfig.mechanics.movingObstacles).toBe(expectedMovingObstacles);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Campaign Integration: Visual Effects Triggers', () => {
  /**
   * Integration Test: Climax zone triggers VFX
   */
  test('Climax zone triggers FOV increase and speed boost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);
          const speedController = createSpeedController(level);

          // Progress to 85% (in climax zone)
          const climaxDistance = targetDistance * 0.85;
          distanceTracker.update(1, climaxDistance);

          const state = distanceTracker.getState();
          expect(state.isInClimaxZone).toBe(true);
          expect(state.progressPercent).toBeGreaterThanOrEqual(80);

          // Simulate transition completion
          speedController.update(500, true);

          // FOV should be increased
          const fovMultiplier = calculateFOVMultiplier(true, 1, DEFAULT_CLIMAX_VFX_CONFIG);
          expect(fovMultiplier).toBeGreaterThan(1.0);
          expect(fovMultiplier).toBeLessThanOrEqual(1.15);

          // Speed should include climax multiplier
          const speed = speedController.calculateSpeed(state, level);
          const baseSpeed = calculateBaseSpeed(level);
          const progressiveSpeed = baseSpeed * (1 + 0.85 * 0.3);
          const expectedSpeed = progressiveSpeed * 1.2;
          expect(speed).toBeCloseTo(expectedSpeed, 1);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Holographic gate appears near finish
   */
  test('Holographic gate appears when within 100m of target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);

          // Progress to 50m from target
          const nearFinishDistance = targetDistance - 50;
          distanceTracker.update(1, nearFinishDistance);

          const remainingDistance = distanceTracker.getRemainingDistance();
          expect(remainingDistance).toBe(50);

          // Gate should be visible
          const gateVisible = shouldGateBeVisible(remainingDistance, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          expect(gateVisible).toBe(true);

          // Distance bar should pulse
          const state = distanceTracker.getState();
          expect(state.isNearFinish).toBe(true);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Gate not visible when far from target
   */
  test('Holographic gate not visible when more than 100m from target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);

          // Progress to 150m from target
          const farDistance = targetDistance - 150;
          if (farDistance > 0) {
            distanceTracker.update(1, farDistance);
          }

          const remainingDistance = distanceTracker.getRemainingDistance();
          
          if (remainingDistance > 100) {
            const gateVisible = shouldGateBeVisible(remainingDistance, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
            expect(gateVisible).toBe(false);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Campaign Integration: Game Over Scenarios', () => {
  /**
   * Integration Test: Game over triggers when health reaches zero before target
   */
  test('Game over triggers when health = 0 before reaching target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        (level, progressRatio) => {
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);

          // Progress partway through level
          const currentDistance = targetDistance * progressRatio;
          distanceTracker.update(1, currentDistance);

          const isComplete = distanceTracker.isLevelComplete();
          expect(isComplete).toBe(false);

          // Health reaches zero
          const shouldGameOver = shouldTriggerGameOver(0, isComplete);
          expect(shouldGameOver).toBe(true);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: No game over when level is complete even with zero health
   */
  test('No game over when level is complete even with zero health', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);

          // Complete the level
          distanceTracker.update(1, targetDistance + 10);

          const isComplete = distanceTracker.isLevelComplete();
          expect(isComplete).toBe(true);

          // Even with zero health, no game over
          const shouldGameOver = shouldTriggerGameOver(0, isComplete);
          expect(shouldGameOver).toBe(false);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Campaign Integration: Progressive Difficulty', () => {
  /**
   * Integration Test: Difficulty increases with level
   */
  test('Target distance, base speed, and obstacle density increase with level', () => {
    let previousTargetDistance = 0;
    let previousBaseSpeed = 0;
    let previousDensity = 0;

    for (let level = 1; level <= 100; level++) {
      const levelConfig = getLevelById(level);
      expect(levelConfig).toBeDefined();
      if (!levelConfig) continue;

      // Target distance should increase
      expect(levelConfig.targetDistance).toBeGreaterThan(previousTargetDistance);
      previousTargetDistance = levelConfig.targetDistance;

      // Base speed should increase
      expect(levelConfig.baseSpeed).toBeGreaterThan(previousBaseSpeed);
      previousBaseSpeed = levelConfig.baseSpeed;

      // Obstacle density should increase (up to cap)
      expect(levelConfig.obstacleDensity).toBeGreaterThanOrEqual(previousDensity);
      expect(levelConfig.obstacleDensity).toBeLessThanOrEqual(1.0);
      previousDensity = levelConfig.obstacleDensity;
    }
  });

  /**
   * Integration Test: Speed progression throughout a level
   */
  test('Speed increases progressively throughout level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);
          const speedController = createSpeedController(level);
          const baseSpeed = calculateBaseSpeed(level);

          // Test speed at different progress points
          const progressPoints = [0, 0.25, 0.5, 0.75];
          let previousSpeed = 0;

          for (const progress of progressPoints) {
            distanceTracker.reset(targetDistance);
            distanceTracker.update(1, targetDistance * progress);
            
            const state = distanceTracker.getState();
            const speed = speedController.calculateSpeed(state, level);

            // Speed should increase with progress
            expect(speed).toBeGreaterThanOrEqual(previousSpeed);
            previousSpeed = speed;

            // Speed should follow formula: baseSpeed * (1 + progress * 0.3)
            const expectedSpeed = baseSpeed * (1 + progress * 0.3);
            expect(speed).toBeCloseTo(expectedSpeed, 1);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Campaign Integration: Star Rating Edge Cases', () => {
  /**
   * Integration Test: All star criteria combinations
   */
  test('Star rating correctly handles all criteria combinations', () => {
    const testCases = [
      // Not completed
      { completed: false, health: 3, shardPercent: 1.0, damage: 0, expectedStars: 0 },
      // Completed but health = 0
      { completed: true, health: 0, shardPercent: 1.0, damage: 1, expectedStars: 0 },
      // Survivor only (low shards, took damage)
      { completed: true, health: 1, shardPercent: 0.5, damage: 2, expectedStars: 1 },
      // Collector (high shards, took damage)
      { completed: true, health: 1, shardPercent: 0.85, damage: 1, expectedStars: 2 },
      // Perfectionist (no damage)
      { completed: true, health: 3, shardPercent: 0.5, damage: 0, expectedStars: 3 },
      // Perfectionist with high shards (still 3 stars, not 2)
      { completed: true, health: 3, shardPercent: 0.9, damage: 0, expectedStars: 3 },
    ];

    for (const tc of testCases) {
      const result: LevelResult = {
        completed: tc.completed,
        distanceTraveled: 1000,
        shardsCollected: Math.floor(100 * tc.shardPercent),
        totalShardsAvailable: 100,
        damageTaken: tc.damage,
        healthRemaining: tc.health,
      };

      const rating = calculateStarRating(result);
      expect(rating.stars).toBe(tc.expectedStars);
    }
  });
});
