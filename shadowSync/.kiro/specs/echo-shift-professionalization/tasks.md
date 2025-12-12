# Implementation Plan

## Faz 1: Temel Altyapı ve State Yönetimi

- [x] 1. Global State Management kurulumu





  - [x] 1.1 Zustand store oluştur (store/gameStore.ts)


    - GameStore interface'ini implement et
    - Currency, inventory, equipped items, campaign progress, settings state'lerini tanımla
    - Actions: addEchoShards, spendEchoShards, purchaseItem, equipItem, completeLevel
    - _Requirements: 18.1, 18.2, 18.3_
  - [x] 1.2 Write property test for state persistence round-trip






    - **Property 2: State Persistence Round-Trip**
    - **Validates: Requirements 1.5, 1.6, 18.4, 18.5**
  - [x] 1.3 localStorage persistence adapter oluştur (utils/persistence.ts)


    - safePersist ve safeLoad fonksiyonları
    - JSON serialization/deserialization
    - Error handling ve fallback mekanizması
    - _Requirements: 1.3, 1.4, 18.4, 18.5_

- [x] 2. Echo Shards para birimi sistemi





  - [x] 2.1 Echo Shards hesaplama fonksiyonu (utils/echoShards.ts)


    - calculateEchoShards(score): Math.floor(score * 0.1)
    - Collectible bonus hesaplama
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Write property test for Echo Shards calculation






    - **Property 1: Echo Shards Calculation Accuracy**
    - **Validates: Requirements 1.1**

  - [x] 2.3 GameEngine'e Echo Shards entegrasyonu

    - Oyun sonu skordan shards hesapla ve store'a ekle
    - UI'da shards gösterimi
    - _Requirements: 1.1, 1.3, 1.4_

- [x] 3. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 2: Kozmetik Sistemleri

- [x] 4. Tema sistemi implementasyonu





  - [x] 4.1 Theme data ve interface tanımları (data/themes.ts)


    - Theme interface: id, name, price, colors, effects
    - 4 tema tanımı: Classic, Cyberpunk, Retro, Zen
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 4.2 ThemeSystem implementasyonu (systems/themeSystem.ts)


    - applyTheme, getColor, hasEffect fonksiyonları
    - Aktif tema state yönetimi
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 4.3 Write property test for theme color retrieval






    - **Property 5: Theme Color Retrieval Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 4.4 GameEngine ve GameUI'a tema entegrasyonu

    - Canvas render'da tema renklerini kullan
    - UI elementlerinde accent renkleri uygula
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 5. Ball Skin sistemi





  - [x] 5.1 Skin data tanımları (data/skins.ts)


    - BallSkin interface: id, name, price, type, config
    - 7 skin tanımı: Classic, Neon Blue/Pink, Fire, Ice, Star, Heart
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 5.2 Skin render fonksiyonları (utils/skinRenderer.ts)


    - renderSolidOrb, renderGradientOrb, renderEmojiOrb
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 5.3 GameEngine'e skin entegrasyonu


    - Equipped skin'e göre orb render
    - _Requirements: 3.1, 3.2_

- [x] 6. Shop UI implementasyonu





  - [x] 6.1 Shop bileşeni oluştur (components/Shop/Shop.tsx)


    - Kategori tabları: Skins, Themes, Upgrades
    - Item grid görünümü
    - _Requirements: 2.1_
  - [x] 6.2 ShopItem bileşeni (components/Shop/ShopItem.tsx)


    - Item preview, fiyat, unlock durumu
    - Purchase ve equip butonları
    - _Requirements: 2.1, 2.4_
  - [x] 6.3 Purchase logic implementasyonu


    - Balance kontrolü
    - Satın alma işlemi
    - Equip işlemi
    - _Requirements: 2.2, 2.3, 2.4, 2.5_
  - [x] 6.4 Write property test for purchase validation






    - **Property 3: Purchase Balance Validation**
    - **Validates: Requirements 2.2**
  - [x] 6.5 Write property test for purchase state consistency






    - **Property 4: Purchase State Consistency**
    - **Validates: Requirements 2.3**

- [x] 7. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 3: Juice Efektleri

