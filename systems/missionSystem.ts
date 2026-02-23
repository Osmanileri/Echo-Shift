/**
 * Mission System v2 — Unified daily & weekly mission engine
 *
 * Replaces the fragmented system (missionSystem + dailyRituals) with a
 * single, slot-based daily mission engine:
 *
 *   3 daily missions (COMBAT / EXPLORER / MASTER) + 1 weekly + Sound Check onboarding
 *
 * Features:
 *   - Seeded deterministic daily/weekly generation
 *   - Level-scaled goals and rewards
 *   - Unified progress tracking across all mission types
 *   - Daily bonus for completing all 3 missions
 *   - Migration from old MissionState + DailyRituals
 */

import {
    COMBAT_TEMPLATES,
    DAILY_BONUS_REWARD,
    EXPLORER_TEMPLATES,
    MASTER_TEMPLATES,
    resolveDescription,
    scaleGoal,
    SOUND_CHECK_MISSIONS,
    WEEKLY_TEMPLATES,
    type MissionSlotType,
    type MissionTemplate,
} from '../data/missionPool';
import type { Mission, MissionEvent, MissionState } from '../types';
import { safeLoad, safePersist, STORAGE_KEYS } from '../utils/persistence';

// ============================================================================
// Sound Check (onboarding)
// ============================================================================

function createSoundCheckMissions(): Mission[] {
  return SOUND_CHECK_MISSIONS.map(t => ({
    id: t.id,
    category: 'SOUND_CHECK' as const,
    type: t.type,
    title: t.title,
    description: t.description,
    goal: t.goal,
    progress: 0,
    completed: false,
    claimed: false,
    icon: t.icon,
    rewards: { ...t.rewards },
  }));
}

// Re-export for backward compatibility
export { SOUND_CHECK_MISSIONS } from '../data/missionPool';

// ============================================================================
// Seeded Random
// ============================================================================

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ============================================================================
// Daily Mission Generation
// ============================================================================

function pickTemplate<T extends MissionTemplate>(
  templates: T[],
  random: () => number,
  difficulty?: 'easy' | 'medium' | 'hard'
): T {
  const pool = difficulty
    ? templates.filter(t => t.difficulty === difficulty)
    : templates;
  const idx = Math.floor(random() * pool.length);
  return pool[idx] || templates[0];
}

/**
 * Determine mission difficulty based on player level
 */
function getDifficultyForLevel(level: number, slot: MissionSlotType): 'easy' | 'medium' | 'hard' {
  const slotBonus = slot === 'COMBAT' ? -5 : slot === 'MASTER' ? 5 : 0;
  const effective = level + slotBonus;

  if (effective < 8) return 'easy';
  if (effective < 20) return 'medium';
  return 'hard';
}

/**
 * Generate 3 daily missions based on date and player level.
 */
export function generateDailyMissions(dateStr: string, level: number): Mission[] {
  const seed = dateSeed(dateStr);
  const random = seededRandom(seed);

  const slots: Array<{ slot: MissionSlotType; templates: MissionTemplate[] }> = [
    { slot: 'COMBAT', templates: COMBAT_TEMPLATES },
    { slot: 'EXPLORER', templates: EXPLORER_TEMPLATES },
    { slot: 'MASTER', templates: MASTER_TEMPLATES },
  ];

  return slots.map(({ slot, templates }) => {
    const difficulty = getDifficultyForLevel(level, slot);
    const template = pickTemplate(templates, random, difficulty);
    const goal = scaleGoal(template, level);
    const description = resolveDescription(template.description, goal);

    return {
      id: `daily-${slot.toLowerCase()}-${dateStr}`,
      category: 'DAILY' as const,
      slot: slot,
      type: template.type,
      difficulty: template.difficulty,
      title: template.title,
      description,
      goal,
      progress: 0,
      completed: false,
      claimed: false,
      icon: template.icon,
      rewards: { ...template.rewards },
    };
  });
}

// ============================================================================
// Weekly Mission Generation
// ============================================================================

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function generateWeeklyMission(weekStartDate: string, level: number): Mission {
  const seed = dateSeed(weekStartDate + '-weekly');
  const random = seededRandom(seed);
  const templateIdx = Math.floor(random() * WEEKLY_TEMPLATES.length);
  const template = WEEKLY_TEMPLATES[templateIdx];
  const goal = scaleGoal(template, level);
  const description = resolveDescription(template.description, goal);

  return {
    id: `weekly-${weekStartDate}`,
    category: 'WEEKLY',
    type: template.type,
    title: template.title,
    description,
    goal,
    progress: 0,
    completed: false,
    claimed: false,
    icon: template.icon,
    rewards: { ...template.rewards },
  };
}

// ============================================================================
// Default State
// ============================================================================

export function getDefaultMissionState(): MissionState {
  return {
    soundCheck: {
      missions: createSoundCheckMissions(),
      completed: false,
    },
    daily: {
      missions: [],
      bonusClaimed: false,
      lastResetDate: '',
    },
    weekly: {
      mission: null,
      lastResetDate: '',
    },
  };
}

