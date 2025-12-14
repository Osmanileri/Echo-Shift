/**
 * Distance Tracking System for Campaign Mode
 * Campaign Update v2.5 - Distance-based progression
 * Requirements: 2.2, 2.3, 2.4, 3.2
 */

/**
 * Distance state interface
 * Requirements: 2.2, 2.3, 3.2
 */
export interface DistanceState {
  currentDistance: number;      // Current distance in meters
  targetDistance: number;       // Level's target distance
  progressPercent: number;      // 0-100 progress percentage
  isInClimaxZone: boolean;      // True when in final 20%
  isNearFinish: boolean;        // True when within 50m of target
}

/**
 * Distance tracker configuration
 */
export interface DistanceTrackerConfig {
  targetDistance: number;
  climaxZoneThreshold?: number;  // Default: 0.8 (80% = final 20%)
  nearFinishDistance?: number;   // Default: 50 meters
}

/**
 * Distance Tracker class for tracking player progress through a level
 * Requirements: 2.2, 2.3, 2.4, 3.2
 */
export class DistanceTracker {
  private currentDistance: number = 0;
  private targetDistance: number;
  private climaxZoneThreshold: number;
  private nearFinishDistance: number;

  /**
   * Create a new distance tracker
   * @param config - Configuration for the tracker
   */
  constructor(config: DistanceTrackerConfig) {
    this.targetDistance = config.targetDistance;
    this.climaxZoneThreshold = config.climaxZoneThreshold ?? 0.8;
    this.nearFinishDistance = config.nearFinishDistance ?? 50;
  }

  /**
   * Update distance based on time and speed
   * Requirements: 2.3 - Track Current_Distance traveled in meters
   * @param deltaTime - Time since last frame in seconds
   * @param speed - Current speed in meters per second
   */
  update(deltaTime: number, speed: number): void {
    // Guard against invalid inputs
    if (deltaTime <= 0 || isNaN(deltaTime)) {
      return;
    }
    if (speed < 0 || isNaN(speed)) {
      return;
    }

    // Accumulate distance: distance = speed * time
    this.currentDistance += speed * deltaTime;
  }

  /**
   * Get the current distance state
   * Requirements: 2.2, 2.3, 3.2
   * @returns DistanceState with all tracking information
   */
  getState(): DistanceState {
    const progressPercent = this.targetDistance > 0
      ? Math.min(100, (this.currentDistance / this.targetDistance) * 100)
      : 0;

    // Climax zone: final 20% of the level (when progress >= 80%)
    // Requirements: 3.2 - WHILE the player is within the final 20% of Target_Distance
    const isInClimaxZone = progressPercent >= this.climaxZoneThreshold * 100;

    // Near finish: within 50m of target
    // Requirements: 6.4 - WHEN the player is within 50 meters of Target_Distance
    const remainingDistance = this.targetDistance - this.currentDistance;
    const isNearFinish = remainingDistance <= this.nearFinishDistance && remainingDistance > 0;

    return {
      currentDistance: this.currentDistance,
      targetDistance: this.targetDistance,
      progressPercent,
      isInClimaxZone,
      isNearFinish,
    };
  }

  /**
   * Reset the tracker for a new level
   * @param targetDistance - New target distance for the level
   */
  reset(targetDistance: number): void {
    this.currentDistance = 0;
    this.targetDistance = targetDistance;
  }

  /**
   * Check if the level is complete
   * Requirements: 2.2 - WHEN the player reaches the Target_Distance
   * @returns true if currentDistance >= targetDistance
   */
  isLevelComplete(): boolean {
    return this.currentDistance >= this.targetDistance;
  }

  /**
   * Get current distance (convenience method)
   * @returns Current distance in meters
   */
  getCurrentDistance(): number {
    return this.currentDistance;
  }

  /**
   * Get target distance (convenience method)
   * @returns Target distance in meters
   */
  getTargetDistance(): number {
    return this.targetDistance;
  }

  /**
   * Get remaining distance to target
   * @returns Remaining distance in meters
   */
  getRemainingDistance(): number {
    return Math.max(0, this.targetDistance - this.currentDistance);
  }
}

/**
 * Create a distance tracker for a specific level
 * @param targetDistance - Target distance for the level
 * @returns DistanceTracker instance
 */
export function createDistanceTracker(targetDistance: number): DistanceTracker {
  return new DistanceTracker({ targetDistance });
}

/**
 * Check if game over should be triggered based on health
 * Requirements: 2.4 - WHEN the player's health reaches zero before reaching Target_Distance
 * @param health - Current player health
 * @param isLevelComplete - Whether the level is complete
 * @returns true if game over should be triggered
 */
export function shouldTriggerGameOver(health: number, isLevelComplete: boolean): boolean {
  return health <= 0 && !isLevelComplete;
}
