# Design Document: Advanced Game Mechanics

## Overview

Bu tasarım dokümanı, Shadow Sync oyununa eklenecek beş gelişmiş mekanik için teknik mimariyi tanımlar: Ritim Modu, Gravite Değişimi, Kritik Vuruş, Dinamik Merkez Çizgi ve Phantom Obstacles (Görünmez/Gecikmeli Bloklar). Bu mekanikler mevcut GameEngine.tsx yapısına entegre edilecek ve yeni utility fonksiyonları ile desteklenecektir.

Dinamik Merkez Çizgi mekaniği, oyuna öngörü (anticipation) ve ortam farkındalığı (environmental awareness) katarak oyuncuların sadece reflekslerini değil, stratejik düşünme yeteneklerini de test eder.

Phantom Obstacles mekaniği, oyunu refleks tabanlı bir oyundan hafıza/ritim oyununa yaklaştırır. Oyuncular, engellerin rengini ve pozisyonunu çok önceden tahmin etmek zorunda kalır.

## Architecture

### Mevcut Yapı
```
├── components/
│   ├── GameEngine.tsx    # Ana oyun döngüsü ve render
│   └── GameUI.tsx        # UI bileşenleri
├── utils/
│   └── gameMath.ts       # Collision ve matematik fonksiyonları
├── types.ts              # Tip tanımları
└── constants.ts          # Oyun sabitleri
```

### Önerilen Değişiklikler
```
├── components/
│   ├── GameEngine.tsx    # + Yeni mekanik entegrasyonları
│   └── GameUI.tsx        # + Multiplier ve streak göstergeleri
├── utils/
│   ├── gameMath.ts       # + checkNearMiss fonksiyonu
│   ├── rhythmSystem.ts   # YENİ: Ritim hesaplama mantığı
│   ├── midlineSystem.ts  # YENİ: Dinamik merkez çizgi hesaplama mantığı
│   └── phantomSystem.ts  # YENİ: Phantom obstacle hesaplama mantığı
├── types.ts              # + Yeni interface'ler (Obstacle güncellemesi)
└── constants.ts          # + Yeni sabitler (PHANTOM_CONFIG)
```

## Components and Interfaces

### 1. Ritim Sistemi (RhythmSystem)

```typescript
interface RhythmState {
  lastPassTime: number;           // Son başarılı geçiş zamanı (ms)
  expectedInterval: number;       // Beklenen ritim aralığı (ms)
  streakCount: number;            // Ardışık başarılı ritim sayısı
  activeMultiplier: number;       // Aktif çarpan (1, 2 veya 3)
  isRhythmActive: boolean;        // Ritim modu aktif mi
}
```

**Fonksiyonlar:**
- `calculateExpectedInterval(speed: number, spawnRate: number): number` - Oyun hızına göre beklenen aralığı hesaplar
- `checkRhythmTiming(currentTime: number, state: RhythmState): RhythmResult` - Geçişin ritimde olup olmadığını kontrol eder
- `updateRhythmState(state: RhythmState, isOnBeat: boolean): RhythmState` - Streak ve multiplier günceller

### 2. Gravite Sistemi (GravitySystem)

```typescript
interface GravityState {
  isFlipped: boolean;             // Gravite tersine mi
  flipStartTime: number;          // Flip başlangıç zamanı
  warningActive: boolean;         // Uyarı gösteriliyor mu
  warningStartTime: number;       // Uyarı başlangıç zamanı
  lastFlipTime: number;           // Son flip zamanı
  isInvincible: boolean;          // Flip sonrası dokunulmazlık
}
```

**Fonksiyonlar:**
- `shouldTriggerFlip(score: number, lastFlipTime: number): boolean` - Flip tetiklenmeli mi
- `mirrorPlayerPosition(playerY: number): number` - Oyuncu pozisyonunu yansıtır
- `getFlippedLane(lane: 'top' | 'bottom'): 'top' | 'bottom'` - Lane'i tersine çevirir

### 3. Kritik Vuruş Sistemi (NearMissSystem)

