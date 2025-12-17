/**
 * Property-Based Tests for Restore System (Snapshot Buffer)
 * Uses fast-check for property-based testing
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 8.3, 8.4, 8.8
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
  EnhancedResonanceState,
  GameSnapshot,
  Obstacle,
  ShiftProtocolState
} from '../types';
import {
  calculateRestoreCost,
  canRestoreV2,
  captureSnapshot,
  clearSnapshotBuffer,
  DEFAULT_SNAPSHOT_BUFFER_CAPACITY,
  getRestoreSnapshot,
  initializeSnapshotBuffer,
  pushSnapshot,
  RESTORE_CONFIG,
} from './restoreSystem';

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generates a valid ShiftProtocolState for testing
 */
const shiftStateArb = fc.record({
  targetWord: fc.constant(['S', 'H', 'I', 'F', 'T']),
  collectedMask: fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
  overdriveActive: fc.boolean(),
  overdriveTimer: fc.integer({ min: 0, max: 10000 }),
  coreRotation: fc.float({ min: 0, max: Math.fround(Math.PI * 2) }),
});

/**
 * Generates a valid EnhancedResonanceState for testing
 */
const resonanceStateArb = fc.record({
  isActive: fc.boolean(),
  isPaused: fc.boolean(),
  pausedTimeRemaining: fc.integer({ min: 0, max: 10000 }),
  streakCount: fc.integer({ min: 0, max: 100 }),
  activationThreshold: fc.constant(10),
  duration: fc.integer({ min: 0, max: 30000 }),
  remainingTime: fc.integer({ min: 0, max: 30000 }),
  multiplier: fc.constantFrom(1, 2),
  intensity: fc.float({ min: 0, max: Math.fround(1) }),
  colorTransitionProgress: fc.float({ min: 0, max: Math.fround(1) }),
});

/**
 * Generates a valid Obstacle for testing
 */
const obstacleArb: fc.Arbitrary<Obstacle> = fc.record({
  id: fc.uuid(),
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 800 }),
  targetY: fc.integer({ min: 0, max: 800 }),
  width: fc.integer({ min: 10, max: 100 }),
  height: fc.integer({ min: 10, max: 200 }),
  lane: fc.constantFrom('top', 'bottom') as fc.Arbitrary<'top' | 'bottom'>,
  polarity: fc.constantFrom('white', 'black') as fc.Arbitrary<'white' | 'black'>,
  passed: fc.boolean(),
  hasPhased: fc.option(fc.boolean(), { nil: undefined }),
  nearMissChecked: fc.option(fc.boolean(), { nil: undefined }),
  isLatent: fc.option(fc.boolean(), { nil: undefined }),
  revealDistance: fc.option(fc.integer({ min: 0, max: 500 }), { nil: undefined }),
  initialX: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
});

/**
 * Generates a valid GameSnapshot for testing
 */
const gameSnapshotArb: fc.Arbitrary<GameSnapshot> = fc.record({
  timestamp: fc.integer({ min: 0, max: 1000000000 }),
  score: fc.integer({ min: 0, max: 1000000 }),
  gameSpeed: fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
  playerPosition: fc.integer({ min: 0, max: 800 }),
  orbSwapState: fc.boolean(),
  obstacles: fc.array(obstacleArb, { minLength: 0, maxLength: 20 }),
  shiftState: shiftStateArb as fc.Arbitrary<ShiftProtocolState>,
  resonanceState: resonanceStateArb as fc.Arbitrary<EnhancedResonanceState>,
  connectorLength: fc.integer({ min: 45, max: 200 }),
  midlineY: fc.integer({ min: 100, max: 700 }),
});

// ============================================================================
// Snapshot Buffer Capacity Properties - Requirements 7.1, 7.3
// ============================================================================