// ============================================================================
// Progress Tracking
// ============================================================================

/**
 * Update mission progress based on a game event.
 * Returns new state + list of missions that just completed this tick.
 */
export function updateMissionProgress(
  state: MissionState,
  event: MissionEvent
): { newState: MissionState; justCompleted: Mission[] } {
  const justCompleted: Mission[] = [];
  const newState = { ...state };

  function updateMissions(missions: Mission[]): Mission[] {
    return missions.map(mission => {
      if (mission.type === event.type && !mission.completed) {
        const newProgress = Math.min(mission.progress + event.value, mission.goal);
        const nowComplete = newProgress >= mission.goal;
        if (nowComplete) {
          justCompleted.push({ ...mission, progress: newProgress, completed: true });
        }
        return { ...mission, progress: newProgress, completed: nowComplete };
      }
      return mission;
    });
  }

  // Sound Check
  if (!state.soundCheck.completed) {
    const updatedMissions = updateMissions(state.soundCheck.missions);
    const allComplete = updatedMissions.every(m => m.completed);
    newState.soundCheck = { missions: updatedMissions, completed: allComplete };
  }

  // Daily
  if (state.daily.missions.length > 0) {
    newState.daily = { ...state.daily, missions: updateMissions(state.daily.missions) };
  }

  // Weekly
  if (state.weekly.mission && !state.weekly.mission.completed) {
    if (state.weekly.mission.type === event.type) {
      const newProgress = Math.min(
        state.weekly.mission.progress + event.value,
        state.weekly.mission.goal
      );
      const nowComplete = newProgress >= state.weekly.mission.goal;
      if (nowComplete) {
        justCompleted.push({ ...state.weekly.mission, progress: newProgress, completed: true });
      }
      newState.weekly = {
        ...state.weekly,
        mission: { ...state.weekly.mission, progress: newProgress, completed: nowComplete },
      };
    }
  }

  return { newState, justCompleted };
}

// ============================================================================
// Reset Logic
// ============================================================================

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function checkMissionReset(
  state: MissionState,
  now: Date,
  playerLevel: number = 1
): { state: MissionState; dailyReset: boolean; weeklyReset: boolean } {
  const today = getDateString(now);
  const monday = getWeekStart(now);

  let newState = { ...state };
  let dailyReset = false;
  let weeklyReset = false;

  if (state.soundCheck.completed && state.daily.lastResetDate !== today) {
    newState.daily = {
      missions: generateDailyMissions(today, playerLevel),
      bonusClaimed: false,
      lastResetDate: today,
    };
    dailyReset = true;
  }

  if (state.soundCheck.completed && state.weekly.lastResetDate !== monday) {
    newState.weekly = {
      mission: generateWeeklyMission(monday, playerLevel),
      lastResetDate: monday,
    };
    weeklyReset = true;
  }

  return { state: newState, dailyReset, weeklyReset };
}

// ============================================================================
// Reward Distribution
// ============================================================================

export function distributeMissionRewards(mission: Mission): { xp: number; shards: number; cosmetic?: string } {
  if (!mission.completed) return { xp: 0, shards: 0 };
  return { ...mission.rewards };
}

export function getDailyBonusStatus(state: MissionState): {
  completedCount: number;
  total: number;
  bonusAvailable: boolean;
  bonusClaimed: boolean;
  bonusReward: { xp: number; shards: number };
} {
  const dailyMissions = state.daily.missions;
  const completedCount = dailyMissions.filter(m => m.completed).length;
  return {
    completedCount,
    total: dailyMissions.length,
    bonusAvailable: completedCount === dailyMissions.length && dailyMissions.length > 0 && !state.daily.bonusClaimed,
    bonusClaimed: state.daily.bonusClaimed,
    bonusReward: { ...DAILY_BONUS_REWARD },
  };
}

export function claimDailyBonus(state: MissionState): { newState: MissionState; reward: { xp: number; shards: number } } {
  const status = getDailyBonusStatus(state);
  if (!status.bonusAvailable) return { newState: state, reward: { xp: 0, shards: 0 } };
  return {
    newState: { ...state, daily: { ...state.daily, bonusClaimed: true } },
    reward: { ...DAILY_BONUS_REWARD },
  };
}

export function markMissionClaimed(state: MissionState, missionId: string): MissionState {
  const newState = { ...state };

  const scIdx = state.soundCheck.missions.findIndex(m => m.id === missionId);
  if (scIdx >= 0) {
    const missions = [...state.soundCheck.missions];
    missions[scIdx] = { ...missions[scIdx], claimed: true };
    newState.soundCheck = { ...state.soundCheck, missions };
    return newState;
  }

  const dIdx = state.daily.missions.findIndex(m => m.id === missionId);
  if (dIdx >= 0) {
    const missions = [...state.daily.missions];
    missions[dIdx] = { ...missions[dIdx], claimed: true };
    newState.daily = { ...state.daily, missions };
    return newState;
  }

  if (state.weekly.mission?.id === missionId) {
    newState.weekly = { ...state.weekly, mission: { ...state.weekly.mission!, claimed: true } };
    return newState;
  }

  return newState;
}

