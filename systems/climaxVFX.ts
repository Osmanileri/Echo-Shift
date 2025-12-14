/**
 * Climax Zone Visual Effects System
 * Campaign Update v2.5 - Visual feedback for climax zone
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

/**
 * Climax VFX configuration
 */
export interface ClimaxVFXConfig {
  // Starfield stretch effect (1.0 - 2.0 factor)
  minStarfieldStretch: number;
  maxStarfieldStretch: number;
  
  // Chromatic aberration (RGB shift at edges)
  minChromaticAberration: number;
  maxChromaticAberration: number;
  
  // FOV increase (1.0 - 1.15 multiplier)
  minFOVMultiplier: number;
  maxFOVMultiplier: number;
  
  // Screen flash duration on finish (ms)
  screenFlashDuration: number;
  
  // Transition duration for effects (ms)
  transitionDuration: number;
}

/**
 * Climax VFX state
 */
export interface ClimaxVFXState {
  // Whether climax zone is active
  isActive: boolean;
  
  // Progress through climax zone (0-1)
  climaxProgress: number;
  
  // Current effect values
  starfieldStretch: number;
  chromaticAberration: number;
  fovMultiplier: number;
  
  // Screen flash state
  screenFlashActive: boolean;
  screenFlashProgress: number;
  
  // Transition progress (0-1)
  transitionProgress: number;
  
  // Timestamps
  activationTime: number;
  flashStartTime: number;
}

/**
 * Default configuration values
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */
export const DEFAULT_CLIMAX_VFX_CONFIG: ClimaxVFXConfig = {
  minStarfieldStretch: 1.0,
  maxStarfieldStretch: 2.0,
  minChromaticAberration: 0,
  maxChromaticAberration: 10,
  minFOVMultiplier: 1.0,
  maxFOVMultiplier: 1.15,
  screenFlashDuration: 200,
  transitionDuration: 500,
};

/**
 * Create initial climax VFX state
 */
export function createClimaxVFXState(): ClimaxVFXState {
  return {
    isActive: false,
    climaxProgress: 0,
    starfieldStretch: 1.0,
    chromaticAberration: 0,
    fovMultiplier: 1.0,
    screenFlashActive: false,
    screenFlashProgress: 0,
    transitionProgress: 0,
    activationTime: 0,
    flashStartTime: 0,
  };
}

/**
 * Calculate starfield stretch factor based on climax progress
 * Requirements: 11.1 - Gradually stretch background particles (Starfield) to create "warp speed" effect
 * 
 * @param climaxProgress - Progress through climax zone (0-1)
 * @param config - VFX configuration
 * @returns Starfield stretch factor (1.0 - 2.0)
 */
export function calculateStarfieldStretch(
  climaxProgress: number,
  config: ClimaxVFXConfig = DEFAULT_CLIMAX_VFX_CONFIG
): number {
  const clampedProgress = Math.max(0, Math.min(1, climaxProgress));
  return config.minStarfieldStretch + 
    (config.maxStarfieldStretch - config.minStarfieldStretch) * clampedProgress;
}

/**
 * Calculate chromatic aberration intensity based on climax progress
 * Requirements: 11.2 - Apply subtle Chromatic Aberration (RGB shift) effect to edges
 * 
 * @param climaxProgress - Progress through climax zone (0-1)
 * @param config - VFX configuration
 * @returns Chromatic aberration intensity (0 - 10 pixels)
 */
export function calculateChromaticAberration(
  climaxProgress: number,
  config: ClimaxVFXConfig = DEFAULT_CLIMAX_VFX_CONFIG
): number {
  const clampedProgress = Math.max(0, Math.min(1, climaxProgress));
  return config.minChromaticAberration + 
    (config.maxChromaticAberration - config.minChromaticAberration) * clampedProgress;
}

/**
 * Calculate FOV multiplier based on climax zone state
 * Requirements: 11.3 - Slightly increase Field of View (FOV) to simulate acceleration
 * 
 * @param isInClimaxZone - Whether player is in climax zone
 * @param transitionProgress - Transition progress (0-1)
 * @param config - VFX configuration
 * @returns FOV multiplier (1.0 - 1.15)
 */
export function calculateFOVMultiplier(
  isInClimaxZone: boolean,
  transitionProgress: number,
  config: ClimaxVFXConfig = DEFAULT_CLIMAX_VFX_CONFIG
): number {
  if (!isInClimaxZone) {
    return config.minFOVMultiplier;
  }
  
  const clampedProgress = Math.max(0, Math.min(1, transitionProgress));
  return config.minFOVMultiplier + 
    (config.maxFOVMultiplier - config.minFOVMultiplier) * clampedProgress;
}

