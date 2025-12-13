/**
 * Property-Based Tests for SecondChanceSystem
 * Uses fast-check for property-based testing
 * 
 * Tests Property 15 and Property 18 from the design document:
 * - Property 15: Second Chance State Transition
 * - Property 18: Smart Bomb Obstacle Clearing
 */

import * as fc from 'fast-check';
import { beforeEach, describe, expect, test } from 'vitest';
import type { ConstructType, Obstacle } from '../types';
import { resetBlinkPhysics } from './constructs/BlinkPhysics';
import {
    createConstructSystemState,
    transformTo,
} from './constructs/ConstructSystem';
import { resetPhasePhysics } from './constructs/PhasePhysics';
import { resetTitanPhysics } from './constructs/TitanPhysics';
import {
    DEFAULT_SECOND_CHANCE_CONFIG,
    getObstaclesInRadius,
    hasSecondChance,
    processSecondChance,
    takeDamage,
    type SecondChanceConfig,
} from './SecondChanceSystem';

/**
 * Generate a valid active ConstructType (not NONE)
 */
const activeConstructTypeArb = fc.constantFrom<ConstructType>('TITAN', 'PHASE', 'BLINK');

/**
 * Generate a valid timestamp (positive integer)
 */
const timestampArb = fc.integer({ min: 0, max: 1_000_000_000 });

/**
 * Generate a valid player X position
 */
const playerXArb = fc.integer({ min: 0, max: 1000 });

/**
 * Generate a valid obstacle for testing
 */
const obstacleArb = fc.record({
  id: fc.uuid(),
  x: fc.integer({ min: 0, max: 2000 }),
  y: fc.integer({ min: 0, max: 600 }),
  targetY: fc.integer({ min: 0, max: 600 }),
  width: fc.integer({ min: 20, max: 100 }),
  height: fc.integer({ min: 20, max: 200 }),
  lane: fc.constantFrom<'top' | 'bottom'>('top', 'bottom'),
  polarity: fc.constantFrom<'white' | 'black'>('white', 'black'),
  passed: fc.boolean(),
});

/**
 * Generate an array of obstacles
 */
const obstaclesArb = fc.array(obstacleArb, { minLength: 0, maxLength: 20 });

/**
 * Generate a valid SecondChanceConfig
 */
const configArb = fc.record({
  invincibilityDuration: fc.integer({ min: 1000, max: 5000 }),
  smartBombRadius: fc.integer({ min: 100, max: 1000 }),
  enableSmartBomb: fc.boolean(),
});

