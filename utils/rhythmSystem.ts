import { BPM_CONFIG, RHYTHM_CONFIG } from '../constants';
import { RhythmState } from '../types';

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
 * Calculates the expected rhythm interval from the beat engine's BPM.
 * When a valid BPM is supplied the interval is derived directly from tempo;
 * otherwise falls back to the legacy speed/spawnRate heuristic.
 *
 * @param speed      - Current game speed
 * @param spawnRate  - Current spawn rate (frames between spawns)
 * @param bpm        - (optional) Current BPM from beatEngine
 * @returns Expected interval in milliseconds
 */
export function calculateExpectedInterval(
  speed: number,
  spawnRate: number,
  bpm?: number
): number {
  // BPM-driven path: one obstacle pair per 2 beats (half-bar)
  if (bpm && bpm > 0) {
    const beatInterval = 60000 / bpm;
    // Expect an obstacle pass every 2 beats at low BPM, every 1 beat at high BPM
    const beatsPerSpawn = bpm < 110 ? 2 : 1;
    return Math.max(200, beatInterval * beatsPerSpawn);
  }

  // Legacy fallback
  const speedFactor = 2.5 / speed;
  const baseInterval = RHYTHM_CONFIG.baseInterval;
  const spawnFactor = spawnRate / 140;
  return Math.max(200, baseInterval * speedFactor * spawnFactor);
}

/**
 * BPM-adaptive tolerance: faster tempos tighten the window, slower tempos relax it.
 * Range: ±150 ms (at 140 BPM) … ±250 ms (at 90 BPM).
 *
 * @param bpm - Current BPM (optional, defaults to RHYTHM_CONFIG.toleranceMs)
 */
export function getDynamicTolerance(bpm?: number): number {
  if (!bpm || bpm <= 0) return RHYTHM_CONFIG.toleranceMs;
  const t = Math.min(1, Math.max(0, (bpm - BPM_CONFIG.baseBPM) / (BPM_CONFIG.maxBPM - BPM_CONFIG.baseBPM)));
  // Interpolate: slow (250 ms) → fast (150 ms)
  return 250 - t * 100;
}

/**
 * Checks if the current pass timing is within the rhythm tolerance window
 * Requirements: 1.1, 1.2
 * 
 * @param currentTime - Current timestamp when obstacle was passed
 * @param state       - Current rhythm state
 * @param bpm         - (optional) Current BPM for dynamic tolerance
 * @returns RhythmResult indicating if timing was on-beat
 */
export function checkRhythmTiming(
  currentTime: number,
  state: RhythmState,
  bpm?: number
): RhythmResult {
  // First pass - no timing check, just establish baseline
  if (state.lastPassTime === 0) {
    return {
      isOnBeat: false,
      timingDelta: 0,
    };
  }

  const expectedTime = state.lastPassTime + state.expectedInterval;
  const timingDelta = currentTime - expectedTime;
  
  // Dynamic tolerance based on BPM
  const tolerance = getDynamicTolerance(bpm);
  const isOnBeat = Math.abs(timingDelta) <= tolerance;

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
 * Penalty: only streak/bonus loss — no gameplay penalty (casual-friendly).
 *
 * @param state               - Current rhythm state
 * @param currentTime         - Current timestamp
 * @param isOnBeat            - Whether the timing was on-beat
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
    // Reset streak and multiplier on timing miss — only bonus penalty
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
