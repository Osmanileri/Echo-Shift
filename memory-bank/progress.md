# Progress — Durum, Yapılanlar, Kalanlar

## Çalışanlar (Kod Tabanından Gözlemlenen)

- Oyun loop + canvas render (`components/GameEngine.tsx`)
- UI orchestration (`App.tsx`) + overlay sistemleri
- Zustand store + localStorage persist (`store/gameStore.ts`, `utils/persistence.ts`)
- Sistem modülleri (ör. daily challenge, restore, tutorial, shop, upgrades, particle/screen shake vb.) `systems/*`
- PWA yapılandırması (`vite.config.ts` + `vite-plugin-pwa`)
- Test altyapısı (Vitest, `*.test.ts`)

## Son Eklenen / Güncellenen (Phase 1 Milestone)

- **Deterministik pattern progression**: `systems/difficultyProgression.ts` içine `selectPatternForScoreDeterministic` eklendi (Math.random olmadan).
- **Pattern set genişletme**: `data/patterns.ts` 10+ temel pattern ile güncellendi; `heightRatio` artık gap offset tasarımını taşıyor.
- **Engine object pooling entegrasyonu**:
  - `systems/objectPool.ts`: `createEngineObstaclePool`, `createEngineShardPool`
  - `components/GameEngine.tsx`: obstacle + shard spawn artık pool üzerinden, offscreen/collect sonrası release yapıyor.
- **Shard movement RNG injection**: `systems/shardPlacement.ts` `generateShardMovement(type, rand?)` eklendi.

## Son Eklenen / Güncellenen (Phase 2 Milestone)

- **Zone sistemi (Roguelite loop)**:
  - `data/zones.ts`: 5 frekans zone’u + unlockCost + modifiers
  - `store/gameStore.ts`: zone seçimi + unlock/persist (localStorage fallback’li)
  - `components/Zones/ZoneSelector.tsx` + `components/Zones/ZoneUnlockModal.tsx`
  - `components/GameUI.tsx`: menüde scrollable zone selector
  - `App.tsx` → `components/GameEngine.tsx`: zone modifiers (speed/spawn) uygulanıyor
- **Upgrades: Magnet + Shield**:
  - `data/upgrades.ts`: `magnet`, `shield` eklendi (Shop’tan satın alınabilir)
  - `systems/upgradeSystem.ts`: aktif effect set’ine magnet/shield eklendi
  - `components/GameEngine.tsx`:
    - Magnet çekimi: radius içinde shard base pozisyonunu orb’a doğru lerp’ler (deterministik)
    - Shield: collision’da charge harcar, 2sn invincibility + VFX, engeli temizler

## Son Eklenen / Güncellenen (Phase 3 Milestone)

- **Echo Studio / Theme Creator**:
  - `components/ThemeCreator/ThemeCreatorModal.tsx`: renk seçimi + canlı preview + kod kopyala/yapıştır
  - `utils/themeCode.ts`: `ECHO-...` tema kodu encode/decode
  - `utils/colorContrast.ts`: kontrast oranı hesapları (anti-blindness warning)
- **Hollow Design Rendering**:
  - `store/gameStore.ts`: `hollowModeEnabled` persisted
  - `components/GameEngine.tsx`: hollow orb + wireframe obstacles
- **Custom Theme persist + runtime apply**:
  - `store/gameStore.ts`: `customThemeColors` persisted + `setCustomThemeColors`
  - `systems/themeSystem.ts`: `custom` tema desteği
  - `components/GameUI.tsx` + `App.tsx`: `STUDIO` butonu + modal orchestration

## Kalanlar / Belirsizler

- Dokümantasyonun konsolidasyonu:
  - `README.md` güncelleme
  - `prd.md` gerçek ürün tanımıyla hizalama veya kaldırma
- Storage key standardizasyonu (tek prefix/tek kaynak)
- Phase 1 polish:
  - Pattern authoring için `PatternChunk` → `Pattern` compile helper
  - Shard placement’ı `positionOffset` ile “riskli köşe/iki blok arası” şeklinde daha net bağlamak
  
- Phase 2 polish (opsiyonel):
  - Shield charge ve magnet radius değerlerinin UX tuning’i (mobil denge)
  - HUD üzerinde shield charge göstergesi (isteğe bağlı)

## Bilinen Sorunlar

- **Doküman uyumsuzluğu**: `README.md` ve `prd.md` mevcut “Echo Shift” kod tabanını yansıtmıyor.
- **Storage key tutarsızlığı**: high score key’i `constants.ts` içinde legacy (`shadow_sync_highscore`), diğer persist key’ler `utils/persistence.ts` içinde `echo-shift-*`.

## Son Milestone

- Phase 1’de motorun temel taşları güçlendirildi:
  - Pattern spawn deterministik hale getirildi
  - Object pooling GameEngine’e entegre edildi
  - Shard’lar pattern geometrisine bağlandı (random mesafe yerine)

- Phase 2’de roguelite loop başlatıldı:
  - Zone selector + unlock/persist
  - Magnet + Shield upgrades gameplay’e entegre

- Phase 3’te özelleştirme katmanı başlatıldı:
  - Echo Studio (Theme Creator) + paylaşılabilir tema kodu
  - Hollow render modu + custom theme persist
