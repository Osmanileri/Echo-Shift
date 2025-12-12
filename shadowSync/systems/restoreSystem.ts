/**
 * Restore System (System Restore / Revive Mechanic)
 * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.8, 2.9, 2.11, 2.12
 * 
 * Provides a revive mechanic that allows players to:
 * - Continue their run after dying (for Echo Shards cost)
 * - Rewind game state to 3 seconds before collision
 * - Clear obstacles in a safe zone around the player
 * - Use restore only once per run
 */

import { Obstacle } from '../types';

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Snapshot of obstacle state for restore
 */
export interface ObstacleSnapshot {
  id: string;
  x: number;
  y: number;
  height: number;
  width: number;
  type: string;
  lane: 'top' | 'bottom';
  polarity: 'white' | 'black';
  passed: boolean;
}

/**
 * Snapshot of game state at a point in time
 * Requirements 2.5: State for rewinding
 */
export interface GameSnapshot {
  timestamp: number;
  score: number;
  playerY: number;
  isSwapped: boolean;
  obstacles: ObstacleSnapshot[];
  speed: number;
  spawnRate: number;
  connectorLength: number;
}

/**
 * Restore system state
 * Requirements 2.8: Track restore availability per run
 */
export interface RestoreState {
  isAvailable: boolean;       // Can restore this run
  hasBeenUsed: boolean;       // Already used this run
  snapshots: GameSnapshot[];  // Rolling buffer of last 3 seconds
}

/**
 * Restore system configuration
 */
export interface RestoreConfig {
  cost: number;               // Echo Shards cost (100)
  rewindSeconds: number;      // Seconds to rewind (3)
  safeZoneRadius: number;     // Pixels to clear around player (100)
  maxSnapshots: number;       // Max snapshots to keep (180 = 3s at 60fps)
  snapshotInterval: number;   // Frames between snapshots (1 = every frame)
}

/**
 * Result of restore execution
 */
export interface RestoreResult {
  success: boolean;
  snapshot: GameSnapshot | null;
  clearedObstacleIds: string[];
}

// ============================================================================
// Default Configuration
// ============================================================================

export const RESTORE_CONFIG: RestoreConfig = {
  cost: 100,                  // Requirements 2.3: 100 Echo Shards
  rewindSeconds: 3,           // Requirements 2.5: 3 seconds before collision
  safeZoneRadius: 100,        // Requirements 2.6: Safe zone around player
  maxSnapshots: 180,          // 3 seconds at 60fps
  snapshotInterval: 1,        // Record every frame
};

// ============================================================================
// State Factory
// ============================================================================

/**
 * Creates initial restore state
 */
