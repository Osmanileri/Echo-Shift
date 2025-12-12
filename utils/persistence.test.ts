/**
 * Property-Based Tests for State Persistence System
 * Uses fast-check for property-based testing
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { safePersist, safeLoad, safeRemove, STORAGE_KEYS } from './persistence';
import type { GhostFrame } from '../store/gameStore';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Setup localStorage mock
beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
  localStorageMock.clear();
});

afterEach(() => {
  localStorageMock.clear();
});

// Persisted state interface matching the store
interface PersistedState {
  echoShards: number;
  ownedSkins: string[];
  ownedEffects: string[];
  ownedThemes: string[];
  ownedUpgrades: Record<string, number>;
  equippedSkin: string;
  equippedEffect: string;
  equippedTheme: string;
  completedLevels: number[];
  currentLevel: number;
  levelStars: Record<number, number>;
  lastDailyChallengeDate: string;
  dailyChallengeCompleted: boolean;
  dailyChallengeBestScore: number;
  tutorialCompleted: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
}

// Arbitrary generators for game state
const itemIdArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/);

const ghostFrameArb: fc.Arbitrary<GhostFrame> = fc.record({
  timestamp: fc.integer({ min: 0, max: 1000000 }),
  score: fc.integer({ min: 0, max: 100000 }),
  playerY: fc.double({ min: 0, max: 800, noNaN: true }),
  isSwapped: fc.boolean(),
});

const persistedStateArb: fc.Arbitrary<PersistedState> = fc.record({
  echoShards: fc.integer({ min: 0, max: 1000000 }),
  ownedSkins: fc.array(itemIdArb, { minLength: 1, maxLength: 20 }),
  ownedEffects: fc.array(itemIdArb, { minLength: 1, maxLength: 20 }),
  ownedThemes: fc.array(itemIdArb, { minLength: 1, maxLength: 10 }),
  ownedUpgrades: fc.dictionary(itemIdArb, fc.integer({ min: 0, max: 10 })),
  equippedSkin: itemIdArb,
  equippedEffect: itemIdArb,
  equippedTheme: itemIdArb,
  completedLevels: fc.array(fc.integer({ min: 1, max: 100 }), { maxLength: 100 }),
  currentLevel: fc.integer({ min: 1, max: 100 }),
  levelStars: fc.dictionary(
    fc.integer({ min: 1, max: 100 }).map(String),
    fc.integer({ min: 1, max: 3 })
  ),
  lastDailyChallengeDate: fc.integer({ min: 2020, max: 2030 }).chain(year =>
    fc.integer({ min: 1, max: 12 }).chain(month =>
      fc.integer({ min: 1, max: 28 }).map(day =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      )
    )
  ),
  dailyChallengeCompleted: fc.boolean(),
  dailyChallengeBestScore: fc.integer({ min: 0, max: 100000 }),
  tutorialCompleted: fc.boolean(),
  soundEnabled: fc.boolean(),
  musicEnabled: fc.boolean(),
});

describe('State Persistence Round-Trip Properties', () => {
  /**
   * **Feature: echo-shift-professionalization, Property 2: State Persistence Round-Trip**
   * **Validates: Requirements 1.5, 1.6, 18.4, 18.5**
   *
   * For any valid game state object, serializing to JSON and then deserializing
   * SHALL produce an equivalent object with all fields intact.
   */
  test('game state round-trip preserves all fields', () => {
    fc.assert(
      fc.property(
        persistedStateArb,
        (state) => {
          const testKey = 'test-round-trip';
          
          // Serialize (persist) the state
          const persistResult = safePersist(testKey, state);
          expect(persistResult).toBe(true);
          
          // Deserialize (load) the state
          const loadedState = safeLoad<PersistedState>(testKey, {} as PersistedState);
          
          // Verify all fields are preserved
          expect(loadedState.echoShards).toBe(state.echoShards);
          expect(loadedState.ownedSkins).toEqual(state.ownedSkins);
          expect(loadedState.ownedEffects).toEqual(state.ownedEffects);
          expect(loadedState.ownedThemes).toEqual(state.ownedThemes);
          expect(loadedState.ownedUpgrades).toEqual(state.ownedUpgrades);
          expect(loadedState.equippedSkin).toBe(state.equippedSkin);
          expect(loadedState.equippedEffect).toBe(state.equippedEffect);
          expect(loadedState.equippedTheme).toBe(state.equippedTheme);
          expect(loadedState.completedLevels).toEqual(state.completedLevels);
          expect(loadedState.currentLevel).toBe(state.currentLevel);
          expect(loadedState.levelStars).toEqual(state.levelStars);
          expect(loadedState.lastDailyChallengeDate).toBe(state.lastDailyChallengeDate);
          expect(loadedState.dailyChallengeCompleted).toBe(state.dailyChallengeCompleted);
          expect(loadedState.dailyChallengeBestScore).toBe(state.dailyChallengeBestScore);
          expect(loadedState.tutorialCompleted).toBe(state.tutorialCompleted);
          expect(loadedState.soundEnabled).toBe(state.soundEnabled);
          expect(loadedState.musicEnabled).toBe(state.musicEnabled);
          
          // Clean up
          safeRemove(testKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 2: State Persistence Round-Trip (Ghost Data)**
   * **Validates: Requirements 1.5, 1.6, 18.4, 18.5**
   *
   * For any valid ghost timeline array, serializing to JSON and deserializing
   * SHALL produce an equivalent array with all frames intact.
   */
  test('ghost timeline round-trip preserves all frames', () => {
    fc.assert(
      fc.property(
        fc.array(ghostFrameArb, { minLength: 0, maxLength: 1000 }),
        (timeline) => {
          const testKey = 'test-ghost-round-trip';
          
          // Serialize (persist) the timeline
          const persistResult = safePersist(testKey, timeline);
          expect(persistResult).toBe(true);
          
          // Deserialize (load) the timeline
          const loadedTimeline = safeLoad<GhostFrame[]>(testKey, []);
          
          // Verify array length
          expect(loadedTimeline.length).toBe(timeline.length);
          
          // Verify each frame is preserved
          for (let i = 0; i < timeline.length; i++) {
            expect(loadedTimeline[i].timestamp).toBe(timeline[i].timestamp);
            expect(loadedTimeline[i].score).toBe(timeline[i].score);
            expect(loadedTimeline[i].playerY).toBeCloseTo(timeline[i].playerY, 10);
            expect(loadedTimeline[i].isSwapped).toBe(timeline[i].isSwapped);
          }
          
          // Clean up
          safeRemove(testKey);
        }
      ),
      { numRuns: 100 }
    );
  });
});
