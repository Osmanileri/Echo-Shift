/**
 * Daily Challenge System Implementation
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * Generates unique daily challenges using date-based seeding,
 * manages completion status, and calculates rewards.
 */

import { useGameStore } from '../store/gameStore';

/**
 * Daily Challenge Configuration
 * Requirements: 8.1, 8.2
 */
export interface DailyChallengeConfig {
  seed: number;
  date: string;
  modifiers: {
    speedBoost: number;        // Speed multiplier (0.8 - 1.5)
    phantomOnly: boolean;      // Only phantom obstacles
    invertedControls: boolean; // Swap controls reversed
    noMidline: boolean;        // Disable dynamic midline
    doubleObstacles: boolean;  // Double spawn rate
  };
  bonusMultiplier: number;     // Echo Shards bonus (1.5 - 3.0)
  challengeName: string;       // Display name for the challenge
  description: string;         // Challenge description
}

/**
 * Daily Challenge Result
 */
export interface DailyChallengeResult {
  score: number;
  echoShardsEarned: number;
  isNewBestScore: boolean;
  alreadyCompleted: boolean;
}

/**
 * Seeded random number generator (Mulberry32)
 * Requirements: 8.5 - Deterministic algorithm
 * @param seed - Seed value
 * @returns Function that returns random numbers 0-1
 */
function createSeededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Generate a seed from a date string
 * Requirements: 8.1, 8.5
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Numeric seed
 */
export function generateSeedFromDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get today's date string in YYYY-MM-DD format
 * @returns Date string
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Challenge name templates based on modifiers
 */
const CHALLENGE_NAMES = [
  'Speed Demon',
  'Ghost Hunter',
  'Mirror World',
  'Steady Ground',
  'Obstacle Course',
  'Ultimate Challenge',
  'Phantom Rush',
  'Chaos Mode',
  'Precision Run',
  'Endurance Test',
];

/**
 * Generate a daily challenge configuration
 * Requirements: 8.1, 8.5
 * @param date - Date to generate challenge for (defaults to today)
 * @returns DailyChallengeConfig
 */
export function generateChallenge(date: Date = new Date()): DailyChallengeConfig {
  const dateStr = date.toISOString().split('T')[0];
  const seed = generateSeedFromDate(dateStr);
  const random = createSeededRandom(seed);
  
  // Generate modifiers deterministically
  const speedBoost = 0.8 + random() * 0.7; // 0.8 - 1.5
  const phantomOnly = random() < 0.2;       // 20% chance
  const invertedControls = random() < 0.15; // 15% chance
  const noMidline = random() < 0.25;        // 25% chance
  const doubleObstacles = random() < 0.2;   // 20% chance
  
  // Calculate bonus multiplier based on difficulty
  let difficultyScore = 1;
  if (speedBoost > 1.2) difficultyScore += 0.3;
  if (phantomOnly) difficultyScore += 0.5;
  if (invertedControls) difficultyScore += 0.4;
  if (doubleObstacles) difficultyScore += 0.3;
  
  const bonusMultiplier = Math.min(3.0, 1.5 + (difficultyScore - 1) * 0.5);
  
  // Generate challenge name
  const nameIndex = Math.floor(random() * CHALLENGE_NAMES.length);
  const challengeName = CHALLENGE_NAMES[nameIndex];
  
  // Generate description based on active modifiers
  const activeModifiers: string[] = [];
  if (speedBoost > 1.2) activeModifiers.push(`${Math.round(speedBoost * 100)}% speed`);
  if (speedBoost < 0.9) activeModifiers.push('Slow motion');
  if (phantomOnly) activeModifiers.push('Phantom obstacles only');
  if (invertedControls) activeModifiers.push('Inverted controls');
  if (noMidline) activeModifiers.push('Static midline');
  if (doubleObstacles) activeModifiers.push('Double obstacles');
  
  const description = activeModifiers.length > 0 
    ? activeModifiers.join(' • ')
    : 'Standard challenge';
  
  return {
    seed,
    date: dateStr,
    modifiers: {
      speedBoost,
      phantomOnly,
      invertedControls,
      noMidline,
      doubleObstacles,
    },
    bonusMultiplier,
    challengeName,
    description,
  };
}

/**
 * Check if today's challenge has been completed
 * Requirements: 8.4
 * @returns true if completed
 */
export function isCompleted(): boolean {
  const state = useGameStore.getState();
  const today = getTodayDateString();
  
  return state.lastDailyChallengeDate === today && state.dailyChallengeCompleted;
}

/**
 * Check if a challenge is available (new day)
 * @returns true if a new challenge is available
 */
export function isChallengeAvailable(): boolean {
  const state = useGameStore.getState();
  const today = getTodayDateString();
  
  // Challenge is available if it's a new day or not completed today
  return state.lastDailyChallengeDate !== today || !state.dailyChallengeCompleted;
}

/**
 * Submit a score for the daily challenge
 * Requirements: 8.3, 8.4
 * @param score - Player's score
 * @returns DailyChallengeResult with rewards
 */
export function submitScore(score: number): DailyChallengeResult {
  const state = useGameStore.getState();
  const today = getTodayDateString();
  const challenge = generateChallenge();
  
  // Check if already completed today
  const alreadyCompleted = state.lastDailyChallengeDate === today && state.dailyChallengeCompleted;
  
  if (alreadyCompleted) {
    // Still track best score but no additional rewards
    const isNewBestScore = score > state.dailyChallengeBestScore;
    
    if (isNewBestScore) {
      // Update best score without additional rewards
      useGameStore.setState({
        dailyChallengeBestScore: score,
      });
      state.saveToStorage();
    }
    
    return {
      score,
      echoShardsEarned: 0,
      isNewBestScore,
      alreadyCompleted: true,
    };
  }
  
  // Calculate Echo Shards reward with bonus multiplier
  const baseShards = Math.floor(score * 0.1);
  const echoShardsEarned = Math.floor(baseShards * challenge.bonusMultiplier);
  
  // Check if new best score
  const isNewBestScore = score > state.dailyChallengeBestScore;
  
  // Update state
  state.setDailyChallengeCompleted(score);
  state.addEchoShards(echoShardsEarned);
  
  return {
    score,
    echoShardsEarned,
    isNewBestScore,
    alreadyCompleted: false,
  };
}

/**
 * Get the best score for today's challenge
 * Requirements: 8.4
 * @returns Best score or 0 if not attempted
 */
export function getBestScore(): number {
  const state = useGameStore.getState();
  const today = getTodayDateString();
  
  // Only return best score if it's from today
  if (state.lastDailyChallengeDate === today) {
    return state.dailyChallengeBestScore;
  }
  
  return 0;
}

/**
 * Get time remaining until next challenge
 * @returns Object with hours, minutes, seconds
 */
export function getTimeUntilNextChallenge(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow.getTime() - now.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
}

/**
 * Get today's challenge with completion status
 * @returns Challenge config with status
 */
export function getTodayChallenge(): DailyChallengeConfig & { 
  completed: boolean; 
  bestScore: number;
  available: boolean;
} {
  const challenge = generateChallenge();
  
  return {
    ...challenge,
    completed: isCompleted(),
    bestScore: getBestScore(),
    available: isChallengeAvailable(),
  };
}
