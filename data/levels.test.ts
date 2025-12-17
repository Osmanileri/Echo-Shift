/**
 * Property-Based Tests for Level Configuration
 * Campaign Update v2.5
 * 
 * Tests for:
 * - Property 1: Target distance formula correctness
 * - Property 8: Base speed formula
 * - Property 15: Obstacle density formula
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    calculateBaseSpeed,
    calculateObstacleDensity,
    calculateTargetDistance,
    getLevelById
} from './levels';

describe('Level Configuration Properties - Campaign Update v2.5', () => {
  /**
   * **Feature: campaign-chapter-system, Property 1: Target Distance Formula**
   * **Validates: Requirements 1.1**
   * 
   * For any chapter number N (where N >= 1), the target distance SHALL equal N × 100 meters.
   */
  test('Property 1: Target distance formula correctness', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const calculated = calculateTargetDistance(level);
          const expected = level * 100;
          
          // Verify formula: level × 100
          expect(calculated).toBe(expected);
          
          // Verify distance is always positive
          expect(calculated).toBeGreaterThan(0);
          
          // Verify distance increases with level
          if (level > 1) {
            const previousDistance = calculateTargetDistance(level - 1);
            expect(calculated).toBeGreaterThan(previousDistance);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 8: Base speed formula**
   * **Validates: Requirements 3.4**
   * 
   * Super mobile-friendly speed progression:
   * Level 1-10: 1 (super slow intro for mobile)
   * Level 11-30: 1.2 + ((level - 10) * 0.08) = 1.28 to 2.8
   * Level 31+: 2.8 + ((level - 30) * 0.05)
   */
  test('Property 8: Base speed formula', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const calculated = calculateBaseSpeed(level);
          
          // Level 1-10: Super slow intro speed for mobile
          if (level <= 10) {
            expect(calculated).toBe(1);
          } else if (level <= 30) {
            // Level 11-30: Gradual increase
            const expected = 1.2 + ((level - 10) * 0.08);
            expect(calculated).toBeCloseTo(expected, 10);
          } else {
            // Level 31+: Very slow progression
            const expected = 2.8 + ((level - 30) * 0.05);
            expect(calculated).toBeCloseTo(expected, 10);
          }
          
          // Verify speed is always positive
          expect(calculated).toBeGreaterThan(0);
          
          // Verify speed increases with level (level 11+)
          if (level > 11) {
            const previousSpeed = calculateBaseSpeed(level - 1);
            expect(calculated).toBeGreaterThan(previousSpeed);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 15: Obstacle density formula**
   * **Validates: Requirements 5.4**
   * 
   * For any level number, obstacle density SHALL equal `min(1.0, 0.5 + (level * 0.02))`.
   */
  test('Property 15: Obstacle density formula', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (level) => {
          const calculated = calculateObstacleDensity(level);
          const expected = Math.min(1.0, 0.5 + (level * 0.02));
          
          // Verify formula is correctly implemented
          expect(calculated).toBeCloseTo(expected, 10);
          
          // Verify density is within valid range [0.5, 1.0]
          expect(calculated).toBeGreaterThanOrEqual(0.5);
          expect(calculated).toBeLessThanOrEqual(1.0);
          
          // Verify density increases with level (until cap)
          if (level > 1 && calculated < 1.0) {
            const previousDensity = calculateObstacleDensity(level - 1);
            expect(calculated).toBeGreaterThan(previousDensity);
          }
          
          // Verify cap at level 25 (0.5 + 25 * 0.02 = 1.0)
          if (level >= 25) {
            expect(calculated).toBe(1.0);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Integration test: Verify LEVELS array has correct values
   */
  test('LEVELS array contains correct calculated values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (levelId) => {
          const level = getLevelById(levelId);
          
          expect(level).toBeDefined();
          if (!level) return false;
          
          // Verify targetDistance matches formula
          expect(level.targetDistance).toBeCloseTo(
            calculateTargetDistance(levelId),
            10
          );
          
          // Verify baseSpeed matches formula
          expect(level.baseSpeed).toBeCloseTo(
            calculateBaseSpeed(levelId),
            10
          );
          
          // Verify obstacleDensity matches formula
          expect(level.obstacleDensity).toBeCloseTo(
            calculateObstacleDensity(levelId),
            10
          );
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Chapter Assignment Properties - Campaign Update v2.5', () => {
  /**
   * **Feature: campaign-update-v25, Property 13: Chapter assignment**
   * **Validates: Requirements 5.1**
   * 
   * For any level ID, the chapter SHALL be correctly assigned:
   * SUB_BASS (1-10), BASS (11-20), MID (21-30), HIGH (31-40), PRESENCE (41-50).
   */
  test('Property 13: Chapter assignment', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (levelId) => {
          const level = getLevelById(levelId);
          expect(level).toBeDefined();
          if (!level) return false;
          
          const chapter = level.chapter;
          
          // Verify chapter assignment based on level ranges
          if (levelId >= 1 && levelId <= 10) {
            expect(chapter).toBe('SUB_BASS');
          } else if (levelId >= 11 && levelId <= 20) {
            expect(chapter).toBe('BASS');
          } else if (levelId >= 21 && levelId <= 30) {
            expect(chapter).toBe('MID');
          } else if (levelId >= 31 && levelId <= 40) {
            expect(chapter).toBe('HIGH');
          } else if (levelId >= 41 && levelId <= 100) {
            expect(chapter).toBe('PRESENCE');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 14: Moving obstacles introduction**
   * **Validates: Requirements 5.3**
   * 
   * For any level >= 21 (Chapter 3: MID), the mechanics.movingObstacles flag SHALL be true.
   */
  test('Property 14: Moving obstacles introduction', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (levelId) => {
          const level = getLevelById(levelId);
          expect(level).toBeDefined();
          if (!level) return false;
          
          const hasMovingObstacles = level.mechanics.movingObstacles;
          
          // Moving obstacles should be enabled for level 21+ (MID chapter and beyond)
          if (levelId >= 21) {
            expect(hasMovingObstacles).toBe(true);
          } else {
            expect(hasMovingObstacles).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Verify chapter boundaries are correct
   */
  test('Chapter boundaries are correctly defined', () => {
    // Test boundary levels
    const boundaries = [
      { level: 1, expected: 'SUB_BASS' },
      { level: 10, expected: 'SUB_BASS' },
      { level: 11, expected: 'BASS' },
      { level: 20, expected: 'BASS' },
      { level: 21, expected: 'MID' },
      { level: 30, expected: 'MID' },
      { level: 31, expected: 'HIGH' },
      { level: 40, expected: 'HIGH' },
      { level: 41, expected: 'PRESENCE' },
      { level: 50, expected: 'PRESENCE' },
      { level: 100, expected: 'PRESENCE' },
    ];
    
    for (const { level, expected } of boundaries) {
      const levelConfig = getLevelById(level);
      expect(levelConfig).toBeDefined();
      expect(levelConfig?.chapter).toBe(expected);
    }
  });
});
