/**
 * Property-Based Tests for GlitchTokenSpawner
 * Uses fast-check for property-based testing
 * 
 * Tests Properties 1-4 from the design document:
 * - Property 1: Token Spawn Score Threshold
 * - Property 2: Token Safe Position
 * - Property 3: Construct Selection from Unlocked Pool
 * - Property 4: No Token Spawn During Active Construct
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import type { ConstructType, Obstacle } from '../types';
import {
    calculateSafeTokenPosition,
    DEFAULT_GLITCH_TOKEN_CONFIG,
    isPositionOverlappingObstacle,
    selectRandomConstruct,
    shouldSpawnToken,
    type GlitchTokenSpawnerConfig,
} from './GlitchTokenSpawner';

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate a valid ConstructType (including NONE)
 */
const constructTypeArb = fc.constantFrom<ConstructType>('NONE', 'TITAN', 'PHASE', 'BLINK');

/**
 * Generate a valid active ConstructType (not NONE)
 */
const activeConstructTypeArb = fc.constantFrom<ConstructType>('TITAN', 'PHASE', 'BLINK');

/**
 * Generate a score below the minimum threshold (500)
 */
const belowThresholdScoreArb = fc.integer({ min: 0, max: 499 });

/**
 * Generate a score at or above the minimum threshold (500)
 */
const aboveThresholdScoreArb = fc.integer({ min: 500, max: 100000 });

/**
 * Generate a valid game score
 */
const scoreArb = fc.integer({ min: 0, max: 100000 });

/**
 * Generate an array of unlocked constructs (may include NONE)
 */
const unlockedConstructsArb = fc.array(constructTypeArb, { minLength: 0, maxLength: 4 });

/**
 * Generate an array of valid unlocked constructs (at least one non-NONE)
 */
const validUnlockedConstructsArb = fc.array(activeConstructTypeArb, { minLength: 1, maxLength: 3 });

/**
 * Generate a valid obstacle for testing
 */
const obstacleArb: fc.Arbitrary<Obstacle> = fc.record({
  id: fc.uuid(),
  x: fc.integer({ min: 0, max: 2000 }),
  y: fc.integer({ min: 0, max: 600 }),
  targetY: fc.integer({ min: 0, max: 600 }),
  width: fc.integer({ min: 20, max: 100 }),
  height: fc.integer({ min: 20, max: 200 }),
  lane: fc.constantFrom<'top' | 'bottom'>('top', 'bottom'),
  polarity: fc.constantFrom<'white' | 'black'>('white', 'black'),
  passed: fc.boolean(),
});

/**
 * Generate an array of obstacles
 */
const obstaclesArb = fc.array(obstacleArb, { minLength: 0, maxLength: 20 });

/**
 * Generate canvas dimensions
 */
const canvasDimensionsArb = fc.record({
  width: fc.integer({ min: 400, max: 1920 }),
  height: fc.integer({ min: 300, max: 1080 }),
});

/**
 * Generate a valid spawner config
 */
const configArb: fc.Arbitrary<GlitchTokenSpawnerConfig> = fc.record({
  minScore: fc.integer({ min: 100, max: 1000 }),
  probability: fc.double({ min: 0.01, max: 0.5, noNaN: true }),
  collectionRadius: fc.integer({ min: 20, max: 60 }),
  tokenSize: fc.integer({ min: 20, max: 50 }),
  safeDistance: fc.integer({ min: 20, max: 100 }),
});

// ============================================================================
// Property 1: Token Spawn Score Threshold
// ============================================================================

