/**
 * PixiGlitchSeeker.ts — Full PixiJS GPU-Rendered Glitch Seeker Enemy
 *
 * Renders a digital ghost (Pac-Man ghost silhouette) on the OBSTACLES layer.
 * Because the PixiJS canvas sits BEHIND Canvas2D, the ghost appears as an
 * ethereal entity haunting from a different digital plane.
 *
 * Features:
 *  - Procedural Graphics body (ghost shape) with scan lines & glitch slices
 *  - Pre-allocated trail pool (20 afterimages) — zero allocation per-frame
 *  - BlurFilter glow, ColorMatrixFilter hue shifts
 *  - Enters with progressive reveal, dies with dissolve/shatter
 *  - Integrates with PixiParticles for ambient sparks & teleport bursts
 */

import { BlurFilter, Container, Graphics } from 'pixi.js';
import { GLITCH_SEEKER_CONFIG as CFG } from '../constants';
import type { GlitchSeekerRenderState } from '../systems/EnemyManager';
import * as PixiEffects from './PixiEffects';
import * as PixiParticles from './PixiParticles';
import { getLayer, isInitialized, RenderLayer, triggerShake } from './PixiRenderer';

// ============================================================================
// Module State
// ============================================================================

let _initialized = false;

// Containers
let seekerContainer: Container | null = null;
let bodyContainer: Container | null = null;
let bodyGraphics: Graphics | null = null;
let eyesGraphics: Graphics | null = null;
let scanLinesGraphics: Graphics | null = null;
let auraGraphics: Graphics | null = null;
let glitchSliceContainer: Container | null = null;

// Trail pool
interface TrailGhost {
  graphics: Graphics;
  active: boolean;
  age: number;      // ms since spawn
  baseAlpha: number;
}
const trailPool: TrailGhost[] = [];

// Shatter fragments for death
interface ShatterFragment {
  graphics: Graphics;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  alpha: number;
  active: boolean;
}
const shatterFragments: ShatterFragment[] = [];

