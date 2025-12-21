/**
 * Elemental Styles Configuration - "Spirit of the Resonance"
 * 
 * This file defines the visual and physics behavior for each Pokemon element type.
 * Every element has unique particle motion, colors, and connector styles.
 */

// Particle type determines motion behavior
export type ParticleType = 'ember' | 'spark' | 'bubble' | 'leaf' | 'void' | 'dust' | 'crystal' | 'shadow' | 'wind' | 'rock' | 'psychic' | 'fairy' | 'venom' | 'steel';

// Connector style determines how the line between orbs is drawn
export type ConnectorStyle = 'plasma' | 'bolt' | 'tube' | 'wave' | 'solid' | 'ice' | 'shadow' | 'glow';

export interface ElementalConfig {
    color: string;           // Primary Neon Color
    glowColor: string;       // Aura Color (rgba)
    secondaryColor: string;  // Secondary accent
    contrastColor: string;   // Guaranteed visible outline color (white or black)
    darkVariant?: string;    // Darker shade for gradient effects
    lightVariant?: string;   // Lighter shade for highlights
    particleType: ParticleType;
    connectorStyle: ConnectorStyle;
    physics: {
        gravity: number;       // Vertical pull (Negative = floats up)
        speedX: number;        // HORIZONTAL SPEED (Always negative for left flow!)
        spread: number;        // Spread angle
        lifeSpan: number;      // Life decay rate
        sizeRange: [number, number]; // Particle size [min, max]
        convergence: number;   // Merge force toward center (0 = straight, 1 = strong merge)
    };
}