/**
 * Calculate screen flash progress
 * Requirements: 11.4 - Trigger momentary "screen flash" (white-out) transition
 * 
 * @param currentTime - Current timestamp in ms
 * @param flashStartTime - When flash started
 * @param config - VFX configuration
 * @returns Flash progress (0-1), where 1 means flash is complete
 */
export function calculateScreenFlashProgress(
  currentTime: number,
  flashStartTime: number,
  config: ClimaxVFXConfig = DEFAULT_CLIMAX_VFX_CONFIG
): number {
  if (flashStartTime === 0) return 0;
  
  const elapsed = currentTime - flashStartTime;
  return Math.min(1, elapsed / config.screenFlashDuration);
}

/**
 * Get screen flash opacity for rendering
 * Requirements: 11.4 - White-out transition effect
 * 
 * @param flashProgress - Flash progress (0-1)
 * @returns Opacity value (0-1), peaks at 0.5 progress then fades
 */
export function getScreenFlashOpacity(flashProgress: number): number {
  if (flashProgress <= 0 || flashProgress >= 1) return 0;
  
  // Peak at 50% progress, then fade out
  if (flashProgress <= 0.5) {
    return flashProgress * 2; // 0 -> 1
  } else {
    return (1 - flashProgress) * 2; // 1 -> 0
  }
}

/**
 * Activate climax zone VFX
 * Requirements: 11.1, 11.2, 11.3
 * 
 * @param state - Current VFX state
 * @param currentTime - Current timestamp in ms
 * @returns Updated VFX state
 */
export function activateClimaxVFX(
  state: ClimaxVFXState,
  currentTime: number
): ClimaxVFXState {
  if (state.isActive) return state;
  
  return {
    ...state,
    isActive: true,
    activationTime: currentTime,
    transitionProgress: 0,
  };
}

/**
 * Deactivate climax zone VFX
 * 
 * @param state - Current VFX state
 * @returns Updated VFX state
 */
export function deactivateClimaxVFX(state: ClimaxVFXState): ClimaxVFXState {
  return {
    ...state,
    isActive: false,
    climaxProgress: 0,
    starfieldStretch: 1.0,
    chromaticAberration: 0,
    fovMultiplier: 1.0,
    transitionProgress: 0,
  };
}

/**
 * Trigger screen flash on level completion
 * Requirements: 11.4 - Trigger screen flash before Victory_Screen
 * 
 * @param state - Current VFX state
 * @param currentTime - Current timestamp in ms
 * @returns Updated VFX state
 */
export function triggerScreenFlash(
  state: ClimaxVFXState,
  currentTime: number
): ClimaxVFXState {
  return {
    ...state,
    screenFlashActive: true,
    flashStartTime: currentTime,
    screenFlashProgress: 0,
  };
}

/**
 * Update climax VFX state
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * 
 * @param state - Current VFX state
 * @param currentTime - Current timestamp in ms
 * @param distanceProgress - Progress through level (0-1)
 * @param isInClimaxZone - Whether in final 20%
 * @param config - VFX configuration
 * @returns Updated VFX state
 */
export function updateClimaxVFX(
  state: ClimaxVFXState,
  currentTime: number,
  distanceProgress: number,
  isInClimaxZone: boolean,
  config: ClimaxVFXConfig = DEFAULT_CLIMAX_VFX_CONFIG
): ClimaxVFXState {
  let newState = { ...state };
  
  // Handle activation/deactivation
  if (isInClimaxZone && !state.isActive) {
    newState = activateClimaxVFX(newState, currentTime);
  } else if (!isInClimaxZone && state.isActive) {
    newState = deactivateClimaxVFX(newState);
  }
  
  // Update transition progress
  if (newState.isActive) {
    const elapsed = currentTime - newState.activationTime;
    newState.transitionProgress = Math.min(1, elapsed / config.transitionDuration);
    
    // Calculate climax progress (0-1 within the climax zone)
    // Climax zone is final 20% (80-100%), so map 0.8-1.0 to 0-1
    const climaxZoneStart = 0.8;
    newState.climaxProgress = Math.max(0, Math.min(1, 
      (distanceProgress - climaxZoneStart) / (1 - climaxZoneStart)
    ));
    
    // Update effect values based on progress
    newState.starfieldStretch = calculateStarfieldStretch(
      newState.climaxProgress * newState.transitionProgress, 
      config
    );
    newState.chromaticAberration = calculateChromaticAberration(
      newState.climaxProgress * newState.transitionProgress, 
      config
    );
    newState.fovMultiplier = calculateFOVMultiplier(
      true, 
      newState.transitionProgress, 
      config
    );
  }
  
  // Update screen flash
  if (newState.screenFlashActive) {
    newState.screenFlashProgress = calculateScreenFlashProgress(
      currentTime, 
      newState.flashStartTime, 
      config
    );
    
    // Deactivate flash when complete
    if (newState.screenFlashProgress >= 1) {
      newState.screenFlashActive = false;
      newState.screenFlashProgress = 0;
      newState.flashStartTime = 0;
    }
  }
  
  return newState;
}

