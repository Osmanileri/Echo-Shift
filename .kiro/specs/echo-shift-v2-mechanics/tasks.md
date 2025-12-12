# Implementation Plan

## Echo Shift v2.0: Entegre Uygulama Planı (TDD)

Bu plan, S.H.I.F.T. Protocol, Harmonic Resonance (Enhanced) ve System Restore özelliklerini kapsar. Her ana görevin son adımı, o görevin doğruluğunu kanıtlayan testin yazılmasıdır.

---

## 📦 Phase 1: Veri Yapıları ve Temel State

- [x] 1. Veri Tanımları ve Başlangıç Durumu





  - [x] 1.1 types.ts dosyasını güncelle


    - `CollectibleType`, `Collectible`, `ShiftProtocolState` interface'lerini ekle
    - `ResonanceState` (enhanced) - `isPaused`, `pausedTimeRemaining` ekle
    - `GameSnapshot`, `SnapshotBuffer` interface'lerini ekle
    - `GameStatus` enum'una `RESTORING` ekle
    - _Requirements: 1.1, 1.2, 7.2_
  - [x] 1.2 systems/shiftProtocol.ts içinde `initializeShiftState` fonksiyonunu yaz


    - Default state döndür: collectedMask all false, overdriveActive false, overdriveTimer 0
    - _Requirements: 1.3, 1.4_
  - [x] 1.3 Write property test for initial state invariant


    - **Property 1: Initial State Invariant**
    - **Validates: Requirements 1.3, 1.4**
  - [x] 1.4 store/gameStore.ts içine v2 state'lerini ekle


    - `shift`, `resonance`, `snapshots` state'lerini ekle
    - _Requirements: 1.3, 1.4_

---

## 🧩 Phase 2: S.H.I.F.T. Protokolü (Logic & Core)

- [x] 2. Collectible Spawn Mantığı (Erişilebilirlik)



  - [x] 2.1 constants.ts içine SHIFT_CONFIG ekle


    - Olasılık %5-15, Hitbox 20px, Overdrive 10s, Magnet 150px
    - Collection reward 50 shards, oscillation params
    - _Requirements: 3.1, 3.4, 4.5, 4.6, 9.2, 9.4_
  - [x] 2.2 systems/shiftProtocol.ts içinde spawn fonksiyonlarını yaz


    - `calculateReachableY(connectorLength, midlineY)` - spawn bounds
    - `calculateSpawnProbability(score)` - linear interpolation 5%-15%
    - _Requirements: 3.1, 3.4_
  - [x] 2.3 Write property test for reachability constraint


    - **Property 2: Reachability Constraint**
    - **Validates: Requirements 3.1, 3.2**
  - [x] 2.4 Write property test for spawn probability scaling



    - **Property 4: Spawn Probability Scaling**
    - **Validates: Requirements 3.4**

- [x] 3. Harf Hareketi ve Seçimi





  - [x] 3.1 Oscillation formülünü implemente et


    - `calculateOscillationY(baseY, amplitude, frequency, time)` - baseY + amp * sin(time * freq)
    - _Requirements: 3.3_

  - [x] 3.2 selectNextLetter fonksiyonunu yaz
    - Toplanmamış harflerden seç, öncelik sırasına göre
    - _Requirements: 3.5_

  - [x] 3.3 Write property test for oscillation formula

    - **Property 3: Oscillation Formula Correctness**
    - **Validates: Requirements 3.3**
  - [x] 3.4 Write property test for letter priority selection

    - **Property 5: Letter Priority Selection**
    - **Validates: Requirements 3.5**

- [x] 4. Çarpışma ve Toplama





  - [x] 4.1 Collision ve collection fonksiyonlarını yaz


    - `checkCollectibleCollision(orb, collectible)` - 20px radius
    - `collectLetter(state, letterIndex)` - update collectedMask
    - `removeCollectedLetter(collectibles, id)` - remove from list
    - `awardCollectionReward(shards)` - add 50 Echo Shards
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 4.2 Write property test for letter collision detection

    - **Property 25: Letter Collision Detection**
    - **Validates: Requirements 9.1, 9.2**
  - [x] 4.3 Write property test for letter removal on collection


    - **Property 26: Letter Removal on Collection**
    - **Validates: Requirements 9.3**

  - [x] 4.4 Write property test for letter collection reward

    - **Property 27: Letter Collection Reward**
    - **Validates: Requirements 9.4**

