/**
 * Holographic Gate System
 * Campaign Update v2.5 - Finish line visualization
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { AudioSystem } from './audioSystem';

/**
 * Holographic Gate configuration
 */
export interface HolographicGateConfig {
  // Distance threshold for gate visibility (meters)
  visibilityThreshold: number;

  // BPM for pulse animation sync
  bpm: number;

  // Shatter animation duration (ms)
  shatterDuration: number;

  // Warp jump acceleration multiplier
  warpJumpMultiplier: number;

  // Gate visual properties
  gateWidth: number;
  gateHeight: number;
  gateColor: string;
  glowColor: string;
}

/**
 * Shatter particle for gate break animation
 */
export interface ShatterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  color: string;
}

/**
 * Holographic Gate state
 */
export interface HolographicGateState {
  // Visibility state
  visible: boolean;

  // Position (distance from player)
  distanceFromPlayer: number;

  // Pulse animation state (0-1 for BPM sync)
  pulsePhase: number;

  // Shatter animation state
  isShattered: boolean;
  shatterProgress: number;
  shatterStartTime: number;
  shatterParticles: ShatterParticle[];

  // Warp jump state
  warpJumpActive: boolean;
  warpJumpProgress: number;

  // Timestamps
  lastUpdateTime: number;
}

/**
 * Default configuration values
 * Requirements: 3.1, 3.2 (campaign-chapter-system), 12.1, 12.2, 12.3, 12.4
 */
export const DEFAULT_HOLOGRAPHIC_GATE_CONFIG: HolographicGateConfig = {
  visibilityThreshold: 50, // 50 meters from target (Requirements 3.1)
  bpm: 120, // Default BPM for pulse sync
  shatterDuration: 500, // 500ms shatter animation
  warpJumpMultiplier: 3.0, // 3x acceleration on warp jump
  gateWidth: 200,
  gateHeight: 300,
  gateColor: '#00ffff',
  glowColor: '#00ffff',
};

/**
 * Create initial holographic gate state
 */
export function createHolographicGateState(): HolographicGateState {
  return {
    visible: false,
    distanceFromPlayer: Infinity,
    pulsePhase: 0,
    isShattered: false,
    shatterProgress: 0,
    shatterStartTime: 0,
    shatterParticles: [],
    warpJumpActive: false,
    warpJumpProgress: 0,
    lastUpdateTime: 0,
  };
}

/**
 * Check if gate should be visible based on distance
 * Requirements: 3.1 - WHEN the player is within 50 meters of Target_Distance
 * 
 * @param remainingDistance - Distance remaining to target
 * @param config - Gate configuration
 * @returns true if gate should be visible
 */
export function shouldGateBeVisible(
  remainingDistance: number,
  config: HolographicGateConfig = DEFAULT_HOLOGRAPHIC_GATE_CONFIG
): boolean {
  // Gate should be visible when player is near target (within threshold)
  // AND stays visible even when remaining is 0 or slightly negative (passed target)
  return remainingDistance <= config.visibilityThreshold;
}

/**
 * Calculate pulse phase based on BPM
 * Requirements: 12.2 - Gate SHALL pulse with the beat of the music
 * 
 * @param currentTime - Current timestamp in ms
 * @param bpm - Beats per minute
 * @returns Pulse phase (0-1)
 */
export function calculatePulsePhase(currentTime: number, bpm: number): number {
  // Convert BPM to milliseconds per beat
  const msPerBeat = 60000 / bpm;

  // Calculate phase within current beat (0-1)
  return (currentTime % msPerBeat) / msPerBeat;
}

/**
 * Get pulse scale multiplier for rendering
 * Requirements: 12.2 - Pulse animation synced to BPM
 * 
 * @param pulsePhase - Current pulse phase (0-1)
 * @returns Scale multiplier (0.95 - 1.05)
 */
export function getPulseScale(pulsePhase: number): number {
  // Use sine wave for smooth pulsing
  // Scale ranges from 0.95 to 1.05
  return 1 + Math.sin(pulsePhase * Math.PI * 2) * 0.05;
}

/**
 * Get pulse glow intensity for rendering
 * Requirements: 12.2 - Pulse with beat
 * 
 * @param pulsePhase - Current pulse phase (0-1)
 * @returns Glow intensity (0.5 - 1.0)
 */
export function getPulseGlowIntensity(pulsePhase: number): number {
  // Peak glow at beat start (phase = 0)
  return 0.5 + Math.cos(pulsePhase * Math.PI * 2) * 0.25 + 0.25;
}

/**
 * Create shatter particles for gate break animation
 * Requirements: 12.3 - Trigger "shatter" animation, breaking into digital shards
 * 
 * @param gateX - Gate center X position
 * @param gateY - Gate center Y position
 * @param config - Gate configuration
 * @returns Array of shatter particles
 */
