/**
 * ConstructRenderer - Visual rendering for Echo Constructs
 * 
 * Provides sprite rendering for each construct type:
 * - Titan: Square shape, thick border, rotating core
 * - Phase: Thin rectangle, neon trail effect
 * - Blink: Flickering circle, ghost projection
 * 
 * Requirements:
 * - 3.5: WHILE Titan is active THEN the Render System SHALL display the mech-like Titan sprite
 * - 4.5: WHILE Phase Cycle is active THEN the Render System SHALL display a light-cycle sprite with trailing light effect
 * - 5.6: WHILE Blink Node is active THEN the Render System SHALL display a holographic node sprite with ghost projection
 */

import type { ConstructType } from '../../types';

/**
 * Configuration for construct rendering
 */
export const CONSTRUCT_RENDER_CONFIG = {
  /** Titan Resonance - Heavy mech appearance */
  TITAN: {
    /** Core rotation speed (radians per second) */
    coreRotationSpeed: 2.0,
    /** Border thickness multiplier */
    borderThickness: 4,
    /** Primary color */
    primaryColor: '#FF6600',
    /** Secondary color (core) */
    secondaryColor: '#FFAA00',
    /** Glow color */
    glowColor: '#FF4400',
    /** Size multiplier relative to orb radius */
    sizeMultiplier: 1.3,
  },
  /** Phase Cycle - Light cycle appearance */
  PHASE: {
    /** Trail length in pixels */
    trailLength: 80,
    /** Trail fade speed */
    trailFadeSpeed: 0.05,
    /** Primary color */
    primaryColor: '#00FFFF',
    /** Secondary color (trail) */
    secondaryColor: '#0088FF',
    /** Glow color */
    glowColor: '#00FFFF',
    /** Width multiplier (thin rectangle) */
    widthMultiplier: 0.6,
    /** Height multiplier */
    heightMultiplier: 1.4,
  },
  /** Blink Node - Holographic appearance */
  BLINK: {
    /** Flicker frequency (Hz) */
    flickerFrequency: 8,
    /** Ghost opacity */
    ghostOpacity: 0.5,
    /** Primary color */
    primaryColor: '#FF00FF',
    /** Secondary color (ghost) */
    secondaryColor: '#AA00FF',
    /** Glow color */
    glowColor: '#FF00FF',
    /** Flicker intensity range */
    flickerIntensity: 0.3,
  },
} as const;

/**
 * State for construct rendering animations
 */
export interface ConstructRenderState {
  /** Titan core rotation angle (radians) */
  titanCoreRotation: number;
  /** Phase trail positions */
  phaseTrailPositions: Array<{ x: number; y: number; alpha: number }>;
  /** Blink flicker phase */
  blinkFlickerPhase: number;
  /** Last update timestamp */
  lastUpdateTime: number;
}

/**
 * Create initial render state
 */
export function createConstructRenderState(): ConstructRenderState {
  return {
    titanCoreRotation: 0,
    phaseTrailPositions: [],
    blinkFlickerPhase: 0,
    lastUpdateTime: Date.now(),
  };
}

/**
 * Update construct render state
 * @param state - Current render state
 * @param deltaTime - Time since last frame in milliseconds
 * @param playerX - Current player X position
 * @param playerY - Current player Y position
 * @returns Updated render state
 */
export function updateConstructRenderState(
  state: ConstructRenderState,
  deltaTime: number,
  playerX: number,
  playerY: number
): ConstructRenderState {
  const dt = deltaTime / 1000; // Convert to seconds
  
  // Update Titan core rotation
  const newTitanRotation = state.titanCoreRotation + CONSTRUCT_RENDER_CONFIG.TITAN.coreRotationSpeed * dt;
  
  // Update Phase trail
  const newTrailPositions = [...state.phaseTrailPositions];
  // Add current position to trail
  newTrailPositions.unshift({ x: playerX, y: playerY, alpha: 1.0 });
  // Fade and remove old positions
  for (let i = newTrailPositions.length - 1; i >= 0; i--) {
    newTrailPositions[i].alpha -= CONSTRUCT_RENDER_CONFIG.PHASE.trailFadeSpeed;
    if (newTrailPositions[i].alpha <= 0) {
      newTrailPositions.splice(i, 1);
    }
  }
  // Limit trail length
  while (newTrailPositions.length > 20) {
    newTrailPositions.pop();
  }
  
  // Update Blink flicker phase
  const newBlinkPhase = state.blinkFlickerPhase + CONSTRUCT_RENDER_CONFIG.BLINK.flickerFrequency * dt * Math.PI * 2;
  
  return {
    titanCoreRotation: newTitanRotation % (Math.PI * 2),
    phaseTrailPositions: newTrailPositions,
    blinkFlickerPhase: newBlinkPhase % (Math.PI * 2),
    lastUpdateTime: Date.now(),
  };
}

