/**
 * SecondChanceVFX - Visual effects for Second Chance mechanic
 * 
 * Provides destruction effects:
 * - Construct explosion particles
 * - Smart Bomb shockwave
 * - Heavy screen shake (300ms)
 * - Invincibility flashing
 * 
 * Requirements:
 * - 6.4: WHEN a Construct is destroyed THEN the VFX System SHALL play explosion particles and screen shake
 * - 6.6: WHEN in Base Form with invincibility active THEN the Render System SHALL display flashing/transparency effect
 * - 6.8: WHEN Smart Bomb activates THEN the VFX System SHALL display expanding shockwave effect
 */

import * as ParticleSystem from '../particleSystem';
import * as ScreenShake from '../screenShake';

/**
 * Configuration for Second Chance VFX
 */
export const SECOND_CHANCE_VFX_CONFIG = {
  /** Heavy screen shake duration in milliseconds */
  shakeDuration: 300,
  /** Screen shake intensity */
  shakeIntensity: 20,
  /** Explosion particle count */
  explosionParticleCount: 36,
  /** Smart Bomb shockwave duration in milliseconds */
  shockwaveDuration: 400,
  /** Smart Bomb shockwave max radius */
  shockwaveMaxRadius: 500,
  /** Invincibility flash frequency (Hz) */
  invincibilityFlashFrequency: 8,
  /** Explosion colors */
  explosionColors: ['#FF0000', '#FF6600', '#FFAA00', '#FFFFFF'],
  /** Shockwave color */
  shockwaveColor: '#00FFFF',
} as const;

/**
 * State for Second Chance VFX
 */
export interface SecondChanceVFXState {
  /** Whether explosion VFX is active */
  explosionActive: boolean;
  /** Explosion start time */
  explosionStartTime: number;
  /** Explosion position */
  explosionPosition: { x: number; y: number };
  /** Whether shockwave is active */
  shockwaveActive: boolean;
  /** Shockwave start time */
  shockwaveStartTime: number;
  /** Shockwave position */
  shockwavePosition: { x: number; y: number };
  /** Shockwave progress (0-1) */
  shockwaveProgress: number;
}

/**
 * Create initial Second Chance VFX state
 */
export function createSecondChanceVFXState(): SecondChanceVFXState {
  return {
    explosionActive: false,
    explosionStartTime: 0,
    explosionPosition: { x: 0, y: 0 },
    shockwaveActive: false,
    shockwaveStartTime: 0,
    shockwavePosition: { x: 0, y: 0 },
    shockwaveProgress: 0,
  };
}

/**
 * Trigger Second Chance explosion VFX
 * Requirements 6.4: Play explosion particles and screen shake
 * 
 * @param state - Current VFX state
 * @param x - X position of explosion
 * @param y - Y position of explosion
 * @param currentTime - Current timestamp
 * @returns Updated VFX state
 */
export function triggerExplosion(
  state: SecondChanceVFXState,
  x: number,
  y: number,
  currentTime: number
): SecondChanceVFXState {
  const config = SECOND_CHANCE_VFX_CONFIG;

  // Trigger heavy screen shake
  ScreenShake.trigger({
    intensity: config.shakeIntensity,
    duration: config.shakeDuration,
    frequency: 25,
    decay: true,
  });

  // Emit explosion particles - multiple waves
  // Wave 1: Fast outward burst
  ParticleSystem.emit(x, y, {
    count: config.explosionParticleCount,
    speed: { min: 8, max: 20 },
    size: { min: 4, max: 10 },
    life: { min: 0.4, max: 0.8 },
    colors: config.explosionColors,
    spread: Math.PI * 2,
    gravity: 0.1,
  }, 'burst');

  // Wave 2: Slower debris
  setTimeout(() => {
    ParticleSystem.emit(x, y, {
      count: Math.floor(config.explosionParticleCount / 2),
      speed: { min: 3, max: 8 },
      size: { min: 2, max: 6 },
      life: { min: 0.6, max: 1.0 },
      colors: config.explosionColors,
      spread: Math.PI * 2,
      gravity: 0.2,
    }, 'burst');
  }, 50);

  // Wave 3: Sparks
  setTimeout(() => {
    ParticleSystem.emit(x, y, {
      count: Math.floor(config.explosionParticleCount / 3),
      speed: { min: 10, max: 25 },
      size: { min: 1, max: 3 },
      life: { min: 0.2, max: 0.4 },
      colors: ['#FFFFFF', '#FFFF00'],
      spread: Math.PI * 2,
      gravity: 0.05,
    }, 'spark');
  }, 100);

  return {
    ...state,
    explosionActive: true,
    explosionStartTime: currentTime,
    explosionPosition: { x, y },
  };
}

/**
 * Trigger Smart Bomb shockwave VFX
 * Requirements 6.8: Display expanding shockwave effect
 * 
 * @param state - Current VFX state
 * @param x - X position of shockwave center
 * @param y - Y position of shockwave center
 * @param currentTime - Current timestamp
 * @returns Updated VFX state
 */
