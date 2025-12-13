/**
 * ConstructSystem - Manager for Echo Constructs
 * 
 * Manages construct transformations, invincibility, and physics strategy switching.
 * Uses Strategy Pattern to delegate physics behavior to the active construct.
 * 
 * Requirements:
 * - 2.1: WHEN a Construct transformation begins THEN the Transform System SHALL grant 2 seconds of invincibility
 * - 2.2: WHEN transforming THEN the Transform System SHALL play a "Phase Shift" visual effect
 * - 7.1: WHEN the game initializes THEN the State System SHALL set activeConstruct to 'NONE'
 * - 7.2: WHEN a Construct activates THEN the State System SHALL update activeConstruct to the Construct type
 * - 7.3: WHEN a Construct is destroyed THEN the State System SHALL reset activeConstruct to 'NONE'
 * - 7.5: WHEN the game ends THEN the State System SHALL reset activeConstruct to 'NONE'
 */

import type {
    ConstructType,
    InputState,
    PhysicsStrategy,
    PlayerEntity,
} from '../../types';
import { getBlinkPhysics, resetBlinkPhysics } from './BlinkPhysics';
import { getPhasePhysics, resetPhasePhysics } from './PhasePhysics';
import { getStandardPhysics } from './StandardPhysics';
import { getTitanPhysics, resetTitanPhysics } from './TitanPhysics';

/**
 * Configuration for the Construct System
 */
export const CONSTRUCT_SYSTEM_CONFIG = {
  /** Duration of invincibility after transformation (ms) - Requirements 2.1, 6.3 */
  transformationInvincibilityDuration: 2000,
  /** Duration of invincibility after Second Chance (ms) - Requirements 6.3 */
  secondChanceInvincibilityDuration: 2000,
} as const;

/**
 * State interface for the Construct System
 * Requirements 7.1, 7.2, 7.3: Track active construct and invincibility
 */
export interface ConstructSystemState {
  /** Currently active construct type - Requirements 7.1, 7.2, 7.3 */
  activeConstruct: ConstructType;
  /** Whether player is currently invulnerable */
  isInvulnerable: boolean;
  /** Timestamp when invulnerability ends (ms) */
  invulnerabilityEndTime: number;
  /** Reference to the current physics strategy */
  currentStrategy: PhysicsStrategy;
}


/**
 * Get the physics strategy for a given construct type
 * @param type - The construct type
 * @returns The corresponding physics strategy
 */
export function getStrategyForType(type: ConstructType): PhysicsStrategy {
  switch (type) {
    case 'TITAN':
      return getTitanPhysics();
    case 'PHASE':
      return getPhasePhysics();
    case 'BLINK':
      return getBlinkPhysics();
    case 'NONE':
    default:
      return getStandardPhysics();
  }
}

/**
 * Create initial construct system state
 * Requirements 7.1: Initialize with activeConstruct = 'NONE'
 * 
 * @returns Initial ConstructSystemState
 */
export function createConstructSystemState(): ConstructSystemState {
  return {
    activeConstruct: 'NONE',
    isInvulnerable: false,
    invulnerabilityEndTime: 0,
    currentStrategy: getStandardPhysics(),
  };
}

/**
 * Transform to a new construct type
 * Requirements 2.1: Grant 2 seconds of invincibility on transformation
 * Requirements 7.2: Update activeConstruct to the new type
 * 
 * @param state - Current construct system state
 * @param type - The construct type to transform to
 * @param currentTime - Current timestamp in milliseconds
 * @returns New ConstructSystemState with updated construct and invincibility
 */
export function transformTo(
  state: ConstructSystemState,
  type: ConstructType,
  currentTime: number
): ConstructSystemState {
  // Reset physics singletons to ensure fresh state
  resetTitanPhysics();
  resetPhasePhysics();
  resetBlinkPhysics();

  const newStrategy = getStrategyForType(type);
  
  // Requirements 2.1: Grant invincibility on transformation
  const newInvulnerabilityEndTime = currentTime + CONSTRUCT_SYSTEM_CONFIG.transformationInvincibilityDuration;

  return {
    activeConstruct: type,
    isInvulnerable: true,
    invulnerabilityEndTime: newInvulnerabilityEndTime,
    currentStrategy: newStrategy,
  };
}

