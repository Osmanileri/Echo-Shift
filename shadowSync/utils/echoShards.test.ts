/**
 * Property-Based Tests for Echo Shards Currency System
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateEchoShards } from './echoShards';

describe('Echo Shards Calculation Properties', () => {
  /**
   * **Feature: echo-shift-professionalization, Property 1: Echo Shards Calculation Accuracy**
   * **Validates: Requirements 1.1**
   *
   * For any final game score, the Echo Shards awarded SHALL equal exactly
   * Math.floor(score * 0.1).
   */
  test('Echo Shards equals 10% of score rounded down for any non-negative score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }),
        (score) => {
          const shards = calculateEchoShards(score);
          const expected = Math.floor(score * 0.1);
          return shards === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});
