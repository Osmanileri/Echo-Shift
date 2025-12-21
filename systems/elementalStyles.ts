/**
 * Elemental Styles System - Spirit of the Resonance
 * 
 * Defines visual styles for each Pokemon type including:
 * - Primary and glow colors
 * - Connector styles (plasma, bolt, tube, wave)
 * - Dual-type synergy support
 */

// Connector style types
export type ConnectorStyle = 'plasma' | 'bolt' | 'tube' | 'wave' | 'standard';

// Elemental style configuration
export interface ElementalStyle {
    color: string;           // Primary element color
    glowColor: string;       // Glow/aura color (with alpha)
    secondaryColor: string;  // Secondary accent color
    connectorStyle: ConnectorStyle;
    particleSpeed: number;   // Base particle speed multiplier
    particleGravity: number; // Particle gravity (-1 to 1, negative = upward)
}

/**
 * Complete elemental styles for all Pokemon types
 * Each type has unique visual characteristics
 */
export const ELEMENTAL_STYLES: Record<string, ElementalStyle> = {
    // Fire - Orange/red plasma with rising embers
    fire: {
        color: '#FF4500',
        glowColor: 'rgba(255, 69, 0, 0.6)',
        secondaryColor: '#FFD700',
        connectorStyle: 'plasma',
        particleSpeed: 2.0,
        particleGravity: -0.05, // Embers rise
    },

    // Electric - Yellow lightning bolts
    electric: {
        color: '#FFD700',
        glowColor: 'rgba(255, 215, 0, 0.8)',
        secondaryColor: '#FFFFFF',
        connectorStyle: 'bolt',
        particleSpeed: 5.0,
        particleGravity: 0, // Sparks fly in all directions
    },

    // Water - Blue flowing tube
    water: {
        color: '#00BFFF',
        glowColor: 'rgba(0, 191, 255, 0.5)',
        secondaryColor: '#87CEEB',
        connectorStyle: 'tube',
        particleSpeed: 1.5,
        particleGravity: 0.03, // Droplets fall slightly
    },

    // Grass - Green with leaf particles
    grass: {
        color: '#32CD32',
        glowColor: 'rgba(50, 205, 50, 0.5)',
        secondaryColor: '#90EE90',
        connectorStyle: 'wave',
        particleSpeed: 1.5,
        particleGravity: 0.02, // Leaves float down gently
    },

    // Ghost - Purple ethereal wave
    ghost: {
        color: '#9932CC',
        glowColor: 'rgba(153, 50, 204, 0.7)',
        secondaryColor: '#BA55D3',
        connectorStyle: 'wave',
        particleSpeed: 0.8,
        particleGravity: -0.02, // Wisps rise slowly
    },

    // Psychic - Pink pulsing energy
    psychic: {
        color: '#F85888',
        glowColor: 'rgba(248, 88, 136, 0.6)',
        secondaryColor: '#FF69B4',
        connectorStyle: 'wave',
        particleSpeed: 1.2,
        particleGravity: 0, // Particles orbit
    },

    // Ice - Cyan crystalline
    ice: {
        color: '#87CEEB',
        glowColor: 'rgba(135, 206, 235, 0.6)',
        secondaryColor: '#E0FFFF',
        connectorStyle: 'tube',
        particleSpeed: 1.0,
        particleGravity: 0.04, // Ice crystals fall
    },

    // Dragon - Purple/indigo energy
    dragon: {
        color: '#7038F8',
        glowColor: 'rgba(112, 56, 248, 0.7)',
        secondaryColor: '#9370DB',
        connectorStyle: 'plasma',
        particleSpeed: 3.0,
        particleGravity: -0.03,
    },

    // Flying - Light blue/white
    flying: {
        color: '#A890F0',
        glowColor: 'rgba(168, 144, 240, 0.5)',
        secondaryColor: '#FFFFFF',
        connectorStyle: 'wave',
        particleSpeed: 2.5,
        particleGravity: -0.04, // Feathers float up
    },

    // Fighting - Red/orange power
    fighting: {
        color: '#C03028',
        glowColor: 'rgba(192, 48, 40, 0.6)',
        secondaryColor: '#FF6347',
        connectorStyle: 'plasma',
        particleSpeed: 3.5,
        particleGravity: 0,
    },

    // Poison - Purple toxic
    poison: {
        color: '#A040A0',
        glowColor: 'rgba(160, 64, 160, 0.6)',
        secondaryColor: '#DA70D6',
        connectorStyle: 'tube',
        particleSpeed: 1.0,
        particleGravity: -0.01, // Toxins rise
    },

    // Ground - Brown earth
    ground: {
        color: '#E0C068',
        glowColor: 'rgba(224, 192, 104, 0.5)',
        secondaryColor: '#DEB887',
        connectorStyle: 'standard',
        particleSpeed: 2.0,
        particleGravity: 0.06, // Dust falls
    },

    // Rock - Gray stone
    rock: {
        color: '#B8A038',
        glowColor: 'rgba(184, 160, 56, 0.5)',
        secondaryColor: '#A0A0A0',
        connectorStyle: 'standard',
        particleSpeed: 1.5,
        particleGravity: 0.08, // Rocks fall fast
    },

    // Bug - Green/yellow
    bug: {
        color: '#A8B820',
        glowColor: 'rgba(168, 184, 32, 0.5)',
        secondaryColor: '#C6D16E',
        connectorStyle: 'wave',
        particleSpeed: 2.0,
        particleGravity: 0,
    },

    // Dark - Black/purple
    dark: {
        color: '#705848',
        glowColor: 'rgba(112, 88, 72, 0.6)',
        secondaryColor: '#2F4F4F',
        connectorStyle: 'wave',
        particleSpeed: 1.5,
        particleGravity: 0.01,
    },

    // Steel - Silver metallic
    steel: {
        color: '#B8B8D0',
        glowColor: 'rgba(184, 184, 208, 0.5)',
        secondaryColor: '#C0C0C0',
        connectorStyle: 'standard',
        particleSpeed: 2.0,
        particleGravity: 0.05,
    },

    // Fairy - Pink magical
    fairy: {
        color: '#EE99AC',
        glowColor: 'rgba(238, 153, 172, 0.6)',
        secondaryColor: '#FFB6C1',
        connectorStyle: 'wave',
        particleSpeed: 1.2,
        particleGravity: -0.02, // Sparkles float up
    },

    // Normal - White/gray
    normal: {
        color: '#A8A878',
        glowColor: 'rgba(168, 168, 120, 0.4)',
        secondaryColor: '#D3D3D3',
        connectorStyle: 'standard',
        particleSpeed: 1.0,
        particleGravity: 0.02,
    },
};

