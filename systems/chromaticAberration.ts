/**
 * Chromatic Aberration System - Requirements 11.1, 11.2, 11.3
 * 
 * Provides RGB channel separation effect that activates during rhythm streaks.
 * The effect intensity scales with the streak multiplier level.
 */

// Chromatic aberration configuration
export interface ChromaticAberrationConfig {
  maxSeparation: number;      // Maximum RGB channel separation in pixels
  fadeInDuration: number;     // Duration to fade in effect (ms)
  fadeOutDuration: number;    // Duration to fade out effect (ms)
  baseIntensity: number;      // Base intensity multiplier (0-1)
}

// Chromatic aberration state
export interface ChromaticAberrationState {
  active: boolean;
  intensity: number;          // Current intensity (0-1)
  targetIntensity: number;    // Target intensity to animate towards
  streakLevel: number;        // Current rhythm streak level (1, 2, or 3)
  lastUpdateTime: number;     // Last update timestamp
  separation: {               // Current RGB channel separation
    r: { x: number; y: number };
    g: { x: number; y: number };
    b: { x: number; y: number };
  };
}

// Default configuration
export const CHROMATIC_ABERRATION_CONFIG: ChromaticAberrationConfig = {
  maxSeparation: 8,           // Maximum 8px separation at full intensity
  fadeInDuration: 300,        // 300ms fade in
  fadeOutDuration: 500,       // 500ms fade out
  baseIntensity: 0.3,         // 30% base intensity at x2 multiplier
};

// Internal state
let state: ChromaticAberrationState = createInitialState();

/**
 * Creates the initial chromatic aberration state
 */
export function createInitialState(): ChromaticAberrationState {
  return {
    active: false,
    intensity: 0,
    targetIntensity: 0,
    streakLevel: 1,
    lastUpdateTime: Date.now(),
    separation: {
      r: { x: 0, y: 0 },
      g: { x: 0, y: 0 },
      b: { x: 0, y: 0 },
    },
  };
}

/**
 * Calculates intensity based on streak level
 * Requirements 11.2: Increase separation intensity proportionally with rhythm multiplier
 * 
 * @param streakLevel - Current rhythm multiplier (1, 2, or 3)
 * @param config - Chromatic aberration configuration
 * @returns Target intensity (0-1)
 */
export function calculateIntensityForStreak(
  streakLevel: number,
  config: ChromaticAberrationConfig = CHROMATIC_ABERRATION_CONFIG
): number {
  if (streakLevel <= 1) {
    return 0; // No effect at x1 multiplier
  }
  
  // x2 = baseIntensity (0.3), x3 = 1.0 (full intensity)
  if (streakLevel === 2) {
    return config.baseIntensity;
  }
  
  // x3 or higher = full intensity
  return 1.0;
}

/**
 * Calculates RGB channel separation offsets based on intensity
 * Requirements 11.1: Apply RGB channel separation to the rendered frame
 * 
 * @param intensity - Current intensity (0-1)
 * @param config - Chromatic aberration configuration
 * @returns Separation offsets for R, G, B channels
 */
export function calculateSeparation(
  intensity: number,
  config: ChromaticAberrationConfig = CHROMATIC_ABERRATION_CONFIG
): ChromaticAberrationState['separation'] {
  const separation = intensity * config.maxSeparation;
  
  // Red channel shifts left/up, Blue channel shifts right/down
  // Green channel stays centered
  return {
    r: { x: -separation, y: -separation * 0.5 },
    g: { x: 0, y: 0 },
    b: { x: separation, y: separation * 0.5 },
  };
}

/**
 * Sets the rhythm streak level and triggers effect
 * Requirements 11.1: Apply effect when rhythm streak is active
 * 
 * @param streakLevel - Current rhythm multiplier (1, 2, or 3)
 */
export function setStreakLevel(streakLevel: number): void {
  state.streakLevel = streakLevel;
  state.targetIntensity = calculateIntensityForStreak(streakLevel);
  
  // Activate effect if streak level > 1
  if (streakLevel > 1 && !state.active) {
    state.active = true;
  }
}

/**
 * Triggers the chromatic aberration effect to fade out
 * Requirements 11.3: Smoothly fade the effect back to zero when streak ends
 */
export function endStreak(): void {
  state.targetIntensity = 0;
  state.streakLevel = 1;
}

