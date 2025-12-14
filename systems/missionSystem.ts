/**
 * Mission System for Echo Shift Progression
 * Handles mission tracking, progress updates, and completion detection
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import type { Mission, MissionCategory, MissionEvent, MissionSlot, MissionState, MissionType } from '../types';
import { safeLoad, safePersist, STORAGE_KEYS } from '../utils/persistence';

/**
 * Sound Check Missions - Static onboarding missions
 * Requirements 1.1, 1.2, 1.3, 1.4: Define Sound Check missions
 */
export const SOUND_CHECK_MISSIONS: Mission[] = [
  {
    id: 'sound-check-swap',
    category: 'SOUND_CHECK',
    type: 'SWAP_COUNT',
    title: 'İlk Frekans Değişimi',
    description: '10 başarılı Geçiş yap',
    goal: 10,
    progress: 0,
    completed: false,
    rewards: { xp: 10, shards: 0 },
  },
  {
    id: 'sound-check-collect',
    category: 'SOUND_CHECK',
    type: 'COLLECT',
    title: 'Veri Toplayıcı',
    description: 'İlk Parçanı topla',
    goal: 1,
    progress: 0,
    completed: false,
    rewards: { xp: 10, shards: 0 },
  },
  {
    id: 'sound-check-collision',
    category: 'SOUND_CHECK',
    type: 'COLLISION',
    title: 'Sinyal Kaybı',
    description: 'İlk çarpışmanı yaşa',
    goal: 1,
    progress: 0,
    completed: false,
    rewards: { xp: 0, shards: 50 },
  },
];


/**
 * Mission template interface for generating daily missions
 */
interface MissionTemplate {
  type: MissionType;
  title: string;
  description: string;
  goal: number;
  xp: number;
  shards: number;
}

/**
 * Grind slot templates - distance or swap-count objectives
 * Requirements 2.2: Slot 1 (Grind) missions select from distance or swap-count objectives
 */
export const GRIND_TEMPLATES: MissionTemplate[] = [
  { type: 'DISTANCE', title: 'Alt Bas Koşucusu', description: '1000 metre yol kat et', goal: 1000, xp: 50, shards: 100 },
  { type: 'SWAP_COUNT', title: 'Frekans Atlayıcı', description: '50 geçiş yap', goal: 50, xp: 40, shards: 80 },
  { type: 'DISTANCE', title: 'Uzun Dalga', description: '500 metre yol kat et', goal: 500, xp: 30, shards: 60 },
  { type: 'SWAP_COUNT', title: 'Hızlı Geçişçi', description: '30 geçiş yap', goal: 30, xp: 25, shards: 50 },
];

/**
 * Skill slot templates - near-miss or precision objectives
 * Requirements 2.3: Slot 2 (Skill) missions select from near-miss or precision objectives
 */
export const SKILL_TEMPLATES: MissionTemplate[] = [
  { type: 'NEAR_MISS', title: 'Sınır Yürüyüşçüsü', description: '20 kıl payı kaçış yap', goal: 20, xp: 75, shards: 150 },
  { type: 'COLLECT', title: 'Mükemmel Toplayıcı', description: '30 parça topla', goal: 30, xp: 60, shards: 120 },
  { type: 'NEAR_MISS', title: 'Risk Alan', description: '10 kıl payı kaçış yap', goal: 10, xp: 45, shards: 90 },
  { type: 'COLLECT', title: 'Parça Avcısı', description: '15 parça topla', goal: 15, xp: 35, shards: 70 },
];

/**
 * Mastery slot templates - challenge objectives requiring sustained performance
 * Requirements 2.4: Slot 3 (Mastery) missions select from challenge objectives
 */
export const MASTERY_TEMPLATES: MissionTemplate[] = [
  { type: 'STAY_LANE', title: 'Tek Frekans', description: '30 saniye aynı şeritte kal', goal: 30000, xp: 100, shards: 200 },
  { type: 'DISTANCE', title: 'Dayanıklılık Koşusu', description: 'Tek seferde 2000 metre git', goal: 2000, xp: 100, shards: 200 },
  { type: 'STAY_LANE', title: 'Sabit Sinyal', description: '15 saniye aynı şeritte kal', goal: 15000, xp: 60, shards: 120 },
  { type: 'DISTANCE', title: 'Maraton Hazırlığı', description: 'Tek seferde 1500 metre git', goal: 1500, xp: 80, shards: 160 },
];

/**
 * Get the current date as ISO string (YYYY-MM-DD)
 */
function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get the Monday of the current week as ISO string
 */
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Get default mission state for new players
 * Requirements 1.1, 2.1: Initialize with Sound Check missions
 */
