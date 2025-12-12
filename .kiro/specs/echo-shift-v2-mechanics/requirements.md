# Requirements Document

## Introduction

Echo Shift v2.0: The Engagement Update introduces three major "sticky features" designed to increase player retention and create a meta-loop beyond the core gameplay. This specification covers:

1. **S.H.I.F.T. Protocol** - A letter collection system that rewards players with a powerful "Overdrive" mode
2. **Harmonic Resonance Enhancement** - Improvements to the existing fever mode with visual intensity
3. **System Restore Enhancement** - Economy-sink mechanic with VHS-style rewind effects

These features work together to provide short-term goals (collecting letters), skill-based rewards (fever mode), and long-term safety nets (revive mechanic).

## Glossary

- **S.H.I.F.T. Protocol**: A collectible letter system where players gather the letters S, H, I, F, T to activate Overdrive mode
- **Collectible**: A floating letter or shard that can be collected by the player's orbs
- **Overdrive Mode**: A powerful 10-second reward state activated by completing S.H.I.F.T. collection
- **Ying-Yang Core**: The merged orb state during Overdrive where black and white balls combine
- **Reachability Constraint**: The rule ensuring collectibles spawn within the player's maximum reach
- **Connector Length**: The distance between the two orbs, determining maximum vertical reach
- **Echo Shards**: The in-game currency used for purchases and restore costs
- **Harmonic Resonance**: The fever mode triggered by maintaining a perfect rhythm streak
- **Perfect Streak**: Consecutive successful rhythm-timed obstacle passes
- **System Restore**: The revive mechanic allowing players to rewind time after collision
- **Snapshot Buffer**: A circular buffer storing game state from the last 3 seconds
- **Safe Zone**: The area around the player cleared of obstacles after restore
- **Invulnerability Window**: A brief period after restore where the player cannot die

## Requirements

### Requirement 1: S.H.I.F.T. Protocol Data Structures

**User Story:** As a developer, I want well-defined data structures for the S.H.I.F.T. system, so that collectibles can be properly tracked and rendered.

#### Acceptance Criteria

1. WHEN the game initializes THEN the System SHALL define a `Collectible` interface with properties: id (string), type ('LETTER' | 'SHARD'), value (string), x (number), y (number), and oscillationParams (object with amplitude and frequency)
2. WHEN the game initializes THEN the System SHALL define a `ShiftProtocolState` interface with properties: targetWord (array of 5 letters), collectedMask (array of 5 booleans), overdriveActive (boolean), and overdriveTimer (number)
3. WHEN a new game run starts THEN the System SHALL initialize `collectedMask` to `[false, false, false, false, false]`
4. WHEN a new game run starts THEN the System SHALL set `overdriveActive` to false and `overdriveTimer` to 0

### Requirement 2: S.H.I.F.T. Letter Rendering

**User Story:** As a player, I want to see visually distinct collectible letters, so that I can identify and pursue them during gameplay.

#### Acceptance Criteria