```typescript
interface NearMissState {
  lastNearMissTime: number;       // Son close call zamanı
  streakCount: number;            // Ardışık close call sayısı
  totalNearMisses: number;        // Toplam close call sayısı
}

interface NearMissResult {
  isNearMiss: boolean;            // Close call mı
  distance: number;               // Mesafe (piksel)
  closestPoint: Point;            // En yakın nokta (efekt için)
  bonusPoints: number;            // Kazanılan bonus puan
}
```

**Fonksiyonlar:**
- `checkNearMiss(circlePos: Point, radius: number, rect: Obstacle): NearMissResult` - Yakın geçiş kontrolü
- `calculateClosestPoint(circlePos: Point, rect: Obstacle): Point` - En yakın noktayı hesaplar

## Data Models

### Güncellenmiş Types (types.ts)

```typescript
// Mevcut Particle interface'ine ek
export interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;  // Yukarı hareket hızı
}

// Yeni efekt tipleri
export type EffectType = 'glow' | 'spark' | 'burst';

export interface VisualEffect {
  type: EffectType;
  x: number;
  y: number;
  life: number;
  color: string;
  scale: number;
}
```

### Güncellenmiş Constants (constants.ts)

```typescript
export const RHYTHM_CONFIG = {
  toleranceMs: 50,              // ±50ms tolerans
  streakForX2: 5,               // x2 için gereken streak
  streakForX3: 10,              // x3 için gereken streak
  baseInterval: 800,            // Temel ritim aralığı (ms)
};

export const GRAVITY_CONFIG = {
  minScoreToActivate: 1000,     // Minimum skor
  warningDuration: 500,         // Uyarı süresi (ms)
  flipDuration: 300,            // Flip animasyon süresi (ms)
  minTimeBetweenFlips: 5000,    // Flipler arası minimum süre (ms)
  invincibilityDuration: 200,   // Dokunulmazlık süresi (ms)
};

export const NEAR_MISS_CONFIG = {
  threshold: 9,                 // Orb radius (piksel)
  bonusMultiplier: 2,           // Puan çarpanı
  streakWindow: 2000,           // Streak penceresi (ms)
  streakBonusAt: 3,             // Bonus için gereken streak
  streakBonusPoints: 50,        // Streak bonusu
};

// Dynamic Midline System Configuration - Requirements 4.2, 4.11, 4.12, 4.13
export const MIDLINE_CONFIG = {
  baseAmplitude: 0.05,          // Temel genlik (%5)
  maxAmplitude: 0.08,           // Maksimum genlik (%8)
  baseFrequency: 0.005,         // Temel frekans
  amplitudeThreshold1: 2000,    // İlk genlik artış skoru
  amplitudeThreshold2: 5000,    // İkinci genlik artış skoru
  frequencyScaleFactor: 0.1,    // Frekans ölçekleme faktörü
  frequencyMaxScore: 5000,      // Frekans etkisinin maksimum olduğu skor
  microPhasingDistance: 10,     // Micro-phasing mesafesi (piksel)
  forecastTime: 500,            // Öngörü süresi (ms)
  criticalSpaceRatio: 0.30,     // Kritik alan oranı (%30)
};

// Phantom Obstacle System Configuration - Requirements 5.1, 5.2, 5.7, 5.8, 5.10
export const PHANTOM_CONFIG = {
  activationScore: 500,         // Phantom spawn'ın aktif olacağı skor
  revealDistance: 300,          // Tam görünür olma mesafesi (piksel)
  baseSpawnProbability: 0.10,   // Temel spawn olasılığı (%10)
  maxSpawnProbability: 0.40,    // Maksimum spawn olasılığı (%40)
  probabilityMaxScore: 5000,    // Max olasılığa ulaşılan skor
  minOpacity: 0.05,             // Minimum saydamlık (hayalet kontur)
  bonusPoints: 20,              // Phantom geçiş bonusu
  nearMissMultiplier: 2,        // Near miss çarpanı
};
```

### 4. Dinamik Merkez Çizgi Sistemi (MidlineSystem)

