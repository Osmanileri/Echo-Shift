# Design Document: Progression System

## Overview

The Progression System introduces a hybrid advancement model combining XP-based leveling (Sync Rate) with mission-driven gameplay objectives. The system creates multiple engagement loops:

1. **Short-term**: Complete missions during gameplay sessions
2. **Medium-term**: Daily login rewards and daily mission resets
3. **Long-term**: Level progression and zone unlocking

The architecture integrates with existing Echo Shift systems (GameEngine, gameStore, persistence) while introducing new mission tracking and reward distribution mechanisms.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                              │
│                   (Orchestration Layer)                     │
├─────────────────────────────────────────────────────────────┤
│  - Manages mission UI overlays                              │
│  - Handles level-up notifications                           │
│  - Controls zone unlock modals                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GameEngine.tsx                           │
│                  (Event Emitter Layer)                      │
├─────────────────────────────────────────────────────────────┤
│  Emits gameplay events:                                     │
│  - onSwap(count)                                            │
│  - onDistance(meters)                                       │
│  - onNearMiss(count)                                        │
│  - onShardCollect(count)                                    │
│  - onLaneStay(duration)                                     │
│  - onCollision()                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  systems/missionSystem.ts                   │
│                   (Mission Logic Layer)                     │
├─────────────────────────────────────────────────────────────┤
│  - MissionManager: tracks active missions                   │
│  - ProgressTracker: updates mission progress                │
│  - RewardDistributor: grants XP/Shards                      │
│  - MissionGenerator: creates daily/weekly missions          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  systems/levelSystem.ts                     │
│                    (Level Logic Layer)                      │
├─────────────────────────────────────────────────────────────┤
│  - calculateRequiredXP(level): XP threshold                 │
│  - calculateLevelFromXP(totalXP): current level             │
│  - calculateDailyReward(level): shard amount                │
│  - checkLevelUp(oldXP, newXP): level transition             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  systems/zoneUnlockSystem.ts                │
│                   (Zone Unlock Layer)                       │
├─────────────────────────────────────────────────────────────┤
│  - getZoneUnlockStatus(zone, player): lock state            │
│  - canUnlockZone(zone, player): boolean                     │
│  - unlockZone(zone, player): state mutation                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   store/gameStore.ts                        │
│                     (State Layer)                           │
├─────────────────────────────────────────────────────────────┤
│  New state:                                                 │
│  - syncRate: number (level)                                 │
│  - totalXP: number                                          │
│  - missions: MissionState                                   │
│  - unlockedZones: string[]                                  │
│  - lastLoginDate: string                                    │
│  - soundCheckComplete: boolean                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  utils/persistence.ts                       │
│                  (Persistence Layer)                        │
├─────────────────────────────────────────────────────────────┤
│  New keys:                                                  │
│  - echo-shift-missions                                      │
│  - echo-shift-sync-rate                                     │
│  - echo-shift-last-login                                    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Mission Types

```typescript
// types.ts
export type MissionType =
  | 'DISTANCE'      // Total meters traveled
  | 'SWAP_COUNT'    // Number of lane swaps
  | 'NEAR_MISS'     // Near miss count
  | 'COLLECT'       // Shards collected
  | 'STAY_LANE';    // Duration in single lane (ms)

export type MissionSlot = 'GRIND' | 'SKILL' | 'MASTERY';
export type MissionCategory = 'SOUND_CHECK' | 'DAILY' | 'MARATHON';

export interface Mission {
  id: string;
  category: MissionCategory;
  slot?: MissionSlot;
  type: MissionType;
  title: string;
  description: string;
  goal: number;
  progress: number;
  completed: boolean;
  rewards: {
    xp: number;
    shards: number;
    cosmetic?: string;
  };
}

export interface MissionState {
  soundCheck: {
    missions: Mission[];
    completed: boolean;
  };
  daily: {
    missions: Mission[];
    lastResetDate: string;
  };
  marathon: {
    mission: Mission | null;
    lastResetDate: string;
  };
}
```

### Level System Interface

```typescript
// systems/levelSystem.ts
export interface LevelInfo {
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number; // 0-1 percentage
}

export function calculateRequiredXP(level: number): number;
export function calculateLevelFromXP(totalXP: number): number;
export function calculateDailyReward(level: number): number;
export function getLevelInfo(totalXP: number): LevelInfo;
```

### Zone Unlock Interface

