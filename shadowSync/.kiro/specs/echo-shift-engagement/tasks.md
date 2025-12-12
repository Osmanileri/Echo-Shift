# Implementation Plan

## Faz 1: Harmonic Resonance (Fever Mode)

- [x] 1. Resonance System core implementasyonu





  - [x] 1.1 ResonanceSystem interface ve state tanımları (systems/resonanceSystem.ts)


    - ResonanceState, ResonanceConfig interfaces
    - checkActivation, activate, deactivate, update fonksiyonları
    - handleCollision fonksiyonu (obstacle destroy + bonus)
    - _Requirements: 1.1, 1.4, 1.5, 1.7, 1.8_
  - [ ]* 1.2 Write property test for resonance activation threshold
    - **Property 1: Resonance Activation Threshold**
    - **Validates: Requirements 1.1**
  - [x] 1.3 Color inversion utility fonksiyonu

    - invertColor(hex) fonksiyonu
    - getColorInversion() transition factor
    - _Requirements: 1.2_
  - [ ]* 1.4 Write property test for color inversion
    - **Property 2: Color Inversion Correctness**
    - **Validates: Requirements 1.2**
  - [ ]* 1.5 Write property test for resonance collision behavior
    - **Property 3: Resonance Collision Behavior**
    - **Validates: Requirements 1.4, 1.5**
  - [ ]* 1.6 Write property test for resonance timer expiration
    - **Property 4: Resonance Timer Expiration**
    - **Validates: Requirements 1.8**
  - [x] 1.7 GameEngine'e resonance entegrasyonu


    - Streak tracking ile aktivasyon
    - Collision handling değişikliği
    - Color inversion rendering
    - Explosion particle effect trigger
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.9_

- [x] 2. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 2: System Restore (Revive)

- [x] 3. Restore System implementasyonu





  - [x] 3.1 RestoreSystem interface ve state tanımları (systems/restoreSystem.ts)


    - GameSnapshot, RestoreState interfaces
    - recordSnapshot fonksiyonu (rolling buffer)
    - canRestore, executeRestore, markUsed fonksiyonları
    - serialize/deserialize fonksiyonları
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.8, 2.9, 2.11, 2.12_
  - [ ]* 3.2 Write property test for restore balance and availability
    - **Property 5: Restore Balance and Availability**
    - **Validates: Requirements 2.3, 2.8, 2.9**
  - [ ]* 3.3 Write property test for restore state rewind
    - **Property 6: Restore State Rewind**
    - **Validates: Requirements 2.5, 2.6**
  - [ ]* 3.4 Write property test for restore state round-trip
    - **Property 7: Restore State Round-Trip**
    - **Validates: Requirements 2.11, 2.12**
  - [x] 3.5 RestorePrompt UI bileşeni (components/Restore/RestorePrompt.tsx)


    - "CRITICAL ERROR" mesajı
    - Restore butonu (100 Shard cost)
    - Insufficient shards durumu
    - Static noise efekti
    - _Requirements: 2.1, 2.2, 2.4, 2.9, 2.10_

  - [x] 3.6 GameEngine'e restore entegrasyonu

    - Snapshot recording (her frame)
    - Death handling ile restore prompt
    - State rewind execution
    - Safe zone obstacle clearing
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

- [x] 4. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 3: Daily Rituals

- [x] 5. Daily Rituals System implementasyonu





  - [x] 5.1 Ritual data tanımları (data/rituals.ts)


    - RitualDefinition interface
    - RITUAL_POOL array (10 ritual)
    - BONUS_REWARD constant
    - _Requirements: 3.1_
  - [x] 5.2 DailyRitualsSystem core (systems/dailyRituals.ts)


    - seededRandom, dateToSeed utility fonksiyonları
    - generateRituals fonksiyonu
    - updateProgress, completeRitual, claimBonus fonksiyonları
    - checkDayChange fonksiyonu
    - serialize/deserialize fonksiyonları
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13_
  - [x]* 5.3 Write property test for ritual generation count


    - **Property 8: Daily Ritual Generation Count**
    - **Validates: Requirements 3.1**


  - [ ]* 5.4 Write property test for ritual determinism
    - **Property 9: Daily Ritual Determinism**
    - **Validates: Requirements 3.2, 3.11**


  - [ ]* 5.5 Write property test for ritual completion rewards
    - **Property 10: Ritual Completion Rewards**
    - **Validates: Requirements 3.3, 3.4**


  - [ ]* 5.6 Write property test for ritual progress tracking
    - **Property 11: Ritual Progress Tracking**

    - **Validates: Requirements 3.7, 3.8, 3.9, 3.10**

  - [ ]* 5.7 Write property test for ritual data round-trip
    - **Property 12: Ritual Data Round-Trip**
    - **Validates: Requirements 3.12, 3.13**
  - [x] 5.8 RitualsPanel UI bileşeni (components/Rituals/RitualsPanel.tsx)


    - Terminal-styled "Daily Logs" interface
    - Progress bars (current/target)
    - Completion status ve rewards
    - _Requirements: 3.5, 3.6_
  - [x] 5.9 GameEngine'e ritual tracking entegrasyonu


    - Near miss event tracking
    - Phantom pass tracking
    - Score accumulation tracking
    - Speed survival tracking
    - _Requirements: 3.7, 3.8, 3.9, 3.10_

