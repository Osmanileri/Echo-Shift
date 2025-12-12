# Design Document: Echo Shift Engagement Update (v1.1)

## Overview

Bu tasarım dokümanı, Echo Shift oyununa eklenen "Engagement Update" özelliklerinin teknik detaylarını içerir. Güncelleme 6 ana sistem ekler:

1. **Harmonic Resonance** - Streak bazlı güç modu (Fever)
2. **System Restore** - Ekonomi sink'i olarak revive mekaniği
3. **Daily Rituals** - Günlük görev sistemi
4. **Haptic Feedback** - Dokunsal geri bildirim
5. **Analytics** - Oyuncu davranış takibi
6. **Rate Us Flow** - Mağaza değerlendirme akışı

## Architecture

### Sistem Entegrasyonu

```
┌─────────────────────────────────────────────────────────────────┐
│                    Existing Systems                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  GameEngine  │  │   GameStore  │  │  Persistence │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│  ┌──────┴─────────────────┴─────────────────┴──────────────┐   │
│  │                  New Systems Layer                       │   │
│  │  ┌────────────────┐  ┌────────────────┐                 │   │
│  │  │   Resonance    │  │  SystemRestore │                 │   │
│  │  │    System      │  │    System      │                 │   │
│  │  └────────────────┘  └────────────────┘                 │   │
│  │  ┌────────────────┐  ┌────────────────┐                 │   │
│  │  │  DailyRituals  │  │    Haptics     │                 │   │
│  │  │    System      │  │    System      │                 │   │
│  │  └────────────────┘  └────────────────┘                 │   │
│  │  ┌────────────────┐  ┌────────────────┐                 │   │
│  │  │   Analytics    │  │    RateUs      │                 │   │
│  │  │    System      │  │    System      │                 │   │
│  │  └────────────────┘  └────────────────┘                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Dosya Yapısı

```
echo-shift/
├── systems/
│   ├── resonanceSystem.ts      # Harmonic Resonance (Fever)
│   ├── restoreSystem.ts        # System Restore (Revive)
│   ├── dailyRituals.ts         # Daily Rituals
│   ├── hapticSystem.ts         # Haptic Feedback
│   ├── analyticsSystem.ts      # Analytics Events
│   └── rateUsSystem.ts         # Rate Us Flow
├── components/
│   ├── Resonance/
│   │   └── ResonanceOverlay.tsx
│   ├── Restore/
│   │   └── RestorePrompt.tsx
│   └── Rituals/
│       └── RitualsPanel.tsx
└── data/
    └── rituals.ts              # Ritual definitions
```

## Components and Interfaces

### 1. Resonance System (Harmonic Resonance)

```typescript
// systems/resonanceSystem.ts
interface ResonanceState {
  isActive: boolean;
  remainingTime: number;      // ms
  obstaclesDestroyed: number;
  bonusScore: number;
}

interface ResonanceConfig {
  activationThreshold: number;  // streak count to activate (10)
  duration: number;             // ms (10000)
  bonusPerObstacle: number;     // points (50)
  transitionDuration: number;   // ms (500)
}

interface ResonanceSystem {
  state: ResonanceState;
  config: ResonanceConfig;
  
  checkActivation: (streakCount: number) => boolean;
  activate: () => void;
  deactivate: () => void;
  update: (deltaTime: number) => void;
  handleCollision: () => { destroyed: boolean; bonus: number };
  getColorInversion: () => { factor: number };  // 0-1 for transition
  reset: () => void;
}

