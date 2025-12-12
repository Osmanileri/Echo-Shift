# Requirements Document

## Introduction

Bu doküman, Shadow Sync oyununa eklenecek üç gelişmiş oyun mekaniğini tanımlar: Ritim Modu (Tempo Focus), Gravite Değişimi (Screen Flip) ve Kritik Vuruş (Close Call Scoring). Bu mekanikler, oyunun derinliğini artırarak oyunculara risk-ödül kararları ve anlık adaptasyon gerektiren yeni zorluklar sunar.

## Glossary

- **Shadow Sync**: Siyah ve beyaz orbların bağlı olduğu, engelleri geçerek puan toplanan oyun
- **Orb**: Oyuncunun kontrol ettiği siyah veya beyaz top
- **Obstacle**: Ekranda hareket eden ve orbların çarpışmaması gereken engeller
- **Polarity**: Bir engelin veya orbun renk durumu (siyah/beyaz)
- **Swap**: Orbların dikey pozisyonlarını değiştirme aksiyonu
- **Rhythm Multiplier**: Ardışık başarılı engel geçişlerinde kazanılan puan çarpanı
- **Near Miss Distance**: Bir orbun engelin kenarına olan minimum mesafesi
- **Gravity Flip**: Ekranın dikey gravitesinin tersine dönmesi
- **Phasing**: Swap animasyonu sırasında geçici dokunulmazlık durumu
- **Dynamic Midline**: Oyun sırasında sinüzoidal hareketle salınan merkez çizgi
- **Midline Amplitude**: Merkez çizginin ekran yüksekliğinin yüzdesi olarak maksimum kayma miktarı
- **Midline Frequency**: Merkez çizginin salınım hızını belirleyen dalga frekansı
- **Zone**: Merkez çizginin üstündeki (siyah) veya altındaki (beyaz) oyun alanı
- **Movement Bounds**: Oyuncunun dikey hareket edebileceği minimum ve maksimum Y koordinatları
- **Micro-Phasing**: Merkez çizgi sınırında geçici dokunulmazlık durumu
- **Forecasting Hint**: Salınım yönünü gösteren öngörü gölgesi
- **Tension Tone**: Maksimum genliğe yaklaşırken çalan gerilim sesi
- **Phantom Obstacle**: Saydam olarak başlayan, oyuncuya yaklaştıkça görünür hale gelen engel
- **Latent Mode**: Engelin görünmez modda başlayıp zamanla görünür hale gelme durumu
- **Reveal Distance**: Bir engelin tam olarak görünür olacağı canvas'ın sağ kenarından olan minimum mesafesi (piksel)
- **Opacity Formula**: Engelin saydamlık değerini hesaplayan formül: α = max(0, min(1, (X_current - RevealDistance) / (X_initial - RevealDistance)))

## Requirements

### Requirement 1: Ritim Modu (Tempo Focus)

**User Story:** As a player, I want to earn bonus points by passing obstacles in a rhythmic pattern, so that I can maximize my score through skillful timing.

#### Acceptance Criteria

1. WHEN a player successfully passes an obstacle without collision THEN the Rhythm System SHALL start a timing window for the next obstacle pass
2. WHEN a player passes the next obstacle within ±50ms of the expected rhythm interval THEN the Rhythm System SHALL increment the rhythm streak counter by one
3. WHEN the rhythm streak counter reaches 5 THEN the Rhythm System SHALL activate a score multiplier of x2 and display "RHYTHM!" text on screen
4. WHEN the rhythm streak counter reaches 10 THEN the Rhythm System SHALL upgrade the score multiplier to x3
5. WHEN a player collides with an obstacle OR misses the timing window THEN the Rhythm System SHALL reset the rhythm streak counter to zero and deactivate any active multiplier
6. WHEN the game speed increases THEN the Rhythm System SHALL proportionally decrease the expected rhythm interval to match the new obstacle frequency
7. WHEN a score multiplier is active THEN the Scoring System SHALL multiply the base obstacle pass score (10 points) by the active multiplier value

### Requirement 2: Gravite Değişimi (Screen Flip)

**User Story:** As a player, I want to experience sudden gravity inversions at high scores, so that I can test my mental adaptability and reflexes.

#### Acceptance Criteria

1. WHEN the player's score reaches 1000 points THEN the Gravity System SHALL become eligible to trigger gravity flip events
2. WHEN a gravity flip event triggers THEN the Gravity System SHALL swap the vertical positions of the top (black) and bottom (white) background zones within 300ms
3. WHEN a gravity flip occurs THEN the Gravity System SHALL mirror the player's vertical position relative to the screen center
4. WHEN a gravity flip is active THEN the Obstacle System SHALL spawn obstacles with inverted lane assignments (top obstacles appear at bottom, bottom obstacles appear at top)
5. WHEN a gravity flip event triggers THEN the Gravity System SHALL display a visual warning indicator 500ms before the flip occurs
6. WHEN a gravity flip is active THEN the Gravity System SHALL maintain the flipped state for a minimum of 5 seconds before allowing another flip
7. WHEN a gravity flip occurs THEN the Gravity System SHALL grant a 200ms invincibility window to allow player adjustment

### Requirement 3: Kritik Vuruş (Close Call Scoring)

**User Story:** As a player, I want to earn bonus points by narrowly avoiding obstacles, so that I can take calculated risks for higher scores.

#### Acceptance Criteria

