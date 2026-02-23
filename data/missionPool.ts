/**
 * Mission Pool — Unified daily & weekly mission definitions
 * Replaces data/rituals.ts with a richer, slot-based mission system
 *
 * 3 slots per day:
 *   COMBAT  — offensive/reflex-based (near miss, collision, streak)
 *   EXPLORER — distance/speed-based (distance, speed survival, cumulative)
 *   MASTER  — discipline/control-based (no swap, stay lane, phantom pass, collect)
 *
 * Weekly mission: large cumulative goal across multiple sessions
 *
 * Mission difficulty scales with player level (syncRate).
 */

// ─── Types ───

export type MissionSlotType = 'COMBAT' | 'EXPLORER' | 'MASTER';

export type UnifiedMissionType =
  | 'DISTANCE'         // Total meters traveled
  | 'SWAP_COUNT'       // Number of lane swaps
  | 'NEAR_MISS'        // Near miss count
  | 'COLLECT'          // Shards collected
  | 'STAY_LANE'        // Duration in single lane (ms)
  | 'COLLISION'        // First collision (Sound Check)
  | 'PHANTOM_PASS'     // Pass phantom obstacles
  | 'SPEED_SURVIVAL'   // Survive X seconds at high speed
  | 'STREAK'           // Reach X streak
  | 'NO_SWAP'          // Survive X seconds without swapping
  | 'CUMULATIVE';      // Cumulative score across sessions

export type MissionDifficulty = 'easy' | 'medium' | 'hard';

export interface MissionTemplate {
  id: string;
  slot: MissionSlotType;
  type: UnifiedMissionType;
  difficulty: MissionDifficulty;
  /** Turkish title */
  title: string;
  /** Turkish description — use {goal} placeholder for dynamic value */
  description: string;
  /** Base goal — scaled by level bracket */
  baseGoal: number;
  /** Goal scaling per level bracket:
   *  bracket 0 = level 1-9, bracket 1 = 10-19, bracket 2 = 20-39, bracket 3 = 40+ */
  goalScale: [number, number, number, number];
  /** Icon emoji for UI display */
  icon: string;
  /** Reward multiplier relative to difficulty base:
   *  easy → 1.0, medium → 1.8, hard → 3.0 */
  rewards: {
    xp: number;
    shards: number;
  };
}

export interface WeeklyMissionTemplate {
  id: string;
  type: UnifiedMissionType;
  title: string;
  description: string;
  baseGoal: number;
  goalScale: [number, number, number, number];
  icon: string;
  rewards: {
    xp: number;
    shards: number;
    cosmetic?: string;
  };
}

// ─── Difficulty Base Rewards ───

export const DIFFICULTY_REWARDS = {
  easy:   { xp: 25,  shards: 60  },
  medium: { xp: 50,  shards: 120 },
  hard:   { xp: 80,  shards: 200 },
} as const;

/** Bonus for completing all 3 daily missions */
export const DAILY_BONUS_REWARD = { xp: 60, shards: 250 };

// ─── COMBAT Slot Templates ───

