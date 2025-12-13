# Tech Context — Stack, Kurulum, Kısıtlar

## Teknolojiler

- **Frontend**: React 18 + TypeScript
- **Build/Dev**: Vite 5
- **State**: Zustand (subscribeWithSelector middleware)
- **Test**: Vitest
- **PWA**: `vite-plugin-pwa` (autoUpdate)
- **Persistence**: localStorage (güvenli adapter + fallback)

## Çalıştırma

- `npm install`
- `npm run dev` (Vite dev server)
- `npm run test` (Vitest)
- `npm run build` / `npm run preview`

## Önemli Dosyalar

- `vite.config.ts`: PWA manifest, runtime caching, env define (GEMINI_API_KEY)
- `vitest.config.ts`: test include/exclude ayarları
- `constants.ts`: gameplay config ve bazı storage key’ler
- `utils/persistence.ts`: storage adapter + key’ler

## Kısıtlar / Notlar

- Game loop “hot path” React render ile değil, canvas + refs ile çalışıyor; performans kritik kodlar burada.
- Storage key’lerde legacy/ikili kullanım mevcut olabilir (bkz. `constants.ts` vs `utils/persistence.ts`).


