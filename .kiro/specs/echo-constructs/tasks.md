# Implementation Plan

## Phase 1: Core Types ve Strategy Interface

- [x] 1. Temel tip tanımları ve interface'ler





  - [x] 1.1 Core types tanımla (types.ts extensions)


    - ConstructType, CollisionResult type'ları
    - InputState interface (isPressed, y, isTapFrame, isReleaseFrame)
    - PhysicsStrategy interface (update, resolveCollision, getHitbox, multipliers)
    - PlayerEntity, Rect interface'leri
    - _Requirements: 2.3, 2.4, 7.1_

  - [x] 1.2 Write property test for InputState touch Y accuracy



    - **Property 20: Input State Touch Y Accuracy**
    - **Validates: Requirements 5.2**

- [x] 2. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Physics Strategies

- [x] 3. StandardPhysics implementasyonu





  - [x] 3.1 StandardPhysics modülü oluştur (systems/constructs/StandardPhysics.ts)


    - Mevcut dual-orb swap mekaniğini wrap et
    - resolveCollision: always 'DAMAGE'
    - getSpeedMultiplier: 1.0, getGravityMultiplier: 1.0
    - _Requirements: 2.5_

  - [x] 3.2 Write property test for physics strategy consistency



    - **Property 6: Physics Strategy Consistency**
    - **Validates: Requirements 2.3, 2.4, 2.5**

- [x] 4. TitanPhysics implementasyonu





  - [x] 4.1 TitanPhysics modülü oluştur (systems/constructs/TitanPhysics.ts)


    - TITAN_CONFIG sabitleri (gravityMultiplier: 2.5, stompVelocity: 25)
    - update: Ağır yerçekimi uygulaması
    - onTapStart: Stomp (velocity = stompVelocity)
    - resolveCollision: isFromAbove ? 'DESTROY' : 'DAMAGE'
    - _Requirements: 3.1, 3.2, 3.3, 3.4_


  - [x] 4.2 Write property test for Titan gravity multiplier


    - **Property 7: Titan Gravity Multiplier**
    - **Validates: Requirements 3.1**


  - [x] 4.3 Write property test for Titan stomp velocity


    - **Property 8: Titan Stomp Velocity**
    - **Validates: Requirements 3.2**


  - [x] 4.4 Write property test for Titan stomp destroys obstacles


    - **Property 9: Titan Stomp Destroys Obstacles**
    - **Validates: Requirements 3.3**

- [x] 5. PhasePhysics implementasyonu






  - [x] 5.1 PhasePhysics modülü oluştur (systems/constructs/PhasePhysics.ts)

    - PHASE_CONFIG sabitleri (speedMultiplier: 1.2, transitionDuration: 200)
    - PhaseState: gravityDirection, isTransitioning, transitionStartTime
    - update: Floor/ceiling lock, transition interpolation
    - onTapStart: Gravity flip (gravityDirection *= -1)
    - resolveCollision: always 'DAMAGE'
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_


  - [x] 5.2 Write property test for Phase position lock


    - **Property 10: Phase Cycle Position Lock**
    - **Validates: Requirements 4.1**

  - [x] 5.3 Write property test for Phase gravity flip


    - **Property 11: Phase Cycle Gravity Flip**
    - **Validates: Requirements 4.2**

  - [x] 5.4 Write property test for Phase speed multiplier


    - **Property 12: Phase Cycle Speed Multiplier**
    - **Validates: Requirements 4.6**

- [x] 6. BlinkPhysics implementasyonu





  - [x] 6.1 BlinkPhysics modülü oluştur (systems/constructs/BlinkPhysics.ts)


    - BLINK_CONFIG sabitleri (teleportCooldown: 200, ghostOpacity: 0.5)
    - BlinkState: ghostY, isDragging, lastTeleportTime, isTeleporting
    - update: Static Y (velocity = 0), ghost position from InputState.y
    - onRelease: Teleport (player.y = ghostY)
    - resolveCollision: isTeleporting ? 'IGNORE' : 'DAMAGE'
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


  - [x] 6.2 Write property test for Blink static Y


    - **Property 13: Blink Node Static Y**
    - **Validates: Requirements 5.1**


  - [x] 6.3 Write property test for Blink teleport


    - **Property 14: Blink Node Teleport**
    - **Validates: Requirements 5.3**

- [x] 7. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: ConstructSystem Manager

- [x] 8. ConstructSystem manager implementasyonu





  - [x] 8.1 ConstructSystem modülü oluştur (systems/constructs/ConstructSystem.ts)


    - ConstructSystemState interface
    - createConstructSystem fonksiyonu
    - transformTo: Strategy değiştir, invincibility başlat
    - updateConstruct: Aktif strategy'nin update'ini çağır
    - isInvulnerable: Zaman kontrolü
    - _Requirements: 2.1, 2.2, 7.1, 7.2, 7.3, 7.5_

  - [x] 8.2 Write property test for transformation invincibility






    - **Property 5: Transformation Invincibility**
    - **Validates: Requirements 2.1, 6.3**

  - [x] 8.3 Write property test for collision resolution by strategy



    - **Property 19: Collision Resolution by Strategy**
    - **Validates: Requirements 3.3, 3.4, 4.4, 5.4, 5.5**

- [x] 9. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Second Chance ve Smart Bomb