describe('GlitchTokenSpawner Property Tests - Property 1: Token Spawn Score Threshold', () => {
  /**
   * **Feature: echo-constructs, Property 1: Token Spawn Score Threshold**
   * **Validates: Requirements 1.1**
   *
   * For any game state with score < 500, the token spawn probability SHALL be 0.
   * 
   * This property verifies that tokens never spawn when score is below the threshold.
   */
  test('Property 1: Score below threshold (500) prevents token spawn', () => {
    fc.assert(
      fc.property(
        belowThresholdScoreArb,
        validUnlockedConstructsArb,
        (score, unlockedConstructs) => {
          // Always return true from rand to ensure we'd spawn if allowed
          const alwaysSpawnRand = () => 0;
          
          const decision = shouldSpawnToken(
            score,
            'NONE', // No active construct
            unlockedConstructs,
            DEFAULT_GLITCH_TOKEN_CONFIG,
            alwaysSpawnRand
          );
          
          // Should NOT spawn because score is below threshold
          return decision.shouldSpawn === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 1: Token Spawn Score Threshold**
   * **Validates: Requirements 1.1**
   *
   * Verifies that score at or above threshold allows spawning (when other conditions met).
   */
  test('Property 1: Score at or above threshold (500) allows token spawn', () => {
    fc.assert(
      fc.property(
        aboveThresholdScoreArb,
        validUnlockedConstructsArb,
        (score, unlockedConstructs) => {
          // Always return 0 from rand to ensure we pass probability check
          const alwaysSpawnRand = () => 0;
          
          const decision = shouldSpawnToken(
            score,
            'NONE', // No active construct
            unlockedConstructs,
            DEFAULT_GLITCH_TOKEN_CONFIG,
            alwaysSpawnRand
          );
          
          // Should spawn because all conditions are met
          return decision.shouldSpawn === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 1: Token Spawn Score Threshold**
   * **Validates: Requirements 1.1**
   *
   * Verifies that the exact threshold value (500) allows spawning.
   */
  test('Property 1: Exact threshold score (500) allows token spawn', () => {
    fc.assert(
      fc.property(
        validUnlockedConstructsArb,
        (unlockedConstructs) => {
          const alwaysSpawnRand = () => 0;
          
          const decision = shouldSpawnToken(
            500, // Exact threshold
            'NONE',
            unlockedConstructs,
            DEFAULT_GLITCH_TOKEN_CONFIG,
            alwaysSpawnRand
          );
          
          return decision.shouldSpawn === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 1: Token Spawn Score Threshold**
   * **Validates: Requirements 1.1**
   *
   * Verifies that score just below threshold (499) prevents spawning.
   */
  test('Property 1: Score just below threshold (499) prevents token spawn', () => {
    fc.assert(
      fc.property(
        validUnlockedConstructsArb,
        (unlockedConstructs) => {
          const alwaysSpawnRand = () => 0;
          
          const decision = shouldSpawnToken(
            499, // Just below threshold
            'NONE',
            unlockedConstructs,
            DEFAULT_GLITCH_TOKEN_CONFIG,
            alwaysSpawnRand
          );
          
          return decision.shouldSpawn === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 1: Token Spawn Score Threshold**
   * **Validates: Requirements 1.1**
   *
   * Verifies that configurable minScore is respected.
   */
  test('Property 1: Configurable minScore is respected', () => {
    fc.assert(
      fc.property(
        configArb,
        validUnlockedConstructsArb,
        (config, unlockedConstructs) => {
          const alwaysSpawnRand = () => 0;
          
          // Score below config.minScore
          const belowDecision = shouldSpawnToken(
            config.minScore - 1,
            'NONE',
            unlockedConstructs,
            config,
            alwaysSpawnRand
          );
          
          // Score at config.minScore
          const atDecision = shouldSpawnToken(
            config.minScore,
            'NONE',
            unlockedConstructs,
            config,
            alwaysSpawnRand
          );
          
          return belowDecision.shouldSpawn === false && atDecision.shouldSpawn === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 2: Token Safe Position
// ============================================================================

describe('GlitchTokenSpawner Property Tests - Property 2: Token Safe Position', () => {
  /**
   * **Feature: echo-constructs, Property 2: Token Safe Position**
   * **Validates: Requirements 1.2**
   *
   * For any spawned Glitch Token, its position SHALL NOT overlap with any active obstacle.
   * 
   * This property verifies that calculateSafeTokenPosition returns positions
   * that don't overlap with obstacles.
   */
  test('Property 2: Token position does not overlap obstacles', () => {
    fc.assert(
      fc.property(
        obstaclesArb,
        canvasDimensionsArb,
        (obstacles, canvas) => {
          const position = calculateSafeTokenPosition(
            obstacles,
            canvas.width,
            canvas.height,
            DEFAULT_GLITCH_TOKEN_CONFIG
          );
          
          // If position is marked as safe, it should not overlap any obstacle
          if (position.isSafe) {
            const overlaps = isPositionOverlappingObstacle(
              position.x,
              position.y,
              obstacles,
              DEFAULT_GLITCH_TOKEN_CONFIG.safeDistance
            );
            return overlaps === false;
          }
          
          // If not safe, we accept it (fallback case)
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 2: Token Safe Position**
   * **Validates: Requirements 1.2**
   *
   * Verifies that token Y position is within playable area.
   */
  test('Property 2: Token Y position is within playable bounds', () => {
    fc.assert(
      fc.property(
        obstaclesArb,
        canvasDimensionsArb,
        (obstacles, canvas) => {
          const position = calculateSafeTokenPosition(
            obstacles,
            canvas.width,
            canvas.height,
            DEFAULT_GLITCH_TOKEN_CONFIG
          );
          
          // Y should be within 20%-80% of canvas height
          const minY = canvas.height * 0.2;
          const maxY = canvas.height * 0.8;
          
          return position.y >= minY && position.y <= maxY;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 2: Token Safe Position**
   * **Validates: Requirements 1.2**
   *
   * Verifies that token X position is off-screen (spawns from right).
   */
  test('Property 2: Token X position is off-screen right', () => {
    fc.assert(
      fc.property(
        obstaclesArb,
        canvasDimensionsArb,
        (obstacles, canvas) => {
          const position = calculateSafeTokenPosition(
            obstacles,
            canvas.width,
            canvas.height,
            DEFAULT_GLITCH_TOKEN_CONFIG
          );
          
          // X should be at or beyond canvas width
          return position.x >= canvas.width;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 2: Token Safe Position**
   * **Validates: Requirements 1.2**
   *
   * Verifies that isPositionOverlappingObstacle correctly detects overlaps.
   */
  test('Property 2: Overlap detection is accurate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // x
        fc.integer({ min: 0, max: 600 }),  // y
        obstacleArb,
        fc.integer({ min: 10, max: 50 }),  // safeDistance
        (x, y, obstacle, safeDistance) => {
          const overlaps = isPositionOverlappingObstacle(x, y, [obstacle], safeDistance);
          
          // Calculate expected overlap
          const left = obstacle.x - safeDistance;
          const right = obstacle.x + obstacle.width + safeDistance;
          const top = obstacle.y - safeDistance;
          const bottom = obstacle.y + obstacle.height + safeDistance;
          
          const expectedOverlap = x >= left && x <= right && y >= top && y <= bottom;
          
          return overlaps === expectedOverlap;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 2: Token Safe Position**
   * **Validates: Requirements 1.2**
   *
   * Verifies that empty obstacles array always results in safe position.
   */
  test('Property 2: Empty obstacles always results in safe position', () => {
    fc.assert(
      fc.property(
        canvasDimensionsArb,
        (canvas) => {
          const position = calculateSafeTokenPosition(
            [], // No obstacles
            canvas.width,
            canvas.height,
            DEFAULT_GLITCH_TOKEN_CONFIG
          );
          
          return position.isSafe === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 3: Construct Selection from Unlocked Pool
// ============================================================================

describe('GlitchTokenSpawner Property Tests - Property 3: Construct Selection from Unlocked Pool', () => {
  /**
   * **Feature: echo-constructs, Property 3: Construct Selection from Unlocked Pool**
   * **Validates: Requirements 1.4, 8.5**
   *
   * For any Construct selection, the selected Construct SHALL be from unlockedConstructs.
   * 
   * This property verifies that selectRandomConstruct only returns constructs
   * that are in the unlocked pool.
   */
  test('Property 3: Selected construct is always from unlocked pool', () => {
    fc.assert(
      fc.property(
        validUnlockedConstructsArb,
        // Use max < 1 to simulate Math.random() which returns [0, 1)
        fc.double({ min: 0, max: 0.9999999, noNaN: true }),
        (unlockedConstructs, randValue) => {
          const selected = selectRandomConstruct(unlockedConstructs, () => randValue);
          
          // Selected construct must be in the unlocked pool
          return unlockedConstructs.includes(selected);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 3: Construct Selection from Unlocked Pool**
   * **Validates: Requirements 1.4, 8.5**
   *
   * Verifies that NONE is never selected (it's filtered out).
   */
  test('Property 3: NONE is never selected', () => {
    fc.assert(
      fc.property(
        unlockedConstructsArb,
        // Use max < 1 to simulate Math.random() which returns [0, 1)
        fc.double({ min: 0, max: 0.9999999, noNaN: true }),
        (unlockedConstructs, randValue) => {
          const selected = selectRandomConstruct(unlockedConstructs, () => randValue);
          
          // If there are valid constructs, NONE should not be selected
          const hasValidConstructs = unlockedConstructs.some(c => c !== 'NONE');
          
          if (hasValidConstructs) {
            return selected !== 'NONE';
          }
          
          // If no valid constructs, NONE is returned as fallback
          return selected === 'NONE';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 3: Construct Selection from Unlocked Pool**
   * **Validates: Requirements 1.4, 8.5**
   *
   * Verifies that empty unlocked pool returns NONE.
   */
  test('Property 3: Empty unlocked pool returns NONE', () => {
    const selected = selectRandomConstruct([], () => 0.5);
    expect(selected).toBe('NONE');
  });

  /**
   * **Feature: echo-constructs, Property 3: Construct Selection from Unlocked Pool**
   * **Validates: Requirements 1.4, 8.5**
   *
   * Verifies that pool with only NONE returns NONE.
   */
  test('Property 3: Pool with only NONE returns NONE', () => {
    fc.assert(
      fc.property(
        // Use max < 1 to simulate Math.random() which returns [0, 1)
        fc.double({ min: 0, max: 0.9999999, noNaN: true }),
        (randValue) => {
          const selected = selectRandomConstruct(['NONE', 'NONE'], () => randValue);
          return selected === 'NONE';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 3: Construct Selection from Unlocked Pool**
   * **Validates: Requirements 1.4, 8.5**
   *
   * Verifies that single construct pool always returns that construct.
   */
  test('Property 3: Single construct pool always returns that construct', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        // Use max < 1 to simulate Math.random() which returns [0, 1)
        fc.double({ min: 0, max: 0.9999999, noNaN: true }),
        (constructType, randValue) => {
          const selected = selectRandomConstruct([constructType], () => randValue);
          return selected === constructType;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 3: Construct Selection from Unlocked Pool**
   * **Validates: Requirements 1.4, 8.5**
   *
   * Verifies that all constructs in pool have chance of being selected.
   */
  test('Property 3: All constructs in pool can be selected', () => {
    const pool: ConstructType[] = ['TITAN', 'PHASE', 'BLINK'];
    const selected = new Set<ConstructType>();
    
    // With enough iterations, all should be selected
    for (let i = 0; i < 1000; i++) {
      const result = selectRandomConstruct(pool);
      selected.add(result);
    }
    
    // All three should have been selected at least once
    expect(selected.has('TITAN')).toBe(true);
    expect(selected.has('PHASE')).toBe(true);
    expect(selected.has('BLINK')).toBe(true);
    expect(selected.has('NONE')).toBe(false);
  });
});

// ============================================================================
// Property 4: No Token Spawn During Active Construct
// ============================================================================

describe('GlitchTokenSpawner Property Tests - Property 4: No Token Spawn During Active Construct', () => {
  /**
   * **Feature: echo-constructs, Property 4: No Token Spawn During Active Construct**
   * **Validates: Requirements 1.6**
   *
   * For any game state where activeConstruct !== 'NONE', token spawn probability SHALL be 0.
   * 
   * This property verifies that tokens never spawn when a Construct is already active.
   */
  test('Property 4: Active construct prevents token spawn', () => {
    fc.assert(
      fc.property(
        activeConstructTypeArb,
        aboveThresholdScoreArb,
        validUnlockedConstructsArb,
        (activeConstruct, score, unlockedConstructs) => {
          // Always return 0 from rand to ensure we'd spawn if allowed
          const alwaysSpawnRand = () => 0;
          
          const decision = shouldSpawnToken(
            score,
            activeConstruct, // Active construct
            unlockedConstructs,
            DEFAULT_GLITCH_TOKEN_CONFIG,
            alwaysSpawnRand
          );
          
          // Should NOT spawn because construct is active
          return decision.shouldSpawn === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 4: No Token Spawn During Active Construct**
   * **Validates: Requirements 1.6**
   *
   * Verifies that TITAN active prevents spawn.
   */
  test('Property 4: TITAN active prevents spawn', () => {
    fc.assert(
      fc.property(
        aboveThresholdScoreArb,
        validUnlockedConstructsArb,
        (score, unlockedConstructs) => {
          const decision = shouldSpawnToken(
            score,
            'TITAN',
            unlockedConstructs,
            DEFAULT_GLITCH_TOKEN_CONFIG,
            () => 0
          );
          
          return decision.shouldSpawn === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 4: No Token Spawn During Active Construct**
   * **Validates: Requirements 1.6**
   *
   * Verifies that PHASE active prevents spawn.
   */
  test('Property 4: PHASE active prevents spawn', () => {
    fc.assert(
      fc.property(
        aboveThresholdScoreArb,
        validUnlockedConstructsArb,
        (score, unlockedConstructs) => {
          const decision = shouldSpawnToken(
            score,
            'PHASE',
            unlockedConstructs,
            DEFAULT_GLITCH_TOKEN_CONFIG,
            () => 0
          );
          
          return decision.shouldSpawn === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 4: No Token Spawn During Active Construct**
   * **Validates: Requirements 1.6**
   *
   * Verifies that BLINK active prevents spawn.
   */
  test('Property 4: BLINK active prevents spawn', () => {
    fc.assert(
      fc.property(
        aboveThresholdScoreArb,
        validUnlockedConstructsArb,
        (score, unlockedConstructs) => {
          const decision = shouldSpawnToken(
            score,
            'BLINK',
            unlockedConstructs,
            DEFAULT_GLITCH_TOKEN_CONFIG,
            () => 0
          );
          
          return decision.shouldSpawn === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 4: No Token Spawn During Active Construct**
   * **Validates: Requirements 1.6**
   *
   * Verifies that NONE (base form) allows spawn.
   */
  test('Property 4: NONE (base form) allows spawn', () => {
    fc.assert(
      fc.property(
        aboveThresholdScoreArb,
        validUnlockedConstructsArb,
        (score, unlockedConstructs) => {
          const decision = shouldSpawnToken(
            score,
            'NONE', // Base form
            unlockedConstructs,
            DEFAULT_GLITCH_TOKEN_CONFIG,
            () => 0
          );
          
          return decision.shouldSpawn === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Additional Property Tests - Requirements 1.5
// ============================================================================

describe('GlitchTokenSpawner Property Tests - No Constructs Unlocked', () => {
  /**
   * **Feature: echo-constructs, Property 1.5: No Spawn Without Unlocked Constructs**
   * **Validates: Requirements 1.5**
   *
   * Verifies that tokens don't spawn when no constructs are unlocked.
   */
  test('No spawn when unlockedConstructs is empty', () => {
    fc.assert(
      fc.property(
        aboveThresholdScoreArb,
        (score) => {
          const decision = shouldSpawnToken(
            score,
            'NONE',
            [], // Empty unlocked pool
            DEFAULT_GLITCH_TOKEN_CONFIG,
            () => 0
          );
          
          return decision.shouldSpawn === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 1.5: No Spawn Without Unlocked Constructs**
   * **Validates: Requirements 1.5**
   *
   * Verifies that tokens don't spawn when only NONE is in unlocked pool.
   */
  test('No spawn when only NONE is in unlocked pool', () => {
    fc.assert(
      fc.property(
        aboveThresholdScoreArb,
        (score) => {
          const decision = shouldSpawnToken(
            score,
            'NONE',
            ['NONE'], // Only NONE in pool
            DEFAULT_GLITCH_TOKEN_CONFIG,
            () => 0
          );
          
          return decision.shouldSpawn === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});