/**
 * Render Titan Resonance construct
 * Requirements 3.5: Display mech-like Titan sprite with shockwave particles on stomp
 * 
 * @param ctx - Canvas 2D rendering context
 * @param x - Center X position
 * @param y - Center Y position
 * @param radius - Base orb radius
 * @param rotation - Core rotation angle
 * @param isInvulnerable - Whether currently invulnerable
 */
export function renderTitan(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rotation: number,
  isInvulnerable: boolean
): void {
  const config = CONSTRUCT_RENDER_CONFIG.TITAN;
  const size = radius * config.sizeMultiplier;
  
  ctx.save();
  
  // Invulnerability flash effect
  const flashAlpha = isInvulnerable ? 0.5 + 0.5 * Math.sin(Date.now() * 0.02) : 1.0;
  ctx.globalAlpha = flashAlpha;
  
  // Outer glow
  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = 20;
  
  // Draw square body (mech-like)
  ctx.fillStyle = config.primaryColor;
  ctx.strokeStyle = config.secondaryColor;
  ctx.lineWidth = config.borderThickness;
  
  // Rotate around center for the square
  ctx.translate(x, y);
  
  // Draw outer square
  ctx.beginPath();
  ctx.rect(-size, -size, size * 2, size * 2);
  ctx.fill();
  ctx.stroke();
  
  // Draw rotating inner core
  ctx.save();
  ctx.rotate(rotation);
  
  // Inner diamond shape (rotating core)
  ctx.fillStyle = config.secondaryColor;
  ctx.beginPath();
  const coreSize = size * 0.6;
  ctx.moveTo(0, -coreSize);
  ctx.lineTo(coreSize, 0);
  ctx.lineTo(0, coreSize);
  ctx.lineTo(-coreSize, 0);
  ctx.closePath();
  ctx.fill();
  
  // Core center glow
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 0.5);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(0.5, config.secondaryColor);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, coreSize * 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
  
  // Corner accents (mech details)
  ctx.fillStyle = config.secondaryColor;
  const cornerSize = size * 0.2;
  const corners = [
    [-size, -size],
    [size - cornerSize, -size],
    [-size, size - cornerSize],
    [size - cornerSize, size - cornerSize],
  ];
  corners.forEach(([cx, cy]) => {
    ctx.fillRect(cx, cy, cornerSize, cornerSize);
  });
  
  ctx.restore();
}

/**
 * Render Phase Cycle construct
 * Requirements 4.5: Display light-cycle sprite with trailing light effect
 * 
 * @param ctx - Canvas 2D rendering context
 * @param x - Center X position
 * @param y - Center Y position
 * @param radius - Base orb radius
 * @param trailPositions - Trail position history
 * @param isInvulnerable - Whether currently invulnerable
 * @param gravityDirection - Current gravity direction (1 = down, -1 = up)
 */
export function renderPhase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  trailPositions: Array<{ x: number; y: number; alpha: number }>,
  isInvulnerable: boolean,
  gravityDirection: number = 1
): void {
  const config = CONSTRUCT_RENDER_CONFIG.PHASE;
  const width = radius * config.widthMultiplier;
  const height = radius * config.heightMultiplier;
  
  ctx.save();
  
  // Invulnerability flash effect
  const flashAlpha = isInvulnerable ? 0.5 + 0.5 * Math.sin(Date.now() * 0.02) : 1.0;
  ctx.globalAlpha = flashAlpha;
  
  // Draw neon trail
  if (trailPositions.length > 1) {
    ctx.beginPath();
    ctx.moveTo(trailPositions[0].x, trailPositions[0].y);
    
    for (let i = 1; i < trailPositions.length; i++) {
      const pos = trailPositions[i];
      ctx.lineTo(pos.x, pos.y);
    }
    
    // Trail gradient
    const trailGradient = ctx.createLinearGradient(
      x, y,
      trailPositions[trailPositions.length - 1]?.x || x,
      trailPositions[trailPositions.length - 1]?.y || y
    );
    trailGradient.addColorStop(0, config.primaryColor);
    trailGradient.addColorStop(1, 'transparent');
    
    ctx.strokeStyle = trailGradient;
    ctx.lineWidth = width * 0.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = config.glowColor;
    ctx.shadowBlur = 15;
    ctx.stroke();
  }
  
  // Draw main body (thin rectangle)
  ctx.translate(x, y);
  
  // Rotate based on gravity direction
  if (gravityDirection < 0) {
    ctx.rotate(Math.PI);
  }
  
  // Outer glow
  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = 20;
  
  // Main body
  ctx.fillStyle = config.primaryColor;
  ctx.beginPath();
  ctx.roundRect(-width, -height, width * 2, height * 2, 5);
  ctx.fill();
  
  // Inner glow line
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -height * 0.8);
  ctx.lineTo(0, height * 0.8);
  ctx.stroke();
  
  // Edge highlights
  ctx.strokeStyle = config.secondaryColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-width, -height, width * 2, height * 2, 5);
  ctx.stroke();
  
  ctx.restore();
}

