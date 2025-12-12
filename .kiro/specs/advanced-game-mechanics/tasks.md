# Implementation Plan

- [x] 1. Tip tanımları ve sabitleri güncelle






  - [x] 1.1 types.ts'e yeni interface'leri ekle

    - RhythmState, GravityState, NearMissState interface'lerini ekle
    - ScorePopup ve VisualEffect tiplerini ekle
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 1.2 constants.ts'e yeni konfigürasyon sabitlerini ekle

    - RHYTHM_CONFIG, GRAVITY_CONFIG, NEAR_MISS_CONFIG objelerini ekle
    - _Requirements: 1.2, 1.6, 2.6, 3.1, 3.7_

- [x] 2. Near Miss sistemi implementasyonu





  - [x] 2.1 gameMath.ts'e checkNearMiss fonksiyonunu ekle


    - Orb-obstacle mesafe hesaplama
    - Near miss threshold kontrolü
    - Closest point hesaplama
    - _Requirements: 3.1, 3.6_
  - [x] 2.2 Near miss streak ve bonus mantığını ekle


    - Streak counter ve time window kontrolü
    - Bonus puan hesaplama
    - _Requirements: 3.2, 3.7, 3.8_

- [x] 3. Ritim sistemi implementasyonu





  - [x] 3.1 rhythmSystem.ts dosyasını oluştur


    - calculateExpectedInterval fonksiyonu
    - checkRhythmTiming fonksiyonu
    - getMultiplierForStreak fonksiyonu
    - updateRhythmState fonksiyonu
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 4. Gravite sistemi implementasyonu





  - [x] 4.1 Gravite utility fonksiyonlarını ekle


    - shouldTriggerFlip fonksiyonu
    - mirrorPlayerPosition fonksiyonu
    - getFlippedLane fonksiyonu
    - _Requirements: 2.1, 2.3, 2.4, 2.6_

