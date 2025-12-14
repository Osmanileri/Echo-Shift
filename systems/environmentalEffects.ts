/**
 * Environmental Effects System
 * Campaign Update v2.5 - Requirements 14.1, 14.2, 14.3, 14.4
 * 
 * Provides environmental visual effects:
 * - Particle burst on shard collection (14.1)
 * - BPM-synced pulse to obstacles/background (14.2)
 * - Glitch artifact effect on damage (14.3)
 * - Haptic feedback on distance bar pulse (14.4)
 */

import { getHapticSystem } from './hapticSystem';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Environmental effects configuration
 */
export interface EnvironmentalEffectsConfig {
  // BPM-synced pulse configuration
  defaultBPM: number;
  pulseMinScale: number;
  pulseMaxScale: number;
  
  // Glitch artifact configuration
  glitchDuration: number;  // Duration in ms (200ms per Requirements 14.3)
  glitchIntensity: number; // 0-1 intensity
  glitchSliceCount: number; // Number of horizontal slices
  glitchMaxOffset: number; // Max horizontal offset in pixels
  
  // Collection burst configuration
  burstParticleCount: number;
  burstColors: string[];
}

/**
 * Default configuration values
 */
export const DEFAULT_ENVIRONMENTAL_CONFIG: EnvironmentalEffectsConfig = {
  // BPM-synced pulse - Requirements 14.2
  defaultBPM: 120,
  pulseMinScale: 0.98,
  pulseMaxScale: 1.02,
  
  // Glitch artifact - Requirements 14.3
  glitchDuration: 200,
  glitchIntensity: 0.8,
  glitchSliceCount: 10,
  glitchMaxOffset: 15,
  
  // Collection burst - Requirements 14.1
  burstParticleCount: 12,
  burstColors: ['#00F0FF', '#FFD700', '#FF00FF', '#FFFFFF'],
};

// ============================================================================
// State
// ============================================================================

/**
 * Environmental effects state
 */
export interface EnvironmentalEffectsState {
  // BPM pulse state
  currentBPM: number;
  pulsePhase: number; // 0-1 representing position in beat cycle
  lastBeatTime: number;
  
  // Glitch artifact state
  glitchActive: boolean;
  glitchStartTime: number;
  glitchProgress: number; // 0-1
  glitchSlices: GlitchSlice[];
  
  // Distance bar pulse state
  distanceBarPulseActive: boolean;
  lastDistanceBarPulseTime: number;
}

/**
 * Glitch slice for artifact effect
 */
export interface GlitchSlice {
  y: number;
  height: number;
  offsetX: number;
  rgbShift: number;
}

/**
 * Create initial environmental effects state
 */
export function createEnvironmentalEffectsState(): EnvironmentalEffectsState {
  return {
    currentBPM: DEFAULT_ENVIRONMENTAL_CONFIG.defaultBPM,
    pulsePhase: 0,
    lastBeatTime: 0,
    glitchActive: false,
    glitchStartTime: 0,
    glitchProgress: 0,
    glitchSlices: [],
    distanceBarPulseActive: false,
    lastDistanceBarPulseTime: 0,
  };
}

// ============================================================================
// BPM-Synced Pulse - Requirements 14.2
// ============================================================================

/**
 * Calculate pulse scale based on BPM and current time
 * Requirements 14.2: Obstacles and background elements pulse in sync with BPM
 * 
 * @param currentTime - Current timestamp in ms
 * @param bpm - Beats per minute
 * @param config - Configuration
 * @returns Pulse scale factor (0.98 - 1.02)
 */
export function calculateBPMPulseScale(
  currentTime: number,
  bpm: number,
  config: EnvironmentalEffectsConfig = DEFAULT_ENVIRONMENTAL_CONFIG
): number {
  // Calculate beat duration in ms
  const beatDuration = 60000 / bpm;
  
  // Calculate phase within current beat (0-1)
  const phase = (currentTime % beatDuration) / beatDuration;
  
  // Use sine wave for smooth pulse (peaks at 0 and 1, trough at 0.5)
  const pulseValue = Math.cos(phase * Math.PI * 2);
  
  // Map from -1..1 to minScale..maxScale
  const normalizedPulse = (pulseValue + 1) / 2;
  return config.pulseMinScale + (config.pulseMaxScale - config.pulseMinScale) * normalizedPulse;
}

