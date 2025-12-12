import { RhythmState } from '../types';
import { RHYTHM_CONFIG } from '../constants';

/**
 * Rhythm timing check result
 */
export interface RhythmResult {
  isOnBeat: boolean;
  timingDelta: number; // Difference from expected time (ms)
}

/**
 * Creates initial rhythm state
 */
export function createInitialRhythmState(): RhythmState {
  return {
    lastPassTime: 0,
    expectedInterval: RHYTHM_CONFIG.baseInterval,
    streakCount: 0,
    activeMultiplier: 1,
    isRhythmActive: false,
  };
}

/**
 * Calculates the expected rhythm interval based on game speed and spawn rate
 * Higher speed = shorter interval (inverse relationship)
 * Requirements: 1.6
 * 
 * @param speed - Current game speed
 * @param spawnRate - Current spawn rate (frames between spawns)
 * @returns Expected interval in milliseconds
 */
export function calculateExpectedInterval(speed: number, spawnRate: number): number {
  // Base interval adjusted by speed factor
  // As speed increases, interval decreases proportionally
  const speedFactor = 2.5 / speed; // 2.5 is the base speed from INITIAL_CONFIG
  const baseInterval = RHYTHM_CONFIG.baseInterval;
  
  // Also factor in spawn rate - lower spawn rate means more frequent obstacles
  const spawnFactor = spawnRate / 140; // 140 is the base spawn rate
  
  return Math.max(200, baseInterval * speedFactor * spawnFactor);
}

/**
 * Checks if the current pass timing is within the rhythm tolerance window
 * Requirements: 1.1, 1.2
 * 
 * @param currentTime - Current timestamp when obstacle was passed
 * @param state - Current rhythm state
 * @returns RhythmResult indicating if timing was on-beat
 */
export function checkRhythmTiming(currentTime: number, state: RhythmState): RhythmResult {
  // First pass - no timing check, just establish baseline
  if (state.lastPassTime === 0) {
    return {
      isOnBeat: false,
      timingDelta: 0,
    };
  }

  const expectedTime = state.lastPassTime + state.expectedInterval;
  const timingDelta = currentTime - expectedTime;
  
  // Check if within ±50ms tolerance
  const isOnBeat = Math.abs(timingDelta) <= RHYTHM_CONFIG.toleranceMs;

  return {
    isOnBeat,
    timingDelta,
  };
}

/**
 * Gets the score multiplier for a given streak count
 * Requirements: 1.3, 1.4
 * 
 * @param streak - Current rhythm streak count
 * @returns Multiplier value (1, 2, or 3)
 */
export function getMultiplierForStreak(streak: number): number {
  if (streak >= RHYTHM_CONFIG.streakForX3) {
    return 3;
  }
  if (streak >= RHYTHM_CONFIG.streakForX2) {
    return 2;
  }
  return 1;
}


/**
 * Updates rhythm state based on timing result
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * @param state - Current rhythm state
 * @param currentTime - Current timestamp
 * @param isOnBeat - Whether the timing was on-beat
 * @param newExpectedInterval - Optional new expected interval (for speed changes)
 * @returns Updated rhythm state
 */
export function updateRhythmState(
  state: RhythmState,
  currentTime: number,
  isOnBeat: boolean,
  newExpectedInterval?: number
): RhythmState {
  const expectedInterval = newExpectedInterval ?? state.expectedInterval;

  // First pass - just record the time, don't update streak
  if (state.lastPassTime === 0) {
    return {
      ...state,
      lastPassTime: currentTime,
      expectedInterval,
      isRhythmActive: true,
    };
  }

  if (isOnBeat) {
    // Increment streak and update multiplier
    const newStreak = state.streakCount + 1;
    const newMultiplier = getMultiplierForStreak(newStreak);
    
    return {
      lastPassTime: currentTime,
      expectedInterval,
      streakCount: newStreak,
      activeMultiplier: newMultiplier,
      isRhythmActive: true,
    };
  } else {
    // Reset streak and multiplier on timing miss
    return {
      lastPassTime: currentTime,
      expectedInterval,
      streakCount: 0,
      activeMultiplier: 1,
      isRhythmActive: true,
    };
  }
}

/**
 * Resets rhythm state after collision
 * Requirements: 1.5
 * 
 * @returns Fresh rhythm state with reset values
 */
export function resetRhythmState(): RhythmState {
  return createInitialRhythmState();
}
