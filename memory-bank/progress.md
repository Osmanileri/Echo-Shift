# Progress — Durum, Yapılanlar, Kalanlar

## Çalışanlar (Kod Tabanından Gözlemlenen)

- Oyun loop + canvas render (`components/GameEngine.tsx`)
- UI orchestration (`App.tsx`) + overlay sistemleri
- Zustand store + localStorage persist (`store/gameStore.ts`, `utils/persistence.ts`)
- Sistem modülleri (ör. daily challenge, restore, tutorial, shop, upgrades, particle/screen shake vb.) `systems/*`
- PWA yapılandırması (`vite.config.ts` + `vite-plugin-pwa`)
- Test altyapısı (Vitest, `*.test.ts`)

## Son Eklenen / Güncellenen (Phase 4 - Audio & VFX Polish)

- **Audio System** (`systems/audioSystem.ts`):
  - Web Audio API tabanlı procedural ses üretimi (dosya gerektirmez).
  - UI sesleri: buton tıklama, menü seçimi, zone seçimi.
  - Gameplay sesleri: swap, near miss, streak bonus, S.H.I.F.T. letter collect.
  - Event sesleri: game start, game over, new high score, purchase.
  - Special sesleri: slow motion, shield activate/block, overdrive.
  - Volume kontrol ve enable/disable özelliği.

- **VFX Polish**:
  - Score popup'ları: Glow efekti, pop-in scale animasyonu, text outline.
  - Particle rendering: Radial gradient fill, dynamic sizing, shadow glow.

## Son Düzeltmeler

- **Tema Sistemi Sadeleştirildi**:
  - `ThemeCreatorModal.tsx`: Sadece **Üst Alan** ve **Alt Alan** renk seçicileri.
  - `deriveFullTheme()` fonksiyonu tüm renkleri otomatik türetiyor.
  - `data/themes.ts`: Tüm temalar `deriveThemeColors()` ile tanımlanıyor.
  - `utils/themeCode.ts`: V2 format (sadece topBg + bottomBg).

- **Orb Border Mantığı (Dinamik Görünürlük)**:
  - Border SADECE orb kendi renkiyle aynı bölgedeyse gösteriliyor.
  - White orb (bottomBg rengi) + bottom zone → border gerekli
  - Black orb (topBg rengi) + top zone → border gerekli
  - Aksi halde orb zaten arka plandan ayrışıyor, border yok.

- **Sıfır Noktası Geçişi (Connector Length Bağlı)**:
  - `computeGapCenter` fonksiyonu tamamen yeniden yazıldı.
  - Blokların midline (sıfır noktası) geçiş miktarı artık **connector uzunluğuna bağlı**.
  - `crossFactor = 0.8`: Çubuk uzunluğunun %80'i kadar midline'ı geçebilir.

- **Hollow Mode Border Düzeltmesi**:
  - Dış çerçeve: Zıt renk (oppositeColor) ile her arka planda görünür kontrast.
  - İç çerçeve: Polarite rengi (obstacleColor) ile hangi orb'un geçebileceğini gösterir.

- **Önceki Gameplay bugfix/tuning**:
  - Shard (elmas) hareket frekansları artırıldı → hareket gözle görülür hale getirildi.

## Önceki Milestone (Phase 4 - UI Overhaul)

- **Modern & Profesyonel UI**:
  - `GameUI.tsx`: Hub tasarımı, temiz ikonografi, güçlü "Başla" aksiyonu.
  - **ZonePickerModal**: Zone seçimi modal içine taşındı, ana ekran ferahladı.
  - **ZoneSelector**: Dikey liste düzenine geçildi, kartlar detaylandırıldı.
  - **Visuals**: Grainy gradient arka planlar, blur efektleri, yumuşak geçişler.

## Son Eklenen / Güncellenen (Phase 3 Milestone)

- **Echo Studio / Theme Creator**:
  - `components/ThemeCreator/ThemeCreatorModal.tsx`: Modernize edildi, canlı preview.
  - `utils/themeCode.ts`: `ECHO-...` tema kodu encode/decode.
  - `utils/colorContrast.ts`: Kontrast oranı hesapları.
- **Hollow Design Rendering**:
  - `store/gameStore.ts`: `hollowModeEnabled` persisted.
  - `components/GameEngine.tsx`: Hollow orb + wireframe obstacles.
- **Custom Theme persist + runtime apply**:
  - `store/gameStore.ts`: `customThemeColors` persisted.
  - `systems/themeSystem.ts`: `custom` tema desteği.

## Son Eklenen / Güncellenen (Phase 2 Milestone)

- **Zone sistemi (Roguelite loop)**:
  - `data/zones.ts`: 5 frekans zone’u + unlockCost + modifiers.
  - `store/gameStore.ts`: Zone seçimi + unlock/persist.
  - `App.tsx` → `components/GameEngine.tsx`: Zone modifiers (speed/spawn) uygulanıyor.
- **Upgrades: Magnet + Shield**:
  - `data/upgrades.ts`: `magnet`, `shield` eklendi.
  - `components/GameEngine.tsx`: Magnet çekimi + Shield (invincibility/VFX).

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

- **Phase 4 (Launch Polish) - TAMAMLANDI**:
  - UI komple yenilendi (Hub tasarım, Glassmorphism).
  - Zone seçimi optimize edildi (yatay scroll, unlock modal).
  - Audio System eklendi (Web Audio API, procedural SFX).
  - VFX Polish yapıldı (score popup glow, particle gradient).
