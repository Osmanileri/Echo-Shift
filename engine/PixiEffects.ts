/**
 * PixiEffects.ts — Screen-Level Visual Effects
 * 
 * Manages screen flash, damage vignette, overdrive hue rotation,
 * lane highlight, and glitch effect overlays. All effects are
 * time-based FadeAnimations that auto-clean.
 */

import { ColorMatrixFilter, Graphics } from 'pixi.js';
import { getApp, getHeight, getLayer, getWidth, RenderLayer } from './PixiRenderer';

// ============================================================================
// Fade Animation System
// ============================================================================

interface FadeAnimation {
  graphic: Graphics;
  elapsed: number;
  duration: number;
  fadeIn: number;    // Duration of fade-in phase
  hold: number;      // Duration of hold phase
  fadeOut: number;    // Duration of fade-out phase
  maxAlpha: number;
  active: boolean;
}

const activeAnimations: FadeAnimation[] = [];

function createFadeOverlay(
  color: number,
  alpha: number,
  duration: number,
  fadeIn: number = 50,
  hold?: number,
  fadeOut?: number,
): void {
  const w = getWidth();
  const h = getHeight();

  const g = new Graphics();
  g.rect(0, 0, w, h);
  g.fill({ color, alpha: 0 });

  const effectsLayer = getLayer(RenderLayer.EFFECTS);
  effectsLayer.addChild(g);

  const fo = fadeOut ?? (duration - fadeIn - (hold ?? 0));
  const ho = hold ?? 0;

  activeAnimations.push({
    graphic: g,
    elapsed: 0,
    duration,
    fadeIn,
    hold: ho,
    fadeOut: Math.max(fo, 0),
    maxAlpha: alpha,
    active: true,
  });
}

// ============================================================================
// Update
// ============================================================================

export function updateEffects(dt: number): void {
  for (let i = activeAnimations.length - 1; i >= 0; i--) {
    const anim = activeAnimations[i];
    if (!anim.active) continue;

    anim.elapsed += dt;

    if (anim.elapsed >= anim.duration) {
      anim.graphic.destroy();
      anim.active = false;
      activeAnimations.splice(i, 1);
      continue;
    }

    // Calculate alpha based on phase
    let alpha = 0;
    const e = anim.elapsed;

    if (e < anim.fadeIn) {
      // Fade in
      alpha = (e / anim.fadeIn) * anim.maxAlpha;
    } else if (e < anim.fadeIn + anim.hold) {
      // Hold
      alpha = anim.maxAlpha;
    } else {
      // Fade out
      const fadeProgress = (e - anim.fadeIn - anim.hold) / anim.fadeOut;
      alpha = anim.maxAlpha * (1 - fadeProgress);
    }

    anim.graphic.alpha = Math.max(0, Math.min(1, alpha));
  }

  // Update overdrive filter
  updateOverdriveFilter(dt);
}

// ============================================================================
// Effect Emitters
// ============================================================================

/** White flash on shard/letter collection */
export function screenFlash(color: number = 0xffffff, intensity: number = 0.3): void {
  createFadeOverlay(color, intensity, 250, 30, 50, 170);
}

/** Red flash on collision damage */
export function damageFlash(): void {
  createFadeOverlay(0xff0000, 0.4, 400, 30, 100, 270);
}

/** Cyan flash for near miss */
export function nearMissFlash(): void {
  createFadeOverlay(0x00ffff, 0.15, 200, 20, 50, 130);
}

/** Highlight a lane momentarily */
export function highlightLane(
  laneY: number,
  laneHeight: number,
  color: number = 0x00ff88,
  duration: number = 300,
): void {
  const w = getWidth();
  const g = new Graphics();
  g.rect(0, laneY - laneHeight / 2, w, laneHeight);
  g.fill({ color, alpha: 0 });

  const effectsLayer = getLayer(RenderLayer.EFFECTS);
  effectsLayer.addChild(g);

  activeAnimations.push({
    graphic: g,
    elapsed: 0,
    duration,
    fadeIn: 30,
    hold: 100,
    fadeOut: duration - 130,
    maxAlpha: 0.15,
    active: true,
  });
}

// ============================================================================
// Vignette Overlay
// ============================================================================

let vignetteGraphic: Graphics | null = null;
let vignetteAlpha = 0;
let vignetteTarget = 0;

export function setVignette(alpha: number): void {
  vignetteTarget = alpha;

  if (!vignetteGraphic) {
    vignetteGraphic = new Graphics();
    getLayer(RenderLayer.EFFECTS).addChild(vignetteGraphic);
  }
}

