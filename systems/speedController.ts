/**
 * Progressive Speed Controller for Campaign Mode
 * Jetpack Joyride Style - Square root-based asymptotic acceleration
 * Formula: v = v_min + (v_max - v_min) × √(progress)
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { INITIAL_CONFIG } from '../constants';
import { DistanceState } from './distanceTracker';

/**
 * Speed System Constants - Game Balancing Configuration
 * Centralized for easy tuning during game balance iterations
 */
export const SPEED_CONSTANTS = {
  /** Speed bonus percentage per level (5% = 0.05) */
  LEVEL_INCREMENT_RATE: 0.05,
  /** Maximum speed bonus ratio at target distance (50% = 0.5) */
  MAX_BONUS_RATIO: 0.5,
  /** Speed multiplier in climax zone (final 20%) */
  CLIMAX_MULTIPLIER: 1.2,
  /** Progress threshold for climax zone (80% = 0.8) */
  CLIMAX_ZONE_START: 0.8,
  /** Duration of climax transition in milliseconds */
  CLIMAX_TRANSITION_MS: 500,
  /** Maximum allowed speed to prevent frame-skipping (pixels/frame) */
  MAX_ALLOWED_SPEED: 15,
} as const;

/**
 * Speed configuration state
 * Jetpack Joyride Style - Square root-based progression
 */
export interface SpeedConfig {
  baseSpeed: number;              // Fixed base speed at chapter start
  sqrtMultiplier: number;         // Current sqrt-based multiplier (1.0 - 1.5)
  climaxMultiplier: number;       // Climax zone multiplier (1.0 or 1.2)
  isInClimaxZone: boolean;        // Whether in final 20%
  climaxTransitionProgress: number; // 0-1 for smooth transition
  finalSpeed: number;             // Calculated final speed
  progressPercent: number;        // Current progress (0-100%)
}

/**
 * Speed controller configuration options
 */
export interface SpeedControllerOptions {
  baseSpeed?: number;             // Default: from INITIAL_CONFIG
  climaxMultiplier?: number;      // Default: SPEED_CONSTANTS.CLIMAX_MULTIPLIER
  transitionDuration?: number;    // Default: SPEED_CONSTANTS.CLIMAX_TRANSITION_MS
  maxAllowedSpeed?: number;       // Default: SPEED_CONSTANTS.MAX_ALLOWED_SPEED
}

/**
 * Default configuration values (for backward compatibility)
 */
const DEFAULT_BASE_SPEED = INITIAL_CONFIG.baseSpeed;
const DEFAULT_CLIMAX_MULTIPLIER = SPEED_CONSTANTS.CLIMAX_MULTIPLIER;
const DEFAULT_TRANSITION_DURATION = SPEED_CONSTANTS.CLIMAX_TRANSITION_MS;
const DEFAULT_DISTANCE_DIVISOR = 50;

