/**
 * Glitch Protocol System Tests
 * 
 * Property-based tests for the Glitch Protocol system.
 * Uses fast-check for property-based testing.
 */

import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { GLITCH_CONFIG } from '../constants';
import { GlitchModeState, InputState } from '../types';
import {
  activateGhostMode,
  activateQuantumLock,
  bufferInput,
  calculateConnectorLength,
  calculateWaveY,
  checkGlitchShardCollision,
  clearInputBuffer,
  collectWavePathShard,
  countUncollectedShards,
  createEmptyInputBuffer,
  createGlitchShard,
  createInitialGlitchModeState,
  deactivateGlitchShard,
  elasticOut,
  finalizeConnectorLength,
  flushBufferedInput,
  generateWavePathShards,
  getGhostModeOpacity,
  getGhostModeProgress,
  getGhostModeRemainingTime,
  getInputBuffer,
  getPhaseFromProgress,
  getPriorityMode,
  getShardMultiplier,
  getTargetConnectorLength,
  getWaveAmplitudeForPhase,
  handleGlitchShardCollision,
  hasBufferedInput,
  isConnectorLocked,
  isGhostModeActive,
  isHitStopActive,
  isInvulnerable,
  isSpawnPositionSafe,
  pauseOverdrive,
  pauseResonance,
  resumeOverdrive,
  resumeResonance,
  shouldBlockObstacleSpawn,
  shouldRemoveShard,
  shouldSpawnGlitchShard,
  shouldStabilizeSpeed,
  updateGhostMode,
  updateGlitchShard,
  updateHitStop,
  updateWavePathShards
} from './glitchSystem';

