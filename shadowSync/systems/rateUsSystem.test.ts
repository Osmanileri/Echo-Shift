/**
 * Rate Us System Property-Based Tests
 * Requirements: 6.1, 6.2, 6.3, 6.6, 6.7, 6.8
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  RateUsState,
  RateUsConfig,
  createInitialRateUsState,
  recordPositiveMoment,
  shouldShowPrompt,
  markRated,
  markDismissed,
  serialize,
  deserialize,
  DEFAULT_CONFIG,
} from './rateUsSystem';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generator for valid RateUsState
 */
const rateUsStateArb = fc.record({
  positiveCount: fc.integer({ min: 0, max: 100 }),
  lastPromptDate: fc.option(
    fc.integer({ min: 0, max: 3650 }).map(days => {
      const date = new Date('2020-01-01');
      date.setDate(date.getDate() + days);
      return date.toISOString().split('T')[0];
    }), 
    { nil: null }
  ),
  hasRated: fc.boolean(),
  hasDismissed: fc.boolean(),
  dismissedAt: fc.option(fc.integer({ min: 0, max: Date.now() + 1000000000 }), { nil: null }),
});

/**
 * Generator for valid RateUsConfig
 */
const rateUsConfigArb = fc.record({
  triggerThreshold: fc.integer({ min: 1, max: 10 }),
  cooldownDays: fc.integer({ min: 1, max: 30 }),
});

/**
 * Generator for number of positive moments to record
 */
const positiveMomentsArb = fc.integer({ min: 0, max: 20 });

// ============================================================================
// Property Tests
// ============================================================================

describe('Rate Us System', () => {
  /**
   * **Feature: echo-shift-engagement, Property 16: Rate Prompt Trigger**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   * 
   * *For any* positive moment (high score or 3-star completion), the positive counter 
   * SHALL increment by 1. When counter >= 3 AND hasRated == false AND not in cooldown, 
   * shouldShowPrompt SHALL return true.
   */
  it('should trigger rate prompt when positive moments reach threshold and conditions are met', () => {
    fc.assert(
      fc.property(
        positiveMomentsArb,
        rateUsConfigArb,
        (numMoments, config) => {
          // Start with fresh state (not rated, not dismissed)
          let state = createInitialRateUsState();
          
          // Record positive moments
          for (let i = 0; i < numMoments; i++) {
            state = recordPositiveMoment(state);
          }
          
          // Verify positive count incremented correctly (Requirements 6.1, 6.2)
          expect(state.positiveCount).toBe(numMoments);
          
          // Verify prompt trigger logic (Requirements 6.3)
          const shouldShow = shouldShowPrompt(state, config);
          const expected = numMoments >= config.triggerThreshold;
          
          expect(shouldShow).toBe(expected);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-engagement, Property 17: Rate Prompt Suppression**
   * **Validates: Requirements 6.6, 6.7**
   * 
   * *For any* rate prompt state, if hasRated == true, shouldShowPrompt SHALL return false.
   * If dismissed within cooldown days, shouldShowPrompt SHALL return false.
   */
  it('should suppress rate prompt when user has rated or is in cooldown', () => {
    fc.assert(
      fc.property(
        rateUsStateArb,
        rateUsConfigArb,
        fc.integer({ min: 0, max: 14 }), // days since dismiss
        (baseState, config, daysSinceDismiss) => {
          // Test 1: If hasRated is true, never show prompt (Requirements 6.7)
          const ratedState: RateUsState = {
            ...baseState,
            hasRated: true,
            positiveCount: config.triggerThreshold + 10, // Well above threshold
          };
          expect(shouldShowPrompt(ratedState, config)).toBe(false);
          
          // Test 2: If dismissed within cooldown, don't show prompt (Requirements 6.6)
          const dismissedAt = Date.now() - (daysSinceDismiss * 24 * 60 * 60 * 1000);
          const dismissedState: RateUsState = {
            ...baseState,
            hasRated: false,
            hasDismissed: true,
            dismissedAt,
            positiveCount: config.triggerThreshold + 10, // Well above threshold
          };
          
          const shouldShow = shouldShowPrompt(dismissedState, config);
          const isInCooldown = daysSinceDismiss < config.cooldownDays;
          
          if (isInCooldown) {
            expect(shouldShow).toBe(false);
          }
          // If not in cooldown and threshold met, should show
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-engagement, Property 18: Rate State Round-Trip**
   * **Validates: Requirements 6.8**
   * 
   * *For any* valid RateUsState object, serializing to JSON and deserializing 
   * SHALL produce an equivalent object.
   */
  it('should round-trip serialize and deserialize rate state correctly', () => {
    fc.assert(
      fc.property(
        rateUsStateArb,
        (state) => {
          // Serialize to JSON
          const serialized = serialize(state);
          
          // Deserialize back
          const deserialized = deserialize(serialized);
          
          // Verify all fields match
          expect(deserialized.positiveCount).toBe(Math.max(0, state.positiveCount));
          expect(deserialized.hasRated).toBe(state.hasRated);
          expect(deserialized.hasDismissed).toBe(state.hasDismissed);
          expect(deserialized.lastPromptDate).toBe(state.lastPromptDate);
          expect(deserialized.dismissedAt).toBe(state.dismissedAt);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Additional Unit Tests for Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle invalid JSON gracefully in deserialize', () => {
      const invalidInputs = [
        'not json',
        '{}',
        '{"positiveCount": "string"}',
        '{"hasRated": "not boolean"}',
        'null',
        '[]',
      ];
      
      for (const input of invalidInputs) {
        const result = deserialize(input);
        // Should return initial state for invalid input
        expect(result).toEqual(createInitialRateUsState());
      }
    });

    it('should increment positive count by exactly 1 each time', () => {
      let state = createInitialRateUsState();
      expect(state.positiveCount).toBe(0);
      
      state = recordPositiveMoment(state);
      expect(state.positiveCount).toBe(1);
      
      state = recordPositiveMoment(state);
      expect(state.positiveCount).toBe(2);
      
      state = recordPositiveMoment(state);
      expect(state.positiveCount).toBe(3);
    });

    it('should reset positive count when dismissed', () => {
      let state = createInitialRateUsState();
      state = recordPositiveMoment(state);
      state = recordPositiveMoment(state);
      expect(state.positiveCount).toBe(2);
      
      state = markDismissed(state);
      expect(state.positiveCount).toBe(0);
      expect(state.hasDismissed).toBe(true);
      expect(state.dismissedAt).not.toBeNull();
    });

    it('should set hasRated to true when marked as rated', () => {
      let state = createInitialRateUsState();
      expect(state.hasRated).toBe(false);
      
      state = markRated(state);
      expect(state.hasRated).toBe(true);
    });

    it('should show prompt at exactly threshold with default config', () => {
      let state = createInitialRateUsState();
      
      // Below threshold
      state = recordPositiveMoment(state);
      state = recordPositiveMoment(state);
      expect(shouldShowPrompt(state, DEFAULT_CONFIG)).toBe(false);
      
      // At threshold
      state = recordPositiveMoment(state);
      expect(state.positiveCount).toBe(3);
      expect(shouldShowPrompt(state, DEFAULT_CONFIG)).toBe(true);
    });
  });
});
