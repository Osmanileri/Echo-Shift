/**
 * Particle System - Spirit of the Resonance
 * 
 * Professional particle system with:
 * - Object pooling for performance
 * - Elemental-specific motion behaviors
 * - Directional flow (always left/backward)
 * - Convergence: Particles from top orb go down, from bottom orb go up, meeting in middle
 */

import { ElementalConfig, getElementalConfig } from './elementalStyles';

// Particle interface
interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  type: string;
  offsetVal: number;
  isTopOrb: boolean; // Which orb this particle came from
}

/**
 * ParticleSystem class with object pooling
 */
export class ParticleSystem {
  particles: Particle[];
  maxParticles: number;

  constructor(maxParticles = 200) {
    this.maxParticles = maxParticles;
    this.particles = new Array(maxParticles).fill(null).map(() => ({
      active: false,
      x: 0, y: 0,
      vx: 0, vy: 0,
      life: 0, size: 0,
      type: 'normal',
      offsetVal: 0,
      isTopOrb: true
    }));
  }

  /**
   * Emit a particle from an orb
   * @param x - X position of the orb
   * @param y - Y position of the orb 
   * @param type - Elemental type (fire, water, etc.)
   * @param isTopOrb - Whether this is the top orb (for convergence direction)
   */
  emit(x: number, y: number, type: string, isTopOrb: boolean = true) {
    const config = getElementalConfig(type);

    // Find an inactive particle from the pool
    const p = this.particles.find(p => !p.active);
    if (!p) return;

    p.active = true;
    p.type = type;
    p.isTopOrb = isTopOrb;

    // Start slightly behind the orb for visual effect
    p.x = x - 5;
    p.y = y;
    p.life = 1.0;
    p.offsetVal = Math.random() * 100;

    // --- CONVERGENCE MATHEMATICS ---
    // Particles flow backward (negative X) and converge toward the center
    const spreadRandom = (Math.random() - 0.5) * config.physics.spread;

    // Horizontal velocity: always backward (left)
    p.vx = config.physics.speedX + (Math.random() * -1.5);

    // Vertical velocity: based on which orb and convergence force
    // Top orb particles go DOWN (positive vy)
    // Bottom orb particles go UP (negative vy)
    // This creates a V-shape that meets at the connector level
    const convergenceForce = config.physics.convergence || 0.4;
    const verticalDirection = isTopOrb ? 1 : -1;

    p.vy = (verticalDirection * convergenceForce * 2) + spreadRandom;

    // Size from config
    const [minSize, maxSize] = config.physics.sizeRange;
    p.size = Math.random() * (maxSize - minSize) + minSize;
  }

  /**
   * Emit a burst of particles (for explosions, etc.)
   */
  emitBurst(x: number, y: number, type: string, count: number = 8) {
    for (let i = 0; i < count; i++) {
      // Alternate between simulating top and bottom for visual variety
      this.emit(x, y, type, i % 2 === 0);
    }
  }

  /**
   * Update all active particles
   */
  update() {
    this.particles.forEach(p => {
      if (!p.active) return;

      const config = getElementalConfig(p.type);

      // Apply velocity
      p.x += p.vx;
      p.y += p.vy;

      // Apply gravity (affects convergence over time)
      p.vy += config.physics.gravity;

      // Decay life
      p.life -= config.physics.lifeSpan;

      // Elemental-specific motion behaviors
      this.applyElementalMotion(p, config);

      // Deactivate dead particles
      if (p.life <= 0) {
        p.active = false;
      }
    });
  }