```typescript
interface MidlineState {
  startTime: number;              // Oyun başlangıç zamanı (ms)
  currentMidlineY: number;        // Anlık merkez çizgi Y pozisyonu (piksel)
  normalizedOffset: number;       // Normalize edilmiş offset (-1 ile 1 arası)
  currentAmplitude: number;       // Anlık genlik (0.05 - 0.08)
  currentFrequency: number;       // Anlık frekans
  isAtPeak: boolean;              // Maksimum genlikte mi
  isMicroPhasing: boolean;        // Sınır dokunulmazlığı aktif mi
  tensionIntensity: number;       // Gerilim ses yoğunluğu (0-1)
}

interface MidlineConfig {
  baseAmplitude: number;          // Temel genlik (0.05)
  maxAmplitude: number;           // Maksimum genlik (0.08)
  baseFrequency: number;          // Temel frekans (0.005)
  amplitudeThreshold1: number;    // İlk genlik artış skoru (2000)
  amplitudeThreshold2: number;    // İkinci genlik artış skoru (5000)
  microPhasingDistance: number;   // Micro-phasing mesafesi (10px)
  forecastTime: number;           // Öngörü süresi (500ms)
  criticalSpaceRatio: number;     // Kritik alan oranı (0.30)
}
```

**Fonksiyonlar:**
- `calculateMidlineY(canvasHeight: number, elapsedTime: number, config: MidlineConfig, score: number): number` - Anlık midline Y pozisyonunu hesaplar
- `calculateDynamicFrequency(baseFrequency: number, score: number): number` - Skora göre dinamik frekans hesaplar
- `calculateDynamicAmplitude(baseAmplitude: number, score: number, config: MidlineConfig): number` - Skora göre dinamik genlik hesaplar
- `getOrbZone(orbY: number, midlineY: number): 'black' | 'white'` - Orb'un hangi bölgede olduğunu belirler
- `shouldApplyMicroPhasing(orbY: number, midlineY: number, distance: number): boolean` - Micro-phasing uygulanmalı mı
- `calculateMovementBounds(midlineY: number, connectorLength: number, orbRadius: number): { minY: number, maxY: number }` - Hareket sınırlarını hesaplar
- `isCriticalSpace(bounds: { minY: number, maxY: number }, normalBounds: { minY: number, maxY: number }): boolean` - Alan kritik mi
- `calculateTensionIntensity(normalizedOffset: number): number` - Gerilim yoğunluğunu hesaplar
- `predictPeakTime(elapsedTime: number, frequency: number): { timeToNextPeak: number, direction: 'up' | 'down' }` - Sonraki peak zamanını tahmin eder
- `createInitialMidlineState(): MidlineState` - Başlangıç state'i oluşturur

### 5. Phantom Obstacle Sistemi (PhantomSystem)

```typescript
// Obstacle interface güncellemesi (types.ts)
export interface Obstacle {
  // ... mevcut alanlar
  isLatent?: boolean;             // Engelin görünmez modda başlayıp başlamadığı
  revealDistance?: number;        // Tam görünür olacağı mesafe (piksel)
  initialX?: number;              // Spawn anındaki X koordinatı
}

// Phantom konfigürasyonu (constants.ts)
export interface PhantomConfig {
  activationScore: number;        // Phantom spawn'ın aktif olacağı skor (500)
  revealDistance: number;         // Tam görünür olma mesafesi (300px)
  baseSpawnProbability: number;   // Temel spawn olasılığı (0.10)
  maxSpawnProbability: number;    // Maksimum spawn olasılığı (0.40)
  probabilityMaxScore: number;    // Max olasılığa ulaşılan skor (5000)
  minOpacity: number;             // Minimum saydamlık (hayalet kontur) (0.05)
  bonusPoints: number;            // Phantom geçiş bonusu (20)
  nearMissMultiplier: number;     // Near miss çarpanı (2)
}
```

