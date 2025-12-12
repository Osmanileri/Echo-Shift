/**
 * Phantom Obstacle System
 * 
 * Handles phantom (latent) obstacles that start transparent and become visible
 * as they approach the player.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8, 5.10
 */

import { Obstacle } from '../types';
import { PHANTOM_CONFIG } from '../constants';

/**
 * Configuration interface for phantom system
 */
export interface PhantomConfig {
  activationScore: number;        // Score threshold for phantom spawning (500)
  revealDistance: number;         // Distance at which obstacle becomes fully visible (300px)
  baseSpawnProbability: number;   // Base spawn probability (0.10)
  maxSpawnProbability: number;    // Maximum spawn probability (0.40)
  probabilityMaxScore: number;    // Score at which max probability is reached (5000)
  minOpacity: number;             // Minimum opacity for ghost outline (0.05)
  bonusPoints: number;            // Bonus points for passing phantom (20)
  nearMissMultiplier: number;     // Near miss multiplier (2)
}

/**
 * Calculates the opacity of a phantom obstacle based on its current position.
 * 
 * Formula: α = max(0, min(1, (X_current - RevealDistance) / (X_initial - RevealDistance)))
 * 
 * Requirements: 5.3
 * 
 * @param currentX - Current X position of the obstacle
 * @param initialX - Initial X position when the obstacle spawned
 * @param revealDistance - Distance at which obstacle becomes fully visible
 * @returns Opacity value between 0 and 1
 */
export function calculatePhantomOpacity(
  currentX: number,
  initialX: number,
  revealDistance: number
): number {
  // Avoid division by zero
  if (initialX <= revealDistance) {
    return 1;
  }
  
  const opacity = (currentX - revealDistance) / (initialX - revealDistance);
  return Math.max(0, Math.min(1, opacity));
}

/**
 * Applies minimum opacity threshold to ensure phantom obstacles always have
 * a visible "ghost" outline.
 * 
 * Requirements: 5.4
 * 
 * @param calculatedOpacity - The calculated opacity value
 * @param minOpacity - Minimum opacity threshold (default: 0.05)
 * @returns Effective opacity value (at least minOpacity)
 */
export function getEffectiveOpacity(
  calculatedOpacity: number,
  minOpacity: number = PHANTOM_CONFIG.minOpacity
): number {
  return Math.max(minOpacity, calculatedOpacity);
}


/**
 * Calculates the spawn probability for phantom obstacles based on current score.
 * 
 * Formula: P = min(0.40, 0.10 + 0.30 × (Score - 500) / 4500) for scores above 500
 * 
 * Requirements: 5.8, 5.11
 * 
 * @param score - Current player score
 * @param config - Phantom configuration
 * @returns Spawn probability between 0 and maxSpawnProbability
 */
export function calculatePhantomSpawnProbability(
  score: number,
  config: PhantomConfig = PHANTOM_CONFIG
): number {
  // No phantom spawning below activation score
  if (score <= config.activationScore) {
    return 0;
  }
  
  const scoreAboveThreshold = score - config.activationScore;
  const scoreRange = config.probabilityMaxScore - config.activationScore;
  const probabilityRange = config.maxSpawnProbability - config.baseSpawnProbability;
  
  const probability = config.baseSpawnProbability + 
    probabilityRange * (scoreAboveThreshold / scoreRange);
  
  return Math.min(config.maxSpawnProbability, probability);
}

/**
 * Determines whether a new obstacle should spawn as a phantom obstacle.
 * 
 * Requirements: 5.1
 * 
 * @param score - Current player score
 * @param config - Phantom configuration
 * @returns True if the obstacle should be a phantom
 */
export function shouldSpawnAsPhantom(
  score: number,
  config: PhantomConfig = PHANTOM_CONFIG
): boolean {
  // Phantom spawning is disabled below activation score
  if (score <= config.activationScore) {
    return false;
  }
  
  const probability = calculatePhantomSpawnProbability(score, config);
  return Math.random() < probability;
}

/**
 * Calculates the bonus points for passing a phantom obstacle.
 * 
 * Requirements: 5.7, 5.10
 * 
 * @param isNearMiss - Whether the pass was a near miss
 * @param config - Phantom configuration
 * @returns Bonus points (20 for normal pass, 40 for near miss)
 */
export function calculatePhantomBonus(
  isNearMiss: boolean,
  config: PhantomConfig = PHANTOM_CONFIG
): number {
  if (isNearMiss) {
    return config.bonusPoints * config.nearMissMultiplier;
  }
  return config.bonusPoints;
}

/**
 * Creates a phantom obstacle from a base obstacle.
 * 
 * Requirements: 5.2
 * 
 * @param baseObstacle - The base obstacle to convert
 * @param canvasWidth - Width of the canvas (used as initial X)
 * @param config - Phantom configuration
 * @returns A new obstacle with phantom properties set
 */
export function createPhantomObstacle(
  baseObstacle: Obstacle,
  canvasWidth: number,
  config: PhantomConfig = PHANTOM_CONFIG
): Obstacle {
  return {
    ...baseObstacle,
    isLatent: true,
    revealDistance: config.revealDistance,
    initialX: canvasWidth,
  };
}