/**
 * Calculate pulse phase for visual effects
 * 
 * @param currentTime - Current timestamp in ms
 * @param bpm - Beats per minute
 * @returns Phase value (0-1)
 */
export function calculateBPMPulsePhase(
  currentTime: number,
  bpm: number
): number {
  const beatDuration = 60000 / bpm;
  return (currentTime % beatDuration) / beatDuration;
}

/**
 * Check if we're at a beat peak (for triggering effects)
 * 
 * @param currentTime - Current timestamp in ms
 * @param lastBeatTime - Last beat timestamp
 * @param bpm - Beats per minute
 * @returns True if at beat peak
 */
export function isAtBeatPeak(
  currentTime: number,
  lastBeatTime: number,
  bpm: number
): boolean {
  const beatDuration = 60000 / bpm;
  return currentTime - lastBeatTime >= beatDuration;
}

/**
 * Update BPM pulse state
 * 
 * @param state - Current state
 * @param currentTime - Current timestamp in ms
 * @param bpm - Optional BPM override
 * @returns Updated state
 */
export function updateBPMPulse(
  state: EnvironmentalEffectsState,
  currentTime: number,
  bpm?: number
): EnvironmentalEffectsState {
  const effectiveBPM = bpm ?? state.currentBPM;
  const beatDuration = 60000 / effectiveBPM;
  
  let newLastBeatTime = state.lastBeatTime;
  if (currentTime - state.lastBeatTime >= beatDuration) {
    newLastBeatTime = currentTime;
  }
  
  return {
    ...state,
    currentBPM: effectiveBPM,
    pulsePhase: calculateBPMPulsePhase(currentTime, effectiveBPM),
    lastBeatTime: newLastBeatTime,
  };
}

// ============================================================================
// Glitch Artifact Effect - Requirements 14.3
// ============================================================================

/**
 * Generate random glitch slices for artifact effect
 * 
 * @param canvasHeight - Canvas height
 * @param config - Configuration
 * @returns Array of glitch slices
 */
export function generateGlitchSlices(
  canvasHeight: number,
  config: EnvironmentalEffectsConfig = DEFAULT_ENVIRONMENTAL_CONFIG
): GlitchSlice[] {
  const slices: GlitchSlice[] = [];
  const sliceHeight = canvasHeight / config.glitchSliceCount;
  
  for (let i = 0; i < config.glitchSliceCount; i++) {
    slices.push({
      y: i * sliceHeight,
      height: sliceHeight,
      offsetX: (Math.random() - 0.5) * 2 * config.glitchMaxOffset * config.glitchIntensity,
      rgbShift: (Math.random() - 0.5) * 10 * config.glitchIntensity,
    });
  }
  
  return slices;
}

/**
 * Trigger glitch artifact effect on damage
 * Requirements 14.3: Trigger Glitch_Artifact effect on entire screen for 200ms
 * 
 * @param state - Current state
 * @param currentTime - Current timestamp in ms
 * @param canvasHeight - Canvas height for slice generation
 * @param config - Configuration
 * @returns Updated state
 */
export function triggerGlitchArtifact(
  state: EnvironmentalEffectsState,
  currentTime: number,
  canvasHeight: number,
  config: EnvironmentalEffectsConfig = DEFAULT_ENVIRONMENTAL_CONFIG
): EnvironmentalEffectsState {
  return {
    ...state,
    glitchActive: true,
    glitchStartTime: currentTime,
    glitchProgress: 0,
    glitchSlices: generateGlitchSlices(canvasHeight, config),
  };
}

/**
 * Update glitch artifact state
 * 
 * @param state - Current state
 * @param currentTime - Current timestamp in ms
 * @param config - Configuration
 * @returns Updated state
 */
