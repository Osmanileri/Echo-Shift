/**
 * Pattern Manager System - Pattern-Based Obstacle Spawning
 * 
 * Manages pattern selection, spawning, and progression for procedural gameplay.
 * Replaces random obstacle generation with designed, learnable patterns.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import {
    FALLBACK_PATTERN,
    getPatternsByDifficulty,
    Lane,
    Pattern,
    PATTERNS
} from '../data/patterns';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * State of the Pattern Manager
 * Tracks current pattern execution progress
 * Requirements: 2.1, 2.3
 */
export interface PatternManagerState {
  currentPattern: Pattern | null;
  patternStartTime: number;
  obstacleIndex: number;      // Next obstacle to spawn
  shardIndex: number;         // Next shard to spawn
  spawnedObstacles: SpawnedObstacle[];  // Track spawned obstacles for verification
  spawnedShards: SpawnedShard[];        // Track spawned shards for verification
}

/**
 * Record of a spawned obstacle
 * Requirements: 2.2, 2.4
 */
export interface SpawnedObstacle {
  lane: Lane;
  timeOffset: number;
  heightRatio: number;
  spawnTime: number;
}

/**
 * Record of a spawned shard
 */
export interface SpawnedShard {
  lane: Lane;
  timeOffset: number;
  type: 'safe' | 'risky';
  spawnTime: number;
}

/**
 * Spawn configuration
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export interface SpawnConfig {
  baseReactionTime: number;  // 1200ms
  minInterval: number;       // 400ms
}

/**
 * Callback types for spawning
 */
export type SpawnObstacleCallback = (lane: Lane, heightRatio: number) => void;
export type SpawnShardCallback = (lane: Lane, type: 'safe' | 'risky') => void;

// ============================================================================
// Constants
// ============================================================================

/**
 * Default spawn configuration
 * Requirements: 4.2, 4.4
 */
export const DEFAULT_SPAWN_CONFIG: SpawnConfig = {
  baseReactionTime: 1200,
  minInterval: 400
};

// ============================================================================
// State Management
// ============================================================================

/**
 * Create initial Pattern Manager state
 * @returns Fresh PatternManagerState
 */
export function createPatternManagerState(): PatternManagerState {
  return {
    currentPattern: null,
    patternStartTime: 0,
    obstacleIndex: 0,
    shardIndex: 0,
    spawnedObstacles: [],
    spawnedShards: []
  };
}

/**
 * Reset state for a new pattern
 * @param state - Current state
 * @param pattern - New pattern to start
 * @param currentTime - Current game time in ms
 * @returns Updated state
 */
