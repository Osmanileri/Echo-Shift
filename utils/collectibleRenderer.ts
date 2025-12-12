/**
 * Collectible Renderer - S.H.I.F.T. Protocol Visual Effects
 * Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3, 10.4
 * 
 * Provides rendering functions for:
 * - S.H.I.F.T. letter collectibles with Neon Cyan fill
 * - Rotating wireframe borders
 * - Collection particle burst effects
 * - S.H.I.F.T. HUD display
 * - Overdrive visual effects (Ying-Yang Core, shatter particles)
 * - Resonance visual effects (color inversion, enhanced particles)
 * - Restore visual effects (VHS static, rewind)
 */

import { Collectible, ShiftProtocolState } from '../types';
import { COLORS } from '../constants';
import * as ParticleSystem from '../systems/particleSystem';

// ============================================================================
// Constants
// ============================================================================

/** Neon Cyan color for S.H.I.F.T. letters - Requirements 2.1 */
export const NEON_CYAN = '#00F0FF';

/** Wireframe border rotation speed - Requirements 2.2 */
export const WIREFRAME_ROTATION_SPEED = 2; // radians per second

/** HUD letter opacity values - Requirements 2.3 */
export const HUD_COLLECTED_OPACITY = 1.0;
export const HUD_UNCOLLECTED_OPACITY = 0.3;

/** Overdrive visual constants - Requirements 10.1, 10.2, 10.3, 10.4 */
export const OVERDRIVE_PULSE_FREQUENCY = 2; // Hz - Requirements 10.1
export const OVERDRIVE_SHATTER_PARTICLE_COUNT = 20; // Requirements 10.2
export const OVERDRIVE_TIMER_FLASH_FREQUENCY = 4; // Hz - Requirements 10.3
export const OVERDRIVE_TIMER_WARNING_THRESHOLD = 3000; // 3 seconds in ms
export const OVERDRIVE_POWERDOWN_DURATION = 500; // ms - Requirements 10.4

/** Resonance visual constants - Requirements 6.1, 6.3, 6.4, 6.5 */
export const RESONANCE_SHAKE_INTENSITY_MULTIPLIER = 1.5; // +50% - Requirements 6.3
export const RESONANCE_PARTICLE_RATE_MULTIPLIER = 2.0; // +100% - Requirements 6.4
export const RESONANCE_COLOR_TRANSITION_DURATION = 500; // ms - Requirements 6.5

/** Restore visual constants - Requirements 8.9, 8.10 */
export const VHS_STATIC_INTENSITY = 0.3;
export const VHS_SCANLINE_COUNT = 100;

// ============================================================================
// Collectible Rendering - Requirements 2.1, 2.2, 2.4
// ============================================================================

/**
 * Renders a S.H.I.F.T. letter collectible
 * Requirements 2.1: Neon Cyan (#00F0FF) fill
 * Requirements 2.2: Rotating wireframe border at 2 rad/s
 * 
 * @param ctx - Canvas rendering context
 * @param collectible - The collectible to render
 * @param time - Current time in seconds (for animation)
 */
export function renderCollectible(
  ctx: CanvasRenderingContext2D,
  collectible: Collectible,
  time: number
): void {
  if (collectible.isCollected) return;

  const { x, y, value } = collectible;
  const radius = 20; // Hitbox radius

  ctx.save();
  ctx.translate(x, y);

  // Calculate rotation angle - Requirements 2.2
  const rotation = time * WIREFRAME_ROTATION_SPEED;

  // Draw rotating wireframe border - Requirements 2.2
  ctx.save();
  ctx.rotate(rotation);
  ctx.strokeStyle = NEON_CYAN;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  
  // Draw hexagonal wireframe
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const px = Math.cos(angle) * (radius + 5);
    const py = Math.sin(angle) * (radius + 5);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Draw glow effect
  ctx.shadowColor = NEON_CYAN;
  ctx.shadowBlur = 15;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = NEON_CYAN;
  ctx.fill();

  // Draw letter fill - Requirements 2.1
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = NEON_CYAN;
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, 0, 0);

  ctx.restore();
}

/**
 * Emits collection particle burst effect
 * Requirements 2.4: Collection particle burst effect at letter's position
 * 
 * @param x - X position of collected letter
 * @param y - Y position of collected letter
 */
export function emitCollectionBurst(x: number, y: number): void {
  // Use ParticleSystem for burst effect
  ParticleSystem.emitBurst(x, y, [NEON_CYAN, '#FFFFFF', '#00CCFF']);
}

