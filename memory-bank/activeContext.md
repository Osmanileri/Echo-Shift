# Active Context — Şu an ne yapıyoruz?

## Mevcut Odak

- **Procedural Music System v2 — Full Rhythm Engine** - TAMAMLANDI ✅
  - Hedef: Müzik sistemi tamamen yeniden yazıldı — hissedilir, efektif, profesyonel seviyede
  - **7 katmanlı müzik**: Kick + Snare + Hi-hat + Bass + Synth Pad + Lead Melody + Arp
  - **Akor progresyonu**: Am7 → Fmaj7 → Cmaj7 → G7 (8 bar döngü)
  - **Değişiklikler**:
    - `constants.ts`: BEAT_MUSIC_CONFIG tamamen yenilendi — gain'ler 2-3x artırıldı, unlock threshold'lar dramatik düşürüldü (bass: 0, pad: 200, lead: 600, arp: 2500)
    - `systems/audioSystem.ts`: Müzik bölümü tamamen yeniden yazıldı (~290 satır → ~450 satır)
  - **Yeni enstrümanlar**:
    - Kick: Sub-bass sine sweep (150→40Hz) + click transient katmanı — punchy EDM kick
    - Snare: Noise burst + tuned sine body — backbeat groove (beat 2 & 4)
    - Hi-hat: Open/closed hat pattern — 1/8th note groove
    - Bass: Sawtooth → LP filter → envelope — syncopated rhythm, baştan çalar (score 0)
    - Synth Pad: 2× detuned saw osc → LP filter — sıcak akor atmosferi (score 200)
    - Lead Melody: Square + saw blend + vibrato LFO + LP filter — 2 alternatif 16-beat fraz (score 600)
    - Arp: Triangle 1/16th patterns akor tonları üzerinde (score 2500)
  - **Dinamik filtreler**: Bass ve pad filtreleri skor arttıkça açılır
  - Build: 0 yeni TypeScript hatası

