/**
 * PixiParticles.ts — GPU-Accelerated Particle System
 * 
 * High-performance particle pool with 8 effect emitters.
 * Uses object pooling to avoid GC pressure in the hot path.
 * Max 500 particles, auto-recycled by oldest when pool is full.
 */

import { Graphics, Container } from 'pixi.js';
import { getLayer, RenderLayer, getWidth, getHeight } from './PixiRenderer';

// ============================================================================
// Configuration
// ============================================================================

const MAX_PARTICLES = 500;

// ============================================================================
// Particle Type
// ============================================================================

interface PixiParticle {
  sprite: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  startSize: number;
  endSize: number;
  color: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  friction: number;
  shape: 'circle' | 'rect' | 'diamond';
  active: boolean;
  layer: 'front' | 'back';
}

// ============================================================================
// Pool
// ============================================================================

const pool: PixiParticle[] = [];
let poolIndex = 0;

function getParticle(): PixiParticle {
  // Find inactive particle
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) {
      return pool[i];
    }
  }

  // If pool not full, create new
  if (pool.length < MAX_PARTICLES) {
    const sprite = new Graphics();
    const p: PixiParticle = {
      sprite,
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      size: 4, startSize: 4, endSize: 0,
      color: 0xffffff, alpha: 1,
      rotation: 0, rotationSpeed: 0,
      gravity: 0, friction: 0.98,
      shape: 'circle',
      active: false,
      layer: 'front',
    };
    pool.push(p);
    return p;
  }

  // Recycle oldest
  const oldest = pool[poolIndex % pool.length];
  oldest.sprite.visible = false;
  oldest.active = false;
  poolIndex = (poolIndex + 1) % pool.length;
  return oldest;
}

function activateParticle(
  p: PixiParticle,
  x: number, y: number,
  vx: number, vy: number,
  life: number,
  size: number,
  color: number,
  opts?: Partial<Pick<PixiParticle, 'gravity' | 'friction' | 'shape' | 'layer' | 'rotationSpeed' | 'endSize'>>,
): void {
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.life = life;
  p.maxLife = life;
  p.size = size;
  p.startSize = size;
  p.endSize = opts?.endSize ?? 0;
  p.color = color;
  p.alpha = 1;
  p.rotation = 0;
  p.rotationSpeed = opts?.rotationSpeed ?? 0;
  p.gravity = opts?.gravity ?? 0;
  p.friction = opts?.friction ?? 0.98;
  p.shape = opts?.shape ?? 'circle';
  p.layer = opts?.layer ?? 'front';
  p.active = true;

  // Redraw sprite
  const s = p.sprite;
  s.clear();
  switch (p.shape) {
    case 'circle':
      s.circle(0, 0, size);
      break;
    case 'rect':
      s.rect(-size / 2, -size / 2, size, size);
      break;
    case 'diamond':
      s.moveTo(0, -size);
      s.lineTo(size, 0);
      s.lineTo(0, size);
      s.lineTo(-size, 0);
      s.closePath();
      break;
  }
  s.fill({ color, alpha: 1 });

  s.position.set(x, y);
  s.visible = true;

  const layerContainer = p.layer === 'front'
    ? getLayer(RenderLayer.PARTICLES_FRONT)
    : getLayer(RenderLayer.PARTICLES_BACK);

  if (!s.parent || s.parent !== layerContainer) {
    layerContainer.addChild(s);
  }
}

// ============================================================================
// Update
// ============================================================================

export function updateParticles(dt: number): void {
  const dtSec = dt / 1000;

  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;

    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      p.sprite.visible = false;
      continue;
    }

    // Physics
    p.vx *= p.friction;
    p.vy *= p.friction;
    p.vy += p.gravity * dtSec;
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.rotation += p.rotationSpeed * dtSec;

    // Interpolate size and alpha
    const progress = 1 - p.life / p.maxLife;
    p.size = p.startSize + (p.endSize - p.startSize) * progress;
    p.alpha = 1 - progress;

    // Apply to sprite
    const s = p.sprite;
    s.position.set(p.x, p.y);
    s.alpha = p.alpha;
    s.rotation = p.rotation;
    s.scale.set(p.size / p.startSize || 0.01);
  }
}

// ============================================================================
// Emitters
// ============================================================================

const _rand = () => Math.random();
const _range = (min: number, max: number) => min + _rand() * (max - min);