- [x] 10. Second Chance sistemi





  - [x] 10.1 SecondChanceSystem modülü oluştur (systems/SecondChanceSystem.ts)


    - SecondChanceConfig interface (invincibilityDuration, smartBombRadius)
    - takeDamage: Construct aktifse patlat, 'NONE'a dön, invincibility ver
    - getObstaclesInRadius: Smart Bomb için engel listesi
    - processSecondChance: State transition + obstacle destruction list
    - _Requirements: 6.1, 6.2, 6.3, 6.7_


  - [x] 10.2 Write property test for Second Chance state transition


    - **Property 15: Second Chance State Transition**
    - **Validates: Requirements 6.1, 6.2, 6.3**



  - [x] 10.3 Write property test for Smart Bomb obstacle clearing






    - **Property 18: Smart Bomb Obstacle Clearing**
    - **Validates: Requirements 6.7**

- [x] 11. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: GlitchToken Spawner

- [x] 12. GlitchToken spawn sistemi





  - [x] 12.1 GlitchTokenSpawner modülü oluştur (systems/GlitchTokenSpawner.ts)


    - GlitchTokenSpawnerConfig interface (minScore: 500, probability: 0.03)
    - GlitchToken interface
    - shouldSpawnToken: Score, activeConstruct, unlockedConstructs kontrolü
    - calculateSafeTokenPosition: Engellere çarpmayan pozisyon
    - selectRandomConstruct: Unlocked pool'dan seçim
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 12.2 Write property test for token spawn score threshold







    - **Property 1: Token Spawn Score Threshold**
    - **Validates: Requirements 1.1**

  - [x] 12.3 Write property test for token safe position


    - **Property 2: Token Safe Position**
    - **Validates: Requirements 1.2**

  - [x] 12.4 Write property test for construct selection from unlocked pool


    - **Property 3: Construct Selection from Unlocked Pool**
    - **Validates: Requirements 1.4, 8.5**

  - [x] 12.5 Write property test for no token spawn during active construct


    - **Property 4: No Token Spawn During Active Construct**
    - **Validates: Requirements 1.6**

- [x] 13. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: State Management ve Persistence

- [x] 14. Zustand store extensions





  - [x] 14.1 gameStore.ts'e Construct state ekle


    - unlockedConstructs: ConstructType[] (persisted)
    - activeConstruct: ConstructType (session-only, NOT persisted)
    - isInvulnerable, invulnerabilityEndTime (session-only)
    - Actions: unlockConstruct, setActiveConstruct, setInvulnerable, resetConstructState
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4_


  - [x] 14.2 Write property test for construct state not persisted


    - **Property 16: Construct State Not Persisted**
    - **Validates: Requirements 7.4**


  - [x] 14.3 Write property test for unlock persistence


    - **Property 17: Unlock Persistence**
    - **Validates: Requirements 8.2, 8.3, 8.4**

- [x] 15. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: GameEngine Entegrasyonu

- [x] 16. GameEngine'e Construct sistemi entegrasyonu





  - [x] 16.1 InputState yönetimi ekle


    - Touch event'lerden InputState objesi oluştur
    - isTapFrame, isReleaseFrame, y koordinatı takibi
    - _Requirements: 5.2_

  - [x] 16.2 ConstructSystem entegrasyonu


    - ConstructSystem state'i GameEngine ref'lerine ekle
    - Game loop'ta updateConstruct çağır
    - Physics multiplier'ları uygula (speed, gravity)
    - _Requirements: 2.3, 2.4, 3.1, 4.1, 4.6, 5.1_

  - [x] 16.3 Collision handling güncelle


    - resolveCollision() ile çarpışma kararı al
    - 'DESTROY': Engeli sil, devam et
    - 'DAMAGE': Second Chance veya game over
    - 'IGNORE': Hiçbir şey yapma (Blink teleport)
    - _Requirements: 3.3, 3.4, 4.4, 5.4, 5.5_

  - [x] 16.4 GlitchToken spawn ve collection


    - Pattern spawn cycle'ına token spawn ekle
    - Token collision detection
    - transformTo çağrısı
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 16.5 Second Chance + Smart Bomb entegrasyonu


    - Hasar alındığında takeDamage çağır
    - Smart Bomb ile dönen engelleri sil
    - Invincibility VFX (flashing)
    - _Requirements: 6.1, 6.2, 6.3, 6.7_

- [x] 17. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Visual Effects ve Polish

- [x] 18. Construct rendering ve VFX
  - [x] 18.1 Construct sprite rendering
    - Titan: Kare, kalın çerçeve, dönen çekirdek
    - Phase: İnce dikdörtgen, neon trail
    - Blink: Titreyen daire, ghost projection
    - _Requirements: 3.5, 4.5, 5.6_

  - [x] 18.2 Transformation VFX
    - Screen flash (100ms)
    - RGB split / chromatic aberration (200ms)
    - Particle burst
    - Screen shake (150ms)
    - _Requirements: 2.2_

  - [x] 18.3 Second Chance VFX
    - Construct explosion particles
    - Smart Bomb shockwave
    - Heavy screen shake (300ms)
    - Invincibility flashing
    - _Requirements: 6.4, 6.6, 6.8_

  - [x] 18.4 Audio integration

    - Transformation sound
    - Construct-specific sounds (stomp, flip, teleport)
    - Destruction sound
    - _Requirements: 6.5_

- [x] 19. Final Checkpoint - Tüm testlerin geçtiğinden emin ol
  - Ensure all tests pass, ask the user if questions arise.

