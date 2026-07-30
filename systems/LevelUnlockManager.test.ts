/**
 * Tests for Level Unlock Manager
 * Pro-Grade Progression System
 *
 * Covers:
 * - Unlock schedule correctness
 * - Persistence deduplication (seen once → never again)
 * - Edge cases (invalid level, reset)
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
    checkUnlocks,
    getAllUnlocks,
    getUnseenUnlocks,
    markUnlockSeen,
    resetUnlockState,
    UNLOCK_SCHEDULE,
} from './LevelUnlockManager';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('Level Unlock Manager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  // ─── Schedule Correctness ───────────────────────────────────────
  test('UNLOCK_SCHEDULE has entries for key milestone levels', () => {
    const milestoneLevels = [1, 3, 5, 10, 11, 21, 31, 41];
    for (const lvl of milestoneLevels) {
      const entry = UNLOCK_SCHEDULE.find(u => u.levelId === lvl);
      expect(entry, `Missing unlock entry for level ${lvl}`).toBeDefined();
    }
  });

  test('Every entry has required fields', () => {
    for (const entry of UNLOCK_SCHEDULE) {
      expect(entry.levelId).toBeGreaterThan(0);
      expect(['ABILITY', 'ENEMY', 'MECHANIC']).toContain(entry.type);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.icon.length).toBeGreaterThan(0);
      expect(entry.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('No duplicate levelIds in schedule', () => {
    const ids = UNLOCK_SCHEDULE.map(u => u.levelId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ─── checkUnlocks ──────────────────────────────────────────────
  test('checkUnlocks returns payload for milestone level', () => {
    const result = checkUnlocks(1);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('KUTUP DEĞİŞTİRME (SHIFT)');
    expect(result!.type).toBe('ABILITY');
  });

  test('checkUnlocks returns null for non-milestone level', () => {
    expect(checkUnlocks(2)).toBeNull();
    expect(checkUnlocks(4)).toBeNull();
    expect(checkUnlocks(99)).toBeNull();
  });

  test('checkUnlocks returns null for already-seen level', () => {
    // First call: returns payload
    expect(checkUnlocks(1)).not.toBeNull();
    // Mark as seen
    markUnlockSeen(1);
    // Second call: null
    expect(checkUnlocks(1)).toBeNull();
  });

  // ─── Persistence ───────────────────────────────────────────────
  test('markUnlockSeen persists to localStorage', () => {
    markUnlockSeen(5);
    expect(localStorageMock.setItem).toHaveBeenCalled();
    // Should contain level 5
    const lastCall = localStorageMock.setItem.mock.calls[
      localStorageMock.setItem.mock.calls.length - 1
    ];
    const persisted: number[] = JSON.parse(lastCall[1]);
    expect(persisted).toContain(5);
  });

  test('Multiple markUnlockSeen calls accumulate', () => {
    markUnlockSeen(1);
    markUnlockSeen(3);
    markUnlockSeen(5);

    // All three should now be "seen"
    expect(checkUnlocks(1)).toBeNull();
    expect(checkUnlocks(3)).toBeNull();
    expect(checkUnlocks(5)).toBeNull();
    // Others still available
    expect(checkUnlocks(10)).not.toBeNull();
  });

  // ─── Utility Functions ─────────────────────────────────────────
  test('getAllUnlocks returns full schedule', () => {
    const all = getAllUnlocks();
    expect(all.length).toBe(UNLOCK_SCHEDULE.length);
  });

  test('getUnseenUnlocks respects seen state', () => {
    const before = getUnseenUnlocks();
    expect(before.length).toBe(UNLOCK_SCHEDULE.length);

    markUnlockSeen(1);
    markUnlockSeen(3);

    const after = getUnseenUnlocks();
    expect(after.length).toBe(UNLOCK_SCHEDULE.length - 2);
    expect(after.find(u => u.levelId === 1)).toBeUndefined();
    expect(after.find(u => u.levelId === 3)).toBeUndefined();
  });

  test('resetUnlockState clears all seen state', () => {
    markUnlockSeen(1);
    markUnlockSeen(5);
    markUnlockSeen(10);

    resetUnlockState();

    // Everything should be "unseen" again
    expect(checkUnlocks(1)).not.toBeNull();
    expect(checkUnlocks(5)).not.toBeNull();
    expect(checkUnlocks(10)).not.toBeNull();
  });

  // ─── Edge Cases ────────────────────────────────────────────────
  test('checkUnlocks handles level 0 gracefully', () => {
    expect(checkUnlocks(0)).toBeNull();
  });

  test('checkUnlocks handles negative level', () => {
    expect(checkUnlocks(-1)).toBeNull();
  });

  test('checkUnlocks handles very high level', () => {
    expect(checkUnlocks(999)).toBeNull();
  });

  test('markUnlockSeen for non-milestone level does not break schedule', () => {
    markUnlockSeen(2); // Not a milestone
    // Milestone 1 should still work
    expect(checkUnlocks(1)).not.toBeNull();
  });
});