- **Mobile UI/UX Layout Overhaul** - TAMAMLANDI ✅
  - Hedef: Tüm arayüzlerin (ana sayfa, oyun içi, paneller, modallar) telefona uygun mobil oyun görünümüne getirilmesi
  - **14 Komponent Audit Edildi** — P0/P1/P2 sorunlar tespit ve düzeltildi
  - **13 dosyada 50+ düzeltme** — sıfır yeni TypeScript hatası

  ### Uygulanan Düzeltmeler:

  #### P0 — Kritik Scroll Düzeltmeleri (İçerik Kırpılması):
  1. **VictoryScreen.tsx** — `overflow-y-auto` + safe area padding eklendi, background'lar `fixed` yapıldı, butonlar `my-auto` ile merkezlendi
  2. **MissionPanel.tsx** — Content area'ya `overflow-y-auto flex-1 min-h-0` eklendi, panel'e safe area `maxHeight` eklendi
  3. **NumbersMissionVictory.tsx** — `overflow-y-auto` + safe area padding, `my-auto` centering, background'lar `fixed`

  #### P1 — Safe Area + Touch Target Düzeltmeleri:
  4. **GameUI.tsx MENU** — Safe area padding (top/bottom), logo responsive (`text-[2rem] sm:text-5xl`), spacing sıkılaştırıldı, tutorial cards `flex-1 min-h-0 overflow-y-auto`
  5. **GameUI.tsx PAUSED** — Safe area padding eklendi
  6. **GameUI.tsx GAME_OVER** — `overflow-y-auto` + safe area, buton touch target artırıldı (`py-3.5`, `rounded-xl`)
  7. **GameUI.tsx PLAYING** — Progress bar + multiplier/streak safe area positioning (`calc(max(...) + offset)`)
  8. **ChapterNotification.tsx** — `fixed top-4` → `style={{ top: 'max(1rem, var(--safe-top, 0px))' }}`
  9. **RatePrompt.tsx** — Close button `p-1` → `p-2.5` (22px → 40px), dismiss `py-1.5` → `py-3`
  10. **RitualsPanel.tsx** — Bare `✕` → proper `<X>` icon in `p-2.5` button, safe area `maxHeight`, `flex-1 min-h-0 overflow-y-auto`
  11. **RestorePrompt.tsx** — `overflow-y-auto` + safe area, decline `py-2.5` → `py-3.5 rounded-xl`
  12. **Shop.tsx** — Close `p-1.5` → `p-2.5`, tab `py-2` → `py-3`, buy button `px-2 py-1.5` → `px-3 py-2`, safe area `maxHeight`
  13. **DailyChallenge.tsx** — Close `p-1.5` → `p-2.5`, start `py-2.5` → `py-3.5 rounded-xl`, safe area `maxHeight`
  14. **TutorialOverlay.tsx** — Skip/X `p-1.5` → `p-2.5`, back/next `py-1.5` → `py-2.5`, "Atla" button `no padding` → `px-3 py-2.5 rounded-lg`
  15. **MissionComplete.tsx** — Close `p-1.5` → `p-2.5`, safe area padding on root
  16. **ThemeCreatorModal.tsx** — Close `p-2` → `p-2.5`, safe area `maxHeight`, COPY/APPLY buttons paddings artırıldı

  #### P2 — Minimum Text Size (11px) Düzeltmeleri:
  17. **GameUI.tsx** — `text-[8px]` (×3 stat labels) → `text-[11px]`, `text-[9px]` (×3 music/tutorial/footer) → `text-[11px]`
  18. **ChapterNotification.tsx** — `text-[10px]` "Bölüm" label → `text-[11px]`
  19. **VictoryScreen.tsx** — `text-[10px]` distance label → `text-[11px]`
  20. **RestorePrompt.tsx** — `text-[10px]` rewind info → `text-[11px]`
  21. **Shop.tsx** — 4× `text-[10px]` (upgrade level/desc/effect/MAX) → `text-[11px]`
  22. **DailyChallenge.tsx** — 2× `text-[10px]` (date/modifier) → `text-[11px]`
  23. **TutorialOverlay.tsx** — 2× `text-[10px]` (step counter/skip) → `text-[11px]`
  24. **ThemeCreatorModal.tsx** — 9× `text-[10px]` → `text-[11px]` (labels, inputs, buttons, errors)
  25. **SpiritShop.tsx** — `text-[9px]` VFX badge → `text-[11px]`

