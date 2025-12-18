# Requirements Document

## Introduction

"Glitch Protocol" (Sistem Hatası), Echo Shift oyununa eklenen özel bir bonus modu sistemidir. Oyuncu, nadir görülen "Glitch Shard" (Hata Parçası) objesine dokunduğunda, oyun kuralları geçici olarak değişir ve "Quantum Lock" bonus moduna girer. Bu mod, oyuncuya kontrollü bir rahatlama ve elmas toplama fırsatı sunar.

## Glossary

- **Glitch Shard**: Simülasyonun işleyemediği, bozuk veri yığını görünümünde tetikleyici obje
- **Quantum Lock**: Glitch Shard'a dokunulduğunda aktive olan bonus modu
- **Hit Stop**: Çarpışma anında oyunun kısa süreliğine donması efekti
- **Sinüs Tüneli**: Bonus modunda midline'ın dalga şeklinde hareket etmesi
- **Jitter**: Objenin rastgele titremesi efekti
- **Flicker**: Renklerin hızlı değişimi efekti
- **Ghost Mode**: Bonus modu çıkışında kısa süreli dokunulmazlık
- **Elastic Easing**: Yaylanma efekti ile yumuşak geçiş animasyonu
- **State Priority**: Mod öncelik sistemi (Glitch > Overdrive > Resonance)

## Requirements

### Requirement 1: Glitch Shard Görsel Tasarımı

**User Story:** As a player, I want to see a visually distinct glitch object, so that I can identify it as a special collectible worth pursuing.

#### Acceptance Criteria

1. WHEN a Glitch Shard spawns THEN the Glitch_System SHALL render the object with jitter effect (±5 pixels random offset per frame)
2. WHEN a Glitch Shard is visible THEN the Glitch_System SHALL cycle through neon colors (cyan, magenta, white, green) every 50ms
3. WHEN a Glitch Shard is rendered THEN the Glitch_System SHALL draw a distorted polygon shape with random vertex offsets
4. WHEN a Glitch Shard is rendered THEN the Glitch_System SHALL apply static noise overlay effect (5 random horizontal lines)
5. WHEN a Glitch Shard is rendered THEN the Glitch_System SHALL apply glow/shadow effect matching current flicker color

### Requirement 2: Glitch Shard Spawn Mantığı

**User Story:** As a player, I want the glitch object to appear at strategic moments, so that I have meaningful decisions about risk vs reward.

#### Acceptance Criteria

1. WHEN a level starts THEN the Glitch_System SHALL spawn exactly one Glitch Shard per level (for testing purposes, later configurable to 5-10% chance)
2. WHEN spawning a Glitch Shard THEN the Glitch_System SHALL position it at canvas right edge + 100 pixels
3. WHEN spawning a Glitch Shard THEN the Glitch_System SHALL set Y position within ±100 pixels of canvas center
4. WHEN a Glitch Shard exists THEN the Glitch_System SHALL move it left at current game speed
5. WHEN a Glitch Shard exits left edge THEN the Glitch_System SHALL remove it from active objects
6. WHEN spawning a Glitch Shard THEN the Glitch_System SHALL ensure it appears in a reachable position (minimum 150px clearance from obstacles)
7. WHEN spawning a Glitch Shard THEN the Glitch_System SHALL wait until player has traveled at least 500 meters

### Requirement 3: Çarpışma ve Tetikleme

**User Story:** As a player, I want clear feedback when I collect the glitch object, so that I know the bonus mode has activated.

#### Acceptance Criteria

1. WHEN player connector touches Glitch Shard THEN the Glitch_System SHALL detect collision using AABB intersection
2. WHEN collision is detected THEN the Glitch_System SHALL trigger hit stop effect (10 frames freeze)
3. WHEN collision is detected THEN the Glitch_System SHALL trigger heavy screen shake
4. WHEN collision is detected THEN the Glitch_System SHALL play glitch impact sound effect
5. WHEN collision is detected THEN the Glitch_System SHALL remove the Glitch Shard from screen
6. WHEN collision is detected THEN the Glitch_System SHALL activate Quantum Lock mode

### Requirement 4: Quantum Lock Modu - Çubuk Davranışı

**User Story:** As a player, I want my connector to stabilize during bonus mode, so that I can navigate more easily.

#### Acceptance Criteria

1. WHEN Quantum Lock activates THEN the Glitch_System SHALL store current connector length as original value
2. WHEN Quantum Lock activates THEN the Glitch_System SHALL animate connector length toward ideal size (120 pixels) using elastic easing over 300-500ms
3. WHEN Quantum Lock is active THEN the Glitch_System SHALL prevent connector length from changing due to normal gameplay
4. WHEN Quantum Lock ends THEN the Glitch_System SHALL animate connector length back to original stored value using elastic easing
5. WHEN Quantum Lock is active THEN the Glitch_System SHALL apply green tint to player connector
6. WHEN Quantum Lock is active THEN the Glitch_System SHALL apply subtle pulse animation to connector (scale 1.0 to 1.05)

### Requirement 5: Quantum Lock Modu - Sinüs Tüneli

**User Story:** As a player, I want a unique visual experience during bonus mode, so that it feels special and different from normal gameplay.

#### Acceptance Criteria

