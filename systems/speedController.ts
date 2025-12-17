/**
 * Progressive Speed Controller for Campaign Mode
 * Campaign Chapter System - Logarithmic speed progression with climax boost
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { DistanceState } from './distanceTracker';

/**
 * Speed configuration state
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export interface SpeedConfig {
  baseSpeed: number;              // Fixed base speed (5 px/frame)
  logarithmicMultiplier: number;  // Current logarithmic multiplier
  climaxMultiplier: number;       // Climax zone multiplier (1.0 or 1.2)
  isInClimaxZone: boolean;        // Whether in final 20%
  climaxTransitionProgress: number; // 0-1 for smooth transition
  finalSpeed: number;             // Calculated final speed
}

/**
 * Speed controller configuration options
 */
export interface SpeedControllerOptions {
  baseSpeed?: number;             // Default: 5 (pixels per frame)
  climaxMultiplier?: number;      // Default: 1.2
  transitionDuration?: number;    // Default: 500ms
  logarithmicFactor?: number;     // Default: 0.3
  distanceDivisor?: number;       // Default: 50
}

import { INITIAL_CONFIG } from '../constants';

/**
 * Default configuration values
 * Requirements: 4.1, 4.2, 4.4
 */
const DEFAULT_BASE_SPEED = INITIAL_CONFIG.baseSpeed; // Use config value (mobile-friendly)
const DEFAULT_CLIMAX_MULTIPLIER = 1.2;  // 1.2x in climax zone (Requirement 4.4)
const DEFAULT_TRANSITION_DURATION = 500; // milliseconds
const DEFAULT_LOGARITHMIC_FACTOR = 0.3; // Standard logarithmic factor (Requirement 4.2)
const DEFAULT_DISTANCE_DIVISOR = 50;    // Standard distance divisor (Requirement 4.2)

