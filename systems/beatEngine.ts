/**
 * Beat Engine — Global BPM Clock for Echo Shift
 *
 * Provides a high-precision, AudioContext-driven beat clock that drives:
 *   - Layered procedural music scheduling (kick / hi-hat / bass / arp)
 *   - Score-based dynamic BPM scaling (90 → 140 BPM)
 *   - Beat-phase queries for visual & haptic sync
 *   - Callback registry for on-beat / on-downbeat events
 *
 * Uses the Web Audio "schedule-ahead" pattern (25 ms lookahead) so every
 * audio event lands sample-accurately on the beat grid, even when the
 * main thread is busy rendering at 60 fps.
 *
 * Mobile considerations:
 *   - pause()/resume() for app background/foreground lifecycle
 *   - Catch-up guard: if scheduler wakes after a long gap (e.g. mobile
 *     throttled setTimeout), it skips to the present instead of scheduling
 *     hundreds of missed beats
 *   - AudioContext state monitoring for iOS interruptions (phone calls etc.)
 *
 * Architecture:
 *   beatEngine is a singleton — call `start()` on game start, `stop()` on
 *   game over, and `update(score)` every frame.  Other systems read state
 *   via `getBPM()`, `getBeatPhase()`, `getBeatInterval()`, `isDownbeat()`.
 */

import { BPM_CONFIG } from '../constants';
import {
    _onBeatScheduleMusic,
    getAudioContext,
    resumeAudioContext,
    startBeatMusic,
    stopBeatMusic,
    suspendAudioContext,
    updateBeatMusic,
} from './audioSystem';

// ============================================================================
// Types
// ============================================================================

export interface BeatState {
  /** Current tempo */
  bpm: number;
  /** Monotonically increasing beat index since start (quarter-note) */
  currentBeat: number;
  /** 0-1 phase within the current beat */
  beatPhase: number;
  /** Beat interval in ms */
  beatIntervalMs: number;
  /** True on beat 0 of each 4-beat bar */
  isDownbeat: boolean;
  /** Engine running (not paused) */
  isRunning: boolean;
  /** Engine started but temporarily paused (background/interruption) */
  isPaused: boolean;
}

/** Beat callbacks receive the precise audio time for sample-accurate scheduling */
type BeatCallback = (beat: number, isDownbeat: boolean, audioTime: number) => void;

// ============================================================================
// Module State (singleton)
// ============================================================================

let _bpm = BPM_CONFIG.baseBPM;
let _currentBeat = 0;
let _startTime = 0;          // AudioContext seconds at engine start
let _isRunning = false;
let _isPaused = false;        // paused for background / interruption
let _pauseTime = 0;           // AudioContext time when paused
let _totalPausedDuration = 0; // accumulated pause time (seconds)
let _lastScheduledBeat = -1;  // highest beat index we've already scheduled
let _schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let _lastScore = 0;           // cached score for resume

/** Maximum number of beats we allow scheduling in a single scheduler tick.
 *  Prevents a burst of hundreds of notes when waking from a throttled setTimeout. */
const MAX_CATCHUP_BEATS = 4;

const _onBeatCallbacks: BeatCallback[] = [];

// ============================================================================
// BPM Scaling — logarithmic curve mirroring FlowCurve
// ============================================================================

/**
 * Returns the dynamic BPM for a given distance in meters.
 * Linearly scales from baseBPM to maxBPM over 800 meters.
 */
export function scaleBPM(distance: number): number {
  const baseBPM = 90;
  const maxBPM = 140;
  const progress = Math.min(1.0, distance / 800);
  return baseBPM + (maxBPM - baseBPM) * progress;
}

// ============================================================================
// Beat Phase Helpers
// ============================================================================

/** Returns 0-1 phase within the current beat for the given AudioContext time */
function _beatPhaseAt(audioTime: number): number {
  if (!_isRunning || _isPaused) return 0;
  const elapsed = audioTime - _startTime - _totalPausedDuration;
  if (elapsed < 0) return 0;
  const beatDur = 60 / _bpm; // seconds
  return ((elapsed % beatDur) / beatDur + 1) % 1; // always positive
}