// ============================================================================
// S.H.I.F.T. HUD Rendering - Requirements 2.3
// ============================================================================

/**
 * Renders the S.H.I.F.T. HUD showing collected/uncollected letters
 * Requirements 2.3: Display all 5 letters with collected at full opacity,
 * uncollected at 30% opacity
 * 
 * @param ctx - Canvas rendering context
 * @param state - Current S.H.I.F.T. Protocol state
 * @param x - X position for HUD
 * @param y - Y position for HUD
 */
export function renderShiftHUD(
  ctx: CanvasRenderingContext2D,
  state: ShiftProtocolState,
  x: number,
  y: number
): void {
  const letterSpacing = 30;
  const letters = state.targetWord;
  const collected = state.collectedMask;

  ctx.save();
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < letters.length; i++) {
    const letterX = x + i * letterSpacing;
    const isCollected = collected[i];

    // Set opacity based on collection status - Requirements 2.3
    ctx.globalAlpha = isCollected ? HUD_COLLECTED_OPACITY : HUD_UNCOLLECTED_OPACITY;

    // Add glow for collected letters
    if (isCollected) {
      ctx.shadowColor = NEON_CYAN;
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = NEON_CYAN;
    ctx.fillText(letters[i], letterX, y);
  }

  ctx.restore();
}


// ============================================================================
// Overdrive Visual Effects - Requirements 10.1, 10.2, 10.3, 10.4
// ============================================================================

/**
 * Renders the Ying-Yang Core during Overdrive mode
 * Requirements 10.1: Pulsing glow effect at 2Hz frequency
 * 
 * @param ctx - Canvas rendering context
 * @param x - X position of the core
 * @param y - Y position of the core
 * @param rotation - Current rotation angle
 * @param time - Current time in seconds (for pulsing animation)
 */
