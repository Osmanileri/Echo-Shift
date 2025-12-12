/**
 * Dynamic Midline System
 * Handles sinusoidal midline oscillation calculations
 * Requirements: 4.1, 4.2, 4.5, 4.6, 4.8, 4.11, 4.12, 4.13, 4.14, 4.15
 */

import { MidlineState, MidlineConfig } from '../types';
import { MIDLINE_CONFIG } from '../constants';

/**
 * Calculate dynamic frequency based on score
 * Formula: Frequency_current = Frequency_base × (1 + 0.1 × min(Score / 5000, 1))
 * Requirements: 4.11
 */
export function calculateDynamicFrequency(baseFrequency: number, score: number): number {
  const scaleFactor = Math.min(score / MIDLINE_CONFIG.frequencyMaxScore, 1);
  return baseFrequency * (1 + MIDLINE_CONFIG.frequencyScaleFactor * scaleFactor);
}

/**
 * Calculate dynamic amplitude based on score thresholds
 * Score < 2000: 0.05, 2000 <= Score < 5000: 0.065, Score >= 5000: 0.08
 * Requirements: 4.12
 */
export function calculateDynamicAmplitude(
  baseAmplitude: number,
  score: number,
  config: MidlineConfig
): number {
  if (score < config.amplitudeThreshold1) {
    return baseAmplitude;
  } else if (score < config.amplitudeThreshold2) {
    // Graduated step: 0.05 -> 0.065
    return baseAmplitude + (config.maxAmplitude - baseAmplitude) / 2;
  } else {
    return config.maxAmplitude;
  }
}

/**
 * Calculate the current midline Y position using sinusoidal function
 * Formula: Y_midline = (H/2) + (H × amplitude × sin(time × frequency + offset))
 * Requirements: 4.1, 4.2
 * 
 * Note: Midline stays fixed at center until activationScore is reached
 */
export function calculateMidlineY(
  canvasHeight: number,
  elapsedTime: number,
  config: MidlineConfig,
  score: number,
  offset: number = 0
): number {
  const centerY = canvasHeight / 2;
  
  // Midline stays fixed until activation score is reached
  const activationScore = (config as any).activationScore ?? 0;
  if (score < activationScore) {
    return centerY;
  }
  
  const amplitude = calculateDynamicAmplitude(config.baseAmplitude, score, config);
  const frequency = calculateDynamicFrequency(config.baseFrequency, score);
  
  const oscillation = canvasHeight * amplitude * Math.sin(elapsedTime * frequency + offset);
  
  return centerY + oscillation;
}


/**
 * Calculate the normalized offset (-1 to 1) from center
 * Used for tension intensity and peak detection
 */
export function calculateNormalizedOffset(
  canvasHeight: number,
  currentMidlineY: number
): number {
  const centerY = canvasHeight / 2;
  const maxDeviation = canvasHeight * MIDLINE_CONFIG.maxAmplitude;
  
  if (maxDeviation === 0) return 0;
  
  return (currentMidlineY - centerY) / maxDeviation;
}

/**
 * Determine which zone an orb is in based on its Y position relative to midline
 * Requirements: 4.6
 */
export function getOrbZone(orbY: number, midlineY: number): 'black' | 'white' {
  return orbY < midlineY ? 'black' : 'white';
}

/**
 * Check if micro-phasing should be applied (orb within boundary distance of midline)
 * Requirements: 4.13
 */
export function shouldApplyMicroPhasing(
  orbY: number,
  midlineY: number,
  distance: number = MIDLINE_CONFIG.microPhasingDistance
): boolean {
  return Math.abs(orbY - midlineY) <= distance;
}

/**
 * Calculate movement bounds for player based on current midline position
 * Requirements: 4.5
 */
export function calculateMovementBounds(
  midlineY: number,
  connectorLength: number,
  orbRadius: number,
  canvasHeight: number
): { minY: number; maxY: number } {
  // The player (connected orbs) needs space in both zones
  // Top orb (black zone): from top margin to midline
  // Bottom orb (white zone): from midline to bottom margin
  
  const topMargin = orbRadius;
  const bottomMargin = canvasHeight - orbRadius;
  
  // Player center Y must allow both orbs to stay in their zones
  // Top orb at (centerY - connectorLength/2) must be >= topMargin
  // Bottom orb at (centerY + connectorLength/2) must be <= bottomMargin
  
  const minY = topMargin + connectorLength / 2;
  const maxY = bottomMargin - connectorLength / 2;
  
  // Also constrain based on midline - orbs should stay in their respective zones
  // This is a simplified constraint; actual game may need more complex logic
  
  return { minY, maxY };
}

/**
 * Calculate normal (center) movement bounds for comparison
 */
export function calculateNormalBounds(
  canvasHeight: number,
  connectorLength: number,
  orbRadius: number
): { minY: number; maxY: number } {
  const topMargin = orbRadius;
  const bottomMargin = canvasHeight - orbRadius;
  
  const minY = topMargin + connectorLength / 2;
  const maxY = bottomMargin - connectorLength / 2;
  
  return { minY, maxY };
}

