/**
 * Haptic Feedback System
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 * 
 * Provides tactile feedback for mobile players:
 * - Light pulse for swap actions (10ms)
 * - Heavy impact for collisions (50ms)
 * - Medium pulse for near misses (25ms)
 * - Success pattern for resonance activation (double pulse)
 * - Selection feedback for UI buttons (5ms)
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Types of haptic feedback available
 */
export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success';

/**
 * Haptic configuration with durations in milliseconds
 */
export interface HapticConfig {
  light: number;      // 10ms - swap action
  medium: number;     // 25ms - near miss
  heavy: number;      // 50ms - collision
  selection: number;  // 5ms - UI button press
  success: number[];  // [10, 50, 10] - resonance activation pattern
}

/**
 * Haptic system state
 */
export interface HapticState {
  isEnabled: boolean;
  isSupported: boolean;
}

/**
 * Haptic system interface
 */
export interface HapticSystem {
  state: HapticState;
  config: HapticConfig;
  
  trigger: (type: HapticType) => void;
  setEnabled: (enabled: boolean) => void;
  checkSupport: () => boolean;
  getState: () => HapticState;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const HAPTIC_CONFIG: HapticConfig = {
  light: 10,           // Requirements 4.1: light haptic pulse (10ms)
  medium: 25,          // Requirements 4.3: medium haptic pulse (25ms)
  heavy: 50,           // Requirements 4.2: heavy haptic impact (50ms)
  selection: 5,        // Requirements 4.5: selection haptic (5ms)
  success: [10, 50, 10], // Requirements 4.4: success pattern (double pulse)
};


// ============================================================================
// State Factory
// ============================================================================

/**
 * Creates initial haptic state
 * Requirements 4.7: Check for device support
 */
export function createInitialHapticState(): HapticState {
  return {
    isEnabled: true,
    isSupported: checkVibrationSupport(),
  };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Checks if the Vibration API is supported
 * Requirements 4.7: Gracefully degrade without errors
 * 
 * @returns true if vibration is supported
 */
export function checkVibrationSupport(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Gets the vibration pattern for a haptic type
 * 
 * @param type - Type of haptic feedback
 * @param config - Haptic configuration
 * @returns Vibration pattern (number or array of numbers)
 */
export function getVibrationPattern(
  type: HapticType,
  config: HapticConfig = HAPTIC_CONFIG
): number | number[] {
  switch (type) {
    case 'light':
      return config.light;
    case 'medium':
      return config.medium;
    case 'heavy':
      return config.heavy;
    case 'selection':
      return config.selection;
    case 'success':
      return config.success;
    default:
      return config.light;
  }
}

/**
 * Triggers haptic feedback
 * Requirements 4.1-4.5: Various haptic patterns
 * Requirements 4.6: Respect enabled setting
 * Requirements 4.7: Gracefully degrade if not supported
 * 
 * @param type - Type of haptic feedback
 * @param state - Current haptic state
 * @param config - Haptic configuration
 * @returns true if haptic was triggered, false otherwise
 */
export function triggerHaptic(
  type: HapticType,
  state: HapticState,
  config: HapticConfig = HAPTIC_CONFIG
): boolean {
  // Requirements 4.6: Skip if disabled
  if (!state.isEnabled) {
    return false;
  }

  // Requirements 4.7: Skip if not supported
  if (!state.isSupported) {
    return false;
  }

  try {
    const pattern = getVibrationPattern(type, config);
    navigator.vibrate(pattern);
    return true;
  } catch {
    // Gracefully handle any errors
    return false;
  }
}

/**
 * Sets the enabled state for haptic feedback
 * Requirements 4.6: Enable/disable haptic feedback
 * 
 * @param state - Current haptic state
 * @param enabled - Whether haptics should be enabled
 * @returns Updated haptic state
 */
export function setEnabled(state: HapticState, enabled: boolean): HapticState {
  return {
    ...state,
    isEnabled: enabled,
  };
}

// ============================================================================
// System Factory
// ============================================================================

/**
 * Creates a haptic system instance
 * 
 * @param config - Optional custom configuration
 * @returns Haptic system instance
 */
export function createHapticSystem(config: HapticConfig = HAPTIC_CONFIG): HapticSystem {
  let state = createInitialHapticState();

  return {
    get state() {
      return state;
    },
    config,

    /**
     * Triggers haptic feedback
     * Requirements 4.1: Swap action - light (10ms)
     * Requirements 4.2: Collision - heavy (50ms)
     * Requirements 4.3: Near miss - medium (25ms)
     * Requirements 4.4: Resonance activation - success (double pulse)
     * Requirements 4.5: UI button - selection (5ms)
     */
    trigger(type: HapticType): void {
      triggerHaptic(type, state, config);
    },

    /**
     * Sets whether haptic feedback is enabled
     * Requirements 4.6: Skip all haptic triggers when disabled
     */
    setEnabled(enabled: boolean): void {
      state = setEnabled(state, enabled);
    },

    /**
     * Checks if haptic feedback is supported
     * Requirements 4.7: Gracefully degrade without errors
     */
    checkSupport(): boolean {
      return state.isSupported;
    },

    /**
     * Gets the current haptic state
     */
    getState(): HapticState {
      return state;
    },
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let hapticSystemInstance: HapticSystem | null = null;

/**
 * Gets or creates the singleton haptic system instance
 * 
 * @param config - Optional custom configuration
 * @returns Haptic system instance
 */
export function getHapticSystem(config: HapticConfig = HAPTIC_CONFIG): HapticSystem {
  if (!hapticSystemInstance) {
    hapticSystemInstance = createHapticSystem(config);
  }
  return hapticSystemInstance;
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetHapticSystem(): void {
  hapticSystemInstance = null;
}