/**
 * Apply starfield stretch effect to particles
 * Requirements: 11.1 - Stretch background particles for "warp speed" effect
 * 
 * @param ctx - Canvas 2D context
 * @param stretchFactor - Stretch factor (1.0 - 2.0)
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 */
export function applyStarfieldStretch(
  ctx: CanvasRenderingContext2D,
  stretchFactor: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (stretchFactor <= 1.0) return;
  
  // Apply horizontal stretch from center
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(stretchFactor, 1); // Stretch horizontally only
  ctx.translate(-centerX, -centerY);
}

/**
 * Reset starfield stretch transform
 * 
 * @param ctx - Canvas 2D context
 */
export function resetStarfieldStretch(ctx: CanvasRenderingContext2D): void {
  ctx.restore();
}

/**
 * Apply chromatic aberration effect to canvas
 * Requirements: 11.2 - RGB shift effect at screen edges
 * 
 * @param ctx - Canvas 2D context
 * @param canvas - Canvas element
 * @param intensity - Aberration intensity (0-10 pixels)
 */
export function applyChromaticAberration(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  intensity: number
): void {
  if (intensity <= 0.5) return;
  
  ctx.save();
  
  // Create temporary canvas for the effect
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    ctx.restore();
    return;
  }
  
  // Copy current canvas to temp
  tempCtx.drawImage(canvas, 0, 0);
  
  // Apply RGB channel shifts at edges
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.15;
  
  // Red channel shift (left)
  ctx.drawImage(tempCanvas, -intensity, 0);
  
  // Blue channel shift (right)
  ctx.drawImage(tempCanvas, intensity, 0);
  
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
  ctx.restore();
}

/**
 * Apply FOV zoom effect
 * Requirements: 11.3 - Increase FOV to simulate acceleration
 * 
 * @param ctx - Canvas 2D context
 * @param fovMultiplier - FOV multiplier (1.0 - 1.15)
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 */
export function applyFOVEffect(
  ctx: CanvasRenderingContext2D,
  fovMultiplier: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (fovMultiplier <= 1.0) return;
  
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(fovMultiplier, fovMultiplier);
  ctx.translate(-centerX, -centerY);
}

/**
 * Reset FOV effect transform
 * 
 * @param ctx - Canvas 2D context
 */
export function resetFOVEffect(ctx: CanvasRenderingContext2D): void {
  ctx.restore();
}

/**
 * Render screen flash overlay
 * Requirements: 11.4 - White-out transition before Victory_Screen
 * 
 * @param ctx - Canvas 2D context
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param flashProgress - Flash progress (0-1)
 */
export function renderScreenFlash(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  flashProgress: number
): void {
  const opacity = getScreenFlashOpacity(flashProgress);
  if (opacity <= 0) return;
  
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}

/**
 * Get current VFX values for external systems
 * 
 * @param state - Current VFX state
 * @returns Object with current effect values
 */
export function getClimaxVFXValues(state: ClimaxVFXState): {
  starfieldStretch: number;
  chromaticAberration: number;
  fovMultiplier: number;
  screenFlashOpacity: number;
  isActive: boolean;
} {
  return {
    starfieldStretch: state.starfieldStretch,
    chromaticAberration: state.chromaticAberration,
    fovMultiplier: state.fovMultiplier,
    screenFlashOpacity: getScreenFlashOpacity(state.screenFlashProgress),
    isActive: state.isActive,
  };
}

/**
 * Reset climax VFX state
 */
export function resetClimaxVFX(): ClimaxVFXState {
  return createClimaxVFXState();
}
