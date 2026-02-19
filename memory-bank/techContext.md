# Tech Context — Stack, Kurulum, Kısıtlar

## Teknolojiler

| Kategori | Teknoloji |
|----------|-----------|
| Frontend | React 18 + TypeScript |
| Build/Dev | Vite 5 |
| State | Zustand (subscribeWithSelector middleware) |
| Test | Vitest + fast-check (property-based) |
| PWA | vite-plugin-pwa (autoUpdate) |
| Persistence | localStorage (güvenli adapter + fallback) |
| Audio | Web Audio API (procedural sound generation) |
| Mobile | Capacitor (iOS App Store deployment) |

## Çalıştırma

```bash
npm install          # Bağımlılıkları yükle
npm run dev          # Vite dev server
npx vitest run       # Test çalıştır (tek seferlik)
npm run build        # Production build
npm run preview      # Build önizleme
```

## Önemli Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `vite.config.ts` | PWA manifest, runtime caching |
| `vitest.config.ts` | Test include/exclude ayarları |
| `constants.ts` | Gameplay config |
| `utils/persistence.ts` | Storage adapter + standardize key'ler |
| `systems/audioSystem.ts` | Web Audio API SFX |

## Storage Key Standardizasyonu

Tüm key'ler `echo-shift-` prefix'i kullanır:

```typescript
// utils/persistence.ts
export const STORAGE_KEYS = {
  GAME_STATE: 'echo-shift-game-state',
  ECHO_SHARDS: 'echo-shift-echo-shards',
  INVENTORY: 'echo-shift-inventory',
  EQUIPPED: 'echo-shift-equipped',
  CAMPAIGN: 'echo-shift-campaign',
  SETTINGS: 'echo-shift-settings',
  GHOST_DATA: 'echo-shift-ghost',
  DAILY_CHALLENGE: 'echo-shift-daily',
  LEADERBOARD: 'echo-shift-leaderboard',
};
```

## Kısıtlar / Notlar

- Game loop "hot path" React render ile değil, canvas + refs ile çalışıyor
- Performans kritik kodlar `GameEngine.tsx` içinde
- Backend yok, tüm kalıcılık localStorage ile
- Audio dosya gerektirmez, procedural üretilir
- **Performance-critical code MUST avoid per-frame allocations** (see systemPatterns.md > Performance Optimization Patterns)
- Hot-path fonksiyonlar pre-allocated singleton nesneler döndürmeli (caller store etmemeli)
- `Date.now()` frame başında 1 kez çağrılmalı, geri kalan tüm kullanımlar cache'den okunmalı

## Test Durumu

- **747 test** toplam (720 pass, 27 pre-existing fail)
- 27 fail: 21 glitchSystem + 6 particleSystem (pre-existing, optimizasyon sonrası değişmedi)
- Property-based testing (fast-check) kullanılıyor
- Tüm ana sistemler test edilmiş

## Performance Modülü

| Dosya | Amaç |
|-------|------|
| `systems/performanceUtils.ts` | Pre-allocated buffers, in-place utils, frame time cache |

### Optimize Edilmiş Dosyalar
- `systems/EnemyManager.ts` — In-place mutation, trail optimization, cached draw time
- `systems/blockSystem.ts` — Pre-allocated oscillation, in-place filtering, for-loops
- `systems/particleSystem.ts` — For-loops, direct count (no filter allocation)
- `systems/GlitchVFX.ts` — Pre-allocated jitter/polygon/connector, reduced iterations
- `components/GameEngine.tsx` — Temp-modify-restore orbs, 32× Date.now()→frameTime, gradient removal, in-place obstacle compaction