```typescript
// systems/zoneUnlockSystem.ts
export type ZoneLockStatus = 
  | 'FULLY_LOCKED'      // Neither requirement met
  | 'LEVEL_LOCKED'      // Has shards, needs level
  | 'SHARD_LOCKED'      // Has level, needs shards
  | 'UNLOCKABLE'        // Both requirements met
  | 'UNLOCKED';         // Already unlocked

export interface ZoneRequirements {
  levelRequired: number;
  shardCost: number;
}

export interface ZoneUnlockState {
  status: ZoneLockStatus;
  message: string;
  canPurchase: boolean;
  levelMet: boolean;
  shardsMet: boolean;
}

export function getZoneUnlockStatus(
  zone: ZoneRequirements,
  playerLevel: number,
  playerShards: number,
  isUnlocked: boolean
): ZoneUnlockState;

export function unlockZone(
  zoneId: string,
  shardCost: number
): { newShards: number; unlockedZones: string[] };
```

### Mission System Interface

```typescript
// systems/missionSystem.ts
export interface MissionEvent {
  type: MissionType;
  value: number;
}

export function updateMissionProgress(
  state: MissionState,
  event: MissionEvent
): MissionState;

export function generateDailyMissions(seed: number): Mission[];
export function generateMarathonChallenge(seed: number): Mission;
export function checkMissionCompletion(mission: Mission): boolean;
export function distributeMissionRewards(mission: Mission): { xp: number; shards: number };
```

## Data Models

### Sound Check Missions (Static)

```typescript
const SOUND_CHECK_MISSIONS: Mission[] = [
  {
    id: 'sound-check-swap',
    category: 'SOUND_CHECK',
    type: 'SWAP_COUNT',
    title: 'First Frequency Shift',
    description: 'Perform 10 successful Swaps',
    goal: 10,
    progress: 0,
    completed: false,
    rewards: { xp: 10, shards: 0 }
  },
  {
    id: 'sound-check-collect',
    category: 'SOUND_CHECK',
    type: 'COLLECT',
    title: 'Data Collector',
    description: 'Collect your first Shard',
    goal: 1,
    progress: 0,
    completed: false,
    rewards: { xp: 10, shards: 0 }
  },
  {
    id: 'sound-check-collision',
    category: 'SOUND_CHECK',
    type: 'COLLISION',
    title: 'Signal Loss',
    description: 'Experience your first collision',
    goal: 1,
    progress: 0,
    completed: false,
    rewards: { xp: 0, shards: 50 }
  }
];
```

### Daily Mission Templates

```typescript
const GRIND_TEMPLATES = [
  { type: 'DISTANCE', title: 'Sub-Bass Runner', goal: 1000, xp: 50, shards: 100 },
  { type: 'SWAP_COUNT', title: 'Frequency Hopper', goal: 50, xp: 40, shards: 80 },
];

const SKILL_TEMPLATES = [
  { type: 'NEAR_MISS', title: 'Edge Walker', goal: 20, xp: 75, shards: 150 },
  { type: 'COLLECT', title: 'Perfect Collector', goal: 30, xp: 60, shards: 120 },
];

const MASTERY_TEMPLATES = [
  { type: 'STAY_LANE', title: 'Mono-Frequency', goal: 30000, xp: 100, shards: 200 },
  { type: 'DISTANCE', title: 'Endurance Run', goal: 2000, xp: 100, shards: 200 },
];
```

### Zone Requirements

