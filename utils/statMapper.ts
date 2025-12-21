/**
 * Stat Mapper - Spirit of the Resonance
 * Transforms Pokemon stats into game configuration modifiers
 * Maintains game balance while providing meaningful stat differences
 */

import { SpiritCharacter } from "../api/pokeApi";
import { INITIAL_CONFIG } from "../constants";

// Game modifiers derived from Pokemon stats
export interface SpiritModifiers {
  // Speed affects game flow speed (higher = faster gameplay)
  speedMultiplier: number;

  // Defense affects shield duration (higher = longer protection)
  shieldTimeBonus: number;

  // Attack affects shard collection value (higher = more gems)
  shardValueMultiplier: number;

  // Speed also affects dash cooldown (higher = faster recharge)
  dashCooldownReduction: number;

  // HP affects error tolerance / second chances
  hpBonus: number;

  // Weight affects Y-axis inertia (heavier = slower vertical movement)
  inertiaMultiplier: number;

  // Special Attack affects magnet radius
  magnetRadiusMultiplier: number;
}

// Base reference values for calculations
const BASE_CONFIG = {
  speed: INITIAL_CONFIG.baseSpeed,
  shieldTime: 2000, // 2 seconds base
  shardValue: 10,
  dashCooldown: 3000, // 3 seconds base
  magnetRadius: 50,
};

/**
 * Calculate game modifiers from Pokemon stats
 * ENHANCED: More meaningful differences between characters
 * Players should feel the uniqueness of each Pokemon
 *
 * @param char - Spirit character (null returns base config)
 * @returns Calculated modifiers
 */
export const calculateCharacterModifiers = (
  char: SpiritCharacter | null
): SpiritModifiers => {
  // No character = default values (all multipliers at 1x, no bonuses)
  if (!char) {
    return {
      speedMultiplier: 1,
      shieldTimeBonus: 0,
      shardValueMultiplier: 1,
      dashCooldownReduction: 0,
      hpBonus: 0,
      inertiaMultiplier: 1,
      magnetRadiusMultiplier: 1,
    };
  }

  const { stats, weight, bst, tier } = char;

  // ENHANCED SPEED MULTIPLIER: More dramatic differences
  // Speed stat becomes much more impactful for gameplay feel
  // Range: 0.7x (slow) to 1.4x (very fast)
  const speedMultiplier = 1 + (stats.speed - 50) / 300;

  // ENHANCED DEFENSE: Better scaling for defensive characters
  // Defense becomes more valuable for survival
  const shieldTimeBonus = stats.defense * 15;

  // ENHANCED ATTACK: More rewarding for offensive characters
  // Attack stat significantly increases shard collection value
  // Range: 1.0x to 2.2x
  const shardValueMultiplier = 1 + (stats.attack - 50) / 150;

  // ENHANCED SPEED-TO-DASH: Faster characters get better dash mobility
  const dashCooldownReduction = Math.min(stats.speed * 8, 1000);

  // ENHANCED HP: More meaningful health bonuses
  const hpBonus = Math.floor(stats.hp / 30);

  // ENHANCED WEIGHT: More pronounced movement differences
  // Light characters feel nimble, heavy characters feel weighty
  const inertiaMultiplier = 0.7 + weight / 150;

  // ENHANCED SPECIAL ATTACK: Better magnet scaling
  const magnetRadiusMultiplier = 1 + (stats.specialAttack - 50) / 150;

  // TIER BONUS: Legendary and rare Pokemon get extra benefits
  const tierBonus = tier === "legendary" ? 1.3 : tier === "rare" ? 1.15 : 1.0;

  return {
    speedMultiplier: Math.max(0.7, Math.min(1.4, speedMultiplier * tierBonus)),
    shieldTimeBonus: Math.max(0, Math.min(4000, shieldTimeBonus * tierBonus)),
    shardValueMultiplier: Math.max(
      1.0,
      Math.min(2.2, shardValueMultiplier * tierBonus)
    ),
    dashCooldownReduction: Math.max(0, dashCooldownReduction * tierBonus),
    hpBonus: Math.max(0, hpBonus * tierBonus),
    inertiaMultiplier: Math.max(0.7, Math.min(1.5, inertiaMultiplier)),
    magnetRadiusMultiplier: Math.max(
      1.0,
      Math.min(2.2, magnetRadiusMultiplier * tierBonus)
    ),
  };
};

