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
 * Tema renk türetme fonksiyonu:
 * - topOrb = bottomBg (zıt alanda görünür)
 * - bottomOrb = topBg (zıt alanda görünür)
 * - topObstacle = bottomBg (orb ile aynı)
 * - bottomObstacle = topBg (orb ile aynı)
 */
const deriveThemeColors = (topBg: string, bottomBg: string): ThemeColors => ({
  topBg,
  bottomBg,
  topOrb: bottomBg,
  bottomOrb: topBg,
  connector: '#888888',
  accent: '#00F0FF',
  accentSecondary: '#FF2A2A',
  topObstacle: bottomBg,
  bottomObstacle: topBg,
});

/**
 * Default/Classic Theme
 * Requirements: 5.1, 5.2, 5.3
 */
const CLASSIC_THEME: Theme = {
  id: 'default',
  name: 'Classic',
  price: 0,
  colors: deriveThemeColors('#000000', '#FFFFFF'),
};

/**
 * Cyberpunk Theme
 * Requirements: 5.4 - neon grid lines and glowing edges
 * Dark purple top, neon magenta bottom for contrast
 */
const CYBERPUNK_THEME: Theme = {
  id: 'cyberpunk',
  name: 'Cyberpunk',
  price: 500,
  colors: deriveThemeColors('#0D0221', '#FF00FF'),
  effects: {
    gridLines: true,
    glowEdges: true,
  },
};

/**
 * Retro 8-bit Theme
 * Requirements: 5.5 - pixelated edges and 8-bit color palette
 * Dark blue-gray top, light gray bottom
 */
const RETRO_THEME: Theme = {
  id: 'retro',
  name: 'Retro 8-bit',
  price: 400,
  colors: deriveThemeColors('#2C3E50', '#ECF0F1'),
  effects: {
    pixelated: true,
  },
};

/**
 * Zen Garden Theme
 * Requirements: 5.6 - soft gradients and muted colors
 * Dark forest green top, beige bottom
 */
const ZEN_THEME: Theme = {
  id: 'zen',
  name: 'Zen Garden',
  price: 300,
  colors: deriveThemeColors('#2D4A3E', '#F5F5DC'),
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
