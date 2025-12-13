/**
 * SecondChanceSystem - Manages Second Chance mechanic and Smart Bomb
 * 
 * When a Construct takes damage, it is destroyed and the player returns to Base Form
 * with temporary invincibility. Additionally, a Smart Bomb clears nearby obstacles.
 * 
 * Requirements:
 * - 6.1: WHEN a Construct takes damage THEN the Second Chance System SHALL destroy the Construct
 * - 6.2: WHEN a Construct is destroyed THEN the Second Chance System SHALL return player to Base Form
 * - 6.3: WHEN returning to Base Form THEN the Second Chance System SHALL grant 2 seconds of invincibility
 * - 6.7: WHEN a Construct is destroyed THEN the Smart Bomb System SHALL destroy all obstacles within 500px radius
 */

import type { ConstructType, Obstacle } from '../types';
import { resetBlinkPhysics } from './constructs/BlinkPhysics';
import {
    CONSTRUCT_SYSTEM_CONFIG,
    type ConstructSystemState
} from './constructs/ConstructSystem';
import { resetPhasePhysics } from './constructs/PhasePhysics';
import { getStandardPhysics } from './constructs/StandardPhysics';
import { resetTitanPhysics } from './constructs/TitanPhysics';

/**
 * Configuration for the Second Chance System
 * Requirements 6.3, 6.7: Define invincibility duration and smart bomb radius
 */
export interface SecondChanceConfig {
  /** Duration of invincibility after Second Chance (ms) - Requirements 6.3 */
  invincibilityDuration: number;
  /** Radius for Smart Bomb obstacle clearing (px) - Requirements 6.7 */
  smartBombRadius: number;
  /** Whether Smart Bomb is enabled */
  enableSmartBomb: boolean;
}

/**
 * Default configuration for Second Chance System
 */
export const DEFAULT_SECOND_CHANCE_CONFIG: SecondChanceConfig = {
  invincibilityDuration: CONSTRUCT_SYSTEM_CONFIG.secondChanceInvincibilityDuration,
  smartBombRadius: 500,
  enableSmartBomb: true,
};

/**
 * Result of processing Second Chance
 */
export interface SecondChanceResult {
  /** Updated construct system state */
  newState: ConstructSystemState;
  /** Whether the game should end (no second chance available) */
  gameOver: boolean;
  /** IDs of obstacles to destroy via Smart Bomb */
  obstaclesToDestroy: string[];
  /** Whether Second Chance was triggered */
  secondChanceTriggered: boolean;
}

/**
 * Get all obstacles within a given radius of a center point
 * Requirements 6.7: Smart Bomb destroys obstacles within 500px radius
 * 
 * @param obstacles - Array of obstacles to check
 * @param centerX - X coordinate of the center point (player position)
 * @param radius - Radius to check within
 * @returns Array of obstacles within the radius
 */
export function getObstaclesInRadius(
  obstacles: Obstacle[],
  centerX: number,
  radius: number
): Obstacle[] {
  return obstacles.filter(obstacle => {
    // Calculate distance from center to obstacle center
    const obstacleCenter = obstacle.x + obstacle.width / 2;
    const distance = Math.abs(obstacleCenter - centerX);
    return distance <= radius;
  });
}

/**
 * Process damage taken by the player
 * Requirements 6.1, 6.2, 6.3, 6.7: Handle Second Chance mechanic
 * 
 * If a Construct is active:
 * - Destroy the Construct (6.1)
 * - Return to Base Form (6.2)
 * - Grant invincibility (6.3)
 * - Trigger Smart Bomb (6.7)
 * 
 * If in Base Form:
 * - Game Over
 * 
 * @param state - Current construct system state
 * @param currentTime - Current timestamp in milliseconds
 * @param obstacles - Array of current obstacles
 * @param playerX - Player's X position for Smart Bomb calculation
 * @param config - Second Chance configuration
 * @returns SecondChanceResult with new state and obstacles to destroy
 */
export function takeDamage(
  state: ConstructSystemState,
  currentTime: number,
  obstacles: Obstacle[],
  playerX: number,
  config: SecondChanceConfig = DEFAULT_SECOND_CHANCE_CONFIG
): SecondChanceResult {
  // If already in Base Form, no second chance available - game over
  if (state.activeConstruct === 'NONE') {
    return {
      newState: state,
      gameOver: true,
      obstaclesToDestroy: [],
      secondChanceTriggered: false,
    };
  }

  // Requirements 6.1, 6.2: Destroy Construct and return to Base Form
  // Reset all physics singletons
  resetTitanPhysics();
  resetPhasePhysics();
  resetBlinkPhysics();

  // Requirements 6.3: Grant invincibility
  const newInvulnerabilityEndTime = currentTime + config.invincibilityDuration;

  const newState: ConstructSystemState = {
    activeConstruct: 'NONE',
    isInvulnerable: true,
    invulnerabilityEndTime: newInvulnerabilityEndTime,
    currentStrategy: getStandardPhysics(),
  };

  // Requirements 6.7: Smart Bomb - destroy obstacles within radius
  let obstaclesToDestroy: string[] = [];
  if (config.enableSmartBomb) {
    const obstaclesInRadius = getObstaclesInRadius(obstacles, playerX, config.smartBombRadius);
    obstaclesToDestroy = obstaclesInRadius.map(o => o.id);
  }

  return {
    newState,
    gameOver: false,
    obstaclesToDestroy,
    secondChanceTriggered: true,
  };
}

/**
 * Process Second Chance - convenience wrapper for takeDamage
 * Provides a cleaner API for the common use case
 * 
 * @param state - Current construct system state
 * @param currentTime - Current timestamp in milliseconds
 * @param obstacles - Array of current obstacles
 * @param playerX - Player's X position for Smart Bomb calculation
 * @param config - Second Chance configuration
 * @returns SecondChanceResult
 */
export function processSecondChance(
  state: ConstructSystemState,
  currentTime: number,
  obstacles: Obstacle[],
  playerX: number,
  config: SecondChanceConfig = DEFAULT_SECOND_CHANCE_CONFIG
): SecondChanceResult {
  return takeDamage(state, currentTime, obstacles, playerX, config);
}

/**
 * Check if Second Chance is available (Construct is active)
 * 
 * @param state - Current construct system state
 * @returns true if a Construct is active and can absorb damage
 */
export function hasSecondChance(state: ConstructSystemState): boolean {
  return state.activeConstruct !== 'NONE';
}

/**
 * Get the current active construct type
 * 
 * @param state - Current construct system state
 * @returns The active construct type
 */
export function getActiveConstruct(state: ConstructSystemState): ConstructType {
  return state.activeConstruct;
}
