/**
 * Level Data Definitions for Campaign Mode
 * Campaign Update v2.5 - Distance-based progression
 * Requirements: 2.1, 3.4, 5.1, 5.3, 5.4
 */

/**
 * Chapter types for campaign organization
 * Requirements: 5.1
 */
export type ChapterType = 'SUB_BASS' | 'BASS' | 'MID' | 'HIGH' | 'PRESENCE';

/**
 * Level mechanics configuration
 * Requirements: 5.3
 */
export interface LevelMechanics {
  phantom: boolean;          // Phantom obstacles enabled (introduced at level 11)
  midline: boolean;          // Dynamic midline enabled (introduced at level 20)
  rhythm: boolean;           // Rhythm system enabled
  gravity: boolean;          // Gravity flip enabled
  movingObstacles: boolean;  // Moving obstacles (introduced at MID chapter, level 21+)
}

/**
 * Level difficulty modifiers
 */
export interface LevelModifiers {
  speedMultiplier: number;      // Game speed multiplier (0.5 - 1.5)
  spawnRateMultiplier: number;  // Obstacle spawn rate multiplier (0.5 - 1.5)
}

/**
 * Level rewards configuration
 */
export interface LevelRewards {
  echoShards: number;    // Base Echo Shards reward
  bonusPerStar: number;  // Additional shards per star earned
}

/**
 * Star criteria for level completion
 * Requirements: 4.1, 4.2, 4.3
 */
export interface StarCriteria {
  survivor: boolean;            // Complete level (always true for 1 star)
  collectorThreshold: number;   // 80% of available shards for 2 stars
  perfectionist: boolean;       // No damage taken for 3 stars
}

/**
 * Complete level configuration
 * Requirements: 2.1, 3.4, 5.4
 */
export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  chapter: ChapterType;
  targetDistance: number;       // Distance in meters to complete level
  baseSpeed: number;            // Base speed for the level
  obstacleDensity: number;      // Obstacle spawn density (0.5 - 1.0)
  // Legacy fields for backward compatibility
  targetScore: number;
  starThresholds: [number, number, number];
  mechanics: LevelMechanics;
  modifiers: LevelModifiers;
  rewards: LevelRewards;
  starCriteria: StarCriteria;
}


/**
 * Calculate target distance for a level
 * Simple formula: level × 100 meters
 * Requirements: 1.1 (Campaign Chapter System)
 * @param level - Level number (1-100)
 * @returns Target distance in meters
 */
export function calculateTargetDistance(level: number): number {
  return level * 100;
}

/**
 * Calculate base speed for a level
 * Early levels are slower for mobile-friendly gameplay
 * Requirements: 3.4
 * @param level - Level number (1-100)
 * @returns Base speed in pixels per frame
 */
export function calculateBaseSpeed(level: number): number {
  if (level <= 10) return 1; // Super slow intro speed for first 10 levels (mobil için)
  if (level <= 30) return 1.2 + ((level - 10) * 0.08); // Gradual increase: 1.28 to 2.8
  return 2.8 + ((level - 30) * 0.05); // Very slow progression from level 31+
}

/**
 * Calculate obstacle density for a level
 * Formula: min(1.0, 0.5 + (level * 0.02))
 * Requirements: 5.4
 * @param level - Level number (1-100)
 * @returns Obstacle density (0.5 - 1.0)
 */
export function calculateObstacleDensity(level: number): number {
  return Math.min(1.0, 0.5 + (level * 0.02));
}

/**
 * Get chapter type for a level
 * Requirements: 5.1
 * @param level - Level number (1-100)
 * @returns ChapterType
 */
export function getChapterForLevel(level: number): ChapterType {
  if (level <= 10) return 'SUB_BASS';
  if (level <= 20) return 'BASS';
  if (level <= 30) return 'MID';
  if (level <= 40) return 'HIGH';
  return 'PRESENCE';
}

/**
 * Generate level name based on level number and chapter
 */
function generateLevelName(id: number): string {
  const chapter = getChapterForLevel(id);
  const chapterNames: Record<ChapterType, string> = {
    'SUB_BASS': 'Sub-Bass',
    'BASS': 'Bass',
    'MID': 'Mid',
    'HIGH': 'High',
    'PRESENCE': 'Presence',
  };
  const levelInChapter = ((id - 1) % 10) + 1;
  return `${chapterNames[chapter]} ${levelInChapter}`;
}

/**
 * Generate level description based on chapter
 */
function generateLevelDescription(id: number): string {
  const chapter = getChapterForLevel(id);
  const descriptions: Record<ChapterType, string> = {
    'SUB_BASS': 'Feel the deep frequencies',
    'BASS': 'Ride the bass waves',
    'MID': 'Navigate the shifting midrange',
    'HIGH': 'Ascend to higher frequencies',
    'PRESENCE': 'Master the presence zone',
  };
  return descriptions[chapter];
}

