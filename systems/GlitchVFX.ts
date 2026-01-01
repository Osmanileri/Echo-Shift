/**
 * Glitch Protocol Visual Effects System
 * 
 * Provides rendering functions for Glitch Protocol visual effects:
 * - Glitch Shard rendering (jitter, color flicker, distorted polygon, static noise)
 * - Sinus Tunnel rendering (matrix green wave, glow, guide path)
 * - Static noise overlay
 * - Screen flash effects
 * - Connector visual effects during Quantum Lock and Ghost Mode
 * - Cinematic Tech Snake & Plasma Fire
 * 
 * Requirements: 1.1-1.5, 4.5, 4.6, 5.3-5.5, 7.5, 8.1, 8.3, 8.4, 8.6
 */

import { GLITCH_CONFIG } from '../constants';
import type { GlitchModeState, GlitchPhase, GlitchShard } from '../types';
import { calculateWaveY, getGhostModeOpacity, getGlitchProgress } from './glitchSystem';

// ============================================================================
// Configuration
// ============================================================================

export const GLITCH_VFX_CONFIG = {
  // Jitter effect - Requirements 1.1
  jitterRange: 5,              // ±5 pixels random offset per frame

  // Color flicker - Requirements 1.2
  colorCycleInterval: 50,      // 50ms per color

  // Distorted polygon - Requirements 1.3
  polygonVertices: 6,          // Hexagon base shape
  vertexOffsetRange: 8,        // Random vertex offset range

  // Static noise on shard - Requirements 1.4
  shardNoiseLines: 5,          // 5 random horizontal lines

  // Glow effect - Requirements 1.5
  glowBlur: 15,                // Shadow blur for glow

  // Sinus tunnel - Requirements 5.3, 5.4, 5.5
  tunnelColor: '#00FF00',      // Matrix green
  tunnelGlowBlur: 10,          // 10px shadow blur
  guidePathWidth: 40,          // 40px wide guide path
  guidePathOpacity: 0.1,       // 10% opacity

  // Static noise overlay - Requirements 8.1
  noiseLineChance: 0.2,        // 20% chance per frame
  noiseLineCount: 15,          // Number of noise lines when triggered

  // Screen flash - Requirements 8.3, 8.4
  enterFlashDuration: 200,     // 200ms white flash on enter
  exitFadeDuration: 500,       // 500ms vignette fade on exit

  // Connector effects - Requirements 4.5, 4.6
  connectorGreenTint: '#00FF00',
  connectorPulseMin: 1.0,
  connectorPulseMax: 1.05,
  connectorPulseSpeed: 0.005,  // Pulse animation speed

  // Ghost mode - Requirements 7.5
  ghostOpacity: 0.5,           // 50% opacity during ghost mode
};

// ============================================================================
// Glitch Shard Rendering - Requirements 1.1, 1.2, 1.3, 1.4, 1.5
// ============================================================================

/**
 * Gets the current flicker color based on timer
 * Requirements 1.2: Cycle through neon colors every 50ms
 * 
 * @param colorTimer - Timer value in milliseconds
 * @returns Current color from the cycle
 */
export function getFlickerColor(colorTimer: number): string {
  const colorIndex = Math.floor(colorTimer / GLITCH_VFX_CONFIG.colorCycleInterval) % GLITCH_CONFIG.colors.length;
  return GLITCH_CONFIG.colors[colorIndex];
}

/**
 * Generates jitter offset for the current frame
 * Requirements 1.1: ±5 pixels random offset per frame
 * 
 * @returns Object with x and y jitter offsets
 */
export function generateJitterOffset(): { x: number; y: number } {
  const range = GLITCH_VFX_CONFIG.jitterRange;
  return {
    x: (Math.random() * 2 - 1) * range,
    y: (Math.random() * 2 - 1) * range,
  };
}

/**
 * Generates distorted polygon vertices
 * Requirements 1.3: Distorted polygon shape with random vertex offsets
 * 
 * @param centerX - Center X position
 * @param centerY - Center Y position
 * @param radius - Base radius of the polygon
 * @returns Array of vertex positions
 */
