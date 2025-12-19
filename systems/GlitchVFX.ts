/**
 * Glitch Protocol Visual Effects System
 * 
 * Provides rendering functions for Glitch Protocol visual effects:
 * - Glitch Shard rendering (jitter, color flicker, distorted polygon, static noise)
 * - Sinus Tunnel rendering (matrix green wave, glow, guide path)
 * - Static noise overlay
 * - Screen flash effects
 * - Connector visual effects during Quantum Lock and Ghost Mode
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
 * Renders a Glitch Shard with all visual effects
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
 * Requirements 8.6: Reduce intensity during exit warning
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
    case 'warning':
      return 1.0;
    case 'exiting':
      // Flatten from 80% to 100%
      const flattenProgress = (progress - 0.80) / 0.20;
      return Math.max(0, 1.0 - flattenProgress);
    default:
      return 0.0;
  }
}

// ============================================================================
// Quantum Lock Ambiance VFX - Atmospheric Effects
// ============================================================================

/**
 * Renders edge vignette during Quantum Lock for dangerous atmosphere
 * Creates dark green tinted corners that pulse with the wave
 * 
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param intensity - Effect intensity (0.0 to 1.0)
 * @param pulse - Pulse value (0.0 to 1.0) synchronized with wave
 */
export function renderQuantumLockVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  pulse: number = 0.5
): void {
  if (intensity <= 0) return;

  const config = GLITCH_CONFIG.ambiance;
  const pulseIntensity = intensity * (0.85 + 0.15 * pulse);

  ctx.save();

  // Create radial gradient for vignette from edges
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.25,  // Inner circle (clear)
    width / 2, height / 2, Math.max(width, height) * 0.85  // Outer circle (dark)
  );

  const [r, g, b] = config.vignetteColor;
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${pulseIntensity * 0.3})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${pulseIntensity * config.vignetteIntensity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Renders CRT scanlines for retro/digital atmosphere
 * 
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param intensity - Effect intensity (0.0 to 1.0)
 */
export function renderQuantumLockScanlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  if (intensity <= 0) return;

  const config = GLITCH_CONFIG.ambiance;
  const opacity = config.scanlineOpacity * intensity;

  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;

  // Draw horizontal scanlines
  for (let y = 0; y < height; y += config.scanlineSpacing) {
    ctx.fillRect(0, y, width, 1);
  }

  ctx.restore();
}

/**
 * Renders danger pulse overlay - subtle red pulse for tension
 * 
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param intensity - Effect intensity (0.0 to 1.0)
 * @param pulse - Pulse value (0.0 to 1.0)
 */
export function renderQuantumLockDangerPulse(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  pulse: number
): void {
  if (intensity <= 0) return;

  const config = GLITCH_CONFIG.ambiance;
  const pulseOpacity = config.dangerPulseIntensity * intensity * pulse;

  if (pulseOpacity <= 0.01) return;

  ctx.save();

  // Edge glow effect - danger from the edges
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.4,
    width / 2, height / 2, Math.max(width, height)
  );
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
  gradient.addColorStop(0.6, 'rgba(255, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(255, 42, 42, ${pulseOpacity})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Renders all Quantum Lock ambiance effects
 * Combines vignette, scanlines, and danger pulse for full atmosphere
 * 
 * @param ctx - Canvas 2D rendering context
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
  if (!state.isActive && state.phase !== 'warning' && state.phase !== 'exiting') {
    return;
  }

  const progress = getGlitchProgress(state);
  const config = GLITCH_CONFIG.ambiance;

  // Calculate intensity based on phase
  let intensity = 1.0;
  if (state.phase === 'exiting') {
    intensity = 1.0 - ((progress - 0.80) / 0.20);
  }

  // Sync pulse with wave offset for cohesive feel
  const pulse = (Math.sin(state.waveOffset * 2) + 1) / 2;

  // Background darkening overlay - creates the distinct atmosphere
  ctx.save();
  const darkenAmount = (config.backgroundDarken || 0.3) * intensity;
  ctx.fillStyle = `rgba(0, 0, 0, ${darkenAmount})`;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Electric glow border around screen edges
  ctx.save();
  const glowColor = config.glowColor || [0, 255, 200];
  const glowIntensity = 0.3 * intensity * (0.7 + 0.3 * pulse);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `rgba(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}, ${glowIntensity})`);
  gradient.addColorStop(0.1, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}, ${glowIntensity})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Render all ambiance layers
  renderQuantumLockVignette(ctx, width, height, intensity, pulse);
  renderQuantumLockScanlines(ctx, width, height, intensity);

  // Danger pulse in warning/exiting phases AND subtle pulse always for atmosphere
  if (state.phase === 'warning' || state.phase === 'exiting') {
    const dangerPulse = (Math.sin(Date.now() * 0.01) + 1) / 2;
    renderQuantumLockDangerPulse(ctx, width, height, intensity, dangerPulse);
  } else {
    // Subtle cyan pulse for active phase
    const subtlePulse = (Math.sin(Date.now() * 0.005) + 1) / 2;
    ctx.save();
    ctx.fillStyle = `rgba(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}, ${0.03 * subtlePulse * intensity})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

// ============================================================================
// Burn Effect - Midline Collision Failure
// ============================================================================

/**
 * Burn effect state for tracking animation
 */
export interface BurnEffectState {
  isActive: boolean;
  startTime: number;
  duration: number;
}

/**
 * Creates initial burn effect state
 */
export function createBurnEffectState(): BurnEffectState {
  return {
    isActive: false,
    startTime: 0,
    duration: 300,
  };
}

/**
 * Triggers burn effect when Quantum Lock ends from too many hits
 */
export function triggerBurnEffect(): BurnEffectState {
  return {
    isActive: true,
    startTime: Date.now(),
    duration: GLITCH_CONFIG.midlineCollision.burnEffectDuration,
  };
}

/**
 * Updates burn effect state
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
 * Renders burn effect - red/orange flash when Quantum Lock fails
 * 
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param state - Burn effect state
 */
export function renderBurnEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: BurnEffectState
): void {
  if (!state.isActive) return;

  const elapsed = Date.now() - state.startTime;
  const progress = Math.min(1, elapsed / state.duration);

  // Peak intensity at 30%, then fade out
  let intensity: number;
  if (progress < 0.3) {
    intensity = progress / 0.3;
  } else {
    intensity = (1 - progress) / 0.7;
  }

  ctx.save();

  // Red/orange gradient from center
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.8
  );
  gradient.addColorStop(0, `rgba(255, 100, 0, ${intensity * 0.6})`);
  gradient.addColorStop(0.3, `rgba(255, 50, 0, ${intensity * 0.4})`);
  gradient.addColorStop(0.7, `rgba(255, 0, 0, ${intensity * 0.2})`);
  gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Renders midline hit indicator - flash when orb touches wave
 * 
 * @param ctx - Canvas 2D rendering context
 * @param x - Hit X position
 * @param y - Hit Y position
 * @param hitCount - Current hit count
 * @param maxHits - Maximum hits allowed
 */
export function renderMidlineHitIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hitCount: number,
  maxHits: number
): void {
  ctx.save();

  // Red spark at hit location
  const pulseSize = 30 + Math.sin(Date.now() * 0.02) * 10;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, pulseSize);
  gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.4)');
  gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
  ctx.fill();

  // Hit counter text
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#FF4444';
  ctx.textAlign = 'center';
  ctx.fillText(`${hitCount}/${maxHits}`, x, y - 40);

  ctx.restore();
}

