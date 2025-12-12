/**
 * Property-Based Tests for Upgrade System
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { UPGRADES, getUpgradeEffect, getUpgradeById } from '../data/upgrades';
import { getUpgradeEffect as getUpgradeEffectFromSystem } from './upgradeSystem';

describe('Upgrade Effect Calculation Properties', () => {
  /**
   * **Feature: echo-shift-professionalization, Property 6: Upgrade Effect Calculation**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * For any upgrade type and level, the effect value SHALL match
   * the upgrade's effect formula applied to that level.
   */
  test('upgrade effect matches the effect formula for any upgrade and valid level', () => {
    // Generator for valid upgrade IDs
    const upgradeIdArb = fc.constantFrom(...UPGRADES.map(u => u.id));
    
    // Generator for valid levels (0 to maxLevel for each upgrade)
    // We'll generate level relative to the upgrade's maxLevel
    const levelArb = fc.integer({ min: 0, max: 5 }); // Max level across all upgrades is 5

    fc.assert(
      fc.property(
        upgradeIdArb,
        levelArb,
        (upgradeId, level) => {
          const upgrade = getUpgradeById(upgradeId);
          if (!upgrade) return true; // Skip if upgrade not found (shouldn't happen)
          
          // Clamp level to valid range for this upgrade
          const validLevel = Math.min(level, upgrade.maxLevel);
          
          // Get effect via the system function
          const systemEffect = getUpgradeEffectFromSystem(upgradeId, validLevel);
          
          // Get expected effect directly from the upgrade's effect formula
          const expectedEffect = getUpgradeEffect(upgrade, validLevel);
          
          // The system effect must exactly match the formula result
          return systemEffect === expectedEffect;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 6: Upgrade Effect Calculation**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * Specific property for Head Start upgrade (starting-score):
   * Effect should equal level * 100
   */
  test('Head Start upgrade effect equals level * 100', () => {
    const levelArb = fc.integer({ min: 1, max: 5 }); // Valid levels 1-5

    fc.assert(
      fc.property(
        levelArb,
        (level) => {
          const effect = getUpgradeEffectFromSystem('starting-score', level);
          const expected = level * 100;
          return effect === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 6: Upgrade Effect Calculation**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * Specific property for Echo Amplifier upgrade (score-multiplier):
   * Effect should equal 1 + level * 0.1
   */
  test('Echo Amplifier upgrade effect equals 1 + level * 0.1', () => {
    const levelArb = fc.integer({ min: 1, max: 3 }); // Valid levels 1-3

    fc.assert(
      fc.property(
        levelArb,
        (level) => {
          const effect = getUpgradeEffectFromSystem('score-multiplier', level);
          const expected = 1 + level * 0.1;
          return effect === expected;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 6: Upgrade Effect Calculation**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * Specific property for Time Warp upgrade (slow-motion):
   * Effect should equal level (number of uses)
   */
  test('Time Warp upgrade effect equals level', () => {
    const levelArb = fc.integer({ min: 1, max: 3 }); // Valid levels 1-3

    fc.assert(
      fc.property(
        levelArb,
        (level) => {
          const effect = getUpgradeEffectFromSystem('slow-motion', level);
          return effect === level;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 6: Upgrade Effect Calculation**
   * **Validates: Requirements 6.1, 6.2, 6.3**
   *
   * Level 0 should return default values:
   * - score-multiplier: 1 (no multiplier)
   * - other upgrades: 0 (no effect)
   */
  test('level 0 returns appropriate default values', () => {
    const upgradeIdArb = fc.constantFrom(...UPGRADES.map(u => u.id));

    fc.assert(
      fc.property(
        upgradeIdArb,
        (upgradeId) => {
          const effect = getUpgradeEffectFromSystem(upgradeId, 0);
          
          if (upgradeId === 'score-multiplier') {
            // Score multiplier at level 0 should be 1 (no change)
            return effect === 1;
          } else {
            // Other upgrades at level 0 should be 0 (no effect)
            return effect === 0;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