/**
 * Check if player is currently invulnerable
 * Requirements 2.1, 6.3: Invincibility duration check
 * 
 * @param state - Current construct system state
 * @param currentTime - Current timestamp in milliseconds
 * @returns true if player is invulnerable, false otherwise
 */
export function isInvulnerable(
  state: ConstructSystemState,
  currentTime: number
): boolean {
  if (!state.isInvulnerable) {
    return false;
  }
  return currentTime < state.invulnerabilityEndTime;
}

/**
 * Update construct system state (check invincibility expiration)
 * 
 * @param state - Current construct system state
 * @param currentTime - Current timestamp in milliseconds
 * @returns Updated ConstructSystemState
 */
export function updateConstructState(
  state: ConstructSystemState,
  currentTime: number
): ConstructSystemState {
  // Check if invincibility has expired
  if (state.isInvulnerable && currentTime >= state.invulnerabilityEndTime) {
    return {
      ...state,
      isInvulnerable: false,
    };
  }
  return state;
}

/**
 * Update player physics using the active strategy
 * Requirements 2.3, 2.4: Delegate to active physics strategy
 * 
 * @param state - Current construct system state
 * @param player - The player entity to update
 * @param deltaTime - Time since last frame in milliseconds
 * @param input - Current input state
 */
export function updateConstruct(
  state: ConstructSystemState,
  player: PlayerEntity,
  deltaTime: number,
  input: InputState
): void {
  state.currentStrategy.update(player, deltaTime, input);
}

/**
 * Destroy the current construct (Second Chance triggered)
 * Requirements 6.1, 6.2, 6.3: Destroy construct, return to base form, grant invincibility
 * Requirements 7.3: Reset activeConstruct to 'NONE'
 * 
 * @param _state - Current construct system state (used for activeConstruct check)
 * @param currentTime - Current timestamp in milliseconds
 * @returns New ConstructSystemState with base form and invincibility
 */
export function destroyConstruct(
  _state: ConstructSystemState,
  currentTime: number
): ConstructSystemState {
  // If already in base form, no second chance available
  if (_state.activeConstruct === 'NONE') {
    return _state;
  }

  // Reset physics singletons
  resetTitanPhysics();
  resetPhasePhysics();
  resetBlinkPhysics();

  // Requirements 6.2, 7.3: Return to base form
  // Requirements 6.3: Grant invincibility
  const newInvulnerabilityEndTime = currentTime + CONSTRUCT_SYSTEM_CONFIG.secondChanceInvincibilityDuration;

  return {
    activeConstruct: 'NONE',
    isInvulnerable: true,
    invulnerabilityEndTime: newInvulnerabilityEndTime,
    currentStrategy: getStandardPhysics(),
  };
}

/**
 * Reset construct system to initial state
 * Requirements 7.5: Reset activeConstruct to 'NONE' when game ends
 * 
 * @returns Fresh ConstructSystemState
 */
export function resetConstructSystem(): ConstructSystemState {
  // Reset all physics singletons
  resetTitanPhysics();
  resetPhasePhysics();
  resetBlinkPhysics();

  return createConstructSystemState();
}

/**
 * Get remaining invincibility time in milliseconds
 * 
 * @param state - Current construct system state
 * @param currentTime - Current timestamp in milliseconds
 * @returns Remaining invincibility time in ms, or 0 if not invulnerable
 */
export function getRemainingInvincibility(
  state: ConstructSystemState,
  currentTime: number
): number {
  if (!isInvulnerable(state, currentTime)) {
    return 0;
  }
  return Math.max(0, state.invulnerabilityEndTime - currentTime);
}