- **Comprehensive Mobile Audit & Fixes** - TAMAMLANDI ✅
  - Hedef: Mobil oyun olduğu için eksikleri tespit et ve düzelt
  - **30 Issue Tespit Edildi** (6 CRITICAL, 8 HIGH, 10 MEDIUM, 6 LOW)
  - **22+ Fix Uygulandı** — sıfır yeni TypeScript hatası

  ### Uygulanan Düzeltmeler:
  1. **viewport-fit=cover** eklendi (index.html) — notch/Dynamic Island desteği
  2. **Canvas DPR/Retina desteği** (GameEngine.tsx) — `devicePixelRatio` ile buffer scaling + `ctx.setTransform(dpr,0,0,dpr,0,0)`
  3. **iOS portrait-only lock** (Info.plist + AppDelegate.swift) — landscape devre dışı
  4. **arm64 zorunlu** (Info.plist) — armv7 kaldırıldı
  5. **UIStatusBarStyle** (Info.plist) — LightContent
  6. **Capacitor config genişletme** (capacitor.config.ts) — backgroundColor, iOS/Android config, SplashScreen/StatusBar/Keyboard plugins
  7. **CDN Tailwind → Local PostCSS build** — `@tailwindcss/postcss` + `postcss.config.js` + `index.css`
  8. **Safe area CSS vars** (index.html) — `--safe-top/bottom/left/right` root padding yerine
  9. **iPad touch detection fix** (GameEngine.tsx) — screen width yerine touch capability + Capacitor detection
  10. **Apple touch icon PNG** (index.html) — SVG → PNG
  11. **.mixWithOthers kaldırıldı** (AppDelegate.swift) — ritim oyunu exclusive audio
  12. **BeatEngine unmount cleanup** (GameEngine.tsx) — `BeatEngine.stop()` eklendi
  13. **BeatEngine duplicate callback fix** (beatEngine.ts) — `_onBeatCallbacks.length = 0` before push
  14. **GameUI safe area insets** (GameUI.tsx) — `var(--safe-top)` ile HUD elemanları
  15. **Vite build optimizations** (vite.config.ts) — es2020 target, no sourcemap, vendor chunking
  16. **Manifest dedup** — `public/manifest.json` silindi (VitePWA kendi oluşturuyor)
  17. **Android back button** (App.tsx) — `CapApp.addListener('backButton')` ile UI katman navigasyonu
  18. **StatusBar management** (App.tsx) — PLAYING'de hide, menüde show + Dark style
  19. **App lifecycle** (App.tsx) — `visibilitychange` ile auto-pause, analytics flush, state save
  20. **ErrorBoundary** (components/ErrorBoundary.tsx) — beyaz ekrana düşmeyi önleyen recovery UI
  21. **ErrorBoundary entegrasyonu** (index.tsx) — `<App />` sarmalandı
  22. **SplashScreen plugin** — `@capacitor/splash-screen` kuruldu, App.tsx'de `SplashScreen.hide()` mount'ta çağrılıyor
  23. **Android platform** — `@capacitor/android` kuruldu, `npx cap add android` ile platform eklendi
  24. **Android portrait-only** (AndroidManifest.xml) — `screenOrientation="portrait"`
  25. **Android dark theme** (styles.xml) — Siyah navigation/status bar, #6366f1 accent
  26. **Touch preventDefault** (GameEngine.tsx) — touchstart/move/end'de `e.preventDefault()` — scroll/zoom/pull-to-refresh engellendi
  27. **Canvas ResizeObserver** (GameEngine.tsx) — Viewport değişikliklerinde (address bar, split-screen) otomatik canvas yeniden boyutlandırma
  28. **Package.json scripts** — `android:open` ve `android:build` eklendi

  ### Rhythm System (Önceki Oturum):
  - `systems/beatEngine.ts`: Global BPM clock (start/stop/pause/resume)
  - `systems/audioSystem.ts`: Layered procedural music (kick/hihat/bass/arp)
  - `systems/rhythmSystem.ts`: BPM-driven tolerance
  - `constants.ts`: BPM_CONFIG, BEAT_MUSIC_CONFIG
  - Mobile audio optimizations: AudioContext lifecycle, node cleanup, iOS AVAudioSession

- **Tutorial System Complete Rewrite** - TAMAMLANDI ✅
  - Hedef: Baştan sona çalışan, profesyonel, tek hikaye altında tüm fazları anlatan eğitim sistemi
  - **10 Kritik Bug Düzeltildi:**
    1. 🔴 INTRO→NAVIGATION phaseIndex güncellenmiyordu → `advanceToNextPhase()` kullanılıyor
    2. 🔴 Obstacle ID'ler her frame değişiyordu (`obs-${x}-${y}`) → stabil `block.id` kullanılıyor
    3. 🔴 SPEED_TEST targetGoal=10 ama 8 blok → targetGoal=8 (eşleştirildi)
    4. 🔴 TutorialInfoModal React JSX canvas callback içinde (asla render edilmiyordu) → canvas-based modal
    5. 🟡 failPhase sub-state'leri resetlemiyordu → tam reset (swap, navigation, counters)
    6. 🟡 Dead `updateNavigationPhase` fonksiyonu → kaldırıldı (tek temiz fonksiyon)
    7. 🟡 SWAP_MECHANIC ikinci blok delay çok kısa → 6200ms→10000ms
    8. 🟡 COLOR_MATCH/SHARP_MANEUVER counter'lar collision'da sıfırlanmıyordu → sıfırlanıyor
    9. 🟢 `speedTestBlocksPassed` / `speedTestPassedIds` eklendi (SPEED_TEST persistent counter)
    10. 🟢 `swapSuccessCount` eklendi (swap progress tracking)
  - **Değiştirilen Dosyalar:**
    - `systems/interactiveTutorialSystem.ts` — TAM YENİDEN YAZIM (1248 satır → 680 satır temiz kod)
    - `systems/tutorialBlockPatterns.ts` — SWAP delay düzeltmesi
    - `components/GameEngine.tsx` — Stabil obstacle ID, canvas-based info modal, unused import kaldırma
  - **Test**: 720/747 (baseline korundu, 27 pre-existing fail)