/**
 * Get elemental style for a given type
 * Falls back to 'normal' if type not found
 */
export const getElementalStyle = (type: string): ElementalStyle => {
    return ELEMENTAL_STYLES[type] || ELEMENTAL_STYLES.normal;
};

/**
 * Dual-Type Synergy Configuration
 * For dual-type Pokemon, determines how visual effects are distributed
 */
export interface DualTypeSynergy {
    primaryType: string;      // types[0] - White orb effects
    secondaryType: string;    // types[1] - Black orb effects
    primaryStyle: ElementalStyle;
    secondaryStyle: ElementalStyle;
    blendedConnectorColor: string; // Gradient blend for connector
}

/**
 * Create dual-type synergy from Pokemon types array
 * White orb uses primary type, black orb uses secondary type
 */
export const createDualTypeSynergy = (types: string[]): DualTypeSynergy => {
    const primaryType = types[0] || 'normal';
    const secondaryType = types[1] || primaryType; // Single types use same for both

    const primaryStyle = getElementalStyle(primaryType);
    const secondaryStyle = getElementalStyle(secondaryType);

    return {
        primaryType,
        secondaryType,
        primaryStyle,
        secondaryStyle,
        blendedConnectorColor: primaryStyle.color, // Use primary for connector
    };
};

/**
 * Check if a Pokemon has dual types
 */
export const isDualType = (types: string[]): boolean => {
    return types.length >= 2 && types[0] !== types[1];
};

/**
 * Get particle emission colors for dual-type support
 * Returns array of colors to randomly emit from
 */
export const getDualTypeParticleColors = (types: string[]): string[] => {
    const synergy = createDualTypeSynergy(types);

    if (isDualType(types)) {
        return [
            synergy.primaryStyle.color,
            synergy.primaryStyle.secondaryColor,
            synergy.secondaryStyle.color,
            synergy.secondaryStyle.secondaryColor,
        ];
    }

    return [
        synergy.primaryStyle.color,
        synergy.primaryStyle.secondaryColor,
    ];
};
