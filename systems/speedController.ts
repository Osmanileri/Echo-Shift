/**
 * Absolute-Distance Speed Controller for Campaign Mode
 * 
 * Core Principle: speed = f(absoluteMeters)
 * The same absolute distance always produces the same speed regardless of level.
 * Level difficulty comes from endurance — surviving longer at ever-increasing speed.
 *
 * Two-layer system:
 *   1. TARGET SPEED (ceiling): piecewise linear in √d
 *      target(d) = BASE_START + INITIAL_SLOPE × min(√d, √KNEE)
 *                + CRUISE_SLOPE × max(0, √d - √KNEE)
 *
 *   2. ACTUAL SPEED: starts at BASE_START and ramps linearly by
 *      ACCELERATION_RATE per second, clamped to never exceed target(d).
 *
 * This gives smooth acceleration feel — speed flows up rather than jumping.
 *
 * Target ceiling values (after slope reduction for gentler mid-chapter feel):
 *   0m    → 1.0   |  100m  → 2.2   |  400m  → 3.2
 *   900m  → 4.2   |  1600m → 5.2   |  2500m → 6.0
 * Distance pacing is preserved via DISTANCE_COMPENSATION (1.55×).
 *
 * Climax Zone (final 20% of each level): mild 1.15× boost for excitement.
 * Speed is hard-capped at MAX_ALLOWED_SPEED to prevent frame-skipping.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { SpeedZone, SpeedZoneState } from '../types';
import { DistanceState } from './distanceTracker';

/**
 * Speed System Constants - Game Balancing Configuration
 * Centralized for easy tuning during game balance iterations
 */
export const SPEED_CONSTANTS = {
  /** Base starting speed at 0 meters (pixels/frame) */
  BASE_START: 1.0,
  /** Initial slope in √d space (0 – KNEE_DISTANCE) — reduced from 0.2 for gentler mid-chapter ramp */
  INITIAL_SLOPE: 0.12,
  /** Cruise slope in √d space (KNEE_DISTANCE onwards) — reduced from 0.15 for gentler ramp */
  CRUISE_SLOPE: 0.10,
  /** Knee point: distance where slope transitions from initial to cruise */
  KNEE_DISTANCE: 100,
  /** √KNEE_DISTANCE — pre-computed for performance */
  KNEE_SQRT: 10,
  /** Distance compensation: multiplier for distance-tracker speed so level pacing stays unchanged
   *  despite slower visual speed ramp. Old curve ~3.34 at 150m, new ~2.42 → ratio ≈1.55 */
  DISTANCE_COMPENSATION: 1.70,
  /** Climax zone begins at this progress fraction (final 20% of level) */
  CLIMAX_ZONE_START: 0.80,
  /** Climax zone speed multiplier (15% boost near level end) */
  CLIMAX_MULTIPLIER: 1.15,
  /** Duration of climax transition in milliseconds */
  CLIMAX_TRANSITION_MS: 500,
  /** Maximum allowed speed to prevent frame-skipping (pixels/frame) */
  MAX_ALLOWED_SPEED: 6.5,
  /** Linear acceleration rate: speed increase per second — reduced proportionally with slopes */
  ACCELERATION_RATE: 0.05,
  // Legacy aliases kept for backward compat
  /** @deprecated — use INITIAL_SLOPE */
  GROWTH_RATE: 0.12,
  // Legacy aliases kept for backward compat in tests
  /** @deprecated kept for backward compat */
  LEVEL_INCREMENT_RATE: 0,
  /** @deprecated kept for backward compat */
  LEVEL_SPEED_CAP: 20,
  /** @deprecated use CLIMAX_MULTIPLIER */
  MAX_BONUS_RATIO: 0.7,
  /** @deprecated no longer used */
  WARMUP_START_FACTOR: 1.0,
  /** @deprecated no longer used */
  WARMUP_ZONE_END: 0,
  /** @deprecated no longer used */
  FLOW_LOG_DRIFT: 0,
} as const;

/**
 * Speed configuration state
 * Absolute-Distance Pacing — CRUISE / CLIMAX
 */