/**
 * Speed Controller class for managing progressive speed in campaign mode
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class SpeedController {
  private baseSpeed: number;
  private climaxMultiplier: number;
  private transitionDuration: number;
  private logarithmicFactor: number;
  private distanceDivisor: number;
  private climaxTransitionProgress: number = 0;
  private wasInClimaxZone: boolean = false;

  /**
   * Create a new speed controller
   * Requirements: 4.1 - Base speed is 5 pixels per frame
   * @param options - Configuration options
   */
  constructor(options: SpeedControllerOptions = {}) {
    this.baseSpeed = options.baseSpeed ?? DEFAULT_BASE_SPEED;
    this.climaxMultiplier = options.climaxMultiplier ?? DEFAULT_CLIMAX_MULTIPLIER;
    this.transitionDuration = options.transitionDuration ?? DEFAULT_TRANSITION_DURATION;
    this.logarithmicFactor = options.logarithmicFactor ?? DEFAULT_LOGARITHMIC_FACTOR;
    this.distanceDivisor = options.distanceDivisor ?? DEFAULT_DISTANCE_DIVISOR;
  }

  /**
   * Initialize the controller for a new chapter
   * Requirements: 4.1, 4.5 - Speed resets to baseSpeed at chapter start
   * @param _chapterId - Chapter number (unused, kept for API compatibility)
   */
  initialize(_chapterId?: number): void {
    this.baseSpeed = INITIAL_CONFIG.baseSpeed; // Use config value
    this.climaxTransitionProgress = 0;
    this.wasInClimaxZone = false;
  }

  /**
   * Update the climax transition progress
   * Requirements: 3.3 - Smooth transition over 500ms
   * @param deltaTime - Time since last frame in milliseconds
   * @param isInClimaxZone - Whether currently in climax zone
   */
  update(deltaTime: number, isInClimaxZone: boolean): void {
    // Handle transition into climax zone
    if (isInClimaxZone && !this.wasInClimaxZone) {
      // Just entered climax zone, start transition
      this.climaxTransitionProgress = 0;
    }

    if (isInClimaxZone) {
      // Progress the transition (deltaTime is in ms, transitionDuration is in ms)
      this.climaxTransitionProgress = Math.min(
        1,
        this.climaxTransitionProgress + (deltaTime / this.transitionDuration)
      );
    } else {
      // Not in climax zone, reset transition
      this.climaxTransitionProgress = 0;
    }

    this.wasInClimaxZone = isInClimaxZone;
  }

  /**
   * Calculate the current speed based on distance state
   * Requirements: 4.2 - Logarithmic speed formula: baseSpeed × (1 + factor × log(1 + distance/50))
   * Requirements: 4.3 - Speed increases proportionally with distance
   * Requirements: 4.4 - 1.2x climax multiplier in final 20%
   * @param distanceState - Current distance tracking state
   * @param level - Level number (used to scale base speed and acceleration rate)
   * @returns Current speed value
   */
  calculateSpeed(distanceState: DistanceState, level?: number): number {
    const currentLevel = level ?? 1;
    
    // Scale BASE SPEED based on level - higher levels start faster
    // Level 1: 1.0x, Level 3: 1.1x, Level 5: 1.2x, Level 10: 1.45x, Level 20: 1.95x
    // Formula: baseSpeed × (1 + (level - 1) × 0.05)
    const baseSpeedMultiplier = 1 + (currentLevel - 1) * 0.05;
    const effectiveBaseSpeed = this.baseSpeed * baseSpeedMultiplier;
    
    // Scale ACCELERATION RATE based on level - higher levels accelerate faster
    // Level 1: 0.3, Level 3: 0.36, Level 5: 0.42, Level 10: 0.57, Level 20: 0.87
    // Formula: baseFactor × (1 + (level - 1) × 0.03)
    const accelMultiplier = 1 + (currentLevel - 1) * 0.03;
    const effectiveLogFactor = this.logarithmicFactor * accelMultiplier;
    
    // Calculate logarithmic multiplier based on current distance
    // Formula: effectiveBaseSpeed × (1 + effectiveLogFactor × log(1 + distance/50))
    // Requirements: 4.2
    const logFactor = Math.log(1 + distanceState.currentDistance / this.distanceDivisor);
    const logarithmicMultiplier = 1 + (effectiveLogFactor * logFactor);

    // Calculate climax multiplier with smooth transition
    // Requirements: 4.4 - 1.2x multiplier in final 20%
    let effectiveClimaxMultiplier = 1.0;
    if (distanceState.isInClimaxZone) {
      // Interpolate between 1.0 and climaxMultiplier based on transition progress
      effectiveClimaxMultiplier = 1.0 + 
        (this.climaxMultiplier - 1.0) * this.climaxTransitionProgress;
    }

    // Final speed = effectiveBaseSpeed × logarithmicMultiplier × climaxMultiplier
    return effectiveBaseSpeed * logarithmicMultiplier * effectiveClimaxMultiplier;
  }

  /**
   * Get the current speed configuration state
   * @param distanceState - Current distance tracking state
   * @param level - Level number (used to scale base speed and acceleration rate)
   * @returns SpeedConfig with all speed information
   */
  getConfig(distanceState: DistanceState, level?: number): SpeedConfig {
    const currentLevel = level ?? 1;
    
    // Scale base speed based on level
    const baseSpeedMultiplier = 1 + (currentLevel - 1) * 0.05;
    const effectiveBaseSpeed = this.baseSpeed * baseSpeedMultiplier;
    
    // Scale logarithmic factor based on level
    const accelMultiplier = 1 + (currentLevel - 1) * 0.03;
    const effectiveLogFactor = this.logarithmicFactor * accelMultiplier;
    
    // Calculate logarithmic multiplier
    const logFactor = Math.log(1 + distanceState.currentDistance / this.distanceDivisor);
    const logarithmicMultiplier = 1 + (effectiveLogFactor * logFactor);
    
    let effectiveClimaxMultiplier = 1.0;
    if (distanceState.isInClimaxZone) {
      effectiveClimaxMultiplier = 1.0 + 
        (this.climaxMultiplier - 1.0) * this.climaxTransitionProgress;
    }

    return {
      baseSpeed: effectiveBaseSpeed,
      logarithmicMultiplier,
      climaxMultiplier: effectiveClimaxMultiplier,
      isInClimaxZone: distanceState.isInClimaxZone,
      climaxTransitionProgress: this.climaxTransitionProgress,
      finalSpeed: effectiveBaseSpeed * logarithmicMultiplier * effectiveClimaxMultiplier,
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
 * Calculate logarithmic speed without climax multiplier
 * Pure function for testing Property 7: Speed Formula Correctness
 * Requirements: 4.2 - Formula: baseSpeed × (1 + 0.3 × log(1 + distance/50))
 * @param baseSpeed - Base speed (default: 5)
 * @param currentDistance - Current distance traveled
 * @returns Speed value using logarithmic formula
 */
export function calculateLogarithmicSpeed(
  baseSpeed: number,
  currentDistance: number
): number {
  const logFactor = Math.log(1 + currentDistance / DEFAULT_DISTANCE_DIVISOR);
  return baseSpeed * (1 + DEFAULT_LOGARITHMIC_FACTOR * logFactor);
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
 * @deprecated Use calculateLogarithmicSpeed instead
 * Kept for backward compatibility
 */
export function calculateProgressiveSpeed(
  baseSpeed: number,
  currentDistance: number,
  _targetDistance: number
): number {
  return calculateLogarithmicSpeed(baseSpeed, currentDistance);
}
