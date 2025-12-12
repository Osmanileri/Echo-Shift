# Design Document: Procedural Gameplay System

## Overview

Bu tasarım dokümanı, Echo Shift oyununda rastgele (random) engel ve hız sisteminden algoritmik tasarıma (procedural generation) geçişi detaylandırır. Üç ana sistem içerir:

1. **Flow Curve System**: Logaritmik hız eğrisi ile profesyonel arcade hissiyatı
2. **Pattern-Based Spawning**: Desen bazlı engel sistemi ile adil ve öğrenilebilir zorluk
3. **Strategic Shard Placement**: Risk/ödül dengeli elmas yerleşimi

Bu sistemler mevcut GameEngine'e entegre edilecek ve Object Pooling ile performans optimize edilecektir.

## Architecture

### Yüksek Seviye Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│                       GameEngine.tsx                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Procedural Systems                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │  FlowCurve   │  │   Pattern    │  │   Shard      │   │   │
│  │  │   System     │  │   Manager    │  │  Placement   │   │   │
│  │  │              │  │              │  │              │   │   │
│  │  │ - calcSpeed  │  │ - patterns[] │  │ - safe/risky │   │   │
│  │  │ - phases     │  │ - select()   │  │ - spawn()    │   │   │
│  │  │ - cap        │  │ - spawn()    │  │ - collect()  │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  │                           │                              │   │
│  │  ┌────────────────────────┴────────────────────────┐    │   │
│  │  │              Difficulty Progression              │    │   │
│  │  │  - Pattern unlock thresholds                     │    │   │
│  │  │  - Weight distribution by score                  │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Object Pool Layer                      │   │
│  │  ┌──────────────────┐    ┌──────────────────┐            │   │
│  │  │  Obstacle Pool   │    │   Shard Pool     │            │   │
│  │  │  - available[]   │    │  - available[]   │            │   │
│  │  │  - acquire()     │    │  - acquire()     │            │   │
│  │  │  - release()     │    │  - release()     │            │   │
│  │  └──────────────────┘    └──────────────────┘            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Dosya Yapısı

```
systems/
├── flowCurve.ts           # Logaritmik hız hesaplama
├── patternManager.ts      # Desen yönetimi ve spawn
├── shardPlacement.ts      # Akıllı elmas yerleşimi
├── difficultyProgression.ts # Zorluk progresyonu
└── objectPool.ts          # Performans için nesne havuzu

data/
└── patterns.ts            # Desen konfigürasyonları
```

## Components and Interfaces

### 1. Flow Curve System

```typescript
// systems/flowCurve.ts

interface FlowCurveConfig {
  minSpeed: number;      // 3.0 - Başlangıç hızı (30km/h)
  maxSpeed: number;      // 14 - İnsan refleks sınırı (140km/h)
  scaleFactor: number;   // 2.5 - Logaritmik ölçek faktörü (yavaş artış)
  scoreBase: number;     // 500 - Skor böleni (daha yavaş ölçekleme)
}

interface FlowCurveState {
  currentSpeed: number;
  phase: 'warmup' | 'groove' | 'plateau';
}

// Hız hesaplama fonksiyonu
function calculateGameSpeed(score: number, config: FlowCurveConfig): number;

// Faz belirleme
function determinePhase(score: number): 'warmup' | 'groove' | 'plateau';

// Varsayılan konfigürasyon
const DEFAULT_FLOW_CURVE_CONFIG: FlowCurveConfig = {
  minSpeed: 3.0,
  maxSpeed: 14,
  scaleFactor: 2.5,
  scoreBase: 500
};
```

### 2. Pattern Manager

```typescript
// systems/patternManager.ts

type Lane = 'TOP' | 'BOTTOM';

interface PatternObstacle {
  lane: Lane;
  timeOffset: number;    // ms - Pattern başlangıcına göre
  heightRatio?: number;  // 0-1 arası, varsayılan 0.5
}

interface PatternShard {
  lane: Lane;
  timeOffset: number;
  type: 'safe' | 'risky';
  positionOffset?: number; // Engele göre offset (risky için)
}

interface Pattern {
  id: string;
  name: string;
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert';
  duration: number;      // ms - Pattern toplam süresi
  obstacles: PatternObstacle[];
  shards: PatternShard[];
}

interface PatternManagerState {
  currentPattern: Pattern | null;
  patternStartTime: number;
  obstacleIndex: number;
  shardIndex: number;
}

// Pattern seçimi
function selectPattern(score: number, availablePatterns: Pattern[]): Pattern;

// Pattern spawn kontrolü
function updatePatternSpawn(
  state: PatternManagerState,
  currentTime: number,
  spawnObstacle: (lane: Lane, heightRatio: number) => void,
  spawnShard: (lane: Lane, type: 'safe' | 'risky') => void
): PatternManagerState;

// Pattern tamamlanma kontrolü
function isPatternComplete(state: PatternManagerState, currentTime: number): boolean;
```

