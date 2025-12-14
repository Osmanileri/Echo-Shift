# Requirements Document

## Introduction

Echo Shift v2.5 "Campaign Update" fundamentally transforms the game from an endless score-chaser into a distance-based, goal-oriented campaign experience. The campaign becomes the primary game mode - when players press "Start", they are taken directly to the level selection screen. Each level has a target distance to reach, replacing the score-based system entirely. The HUD displays distance traveled instead of score, with a progress bar showing proximity to the finish line. Gems are redesigned to be smaller, more numerous, and spread across the play area for better accessibility. Game speed increases progressively throughout each level, with an additional speed boost in the final stretch.

## Glossary

- **Campaign_System**: The primary game mode where players progress through structured levels with distance-based goals
- **Target_Distance**: The distance in meters a player must travel to complete a level
- **Current_Distance**: The distance traveled by the player, displayed as the main metric in the HUD
- **Star_Rating**: A 1-3 star evaluation system based on performance criteria
- **Chapter**: A group of 10 levels sharing a visual theme and difficulty tier (e.g., Sub-Bass, Bass, Mid)
- **Victory_Screen**: The UI displayed upon level completion showing rewards and animations
- **Flying_Currency**: Animation effect where collected gems fly toward the player's total counter
- **Distance_Bar**: HUD element showing current distance, target distance, and player position
- **Progressive_Speed**: Game speed that continuously increases throughout the level
- **Climax_Speed**: Additional speed multiplier applied during the final 20% of a level
- **Echo_Shard**: In-game currency (gems) that are small, numerous, and spread across the play area
- **Game_Renderer**: The canvas rendering system responsible for visual effects and animations
- **Chromatic_Aberration**: RGB color shift effect applied to screen edges for intensity feedback
- **Camera_System**: Virtual camera controlling FOV and zoom effects
- **Holographic_Gate**: Visual finish line object that appears near level completion
- **Path_Unlock**: Animation showing progression path between level nodes on the map
- **Unlock_Pop**: Scale and flash animation when a new level becomes available
- **Glitch_Artifact**: Visual distortion effect triggered on damage
- **BPM**: Beats per minute - the tempo used for syncing visual pulses

## Requirements

### Requirement 1

**User Story:** As a player, I want the campaign to be the main game mode, so that I can start playing levels directly from the main menu.

#### Acceptance Criteria

1. WHEN the player presses "Start Game" from the main menu THEN the Campaign_System SHALL display the level selection screen
2. WHEN the player selects a level THEN the Campaign_System SHALL start that level with its configured Target_Distance
3. WHEN displaying the main menu THEN the GameUI SHALL remove the separate "Campaign" button since campaign is now the primary mode
4. WHEN the game launches THEN the Campaign_System SHALL remember the last played level for quick continuation

### Requirement 2

**User Story:** As a player, I want levels to have a defined finish line based on distance, so that I have a clear goal to work toward instead of endless gameplay.

#### Acceptance Criteria

1. WHEN a campaign level starts THEN the Campaign_System SHALL calculate Target_Distance using the formula: `350 + (Level * 100) * (Level ^ 0.1)` meters
2. WHEN the player reaches the Target_Distance THEN the Campaign_System SHALL trigger level completion and display the Victory_Screen
3. WHILE the player is in a campaign level THEN the Campaign_System SHALL track Current_Distance traveled in meters
4. WHEN the player's health reaches zero before reaching Target_Distance THEN the Campaign_System SHALL trigger game over state

### Requirement 3

**User Story:** As a player, I want game speed to progressively increase throughout the level with an extra boost near the end, so that gameplay feels dynamic and the finale is exciting.

#### Acceptance Criteria

