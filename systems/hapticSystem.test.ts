/**
 * Haptic System Property-Based Tests
 * Requirements: 4.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  HapticType,
  HapticState,
  HapticConfig,
  HAPTIC_CONFIG,
  createInitialHapticState,
  triggerHaptic,
  setEnabled,
  getVibrationPattern,
  checkVibrationSupport,
  createHapticSystem,
  resetHapticSystem,
} from './hapticSystem';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generator for haptic types
 */
const hapticTypeArb = fc.constantFrom<HapticType>(
  'light',
  'medium',
  'heavy',
  'selection',
  'success'
);

/**
 * Generator for haptic state
 */
const hapticStateArb = fc.record({
  isEnabled: fc.boolean(),
  isSupported: fc.boolean(),
});

/**
 * Generator for haptic config
 */
const hapticConfigArb = fc.record({
  light: fc.integer({ min: 1, max: 100 }),
  medium: fc.integer({ min: 1, max: 100 }),
  heavy: fc.integer({ min: 1, max: 100 }),
  selection: fc.integer({ min: 1, max: 100 }),
  success: fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
});

// ============================================================================
// Mock navigator.vibrate
// ============================================================================

let vibrateCalled = false;
let vibratePattern: number | number[] | null = null;

const mockNavigator = {
  vibrate: (pattern: number | number[]) => {
    vibrateCalled = true;
    vibratePattern = pattern;
    return true;
  },
};

// ============================================================================
// Property Tests
// ============================================================================

describe('Haptic System', () => {
  beforeEach(() => {
    vibrateCalled = false;
    vibratePattern = null;
    resetHapticSystem();
    
    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true,
      configurable: true,
    });
  });

  /**
   * **Feature: echo-shift-engagement, Property 13: Haptic Settings Respect**
   * **Validates: Requirements 4.6**
   * 
   * *For any* haptic trigger call, when isEnabled is false, no vibration SHALL occur.
   */
  it('should not trigger vibration when haptics are disabled', () => {
    fc.assert(
      fc.property(
        hapticTypeArb,
        hapticConfigArb,
        (hapticType, config) => {
          // Reset mock state
          vibrateCalled = false;
          vibratePattern = null;
          
          // Create state with haptics disabled but supported
          const disabledState: HapticState = {
            isEnabled: false,
            isSupported: true,
          };
          
          // Trigger haptic
          const result = triggerHaptic(hapticType, disabledState, config);
          
          // Should return false and not call vibrate
          expect(result).toBe(false);
          expect(vibrateCalled).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should trigger vibration when haptics are enabled and supported', () => {
    fc.assert(
      fc.property(
        hapticTypeArb,
        hapticConfigArb,
        (hapticType, config) => {
          // Reset mock state
          vibrateCalled = false;
          vibratePattern = null;
          
          // Create state with haptics enabled and supported
          const enabledState: HapticState = {
            isEnabled: true,
            isSupported: true,
          };
          
          // Trigger haptic
          const result = triggerHaptic(hapticType, enabledState, config);
          
          // Should return true and call vibrate with correct pattern
          expect(result).toBe(true);
          expect(vibrateCalled).toBe(true);
          
          const expectedPattern = getVibrationPattern(hapticType, config);
          expect(vibratePattern).toEqual(expectedPattern);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not trigger vibration when device does not support haptics', () => {
    fc.assert(
      fc.property(
        hapticTypeArb,
        hapticConfigArb,
        (hapticType, config) => {
          // Reset mock state
          vibrateCalled = false;
          vibratePattern = null;
          
          // Create state with haptics enabled but not supported
          const unsupportedState: HapticState = {
            isEnabled: true,
            isSupported: false,
          };
          
          // Trigger haptic
          const result = triggerHaptic(hapticType, unsupportedState, config);
          
          // Should return false and not call vibrate
          expect(result).toBe(false);
          expect(vibrateCalled).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly toggle enabled state', () => {
    fc.assert(
      fc.property(
        hapticStateArb,
        fc.boolean(),
        (initialState, newEnabled) => {
          const updatedState = setEnabled(initialState, newEnabled);
          
          // isEnabled should be updated
          expect(updatedState.isEnabled).toBe(newEnabled);
          
          // isSupported should remain unchanged
          expect(updatedState.isSupported).toBe(initialState.isSupported);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // ============================================================================
  // Additional Unit Tests for Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should return correct patterns for each haptic type', () => {
      expect(getVibrationPattern('light', HAPTIC_CONFIG)).toBe(10);
      expect(getVibrationPattern('medium', HAPTIC_CONFIG)).toBe(25);
      expect(getVibrationPattern('heavy', HAPTIC_CONFIG)).toBe(50);
      expect(getVibrationPattern('selection', HAPTIC_CONFIG)).toBe(5);
      expect(getVibrationPattern('success', HAPTIC_CONFIG)).toEqual([10, 50, 10]);
    });

    it('should create system with correct initial state', () => {
      const system = createHapticSystem();
      
      expect(system.state.isEnabled).toBe(true);
      expect(system.config).toEqual(HAPTIC_CONFIG);
    });

    it('should allow enabling and disabling via system interface', () => {
      const system = createHapticSystem();
      
      expect(system.state.isEnabled).toBe(true);
      
      system.setEnabled(false);
      expect(system.state.isEnabled).toBe(false);
      
      system.setEnabled(true);
      expect(system.state.isEnabled).toBe(true);
    });

    it('should handle unknown haptic type gracefully', () => {
      // Default to light pattern for unknown types
      const pattern = getVibrationPattern('unknown' as HapticType, HAPTIC_CONFIG);
      expect(pattern).toBe(HAPTIC_CONFIG.light);
    });
  });
});