/** Continuous trail behind the orbs */
export function emitTrail(x: number, y: number, color: number, count: number = 2): void {
  for (let i = 0; i < count; i++) {
    const p = getParticle();
    activateParticle(p,
      x + _range(-3, 3),
      y + _range(-3, 3),
      _range(-15, 15),
      _range(-15, 15),
      _range(300, 600),
      _range(2, 4),
      color,
      { friction: 0.95, layer: 'back', endSize: 0 },
    );
  }
}

/** Burst when collecting orb/shard */
export function emitCollect(x: number, y: number, color: number, count: number = 12): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + _range(-0.2, 0.2);
    const speed = _range(80, 200);
    const p = getParticle();
    activateParticle(p,
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      _range(400, 800),
      _range(3, 6),
      color,
      { gravity: 50, friction: 0.96, shape: 'diamond', layer: 'front' },
    );
  }
}

/** Radial explosion on collision */
export function emitExplosion(x: number, y: number, color: number, count: number = 24): void {
  for (let i = 0; i < count; i++) {
    const angle = _range(0, Math.PI * 2);
    const speed = _range(100, 350);
    const p = getParticle();
    activateParticle(p,
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      _range(500, 1200),
      _range(3, 8),
      color,
      {
        gravity: _range(30, 100),
        friction: 0.94,
        shape: _rand() > 0.5 ? 'rect' : 'circle',
        layer: 'front',
        rotationSpeed: _range(-5, 5),
      },
    );
  }
}

/** Confetti burst for celebrations */
export function emitConfetti(x: number, y: number, count: number = 30): void {
  const colors = [0xFF00FF, 0x00FFFF, 0xFFFF00, 0xFF4444, 0x44FF44, 0x4444FF];
  for (let i = 0; i < count; i++) {
    const p = getParticle();
    activateParticle(p,
      x + _range(-20, 20),
      y,
      _range(-150, 150),
      _range(-300, -100),
      _range(1000, 2500),
      _range(4, 8),
      colors[i % colors.length],
      {
        gravity: 200,
        friction: 0.99,
        shape: 'rect',
        layer: 'front',
        rotationSpeed: _range(-8, 8),
      },
    );
  }
}

/** Spark burst for near miss */
export function emitSparks(x: number, y: number, color: number, count: number = 8): void {
  for (let i = 0; i < count; i++) {
    const angle = _range(0, Math.PI * 2);
    const speed = _range(60, 160);
    const p = getParticle();
    activateParticle(p,
      x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      _range(200, 500),
      _range(2, 4),
      color,
      { friction: 0.92, shape: 'diamond', layer: 'front', endSize: 1 },
    );
  }
}

/** Ambient floating particles */
export function emitAmbient(color: number, count: number = 1): void {
  const w = getWidth();
  const h = getHeight();
  for (let i = 0; i < count; i++) {
    const p = getParticle();
    activateParticle(p,
      w + 10,
      _range(0, h),
      _range(-30, -80),
      _range(-10, 10),
      _range(3000, 6000),
      _range(1, 3),
      color,
      { friction: 1.0, layer: 'back', endSize: 0 },
    );
  }
}

/** Score/text popup that floats up and fades */
export function emitScorePopup(x: number, y: number, color: number): void {
  const p = getParticle();
  activateParticle(p,
    x, y,
    0, -60,
    1000,
    6,
    color,
    { friction: 1.0, layer: 'front', gravity: -20, endSize: 8 },
  );
}

/** Overdrive energy particles */
export function emitOverdriveAura(x: number, y: number, count: number = 3): void {
  const colors = [0xFF00FF, 0xAA00FF, 0xFF44FF];
  for (let i = 0; i < count; i++) {
    const p = getParticle();
    const angle = _range(0, Math.PI * 2);
    activateParticle(p,
      x + Math.cos(angle) * _range(5, 20),
      y + Math.sin(angle) * _range(5, 20),
      Math.cos(angle) * _range(20, 50),
      Math.sin(angle) * _range(20, 50),
      _range(400, 800),
      _range(2, 5),
      colors[i % colors.length],
      { friction: 0.96, layer: 'front', shape: 'circle', endSize: 0 },
    );
  }
}

// ============================================================================
// Cleanup
// ============================================================================

export function clearAllParticles(): void {
  for (let i = 0; i < pool.length; i++) {
    pool[i].active = false;
    pool[i].sprite.visible = false;
    pool[i].sprite.removeFromParent();
  }
}

export function destroyParticles(): void {
  for (let i = 0; i < pool.length; i++) {
    pool[i].sprite.destroy();
  }
  pool.length = 0;
  poolIndex = 0;
}

/** Get active particle count (for debug/perf monitoring) */
export function getActiveCount(): number {
  let count = 0;
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].active) count++;
  }
  return count;
}