describe('Snapshot Buffer Capacity Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 16: Snapshot Buffer Capacity**
   * **Validates: Requirements 7.1, 7.3**
   *
   * For any snapshot buffer operation, the buffer size SHALL never exceed 180 snapshots.
   */
  test('Buffer size never exceeds capacity after any number of pushes', () => {
    fc.assert(
      fc.property(
        // Generate buffer capacity (use default or custom)
        fc.constantFrom(180, DEFAULT_SNAPSHOT_BUFFER_CAPACITY),
        // Generate number of snapshots to push (more than capacity to test overflow)
        fc.integer({ min: 1, max: 500 }),
        // Generate snapshots
        fc.array(gameSnapshotArb, { minLength: 1, maxLength: 500 }),
        (capacity, numPushes, snapshots) => {
          let buffer = initializeSnapshotBuffer(capacity);

          // Push snapshots up to numPushes (cycling through available snapshots)
          for (let i = 0; i < numPushes; i++) {
            const snapshot = snapshots[i % snapshots.length];
            buffer = pushSnapshot(buffer, snapshot);

            // After each push, size must not exceed capacity
            if (buffer.size > capacity) {
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
   * **Feature: echo-shift-v2-mechanics, Property 16: Snapshot Buffer Capacity (Exact Capacity)**
   * **Validates: Requirements 7.1, 7.3**
   *
   * When buffer is full, size SHALL equal exactly the capacity.
   */
  test('Full buffer has size equal to capacity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 200 }), // capacity
        fc.array(gameSnapshotArb, { minLength: 200, maxLength: 300 }), // more snapshots than capacity
        (capacity, snapshots) => {
          let buffer = initializeSnapshotBuffer(capacity);

          // Push more snapshots than capacity
          for (let i = 0; i < capacity + 50; i++) {
            buffer = pushSnapshot(buffer, snapshots[i % snapshots.length]);
          }

          // Size should equal capacity (not exceed it)
          return buffer.size === capacity;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 16: Snapshot Buffer Capacity (Circular Overwrite)**
   * **Validates: Requirements 7.3**
   *
   * When buffer exceeds capacity, oldest snapshot SHALL be discarded.
   */
  test('Oldest snapshot is discarded when buffer overflows', () => {
    fc.assert(
      fc.property(
        fc.array(gameSnapshotArb, { minLength: 10, maxLength: 20 }),
        (snapshots) => {
          const capacity = 5;
          let buffer = initializeSnapshotBuffer(capacity);

          // Push all snapshots (more than capacity)
          for (const snapshot of snapshots) {
            buffer = pushSnapshot(buffer, snapshot);
          }

          // Get the restore snapshot (oldest in buffer)
          const oldestSnapshot = getRestoreSnapshot(buffer);

          if (!oldestSnapshot) return false;

          // The oldest snapshot should be from the last `capacity` snapshots pushed
          // It should be the (snapshots.length - capacity)th snapshot
          const expectedOldestIndex = snapshots.length - capacity;
          const expectedOldest = snapshots[expectedOldestIndex];

          // Compare timestamps to verify correct oldest snapshot
          return oldestSnapshot.timestamp === expectedOldest.timestamp;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 16: Snapshot Buffer Capacity (Initial State)**
   * **Validates: Requirements 7.1**
   *
   * Newly initialized buffer SHALL have size 0 and correct capacity.
   */
  test('Initialized buffer has size 0 and correct capacity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        (capacity) => {
          const buffer = initializeSnapshotBuffer(capacity);

          return buffer.size === 0 &&
            buffer.capacity === capacity &&
            buffer.head === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Buffer Cleanup Properties - Requirements 7.4
// ============================================================================

describe('Buffer Cleanup Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 18: Buffer Cleanup on Game End**
   * **Validates: Requirements 7.4**
   *
   * For any normal game run end, the snapshot buffer SHALL be cleared.
   */
  test('clearSnapshotBuffer resets buffer to empty state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 200 }), // capacity
        fc.array(gameSnapshotArb, { minLength: 1, maxLength: 100 }), // snapshots to add
        (capacity, snapshots) => {
          let buffer = initializeSnapshotBuffer(capacity);

          // Fill buffer with snapshots
          for (const snapshot of snapshots) {
            buffer = pushSnapshot(buffer, snapshot);
          }

          // Verify buffer has content
          const hadContent = buffer.size > 0;

          // Clear the buffer
          const clearedBuffer = clearSnapshotBuffer(buffer);

          // Verify buffer is cleared
          const isCleared = clearedBuffer.size === 0 &&
            clearedBuffer.head === 0 &&
            clearedBuffer.capacity === capacity;

          return hadContent && isCleared;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 18: Buffer Cleanup on Game End (Preserves Capacity)**
   * **Validates: Requirements 7.4**
   *
   * After clearing, buffer SHALL retain its original capacity.
   */
  test('clearSnapshotBuffer preserves buffer capacity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.array(gameSnapshotArb, { minLength: 0, maxLength: 50 }),
        (capacity, snapshots) => {
          let buffer = initializeSnapshotBuffer(capacity);

          // Add some snapshots
          for (const snapshot of snapshots) {
            buffer = pushSnapshot(buffer, snapshot);
          }

          // Clear and verify capacity is preserved
          const clearedBuffer = clearSnapshotBuffer(buffer);

          return clearedBuffer.capacity === capacity;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 18: Buffer Cleanup on Game End (No Restore After Clear)**
   * **Validates: Requirements 7.4**
   *
   * After clearing, getRestoreSnapshot SHALL return null.
   */
  test('getRestoreSnapshot returns null after buffer is cleared', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 200 }),
        fc.array(gameSnapshotArb, { minLength: 1, maxLength: 50 }),
        (capacity, snapshots) => {
          let buffer = initializeSnapshotBuffer(capacity);

          // Fill buffer
          for (const snapshot of snapshots) {
            buffer = pushSnapshot(buffer, snapshot);
          }

          // Clear buffer
          const clearedBuffer = clearSnapshotBuffer(buffer);

          // getRestoreSnapshot should return null
          return getRestoreSnapshot(clearedBuffer) === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Snapshot Completeness Properties - Requirements 7.2
// ============================================================================

describe('Snapshot Completeness Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 17: Snapshot Completeness**
   * **Validates: Requirements 7.2**
   *
   * For any captured snapshot, it SHALL contain: timestamp, score, player position,
   * orb swap state, obstacle positions, current speed, and difficulty parameters.
   */
  test('Captured snapshot contains all required fields', () => {
    fc.assert(
      fc.property(
        // Generate game state input
        fc.integer({ min: 0, max: 1000000000 }), // timestamp
        fc.integer({ min: 0, max: 1000000 }),    // score
        fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }), // gameSpeed
        fc.integer({ min: 0, max: 800 }),        // playerPosition
        fc.boolean(),                             // orbSwapState
        fc.array(obstacleArb, { minLength: 0, maxLength: 10 }), // obstacles
        shiftStateArb,                            // shiftState
        resonanceStateArb,                        // resonanceState
        fc.integer({ min: 45, max: 200 }),       // connectorLength
        fc.integer({ min: 100, max: 700 }),      // midlineY
        (timestamp, score, gameSpeed, playerPosition, orbSwapState,
          obstacles, shiftState, resonanceState, connectorLength, midlineY) => {

          const gameState = {
            timestamp,
            score,
            gameSpeed,
            playerPosition,
            orbSwapState,
            obstacles: obstacles as Obstacle[],
            shiftState: shiftState as ShiftProtocolState,
            resonanceState: resonanceState as EnhancedResonanceState,
            connectorLength,
            midlineY,
          };

          const snapshot = captureSnapshot(gameState);

          // Verify all required fields are present
          const hasTimestamp = typeof snapshot.timestamp === 'number';
          const hasScore = typeof snapshot.score === 'number';
          const hasGameSpeed = typeof snapshot.gameSpeed === 'number';
          const hasPlayerPosition = typeof snapshot.playerPosition === 'number';
          const hasOrbSwapState = typeof snapshot.orbSwapState === 'boolean';
          const hasObstacles = Array.isArray(snapshot.obstacles);
          const hasShiftState = snapshot.shiftState !== undefined;
          const hasResonanceState = snapshot.resonanceState !== undefined;
          const hasConnectorLength = typeof snapshot.connectorLength === 'number';
          const hasMidlineY = typeof snapshot.midlineY === 'number';

          return hasTimestamp && hasScore && hasGameSpeed && hasPlayerPosition &&
            hasOrbSwapState && hasObstacles && hasShiftState &&
            hasResonanceState && hasConnectorLength && hasMidlineY;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 17: Snapshot Completeness (Value Preservation)**
   * **Validates: Requirements 7.2**
   *
   * Captured snapshot SHALL preserve the exact values from the input game state.
   */
  test('Captured snapshot preserves input values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000000 }),
        fc.integer({ min: 0, max: 1000000 }),
        fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
        fc.integer({ min: 0, max: 800 }),
        fc.boolean(),
        fc.array(obstacleArb, { minLength: 0, maxLength: 10 }),
        shiftStateArb,
        resonanceStateArb,
        fc.integer({ min: 45, max: 200 }),
        fc.integer({ min: 100, max: 700 }),
        (timestamp, score, gameSpeed, playerPosition, orbSwapState,
          obstacles, shiftState, resonanceState, connectorLength, midlineY) => {

          const gameState = {
            timestamp,
            score,
            gameSpeed,
            playerPosition,
            orbSwapState,
            obstacles: obstacles as Obstacle[],
            shiftState: shiftState as ShiftProtocolState,
            resonanceState: resonanceState as EnhancedResonanceState,
            connectorLength,
            midlineY,
          };

          const snapshot = captureSnapshot(gameState);

          // Verify values are preserved
          const timestampMatch = snapshot.timestamp === timestamp;
          const scoreMatch = snapshot.score === score;
          const speedMatch = snapshot.gameSpeed === gameSpeed;
          const positionMatch = snapshot.playerPosition === playerPosition;
          const swapMatch = snapshot.orbSwapState === orbSwapState;
          const obstaclesMatch = snapshot.obstacles.length === obstacles.length;
          const connectorMatch = snapshot.connectorLength === connectorLength;
          const midlineMatch = snapshot.midlineY === midlineY;

          return timestampMatch && scoreMatch && speedMatch && positionMatch &&
            swapMatch && obstaclesMatch && connectorMatch && midlineMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 17: Snapshot Completeness (Obstacle Data)**
   * **Validates: Requirements 7.2**
   *
   * Captured snapshot SHALL include all obstacle positions and properties.
   */
  test('Captured snapshot includes all obstacle data', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000000 }),
        fc.integer({ min: 0, max: 1000000 }),
        fc.float({ min: Math.fround(1), max: Math.fround(20), noNaN: true }),
        fc.integer({ min: 0, max: 800 }),
        fc.boolean(),
        fc.array(obstacleArb, { minLength: 1, maxLength: 10 }),
        shiftStateArb,
        resonanceStateArb,
        fc.integer({ min: 45, max: 200 }),
        fc.integer({ min: 100, max: 700 }),
        (timestamp, score, gameSpeed, playerPosition, orbSwapState,
          obstacles, shiftState, resonanceState, connectorLength, midlineY) => {

          const gameState = {
            timestamp,
            score,
            gameSpeed,
            playerPosition,
            orbSwapState,
            obstacles: obstacles as Obstacle[],
            shiftState: shiftState as ShiftProtocolState,
            resonanceState: resonanceState as EnhancedResonanceState,
            connectorLength,
            midlineY,
          };

          const snapshot = captureSnapshot(gameState);

          // Verify each obstacle is captured with required properties
          for (let i = 0; i < obstacles.length; i++) {
            const original = obstacles[i];
            const captured = snapshot.obstacles[i];

            if (!captured) return false;

            // Check essential obstacle properties are preserved
            const idMatch = captured.id === original.id;
            const xMatch = captured.x === original.x;
            const yMatch = captured.y === original.y;
            const laneMatch = captured.lane === original.lane;
            const polarityMatch = captured.polarity === original.polarity;

            if (!idMatch || !xMatch || !yMatch || !laneMatch || !polarityMatch) {
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


// ============================================================================
// Restore Button State Properties - Requirements 8.3
// ============================================================================

describe('Restore Button State Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 19: Restore Button State**
   * **Validates: Requirements 8.3**
   *
   * For any player balance less than 100 Echo Shards, the restore button SHALL be disabled.
   */
  test('Restore button is disabled when balance is less than 100 shards', () => {
    fc.assert(
      fc.property(
        // Generate shard balance less than 100
        fc.integer({ min: 0, max: 99 }),
        // hasUsedRestore can be either true or false
        fc.boolean(),
        (shards, hasUsedRestore) => {
          const canUseRestore = canRestoreV2(shards, hasUsedRestore);

          // When shards < 100, restore should always be disabled
          return canUseRestore === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 19: Restore Button State (Enabled)**
   * **Validates: Requirements 8.3**
   *
   * For any player balance >= 100 Echo Shards and restore not used, button SHALL be enabled.
   */
  test('Restore button is enabled when balance >= 100 and not used', () => {
    fc.assert(
      fc.property(
        // Generate shard balance >= 100
        fc.integer({ min: 100, max: 10000 }),
        (shards) => {
          // hasUsedRestore is false (not used yet)
          const canUseRestore = canRestoreV2(shards, false);

          // When shards >= 100 and not used, restore should be enabled
          return canUseRestore === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 19: Restore Button State (Cost Boundary)**
   * **Validates: Requirements 8.3**
   *
   * At exactly 100 shards, restore SHALL be enabled (boundary test).
   */
  test('Restore button is enabled at exactly 100 shards boundary', () => {
    // Boundary test: exactly at the cost threshold
    const canUseRestore = canRestoreV2(100, false);
    expect(canUseRestore).toBe(true);

    // Just below threshold
    const cannotUseRestore = canRestoreV2(99, false);
    expect(cannotUseRestore).toBe(false);
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 19: Restore Button State (Cost Consistency)**
   * **Validates: Requirements 8.3**
   *
   * The restore cost SHALL always be 100 Echo Shards.
   */
  test('Restore cost is always 100 Echo Shards', () => {
    // Cost should be constant
    const cost = calculateRestoreCost();
    expect(cost).toBe(100);
    expect(cost).toBe(RESTORE_CONFIG.cost);
  });
});


// ============================================================================
// Single Restore Per Run Properties - Requirements 8.8
// ============================================================================

describe('Single Restore Per Run Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 24: Single Restore Per Run**
   * **Validates: Requirements 8.8**
   *
   * For any game run where restore has been used, further restore offers SHALL be disabled.
   */
  test('Restore is disabled after being used once', () => {
    fc.assert(
      fc.property(
        // Generate any shard balance (even high amounts)
        fc.integer({ min: 0, max: 100000 }),
        (shards) => {
          // hasUsedRestore is true (already used)
          const canUseRestore = canRestoreV2(shards, true);

          // When restore has been used, it should always be disabled
          return canUseRestore === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 24: Single Restore Per Run (High Balance)**
   * **Validates: Requirements 8.8**
   *
   * Even with very high shard balance, restore SHALL be disabled after use.
   */
  test('Restore is disabled after use even with very high balance', () => {
    fc.assert(
      fc.property(
        // Generate very high shard balances
        fc.integer({ min: 1000, max: 1000000 }),
        (shards) => {
          // First restore should be available
          const firstRestore = canRestoreV2(shards, false);

          // After use, restore should be disabled
          const secondRestore = canRestoreV2(shards, true);

          return firstRestore === true && secondRestore === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 24: Single Restore Per Run (State Transition)**
   * **Validates: Requirements 8.8**
   *
   * The transition from available to used SHALL permanently disable restore for the run.
   */
  test('Restore state transition is permanent within a run', () => {
    // Simulate a run where restore is used
    const initialShards = 500;

    // Before use
    expect(canRestoreV2(initialShards, false)).toBe(true);

    // After use (hasUsedRestore becomes true)
    expect(canRestoreV2(initialShards, true)).toBe(false);

    // Even with more shards, still disabled
    expect(canRestoreV2(initialShards + 1000, true)).toBe(false);
  });
});


// ============================================================================
// Restore Currency Deduction Properties - Requirements 8.4
// ============================================================================

import {
  applyInvulnerability,
  clearSafeZone,
  deductRestoreCost,
  executeRestoreV2,
} from './restoreSystem';

describe('Restore Currency Deduction Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 20: Restore Currency Deduction**
   * **Validates: Requirements 8.4**
   *
   * For any restore activation, exactly 100 Echo Shards SHALL be deducted from the player's balance.
   */
  test('Restore deducts exactly 100 Echo Shards', () => {
    fc.assert(
      fc.property(
        // Generate shard balance >= 100 (valid for restore)
        fc.integer({ min: 100, max: 100000 }),
        (shards) => {
          const newBalance = deductRestoreCost(shards);
          const expectedBalance = shards - 100;

          return newBalance === expectedBalance;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 20: Restore Currency Deduction (Exact Amount)**
   * **Validates: Requirements 8.4**
   *
   * The deduction amount SHALL always be exactly 100, regardless of balance.
   */
  test('Deduction amount is always exactly 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 100000 }),
        (shards) => {
          const newBalance = deductRestoreCost(shards);
          const deductedAmount = shards - newBalance;

          return deductedAmount === 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 20: Restore Currency Deduction (Non-Negative)**
   * **Validates: Requirements 8.4**
   *
   * The resulting balance SHALL never be negative.
   */
  test('Balance never goes negative after deduction', () => {
    fc.assert(
      fc.property(
        // Test with any balance including edge cases
        fc.integer({ min: 0, max: 100000 }),
        (shards) => {
          const newBalance = deductRestoreCost(shards);

          // Balance should never be negative
          return newBalance >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 20: Restore Currency Deduction (Boundary)**
   * **Validates: Requirements 8.4**
   *
   * At exactly 100 shards, deduction SHALL result in 0 balance.
   */
  test('Deduction at exactly 100 shards results in 0 balance', () => {
    const newBalance = deductRestoreCost(100);
    expect(newBalance).toBe(0);
  });
});


// ============================================================================
// Restore State Rewind Properties - Requirements 8.5
// ============================================================================

describe('Restore State Rewind Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 21: Restore State Rewind**
   * **Validates: Requirements 8.5**
   *
   * For any restore execution, the game state SHALL match the snapshot from 3 seconds before collision.
   */
  test('Restored state matches snapshot state', () => {
    fc.assert(
      fc.property(
        // Generate two different snapshots (current and restore target)
        gameSnapshotArb,
        gameSnapshotArb,
        (currentSnapshot, targetSnapshot) => {
          // Execute restore from current to target
          const restoredState = executeRestoreV2(currentSnapshot, targetSnapshot);

          // Verify core state values match the target snapshot
          const timestampMatch = restoredState.timestamp === targetSnapshot.timestamp;
          const scoreMatch = restoredState.score === targetSnapshot.score;
          const speedMatch = restoredState.gameSpeed === targetSnapshot.gameSpeed;
          const positionMatch = restoredState.playerPosition === targetSnapshot.playerPosition;
          const swapMatch = restoredState.orbSwapState === targetSnapshot.orbSwapState;
          const connectorMatch = restoredState.connectorLength === targetSnapshot.connectorLength;
          const midlineMatch = restoredState.midlineY === targetSnapshot.midlineY;

          return timestampMatch && scoreMatch && speedMatch && positionMatch &&
            swapMatch && connectorMatch && midlineMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 21: Restore State Rewind (Obstacle Preservation)**
   * **Validates: Requirements 8.5**
   *
   * Restored state SHALL include obstacles from the snapshot.
   */
  test('Restored state includes snapshot obstacles', () => {
    fc.assert(
      fc.property(
        gameSnapshotArb,
        gameSnapshotArb,
        (currentSnapshot, targetSnapshot) => {
          const restoredState = executeRestoreV2(currentSnapshot, targetSnapshot);

          // Obstacle count should match target snapshot
          return restoredState.obstacles.length === targetSnapshot.obstacles.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 21: Restore State Rewind (Shift State)**
   * **Validates: Requirements 8.5**
   *
   * Restored state SHALL include S.H.I.F.T. protocol state from the snapshot.
   */
  test('Restored state includes shift protocol state', () => {
    fc.assert(
      fc.property(
        gameSnapshotArb,
        gameSnapshotArb,
        (currentSnapshot, targetSnapshot) => {
          const restoredState = executeRestoreV2(currentSnapshot, targetSnapshot);

          // Shift state should match target
          const overdriveMatch = restoredState.shiftState.overdriveActive === targetSnapshot.shiftState.overdriveActive;
          const timerMatch = restoredState.shiftState.overdriveTimer === targetSnapshot.shiftState.overdriveTimer;

          return overdriveMatch && timerMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 21: Restore State Rewind (Resonance State)**
   * **Validates: Requirements 8.5**
   *
   * Restored state SHALL include resonance state from the snapshot.
   */
  test('Restored state includes resonance state', () => {
    fc.assert(
      fc.property(
        gameSnapshotArb,
        gameSnapshotArb,
        (currentSnapshot, targetSnapshot) => {
          const restoredState = executeRestoreV2(currentSnapshot, targetSnapshot);

          // Resonance state should match target
          const activeMatch = restoredState.resonanceState.isActive === targetSnapshot.resonanceState.isActive;
          const multiplierMatch = restoredState.resonanceState.multiplier === targetSnapshot.resonanceState.multiplier;

          return activeMatch && multiplierMatch;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 21: Restore State Rewind (Independence)**
   * **Validates: Requirements 8.5**
   *
   * Restored state SHALL be independent of current state (complete replacement).
   */
  test('Restored state is independent of current state', () => {
    fc.assert(
      fc.property(
        gameSnapshotArb,
        gameSnapshotArb,
        (currentSnapshot, targetSnapshot) => {
          // Ensure snapshots are different
          fc.pre(currentSnapshot.timestamp !== targetSnapshot.timestamp ||
            currentSnapshot.score !== targetSnapshot.score);

          const restoredState = executeRestoreV2(currentSnapshot, targetSnapshot);

          // Restored state should match target, not current
          return restoredState.timestamp === targetSnapshot.timestamp &&
            restoredState.score === targetSnapshot.score;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// ============================================================================
// Safe Zone Clearance Properties - Requirements 8.6
// ============================================================================

describe('Safe Zone Clearance Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 22: Safe Zone Clearance**
   * **Validates: Requirements 8.6**
   *
   * For any restore execution, no obstacles SHALL exist within 100 pixels of the player position.
   */
  test('No obstacles within safe zone radius after clearance', () => {
    fc.assert(
      fc.property(
        // Generate player X position
        fc.integer({ min: 100, max: 900 }),
        // Generate obstacles at various positions
        fc.array(obstacleArb, { minLength: 1, maxLength: 20 }),
        // Generate safe zone radius (default 100)
        fc.constantFrom(100, RESTORE_CONFIG.safeZoneRadius),
        (playerX, obstacles, radius) => {
          const clearedObstacles = clearSafeZone(obstacles, playerX, radius);

          // Verify no remaining obstacle is within the safe zone
          for (const obstacle of clearedObstacles) {
            const distance = Math.abs(obstacle.x - playerX);
            if (distance < radius) {
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
   * **Feature: echo-shift-v2-mechanics, Property 22: Safe Zone Clearance (Preservation)**
   * **Validates: Requirements 8.6**
   *
   * Obstacles outside the safe zone SHALL be preserved.
   */
  test('Obstacles outside safe zone are preserved', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 900 }),
        fc.array(obstacleArb, { minLength: 1, maxLength: 20 }),
        (playerX, obstacles) => {
          const radius = 100;
          const clearedObstacles = clearSafeZone(obstacles, playerX, radius);

          // Count obstacles that should be preserved (outside safe zone)
          const expectedPreserved = obstacles.filter(obs =>
            Math.abs(obs.x - playerX) >= radius
          );

          // All preserved obstacles should be in the result
          return clearedObstacles.length === expectedPreserved.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 22: Safe Zone Clearance (Boundary)**
   * **Validates: Requirements 8.6**
   *
   * Obstacles at exactly the boundary (100px) SHALL be preserved.
   */
  test('Obstacles at exactly boundary distance are preserved', () => {
    const playerX = 500;
    const radius = 100;

    // Create obstacle at exactly the boundary
    const boundaryObstacle: Obstacle = {
      id: 'boundary-test',
      x: playerX + radius, // Exactly at 100px distance
      y: 200,
      targetY: 200,
      width: 24,
      height: 100,
      lane: 'top',
      polarity: 'white',
      passed: false,
    };

    // Create obstacle inside safe zone
    const insideObstacle: Obstacle = {
      id: 'inside-test',
      x: playerX + 50, // 50px distance (inside)
      y: 200,
      targetY: 200,
      width: 24,
      height: 100,
      lane: 'bottom',
      polarity: 'black',
      passed: false,
    };

    const obstacles = [boundaryObstacle, insideObstacle];
    const clearedObstacles = clearSafeZone(obstacles, playerX, radius);

    // Boundary obstacle should be preserved, inside obstacle should be removed
    expect(clearedObstacles.length).toBe(1);
    expect(clearedObstacles[0].id).toBe('boundary-test');
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 22: Safe Zone Clearance (Both Sides)**
   * **Validates: Requirements 8.6**
   *
   * Safe zone SHALL clear obstacles on both sides of the player.
   */
  test('Safe zone clears obstacles on both sides of player', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 800 }),
        (playerX) => {
          const radius = 100;

          // Create obstacles on both sides within safe zone
          const leftObstacle: Obstacle = {
            id: 'left',
            x: playerX - 50,
            y: 200,
            targetY: 200,
            width: 24,
            height: 100,
            lane: 'top',
            polarity: 'white',
            passed: false,
          };

          const rightObstacle: Obstacle = {
            id: 'right',
            x: playerX + 50,
            y: 200,
            targetY: 200,
            width: 24,
            height: 100,
            lane: 'bottom',
            polarity: 'black',
            passed: false,
          };

          const obstacles = [leftObstacle, rightObstacle];
          const clearedObstacles = clearSafeZone(obstacles, playerX, radius);

          // Both should be cleared
          return clearedObstacles.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 22: Safe Zone Clearance (Empty Input)**
   * **Validates: Requirements 8.6**
   *
   * Empty obstacle array SHALL return empty array.
   */
  test('Empty obstacle array returns empty array', () => {
    const clearedObstacles = clearSafeZone([], 500, 100);
    expect(clearedObstacles).toEqual([]);
  });
});


// ============================================================================
// Post-Restore Invulnerability Properties - Requirements 8.7
// ============================================================================

describe('Post-Restore Invulnerability Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 23: Post-Restore Invulnerability**
   * **Validates: Requirements 8.7**
   *
   * For any completed restore, the player SHALL have 2 seconds of invulnerability.
   */
  test('Invulnerability is applied with 2 second duration', () => {
    fc.assert(
      fc.property(
        // Generate initial invulnerability state
        fc.boolean(),
        fc.integer({ min: 0, max: 10000 }),
        (initialInvulnerable, initialTimer) => {
          const state = {
            isInvulnerable: initialInvulnerable,
            invulnerabilityTimer: initialTimer,
          };

          // Apply invulnerability (default 2000ms)
          const newState = applyInvulnerability(state);

          // Should be invulnerable with 2000ms timer
          return newState.isInvulnerable === true &&
            newState.invulnerabilityTimer === 2000;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 23: Post-Restore Invulnerability (Flag)**
   * **Validates: Requirements 8.7**
   *
   * After applying invulnerability, isInvulnerable SHALL be true.
   */
  test('Invulnerability flag is set to true', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 0, max: 10000 }),
        (initialInvulnerable, initialTimer) => {
          const state = {
            isInvulnerable: initialInvulnerable,
            invulnerabilityTimer: initialTimer,
          };

          const newState = applyInvulnerability(state);

          return newState.isInvulnerable === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 23: Post-Restore Invulnerability (Timer)**
   * **Validates: Requirements 8.7**
   *
   * Invulnerability timer SHALL be set to exactly 2000 milliseconds.
   */
  test('Invulnerability timer is exactly 2000ms', () => {
    const state = {
      isInvulnerable: false,
      invulnerabilityTimer: 0,
    };

    const newState = applyInvulnerability(state);

    expect(newState.invulnerabilityTimer).toBe(2000);
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 23: Post-Restore Invulnerability (Custom Duration)**
   * **Validates: Requirements 8.7**
   *
   * Custom duration parameter SHALL override default 2 seconds.
   */
  test('Custom duration overrides default', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 10000 }),
        (customDuration) => {
          const state = {
            isInvulnerable: false,
            invulnerabilityTimer: 0,
          };

          const newState = applyInvulnerability(state, customDuration);

          return newState.invulnerabilityTimer === customDuration &&
            newState.isInvulnerable === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 23: Post-Restore Invulnerability (State Preservation)**
   * **Validates: Requirements 8.7**
   *
   * Other state properties SHALL be preserved when applying invulnerability.
   */
  test('Other state properties are preserved', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 0, max: 10000 }),
        fc.string(),
        fc.integer({ min: 0, max: 1000000 }),
        (initialInvulnerable, initialTimer, extraProp, extraNum) => {
          const state = {
            isInvulnerable: initialInvulnerable,
            invulnerabilityTimer: initialTimer,
            someOtherProp: extraProp,
            anotherProp: extraNum,
          };

          const newState = applyInvulnerability(state);

          // Other properties should be preserved
          return newState.someOtherProp === extraProp &&
            newState.anotherProp === extraNum;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 23: Post-Restore Invulnerability (Overwrite)**
   * **Validates: Requirements 8.7**
   *
   * Applying invulnerability SHALL overwrite any existing invulnerability state.
   */
  test('Applying invulnerability overwrites existing state', () => {
    // Start with existing invulnerability
    const state = {
      isInvulnerable: true,
      invulnerabilityTimer: 500, // Only 500ms remaining
    };

    // Apply fresh invulnerability
    const newState = applyInvulnerability(state);

    // Should reset to full 2000ms
    expect(newState.isInvulnerable).toBe(true);
    expect(newState.invulnerabilityTimer).toBe(2000);
  });
});
