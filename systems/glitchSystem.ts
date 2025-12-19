/**
 * Glitch Protocol System
 * 
 * Implements the Quantum Lock bonus mode triggered by collecting Glitch Shards.
 * 
 * Requirements: 2.1-2.7, 3.1, 4.1-4.4, 7.1-7.4
 */

import { GLITCH_CONFIG } from '../constants';
import { GlitchModeState, GlitchPhase, GlitchShard, InputState, Obstacle, ShiftProtocolState } from '../types';
import { ResonanceState } from './resonanceSystem';

// ============================================================================
// State Management Functions - Requirements 4.1, 7.1, 7.2, 7.3, 7.4
// ============================================================================

/**
 * Creates the initial Glitch Mode state
 * Requirements 7.1: Initialize with inactive state
 */
export function createInitialGlitchModeState(): GlitchModeState {
  return {
    isActive: false,
    startTime: 0,
    duration: GLITCH_CONFIG.duration, // 8000ms - Requirements 7.1
    originalConnectorLength: 0,
    waveOffset: 0,
    phase: 'inactive',
    ghostModeEndTime: 0,
    pausedOverdriveTime: 0,
    pausedResonanceTime: 0,
    midlineHits: 0,
    lastMidlineHitTime: 0,
  };
}

/**
 * Activates Quantum Lock mode
 * Requirements 4.1: Store current connector length as original value
 * Requirements 7.1: Set duration to 8000ms
 */
export function activateQuantumLock(
  state: GlitchModeState,
  currentConnectorLength: number
): GlitchModeState {
  return {
    ...state,
    isActive: true,
    startTime: Date.now(),
    duration: GLITCH_CONFIG.duration, // 8000ms
    originalConnectorLength: currentConnectorLength,
    waveOffset: 0,
    phase: 'active',
    ghostModeEndTime: 0,
    midlineHits: 0,
    lastMidlineHitTime: 0,
  };
}

/**
 * Updates Glitch Mode state based on elapsed time
 * Requirements 7.2, 7.3, 7.4: Handle phase transitions
 */
export function updateGlitchMode(
  state: GlitchModeState,
  deltaTime: number
): GlitchModeState {
  // If not active and not in ghost mode, return unchanged
  if (!state.isActive && state.phase !== 'ghost') {
    return state;
  }

  const now = Date.now();

  // Handle Ghost Mode
  if (state.phase === 'ghost') {
    if (now >= state.ghostModeEndTime) {
      // Ghost mode ended, return to inactive
      return {
        ...state,
        isActive: false,
        phase: 'inactive',
        ghostModeEndTime: 0,
      };
    }
    return state;
  }

  // Calculate progress (0.0 to 1.0)
  const elapsed = now - state.startTime;
  const progress = Math.min(1.0, elapsed / state.duration);

  // Get phase from progress
  const newPhase = getPhaseFromProgress(progress);

  // Update wave offset
  const newWaveOffset = state.waveOffset + GLITCH_CONFIG.waveSpeed * (deltaTime / 16.67);

  // Check if Quantum Lock has ended
  if (progress >= 1.0) {
    // Transition to Ghost Mode - Requirements 7.4
    return {
      ...state,
      isActive: false,
      phase: 'ghost',
      waveOffset: newWaveOffset,
      ghostModeEndTime: now + GLITCH_CONFIG.ghostModeDuration,
    };
  }

  return {
    ...state,
    phase: newPhase,
    waveOffset: newWaveOffset,
  };
}


/**
 * Determines the phase based on progress through Quantum Lock
 * Requirements 7.2: Warning at 75%
 * Requirements 7.3: Exiting at 80%
 * Requirements 7.4: Ghost at 100%
 */
export function getPhaseFromProgress(progress: number): GlitchPhase {
  if (progress >= 1.0) {
    return 'ghost';
  }
  if (progress >= GLITCH_CONFIG.flattenThreshold) { // 0.80
    return 'exiting';
  }
  if (progress >= GLITCH_CONFIG.warningThreshold) { // 0.75
    return 'warning';
  }
  return 'active';
}

/**
 * Gets the current progress of Quantum Lock (0.0 to 1.0)
 */
export function getGlitchProgress(state: GlitchModeState): number {
  if (!state.isActive && state.phase !== 'ghost') {
    return 0;
  }
  const elapsed = Date.now() - state.startTime;
  return Math.min(1.0, elapsed / state.duration);
}

// ============================================================================
// Glitch Shard Spawning Functions - Requirements 2.1, 2.2, 2.3, 2.6, 2.7
// ============================================================================

let shardIdCounter = 0;

/**
 * Creates a new Glitch Shard at the spawn position
 * Requirements 2.2: Position at canvas right edge + 100 pixels
 * Requirements 2.3: Y position within ±100 pixels of canvas center
 */
export function createGlitchShard(
  canvasWidth: number,
  canvasHeight: number
): GlitchShard {
  const centerY = canvasHeight / 2;
  // Random Y within ±spawnYRange of center
  const yOffset = (Math.random() * 2 - 1) * GLITCH_CONFIG.spawnYRange;

  return {
    id: `glitch-shard-${++shardIdCounter}`,
    x: canvasWidth + GLITCH_CONFIG.spawnXOffset, // Right edge + 100px
    y: centerY + yOffset,
    width: GLITCH_CONFIG.shardWidth,
    height: GLITCH_CONFIG.shardHeight,
    active: true,
    colorTimer: 0,
    spawnTime: Date.now(),
  };
}

