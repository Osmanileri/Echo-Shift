/**
 * Skin Renderer Functions
 * Requirements: 3.1, 3.2, 3.3, 3.4
 * 
 * Provides rendering functions for different ball skin types:
 * - Solid orbs (single color)
 * - Gradient orbs (color gradients)
 * - Emoji orbs (emoji characters)
 */

import { BallSkin, SkinConfig, getSkinById } from '../data/skins';
import { getColor } from '../systems/themeSystem';

/**
 * Render parameters for orb drawing
 */
export interface OrbRenderParams {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  radius: number;
  isTopOrb: boolean;
}

/**
 * Render a solid color orb
 * Requirements: 3.3 - default skin renders classic orbs
 * Theme System Integration - Requirements 5.1, 5.2, 5.3
 * 
 * @param params - Render parameters
 * @param config - Skin configuration
 * @param useThemeColors - If true, use theme colors instead of skin config colors
 */
export function renderSolidOrb(params: OrbRenderParams, config: SkinConfig, useThemeColors: boolean = false): void {
  const { ctx, x, y, radius, isTopOrb } = params;

  // Fallback colors
  const fallbackColor = isTopOrb ? '#FFFFFF' : '#000000';

  // Use theme colors if specified, otherwise use skin config colors
  let color: string;
  if (useThemeColors) {
    color = isTopOrb ? getColor('topOrb') : getColor('bottomOrb');
  } else {
    color = isTopOrb ? config.topColor || '' : config.bottomColor || '';
  }

  // Ensure we always have a valid color
  if (!color) {
    color = fallbackColor;
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.closePath();
}

/**
 * Render a gradient orb with optional glow effect
 * Requirements: 3.2, 3.4 - gradient orbs with visual effects
 * Theme System Integration - uses theme colors as base
 * 
 * @param params - Render parameters
 * @param config - Skin configuration
 */
export function renderGradientOrb(params: OrbRenderParams, config: SkinConfig): void {
  const { ctx, x, y, radius, isTopOrb } = params;

  if (!config.gradient) return;

  // First draw theme-colored base for contrast
  const bgColor = isTopOrb ? getColor('topOrb') : getColor('bottomOrb');
  const fallbackColor = isTopOrb ? '#FFFFFF' : '#000000';

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = bgColor || fallbackColor;
  ctx.fill();
  ctx.closePath();

  // Apply glow effect if configured - Requirements 3.4
  if (config.glowColor && config.glowIntensity) {
    ctx.save();
    ctx.shadowColor = config.glowColor;
    ctx.shadowBlur = radius * config.glowIntensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Create radial gradient overlay
  const gradient = ctx.createRadialGradient(
    x - radius * 0.3, // Offset for 3D effect
    y - radius * 0.3,
    0,
    x,
    y,
    radius
  );

  gradient.addColorStop(0, config.gradient.start);
  gradient.addColorStop(1, config.gradient.end);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.closePath();

  // Restore context if glow was applied
  if (config.glowColor && config.glowIntensity) {
    ctx.restore();
  }
}

/**
 * Render an emoji orb
 * Requirements: 3.2 - emoji-based orbs
 * Theme System Integration - orbs now use theme colors as background
 * 
 * @param params - Render parameters
 * @param config - Skin configuration
 */
export function renderEmojiOrb(params: OrbRenderParams, config: SkinConfig): void {
  const { ctx, x, y, radius, isTopOrb } = params;

  if (!config.emoji) return;

  // Use theme colors for the background circle
  const bgColor = isTopOrb ? getColor('topOrb') : getColor('bottomOrb');
  const fallbackColor = isTopOrb ? '#FFFFFF' : '#000000';

  // Draw solid background circle with theme color
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = bgColor || fallbackColor;
  ctx.fill();
  ctx.closePath();

  // Draw emoji centered on the orb
  const fontSize = radius * 1.5;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.emoji, x, y);
}

/**
 * Render an orb based on skin type
 * Requirements: 3.1, 3.2, 3.3, 3.4
 * Theme System Integration - Requirements 5.1, 5.2, 5.3
 * 
 * NEW APPROACH: Orbs always render with theme colors for visibility.
 * Skins now create trail effects behind orbs (handled by orbTrailSystem).
 * 
 * @param params - Render parameters
 * @param skin - Ball skin to apply (used for emoji overlay only)
 */
export function renderOrb(params: OrbRenderParams, skin: BallSkin): void {
  const { ctx, x, y, radius, isTopOrb } = params;

  // Get theme colors
  const orbColor = isTopOrb ? getColor('topOrb') : getColor('bottomOrb');
  const fallbackColor = isTopOrb ? '#FFFFFF' : '#000000';
  const fillColor = orbColor || fallbackColor;

  // Always draw solid orb with theme colors
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.closePath();

  // For emoji skins, overlay the emoji on top
  if (skin.type === 'emoji' && skin.config.emoji) {
    const fontSize = radius * 1.4;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(skin.config.emoji, x, y);
  }
}

/**
 * Render both orbs (top and bottom) with the equipped skin
 * Requirements: 3.1, 3.2
 * 
 * @param ctx - Canvas rendering context
 * @param topOrbX - Top orb X position
 * @param topOrbY - Top orb Y position
 * @param bottomOrbX - Bottom orb X position
 * @param bottomOrbY - Bottom orb Y position
 * @param radius - Orb radius
 * @param skinId - Equipped skin ID
 */
export function renderOrbsWithSkin(
  ctx: CanvasRenderingContext2D,
  topOrbX: number,
  topOrbY: number,
  bottomOrbX: number,
  bottomOrbY: number,
  radius: number,
  skinId: string
): void {
  const skin = getSkinById(skinId);

  // Render top orb
  renderOrb(
    { ctx, x: topOrbX, y: topOrbY, radius, isTopOrb: true },
    skin
  );

  // Render bottom orb
  renderOrb(
    { ctx, x: bottomOrbX, y: bottomOrbY, radius, isTopOrb: false },
    skin
  );
}