- **Comprehensive Performance Optimization for Mobile 60fps** - TAMAMLANDI ✅
  - Hedef: App Store deployment için mobilde donma/takılma olmadan 60fps
  - **32 Issue Tespit Edildi** (12 CRITICAL, 11 HIGH, 9 MEDIUM)
  - **Uygulanan Optimizasyonlar:**
    - `systems/performanceUtils.ts`: Pre-allocated reusable objects + utility functions modülü
    - **EnemyManager.ts** (6 optimizasyon):
      - `updateEnemy()`: Spread-copy → in-place mutation (3-5 spread kopyası/frame eliminasyonu)
      - `updateSpawnScheduler()`: Spread-copy → in-place mutation + pre-allocated result object
      - `spawnDart()`, `resetDart()`, `counterDart()`, `applyKnockback()`: Spread → in-place
      - `updateEnemyAnimation()`: Trail `.map().filter()` → in-place swap-and-truncate loop
      - Trail rendering: Per-trail `createRadialGradient` → solid color circles
      - 3x `Date.now()` → cached `_cachedDrawTime` + `setDrawTime()` API
    - **blockSystem.ts** (4 optimizasyon):
      - `calculateOscillationTransform()`: New object → pre-allocated `_oscResult`
      - `filterOffscreenBlocks()`: `.filter()` new array → in-place compaction
      - `updateBlockPositions()`: `forEach` → `for` loop + pre-computed `combinedSpeed`
      - `renderAllBlocks()`: `forEach` → `for` loop
    - **particleSystem.ts** (3 optimizasyon):
      - `update()`: `forEach` → `for` loop with `continue`
      - `draw()`: `forEach` → `for` loop with `continue`
      - `getParticleCount()`: `filter().length` → direct counting `for` loop
    - **GlitchVFX.ts** (5 optimizasyon):
      - `generateJitterOffset()`: New object → pre-allocated `_jitterResult`
      - `generateDistortedPolygon()`: New array + N objects → pre-allocated buffer
      - `getConnectorRenderOptions()`: New object → pre-allocated `_connectorOpts`
      - `renderSinusTunnel()`: Step sizes artırıldı (5→8, 2→3/4) - ~40% daha az iterasyon
      - `renderFieryMidline()`: Step sizes artırıldı (10→15, 20→30)
      - `renderQuantumLockAmbiance()`: Scanline step 4→6
    - **GameEngine.tsx** (5 optimizasyon):
      - `visualWhiteOrb/visualBlackOrb` spread copies → temp-modify-restore pattern
      - **32x `Date.now()` → `frameTime`** (rendering path boyunca)
      - Legacy particle `createRadialGradient` per particle → solid fill
      - Legacy particle per-particle `save/restore` → single outer save/restore
      - Obstacle filtering: `.filter()` new array → in-place compaction
      - `EnemyManager.setDrawTime(frameTime)` called before enemy rendering
  - **Test**: 720/747 (baseline korundu, 27 pre-existing fail)