1. WHEN rendering a S.H.I.F.T. letter THEN the System SHALL use Neon Cyan color (#00F0FF) for the letter fill
2. WHEN rendering a S.H.I.F.T. letter THEN the System SHALL draw a rotating wireframe border around the letter with rotation speed of 2 radians per second
3. WHEN rendering the HUD THEN the System SHALL display all 5 letters (S-H-I-F-T) with collected letters glowing at full opacity and uncollected letters dimmed at 30% opacity
4. WHEN a letter is collected THEN the System SHALL play a collection particle burst effect at the letter's position

### Requirement 3: S.H.I.F.T. Letter Spawning

**User Story:** As a player, I want letters to spawn in reachable positions, so that I have a fair chance to collect them.

#### Acceptance Criteria

1. WHEN spawning a S.H.I.F.T. letter THEN the System SHALL calculate maximum reach as `connectorLength - 20` pixels from the midline
2. WHEN spawning a S.H.I.F.T. letter THEN the System SHALL ensure the letter's Y position plus oscillation amplitude never exceeds the maximum reach value
3. WHEN spawning a S.H.I.F.T. letter THEN the System SHALL apply vertical oscillation using `baseY + amplitude * sin(time * frequency)` formula
4. WHEN determining spawn timing THEN the System SHALL spawn letters with probability increasing from 5% at score 0 to 15% at score 5000
5. WHEN spawning letters THEN the System SHALL prioritize uncollected letters in the target word sequence

### Requirement 4: Overdrive Mode Activation

**User Story:** As a player, I want to be rewarded with a powerful mode when I collect all S.H.I.F.T. letters, so that I feel accomplished and empowered.

#### Acceptance Criteria

1. WHEN all 5 letters are collected THEN the System SHALL activate Overdrive mode immediately
2. WHEN Overdrive activates THEN the System SHALL merge the black and white orbs into a central "Ying-Yang Core" visual
3. WHEN Overdrive is active THEN the System SHALL disable standard collision death for the duration
4. WHEN Overdrive is active THEN the System SHALL enable "Destruction Mode" where obstacles break on contact with the core
5. WHEN Overdrive is active THEN the System SHALL activate a "Magnet" effect pulling Echo Shards toward the player within 150 pixel radius
6. WHEN Overdrive activates THEN the System SHALL set the duration timer to 10 seconds
7. WHEN the Overdrive timer reaches zero THEN the System SHALL deactivate Overdrive and restore normal gameplay

### Requirement 5: Harmonic Resonance Trigger Enhancement

**User Story:** As a skilled player, I want the fever mode to trigger based on my rhythm performance, so that my skill is rewarded.

#### Acceptance Criteria

1. WHEN the player achieves a perfect streak of 10 consecutive rhythm passes THEN the System SHALL trigger Harmonic Resonance mode
2. WHEN tracking rhythm performance THEN the System SHALL increment the streak counter for each pass within the rhythm tolerance window
3. WHEN the player misses a rhythm timing THEN the System SHALL reset the streak counter to zero
4. WHEN Resonance is already active THEN the System SHALL not reset or extend the duration from additional streaks

### Requirement 6: Harmonic Resonance Visual Effects

**User Story:** As a player, I want dramatic visual feedback during fever mode, so that I feel the intensity of my performance.

#### Acceptance Criteria

1. WHEN Harmonic Resonance activates THEN the System SHALL invert the color scheme (black backgrounds become white, white becomes black)
2. WHEN Harmonic Resonance is active THEN the System SHALL apply a x2 score multiplier to all points earned
3. WHEN Harmonic Resonance is active THEN the System SHALL increase screen shake intensity by 50% on rhythm beats
4. WHEN Harmonic Resonance is active THEN the System SHALL increase particle emission rate by 100%
5. WHEN Harmonic Resonance ends THEN the System SHALL smoothly transition colors back to normal over 500 milliseconds

### Requirement 7: System Restore Snapshot Management

**User Story:** As a developer, I want a reliable snapshot system, so that game state can be accurately rewound.

#### Acceptance Criteria

1. WHEN the game is running THEN the System SHALL maintain a circular buffer storing game state snapshots from the last 3 seconds
2. WHEN recording a snapshot THEN the System SHALL capture: timestamp, score, player position, orb swap state, obstacle positions, current speed, and difficulty parameters
3. WHEN the buffer exceeds 180 snapshots (3 seconds at 60fps) THEN the System SHALL discard the oldest snapshot
4. WHEN a game run ends normally THEN the System SHALL clear the snapshot buffer

### Requirement 8: System Restore Execution

**User Story:** As a player, I want to revive after dying by spending currency, so that I can continue promising runs.

#### Acceptance Criteria

1. WHEN the player dies THEN the System SHALL display a "System Crash" game over UI with a "Restore System" button
2. WHEN displaying the restore option THEN the System SHALL show the cost (100 Echo Shards) and player's current balance
3. WHEN the player has fewer than 100 Echo Shards THEN the System SHALL disable the restore button and display "Insufficient Shards"
4. WHEN the player activates restore THEN the System SHALL deduct 100 Echo Shards from the player's balance
5. WHEN restore executes THEN the System SHALL rewind game state to the snapshot from 3 seconds before collision
6. WHEN restore executes THEN the System SHALL clear all obstacles within 100 pixels of the player position
7. WHEN restore completes THEN the System SHALL apply 2 seconds of invulnerability to the player
8. WHEN restore has been used once in a run THEN the System SHALL disable further restore offers for that run
9. WHEN displaying restore UI THEN the System SHALL play a "VHS static" visual effect
10. WHEN restore executes THEN the System SHALL play a "VHS rewind" sound and visual effect

### Requirement 9: S.H.I.F.T. Letter Collision Detection

**User Story:** As a player, I want reliable letter collection, so that my efforts to reach letters are rewarded.

#### Acceptance Criteria

1. WHEN either orb overlaps a S.H.I.F.T. letter's hitbox THEN the System SHALL mark that letter as collected in the collectedMask
2. WHEN calculating collision THEN the System SHALL use a circular hitbox with radius of 20 pixels for letters
3. WHEN a letter is collected THEN the System SHALL remove it from the active collectibles list
4. WHEN a letter is collected THEN the System SHALL award 50 Echo Shards to the player

### Requirement 10: Overdrive Visual Effects

**User Story:** As a player, I want spectacular visuals during Overdrive, so that the reward feels impactful.

#### Acceptance Criteria

1. WHEN Overdrive is active THEN the System SHALL render the Ying-Yang Core with a pulsing glow effect at 2Hz frequency
2. WHEN an obstacle is destroyed during Overdrive THEN the System SHALL spawn a shatter particle effect with 20 particles
3. WHEN Overdrive timer is below 3 seconds THEN the System SHALL flash the HUD timer in red at 4Hz frequency
4. WHEN Overdrive ends THEN the System SHALL play a "power down" visual effect transitioning back to normal orbs over 500 milliseconds