export function createShatterParticles(
  gateX: number,
  gateY: number,
  config: HolographicGateConfig = DEFAULT_HOLOGRAPHIC_GATE_CONFIG
): ShatterParticle[] {
  const particles: ShatterParticle[] = [];
  const particleCount = 20;

  for (let i = 0; i < particleCount; i++) {
    // Distribute particles across gate area
    const offsetX = (Math.random() - 0.5) * config.gateWidth;
    const offsetY = (Math.random() - 0.5) * config.gateHeight;

    // Random velocity outward from center
    const angle = Math.atan2(offsetY, offsetX) + (Math.random() - 0.5) * 0.5;
    const speed = 100 + Math.random() * 200;

    particles.push({
      x: gateX + offsetX,
      y: gateY + offsetY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 15,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 10,
      alpha: 1,
      color: config.gateColor,
    });
  }

  return particles;
}

/**
 * Update shatter particles
 * Requirements: 12.3 - Shatter animation
 * 
 * @param particles - Current particles
 * @param deltaTime - Time since last update in seconds
 * @param shatterProgress - Overall shatter progress (0-1)
 * @returns Updated particles
 */
export function updateShatterParticles(
  particles: ShatterParticle[],
  deltaTime: number,
  shatterProgress: number
): ShatterParticle[] {
  return particles.map(p => ({
    ...p,
    x: p.x + p.vx * deltaTime,
    y: p.y + p.vy * deltaTime,
    rotation: p.rotation + p.rotationSpeed * deltaTime,
    alpha: Math.max(0, 1 - shatterProgress),
  }));
}

/**
 * Calculate warp jump speed multiplier
 * Requirements: 12.4 - Player object SHALL accelerate off-screen to simulate "warp jump"
 * 
 * @param warpJumpProgress - Warp jump progress (0-1)
 * @param config - Gate configuration
 * @returns Speed multiplier
 */
export function calculateWarpJumpSpeed(
  warpJumpProgress: number,
  config: HolographicGateConfig = DEFAULT_HOLOGRAPHIC_GATE_CONFIG
): number {
  if (warpJumpProgress <= 0) return 1;

  // Exponential acceleration for dramatic effect
  const easedProgress = Math.pow(warpJumpProgress, 2);
  return 1 + (config.warpJumpMultiplier - 1) * easedProgress;
}

/**
 * Trigger gate shatter animation
 * Requirements: 12.3 - Trigger "shatter" animation on pass-through
 * 
 * @param state - Current gate state
 * @param currentTime - Current timestamp in ms
 * @param gateX - Gate center X position
 * @param gateY - Gate center Y position
 * @param config - Gate configuration
 * @returns Updated gate state
 */
export function triggerGateShatter(
  state: HolographicGateState,
  currentTime: number,
  gateX: number,
  gateY: number,
  config: HolographicGateConfig = DEFAULT_HOLOGRAPHIC_GATE_CONFIG
): HolographicGateState {
  if (state.isShattered) return state;

  // Play shatter sound effect
  playGateShatterSFX();

  return {
    ...state,
    isShattered: true,
    shatterStartTime: currentTime,
    shatterProgress: 0,
    shatterParticles: createShatterParticles(gateX, gateY, config),
    warpJumpActive: true,
    warpJumpProgress: 0,
  };
}

/**
 * Play gate shatter sound effect
 * Requirements: 12.3 - Trigger shatter SFX via audioSystem on gate break
 */
export function playGateShatterSFX(): void {
  // Use construct destruction sound as base for shatter effect
  AudioSystem.playConstructDestruction();
}

/**
 * Update holographic gate state
 * Requirements: 12.1, 12.2, 12.3, 12.4
 * 
 * @param state - Current gate state
 * @param currentTime - Current timestamp in ms
 * @param remainingDistance - Distance remaining to target
 * @param config - Gate configuration
 * @returns Updated gate state
 */
export function updateHolographicGate(
  state: HolographicGateState,
  currentTime: number,
  remainingDistance: number,
  config: HolographicGateConfig = DEFAULT_HOLOGRAPHIC_GATE_CONFIG
): HolographicGateState {
  const deltaTime = state.lastUpdateTime > 0
    ? (currentTime - state.lastUpdateTime) / 1000
    : 0;

  let newState = { ...state, lastUpdateTime: currentTime };

  // Update visibility
  // Requirements: 3.1 - Spawn gate when within 50m of target
  newState.visible = shouldGateBeVisible(remainingDistance, config);
  newState.distanceFromPlayer = remainingDistance;

  // Update pulse phase
  // Requirements: 12.2 - Pulse with beat of music
  newState.pulsePhase = calculatePulsePhase(currentTime, config.bpm);

  // Update shatter animation
  if (newState.isShattered) {
    const shatterElapsed = currentTime - newState.shatterStartTime;
    newState.shatterProgress = Math.min(1, shatterElapsed / config.shatterDuration);

    // Update particles
    newState.shatterParticles = updateShatterParticles(
      newState.shatterParticles,
      deltaTime,
      newState.shatterProgress
    );

    // Update warp jump progress
    // Requirements: 12.4 - Warp jump acceleration
    if (newState.warpJumpActive) {
      newState.warpJumpProgress = Math.min(1, newState.shatterProgress * 1.5);
    }
  }

  return newState;
}

