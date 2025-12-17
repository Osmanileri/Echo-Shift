/**
 * Upgrade System
 * Requirements: 6.1, 6.2, 6.3, 6.5
 *
 * Provides functions for managing permanent upgrades:
 * - Head Start: Starting score bonus
 * - Echo Amplifier: Score multiplier
 * - Time Warp: Slow motion uses per game
 */

import {
  UPGRADES,
  Upgrade,
  getUpgradeById,
  getUpgradeCost as getUpgradeCostFromData,
  getUpgradeEffect as getUpgradeEffectFromData,
} from "../data/upgrades";
import { useGameStore } from "../store/gameStore";

/**
 * Get the cost for purchasing the next level of an upgrade
 * Requirements: 6.5
 */
export function getUpgradeCost(
  upgradeId: string,
  currentLevel: number
): number {
  const upgrade = getUpgradeById(upgradeId);
  if (!upgrade) return Infinity;
  return getUpgradeCostFromData(upgrade, currentLevel);
}

/**
 * Get the effect value for a specific upgrade at a given level
 * Requirements: 6.1, 6.2, 6.3
 */
export function getUpgradeEffect(upgradeId: string, level: number): number {
  const upgrade = getUpgradeById(upgradeId);
  if (!upgrade) return upgradeId === "score-multiplier" ? 1 : 0;
  return getUpgradeEffectFromData(upgrade, level);
}

/**
 * Check if an upgrade can be purchased
 * Requirements: 6.5
 */
export function canPurchaseUpgrade(
  upgradeId: string,
  currentLevel: number,
  balance: number
): boolean {
  const upgrade = getUpgradeById(upgradeId);
  if (!upgrade) return false;
  if (currentLevel >= upgrade.maxLevel) return false;

  const cost = getUpgradeCost(upgradeId, currentLevel);
  return balance >= cost;
}

/**
 * Purchase an upgrade (increments level by 1)
 * Returns true if purchase was successful
 * Requirements: 6.5
 */
export function purchaseUpgrade(upgradeId: string): boolean {
  const store = useGameStore.getState();
  const currentLevel = store.getUpgradeLevel(upgradeId);
  const cost = getUpgradeCost(upgradeId, currentLevel);

  if (!canPurchaseUpgrade(upgradeId, currentLevel, store.echoShards)) {
    return false;
  }

  return store.purchaseUpgrade(upgradeId, cost);
}

/**
 * Get all upgrade effects for the current player
 * Returns an object with all active upgrade effects
 * Requirements: 6.1, 6.2, 6.3
 */
export interface UpgradeEffects {
  startingScore: number; // Requirements 6.1
  scoreMultiplier: number; // Requirements 6.2
  slowMotionUses: number; // Requirements 6.3
  magnetLevel: number; // Phase 2
  magnetRadiusFactor: number; // Phase 2 (0..1 of min canvas dim)
  shieldCharges: number; // Phase 2
  // Phase Dash
  dashDuration: number; // ms (3000-5000)
  dashRechargeMultiplier: number; // 1.0-2.0x
}

export function getActiveUpgradeEffects(): UpgradeEffects {
  const store = useGameStore.getState();

  const startingScoreLevel = store.getUpgradeLevel("starting-score");
  const magnetLevel = store.getUpgradeLevel("magnet");
  const shieldLevel = store.getUpgradeLevel("shield");
  const scoreMultiplierLevel = store.getUpgradeLevel("score-multiplier");
  const slowMotionLevel = store.getUpgradeLevel("slow-motion");
  // Phase Dash upgrades
  const dashDurationLevel = store.getUpgradeLevel("dash-duration");
  const dashRechargeLevel = store.getUpgradeLevel("dash-recharge");

  return {
    startingScore: getUpgradeEffect("starting-score", startingScoreLevel),
    scoreMultiplier: getUpgradeEffect("score-multiplier", scoreMultiplierLevel),
    slowMotionUses: getUpgradeEffect("slow-motion", slowMotionLevel),
    magnetLevel,
    magnetRadiusFactor: getUpgradeEffect("magnet", magnetLevel),
    shieldCharges: getUpgradeEffect("shield", shieldLevel),
    // Phase Dash - return base values if not upgraded
    dashDuration: dashDurationLevel > 0 ? getUpgradeEffect("dash-duration", dashDurationLevel) : 3000,
    dashRechargeMultiplier: dashRechargeLevel > 0 ? getUpgradeEffect("dash-recharge", dashRechargeLevel) : 1.0,
  };
}

/**
 * Apply starting score upgrade effect
 * Returns the starting score for a new game
 * Requirements: 6.1
 */
export function applyStartingScore(): number {
  const effects = getActiveUpgradeEffects();
  return effects.startingScore;
}

/**
 * Apply score multiplier upgrade effect
 * Returns the multiplied score
 * Requirements: 6.2
 */
export function applyScoreMultiplier(baseScore: number): number {
  const effects = getActiveUpgradeEffects();
  return Math.floor(baseScore * effects.scoreMultiplier);
}

/**
 * Get the number of slow motion uses available for a game
 * Requirements: 6.3
 */
export function getSlowMotionUses(): number {
  const effects = getActiveUpgradeEffects();
  return effects.slowMotionUses;
}

/**
 * Get all upgrades with their current state
 */
export interface UpgradeState {
  upgrade: Upgrade;
  currentLevel: number;
  nextCost: number;
  currentEffect: number;
  nextEffect: number;
  isMaxed: boolean;
}

export function getAllUpgradeStates(): UpgradeState[] {
  const store = useGameStore.getState();

  return UPGRADES.map((upgrade) => {
    const currentLevel = store.getUpgradeLevel(upgrade.id);
    const isMaxed = currentLevel >= upgrade.maxLevel;

    return {
      upgrade,
      currentLevel,
      nextCost: isMaxed ? Infinity : getUpgradeCost(upgrade.id, currentLevel),
      currentEffect: getUpgradeEffect(upgrade.id, currentLevel),
      nextEffect: isMaxed
        ? getUpgradeEffect(upgrade.id, currentLevel)
        : getUpgradeEffect(upgrade.id, currentLevel + 1),
      isMaxed,
    };
  });
}