/**
 * Render Blink Node construct
 * Requirements 5.6: Display holographic node sprite with ghost projection
 * 
 * @param ctx - Canvas 2D rendering context
 * @param x - Center X position
 * @param y - Center Y position
 * @param radius - Base orb radius
 * @param flickerPhase - Current flicker animation phase
 * @param ghostY - Ghost projection Y position (null if not dragging)
 * @param isInvulnerable - Whether currently invulnerable
 */
export function renderBlink(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  flickerPhase: number,
  ghostY: number | null,
  isInvulnerable: boolean
): void {
  const config = CONSTRUCT_RENDER_CONFIG.BLINK;
  
  ctx.save();
  
  // Calculate flicker intensity
  const flickerValue = Math.sin(flickerPhase) * config.flickerIntensity;
  const baseAlpha = 0.7 + flickerValue;
  
  // Invulnerability flash effect
  const flashAlpha = isInvulnerable ? 0.5 + 0.5 * Math.sin(Date.now() * 0.02) : 1.0;
  ctx.globalAlpha = baseAlpha * flashAlpha;
  
  // Draw ghost projection if dragging
  if (ghostY !== null) {
    ctx.save();
    ctx.globalAlpha = config.ghostOpacity * flashAlpha;
    
    // Ghost glow
    ctx.shadowColor = config.secondaryColor;
    ctx.shadowBlur = 25;
    
    // Ghost circle (dashed outline)
    ctx.strokeStyle = config.secondaryColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x, ghostY, radius * 1.2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Ghost fill
    const ghostGradient = ctx.createRadialGradient(x, ghostY, 0, x, ghostY, radius);
    ghostGradient.addColorStop(0, config.secondaryColor + '80');
    ghostGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = ghostGradient;
    ctx.beginPath();
    ctx.arc(x, ghostY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Connection line between main and ghost
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = config.primaryColor + '60';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, ghostY);
    ctx.stroke();
    
    ctx.restore();
  }
  
  // Main body glow
  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = 20 + flickerValue * 10;
  
  // Outer ring (flickering)
  ctx.strokeStyle = config.primaryColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2);
  ctx.stroke();
  
  // Inner circle with holographic effect
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(0.3, config.primaryColor);
  gradient.addColorStop(0.7, config.secondaryColor);
  gradient.addColorStop(1, config.primaryColor + '80');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Scan lines effect (holographic)
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = -radius; i < radius; i += 4) {
    const lineY = y + i + (Date.now() * 0.05) % 4;
    ctx.beginPath();
    ctx.moveTo(x - radius, lineY);
    ctx.lineTo(x + radius, lineY);
    ctx.stroke();
  }
  ctx.restore();
  
  // Center dot
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Render the appropriate construct based on type
 * 
 * @param ctx - Canvas 2D rendering context
 * @param constructType - Current construct type
 * @param x - Center X position
 * @param y - Center Y position
 * @param radius - Base orb radius
 * @param renderState - Current render state
 * @param isInvulnerable - Whether currently invulnerable
 * @param ghostY - Ghost Y position for Blink (null if not dragging)
 * @param gravityDirection - Gravity direction for Phase (1 = down, -1 = up)
 */
export function renderConstruct(
  ctx: CanvasRenderingContext2D,
  constructType: ConstructType,
  x: number,
  y: number,
  radius: number,
  renderState: ConstructRenderState,
  isInvulnerable: boolean,
  ghostY: number | null = null,
  gravityDirection: number = 1
): void {
  switch (constructType) {
    case 'TITAN':
      renderTitan(ctx, x, y, radius, renderState.titanCoreRotation, isInvulnerable);
      break;
    case 'PHASE':
      renderPhase(ctx, x, y, radius, renderState.phaseTrailPositions, isInvulnerable, gravityDirection);
      break;
    case 'BLINK':
      renderBlink(ctx, x, y, radius, renderState.blinkFlickerPhase, ghostY, isInvulnerable);
      break;
    case 'NONE':
    default:
      // No special rendering for base form
      break;
  }
}

/**
 * Render Titan stomp shockwave effect
 * 
 * @param ctx - Canvas 2D rendering context
 * @param x - Center X position
 * @param y - Center Y position
 * @param progress - Animation progress (0-1)
 */
export function renderTitanStompShockwave(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number
): void {
  const config = CONSTRUCT_RENDER_CONFIG.TITAN;
  const maxRadius = 100;
  const currentRadius = maxRadius * progress;
  const alpha = 1 - progress;
  
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = config.glowColor;
  ctx.lineWidth = 4 * (1 - progress);
  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = 15;
  
  // Expanding ring
  ctx.beginPath();
  ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
  ctx.stroke();
  
  // Inner ring
  ctx.beginPath();
  ctx.arc(x, y, currentRadius * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}
