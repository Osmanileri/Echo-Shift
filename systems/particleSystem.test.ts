/**
 * Property-Based & Unit Tests for Particle System
 * Validates particle emission, lifecycle management, and object pooling.
 */

import { describe, test, beforeEach, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ParticleSystem,
  emit,
  emitBurst,
  emitSpark,
  emitTrail,
  update,
  getActiveParticles,
  getParticleCount,
  reset,
} from './particleSystem';

beforeEach(() => {
  reset();
});

// Arbitraries
const positionArb = fc.float({ min: Math.fround(0), max: Math.fround(1000), noNaN: true });
const elementTypeArb = fc.constantFrom('fire', 'water', 'electric', 'void', 'normal');

describe('Particle System Properties & Lifecycle', () => {
  test('emit creates an active particle with valid properties', () => {
    fc.assert(
      fc.property(positionArb, positionArb, elementTypeArb, (x, y, type) => {
        reset();
        emit(x, y, type, true);

        const particles = getActiveParticles();
        expect(particles.length).toBeGreaterThan(0);
        
        for (const p of particles) {
          expect(p.active).toBe(true);
          expect(p.life).toBeGreaterThan(0);
          expect(p.size).toBeGreaterThan(0);
          expect(p.type).toBe(type);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('update reduces particle life and deactivates expired particles', () => {
    reset();
    emit(100, 100, 'fire', true);

    const initialCount = getParticleCount();
    expect(initialCount).toBeGreaterThan(0);

    // Run multiple update steps until life expires
    for (let i = 0; i < 150; i++) {
      update();
    }

    // Expired particles should be inactive
    const activeParticles = getActiveParticles();
    expect(activeParticles.length).toBe(0);
  });

  test('No particle exists with lifetime <= 0 among active particles after update', () => {
    fc.assert(
      fc.property(positionArb, positionArb, elementTypeArb, (x, y, type) => {
        reset();
        emit(x, y, type, true);
        update();

        const particles = getActiveParticles();
        for (const p of particles) {
          expect(p.life).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('Particle Emission Methods', () => {
  test('emitBurst creates requested particle count up to max pool capacity', () => {
    reset();
    emitBurst(200, 200, 'electric', 15);
    expect(getParticleCount()).toBeLessThanOrEqual(15);
    expect(getParticleCount()).toBeGreaterThan(0);
  });

  test('emitSpark creates active spark particles', () => {
    reset();
    emitSpark(150, 150, 'electric');
    expect(getParticleCount()).toBeGreaterThan(0);
  });

  test('emitTrail creates active trail particles', () => {
    reset();
    emitTrail(150, 150, 'normal');
    expect(getParticleCount()).toBeGreaterThan(0);
  });

  test('reset deactivates all particles in the pool', () => {
    emitBurst(100, 100, 'fire', 20);
    expect(getParticleCount()).toBeGreaterThan(0);

    reset();
    expect(getParticleCount()).toBe(0);
  });

  test('ParticleSystem object pool respects maxParticles limit', () => {
    const ps = new ParticleSystem(50);
    for (let i = 0; i < 100; i++) {
      ps.emit(100, 100, 'fire', true);
    }
    expect(ps.getParticleCount()).toBeLessThanOrEqual(50);
  });
});
