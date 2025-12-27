/**
 * Property-Based Tests for Progressive Speed Controller
 * Jetpack Joyride Style - Square root-based asymptotic acceleration
 * 
 * Tests for:
 * - Property 7: Speed Formula Correctness (sqrt-based)
 * - Property 8: Climax Speed Multiplier
 * 
 * **Validates: Requirements 4.2, 4.3, 4.4**
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { DistanceState } from './distanceTracker';
import {
  applyClimaxMultiplier,
  calculateDynamicSpeed,
  createSpeedController,
  isInClimaxZone
} from './speedController';

import { INITIAL_CONFIG } from '../constants';

/**
 * Default values from config (mobile-friendly)
 */
const DEFAULT_BASE_SPEED = INITIAL_CONFIG.baseSpeed;
const DEFAULT_CLIMAX_MULTIPLIER = 1.2;

describe('Speed Controller Properties - Jetpack Joyride Style', () => {
  /**
   * **Feature: jetpack-joyride-speed, Property 7: Speed Formula Correctness**
   * **Validates: Requirements 4.2**
   * 
   * For any progress value, the calculated speed SHALL equal
   * `baseSpeed + (baseSpeed × 0.5 × √(progress))`
   */
  test('Property 7: Sqrt Speed Formula Correctness', () => {
    fc.assert(
      fc.property(
        // Base speed (positive)
        fc.float({ min: 1, max: 20, noNaN: true }),
        // Target distance (positive)
        fc.float({ min: 100, max: 1000, noNaN: true }),
        // Progress ratio (0 to 1)
        fc.float({ min: 0, max: 1, noNaN: true }),
        (baseSpeed, targetDistance, progressRatio) => {
          const currentDistance = targetDistance * progressRatio;

          // Calculate expected speed using Jetpack Joyride formula
          const maxBonus = baseSpeed * 0.5;
          const expectedSpeed = baseSpeed + maxBonus * Math.sqrt(progressRatio);

          // Calculate using the pure function
          const actualSpeed = calculateDynamicSpeed(currentDistance, targetDistance, baseSpeed);

          // Speeds should match
          expect(actualSpeed).toBeCloseTo(expectedSpeed, 5);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });


  /**
   * **Feature: jetpack-joyride-speed, Property 7: Speed increases with distance**
   * **Validates: Requirements 4.3**
   * 
   * Speed should monotonically increase as distance increases.
   */
  test('Property 7: Speed increases with distance (monotonicity)', () => {
    fc.assert(
      fc.property(
        // Base speed
        fc.float({ min: 1, max: 20, noNaN: true }),
        // Target distance
        fc.float({ min: 100, max: 1000, noNaN: true }),
        // Two progress values where progress2 > progress1
        fc.float({ min: 0, max: Math.fround(0.5), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.5), noNaN: true }),
        (baseSpeed, targetDistance, progress1, progressDiff) => {
          const progress2 = Math.min(progress1 + progressDiff, 1.0);
          const distance1 = targetDistance * progress1;
          const distance2 = targetDistance * progress2;

          const speed1 = calculateDynamicSpeed(distance1, targetDistance, baseSpeed);
          const speed2 = calculateDynamicSpeed(distance2, targetDistance, baseSpeed);

          // Speed at higher distance should be greater
          expect(speed2).toBeGreaterThan(speed1);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: jetpack-joyride-speed, Property 7: Speed at zero distance equals base speed**
   * **Validates: Requirements 4.1, 4.2**
   * 
   * At 0 distance, sqrt(0) = 0, so speed = baseSpeed.
   */
  test('Property 7: Speed at zero distance equals base speed', () => {
    fc.assert(
      fc.property(
        // Base speed
        fc.float({ min: 1, max: 20, noNaN: true }),
        // Target distance
        fc.float({ min: 100, max: 1000, noNaN: true }),
        (baseSpeed, targetDistance) => {
          // At 0 distance, sqrt(0) = 0
          // So speed = baseSpeed + (maxBonus * 0) = baseSpeed
          const speedAt0 = calculateDynamicSpeed(0, targetDistance, baseSpeed);
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

describe('Speed Controller Integration - Jetpack Joyride Style', () => {
  /**
   * Test SpeedController class with DistanceState using sqrt formula
   */
  test('SpeedController calculates correct speed with sqrt formula', () => {
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

          // Expected: baseSpeed + (baseSpeed × 0.5 × √progress)
          const maxBonus = DEFAULT_BASE_SPEED * 0.5;
          const expectedSpeed = DEFAULT_BASE_SPEED + maxBonus * Math.sqrt(progressRatio);

          expect(speed).toBeCloseTo(expectedSpeed, 4);

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

          // Expected: (baseSpeed + maxBonus × √progress) × 1.2
          const maxBonus = DEFAULT_BASE_SPEED * 0.5;
          const sqrtSpeed = DEFAULT_BASE_SPEED + maxBonus * Math.sqrt(progressRatio);
          const expectedSpeed = sqrtSpeed * DEFAULT_CLIMAX_MULTIPLIER;

          expect(speed).toBeCloseTo(expectedSpeed, 4);

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
   * Test getConfig returns correct state with sqrt multiplier
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
    // progress = 100/500 = 0.2
    // sqrtMultiplier = 1 + 0.5 * sqrt(0.2) ≈ 1 + 0.5 * 0.447 ≈ 1.224
    const expectedMultiplier = 1 + 0.5 * Math.sqrt(100 / 500);
    expect(config.sqrtMultiplier).toBeCloseTo(expectedMultiplier, 5);
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