// Animation state (module-level singleton — zero alloc)
const anim = {
  time: 0,
  jitterX: 0,
  jitterY: 0,
  jitterTimer: 0,
  jitterInterval: 100,       // ms between jitter refreshes
  scanLineOffset: 0,
  eyeGlow: 1,
  bodyWobble: 0,
  breatheScale: 1,
  trailSpawnAccum: 0,
  trailWriteIndex: 0,        // round-robin pointer into trail pool
  lastState: 'idle' as string,
  teleportFlashTimer: 0,     // >0 during teleport afterimage
  prevX: 0,
  prevY: 0,
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Create all PixiJS display objects and attach to OBSTACLES layer.
 * Safe to call multiple times (idempotent).
 */
export function initSeeker(): void {
  if (!isInitialized()) return;
  if (_initialized) return;

  const obstacleLayer = getLayer(RenderLayer.OBSTACLES);

  // Root container
  seekerContainer = new Container();
  seekerContainer.label = 'glitchSeeker';
  seekerContainer.visible = false;
  obstacleLayer.addChild(seekerContainer);

  // Aura (outer glow ring)
  auraGraphics = new Graphics();
  auraGraphics.label = 'seekerAura';
  seekerContainer.addChild(auraGraphics);

  // Body container (holds body + slices)
  bodyContainer = new Container();
  bodyContainer.label = 'seekerBody';
  seekerContainer.addChild(bodyContainer);

  // Main body shape
  bodyGraphics = new Graphics();
  bodyGraphics.label = 'seekerBodyShape';
  drawGhostBody(bodyGraphics, CFG.BODY_WIDTH, CFG.BODY_HEIGHT, CFG.COLOR_BODY);
  bodyContainer.addChild(bodyGraphics);

  // Glow filter on body
  const bodyBlur = new BlurFilter({ strength: CFG.GLOW_BLUR_STRENGTH });
  bodyGraphics.filters = [bodyBlur];

  // Scan lines overlay
  scanLinesGraphics = new Graphics();
  scanLinesGraphics.label = 'seekerScanLines';
  bodyContainer.addChild(scanLinesGraphics);

  // Glitch slices container
  glitchSliceContainer = new Container();
  glitchSliceContainer.label = 'seekerGlitchSlices';
  for (let i = 0; i < CFG.GLITCH_SLICE_COUNT; i++) {
    const slice = new Graphics();
    slice.label = `glitchSlice_${i}`;
    slice.visible = false;
    glitchSliceContainer.addChild(slice);
  }
  bodyContainer.addChild(glitchSliceContainer);

  // Eyes
  eyesGraphics = new Graphics();
  eyesGraphics.label = 'seekerEyes';
  bodyContainer.addChild(eyesGraphics);

  // Trail pool — pre-allocate
  for (let i = 0; i < CFG.TRAIL_POOL_SIZE; i++) {
    const g = new Graphics();
    g.label = `seekerTrail_${i}`;
    g.visible = false;
    drawGhostBody(g, CFG.BODY_WIDTH * 0.4, CFG.BODY_HEIGHT * 0.4, CFG.COLOR_TRAIL_NEW);
    seekerContainer.addChild(g); // Trails behind body
    trailPool.push({ graphics: g, active: false, age: 0, baseAlpha: 0 });
  }
  // Move body container to front of seekerContainer (trails render behind)
  seekerContainer.addChild(bodyContainer);

  // Shatter fragments — pre-allocate
  for (let i = 0; i < CFG.SHATTER_FRAGMENT_COUNT; i++) {
    const g = new Graphics();
    g.label = `shatterFrag_${i}`;
    g.visible = false;
    // Draw a small rectangle fragment
    const w = 8 + Math.random() * 10;
    const h = 6 + Math.random() * 8;
    g.rect(-w / 2, -h / 2, w, h);
    g.fill({ color: CFG.COLOR_TRAIL_NEW, alpha: 0.9 });
    seekerContainer.addChild(g);
    shatterFragments.push({
      graphics: g,
      vx: 0, vy: 0,
      rotation: 0, rotationSpeed: 0,
      alpha: 0,
      active: false,
    });
  }

  _initialized = true;
}

// ============================================================================
// Ghost Body Drawing (procedural Pac-Man ghost silhouette)
// ============================================================================

function drawGhostBody(g: Graphics, w: number, h: number, color: number): void {
  g.clear();

  const halfW = w / 2;
  const topRadius = halfW; // Semi-circle at top
  const waveCount = 3;
  const waveH = h * 0.15; // Wavy bottom edge height

  // Start from top-left of the semi-circle arc
  g.moveTo(-halfW, 0);

  // Top half: semi-circle (arc from left to right)
  g.arc(0, 0, topRadius, Math.PI, 0, false);

  // Right side straight down to wave start
  g.lineTo(halfW, h * 0.6);

  // Wavy bottom edge (3 waves)
  const segW = w / waveCount;
  for (let i = 0; i < waveCount; i++) {
    const baseX = halfW - i * segW;
    const midX = baseX - segW / 2;
    const endX = baseX - segW;
    // Down dip then up peak
    g.quadraticCurveTo(midX, h * 0.6 + waveH, endX, h * 0.6);
  }

  // Left side back up
  g.lineTo(-halfW, 0);
  g.closePath();

  g.fill({ color, alpha: 0.85 });

  // Circuit trace lines (decorative)
  g.moveTo(-halfW * 0.5, -topRadius * 0.3);
  g.lineTo(-halfW * 0.2, -topRadius * 0.1);
  g.lineTo(halfW * 0.1, -topRadius * 0.2);
  g.stroke({ color: 0x00ffcc, width: 0.8, alpha: 0.25 });

  g.moveTo(halfW * 0.3, topRadius * 0.1);
  g.lineTo(halfW * 0.1, topRadius * 0.35);
  g.lineTo(-halfW * 0.1, topRadius * 0.3);
  g.stroke({ color: 0x00ffcc, width: 0.6, alpha: 0.2 });
}

// ============================================================================
// Per-Frame Visual Update
// ============================================================================

/**
 * Main per-frame update — called from PixiGameBridge.syncFrame()
 */
export function updateSeekerVisuals(dt: number, renderState: GlitchSeekerRenderState): void {
  if (!_initialized || !seekerContainer) return;

  anim.time += dt;

  const { state, x, y, opacity, entryProgress, glitchPhase, huntDuration, deathReason, deathProgress, playerScreenX } = renderState;

  // ── Visibility gate ──
  if (state === 'idle') {
    seekerContainer.visible = false;
    // Still update shatter fragments if active
    updateShatterFragments(dt);
    return;
  }

  seekerContainer.visible = true;

  // ── Position ──
  updateJitter(dt, state);
  const drawX = x + (state === 'hunting' ? anim.jitterX : 0);
  const drawY = y + (state === 'hunting' ? anim.jitterY : 0);

  // Body container position
  if (bodyContainer) {
    // Wobble
    anim.bodyWobble = Math.sin(anim.time * 0.005) * 2;
    anim.breatheScale = 1 + Math.sin(anim.time * 0.003) * 0.03;

    bodyContainer.position.set(drawX + anim.bodyWobble, drawY);
    bodyContainer.scale.set(anim.breatheScale);
    bodyContainer.alpha = opacity;
  }

  // ── State-specific updates ──
  switch (state) {
    case 'entering':
      updateEntering(dt, entryProgress, x, y);
      break;
    case 'hunting':
      updateHunting(dt, huntDuration, x, y, playerScreenX);
      break;
    case 'dying':
      updateDying(dt, deathProgress, deathReason, x, y);
      break;
  }

  // ── Always update these ──
  updateScanLines(dt);
  updateGlitchSlices(dt, state, glitchPhase);
  updateAura(dt, state, opacity);
  updateTrailPool(dt, state);
  updateShatterFragments(dt);

  // ── State transition detection ──
  if (anim.lastState !== state) {
    onStateChange(anim.lastState, state, x, y, deathReason);
    anim.lastState = state;
  }
  anim.prevX = x;
  anim.prevY = y;
}

// ============================================================================
// Sub-update functions
// ============================================================================

function updateJitter(dt: number, state: string): void {
  anim.jitterTimer += dt;
  if (anim.jitterTimer >= anim.jitterInterval) {
    anim.jitterTimer = 0;
    anim.jitterX = (Math.random() - 0.5) * 6;
    anim.jitterY = (Math.random() - 0.5) * 4;
    // Vary interval for organic feel
    anim.jitterInterval = 80 + Math.random() * 70;
  }
}

function updateEntering(dt: number, progress: number, _x: number, _y: number): void {
  if (!bodyContainer || !bodyGraphics) return;

  // Progressive blur: starts blurry, becomes sharp
  const blurStrength = (1 - progress) * 12 + CFG.GLOW_BLUR_STRENGTH;
  const filters = bodyGraphics.filters;
  if (filters && filters.length > 0) {
    (filters[0] as BlurFilter).strength = blurStrength;
  }

  // Emit sparks during entry
  if (progress > 0.3 && Math.random() < 0.15) {
    PixiParticles.emitSparks(anim.prevX || _x, anim.prevY || _y, CFG.COLOR_AURA_ENTERING, 2);
  }
}

function updateHunting(dt: number, huntDuration: number, x: number, y: number, playerScreenX: number): void {
  // ── Eyes update (look-at effect) ──
  updateEyes(playerScreenX, x, true);

  // ── Trail spawn accumulator ──
  anim.trailSpawnAccum += dt;
  if (anim.trailSpawnAccum >= CFG.TRAIL_SPAWN_INTERVAL) {
    anim.trailSpawnAccum -= CFG.TRAIL_SPAWN_INTERVAL;
    spawnTrailGhost(x, y, huntDuration);
  }

  // ── Ambient PixiParticles (shared pool — low cost) ──
  if (Math.random() < 0.08) {
    PixiParticles.emitTrail(x, y, CFG.COLOR_TRAIL_NEW, 1);
  }
  if (Math.random() < 0.02) {
    PixiParticles.emitSparks(x, y, CFG.COLOR_EYES_HUNTING, 1);
  }

  // ── Teleport afterimage flash ──
  if (anim.teleportFlashTimer > 0) {
    anim.teleportFlashTimer -= dt;
  }

  // ── Reset blur to normal during hunting ──
  if (bodyGraphics?.filters?.length) {
    const current = (bodyGraphics.filters[0] as BlurFilter).strength;
    if (current > CFG.GLOW_BLUR_STRENGTH + 0.5) {
      (bodyGraphics.filters[0] as BlurFilter).strength = current - dt * 0.02;
    }
  }
}

function updateDying(_dt: number, progress: number, reason: string, x: number, y: number): void {
  if (!bodyContainer) return;

  // Scale shrink + alpha (both handled by opacity from state machine)
  bodyContainer.scale.set(1 - progress * 0.3);

  // Eyes off
  updateEyes(x, x, false);

  // For shatter fragments already triggered by state change event
}

function updateEyes(playerScreenX: number, seekerX: number, active: boolean): void {
  if (!eyesGraphics) return;
  eyesGraphics.clear();
  if (!active) return;

  // Look-at offset (max 3px)
  const lookDir = Math.sign(playerScreenX - seekerX);
  const lookOffset = lookDir * 3;

  // Pulsing glow
  anim.eyeGlow = 0.6 + Math.sin(anim.time * 0.008) * 0.4;

  const eyeW = 8;
  const eyeH = 5;
  const eyeY = -CFG.BODY_HEIGHT * 0.15;
  const eyeSpacing = CFG.BODY_WIDTH * 0.22;

  // Left eye
  eyesGraphics.roundRect(-eyeSpacing + lookOffset - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, 1);
  // Right eye
  eyesGraphics.roundRect(eyeSpacing + lookOffset - eyeW / 2, eyeY - eyeH / 2, eyeW, eyeH, 1);

  eyesGraphics.fill({ color: CFG.COLOR_EYES_HUNTING, alpha: anim.eyeGlow });
}

function updateScanLines(dt: number): void {
  if (!scanLinesGraphics) return;
  scanLinesGraphics.clear();

  anim.scanLineOffset = (anim.scanLineOffset + 0.5 * (dt / 16)) % (CFG.SCAN_LINE_COUNT * 2);

  const halfW = CFG.BODY_WIDTH / 2;
  const lineSpacing = 2;

  for (let i = 0; i < CFG.SCAN_LINE_COUNT; i++) {
    const lineY = -CFG.BODY_HEIGHT * 0.3 + i * lineSpacing + anim.scanLineOffset;
    if (lineY < -CFG.BODY_HEIGHT * 0.5 || lineY > CFG.BODY_HEIGHT * 0.7) continue;
    scanLinesGraphics.moveTo(-halfW * 0.7, lineY);
    scanLinesGraphics.lineTo(halfW * 0.7, lineY);
  }
  scanLinesGraphics.stroke({ color: 0xffffff, width: 1, alpha: 0.12 });
}

function updateGlitchSlices(dt: number, state: string, _glitchPhase: number): void {
  if (!glitchSliceContainer) return;

  // Only show slices during hunting/entering
  if (state !== 'hunting' && state !== 'entering') {
    for (let i = 0; i < glitchSliceContainer.children.length; i++) {
      glitchSliceContainer.children[i].visible = false;
    }
    return;
  }

  for (let i = 0; i < glitchSliceContainer.children.length; i++) {
    const slice = glitchSliceContainer.children[i] as Graphics;

    // Each slice toggles on/off periodically
    const slicePhase = anim.time + i * 37; // Offset per slice
    const slicePeriod = 100 + i * 20; // Different period per slice
    const isOn = (slicePhase % slicePeriod) < slicePeriod * 0.3;

    slice.visible = isOn;
    if (!isOn) continue;

    // Redraw slice rect at random offset
    slice.clear();
    const sliceY = (Math.random() - 0.5) * CFG.BODY_HEIGHT * 0.8;
    const sliceH = 2 + Math.random() * 3;
    const offsetX = (Math.random() - 0.5) * 20;
    const sliceW = CFG.BODY_WIDTH * 0.6;

    slice.rect(-sliceW / 2 + offsetX, sliceY, sliceW, sliceH);
    slice.fill({ color: i % 2 === 0 ? 0x00ffcc : 0xff3366, alpha: 0.5 });
  }
}

function updateAura(dt: number, state: string, opacity: number): void {
  if (!auraGraphics || !seekerContainer) return;

  auraGraphics.clear();
  if (state === 'idle' || opacity <= 0.01) return;

  const pulseAlpha = 0.2 + Math.sin(anim.time * 0.004) * 0.1;
  const auraRadius = CFG.BODY_WIDTH * 0.8;
  const color = state === 'entering' ? CFG.COLOR_AURA_ENTERING : CFG.COLOR_AURA_HUNTING;

  auraGraphics.circle(0, 0, auraRadius);
  auraGraphics.fill({ color, alpha: pulseAlpha * opacity });

  // Position aura at body
  auraGraphics.position.copyFrom(bodyContainer?.position || { x: 0, y: 0 });
}

// ============================================================================
// Trail Pool (round-robin, zero allocation)
// ============================================================================

function spawnTrailGhost(x: number, y: number, huntDuration: number): void {
  const trail = trailPool[anim.trailWriteIndex];
  anim.trailWriteIndex = (anim.trailWriteIndex + 1) % CFG.TRAIL_POOL_SIZE;

  trail.active = true;
  trail.age = 0;
  trail.baseAlpha = 0.6;
  trail.graphics.position.set(x, y);
  trail.graphics.visible = true;
  trail.graphics.alpha = 0.6;
  trail.graphics.scale.set(0.7);

  // Color interpolation: newer = cyan, older = purple (tint on graphics)
  // We use a simple approach: redraw with lerped color
  const tAge = Math.min(1, huntDuration / CFG.MAX_HUNT_DURATION);
  const r1 = (CFG.COLOR_TRAIL_NEW >> 16) & 0xff;
  const g1 = (CFG.COLOR_TRAIL_NEW >> 8) & 0xff;
  const b1 = CFG.COLOR_TRAIL_NEW & 0xff;
  const r2 = (CFG.COLOR_TRAIL_OLD >> 16) & 0xff;
  const g2 = (CFG.COLOR_TRAIL_OLD >> 8) & 0xff;
  const b2 = CFG.COLOR_TRAIL_OLD & 0xff;
  const r = Math.round(r1 + (r2 - r1) * tAge);
  const g = Math.round(g1 + (g2 - g1) * tAge);
  const b = Math.round(b1 + (b2 - b1) * tAge);
  const color = (r << 16) | (g << 8) | b;

  drawGhostBody(trail.graphics, CFG.BODY_WIDTH * 0.4, CFG.BODY_HEIGHT * 0.4, color);
}

function updateTrailPool(dt: number, state: string): void {
  for (let i = 0; i < trailPool.length; i++) {
    const t = trailPool[i];
    if (!t.active) continue;

    t.age += dt;
    t.baseAlpha -= CFG.TRAIL_FADE_SPEED * (dt / 16);

    if (t.baseAlpha <= 0.01) {
      t.active = false;
      t.graphics.visible = false;
      continue;
    }

    t.graphics.alpha = t.baseAlpha;
    // Slight scale shrink
    const shrink = Math.max(0.2, 0.7 - t.age * 0.0003);
    t.graphics.scale.set(shrink);
  }

  // If state changed to dying/idle, fast-fade all trails
  if (state === 'dying' || state === 'idle') {
    for (let i = 0; i < trailPool.length; i++) {
      if (trailPool[i].active) {
        trailPool[i].baseAlpha *= 0.85;
      }
    }
  }
}

// ============================================================================
// Shatter Fragments (death VFX)
// ============================================================================

function triggerShatter(x: number, y: number): void {
  for (let i = 0; i < shatterFragments.length; i++) {
    const frag = shatterFragments[i];
    frag.active = true;
    frag.alpha = 1;
    const angle = (Math.PI * 2 / shatterFragments.length) * i + (Math.random() - 0.5) * 0.5;
    const speed = 80 + Math.random() * 120;
    frag.vx = Math.cos(angle) * speed;
    frag.vy = Math.sin(angle) * speed - 40; // Slight upward bias
    frag.rotation = 0;
    frag.rotationSpeed = (Math.random() - 0.5) * 8;
    frag.graphics.position.set(x, y);
    frag.graphics.visible = true;
    frag.graphics.alpha = 1;
  }
}

function updateShatterFragments(dt: number): void {
  const dtSec = dt / 1000;
  for (let i = 0; i < shatterFragments.length; i++) {
    const f = shatterFragments[i];
    if (!f.active) continue;

    f.vx *= 0.97;
    f.vy += 200 * dtSec; // gravity
    f.vy *= 0.97;
    f.rotation += f.rotationSpeed * dtSec;
    f.alpha -= 1.5 * dtSec;

    const g = f.graphics;
    g.position.x += f.vx * dtSec;
    g.position.y += f.vy * dtSec;
    g.rotation = f.rotation;
    g.alpha = Math.max(0, f.alpha);

    if (f.alpha <= 0) {
      f.active = false;
      g.visible = false;
    }
  }
}

// ============================================================================
// State Change Events (transitions)
// ============================================================================

function onStateChange(from: string, to: string, x: number, y: number, deathReason: string): void {
  if (!isInitialized()) return;

  if (to === 'entering') {
    // Entry particles
    PixiParticles.emitSparks(x, y < 0 ? 20 : y, CFG.COLOR_AURA_ENTERING, 8);
  }

  if (to === 'hunting' && from === 'entering') {
    // Flash on hunt start
    PixiEffects.glitchEffect(200);
    PixiEffects.screenFlash(CFG.COLOR_AURA_ENTERING, 0.2);
  }

  if (to === 'dying') {
    if (deathReason === 'countered') {
      // Big explosion on counter
      triggerShake(6, 300);
      PixiParticles.emitExplosion(x, y, CFG.COLOR_AURA_ENTERING, 20);
      PixiEffects.screenFlash(CFG.COLOR_EYES_HUNTING, 0.3);
      PixiEffects.glitchEffect(150);
      triggerShatter(x, y);
    } else {
      // Soft dissolve particles for escape
      PixiParticles.emitTrail(x, y, CFG.COLOR_TRAIL_OLD, 6);
      PixiParticles.emitSparks(x, y, CFG.COLOR_TRAIL_NEW, 4);
    }
  }
}

// ============================================================================
// External Events (called from PixiGameBridge)
// ============================================================================

/**
 * Called when seeker teleports — afterimage + spark burst
 */
export function onSeekerTeleport(fromX: number, fromY: number, toX: number, toY: number): void {
  if (!isInitialized() || !_initialized) return;

  // Afterimage at old position
  anim.teleportFlashTimer = 200;

  // Sparks at new position
  PixiParticles.emitExplosion(toX, toY, CFG.COLOR_AURA_ENTERING, 6);

  // Micro screen glitch
  PixiEffects.glitchEffect(80);
}

// ============================================================================
// Visibility & Cleanup
// ============================================================================

export function setSeekerVisible(visible: boolean): void {
  if (seekerContainer) seekerContainer.visible = visible;
}

export function destroySeeker(): void {
  if (seekerContainer && seekerContainer.parent) {
    seekerContainer.parent.removeChild(seekerContainer);
    seekerContainer.destroy({ children: true });
  }
  seekerContainer = null;
  bodyContainer = null;
  bodyGraphics = null;
  eyesGraphics = null;
  scanLinesGraphics = null;
  auraGraphics = null;
  glitchSliceContainer = null;
  trailPool.length = 0;
  shatterFragments.length = 0;
  _initialized = false;
}

export function isSeekerInitialized(): boolean {
  return _initialized;
}
