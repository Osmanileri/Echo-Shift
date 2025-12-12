/**
 * Zen Mode System
 * Requirements: 9.1, 9.2, 9.4
 * 
 * Provides a relaxed gameplay experience:
 * - Score tracking disabled (9.1)
 * - Respawn on collision instead of game over (9.2)
 * - Reduced visual intensity for calming experience (9.4)
 */

// Zen Mode State Interface
export interface ZenModeState {
  isActive: boolean;
  respawnCount: number;
  lastRespawnTime: number;
  visualIntensity: number; // 0.0 - 1.0, lower = more relaxed
}

// Zen Mode Configuration
export interface ZenModeConfig {
  respawnDelay: number;        // Delay before respawn (ms)
  respawnInvincibility: number; // Invincibility after respawn (ms)
  visualIntensity: number;     // Visual intensity multiplier (0.3 - 0.7)
  particleReduction: number;   // Particle count multiplier (0.3 - 0.5)
  shakeReduction: number;      // Screen shake intensity multiplier (0.0 - 0.3)
}

// Default Zen Mode Configuration - Requirements 9.4
export const ZEN_MODE_CONFIG: ZenModeConfig = {
  respawnDelay: 500,           // 500ms respawn delay
  respawnInvincibility: 1000,  // 1 second invincibility after respawn
  visualIntensity: 0.5,        // 50% visual intensity
  particleReduction: 0.3,      // 30% of normal particles
  shakeReduction: 0.1,         // 10% of normal screen shake
};

/**
 * Creates initial Zen Mode state
 * @returns Initial ZenModeState
 */
export function createInitialZenModeState(): ZenModeState {
  return {
    isActive: false,
    respawnCount: 0,
    lastRespawnTime: 0,
    visualIntensity: ZEN_MODE_CONFIG.visualIntensity,
  };
}

/**
 * Activates Zen Mode
 * Requirements: 9.1, 9.4
 * @param state Current Zen Mode state
 * @returns Updated state with Zen Mode active
 */
export function activateZenMode(state: ZenModeState): ZenModeState {
  return {
    ...state,
    isActive: true,
    respawnCount: 0,
    lastRespawnTime: 0,
    visualIntensity: ZEN_MODE_CONFIG.visualIntensity,
  };
}

/**
 * Deactivates Zen Mode
 * @param state Current Zen Mode state
 * @returns Updated state with Zen Mode inactive
 */
export function deactivateZenMode(state: ZenModeState): ZenModeState {
  return {
    ...state,
    isActive: false,
    visualIntensity: 1.0,
  };
}

/**
 * Handles collision in Zen Mode - triggers respawn instead of game over
 * Requirements: 9.2
 * @param state Current Zen Mode state
 * @param currentTime Current timestamp
 * @returns Updated state and respawn info
 */
export function handleZenModeCollision(
  state: ZenModeState,
  currentTime: number
): { newState: ZenModeState; shouldRespawn: boolean } {
  if (!state.isActive) {
    return { newState: state, shouldRespawn: false };
  }

  // Check if enough time has passed since last respawn
  const timeSinceLastRespawn = currentTime - state.lastRespawnTime;
  if (timeSinceLastRespawn < ZEN_MODE_CONFIG.respawnDelay) {
    return { newState: state, shouldRespawn: false };
  }

  // Trigger respawn
  return {
    newState: {
      ...state,
      respawnCount: state.respawnCount + 1,
      lastRespawnTime: currentTime,
    },
    shouldRespawn: true,
  };
}

/**
 * Checks if player is currently invincible after respawn
 * Requirements: 9.2
 * @param state Current Zen Mode state
 * @param currentTime Current timestamp
 * @returns True if player is invincible
 */
export function isRespawnInvincible(state: ZenModeState, currentTime: number): boolean {
  if (!state.isActive) return false;
  
  const timeSinceRespawn = currentTime - state.lastRespawnTime;
  return timeSinceRespawn < ZEN_MODE_CONFIG.respawnInvincibility;
}

/**
 * Checks if score should be tracked
 * Requirements: 9.1
 * @param state Current Zen Mode state
 * @returns True if score should be disabled
 */
export function isScoreDisabled(state: ZenModeState): boolean {
  return state.isActive;
}

/**
 * Gets the visual intensity multiplier for effects
 * Requirements: 9.4
 * @param state Current Zen Mode state
 * @returns Visual intensity multiplier (0.0 - 1.0)
 */
export function getVisualIntensity(state: ZenModeState): number {
  return state.isActive ? state.visualIntensity : 1.0;
}

/**
 * Gets the particle count multiplier
 * Requirements: 9.4
 * @param state Current Zen Mode state
 * @returns Particle count multiplier
 */
export function getParticleMultiplier(state: ZenModeState): number {
  return state.isActive ? ZEN_MODE_CONFIG.particleReduction : 1.0;
}

/**
 * Gets the screen shake intensity multiplier
 * Requirements: 9.4
 * @param state Current Zen Mode state
 * @returns Screen shake multiplier
 */
export function getShakeMultiplier(state: ZenModeState): number {
  return state.isActive ? ZEN_MODE_CONFIG.shakeReduction : 1.0;
}

/**
 * Gets respawn position (center of screen)
 * Requirements: 9.2
 * @returns Normalized Y position for respawn (0.5 = center)
 */
export function getRespawnPosition(): number {
  return 0.5; // Center of screen
}

/**
 * Gets the respawn count for display
 * @param state Current Zen Mode state
 * @returns Number of respawns in current session
 */
export function getRespawnCount(state: ZenModeState): number {
  return state.respawnCount;
}

// Module-level state for singleton pattern
let zenModeState: ZenModeState = createInitialZenModeState();

/**
 * Gets the current Zen Mode state
 * @returns Current ZenModeState
 */
export function getZenModeState(): ZenModeState {
  return zenModeState;
}

/**
 * Sets the Zen Mode state
 * @param state New state to set
 */
export function setZenModeState(state: ZenModeState): void {
  zenModeState = state;
}

/**
 * Resets Zen Mode to initial state
 */
export function resetZenMode(): void {
  zenModeState = createInitialZenModeState();
}

/**
 * Activates Zen Mode globally
 * Requirements: 9.1, 9.4
 */
export function enableZenMode(): void {
  zenModeState = activateZenMode(zenModeState);
}

/**
 * Deactivates Zen Mode globally
 */
export function disableZenMode(): void {
  zenModeState = deactivateZenMode(zenModeState);
}

/**
 * Checks if Zen Mode is currently active
 * @returns True if Zen Mode is active
 */
export function isZenModeActive(): boolean {
  return zenModeState.isActive;
}
