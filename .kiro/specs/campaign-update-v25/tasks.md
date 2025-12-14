# Implementation Plan

- [x] 1. Update Level Configuration System






  - [x] 1.1 Update `data/levels.ts` to use distance-based configuration

    - Replace targetScore with targetDistance using formula: `350 + (level * 100) * (level ^ 0.1)`
    - Add baseSpeed calculation: `10 + (level * 0.4)`
    - Add obstacleDensity calculation: `min(1.0, 0.5 + (level * 0.02))`
    - Update LevelConfig interface with new fields
    - _Requirements: 2.1, 3.4, 5.4_

  - [x] 1.2 Write property tests for level configuration

    - **Property 1: Target distance formula correctness**
    - **Property 8: Base speed formula**
    - **Property 15: Obstacle density formula**
    - **Validates: Requirements 2.1, 3.4, 5.4**
  - [x] 1.3 Add Chapter type and assignment logic


    - Define ChapterType enum: SUB_BASS, BASS, MID, HIGH, PRESENCE
    - Implement getChapterForLevel function
    - Add chapter-specific mechanics flags (movingObstacles for MID+)
    - _Requirements: 5.1, 5.3_


  - [x] 1.4 Write property tests for chapter assignment
    - **Property 13: Chapter assignment**
    - **Property 14: Moving obstacles introduction**
    - **Validates: Requirements 5.1, 5.3**

- [x] 2. Implement Distance Tracking System





  - [x] 2.1 Create `systems/distanceTracker.ts`


    - Implement DistanceState interface
    - Implement update(deltaTime, speed) method
    - Implement getState(), reset(), isLevelComplete() methods
    - Track progressPercent, isInClimaxZone, isNearFinish
    - _Requirements: 2.2, 2.3, 2.4_
  - [x] 2.2 Write property tests for distance tracking


    - **Property 2: Level completion trigger**
    - **Property 3: Distance accumulation**
    - **Property 4: Game over on zero health**
    - **Property 6: Climax zone detection**
    - **Validates: Requirements 2.2, 2.3, 2.4, 3.2**

- [x] 3. Implement Progressive Speed Controller





  - [x] 3.1 Create `systems/speedController.ts`


    - Implement SpeedConfig interface
    - Implement calculateSpeed(distanceState, level) method
    - Apply progressive formula: `baseSpeed * (1 + (currentDistance / targetDistance) * 0.3)`
    - Apply climax multiplier (1.2x) in final 20%
    - Implement smooth transition over 500ms
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.2 Write property tests for speed controller

    - **Property 5: Progressive speed formula**
    - **Property 7: Climax speed multiplier**
    - **Validates: Requirements 3.1, 3.2**

- [x] 4. Implement Star Rating System





  - [x] 4.1 Update `systems/campaignSystem.ts` with new star criteria


    - Implement calculateStarRating(result: LevelResult) function
    - 1 star: Complete with health > 0 (Survivor)
    - 2 stars: Collect >= 80% shards (Collector)
    - 3 stars: No damage taken (Perfectionist)
    - Return highest applicable rating
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.2 Write property tests for star rating

    - **Property 9: Survivor star (1 star)**
    - **Property 10: Collector star (2 stars)**
    - **Property 11: Perfectionist star (3 stars)**
    - **Property 12: Star rating maximum selection**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 5. Update Gem Spawning System





  - [x] 5.1 Update `systems/shardPlacement.ts` for campaign mode


    - Reduce gem size to 60% of current
    - Increase spawn frequency by 2x
    - Implement horizontal spread (left, center, right positions)
    - Add random horizontal offset within safe bounds
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 5.2 Write property tests for gem spawning


    - **Property 16: Gem spawn rate increase**
    - **Property 17: Gem horizontal spread**
    - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 6. Implement Reward Calculation System





  - [x] 6.1 Update reward logic in `systems/campaignSystem.ts`


    - Implement first-clear bonus: `50 + (level * 10)`
    - Implement base reward: `10 + (level * 3) + (stars * 5)`
    - Implement replay difference calculation
    - Track firstClearBonus flag in LevelStats
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 6.2 Write property tests for rewards

    - **Property 18: First-clear bonus formula**
    - **Property 19: Replay reward difference**
    - **Property 20: Base reward formula**
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 7. Checkpoint - Ensure all core system tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update Game Store for Campaign Mode





  - [x] 8.1 Update `store/gameStore.ts` with campaign state


    - Add lastPlayedLevel to persisted state
    - Add levelStats tracking (bestDistance, shardsCollected, etc.)
    - Update completeLevel to use new star criteria
    - Add distance-based session state
    - _Requirements: 1.4, 10.2, 10.4_

  - [x] 8.2 Write property tests for persistence

    - **Property 21: Star rating persistence**
    - **Property 22: Higher star rating update**
    - **Property 23: Last played level persistence**
    - **Validates: Requirements 1.4, 10.2, 10.4**

