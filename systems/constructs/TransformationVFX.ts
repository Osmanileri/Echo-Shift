/**
 * TransformationVFX - Visual effects for Construct transformations
 * 
 * Provides transformation effects:
 * - Screen flash (100ms)
 * - RGB split / chromatic aberration (200ms)
 * - Particle burst
 * - Screen shake (150ms)
 * 
 * Requirements:
 * - 2.2: WHEN transforming THEN the Transform System SHALL play a "Phase Shift" visual effect (color inversion + distortion)
 */

import * as ParticleSystem from '../particleSystem';
import * as ScreenShake from '../screenShake';

/**
 * Configuration for transformation VFX
 */
export const TRANSFORMATION_VFX_CONFIG = {
  /** Screen flash duration in milliseconds */
  flashDuration: 100,
  /** Chromatic aberration duration in milliseconds */
  chromaticDuration: 200,
  /** Screen shake duration in milliseconds */
  shakeDuration: 150,
  /** Screen shake intensity */
  shakeIntensity: 12,
  /** Particle burst count */
  particleBurstCount: 24,
  /** Flash color */
  flashColor: '#FFFFFF',
  /** Chromatic aberration max separation */
  chromaticSeparation: 10,
} as const;

/**
 * State for transformation VFX
 */
export interface TransformationVFXState {
  /** Whether transformation VFX is active */
  isActive: boolean;
  /** Start time of the transformation */
  startTime: number;
  /** Screen flash progress (0-1) */
  flashProgress: number;
  /** Chromatic aberration progress (0-1) */
  chromaticProgress: number;
  /** Position where transformation occurred */
  position: { x: number; y: number };
}

/**
 * Create initial transformation VFX state
 */
export function createTransformationVFXState(): TransformationVFXState {
  return {
    isActive: false,
    startTime: 0,
    flashProgress: 0,
    chromaticProgress: 0,
    position: { x: 0, y: 0 },
  };
}

/**
 * Trigger transformation VFX
 * Requirements 2.2: Play "Phase Shift" visual effect
 * 
 * @param state - Current VFX state
 * @param x - X position of transformation
 * @param y - Y position of transformation
 * @param currentTime - Current timestamp
 * @returns Updated VFX state
 */
export function triggerTransformation(
  state: TransformationVFXState,
  x: number,
  y: number,
  currentTime: number
): TransformationVFXState {
  // Trigger screen shake
  ScreenShake.trigger({
    intensity: TRANSFORMATION_VFX_CONFIG.shakeIntensity,
    duration: TRANSFORMATION_VFX_CONFIG.shakeDuration,
    frequency: 40,
    decay: true,
  });
  
  // Emit particle burst
  ParticleSystem.emit(x, y, {
    count: TRANSFORMATION_VFX_CONFIG.particleBurstCount,
    speed: { min: 5, max: 15 },
    size: { min: 3, max: 8 },
    life: { min: 0.3, max: 0.6 },
    colors: ['#FF00FF', '#00FFFF', '#FFFFFF', '#FFFF00'],
    spread: Math.PI * 2,
    gravity: 0.05,
  }, 'burst');
  
  return {
    isActive: true,
    startTime: currentTime,
    flashProgress: 0,
    chromaticProgress: 0,
    position: { x, y },
  };
}

/**
 * Update transformation VFX state
 * 
 * @param state - Current VFX state
 * @param currentTime - Current timestamp
 * @returns Updated VFX state
 */
export function updateTransformationVFX(
  state: TransformationVFXState,
  currentTime: number
): TransformationVFXState {
  if (!state.isActive) {
    return state;
  }
  
  const elapsed = currentTime - state.startTime;
  const config = TRANSFORMATION_VFX_CONFIG;
  
  // Calculate flash progress
  const flashProgress = Math.min(1, elapsed / config.flashDuration);
  
  // Calculate chromatic progress (starts after flash)
  const chromaticStart = config.flashDuration * 0.5;
  const chromaticElapsed = Math.max(0, elapsed - chromaticStart);
  const chromaticProgress = Math.min(1, chromaticElapsed / config.chromaticDuration);
  
  // Check if effect is complete
  const totalDuration = config.flashDuration + config.chromaticDuration;
  const isActive = elapsed < totalDuration;
  
  return {
    ...state,
    isActive,
    flashProgress,
    chromaticProgress,
  };
}

/**
 * Render transformation VFX
 * Requirements 2.2: Color inversion + distortion effect
 * 
 * @param ctx - Canvas 2D rendering context
 * @param canvas - Canvas element
 * @param state - Current VFX state
 */
export function renderTransformationVFX(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: TransformationVFXState
): void {
  if (!state.isActive) {
    return;
  }
  
  const config = TRANSFORMATION_VFX_CONFIG;
  
  // Screen flash effect
  if (state.flashProgress < 1) {
    const flashAlpha = state.flashProgress < 0.5
      ? state.flashProgress * 2  // Fade in
      : (1 - state.flashProgress) * 2;  // Fade out
    
    ctx.save();
    ctx.fillStyle = config.flashColor;
    ctx.globalAlpha = flashAlpha * 0.6;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  
  // Chromatic aberration effect
  if (state.chromaticProgress > 0 && state.chromaticProgress < 1) {
    const separation = config.chromaticSeparation * (1 - state.chromaticProgress);
    
    if (separation > 0.5) {
      ctx.save();
      
      // Create temporary canvas for the effect
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        // Copy current canvas
        tempCtx.drawImage(canvas, 0, 0);
        
        // Apply RGB separation
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.15;
        
        // Red channel shift
        ctx.drawImage(tempCanvas, -separation, -separation * 0.5);
        
        // Blue channel shift
        ctx.drawImage(tempCanvas, separation, separation * 0.5);
      }
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }
  }
  
  // Radial distortion effect from transformation point
  if (state.flashProgress < 1) {
    const distortRadius = 150 * state.flashProgress;
    const distortAlpha = (1 - state.flashProgress) * 0.3;
    
    ctx.save();
    ctx.globalAlpha = distortAlpha;
    
    // Draw expanding ring
    const gradient = ctx.createRadialGradient(
      state.position.x, state.position.y, distortRadius * 0.8,
      state.position.x, state.position.y, distortRadius
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, '#FF00FF');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(state.position.x, state.position.y, distortRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

/**
 * Check if transformation VFX is currently active
 */
export function isTransformationActive(state: TransformationVFXState): boolean {
  return state.isActive;
}
