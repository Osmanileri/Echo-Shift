# Active Context — Şu an ne yapıyoruz?

## Mevcut Odak

- **Glitch Protocol GameEngine Integration** - TAMAMLANDI ✅
  - Quantum Lock bonus modu GameEngine'e entegre edildi
  - Glitch Shard spawn logic (500m sonra, seviye başına 1 kez)
  - Collision detection ve hit stop efekti
  - Mode updates (phase transitions, wave offset, ghost mode)
  - VFX rendering (sinus tunnel, static noise, screen flash)
  - Connector visual effects (green tint, pulse animation)
  - Existing systems integration:
    - Obstacle spawn blocking during Quantum Lock
    - Invulnerability during Quantum Lock and Ghost Mode
    - 2x shard multiplier during Quantum Lock
    - Speed stabilization during Quantum Lock
    - Overdrive/Resonance pause/resume
  - 710 test geçiyor

- **Phase Dash Dönüşüm Animasyonu** - TAMAMLANDI ✅
  - Çubuk → Enerji Topu → Çubuk dönüşümü
  - Transform phases: idle → transforming_in → active → transforming_out → idle
  - Dönen RGB enerji topu (cyan/magenta gradient)
  - Pulse efekti ve rotating border rings
  - `shouldHidePlayer()` ile çubuk gizleme
  - Speed lines, vignette, camera shake
  - Debris parçacıkları (blok patlatma)
  - 566 test geçiyor

- **Phase Dash VFX Profesyonelleştirme** - TAMAMLANDI ✅
  - Eski basit yuvarlak top ghost trail kaldırıldı
  - RGB Split efekti eklendi (hologram görünümü)
  - Speed Lines (Warp efekti) eklendi
  - Player Aura (nabız atan enerji halkası) eklendi
  - Camera Shake (kamera sarsıntısı) eklendi
  - Vignette (odaklanma efekti) eklendi
  - Comet Tail (kuyruklu yıldız parçacıkları) eklendi
  - Burst Particles (aktivasyon patlaması) eklendi
  - Neon/Cyberpunk estetiğine uygun tasarım
  - 566 test geçiyor

- **Mobile-Friendly Gameplay Tuning** - TAMAMLANDI ✅
  - Oyun hızı azaltıldı (mobil için daha kolay)
  - İlk 3 seviye çok yavaş (tutorial-like)
  - Spawn rate azaltıldı
  - Debug özellikleri kaldırıldı (immortality, teleport, debug overlay)
  - Holographic gate kaldırıldı (distance-based completion)

## Son Yapılanlar

### Campaign Update v2.5 (Tamamlandı)
- `data/levels.ts`: Distance-based level configuration
  - `calculateTargetDistance()`: 350 + (level * 100) * (level ^ 0.1)
  - `calculateBaseSpeed()`: 10 + (level * 0.4)
  - `calculateObstacleDensity()`: min(1.0, 0.5 + (level * 0.02))
  - Chapter sistemi: SUB_BASS, BASS, MID, HIGH, PRESENCE
- `systems/distanceTracker.ts`: Mesafe takip sistemi
  - Climax zone detection (son %20)
  - Near finish detection (son 50m)
- `systems/speedController.ts`: Progressive speed
  - Formula: baseSpeed * (1 + (currentDistance / targetDistance) * 0.3)
  - Climax multiplier: 1.2x (500ms smooth transition)
- `systems/campaignSystem.ts`: Star rating ve reward sistemi
  - 1 star: Survivor (health > 0)
  - 2 stars: Collector (>= 80% shards)
  - 3 stars: Perfectionist (no damage)
  - First-clear bonus: 50 + (level * 10)
  - Base reward: 10 + (level * 3) + (stars * 5)
- `systems/climaxVFX.ts`: Climax zone visual effects
  - Starfield stretch (1.0 - 2.0)
  - Chromatic aberration (0 - 10px)
  - FOV increase (1.0 - 1.15)
  - Screen flash on finish
- `systems/holographicGate.ts`: Finish line gate
  - Visible within 100m of target
  - BPM-synced pulse animation
  - Shatter animation on pass-through
  - Warp jump acceleration
