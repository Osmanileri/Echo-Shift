/**
 * Property-Based Tests for Mission System
 * Uses fast-check for property-based testing
 * 
 * Requirements: 2.2, 2.3, 2.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import type { Mission, MissionEvent, MissionState, MissionType } from '../types';
import {
    checkMissionCompletion,
    checkMissionReset,
    generateDailyMissions,
    GRIND_TEMPLATES,
    MASTERY_TEMPLATES,
    SKILL_TEMPLATES,
    updateMissionProgress
} from './missionSystem';

// Arbitrary for MissionType
const missionTypeArb = fc.constantFrom<MissionType>(
  'DISTANCE',
  'SWAP_COUNT',
  'NEAR_MISS',
  'COLLECT',
  'STAY_LANE',
  'COLLISION'
);

// Arbitrary for a single Mission
const missionArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  category: fc.constantFrom('SOUND_CHECK', 'DAILY', 'MARATHON') as fc.Arbitrary<'SOUND_CHECK' | 'DAILY' | 'MARATHON'>,
  slot: fc.option(fc.constantFrom('GRIND', 'SKILL', 'MASTERY') as fc.Arbitrary<'GRIND' | 'SKILL' | 'MASTERY'>, { nil: undefined }),
  type: missionTypeArb,
  title: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  goal: fc.integer({ min: 1, max: 10000 }),
  progress: fc.integer({ min: 0, max: 10000 }),
  completed: fc.boolean(),
  rewards: fc.record({
    xp: fc.integer({ min: 0, max: 1000 }),
    shards: fc.integer({ min: 0, max: 1000 }),
    cosmetic: fc.option(fc.string(), { nil: undefined }),
  }),
});

// Arbitrary for MissionEvent
const missionEventArb = fc.record({
  type: missionTypeArb,
  value: fc.integer({ min: 1, max: 100 }),
});

// Arbitrary for MissionState with active missions
const missionStateArb = fc.record({
  soundCheck: fc.record({
    missions: fc.array(missionArb, { minLength: 1, maxLength: 5 }),
    completed: fc.boolean(),
  }),
  daily: fc.record({
    missions: fc.array(missionArb, { minLength: 0, maxLength: 3 }),
    lastResetDate: fc.string(),
  }),
  marathon: fc.record({
    mission: fc.option(missionArb, { nil: null }),
    lastResetDate: fc.string(),
  }),
});


describe('Mission System - Progress Tracking Properties', () => {
  /**
   * **Feature: progression-system, Property 6: Mission Progress Tracking**
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   *
   * For any mission event (SWAP, DISTANCE, NEAR_MISS, COLLECT, STAY_LANE),
   * all active missions of matching type should have their progress
   * incremented by the event value.
   */
  test('Mission progress increments by event value for matching types', () => {
    fc.assert(
      fc.property(
        missionStateArb,
        missionEventArb,
        (state, event) => {
          // Ensure we have at least one incomplete mission of matching type
          const hasMatchingMission = (missions: Mission[]) =>
            missions.some(m => m.type === event.type && !m.completed);

          const result = updateMissionProgress(state, event);

          // Check Sound Check missions (only if not completed)
          if (!state.soundCheck.completed) {
            state.soundCheck.missions.forEach((mission, index) => {
              const resultMission = result.soundCheck.missions[index];
              if (mission.type === event.type && !mission.completed) {
                // Progress should increase by event value
                expect(resultMission.progress).toBe(mission.progress + event.value);
              } else {
                // Non-matching or completed missions should be unchanged
                expect(resultMission.progress).toBe(mission.progress);
              }
            });
          }

          // Check Daily missions
          state.daily.missions.forEach((mission, index) => {
            const resultMission = result.daily.missions[index];
            if (mission.type === event.type && !mission.completed) {
              expect(resultMission.progress).toBe(mission.progress + event.value);
            } else {
              expect(resultMission.progress).toBe(mission.progress);
            }
          });

          // Check Marathon mission
          if (state.marathon.mission && !state.marathon.mission.completed) {
            if (state.marathon.mission.type === event.type) {
              expect(result.marathon.mission!.progress).toBe(
                state.marathon.mission.progress + event.value
              );
            } else {
              expect(result.marathon.mission!.progress).toBe(
                state.marathon.mission.progress
              );
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 6: Mission Progress Tracking (Non-matching types)**
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   *
   * Missions with non-matching types should not have their progress changed.
   */
  test('Non-matching mission types are not affected', () => {
    fc.assert(
      fc.property(
        missionStateArb,
        missionEventArb,
        (state, event) => {
          const result = updateMissionProgress(state, event);

          // Check that non-matching missions are unchanged
          if (!state.soundCheck.completed) {
            state.soundCheck.missions.forEach((mission, index) => {
              if (mission.type !== event.type) {
                expect(result.soundCheck.missions[index].progress).toBe(mission.progress);
              }
            });
          }

          state.daily.missions.forEach((mission, index) => {
            if (mission.type !== event.type) {
              expect(result.daily.missions[index].progress).toBe(mission.progress);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 6: Mission Progress Tracking (Completed missions)**
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   *
   * Already completed missions should not have their progress changed.
   */
  test('Completed missions are not affected by events', () => {
    fc.assert(
      fc.property(
        missionStateArb,
        missionEventArb,
        (state, event) => {
          const result = updateMissionProgress(state, event);

          // Check that completed missions are unchanged
          if (!state.soundCheck.completed) {
            state.soundCheck.missions.forEach((mission, index) => {
              if (mission.completed) {
                expect(result.soundCheck.missions[index].progress).toBe(mission.progress);
              }
            });
          }

          state.daily.missions.forEach((mission, index) => {
            if (mission.completed) {
              expect(result.daily.missions[index].progress).toBe(mission.progress);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Mission System - Completion Detection Properties', () => {
  /**
   * **Feature: progression-system, Property 7: Mission Completion Detection**
   * **Validates: Requirements 7.6**
   *
   * For any mission where progress >= goal, the mission should be marked as completed.
   */
  test('Mission is completed when progress >= goal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }), // goal
        fc.integer({ min: 0, max: 2000 }), // progress
        (goal, progress) => {
          const mission: Mission = {
            id: 'test-mission',
            category: 'DAILY',
            type: 'DISTANCE',
            title: 'Test',
            description: 'Test mission',
            goal,
            progress,
            completed: false,
            rewards: { xp: 10, shards: 10 },
          };

          const isComplete = checkMissionCompletion(mission);
          
          if (progress >= goal) {
            expect(isComplete).toBe(true);
          } else {
            expect(isComplete).toBe(false);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 7: Mission Completion Detection (Exact boundary)**
   * **Validates: Requirements 7.6**
   *
   * Mission should be completed exactly when progress equals goal.
   */
  test('Mission completes exactly at goal boundary', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (goal) => {
          const missionAtGoal: Mission = {
            id: 'test-at-goal',
            category: 'DAILY',
            type: 'DISTANCE',
            title: 'Test',
            description: 'Test mission',
            goal,
            progress: goal,
            completed: false,
            rewards: { xp: 10, shards: 10 },
          };

          const missionBelowGoal: Mission = {
            ...missionAtGoal,
            id: 'test-below-goal',
            progress: goal - 1,
          };

          expect(checkMissionCompletion(missionAtGoal)).toBe(true);
          expect(checkMissionCompletion(missionBelowGoal)).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 7: Mission Completion Detection (Progress update triggers completion)**
   * **Validates: Requirements 7.6**
   *
   * When updateMissionProgress causes progress to reach goal, the mission should be marked completed.
   */
  test('Progress update marks mission as completed when reaching goal', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // goal
        fc.integer({ min: 0, max: 99 }),  // initial progress (below goal)
        missionTypeArb,
        (goal, initialProgress, type) => {
          // Ensure initial progress is below goal
          const safeInitialProgress = Math.min(initialProgress, goal - 1);
          const eventValue = goal - safeInitialProgress; // Exactly enough to complete

          const state: MissionState = {
            soundCheck: {
              missions: [{
                id: 'test-mission',
                category: 'SOUND_CHECK',
                type,
                title: 'Test',
                description: 'Test',
                goal,
                progress: safeInitialProgress,
                completed: false,
                rewards: { xp: 10, shards: 10 },
              }],
              completed: false,
            },
            daily: { missions: [], lastResetDate: '' },
            marathon: { mission: null, lastResetDate: '' },
          };

          const event: MissionEvent = { type, value: eventValue };
          const result = updateMissionProgress(state, event);

          // Mission should now be completed
          expect(result.soundCheck.missions[0].completed).toBe(true);
          expect(result.soundCheck.missions[0].progress).toBe(goal);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Mission System - Daily Mission Slot Constraints', () => {
  /**
   * **Feature: progression-system, Property 8: Daily Mission Slot Constraints**
   * **Validates: Requirements 2.2, 2.3, 2.4**
   *
   * For any generated daily mission set:
   * - Slot 1 (GRIND) should contain only DISTANCE or SWAP_COUNT types
   * - Slot 2 (SKILL) should contain only NEAR_MISS or COLLECT types
   * - Slot 3 (MASTERY) should contain only STAY_LANE or DISTANCE types
   */
  test('Daily missions respect slot type constraints', () => {
    // Valid types for each slot based on templates
    const grindTypes = new Set(GRIND_TEMPLATES.map(t => t.type));
    const skillTypes = new Set(SKILL_TEMPLATES.map(t => t.type));
    const masteryTypes = new Set(MASTERY_TEMPLATES.map(t => t.type));

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (seed) => {
          const missions = generateDailyMissions(seed);

          // Should generate exactly 3 missions
          expect(missions.length).toBe(3);

          // Slot 1 (GRIND) - index 0
          const grindMission = missions[0];
          expect(grindMission.slot).toBe('GRIND');
          expect(grindMission.category).toBe('DAILY');
          expect(grindTypes.has(grindMission.type)).toBe(true);

          // Slot 2 (SKILL) - index 1
          const skillMission = missions[1];
          expect(skillMission.slot).toBe('SKILL');
          expect(skillMission.category).toBe('DAILY');
          expect(skillTypes.has(skillMission.type)).toBe(true);

          // Slot 3 (MASTERY) - index 2
          const masteryMission = missions[2];
          expect(masteryMission.slot).toBe('MASTERY');
          expect(masteryMission.category).toBe('DAILY');
          expect(masteryTypes.has(masteryMission.type)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 8: Daily Mission Slot Constraints (Determinism)**
   * **Validates: Requirements 2.2, 2.3, 2.4**
   *
   * For any seed, generating daily missions twice should produce identical results.
   */
  test('Daily mission generation is deterministic with same seed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (seed) => {
          const missions1 = generateDailyMissions(seed);
          const missions2 = generateDailyMissions(seed);

          expect(missions1.length).toBe(missions2.length);
          
          for (let i = 0; i < missions1.length; i++) {
            expect(missions1[i].type).toBe(missions2[i].type);
            expect(missions1[i].slot).toBe(missions2[i].slot);
            expect(missions1[i].goal).toBe(missions2[i].goal);
            expect(missions1[i].title).toBe(missions2[i].title);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 8: Daily Mission Slot Constraints (Initial State)**
   * **Validates: Requirements 2.2, 2.3, 2.4**
   *
   * All generated daily missions should start with progress=0 and completed=false.
   */
  test('Daily missions start with zero progress and not completed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (seed) => {
          const missions = generateDailyMissions(seed);

          for (const mission of missions) {
            expect(mission.progress).toBe(0);
            expect(mission.completed).toBe(false);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Import persistence functions for round-trip tests
import {
    getDefaultMissionState,
    loadMissionState,
    saveMissionState,
    validateMissionState
} from './missionSystem';

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
import { afterEach, beforeEach } from 'vitest';

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


describe('Mission System - Persistence Round-Trip Properties', () => {
  /**
   * **Feature: progression-system, Property 9: Mission State Persistence Round-Trip**
   * **Validates: Requirements 8.1, 8.2**
   *
   * For any valid MissionState, serializing to localStorage and deserializing
   * should produce an equivalent state.
   */
  test('Mission state round-trip preserves all fields', () => {
    fc.assert(
      fc.property(
        missionStateArb,
        (state) => {
          // Save the state
          const saveResult = saveMissionState(state);
          expect(saveResult).toBe(true);

          // Load the state
          const loadedState = loadMissionState();

          // Verify soundCheck structure
          expect(loadedState.soundCheck.completed).toBe(state.soundCheck.completed);
          expect(loadedState.soundCheck.missions.length).toBe(state.soundCheck.missions.length);
          
          for (let i = 0; i < state.soundCheck.missions.length; i++) {
            const original = state.soundCheck.missions[i];
            const loaded = loadedState.soundCheck.missions[i];
            expect(loaded.id).toBe(original.id);
            expect(loaded.category).toBe(original.category);
            expect(loaded.type).toBe(original.type);
            expect(loaded.title).toBe(original.title);
            expect(loaded.description).toBe(original.description);
            expect(loaded.goal).toBe(original.goal);
            expect(loaded.progress).toBe(original.progress);
            expect(loaded.completed).toBe(original.completed);
            expect(loaded.rewards.xp).toBe(original.rewards.xp);
            expect(loaded.rewards.shards).toBe(original.rewards.shards);
          }

          // Verify daily structure
          expect(loadedState.daily.lastResetDate).toBe(state.daily.lastResetDate);
          expect(loadedState.daily.missions.length).toBe(state.daily.missions.length);
          
          for (let i = 0; i < state.daily.missions.length; i++) {
            const original = state.daily.missions[i];
            const loaded = loadedState.daily.missions[i];
            expect(loaded.id).toBe(original.id);
            expect(loaded.type).toBe(original.type);
            expect(loaded.goal).toBe(original.goal);
            expect(loaded.progress).toBe(original.progress);
            expect(loaded.completed).toBe(original.completed);
          }

          // Verify marathon structure
          expect(loadedState.marathon.lastResetDate).toBe(state.marathon.lastResetDate);
          if (state.marathon.mission === null) {
            expect(loadedState.marathon.mission).toBeNull();
          } else {
            expect(loadedState.marathon.mission).not.toBeNull();
            expect(loadedState.marathon.mission!.id).toBe(state.marathon.mission.id);
            expect(loadedState.marathon.mission!.type).toBe(state.marathon.mission.type);
            expect(loadedState.marathon.mission!.goal).toBe(state.marathon.mission.goal);
            expect(loadedState.marathon.mission!.progress).toBe(state.marathon.mission.progress);
          }

          // Clean up
          localStorageMock.clear();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 9: Mission State Persistence Round-Trip (Default State)**
   * **Validates: Requirements 8.1, 8.2**
   *
   * Loading from empty storage should return default mission state.
   */
  test('Loading from empty storage returns default state', () => {
    localStorageMock.clear();
    
    const loadedState = loadMissionState();
    const defaultState = getDefaultMissionState();

    expect(loadedState.soundCheck.completed).toBe(defaultState.soundCheck.completed);
    expect(loadedState.soundCheck.missions.length).toBe(defaultState.soundCheck.missions.length);
    expect(loadedState.daily.missions.length).toBe(defaultState.daily.missions.length);
    expect(loadedState.marathon.mission).toBe(defaultState.marathon.mission);
  });
});



describe('Mission System - Sound Check Completion Properties', () => {
  /**
   * **Feature: progression-system, Property 10: Sound Check Completion Unlocks Daily**
   * **Validates: Requirements 1.5**
   *
   * For any mission state where all three Sound Check missions are completed,
   * the soundCheckComplete flag should be true, enabling Daily Protocols.
   */
  test('Sound Check completion sets soundCheckComplete flag to true', () => {
    fc.assert(
      fc.property(
        // Generate random progress values that exceed goals
        fc.integer({ min: 10, max: 100 }), // swap progress (goal: 10)
        fc.integer({ min: 1, max: 100 }),  // collect progress (goal: 1)
        fc.integer({ min: 1, max: 100 }),  // collision progress (goal: 1)
        (swapProgress, collectProgress, collisionProgress) => {
          // Create a state with incomplete Sound Check missions
          const state: MissionState = {
            soundCheck: {
              missions: [
                {
                  id: 'sound-check-swap',
                  category: 'SOUND_CHECK',
                  type: 'SWAP_COUNT',
                  title: 'First Frequency Shift',
                  description: 'Perform 10 successful Swaps',
                  goal: 10,
                  progress: 0,
                  completed: false,
                  rewards: { xp: 10, shards: 0 },
                },
                {
                  id: 'sound-check-collect',
                  category: 'SOUND_CHECK',
                  type: 'COLLECT',
                  title: 'Data Collector',
                  description: 'Collect your first Shard',
                  goal: 1,
                  progress: 0,
                  completed: false,
                  rewards: { xp: 10, shards: 0 },
                },
                {
                  id: 'sound-check-collision',
                  category: 'SOUND_CHECK',
                  type: 'COLLISION',
                  title: 'Signal Loss',
                  description: 'Experience your first collision',
                  goal: 1,
                  progress: 0,
                  completed: false,
                  rewards: { xp: 0, shards: 50 },
                },
              ],
              completed: false,
            },
            daily: { missions: [], lastResetDate: '' },
            marathon: { mission: null, lastResetDate: '' },
          };

          // Apply events to complete all missions
          let result = updateMissionProgress(state, { type: 'SWAP_COUNT', value: swapProgress });
          result = updateMissionProgress(result, { type: 'COLLECT', value: collectProgress });
          result = updateMissionProgress(result, { type: 'COLLISION', value: collisionProgress });

          // All missions should be completed
          expect(result.soundCheck.missions[0].completed).toBe(true);
          expect(result.soundCheck.missions[1].completed).toBe(true);
          expect(result.soundCheck.missions[2].completed).toBe(true);

          // soundCheckComplete flag should be true
          expect(result.soundCheck.completed).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 10: Sound Check Completion Unlocks Daily**
   * **Validates: Requirements 1.5**
   *
   * Sound Check should NOT be marked complete if any mission is incomplete.
   */
  test('Sound Check is not complete if any mission is incomplete', () => {
    fc.assert(
      fc.property(
        // Generate which missions to complete (at least one must be incomplete)
        fc.integer({ min: 0, max: 2 }), // Index of mission to leave incomplete
        (incompleteIndex) => {
          const state: MissionState = {
            soundCheck: {
              missions: [
                {
                  id: 'sound-check-swap',
                  category: 'SOUND_CHECK',
                  type: 'SWAP_COUNT',
                  title: 'First Frequency Shift',
                  description: 'Perform 10 successful Swaps',
                  goal: 10,
                  progress: 0,
                  completed: false,
                  rewards: { xp: 10, shards: 0 },
                },
                {
                  id: 'sound-check-collect',
                  category: 'SOUND_CHECK',
                  type: 'COLLECT',
                  title: 'Data Collector',
                  description: 'Collect your first Shard',
                  goal: 1,
                  progress: 0,
                  completed: false,
                  rewards: { xp: 10, shards: 0 },
                },
                {
                  id: 'sound-check-collision',
                  category: 'SOUND_CHECK',
                  type: 'COLLISION',
                  title: 'Signal Loss',
                  description: 'Experience your first collision',
                  goal: 1,
                  progress: 0,
                  completed: false,
                  rewards: { xp: 0, shards: 50 },
                },
              ],
              completed: false,
            },
            daily: { missions: [], lastResetDate: '' },
            marathon: { mission: null, lastResetDate: '' },
          };

          // Complete all missions except the one at incompleteIndex
          let result = state;
          if (incompleteIndex !== 0) {
            result = updateMissionProgress(result, { type: 'SWAP_COUNT', value: 10 });
          }
          if (incompleteIndex !== 1) {
            result = updateMissionProgress(result, { type: 'COLLECT', value: 1 });
          }
          if (incompleteIndex !== 2) {
            result = updateMissionProgress(result, { type: 'COLLISION', value: 1 });
          }

          // The incomplete mission should not be completed
          expect(result.soundCheck.missions[incompleteIndex].completed).toBe(false);

          // soundCheckComplete flag should be false
          expect(result.soundCheck.completed).toBe(false);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 10: Sound Check Completion Unlocks Daily**
   * **Validates: Requirements 1.5**
   *
   * Once Sound Check is complete, Daily missions can be generated via checkMissionReset.
   */
  test('Daily missions are generated after Sound Check completion', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          // Create a state with completed Sound Check
          const state: MissionState = {
            soundCheck: {
              missions: [
                {
                  id: 'sound-check-swap',
                  category: 'SOUND_CHECK',
                  type: 'SWAP_COUNT',
                  title: 'First Frequency Shift',
                  description: 'Perform 10 successful Swaps',
                  goal: 10,
                  progress: 10,
                  completed: true,
                  rewards: { xp: 10, shards: 0 },
                },
                {
                  id: 'sound-check-collect',
                  category: 'SOUND_CHECK',
                  type: 'COLLECT',
                  title: 'Data Collector',
                  description: 'Collect your first Shard',
                  goal: 1,
                  progress: 1,
                  completed: true,
                  rewards: { xp: 10, shards: 0 },
                },
                {
                  id: 'sound-check-collision',
                  category: 'SOUND_CHECK',
                  type: 'COLLISION',
                  title: 'Signal Loss',
                  description: 'Experience your first collision',
                  goal: 1,
                  progress: 1,
                  completed: true,
                  rewards: { xp: 0, shards: 50 },
                },
              ],
              completed: true,
            },
            daily: { missions: [], lastResetDate: '' }, // Empty, needs generation
            marathon: { mission: null, lastResetDate: '' },
          };

          // Check mission reset should generate daily missions
          const result = checkMissionReset(state, date);

          // Daily missions should be generated (3 missions)
          expect(result.daily.missions.length).toBe(3);
          
          // Marathon should also be generated
          expect(result.marathon.mission).not.toBeNull();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 10: Sound Check Completion Unlocks Daily**
   * **Validates: Requirements 1.5**
   *
   * Daily missions should NOT be generated if Sound Check is incomplete.
   */
  test('Daily missions are NOT generated before Sound Check completion', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).filter(d => !isNaN(d.getTime())),
        (date) => {
          // Create a state with incomplete Sound Check
          const state: MissionState = {
            soundCheck: {
              missions: [
                {
                  id: 'sound-check-swap',
                  category: 'SOUND_CHECK',
                  type: 'SWAP_COUNT',
                  title: 'First Frequency Shift',
                  description: 'Perform 10 successful Swaps',
                  goal: 10,
                  progress: 5, // Not complete
                  completed: false,
                  rewards: { xp: 10, shards: 0 },
                },
                {
                  id: 'sound-check-collect',
                  category: 'SOUND_CHECK',
                  type: 'COLLECT',
                  title: 'Data Collector',
                  description: 'Collect your first Shard',
                  goal: 1,
                  progress: 0,
                  completed: false,
                  rewards: { xp: 10, shards: 0 },
                },
                {
                  id: 'sound-check-collision',
                  category: 'SOUND_CHECK',
                  type: 'COLLISION',
                  title: 'Signal Loss',
                  description: 'Experience your first collision',
                  goal: 1,
                  progress: 0,
                  completed: false,
                  rewards: { xp: 0, shards: 50 },
                },
              ],
              completed: false,
            },
            daily: { missions: [], lastResetDate: '' },
            marathon: { mission: null, lastResetDate: '' },
          };

          // Check mission reset should NOT generate daily missions
          const result = checkMissionReset(state, date);

          // Daily missions should remain empty
          expect(result.daily.missions.length).toBe(0);
          
          // Marathon should also remain null
          expect(result.marathon.mission).toBeNull();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Mission System - Corrupted Data Recovery Properties', () => {
  /**
   * **Feature: progression-system, Property 11: Corrupted Data Recovery**
   * **Validates: Requirements 8.4**
   *
   * For any corrupted or invalid localStorage data, loading should return
   * a valid default mission state without throwing errors.
   */
  test('Corrupted data returns default state without throwing', () => {
    // Test various types of corrupted data
    const corruptedDataSamples = [
      null,
      undefined,
      '',
      'not json',
      '{"invalid": json}',
      123,
      true,
      [],
      {},
      { soundCheck: null },
      { soundCheck: { missions: 'not array', completed: true } },
      { soundCheck: { missions: [], completed: 'not boolean' } },
      { soundCheck: { missions: [], completed: true }, daily: null },
      { soundCheck: { missions: [], completed: true }, daily: { missions: [], lastResetDate: 123 } },
      { soundCheck: { missions: [], completed: true }, daily: { missions: [], lastResetDate: '' }, marathon: null },
      { soundCheck: { missions: [{ invalid: 'mission' }], completed: true }, daily: { missions: [], lastResetDate: '' }, marathon: { mission: null, lastResetDate: '' } },
    ];

    for (const corruptedData of corruptedDataSamples) {
      // Validate returns null for corrupted data
      const validated = validateMissionState(corruptedData);
      expect(validated).toBeNull();
    }
  });

  /**
   * **Feature: progression-system, Property 11: Corrupted Data Recovery (Random Invalid Data)**
   * **Validates: Requirements 8.4**
   *
   * For any randomly generated invalid data structure, validateMissionState
   * should return null without throwing.
   */
  test('Random invalid data structures return null without throwing', () => {
    // Arbitrary for invalid data that doesn't match MissionState structure
    const invalidDataArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.array(fc.anything()),
      // Object with wrong structure
      fc.record({
        wrongField: fc.string(),
      }),
      // Object with partial structure
      fc.record({
        soundCheck: fc.constant(null),
      }),
      // Object with wrong types
      fc.record({
        soundCheck: fc.record({
          missions: fc.string(), // Should be array
          completed: fc.string(), // Should be boolean
        }),
        daily: fc.record({
          missions: fc.array(fc.string()), // Should be Mission[]
          lastResetDate: fc.integer(), // Should be string
        }),
        marathon: fc.record({
          mission: fc.string(), // Should be Mission | null
          lastResetDate: fc.integer(), // Should be string
        }),
      }),
    );

    fc.assert(
      fc.property(
        invalidDataArb,
        (invalidData) => {
          // Should not throw
          let result: MissionState | null;
          try {
            result = validateMissionState(invalidData);
          } catch (e) {
            // If it throws, the test fails
            return false;
          }

          // Should return null for invalid data
          expect(result).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 11: Corrupted Data Recovery (Load from corrupted storage)**
   * **Validates: Requirements 8.4**
   *
   * When localStorage contains corrupted data, loadMissionState should
   * return a valid default state.
   */
  test('Loading corrupted localStorage data returns valid default state', () => {
    const corruptedJsonStrings = [
      'not valid json',
      '{"soundCheck": null}',
      '{"soundCheck": {"missions": "not array"}}',
      '{}',
      '[]',
      '"string"',
      '123',
      'true',
    ];

    for (const corruptedJson of corruptedJsonStrings) {
      // Directly set corrupted data in localStorage
      localStorageMock.setItem('echo-shift-missions', corruptedJson);

      // Load should return default state without throwing
      let loadedState: MissionState;
      try {
        loadedState = loadMissionState();
      } catch (e) {
        // Should not throw
        expect(e).toBeUndefined();
        continue;
      }

      const defaultState = getDefaultMissionState();

      // Should return a valid default state
      expect(loadedState.soundCheck.completed).toBe(defaultState.soundCheck.completed);
      expect(loadedState.soundCheck.missions.length).toBe(defaultState.soundCheck.missions.length);
      expect(loadedState.daily.missions.length).toBe(defaultState.daily.missions.length);
      expect(loadedState.marathon.mission).toBe(defaultState.marathon.mission);

      localStorageMock.clear();
    }
  });

  /**
   * **Feature: progression-system, Property 11: Corrupted Data Recovery (Mission validation)**
   * **Validates: Requirements 8.4**
   *
   * Invalid mission objects within a state should cause validation to fail.
   */
  test('Invalid mission objects cause validation failure', () => {
    const invalidMissionArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.string(),
      fc.integer(),
      // Missing required fields
      fc.record({
        id: fc.string(),
        // Missing other required fields
      }),
      // Wrong types for fields
      fc.record({
        id: fc.integer(), // Should be string
        category: fc.string(),
        type: fc.string(),
        title: fc.string(),
        description: fc.string(),
        goal: fc.string(), // Should be number
        progress: fc.string(), // Should be number
        completed: fc.string(), // Should be boolean
        rewards: fc.record({
          xp: fc.string(), // Should be number
          shards: fc.string(), // Should be number
        }),
      }),
      // Invalid category
      fc.record({
        id: fc.string(),
        category: fc.constant('INVALID_CATEGORY'),
        type: fc.constant('DISTANCE'),
        title: fc.string(),
        description: fc.string(),
        goal: fc.integer({ min: 1 }),
        progress: fc.integer({ min: 0 }),
        completed: fc.boolean(),
        rewards: fc.record({
          xp: fc.integer({ min: 0 }),
          shards: fc.integer({ min: 0 }),
        }),
      }),
      // Invalid type
      fc.record({
        id: fc.string(),
        category: fc.constant('DAILY'),
        type: fc.constant('INVALID_TYPE'),
        title: fc.string(),
        description: fc.string(),
        goal: fc.integer({ min: 1 }),
        progress: fc.integer({ min: 0 }),
        completed: fc.boolean(),
        rewards: fc.record({
          xp: fc.integer({ min: 0 }),
          shards: fc.integer({ min: 0 }),
        }),
      }),
    );

    fc.assert(
      fc.property(
        invalidMissionArb,
        (invalidMission) => {
          const stateWithInvalidMission = {
            soundCheck: {
              missions: [invalidMission],
              completed: false,
            },
            daily: {
              missions: [],
              lastResetDate: '',
            },
            marathon: {
              mission: null,
              lastResetDate: '',
            },
          };

          const result = validateMissionState(stateWithInvalidMission);
          expect(result).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
