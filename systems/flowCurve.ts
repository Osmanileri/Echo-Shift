/**
 * Flow Curve System - Logarithmic Speed Progression
 * 
 * Implements a logarithmic speed curve for professional arcade feel.
 * Speed increases smoothly and caps at human-playable maximum.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration for the Flow Curve system
 */
export interface FlowCurveConfig {
  minSpeed: number;      // Starting speed (6 units)
  maxSpeed: number;      // Human reflex limit (22 units)
  scaleFactor: number;   // Logarithmic scale factor (6)
  scoreBase: number;     // Score divisor (100)
}

/**
 * Current state of the Flow Curve
 */
export interface FlowCurveState {
  currentSpeed: number;
  phase: GamePhase;
}

/**
 * Game phases based on score progression
 * - warmup: Score < 500, speed < 10 units
 * - groove: Score 500-5000, gradual speed increase
 * - plateau: Score > 5000, speed near MAX_SPEED
 */
export type GamePhase = 'warmup' | 'groove' | 'plateau';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default Flow Curve configuration
 * Requirements: 1.1, 1.2, 1.3
 * 
 * Speed values represent km/h display (3.0 = 30km/h)
 * Starting at 30km/h for comfortable gameplay
 * DAHA YAVAŞ HIZ ARTIŞI - Oyuncuya alışma süresi ver
 */
export const DEFAULT_FLOW_CURVE_CONFIG: FlowCurveConfig = {
  minSpeed: 3.0,      // Start at 30km/h
  maxSpeed: 14,       // Max 140km/h (düşürüldü - daha oynanabilir)
  scaleFactor: 2.5,   // ÇOK DAHA YAVAŞ progression (was 4)
  scoreBase: 500      // ÇOK DAHA YAVAŞ scaling (was 200)
};

/**
 * Phase thresholds
 * Requirements: 1.4, 1.5, 1.6
 */
export const PHASE_THRESHOLDS = {
  warmupEnd: 500,    // End of warmup phase
  grooveEnd: 5000    // End of groove phase, start of plateau
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate game speed using logarithmic formula
 * 
 * Formula: MIN_SPEED + log10(score/100 + 1) * scaleFactor
 * 
 * The logarithmic curve provides:
 * - Gentle start for new players
 * - Satisfying progression in mid-game
 * - Natural cap approaching human reflex limits
 * 
 * Requirements: 1.2, 1.3
 * 
 * @param score - Current player score (>= 0)
 * @param config - Flow curve configuration
 * @returns Calculated speed, capped at maxSpeed
 */
export function calculateGameSpeed(
  score: number,
  config: FlowCurveConfig = DEFAULT_FLOW_CURVE_CONFIG
): number {
  // Handle edge cases
  if (score < 0) {
    score = 0;
  }
  
  // Logarithmic formula: MIN_SPEED + log10(score/scoreBase + 1) * scaleFactor
  const logValue = Math.log10(score / config.scoreBase + 1);
  const calculatedSpeed = config.minSpeed + logValue * config.scaleFactor;
  
  // Validate result
  if (!Number.isFinite(calculatedSpeed)) {
    console.warn('[FlowCurve] Invalid speed calculated, using minSpeed');
    return config.minSpeed;
  }
  
  // Cap at maxSpeed - Requirements 1.3
  return Math.min(calculatedSpeed, config.maxSpeed);
}

/**
 * Determine the current game phase based on score
 * 
 * Phases:
 * - warmup (score < 500): Slow adaptation period
 * - groove (500 <= score < 5000): Sweet spot progression
 * - plateau (score >= 5000): Challenge from patterns, not speed
 * 
 * Requirements: 1.4, 1.5, 1.6
 * 
 * @param score - Current player score
 * @returns Current game phase
 */
export function determinePhase(score: number): GamePhase {
  if (score < PHASE_THRESHOLDS.warmupEnd) {
    return 'warmup';
  }
  
  if (score < PHASE_THRESHOLDS.grooveEnd) {
    return 'groove';
  }
  
  return 'plateau';
}

/**
 * Get the complete Flow Curve state for a given score
 * 
 * @param score - Current player score
 * @param config - Flow curve configuration
 * @returns Complete flow curve state
 */
export function getFlowCurveState(
  score: number,
  config: FlowCurveConfig = DEFAULT_FLOW_CURVE_CONFIG
): FlowCurveState {
  return {
    currentSpeed: calculateGameSpeed(score, config),
    phase: determinePhase(score)
  };
}

/**
 * Safe speed calculation with error handling
 * 
 * @param score - Current player score
 * @param config - Flow curve configuration
 * @returns Calculated speed with fallback to minSpeed on error
 */
export function safeCalculateSpeed(
  score: number,
  config: FlowCurveConfig = DEFAULT_FLOW_CURVE_CONFIG
): number {
  try {
    const speed = calculateGameSpeed(score, config);
    if (!Number.isFinite(speed)) {
      console.warn('[FlowCurve] Invalid speed calculated, using minSpeed');
      return config.minSpeed;
    }
    return speed;
  } catch (error) {
    console.error('[FlowCurve] Error calculating speed:', error);
    return config.minSpeed;
  }
}

/**
 * Check if speed is within warmup phase limits
 * Requirements: 1.4
 * 
 * @param speed - Current speed
 * @returns True if speed is below warmup threshold (10 units)
 */
export function isWarmupSpeed(speed: number): boolean {
  return speed < 10;
}

/**
 * Get speed progress as percentage (0-100)
 * Useful for UI display
 * 
 * @param speed - Current speed
 * @param config - Flow curve configuration
 * @returns Progress percentage
 */
export function getSpeedProgress(
  speed: number,
  config: FlowCurveConfig = DEFAULT_FLOW_CURVE_CONFIG
): number {
  const range = config.maxSpeed - config.minSpeed;
  const progress = ((speed - config.minSpeed) / range) * 100;
  return Math.max(0, Math.min(100, progress));
}
