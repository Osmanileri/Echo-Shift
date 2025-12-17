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
  return Math.floor(
    upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel)
  );
}

/**
 * Get the effect value for a specific upgrade level
 */
export function getUpgradeEffect(upgrade: Upgrade, level: number): number {
  if (level <= 0) return upgrade.id === "score-multiplier" ? 1 : 0;
  return upgrade.effect(level);
}

/**
 * Upgrade Definitions
 * Requirements: 6.1, 6.2, 6.3
 */
export const UPGRADES: Upgrade[] = [
  {
    id: "starting-score",
    name: "Head Start",
    description: "Start each game with bonus score",
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.5,
    // Effect: 100, 200, 300, 400, 500 starting score
    effect: (level: number) => level * 100,
  },
  {
    id: "magnet",
    name: "Magnet",
    description: "Pull nearby shards toward your orbs",
    maxLevel: 5,
    baseCost: 250,
    costMultiplier: 1.6,
    // Effect: radius factor (multiplied by min(canvasWidth, canvasHeight))
    // L1=0.16, L2=0.20, L3=0.24, L4=0.28, L5=0.32
    effect: (level: number) => 0.12 + level * 0.04,
  },
  {
    id: "shield",
    name: "Shield",
    description:
      "First collision breaks shield instead of dying (2s invincibility)",
    maxLevel: 3,
    baseCost: 600,
    costMultiplier: 2,
    // Effect: number of shield charges per run (1..3)
    effect: (level: number) => level,
  },
  {
    id: "score-multiplier",
    name: "Echo Amplifier",
    description: "Permanent score multiplier",
    maxLevel: 3,
    baseCost: 500,
    costMultiplier: 2,
    // Effect: 1.1x, 1.2x, 1.3x multiplier
    effect: (level: number) => 1 + level * 0.1,
  },
  {
    id: "slow-motion",
    name: "Time Warp",
    description: "Slow motion ability per game",
    maxLevel: 3,
    baseCost: 300,
    costMultiplier: 1.5,
    // Effect: 1, 2, 3 uses per game
    effect: (level: number) => level,
  },
  // Phase Dash Upgrades
  {
    id: "dash-duration",
    name: "Overclock Chip",
    description: "Phase Dash süresini uzatır",
    maxLevel: 5,
    baseCost: 1000,
    costMultiplier: 1.8,
    // Effect: 3000, 3500, 4000, 4500, 5000 ms
    effect: (level: number) => 3000 + level * 500,
  },
  {
    id: "dash-recharge",
    name: "Recharge Core",
    description: "Enerji barı daha hızlı dolar",
    maxLevel: 5,
    baseCost: 1500,
    costMultiplier: 1.7,
    // Effect: 1.0, 1.2, 1.4, 1.6, 1.8, 2.0x multiplier
    effect: (level: number) => 1.0 + level * 0.2,
  },
];

/**
 * Get upgrade by ID
 */
export function getUpgradeById(id: string): Upgrade | undefined {
  return UPGRADES.find((u) => u.id === id);
}
