/**
 * Phase Dash System (Faz Atlaması)
 * 
 * Provides warp mechanics where players use accumulated energy
 * to enter hyper-speed mode with invincibility.
 * 
 * Energy earned from:
 * - Shard collection (+5%)
 * - Near-miss events (+10%)
 * 
 * When energy reaches 100%, double-tap activates dash.
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Ghost trail position for visual effect
 */
export interface GhostPosition {
    x: number;
    y: number;
    alpha: number;    // 0-1, fades over time
}

/**
 * Phase Dash state tracking
 */
export interface PhaseDashState {
    isActive: boolean;
    energy: number;           // 0-100
    duration: number;         // Ms (upgrades increase this)
    startTime: number;        // When dash was activated
    ghostTrail: GhostPosition[];
}

/**
 * Phase Dash configuration
 */
export interface PhaseDashConfig {
    baseDuration: number;       // Default duration in ms
    maxDuration: number;        // Max duration with upgrades
    speedMultiplier: number;    // Speed multiplier during dash
    energyPerShard: number;     // Energy gained per shard collected
    energyPerNearMiss: number;  // Energy gained per near-miss
    ghostTrailInterval: number; // Frames between ghost captures
    maxGhostTrails: number;     // Maximum ghost positions stored
    ghostFadeRate: number;      // Alpha decrease per frame
}

// ============================================================================
// Default Configuration
// ============================================================================

export const PHASE_DASH_CONFIG: PhaseDashConfig = {
    baseDuration: 3000,         // 3 seconds
    maxDuration: 5000,          // 5 seconds (max upgrade)
    speedMultiplier: 4,         // 4x speed
    energyPerShard: 5,          // +5% per shard
    energyPerNearMiss: 10,      // +10% per near-miss
    ghostTrailInterval: 3,      // Every 3 frames
    maxGhostTrails: 15,         // 15 ghost positions max
    ghostFadeRate: 0.08,        // Fade speed
};

// ============================================================================
// State Factory
// ============================================================================

/**
 * Creates initial Phase Dash state
 */
export function createInitialPhaseDashState(): PhaseDashState {
    return {
        isActive: false,
        energy: 100, // TEMPORARY: Start full for testing
        duration: PHASE_DASH_CONFIG.baseDuration,
        startTime: 0,
        ghostTrail: [],
    };
}

// ============================================================================
// Energy Management
// ============================================================================

/**
 * Updates energy level
 * Energy is clamped to 0-100 range
 * 
 * @param state - Current Phase Dash state
 * @param amount - Amount to add (can be multiplied by upgrade)
 * @returns Updated state
 */
export function updateEnergy(
    state: PhaseDashState,
    amount: number
): PhaseDashState {
    // Don't accumulate energy while dash is active
    if (state.isActive) {
        return state;
    }

    const newEnergy = Math.min(100, Math.max(0, state.energy + amount));

    return {
        ...state,
        energy: newEnergy,
    };
}

/**
 * Checks if dash can be activated
 * Requires 100% energy and not already active
 * 
 * @param state - Current Phase Dash state
 * @returns true if dash can be activated
 */
export function canActivate(state: PhaseDashState): boolean {
    return state.energy >= 100 && !state.isActive;
}

/**
 * Gets energy percentage (0-100)
 * 
 * @param state - Current Phase Dash state
 * @returns Energy percentage
 */
export function getEnergyPercent(state: PhaseDashState): number {
    return state.energy;
}

/**
 * Checks if energy is full (ready for dash)
 * 
 * @param state - Current Phase Dash state
 * @returns true if energy is 100%
 */
export function isEnergyFull(state: PhaseDashState): boolean {
    return state.energy >= 100;
}

// ============================================================================
// Dash Activation / Deactivation
// ============================================================================

/**
 * Activates Phase Dash
 * Consumes all energy and starts dash timer
 * 
 * @param state - Current Phase Dash state
 * @param upgradeDuration - Duration from upgrades (or base if not upgraded)
 * @returns Updated state with dash active
 */
