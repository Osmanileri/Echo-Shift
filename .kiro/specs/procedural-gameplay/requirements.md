# Requirements Document

## Introduction

Echo Shift oyununda rastgele (random) engel ve hız sisteminden algoritmik tasarıma (procedural generation) geçiş projesi. Bu geliştirme, oyunun "bozulmuş" hissinden profesyonel arcade hissiyatına dönüşümünü sağlar. Üç ana sistem içerir: Logaritmik Hız Eğrisi (Flow Curve), Desen Bazlı Engel Sistemi (Pattern-Based Spawning), ve Akıllı Elmas Yerleşimi (Risk & Reward Shards).

## Glossary

- **Flow Curve**: Oyun hızının zamana/skora göre logaritmik artış eğrisi
- **Pattern**: Önceden tasarlanmış engel ve elmas dizilimi (chunk)
- **Spawn Interval**: İki engel grubu arasındaki zaman aralığı
- **Reaction Time**: Oyuncunun bir engele tepki vermesi için gereken minimum süre
- **Speed Cap**: Oyun hızının ulaşabileceği maksimum değer (insan refleks sınırı)
- **Warm-up Phase**: Oyunun başlangıcındaki yavaş adaptasyon süresi
- **Groove Phase**: Hızın tatlı sertlikte arttığı akış dönemi
- **Plateau Phase**: Hızın sabitlenip zorluğun desenlerden geldiği dönem
- **Safe Shard**: İki engel arasında güvenli konumda bulunan elmas
- **Risky Shard**: Engelin dibinde veya köşesinde bulunan, risk gerektiren elmas
- **Object Pool**: Performans için yeniden kullanılan nesne havuzu
- **Lane**: Oyun pistinin üst veya alt yarısı (TOP/BOTTOM)
- **Near Miss**: Engele çok yakın geçiş (risk ödülü)

## Requirements

### Requirement 1: Logaritmik Hız Eğrisi (Flow Curve)

**User Story:** As a player, I want the game speed to increase smoothly and cap at a human-playable maximum, so that I can experience a fair challenge without feeling the game is broken.

#### Acceptance Criteria

1. WHEN the game starts THEN the Speed System SHALL set the initial speed to MIN_SPEED (3.0 units = 30km/h)
2. WHEN the score increases THEN the Speed System SHALL calculate speed using logarithmic formula: MIN_SPEED + log10(score/500 + 1) * 2.5
3. WHEN the calculated speed exceeds MAX_SPEED (14 units = 140km/h) THEN the Speed System SHALL cap the speed at MAX_SPEED
4. WHILE the score is below 500 (Warm-up Phase) THEN the Speed System SHALL maintain speed below 10 units
5. WHILE the score is between 500 and 5000 (Groove Phase) THEN the Speed System SHALL allow gradual speed increase
6. WHILE the score exceeds 5000 (Plateau Phase) THEN the Speed System SHALL maintain speed near MAX_SPEED
7. WHEN increasing speed over time THEN the Speed System SHALL use 2000ms intervals with 0.08 unit increments (slower progression)

---

### Requirement 2: Desen Bazlı Engel Sistemi (Pattern-Based Spawning)

**User Story:** As a player, I want obstacles to appear in designed patterns rather than random positions, so that I face fair and learnable challenges.

#### Acceptance Criteria

1. WHEN the game spawns obstacles THEN the Pattern System SHALL select from predefined pattern configurations
2. WHEN a pattern is selected THEN the Pattern System SHALL spawn all obstacles defined in that pattern's obstacle array
3. WHEN spawning pattern obstacles THEN the Pattern System SHALL respect each obstacle's timeOffset relative to pattern start
4. WHEN spawning pattern obstacles THEN the Pattern System SHALL place obstacles in the lane (TOP/BOTTOM) specified by the pattern
5. WHEN the current pattern completes THEN the Pattern System SHALL select the next pattern based on difficulty progression
6. WHEN serializing pattern data THEN the Pattern System SHALL encode patterns as JSON for configuration
7. WHEN deserializing pattern data THEN the Pattern System SHALL parse JSON and validate pattern structure

---

### Requirement 3: Desen Kütüphanesi (Pattern Library)

**User Story:** As a game designer, I want a library of obstacle patterns, so that the game offers variety and teaches different skills.

#### Acceptance Criteria

