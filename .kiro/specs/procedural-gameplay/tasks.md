# Implementation Plan

## Faz 1: Flow Curve System

- [x] 1. Logaritmik hız sistemi implementasyonu





  - [x] 1.1 FlowCurve modülü oluştur (systems/flowCurve.ts)


    - FlowCurveConfig interface tanımla
    - calculateGameSpeed fonksiyonu: MIN_SPEED + log10(score/100 + 1) * 6
    - determinePhase fonksiyonu: warmup/groove/plateau
    - DEFAULT_FLOW_CURVE_CONFIG sabiti
    - _Requirements: 1.1, 1.2, 1.3_
  - [x]* 1.2 Write property test for speed formula correctness


    - **Property 1: Speed Formula Correctness**
    - **Validates: Requirements 1.2**
  - [x]* 1.3 Write property test for speed cap enforcement



    - **Property 2: Speed Cap Enforcement**
    - **Validates: Requirements 1.3**

  - [x] 1.4 GameEngine'e FlowCurve entegrasyonu

    - Mevcut doğrusal hız artışını logaritmik formülle değiştir
    - speed.current hesaplamasını calculateGameSpeed ile yap
    - _Requirements: 1.2, 1.4, 1.5, 1.6_

- [x] 2. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 2: Pattern System Core

- [x] 3. Pattern data yapıları ve kütüphane





  - [x] 3.1 Pattern interface ve data tanımları (data/patterns.ts)


    - Lane, PatternObstacle, PatternShard, Pattern interface'leri
    - 5 temel pattern: Gate, Breather, Zig-Zag, Tunnel, Gauntlet
    - Her pattern için obstacles ve shards dizileri
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 3.2 Pattern serialization fonksiyonları


    - serializePattern: Pattern → JSON string
    - deserializePattern: JSON string → Pattern
    - validatePattern: Pattern yapı doğrulama
    - _Requirements: 2.6, 2.7_
  - [x] 3.3 Write property test for pattern serialization round-trip



    - **Property 5: Pattern Serialization Round-Trip**
    - **Validates: Requirements 2.6, 2.7**

- [x] 4. Pattern Manager implementasyonu





  - [x] 4.1 PatternManager modülü oluştur (systems/patternManager.ts)


    - PatternManagerState interface
    - selectPattern fonksiyonu
    - updatePatternSpawn fonksiyonu
    - isPatternComplete fonksiyonu
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 4.2 Write property test for pattern obstacle completeness



    - **Property 3: Pattern Obstacle Completeness**
    - **Validates: Requirements 2.2**

  - [x] 4.3 Write property test for pattern lane correctness


    - **Property 4: Pattern Lane Correctness**
    - **Validates: Requirements 2.4**

- [x] 5. Spawn Interval hesaplama





  - [x] 5.1 Spawn interval fonksiyonları ekle (systems/patternManager.ts)


    - SpawnConfig interface
    - calculateSpawnInterval: REACTION_TIME / (speed / 10)
    - MIN_INTERVAL (400ms) kontrolü
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 5.2 Write property test for spawn interval formula



    - **Property 6: Spawn Interval Formula Correctness**
    - **Validates: Requirements 4.1, 4.4**

- [x] 6. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 3: Difficulty Progression

- [x] 7. Zorluk progresyon sistemi






  - [x] 7.1 DifficultyProgression modülü oluştur (systems/difficultyProgression.ts)

    - DifficultyThreshold interface
    - DIFFICULTY_THRESHOLDS sabiti (0, 1000, 2500, 5000)
    - getCurrentDifficultyThreshold fonksiyonu
    - selectPatternByWeight fonksiyonu
    - isPatternAvailable fonksiyonu
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 7.2 Write property test for pattern availability by score



    - **Property 10: Pattern Availability by Score**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
  - [x] 7.3 Write property test for difficulty weight distribution



    - **Property 11: Difficulty Weight Distribution**
    - **Validates: Requirements 7.5**

- [x] 8. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 4: Shard Placement System

- [x] 9. Akıllı elmas yerleşim sistemi





  - [x] 9.1 ShardPlacement modülü oluştur (systems/shardPlacement.ts)


    - ShardConfig, PlacedShard interface'leri
    - calculateSafeShardPosition fonksiyonu
    - calculateRiskyShardPosition fonksiyonu
    - collectShard fonksiyonu (Near Miss bonus dahil)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 9.2 Write property test for shard position validity



    - **Property 7: Shard Position Validity**
    - **Validates: Requirements 5.1**

  - [x] 9.3 Write property test for shard collection value


    - **Property 8: Shard Collection Value**
    - **Validates: Requirements 5.4, 5.5**

  - [x] 9.4 Dinamik hareket sistemi ekle (Dynamic Shard Movement)

    - ShardMovement interface tanımla (vertical/horizontal oscillation)
    - SHARD_MOVEMENT_CONFIG sabiti (safe vs risky hareket parametreleri)
    - generateShardMovement fonksiyonu
    - calculateShardPosition fonksiyonu (sinüzoidal hareket)
    - updateShardPosition fonksiyonu
    - PlacedShard'a baseX, baseY, movement, spawnTime alanları ekle
    - _Requirements: 5.6, 5.7, 5.8, 5.9_

  - [x] 9.5 Write property tests for dynamic shard movement

    - Movement amplitude within configured ranges
    - Position oscillates around base position
    - Safe shards have gentler movement than risky shards
    - **Validates: Requirements 5.6, 5.7, 5.8, 5.9**

- [x] 10. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 5: Object Pooling

- [x] 11. Object Pool sistemi





  - [x] 11.1 ObjectPool modülü oluştur (systems/objectPool.ts)


    - ObjectPool<T> generic interface
    - PooledObstacle, PooledShard interface'leri
    - createObstaclePool fonksiyonu
    - createShardPool fonksiyonu
    - acquire, release, reset, getActive metodları
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 11.2 Write property test for object pool invariant



    - **Property 9: Object Pool Invariant**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

- [x] 12. Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.

## Faz 6: GameEngine Entegrasyonu

- [x] 13. GameEngine'e tam entegrasyon



  - [x] 13.1 Mevcut spawnObstacle fonksiyonunu Pattern-based sisteme geçir


    - PatternManager state'i ekle
    - spawnObstacle yerine pattern-based spawn kullan
    - Pattern tamamlandığında yeni pattern seç
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_


  - [x] 13.2 Object Pool entegrasyonu
    - Obstacle ve Shard pool'larını initialize et
    - Mevcut obstacle/shard oluşturmayı pool.acquire() ile değiştir
    - Ekran dışına çıkan nesneleri pool.release() ile geri al

    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 13.3 Shard rendering ve collection

    - Pattern'den gelen shard'ları renderla
    - Collision detection ile shard toplama
    - Near Miss bonus hesaplama
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 13.4 Difficulty progression entegrasyonu


    - Score'a göre pattern seçimini difficulty system'e bağla
    - Pattern weight'lerini uygula
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14. Final Checkpoint - Tüm testlerin geçtiğinden emin ol





  - Ensure all tests pass, ask the user if questions arise.
