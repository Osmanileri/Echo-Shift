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
- 364 test geçiyor
