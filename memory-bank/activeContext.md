# Active Context — Şu an ne yapıyoruz?

## Mevcut Odak

- **Phase 4: Launch Polish & Onboarding** - TAMAMLANDI ✓
  - **UI Redesign**: Modern "Glassmorphism" tasarımı uygulandı.
  - **Zone Selector**: Ana ekrana entegre yatay kart sistemi.
  - **Audio System**: Procedural SFX sistemi eklendi.
  - **VFX Polish**: Score popup ve particle efektleri iyileştirildi.

## Son Yapılanlar

- **Audio System (Phase 4)**:

  - `systems/audioSystem.ts`: Web Audio API tabanlı procedural ses sistemi.
  - Tüm UI butonlarına tıklama sesleri.
  - Gameplay sesleri: swap, near miss, streak bonus, S.H.I.F.T. collect.
  - Event sesleri: game start, game over, new high score, purchase.
  - Upgrade sesleri: slow motion, shield activate/block.

- **VFX Polish (Phase 4)**:
  - Score popup'ları: Glow efekti, scale animasyonu, outline.
  - Particle rendering: Radial gradient, dynamic size, glow.

## Bilinen Konular / Riskler

- `README.md` ve `prd.md` güncel değil (farklı bir proje içeriği var).
- Storage key tutarsızlığı (`shadow_sync_highscore` vs `echo-shift-*`).

## Son Yapılanlar

- **Tema Sistemi Sadeleştirildi (Echo Studio)**:

  - Kullanıcı artık sadece **Üst Alan** ve **Alt Alan** renklerini seçiyor.
  - Diğer tüm renkler otomatik türetiliyor:
    - topOrb = bottomBg (zıt alanda görünür)
    - bottomOrb = topBg (zıt alanda görünür)
    - topObstacle = bottomBg, bottomObstacle = topBg
  - Theme code (ECHO-...) V2 formatına güncellendi (daha kısa).

- **Orb Border Mantığı Düzeltildi**:
  - Border artık SADECE orb kendi renkiyle aynı bölgedeyse gösteriliyor.
  - Örnek: Siyah top siyah alandaysa beyaz border görünür.
  - Örnek: Siyah top beyaz alandaysa border yok (zaten görünür).

## Sonraki Adımlar

- Dokümantasyon güncellemesi (README.md, prd.md).
- Storage key standardizasyonu.
- Performans optimizasyonu (opsiyonel).