// ============================================================================
// Helpers
// ============================================================================

/** Get all active missions (for panel display) */
export function getActiveMissions(state: MissionState): Mission[] {
  const missions: Mission[] = [];
  if (!state.soundCheck.completed) {
    missions.push(...state.soundCheck.missions.filter(m => !m.completed || !m.claimed));
  }
  missions.push(...state.daily.missions.filter(m => !m.claimed));
  if (state.weekly.mission && !state.weekly.mission.claimed) {
    missions.push(state.weekly.mission);
  }
  return missions;
}

/** Get 2 missions closest to completion (for in-game tracker HUD) */
export function getTrackerMissions(state: MissionState): Mission[] {
  const active = getActiveMissions(state).filter(m => !m.completed);
  active.sort((a, b) => (b.progress / b.goal) - (a.progress / a.goal));
  return active.slice(0, 2);
}

/** Count unclaimed rewards (for badge indicator) */
export function getUnclaimedCount(state: MissionState): number {
  let count = 0;
  if (!state.soundCheck.completed) {
    count += state.soundCheck.missions.filter(m => m.completed && !m.claimed).length;
  }
  count += state.daily.missions.filter(m => m.completed && !m.claimed).length;
  if (state.weekly.mission?.completed && !state.weekly.mission.claimed) count++;
  const bonus = getDailyBonusStatus(state);
  if (bonus.bonusAvailable) count++;
  return count;
}

/** Legacy helpers for backward compatibility */
export function checkMissionCompletion(mission: Mission): boolean {
  return mission.progress >= mission.goal;
}

export function calculateTotalRewards(missions: Mission[]): { xp: number; shards: number } {
  return missions.reduce(
    (total, m) => m.completed
      ? { xp: total.xp + m.rewards.xp, shards: total.shards + m.rewards.shards }
      : total,
    { xp: 0, shards: 0 }
  );
}

/**
 * Find a mission by ID across all categories.
 */
export function findMissionById(state: MissionState, id: string): Mission | null {
  const sc = state.soundCheck.missions.find(m => m.id === id);
  if (sc) return sc;
  const d = state.daily.missions.find(m => m.id === id);
  if (d) return d;
  if (state.weekly.mission?.id === id) return state.weekly.mission;
  return null;
}

// ============================================================================
// Persistence
// ============================================================================

export function saveMissionState(state: MissionState): boolean {
  return safePersist(STORAGE_KEYS.MISSIONS, state);
}

export function loadMissionState(): MissionState {
  const saved = safeLoad<unknown>(STORAGE_KEYS.MISSIONS, null);
  if (saved === null) return getDefaultMissionState();

  const s = saved as Record<string, unknown>;
  if (!s.soundCheck || !s.daily) {
    console.warn('[MissionSystem] Corrupted data, resetting');
    return getDefaultMissionState();
  }

  const state = saved as MissionState;

  // Migration: old marathon → weekly
  if (!state.weekly && (state as any).marathon) {
    const marathon = (state as any).marathon;
    state.weekly = {
      mission: marathon.mission
        ? { ...marathon.mission, category: 'WEEKLY', claimed: marathon.mission.claimed ?? false }
        : null,
      lastResetDate: marathon.lastResetDate || '',
    };
    delete (state as any).marathon;
  }

  // Ensure weekly exists
  if (!state.weekly) state.weekly = { mission: null, lastResetDate: '' };

  // Ensure bonusClaimed (migration)
  if (state.daily.bonusClaimed === undefined) (state.daily as any).bonusClaimed = false;

  // Ensure claimed field on all missions (migration)
  const ensureClaimed = (m: Mission) => { if (m.claimed === undefined) (m as any).claimed = false; };
  state.soundCheck.missions.forEach(ensureClaimed);
  state.daily.missions.forEach(ensureClaimed);
  if (state.weekly.mission) ensureClaimed(state.weekly.mission);

  return state;
}

// Legacy export for old validation (used in tests)
export function validateMissionState(data: unknown): MissionState | null {
  if (!data || typeof data !== 'object') return null;
  const state = data as Record<string, unknown>;
  if (!state.soundCheck || !state.daily) return null;
  return data as MissionState;
}

/**
 * Migrate old dailyRituals localStorage data.
 * Call once on first load to clean up.
 */
export function migrateOldRituals(): void {
  try {
    const OLD_KEY = 'echo_shift_daily_rituals';
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      localStorage.removeItem(OLD_KEY);
      console.log('[MissionSystem] Migrated old dailyRituals data');
    }
  } catch {
    // Ignore
  }
}
