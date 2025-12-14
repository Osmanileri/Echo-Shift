/**
 * Global State Management with Zustand
 * Requirements: 18.1, 18.2, 18.3
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { ThemeColors } from "../data/themes";
import type { ZoneId } from "../data/zones";
import { calculateDailyReward, checkLevelUp } from "../systems/levelSystem";
import {
    checkMissionReset,
    getDefaultMissionState,
    loadMissionState,
    saveMissionState,
    updateMissionProgress
} from "../systems/missionSystem";
import { initializeShiftState } from "../systems/shiftProtocol";
import type {
    ConstructType,
    EnhancedResonanceState,
    MissionEvent,
    MissionState,
    ShiftProtocolState,
    SnapshotBuffer
} from "../types";
import { safeLoad, safePersist, STORAGE_KEYS } from "../utils/persistence";

// Item category type for shop system
export type ItemCategory = "skin" | "effect" | "theme";

// Ghost frame for ghost racer system
export interface GhostFrame {
  timestamp: number;
  score: number;
  playerY: number;
  isSwapped: boolean;
}

// ============================================================================
// V2 State Initialization Helpers
// ============================================================================

/**
 * Creates initial enhanced resonance state
 * Requirements 5.1, 5.4: Streak-based activation with pause support
 */
function initializeEnhancedResonanceState(): EnhancedResonanceState {
  return {
    isActive: false,
    isPaused: false,
    pausedTimeRemaining: 0,
    streakCount: 0,
    activationThreshold: 10,
    duration: 10000,
    remainingTime: 0,
    multiplier: 1,
    intensity: 0,
    colorTransitionProgress: 0,
  };
}

/**
 * Creates initial snapshot buffer
 * Requirements 7.1, 7.3: 180 frame capacity (3 seconds at 60fps)
 */
function initializeSnapshotBuffer(): SnapshotBuffer {
  return {
    snapshots: [],
    head: 0,
    capacity: 180,
    size: 0,
  };
}

// Game Store Interface
export interface GameStore {
  // Currency
  echoShards: number;
  addEchoShards: (amount: number) => void;
  spendEchoShards: (amount: number) => boolean;

  // Inventory
  ownedSkins: string[];
  ownedEffects: string[];
  ownedThemes: string[];
  ownedUpgrades: Record<string, number>;

  // Zone Progression (Roguelite Loop)
  selectedZoneId: ZoneId;
  unlockedZones: ZoneId[];

  // Equipped Items
  equippedSkin: string;
  equippedEffect: string;
  equippedTheme: string;

  // Campaign Progress
  completedLevels: number[];
  currentLevel: number;
  levelStars: Record<number, number>;

  // Daily Challenge
  lastDailyChallengeDate: string;
  dailyChallengeCompleted: boolean;
  dailyChallengeBestScore: number;

  // Ghost Data
  ghostTimeline: GhostFrame[];

  // V2 Mechanics State - Requirements 1.3, 1.4
  shift: ShiftProtocolState;
  resonance: EnhancedResonanceState;
  snapshots: SnapshotBuffer;

  // Echo Constructs State - Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4
  unlockedConstructs: ConstructType[];  // Persisted - Requirements 8.2, 8.3, 8.4
  activeConstruct: ConstructType;        // Session-only, NOT persisted - Requirements 7.1, 7.4
  isConstructInvulnerable: boolean;      // Session-only - Requirements 2.1, 6.3
  constructInvulnerabilityEndTime: number; // Session-only - Requirements 2.1, 6.3

  // Progression System State - Requirements 4.1, 5.1, 6.6
  syncRate: number;                      // Player's level (Sync Rate)
  totalXP: number;                       // Total accumulated XP
  missions: MissionState;                // Mission tracking state
  lastLoginDate: string;                 // Last daily reward claim date
  soundCheckComplete: boolean;           // Whether Sound Check is completed