- [x] 5. Overdrive Modu (Aktivasyon & Etkiler)





  - [x] 5.1 Overdrive activation fonksiyonlarını yaz


    - `checkOverdriveActivation(collectedMask)` - 5 harf kontrolü
    - `activateOverdrive(state)` - timer 10 saniye
    - `updateOverdrive(state, deltaTime)` - timer decrement
    - `deactivateOverdrive(state)` - reset to normal
    - _Requirements: 4.1, 4.6, 4.7_

  - [x] 5.2 Write property test for Overdrive activation trigger

    - **Property 6: Overdrive Activation Trigger**
    - **Validates: Requirements 4.1**
  - [x] 5.3 Write property test for Overdrive timer deactivation


    - **Property 10: Overdrive Timer Deactivation**
    - **Validates: Requirements 4.7**
  - [x] 5.4 Overdrive collision behaviors fonksiyonlarını yaz

    - `handleOverdriveCollision(obstacle)` - destroy obstacle
    - `isInvulnerableDuringOverdrive(state)` - return true when active
    - `applyMagnetEffect(shards, playerPos, radius)` - pull within 150px
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 5.5 Write property test for Overdrive invulnerability

    - **Property 7: Overdrive Invulnerability**
    - **Validates: Requirements 4.3**


  - [x] 5.6 Write property test for Overdrive obstacle destruction
    - **Property 8: Overdrive Obstacle Destruction**

    - **Validates: Requirements 4.4**
  - [x] 5.7 Write property test for magnet effect range

    - **Property 9: Magnet Effect Range**
    - **Validates: Requirements 4.5**

- [x] 6. Checkpoint - S.H.I.F.T. Protocol Tests





  - Ensure all tests pass, ask the user if questions arise.

---

## ⚡ Phase 3: Harmonic Resonance (Geliştirme)

- [x] 7. Streak ve Aktivasyon Mantığı





  - [x] 7.1 systems/resonanceSystem.ts dosyasını güncelle


    - `streakCount`, `multiplier`, `isPaused`, `pausedTimeRemaining` ekle
    - _Requirements: 5.1, 5.4_

  - [x] 7.2 Streak ve activation fonksiyonlarını yaz

    - `updateStreak(state, isRhythmHit)` - increment or reset
    - `activateResonance(state)` - when streak reaches 10
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 7.3 Write property test for resonance activation threshold


    - **Property 11: Resonance Activation Threshold**
    - **Validates: Requirements 5.1**

  - [x] 7.4 Write property test for streak increment on rhythm hit
    - **Property 12: Streak Increment on Rhythm Hit**
    - **Validates: Requirements 5.2**

  - [x] 7.5 Write property test for streak reset on miss
    - **Property 13: Streak Reset on Miss**
    - **Validates: Requirements 5.3**

- [x] 8. Puanlama ve Durum Yönetimi





  - [x] 8.1 Score multiplier ve state priority fonksiyonlarını yaz


    - `calculateScoreMultiplier(state)` - x2 when active
    - `pauseResonance(state)` - freeze timer for Overdrive
    - `resumeResonance(state)` - restore from frozen timer
    - _Requirements: 5.4, 6.2, State Priority System_

  - [x] 8.2 Write property test for resonance duration preservation

    - **Property 14: Resonance Duration Preservation**
    - **Validates: Requirements 5.4**

  - [x] 8.3 Write property test for resonance score multiplier

    - **Property 15: Resonance Score Multiplier**
    - **Validates: Requirements 6.2**

- [x] 9. Checkpoint - Harmonic Resonance Tests





  - Ensure all tests pass, ask the user if questions arise.

---

## ↺ Phase 4: System Restore (Snapshot & Ekonomi)

- [x] 10. Snapshot (Anlık Görüntü) Sistemi





  - [x] 10.1 systems/restoreSystem.ts içinde SnapshotBuffer yapısını kur


    - `initializeSnapshotBuffer(capacity)` - 180 frame capacity
    - `pushSnapshot(buffer, snapshot)` - circular overwrite
    - `getRestoreSnapshot(buffer)` - 3-second-old snapshot
    - `clearSnapshotBuffer(buffer)` - game end cleanup
    - _Requirements: 7.1, 7.3, 7.4_

  - [x] 10.2 Write property test for snapshot buffer capacity

    - **Property 16: Snapshot Buffer Capacity**
    - **Validates: Requirements 7.1, 7.3**

  - [x] 10.3 Write property test for buffer cleanup on game end

    - **Property 18: Buffer Cleanup on Game End**
    - **Validates: Requirements 7.4**


  - [x] 10.4 Snapshot capture fonksiyonunu yaz
    - `captureSnapshot(gameState)` - all required fields
    - timestamp, score, playerPosition, orbSwapState, obstacles, speed

    - _Requirements: 7.2_
  - [x] 10.5 Write property test for snapshot completeness

    - **Property 17: Snapshot Completeness**
    - **Validates: Requirements 7.2**

