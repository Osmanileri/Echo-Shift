/**
 * Chapter System for Campaign Mode
 * Campaign Chapter System - Bölüm bazlı ilerleme sistemi
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 2.4, 2.5, 8.1, 8.2
 */

/**
 * Chapter configuration interface
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export interface ChapterConfig {
  id: number;                    // Bölüm numarası (1, 2, 3, ...)
  targetDistance: number;        // Hedef mesafe (id × 100 metre)
  baseSpeed: number;             // Başlangıç hızı (5 px/frame)
  isUnlocked: boolean;           // Bölüm açık mı?
  isCompleted: boolean;          // Bölüm tamamlandı mı?
}

/**
 * Chapter progress state interface
 * Requirements: 2.1, 2.4, 2.5
 */
export interface ChapterProgressState {
  completedChapters: number[];   // Tamamlanan bölüm ID'leri
  currentChapter: number;        // Şu an oynanan bölüm
  highestUnlocked: number;       // En yüksek açık bölüm
}

/**
 * Default base speed for all chapters
 * Requirements: 4.1
 */
const DEFAULT_BASE_SPEED = 5;

/**
 * Storage key for chapter progress persistence
 * Requirements: 8.1, 8.2
 */
export const CHAPTER_PROGRESS_KEY = 'echo_shift_chapter_progress';

/**
 * Calculate target distance for a chapter
 * Formula: chapterId × 100 meters
 * Requirements: 1.1
 * 
 * @param chapterId - Chapter number (1, 2, 3, ...)
 * @returns Target distance in meters
 */
export function calculateTargetDistance(chapterId: number): number {
  if (chapterId < 1) return 100; // Minimum chapter 1
  return chapterId * 100;
}

/**
 * Generate chapter configuration for a specific chapter
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1
 * 
 * @param chapterId - Chapter number (1, 2, 3, ...)
 * @returns ChapterConfig for the specified chapter
 */
export function generateChapterConfig(chapterId: number): ChapterConfig {
  return {
    id: chapterId,
    targetDistance: calculateTargetDistance(chapterId),
    baseSpeed: DEFAULT_BASE_SPEED,
    isUnlocked: chapterId === 1, // Only chapter 1 is unlocked by default
    isCompleted: false,
  };
}

/**
 * Get chapter configuration by ID
 * Requirements: 1.1, 1.2, 1.3, 1.4
 * 
 * @param chapterId - Chapter number (1-100)
 * @returns ChapterConfig or undefined if invalid ID
 */
export function getChapterById(chapterId: number): ChapterConfig | undefined {
  if (chapterId < 1 || chapterId > 100) {
    return undefined;
  }
  return generateChapterConfig(chapterId);
}

/**
 * Check if a chapter is unlocked
 * Chapter 1 is always unlocked, others require previous chapter completion
 * Requirements: 2.1, 2.3
 * 
 * @param chapterId - Chapter number to check
 * @param completedChapters - Array of completed chapter IDs
 * @returns true if chapter is unlocked
 */
export function isChapterUnlocked(chapterId: number, completedChapters: number[]): boolean {
  // Invalid chapter IDs are not unlocked
  if (chapterId < 1 || chapterId > 100) {
    return false;
  }
  
  // Chapter 1 is always unlocked
  if (chapterId === 1) {
    return true;
  }
  
  // Other chapters require previous chapter to be completed
  return completedChapters.includes(chapterId - 1);
}

/**
 * Unlock the next chapter after completing a chapter
 * Requirements: 2.4
 * 
 * @param completedChapterId - The chapter that was just completed
 * @param state - Current chapter progress state
 * @returns Updated chapter progress state
 */
export function unlockNextChapter(
  completedChapterId: number,
  state: ChapterProgressState
): ChapterProgressState {
  // Don't modify if chapter is invalid
  if (completedChapterId < 1 || completedChapterId > 100) {
    return state;
  }
  
  // Add to completed chapters if not already there
  const completedChapters = state.completedChapters.includes(completedChapterId)
    ? state.completedChapters
    : [...state.completedChapters, completedChapterId];
  
  // Calculate highest unlocked (next chapter after highest completed)
  const highestCompleted = Math.max(...completedChapters, 0);
  const highestUnlocked = Math.min(highestCompleted + 1, 100);
  
  return {
    ...state,
    completedChapters,
    highestUnlocked,
  };
}

/**
 * Create default chapter progress state
 * Requirements: 2.1
 * 
 * @returns Default ChapterProgressState with chapter 1 unlocked
 */
export function createDefaultChapterProgress(): ChapterProgressState {
  return {
    completedChapters: [],
    currentChapter: 1,
    highestUnlocked: 1,
  };
}

/**
 * Save chapter progress to localStorage
 * Requirements: 2.5, 8.1
 * 
 * @param state - Chapter progress state to save
 * @returns true if save was successful
 */
export function saveChapterProgress(state: ChapterProgressState): boolean {
  try {
    const data = JSON.stringify(state);
    localStorage.setItem(CHAPTER_PROGRESS_KEY, data);
    return true;
  } catch (error) {
    console.warn('[ChapterSystem] Failed to save chapter progress:', error);
    return false;
  }
}

/**
 * Load chapter progress from localStorage
 * Requirements: 8.1, 8.2
 * 
 * @returns ChapterProgressState from storage or default state if not found/invalid
 */
export function loadChapterProgress(): ChapterProgressState {
  try {
    const data = localStorage.getItem(CHAPTER_PROGRESS_KEY);
    if (!data) {
      return createDefaultChapterProgress();
    }
    
    const parsed = JSON.parse(data) as ChapterProgressState;
    
    // Validate the loaded data
    if (!isValidChapterProgressState(parsed)) {
      console.warn('[ChapterSystem] Invalid chapter progress data, using default');
      return createDefaultChapterProgress();
    }
    
    return parsed;
  } catch (error) {
    console.warn('[ChapterSystem] Failed to load chapter progress:', error);
    return createDefaultChapterProgress();
  }
}

/**
 * Validate chapter progress state structure
 * 
 * @param state - State to validate
 * @returns true if state is valid
 */
function isValidChapterProgressState(state: unknown): state is ChapterProgressState {
  if (!state || typeof state !== 'object') {
    return false;
  }
  
  const s = state as Record<string, unknown>;
  
  return (
    Array.isArray(s.completedChapters) &&
    typeof s.currentChapter === 'number' &&
    typeof s.highestUnlocked === 'number'
  );
}

/**
 * Get chapter configuration with unlock status based on progress
 * 
 * @param chapterId - Chapter number
 * @param state - Current chapter progress state
 * @returns ChapterConfig with correct unlock/completion status
 */
export function getChapterWithProgress(
  chapterId: number,
  state: ChapterProgressState
): ChapterConfig | undefined {
  const config = getChapterById(chapterId);
  if (!config) {
    return undefined;
  }
  
  return {
    ...config,
    isUnlocked: isChapterUnlocked(chapterId, state.completedChapters),
    isCompleted: state.completedChapters.includes(chapterId),
  };
}
