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
    // Player X offset during dash (moves forward then returns)
    playerXOffset: number;    // 0 = normal position, positive = forward
    isReturning: boolean;     // True when dash ended and player returning to base
    returnStartTime: number;  // When return animation started
    returnStartOffset: number; // X offset when return started (for easing)
    // Spinning rotation during dash (clockwise)
    spinAngle: number;        // Current spin angle in radians
    // Post-dash cooldown tracking
    dashEndTime: number;      // When dash ended (for cooldown)
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
    // Player X movement during dash
    maxPlayerXOffset: number;   // Max forward offset (pixels)
    playerXAcceleration: number; // How fast player moves forward
    playerXReturnSpeed: number; // How fast player returns after dash (base speed)
    // Distance multiplier during dash
    distanceMultiplier: number; // How much faster distance increases (3-5x)
    // Obstacle spawn multiplier during dash
    obstacleSpawnMultiplier: number; // How many more obstacles spawn (3-4x)
    // Return animation settings
    returnAnimationDuration: number; // Duration of return animation in ms
    returnEaseType: 'easeOut' | 'easeInOut' | 'bounce'; // Easing type for return
    // Post-dash cooldown (no obstacles spawn)
    postDashCooldown: number; // Cooldown after dash ends (ms)
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
    // Player X movement - dash forward effect
    maxPlayerXOffset: 150,      // Max 150px forward (daha belirgin)
    playerXAcceleration: 4,     // Daha yavaş ve akıcı ileri hareket
    playerXReturnSpeed: 8,      // Base return speed (used with easing)
    // Distance and obstacle multipliers
    distanceMultiplier: 4,      // 4x faster distance during dash
    obstacleSpawnMultiplier: 4, // 4x more obstacles during dash - intense warp feel!
    // Return animation settings
    returnAnimationDuration: 600, // 600ms smooth return animation
    returnEaseType: 'easeOut',  // Smooth deceleration
    // Post-dash cooldown
    postDashCooldown: 1200,     // 1200ms breathing room after intense dash
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
        energy: 0,
        duration: PHASE_DASH_CONFIG.baseDuration,
        startTime: 0,
        ghostTrail: [],
        playerXOffset: 0,
        isReturning: false,
        returnStartTime: 0,
        returnStartOffset: 0,
        spinAngle: 0,
        dashEndTime: 0,
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
        playerXOffset: 0,       // Start from base position
        isReturning: false,
        returnStartTime: 0,
        returnStartOffset: 0,
        spinAngle: 0,           // Reset spin
        dashEndTime: 0,
    };
}

/**
 * Deactivates Phase Dash
 * Called when duration expires
 * Player starts returning to base position with smooth animation
 * 
 * @param state - Current Phase Dash state
 * @returns Updated state with dash inactive, returning mode active
 */