/**
 * Determines if a Glitch Shard should spawn
 * Requirements 2.1: Spawn exactly one per level (for testing)
 * Requirements 2.7: Wait until player has traveled at least 500 meters
 */
export function shouldSpawnGlitchShard(
  distanceTraveled: number,
  hasSpawnedThisLevel: boolean
): boolean {
  // Don't spawn if already spawned this level
  if (hasSpawnedThisLevel) {
    return false;
  }

  // Requirements 2.7: Minimum distance threshold
  if (distanceTraveled < GLITCH_CONFIG.minSpawnDistance) {
    return false;
  }

  return true;
}

/**
 * Checks if a spawn position is safe (clear of obstacles)
 * Requirements 2.6: Minimum 150px clearance from obstacles
 */
export function isSpawnPositionSafe(
  y: number,
  obstacles: Obstacle[]
): boolean {
  const clearance = GLITCH_CONFIG.spawnClearance;

  for (const obstacle of obstacles) {
    // Check vertical distance from obstacle
    const obstacleTop = obstacle.y;
    const obstacleBottom = obstacle.y + obstacle.height;

    // If the shard Y is within clearance distance of the obstacle
    if (y >= obstacleTop - clearance && y <= obstacleBottom + clearance) {
      return false;
    }
  }

  return true;
}


// ============================================================================
// Shard Movement and Removal - Requirements 2.4, 2.5
// ============================================================================

/**
 * Updates a Glitch Shard's position based on game speed
 * Requirements 2.4: Move left at current game speed
 */
export function updateGlitchShard(
  shard: GlitchShard,
  speed: number,
  deltaTime: number
): GlitchShard {
  // Move left at game speed (speed is pixels per frame at 60fps)
  // Normalize for actual deltaTime
  const normalizedSpeed = speed * (deltaTime / 16.67);

  return {
    ...shard,
    x: shard.x - normalizedSpeed,
    colorTimer: shard.colorTimer + deltaTime,
  };
}

/**
 * Determines if a shard should be removed (exited left edge)
 * Requirements 2.5: Remove when exits left edge
 */
export function shouldRemoveShard(shard: GlitchShard): boolean {
  // Remove when fully past left edge
  return shard.x < -shard.width;
}

// ============================================================================
// Collision Detection - Requirements 3.1
// ============================================================================

/**
 * Checks collision between player connector and Glitch Shard using AABB
 * Requirements 3.1: Detect collision using AABB intersection
 * 
 * The player connector is a vertical line from (playerX, playerY - connectorLength/2)
 * to (playerX, playerY + connectorLength/2)
 */
export function checkGlitchShardCollision(
  playerX: number,
  playerY: number,
  connectorLength: number,
  shard: GlitchShard
): boolean {
  if (!shard.active) {
    return false;
  }

  // Player connector bounds (vertical line with some width for collision)
  const connectorWidth = 10; // Small width for collision detection
  const playerLeft = playerX - connectorWidth / 2;
  const playerRight = playerX + connectorWidth / 2;
  const playerTop = playerY - connectorLength / 2;
  const playerBottom = playerY + connectorLength / 2;

  // Shard bounds
  const shardLeft = shard.x - shard.width / 2;
  const shardRight = shard.x + shard.width / 2;
  const shardTop = shard.y - shard.height / 2;
  const shardBottom = shard.y + shard.height / 2;

  // AABB intersection check
  const xOverlap = playerLeft < shardRight && playerRight > shardLeft;
  const yOverlap = playerTop < shardBottom && playerBottom > shardTop;

  return xOverlap && yOverlap;
}

// ============================================================================
// Gameplay Modifiers - Requirements 5.7, 6.1, 6.3, 6.5, 6.6, 7.6
// ============================================================================

/**
 * Checks if player is invulnerable (during Quantum Lock or Ghost Mode)
 * Requirements 6.3, 7.6: Invulnerability during bonus modes
 */
export function isInvulnerable(glitchState: GlitchModeState): boolean {
  return glitchState.isActive || glitchState.phase === 'ghost';
}

/**
 * Gets the shard value multiplier
 * Requirements 6.5: 2x during Quantum Lock
 */
export function getShardMultiplier(glitchState: GlitchModeState): number {
  return glitchState.isActive ? GLITCH_CONFIG.shardMultiplier : 1;
}

/**
 * Gets the distance accumulation multiplier
 * 3x during Quantum Lock for faster progress
 */
export function getDistanceMultiplier(glitchState: GlitchModeState): number {
  return glitchState.isActive ? GLITCH_CONFIG.distanceMultiplier : 1;
}

/**
 * Checks if speed should be stabilized (no acceleration)
 * Requirements 5.7: Stabilize game speed during Quantum Lock
 */
export function shouldStabilizeSpeed(glitchState: GlitchModeState): boolean {
  return glitchState.isActive;
}

/**
 * Checks if obstacles should spawn
 * Requirements 6.1: Stop spawning new obstacles during Quantum Lock
 */