**Fonksiyonlar:**
- `calculatePhantomOpacity(currentX: number, initialX: number, revealDistance: number): number` - Engelin anlık saydamlık değerini hesaplar
- `getEffectiveOpacity(calculatedOpacity: number, minOpacity: number): number` - Minimum saydamlık eşiğini uygular
- `calculatePhantomSpawnProbability(score: number, config: PhantomConfig): number` - Skora göre spawn olasılığını hesaplar
- `shouldSpawnAsPhantom(score: number, config: PhantomConfig): boolean` - Engelin phantom olarak spawn edilip edilmeyeceğini belirler
- `calculatePhantomBonus(isNearMiss: boolean, config: PhantomConfig): number` - Phantom geçiş bonusunu hesaplar
- `createPhantomObstacle(baseObstacle: Obstacle, canvasWidth: number, config: PhantomConfig): Obstacle` - Normal engeli phantom engele dönüştürür

## Error Handling

1. **Ritim Sistemi**: İlk engel geçişinde timing kontrolü yapılmaz, sadece referans zamanı kaydedilir
2. **Gravite Sistemi**: Flip sırasında spawn edilen engeller doğru lane'e yerleştirilir
3. **Near Miss**: Collision varsa near miss kontrolü yapılmaz (önce collision check)
4. **Midline Sistemi**: Micro-phasing sadece çarpışma anında kontrol edilir, sürekli aktif değildir
5. **Phantom Sistemi**: Collision detection, opacity değerinden bağımsız olarak her zaman aktiftir
6. **Phantom + Near Miss**: Her iki bonus birleştirilir, near miss çarpanı phantom bonusuna uygulanır
7. **Genel**: Tüm state'ler resetGame() içinde sıfırlanır



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Rhythm System Properties

**Property 1: Rhythm timing window validation**
*For any* pass time within ±50ms of the expected interval, the rhythm check function SHALL return true (on-beat), and for any pass time outside this window, it SHALL return false.
**Validates: Requirements 1.2**

**Property 2: Multiplier threshold consistency**
*For any* rhythm streak count, the active multiplier SHALL be 1 when streak < 5, 2 when 5 ≤ streak < 10, and 3 when streak ≥ 10.
**Validates: Requirements 1.3, 1.4**

**Property 3: Rhythm reset on failure**
*For any* rhythm state with active streak and multiplier, after a collision or timing miss, the streak SHALL be 0 and multiplier SHALL be 1.
**Validates: Requirements 1.5**

**Property 4: Interval-speed inverse relationship**
*For any* two game speeds where speed2 > speed1, the expected rhythm interval for speed2 SHALL be less than the interval for speed1.
**Validates: Requirements 1.6**

**Property 5: Score multiplication correctness**
*For any* base score and active multiplier, the final score SHALL equal base × multiplier.
**Validates: Requirements 1.7**

### Gravity System Properties

**Property 6: Gravity flip eligibility threshold**
*For any* score below 1000, shouldTriggerFlip SHALL return false regardless of other conditions.
**Validates: Requirements 2.1**

**Property 7: Position mirroring symmetry**
*For any* normalized player position y (0 to 1), mirrorPlayerPosition(y) SHALL equal (1 - y), and mirrorPlayerPosition(mirrorPlayerPosition(y)) SHALL equal y (round-trip).
**Validates: Requirements 2.3**

**Property 8: Lane inversion correctness**
*For any* lane value, getFlippedLane('top') SHALL return 'bottom' and getFlippedLane('bottom') SHALL return 'top'.
**Validates: Requirements 2.4**

**Property 9: Flip cooldown enforcement**
*For any* time t within 5000ms of lastFlipTime, shouldTriggerFlip SHALL return false even if score ≥ 1000.
**Validates: Requirements 2.6**

### Near Miss System Properties

**Property 10: Near miss classification threshold**
*For any* orb position and obstacle where collision is false and clearance distance < orb radius, checkNearMiss SHALL return isNearMiss = true.
**Validates: Requirements 3.1**

**Property 11: Near miss bonus calculation**
*For any* near miss event, the returned bonusPoints SHALL equal base score × 2 (20 points).
**Validates: Requirements 3.2**

**Property 12: Distance calculation from edges**
*For any* orb position and obstacle, the calculated distance SHALL equal the Euclidean distance from orb center to closest rectangle point, minus the orb radius.
**Validates: Requirements 3.6**

