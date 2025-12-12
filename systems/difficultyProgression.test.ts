/**
 * Property-Based Tests for Difficulty Progression System
 * Uses fast-check for property-based testing
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { PATTERNS } from '../data/patterns';
import {
    DIFFICULTY_THRESHOLDS,
    getAvailablePatterns,
    getCurrentDifficultyThreshold,
    getWeightSum,
    hasProgressiveWeights,
    isPatternAvailable,
    isValidWeightDistribution,
    selectPatternByWeight,
} from './difficultyProgression';

describe('Difficulty Progression System - Pattern Availability Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property 10: Pattern Availability by Score**
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
   *
   * For any score value, the available patterns SHALL include only patterns
   * whose difficulty threshold has been reached:
   * - score < 1000: only 'basic' patterns
   * - score >= 1000: 'basic' and 'intermediate' patterns
   * - score >= 2500: 'basic', 'intermediate', and 'advanced' patterns
   * - score >= 5000: all patterns including 'expert'
   */
  test('Pattern availability matches score thresholds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (score) => {
          const availablePatterns = getAvailablePatterns(score);
          
          // Check each pattern's availability based on score
          for (const pattern of availablePatterns) {
            switch (pattern.difficulty) {
              case 'basic':
                // Basic patterns are always available
                break;
              case 'intermediate':
                // Intermediate requires score >= 1000
                if (score < 1000) return false;
                break;
              case 'advanced':
                // Advanced requires score >= 2500
                if (score < 2500) return false;
                break;
              case 'expert':
                // Expert requires score >= 5000
                if (score < 5000) return false;
                break;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 10: Pattern Availability by Score (Basic Always Available)**
   * **Validates: Requirements 7.1**
   *
   * For any score value, basic patterns SHALL always be available.
   */
  test('Basic patterns are always available at any score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (score) => {
          const threshold = getCurrentDifficultyThreshold(score);
          return threshold.unlockedDifficulties.includes('basic');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 10: Pattern Availability by Score (Intermediate at 1000)**
   * **Validates: Requirements 7.2**
   *
   * For any score >= 1000, intermediate patterns SHALL be available.
   */
  test('Intermediate patterns available at score >= 1000', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 100000 }),
        (score) => {
          const threshold = getCurrentDifficultyThreshold(score);
          return threshold.unlockedDifficulties.includes('intermediate');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 10: Pattern Availability by Score (Advanced at 2500)**
   * **Validates: Requirements 7.3**
   *
   * For any score >= 2500, advanced patterns SHALL be available.
   */
  test('Advanced patterns available at score >= 2500', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2500, max: 100000 }),
        (score) => {
          const threshold = getCurrentDifficultyThreshold(score);
          return threshold.unlockedDifficulties.includes('advanced');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 10: Pattern Availability by Score (Expert at 5000)**
   * **Validates: Requirements 7.4**
   *
   * For any score >= 5000, expert patterns SHALL be available.
   */
  test('Expert patterns available at score >= 5000', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5000, max: 100000 }),
        (score) => {
          const threshold = getCurrentDifficultyThreshold(score);
          return threshold.unlockedDifficulties.includes('expert');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 10: Pattern Availability by Score (No Expert Below 5000)**
   * **Validates: Requirements 7.4**
   *
   * For any score < 5000, expert patterns SHALL NOT be available.
   */
  test('Expert patterns not available below score 5000', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4999 }),
        (score) => {
          const threshold = getCurrentDifficultyThreshold(score);
          return !threshold.unlockedDifficulties.includes('expert');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 10: Pattern Availability by Score (No Advanced Below 2500)**
   * **Validates: Requirements 7.3**
   *
   * For any score < 2500, advanced patterns SHALL NOT be available.
   */
  test('Advanced patterns not available below score 2500', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2499 }),
        (score) => {
          const threshold = getCurrentDifficultyThreshold(score);
          return !threshold.unlockedDifficulties.includes('advanced');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 10: Pattern Availability by Score (No Intermediate Below 1000)**
   * **Validates: Requirements 7.2**
   *
   * For any score < 1000, intermediate patterns SHALL NOT be available.
   */
  test('Intermediate patterns not available below score 1000', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999 }),
        (score) => {
          const threshold = getCurrentDifficultyThreshold(score);
          return !threshold.unlockedDifficulties.includes('intermediate');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 10: isPatternAvailable consistency**
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
   *
   * isPatternAvailable should be consistent with getAvailablePatterns.
   */
  test('isPatternAvailable is consistent with getAvailablePatterns', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (score) => {
          const availablePatterns = getAvailablePatterns(score);
          
          // Every pattern in PATTERNS should match isPatternAvailable
          for (const pattern of PATTERNS) {
            const isAvailable = isPatternAvailable(pattern, score);
            const inAvailableList = availablePatterns.some(p => p.id === pattern.id);
            
            if (isAvailable !== inAvailableList) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Difficulty Progression System - Weight Distribution Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property 11: Difficulty Weight Distribution**
   * **Validates: Requirements 7.5**
   *
   * For any score value, the pattern selection weights SHALL sum to 1.0,
   * and harder patterns SHALL have higher weights as score increases.
   */
  test('Weights sum to 1.0 for all thresholds', () => {
    for (const threshold of DIFFICULTY_THRESHOLDS) {
      const sum = getWeightSum(threshold);
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.0001);
    }
  });

  /**
   * **Feature: procedural-gameplay, Property 11: Difficulty Weight Distribution (Progressive)**
   * **Validates: Requirements 7.5**
   *
   * As score increases, harder patterns SHALL have equal or higher weights.
   */
  test('Harder patterns have progressive weights as score increases', () => {
    // Compare consecutive thresholds
    for (let i = 0; i < DIFFICULTY_THRESHOLDS.length - 1; i++) {
      const lowerThreshold = DIFFICULTY_THRESHOLDS[i];
      const higherThreshold = DIFFICULTY_THRESHOLDS[i + 1];
      
      expect(hasProgressiveWeights(lowerThreshold, higherThreshold)).toBe(true);
    }
  });

  /**
   * **Feature: procedural-gameplay, Property 11: Difficulty Weight Distribution (Basic Decreases)**
   * **Validates: Requirements 7.5**
   *
   * Basic pattern weight SHALL decrease as score increases.
   */
  test('Basic pattern weight decreases as score increases', () => {
    let previousBasicWeight = 1.0;
    
    for (const threshold of DIFFICULTY_THRESHOLDS) {
      const basicWeight = threshold.weights.basic;
      expect(basicWeight).toBeLessThanOrEqual(previousBasicWeight);
      previousBasicWeight = basicWeight;
    }
  });

  /**
   * **Feature: procedural-gameplay, Property 11: Difficulty Weight Distribution (Valid Distribution)**
   * **Validates: Requirements 7.5**
   *
   * All thresholds SHALL have valid weight distributions.
   */
  test('All thresholds have valid weight distributions', () => {
    for (const threshold of DIFFICULTY_THRESHOLDS) {
      expect(isValidWeightDistribution(threshold)).toBe(true);
    }
  });

  /**
   * **Feature: procedural-gameplay, Property 11: Difficulty Weight Distribution (Selection)**
   * **Validates: Requirements 7.5**
   *
   * selectPatternByWeight SHALL only return patterns from available difficulties.
   */
  test('selectPatternByWeight returns only available patterns', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (score) => {
          const threshold = getCurrentDifficultyThreshold(score);
          
          // Run multiple selections to test randomness
          for (let i = 0; i < 10; i++) {
            const selected = selectPatternByWeight(PATTERNS, threshold);
            
            // Selected pattern must be from an unlocked difficulty
            if (!threshold.unlockedDifficulties.includes(selected.difficulty)) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Difficulty Progression System - Edge Cases', () => {
  /**
   * Edge case: Score of 0 should only have basic patterns
   */
  test('Score of 0 only has basic patterns', () => {
    const threshold = getCurrentDifficultyThreshold(0);
    expect(threshold.unlockedDifficulties).toEqual(['basic']);
    expect(threshold.weights.basic).toBe(1.0);
  });

  /**
   * Edge case: Negative scores should be treated as 0
   */
  test('Negative scores are treated as 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000000, max: -1 }),
        (negativeScore) => {
          const thresholdNegative = getCurrentDifficultyThreshold(negativeScore);
          const thresholdZero = getCurrentDifficultyThreshold(0);
          
          return (
            thresholdNegative.score === thresholdZero.score &&
            thresholdNegative.unlockedDifficulties.length === thresholdZero.unlockedDifficulties.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge case: Exact threshold boundaries
   */
  test('Exact threshold boundaries work correctly', () => {
    // At exactly 1000, intermediate should be available
    const at1000 = getCurrentDifficultyThreshold(1000);
    expect(at1000.unlockedDifficulties).toContain('intermediate');
    
    // At 999, intermediate should NOT be available
    const at999 = getCurrentDifficultyThreshold(999);
    expect(at999.unlockedDifficulties).not.toContain('intermediate');
    
    // At exactly 2500, advanced should be available
    const at2500 = getCurrentDifficultyThreshold(2500);
    expect(at2500.unlockedDifficulties).toContain('advanced');
    
    // At 2499, advanced should NOT be available
    const at2499 = getCurrentDifficultyThreshold(2499);
    expect(at2499.unlockedDifficulties).not.toContain('advanced');
    
    // At exactly 5000, expert should be available
    const at5000 = getCurrentDifficultyThreshold(5000);
    expect(at5000.unlockedDifficulties).toContain('expert');
    
    // At 4999, expert should NOT be available
    const at4999 = getCurrentDifficultyThreshold(4999);
    expect(at4999.unlockedDifficulties).not.toContain('expert');
  });

  /**
   * Edge case: Empty pattern list handling
   */
  test('selectPatternByWeight handles edge cases gracefully', () => {
    const threshold = DIFFICULTY_THRESHOLDS[0];
    
    // With only one pattern, should return that pattern
    const singlePattern = [PATTERNS[0]];
    const selected = selectPatternByWeight(singlePattern, threshold);
    expect(selected).toBe(singlePattern[0]);
  });
});
