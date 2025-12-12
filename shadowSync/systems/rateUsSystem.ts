/**
 * Rate Us System
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 * 
 * Prompts happy players to rate the game:
 * - Tracks positive moments (high scores, 3-star completions)
 * - Shows prompt after threshold reached
 * - Respects cooldown after dismissal
 * - Never shows again after rating
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Rate Us system state
 * Requirements: 6.1, 6.2, 6.6, 6.7
 */
export interface RateUsState {
  positiveCount: number;
  lastPromptDate: string | null;
  hasRated: boolean;
  hasDismissed: boolean;
  dismissedAt: number | null;
}

/**
 * Rate Us configuration
 * Requirements: 6.3, 6.6
 */
export interface RateUsConfig {
  triggerThreshold: number;    // 3 positive moments
  cooldownDays: number;        // 7 days after dismiss
}

// ============================================================================
// Constants
// ============================================================================

export const RATE_US_STORAGE_KEY = 'echo_shift_rate_us';

export const DEFAULT_CONFIG: RateUsConfig = {
  triggerThreshold: 3,
  cooldownDays: 7,
};

// ============================================================================
// State Factory
// ============================================================================

/**
 * Creates initial rate us state
 */
export function createInitialRateUsState(): RateUsState {
  return {
    positiveCount: 0,
    lastPromptDate: null,
    hasRated: false,
    hasDismissed: false,
    dismissedAt: null,
  };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Records a positive moment (high score or 3-star completion)
 * Requirements: 6.1, 6.2
 * 
 * @param state - Current rate us state
 * @returns Updated state with incremented positive count
 */
export function recordPositiveMoment(state: RateUsState): RateUsState {
  return {
    ...state,
    positiveCount: state.positiveCount + 1,
  };
}

/**
 * Checks if the rate prompt should be shown
 * Requirements: 6.3, 6.6, 6.7
 * 
 * @param state - Current rate us state
 * @param config - Rate us configuration
 * @returns true if prompt should be shown
 */
export function shouldShowPrompt(
  state: RateUsState,
  config: RateUsConfig = DEFAULT_CONFIG
): boolean {
  // Never show if already rated
  // Requirements 6.7: Never show prompt again after rating
  if (state.hasRated) {
    return false;
  }

  // Check cooldown if dismissed
  // Requirements 6.6: Don't show for 7 days after dismiss
  if (state.hasDismissed && state.dismissedAt !== null) {
    const daysSinceDismiss = (Date.now() - state.dismissedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceDismiss < config.cooldownDays) {
      return false;
    }
  }

  // Show if threshold reached
  // Requirements 6.3: Show when positive_moment counter reaches 3
  return state.positiveCount >= config.triggerThreshold;
}

/**
 * Marks the user as having rated the game
 * Requirements: 6.4, 6.7
 * 
 * @param state - Current rate us state
 * @returns Updated state with hasRated = true
 */
export function markRated(state: RateUsState): RateUsState {
  return {
    ...state,
    hasRated: true,
    lastPromptDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * Marks the prompt as dismissed
 * Requirements: 6.6
 * 
 * @param state - Current rate us state
 * @returns Updated state with dismiss info
 */
export function markDismissed(state: RateUsState): RateUsState {
  return {
    ...state,
    hasDismissed: true,
    dismissedAt: Date.now(),
    positiveCount: 0, // Reset counter after dismiss
    lastPromptDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * Resets the rate us state
 * 
 * @returns Fresh rate us state
 */
export function reset(): RateUsState {
  return createInitialRateUsState();
}

// ============================================================================
// Serialization Functions - Requirements 6.8
// ============================================================================

/**
 * Serializes rate us state to JSON string
 * Requirements 6.8: Encode data as JSON for localStorage persistence
 * 
 * @param state - Rate us state to serialize
 * @returns JSON string representation
 */
export function serialize(state: RateUsState): string {
  return JSON.stringify(state);
}

/**
 * Deserializes JSON string to rate us state
 * Requirements 6.8: Parse JSON for localStorage persistence
 * 
 * @param data - JSON string to parse
 * @returns Parsed rate us state or initial state if invalid
 */
export function deserialize(data: string): RateUsState {
  try {
    const parsed = JSON.parse(data);
    
    // Validate required fields
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.positiveCount !== 'number' ||
      typeof parsed.hasRated !== 'boolean' ||
      typeof parsed.hasDismissed !== 'boolean'
    ) {
      return createInitialRateUsState();
    }

    // Validate optional fields
    const lastPromptDate = parsed.lastPromptDate === null || typeof parsed.lastPromptDate === 'string'
      ? parsed.lastPromptDate
      : null;
    
    const dismissedAt = parsed.dismissedAt === null || typeof parsed.dismissedAt === 'number'
      ? parsed.dismissedAt
      : null;

    return {
      positiveCount: Math.max(0, parsed.positiveCount),
      lastPromptDate,
      hasRated: parsed.hasRated,
      hasDismissed: parsed.hasDismissed,
      dismissedAt,
    };
  } catch {
    return createInitialRateUsState();
  }
}

// ============================================================================
// Persistence Functions
// ============================================================================

/**
 * Saves rate us state to localStorage
 * 
 * @param state - State to save
 * @returns true if save was successful
 */
export function saveToStorage(state: RateUsState): boolean {
  try {
    localStorage.setItem(RATE_US_STORAGE_KEY, serialize(state));
    return true;
  } catch (error) {
    console.error('RateUs: Failed to save to storage', error);
    return false;
  }
}

/**
 * Loads rate us state from localStorage
 * 
 * @returns Loaded state or initial state if not found/invalid
 */
export function loadFromStorage(): RateUsState {
  try {
    const data = localStorage.getItem(RATE_US_STORAGE_KEY);
    if (!data) {
      return createInitialRateUsState();
    }
    return deserialize(data);
  } catch {
    return createInitialRateUsState();
  }
}

/**
 * Clears rate us state from localStorage
 */
export function clearStorage(): void {
  try {
    localStorage.removeItem(RATE_US_STORAGE_KEY);
  } catch (error) {
    console.error('RateUs: Failed to clear storage', error);
  }
}

// ============================================================================
// System Interface
// ============================================================================

/**
 * Rate Us System interface for external use
 */
export interface RateUsSystem {
  state: RateUsState;
  config: RateUsConfig;
  
  recordPositiveMoment: () => void;
  shouldShowPrompt: () => boolean;
  markRated: () => void;
  markDismissed: () => void;
  reset: () => void;
  
  // Persistence
  save: () => boolean;
  load: () => void;
  clearStorage: () => void;
  
  // Serialization
  serialize: () => string;
  deserialize: (data: string) => void;
}

/**
 * Creates a rate us system instance
 * 
 * @param config - Optional configuration override
 * @returns Rate us system instance
 */
export function createRateUsSystem(config: RateUsConfig = DEFAULT_CONFIG): RateUsSystem {
  let state = createInitialRateUsState();

  return {
    get state() {
      return state;
    },

    config,

    recordPositiveMoment(): void {
      state = recordPositiveMoment(state);
    },

    shouldShowPrompt(): boolean {
      return shouldShowPrompt(state, config);
    },

    markRated(): void {
      state = markRated(state);
      this.save();
    },

    markDismissed(): void {
      state = markDismissed(state);
      this.save();
    },

    reset(): void {
      state = reset();
    },

    save(): boolean {
      return saveToStorage(state);
    },

    load(): void {
      state = loadFromStorage();
    },

    clearStorage(): void {
      clearStorage();
      state = createInitialRateUsState();
    },

    serialize(): string {
      return serialize(state);
    },

    deserialize(data: string): void {
      state = deserialize(data);
    },
  };
}
