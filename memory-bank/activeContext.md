# Active Context — Şu an ne yapıyoruz?

## Mevcut Odak

- **Phase 2: Roguelite Loop (Gelişim Sistemi)** kapsamında:
  - Zone sistemi (5 frekans bölgesi) + kilit/açma + persist
  - Magnet + Shield gibi kalıcı upgrade’lerin shop → gameplay entegrasyonu
  - Mobil okunabilirlik: daha az bilişsel yük, daha fazla “akış”

## Son Yapılanlar

- **Zone sistemi (Phase 2)** eklendi:
  - `data/zones.ts`: 5 zone + modifiers + unlockCost
  - `store/gameStore.ts`: `selectedZoneId`, `unlockedZones` persisted + `selectZone`/`unlockZone`
  - `components/Zones/*`: ZoneSelector + Unlock modal (scroll/snap + lock overlay)
  - `components/GameUI.tsx`: menüye zone selector entegre
  - `App.tsx` → `GameEngine.tsx`: seçili zone modifiers (speed/spawn) uygulanıyor
- **Upgrades (Phase 2)**:
  - `data/upgrades.ts`: `magnet`, `shield` eklendi
  - `components/Shop/Shop.tsx`: ikon + effect display eklendi
  - `components/GameEngine.tsx`:
    - Magnet: shard’ları level’e göre radius içinde deterministik şekilde orb’a çeker (lerp)
    - Shield: çarpışmada charge harcar, 2sn invincibility + VFX + engeli temizler

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
