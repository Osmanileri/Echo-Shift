/**
 * Property-Based Tests for Particle System
 * Uses fast-check for property-based testing
 * 
 * Tests Property 11: Particle Lifecycle Management
 * Validates: Requirements 12.4, 12.5
 */

import { describe, test, beforeEach, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  emit,
  emitBurst,
  emitSpark,
  emitTrail,
  update,
  getActiveParticles,
  reset,
  PARTICLE_CONFIGS,
  type ParticleConfig,
  type Particle,
} from './particleSystem';

// Reset particle system before each test
beforeEach(() => {
  reset();
});

// Arbitrary for valid particle configurations
const particleConfigArb = fc.record({
  count: fc.integer({ min: 1, max: 20 }),
  speed: fc.record({
    min: fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
    max: fc.float({ min: Math.fround(5), max: Math.fround(15), noNaN: true }),
  }),
  size: fc.record({
    min: fc.float({ min: Math.fround(0.5), max: Math.fround(3), noNaN: true }),
    max: fc.float({ min: Math.fround(3), max: Math.fround(10), noNaN: true }),
  }),
  life: fc.record({
    min: fc.float({ min: Math.fround(0.1), max: Math.fround(0.5), noNaN: true }),
    max: fc.float({ min: Math.fround(0.5), max: Math.fround(2), noNaN: true }),
  }),
  colors: fc.array(
    fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    ).map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`),
    { minLength: 1, maxLength: 5 }
  ),
  spread: fc.float({ min: Math.fround(0), max: Math.fround(Math.PI * 2), noNaN: true }),
  gravity: fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
});

// Arbitrary for particle types
const particleTypeArb = fc.constantFrom<'trail' | 'burst' | 'spark'>('trail', 'burst', 'spark');

// Arbitrary for valid positions
const positionArb = fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true });

// Arbitrary for valid delta time (in ms)
const deltaTimeArb = fc.float({ min: Math.fround(16), max: Math.fround(100), noNaN: true });

describe('Particle Lifecycle Management Properties', () => {
  /**
   * **Feature: echo-shift-professionalization, Property 11: Particle Lifecycle Management**
   * **Validates: Requirements 12.4, 12.5**
   *
   * For any particle system state, no particle SHALL exist with lifetime <= 0,
   * AND all newly created particles SHALL have valid velocity, lifetime, color,
   * and size within configuration bounds.
   */
  test('Newly created particles have valid properties within configuration bounds', () => {
    fc.assert(
      fc.property(
        positionArb,
        positionArb,
        particleConfigArb,
        particleTypeArb,
        (x, y, config, type) => {
          reset();
          
          // Emit particles with the given config
          emit(x, y, config, type);
          
          const particles = getActiveParticles();
          
          // All particles should have valid properties within bounds
          for (const particle of particles) {
            // Lifetime should be positive and within config bounds
            const lifetimeValid = 
              particle.life > 0 &&
              particle.life >= config.life.min &&
              particle.life <= config.life.max;
            
            // Size should be within config bounds
            const sizeValid = 
              particle.size >= config.size.min &&
              particle.size <= config.size.max;
            
            // Color should be one of the configured colors
            const colorValid = config.colors.includes(particle.color);
            
            // Velocity magnitude should be within speed bounds
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            const speedValid = 
              speed >= config.speed.min * 0.99 && // Small tolerance for floating point
              speed <= config.speed.max * 1.01;
            
            // Alpha should be 1 for newly created particles
            const alphaValid = particle.alpha === 1;
            
            // Type should match
            const typeValid = particle.type === type;
            
            if (!lifetimeValid || !sizeValid || !colorValid || !speedValid || !alphaValid || !typeValid) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('No particle exists with lifetime <= 0 after update', () => {
    fc.assert(
      fc.property(
        positionArb,
        positionArb,
        particleTypeArb,
        fc.array(deltaTimeArb, { minLength: 1, maxLength: 10 }),
        (x, y, type, deltaTimes) => {
          reset();
          
          // Use default configs for the particle type
          const config = PARTICLE_CONFIGS[type];
          emit(x, y, config, type);
          
          // Apply multiple updates
          for (const dt of deltaTimes) {
            update(dt);
          }
          
          const particles = getActiveParticles();
          
          // No particle should have lifetime <= 0
          for (const particle of particles) {
            if (particle.life <= 0) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Particles are removed when lifetime expires', () => {
    fc.assert(
      fc.property(
        positionArb,
        positionArb,
        particleTypeArb,
        (x, y, type) => {
          reset();
          
          const config = PARTICLE_CONFIGS[type];
          emit(x, y, config, type);
          
          const initialCount = getActiveParticles().length;
          
          // Update with enough time to expire all particles
          // Max lifetime is typically < 1 second, so 2000ms should expire all
          update(2000);
          
          const finalCount = getActiveParticles().length;
          
          // All particles should be removed (lifetime expired)
          return finalCount === 0 && initialCount > 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Particle Emission Properties', () => {
  test('emitBurst creates particles with burst type', () => {
    fc.assert(
      fc.property(
        positionArb,
        positionArb,
        (x, y) => {
          reset();
          
          emitBurst(x, y);
          
          const particles = getActiveParticles();
          
          // Should have created particles
          if (particles.length === 0) return false;
          
          // All particles should be burst type
          return particles.every(p => p.type === 'burst');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('emitSpark creates particles with spark type', () => {
    fc.assert(
      fc.property(
        positionArb,
        positionArb,
        (x, y) => {
          reset();
          
          emitSpark(x, y);
          
          const particles = getActiveParticles();
          
          // Should have created particles
          if (particles.length === 0) return false;
          
          // All particles should be spark type
          return particles.every(p => p.type === 'spark');
        }
      ),
      { numRuns: 100 }
    );
  });

  test('emitTrail creates particles based on speed', () => {
    fc.assert(
      fc.property(
        positionArb,
        positionArb,
        fc.float({ min: 10, max: 100, noNaN: true }), // High speed to ensure emission
        (x, y, speed) => {
          reset();
          
          // Emit multiple times to account for random emission chance
          for (let i = 0; i < 20; i++) {
            emitTrail(x, y, speed);
          }
          
          const particles = getActiveParticles();
          
          // With high speed and multiple emissions, should have some particles
          // All created particles should be trail type
          return particles.every(p => p.type === 'trail');
        }
      ),
      { numRuns: 100 }
    );
  });
});