1. WHEN Quantum Lock activates THEN the Glitch_System SHALL replace normal midline with sinusoidal wave
2. WHEN Quantum Lock is active THEN the Glitch_System SHALL animate wave offset continuously (0.05 per frame)
3. WHEN Quantum Lock is active THEN the Glitch_System SHALL render wave with matrix green color (#00FF00)
4. WHEN Quantum Lock is active THEN the Glitch_System SHALL render wave with glow effect (10px shadow blur)
5. WHEN Quantum Lock is active THEN the Glitch_System SHALL render guide path (40px wide, 10% opacity)
6. WHEN Quantum Lock is active THEN the Glitch_System SHALL spawn bonus shards along the entire wave path (trail formation, not just peaks)
7. WHEN Quantum Lock is active THEN the Glitch_System SHALL stabilize game speed to prevent acceleration

### Requirement 6: Quantum Lock Modu - Oynanış Değişiklikleri

**User Story:** As a player, I want a safe zone during bonus mode, so that I can focus on collecting rewards.

#### Acceptance Criteria

1. WHEN Quantum Lock is active THEN the Glitch_System SHALL stop spawning new obstacles
2. WHEN Quantum Lock is active THEN the Glitch_System SHALL fade out existing obstacles from screen (200ms fade)
3. WHEN Quantum Lock is active THEN the Glitch_System SHALL make player invulnerable to damage
4. WHEN Quantum Lock is active THEN the Glitch_System SHALL spawn bonus shards along wave trail
5. WHEN Quantum Lock is active THEN the Glitch_System SHALL apply 2x shard value multiplier
6. WHEN Quantum Lock is active THEN the Glitch_System SHALL continue accumulating distance traveled
7. WHEN Quantum Lock is active AND Overdrive mode was active THEN the Glitch_System SHALL pause Overdrive timer and resume after Quantum Lock ends

### Requirement 7: Quantum Lock Modu - Süre ve Çıkış

**User Story:** As a player, I want a smooth transition back to normal gameplay, so that I don't die unfairly after bonus mode ends.

#### Acceptance Criteria

1. WHEN Quantum Lock activates THEN the Glitch_System SHALL set duration to 8000 milliseconds
2. WHEN Quantum Lock duration reaches 75% THEN the Glitch_System SHALL start exit warning (reduced glitch intensity, color transition to normal theme)
3. WHEN Quantum Lock duration reaches 80% THEN the Glitch_System SHALL start wave flattening animation
4. WHEN Quantum Lock ends THEN the Glitch_System SHALL activate Ghost Mode for 1500 milliseconds
5. WHEN Ghost Mode is active THEN the Glitch_System SHALL make player semi-transparent (50% opacity)
6. WHEN Ghost Mode is active THEN the Glitch_System SHALL prevent collision damage
7. WHEN Ghost Mode ends THEN the Glitch_System SHALL restore normal gameplay state
8. WHEN Quantum Lock ends AND Overdrive was paused THEN the Glitch_System SHALL resume Overdrive with remaining time

### Requirement 8: Görsel Efektler

**User Story:** As a player, I want immersive visual effects, so that the bonus mode feels impactful and exciting.

#### Acceptance Criteria

1. WHEN Quantum Lock is active THEN the Glitch_System SHALL render random static noise lines (20% chance per frame)
2. WHEN Quantum Lock is active THEN the Glitch_System SHALL apply chromatic aberration effect
3. WHEN Quantum Lock activates THEN the Glitch_System SHALL trigger screen flash effect (white, 200ms)
4. WHEN Quantum Lock ends THEN the Glitch_System SHALL fade out vignette glitch effect gradually (500ms)
5. WHEN hit stop is active THEN the Glitch_System SHALL pause all game updates for specified frames
6. WHEN exit warning starts THEN the Glitch_System SHALL reduce static noise intensity gradually

### Requirement 9: Ses Efektleri

**User Story:** As a player, I want audio feedback during glitch mode, so that the experience is more immersive.

#### Acceptance Criteria

1. WHEN Glitch Shard spawns THEN the Audio_System SHALL play glitch spawn sound (distorted beep)
2. WHEN collision is detected THEN the Audio_System SHALL play glitch impact sound (heavy bass hit with distortion)
3. WHEN Quantum Lock is active THEN the Audio_System SHALL apply low-pass filter to background music (distorted/bass-heavy version)
4. WHEN Quantum Lock ends THEN the Audio_System SHALL fade out filter effect and restore normal audio over 500ms

### Requirement 10: Sistem Çakışması Yönetimi

**User Story:** As a player, I want bonus modes to work together smoothly, so that I don't lose progress from other active modes.

#### Acceptance Criteria

1. WHEN Quantum Lock activates AND Overdrive mode is active THEN the Glitch_System SHALL pause Overdrive timer
2. WHEN Quantum Lock activates AND Resonance mode is active THEN the Glitch_System SHALL pause Resonance timer
3. WHEN Quantum Lock ends THEN the Glitch_System SHALL resume any paused mode with remaining time
4. WHEN Quantum Lock is active THEN the Glitch_System SHALL have highest priority over other bonus modes
5. WHEN multiple modes resume THEN the Glitch_System SHALL restore them in order (Overdrive first, then Resonance)