/**
 * Render holographic gate
 * Requirements: 12.1, 12.2
 * 
 * @param ctx - Canvas 2D context
 * @param state - Gate state
 * @param screenX - Gate X position on screen
 * @param screenY - Gate Y position on screen
 * @param config - Gate configuration
 */
export function renderHolographicGate(
  ctx: CanvasRenderingContext2D,
  state: HolographicGateState,
  screenX: number,
  screenY: number,
  config: HolographicGateConfig = DEFAULT_HOLOGRAPHIC_GATE_CONFIG
): void {
  if (!state.visible || state.isShattered) {
    // Render shatter particles if shattered
    if (state.isShattered && state.shatterParticles.length > 0) {
      renderShatterParticles(ctx, state.shatterParticles);
    }
    return;
  }

  const pulseScale = getPulseScale(state.pulsePhase);
  const glowIntensity = getPulseGlowIntensity(state.pulsePhase);

  ctx.save();

  // Apply pulse scale
  ctx.translate(screenX, screenY);
  ctx.scale(pulseScale, pulseScale);
  ctx.translate(-screenX, -screenY);

  // Draw outer glow
  const glowGradient = ctx.createRadialGradient(
    screenX, screenY, 0,
    screenX, screenY, config.gateWidth * 0.8
  );
  glowGradient.addColorStop(0, `rgba(0, 255, 255, ${glowIntensity * 0.3})`);
  glowGradient.addColorStop(0.5, `rgba(0, 255, 255, ${glowIntensity * 0.1})`);
  glowGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.ellipse(screenX, screenY, config.gateWidth * 0.8, config.gateHeight * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw gate frame (holographic arch)
  ctx.strokeStyle = config.gateColor;
  ctx.lineWidth = 4;
  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = 20 * glowIntensity;

  // Main arch
  ctx.beginPath();
  ctx.ellipse(screenX, screenY, config.gateWidth / 2, config.gateHeight / 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner arch
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(screenX, screenY, config.gateWidth / 2 - 10, config.gateHeight / 2 - 10, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Horizontal scan lines (holographic effect)
  ctx.globalAlpha = 0.3 * glowIntensity;
  ctx.lineWidth = 1;
  const scanLineCount = 10;
  for (let i = 0; i < scanLineCount; i++) {
    const y = screenY - config.gateHeight / 2 + (config.gateHeight / scanLineCount) * i;
    const progress = (state.pulsePhase + i / scanLineCount) % 1;
    ctx.globalAlpha = 0.1 + progress * 0.2;
    ctx.beginPath();
    ctx.moveTo(screenX - config.gateWidth / 2, y);
    ctx.lineTo(screenX + config.gateWidth / 2, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Render shatter particles
 * Requirements: 12.3 - Shatter animation particles
 * 
 * @param ctx - Canvas 2D context
 * @param particles - Shatter particles to render
 */
export function renderShatterParticles(
  ctx: CanvasRenderingContext2D,
  particles: ShatterParticle[]
): void {
  ctx.save();

  particles.forEach(p => {
    if (p.alpha <= 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;

    // Draw triangular shard
    ctx.beginPath();
    ctx.moveTo(0, -p.size / 2);
    ctx.lineTo(p.size / 2, p.size / 2);
    ctx.lineTo(-p.size / 2, p.size / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });

  ctx.restore();
}

/**
 * Reset holographic gate state
 */
export function resetHolographicGate(): HolographicGateState {
  return createHolographicGateState();
}

/**
 * Check if player has passed through gate
 * 
 * @param previousDistance - Previous remaining distance
 * @param currentDistance - Current remaining distance
 * @returns true if player crossed the gate threshold
 */
export function hasPassedThroughGate(
  previousDistance: number,
  currentDistance: number
): boolean {
  // Player passed through when they cross from positive to zero/negative
  return previousDistance > 0 && currentDistance <= 0;
}

/**
 * Get gate render position based on remaining distance
 * 
 * @param remainingDistance - Distance remaining to target
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param config - Gate configuration
 * @returns Screen position for gate rendering
 */
export function getGateScreenPosition(
  remainingDistance: number,
  canvasWidth: number,
  canvasHeight: number,
  config: HolographicGateConfig = DEFAULT_HOLOGRAPHIC_GATE_CONFIG
): { x: number; y: number } {
  // Gate appears at the right side of screen and moves left towards player
  // Player is at roughly 20% of screen width
  // Map remaining distance (0 to threshold) to screen position (player to right edge)

  const playerX = 0.2; // Player at 20% of screen
  const startX = 0.95; // Gate starts at 95% (right edge)

  // Normalize: 1 = far away (at threshold), 0 = at target (should be at player)
  const normalizedDistance = Math.max(0, Math.min(1, remainingDistance / config.visibilityThreshold));

  // Interpolate from player position to start position based on distance
  // When remaining = 0, gate is at playerX
  // When remaining = threshold, gate is at startX
  const x = canvasWidth * (playerX + normalizedDistance * (startX - playerX));
  const y = canvasHeight / 2;

  return { x, y };
}
