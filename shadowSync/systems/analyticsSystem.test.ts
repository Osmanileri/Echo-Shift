/**
 * Analytics System Property-Based Tests
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  AnalyticsEventType,
  AnalyticsEvent,
  AnalyticsState,
  LevelFailData,
  LevelCompleteData,
  PurchaseData,
  RestoreData,
  RitualCompleteData,
  SessionQuitData,
  REQUIRED_FIELDS,
  ANALYTICS_STORAGE_KEY,
  MAX_EVENTS,
  createInitialAnalyticsState,
  validateEventData,
  isEventComplete,
  logEvent,
  getEvents,
  clear,
  flush,
  loadFromStorage,
  clearStorage,
  createAnalyticsSystem,
} from './analyticsSystem';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generator for level fail data
 * Requirements 5.1: level_id, score_at_death, time_played
 */
const levelFailDataArb = fc.record({
  level_id: fc.integer({ min: 1, max: 100 }),
  score_at_death: fc.integer({ min: 0, max: 1000000 }),
  time_played: fc.integer({ min: 0, max: 3600000 }),
});

/**
 * Generator for level complete data
 * Requirements 5.2: level_id, final_score, stars_earned, time_played
 */
const levelCompleteDataArb = fc.record({
  level_id: fc.integer({ min: 1, max: 100 }),
  final_score: fc.integer({ min: 0, max: 1000000 }),
  stars_earned: fc.integer({ min: 1, max: 3 }),
  time_played: fc.integer({ min: 0, max: 3600000 }),
});

/**
 * Generator for purchase data
 * Requirements 5.3: item_id, item_category, price
 */
const purchaseDataArb = fc.record({
  item_id: fc.string({ minLength: 1, maxLength: 50 }),
  item_category: fc.constantFrom('skin', 'upgrade', 'theme', 'bundle'),
  price: fc.integer({ min: 0, max: 10000 }),
});

/**
 * Generator for restore data
 * Requirements 5.4: score_at_death, restore_success
 */
const restoreDataArb = fc.record({
  score_at_death: fc.integer({ min: 0, max: 1000000 }),
  restore_success: fc.boolean(),
});

/**
 * Generator for ritual complete data
 * Requirements 5.5: ritual_id, completion_time
 */
const ritualCompleteDataArb = fc.record({
  ritual_id: fc.string({ minLength: 1, maxLength: 50 }),
  completion_time: fc.integer({ min: 0, max: Date.now() + 1000000000 }),
});

/**
 * Generator for session quit data
 * Requirements 5.6: current_score, level_id, session_duration
 */
const sessionQuitDataArb = fc.record({
  current_score: fc.integer({ min: 0, max: 1000000 }),
  level_id: fc.integer({ min: 1, max: 100 }),
  session_duration: fc.integer({ min: 0, max: 3600000 }),
});

/**
 * Generator for any valid analytics event with correct data
 */
const validAnalyticsEventArb = fc.oneof(
  levelFailDataArb.map(data => ({ type: 'level_fail' as const, data })),
  levelCompleteDataArb.map(data => ({ type: 'level_complete' as const, data })),
  purchaseDataArb.map(data => ({ type: 'purchase' as const, data })),
  restoreDataArb.map(data => ({ type: 'restore_used' as const, data })),
  ritualCompleteDataArb.map(data => ({ type: 'ritual_complete' as const, data })),
  sessionQuitDataArb.map(data => ({ type: 'session_quit' as const, data }))
);

/**
 * Generator for a sequence of valid events
 */
const eventSequenceArb = fc.array(validAnalyticsEventArb, { minLength: 1, maxLength: 20 });

// ============================================================================
// Mock localStorage
// ============================================================================

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ============================================================================
// Property Tests
// ============================================================================