/** Which beat index are we at for a given AudioContext time? */
function _beatIndexAt(audioTime: number): number {
  if (!_isRunning || _isPaused) return 0;
  const elapsed = audioTime - _startTime - _totalPausedDuration;
  if (elapsed < 0) return 0;
  const beatDur = 60 / _bpm;
  return Math.floor(elapsed / beatDur);
}

// ============================================================================
// Scheduler (schedule-ahead pattern)
// ============================================================================

const SCHEDULE_AHEAD_SEC = 0.1;  // look 100ms into the future
const SCHEDULER_INTERVAL = 25;   // run every 25ms

function _runScheduler(): void {
  const ctx = getAudioContext();
  if (!ctx || !_isRunning || _isPaused) return;

  const now = ctx.currentTime;
  const beatDur = 60 / _bpm;
  const horizon = now + SCHEDULE_AHEAD_SEC;

  // Walk forward from last scheduled beat
  let nextBeat = _lastScheduledBeat + 1;
  let nextBeatTime = _startTime + _totalPausedDuration + nextBeat * beatDur;

  // Catch-up guard: if we're way behind (e.g. mobile setTimeout throttled),
  // skip ahead instead of scheduling hundreds of beats in a burst
  let beatsThisTick = 0;
  if (nextBeatTime < now - SCHEDULE_AHEAD_SEC * 2) {
    // We're too far behind — jump to current time
    const elapsedFromStart = now - _startTime - _totalPausedDuration;
    const currentBeatIdx = Math.floor(elapsedFromStart / beatDur);
    // Skip to 1 beat before current so we schedule the immediate beat
    nextBeat = Math.max(nextBeat, currentBeatIdx - 1);
    _lastScheduledBeat = nextBeat - 1;
    nextBeatTime = _startTime + _totalPausedDuration + nextBeat * beatDur;
  }

  while (nextBeatTime < horizon && beatsThisTick < MAX_CATCHUP_BEATS) {
    const isDownbeat = nextBeat % 4 === 0;

    // Fire callbacks with precise audio time for sample-accurate scheduling
    for (let i = 0; i < _onBeatCallbacks.length; i++) {
      try {
        _onBeatCallbacks[i](nextBeat, isDownbeat, nextBeatTime);
      } catch {
        // Swallow errors so one bad callback doesn't break the clock
      }
    }

    _lastScheduledBeat = nextBeat;
    beatsThisTick++;
    nextBeat++;
    nextBeatTime = _startTime + _totalPausedDuration + nextBeat * beatDur;
  }

  _schedulerTimer = setTimeout(_runScheduler, SCHEDULER_INTERVAL);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Start the beat engine.  Call once when gameplay begins.
 * Initialises the AudioContext clock and starts the scheduler + music layers.
 */
export function start(initialDistance = 0): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  _bpm = scaleBPM(initialDistance);
  _currentBeat = 0;
  _lastScheduledBeat = -1;
  _startTime = ctx.currentTime;
  _totalPausedDuration = 0;
  _pauseTime = 0;
  _isPaused = false;
  _isRunning = true;
  _lastScore = initialDistance;

  // Start procedural music layers
  startBeatMusic(_bpm);

  // Clear any stale callbacks (e.g. restart without stop) then register music scheduler
  _onBeatCallbacks.length = 0;
  _onBeatCallbacks.push(_onBeatScheduleMusic);

  // Kick off the schedule-ahead loop
  _runScheduler();
}

/**
 * Pause the beat engine (app going to background / interruption).
 * Suspends AudioContext and stops the scheduler.  Call `resume()` to restart.
 */
export function pause(): void {
  if (!_isRunning || _isPaused) return;
  _isPaused = true;

  const ctx = getAudioContext();
  if (ctx) {
    _pauseTime = ctx.currentTime;
  }

  // Stop the scheduler loop — setTimeout is throttled in background anyway
  if (_schedulerTimer !== null) {
    clearTimeout(_schedulerTimer);
    _schedulerTimer = null;
  }

  // Suspend the audio context to save battery
  suspendAudioContext();
}

/**
 * Resume the beat engine after a pause.
 * Re-syncs the beat grid so there's no catch-up burst.
 */