- [x] 11. Geri Yükleme (Restore) Mantığı





  - [x] 11.1 Restore validation ve cost fonksiyonlarını yaz


    - `canRestore(shards, hasUsedRestore)` - balance >= 100 check
    - `calculateRestoreCost()` - return 100
    - _Requirements: 8.3, 8.4, 8.8_
  - [x] 11.2 Write property test for restore button state


    - **Property 19: Restore Button State**
    - **Validates: Requirements 8.3**
  - [x] 11.3 Write property test for single restore per run


    - **Property 24: Single Restore Per Run**
    - **Validates: Requirements 8.8**

  - [x] 11.4 Restore execution fonksiyonlarını yaz

    - `executeRestore(gameState, snapshot)` - rewind state
    - `clearSafeZone(obstacles, playerX, radius)` - remove within 100px
    - `applyInvulnerability(state, duration)` - 2 second timer
    - `deductRestoreCost(shards)` - subtract 100 Echo Shards
    - _Requirements: 8.4, 8.5, 8.6, 8.7_
  - [x] 11.5 Write property test for restore currency deduction


    - **Property 20: Restore Currency Deduction**
    - **Validates: Requirements 8.4**
  - [x] 11.6 Write property test for restore state rewind


    - **Property 21: Restore State Rewind**
    - **Validates: Requirements 8.5**
  - [x] 11.7 Write property test for safe zone clearance


    - **Property 22: Safe Zone Clearance**
    - **Validates: Requirements 8.6**
  - [x] 11.8 Write property test for post-restore invulnerability


    - **Property 23: Post-Restore Invulnerability**
    - **Validates: Requirements 8.7**

- [x] 12. Checkpoint - System Restore Tests





  - Ensure all tests pass, ask the user if questions arise.

---

## 🎨 Phase 5: Entegrasyon ve Görseller

- [x] 13. Oyun Motoru Entegrasyonu





  - [x] 13.1 GameEngine.tsx içine S.H.I.F.T. spawn ve collision döngülerini ekle


    - Collectible spawn check each frame based on probability
    - Update collectible positions with oscillation formula
    - Check collectible collisions with both orbs
    - _Requirements: 3.2, 3.3, 9.1_

  - [x] 13.2 Overdrive behaviors entegrasyonu

    - Skip death on collision when Overdrive active
    - Destroy obstacles on contact during Overdrive
    - Apply magnet effect to nearby shards
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 13.3 State Priority System entegrasyonu

    - Pause Resonance when Overdrive activates
    - Resume Resonance when Overdrive ends
    - _Requirements: State Priority System_


  - [x] 13.4 Snapshot capture entegrasyonu





    - Capture snapshot every frame (60fps)
    - Handle RESTORING state (pause physics, render only)
    - _Requirements: 7.1, Render Loop Note_

- [x] 14. Render ve Efektler





  - [x] 14.1 utils/collectibleRenderer.ts oluştur


    - `renderCollectible()` - Neon Cyan (#00F0FF) fill
    - Rotating wireframe border at 2 rad/s
    - Collection particle burst effect
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 14.2 S.H.I.F.T. HUD rendering
    - Render all 5 letters: collected full opacity, uncollected 30%

    - _Requirements: 2.3_
  - [x] 14.3 Overdrive visual effects
    - Ying-Yang Core with pulsing glow at 2Hz
    - Shatter particle effect (20 particles) on obstacle destruction
    - Flash HUD timer red at 4Hz when below 3 seconds
    - Power-down transition over 500ms

    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 14.4 Resonance visual effects
    - Color scheme inversion
    - Screen shake intensity +50%
    - Particle emission rate +100%

    - 500ms color transition on end
    - _Requirements: 6.1, 6.3, 6.4, 6.5_
  - [x] 14.5 Restore visual effects
    - VHS static effect for restore UI
    - VHS rewind visual effect during restore
    - _Requirements: 8.9, 8.10_

- [x] 15. UI Components






  - [x] 15.1 components/Restore/RestorePrompt.tsx güncelle

    - "System Crash" game over UI
    - Show restore cost (100 shards) and current balance
    - Disable button when balance < 100 with "Insufficient Shards"
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 16. Veri Kalıcılığı (Persistence)






  - [x] 16.1 Echo Shards persistence

    - Save currency to localStorage on change
    - Load currency from localStorage on app start
    - _Requirements: Data Persistence Note_

- [x] 17. Final Checkpoint - All Tests Pass





  - Ensure all tests pass, ask the user if questions arise.