**Property 13: Near miss streak window**
*For any* two near miss events where time difference ≤ 2000ms, the streak counter SHALL increment; otherwise it SHALL reset to 1.
**Validates: Requirements 3.7**

**Property 14: Streak bonus threshold**
*For any* near miss streak reaching 3, an additional 50 point bonus SHALL be awarded.
**Validates: Requirements 3.8**

### Dynamic Midline System Properties

**Property 15: Midline position bounds**
*For any* canvas height H, elapsed time, amplitude (0.05-0.08), and frequency, the calculated midline Y position SHALL be within the range [(H/2) - (H × maxAmplitude), (H/2) + (H × maxAmplitude)].
**Validates: Requirements 4.1, 4.2**

**Property 16: Midline formula correctness**
*For any* canvas height H, time t, amplitude a, frequency f, and offset o, calculateMidlineY SHALL return (H/2) + (H × a × sin(t × f + o)).
**Validates: Requirements 4.2**

**Property 17: Zone determination correctness**
*For any* orb Y position and midline Y, getOrbZone SHALL return 'black' when orbY < midlineY and 'white' when orbY >= midlineY.
**Validates: Requirements 4.6**

**Property 18: Movement bounds validity**
*For any* midline position, connector length, and orb radius, the calculated movement bounds SHALL ensure both orbs can fit within their respective zones without crossing the midline.
**Validates: Requirements 4.5**

**Property 19: Critical space detection**
*For any* movement bounds where available space is less than 30% of normal space, isCriticalSpace SHALL return true.
**Validates: Requirements 4.8**

**Property 20: Midline state serialization round-trip**
*For any* valid MidlineState, serializing then deserializing SHALL produce an equivalent state with the same time offset.
**Validates: Requirements 4.10**

**Property 21: Dynamic frequency calculation**
*For any* base frequency and score, calculateDynamicFrequency SHALL return baseFrequency × (1 + 0.1 × min(score/5000, 1)).
**Validates: Requirements 4.11**

**Property 22: Dynamic amplitude thresholds**
*For any* score < 2000, amplitude SHALL be 0.05; for 2000 ≤ score < 5000, amplitude SHALL be 0.065; for score ≥ 5000, amplitude SHALL be 0.08.
**Validates: Requirements 4.12**

**Property 23: Micro-phasing boundary detection**
*For any* orb Y position within ±10 pixels of midlineY, shouldApplyMicroPhasing SHALL return true.
**Validates: Requirements 4.13**

**Property 24: Peak prediction timing**
*For any* elapsed time and frequency, predictPeakTime SHALL correctly calculate the time remaining until the next peak or trough within ±50ms accuracy.
**Validates: Requirements 4.14**

**Property 25: Tension intensity calculation**
*For any* normalized offset (-1 to 1), calculateTensionIntensity SHALL return a value between 0 and 1, where |offset| = 1 yields intensity = 1 and offset = 0 yields intensity = 0.
**Validates: Requirements 4.15**

### Phantom Obstacle System Properties

**Property 26: Phantom activation threshold**
*For any* score value, phantom obstacle spawning SHALL be disabled when score ≤ 500 and enabled when score > 500.
**Validates: Requirements 5.1**

**Property 27: Phantom opacity formula correctness**
*For any* phantom obstacle with currentX, initialX, and revealDistance, calculatePhantomOpacity SHALL return max(0, min(1, (currentX - revealDistance) / (initialX - revealDistance))).
**Validates: Requirements 5.3**

**Property 28: Minimum opacity threshold**
*For any* calculated opacity value, getEffectiveOpacity SHALL return max(minOpacity, calculatedOpacity) where minOpacity = 0.05, ensuring phantom obstacles always have a visible "ghost" outline.
**Validates: Requirements 5.4**

**Property 29: Phantom spawn probability formula**
*For any* score > 500, calculatePhantomSpawnProbability SHALL return min(0.40, 0.10 + 0.30 × (score - 500) / 4500).
**Validates: Requirements 5.8, 5.11**