/**
 * Updates the chromatic aberration state
 * Requirements 11.2, 11.3: Handle intensity scaling and fade animations
 * 
 * @param currentTime - Current timestamp in milliseconds
 * @param config - Chromatic aberration configuration
 */
export function update(
  currentTime: number,
  config: ChromaticAberrationConfig = CHROMATIC_ABERRATION_CONFIG
): void {
  const deltaTime = currentTime - state.lastUpdateTime;
  state.lastUpdateTime = currentTime;
  
  // Calculate fade speed based on direction
  const isFadingIn = state.targetIntensity > state.intensity;
  const fadeDuration = isFadingIn ? config.fadeInDuration : config.fadeOutDuration;
  const fadeSpeed = deltaTime / fadeDuration;
  
  // Animate intensity towards target
  if (Math.abs(state.targetIntensity - state.intensity) > 0.001) {
    if (isFadingIn) {
      state.intensity = Math.min(state.targetIntensity, state.intensity + fadeSpeed);
    } else {
      state.intensity = Math.max(state.targetIntensity, state.intensity - fadeSpeed);
    }
  } else {
    state.intensity = state.targetIntensity;
  }
  
  // Deactivate when fully faded out
  if (state.intensity <= 0 && state.targetIntensity <= 0) {
    state.active = false;
    state.intensity = 0;
  }
  
  // Update separation values
  state.separation = calculateSeparation(state.intensity, config);
}

/**
 * Gets the current separation offsets for rendering
 * 
 * @returns Current RGB channel separation offsets
 */
export function getSeparation(): ChromaticAberrationState['separation'] {
  return { ...state.separation };
}

/**
 * Gets the current intensity
 * 
 * @returns Current intensity (0-1)
 */
export function getIntensity(): number {
  return state.intensity;
}

/**
 * Checks if the effect is currently active
 * 
 * @returns True if effect is active
 */
export function isActive(): boolean {
  return state.active && state.intensity > 0;
}

/**
 * Gets the current state (for testing/debugging)
 * 
 * @returns Copy of current state
 */
export function getState(): ChromaticAberrationState {
  return { ...state };
}

/**
 * Resets the chromatic aberration system to initial state
 */
export function reset(): void {
  state = createInitialState();
}

/**
 * Applies chromatic aberration effect to canvas
 * Requirements 11.1: Apply RGB channel separation as post-process effect
 * 
 * This function should be called after all other rendering is complete.
 * It creates the RGB separation effect by drawing the canvas content
 * multiple times with different blend modes and offsets.
 * 
 * @param ctx - Canvas 2D rendering context
 * @param canvas - The canvas element
 */
export function applyEffect(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement
): void {
  if (!isActive()) return;
  
  const separation = getSeparation();
  const intensity = getIntensity();
  
  // Skip if separation is negligible
  if (Math.abs(separation.r.x) < 0.5 && Math.abs(separation.b.x) < 0.5) return;
  
  // Save current canvas state
  ctx.save();
  
  // Create temporary canvas for the effect
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    ctx.restore();
    return;
  }
  
  // Copy current canvas to temp
  tempCtx.drawImage(canvas, 0, 0);
  
  // Apply chromatic aberration by drawing offset color channels
  // The effect is subtle - we overlay shifted versions with low opacity
  
  // Red channel shift (left/up)
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = intensity * 0.15;
  ctx.drawImage(
    tempCanvas,
    separation.r.x,
    separation.r.y
  );
  
  // Blue channel shift (right/down)
  ctx.globalAlpha = intensity * 0.15;
  ctx.drawImage(
    tempCanvas,
    separation.b.x,
    separation.b.y
  );
  
  // Restore canvas state
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
  ctx.restore();
}

/**
 * Chromatic Aberration System interface
 */
export interface ChromaticAberrationSystem {
  state: ChromaticAberrationState;
  setStreakLevel: (level: number) => void;
  endStreak: () => void;
  update: (currentTime: number) => void;
  getSeparation: () => ChromaticAberrationState['separation'];
  getIntensity: () => number;
  isActive: () => boolean;
  applyEffect: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void;
  reset: () => void;
}

/**
 * Creates a new chromatic aberration system instance
 */
export function createChromaticAberrationSystem(): ChromaticAberrationSystem {
  return {
    get state() {
      return getState();
    },
    setStreakLevel,
    endStreak,
    update,
    getSeparation,
    getIntensity,
    isActive,
    applyEffect,
    reset,
  };
}