- `components/VictoryScreen/VictoryScreen.tsx`: Victory animations
  - Slow motion effect (0.2x for 1 second)
  - Sequential star reveal (300ms delay)
  - Flying currency animation (10-20 particles)
- `components/Campaign/LevelMap.tsx`: Level map animations
  - Path unlock animation
  - Unlock pop animation
  - Chapter background cross-fade
- `systems/environmentalEffects.ts`: Environmental effects
  - Shard collection particle burst
  - BPM-synced obstacle pulse
  - Glitch artifact on damage
  - Haptic feedback integration
- `systems/campaignIntegration.test.ts`: Integration tests
  - Complete level flow testing
  - First-clear vs replay scenarios
  - Chapter transitions
  - VFX trigger verification

## Tamamlanan Spec'ler

| Spec | Durum | Test |
|------|-------|------|
| glitch-protocol | ✅ TAMAMLANDI | 710 test |
| campaign-update-v25 | ✅ TAMAMLANDI | 526 test |
| echo-constructs | ✅ TAMAMLANDI | ✅ |
| procedural-gameplay | ✅ TAMAMLANDI | ✅ |
| echo-shift-professionalization | ✅ TAMAMLANDI | ✅ |
| echo-shift-engagement | ✅ TAMAMLANDI | ✅ |
| echo-shift-v2-mechanics | ✅ TAMAMLANDI | ✅ |
| advanced-game-mechanics | ✅ TAMAMLANDI | ✅ |
| progression-system | ✅ TAMAMLANDI | ✅ |

## ⚠️ KRİTİK KURAL: GameEngine Modülarizasyonu

> [!CAUTION]
> **GameEngine.tsx'e YENİ KOD EKLEME!**
> 
> Bu dosya ~6800 satır. Daha fazla büyümemeli. Tüm yeni özellikler AYRI DOSYALARDA oluşturulmalı!

### 🔴 ZORUNLU Yaklaşım (ÖNEMLİ!)
| Ekleme Türü | Nereye Ekle | Örnek |
|-------------|-------------|-------|
| Yeni sistem/özellik | `systems/` | `systems/newFeature.ts` |
| Rendering mantığı | Ayrı dosya | `utils/newRenderer.ts` |
| Yardımcı fonksiyonlar | `utils/` | `utils/newHelper.ts` |

### GameEngine'de SADECE İzin Verilenler:
1. Import statement (1 satır)
2. State ref tanımı (1 satır)  
3. Sistem çağrısı (1 fonksiyon call)

### Aralık 2025 Temizlik:
- ✅ `components/GameEngine/` klasörü silindi (4600 satır duplicate)
- ✅ Array operations optimize edildi (in-place loops)
- ✅ Yedek: `GameEngine.backup.tsx`

---

## Bilinen Konular / Riskler

- ~~`README.md` ve `prd.md` güncel değil~~ → ✅ Düzeltildi
- ~~Storage key tutarsızlığı~~ → ✅ Standardize edildi
- Test dosyalarında önceden var olan TypeScript hataları (restoreSystem.test.ts, midlineSystem.test.ts) - çalışmayı etkilemiyor

## Sonraki Adımlar (Opsiyonel)