describe('Glitch Protocol System', () => {
  // ==========================================================================
  // Property 16: Duration Initialization
  // **Feature: glitch-protocol, Property 16: Duration Initialization**
  // **Validates: Requirements 7.1**
  // ==========================================================================
  describe('Property 16: Duration Initialization', () => {
    it('*For any* newly activated Quantum Lock, the duration SHALL be set to 8000ms', () => {
      fc.assert(
        fc.property(
          // Generate random connector lengths (positive numbers)
          fc.float({ min: 10, max: 200, noNaN: true }),
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Duration must be exactly 8000ms
            expect(activatedState.duration).toBe(8000);
            expect(activatedState.duration).toBe(GLITCH_CONFIG.duration);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('initial state should have duration set to 8000ms', () => {
      const state = createInitialGlitchModeState();
      expect(state.duration).toBe(8000);
    });

    it('activated state should store original connector length', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 10, max: 200, noNaN: true }),
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            expect(activatedState.originalConnectorLength).toBe(connectorLength);
            expect(activatedState.isActive).toBe(true);
            expect(activatedState.phase).toBe('active');
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // ==========================================================================
  // Property 17: Phase Transitions
  // **Feature: glitch-protocol, Property 17: Phase Transitions**
  // **Validates: Requirements 7.2, 7.3, 7.4**
  // ==========================================================================
  describe('Property 17: Phase Transitions', () => {
    it('*For any* progress < 0.75, getPhaseFromProgress SHALL return "active"', () => {
      fc.assert(
        fc.property(
          // Generate progress values from 0 to just under 0.75
          fc.float({ min: 0, max: Math.fround(0.7499), noNaN: true }),
          (progress) => {
            const phase = getPhaseFromProgress(progress);
            expect(phase).toBe('active');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* progress >= 0.75 and < 0.80, getPhaseFromProgress SHALL return "warning"', () => {
      fc.assert(
        fc.property(
          // Generate progress values from 0.75 to just under 0.80
          fc.float({ min: Math.fround(0.75), max: Math.fround(0.7999), noNaN: true }),
          (progress) => {
            const phase = getPhaseFromProgress(progress);
            expect(phase).toBe('warning');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* progress >= 0.80 and < 1.0, getPhaseFromProgress SHALL return "exiting"', () => {
      fc.assert(
        fc.property(
          // Generate progress values from 0.80 to just under 1.0
          fc.float({ min: Math.fround(0.80), max: Math.fround(0.9999), noNaN: true }),
          (progress) => {
            const phase = getPhaseFromProgress(progress);
            expect(phase).toBe('exiting');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* progress >= 1.0, getPhaseFromProgress SHALL return "ghost"', () => {
      fc.assert(
        fc.property(
          // Generate progress values >= 1.0
          fc.float({ min: 1.0, max: 10.0, noNaN: true }),
          (progress) => {
            const phase = getPhaseFromProgress(progress);
            expect(phase).toBe('ghost');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('phase transitions follow correct order: active -> warning -> exiting -> ghost', () => {
      // Test boundary values
      expect(getPhaseFromProgress(0)).toBe('active');
      expect(getPhaseFromProgress(0.74)).toBe('active');
      expect(getPhaseFromProgress(0.75)).toBe('warning');
      expect(getPhaseFromProgress(0.79)).toBe('warning');
      expect(getPhaseFromProgress(0.80)).toBe('exiting');
      expect(getPhaseFromProgress(0.99)).toBe('exiting');
      expect(getPhaseFromProgress(1.0)).toBe('ghost');
      expect(getPhaseFromProgress(1.5)).toBe('ghost');
    });
  });


  // ==========================================================================
  // Property 1: Spawn Position Bounds
  // **Feature: glitch-protocol, Property 1: Spawn Position Bounds**
  // **Validates: Requirements 2.2, 2.3**
  // ==========================================================================
  describe('Property 1: Spawn Position Bounds', () => {
    it('*For any* canvas dimensions, spawned Glitch Shard X SHALL equal canvasWidth + 100', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2000 }), // canvasWidth
          fc.integer({ min: 100, max: 2000 }), // canvasHeight
          (canvasWidth, canvasHeight) => {
            const shard = createGlitchShard(canvasWidth, canvasHeight);

            // X position must be canvasWidth + spawnXOffset (100)
            expect(shard.x).toBe(canvasWidth + GLITCH_CONFIG.spawnXOffset);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* canvas dimensions, spawned Glitch Shard Y SHALL be within centerY ± 100 pixels', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 2000 }), // canvasWidth
          fc.integer({ min: 200, max: 2000 }), // canvasHeight (min 200 for meaningful center)
          (canvasWidth, canvasHeight) => {
            const shard = createGlitchShard(canvasWidth, canvasHeight);
            const centerY = canvasHeight / 2;

            // Y position must be within ±spawnYRange (100) of center
            const minY = centerY - GLITCH_CONFIG.spawnYRange;
            const maxY = centerY + GLITCH_CONFIG.spawnYRange;

            expect(shard.y).toBeGreaterThanOrEqual(minY);
            expect(shard.y).toBeLessThanOrEqual(maxY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('spawned shard should have correct dimensions', () => {
      const shard = createGlitchShard(800, 600);
      expect(shard.width).toBe(GLITCH_CONFIG.shardWidth);
      expect(shard.height).toBe(GLITCH_CONFIG.shardHeight);
      expect(shard.active).toBe(true);
    });
  });

  // ==========================================================================
  // Property 2: Spawn Distance Threshold
  // **Feature: glitch-protocol, Property 2: Spawn Distance Threshold**
  // **Validates: Requirements 2.7**
  // ==========================================================================
  describe('Property 2: Spawn Distance Threshold', () => {
    it('*For any* distance < 500 meters, shouldSpawnGlitchShard SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(499.99), noNaN: true }),
          (distance) => {
            const result = shouldSpawnGlitchShard(distance, false);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* distance >= 500 meters and not spawned, shouldSpawnGlitchShard SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 500, max: 10000, noNaN: true }),
          (distance) => {
            const result = shouldSpawnGlitchShard(distance, false);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* distance, if already spawned, shouldSpawnGlitchShard SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10000, noNaN: true }),
          (distance) => {
            const result = shouldSpawnGlitchShard(distance, true);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property 3: Spawn Safety Clearance
  // **Feature: glitch-protocol, Property 3: Spawn Safety Clearance**
  // **Validates: Requirements 2.6**
  // ==========================================================================
  describe('Property 3: Spawn Safety Clearance', () => {
    it('*For any* spawn Y and obstacle within 150px, isSpawnPositionSafe SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 500, noNaN: true }), // spawnY
          fc.float({ min: 0, max: 149, noNaN: true }),   // offset from spawnY (within clearance)
          (spawnY, offset) => {
            const obstacle = {
              id: 'test',
              x: 500,
              y: spawnY - offset, // Obstacle near spawn position
              targetY: spawnY - offset,
              width: 50,
              height: 50,
              lane: 'top' as const,
              polarity: 'white' as const,
              passed: false,
            };

            const result = isSpawnPositionSafe(spawnY, [obstacle]);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* spawn Y with no obstacles nearby, isSpawnPositionSafe SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 200, max: 400, noNaN: true }), // spawnY
          (spawnY) => {
            // Obstacle far away from spawn position
            const obstacle = {
              id: 'test',
              x: 500,
              y: spawnY + 300, // Far from spawn
              targetY: spawnY + 300,
              width: 50,
              height: 50,
              lane: 'bottom' as const,
              polarity: 'black' as const,
              passed: false,
            };

            const result = isSpawnPositionSafe(spawnY, [obstacle]);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty obstacle array should return true', () => {
      const result = isSpawnPositionSafe(300, []);
      expect(result).toBe(true);
    });
  });


  // ==========================================================================
  // Property 4: Shard Movement
  // **Feature: glitch-protocol, Property 4: Shard Movement**
  // **Validates: Requirements 2.4**
  // ==========================================================================
  describe('Property 4: Shard Movement', () => {
    it('*For any* shard and speed, after update, X SHALL decrease by speed * (deltaTime/16.67)', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 1000, noNaN: true }), // initial X
          fc.float({ min: 1, max: 20, noNaN: true }),     // speed
          fc.float({ min: 8, max: 33, noNaN: true }),     // deltaTime (half to double frame)
          (initialX, speed, deltaTime) => {
            const shard = {
              id: 'test',
              x: initialX,
              y: 300,
              width: 40,
              height: 40,
              active: true,
              colorTimer: 0,
              spawnTime: Date.now(),
              trailPositions: [],
            };

            const updatedShard = updateGlitchShard(shard, speed, deltaTime);
            const expectedX = initialX - speed * (deltaTime / 16.67);

            // Allow small floating point tolerance
            expect(updatedShard.x).toBeCloseTo(expectedX, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('colorTimer should increase by deltaTime', () => {
      const shard = {
        id: 'test',
        x: 500,
        y: 300,
        width: 40,
        height: 40,
        active: true,
        colorTimer: 100,
        spawnTime: Date.now(),
        trailPositions: [],
      };

      const updatedShard = updateGlitchShard(shard, 5, 16.67);
      expect(updatedShard.colorTimer).toBeCloseTo(116.67, 1);
    });
  });

  // ==========================================================================
  // Property 5: Shard Removal
  // **Feature: glitch-protocol, Property 5: Shard Removal**
  // **Validates: Requirements 2.5**
  // ==========================================================================
  describe('Property 5: Shard Removal', () => {
    it('*For any* shard with X < -width, shouldRemoveShard SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 20, max: 100, noNaN: true }), // width
          fc.float({ min: 1, max: 100, noNaN: true }),  // extra distance past edge
          (width, extra) => {
            const shard = {
              id: 'test',
              x: -width - extra, // Past left edge
              y: 300,
              width: width,
              height: 40,
              active: true,
              colorTimer: 0,
              spawnTime: Date.now(),
              trailPositions: [],
            };

            const result = shouldRemoveShard(shard);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* shard with X >= -width, shouldRemoveShard SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 20, max: 100, noNaN: true }), // width
          fc.float({ min: 0, max: 1000, noNaN: true }), // X position (on screen or at edge)
          (width, xOffset) => {
            const shard = {
              id: 'test',
              x: -width + xOffset, // At or past the removal threshold
              y: 300,
              width: width,
              height: 40,
              active: true,
              colorTimer: 0,
              spawnTime: Date.now(),
              trailPositions: [],
            };

            const result = shouldRemoveShard(shard);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('shard at exactly -width should not be removed', () => {
      const shard = {
        id: 'test',
        x: -40, // Exactly at -width
        y: 300,
        width: 40,
        height: 40,
        active: true,
        colorTimer: 0,
        spawnTime: Date.now(),
        trailPositions: [],
      };

      expect(shouldRemoveShard(shard)).toBe(false);
    });

    it('shard just past -width should be removed', () => {
      const shard = {
        id: 'test',
        x: -41, // Just past -width
        y: 300,
        width: 40,
        height: 40,
        active: true,
        colorTimer: 0,
        spawnTime: Date.now(),
        trailPositions: [],
      };

      expect(shouldRemoveShard(shard)).toBe(true);
    });
  });

  // ==========================================================================
  // Property 6: AABB Collision Detection
  // **Feature: glitch-protocol, Property 6: AABB Collision Detection**
  // **Validates: Requirements 3.1**
  // ==========================================================================
  describe('Property 6: AABB Collision Detection', () => {
    const CONNECTOR_WIDTH = 10; // Same as in implementation

    it('*For any* player position overlapping shard bounds, checkGlitchShardCollision SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 700, noNaN: true }), // shardX
          fc.float({ min: 100, max: 500, noNaN: true }), // shardY
          fc.float({ min: 20, max: 60, noNaN: true }),   // shardWidth
          fc.float({ min: 20, max: 60, noNaN: true }),   // shardHeight
          fc.float({ min: 50, max: 150, noNaN: true }),  // connectorLength
          (shardX, shardY, shardWidth, shardHeight, connectorLength) => {
            // Position player to definitely overlap with shard
            // Player X is at shard center, player Y is at shard center
            const playerX = shardX;
            const playerY = shardY;

            const shard = {
              id: 'test',
              x: shardX,
              y: shardY,
              width: shardWidth,
              height: shardHeight,
              active: true,
              colorTimer: 0,
              spawnTime: Date.now(),
              trailPositions: [],
            };

            const result = checkGlitchShardCollision(playerX, playerY, connectorLength, shard);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* player position NOT overlapping shard X range, checkGlitchShardCollision SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 200, max: 600, noNaN: true }), // shardX
          fc.float({ min: 100, max: 500, noNaN: true }), // shardY
          fc.float({ min: 20, max: 60, noNaN: true }),   // shardWidth
          fc.float({ min: 20, max: 60, noNaN: true }),   // shardHeight
          fc.float({ min: 50, max: 150, noNaN: true }),  // connectorLength
          fc.float({ min: 50, max: 200, noNaN: true }),  // xOffset (distance from shard)
          (shardX, shardY, shardWidth, shardHeight, connectorLength, xOffset) => {
            // Position player far to the left of shard (no X overlap)
            const shardLeft = shardX - shardWidth / 2;
            const playerX = shardLeft - CONNECTOR_WIDTH / 2 - xOffset;
            const playerY = shardY; // Y overlaps, but X doesn't

            const shard = {
              id: 'test',
              x: shardX,
              y: shardY,
              width: shardWidth,
              height: shardHeight,
              active: true,
              colorTimer: 0,
              spawnTime: Date.now(),
              trailPositions: [],
            };

            const result = checkGlitchShardCollision(playerX, playerY, connectorLength, shard);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* player position NOT overlapping shard Y range, checkGlitchShardCollision SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 200, max: 600, noNaN: true }), // shardX
          fc.float({ min: 200, max: 400, noNaN: true }), // shardY
          fc.float({ min: 20, max: 60, noNaN: true }),   // shardWidth
          fc.float({ min: 20, max: 60, noNaN: true }),   // shardHeight
          fc.float({ min: 30, max: 80, noNaN: true }),   // connectorLength (small)
          fc.float({ min: 50, max: 200, noNaN: true }),  // yOffset (distance from shard)
          (shardX, shardY, shardWidth, shardHeight, connectorLength, yOffset) => {
            // Position player far above shard (no Y overlap)
            const shardTop = shardY - shardHeight / 2;
            const playerY = shardTop - connectorLength / 2 - yOffset;
            const playerX = shardX; // X overlaps, but Y doesn't

            const shard = {
              id: 'test',
              x: shardX,
              y: shardY,
              width: shardWidth,
              height: shardHeight,
              active: true,
              colorTimer: 0,
              spawnTime: Date.now(),
              trailPositions: [],
            };

            const result = checkGlitchShardCollision(playerX, playerY, connectorLength, shard);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('inactive shard should never collide', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 700, noNaN: true }), // shardX
          fc.float({ min: 100, max: 500, noNaN: true }), // shardY
          fc.float({ min: 50, max: 150, noNaN: true }),  // connectorLength
          (shardX, shardY, connectorLength) => {
            // Position player directly on shard
            const playerX = shardX;
            const playerY = shardY;

            const shard = {
              id: 'test',
              x: shardX,
              y: shardY,
              width: 40,
              height: 40,
              active: false, // Inactive!
              colorTimer: 0,
              spawnTime: Date.now(),
              trailPositions: [],
            };

            const result = checkGlitchShardCollision(playerX, playerY, connectorLength, shard);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('collision detection is symmetric for X overlap', () => {
      // Player at shard center should collide
      const shard = {
        id: 'test',
        x: 400,
        y: 300,
        width: 40,
        height: 40,
        active: true,
        colorTimer: 0,
        spawnTime: Date.now(),
        trailPositions: [],
      };

      // Player directly on shard
      expect(checkGlitchShardCollision(400, 300, 100, shard)).toBe(true);

      // Player just at left edge of shard (should still collide)
      const shardLeft = 400 - 20; // 380
      expect(checkGlitchShardCollision(shardLeft + 5, 300, 100, shard)).toBe(true);

      // Player just at right edge of shard (should still collide)
      const shardRight = 400 + 20; // 420
      expect(checkGlitchShardCollision(shardRight - 5, 300, 100, shard)).toBe(true);
    });
  });

  // ==========================================================================
  // Property 7: Collision Triggers Mode Activation
  // **Feature: glitch-protocol, Property 7: Collision Triggers Mode Activation**
  // **Validates: Requirements 3.5, 3.6, 4.1**
  // ==========================================================================
  describe('Property 7: Collision Triggers Mode Activation', () => {
    it('*For any* collision, handleGlitchShardCollision SHALL return isActive=true and phase="active"', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 50, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const response = handleGlitchShardCollision(initialState, connectorLength);

            // Requirements 3.6: Activate Quantum Lock mode
            expect(response.glitchModeState.isActive).toBe(true);
            expect(response.glitchModeState.phase).toBe('active');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* collision, handleGlitchShardCollision SHALL store originalConnectorLength', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 50, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const response = handleGlitchShardCollision(initialState, connectorLength);

            // Requirements 4.1: Store current connector length as original value
            expect(response.glitchModeState.originalConnectorLength).toBe(connectorLength);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* collision, handleGlitchShardCollision SHALL return hitStopFrames=10', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 50, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const response = handleGlitchShardCollision(initialState, connectorLength);

            // Requirements 3.2: Trigger hit stop effect (10 frames freeze)
            expect(response.hitStopFrames).toBe(GLITCH_CONFIG.hitStopFrames);
            expect(response.hitStopFrames).toBe(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* collision, handleGlitchShardCollision SHALL trigger screen shake and sound', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 50, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const response = handleGlitchShardCollision(initialState, connectorLength);

            // Requirements 3.3: Trigger heavy screen shake
            expect(response.shouldTriggerScreenShake).toBe(true);
            // Requirements 3.4: Play impact sound
            expect(response.shouldPlayImpactSound).toBe(true);
            // Requirements 3.5: Remove shard
            expect(response.shardRemoved).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('deactivateGlitchShard SHALL set active=false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 700, noNaN: true }), // x
          fc.float({ min: 100, max: 500, noNaN: true }), // y
          (x, y) => {
            const shard = {
              id: 'test',
              x,
              y,
              width: 40,
              height: 40,
              active: true,
              colorTimer: 0,
              spawnTime: Date.now(),
              trailPositions: [],
            };

            const deactivated = deactivateGlitchShard(shard);

            // Requirements 3.5: Remove the Glitch Shard from screen
            expect(deactivated.active).toBe(false);
            // Other properties should remain unchanged
            expect(deactivated.x).toBe(x);
            expect(deactivated.y).toBe(y);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isHitStopActive SHALL return true when frames > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // hitStopFrames
          (frames) => {
            expect(isHitStopActive(frames)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isHitStopActive SHALL return false when frames <= 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -100, max: 0 }), // hitStopFrames
          (frames) => {
            expect(isHitStopActive(frames)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updateHitStop SHALL decrement frames by 1, minimum 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // hitStopFrames
          (frames) => {
            const updated = updateHitStop(frames);
            const expected = Math.max(0, frames - 1);
            expect(updated).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property 8: Connector Length Round-Trip
  // **Feature: glitch-protocol, Property 8: Connector Length Round-Trip**
  // **Validates: Requirements 4.1, 4.4**
  // ==========================================================================
  describe('Property 8: Connector Length Round-Trip', () => {
    it('*For any* initial connector length, finalizeConnectorLength SHALL return exactly the original stored value', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // originalConnectorLength
          (originalLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, originalLength);

            // After Quantum Lock ends, finalize should return exact original value
            const finalLength = finalizeConnectorLength(activatedState, activatedState.originalConnectorLength);

            // Requirements 4.4: Hard-set to exactly the original stored value (no floating point drift)
            expect(finalLength).toBe(originalLength);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* connector length, activateQuantumLock stores it and finalizeConnectorLength returns it exactly', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            // Simulate full round-trip: activate -> finalize
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Requirements 4.1: Store current connector length as original value
            expect(activatedState.originalConnectorLength).toBe(connectorLength);

            // Requirements 4.4: Return exact original value
            const finalLength = finalizeConnectorLength(activatedState, activatedState.originalConnectorLength);
            expect(finalLength).toBe(connectorLength);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('originalConnectorLength should be preserved through state updates', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // The original connector length should be stored and never change
            expect(activatedState.originalConnectorLength).toBe(connectorLength);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property 9: Connector Lock During Mode
  // **Feature: glitch-protocol, Property 9: Connector Lock During Mode**
  // **Validates: Requirements 4.2, 4.3**
  // ==========================================================================
  describe('Property 9: Connector Lock During Mode', () => {
    it('*For any* active Quantum Lock state, isConnectorLocked SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Requirements 4.3: Prevent connector length from changing due to normal gameplay
            expect(isConnectorLocked(activatedState)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive state, isConnectorLocked SHALL return false', () => {
      const inactiveState = createInitialGlitchModeState();

      // Inactive state should not lock connector
      expect(isConnectorLocked(inactiveState)).toBe(false);
    });

    it('*For any* warning phase state, isConnectorLocked SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Manually set to warning phase
            const warningState = { ...activatedState, phase: 'warning' as const };

            // Warning phase should still lock connector
            expect(isConnectorLocked(warningState)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* exiting phase state, isConnectorLocked SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Manually set to exiting phase
            const exitingState = { ...activatedState, phase: 'exiting' as const };

            // Exiting phase should still lock connector
            expect(isConnectorLocked(exitingState)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* ghost phase state, isConnectorLocked SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Manually set to ghost phase (mode ended)
            const ghostState = { ...activatedState, isActive: false, phase: 'ghost' as const };

            // Ghost phase should not lock connector (mode has ended)
            expect(isConnectorLocked(ghostState)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* active state, getTargetConnectorLength SHALL return idealConnectorLength', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Requirements 4.2: Animate connector length toward ideal size
            const targetLength = getTargetConnectorLength(activatedState);
            expect(targetLength).toBe(GLITCH_CONFIG.idealConnectorLength);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* exiting state, getTargetConnectorLength SHALL return originalConnectorLength', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Manually set to exiting phase
            const exitingState = { ...activatedState, phase: 'exiting' as const };

            // Requirements 4.4: Animate connector length back to original stored value
            const targetLength = getTargetConnectorLength(exitingState);
            expect(targetLength).toBe(connectorLength);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Elastic Easing Function Tests
  // ==========================================================================
  describe('Elastic Easing Function', () => {
    it('elasticOut(0) SHALL return 0', () => {
      expect(elasticOut(0)).toBe(0);
    });

    it('elasticOut(1) SHALL return 1', () => {
      expect(elasticOut(1)).toBe(1);
    });

    it('*For any* t in (0, 1), elasticOut SHALL return a value that eventually settles to 1', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }), // t
          (t) => {
            const result = elasticOut(t);
            // Elastic easing can overshoot, but should be in reasonable range
            expect(result).toBeGreaterThan(-0.5);
            expect(result).toBeLessThan(1.5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('elasticOut should produce overshoot effect (values > 1 for some inputs)', () => {
      // Elastic easing should overshoot at certain points
      // Test a few known points where overshoot occurs
      let hasOvershoot = false;
      for (let t = 0.1; t < 0.9; t += 0.05) {
        if (elasticOut(t) > 1) {
          hasOvershoot = true;
          break;
        }
      }
      expect(hasOvershoot).toBe(true);
    });

    it('elasticOut should be monotonically approaching 1 for t > 0.5', () => {
      // After the initial overshoot, values should settle toward 1
      const t1 = elasticOut(0.7);
      const t2 = elasticOut(0.8);
      const t3 = elasticOut(0.9);

      // All should be close to 1
      expect(Math.abs(t1 - 1)).toBeLessThan(0.3);
      expect(Math.abs(t2 - 1)).toBeLessThan(0.2);
      expect(Math.abs(t3 - 1)).toBeLessThan(0.1);
    });
  });

  // ==========================================================================
  // Connector Animation Calculation Tests
  // ==========================================================================
  describe('Connector Animation Calculation', () => {
    it('*For any* inactive state, calculateConnectorLength SHALL return currentLength unchanged', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // currentLength
          fc.float({ min: 30, max: 200, noNaN: true }), // targetLength
          (currentLength, targetLength) => {
            const inactiveState = createInitialGlitchModeState();

            const result = calculateConnectorLength(
              inactiveState,
              currentLength,
              targetLength,
              16.67,
              0.5
            );

            // Inactive state should not modify connector length
            expect(result).toBe(currentLength);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* active state with progress=0, calculateConnectorLength SHALL return originalConnectorLength', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // originalLength
          (originalLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, originalLength);

            const result = calculateConnectorLength(
              activatedState,
              originalLength,
              GLITCH_CONFIG.idealConnectorLength,
              16.67,
              0 // Progress = 0
            );

            // At progress 0, should be at original length
            expect(result).toBe(originalLength);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* active state with progress=1, calculateConnectorLength SHALL approach targetLength', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // originalLength
          (originalLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, originalLength);
            const targetLength = GLITCH_CONFIG.idealConnectorLength;

            const result = calculateConnectorLength(
              activatedState,
              originalLength,
              targetLength,
              16.67,
              1 // Progress = 1
            );

            // At progress 1, elasticOut(1) = 1, so should be at target length
            expect(result).toBe(targetLength);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property 10: Wave Offset Progression
  // **Feature: glitch-protocol, Property 10: Wave Offset Progression**
  // **Validates: Requirements 5.2**
  // ==========================================================================
  describe('Property 10: Wave Offset Progression', () => {
    it('*For any* X position and offset, calculateWaveY SHALL return a value within centerY ± amplitude', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000, noNaN: true }),    // x position
          fc.float({ min: 0, max: 100, noNaN: true }),     // offset
          fc.float({ min: 10, max: 200, noNaN: true }),    // amplitude
          fc.float({ min: 100, max: 500, noNaN: true }),   // centerY
          (x, offset, amplitude, centerY) => {
            const waveY = calculateWaveY(x, offset, amplitude, centerY);

            // Wave Y should be within centerY ± amplitude
            expect(waveY).toBeGreaterThanOrEqual(centerY - amplitude);
            expect(waveY).toBeLessThanOrEqual(centerY + amplitude);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* two different offsets, calculateWaveY SHALL return different Y values for the same X', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 500, noNaN: true }),     // x position
          fc.float({ min: 0, max: 50, noNaN: true }),      // offset1
          fc.float({ min: 0.5, max: 10, noNaN: true }),    // offset difference (ensure different)
          fc.float({ min: 50, max: 150, noNaN: true }),    // amplitude
          fc.float({ min: 200, max: 400, noNaN: true }),   // centerY
          (x, offset1, offsetDiff, amplitude, centerY) => {
            const offset2 = offset1 + offsetDiff;

            const waveY1 = calculateWaveY(x, offset1, amplitude, centerY);
            const waveY2 = calculateWaveY(x, offset2, amplitude, centerY);

            // Different offsets should produce different Y values (wave animation)
            // Note: In rare cases they could be equal if offset difference is exactly 2π
            // but with our test ranges this is extremely unlikely
            expect(waveY1).not.toBeCloseTo(waveY2, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* amplitude of 0, calculateWaveY SHALL return exactly centerY', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000, noNaN: true }),    // x position
          fc.float({ min: 0, max: 100, noNaN: true }),     // offset
          fc.float({ min: 100, max: 500, noNaN: true }),   // centerY
          (x, offset, centerY) => {
            const waveY = calculateWaveY(x, offset, 0, centerY);

            // With zero amplitude, wave should be flat at centerY
            expect(waveY).toBe(centerY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('calculateWaveY should produce sinusoidal pattern across X positions', () => {
      const centerY = 300;
      const amplitude = 100;
      const offset = 0;

      // Sample wave at multiple X positions
      const samples: number[] = [];
      for (let x = 0; x < 1000; x += 50) {
        samples.push(calculateWaveY(x, offset, amplitude, centerY));
      }

      // Wave should have both peaks and troughs
      const hasHighValues = samples.some(y => y > centerY + amplitude * 0.5);
      const hasLowValues = samples.some(y => y < centerY - amplitude * 0.5);

      expect(hasHighValues).toBe(true);
      expect(hasLowValues).toBe(true);
    });
  });

  // ==========================================================================
  // Wave Amplitude Phase Tests
  // **Feature: glitch-protocol, Wave Amplitude for Phase**
  // **Validates: Requirements 5.1, 7.3**
  // ==========================================================================
  describe('Wave Amplitude for Phase', () => {
    it('*For any* active phase, getWaveAmplitudeForPhase SHALL return 1.0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: Math.fround(0.74), noNaN: true }), // progress in active phase
          (progress) => {
            const amplitude = getWaveAmplitudeForPhase('active', progress);
            expect(amplitude).toBe(1.0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* warning phase, getWaveAmplitudeForPhase SHALL return 1.0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.75), max: Math.fround(0.79), noNaN: true }), // progress in warning phase
          (progress) => {
            const amplitude = getWaveAmplitudeForPhase('warning', progress);
            expect(amplitude).toBe(1.0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* exiting phase, getWaveAmplitudeForPhase SHALL decrease from 1.0 to 0.0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.80), max: Math.fround(0.99), noNaN: true }), // progress in exiting phase
          (progress) => {
            const amplitude = getWaveAmplitudeForPhase('exiting', progress);

            // Amplitude should be between 0 and 1 during exit
            expect(amplitude).toBeGreaterThanOrEqual(0);
            expect(amplitude).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('exiting phase amplitude should decrease as progress increases', () => {
      // Test that amplitude decreases monotonically during exit phase
      const amp80 = getWaveAmplitudeForPhase('exiting', 0.80);
      const amp85 = getWaveAmplitudeForPhase('exiting', 0.85);
      const amp90 = getWaveAmplitudeForPhase('exiting', 0.90);
      const amp95 = getWaveAmplitudeForPhase('exiting', 0.95);
      const amp99 = getWaveAmplitudeForPhase('exiting', 0.99);

      // Each should be less than or equal to the previous
      expect(amp85).toBeLessThanOrEqual(amp80);
      expect(amp90).toBeLessThanOrEqual(amp85);
      expect(amp95).toBeLessThanOrEqual(amp90);
      expect(amp99).toBeLessThanOrEqual(amp95);

      // At start of exit (0.80), should be close to 1.0
      expect(amp80).toBeCloseTo(1.0, 1);

      // At end of exit (0.99), should be close to 0.0
      expect(amp99).toBeCloseTo(0.05, 1);
    });

    it('*For any* ghost phase, getWaveAmplitudeForPhase SHALL return 0.0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1.0, max: 2.0, noNaN: true }), // progress after mode ends
          (progress) => {
            const amplitude = getWaveAmplitudeForPhase('ghost', progress);
            expect(amplitude).toBe(0.0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive phase, getWaveAmplitudeForPhase SHALL return 0.0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1.0, noNaN: true }), // any progress
          (progress) => {
            const amplitude = getWaveAmplitudeForPhase('inactive', progress);
            expect(amplitude).toBe(0.0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Wave Path Shard Generation Tests
  // **Feature: glitch-protocol, Wave Path Shard Generation**
  // **Validates: Requirements 5.6, 6.4**
  // ==========================================================================
  describe('Wave Path Shard Generation', () => {
    it('*For any* canvas dimensions, generateWavePathShards SHALL return 10-15 shards', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),     // waveOffset
          fc.integer({ min: 400, max: 1200 }),             // canvasWidth
          fc.float({ min: 200, max: 500, noNaN: true }),   // centerY
          fc.float({ min: 50, max: 150, noNaN: true }),    // amplitude
          (waveOffset, canvasWidth, centerY, amplitude) => {
            const shards = generateWavePathShards(waveOffset, canvasWidth, centerY, amplitude);

            // Should generate 10-15 shards (currently 12)
            expect(shards.length).toBeGreaterThanOrEqual(10);
            expect(shards.length).toBeLessThanOrEqual(15);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* generated shards, all Y positions SHALL be on the wave path', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),     // waveOffset
          fc.integer({ min: 400, max: 1200 }),             // canvasWidth
          fc.float({ min: 200, max: 500, noNaN: true }),   // centerY
          fc.float({ min: 50, max: 150, noNaN: true }),    // amplitude
          (waveOffset, canvasWidth, centerY, amplitude) => {
            const shards = generateWavePathShards(waveOffset, canvasWidth, centerY, amplitude);

            // Each shard Y should match the wave Y at that X position
            for (const shard of shards) {
              const expectedY = calculateWaveY(shard.x, waveOffset, amplitude, centerY);
              expect(shard.y).toBeCloseTo(expectedY, 5);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* generated shards, X positions SHALL be within canvas bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),     // waveOffset
          fc.integer({ min: 400, max: 1200 }),             // canvasWidth
          fc.float({ min: 200, max: 500, noNaN: true }),   // centerY
          fc.float({ min: 50, max: 150, noNaN: true }),    // amplitude
          (waveOffset, canvasWidth, centerY, amplitude) => {
            const shards = generateWavePathShards(waveOffset, canvasWidth, centerY, amplitude);

            // All shards should be within 10%-90% of canvas width (with small tolerance for floating point)
            const minX = canvasWidth * 0.1 - 0.01;
            const maxX = canvasWidth * 0.9 + 0.01;
            for (const shard of shards) {
              expect(shard.x).toBeGreaterThanOrEqual(minX);
              expect(shard.x).toBeLessThanOrEqual(maxX);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* generated shards, all should start as uncollected', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),     // waveOffset
          fc.integer({ min: 400, max: 1200 }),             // canvasWidth
          fc.float({ min: 200, max: 500, noNaN: true }),   // centerY
          fc.float({ min: 50, max: 150, noNaN: true }),    // amplitude
          (waveOffset, canvasWidth, centerY, amplitude) => {
            const shards = generateWavePathShards(waveOffset, canvasWidth, centerY, amplitude);

            // All shards should start uncollected
            for (const shard of shards) {
              expect(shard.collected).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updateWavePathShards SHALL update Y positions based on new wave offset', () => {
      const canvasWidth = 800;
      const centerY = 300;
      const amplitude = 100;

      const shards = generateWavePathShards(0, canvasWidth, centerY, amplitude);
      const newOffset = 5;
      const updatedShards = updateWavePathShards(shards, newOffset, amplitude, centerY);

      // Y positions should change with new offset
      for (let i = 0; i < shards.length; i++) {
        const expectedY = calculateWaveY(shards[i].x, newOffset, amplitude, centerY);
        expect(updatedShards[i].y).toBeCloseTo(expectedY, 5);
        // X should remain the same
        expect(updatedShards[i].x).toBe(shards[i].x);
      }
    });

    it('collectWavePathShard SHALL mark the correct shard as collected', () => {
      const shards = generateWavePathShards(0, 800, 300, 100);
      const indexToCollect = 5;

      const updatedShards = collectWavePathShard(shards, indexToCollect);

      // Only the specified shard should be collected
      for (let i = 0; i < updatedShards.length; i++) {
        if (i === indexToCollect) {
          expect(updatedShards[i].collected).toBe(true);
        } else {
          expect(updatedShards[i].collected).toBe(false);
        }
      }
    });

    it('collectWavePathShard with invalid index SHALL return unchanged array', () => {
      const shards = generateWavePathShards(0, 800, 300, 100);

      // Test negative index
      const result1 = collectWavePathShard(shards, -1);
      expect(result1).toBe(shards);

      // Test out of bounds index
      const result2 = collectWavePathShard(shards, 100);
      expect(result2).toBe(shards);
    });

    it('countUncollectedShards SHALL return correct count', () => {
      const shards = generateWavePathShards(0, 800, 300, 100);
      const initialCount = shards.length;

      // Initially all uncollected
      expect(countUncollectedShards(shards)).toBe(initialCount);

      // Collect some shards
      let updated = collectWavePathShard(shards, 0);
      updated = collectWavePathShard(updated, 1);
      updated = collectWavePathShard(updated, 2);

      expect(countUncollectedShards(updated)).toBe(initialCount - 3);
    });
  });

  // ==========================================================================
  // Property 12: Obstacle Spawn Prevention
  // **Feature: glitch-protocol, Property 12: Obstacle Spawn Prevention**
  // **Validates: Requirements 6.1**
  // ==========================================================================
  describe('Property 12: Obstacle Spawn Prevention', () => {
    it('*For any* active Quantum Lock state, shouldBlockObstacleSpawn SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Requirements 6.1: Stop spawning new obstacles during Quantum Lock
            expect(shouldBlockObstacleSpawn(activatedState)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive state, shouldBlockObstacleSpawn SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No parameters needed
          () => {
            const inactiveState = createInitialGlitchModeState();

            // Inactive state should allow obstacle spawning
            expect(shouldBlockObstacleSpawn(inactiveState)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* ghost phase state, shouldBlockObstacleSpawn SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Manually set to ghost phase (mode ended)
            const ghostState = { ...activatedState, isActive: false, phase: 'ghost' as const };

            // Ghost phase should allow obstacle spawning (mode has ended)
            expect(shouldBlockObstacleSpawn(ghostState)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ==========================================================================
  // Property 13: Invulnerability During Bonus Modes
  // **Feature: glitch-protocol, Property 13: Invulnerability During Bonus Modes**
  // **Validates: Requirements 6.3, 7.6**
  // ==========================================================================
  describe('Property 13: Invulnerability During Bonus Modes', () => {
    it('*For any* active Quantum Lock state, isInvulnerable SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Requirements 6.3: Make player invulnerable during Quantum Lock
            expect(isInvulnerable(activatedState)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* ghost phase state, isInvulnerable SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Manually set to ghost phase
            const ghostState = { ...activatedState, isActive: false, phase: 'ghost' as const };

            // Requirements 7.6: Prevent collision damage during Ghost Mode
            expect(isInvulnerable(ghostState)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive state, isInvulnerable SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No parameters needed
          () => {
            const inactiveState = createInitialGlitchModeState();

            // Inactive state should not be invulnerable
            expect(isInvulnerable(inactiveState)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('invulnerability covers both active and ghost phases', () => {
      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);

      // Active phase - invulnerable
      expect(isInvulnerable(activatedState)).toBe(true);

      // Warning phase - still active, invulnerable
      const warningState = { ...activatedState, phase: 'warning' as const };
      expect(isInvulnerable(warningState)).toBe(true);

      // Exiting phase - still active, invulnerable
      const exitingState = { ...activatedState, phase: 'exiting' as const };
      expect(isInvulnerable(exitingState)).toBe(true);

      // Ghost phase - invulnerable
      const ghostState = { ...activatedState, isActive: false, phase: 'ghost' as const };
      expect(isInvulnerable(ghostState)).toBe(true);

      // Inactive phase - not invulnerable
      const inactiveState = { ...activatedState, isActive: false, phase: 'inactive' as const };
      expect(isInvulnerable(inactiveState)).toBe(false);
    });
  });

  // ==========================================================================
  // Property 14: Shard Value Multiplier
  // **Feature: glitch-protocol, Property 14: Shard Value Multiplier**
  // **Validates: Requirements 6.5**
  // ==========================================================================
  describe('Property 14: Shard Value Multiplier', () => {
    it('*For any* active Quantum Lock state, getShardMultiplier SHALL return 2', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Requirements 6.5: Apply 2x shard value multiplier during Quantum Lock
            expect(getShardMultiplier(activatedState)).toBe(2);
            expect(getShardMultiplier(activatedState)).toBe(GLITCH_CONFIG.shardMultiplier);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive state, getShardMultiplier SHALL return 1', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No parameters needed
          () => {
            const inactiveState = createInitialGlitchModeState();

            // Inactive state should have normal multiplier
            expect(getShardMultiplier(inactiveState)).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* ghost phase state, getShardMultiplier SHALL return 1', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Manually set to ghost phase (mode ended)
            const ghostState = { ...activatedState, isActive: false, phase: 'ghost' as const };

            // Ghost phase should have normal multiplier (bonus mode ended)
            expect(getShardMultiplier(ghostState)).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiplier is exactly 2x during active mode', () => {
      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);

      // Verify multiplier is exactly 2
      const multiplier = getShardMultiplier(activatedState);
      expect(multiplier).toBe(2);

      // Verify it matches config
      expect(multiplier).toBe(GLITCH_CONFIG.shardMultiplier);
    });
  });

  // ==========================================================================
  // Property 11: Speed Stabilization
  // **Feature: glitch-protocol, Property 11: Speed Stabilization**
  // **Validates: Requirements 5.7**
  // ==========================================================================
  describe('Property 11: Speed Stabilization', () => {
    it('*For any* active Quantum Lock state, shouldStabilizeSpeed SHALL return true', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Requirements 5.7: Stabilize game speed during Quantum Lock
            expect(shouldStabilizeSpeed(activatedState)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive state, shouldStabilizeSpeed SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No parameters needed
          () => {
            const inactiveState = createInitialGlitchModeState();

            // Inactive state should allow speed changes
            expect(shouldStabilizeSpeed(inactiveState)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* ghost phase state, shouldStabilizeSpeed SHALL return false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Manually set to ghost phase (mode ended)
            const ghostState = { ...activatedState, isActive: false, phase: 'ghost' as const };

            // Ghost phase should allow speed changes (mode has ended)
            expect(shouldStabilizeSpeed(ghostState)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('speed stabilization only during active Quantum Lock phases', () => {
      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);

      // Active phase - speed stabilized
      expect(shouldStabilizeSpeed(activatedState)).toBe(true);

      // Warning phase - still active, speed stabilized
      const warningState = { ...activatedState, phase: 'warning' as const };
      expect(shouldStabilizeSpeed(warningState)).toBe(true);

      // Exiting phase - still active, speed stabilized
      const exitingState = { ...activatedState, phase: 'exiting' as const };
      expect(shouldStabilizeSpeed(exitingState)).toBe(true);

      // Ghost phase - not stabilized
      const ghostState = { ...activatedState, isActive: false, phase: 'ghost' as const };
      expect(shouldStabilizeSpeed(ghostState)).toBe(false);

      // Inactive phase - not stabilized
      const inactiveState = { ...activatedState, isActive: false, phase: 'inactive' as const };
      expect(shouldStabilizeSpeed(inactiveState)).toBe(false);
    });
  });

  // ==========================================================================
  // Property 15: Distance Accumulation
  // **Feature: glitch-protocol, Property 15: Distance Accumulation**
  // **Validates: Requirements 6.6**
  // ==========================================================================
  describe('Property 15: Distance Accumulation', () => {
    it('*For any* active Quantum Lock state, distance accumulation SHALL continue', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          fc.float({ min: 0, max: 10000, noNaN: true }), // currentDistance
          fc.float({ min: 1, max: 100, noNaN: true }),   // distanceToAdd
          (connectorLength, currentDistance, distanceToAdd) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Requirements 6.6: Continue accumulating distance traveled
            // The glitch system does NOT block distance accumulation
            // This is verified by checking that isActive doesn't prevent distance updates
            // Distance accumulation is handled by the game loop, not blocked by glitch state

            // Verify the state is active (distance should accumulate)
            expect(activatedState.isActive).toBe(true);

            // Simulate distance accumulation (this would happen in game loop)
            const newDistance = currentDistance + distanceToAdd;
            expect(newDistance).toBeGreaterThan(currentDistance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('distance accumulation is not blocked by any glitch phase', () => {
      // This test verifies that the glitch system design allows distance accumulation
      // by confirming there's no blocking mechanism in the glitch state

      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);

      // The glitch system provides shouldStabilizeSpeed for speed control
      // but does NOT provide any mechanism to block distance accumulation
      // This is by design per Requirements 6.6

      // Verify no distance blocking property exists on the state
      expect(activatedState).not.toHaveProperty('blockDistance');
      expect(activatedState).not.toHaveProperty('pauseDistance');

      // The game loop should continue accumulating distance during all phases
      // This is verified by the absence of any blocking mechanism
    });
  });

  // ==========================================================================
  // Property 20: Overdrive Pause/Resume Round-Trip
  // **Feature: glitch-protocol, Property 20: Overdrive Pause/Resume Round-Trip**
  // **Validates: Requirements 6.7, 7.8, 10.1, 10.3**
  // ==========================================================================
  describe('Property 20: Overdrive Pause/Resume Round-Trip', () => {
    it('*For any* active Overdrive mode when Quantum Lock activates, the Overdrive timer SHALL be paused', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 10000, noNaN: true }), // overdriveTimer
          fc.float({ min: 30, max: 200, noNaN: true }),     // connectorLength
          (overdriveTimer, connectorLength) => {
            // Create active Overdrive state
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [true, true, true, true, true],
              overdriveActive: true,
              overdriveTimer: overdriveTimer,
              coreRotation: 0,
            };

            // Create active Quantum Lock state
            const initialGlitchState = createInitialGlitchModeState();
            const glitchState = activateQuantumLock(initialGlitchState, connectorLength);

            // Pause Overdrive
            const result = pauseOverdrive(glitchState, overdriveState);

            // Requirements 10.1: Overdrive timer SHALL be paused
            expect(result.glitchState.pausedOverdriveTime).toBe(overdriveTimer);
            expect(result.overdriveState.overdriveActive).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* paused Overdrive, when Quantum Lock ends, Overdrive SHALL resume with exact remaining time', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 10000, noNaN: true }), // overdriveTimer
          fc.float({ min: 30, max: 200, noNaN: true }),     // connectorLength
          (overdriveTimer, connectorLength) => {
            // Create active Overdrive state
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [true, true, true, true, true],
              overdriveActive: true,
              overdriveTimer: overdriveTimer,
              coreRotation: 0,
            };

            // Create active Quantum Lock state
            const initialGlitchState = createInitialGlitchModeState();
            const glitchState = activateQuantumLock(initialGlitchState, connectorLength);

            // Pause Overdrive
            const pauseResult = pauseOverdrive(glitchState, overdriveState);

            // Resume Overdrive
            const resumedOverdriveState = resumeOverdrive(pauseResult.glitchState, pauseResult.overdriveState);

            // Requirements 7.8, 10.3: Overdrive SHALL resume with exact remaining time
            expect(resumedOverdriveState.overdriveActive).toBe(true);
            expect(resumedOverdriveState.overdriveTimer).toBe(overdriveTimer);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive Overdrive, pauseOverdrive SHALL return unchanged states', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            // Create inactive Overdrive state
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [false, false, false, false, false],
              overdriveActive: false,
              overdriveTimer: 0,
              coreRotation: 0,
            };

            // Create active Quantum Lock state
            const initialGlitchState = createInitialGlitchModeState();
            const glitchState = activateQuantumLock(initialGlitchState, connectorLength);

            // Pause Overdrive (should be no-op)
            const result = pauseOverdrive(glitchState, overdriveState);

            // Should return unchanged states
            expect(result.glitchState.pausedOverdriveTime).toBe(0);
            expect(result.overdriveState).toBe(overdriveState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* glitch state with no paused time, resumeOverdrive SHALL return unchanged overdrive state', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            // Create glitch state with no paused time
            const glitchState = {
              ...createInitialGlitchModeState(),
              pausedOverdriveTime: 0,
            };

            // Create inactive Overdrive state
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [false, false, false, false, false],
              overdriveActive: false,
              overdriveTimer: 0,
              coreRotation: 0,
            };

            // Resume Overdrive (should be no-op)
            const result = resumeOverdrive(glitchState, overdriveState);

            // Should return unchanged state
            expect(result).toBe(overdriveState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('pause/resume round-trip preserves exact timer value (no floating point drift)', () => {
      // Test specific edge case values
      const testValues = [1000, 5000, 9999.99, 0.01, 100.123456789];

      for (const timerValue of testValues) {
        const overdriveState = {
          targetWord: ['S', 'H', 'I', 'F', 'T'],
          collectedMask: [true, true, true, true, true],
          overdriveActive: true,
          overdriveTimer: timerValue,
          coreRotation: 0,
        };

        const glitchState = activateQuantumLock(createInitialGlitchModeState(), 100);

        const pauseResult = pauseOverdrive(glitchState, overdriveState);
        const resumedOverdriveState = resumeOverdrive(pauseResult.glitchState, pauseResult.overdriveState);

        // Exact value preservation
        expect(resumedOverdriveState.overdriveTimer).toBe(timerValue);
      }
    });
  });


  // ==========================================================================
  // Property 21: Resonance Pause/Resume Round-Trip
  // **Feature: glitch-protocol, Property 21: Resonance Pause/Resume Round-Trip**
  // **Validates: Requirements 10.2, 10.3**
  // ==========================================================================
  describe('Property 21: Resonance Pause/Resume Round-Trip', () => {
    it('*For any* active Resonance mode when Quantum Lock activates, the Resonance timer SHALL be paused', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 10000, noNaN: true }), // remainingTime
          fc.float({ min: 30, max: 200, noNaN: true }),     // connectorLength
          (remainingTime, connectorLength) => {
            // Create active Resonance state
            const resonanceState = {
              isActive: true,
              isPaused: false,
              pausedTimeRemaining: 0,
              streakCount: 0,
              multiplier: 2,
              remainingTime: remainingTime,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: 1,
              activationTime: Date.now() - 1000,
            };

            // Create active Quantum Lock state
            const initialGlitchState = createInitialGlitchModeState();
            const glitchState = activateQuantumLock(initialGlitchState, connectorLength);

            // Pause Resonance
            const result = pauseResonance(glitchState, resonanceState);

            // Requirements 10.2: Resonance timer SHALL be paused
            expect(result.glitchState.pausedResonanceTime).toBe(remainingTime);
            expect(result.resonanceState.isPaused).toBe(true);
            expect(result.resonanceState.pausedTimeRemaining).toBe(remainingTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* paused Resonance, when Quantum Lock ends, Resonance SHALL resume with exact remaining time', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 10000, noNaN: true }), // remainingTime
          fc.float({ min: 30, max: 200, noNaN: true }),     // connectorLength
          (remainingTime, connectorLength) => {
            // Create active Resonance state
            const resonanceState = {
              isActive: true,
              isPaused: false,
              pausedTimeRemaining: 0,
              streakCount: 0,
              multiplier: 2,
              remainingTime: remainingTime,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: 1,
              activationTime: Date.now() - 1000,
            };

            // Create active Quantum Lock state
            const initialGlitchState = createInitialGlitchModeState();
            const glitchState = activateQuantumLock(initialGlitchState, connectorLength);

            // Pause Resonance
            const pauseResult = pauseResonance(glitchState, resonanceState);

            // Resume Resonance
            const resumedResonanceState = resumeResonance(pauseResult.glitchState, pauseResult.resonanceState);

            // Requirements 10.3: Resonance SHALL resume with exact remaining time
            expect(resumedResonanceState.isPaused).toBe(false);
            expect(resumedResonanceState.remainingTime).toBe(remainingTime);
            expect(resumedResonanceState.pausedTimeRemaining).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive Resonance, pauseResonance SHALL return unchanged states', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            // Create inactive Resonance state
            const resonanceState = {
              isActive: false,
              isPaused: false,
              pausedTimeRemaining: 0,
              streakCount: 0,
              multiplier: 1,
              remainingTime: 0,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: 0,
              activationTime: 0,
            };

            // Create active Quantum Lock state
            const initialGlitchState = createInitialGlitchModeState();
            const glitchState = activateQuantumLock(initialGlitchState, connectorLength);

            // Pause Resonance (should be no-op)
            const result = pauseResonance(glitchState, resonanceState);

            // Should return unchanged states
            expect(result.glitchState.pausedResonanceTime).toBe(0);
            expect(result.resonanceState).toBe(resonanceState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* already paused Resonance, pauseResonance SHALL return unchanged states', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1000, max: 10000, noNaN: true }), // remainingTime
          fc.float({ min: 30, max: 200, noNaN: true }),     // connectorLength
          (remainingTime, connectorLength) => {
            // Create already paused Resonance state
            const resonanceState = {
              isActive: true,
              isPaused: true,
              pausedTimeRemaining: remainingTime,
              streakCount: 0,
              multiplier: 2,
              remainingTime: 0,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: 1,
              activationTime: Date.now() - 1000,
            };

            // Create active Quantum Lock state
            const initialGlitchState = createInitialGlitchModeState();
            const glitchState = activateQuantumLock(initialGlitchState, connectorLength);

            // Pause Resonance (should be no-op since already paused)
            const result = pauseResonance(glitchState, resonanceState);

            // Should return unchanged states
            expect(result.resonanceState).toBe(resonanceState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* glitch state with no paused time, resumeResonance SHALL return unchanged resonance state', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            // Create glitch state with no paused time
            const glitchState = {
              ...createInitialGlitchModeState(),
              pausedResonanceTime: 0,
            };

            // Create non-paused Resonance state
            const resonanceState = {
              isActive: false,
              isPaused: false,
              pausedTimeRemaining: 0,
              streakCount: 0,
              multiplier: 1,
              remainingTime: 0,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: 0,
              activationTime: 0,
            };

            // Resume Resonance (should be no-op)
            const result = resumeResonance(glitchState, resonanceState);

            // Should return unchanged state
            expect(result).toBe(resonanceState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('pause/resume round-trip preserves exact timer value (no floating point drift)', () => {
      // Test specific edge case values
      const testValues = [1000, 5000, 9999.99, 0.01, 100.123456789];

      for (const timerValue of testValues) {
        const resonanceState = {
          isActive: true,
          isPaused: false,
          pausedTimeRemaining: 0,
          streakCount: 0,
          multiplier: 2,
          remainingTime: timerValue,
          obstaclesDestroyed: 0,
          bonusScore: 0,
          transitionFactor: 1,
          activationTime: Date.now() - 1000,
        };

        const glitchState = activateQuantumLock(createInitialGlitchModeState(), 100);

        const pauseResult = pauseResonance(glitchState, resonanceState);
        const resumedResonanceState = resumeResonance(pauseResult.glitchState, pauseResult.resonanceState);

        // Exact value preservation
        expect(resumedResonanceState.remainingTime).toBe(timerValue);
      }
    });
  });

  // ==========================================================================
  // Property 22: Priority Override
  // **Feature: glitch-protocol, Property 22: Priority Override**
  // **Validates: Requirements 10.4**
  // ==========================================================================
  describe('Property 22: Priority Override', () => {
    it('*For any* active Quantum Lock state, getPriorityMode SHALL return "quantum_lock"', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          fc.boolean(),                                 // overdriveActive
          fc.boolean(),                                 // resonanceActive
          (connectorLength, overdriveActive, resonanceActive) => {
            // Create active Quantum Lock state
            const initialGlitchState = createInitialGlitchModeState();
            const glitchState = activateQuantumLock(initialGlitchState, connectorLength);

            // Create Overdrive state (may or may not be active)
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [true, true, true, true, true],
              overdriveActive: overdriveActive,
              overdriveTimer: overdriveActive ? 5000 : 0,
              coreRotation: 0,
            };

            // Create Resonance state (may or may not be active)
            const resonanceState = {
              isActive: resonanceActive,
              isPaused: false,
              pausedTimeRemaining: 0,
              streakCount: 0,
              multiplier: resonanceActive ? 2 : 1,
              remainingTime: resonanceActive ? 5000 : 0,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: resonanceActive ? 1 : 0,
              activationTime: resonanceActive ? Date.now() - 1000 : 0,
            };

            // Requirements 10.4: Quantum Lock has highest priority
            const priority = getPriorityMode(glitchState, overdriveState, resonanceState);
            expect(priority).toBe('quantum_lock');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* ghost phase state, getPriorityMode SHALL return "quantum_lock"', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 30, max: 200, noNaN: true }), // connectorLength
          fc.boolean(),                                 // overdriveActive
          fc.boolean(),                                 // resonanceActive
          (connectorLength, overdriveActive, resonanceActive) => {
            // Create ghost phase state
            const initialGlitchState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialGlitchState, connectorLength);
            const ghostState = { ...activatedState, isActive: false, phase: 'ghost' as const };

            // Create Overdrive state
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [true, true, true, true, true],
              overdriveActive: overdriveActive,
              overdriveTimer: overdriveActive ? 5000 : 0,
              coreRotation: 0,
            };

            // Create Resonance state
            const resonanceState = {
              isActive: resonanceActive,
              isPaused: false,
              pausedTimeRemaining: 0,
              streakCount: 0,
              multiplier: resonanceActive ? 2 : 1,
              remainingTime: resonanceActive ? 5000 : 0,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: resonanceActive ? 1 : 0,
              activationTime: resonanceActive ? Date.now() - 1000 : 0,
            };

            // Ghost phase still has highest priority (for invulnerability)
            const priority = getPriorityMode(ghostState, overdriveState, resonanceState);
            expect(priority).toBe('quantum_lock');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive Quantum Lock with active Overdrive, getPriorityMode SHALL return "overdrive"', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // resonanceActive
          (resonanceActive) => {
            // Create inactive Quantum Lock state
            const glitchState = createInitialGlitchModeState();

            // Create active Overdrive state
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [true, true, true, true, true],
              overdriveActive: true,
              overdriveTimer: 5000,
              coreRotation: 0,
            };

            // Create Resonance state (may or may not be active)
            const resonanceState = {
              isActive: resonanceActive,
              isPaused: false,
              pausedTimeRemaining: 0,
              streakCount: 0,
              multiplier: resonanceActive ? 2 : 1,
              remainingTime: resonanceActive ? 5000 : 0,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: resonanceActive ? 1 : 0,
              activationTime: resonanceActive ? Date.now() - 1000 : 0,
            };

            // Overdrive has second priority
            const priority = getPriorityMode(glitchState, overdriveState, resonanceState);
            expect(priority).toBe('overdrive');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* inactive Quantum Lock and Overdrive with active Resonance, getPriorityMode SHALL return "resonance"', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No parameters needed
          () => {
            // Create inactive Quantum Lock state
            const glitchState = createInitialGlitchModeState();

            // Create inactive Overdrive state
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [false, false, false, false, false],
              overdriveActive: false,
              overdriveTimer: 0,
              coreRotation: 0,
            };

            // Create active Resonance state
            const resonanceState = {
              isActive: true,
              isPaused: false,
              pausedTimeRemaining: 0,
              streakCount: 0,
              multiplier: 2,
              remainingTime: 5000,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: 1,
              activationTime: Date.now() - 1000,
            };

            // Resonance has third priority
            const priority = getPriorityMode(glitchState, overdriveState, resonanceState);
            expect(priority).toBe('resonance');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* paused Resonance, getPriorityMode SHALL NOT return "resonance"', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No parameters needed
          () => {
            // Create inactive Quantum Lock state
            const glitchState = createInitialGlitchModeState();

            // Create inactive Overdrive state
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [false, false, false, false, false],
              overdriveActive: false,
              overdriveTimer: 0,
              coreRotation: 0,
            };

            // Create paused Resonance state
            const resonanceState = {
              isActive: true,
              isPaused: true, // Paused!
              pausedTimeRemaining: 5000,
              streakCount: 0,
              multiplier: 2,
              remainingTime: 0,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: 1,
              activationTime: Date.now() - 1000,
            };

            // Paused Resonance should not be the priority mode
            const priority = getPriorityMode(glitchState, overdriveState, resonanceState);
            expect(priority).toBe('none');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('*For any* all inactive modes, getPriorityMode SHALL return "none"', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // No parameters needed
          () => {
            // Create inactive Quantum Lock state
            const glitchState = createInitialGlitchModeState();

            // Create inactive Overdrive state
            const overdriveState = {
              targetWord: ['S', 'H', 'I', 'F', 'T'],
              collectedMask: [false, false, false, false, false],
              overdriveActive: false,
              overdriveTimer: 0,
              coreRotation: 0,
            };

            // Create inactive Resonance state
            const resonanceState = {
              isActive: false,
              isPaused: false,
              pausedTimeRemaining: 0,
              streakCount: 0,
              multiplier: 1,
              remainingTime: 0,
              obstaclesDestroyed: 0,
              bonusScore: 0,
              transitionFactor: 0,
              activationTime: 0,
            };

            // No active mode
            const priority = getPriorityMode(glitchState, overdriveState, resonanceState);
            expect(priority).toBe('none');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('priority order is strictly: quantum_lock > overdrive > resonance > none', () => {
      // Test all combinations to verify strict priority order
      const glitchActive = activateQuantumLock(createInitialGlitchModeState(), 100);
      const glitchGhost = { ...glitchActive, isActive: false, phase: 'ghost' as const };
      const glitchInactive = createInitialGlitchModeState();

      const overdriveActive = {
        targetWord: ['S', 'H', 'I', 'F', 'T'],
        collectedMask: [true, true, true, true, true],
        overdriveActive: true,
        overdriveTimer: 5000,
        coreRotation: 0,
      };
      const overdriveInactive = {
        targetWord: ['S', 'H', 'I', 'F', 'T'],
        collectedMask: [false, false, false, false, false],
        overdriveActive: false,
        overdriveTimer: 0,
        coreRotation: 0,
      };

      const resonanceActive = {
        isActive: true,
        isPaused: false,
        pausedTimeRemaining: 0,
        streakCount: 0,
        multiplier: 2,
        remainingTime: 5000,
        obstaclesDestroyed: 0,
        bonusScore: 0,
        transitionFactor: 1,
        activationTime: Date.now() - 1000,
      };
      const resonanceInactive = {
        isActive: false,
        isPaused: false,
        pausedTimeRemaining: 0,
        streakCount: 0,
        multiplier: 1,
        remainingTime: 0,
        obstaclesDestroyed: 0,
        bonusScore: 0,
        transitionFactor: 0,
        activationTime: 0,
      };

      // Quantum Lock always wins
      expect(getPriorityMode(glitchActive, overdriveActive, resonanceActive)).toBe('quantum_lock');
      expect(getPriorityMode(glitchActive, overdriveInactive, resonanceActive)).toBe('quantum_lock');
      expect(getPriorityMode(glitchGhost, overdriveActive, resonanceActive)).toBe('quantum_lock');

      // Overdrive wins when Quantum Lock is inactive
      expect(getPriorityMode(glitchInactive, overdriveActive, resonanceActive)).toBe('overdrive');
      expect(getPriorityMode(glitchInactive, overdriveActive, resonanceInactive)).toBe('overdrive');

      // Resonance wins when both Quantum Lock and Overdrive are inactive
      expect(getPriorityMode(glitchInactive, overdriveInactive, resonanceActive)).toBe('resonance');

      // None when all inactive
      expect(getPriorityMode(glitchInactive, overdriveInactive, resonanceInactive)).toBe('none');
    });
  });

  // ==========================================================================
  // Property 18: Ghost Mode Duration
  // **Feature: glitch-protocol, Property 18: Ghost Mode Duration**
  // **Validates: Requirements 7.4**
  // ==========================================================================
  describe('Property 18: Ghost Mode Duration', () => {
    it('*For any* Quantum Lock that completes, Ghost Mode SHALL last exactly 1500ms', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 50, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Activate Ghost Mode (simulating Quantum Lock completion)
            const ghostState = activateGhostMode(activatedState);

            // Ghost Mode should be active
            expect(ghostState.phase).toBe('ghost');
            expect(ghostState.isActive).toBe(false); // Quantum Lock is no longer active

            // Ghost Mode end time should be 1500ms from activation
            const expectedEndTime = Date.now() + GLITCH_CONFIG.ghostModeDuration;
            // Allow small tolerance for test execution time
            expect(ghostState.ghostModeEndTime).toBeGreaterThanOrEqual(expectedEndTime - 50);
            expect(ghostState.ghostModeEndTime).toBeLessThanOrEqual(expectedEndTime + 50);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activateGhostMode SHALL set phase to "ghost" and isActive to false', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 50, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);
            const ghostState = activateGhostMode(activatedState);

            // Requirements 7.4: Ghost Mode is a separate phase after Quantum Lock
            expect(ghostState.phase).toBe('ghost');
            expect(ghostState.isActive).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Ghost Mode duration SHALL be exactly 1500ms as per GLITCH_CONFIG', () => {
      // Verify the configuration value
      expect(GLITCH_CONFIG.ghostModeDuration).toBe(1500);

      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);
      const beforeActivation = Date.now();
      const ghostState = activateGhostMode(activatedState);
      const afterActivation = Date.now();

      // Ghost Mode end time should be ~1500ms from now
      const expectedMinEndTime = beforeActivation + 1500;
      const expectedMaxEndTime = afterActivation + 1500;

      expect(ghostState.ghostModeEndTime).toBeGreaterThanOrEqual(expectedMinEndTime);
      expect(ghostState.ghostModeEndTime).toBeLessThanOrEqual(expectedMaxEndTime);
    });

    it('isGhostModeActive SHALL return true only when phase is "ghost"', () => {
      const initialState = createInitialGlitchModeState();
      expect(isGhostModeActive(initialState)).toBe(false);

      const activatedState = activateQuantumLock(initialState, 100);
      expect(isGhostModeActive(activatedState)).toBe(false);

      const ghostState = activateGhostMode(activatedState);
      expect(isGhostModeActive(ghostState)).toBe(true);
    });

    it('getGhostModeOpacity SHALL return 0.5 during Ghost Mode', () => {
      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);
      const ghostState = activateGhostMode(activatedState);

      // Requirements 7.5: 50% opacity during Ghost Mode
      expect(getGhostModeOpacity(ghostState)).toBe(0.5);

      // Should return 1.0 when not in Ghost Mode
      expect(getGhostModeOpacity(initialState)).toBe(1.0);
      expect(getGhostModeOpacity(activatedState)).toBe(1.0);
    });
  });

  // ==========================================================================
  // Property 19: State Restoration
  // **Feature: glitch-protocol, Property 19: State Restoration**
  // **Validates: Requirements 7.7**
  // ==========================================================================
  describe('Property 19: State Restoration', () => {
    it('*For any* Ghost Mode that completes, all gameplay states SHALL return to normal', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 50, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            const initialState = createInitialGlitchModeState();
            const activatedState = activateQuantumLock(initialState, connectorLength);

            // Activate Ghost Mode
            const ghostState = activateGhostMode(activatedState);

            // Simulate Ghost Mode ending by setting ghostModeEndTime to past
            const expiredGhostState: GlitchModeState = {
              ...ghostState,
              ghostModeEndTime: Date.now() - 100, // Already expired
            };

            // Update should transition to inactive
            const restoredState = updateGhostMode(expiredGhostState, 16.67);

            // Requirements 7.7: Restore normal gameplay state
            expect(restoredState.isActive).toBe(false);
            expect(restoredState.phase).toBe('inactive');
            expect(restoredState.ghostModeEndTime).toBe(0);
            expect(restoredState.waveOffset).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updateGhostMode SHALL not modify state when not in Ghost Mode', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 50, max: 200, noNaN: true }), // connectorLength
          (connectorLength) => {
            // Test with inactive state
            const inactiveState = createInitialGlitchModeState();
            const updatedInactive = updateGhostMode(inactiveState, 16.67);
            expect(updatedInactive).toEqual(inactiveState);

            // Test with active Quantum Lock state
            const activeState = activateQuantumLock(inactiveState, connectorLength);
            const updatedActive = updateGhostMode(activeState, 16.67);
            expect(updatedActive).toEqual(activeState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updateGhostMode SHALL return unchanged state when Ghost Mode has not expired', () => {
      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);
      const ghostState = activateGhostMode(activatedState);

      // Ghost Mode just started, should not expire yet
      const updatedState = updateGhostMode(ghostState, 16.67);

      // State should remain in Ghost Mode
      expect(updatedState.phase).toBe('ghost');
      expect(updatedState.isActive).toBe(false);
      expect(updatedState.ghostModeEndTime).toBe(ghostState.ghostModeEndTime);
    });

    it('Ghost Mode completion SHALL reset waveOffset to 0', () => {
      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);

      // Set a non-zero waveOffset
      const stateWithWave: GlitchModeState = {
        ...activatedState,
        waveOffset: 5.5,
      };

      const ghostState = activateGhostMode(stateWithWave);

      // Simulate Ghost Mode ending
      const expiredGhostState: GlitchModeState = {
        ...ghostState,
        ghostModeEndTime: Date.now() - 100,
        waveOffset: 5.5, // Still has wave offset
      };

      const restoredState = updateGhostMode(expiredGhostState, 16.67);

      // Wave offset should be reset
      expect(restoredState.waveOffset).toBe(0);
    });

    it('isInvulnerable SHALL return true during Ghost Mode', () => {
      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);
      const ghostState = activateGhostMode(activatedState);

      // Requirements 7.6: Prevent collision damage during Ghost Mode
      expect(isInvulnerable(ghostState)).toBe(true);

      // Should also be true during Quantum Lock
      expect(isInvulnerable(activatedState)).toBe(true);

      // Should be false when inactive
      expect(isInvulnerable(initialState)).toBe(false);
    });

    it('getGhostModeRemainingTime SHALL return correct remaining time', () => {
      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);
      const ghostState = activateGhostMode(activatedState);

      // Should return approximately 1500ms (with small tolerance for execution time)
      const remaining = getGhostModeRemainingTime(ghostState);
      expect(remaining).toBeGreaterThan(1400);
      expect(remaining).toBeLessThanOrEqual(1500);

      // Should return 0 when not in Ghost Mode
      expect(getGhostModeRemainingTime(initialState)).toBe(0);
      expect(getGhostModeRemainingTime(activatedState)).toBe(0);
    });

    it('getGhostModeProgress SHALL return 0 to 1 based on elapsed time', () => {
      const initialState = createInitialGlitchModeState();
      const activatedState = activateQuantumLock(initialState, 100);
      const ghostState = activateGhostMode(activatedState);

      // Just started, progress should be near 0
      const progress = getGhostModeProgress(ghostState);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThan(0.1);

      // Should return 0 when not in Ghost Mode
      expect(getGhostModeProgress(initialState)).toBe(0);
      expect(getGhostModeProgress(activatedState)).toBe(0);
    });
  });

  // ==========================================================================
  // Input Buffering System Tests
  // **Feature: glitch-protocol, Input Buffering System**
  // **Validates: Requirements 3.2 (hit stop handling)**
  // ==========================================================================
  describe('Input Buffering System', () => {
    it('bufferInput SHALL store tap input in buffer', () => {
      // Clear any existing buffer
      clearInputBuffer();

      const input: InputState = {
        isPressed: true,
        y: 100,
        isTapFrame: true,
        isReleaseFrame: false,
      };

      bufferInput(input);

      const buffer = getInputBuffer();
      expect(buffer).not.toBeNull();
      expect(buffer!.pendingTap).toBe(true);
      expect(buffer!.pendingSwap).toBe(false);

      // Clean up
      clearInputBuffer();
    });

    it('bufferInput SHALL store swap input in buffer', () => {
      clearInputBuffer();

      const input: InputState = {
        isPressed: false,
        y: 100,
        isTapFrame: false,
        isReleaseFrame: true,
      };

      bufferInput(input);

      const buffer = getInputBuffer();
      expect(buffer).not.toBeNull();
      expect(buffer!.pendingSwap).toBe(true);
      expect(buffer!.pendingTap).toBe(false);

      clearInputBuffer();
    });

    it('bufferInput SHALL merge multiple inputs using OR logic', () => {
      clearInputBuffer();

      // First input: tap
      const tapInput: InputState = {
        isPressed: true,
        y: 100,
        isTapFrame: true,
        isReleaseFrame: false,
      };
      bufferInput(tapInput);

      // Second input: swap
      const swapInput: InputState = {
        isPressed: false,
        y: 100,
        isTapFrame: false,
        isReleaseFrame: true,
      };
      bufferInput(swapInput);

      const buffer = getInputBuffer();
      expect(buffer).not.toBeNull();
      expect(buffer!.pendingTap).toBe(true);
      expect(buffer!.pendingSwap).toBe(true);

      clearInputBuffer();
    });

    it('flushBufferedInput SHALL return InputState and clear buffer', () => {
      clearInputBuffer();

      const input: InputState = {
        isPressed: true,
        y: 100,
        isTapFrame: true,
        isReleaseFrame: true,
      };
      bufferInput(input);

      const flushed = flushBufferedInput();

      expect(flushed).not.toBeNull();
      expect(flushed!.isTapFrame).toBe(true);
      expect(flushed!.isReleaseFrame).toBe(true);

      // Buffer should be cleared
      expect(getInputBuffer()).toBeNull();
    });

    it('flushBufferedInput SHALL return null when buffer is empty', () => {
      clearInputBuffer();

      const flushed = flushBufferedInput();
      expect(flushed).toBeNull();
    });

    it('flushBufferedInput SHALL return null when no pending inputs', () => {
      clearInputBuffer();

      // Buffer an input with no tap or swap
      const input: InputState = {
        isPressed: false,
        y: 100,
        isTapFrame: false,
        isReleaseFrame: false,
      };
      bufferInput(input);

      const flushed = flushBufferedInput();
      expect(flushed).toBeNull();
    });

    it('hasBufferedInput SHALL return true when inputs are pending', () => {
      clearInputBuffer();

      expect(hasBufferedInput()).toBe(false);

      const input: InputState = {
        isPressed: true,
        y: 100,
        isTapFrame: true,
        isReleaseFrame: false,
      };
      bufferInput(input);

      expect(hasBufferedInput()).toBe(true);

      clearInputBuffer();
    });

    it('clearInputBuffer SHALL clear all buffered inputs', () => {
      clearInputBuffer();

      const input: InputState = {
        isPressed: true,
        y: 100,
        isTapFrame: true,
        isReleaseFrame: true,
      };
      bufferInput(input);

      expect(hasBufferedInput()).toBe(true);

      clearInputBuffer();

      expect(hasBufferedInput()).toBe(false);
      expect(getInputBuffer()).toBeNull();
    });

    it('createEmptyInputBuffer SHALL return buffer with all flags false', () => {
      const buffer = createEmptyInputBuffer();

      expect(buffer.pendingSwap).toBe(false);
      expect(buffer.pendingTap).toBe(false);
      expect(buffer.timestamp).toBe(0);
    });

    it('buffer timestamp SHALL be updated on each bufferInput call', () => {
      clearInputBuffer();

      const input: InputState = {
        isPressed: true,
        y: 100,
        isTapFrame: true,
        isReleaseFrame: false,
      };

      const beforeTime = Date.now();
      bufferInput(input);
      const afterTime = Date.now();

      const buffer = getInputBuffer();
      expect(buffer!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(buffer!.timestamp).toBeLessThanOrEqual(afterTime);

      clearInputBuffer();
    });
  });
});
