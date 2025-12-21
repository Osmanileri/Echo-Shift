/**
 * Spirit Renderer - Spirit of the Resonance
 *
 * Professional-grade Pokemon orb rendering with:
 * - Dynamic silhouette with lean effect based on velocity
 * - Elemental aura with additive blending
 * - Type-specific connector rendering
 * - Dual-type synergy support
 */

import {
  ElementalConfig,
  getDualTypeConfig,
  getElementalConfig,
} from "./elementalStyles";

// Type alias for backwards compatibility
type ElementalStyle = ElementalConfig;

// Helper function for backwards compatibility
const getElementalStyle = (type: string): ElementalStyle => getElementalConfig(type);

// Create dual-type synergy from types array
const createDualTypeSynergy = (types: string[]): { primaryType: string; primaryStyle: ElementalStyle } => {
  const primaryType = types[0] || 'normal';
  const secondaryType = types[1];
  return {
    primaryType,
    primaryStyle: secondaryType ? getDualTypeConfig(primaryType, secondaryType) : getElementalStyle(primaryType),
  };
};

// Helper function to determine if a color is light or dark
const isColorLight = (color: string): boolean => {
  // Parse hex color
  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

/**
 * Render a spirit orb with Pokemon silhouette inside
 * Enhanced with dynamic lean based on velocity
 */
export const renderSpiritOrb = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  image: HTMLImageElement | null,
  orbColor: string,
  pokemonType: string,
  time: number = Date.now(),
  velocityY: number = 0
): void => {
  renderProfessionalOrb(ctx, x, y, radius, image, orbColor, pokemonType, velocityY, time);
};

/**
 * Render Pokemon silhouette with dynamic lean effect
 * Silhouette leans opposite to movement direction
 */
/**
 * Render Pokemon silhouette with dynamic lean and breathing effect
 * Silhouette color is inverted based on orb color (Polarity System)
 */
const renderSilhouette = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  image: HTMLImageElement,
  orbColor: string,
  velocityY: number,
  time: number
): void => {
  // [CRITICAL FIX] Use offscreen canvas to create silhouette WITHOUT covering orb body
  // This ensures the orb keeps its theme color (purple, green, etc.)
  // while the Pokemon sprite appears as a white silhouette on top

  const silhouetteColor = "#FFFFFF";

  // Breathing effect (Pulse)
  const breathScale = 1 + Math.sin(time / 400) * 0.05;
  const drawSize = radius * 1.5 * breathScale;

  // Dynamic Lean Effect: Silhouette leans opposite to movement
  const maxLean = radius * 0.2;
  const leanY = Math.max(-maxLean, Math.min(maxLean, velocityY * -2.5));

  // Create offscreen canvas for silhouette (avoids affecting orb color)
  const offscreen = document.createElement('canvas');
  offscreen.width = Math.ceil(drawSize);
  offscreen.height = Math.ceil(drawSize);
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) return;

  // Draw sprite on offscreen canvas
  offCtx.drawImage(image, 0, 0, drawSize, drawSize);

  // Color it white using source-in (only affects sprite pixels)
  offCtx.globalCompositeOperation = 'source-in';
  offCtx.fillStyle = silhouetteColor;
  offCtx.fillRect(0, 0, drawSize, drawSize);

  // Now draw the silhouette onto the main canvas (clipped to orb)
  ctx.save();

  // Clip to orb shape
  ctx.beginPath();
  ctx.arc(x, y, radius - 2, 0, Math.PI * 2);
  ctx.clip();

  // Add subtle glow to silhouette
  ctx.shadowColor = "#FFFFFF";
  ctx.shadowBlur = 5;
  ctx.globalAlpha = 0.85;

  // Draw the pre-colored silhouette at orb center with lean
  ctx.drawImage(
    offscreen,
    x - drawSize / 2,
    y + leanY - drawSize / 2,
    drawSize,
    drawSize
  );

  ctx.restore();
};

/**
 * Professional orb renderer - Spirit of the Resonance
 */
