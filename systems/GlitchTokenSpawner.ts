/**
 * GlitchTokenSpawner - Manages Glitch Token spawning for Echo Constructs
 * 
 * Glitch Tokens are collectible items that transform the player into Constructs.
 * They spawn after a minimum score threshold with a probability per spawn cycle.
 * 
 * Requirements:
 * - 1.1: WHEN the score exceeds 500 THEN the Spawn System SHALL begin spawning Glitch Tokens with 3% probability
 * - 1.2: WHEN a Glitch Token spawns THEN the Token System SHALL place it in a safe lane position
 * - 1.3: WHEN the player collides with a Glitch Token THEN the Token System SHALL trigger Construct transformation
 * - 1.4: WHEN a Glitch Token is collected THEN the Token System SHALL select a random Construct from unlocked pool
 * - 1.5: WHEN no Constructs are unlocked THEN the Token System SHALL NOT spawn Glitch Tokens
 * - 1.6: WHEN a Construct is already active THEN the Token System SHALL NOT spawn additional Glitch Tokens
 */

import type { ConstructType, Obstacle } from '../types';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration for Glitch Token spawning
 * Requirements 1.1: Define spawn parameters
 */
export interface GlitchTokenSpawnerConfig {
  /** Minimum score required to start spawning tokens - Requirements 1.1 */
  minScore: number;
  /** Probability of spawning a token per spawn cycle (0-1) - Requirements 1.1 */
  probability: number;
  /** Token collision radius for collection detection */
  collectionRadius: number;
  /** Token visual size */
  tokenSize: number;
  /** Minimum distance from obstacles for safe positioning - Requirements 1.2 */
  safeDistance: number;
}

/**
 * Represents a Glitch Token in the game world
 * Requirements 1.2, 1.3: Token with position and construct type
 */
export interface GlitchToken {
  /** Unique identifier */
  id: string;
  /** X position in game world */
  x: number;
  /** Y position in game world */
  y: number;
  /** The construct type this token will grant */
  constructType: ConstructType;
  /** Whether the token has been collected */
  collected: boolean;
  /** Spawn timestamp for animations */
  spawnTime: number;
}

/**
 * Result of spawn decision
 */
export interface SpawnDecision {
  /** Whether a token should spawn */
  shouldSpawn: boolean;
  /** Reason for the decision (for debugging) */
  reason: string;
}

/**
 * Result of position calculation
 */
