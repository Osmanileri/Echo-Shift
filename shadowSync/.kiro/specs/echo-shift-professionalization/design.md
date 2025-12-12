# Design Document: Echo Shift Profesyonelleşme

## Overview

Bu tasarım dokümanı, Echo Shift oyununu profesyonel seviyeye taşımak için gerekli mimari kararları, bileşen tasarımlarını ve teknik detayları içerir. Proje 4 ana fazda geliştirilecektir:

1. **Faz 1 - The Juice**: Görsel/işitsel geri bildirim sistemleri
2. **Faz 2 - Ekonomi**: Para birimi, mağaza ve yükseltme sistemleri
3. **Faz 3 - İçerik**: Oyun modları ve seviye sistemi
4. **Faz 4 - Sosyal**: Leaderboard ve ghost racer

## Architecture

### Yüksek Seviye Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    GameStateProvider                      │   │
│  │  (Zustand Store - Global State Management)               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  GameEngine │     │   GameUI    │     │    Shop     │       │
│  │  (Canvas)   │     │  (React)    │     │  (React)    │       │
│  └──────┬──────┘     └─────────────┘     └─────────────┘       │
│         │                                                       │
│  ┌──────┴──────────────────────────────────────────────────┐   │
│  │                    Systems Layer                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Particle │ │  Screen  │ │ Chromatic│ │ Adaptive │   │   │
│  │  │  System  │ │  Shake   │ │Aberration│ │  Music   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │  Theme   │ │  Ghost   │ │ Campaign │ │  Daily   │   │   │
│  │  │  System  │ │  Racer   │ │  System  │ │Challenge │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Persistence Layer                       │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │              localStorage Adapter                 │    │   │
│  │  │  - Echo Shards  - Unlocked Items  - Ghost Data   │    │   │
│  │  │  - Upgrades     - Settings        - Campaign     │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Dosya Yapısı

```
echo-shift/
├── src/
│   ├── store/
│   │   └── gameStore.ts           # Zustand global state
│   ├── systems/
│   │   ├── particleSystem.ts      # Parçacık efektleri
│   │   ├── screenShake.ts         # Ekran titremesi
│   │   ├── chromaticAberration.ts # Renk kayması
│   │   ├── adaptiveMusic.ts       # Dinamik müzik
│   │   ├── themeSystem.ts         # Tema yönetimi
│   │   ├── ghostRacer.ts          # Hayalet yarışçı
│   │   ├── campaignSystem.ts      # Seviye sistemi
│   │   └── dailyChallenge.ts      # Günlük meydan okuma
│   ├── components/
│   │   ├── Shop/
│   │   │   ├── Shop.tsx
│   │   │   ├── ShopItem.tsx
│   │   │   └── CategoryTabs.tsx
│   │   ├── Campaign/
│   │   │   ├── LevelMap.tsx
│   │   │   └── LevelCard.tsx
│   │   ├── Tutorial/
│   │   │   └── TutorialOverlay.tsx
│   │   └── Leaderboard/
│   │       └── Leaderboard.tsx
│   ├── data/
│   │   ├── skins.ts               # Skin tanımları
│   │   ├── effects.ts             # Efekt paketleri
│   │   ├── themes.ts              # Tema tanımları
│   │   ├── upgrades.ts            # Yükseltme tanımları
│   │   └── levels.ts              # Seviye konfigürasyonları
│   └── utils/
│       └── persistence.ts         # localStorage yardımcıları
```

## Components and Interfaces

### 1. Global State Store (Zustand)

```typescript
// store/gameStore.ts
interface GameStore {
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
  
  // Settings
  tutorialCompleted: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  
  // Actions
  purchaseItem: (itemId: string, category: ItemCategory, price: number) => boolean;
  equipItem: (itemId: string, category: ItemCategory) => void;
  completeLevel: (levelId: number, stars: number) => void;
  recordGhostFrame: (frame: GhostFrame) => void;
  resetGhost: () => void;
}
```

### 2. Particle System