1. WHEN the Gate pattern is active THEN the Pattern System SHALL spawn simultaneous TOP and BOTTOM obstacles with a passable gap
2. WHEN the Zig-Zag pattern is active THEN the Pattern System SHALL spawn alternating TOP-BOTTOM-TOP-BOTTOM obstacles
3. WHEN the Tunnel pattern is active THEN the Pattern System SHALL spawn consecutive same-lane obstacles forcing single-lane play
4. WHEN the Gauntlet pattern is active THEN the Pattern System SHALL spawn rapid alternating obstacles with minimal gaps
5. WHEN the Breather pattern is active THEN the Pattern System SHALL spawn sparse obstacles allowing recovery

---

### Requirement 4: Hıza Göre Spawn Aralığı (Speed-Synchronized Spawning)

**User Story:** As a player, I want obstacle spacing to adjust with speed, so that I always have fair reaction time regardless of game speed.

#### Acceptance Criteria

1. WHEN calculating spawn interval THEN the Spawn System SHALL use formula: REACTION_TIME / (currentSpeed / 10)
2. WHEN the base REACTION_TIME is set THEN the Spawn System SHALL use 1200ms as the default value
3. WHEN speed increases THEN the Spawn System SHALL decrease spawn interval proportionally
4. WHEN spawn interval is calculated THEN the Spawn System SHALL ensure minimum 400ms between pattern starts
5. WHEN obstacles spawn THEN the Spawn System SHALL maintain consistent visual spacing on screen

---

### Requirement 5: Akıllı Elmas Yerleşimi (Strategic Shard Placement)

**User Story:** As a player, I want Echo Shards placed strategically within patterns, so that I can choose between safe collection and risky rewards.

#### Acceptance Criteria

1. WHEN a pattern includes shards THEN the Shard System SHALL spawn shards at positions defined in the pattern's shard array
2. WHEN spawning a Safe Shard THEN the Shard System SHALL place the shard in the center of a gap between obstacles
3. WHEN spawning a Risky Shard THEN the Shard System SHALL place the shard adjacent to an obstacle edge
4. WHEN the player collects a shard THEN the Shard System SHALL award the shard value to the player's session total
5. WHEN a Risky Shard is collected via Near Miss THEN the Shard System SHALL award bonus points
6. WHEN a shard is spawned THEN the Shard System SHALL assign dynamic movement parameters (vertical and horizontal oscillation)
7. WHEN updating shard positions THEN the Shard System SHALL calculate sinusoidal movement based on spawn time and movement parameters
8. WHEN spawning a Safe Shard THEN the Shard System SHALL use gentle movement (15-25px vertical, 10-20px horizontal amplitude)
9. WHEN spawning a Risky Shard THEN the Shard System SHALL use aggressive movement (25-40px vertical, 20-35px horizontal amplitude)

---

### Requirement 6: Object Pooling Sistemi (Performance Optimization)

**User Story:** As a player, I want smooth gameplay without frame drops, so that I can enjoy the game at high speeds.

#### Acceptance Criteria

1. WHEN the game initializes THEN the Pool System SHALL pre-allocate obstacle and shard objects
2. WHEN an obstacle exits the screen THEN the Pool System SHALL return the obstacle to the available pool
3. WHEN a new obstacle is needed THEN the Pool System SHALL retrieve from pool instead of creating new object
4. WHEN the pool is empty THEN the Pool System SHALL expand the pool by creating additional objects
5. WHEN a shard is collected or exits screen THEN the Pool System SHALL return the shard to the available pool

---

### Requirement 7: Zorluk Progresyonu (Difficulty Progression)

**User Story:** As a player, I want difficulty to increase through pattern complexity rather than just speed, so that the challenge remains fair at high scores.

#### Acceptance Criteria

1. WHEN score is below 1000 THEN the Difficulty System SHALL select only basic patterns (Gate, Breather)
2. WHEN score reaches 1000 THEN the Difficulty System SHALL introduce Zig-Zag patterns
3. WHEN score reaches 2500 THEN the Difficulty System SHALL introduce Tunnel patterns
4. WHEN score reaches 5000 THEN the Difficulty System SHALL introduce Gauntlet patterns
5. WHEN selecting patterns THEN the Difficulty System SHALL weight selection toward harder patterns as score increases
6. WHEN in Plateau Phase THEN the Difficulty System SHALL rely primarily on pattern complexity for challenge

