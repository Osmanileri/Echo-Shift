/**
 * Property-Based Tests for Progressive Speed Controller
 * Campaign Update v2.5
 * 
 * Tests for:
 * - Property 5: Progressive speed formula
 * - Property 7: Climax speed multiplier
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { calculateBaseSpeed } from '../data/levels';
import { DistanceState } from './distanceTracker';
import {
    applyClimaxMultiplier,
    calculateProgressiveSpeed,
    createSpeedController
} from './speedController';

describe('Speed Controller Properties - Campaign Update v2.5', () => {
  /**
   * **Feature: campaign-update-v25, Property 5: Progressive speed formula**
   * **Validates: Requirements 3.1**
   * 
   * For any distance/target ratio, the calculated speed SHALL equal
   * `baseSpeed * (1 + (currentDistance / targetDistance) * 0.3)`.
   */
  test('Property 5: Progressive speed formula', () => {
    fc.assert(
      fc.property(
        // Level number (1-100)
        fc.integer({ min: 1, max: 100 }),
        // Target distance (positive)
        fc.integer({ min: 100, max: 10000 }),
        // Progress ratio (0 to 1, before climax zone)
        fc.float({ min: 0, max: Math.fround(0.79), noNaN: true }),
        (level, targetDistance, progressRatio) => {
          const baseSpeed = calculateBaseSpeed(level);
          const currentDistance = targetDistance * progressRatio;
          
          // Calculate expected speed using the formula
          const expectedSpeed = baseSpeed * (1 + (currentDistance / targetDistance) * 0.3);
          
          // Calculate using the pure function
          const actualSpeed = calculateProgressiveSpeed(baseSpeed, currentDistance, targetDistance);
          
          // Speeds should match
          expect(actualSpeed).toBeCloseTo(expectedSpeed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 5: Progressive speed increases with distance**
   * **Validates: Requirements 3.1**
   * 
   * Speed should monotonically increase as distance increases.
   */
  test('Property 5: Progressive speed increases with distance', () => {
    fc.assert(
      fc.property(
        // Level number
        fc.integer({ min: 1, max: 100 }),
        // Target distance
        fc.integer({ min: 100, max: 10000 }),
        // Two progress ratios where ratio2 > ratio1
        fc.float({ min: 0, max: Math.fround(0.5), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.49), noNaN: true }),
        (level, targetDistance, ratio1, ratioDiff) => {
          const baseSpeed = calculateBaseSpeed(level);
          const ratio2 = ratio1 + ratioDiff;
          
          const distance1 = targetDistance * ratio1;
          const distance2 = targetDistance * ratio2;
          
          const speed1 = calculateProgressiveSpeed(baseSpeed, distance1, targetDistance);
          const speed2 = calculateProgressiveSpeed(baseSpeed, distance2, targetDistance);
          
          // Speed at higher distance should be greater
          expect(speed2).toBeGreaterThan(speed1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 5: Progressive speed at boundaries**
   * **Validates: Requirements 3.1**
   * 
   * At 0% progress, speed equals baseSpeed.
   * At 100% progress, speed equals baseSpeed * 1.3.
   */
  test('Property 5: Progressive speed at boundaries', () => {
    fc.assert(
      fc.property(
        // Level number
        fc.integer({ min: 1, max: 100 }),
        // Target distance
        fc.integer({ min: 100, max: 10000 }),
        (level, targetDistance) => {
          const baseSpeed = calculateBaseSpeed(level);
          
          // At 0% progress
          const speedAt0 = calculateProgressiveSpeed(baseSpeed, 0, targetDistance);
          expect(speedAt0).toBeCloseTo(baseSpeed, 5);
          
          // At 100% progress
          const speedAt100 = calculateProgressiveSpeed(baseSpeed, targetDistance, targetDistance);
          expect(speedAt100).toBeCloseTo(baseSpeed * 1.3, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 7: Climax speed multiplier**
   * **Validates: Requirements 3.2**
   * 
   * For any game state in climax zone, the final speed SHALL include
   * the 1.2x climax multiplier.
   */
  test('Property 7: Climax speed multiplier', () => {
    fc.assert(
      fc.property(
        // Progressive speed (positive)
        fc.float({ min: 10, max: 100, noNaN: true }),
        (progressiveSpeed) => {
          // When in climax zone with full transition
          const speedWithClimax = applyClimaxMultiplier(progressiveSpeed, true, 1);
          
          // Should be exactly 1.2x the progressive speed
          expect(speedWithClimax).toBeCloseTo(progressiveSpeed * 1.2, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 7: Climax multiplier not applied outside zone**
   * **Validates: Requirements 3.2**
   * 
   * When not in climax zone, speed should not include the multiplier.
   */
  test('Property 7: No climax multiplier outside zone', () => {
    fc.assert(
      fc.property(
        // Progressive speed (positive)
        fc.float({ min: 10, max: 100, noNaN: true }),
        (progressiveSpeed) => {
          // When not in climax zone
          const speedWithoutClimax = applyClimaxMultiplier(progressiveSpeed, false, 0);
          
          // Should equal the progressive speed unchanged
          expect(speedWithoutClimax).toBeCloseTo(progressiveSpeed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 7: Climax transition interpolation**
   * **Validates: Requirements 3.2, 3.3**
   * 
   * During transition, multiplier should interpolate between 1.0 and 1.2.
   */
  test('Property 7: Climax transition interpolation', () => {
    fc.assert(
      fc.property(
        // Progressive speed
        fc.float({ min: 10, max: 100, noNaN: true }),
        // Transition progress (0 to 1)
        fc.float({ min: 0, max: 1, noNaN: true }),
        (progressiveSpeed, transitionProgress) => {
          const speedDuringTransition = applyClimaxMultiplier(
            progressiveSpeed,
            true,
            transitionProgress
          );
          
          // Expected multiplier: 1.0 + (1.2 - 1.0) * transitionProgress
          const expectedMultiplier = 1.0 + 0.2 * transitionProgress;
          const expectedSpeed = progressiveSpeed * expectedMultiplier;
          
          expect(speedDuringTransition).toBeCloseTo(expectedSpeed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Speed Controller Integration', () => {
  /**
   * Test SpeedController class with DistanceState
   */
  test('SpeedController calculates correct speed with DistanceState', () => {
    fc.assert(
      fc.property(
        // Level number
        fc.integer({ min: 1, max: 100 }),
        // Target distance
        fc.integer({ min: 100, max: 10000 }),
        // Progress ratio (before climax)
        fc.float({ min: 0, max: Math.fround(0.79), noNaN: true }),
        (level, targetDistance, progressRatio) => {
          const controller = createSpeedController(level);
          const currentDistance = targetDistance * progressRatio;
          
          const distanceState: DistanceState = {
            currentDistance,
            targetDistance,
            progressPercent: progressRatio * 100,
            isInClimaxZone: false,
            isNearFinish: false,
          };
          
          const speed = controller.calculateSpeed(distanceState, level);
          const baseSpeed = calculateBaseSpeed(level);
          const expectedSpeed = baseSpeed * (1 + progressRatio * 0.3);
          
          expect(speed).toBeCloseTo(expectedSpeed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test SpeedController in climax zone with full transition
   */
  test('SpeedController applies climax multiplier in climax zone', () => {
    fc.assert(
      fc.property(
        // Level number
        fc.integer({ min: 1, max: 100 }),
        // Target distance
        fc.integer({ min: 100, max: 10000 }),
        // Progress ratio (in climax zone: 80-100%)
        fc.float({ min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true }),
        (level, targetDistance, progressRatio) => {
          const controller = createSpeedController(level);
          const currentDistance = targetDistance * progressRatio;
          
          const distanceState: DistanceState = {
            currentDistance,
            targetDistance,
            progressPercent: progressRatio * 100,
            isInClimaxZone: true,
            isNearFinish: progressRatio >= 0.95,
          };
          
          // Simulate full transition (500ms passed)
          controller.update(500, true);
          
          const speed = controller.calculateSpeed(distanceState, level);
          const baseSpeed = calculateBaseSpeed(level);
          const progressiveSpeed = baseSpeed * (1 + progressRatio * 0.3);
          const expectedSpeed = progressiveSpeed * 1.2;
          
          expect(speed).toBeCloseTo(expectedSpeed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test getConfig returns correct state
   */
  test('SpeedController getConfig returns correct state', () => {
    const controller = createSpeedController(10);
    const baseSpeed = calculateBaseSpeed(10);
    
    const distanceState: DistanceState = {
      currentDistance: 400,
      targetDistance: 1000,
      progressPercent: 40,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    
    const config = controller.getConfig(distanceState);
    
    expect(config.baseSpeed).toBe(baseSpeed);
    expect(config.progressiveMultiplier).toBeCloseTo(1 + 0.4 * 0.3, 5);
    expect(config.climaxMultiplier).toBe(1.0);
    expect(config.isInClimaxZone).toBe(false);
  });
});

describe('Speed Controller Edge Cases', () => {
  /**
   * Test with zero target distance
   */
  test('Handles zero target distance gracefully', () => {
    const baseSpeed = 10;
    const speed = calculateProgressiveSpeed(baseSpeed, 100, 0);
    expect(speed).toBe(baseSpeed);
  });

  /**
   * Test reset functionality
   */
  test('Reset clears transition state', () => {
    const controller = createSpeedController(10);
    
    // Simulate being in climax zone
    controller.update(500, true);
    
    // Reset
    controller.reset();
    
    const distanceState: DistanceState = {
      currentDistance: 900,
      targetDistance: 1000,
      progressPercent: 90,
      isInClimaxZone: true,
      isNearFinish: false,
    };
    
    // After reset, transition should start from 0
    const config = controller.getConfig(distanceState);
    expect(config.climaxTransitionProgress).toBe(0);
  });

  /**
   * Test smooth transition over time
   */
  test('Climax transition progresses smoothly over 500ms', () => {
    const controller = createSpeedController(10);
    
    // Update with 250ms (half transition)
    controller.update(250, true);
    
    const distanceState: DistanceState = {
      currentDistance: 900,
      targetDistance: 1000,
      progressPercent: 90,
      isInClimaxZone: true,
      isNearFinish: false,
    };
    
    const config = controller.getConfig(distanceState);
    expect(config.climaxTransitionProgress).toBeCloseTo(0.5, 2);
    expect(config.climaxMultiplier).toBeCloseTo(1.1, 2); // Halfway between 1.0 and 1.2
  });
});
