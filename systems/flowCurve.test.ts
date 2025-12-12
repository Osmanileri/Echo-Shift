/**
 * Property-Based Tests for Flow Curve System (Logarithmic Speed Progression)
 * Uses fast-check for property-based testing
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    calculateGameSpeed,
    DEFAULT_FLOW_CURVE_CONFIG,
    determinePhase,
    getFlowCurveState,
    PHASE_THRESHOLDS,
} from './flowCurve';

describe('Flow Curve System - Speed Formula Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property 1: Speed Formula Correctness**
   * **Validates: Requirements 1.2**
   *
   * For any score value >= 0, the calculated speed SHALL equal
   * MIN_SPEED + log10(score/100 + 1) * scaleFactor,
   * where the result is a valid number (not NaN or Infinity).
   */
  test('Speed formula calculates correctly for all valid scores', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        (score) => {
          const config = DEFAULT_FLOW_CURVE_CONFIG;
          const speed = calculateGameSpeed(score, config);
          
          // Calculate expected value using the formula
          const expected = config.minSpeed + 
            Math.log10(score / config.scoreBase + 1) * config.scaleFactor;
          const cappedExpected = Math.min(expected, config.maxSpeed);
          
          // Speed should be a valid finite number
          if (!Number.isFinite(speed)) return false;
          
          // Speed should match formula (with floating point tolerance)
          return Math.abs(speed - cappedExpected) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 1: Speed Formula Correctness (Monotonicity)**
   * **Validates: Requirements 1.2**
   *
   * For any two scores where score1 < score2, the calculated speed for score1
   * SHALL be less than or equal to the speed for score2 (monotonically increasing).
   */
  test('Speed increases monotonically with score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500000 }),
        fc.integer({ min: 1, max: 500000 }),
        (score1, delta) => {
          const score2 = score1 + delta;
          const speed1 = calculateGameSpeed(score1);
          const speed2 = calculateGameSpeed(score2);
          
          // Speed should be monotonically increasing (or equal at cap)
          return speed1 <= speed2;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 1: Speed Formula Correctness (Minimum Speed)**
   * **Validates: Requirements 1.1, 1.2**
   *
   * For any score value >= 0, the calculated speed SHALL be at least MIN_SPEED.
   */
  test('Speed is always at least MIN_SPEED', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        (score) => {
          const config = DEFAULT_FLOW_CURVE_CONFIG;
          const speed = calculateGameSpeed(score, config);
          
          return speed >= config.minSpeed;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Flow Curve System - Speed Cap Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property 2: Speed Cap Enforcement**
   * **Validates: Requirements 1.3**
   *
   * For any score value, the calculated speed SHALL never exceed MAX_SPEED (22 units).
   */
  test('Speed never exceeds MAX_SPEED', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }),
        (score) => {
          const config = DEFAULT_FLOW_CURVE_CONFIG;
          const speed = calculateGameSpeed(score, config);
          
          return speed <= config.maxSpeed;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 2: Speed Cap Enforcement (Very High Scores)**
   * **Validates: Requirements 1.3**
   *
   * For extremely high scores, the speed SHALL be capped at exactly MAX_SPEED.
   * Note: With slower progression config (scaleFactor: 2.5, scoreBase: 500),
   * we need much higher scores to reach the cap.
   */
  test('Very high scores result in MAX_SPEED cap', () => {
    fc.assert(
      fc.property(
        // Generate extremely high scores that would exceed cap
        // With new config: minSpeed=3, maxSpeed=14, scaleFactor=2.5, scoreBase=500
        // Formula: 3 + log10(score/500 + 1) * 2.5 = 14 => log10(score/500 + 1) = 4.4
        // score/500 + 1 = 10^4.4 ≈ 25119 => score ≈ 12,559,000
        fc.integer({ min: 50000000, max: 1000000000 }),
        (score) => {
          const config = DEFAULT_FLOW_CURVE_CONFIG;
          const speed = calculateGameSpeed(score, config);
          
          // At very high scores, speed should be exactly at the cap
          return speed === config.maxSpeed;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 2: Speed Cap Enforcement (Custom Config)**
   * **Validates: Requirements 1.3**
   *
   * For any custom maxSpeed configuration, the calculated speed SHALL never exceed it.
   */
  test('Speed respects custom maxSpeed configuration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 10, max: 50 }),
        (score, maxSpeed) => {
          const config = {
            ...DEFAULT_FLOW_CURVE_CONFIG,
            maxSpeed,
          };
          const speed = calculateGameSpeed(score, config);
          
          return speed <= maxSpeed;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Flow Curve System - Phase Determination Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property: Phase Determination Correctness**
   * **Validates: Requirements 1.4, 1.5, 1.6**
   *
   * For any score, the phase SHALL be correctly determined based on thresholds.
   */
  test('Phase is correctly determined based on score thresholds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (score) => {
          const phase = determinePhase(score);
          
          if (score < PHASE_THRESHOLDS.warmupEnd) {
            return phase === 'warmup';
          } else if (score < PHASE_THRESHOLDS.grooveEnd) {
            return phase === 'groove';
          } else {
            return phase === 'plateau';
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property: Warmup Phase Speed Progression**
   * **Validates: Requirements 1.4**
   *
   * During warmup phase (score < 500), speed SHALL increase gradually
   * and remain in a reasonable range for new players.
   */
  test('Warmup phase has gradual speed progression', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: PHASE_THRESHOLDS.warmupEnd - 1 }),
        (score) => {
          const config = DEFAULT_FLOW_CURVE_CONFIG;
          const speed = calculateGameSpeed(score, config);
          
          // During warmup, speed should be between MIN_SPEED and a reasonable upper bound
          // The formula at score 499 gives approximately 10.5, so we check it's below 11
          return speed >= config.minSpeed && speed < 11;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Flow Curve System - Edge Cases', () => {
  /**
   * Edge case: Score of 0 should return MIN_SPEED
   */
  test('Score of 0 returns MIN_SPEED', () => {
    const config = DEFAULT_FLOW_CURVE_CONFIG;
    const speed = calculateGameSpeed(0, config);
    
    expect(speed).toBe(config.minSpeed);
  });

  /**
   * Edge case: Negative scores should be treated as 0
   */
  test('Negative scores are treated as 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000000, max: -1 }),
        (negativeScore) => {
          const speedNegative = calculateGameSpeed(negativeScore);
          const speedZero = calculateGameSpeed(0);
          
          return speedNegative === speedZero;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: getFlowCurveState returns consistent speed and phase
   */
  test('getFlowCurveState returns consistent speed and phase', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (score) => {
          const state = getFlowCurveState(score);
          const expectedSpeed = calculateGameSpeed(score);
          const expectedPhase = determinePhase(score);
          
          return state.currentSpeed === expectedSpeed && state.phase === expectedPhase;
        }
      ),
      { numRuns: 100 }
    );
  });
});