export interface SpeedConfig {
  baseSpeed: number;              // Raw distance-based speed (before climax)
  zone: SpeedZone;                // Current speed zone (CRUISE or CLIMAX)
  zoneMultiplier: number;         // 1.0 for CRUISE, up to 1.15 for CLIMAX
  climaxTransitionProgress: number; // 0-1 for smooth climax transition
  finalSpeed: number;             // Calculated final speed (capped)
  progressPercent: number;        // Current progress (0-100%)
  // Legacy fields kept for backward compatibility
  progressMultiplier: number;     // Maps to zoneMultiplier
  climaxMultiplier: number;       // Maps to climax transition multiplier
  isInClimaxZone: boolean;        // True when zone === 'CLIMAX'
}

/**
 * Speed controller configuration options
 */
export interface SpeedControllerOptions {
  baseStart?: number;             // Default: SPEED_CONSTANTS.BASE_START
  initialSlope?: number;          // Default: SPEED_CONSTANTS.INITIAL_SLOPE
  cruiseSlope?: number;           // Default: SPEED_CONSTANTS.CRUISE_SLOPE
  kneeDistance?: number;          // Default: SPEED_CONSTANTS.KNEE_DISTANCE
  accelerationRate?: number;      // Default: SPEED_CONSTANTS.ACCELERATION_RATE
  climaxMultiplier?: number;      // Default: SPEED_CONSTANTS.CLIMAX_MULTIPLIER
  transitionDuration?: number;    // Default: SPEED_CONSTANTS.CLIMAX_TRANSITION_MS
  maxAllowedSpeed?: number;       // Default: SPEED_CONSTANTS.MAX_ALLOWED_SPEED
  // Legacy — accepted but ignored
  baseSpeed?: number;
  growthRate?: number;
}

// ============================================================================
// Pure helper: Calculate speed from absolute distance (core formula)
// Two-slope piecewise linear in √d space:
//   0–100m (√d ≤ 10): slope 0.20 per √m  (initial ramp)
//   100m+  (√d > 10): slope 0.15 per √m  (cruise)
// ============================================================================
export function speedFromDistance(
  distance: number,
  baseStart: number = SPEED_CONSTANTS.BASE_START,
  initialSlope: number = SPEED_CONSTANTS.INITIAL_SLOPE,
  cruiseSlope: number = SPEED_CONSTANTS.CRUISE_SLOPE,
  kneeSqrt: number = SPEED_CONSTANTS.KNEE_SQRT,
): number {
  if (distance <= 0) return baseStart;
  const sqrtD = Math.sqrt(distance);
  return baseStart
    + initialSlope * Math.min(sqrtD, kneeSqrt)
    + cruiseSlope * Math.max(0, sqrtD - kneeSqrt);
}

// ============================================================================
// Pure helper: Determine current speed zone from progress (percentage within level)
// Two zones: CRUISE (normal) and CLIMAX (final 20%)
// ============================================================================
export function getSpeedZone(progress: number): SpeedZone {
  if (progress >= SPEED_CONSTANTS.CLIMAX_ZONE_START) return 'CLIMAX';
  return 'CRUISE';
}