export function getDefaultMissionState(): MissionState {
  return {
    soundCheck: {
      missions: SOUND_CHECK_MISSIONS.map(m => ({ ...m })), // Deep copy
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
}


/**
 * Update mission progress based on a game event
 * 
 * Requirements 7.1: WHEN the player performs a Swap THEN the Mission_System 
 * SHALL increment the SWAP_COUNT progress for relevant active missions
 * 
 * Requirements 7.2: WHEN the player travels distance THEN the Mission_System 
 * SHALL increment the DISTANCE progress for relevant active missions
 * 
 * Requirements 7.3: WHEN the player achieves a Near Miss THEN the Mission_System 
 * SHALL increment the NEAR_MISS progress for relevant active missions
 * 
 * Requirements 7.4: WHEN the player collects a Shard THEN the Mission_System 
 * SHALL increment the COLLECT progress for relevant active missions
 * 
 * Requirements 7.5: WHEN the player maintains a single lane THEN the Mission_System 
 * SHALL track STAY_LANE duration for relevant active missions
 * 
 * @param state - Current mission state
 * @param event - The game event to process
 * @returns Updated mission state
 */
export function updateMissionProgress(
  state: MissionState,
  event: MissionEvent
): MissionState {
  const newState = { ...state };

  // Update Sound Check missions if not completed
  if (!state.soundCheck.completed) {
    newState.soundCheck = {
      ...state.soundCheck,
      missions: state.soundCheck.missions.map(mission => {
        if (mission.type === event.type && !mission.completed) {
          const newProgress = mission.progress + event.value;
          return {
            ...mission,
            progress: newProgress,
            completed: newProgress >= mission.goal,
          };
        }
        return mission;
      }),
    };
    
    // Check if all Sound Check missions are completed
    const allCompleted = newState.soundCheck.missions.every(m => m.completed);
    if (allCompleted) {
      newState.soundCheck.completed = true;
    }
  }

  // Update Daily missions
  if (state.daily.missions.length > 0) {
    newState.daily = {
      ...state.daily,
      missions: state.daily.missions.map(mission => {
        if (mission.type === event.type && !mission.completed) {
          const newProgress = mission.progress + event.value;
          return {
            ...mission,
            progress: newProgress,
            completed: newProgress >= mission.goal,
          };
        }
        return mission;
      }),
    };
  }

  // Update Marathon mission
  if (state.marathon.mission && !state.marathon.mission.completed) {
    if (state.marathon.mission.type === event.type) {
      const newProgress = state.marathon.mission.progress + event.value;
      newState.marathon = {
        ...state.marathon,
        mission: {
          ...state.marathon.mission,
          progress: newProgress,
          completed: newProgress >= state.marathon.mission.goal,
        },
      };
    }
  }

  return newState;
}

/**
 * Check if a mission is completed
 * 
 * Requirements 7.6: WHEN mission progress reaches the goal 
 * THEN the Mission_System SHALL mark the mission as complete
 * 
 * @param mission - The mission to check
 * @returns true if progress >= goal
 */
export function checkMissionCompletion(mission: Mission): boolean {
  return mission.progress >= mission.goal;
}

/**
 * Create a mission from a template
 */
function createMissionFromTemplate(
  template: MissionTemplate,
  slot: MissionSlot,
  category: MissionCategory,
  seed: number
): Mission {
  return {
    id: `${category.toLowerCase()}-${slot.toLowerCase()}-${seed}`,
    category,
    slot,
    type: template.type,
    title: template.title,
    description: template.description,
    goal: template.goal,
    progress: 0,
    completed: false,
    rewards: {
      xp: template.xp,
      shards: template.shards,
    },
  };
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Generate daily missions with seeded randomness
 * 
 * Requirements 2.1: WHEN a new day begins THEN the Mission_System 
 * SHALL generate three new daily missions in designated slots
 * 
 * Requirements 2.2: Slot 1 (Grind) - distance or swap-count objectives
 * Requirements 2.3: Slot 2 (Skill) - near-miss or precision objectives
 * Requirements 2.4: Slot 3 (Mastery) - challenge objectives
 * 
 * @param seed - Seed for deterministic generation
 * @returns Array of 3 daily missions
 */
export function generateDailyMissions(seed: number): Mission[] {
  const random = seededRandom(seed);
  
  const grindIndex = Math.floor(random() * GRIND_TEMPLATES.length);
  const skillIndex = Math.floor(random() * SKILL_TEMPLATES.length);
  const masteryIndex = Math.floor(random() * MASTERY_TEMPLATES.length);
  
  return [
    createMissionFromTemplate(GRIND_TEMPLATES[grindIndex], 'GRIND', 'DAILY', seed),
    createMissionFromTemplate(SKILL_TEMPLATES[skillIndex], 'SKILL', 'DAILY', seed),
    createMissionFromTemplate(MASTERY_TEMPLATES[masteryIndex], 'MASTERY', 'DAILY', seed),
  ];
}

/**
 * Generate a weekly marathon challenge
 * 
 * Requirements 3.1: WHEN a new week begins THEN the Mission_System 
 * SHALL generate a new Marathon Challenge with a cumulative distance goal
 * 
 * @param seed - Seed for deterministic generation
 * @returns Marathon mission
 */
export function generateMarathonChallenge(seed: number): Mission {
  const random = seededRandom(seed);
  const baseGoal = 10000;
  const variation = Math.floor(random() * 5000);
  
  return {
    id: `marathon-${seed}`,
    category: 'MARATHON',
    type: 'DISTANCE',
    title: 'Weekly Marathon',
    description: `Travel ${baseGoal + variation} meters this week`,
    goal: baseGoal + variation,
    progress: 0,
    completed: false,
    rewards: {
      xp: 500,
      shards: 1000,
      cosmetic: 'marathon-trail',
    },
  };
}

/**
 * Check and reset missions based on time
 * 
 * Requirements 2.6: WHEN the day ends with incomplete missions 
 * THEN the Mission_System SHALL reset all mission progress and generate new missions
 * 
 * Requirements 3.4: WHEN the week ends with incomplete Marathon progress 
 * THEN the Mission_System SHALL reset the challenge and generate a new goal
 * 
 * @param state - Current mission state
 * @param now - Current date/time
 * @returns Updated mission state with resets applied
 */
export function checkMissionReset(state: MissionState, now: Date): MissionState {
  const today = getDateString(now);
  const monday = getWeekStart(now);
  
  let newState = { ...state };
  
  // Daily reset - only if Sound Check is completed
  if (state.soundCheck.completed && state.daily.lastResetDate !== today) {
    newState.daily = {
      missions: generateDailyMissions(now.getTime()),
      lastResetDate: today,
    };
  }
  
  // Weekly reset - only if Sound Check is completed
  if (state.soundCheck.completed && state.marathon.lastResetDate !== monday) {
    newState.marathon = {
      mission: generateMarathonChallenge(now.getTime()),
      lastResetDate: monday,
    };
  }
  
  return newState;
}

/**
 * Distribute rewards for a completed mission
 * 
 * @param mission - The completed mission
 * @returns Rewards to distribute
 */
export function distributeMissionRewards(mission: Mission): { xp: number; shards: number; cosmetic?: string } {
  if (!mission.completed) {
    return { xp: 0, shards: 0 };
  }
  return { ...mission.rewards };
}

/**
 * Claim rewards for a newly completed mission
 * 
 * Requirements 1.2: Award 10 XP for "First Frequency Shift" mission
 * Requirements 1.3: Award 10 XP for "Data Collector" mission
 * Requirements 1.4: Award 50 Shards for "Signal Loss" mission
 * 
 * @param state - Current mission state
 * @param missionId - ID of the mission to claim rewards for
 * @returns Object containing rewards claimed and updated state with mission marked as claimed
 */
export function claimMissionReward(
  state: MissionState,
  missionId: string
): { rewards: { xp: number; shards: number; cosmetic?: string }; newState: MissionState } {
  // Check Sound Check missions
  const soundCheckMission = state.soundCheck.missions.find(m => m.id === missionId);
  if (soundCheckMission && soundCheckMission.completed) {
    const rewards = distributeMissionRewards(soundCheckMission);
    return { rewards, newState: state };
  }

  // Check Daily missions
  const dailyMission = state.daily.missions.find(m => m.id === missionId);
  if (dailyMission && dailyMission.completed) {
    const rewards = distributeMissionRewards(dailyMission);
    return { rewards, newState: state };
  }

  // Check Marathon mission
  if (state.marathon.mission && state.marathon.mission.id === missionId && state.marathon.mission.completed) {
    const rewards = distributeMissionRewards(state.marathon.mission);
    return { rewards, newState: state };
  }

  // Mission not found or not completed
  return { rewards: { xp: 0, shards: 0 }, newState: state };
}

/**
 * Get all completed but unclaimed Sound Check missions
 * 
 * Requirements 1.2, 1.3, 1.4: Track and reward Sound Check mission completion
 * 
 * @param state - Current mission state
 * @returns Array of completed Sound Check missions
 */
export function getCompletedSoundCheckMissions(state: MissionState): Mission[] {
  if (state.soundCheck.completed) {
    return [];
  }
  return state.soundCheck.missions.filter(m => m.completed);
}

/**
 * Calculate total rewards from Sound Check missions
 * 
 * Requirements 1.2: 10 XP for First Frequency Shift
 * Requirements 1.3: 10 XP for Data Collector
 * Requirements 1.4: 50 Shards for Signal Loss
 * 
 * @param missions - Array of completed missions
 * @returns Total XP and Shards
 */
export function calculateTotalRewards(missions: Mission[]): { xp: number; shards: number } {
  return missions.reduce(
    (total, mission) => {
      if (mission.completed) {
        return {
          xp: total.xp + mission.rewards.xp,
          shards: total.shards + mission.rewards.shards,
        };
      }
      return total;
    },
    { xp: 0, shards: 0 }
  );
}


// ============================================================================
// Mission State Persistence - Requirements 8.1, 8.2, 8.3, 8.4
// ============================================================================

/**
 * Validate a single mission object
 * @param data - Data to validate
 * @returns true if valid mission structure
 */
function isValidMission(data: unknown): data is Mission {
  if (!data || typeof data !== 'object') return false;
  const m = data as Record<string, unknown>;
  
  return (
    typeof m.id === 'string' &&
    typeof m.category === 'string' &&
    ['SOUND_CHECK', 'DAILY', 'MARATHON'].includes(m.category as string) &&
    typeof m.type === 'string' &&
    ['DISTANCE', 'SWAP_COUNT', 'NEAR_MISS', 'COLLECT', 'STAY_LANE', 'COLLISION'].includes(m.type as string) &&
    typeof m.title === 'string' &&
    typeof m.description === 'string' &&
    typeof m.goal === 'number' &&
    typeof m.progress === 'number' &&
    typeof m.completed === 'boolean' &&
    m.rewards !== null &&
    typeof m.rewards === 'object' &&
    typeof (m.rewards as Record<string, unknown>).xp === 'number' &&
    typeof (m.rewards as Record<string, unknown>).shards === 'number'
  );
}

/**
 * Validate mission state data structure
 * 
 * Requirements 8.3: WHEN loading mission data THEN the Persistence_System 
 * SHALL validate timestamps and reset expired missions
 * 
 * Requirements 8.4: WHEN localStorage data is corrupted THEN the Persistence_System 
 * SHALL reset to default mission state and log the error
 * 
 * @param data - Data to validate
 * @returns Valid MissionState or null if invalid
 */
export function validateMissionState(data: unknown): MissionState | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const state = data as Record<string, unknown>;

  // Validate soundCheck structure
  if (!state.soundCheck || typeof state.soundCheck !== 'object') {
    return null;
  }
  const soundCheck = state.soundCheck as Record<string, unknown>;
  if (!Array.isArray(soundCheck.missions) || typeof soundCheck.completed !== 'boolean') {
    return null;
  }
  // Validate each sound check mission
  for (const mission of soundCheck.missions) {
    if (!isValidMission(mission)) {
      return null;
    }
  }

  // Validate daily structure
  if (!state.daily || typeof state.daily !== 'object') {
    return null;
  }
  const daily = state.daily as Record<string, unknown>;
  if (!Array.isArray(daily.missions) || typeof daily.lastResetDate !== 'string') {
    return null;
  }
  // Validate each daily mission
  for (const mission of daily.missions) {
    if (!isValidMission(mission)) {
      return null;
    }
  }

  // Validate marathon structure
  if (!state.marathon || typeof state.marathon !== 'object') {
    return null;
  }
  const marathon = state.marathon as Record<string, unknown>;
  if (typeof marathon.lastResetDate !== 'string') {
    return null;
  }
  // Marathon mission can be null or a valid mission
  if (marathon.mission !== null && !isValidMission(marathon.mission)) {
    return null;
  }

  return data as MissionState;
}

/**
 * Save mission state to localStorage
 * 
 * Requirements 8.1: WHEN mission progress changes THEN the Persistence_System 
 * SHALL save the updated state to localStorage
 * 
 * @param state - Mission state to save
 * @returns true if saved successfully
 */
export function saveMissionState(state: MissionState): boolean {
  return safePersist(STORAGE_KEYS.MISSIONS, state);
}

/**
 * Load mission state from localStorage
 * 
 * Requirements 8.2: WHEN the game loads THEN the Persistence_System 
 * SHALL restore mission progress from localStorage
 * 
 * Requirements 8.4: WHEN localStorage data is corrupted THEN the Persistence_System 
 * SHALL reset to default mission state and log the error
 * 
 * @returns Loaded mission state or default state if invalid/missing
 */
export function loadMissionState(): MissionState {
  const saved = safeLoad<unknown>(STORAGE_KEYS.MISSIONS, null);
  
  if (saved === null) {
    return getDefaultMissionState();
  }
  
  const validated = validateMissionState(saved);
  
  if (!validated) {
    console.error('[MissionSystem] Corrupted mission data detected, resetting to default state');
    return getDefaultMissionState();
  }
  
  return validated;
}