describe('Analytics System', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  /**
   * **Feature: echo-shift-engagement, Property 14: Analytics Event Completeness**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**
   * 
   * *For any* analytics event of a specific type, the event data SHALL contain 
   * all required fields for that event type.
   */
  it('should validate that events contain all required fields for their type', () => {
    fc.assert(
      fc.property(
        validAnalyticsEventArb,
        ({ type, data }) => {
          // Validate that the data contains all required fields
          const isValid = validateEventData(type, data as Record<string, unknown>);
          expect(isValid).toBe(true);
          
          // Log the event and verify it's stored correctly
          let state = createInitialAnalyticsState();
          state = logEvent(state, type, data as any);
          
          // Event should be logged
          expect(state.events.length).toBe(1);
          
          // Logged event should be complete
          const loggedEvent = state.events[0];
          expect(isEventComplete(loggedEvent)).toBe(true);
          
          // Verify all required fields are present
          const requiredFields = REQUIRED_FIELDS[type];
          for (const field of requiredFields) {
            expect(field in loggedEvent.data).toBe(true);
            expect(loggedEvent.data[field]).not.toBeUndefined();
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject events with missing required fields', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AnalyticsEventType>(
          'level_fail',
          'level_complete',
          'purchase',
          'restore_used',
          'ritual_complete',
          'session_quit'
        ),
        (eventType) => {
          // Create incomplete data (empty object)
          const incompleteData = {};
          
          // Validation should fail
          const isValid = validateEventData(eventType, incompleteData);
          expect(isValid).toBe(false);
          
          // Logging should not add the event
          let state = createInitialAnalyticsState();
          state = logEvent(state, eventType, incompleteData as any);
          
          // Event should not be logged
          expect(state.events.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-engagement, Property 15: Analytics Batch Persistence**
   * **Validates: Requirements 5.7**
   * 
   * *For any* sequence of logged events, after flush() is called, 
   * all events SHALL be persisted to localStorage.
   */
  it('should persist all events to localStorage after flush', () => {
    fc.assert(
      fc.property(
        eventSequenceArb,
        (events) => {
          // Clear storage
          localStorageMock.clear();
          
          // Log all events
          let state = createInitialAnalyticsState();
          for (const { type, data } of events) {
            state = logEvent(state, type, data as any);
          }
          
          // Verify events are in state
          expect(state.events.length).toBe(events.length);
          
          // Flush to localStorage
          const flushSuccess = flush(state);
          expect(flushSuccess).toBe(true);
          
          // Load from storage and verify
          const loadedState = loadFromStorage();
          expect(loadedState.events.length).toBe(events.length);
          
          // Verify each event was persisted correctly
          for (let i = 0; i < events.length; i++) {
            const original = events[i];
            const loaded = loadedState.events[i];
            
            expect(loaded.type).toBe(original.type);
            
            // Verify all data fields match
            for (const [key, value] of Object.entries(original.data)) {
              expect(loaded.data[key]).toBe(value);
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should merge events when flushing multiple times', () => {
    fc.assert(
      fc.property(
        eventSequenceArb,
        eventSequenceArb,
        (events1, events2) => {
          // Clear storage
          localStorageMock.clear();
          
          // Log and flush first batch
          let state1 = createInitialAnalyticsState();
          for (const { type, data } of events1) {
            state1 = logEvent(state1, type, data as any);
          }
          flush(state1);
          
          // Log and flush second batch
          let state2 = createInitialAnalyticsState();
          for (const { type, data } of events2) {
            state2 = logEvent(state2, type, data as any);
          }
          flush(state2);
          
          // Load and verify total count
          const loadedState = loadFromStorage();
          const expectedCount = Math.min(events1.length + events2.length, MAX_EVENTS);
          expect(loadedState.events.length).toBe(expectedCount);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Additional Unit Tests for Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty state flush', () => {
      localStorageMock.clear();
      const state = createInitialAnalyticsState();
      
      const success = flush(state);
      expect(success).toBe(true);
      
      const loaded = loadFromStorage();
      expect(loaded.events.length).toBe(0);
    });

    it('should trim events when exceeding MAX_EVENTS', () => {
      let state = createInitialAnalyticsState();
      
      // Add more than MAX_EVENTS
      for (let i = 0; i < MAX_EVENTS + 10; i++) {
        state = logEvent(state, 'level_fail', {
          level_id: i,
          score_at_death: 100,
          time_played: 1000,
        });
      }
      
      // Should be capped at MAX_EVENTS
      expect(state.events.length).toBe(MAX_EVENTS);
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.setItem(ANALYTICS_STORAGE_KEY, 'not valid json');
      
      const loaded = loadFromStorage();
      expect(loaded.events.length).toBe(0);
    });

    it('should handle non-array localStorage data', () => {
      localStorageMock.setItem(ANALYTICS_STORAGE_KEY, '{"not": "array"}');
      
      const loaded = loadFromStorage();
      expect(loaded.events.length).toBe(0);
    });

    it('should clear storage correctly', () => {
      let state = createInitialAnalyticsState();
      state = logEvent(state, 'level_fail', {
        level_id: 1,
        score_at_death: 100,
        time_played: 1000,
      });
      flush(state);
      
      // Verify data exists
      expect(localStorageMock.getItem(ANALYTICS_STORAGE_KEY)).not.toBeNull();
      
      // Clear
      clearStorage();
      
      // Verify cleared
      expect(localStorageMock.getItem(ANALYTICS_STORAGE_KEY)).toBeNull();
    });

    it('should create system with correct interface', () => {
      const system = createAnalyticsSystem();
      
      expect(system.state.events.length).toBe(0);
      
      system.logEvent('level_fail', {
        level_id: 1,
        score_at_death: 100,
        time_played: 1000,
      });
      
      expect(system.getEvents().length).toBe(1);
      
      system.clear();
      expect(system.getEvents().length).toBe(0);
    });

    it('should validate each event type has correct required fields', () => {
      // level_fail
      expect(REQUIRED_FIELDS.level_fail).toContain('level_id');
      expect(REQUIRED_FIELDS.level_fail).toContain('score_at_death');
      expect(REQUIRED_FIELDS.level_fail).toContain('time_played');
      
      // level_complete
      expect(REQUIRED_FIELDS.level_complete).toContain('level_id');
      expect(REQUIRED_FIELDS.level_complete).toContain('final_score');
      expect(REQUIRED_FIELDS.level_complete).toContain('stars_earned');
      expect(REQUIRED_FIELDS.level_complete).toContain('time_played');
      
      // purchase
      expect(REQUIRED_FIELDS.purchase).toContain('item_id');
      expect(REQUIRED_FIELDS.purchase).toContain('item_category');
      expect(REQUIRED_FIELDS.purchase).toContain('price');
      
      // restore_used
      expect(REQUIRED_FIELDS.restore_used).toContain('score_at_death');
      expect(REQUIRED_FIELDS.restore_used).toContain('restore_success');
      
      // ritual_complete
      expect(REQUIRED_FIELDS.ritual_complete).toContain('ritual_id');
      expect(REQUIRED_FIELDS.ritual_complete).toContain('completion_time');
      
      // session_quit
      expect(REQUIRED_FIELDS.session_quit).toContain('current_score');
      expect(REQUIRED_FIELDS.session_quit).toContain('level_id');
      expect(REQUIRED_FIELDS.session_quit).toContain('session_duration');
    });
  });
});