  // Settings
  tutorialCompleted: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticEnabled: boolean;
  hollowModeEnabled: boolean;
  customThemeColors: ThemeColors | null;

  // Actions
  purchaseItem: (
    itemId: string,
    category: ItemCategory,
    price: number
  ) => boolean;
  equipItem: (itemId: string, category: ItemCategory) => void;
  completeLevel: (levelId: number, stars: number) => void;
  recordGhostFrame: (frame: GhostFrame) => void;
  resetGhost: () => void;

  // Upgrade Actions
  purchaseUpgrade: (upgradeId: string, cost: number) => boolean;
  getUpgradeLevel: (upgradeId: string) => number;

  // Zone Actions
  selectZone: (zoneId: ZoneId) => void;
  unlockZone: (zoneId: ZoneId, cost: number) => boolean;

  // Daily Challenge Actions
  setDailyChallengeCompleted: (score: number) => void;

  // V2 Mechanics Actions - Requirements 1.3, 1.4
  updateShiftState: (state: Partial<ShiftProtocolState>) => void;
  updateResonanceState: (state: Partial<EnhancedResonanceState>) => void;
  updateSnapshotBuffer: (buffer: SnapshotBuffer) => void;
  resetV2State: () => void;

  // Echo Constructs Actions - Requirements 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3
  unlockConstruct: (constructType: ConstructType) => void;
  setActiveConstruct: (constructType: ConstructType) => void;
  setConstructInvulnerable: (endTime: number) => void;
  resetConstructState: () => void;

  // Progression System Actions - Requirements 4.1, 5.1, 6.6
  addXP: (amount: number) => { levelUp: boolean; newLevel: number };
  completeMission: (missionId: string) => { xp: number; shards: number; cosmetic?: string };
  processMissionEvent: (event: MissionEvent) => void;
  claimDailyReward: () => { claimed: boolean; amount: number };
  initializeMissions: () => void;