export const renderProfessionalOrb = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  image: HTMLImageElement | null,
  orbColor: string,
  elementType: string,
  velocityY: number = 0,
  time: number = Date.now()
): void => {
  const style = getElementalStyle(elementType);
  const orbitalRadius = radius * 1.3; // 30% size increase (was 20%)

  ctx.save();

  // 1. Elemental Aura (Glow)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = style.glowColor;
  ctx.shadowBlur = 20 + Math.sin(time / 300) * 8;
  ctx.beginPath();
  ctx.arc(x, y, orbitalRadius + 2, 0, Math.PI * 2);
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 2. Main Orb Body (Preserves Polarity)
  ctx.beginPath();
  ctx.arc(x, y, orbitalRadius, 0, Math.PI * 2);
  ctx.fillStyle = orbColor;
  ctx.fill();

  // 3. Silhouette Masking (Living Energy)
  if (image && image.complete && image.naturalWidth > 0) {
    renderSilhouette(ctx, x, y, orbitalRadius, image, orbColor, velocityY, time);
  }

  // 4. Outer Stroke for Visual Clarity (uses elemental contrastColor for guaranteed visibility)
  ctx.beginPath();
  ctx.arc(x, y, orbitalRadius, 0, Math.PI * 2);

  // Use elemental contrastColor for guaranteed visibility on any background
  const contrastColor = style.contrastColor || (isColorLight(orbColor) ? '#000000' : '#FFFFFF');
  const contrastAlpha = 0.6; // Increased from 0.3 for better visibility

  // Add subtle shadow for depth
  ctx.shadowColor = contrastColor;
  ctx.shadowBlur = 4;

  ctx.strokeStyle = contrastColor === '#000000'
    ? `rgba(0,0,0,${contrastAlpha})`
    : `rgba(255,255,255,${contrastAlpha})`;
  ctx.lineWidth = 2.5; // Slightly thicker for visibility
  ctx.stroke();

  // Reset shadow
  ctx.shadowBlur = 0;

  ctx.restore();
};




/**
 * Convert Pokemon elemental type to monochrome intensity (0.0 to 1.0)
 * Maintains uniqueness while preserving black-white theme
 */
const getElementalMonochromeIntensity = (elementType: string): number => {
  // Map types to intensity values - powerful types get stronger visual presence
  const intensityMap: Record<string, number> = {
    dragon: 1.0, // Legendary - strongest presence
    psychic: 0.9, // Mystic - strong presence
    ghost: 0.85, // Ethereal - strong presence
    electric: 0.8, // Energy - strong presence
    fire: 0.75, // Passionate - strong presence
    dark: 0.7, // Shadow - moderate presence
    ice: 0.65, // Cool - moderate presence
    water: 0.6, // Flowing - moderate presence
    steel: 0.55, // Solid - moderate presence
    poison: 0.5, // Toxic - moderate presence
    fighting: 0.45, // Physical - light presence
    ground: 0.4, // Earth - light presence
    flying: 0.35, // Air - light presence
    grass: 0.3, // Nature - light presence
    rock: 0.25, // Hard - light presence
    bug: 0.2, // Small - light presence
    fairy: 0.15, // Magical - light presence
    normal: 0.1, // Basic - minimal presence
  };

  return intensityMap[elementType] || 0.1;
};

/**
 * Render elemental connector between two orbs
 * BLACK-WHITE THEMED: Monochrome connector with intensity variation
 */
