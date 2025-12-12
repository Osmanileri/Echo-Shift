/**
 * Ghost Racer System
 * Allows players to race against their previous best performance
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */

import { safePersist, safeLoad, STORAGE_KEYS } from '../utils/persistence';

/**
 * GhostFrame interface - represents a single frame of ghost data
 * Requirements: 15.2, 15.5
 */
export interface GhostFrame {
  timestamp: number;  // Time since game start (ms)
  score: number;      // Score at this frame
  playerY: number;    // Player Y position (0-1 normalized)
  isSwapped: boolean; // Whether orbs are swapped
}

/**
 * GhostTimeline - complete recording of a run
 * Requirements: 15.4, 15.5
 */
export interface GhostTimeline {
  frames: GhostFrame[];
  finalScore: number;
  recordedAt: number; // Unix timestamp when recorded
}

/**
 * GhostRacerState - current state of the ghost racer system
 */
export interface GhostRacerState {
  isRecording: boolean;
  recordingStartTime: number;
  currentTimeline: GhostFrame[];
  savedTimeline: GhostTimeline | null;
  isDisplaying: boolean;
}

// Recording interval in ms (record every 50ms for smooth playback)
const RECORDING_INTERVAL = 50;

// Maximum frames to store (prevents memory issues for very long runs)
const MAX_FRAMES = 36000; // ~30 minutes at 50ms intervals

/**
 * Create initial ghost racer state
 */
export function createInitialGhostRacerState(): GhostRacerState {
  return {
    isRecording: false,
    recordingStartTime: 0,
    currentTimeline: [],
    savedTimeline: null,
    isDisplaying: false,
  };
}

/**
 * Start recording a new ghost timeline
 * Requirements: 15.4
 * @param state - Current ghost racer state
 * @param startTime - Game start time (ms)
 * @returns Updated state with recording started
 */
export function startRecording(state: GhostRacerState, startTime: number): GhostRacerState {
  return {
    ...state,
    isRecording: true,
    recordingStartTime: startTime,
    currentTimeline: [],
  };
}

/**
 * Record a single frame of ghost data
 * Requirements: 15.4
 * @param state - Current ghost racer state
 * @param frame - Frame data to record
 * @returns Updated state with new frame added
 */
export function recordFrame(state: GhostRacerState, frame: GhostFrame): GhostRacerState {
  if (!state.isRecording) {
    return state;
  }

  // Prevent recording too many frames
  if (state.currentTimeline.length >= MAX_FRAMES) {
    return state;
  }

  return {
    ...state,
    currentTimeline: [...state.currentTimeline, frame],
  };
}

/**
 * Stop recording and finalize the timeline
 * Requirements: 15.4
 * @param state - Current ghost racer state
 * @param finalScore - Final score of the run
 * @returns Updated state with recording stopped
 */
export function stopRecording(state: GhostRacerState, finalScore: number): GhostRacerState {
  if (!state.isRecording) {
    return state;
  }

  const newTimeline: GhostTimeline = {
    frames: state.currentTimeline,
    finalScore,
    recordedAt: Date.now(),
  };

  return {
    ...state,
    isRecording: false,
    currentTimeline: [],
    savedTimeline: newTimeline,
  };
}

/**
 * Save ghost timeline to localStorage
 * Requirements: 15.5 - Serialize ghost data as JSON
 * @param timeline - Timeline to save
 * @returns true if saved successfully
 */
export function saveTimeline(timeline: GhostTimeline): boolean {
  return safePersist(STORAGE_KEYS.GHOST_DATA, timeline);
}

/**
 * Load ghost timeline from localStorage
 * Requirements: 15.6 - Deserialize ghost data from JSON
 * @returns Loaded timeline or null if not found
 */
export function loadTimeline(): GhostTimeline | null {
  const loaded = safeLoad<GhostTimeline | null>(STORAGE_KEYS.GHOST_DATA, null);
  
  // Validate loaded data
  if (loaded && Array.isArray(loaded.frames) && typeof loaded.finalScore === 'number') {
    return loaded;
  }
  
  return null;
}

/**
 * Get ghost position at a specific time using interpolation
 * Requirements: 15.2 - Show ghost position based on recorded timeline
 * @param timeline - Ghost timeline to query
 * @param currentTime - Current game time (ms since start)
 * @returns Interpolated ghost frame or null if out of range
 */
export function getGhostPosition(timeline: GhostTimeline, currentTime: number): GhostFrame | null {
  const frames = timeline.frames;
  
  if (frames.length === 0) {
    return null;
  }

  // If before first frame, return first frame
  if (currentTime <= frames[0].timestamp) {
    return frames[0];
  }

  // If after last frame, return last frame
  if (currentTime >= frames[frames.length - 1].timestamp) {
    return frames[frames.length - 1];
  }

  // Find the two frames to interpolate between
  let lowIndex = 0;
  let highIndex = frames.length - 1;

  // Binary search for efficiency
  while (highIndex - lowIndex > 1) {
    const midIndex = Math.floor((lowIndex + highIndex) / 2);
    if (frames[midIndex].timestamp <= currentTime) {
      lowIndex = midIndex;
    } else {
      highIndex = midIndex;
    }
  }

  const frameBefore = frames[lowIndex];
  const frameAfter = frames[highIndex];

  // Calculate interpolation factor
  const timeDiff = frameAfter.timestamp - frameBefore.timestamp;
  if (timeDiff === 0) {
    return frameBefore;
  }

  const t = (currentTime - frameBefore.timestamp) / timeDiff;

  // Interpolate position (linear interpolation)
  const interpolatedY = frameBefore.playerY + (frameAfter.playerY - frameBefore.playerY) * t;
  
  // Interpolate score (linear interpolation)
  const interpolatedScore = Math.floor(
    frameBefore.score + (frameAfter.score - frameBefore.score) * t
  );

  return {
    timestamp: currentTime,
    score: interpolatedScore,
    playerY: interpolatedY,
    isSwapped: frameBefore.isSwapped, // Use the earlier frame's swap state
  };
}

