/**
 * Property-Based Tests for ConstructSystem
 * Uses fast-check for property-based testing
 * 
 * Tests Property 5 and Property 19 from the design document:
 * - Property 5: Transformation Invincibility
 * - Property 19: Collision Resolution by Strategy
 */

import * as fc from 'fast-check';
import { beforeEach, describe, expect, test } from 'vitest';
import type { ConstructType } from '../../types';
import { getBlinkPhysics, resetBlinkPhysics } from './BlinkPhysics';
import {
    CONSTRUCT_SYSTEM_CONFIG,
    createConstructSystemState,
    getStrategyForType,
    isInvulnerable,
    transformTo
} from './ConstructSystem';
import { getPhasePhysics, resetPhasePhysics } from './PhasePhysics';
import { getStandardPhysics } from './StandardPhysics';
import { getTitanPhysics, resetTitanPhysics } from './TitanPhysics';

/**
 * Generate a valid ConstructType for testing
 */
const constructTypeArb = fc.constantFrom<ConstructType>('NONE', 'TITAN', 'PHASE', 'BLINK');

/**
 * Generate a non-NONE ConstructType for transformation testing
 */
const activeConstructTypeArb = fc.constantFrom<ConstructType>('TITAN', 'PHASE', 'BLINK');

/**
 * Generate a valid timestamp (positive integer)
 */
const timestampArb = fc.integer({ min: 0, max: 1_000_000_000 });

/**
 * Generate a time offset within invincibility duration
 */
const withinInvincibilityOffsetArb = fc.integer({ 
  min: 0, 
  max: CONSTRUCT_SYSTEM_CONFIG.transformationInvincibilityDuration - 1 
});

/**
 * Generate a time offset after invincibility duration
 */
const afterInvincibilityOffsetArb = fc.integer({ 
  min: CONSTRUCT_SYSTEM_CONFIG.transformationInvincibilityDuration, 
  max: CONSTRUCT_SYSTEM_CONFIG.transformationInvincibilityDuration + 10000 
});

