/**
 * Resonance System (Harmonic Resonance / Fever Mode)
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 1.8, 5.1, 5.2, 5.3, 5.4, 6.2
 * 
 * Activates when rhythm streak reaches threshold, providing:
 * - Color inversion visual effect
 * - Obstacle destruction on collision
 * - Bonus points per destroyed obstacle
 * - Timed duration with smooth transition
 * - Streak tracking for activation
 * - Pause/resume support for Overdrive override
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Resonance state tracking (Enhanced for v2.0)
 * Requirements 5.1, 5.4: Streak tracking and pause support
 */
export interface ResonanceState {
  isActive: boolean;
  isPaused: boolean;              // NEW: For Overdrive override - Requirements 5.4
  pausedTimeRemaining: number;    // NEW: Frozen timer during pause - Requirements 5.4
  streakCount: number;            // NEW: Rhythm streak counter - Requirements 5.1, 5.2, 5.3
  multiplier: number;             // NEW: Score multiplier (x2 when active) - Requirements 6.2
  remainingTime: number;          // ms remaining
  obstaclesDestroyed: number;     // count of destroyed obstacles this activation
  bonusScore: number;             // total bonus earned this activation
  transitionFactor: number;       // 0-1 for color transition (0=normal, 1=inverted)
  activationTime: number;         // timestamp when activated
}

/**
 * Resonance configuration
 */
export interface ResonanceConfig {
  activationThreshold: number;  // streak count to activate (10)
  duration: number;             // ms (10000)
  bonusPerObstacle: number;     // points (50)
  transitionDuration: number;   // ms (500)
}

/**
 * Collision result during resonance
 */
