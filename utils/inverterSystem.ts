/**
 * Inverter / Color-Shift Obstacle System
 * 
 * Handles obstacles that invert their color/polarity (White <-> Black)
 * at a specific distance before reaching the player.
 */

import { INVERTER_CONFIG } from '../constants';
import { Obstacle } from '../types';

export interface InverterConfig {
  baseSpawnProbability: number;
  phantomInvertProbability: number;
  invertDistance: number;
  warningDistance: number;
  bonusPoints: number;
}

/**
 * Determines whether a new obstacle should spawn as an inverter obstacle.
 */
export function shouldSpawnAsInverter(
  score: number,
  isPhantom: boolean = false,
  rng: () => number = Math.random,
  config: InverterConfig = INVERTER_CONFIG
): boolean {
  // Inverter / Color swap feature ONLY unlocks after 500 meters (score >= 500)
  if (score < 500) {
    return false;
  }
  const probability = isPhantom
    ? config.phantomInvertProbability
    : config.baseSpawnProbability;
  return rng() < probability;
}

/**
 * Checks whether an obstacle is ready to invert its polarity.
 */
export function shouldInvertPolarity(
  obstacle: Obstacle,
  invertX: number = INVERTER_CONFIG.invertDistance
): boolean {
  return (
    !!obstacle.isInverting &&
    !obstacle.hasInverted &&
    obstacle.x <= (obstacle.invertX ?? invertX)
  );
}

/**
 * Executes the polarity inversion on an obstacle.
 */
export function invertObstaclePolarity(obstacle: Obstacle, currentTime: number): void {
  obstacle.polarity = obstacle.polarity === 'white' ? 'black' : 'white';
  obstacle.hasInverted = true;
  obstacle.invertTime = currentTime;
}