export const renderElementalConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  types: string[],
  time: number = Date.now()
): void => {
  const synergy = createDualTypeSynergy(types);
  const style = synergy.primaryStyle;
  const connectorStyle = style.connectorStyle;

  // Get elemental intensity for monochrome rendering
  const elementalIntensity = getElementalMonochromeIntensity(
    synergy.primaryType
  );

  ctx.save();

  // BLACK-WHITE THEME: Monochrome connector with intensity-based variation
  ctx.globalCompositeOperation = "lighter";

  // Use white with varying intensity instead of colored
  const connectorOpacity = 0.3 + elementalIntensity * 0.5;
  const glowIntensity = 10 + elementalIntensity * 15;

  ctx.shadowColor = `rgba(255, 255, 255, ${connectorOpacity})`;
  ctx.shadowBlur = glowIntensity;
  ctx.strokeStyle = `rgba(255, 255, 255, ${connectorOpacity})`;

  switch (connectorStyle) {
    case "bolt":
      renderMonochromeBoltConnector(
        ctx,
        x1,
        y1,
        x2,
        y2,
        elementalIntensity,
        time
      );
      break;
    case "plasma":
      renderMonochromePlasmaConnector(
        ctx,
        x1,
        y1,
        x2,
        y2,
        elementalIntensity,
        time
      );
      break;
    case "tube":
      renderMonochromeTubeConnector(
        ctx,
        x1,
        y1,
        x2,
        y2,
        elementalIntensity,
        time
      );
      break;
    case "wave":
      renderMonochromeWaveConnector(
        ctx,
        x1,
        y1,
        x2,
        y2,
        elementalIntensity,
        time
      );
      break;
    default:
      renderMonochromeStandardConnector(
        ctx,
        x1,
        y1,
        x2,
        y2,
        elementalIntensity
      );
  }

  ctx.restore();
};

/**
 * Bolt connector - Electric type zigzag lightning
 */
const renderBoltConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: ElementalStyle,
  time: number
): void => {
  const segments = 5;
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);

  for (let i = 1; i < segments; i++) {
    // Add random jitter for lightning effect
    const jitterX = (Math.random() - 0.5) * 15;
    const jitterY = (Math.random() - 0.5) * 15;
    ctx.lineTo(x1 + dx * i + jitterX, y1 + dy * i + jitterY);
  }

  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Secondary spark line
  if (Math.random() > 0.5) {
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
      const jitterX = (Math.random() - 0.5) * 25;
      const jitterY = (Math.random() - 0.5) * 25;
      ctx.lineTo(x1 + dx * i + jitterX, y1 + dy * i + jitterY);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
};

/**
 * Plasma connector - Fire type glowing thick line
 */
const renderPlasmaConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: ElementalStyle,
  time: number
): void => {
  const pulseWidth = 4 + Math.sin(time / 100) * 2;

  // Outer glow
  ctx.lineWidth = pulseWidth + 4;
  ctx.strokeStyle = style.glowColor;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Core line
  ctx.lineWidth = pulseWidth;
  ctx.strokeStyle = style.color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Inner bright core
  ctx.lineWidth = 2;
  ctx.strokeStyle = style.secondaryColor;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

/**
 * Tube connector - Water type flowing tube
 */
const renderTubeConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: ElementalStyle,
  time: number
): void => {
  // Animated flow effect
  const flowOffset = (time / 50) % 20;

  // Create gradient along connector
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, style.color);
  gradient.addColorStop(0.5, style.secondaryColor);
  gradient.addColorStop(1, style.color);

  ctx.lineWidth = 5;
  ctx.strokeStyle = gradient;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Inner flow line
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#FFFFFF";
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([5, 10]);
  ctx.lineDashOffset = -flowOffset;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
};

/**
 * Wave connector - Ghost/Psychic type sinusoidal wave
 */
const renderWaveConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: ElementalStyle,
  time: number
): void => {
  const segments = 20;
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;
  const waveAmplitude = 8;
  const waveFrequency = 0.3;
  const waveOffset = time / 200;

  // Calculate perpendicular direction for wave
  const length = Math.sqrt(dx * dx + dy * dy) * segments;
  const perpX = -dy / (length / segments);
  const perpY = dx / (length / segments);

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);

  for (let i = 1; i <= segments; i++) {
    const progress = i / segments;
    const wave = Math.sin(progress * Math.PI * 4 + waveOffset) * waveAmplitude;
    const wx = x1 + dx * i + perpX * wave * (length / segments);
    const wy = y1 + dy * i + perpY * wave * (length / segments);
    ctx.lineTo(wx, wy);
  }

  ctx.stroke();
};

/**
 * MONOCHROME BOLT CONNECTOR - Electric type lightning in white
 */
const renderMonochromeBoltConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  elementalIntensity: number,
  time: number
): void => {
  const segments = 5;
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;

  const intensity = 0.5 + elementalIntensity * 0.5;
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowColor = `rgba(255, 255, 255, ${intensity * 0.8})`;
  ctx.shadowBlur = 10 * elementalIntensity;

  ctx.beginPath();
  ctx.moveTo(x1, y1);

  for (let i = 1; i < segments; i++) {
    const jitterX = (Math.random() - 0.5) * 15 * elementalIntensity;
    const jitterY = (Math.random() - 0.5) * 15 * elementalIntensity;
    ctx.lineTo(x1 + dx * i + jitterX, y1 + dy * i + jitterY);
  }

  ctx.lineTo(x2, y2);
  ctx.stroke();
};

/**
 * MONOCHROME PLASMA CONNECTOR - Fire type thick line in white
 */
const renderMonochromePlasmaConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  elementalIntensity: number,
  time: number
): void => {
  const pulseWidth = 3 + Math.sin(time / 100) * 2 * elementalIntensity;
  const intensity = 0.6 + elementalIntensity * 0.4;

  // Outer glow
  ctx.lineWidth = pulseWidth + 3;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.5})`;
  ctx.shadowColor = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowBlur = 15 * elementalIntensity;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Core line
  ctx.lineWidth = pulseWidth;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

/**
 * MONOCHROME TUBE CONNECTOR - Water type flowing tube in white
 */
const renderMonochromeTubeConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  elementalIntensity: number,
  time: number
): void => {
  const flowOffset = (time / 50) % 20;
  const intensity = 0.5 + elementalIntensity * 0.5;

  // Create gradient along connector
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.8})`);
  gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity})`);
  gradient.addColorStop(1, `rgba(255, 255, 255, ${intensity * 0.8})`);

  ctx.lineWidth = 4;
  ctx.strokeStyle = gradient;
  ctx.lineCap = "round";
  ctx.shadowColor = `rgba(255, 255, 255, ${intensity * 0.6})`;
  ctx.shadowBlur = 12 * elementalIntensity;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Inner flow line
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.4})`;
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([5, 10]);
  ctx.lineDashOffset = -flowOffset;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
};

/**
 * MONOCHROME WAVE CONNECTOR - Ghost/Psychic type sinusoidal wave in white
 */
const renderMonochromeWaveConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  elementalIntensity: number,
  time: number
): void => {
  const segments = 20;
  const dx = (x2 - x1) / segments;
  const dy = (y2 - y1) / segments;
  const waveAmplitude = 6 * elementalIntensity;
  const waveOffset = time / 200;

  // Calculate perpendicular direction for wave
  const length = Math.sqrt(dx * dx + dy * dy) * segments;
  const perpX = -dy / (length / segments);
  const perpY = dx / (length / segments);

  const intensity = 0.4 + elementalIntensity * 0.6;
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowColor = `rgba(255, 255, 255, ${intensity * 0.8})`;
  ctx.shadowBlur = 8 * elementalIntensity;

  ctx.beginPath();
  ctx.moveTo(x1, y1);

  for (let i = 1; i <= segments; i++) {
    const progress = i / segments;
    const wave = Math.sin(progress * Math.PI * 4 + waveOffset) * waveAmplitude;
    const wx = x1 + dx * i + perpX * wave * (length / segments);
    const wy = y1 + dy * i + perpY * wave * (length / segments);
    ctx.lineTo(wx, wy);
  }

  ctx.stroke();
};

/**
 * MONOCHROME STANDARD CONNECTOR - Simple white line with intensity
 */
const renderMonochromeStandardConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  elementalIntensity: number
): void => {
  const intensity = 0.3 + elementalIntensity * 0.7;
  ctx.lineWidth = 3;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowColor = `rgba(255, 255, 255, ${intensity * 0.5})`;
  ctx.shadowBlur = 10 * elementalIntensity;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

/**
 * Standard connector - Simple glowing line
 */
const renderStandardConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: ElementalStyle
): void => {
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

/**
 * Render elemental particles around the orb
 * Enhanced with additive blending
 */
export const renderElementalParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  pokemonType: string,
  time: number = Date.now()
): void => {
  const style = getElementalStyle(pokemonType);

  ctx.save();

  // Use additive blending for neon glow
  ctx.globalCompositeOperation = "lighter";

  switch (pokemonType) {
    case "fire":
      renderFireParticles(ctx, x, y, radius, style, time);
      break;
    case "electric":
      renderElectricParticles(ctx, x, y, radius, style, time);
      break;
    case "ghost":
    case "psychic":
      renderEtherealParticles(ctx, x, y, radius, style, time);
      break;
    case "water":
    case "ice":
      renderWaterParticles(ctx, x, y, radius, style, pokemonType, time);
      break;
    case "grass":
      renderGrassParticles(ctx, x, y, radius, style, time);
      break;
    case "dragon":
      renderDragonParticles(ctx, x, y, radius, style, time);
      break;
    default:
      renderDefaultParticles(ctx, x, y, radius, style, time);
  }

  ctx.restore();
};