- **Quantum Lock Wave Pattern Variety & VFX Polish** - TAMAMLANDI ✅
  - **5 Farklı Dalga Deseni**: Her QL aktivasyonunda rastgele seçim
    - `sine`: Klasik düz sinüs dalgası (orijinal davranış)
    - `zigzag`: Keskin açılı zigzag — üçgen dalga
    - `doubleSine`: Çift frekanslı karmaşık hareket (birincil + 2.3x harmonik)
    - `staircase`: Basamaklı plato deseni (4 seviye, %70 stepped + %30 smooth)
    - `pulse`: Dar keskin tepeler, geniş düz vadiler (sin^5 spike)
  - **Desen-Spesifik Renkler**: Her desen kendi accent rengine sahip
    - sine: #00FF00 (matrix yeşil), zigzag: #00FFFF (cyan), doubleSine: #FF00FF (magenta)
    - staircase: #FFAA00 (amber), pulse: #FF3366 (hot pink)
  - **Geliştirilmiş Giriş Animasyonu (Charging)**:
    - Warning fazında desen renk ipucu (sağ kenarda faint accent çizgi)
    - Snake entry'de ease-out cubic (yavaşlayarak gelen yılan)
    - Snake başında dönen enerji spark parçacıkları
    - Desen ismi announce (fade in/out text)
  - **Geliştirilmiş Aktif Faz VFX**:
    - Dalga boyunca yüzen enerji parçacıkları (ambient particles)
    - Desen-spesifik accent rengiyle parçacık rendering
  - **Geliştirilmiş Çıkış Animasyonu (Exiting)**:
    - Ease-in cubic (hızlanarak çıkan kuyruk)
    - Kuyruk ardında dissolve parçacıkları
  - **UI İyileştirmeleri**:
    - Timer bar desen accent rengiyle glow
    - HUD'da desen Türkçe ismi gösterimi
    - Wave path shard'ları desen accent rengiyle gradient
  - **Bonus**: constants.ts'deki duplicate warningThreshold/flattenThreshold düzeltildi
  - **Test**: 720/747 (baseline korundu, 27 pre-existing fail)

- **Quantum Lock Exit Block Reset Fix** - TAMAMLANDI ✅
  - Sorun: QL çıkışında bloklar 1-2 saniye gecikmeli reset oluyordu
  - Çözüm: Obstacle clearing `ghost→inactive`'dan `exiting→ghost`'a taşındı
  - Ghost→inactive artık sadece grace period ayarlıyor

- **GameEngine Code Review & Bug Fixes (12 Fix)** - TAMAMLANDI ✅
  - 15 sorun tespit edildi, 3'ü non-issue olarak dismiss edildi, 12'si uygulandı
  - **Kritik Düzeltmeler:**
    - Fix #1: `finishApproachSpeedBoost` hoisting — değişken shard loop'undan önce tanımlandı (önceden kullanımdan sonra tanımlanıyordu)
    - Fix #2: Phase Dash grace period — dashEnded'da `lastSpecialAbilityEndTime` set edildi, dash sonrası anlık ölüm önlendi
    - Fix #3: `isInGracePeriod` variable shadowing — enemy grace period'u `isInEnemyGracePeriod` olarak rename edildi
    - Fix #4: `obstacles.current.forEach` → `for` loop — collision sonrası `break` ile erken çıkış, çoklu VFX tetiklenmesi önlendi
  - **Önemli İyileştirmeler:**
    - Fix #6: `resetGame` useCallback'e `tutorialMode` dependency eklendi
    - Fix #7: Tek `frameTime = Date.now()` per frame — loop içindeki ~40 Date.now() çağrısı frameTime ile değiştirildi
    - Fix #8: Enemy dart collision'a `state === 'firing'` guard eklendi
    - Fix #9: Shard limitleri artırıldı (3/5/8 → 4/6/10, eşikler 800/2500 → 400/1500)
    - Fix #10: FluxOverload isUsingAbility'ye tüm Quantum Lock fazları eklendi (charging, exiting, ghost)
    - Fix #11: Pause offset'te `dashEndTime` guard'ı — sadece dash aktifken offset uygulanır
  - **Polish:**
    - Fix #13: 18 console.log statement kaldırıldı (production performance)
    - Fix #14: `onTutorialComplete()` callback'i her frame yerine sadece 1 kez çağrılır (`completionCallbackFired` flag)
  - **Dismiss edilen sorunlar:**
    - Fix #5: S.H.I.F.T. spawn DISABLED, collectibles array her zaman boş
    - Fix #12: JS closure canvas ref'i doğru yakalar, cleanup güvenli
    - Fix #15: `spawnObstaclePair` ve `spawnPatternObstaclePair` zaten unique ID üretiyor

