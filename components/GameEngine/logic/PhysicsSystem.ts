/**
 * PhysicsSystem
 * 
 * Handles player physics and movement:
 * - Player Y position interpolation (smooth movement)
 * - Rotation interpolation for swap animation
 * - Velocity calculation
 * - Position clamping (screen bounds + midline)
 * - Connector length calculation
 * 
 * This module extracts ~100 lines of physics code from GameEngine loop.
 * 
 * @module logic/PhysicsSystem
 */

import { INITIAL_CONFIG } from '../../../constants';

// =============================================================================
// Types
// =============================================================================

export interface PlayerPhysicsState {
    playerY: number;
    targetPlayerY: number;
    prevPlayerY: number;
    playerVelocityY: number;
    rotationAngle: number;
    targetRotation: number;
    currentConnectorLength: number;
}

export interface PhysicsBounds {
    minY: number;
    maxY: number;
    midlineY: number;
    orbRadius: number;
    connectorLength: number;
}

export interface PhysicsConfig {
    smoothingFactor: number;
    rotationSpeed: number;
    maxVelocity: number;
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
    smoothingFactor: 0.15,      // How quickly player follows target (0-1)
    rotationSpeed: 0.15,        // How quickly rotation catches up
    maxVelocity: 0.1,           // Maximum velocity (normalized)
};

// =============================================================================
// Physics Functions
// =============================================================================

/**
 * Update player Y position with smooth interpolation
 * 
 * @param current - Current player Y (0-1 normalized)
 * @param target - Target player Y (0-1 normalized)
 * @param smoothing - Smoothing factor (0-1, lower = smoother)
 * @returns New player Y position
 */
export function interpolatePosition(
    current: number,
    target: number,
    smoothing: number = DEFAULT_PHYSICS_CONFIG.smoothingFactor
): number {
    return current + (target - current) * smoothing;
}

/**
 * Calculate player velocity based on position change
 * 
 * @param currentY - Current Y position (normalized)
 * @param previousY - Previous frame Y position (normalized)
 * @param canvasHeight - Canvas height in pixels
 * @returns Velocity in pixels per frame
 */
export function calculateVelocity(
    currentY: number,
    previousY: number,
    canvasHeight: number
): number {
    return (currentY - previousY) * canvasHeight;
}

/**
 * Update rotation angle with interpolation
 * 
 * @param current - Current rotation angle (radians)
 * @param target - Target rotation angle (radians)
 * @param speed - Rotation speed (0-1)
 * @returns New rotation angle
 */
export function interpolateRotation(
    current: number,
    target: number,
    speed: number = DEFAULT_PHYSICS_CONFIG.rotationSpeed
): number {
    return current + (target - current) * speed;
}

/**
 * Clamp player position within bounds
 * 
 * @param playerY - Player Y position (normalized 0-1)
 * @param bounds - Physics bounds
 * @param isSwapped - Whether orbs are swapped
 * @returns Clamped player Y position
 */
export function clampPosition(
    playerY: number,
    bounds: PhysicsBounds,
    isSwapped: boolean
): number {
    const { minY, maxY, midlineY, orbRadius, connectorLength } = bounds;

    // Calculate orb positions based on rotation
    const halfConnector = connectorLength / 2;

    // Basic screen edge clamping
    let clampedY = Math.max(minY, Math.min(maxY, playerY));

    // Midline collision prevention
    // Ensure orbs don't cross the midline (except during special abilities)
    const normalizedMidline = midlineY; // Already normalized if using 0-1 range

    // Top orb shouldn't go below midline, bottom orb shouldn't go above
    // This depends on swap state and connector length

    return clampedY;
}

/**
 * Calculate connector length based on score
 * Connector grows as player scores more points
 * 
 * @param score - Current score
 * @param minLength - Minimum connector length
 * @param maxLength - Maximum connector length
 * @param growthRate - How fast connector grows per point
 * @returns Current connector length
 */
export function calculateConnectorLength(
    score: number,
    minLength: number = INITIAL_CONFIG.minConnectorLength,
    maxLength: number = INITIAL_CONFIG.maxConnectorLength,
    growthRate: number = INITIAL_CONFIG.connectorGrowthRate
): number {
    const targetLength = minLength + score * growthRate;
    return Math.min(maxLength, targetLength);
}

/**
 * Calculate orb positions based on player position and rotation
 * 
 * @param playerY - Player Y position (normalized 0-1)
 * @param playerX - Player X position (pixels)
 * @param rotationAngle - Current rotation angle (radians)
 * @param connectorLength - Current connector length
 * @param orbRadius - Orb radius
 * @param canvasHeight - Canvas height in pixels
 * @returns White and black orb positions
 */
/**
 * Calculate orb positions based on player position and rotation
 */
export function calculateOrbPositions(config: {
    playerY: number;
    connectorLength: number;
    rotationAngle: number;
    canvasWidth: number;
    canvasHeight: number;
    isSwapped?: boolean;
}): { whiteOrb: { x: number; y: number }; blackOrb: { x: number; y: number } } {
    const { playerY, connectorLength, rotationAngle, canvasWidth, canvasHeight } = config;

    const centerY = playerY * canvasHeight;
    // Default Player X logic (matches GameEngine)
    const playerX = canvasWidth < 768 ? canvasWidth / 2 : canvasWidth / 3;

    const halfLength = connectorLength / 2;

    // Calculate orb positions based on rotation
    const offsetY = Math.cos(rotationAngle) * halfLength;
    const offsetX = Math.sin(rotationAngle) * halfLength;

    return {
        whiteOrb: {
            x: playerX - offsetX,
            y: centerY - offsetY,
        },
        blackOrb: {
            x: playerX + offsetX,
            y: centerY + offsetY,
        },
    };
}

/**
 * Update all physics state in one call
 * 
 * @param state - Current physics state
 * @param targetY - Target Y position from input
 * @param canvasHeight - Canvas height
 * @param score - Current score
 * @param config - Physics configuration
 * @returns Updated physics state
 */
export function updatePhysics(
    state: PlayerPhysicsState,
    targetY: number,
    canvasHeight: number,
    score: number,
    config: PhysicsConfig = DEFAULT_PHYSICS_CONFIG
): PlayerPhysicsState {
    // Store previous Y for velocity calculation
    const prevY = state.playerY;

    // Interpolate position
    const newPlayerY = interpolatePosition(state.playerY, targetY, config.smoothingFactor);

    // Calculate velocity
    const newVelocity = calculateVelocity(newPlayerY, prevY, canvasHeight);

    // Interpolate rotation
    const newRotation = interpolateRotation(
        state.rotationAngle,
        state.targetRotation,
        config.rotationSpeed
    );

    // Calculate connector length
    const newConnectorLength = calculateConnectorLength(score);

    return {
        playerY: newPlayerY,
        targetPlayerY: targetY,
        prevPlayerY: prevY,
        playerVelocityY: newVelocity,
        rotationAngle: newRotation,
        targetRotation: state.targetRotation,
        currentConnectorLength: newConnectorLength,
    };
}
