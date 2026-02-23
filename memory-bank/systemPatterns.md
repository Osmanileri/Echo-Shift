# System Patterns — Mimari ve Kalıplar

## Üst Seviye Mimari

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                            │
│              (State Machine / Orchestration)            │
├─────────────────────────────────────────────────────────┤
│  GameState: MENU | PLAYING | PAUSED | GAME_OVER | ...   │
│  Overlays: Shop | Tutorial | Restore | RateUs | ...     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  GameEngine.tsx                         │
│           (Canvas + requestAnimationFrame)              │
├─────────────────────────────────────────────────────────┤
│  useRef: score, speed, obstacles, particles, player     │
│  Systems: Constructs, Patterns, Difficulty, VFX, Audio  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   systems/*                             │
│              (Feature Modules)                          │
├─────────────────────────────────────────────────────────┤
│  constructs/  │ audioSystem │ flowCurve │ patterns     │
│  resonance    │ restore     │ shiftProtocol │ ...      │
│  LevelUnlockManager │ SpeedController (absolute-dist) │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              store/gameStore.ts                         │
│                  (Zustand)                              │
├─────────────────────────────────────────────────────────┤
│  Persisted: shards, inventory, equipped, campaign       │
│  Session: activeConstruct, isInvulnerable               │
└─────────────────────────────────────────────────────────┘
```

## State Yönetimi Deseni

| State Tipi | Nerede | Örnek |
|------------|--------|-------|
| Frame-critical (hot path) | `useRef` in GameEngine | score, speed, obstacles, particles |
| Meta/progress | Zustand store | Echo Shards, inventory, upgrades |
| UI state | `useState` in App.tsx | shop açık mı, prompt göster |
| Session-only | Zustand (not persisted) | activeConstruct, isInvulnerable |

## Sistem Entegrasyonu

### Config-Driven Behavior
```typescript
// constants.ts
export const RHYTHM_CONFIG = { toleranceMs: 200, streakForX2: 3, ... };
export const SHIFT_CONFIG = { overdriveDuration: 10000, magnetRadius: 150, ... };
export const GLITCH_CONFIG = { 
  wavePatterns: ['sine', 'zigzag', 'doubleSine', 'staircase', 'pulse'],
  patternAccentColors: { sine: '#00FF00', zigzag: '#00FFFF', ... },
  patternDisplayNames: { sine: 'SİNÜS DALGASI', zigzag: 'ZİGZAG KESİCİ', ... },
};
```

## Quantum Lock Wave Pattern System

```
Activation → selectRandomWavePattern() → pattern stored in GlitchModeState.wavePattern
                                              │
                    ┌─────────────────────────┼────────────────────────────┐
                    ▼                         ▼                           ▼
            calculateWaveY()          renderSinusTunnel()          renderDynamicWave()
            (5-pattern dispatch)      (pattern-aware color)        (pattern-aware color)
                    │
    ┌───────────────┼───────────────────┬────────────────────┐
    ▼               ▼                   ▼                    ▼
  sine          zigzag             doubleSine            staircase        pulse
  (sin)    (triangle wave)    (sin + 0.4*sin(2.3x))  (quantized+smooth)  (sin^5)
```

### Pattern Formula'ları
- **sine**: `sin(phase)` — Klasik yumuşak dalga
- **zigzag**: Triangle wave — Keskin açılı zigzag 
- **doubleSine**: `(sin(φ) + 0.4*sin(2.3φ)) / 1.4` — Çift frekanslı karmaşık hareket
- **staircase**: `round(sin(φ)*4)/4 * 0.7 + sin(φ) * 0.3` — Basamaklı plato deseni
- **pulse**: `sign(sin(φ)) * |sin(φ)|^5 * 1.6` — Dar keskin tepeler

### Mode Activation
```typescript
// GameEngine props
interface GameEngineProps {
  dailyChallengeMode?: DailyChallengeConfig;
  restoreMode?: RestoreConfig;
  zenMode?: boolean;
  ghostRacerMode?: GhostConfig;
  campaignMode?: CampaignConfig;
}
```

### Callback Senkronizasyonu
```typescript
// App.tsx → GameEngine
onScoreUpdate={(score) => setCurrentScore(score)}
onRhythmUpdate={(streak, multiplier) => setRhythmState({streak, multiplier})}
onNearMissUpdate={(streak) => setNearMissStreak(streak)}
```

## Kalıcılık Deseni

```typescript
// utils/persistence.ts
safePersist(key, data)  // JSON serialize + localStorage
safeLoad(key, default)  // JSON deserialize + fallback
```

### Fallback Stratejisi
1. localStorage'a yaz
2. Hata → memory fallback kullan
3. Load sırasında validate et
4. Bozuk veri → default döndür

## Echo Constructs Sistemi

```
┌─────────────────────────────────────────────────────────┐
│                 ConstructSystem                         │
├─────────────────────────────────────────────────────────┤
│  activeType: 'NONE' | 'TITAN' | 'PHASE' | 'BLINK'      │
│  strategy: PhysicsStrategy                              │
│  invincibilityEndTime: number                           │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Titan   │    │  Phase   │    │  Blink   │
    │ Physics  │    │ Physics  │    │ Physics  │
    ├──────────┤    ├──────────┤    ├──────────┤
    │ 2.5x grav│    │ flip grav│    │ teleport │
    │ stomp    │    │ 1.2x spd │    │ static Y │
    │ destroy  │    │ damage   │    │ ignore   │
    └──────────┘    └──────────┘    └──────────┘
```

## Test Deseni

- `vitest` ile unit/property test
- `fast-check` ile property-based testing
- Her sistem için `*.test.ts` dosyası
- 747 test (720 pass, 27 pre-existing fail)

## Mobile Platform Patterns

### Canvas DPR Scaling
```typescript
// GameEngine.tsx — retina display desteği
const dpr = Math.min(window.devicePixelRatio || 1, 3);
canvas.width = window.innerWidth * dpr;
canvas.height = window.innerHeight * dpr;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
// TÜM koordinatlar logical pixel (window.innerWidth/Height)
// canvas.width/height SADECE buffer boyutu (DPR × logical)
```

### Safe Area Insets
```css
/* index.html — CSS custom properties (opt-in per element) */
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}
/* GameUI.tsx — HUD elemanları */
style={{ top: 'max(1.5rem, var(--safe-top, 0px))' }}
```

### Capacitor App Lifecycle
```typescript
// App.tsx — Android back button, StatusBar, visibility
useEffect(() => {
  CapApp.addListener('backButton', () => {
    // Close modals in reverse-depth order → minimize at root
  });
}, [deps]);