// Particle rendering helper functions

const renderFireParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  for (let i = 0; i < 3; i++) {
    const angle = (time / 500 + i * 2) % (Math.PI * 2);
    const dist = radius + 5 + Math.sin(time / 200 + i) * 5;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist - Math.sin(time / 300 + i) * 10;

    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? style.color : style.secondaryColor;
    ctx.globalAlpha = 0.6 + Math.sin(time / 100 + i) * 0.3;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 8;
    ctx.fill();
  }
};

const renderElectricParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5 + Math.random() * 0.3;
  ctx.shadowColor = style.color;
  ctx.shadowBlur = 10;

  if (Math.random() > 0.7) {
    const startAngle = Math.random() * Math.PI * 2;
    const sx = x + Math.cos(startAngle) * radius;
    const sy = y + Math.sin(startAngle) * radius;
    const ex = sx + (Math.random() - 0.5) * 20;
    const ey = sy + (Math.random() - 0.5) * 20;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
};

const renderEtherealParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  for (let i = 0; i < 4; i++) {
    const angle = (time / 800 + i * 1.5) % (Math.PI * 2);
    const dist = radius + 8 + Math.sin(time / 400 + i) * 3;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    ctx.beginPath();
    ctx.arc(px, py, 3 - i * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = style.color;
    ctx.globalAlpha = 0.4 - i * 0.1;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 12;
    ctx.fill();
  }
};

const renderWaterParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  type: string,
  time: number
) => {
  for (let i = 0; i < 3; i++) {
    const angle = (time / 600 + i * 2.1) % (Math.PI * 2);
    const dist = radius + 6;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = type === "ice" ? style.secondaryColor : style.color;
    ctx.globalAlpha = 0.6;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 8;
    ctx.fill();
  }
};

const renderGrassParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  for (let i = 0; i < 3; i++) {
    const baseAngle = (time / 700 + i * 2.5) % (Math.PI * 2);
    const floatOffset = Math.sin(time / 300 + i * 1.5) * 5;
    const dist = radius + 8 + floatOffset;
    const px = x + Math.cos(baseAngle) * dist;
    const py = y + Math.sin(baseAngle) * dist;

    ctx.beginPath();
    ctx.ellipse(px, py, 3, 1.5, baseAngle, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? style.color : style.secondaryColor;
    ctx.globalAlpha = 0.5;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 6;
    ctx.fill();
  }
};

const renderDragonParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  for (let i = 0; i < 4; i++) {
    const angle = (time / 400 + i * 1.5) % (Math.PI * 2);
    const dist = radius + 10 + Math.sin(time / 200 + i) * 5;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    ctx.beginPath();
    ctx.arc(px, py, 2.5 - i * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? style.color : style.secondaryColor;
    ctx.globalAlpha = 0.7 - i * 0.1;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 15;
    ctx.fill();
  }
};

const renderDefaultParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  ctx.beginPath();
  ctx.arc(x, y, radius + 3 + Math.sin(time / 400) * 2, 0, Math.PI * 2);
  ctx.strokeStyle = style.color;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.shadowColor = style.color;
  ctx.shadowBlur = 8;
  ctx.stroke();
};

/**
 * Preload a Pokemon sprite image
 * @deprecated Use SpriteManager.getSprite() instead
 */
export const preloadSpriteImage = (
  spriteUrl: string
): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Failed to load sprite: ${spriteUrl}`));
    img.src = spriteUrl;
  });
};