```typescript
// systems/particleSystem.ts
interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'trail' | 'burst' | 'spark';
}

interface ParticleConfig {
  count: number;
  speed: { min: number; max: number };
  size: { min: number; max: number };
  life: { min: number; max: number };
  colors: string[];
  spread: number;
  gravity: number;
}

interface ParticleSystem {
  particles: Particle[];
  emit: (x: number, y: number, config: ParticleConfig) => void;
  emitTrail: (x: number, y: number, speed: number) => void;
  emitBurst: (x: number, y: number) => void;
  emitSpark: (x: number, y: number) => void;
  update: (deltaTime: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
}
```

### 3. Screen Shake System

```typescript
// systems/screenShake.ts
interface ShakeConfig {
  intensity: number;    // 0-1 arası
  duration: number;     // ms
  frequency: number;    // Titreşim frekansı
  decay: boolean;       // Zamanla azalma
}

interface ScreenShakeState {
  active: boolean;
  offsetX: number;
  offsetY: number;
  startTime: number;
  config: ShakeConfig;
}

interface ScreenShakeSystem {
  state: ScreenShakeState;
  trigger: (config: ShakeConfig) => void;
  update: (currentTime: number) => void;
  getOffset: () => { x: number; y: number };
  reset: () => void;
}
```

### 4. Theme System

```typescript
// systems/themeSystem.ts
interface Theme {
  id: string;
  name: string;
  price: number;
  colors: {
    topBg: string;
    bottomBg: string;
    topOrb: string;
    bottomOrb: string;
    connector: string;
    accent: string;
    accentSecondary: string;
  };
  effects?: {
    gridLines?: boolean;
    glowEdges?: boolean;
    pixelated?: boolean;
    softGradients?: boolean;
  };
}

interface ThemeSystem {
  currentTheme: Theme;
  applyTheme: (themeId: string) => void;
  getColor: (colorKey: string) => string;
  hasEffect: (effectKey: string) => boolean;
}
```

### 5. Campaign System

```typescript
// systems/campaignSystem.ts
interface LevelConfig {
  id: number;
  name: string;
  description: string;
  targetScore: number;
  starThresholds: [number, number, number]; // 1, 2, 3 yıldız için skorlar
  mechanics: {
    phantom: boolean;
    midline: boolean;
    rhythm: boolean;
  };
  modifiers: {
    speedMultiplier: number;
    spawnRateMultiplier: number;
  };
  rewards: {
    echoShards: number;
    bonusPerStar: number;
  };
}

interface CampaignSystem {
  levels: LevelConfig[];
  getCurrentLevel: () => LevelConfig;
  isLevelUnlocked: (levelId: number) => boolean;
  completeLevel: (levelId: number, score: number) => { stars: number; rewards: number };
  getProgress: () => { completed: number; total: number };
}
```

### 6. Daily Challenge System

```typescript
// systems/dailyChallenge.ts
interface DailyChallengeConfig {
  seed: number;
  date: string;
  modifiers: {
    speedBoost: number;
    phantomOnly: boolean;
    invertedControls: boolean;
    noMidline: boolean;
  };
  bonusMultiplier: number;
}

interface DailyChallengeSystem {
  generateChallenge: (date: Date) => DailyChallengeConfig;
  isCompleted: () => boolean;
  submitScore: (score: number) => number; // Returns Echo Shards earned
  getBestScore: () => number;
}
```

### 7. Ghost Racer System

```typescript
// systems/ghostRacer.ts
interface GhostFrame {
  timestamp: number;
  score: number;
  playerY: number;
  isSwapped: boolean;
}

interface GhostRacerSystem {
  timeline: GhostFrame[];
  isRecording: boolean;
  startRecording: () => void;
  recordFrame: (frame: GhostFrame) => void;
  stopRecording: () => void;
  saveTimeline: () => void;
  loadTimeline: () => GhostFrame[];
  getGhostPosition: (currentTime: number) => GhostFrame | null;
  isPlayerAhead: (currentScore: number, currentTime: number) => boolean;
}
```

### 8. Adaptive Music System