useEffect(() => {
  if (gameState === GameState.PLAYING) StatusBar.hide();
  else StatusBar.show();
}, [gameState]);

useEffect(() => {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { handlePause(); flush(); save(); }
  });
}, [gameState]);
```

### Error Boundary
```typescript
// components/ErrorBoundary.tsx — top-level crash recovery
// Wraps <App /> in index.tsx
// Shows "Signal Lost" UI with Restart button
// Development mode: shows stack trace
```

## Performance Optimization Patterns (Mobile 60fps)

### Pre-Allocated Reusable Objects
```typescript
// systems/performanceUtils.ts
// Hot-path fonksiyonlar her frame yeni obje döndürmez; 
// module-level singleton'ları mutate edip döndürür.
const _jitterResult = { x: 0, y: 0 };
export function generateJitterOffset(...): { x: number; y: number } {
  _jitterResult.x = computed_x;
  _jitterResult.y = computed_y;
  return _jitterResult; // CALLER MUST NOT STORE REFERENCE
}
```

### In-Place Compaction (filter → mutate)
```typescript
// .filter() yerine in-place swap ile GC baskısı sıfırlanır
let writeIdx = 0;
for (let i = 0; i < arr.length; i++) {
  if (keepCondition(arr[i])) { arr[writeIdx++] = arr[i]; }
}
arr.length = writeIdx;
```

### Temp-Modify-Restore (spread-copy elimination)
```typescript
// { ...orb, y: newY } spread yerine:
const savedY = orb.y;
orb.y = tempY;
renderOrb(orb);   // render with temp value
orb.y = savedY;   // restore original
```

### Cached Frame Time (Date.now() elimination)
```typescript
// Frame başında 1 kez Date.now() çağrılır, tüm sistemler cache kullanır
const frameTime = Date.now();
setFrameTime(frameTime);           // performanceUtils
EnemyManager.setDrawTime(frameTime); // EnemyManager
// Geri kalan 32 kullanım → getFrameTime() / frameTime değişkeni
```

### Rendering Optimizations
- **Gradient elimination**: Per-particle `createRadialGradient` → solid `fillStyle` + `shadowBlur`
- **Step size increase**: VFX render loop step ↑40% (5→8, 2→3, 10→15 vb.)
- **save/restore elimination**: Toplu particle rendering tek outer save/restore ile
- **for-loop**: `forEach` + closure → düz `for` + `continue`

## Campaign Update v2.5 Sistemi

```
┌─────────────────────────────────────────────────────────┐
│                 Campaign Mode Flow                       │
├─────────────────────────────────────────────────────────┤
│  Level Selection → Play → Complete → Victory → Return   │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Distance    │ │    Speed     │ │   Campaign   │
    │  Tracker     │ │  Controller  │ │   System     │
    ├──────────────┤ ├──────────────┤ ├──────────────┤
    │ currentDist  │ │ baseSpeed    │ │ starRating   │
    │ targetDist   │ │ progressive  │ │ rewards      │
    │ climaxZone   │ │ climaxBoost  │ │ firstClear   │
    │ nearFinish   │ │ transition   │ │ replay       │
    └──────────────┘ └──────────────┘ └──────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Climax VFX  │ │ Holographic  │ │ Environment  │
    │              │ │    Gate      │ │   Effects    │
    ├──────────────┤ ├──────────────┤ ├──────────────┤
    │ starfield    │ │ visibility   │ │ collection   │
    │ chromatic    │ │ pulse        │ │ damage       │
    │ FOV          │ │ shatter      │ │ BPM sync     │
    │ screenFlash  │ │ warpJump     │ │ haptic       │
    └──────────────┘ └──────────────┘ └──────────────┘
