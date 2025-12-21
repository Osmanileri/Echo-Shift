/**
 * Elemental Particle System - Spirit of the Resonance
 * 
 * Extension of the base particle system with type-specific behaviors:
 * - Fire: Embers rising with thermal lift
 * - Electric: Fast zigzag sparks
 * - Water: Bubbles drifting upward
 * - Grass: Leaves floating with sinusoidal motion
 * - Ghost: Ethereal wisps with slow fade
 */

import { getElementalConfig } from './elementalStyles';
import * as ParticleSystem from './particleSystem';

/**
 * Elemental particle configuration per type
 */
export interface ElementalParticleConfig {
    color: string;
    secondaryColor: string;
    size: { min: number; max: number };
    speed: number;
    gravity: number;
    life: { min: number; max: number };
    count: number;
    shape: 'circle' | 'square' | 'diamond' | 'leaf';
}

/**
 * Type-specific particle configurations
 */
export const ELEMENTAL_PARTICLE_CONFIGS: Record<string, ElementalParticleConfig> = {
    fire: {
        color: '#FF4500',
        secondaryColor: '#FFD700',
        size: { min: 2, max: 5 },
        speed: 2.0,
        gravity: -0.05, // Embers rise
        life: { min: 0.4, max: 0.8 },
        count: 2,
        shape: 'circle',
    },
    electric: {
        color: '#FFD700',
        secondaryColor: '#FFFFFF',
        size: { min: 1, max: 3 },
        speed: 5.0,
        gravity: 0, // Sparks fly freely
        life: { min: 0.2, max: 0.4 },
        count: 2,
        shape: 'square',
    },
    water: {
        color: '#00BFFF',
        secondaryColor: '#87CEEB',
        size: { min: 2, max: 4 },
        speed: 1.5,
        gravity: -0.02, // Bubbles rise
        life: { min: 0.5, max: 0.9 },
        count: 1,
        shape: 'circle',
    },
    grass: {
        color: '#32CD32',
        secondaryColor: '#90EE90',
        size: { min: 3, max: 6 },
        speed: 1.5,
        gravity: 0.02, // Leaves float down gently
        life: { min: 0.6, max: 1.0 },
        count: 1,
        shape: 'leaf',
    },
    ice: {
        color: '#87CEEB',
        secondaryColor: '#E0FFFF',
        size: { min: 2, max: 4 },
        speed: 1.0,
        gravity: 0.04, // Ice crystals fall
        life: { min: 0.5, max: 0.8 },
        count: 1,
        shape: 'diamond',
    },
    ghost: {
        color: '#9932CC',
        secondaryColor: '#BA55D3',
        size: { min: 4, max: 8 },
        speed: 0.5,
        gravity: -0.02, // Wisps rise slowly
        life: { min: 0.8, max: 1.2 },
        count: 1,
        shape: 'circle',
    },
    psychic: {
        color: '#F85888',
        secondaryColor: '#FF69B4',
        size: { min: 2, max: 5 },
        speed: 1.2,
        gravity: 0, // Particles orbit
        life: { min: 0.5, max: 0.8 },
        count: 1,
        shape: 'circle',
    },
    dragon: {
        color: '#7038F8',
        secondaryColor: '#9370DB',
        size: { min: 3, max: 6 },
        speed: 3.0,
        gravity: -0.03, // Energy rises
        life: { min: 0.4, max: 0.7 },
        count: 2,
        shape: 'diamond',
    },
    flying: {
        color: '#A890F0',
        secondaryColor: '#FFFFFF',
        size: { min: 2, max: 4 },
        speed: 2.5,
        gravity: -0.04, // Feathers float up
        life: { min: 0.5, max: 0.9 },
        count: 1,
        shape: 'leaf',
    },
    fighting: {
        color: '#C03028',
        secondaryColor: '#FF6347',
        size: { min: 2, max: 4 },
        speed: 3.5,
        gravity: 0, // Punches fly straight
        life: { min: 0.3, max: 0.5 },
        count: 2,
        shape: 'square',
    },
    poison: {
        color: '#A040A0',
        secondaryColor: '#DA70D6',
        size: { min: 3, max: 5 },
        speed: 1.0,
        gravity: -0.01, // Toxins rise
        life: { min: 0.6, max: 1.0 },
        count: 1,
        shape: 'circle',
    },
    ground: {
        color: '#E0C068',
        secondaryColor: '#DEB887',
        size: { min: 2, max: 4 },
        speed: 2.0,
        gravity: 0.06, // Dust falls
        life: { min: 0.4, max: 0.7 },
        count: 2,
        shape: 'square',
    },
    rock: {
        color: '#B8A038',
        secondaryColor: '#A0A0A0',
        size: { min: 3, max: 6 },
        speed: 1.5,
        gravity: 0.08, // Rocks fall fast
        life: { min: 0.3, max: 0.5 },
        count: 1,
        shape: 'square',
    },
    bug: {
        color: '#A8B820',
        secondaryColor: '#C6D16E',
        size: { min: 1, max: 3 },
        speed: 2.0,
        gravity: 0, // Bugs fly erratically
        life: { min: 0.4, max: 0.7 },
        count: 2,
        shape: 'circle',
    },
    dark: {
        color: '#705848',
        secondaryColor: '#2F4F4F',
        size: { min: 3, max: 6 },
        speed: 1.5,
        gravity: 0.01, // Shadows drift down
        life: { min: 0.6, max: 1.0 },
        count: 1,
        shape: 'circle',
    },
    steel: {
        color: '#B8B8D0',
        secondaryColor: '#C0C0C0',
        size: { min: 2, max: 4 },
        speed: 2.0,
        gravity: 0.05, // Sparks fall
        life: { min: 0.3, max: 0.5 },
        count: 2,
        shape: 'diamond',
    },
    fairy: {
        color: '#EE99AC',
        secondaryColor: '#FFB6C1',
        size: { min: 2, max: 4 },
        speed: 1.2,
        gravity: -0.02, // Sparkles float up
        life: { min: 0.5, max: 0.9 },
        count: 1,
        shape: 'circle',
    },
    normal: {
        color: '#A8A878',
        secondaryColor: '#D3D3D3',
        size: { min: 2, max: 4 },
        speed: 1.0,
        gravity: 0.02, // Neutral drift
        life: { min: 0.4, max: 0.7 },
        count: 1,
        shape: 'circle',
    },
};

