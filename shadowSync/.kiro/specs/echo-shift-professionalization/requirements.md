# Requirements Document

## Introduction

Echo Shift oyununu "3-5 kez oynanıp silinen" bir yapıdan "her gün girilen" profesyonel bir oyuna dönüştürme projesi. Bu geliştirme paketi Meta-Game (ilerleme ve ekonomi), içerik çeşitliliği (oyun modları), "Juice" (görsel/işitsel geri bildirim) ve sosyal rekabet özelliklerini kapsar.

## Glossary

- **Echo Shards**: Oyun içi para birimi, skorun %10'u kadar kazanılır
- **Meta-Game**: Oyun oturumları arasında kalıcı ilerleme sağlayan üst sistem
- **Juice**: Oyunun canlılığını artıran görsel ve işitsel geri bildirimler
- **Skin**: Top, efekt veya tema için kozmetik görünüm değişikliği
- **Streak**: Ardışık başarılı aksiyonlar serisi
- **Campaign Mode**: Seviye bazlı ilerleme modu
- **Daily Challenge**: Günlük özel meydan okuma
- **Zen Mode**: Skor ve ölüm olmadan rahatlatıcı oyun modu
- **Screen Shake**: Çarpışma anında ekranın titremesi efekti
- **Chromatic Aberration**: Renk kayması efekti
- **Particle System**: Parçacık efekt sistemi
- **Adaptive Music**: Oyun durumuna göre değişen müzik
- **Leaderboard**: Oyuncu sıralama tablosu
- **Ghost Racer**: Önceki rekorun görsel temsili
- **PWA**: Progressive Web App, mobilde uygulama gibi çalışan web uygulaması

## Requirements

### Requirement 1: Para Birimi Sistemi (Echo Shards)

**User Story:** As a player, I want to earn a persistent currency from my gameplay, so that I have a reason to keep playing and accumulating progress.

#### Acceptance Criteria

1. WHEN a game session ends THEN the EchoShards System SHALL award the player Echo Shards equal to 10% of the final score rounded down
2. WHEN the player collects a special collectible object during gameplay THEN the EchoShards System SHALL add bonus Echo Shards to the session total
3. WHEN Echo Shards are awarded THEN the EchoShards System SHALL persist the total to localStorage immediately
4. WHEN the game loads THEN the EchoShards System SHALL retrieve and display the player's accumulated Echo Shards balance
5. WHEN serializing Echo Shards data to localStorage THEN the EchoShards System SHALL encode the data as JSON
6. WHEN deserializing Echo Shards data from localStorage THEN the EchoShards System SHALL parse the JSON and validate the data structure

---

### Requirement 2: Kozmetik Mağaza (Shop System)

**User Story:** As a player, I want to spend my Echo Shards on cosmetic items, so that I can personalize my gameplay experience.

#### Acceptance Criteria

1. WHEN the player opens the shop THEN the Shop System SHALL display all available cosmetic items with their prices and unlock status
2. WHEN the player attempts to purchase an item THEN the Shop System SHALL verify the player has sufficient Echo Shards before completing the transaction
3. WHEN a purchase is successful THEN the Shop System SHALL deduct the item price from the player's balance and mark the item as owned
4. WHEN the player owns a cosmetic item THEN the Shop System SHALL allow the player to equip that item
5. WHEN an item is equipped THEN the Shop System SHALL persist the equipped state to localStorage
6. WHEN the game renders THEN the Rendering System SHALL apply the currently equipped cosmetics to the appropriate game elements

---

### Requirement 3: Top Skinleri (Ball Skins)

**User Story:** As a player, I want to unlock different ball appearances, so that I can express my style while playing.

#### Acceptance Criteria

1. WHEN rendering the player orbs THEN the Rendering System SHALL apply the equipped ball skin's color scheme and visual style
2. WHEN a ball skin is equipped THEN the Rendering System SHALL render the orb with the skin's defined gradient, pattern, or emoji
3. WHEN the default skin is active THEN the Rendering System SHALL render the classic black and white orbs
4. WHEN a premium skin is equipped THEN the Rendering System SHALL render additional visual effects defined by that skin

---

### Requirement 4: Efekt Paketleri (Effect Packs)

**User Story:** As a player, I want to customize the visual effects in my game, so that I can have a unique visual experience.

#### Acceptance Criteria

1. WHEN the player performs a swap action with an effect pack equipped THEN the Effect System SHALL render the swap animation using the equipped effect pack's particle configuration
2. WHEN the player's orb moves with a trail effect equipped THEN the Effect System SHALL render a trail behind the orb using the equipped trail style
3. WHEN a collision occurs with an explosion effect equipped THEN the Effect System SHALL render the explosion using the equipped explosion particle configuration

---

### Requirement 5: Tema Paketleri (Theme Packs)

**User Story:** As a player, I want to change the overall visual theme of the game, so that I can enjoy different aesthetic experiences.

#### Acceptance Criteria

