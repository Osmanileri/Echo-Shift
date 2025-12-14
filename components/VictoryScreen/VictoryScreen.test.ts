/**
 * Property-Based Tests for Victory Screen System
 * Campaign Update v2.5 - Requirements: 8.4
 * Uses fast-check for property-based testing
 */

import * as fc from 'fast-check';
import { describe, test } from 'vitest';
import { generateFlyingCurrencyParticles } from './VictoryScreen';

describe('Flying Currency Particle Properties', () => {
  /**
   * **Feature: campaign-update-v25, Property 27: Flying currency particle count**
   * **Validates: Requirements 8.4**
   *
   * For any flying currency animation, the particle count SHALL be between 10 and 20 inclusive.
   */
  test('Property 27: Particle count is always between 10 and 20 inclusive', () => {
    // Generator for any requested particle count (including edge cases)
    const countArb = fc.integer({ min: 0, max: 100 });
    const positionArb = fc.double({ min: 0, max: 1000, noNaN: true });

    fc.assert(
      fc.property(
        countArb,
        positionArb,
        positionArb,
        positionArb,
        positionArb,
        (requestedCount, startX, startY, endX, endY) => {
          const particles = generateFlyingCurrencyParticles(
            requestedCount,
            startX,
            startY,
            endX,
            endY
          );
          
          // Particle count must be between 10 and 20 inclusive
          return particles.length >= 10 && particles.length <= 20;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 27: Particle count clamping**
   * **Validates: Requirements 8.4**
   *
   * When requesting fewer than 10 particles, exactly 10 SHALL be generated.
   */
  test('Property 27: Requesting fewer than 10 particles returns exactly 10', () => {
    const lowCountArb = fc.integer({ min: 0, max: 9 });
    const positionArb = fc.double({ min: 0, max: 1000, noNaN: true });

    fc.assert(
      fc.property(
        lowCountArb,
        positionArb,
        positionArb,
        positionArb,
        positionArb,
        (requestedCount, startX, startY, endX, endY) => {
          const particles = generateFlyingCurrencyParticles(
            requestedCount,
            startX,
            startY,
            endX,
            endY
          );
          
          // Should clamp to minimum of 10
          return particles.length === 10;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 27: Particle count clamping (upper bound)**
   * **Validates: Requirements 8.4**
   *
   * When requesting more than 20 particles, exactly 20 SHALL be generated.
   */
  test('Property 27: Requesting more than 20 particles returns exactly 20', () => {
    const highCountArb = fc.integer({ min: 21, max: 1000 });
    const positionArb = fc.double({ min: 0, max: 1000, noNaN: true });

    fc.assert(
      fc.property(
        highCountArb,
        positionArb,
        positionArb,
        positionArb,
        positionArb,
        (requestedCount, startX, startY, endX, endY) => {
          const particles = generateFlyingCurrencyParticles(
            requestedCount,
            startX,
            startY,
            endX,
            endY
          );
          
          // Should clamp to maximum of 20
          return particles.length === 20;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 27: Valid particle count passes through**
   * **Validates: Requirements 8.4**
   *
   * When requesting 10-20 particles, the exact count SHALL be generated.
   */
  test('Property 27: Requesting 10-20 particles returns exact count', () => {
    const validCountArb = fc.integer({ min: 10, max: 20 });
    const positionArb = fc.double({ min: 0, max: 1000, noNaN: true });

    fc.assert(
      fc.property(
        validCountArb,
        positionArb,
        positionArb,
        positionArb,
        positionArb,
        (requestedCount, startX, startY, endX, endY) => {
          const particles = generateFlyingCurrencyParticles(
            requestedCount,
            startX,
            startY,
            endX,
            endY
          );
          
          // Should return exact requested count
          return particles.length === requestedCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 27: All particles have valid structure**
   * **Validates: Requirements 8.4**
   *
   * All generated particles SHALL have valid Bezier curve control points.
   */
  test('Property 27: All particles have valid Bezier curve structure', () => {
    const countArb = fc.integer({ min: 10, max: 20 });
    const positionArb = fc.double({ min: 0, max: 1000, noNaN: true });

    fc.assert(
      fc.property(
        countArb,
        positionArb,
        positionArb,
        positionArb,
        positionArb,
        (count, startX, startY, endX, endY) => {
          const particles = generateFlyingCurrencyParticles(
            count,
            startX,
            startY,
            endX,
            endY
          );
          
          // All particles must have valid structure
          return particles.every(p => 
            typeof p.id === 'number' &&
            typeof p.startX === 'number' && !isNaN(p.startX) &&
            typeof p.startY === 'number' && !isNaN(p.startY) &&
            typeof p.controlX === 'number' && !isNaN(p.controlX) &&
            typeof p.controlY === 'number' && !isNaN(p.controlY) &&
            typeof p.endX === 'number' && !isNaN(p.endX) &&
            typeof p.endY === 'number' && !isNaN(p.endY) &&
            p.progress === 0 &&
            typeof p.delay === 'number' && p.delay >= 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 27: Unique particle IDs**
   * **Validates: Requirements 8.4**
   *
   * All generated particles SHALL have unique IDs.
   */
  test('Property 27: All particles have unique IDs', () => {
    const countArb = fc.integer({ min: 10, max: 20 });
    const positionArb = fc.double({ min: 0, max: 1000, noNaN: true });

    fc.assert(
      fc.property(
        countArb,
        positionArb,
        positionArb,
        positionArb,
        positionArb,
        (count, startX, startY, endX, endY) => {
          const particles = generateFlyingCurrencyParticles(
            count,
            startX,
            startY,
            endX,
            endY
          );
          
          // All IDs must be unique
          const ids = particles.map(p => p.id);
          const uniqueIds = new Set(ids);
          return uniqueIds.size === particles.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 27: Staggered delays**
   * **Validates: Requirements 8.4**
   *
   * Particles SHALL have staggered delays for sequential animation.
   */
  test('Property 27: Particles have staggered delays', () => {
    const countArb = fc.integer({ min: 10, max: 20 });
    const positionArb = fc.double({ min: 0, max: 1000, noNaN: true });

    fc.assert(
      fc.property(
        countArb,
        positionArb,
        positionArb,
        positionArb,
        positionArb,
        (count, startX, startY, endX, endY) => {
          const particles = generateFlyingCurrencyParticles(
            count,
            startX,
            startY,
            endX,
            endY
          );
          
          // Delays should be non-decreasing (staggered)
          for (let i = 1; i < particles.length; i++) {
            if (particles[i].delay < particles[i - 1].delay) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