export function triggerShockwave(
  state: SecondChanceVFXState,
  x: number,
  y: number,
  currentTime: number
): SecondChanceVFXState {
  return {
    ...state,
    shockwaveActive: true,
    shockwaveStartTime: currentTime,
    shockwavePosition: { x, y },
    shockwaveProgress: 0,
  };
}

/**
 * Trigger both explosion and shockwave (full Second Chance effect)
 * 
 * @param state - Current VFX state
 * @param x - X position
 * @param y - Y position
 * @param currentTime - Current timestamp
 * @returns Updated VFX state
 */
export function triggerSecondChance(
  state: SecondChanceVFXState,
  x: number,
  y: number,
  currentTime: number
): SecondChanceVFXState {
  let newState = triggerExplosion(state, x, y, currentTime);
  newState = triggerShockwave(newState, x, y, currentTime);
  return newState;
}

/**
 * Update Second Chance VFX state
 * 
 * @param state - Current VFX state
 * @param currentTime - Current timestamp
 * @returns Updated VFX state
 */
export function updateSecondChanceVFX(
  state: SecondChanceVFXState,
  currentTime: number
): SecondChanceVFXState {
  const config = SECOND_CHANCE_VFX_CONFIG;
  let newState = { ...state };

  // Update explosion state
  if (state.explosionActive) {
    const explosionElapsed = currentTime - state.explosionStartTime;
    if (explosionElapsed > config.shakeDuration) {
      newState.explosionActive = false;
    }
  }

  // Update shockwave state
  if (state.shockwaveActive) {
    const shockwaveElapsed = currentTime - state.shockwaveStartTime;
    const progress = Math.min(1, shockwaveElapsed / config.shockwaveDuration);

    newState.shockwaveProgress = progress;

    if (progress >= 1) {
      newState.shockwaveActive = false;
    }
  }

  return newState;
}

/**
 * Render Second Chance VFX
 * 
 * @param ctx - Canvas 2D rendering context
 * @param state - Current VFX state
 */
export function renderSecondChanceVFX(
  ctx: CanvasRenderingContext2D,
  state: SecondChanceVFXState
): void {
  const config = SECOND_CHANCE_VFX_CONFIG;

  // Render shockwave
  if (state.shockwaveActive) {
    const { x, y } = state.shockwavePosition;
    const progress = state.shockwaveProgress;
    const currentRadius = config.shockwaveMaxRadius * progress;
    const alpha = 1 - progress;

    ctx.save();

    // Outer ring
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = config.shockwaveColor;
    ctx.lineWidth = 6 * (1 - progress);
    ctx.shadowColor = config.shockwaveColor;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = 3 * (1 - progress);
    ctx.beginPath();
    ctx.arc(x, y, currentRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Fill gradient
    ctx.globalAlpha = alpha * 0.2;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.7, config.shockwaveColor + '40');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Render explosion flash (brief white flash at center)
  if (state.explosionActive) {
    const elapsed = Date.now() - state.explosionStartTime;
    if (elapsed < 100) {
      const { x, y } = state.explosionPosition;
      const flashAlpha = 1 - (elapsed / 100);
      const flashRadius = 50 + elapsed * 0.5;

      ctx.save();
      ctx.globalAlpha = flashAlpha * 0.6;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, flashRadius);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.5, '#FF6600');
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, flashRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

/**
 * Render invincibility flashing effect
 * Requirements 6.6: Display flashing/transparency effect during invincibility
 * 
 * @param ctx - Canvas 2D rendering context
 * @param x - X position
 * @param y - Y position
 * @param radius - Orb radius
 * @param remainingTime - Remaining invincibility time in ms
 */
export function renderInvincibilityFlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  remainingTime: number
): void {
  const config = SECOND_CHANCE_VFX_CONFIG;
  const currentTime = Date.now();

  // Calculate flash intensity based on time
  const flashPhase = currentTime * config.invincibilityFlashFrequency * 0.001 * Math.PI * 2;
  const flashIntensity = 0.3 + 0.4 * Math.sin(flashPhase);

  // Increase flash frequency as invincibility runs out
  const urgencyFactor = remainingTime < 500 ? 2 : 1;
  const urgentFlashPhase = currentTime * config.invincibilityFlashFrequency * urgencyFactor * 0.001 * Math.PI * 2;
  const urgentFlashIntensity = 0.3 + 0.4 * Math.sin(urgentFlashPhase);

  const finalIntensity = remainingTime < 500 ? urgentFlashIntensity : flashIntensity;

  ctx.save();
  ctx.globalAlpha = finalIntensity;

  // Pulsing glow ring
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 15 + 10 * Math.sin(flashPhase);

  ctx.beginPath();
  ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
  ctx.stroke();

  // Inner glow
  const gradient = ctx.createRadialGradient(x, y, radius, x, y, radius + 15);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.5, '#00FFFF40');
  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius + 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Check if any Second Chance VFX is active
 */
export function isSecondChanceVFXActive(state: SecondChanceVFXState): boolean {
  return state.explosionActive || state.shockwaveActive;
}