1. WHILE playing a level THEN the Campaign_System SHALL continuously increase game speed using Progressive_Speed formula: `speed = baseSpeed * (1 + (currentDistance / targetDistance) * 0.3)`
2. WHILE the player is within the final 20% of Target_Distance THEN the Campaign_System SHALL apply additional Climax_Speed multiplier of 1.2x
3. WHEN the player enters the final 20% distance zone THEN the Campaign_System SHALL smoothly transition to Climax_Speed over 500 milliseconds
4. WHEN calculating base speed THEN the Campaign_System SHALL use the formula: `baseSpeed = 10 + (Level * 0.4)` pixels per frame

### Requirement 4

**User Story:** As a player, I want to earn stars based on different achievement criteria, so that I have reasons to replay levels and master them.

#### Acceptance Criteria

1. WHEN a player completes a level with health greater than zero THEN the Star_Rating system SHALL award 1 star (Survivor)
2. WHEN a player collects at least 80% of available Echo_Shards in a level THEN the Star_Rating system SHALL award 2 stars (Collector)
3. WHEN a player completes a level without taking any damage THEN the Star_Rating system SHALL award 3 stars (Perfectionist)
4. WHEN calculating Star_Rating THEN the Campaign_System SHALL evaluate all criteria and award the highest applicable rating

### Requirement 5

**User Story:** As a player, I want levels organized into themed chapters, so that I feel a sense of progression through different game worlds.

#### Acceptance Criteria

1. WHEN displaying campaign levels THEN the Campaign_System SHALL organize levels into Chapters: Sub-Bass (1-10), Bass (11-20), Mid (21-30), High (31-40), Presence (41-50)
2. WHEN a player enters a new Chapter THEN the Campaign_System SHALL apply the Chapter's visual theme (colors, background)
3. WHEN a player reaches Chapter 3 (Mid) THEN the Campaign_System SHALL introduce moving obstacles as a new mechanic
4. WHEN calculating obstacle spawn density THEN the Campaign_System SHALL use the formula: `density = 0.5 + (Level * 0.02)` capped at 1.0

### Requirement 6

**User Story:** As a player, I want to see distance as the main metric with a progress bar, so that I always know how far I've traveled and how close I am to the finish.

#### Acceptance Criteria

1. WHILE in campaign mode THEN the GameUI SHALL display Current_Distance in the top-left corner instead of score
2. WHILE in campaign mode THEN the GameUI SHALL display a compact Distance_Bar below the distance counter
3. WHEN the Distance_Bar renders THEN it SHALL show start point (0m), current position indicator, and end point (Target_Distance)
4. WHEN the player is within 50 meters of Target_Distance THEN the Distance_Bar SHALL display a pulsing glow animation

### Requirement 7

**User Story:** As a player, I want gems to be smaller, more numerous, and spread across the play area, so that collecting them feels more accessible and rewarding.

#### Acceptance Criteria

1. WHEN spawning Echo_Shards THEN the Campaign_System SHALL use smaller gem size (60% of current size)
2. WHEN spawning Echo_Shards THEN the Campaign_System SHALL increase spawn frequency by 2x compared to current rate
3. WHEN positioning Echo_Shards THEN the Campaign_System SHALL spread them horizontally across the play area (left, center, right positions)
4. WHEN calculating shard positions THEN the Campaign_System SHALL use random horizontal offset within safe play bounds

### Requirement 8

**User Story:** As a player, I want a satisfying victory screen with animated rewards, so that completing a level feels rewarding and exciting.

#### Acceptance Criteria

1. WHEN level completion triggers THEN the Victory_Screen SHALL apply slow motion effect (0.2x speed) for 1 second
2. WHEN the Victory_Screen displays THEN the system SHALL animate stars appearing sequentially with 300ms delay between each
3. WHEN displaying earned Echo_Shards THEN the Victory_Screen SHALL trigger Flying_Currency animation from screen center to the shard counter
4. WHEN Flying_Currency animation plays THEN the system SHALL spawn 10-20 shard particles following Bezier curve paths to the counter
5. WHEN a shard particle reaches the counter THEN the counter SHALL increment and display a scale pop animation (1.2x for 100ms)

### Requirement 9

**User Story:** As a player, I want first-time completion bonuses, so that I am rewarded for progressing through new content.

