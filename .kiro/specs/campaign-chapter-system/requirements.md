# Requirements Document

## Introduction

Echo Shift kampanya sistemi tamamen yeniden tasarlanıyor. Oyun artık sonsuz mesafe/skor mantığından çıkıyor ve bölüm bazlı ilerleme sistemine geçiyor. Her bölümün belirli bir hedef mesafesi var (bölüm numarası × 100 metre). Oyuncu bitiş çizgisine ulaştığında bölüm tamamlanıyor ve VictoryScreen gösteriliyor. Tüm bölümler başlangıçta kilitli, sadece 1. bölüm açık. Bir bölümü tamamlamadan sonraki bölüme geçilemiyor.

## Glossary

- **Campaign_System**: Bölüm bazlı ilerleme sistemi
- **Chapter**: Oyundaki her bir bölüm (Level 1, Level 2, vb.)
- **Target_Distance**: Bölümün hedef mesafesi (bölüm numarası × 100 metre)
- **Finish_Line**: Bölüm sonundaki bitiş çizgisi görsel elementi
- **Current_Distance**: Oyuncunun o anki mesafesi (metre)
- **Victory_Screen**: Bölüm tamamlandığında gösterilen zafer ekranı
- **Progressive_Speed**: Mesafeye bağlı logaritmik hız artışı
- **Locked_Chapter**: Henüz açılmamış, oynanamayan bölüm
- **Unlocked_Chapter**: Oynanabilir durumda olan bölüm
- **Completed_Chapter**: Başarıyla tamamlanmış bölüm

## Requirements

### Requirement 1

**User Story:** As a player, I want each chapter to have a fixed target distance based on chapter number, so that I have clear goals to achieve.

#### Acceptance Criteria

1. WHEN calculating Target_Distance for a chapter THEN the Campaign_System SHALL use the formula: `Target_Distance = Chapter_Number × 100` meters
2. WHEN Chapter 1 starts THEN the Target_Distance SHALL be 100 meters
3. WHEN Chapter 2 starts THEN the Target_Distance SHALL be 200 meters
4. WHEN Chapter 5 starts THEN the Target_Distance SHALL be 500 meters
5. WHEN the player reaches Target_Distance THEN the Campaign_System SHALL trigger level completion

### Requirement 2

**User Story:** As a player, I want all chapters to be locked initially except Chapter 1, so that I progress through the game sequentially.

#### Acceptance Criteria

1. WHEN the game starts for the first time THEN the Campaign_System SHALL set Chapter 1 as unlocked and all other chapters as locked
2. WHEN displaying the level selection screen THEN the Campaign_System SHALL show a lock icon on all Locked_Chapters
3. WHEN a player attempts to select a Locked_Chapter THEN the Campaign_System SHALL prevent selection and display a "Complete previous chapter" message
4. WHEN a player completes a chapter THEN the Campaign_System SHALL unlock the next sequential chapter
5. WHEN persisting game state THEN the Campaign_System SHALL save the list of completed chapters to storage

### Requirement 3

**User Story:** As a player, I want to see a professional finish line when approaching the end of a chapter, so that I know I'm about to complete it.

#### Acceptance Criteria

1. WHEN the player is within 50 meters of Target_Distance THEN the Finish_Line SHALL become visible on screen
2. WHEN the Finish_Line appears THEN it SHALL display a holographic gate effect with pulsing animation
3. WHEN the player crosses the Finish_Line THEN the system SHALL trigger a "warp speed" acceleration animation
4. WHEN the player crosses the Finish_Line THEN the system SHALL play a completion sound effect
5. WHEN the Finish_Line is crossed THEN the game SHALL transition to Victory_Screen

### Requirement 4

**User Story:** As a player, I want the game speed to increase based on distance traveled within each chapter, so that gameplay becomes progressively more challenging as I get closer to the finish line.

#### Acceptance Criteria

1. WHEN a chapter starts THEN the game speed SHALL reset to base speed (5 pixels per frame)
2. WHILE playing a chapter THEN the Campaign_System SHALL increase speed based on Current_Distance using formula: `speed = baseSpeed × (1 + 0.3 × log(1 + currentDistance / 50))`
3. WHEN Current_Distance increases THEN the speed SHALL increase proportionally (more distance = faster speed)
4. WHEN the player is in the final 20% of Target_Distance THEN the Campaign_System SHALL apply a 1.2x climax speed multiplier
5. WHEN a new chapter starts THEN the speed progression SHALL reset to base speed regardless of previous chapter

### Requirement 5

**User Story:** As a player, I want to see a victory screen when I complete a chapter, so that I feel rewarded for my achievement.

#### Acceptance Criteria

1. WHEN a chapter is completed THEN the Victory_Screen SHALL display with slow motion effect (0.2x speed for 1 second)
2. WHEN the Victory_Screen displays THEN it SHALL show the completed chapter number
3. WHEN the Victory_Screen displays THEN it SHALL show distance traveled and target distance
4. WHEN the Victory_Screen displays THEN it SHALL show earned Echo_Shards with flying animation
5. WHEN the Victory_Screen displays THEN it SHALL provide "Next Chapter", "Replay", and "Main Menu" buttons

### Requirement 6

**User Story:** As a player, I want the game to end when I die before reaching the finish line, so that I understand the challenge.

#### Acceptance Criteria

1. WHEN the player's health reaches zero before Target_Distance THEN the Campaign_System SHALL trigger game over state
2. WHEN game over triggers THEN the system SHALL display the Game Over screen with distance traveled
3. WHEN game over triggers THEN the system SHALL NOT unlock the next chapter
4. WHEN game over triggers THEN the system SHALL provide "Retry" and "Main Menu" options

### Requirement 7

**User Story:** As a player, I want the distance display to show my progress clearly, so that I always know how close I am to the finish.

#### Acceptance Criteria

1. WHILE in campaign mode THEN the GameUI SHALL display Current_Distance in meters in the top-left corner
2. WHILE in campaign mode THEN the GameUI SHALL display a progress bar showing Current_Distance / Target_Distance
3. WHEN the player is within 50 meters of Target_Distance THEN the progress bar SHALL pulse with a glow effect
4. WHEN displaying distance THEN the system SHALL update the display every frame

### Requirement 8

**User Story:** As a player, I want my chapter progress to be saved, so that I can continue from where I left off.

#### Acceptance Criteria

1. WHEN a chapter is completed THEN the Campaign_System SHALL persist the completion to localStorage
2. WHEN the game loads THEN the Campaign_System SHALL restore the list of completed chapters from storage
3. WHEN displaying the level map THEN the Campaign_System SHALL show completion status for each chapter
4. WHEN a chapter is completed THEN the Campaign_System SHALL reset all chapter progress data for a fresh start on next play