export interface ResonanceCollisionResult {
  destroyed: boolean;
  bonus: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const RESONANCE_CONFIG: ResonanceConfig = {
  activationThreshold: 10,    // Requirements 1.1: streak of 10
  duration: 10000,            // Requirements 1.7: 10 seconds
  bonusPerObstacle: 50,       // Requirements 1.5: 50 bonus points
  transitionDuration: 500,    // Requirements 1.9: 0.5 second transition
};

// ============================================================================
// State Factory
// ============================================================================

/**
 * Creates initial resonance state
 * Requirements 5.1, 5.4: Initialize streak and pause fields
 */
export function createInitialResonanceState(): ResonanceState {
  return {
    isActive: false,
    isPaused: false,
    pausedTimeRemaining: 0,
    streakCount: 0,
    multiplier: 1,
    remainingTime: 0,
    obstaclesDestroyed: 0,
    bonusScore: 0,
    transitionFactor: 0,
    activationTime: 0,
  };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Checks if resonance should activate based on streak count
 * Requirements 1.1: Activate when streak reaches 10
 * 
 * @param streakCount - Current rhythm streak count
 * @param config - Resonance configuration
 * @returns true if resonance should activate
 */
export function checkActivation(
  streakCount: number,
  config: ResonanceConfig = RESONANCE_CONFIG
): boolean {
  return streakCount >= config.activationThreshold;
}

// ============================================================================
// Streak Management Functions - Requirements 5.1, 5.2, 5.3
// ============================================================================

/**
 * Updates streak count based on rhythm hit result
 * Requirements 5.2: Increment streak on rhythm hit
 * Requirements 5.3: Reset streak on miss
 * 
 * @param state - Current resonance state
 * @param isRhythmHit - Whether the player hit the rhythm timing
 * @returns Updated resonance state
 */
export function updateStreak(
  state: ResonanceState,
  isRhythmHit: boolean
): ResonanceState {
  if (isRhythmHit) {
    // Requirements 5.2: Increment streak counter for each pass within rhythm tolerance
    return {
      ...state,
      streakCount: state.streakCount + 1,
    };
  } else {
    // Requirements 5.3: Reset streak counter to zero on miss
    return {
      ...state,
      streakCount: 0,
    };
  }
}

/**
 * Activates resonance mode when streak reaches threshold
 * Requirements 5.1: Trigger when streak reaches 10
 * Requirements 5.4: Don't reset or extend duration if already active
 * 
 * @param state - Current resonance state
 * @param currentTime - Current timestamp in ms
 * @param config - Resonance configuration
 * @returns Updated resonance state
 */
export function activateResonance(
  state: ResonanceState,
  currentTime: number = Date.now(),
  config: ResonanceConfig = RESONANCE_CONFIG
): ResonanceState {
  // Requirements 5.4: Don't reset or extend if already active
  if (state.isActive) {
    return state;
  }

  // Requirements 5.1: Activate when streak reaches threshold
  if (state.streakCount < config.activationThreshold) {
    return state;
  }

  return {
    ...state,
    isActive: true,
    isPaused: false,
    pausedTimeRemaining: 0,
    remainingTime: config.duration,
    multiplier: 2, // Requirements 6.2: x2 score multiplier
    obstaclesDestroyed: 0,
    bonusScore: 0,
    transitionFactor: 0,
    activationTime: currentTime,
    streakCount: 0, // Reset streak after activation
  };
}

/**
 * Activates resonance mode
 * Requirements 1.7: Start 10-second countdown timer
 * 
 * @param state - Current resonance state
 * @param currentTime - Current timestamp in ms
 * @param config - Resonance configuration
 * @returns Updated resonance state
 */
export function activate(
  state: ResonanceState,
  currentTime: number,
  config: ResonanceConfig = RESONANCE_CONFIG
): ResonanceState {
  // Don't re-activate if already active
  if (state.isActive) {
    return state;
  }

  return {
    ...state,
    isActive: true,
    isPaused: false,
    pausedTimeRemaining: 0,
    multiplier: 2, // Requirements 6.2: x2 score multiplier
    remainingTime: config.duration,
    obstaclesDestroyed: 0,
    bonusScore: 0,
    transitionFactor: 0, // Will transition to 1 over transitionDuration
    activationTime: currentTime,
    streakCount: 0, // Reset streak after activation
  };
}

/**
 * Deactivates resonance mode
 * Requirements 1.8: Deactivate when timer expires
 * 
 * @param state - Current resonance state
 * @returns Updated resonance state
 */
export function deactivate(state: ResonanceState): ResonanceState {
  return {
    ...state,
    isActive: false,
    isPaused: false,
    pausedTimeRemaining: 0,
    multiplier: 1, // Reset multiplier to 1
    remainingTime: 0,
    transitionFactor: state.transitionFactor, // Will transition back to 0
  };
}

// ============================================================================
// Pause/Resume Functions - Requirements 5.4, State Priority System
// ============================================================================

/**
 * Pauses resonance mode (for Overdrive override)
 * Requirements 5.4: Freeze timer during Overdrive
 * State Priority System: Overdrive > Resonance
 * 
 * @param state - Current resonance state
 * @returns Updated resonance state with paused timer
 */
export function pauseResonance(state: ResonanceState): ResonanceState {
  // Only pause if active and not already paused
  if (!state.isActive || state.isPaused) {
    return state;
  }

  return {
    ...state,
    isPaused: true,
    pausedTimeRemaining: state.remainingTime,
  };
}

/**
 * Resumes resonance mode (after Overdrive ends)
 * Requirements 5.4: Restore from frozen timer
 * State Priority System: Resume when Overdrive ends
 * 
 * @param state - Current resonance state
 * @returns Updated resonance state with restored timer
 */
export function resumeResonance(state: ResonanceState): ResonanceState {
  // Only resume if active and paused
  if (!state.isActive || !state.isPaused) {
    return state;
  }

  return {
    ...state,
    isPaused: false,
    remainingTime: state.pausedTimeRemaining,
    pausedTimeRemaining: 0,
  };
}

// ============================================================================
// Score Multiplier - Requirements 6.2
// ============================================================================

/**
 * Calculates the current score multiplier
 * Requirements 6.2: x2 multiplier when Resonance is active
 * 
 * @param state - Current resonance state
 * @returns Score multiplier (1 or 2)
 */
export function calculateScoreMultiplier(state: ResonanceState): number {
  // Requirements 6.2: x2 when active (and not paused)
  if (state.isActive && !state.isPaused) {
    return 2;
  }
  return 1;
}

/**
 * Updates resonance state each frame
 * Requirements 1.7, 1.8, 1.9, 5.4: Timer countdown, transition handling, and pause support
 * 
 * @param state - Current resonance state
 * @param deltaTime - Time elapsed since last update in ms
 * @param currentTime - Current timestamp in ms
 * @param config - Resonance configuration
 * @returns Updated resonance state
 */
export function update(
  state: ResonanceState,
  deltaTime: number,
  currentTime: number,
  config: ResonanceConfig = RESONANCE_CONFIG
): ResonanceState {
  let newState = { ...state };

  if (state.isActive) {
    // Requirements 5.4: Don't update timer if paused (Overdrive override)
    if (!state.isPaused) {
      // Update remaining time
      newState.remainingTime = Math.max(0, state.remainingTime - deltaTime);

      // Update transition factor (fade in)
      const timeSinceActivation = currentTime - state.activationTime;
      if (timeSinceActivation < config.transitionDuration) {
        newState.transitionFactor = timeSinceActivation / config.transitionDuration;
      } else {
        newState.transitionFactor = 1;
      }

      // Check for expiration - Requirements 1.8
      if (newState.remainingTime <= 0) {
        newState = deactivate(newState);
      }
    }
    // When paused, timer is frozen - Requirements 5.4
  } else {
    // Fade out transition - Requirements 1.9
    if (state.transitionFactor > 0) {
      newState.transitionFactor = Math.max(0, state.transitionFactor - (deltaTime / config.transitionDuration));
    }
  }

  return newState;
}

/**
 * Handles collision during resonance mode
 * Requirements 1.4, 1.5: Destroy obstacle and award bonus
 * 
 * @param state - Current resonance state
 * @param config - Resonance configuration
 * @returns Collision result and updated state
 */
export function handleCollision(
  state: ResonanceState,
  config: ResonanceConfig = RESONANCE_CONFIG
): { result: ResonanceCollisionResult; newState: ResonanceState } {
  // If not active, collision is not handled by resonance
  if (!state.isActive) {
    return {
      result: { destroyed: false, bonus: 0 },
      newState: state,
    };
  }

  // Requirements 1.4: Destroy obstacle instead of ending game
  // Requirements 1.5: Award 50 bonus points
  const bonus = config.bonusPerObstacle;

  const newState: ResonanceState = {
    ...state,
    obstaclesDestroyed: state.obstaclesDestroyed + 1,
    bonusScore: state.bonusScore + bonus,
  };

  return {
    result: { destroyed: true, bonus },
    newState,
  };
}

/**
 * Gets the current color inversion factor for rendering
 * Requirements 1.2, 1.9: Color inversion with smooth transition
 * 
 * @param state - Current resonance state
 * @returns Object with transition factor (0 = normal, 1 = fully inverted)
 */
export function getColorInversion(state: ResonanceState): { factor: number } {
  return { factor: state.transitionFactor };
}

/**
 * Resets resonance state to initial values
 * Resets streak, multiplier, and pause state
 * 
 * @returns Fresh resonance state
 */
export function reset(): ResonanceState {
  return createInitialResonanceState();
}

// ============================================================================
// Color Inversion Utilities - Requirements 1.2
// ============================================================================

/**
 * Inverts a hex color
 * Requirements 1.2: Black becomes white, white becomes black
 * 
 * @param color - Hex color string (e.g., '#FFFFFF' or '#FFF')
 * @returns Inverted hex color string
 */
export function invertColor(color: string): string {
  // Remove # prefix if present
  let hex = color.replace('#', '');

  // Handle shorthand hex (e.g., #FFF -> #FFFFFF)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Validate hex length
  if (hex.length !== 6) {
    // Return original color if invalid
    return color;
  }

  // Parse RGB components
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Check for NaN (invalid hex)
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return color;
  }

  // Invert each component (255 - value)
  const invertedR = 255 - r;
  const invertedG = 255 - g;
  const invertedB = 255 - b;

  // Convert back to hex
  const invertedHex = 
    invertedR.toString(16).padStart(2, '0') +
    invertedG.toString(16).padStart(2, '0') +
    invertedB.toString(16).padStart(2, '0');

  return `#${invertedHex}`;
}

/**
 * Interpolates between two colors based on factor
 * Used for smooth color transitions
 * 
 * @param color1 - Starting color (hex)
 * @param color2 - Ending color (hex)
 * @param factor - Interpolation factor (0-1)
 * @returns Interpolated color (hex)
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  // Clamp factor to 0-1
  const t = Math.max(0, Math.min(1, factor));

  // Parse colors
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  // Handle shorthand
  const h1 = hex1.length === 3 ? hex1[0] + hex1[0] + hex1[1] + hex1[1] + hex1[2] + hex1[2] : hex1;
  const h2 = hex2.length === 3 ? hex2[0] + hex2[0] + hex2[1] + hex2[1] + hex2[2] + hex2[2] : hex2;

  const r1 = parseInt(h1.substring(0, 2), 16);
  const g1 = parseInt(h1.substring(2, 4), 16);
  const b1 = parseInt(h1.substring(4, 6), 16);

  const r2 = parseInt(h2.substring(0, 2), 16);
  const g2 = parseInt(h2.substring(2, 4), 16);
  const b2 = parseInt(h2.substring(4, 6), 16);

  // Interpolate
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Gets the resonance orb color (bright cyan with glow)
 * Requirements 1.3: Orb colors change to bright cyan
 * 
 * @returns Resonance orb color
 */
export function getResonanceOrbColor(): string {
  return '#00F0FF'; // Bright cyan
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serializes resonance state to JSON string
 * 
 * @param state - Resonance state to serialize
 * @returns JSON string
 */
export function serialize(state: ResonanceState): string {
  return JSON.stringify(state);
}

/**
 * Deserializes resonance state from JSON string
 * 
 * @param data - JSON string to parse
 * @returns Parsed resonance state or initial state if invalid
 */
export function deserialize(data: string): ResonanceState {
  try {
    const parsed = JSON.parse(data);
    
    // Validate required fields (including new v2 fields)
    if (
      typeof parsed.isActive !== 'boolean' ||
      typeof parsed.remainingTime !== 'number' ||
      typeof parsed.obstaclesDestroyed !== 'number' ||
      typeof parsed.bonusScore !== 'number' ||
      typeof parsed.transitionFactor !== 'number' ||
      typeof parsed.activationTime !== 'number'
    ) {
      return createInitialResonanceState();
    }

    // Ensure new v2 fields have defaults if missing (backward compatibility)
    return {
      ...createInitialResonanceState(),
      ...parsed,
      isPaused: typeof parsed.isPaused === 'boolean' ? parsed.isPaused : false,
      pausedTimeRemaining: typeof parsed.pausedTimeRemaining === 'number' ? parsed.pausedTimeRemaining : 0,
      streakCount: typeof parsed.streakCount === 'number' ? parsed.streakCount : 0,
      multiplier: typeof parsed.multiplier === 'number' ? parsed.multiplier : 1,
    };
  } catch {
    return createInitialResonanceState();
  }
}

// ============================================================================
// System Interface
// ============================================================================

/**
 * Resonance System interface for external use
 */
export interface ResonanceSystem {
  state: ResonanceState;
  config: ResonanceConfig;
  
  checkActivation: (streakCount: number) => boolean;
  activate: () => void;
  deactivate: () => void;
  update: (deltaTime: number, currentTime: number) => void;
  handleCollision: () => ResonanceCollisionResult;
  getColorInversion: () => { factor: number };
  reset: () => void;
  // New v2 methods
  updateStreak: (isRhythmHit: boolean) => void;
  activateResonance: () => void;
  pauseResonance: () => void;
  resumeResonance: () => void;
  calculateScoreMultiplier: () => number;
}

/**
 * Creates a resonance system instance
 * 
 * @param config - Optional custom configuration
 * @returns Resonance system instance
 */
export function createResonanceSystem(config: ResonanceConfig = RESONANCE_CONFIG): ResonanceSystem {
  let state = createInitialResonanceState();

  return {
    get state() {
      return state;
    },
    config,

    checkActivation(streakCount: number): boolean {
      return checkActivation(streakCount, config);
    },

    activate(): void {
      state = activate(state, Date.now(), config);
    },

    deactivate(): void {
      state = deactivate(state);
    },

    update(deltaTime: number, currentTime: number): void {
      state = update(state, deltaTime, currentTime, config);
    },

    handleCollision(): ResonanceCollisionResult {
      const { result, newState } = handleCollision(state, config);
      state = newState;
      return result;
    },

    getColorInversion(): { factor: number } {
      return getColorInversion(state);
    },

    reset(): void {
      state = createInitialResonanceState();
    },

    // New v2 methods - Requirements 5.1, 5.2, 5.3, 5.4, 6.2
    updateStreak(isRhythmHit: boolean): void {
      state = updateStreak(state, isRhythmHit);
    },

    activateResonance(): void {
      state = activateResonance(state, Date.now(), config);
    },

    pauseResonance(): void {
      state = pauseResonance(state);
    },

    resumeResonance(): void {
      state = resumeResonance(state);
    },

    calculateScoreMultiplier(): number {
      return calculateScoreMultiplier(state);
    },
  };
}
