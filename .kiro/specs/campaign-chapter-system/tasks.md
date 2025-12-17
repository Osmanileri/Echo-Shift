# Implementation Plan

- [x] 1. Create Chapter System Core





  - [x] 1.1 Create `systems/chapterSystem.ts` with ChapterConfig and ChapterProgressState interfaces


    - Define ChapterConfig interface (id, targetDistance, baseSpeed, isUnlocked, isCompleted)
    - Define ChapterProgressState interface (completedChapters, currentChapter, highestUnlocked)
    - Implement `calculateTargetDistance(chapterId)` function using formula: chapterId × 100
    - Implement `generateChapterConfig(chapterId)` function
    - Implement `getChapterById(chapterId)` function
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 1.2 Write property test for target distance formula


    - **Property 1: Target Distance Formula**
    - **Validates: Requirements 1.1**
  - [x] 1.3 Implement chapter unlock logic


    - Implement `isChapterUnlocked(chapterId, completedChapters)` function
    - Implement `unlockNextChapter(completedChapterId, state)` function
    - Chapter 1 always unlocked, others require previous completion
    - _Requirements: 2.1, 2.3, 2.4_
  - [x] 1.4 Write property tests for chapter unlock logic


    - **Property 3: Locked Chapter Access Prevention**
    - **Property 4: Sequential Unlock Progression**
    - **Validates: Requirements 2.3, 2.4**

- [x] 2. Update Speed Controller for Chapter-Based Progression
  - [x] 2.1 Update `systems/speedController.ts` with new logarithmic formula
    - Modify `calculateSpeed()` to use: baseSpeed × (1 + 0.3 × log(1 + distance/50))
    - Ensure speed resets to baseSpeed (5) at chapter start
    - Implement climax zone detection (final 20%)
    - Apply 1.2x multiplier in climax zone
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 2.2 Write property tests for speed calculation


    - **Property 7: Speed Formula Correctness**
    - **Property 8: Climax Speed Multiplier**
    - **Validates: Requirements 4.2, 4.4**

- [x] 3. Update Distance Tracker for Level Completion





  - [x] 3.1 Update `systems/distanceTracker.ts` for chapter completion detection


    - Modify `isLevelComplete()` to trigger when currentDistance >= targetDistance
    - Add `isNearFinish()` check for last 50 meters
    - Ensure distance resets to 0 at chapter start
    - _Requirements: 1.5, 3.1_
  - [x] 3.2 Write property tests for level completion


    - **Property 2: Level Completion Trigger**
    - **Property 6: Finish Line Visibility Threshold**
    - **Validates: Requirements 1.5, 3.1**

- [x] 4. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Chapter Progress Persistence





  - [x] 5.1 Create persistence functions in `systems/chapterSystem.ts`


    - Implement `saveChapterProgress(state)` to localStorage
    - Implement `loadChapterProgress()` from localStorage
    - Handle storage errors gracefully with fallback to default state
    - Use key: 'echo_shift_chapter_progress'
    - _Requirements: 2.5, 8.1, 8.2_
  - [x] 5.2 Write property test for persistence round-trip


    - **Property 5: Chapter Progress Persistence Round-Trip**
    - **Validates: Requirements 2.5, 8.1, 8.2**

- [x] 6. Update Game Store for Chapter System






  - [x] 6.1 Update `store/gameStore.ts` with chapter progress state

    - Add `chapterProgress: ChapterProgressState` to store
    - Add `completeChapter(chapterId)` action
    - Add `resetChapterProgress()` action for fresh start
    - Integrate with existing persistence system
    - _Requirements: 2.4, 8.1, 8.4_
  - [x] 6.2 Write property tests for game store chapter actions


    - **Property 9: Game Over State Preservation**
    - **Property 10: Chapter Progress Reset on Completion**
    - **Validates: Requirements 6.1, 6.3, 8.4**

- [x] 7. Update Level Data for Simple Chapter Formula






  - [x] 7.1 Update `data/levels.ts` to use chapter × 100 formula

    - Modify `calculateTargetDistance()` to return `level × 100`
    - Update `LEVELS` array generation
    - Remove complex formula, use simple multiplication
    - _Requirements: 1.1_

- [x] 8. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update Finish Line System






  - [x] 9.1 Update `systems/holographicGate.ts` for 50m visibility threshold

    - Modify visibility check to trigger at 50m from target (was 100m)
    - Ensure gate appears when `targetDistance - currentDistance <= 50`
    - _Requirements: 3.1, 3.2_

- [x] 10. Update Game Engine Integration





  - [x] 10.1 Update `components/GameEngine.tsx` for chapter-based gameplay


    - Ensure speed resets at chapter start
    - Ensure distance resets at chapter start
    - Integrate chapter completion callback
    - Remove infinite gameplay logic
    - _Requirements: 4.1, 4.5, 1.5_
  - [x] 10.2 Update game over handling for chapter mode


    - Ensure chapter is NOT unlocked on game over
    - Pass distance traveled to game over screen
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Update Level Map Component





  - [x] 11.1 Update `components/Campaign/LevelMap.tsx` for lock system


    - Show lock icon on locked chapters
    - Prevent selection of locked chapters
    - Show "Complete previous chapter" message on locked chapter tap
    - Display completion status for each chapter
    - _Requirements: 2.2, 2.3, 10.1, 10.3_

- [x] 12. Update Victory Screen





  - [x] 12.1 Update `components/VictoryScreen/VictoryScreen.tsx` for chapter completion


    - Display chapter number
    - Display distance traveled / target distance
    - Ensure "Next Chapter" button works correctly
    - _Requirements: 5.2, 5.3, 5.5_

- [x] 13. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Integration Testing






  - [x] 14.1 Write integration tests for full chapter flow

    - Test chapter 1 completion unlocks chapter 2
    - Test game over does not unlock next chapter
    - Test persistence across page reload
    - _Requirements: 2.4, 6.3, 8.1_

- [x] 15. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

