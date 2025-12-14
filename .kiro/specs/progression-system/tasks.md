# Implementation Plan

- [x] 1. Set up core types and interfaces





  - [x] 1.1 Add mission and level types to types.ts


    - Add MissionType, MissionSlot, MissionCategory enums
    - Add Mission, MissionState, LevelInfo interfaces
    - Add ZoneLockStatus, ZoneRequirements, ZoneUnlockState interfaces
    - _Requirements: 2.1, 4.4, 6.1_
  - [x] 1.2 Add new storage keys to persistence.ts


    - Add MISSIONS, SYNC_RATE, LAST_LOGIN keys with echo-shift- prefix
    - _Requirements: 8.1_

- [x] 2. Implement Level System





  - [x] 2.1 Create systems/levelSystem.ts with core functions


    - Implement calculateRequiredXP(level) using formula: 100 × Level^1.5
    - Implement calculateLevelFromXP(totalXP) with binary search
    - Implement getLevelInfo(totalXP) returning full level data
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 2.2 Write property test for XP calculation formula


    - **Property 1: XP Calculation Formula Correctness**
    - **Validates: Requirements 4.2**
  - [x] 2.3 Write property test for level calculation from XP

    - **Property 2: Level Calculation from XP**
    - **Validates: Requirements 4.1, 4.3**
  - [x] 2.4 Implement calculateDailyReward(level) with tiered formula

    - Level 1-9: 100 + 10*level
    - Level 10-49: 200 + 8*(level-10)
    - Level 50+: 600 + 5*(level-50)
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 2.5 Write property test for daily reward calculation
    - **Property 3: Daily Reward Calculation**
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 3. Implement Zone Unlock System





  - [x] 3.1 Create systems/zoneUnlockSystem.ts


    - Implement getZoneUnlockStatus(zone, playerLevel, playerShards, isUnlocked)
    - Return correct ZoneLockStatus and message for each state
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 3.2 Write property test for zone unlock status determination


    - **Property 4: Zone Unlock Status Determination**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
  - [x] 3.3 Implement unlockZone(zoneId, shardCost) transaction

    - Deduct shards and add zone to unlocked list
    - _Requirements: 6.6_

  - [x] 3.4 Write property test for zone unlock transaction integrity

    - **Property 5: Zone Unlock Transaction Integrity**
    - **Validates: Requirements 6.6**
  - [x] 3.5 Update data/zones.ts with unlock requirements


    - Add unlockRequirements field to each zone
    - _Requirements: 6.1_

- [x] 4. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.


- [x] 5. Implement Mission System Core




  - [x] 5.1 Create systems/missionSystem.ts with mission data structures


    - Define SOUND_CHECK_MISSIONS constant
    - Define GRIND_TEMPLATES, SKILL_TEMPLATES, MASTERY_TEMPLATES
    - Implement getDefaultMissionState()
    - _Requirements: 1.1, 2.1_
  - [x] 5.2 Implement updateMissionProgress(state, event)


    - Update progress for all active missions matching event type
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 5.3 Write property test for mission progress tracking


    - **Property 6: Mission Progress Tracking**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
  - [x] 5.4 Implement checkMissionCompletion(mission)

    - Return true when progress >= goal
    - _Requirements: 7.6_

  - [x] 5.5 Write property test for mission completion detection
    - **Property 7: Mission Completion Detection**
    - **Validates: Requirements 7.6**

- [x] 6. Implement Mission Generation





  - [x] 6.1 Implement generateDailyMissions(seed)


    - Generate 3 missions for GRIND, SKILL, MASTERY slots
    - Use seeded random for deterministic generation
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 6.2 Write property test for daily mission slot constraints


    - **Property 8: Daily Mission Slot Constraints**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  - [x] 6.3 Implement generateMarathonChallenge(seed)


    - Generate weekly cumulative distance challenge
    - _Requirements: 3.1_
  - [x] 6.4 Implement checkMissionReset(state, now)


    - Check and reset daily missions at midnight
    - Check and reset marathon at Monday midnight
    - _Requirements: 2.6, 3.4_