### 3. Pattern Library

```typescript
// data/patterns.ts

const PATTERNS: Pattern[] = [
  // Basic Patterns (score < 1000)
  {
    id: 'gate',
    name: 'The Gate',
    difficulty: 'basic',
    duration: 1500,
    obstacles: [
      { lane: 'TOP', timeOffset: 0 },
      { lane: 'BOTTOM', timeOffset: 0 }
    ],
    shards: [
      { lane: 'TOP', timeOffset: 750, type: 'safe' }
    ]
  },
  {
    id: 'breather',
    name: 'Breather',
    difficulty: 'basic',
    duration: 2000,
    obstacles: [
      { lane: 'TOP', timeOffset: 0 }
    ],
    shards: [
      { lane: 'BOTTOM', timeOffset: 500, type: 'safe' },
      { lane: 'TOP', timeOffset: 1000, type: 'safe' }
    ]
  },
  
  // Intermediate Patterns (score >= 1000)
  {
    id: 'zigzag',
    name: 'Zig-Zag',
    difficulty: 'intermediate',
    duration: 2000,
    obstacles: [
      { lane: 'TOP', timeOffset: 0 },
      { lane: 'BOTTOM', timeOffset: 500 },
      { lane: 'TOP', timeOffset: 1000 },
      { lane: 'BOTTOM', timeOffset: 1500 }
    ],
    shards: [
      { lane: 'BOTTOM', timeOffset: 250, type: 'risky' },
      { lane: 'TOP', timeOffset: 750, type: 'risky' }
    ]
  },
  
  // Advanced Patterns (score >= 2500)
  {
    id: 'tunnel',
    name: 'The Tunnel',
    difficulty: 'advanced',
    duration: 2500,
    obstacles: [
      { lane: 'TOP', timeOffset: 0 },
      { lane: 'TOP', timeOffset: 500 },
      { lane: 'TOP', timeOffset: 1000 },
      { lane: 'TOP', timeOffset: 1500 }
    ],
    shards: [
      { lane: 'BOTTOM', timeOffset: 250, type: 'safe' },
      { lane: 'BOTTOM', timeOffset: 1250, type: 'safe' }
    ]
  },
  
  // Expert Patterns (score >= 5000)
  {
    id: 'gauntlet',
    name: 'The Gauntlet',
    difficulty: 'expert',
    duration: 2000,
    obstacles: [
      { lane: 'TOP', timeOffset: 0 },
      { lane: 'BOTTOM', timeOffset: 300 },
      { lane: 'TOP', timeOffset: 600 },
      { lane: 'BOTTOM', timeOffset: 900 },
      { lane: 'TOP', timeOffset: 1200 },
      { lane: 'BOTTOM', timeOffset: 1500 }
    ],
    shards: [
      { lane: 'BOTTOM', timeOffset: 150, type: 'risky' },
      { lane: 'TOP', timeOffset: 450, type: 'risky' },
      { lane: 'BOTTOM', timeOffset: 1050, type: 'risky' }
    ]
  }
];
```

### 4. Spawn Interval Calculator

```typescript
// systems/patternManager.ts (devamı)

interface SpawnConfig {
  baseReactionTime: number;  // 1200ms
  minInterval: number;       // 400ms
}

// Spawn aralığı hesaplama
function calculateSpawnInterval(currentSpeed: number, config: SpawnConfig): number;

const DEFAULT_SPAWN_CONFIG: SpawnConfig = {
  baseReactionTime: 1200,
  minInterval: 400
};
```

### 5. Shard Placement System

