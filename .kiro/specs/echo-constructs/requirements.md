# Requirements Document

## Introduction

Echo Shift v3.0'ın temel yeniliği olan Echo Constructs (Vehicle System), oyuncunun formunu ve fizik kurallarını geçici olarak değiştiren güç sistemini tanımlar. Jetpack Joyride'ın "araç = zırh" mekaniğinden ilham alınarak, her Construct farklı fizik ve input davranışı sunar. Construct'lar "Second Chance" mekanizması ile oyuncuya ekstra hayat sağlar.

## Glossary

- **Construct**: Oyuncunun geçici olarak dönüştüğü alternatif form (araç)
- **Glitch Token**: Oyun içinde rastgele spawn olan, Construct'ı aktive eden toplanabilir nesne
- **Second Chance**: Construct hasar aldığında patlayıp oyuncuyu ana forma döndüren ve kısa ölümsüzlük veren mekanik
- **Invincibility Frame (I-Frame)**: Hasar alınamayan kısa süre
- **Gravity Flip**: Yerçekimi yönünün tersine çevrilmesi
- **Stomp**: Yere hızlı iniş yaparak engelleri kırma
- **Teleport Ghost**: Blink Node'da oyuncunun ışınlanacağı hedef pozisyonu gösteren hayalet görüntü
- **Trail Effect**: Phase Cycle arkasında bırakılan ışık izi
- **Base Form**: Oyuncunun Construct olmadan normal hali (dual orb)

## Requirements

### Requirement 1: Glitch Token Spawn ve Toplama

**User Story:** As a player, I want to collect Glitch Tokens during gameplay, so that I can transform into powerful Constructs.

#### Acceptance Criteria

1. WHEN the score exceeds 500 THEN the Spawn System SHALL begin spawning Glitch Tokens with 3% probability per spawn cycle
2. WHEN a Glitch Token spawns THEN the Token System SHALL place it in a safe lane position (not overlapping obstacles)
3. WHEN the player collides with a Glitch Token THEN the Token System SHALL trigger Construct transformation
4. WHEN a Glitch Token is collected THEN the Token System SHALL select a random Construct from the player's unlocked pool
5. WHEN no Constructs are unlocked THEN the Token System SHALL NOT spawn Glitch Tokens
6. WHEN a Construct is already active THEN the Token System SHALL NOT spawn additional Glitch Tokens

---

### Requirement 2: Construct Transformation System

**User Story:** As a player, I want a smooth transformation into Constructs, so that I can adapt to the new mechanics without dying.

#### Acceptance Criteria

1. WHEN a Construct transformation begins THEN the Transform System SHALL grant 2 seconds of invincibility
2. WHEN transforming THEN the Transform System SHALL play a "Phase Shift" visual effect (color inversion + distortion)
3. WHEN transformation completes THEN the Transform System SHALL switch physics model to the Construct's physics
4. WHEN transformation completes THEN the Transform System SHALL switch input handler to the Construct's input mode
5. WHEN the player is in Base Form THEN the Physics System SHALL use standard dual-orb swap mechanics

---

### Requirement 3: Titan Resonance Construct

**User Story:** As a player, I want to use the Titan Resonance Construct, so that I can smash through obstacles with heavy physics.

#### Acceptance Criteria

1. WHILE Titan Resonance is active THEN the Physics System SHALL apply 2.5x gravity multiplier
2. WHEN the player taps while Titan is active THEN the Input System SHALL trigger a downward Stomp (instant max fall velocity)
3. WHEN Titan stomps on an obstacle THEN the Collision System SHALL destroy the obstacle instead of damaging the player
4. WHEN Titan collides with an obstacle from the side THEN the Collision System SHALL trigger Second Chance
5. WHILE Titan is active THEN the Render System SHALL display the mech-like Titan sprite with shockwave particles on stomp

---

### Requirement 4: Phase Cycle Construct