export interface TokenPosition {
  x: number;
  y: number;
  isSafe: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration for Glitch Token spawning
 * Requirements 1.1: minScore = 500, probability = 0.03 (3%)
 */
export const DEFAULT_GLITCH_TOKEN_CONFIG: GlitchTokenSpawnerConfig = {
  minScore: 500,
  probability: 0.03,
  collectionRadius: 40,
  tokenSize: 30,
  safeDistance: 50,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Determine if a Glitch Token should spawn this cycle
 * 
 * Requirements:
 * - 1.1: Score must exceed minScore (500) for spawning to begin
 * - 1.5: No spawn if unlockedConstructs is empty
 * - 1.6: No spawn if a Construct is already active
 * 
 * @param score - Current game score
 * @param activeConstruct - Currently active construct type
 * @param unlockedConstructs - Array of unlocked construct types
 * @param config - Spawner configuration
 * @param rand - Random number generator (0-1), defaults to Math.random
 * @returns SpawnDecision with shouldSpawn and reason
 */
export function shouldSpawnToken(
  score: number,
  activeConstruct: ConstructType,
  unlockedConstructs: ConstructType[],
  config: GlitchTokenSpawnerConfig = DEFAULT_GLITCH_TOKEN_CONFIG,
  rand: () => number = Math.random
): SpawnDecision {
  // Requirements 1.5: No spawn if no constructs are unlocked
  // Filter out 'NONE' from unlocked constructs as it's not a valid construct
  const validConstructs = unlockedConstructs.filter(c => c !== 'NONE');
  if (validConstructs.length === 0) {
    return {
      shouldSpawn: false,
      reason: 'No constructs unlocked',
    };
  }

  // Requirements 1.6: No spawn if a Construct is already active
  if (activeConstruct !== 'NONE') {
    return {
      shouldSpawn: false,
      reason: 'Construct already active',
    };
  }

  // Requirements 1.1: Score must exceed minScore
  if (score < config.minScore) {
    return {
      shouldSpawn: false,
      reason: `Score ${score} below minimum ${config.minScore}`,
    };
  }

  // Requirements 1.1: 3% probability per spawn cycle
  const roll = rand();
  if (roll >= config.probability) {
    return {
      shouldSpawn: false,
      reason: `Random roll ${roll.toFixed(3)} >= probability ${config.probability}`,
    };
  }

  return {
    shouldSpawn: true,
    reason: 'All conditions met',
  };
}

/**
 * Check if a position overlaps with any obstacle
 * 
 * @param x - X position to check
 * @param y - Y position to check
 * @param obstacles - Array of obstacles to check against
 * @param safeDistance - Minimum distance from obstacles
 * @returns true if position overlaps with an obstacle
 */
export function isPositionOverlappingObstacle(
  x: number,
  y: number,
  obstacles: Obstacle[],
  safeDistance: number
): boolean {
  for (const obstacle of obstacles) {
    // Check if position is within obstacle bounds + safe distance
    const left = obstacle.x - safeDistance;
    const right = obstacle.x + obstacle.width + safeDistance;
    const top = obstacle.y - safeDistance;
    const bottom = obstacle.y + obstacle.height + safeDistance;

    if (x >= left && x <= right && y >= top && y <= bottom) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate a safe position for a Glitch Token
 * 
 * Requirements 1.2: Token must be placed in a safe lane position (not overlapping obstacles)
 * 
 * @param obstacles - Array of current obstacles
 * @param canvasWidth - Width of the game canvas
 * @param canvasHeight - Height of the game canvas
 * @param config - Spawner configuration
 * @param rand - Random number generator (0-1), defaults to Math.random
 * @returns TokenPosition with x, y, and isSafe flag
 */
export function calculateSafeTokenPosition(
  obstacles: Obstacle[],
  canvasWidth: number,
  canvasHeight: number,
  config: GlitchTokenSpawnerConfig = DEFAULT_GLITCH_TOKEN_CONFIG,
  rand: () => number = Math.random
): TokenPosition {
  // Spawn from the right side of the screen
  const baseX = canvasWidth + config.tokenSize;
  
  // Try to find a safe Y position
  const maxAttempts = 10;
  const minY = canvasHeight * 0.2;
  const maxY = canvasHeight * 0.8;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const y = minY + rand() * (maxY - minY);
    
    if (!isPositionOverlappingObstacle(baseX, y, obstacles, config.safeDistance)) {
      return {
        x: baseX,
        y,
        isSafe: true,
      };
    }
  }
  
  // Fallback: use center of screen (should rarely happen)
  const fallbackY = canvasHeight / 2;
  return {
    x: baseX,
    y: fallbackY,
    isSafe: !isPositionOverlappingObstacle(baseX, fallbackY, obstacles, config.safeDistance),
  };
}

/**
 * Select a random Construct from the unlocked pool
 * 
 * Requirements 1.4, 8.5: Selection must only choose from unlockedConstructs
 * 
 * @param unlockedConstructs - Array of unlocked construct types
 * @param rand - Random number generator (0-1), defaults to Math.random
 * @returns Selected ConstructType, or 'NONE' if pool is empty
 */
export function selectRandomConstruct(
  unlockedConstructs: ConstructType[],
  rand: () => number = Math.random
): ConstructType {
  // Filter out 'NONE' as it's not a valid construct to select
  const validConstructs = unlockedConstructs.filter(c => c !== 'NONE');
  
  if (validConstructs.length === 0) {
    return 'NONE';
  }
  
  const index = Math.floor(rand() * validConstructs.length);
  return validConstructs[index];
}

/**
 * Create a new Glitch Token
 * 
 * @param position - Token position
 * @param constructType - The construct type this token grants
 * @returns New GlitchToken object
 */
export function createGlitchToken(
  position: TokenPosition,
  constructType: ConstructType
): GlitchToken {
  return {
    id: `glitch-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    x: position.x,
    y: position.y,
    constructType,
    collected: false,
    spawnTime: Date.now(),
  };
}

/**
 * Check if player can collect a Glitch Token
 * 
 * Requirements 1.3: Collision detection for token collection
 * 
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @param token - Token to check
 * @param collectionRadius - Radius for collection detection
 * @returns true if player can collect the token
 */
export function canCollectToken(
  playerX: number,
  playerY: number,
  token: GlitchToken,
  collectionRadius: number = DEFAULT_GLITCH_TOKEN_CONFIG.collectionRadius
): boolean {
  if (token.collected) {
    return false;
  }
  
  const dx = playerX - token.x;
  const dy = playerY - token.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= collectionRadius;
}

/**
 * Mark a token as collected
 * 
 * @param token - Token to mark
 * @returns Updated token with collected = true
 */
export function markTokenCollected(token: GlitchToken): GlitchToken {
  return {
    ...token,
    collected: true,
  };
}

/**
 * Spawn a Glitch Token if conditions are met
 * 
 * Convenience function that combines shouldSpawnToken, calculateSafeTokenPosition,
 * selectRandomConstruct, and createGlitchToken.
 * 
 * @param score - Current game score
 * @param activeConstruct - Currently active construct type
 * @param unlockedConstructs - Array of unlocked construct types
 * @param obstacles - Array of current obstacles
 * @param canvasWidth - Width of the game canvas
 * @param canvasHeight - Height of the game canvas
 * @param config - Spawner configuration
 * @param rand - Random number generator (0-1), defaults to Math.random
 * @returns GlitchToken if spawned, null otherwise
 */
export function trySpawnToken(
  score: number,
  activeConstruct: ConstructType,
  unlockedConstructs: ConstructType[],
  obstacles: Obstacle[],
  canvasWidth: number,
  canvasHeight: number,
  config: GlitchTokenSpawnerConfig = DEFAULT_GLITCH_TOKEN_CONFIG,
  rand: () => number = Math.random
): GlitchToken | null {
  const decision = shouldSpawnToken(score, activeConstruct, unlockedConstructs, config, rand);
  
  if (!decision.shouldSpawn) {
    return null;
  }
  
  const position = calculateSafeTokenPosition(obstacles, canvasWidth, canvasHeight, config, rand);
  const constructType = selectRandomConstruct(unlockedConstructs, rand);
  
  if (constructType === 'NONE') {
    return null;
  }
  
  return createGlitchToken(position, constructType);
}

/**
 * Update token position (move with game world)
 * 
 * @param token - Token to update
 * @param deltaX - X movement (negative for leftward movement)
 * @returns Updated token with new position
 */
export function updateTokenPosition(
  token: GlitchToken,
  deltaX: number
): GlitchToken {
  return {
    ...token,
    x: token.x + deltaX,
  };
}

/**
 * Check if a token is off-screen and should be removed
 * 
 * @param token - Token to check
 * @param leftBoundary - Left edge of screen (usually 0 or negative)
 * @returns true if token should be removed
 */
export function isTokenOffScreen(
  token: GlitchToken,
  leftBoundary: number = -50
): boolean {
  return token.x < leftBoundary;
}
