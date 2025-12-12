/**
 * Ball Skin Data and Interface Definitions
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

/**
 * Skin type enumeration
 * - solid: Single color orbs
 * - gradient: Gradient color orbs
 * - emoji: Emoji-based orbs
 */
export type SkinType = 'solid' | 'gradient' | 'emoji';

/**
 * Skin configuration based on type
 */
export interface SkinConfig {
  // For solid type
  topColor?: string;
  bottomColor?: string;
  // For gradient type
  gradient?: {
    start: string;
    end: string;
  };
  // For emoji type
  emoji?: string;
  // Optional glow effect for premium skins
  glowColor?: string;
  glowIntensity?: number;
}

/**
 * Ball Skin interface
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export interface BallSkin {
  id: string;
  name: string;
  price: number;
  type: SkinType;
  config: SkinConfig;
}

/**
 * Classic/Default Skin
 * Requirements: 3.3 - default skin renders classic black and white orbs
 */
const CLASSIC_SKIN: BallSkin = {
  id: 'default',
  name: 'Classic',
  price: 0,
  type: 'solid',
  config: {
    topColor: '#FFFFFF',
    bottomColor: '#000000',
  },
};


/**
 * Neon Blue Skin
 * Requirements: 3.2, 3.4 - gradient orb with glow effect
 */
const NEON_BLUE_SKIN: BallSkin = {
  id: 'neon-blue',
  name: 'Neon Blue',
  price: 100,
  type: 'gradient',
  config: {
    gradient: {
      start: '#00F0FF',
      end: '#0066FF',
    },
    glowColor: '#00F0FF',
    glowIntensity: 0.5,
  },
};

/**
 * Neon Pink Skin
 * Requirements: 3.2, 3.4 - gradient orb with glow effect
 */
const NEON_PINK_SKIN: BallSkin = {
  id: 'neon-pink',
  name: 'Neon Pink',
  price: 100,
  type: 'gradient',
  config: {
    gradient: {
      start: '#FF00FF',
      end: '#FF0066',
    },
    glowColor: '#FF00FF',
    glowIntensity: 0.5,
  },
};

/**
 * Fire Skin
 * Requirements: 3.2, 3.4 - gradient orb with intense glow
 */
const FIRE_SKIN: BallSkin = {
  id: 'fire',
  name: 'Fire',
  price: 200,
  type: 'gradient',
  config: {
    gradient: {
      start: '#FF6600',
      end: '#FF0000',
    },
    glowColor: '#FF4400',
    glowIntensity: 0.7,
  },
};

/**
 * Ice Skin
 * Requirements: 3.2, 3.4 - gradient orb with cool glow
 */
const ICE_SKIN: BallSkin = {
  id: 'ice',
  name: 'Ice',
  price: 200,
  type: 'gradient',
  config: {
    gradient: {
      start: '#00FFFF',
      end: '#0099FF',
    },
    glowColor: '#00CCFF',
    glowIntensity: 0.6,
  },
};

/**
 * Star Emoji Skin
 * Requirements: 3.2 - emoji-based orb
 */
const STAR_SKIN: BallSkin = {
  id: 'emoji-star',
  name: 'Star',
  price: 150,
  type: 'emoji',
  config: {
    emoji: '⭐',
  },
};

/**
 * Heart Emoji Skin
 * Requirements: 3.2 - emoji-based orb
 */
const HEART_SKIN: BallSkin = {
  id: 'emoji-heart',
  name: 'Heart',
  price: 150,
  type: 'emoji',
  config: {
    emoji: '❤️',
  },
};

/**
 * All available ball skins
 * 7 skins total: Classic, Neon Blue, Neon Pink, Fire, Ice, Star, Heart
 */
export const BALL_SKINS: BallSkin[] = [
  CLASSIC_SKIN,
  NEON_BLUE_SKIN,
  NEON_PINK_SKIN,
  FIRE_SKIN,
  ICE_SKIN,
  STAR_SKIN,
  HEART_SKIN,
];

/**
 * Get skin by ID
 * @param skinId - Skin identifier
 * @returns BallSkin object or default skin if not found
 */
export function getSkinById(skinId: string): BallSkin {
  return BALL_SKINS.find(skin => skin.id === skinId) || CLASSIC_SKIN;
}

/**
 * Get default skin
 * @returns Classic skin
 */
export function getDefaultSkin(): BallSkin {
  return CLASSIC_SKIN;
}