```typescript
// systems/shardPlacement.ts

interface ShardConfig {
  safeGapRatio: number;      // 0.5 - Gap ortasına yerleşim
  riskyEdgeDistance: number; // 20px - Engel kenarına mesafe
  nearMissBonus: number;     // 5 - Near miss bonus çarpanı
  baseShardValue: number;    // 1 - Temel shard değeri
}

// Dinamik hareket parametreleri
interface ShardMovement {
  verticalAmplitude: number;   // Dikey hareket genliği (piksel)
  verticalFrequency: number;   // Dikey hareket frekansı (rad/s)
  verticalPhase: number;       // Başlangıç fazı (radyan)
  horizontalAmplitude: number; // Yatay hareket genliği (piksel)
  horizontalFrequency: number; // Yatay hareket frekansı (rad/s)
  horizontalPhase: number;     // Başlangıç fazı (radyan)
}

interface PlacedShard {
  id: string;
  x: number;
  y: number;
  baseX: number;      // Orijinal X pozisyonu (hareket merkezi)
  baseY: number;      // Orijinal Y pozisyonu (hareket merkezi)
  lane: Lane;
  type: 'safe' | 'risky';
  value: number;
  collected: boolean;
  movement: ShardMovement;  // Dinamik hareket parametreleri
  spawnTime: number;        // Spawn zamanı (hareket hesaplaması için)
}

// Hareket konfigürasyonu - tip bazlı
const SHARD_MOVEMENT_CONFIG = {
  safe: {
    verticalAmplitude: { min: 15, max: 25 },    // Yumuşak dikey hareket
    verticalFrequency: { min: 1.5, max: 2.5 },  // Yavaş salınım
    horizontalAmplitude: { min: 10, max: 20 },  // Hafif yatay hareket
    horizontalFrequency: { min: 1.0, max: 2.0 },
  },
  risky: {
    verticalAmplitude: { min: 25, max: 40 },    // Agresif dikey hareket
    verticalFrequency: { min: 2.5, max: 4.0 },  // Hızlı salınım
    horizontalAmplitude: { min: 20, max: 35 },  // Belirgin yatay hareket
    horizontalFrequency: { min: 2.0, max: 3.5 },
  }
};

// Safe shard pozisyonu hesaplama
function calculateSafeShardPosition(
  gapStart: number,
  gapEnd: number,
  lane: Lane,
  canvasHeight: number
): { x: number; y: number };

// Risky shard pozisyonu hesaplama
function calculateRiskyShardPosition(
  obstacleX: number,
  obstacleY: number,
  obstacleHeight: number,
  lane: Lane,
  config: ShardConfig
): { x: number; y: number };

// Shard toplama ve bonus hesaplama
function collectShard(
  shard: PlacedShard,
  isNearMiss: boolean,
  config: ShardConfig
): number;
```

### 6. Object Pool System

```typescript
// systems/objectPool.ts

interface PooledObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lane: Lane;
  polarity: 'white' | 'black';
  active: boolean;
}

interface PooledShard {
  id: string;
  x: number;
  y: number;
  type: 'safe' | 'risky';
  value: number;
  active: boolean;
}

interface ObjectPool<T> {
  items: T[];
  activeCount: number;
  
  acquire(): T;
  release(item: T): void;
  reset(): void;
  getActive(): T[];
}

// Pool oluşturma
function createObstaclePool(initialSize: number): ObjectPool<PooledObstacle>;
function createShardPool(initialSize: number): ObjectPool<PooledShard>;
```

### 7. Difficulty Progression System

```typescript
// systems/difficultyProgression.ts

interface DifficultyThreshold {
  score: number;
  unlockedDifficulties: ('basic' | 'intermediate' | 'advanced' | 'expert')[];
  weights: Record<string, number>;
}

const DIFFICULTY_THRESHOLDS: DifficultyThreshold[] = [
  {
    score: 0,
    unlockedDifficulties: ['basic'],
    weights: { basic: 1.0 }
  },
  {
    score: 1000,
    unlockedDifficulties: ['basic', 'intermediate'],
    weights: { basic: 0.6, intermediate: 0.4 }
  },
  {
    score: 2500,
    unlockedDifficulties: ['basic', 'intermediate', 'advanced'],
    weights: { basic: 0.3, intermediate: 0.4, advanced: 0.3 }
  },
  {
    score: 5000,
    unlockedDifficulties: ['basic', 'intermediate', 'advanced', 'expert'],
    weights: { basic: 0.1, intermediate: 0.3, advanced: 0.3, expert: 0.3 }
  }
];

// Mevcut zorluk seviyesini al
function getCurrentDifficultyThreshold(score: number): DifficultyThreshold;

// Ağırlıklı pattern seçimi
function selectPatternByWeight(
  patterns: Pattern[],
  threshold: DifficultyThreshold
): Pattern;

// Pattern'in mevcut skorda kullanılabilir olup olmadığını kontrol et
function isPatternAvailable(pattern: Pattern, score: number): boolean;
```

## Data Models

### Pattern Configuration

