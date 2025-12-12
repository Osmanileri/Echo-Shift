import { Obstacle, Point, NearMissResult, NearMissState, GravityState } from '../types';
import { NEAR_MISS_CONFIG, GRAVITY_CONFIG } from '../constants';

/**
 * Result of updating near miss state including streak bonus
 */
export interface NearMissStreakResult {
  newState: NearMissState;
  streakBonusAwarded: boolean;
  totalBonusPoints: number;
}

/**
 * Calculates the closest point on a rectangle to a given point
 * Requirements: 3.6
 */
export const calculateClosestPoint = (
  circlePos: Point,
  rect: Obstacle
): Point => {
  const closestX = Math.max(rect.x, Math.min(circlePos.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circlePos.y, rect.y + rect.height));
  return { x: closestX, y: closestY };
};

export const checkCollision = (
  circlePos: Point,
  radius: number,
  rect: Obstacle
): boolean => {
  // Find the closest point to the circle within the rectangle
  const closest = calculateClosestPoint(circlePos, rect);

  // Calculate the distance between the circle's center and this closest point
  const distanceX = circlePos.x - closest.x;
  const distanceY = circlePos.y - closest.y;

  // If the distance is less than the circle's radius, an intersection occurs
  const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
  return distanceSquared < (radius * radius);
};

/**
 * Checks if an orb has a near miss with an obstacle
 * A near miss occurs when the orb passes an obstacle with clearance < orb radius
 * but without collision
 * 
 * Requirements: 3.1, 3.6
 * - 3.1: Classify as "close call" when clearance < orb radius (9 pixels)
 * - 3.6: Measure from orb edge to nearest obstacle edge
 */
export const checkNearMiss = (
  circlePos: Point,
  radius: number,
  rect: Obstacle
): NearMissResult => {
  // Calculate closest point on rectangle to circle center
  const closestPoint = calculateClosestPoint(circlePos, rect);
  
  // Calculate distance from circle center to closest point
  const distanceX = circlePos.x - closestPoint.x;
  const distanceY = circlePos.y - closestPoint.y;
  const distanceFromCenter = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
  
  // Distance from orb edge to obstacle edge (Requirements 3.6)
  const clearanceDistance = distanceFromCenter - radius;
  
  // Check if it's a near miss: no collision but within threshold
  // Near miss threshold is the orb radius (9 pixels) per Requirements 3.1
  const isCollision = clearanceDistance < 0;
  const isNearMiss = !isCollision && clearanceDistance < NEAR_MISS_CONFIG.threshold;
  
  // Calculate bonus points (Requirements 3.2: double points = 20)
  const bonusPoints = isNearMiss ? 10 * NEAR_MISS_CONFIG.bonusMultiplier : 0;
  
  return {
    isNearMiss,
    distance: clearanceDistance,
    closestPoint,
    bonusPoints
  };
};

export const randomRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

/**
 * Calculates combo multiplier based on streak count
 * Streak 1: x1, Streak 2: x2, Streak 3: x3, etc. up to maxStreakMultiplier
 */
export const getComboMultiplier = (streakCount: number): number => {
  const maxMultiplier = (NEAR_MISS_CONFIG as any).maxStreakMultiplier ?? 5;
  return Math.min(streakCount, maxMultiplier);
};

/**
 * Updates the near miss state when a near miss occurs
 * Handles streak counting, time window validation, and combo multipliers
 * 
 * Requirements: 3.2, 3.7, 3.8
 * - 3.2: Award double points (20 instead of 10) for near miss
 * - 3.7: Increment streak counter for near misses within streak window
 * - 3.8: Award bonus when streak reaches threshold
 * 
 * Enhanced: Combo system - streak multiplies points (x1, x2, x3... up to x5)
 */
