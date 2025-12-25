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
        elementalIntensity,
        time
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
 * MONOCHROME PLASMA CONNECTOR - Fire type with animated flame bursts
 * Matches Electric bolt intensity with rising flame particles
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
  const intensity = 0.7 + elementalIntensity * 0.3;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segments = 6;

  // Main flame core with flickering effect
  ctx.lineWidth = 3 + Math.sin(time / 80) * 1.5;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowColor = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowBlur = 20 * elementalIntensity;
  ctx.lineCap = 'round';

  // Wavy flame path (like Electric but with different pattern)
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const flameWave = Math.sin(time / 60 + i * 2) * 8 * elementalIntensity;
    const riseEffect = Math.sin(time / 100 + i) * 4;
    ctx.lineTo(
      x1 + dx * t + flameWave * 0.3,
      y1 + dy * t + riseEffect + (Math.random() - 0.5) * 3
    );
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Secondary flame trail (offset)
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const flameWave = Math.sin(time / 70 + i * 2.5 + 1) * 10 * elementalIntensity;
    ctx.lineTo(
      x1 + dx * t + flameWave * 0.4,
      y1 + dy * t + (Math.random() - 0.5) * 5
    );
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Rising ember particles along connector
  for (let i = 0; i < 4; i++) {
    const particleT = ((time / 300 + i * 0.25) % 1);
    const px = x1 + dx * particleT;
    const py = y1 + dy * particleT - Math.sin(time / 80 + i) * 12;
    const particleSize = 2 + Math.sin(time / 100 + i) * 1;
    const particleAlpha = (1 - particleT) * 0.7 * elementalIntensity;

    ctx.beginPath();
    ctx.arc(px + (Math.random() - 0.5) * 6, py, particleSize, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha})`;
    ctx.fill();
  }
};

/**
 * MONOCHROME TUBE CONNECTOR - Water type with flowing wave motion
 * Dynamic like Electric but with smooth sinusoidal flow
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
  const intensity = 0.6 + elementalIntensity * 0.4;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segments = 16;
  const waveFreq = 4;
  const waveAmp = 8 * elementalIntensity;

  // Calculate perpendicular direction for waves
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / length;
  const perpY = dx / length;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Main flowing wave
  ctx.lineWidth = 4;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowColor = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowBlur = 15 * elementalIntensity;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * waveFreq + time / 150) * waveAmp;
    const flowWave = Math.sin(t * Math.PI * 2 + time / 200) * 3;
    ctx.lineTo(
      x1 + dx * t + perpX * (wave + flowWave),
      y1 + dy * t + perpY * (wave + flowWave)
    );
  }
  ctx.stroke();

  // Secondary wave (offset phase)
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * waveFreq + time / 150 + Math.PI) * waveAmp * 0.6;
    ctx.lineTo(
      x1 + dx * t + perpX * wave,
      y1 + dy * t + perpY * wave
    );
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Water droplet particles flowing along
  for (let i = 0; i < 5; i++) {
    const particleT = ((time / 400 + i * 0.2) % 1);
    const waveOffset = Math.sin(particleT * Math.PI * waveFreq + time / 150) * waveAmp * 0.5;
    const px = x1 + dx * particleT + perpX * waveOffset;
    const py = y1 + dy * particleT + perpY * waveOffset;
    const particleSize = 2.5 + Math.sin(time / 80 + i) * 0.5;
    const particleAlpha = Math.sin(particleT * Math.PI) * 0.6 * elementalIntensity;

    if (particleAlpha > 0.1) {
      ctx.beginPath();
      ctx.arc(px, py, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha})`;
      ctx.fill();
    }
  }
};

