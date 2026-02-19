/**
 * Level Unlock Manager - Pro-Grade Progression System
 * 
 * Manages the unlock celebration schedule: when a level is completed,
 * checks if a new mechanic / enemy / ability is unlocked and returns
 * the payload for the UnlockModal. Uses persistence so each unlock
 * is only shown once per player.
 *
 * Design rules:
 * - Pure data module — no React, no Canvas, no DOM.
 * - Persists "seen" set via utils/persistence (localStorage + memory fallback).
 * - Unlock schedule is static; adding a new milestone = one array entry.
 */

import { UnlockPayload } from '../types';
import { safeLoad, safePersist, STORAGE_KEYS } from '../utils/persistence';

// ============================================================================
// Unlock Schedule — static milestone table
// ============================================================================

/**
 * Master unlock schedule.
 * `levelId` = the level the player just **completed** (not the one they're about to start).
 * The modal is shown *after* completing this level and *before* the next level starts.
 */
export const UNLOCK_SCHEDULE: UnlockPayload[] = [
  {
    levelId: 1,
    type: 'ABILITY',
    title: 'SYSTEM UPGRADE',
    name: 'SHIFT MECHANIC',
    description: 'Tap to swap polarity. White orb passes white obstacles, black orb passes black obstacles.',
    icon: '⚡',
    color: '#00F0FF',
  },
  {
    levelId: 3,
    type: 'ABILITY',
    title: 'SYSTEM UPGRADE',
    name: 'QUANTUM LOCK',
    description: 'A plasma stream locks your orbs in place. Hold steady and time your movements!',
    icon: '🔒',
    color: '#A855F7',
  },
  {
    levelId: 5,
    type: 'ENEMY',
    title: 'NEW THREAT DETECTED',
    name: 'PULSE GATE',
    description: 'This enemy changes its polarity over time. Watch the color shift and react fast!',
    icon: '🚨',
    color: '#FF2A2A',
  },
  {
    levelId: 10,
    type: 'ABILITY',
    title: 'SYSTEM UPGRADE',
    name: 'GHOST MODE',
    description: 'Phase through obstacles for a brief moment. Use it wisely — cooldown is long.',
    icon: '👻',
    color: '#22D3EE',
  },
  {
    levelId: 11,
    type: 'ENEMY',
    title: 'NEW THREAT DETECTED',
    name: 'PHANTOM OBSTACLES',
    description: 'Some obstacles are invisible until you get close. Stay alert!',
    icon: '👁️',
    color: '#EC4899',
  },
  {
    levelId: 21,
    type: 'ABILITY',
    title: 'SYSTEM UPGRADE',
    name: 'DYNAMIC MIDLINE',
    description: 'The midline now shifts position. Adapt your spacing to survive!',
    icon: '〰️',
    color: '#F59E0B',
  },
  {
    levelId: 31,
    type: 'ABILITY',
    title: 'SYSTEM UPGRADE',
    name: 'RHYTHM SYSTEM',
    description: 'Pass obstacles on beat to build streak multipliers. Feel the rhythm!',
    icon: '🎵',
    color: '#10B981',
  },
  {
    levelId: 41,
    type: 'ABILITY',
    title: 'SYSTEM UPGRADE',
    name: 'GRAVITY FLIP',
    description: 'Gravity inverts periodically. Your controls reverse — stay focused!',
    icon: '🔄',
    color: '#6366F1',
  },
];

// ============================================================================
// Persistence helpers
// ============================================================================

/** Load the set of level-IDs whose unlock modal has already been shown. */
function loadSeenUnlocks(): Set<number> {
  const raw = safeLoad<number[]>(STORAGE_KEYS.SEEN_UNLOCKS, []);
  return new Set(raw);
}

/** Persist the seen-unlock set. */
function saveSeenUnlocks(seen: Set<number>): void {
  safePersist(STORAGE_KEYS.SEEN_UNLOCKS, Array.from(seen));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check whether completing `levelId` triggers an unlock celebration.
 *
 * @param levelId - The level the player just completed (1-based).
 * @returns The `UnlockPayload` to show, or `null` if no new unlock.
 */
export function checkUnlocks(levelId: number): UnlockPayload | null {
  const entry = UNLOCK_SCHEDULE.find(u => u.levelId === levelId);
  if (!entry) return null;

  const seen = loadSeenUnlocks();
  if (seen.has(levelId)) return null;

  return entry;
}

/**
 * Mark an unlock as "seen" so it won't be shown again.
 * Call this when the player taps ACKNOWLEDGE on the modal.
 *
 * @param levelId - The level whose unlock was acknowledged.
 */
export function markUnlockSeen(levelId: number): void {
  const seen = loadSeenUnlocks();
  seen.add(levelId);
  saveSeenUnlocks(seen);
}

/**
 * Get ALL unlock payloads (regardless of seen state).
 * Useful for a "codex" or settings screen.
 */
export function getAllUnlocks(): readonly UnlockPayload[] {
  return UNLOCK_SCHEDULE;
}

/**
 * Get all unlocks that the player has NOT yet seen.
 * Useful for debugging or showing a backlog.
 */
export function getUnseenUnlocks(): UnlockPayload[] {
  const seen = loadSeenUnlocks();
  return UNLOCK_SCHEDULE.filter(u => !seen.has(u.levelId));
}

/**
 * Reset all seen-unlock state (for testing / new-game).
 */
export function resetUnlockState(): void {
  saveSeenUnlocks(new Set());
}