**Property 30: Phantom bonus calculation**
*For any* phantom obstacle pass without near miss, calculatePhantomBonus SHALL return 20 points; with near miss, it SHALL return 40 points (20 × 2).
**Validates: Requirements 5.7, 5.10**

**Property 31: Collision independence from opacity**
*For any* phantom obstacle at any opacity level (0.05 to 1.0), collision detection SHALL produce the same result as a fully visible obstacle at the same position.
**Validates: Requirements 5.6**

**Property 32: RevealDistance constancy**
*For any* game speed value, the revealDistance for phantom obstacles SHALL remain constant at 300 pixels.
**Validates: Requirements 5.9**

## Testing Strategy

### Property-Based Testing Framework

Bu proje için **fast-check** kütüphanesi kullanılacaktır. Her property-based test minimum 100 iterasyon çalıştırılacaktır.

### Test Dosya Yapısı

```
├── utils/
│   ├── gameMath.ts
│   ├── gameMath.test.ts          # Near miss property tests
│   ├── rhythmSystem.ts
│   ├── rhythmSystem.test.ts      # Rhythm property tests
│   ├── midlineSystem.ts          # Midline hesaplama mantığı
│   ├── midlineSystem.test.ts     # Midline property tests
│   ├── phantomSystem.ts          # YENİ: Phantom obstacle hesaplama mantığı
│   └── phantomSystem.test.ts     # YENİ: Phantom property tests
```

### Property-Based Test Örnekleri

```typescript
// rhythmSystem.test.ts
import * as fc from 'fast-check';

describe('Rhythm System Properties', () => {
  // **Feature: advanced-game-mechanics, Property 1: Rhythm timing window validation**
  test('timing within tolerance returns on-beat', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 49 }), // offset within tolerance
        fc.boolean(), // positive or negative offset
        (offset, isPositive) => {
          const expectedTime = 1000;
          const actualTime = isPositive 
            ? expectedTime + offset 
            : expectedTime - offset;
          const result = checkRhythmTiming(actualTime, { 
            lastPassTime: 0, 
            expectedInterval: 1000 
          });
          return result.isOnBeat === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Feature: advanced-game-mechanics, Property 2: Multiplier threshold consistency**
  test('multiplier matches streak thresholds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        (streak) => {
          const multiplier = getMultiplierForStreak(streak);
          if (streak < 5) return multiplier === 1;
          if (streak < 10) return multiplier === 2;
          return multiplier === 3;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Phantom System Property Test Örnekleri

```typescript
// phantomSystem.test.ts
import * as fc from 'fast-check';

describe('Phantom System Properties', () => {
  // **Feature: advanced-game-mechanics, Property 27: Phantom opacity formula correctness**
  test('opacity formula returns correct value for all positions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 800 }),    // currentX
        fc.integer({ min: 800, max: 1200 }), // initialX (canvas width)
        fc.integer({ min: 100, max: 500 }),  // revealDistance
        (currentX, initialX, revealDistance) => {
          const opacity = calculatePhantomOpacity(currentX, initialX, revealDistance);
          const expected = Math.max(0, Math.min(1, 
            (currentX - revealDistance) / (initialX - revealDistance)
          ));
          return Math.abs(opacity - expected) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Feature: advanced-game-mechanics, Property 29: Phantom spawn probability formula**
  test('spawn probability follows formula for all scores', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 501, max: 10000 }),
        (score) => {
          const probability = calculatePhantomSpawnProbability(score, PHANTOM_CONFIG);
          const expected = Math.min(0.40, 0.10 + 0.30 * (score - 500) / 4500);
          return Math.abs(probability - expected) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage

Unit testler şu senaryoları kapsayacaktır:
- Edge cases: streak = 0, 5, 10 sınır değerleri
- Reset senaryoları: collision ve timing miss sonrası
- Phantom edge cases: score = 500, 501, 5000 sınır değerleri
- Opacity edge cases: currentX = revealDistance, currentX = initialX
- Integration: GameEngine ile sistem entegrasyonu

### Test Annotation Format

Her property-based test şu formatta etiketlenecektir:
```typescript
// **Feature: advanced-game-mechanics, Property {number}: {property_text}**
```
