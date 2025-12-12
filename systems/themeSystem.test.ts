/**
 * Property-Based Tests for Theme System
 * Uses fast-check for property-based testing
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { 
  applyTheme, 
  getColor, 
  getThemeColor, 
  _resetThemeState 
} from './themeSystem';
import { THEMES, ThemeColors, Theme } from '../data/themes';

// All valid color keys from ThemeColors interface
const COLOR_KEYS: (keyof ThemeColors)[] = [
  'topBg',
  'bottomBg',
  'topOrb',
  'bottomOrb',
  'connector',
  'accent',
  'accentSecondary',
  'topObstacle',
  'bottomObstacle',
];

describe('Theme Color Retrieval Properties', () => {
  beforeEach(() => {
    _resetThemeState();
  });

  /**
   * **Feature: echo-shift-professionalization, Property 5: Theme Color Retrieval Consistency**
   * **Validates: Requirements 5.1, 5.2, 5.3**
   *
   * For any equipped theme and color key, the Theme System SHALL return
   * the exact color value defined in that theme's configuration.
   */
  test('getColor returns exact color value from equipped theme configuration', () => {
    // Generator for valid theme IDs
    const themeIdArb = fc.constantFrom(...THEMES.map(t => t.id));
    
    // Generator for valid color keys
    const colorKeyArb = fc.constantFrom(...COLOR_KEYS);

    fc.assert(
      fc.property(
        themeIdArb,
        colorKeyArb,
        (themeId, colorKey) => {
          // Apply the theme
          const appliedTheme = applyTheme(themeId);
          
          // Get color via the system function
          const retrievedColor = getColor(colorKey);
          
          // Get expected color directly from theme configuration
          const expectedColor = appliedTheme.colors[colorKey];
          
          // The retrieved color must exactly match the theme's configured color
          return retrievedColor === expectedColor;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 5: Theme Color Retrieval Consistency**
   * **Validates: Requirements 5.1, 5.2, 5.3**
   *
   * For any theme and color key, getThemeColor SHALL return the exact color
   * value defined in that theme's configuration.
   */
  test('getThemeColor returns exact color value from any theme configuration', () => {
    // Generator for valid themes
    const themeArb = fc.constantFrom(...THEMES);
    
    // Generator for valid color keys
    const colorKeyArb = fc.constantFrom(...COLOR_KEYS);

    fc.assert(
      fc.property(
        themeArb,
        colorKeyArb,
        (theme: Theme, colorKey: keyof ThemeColors) => {
          // Get color via the system function
          const retrievedColor = getThemeColor(theme, colorKey);
          
          // Get expected color directly from theme configuration
          const expectedColor = theme.colors[colorKey];
          
          // The retrieved color must exactly match the theme's configured color
          return retrievedColor === expectedColor;
        }
      ),
      { numRuns: 100 }
    );
  });
});