- [x] 9. Update GameEngine for Distance Mode






  - [x] 9.1 Integrate distance tracking into `components/GameEngine.tsx`

    - Replace score tracking with distance tracking
    - Integrate SpeedController for progressive speed
    - Add climax zone detection and speed boost
    - Trigger level completion at target distance
    - Track shards collected and damage taken for star rating
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 10. Update Game HUD for Distance Display






  - [x] 10.1 Update `components/GameUI.tsx` for distance mode

    - Replace score display with distance counter (top-left)
    - Add compact Distance_Bar below counter
    - Show start (0m), current position, end (targetDistance)
    - Add pulsing animation when within 50m of target
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 10.2 Update Game Over screen for distance mode

    - Display "Gidilen Mesafe / Hedef Mesafe" instead of score
    - Show progress percentage (e.g., "75% tamamlandı")
    - Show shards collected during the run
    - _Requirements: 6.1_

  - [x] 10.3 Write property test for distance bar pulse

    - **Property 24: Distance bar pulse trigger**
    - **Validates: Requirements 6.4**

- [x] 11. Update Main Menu Flow






  - [x] 11.1 Update `App.tsx` for campaign-first flow

    - "Start Game" button opens level selection directly
    - Remove separate "Campaign" button from menu
    - Auto-select last played level on launch
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 11.2 Update `components/GameUI.tsx` menu buttons

    - Remove "Kampanya" button
    - Update "Başla" button to open level selection
    - _Requirements: 1.3_

- [x] 12. Checkpoint - Ensure core gameplay flow works





  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement Climax Zone Visual Effects






  - [x] 13.1 Create `systems/climaxVFX.ts`

    - Implement starfield stretch effect (1.0 - 2.0 factor)
    - Implement chromatic aberration (RGB shift at edges)
    - Implement FOV increase (1.0 - 1.15 multiplier)
    - Implement screen flash on finish
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 13.2 Write property test for FOV increase

    - **Property 26: FOV increase in climax zone**
    - **Validates: Requirements 11.3**

- [x] 14. Implement Holographic Gate
  - [x] 14.1 Create `systems/holographicGate.ts`

    - Spawn gate when within 100m of target
    - Implement pulse animation synced to BPM
    - Implement shatter animation on pass-through
    - Implement player warp-jump acceleration
    - Trigger shatter SFX via audioSystem on gate break
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [x] 14.2 Write property test for gate visibility


    - **Property 25: Holographic gate visibility**
    - **Validates: Requirements 12.1**

- [x] 15. Implement Victory Screen Animations






  - [x] 15.1 Create `components/VictoryScreen/VictoryScreen.tsx`

    - Implement slow motion effect (0.2x for 1 second)
    - Implement sequential star reveal (300ms delay)
    - Implement Flying Currency animation
    - Spawn 10-20 particles with Bezier curve paths
    - Implement counter scale pop on particle arrival
    - Trigger star pop SFX on each star reveal
    - Trigger coin count SFX on currency particle arrival
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 15.2 Write property test for flying currency

    - **Property 27: Flying currency particle count**
    - **Validates: Requirements 8.4**

- [x] 16. Implement Level Map Animations






  - [x] 16.1 Update `components/Campaign/LevelMap.tsx` with unlock animations

    - Implement Path_Unlock animation (glowing line)
    - Implement Unlock_Pop animation (scale, flash, settle)
    - Implement chapter background cross-fade
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 17. Implement Environmental Effects








  - [x] 17.1 Add collection and damage effects



    - Add particle burst on shard collection
    - Add BPM-synced pulse to obstacles/background
    - Add Glitch_Artifact effect on damage (200ms)
    - Add haptic feedback on distance bar pulse
    - Trigger collection SFX on shard pickup
    - Trigger glitch SFX on damage taken
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 18. Checkpoint - Ensure all visual effects work





  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Integration and Polish





  - [x] 19.1 Full flow integration testing


    - Test complete level flow: select → play → complete → victory → return
    - Test first-clear vs replay reward scenarios
    - Test chapter transitions
    - Verify all animations trigger correctly
    - _Requirements: All_

  - [x] 19.2 Update Memory Bank documentation

    - Update activeContext.md with campaign update status
    - Update progress.md with completed features
    - Update systemPatterns.md with new systems
    - _Requirements: Documentation_

- [x] 20. Final Checkpoint - All tests passing





  - Ensure all tests pass, ask the user if questions arise.