/**
 * Apply modifiers to base game config
 * Returns a merged config with spirit bonuses applied
 */
export const applyCharacterModifiers = (
  baseSpeed: number,
  modifiers: SpiritModifiers
) => {
  return {
    effectiveSpeed: baseSpeed * modifiers.speedMultiplier,
    effectiveShieldTime: BASE_CONFIG.shieldTime + modifiers.shieldTimeBonus,
    effectiveShardValue: Math.floor(
      BASE_CONFIG.shardValue * modifiers.shardValueMultiplier
    ),
    effectiveDashCooldown: Math.max(
      1000,
      BASE_CONFIG.dashCooldown - modifiers.dashCooldownReduction
    ),
    effectiveMagnetRadius: Math.floor(
      BASE_CONFIG.magnetRadius * modifiers.magnetRadiusMultiplier
    ),
  };
};

/**
 * Get a human-readable summary of character bonuses
 * Used in shop UI to display what each character provides
 */
export const getModifierSummary = (modifiers: SpiritModifiers): string[] => {
  const summary: string[] = [];

  if (modifiers.speedMultiplier !== 1) {
    const percent = Math.round((modifiers.speedMultiplier - 1) * 100);
    summary.push(`${percent > 0 ? "+" : ""}${percent}% Hız`);
  }

  if (modifiers.shieldTimeBonus > 0) {
    summary.push(`+${(modifiers.shieldTimeBonus / 1000).toFixed(1)}s Kalkan`);
  }

  if (modifiers.shardValueMultiplier > 1) {
    const percent = Math.round((modifiers.shardValueMultiplier - 1) * 100);
    summary.push(`+${percent}% Elmas`);
  }

  if (modifiers.dashCooldownReduction > 0) {
    summary.push(
      `-${(modifiers.dashCooldownReduction / 1000).toFixed(1)}s Dash`
    );
  }

  if (modifiers.hpBonus > 0) {
    summary.push(`+${modifiers.hpBonus} HP`);
  }

  if (modifiers.magnetRadiusMultiplier > 1) {
    const percent = Math.round((modifiers.magnetRadiusMultiplier - 1) * 100);
    summary.push(`+${percent}% Mıknatıs`);
  }

  return summary;
};

/**
 * GAME BALANCE CHECK: Ensures character modifiers don't break game difficulty
 * Legendary and high-tier Pokemon should have balanced drawbacks
 */
const validateCharacterBalance = (modifiers: SpiritModifiers): boolean => {
  // Extreme speed multipliers make game unplayable
  if (modifiers.speedMultiplier > 1.3) {
    console.warn(
      `[BALANCE] Speed multiplier too high: ${modifiers.speedMultiplier.toFixed(
        2
      )}x`
    );
    return false;
  }

  // Extreme shard value multipliers break economy
  if (modifiers.shardValueMultiplier > 2.0) {
    console.warn(
      `[BALANCE] Shard multiplier too high: ${modifiers.shardValueMultiplier.toFixed(
        2
      )}x`
    );
    return false;
  }

  // Combined extreme values are problematic
  if (modifiers.speedMultiplier > 1.2 && modifiers.shardValueMultiplier > 1.5) {
    console.warn(
      `[BALANCE] Combined stats too high: speed=${modifiers.speedMultiplier.toFixed(
        2
      )}x, shards=${modifiers.shardValueMultiplier.toFixed(2)}x`
    );
    return false;
  }

  return true;
};
