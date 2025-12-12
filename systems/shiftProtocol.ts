/**
 * S.H.I.F.T. Protocol System
 * Requirements: 1.1, 1.2, 1.3, 1.4, 3.1-3.5, 4.1-4.7, 9.1-9.4
 * 
 * Letter collection system where players gather S-H-I-F-T letters
 * to activate Overdrive mode with invulnerability and destruction powers.
 */

import { SHIFT_CONFIG } from '../constants';
import { ShiftProtocolState } from '../types';

// ============================================================================
// Constants
// ============================================================================

/**
 * The target word for S.H.I.F.T. Protocol
 */
export const TARGET_WORD: string[] = ['S', 'H', 'I', 'F', 'T'];

// ============================================================================
// State Factory
// ============================================================================

/**
 * Creates initial S.H.I.F.T. Protocol state
 * Requirements 1.3: Initialize collectedMask to [false, false, false, false, false]
 * Requirements 1.4: Set overdriveActive to false and overdriveTimer to 0
 * 
 * @returns Initial ShiftProtocolState
 */
export function initializeShiftState(): ShiftProtocolState {
  return {
    targetWord: [...TARGET_WORD],
    collectedMask: [false, false, false, false, false],
    overdriveActive: false,
    overdriveTimer: 0,
    coreRotation: 0,
  };
}

/**
 * Resets S.H.I.F.T. Protocol state for a new game run
 * Requirements 1.3, 1.4: Reset to initial state
 * 
 * @returns Fresh ShiftProtocolState
 */
export function resetShiftState(): ShiftProtocolState {
  return initializeShiftState();
}

// ============================================================================
// Spawn Functions - Requirements 3.1, 3.4
// ============================================================================

/**
 * Calculates the reachable Y bounds for spawning collectibles
 * Requirements 3.1: Maximum reach is connectorLength - 20 pixels from midline
 * Requirements 3.2: Letter's Y position + oscillation amplitude must not exceed max reach
 * 
 * @param connectorLength - The current connector length between orbs
 * @param midlineY - The current Y position of the midline
 * @returns Object with min and max Y values for spawning
 */
export function calculateReachableY(
  connectorLength: number,
  midlineY: number
): { min: number; max: number } {
  // Maximum reach from midline is connectorLength - reachabilityMargin (20px)
  const maxReach = connectorLength - SHIFT_CONFIG.reachabilityMargin;
  
  return {
    min: midlineY - maxReach,
    max: midlineY + maxReach,
  };
}

/**
 * Calculates spawn probability based on current score
 * Requirements 3.4: Linear interpolation from 5% at score 0 to 15% at score 5000
 * 
 * @param score - Current game score
 * @returns Spawn probability between 0.05 and 0.15
 */
export function calculateSpawnProbability(score: number): number {
  const { minSpawnProbability, maxSpawnProbability, probabilityMaxScore } = SHIFT_CONFIG;
  
  // Clamp score to valid range
  const clampedScore = Math.max(0, Math.min(score, probabilityMaxScore));
  
  // Linear interpolation: minProb + (maxProb - minProb) * (score / maxScore)
  const probability = minSpawnProbability + 
    (maxSpawnProbability - minSpawnProbability) * (clampedScore / probabilityMaxScore);
  
  return probability;
}

// ============================================================================
// Oscillation Functions - Requirements 3.3
// ============================================================================

/**
 * Calculates the Y position of a collectible with vertical oscillation
 * Requirements 3.3: Apply vertical oscillation using baseY + amplitude * sin(time * frequency)
 * 
 * @param baseY - The center Y position for oscillation
 * @param amplitude - The maximum displacement from baseY
 * @param frequency - The oscillation frequency (radians per second)
 * @param time - The current time in seconds
 * @returns The calculated Y position
 */
export function calculateOscillationY(
  baseY: number,
  amplitude: number,
  frequency: number,
  time: number
): number {
  return baseY + amplitude * Math.sin(time * frequency);
}

// ============================================================================
// Letter Selection Functions - Requirements 3.5
// ============================================================================