- [x] 7. Implement Mission Persistence





  - [x] 7.1 Implement saveMissionState(state) and loadMissionState()


    - Use safePersist/safeLoad with validation
    - _Requirements: 8.1, 8.2_
  - [x] 7.2 Write property test for mission state persistence round-trip


    - **Property 9: Mission State Persistence Round-Trip**
    - **Validates: Requirements 8.1, 8.2**

  - [x] 7.3 Implement validateMissionState(data) with corruption handling

    - Return default state on invalid data
    - _Requirements: 8.3, 8.4_
  - [x] 7.4 Write property test for corrupted data recovery


    - **Property 11: Corrupted Data Recovery**
    - **Validates: Requirements 8.4**

- [x] 8. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement Sound Check Flow






  - [x] 9.1 Implement Sound Check mission tracking

    - Track swap count, shard collection, first collision
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 9.2 Implement Sound Check completion check


    - Set soundCheckComplete flag when all 3 missions done
    - _Requirements: 1.5_
  - [x] 9.3 Write property test for Sound Check completion unlocks Daily


    - **Property 10: Sound Check Completion Unlocks Daily**
    - **Validates: Requirements 1.5**
  - [x] 9.4 Implement reward distribution for Sound Check


    - Award XP and Shards on mission completion
    - _Requirements: 1.2, 1.3, 1.4_

- [x] 10. Integrate with Game Store






  - [x] 10.1 Add progression state to gameStore.ts

    - Add syncRate, totalXP, missions, unlockedZones, lastLoginDate, soundCheckComplete
    - Add actions: addXP, completeMission, unlockZone, claimDailyReward
    - _Requirements: 4.1, 5.1, 6.6_

  - [x] 10.2 Implement daily login reward claim

    - Check lastLoginDate, grant reward based on syncRate
    - _Requirements: 5.1_
  - [x] 10.3 Wire mission state persistence to store


    - Auto-save on state changes, load on init
    - _Requirements: 8.1, 8.2_

- [x] 11. Integrate with GameEngine





  - [x] 11.1 Add mission event callbacks to GameEngine props


    - Add onMissionEvent callback prop
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 11.2 Emit SWAP_COUNT events on lane change


    - Call onMissionEvent with type and value
    - _Requirements: 7.1_
  - [x] 11.3 Emit DISTANCE events on distance traveled


    - Track and emit distance periodically
    - _Requirements: 7.2_
  - [x] 11.4 Emit NEAR_MISS events on near miss detection


    - Integrate with existing near miss system
    - _Requirements: 7.3_
  - [x] 11.5 Emit COLLECT events on shard collection


    - Integrate with existing shard collection
    - _Requirements: 7.4_
  - [x] 11.6 Emit STAY_LANE events for lane duration


    - Track time in single lane, emit on swap or game end
    - _Requirements: 7.5_
  - [x] 11.7 Emit COLLISION event for Sound Check


    - Emit on first collision for Signal Loss mission
    - _Requirements: 1.4_

- [x] 12. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Create UI Components






  - [x] 13.1 Create components/Missions/MissionPanel.tsx

    - Display active missions with progress bars
    - Show Sound Check or Daily Protocols based on state
    - _Requirements: 1.1, 2.1_

  - [x] 13.2 Create components/Missions/MissionComplete.tsx

    - Show completion animation and rewards
    - _Requirements: 2.5, 3.3_

  - [x] 13.3 Create components/Profile/SyncRateDisplay.tsx

    - Show current level, XP bar, daily reward info
    - _Requirements: 4.4, 5.1_

  - [x] 13.4 Update components/Zones/ZoneUnlockModal.tsx

    - Show dual lock status with level and shard indicators
    - Display appropriate messages for each lock state
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14. Wire UI to App.tsx






  - [x] 14.1 Add mission panel to game UI

    - Show during gameplay and in menu
    - _Requirements: 1.1, 2.1_

  - [x] 14.2 Add level-up notification handling

    - Show notification on level advancement
    - _Requirements: 4.3_

  - [x] 14.3 Add daily reward claim flow

    - Show reward on first daily login
    - _Requirements: 5.1_

  - [x] 14.4 Add Sound Check completion celebration

    - Show "SYNC COMPLETE" on Sound Check finish
    - _Requirements: 1.5_

- [x] 15. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