- [x] 8. Particle System implementasyonu





  - [x] 8.1 ParticleSystem core (systems/particleSystem.ts)


    - Particle interface ve ParticleConfig
    - emit, update, render fonksiyonları
    - Particle pool yönetimi
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 8.2 Write property test for particle lifecycle






    - **Property 11: Particle Lifecycle Management**
    - **Validates: Requirements 12.4, 12.5**

  - [x] 8.3 Trail particles implementasyonu

    - Orb hareketine göre trail emit
    - Speed-based emission rate
    - _Requirements: 12.1_
  - [x] 8.4 Burst ve spark particles


    - Swap burst efekti
    - Near miss spark efekti
    - _Requirements: 12.2, 12.3_
  - [x] 8.5 GameEngine'e particle entegrasyonu


    - Particle update ve render döngüsü
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 9. Screen Shake sistemi






  - [x] 9.1 ScreenShakeSystem implementasyonu (systems/screenShake.ts)

    - ShakeConfig ve ScreenShakeState
    - trigger, update, getOffset, reset fonksiyonları
    - Decay animasyonu
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 9.2 Write property test for screen shake offset bounds






    - **Property 10: Screen Shake Offset Bounds**
    - **Validates: Requirements 10.3**
  - [x] 9.3 GameEngine'e screen shake entegrasyonu


    - Canvas transform offset uygulama
    - Collision ve near miss tetikleyicileri
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 10. Chromatic Aberration efekti





  - [x] 10.1 ChromaticAberration implementasyonu (systems/chromaticAberration.ts)


    - RGB channel separation hesaplama
    - Intensity scaling (streak level'a göre)
    - Fade in/out animasyonu
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 10.2 GameEngine'e chromatic aberration entegrasyonu


    - Post-process efekt olarak uygula
    - Rhythm streak ile tetikle
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 11. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 4: Yükseltme Sistemi

- [x] 12. Upgrade sistemi implementasyonu





  - [x] 12.1 Upgrade data tanımları (data/upgrades.ts)


    - Upgrade interface: id, name, description, maxLevel, baseCost, costMultiplier, effect
    - 3 upgrade: Head Start, Echo Amplifier, Time Warp
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 12.2 UpgradeSystem fonksiyonları (systems/upgradeSystem.ts)


    - getUpgradeCost, getUpgradeEffect, canPurchaseUpgrade
    - purchaseUpgrade, applyUpgradeEffects
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  - [x] 12.3 Write property test for upgrade effect calculation






    - **Property 6: Upgrade Effect Calculation**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [x] 12.4 Slow Motion implementasyonu


    - Game speed reduction (50% for 3 seconds)
    - Uses per game tracking
    - UI activation button
    - _Requirements: 6.4_
  - [x] 12.5 GameEngine'e upgrade entegrasyonu


    - Starting score uygulama
    - Score multiplier uygulama
    - Slow motion aktivasyonu
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 13. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 5: Oyun Modları

- [x] 14. Campaign Mode implementasyonu





  - [x] 14.1 Level data tanımları (data/levels.ts)


    - LevelConfig interface
    - 100 seviye konfigürasyonu (mechanics, modifiers, rewards)
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.6_

  - [x] 14.2 CampaignSystem implementasyonu (systems/campaignSystem.ts)

    - getCurrentLevel, isLevelUnlocked, completeLevel, getProgress
    - Star calculation ve reward distribution
    - _Requirements: 7.2, 7.3, 7.7_
  - [x]* 14.3 Write property test for level config loading


    - **Property 7: Level Configuration Loading**
    - **Validates: Requirements 7.2**


  - [x]* 14.4 Write property test for level progression

    - **Property 8: Level Progression Unlocking**
    - **Validates: Requirements 7.3**
  - [x] 14.5 Level Map UI (components/Campaign/LevelMap.tsx)


    - 100 seviye grid görünümü
    - Unlock durumu ve yıldız gösterimi
    - Level seçimi
    - _Requirements: 7.1_

  - [x] 14.6 GameEngine'e campaign mode entegrasyonu

    - Level config'e göre mechanics enable/disable
    - Level completion detection
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 15. Daily Challenge implementasyonu





  - [x] 15.1 DailyChallengeSystem implementasyonu (systems/dailyChallenge.ts)


    - generateChallenge (date-based seed)
    - isCompleted, submitScore, getBestScore
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 15.2 Write property test for daily challenge determinism






    - **Property 9: Daily Challenge Determinism**
    - **Validates: Requirements 8.1, 8.5**

  - [x] 15.3 Daily Challenge UI

    - Challenge info display
    - Special rules gösterimi
    - Completion status ve best score
    - _Requirements: 8.1, 8.4_

  - [x] 15.4 GameEngine'e daily challenge entegrasyonu

    - Challenge modifiers uygulama
    - Reward calculation
    - _Requirements: 8.2, 8.3_

- [x] 16. Zen Mode implementasyonu





  - [x] 16.1 Zen Mode logic (systems/zenMode.ts)


    - Score disable
    - Respawn on collision (no game over)
    - Visual intensity reduction
    - _Requirements: 9.1, 9.2, 9.4_
  - [x] 16.2 GameEngine'e Zen Mode entegrasyonu


    - Collision handling değişikliği
    - Visual style adjustments
    - _Requirements: 9.1, 9.2, 9.4_

- [x] 17. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 6: Sosyal Özellikler

- [x] 18. Ghost Racer implementasyonu






  - [x] 18.1 GhostRacerSystem implementasyonu (systems/ghostRacer.ts)

    - GhostFrame interface ve timeline management
    - startRecording, recordFrame, stopRecording
    - saveTimeline, loadTimeline
    - getGhostPosition (interpolation)
    - isPlayerAhead
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  - [x]* 18.2 Write property test for ghost timeline interpolation


    - **Property 12: Ghost Timeline Interpolation**
    - **Validates: Requirements 15.2**


  - [x]* 18.3 Write property test for ghost data round-trip

    - **Property 13: Ghost Data Round-Trip**
    - **Validates: Requirements 15.5, 15.6**

  - [x] 18.4 Ghost render implementasyonu

    - Semi-transparent ghost orb rendering
    - "Ahead" indicator
    - _Requirements: 15.1, 15.3_

  - [x] 18.5 GameEngine'e ghost entegrasyonu

    - Recording during gameplay
    - Ghost display during endless mode
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 19. Leaderboard sistemi (localStorage-based)






  - [x] 19.1 Leaderboard data management (systems/leaderboard.ts)

    - LeaderboardEntry interface
    - addScore, getTopScores, filterByPeriod
    - _Requirements: 14.1, 14.3, 14.4, 14.5_
  - [ ]* 19.2 Write property test for leaderboard filtering
    - **Property 14: Leaderboard Filtering Correctness**
    - **Validates: Requirements 14.4, 14.5**

  - [x] 19.3 Leaderboard UI (components/Leaderboard/Leaderboard.tsx)

    - Top 100 scores display
    - Weekly/All Time tabs
    - Player rank highlight
    - _Requirements: 14.1, 14.3, 14.4, 14.5_

- [x] 20. Checkpoint - Tüm testlerin geçtiğinden emin ol




  - Ensure all tests pass, ask the user if questions arise.

## Faz 7: Tutorial ve PWA

- [x] 21. Tutorial sistemi





  - [x] 21.1 TutorialSystem implementasyonu (systems/tutorialSystem.ts)


    - Tutorial step definitions
    - Step progression logic
    - First-run detection
    - Contextual tutorial triggers
    - _Requirements: 17.1, 17.3, 17.4, 17.5_
  - [ ]* 21.2 Write property test for tutorial progression
    - **Property 15: Tutorial Progression Consistency**
    - **Validates: Requirements 17.3, 17.4**

  - [x] 21.3 TutorialOverlay UI (components/Tutorial/TutorialOverlay.tsx)

    - Step-by-step instructions
    - UI element highlighting
    - Skip option
    - _Requirements: 17.1, 17.2_

  - [x] 21.4 Campaign mechanic tutorials

    - Phantom introduction (level 11)
    - Midline introduction (level 20)
    - _Requirements: 17.5_

- [x] 22. PWA kurulumu






  - [x] 22.1 PWA manifest oluştur (public/manifest.json)

    - App name, icons, theme color
    - Display mode: standalone
    - _Requirements: 16.1, 16.3, 16.4_
  - [x] 22.2 Service Worker implementasyonu


    - Asset caching
    - Offline support
    - _Requirements: 16.2_
  - [x] 22.3 Vite PWA plugin entegrasyonu


    - vite-plugin-pwa kurulumu ve konfigürasyonu
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [x] 23. Final Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.