/**
 * Absolute-Distance Speed Controller for Campaign Mode
 * speed = f(absoluteMeters) — same distance = same speed in every level.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export class SpeedController {
  private baseStart: number;
  private initialSlope: number;
  private cruiseSlope: number;
  private kneeSqrt: number;
  private accelerationRate: number;
  private climaxMultiplier: number;
  private transitionDuration: number;
  private maxAllowedSpeed: number;
  private climaxTransitionProgress: number = 0;
  private wasInClimaxZone: boolean = false;
  /** Linearly ramping speed — advances by ACCELERATION_RATE each second */
  private currentSpeed: number;

  /**
   * Create a new speed controller
   * @param options - Configuration options
   */
  constructor(options: SpeedControllerOptions = {}) {
    this.baseStart = options.baseStart ?? SPEED_CONSTANTS.BASE_START;
    this.initialSlope = options.initialSlope ?? SPEED_CONSTANTS.INITIAL_SLOPE;
    this.cruiseSlope = options.cruiseSlope ?? SPEED_CONSTANTS.CRUISE_SLOPE;
    this.kneeSqrt = Math.sqrt(options.kneeDistance ?? SPEED_CONSTANTS.KNEE_DISTANCE);
    this.accelerationRate = options.accelerationRate ?? SPEED_CONSTANTS.ACCELERATION_RATE;
    this.climaxMultiplier = options.climaxMultiplier ?? SPEED_CONSTANTS.CLIMAX_MULTIPLIER;
    this.transitionDuration = options.transitionDuration ?? SPEED_CONSTANTS.CLIMAX_TRANSITION_MS;
    this.maxAllowedSpeed = options.maxAllowedSpeed ?? SPEED_CONSTANTS.MAX_ALLOWED_SPEED;
    this.currentSpeed = this.baseStart;
  }

  /**
   * Initialize the controller for a new chapter / level
   * @param _chapterId - Chapter number (unused, kept for API compatibility)
   */
  initialize(_chapterId?: number): void {
    this.climaxTransitionProgress = 0;
    this.wasInClimaxZone = false;
    this.currentSpeed = this.baseStart;
  }

  /**
   * Update speed ramp and climax transition (called every frame).
   * - Advances currentSpeed linearly by ACCELERATION_RATE per second.
   * - Manages climax zone transition progress.
   * @param deltaTime - Time since last frame in milliseconds
   * @param isInClimaxZone - Whether currently in climax zone
   */
  update(deltaTime: number, isInClimaxZone: boolean): void {
    // Linear speed ramp: increase currentSpeed by acceleration rate
    const deltaSec = deltaTime / 1000;
    this.currentSpeed += this.accelerationRate * deltaSec;

    // Climax transition
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
   * Calculate the current speed.
   *
   * The linear ramp (currentSpeed) is clamped to never exceed
   * the target ceiling from speedFromDistance(d).
   * In CLIMAX zone: speed × 1.15 (smooth transition).
   * Hard-capped at MAX_ALLOWED_SPEED.
   *
   * @param distanceState - Current distance tracking state
   * @param _level - Level number (IGNORED — speed is distance-based)
   * @returns Current speed value
   */
  calculateSpeed(distanceState: DistanceState, _level?: number): number {
    // Target ceiling from piecewise curve
    const targetSpeed = speedFromDistance(
      distanceState.currentDistance,
      this.baseStart,
      this.initialSlope,
      this.cruiseSlope,
      this.kneeSqrt,
    );

    // Actual speed = linear ramp, clamped to ceiling
    let speed = Math.min(this.currentSpeed, targetSpeed);

    // Climax boost: smooth transition to 1.15× in the final 20% of the level
    if (distanceState.isInClimaxZone) {
      const effectiveClimaxMultiplier = 1.0 +
        (this.climaxMultiplier - 1.0) * this.climaxTransitionProgress;
      speed *= effectiveClimaxMultiplier;
    }

    return Math.min(speed, this.maxAllowedSpeed);
  }

  /**
   * Get the full speed zone state (for VFX / HUD consumption)
   * @param distanceState - Current distance tracking state
   * @param _level - Level number (ignored)
   * @returns SpeedZoneState with zone details
   */
  getZoneState(distanceState: DistanceState, _level?: number): SpeedZoneState {
    const progress = distanceState.targetDistance > 0
      ? Math.min(distanceState.currentDistance / distanceState.targetDistance, 1.0)
      : 0;

    const zone = getSpeedZone(progress);
    const rawSpeed = speedFromDistance(
      distanceState.currentDistance,
      this.baseStart,
      this.initialSlope,
      this.cruiseSlope,
      this.kneeSqrt,
    );
    const finalSpeed = this.calculateSpeed(distanceState);

    let zoneProgress: number;
    let zoneMultiplier: number;

    if (zone === 'CLIMAX') {
      zoneProgress = (progress - SPEED_CONSTANTS.CLIMAX_ZONE_START) /
        (1 - SPEED_CONSTANTS.CLIMAX_ZONE_START);
      zoneMultiplier = 1.0 + (this.climaxMultiplier - 1.0) * this.climaxTransitionProgress;
    } else {
      // CRUISE zone: progress 0 → CLIMAX_ZONE_START maps to 0 → 1
      zoneProgress = SPEED_CONSTANTS.CLIMAX_ZONE_START > 0
        ? progress / SPEED_CONSTANTS.CLIMAX_ZONE_START
        : 0;
      zoneMultiplier = 1.0;
    }

    return {
      zone,
      zoneProgress,
      rawSpeed,
      finalSpeed,
      zoneMultiplier,
    };
  }

  /**
   * Get the current speed configuration state (backward-compatible)
   * @param distanceState - Current distance tracking state
   * @param _level - Level number (ignored)
   * @returns SpeedConfig with all speed information
   */
  getConfig(distanceState: DistanceState, _level?: number): SpeedConfig {
    const progress = distanceState.targetDistance > 0
      ? Math.min(distanceState.currentDistance / distanceState.targetDistance, 1.0)
      : 0;

    const zone = getSpeedZone(progress);
    const rawSpeed = speedFromDistance(
      distanceState.currentDistance,
      this.baseStart,
      this.initialSlope,
      this.cruiseSlope,
      this.kneeSqrt,
    );
    const zoneState = this.getZoneState(distanceState);
    const finalSpeed = this.calculateSpeed(distanceState);

    let effectiveClimaxMultiplier = 1.0;
    if (distanceState.isInClimaxZone) {
      effectiveClimaxMultiplier = 1.0 +
        (this.climaxMultiplier - 1.0) * this.climaxTransitionProgress;
    }

    return {
      baseSpeed: rawSpeed,
      zone,
      zoneMultiplier: zoneState.zoneMultiplier,
      climaxTransitionProgress: this.climaxTransitionProgress,
      finalSpeed,
      progressPercent: progress * 100,
      // Legacy compat
      progressMultiplier: zoneState.zoneMultiplier,
      climaxMultiplier: effectiveClimaxMultiplier,
      isInClimaxZone: distanceState.isInClimaxZone,
    };
  }

  /**
   * Get the base starting speed
   * @returns Base start speed value
   */
  getBaseSpeed(): number {
    return this.baseStart;
  }

  /**
   * Reset the controller state
   */
  reset(): void {
    this.climaxTransitionProgress = 0;
    this.wasInClimaxZone = false;
    this.currentSpeed = this.baseStart;
  }

  /**
   * Set the current speed (useful after restore / rewind)
   * @param speed - New speed value
   */
  setCurrentSpeed(speed: number): void {
    this.currentSpeed = speed;
  }

  /**
   * Get the current ramped speed (for diagnostics / testing)
   * @returns Current linear-ramp speed value
   */
  getCurrentSpeed(): number {
    return this.currentSpeed;
  }
}