#### Acceptance Criteria

1. WHEN a player completes a level for the first time THEN the Campaign_System SHALL award a first-clear bonus of `50 + (Level * 10)` Echo_Shards
2. WHEN a player replays a completed level THEN the Campaign_System SHALL award only the difference if they achieve a higher Star_Rating
3. WHEN calculating level rewards THEN the Campaign_System SHALL use base reward formula: `baseReward = 10 + (Level * 3) + (Stars * 5)` Echo_Shards

### Requirement 10

**User Story:** As a player, I want to see which levels I've completed and with how many stars, so that I can track my overall campaign progress.

#### Acceptance Criteria

1. WHEN displaying the level selection map THEN the Campaign_System SHALL show earned stars for each completed level
2. WHEN a level is completed THEN the Campaign_System SHALL persist the Star_Rating to storage
3. WHEN displaying campaign progress THEN the UI SHALL show total stars earned out of maximum possible stars
4. WHEN a player achieves a higher Star_Rating on replay THEN the Campaign_System SHALL update the stored rating

### Requirement 11

**User Story:** As a player, I want visual feedback that reflects the increasing speed and intensity of the level, so that I physically feel the rush of the "Climax Speed."

#### Acceptance Criteria

1. WHILE the game speed increases (Progressive_Speed) THEN the Game_Renderer SHALL gradually stretch background particles (Starfield) to create a "warp speed" effect
2. WHEN the player enters the Climax_Speed zone (final 20%) THEN the Game_Renderer SHALL apply a subtle Chromatic Aberration (RGB shift) effect to the edges of the screen
3. WHEN the player enters the Climax_Speed zone THEN the Camera_System SHALL slightly increase the Field of View (FOV) to simulate acceleration
4. WHEN the player crosses the finish line THEN the Game_Renderer SHALL trigger a momentary "screen flash" (white-out) transition before showing the Victory_Screen

### Requirement 12

**User Story:** As a player, I want to see a physical finish line on the track, so that crossing it feels like a tangible achievement.

#### Acceptance Criteria

1. WHEN the player is within 100 meters of the Target_Distance THEN the Game_Renderer SHALL spawn a visible Holographic_Gate object at the finish line coordinates
2. WHEN the Holographic_Gate appears THEN it SHALL pulse with the beat of the music
3. WHEN the player passes through the Holographic_Gate THEN the object SHALL trigger a "shatter" animation, breaking into digital shards
4. WHEN the level is completed THEN the player object SHALL accelerate off-screen to simulate a "warp jump" to the next area

### Requirement 13

**User Story:** As a player, I want satisfying animations when unlocking new levels on the map, so that my progression feels impactful.

#### Acceptance Criteria

1. WHEN the player returns to the level selection screen after a victory THEN the Campaign_System SHALL play a Path_Unlock animation
2. WHEN the Path_Unlock animation plays THEN a glowing line SHALL draw itself from the completed level node to the next unlocked level node
3. WHEN the glowing line reaches the new node THEN the new level node SHALL play an Unlock_Pop animation (scale up, flash, settle) and remove its lock icon
4. WHEN a new Chapter is unlocked THEN the background of the level selection screen SHALL cross-fade to the new Chapter's visual theme

### Requirement 14

**User Story:** As a player, I want in-game collectibles and obstacles to react to the game world, so that the environment feels alive.

#### Acceptance Criteria

1. WHEN an Echo_Shard is collected during gameplay THEN the system SHALL spawn a small burst of particle effects at the collection point
2. WHILE the game is running THEN the obstacles and background elements SHALL pulse (scale slightly up/down) in sync with the BPM of the background music
3. WHEN the player takes damage (Health loss) THEN the Game_Renderer SHALL trigger a Glitch_Artifact effect on the entire screen for 200ms
4. WHEN the Distance_Bar pulses (Req 6.4) THEN it SHALL coincide with a localized haptic feedback (vibration) on supported devices