```typescript
// systems/adaptiveMusic.ts
interface MusicLayer {
  id: string;
  audio: HTMLAudioElement;
  volume: number;
  targetVolume: number;
}

interface AdaptiveMusicSystem {
  layers: {
    base: MusicLayer;
    bass: MusicLayer;
    drums: MusicLayer;
  };
  currentTempo: number;
  baseTempo: number;
  
  start: () => void;
  stop: () => void;
  setStreakLevel: (level: number) => void;
  setGameSpeed: (speed: number) => void;
  update: (deltaTime: number) => void;
}
```

## Data Models

### Shop Items

```typescript
// data/skins.ts
interface BallSkin {
  id: string;
  name: string;
  price: number;
  type: 'solid' | 'gradient' | 'pattern' | 'emoji';
  config: {
    topColor?: string;
    bottomColor?: string;
    gradient?: { start: string; end: string };
    pattern?: string;
    emoji?: string;
  };
}

const BALL_SKINS: BallSkin[] = [
  { id: 'default', name: 'Classic', price: 0, type: 'solid', config: { topColor: '#FFFFFF', bottomColor: '#000000' } },
  { id: 'neon-blue', name: 'Neon Blue', price: 100, type: 'gradient', config: { gradient: { start: '#00F0FF', end: '#0066FF' } } },
  { id: 'neon-pink', name: 'Neon Pink', price: 100, type: 'gradient', config: { gradient: { start: '#FF00FF', end: '#FF0066' } } },
  { id: 'fire', name: 'Fire', price: 200, type: 'gradient', config: { gradient: { start: '#FF6600', end: '#FF0000' } } },
  { id: 'ice', name: 'Ice', price: 200, type: 'gradient', config: { gradient: { start: '#00FFFF', end: '#0099FF' } } },
  { id: 'emoji-star', name: 'Star', price: 150, type: 'emoji', config: { emoji: '⭐' } },
  { id: 'emoji-heart', name: 'Heart', price: 150, type: 'emoji', config: { emoji: '❤️' } },
];
```

### Themes

```typescript
// data/themes.ts
const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Classic',
    price: 0,
    colors: {
      topBg: '#000000',
      bottomBg: '#FFFFFF',
      topOrb: '#FFFFFF',
      bottomOrb: '#000000',
      connector: '#888888',
      accent: '#00F0FF',
      accentSecondary: '#FF2A2A',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    price: 500,
    colors: {
      topBg: '#0D0221',
      bottomBg: '#1A0533',
      topOrb: '#00FFFF',
      bottomOrb: '#FF00FF',
      connector: '#FFD700',
      accent: '#00FF00',
      accentSecondary: '#FF0066',
    },
    effects: { gridLines: true, glowEdges: true },
  },
  {
    id: 'retro',
    name: 'Retro 8-bit',
    price: 400,
    colors: {
      topBg: '#2C3E50',
      bottomBg: '#ECF0F1',
      topOrb: '#E74C3C',
      bottomOrb: '#3498DB',
      connector: '#F39C12',
      accent: '#2ECC71',
      accentSecondary: '#9B59B6',
    },
    effects: { pixelated: true },
  },
  {
    id: 'zen',
    name: 'Zen Garden',
    price: 300,
    colors: {
      topBg: '#2D4A3E',
      bottomBg: '#F5F5DC',
      topOrb: '#8FBC8F',
      bottomOrb: '#556B2F',
      connector: '#D2B48C',
      accent: '#98FB98',
      accentSecondary: '#DEB887',
    },
    effects: { softGradients: true },
  },
];
```

### Upgrades

```typescript
// data/upgrades.ts
interface Upgrade {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  effect: (level: number) => number;
}

const UPGRADES: Upgrade[] = [
  {
    id: 'starting-score',
    name: 'Head Start',
    description: 'Start each game with bonus score',
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.5,
    effect: (level) => level * 100, // 100, 200, 300, 400, 500
  },
  {
    id: 'score-multiplier',
    name: 'Echo Amplifier',
    description: 'Permanent score multiplier',
    maxLevel: 3,
    baseCost: 500,
    costMultiplier: 2,
    effect: (level) => 1 + level * 0.1, // 1.1x, 1.2x, 1.3x
  },
  {
    id: 'slow-motion',
    name: 'Time Warp',
    description: 'Slow motion ability per game',
    maxLevel: 3,
    baseCost: 300,
    costMultiplier: 1.5,
    effect: (level) => level, // 1, 2, 3 uses per game
  },
];
```

