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
```

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
- 526 test geçiyor

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