/**
 * Check if player is ahead of the ghost
 * Requirements: 15.3 - Display indicator when player surpasses ghost
 * @param currentScore - Player's current score
 * @param currentTime - Current game time (ms since start)
 * @param timeline - Ghost timeline to compare against
 * @returns true if player is ahead of ghost
 */
export function isPlayerAhead(
  currentScore: number,
  currentTime: number,
  timeline: GhostTimeline
): boolean {
  const ghostPosition = getGhostPosition(timeline, currentTime);
  
  if (!ghostPosition) {
    return false;
  }

  return currentScore > ghostPosition.score;
}

/**
 * Check if a new high score was achieved
 * Requirements: 15.4 - Record new run's timeline for future ghost display
 * @param finalScore - Final score of current run
 * @param savedTimeline - Previously saved timeline
 * @returns true if new high score
 */
export function isNewHighScore(finalScore: number, savedTimeline: GhostTimeline | null): boolean {
  if (!savedTimeline) {
    return true;
  }
  return finalScore > savedTimeline.finalScore;
}

/**
 * Get the recording interval for frame capture
 * @returns Recording interval in milliseconds
 */
export function getRecordingInterval(): number {
  return RECORDING_INTERVAL;
}

/**
 * Render ghost orb on canvas
 * Requirements: 15.1 - Display semi-transparent ghost
 * @param ctx - Canvas rendering context
 * @param x - X position
 * @param y - Y position (pixel)
 * @param radius - Orb radius
 * @param isSwapped - Whether ghost orbs are swapped
 * @param topColor - Top orb color
 * @param bottomColor - Bottom orb color
 * @param connectorLength - Length of connector
 */
export function renderGhost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  isSwapped: boolean,
  topColor: string,
  bottomColor: string,
  connectorLength: number
): void {
  const halfLen = connectorLength / 2;
  
  // Calculate orb positions based on swap state
  const rotationAngle = isSwapped ? Math.PI : 0;
  const yOffset = Math.cos(rotationAngle) * halfLen;
  
  const topOrbY = y - yOffset;
  const bottomOrbY = y + yOffset;

  // Set ghost transparency - Requirements 15.1
  ctx.globalAlpha = 0.4;

  // Draw connector
  ctx.beginPath();
  ctx.moveTo(x, topOrbY);
  ctx.lineTo(x, bottomOrbY);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(128, 128, 128, 0.4)';
  ctx.stroke();

  // Draw top orb (ghost style)
  ctx.beginPath();
  ctx.arc(x, topOrbY, radius, 0, Math.PI * 2);
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw bottom orb (ghost style)
  ctx.beginPath();
  ctx.arc(x, bottomOrbY, radius, 0, Math.PI * 2);
  ctx.fillStyle = bottomColor;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Reset alpha
  ctx.globalAlpha = 1.0;
}

/**
 * Render "Ahead" indicator
 * Requirements: 15.3 - Visual indicator when player surpasses ghost
 * @param ctx - Canvas rendering context
 * @param x - X position
 * @param y - Y position
 */
export function renderAheadIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  ctx.save();
  
  // Draw "AHEAD" text with glow effect
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Glow effect
  ctx.shadowColor = '#00FF00';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#00FF00';
  ctx.fillText('▲ AHEAD', x, y - 50);
  
  ctx.restore();
}

/**
 * Serialize ghost timeline to JSON string
 * Requirements: 15.5 - Encode timeline data as JSON
 * @param timeline - Timeline to serialize
 * @returns JSON string
 */
export function serializeTimeline(timeline: GhostTimeline): string {
  return JSON.stringify(timeline);
}

/**
 * Deserialize ghost timeline from JSON string
 * Requirements: 15.6 - Parse JSON and reconstruct timeline
 * @param json - JSON string to parse
 * @returns Parsed timeline or null if invalid
 */
export function deserializeTimeline(json: string): GhostTimeline | null {
  try {
    const parsed = JSON.parse(json);
    
    // Validate structure
    if (
      parsed &&
      Array.isArray(parsed.frames) &&
      typeof parsed.finalScore === 'number' &&
      typeof parsed.recordedAt === 'number'
    ) {
      // Validate each frame
      const validFrames = parsed.frames.every(
        (frame: unknown) =>
          frame &&
          typeof (frame as GhostFrame).timestamp === 'number' &&
          typeof (frame as GhostFrame).score === 'number' &&
          typeof (frame as GhostFrame).playerY === 'number' &&
          typeof (frame as GhostFrame).isSwapped === 'boolean'
      );
      
      if (validFrames) {
        return parsed as GhostTimeline;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