// Color inversion utility
function invertColor(color: string): string {
  // Parse hex color and invert RGB values
  const hex = color.replace('#', '');
  const r = 255 - parseInt(hex.substr(0, 2), 16);
  const g = 255 - parseInt(hex.substr(2, 2), 16);
  const b = 255 - parseInt(hex.substr(4, 2), 16);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
```

### 2. System Restore (Revive)

```typescript
// systems/restoreSystem.ts
interface GameSnapshot {
  timestamp: number;
  score: number;
  playerY: number;
  isSwapped: boolean;
  obstacles: ObstacleSnapshot[];
  speed: number;
}

interface ObstacleSnapshot {
  id: string;
  x: number;
  y: number;
  type: string;
}

interface RestoreState {
  isAvailable: boolean;       // Can restore this run
  hasBeenUsed: boolean;       // Already used this run
  snapshots: GameSnapshot[];  // Rolling buffer of last 3 seconds
  cost: number;               // 100 Echo Shards
}

interface RestoreSystem {
  state: RestoreState;
  
  recordSnapshot: (gameState: GameState) => void;
  canRestore: (balance: number) => boolean;
  executeRestore: () => GameSnapshot | null;
  markUsed: () => void;
  reset: () => void;
  
  // Serialization
  serialize: () => string;
  deserialize: (data: string) => RestoreState;
}

const RESTORE_CONFIG = {
  cost: 100,
  rewindSeconds: 3,
  safeZoneRadius: 100,  // pixels
  maxSnapshots: 180,    // 3 seconds at 60fps
};
```

### 3. Daily Rituals System

```typescript
// systems/dailyRituals.ts
type RitualType = 
  | 'NEAR_MISS'      // X near misses in one game
  | 'PHANTOM_PASS'   // Pass X phantom obstacles
  | 'CUMULATIVE'     // Reach X total score today
  | 'SPEED_SURVIVAL' // Survive X seconds at Y+ speed
  | 'STREAK'         // Reach X streak
  | 'NO_SWAP';       // Survive X seconds without swapping

interface RitualDefinition {
  id: string;
  type: RitualType;
  name: string;
  description: string;
  target: number;
  reward: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface RitualProgress {
  ritualId: string;
  current: number;
  target: number;
  completed: boolean;
  completedAt?: number;
}

interface DailyRitualsState {
  date: string;                    // YYYY-MM-DD
  rituals: RitualProgress[];
  allCompleted: boolean;
  bonusClaimed: boolean;
}

interface DailyRitualsSystem {
  state: DailyRitualsState;
  
  generateRituals: (date: Date) => RitualDefinition[];
  updateProgress: (type: RitualType, value: number) => void;
  completeRitual: (ritualId: string) => number;  // Returns reward
  claimBonus: () => number;
  checkDayChange: () => boolean;
  reset: () => void;
  
  // Serialization
  serialize: () => string;
  deserialize: (data: string) => DailyRitualsState;
}

// Seeded random for deterministic ritual generation
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function dateToSeed(date: Date): number {
  const dateStr = date.toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
```

### 4. Haptic Feedback System

```typescript
// systems/hapticSystem.ts
type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success';

interface HapticConfig {
  light: number;      // 10ms
  medium: number;     // 25ms
  heavy: number;      // 50ms
  selection: number;  // 5ms
  success: number[];  // [10, 50, 10] pattern
}

interface HapticSystem {
  isEnabled: boolean;
  isSupported: boolean;
  
  trigger: (type: HapticType) => void;
  setEnabled: (enabled: boolean) => void;
  checkSupport: () => boolean;
}

// Implementation using Vibration API
function createHapticSystem(): HapticSystem {
  const isSupported = 'vibrate' in navigator;
  
  return {
    isEnabled: true,
    isSupported,
    
    trigger(type: HapticType) {
      if (!this.isEnabled || !this.isSupported) return;
      
      const patterns: Record<HapticType, number | number[]> = {
        light: 10,
        medium: 25,
        heavy: 50,
        selection: 5,
        success: [10, 50, 10],
      };
      
      navigator.vibrate(patterns[type]);
    },
    
    setEnabled(enabled: boolean) {
      this.isEnabled = enabled;
    },
    
    checkSupport() {
      return this.isSupported;
    },
  };
}
```

### 5. Analytics System

```typescript
// systems/analyticsSystem.ts
type AnalyticsEventType = 
  | 'level_fail'
  | 'level_complete'
  | 'purchase'
  | 'restore_used'
  | 'ritual_complete'
  | 'session_quit';

interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

interface LevelFailData {
  level_id: number;
  score_at_death: number;
  time_played: number;
}

interface LevelCompleteData {
  level_id: number;
  final_score: number;
  stars_earned: number;
  time_played: number;
}

interface PurchaseData {
  item_id: string;
  item_category: string;
  price: number;
}

interface RestoreData {
  score_at_death: number;
  restore_success: boolean;
}

interface RitualCompleteData {
  ritual_id: string;
  completion_time: number;
}

interface SessionQuitData {
  current_score: number;
  level_id: number;
  session_duration: number;
}

interface AnalyticsSystem {
  events: AnalyticsEvent[];
  
  logEvent: (type: AnalyticsEventType, data: Record<string, unknown>) => void;
  flush: () => void;  // Persist to localStorage
  getEvents: () => AnalyticsEvent[];
  clear: () => void;
}

const ANALYTICS_STORAGE_KEY = 'echo_shift_analytics';
const MAX_EVENTS = 1000;
```

### 6. Rate Us System

```typescript
// systems/rateUsSystem.ts
interface RateUsState {
  positiveCount: number;
  lastPromptDate: string | null;
  hasRated: boolean;
  hasDismissed: boolean;
  dismissedAt: number | null;
}

interface RateUsConfig {
  triggerThreshold: number;    // 3 positive moments
  cooldownDays: number;        // 7 days after dismiss
}

interface RateUsSystem {
  state: RateUsState;
  config: RateUsConfig;
  
  recordPositiveMoment: () => void;
  shouldShowPrompt: () => boolean;
  markRated: () => void;
  markDismissed: () => void;
  reset: () => void;
  
  // Serialization
  serialize: () => string;
  deserialize: (data: string) => RateUsState;
}

function shouldShowPrompt(state: RateUsState, config: RateUsConfig): boolean {
  // Never show if already rated
  if (state.hasRated) return false;
  
  // Check cooldown if dismissed
  if (state.hasDismissed && state.dismissedAt) {
    const daysSinceDismiss = (Date.now() - state.dismissedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceDismiss < config.cooldownDays) return false;
  }
  
  // Show if threshold reached
  return state.positiveCount >= config.triggerThreshold;
}
```

## Data Models

### Ritual Definitions

```typescript
// data/rituals.ts
const RITUAL_POOL: RitualDefinition[] = [
  // Easy rituals
  { id: 'near_miss_5', type: 'NEAR_MISS', name: 'Precision Master', description: 'Get 5 near misses in one game', target: 5, reward: 25, difficulty: 'easy' },
  { id: 'streak_5', type: 'STREAK', name: 'Rhythm Starter', description: 'Reach a 5x streak', target: 5, reward: 20, difficulty: 'easy' },
  { id: 'cumulative_5000', type: 'CUMULATIVE', name: 'Daily Grind', description: 'Score 5,000 total points today', target: 5000, reward: 30, difficulty: 'easy' },
  
  // Medium rituals
  { id: 'phantom_20', type: 'PHANTOM_PASS', name: 'Ghost Hunter', description: 'Pass 20 phantom obstacles', target: 20, reward: 50, difficulty: 'medium' },
  { id: 'near_miss_10', type: 'NEAR_MISS', name: 'Edge Walker', description: 'Get 10 near misses in one game', target: 10, reward: 60, difficulty: 'medium' },
  { id: 'cumulative_25000', type: 'CUMULATIVE', name: 'Marathon', description: 'Score 25,000 total points today', target: 25000, reward: 75, difficulty: 'medium' },
  
  // Hard rituals
  { id: 'speed_survival', type: 'SPEED_SURVIVAL', name: 'Survivor', description: 'Survive 10 seconds at 100+ km/h', target: 10, reward: 100, difficulty: 'hard' },
  { id: 'streak_15', type: 'STREAK', name: 'Rhythm Master', description: 'Reach a 15x streak', target: 15, reward: 100, difficulty: 'hard' },
  { id: 'no_swap_30', type: 'NO_SWAP', name: 'Steady Hands', description: 'Survive 30 seconds without swapping', target: 30, reward: 80, difficulty: 'hard' },
  { id: 'cumulative_50000', type: 'CUMULATIVE', name: 'Endurance', description: 'Score 50,000 total points today', target: 50000, reward: 150, difficulty: 'hard' },
];

const BONUS_REWARD = 100; // Bonus for completing all 3 rituals
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified:

### Property 1: Resonance Activation Threshold
*For any* streak count value, Harmonic Resonance SHALL activate if and only if the streak count is >= 10.
**Validates: Requirements 1.1**

### Property 2: Color Inversion Correctness
*For any* valid hex color string, the invertColor function SHALL return a color where each RGB component is (255 - original).
**Validates: Requirements 1.2**

### Property 3: Resonance Collision Behavior
*For any* collision during active Harmonic Resonance, the obstacle SHALL be destroyed AND 50 bonus points SHALL be awarded AND the game SHALL NOT end.
**Validates: Requirements 1.4, 1.5**

### Property 4: Resonance Timer Expiration
*For any* active Harmonic Resonance state, when the remaining time reaches 0, the resonance SHALL deactivate.
**Validates: Requirements 1.8**

### Property 5: Restore Balance and Availability
*For any* restore attempt, the restore SHALL succeed if and only if (balance >= 100 AND hasBeenUsed == false). After success, balance SHALL decrease by exactly 100 AND hasBeenUsed SHALL become true.
**Validates: Requirements 2.3, 2.8, 2.9**

### Property 6: Restore State Rewind
*For any* successful restore execution, the game state timestamp SHALL be exactly 3 seconds before the collision AND no obstacles SHALL exist within the safe zone radius.
**Validates: Requirements 2.5, 2.6**

### Property 7: Restore State Round-Trip
*For any* valid RestoreState object, serializing to JSON and deserializing SHALL produce an equivalent object.
**Validates: Requirements 2.11, 2.12**

### Property 8: Daily Ritual Generation Count
*For any* date, the generateRituals function SHALL return exactly 3 ritual definitions.
**Validates: Requirements 3.1**

### Property 9: Daily Ritual Determinism
*For any* date, calling generateRituals multiple times SHALL produce identical ritual sets. Different dates SHALL produce different ritual sets (with high probability).
**Validates: Requirements 3.2, 3.11**

### Property 10: Ritual Completion Rewards
*For any* completed ritual, the reward SHALL equal the ritual's defined reward value. When all 3 rituals are completed, the bonus reward SHALL be awarded exactly once.
**Validates: Requirements 3.3, 3.4**

### Property 11: Ritual Progress Tracking
*For any* ritual type and progress update, the current progress SHALL increase by the update value, capped at the target value.
**Validates: Requirements 3.7, 3.8, 3.9, 3.10**

### Property 12: Ritual Data Round-Trip
*For any* valid DailyRitualsState object, serializing to JSON and deserializing SHALL produce an equivalent object.
**Validates: Requirements 3.12, 3.13**

### Property 13: Haptic Settings Respect
*For any* haptic trigger call, when isEnabled is false, no vibration SHALL occur.
**Validates: Requirements 4.6**

### Property 14: Analytics Event Completeness
*For any* analytics event of a specific type, the event data SHALL contain all required fields for that event type.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

### Property 15: Analytics Batch Persistence
*For any* sequence of logged events, after flush() is called, all events SHALL be persisted to localStorage.
**Validates: Requirements 5.7**

### Property 16: Rate Prompt Trigger
*For any* positive moment (high score or 3-star completion), the positive counter SHALL increment by 1. When counter >= 3 AND hasRated == false AND not in cooldown, shouldShowPrompt SHALL return true.
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 17: Rate Prompt Suppression
*For any* rate prompt state, if hasRated == true, shouldShowPrompt SHALL return false. If dismissed within 7 days, shouldShowPrompt SHALL return false.
**Validates: Requirements 6.6, 6.7**

### Property 18: Rate State Round-Trip
*For any* valid RateUsState object, serializing to JSON and deserializing SHALL produce an equivalent object.
**Validates: Requirements 6.8**

## Error Handling

### Resonance System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Invalid streak count (negative) | Clamp to 0, log warning |
| Timer overflow | Cap at duration, prevent negative |
| Color parse failure | Return original color, log error |

### Restore System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| No snapshots available | Return null, show "Cannot Restore" |
| Insufficient balance | Disable restore button, show message |
| Corrupted snapshot data | Skip invalid snapshots, use oldest valid |
| localStorage full | Clear old snapshots, warn user |

### Daily Rituals Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Invalid date seed | Use fallback seed (0) |
| Corrupted progress data | Reset to fresh state |
| Ritual pool empty | Use default ritual set |
| Progress overflow | Cap at target value |

### Haptic System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Vibration API unavailable | Set isSupported = false, skip silently |
| Invalid pattern | Use default light pattern |
| Permission denied | Disable haptics, notify user |

### Analytics System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| localStorage quota exceeded | Remove oldest events, retry |
| Invalid event data | Log error, skip event |
| JSON parse failure | Clear corrupted data, start fresh |

### Rate Us System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| App store URL unavailable | Show fallback feedback form |
| State corruption | Reset to initial state |
| Date parse failure | Use current date |

## Testing Strategy

### Dual Testing Approach

This project uses both unit testing and property-based testing:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs

### Testing Framework

- **Test Runner**: Vitest
- **Property-Based Testing**: fast-check
- **Minimum Iterations**: 100 per property test

### Property-Based Test Requirements

1. Each property-based test MUST be tagged with a comment referencing the correctness property
2. Format: `**Feature: echo-shift-engagement, Property {number}: {property_text}**`
3. Each correctness property MUST be implemented by a SINGLE property-based test

### Test File Structure

```
systems/
├── resonanceSystem.test.ts     # Properties 1, 2, 3, 4
├── restoreSystem.test.ts       # Properties 5, 6, 7
├── dailyRituals.test.ts        # Properties 8, 9, 10, 11, 12
├── hapticSystem.test.ts        # Property 13
├── analyticsSystem.test.ts     # Properties 14, 15
└── rateUsSystem.test.ts        # Properties 16, 17, 18
```

### Example Property Test

```typescript
// systems/resonanceSystem.test.ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { checkActivation, invertColor } from './resonanceSystem';

describe('Resonance System', () => {
  /**
   * **Feature: echo-shift-engagement, Property 1: Resonance Activation Threshold**
   * **Validates: Requirements 1.1**
   */
  it('should activate resonance if and only if streak >= 10', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (streakCount) => {
          const shouldActivate = checkActivation(streakCount);
          const expected = streakCount >= 10;
          return shouldActivate === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-engagement, Property 2: Color Inversion Correctness**
   * **Validates: Requirements 1.2**
   */
  it('should correctly invert any hex color', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        (r, g, b) => {
          const original = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
          const inverted = invertColor(original);
          const expectedR = 255 - r;
          const expectedG = 255 - g;
          const expectedB = 255 - b;
          const expected = `#${expectedR.toString(16).padStart(2, '0')}${expectedG.toString(16).padStart(2, '0')}${expectedB.toString(16).padStart(2, '0')}`;
          return inverted.toLowerCase() === expected.toLowerCase();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage Areas

1. **Edge Cases**
   - Streak exactly at 10 (boundary)
   - Zero balance restore attempt
   - Empty ritual pool
   - Day change at midnight

2. **Integration Points**
   - Resonance + Collision system
   - Restore + Game state
   - Rituals + Score tracking

3. **Error Conditions**
   - Invalid color formats
   - Corrupted localStorage data
   - Missing haptic support