export function startPattern(
  state: PatternManagerState,
  pattern: Pattern,
  currentTime: number
): PatternManagerState {
  return {
    currentPattern: pattern,
    patternStartTime: currentTime,
    obstacleIndex: 0,
    shardIndex: 0,
    spawnedObstacles: [],
    spawnedShards: []
  };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Select a pattern based on score and available patterns
 * 
 * Requirements: 2.1, 2.5
 * 
 * @param score - Current player score
 * @param availablePatterns - Pool of patterns to choose from
 * @returns Selected pattern
 */
export function selectPattern(
  score: number,
  availablePatterns: Pattern[] = PATTERNS
): Pattern {
  // Handle empty pattern list
  if (!availablePatterns || availablePatterns.length === 0) {
    console.warn('[PatternManager] No patterns available, using fallback');
    return FALLBACK_PATTERN;
  }

  // Filter patterns by difficulty based on score
  const eligiblePatterns = availablePatterns.filter(pattern => 
    isPatternAvailableForScore(pattern, score)
  );

  // If no eligible patterns, use basic patterns
  if (eligiblePatterns.length === 0) {
    const basicPatterns = getPatternsByDifficulty('basic');
    if (basicPatterns.length > 0) {
      return basicPatterns[Math.floor(Math.random() * basicPatterns.length)];
    }
    return FALLBACK_PATTERN;
  }

  // Random selection from eligible patterns
  // (Weighted selection will be handled by difficultyProgression system)
  const randomIndex = Math.floor(Math.random() * eligiblePatterns.length);
  return eligiblePatterns[randomIndex];
}

/**
 * Check if a pattern is available for the current score
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 * 
 * @param pattern - Pattern to check
 * @param score - Current score
 * @returns True if pattern can be used at this score
 */
export function isPatternAvailableForScore(pattern: Pattern, score: number): boolean {
  switch (pattern.difficulty) {
    case 'basic':
      return true; // Always available
    case 'intermediate':
      return score >= 1000;
    case 'advanced':
      return score >= 2500;
    case 'expert':
      return score >= 5000;
    default:
      return false;
  }
}

/**
 * Update pattern spawn - check and spawn obstacles/shards based on time
 * 
 * Requirements: 2.2, 2.3, 2.4
 * 
 * @param state - Current pattern manager state
 * @param currentTime - Current game time in ms
 * @param spawnObstacle - Callback to spawn an obstacle
 * @param spawnShard - Callback to spawn a shard
 * @returns Updated state
 */
export function updatePatternSpawn(
  state: PatternManagerState,
  currentTime: number,
  spawnObstacle: SpawnObstacleCallback,
  spawnShard: SpawnShardCallback
): PatternManagerState {
  // No pattern active
  if (!state.currentPattern) {
    return state;
  }

  const pattern = state.currentPattern;
  const elapsedTime = currentTime - state.patternStartTime;
  
  let newState = { ...state };
  let obstaclesSpawned: SpawnedObstacle[] = [...state.spawnedObstacles];
  let shardsSpawned: SpawnedShard[] = [...state.spawnedShards];

  // Spawn obstacles that are due
  // Requirements: 2.2, 2.3, 2.4
  while (newState.obstacleIndex < pattern.obstacles.length) {
    const obstacle = pattern.obstacles[newState.obstacleIndex];
    
    if (elapsedTime >= obstacle.timeOffset) {
      // Spawn the obstacle with correct lane - Requirements 2.4
      const heightRatio = obstacle.heightRatio ?? 0.5;
      spawnObstacle(obstacle.lane, heightRatio);
      
      // Track spawned obstacle
      obstaclesSpawned.push({
        lane: obstacle.lane,
        timeOffset: obstacle.timeOffset,
        heightRatio,
        spawnTime: currentTime
      });
      
      newState.obstacleIndex++;
    } else {
      break; // Not time yet for this obstacle
    }
  }

  // Spawn shards that are due
  while (newState.shardIndex < pattern.shards.length) {
    const shard = pattern.shards[newState.shardIndex];
    
    if (elapsedTime >= shard.timeOffset) {
      spawnShard(shard.lane, shard.type);
      
      // Track spawned shard
      shardsSpawned.push({
        lane: shard.lane,
        timeOffset: shard.timeOffset,
        type: shard.type,
        spawnTime: currentTime
      });
      
      newState.shardIndex++;
    } else {
      break; // Not time yet for this shard
    }
  }

  return {
    ...newState,
    spawnedObstacles: obstaclesSpawned,
    spawnedShards: shardsSpawned
  };
}

/**
 * Check if the current pattern is complete
 * 
 * Requirements: 2.5
 * 
 * @param state - Current pattern manager state
 * @param currentTime - Current game time in ms
 * @returns True if pattern has finished
 */
export function isPatternComplete(
  state: PatternManagerState,
  currentTime: number
): boolean {
  if (!state.currentPattern) {
    return true; // No pattern = complete
  }

  const elapsedTime = currentTime - state.patternStartTime;
  const pattern = state.currentPattern;

  // Pattern is complete when:
  // 1. All obstacles have been spawned
  // 2. All shards have been spawned
  // 3. Pattern duration has elapsed
  const allObstaclesSpawned = state.obstacleIndex >= pattern.obstacles.length;
  const allShardsSpawned = state.shardIndex >= pattern.shards.length;
  const durationElapsed = elapsedTime >= pattern.duration;

  return allObstaclesSpawned && allShardsSpawned && durationElapsed;
}

/**
 * Get the number of obstacles spawned from current pattern
 * 
 * @param state - Current pattern manager state
 * @returns Number of obstacles spawned
 */
export function getSpawnedObstacleCount(state: PatternManagerState): number {
  return state.spawnedObstacles.length;
}

/**
 * Verify all spawned obstacles match pattern definition
 * 
 * Requirements: 2.2, 2.4
 * 
 * @param state - Current pattern manager state
 * @returns True if all spawned obstacles match pattern
 */
export function verifySpawnedObstacles(state: PatternManagerState): boolean {
  if (!state.currentPattern) {
    return state.spawnedObstacles.length === 0;
  }

  const pattern = state.currentPattern;
  
  // Check count matches
  if (state.spawnedObstacles.length !== pattern.obstacles.length) {
    return false;
  }

  // Check each obstacle matches
  for (let i = 0; i < state.spawnedObstacles.length; i++) {
    const spawned = state.spawnedObstacles[i];
    const defined = pattern.obstacles[i];
    
    // Verify lane matches - Requirements 2.4
    if (spawned.lane !== defined.lane) {
      return false;
    }
    
    // Verify timeOffset matches
    if (spawned.timeOffset !== defined.timeOffset) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate spawn interval based on current speed
 * 
 * Formula: REACTION_TIME / (currentSpeed / 10)
 * 
 * Requirements: 4.1, 4.4
 * 
 * @param currentSpeed - Current game speed
 * @param config - Spawn configuration
 * @returns Spawn interval in ms, minimum 400ms
 */
export function calculateSpawnInterval(
  currentSpeed: number,
  config: SpawnConfig = DEFAULT_SPAWN_CONFIG
): number {
  // Avoid division by zero
  if (currentSpeed <= 0) {
    return config.baseReactionTime;
  }

  const interval = config.baseReactionTime / (currentSpeed / 10);
  
  // Enforce minimum interval - Requirements 4.4
  return Math.max(interval, config.minInterval);
}

/**
 * Safe pattern selection with error handling
 * 
 * @param score - Current player score
 * @param patterns - Available patterns
 * @returns Selected pattern with fallback on error
 */
export function safeSelectPattern(
  score: number,
  patterns: Pattern[] = PATTERNS
): Pattern {
  try {
    if (!patterns || patterns.length === 0) {
      return FALLBACK_PATTERN;
    }
    return selectPattern(score, patterns);
  } catch (error) {
    console.error('[PatternManager] Error selecting pattern:', error);
    return patterns[0] || FALLBACK_PATTERN;
  }
}

/**
 * Get pattern progress as percentage
 * 
 * @param state - Current pattern manager state
 * @param currentTime - Current game time
 * @returns Progress percentage (0-100)
 */
export function getPatternProgress(
  state: PatternManagerState,
  currentTime: number
): number {
  if (!state.currentPattern) {
    return 100;
  }

  const elapsedTime = currentTime - state.patternStartTime;
  const progress = (elapsedTime / state.currentPattern.duration) * 100;
  
  return Math.max(0, Math.min(100, progress));
}