- **Finish Approach System & Restore Fix** - TAMAMLANDI ✅
  - Finish Approach (Clear Runway): %88 mesafede blok spawn durur, mevcut bloklar hızlanarak ekrandan çıkar
  - VFX: Sağ kenarda pulsing cyan/gold glow, horizontal speed lines, "BİTİŞ YAKLAŞIYOR" text + kalan mesafe counter
  - Obstacle speed boost: 1x → 3x smooth ramp (1.5 saniye), shard'lar da aynı hızda
  - Temiz pist: Oyuncu bitiş çizgisine yaklaşırken bloksuz alan oluşur → dramatik bitiş atmosferi
  - Finish mode: %100'de holographic gate görünür, oyuncu sağa hızlanarak gate'e çarpar
  - Restore sonrası blok overlap fix: blockSystemState reset, obstaclePool reset, spawn grace period (1s)
  - Ghost mode bitişinde de aynı fix uygulandı (blockSystemState + patternManager + pool reset)
  - resetGame'de blockSystemState reset eklendi (oyun başlangıcında temiz durum)
  - finishApproachActive restore'da sıfırlanır (geri sarılan mesafe eşiğin altında olabilir)

- **Pro-Grade Progression & Pacing System** - TAMAMLANDI ✅
  - Level Unlock Celebration System (UnlockModal) v2
    - `systems/LevelUnlockManager.ts`: Unlock schedule + persistence (8 milestones)
    - `components/UnlockModal/UnlockModal.tsx`: Full-screen neon modal with IN-GAME visual demos
    - Her unlock için canvas-based mini animasyon: GERÇEK oyun görüntüsü (split black/white bg, actual orbs+connector, real obstacles)
    - In-game primitives: drawGameBg (split zones), drawPlayer (dual orbs+connector bar), drawObstacle (polarity-aware), drawGateObstacle, drawMidline
    - Demo renderers: Shift swap (scrolling obstacles+polarity switch), Quantum Lock (green connector+plasma wave), Pulse Gate (color-shifting obstacle), Ghost Mode (translucent phase-through), Phantom (dashed outline→solid fade-in), Dynamic Midline (moving zones+forecast), Rhythm (beat-synced pulse+streak), Gravity Flip (zones swap+inverted orbs)
    - Rounded corner clipping, distance HUD, floating particles background
    - 5-phase state machine (enter→icon-slam→demo-play→text-reveal→ready)
    - ACK_DELAY 3s (demo izleme süresi)
    - Milestone levels: 1 (Shift), 3 (Quantum Lock), 5 (Pulse Gate), 10 (Ghost Mode), 11 (Phantom), 21 (Midline), 31 (Rhythm), 41 (Gravity)
    - Persistence via `STORAGE_KEYS.SEEN_UNLOCKS` — each unlock shown only once
    - Gated before VictoryScreen in App.tsx flow
  - Absolute-Distance Speed Mathematics (SpeedController refactor v2)
    - Core: speed = f(absoluteMeters) — same distance = same speed in ALL levels
    - Two-layer system:
      1. **Target ceiling**: speed(d) = 1.0 + 0.20×min(√d,10) + 0.15×max(0, √d−10) (piecewise in √d)
      2. **Linear ramp**: currentSpeed starts at BASE_START (1.0), increases by ACCELERATION_RATE (0.04/s), clamped to ceiling
    - Speed flows up smoothly instead of jumping to formula values instantly
    - Two-slope piecewise in √d: initial ramp (0.20) + cruise (0.15), knee at 100m
    - 2 zones: CRUISE (normal curve) and CLIMAX (final 20% of level)
    - CLIMAX: 1.15x multiplier with 500ms smooth transition
    - Level parameter IGNORED — difficulty = endurance (surviving longer distances)
    - Hard cap at MAX_ALLOWED_SPEED = 8.5
    - Speed reaches cap at ~2178m
    - `getCurrentSpeed()` accessor for diagnostics
  - Types: `UnlockPayload`, `UnlockType`, `SpeedZone` (CRUISE|CLIMAX|WARMUP|FLOW), `SpeedZoneState` in types.ts
  - 59 tests (37 SpeedController + 22 campaignIntegration)
  - LevelUnlockManager: 15 tests

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

