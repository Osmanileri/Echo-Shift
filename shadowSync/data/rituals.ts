// data/rituals.ts
// Daily Rituals definitions for Echo Shift Engagement Update

export type RitualType =
  | 'NEAR_MISS'      // X near misses in one game
  | 'PHANTOM_PASS'   // Pass X phantom obstacles
  | 'CUMULATIVE'     // Reach X total score today
  | 'SPEED_SURVIVAL' // Survive X seconds at Y+ speed
  | 'STREAK'         // Reach X streak
  | 'NO_SWAP';       // Survive X seconds without swapping

export interface RitualDefinition {
  id: string;
  type: RitualType;
  name: string;
  description: string;
  target: number;
  reward: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Pool of 10 rituals for daily selection
export const RITUAL_POOL: RitualDefinition[] = [
  // Easy rituals
  {
    id: 'near_miss_5',
    type: 'NEAR_MISS',
    name: 'Precision Master',
    description: 'Get 5 near misses in one game',
    target: 5,
    reward: 25,
    difficulty: 'easy'
  },
  {
    id: 'streak_5',
    type: 'STREAK',
    name: 'Rhythm Starter',
    description: 'Reach a 5x streak',
    target: 5,
    reward: 20,
    difficulty: 'easy'
  },
  {
    id: 'cumulative_5000',
    type: 'CUMULATIVE',
    name: 'Daily Grind',
    description: 'Score 5,000 total points today',
    target: 5000,
    reward: 30,
    difficulty: 'easy'
  },

  // Medium rituals
  {
    id: 'phantom_20',
    type: 'PHANTOM_PASS',
    name: 'Ghost Hunter',
    description: 'Pass 20 phantom obstacles',
    target: 20,
    reward: 50,
    difficulty: 'medium'
  },
  {
    id: 'near_miss_10',
    type: 'NEAR_MISS',
    name: 'Edge Walker',
    description: 'Get 10 near misses in one game',
    target: 10,
    reward: 60,
    difficulty: 'medium'
  },
  {
    id: 'cumulative_25000',
    type: 'CUMULATIVE',
    name: 'Marathon',
    description: 'Score 25,000 total points today',
    target: 25000,
    reward: 75,
    difficulty: 'medium'
  },

  // Hard rituals
  {
    id: 'speed_survival',
    type: 'SPEED_SURVIVAL',
    name: 'Survivor',
    description: 'Survive 10 seconds at 100+ km/h',
    target: 10,
    reward: 100,
    difficulty: 'hard'
  },
  {
    id: 'streak_15',
    type: 'STREAK',
    name: 'Rhythm Master',
    description: 'Reach a 15x streak',
    target: 15,
    reward: 100,
    difficulty: 'hard'
  },
  {
    id: 'no_swap_30',
    type: 'NO_SWAP',
    name: 'Steady Hands',
    description: 'Survive 30 seconds without swapping',
    target: 30,
    reward: 80,
    difficulty: 'hard'
  },
  {
    id: 'cumulative_50000',
    type: 'CUMULATIVE',
    name: 'Endurance',
    description: 'Score 50,000 total points today',
    target: 50000,
    reward: 150,
    difficulty: 'hard'
  },
];

// Bonus reward for completing all 3 daily rituals
export const BONUS_REWARD = 100;
