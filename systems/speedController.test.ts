/**
 * Property-Based Tests for Absolute-Distance Speed Controller
 *
 * Two-layer system:
 *   1. Target ceiling: speed(d) = 1.0 + 0.12×min(√d,10) + 0.10×max(0, √d−10)
 *   2. Linear ramp: currentSpeed += ACCELERATION_RATE per second (clamped to ceiling)
 *
 * Tests for:
 * - speedFromDistance pure function (ceiling)
 * - Zone detection (CRUISE / CLIMAX)
 * - Linear acceleration ramp behaviour
 * - Climax zone: 1.15× boost in final 20%
 * - Speed monotonically increases with distance
 * - Speed cap at MAX_ALLOWED_SPEED
 * - SpeedController class integration
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { DistanceState } from './distanceTracker';
import {
  applyClimaxMultiplier,
  calculateDynamicSpeed,
  createSpeedController,
  getSpeedZone,
  isInClimaxZone,
  SPEED_CONSTANTS,
  speedFromDistance,
} from './SpeedController';

const BASE_START = SPEED_CONSTANTS.BASE_START;        // 1.0
const INITIAL_SLOPE = SPEED_CONSTANTS.INITIAL_SLOPE;  // 0.12
const CRUISE_SLOPE = SPEED_CONSTANTS.CRUISE_SLOPE;    // 0.10
const CLIMAX_MULT = SPEED_CONSTANTS.CLIMAX_MULTIPLIER; // 1.15
const MAX_SPEED = SPEED_CONSTANTS.MAX_ALLOWED_SPEED;  // 6.5

// ============================================================================
// Pure Formula: speedFromDistance
// ============================================================================
describe('speedFromDistance — two-slope piecewise √d', () => {
  test('At 0m, speed = BASE_START', () => {
    expect(speedFromDistance(0)).toBe(BASE_START);
  });

  test('At 100m, speed = 2.2 (initial slope: 1.0 + 0.12×10)', () => {
    expect(speedFromDistance(100)).toBeCloseTo(2.2, 5);
  });

  test('At 400m, speed = 3.2 (1.0 + 0.12×10 + 0.10×10)', () => {
    expect(speedFromDistance(400)).toBeCloseTo(3.2, 5);
  });

  test('At 900m, speed = 4.2 (1.0 + 1.2 + 0.10×20)', () => {
    expect(speedFromDistance(900)).toBeCloseTo(4.2, 5);
  });

  test('At 1600m, speed = 5.2 (1.0 + 1.2 + 0.10×30)', () => {
    expect(speedFromDistance(1600)).toBeCloseTo(5.2, 5);
  });

  test('Monotonically increases with distance', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 5000, noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: 500, noNaN: true }),
        (d, delta) => {
          const s1 = speedFromDistance(d);
          const s2 = speedFromDistance(d + delta);
          expect(s2).toBeGreaterThanOrEqual(s1);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Negative distance → returns BASE_START', () => {
    expect(speedFromDistance(-10)).toBe(BASE_START);
    expect(speedFromDistance(-1000)).toBe(BASE_START);
  });
});

// ============================================================================
// Zone Detection
// ============================================================================
describe('Speed Zone Detection (CRUISE / CLIMAX)', () => {
  test('progress < 0.80 → CRUISE', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(0.7999), noNaN: true }),
        (progress) => {
          expect(getSpeedZone(progress)).toBe('CRUISE');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('progress ≥ 0.80 → CLIMAX', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.80), max: 1, noNaN: true }),
        (progress) => {
          expect(getSpeedZone(progress)).toBe('CLIMAX');
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// calculateDynamicSpeed (Pure Function)
// ============================================================================
describe('calculateDynamicSpeed — absolute distance formula', () => {
  test('At 0m, speed = BASE_START (regardless of target)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 5000, noNaN: true }),
        (target) => {
          const speed = calculateDynamicSpeed(0, target);
          expect(speed).toBeCloseTo(BASE_START, 5);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Same absolute distance → same speed regardless of target (before climax)', () => {
    // At 50m, we should get the same speed whether target is 100m or 1000m
    // (as long as 50m is not in the climax zone of either)
    const dist = 50;
    const speed1 = calculateDynamicSpeed(dist, 500);   // 50/500=10% → CRUISE
    const speed2 = calculateDynamicSpeed(dist, 1000);  // 50/1000=5% → CRUISE
    const speed3 = calculateDynamicSpeed(dist, 5000);  // 50/5000=1% → CRUISE
    expect(speed1).toBeCloseTo(speed2, 5);
    expect(speed2).toBeCloseTo(speed3, 5);
  });

  test('In climax zone, speed gets 1.15× multiplier', () => {
    // 90m with target 100m → 90% progress → CLIMAX
    const dist = 90;
    const target = 100;
    const rawSpeed = speedFromDistance(dist);
    const climaxSpeed = calculateDynamicSpeed(dist, target);
    expect(climaxSpeed).toBeCloseTo(rawSpeed * CLIMAX_MULT, 4);
  });

  test('Speed monotonically increases as distance grows (fixed target)', () => {
    const target = 500;
    let prevSpeed = 0;
    for (let d = 0; d <= target; d += 10) {
      const speed = calculateDynamicSpeed(d, target);
      expect(speed).toBeGreaterThanOrEqual(prevSpeed);
      prevSpeed = speed;
    }
  });

  test('Speed never exceeds MAX_ALLOWED_SPEED', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100000, noNaN: true }),
        fc.float({ min: 100, max: 100000, noNaN: true }),
        (d, target) => {
          const speed = calculateDynamicSpeed(d, target);
          expect(speed).toBeLessThanOrEqual(MAX_SPEED);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Climax Multiplier (Pure)
// ============================================================================
describe('Climax Multiplier', () => {
  test('applyClimaxMultiplier returns 1.15× when fully transitioned', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 100, noNaN: true }),
        (speed) => {
          const result = applyClimaxMultiplier(speed, true, 1);
          expect(result).toBeCloseTo(speed * CLIMAX_MULT, 5);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('applyClimaxMultiplier returns unchanged speed outside zone', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 100, noNaN: true }),
        (speed) => {
          const result = applyClimaxMultiplier(speed, false, 0);
          expect(result).toBeCloseTo(speed, 5);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('Climax transition interpolates linearly', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (speed, t) => {
          const result = applyClimaxMultiplier(speed, true, t);
          const expected = speed * (1 + (CLIMAX_MULT - 1) * t);
          expect(result).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Climax Zone Detection
// ============================================================================
describe('Climax Zone Detection', () => {
  test('Climax zone at 80% threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (targetDistance, progress) => {
          const current = targetDistance * progress;
          const result = isInClimaxZone(current, targetDistance);
          if (progress >= SPEED_CONSTANTS.CLIMAX_ZONE_START) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Zero target → never in climax', () => {
    expect(isInClimaxZone(100, 0)).toBe(false);
  });
});

// ============================================================================
// SpeedController Integration
// ============================================================================
/**
 * Integration tests use two strategies:
 *   - "instant" controller: accelerationRate = 999999 → ramp is effectively instant.
 *     Lets us test ceiling values without worrying about ramp time.
 *   - Default controller: tests linear ramp behaviour explicitly.
 */