**User Story:** As a player, I want to use the Phase Cycle Construct, so that I can flip gravity and ride on ceiling or floor.

#### Acceptance Criteria

1. WHILE Phase Cycle is active THEN the Physics System SHALL lock the player to either floor (y=bottom) or ceiling (y=top)
2. WHEN the player taps while Phase Cycle is active THEN the Input System SHALL flip gravity direction
3. WHEN gravity flips THEN the Physics System SHALL smoothly transition player position over 200ms
4. WHEN Phase Cycle collides with any obstacle THEN the Collision System SHALL trigger Second Chance
5. WHILE Phase Cycle is active THEN the Render System SHALL display a light-cycle sprite with trailing light effect
6. WHILE Phase Cycle is active THEN the Speed System SHALL apply 1.2x speed multiplier

---

### Requirement 5: Blink Node Construct

**User Story:** As a player, I want to use the Blink Node Construct, so that I can teleport through obstacles with precise timing.

#### Acceptance Criteria

1. WHILE Blink Node is active THEN the Physics System SHALL freeze vertical movement (static Y position)
2. WHEN the player touches and drags while Blink Node is active THEN the Input System SHALL display a Teleport Ghost at drag position
3. WHEN the player releases touch while Blink Node is active THEN the Teleport System SHALL instantly move player to Ghost position
4. WHEN teleporting THEN the Collision System SHALL ignore obstacles during the teleport frame
5. WHEN Blink Node collides with an obstacle (non-teleport) THEN the Collision System SHALL trigger Second Chance
6. WHILE Blink Node is active THEN the Render System SHALL display a holographic node sprite with ghost projection

---

### Requirement 6: Second Chance Mechanic

**User Story:** As a player, I want Constructs to absorb one hit, so that I get a second chance instead of instant death.

#### Acceptance Criteria

1. WHEN a Construct takes damage THEN the Second Chance System SHALL destroy the Construct
2. WHEN a Construct is destroyed THEN the Second Chance System SHALL return player to Base Form
3. WHEN returning to Base Form THEN the Second Chance System SHALL grant 2 seconds of invincibility
4. WHEN a Construct is destroyed THEN the VFX System SHALL play explosion particles and screen shake
5. WHEN a Construct is destroyed THEN the Audio System SHALL play destruction sound effect
6. WHEN in Base Form with invincibility active THEN the Render System SHALL display flashing/transparency effect
7. WHEN a Construct is destroyed THEN the Smart Bomb System SHALL destroy all obstacles within 500px radius of player (Safe Exit)
8. WHEN Smart Bomb activates THEN the VFX System SHALL display expanding shockwave effect

---

### Requirement 7: Construct State Management

**User Story:** As a developer, I want clean state management for Constructs, so that the game logic remains maintainable.

#### Acceptance Criteria

1. WHEN the game initializes THEN the State System SHALL set activeConstruct to 'NONE'
2. WHEN a Construct activates THEN the State System SHALL update activeConstruct to the Construct type
3. WHEN a Construct is destroyed THEN the State System SHALL reset activeConstruct to 'NONE'
4. WHEN saving game state THEN the Persistence System SHALL NOT persist activeConstruct (session-only)
5. WHEN the game ends THEN the State System SHALL reset activeConstruct to 'NONE'

---

### Requirement 8: Construct Unlock System

**User Story:** As a player, I want to unlock new Constructs, so that I have variety in gameplay.

#### Acceptance Criteria

1. WHEN the game starts THEN the Unlock System SHALL provide Titan Resonance as the default unlocked Construct
2. WHEN the player purchases Phase Cycle THEN the Unlock System SHALL add it to unlockedConstructs
3. WHEN the player purchases Blink Node THEN the Unlock System SHALL add it to unlockedConstructs
4. WHEN persisting state THEN the Persistence System SHALL save unlockedConstructs array
5. WHEN selecting a random Construct THEN the Selection System SHALL only choose from unlockedConstructs