describe('ConstructSystem Property Tests', () => {
  beforeEach(() => {
    // Reset all physics singletons before each test
    resetTitanPhysics();
    resetPhasePhysics();
    resetBlinkPhysics();
  });

  /**
   * **Feature: echo-constructs, Property 5: Transformation Invincibility**
   * **Validates: Requirements 2.1, 6.3**
   *
   * For any transformation, player SHALL be invulnerable for 2000ms.
   * 
   * This property verifies that:
   * 1. After transformation, isInvulnerable returns true within the 2000ms window
   * 2. After 2000ms, isInvulnerable returns false
   * 3. The invincibility duration is exactly 2000ms
   */
  test('Property 5: Transformation grants exactly 2000ms of invincibility', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        withinInvincibilityOffsetArb,
        (constructType, transformTime, offsetWithin) => {
          const initialState = createConstructSystemState();
          
          // Transform to a construct
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          // Property 1: Immediately after transformation, player is invulnerable
          const isInvulnerableImmediately = isInvulnerable(transformedState, transformTime);
          
          // Property 2: Within 2000ms, player is still invulnerable
          const checkTimeWithin = transformTime + offsetWithin;
          const isInvulnerableWithin = isInvulnerable(transformedState, checkTimeWithin);
          
          // Property 3: Invincibility end time is exactly transformTime + 2000ms
          const expectedEndTime = transformTime + CONSTRUCT_SYSTEM_CONFIG.transformationInvincibilityDuration;
          const endTimeCorrect = transformedState.invulnerabilityEndTime === expectedEndTime;
          
          return isInvulnerableImmediately && isInvulnerableWithin && endTimeCorrect;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 5: Transformation Invincibility (Expiration)**
   * **Validates: Requirements 2.1, 6.3**
   *
   * Verifies that invincibility expires after exactly 2000ms.
   */
  test('Property 5: Invincibility expires after 2000ms', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        afterInvincibilityOffsetArb,
        (constructType, transformTime, offsetAfter) => {
          const initialState = createConstructSystemState();
          
          // Transform to a construct
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          // After 2000ms, player should NOT be invulnerable
          const checkTimeAfter = transformTime + offsetAfter;
          const isNotInvulnerableAfter = !isInvulnerable(transformedState, checkTimeAfter);
          
          return isNotInvulnerableAfter;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 5: Transformation Invincibility (Boundary)**
   * **Validates: Requirements 2.1, 6.3**
   *
   * Verifies the exact boundary at 2000ms.
   */
  test('Property 5: Invincibility boundary at exactly 2000ms', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        (constructType, transformTime) => {
          const initialState = createConstructSystemState();
          
          // Transform to a construct
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          // At exactly 1999ms, should still be invulnerable
          const justBefore = transformTime + CONSTRUCT_SYSTEM_CONFIG.transformationInvincibilityDuration - 1;
          const isInvulnerableJustBefore = isInvulnerable(transformedState, justBefore);
          
          // At exactly 2000ms, should NOT be invulnerable (boundary is exclusive)
          const exactlyAt = transformTime + CONSTRUCT_SYSTEM_CONFIG.transformationInvincibilityDuration;
          const isNotInvulnerableAtBoundary = !isInvulnerable(transformedState, exactlyAt);
          
          return isInvulnerableJustBefore && isNotInvulnerableAtBoundary;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 5: Transformation Invincibility (All Constructs)**
   * **Validates: Requirements 2.1, 6.3**
   *
   * Verifies that ALL construct types grant the same 2000ms invincibility.
   */
  test('Property 5: All construct types grant 2000ms invincibility', () => {
    fc.assert(
      fc.property(
        timestampArb,
        (transformTime) => {
          const constructTypes: ConstructType[] = ['TITAN', 'PHASE', 'BLINK'];
          
          for (const constructType of constructTypes) {
            // Reset singletons for each construct type
            resetTitanPhysics();
            resetPhasePhysics();
            resetBlinkPhysics();
            
            const initialState = createConstructSystemState();
            const transformedState = transformTo(initialState, constructType, transformTime);
            
            // All constructs should have the same invincibility duration
            const expectedEndTime = transformTime + CONSTRUCT_SYSTEM_CONFIG.transformationInvincibilityDuration;
            if (transformedState.invulnerabilityEndTime !== expectedEndTime) {
              return false;
            }
            
            // All constructs should be invulnerable immediately after transformation
            if (!isInvulnerable(transformedState, transformTime)) {
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

describe('ConstructSystem Transformation Behavior Tests', () => {
  beforeEach(() => {
    resetTitanPhysics();
    resetPhasePhysics();
    resetBlinkPhysics();
  });

  /**
   * Verify that transformation sets the correct construct type
   */
  test('Transformation sets activeConstruct to the target type', () => {
    fc.assert(
      fc.property(
        constructTypeArb,
        timestampArb,
        (constructType, transformTime) => {
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          return transformedState.activeConstruct === constructType;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify that transformation sets isInvulnerable flag to true
   */
  test('Transformation sets isInvulnerable flag to true', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        (constructType, transformTime) => {
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          return transformedState.isInvulnerable === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify that the physics strategy type matches the construct type
   */
  test('Transformation sets correct physics strategy', () => {
    fc.assert(
      fc.property(
        constructTypeArb,
        timestampArb,
        (constructType, transformTime) => {
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          return transformedState.currentStrategy.type === constructType;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify invincibility duration constant is 2000ms
   */
  test('Invincibility duration constant is 2000ms', () => {
    expect(CONSTRUCT_SYSTEM_CONFIG.transformationInvincibilityDuration).toBe(2000);
  });
});


describe('ConstructSystem Collision Resolution Property Tests', () => {
  beforeEach(() => {
    resetTitanPhysics();
    resetPhasePhysics();
    resetBlinkPhysics();
  });

  /**
   * **Feature: echo-constructs, Property 19: Collision Resolution by Strategy**
   * **Validates: Requirements 3.3, 3.4, 4.4, 5.4, 5.5**
   *
   * For any collision event, the CollisionResult SHALL be determined by the
   * active PhysicsStrategy.resolveCollision().
   * 
   * This property verifies that:
   * 1. Standard (NONE) always returns DAMAGE
   * 2. Titan returns DESTROY when isFromAbove=true, DAMAGE otherwise
   * 3. Phase always returns DAMAGE
   * 4. Blink returns IGNORE when teleporting, DAMAGE otherwise
   */
  test('Property 19: Standard physics always returns DAMAGE', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isFromAbove
        (isFromAbove) => {
          const strategy = getStandardPhysics();
          const result = strategy.resolveCollision(isFromAbove);
          
          // Standard physics always returns DAMAGE regardless of collision direction
          return result === 'DAMAGE';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 19: Collision Resolution by Strategy**
   * **Validates: Requirements 3.3, 3.4**
   *
   * Titan returns DESTROY when stomping from above, DAMAGE otherwise.
   */
  test('Property 19: Titan physics returns DESTROY when from above, DAMAGE otherwise', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isFromAbove
        (isFromAbove) => {
          resetTitanPhysics();
          const strategy = getTitanPhysics();
          const result = strategy.resolveCollision(isFromAbove);
          
          // Requirements 3.3: Stomp from above destroys obstacles
          // Requirements 3.4: Side collisions trigger Second Chance (DAMAGE)
          if (isFromAbove) {
            return result === 'DESTROY';
          } else {
            return result === 'DAMAGE';
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 19: Collision Resolution by Strategy**
   * **Validates: Requirements 4.4**
   *
   * Phase always returns DAMAGE (triggers Second Chance).
   */
  test('Property 19: Phase physics always returns DAMAGE', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isFromAbove
        (isFromAbove) => {
          resetPhasePhysics();
          const strategy = getPhasePhysics();
          const result = strategy.resolveCollision(isFromAbove);
          
          // Requirements 4.4: Phase collisions always trigger Second Chance
          return result === 'DAMAGE';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 19: Collision Resolution by Strategy**
   * **Validates: Requirements 5.4, 5.5**
   *
   * Blink returns IGNORE when teleporting, DAMAGE otherwise.
   */
  test('Property 19: Blink physics returns IGNORE when teleporting, DAMAGE otherwise', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // isFromAbove
        fc.boolean(), // isTeleporting
        (isFromAbove, isTeleporting) => {
          resetBlinkPhysics();
          const strategy = getBlinkPhysics();
          
          // Set teleporting state
          strategy.setTeleporting(isTeleporting);
          
          const result = strategy.resolveCollision(isFromAbove);
          
          // Requirements 5.4: Ignore collisions during teleport frame
          // Requirements 5.5: Non-teleport collisions trigger Second Chance
          if (isTeleporting) {
            return result === 'IGNORE';
          } else {
            return result === 'DAMAGE';
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 19: Collision Resolution by Strategy**
   * **Validates: Requirements 3.3, 3.4, 4.4, 5.4, 5.5**
   *
   * Verifies that getStrategyForType returns the correct strategy for each construct type,
   * and that strategy's resolveCollision behaves correctly.
   */
  test('Property 19: getStrategyForType returns correct strategy with correct collision behavior', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ConstructType>('NONE', 'TITAN', 'PHASE', 'BLINK'),
        fc.boolean(), // isFromAbove
        (constructType, isFromAbove) => {
          // Reset all singletons
          resetTitanPhysics();
          resetPhasePhysics();
          resetBlinkPhysics();
          
          const strategy = getStrategyForType(constructType);
          
          // Verify strategy type matches construct type
          if (strategy.type !== constructType) {
            return false;
          }
          
          const result = strategy.resolveCollision(isFromAbove);
          
          // Verify collision behavior based on construct type
          switch (constructType) {
            case 'NONE':
              // Standard always returns DAMAGE
              return result === 'DAMAGE';
            case 'TITAN':
              // Titan: DESTROY from above, DAMAGE otherwise
              return isFromAbove ? result === 'DESTROY' : result === 'DAMAGE';
            case 'PHASE':
              // Phase always returns DAMAGE
              return result === 'DAMAGE';
            case 'BLINK':
              // Blink: DAMAGE when not teleporting (default state)
              // Note: We can't test IGNORE here without setting teleporting state
              return result === 'DAMAGE';
            default:
              return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 19: Collision Resolution by Strategy**
   * **Validates: Requirements 3.3, 3.4, 4.4, 5.4, 5.5**
   *
   * Verifies that after transformation, the collision resolution is determined
   * by the new strategy.
   */
  test('Property 19: Transformation changes collision resolution behavior', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ConstructType>('TITAN', 'PHASE', 'BLINK'),
        fc.integer({ min: 0, max: 1_000_000_000 }), // timestamp
        fc.boolean(), // isFromAbove
        (constructType, timestamp, isFromAbove) => {
          // Reset all singletons
          resetTitanPhysics();
          resetPhasePhysics();
          resetBlinkPhysics();
          
          const initialState = createConstructSystemState();
          
          // Initial state should use Standard physics (NONE)
          const initialResult = initialState.currentStrategy.resolveCollision(isFromAbove);
          if (initialResult !== 'DAMAGE') {
            return false;
          }
          
          // Transform to new construct
          const transformedState = transformTo(initialState, constructType, timestamp);
          
          // Verify strategy type changed
          if (transformedState.currentStrategy.type !== constructType) {
            return false;
          }
          
          const transformedResult = transformedState.currentStrategy.resolveCollision(isFromAbove);
          
          // Verify collision behavior matches new construct type
          switch (constructType) {
            case 'TITAN':
              return isFromAbove ? transformedResult === 'DESTROY' : transformedResult === 'DAMAGE';
            case 'PHASE':
              return transformedResult === 'DAMAGE';
            case 'BLINK':
              // Blink in default state (not teleporting) returns DAMAGE
              return transformedResult === 'DAMAGE';
            default:
              return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