1. WHEN a theme pack is equipped THEN the Theme System SHALL apply the theme's background colors to the top and bottom halves
2. WHEN a theme pack is equipped THEN the Theme System SHALL apply the theme's accent colors to UI elements and effects
3. WHEN a theme pack is equipped THEN the Theme System SHALL apply the theme's obstacle colors matching the new background scheme
4. WHEN the Cyberpunk theme is active THEN the Theme System SHALL render neon grid lines and glowing edges
5. WHEN the Retro theme is active THEN the Theme System SHALL render pixelated edges and 8-bit color palette
6. WHEN the Zen theme is active THEN the Theme System SHALL render soft gradients and muted colors

---

### Requirement 6: Kalıcı Yükseltmeler (Permanent Upgrades)

**User Story:** As a player, I want to purchase permanent gameplay advantages, so that I can feel progression across multiple sessions.

#### Acceptance Criteria

1. WHEN the Starting Score upgrade is purchased THEN the Upgrade System SHALL start all future games with the upgraded starting score value
2. WHEN the Score Multiplier upgrade is purchased THEN the Upgrade System SHALL apply the permanent multiplier to all score gains
3. WHEN the Slow Motion upgrade is purchased THEN the Upgrade System SHALL grant the player one slow motion activation per game session
4. WHEN slow motion is activated THEN the Game Engine SHALL reduce game speed to 50% for 3 seconds
5. WHEN an upgrade is purchased THEN the Upgrade System SHALL persist the upgrade level to localStorage

---

### Requirement 7: Seviye Bazlı İlerleme (Campaign Mode)

**User Story:** As a player, I want to progress through structured levels, so that I have clear goals and a sense of accomplishment.

#### Acceptance Criteria

1. WHEN the player selects Campaign Mode THEN the Campaign System SHALL display a level selection map with 100 levels
2. WHEN a level is selected THEN the Campaign System SHALL load the level's specific configuration including enabled mechanics and difficulty
3. WHEN the player completes a level's objective THEN the Campaign System SHALL mark the level as completed and unlock the next level
4. WHEN levels 1-10 are played THEN the Campaign System SHALL enable only basic mechanics without advanced features
5. WHEN level 11 is reached THEN the Campaign System SHALL introduce Phantom obstacles with a tutorial prompt
6. WHEN level 20 is reached THEN the Campaign System SHALL introduce Dynamic Midline with a tutorial prompt
7. WHEN a level is completed THEN the Campaign System SHALL award Echo Shards based on performance rating

---

### Requirement 8: Günlük Meydan Okuma (Daily Challenge)

**User Story:** As a player, I want to compete in daily challenges, so that I have a reason to return every day.

#### Acceptance Criteria

1. WHEN a new day begins THEN the Daily Challenge System SHALL generate a unique challenge using the date as the random seed
2. WHEN the player attempts the daily challenge THEN the Daily Challenge System SHALL apply the day's special rules and modifiers
3. WHEN the player completes the daily challenge THEN the Daily Challenge System SHALL award bonus Echo Shards based on performance
4. WHEN the player has already completed today's challenge THEN the Daily Challenge System SHALL display the player's best score and prevent additional reward claims
5. WHEN generating the daily seed THEN the Daily Challenge System SHALL use a deterministic algorithm ensuring all players receive identical challenge parameters

---

### Requirement 9: Zen Modu (Relaxation Mode)

**User Story:** As a player, I want to play without pressure, so that I can relax and enjoy the flow of the game.

#### Acceptance Criteria

1. WHEN Zen Mode is selected THEN the Zen System SHALL disable score tracking and display
2. WHEN the player collides with an obstacle in Zen Mode THEN the Zen System SHALL respawn the player without ending the game
3. WHEN Zen Mode is active THEN the Zen System SHALL play calming ambient music
4. WHEN Zen Mode is active THEN the Zen System SHALL reduce visual intensity and use softer color transitions

---

### Requirement 10: Ekran Titremesi (Screen Shake)

**User Story:** As a player, I want to feel impactful feedback during intense moments, so that the game feels more responsive and exciting.

#### Acceptance Criteria

1. WHEN a collision occurs THEN the Screen Shake System SHALL apply a camera shake effect with configurable intensity and duration
2. WHEN a critical hit or near miss streak is achieved THEN the Screen Shake System SHALL apply a subtle shake effect
3. WHEN screen shake is applied THEN the Screen Shake System SHALL offset the canvas rendering by the shake displacement values
4. WHEN the shake duration expires THEN the Screen Shake System SHALL smoothly return the canvas to the neutral position

---

### Requirement 11: Renk Kayması Efekti (Chromatic Aberration)

**User Story:** As a player, I want visual feedback when I achieve rhythm streaks, so that I feel rewarded for skillful play.

#### Acceptance Criteria

1. WHEN a rhythm streak is active THEN the Chromatic Aberration System SHALL apply RGB channel separation to the rendered frame
2. WHEN the rhythm multiplier increases THEN the Chromatic Aberration System SHALL increase the separation intensity proportionally
3. WHEN the rhythm streak ends THEN the Chromatic Aberration System SHALL smoothly fade the effect back to zero

---

### Requirement 12: Parçacık Sistemi (Particle System)

