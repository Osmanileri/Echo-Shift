/**
 * Theme System Implementation
 * Requirements: 5.1, 5.2, 5.3
 * 
 * Manages theme application, color retrieval, and effect detection.
 */

import {
  Theme,
  ThemeColors,
  ThemeEffects,
  getDefaultTheme,
  getThemeById,
} from "../data/themes";

/**
 * Theme System State
 */
interface ThemeSystemState {
  currentTheme: Theme;
  customThemeColors: ThemeColors | null;
}

/**
 * Theme System singleton state
 */
let themeState: ThemeSystemState = {
  currentTheme: getDefaultTheme(),
  customThemeColors: null,
};

/**
 * Apply a theme by ID
 * Requirements: 5.1, 5.2, 5.3
 * 
 * @param themeId - Theme identifier to apply
 * @returns The applied theme
 */
export function applyTheme(themeId: string): Theme {
  if (themeId === "custom" && themeState.customThemeColors) {
    const customTheme: Theme = {
      id: "custom",
      name: "Custom",
      price: 0,
      colors: themeState.customThemeColors,
    };
    themeState.currentTheme = customTheme;
    return customTheme;
  }

  const theme = getThemeById(themeId);
  themeState.currentTheme = theme;
  return theme;
}

export function setCustomThemeColors(colors: ThemeColors | null): void {
  themeState.customThemeColors = colors;
  // If currently using custom theme, re-apply to update runtime theme
  if (themeState.currentTheme.id === "custom" && colors) {
    applyTheme("custom");
  }
}

/**
 * Get the currently active theme
 * @returns Current theme object
 */
export function getCurrentTheme(): Theme {
  return themeState.currentTheme;
}

/**
 * Get a specific color from the current theme
 * Requirements: 5.1, 5.2, 5.3
 * 
 * @param colorKey - Key of the color to retrieve from ThemeColors
 * @returns Color value as hex string, or empty string if key not found
 */
export function getColor(colorKey: keyof ThemeColors): string {
  const colors = themeState.currentTheme.colors;
  return colors[colorKey] ?? '';
}

/**
 * Get a specific color from a given theme
 * Requirements: 5.1, 5.2, 5.3
 * 
 * @param theme - Theme object to get color from
 * @param colorKey - Key of the color to retrieve
 * @returns Color value as hex string
 */
export function getThemeColor(theme: Theme, colorKey: keyof ThemeColors): string {
  return theme.colors[colorKey] ?? '';
}

/**
 * Check if the current theme has a specific effect enabled
 * Requirements: 5.4, 5.5, 5.6
 * 
 * @param effectKey - Key of the effect to check
 * @returns True if effect is enabled, false otherwise
 */
export function hasEffect(effectKey: keyof ThemeEffects): boolean {
  const effects = themeState.currentTheme.effects;
  if (!effects) return false;
  return effects[effectKey] === true;
}

/**
 * Check if a specific theme has an effect enabled
 * Requirements: 5.4, 5.5, 5.6
 * 
 * @param theme - Theme object to check
 * @param effectKey - Key of the effect to check
 * @returns True if effect is enabled, false otherwise
 */
export function themeHasEffect(theme: Theme, effectKey: keyof ThemeEffects): boolean {
  if (!theme.effects) return false;
  return theme.effects[effectKey] === true;
}

/**
 * Get all colors from the current theme
 * @returns ThemeColors object
 */
export function getAllColors(): ThemeColors {
  return { ...themeState.currentTheme.colors };
}

/**
 * Get all effects from the current theme
 * @returns ThemeEffects object or undefined
 */
export function getAllEffects(): ThemeEffects | undefined {
  return themeState.currentTheme.effects 
    ? { ...themeState.currentTheme.effects } 
    : undefined;
}

/**
 * Reset theme system to default theme
 */
export function resetTheme(): void {
  themeState.currentTheme = getDefaultTheme();
}

/**
 * Initialize theme system with a specific theme ID
 * Typically called on app startup with the user's saved theme preference
 * 
 * @param themeId - Theme ID to initialize with
 */
export function initializeTheme(themeId: string): void {
  applyTheme(themeId);
}

/**
 * Export theme state for testing purposes
 */
export function _getThemeState(): ThemeSystemState {
  return themeState;
}

/**
 * Reset theme state for testing purposes
 */
export function _resetThemeState(): void {
  themeState = {
    currentTheme: getDefaultTheme(),
    customThemeColors: null,
  };
}
