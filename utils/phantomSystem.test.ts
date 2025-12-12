/**
 * Property-Based Tests for Phantom Obstacle System
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculatePhantomOpacity,
  getEffectiveOpacity,
  calculatePhantomSpawnProbability,
  shouldSpawnAsPhantom,
  calculatePhantomBonus,
  PhantomConfig,
} from './phantomSystem';
import { PHANTOM_CONFIG } from '../constants';

describe('Phantom System Properties', () => {
  /**
   * **Feature: advanced-game-mechanics, Property 26: Phantom activation threshold**
   * **Validates: Requirements 5.1**
   *
   * For any score value, phantom obstacle spawning SHALL be disabled when 
   * score ≤ 500 and enabled when score > 500.
   */
  test('phantom spawning is disabled at or below activation score and enabled above', () => {
    fc.assert(
      fc.property(
        // Score: 0 to 10000 (covers both below and above activation threshold)
        fc.integer({ min: 0, max: 10000 }),
        (score) => {
          const config: PhantomConfig = {
            ...PHANTOM_CONFIG,
            activationScore: 500,
          };
          
          const probability = calculatePhantomSpawnProbability(score, config);
          
          // Property: score <= 500 => probability = 0 (disabled)
          // Property: score > 500 => probability > 0 (enabled)
          if (score <= config.activationScore) {
            expect(probability).toBe(0);
          } else {
            expect(probability).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 27: Phantom opacity formula correctness**
   * **Validates: Requirements 5.3**
   *
   * For any phantom obstacle with currentX, initialX, and revealDistance,
   * calculatePhantomOpacity SHALL return max(0, min(1, (currentX - revealDistance) / (initialX - revealDistance))).
   */
  test('opacity formula returns correct value for all positions', () => {
    fc.assert(
      fc.property(
        // currentX: 0 to canvas width (obstacle moves from right to left)
        fc.integer({ min: 0, max: 1200 }),
        // initialX: spawn position (typically canvas width, must be > revealDistance)
        fc.integer({ min: 400, max: 1200 }),
        // revealDistance: distance at which obstacle becomes fully visible
        fc.integer({ min: 100, max: 350 }),
        (currentX, initialX, revealDistance) => {
          // Ensure initialX > revealDistance to avoid division by zero edge case
          if (initialX <= revealDistance) {
            // This edge case returns 1 (fully visible) - test separately
            const opacity = calculatePhantomOpacity(currentX, initialX, revealDistance);
            expect(opacity).toBe(1);
            return;
          }
          
          const opacity = calculatePhantomOpacity(currentX, initialX, revealDistance);
          
          // Expected formula from Requirements 5.3
          const expected = Math.max(0, Math.min(1, 
            (currentX - revealDistance) / (initialX - revealDistance)
          ));
          
          expect(opacity).toBeCloseTo(expected, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 28: Minimum opacity threshold**
   * **Validates: Requirements 5.4**
   *
   * For any calculated opacity value, getEffectiveOpacity SHALL return 
   * max(minOpacity, calculatedOpacity) where minOpacity = 0.05, ensuring 
   * phantom obstacles always have a visible "ghost" outline.
   */
  test('effective opacity never falls below minimum threshold', () => {
    fc.assert(
      fc.property(
        // calculatedOpacity: any value from 0 to 1
        fc.double({ min: 0, max: 1, noNaN: true }),
        // minOpacity: the minimum threshold (typically 0.05)
        fc.double({ min: 0.01, max: 0.1, noNaN: true }),
        (calculatedOpacity, minOpacity) => {
          const effectiveOpacity = getEffectiveOpacity(calculatedOpacity, minOpacity);
          
          // Property: effectiveOpacity = max(minOpacity, calculatedOpacity)
          const expected = Math.max(minOpacity, calculatedOpacity);
          expect(effectiveOpacity).toBeCloseTo(expected, 10);
          
          // Effective opacity should never be below minOpacity
          expect(effectiveOpacity).toBeGreaterThanOrEqual(minOpacity);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 29: Phantom spawn probability formula**
   * **Validates: Requirements 5.8, 5.11**
   *
   * For any score > 500, calculatePhantomSpawnProbability SHALL return 
   * min(0.40, 0.10 + 0.30 × (score - 500) / 4500).
   */
  test('spawn probability follows formula for all scores above activation', () => {
    fc.assert(
      fc.property(
        // Score: above activation threshold (501 to 10000)
        fc.integer({ min: 501, max: 10000 }),
        (score) => {
          const config: PhantomConfig = {
            activationScore: 500,
            revealDistance: 300,
            baseSpawnProbability: 0.10,
            maxSpawnProbability: 0.40,
            probabilityMaxScore: 5000,
            minOpacity: 0.05,
            bonusPoints: 20,
            nearMissMultiplier: 2,
          };
          
          const probability = calculatePhantomSpawnProbability(score, config);
          
          // Expected formula from Requirements 5.8
          // P = min(0.40, 0.10 + 0.30 × (Score - 500) / 4500)
          const expected = Math.min(0.40, 0.10 + 0.30 * (score - 500) / 4500);
          
          expect(probability).toBeCloseTo(expected, 10);
          
          // Probability should never exceed max (Requirements 5.11)
          expect(probability).toBeLessThanOrEqual(0.40);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-game-mechanics, Property 30: Phantom bonus calculation**
   * **Validates: Requirements 5.7, 5.10**
   *
   * For any phantom obstacle pass without near miss, calculatePhantomBonus SHALL 
   * return 20 points; with near miss, it SHALL return 40 points (20 × 2).
   */
  test('phantom bonus calculation returns correct values', () => {
    fc.assert(
      fc.property(
        // isNearMiss: whether the pass was a near miss
        fc.boolean(),
        (isNearMiss) => {
          const config: PhantomConfig = {
            activationScore: 500,
            revealDistance: 300,
            baseSpawnProbability: 0.10,
            maxSpawnProbability: 0.40,
            probabilityMaxScore: 5000,
            minOpacity: 0.05,
            bonusPoints: 20,
            nearMissMultiplier: 2,
          };
          
          const bonus = calculatePhantomBonus(isNearMiss, config);
          
          // Property: normal pass = 20 points, near miss = 40 points (20 × 2)
          if (isNearMiss) {
            expect(bonus).toBe(config.bonusPoints * config.nearMissMultiplier); // 40
          } else {
            expect(bonus).toBe(config.bonusPoints); // 20
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
