/**
 * Property-Based Tests for Daily Challenge System
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  generateChallenge, 
  generateSeedFromDate,
  DailyChallengeConfig,
} from './dailyChallenge';

describe('Daily Challenge System Properties', () => {
  /**
   * **Feature: echo-shift-professionalization, Property 9: Daily Challenge Determinism**
   * **Validates: Requirements 8.1, 8.5**
   *
   * For any date, generating the daily challenge multiple times SHALL produce
   * identical challenge parameters.
   */
  test('generateChallenge produces identical results for the same date', () => {
    // Generator for valid dates using day offsets from a base date
    const dateArb = fc.integer({ min: 0, max: 3650 }).map(dayOffset => {
      const baseDate = new Date('2020-01-01');
      const result = new Date(baseDate);
      result.setDate(baseDate.getDate() + dayOffset);
      return result;
    });

    fc.assert(
      fc.property(
        dateArb,
        (date) => {
          // Generate challenge multiple times for the same date
          const challenge1 = generateChallenge(date);
          const challenge2 = generateChallenge(date);
          const challenge3 = generateChallenge(date);
          
          // All challenges should be identical
          const seedsMatch = 
            challenge1.seed === challenge2.seed && 
            challenge2.seed === challenge3.seed;
          
          const datesMatch = 
            challenge1.date === challenge2.date && 
            challenge2.date === challenge3.date;
          
          const modifiersMatch = 
            challenge1.modifiers.speedBoost === challenge2.modifiers.speedBoost &&
            challenge2.modifiers.speedBoost === challenge3.modifiers.speedBoost &&
            challenge1.modifiers.phantomOnly === challenge2.modifiers.phantomOnly &&
            challenge2.modifiers.phantomOnly === challenge3.modifiers.phantomOnly &&
            challenge1.modifiers.invertedControls === challenge2.modifiers.invertedControls &&
            challenge2.modifiers.invertedControls === challenge3.modifiers.invertedControls &&
            challenge1.modifiers.noMidline === challenge2.modifiers.noMidline &&
            challenge2.modifiers.noMidline === challenge3.modifiers.noMidline &&
            challenge1.modifiers.doubleObstacles === challenge2.modifiers.doubleObstacles &&
            challenge2.modifiers.doubleObstacles === challenge3.modifiers.doubleObstacles;
          
          const bonusMatch = 
            challenge1.bonusMultiplier === challenge2.bonusMultiplier && 
            challenge2.bonusMultiplier === challenge3.bonusMultiplier;
          
          const nameMatch = 
            challenge1.challengeName === challenge2.challengeName && 
            challenge2.challengeName === challenge3.challengeName;
          
          const descriptionMatch = 
            challenge1.description === challenge2.description && 
            challenge2.description === challenge3.description;
          
          return seedsMatch && datesMatch && modifiersMatch && 
                 bonusMatch && nameMatch && descriptionMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 9: Daily Challenge Determinism**
   * **Validates: Requirements 8.1, 8.5**
   *
   * Different dates should produce different seeds (with high probability).
   */
  test('different dates produce different seeds', () => {
    // Generator for two different day offsets from a base date
    const differentDaysArb = fc.tuple(
      fc.integer({ min: 0, max: 3650 }),  // Day offset 1 (up to 10 years)
      fc.integer({ min: 0, max: 3650 })   // Day offset 2 (up to 10 years)
    ).filter(([day1, day2]) => day1 !== day2);

    fc.assert(
      fc.property(
        differentDaysArb,
        ([dayOffset1, dayOffset2]) => {
          const baseDate = new Date('2020-01-01');
          
          const date1 = new Date(baseDate);
          date1.setDate(baseDate.getDate() + dayOffset1);
          
          const date2 = new Date(baseDate);
          date2.setDate(baseDate.getDate() + dayOffset2);
          
          const challenge1 = generateChallenge(date1);
          const challenge2 = generateChallenge(date2);
          
          // Different dates should produce different seeds
          return challenge1.seed !== challenge2.seed;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 9: Daily Challenge Determinism**
   * **Validates: Requirements 8.1, 8.5**
   *
   * The seed generation from date string is deterministic.
   */
  test('generateSeedFromDate is deterministic for any date string', () => {
    // Generator for date strings in YYYY-MM-DD format using day offsets
    const dateStringArb = fc.integer({ min: 0, max: 3650 }).map(dayOffset => {
      const baseDate = new Date('2020-01-01');
      const result = new Date(baseDate);
      result.setDate(baseDate.getDate() + dayOffset);
      return result.toISOString().split('T')[0];
    });

    fc.assert(
      fc.property(
        dateStringArb,
        (dateStr) => {
          const seed1 = generateSeedFromDate(dateStr);
          const seed2 = generateSeedFromDate(dateStr);
          const seed3 = generateSeedFromDate(dateStr);
          
          // All seeds should be identical
          return seed1 === seed2 && seed2 === seed3;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 9: Daily Challenge Determinism**
   * **Validates: Requirements 8.1, 8.5**
   *
   * Challenge modifiers are within valid bounds.
   */
  test('challenge modifiers are within valid bounds', () => {
    // Generator for valid dates using day offsets from a base date
    const dateArb = fc.integer({ min: 0, max: 3650 }).map(dayOffset => {
      const baseDate = new Date('2020-01-01');
      const result = new Date(baseDate);
      result.setDate(baseDate.getDate() + dayOffset);
      return result;
    });

    fc.assert(
      fc.property(
        dateArb,
        (date) => {
          const challenge = generateChallenge(date);
          
          // Speed boost should be between 0.8 and 1.5
          const validSpeedBoost = 
            challenge.modifiers.speedBoost >= 0.8 && 
            challenge.modifiers.speedBoost <= 1.5;
          
          // Bonus multiplier should be between 1.5 and 3.0
          const validBonusMultiplier = 
            challenge.bonusMultiplier >= 1.5 && 
            challenge.bonusMultiplier <= 3.0;
          
          // Boolean modifiers should be actual booleans
          const validBooleans = 
            typeof challenge.modifiers.phantomOnly === 'boolean' &&
            typeof challenge.modifiers.invertedControls === 'boolean' &&
            typeof challenge.modifiers.noMidline === 'boolean' &&
            typeof challenge.modifiers.doubleObstacles === 'boolean';
          
          // Challenge name and description should be non-empty strings
          const validStrings = 
            typeof challenge.challengeName === 'string' && 
            challenge.challengeName.length > 0 &&
            typeof challenge.description === 'string' && 
            challenge.description.length > 0;
          
          return validSpeedBoost && validBonusMultiplier && validBooleans && validStrings;
        }
      ),
      { numRuns: 100 }
    );
  });
});