/**
 * Selects the next letter to spawn based on priority (uncollected letters first)
 * Requirements 3.5: Prioritize uncollected letters in the target word sequence
 * 
 * @param collectedMask - Array of 5 booleans indicating which letters are collected
 * @returns Index of the next letter to spawn, or -1 if all letters are collected
 */
export function selectNextLetter(collectedMask: boolean[]): number {
  // Find the first uncollected letter in sequence order (S, H, I, F, T)
  for (let i = 0; i < collectedMask.length; i++) {
    if (!collectedMask[i]) {
      return i;
    }
  }
  // All letters collected
  return -1;
}

// ============================================================================
// Collision and Collection Functions - Requirements 9.1, 9.2, 9.3, 9.4
// ============================================================================

/**
 * Checks if an orb collides with a collectible letter
 * Requirements 9.1: Mark letter as collected when orb overlaps hitbox
 * Requirements 9.2: Use circular hitbox with combined radius (orb + letter)
 * 
 * @param orb - The orb position {x, y}
 * @param collectible - The collectible to check collision against
 * @param orbRadius - The radius of the orb (default 7px)
 * @returns true if collision detected, false otherwise
 */
export function checkCollectibleCollision(
  orb: { x: number; y: number },
  collectible: { x: number; y: number },
  orbRadius: number = 7
): boolean {
  // Calculate distance between orb center and collectible center
  const dx = orb.x - collectible.x;
  const dy = orb.y - collectible.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Collision occurs if distance is within combined radius (orb + letter hitbox)
  // This makes collection feel more generous and responsive
  const combinedRadius = SHIFT_CONFIG.letterHitboxRadius + orbRadius;
  return distance <= combinedRadius;
}

/**
 * Marks a letter as collected in the S.H.I.F.T. state
 * Requirements 9.1: Update collectedMask when letter is collected
 * 
 * @param state - Current ShiftProtocolState
 * @param letterIndex - Index of the letter to mark as collected (0-4)
 * @returns Updated ShiftProtocolState with the letter marked as collected
 */
export function collectLetter(
  state: ShiftProtocolState,
  letterIndex: number
): ShiftProtocolState {
  // Validate letter index
  if (letterIndex < 0 || letterIndex >= 5) {
    return state;
  }
  
  // Create new collectedMask with the letter marked as collected
  const newCollectedMask = [...state.collectedMask];
  newCollectedMask[letterIndex] = true;
  
  return {
    ...state,
    collectedMask: newCollectedMask,
  };
}

/**
 * Removes a collected letter from the active collectibles list
 * Requirements 9.3: Remove letter from active collectibles list when collected
 * 
 * @param collectibles - Array of active collectibles
 * @param id - ID of the collectible to remove
 * @returns New array with the collectible removed
 */
export function removeCollectedLetter<T extends { id: string }>(
  collectibles: T[],
  id: string
): T[] {
  return collectibles.filter(collectible => collectible.id !== id);
}

/**
 * Calculates the new shard balance after collecting a letter
 * Requirements 9.4: Award 50 Echo Shards per letter collection
 * 
 * @param currentShards - Current Echo Shards balance
 * @returns New Echo Shards balance after adding collection reward
 */
export function awardCollectionReward(currentShards: number): number {
  return currentShards + SHIFT_CONFIG.collectionReward;
}

// ============================================================================
// Overdrive Mode Functions - Requirements 4.1, 4.3, 4.4, 4.5, 4.6, 4.7
// ============================================================================

/**
 * Checks if Overdrive mode should be activated
 * Requirements 4.1: Activate Overdrive when all 5 letters are collected
 * 
 * @param collectedMask - Array of 5 booleans indicating which letters are collected
 * @returns true if all 5 letters are collected, false otherwise
 */
export function checkOverdriveActivation(collectedMask: boolean[]): boolean {
  // All 5 letters must be collected to activate Overdrive
  return collectedMask.length === 5 && collectedMask.every(collected => collected === true);
}

/**
 * Activates Overdrive mode
 * Requirements 4.6: Set duration timer to 10 seconds
 * 
 * @param state - Current ShiftProtocolState
 * @returns Updated ShiftProtocolState with Overdrive active
 */
