/**
 * Upgrade Data Definitions
 * Requirements: 6.1, 6.2, 6.3
 */

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  effect: (level: number) => number;
}

/**
 * Get the cost for a specific upgrade level
 * Cost formula: baseCost * (costMultiplier ^ (level - 1))
 * Level 1 costs baseCost, Level 2 costs baseCost * costMultiplier, etc.
 */
export function getUpgradeCost(upgrade: Upgrade, currentLevel: number): number {
  if (currentLevel >= upgrade.maxLevel) {
    return Infinity; // Cannot purchase beyond max level
  }
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

/**
 * Get the effect value for a specific upgrade level
 */
export function getUpgradeEffect(upgrade: Upgrade, level: number): number {
  if (level <= 0) return upgrade.id === 'score-multiplier' ? 1 : 0;
  return upgrade.effect(level);
}

/**
 * Upgrade Definitions
 * Requirements: 6.1, 6.2, 6.3
 */
export const UPGRADES: Upgrade[] = [
  {
    id: 'starting-score',
    name: 'Head Start',
    description: 'Start each game with bonus score',
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.5,
    // Effect: 100, 200, 300, 400, 500 starting score
    effect: (level: number) => level * 100,
  },
  {
    id: 'score-multiplier',
    name: 'Echo Amplifier',
    description: 'Permanent score multiplier',
    maxLevel: 3,
    baseCost: 500,
    costMultiplier: 2,
    // Effect: 1.1x, 1.2x, 1.3x multiplier
    effect: (level: number) => 1 + level * 0.1,
  },
  {
    id: 'slow-motion',
    name: 'Time Warp',
    description: 'Slow motion ability per game',
    maxLevel: 3,
    baseCost: 300,
    costMultiplier: 1.5,
    // Effect: 1, 2, 3 uses per game
    effect: (level: number) => level,
  },
];

/**
 * Get upgrade by ID
 */
export function getUpgradeById(id: string): Upgrade | undefined {
  return UPGRADES.find(u => u.id === id);
}