  /**
   * Apply elemental-specific motion effects
   */
  private applyElementalMotion(p: Particle, config: ElementalConfig) {
    switch (config.particleType) {
      case 'spark':
        // Electric: Zigzag motion
        p.x += (Math.random() - 0.5) * 8;
        p.y += (Math.random() - 0.5) * 4;
        break;

      case 'bubble':
        // Water: Slow down over time, slight wobble
        p.vx *= 0.98;
        p.x += Math.sin(p.offsetVal + p.life * 10) * 0.5;
        break;

      case 'leaf':
        // Grass: Sinusoidal drift
        p.x += Math.sin(p.offsetVal + p.life * 5) * 0.3;
        p.y += Math.cos(p.offsetVal + p.life * 3) * 0.2;
        break;

      case 'ember':
        // Fire: Slight flicker
        p.x += (Math.random() - 0.5) * 1;
        p.y += (Math.random() - 0.5) * 0.5;
        break;

      case 'void':
        // Ghost: Slow, ethereal drift
        p.vx *= 0.99;
        p.vy *= 0.99;
        break;

      case 'crystal':
        // Ice: Gentle spinning descent
        p.x += Math.sin(p.offsetVal + p.life * 8) * 0.3;
        break;

      case 'psychic':
        // Psychic: Orbital motion
        p.x += Math.sin(p.offsetVal + p.life * 6) * 0.8;
        p.y += Math.cos(p.offsetVal + p.life * 6) * 0.5;
        break;

      case 'fairy':
        // Fairy: Sparkle and float
        p.x += Math.sin(p.offsetVal * 2 + p.life * 8) * 0.6;
        p.y += Math.cos(p.offsetVal * 2 + p.life * 6) * 0.4;
        break;

      case 'wind':
        // Flying: Fast horizontal with vertical waves
        p.y += Math.sin(p.offsetVal + p.life * 10) * 0.8;
        break;

      case 'shadow':
        // Dark: Slow undulating
        p.x += Math.sin(p.offsetVal + p.life * 3) * 0.4;
        p.vx *= 0.98;
        break;

      case 'venom':
        // Poison: Bubbling rise
        p.x += (Math.random() - 0.5) * 0.5;
        break;

      case 'rock':
      case 'steel':
        // Solid types: Slight tumble
        p.x += Math.sin(p.offsetVal + p.life * 4) * 0.2;
        break;

      case 'dust':
      default:
        // Normal: Basic drift
        p.x += Math.sin(p.offsetVal + p.life * 3) * 0.2;
        break;
    }
  }

  /**
   * Draw all active particles with neon glow and contrast outline
   * Identical rendering for both backgrounds - same colors, same glow
   */
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();

    this.particles.forEach(p => {
      if (!p.active) return;

      const config = getElementalConfig(p.type);
      const isOnDarkBg = p.isTopOrb;

      // Identical rendering for both backgrounds
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = config.color;
      ctx.shadowColor = config.color;
      ctx.globalAlpha = p.life;
      ctx.shadowBlur = 10 * p.life; // Same for both

      ctx.beginPath();

      // Different shapes based on particle type
      if (config.particleType === 'spark') {
        ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (config.particleType === 'crystal' || config.particleType === 'steel') {
        // Diamond shape
        ctx.moveTo(p.x, p.y - p.size);
        ctx.lineTo(p.x + p.size, p.y);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.lineTo(p.x - p.size, p.y);
        ctx.closePath();
      } else if (config.particleType === 'bubble') {
        // Professional Water Drop Effect
        const gradient = ctx.createRadialGradient(
          p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.1,
          p.x, p.y, p.size
        );

        const lightColor = config.lightVariant || '#FFFFFF';
        const darkColor = config.darkVariant || config.secondaryColor;
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.4, config.color);
        gradient.addColorStop(1, darkColor);

        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Add dark outline for white background visibility
        if (!isOnDarkBg) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Specular highlight
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.globalAlpha = p.life * 0.8;
        ctx.ellipse(
          p.x - p.size * 0.3,
          p.y - p.size * 0.3,
          p.size * 0.2,
          p.size * 0.1,
          Math.PI / 4,
          0, Math.PI * 2
        );
        ctx.fill();
        return;
      } else {
        // Circle for most particles
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }

      ctx.fill();

      // Add subtle outline for white background visibility only
      if (!isOnDarkBg) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  /**
   * Reset all particles
   */
  reset() {
    this.particles.forEach(p => {
      p.active = false;
    });
  }

  /**
   * Get count of active particles
   */
  getActiveParticles(): Particle[] {
    return this.particles.filter(p => p.active);
  }

  getParticleCount(): number {
    return this.getActiveParticles().length;
  }
}

// ============================================================================
// SINGLETON INSTANCE AND LEGACY COMPATIBILITY EXPORTS
// ============================================================================

// Create a singleton instance for backwards compatibility
const particleSystemInstance = new ParticleSystem(200);

// Legacy module-style exports that delegate to the singleton
export function emit(x: number, y: number, type: string, isTopOrb?: boolean): void {
  particleSystemInstance.emit(x, y, type, isTopOrb ?? true);
}

export function emitBurst(x: number, y: number, type: string, count?: number): void {
  particleSystemInstance.emitBurst(x, y, type, count);
}

export function emitSpark(x: number, y: number, type: string = 'electric'): void {
  particleSystemInstance.emit(x, y, type, true);
}

export function emitTrail(x: number, y: number, type: string = 'normal'): void {
  particleSystemInstance.emit(x, y, type, true);
}

export function update(): void {
  particleSystemInstance.update();
}

export function render(ctx: CanvasRenderingContext2D): void {
  particleSystemInstance.draw(ctx);
}

export function reset(): void {
  particleSystemInstance.reset();
}

export function getParticleCount(): number {
  return particleSystemInstance.getParticleCount();
}

export function getActiveParticles(): Particle[] {
  return particleSystemInstance.getActiveParticles();
}

// Export the instance for direct access
export const particles = particleSystemInstance.particles;
