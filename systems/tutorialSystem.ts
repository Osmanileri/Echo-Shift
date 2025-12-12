/**
 * Tutorial System Implementation
 * Requirements: 17.1, 17.3, 17.4, 17.5
 * 
 * Manages tutorial step definitions, progression logic, first-run detection,
 * and contextual tutorial triggers for new mechanics in Campaign Mode.
 */

import { useGameStore } from '../store/gameStore';

/**
 * Tutorial step types
 */
export type TutorialStepType = 
  | 'welcome'
  | 'swap_mechanic'
  | 'scoring'
  | 'obstacles'
  | 'near_miss'
  | 'shop_intro'
  | 'phantom_intro'
  | 'midline_intro'
  | 'rhythm_intro'
  | 'gravity_intro';

/**
 * Tutorial step highlight target
 */
export type HighlightTarget = 
  | 'game_area'
  | 'score_display'
  | 'orbs'
  | 'obstacles'
  | 'shop_button'
  | 'echo_shards'
  | 'none';

/**
 * Tutorial step definition
 * Requirements: 17.1, 17.2
 */
export interface TutorialStep {
  id: TutorialStepType;
  title: string;
  description: string;
  highlightTarget: HighlightTarget;
  position: 'top' | 'center' | 'bottom';
  requiresAction?: boolean;
  actionText?: string;
}

/**
 * Tutorial state
 */
export interface TutorialState {
  isActive: boolean;
  currentStepIndex: number;
  tutorialType: 'main' | 'phantom' | 'midline' | 'rhythm' | 'gravity';
  steps: TutorialStep[];
}

/**
 * Main tutorial steps for first-time players
 * Requirements: 17.1
 */
export const MAIN_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Echo Shift\'e Hoş Geldin!',
    description: 'Bu hızlı eğitimde oyunun temellerini öğreneceksin. Hazır mısın?',
    highlightTarget: 'none',
    position: 'center',
  },
  {
    id: 'swap_mechanic',
    title: 'Swap Mekaniği',
    description: 'Ekrana dokun veya tıkla - iki top yer değiştirir. Beyaz top üstte, siyah top altta güvende!',
    highlightTarget: 'orbs',
    position: 'center',
    requiresAction: true,
    actionText: 'Swap yapmak için dokun',
  },
  {
    id: 'obstacles',
    title: 'Engeller',
    description: 'Engeller sağdan gelir. Beyaz engeller beyaz top için, siyah engeller siyah top için tehlikelidir.',
    highlightTarget: 'obstacles',
    position: 'top',
  },
  {
    id: 'scoring',
    title: 'Puanlama',
    description: 'Her geçtiğin engel puan kazandırır. Ne kadar uzun hayatta kalırsan, o kadar çok puan!',
    highlightTarget: 'score_display',
    position: 'top',
  },
  {
    id: 'near_miss',
    title: 'Yakın Geçiş Bonusu',
    description: 'Engellere yakın geçersen ekstra puan kazanırsın. Risk al, ödül kazan!',
    highlightTarget: 'game_area',
    position: 'center',
  },
  {
    id: 'shop_intro',
    title: 'Mağaza',
    description: 'Echo Shards kazanarak mağazadan skinler, temalar ve yükseltmeler satın alabilirsin.',
    highlightTarget: 'shop_button',
    position: 'bottom',
  },
];

/**
 * Phantom mechanic tutorial (Level 11)
 * Requirements: 17.5
 */
export const PHANTOM_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'phantom_intro',
    title: 'Phantom Engeller',
    description: 'Yeni bir tehlike! Phantom engeller başta görünmez, yaklaştıkça belirir. Dikkatli ol!',
    highlightTarget: 'game_area',
    position: 'center',
  },
];

/**
 * Dynamic midline tutorial (Level 21)
 * Requirements: 17.5
 */
export const MIDLINE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'midline_intro',
    title: 'Dinamik Orta Çizgi',
    description: 'Orta çizgi artık hareket ediyor! Alanların boyutu sürekli değişecek, adaptasyon şart.',
    highlightTarget: 'game_area',
    position: 'center',
  },
];

/**
 * Rhythm system tutorial (Level 31)
 * Requirements: 17.5
 */
export const RHYTHM_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'rhythm_intro',
    title: 'Ritim Sistemi',
    description: 'Engelleri ritimli geçersen çarpan kazanırsın! x2 ve x3 çarpanlar için ritmi yakala.',
    highlightTarget: 'game_area',
    position: 'center',
  },
];

/**
 * Gravity flip tutorial (Level 41)
 * Requirements: 17.5
 */
export const GRAVITY_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'gravity_intro',
    title: 'Yerçekimi Değişimi',
    description: 'Dikkat! Yerçekimi aniden tersine dönebilir. Uyarı işaretini gördüğünde hazır ol!',
    highlightTarget: 'game_area',
    position: 'center',
  },
];

/**
 * Default tutorial state
 */
const DEFAULT_TUTORIAL_STATE: TutorialState = {
  isActive: false,
  currentStepIndex: 0,
  tutorialType: 'main',
  steps: [],
};

// In-memory tutorial state (not persisted, only tutorialCompleted flag is persisted)
let tutorialState: TutorialState = { ...DEFAULT_TUTORIAL_STATE };