export function resume(): void {
  if (!_isRunning || !_isPaused) return;

  // Resume the audio context first (must happen from user gesture on iOS)
  resumeAudioContext();

  const ctx = getAudioContext();
  if (ctx) {
    // Accumulate the time spent paused
    const pausedDuration = ctx.currentTime - _pauseTime;
    _totalPausedDuration += pausedDuration;

    // Re-sync: figure out where we are now in the beat grid
    const elapsed = ctx.currentTime - _startTime - _totalPausedDuration;
    const beatDur = 60 / _bpm;
    const currentBeatIdx = Math.floor(elapsed / beatDur);
    // Skip to current beat so we don't try to schedule past beats
    _lastScheduledBeat = currentBeatIdx - 1;
  }

  _isPaused = false;
  _pauseTime = 0;

  // Restart the scheduler loop
  _runScheduler();

  // Re-apply current score to music layers
  updateBeatMusic(_bpm, _lastScore);
}

/**
 * Stop the beat engine and silence all music layers.
 */
export function stop(): void {
  _isRunning = false;
  _isPaused = false;
  _pauseTime = 0;
  _totalPausedDuration = 0;
  if (_schedulerTimer !== null) {
    clearTimeout(_schedulerTimer);
    _schedulerTimer = null;
  }
  stopBeatMusic();
  _onBeatCallbacks.length = 0;
}

/**
 * Call every frame with the current score to keep BPM in sync.
 * Also updates the music layers when BPM changes.
 */
export function update(distance: number): void {
  if (!_isRunning || _isPaused) return;

  _lastScore = distance;
  const newBPM = scaleBPM(distance);

  // Only push a music update when BPM changes noticeably (>0.5)
  if (Math.abs(newBPM - _bpm) > 0.5) {
    _bpm = newBPM;
    updateBeatMusic(_bpm, distance);
  }

  // Keep _currentBeat in sync for external queries
  const ctx = getAudioContext();
  if (ctx) {
    _currentBeat = _beatIndexAt(ctx.currentTime);
  }
}

// ────────────────────────── Getters ──────────────────────────

/** Current BPM (already score-scaled). */
export function getBPM(): number {
  return _bpm;
}

/** Beat interval in milliseconds. */
export function getBeatInterval(): number {
  return 60000 / _bpm;
}

/**
 * Current beat phase (0-1) — call with `Date.now()` or canvas timestamp.
 * Uses AudioContext.currentTime internally for accuracy.
 */
export function getBeatPhase(): number {
  const ctx = getAudioContext();
  if (!ctx || !_isRunning) return 0;
  return _beatPhaseAt(ctx.currentTime);
}

/** Current beat index since engine start. */
export function getCurrentBeat(): number {
  return _currentBeat;
}

/** True if the current beat is beat 0 of a 4-beat bar. */
export function isDownbeat(): boolean {
  return _currentBeat % 4 === 0;
}

/** Is the engine running? */
export function isRunning(): boolean {
  return _isRunning && !_isPaused;
}

/** Is the engine paused (background/interruption)? */
export function isPaused(): boolean {
  return _isPaused;
}

/**
 * Register a callback that fires on every scheduled beat.
 * The callback receives `(beatIndex, isDownbeat, audioTime)` and is called
 * inside the schedule-ahead window (~100 ms before actual playback).
 * `audioTime` is the precise AudioContext time for sample-accurate scheduling.
 * Returns an unsubscribe function.
 */
export function onBeat(cb: BeatCallback): () => void {
  _onBeatCallbacks.push(cb);
  return () => {
    const idx = _onBeatCallbacks.indexOf(cb);
    if (idx !== -1) _onBeatCallbacks.splice(idx, 1);
  };
}

/**
 * Get a full snapshot of the current beat state (for UI / VFX).
 */
export function getState(): BeatState {
  return {
    bpm: _bpm,
    currentBeat: _currentBeat,
    beatPhase: getBeatPhase(),
    beatIntervalMs: getBeatInterval(),
    isDownbeat: isDownbeat(),
    isRunning: _isRunning && !_isPaused,
    isPaused: _isPaused,
  };
}

/** Start time of the beat engine (in AudioContext time). */
export function getStartTime(): number {
  return _startTime;
}

/** Total paused duration (in AudioContext time). */
export function getTotalPausedDuration(): number {
  return _totalPausedDuration;
}