1. WHEN an orb passes an obstacle with a clearance distance less than the orb radius (9 pixels) THEN the Near Miss System SHALL classify this as a "close call"
2. WHEN a close call occurs THEN the Scoring System SHALL award double points (20 instead of 10) for that obstacle pass
3. WHEN a close call occurs THEN the Visual System SHALL display a floating "+20" score popup that animates upward and fades out near the orb position
4. WHEN a close call occurs THEN the Visual System SHALL create a brief cyan glow pulse effect around the orb that performed the near miss
5. WHEN a close call occurs THEN the Visual System SHALL emit 5-8 small spark particles from the point of closest approach between orb and obstacle
6. WHEN calculating close call distance THEN the Near Miss System SHALL measure from the orb edge to the nearest obstacle edge
7. WHEN multiple close calls occur in succession (within 2 seconds) THEN the Near Miss System SHALL increment a close call streak counter
8. WHEN the close call streak reaches 3 THEN the Scoring System SHALL award an additional 50 point bonus and display "PERFECT DODGE!" text
9. WHEN a close call streak bonus is awarded THEN the Visual System SHALL create an enhanced particle burst effect with golden color

### Requirement 4: Dinamik Merkez Çizgi (Dynamic Midline)

**User Story:** As a player, I want the horizon line to oscillate dynamically during gameplay, so that I must anticipate environmental changes and adapt my positioning strategy.

#### Acceptance Criteria

1. WHEN the game loop updates THEN the Midline System SHALL calculate the current midline Y position using a sinusoidal function based on elapsed game time
2. WHEN calculating midline position THEN the Midline System SHALL use the formula: Y_midline = (H/2) + (H × amplitude × sin(time × frequency + offset)) where H is canvas height, base amplitude is 0.05 (5% of screen), and base frequency is 0.005
3. WHEN rendering the background THEN the Visual System SHALL draw the black zone from Y=0 to Y=currentMidlineY and the white zone from Y=currentMidlineY to Y=canvasHeight
4. WHEN rendering the horizon line THEN the Visual System SHALL draw the dividing line at the currentMidlineY position instead of the fixed center
5. WHEN the midline position changes THEN the Player Movement System SHALL recalculate the valid movement bounds for the player based on the new midline position
6. WHEN checking obstacle polarity collision THEN the Collision System SHALL determine orb zone (black or white) based on whether the orb Y position is above or below the currentMidlineY
7. WHEN the midline reaches maximum amplitude (peak or trough) THEN the Visual System SHALL display a subtle visual tension indicator using a cyan highlight on the horizon line
8. WHEN the player's available movement space becomes critically small (less than 30% of normal) THEN the Warning System SHALL display a color tint warning to alert the player
9. WHEN the game resets THEN the Midline System SHALL reset the time counter and return the midline to the center position
10. WHEN serializing midline state THEN the Midline System SHALL store and restore the current time offset to maintain continuity
11. WHEN the game speed increases THEN the Midline System SHALL dynamically increase the oscillation frequency using the formula: Frequency_current = Frequency_base × (1 + 0.1 × (Score / 5000))
12. WHEN the player's score exceeds threshold values (2000, 5000) THEN the Midline System SHALL increase the amplitude from 0.05 to 0.08 in graduated steps
13. WHEN an orb is within ±10 pixels of the currentMidlineY during a collision check THEN the Collision System SHALL apply a micro-phasing (brief invincibility) to prevent unfair deaths at zone boundaries
14. WHEN the midline is 500ms away from reaching maximum or minimum amplitude THEN the Visual System SHALL display a semi-transparent directional shadow on the horizon line indicating the upcoming oscillation direction
15. WHEN the midline approaches maximum amplitude THEN the Audio System SHALL gradually increase a high-frequency tension tone, and decrease the tone when returning to center

### Requirement 5: Görünmez/Gecikmeli Bloklar (Phantom Obstacles)

**User Story:** As a player, I want some obstacles to start transparent and become visible as they approach me, so that I must rely on anticipation and rhythm rather than pure reflexes.

#### Acceptance Criteria

1. WHEN the player's score exceeds 500 points THEN the Obstacle System SHALL enable phantom obstacle spawning in the spawn pool
2. WHEN a phantom obstacle spawns THEN the Obstacle System SHALL set the obstacle's isLatent property to true and assign a revealDistance value of 300 pixels
3. WHEN rendering a phantom obstacle THEN the Visual System SHALL calculate the opacity using the formula: α = max(0, min(1, (X_current - RevealDistance) / (X_initial - RevealDistance)))
4. WHEN a phantom obstacle is fully transparent (α < 0.05) THEN the Visual System SHALL render a faint outline (α = 0.05) to provide a subtle "ghost" hint of the obstacle's position
5. WHEN a phantom obstacle's X position is less than or equal to the revealDistance THEN the Visual System SHALL render the obstacle at full opacity (α = 1.0)
6. WHEN checking collision with a phantom obstacle THEN the Collision System SHALL detect collisions regardless of the obstacle's current opacity value
7. WHEN a player successfully passes a phantom obstacle THEN the Scoring System SHALL award 20 bonus points in addition to the base obstacle pass score (total 30 points)
8. WHEN spawning obstacles THEN the Obstacle System SHALL calculate the phantom spawn probability using the formula: P = min(0.40, 0.10 + 0.30 × (Score - 500) / 4500) for scores above 500
9. WHEN the game speed increases THEN the Obstacle System SHALL maintain the same revealDistance value to preserve the anticipation challenge
10. WHEN a phantom obstacle is passed with a near miss THEN the Scoring System SHALL apply a x2 multiplier to the phantom bonus, awarding 40 bonus points plus base score (total 60 points)
11. WHEN the player's score exceeds 5000 points THEN the Obstacle System SHALL cap the phantom spawn probability at 40%
