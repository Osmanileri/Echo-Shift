/**
 * Property-Based Tests for Level System (Sync Rate Progression)
 * Uses fast-check for property-based testing
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.2, 5.3, 5.4
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    calculateCumulativeXP,
    calculateDailyReward,
    calculateLevelFromXP,
    calculateRequiredXP,
    getLevelInfo,
    MAX_LEVEL,
} from './levelSystem';

describe('Level System - XP Calculation Properties', () => {
  /**
   * **Feature: progression-system, Property 1: XP Calculation Formula Correctness**
   * **Validates: Requirements 4.2**
   *
   * For any level L where L >= 1, the required XP should equal exactly
   * Math.floor(100 * Math.pow(L, 1.5))
   */
  test('XP formula calculates correctly for all valid levels', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_LEVEL }),
        (level) => {
          const xp = calculateRequiredXP(level);
          const expected = Math.floor(100 * Math.pow(level, 1.5));
          
          return xp === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 1: XP Calculation Formula Correctness (Monotonicity)**
   * **Validates: Requirements 4.2**
   *
   * For any two levels where level1 < level2, the required XP for level1
   * should be less than the required XP for level2 (strictly increasing).
   */
  test('Required XP increases strictly with level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_LEVEL - 1 }),
        (level) => {
          const xp1 = calculateRequiredXP(level);
          const xp2 = calculateRequiredXP(level + 1);
          
          return xp1 < xp2;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 1: XP Calculation Formula Correctness (Edge Cases)**
   * **Validates: Requirements 4.2**
   *
   * For levels below 1, the function should return 0.
   */
  test('Levels below 1 return 0 XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 0 }),
        (level) => {
          const xp = calculateRequiredXP(level);
          return xp === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Level System - Level Calculation Properties', () => {
  /**
   * **Feature: progression-system, Property 2: Level Calculation from XP**
   * **Validates: Requirements 4.1, 4.3**
   *
   * For any total XP value, calculating the level and then calculating
   * the cumulative XP for that level should produce a threshold less than
   * or equal to the total XP, and the threshold for level+1 should be
   * greater than total XP.
   */
  test('Level calculation satisfies XP bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        (totalXP) => {
          const level = calculateLevelFromXP(totalXP);
          const cumulativeForLevel = calculateCumulativeXP(level);
          const cumulativeForNextLevel = calculateCumulativeXP(level + 1);
          
          // Current level threshold should be <= totalXP
          const lowerBoundOk = cumulativeForLevel <= totalXP;
          
          // Next level threshold should be > totalXP (unless at max level)
          const upperBoundOk = level >= MAX_LEVEL || cumulativeForNextLevel > totalXP;
          
          return lowerBoundOk && upperBoundOk;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 2: Level Calculation from XP (Monotonicity)**
   * **Validates: Requirements 4.1, 4.3**
   *
   * For any two XP values where xp1 < xp2, the level for xp1 should be
   * less than or equal to the level for xp2.
   */
  test('Level increases monotonically with XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500000 }),
        fc.integer({ min: 1, max: 500000 }),
        (xp1, delta) => {
          const xp2 = xp1 + delta;
          const level1 = calculateLevelFromXP(xp1);
          const level2 = calculateLevelFromXP(xp2);
          
          return level1 <= level2;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 2: Level Calculation from XP (Bounds)**
   * **Validates: Requirements 4.1, 4.3**
   *
   * Level should always be between 1 and MAX_LEVEL.
   */
  test('Level is always within valid bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 10000000 }),
        (totalXP) => {
          const level = calculateLevelFromXP(totalXP);
          return level >= 1 && level <= MAX_LEVEL;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 2: Level Calculation from XP (Zero XP)**
   * **Validates: Requirements 4.1**
   *
   * Zero XP should result in level 1.
   */
  test('Zero XP results in level 1', () => {
    const level = calculateLevelFromXP(0);
    expect(level).toBe(1);
  });
});

describe('Level System - LevelInfo Properties', () => {
  /**
   * **Feature: progression-system, Property: LevelInfo Consistency**
   * **Validates: Requirements 4.4**
   *
   * getLevelInfo should return consistent data with calculateLevelFromXP.
   */
  test('LevelInfo is consistent with level calculation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        (totalXP) => {
          const info = getLevelInfo(totalXP);
          const expectedLevel = calculateLevelFromXP(totalXP);
          
          return info.level === expectedLevel && info.currentXP === totalXP;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property: Progress is Valid**
   * **Validates: Requirements 4.4**
   *
   * Progress should always be between 0 and 1.
   */
  test('Progress is always between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        (totalXP) => {
          const info = getLevelInfo(totalXP);
          return info.progress >= 0 && info.progress <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Level System - Daily Reward Properties', () => {
  /**
   * **Feature: progression-system, Property 3: Daily Reward Calculation**
   * **Validates: Requirements 5.2, 5.3, 5.4**
   *
   * For any level L, the daily reward should follow the tiered formula:
   * - Level 1-9: 100 + 10*L
   * - Level 10-49: 200 + 8*(L-10)
   * - Level 50+: 600 + 5*(L-50)
   */
  test('Daily reward follows tiered formula for levels 1-9', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        (level) => {
          const reward = calculateDailyReward(level);
          const expected = 100 + 10 * level;
          return reward === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Daily reward follows tiered formula for levels 10-49', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 49 }),
        (level) => {
          const reward = calculateDailyReward(level);
          const expected = 200 + 8 * (level - 10);
          return reward === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Daily reward follows tiered formula for levels 50+', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: MAX_LEVEL }),
        (level) => {
          const reward = calculateDailyReward(level);
          const expected = 600 + 5 * (level - 50);
          return reward === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 3: Daily Reward Calculation (Monotonicity)**
   * **Validates: Requirements 5.2, 5.3, 5.4**
   *
   * Daily reward should increase with level (non-decreasing).
   */
  test('Daily reward increases with level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_LEVEL - 1 }),
        (level) => {
          const reward1 = calculateDailyReward(level);
          const reward2 = calculateDailyReward(level + 1);
          return reward1 <= reward2;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 3: Daily Reward Calculation (Tier Boundaries)**
   * **Validates: Requirements 5.2, 5.3, 5.4**
   *
   * Verify tier boundary values are correct.
   */
  test('Tier boundary values are correct', () => {
    // Level 9 (end of tier 1): 100 + 10*9 = 190
    expect(calculateDailyReward(9)).toBe(190);
    
    // Level 10 (start of tier 2): 200 + 8*0 = 200
    expect(calculateDailyReward(10)).toBe(200);
    
    // Level 49 (end of tier 2): 200 + 8*39 = 512
    expect(calculateDailyReward(49)).toBe(512);
    
    // Level 50 (start of tier 3): 600 + 5*0 = 600
    expect(calculateDailyReward(50)).toBe(600);
  });
});