/**
 * Check if this is the player's first run
 * Requirements: 17.1
 * @returns true if tutorial has not been completed
 */
export function isFirstRun(): boolean {
  return !useGameStore.getState().tutorialCompleted;
}

/**
 * Check if main tutorial should be shown
 * Requirements: 17.1
 * @returns true if main tutorial should start
 */
export function shouldShowMainTutorial(): boolean {
  return isFirstRun() && !tutorialState.isActive;
}



/**
 * Check if contextual tutorial should be shown for a specific level
 * Requirements: 17.5
 * @param levelId - The level being started
 * @returns Tutorial type to show, or null if no tutorial needed
 */
export function getContextualTutorialForLevel(levelId: number): TutorialState['tutorialType'] | null {
  const state = useGameStore.getState();
  
  // Check if we've already shown this contextual tutorial
  // We use completedLevels to track if the level has been played before
  const hasPlayedLevel = state.completedLevels.includes(levelId);
  
  if (hasPlayedLevel) {
    return null;
  }
  
  // Level 11: Phantom introduction
  if (levelId === 11) {
    return 'phantom';
  }
  
  // Level 21: Dynamic midline introduction (changed from 20 to match data/levels.ts)
  if (levelId === 21) {
    return 'midline';
  }
  
  // Level 31: Rhythm system introduction
  if (levelId === 31) {
    return 'rhythm';
  }
  
  // Level 41: Gravity flip introduction
  if (levelId === 41) {
    return 'gravity';
  }
  
  return null;
}

/**
 * Start the main tutorial
 * Requirements: 17.1
 */
export function startMainTutorial(): void {
  tutorialState = {
    isActive: true,
    currentStepIndex: 0,
    tutorialType: 'main',
    steps: [...MAIN_TUTORIAL_STEPS],
  };
}

/**
 * Start a contextual tutorial for a specific mechanic
 * Requirements: 17.5
 * @param type - The tutorial type to start
 */
export function startContextualTutorial(type: TutorialState['tutorialType']): void {
  let steps: TutorialStep[];
  
  switch (type) {
    case 'phantom':
      steps = [...PHANTOM_TUTORIAL_STEPS];
      break;
    case 'midline':
      steps = [...MIDLINE_TUTORIAL_STEPS];
      break;
    case 'rhythm':
      steps = [...RHYTHM_TUTORIAL_STEPS];
      break;
    case 'gravity':
      steps = [...GRAVITY_TUTORIAL_STEPS];
      break;
    default:
      steps = [...MAIN_TUTORIAL_STEPS];
  }
  
  tutorialState = {
    isActive: true,
    currentStepIndex: 0,
    tutorialType: type,
    steps,
  };
}

/**
 * Get the current tutorial state
 * @returns Current tutorial state
 */
export function getTutorialState(): TutorialState {
  return { ...tutorialState };
}

/**
 * Get the current tutorial step
 * @returns Current step or null if no active tutorial
 */
export function getCurrentStep(): TutorialStep | null {
  if (!tutorialState.isActive || tutorialState.steps.length === 0) {
    return null;
  }
  
  return tutorialState.steps[tutorialState.currentStepIndex] || null;
}

/**
 * Advance to the next tutorial step
 * Requirements: 17.3
 * @returns true if advanced, false if tutorial is complete
 */
export function advanceStep(): boolean {
  if (!tutorialState.isActive) {
    return false;
  }
  
  const nextIndex = tutorialState.currentStepIndex + 1;
  
  if (nextIndex >= tutorialState.steps.length) {
    // Tutorial complete
    completeTutorial();
    return false;
  }
  
  tutorialState.currentStepIndex = nextIndex;
  return true;
}

/**
 * Go back to the previous tutorial step
 * @returns true if went back, false if at first step
 */
export function previousStep(): boolean {
  if (!tutorialState.isActive || tutorialState.currentStepIndex === 0) {
    return false;
  }
  
  tutorialState.currentStepIndex -= 1;
  return true;
}

/**
 * Complete the current tutorial
 * Requirements: 17.4
 */
export function completeTutorial(): void {
  const wasMainTutorial = tutorialState.tutorialType === 'main';
  
  // Reset tutorial state
  tutorialState = { ...DEFAULT_TUTORIAL_STATE };
  
  // Mark main tutorial as completed in persistent storage
  if (wasMainTutorial) {
    useGameStore.getState().setTutorialCompleted(true);
  }
}

/**
 * Skip the current tutorial
 * Requirements: 17.2 (skip option)
 */
export function skipTutorial(): void {
  completeTutorial();
}

/**
 * Check if tutorial is currently active
 * @returns true if a tutorial is in progress
 */
export function isTutorialActive(): boolean {
  return tutorialState.isActive;
}

/**
 * Get tutorial progress
 * @returns Progress object with current and total steps
 */
export function getTutorialProgress(): { current: number; total: number } {
  return {
    current: tutorialState.currentStepIndex + 1,
    total: tutorialState.steps.length,
  };
}

/**
 * Reset tutorial state (for testing or replay)
 */
export function resetTutorialState(): void {
  tutorialState = { ...DEFAULT_TUTORIAL_STATE };
}

/**
 * Force reset tutorial completed flag (for testing)
 */
export function resetTutorialCompleted(): void {
  useGameStore.getState().setTutorialCompleted(false);
  resetTutorialState();
}