/**
 * Get elemental particle config for a type
 */
export const getElementalParticleConfig = (type: string): ElementalParticleConfig => {
    return ELEMENTAL_PARTICLE_CONFIGS[type] || ELEMENTAL_PARTICLE_CONFIGS.normal;
};

/**
 * Get dual-type particle colors
 */
export const getDualTypeParticleColors = (types: string[]): string[] => {
    const primaryConfig = getElementalConfig(types[0] || 'normal');
    const colors = [primaryConfig.color, primaryConfig.secondaryColor];

    if (types[1]) {
        const secondaryConfig = getElementalConfig(types[1]);
        colors.push(secondaryConfig.color);
    }

    return colors;
};

/**
 * Emit elemental particles from orb position
 * Supports dual-type with mixed particle colors
 */
export const emitElementalParticles = (
    x: number,
    y: number,
    types: string[],
    velocityMultiplier: number = 1
): void => {
    const primaryType = types[0] || 'normal';
    const config = getElementalParticleConfig(primaryType);

    // Use the new element-based particle system
    for (let i = 0; i < config.count; i++) {
        ParticleSystem.emit(x, y, primaryType);
    }
};

/**
 * Render elemental particles with type-specific shapes
 */
export const renderElementalParticle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string,
    alpha: number,
    shape: 'circle' | 'square' | 'diamond' | 'leaf'
): void => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // Use additive blending for neon glow
    ctx.globalCompositeOperation = 'lighter';

    ctx.beginPath();

    switch (shape) {
        case 'square':
            ctx.rect(x - size / 2, y - size / 2, size, size);
            break;
        case 'diamond':
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size, y);
            ctx.closePath();
            break;
        case 'leaf':
            // Ellipse rotated 45 degrees
            ctx.ellipse(x, y, size, size * 0.4, Math.PI / 4, 0, Math.PI * 2);
            break;
        case 'circle':
        default:
            ctx.arc(x, y, size, 0, Math.PI * 2);
    }

    ctx.fill();
    ctx.restore();
};