export const updateNearMissState = (
  currentState: NearMissState,
  nearMissResult: NearMissResult,
  currentTime: number
): NearMissStreakResult => {
  // If not a near miss, return unchanged state with no bonus
  if (!nearMissResult.isNearMiss) {
    return {
      newState: currentState,
      streakBonusAwarded: false,
      totalBonusPoints: 0
    };
  }

  const timeSinceLastNearMiss = currentTime - currentState.lastNearMissTime;
  
  // Check if within streak window
  const isWithinStreakWindow = timeSinceLastNearMiss <= NEAR_MISS_CONFIG.streakWindow;
  
  // Calculate new streak count
  // If within window, increment; otherwise reset to 1
  const newStreakCount = isWithinStreakWindow 
    ? currentState.streakCount + 1 
    : 1;
  
  // Get combo multiplier based on streak
  const comboMultiplier = getComboMultiplier(newStreakCount);
  
  // Check if streak bonus should be awarded
  const streakBonusAwarded = newStreakCount >= NEAR_MISS_CONFIG.streakBonusAt && 
    newStreakCount % NEAR_MISS_CONFIG.streakBonusAt === 0;
  
  // Calculate total bonus points with combo multiplier
  // Base near miss bonus × combo multiplier
  // Plus streak bonus if threshold reached
  const baseBonus = nearMissResult.bonusPoints * comboMultiplier;
  const streakBonus = streakBonusAwarded ? NEAR_MISS_CONFIG.streakBonusPoints * comboMultiplier : 0;
  const totalBonusPoints = baseBonus + streakBonus;
  
  const newState: NearMissState = {
    lastNearMissTime: currentTime,
    streakCount: newStreakCount,
    totalNearMisses: currentState.totalNearMisses + 1
  };
  
  return {
    newState,
    streakBonusAwarded,
    totalBonusPoints
  };
};

/**
 * Creates an initial near miss state
 */
export const createInitialNearMissState = (): NearMissState => ({
  lastNearMissTime: 0,
  streakCount: 0,
  totalNearMisses: 0
});


// ============================================
// Gravity System Utility Functions
// Requirements: 2.1, 2.3, 2.4, 2.6
// ============================================

/**
 * Determines if a gravity flip should be triggered
 * Requirements: 2.1, 2.6
 * - 2.1: Gravity flip becomes eligible at score >= 1000
 * - 2.6: Minimum 5 seconds (5000ms) between flips
 * 
 * @param score - Current player score
 * @param lastFlipTime - Timestamp of the last gravity flip
 * @param currentTime - Current timestamp
 * @returns true if flip should trigger, false otherwise
 */
export const shouldTriggerFlip = (
  score: number,
  lastFlipTime: number,
  currentTime: number
): boolean => {
  // Check minimum score threshold (Requirements 2.1)
  if (score < GRAVITY_CONFIG.minScoreToActivate) {
    return false;
  }
  
  // Check cooldown period (Requirements 2.6)
  const timeSinceLastFlip = currentTime - lastFlipTime;
  if (timeSinceLastFlip < GRAVITY_CONFIG.minTimeBetweenFlips) {
    return false;
  }
  
  return true;
};

/**
 * Mirrors a player's vertical position relative to the screen center
 * Requirements: 2.3
 * - Position is normalized (0 to 1 range)
 * - mirrorPlayerPosition(y) = 1 - y
 * - Round-trip property: mirrorPlayerPosition(mirrorPlayerPosition(y)) = y
 * 
 * @param normalizedY - Player's normalized Y position (0 = top, 1 = bottom)
 * @returns Mirrored normalized Y position
 */
export const mirrorPlayerPosition = (normalizedY: number): number => {
  return 1 - normalizedY;
};

/**
 * Returns the inverted lane for gravity flip
 * Requirements: 2.4
 * - 'top' becomes 'bottom'
 * - 'bottom' becomes 'top'
 * 
 * @param lane - Original lane ('top' or 'bottom')
 * @returns Flipped lane
 */
export const getFlippedLane = (lane: 'top' | 'bottom'): 'top' | 'bottom' => {
  return lane === 'top' ? 'bottom' : 'top';
};

/**
 * Creates an initial gravity state
 */
export const createInitialGravityState = (): GravityState => ({
  isFlipped: false,
  flipStartTime: 0,
  warningActive: false,
  warningStartTime: 0,
  lastFlipTime: 0,
  isInvincible: false,
});