function updateVignetteOverlay(): void {
  if (!vignetteGraphic) return;

  // Smooth transition
  vignetteAlpha += (vignetteTarget - vignetteAlpha) * 0.1;

  if (vignetteAlpha < 0.01) {
    vignetteGraphic.visible = false;
    return;
  }

  vignetteGraphic.visible = true;
  const w = getWidth();
  const h = getHeight();

  vignetteGraphic.clear();

  // Dark edges — simple rectangular vignette
  const edgeSize = Math.min(w, h) * 0.3;

  // Top
  vignetteGraphic.rect(0, 0, w, edgeSize);
  vignetteGraphic.fill({ color: 0x000000, alpha: vignetteAlpha * 0.6 });

  // Bottom
  vignetteGraphic.rect(0, h - edgeSize, w, edgeSize);
  vignetteGraphic.fill({ color: 0x000000, alpha: vignetteAlpha * 0.6 });

  // Left
  vignetteGraphic.rect(0, 0, edgeSize, h);
  vignetteGraphic.fill({ color: 0x000000, alpha: vignetteAlpha * 0.4 });

  // Right
  vignetteGraphic.rect(w - edgeSize, 0, edgeSize, h);
  vignetteGraphic.fill({ color: 0x000000, alpha: vignetteAlpha * 0.4 });
}

// ============================================================================
// Overdrive Color Matrix Filter (Hue Rotation)
// ============================================================================

let overdriveFilter: ColorMatrixFilter | null = null;
let overdriveActive = false;
let overdriveHue = 0;

export function activateOverdrive(): void {
  const app = getApp();
  if (!app) return;

  overdriveActive = true;
  overdriveHue = 0;

  if (!overdriveFilter) {
    overdriveFilter = new ColorMatrixFilter();
  }

  const stage = app.stage;
  stage.filters = [...(stage.filters || []), overdriveFilter];
}

export function deactivateOverdrive(): void {
  const app = getApp();
  if (!app || !overdriveFilter) return;

  overdriveActive = false;

  const stage = app.stage;
  if (stage.filters) {
    stage.filters = stage.filters.filter((f) => f !== overdriveFilter);
  }
}

function updateOverdriveFilter(dt: number): void {
  if (!overdriveActive || !overdriveFilter) return;

  overdriveHue = (overdriveHue + dt * 0.1) % 360;
  overdriveFilter.hue(overdriveHue, false);
}

// ============================================================================
// Glitch Effect
// ============================================================================

let glitchTimeout: ReturnType<typeof setTimeout> | null = null;

export function glitchEffect(duration: number = 200): void {
  const app = getApp();
  if (!app) return;

  const stage = app.stage;

  // Apply random offset + scale distortion
  const intensity = 5;
  stage.position.set(
    (Math.random() - 0.5) * intensity * 2,
    (Math.random() - 0.5) * intensity * 2,
  );
  stage.scale.set(
    1 + (Math.random() - 0.5) * 0.02,
    1 + (Math.random() - 0.5) * 0.02,
  );

  if (glitchTimeout) clearTimeout(glitchTimeout);

  glitchTimeout = setTimeout(() => {
    stage.position.set(0, 0);
    stage.scale.set(1, 1);
    glitchTimeout = null;
  }, duration);
}

// ============================================================================
// Swap Effect — Quick visual spin on polarity swap
// ============================================================================

export function swapFlash(): void {
  createFadeOverlay(0xffffff, 0.12, 180, 20, 40, 120);
}

// ============================================================================
// Game Over Effect
// ============================================================================

export function gameOverEffect(): void {
  // Red pulse + desaturation feel
  createFadeOverlay(0xff0022, 0.5, 800, 50, 200, 550);

  // Slow vignette fade
  setVignette(0.8);
  setTimeout(() => setVignette(0), 1500);
}

// ============================================================================
// Cleanup
// ============================================================================

export function clearEffects(): void {
  for (const anim of activeAnimations) {
    anim.graphic.destroy();
  }
  activeAnimations.length = 0;

  if (vignetteGraphic) {
    vignetteGraphic.destroy();
    vignetteGraphic = null;
  }
  vignetteAlpha = 0;
  vignetteTarget = 0;

  deactivateOverdrive();

  if (glitchTimeout) {
    clearTimeout(glitchTimeout);
    glitchTimeout = null;
  }
}
