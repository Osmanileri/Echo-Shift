# Requirements Document

## Introduction

Echo Shift Version 1.1 - "The Engagement Update". Bu güncelleme, oyunun temel döngüsünü (Core Loop) güçlendiren ve oyuncu bağlılığını (retention) artıran özellikleri içerir. Mevcut ekonomi sistemine "sink" mekanizmaları, akış deneyimine "ödül anları" ve günlük geri dönüş motivasyonu ekler.

## Glossary

- **Harmonic Resonance**: Yüksek streak'te aktif olan geçici güç modu (Fever/Rage mode)
- **System Restore**: Oyun içi geri sarma/canlanma mekaniği (Revive)
- **Daily Rituals**: Günlük tamamlanabilir görevler sistemi
- **Sink**: Ekonomide para harcama noktası, para biriminin değerini koruyan mekanizma
- **Streak**: Ardışık başarılı aksiyonlar serisi
- **Haptic Feedback**: Mobil cihazlarda dokunsal titreşim geri bildirimi
- **FTUE**: First Time User Experience - İlk kullanıcı deneyimi
- **Catharsis**: Gerginliğin boşaltılması, rahatlama anı

## Requirements

### Requirement 1: Harmonic Resonance (Fever Mode)

**User Story:** As a player, I want to experience powerful reward moments during high streaks, so that I feel the thrill of dominating the game after skillful play.

#### Acceptance Criteria

1. WHEN the rhythm streak counter reaches 10 THEN the Resonance System SHALL activate Harmonic Resonance mode
2. WHILE Harmonic Resonance is active THEN the Resonance System SHALL invert the game's color scheme (black becomes white, white becomes black)
3. WHILE Harmonic Resonance is active THEN the Resonance System SHALL change orb colors to bright cyan with a bloom/glow effect
4. WHILE Harmonic Resonance is active THEN the Collision System SHALL destroy obstacles on contact instead of ending the game
5. WHEN an obstacle is destroyed during Harmonic Resonance THEN the Score System SHALL award 50 bonus points
6. WHEN an obstacle is destroyed during Harmonic Resonance THEN the Effect System SHALL trigger an explosion particle effect at the obstacle position
7. WHEN Harmonic Resonance activates THEN the Resonance System SHALL start a 10-second countdown timer
8. WHEN the Harmonic Resonance timer expires THEN the Resonance System SHALL deactivate the mode and restore normal gameplay
9. WHEN Harmonic Resonance ends THEN the Visual System SHALL smoothly transition colors back to normal over 0.5 seconds
10. WHILE Harmonic Resonance is active THEN the Audio System SHALL apply a bass-boosted filter to the game music

---

### Requirement 2: System Restore (Revive Mechanic)

**User Story:** As a player, I want a chance to continue my run after dying, so that I can push for higher scores and have a reason to spend my accumulated Echo Shards.

#### Acceptance Criteria

1. WHEN the player collides with an obstacle and dies THEN the Restore System SHALL display a "CRITICAL ERROR" message with system-themed visuals
2. WHEN the death screen appears THEN the Restore System SHALL offer a "Restore System?" option with the cost displayed (100 Echo Shards)
3. WHEN the player has sufficient Echo Shards and accepts the restore THEN the Restore System SHALL deduct 100 Echo Shards from the player's balance
4. WHEN a restore is accepted THEN the Restore System SHALL display a static noise (TV static) visual effect for 0.5 seconds
5. WHEN a restore is executed THEN the Game State System SHALL rewind the game state to 3 seconds before the collision
6. WHEN a restore is executed THEN the Obstacle System SHALL clear all obstacles within a safe zone around the player
7. WHEN a restore is executed THEN the Audio System SHALL play a VHS rewind sound effect
8. WHEN a restore has been used in the current run THEN the Restore System SHALL disable further restore offers for that run
9. WHEN the player has insufficient Echo Shards THEN the Restore System SHALL display the restore option as disabled with "Insufficient Shards" message
10. WHEN the player declines the restore or has no shards THEN the Game System SHALL proceed to the normal game over screen
11. WHEN serializing restore usage state THEN the Restore System SHALL encode the data as JSON for session tracking
12. WHEN deserializing restore state THEN the Restore System SHALL parse JSON and validate the restore availability

---

### Requirement 3: Daily Rituals (Daily Quests)

**User Story:** As a player, I want daily goals to complete, so that I have reasons to return every day even when the daily challenge feels too difficult.