export function generateDistortedPolygon(
  centerX: number,
  centerY: number,
  radius: number
): Array<{ x: number; y: number }> {
  const vertices: Array<{ x: number; y: number }> = [];
  const numVertices = GLITCH_VFX_CONFIG.polygonVertices;
  const offsetRange = GLITCH_VFX_CONFIG.vertexOffsetRange;

  for (let i = 0; i < numVertices; i++) {
    const angle = (i / numVertices) * Math.PI * 2;
    const distortion = (Math.random() * 2 - 1) * offsetRange;
    const r = radius + distortion;

    vertices.push({
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
    });
  }

  return vertices;
}

/**
 * Renders static noise lines on the shard
 * Requirements 1.4: 5 random horizontal lines
 * 
 * @param ctx - Canvas 2D rendering context
 * @param x - Center X position
 * @param y - Center Y position
 * @param width - Shard width
 * @param height - Shard height
 * @param color - Current flicker color
 */
export function renderShardNoise(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;

  const halfWidth = width / 2;
  const halfHeight = height / 2;

  for (let i = 0; i < GLITCH_VFX_CONFIG.shardNoiseLines; i++) {
    const lineY = y - halfHeight + Math.random() * height;
    const lineStartX = x - halfWidth + Math.random() * halfWidth * 0.3;
    const lineEndX = x + halfWidth - Math.random() * halfWidth * 0.3;

    ctx.beginPath();
    ctx.moveTo(lineStartX, lineY);
    ctx.lineTo(lineEndX, lineY);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Profesyonel enerji kuyruğu - keskin çizgiler, solan uç
 * Kuyruk SOLA doğru uzanır, sol ucu yavaşça kaybolur
 */
function renderCometTrail(
  ctx: CanvasRenderingContext2D,
  shard: GlitchShard
): void {
  const time = Date.now() * 0.001;

  ctx.save();

  // Kuyruk uzunluğu
  const trailLength = 150;

  // === ANA KUYRUK (GRADIENT İLE SOLAN) ===
  // Sağdan sola doğru solan gradient
  const mainGradient = ctx.createLinearGradient(
    shard.x, shard.y,
    shard.x - trailLength, shard.y
  );
  mainGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  mainGradient.addColorStop(0.3, 'rgba(200, 255, 255, 0.7)');
  mainGradient.addColorStop(0.6, 'rgba(100, 220, 220, 0.4)');
  mainGradient.addColorStop(0.85, 'rgba(50, 180, 180, 0.15)');
  mainGradient.addColorStop(1, 'rgba(0, 150, 150, 0)');

  ctx.fillStyle = mainGradient;
  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 20;
  ctx.globalAlpha = 1;

  // Sivri kuyruk şekli
  ctx.beginPath();
  ctx.moveTo(shard.x, shard.y);
  ctx.lineTo(shard.x - 25, shard.y - 10);
  ctx.lineTo(shard.x - trailLength, shard.y);
  ctx.lineTo(shard.x - 25, shard.y + 10);
  ctx.closePath();
  ctx.fill();

  // === İÇ PARLAK ÇEKİRDEK ===
  const coreGradient = ctx.createLinearGradient(
    shard.x, shard.y,
    shard.x - trailLength * 0.5, shard.y
  );
  coreGradient.addColorStop(0, '#FFFFFF');
  coreGradient.addColorStop(0.4, 'rgba(220, 255, 255, 0.8)');
  coreGradient.addColorStop(1, 'transparent');

  ctx.fillStyle = coreGradient;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(shard.x, shard.y);
  ctx.lineTo(shard.x - 20, shard.y - 5);
  ctx.lineTo(shard.x - trailLength * 0.5, shard.y);
  ctx.lineTo(shard.x - 20, shard.y + 5);
  ctx.closePath();
  ctx.fill();

  // === SOLAN PARÇACIKLAR (sol uçta) ===
  // Kuyruğun sol ucunda kaybolan parçacıklar
  for (let i = 0; i < 8; i++) {
    // Animasyonlu pozisyon - parçacıklar sola kayıp kaybolur
    const baseT = (time * 0.5 + i * 0.12) % 1;
    const particleX = shard.x - trailLength * (0.6 + baseT * 0.4);

    // Yukarı/aşağı dağılım
    const spreadY = Math.sin(time * 3 + i * 1.5) * (8 + baseT * 12);
    const particleY = shard.y + spreadY;

    // Alpha: sola gittikçe kaybolur
    const alpha = (1 - baseT) * 0.6;
    if (alpha < 0.05) continue;

    // Boyut: sola gittikçe küçülür
    const size = (1 - baseT) * 4 + 1;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(150, 255, 255, ${alpha})`;
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // === ENERJİ ÇİZGİLERİ (sola doğru soluyor) ===
  for (let i = 0; i < 3; i++) {
    const lineY = shard.y + (i - 1) * 8;
    const lineStart = shard.x - 30;
    const animOffset = (time * 60 + i * 20) % 80;
    const lineEnd = lineStart - 40 - animOffset;

    // Çizgi sola gittikçe solar
    const lineAlpha = Math.max(0, 0.4 - animOffset * 0.004);

    ctx.globalAlpha = lineAlpha;
    ctx.strokeStyle = 'rgba(200, 255, 255, 0.8)';
    ctx.lineWidth = 2 - i * 0.3;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(lineStart, lineY);
    ctx.lineTo(lineEnd, lineY);
    ctx.stroke();
  }

  // === PARLAMA NOKTASI (shard başında) ===
  const pulseSize = 6 + Math.sin(time * 8) * 2;
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(shard.x - 3, shard.y, pulseSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}


/**
 * Renders a Glitch Shard with all visual effects including comet trail
 * Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * @param ctx - Canvas 2D rendering context
 * @param shard - The Glitch Shard to render
 */
export function renderGlitchShard(
  ctx: CanvasRenderingContext2D,
  shard: GlitchShard
): void {
  if (!shard.active) return;

  // Render comet trail FIRST (behind the shard)
  renderCometTrail(ctx, shard);

  ctx.save();

  // Get current flicker color - Requirements 1.2
  const color = getFlickerColor(shard.colorTimer);

  // Apply jitter offset - Requirements 1.1
  const jitter = generateJitterOffset();
  const renderX = shard.x + jitter.x;
  const renderY = shard.y + jitter.y;

  // Apply glow effect - Requirements 1.5
  ctx.shadowColor = color;
  ctx.shadowBlur = GLITCH_VFX_CONFIG.glowBlur;

  // Generate and draw distorted polygon - Requirements 1.3
  const radius = Math.max(shard.width, shard.height) / 2;
  const vertices = generateDistortedPolygon(renderX, renderY, radius);

  ctx.fillStyle = color;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw inner glow
  const gradient = ctx.createRadialGradient(
    renderX, renderY, 0,
    renderX, renderY, radius
  );
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(0.3, color);
  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(renderX, renderY, radius * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Render static noise on shard - Requirements 1.4
  renderShardNoise(ctx, renderX, renderY, shard.width, shard.height, color);

  ctx.restore();
}


// ============================================================================
// Sinus Tunnel Rendering - Requirements 5.3, 5.4, 5.5
// ============================================================================

/**
 * Renders the sinusoidal tunnel (wave midline) during Quantum Lock
 * Requirements 5.3: Matrix green color (#00FF00)
 * Requirements 5.4: Glow effect (10px shadow blur)
 * Requirements 5.5: Guide path (40px wide, 10% opacity)
 * 
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param offset - Wave animation offset
 * @param amplitude - Wave amplitude in pixels
 */
export function renderSinusTunnel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  offset: number,
  amplitude: number
): void {
  const centerY = height / 2;
  const config = GLITCH_VFX_CONFIG;

  ctx.save();

  // Draw guide path first (behind the main wave) - Requirements 5.5
  ctx.globalAlpha = config.guidePathOpacity;
  ctx.fillStyle = config.tunnelColor;

  ctx.beginPath();
  ctx.moveTo(0, centerY + amplitude + config.guidePathWidth / 2);

  // Draw top edge of guide path
  for (let x = 0; x <= width; x += 5) {
    const y = calculateWaveY(x, offset, amplitude, centerY);
    ctx.lineTo(x, y - config.guidePathWidth / 2);
  }

  // Draw bottom edge of guide path (reverse direction)
  for (let x = width; x >= 0; x -= 5) {
    const y = calculateWaveY(x, offset, amplitude, centerY);
    ctx.lineTo(x, y + config.guidePathWidth / 2);
  }

  ctx.closePath();
  ctx.fill();

  // Draw main wave line with glow - Requirements 5.3, 5.4
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = config.tunnelColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = config.tunnelColor;
  ctx.shadowBlur = config.tunnelGlowBlur;

  ctx.beginPath();
  for (let x = 0; x <= width; x += 2) {
    const y = calculateWaveY(x, offset, amplitude, centerY);
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Draw secondary glow line (thinner, brighter)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 5;

  ctx.beginPath();
  for (let x = 0; x <= width; x += 2) {
    const y = calculateWaveY(x, offset, amplitude, centerY);
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  ctx.restore();
}

// ============================================================================
// Static Noise Overlay - Requirements 8.1, 8.6
// ============================================================================

/**
 * Renders static noise overlay during Quantum Lock
 * Requirements 8.1: Random static noise lines (20% chance per frame)
 * Requirements 8.6: Reduce intensity gradually during exit
 * 
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param intensity - Noise intensity (0.0 to 1.0)
 */
export function renderStaticNoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  // Requirements 8.1: 20% chance per frame
  if (Math.random() > GLITCH_VFX_CONFIG.noiseLineChance * intensity) {
    return;
  }

  ctx.save();

  const lineCount = Math.floor(GLITCH_VFX_CONFIG.noiseLineCount * intensity);

  for (let i = 0; i < lineCount; i++) {
    const y = Math.random() * height;
    const lineWidth = Math.random() * width * 0.3 + width * 0.1;
    const startX = Math.random() * (width - lineWidth);

    // Random color from glitch palette
    const colorIndex = Math.floor(Math.random() * GLITCH_CONFIG.colors.length);
    ctx.strokeStyle = GLITCH_CONFIG.colors[colorIndex];
    ctx.globalAlpha = 0.3 * intensity;
    ctx.lineWidth = 1 + Math.random() * 2;

    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + lineWidth, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Gets the noise intensity based on current phase and progress
 * Requirements 8.6: Reduce intensity gradually during exit warning
 * 
 * @param phase - Current glitch mode phase
 * @param progress - Progress through Quantum Lock (0.0 to 1.0)
 * @returns Noise intensity (0.0 to 1.0)
 */
export function getNoiseIntensity(
  phase: GlitchPhase,
  progress: number
): number {
  switch (phase) {
    case 'active':
      return 1.0;
    case 'warning':
      // Gradually reduce from 1.0 to 0.5 during warning phase
      const warningProgress = (progress - 0.75) / 0.05; // 0.75 to 0.80
      return 1.0 - (warningProgress * 0.5);
    case 'exiting':
      // Continue reducing from 0.5 to 0.0 during exit
      const exitProgress = (progress - 0.80) / 0.20; // 0.80 to 1.0
      return 0.5 * (1 - exitProgress);
    case 'ghost':
    case 'inactive':
    default:
      return 0.0;
  }
}

// ============================================================================
// Screen Flash Effects - Requirements 8.3, 8.4
// ============================================================================

/**
 * Screen flash state for managing flash animations
 */
export interface ScreenFlashState {
  isActive: boolean;
  type: 'enter' | 'exit' | null;
  startTime: number;
  duration: number;
}

/**
 * Creates initial screen flash state
 */
export function createScreenFlashState(): ScreenFlashState {
  return {
    isActive: false,
    type: null,
    startTime: 0,
    duration: 0,
  };
}

/**
 * Triggers a screen flash effect
 * Requirements 8.3: White flash on enter (200ms)
 * Requirements 8.4: Fade out vignette on exit (500ms)
 * 
 * @param type - Type of flash ('enter' or 'exit')
 * @returns Updated screen flash state
 */
export function triggerScreenFlash(type: 'enter' | 'exit'): ScreenFlashState {
  const duration = type === 'enter'
    ? GLITCH_VFX_CONFIG.enterFlashDuration
    : GLITCH_VFX_CONFIG.exitFadeDuration;

  return {
    isActive: true,
    type,
    startTime: Date.now(),
    duration,
  };
}

/**
 * Updates screen flash state
 * 
 * @param state - Current screen flash state
 * @returns Updated state (deactivated if duration exceeded)
 */
export function updateScreenFlash(state: ScreenFlashState): ScreenFlashState {
  if (!state.isActive) return state;

  const elapsed = Date.now() - state.startTime;
  if (elapsed >= state.duration) {
    return createScreenFlashState();
  }

  return state;
}

/**
 * Gets the flash progress (0.0 to 1.0)
 * 
 * @param state - Current screen flash state
 * @returns Progress value
 */
export function getScreenFlashProgress(state: ScreenFlashState): number {
  if (!state.isActive) return 0;

  const elapsed = Date.now() - state.startTime;
  return Math.min(1, elapsed / state.duration);
}

/**
 * Renders screen flash overlay
 * Requirements 8.3: White flash on enter
 * Requirements 8.4: Fade out vignette on exit
 * 
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param state - Current screen flash state
 */
export function renderScreenFlash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: ScreenFlashState
): void {
  if (!state.isActive) return;

  const progress = getScreenFlashProgress(state);

  ctx.save();

  if (state.type === 'enter') {
    // Requirements 8.3: White flash that fades out
    // Peak at 50% progress, then fade
    let opacity: number;
    if (progress <= 0.5) {
      opacity = progress * 2; // 0 -> 1
    } else {
      opacity = (1 - progress) * 2; // 1 -> 0
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
    ctx.fillRect(0, 0, width, height);
  } else if (state.type === 'exit') {
    // Requirements 8.4: Vignette that fades out
    const vignetteOpacity = 1 - progress;

    // Create radial gradient for vignette
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, 'transparent');
    gradient.addColorStop(1, `rgba(0, 255, 0, ${vignetteOpacity * 0.3})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

// ============================================================================
// Connector Visual Effects - Requirements 4.5, 4.6, 7.5
// ============================================================================

/**
 * Connector render options for Quantum Lock and Ghost Mode
 */
export interface ConnectorRenderOptions {
  greenTint: boolean;          // Requirements 4.5: Green tint during Quantum Lock
  pulseScale: number;          // Requirements 4.6: Pulse animation scale (1.0 to 1.05)
  opacity: number;             // Requirements 7.5: Opacity (0.5 during Ghost Mode)
}

/**
 * Gets connector render options based on glitch mode state
 * Requirements 4.5: Green tint during Quantum Lock
 * Requirements 4.6: Pulse animation during Quantum Lock
 * Requirements 7.5: Semi-transparent during Ghost Mode
 * 
 * @param state - Current glitch mode state
 * @returns Connector render options
 */
export function getConnectorRenderOptions(state: GlitchModeState): ConnectorRenderOptions {
  const config = GLITCH_VFX_CONFIG;

  // Default options (normal gameplay)
  const options: ConnectorRenderOptions = {
    greenTint: false,
    pulseScale: 1.0,
    opacity: 1.0,
  };

  if (state.isActive) {
    // Requirements 4.5: Green tint during Quantum Lock
    options.greenTint = true;

    // Requirements 4.6: Pulse animation
    const pulseTime = Date.now() * config.connectorPulseSpeed;
    const pulseValue = (Math.sin(pulseTime) + 1) / 2; // 0 to 1
    options.pulseScale = config.connectorPulseMin +
      (config.connectorPulseMax - config.connectorPulseMin) * pulseValue;
  }

  if (state.phase === 'ghost') {
    // Requirements 7.5: Semi-transparent during Ghost Mode
    options.opacity = getGhostModeOpacity(state, true);
    options.greenTint = false; // No green tint during ghost mode
  }

  return options;
}

/**
 * Applies connector visual effects to the rendering context
 * Call before rendering the connector, restore context after
 * 
 * @param ctx - Canvas 2D rendering context
 * @param options - Connector render options
 * @param connectorColor - Base connector color
 * @returns Modified color to use for rendering
 */
export function applyConnectorEffects(
  ctx: CanvasRenderingContext2D,
  options: ConnectorRenderOptions,
  connectorColor: string
): string {
  ctx.save();

  // Apply opacity
  ctx.globalAlpha = options.opacity;

  // Apply glow if green tint is active
  if (options.greenTint) {
    ctx.shadowColor = GLITCH_VFX_CONFIG.connectorGreenTint;
    ctx.shadowBlur = 10;
    return GLITCH_VFX_CONFIG.connectorGreenTint;
  }

  return connectorColor;
}

/**
 * Restores context after connector rendering
 * 
 * @param ctx - Canvas 2D rendering context
 */
export function restoreConnectorEffects(ctx: CanvasRenderingContext2D): void {
  ctx.restore();
}

// ============================================================================
// Combined Glitch VFX Rendering
// ============================================================================

/**
 * Renders all Glitch Protocol visual effects for the current frame
 * 
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param state - Current glitch mode state
 * @param shard - Active Glitch Shard (or null)
 * @param screenFlash - Screen flash state
 */
export function renderGlitchVFX(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GlitchModeState,
  shard: GlitchShard | null,
  screenFlash: ScreenFlashState
): void {
  // Render Glitch Shard if present
  if (shard && shard.active) {
    renderGlitchShard(ctx, shard);
  }

  // Render Quantum Lock effects
  if (state.isActive || state.phase === 'warning' || state.phase === 'exiting') {
    const progress = getGlitchProgress(state);

    // Render sinus tunnel
    const amplitude = GLITCH_CONFIG.waveAmplitude * getWaveAmplitudeMultiplier(state.phase, progress);
    if (amplitude > 0) {
      renderSinusTunnel(ctx, width, height, state.waveOffset, amplitude);
    }

    // Render static noise
    const noiseIntensity = getNoiseIntensity(state.phase, progress);
    if (noiseIntensity > 0) {
      renderStaticNoise(ctx, width, height, noiseIntensity);
    }
  }

  // Render screen flash
  renderScreenFlash(ctx, width, height, screenFlash);
}

/**
 * Gets wave amplitude multiplier based on phase
 * Used for wave flattening during exit
 * 
 * @param phase - Current phase
 * @param progress - Progress through Quantum Lock
 * @returns Amplitude multiplier (0.0 to 1.0)
 */
function getWaveAmplitudeMultiplier(phase: GlitchPhase, progress: number): number {
  switch (phase) {
    case 'active':
      return 1.0;
    case 'warning':
      // Flatten wave during warning
      // Only flattened for consistency, user wants "Snake" movement for entry instead
      return 1.0;
    case 'exiting':
      // Flatten wave during exit
      const exitProgress = (progress - 0.80) / 0.20; // 0.80 to 1.0
      return 1.0 - exitProgress;
    case 'ghost':
      return 0.0; // No wave in ghost mode
    case 'inactive':
    default:
      return 0.0;
  }
}

// ============================================================================
// Cinematic Quantum Lock Visuals - Snake Wave & Fiery Midline (ULTRATHINK)
// ============================================================================

/**
 * Renders the "Snake Wave" animation with a professional "Tech Snake" head.
 * The wave is rendered only between tailX and headX, creating a slithering effect.
 *
 * @param ctx - Canvas context
 * @param headX - The leading edge of the snake (in screen X coordinates)
 * @param tailX - The trailing edge of the snake (in screen X coordinates)
 * @param width - Canvas width
 * @param height - Canvas height
 * @param state - Current glitch state
 */
export function renderDynamicWave(
  ctx: CanvasRenderingContext2D,
  headX: number,
  tailX: number,
  width: number,
  height: number,
  state: GlitchModeState
): void {
  // If snake is fully off-screen, don't draw
  if (headX > width + 200 && tailX > width) return; // Allow head to be slightly offscreen
  if (headX < -200 && tailX < 0) return;

  const waveAmplitude = 120; // Full amplitude
  const waveColor = '#00FF00'; // Matrix Green

  ctx.save();
  ctx.beginPath();

  // Create clipping region for the snake body
  const startX = Math.max(0, Math.min(headX, tailX));
  const endX = Math.min(width, Math.max(headX, tailX));

  if (endX - startX <= 0 && headX > width) {
    // Setup for potential offscreen head rendering if needed, 
    // but if segment is invisible and head is far, return.
    // Special handling: if head is just arriving, we might need to draw it even if path is short
  }

  // === 1. Draw The Wave Body (The "Snake") ===
  // We'll use a path for the sine wave
  for (let x = startX; x <= endX; x += 5) { // Higher resolution for smoothness
    const y = calculateWaveY(
      x,
      state.waveOffset,
      waveAmplitude,
      height / 2
    );
    if (x === startX) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  // Visual Styling: Neon Green "Laser" look
  ctx.strokeStyle = waveColor;
  ctx.lineWidth = 8;
  ctx.shadowColor = waveColor;
  ctx.shadowBlur = 25;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Inner core (white/bright green)
  ctx.strokeStyle = '#CCFFCC';
  ctx.lineWidth = 3;
  ctx.shadowBlur = 5;
  ctx.stroke();

  // === 2. Draw The "Tech Snake" Head ===
  // Only draw if head is within reasonable bounds (even slightly offscreen for entry)
  if (headX >= -100 && headX <= width + 100) {
    const centerY = height / 2;
    const headY = calculateWaveY(headX, state.waveOffset, waveAmplitude, centerY);

    // Calculate Wave Derivative/Slope to rotate the head
    // y = A * sin(kx + w) -> y' = A * k * cos(kx + w)
    // Or simple numeric derivative:
    const prevX = headX - 5;
    const prevY = calculateWaveY(prevX, state.waveOffset, waveAmplitude, centerY);
    const angle = Math.atan2(headY - prevY, headX - prevX);

    ctx.translate(headX, headY);
    ctx.rotate(angle);

    // --- Geometric Tech Head ---
    const headSize = 25;

    // Outer Shield/Carapace (Diamond Shape)
    ctx.beginPath();
    ctx.moveTo(10, 0); // Nose tip
    ctx.lineTo(-headSize, headSize * 0.6); // Top back
    ctx.lineTo(-headSize * 0.8, 0); // Center back notch
    ctx.lineTo(-headSize, -headSize * 0.6); // Bottom back
    ctx.closePath();

    ctx.fillStyle = '#003300';
    ctx.fill();
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 15;
    ctx.stroke();

    // Inner Reactor / Eye (Glowing Core)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-15, 6);
    ctx.lineTo(-15, -6);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 20;
    ctx.fill();

    // Scanner Beams (Cosmetic lines trails)
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#AAFFAA';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.lineTo(-40, 15); // Trail line 1
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-40, -15); // Trail line 2
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders the "Fiery Midline" warning effect - PROFESSIONAL VERSION.
 * Uses layered sine waves to create a "Plasma Fire" look instead of simple jitter.
 *
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param y - Midline Y position
 * @param intensity - 0.0 to 1.0 (how "strong" the fire is)
 */
export function renderFieryMidline(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  intensity: number
): void {
  if (intensity <= 0.01) return;

  const time = Date.now() * 0.01; // Slower, smoother time base

  ctx.save();

  // Create a "Plasma" look by summing sine waves
  // We want a line that ripples dangerously

  // Layer 1: The Core (Hot White/Yellow) - Fast, tight ripples
  ctx.beginPath();
  ctx.moveTo(0, y);
  for (let x = 0; x <= width; x += 10) {
    // Mix of 3 sine waves for "noise" look
    const noise = Math.sin(x * 0.05 + time * 5) * Math.sin(x * 0.01 - time * 2) * 2;
    const ripples = Math.sin(x * 0.2 + time * 10) * 3;
    const offset = (noise + ripples) * intensity;
    ctx.lineTo(x, y + offset);
  }
  ctx.lineWidth = 2 + intensity * 2;
  ctx.strokeStyle = `rgba(255, 255, 200, ${intensity})`; // Bright yellow/white
  ctx.shadowColor = '#FF4400';
  ctx.shadowBlur = 10 * intensity;
  ctx.stroke();

  // Layer 2: The Outer Flame (Red/Magenta) - Slower, wider swells
  ctx.beginPath();
  ctx.moveTo(0, y);
  for (let x = 0; x <= width; x += 20) {
    // Wider waves
    const swell = Math.sin(x * 0.02 + time * 2) * 10 * intensity; // Large slow swell
    const jitter = (Math.random() - 0.5) * 4 * intensity; // Slight static
    ctx.lineTo(x, y + swell + jitter);
  }
  ctx.lineWidth = 4 + intensity * 6; // Much thicker
  ctx.strokeStyle = `rgba(255, 0, 60, ${intensity * 0.6})`; // Deep Neon Red
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 30 * intensity; // Massive glow
  // Use 'screen' blend mode for fiery addition if possible, but standard alpha is safer for consistency
  ctx.stroke();

  // Layer 3: Warning Particles (Embers)
  if (intensity > 0.3) {
    const emberCount = Math.floor(width / 30 * intensity);
    ctx.fillStyle = '#FFDD00';
    for (let i = 0; i < emberCount; i++) {
      // Deterministic pseudo-random positions based on time slices to avoid "shimmering" too much
      // Actually, random is fine for embers
      if (Math.random() > 0.92) {
        const ex = Math.random() * width;
        const ey = y + (Math.random() - 0.5) * 60 * intensity;
        const size = Math.random() * 3 * intensity;
        ctx.globalAlpha = Math.random() * intensity;

        ctx.beginPath();
        ctx.arc(ex, ey, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

// ============================================================================
// Burn Effect State - Restored & Render Ambiance
// ============================================================================

export interface BurnEffectState {
  isActive: boolean;
  startTime: number;
  duration: number;
}

export function createBurnEffectState(): BurnEffectState {
  return {
    isActive: false,
    startTime: 0,
    duration: 0
  };
}

/**
 * Triggers a burn effect (screen distortion/red tint)
 * Used when player hits the yasakli hat (midline) during flux overload
 * 
 * @param duration - Duration of the effect in ms
 */
export function triggerBurnEffect(duration: number = 500): BurnEffectState {
  return {
    isActive: true,
    startTime: Date.now(),
    duration
  };
}

/**
 * Updates the burn effect state
 * 
 * @param state - Current burn effect state
 */
export function updateBurnEffect(state: BurnEffectState): BurnEffectState {
  if (!state.isActive) return state;

  const elapsed = Date.now() - state.startTime;
  if (elapsed >= state.duration) {
    return createBurnEffectState();
  }

  return state;
}

/**
 * Renders the burn effect overlay
 * 
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param state - Current burn effect state
 */
export function renderBurnEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: BurnEffectState
): void {
  if (!state.isActive) return;

  const elapsed = Date.now() - state.startTime;
  const progress = Math.min(1.0, elapsed / state.duration);
  const intensity = 1.0 - progress; // Fade out

  ctx.save();

  // Red tint overlay
  ctx.fillStyle = `rgba(255, 50, 0, ${intensity * 0.3})`;
  ctx.fillRect(0, 0, width, height);

  // Random noise/burn lines
  if (Math.random() < 0.5) {
    const lineCount = Math.floor(10 * intensity);
    ctx.strokeStyle = `rgba(255, 100, 0, ${intensity * 0.8})`;
    ctx.lineWidth = 2;

    for (let i = 0; i < lineCount; i++) {
      const y = Math.random() * height;
      const x = Math.random() * width;
      const len = Math.random() * 100;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Renders the Quantum Lock Ambiance (Vignette, Pulse, etc.)
 * 
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param state - Current glitch mode state
 */
export function renderQuantumLockAmbiance(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: GlitchModeState
): void {
  if (!state.isActive && state.phase !== 'charging') return;

  ctx.save();

  // Vignette Effect
  // Darkens the corners to focus attention
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, Math.max(width, height) * 0.4,
    width / 2, height / 2, Math.max(width, height) * 0.9
  );

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 50, 0, 0.4)'); // Dark Green Vignette

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Scanlines (Subtle)
  if (state.isActive) {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.05)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  ctx.restore();
}
