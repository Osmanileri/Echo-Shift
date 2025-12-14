/**
 * Progressive Speed Controller for Campaign Mode
 * Campaign Update v2.5 - Progressive speed with climax boost
 * Requirements: 3.1, 3.2, 3.3
 */

import { calculateBaseSpeed } from '../data/levels';
import { DistanceState } from './distanceTracker';

/**
 * Speed configuration state
 * Requirements: 3.1, 3.2, 3.3
 */
export interface SpeedConfig {
  baseSpeed: number;              // Level's base speed
  progressiveMultiplier: number;  // Current progressive multiplier (1.0 - 1.3)
  climaxMultiplier: number;       // Climax zone multiplier (1.0 or 1.2)
  isInClimaxZone: boolean;        // Whether in final 20%
  climaxTransitionProgress: number; // 0-1 for smooth transition
  finalSpeed: number;             // Calculated final speed
}

/**
 * Speed controller configuration options
 */
export interface SpeedControllerOptions {
  climaxMultiplier?: number;      // Default: 1.2
  transitionDuration?: number;    // Default: 500ms
  maxProgressiveMultiplier?: number; // Default: 0.3 (30% increase at 100%)
}

/**
 * Default configuration values
 */
const DEFAULT_CLIMAX_MULTIPLIER = 1.2;
const DEFAULT_TRANSITION_DURATION = 500; // milliseconds
const DEFAULT_MAX_PROGRESSIVE_MULTIPLIER = 0.3;

/**
 * Speed Controller class for managing progressive speed in campaign mode
 * Requirements: 3.1, 3.2, 3.3
 */
export class SpeedController {
  private baseSpeed: number = 0;
  private climaxMultiplier: number;
  private transitionDuration: number;
  private maxProgressiveMultiplier: number;
  private climaxTransitionProgress: number = 0;
  private wasInClimaxZone: boolean = false;

  /**
   * Create a new speed controller
   * @param options - Configuration options
   */
  constructor(options: SpeedControllerOptions = {}) {
    this.climaxMultiplier = options.climaxMultiplier ?? DEFAULT_CLIMAX_MULTIPLIER;
    this.transitionDuration = options.transitionDuration ?? DEFAULT_TRANSITION_DURATION;
    this.maxProgressiveMultiplier = options.maxProgressiveMultiplier ?? DEFAULT_MAX_PROGRESSIVE_MULTIPLIER;
  }

  /**
   * Initialize the controller for a specific level
   * @param level - Level number (1-100)
   */
  initialize(level: number): void {
    this.baseSpeed = calculateBaseSpeed(level);
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
   * Requirements: 3.1 - Progressive speed formula
   * Requirements: 3.2 - Climax speed multiplier
   * @param distanceState - Current distance tracking state
   * @param level - Level number (used if baseSpeed not initialized)
   * @returns Current speed value
   */
  calculateSpeed(distanceState: DistanceState, level: number): number {
    // Ensure baseSpeed is set
    if (this.baseSpeed === 0) {
      this.baseSpeed = calculateBaseSpeed(level);
    }

    // Calculate progressive multiplier based on distance progress
    // Formula: baseSpeed * (1 + (currentDistance / targetDistance) * 0.3)
    // Requirements: 3.1
    const progressRatio = distanceState.targetDistance > 0
      ? distanceState.currentDistance / distanceState.targetDistance
      : 0;
    
    const progressiveMultiplier = 1 + (progressRatio * this.maxProgressiveMultiplier);

    // Calculate climax multiplier with smooth transition
    // Requirements: 3.2, 3.3
    let effectiveClimaxMultiplier = 1.0;
    if (distanceState.isInClimaxZone) {
      // Interpolate between 1.0 and climaxMultiplier based on transition progress
      effectiveClimaxMultiplier = 1.0 + 
        (this.climaxMultiplier - 1.0) * this.climaxTransitionProgress;
    }

    // Final speed = baseSpeed * progressiveMultiplier * climaxMultiplier
    return this.baseSpeed * progressiveMultiplier * effectiveClimaxMultiplier;
  }

  /**
   * Get the current speed configuration state
   * @param distanceState - Current distance tracking state
   * @returns SpeedConfig with all speed information
   */
  getConfig(distanceState: DistanceState): SpeedConfig {
    const progressRatio = distanceState.targetDistance > 0
      ? distanceState.currentDistance / distanceState.targetDistance
      : 0;
    
    const progressiveMultiplier = 1 + (progressRatio * this.maxProgressiveMultiplier);
    
    let effectiveClimaxMultiplier = 1.0;
    if (distanceState.isInClimaxZone) {
      effectiveClimaxMultiplier = 1.0 + 
        (this.climaxMultiplier - 1.0) * this.climaxTransitionProgress;
    }

    return {
      baseSpeed: this.baseSpeed,
      progressiveMultiplier,
      climaxMultiplier: effectiveClimaxMultiplier,
      isInClimaxZone: distanceState.isInClimaxZone,
      climaxTransitionProgress: this.climaxTransitionProgress,
      finalSpeed: this.baseSpeed * progressiveMultiplier * effectiveClimaxMultiplier,
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
 * Create a speed controller for a specific level
 * @param level - Level number (1-100)
 * @param options - Optional configuration
 * @returns SpeedController instance
 */
export function createSpeedController(
  level: number,
  options?: SpeedControllerOptions
): SpeedController {
  const controller = new SpeedController(options);
  controller.initialize(level);
  return controller;
}

/**
 * Calculate progressive speed without climax multiplier
 * Pure function for testing Property 5
 * Requirements: 3.1
 * @param baseSpeed - Base speed for the level
 * @param currentDistance - Current distance traveled
 * @param targetDistance - Target distance for the level
 * @returns Progressive speed value
 */
export function calculateProgressiveSpeed(
  baseSpeed: number,
  currentDistance: number,
  targetDistance: number
): number {
  if (targetDistance <= 0) return baseSpeed;
  const progressRatio = currentDistance / targetDistance;
  return baseSpeed * (1 + progressRatio * DEFAULT_MAX_PROGRESSIVE_MULTIPLIER);
}

/**
 * Calculate speed with climax multiplier applied
 * Pure function for testing Property 7
 * Requirements: 3.2
 * @param progressiveSpeed - Speed after progressive calculation
 * @param isInClimaxZone - Whether in final 20%
 * @param transitionProgress - 0-1 transition progress (1 = fully transitioned)
 * @returns Final speed with climax multiplier
 */
export function applyClimaxMultiplier(
  progressiveSpeed: number,
  isInClimaxZone: boolean,
  transitionProgress: number = 1
): number {
  if (!isInClimaxZone) return progressiveSpeed;
  const effectiveMultiplier = 1.0 + (DEFAULT_CLIMAX_MULTIPLIER - 1.0) * transitionProgress;
  return progressiveSpeed * effectiveMultiplier;
}