**User Story:** As a player, I want to see particle effects during gameplay, so that actions feel more satisfying and visually appealing.

#### Acceptance Criteria

1. WHEN the player's orb moves THEN the Particle System SHALL emit trail particles behind the orb based on movement speed
2. WHEN a swap action occurs THEN the Particle System SHALL emit a burst of particles at the swap location
3. WHEN a near miss occurs THEN the Particle System SHALL emit spark particles at the near miss point
4. WHEN particles are created THEN the Particle System SHALL assign velocity, lifetime, color, and size based on the effect configuration
5. WHEN a particle's lifetime expires THEN the Particle System SHALL remove the particle from the active particle pool

---

### Requirement 13: Uyarlanabilir Müzik (Adaptive Music)

**User Story:** As a player, I want the music to respond to my gameplay, so that the audio experience feels dynamic and immersive.

#### Acceptance Criteria

1. WHEN the game starts THEN the Adaptive Music System SHALL begin playing the base music layer
2. WHEN the rhythm streak reaches x2 THEN the Adaptive Music System SHALL add the bass layer to the music mix
3. WHEN the rhythm streak reaches x3 THEN the Adaptive Music System SHALL add the drums layer to the music mix
4. WHEN the game speed increases THEN the Adaptive Music System SHALL increase the music tempo proportionally
5. WHEN the rhythm streak is lost THEN the Adaptive Music System SHALL smoothly fade out the additional layers

---

### Requirement 14: Sıralama Tablosu (Leaderboard)

**User Story:** As a player, I want to see how I rank against other players, so that I have competitive motivation to improve.

#### Acceptance Criteria

1. WHEN the player views the leaderboard THEN the Leaderboard System SHALL display the top 100 scores for the selected time period
2. WHEN a game ends with a qualifying score THEN the Leaderboard System SHALL prompt the player to submit their score
3. WHEN displaying leaderboard entries THEN the Leaderboard System SHALL show rank, player name, score, and submission date
4. WHEN the player selects Weekly view THEN the Leaderboard System SHALL filter scores to the current week only
5. WHEN the player selects All Time view THEN the Leaderboard System SHALL display all historical scores

---

### Requirement 15: Hayalet Yarışçısı (Ghost Racer)

**User Story:** As a player, I want to race against my previous best performance, so that I can track my improvement in real-time.

#### Acceptance Criteria

1. WHEN a game starts in Endless Mode THEN the Ghost System SHALL display a semi-transparent ghost representing the player's high score run
2. WHEN the ghost is displayed THEN the Ghost System SHALL show the ghost's position based on the recorded high score timeline
3. WHEN the player surpasses the ghost's position THEN the Ghost System SHALL display a visual indicator showing the player is ahead
4. WHEN a new high score is achieved THEN the Ghost System SHALL record the new run's timeline for future ghost display
5. WHEN serializing ghost data THEN the Ghost System SHALL encode the timeline data as JSON for localStorage persistence
6. WHEN deserializing ghost data THEN the Ghost System SHALL parse the JSON and reconstruct the ghost timeline

---

### Requirement 16: PWA Desteği (Progressive Web App)

**User Story:** As a mobile player, I want to install the game as an app, so that I can play it like a native application.

#### Acceptance Criteria

1. WHEN the game is accessed on a mobile device THEN the PWA System SHALL provide an install prompt
2. WHEN the game is installed as PWA THEN the PWA System SHALL enable offline gameplay capability
3. WHEN the PWA launches THEN the PWA System SHALL display a splash screen with the game logo
4. WHEN the PWA is running THEN the PWA System SHALL hide the browser UI for fullscreen experience

---

### Requirement 17: Tutorial Sistemi (Onboarding)

**User Story:** As a new player, I want to learn the game mechanics gradually, so that I understand how to play before facing difficult challenges.

#### Acceptance Criteria

1. WHEN a new player starts the game for the first time THEN the Tutorial System SHALL display an interactive tutorial sequence
2. WHEN the tutorial explains a mechanic THEN the Tutorial System SHALL pause gameplay and highlight the relevant UI elements
3. WHEN the player completes a tutorial step THEN the Tutorial System SHALL advance to the next step
4. WHEN all tutorial steps are completed THEN the Tutorial System SHALL mark the tutorial as finished and persist this state
5. WHEN a new mechanic is introduced in Campaign Mode THEN the Tutorial System SHALL display a contextual tutorial for that mechanic

---

### Requirement 18: State Yönetimi (Global State Management)

**User Story:** As a developer, I want centralized state management, so that game data is consistent and easily accessible across components.

#### Acceptance Criteria

1. WHEN the game initializes THEN the State Manager SHALL load all persisted data from localStorage
2. WHEN game state changes THEN the State Manager SHALL notify all subscribed components of the change
3. WHEN critical state changes occur THEN the State Manager SHALL persist the updated state to localStorage
4. WHEN serializing game state THEN the State Manager SHALL encode all state data as JSON
5. WHEN deserializing game state THEN the State Manager SHALL parse JSON and validate data integrity before applying
