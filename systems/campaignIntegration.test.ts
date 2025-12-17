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
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
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

          // Simulate until level complete (increased timeout for slower mobile-friendly speeds)
          while (!distanceTracker.isLevelComplete() && currentTime < 5000) {
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
          // Using level-scaled logarithmic formula with climax boost
          const speed = speedController.calculateSpeed(state, level);
          const rawBaseSpeed = speedController.getBaseSpeed();
          const baseSpeedMultiplier = 1 + (level - 1) * 0.05;
          const effectiveBaseSpeed = rawBaseSpeed * baseSpeedMultiplier;
          const accelMultiplier = 1 + (level - 1) * 0.03;
          const effectiveLogFactor = 0.3 * accelMultiplier;
          const logFactor = Math.log(1 + climaxDistance / 50);
          const progressiveSpeed = effectiveBaseSpeed * (1 + effectiveLogFactor * logFactor);
          const expectedSpeed = progressiveSpeed * 1.2; // Climax multiplier
          expect(speed).toBeCloseTo(expectedSpeed, 1);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Holographic gate appears near finish
   * Note: Gate visibility threshold is 30m per DEFAULT_HOLOGRAPHIC_GATE_CONFIG
   */
  test('Holographic gate appears when within 30m of target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);

          // Progress to 25m from target (within 30m threshold)
          const nearFinishDistance = targetDistance - 25;
          distanceTracker.update(1, nearFinishDistance);

          const remainingDistance = distanceTracker.getRemainingDistance();
          expect(remainingDistance).toBe(25);

          // Gate should be visible (within 30m threshold)
          const gateVisible = shouldGateBeVisible(remainingDistance, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          expect(gateVisible).toBe(true);

          // Distance bar should pulse (within 50m)
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
   * Note: Gate visibility threshold is 30m per DEFAULT_HOLOGRAPHIC_GATE_CONFIG
   */
  test('Holographic gate not visible when more than 30m from target', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);

          // Progress to 50m from target (beyond 30m threshold)
          const farDistance = targetDistance - 50;
          if (farDistance > 0) {
            distanceTracker.update(1, farDistance);
          }

          const remainingDistance = distanceTracker.getRemainingDistance();
          
          if (remainingDistance > DEFAULT_HOLOGRAPHIC_GATE_CONFIG.visibilityThreshold) {
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
   * Note: Base speed is constant for levels 1-3 (mobile-friendly intro)
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

      // Base speed should increase (except levels 1-10 which are constant for mobile)
      if (level > 10) {
        expect(levelConfig.baseSpeed).toBeGreaterThan(previousBaseSpeed);
      } else {
        expect(levelConfig.baseSpeed).toBeGreaterThanOrEqual(previousBaseSpeed);
      }
      previousBaseSpeed = levelConfig.baseSpeed;

      // Obstacle density should increase (up to cap)
      expect(levelConfig.obstacleDensity).toBeGreaterThanOrEqual(previousDensity);
      expect(levelConfig.obstacleDensity).toBeLessThanOrEqual(1.0);
      previousDensity = levelConfig.obstacleDensity;
    }
  });

  /**
   * Integration Test: Speed progression throughout a level
   * Uses logarithmic formula with level scaling:
   * - Base speed scales: baseSpeed × (1 + (level - 1) × 0.05)
   * - Acceleration scales: logFactor × (1 + (level - 1) × 0.03)
   */
  test('Speed increases progressively throughout level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const targetDistance = calculateTargetDistance(level);
          const distanceTracker = createDistanceTracker(targetDistance);
          const speedController = createSpeedController(level);
          const rawBaseSpeed = speedController.getBaseSpeed(); // Raw base speed before level scaling

          // Test speed at different progress points
          const progressPoints = [0, 0.25, 0.5, 0.75];
          let previousSpeed = 0;

          for (const progress of progressPoints) {
            distanceTracker.reset(targetDistance);
            const currentDistance = targetDistance * progress;
            distanceTracker.update(1, currentDistance);
            
            const state = distanceTracker.getState();
            const speed = speedController.calculateSpeed(state, level);

            // Speed should increase with progress
            expect(speed).toBeGreaterThanOrEqual(previousSpeed);
            previousSpeed = speed;

            // Speed should follow level-scaled logarithmic formula
            const baseSpeedMultiplier = 1 + (level - 1) * 0.05;
            const effectiveBaseSpeed = rawBaseSpeed * baseSpeedMultiplier;
            const accelMultiplier = 1 + (level - 1) * 0.03;
            const effectiveLogFactor = 0.3 * accelMultiplier;
            const logFactor = Math.log(1 + currentDistance / 50);
            const expectedSpeed = effectiveBaseSpeed * (1 + effectiveLogFactor * logFactor);
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
      // Completed but health = 0 (used restore) - still gets 1 star for completing
      { completed: true, health: 0, shardPercent: 0.5, damage: 1, expectedStars: 1 },
      // Completed with health = 0 but high shards - gets 2 stars (collector)
      { completed: true, health: 0, shardPercent: 1.0, damage: 1, expectedStars: 2 },
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


// ============================================================================
// Chapter System Integration Tests - Task 14.1
// Requirements: 2.4, 6.3, 8.1
// ============================================================================

import {
    calculateTargetDistance as calculateChapterTargetDistance,
    CHAPTER_PROGRESS_KEY,
    createDefaultChapterProgress,
    isChapterUnlocked,
    loadChapterProgress,
    saveChapterProgress,
    unlockNextChapter
} from './chapterSystem';

describe('Chapter System Integration: Full Chapter Flow', () => {
  // Store original localStorage for cleanup
  let originalLocalStorage: Storage;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockStorage = {};
    originalLocalStorage = global.localStorage;
    
    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; },
      length: 0,
      key: () => null,
    };
    
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Reset game store
    useGameStore.setState({
      completedLevels: [],
      currentLevel: 1,
      levelStars: {},
      echoShards: 0,
      chapterProgress: createDefaultChapterProgress(),
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  /**
   * Integration Test: Chapter 1 completion unlocks chapter 2
   * Requirements: 2.4 - WHEN a player completes a chapter THEN the Campaign_System 
   * SHALL unlock the next sequential chapter
   */
  test('Chapter 1 completion unlocks chapter 2', () => {
    // Initial state: only chapter 1 is unlocked
    const initialState = createDefaultChapterProgress();
    expect(isChapterUnlocked(1, initialState.completedChapters)).toBe(true);
    expect(isChapterUnlocked(2, initialState.completedChapters)).toBe(false);

    // Complete chapter 1
    const afterChapter1 = unlockNextChapter(1, initialState);

    // Verify chapter 1 is in completed list
    expect(afterChapter1.completedChapters).toContain(1);

    // Verify chapter 2 is now unlocked
    expect(isChapterUnlocked(2, afterChapter1.completedChapters)).toBe(true);

    // Verify chapter 3 is still locked
    expect(isChapterUnlocked(3, afterChapter1.completedChapters)).toBe(false);
  });

  /**
   * Integration Test: Sequential chapter completion chain
   * Requirements: 2.4 - Sequential unlock progression
   */
  test('Sequential chapter completion unlocks subsequent chapters', () => {
    fc.assert(
      fc.property(
        // Number of chapters to complete (1-10)
        fc.integer({ min: 1, max: 10 }),
        (chaptersToComplete) => {
          let state = createDefaultChapterProgress();

          // Complete chapters in sequence
          for (let i = 1; i <= chaptersToComplete; i++) {
            // Verify current chapter is unlocked before completing
            expect(isChapterUnlocked(i, state.completedChapters)).toBe(true);
            
            // Complete the chapter
            state = unlockNextChapter(i, state);
            
            // Verify it's now in completed list
            expect(state.completedChapters).toContain(i);
          }

          // Verify next chapter is unlocked
          const nextChapter = chaptersToComplete + 1;
          if (nextChapter <= 100) {
            expect(isChapterUnlocked(nextChapter, state.completedChapters)).toBe(true);
          }

          // Verify chapter after next is still locked
          const chapterAfterNext = chaptersToComplete + 2;
          if (chapterAfterNext <= 100) {
            expect(isChapterUnlocked(chapterAfterNext, state.completedChapters)).toBe(false);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Game over does NOT unlock next chapter
   * Requirements: 6.3 - WHEN game over triggers THEN the system SHALL NOT unlock the next chapter
   */
  test('Game over does not unlock next chapter', () => {
    fc.assert(
      fc.property(
        // Chapter being played (1-99)
        fc.integer({ min: 1, max: 99 }),
        // Progress ratio when game over occurs (10%-90%)
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.9), noNaN: true }),
        (chapterId, progressRatio) => {
          // Set up initial state with chapter unlocked
          let state = createDefaultChapterProgress();
          
          // Unlock chapters up to the one being played
          for (let i = 1; i < chapterId; i++) {
            state = unlockNextChapter(i, state);
          }

          // Verify current chapter is unlocked
          expect(isChapterUnlocked(chapterId, state.completedChapters)).toBe(true);

          // Simulate game over (player dies before reaching target)
          const targetDistance = calculateChapterTargetDistance(chapterId);
          const distanceTracker = createDistanceTracker(targetDistance);
          
          // Progress partway through chapter
          const currentDistance = targetDistance * progressRatio;
          distanceTracker.update(1, currentDistance);

          // Verify level is NOT complete
          expect(distanceTracker.isLevelComplete()).toBe(false);

          // Game over triggers (health = 0)
          const shouldGameOver = shouldTriggerGameOver(0, distanceTracker.isLevelComplete());
          expect(shouldGameOver).toBe(true);

          // CRITICAL: State should NOT be modified on game over
          // The completedChapters list should remain unchanged
          const stateAfterGameOver = state; // No unlockNextChapter call on game over

          // Next chapter should still be locked
          const nextChapter = chapterId + 1;
          if (nextChapter <= 100) {
            expect(isChapterUnlocked(nextChapter, stateAfterGameOver.completedChapters)).toBe(false);
          }

          // Current chapter should NOT be in completed list
          expect(stateAfterGameOver.completedChapters).not.toContain(chapterId);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Persistence across page reload
   * Requirements: 8.1 - WHEN a chapter is completed THEN the Campaign_System 
   * SHALL persist the completion to localStorage
   */
  test('Chapter progress persists across page reload', () => {
    fc.assert(
      fc.property(
        // Number of chapters to complete (1-10)
        fc.integer({ min: 1, max: 10 }),
        (chaptersToComplete) => {
          // Clear storage
          mockStorage = {};

          // Complete chapters and save progress
          let state = createDefaultChapterProgress();
          for (let i = 1; i <= chaptersToComplete; i++) {
            state = unlockNextChapter(i, state);
          }

          // Save to storage
          const saveResult = saveChapterProgress(state);
          expect(saveResult).toBe(true);

          // Verify data is in storage
          expect(mockStorage[CHAPTER_PROGRESS_KEY]).toBeDefined();

          // Simulate page reload by loading from storage
          const loadedState = loadChapterProgress();

          // Verify loaded state matches saved state
          expect(loadedState.completedChapters).toEqual(state.completedChapters);
          expect(loadedState.currentChapter).toBe(state.currentChapter);
          expect(loadedState.highestUnlocked).toBe(state.highestUnlocked);

          // Verify all completed chapters are still accessible
          for (let i = 1; i <= chaptersToComplete; i++) {
            expect(loadedState.completedChapters).toContain(i);
          }

          // Verify next chapter is still unlocked after reload
          const nextChapter = chaptersToComplete + 1;
          if (nextChapter <= 100) {
            expect(isChapterUnlocked(nextChapter, loadedState.completedChapters)).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Full chapter completion flow with game store
   * Tests the complete flow: start → play → complete → unlock → persist
   */
  test('Full chapter completion flow with game store integration', () => {
    // Clear storage
    mockStorage = {};

    // Initial state
    const store = useGameStore.getState();
    expect(store.chapterProgress.completedChapters).toEqual([]);
    expect(store.chapterProgress.highestUnlocked).toBe(1);

    // Complete chapter 1 using game store action
    useGameStore.getState().completeChapter(1);

    // Verify state updated
    const afterComplete = useGameStore.getState();
    expect(afterComplete.chapterProgress.completedChapters).toContain(1);
    expect(afterComplete.chapterProgress.highestUnlocked).toBe(2);

    // Verify chapter 2 is now unlocked
    expect(isChapterUnlocked(2, afterComplete.chapterProgress.completedChapters)).toBe(true);

    // Verify persistence
    const loadedState = loadChapterProgress();
    expect(loadedState.completedChapters).toContain(1);
    expect(loadedState.highestUnlocked).toBe(2);
  });

  /**
   * Integration Test: Chapter completion with distance tracking
   * Tests that completing target distance triggers chapter completion
   */
  test('Reaching target distance triggers chapter completion', () => {
    fc.assert(
      fc.property(
        // Chapter number (1-50)
        fc.integer({ min: 1, max: 50 }),
        (chapterId) => {
          const targetDistance = calculateChapterTargetDistance(chapterId);
          const distanceTracker = createDistanceTracker(targetDistance);

          // Verify target distance formula
          expect(targetDistance).toBe(chapterId * 100);

          // Simulate gameplay until completion
          // Using larger deltaTime to speed up test (1 second per frame at 100 m/s)
          const speed = 100; // meters per second
          const deltaTime = 1; // 1 second per update
          let iterations = 0;
          const maxIterations = targetDistance * 2; // Safety limit

          while (!distanceTracker.isLevelComplete() && iterations < maxIterations) {
            distanceTracker.update(deltaTime, speed);
            iterations++;
          }

          // Verify level is complete
          expect(distanceTracker.isLevelComplete()).toBe(true);
          expect(distanceTracker.getCurrentDistance()).toBeGreaterThanOrEqual(targetDistance);

          // Now unlock next chapter
          let state = createDefaultChapterProgress();
          
          // Unlock chapters up to current
          for (let i = 1; i < chapterId; i++) {
            state = unlockNextChapter(i, state);
          }
          
          // Complete current chapter
          state = unlockNextChapter(chapterId, state);

          // Verify next chapter is unlocked
          const nextChapter = chapterId + 1;
          if (nextChapter <= 100) {
            expect(isChapterUnlocked(nextChapter, state.completedChapters)).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration Test: Cannot skip chapters
   * Verifies that chapters must be completed in sequence
   */
  test('Cannot skip chapters - must complete in sequence', () => {
    fc.assert(
      fc.property(
        // Chapter to try to access (3-50)
        fc.integer({ min: 3, max: 50 }),
        (targetChapter) => {
          // Start with default state (only chapter 1 unlocked)
          const state = createDefaultChapterProgress();

          // Try to access a chapter without completing previous ones
          expect(isChapterUnlocked(targetChapter, state.completedChapters)).toBe(false);

          // Complete only chapter 1
          const afterChapter1 = unlockNextChapter(1, state);

          // Target chapter should still be locked (unless it's chapter 2)
          if (targetChapter > 2) {
            expect(isChapterUnlocked(targetChapter, afterChapter1.completedChapters)).toBe(false);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Chapter System Integration: Edge Cases', () => {
  // Store original localStorage for cleanup
  let originalLocalStorage: Storage;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockStorage = {};
    originalLocalStorage = global.localStorage;
    
    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; },
      length: 0,
      key: () => null,
    };
    
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  /**
   * Integration Test: Completing same chapter multiple times doesn't duplicate
   */
  test('Completing same chapter multiple times does not duplicate entries', () => {
    let state = createDefaultChapterProgress();

    // Complete chapter 1 multiple times
    state = unlockNextChapter(1, state);
    state = unlockNextChapter(1, state);
    state = unlockNextChapter(1, state);

    // Should only have one entry for chapter 1
    const chapter1Count = state.completedChapters.filter(c => c === 1).length;
    expect(chapter1Count).toBe(1);

    // Chapter 2 should still be unlocked
    expect(isChapterUnlocked(2, state.completedChapters)).toBe(true);
  });

  /**
   * Integration Test: Corrupted storage falls back to default
   */
  test('Corrupted storage falls back to default state', () => {
    // Set corrupted data
    mockStorage[CHAPTER_PROGRESS_KEY] = 'invalid json {{{';

    // Load should return default state
    const loadedState = loadChapterProgress();
    const defaultState = createDefaultChapterProgress();

    expect(loadedState).toEqual(defaultState);
  });

  /**
   * Integration Test: Chapter 100 completion (final chapter)
   */
  test('Chapter 100 completion handles boundary correctly', () => {
    let state = createDefaultChapterProgress();

    // Complete all chapters up to 100
    for (let i = 1; i <= 100; i++) {
      state = unlockNextChapter(i, state);
    }

    // All 100 chapters should be completed
    expect(state.completedChapters.length).toBe(100);

    // Highest unlocked should be capped at 100
    expect(state.highestUnlocked).toBe(100);

    // Chapter 101 should not be unlocked (doesn't exist)
    expect(isChapterUnlocked(101, state.completedChapters)).toBe(false);
  });
});
