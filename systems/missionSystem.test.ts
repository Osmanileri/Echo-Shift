/**
 * Property-Based & Unit Tests for Mission System v2
 * Uses fast-check for property-based testing
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import type { Mission, MissionEvent, MissionType } from '../types';
import {
    calculateTotalRewards,
    checkMissionCompletion,
    checkMissionReset,
    claimDailyBonus,
    findMissionById,
    generateDailyMissions,
    generateWeeklyMission,
    getActiveMissions,
    getDailyBonusStatus,
    getDefaultMissionState,
    getTrackerMissions,
    getUnclaimedCount,
    markMissionClaimed,
    updateMissionProgress,
    validateMissionState,
} from './missionSystem';

// ============================================================================
// Helpers
// ============================================================================

const missionTypeArb = fc.constantFrom<MissionType>(
  'DISTANCE',
  'SWAP_COUNT',
  'NEAR_MISS',
  'COLLECT',
  'STAY_LANE',
  'COLLISION',
  'PHANTOM_PASS',
  'SPEED_SURVIVAL',
  'STREAK',
  'NO_SWAP',
  'CUMULATIVE'
);

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: 'test-mission',
    category: 'DAILY',
    type: 'DISTANCE',
    title: 'Test Mission',
    description: 'Run 100m',
    goal: 100,
    progress: 0,
    completed: false,
    claimed: false,
    rewards: { xp: 10, shards: 5 },
    ...overrides,
  };
}

// ============================================================================
// generateDailyMissions
// ============================================================================

describe('generateDailyMissions', () => {
  test('always returns exactly 3 missions', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2024-01-01'), max: new Date('2030-01-01') }),
        fc.integer({ min: 1, max: 100 }),
        (date, level) => {
          const dateStr = date.toISOString().split('T')[0];
          const missions = generateDailyMissions(dateStr, level);
          expect(missions).toHaveLength(3);
        }
      )
    );
  });

  test('missions have correct category and structure', () => {
    const missions = generateDailyMissions('2024-06-15', 10);
    for (const m of missions) {
      expect(m.category).toBe('DAILY');
      expect(m.progress).toBe(0);
      expect(m.completed).toBe(false);
      expect(m.claimed).toBe(false);
      expect(m.goal).toBeGreaterThan(0);
      expect(m.rewards.xp).toBeGreaterThanOrEqual(0);
      expect(m.rewards.shards).toBeGreaterThanOrEqual(0);
    }
  });

  test('same date + level produces identical missions (deterministic)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 10 }),
        fc.integer({ min: 1, max: 50 }),
        (dateStr, level) => {
          const a = generateDailyMissions(dateStr, level);
          const b = generateDailyMissions(dateStr, level);
          expect(a.map(m => m.id)).toEqual(b.map(m => m.id));
        }
      )
    );
  });

  test('different dates produce different mission IDs', () => {
    const a = generateDailyMissions('2024-06-15', 10);
    const b = generateDailyMissions('2024-06-16', 10);
    expect(a[0].id).not.toBe(b[0].id);
  });
});

// ============================================================================
// generateWeeklyMission
// ============================================================================

describe('generateWeeklyMission', () => {
  test('returns a single WEEKLY mission', () => {
    const m = generateWeeklyMission('2024-06-10', 15);
    expect(m.category).toBe('WEEKLY');
    expect(m.progress).toBe(0);
    expect(m.completed).toBe(false);
    expect(m.claimed).toBe(false);
    expect(m.goal).toBeGreaterThan(0);
  });

  test('deterministic for same inputs', () => {
    const a = generateWeeklyMission('2024-06-10', 15);
    const b = generateWeeklyMission('2024-06-10', 15);
    expect(a.id).toBe(b.id);
    expect(a.goal).toBe(b.goal);
  });
});

// ============================================================================
// getDefaultMissionState
// ============================================================================

describe('getDefaultMissionState', () => {
  test('returns valid default with all categories', () => {
    const state = getDefaultMissionState();
    expect(state.soundCheck).toBeDefined();
    expect(state.soundCheck.completed).toBe(false);
    expect(state.soundCheck.missions.length).toBeGreaterThan(0);
    expect(state.daily.missions).toEqual([]);
    expect(state.daily.bonusClaimed).toBe(false);
    expect(state.daily.lastResetDate).toBe('');
    expect(state.weekly.mission).toBeNull();
    expect(state.weekly.lastResetDate).toBe('');
  });
});

// ============================================================================
// updateMissionProgress
// ============================================================================

describe('updateMissionProgress', () => {
  test('updates soundCheck missions on matching event', () => {
    const state = getDefaultMissionState();
    const scType = state.soundCheck.missions[0].type;
    const event: MissionEvent = { type: scType, value: 1 };
    const { newState } = updateMissionProgress(state, event);
    const updated = newState.soundCheck.missions[0];
    expect(updated.progress).toBeGreaterThanOrEqual(1);
  });

  test('completes mission when progress >= goal', () => {
    const state = getDefaultMissionState();
    // Give daily a mission
    state.daily.missions = [makeMission({ id: 'd1', goal: 10 })];
    const event: MissionEvent = { type: 'DISTANCE', value: 15 };
    const { newState, justCompleted } = updateMissionProgress(state, event);
    expect(newState.daily.missions[0].completed).toBe(true);
    expect(newState.daily.missions[0].progress).toBe(10); // capped at goal
    expect(justCompleted).toHaveLength(1);
    expect(justCompleted[0].id).toBe('d1');
  });

  test('does not update already completed missions', () => {
    const state = getDefaultMissionState();
    state.daily.missions = [makeMission({ id: 'd1', goal: 10, progress: 10, completed: true })];
    const event: MissionEvent = { type: 'DISTANCE', value: 5 };
    const { newState, justCompleted } = updateMissionProgress(state, event);
    expect(newState.daily.missions[0].progress).toBe(10);
    expect(justCompleted).toHaveLength(0);
  });

  test('progress never exceeds goal (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 10000 }),
        missionTypeArb,
        (goal, value, type) => {
          const state = getDefaultMissionState();
          state.daily.missions = [makeMission({ id: 'd1', goal, type })];
          const event: MissionEvent = { type, value };
          const { newState } = updateMissionProgress(state, event);
          expect(newState.daily.missions[0].progress).toBeLessThanOrEqual(goal);
        }
      )
    );
  });

  test('updates weekly mission on matching event', () => {
    const state = getDefaultMissionState();
    state.weekly.mission = makeMission({ id: 'w1', category: 'WEEKLY', type: 'DISTANCE', goal: 500 });
    const event: MissionEvent = { type: 'DISTANCE', value: 100 };
    const { newState } = updateMissionProgress(state, event);
    expect(newState.weekly.mission!.progress).toBe(100);
  });
});

// ============================================================================
// checkMissionReset
// ============================================================================

describe('checkMissionReset', () => {
  test('generates daily missions when day changes and soundCheck complete', () => {
    const state = getDefaultMissionState();
    state.soundCheck.completed = true;
    state.daily.lastResetDate = '2024-06-14';
    const now = new Date('2024-06-15T10:00:00Z');
    const result = checkMissionReset(state, now, 10);
    expect(result.dailyReset).toBe(true);
    expect(result.state.daily.missions).toHaveLength(3);
    expect(result.state.daily.lastResetDate).toBe('2024-06-15');
  });

  test('does not reset if same day', () => {
    const state = getDefaultMissionState();
    state.soundCheck.completed = true;
    state.daily.lastResetDate = '2024-06-15';
    state.daily.missions = [makeMission()];
    const now = new Date('2024-06-15T20:00:00Z');
    const result = checkMissionReset(state, now, 10);
    expect(result.dailyReset).toBe(false);
    expect(result.state.daily.missions).toHaveLength(1); // unchanged
  });

  test('does not reset before soundCheck complete', () => {
    const state = getDefaultMissionState();
    state.soundCheck.completed = false;
    const now = new Date('2024-06-15T10:00:00Z');
    const result = checkMissionReset(state, now, 10);
    expect(result.dailyReset).toBe(false);
    expect(result.weeklyReset).toBe(false);
  });

  test('generates weekly mission at week boundary', () => {
    const state = getDefaultMissionState();
    state.soundCheck.completed = true;
    state.weekly.lastResetDate = '2024-06-03';
    const now = new Date('2024-06-10T10:00:00Z'); // Monday
    const result = checkMissionReset(state, now, 10);
    expect(result.weeklyReset).toBe(true);
    expect(result.state.weekly.mission).not.toBeNull();
  });
});

// ============================================================================
// Daily Bonus
// ============================================================================

describe('getDailyBonusStatus / claimDailyBonus', () => {
  test('bonus not available when missions incomplete', () => {
    const state = getDefaultMissionState();
    state.daily.missions = [
      makeMission({ id: 'd1', completed: true }),
      makeMission({ id: 'd2', completed: false }),
      makeMission({ id: 'd3', completed: true }),
    ];
    const status = getDailyBonusStatus(state);
    expect(status.bonusAvailable).toBe(false);
    expect(status.completedCount).toBe(2);
  });

  test('bonus available when all 3 missions completed', () => {
    const state = getDefaultMissionState();
    state.daily.missions = [
      makeMission({ id: 'd1', completed: true }),
      makeMission({ id: 'd2', completed: true }),
      makeMission({ id: 'd3', completed: true }),
    ];
    const status = getDailyBonusStatus(state);
    expect(status.bonusAvailable).toBe(true);
  });

  test('claimDailyBonus sets bonusClaimed and returns reward', () => {
    const state = getDefaultMissionState();
    state.daily.missions = [
      makeMission({ id: 'd1', completed: true }),
      makeMission({ id: 'd2', completed: true }),
      makeMission({ id: 'd3', completed: true }),
    ];
    const { newState, reward } = claimDailyBonus(state);
    expect(newState.daily.bonusClaimed).toBe(true);
    expect(reward.shards).toBeGreaterThan(0);
  });

  test('double claim returns zero reward', () => {
    const state = getDefaultMissionState();
    state.daily.missions = [
      makeMission({ id: 'd1', completed: true }),
      makeMission({ id: 'd2', completed: true }),
      makeMission({ id: 'd3', completed: true }),
    ];
    state.daily.bonusClaimed = true;
    const { reward } = claimDailyBonus(state);
    expect(reward.xp).toBe(0);
    expect(reward.shards).toBe(0);
  });
});

// ============================================================================
// markMissionClaimed
// ============================================================================

describe('markMissionClaimed', () => {
  test('claims a daily mission by ID', () => {
    const state = getDefaultMissionState();
    state.daily.missions = [makeMission({ id: 'd1', completed: true })];
    const newState = markMissionClaimed(state, 'd1');
    expect(newState.daily.missions[0].claimed).toBe(true);
  });

  test('claims a weekly mission by ID', () => {
    const state = getDefaultMissionState();
    state.weekly.mission = makeMission({ id: 'w1', category: 'WEEKLY', completed: true });
    const newState = markMissionClaimed(state, 'w1');
    expect(newState.weekly.mission!.claimed).toBe(true);
  });

  test('returns unchanged state for unknown ID', () => {
    const state = getDefaultMissionState();
    const newState = markMissionClaimed(state, 'nonexistent');
    expect(newState).toEqual(state);
  });
});

// ============================================================================
// getActiveMissions / getTrackerMissions / getUnclaimedCount
// ============================================================================

describe('mission helpers', () => {
  test('getActiveMissions includes unclaimed missions', () => {
    const state = getDefaultMissionState();
    state.daily.missions = [
      makeMission({ id: 'd1', completed: false }),
      makeMission({ id: 'd2', completed: true, claimed: true }),
      makeMission({ id: 'd3', completed: true, claimed: false }),
    ];
    const active = getActiveMissions(state);
    const activeIds = active.map(m => m.id);
    expect(activeIds).toContain('d1');
    expect(activeIds).not.toContain('d2');
    expect(activeIds).toContain('d3');
  });

  test('getTrackerMissions returns at most 2', () => {
    const state = getDefaultMissionState();
    // Must complete sound check so those don't crowd tracker
    state.soundCheck.completed = true;
    state.daily.missions = [
      makeMission({ id: 'd1', goal: 100, progress: 80 }),
      makeMission({ id: 'd2', goal: 100, progress: 50 }),
      makeMission({ id: 'd3', goal: 100, progress: 20 }),
    ];
    const tracker = getTrackerMissions(state);
    expect(tracker.length).toBeLessThanOrEqual(2);
  });

  test('getUnclaimedCount counts completed-but-unclaimed', () => {
    const state = getDefaultMissionState();
    state.soundCheck.completed = true;
    state.daily.missions = [
      makeMission({ id: 'd1', completed: true, claimed: false }),
      makeMission({ id: 'd2', completed: true, claimed: true }),
      makeMission({ id: 'd3', completed: false }),
    ];
    const count = getUnclaimedCount(state);
    expect(count).toBe(1);
  });
});

// ============================================================================
// checkMissionCompletion / calculateTotalRewards / findMissionById
// ============================================================================

describe('legacy helpers', () => {
  test('checkMissionCompletion', () => {
    expect(checkMissionCompletion(makeMission({ goal: 10, progress: 10 }))).toBe(true);
    expect(checkMissionCompletion(makeMission({ goal: 10, progress: 5 }))).toBe(false);
  });

  test('calculateTotalRewards sums only completed', () => {
    const missions = [
      makeMission({ completed: true, rewards: { xp: 10, shards: 5 } }),
      makeMission({ completed: false, rewards: { xp: 100, shards: 50 } }),
      makeMission({ completed: true, rewards: { xp: 20, shards: 10 } }),
    ];
    const total = calculateTotalRewards(missions);
    expect(total.xp).toBe(30);
    expect(total.shards).toBe(15);
  });

  test('findMissionById searches all categories', () => {
    const state = getDefaultMissionState();
    state.daily.missions = [makeMission({ id: 'find-me' })];
    expect(findMissionById(state, 'find-me')?.id).toBe('find-me');
    expect(findMissionById(state, 'nope')).toBeNull();
  });
});

// ============================================================================
// validateMissionState
// ============================================================================

describe('validateMissionState', () => {
  test('returns null for non-object input', () => {
    expect(validateMissionState(null)).toBeNull();
    expect(validateMissionState(42)).toBeNull();
    expect(validateMissionState('hello')).toBeNull();
  });

  test('returns null for missing required fields', () => {
    expect(validateMissionState({ soundCheck: {} })).toBeNull();
    expect(validateMissionState({ daily: {} })).toBeNull();
  });

  test('returns state for valid data', () => {
    const state = getDefaultMissionState();
    expect(validateMissionState(state)).toEqual(state);
  });
});
