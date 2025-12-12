/**
 * Screen Shake System - Requirements 10.1, 10.2, 10.3, 10.4
 * 
 * Provides camera shake effects for impactful feedback during collisions
 * and near miss streaks.
 */

// Shake configuration - Requirements 10.1, 10.2
export interface ShakeConfig {
  intensity: number;    // 0-1 range, maximum offset magnitude
  duration: number;     // Duration in milliseconds
  frequency: number;    // Oscillation frequency (higher = faster shake)
  decay: boolean;       // Whether intensity decays over time
}

// Screen shake state - Requirements 10.3, 10.4
export interface ScreenShakeState {
  active: boolean;
  offsetX: number;
  offsetY: number;
  startTime: number;
  config: ShakeConfig;
}

// Default shake configurations for different events
export const SHAKE_CONFIGS = {
  // Requirements 10.1: Collision shake - strong impact
  collision: {
    intensity: 15,      // Maximum 15px offset
    duration: 300,      // 300ms duration
    frequency: 30,      // Fast shake
    decay: true,        // Decays over time
  } as ShakeConfig,
  
  // Requirements 10.2: Near miss/critical hit - subtle shake
  nearMiss: {
    intensity: 5,       // Maximum 5px offset
    duration: 150,      // 150ms duration
    frequency: 40,      // Very fast, subtle
    decay: true,        // Decays over time
  } as ShakeConfig,
  
  // Streak bonus shake - medium impact
  streakBonus: {
    intensity: 8,       // Maximum 8px offset
    duration: 200,      // 200ms duration
    frequency: 35,      // Medium-fast
    decay: true,        // Decays over time
  } as ShakeConfig,
};

// Internal state
let shakeState: ScreenShakeState = {
  active: false,
  offsetX: 0,
  offsetY: 0,
  startTime: 0,
  config: SHAKE_CONFIGS.collision,
};

/**
 * Creates the initial screen shake state
 */
export function createInitialShakeState(): ScreenShakeState {
  return {
    active: false,
    offsetX: 0,
    offsetY: 0,
    startTime: 0,
    config: SHAKE_CONFIGS.collision,
  };
}

/**
 * Triggers a screen shake effect
 * Requirements 10.1, 10.2: Apply camera shake with configurable intensity and duration
 * 
 * @param config - Shake configuration
 */
export function trigger(config: ShakeConfig): void {
  shakeState = {
    active: true,
    offsetX: 0,
    offsetY: 0,
    startTime: Date.now(),
    config: { ...config },
  };
}

/**
 * Triggers a collision shake effect
 * Requirements 10.1: Apply shake on collision
 */
export function triggerCollision(): void {
  trigger(SHAKE_CONFIGS.collision);
}

/**
 * Triggers a near miss shake effect
 * Requirements 10.2: Apply subtle shake on near miss/critical hit
 */
export function triggerNearMiss(): void {
  trigger(SHAKE_CONFIGS.nearMiss);
}

/**
 * Triggers a streak bonus shake effect
 */
export function triggerStreakBonus(): void {
  trigger(SHAKE_CONFIGS.streakBonus);
}

/**
 * Updates the screen shake state
 * Requirements 10.3, 10.4: Calculate offset and handle decay
 * 
 * @param currentTime - Current timestamp in milliseconds
 */
export function update(currentTime: number): void {
  if (!shakeState.active) {
    return;
  }
  
  const elapsed = currentTime - shakeState.startTime;
  const { duration, intensity, frequency, decay } = shakeState.config;
  
  // Requirements 10.4: Check if shake duration has expired
  if (elapsed >= duration) {
    // Smoothly return to neutral position
    shakeState.active = false;
    shakeState.offsetX = 0;
    shakeState.offsetY = 0;
    return;
  }
  
  // Calculate progress (0 to 1)
  const progress = elapsed / duration;
  
  // Calculate decay factor if enabled
  // Requirements 10.4: Smoothly return to neutral position
  const decayFactor = decay ? 1 - progress : 1;
  
  // Calculate current intensity with decay
  const currentIntensity = intensity * decayFactor;
  
  // Calculate oscillation using sine waves with different phases for X and Y
  // This creates a more natural, random-feeling shake
  const time = elapsed * frequency * 0.001; // Convert to appropriate time scale
  
  // Use different frequencies for X and Y to avoid predictable patterns
  const shakeX = Math.sin(time * Math.PI * 2) * currentIntensity;
  const shakeY = Math.cos(time * Math.PI * 2 * 1.3) * currentIntensity; // Slightly different frequency
  
  // Add some randomness for more organic feel
  const randomFactor = 0.3;
  const randomX = (Math.random() - 0.5) * 2 * currentIntensity * randomFactor;
  const randomY = (Math.random() - 0.5) * 2 * currentIntensity * randomFactor;
  
  // Requirements 10.3: Offset values stay within [-intensity, intensity] range
  shakeState.offsetX = Math.max(-intensity, Math.min(intensity, shakeX + randomX));
  shakeState.offsetY = Math.max(-intensity, Math.min(intensity, shakeY + randomY));
}

/**
 * Gets the current shake offset
 * Requirements 10.3: Return offset values for canvas rendering
 * 
 * @returns Current X and Y offset values
 */
export function getOffset(): { x: number; y: number } {
  return {
    x: shakeState.offsetX,
    y: shakeState.offsetY,
  };
}

/**
 * Checks if screen shake is currently active
 */
export function isActive(): boolean {
  return shakeState.active;
}

/**
 * Gets the current shake state (for testing/debugging)
 */
export function getState(): ScreenShakeState {
  return { ...shakeState };
}

/**
 * Resets the screen shake system to initial state
 * Requirements 10.4: Return canvas to neutral position
 */
export function reset(): void {
  shakeState = createInitialShakeState();
}

/**
 * Screen Shake System interface
 */
export interface ScreenShakeSystem {
  state: ScreenShakeState;
  trigger: (config: ShakeConfig) => void;
  triggerCollision: () => void;
  triggerNearMiss: () => void;
  triggerStreakBonus: () => void;
  update: (currentTime: number) => void;
  getOffset: () => { x: number; y: number };
  isActive: () => boolean;
  reset: () => void;
}

/**
 * Creates a new screen shake system instance
 */
export function createScreenShakeSystem(): ScreenShakeSystem {
  return {
    get state() {
      return getState();
    },
    trigger,
    triggerCollision,
    triggerNearMiss,
    triggerStreakBonus,
    update,
    getOffset,
    isActive,
    reset,
  };
}
