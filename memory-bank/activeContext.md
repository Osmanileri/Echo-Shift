# Active Context — Şu an ne yapıyoruz?

## Mevcut Odak

- **Phase 3: Echo Studio (Özelleştirme)** kapsamında:
  - Hollow mode (orb + obstacle wireframe) ile daha modern/temiz görsel dil
  - Theme Creator: renk seçimi, kontrast kontrolü, paylaşılabilir tema kodu
  - Custom theme persist + ThemeSystem ile runtime uygulama

## Son Yapılanlar

- **Echo Studio altyapısı (Phase 3)** eklendi:
  - `components/ThemeCreator/ThemeCreatorModal.tsx`: Theme Creator overlay (picker + preview + code)
  - `utils/themeCode.ts`: tema encode/decode (`ECHO-...`)
  - `utils/colorContrast.ts`: WCAG contrast ratio hesapları + uyarı üretimi
  - `store/gameStore.ts`: `customThemeColors` + `hollowModeEnabled` persist + setter action’lar
  - `systems/themeSystem.ts`: `custom` tema desteği (`setCustomThemeColors`)
  - `components/GameUI.tsx`: menüye `STUDIO` butonu
  - `App.tsx`: Studio modal orchestration
  - `components/GameEngine.tsx`: Hollow mode render (orb fill=bg, stroke=identity; obstacles wireframe)

## Bilinen Konular / Riskler

- `README.md` içeriği bu repo ile uyumsuz görünüyor (Expo temalı starter README).
- `prd.md` içeriği de mevcut projeyi yansıtmıyor (farklı bir ürün dokümanı).
- Storage key’lerde ikili durum: `constants.ts` içindeki `shadow_sync_highscore` ile `utils/persistence.ts` içindeki `echo-shift-*` anahtarları farklı prefix’lerde.
- `GameEngine.tsx` içinde bazı “non-core” sistemlerde halen `Math.random()` kullanımı var (S.H.I.F.T. spawn, gravity flip chance, bazı VFX). Phase 1 hedefi “spawn mantığını” deterministik yapmakla karşılandı; istersek sonraki adımda bunlar da seed’li RNG’ye taşınabilir.

## Sonraki Adımlar (Opsiyonel)

- `README.md`’yi “Echo Shift” projesine uygun hale getirmek.
- `prd.md`’yi kaldırmak ya da `docs/` altına arşivlemek / güncellemek.
- Storage key konsolidasyonu (high score dahil) ve `safeClear` davranışını netleştirmek.
- Pattern authoring tarafında `PatternChunk` → `Pattern` compile helper eklemek (şu an sadece type olarak var)
- Shard placement’i `PatternShard.positionOffset` ile daha “tasarlanmış” (riskli köşe/iki blok arası) hale getirmek