  // Settings Actions
  setTutorialCompleted: (completed: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setHollowModeEnabled: (enabled: boolean) => void;
  setCustomThemeColors: (colors: ThemeColors | null) => void;

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// Default state values
const DEFAULT_STATE = {
  echoShards: 5000, // Starting bonus for new players
  ownedSkins: ["default"],
  ownedEffects: ["default"],
  ownedThemes: ["default"],
  ownedUpgrades: {} as Record<string, number>,
  selectedZoneId: "sub-bass" as ZoneId,
  unlockedZones: ["sub-bass"] as ZoneId[],
  equippedSkin: "default",
  equippedEffect: "default",
  equippedTheme: "default",
  completedLevels: [] as number[],
  currentLevel: 1,
  levelStars: {} as Record<number, number>,
  lastDailyChallengeDate: "",
  dailyChallengeCompleted: false,
  dailyChallengeBestScore: 0,
  ghostTimeline: [] as GhostFrame[],
  // V2 Mechanics State - Requirements 1.3, 1.4
  shift: initializeShiftState(),
  resonance: initializeEnhancedResonanceState(),
  snapshots: initializeSnapshotBuffer(),
  // Echo Constructs State - Requirements 7.1, 8.1
  unlockedConstructs: ['TITAN'] as ConstructType[],  // Titan is default unlocked - Requirements 8.1
  activeConstruct: 'NONE' as ConstructType,          // Session-only - Requirements 7.1
  isConstructInvulnerable: false,                    // Session-only
  constructInvulnerabilityEndTime: 0,                // Session-only
  // Progression System State - Requirements 4.1, 5.1, 6.6
  syncRate: 1,                                       // Start at level 1
  totalXP: 0,                                        // No XP initially
  missions: getDefaultMissionState(),                // Default mission state
  lastLoginDate: '',                                 // No previous login
  soundCheckComplete: false,                         // Sound Check not completed
  tutorialCompleted: false,
  soundEnabled: true,
  musicEnabled: true,
  hapticEnabled: true,
  hollowModeEnabled: false,
  customThemeColors: null as ThemeColors | null,
};

// Persisted state interface (subset of GameStore that gets saved)
// NOTE: activeConstruct, isConstructInvulnerable, constructInvulnerabilityEndTime are NOT persisted (session-only) - Requirements 7.4
interface PersistedState {
  echoShards: number;
  ownedSkins: string[];
  ownedEffects: string[];
  ownedThemes: string[];
  ownedUpgrades: Record<string, number>;
  selectedZoneId: ZoneId;
  unlockedZones: ZoneId[];
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
  hapticEnabled: boolean;
  hollowModeEnabled: boolean;
  customThemeColors: ThemeColors | null;
  // Echo Constructs - Only unlockedConstructs is persisted - Requirements 8.2, 8.3, 8.4
  unlockedConstructs: ConstructType[];
  // Progression System - Requirements 4.1, 5.1, 6.6
  syncRate: number;
  totalXP: number;
  lastLoginDate: string;
  soundCheckComplete: boolean;
  // NOTE: missions are persisted separately via missionSystem
}

// Create the store
export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...DEFAULT_STATE,

    // V2 Mechanics Actions - Requirements 1.3, 1.4
    updateShiftState: (newState: Partial<ShiftProtocolState>) => {
      set((state) => ({
        shift: { ...state.shift, ...newState },
      }));
    },

    updateResonanceState: (newState: Partial<EnhancedResonanceState>) => {
      set((state) => ({
        resonance: { ...state.resonance, ...newState },
      }));
    },

    updateSnapshotBuffer: (buffer: SnapshotBuffer) => {
      set({ snapshots: buffer });
    },

    resetV2State: () => {
      set({
        shift: initializeShiftState(),
        resonance: initializeEnhancedResonanceState(),
        snapshots: initializeSnapshotBuffer(),
      });
    },

    // Echo Constructs Actions - Requirements 7.1, 7.2, 7.3, 7.5, 8.1, 8.2, 8.3
    /**
     * Unlock a new construct type
     * Requirements 8.2, 8.3: Add construct to unlockedConstructs and persist
     */
    unlockConstruct: (constructType: ConstructType) => {
      const state = get();
      // Don't add if already unlocked
      if (state.unlockedConstructs.includes(constructType)) {
        return;
      }
      set({
        unlockedConstructs: [...state.unlockedConstructs, constructType],
      });
      get().saveToStorage();
    },

    /**
     * Set the active construct
     * Requirements 7.1, 7.2: Update activeConstruct state (session-only)
     */
    setActiveConstruct: (constructType: ConstructType) => {
      set({ activeConstruct: constructType });
      // NOTE: Do NOT save to storage - activeConstruct is session-only (Requirements 7.4)
    },

    /**
     * Set construct invulnerability state
     * Requirements 2.1, 6.3: Grant invincibility during transformation/second chance
     */
    setConstructInvulnerable: (endTime: number) => {
      set({
        isConstructInvulnerable: endTime > Date.now(),
        constructInvulnerabilityEndTime: endTime,
      });
      // NOTE: Do NOT save to storage - invulnerability is session-only
    },

    /**
     * Reset construct state to initial values
     * Requirements 7.3, 7.5: Reset activeConstruct to 'NONE' when game ends
     */
    resetConstructState: () => {
      set({
        activeConstruct: 'NONE',
        isConstructInvulnerable: false,
        constructInvulnerabilityEndTime: 0,
      });
      // NOTE: Do NOT save to storage - these are session-only states
    },

    // ========================================================================
    // Progression System Actions - Requirements 4.1, 5.1, 6.6
    // ========================================================================

    /**
     * Add XP to player's total and check for level up
     * Requirements 4.1: WHEN the player earns XP THEN the Level_System 
     * SHALL add the XP to the player's total and check for level advancement
     */
    addXP: (amount: number) => {
      if (amount <= 0) {
        return { levelUp: false, newLevel: get().syncRate };
      }
      
      const state = get();
      const oldXP = state.totalXP;
      const newXP = oldXP + amount;
      const levelResult = checkLevelUp(oldXP, newXP);
      
      set({
        totalXP: newXP,
        syncRate: levelResult.newLevel,
      });
      
      get().saveToStorage();
      return levelResult;
    },

    /**
     * Complete a mission and distribute rewards
     * Requirements 2.5, 3.3: Award XP and Shards on mission completion
     */
    completeMission: (missionId: string) => {
      const state = get();
      const missions = state.missions;
      
      // Find the mission
      let mission = missions.soundCheck.missions.find(m => m.id === missionId);
      if (!mission) {
        mission = missions.daily.missions.find(m => m.id === missionId);
      }
      if (!mission && missions.marathon.mission?.id === missionId) {
        mission = missions.marathon.mission;
      }
      
      if (!mission || !mission.completed) {
        return { xp: 0, shards: 0 };
      }
      
      const rewards = { ...mission.rewards };
      
      // Add XP
      if (rewards.xp > 0) {
        get().addXP(rewards.xp);
      }
      
      // Add Shards
      if (rewards.shards > 0) {
        get().addEchoShards(rewards.shards);
      }
      
      // Update soundCheckComplete if all Sound Check missions are done
      const allSoundCheckComplete = missions.soundCheck.missions.every(m => m.completed);
      if (allSoundCheckComplete && !state.soundCheckComplete) {
        set({ soundCheckComplete: true });
        get().saveToStorage();
      }
      
      return rewards;
    },

    /**
     * Process a mission event and update progress
     * Requirements 7.1-7.5: Update mission progress based on game events
     */
    processMissionEvent: (event: MissionEvent) => {
      const state = get();
      const newMissions = updateMissionProgress(state.missions, event);
      
      // Check if soundCheck completion changed
      const soundCheckComplete = newMissions.soundCheck.completed;
      
      set({ 
        missions: newMissions,
        soundCheckComplete: soundCheckComplete || state.soundCheckComplete,
      });
      
      // Save mission state
      saveMissionState(newMissions);
    },

    /**
     * Claim daily login reward
     * Requirements 5.1: WHEN the player logs in for the first time each day 
     * THEN the Reward_System SHALL grant Shards based on current Sync Rate
     */
    claimDailyReward: () => {
      const state = get();
      const today = new Date().toISOString().split('T')[0];
      
      // Check if already claimed today
      if (state.lastLoginDate === today) {
        return { claimed: false, amount: 0 };
      }
      
      // Calculate reward based on current level
      const rewardAmount = calculateDailyReward(state.syncRate);
      
      // Grant reward
      set({
        lastLoginDate: today,
        echoShards: state.echoShards + rewardAmount,
      });
      
      get().saveToStorage();
      return { claimed: true, amount: rewardAmount };
    },

    /**
     * Initialize missions on game load
     * Requirements 8.2: Load mission state from storage and check for resets
     */
    initializeMissions: () => {
      // Load mission state from storage
      let missions = loadMissionState();
      
      // Check for daily/weekly resets
      missions = checkMissionReset(missions, new Date());
      
      // Update state
      set({ 
        missions,
        soundCheckComplete: missions.soundCheck.completed,
      });
      
      // Save if resets occurred
      saveMissionState(missions);
    },

    // Currency Actions
    addEchoShards: (amount: number) => {
      if (amount < 0) {
        console.warn("[GameStore] Cannot add negative Echo Shards");
        return;
      }
      set((state) => {
        const newShards = state.echoShards + amount;
        return { echoShards: newShards };
      });
      get().saveToStorage();
    },

    spendEchoShards: (amount: number) => {
      const state = get();
      if (amount < 0) {
        console.warn("[GameStore] Cannot spend negative Echo Shards");
        return false;
      }
      if (state.echoShards < amount) {
        return false;
      }
      set({ echoShards: state.echoShards - amount });
      get().saveToStorage();
      return true;
    },

    // Shop Actions
    purchaseItem: (itemId: string, category: ItemCategory, price: number) => {
      const state = get();

      // Check if already owned
      const ownedKey = `owned${category.charAt(0).toUpperCase() + category.slice(1)
        }s` as keyof typeof state;
      const ownedItems = state[ownedKey] as string[];
      if (ownedItems.includes(itemId)) {
        console.warn(`[GameStore] Item ${itemId} already owned`);
        return false;
      }

      // Check balance
      if (state.echoShards < price) {
        return false;
      }

      // Deduct price and add to inventory
      set((s) => {
        const newOwned = [...(s[ownedKey] as string[]), itemId];
        return {
          echoShards: s.echoShards - price,
          [ownedKey]: newOwned,
        };
      });

      get().saveToStorage();
      return true;
    },

    equipItem: (itemId: string, category: ItemCategory) => {
      const state = get();

      // Check if owned
      const ownedKey = `owned${category.charAt(0).toUpperCase() + category.slice(1)
        }s` as keyof typeof state;
      const ownedItems = state[ownedKey] as string[];
      if (!ownedItems.includes(itemId)) {
        console.warn(`[GameStore] Cannot equip unowned item: ${itemId}`);
        return;
      }

      // Equip the item
      const equippedKey = `equipped${category.charAt(0).toUpperCase() + category.slice(1)
        }` as "equippedSkin" | "equippedEffect" | "equippedTheme";
      set({ [equippedKey]: itemId });
      get().saveToStorage();
    },

    // Campaign Actions
    completeLevel: (levelId: number, stars: number) => {
      set((state) => {
        const newCompletedLevels = state.completedLevels.includes(levelId)
          ? state.completedLevels
          : [...state.completedLevels, levelId];

        const newLevelStars = {
          ...state.levelStars,
          [levelId]: Math.max(state.levelStars[levelId] || 0, stars),
        };

        // Unlock next level
        const newCurrentLevel = Math.max(state.currentLevel, levelId + 1);

        return {
          completedLevels: newCompletedLevels,
          levelStars: newLevelStars,
          currentLevel: Math.min(newCurrentLevel, 100), // Cap at 100 levels
        };
      });
      get().saveToStorage();
    },

    // Ghost Actions
    recordGhostFrame: (frame: GhostFrame) => {
      set((state) => ({
        ghostTimeline: [...state.ghostTimeline, frame],
      }));
    },

    resetGhost: () => {
      set({ ghostTimeline: [] });
    },

    // Upgrade Actions
    purchaseUpgrade: (upgradeId: string, cost: number) => {
      const state = get();

      if (state.echoShards < cost) {
        return false;
      }

      set((s) => ({
        echoShards: s.echoShards - cost,
        ownedUpgrades: {
          ...s.ownedUpgrades,
          [upgradeId]: (s.ownedUpgrades[upgradeId] || 0) + 1,
        },
      }));

      get().saveToStorage();
      return true;
    },

    getUpgradeLevel: (upgradeId: string) => {
      return get().ownedUpgrades[upgradeId] || 0;
    },

    // Zone Actions
    selectZone: (zoneId: ZoneId) => {
      set({ selectedZoneId: zoneId });
      get().saveToStorage();
    },

    unlockZone: (zoneId: ZoneId, cost: number) => {
      const state = get();
      if (state.unlockedZones.includes(zoneId)) {
        set({ selectedZoneId: zoneId });
        get().saveToStorage();
        return true;
      }
      if (cost > 0 && state.echoShards < cost) {
        return false;
      }

      set((s) => ({
        echoShards: cost > 0 ? s.echoShards - cost : s.echoShards,
        unlockedZones: [...s.unlockedZones, zoneId],
        selectedZoneId: zoneId,
      }));

      get().saveToStorage();
      return true;
    },

    // Daily Challenge Actions
    setDailyChallengeCompleted: (score: number) => {
      const today = new Date().toISOString().split("T")[0];
      set((state) => ({
        lastDailyChallengeDate: today,
        dailyChallengeCompleted: true,
        dailyChallengeBestScore: Math.max(state.dailyChallengeBestScore, score),
      }));
      get().saveToStorage();
    },

    // Settings Actions
    setTutorialCompleted: (completed: boolean) => {
      set({ tutorialCompleted: completed });
      get().saveToStorage();
    },

    setSoundEnabled: (enabled: boolean) => {
      set({ soundEnabled: enabled });
      get().saveToStorage();
    },

    setMusicEnabled: (enabled: boolean) => {
      set({ musicEnabled: enabled });
      get().saveToStorage();
    },

    setHapticEnabled: (enabled: boolean) => {
      set({ hapticEnabled: enabled });
      get().saveToStorage();
    },

    setHollowModeEnabled: (enabled: boolean) => {
      set({ hollowModeEnabled: enabled });
      get().saveToStorage();
    },

    setCustomThemeColors: (colors: ThemeColors | null) => {
      set((state) => {
        const nextOwnedThemes =
          colors && !state.ownedThemes.includes("custom")
            ? [...state.ownedThemes, "custom"]
            : state.ownedThemes;
        return {
          customThemeColors: colors,
          ownedThemes: nextOwnedThemes,
          // When colors is null (reset to default), set theme to "default"
          // When colors is set (custom theme), set theme to "custom"
          equippedTheme: colors ? "custom" : "default",
        };
      });
      get().saveToStorage();
    },

    // Persistence Actions
    loadFromStorage: () => {
      const savedState = safeLoad<Partial<PersistedState>>(
        STORAGE_KEYS.GAME_STATE,
        {}
      );

      // Merge saved state with defaults
      set({
        echoShards: savedState.echoShards ?? DEFAULT_STATE.echoShards,
        ownedSkins: savedState.ownedSkins ?? DEFAULT_STATE.ownedSkins,
        ownedEffects: savedState.ownedEffects ?? DEFAULT_STATE.ownedEffects,
        ownedThemes: savedState.ownedThemes ?? DEFAULT_STATE.ownedThemes,
        ownedUpgrades: savedState.ownedUpgrades ?? DEFAULT_STATE.ownedUpgrades,
        selectedZoneId:
          savedState.selectedZoneId ?? DEFAULT_STATE.selectedZoneId,
        unlockedZones: savedState.unlockedZones ?? DEFAULT_STATE.unlockedZones,
        equippedSkin: savedState.equippedSkin ?? DEFAULT_STATE.equippedSkin,
        equippedEffect:
          savedState.equippedEffect ?? DEFAULT_STATE.equippedEffect,
        equippedTheme: savedState.equippedTheme ?? DEFAULT_STATE.equippedTheme,
        completedLevels:
          savedState.completedLevels ?? DEFAULT_STATE.completedLevels,
        currentLevel: savedState.currentLevel ?? DEFAULT_STATE.currentLevel,
        levelStars: savedState.levelStars ?? DEFAULT_STATE.levelStars,
        lastDailyChallengeDate:
          savedState.lastDailyChallengeDate ??
          DEFAULT_STATE.lastDailyChallengeDate,
        dailyChallengeCompleted:
          savedState.dailyChallengeCompleted ??
          DEFAULT_STATE.dailyChallengeCompleted,
        dailyChallengeBestScore:
          savedState.dailyChallengeBestScore ??
          DEFAULT_STATE.dailyChallengeBestScore,
        tutorialCompleted:
          savedState.tutorialCompleted ?? DEFAULT_STATE.tutorialCompleted,
        soundEnabled: savedState.soundEnabled ?? DEFAULT_STATE.soundEnabled,
        musicEnabled: savedState.musicEnabled ?? DEFAULT_STATE.musicEnabled,
        hapticEnabled: savedState.hapticEnabled ?? DEFAULT_STATE.hapticEnabled,
        hollowModeEnabled:
          savedState.hollowModeEnabled ?? DEFAULT_STATE.hollowModeEnabled,
        customThemeColors:
          savedState.customThemeColors ?? DEFAULT_STATE.customThemeColors,
        // Echo Constructs - Load persisted unlockedConstructs - Requirements 8.2, 8.3, 8.4
        unlockedConstructs:
          savedState.unlockedConstructs ?? DEFAULT_STATE.unlockedConstructs,
        // Session-only states are always reset on load - Requirements 7.4
        activeConstruct: DEFAULT_STATE.activeConstruct,
        isConstructInvulnerable: DEFAULT_STATE.isConstructInvulnerable,
        constructInvulnerabilityEndTime: DEFAULT_STATE.constructInvulnerabilityEndTime,
        // Progression System - Requirements 4.1, 5.1, 6.6
        syncRate: savedState.syncRate ?? DEFAULT_STATE.syncRate,
        totalXP: savedState.totalXP ?? DEFAULT_STATE.totalXP,
        lastLoginDate: savedState.lastLoginDate ?? DEFAULT_STATE.lastLoginDate,
        soundCheckComplete: savedState.soundCheckComplete ?? DEFAULT_STATE.soundCheckComplete,
      });

      // Load ghost data separately (can be large)
      const ghostData = safeLoad<GhostFrame[]>(STORAGE_KEYS.GHOST_DATA, []);
      set({ ghostTimeline: ghostData });

      // Initialize missions (loads from separate storage key)
      get().initializeMissions();
    },

    saveToStorage: () => {
      const state = get();

      // Save main state
      // NOTE: activeConstruct, isConstructInvulnerable, constructInvulnerabilityEndTime are NOT saved (session-only) - Requirements 7.4
      const stateToSave: PersistedState = {
        echoShards: state.echoShards,
        ownedSkins: state.ownedSkins,
        ownedEffects: state.ownedEffects,
        ownedThemes: state.ownedThemes,
        ownedUpgrades: state.ownedUpgrades,
        selectedZoneId: state.selectedZoneId,
        unlockedZones: state.unlockedZones,
        equippedSkin: state.equippedSkin,
        equippedEffect: state.equippedEffect,
        equippedTheme: state.equippedTheme,
        completedLevels: state.completedLevels,
        currentLevel: state.currentLevel,
        levelStars: state.levelStars,
        lastDailyChallengeDate: state.lastDailyChallengeDate,
        dailyChallengeCompleted: state.dailyChallengeCompleted,
        dailyChallengeBestScore: state.dailyChallengeBestScore,
        tutorialCompleted: state.tutorialCompleted,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        hapticEnabled: state.hapticEnabled,
        hollowModeEnabled: state.hollowModeEnabled,
        customThemeColors: state.customThemeColors,
        // Echo Constructs - Only unlockedConstructs is persisted - Requirements 8.2, 8.3, 8.4
        unlockedConstructs: state.unlockedConstructs,
        // Progression System - Requirements 4.1, 5.1, 6.6
        syncRate: state.syncRate,
        totalXP: state.totalXP,
        lastLoginDate: state.lastLoginDate,
        soundCheckComplete: state.soundCheckComplete,
      };

      safePersist(STORAGE_KEYS.GAME_STATE, stateToSave);

      // Save ghost data separately
      if (state.ghostTimeline.length > 0) {
        safePersist(STORAGE_KEYS.GHOST_DATA, state.ghostTimeline);
      }
    },
  }))
);

// Initialize store from localStorage on module load
if (typeof window !== "undefined") {
  useGameStore.getState().loadFromStorage();
}
