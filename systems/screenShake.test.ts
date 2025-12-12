/**
 * Property-Based Tests for Screen Shake System
 * Uses fast-check for property-based testing
 * 
 * Tests Property 10: Screen Shake Offset Bounds
 * Validates: Requirements 10.3
 */

import { describe, test, beforeEach, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  trigger,
  update,
  getOffset,
  reset,
  getState,
  type ShakeConfig,
} from './screenShake';

// Reset screen shake system before each test
beforeEach(() => {
  reset();
});

// Arbitrary for valid shake configurations
const shakeConfigArb = fc.record({
  intensity: fc.float({ min: Math.fround(1), max: Math.fround(50), noNaN: true }),
  duration: fc.integer({ min: 100, max: 1000 }),
  frequency: fc.float({ min: Math.fround(10), max: Math.fround(60), noNaN: true }),
  decay: fc.boolean(),
});

// Arbitrary for elapsed time within shake duration
const elapsedTimeArb = (duration: number) => 
  fc.integer({ min: 1, max: duration - 1 });

describe('Screen Shake Offset Bounds Properties', () => {
  /**
   * **Feature: echo-shift-professionalization, Property 10: Screen Shake Offset Bounds**
   * **Validates: Requirements 10.3**
   *
   * For any active screen shake with intensity I, the offset values SHALL remain
   * within the range [-I, I].
   */
  test('Screen shake offsets remain within intensity bounds', () => {
    fc.assert(
      fc.property(
        shakeConfigArb,
        fc.integer({ min: 1, max: 50 }), // Number of update calls
        (config, updateCount) => {
          reset();
          
          const startTime = Date.now();
          trigger(config);
          
          // Perform multiple updates at different times within the duration
          for (let i = 0; i < updateCount; i++) {
            // Calculate a time within the shake duration
            const elapsed = Math.floor((config.duration * (i + 1)) / (updateCount + 1));
            const currentTime = startTime + elapsed;
            
            update(currentTime);
            
            const state = getState();
            
            // Only check bounds while shake is active
            if (state.active) {
              const offset = getOffset();
              const intensity = config.intensity;
              
              // Offsets must be within [-intensity, intensity]
              if (offset.x < -intensity || offset.x > intensity) {
                return false;
              }
              if (offset.y < -intensity || offset.y > intensity) {
                return false;
              }
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Screen shake offsets are zero when inactive', () => {
    fc.assert(
      fc.property(
        shakeConfigArb,
        (config) => {
          reset();
          
          // Before triggering, offsets should be zero
          const offsetBefore = getOffset();
          if (offsetBefore.x !== 0 || offsetBefore.y !== 0) {
            return false;
          }
          
          const startTime = Date.now();
          trigger(config);
          
          // After duration expires, offsets should return to zero
          update(startTime + config.duration + 100);
          
          const state = getState();
          const offsetAfter = getOffset();
          
          // Shake should be inactive and offsets should be zero
          return !state.active && offsetAfter.x === 0 && offsetAfter.y === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Screen shake becomes inactive after duration expires', () => {
    fc.assert(
      fc.property(
        shakeConfigArb,
        (config) => {
          reset();
          
          const startTime = Date.now();
          trigger(config);
          
          // Update past the duration
          update(startTime + config.duration + 1);
          
          const state = getState();
          
          // Shake should be inactive
          return !state.active;
        }
      ),
      { numRuns: 100 }
    );
  });
});