```typescript
// data/zones.ts (extended)
export interface ZoneData {
  id: string;
  name: string;
  unlockRequirements: {
    level: number;
    shards: number;
  };
  // ... existing fields
}

const ZONES: ZoneData[] = [
  { id: 'static', name: 'Static Noise', unlockRequirements: { level: 1, shards: 0 } },
  { id: 'bass', name: 'Bass', unlockRequirements: { level: 5, shards: 2000 } },
  { id: 'treble', name: 'Treble', unlockRequirements: { level: 10, shards: 5000 } },
  // ...
];
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: XP Calculation Formula Correctness
*For any* level L where L >= 1, the required XP should equal exactly `Math.floor(100 * Math.pow(L, 1.5))`
**Validates: Requirements 4.2**

### Property 2: Level Calculation from XP
*For any* total XP value, calculating the level and then calculating the required XP for that level should produce a threshold less than or equal to the total XP, and the threshold for level+1 should be greater than total XP
**Validates: Requirements 4.1, 4.3**

### Property 3: Daily Reward Calculation
*For any* level L, the daily reward should follow the tiered formula:
- Level 1-9: 100 + 10*L
- Level 10-49: 200 + 8*(L-10)
- Level 50+: 600 + 5*(L-50)
**Validates: Requirements 5.2, 5.3, 5.4**

### Property 4: Zone Unlock Status Determination
*For any* combination of player level, player shards, zone requirements, and unlock state, the returned status should correctly reflect:
- FULLY_LOCKED when level < required AND shards < required
- LEVEL_LOCKED when level < required AND shards >= required
- SHARD_LOCKED when level >= required AND shards < required
- UNLOCKABLE when level >= required AND shards >= required AND not unlocked
- UNLOCKED when already unlocked
**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

### Property 5: Zone Unlock Transaction Integrity
*For any* zone unlock action where both requirements are met, the player's shard balance should decrease by exactly the zone cost, and the zone should be added to unlocked zones
**Validates: Requirements 6.6**

### Property 6: Mission Progress Tracking
*For any* mission event (SWAP, DISTANCE, NEAR_MISS, COLLECT, STAY_LANE), all active missions of matching type should have their progress incremented by the event value
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 7: Mission Completion Detection
*For any* mission where progress >= goal, the mission should be marked as completed
**Validates: Requirements 7.6**

### Property 8: Daily Mission Slot Constraints
*For any* generated daily mission set, Slot 1 should contain only DISTANCE or SWAP_COUNT types, Slot 2 should contain only NEAR_MISS or COLLECT types, and Slot 3 should contain only STAY_LANE or challenge types
**Validates: Requirements 2.2, 2.3, 2.4**

### Property 9: Mission State Persistence Round-Trip
*For any* valid MissionState, serializing to localStorage and deserializing should produce an equivalent state
**Validates: Requirements 8.1, 8.2**

### Property 10: Sound Check Completion Unlocks Daily
*For any* mission state where all three Sound Check missions are completed, the soundCheckComplete flag should be true, enabling Daily Protocols
**Validates: Requirements 1.5**

### Property 11: Corrupted Data Recovery
*For any* corrupted or invalid localStorage data, loading should return a valid default mission state without throwing errors
**Validates: Requirements 8.4**

## Error Handling

### Invalid State Recovery

```typescript
// Mission state validation
function validateMissionState(data: unknown): MissionState | null {
  if (!data || typeof data !== 'object') return null;
  // Validate structure, return null if invalid
}

// Safe load with fallback
function loadMissionState(): MissionState {
  const saved = safeLoad(STORAGE_KEYS.MISSIONS, null);
  const validated = validateMissionState(saved);
  if (!validated) {
    console.error('Corrupted mission data, resetting to default');
    return getDefaultMissionState();
  }
  return validated;
}
```

### Time-Based Reset Handling

```typescript
// Check if missions need reset
function checkMissionReset(state: MissionState, now: Date): MissionState {
  const today = now.toISOString().split('T')[0];
  const monday = getWeekStart(now).toISOString().split('T')[0];
  
  let newState = { ...state };
  
  // Daily reset
  if (state.daily.lastResetDate !== today) {
    newState.daily = {
      missions: generateDailyMissions(Date.now()),
      lastResetDate: today
    };
  }
  
  // Weekly reset
  if (state.marathon.lastResetDate !== monday) {
    newState.marathon = {
      mission: generateMarathonChallenge(Date.now()),
      lastResetDate: monday
    };
  }
  
  return newState;
}
```

### Edge Cases

- **Negative XP**: Clamp to 0
- **Level overflow**: Cap at MAX_LEVEL (100)
- **Invalid zone ID**: Return FULLY_LOCKED status
- **Concurrent updates**: Use atomic state updates via Zustand

## Testing Strategy

### Property-Based Testing Library
- **fast-check** (already used in project)
- Minimum 100 iterations per property test

### Unit Tests
- Level calculation edge cases (level 1, level 100, boundary XP values)
- Daily reward tier boundaries (level 9→10, level 49→50)
- Zone unlock state transitions
- Mission completion triggers

### Property-Based Tests
Each correctness property will be implemented as a property-based test:

1. **XP Formula Test**: Generate random levels, verify formula
2. **Level from XP Test**: Generate random XP, verify level bounds
3. **Daily Reward Test**: Generate random levels, verify tier formula
4. **Zone Status Test**: Generate random player/zone states, verify status
5. **Zone Unlock Test**: Generate unlock scenarios, verify transaction
6. **Progress Tracking Test**: Generate events and missions, verify updates
7. **Completion Detection Test**: Generate missions with various progress, verify completion
8. **Slot Constraints Test**: Generate daily missions, verify type constraints
9. **Persistence Round-Trip Test**: Generate mission states, verify serialization
10. **Sound Check Completion Test**: Generate completion states, verify unlock
11. **Corrupted Data Test**: Generate invalid data, verify recovery

### Test Annotation Format
```typescript
/**
 * **Feature: progression-system, Property 1: XP Calculation Formula Correctness**
 * **Validates: Requirements 4.2**
 */
```

### Integration Tests
- Full mission flow: event → progress → completion → reward
- Daily reset cycle simulation
- Zone unlock purchase flow