1. **Bekleyen Özellikler (Kodlanmış ama UI'a bağlanmamış)**:
   - Leaderboard (Skor Tablosu)
   - Zen Mode (Rahat Mod)
   - Ghost Racer (Hayalet Yarışçı)

2. **Yeni Özellikler**:
   - Multiplayer/Co-op Mode
   - Boss Battles
   - Seasonal Events
   - Achievement System
   - Custom Level Editor

3. **Performans Optimizasyonu**:
   - Object pooling genişletme
   - Canvas rendering optimizasyonu
   - Memory profiling

4. **UX İyileştirmeleri**:
   - Onboarding flow geliştirme
   - Accessibility iyileştirmeleri
   - Localization (çoklu dil desteği)

## Campaign Update v2.5 Özellikleri

### Ana Değişiklikler
- **Distance-Based Gameplay**: Skor yerine mesafe (metre) ana metrik
- **Campaign as Main Mode**: "Başla" butonu direkt level selection açıyor
- **Progressive Speed**: Seviye boyunca hız artışı + climax boost
- **Star Rating**: Survivor (1★), Collector (2★), Perfectionist (3★)
- **Visual Feedback**: Warp effects, chromatic aberration, holographic gate

### Yeni Sistemler
- `distanceTracker.ts`: Mesafe takibi ve climax zone detection
- `speedController.ts`: Progressive speed ve climax multiplier
- `climaxVFX.ts`: Climax zone visual effects
- `holographicGate.ts`: Finish line gate sistemi
- `environmentalEffects.ts`: Collection/damage effects

### Test Coverage
- 27 property-based test (fast-check)
- 12 integration test
- Toplam 526 test geçiyor


ECHO SHIFT: SYSTEM ROLE & BEHAVIORAL PROTOCOLS

ROLE: Senior Game Systems Architect & Avant-Garde Game Designer.

EXPERIENCE: 15+ years in high-performance mobile gaming. Specialist in Canvas API optimization, Mathematical Physics ($Linear Algebra$), and High-Stakes FTUE (First Time User Experience).

CONTEXT: Lead Architect for "Echo Shift" — a minimalist, neon-glitch, dual-orb arcade reflex game built on React Native & HTML5 Canvas.

1. OPERATIONAL DIRECTIVES (DEFAULT MODE)
Project Alignment: Every solution must strictly adhere to the core "Dual-Orb" and "Swap-on-Release" mechanics.



Performance First: Code must target a stable 60 FPS. Avoid unnecessary re-renders, object allocations, or Garbage Collection (GC) triggers within the game loop.

Zero Fluff: No philosophical preamble. Focus directly on the engineering solution and visual implementation.

Modular Architecture: Refactor code to break down the "God Object" (GameEngine.tsx). Distribute logic into dedicated hooks, systems, and managers.

2. THE "ULTRATHINK" PROTOCOL (TRIGGER COMMAND)

TRIGGER: When the user prompts "ULTRATHINK", suspend brevity and engage in deep-level reasoning.
Mathematical Rigor: Explain speed and movement formulas (e.g., $sqrt$ or $asymptotic$ scaling) with logical proofs.
Juiciness & Game Feel: Analyze mechanics through the lens of visual/haptic feedback (Screen Shake, Particle Bursts, Chromatic Aberration).
Technical Lens: Calculate DeltaTime independence, Object Pooling efficiency, and Canvas Compositing costs.
Psychological Lens: Evaluate Cognitive Load and the "Flow State" balance (Challenge vs. Skill).
3. DESIGN PHILOSOPHY: "GLITCH MINIMALISM"
Anti-Generic: Reject standard UI templates. Strive for bespoke, asymmetric, and "Cyber-Digital" aesthetics.
Intentionality: Every pixel on the HUD must have a calculated purpose. If an element does not serve gameplay or clarity, delete it.
VFX Strategy: Animations are servants to mechanics (e.g., use Chromatic Aberration specifically to emphasize the "Swap" action).
4. FRONTEND & GAME ENGINE STANDARDS
Canvas Discipline: Isolate drawing logic from the GameEngine. Use SpiritRenderer.ts or VFXManager.ts subsystems.
State Management: Use useRef for high-frequency mutable states (positions, velocities) and Zustand for global UI/Store states.
Code Quality: Strict TypeScript mode. Code must be production-ready, modular, and optimized for mobile performance (APK/IPA).
5. RESPONSE FORMAT
IF NORMAL:
Engineering Rationale: (1 sentence explaining the choice of algorithm or VFX).
The Implementation: (Clean, modular code block).
IF "ULTRATHINK" IS ACTIVE:
Deep Reasoning Chain: (Detailed breakdown of architecture, math, and design decisions).
VFX & Feedback Layer: (Plan for visual/haptic implementation).
Edge Case Analysis: (Handling high-speed collisions, input lag, or memory leaks).
The Code: (Optimized, production-grade React Native/Canvas logic).