export function createInitialRestoreState(): RestoreState {
  return {
    isAvailable: true,
    hasBeenUsed: false,
    snapshots: [],
  };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Records a game state snapshot to the rolling buffer
 * Requirements 2.5: Maintain state history for rewind
 * 
 * @param state - Current restore state
 * @param snapshot - Game snapshot to record
 * @param config - Restore configuration
 * @returns Updated restore state
 */
export function recordSnapshot(
  state: RestoreState,
  snapshot: GameSnapshot,
  config: RestoreConfig = RESTORE_CONFIG
): RestoreState {
  // Add new snapshot to the buffer
  const newSnapshots = [...state.snapshots, snapshot];
  
  // Trim to max size (rolling buffer)
  const trimmedSnapshots = newSnapshots.length > config.maxSnapshots
    ? newSnapshots.slice(newSnapshots.length - config.maxSnapshots)
    : newSnapshots;

  return {
    ...state,
    snapshots: trimmedSnapshots,
  };
}

/**
 * Checks if restore can be used
 * Requirements 2.3, 2.8, 2.9: Balance check and single-use per run
 * 
 * @param state - Current restore state
 * @param balance - Player's Echo Shards balance
 * @param config - Restore configuration
 * @returns true if restore can be used
 */
export function canRestore(
  state: RestoreState,
  balance: number,
  config: RestoreConfig = RESTORE_CONFIG
): boolean {
  // Requirements 2.8: Cannot restore if already used this run
  if (state.hasBeenUsed) {
    return false;
  }

  // Requirements 2.9: Cannot restore if insufficient shards
  if (balance < config.cost) {
    return false;
  }

  // Need at least one snapshot to restore to
  if (state.snapshots.length === 0) {
    return false;
  }

  return true;
}

/**
 * Executes the restore, returning the snapshot to restore to
 * Requirements 2.5, 2.6: Rewind state and clear safe zone
 * 
 * @param state - Current restore state
 * @param currentPlayerX - Current player X position (for safe zone calculation)
 * @param config - Restore configuration
 * @returns Restore result with snapshot and cleared obstacle IDs
 */
export function executeRestore(
  state: RestoreState,
  currentPlayerX: number,
  config: RestoreConfig = RESTORE_CONFIG
): { result: RestoreResult; newState: RestoreState } {
  // Cannot execute if no snapshots
  if (state.snapshots.length === 0) {
    return {
      result: { success: false, snapshot: null, clearedObstacleIds: [] },
      newState: state,
    };
  }

  // Get the oldest snapshot (3 seconds ago)
  // Requirements 2.5: Rewind to 3 seconds before collision
  const snapshot = state.snapshots[0];

  // Calculate which obstacles should be cleared in safe zone
  // Requirements 2.6: Clear obstacles within safe zone
  const clearedObstacleIds = snapshot.obstacles
    .filter(obs => {
      const distance = Math.abs(obs.x - currentPlayerX);
      return distance < config.safeZoneRadius;
    })
    .map(obs => obs.id);

  // Create cleaned snapshot with safe zone obstacles removed
  const cleanedSnapshot: GameSnapshot = {
    ...snapshot,
    obstacles: snapshot.obstacles.filter(
      obs => !clearedObstacleIds.includes(obs.id)
    ),
  };

  return {
    result: {
      success: true,
      snapshot: cleanedSnapshot,
      clearedObstacleIds,
    },
    newState: {
      ...state,
      hasBeenUsed: true,
      isAvailable: false,
      snapshots: [], // Clear snapshots after restore
    },
  };
}

/**
 * Marks restore as used for this run
 * Requirements 2.8: Disable further restore offers
 * 
 * @param state - Current restore state
 * @returns Updated restore state
 */
export function markUsed(state: RestoreState): RestoreState {
  return {
    ...state,
    hasBeenUsed: true,
    isAvailable: false,
  };
}

/**
 * Resets restore state for a new run
 * 
 * @returns Fresh restore state
 */
export function reset(): RestoreState {
  return createInitialRestoreState();
}

/**
 * Clears all snapshots (useful when game ends normally)
 * 
 * @param state - Current restore state
 * @returns Updated restore state with cleared snapshots
 */
export function clearSnapshots(state: RestoreState): RestoreState {
  return {
    ...state,
    snapshots: [],
  };
}

// ============================================================================
// Snapshot Creation Helpers
// ============================================================================

/**
 * Creates a game snapshot from current game state
 * 
 * @param timestamp - Current timestamp
 * @param score - Current score
 * @param playerY - Player Y position
 * @param isSwapped - Whether orbs are swapped
 * @param obstacles - Current obstacles
 * @param speed - Current game speed
 * @returns Game snapshot
 */
export function createSnapshot(
  timestamp: number,
  score: number,
  playerY: number,
  isSwapped: boolean,
  obstacles: Obstacle[],
  speed: number,
  spawnRate: number,
  connectorLength: number
): GameSnapshot {
  return {
    timestamp,
    score,
    playerY,
    isSwapped,
    obstacles: obstacles.map(obs => ({
      id: obs.id,
      x: obs.x,
      y: obs.y,
      height: obs.height,
      width: obs.width,
      type: obs.isLatent ? 'phantom' : 'normal',
      lane: obs.lane,
      polarity: obs.polarity,
      passed: obs.passed,
    })),
    speed,
    spawnRate,
    connectorLength,
  };
}

// ============================================================================
// Serialization - Requirements 2.11, 2.12
// ============================================================================

/**
 * Serializes restore state to JSON string
 * Requirements 2.11: Encode data as JSON for session tracking
 * 
 * @param state - Restore state to serialize
 * @returns JSON string
 */
export function serialize(state: RestoreState): string {
  return JSON.stringify({
    isAvailable: state.isAvailable,
    hasBeenUsed: state.hasBeenUsed,
    // Don't serialize snapshots - they're session-only
    snapshotCount: state.snapshots.length,
  });
}

/**
 * Serialized restore state (without snapshots)
 */
interface SerializedRestoreState {
  isAvailable: boolean;
  hasBeenUsed: boolean;
  snapshotCount?: number;
}

/**
 * Deserializes restore state from JSON string
 * Requirements 2.12: Parse JSON and validate restore availability
 * 
 * @param data - JSON string to parse
 * @returns Parsed restore state or initial state if invalid
 */
export function deserialize(data: string): RestoreState {
  try {
    const parsed: SerializedRestoreState = JSON.parse(data);
    
    // Validate required fields
    if (
      typeof parsed.isAvailable !== 'boolean' ||
      typeof parsed.hasBeenUsed !== 'boolean'
    ) {
      return createInitialRestoreState();
    }

    return {
      isAvailable: parsed.isAvailable,
      hasBeenUsed: parsed.hasBeenUsed,
      snapshots: [], // Snapshots are not persisted
    };
  } catch {
    return createInitialRestoreState();
  }
}

// ============================================================================
// System Interface
// ============================================================================

/**
 * Restore System interface for external use
 */
export interface RestoreSystem {
  state: RestoreState;
  config: RestoreConfig;
  
  recordSnapshot: (snapshot: GameSnapshot) => void;
  canRestore: (balance: number) => boolean;
  executeRestore: (currentPlayerX: number) => RestoreResult;
  markUsed: () => void;
  reset: () => void;
  clearSnapshots: () => void;
  
  // Serialization
  serialize: () => string;
  deserialize: (data: string) => void;
}

/**
 * Creates a restore system instance
 * 
 * @param config - Optional custom configuration
 * @returns Restore system instance
 */
export function createRestoreSystem(config: RestoreConfig = RESTORE_CONFIG): RestoreSystem {
  let state = createInitialRestoreState();

  return {
    get state() {
      return state;
    },
    config,

    recordSnapshot(snapshot: GameSnapshot): void {
      state = recordSnapshot(state, snapshot, config);
    },

    canRestore(balance: number): boolean {
      return canRestore(state, balance, config);
    },

    executeRestore(currentPlayerX: number): RestoreResult {
      const { result, newState } = executeRestore(state, currentPlayerX, config);
      state = newState;
      return result;
    },

    markUsed(): void {
      state = markUsed(state);
    },

    reset(): void {
      state = createInitialRestoreState();
    },

    clearSnapshots(): void {
      state = clearSnapshots(state);
    },

    serialize(): string {
      return serialize(state);
    },

    deserialize(data: string): void {
      state = deserialize(data);
    },
  };
}