export const COMBAT_TEMPLATES: MissionTemplate[] = [
  {
    id: 'combat-near-miss-easy',
    slot: 'COMBAT',
    type: 'NEAR_MISS',
    difficulty: 'easy',
    title: 'Kıl Payı',
    description: '{goal} kıl payı kaçış yap',
    baseGoal: 5,
    goalScale: [1, 1.4, 1.8, 2.4],
    icon: '⚡',
    rewards: DIFFICULTY_REWARDS.easy,
  },
  {
    id: 'combat-streak-easy',
    slot: 'COMBAT',
    type: 'STREAK',
    difficulty: 'easy',
    title: 'Ritim Başlangıcı',
    description: '{goal}x streak ulaş',
    baseGoal: 5,
    goalScale: [1, 1.2, 1.6, 2],
    icon: '🔥',
    rewards: DIFFICULTY_REWARDS.easy,
  },
  {
    id: 'combat-swap-easy',
    slot: 'COMBAT',
    type: 'SWAP_COUNT',
    difficulty: 'easy',
    title: 'Frekans Atlayıcı',
    description: '{goal} geçiş yap',
    baseGoal: 20,
    goalScale: [1, 1.5, 2, 2.5],
    icon: '↔️',
    rewards: DIFFICULTY_REWARDS.easy,
  },
  {
    id: 'combat-near-miss-med',
    slot: 'COMBAT',
    type: 'NEAR_MISS',
    difficulty: 'medium',
    title: 'Sınır Yürüyüşçüsü',
    description: '{goal} kıl payı kaçış yap',
    baseGoal: 10,
    goalScale: [1, 1.3, 1.7, 2.2],
    icon: '⚡',
    rewards: DIFFICULTY_REWARDS.medium,
  },
  {
    id: 'combat-streak-med',
    slot: 'COMBAT',
    type: 'STREAK',
    difficulty: 'medium',
    title: 'Akış Ustası',
    description: '{goal}x streak ulaş',
    baseGoal: 10,
    goalScale: [1, 1.2, 1.5, 2],
    icon: '🔥',
    rewards: DIFFICULTY_REWARDS.medium,
  },
  {
    id: 'combat-swap-med',
    slot: 'COMBAT',
    type: 'SWAP_COUNT',
    difficulty: 'medium',
    title: 'Hızlı Geçişçi',
    description: '{goal} geçiş yap',
    baseGoal: 50,
    goalScale: [1, 1.4, 1.8, 2.2],
    icon: '↔️',
    rewards: DIFFICULTY_REWARDS.medium,
  },
  {
    id: 'combat-near-miss-hard',
    slot: 'COMBAT',
    type: 'NEAR_MISS',
    difficulty: 'hard',
    title: 'Ölüm Dansçısı',
    description: '{goal} kıl payı kaçış yap',
    baseGoal: 20,
    goalScale: [1, 1.3, 1.6, 2],
    icon: '💀',
    rewards: DIFFICULTY_REWARDS.hard,
  },
  {
    id: 'combat-streak-hard',
    slot: 'COMBAT',
    type: 'STREAK',
    difficulty: 'hard',
    title: 'Ritim Efsanesi',
    description: '{goal}x streak ulaş',
    baseGoal: 15,
    goalScale: [1, 1.2, 1.4, 1.8],
    icon: '🔥',
    rewards: DIFFICULTY_REWARDS.hard,
  },
];

// ─── EXPLORER Slot Templates ───

export const EXPLORER_TEMPLATES: MissionTemplate[] = [
  {
    id: 'explorer-distance-easy',
    slot: 'EXPLORER',
    type: 'DISTANCE',
    difficulty: 'easy',
    title: 'Kısa Koşu',
    description: '{goal}m yol kat et',
    baseGoal: 300,
    goalScale: [1, 1.5, 2, 3],
    icon: '🏃',
    rewards: DIFFICULTY_REWARDS.easy,
  },
  {
    id: 'explorer-cumulative-easy',
    slot: 'EXPLORER',
    type: 'CUMULATIVE',
    difficulty: 'easy',
    title: 'Günlük Antrenman',
    description: 'Bugün toplam {goal} puan kazan',
    baseGoal: 3000,
    goalScale: [1, 1.5, 2, 3],
    icon: '📊',
    rewards: DIFFICULTY_REWARDS.easy,
  },
  {
    id: 'explorer-distance-med',
    slot: 'EXPLORER',
    type: 'DISTANCE',
    difficulty: 'medium',
    title: 'Alt Bas Koşucusu',
    description: '{goal}m yol kat et',
    baseGoal: 800,
    goalScale: [1, 1.4, 1.8, 2.2],
    icon: '🏃',
    rewards: DIFFICULTY_REWARDS.medium,
  },
  {
    id: 'explorer-speed-med',
    slot: 'EXPLORER',
    type: 'SPEED_SURVIVAL',
    difficulty: 'medium',
    title: 'Hız Canavarı',
    description: 'Yüksek hızda {goal} saniye dayan',
    baseGoal: 8,
    goalScale: [1, 1.3, 1.5, 2],
    icon: '💨',
    rewards: DIFFICULTY_REWARDS.medium,
  },
  {
    id: 'explorer-cumulative-med',
    slot: 'EXPLORER',
    type: 'CUMULATIVE',
    difficulty: 'medium',
    title: 'Maraton',
    description: 'Bugün toplam {goal} puan kazan',
    baseGoal: 15000,
    goalScale: [1, 1.3, 1.7, 2],
    icon: '📊',
    rewards: DIFFICULTY_REWARDS.medium,
  },
  {
    id: 'explorer-distance-hard',
    slot: 'EXPLORER',
    type: 'DISTANCE',
    difficulty: 'hard',
    title: 'Uzun Dalga',
    description: 'Tek seferde {goal}m yol kat et',
    baseGoal: 2000,
    goalScale: [1, 1.3, 1.5, 2],
    icon: '🏃',
    rewards: DIFFICULTY_REWARDS.hard,
  },
  {
    id: 'explorer-speed-hard',
    slot: 'EXPLORER',
    type: 'SPEED_SURVIVAL',
    difficulty: 'hard',
    title: 'Işık Hızı',
    description: 'Yüksek hızda {goal} saniye dayan',
    baseGoal: 15,
    goalScale: [1, 1.2, 1.4, 1.8],
    icon: '💨',
    rewards: DIFFICULTY_REWARDS.hard,
  },
];