```

### Distance-Based Formulas

```typescript
// Target Distance (Requirements 2.1)
targetDistance = level * 100; // L1=100m, L5=500m, L100=10000m

// Absolute-Distance Speed (Requirements 3.1, 3.4)
// Two-slope piecewise in √d space:
speed(d) = 1.0 + 0.20 × min(√d, 10) + 0.15 × max(0, √d − 10)
// At 0m: 1.0, 100m: 3.0, 400m: 4.5, 900m: 6.0, 1600m: 7.5, 2178m: 8.5 (cap)
// Level parameter IGNORED — same distance = same speed in all levels

// Climax Speed (Requirements 3.2)
climaxSpeed = speed × 1.15; // Final 20% of level target

// Hard cap: MAX_ALLOWED_SPEED = 8.5

// Obstacle Density (Requirements 5.4)
density = Math.min(1.0, 0.5 + (level * 0.02));
```

### Star Rating System

| Stars | Criteria | Name |
|-------|----------|------|
| 1★ | Complete with health > 0 | Survivor |
| 2★ | Collect >= 80% shards | Collector |
| 3★ | No damage taken | Perfectionist |

### Reward Formulas

```typescript
// First-Clear Bonus (Requirements 9.1)
firstClearBonus = 50 + (level * 10);

// Base Reward (Requirements 9.3)
baseReward = 10 + (level * 3) + (stars * 5);

// Replay Reward (Requirements 9.2)
replayReward = newBaseReward - previousBaseReward; // Only if improved
```

### Chapter System

| Chapter | Levels | Theme | New Mechanic |
|---------|--------|-------|--------------|
| SUB_BASS | 1-10 | Deep frequencies | Basic |
| BASS | 11-20 | Bass waves | Phantom obstacles |
| MID | 21-30 | Shifting midrange | Moving obstacles |
| HIGH | 31-40 | Higher frequencies | Rhythm |
| PRESENCE | 41-50 | Presence zone | Gravity |

## Enemy System — Dual Enemy Architecture

```
EnemyManagerState
├── isActive: boolean
├── dart: GlitchDart          (Canvas2D rendering)
│   └── idle → tracking → locked → firing → cooldown
├── seeker: GlitchSeeker       (PixiJS GPU rendering — OBSTACLES layer)
│   └── idle → entering → hunting → dying
└── spawnScheduler
    └── nextEnemyType: 'dart' | 'seeker' (sequential spawn, one at a time)
```

- **Parallel field**: dart + seeker ayrı alanlar, bağımsız state machine'ler
- **Sequential spawn**: `rollNextEnemyType()` ile sıralı — ikisi aynı anda spawn olmaz
- **Seeker homing**: LERP 0.03 ile oyuncu X pozisyonuna tracking, descent 1.5px/frame
- **Unlock**: distance ≥ 300m AND score ≥ 500, spawn chance %35
- **PixiJS render**: `engine/PixiGlitchSeeker.ts` — OBSTACLES katmanı (ethereal, Canvas2D arkası)
- **Pre-allocated**: Trail pool (20), shatter fragments (6), zero per-frame allocation
