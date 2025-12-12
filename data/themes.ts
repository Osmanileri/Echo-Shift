/**
 * Theme Data and Interface Definitions
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

/**
 * Theme color configuration
 */
export interface ThemeColors {
  topBg: string;           // Top half background color
  bottomBg: string;        // Bottom half background color
  topOrb: string;          // Top orb color
  bottomOrb: string;       // Bottom orb color
  connector: string;       // Connector line color
  accent: string;          // Primary accent color (UI elements, effects)
  accentSecondary: string; // Secondary accent color
  topObstacle: string;     // Top obstacle color
  bottomObstacle: string;  // Bottom obstacle color
}

/**
 * Theme special effects configuration
 * Requirements: 5.4, 5.5, 5.6
 */
export interface ThemeEffects {
  gridLines?: boolean;     // Cyberpunk: neon grid lines
  glowEdges?: boolean;     // Cyberpunk: glowing edges
  pixelated?: boolean;     // Retro: pixelated edges and 8-bit style
  softGradients?: boolean; // Zen: soft gradients and muted colors
}

/**
 * Theme interface
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export interface Theme {
  id: string;
  name: string;
  price: number;
  colors: ThemeColors;
  effects?: ThemeEffects;
}

/**
 * Default/Classic Theme
 * Requirements: 5.1, 5.2, 5.3
 */
const CLASSIC_THEME: Theme = {
  id: 'default',
  name: 'Classic',
  price: 0,
  colors: {
    topBg: '#000000',
    bottomBg: '#FFFFFF',
    topOrb: '#FFFFFF',
    bottomOrb: '#000000',
    connector: '#888888',
    accent: '#00F0FF',
    accentSecondary: '#FF2A2A',
    topObstacle: '#FFFFFF',
    bottomObstacle: '#000000',
  },
};

/**
 * Cyberpunk Theme
 * Requirements: 5.4 - neon grid lines and glowing edges
 * Uses neon colors for orbs and obstacles for cyberpunk aesthetic
 */
const CYBERPUNK_THEME: Theme = {
  id: 'cyberpunk',
  name: 'Cyberpunk',
  price: 500,
  colors: {
    topBg: '#0D0221',
    bottomBg: '#1A0533',
    topOrb: '#00FFFF',      // Cyan neon
    bottomOrb: '#FF00FF',   // Magenta neon
    connector: '#FFD700',
    accent: '#00FF00',
    accentSecondary: '#FF0066',
    topObstacle: '#00FFFF',
    bottomObstacle: '#FF00FF',
  },
  effects: {
    gridLines: true,
    glowEdges: true,
  },
};

/**
 * Retro 8-bit Theme
 * Requirements: 5.5 - pixelated edges and 8-bit color palette
 * Orb colors match opposite background for contrast (same logic as default theme)
 */
const RETRO_THEME: Theme = {
  id: 'retro',
  name: 'Retro 8-bit',
  price: 400,
  colors: {
    topBg: '#2C3E50',
    bottomBg: '#ECF0F1',
    topOrb: '#ECF0F1',      // Same as bottomBg for contrast
    bottomOrb: '#2C3E50',   // Same as topBg for contrast
    connector: '#F39C12',
    accent: '#2ECC71',
    accentSecondary: '#9B59B6',
    topObstacle: '#ECF0F1', // Same as bottomBg for contrast
    bottomObstacle: '#2C3E50', // Same as topBg for contrast
  },
  effects: {
    pixelated: true,
  },
};

/**
 * Zen Garden Theme
 * Requirements: 5.6 - soft gradients and muted colors
 * Orb colors match opposite background for contrast (same logic as default theme)
 */
const ZEN_THEME: Theme = {
  id: 'zen',
  name: 'Zen Garden',
  price: 300,
  colors: {
    topBg: '#2D4A3E',
    bottomBg: '#F5F5DC',
    topOrb: '#F5F5DC',      // Same as bottomBg for contrast
    bottomOrb: '#2D4A3E',   // Same as topBg for contrast
    connector: '#D2B48C',
    accent: '#98FB98',
    accentSecondary: '#DEB887',
    topObstacle: '#F5F5DC', // Same as bottomBg for contrast
    bottomObstacle: '#2D4A3E', // Same as topBg for contrast
  },
  effects: {
    softGradients: true,
  },
};

/**
 * All available themes
 */
export const THEMES: Theme[] = [
  CLASSIC_THEME,
  CYBERPUNK_THEME,
  RETRO_THEME,
  ZEN_THEME,
];

/**
 * Get theme by ID
 * @param themeId - Theme identifier
 * @returns Theme object or default theme if not found
 */
export function getThemeById(themeId: string): Theme {
  return THEMES.find(theme => theme.id === themeId) || CLASSIC_THEME;
}

/**
 * Get default theme
 * @returns Classic theme
 */
export function getDefaultTheme(): Theme {
  return CLASSIC_THEME;
}
