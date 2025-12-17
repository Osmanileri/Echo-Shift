/**
 * Property-Based Tests for Distance Tracking System
 * Campaign Update v2.5
 * 
 * Tests for:
 * - Property 2: Level completion trigger
 * - Property 3: Distance accumulation
 * - Property 4: Game over on zero health
 * - Property 6: Climax zone detection
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    createDistanceTracker,
    shouldTriggerGameOver
} from './distanceTracker';

describe('Distance Tracking Properties - Campaign Update v2.5', () => {
  /**
   * **Feature: campaign-update-v25, Property 2: Level completion trigger**
   * **Validates: Requirements 2.2**
   * 
   * For any game state where currentDistance >= targetDistance,
   * the level completion SHALL be triggered.
   */
  test('Property 2: Level completion trigger', () => {
    fc.assert(
      fc.property(
        // Target distance (positive)
        fc.integer({ min: 100, max: 10000 }),
        // Current distance as a ratio of target (0.5 to 2.0)
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        (targetDistance, distanceRatio) => {
          const tracker = createDistanceTracker(targetDistance);
          
          // Simulate reaching a certain distance
          const currentDistance = targetDistance * distanceRatio;
          
          // Update tracker to reach the distance (using 1 second at the required speed)
          tracker.update(1, currentDistance);
          
          const isComplete = tracker.isLevelComplete();
          const state = tracker.getState();
          
          // Level should be complete if currentDistance >= targetDistance
          if (state.currentDistance >= targetDistance) {
            expect(isComplete).toBe(true);
          } else {
            expect(isComplete).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 3: Distance accumulation**
   * **Validates: Requirements 2.3**
   * 
   * For any positive deltaTime and speed, the distance tracker SHALL
   * increase currentDistance. Distance increments in whole numbers only.
   */
  test('Property 3: Distance accumulation (whole numbers)', () => {
    fc.assert(
      fc.property(
        // Target distance (large enough)
        fc.integer({ min: 10000, max: 100000 }),
        // Delta time in seconds (large enough to produce whole number)
        fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true }),
        // Speed in meters per second (large enough)
        fc.float({ min: Math.fround(10), max: Math.fround(100), noNaN: true }),
        (targetDistance, deltaTime, speed) => {
          const tracker = createDistanceTracker(targetDistance);
          
          // Get initial distance
          const initialDistance = tracker.getCurrentDistance();
          expect(initialDistance).toBe(0);
          
          // Update with deltaTime and speed
          tracker.update(deltaTime, speed);
          
          // Get new distance
          const newDistance = tracker.getCurrentDistance();
          
          // Distance should be a whole number (floor of accumulated)
          const expectedIncrease = speed * deltaTime;
          const expectedDistance = Math.min(Math.floor(expectedIncrease), targetDistance);
          expect(newDistance).toBe(expectedDistance);
          
          // Distance should always be a whole number
          expect(Number.isInteger(newDistance)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 3: Distance accumulation (multiple updates)**
   * **Validates: Requirements 2.3**
   * 
   * Distance accumulation should be additive across multiple updates.
   * Distance increments in whole numbers and is capped at target.
   */
  test('Property 3: Distance accumulation is additive and capped', () => {
    fc.assert(
      fc.property(
        // Target distance (large enough to not be reached)
        fc.integer({ min: 10000, max: 100000 }),
        // Array of (deltaTime, speed) pairs
        fc.array(
          fc.tuple(
            fc.float({ min: Math.fround(0.01), max: Math.fround(0.1), noNaN: true }),
            fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true })
          ),
          { minLength: 2, maxLength: 10 }
        ),
        (targetDistance, updates) => {
          const tracker = createDistanceTracker(targetDistance);
          
          let expectedTotal = 0;
          
          // Apply all updates
          for (const [deltaTime, speed] of updates) {
            tracker.update(deltaTime, speed);
            expectedTotal += deltaTime * speed;
          }
          
          // Final distance should be floor of expected (whole numbers only)
          // and capped at target
          const expectedCapped = Math.min(Math.floor(expectedTotal), targetDistance);
          expect(tracker.getCurrentDistance()).toBe(expectedCapped);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 4: Game over on zero health**
   * **Validates: Requirements 2.4**
   * 
   * For any game state where health = 0 and currentDistance < targetDistance,
   * game over SHALL be triggered.
   */
  test('Property 4: Game over on zero health', () => {
    fc.assert(
      fc.property(
        // Health (0 to 5)
        fc.integer({ min: 0, max: 5 }),
        // Whether level is complete
        fc.boolean(),
        (health, isLevelComplete) => {
          const shouldGameOver = shouldTriggerGameOver(health, isLevelComplete);
          
          // Game over should trigger when health is 0 AND level is not complete
          if (health <= 0 && !isLevelComplete) {
            expect(shouldGameOver).toBe(true);
          } else {
            expect(shouldGameOver).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 4: Game over NOT triggered when level complete**
   * **Validates: Requirements 2.4**
   * 
   * Even with zero health, game over should NOT trigger if level is complete.
   */
  test('Property 4: No game over when level is complete', () => {
    fc.assert(
      fc.property(
        // Health (including 0)
        fc.integer({ min: 0, max: 5 }),
        (health) => {
          // Level is complete
          const isLevelComplete = true;
          const shouldGameOver = shouldTriggerGameOver(health, isLevelComplete);
          
          // Should never trigger game over when level is complete
          expect(shouldGameOver).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 6: Climax zone detection**
   * **Validates: Requirements 3.2**
   * 
   * For any currentDistance >= 80% of targetDistance,
   * isInClimaxZone SHALL be true.
   */
  test('Property 6: Climax zone detection', () => {
    fc.assert(
      fc.property(
        // Target distance
        fc.integer({ min: 100, max: 10000 }),
        // Progress percentage (0 to 120%)
        fc.float({ min: Math.fround(0), max: Math.fround(1.2), noNaN: true }),
        (targetDistance, progressRatio) => {
          const tracker = createDistanceTracker(targetDistance);
          
          // Simulate reaching a certain progress
          const distanceToTravel = targetDistance * progressRatio;
          if (distanceToTravel > 0) {
            tracker.update(1, distanceToTravel);
          }
          
          const state = tracker.getState();
          
          // Climax zone should be active when progress >= 80%
          const expectedInClimaxZone = state.progressPercent >= 80;
          expect(state.isInClimaxZone).toBe(expectedInClimaxZone);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 6: Climax zone boundary**
   * **Validates: Requirements 3.2**
   * 
   * Test the exact boundary at 80% progress.
   * Distance now increments in whole numbers.
   */
  test('Property 6: Climax zone boundary at exactly 80%', () => {
    fc.assert(
      fc.property(
        // Target distance (use multiples of 10 for clean 80% calculation)
        fc.integer({ min: 10, max: 1000 }).map(n => n * 10),
        (targetDistance) => {
          const tracker = createDistanceTracker(targetDistance);
          
          // Test just below 80% (use whole number)
          const justBelow = Math.floor(targetDistance * 0.79);
          tracker.update(1, justBelow);
          expect(tracker.getState().isInClimaxZone).toBe(false);
          
          // Reset and test at exactly 80%
          tracker.reset(targetDistance);
          const exactly80 = Math.floor(targetDistance * 0.8);
          tracker.update(1, exactly80);
          expect(tracker.getState().isInClimaxZone).toBe(true);
          
          // Reset and test above 80%
          tracker.reset(targetDistance);
          const above80 = Math.floor(targetDistance * 0.85);
          tracker.update(1, above80);
          expect(tracker.getState().isInClimaxZone).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Distance Bar Pulse Properties - Campaign Update v2.5', () => {
  /**
   * **Feature: campaign-update-v25, Property 24: Distance bar pulse trigger**
   * **Validates: Requirements 6.4**
   * 
   * For any currentDistance within 50 meters of targetDistance,
   * the distance bar pulse animation SHALL be active (isNearFinish = true).
   */
  test('Property 24: Distance bar pulse trigger', () => {
    fc.assert(
      fc.property(
        // Target distance (must be > 50 to have meaningful test)
        fc.integer({ min: 100, max: 10000 }),
        // Distance from target (0 to 100 meters)
        fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
        (targetDistance, distanceFromTarget) => {
          const tracker = createDistanceTracker(targetDistance);
          
          // Calculate current distance based on distance from target
          const currentDistance = Math.max(0, targetDistance - distanceFromTarget);
          
          // Update tracker to reach this distance
          if (currentDistance > 0) {
            tracker.update(1, currentDistance);
          }
          
          const state = tracker.getState();
          
          // Distance bar pulse (isNearFinish) should be active when:
          // 1. Within 50 meters of target (remainingDistance <= 50)
          // 2. AND not yet completed (remainingDistance > 0)
          const remainingDistance = targetDistance - state.currentDistance;
          const expectedPulse = remainingDistance <= 50 && remainingDistance > 0;
          
          expect(state.isNearFinish).toBe(expectedPulse);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 24: Distance bar pulse boundary**
   * **Validates: Requirements 6.4**
   * 
   * Test the exact boundary at 50 meters from target.
   */
  test('Property 24: Distance bar pulse boundary at exactly 50m', () => {
    fc.assert(
      fc.property(
        // Target distance (must be > 100 to test boundaries properly)
        fc.integer({ min: 200, max: 10000 }),
        (targetDistance) => {
          const tracker = createDistanceTracker(targetDistance);
          
          // Test just outside 50m boundary (51m remaining) - no pulse
          const justOutside = targetDistance - 51;
          tracker.update(1, justOutside);
          expect(tracker.getState().isNearFinish).toBe(false);
          
          // Reset and test at exactly 50m remaining - pulse active
          tracker.reset(targetDistance);
          const exactly50 = targetDistance - 50;
          tracker.update(1, exactly50);
          expect(tracker.getState().isNearFinish).toBe(true);
          
          // Reset and test inside 50m (30m remaining) - pulse active
          tracker.reset(targetDistance);
          const inside50 = targetDistance - 30;
          tracker.update(1, inside50);
          expect(tracker.getState().isNearFinish).toBe(true);
          
          // Reset and test at target (0m remaining) - no pulse (level complete)
          tracker.reset(targetDistance);
          tracker.update(1, targetDistance);
          expect(tracker.getState().isNearFinish).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 24: Pulse deactivates on completion**
   * **Validates: Requirements 6.4**
   * 
   * The pulse should deactivate when the level is complete (distance >= target).
   */
  test('Property 24: Pulse deactivates on level completion', () => {
    fc.assert(
      fc.property(
        // Target distance
        fc.integer({ min: 100, max: 10000 }),
        // Amount past target (0 to 100 meters)
        fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true }),
        (targetDistance, pastTarget) => {
          const tracker = createDistanceTracker(targetDistance);
          
          // Travel past the target
          const distanceTraveled = targetDistance + pastTarget;
          tracker.update(1, distanceTraveled);
          
          const state = tracker.getState();
          
          // When level is complete (at or past target), pulse should be inactive
          expect(state.isNearFinish).toBe(false);
          expect(tracker.isLevelComplete()).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Distance Tracker Edge Cases', () => {
  /**
   * Test that invalid inputs are handled gracefully
   */
  test('Invalid deltaTime is ignored', () => {
    const tracker = createDistanceTracker(1000);
    
    // Negative deltaTime
    tracker.update(-1, 10);
    expect(tracker.getCurrentDistance()).toBe(0);
    
    // Zero deltaTime
    tracker.update(0, 10);
    expect(tracker.getCurrentDistance()).toBe(0);
    
    // NaN deltaTime
    tracker.update(NaN, 10);
    expect(tracker.getCurrentDistance()).toBe(0);
  });

  /**
   * Test that invalid speed is handled gracefully
   */
  test('Invalid speed is ignored', () => {
    const tracker = createDistanceTracker(1000);
    
    // Negative speed
    tracker.update(1, -10);
    expect(tracker.getCurrentDistance()).toBe(0);
    
    // NaN speed
    tracker.update(1, NaN);
    expect(tracker.getCurrentDistance()).toBe(0);
  });

  /**
   * Test reset functionality
   */
  test('Reset clears distance and updates target', () => {
    const tracker = createDistanceTracker(1000);
    
    // Accumulate some distance
    tracker.update(1, 500);
    expect(tracker.getCurrentDistance()).toBe(500);
    
    // Reset with new target
    tracker.reset(2000);
    expect(tracker.getCurrentDistance()).toBe(0);
    expect(tracker.getTargetDistance()).toBe(2000);
  });

  /**
   * Test progress percentage calculation
   * Distance is now capped at target - cannot exceed it
   */
  test('Progress percentage is capped at 100 and distance cannot exceed target', () => {
    const tracker = createDistanceTracker(1000);
    
    // Try to go beyond target - should be capped at 1000
    tracker.update(1, 1500);
    
    const state = tracker.getState();
    expect(state.progressPercent).toBe(100);
    // Distance is now capped at target
    expect(state.currentDistance).toBe(1000);
  });

  /**
   * Test near finish detection
   */
  test('Near finish detection within 50m', () => {
    const tracker = createDistanceTracker(1000);
    
    // At 940m (60m remaining) - not near finish
    tracker.update(1, 940);
    expect(tracker.getState().isNearFinish).toBe(false);
    
    // At 960m (40m remaining) - near finish
    tracker.reset(1000);
    tracker.update(1, 960);
    expect(tracker.getState().isNearFinish).toBe(true);
    
    // At 1000m (0m remaining, level complete) - not near finish
    tracker.reset(1000);
    tracker.update(1, 1000);
    expect(tracker.getState().isNearFinish).toBe(false);
  });

  /**
   * Test remaining distance calculation
   */
  test('Remaining distance is calculated correctly', () => {
    const tracker = createDistanceTracker(1000);
    
    expect(tracker.getRemainingDistance()).toBe(1000);
    
    tracker.update(1, 300);
    expect(tracker.getRemainingDistance()).toBe(700);
    
    tracker.update(1, 800);
    expect(tracker.getRemainingDistance()).toBe(0); // Capped at 0
  });
});


describe('Campaign Chapter System - Level Completion Properties', () => {
  /**
   * **Feature: campaign-chapter-system, Property 2: Level Completion Trigger**
   * **Validates: Requirements 1.5**
   * 
   * For any game state where currentDistance >= targetDistance,
   * the system SHALL trigger level completion.
   */
  test('Property 2: Level Completion Trigger - currentDistance >= targetDistance triggers completion', () => {
    fc.assert(
      fc.property(
        // Chapter number (1-100)
        fc.integer({ min: 1, max: 100 }),
        // Distance ratio relative to target (0.5 to 1.5)
        fc.float({ min: 0.5, max: 1.5, noNaN: true }),
        (chapterId, distanceRatio) => {
          // Target distance = chapterId × 100 (chapter system formula)
          const targetDistance = chapterId * 100;
          const tracker = createDistanceTracker(targetDistance);
          
          // Simulate reaching a certain distance
          const currentDistance = targetDistance * distanceRatio;
          tracker.update(1, currentDistance);
          
          const isComplete = tracker.isLevelComplete();
          const state = tracker.getState();
          
          // Level completion SHALL trigger when currentDistance >= targetDistance
          if (state.currentDistance >= targetDistance) {
            expect(isComplete).toBe(true);
          } else {
            expect(isComplete).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 2: Level Completion Trigger - Exact boundary**
   * **Validates: Requirements 1.5**
   * 
   * Test the exact boundary at targetDistance.
   */
  test('Property 2: Level Completion Trigger - exact boundary at targetDistance', () => {
    fc.assert(
      fc.property(
        // Chapter number (1-100)
        fc.integer({ min: 1, max: 100 }),
        (chapterId) => {
          const targetDistance = chapterId * 100;
          const tracker = createDistanceTracker(targetDistance);
          
          // Just below target - not complete
          const justBelow = targetDistance - 0.001;
          tracker.update(1, justBelow);
          expect(tracker.isLevelComplete()).toBe(false);
          
          // Reset and test at exactly target - complete
          tracker.reset(targetDistance);
          tracker.update(1, targetDistance);
          expect(tracker.isLevelComplete()).toBe(true);
          
          // Reset and test above target - complete
          tracker.reset(targetDistance);
          tracker.update(1, targetDistance + 10);
          expect(tracker.isLevelComplete()).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Campaign Chapter System - Finish Line Visibility Properties', () => {
  /**
   * **Feature: campaign-chapter-system, Property 6: Finish Line Visibility Threshold**
   * **Validates: Requirements 3.1**
   * 
   * For any distance state where (targetDistance - currentDistance) <= 50,
   * the finish line SHALL be visible (isNearFinish = true).
   */
  test('Property 6: Finish Line Visibility Threshold - visible within 50m', () => {
    fc.assert(
      fc.property(
        // Chapter number (1-100, but need at least 100m target for meaningful test)
        fc.integer({ min: 1, max: 100 }),
        // Distance from target (0 to 100 meters)
        fc.float({ min: 0, max: 100, noNaN: true }),
        (chapterId, distanceFromTarget) => {
          const targetDistance = chapterId * 100;
          const tracker = createDistanceTracker(targetDistance);
          
          // Calculate current distance based on distance from target
          const currentDistance = Math.max(0, targetDistance - distanceFromTarget);
          
          // Update tracker to reach this distance
          if (currentDistance > 0) {
            tracker.update(1, currentDistance);
          }
          
          const state = tracker.getState();
          const isNearFinishMethod = tracker.isNearFinish();
          
          // Finish line visibility (isNearFinish) should be active when:
          // 1. Within 50 meters of target (remainingDistance <= 50)
          // 2. AND not yet completed (remainingDistance > 0)
          const remainingDistance = targetDistance - state.currentDistance;
          const expectedVisible = remainingDistance <= 50 && remainingDistance > 0;
          
          expect(state.isNearFinish).toBe(expectedVisible);
          expect(isNearFinishMethod).toBe(expectedVisible);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 6: Finish Line Visibility Threshold - Exact boundary**
   * **Validates: Requirements 3.1**
   * 
   * Test the exact boundary at 50 meters from target.
   */
  test('Property 6: Finish Line Visibility Threshold - exact boundary at 50m', () => {
    fc.assert(
      fc.property(
        // Chapter number (2-100, need at least 200m target to test 50m boundary properly)
        fc.integer({ min: 2, max: 100 }),
        (chapterId) => {
          const targetDistance = chapterId * 100;
          const tracker = createDistanceTracker(targetDistance);
          
          // Test just outside 50m boundary (51m remaining) - not visible
          const justOutside = targetDistance - 51;
          tracker.update(1, justOutside);
          expect(tracker.isNearFinish()).toBe(false);
          expect(tracker.getState().isNearFinish).toBe(false);
          
          // Reset and test at exactly 50m remaining - visible
          tracker.reset(targetDistance);
          const exactly50 = targetDistance - 50;
          tracker.update(1, exactly50);
          expect(tracker.isNearFinish()).toBe(true);
          expect(tracker.getState().isNearFinish).toBe(true);
          
          // Reset and test inside 50m (30m remaining) - visible
          tracker.reset(targetDistance);
          const inside50 = targetDistance - 30;
          tracker.update(1, inside50);
          expect(tracker.isNearFinish()).toBe(true);
          expect(tracker.getState().isNearFinish).toBe(true);
          
          // Reset and test at target (0m remaining) - not visible (level complete)
          tracker.reset(targetDistance);
          tracker.update(1, targetDistance);
          expect(tracker.isNearFinish()).toBe(false);
          expect(tracker.getState().isNearFinish).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 6: Finish Line Visibility - deactivates on completion**
   * **Validates: Requirements 3.1**
   * 
   * The finish line visibility should deactivate when the level is complete.
   */
  test('Property 6: Finish Line Visibility - deactivates on level completion', () => {
    fc.assert(
      fc.property(
        // Chapter number (1-100)
        fc.integer({ min: 1, max: 100 }),
        // Amount past target (0 to 50 meters)
        fc.float({ min: 0, max: 50, noNaN: true }),
        (chapterId, pastTarget) => {
          const targetDistance = chapterId * 100;
          const tracker = createDistanceTracker(targetDistance);
          
          // Travel past the target
          const distanceTraveled = targetDistance + pastTarget;
          tracker.update(1, distanceTraveled);
          
          // When level is complete (at or past target), finish line should not be visible
          expect(tracker.isNearFinish()).toBe(false);
          expect(tracker.getState().isNearFinish).toBe(false);
          expect(tracker.isLevelComplete()).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
