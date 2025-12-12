/**
 * Analytics System
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 * 
 * Tracks player behavior and game events for analysis:
 * - Level fail/complete events
 * - Purchase events
 * - Restore usage events
 * - Ritual completion events
 * - Session quit events
 * - Batch persistence to localStorage
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Analytics event types
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export type AnalyticsEventType =
  | 'level_fail'
  | 'level_complete'
  | 'purchase'
  | 'restore_used'
  | 'ritual_complete'
  | 'session_quit';

/**
 * Base analytics event structure
 */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

/**
 * Level fail event data
 * Requirements 5.1: Log level_id, score_at_death, time_played
 */
export interface LevelFailData {
  level_id: number;
  score_at_death: number;
  time_played: number;
}

/**
 * Level complete event data
 * Requirements 5.2: Log level_id, final_score, stars_earned, time_played
 */
export interface LevelCompleteData {
  level_id: number;
  final_score: number;
  stars_earned: number;
  time_played: number;
}

/**
 * Purchase event data
 * Requirements 5.3: Log item_id, item_category, price
 */
export interface PurchaseData {
  item_id: string;
  item_category: string;
  price: number;
}

/**
 * Restore used event data
 * Requirements 5.4: Log score_at_death, restore_success
 */
export interface RestoreData {
  score_at_death: number;
  restore_success: boolean;
}

/**
 * Ritual complete event data
 * Requirements 5.5: Log ritual_id, completion_time
 */
export interface RitualCompleteData {
  ritual_id: string;
  completion_time: number;
}

/**
 * Session quit event data
 * Requirements 5.6: Log current_score, level_id, session_duration
 */
export interface SessionQuitData {
  current_score: number;
  level_id: number;
  session_duration: number;
}

/**
 * Map of event types to their required data fields
 */
export type EventDataMap = {
  level_fail: LevelFailData;
  level_complete: LevelCompleteData;
  purchase: PurchaseData;
  restore_used: RestoreData;
  ritual_complete: RitualCompleteData;
  session_quit: SessionQuitData;
};

/**
 * Analytics system state
 */
export interface AnalyticsState {
  events: AnalyticsEvent[];
}

// ============================================================================
// Constants
// ============================================================================

export const ANALYTICS_STORAGE_KEY = 'echo_shift_analytics';
export const MAX_EVENTS = 1000;

/**
 * Required fields for each event type
 */
export const REQUIRED_FIELDS: Record<AnalyticsEventType, string[]> = {
  level_fail: ['level_id', 'score_at_death', 'time_played'],
  level_complete: ['level_id', 'final_score', 'stars_earned', 'time_played'],
  purchase: ['item_id', 'item_category', 'price'],
  restore_used: ['score_at_death', 'restore_success'],
  ritual_complete: ['ritual_id', 'completion_time'],
  session_quit: ['current_score', 'level_id', 'session_duration'],
};

// ============================================================================
// State Factory
// ============================================================================

/**
 * Creates initial analytics state
 */