export function activateOverdrive(state: ShiftProtocolState): ShiftProtocolState {
  return {
    ...state,
    overdriveActive: true,
    overdriveTimer: SHIFT_CONFIG.overdriveDuration, // 10000ms = 10 seconds
  };
}

/**
 * Updates Overdrive timer each frame
 * Requirements 4.7: Decrement timer and deactivate when it reaches zero
 * 
 * @param state - Current ShiftProtocolState
 * @param deltaTime - Time elapsed since last update (milliseconds)
 * @returns Updated ShiftProtocolState with decremented timer
 */
export function updateOverdrive(
  state: ShiftProtocolState,
  deltaTime: number
): ShiftProtocolState {
  // If Overdrive is not active, return unchanged state
  if (!state.overdriveActive) {
    return state;
  }
  
  // Decrement timer
  const newTimer = Math.max(0, state.overdriveTimer - deltaTime);
  
  // If timer reaches zero, deactivate Overdrive
  if (newTimer === 0) {
    return deactivateOverdrive({
      ...state,
      overdriveTimer: newTimer,
    });
  }
  
  return {
    ...state,
    overdriveTimer: newTimer,
  };
}

/**
 * Deactivates Overdrive mode and resets state
 * Requirements 4.7: Restore normal gameplay when timer reaches zero
 * 
 * @param state - Current ShiftProtocolState
 * @returns Updated ShiftProtocolState with Overdrive deactivated
 */
export function deactivateOverdrive(state: ShiftProtocolState): ShiftProtocolState {
  return {
    ...state,
    overdriveActive: false,
    overdriveTimer: 0,
    // Reset collected mask for next S.H.I.F.T. collection cycle
    collectedMask: [false, false, false, false, false],
    coreRotation: 0,
  };
}

// ============================================================================
// Overdrive Collision Behaviors - Requirements 4.3, 4.4, 4.5
// ============================================================================

/**
 * Checks if player is invulnerable during Overdrive
 * Requirements 4.3: Disable standard collision death during Overdrive
 * 
 * @param state - Current ShiftProtocolState
 * @returns true if player is invulnerable (Overdrive active), false otherwise
 */
export function isInvulnerableDuringOverdrive(state: ShiftProtocolState): boolean {
  return state.overdriveActive;
}

/**
 * Handles collision with obstacle during Overdrive (destruction mode)
 * Requirements 4.4: Obstacles break on contact with the core during Overdrive
 * 
 * @param state - Current ShiftProtocolState
 * @returns Object indicating if obstacle should be destroyed
 */
export function handleOverdriveCollision(
  state: ShiftProtocolState
): { shouldDestroy: boolean } {
  // During Overdrive, obstacles are destroyed on contact
  return {
    shouldDestroy: state.overdriveActive,
  };
}

/**
 * Applies magnet effect to pull Echo Shards toward player
 * Requirements 4.5: Pull Echo Shards within 150px radius during Overdrive
 * 
 * @param shards - Array of shard positions with x, y coordinates
 * @param playerPos - Player position {x, y}
 * @param radius - Magnet effect radius (default: 150px from SHIFT_CONFIG)
 * @returns Array of shards with updated positions (pulled toward player)
 */
export function applyMagnetEffect<T extends { x: number; y: number }>(
  shards: T[],
  playerPos: { x: number; y: number },
  radius: number = SHIFT_CONFIG.magnetRadius
): T[] {
  return shards.map(shard => {
    // Calculate distance from player to shard
    const dx = playerPos.x - shard.x;
    const dy = playerPos.y - shard.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If shard is within magnet radius, pull it toward player
    if (distance <= radius && distance > 0) {
      // Calculate pull strength (stronger when closer)
      const pullStrength = 1 - (distance / radius);
      const pullFactor = pullStrength * 0.15; // 15% pull per frame at closest
      
      return {
        ...shard,
        x: shard.x + dx * pullFactor,
        y: shard.y + dy * pullFactor,
      };
    }
    
    // Shard is outside magnet radius, no change
    return shard;
  });
}