// ─── MASTER Slot Templates ───

export const MASTER_TEMPLATES: MissionTemplate[] = [
  {
    id: 'master-collect-easy',
    slot: 'MASTER',
    type: 'COLLECT',
    difficulty: 'easy',
    title: 'Parça Toplayıcı',
    description: '{goal} parça topla',
    baseGoal: 10,
    goalScale: [1, 1.5, 2, 2.5],
    icon: '💎',
    rewards: DIFFICULTY_REWARDS.easy,
  },
  {
    id: 'master-staylane-easy',
    slot: 'MASTER',
    type: 'STAY_LANE',
    difficulty: 'easy',
    title: 'Sabit Sinyal',
    description: '{goal} saniye aynı şeritte kal',
    baseGoal: 10,
    goalScale: [1, 1.3, 1.5, 2],
    icon: '📡',
    rewards: DIFFICULTY_REWARDS.easy,
  },
  {
    id: 'master-phantom-med',
    slot: 'MASTER',
    type: 'PHANTOM_PASS',
    difficulty: 'medium',
    title: 'Hayalet Avcısı',
    description: '{goal} hayalet engeli geç',
    baseGoal: 15,
    goalScale: [1, 1.3, 1.7, 2],
    icon: '👻',
    rewards: DIFFICULTY_REWARDS.medium,
  },
  {
    id: 'master-collect-med',
    slot: 'MASTER',
    type: 'COLLECT',
    difficulty: 'medium',
    title: 'Mükemmel Toplayıcı',
    description: '{goal} parça topla',
    baseGoal: 25,
    goalScale: [1, 1.4, 1.8, 2.2],
    icon: '💎',
    rewards: DIFFICULTY_REWARDS.medium,
  },
  {
    id: 'master-noswap-med',
    slot: 'MASTER',
    type: 'NO_SWAP',
    difficulty: 'medium',
    title: 'Sabit Eller',
    description: '{goal} saniye geçiş yapmadan dayan',
    baseGoal: 15,
    goalScale: [1, 1.3, 1.5, 2],
    icon: '✋',
    rewards: DIFFICULTY_REWARDS.medium,
  },
  {
    id: 'master-staylane-hard',
    slot: 'MASTER',
    type: 'STAY_LANE',
    difficulty: 'hard',
    title: 'Tek Frekans',
    description: '{goal} saniye aynı şeritte kal',
    baseGoal: 30,
    goalScale: [1, 1.2, 1.4, 1.7],
    icon: '📡',
    rewards: DIFFICULTY_REWARDS.hard,
  },
  {
    id: 'master-phantom-hard',
    slot: 'MASTER',
    type: 'PHANTOM_PASS',
    difficulty: 'hard',
    title: 'Gölge Ustası',
    description: '{goal} hayalet engeli geç',
    baseGoal: 30,
    goalScale: [1, 1.2, 1.5, 1.8],
    icon: '👻',
    rewards: DIFFICULTY_REWARDS.hard,
  },
  {
    id: 'master-noswap-hard',
    slot: 'MASTER',
    type: 'NO_SWAP',
    difficulty: 'hard',
    title: 'Donmuş Eller',
    description: '{goal} saniye geçiş yapmadan dayan',
    baseGoal: 30,
    goalScale: [1, 1.2, 1.4, 1.6],
    icon: '✋',
    rewards: DIFFICULTY_REWARDS.hard,
  },
];

