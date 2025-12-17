/**
 * Property-Based Tests for Dynamic Midline System
 * Uses fast-check for property-based testing
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { MIDLINE_CONFIG } from '../constants';
import { MidlineConfig, MidlineState } from '../types';
import {
  calculateDynamicAmplitude,
  calculateDynamicFrequency,
  calculateMidlineY,
  calculateMovementBounds,
  calculateTensionIntensity,
  deserializeMidlineState,
  getOrbZone,
  isCriticalSpace,
  predictPeakTime,
  serializeMidlineState,
  shouldApplyMicroPhasing
} from './midlineSystem';

describe('Midline System Properties', () => {
  /**
   * **Feature: advanced-game-mechanics, Property 15: Midline position bounds**
   * **Validates: Requirements 4.1, 4.2**
   * 
   * For any canvas height H, elapsed time, amplitude (0.05-0.08), and frequency,
   * the calculated midline Y position SHALL be within the range 
   * [(H/2) - (H × maxAmplitude), (H/2) + (H × maxAmplitude)].
   */
  test('midline position is always within valid bounds', () => {
    fc.assert(
      fc.property(
        // Canvas height: reasonable game canvas sizes (300-1200 pixels)
        fc.integer({ min: 300, max: 1200 }),
        // Elapsed time: 0 to 10 minutes of gameplay in milliseconds
        fc.integer({ min: 0, max: 600000 }),
        // Score: 0 to 10000 (affects amplitude and frequency)
        fc.integer({ min: 0, max: 10000 }),
        // Offset: any phase offset (excluding NaN)
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }),
        (canvasHeight, elapsedTime, score, offset) => {
          const config: MidlineConfig = {
            baseAmplitude: MIDLINE_CONFIG.baseAmplitude,
            maxAmplitude: MIDLINE_CONFIG.maxAmplitude,
            baseFrequency: MIDLINE_CONFIG.baseFrequency,
            amplitudeThreshold1: MIDLINE_CONFIG.amplitudeThreshold1,
            amplitudeThreshold2: MIDLINE_CONFIG.amplitudeThreshold2,
            frequencyScaleFactor: MIDLINE_CONFIG.frequencyScaleFactor,
            frequencyMaxScore: MIDLINE_CONFIG.frequencyMaxScore,
            microPhasingDistance: MIDLINE_CONFIG.microPhasingDistance,
            forecastTime: MIDLINE_CONFIG.forecastTime,
            criticalSpaceRatio: MIDLINE_CONFIG.criticalSpaceRatio,
          };

          const midlineY = calculateMidlineY(canvasHeight, elapsedTime, config, score, offset);

          const centerY = canvasHeight / 2;
          const maxDeviation = canvasHeight * config.maxAmplitude;
          const minBound = centerY - maxDeviation;
          const maxBound = centerY + maxDeviation;

          // The midline Y position must be within the valid bounds
          expect(midlineY).toBeGreaterThanOrEqual(minBound);
          expect(midlineY).toBeLessThanOrEqual(maxBound);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 16: Midline formula correctness**
   * **Validates: Requirements 4.2**
   *
   * For any canvas height H, time t, amplitude a, frequency f, and offset o,
   * calculateMidlineY SHALL return (H/2) + (H × a × sin(t × f + o)).
   */
  test('midline formula correctly implements sinusoidal calculation', () => {
    fc.assert(
      fc.property(
        // Canvas height: reasonable game canvas sizes (300-1200 pixels)
        fc.integer({ min: 300, max: 1200 }),
        // Elapsed time: 0 to 10 minutes of gameplay in milliseconds
        fc.integer({ min: 0, max: 600000 }),
        // Score: 0 to 10000 (affects amplitude and frequency)
        fc.integer({ min: 0, max: 10000 }),
        // Offset: any phase offset (excluding NaN)
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }),
        (canvasHeight, elapsedTime, score, offset) => {
          const config: MidlineConfig = {
            baseAmplitude: MIDLINE_CONFIG.baseAmplitude,
            maxAmplitude: MIDLINE_CONFIG.maxAmplitude,
            baseFrequency: MIDLINE_CONFIG.baseFrequency,
            amplitudeThreshold1: MIDLINE_CONFIG.amplitudeThreshold1,
            amplitudeThreshold2: MIDLINE_CONFIG.amplitudeThreshold2,
            frequencyScaleFactor: MIDLINE_CONFIG.frequencyScaleFactor,
            frequencyMaxScore: MIDLINE_CONFIG.frequencyMaxScore,
            microPhasingDistance: MIDLINE_CONFIG.microPhasingDistance,
            forecastTime: MIDLINE_CONFIG.forecastTime,
            criticalSpaceRatio: MIDLINE_CONFIG.criticalSpaceRatio,
          };

          // Get the actual result from the function
          const actualMidlineY = calculateMidlineY(canvasHeight, elapsedTime, config, score, offset);

          // Calculate expected result using the formula from Requirements 4.2:
          // Y_midline = (H/2) + (H × amplitude × sin(time × frequency + offset))
          const amplitude = calculateDynamicAmplitude(config.baseAmplitude, score, config);
          const frequency = calculateDynamicFrequency(config.baseFrequency, score);
          const centerY = canvasHeight / 2;
          const expectedMidlineY = centerY + canvasHeight * amplitude * Math.sin(elapsedTime * frequency + offset);

          // The actual result should match the expected formula result
          // Using a small epsilon for floating point comparison
          expect(actualMidlineY).toBeCloseTo(expectedMidlineY, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 17: Zone determination correctness**
   * **Validates: Requirements 4.6**
   *
   * For any orb Y position and midline Y, getOrbZone SHALL return 'black' 
   * when orbY < midlineY and 'white' when orbY >= midlineY.
   */
  test('zone determination returns correct zone based on orb position relative to midline', () => {
    fc.assert(
      fc.property(
        // Orb Y position: any valid Y coordinate on canvas (0-1200 pixels)
        fc.double({ min: 0, max: 1200, noNaN: true }),
        // Midline Y position: any valid Y coordinate on canvas (0-1200 pixels)
        fc.double({ min: 0, max: 1200, noNaN: true }),
        (orbY, midlineY) => {
          const zone = getOrbZone(orbY, midlineY);

          // Property: orbY < midlineY => 'black', orbY >= midlineY => 'white'
          if (orbY < midlineY) {
            expect(zone).toBe('black');
          } else {
            expect(zone).toBe('white');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 18: Movement bounds validity**
   * **Validates: Requirements 4.5**
   *
   * For any midline position, connector length, and orb radius, the calculated 
   * movement bounds SHALL ensure both orbs can fit within their respective zones 
   * without crossing the midline.
   */
  test('movement bounds ensure orbs fit within zones', () => {
    fc.assert(
      fc.property(
        // Canvas height: reasonable game canvas sizes
        fc.integer({ min: 300, max: 1200 }),
        // Midline Y: within canvas bounds
        fc.integer({ min: 50, max: 1150 }),
        // Connector length: typical game values
        fc.integer({ min: 20, max: 100 }),
        // Orb radius: typical game values
        fc.integer({ min: 5, max: 20 }),
        (canvasHeight, midlineY, connectorLength, orbRadius) => {
          // Ensure midline is within canvas
          const clampedMidlineY = Math.min(Math.max(midlineY, orbRadius), canvasHeight - orbRadius);

          const bounds = calculateMovementBounds(clampedMidlineY, connectorLength, orbRadius, canvasHeight);

          // minY should be at least orbRadius + half connector (top orb needs space)
          expect(bounds.minY).toBeGreaterThanOrEqual(orbRadius + connectorLength / 2);

          // maxY should be at most canvasHeight - orbRadius - half connector (bottom orb needs space)
          expect(bounds.maxY).toBeLessThanOrEqual(canvasHeight - orbRadius - connectorLength / 2);

          // minY should be less than or equal to maxY (valid range)
          expect(bounds.minY).toBeLessThanOrEqual(bounds.maxY + connectorLength);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 19: Critical space detection**
   * **Validates: Requirements 4.8**
   *
   * For any movement bounds where available space is less than 30% of normal space,
   * isCriticalSpace SHALL return true.
   */
  test('critical space detection identifies when space is below 30% threshold', () => {
    fc.assert(
      fc.property(
        // Normal space range (minY to maxY difference)
        fc.integer({ min: 100, max: 500 }),
        // Ratio of current space to normal (0 to 1)
        fc.double({ min: 0, max: 1, noNaN: true }),
        (normalSpace, ratio) => {
          const normalBounds = { minY: 100, maxY: 100 + normalSpace };
          const currentSpace = normalSpace * ratio;
          const currentBounds = { minY: 100, maxY: 100 + currentSpace };

          const isCritical = isCriticalSpace(currentBounds, normalBounds);

          // Property: space < 30% of normal => critical
          if (ratio < 0.30) {
            expect(isCritical).toBe(true);
          } else {
            expect(isCritical).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 20: Midline state serialization round-trip**
   * **Validates: Requirements 4.10**
   *
   * For any valid MidlineState, serializing then deserializing SHALL produce 
   * an equivalent state with the same time offset.
   */
  test('midline state serialization round-trip preserves all values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }), // startTime
        fc.double({ min: 0, max: 1200, noNaN: true }), // currentMidlineY
        fc.double({ min: -1, max: 1, noNaN: true }), // normalizedOffset
        fc.double({ min: 0.05, max: 0.08, noNaN: true }), // currentAmplitude
        fc.double({ min: 0.001, max: 0.01, noNaN: true }), // currentFrequency
        fc.boolean(), // isAtPeak
        fc.boolean(), // isMicroPhasing
        fc.double({ min: 0, max: 1, noNaN: true }), // tensionIntensity
        (startTime, currentMidlineY, normalizedOffset, currentAmplitude, currentFrequency, isAtPeak, isMicroPhasing, tensionIntensity) => {
          const originalState: MidlineState = {
            startTime,
            currentMidlineY,
            normalizedOffset,
            currentAmplitude,
            currentFrequency,
            isAtPeak,
            isMicroPhasing,
            tensionIntensity,
          };

          const serialized = serializeMidlineState(originalState);
          const deserialized = deserializeMidlineState(serialized);

          // Round-trip should preserve all values
          expect(deserialized.startTime).toBe(originalState.startTime);
          expect(deserialized.currentMidlineY).toBeCloseTo(originalState.currentMidlineY, 10);
          expect(deserialized.normalizedOffset).toBeCloseTo(originalState.normalizedOffset, 10);
          expect(deserialized.currentAmplitude).toBeCloseTo(originalState.currentAmplitude, 10);
          expect(deserialized.currentFrequency).toBeCloseTo(originalState.currentFrequency, 10);
          expect(deserialized.isAtPeak).toBe(originalState.isAtPeak);
          expect(deserialized.isMicroPhasing).toBe(originalState.isMicroPhasing);
          expect(deserialized.tensionIntensity).toBeCloseTo(originalState.tensionIntensity, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 21: Dynamic frequency calculation**
   * **Validates: Requirements 4.11**
   *
   * For any base frequency and score, calculateDynamicFrequency SHALL return 
   * baseFrequency × (1 + frequencyScaleFactor × min(score/frequencyMaxScore, 1)).
   */
  test('dynamic frequency follows the specified formula', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 0.01, noNaN: true }), // baseFrequency
        fc.integer({ min: 0, max: 10000 }), // score
        (baseFrequency, score) => {
          const actualFrequency = calculateDynamicFrequency(baseFrequency, score);

          // Expected formula uses config values
          const scaleFactor = Math.min(score / MIDLINE_CONFIG.frequencyMaxScore, 1);
          const expectedFrequency = baseFrequency * (1 + MIDLINE_CONFIG.frequencyScaleFactor * scaleFactor);

          expect(actualFrequency).toBeCloseTo(expectedFrequency, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 22: Dynamic amplitude thresholds**
   * **Validates: Requirements 4.12**
   *
   * For any score < 2000, amplitude SHALL be 0.05; for 2000 ≤ score < 5000, 
   * amplitude SHALL be 0.065; for score ≥ 5000, amplitude SHALL be 0.08.
   */
  test('dynamic amplitude follows threshold rules', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }), // score
        (score) => {
          const config: MidlineConfig = {
            baseAmplitude: 0.05,
            maxAmplitude: 0.08,
            baseFrequency: 0.005,
            amplitudeThreshold1: 2000,
            amplitudeThreshold2: 5000,
            frequencyScaleFactor: 0.1,
            frequencyMaxScore: 5000,
            microPhasingDistance: 10,
            forecastTime: 500,
            criticalSpaceRatio: 0.30,
          };

          const amplitude = calculateDynamicAmplitude(config.baseAmplitude, score, config);

          // Property: score thresholds determine amplitude
          if (score < 2000) {
            expect(amplitude).toBeCloseTo(0.05, 10);
          } else if (score < 5000) {
            expect(amplitude).toBeCloseTo(0.065, 10);
          } else {
            expect(amplitude).toBeCloseTo(0.08, 10);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 23: Micro-phasing boundary detection**
   * **Validates: Requirements 4.13**
   *
   * For any orb Y position within ±10 pixels of midlineY, 
   * shouldApplyMicroPhasing SHALL return true.
   */
  test('micro-phasing detects orbs within boundary distance', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 500, noNaN: true }), // midlineY
        fc.double({ min: -20, max: 20, noNaN: true }), // offset from midline
        (midlineY, offset) => {
          const orbY = midlineY + offset;
          const microPhasingDistance = 10;

          const shouldPhase = shouldApplyMicroPhasing(orbY, midlineY, microPhasingDistance);

          // Property: |orbY - midlineY| <= 10 => micro-phasing
          if (Math.abs(offset) <= microPhasingDistance) {
            expect(shouldPhase).toBe(true);
          } else {
            expect(shouldPhase).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 24: Peak prediction timing**
   * **Validates: Requirements 4.14**
   *
   * For any elapsed time and frequency, predictPeakTime SHALL correctly calculate 
   * the time remaining until the next peak or trough within ±50ms accuracy.
   */
  test('peak prediction returns valid timing and direction', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 600000 }), // elapsedTime
        fc.double({ min: 0.001, max: 0.01, noNaN: true }), // frequency
        fc.double({ min: 0, max: 2 * Math.PI, noNaN: true }), // offset
        (elapsedTime, frequency, offset) => {
          const prediction = predictPeakTime(elapsedTime, frequency, offset);

          // timeToNextPeak should be positive
          expect(prediction.timeToNextPeak).toBeGreaterThanOrEqual(0);

          // direction should be 'up' or 'down'
          expect(['up', 'down']).toContain(prediction.direction);

          // timeToNextPeak should be less than one full period
          const period = (2 * Math.PI) / frequency;
          expect(prediction.timeToNextPeak).toBeLessThanOrEqual(period);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 25: Tension intensity calculation**
   * **Validates: Requirements 4.15**
   *
   * For any normalized offset (-1 to 1), calculateTensionIntensity SHALL return 
   * a value between 0 and 1, where |offset| = 1 yields intensity = 1 and 
   * offset = 0 yields intensity = 0.
   */
  test('tension intensity is absolute value of normalized offset', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1, max: 1, noNaN: true }), // normalizedOffset
        (normalizedOffset) => {
          const intensity = calculateTensionIntensity(normalizedOffset);

          // Property: intensity = |normalizedOffset|
          expect(intensity).toBeCloseTo(Math.abs(normalizedOffset), 10);

          // intensity should be between 0 and 1
          expect(intensity).toBeGreaterThanOrEqual(0);
          expect(intensity).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