export function shouldBlockObstacleSpawn(glitchState: GlitchModeState): boolean {
  return glitchState.isActive;
}

// ============================================================================
// Collision Response - Requirements 3.2, 3.3, 3.5, 3.6
// ============================================================================

/**
 * Collision response result containing all state changes
 * Requirements 3.2, 3.3, 3.5, 3.6: Trigger hit stop, screen shake, mode activation
 */
export interface CollisionResponse {
  glitchModeState: GlitchModeState;
  hitStopFrames: number;
  shouldTriggerScreenShake: boolean;
  shouldPlayImpactSound: boolean;
  shardRemoved: boolean;
}

/**
 * Handles collision response when player collects a Glitch Shard
 * Requirements 3.2: Trigger hit stop effect (10 frames freeze)
 * Requirements 3.3: Trigger heavy screen shake
 * Requirements 3.5: Remove the Glitch Shard from screen
 * Requirements 3.6: Activate Quantum Lock mode
 * 
 * @param currentState - Current glitch mode state
 * @param connectorLength - Current connector length to store as original
 * @returns CollisionResponse with all state changes
 */
export function handleGlitchShardCollision(
  currentState: GlitchModeState,
  connectorLength: number
): CollisionResponse {
  // Requirements 3.6, 4.1: Activate Quantum Lock mode
  const newGlitchModeState = activateQuantumLock(currentState, connectorLength);

  return {
    glitchModeState: newGlitchModeState,
    hitStopFrames: GLITCH_CONFIG.hitStopFrames, // Requirements 3.2: 10 frames
    shouldTriggerScreenShake: true,              // Requirements 3.3: Heavy screen shake
    shouldPlayImpactSound: true,                 // Requirements 3.4: Play impact sound
    shardRemoved: true,                          // Requirements 3.5: Remove shard
  };
}

/**
 * Deactivates a Glitch Shard after collision
 * Requirements 3.5: Remove the Glitch Shard from screen
 * 
 * @param shard - The shard to deactivate
 * @returns Updated shard with active=false
 */
export function deactivateGlitchShard(shard: GlitchShard): GlitchShard {
  return {
    ...shard,
    active: false,
  };
}

/**
 * Checks if hit stop is currently active
 * Requirements 3.2: Hit stop effect (10 frames freeze)
 * 
 * @param hitStopFramesRemaining - Number of hit stop frames remaining
 * @returns true if hit stop is active
 */
export function isHitStopActive(hitStopFramesRemaining: number): boolean {
  return hitStopFramesRemaining > 0;
}

/**
 * Updates hit stop counter
 * Requirements 3.2: Decrement hit stop frames each frame
 * 
 * @param hitStopFramesRemaining - Current hit stop frames remaining
 * @returns Updated hit stop frames (decremented by 1, minimum 0)
 */
export function updateHitStop(hitStopFramesRemaining: number): number {
  return Math.max(0, hitStopFramesRemaining - 1);
}

// ============================================================================
// Connector Animation System - Requirements 4.2, 4.3, 4.4
// ============================================================================

/**
 * Elastic easing out function for bounce feel
 * Requirements 4.2: Animate connector length using elastic easing
 * 
 * Creates a spring-like overshoot and settle effect.
 * Formula: 2^(-10t) * sin((t*10 - 0.75) * (2π/3)) + 1
 * 
 * @param t - Progress value from 0 to 1
 * @returns Eased value from 0 to 1 with elastic overshoot
 */
