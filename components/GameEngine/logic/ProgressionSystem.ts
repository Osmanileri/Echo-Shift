/**
 * ProgressionSystem
 * 
 * Handles game progression, difficulty scaling, and speed management:
 * - Speed calculation based on elapsed time/score
 * - Distance tracking
 * - Difficulty scaling factors
 * 
 * This module extracts logic for game pacing and difficulty curve.
 * 
 * @module logic/ProgressionSystem
 */

import { INITIAL_CONFIG } from '../../../constants';

// =============================================================================
// Types
// =============================================================================

export interface ProgressionState {
    baseSpeed: number;      // Current base speed
    currentSpeed: number;   // Current active speed (with multipliers)
    totalDistance: number;  // Total distance traveled
    startTime: number;      // Game start time
    elapsedTime: number;    // Time elapsed in game
    difficultyMultiplier: number; // Current difficulty multiplier (1.0+)
}

export interface SpeedMultipliers {
    dash: number;           // Phase dash multiplier
    slowMotion: number;     // Slow motion multiplier
    construct: number;      // Construct system multiplier
    quantumLock: number;    // Quantum lock multiplier
    overdrive: number;      // Overdrive (SHIFT) multiplier
}

// =============================================================================
// Speed Calculation
// =============================================================================

/**
 * Calculate the base game speed based on elapsed time
 * Implements a logarithmic difficulty curve that caps at a maximum speed
 * 
 * @param elapsedTime - Time elapsed in milliseconds
 * @returns Calculated base speed
 */
export function calculateBaseSpeed(elapsedTime: number): number {
    // Speed increases logarithmically with time
    // Formula: Base + SpeedUpFactor * log(1 + time/TimeScale)
    const timeInSeconds = elapsedTime / 1000;

    // Initial speed from config
    const minSpeed = INITIAL_CONFIG.baseSpeed;
    const maxSpeed = INITIAL_CONFIG.maxSpeed || 15;

    // Increase speed by 0.01 every 6 seconds (from config)
    // This is a simplified curve matching the linear increase in loop

    return Math.min(maxSpeed, minSpeed + (elapsedTime / INITIAL_CONFIG.speedIncreaseInterval) * INITIAL_CONFIG.speedIncreaseAmount);
}

/**
 * Calculate final current speed applying all active multipliers
 * 
 * @param baseSpeed - Current base speed
 * @param multipliers - Active speed multipliers
 * @param isPaused - Whether game is paused
 * @returns Final speed in pixels per frame
 */
export function calculateCurrentSpeed(
    baseSpeed: number,
    multipliers: SpeedMultipliers,
    isPaused: boolean
): number {
    if (isPaused) return 0;

    let speed = baseSpeed;

    // Apply multipliers
    // 1. Slow Motion (reduces speed)
    if (multipliers.slowMotion !== 1.0) {
        speed *= multipliers.slowMotion;
    }

    // 2. Dash / Boosts (increases speed)
    if (multipliers.dash > 1.0) {
        speed *= multipliers.dash;
    }

    // 3. Construct / Mode specific
    if (multipliers.construct !== 1.0) {
        speed *= multipliers.construct;
    }

    // 4. Quantum Lock (can pause or slow)
    if (multipliers.quantumLock !== 1.0) {
        speed *= multipliers.quantumLock;
    }

    // 5. Overdrive (active speed boost)
    if (multipliers.overdrive > 1.0) {
        speed *= multipliers.overdrive;
    }

    return speed;
}

// =============================================================================
// Distance Tracking
// =============================================================================

/**
 * Update total distance traveled
 * 
 * @param currentDistance - Current total distance
 * @param speed - Current speed (pixels/frame)
 * @returns New total distance
 */
export function updateDistance(
    currentDistance: number,
    speed: number
): number {
    return currentDistance + speed;
}

/**
 * Check if a distance milestone has been reached
 * 
 * @param prevDistance - Previous frame distance
 * @param currentDistance - Current distance
 * @param milestone - Milestone interval (e.g. every 1000 pixels)
 * @returns True if milestone crossed this frame
 */
export function checkDistanceMilestone(
    prevDistance: number,
    currentDistance: number,
    milestone: number
): boolean {
    return Math.floor(prevDistance / milestone) < Math.floor(currentDistance / milestone);
}

// =============================================================================
// Difficulty Scaling
// =============================================================================

/**
 * Calculate current difficulty multiplier
 * Used for spawn rates, gap sizes, etc.
 * 
 * @param speed - Current base speed
 * @param initialSpeed - Initial game speed
 * @returns Difficulty multiplier (1.0 = base difficulty)
 */
export function calculateDifficultyMultiplier(
    speed: number,
    initialSpeed: number = INITIAL_CONFIG.baseSpeed
): number {
    return speed / initialSpeed;
}

/**
 * Calculate visual intensity based on speed
 * Used for background effects, particles, etc.
 * 
 * @param speed - Current speed
 * @param maxSpeed - Max possible speed
 * @returns Intensity normalized 0-1
 */
export function calculateSpeedIntensity(
    speed: number,
    maxSpeed: number = INITIAL_CONFIG.maxSpeed || 15
): number {
    return Math.min(1.0, speed / maxSpeed);
}
