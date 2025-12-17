/**
 * Property-Based Tests for Holographic Gate System
 * Campaign Update v2.5 - Requirements: 12.1, 12.2, 12.3, 12.4
 * Uses fast-check for property-based testing
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    calculatePulsePhase,
    calculateWarpJumpSpeed,
    createHolographicGateState,
    createShatterParticles,
    DEFAULT_HOLOGRAPHIC_GATE_CONFIG,
    getGateScreenPosition,
    getPulseGlowIntensity,
    getPulseScale,
    hasPassedThroughGate,
    shouldGateBeVisible,
    triggerGateShatter,
    updateHolographicGate,
    updateShatterParticles,
} from './holographicGate';

describe('Holographic Gate Visibility Properties', () => {
  /**
   * **Feature: campaign-chapter-system, Property 6: Finish Line Visibility Threshold**
   * **Validates: Requirements 3.1**
   *
   * For any currentDistance within visibility threshold (50m) of targetDistance, the holographic gate SHALL be visible.
   */
  test('Property 6: Gate is visible when within 50 meters of target', () => {
    // Generator for remaining distance within visibility threshold (50m)
    const remainingDistanceArb = fc.double({ 
      min: 0.01, // Just above 0 (not yet passed)
      max: DEFAULT_HOLOGRAPHIC_GATE_CONFIG.visibilityThreshold,  // Visibility threshold (50m)
      noNaN: true 
    });

    fc.assert(
      fc.property(
        remainingDistanceArb,
        (remainingDistance) => {
          const isVisible = shouldGateBeVisible(remainingDistance, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          
          // Gate must be visible when within threshold and distance > 0
          return isVisible === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 6: Gate not visible when far from target**
   * **Validates: Requirements 3.1**
   *
   * Gate SHALL NOT be visible when more than visibility threshold (50m) from target.
   */
  test('Property 6: Gate is not visible when more than 50 meters from target', () => {
    // Generator for remaining distance beyond visibility threshold
    const remainingDistanceArb = fc.double({ 
      min: DEFAULT_HOLOGRAPHIC_GATE_CONFIG.visibilityThreshold + 0.01, // Just beyond threshold
      max: 10000,  // Far from target
      noNaN: true 
    });

    fc.assert(
      fc.property(
        remainingDistanceArb,
        (remainingDistance) => {
          const isVisible = shouldGateBeVisible(remainingDistance, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          
          // Gate must NOT be visible when beyond threshold
          return isVisible === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-chapter-system, Property 6: Gate visible when passed (at target)**
   * **Validates: Requirements 3.1**
   *
   * Gate SHALL be visible when player is at or past target (distance <= 0) since they're within threshold.
   */
  test('Property 6: Gate is visible when player has reached or passed target', () => {
    // Generator for zero or negative remaining distance (at or past target)
    const remainingDistanceArb = fc.double({ 
      min: -100,
      max: 0,
      noNaN: true 
    });

    fc.assert(
      fc.property(
        remainingDistanceArb,
        (remainingDistance) => {
          const isVisible = shouldGateBeVisible(remainingDistance, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          
          // Gate is visible when at or past target (within threshold of 0)
          return isVisible === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Gate Pulse Animation Properties', () => {
  /**
   * **Feature: campaign-update-v25, Gate pulse animation**
   * **Validates: Requirements 12.2**
   *
   * Pulse phase SHALL be within bounds (0 - 1).
   */
  test('Pulse phase stays within bounds (0 - 1)', () => {
    const timeArb = fc.integer({ min: 0, max: 1000000 });
    const bpmArb = fc.integer({ min: 60, max: 200 });

    fc.assert(
      fc.property(
        timeArb,
        bpmArb,
        (currentTime, bpm) => {
          const phase = calculatePulsePhase(currentTime, bpm);
          
          return phase >= 0 && phase < 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Pulse scale stays within expected range
   */
  test('Pulse scale stays within bounds (0.95 - 1.05)', () => {
    const phaseArb = fc.double({ min: 0, max: 1, noNaN: true });

    fc.assert(
      fc.property(
        phaseArb,
        (phase) => {
          const scale = getPulseScale(phase);
          
          return scale >= 0.95 && scale <= 1.05;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Pulse glow intensity stays within expected range
   */
  test('Pulse glow intensity stays within bounds (0.5 - 1.0)', () => {
    const phaseArb = fc.double({ min: 0, max: 1, noNaN: true });

    fc.assert(
      fc.property(
        phaseArb,
        (phase) => {
          const intensity = getPulseGlowIntensity(phase);
          
          return intensity >= 0.5 && intensity <= 1.0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Gate Shatter Animation Properties', () => {
  /**
   * **Feature: campaign-update-v25, Gate shatter animation**
   * **Validates: Requirements 12.3**
   *
   * Shatter particles SHALL be created with valid properties.
   */
  test('Shatter particles have valid properties', () => {
    const positionArb = fc.record({
      x: fc.double({ min: 0, max: 1000, noNaN: true }),
      y: fc.double({ min: 0, max: 1000, noNaN: true }),
    });

    fc.assert(
      fc.property(
        positionArb,
        ({ x, y }) => {
          const particles = createShatterParticles(x, y, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          
          // Should create 20 particles
          if (particles.length !== 20) return false;
          
          // All particles should have valid properties
          return particles.every(p => 
            typeof p.x === 'number' && !isNaN(p.x) &&
            typeof p.y === 'number' && !isNaN(p.y) &&
            typeof p.vx === 'number' && !isNaN(p.vx) &&
            typeof p.vy === 'number' && !isNaN(p.vy) &&
            p.size >= 5 && p.size <= 20 &&
            p.alpha === 1 &&
            p.color === DEFAULT_HOLOGRAPHIC_GATE_CONFIG.gateColor
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Shatter particles alpha decreases with progress
   */
  test('Shatter particles alpha decreases with progress', () => {
    const progressArb = fc.double({ min: 0, max: 1, noNaN: true });

    fc.assert(
      fc.property(
        progressArb,
        (progress) => {
          const particles = createShatterParticles(500, 500, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          const updatedParticles = updateShatterParticles(particles, 0.016, progress);
          
          // All particles should have alpha = 1 - progress
          const expectedAlpha = Math.max(0, 1 - progress);
          return updatedParticles.every(p => Math.abs(p.alpha - expectedAlpha) < 0.001);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Warp Jump Properties', () => {
  /**
   * **Feature: campaign-update-v25, Warp jump acceleration**
   * **Validates: Requirements 12.4**
   *
   * Warp jump speed multiplier SHALL increase with progress.
   */
  test('Warp jump speed increases with progress', () => {
    const progressPairArb = fc.tuple(
      fc.double({ min: 0, max: 0.5, noNaN: true }),
      fc.double({ min: 0.5, max: 1.0, noNaN: true })
    );

    fc.assert(
      fc.property(
        progressPairArb,
        ([lowerProgress, higherProgress]) => {
          const lowerSpeed = calculateWarpJumpSpeed(lowerProgress, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          const higherSpeed = calculateWarpJumpSpeed(higherProgress, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          
          return higherSpeed >= lowerSpeed;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Warp jump speed is 1.0 when progress is 0
   */
  test('Warp jump speed is 1.0 when progress is 0', () => {
    const speed = calculateWarpJumpSpeed(0, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
    expect(speed).toBe(1);
  });

  /**
   * Warp jump speed reaches max multiplier at progress 1.0
   */
  test('Warp jump speed reaches max at progress 1.0', () => {
    const speed = calculateWarpJumpSpeed(1, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
    expect(speed).toBe(DEFAULT_HOLOGRAPHIC_GATE_CONFIG.warpJumpMultiplier);
  });
});

describe('Gate State Update Properties', () => {
  /**
   * Gate state updates visibility correctly
   */
  test('Gate state visibility matches shouldGateBeVisible', () => {
    const remainingDistanceArb = fc.double({ min: -50, max: 200, noNaN: true });
    const currentTimeArb = fc.integer({ min: 1000, max: 100000 });

    fc.assert(
      fc.property(
        remainingDistanceArb,
        currentTimeArb,
        (remainingDistance, currentTime) => {
          const state = createHolographicGateState();
          const updatedState = updateHolographicGate(
            state,
            currentTime,
            remainingDistance,
            DEFAULT_HOLOGRAPHIC_GATE_CONFIG
          );
          
          const expectedVisibility = shouldGateBeVisible(remainingDistance, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          return updatedState.visible === expectedVisibility;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Gate shatter triggers correctly
   */
  test('Gate shatter creates particles and activates warp jump', () => {
    const positionArb = fc.record({
      x: fc.double({ min: 0, max: 1000, noNaN: true }),
      y: fc.double({ min: 0, max: 1000, noNaN: true }),
    });
    const currentTimeArb = fc.integer({ min: 1000, max: 100000 });

    fc.assert(
      fc.property(
        positionArb,
        currentTimeArb,
        ({ x, y }, currentTime) => {
          const state = createHolographicGateState();
          const shatteredState = triggerGateShatter(
            state,
            currentTime,
            x,
            y,
            DEFAULT_HOLOGRAPHIC_GATE_CONFIG
          );
          
          return shatteredState.isShattered === true &&
                 shatteredState.shatterParticles.length === 20 &&
                 shatteredState.warpJumpActive === true &&
                 shatteredState.shatterStartTime === currentTime;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Gate Pass-Through Detection', () => {
  /**
   * Detects when player passes through gate
   */
  test('Detects pass-through when crossing from positive to zero/negative', () => {
    const previousDistanceArb = fc.double({ min: 0.01, max: 100, noNaN: true });
    const currentDistanceArb = fc.double({ min: -50, max: 0, noNaN: true });

    fc.assert(
      fc.property(
        previousDistanceArb,
        currentDistanceArb,
        (previousDistance, currentDistance) => {
          const passed = hasPassedThroughGate(previousDistance, currentDistance);
          return passed === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Does not detect pass-through when still approaching
   */
  test('Does not detect pass-through when still approaching', () => {
    const previousDistanceArb = fc.double({ min: 50, max: 200, noNaN: true });
    const currentDistanceArb = fc.double({ min: 0.01, max: 50, noNaN: true });

    fc.assert(
      fc.property(
        previousDistanceArb,
        currentDistanceArb,
        (previousDistance, currentDistance) => {
          // Ensure current is less than previous but still positive
          if (currentDistance >= previousDistance) return true; // Skip invalid case
          
          const passed = hasPassedThroughGate(previousDistance, currentDistance);
          return passed === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Gate Screen Position Properties', () => {
  /**
   * Gate position moves left as player approaches
   */
  test('Gate position X decreases as remaining distance decreases', () => {
    const canvasSizeArb = fc.record({
      width: fc.integer({ min: 800, max: 1920 }),
      height: fc.integer({ min: 600, max: 1080 }),
    });
    const distancePairArb = fc.tuple(
      fc.double({ min: 50, max: 100, noNaN: true }),
      fc.double({ min: 1, max: 50, noNaN: true })
    );

    fc.assert(
      fc.property(
        canvasSizeArb,
        distancePairArb,
        ({ width, height }, [farDistance, nearDistance]) => {
          const farPos = getGateScreenPosition(farDistance, width, height, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          const nearPos = getGateScreenPosition(nearDistance, width, height, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          
          // Gate should be more to the left (smaller X) when closer
          return nearPos.x <= farPos.x;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Gate Y position is always at canvas center
   */
  test('Gate Y position is at canvas center', () => {
    const canvasSizeArb = fc.record({
      width: fc.integer({ min: 800, max: 1920 }),
      height: fc.integer({ min: 600, max: 1080 }),
    });
    const remainingDistanceArb = fc.double({ min: 1, max: 100, noNaN: true });

    fc.assert(
      fc.property(
        canvasSizeArb,
        remainingDistanceArb,
        ({ width, height }, remainingDistance) => {
          const pos = getGateScreenPosition(remainingDistance, width, height, DEFAULT_HOLOGRAPHIC_GATE_CONFIG);
          
          return pos.y === height / 2;
        }
      ),
      { numRuns: 100 }
    );
  });
});