export function updateGlitchArtifact(
  state: EnvironmentalEffectsState,
  currentTime: number,
  config: EnvironmentalEffectsConfig = DEFAULT_ENVIRONMENTAL_CONFIG
): EnvironmentalEffectsState {
  if (!state.glitchActive) return state;
  
  const elapsed = currentTime - state.glitchStartTime;
  const progress = Math.min(1, elapsed / config.glitchDuration);
  
  // Deactivate when complete
  if (progress >= 1) {
    return {
      ...state,
      glitchActive: false,
      glitchProgress: 0,
      glitchSlices: [],
    };
  }
  
  // Regenerate slices periodically for more chaotic effect
  let newSlices = state.glitchSlices;
  if (Math.random() < 0.3) { // 30% chance each frame to regenerate
    newSlices = generateGlitchSlices(
      state.glitchSlices.length > 0 
        ? state.glitchSlices[0].height * state.glitchSlices.length 
        : 600,
      config
    );
  }
  
  return {
    ...state,
    glitchProgress: progress,
    glitchSlices: newSlices,
  };
}

/**
 * Calculate glitch intensity based on progress
 * Intensity peaks in the middle and fades at start/end
 * 
 * @param progress - Glitch progress (0-1)
 * @returns Intensity multiplier (0-1)
 */
export function calculateGlitchIntensity(progress: number): number {
  // Use sine curve for smooth fade in/out
  return Math.sin(progress * Math.PI);
}

/**
 * Check if glitch artifact is currently active
 * 
 * @param state - Current state
 * @returns True if glitch is active
 */
export function isGlitchActive(state: EnvironmentalEffectsState): boolean {
  return state.glitchActive && state.glitchProgress < 1;
}

/**
 * Apply glitch artifact effect to canvas
 * Requirements 14.3: Glitch_Artifact effect on damage
 * 
 * @param ctx - Canvas 2D context
 * @param canvas - Canvas element
 * @param state - Environmental effects state
 */