/**
 * Check if the available movement space is critically small (< 30% of normal)
 * Requirements: 4.8
 */
export function isCriticalSpace(
  bounds: { minY: number; maxY: number },
  normalBounds: { minY: number; maxY: number }
): boolean {
  const currentSpace = bounds.maxY - bounds.minY;
  const normalSpace = normalBounds.maxY - normalBounds.minY;
  
  if (normalSpace <= 0) return false;
  
  return currentSpace / normalSpace < MIDLINE_CONFIG.criticalSpaceRatio;
}

/**
 * Calculate tension intensity based on normalized offset
 * Returns 0-1 where |offset| = 1 yields intensity = 1, offset = 0 yields intensity = 0
 * Requirements: 4.15
 */
export function calculateTensionIntensity(normalizedOffset: number): number {
  return Math.abs(normalizedOffset);
}

/**
 * Predict time until next peak or trough
 * Requirements: 4.14
 */
export function predictPeakTime(
  elapsedTime: number,
  frequency: number,
  offset: number = 0
): { timeToNextPeak: number; direction: 'up' | 'down' } {
  // sin(t * f + o) reaches peak at t * f + o = π/2 + 2πn
  // sin(t * f + o) reaches trough at t * f + o = 3π/2 + 2πn
  
  const currentPhase = (elapsedTime * frequency + offset) % (2 * Math.PI);
  
  // Normalize to [0, 2π)
  const normalizedPhase = currentPhase < 0 ? currentPhase + 2 * Math.PI : currentPhase;
  
  const peakPhase = Math.PI / 2;
  const troughPhase = (3 * Math.PI) / 2;
  
  // Calculate time to next peak
  let phaseToNextPeak: number;
  if (normalizedPhase < peakPhase) {
    phaseToNextPeak = peakPhase - normalizedPhase;
  } else {
    phaseToNextPeak = (2 * Math.PI - normalizedPhase) + peakPhase;
  }
  
  // Calculate time to next trough
  let phaseToNextTrough: number;
  if (normalizedPhase < troughPhase) {
    phaseToNextTrough = troughPhase - normalizedPhase;
  } else {
    phaseToNextTrough = (2 * Math.PI - normalizedPhase) + troughPhase;
  }
  
  const timeToNextPeak = phaseToNextPeak / frequency;
  const timeToNextTrough = phaseToNextTrough / frequency;
  
  // Return whichever is closer
  if (timeToNextPeak < timeToNextTrough) {
    return { timeToNextPeak, direction: 'down' }; // Moving toward peak (down on screen = positive Y)
  } else {
    return { timeToNextPeak: timeToNextTrough, direction: 'up' }; // Moving toward trough
  }
}

/**
 * Check if midline is at peak (maximum amplitude)
 */
export function isAtPeak(normalizedOffset: number, threshold: number = 0.95): boolean {
  return Math.abs(normalizedOffset) >= threshold;
}

/**
 * Create initial midline state
 * Requirements: 4.9
 */
export function createInitialMidlineState(canvasHeight: number = 600): MidlineState {
  return {
    startTime: 0,
    currentMidlineY: canvasHeight / 2,
    normalizedOffset: 0,
    currentAmplitude: MIDLINE_CONFIG.baseAmplitude,
    currentFrequency: MIDLINE_CONFIG.baseFrequency,
    isAtPeak: false,
    isMicroPhasing: false,
    tensionIntensity: 0,
  };
}

/**
 * Update midline state based on current game state
 */
export function updateMidlineState(
  state: MidlineState,
  canvasHeight: number,
  elapsedTime: number,
  score: number,
  orbY?: number
): MidlineState {
  const config = MIDLINE_CONFIG;
  
  const currentAmplitude = calculateDynamicAmplitude(config.baseAmplitude, score, config as MidlineConfig);
  const currentFrequency = calculateDynamicFrequency(config.baseFrequency, score);
  const currentMidlineY = calculateMidlineY(canvasHeight, elapsedTime, config as MidlineConfig, score);
  const normalizedOffset = calculateNormalizedOffset(canvasHeight, currentMidlineY);
  const tensionIntensity = calculateTensionIntensity(normalizedOffset);
  const atPeak = isAtPeak(normalizedOffset);
  const microPhasing = orbY !== undefined ? shouldApplyMicroPhasing(orbY, currentMidlineY) : false;
  
  return {
    ...state,
    currentMidlineY,
    normalizedOffset,
    currentAmplitude,
    currentFrequency,
    isAtPeak: atPeak,
    isMicroPhasing: microPhasing,
    tensionIntensity,
  };
}

/**
 * Serialize midline state for persistence
 * Requirements: 4.10
 */
export function serializeMidlineState(state: MidlineState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize midline state from persistence
 * Requirements: 4.10
 */
export function deserializeMidlineState(serialized: string): MidlineState {
  return JSON.parse(serialized) as MidlineState;
}