/**
 * Calculate target score based on level (legacy support)
 */
function calculateTargetScore(id: number): number {
  if (id <= 10) return 50 + (id * 50);
  if (id <= 20) return 500 + ((id - 10) * 100);
  if (id <= 30) return 1500 + ((id - 20) * 150);
  if (id <= 50) return 3000 + ((id - 30) * 200);
  if (id <= 75) return 7000 + ((id - 50) * 300);
  if (id <= 99) return 14500 + ((id - 75) * 400);
  return 25000;
}

/**
 * Calculate star thresholds based on target score (legacy support)
 */
function calculateStarThresholds(targetScore: number): [number, number, number] {
  return [
    targetScore,
    Math.floor(targetScore * 1.5),
    Math.floor(targetScore * 2),
  ];
}

/**
 * Determine mechanics for a level
 * Requirements: 5.3
 */
function getMechanicsForLevel(id: number): LevelMechanics {
  return {
    phantom: id >= 11,
    midline: id >= 21,
    rhythm: id >= 31,
    gravity: id >= 41,
    movingObstacles: id >= 21,  // Introduced at MID chapter (level 21+)
  };
}

/**
 * Calculate difficulty modifiers based on level
 * Early levels (1-5) are much easier for mobile players
 */
function getModifiersForLevel(id: number): LevelModifiers {
  // Level 1-3: Very slow and easy (tutorial-like)
  if (id <= 3) {
    return {
      speedMultiplier: 0.2 + (id * 0.05),  // 0.25, 0.30, 0.35
      spawnRateMultiplier: 0.15 + (id * 0.05),  // 0.20, 0.25, 0.30
    };
  }
  
  // Level 4-10: Gradual increase
  if (id <= 10) {
    return {
      speedMultiplier: 0.35 + ((id - 3) * 0.05),  // 0.40 to 0.70
      spawnRateMultiplier: 0.30 + ((id - 3) * 0.04),  // 0.34 to 0.58
    };
  }
  
  // Level 11+: Normal progression
  const speedMultiplier = Math.min(1.4, 0.70 + ((id - 10) * 0.008));
  const spawnRateMultiplier = Math.min(1.3, 0.58 + ((id - 10) * 0.008));
  
  return {
    speedMultiplier: Math.round(speedMultiplier * 100) / 100,
    spawnRateMultiplier: Math.round(spawnRateMultiplier * 100) / 100,
  };
}

/**
 * Calculate rewards based on level
 */
function getRewardsForLevel(id: number): LevelRewards {
  const echoShards = 10 + Math.floor(id * 2);
  const bonusPerStar = 5 + Math.floor(id * 0.5);
  
  return {
    echoShards,
    bonusPerStar,
  };
}

/**
 * Get star criteria for a level
 * Requirements: 4.1, 4.2, 4.3
 */
function getStarCriteriaForLevel(): StarCriteria {
  return {
    survivor: true,           // 1 star: complete with health > 0
    collectorThreshold: 0.8,  // 2 stars: collect >= 80% shards
    perfectionist: true,      // 3 stars: no damage taken
  };
}

/**
 * Generate a single level configuration
 */
function generateLevelConfig(id: number): LevelConfig {
  const mechanics = getMechanicsForLevel(id);
  const targetScore = calculateTargetScore(id);
  
  return {
    id,
    name: generateLevelName(id),
    description: generateLevelDescription(id),
    chapter: getChapterForLevel(id),
    targetDistance: calculateTargetDistance(id),
    baseSpeed: calculateBaseSpeed(id),
    obstacleDensity: calculateObstacleDensity(id),
    targetScore,
    starThresholds: calculateStarThresholds(targetScore),
    mechanics,
    modifiers: getModifiersForLevel(id),
    rewards: getRewardsForLevel(id),
    starCriteria: getStarCriteriaForLevel(),
  };
}

/**
 * All 100 level configurations
 */
export const LEVELS: LevelConfig[] = Array.from(
  { length: 100 },
  (_, index) => generateLevelConfig(index + 1)
);

/**
 * Get level configuration by ID
 * @param levelId - Level number (1-100)
 * @returns LevelConfig or undefined if invalid ID
 */
export function getLevelById(levelId: number): LevelConfig | undefined {
  if (levelId < 1 || levelId > 100) {
    return undefined;
  }
  return LEVELS[levelId - 1];
}

/**
 * Get default level (level 1)
 */
export function getDefaultLevel(): LevelConfig {
  return LEVELS[0];
}

/**
 * Check if a level ID is valid
 */
export function isValidLevelId(levelId: number): boolean {
  return levelId >= 1 && levelId <= 100;
}

/**
 * Get total number of levels
 */
export function getTotalLevels(): number {
  return LEVELS.length;
}