#### Acceptance Criteria

1. WHEN a new day begins THEN the Ritual System SHALL generate 3 daily rituals from the quest pool
2. WHEN generating daily rituals THEN the Ritual System SHALL use the date as a seed to ensure consistent rituals for all players
3. WHEN the player completes a ritual's objective THEN the Ritual System SHALL mark that ritual as completed and award the specified Echo Shards
4. WHEN all 3 daily rituals are completed THEN the Ritual System SHALL award a bonus completion reward
5. WHEN displaying rituals THEN the Ritual System SHALL show progress (current/target) for each active ritual
6. WHEN the player views the ritual panel THEN the Ritual System SHALL display a terminal-styled "Daily Logs" interface
7. WHEN a ritual involves "Near Miss" actions THEN the Ritual System SHALL track near miss events during gameplay
8. WHEN a ritual involves "Phantom obstacles" THEN the Ritual System SHALL track phantom obstacle passes during gameplay
9. WHEN a ritual involves "cumulative score" THEN the Ritual System SHALL track total score across all sessions for the day
10. WHEN a ritual involves "speed survival" THEN the Ritual System SHALL track time spent at or above the target speed
11. WHEN the day changes THEN the Ritual System SHALL reset all ritual progress and generate new rituals
12. WHEN serializing ritual progress THEN the Ritual System SHALL encode the data as JSON for localStorage persistence
13. WHEN deserializing ritual data THEN the Ritual System SHALL parse JSON and validate data integrity

---

### Requirement 4: Haptic Feedback System

**User Story:** As a mobile player, I want to feel tactile feedback during gameplay, so that the game feels more responsive and immersive.

#### Acceptance Criteria

1. WHEN the player taps to swap orbs THEN the Haptic System SHALL trigger a light haptic pulse (10ms)
2. WHEN the player collides with an obstacle THEN the Haptic System SHALL trigger a heavy haptic impact (50ms)
3. WHEN a near miss occurs THEN the Haptic System SHALL trigger a medium haptic pulse (25ms)
4. WHEN Harmonic Resonance activates THEN the Haptic System SHALL trigger a success haptic pattern (double pulse)
5. WHEN the player presses a UI button THEN the Haptic System SHALL trigger a selection haptic (5ms)
6. WHEN haptic feedback is disabled in settings THEN the Haptic System SHALL skip all haptic triggers
7. WHEN the device does not support haptics THEN the Haptic System SHALL gracefully degrade without errors

---

### Requirement 5: Analytics Event System

**User Story:** As a developer, I want to track player behavior and game events, so that I can identify balance issues and improve the game experience.

#### Acceptance Criteria

1. WHEN a level is failed THEN the Analytics System SHALL log an event with level_id, score_at_death, and time_played
2. WHEN a level is completed THEN the Analytics System SHALL log an event with level_id, final_score, stars_earned, and time_played
3. WHEN the player makes a purchase THEN the Analytics System SHALL log an event with item_id, item_category, and price
4. WHEN the player uses System Restore THEN the Analytics System SHALL log an event with score_at_death and restore_success
5. WHEN the player completes a daily ritual THEN the Analytics System SHALL log an event with ritual_id and completion_time
6. WHEN the player quits during gameplay THEN the Analytics System SHALL log an event with current_score, level_id, and session_duration
7. WHEN logging analytics events THEN the Analytics System SHALL batch events and persist to localStorage for later transmission

---

### Requirement 6: Rate Us Flow

**User Story:** As a developer, I want to prompt happy players to rate the game, so that the game can gain visibility in app stores.

#### Acceptance Criteria

1. WHEN the player achieves a new high score THEN the Rate System SHALL increment the positive_moment counter
2. WHEN the player completes a difficult level (3 stars) THEN the Rate System SHALL increment the positive_moment counter
3. WHEN the positive_moment counter reaches 3 and the player has not been prompted before THEN the Rate System SHALL display a "Enjoying Echo Shift?" prompt
4. WHEN the player responds positively to the prompt THEN the Rate System SHALL open the app store rating page
5. WHEN the player responds negatively THEN the Rate System SHALL display a feedback form or dismiss the prompt
6. WHEN the player dismisses the prompt THEN the Rate System SHALL not show the prompt again for 7 days
7. WHEN the player has already rated the game THEN the Rate System SHALL never show the prompt again
8. WHEN serializing rate prompt state THEN the Rate System SHALL encode the data as JSON for localStorage persistence

