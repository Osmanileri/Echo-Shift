# Active Context — Şu an ne yapıyoruz?

## Mevcut Odak

- **Phase 1: Core Engine Overhaul** (Offline Roguelite Arcade dönüşümü) kapsamında:
  - Pattern-based spawning’i deterministik ve “designed” hale getirme
  - Object pooling’i GameEngine hot-path’ine entegre etme
  - Physical shard’ları pattern geometrisine bağlama (rastgele konum yerine)

## Son Yapılanlar

- `GameEngine.tsx` içinde pattern spawn hattı “deterministik pacing + pool reuse” ile güncellendi:
  - Yeni pattern seçimi: `DifficultyProgression.selectPatternForScoreDeterministic`
  - Pattern timing: hız arttıkça pattern duration/timeOffset ölçekleniyor
  - Obstacle + shard oluşturma artık pool üzerinden (alloc yerine reuse)
- `data/patterns.ts` pattern set’i genişletildi (10+ temel desen, heightRatio ile learnable gap offset)
- `systems/shardPlacement.ts` RNG injection eklendi (`generateShardMovement(type, rand?)`)
- `systems/objectPool.ts` içine engine-uyumlu yeni pool’lar eklendi (`createEngineObstaclePool`, `createEngineShardPool`)

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
