/**
 * Resonance System (Harmonic Resonance / Fever Mode)
 * Requirements: 1.1, 1.2, 1.4, 1.5, 1.7, 1.8
 * 
 * Activates when rhythm streak reaches threshold, providing:
 * - Color inversion visual effect
 * - Obstacle destruction on collision
 * - Bonus points per destroyed obstacle
 * - Timed duration with smooth transition
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Resonance state tracking
 */
export interface ResonanceState {
  isActive: boolean;
  remainingTime: number;      // ms remaining
  obstaclesDestroyed: number; // count of destroyed obstacles this activation
  bonusScore: number;         // total bonus earned this activation
  transitionFactor: number;   // 0-1 for color transition (0=normal, 1=inverted)
  activationTime: number;     // timestamp when activated
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
 */
export function createInitialResonanceState(): ResonanceState {
  return {
    isActive: false,
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
    isActive: true,
    remainingTime: config.duration,
    obstaclesDestroyed: 0,
    bonusScore: 0,
    transitionFactor: 0, // Will transition to 1 over transitionDuration
    activationTime: currentTime,
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
    remainingTime: 0,
    transitionFactor: state.transitionFactor, // Will transition back to 0
  };
}

/**
 * Updates resonance state each frame
 * Requirements 1.7, 1.8, 1.9: Timer countdown and transition handling
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
    
    // Validate required fields
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

    return parsed as ResonanceState;
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
  };
}
