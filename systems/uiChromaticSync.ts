/**
 * UI Chromatic Sync - Spirit of the Resonance
 * 
 * React hook that synchronizes UI accent colors with the active Pokemon's type.
 * When a Fire type Pokemon is selected, UI elements glow orange.
 * When Electric type is selected, UI glows yellow, etc.
 */

import { useMemo } from 'react';
import { getElementalStyle } from './elementalStyles';

/**
 * UI color configuration based on Pokemon type
 */
export interface UIColorConfig {
    primary: string;           // Main accent color
    secondary: string;         // Secondary accent
    glow: string;             // Glow/shadow color
    text: string;             // Text color on dark backgrounds
    gradient: string;         // CSS gradient string
    cssVars: Record<string, string>; // CSS custom properties
}

/**
 * Generate UI color configuration from Pokemon types
 */
export const getUIColorConfig = (types: string[]): UIColorConfig => {
    const primaryType = types[0] || 'normal';
    const style = getElementalStyle(primaryType);

    return {
        primary: style.color,
        secondary: style.secondaryColor,
        glow: style.glowColor,
        text: '#FFFFFF',
        gradient: `linear-gradient(135deg, ${style.color}, ${style.secondaryColor})`,
        cssVars: {
            '--spirit-primary': style.color,
            '--spirit-secondary': style.secondaryColor,
            '--spirit-glow': style.glowColor,
            '--spirit-gradient': `linear-gradient(135deg, ${style.color}, ${style.secondaryColor})`,
        },
    };
};

/**
 * Custom hook for UI chromatic sync
 * Returns color config based on active Pokemon types
 */
export const useElementalUI = (types: string[]): UIColorConfig => {
    return useMemo(() => getUIColorConfig(types), [types.join(',')]);
};

/**
 * Apply elemental colors to canvas context for UI elements
 */
export const applyElementalUIColors = (
    ctx: CanvasRenderingContext2D,
    types: string[],
    options: {
        useGlow?: boolean;
        glowIntensity?: number;
        useAdditiveBlending?: boolean;
    } = {}
): void => {
    const { useGlow = true, glowIntensity = 15, useAdditiveBlending = true } = options;
    const config = getUIColorConfig(types);

    if (useAdditiveBlending) {
        ctx.globalCompositeOperation = 'lighter';
    }

    if (useGlow) {
        ctx.shadowColor = config.glow;
        ctx.shadowBlur = glowIntensity;
    }

    ctx.fillStyle = config.primary;
    ctx.strokeStyle = config.primary;
};

/**
 * Create gradient for UI elements based on Pokemon type
 */
export const createElementalGradient = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    types: string[]
): CanvasGradient => {
    const config = getUIColorConfig(types);
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);

    gradient.addColorStop(0, config.primary);
    gradient.addColorStop(0.5, config.secondary);
    gradient.addColorStop(1, config.primary);

    return gradient;
};

/**
 * Render UI panel with elemental styling
 */
export const renderElementalPanel = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    types: string[],
    time: number = Date.now()
): void => {
    const config = getUIColorConfig(types);
    const pulseIntensity = 0.5 + Math.sin(time / 300) * 0.2;

    ctx.save();

    // Panel background with gradient
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    // Elemental border glow
    ctx.strokeStyle = config.primary;
    ctx.lineWidth = 2;
    ctx.shadowColor = config.primary;
    ctx.shadowBlur = 10 * pulseIntensity;
    ctx.globalCompositeOperation = 'lighter';
    ctx.stroke();

    ctx.restore();
};

/**
 * Render score/distance text with elemental styling
 */
export const renderElementalText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    types: string[],
    fontSize: number = 16,
    time: number = Date.now()
): void => {
    const config = getUIColorConfig(types);
    const pulseAlpha = 0.8 + Math.sin(time / 200) * 0.2;

    ctx.save();

    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text with glow
    ctx.fillStyle = config.text;
    ctx.shadowColor = config.primary;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = pulseAlpha;
    ctx.fillText(text, x, y);

    ctx.restore();
};

/**
 * Render energy bar with elemental styling
 */
export const renderElementalBar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    progress: number, // 0-1
    types: string[],
    time: number = Date.now()
): void => {
    const config = getUIColorConfig(types);
    const pulseWidth = 1 + Math.sin(time / 150) * 0.1;

    ctx.save();

    // Background bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, height / 2);
    ctx.fill();

    // Progress fill with gradient
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, config.primary);
    gradient.addColorStop(0.5, config.secondary);
    gradient.addColorStop(1, config.primary);

    ctx.fillStyle = gradient;
    ctx.shadowColor = config.primary;
    ctx.shadowBlur = 10;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.roundRect(x, y, width * progress * pulseWidth, height, height / 2);
    ctx.fill();

    // Glowing border
    ctx.strokeStyle = config.primary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, height / 2);
    ctx.stroke();

    ctx.restore();
};

/**
 * Get CSS style object for React components
 */
export const getElementalCSSStyle = (types: string[]): React.CSSProperties => {
    const config = getUIColorConfig(types);

    return {
        color: config.text,
        borderColor: config.primary,
        boxShadow: `0 0 10px ${config.glow}`,
        background: `linear-gradient(135deg, ${config.primary}20, ${config.secondary}20)`,
    };
};
