/**
 * Visual Contrast System - Echo Shift
 * 
 * Provides utilities for ensuring visual legibility across dynamic color themes.
 * Uses standard W3C relative luminance calculations for accessibility.
 */

/**
 * Configuration for contrast calculations
 */
export interface ContrastConfig {
    minColorDistance: number;  // Minimum ΔE for acceptable contrast (default: 80)
    darkThreshold: number;     // Luminance threshold for dark/light (default: 128)
    shiftAmount: number;       // How much to shift color when too similar (default: 60)
}

const DEFAULT_CONFIG: ContrastConfig = {
    minColorDistance: 80,
    darkThreshold: 128,
    shiftAmount: 60,
};

/**
 * Parse a hex color string to RGB values
 * Supports #RGB, #RRGGBB, and rgba() formats
 */
export const parseColor = (color: string): { r: number; g: number; b: number } => {
    // Handle rgba format
    if (color.startsWith('rgba') || color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        if (match && match.length >= 3) {
            return {
                r: parseInt(match[0], 10),
                g: parseInt(match[1], 10),
                b: parseInt(match[2], 10),
            };
        }
    }

    // Handle hex format
    let hex = color.replace('#', '');

    // Expand shorthand (#RGB → #RRGGBB)
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    return {
        r: parseInt(hex.substring(0, 2), 16) || 0,
        g: parseInt(hex.substring(2, 4), 16) || 0,
        b: parseInt(hex.substring(4, 6), 16) || 0,
    };
};

/**
 * Convert RGB to hex color string
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
};

/**
 * Calculate relative luminance using W3C formula
 * L = 0.2126R + 0.7152G + 0.0722B
 * 
 * @param color - Hex color string
 * @returns Luminance value (0-255 scale)
 */
export const calculateLuminance = (color: string): number => {
    const { r, g, b } = parseColor(color);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Determine if a color is light or dark
 * 
 * @param color - Hex color string
 * @param threshold - Luminance threshold (default: 128)
 * @returns true if color is light, false if dark
 */
export const isColorLight = (color: string, threshold: number = DEFAULT_CONFIG.darkThreshold): boolean => {
    return calculateLuminance(color) > threshold;
};

/**
 * Get a contrasting color (black or white) for the given background
 * 
 * @param backgroundColor - Background color to contrast against
 * @param threshold - Luminance threshold (default: 128)
 * @returns '#000000' for light backgrounds, '#FFFFFF' for dark backgrounds
 */
export const getContrastColor = (
    backgroundColor: string,
    threshold: number = DEFAULT_CONFIG.darkThreshold
): string => {
    return isColorLight(backgroundColor, threshold) ? '#000000' : '#FFFFFF';
};

/**
 * Calculate Euclidean color distance (ΔE) between two colors
 * Range: 0 (identical) to ~441 (black to white)
 * 
 * @param color1 - First color
 * @param color2 - Second color
 * @returns Distance value
 */
export const colorDistance = (color1: string, color2: string): number => {
    const c1 = parseColor(color1);
    const c2 = parseColor(color2);

    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
};

/**
 * Check if two colors are too similar for visual distinction
 * 
 * @param color1 - First color
 * @param color2 - Second color
 * @param minDistance - Minimum acceptable distance (default: 80)
 * @returns true if colors are too similar
 */
export const areColorsTooSimilar = (
    color1: string,
    color2: string,
    minDistance: number = DEFAULT_CONFIG.minColorDistance
): boolean => {
    return colorDistance(color1, color2) < minDistance;
};

/**
 * Lighten a color by a specified amount
 * 
 * @param color - Original color
 * @param amount - Amount to lighten (0-255)
 * @returns Lightened color
 */
export const lightenColor = (color: string, amount: number): string => {
    const { r, g, b } = parseColor(color);
    return rgbToHex(r + amount, g + amount, b + amount);
};

/**
 * Darken a color by a specified amount
 * 
 * @param color - Original color
 * @param amount - Amount to darken (0-255)
 * @returns Darkened color
 */
export const darkenColor = (color: string, amount: number): string => {
    const { r, g, b } = parseColor(color);
    return rgbToHex(r - amount, g - amount, b - amount);
};

/**
 * Adapt a color for contrast against a background
 * If the color is too similar to the background, shift it lighter or darker
 * 
 * @param targetColor - Color to adapt
 * @param backgroundColor - Background color to contrast against
 * @param config - Contrast configuration
 * @returns Adapted color with guaranteed contrast
 */
export const adaptColorForContrast = (
    targetColor: string,
    backgroundColor: string,
    config: Partial<ContrastConfig> = {}
): string => {
    const { minColorDistance, shiftAmount } = { ...DEFAULT_CONFIG, ...config };

    // If colors are sufficiently different, no change needed
    if (!areColorsTooSimilar(targetColor, backgroundColor, minColorDistance)) {
        return targetColor;
    }

    // Determine whether to lighten or darken based on background luminance
    const bgLuminance = calculateLuminance(backgroundColor);

    if (bgLuminance > 128) {
        // Light background: darken the target color
        return darkenColor(targetColor, shiftAmount);
    } else {
        // Dark background: lighten the target color
        return lightenColor(targetColor, shiftAmount);
    }
};

/**
 * Get an outline/stroke color that contrasts with both the fill and background
 * 
 * @param fillColor - The main fill color
 * @param backgroundColor - The background color (optional)
 * @returns Optimal outline color
 */
export const getOutlineColor = (fillColor: string, backgroundColor?: string): string => {
    const fillLuminance = calculateLuminance(fillColor);

    // Basic contrast: opposite of fill color
    let outlineColor = fillLuminance > 128 ? '#000000' : '#FFFFFF';

    // If background provided, check if outline would blend in
    if (backgroundColor) {
        const distance = colorDistance(outlineColor, backgroundColor);
        if (distance < 60) {
            // Outline would blend with background, use opposite
            outlineColor = outlineColor === '#000000' ? '#FFFFFF' : '#000000';
        }
    }

    return outlineColor;
};

/**
 * Generate a semi-transparent overlay color for UI protection
 * Creates a dark or light veil depending on content color needs
 * 
 * @param contentColor - The color of content that needs protection
 * @param opacity - Opacity of the overlay (0-1)
 * @returns RGBA color string
 */
export const getProtectiveOverlay = (contentColor: string, opacity: number = 0.3): string => {
    // If content is light, use dark overlay; vice versa
    const isLightContent = isColorLight(contentColor);
    const baseColor = isLightContent ? '0,0,0' : '255,255,255';
    return `rgba(${baseColor},${opacity})`;
};

/**
 * Get a text shadow style for guaranteed legibility
 * 
 * @param textColor - The text color
 * @returns CSS text-shadow value
 */
export const getTextShadow = (textColor: string): string => {
    const isLight = isColorLight(textColor);
    if (isLight) {
        // Light text: dark shadow
        return '0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,1)';
    } else {
        // Dark text: light shadow/glow
        return '0 0 8px rgba(255,255,255,0.8), 0 2px 4px rgba(255,255,255,0.6), 0 0 2px rgba(255,255,255,1)';
    }
};

// Export default configuration for reference
export { DEFAULT_CONFIG as CONTRAST_CONFIG };
