/**
 * Property-Based Tests for BlinkPhysics
 * Uses fast-check for property-based testing
 * 
 * Tests Properties 13, 14 from the design document
 */

import * as fc from 'fast-check';
import { beforeEach, describe, test } from 'vitest';
import {
    BLINK_CONFIG,
    createBlinkPhysics,
    createBlinkPhysicsWithState,
    getBlinkPhysics,
    resetBlinkPhysics,
} from './BlinkPhysics';

/**
 * Generate a valid PlayerEntity for testing
 */
const playerEntityArb = fc.record({
  x: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
  y: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
  velocity: fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
  width: fc.double({ min: 10, max: 100, noNaN: true, noDefaultInfinity: true }),
  height: fc.double({ min: 10, max: 100, noNaN: true, noDefaultInfinity: true }),
});

/**
 * Generate a valid InputState for testing
 */
const inputStateArb = fc.record({
  isPressed: fc.boolean(),
  y: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
  isTapFrame: fc.boolean(),
  isReleaseFrame: fc.boolean(),
});

/**
 * Generate an InputState with press active (for dragging)
 */
const pressedInputStateArb = fc.record({
  isPressed: fc.constant(true),
  y: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
  isTapFrame: fc.boolean(),
  isReleaseFrame: fc.constant(false),
});

/**
 * Generate an InputState with release (for teleport)
 */
const releaseInputStateArb = fc.record({
  isPressed: fc.constant(false),
  y: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
  isTapFrame: fc.constant(false),
  isReleaseFrame: fc.constant(true),
});

/**
 * Generate an InputState without press or release (idle)
 */
const idleInputStateArb = fc.record({
  isPressed: fc.constant(false),
  y: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
  isTapFrame: fc.constant(false),
  isReleaseFrame: fc.constant(false),
});

