/**
 * Property-Based Tests for Resonance System (Harmonic Resonance)
 * Uses fast-check for property-based testing
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 6.2
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createInitialResonanceState,
  updateStreak,
  activateResonance,
  checkActivation,
  calculateScoreMultiplier,
  pauseResonance,
  resumeResonance,
  RESONANCE_CONFIG,
} from './resonanceSystem';

describe('Resonance System Activation Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 11: Resonance Activation Threshold**
   * **Validates: Requirements 5.1**
   *
   * For any rhythm streak reaching 10 consecutive passes,
   * Harmonic Resonance SHALL activate.
   */
  test('Resonance activates when streak reaches 10', () => {
    fc.assert(
      fc.property(
        // Generate streak counts >= 10 (activation threshold)
        fc.integer({ min: 10, max: 100 }),
        (streakCount) => {
          // Create initial state and set streak to threshold or above
          let state = createInitialResonanceState();
          state = { ...state, streakCount };
          
          // Attempt to activate resonance
          const activatedState = activateResonance(state);
          
          // Resonance should be active when streak >= 10
          return activatedState.isActive === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 11: Resonance Activation Threshold (Below Threshold)**
   * **Validates: Requirements 5.1**
   *
   * For any rhythm streak below 10, Harmonic Resonance SHALL NOT activate.
   */
  test('Resonance does not activate when streak is below 10', () => {
    fc.assert(
      fc.property(
        // Generate streak counts below threshold (0-9)
        fc.integer({ min: 0, max: 9 }),
        (streakCount) => {
          // Create initial state and set streak below threshold
          let state = createInitialResonanceState();
          state = { ...state, streakCount };
          
          // Attempt to activate resonance
          const activatedState = activateResonance(state);
          
          // Resonance should NOT be active when streak < 10
          return activatedState.isActive === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 11: Resonance Activation Threshold (checkActivation)**
   * **Validates: Requirements 5.1**
   *
   * checkActivation returns true if and only if streak >= 10.
   */
  test('checkActivation returns true exactly when streak >= 10', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (streakCount) => {
          const shouldActivate = checkActivation(streakCount);
          const expected = streakCount >= RESONANCE_CONFIG.activationThreshold;
          
          return shouldActivate === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Resonance System Streak Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 12: Streak Increment on Rhythm Hit**
   * **Validates: Requirements 5.2**
   *
   * For any obstacle pass within the rhythm tolerance window,
   * the streak counter SHALL increment by 1.
   */
  test('Streak increments by 1 on rhythm hit', () => {
    fc.assert(
      fc.property(
        // Generate any starting streak count
        fc.integer({ min: 0, max: 100 }),
        (initialStreak) => {
          // Create state with initial streak
          let state = createInitialResonanceState();
          state = { ...state, streakCount: initialStreak };
          
          // Update streak with a rhythm hit
          const newState = updateStreak(state, true);
          
          // Streak should increment by exactly 1
          return newState.streakCount === initialStreak + 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 12: Streak Increment on Rhythm Hit (Multiple Hits)**
   * **Validates: Requirements 5.2**
   *
   * For any sequence of N rhythm hits, the streak SHALL equal N.
   */
  test('Multiple rhythm hits accumulate streak correctly', () => {
    fc.assert(
      fc.property(
        // Generate number of consecutive hits
        fc.integer({ min: 1, max: 50 }),
        (numHits) => {
          let state = createInitialResonanceState();
          
          // Apply N rhythm hits
          for (let i = 0; i < numHits; i++) {
            state = updateStreak(state, true);
          }
          
          // Streak should equal number of hits
          return state.streakCount === numHits;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 13: Streak Reset on Miss**
   * **Validates: Requirements 5.3**
   *
   * For any rhythm miss event, the streak counter SHALL reset to zero.
   */
  test('Streak resets to 0 on rhythm miss', () => {
    fc.assert(
      fc.property(
        // Generate any starting streak count
        fc.integer({ min: 0, max: 100 }),
        (initialStreak) => {
          // Create state with initial streak
          let state = createInitialResonanceState();
          state = { ...state, streakCount: initialStreak };
          
          // Update streak with a miss
          const newState = updateStreak(state, false);
          
          // Streak should reset to 0
          return newState.streakCount === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 13: Streak Reset on Miss (After Hits)**
   * **Validates: Requirements 5.3**
   *
   * For any sequence of hits followed by a miss, the streak SHALL be zero.
   */
  test('Streak resets to 0 after any number of hits followed by miss', () => {
    fc.assert(
      fc.property(
        // Generate number of hits before miss
        fc.integer({ min: 1, max: 50 }),
        (numHits) => {
          let state = createInitialResonanceState();
          
          // Apply N rhythm hits
          for (let i = 0; i < numHits; i++) {
            state = updateStreak(state, true);
          }
          
          // Verify streak built up
          if (state.streakCount !== numHits) return false;
          
          // Apply a miss
          state = updateStreak(state, false);
          
          // Streak should be 0
          return state.streakCount === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Resonance System Duration Preservation Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 14: Resonance Duration Preservation**
   * **Validates: Requirements 5.4**
   *
   * For any active Resonance state, additional rhythm streaks SHALL NOT
   * reset or extend the duration.
   */
  test('Active resonance duration is not reset by additional streaks', () => {
    fc.assert(
      fc.property(
        // Generate initial remaining time (active resonance)
        fc.integer({ min: 1000, max: 10000 }),
        // Generate additional streak count to add
        fc.integer({ min: 10, max: 50 }),
        (initialRemainingTime, additionalStreak) => {
          // Create an already active resonance state
          let state = createInitialResonanceState();
          state = {
            ...state,
            isActive: true,
            remainingTime: initialRemainingTime,
            multiplier: 2,
            streakCount: 0, // Reset after activation
          };
          
          // Build up another streak to threshold
          for (let i = 0; i < additionalStreak; i++) {
            state = updateStreak(state, true);
          }
          
          // Try to activate again (should not change duration)
          const afterActivation = activateResonance(state);
          
          // Duration should remain unchanged (not reset or extended)
          return afterActivation.remainingTime === initialRemainingTime;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 14: Resonance Duration Preservation (isActive unchanged)**
   * **Validates: Requirements 5.4**
   *
   * For any active Resonance state, calling activateResonance SHALL NOT
   * change the isActive status or reset the state.
   */
  test('Active resonance is not re-activated by additional activation calls', () => {
    fc.assert(
      fc.property(
        // Generate initial remaining time
        fc.integer({ min: 1000, max: 10000 }),
        // Generate obstacles destroyed count
        fc.integer({ min: 0, max: 20 }),
        // Generate bonus score
        fc.integer({ min: 0, max: 1000 }),
        (initialRemainingTime, obstaclesDestroyed, bonusScore) => {
          // Create an already active resonance state with some progress
          let state = createInitialResonanceState();
          state = {
            ...state,
            isActive: true,
            remainingTime: initialRemainingTime,
            multiplier: 2,
            obstaclesDestroyed,
            bonusScore,
            streakCount: 15, // Above threshold
          };
          
          // Try to activate again
          const afterActivation = activateResonance(state);
          
          // State should be unchanged (same reference returned)
          return (
            afterActivation.isActive === true &&
            afterActivation.remainingTime === initialRemainingTime &&
            afterActivation.obstaclesDestroyed === obstaclesDestroyed &&
            afterActivation.bonusScore === bonusScore
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Resonance System Score Multiplier Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 15: Resonance Score Multiplier**
   * **Validates: Requirements 6.2**
   *
   * For any score earned during active Harmonic Resonance,
   * the score SHALL be multiplied by 2.
   */
  test('Score multiplier is 2 when resonance is active', () => {
    fc.assert(
      fc.property(
        // Generate remaining time (active resonance)
        fc.integer({ min: 1, max: 10000 }),
        (remainingTime) => {
          // Create an active resonance state
          let state = createInitialResonanceState();
          state = {
            ...state,
            isActive: true,
            isPaused: false,
            remainingTime,
            multiplier: 2,
          };
          
          // Calculate score multiplier
          const multiplier = calculateScoreMultiplier(state);
          
          // Multiplier should be 2 when active
          return multiplier === 2;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 15: Resonance Score Multiplier (Inactive)**
   * **Validates: Requirements 6.2**
   *
   * For any inactive Resonance state, the score multiplier SHALL be 1.
   */
  test('Score multiplier is 1 when resonance is inactive', () => {
    fc.assert(
      fc.property(
        // Generate any streak count (inactive state)
        fc.integer({ min: 0, max: 100 }),
        (streakCount) => {
          // Create an inactive resonance state
          let state = createInitialResonanceState();
          state = {
            ...state,
            isActive: false,
            streakCount,
          };
          
          // Calculate score multiplier
          const multiplier = calculateScoreMultiplier(state);
          
          // Multiplier should be 1 when inactive
          return multiplier === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 15: Resonance Score Multiplier (Paused)**
   * **Validates: Requirements 6.2**
   *
   * For any paused Resonance state (during Overdrive), the score multiplier SHALL be 1.
   */
  test('Score multiplier is 1 when resonance is paused', () => {
    fc.assert(
      fc.property(
        // Generate remaining time
        fc.integer({ min: 1, max: 10000 }),
        (remainingTime) => {
          // Create an active but paused resonance state
          let state = createInitialResonanceState();
          state = {
            ...state,
            isActive: true,
            isPaused: true,
            remainingTime,
            pausedTimeRemaining: remainingTime,
            multiplier: 2,
          };
          
          // Calculate score multiplier
          const multiplier = calculateScoreMultiplier(state);
          
          // Multiplier should be 1 when paused (Overdrive takes priority)
          return multiplier === 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 15: Resonance Score Multiplier (Pause/Resume Round Trip)**
   * **Validates: Requirements 6.2, 5.4**
   *
   * For any active Resonance, pausing then resuming SHALL restore the x2 multiplier.
   */
  test('Score multiplier restores to 2 after pause/resume cycle', () => {
    fc.assert(
      fc.property(
        // Generate remaining time
        fc.integer({ min: 1, max: 10000 }),
        (remainingTime) => {
          // Create an active resonance state
          let state = createInitialResonanceState();
          state = {
            ...state,
            isActive: true,
            isPaused: false,
            remainingTime,
            multiplier: 2,
          };
          
          // Verify initial multiplier is 2
          const initialMultiplier = calculateScoreMultiplier(state);
          if (initialMultiplier !== 2) return false;
          
          // Pause resonance (Overdrive override)
          state = pauseResonance(state);
          
          // Verify multiplier is 1 when paused
          const pausedMultiplier = calculateScoreMultiplier(state);
          if (pausedMultiplier !== 1) return false;
          
          // Resume resonance (Overdrive ends)
          state = resumeResonance(state);
          
          // Verify multiplier is restored to 2
          const resumedMultiplier = calculateScoreMultiplier(state);
          return resumedMultiplier === 2;
        }
      ),
      { numRuns: 100 }
    );
  });
});
