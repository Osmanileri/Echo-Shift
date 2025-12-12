/**
 * Level Data Definitions for Campaign Mode
 * Requirements: 7.1, 7.2, 7.4, 7.5, 7.6
 */

/**
 * Level mechanics configuration
 * Requirements: 7.4, 7.5, 7.6
 */
export interface LevelMechanics {
  phantom: boolean;    // Phantom obstacles enabled (introduced at level 11)
  midline: boolean;    // Dynamic midline enabled (introduced at level 20)
  rhythm: boolean;     // Rhythm system enabled
  gravity: boolean;    // Gravity flip enabled
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
 * Complete level configuration
 * Requirements: 7.2
 */
export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  targetScore: number;
  starThresholds: [number, number, number]; // Score thresholds for 1, 2, 3 stars
  mechanics: LevelMechanics;
  modifiers: LevelModifiers;
  rewards: LevelRewards;
}

/**
 * Generate level name based on level number and mechanics
 */
function generateLevelName(id: number): string {
  if (id <= 10) return `Tutorial ${id}`;
  if (id === 11) return 'Ghost Protocol';
  if (id <= 20) return `Phantom ${id - 10}`;
  if (id === 21) return 'Shifting Grounds';
  if (id <= 30) return `Dynamic ${id - 20}`;
  if (id <= 50) return `Challenge ${id - 30}`;
  if (id <= 75) return `Expert ${id - 50}`;
  if (id <= 99) return `Master ${id - 75}`;
  return 'Final Challenge';
}

/**
 * Generate level description based on mechanics
 */
function generateLevelDescription(id: number, mechanics: LevelMechanics): string {
  if (id <= 10) return 'Learn the basics of Echo Shift';
  if (id === 11) return 'Phantom obstacles appear from the shadows';
  if (id <= 20) return 'Master the phantom obstacles';
  if (id === 21) return 'The midline begins to shift';
  if (id <= 30) return 'Adapt to the dynamic midline';
  if (id <= 50) return 'Test your skills with all mechanics';
  if (id <= 75) return 'Expert-level challenge awaits';
  if (id <= 99) return 'Only masters can survive';
  return 'The ultimate test of skill';
}

/**
 * Calculate target score based on level
 */
function calculateTargetScore(id: number): number {
  if (id <= 10) return 50 + (id * 50);           // 100 - 550
  if (id <= 20) return 500 + ((id - 10) * 100);  // 600 - 1500
  if (id <= 30) return 1500 + ((id - 20) * 150); // 1650 - 3000
  if (id <= 50) return 3000 + ((id - 30) * 200); // 3200 - 7000
  if (id <= 75) return 7000 + ((id - 50) * 300); // 7300 - 14500
  if (id <= 99) return 14500 + ((id - 75) * 400); // 14900 - 24100
  return 25000; // Level 100
}

/**
 * Calculate star thresholds based on target score
 */
function calculateStarThresholds(targetScore: number): [number, number, number] {
  return [
    targetScore,                          // 1 star: reach target
    Math.floor(targetScore * 1.5),        // 2 stars: 150% of target
    Math.floor(targetScore * 2),          // 3 stars: 200% of target
  ];
}

/**
 * Determine mechanics for a level
 * Requirements: 7.4, 7.5, 7.6
 */
function getMechanicsForLevel(id: number): LevelMechanics {
  return {
    phantom: id >= 11,   // Phantom introduced at level 11
    midline: id >= 21,   // Dynamic midline introduced at level 21
    rhythm: id >= 31,    // Rhythm system introduced at level 31
    gravity: id >= 41,   // Gravity flip introduced at level 41
  };
}

/**
 * Calculate difficulty modifiers based on level
 */
function getModifiersForLevel(id: number): LevelModifiers {
  // Speed increases gradually from 0.6 to 1.4
  const speedMultiplier = Math.min(1.4, 0.6 + (id * 0.008));
  
  // Spawn rate increases from 0.5 to 1.3
  const spawnRateMultiplier = Math.min(1.3, 0.5 + (id * 0.008));
  
  return {
    speedMultiplier: Math.round(speedMultiplier * 100) / 100,
    spawnRateMultiplier: Math.round(spawnRateMultiplier * 100) / 100,
  };
}

/**
 * Calculate rewards based on level
 */
function getRewardsForLevel(id: number): LevelRewards {
  // Base shards increase with level
  const echoShards = 10 + Math.floor(id * 2);
  
  // Bonus per star also increases
  const bonusPerStar = 5 + Math.floor(id * 0.5);
  
  return {
    echoShards,
    bonusPerStar,
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
    description: generateLevelDescription(id, mechanics),
    targetScore,
    starThresholds: calculateStarThresholds(targetScore),
    mechanics,
    modifiers: getModifiersForLevel(id),
    rewards: getRewardsForLevel(id),
  };
}

/**
 * All 100 level configurations
 * Requirements: 7.1
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