```typescript
// Tam pattern konfigürasyonu örneği
const ZIGZAG_PATTERN: Pattern = {
  id: 'zigzag',
  name: 'Zig-Zag',
  difficulty: 'intermediate',
  duration: 2000,
  obstacles: [
    { lane: 'TOP', timeOffset: 0 },
    { lane: 'BOTTOM', timeOffset: 500 },
    { lane: 'TOP', timeOffset: 1000 },
    { lane: 'BOTTOM', timeOffset: 1500 }
  ],
  shards: [
    { lane: 'BOTTOM', timeOffset: 250, type: 'risky' },
    { lane: 'TOP', timeOffset: 750, type: 'risky' }
  ]
};
```

### Game State Extensions

```typescript
// GameEngine'e eklenecek state
interface ProceduralGameState {
  flowCurve: FlowCurveState;
  patternManager: PatternManagerState;
  obstaclePool: ObjectPool<PooledObstacle>;
  shardPool: ObjectPool<PooledShard>;
  activeShards: PlacedShard[];
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified:

### Property 1: Speed Formula Correctness
*For any* score value >= 0, the calculated speed SHALL equal MIN_SPEED + log10(score/100 + 1) * scaleFactor, where the result is a valid number (not NaN or Infinity).
**Validates: Requirements 1.2**

### Property 2: Speed Cap Enforcement
*For any* score value, the calculated speed SHALL never exceed MAX_SPEED (22 units).
**Validates: Requirements 1.3**

### Property 3: Pattern Obstacle Completeness
*For any* pattern that is spawned, the number of obstacles spawned SHALL equal the number of obstacles defined in that pattern's obstacle array.
**Validates: Requirements 2.2**

### Property 4: Pattern Lane Correctness
*For any* obstacle spawned from a pattern, the obstacle's lane SHALL match the lane specified in the pattern's obstacle definition.
**Validates: Requirements 2.4**

### Property 5: Pattern Serialization Round-Trip
*For any* valid Pattern object, serializing to JSON and then deserializing SHALL produce an equivalent Pattern object with all fields intact.
**Validates: Requirements 2.6, 2.7**

### Property 6: Spawn Interval Formula Correctness
*For any* speed value > 0, the spawn interval SHALL equal REACTION_TIME / (speed / 10), and SHALL never be less than MIN_INTERVAL (400ms).
**Validates: Requirements 4.1, 4.4**

### Property 7: Shard Position Validity
*For any* shard spawned from a pattern, the shard's position SHALL be within the playable area and SHALL match the lane specified in the pattern.
**Validates: Requirements 5.1**

### Property 8: Shard Collection Value
*For any* shard that is collected, the awarded value SHALL equal the shard's base value, plus bonus if collected via Near Miss.
**Validates: Requirements 5.4, 5.5**

### Property 9: Object Pool Invariant
*For any* object pool state, the sum of active objects and available objects SHALL equal the total pool size. When an object is released, it SHALL become available for reuse.
**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

### Property 10: Pattern Availability by Score
*For any* score value, the available patterns SHALL include only patterns whose difficulty threshold has been reached:
- score < 1000: only 'basic' patterns
- score >= 1000: 'basic' and 'intermediate' patterns
- score >= 2500: 'basic', 'intermediate', and 'advanced' patterns
- score >= 5000: all patterns including 'expert'
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 11: Difficulty Weight Distribution
*For any* score value, the pattern selection weights SHALL sum to 1.0, and harder patterns SHALL have higher weights as score increases.
**Validates: Requirements 7.5**

## Error Handling

### Flow Curve Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Negative score input | Clamp to 0, use MIN_SPEED |
| NaN/Infinity in calculation | Return MIN_SPEED, log warning |
| Invalid config values | Use default config |

### Pattern Manager Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Empty pattern list | Use fallback basic pattern |
| Invalid pattern structure | Skip pattern, log error |
| Pattern not found by ID | Return null, use random selection |
| Invalid timeOffset | Clamp to pattern duration |

### Object Pool Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Pool exhausted | Expand pool by 50% |
| Invalid object state | Reset object to default |
| Release of non-pool object | Ignore, log warning |

### Shard Placement Errors

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| Invalid lane | Default to 'BOTTOM' |
| Position out of bounds | Clamp to playable area |
| Negative shard value | Use default value (1) |

### General Error Recovery

```typescript
// Safe speed calculation with fallback
function safeCalculateSpeed(score: number, config: FlowCurveConfig): number {
  try {
    const speed = calculateGameSpeed(score, config);
    if (!Number.isFinite(speed)) {
      console.warn('[FlowCurve] Invalid speed calculated, using MIN_SPEED');
      return config.minSpeed;
    }
    return speed;
  } catch (error) {
    console.error('[FlowCurve] Error calculating speed:', error);
    return config.minSpeed;
  }
}

