# Requirements Document

## Introduction

Echo Shift v2.2 "The Progression Update" introduces a hybrid progression system combining level-based advancement (Sync Rate) with an economy-driven unlock mechanism. The system includes a mission flow with onboarding tasks, daily protocols, and weekly challenges. Players progress through XP accumulation while unlocking new frequency zones through a dual-lock system requiring both level and shard thresholds.

## Glossary

- **Sync Rate**: The player's level/rank in the game, representing their synchronization with the Echo frequency
- **Echo Shards**: The in-game currency collected during gameplay
- **Swap**: The core mechanic of switching between top and bottom lanes
- **Mission**: A trackable objective that rewards XP and/or Shards upon completion
- **Sound Check**: Initial onboarding missions that teach basic mechanics
- **Daily Protocols**: Three daily missions that reset every 24 hours
- **Marathon Challenge**: Weekly cumulative challenge with premium rewards
- **Frequency Zone**: A themed game area (map) with unique visual and audio characteristics
- **Dual Lock**: Unlock system requiring both level AND currency thresholds
- **Near Miss**: Successfully passing very close to an obstacle without collision
- **XP**: Experience points that contribute to Sync Rate progression

## Requirements

### Requirement 1: Sound Check Onboarding

**User Story:** As a new player, I want to complete introductory missions, so that I can learn the basic mechanics before accessing the main mission system.

#### Acceptance Criteria

1. WHEN the player starts the game for the first time THEN the Mission_System SHALL display Sound Check missions as the only available missions
2. WHEN the player completes 10 successful Swaps THEN the Mission_System SHALL mark the "First Frequency Shift" mission as complete and award 10 XP
3. WHEN the player collects their first Shard THEN the Mission_System SHALL mark the "Data Collector" mission as complete and award 10 XP
4. WHEN the player collides with an obstacle for the first time THEN the Mission_System SHALL mark the "Signal Loss" mission as complete and award 50 Shards
5. WHEN all three Sound Check missions are completed THEN the Mission_System SHALL display "SYNC COMPLETE" and unlock the Daily Protocols system

### Requirement 2: Daily Protocols Mission System

**User Story:** As a returning player, I want to complete daily missions, so that I can earn rewards and have varied gameplay objectives each day.

#### Acceptance Criteria

1. WHEN a new day begins (00:00 local time) THEN the Mission_System SHALL generate three new daily missions in designated slots
2. WHEN generating Slot 1 (Grind) missions THEN the Mission_System SHALL select from distance or swap-count objectives
3. WHEN generating Slot 2 (Skill) missions THEN the Mission_System SHALL select from near-miss or precision objectives
4. WHEN generating Slot 3 (Mastery) missions THEN the Mission_System SHALL select from challenge objectives requiring sustained performance
5. WHEN a player completes a daily mission THEN the Mission_System SHALL award the specified XP and Shard rewards immediately
6. WHEN the day ends with incomplete missions THEN the Mission_System SHALL reset all mission progress and generate new missions

### Requirement 3: Weekly Marathon Challenge

**User Story:** As a dedicated player, I want to participate in weekly challenges, so that I can earn premium rewards through sustained play.

#### Acceptance Criteria

1. WHEN a new week begins (Monday 00:00 local time) THEN the Mission_System SHALL generate a new Marathon Challenge with a cumulative distance goal
2. WHEN the player accumulates distance across multiple runs THEN the Mission_System SHALL track and display progress toward the weekly goal
3. WHEN the player reaches the Marathon goal THEN the Mission_System SHALL award high XP and a unique cosmetic Trail reward
4. WHEN the week ends with incomplete Marathon progress THEN the Mission_System SHALL reset the challenge and generate a new goal

### Requirement 4: Sync Rate Level System

**User Story:** As a player, I want to gain levels through XP, so that I can track my progression and unlock new content.

#### Acceptance Criteria

1. WHEN the player earns XP THEN the Level_System SHALL add the XP to the player's total and check for level advancement
2. WHEN calculating required XP for a level THEN the Level_System SHALL use the formula: RequiredXP = 100 × (Level ^ 1.5)
3. WHEN the player's total XP exceeds the threshold for the next level THEN the Level_System SHALL increment the Sync Rate and display a level-up notification
4. WHEN displaying player profile THEN the Level_System SHALL show current Sync Rate, current XP, and XP needed for next level

### Requirement 5: Daily Login Rewards

**User Story:** As a player, I want to receive daily login rewards based on my level, so that I am incentivized to maintain my progression.

#### Acceptance Criteria

1. WHEN the player logs in for the first time each day THEN the Reward_System SHALL grant Shards based on current Sync Rate
2. WHEN calculating daily reward for Level 1-9 THEN the Reward_System SHALL grant 100 base Shards plus 10 Shards per level
3. WHEN calculating daily reward for Level 10-49 THEN the Reward_System SHALL grant 200 base Shards plus 8 Shards per level above 10
4. WHEN calculating daily reward for Level 50 and above THEN the Reward_System SHALL grant 600 base Shards plus 5 Shards per level above 50

### Requirement 6: Dual Lock Zone Unlocking

**User Story:** As a player, I want to unlock new frequency zones by meeting both level and currency requirements, so that progression feels earned through both skill and dedication.

#### Acceptance Criteria

1. WHEN displaying a locked zone THEN the Zone_System SHALL show both Level requirement and Shard cost with individual lock status indicators
2. WHEN the player meets neither requirement THEN the Zone_System SHALL display "Signal Too Weak. More experience required." with both indicators locked
3. WHEN the player meets the Shard requirement but not the Level requirement THEN the Zone_System SHALL display "Synchronization Insufficient! (Required Rank: X)" with the purchase button disabled
4. WHEN the player meets the Level requirement but not the Shard requirement THEN the Zone_System SHALL display "Insufficient Data Shards." with the purchase button disabled
5. WHEN the player meets both requirements THEN the Zone_System SHALL enable the "UNLOCK FREQUENCY" button and allow purchase
6. WHEN the player confirms zone unlock THEN the Zone_System SHALL deduct the Shard cost and permanently unlock the zone

### Requirement 7: Mission Progress Tracking

**User Story:** As a player, I want my in-game actions to automatically update mission progress, so that I can focus on gameplay without manual tracking.

#### Acceptance Criteria

1. WHEN the player performs a Swap THEN the Mission_System SHALL increment the SWAP_COUNT progress for relevant active missions
2. WHEN the player travels distance THEN the Mission_System SHALL increment the DISTANCE progress for relevant active missions
3. WHEN the player achieves a Near Miss THEN the Mission_System SHALL increment the NEAR_MISS progress for relevant active missions
4. WHEN the player collects a Shard THEN the Mission_System SHALL increment the COLLECT progress for relevant active missions
5. WHEN the player maintains a single lane THEN the Mission_System SHALL track STAY_LANE duration for relevant active missions
6. WHEN mission progress reaches the goal THEN the Mission_System SHALL mark the mission as complete and trigger reward distribution

### Requirement 8: Mission Data Persistence

**User Story:** As a player, I want my mission progress to be saved, so that I do not lose progress when closing the game.

#### Acceptance Criteria

1. WHEN mission progress changes THEN the Persistence_System SHALL save the updated state to localStorage
2. WHEN the game loads THEN the Persistence_System SHALL restore mission progress from localStorage
3. WHEN loading mission data THEN the Persistence_System SHALL validate timestamps and reset expired missions
4. WHEN localStorage data is corrupted THEN the Persistence_System SHALL reset to default mission state and log the error

