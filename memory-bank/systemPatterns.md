# System Patterns — Mimari ve Kalıplar

## Üst Seviye Mimari

- **UI State Machine**: `App.tsx` oyunun durumlarını (`GameState`: MENU/PLAYING/PAUSED/GAME_OVER/RESTORING) ve “overlay” UI’ları (Shop, Daily Challenge, Tutorial, Restore, Rate Us) yönetir.
- **Game Loop & Render**: `components/GameEngine.tsx` canvas üstünde requestAnimationFrame ile simülasyon + çizimi yürütür. React burada “container”dır; gerçek frame state `useRef` ile mutable tutulur.
- **Feature Systems**: `systems/*` ve bazı `utils/*` modülleri “sisteme” ait kuralları içerir (ör. particle, slow motion, restore snapshot, ghost racer, difficulty progression).
- **Global Persisted State**: `store/gameStore.ts` (Zustand) oyuncu meta verilerini ve ayarları tutar; `utils/persistence.ts` ile güvenli localStorage kullanır.

## State Yönetimi Deseni

- **Frame-critical state (hot path)**: `useRef` ile `components/GameEngine.tsx` içinde tutulur (score, speed, obstacles, particles, player pos).
- **Meta/progress state**: Zustand store (`useGameStore`) üzerinden tutulur (Echo Shards, inventory, equipped, upgrades, settings, campaign progress).
- **UI state**: `App.tsx` içinde `useState` ile (shop açık mı, prompt göster, streak göstergeleri vb.).

## Sistem Entegrasyonu Prensipleri

- **Config ile davranış**: `constants.ts` ve ilgili system config’leri (RHYTHM_CONFIG, GRAVITY_CONFIG, MIDLINE_CONFIG, SHIFT_CONFIG) oyun hissini belirler.
- **Modlar “config object” ile açılır**: GameEngine props’larında `dailyChallengeMode`, `restoreMode`, `zenMode`, `ghostRacerMode`, `campaignMode` gibi opsiyonel config’ler var.
- **Callback ile UI senkronizasyonu**: score, rhythm, near miss, slow motion gibi durumlar `onXxxUpdate` callback’leri ile `App.tsx` UI state’ine aktarılır.

## Kalıcılık / Storage Deseni

- **Safe persist adapter**: `utils/persistence.ts` JSON serialize/deserialize hatalarını yakalar; localStorage yoksa memory fallback kullanır.
- **Store init**: `store/gameStore.ts` modül yüklenince localStorage’dan hydrate eder (browser ortamında).

## Test Deseni

- `vitest` ile unit/property test yaklaşımı var (ör. `systems/*.test.ts`, `utils/*.test.ts`).


