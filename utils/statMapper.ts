/**
 * Stat Mapper - Spirit of the Resonance
 * Transforms Pokemon stats into game configuration modifiers
 * Maintains game balance while providing meaningful stat differences
 */

import { SpiritCharacter } from '../api/pokeApi';
import { INITIAL_CONFIG } from '../constants';

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
 * Uses percentage-based scaling to avoid overpowered characters
 * 
 * @param char - Spirit character (null returns base config)
 * @returns Calculated modifiers
 */
export const calculateCharacterModifiers = (char: SpiritCharacter | null): SpiritModifiers => {
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

    const { stats, weight } = char;

    // Speed: Each 50 stat points = +10% speed
    // Range: ~0.6x (slow Pokemon) to ~1.3x (fast Pokemon like Electrode at 150)
    const speedMultiplier = 1 + (stats.speed - 50) / 500;

    // Defense: Each point = +10ms shield duration
    // Range: +200ms (20 def) to +2000ms (200 def)
    const shieldTimeBonus = stats.defense * 10;

    // Attack: Each 50 points = +25% shard value
    // Range: ~1x (weak) to ~2x (strong attackers)
    const shardValueMultiplier = 1 + stats.attack / 200;

    // Speed: Faster Pokemon have shorter dash cooldown
    // Range: -250ms to -750ms (max 25% reduction)
    const dashCooldownReduction = Math.min(stats.speed * 5, 750);

    // HP: Bonus tolerance (not directly used but available)
    const hpBonus = Math.floor(stats.hp / 50);

    // Weight: Heavier = more inertia (slower vertical movement)
    // Range: 0.8x (light, nimble) to 1.4x (heavy, sluggish)
    const inertiaMultiplier = 0.8 + (weight / 200);

    // Special Attack: Affects magnet pull radius
    // Range: 1x to 1.75x
    const magnetRadiusMultiplier = 1 + stats.specialAttack / 200;

    return {
        speedMultiplier: Math.max(0.6, Math.min(1.5, speedMultiplier)),
        shieldTimeBonus: Math.max(0, Math.min(3000, shieldTimeBonus)),
        shardValueMultiplier: Math.max(1, Math.min(2.5, shardValueMultiplier)),
        dashCooldownReduction: Math.max(0, dashCooldownReduction),
        hpBonus: Math.max(0, hpBonus),
        inertiaMultiplier: Math.max(0.6, Math.min(1.6, inertiaMultiplier)),
        magnetRadiusMultiplier: Math.max(1, Math.min(2, magnetRadiusMultiplier)),
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
        effectiveShardValue: Math.floor(BASE_CONFIG.shardValue * modifiers.shardValueMultiplier),
        effectiveDashCooldown: Math.max(1000, BASE_CONFIG.dashCooldown - modifiers.dashCooldownReduction),
        effectiveMagnetRadius: Math.floor(BASE_CONFIG.magnetRadius * modifiers.magnetRadiusMultiplier),
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
        summary.push(`${percent > 0 ? '+' : ''}${percent}% Hız`);
    }

    if (modifiers.shieldTimeBonus > 0) {
        summary.push(`+${(modifiers.shieldTimeBonus / 1000).toFixed(1)}s Kalkan`);
    }

    if (modifiers.shardValueMultiplier > 1) {
        const percent = Math.round((modifiers.shardValueMultiplier - 1) * 100);
        summary.push(`+${percent}% Elmas`);
    }

    if (modifiers.dashCooldownReduction > 0) {
        summary.push(`-${(modifiers.dashCooldownReduction / 1000).toFixed(1)}s Dash`);
    }

    return summary;
};