/**
 * MONOCHROME WAVE CONNECTOR - Ghost/Psychic type ethereal energy
 * Multi-layered waves with floating spirit orbs
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
  const segments = 24;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / length;
  const perpY = dx / length;
  const intensity = 0.5 + elementalIntensity * 0.5;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Layer 1: Primary ethereal wave
  const wave1Amp = 10 * elementalIntensity;
  ctx.lineWidth = 3;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowColor = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowBlur = 15 * elementalIntensity;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * 5 + time / 180) * wave1Amp;
    const pulse = Math.sin(time / 300 + t * Math.PI * 2) * 3;
    ctx.lineTo(
      x1 + dx * t + perpX * (wave + pulse),
      y1 + dy * t + perpY * (wave + pulse)
    );
  }
  ctx.stroke();

  // Layer 2: Ghost trail (offset wave)
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * 5 + time / 180 + Math.PI * 0.5) * wave1Amp * 0.7;
    ctx.lineTo(
      x1 + dx * t + perpX * wave,
      y1 + dy * t + perpY * wave
    );
  }
  ctx.stroke();

  // Layer 3: Third ghost trail
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * 5 + time / 180 + Math.PI) * wave1Amp * 0.5;
    ctx.lineTo(
      x1 + dx * t + perpX * wave,
      y1 + dy * t + perpY * wave
    );
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Floating spirit orbs along the path
  for (let i = 0; i < 4; i++) {
    const orbT = ((time / 500 + i * 0.25) % 1);
    const waveOffset = Math.sin(orbT * Math.PI * 5 + time / 180) * wave1Amp * 0.6;
    const px = x1 + dx * orbT + perpX * waveOffset;
    const py = y1 + dy * orbT + perpY * waveOffset;
    const orbSize = 3 + Math.sin(time / 150 + i * 2) * 1;
    const orbAlpha = Math.sin(orbT * Math.PI) * 0.7 * elementalIntensity;

    if (orbAlpha > 0.15) {
      // Outer glow
      ctx.beginPath();
      ctx.arc(px, py, orbSize + 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${orbAlpha * 0.3})`;
      ctx.fill();

      // Core orb
      ctx.beginPath();
      ctx.arc(px, py, orbSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${orbAlpha})`;
      ctx.fill();
    }
  }
};

/**
 * MONOCHROME STANDARD CONNECTOR - Energy pulse line with particles
 * Used for Grass, Rock, Ground, and other types
 */
