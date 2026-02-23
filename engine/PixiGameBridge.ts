/**
 * PixiGameBridge.ts — Game State → PixiJS Visual Sync
 * 
 * Bridges the Canvas2D game logic to PixiJS visual effects.
 * Called from the game loop each frame to sync positions, and
 * on discrete events (collision, near-miss, collect, etc.).
 * 
 * This is a HYBRID bridge — the Canvas2D still handles core 
 * game object rendering; PixiJS adds enhanced backgrounds,
 * particles, and screen effects on top.
 */

import type { GlitchSeekerRenderState } from '../systems/EnemyManager';
import * as PixiBackground from './PixiBackground';
import * as PixiEffects from './PixiEffects';
import * as PixiGlitchSeeker from './PixiGlitchSeeker';
import * as PixiParticles from './PixiParticles';
import * as PixiRenderer from './PixiRenderer';

// ============================================================================
// Per-Frame Sync — Called every frame from game loop
// ============================================================================

/**
 * Main per-frame update. Call this from the game loop after all logic updates.
 * @param dt - Delta time in milliseconds
 * @param gameSpeed - Current game speed multiplier
 * @param midlineY - Current midline Y position in pixels
 * @param whiteOrbX - White orb X position
 * @param whiteOrbY - White orb Y position
 * @param blackOrbX - Black orb X position
 * @param blackOrbY - Black orb Y position
 * @param isOverdrive - Whether overdrive mode is active
 */
export function syncFrame(
  dt: number,
  gameSpeed: number,
  midlineY: number,
  whiteOrbX: number,
  whiteOrbY: number,
  blackOrbX: number,
  blackOrbY: number,
  isOverdrive: boolean,
  seekerRenderState?: GlitchSeekerRenderState | null,
): void {
  if (!PixiRenderer.isInitialized()) return;

  // Update subsystems
  PixiBackground.updateBackground(dt, gameSpeed, midlineY);
  PixiParticles.updateParticles(dt);
  PixiEffects.updateEffects(dt);
  PixiRenderer.updateShake(dt);

  // Emit orb trails
  PixiParticles.emitTrail(whiteOrbX, whiteOrbY, 0xffffff, 1);
  PixiParticles.emitTrail(blackOrbX, blackOrbY, 0x888888, 1);

  // Overdrive aura particles
  if (isOverdrive) {
    PixiParticles.emitOverdriveAura(whiteOrbX, whiteOrbY, 2);
    PixiParticles.emitOverdriveAura(blackOrbX, blackOrbY, 2);
  }

  // Ambient particles (spawn occasionally)
  if (Math.random() < 0.03) {
    const theme = PixiBackground.getCurrentTheme();
    PixiParticles.emitAmbient(theme.ambientParticleColor, 1);
  }

  // Update Glitch Seeker visuals (GPU-rendered enemy)
  if (seekerRenderState && seekerRenderState.state !== 'idle') {
    PixiGlitchSeeker.updateSeekerVisuals(dt, seekerRenderState);
  }
}

// ============================================================================
// Event Effects — Called on discrete game events
// ============================================================================

/** When a shard/collectible is collected */
export function onShardCollected(x: number, y: number, value: number): void {
  if (!PixiRenderer.isInitialized()) return;

  const color = value >= 5 ? 0xffd700 : value >= 3 ? 0x00ffff : 0x44ff44;
  PixiParticles.emitCollect(x, y, color, 10 + value * 2);
  PixiEffects.screenFlash(color, 0.15);
}

/** When player achieves a near miss dodge */
export function onNearMiss(x: number, y: number, streakCount: number): void {
  if (!PixiRenderer.isInitialized()) return;

  const color = streakCount >= 5 ? 0xffd700 : 0x00ffff;
  PixiParticles.emitSparks(x, y, color, 6 + streakCount * 2);
  PixiEffects.nearMissFlash();
}

/** When player collides with obstacle */
export function onCollision(x: number, y: number, fatal: boolean): void {
  if (!PixiRenderer.isInitialized()) return;

  PixiParticles.emitExplosion(x, y, 0xff2222, fatal ? 30 : 16);
  PixiEffects.damageFlash();
  PixiRenderer.triggerShake(fatal ? 12 : 6, fatal ? 400 : 200);

  if (fatal) {
    PixiEffects.glitchEffect(300);
  }
}

/** When obstacle is destroyed (overdrive collision) */
export function onObstacleDestroyed(x: number, y: number): void {
  if (!PixiRenderer.isInitialized()) return;

  PixiParticles.emitExplosion(x, y, 0xff00ff, 16);
  PixiEffects.screenFlash(0xff00ff, 0.1);
}

/** Overdrive mode activated */
export function onOverdriveActivate(): void {
  if (!PixiRenderer.isInitialized()) return;

  PixiEffects.activateOverdrive();
  PixiEffects.screenFlash(0xff00ff, 0.3);
  PixiRenderer.triggerShake(10, 300);

  // Confetti burst from center
  const cx = PixiRenderer.getWidth() / 2;
  const cy = PixiRenderer.getHeight() / 2;
  PixiParticles.emitConfetti(cx, cy, 25);
}

/** Overdrive mode deactivated */
export function onOverdriveDeactivate(): void {
  if (!PixiRenderer.isInitialized()) return;

  PixiEffects.deactivateOverdrive();
  PixiEffects.screenFlash(0xffffff, 0.1);
}

/** Player swap (polarity flip) */
export function onSwap(orbX: number, orbY: number): void {
  if (!PixiRenderer.isInitialized()) return;

  PixiEffects.swapFlash();
  PixiParticles.emitSparks(orbX, orbY, 0xffffff, 4);
}

/** Game over */
export function onGameOver(): void {
  if (!PixiRenderer.isInitialized()) return;

  PixiEffects.gameOverEffect();
  const cx = PixiRenderer.getWidth() / 2;
  const cy = PixiRenderer.getHeight() / 2;
  PixiParticles.emitExplosion(cx, cy, 0xff0022, 40);
}

/** S.H.I.F.T. letter collected */
export function onLetterCollected(x: number, y: number): void {
  if (!PixiRenderer.isInitialized()) return;

  PixiParticles.emitCollect(x, y, 0xff00ff, 15);
  PixiEffects.screenFlash(0xff00ff, 0.2);
  PixiRenderer.triggerShake(4, 150);
}

/** Cleanup all renderables for game restart */
export function cleanupAllRenderables(): void {
  PixiParticles.clearAllParticles();
  PixiEffects.clearEffects();
  PixiGlitchSeeker.destroySeeker();
}

// ============================================================================
// Initialization
// ============================================================================

/** Initialize the bridge — call after PixiRenderer.initRenderer() */
export function initBridge(zoneTheme: string = 'default'): void {
  PixiBackground.setZoneTheme(zoneTheme);
  PixiGlitchSeeker.initSeeker();
}

/** Change zone theme mid-game */
export function setZoneTheme(themeKey: string): void {
  PixiBackground.setZoneTheme(themeKey);
}

/** Full cleanup */
export function destroyBridge(): void {
  cleanupAllRenderables();
  PixiBackground.destroyBackground();
  PixiParticles.destroyParticles();
}
