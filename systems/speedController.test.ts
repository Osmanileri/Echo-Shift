/**
 * Property-Based Tests for Progressive Speed Controller
 * Campaign Chapter System
 * 
 * Tests for:
 * - Property 7: Speed Formula Correctness
 * - Property 8: Climax Speed Multiplier
 * 
 * **Validates: Requirements 4.2, 4.4**
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { DistanceState } from './distanceTracker';
import {
    applyClimaxMultiplier,
    calculateLogarithmicSpeed,
    createSpeedController,
    isInClimaxZone
} from './speedController';

import { INITIAL_CONFIG } from '../constants';

/**
 * Default values from config (mobile-friendly)
 */
const DEFAULT_BASE_SPEED = INITIAL_CONFIG.baseSpeed;
const DEFAULT_CLIMAX_MULTIPLIER = 1.2;

describe('Speed Controller Properties - Campaign Chapter System', () => {
  /**
   * **Feature: campaign-chapter-system, Property 7: Speed Formula Correctness**
   * **Validates: Requirements 4.2**
   * 
   * For any currentDistance value, the calculated speed SHALL equal
   * `baseSpeed × (1 + 0.3 × log(1 + currentDistance/50))`.
   */
  test('Property 7: Speed Formula Correctness', () => {
    fc.assert(
      fc.property(
        // Base speed (positive)
        fc.float({ min: 1, max: 20, noNaN: true }),
        // Current distance (0 to 1000 meters)
        fc.float({ min: 0, max: 1000, noNaN: true }),
        (baseSpeed, currentDistance) => {
          // Calculate expected speed using the formula from Requirements 4.2
          const expectedSpeed = baseSpeed * (1 + 0.3 * Math.log(1 + currentDistance / 50));
          
          // Calculate using the pure function
          const actualSpeed = calculateLogarithmicSpeed(baseSpeed, currentDistance);
          
          // Speeds should match
          expect(actualSpeed).toBeCloseTo(expectedSpeed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 7: Speed increases with distance**
   * **Validates: Requirements 4.3**
   * 
   * Speed should monotonically increase as distance increases.
   */
  test('Property 7: Speed increases with distance (monotonicity)', () => {
    fc.assert(
      fc.property(
        // Base speed
        fc.float({ min: 1, max: 20, noNaN: true }),
        // Two distances where distance2 > distance1
        fc.float({ min: 0, max: 500, noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: 500, noNaN: true }),
        (baseSpeed, distance1, distanceDiff) => {
          const distance2 = distance1 + distanceDiff;
          
          const speed1 = calculateLogarithmicSpeed(baseSpeed, distance1);
          const speed2 = calculateLogarithmicSpeed(baseSpeed, distance2);
          
          // Speed at higher distance should be greater
          expect(speed2).toBeGreaterThan(speed1);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 7: Speed at zero distance equals base speed**
   * **Validates: Requirements 4.1, 4.2**
   * 
   * At 0 distance, speed equals baseSpeed (since log(1) = 0).
   */
  test('Property 7: Speed at zero distance equals base speed', () => {
    fc.assert(
      fc.property(
        // Base speed
        fc.float({ min: 1, max: 20, noNaN: true }),
        (baseSpeed) => {
          // At 0 distance, log(1 + 0/50) = log(1) = 0
          // So speed = baseSpeed * (1 + 0.3 * 0) = baseSpeed
          const speedAt0 = calculateLogarithmicSpeed(baseSpeed, 0);
          expect(speedAt0).toBeCloseTo(baseSpeed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 8: Climax Speed Multiplier**
   * **Validates: Requirements 4.4**
   * 
   * For any game state in climax zone (final 20%), the final speed SHALL include
   * the 1.2x climax multiplier.
   */
  test('Property 8: Climax Speed Multiplier', () => {
    fc.assert(
      fc.property(
        // Speed value (positive)
        fc.float({ min: 5, max: 100, noNaN: true }),
        (speed) => {
          // When in climax zone with full transition
          const speedWithClimax = applyClimaxMultiplier(speed, true, 1);
          
          // Should be exactly 1.2x the input speed
          expect(speedWithClimax).toBeCloseTo(speed * DEFAULT_CLIMAX_MULTIPLIER, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 8: No climax multiplier outside zone**
   * **Validates: Requirements 4.4**
   * 
   * When not in climax zone, speed should not include the multiplier.
   */
  test('Property 8: No climax multiplier outside zone', () => {
    fc.assert(
      fc.property(
        // Speed value (positive)
        fc.float({ min: 5, max: 100, noNaN: true }),
        (speed) => {
          // When not in climax zone
          const speedWithoutClimax = applyClimaxMultiplier(speed, false, 0);
          
          // Should equal the input speed unchanged
          expect(speedWithoutClimax).toBeCloseTo(speed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 8: Climax zone detection**
   * **Validates: Requirements 4.4**
   * 
   * Climax zone is the final 20% of target distance (progress >= 80%).
   */
  test('Property 8: Climax zone detection at 80% threshold', () => {
    fc.assert(
      fc.property(
        // Target distance (positive)
        fc.integer({ min: 100, max: 10000 }),
        // Progress ratio
        fc.float({ min: 0, max: 1, noNaN: true }),
        (targetDistance, progressRatio) => {
          const currentDistance = targetDistance * progressRatio;
          const inClimax = isInClimaxZone(currentDistance, targetDistance);
          
          // Should be in climax zone if progress >= 80%
          if (progressRatio >= 0.8) {
            expect(inClimax).toBe(true);
          } else {
            expect(inClimax).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 8: Climax transition interpolation**
   * **Validates: Requirements 4.4**
   * 
   * During transition, multiplier should interpolate between 1.0 and 1.2.
   */
  test('Property 8: Climax transition interpolation', () => {
    fc.assert(
      fc.property(
        // Speed value
        fc.float({ min: 5, max: 100, noNaN: true }),
        // Transition progress (0 to 1)
        fc.float({ min: 0, max: 1, noNaN: true }),
        (speed, transitionProgress) => {
          const speedDuringTransition = applyClimaxMultiplier(
            speed,
            true,
            transitionProgress
          );
          
          // Expected multiplier: 1.0 + (1.2 - 1.0) * transitionProgress
          const expectedMultiplier = 1.0 + 0.2 * transitionProgress;
          const expectedSpeed = speed * expectedMultiplier;
          
          expect(speedDuringTransition).toBeCloseTo(expectedSpeed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Speed Controller Integration - Campaign Chapter System', () => {
  /**
   * Test SpeedController class with DistanceState using logarithmic formula
   */
  test('SpeedController calculates correct speed with logarithmic formula', () => {
    fc.assert(
      fc.property(
        // Target distance
        fc.integer({ min: 100, max: 10000 }),
        // Progress ratio (before climax)
        fc.float({ min: 0, max: Math.fround(0.79), noNaN: true }),
        (targetDistance, progressRatio) => {
          const controller = createSpeedController();
          const currentDistance = targetDistance * progressRatio;
          
          const distanceState: DistanceState = {
            currentDistance,
            targetDistance,
            progressPercent: progressRatio * 100,
            isInClimaxZone: false,
            isNearFinish: false,
          };
          
          const speed = controller.calculateSpeed(distanceState);
          
          // Expected: baseSpeed × (1 + 0.3 × log(1 + distance/50))
          const expectedSpeed = DEFAULT_BASE_SPEED * (1 + 0.3 * Math.log(1 + currentDistance / 50));
          
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
        // Target distance
        fc.integer({ min: 100, max: 10000 }),
        // Progress ratio (in climax zone: 80-100%)
        fc.float({ min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true }),
        (targetDistance, progressRatio) => {
          const controller = createSpeedController();
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
          
          const speed = controller.calculateSpeed(distanceState);
          
          // Expected: baseSpeed × (1 + 0.3 × log(1 + distance/50)) × 1.2
          const logarithmicSpeed = DEFAULT_BASE_SPEED * (1 + 0.3 * Math.log(1 + currentDistance / 50));
          const expectedSpeed = logarithmicSpeed * DEFAULT_CLIMAX_MULTIPLIER;
          
          expect(speed).toBeCloseTo(expectedSpeed, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that base speed is always 5 at chapter start
   * Requirements: 4.1, 4.5
   */
  test('SpeedController resets to base speed 5 at chapter start', () => {
    const controller = createSpeedController();
    
    expect(controller.getBaseSpeed()).toBe(DEFAULT_BASE_SPEED);
    
    // Re-initialize for a new chapter
    controller.initialize();
    
    expect(controller.getBaseSpeed()).toBe(DEFAULT_BASE_SPEED);
  });

  /**
   * Test getConfig returns correct state with logarithmic multiplier
   */
  test('SpeedController getConfig returns correct state', () => {
    const controller = createSpeedController();
    
    const distanceState: DistanceState = {
      currentDistance: 100,
      targetDistance: 500,
      progressPercent: 20,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    
    const config = controller.getConfig(distanceState);
    
    expect(config.baseSpeed).toBe(DEFAULT_BASE_SPEED);
    // log(1 + 100/50) = log(3) ≈ 1.0986
    // multiplier = 1 + 0.3 * 1.0986 ≈ 1.3296
    const expectedMultiplier = 1 + 0.3 * Math.log(1 + 100 / 50);
    expect(config.logarithmicMultiplier).toBeCloseTo(expectedMultiplier, 5);
    expect(config.climaxMultiplier).toBe(1.0);
    expect(config.isInClimaxZone).toBe(false);
  });
});

describe('Speed Controller Edge Cases', () => {
  /**
   * Test with zero target distance for climax zone check
   */
  test('Handles zero target distance gracefully for climax zone', () => {
    const inClimax = isInClimaxZone(100, 0);
    expect(inClimax).toBe(false);
  });

  /**
   * Test reset functionality
   */
  test('Reset clears transition state', () => {
    const controller = createSpeedController();
    
    // Simulate being in climax zone
    controller.update(500, true);
    
    // Reset
    controller.reset();
    
    const distanceState: DistanceState = {
      currentDistance: 450,
      targetDistance: 500,
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
    const controller = createSpeedController();
    
    // Update with 250ms (half transition)
    controller.update(250, true);
    
    const distanceState: DistanceState = {
      currentDistance: 450,
      targetDistance: 500,
      progressPercent: 90,
      isInClimaxZone: true,
      isNearFinish: false,
    };
    
    const config = controller.getConfig(distanceState);
    expect(config.climaxTransitionProgress).toBeCloseTo(0.5, 2);
    expect(config.climaxMultiplier).toBeCloseTo(1.1, 2); // Halfway between 1.0 and 1.2
  });

  /**
   * Test that speed at distance 0 equals base speed
   */
  test('Speed at distance 0 equals base speed', () => {
    const controller = createSpeedController();
    
    const distanceState: DistanceState = {
      currentDistance: 0,
      targetDistance: 500,
      progressPercent: 0,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    
    const speed = controller.calculateSpeed(distanceState);
    expect(speed).toBe(DEFAULT_BASE_SPEED);
  });
});