export const ELEMENTAL_STYLES: Record<string, ElementalConfig> = {
    // 🔥 FIRE: Rising embers flowing left and up
    fire: {
        color: '#FF4500',
        glowColor: 'rgba(255, 69, 0, 0.6)',
        secondaryColor: '#FF8C00',
        contrastColor: '#FFFFFF',  // White outline on orange/red
        particleType: 'ember',
        connectorStyle: 'plasma',
        physics: { gravity: -0.02, speedX: -4.5, spread: 0.5, lifeSpan: 0.03, sizeRange: [2, 5], convergence: 0.5 }
    },

    // ⚡ ELECTRIC: Fast zigzag sparks
    electric: {
        color: '#FFD700',
        glowColor: 'rgba(255, 215, 0, 0.8)',
        secondaryColor: '#FFFF00',
        contrastColor: '#000000',  // Black outline on yellow (light color)
        particleType: 'spark',
        connectorStyle: 'bolt',
        physics: { gravity: 0, speedX: -10.0, spread: 3.0, lifeSpan: 0.08, sizeRange: [1, 3], convergence: 0.2 }
    },

    // 💧 WATER: Fluid bubbles
    water: {
        color: '#00BFFF',
        glowColor: 'rgba(0, 191, 255, 0.6)',
        secondaryColor: '#1E90FF',
        contrastColor: '#FFFFFF',  // White outline on blue
        darkVariant: '#005f99',    // Darker blue
        lightVariant: '#4dc3ff',   // Lighter blue
        particleType: 'bubble',
        connectorStyle: 'tube',    // Reverted to 'tube' (valid type)
        physics: { gravity: -0.015, speedX: -4.0, spread: 0.5, lifeSpan: 0.02, sizeRange: [3, 8], convergence: 0.1 }
    },

    // 🔮 GHOST: Slow lingering void particles
    ghost: {
        color: '#9932CC',
        glowColor: 'rgba(153, 50, 204, 0.7)',
        secondaryColor: '#8B008B',
        contrastColor: '#FFFFFF',  // White outline on purple
        particleType: 'void',
        connectorStyle: 'wave',
        physics: { gravity: -0.005, speedX: -1.5, spread: 0.1, lifeSpan: 0.01, sizeRange: [4, 8], convergence: 0.6 }
    },

    // 🌿 GRASS: Wind-drifting leaves
    grass: {
        color: '#32CD32',
        glowColor: 'rgba(50, 205, 50, 0.5)',
        secondaryColor: '#228B22',
        contrastColor: '#FFFFFF',  // White outline on green
        particleType: 'leaf',
        connectorStyle: 'solid',
        physics: { gravity: 0.02, speedX: -3.0, spread: 1.0, lifeSpan: 0.02, sizeRange: [3, 5], convergence: 0.4 }
    },

    // ❄️ ICE: Crystalline shards
    ice: {
        color: '#00FFFF',
        glowColor: 'rgba(0, 255, 255, 0.6)',
        secondaryColor: '#ADD8E6',
        contrastColor: '#000000',  // Black outline on cyan (light color)
        particleType: 'crystal',
        connectorStyle: 'ice',
        physics: { gravity: 0.01, speedX: -3.5, spread: 0.4, lifeSpan: 0.025, sizeRange: [2, 4], convergence: 0.35 }
    },

    // 🌙 DARK: Shadow wisps
    dark: {
        color: '#4B0082',
        glowColor: 'rgba(75, 0, 130, 0.6)',
        secondaryColor: '#2F004F',
        contrastColor: '#FFFFFF',  // White outline on dark purple
        particleType: 'shadow',
        connectorStyle: 'shadow',
        physics: { gravity: -0.02, speedX: -2.0, spread: 0.3, lifeSpan: 0.018, sizeRange: [3, 6], convergence: 0.5 }
    },

    // 🧠 PSYCHIC: Floating orbs
    psychic: {
        color: '#FF1493',
        glowColor: 'rgba(255, 20, 147, 0.6)',
        secondaryColor: '#DA70D6',
        contrastColor: '#FFFFFF',  // White outline on pink
        particleType: 'psychic',
        connectorStyle: 'wave',
        physics: { gravity: -0.015, speedX: -2.5, spread: 0.5, lifeSpan: 0.02, sizeRange: [2, 5], convergence: 0.45 }
    },

    // 🪨 ROCK: Falling debris
    rock: {
        color: '#A0522D',
        glowColor: 'rgba(160, 82, 45, 0.4)',
        secondaryColor: '#8B4513',
        contrastColor: '#FFFFFF',  // White outline on brown
        particleType: 'rock',
        connectorStyle: 'solid',
        physics: { gravity: 0.08, speedX: -3.0, spread: 0.6, lifeSpan: 0.035, sizeRange: [3, 6], convergence: 0.3 }
    },

    // 🌪️ FLYING: Wind currents
    flying: {
        color: '#87CEEB',
        glowColor: 'rgba(135, 206, 235, 0.4)',
        secondaryColor: '#B0E0E6',
        contrastColor: '#000000',  // Black outline on light blue
        particleType: 'wind',
        connectorStyle: 'wave',
        physics: { gravity: -0.03, speedX: -5.0, spread: 1.2, lifeSpan: 0.04, sizeRange: [2, 4], convergence: 0.25 }
    },

    // ☠️ POISON: Toxic bubbles
    poison: {
        color: '#9400D3',
        glowColor: 'rgba(148, 0, 211, 0.5)',
        secondaryColor: '#8B008B',
        contrastColor: '#FFFFFF',  // White outline on purple
        particleType: 'venom',
        connectorStyle: 'tube',
        physics: { gravity: -0.02, speedX: -2.5, spread: 0.4, lifeSpan: 0.02, sizeRange: [3, 5], convergence: 0.4 }
    },

    // 🌍 GROUND: Dust clouds
    ground: {
        color: '#DEB887',
        glowColor: 'rgba(222, 184, 135, 0.4)',
        secondaryColor: '#D2691E',
        contrastColor: '#000000',  // Black outline on beige (light color)
        particleType: 'dust',
        connectorStyle: 'solid',
        physics: { gravity: 0.04, speedX: -2.0, spread: 0.8, lifeSpan: 0.025, sizeRange: [2, 5], convergence: 0.35 }
    },

    // 🐲 DRAGON: Mystical flames
    dragon: {
        color: '#7038F8',
        glowColor: 'rgba(112, 56, 248, 0.6)',
        secondaryColor: '#4C0099',
        contrastColor: '#FFFFFF',  // White outline on purple
        particleType: 'ember',
        connectorStyle: 'plasma',
        physics: { gravity: -0.04, speedX: -4.5, spread: 0.6, lifeSpan: 0.03, sizeRange: [3, 6], convergence: 0.5 }
    },

    // ⚔️ FIGHTING: Impact bursts
    fighting: {
        color: '#C22E28',
        glowColor: 'rgba(194, 46, 40, 0.5)',
        secondaryColor: '#7D1F18',
        contrastColor: '#FFFFFF',  // White outline on red
        particleType: 'ember',
        connectorStyle: 'solid',
        physics: { gravity: 0.02, speedX: -5.0, spread: 0.8, lifeSpan: 0.04, sizeRange: [2, 4], convergence: 0.3 }
    },

    // 🦗 BUG: Glittering particles
    bug: {
        color: '#A8B820',
        glowColor: 'rgba(168, 184, 32, 0.4)',
        secondaryColor: '#6D7815',
        contrastColor: '#000000',  // Black outline on yellow-green
        particleType: 'leaf',
        connectorStyle: 'solid',
        physics: { gravity: 0.01, speedX: -3.5, spread: 0.7, lifeSpan: 0.028, sizeRange: [1, 3], convergence: 0.35 }
    },

    // 🧚 FAIRY: Sparkle dust
    fairy: {
        color: '#EE99AC',
        glowColor: 'rgba(238, 153, 172, 0.6)',
        secondaryColor: '#FFB6C1',
        contrastColor: '#000000',  // Black outline on pink (light color)
        particleType: 'fairy',
        connectorStyle: 'glow',
        physics: { gravity: -0.015, speedX: -2.5, spread: 0.6, lifeSpan: 0.02, sizeRange: [2, 4], convergence: 0.45 }
    },

    // 🔩 STEEL: Metallic shards
    steel: {
        color: '#B8B8D0',
        glowColor: 'rgba(184, 184, 208, 0.4)',
        secondaryColor: '#7A7A9E',
        contrastColor: '#000000',  // Black outline on light gray
        particleType: 'steel',
        connectorStyle: 'solid',
        physics: { gravity: 0.03, speedX: -4.0, spread: 0.3, lifeSpan: 0.035, sizeRange: [2, 4], convergence: 0.3 }
    },

    // 🔮 Default/Normal
    normal: {
        color: '#A8A878',
        glowColor: 'rgba(168, 168, 120, 0.3)',
        secondaryColor: '#C6C6A7',
        contrastColor: '#000000',  // Black outline on tan (light color)
        particleType: 'dust',
        connectorStyle: 'solid',
        physics: { gravity: 0, speedX: -3.0, spread: 0.5, lifeSpan: 0.02, sizeRange: [2, 4], convergence: 0.4 }
    }
};

/**
 * Gets elemental config for a Pokemon type, with fallback
 */
export function getElementalConfig(type: string): ElementalConfig {
    const normalizedType = type.toLowerCase();
    return ELEMENTAL_STYLES[normalizedType] || ELEMENTAL_STYLES.normal;
}

/**
 * Gets blended config for dual-type Pokemon
 */
export function getDualTypeConfig(type1: string, type2?: string): ElementalConfig {
    const config1 = getElementalConfig(type1);
    if (!type2) return config1;

    const config2 = getElementalConfig(type2);

    // Use primary type's main properties, blend colors
    return {
        ...config1,
        secondaryColor: config2.color,
    };
}