/**
 * Speed Controller class for managing progressive speed in campaign mode
 * Jetpack Joyride Style - DRY refactored version
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class SpeedController {
  private baseSpeed: number;
  private climaxMultiplier: number;
  private transitionDuration: number;
  private maxAllowedSpeed: number;
  private climaxTransitionProgress: number = 0;
  private wasInClimaxZone: boolean = false;

  /**
   * Create a new speed controller
   * @param options - Configuration options
   */
  constructor(options: SpeedControllerOptions = {}) {
    this.baseSpeed = options.baseSpeed ?? DEFAULT_BASE_SPEED;
    this.climaxMultiplier = options.climaxMultiplier ?? DEFAULT_CLIMAX_MULTIPLIER;
    this.transitionDuration = options.transitionDuration ?? DEFAULT_TRANSITION_DURATION;
    this.maxAllowedSpeed = options.maxAllowedSpeed ?? SPEED_CONSTANTS.MAX_ALLOWED_SPEED;
  }

  /**
   * DRY Helper: Get effective base speed scaled by level
   * Level 1: 1.0x, Level 5: 1.2x, Level 10: 1.45x, Level 20: 1.95x
   * @param level - Current level number (default: 1)
   * @returns Scaled base speed
   */
  private getEffectiveBaseSpeed(level: number = 1): number {
    const multiplier = 1 + (level - 1) * SPEED_CONSTANTS.LEVEL_INCREMENT_RATE;
    return this.baseSpeed * multiplier;
  }

  /**
   * Initialize the controller for a new chapter
   * @param _chapterId - Chapter number (unused, kept for API compatibility)
   */
  initialize(_chapterId?: number): void {
    this.baseSpeed = INITIAL_CONFIG.baseSpeed;
    this.climaxTransitionProgress = 0;
    this.wasInClimaxZone = false;
  }

  /**
   * Update the climax transition progress (time-based smooth transition)
   * @param deltaTime - Time since last frame in milliseconds
   * @param isInClimaxZone - Whether currently in climax zone
   */
  update(deltaTime: number, isInClimaxZone: boolean): void {
    if (isInClimaxZone && !this.wasInClimaxZone) {
      this.climaxTransitionProgress = 0;
    }

    if (isInClimaxZone) {
      this.climaxTransitionProgress = Math.min(
        1,
        this.climaxTransitionProgress + (deltaTime / this.transitionDuration)
      );
    } else {
      this.climaxTransitionProgress = 0;
    }

    this.wasInClimaxZone = isInClimaxZone;
  }

  /**
   * Calculate the current speed based on distance state
   * Jetpack Joyride Style: v = baseSpeed + (maxBonus × √progress)
   * Includes speed cap to prevent frame-skipping at high levels
   * 
   * @param distanceState - Current distance tracking state
   * @param level - Level number (scales base speed and max bonus)
   * @returns Current speed value (capped at MAX_ALLOWED_SPEED)
   */
  calculateSpeed(distanceState: DistanceState, level?: number): number {
    // DRY: Use helper for effective base speed
    const effectiveBaseSpeed = this.getEffectiveBaseSpeed(level ?? 1);

    // Calculate progress (0.0 - 1.0), guard against division by zero
    const progress = distanceState.targetDistance > 0
      ? Math.min(distanceState.currentDistance / distanceState.targetDistance, 1.0)
      : 0;

    // Jetpack Joyride Formula: maxBonus from constants
    const maxBonus = effectiveBaseSpeed * SPEED_CONSTANTS.MAX_BONUS_RATIO;

    // Square root-based acceleration: fast initial, gradual stabilization
    const currentBonus = maxBonus * Math.sqrt(progress);
    const sqrtSpeed = effectiveBaseSpeed + currentBonus;

    // Apply climax multiplier with smooth transition
    let effectiveClimaxMultiplier = 1.0;
    if (distanceState.isInClimaxZone) {
      effectiveClimaxMultiplier = 1.0 +
        (this.climaxMultiplier - 1.0) * this.climaxTransitionProgress;
    }

    // Calculate final speed with speed cap to prevent frame-skipping
    const finalSpeed = sqrtSpeed * effectiveClimaxMultiplier;
    return Math.min(finalSpeed, this.maxAllowedSpeed);
  }

  /**
   * Get the current speed configuration state
   * Jetpack Joyride Style - Returns sqrt-based speed info
   * @param distanceState - Current distance tracking state
   * @param level - Level number (used to scale base speed)
   * @returns SpeedConfig with all speed information
   */
  getConfig(distanceState: DistanceState, level?: number): SpeedConfig {
    const currentLevel = level ?? 1;

    // Scale base speed based on level
    const baseSpeedMultiplier = 1 + (currentLevel - 1) * 0.05;
    const effectiveBaseSpeed = this.baseSpeed * baseSpeedMultiplier;

    // Calculate progress (0.0 - 1.0)
    const progress = distanceState.targetDistance > 0
      ? Math.min(distanceState.currentDistance / distanceState.targetDistance, 1.0)
      : 0;

    // Sqrt multiplier: 1.0 at start, up to 1.5 at target (50% max bonus)
    const sqrtMultiplier = 1 + 0.5 * Math.sqrt(progress);

    let effectiveClimaxMultiplier = 1.0;
    if (distanceState.isInClimaxZone) {
      effectiveClimaxMultiplier = 1.0 +
        (this.climaxMultiplier - 1.0) * this.climaxTransitionProgress;
    }

    return {
      baseSpeed: effectiveBaseSpeed,
      sqrtMultiplier,
      climaxMultiplier: effectiveClimaxMultiplier,
      isInClimaxZone: distanceState.isInClimaxZone,
      climaxTransitionProgress: this.climaxTransitionProgress,
      finalSpeed: effectiveBaseSpeed * sqrtMultiplier * effectiveClimaxMultiplier,
      progressPercent: progress * 100,
    };
  }

  /**
   * Get the base speed for the current level
   * @returns Base speed value
   */
  getBaseSpeed(): number {
    return this.baseSpeed;
  }

  /**
   * Reset the controller state
   */
  reset(): void {
    this.climaxTransitionProgress = 0;
    this.wasInClimaxZone = false;
  }
}