- [x] 6. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 4: Haptic Feedback

- [x] 7. Haptic System implementasyonu






  - [x] 7.1 HapticSystem core (systems/hapticSystem.ts)

    - HapticType, HapticConfig interfaces
    - createHapticSystem factory fonksiyonu
    - trigger, setEnabled, checkSupport fonksiyonları
    - Vibration API wrapper
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_


  - [ ]* 7.2 Write property test for haptic settings respect
    - **Property 13: Haptic Settings Respect**
    - **Validates: Requirements 4.6**
  - [x] 7.3 GameEngine'e haptic entegrasyonu


    - Swap action haptic (light)
    - Collision haptic (heavy)
    - Near miss haptic (medium)
    - Resonance activation haptic (success)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 7.4 UI butonlarına haptic entegrasyonu


    - Button press haptic (selection)
    - _Requirements: 4.5_

  - [x] 7.5 Settings'e haptic toggle ekleme

    - Enable/disable haptic feedback
    - _Requirements: 4.6_

- [x] 8. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 5: Analytics System

- [x] 9. Analytics System implementasyonu






  - [x] 9.1 AnalyticsSystem core (systems/analyticsSystem.ts)

    - AnalyticsEventType, AnalyticsEvent interfaces
    - Event data interfaces (LevelFailData, LevelCompleteData, vb.)
    - logEvent, flush, getEvents, clear fonksiyonları
    - localStorage persistence
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_


  - [ ]* 9.2 Write property test for analytics event completeness
    - **Property 14: Analytics Event Completeness**

    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

  - [ ]* 9.3 Write property test for analytics batch persistence
    - **Property 15: Analytics Batch Persistence**
    - **Validates: Requirements 5.7**

  - [x] 9.4 GameEngine'e analytics entegrasyonu

    - Level fail event logging
    - Level complete event logging
    - Session quit event logging
    - _Requirements: 5.1, 5.2, 5.6_

  - [x] 9.5 Shop'a analytics entegrasyonu

    - Purchase event logging
    - _Requirements: 5.3_

  - [x] 9.6 Restore ve Rituals'a analytics entegrasyonu

    - Restore used event logging
    - Ritual complete event logging
    - _Requirements: 5.4, 5.5_

- [x] 10. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 6: Rate Us Flow

- [x] 11. Rate Us System implementasyonu






  - [x] 11.1 RateUsSystem core (systems/rateUsSystem.ts)

    - RateUsState, RateUsConfig interfaces
    - recordPositiveMoment, shouldShowPrompt fonksiyonları
    - markRated, markDismissed fonksiyonları
    - serialize/deserialize fonksiyonları
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  - [x]* 11.2 Write property test for rate prompt trigger


    - **Property 16: Rate Prompt Trigger**
    - **Validates: Requirements 6.1, 6.2, 6.3**



  - [ ]* 11.3 Write property test for rate prompt suppression
    - **Property 17: Rate Prompt Suppression**
    - **Validates: Requirements 6.6, 6.7**




  - [ ]* 11.4 Write property test for rate state round-trip


    - **Property 18: Rate State Round-Trip**
    - **Validates: Requirements 6.8**
  - [x] 11.5 RatePrompt UI bileşeni (components/RateUs/RatePrompt.tsx)


    - "Enjoying Echo Shift?" prompt
    - Yes/No buttons
    - Dismiss handling
    - _Requirements: 6.3, 6.4, 6.5, 6.6_
  - [x] 11.6 GameEngine'e rate tracking entegrasyonu


    - High score positive moment
    - 3-star completion positive moment
    - Prompt display logic
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 12. Final Checkpoint - Tüm testlerin geçtiğinden emin ol



  - Ensure all tests pass, ask the user if questions arise.