### Level Configurations

```typescript
// data/levels.ts
const LEVELS: LevelConfig[] = [
  // Tutorial Levels (1-10) - Basic mechanics only
  { id: 1, name: 'First Steps', targetScore: 100, starThresholds: [100, 150, 200], mechanics: { phantom: false, midline: false, rhythm: false }, modifiers: { speedMultiplier: 0.7, spawnRateMultiplier: 0.5 }, rewards: { echoShards: 10, bonusPerStar: 5 } },
  // ... levels 2-10
  
  // Phantom Introduction (11-20)
  { id: 11, name: 'Ghost Protocol', targetScore: 500, starThresholds: [500, 750, 1000], mechanics: { phantom: true, midline: false, rhythm: false }, modifiers: { speedMultiplier: 0.8, spawnRateMultiplier: 0.7 }, rewards: { echoShards: 25, bonusPerStar: 10 } },
  // ... levels 12-20
  
  // Midline Introduction (21-30)
  { id: 21, name: 'Shifting Grounds', targetScore: 1000, starThresholds: [1000, 1500, 2000], mechanics: { phantom: true, midline: true, rhythm: false }, modifiers: { speedMultiplier: 0.9, spawnRateMultiplier: 0.8 }, rewards: { echoShards: 40, bonusPerStar: 15 } },
  // ... continue to level 100
];
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified:

### Property 1: Echo Shards Calculation Accuracy
*For any* final game score, the Echo Shards awarded SHALL equal exactly Math.floor(score * 0.1).
**Validates: Requirements 1.1**

### Property 2: State Persistence Round-Trip
*For any* valid game state object, serializing to JSON and then deserializing SHALL produce an equivalent object with all fields intact.
**Validates: Requirements 1.5, 1.6, 18.4, 18.5**

### Property 3: Purchase Balance Validation
*For any* purchase attempt where player balance is less than item price, the purchase SHALL fail and balance SHALL remain unchanged.
**Validates: Requirements 2.2**

### Property 4: Purchase State Consistency
*For any* successful purchase, the player's balance SHALL decrease by exactly the item price AND the item SHALL be marked as owned.
**Validates: Requirements 2.3**

### Property 5: Theme Color Retrieval Consistency
*For any* equipped theme and color key, the Theme System SHALL return the exact color value defined in that theme's configuration.
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 6: Upgrade Effect Calculation
*For any* upgrade type and level, the effect value SHALL match the upgrade's effect formula applied to that level.
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 7: Level Configuration Loading
*For any* valid level ID (1-100), the Campaign System SHALL return a complete LevelConfig object with all required fields.
**Validates: Requirements 7.2**

### Property 8: Level Progression Unlocking
*For any* completed level N where N < 100, level N+1 SHALL become unlocked.
**Validates: Requirements 7.3**

### Property 9: Daily Challenge Determinism
*For any* date, generating the daily challenge multiple times SHALL produce identical challenge parameters.
**Validates: Requirements 8.1, 8.5**

### Property 10: Screen Shake Offset Bounds
*For any* active screen shake with intensity I, the offset values SHALL remain within the range [-I, I].
**Validates: Requirements 10.3**

### Property 11: Particle Lifecycle Management
*For any* particle system state, no particle SHALL exist with lifetime <= 0, AND all newly created particles SHALL have valid velocity, lifetime, color, and size within configuration bounds.
**Validates: Requirements 12.4, 12.5**

### Property 12: Ghost Timeline Interpolation
*For any* recorded ghost timeline and timestamp T within the timeline range, the interpolated position SHALL be between the positions of the two nearest recorded frames.
**Validates: Requirements 15.2**

### Property 13: Ghost Data Round-Trip
*For any* valid ghost timeline array, serializing to JSON and deserializing SHALL produce an equivalent array with all frames intact.
**Validates: Requirements 15.5, 15.6**

### Property 14: Leaderboard Filtering Correctness
*For any* leaderboard query with Weekly filter, all returned entries SHALL have submission dates within the current week. *For any* All Time query, no entries SHALL be filtered out based on date.
**Validates: Requirements 14.4, 14.5**

### Property 15: Tutorial Progression Consistency
*For any* tutorial step completion, the current step index SHALL increment by exactly 1, AND completing the final step SHALL mark the tutorial as finished.
**Validates: Requirements 17.3, 17.4**

## Error Handling

### Currency System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Negative score input | Clamp to 0, log warning |
| localStorage unavailable | Fall back to in-memory storage, warn user |
| Corrupted stored data | Reset to default values, log error |
| Insufficient balance | Return false, display user-friendly message |

### Shop System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Invalid item ID | Return null, log error |
| Item already owned | Prevent duplicate purchase, show "Already Owned" |
| Price mismatch | Use server-side price validation |
| Equip unowned item | Reject operation, log warning |

### Campaign System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Invalid level ID | Return null, redirect to level select |
| Level not unlocked | Prevent play, show unlock requirements |
| Missing level config | Use fallback default config |
| Save failure | Retry 3 times, then warn user |

### Particle System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Particle pool overflow | Remove oldest particles first |
| Invalid particle config | Use default config values |
| NaN in position/velocity | Remove corrupted particle |

### Ghost System Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Empty timeline | Disable ghost display |
| Corrupted timeline data | Reset ghost, start fresh recording |
| Timeline interpolation out of bounds | Clamp to nearest valid frame |

### General Error Recovery

```typescript
// Error boundary for critical operations
function safeOperation<T>(
  operation: () => T,
  fallback: T,
  errorContext: string
): T {
  try {
    return operation();
  } catch (error) {
    console.error(`[${errorContext}]`, error);
    return fallback;
  }
}