/**
 * Create a speed controller for a chapter
 * Requirements: 4.1, 4.5 - Speed resets to baseSpeed (5) at chapter start
 * @param _chapterId - Chapter number (unused, kept for API compatibility)
 * @param options - Optional configuration
 * @returns SpeedController instance
 */
export function createSpeedController(
  _chapterId?: number,
  options?: SpeedControllerOptions
): SpeedController {
  const controller = new SpeedController(options);
  controller.initialize();
  return controller;
}

/**
 * Calculate dynamic speed using Jetpack Joyride sqrt formula
 * Pure function for testing - used by SpeedController.calculateSpeed internally
 * Formula: v = baseSpeed + (maxBonus × √(progress))
 * @param currentMeters - Current distance traveled
 * @param chapterTarget - Chapter's target distance
 * @param baseSpeed - Base speed at chapter start
 * @returns Speed value using sqrt formula
 */
export function calculateDynamicSpeed(
  currentMeters: number,
  chapterTarget: number,
  baseSpeed: number
): number {
  // 1. Calculate progress percentage (0.0 - 1.0)
  const progress = chapterTarget > 0
    ? Math.min(currentMeters / chapterTarget, 1.0)
    : 0;

  // 2. Maximum speed bonus (50% of base speed)
  const maxBonus = baseSpeed * 0.5;

  // 3. Square root-based acceleration (Jetpack Joyride feel)
  const currentBonus = maxBonus * Math.sqrt(progress);

  return baseSpeed + currentBonus;
}

/**
 * Calculate speed with climax multiplier applied
 * Pure function for testing Property 8: Climax Speed Multiplier
 * Requirements: 4.4 - 1.2x multiplier in final 20%
 * @param speed - Speed after logarithmic calculation
 * @param isInClimaxZone - Whether in final 20%
 * @param transitionProgress - 0-1 transition progress (1 = fully transitioned)
 * @returns Final speed with climax multiplier
 */
export function applyClimaxMultiplier(
  speed: number,
  isInClimaxZone: boolean,
  transitionProgress: number = 1
): number {
  if (!isInClimaxZone) return speed;
  const effectiveMultiplier = 1.0 + (DEFAULT_CLIMAX_MULTIPLIER - 1.0) * transitionProgress;
  return speed * effectiveMultiplier;
}

/**
 * Check if current distance is in climax zone (final 20%)
 * Requirements: 4.4 - Climax zone is final 20% of target distance
 * @param currentDistance - Current distance traveled
 * @param targetDistance - Target distance for the chapter
 * @returns True if in climax zone
 */
export function isInClimaxZone(
  currentDistance: number,
  targetDistance: number
): boolean {
  if (targetDistance <= 0) return false;
  const progressPercent = (currentDistance / targetDistance) * 100;
  return progressPercent >= 80;
}

/**
 * @deprecated Use calculateDynamicSpeed instead
 * Kept for backward compatibility
 */
export function calculateProgressiveSpeed(
  baseSpeed: number,
  currentDistance: number,
  targetDistance: number
): number {
  return calculateDynamicSpeed(currentDistance, targetDistance, baseSpeed);
}