/** Create a controller where the ramp reaches ceiling instantly (single update tick) */
function createInstantController() {
  return createSpeedController(undefined, { accelerationRate: 999999 });
}

/** Helper: single update tick to fill ramp */
function tickInstant(ctrl: ReturnType<typeof createSpeedController>, isClimaxZone = false) {
  ctrl.update(16, isClimaxZone); // 16ms frame — with rate 999999, adds ~16000 speed
}

describe('SpeedController Integration — Absolute Distance', () => {
  test('At distance 0, speed = BASE_START', () => {
    const controller = createInstantController();
    tickInstant(controller);
    const ds: DistanceState = {
      currentDistance: 0,
      targetDistance: 500,
      progressPercent: 0,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    const speed = controller.calculateSpeed(ds);
    expect(speed).toBeCloseTo(BASE_START, 4);
  });

  test('At 100m, speed = 2.2 (no climax) — instant ramp', () => {
    const controller = createInstantController();
    tickInstant(controller);
    const ds: DistanceState = {
      currentDistance: 100,
      targetDistance: 500,
      progressPercent: 20,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    const speed = controller.calculateSpeed(ds);
    expect(speed).toBeCloseTo(2.2, 4);
  });

  test('Same distance → same speed regardless of level parameter', () => {
    const controller = createInstantController();
    tickInstant(controller);
    const ds: DistanceState = {
      currentDistance: 200,
      targetDistance: 500,
      progressPercent: 40,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    const speedL1 = controller.calculateSpeed(ds, 1);
    const speedL10 = controller.calculateSpeed(ds, 10);
    const speedL50 = controller.calculateSpeed(ds, 50);
    expect(speedL1).toBeCloseTo(speedL10, 8);
    expect(speedL10).toBeCloseTo(speedL50, 8);
  });

  test('In climax zone with full transition, speed gets 1.15× boost', () => {
    const controller = createInstantController();
    tickInstant(controller, true);
    controller.update(500, true); // Full climax transition

    const ds: DistanceState = {
      currentDistance: 90,
      targetDistance: 100,
      progressPercent: 90,
      isInClimaxZone: true,
      isNearFinish: true,
    };
    const speed = controller.calculateSpeed(ds);
    const rawSpeed = speedFromDistance(90);
    expect(speed).toBeCloseTo(rawSpeed * CLIMAX_MULT, 2);
  });

  test('Speed never exceeds MAX_ALLOWED_SPEED', () => {
    const controller = createInstantController();
    tickInstant(controller, true);
    controller.update(500, true);
    const ds: DistanceState = {
      currentDistance: 10000,
      targetDistance: 10000,
      progressPercent: 100,
      isInClimaxZone: true,
      isNearFinish: true,
    };
    const speed = controller.calculateSpeed(ds, 100);
    expect(speed).toBeLessThanOrEqual(MAX_SPEED);
  });

  test('Reset clears transition state and resets currentSpeed', () => {
    const controller = createInstantController();
    tickInstant(controller, true);
    controller.update(500, true);
    controller.reset();

    expect(controller.getCurrentSpeed()).toBe(BASE_START);
    const ds: DistanceState = {
      currentDistance: 450,
      targetDistance: 500,
      progressPercent: 90,
      isInClimaxZone: true,
      isNearFinish: false,
    };
    const config = controller.getConfig(ds);
    expect(config.climaxTransitionProgress).toBe(0);
  });

  test('getConfig returns correct zone info', () => {
    const controller = createInstantController();
    tickInstant(controller);
    const ds: DistanceState = {
      currentDistance: 50,
      targetDistance: 500,
      progressPercent: 10,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    const config = controller.getConfig(ds);
    expect(config.zone).toBe('CRUISE');
    expect(config.progressPercent).toBeCloseTo(10, 1);
  });

  test('Climax transition progresses smoothly over 500ms', () => {
    const controller = createInstantController();
    controller.update(250, true); // Half transition

    const ds: DistanceState = {
      currentDistance: 450,
      targetDistance: 500,
      progressPercent: 90,
      isInClimaxZone: true,
      isNearFinish: false,
    };
    const config = controller.getConfig(ds);
    expect(config.climaxTransitionProgress).toBeCloseTo(0.5, 2);
  });

  test('getZoneState returns valid SpeedZoneState', () => {
    const controller = createInstantController();
    tickInstant(controller);
    const ds: DistanceState = {
      currentDistance: 200,
      targetDistance: 500,
      progressPercent: 40,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    const zs = controller.getZoneState(ds);
    expect(zs.zone).toBe('CRUISE');
    expect(zs.zoneProgress).toBeGreaterThanOrEqual(0);
    expect(zs.zoneProgress).toBeLessThanOrEqual(1);
    expect(zs.rawSpeed).toBeCloseTo(speedFromDistance(200), 4);
    expect(zs.finalSpeed).toBeGreaterThan(0);
  });

  test('SpeedController base speed is BASE_START', () => {
    const controller = createSpeedController();
    expect(controller.getBaseSpeed()).toBe(BASE_START);
    controller.initialize();
    expect(controller.getBaseSpeed()).toBe(BASE_START);
  });

  test('Speed at same distance is identical across different level targets', () => {
    const controller = createInstantController();
    tickInstant(controller);
    const dsLevel5 = { currentDistance: 200, targetDistance: 500, progressPercent: 40, isInClimaxZone: false, isNearFinish: false };

    const rawSpeedAtDist200 = speedFromDistance(200);
    const speed5 = controller.calculateSpeed(dsLevel5);
    expect(speed5).toBeCloseTo(rawSpeedAtDist200, 4);
  });
});

// ============================================================================
// Linear Acceleration Ramp — New Tests
// ============================================================================
describe('Linear Acceleration Ramp', () => {
  test('Before any update(), speed is BASE_START regardless of distance', () => {
    const controller = createSpeedController();
    // No update() call — currentSpeed stays at BASE_START
    const ds: DistanceState = {
      currentDistance: 1000,
      targetDistance: 2000,
      progressPercent: 50,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    const speed = controller.calculateSpeed(ds);
    expect(speed).toBe(BASE_START);
  });

  test('Speed ramps linearly with update() calls', () => {
    const controller = createSpeedController(); // default rate: 0.05/s
    // After 10 seconds: currentSpeed = 1.0 + 0.05 * 10 = 1.5
    controller.update(10_000, false);
    const ds: DistanceState = {
      currentDistance: 500, // ceiling ≈ 3.2
      targetDistance: 1000,
      progressPercent: 50,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    const speed = controller.calculateSpeed(ds);
    expect(speed).toBeCloseTo(1.5, 4);
  });

  test('Speed never exceeds ceiling from speedFromDistance', () => {
    const controller = createSpeedController(undefined, { accelerationRate: 10 }); // fast ramp
    controller.update(10_000, false); // Would go to 1.0 + 10*10 = 101, but ceiling caps it
    const ds: DistanceState = {
      currentDistance: 100,
      targetDistance: 500,
      progressPercent: 20,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    const speed = controller.calculateSpeed(ds);
    // Capped by ceiling: speedFromDistance(100) = 2.2
    expect(speed).toBeCloseTo(2.2, 4);
  });

  test('Accumulates over multiple update() calls', () => {
    const controller = createSpeedController(); // 0.05/s
    // 5 frames of 1000ms = 5 seconds total → 1.0 + 0.05×5 = 1.25
    for (let i = 0; i < 5; i++) {
      controller.update(1000, false);
    }
    const ds: DistanceState = {
      currentDistance: 500, // ceiling ≈ 3.2
      targetDistance: 1000,
      progressPercent: 50,
      isInClimaxZone: false,
      isNearFinish: false,
    };
    const speed = controller.calculateSpeed(ds);
    expect(speed).toBeCloseTo(1.25, 4);
  });

  test('initialize() resets ramp to BASE_START', () => {
    const controller = createSpeedController();
    controller.update(50_000, false); // ramp up a lot
    controller.initialize();
    expect(controller.getCurrentSpeed()).toBe(BASE_START);
  });

  test('reset() resets ramp to BASE_START', () => {
    const controller = createSpeedController();
    controller.update(50_000, false);
    controller.reset();
    expect(controller.getCurrentSpeed()).toBe(BASE_START);
  });

  test('getCurrentSpeed() reflects accumulated ramp', () => {
    const controller = createSpeedController(); // 0.05/s
    controller.update(25_000, false); // 1.0 + 0.05×25 = 2.25
    expect(controller.getCurrentSpeed()).toBeCloseTo(2.25, 4);
  });
});