- [x] 5. GameEngine entegrasyonu - Near Miss





  - [x] 5.1 Near miss state ref'lerini ekle


    - nearMissState ref oluştur
    - resetGame'de sıfırla
    - _Requirements: 3.1_
  - [x] 5.2 Collision loop'una near miss kontrolü ekle


    - checkNearMiss çağrısı
    - Bonus puan ekleme
    - Streak güncelleme
    - _Requirements: 3.1, 3.2, 3.7, 3.8_
  - [x] 5.3 Near miss görsel efektlerini ekle


    - Floating score popup (+20)
    - Cyan glow pulse efekti
    - Spark parçacıkları
    - "PERFECT DODGE!" text (streak 3'te)
    - _Requirements: 3.3, 3.4, 3.5, 3.9_

- [x] 6. GameEngine entegrasyonu - Ritim





  - [x] 6.1 Rhythm state ref'lerini ekle


    - rhythmState ref oluştur
    - resetGame'de sıfırla
    - _Requirements: 1.1_
  - [x] 6.2 Scoring logic'e ritim kontrolü ekle


    - Engel geçişinde timing check
    - Streak ve multiplier güncelleme
    - Puan çarpma
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_
  - [x] 6.3 Ritim görsel efektlerini ekle


    - "RHYTHM!" text gösterimi
    - Multiplier indicator
    - _Requirements: 1.3_

- [x] 7. GameEngine entegrasyonu - Gravite





  - [x] 7.1 Gravity state ref'lerini ekle


    - gravityState ref oluştur
    - resetGame'de sıfırla
    - _Requirements: 2.1_
  - [x] 7.2 Gravite flip mantığını ekle


    - Score threshold kontrolü
    - Flip trigger ve cooldown
    - Player position mirroring
    - Invincibility window
    - _Requirements: 2.1, 2.3, 2.6, 2.7_
  - [x] 7.3 Obstacle spawn'da lane inversion ekle


    - isFlipped durumuna göre lane değiştir
    - _Requirements: 2.4_
  - [x] 7.4 Gravite görsel efektlerini ekle


    - Warning indicator (500ms önce)
    - Background swap animasyonu
    - _Requirements: 2.2, 2.5_

- [x] 8. GameUI güncellemeleri





  - [x] 8.1 Multiplier göstergesini ekle


    - Aktif çarpan değerini göster (x2, x3)
    - _Requirements: 1.3, 1.4_

  - [x] 8.2 Streak counter göstergesini ekle

    - Rhythm streak sayısı
    - Near miss streak sayısı
    - _Requirements: 1.2, 3.7_

- [-] 9. Dinamik Merkez Çizgi sistemi implementasyonu





  - [x] 9.1 types.ts'e MidlineState ve MidlineConfig interface'lerini ekle

    - MidlineState: startTime, currentMidlineY, normalizedOffset, currentAmplitude, currentFrequency, isAtPeak, isMicroPhasing, tensionIntensity
    - MidlineConfig: baseAmplitude, maxAmplitude, baseFrequency, thresholds, microPhasingDistance, forecastTime, criticalSpaceRatio
    - _Requirements: 4.1, 4.2_

  - [x] 9.2 constants.ts'e MIDLINE_CONFIG sabitlerini ekle


    - baseAmplitude: 0.05, maxAmplitude: 0.08
    - baseFrequency: 0.005, frequencyScaleFactor: 0.1
    - amplitudeThreshold1: 2000, amplitudeThreshold2: 5000
    - microPhasingDistance: 10, forecastTime: 500, criticalSpaceRatio: 0.30
    - _Requirements: 4.2, 4.11, 4.12, 4.13_

  - [x] 9.3 midlineSystem.ts dosyasını oluştur



    - calculateMidlineY fonksiyonu - sinüzoidal pozisyon hesaplama
    - calculateDynamicFrequency fonksiyonu - skora göre frekans
    - calculateDynamicAmplitude fonksiyonu - skora göre genlik
    - getOrbZone fonksiyonu - bölge belirleme
    - shouldApplyMicroPhasing fonksiyonu - sınır dokunulmazlığı
    - calculateMovementBounds fonksiyonu - hareket sınırları
    - isCriticalSpace fonksiyonu - kritik alan tespiti
    - calculateTensionIntensity fonksiyonu - ses yoğunluğu
    - predictPeakTime fonksiyonu - peak tahmini
    - createInitialMidlineState fonksiyonu - başlangıç state'i
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 4.8, 4.11, 4.12, 4.13, 4.14, 4.15_

  - [x] 9.4 Write property test for midline position bounds






    - **Property 15: Midline position bounds**
    - **Validates: Requirements 4.1, 4.2**


  - [x] 9.5 Write property test for midline formula correctness





    - **Property 16: Midline formula correctness**
    - **Validates: Requirements 4.2**

  - [x] 9.6 Write property test for zone determination






    - **Property 17: Zone determination correctness**
    - **Validates: Requirements 4.6**

  - [x]* 9.7 Write property test for movement bounds validity


    - **Property 18: Movement bounds validity**
    - **Validates: Requirements 4.5**


  - [x]* 9.8 Write property test for critical space detection

    - **Property 19: Critical space detection**
    - **Validates: Requirements 4.8**



  - [ ]* 9.9 Write property test for midline state serialization
    - **Property 20: Midline state serialization round-trip**
    - **Validates: Requirements 4.10**



  - [ ]* 9.10 Write property test for dynamic frequency calculation
    - **Property 21: Dynamic frequency calculation**

    - **Validates: Requirements 4.11**


  - [-]* 9.11 Write property test for dynamic amplitude thresholds

    - **Property 22: Dynamic amplitude thresholds**
    - **Validates: Requirements 4.12**



  - [ ]* 9.12 Write property test for micro-phasing boundary detection
    - **Property 23: Micro-phasing boundary detection**
    - **Validates: Requirements 4.13**



  - [ ]* 9.13 Write property test for peak prediction timing
    - **Property 24: Peak prediction timing**
    - **Validates: Requirements 4.14**


  - [x]* 9.14 Write property test for tension intensity calculation

    - **Property 25: Tension intensity calculation**
    - **Validates: Requirements 4.15**

- [x] 10. GameEngine entegrasyonu - Dinamik Merkez Çizgi






  - [x] 10.1 Midline state ref'lerini ekle


    - midlineState ref oluştur
    - startTime ref oluştur
    - resetGame'de sıfırla
    - _Requirements: 4.1, 4.9_

  - [x] 10.2 Game loop'a midline hesaplama mantığını ekle


    - Her frame'de calculateMidlineY çağrısı
    - Dinamik frekans ve genlik hesaplama
    - currentMidlineY güncelleme
    - _Requirements: 4.1, 4.2, 4.11, 4.12_

  - [x] 10.3 Arka plan render'ını dinamik midline'a göre güncelle


    - Siyah bölge: Y=0 to Y=currentMidlineY
    - Beyaz bölge: Y=currentMidlineY to Y=canvasHeight
    - Ufuk çizgisini currentMidlineY'de çiz
    - _Requirements: 4.3, 4.4_

  - [x] 10.4 Oyuncu hareket sınırlarını dinamik midline'a göre güncelle


    - calculateMovementBounds çağrısı
    - Player clamp logic güncelleme
    - _Requirements: 4.5_

  - [x] 10.5 Collision kontrolüne zone-based polarity check ekle


    - getOrbZone ile orb bölgesi belirleme
    - Micro-phasing kontrolü ekleme
    - _Requirements: 4.6, 4.13_

  - [x] 10.6 Dinamik midline görsel efektlerini ekle


    - Peak/trough'da cyan highlight
    - Kritik alan uyarısı (renk tonu)
    - Forecasting hint (yön gölgesi)
    - _Requirements: 4.7, 4.8, 4.14_

  - [x] 10.7 Gerilim ses sistemi entegrasyonu (opsiyonel)


    - calculateTensionIntensity ile ses yoğunluğu
    - Web Audio API veya ses dosyası kullanımı
    - _Requirements: 4.15_

- [x] 11. Checkpoint - Tüm testlerin geçtiğinden emin ol
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Phantom Obstacles sistemi implementasyonu






  - [x] 12.1 types.ts'e Obstacle interface güncellemesi ekle


    - isLatent?: boolean - Engelin görünmez modda başlayıp başlamadığı
    - revealDistance?: number - Tam görünür olacağı mesafe (piksel)
    - initialX?: number - Spawn anındaki X koordinatı
    - _Requirements: 5.2_

  - [x] 12.2 constants.ts'e PHANTOM_CONFIG sabitlerini ekle


    - activationScore: 500, revealDistance: 300
    - baseSpawnProbability: 0.10, maxSpawnProbability: 0.40
    - probabilityMaxScore: 5000, minOpacity: 0.05
    - bonusPoints: 20, nearMissMultiplier: 2
    - _Requirements: 5.1, 5.2, 5.7, 5.8, 5.10, 5.11_

  - [x] 12.3 phantomSystem.ts dosyasını oluştur


    - calculatePhantomOpacity fonksiyonu - saydamlık hesaplama
    - getEffectiveOpacity fonksiyonu - minimum eşik uygulama
    - calculatePhantomSpawnProbability fonksiyonu - spawn olasılığı
    - shouldSpawnAsPhantom fonksiyonu - phantom spawn kararı
    - calculatePhantomBonus fonksiyonu - bonus puan hesaplama
    - createPhantomObstacle fonksiyonu - phantom engel oluşturma
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8, 5.10_

  - [x] 12.4 Write property test for phantom activation threshold






    - **Property 26: Phantom activation threshold**
    - **Validates: Requirements 5.1**



  - [ ]* 12.5 Write property test for phantom opacity formula
    - **Property 27: Phantom opacity formula correctness**
    - **Validates: Requirements 5.3**


  - [x]* 12.6 Write property test for minimum opacity threshold

    - **Property 28: Minimum opacity threshold**
    - **Validates: Requirements 5.4**


  - [x]* 12.7 Write property test for spawn probability formula

    - **Property 29: Phantom spawn probability formula**
    - **Validates: Requirements 5.8, 5.11**


  - [x]* 12.8 Write property test for phantom bonus calculation


    - **Property 30: Phantom bonus calculation**
    - **Validates: Requirements 5.7, 5.10**

- [x] 13. GameEngine entegrasyonu - Phantom Obstacles






  - [x] 13.1 Obstacle spawn mantığına phantom kontrolü ekle


    - shouldSpawnAsPhantom çağrısı
    - createPhantomObstacle ile phantom engel oluşturma
    - _Requirements: 5.1, 5.2, 5.8_


  - [x] 13.2 Render loop'a phantom opacity hesaplama ekle

    - calculatePhantomOpacity çağrısı
    - getEffectiveOpacity ile minimum eşik uygulama
    - ctx.globalAlpha ayarlama
    - Hayalet kontur çizimi (α = 0.05)
    - _Requirements: 5.3, 5.4, 5.5_



  - [x] 13.3 Scoring logic'e phantom bonus ekle
    - Phantom engel geçişinde +20 bonus
    - Near miss + phantom kombinasyonunda x2 çarpan (toplam 60 puan)
    - _Requirements: 5.7, 5.10_

  - [x] 13.4 Collision detection'ın opacity'den bağımsız çalıştığını doğrula


    - Mevcut collision logic phantom engeller için değişmemeli
    - _Requirements: 5.6_

- [x] 14. GameUI güncellemeleri - Phantom Obstacles







  - [x] 14.1 Phantom bonus göstergesini ekle

    - "+30" veya "+60" floating score popup
    - Phantom engel için özel renk (mor/pembe)
    - _Requirements: 5.7, 5.10_

- [ ] 15. Final Checkpoint - Tüm testlerin geçtiğinden emin ol
  - Ensure all tests pass, ask the user if questions arise.
