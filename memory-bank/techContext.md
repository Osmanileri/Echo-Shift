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

## Test Durumu

- **364 test** geçiyor
- Property-based testing (fast-check) kullanılıyor
- Tüm ana sistemler test edilmiş