// localStorage wrapper with fallback
function safePersist(key: string, data: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn('localStorage unavailable, using memory storage');
    memoryStorage.set(key, data);
    return false;
  }
}
```

## Testing Strategy

### Dual Testing Approach

This project uses both unit testing and property-based testing to ensure comprehensive coverage:

- **Unit tests** verify specific examples, edge cases, and error conditions
- **Property tests** verify universal properties that should hold across all inputs
- Together they provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness

### Testing Framework

- **Test Runner**: Vitest
- **Property-Based Testing**: fast-check (already in project dependencies)
- **Minimum Iterations**: 100 per property test

### Property-Based Test Requirements

1. Each property-based test MUST be tagged with a comment referencing the correctness property
2. Format: `**Feature: echo-shift-professionalization, Property {number}: {property_text}**`
3. Each correctness property MUST be implemented by a SINGLE property-based test
4. Tests should use smart generators that constrain to valid input spaces

### Test File Structure

```
utils/
├── echoShards.test.ts          # Property 1, 2
├── shopSystem.test.ts          # Property 3, 4
├── themeSystem.test.ts         # Property 5
├── upgradeSystem.test.ts       # Property 6
├── campaignSystem.test.ts      # Property 7, 8
├── dailyChallenge.test.ts      # Property 9
├── screenShake.test.ts         # Property 10
├── particleSystem.test.ts      # Property 11
├── ghostRacer.test.ts          # Property 12, 13
├── leaderboard.test.ts         # Property 14
└── tutorialSystem.test.ts      # Property 15
```

### Example Property Test

```typescript
// utils/echoShards.test.ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateEchoShards } from './echoShards';

describe('Echo Shards System', () => {
  /**
   * **Feature: echo-shift-professionalization, Property 1: Echo Shards Calculation Accuracy**
   * **Validates: Requirements 1.1**
   */
  it('should calculate Echo Shards as 10% of score rounded down', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        (score) => {
          const shards = calculateEchoShards(score);
          const expected = Math.floor(score * 0.1);
          return shards === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage Areas

1. **Edge Cases**
   - Zero score → 0 shards
   - Maximum score handling
   - Empty localStorage
   - Invalid JSON in storage

2. **Integration Points**
   - Shop purchase flow
   - Campaign level transitions
   - Ghost recording and playback

3. **Error Conditions**
   - Network failures (leaderboard)
   - Storage quota exceeded
   - Invalid user input

### Test Execution

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- utils/echoShards.test.ts
```
