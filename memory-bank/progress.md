# Progress — Durum, Yapılanlar, Kalanlar

## Çalışanlar (Kod Tabanından Gözlemlenen)

- Oyun loop + canvas render (`components/GameEngine.tsx`)
- UI orchestration (`App.tsx`) + overlay sistemleri
- Zustand store + localStorage persist (`store/gameStore.ts`, `utils/persistence.ts`)
- Sistem modülleri (ör. daily challenge, restore, tutorial, shop, upgrades, particle/screen shake vb.) `systems/*`
- PWA yapılandırması (`vite.config.ts` + `vite-plugin-pwa`)
- Test altyapısı (Vitest, `*.test.ts`)

## Kalanlar / Belirsizler

- Dokümantasyonun konsolidasyonu:
  - `README.md` güncelleme
  - `prd.md` gerçek ürün tanımıyla hizalama veya kaldırma
- Storage key standardizasyonu (tek prefix/tek kaynak)

## Bilinen Sorunlar

- **Doküman uyumsuzluğu**: `README.md` ve `prd.md` mevcut “Echo Shift” kod tabanını yansıtmıyor.
- **Storage key tutarsızlığı**: high score key’i `constants.ts` içinde legacy (`shadow_sync_highscore`), diğer persist key’ler `utils/persistence.ts` içinde `echo-shift-*`.

## Son Milestone

- Memory Bank sistemi repo’ya eklendi (`AGENTS.md` + `memory-bank/`).


