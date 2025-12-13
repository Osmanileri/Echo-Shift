/**
 * Property-Based Tests for TitanPhysics
 * Uses fast-check for property-based testing
 * 
 * Tests Properties 7, 8, 9 from the design document
 */

import * as fc from 'fast-check';
import { beforeEach, describe, test } from 'vitest';
import { createTitanPhysics, getTitanPhysics, resetTitanPhysics, TITAN_CONFIG } from './TitanPhysics';

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
 * Generate an InputState with tap frame active (for stomp testing)
 */
const tapInputStateArb = fc.record({
  isPressed: fc.constant(true),
  y: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
  isTapFrame: fc.constant(true),
  isReleaseFrame: fc.constant(false),
});

/**
 * Generate an InputState without tap frame (no stomp)
 */
const noTapInputStateArb = fc.record({
  isPressed: fc.boolean(),
  y: fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
  isTapFrame: fc.constant(false),
  isReleaseFrame: fc.boolean(),
});

describe('TitanPhysics Property Tests', () => {
  beforeEach(() => {
    resetTitanPhysics();
  });

  /**
   * **Feature: echo-constructs, Property 7: Titan Gravity Multiplier**
   * **Validates: Requirements 3.1**
   *
   * For any physics update while Titan is active, gravity SHALL equal base * 2.5.
   */
  test('Property 7: Titan gravity multiplier is always 2.5', () => {
    fc.assert(
      fc.property(
        playerEntityArb,
        inputStateArb,
        fc.double({ min: 0, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (_player, _input, _deltaTime) => {
          const strategy = createTitanPhysics();
          
          // Property: Titan gravity multiplier must always be 2.5
          // This validates Requirements 3.1: 2.5x gravity multiplier
          return strategy.getGravityMultiplier() === TITAN_CONFIG.gravityMultiplier &&
                 strategy.getGravityMultiplier() === 2.5;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 8: Titan Stomp Velocity**
   * **Validates: Requirements 3.2**
   *
   * For any tap while Titan is active, velocity SHALL be set to STOMP_VELOCITY.
   */
  test('Property 8: Titan stomp sets velocity to stompVelocity on tap', () => {
    fc.assert(
      fc.property(
        playerEntityArb,
        tapInputStateArb,
        fc.double({ min: 16, max: 100, noNaN: true, noDefaultInfinity: true }),
        (player, input, deltaTime) => {
          const strategy = createTitanPhysics();
          
          // Call update with tap input
          strategy.update(player, deltaTime, input);
          
          // Property: After tap, velocity must equal stompVelocity
          // This validates Requirements 3.2: Stomp triggers instant max fall velocity
          return player.velocity === TITAN_CONFIG.stompVelocity;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 9: Titan Stomp Destroys Obstacles**
   * **Validates: Requirements 3.3**
   *
   * For any stomp collision from above, obstacle SHALL be destroyed.
   */
  test('Property 9: Titan collision from above returns DESTROY', () => {
    fc.assert(
      fc.property(
        fc.constant(true), // isFromAbove = true
        (_isFromAbove) => {
          const strategy = createTitanPhysics();
          
          // Property: Collision from above must return DESTROY
          // This validates Requirements 3.3: Stomp destroys obstacles
          return strategy.resolveCollision(true) === 'DESTROY';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test for Requirements 3.4:
   * Side collisions should return DAMAGE (trigger Second Chance)
   */
  test('Titan collision from side returns DAMAGE', () => {
    fc.assert(
      fc.property(
        fc.constant(false), // isFromAbove = false
        (_isFromAbove) => {
          const strategy = createTitanPhysics();
          
          // Property: Collision from side must return DAMAGE
          // This validates Requirements 3.4: Side collisions trigger Second Chance
          return strategy.resolveCollision(false) === 'DAMAGE';
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('TitanPhysics Behavior Tests', () => {
  beforeEach(() => {
    resetTitanPhysics();
  });

  /**
   * Titan type should always be 'TITAN'
   */
  test('TitanPhysics type equals TITAN', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_iterations) => {
          const strategy = createTitanPhysics();
          return strategy.type === 'TITAN';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Titan speed multiplier should always be 1.0
   */
  test('TitanPhysics speed multiplier is 1.0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (_iterations) => {
          const strategy = createTitanPhysics();
          return strategy.getSpeedMultiplier() === TITAN_CONFIG.speedMultiplier &&
                 strategy.getSpeedMultiplier() === 1.0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Titan hitbox should be scaled by hitboxScale
   */
  test('TitanPhysics hitbox is correctly scaled', () => {
    fc.assert(
      fc.property(
        playerEntityArb,
        (player) => {
          const strategy = createTitanPhysics();
          const hitbox = strategy.getHitbox(player);
          
          const positionMatch = hitbox.x === player.x && hitbox.y === player.y;
          const widthMatch = hitbox.width === player.width * TITAN_CONFIG.hitboxScale;
          const heightMatch = hitbox.height === player.height * TITAN_CONFIG.hitboxScale;
          
          return positionMatch && widthMatch && heightMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Without tap, velocity should not be modified to stompVelocity
   */
  test('TitanPhysics does not stomp without tap', () => {
    fc.assert(
      fc.property(
        playerEntityArb,
        noTapInputStateArb,
        fc.double({ min: 16, max: 100, noNaN: true, noDefaultInfinity: true }),
        (player, input, deltaTime) => {
          const strategy = createTitanPhysics();
          const originalVelocity = player.velocity;
          
          strategy.update(player, deltaTime, input);
          
          // Without tap, velocity should remain unchanged
          return player.velocity === originalVelocity;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Singleton should maintain consistent state
   */
  test('TitanPhysics singleton maintains consistent type', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (iterations) => {
          for (let i = 0; i < iterations; i++) {
            const strategy = getTitanPhysics();
            if (strategy.type !== 'TITAN') {
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
