/**
 * Property-Based Tests for Chapter System
 * Campaign Chapter System
 * 
 * Tests for:
 * - Property 1: Target Distance Formula
 * - Property 3: Locked Chapter Access Prevention
 * - Property 4: Sequential Unlock Progression
 * - Property 5: Chapter Progress Persistence Round-Trip
 */

import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
    calculateTargetDistance,
    CHAPTER_PROGRESS_KEY,
    ChapterProgressState,
    createDefaultChapterProgress,
    generateChapterConfig,
    getChapterById,
    isChapterUnlocked,
    loadChapterProgress,
    saveChapterProgress,
    unlockNextChapter,
} from './chapterSystem';

describe('Chapter System Properties - Campaign Chapter System', () => {
  /**
   * **Feature: campaign-chapter-system, Property 1: Target Distance Formula**
   * **Validates: Requirements 1.1**
   * 
   * For any chapter number N (where N >= 1), the target distance SHALL equal N × 100 meters.
   */
  test('Property 1: Target Distance Formula', () => {
    fc.assert(
      fc.property(
        // Chapter ID (1 to 100)
        fc.integer({ min: 1, max: 100 }),
        (chapterId) => {
          const targetDistance = calculateTargetDistance(chapterId);
          
          // Target distance should equal chapterId × 100
          expect(targetDistance).toBe(chapterId * 100);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 1: Target Distance Formula (specific examples)**
   * **Validates: Requirements 1.2, 1.3, 1.4**
   * 
   * Verify specific chapter distances match requirements.
   */
  test('Property 1: Target Distance Formula - specific examples', () => {
    // Requirements 1.2: Chapter 1 = 100m
    expect(calculateTargetDistance(1)).toBe(100);
    
    // Requirements 1.3: Chapter 2 = 200m
    expect(calculateTargetDistance(2)).toBe(200);
    
    // Requirements 1.4: Chapter 5 = 500m
    expect(calculateTargetDistance(5)).toBe(500);
    
    // Additional examples
    expect(calculateTargetDistance(10)).toBe(1000);
    expect(calculateTargetDistance(50)).toBe(5000);
    expect(calculateTargetDistance(100)).toBe(10000);
  });

  /**
   * **Feature: campaign-chapter-system, Property 1: Generated config uses correct formula**
   * **Validates: Requirements 1.1**
   * 
   * Generated chapter configs should have correct target distance.
   */
  test('Property 1: Generated config uses correct formula', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (chapterId) => {
          const config = generateChapterConfig(chapterId);
          
          expect(config.id).toBe(chapterId);
          expect(config.targetDistance).toBe(chapterId * 100);
          expect(config.baseSpeed).toBe(5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Chapter Unlock Properties - Campaign Chapter System', () => {
  /**
   * **Feature: campaign-chapter-system, Property 3: Locked Chapter Access Prevention**
   * **Validates: Requirements 2.3**
   * 
   * For any chapter that is not in the completedChapters list and is not chapter 1,
   * attempting to select it SHALL be prevented.
   */
  test('Property 3: Locked Chapter Access Prevention', () => {
    fc.assert(
      fc.property(
        // Chapter ID to check (2 to 100, since chapter 1 is always unlocked)
        fc.integer({ min: 2, max: 100 }),
        // Completed chapters (subset that doesn't include chapterId - 1)
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 0, maxLength: 50 }),
        (chapterId, completedChapters) => {
          // Filter out the previous chapter to ensure it's locked
          const filteredCompleted = completedChapters.filter(c => c !== chapterId - 1);
          
          const isUnlocked = isChapterUnlocked(chapterId, filteredCompleted);
          
          // Chapter should be locked if previous chapter is not completed
          expect(isUnlocked).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 3: Chapter 1 is always unlocked**
   * **Validates: Requirements 2.1**
   * 
   * Chapter 1 should always be unlocked regardless of completed chapters.
   */
  test('Property 3: Chapter 1 is always unlocked', () => {
    fc.assert(
      fc.property(
        // Any array of completed chapters
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 0, maxLength: 50 }),
        (completedChapters) => {
          const isUnlocked = isChapterUnlocked(1, completedChapters);
          
          // Chapter 1 should always be unlocked
          expect(isUnlocked).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 4: Sequential Unlock Progression**
   * **Validates: Requirements 2.4**
   * 
   * For any completed chapter N, chapter N+1 SHALL become unlocked.
   */
  test('Property 4: Sequential Unlock Progression', () => {
    fc.assert(
      fc.property(
        // Chapter to complete (1 to 99, since 100 has no next chapter)
        fc.integer({ min: 1, max: 99 }),
        (completedChapterId) => {
          const initialState = createDefaultChapterProgress();
          
          // Complete the chapter
          const newState = unlockNextChapter(completedChapterId, initialState);
          
          // The completed chapter should be in completedChapters
          expect(newState.completedChapters).toContain(completedChapterId);
          
          // The next chapter should now be unlocked
          const nextChapterId = completedChapterId + 1;
          const isNextUnlocked = isChapterUnlocked(nextChapterId, newState.completedChapters);
          expect(isNextUnlocked).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 4: Sequential unlock chain**
   * **Validates: Requirements 2.4**
   * 
   * Completing chapters in sequence should unlock subsequent chapters.
   */
  test('Property 4: Sequential unlock chain', () => {
    fc.assert(
      fc.property(
        // Number of chapters to complete in sequence (1 to 10)
        fc.integer({ min: 1, max: 10 }),
        (chaptersToComplete) => {
          let state = createDefaultChapterProgress();
          
          // Complete chapters in sequence
          for (let i = 1; i <= chaptersToComplete; i++) {
            state = unlockNextChapter(i, state);
          }
          
          // All completed chapters should be in the list
          for (let i = 1; i <= chaptersToComplete; i++) {
            expect(state.completedChapters).toContain(i);
          }
          
          // Next chapter should be unlocked
          const nextChapter = chaptersToComplete + 1;
          if (nextChapter <= 100) {
            expect(isChapterUnlocked(nextChapter, state.completedChapters)).toBe(true);
          }
          
          // Chapter after next should still be locked
          const chapterAfterNext = chaptersToComplete + 2;
          if (chapterAfterNext <= 100) {
            expect(isChapterUnlocked(chapterAfterNext, state.completedChapters)).toBe(false);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 4: Invalid chapter IDs don't modify state**
   * **Validates: Requirements 2.4**
   */
  test('Property 4: Invalid chapter IDs do not modify state', () => {
    fc.assert(
      fc.property(
        // Invalid chapter IDs
        fc.oneof(
          fc.integer({ min: -100, max: 0 }),
          fc.integer({ min: 101, max: 200 })
        ),
        (invalidChapterId) => {
          const initialState = createDefaultChapterProgress();
          const newState = unlockNextChapter(invalidChapterId, initialState);
          
          // State should remain unchanged
          expect(newState.completedChapters).toEqual(initialState.completedChapters);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Chapter Persistence Properties - Campaign Chapter System', () => {
  // Store original localStorage for cleanup
  let originalLocalStorage: Storage;
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockStorage = {};
    originalLocalStorage = global.localStorage;
    
    const mockLocalStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; },
      length: 0,
      key: () => null,
    };
    
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  /**
   * **Feature: campaign-chapter-system, Property 5: Chapter Progress Persistence Round-Trip**
   * **Validates: Requirements 2.5, 8.1, 8.2**
   * 
   * For any chapter progress state, saving to storage and then loading
   * SHALL produce an equivalent state.
   */
  test('Property 5: Chapter Progress Persistence Round-Trip', () => {
    fc.assert(
      fc.property(
        // Generate valid chapter progress state
        fc.record({
          completedChapters: fc.array(
            fc.integer({ min: 1, max: 100 }),
            { minLength: 0, maxLength: 50 }
          ).map(arr => [...new Set(arr)].sort((a, b) => a - b)), // Unique and sorted
          currentChapter: fc.integer({ min: 1, max: 100 }),
          highestUnlocked: fc.integer({ min: 1, max: 100 }),
        }),
        (state: ChapterProgressState) => {
          // Clear storage before test
          mockStorage = {};
          
          // Save the state
          const saveResult = saveChapterProgress(state);
          expect(saveResult).toBe(true);
          
          // Load the state back
          const loadedState = loadChapterProgress();
          
          // States should be equivalent
          expect(loadedState.completedChapters).toEqual(state.completedChapters);
          expect(loadedState.currentChapter).toBe(state.currentChapter);
          expect(loadedState.highestUnlocked).toBe(state.highestUnlocked);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 5: Load returns default on empty storage**
   * **Validates: Requirements 8.2**
   */
  test('Property 5: Load returns default on empty storage', () => {
    mockStorage = {};
    
    const loadedState = loadChapterProgress();
    const defaultState = createDefaultChapterProgress();
    
    expect(loadedState).toEqual(defaultState);
  });

  /**
   * **Feature: campaign-chapter-system, Property 5: Load returns default on invalid data**
   * **Validates: Requirements 8.2**
   */
  test('Property 5: Load returns default on invalid data', () => {
    // Test with invalid JSON
    mockStorage[CHAPTER_PROGRESS_KEY] = 'invalid json';
    let loadedState = loadChapterProgress();
    expect(loadedState).toEqual(createDefaultChapterProgress());
    
    // Test with missing fields
    mockStorage[CHAPTER_PROGRESS_KEY] = JSON.stringify({ foo: 'bar' });
    loadedState = loadChapterProgress();
    expect(loadedState).toEqual(createDefaultChapterProgress());
    
    // Test with wrong types
    mockStorage[CHAPTER_PROGRESS_KEY] = JSON.stringify({
      completedChapters: 'not an array',
      currentChapter: 'not a number',
      highestUnlocked: 1,
    });
    loadedState = loadChapterProgress();
    expect(loadedState).toEqual(createDefaultChapterProgress());
  });
});

describe('Chapter System Edge Cases', () => {
  /**
   * Test getChapterById with invalid IDs
   */
  test('getChapterById returns undefined for invalid IDs', () => {
    expect(getChapterById(0)).toBeUndefined();
    expect(getChapterById(-1)).toBeUndefined();
    expect(getChapterById(101)).toBeUndefined();
    expect(getChapterById(1000)).toBeUndefined();
  });

  /**
   * Test getChapterById with valid IDs
   */
  test('getChapterById returns config for valid IDs', () => {
    const config1 = getChapterById(1);
    expect(config1).toBeDefined();
    expect(config1?.id).toBe(1);
    expect(config1?.targetDistance).toBe(100);
    
    const config50 = getChapterById(50);
    expect(config50).toBeDefined();
    expect(config50?.id).toBe(50);
    expect(config50?.targetDistance).toBe(5000);
    
    const config100 = getChapterById(100);
    expect(config100).toBeDefined();
    expect(config100?.id).toBe(100);
    expect(config100?.targetDistance).toBe(10000);
  });

  /**
   * Test calculateTargetDistance with edge cases
   */
  test('calculateTargetDistance handles edge cases', () => {
    // Minimum valid chapter
    expect(calculateTargetDistance(1)).toBe(100);
    
    // Invalid chapter (< 1) returns minimum
    expect(calculateTargetDistance(0)).toBe(100);
    expect(calculateTargetDistance(-5)).toBe(100);
  });

  /**
   * Test isChapterUnlocked with invalid chapter IDs
   */
  test('isChapterUnlocked returns false for invalid IDs', () => {
    const completedChapters = [1, 2, 3];
    
    expect(isChapterUnlocked(0, completedChapters)).toBe(false);
    expect(isChapterUnlocked(-1, completedChapters)).toBe(false);
    expect(isChapterUnlocked(101, completedChapters)).toBe(false);
  });

  /**
   * Test default chapter progress state
   */
  test('createDefaultChapterProgress returns correct initial state', () => {
    const defaultState = createDefaultChapterProgress();
    
    expect(defaultState.completedChapters).toEqual([]);
    expect(defaultState.currentChapter).toBe(1);
    expect(defaultState.highestUnlocked).toBe(1);
  });

  /**
   * Test unlockNextChapter doesn't duplicate completed chapters
   */
  test('unlockNextChapter does not duplicate completed chapters', () => {
    const state: ChapterProgressState = {
      completedChapters: [1, 2, 3],
      currentChapter: 4,
      highestUnlocked: 4,
    };
    
    // Complete chapter 2 again
    const newState = unlockNextChapter(2, state);
    
    // Should not have duplicates
    const uniqueCompleted = [...new Set(newState.completedChapters)];
    expect(newState.completedChapters.length).toBe(uniqueCompleted.length);
  });
});