// ─── Weekly Mission Templates ───

export const WEEKLY_TEMPLATES: WeeklyMissionTemplate[] = [
  {
    id: 'weekly-distance',
    type: 'DISTANCE',
    title: 'Haftalık Maraton',
    description: 'Bu hafta toplam {goal}m yol kat et',
    baseGoal: 8000,
    goalScale: [1, 1.5, 2, 3],
    icon: '🏅',
    rewards: { xp: 300, shards: 600, cosmetic: 'marathon-trail' },
  },
  {
    id: 'weekly-cumulative',
    type: 'CUMULATIVE',
    title: 'Haftalık Şampiyon',
    description: 'Bu hafta toplam {goal} puan kazan',
    baseGoal: 50000,
    goalScale: [1, 1.4, 1.8, 2.5],
    icon: '🏆',
    rewards: { xp: 350, shards: 700 },
  },
  {
    id: 'weekly-swap',
    type: 'SWAP_COUNT',
    title: 'Geçiş Maratonu',
    description: 'Bu hafta toplam {goal} geçiş yap',
    baseGoal: 200,
    goalScale: [1, 1.5, 2, 2.5],
    icon: '↔️',
    rewards: { xp: 250, shards: 500 },
  },
  {
    id: 'weekly-near-miss',
    type: 'NEAR_MISS',
    title: 'Haftalık Risk',
    description: 'Bu hafta toplam {goal} kıl payı kaçış yap',
    baseGoal: 50,
    goalScale: [1, 1.4, 1.8, 2.2],
    icon: '⚡',
    rewards: { xp: 300, shards: 650 },
  },
];

// ─── Sound Check Missions (Onboarding) ───

export const SOUND_CHECK_MISSIONS = [
  {
    id: 'sound-check-swap',
    type: 'SWAP_COUNT' as UnifiedMissionType,
    title: 'İlk Frekans Değişimi',
    description: '10 başarılı Geçiş yap',
    goal: 10,
    icon: '↔️',
    rewards: { xp: 10, shards: 0 },
  },
  {
    id: 'sound-check-collect',
    type: 'COLLECT' as UnifiedMissionType,
    title: 'Veri Toplayıcı',
    description: 'İlk Parçanı topla',
    goal: 1,
    icon: '💎',
    rewards: { xp: 10, shards: 0 },
  },
  {
    id: 'sound-check-collision',
    type: 'COLLISION' as UnifiedMissionType,
    title: 'Sinyal Kaybı',
    description: 'İlk çarpışmanı yaşa',
    goal: 1,
    icon: '💥',
    rewards: { xp: 0, shards: 50 },
  },
] as const;

// ─── Helpers ───

/** Get level bracket index for goal scaling */
export function getLevelBracket(level: number): 0 | 1 | 2 | 3 {
  if (level < 10) return 0;
  if (level < 20) return 1;
  if (level < 40) return 2;
  return 3;
}

/** Scale a template goal by player level */
export function scaleGoal(template: { baseGoal: number; goalScale: readonly [number, number, number, number] }, level: number): number {
  const bracket = getLevelBracket(level);
  const raw = template.baseGoal * template.goalScale[bracket];
  // Round to nice numbers
  if (raw >= 1000) return Math.round(raw / 100) * 100;
  if (raw >= 100) return Math.round(raw / 10) * 10;
  return Math.round(raw);
}

/** Resolve description template with goal value */
export function resolveDescription(template: string, goal: number): string {
  return template.replace('{goal}', goal.toLocaleString('tr-TR'));
}