export function elasticOut(t: number): number {
  const c4 = (2 * Math.PI) / 3;

  if (t === 0) return 0;
  if (t === 1) return 1;

  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Calculates the animated connector length during Quantum Lock
 * Requirements 4.2: Animate connector length toward ideal size using elastic easing over 300-500ms
 * Requirements 4.3: Prevent connector length from changing due to normal gameplay
 * 
 * @param state - Current glitch mode state
 * @param currentLength - Current connector length
 * @param targetLength - Target connector length (idealConnectorLength during active, originalLength during exit)
 * @param deltaTime - Time since last frame in ms
 * @param animationProgress - Progress of the animation (0 to 1)
 * @returns Animated connector length
 */
export function calculateConnectorLength(
  state: GlitchModeState,
  currentLength: number,
  targetLength: number,
  deltaTime: number,
  animationProgress: number
): number {
  // If not in active mode, return current length unchanged
  if (!state.isActive && state.phase !== 'exiting' && state.phase !== 'warning') {
    return currentLength;
  }

  // Apply elastic easing to the animation progress
  const easedProgress = elasticOut(Math.min(1, animationProgress));

  // Interpolate between original and target length
  const startLength = state.originalConnectorLength;
  const interpolatedLength = startLength + (targetLength - startLength) * easedProgress;

  return interpolatedLength;
}

/**
 * Finalizes connector length when Quantum Lock ends
 * Requirements 4.4: Animate connector length back to original stored value
 * 
 * This function hard-sets the connector length to prevent floating point drift.
 * Should be called when Quantum Lock transitions to Ghost Mode.
 * 
 * @param state - Current glitch mode state
 * @param originalLength - The original connector length stored at activation
 * @returns The exact original connector length (no floating point drift)
 */
export function finalizeConnectorLength(
  state: GlitchModeState,
  originalLength: number
): number {
  // Hard-set to exact original value to prevent floating point drift
  return originalLength;
}

/**
 * Gets the target connector length based on current phase
 * During active/warning: target is idealConnectorLength
 * During exiting: target transitions back to original
 * 
 * @param state - Current glitch mode state
 * @returns Target connector length
 */
export function getTargetConnectorLength(state: GlitchModeState): number {
  if (state.phase === 'exiting') {
    // During exit, target is original length
    return state.originalConnectorLength;
  }

  if (state.isActive) {
    // During active/warning, target is ideal length
    return GLITCH_CONFIG.idealConnectorLength;
  }

  // Not in Quantum Lock, return original
  return state.originalConnectorLength;
}

/**
 * Calculates animation progress for connector length animation
 * The animation takes 400ms (middle of 300-500ms range)
 * 
 * @param state - Current glitch mode state
 * @param animationStartTime - When the current animation phase started
 * @returns Animation progress from 0 to 1
 */
export function getConnectorAnimationProgress(
  state: GlitchModeState,
  animationStartTime: number
): number {
  const ANIMATION_DURATION = 400; // 400ms (middle of 300-500ms range)
  const elapsed = Date.now() - animationStartTime;
  return Math.min(1, elapsed / ANIMATION_DURATION);
}

/**
 * Checks if connector length should be locked (prevented from external changes)
 * Requirements 4.3: Prevent connector length from changing due to normal gameplay
 * 
 * @param state - Current glitch mode state
 * @returns true if connector length should be locked
 */
export function isConnectorLocked(state: GlitchModeState): boolean {
  return state.isActive || state.phase === 'exiting' || state.phase === 'warning';
}

// ============================================================================
// Wave System Functions - Requirements 5.1, 5.2
// ============================================================================

/**
 * Calculates the Y position on the sinusoidal wave at a given X position
 * Requirements 5.1: Replace normal midline with sinusoidal wave
 * 
 * The wave follows the formula: y = centerY + amplitude * sin((x + horizontalOffset) * frequency)
 * The horizontalOffset increases over time, making the wave appear to move towards the player.
 * 
 * @param x - X position on the canvas
 * @param offset - Wave offset for animation (increases over time) - controls horizontal movement
 * @param amplitude - Wave amplitude in pixels
 * @param centerY - Center Y position of the wave
 * @returns Y position on the wave at the given X
 */
export function calculateWaveY(
  x: number,
  offset: number,
  amplitude: number,
  centerY: number
): number {
  // Frequency determines how many wave cycles fit across the screen
  // Lower frequency = wider, smoother waves
  const frequency = 0.008; // Wider waves for smoother appearance

  // Horizontal offset makes the wave appear to move towards the player (left)
  // Lower multiplier = smoother, more gradual movement
  const horizontalWaveSpeed = 20; // Reduced for smoother flow
  const horizontalOffset = offset * horizontalWaveSpeed;

  // Calculate sinusoidal Y position with smooth horizontal wave movement
  const waveY = centerY + amplitude * Math.sin((x + horizontalOffset) * frequency);

  return waveY;
}

/**
 * Gets the wave amplitude based on the current phase and progress
 * Requirements 5.1, 7.3: Wave amplitude changes during exit phase
 * 
 * During active/warning phases: full amplitude
 * During exiting phase: amplitude decreases (wave flattens)
 * During ghost/inactive: zero amplitude
 * 
 * @param phase - Current glitch mode phase
 * @param progress - Progress through Quantum Lock (0.0 to 1.0)
 * @returns Wave amplitude multiplier (0.0 to 1.0)
 */
export function getWaveAmplitudeForPhase(
  phase: GlitchPhase,
  progress: number
): number {
  switch (phase) {
    case 'active':
    case 'warning':
      // Full amplitude during active and warning phases
      return 1.0;

    case 'exiting':
      // Requirements 7.3: Wave flattening animation during exit
      // Flatten from 80% to 100% progress (flattenThreshold to 1.0)
      const flattenStart = GLITCH_CONFIG.flattenThreshold; // 0.80
      const flattenProgress = (progress - flattenStart) / (1.0 - flattenStart);
      // Clamp and invert: 1.0 at start of exit, 0.0 at end
      return Math.max(0, 1.0 - Math.min(1, flattenProgress));

    case 'ghost':
    case 'inactive':
    default:
      // No wave during ghost mode or inactive
      return 0.0;
  }
}

// ============================================================================
// Wave Path Shard Generation - Requirements 5.6, 6.4
// ============================================================================

/**
 * Position for a bonus shard along the wave path
 */
export interface WavePathShard {
  x: number;
  y: number;
  collected: boolean;
}

/**
 * Generates bonus shard positions along the sinusoidal wave path
 * Requirements 5.6: Spawn bonus shards along the entire wave path (trail formation)
 * Requirements 6.4: Spawn bonus shards along wave trail
 * 
 * Spawns diamonds from the right side of the screen, with wide spacing.
 * Diamonds move left towards the player.
 * 
 * @param waveOffset - Current wave animation offset
 * @param canvasWidth - Width of the canvas
 * @param centerY - Center Y position of the wave
 * @param amplitude - Wave amplitude in pixels
 * @returns Array of shard positions along the wave path
 */
export function generateWavePathShards(
  waveOffset: number,
  canvasWidth: number,
  centerY: number,
  amplitude: number
): WavePathShard[] {
  const shards: WavePathShard[] = [];

  // Diamonds with proper spacing - spawn from right side
  const shardCount = 20;
  const spacing = 100; // 100 pixels between each diamond

  for (let i = 0; i < shardCount; i++) {
    // Start from right edge and extend off-screen to the right
    const x = canvasWidth + (i * spacing);
    // Calculate Y position on the wave at this X
    const y = calculateWaveY(x, waveOffset, amplitude, centerY);

    shards.push({
      x,
      y,
      collected: false,
    });
  }

  return shards;
}

/**
 * Updates wave path shard positions based on new wave offset
 * Called each frame to keep shards aligned with the moving wave
 * Shards also move horizontally towards the player (left)
 * 
 * @param shards - Current shard positions
 * @param waveOffset - New wave animation offset
 * @param amplitude - Wave amplitude in pixels
 * @param centerY - Center Y position of the wave
 * @param gameSpeed - Current game speed for horizontal movement
 * @param canvasWidth - Canvas width for respawning
 * @returns Updated shard positions
 */
export function updateWavePathShards(
  shards: WavePathShard[],
  waveOffset: number,
  amplitude: number,
  centerY: number,
  gameSpeed: number = 5,
  canvasWidth: number = 400
): WavePathShard[] {
  // Diamond movement speed - 80% of game speed
  const diamondSpeed = gameSpeed * 0.8;

  // Spacing between diamonds for respawning
  const spacing = 80;

  return shards.map(shard => {
    // Move shard horizontally towards the player (left)
    let newX = shard.x - diamondSpeed;
    let collected = shard.collected;

    // If diamond went off left edge, respawn from right
    if (newX < -30) {
      // Find the rightmost diamond to maintain spacing
      const maxX = shards.reduce((max, s) => Math.max(max, s.x), 0);
      newX = maxX + spacing;
      collected = false; // Reset collected state for respawned diamond
    }

    return {
      ...shard,
      x: newX,
      collected,
      // Recalculate Y position based on new wave offset and new X
      y: calculateWaveY(newX, waveOffset, amplitude, centerY),
    };
  });
}

/**
 * Marks a shard as collected
 * 
 * @param shards - Current shard array
 * @param index - Index of shard to mark as collected
 * @returns Updated shard array
 */
export function collectWavePathShard(
  shards: WavePathShard[],
  index: number
): WavePathShard[] {
  if (index < 0 || index >= shards.length) {
    return shards;
  }

  return shards.map((shard, i) =>
    i === index ? { ...shard, collected: true } : shard
  );
}

/**
 * Counts uncollected shards
 * 
 * @param shards - Current shard array
 * @returns Number of uncollected shards
 */
export function countUncollectedShards(shards: WavePathShard[]): number {
  return shards.filter(shard => !shard.collected).length;
}

// ============================================================================
// Midline Collision Detection - Quantum Lock failure condition
// ============================================================================

/**
 * Result of midline collision check
 */
export interface MidlineCollisionResult {
  hit: boolean;
  updatedState: GlitchModeState;
  shouldEndQuantumLock: boolean;
  triggerBurnEffect: boolean;
}

/**
 * Checks if an orb has collided with the wave midline (zero line)
 * During Quantum Lock, orbs must avoid the sinusoidal wave
 * 
 * @param orbY - Y position of the orb
 * @param waveY - Current Y position of the wave at the orb's X position
 * @param threshold - Collision threshold in pixels
 * @returns true if collision detected
 */
export function checkMidlineCollision(
  orbY: number,
  waveY: number,
  threshold: number = 15
): boolean {
  return Math.abs(orbY - waveY) < threshold;
}

/**
 * Registers a midline hit during Quantum Lock
 * Includes cooldown to prevent rapid-fire hit registration
 * 
 * @param state - Current glitch mode state
 * @returns Updated state and collision result
 */
export function registerMidlineHit(
  state: GlitchModeState
): MidlineCollisionResult {
  if (!state.isActive) {
    return {
      hit: false,
      updatedState: state,
      shouldEndQuantumLock: false,
      triggerBurnEffect: false,
    };
  }

  const now = Date.now();
  const cooldown = GLITCH_CONFIG.midlineCollision.hitCooldownMs;

  // Check cooldown
  if (now - state.lastMidlineHitTime < cooldown) {
    return {
      hit: false,
      updatedState: state,
      shouldEndQuantumLock: false,
      triggerBurnEffect: false,
    };
  }

  const newHits = state.midlineHits + 1;
  const maxHits = GLITCH_CONFIG.midlineCollision.maxHits;
  const shouldEnd = newHits >= maxHits;

  const updatedState: GlitchModeState = {
    ...state,
    midlineHits: newHits,
    lastMidlineHitTime: now,
  };

  return {
    hit: true,
    updatedState,
    shouldEndQuantumLock: shouldEnd,
    triggerBurnEffect: shouldEnd,
  };
}

/**
 * Force ends Quantum Lock due to too many midline hits
 * Triggers burn effect and skips ghost mode
 * 
 * @param state - Current glitch mode state
 * @returns Updated state with Quantum Lock ended
 */
export function forceEndQuantumLock(
  state: GlitchModeState
): GlitchModeState {
  return {
    ...state,
    isActive: false,
    phase: 'inactive', // Skip ghost mode - punitive end
    midlineHits: 0,
    lastMidlineHitTime: 0,
  };
}

// ============================================================================
// Mode Priority System - Requirements 6.7, 7.8, 10.1, 10.2, 10.3, 10.4, 10.5
// ============================================================================


/**
 * Result of pausing Overdrive mode
 */
export interface PauseOverdriveResult {
  glitchState: GlitchModeState;
  overdriveState: ShiftProtocolState;
}

/**
 * Result of pausing Resonance mode
 */
export interface PauseResonanceResult {
  glitchState: GlitchModeState;
  resonanceState: ResonanceState;
}

/**
 * Pauses Overdrive mode when Quantum Lock activates
 * Requirements 6.7: Pause Overdrive timer when Quantum Lock is active
 * Requirements 10.1: Pause Overdrive timer when Quantum Lock activates
 * 
 * Stores the remaining Overdrive time in the glitch state so it can be
 * resumed after Quantum Lock ends.
 * 
 * @param glitchState - Current glitch mode state
 * @param overdriveState - Current Overdrive state
 * @returns Updated glitch and overdrive states with Overdrive paused
 */
export function pauseOverdrive(
  glitchState: GlitchModeState,
  overdriveState: ShiftProtocolState
): PauseOverdriveResult {
  // Only pause if Overdrive is active
  if (!overdriveState.overdriveActive) {
    return { glitchState, overdriveState };
  }

  // Store remaining Overdrive time in glitch state
  const updatedGlitchState: GlitchModeState = {
    ...glitchState,
    pausedOverdriveTime: overdriveState.overdriveTimer,
  };

  // Pause Overdrive by setting timer to 0 but keeping active flag
  // This prevents the timer from decrementing during Quantum Lock
  const updatedOverdriveState: ShiftProtocolState = {
    ...overdriveState,
    overdriveTimer: 0,
    overdriveActive: false, // Temporarily deactivate to prevent effects
  };

  return {
    glitchState: updatedGlitchState,
    overdriveState: updatedOverdriveState,
  };
}

/**
 * Resumes Overdrive mode after Quantum Lock ends
 * Requirements 7.8: Resume Overdrive with remaining time after Quantum Lock ends
 * Requirements 10.3: Resume paused mode with remaining time
 * 
 * Restores the Overdrive timer from the stored value in glitch state.
 * 
 * @param glitchState - Current glitch mode state (contains paused time)
 * @param overdriveState - Current Overdrive state
 * @returns Updated overdrive state with timer restored
 */
export function resumeOverdrive(
  glitchState: GlitchModeState,
  overdriveState: ShiftProtocolState
): ShiftProtocolState {
  // Only resume if there was paused time
  if (glitchState.pausedOverdriveTime <= 0) {
    return overdriveState;
  }

  // Restore Overdrive with remaining time
  return {
    ...overdriveState,
    overdriveActive: true,
    overdriveTimer: glitchState.pausedOverdriveTime,
  };
}

/**
 * Pauses Resonance mode when Quantum Lock activates
 * Requirements 10.2: Pause Resonance timer when Quantum Lock activates
 * Requirements 10.3: Resume paused mode with remaining time
 * 
 * Stores the remaining Resonance time in the glitch state so it can be
 * resumed after Quantum Lock ends.
 * 
 * @param glitchState - Current glitch mode state
 * @param resonanceState - Current Resonance state
 * @returns Updated glitch and resonance states with Resonance paused
 */
export function pauseResonance(
  glitchState: GlitchModeState,
  resonanceState: ResonanceState
): PauseResonanceResult {
  // Only pause if Resonance is active and not already paused
  if (!resonanceState.isActive || resonanceState.isPaused) {
    return { glitchState, resonanceState };
  }

  // Store remaining Resonance time in glitch state
  const updatedGlitchState: GlitchModeState = {
    ...glitchState,
    pausedResonanceTime: resonanceState.remainingTime,
  };

  // Pause Resonance using its built-in pause mechanism
  const updatedResonanceState: ResonanceState = {
    ...resonanceState,
    isPaused: true,
    pausedTimeRemaining: resonanceState.remainingTime,
  };

  return {
    glitchState: updatedGlitchState,
    resonanceState: updatedResonanceState,
  };
}

/**
 * Resumes Resonance mode after Quantum Lock ends
 * Requirements 10.3: Resume paused mode with remaining time
 * 
 * Restores the Resonance timer from the stored value.
 * 
 * @param glitchState - Current glitch mode state (contains paused time)
 * @param resonanceState - Current Resonance state
 * @returns Updated resonance state with timer restored
 */
export function resumeResonance(
  glitchState: GlitchModeState,
  resonanceState: ResonanceState
): ResonanceState {
  // Only resume if Resonance was paused
  if (!resonanceState.isPaused || glitchState.pausedResonanceTime <= 0) {
    return resonanceState;
  }

  // Restore Resonance with remaining time
  return {
    ...resonanceState,
    isPaused: false,
    remainingTime: glitchState.pausedResonanceTime,
    pausedTimeRemaining: 0,
  };
}

/**
 * Priority mode type
 */
export type PriorityMode = 'quantum_lock' | 'overdrive' | 'resonance' | 'none';

/**
 * Gets the current priority mode based on all mode states
 * Requirements 10.4: Quantum Lock has highest priority over other bonus modes
 * Requirements 10.5: Restore modes in order (Overdrive first, then Resonance)
 * 
 * Priority order (highest to lowest):
 * 1. Quantum Lock (Glitch Protocol)
 * 2. Overdrive (S.H.I.F.T. Protocol)
 * 3. Resonance (Harmonic Resonance)
 * 
 * @param glitchState - Current glitch mode state
 * @param overdriveState - Current Overdrive state
 * @param resonanceState - Current Resonance state
 * @returns The currently active priority mode
 */
export function getPriorityMode(
  glitchState: GlitchModeState,
  overdriveState: ShiftProtocolState,
  resonanceState: ResonanceState
): PriorityMode {
  // Requirements 10.4: Quantum Lock has highest priority
  // Check for active Quantum Lock (including ghost mode for invulnerability)
  if (glitchState.isActive || glitchState.phase === 'ghost') {
    return 'quantum_lock';
  }

  // Overdrive has second priority
  if (overdriveState.overdriveActive) {
    return 'overdrive';
  }

  // Resonance has third priority (only if active and not paused)
  if (resonanceState.isActive && !resonanceState.isPaused) {
    return 'resonance';
  }

  return 'none';
}

/**
 * Clears paused mode times from glitch state after resuming
 * Should be called after resuming all paused modes
 * 
 * @param glitchState - Current glitch mode state
 * @returns Updated glitch state with cleared paused times
 */
export function clearPausedModeTimes(glitchState: GlitchModeState): GlitchModeState {
  return {
    ...glitchState,
    pausedOverdriveTime: 0,
    pausedResonanceTime: 0,
  };
}

// ============================================================================
// Ghost Mode Functions - Requirements 7.4, 7.5, 7.6, 7.7
// ============================================================================

/**
 * Activates Ghost Mode after Quantum Lock ends
 * Requirements 7.4: Activate Ghost Mode for 1500 milliseconds
 * Requirements 7.5: Make player semi-transparent (50% opacity)
 * 
 * Ghost Mode provides a brief invulnerability period after Quantum Lock ends,
 * allowing the player to safely transition back to normal gameplay.
 * 
 * @param state - Current glitch mode state
 * @returns Updated state with Ghost Mode activated
 */
export function activateGhostMode(state: GlitchModeState): GlitchModeState {
  const now = Date.now();

  return {
    ...state,
    isActive: false,                    // Quantum Lock is no longer active
    phase: 'ghost',                     // Enter Ghost Mode phase
    ghostModeEndTime: now + GLITCH_CONFIG.ghostModeDuration, // 1500ms from now
  };
}

/**
 * Updates Ghost Mode state based on elapsed time
 * Requirements 7.4: Ghost Mode lasts exactly 1500ms
 * Requirements 7.7: Restore normal gameplay state when Ghost Mode ends
 * 
 * @param state - Current glitch mode state
 * @param deltaTime - Time since last frame in ms (unused but kept for consistency)
 * @returns Updated state, transitioning to inactive when Ghost Mode ends
 */
export function updateGhostMode(
  state: GlitchModeState,
  deltaTime: number
): GlitchModeState {
  // Only process if in Ghost Mode
  if (state.phase !== 'ghost') {
    return state;
  }

  const now = Date.now();

  // Check if Ghost Mode has ended
  if (now >= state.ghostModeEndTime) {
    // Requirements 7.7: Restore normal gameplay state
    return {
      ...state,
      isActive: false,
      phase: 'inactive',
      ghostModeEndTime: 0,
      waveOffset: 0,
    };
  }

  // Ghost Mode still active, return unchanged
  return state;
}

/**
 * Gets the remaining time in Ghost Mode
 * Useful for visual effects like opacity fade
 * 
 * @param state - Current glitch mode state
 * @returns Remaining time in ms, or 0 if not in Ghost Mode
 */
export function getGhostModeRemainingTime(state: GlitchModeState): number {
  if (state.phase !== 'ghost') {
    return 0;
  }

  const now = Date.now();
  return Math.max(0, state.ghostModeEndTime - now);
}

/**
 * Gets the Ghost Mode progress (0.0 to 1.0)
 * 0.0 = just started, 1.0 = about to end
 * Useful for visual effects like opacity transitions
 * 
 * @param state - Current glitch mode state
 * @returns Progress from 0.0 to 1.0, or 0 if not in Ghost Mode
 */
export function getGhostModeProgress(state: GlitchModeState): number {
  if (state.phase !== 'ghost') {
    return 0;
  }

  const remaining = getGhostModeRemainingTime(state);
  const elapsed = GLITCH_CONFIG.ghostModeDuration - remaining;

  return Math.min(1.0, elapsed / GLITCH_CONFIG.ghostModeDuration);
}

/**
 * Checks if Ghost Mode is currently active
 * Requirements 7.6: Prevent collision damage during Ghost Mode
 * 
 * @param state - Current glitch mode state
 * @returns true if in Ghost Mode
 */
export function isGhostModeActive(state: GlitchModeState): boolean {
  return state.phase === 'ghost';
}

/**
 * Gets the opacity for player rendering during Ghost Mode
 * Requirements 7.5: Make player semi-transparent (50% opacity)
 * 
 * Returns 0.5 during Ghost Mode, 1.0 otherwise.
 * Can be used for smooth fade-in at the end of Ghost Mode.
 * 
 * @param state - Current glitch mode state
 * @param smoothFade - If true, fade opacity from 0.5 to 1.0 during last 300ms
 * @returns Opacity value from 0.5 to 1.0
 */
export function getGhostModeOpacity(
  state: GlitchModeState,
  smoothFade: boolean = false
): number {
  if (state.phase !== 'ghost') {
    return 1.0;
  }

  if (!smoothFade) {
    // Requirements 7.5: 50% opacity during Ghost Mode
    return 0.5;
  }

  // Smooth fade from 0.5 to 1.0 during last 300ms
  const remaining = getGhostModeRemainingTime(state);
  const fadeStartTime = 300; // Start fading 300ms before end

  if (remaining > fadeStartTime) {
    return 0.5;
  }

  // Linear interpolation from 0.5 to 1.0
  const fadeProgress = 1 - (remaining / fadeStartTime);
  return 0.5 + (0.5 * fadeProgress);
}

// ============================================================================
// Input Buffering System - Requirements 3.2 (hit stop handling)
// ============================================================================

/**
 * Input buffer for storing player inputs during hit stop
 * Requirements 3.2: Buffer inputs during hit stop and process after
 * 
 * During hit stop (10 frames freeze), player inputs are buffered
 * and then processed when hit stop ends.
 */
export interface InputBuffer {
  pendingSwap: boolean;     // Whether a swap input is pending
  pendingTap: boolean;      // Whether a tap input is pending
  timestamp: number;        // When the input was buffered
}

// Module-level input buffer state
let inputBuffer: InputBuffer | null = null;

/**
 * Creates an empty input buffer
 * @returns Empty InputBuffer
 */
export function createEmptyInputBuffer(): InputBuffer {
  return {
    pendingSwap: false,
    pendingTap: false,
    timestamp: 0,
  };
}

/**
 * Buffers player input during hit stop
 * Requirements 3.2: Hit stop sırasında girdi gelirse tampona al
 * 
 * When hit stop is active, player inputs are stored in the buffer
 * to be processed when hit stop ends. This prevents input loss
 * during the freeze effect.
 * 
 * @param input - The input state to buffer
 */
export function bufferInput(input: InputState): void {
  const now = Date.now();

  if (inputBuffer === null) {
    // Create new buffer with this input
    inputBuffer = {
      pendingSwap: input.isReleaseFrame, // Swap typically happens on release
      pendingTap: input.isTapFrame,      // Tap happens on press
      timestamp: now,
    };
  } else {
    // Merge with existing buffer (OR the flags to not lose any input)
    inputBuffer = {
      pendingSwap: inputBuffer.pendingSwap || input.isReleaseFrame,
      pendingTap: inputBuffer.pendingTap || input.isTapFrame,
      timestamp: now, // Update timestamp to latest input
    };
  }
}

/**
 * Flushes the buffered input and returns it
 * Requirements 3.2: Hit stop bittiğinde tamponu işle ve temizle
 * 
 * Returns the buffered input as an InputState and clears the buffer.
 * Should be called when hit stop ends to process any inputs that
 * occurred during the freeze.
 * 
 * @returns InputState if there was buffered input, null otherwise
 */
export function flushBufferedInput(): InputState | null {
  if (inputBuffer === null) {
    return null;
  }

  // Check if there's actually any pending input
  if (!inputBuffer.pendingSwap && !inputBuffer.pendingTap) {
    inputBuffer = null;
    return null;
  }

  // Convert buffer to InputState
  const result: InputState = {
    isPressed: inputBuffer.pendingTap, // If tap was pending, consider pressed
    y: 0, // Y position not tracked in buffer (not needed for swap/tap)
    isTapFrame: inputBuffer.pendingTap,
    isReleaseFrame: inputBuffer.pendingSwap,
  };

  // Clear the buffer
  inputBuffer = null;

  return result;
}

/**
 * Checks if there is any buffered input
 * Useful for UI feedback during hit stop
 * 
 * @returns true if there is buffered input
 */
export function hasBufferedInput(): boolean {
  return inputBuffer !== null &&
    (inputBuffer.pendingSwap || inputBuffer.pendingTap);
}

/**
 * Clears the input buffer without processing
 * Useful for resetting state on game over or mode exit
 */
export function clearInputBuffer(): void {
  inputBuffer = null;
}

/**
 * Gets the current input buffer state (for testing/debugging)
 * @returns Current InputBuffer or null
 */
export function getInputBuffer(): InputBuffer | null {
  return inputBuffer;
}