export function activateDash(
    state: PhaseDashState,
    upgradeDuration: number = PHASE_DASH_CONFIG.baseDuration
): PhaseDashState {
    if (!canActivate(state)) {
        return state;
    }

    return {
        ...state,
        isActive: true,
        energy: 0,              // Consume all energy
        duration: upgradeDuration,
        startTime: Date.now(),
        ghostTrail: [],         // Reset ghost trail
    };
}

/**
 * Deactivates Phase Dash
 * Called when duration expires
 * 
 * @param state - Current Phase Dash state
 * @returns Updated state with dash inactive
 */
export function deactivateDash(state: PhaseDashState): PhaseDashState {
    return {
        ...state,
        isActive: false,
        startTime: 0,
        ghostTrail: [],
    };
}

/**
 * Checks if dash is currently active
 * 
 * @param state - Current Phase Dash state
 * @returns true if dash is active
 */
export function isDashActive(state: PhaseDashState): boolean {
    return state.isActive;
}

/**
 * Gets remaining dash time in milliseconds
 * 
 * @param state - Current Phase Dash state
 * @returns Remaining time in ms, or 0 if not active
 */
export function getRemainingTime(state: PhaseDashState): number {
    if (!state.isActive) return 0;

    const elapsed = Date.now() - state.startTime;
    return Math.max(0, state.duration - elapsed);
}

/**
 * Gets dash progress (0-1, where 1 is complete/expired)
 * 
 * @param state - Current Phase Dash state
 * @returns Progress fraction
 */
export function getDashProgress(state: PhaseDashState): number {
    if (!state.isActive) return 0;

    const elapsed = Date.now() - state.startTime;
    return Math.min(1, elapsed / state.duration);
}

// ============================================================================
// Frame Update
// ============================================================================

/**
 * Updates Phase Dash state each frame
 * Handles timer expiration and ghost trail updates
 * 
 * @param state - Current Phase Dash state
 * @param playerX - Current player X position (for ghost trail)
 * @param playerY - Current player Y position (for ghost trail)
 * @param frameId - Current frame number
 * @param config - Phase Dash configuration
 * @returns Updated state (and whether dash just ended)
 */
export function updateDashState(
    state: PhaseDashState,
    playerX: number,
    playerY: number,
    frameId: number,
    config: PhaseDashConfig = PHASE_DASH_CONFIG
): { state: PhaseDashState; dashEnded: boolean } {
    if (!state.isActive) {
        return { state, dashEnded: false };
    }

    // Check if duration expired
    const elapsed = Date.now() - state.startTime;
    if (elapsed >= state.duration) {
        return {
            state: deactivateDash(state),
            dashEnded: true,
        };
    }

    // Update ghost trail
    let newGhostTrail = [...state.ghostTrail];

    // Add new ghost position at intervals
    if (frameId % config.ghostTrailInterval === 0) {
        newGhostTrail.push({
            x: playerX,
            y: playerY,
            alpha: 1.0,
        });

        // Limit trail length
        if (newGhostTrail.length > config.maxGhostTrails) {
            newGhostTrail = newGhostTrail.slice(-config.maxGhostTrails);
        }
    }

    // Fade existing ghosts
    newGhostTrail = newGhostTrail
        .map(ghost => ({
            ...ghost,
            alpha: ghost.alpha - config.ghostFadeRate,
        }))
        .filter(ghost => ghost.alpha > 0);

    return {
        state: {
            ...state,
            ghostTrail: newGhostTrail,
        },
        dashEnded: false,
    };
}

// ============================================================================
// Speed Multiplier
// ============================================================================

/**
 * Gets the current speed multiplier
 * Returns 1 if dash is not active, speedMultiplier if active
 * 
 * @param state - Current Phase Dash state
 * @param config - Phase Dash configuration
 * @returns Speed multiplier (1 or speedMultiplier)
 */
export function getSpeedMultiplier(
    state: PhaseDashState,
    config: PhaseDashConfig = PHASE_DASH_CONFIG
): number {
    return state.isActive ? config.speedMultiplier : 1;
}

/**
 * Checks if player should be invincible (collision immunity)
 * 
 * @param state - Current Phase Dash state
 * @returns true if player should ignore collisions
 */
export function isInvincible(state: PhaseDashState): boolean {
    return state.isActive;
}
