/**
 * Global State Management with Zustand
 * Requirements: 18.1, 18.2, 18.3
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { safePersist, safeLoad, STORAGE_KEYS } from '../utils/persistence';
import { ShiftProtocolState, EnhancedResonanceState, SnapshotBuffer } from '../types';
import { initializeShiftState } from '../systems/shiftProtocol';

// Item category type for shop system
export type ItemCategory = 'skin' | 'effect' | 'theme';

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
  
  // Settings
  tutorialCompleted: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticEnabled: boolean;
  
  // Actions
  purchaseItem: (itemId: string, category: ItemCategory, price: number) => boolean;
  equipItem: (itemId: string, category: ItemCategory) => void;
  completeLevel: (levelId: number, stars: number) => void;
  recordGhostFrame: (frame: GhostFrame) => void;
  resetGhost: () => void;
  
  // Upgrade Actions
  purchaseUpgrade: (upgradeId: string, cost: number) => boolean;
  getUpgradeLevel: (upgradeId: string) => number;
  
  // Daily Challenge Actions
  setDailyChallengeCompleted: (score: number) => void;
  
  // V2 Mechanics Actions - Requirements 1.3, 1.4
  updateShiftState: (state: Partial<ShiftProtocolState>) => void;
  updateResonanceState: (state: Partial<EnhancedResonanceState>) => void;
  updateSnapshotBuffer: (buffer: SnapshotBuffer) => void;
  resetV2State: () => void;
  
  // Settings Actions
  setTutorialCompleted: (completed: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// Default state values
const DEFAULT_STATE = {
  echoShards: 5000, // Starting bonus for new players
  ownedSkins: ['default'],
  ownedEffects: ['default'],
  ownedThemes: ['default'],
  ownedUpgrades: {} as Record<string, number>,
  equippedSkin: 'default',
  equippedEffect: 'default',
  equippedTheme: 'default',
  completedLevels: [] as number[],
  currentLevel: 1,
  levelStars: {} as Record<number, number>,
  lastDailyChallengeDate: '',
  dailyChallengeCompleted: false,
  dailyChallengeBestScore: 0,
  ghostTimeline: [] as GhostFrame[],
  // V2 Mechanics State - Requirements 1.3, 1.4
  shift: initializeShiftState(),
  resonance: initializeEnhancedResonanceState(),
  snapshots: initializeSnapshotBuffer(),
  tutorialCompleted: false,
  soundEnabled: true,
  musicEnabled: true,
  hapticEnabled: true,
};

// Persisted state interface (subset of GameStore that gets saved)
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
  hapticEnabled: boolean;
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
    
    // Currency Actions
    addEchoShards: (amount: number) => {
      if (amount < 0) {
        console.warn('[GameStore] Cannot add negative Echo Shards');
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
        console.warn('[GameStore] Cannot spend negative Echo Shards');
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
      const ownedKey = `owned${category.charAt(0).toUpperCase() + category.slice(1)}s` as keyof typeof state;
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
      const ownedKey = `owned${category.charAt(0).toUpperCase() + category.slice(1)}s` as keyof typeof state;
      const ownedItems = state[ownedKey] as string[];
      if (!ownedItems.includes(itemId)) {
        console.warn(`[GameStore] Cannot equip unowned item: ${itemId}`);
        return;
      }
      
      // Equip the item
      const equippedKey = `equipped${category.charAt(0).toUpperCase() + category.slice(1)}` as 'equippedSkin' | 'equippedEffect' | 'equippedTheme';
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
    
    // Daily Challenge Actions
    setDailyChallengeCompleted: (score: number) => {
      const today = new Date().toISOString().split('T')[0];
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
    
    // Persistence Actions
    loadFromStorage: () => {
      const savedState = safeLoad<Partial<PersistedState>>(STORAGE_KEYS.GAME_STATE, {});
      
      // Merge saved state with defaults
      set({
        echoShards: savedState.echoShards ?? DEFAULT_STATE.echoShards,
        ownedSkins: savedState.ownedSkins ?? DEFAULT_STATE.ownedSkins,
        ownedEffects: savedState.ownedEffects ?? DEFAULT_STATE.ownedEffects,
        ownedThemes: savedState.ownedThemes ?? DEFAULT_STATE.ownedThemes,
        ownedUpgrades: savedState.ownedUpgrades ?? DEFAULT_STATE.ownedUpgrades,
        equippedSkin: savedState.equippedSkin ?? DEFAULT_STATE.equippedSkin,
        equippedEffect: savedState.equippedEffect ?? DEFAULT_STATE.equippedEffect,
        equippedTheme: savedState.equippedTheme ?? DEFAULT_STATE.equippedTheme,
        completedLevels: savedState.completedLevels ?? DEFAULT_STATE.completedLevels,
        currentLevel: savedState.currentLevel ?? DEFAULT_STATE.currentLevel,
        levelStars: savedState.levelStars ?? DEFAULT_STATE.levelStars,
        lastDailyChallengeDate: savedState.lastDailyChallengeDate ?? DEFAULT_STATE.lastDailyChallengeDate,
        dailyChallengeCompleted: savedState.dailyChallengeCompleted ?? DEFAULT_STATE.dailyChallengeCompleted,
        dailyChallengeBestScore: savedState.dailyChallengeBestScore ?? DEFAULT_STATE.dailyChallengeBestScore,
        tutorialCompleted: savedState.tutorialCompleted ?? DEFAULT_STATE.tutorialCompleted,
        soundEnabled: savedState.soundEnabled ?? DEFAULT_STATE.soundEnabled,
        musicEnabled: savedState.musicEnabled ?? DEFAULT_STATE.musicEnabled,
        hapticEnabled: savedState.hapticEnabled ?? DEFAULT_STATE.hapticEnabled,
      });
      
      // Load ghost data separately (can be large)
      const ghostData = safeLoad<GhostFrame[]>(STORAGE_KEYS.GHOST_DATA, []);
      set({ ghostTimeline: ghostData });
    },
    
    saveToStorage: () => {
      const state = get();
      
      // Save main state
      const stateToSave: PersistedState = {
        echoShards: state.echoShards,
        ownedSkins: state.ownedSkins,
        ownedEffects: state.ownedEffects,
        ownedThemes: state.ownedThemes,
        ownedUpgrades: state.ownedUpgrades,
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
if (typeof window !== 'undefined') {
  useGameStore.getState().loadFromStorage();
}