const renderMonochromeStandardConnector = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  elementalIntensity: number,
  time: number = Date.now()
): void => {
  const intensity = 0.4 + elementalIntensity * 0.6;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / length;
  const perpY = dx / length;

  ctx.lineCap = 'round';

  // Main connector with subtle pulse
  const pulseWidth = 2.5 + Math.sin(time / 120) * 0.8;
  ctx.lineWidth = pulseWidth;
  ctx.strokeStyle = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowColor = `rgba(255, 255, 255, ${intensity})`;
  ctx.shadowBlur = 12 * elementalIntensity;

  // Slight wave motion for organic feel
  const segments = 8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * 2 + time / 200) * 4 * elementalIntensity;
    ctx.lineTo(
      x1 + dx * t + perpX * wave * 0.3,
      y1 + dy * t + perpY * wave * 0.3
    );
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Energy pulse particles
  for (let i = 0; i < 3; i++) {
    const particleT = ((time / 350 + i * 0.33) % 1);
    const px = x1 + dx * particleT;
    const py = y1 + dy * particleT;
    const particleSize = 2 + Math.sin(time / 100 + i) * 0.5;
    const particleAlpha = Math.sin(particleT * Math.PI) * 0.5 * elementalIntensity;

    if (particleAlpha > 0.1) {
      ctx.beginPath();
      ctx.arc(px, py, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${particleAlpha})`;
      ctx.fill();
    }
  }
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

/**
 * Render elemental counter-attack projectile from orb to enemy
 * Used when Pokemon defends player against Glitch Dart attacks
 */
export const renderElementalProjectile = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  pokemonType: string,
  time: number = Date.now()
): void => {
  const style = getElementalStyle(pokemonType);
  const connectorStyle = style.connectorStyle;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighter';

  // Neon glow effect (more aggressive than connector)
  ctx.shadowBlur = 35;
  ctx.shadowColor = style.color;
  ctx.strokeStyle = style.color;

  switch (connectorStyle) {
    case 'bolt':
      // ⚡ ELECTRIC: Zigzag lightning strike
      renderLightningProjectile(ctx, startX, startY, endX, endY, style, time);
      break;
    case 'plasma':
      // 🔥 FIRE: Flaming huzma with gradient
      renderFlameProjectile(ctx, startX, startY, endX, endY, style, time);
      break;
    case 'tube':
      // 💧 WATER: High-pressure water jet
      renderWaterJetProjectile(ctx, startX, startY, endX, endY, style, time);
      break;
    case 'wave':
      // 👻 GHOST/PSYCHIC: Ethereal energy blast
      renderEtherealProjectile(ctx, startX, startY, endX, endY, style, time);
      break;
    default:
      // 🌿 STANDARD: Energy arrow
      renderEnergyArrowProjectile(ctx, startX, startY, endX, endY, style, time);
  }

  ctx.restore();
};

/**
 * Lightning bolt projectile for Electric types
 */
const renderLightningProjectile = (
  ctx: CanvasRenderingContext2D,
  startX: number, startY: number,
  endX: number, endY: number,
  style: ElementalStyle,
  time: number
): void => {
  const segments = 6;
  const dx = (endX - startX) / segments;
  const dy = (endY - startY) / segments;

  // Main lightning bolt (thick, jagged)
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FFFFFF';
  ctx.shadowColor = style.color;
  ctx.beginPath();
  ctx.moveTo(startX, startY);

  for (let i = 1; i < segments; i++) {
    const jitterX = (Math.random() - 0.5) * 40;
    const jitterY = (Math.random() - 0.5) * 40;
    ctx.lineTo(startX + dx * i + jitterX, startY + dy * i + jitterY);
  }
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Secondary bolt (thinner, offset)
  ctx.lineWidth = 2;
  ctx.strokeStyle = style.color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  for (let i = 1; i < segments; i++) {
    const jitterX = (Math.random() - 0.5) * 60;
    const jitterY = (Math.random() - 0.5) * 60;
    ctx.lineTo(startX + dx * i + jitterX, startY + dy * i + jitterY);
  }
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Impact flash at target
  ctx.beginPath();
  ctx.arc(endX, endY, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
};

/**
 * Flame huzma projectile for Fire types
 */
const renderFlameProjectile = (
  ctx: CanvasRenderingContext2D,
  startX: number, startY: number,
  endX: number, endY: number,
  style: ElementalStyle,
  time: number
): void => {
  // Gradient from orange to yellow/white
  const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
  gradient.addColorStop(0, style.color);
  gradient.addColorStop(0.6, style.secondaryColor);
  gradient.addColorStop(1, '#FFFFFF');

  // Main flame beam (curved)
  ctx.lineWidth = 10;
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(startX, startY);

  // Slight curve to make it feel more dynamic
  const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 30;
  const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 30;
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();

  // Inner core (white hot)
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FFFFFF';
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Impact explosion
  ctx.beginPath();
  ctx.arc(endX, endY, 25, 0, Math.PI * 2);
  ctx.fillStyle = style.secondaryColor;
  ctx.globalAlpha = 0.7;
  ctx.fill();
  ctx.globalAlpha = 1;
};

/**
 * Water jet projectile for Water types
 */
const renderWaterJetProjectile = (
  ctx: CanvasRenderingContext2D,
  startX: number, startY: number,
  endX: number, endY: number,
  style: ElementalStyle,
  time: number
): void => {
  // Main water stream
  ctx.lineWidth = 8;
  ctx.strokeStyle = style.color;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Inner flow lines (dashed for motion)
  ctx.setLineDash([15, 10]);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FFFFFF';
  ctx.globalAlpha = 1;
  ctx.lineDashOffset = -time / 20;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Droplet particles along path
  const dx = endX - startX;
  const dy = endY - startY;
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const px = startX + dx * t + (Math.random() - 0.5) * 10;
    const py = startY + dy * t + (Math.random() - 0.5) * 10;
    ctx.beginPath();
    ctx.arc(px, py, 3 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
  }

  // Splash at impact
  ctx.beginPath();
  ctx.arc(endX, endY, 18, 0, Math.PI * 2);
  ctx.fillStyle = style.color;
  ctx.globalAlpha = 0.5;
  ctx.fill();
  ctx.globalAlpha = 1;
};

/**
 * Ethereal energy projectile for Ghost/Psychic types
 */
const renderEtherealProjectile = (
  ctx: CanvasRenderingContext2D,
  startX: number, startY: number,
  endX: number, endY: number,
  style: ElementalStyle,
  time: number
): void => {
  const segments = 20;
  const dx = (endX - startX) / segments;
  const dy = (endY - startY) / segments;
  const length = Math.sqrt(dx * dx + dy * dy) * segments;
  const perpX = -dy / (length / segments);
  const perpY = dx / (length / segments);

  // Wave pattern beam
  ctx.lineWidth = 4;
  ctx.strokeStyle = style.color;
  ctx.beginPath();
  ctx.moveTo(startX, startY);

  for (let i = 1; i <= segments; i++) {
    const wave = Math.sin(i / 2 + time / 50) * 15;
    ctx.lineTo(
      startX + dx * i + perpX * wave,
      startY + dy * i + perpY * wave
    );
  }
  ctx.stroke();

  // Ghost orbs along path
  for (let i = 0; i < 4; i++) {
    const t = (i + 0.5) / 4;
    const px = startX + (endX - startX) * t;
    const py = startY + (endY - startY) * t;
    ctx.beginPath();
    ctx.arc(px, py, 6 + Math.sin(time / 100 + i) * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.sin(time / 150 + i) * 0.2})`;
    ctx.fill();
  }

  // Impact glow
  ctx.beginPath();
  ctx.arc(endX, endY, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.6;
  ctx.fill();
  ctx.globalAlpha = 1;
};

/**
 * Energy arrow projectile for standard types
 */
const renderEnergyArrowProjectile = (
  ctx: CanvasRenderingContext2D,
  startX: number, startY: number,
  endX: number, endY: number,
  style: ElementalStyle,
  time: number
): void => {
  // Main beam
  ctx.lineWidth = 6;
  ctx.strokeStyle = style.color;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Inner white core
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Impact flash
  ctx.beginPath();
  ctx.arc(endX, endY, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
};

// Particle rendering helper functions

/**
 * FIRE PARTICLES - Rising embers with flickering trails
 */
const renderFireParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  // Multiple rising ember particles
  for (let i = 0; i < 5; i++) {
    const baseAngle = (time / 400 + i * 1.3) % (Math.PI * 2);
    const riseOffset = Math.sin(time / 150 + i * 2) * 8;
    const dist = radius + 6 + Math.sin(time / 200 + i) * 4;
    const px = x + Math.cos(baseAngle) * dist + (Math.random() - 0.5) * 3;
    const py = y + Math.sin(baseAngle) * dist - riseOffset - Math.abs(Math.sin(time / 100 + i)) * 6;
    const size = 2 + Math.sin(time / 80 + i) * 1;

    // Outer glow
    ctx.beginPath();
    ctx.arc(px, py, size + 2, 0, Math.PI * 2);
    ctx.fillStyle = style.glowColor;
    ctx.globalAlpha = 0.3 + Math.sin(time / 60 + i) * 0.15;
    ctx.fill();

    // Core ember
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? style.color : style.secondaryColor;
    ctx.globalAlpha = 0.7 + Math.sin(time / 80 + i) * 0.2;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 12;
    ctx.fill();
  }

  // Flickering sparks
  if (Math.random() > 0.6) {
    const sparkAngle = Math.random() * Math.PI * 2;
    const sparkDist = radius + 10 + Math.random() * 8;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(sparkAngle) * sparkDist,
      y + Math.sin(sparkAngle) * sparkDist - Math.random() * 10,
      1 + Math.random(),
      0, Math.PI * 2
    );
    ctx.fillStyle = style.secondaryColor;
    ctx.globalAlpha = 0.8;
    ctx.fill();
  }
};