/**
 * Create a speed controller for a chapter
 * Requirements: 4.1, 4.5 - Speed resets at chapter start
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
 * Calculate absolute-distance speed for a given position.
 * Pure function for testing — mirrors SpeedController.calculateSpeed without class state.
 *
 * @param currentMeters - Current distance traveled (absolute)
 * @param chapterTarget - Chapter's target distance (used only for climax zone detection)
 * @param _baseSpeed - IGNORED (kept for backward compat signature)
 * @returns Speed value using absolute-distance formula
 */
export function calculateDynamicSpeed(
  currentMeters: number,
  chapterTarget: number,
  _baseSpeed?: number
): number {
  let speed = speedFromDistance(currentMeters);

  // Apply climax multiplier if in final 20%
  if (chapterTarget > 0) {
    const progress = currentMeters / chapterTarget;
    if (progress >= SPEED_CONSTANTS.CLIMAX_ZONE_START) {
      speed *= SPEED_CONSTANTS.CLIMAX_MULTIPLIER;
    }
  }

  return Math.min(speed, SPEED_CONSTANTS.MAX_ALLOWED_SPEED);
}

/**
 * Apply climax multiplier to a speed value.
 * Pure function for testing.
 * @param speed - Speed value
 * @param isInClimaxZone - Whether in climax zone
 * @param transitionProgress - 0-1 transition progress (1 = fully transitioned)
 * @returns Final speed with climax multiplier
 */
export function applyClimaxMultiplier(
  speed: number,
  isInClimaxZone: boolean,
  transitionProgress: number = 1
): number {
  if (!isInClimaxZone) return speed;
  const effectiveMultiplier = 1.0 + (SPEED_CONSTANTS.CLIMAX_MULTIPLIER - 1.0) * transitionProgress;
  return speed * effectiveMultiplier;
}

/**
 * Check if current distance is in climax zone (final 20% of level)
 * @param currentDistance - Current distance traveled
 * @param targetDistance - Target distance for the chapter
 * @returns True if in climax zone
 */
export function isInClimaxZone(
  currentDistance: number,
  targetDistance: number
): boolean {
  if (targetDistance <= 0) return false;
  const progress = currentDistance / targetDistance;
  return progress >= SPEED_CONSTANTS.CLIMAX_ZONE_START;
}

/**
 * @deprecated Use calculateDynamicSpeed instead
 * Kept for backward compatibility
 */
export function calculateProgressiveSpeed(
  _baseSpeed: number,
  currentDistance: number,
  targetDistance: number
): number {
  return calculateDynamicSpeed(currentDistance, targetDistance);
}