export function deactivateDash(state: PhaseDashState): PhaseDashState {
    const now = Date.now();
    return {
        ...state,
        isActive: false,
        startTime: 0,
        ghostTrail: [],
        isReturning: true,  // Start returning to base position
        returnStartTime: now,
        returnStartOffset: state.playerXOffset, // Remember where we started
        dashEndTime: now,
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
 * Handles timer expiration, ghost trail updates, and player X movement
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
    let newState = { ...state };
    let dashEnded = false;

    // Handle returning to base position (after dash ends) with smooth easing
    if (state.isReturning && !state.isActive) {
        const elapsed = Date.now() - state.returnStartTime;
        const progress = Math.min(1, elapsed / config.returnAnimationDuration);

        // Apply easing based on config
        let easedProgress: number;
        switch (config.returnEaseType) {
            case 'bounce':
                // Bounce easing - slight overshoot then settle
                if (progress < 0.7) {
                    easedProgress = 1 - Math.pow(1 - progress / 0.7, 2);
                } else {
                    const bounceProgress = (progress - 0.7) / 0.3;
                    easedProgress = 1 + Math.sin(bounceProgress * Math.PI) * 0.1 * (1 - bounceProgress);
                }
                break;
            case 'easeInOut':
                // Smooth ease in-out
                easedProgress = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                break;
            case 'easeOut':
            default:
                // Smooth ease-out (deceleration) - feels natural
                easedProgress = 1 - Math.pow(1 - progress, 3);
                break;
        }

        // Calculate new offset based on eased progress
        newState.playerXOffset = state.returnStartOffset * (1 - easedProgress);

        // Gradually slow down spin during return (spin decays to 0)
        // Use quadratic decay for natural slowdown feel
        const spinDecay = 1 - easedProgress * easedProgress;
        newState.spinAngle = state.spinAngle * spinDecay;

        if (progress >= 1) {
            // Animation complete
            newState.playerXOffset = 0;
            newState.isReturning = false;
            newState.spinAngle = 0; // Reset spin completely
        }

        return { state: newState, dashEnded: false };
    }

    if (!state.isActive) {
        return { state: newState, dashEnded: false };
    }

    // Check if duration expired
    const elapsed = Date.now() - state.startTime;
    if (elapsed >= state.duration) {
        return {
            state: deactivateDash(state),
            dashEnded: true,
        };
    }

    // Update player X offset (move forward during dash)
    // Smooth easing using sine curve for fluid motion
    const progress = elapsed / state.duration;
    const easedProgress = Math.sin(progress * Math.PI * 0.5); // Ease-out sine
    const targetOffset = config.maxPlayerXOffset * easedProgress;

    // Smooth interpolation towards target
    newState.playerXOffset += (targetOffset - newState.playerXOffset) * 0.1;

    // Update spin angle (clockwise rotation) - 6 full rotations during dash (faster spin)
    const spinSpeed = (Math.PI * 12) / state.duration * 16; // ~12π radians over duration (6 rotations)
    newState.spinAngle = (newState.spinAngle + spinSpeed) % (Math.PI * 2);

    // Update ghost trail (use actual player X with offset)
    let newGhostTrail = [...state.ghostTrail];

    // Add new ghost position at intervals
    if (frameId % config.ghostTrailInterval === 0) {
        newGhostTrail.push({
            x: playerX + newState.playerXOffset,
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

    newState.ghostTrail = newGhostTrail;

    return {
        state: newState,
        dashEnded,
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

/**
 * Gets the current player X offset for dash movement
 * Player moves forward during dash and returns after
 * 
 * @param state - Current Phase Dash state
 * @returns X offset in pixels (0 = base position)
 */
export function getPlayerXOffset(state: PhaseDashState): number {
    return state.playerXOffset;
}

/**
 * Gets the current spin angle for dash rotation effect
 * Player spins clockwise during dash
 * 
 * @param state - Current Phase Dash state
 * @returns Spin angle in radians
 */
export function getSpinAngle(state: PhaseDashState): number {
    return state.isActive ? state.spinAngle : 0;
}

/**
 * Gets the target Y position during dash (center of screen)
 * During dash, player should be centered vertically
 * 
 * @param state - Current Phase Dash state
 * @param currentY - Current player Y position (0-1)
 * @returns Target Y position (0-1), or currentY if not dashing
 */
export function getDashTargetY(state: PhaseDashState, currentY: number): number {
    if (!state.isActive) return currentY;

    // During dash, smoothly move towards center (0.5)
    const centerY = 0.5;
    const progress = getDashProgress(state);

    // Quick move to center at start, stay there
    const easeIn = Math.min(1, progress * 3); // Reach center in first 33% of dash
    return currentY + (centerY - currentY) * easeIn * 0.2; // Smooth interpolation
}

/**
 * Checks if player is in any dash-related movement (active or returning)
 * 
 * @param state - Current Phase Dash state
 * @returns true if player X offset is non-zero
 */
export function isInDashMovement(state: PhaseDashState): boolean {
    return state.isActive || state.isReturning || state.playerXOffset > 0;
}

/**
 * Gets the distance multiplier during dash
 * Distance increases faster during dash (4x by default)
 * 
 * @param state - Current Phase Dash state
 * @param config - Phase Dash configuration
 * @returns Distance multiplier (1 or distanceMultiplier)
 */
export function getDistanceMultiplier(
    state: PhaseDashState,
    config: PhaseDashConfig = PHASE_DASH_CONFIG
): number {
    return state.isActive ? config.distanceMultiplier : 1;
}

/**
 * Gets the obstacle spawn multiplier during dash
 * More obstacles spawn during dash (3x by default)
 * 
 * @param state - Current Phase Dash state
 * @param config - Phase Dash configuration
 * @returns Obstacle spawn multiplier (1 or obstacleSpawnMultiplier)
 */
export function getObstacleSpawnMultiplier(
    state: PhaseDashState,
    config: PhaseDashConfig = PHASE_DASH_CONFIG
): number {
    return state.isActive ? config.obstacleSpawnMultiplier : 1;
}

/**
 * Checks if we're in post-dash cooldown period
 * During cooldown, obstacles should not spawn to give player breathing room
 * 
 * @param state - Current Phase Dash state
 * @param config - Phase Dash configuration
 * @returns true if in cooldown period
 */
export function isInPostDashCooldown(
    state: PhaseDashState,
    config: PhaseDashConfig = PHASE_DASH_CONFIG
): boolean {
    if (state.isActive || state.dashEndTime === 0) return false;

    const elapsed = Date.now() - state.dashEndTime;
    return elapsed < config.postDashCooldown;
}

/**
 * Gets the return animation progress (0-1)
 * Useful for visual effects during return
 * 
 * @param state - Current Phase Dash state
 * @param config - Phase Dash configuration
 * @returns Progress from 0 (just started) to 1 (complete)
 */
export function getReturnProgress(
    state: PhaseDashState,
    config: PhaseDashConfig = PHASE_DASH_CONFIG
): number {
    if (!state.isReturning) return state.playerXOffset > 0 ? 0 : 1;

    const elapsed = Date.now() - state.returnStartTime;
    return Math.min(1, elapsed / config.returnAnimationDuration);
}