/**
 * ELECTRIC PARTICLES - Zigzag lightning sparks (Reference - already good)
 */
const renderElectricParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = style.color;
  ctx.shadowBlur = 12;

  // Multiple lightning arcs
  for (let j = 0; j < 2; j++) {
    if (Math.random() > 0.5) {
      const startAngle = Math.random() * Math.PI * 2;
      const sx = x + Math.cos(startAngle) * radius;
      const sy = y + Math.sin(startAngle) * radius;

      ctx.globalAlpha = 0.6 + Math.random() * 0.3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);

      // Create zigzag path
      let cx = sx, cy = sy;
      for (let i = 0; i < 3; i++) {
        cx += (Math.random() - 0.5) * 18;
        cy += (Math.random() - 0.5) * 18;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  }

  // Orbiting spark particles
  for (let i = 0; i < 3; i++) {
    const angle = (time / 150 + i * 2.1) % (Math.PI * 2);
    const dist = radius + 5 + Math.sin(time / 100 + i * 3) * 4;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    ctx.beginPath();
    ctx.rect(px - 1.5, py - 1.5, 3, 3);
    ctx.fillStyle = style.color;
    ctx.globalAlpha = 0.7 + Math.sin(time / 50 + i) * 0.3;
    ctx.fill();
  }
};

/**
 * ETHEREAL PARTICLES - Ghost/Psychic floating wisps
 */
const renderEtherealParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  // Orbiting spirit wisps
  for (let i = 0; i < 5; i++) {
    const angle = (time / 800 + i * 1.25) % (Math.PI * 2);
    const pulseOffset = Math.sin(time / 300 + i * 2) * 5;
    const dist = radius + 8 + pulseOffset;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const size = 3.5 - i * 0.4;

    // Ethereal trail
    const trailAngle = angle - 0.3;
    const trailDist = dist - 3;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(
      x + Math.cos(trailAngle) * trailDist,
      y + Math.sin(trailAngle) * trailDist
    );
    ctx.strokeStyle = style.glowColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.2;
    ctx.stroke();

    // Core wisp
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = style.color;
    ctx.globalAlpha = 0.5 - i * 0.08;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 15;
    ctx.fill();
  }

  // Central pulsing aura
  const auraSize = radius + 5 + Math.sin(time / 200) * 3;
  ctx.beginPath();
  ctx.arc(x, y, auraSize, 0, Math.PI * 2);
  ctx.strokeStyle = style.glowColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.15 + Math.sin(time / 300) * 0.1;
  ctx.stroke();
};

/**
 * WATER PARTICLES - Orbiting droplets with ripple effect
 */
const renderWaterParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  type: string,
  time: number
) => {
  const isIce = type === "ice";

  // Orbiting water droplets
  for (let i = 0; i < 4; i++) {
    const angle = (time / 500 + i * 1.6) % (Math.PI * 2);
    const waveOffset = Math.sin(time / 200 + i * 2) * 4;
    const dist = radius + 7 + waveOffset;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const size = isIce ? 2.5 : 3;

    // Droplet gradient effect
    const gradient = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, size);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.5, style.color);
    gradient.addColorStop(1, isIce ? style.secondaryColor : style.color);

    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.7;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 10;
    ctx.fill();
  }

  // Ripple rings
  const ripplePhase = (time / 300) % 1;
  const rippleRadius = radius + 5 + ripplePhase * 15;
  ctx.beginPath();
  ctx.arc(x, y, rippleRadius, 0, Math.PI * 2);
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = (1 - ripplePhase) * 0.3;
  ctx.stroke();

  // Ice crystals for ice type
  if (isIce && Math.random() > 0.85) {
    const crystalAngle = Math.random() * Math.PI * 2;
    const crystalDist = radius + 12 + Math.random() * 5;
    const cx = x + Math.cos(crystalAngle) * crystalDist;
    const cy = y + Math.sin(crystalAngle) * crystalDist;

    ctx.beginPath();
    ctx.moveTo(cx, cy - 3);
    ctx.lineTo(cx + 2, cy);
    ctx.lineTo(cx, cy + 3);
    ctx.lineTo(cx - 2, cy);
    ctx.closePath();
    ctx.fillStyle = style.secondaryColor;
    ctx.globalAlpha = 0.6;
    ctx.fill();
  }
};

/**
 * GRASS PARTICLES - Floating leaves with wind swirl
 */
const renderGrassParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  // Swirling leaf particles
  for (let i = 0; i < 4; i++) {
    const baseAngle = (time / 600 + i * 1.5) % (Math.PI * 2);
    const floatY = Math.sin(time / 250 + i * 2) * 6;
    const floatX = Math.cos(time / 300 + i * 1.5) * 3;
    const dist = radius + 8 + Math.sin(time / 400 + i) * 3;
    const px = x + Math.cos(baseAngle) * dist + floatX;
    const py = y + Math.sin(baseAngle) * dist + floatY;
    const rotation = baseAngle + time / 200;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);

    // Leaf shape
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? style.color : style.secondaryColor;
    ctx.globalAlpha = 0.6 + Math.sin(time / 150 + i) * 0.2;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 8;
    ctx.fill();

    // Leaf vein
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(3, 0);
    ctx.strokeStyle = style.secondaryColor;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    ctx.stroke();

    ctx.restore();
  }

  // Nature energy ring
  const ringPulse = Math.sin(time / 400) * 0.15;
  ctx.beginPath();
  ctx.arc(x, y, radius + 4 + ringPulse * radius, 0, Math.PI * 2);
  ctx.strokeStyle = style.glowColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.2;
  ctx.stroke();
};

/**
 * DRAGON PARTICLES - Dual spiraling mystical flames
 */
const renderDragonParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  // Dual spiral flames
  for (let spiral = 0; spiral < 2; spiral++) {
    const spiralOffset = spiral * Math.PI;

    for (let i = 0; i < 4; i++) {
      const angle = (time / 300 + i * 0.6 + spiralOffset) % (Math.PI * 2);
      const dist = radius + 6 + i * 2 + Math.sin(time / 150 + i) * 3;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = 3 - i * 0.4;

      // Flame glow
      ctx.beginPath();
      ctx.arc(px, py, size + 2, 0, Math.PI * 2);
      ctx.fillStyle = style.glowColor;
      ctx.globalAlpha = 0.25 - i * 0.05;
      ctx.fill();

      // Flame core
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = (i + spiral) % 2 === 0 ? style.color : style.secondaryColor;
      ctx.globalAlpha = 0.8 - i * 0.15;
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 18;
      ctx.fill();
    }
  }

  // Dragon energy burst
  if (Math.random() > 0.92) {
    const burstAngle = Math.random() * Math.PI * 2;
    const burstDist = radius + 15 + Math.random() * 10;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(burstAngle) * burstDist,
      y + Math.sin(burstAngle) * burstDist,
      2,
      0, Math.PI * 2
    );
    ctx.fillStyle = style.color;
    ctx.globalAlpha = 0.9;
    ctx.shadowBlur = 20;
    ctx.fill();
  }
};

/**
 * DEFAULT PARTICLES - Energy sparks for other types
 */