// Safe pattern selection with fallback
function safeSelectPattern(score: number, patterns: Pattern[]): Pattern {
  try {
    if (patterns.length === 0) {
      return FALLBACK_PATTERN;
    }
    return selectPattern(score, patterns);
  } catch (error) {
    console.error('[PatternManager] Error selecting pattern:', error);
    return patterns[0] || FALLBACK_PATTERN;
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
- **Property-Based Testing**: fast-check
- **Minimum Iterations**: 100 per property test

### Property-Based Test Requirements

1. Each property-based test MUST be tagged with a comment referencing the correctness property
2. Format: `**Feature: procedural-gameplay, Property {number}: {property_text}**`
3. Each correctness property MUST be implemented by a SINGLE property-based test
4. Tests should use smart generators that constrain to valid input spaces

### Test File Structure

```
systems/
├── flowCurve.test.ts           # Property 1, 2
├── patternManager.test.ts      # Property 3, 4, 5
├── spawnInterval.test.ts       # Property 6
├── shardPlacement.test.ts      # Property 7, 8
├── objectPool.test.ts          # Property 9
└── difficultyProgression.test.ts # Property 10, 11
```

### Example Property Tests

```typescript
// systems/flowCurve.test.ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateGameSpeed, DEFAULT_FLOW_CURVE_CONFIG } from './flowCurve';

describe('Flow Curve System', () => {
  /**
   * **Feature: procedural-gameplay, Property 1: Speed Formula Correctness**
   * **Validates: Requirements 1.2**
   */
  it('should calculate speed using logarithmic formula', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (score) => {
          const config = DEFAULT_FLOW_CURVE_CONFIG;
          const speed = calculateGameSpeed(score, config);
          const expected = config.minSpeed + Math.log10(score / config.scoreBase + 1) * config.scaleFactor;
          
          // Speed should match formula (with floating point tolerance)
          return Math.abs(speed - Math.min(expected, config.maxSpeed)) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 2: Speed Cap Enforcement**
   * **Validates: Requirements 1.3**
   */
  it('should never exceed MAX_SPEED', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        (score) => {
          const config = DEFAULT_FLOW_CURVE_CONFIG;
          const speed = calculateGameSpeed(score, config);
          return speed <= config.maxSpeed;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

```typescript
// systems/patternManager.test.ts
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Pattern, spawnPattern, serializePattern, deserializePattern } from './patternManager';

// Pattern generator for property tests
const patternGenerator = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  difficulty: fc.constantFrom('basic', 'intermediate', 'advanced', 'expert'),
  duration: fc.integer({ min: 500, max: 5000 }),
  obstacles: fc.array(
    fc.record({
      lane: fc.constantFrom('TOP', 'BOTTOM'),
      timeOffset: fc.integer({ min: 0, max: 5000 })
    }),
    { minLength: 1, maxLength: 10 }
  ),
  shards: fc.array(
    fc.record({
      lane: fc.constantFrom('TOP', 'BOTTOM'),
      timeOffset: fc.integer({ min: 0, max: 5000 }),
      type: fc.constantFrom('safe', 'risky')
    }),
    { minLength: 0, maxLength: 5 }
  )
});

describe('Pattern Manager', () => {
  /**
   * **Feature: procedural-gameplay, Property 5: Pattern Serialization Round-Trip**
   * **Validates: Requirements 2.6, 2.7**
   */
  it('should round-trip serialize/deserialize patterns', () => {
    fc.assert(
      fc.property(
        patternGenerator,
        (pattern) => {
          const serialized = serializePattern(pattern);
          const deserialized = deserializePattern(serialized);
          
          return (
            deserialized.id === pattern.id &&
            deserialized.name === pattern.name &&
            deserialized.difficulty === pattern.difficulty &&
            deserialized.duration === pattern.duration &&
            deserialized.obstacles.length === pattern.obstacles.length &&
            deserialized.shards.length === pattern.shards.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage Areas

1. **Edge Cases**
   - Score = 0 → MIN_SPEED
   - Very high score → MAX_SPEED cap
   - Empty pattern list
   - Single obstacle pattern

2. **Specific Patterns**
   - Gate pattern produces TOP + BOTTOM obstacles
   - Zig-Zag produces alternating lanes
   - Tunnel produces same-lane sequence
   - Gauntlet produces rapid alternation

3. **Error Conditions**
   - Invalid score (negative)
   - Malformed pattern JSON
   - Pool exhaustion

### Test Execution

```bash
# Run all tests
npm test

# Run procedural gameplay tests only
npm test -- systems/flowCurve.test.ts systems/patternManager.test.ts

# Run with coverage
npm test -- --coverage
```