describe('BlinkPhysics Property Tests', () => {
  beforeEach(() => {
    resetBlinkPhysics();
  });

  /**
   * **Feature: echo-constructs, Property 13: Blink Node Static Y**
   * **Validates: Requirements 5.1**
   *
   * For any update while Blink is active (not teleporting), velocity SHALL be 0.
   */
  test('Property 13: Blink velocity is always 0 after update', () => {
    fc.assert(
      fc.property(
        playerEntityArb,
        inputStateArb,
        fc.double({ min: 16, max: 100, noNaN: true, noDefaultInfinity: true }),
        (player, input, deltaTime) => {
          const strategy = createBlinkPhysics();
          
          // Set any initial velocity
          player.velocity = 50;
          
          // Call update
          strategy.update(player, deltaTime, input);
          
          // Property: After update, velocity must be 0
          // This validates Requirements 5.1: Static Y position (velocity = 0)
          return player.velocity === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 14: Blink Node Teleport**
   * **Validates: Requirements 5.3**
   *
   * For any release while Blink is active, player Y SHALL equal ghost Y.
   */
  test('Property 14: Blink teleport sets player Y to ghost Y on release', () => {
    fc.assert(
      fc.property(
        playerEntityArb,
        pressedInputStateArb,
        releaseInputStateArb,
        fc.double({ min: 16, max: 100, noNaN: true, noDefaultInfinity: true }),
        (player, pressInput, releaseInput, deltaTime) => {
          const strategy = createBlinkPhysicsWithState();
          
          // First, simulate drag to set ghost position
          strategy.update(player, deltaTime, pressInput);
          
          // Get the ghost Y that was set during drag
          const ghostY = strategy.getState().ghostY;
          
          // Then release to teleport
          strategy.update(player, deltaTime, releaseInput);
          
          // Property: After release, player Y must equal ghost Y
          // This validates Requirements 5.3: Teleport to ghost position
          return player.y === ghostY;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('BlinkPhysics Behavior Tests', () => {
  beforeEach(() => {
    resetBlinkPhysics();
  });

  /**
   * Blink type should always be 'BLINK'
   */
  test('BlinkPhysics type equals BLINK', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_iterations) => {
          const strategy = createBlinkPhysics();
          return strategy.type === 'BLINK';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Blink gravity multiplier should always be 0
   * Requirements 5.1: No gravity (static Y)
   */
  test('BlinkPhysics gravity multiplier is 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_iterations) => {
          const strategy = createBlinkPhysics();
          return strategy.getGravityMultiplier() === BLINK_CONFIG.gravityMultiplier &&
                 strategy.getGravityMultiplier() === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Blink speed multiplier should always be 1.0
   */
  test('BlinkPhysics speed multiplier is 1.0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_iterations) => {
          const strategy = createBlinkPhysics();
          return strategy.getSpeedMultiplier() === BLINK_CONFIG.speedMultiplier &&
                 strategy.getSpeedMultiplier() === 1.0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Blink hitbox should be standard (1.0 scale)
   */
  test('BlinkPhysics hitbox is correctly scaled', () => {
    fc.assert(
      fc.property(
        playerEntityArb,
        (player) => {
          const strategy = createBlinkPhysics();
          const hitbox = strategy.getHitbox(player);
          
          const positionMatch = hitbox.x === player.x && hitbox.y === player.y;
          const widthMatch = hitbox.width === player.width * BLINK_CONFIG.hitboxScale;
          const heightMatch = hitbox.height === player.height * BLINK_CONFIG.hitboxScale;
          
          return positionMatch && widthMatch && heightMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Ghost Y should track input Y during drag
   * Requirements 5.2: Ghost position from InputState.y
   */
  test('BlinkPhysics ghost Y tracks input Y during drag', () => {
    fc.assert(
      fc.property(
        playerEntityArb,
        pressedInputStateArb,
        fc.double({ min: 16, max: 100, noNaN: true, noDefaultInfinity: true }),
        (player, input, deltaTime) => {
          const strategy = createBlinkPhysicsWithState();
          
          strategy.update(player, deltaTime, input);
          
          // Property: Ghost Y must equal input Y during drag
          // This validates Requirements 5.2: Ghost at drag position
          return strategy.getState().ghostY === input.y;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Collision during teleport should return IGNORE
   * Requirements 5.4: Ignore obstacles during teleport frame
   */
  test('BlinkPhysics collision returns IGNORE during teleport', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isFromAbove) => {
          const strategy = createBlinkPhysicsWithState();
          
          // Set teleporting state
          strategy.setTeleporting(true);
          
          // Property: During teleport, collision must return IGNORE
          // This validates Requirements 5.4: Ignore obstacles during teleport
          return strategy.resolveCollision(isFromAbove) === 'IGNORE';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Collision when not teleporting should return DAMAGE
   * Requirements 5.5: Non-teleport collisions trigger Second Chance
   */
  test('BlinkPhysics collision returns DAMAGE when not teleporting', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (isFromAbove) => {
          const strategy = createBlinkPhysicsWithState();
          
          // Ensure not teleporting
          strategy.setTeleporting(false);
          
          // Property: When not teleporting, collision must return DAMAGE
          // This validates Requirements 5.5: Non-teleport collisions trigger Second Chance
          return strategy.resolveCollision(isFromAbove) === 'DAMAGE';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Singleton should maintain consistent state
   */
  test('BlinkPhysics singleton maintains consistent type', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (iterations) => {
          for (let i = 0; i < iterations; i++) {
            const strategy = getBlinkPhysics();
            if (strategy.type !== 'BLINK') {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Without drag, teleport should not occur
   */
  test('BlinkPhysics does not teleport without prior drag', () => {
    fc.assert(
      fc.property(
        playerEntityArb,
        releaseInputStateArb,
        fc.double({ min: 16, max: 100, noNaN: true, noDefaultInfinity: true }),
        (player, input, deltaTime) => {
          const strategy = createBlinkPhysicsWithState();
          const originalY = player.y;
          
          // Release without prior drag
          strategy.update(player, deltaTime, input);
          
          // Property: Without drag, Y should remain unchanged
          return player.y === originalY;
        }
      ),
      { numRuns: 100 }
    );
  });
});