const renderDefaultParticles = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ElementalStyle,
  time: number
) => {
  // Orbiting energy particles
  for (let i = 0; i < 3; i++) {
    const angle = (time / 500 + i * 2.1) % (Math.PI * 2);
    const dist = radius + 6 + Math.sin(time / 300 + i) * 3;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = style.color;
    ctx.globalAlpha = 0.5 + Math.sin(time / 150 + i) * 0.2;
    ctx.shadowColor = style.color;
    ctx.shadowBlur = 8;
    ctx.fill();
  }

  // Pulsing aura ring
  const auraPulse = Math.sin(time / 350);
  ctx.beginPath();
  ctx.arc(x, y, radius + 4 + auraPulse * 2, 0, Math.PI * 2);
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.25 + auraPulse * 0.1;
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

/**
 * Render the unstable MIDLINE during Flux Overload
 * 
 * Warning Phase: Yellow pulsing, subtle tremor
 * Active Phase: Red neon, electric jitter - with ON/OFF pulse
 * 
 * @param pulseIntensity - 0=off/safe (dim), 1=on/dangerous (bright)
 */
export const renderFluxOverloadConnector = (
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  phase: 'warning' | 'active',
  time: number,
  isInDanger: boolean = false,
  pulseIntensity: number = 1.0
): void => {
  const config = {
    warningColor: '#FFDD00',
    activeColor: '#FF0055',
    safeColor: '#330011',
    jitterAmount: 6,
    segments: 15,
    coreBaseRadius: 6,
    corePulseAmount: 4,
  };

  ctx.save();

  // Phase-based styling
  const isWarning = phase === 'warning';

  // USE PULSE INTENSITY FOR DRAMATIC ON/OFF VISUAL
  // ON (pulseIntensity ~1.0) = Parlak kırmızı, tehlikeli
  // OFF (pulseIntensity ~0.15) = Neredeyse görünmez, güvenli
  const effectiveAlpha = isWarning ? 0.7 : pulseIntensity;
  const effectiveJitter = isWarning ? 2 : config.jitterAmount * pulseIntensity;
  const effectiveGlow = isWarning ? 10 : 25 * pulseIntensity;
  const effectiveWidth = isWarning ? 3 : 2 + 4 * pulseIntensity;

  // Color interpolation: bright red when ON, dark/invisible when OFF
  const baseColor = isWarning ? config.warningColor : config.activeColor;

  // Skip rendering entirely if almost invisible (OFF pulse)
  if (effectiveAlpha < 0.1 && !isWarning) {
    ctx.restore();
    return;
  }

  // Glow effect - pulses with intensity
  ctx.shadowColor = baseColor;
  ctx.shadowBlur = effectiveGlow;
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = effectiveWidth;
  ctx.lineCap = 'round';
  ctx.globalAlpha = effectiveAlpha;

  // Draw electric/jittery line
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);

  for (let i = 1; i <= config.segments; i++) {
    const t = i / config.segments;
    const currX = p1.x + (p2.x - p1.x) * t;
    const currY = p1.y + (p2.y - p1.y) * t;

    // Electric jitter effect - scales with pulse intensity
    const offsetX = (Math.random() - 0.5) * effectiveJitter;
    const offsetY = (Math.random() - 0.5) * effectiveJitter;

    ctx.lineTo(currX + offsetX, currY + offsetY);
  }

  ctx.stroke();

  // Secondary spark line (only when pulse is ON and bright)
  if (!isWarning && pulseIntensity > 0.6 && Math.random() > 0.3) {
    ctx.globalAlpha = pulseIntensity * 0.6;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);

    for (let i = 1; i <= config.segments; i++) {
      const t = i / config.segments;
      const currX = p1.x + (p2.x - p1.x) * t;
      const currY = p1.y + (p2.y - p1.y) * t;
      const offsetX = (Math.random() - 0.5) * effectiveJitter * 2;
      const offsetY = (Math.random() - 0.5) * effectiveJitter * 2;
      ctx.lineTo(currX + offsetX, currY + offsetY);
    }

    ctx.stroke();
  }

  // Overload Core - only visible when pulse is ON
  if (pulseIntensity > 0.3 || isWarning) {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const corePulse = Math.sin(time / 100) * config.corePulseAmount * pulseIntensity;
    const coreRadius = config.coreBaseRadius * pulseIntensity + corePulse;

    // Outer glow
    ctx.beginPath();
    ctx.arc(midX, midY, Math.max(2, coreRadius + 4), 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.globalAlpha = 0.3 * pulseIntensity;
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(midX, midY, Math.max(2, coreRadius), 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = pulseIntensity;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 15 * pulseIntensity;
    ctx.fill();

    // Danger zone indicator - red pulse when orbs touching midline
    if (isInDanger) {
      ctx.beginPath();
      ctx.arc(midX, midY, coreRadius + 8 + Math.sin(time / 50) * 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8 * pulseIntensity;
      ctx.stroke();
    }
  }

  // Spark particles (active phase)
  if (!isWarning) {
    for (let i = 0; i < 4; i++) {
      const particleT = ((time / 300 + i * 0.25) % 1);
      const px = p1.x + (p2.x - p1.x) * particleT;
      const py = p1.y + (p2.y - p1.y) * particleT;
      const sparkOffset = Math.sin(time / 80 + i * 2) * 10;

      ctx.beginPath();
      ctx.arc(px + sparkOffset, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = (1 - particleT) * 0.7;
      ctx.fill();
    }
  }

  ctx.restore();
};

/**
 * Draw glitch overlay effect when player takes damage
 * Creates horizontal "slice" displacement effect
 */
export const drawGlitchOverlay = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  intensity: number
): void => {
  if (intensity <= 0) return;

  ctx.save();

  // Red tint overlay
  ctx.fillStyle = `rgba(255, 0, 85, ${intensity * 0.15})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Horizontal slice displacement effect
  const sliceCount = Math.floor(5 + intensity * 10);
  for (let i = 0; i < sliceCount; i++) {
    const y = Math.random() * canvasHeight;
    const h = Math.random() * 15 + 5;
    const xOffset = (Math.random() - 0.5) * 40 * intensity;

    // Create displacement effect
    ctx.fillStyle = `rgba(255, 0, 85, ${intensity * 0.3})`;
    ctx.fillRect(xOffset > 0 ? 0 : canvasWidth + xOffset, y, Math.abs(xOffset), h);

    // White scanline flicker
    if (Math.random() > 0.7) {
      ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.4})`;
      ctx.fillRect(0, y, canvasWidth, 1);
    }
  }

  // Color channel separation (RGB shift)
  if (intensity > 0.5) {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.1})`;
    ctx.fillRect(2, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = `rgba(0, 255, 255, ${intensity * 0.1})`;
    ctx.fillRect(-2, 0, canvasWidth, canvasHeight);
  }

  ctx.restore();
};

/**
 * Draw warning text overlay during warning phase
 */
export const drawFluxOverloadWarning = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  time: number
): void => {
  ctx.save();

  // Pulsing opacity
  const alpha = 0.3 + Math.sin(time / 100) * 0.2;

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = `rgba(255, 221, 0, ${alpha})`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Shadow for readability
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;

  ctx.fillText('⚠ DİKKAT: HAT KARARSIZ ⚠', canvasWidth / 2, 45);

  ctx.restore();
};