export function renderOverdriveCore(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  time: number
): void {
  const radius = 15;
  
  // Calculate pulsing glow intensity - Requirements 10.1
  const pulsePhase = time * OVERDRIVE_PULSE_FREQUENCY * Math.PI * 2;
  const pulseIntensity = 0.5 + 0.5 * Math.sin(pulsePhase);
  const glowRadius = radius + 10 + pulseIntensity * 10;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Draw pulsing glow - Requirements 10.1
  const gradient = ctx.createRadialGradient(0, 0, radius, 0, 0, glowRadius);
  gradient.addColorStop(0, `rgba(0, 240, 255, ${0.8 * pulseIntensity})`);
  gradient.addColorStop(0.5, `rgba(0, 240, 255, ${0.4 * pulseIntensity})`);
  gradient.addColorStop(1, 'rgba(0, 240, 255, 0)');
  
  ctx.beginPath();
  ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw Ying-Yang symbol
  // White half
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Black half
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI / 2, -Math.PI / 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  // Small circles
  ctx.beginPath();
  ctx.arc(0, -radius / 2, radius / 4, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, radius / 2, radius / 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Border
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = NEON_CYAN;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * Emits shatter particle effect when obstacle is destroyed during Overdrive
 * Requirements 10.2: Spawn 20 particles on obstacle destruction
 * 
 * @param x - X position of destroyed obstacle
 * @param y - Y position of destroyed obstacle
 * @param color - Color of the destroyed obstacle
 */
export function emitShatterEffect(x: number, y: number, color: string): void {
  // Emit 20 particles - Requirements 10.2
  const config: ParticleSystem.ParticleConfig = {
    count: OVERDRIVE_SHATTER_PARTICLE_COUNT,
    speed: { min: 5, max: 15 },
    size: { min: 3, max: 8 },
    life: { min: 0.5, max: 1.0 },
    colors: [color, NEON_CYAN, '#FFFFFF'],
    spread: Math.PI * 2,
    gravity: 0.2,
  };
  
  ParticleSystem.emit(x, y, config, 'burst');
}

/**
 * Renders the Overdrive HUD timer with warning flash
 * Requirements 10.3: Flash timer red at 4Hz when below 3 seconds
 * 
 * @param ctx - Canvas rendering context
 * @param remainingTime - Remaining Overdrive time in milliseconds
 * @param x - X position for timer display
 * @param y - Y position for timer display
 * @param time - Current time in seconds (for flash animation)
 */
export function renderOverdriveTimer(
  ctx: CanvasRenderingContext2D,
  remainingTime: number,
  x: number,
  y: number,
  time: number
): void {
  const seconds = Math.ceil(remainingTime / 1000);
  
  ctx.save();
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Determine color - Requirements 10.3
  let color = NEON_CYAN;
  if (remainingTime < OVERDRIVE_TIMER_WARNING_THRESHOLD) {
    // Flash red at 4Hz - Requirements 10.3
    const flashPhase = time * OVERDRIVE_TIMER_FLASH_FREQUENCY * Math.PI * 2;
    const flashOn = Math.sin(flashPhase) > 0;
    color = flashOn ? '#FF2A2A' : NEON_CYAN;
  }

  // Add glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.fillText(`${seconds}s`, x, y);

  ctx.restore();
}

/**
 * Calculates power-down transition factor
 * Requirements 10.4: 500ms transition back to normal orbs
 * 
 * @param timeSinceDeactivation - Time since Overdrive ended in milliseconds
 * @returns Transition factor (1.0 = full Overdrive, 0.0 = normal)
 */
export function calculatePowerDownTransition(timeSinceDeactivation: number): number {
  if (timeSinceDeactivation >= OVERDRIVE_POWERDOWN_DURATION) {
    return 0;
  }
  return 1 - (timeSinceDeactivation / OVERDRIVE_POWERDOWN_DURATION);
}

// ============================================================================
// Resonance Visual Effects - Requirements 6.1, 6.3, 6.4, 6.5
// ============================================================================

/**
 * Inverts a color for Resonance mode
 * Requirements 6.1: Black backgrounds become white, white becomes black
 * 
 * @param color - Hex color string
 * @returns Inverted hex color string
 */
export function invertColor(color: string): string {
  let hex = color.replace('#', '');
  
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  if (hex.length !== 6) return color;
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) return color;
  
  const invertedR = 255 - r;
  const invertedG = 255 - g;
  const invertedB = 255 - b;
  
  return `#${invertedR.toString(16).padStart(2, '0')}${invertedG.toString(16).padStart(2, '0')}${invertedB.toString(16).padStart(2, '0')}`;
}

/**
 * Interpolates between two colors for smooth transitions
 * Requirements 6.5: 500ms color transition on end
 * 
 * @param color1 - Starting color (hex)
 * @param color2 - Ending color (hex)
 * @param factor - Interpolation factor (0-1)
 * @returns Interpolated color (hex)
 */
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const t = Math.max(0, Math.min(1, factor));
  
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const h1 = hex1.length === 3 ? hex1[0] + hex1[0] + hex1[1] + hex1[1] + hex1[2] + hex1[2] : hex1;
  const h2 = hex2.length === 3 ? hex2[0] + hex2[0] + hex2[1] + hex2[1] + hex2[2] + hex2[2] : hex2;
  
  const r1 = parseInt(h1.substring(0, 2), 16);
  const g1 = parseInt(h1.substring(2, 4), 16);
  const b1 = parseInt(h1.substring(4, 6), 16);
  
  const r2 = parseInt(h2.substring(0, 2), 16);
  const g2 = parseInt(h2.substring(2, 4), 16);
  const b2 = parseInt(h2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Gets the color scheme based on Resonance state
 * Requirements 6.1: Color scheme inversion during Resonance
 * Requirements 6.5: Smooth 500ms transition on end
 * 
 * @param transitionFactor - Resonance transition factor (0 = normal, 1 = inverted)
 * @param baseColors - Base color scheme
 * @returns Modified color scheme
 */
export function getResonanceColorScheme(
  transitionFactor: number,
  baseColors: { topBg: string; bottomBg: string; topOrb: string; bottomOrb: string }
): { topBg: string; bottomBg: string; topOrb: string; bottomOrb: string } {
  if (transitionFactor === 0) return baseColors;
  
  const invertedColors = {
    topBg: invertColor(baseColors.topBg),
    bottomBg: invertColor(baseColors.bottomBg),
    topOrb: invertColor(baseColors.topOrb),
    bottomOrb: invertColor(baseColors.bottomOrb),
  };
  
  if (transitionFactor === 1) return invertedColors;
  
  // Interpolate for smooth transition - Requirements 6.5
  return {
    topBg: interpolateColor(baseColors.topBg, invertedColors.topBg, transitionFactor),
    bottomBg: interpolateColor(baseColors.bottomBg, invertedColors.bottomBg, transitionFactor),
    topOrb: interpolateColor(baseColors.topOrb, invertedColors.topOrb, transitionFactor),
    bottomOrb: interpolateColor(baseColors.bottomOrb, invertedColors.bottomOrb, transitionFactor),
  };
}

/**
 * Calculates enhanced screen shake intensity for Resonance
 * Requirements 6.3: Screen shake intensity +50%
 * 
 * @param baseIntensity - Base shake intensity
 * @param isResonanceActive - Whether Resonance mode is active
 * @returns Modified shake intensity
 */
export function getResonanceShakeIntensity(baseIntensity: number, isResonanceActive: boolean): number {
  if (!isResonanceActive) return baseIntensity;
  return baseIntensity * RESONANCE_SHAKE_INTENSITY_MULTIPLIER;
}

/**
 * Calculates enhanced particle emission rate for Resonance
 * Requirements 6.4: Particle emission rate +100%
 * 
 * @param baseRate - Base particle emission rate
 * @param isResonanceActive - Whether Resonance mode is active
 * @returns Modified emission rate
 */
export function getResonanceParticleRate(baseRate: number, isResonanceActive: boolean): number {
  if (!isResonanceActive) return baseRate;
  return baseRate * RESONANCE_PARTICLE_RATE_MULTIPLIER;
}

// ============================================================================
// Restore Visual Effects - Requirements 8.9, 8.10
// ============================================================================

/**
 * Renders VHS static effect for restore UI
 * Requirements 8.9: VHS static effect for restore UI
 * 
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param intensity - Effect intensity (0-1)
 */
export function renderVHSStatic(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number = VHS_STATIC_INTENSITY
): void {
  ctx.save();
  
  // Create static noise
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 255;
    const alpha = Math.random() * intensity * 255;
    
    data[i] = noise;     // R
    data[i + 1] = noise; // G
    data[i + 2] = noise; // B
    data[i + 3] = alpha; // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Add scanlines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  const scanlineSpacing = height / VHS_SCANLINE_COUNT;
  
  for (let y = 0; y < height; y += scanlineSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * Renders VHS rewind visual effect during restore
 * Requirements 8.10: VHS rewind visual effect during restore
 * 
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param progress - Rewind progress (0-1)
 */
export function renderVHSRewind(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number
): void {
  ctx.save();
  
  // Horizontal distortion bands
  const bandCount = 5;
  const bandHeight = height / bandCount;
  
  for (let i = 0; i < bandCount; i++) {
    const y = i * bandHeight;
    const offset = Math.sin(progress * Math.PI * 4 + i) * 20;
    
    // Draw distorted band
    ctx.fillStyle = `rgba(0, 240, 255, ${0.1 + Math.random() * 0.1})`;
    ctx.fillRect(offset, y, width, 2);
  }
  
  // Color separation effect (RGB shift)
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.3;
  
  // Red channel shift
  ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
  ctx.fillRect(-5 * progress, 0, width, height);
  
  // Blue channel shift
  ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
  ctx.fillRect(5 * progress, 0, width, height);
  
  // Tracking lines
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  
  const trackingY = (progress * height * 3) % height;
  ctx.beginPath();
  ctx.moveTo(0, trackingY);
  ctx.lineTo(width, trackingY);
  ctx.stroke();
  
  // "REWIND" text
  ctx.globalAlpha = 0.8 + Math.sin(progress * Math.PI * 8) * 0.2;
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('◀◀ REWIND', 10, 10);
  
  ctx.restore();
}

/**
 * Renders the restore prompt overlay with VHS styling
 * Requirements 8.9: VHS static effect for restore UI
 * 
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param cost - Restore cost in Echo Shards
 * @param balance - Player's current Echo Shards balance
 * @param canRestore - Whether restore is available
 */
export function renderRestorePromptOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cost: number,
  balance: number,
  canRestore: boolean
): void {
  ctx.save();
  
  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, width, height);
  
  // VHS static effect - Requirements 8.9
  renderVHSStatic(ctx, width, height, 0.15);
  
  // "SYSTEM CRASH" text
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#FF2A2A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#FF2A2A';
  ctx.shadowBlur = 20;
  ctx.fillText('SYSTEM CRASH', width / 2, height / 2 - 60);
  
  // Cost display
  ctx.shadowBlur = 0;
  ctx.font = '18px monospace';
  ctx.fillStyle = canRestore ? NEON_CYAN : '#666666';
  ctx.fillText(`RESTORE COST: ${cost} SHARDS`, width / 2, height / 2);
  
  // Balance display
  ctx.fillStyle = balance >= cost ? '#00FF00' : '#FF2A2A';
  ctx.fillText(`YOUR BALANCE: ${balance} SHARDS`, width / 2, height / 2 + 30);
  
  // Status message
  if (!canRestore) {
    ctx.fillStyle = '#FF2A2A';
    ctx.fillText('INSUFFICIENT SHARDS', width / 2, height / 2 + 70);
  }
  
  ctx.restore();
}