export function createInitialAnalyticsState(): AnalyticsState {
  return {
    events: [],
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates that event data contains all required fields for its type
 * 
 * @param type - Event type
 * @param data - Event data to validate
 * @returns true if all required fields are present
 */
export function validateEventData(
  type: AnalyticsEventType,
  data: Record<string, unknown>
): boolean {
  const requiredFields = REQUIRED_FIELDS[type];
  return requiredFields.every(field => field in data && data[field] !== undefined);
}

/**
 * Checks if an event has all required fields
 * 
 * @param event - Analytics event to check
 * @returns true if event is complete
 */
export function isEventComplete(event: AnalyticsEvent): boolean {
  return validateEventData(event.type, event.data);
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Logs an analytics event
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 * 
 * @param state - Current analytics state
 * @param type - Event type
 * @param data - Event data
 * @returns Updated analytics state
 */
export function logEvent<T extends AnalyticsEventType>(
  state: AnalyticsState,
  type: T,
  data: EventDataMap[T]
): AnalyticsState {
  // Convert to Record for validation
  const dataRecord = data as unknown as Record<string, unknown>;
  
  // Validate event data
  if (!validateEventData(type, dataRecord)) {
    console.warn(`Analytics: Invalid event data for type ${type}`, data);
    return state;
  }

  const event: AnalyticsEvent = {
    type,
    timestamp: Date.now(),
    data: dataRecord,
  };

  // Add event to state, respecting max limit
  const newEvents = [...state.events, event];
  const trimmedEvents = newEvents.length > MAX_EVENTS
    ? newEvents.slice(newEvents.length - MAX_EVENTS)
    : newEvents;

  return {
    events: trimmedEvents,
  };
}

/**
 * Gets all logged events
 * 
 * @param state - Current analytics state
 * @returns Array of analytics events
 */
export function getEvents(state: AnalyticsState): AnalyticsEvent[] {
  return [...state.events];
}

/**
 * Clears all events from state
 * 
 * @returns Fresh analytics state
 */
export function clear(): AnalyticsState {
  return createInitialAnalyticsState();
}

// ============================================================================
// Persistence Functions - Requirements 5.7
// ============================================================================

/**
 * Flushes events to localStorage
 * Requirements 5.7: Batch events and persist to localStorage
 * 
 * @param state - Current analytics state
 * @returns true if flush was successful
 */
export function flush(state: AnalyticsState): boolean {
  try {
    // Get existing events from storage
    const existingData = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    let existingEvents: AnalyticsEvent[] = [];
    
    if (existingData) {
      try {
        const parsed = JSON.parse(existingData);
        if (Array.isArray(parsed)) {
          existingEvents = parsed;
        }
      } catch {
        // Corrupted data, start fresh
        existingEvents = [];
      }
    }

    // Merge with current events
    const mergedEvents = [...existingEvents, ...state.events];
    
    // Trim to max size
    const trimmedEvents = mergedEvents.length > MAX_EVENTS
      ? mergedEvents.slice(mergedEvents.length - MAX_EVENTS)
      : mergedEvents;

    // Persist to localStorage
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(trimmedEvents));
    
    return true;
  } catch (error) {
    console.error('Analytics: Failed to flush events', error);
    return false;
  }
}

/**
 * Loads events from localStorage
 * 
 * @returns Analytics state with loaded events
 */
export function loadFromStorage(): AnalyticsState {
  try {
    const data = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!data) {
      return createInitialAnalyticsState();
    }

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return createInitialAnalyticsState();
    }

    // Validate each event
    const validEvents = parsed.filter((event): event is AnalyticsEvent => {
      return (
        typeof event === 'object' &&
        event !== null &&
        typeof event.type === 'string' &&
        typeof event.timestamp === 'number' &&
        typeof event.data === 'object'
      );
    });

    return { events: validEvents };
  } catch {
    return createInitialAnalyticsState();
  }
}

/**
 * Clears events from localStorage
 */
export function clearStorage(): void {
  try {
    localStorage.removeItem(ANALYTICS_STORAGE_KEY);
  } catch (error) {
    console.error('Analytics: Failed to clear storage', error);
  }
}

// ============================================================================
// System Interface
// ============================================================================

/**
 * Analytics System interface for external use
 */
export interface AnalyticsSystem {
  state: AnalyticsState;
  
  logEvent: <T extends AnalyticsEventType>(type: T, data: EventDataMap[T]) => void;
  flush: () => boolean;
  getEvents: () => AnalyticsEvent[];
  clear: () => void;
  loadFromStorage: () => void;
  clearStorage: () => void;
}

/**
 * Creates an analytics system instance
 * 
 * @returns Analytics system instance
 */
export function createAnalyticsSystem(): AnalyticsSystem {
  let state = createInitialAnalyticsState();

  return {
    get state() {
      return state;
    },

    logEvent<T extends AnalyticsEventType>(type: T, data: EventDataMap[T]): void {
      state = logEvent(state, type, data);
    },

    flush(): boolean {
      const success = flush(state);
      if (success) {
        // Clear in-memory events after successful flush
        state = createInitialAnalyticsState();
      }
      return success;
    },

    getEvents(): AnalyticsEvent[] {
      return getEvents(state);
    },

    clear(): void {
      state = clear();
    },

    loadFromStorage(): void {
      state = loadFromStorage();
    },

    clearStorage(): void {
      clearStorage();
      state = createInitialAnalyticsState();
    },
  };
}