describe('SecondChanceSystem Property Tests', () => {
  beforeEach(() => {
    // Reset all physics singletons before each test
    resetTitanPhysics();
    resetPhasePhysics();
    resetBlinkPhysics();
  });

  /**
   * **Feature: echo-constructs, Property 15: Second Chance State Transition**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * For any damage while Construct is active, activeConstruct SHALL become 'NONE'.
   * 
   * This property verifies that:
   * 1. When a Construct takes damage, it is destroyed (activeConstruct becomes 'NONE')
   * 2. Player returns to Base Form
   * 3. Player receives invincibility
   */
  test('Property 15: Damage while Construct active transitions to NONE', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        timestampArb,
        obstaclesArb,
        playerXArb,
        (constructType, transformTime, damageTime, obstacles, playerX) => {
          // Ensure damage happens after transformation
          const actualDamageTime = transformTime + damageTime;
          
          // Create initial state and transform to a Construct
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          // Verify we have an active Construct
          if (transformedState.activeConstruct === 'NONE') {
            return false;
          }
          
          // Take damage
          const result = takeDamage(
            transformedState,
            actualDamageTime,
            obstacles,
            playerX
          );
          
          // Requirements 6.1, 6.2: Construct destroyed, return to Base Form
          const transitionedToNone = result.newState.activeConstruct === 'NONE';
          
          // Requirements 6.3: Invincibility granted
          const hasInvincibility = result.newState.isInvulnerable === true;
          
          // Game should not be over (Second Chance used)
          const notGameOver = result.gameOver === false;
          
          // Second Chance was triggered
          const secondChanceTriggered = result.secondChanceTriggered === true;
          
          return transitionedToNone && hasInvincibility && notGameOver && secondChanceTriggered;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 15: Second Chance State Transition**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * Verifies that damage in Base Form results in game over (no Second Chance).
   */
  test('Property 15: Damage in Base Form results in game over', () => {
    fc.assert(
      fc.property(
        timestampArb,
        obstaclesArb,
        playerXArb,
        (currentTime, obstacles, playerX) => {
          // Create initial state (Base Form)
          const baseFormState = createConstructSystemState();
          
          // Verify we're in Base Form
          if (baseFormState.activeConstruct !== 'NONE') {
            return false;
          }
          
          // Take damage in Base Form
          const result = takeDamage(
            baseFormState,
            currentTime,
            obstacles,
            playerX
          );
          
          // Game should be over (no Second Chance available)
          const isGameOver = result.gameOver === true;
          
          // Second Chance was NOT triggered
          const noSecondChance = result.secondChanceTriggered === false;
          
          // State should remain unchanged
          const stateUnchanged = result.newState.activeConstruct === 'NONE';
          
          return isGameOver && noSecondChance && stateUnchanged;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 15: Second Chance State Transition**
   * **Validates: Requirements 6.3**
   *
   * Verifies that invincibility duration is correctly set after Second Chance.
   */
  test('Property 15: Invincibility duration is correctly set', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        timestampArb,
        obstaclesArb,
        playerXArb,
        configArb,
        (constructType, transformTime, damageTime, obstacles, playerX, config) => {
          const actualDamageTime = transformTime + damageTime;
          
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          const result = takeDamage(
            transformedState,
            actualDamageTime,
            obstacles,
            playerX,
            config
          );
          
          // Invincibility end time should be damageTime + config.invincibilityDuration
          const expectedEndTime = actualDamageTime + config.invincibilityDuration;
          const correctEndTime = result.newState.invulnerabilityEndTime === expectedEndTime;
          
          return correctEndTime;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 15: Second Chance State Transition**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * Verifies that all Construct types trigger Second Chance correctly.
   */
  test('Property 15: All Construct types trigger Second Chance', () => {
    fc.assert(
      fc.property(
        timestampArb,
        timestampArb,
        obstaclesArb,
        playerXArb,
        (transformTime, damageTime, obstacles, playerX) => {
          const constructTypes: ConstructType[] = ['TITAN', 'PHASE', 'BLINK'];
          const actualDamageTime = transformTime + damageTime;
          
          for (const constructType of constructTypes) {
            // Reset singletons for each construct type
            resetTitanPhysics();
            resetPhasePhysics();
            resetBlinkPhysics();
            
            const initialState = createConstructSystemState();
            const transformedState = transformTo(initialState, constructType, transformTime);
            
            const result = takeDamage(
              transformedState,
              actualDamageTime,
              obstacles,
              playerX
            );
            
            // All constructs should transition to NONE
            if (result.newState.activeConstruct !== 'NONE') {
              return false;
            }
            
            // All constructs should grant invincibility
            if (!result.newState.isInvulnerable) {
              return false;
            }
            
            // All constructs should not cause game over
            if (result.gameOver) {
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
   * Verify hasSecondChance helper function
   */
  test('hasSecondChance returns true for active Constructs', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        (constructType, transformTime) => {
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          return hasSecondChance(transformedState) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify hasSecondChance returns false for Base Form
   */
  test('hasSecondChance returns false for Base Form', () => {
    const baseFormState = createConstructSystemState();
    expect(hasSecondChance(baseFormState)).toBe(false);
  });
});

describe('SecondChanceSystem Smart Bomb Property Tests', () => {
  beforeEach(() => {
    resetTitanPhysics();
    resetPhasePhysics();
    resetBlinkPhysics();
  });

  /**
   * **Feature: echo-constructs, Property 18: Smart Bomb Obstacle Clearing**
   * **Validates: Requirements 6.7**
   *
   * For any Second Chance trigger, all obstacles within smartBombRadius (500px)
   * of player SHALL be destroyed.
   * 
   * This property verifies that:
   * 1. All obstacles within the radius are included in obstaclesToDestroy
   * 2. No obstacles outside the radius are included
   */
  test('Property 18: Smart Bomb destroys all obstacles within radius', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        timestampArb,
        obstaclesArb,
        playerXArb,
        (constructType, transformTime, damageTime, obstacles, playerX) => {
          const actualDamageTime = transformTime + damageTime;
          const radius = DEFAULT_SECOND_CHANCE_CONFIG.smartBombRadius;
          
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          const result = takeDamage(
            transformedState,
            actualDamageTime,
            obstacles,
            playerX
          );
          
          // Calculate which obstacles should be destroyed
          const expectedObstacles = obstacles.filter(o => {
            const obstacleCenter = o.x + o.width / 2;
            const distance = Math.abs(obstacleCenter - playerX);
            return distance <= radius;
          });
          
          const expectedIds = expectedObstacles.map(o => o.id).sort();
          const actualIds = result.obstaclesToDestroy.sort();
          
          // All obstacles within radius should be destroyed
          if (expectedIds.length !== actualIds.length) {
            return false;
          }
          
          for (let i = 0; i < expectedIds.length; i++) {
            if (expectedIds[i] !== actualIds[i]) {
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
   * **Feature: echo-constructs, Property 18: Smart Bomb Obstacle Clearing**
   * **Validates: Requirements 6.7**
   *
   * Verifies that obstacles outside the radius are NOT destroyed.
   */
  test('Property 18: Obstacles outside radius are not destroyed', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        fc.integer({ min: 100, max: 500 }), // radius
        playerXArb,
        (constructType, transformTime, radius, playerX) => {
          // Create obstacles specifically outside the radius
          const outsideObstacles: Obstacle[] = [
            {
              id: 'outside-1',
              x: playerX + radius + 100, // Definitely outside
              y: 100,
              targetY: 100,
              width: 50,
              height: 100,
              lane: 'top',
              polarity: 'white',
              passed: false,
            },
            {
              id: 'outside-2',
              x: playerX - radius - 200, // Definitely outside (negative direction)
              y: 200,
              targetY: 200,
              width: 50,
              height: 100,
              lane: 'bottom',
              polarity: 'black',
              passed: false,
            },
          ];
          
          const config: SecondChanceConfig = {
            invincibilityDuration: 2000,
            smartBombRadius: radius,
            enableSmartBomb: true,
          };
          
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          const result = takeDamage(
            transformedState,
            transformTime + 1000,
            outsideObstacles,
            playerX,
            config
          );
          
          // No obstacles should be destroyed (all are outside radius)
          return result.obstaclesToDestroy.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 18: Smart Bomb Obstacle Clearing**
   * **Validates: Requirements 6.7**
   *
   * Verifies that Smart Bomb can be disabled via config.
   */
  test('Property 18: Smart Bomb can be disabled', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        obstaclesArb,
        playerXArb,
        (constructType, transformTime, obstacles, playerX) => {
          const config: SecondChanceConfig = {
            invincibilityDuration: 2000,
            smartBombRadius: 500,
            enableSmartBomb: false, // Disabled
          };
          
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          const result = takeDamage(
            transformedState,
            transformTime + 1000,
            obstacles,
            playerX,
            config
          );
          
          // No obstacles should be destroyed when Smart Bomb is disabled
          return result.obstaclesToDestroy.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 18: Smart Bomb Obstacle Clearing**
   * **Validates: Requirements 6.7**
   *
   * Verifies that Smart Bomb radius is configurable.
   */
  test('Property 18: Smart Bomb radius is configurable', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        fc.integer({ min: 100, max: 1000 }), // configurable radius
        playerXArb,
        (constructType, transformTime, radius, playerX) => {
          // Create obstacles at specific distances
          const obstacles: Obstacle[] = [
            {
              id: 'inside',
              x: playerX + radius / 2 - 25, // Inside radius (center at playerX + radius/2)
              y: 100,
              targetY: 100,
              width: 50,
              height: 100,
              lane: 'top',
              polarity: 'white',
              passed: false,
            },
            {
              id: 'outside',
              x: playerX + radius + 100, // Outside radius
              y: 200,
              targetY: 200,
              width: 50,
              height: 100,
              lane: 'bottom',
              polarity: 'black',
              passed: false,
            },
          ];
          
          const config: SecondChanceConfig = {
            invincibilityDuration: 2000,
            smartBombRadius: radius,
            enableSmartBomb: true,
          };
          
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          
          const result = takeDamage(
            transformedState,
            transformTime + 1000,
            obstacles,
            playerX,
            config
          );
          
          // Only the inside obstacle should be destroyed
          const hasInside = result.obstaclesToDestroy.includes('inside');
          const hasOutside = result.obstaclesToDestroy.includes('outside');
          
          return hasInside && !hasOutside;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Verify getObstaclesInRadius helper function
   */
  test('getObstaclesInRadius returns correct obstacles', () => {
    fc.assert(
      fc.property(
        obstaclesArb,
        playerXArb,
        fc.integer({ min: 100, max: 1000 }),
        (obstacles, centerX, radius) => {
          const result = getObstaclesInRadius(obstacles, centerX, radius);
          
          // All returned obstacles should be within radius
          for (const obstacle of result) {
            const obstacleCenter = obstacle.x + obstacle.width / 2;
            const distance = Math.abs(obstacleCenter - centerX);
            if (distance > radius) {
              return false;
            }
          }
          
          // All obstacles within radius should be returned
          for (const obstacle of obstacles) {
            const obstacleCenter = obstacle.x + obstacle.width / 2;
            const distance = Math.abs(obstacleCenter - centerX);
            if (distance <= radius && !result.includes(obstacle)) {
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
   * Verify processSecondChance is equivalent to takeDamage
   */
  test('processSecondChance is equivalent to takeDamage', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        timestampArb,
        obstaclesArb,
        playerXArb,
        (constructType, transformTime, obstacles, playerX) => {
          const initialState = createConstructSystemState();
          const transformedState = transformTo(initialState, constructType, transformTime);
          const damageTime = transformTime + 1000;
          
          const takeDamageResult = takeDamage(
            transformedState,
            damageTime,
            obstacles,
            playerX
          );
          
          // Reset singletons for second call
          resetTitanPhysics();
          resetPhasePhysics();
          resetBlinkPhysics();
          
          const transformedState2 = transformTo(createConstructSystemState(), constructType, transformTime);
          
          const processResult = processSecondChance(
            transformedState2,
            damageTime,
            obstacles,
            playerX
          );
          
          // Results should be equivalent
          return (
            takeDamageResult.gameOver === processResult.gameOver &&
            takeDamageResult.secondChanceTriggered === processResult.secondChanceTriggered &&
            takeDamageResult.newState.activeConstruct === processResult.newState.activeConstruct &&
            takeDamageResult.newState.isInvulnerable === processResult.newState.isInvulnerable &&
            takeDamageResult.obstaclesToDestroy.length === processResult.obstaclesToDestroy.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