export function applyGlitchArtifact(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: EnvironmentalEffectsState
): void {
  if (!state.glitchActive || state.glitchSlices.length === 0) return;
  
  const intensity = calculateGlitchIntensity(state.glitchProgress);
  if (intensity <= 0.01) return;
  
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
  
  // Clear original canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw slices with offsets
  for (const slice of state.glitchSlices) {
    const offsetX = slice.offsetX * intensity;
    
    // Draw main slice with offset
    ctx.drawImage(
      tempCanvas,
      0, slice.y, canvas.width, slice.height,
      offsetX, slice.y, canvas.width, slice.height
    );
    
    // Add RGB shift effect
    if (Math.abs(slice.rgbShift) > 1) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.1 * intensity;
      
      // Red channel shift
      ctx.drawImage(
        tempCanvas,
        0, slice.y, canvas.width, slice.height,
        offsetX - slice.rgbShift * intensity, slice.y, canvas.width, slice.height
      );
      
      // Blue channel shift
      ctx.drawImage(
        tempCanvas,
        0, slice.y, canvas.width, slice.height,
        offsetX + slice.rgbShift * intensity, slice.y, canvas.width, slice.height
      );
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
    }
  }
  
  // Add scanline effect
  ctx.fillStyle = `rgba(0, 0, 0, ${0.1 * intensity})`;
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 2);
  }
  
  // Add noise overlay
  if (intensity > 0.3) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.05 * intensity})`;
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 3 + 1;
      ctx.fillRect(x, y, size, size);
    }
  }
  
  ctx.restore();
}

// ============================================================================
// Distance Bar Pulse Haptic - Requirements 14.4
// ============================================================================

/**
 * Trigger haptic feedback for distance bar pulse
 * Requirements 14.4: Localized haptic feedback (vibration) on supported devices
 * 
 * @param state - Current state
 * @param currentTime - Current timestamp in ms
 * @returns Updated state
 */
export function triggerDistanceBarPulseHaptic(
  state: EnvironmentalEffectsState,
  currentTime: number
): EnvironmentalEffectsState {
  // Throttle haptic feedback to prevent spam (min 500ms between pulses)
  if (currentTime - state.lastDistanceBarPulseTime < 500) {
    return state;
  }
  
  // Trigger haptic feedback
  const hapticSystem = getHapticSystem();
  hapticSystem.trigger('medium');
  
  return {
    ...state,
    distanceBarPulseActive: true,
    lastDistanceBarPulseTime: currentTime,
  };
}

/**
 * Check if distance bar pulse haptic should be triggered
 * 
 * @param isNearFinish - Whether player is within 50m of target
 * @param state - Current state
 * @param currentTime - Current timestamp in ms
 * @returns True if haptic should be triggered
 */
export function shouldTriggerDistanceBarPulseHaptic(
  isNearFinish: boolean,
  state: EnvironmentalEffectsState,
  currentTime: number
): boolean {
  if (!isNearFinish) return false;
  
  // Trigger on beat peaks when near finish
  return isAtBeatPeak(currentTime, state.lastBeatTime, state.currentBPM);
}

// ============================================================================
// Collection Burst - Requirements 14.1
// ============================================================================

/**
 * Collection burst particle configuration
 * Requirements 14.1: Spawn small burst of particle effects at collection point
 */
export interface CollectionBurstConfig {
  x: number;
  y: number;
  colors: string[];
  particleCount: number;
}

/**
 * Create collection burst configuration
 * 
 * @param x - X position
 * @param y - Y position
 * @param config - Environmental effects config
 * @returns Collection burst config
 */
export function createCollectionBurstConfig(
  x: number,
  y: number,
  config: EnvironmentalEffectsConfig = DEFAULT_ENVIRONMENTAL_CONFIG
): CollectionBurstConfig {
  return {
    x,
    y,
    colors: config.burstColors,
    particleCount: config.burstParticleCount,
  };
}

// ============================================================================
// Main Update Function
// ============================================================================

/**
 * Update all environmental effects
 * 
 * @param state - Current state
 * @param currentTime - Current timestamp in ms
 * @param bpm - Optional BPM override
 * @param config - Configuration
 * @returns Updated state
 */
export function updateEnvironmentalEffects(
  state: EnvironmentalEffectsState,
  currentTime: number,
  bpm?: number,
  config: EnvironmentalEffectsConfig = DEFAULT_ENVIRONMENTAL_CONFIG
): EnvironmentalEffectsState {
  let newState = updateBPMPulse(state, currentTime, bpm);
  newState = updateGlitchArtifact(newState, currentTime, config);
  
  return newState;
}

/**
 * Reset environmental effects state
 */
export function resetEnvironmentalEffects(): EnvironmentalEffectsState {
  return createEnvironmentalEffectsState();
}

// ============================================================================
// Singleton Instance
// ============================================================================

let environmentalEffectsState: EnvironmentalEffectsState = createEnvironmentalEffectsState();

/**
 * Get current environmental effects state
 */
export function getEnvironmentalEffectsState(): EnvironmentalEffectsState {
  return environmentalEffectsState;
}

/**
 * Set environmental effects state
 */
export function setEnvironmentalEffectsState(state: EnvironmentalEffectsState): void {
  environmentalEffectsState = state;
}

/**
 * Global trigger for glitch artifact
 */
export function triggerGlobalGlitchArtifact(canvasHeight: number): void {
  environmentalEffectsState = triggerGlitchArtifact(
    environmentalEffectsState,
    Date.now(),
    canvasHeight
  );
}

/**
 * Global update for environmental effects
 */
export function updateGlobalEnvironmentalEffects(bpm?: number): void {
  environmentalEffectsState = updateEnvironmentalEffects(
    environmentalEffectsState,
    Date.now(),
    bpm
  );
}

/**
 * Global reset for environmental effects
 */
export function resetGlobalEnvironmentalEffects(): void {
  environmentalEffectsState = createEnvironmentalEffectsState();
}
