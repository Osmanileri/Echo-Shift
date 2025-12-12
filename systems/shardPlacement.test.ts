/**
 * Property-Based Tests for Shard Placement System
 * Uses fast-check for property-based testing
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    calculateRiskyShardPosition,
    calculateSafeShardPosition,
    calculateShardPosition,
    collectShard,
    createPlacedShard,
    DEFAULT_SHARD_CONFIG,
    generateShardMovement,
    isPositionInPlayableArea,
    PlacedShard,
    PlayableArea,
    SHARD_MOVEMENT_CONFIG,
    ShardConfig,
    updateShardPosition,
    validateShardLanePosition
} from './shardPlacement';

// ============================================================================
// Generators
// ============================================================================

/**
 * Generator for valid Lane values
 */
const laneGenerator = fc.constantFrom('TOP' as const, 'BOTTOM' as const);

/**
 * Generator for shard types
 */
const shardTypeGenerator = fc.constantFrom('safe' as const, 'risky' as const);

/**
 * Generator for valid canvas dimensions
 */
const canvasDimensionsGenerator = fc.record({
  width: fc.integer({ min: 400, max: 1920 }),
  height: fc.integer({ min: 300, max: 1080 }),
});

/**
 * Generator for valid gap positions (gapStart < gapEnd)
 */
const gapPositionGenerator = fc.integer({ min: 0, max: 1000 }).chain((start) =>
  fc.integer({ min: start + 10, max: start + 500 }).map((end) => ({
    gapStart: start,
    gapEnd: end,
  }))
);

/**
 * Generator for obstacle info
 */
const obstacleInfoGenerator = fc.record({
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 800 }),
  height: fc.integer({ min: 20, max: 200 }),
});

/**
 * Generator for valid shard config
 */
const shardConfigGenerator: fc.Arbitrary<ShardConfig> = fc.record({
  safeGapRatio: fc.double({ min: 0.1, max: 0.9, noNaN: true }),
  riskyEdgeDistance: fc.integer({ min: 5, max: 50 }),
  nearMissBonus: fc.integer({ min: 1, max: 20 }),
  baseShardValue: fc.integer({ min: 1, max: 10 }),
});

/**
 * Generator for playable area
 */
const playableAreaGenerator: fc.Arbitrary<PlayableArea> = fc.record({
  minX: fc.constant(0),
  maxX: fc.integer({ min: 400, max: 1920 }),
  minY: fc.constant(0),
  maxY: fc.integer({ min: 300, max: 1080 }),
  canvasWidth: fc.integer({ min: 400, max: 1920 }),
  canvasHeight: fc.integer({ min: 300, max: 1080 }),
});

/**
 * Generator for ShardMovement
 */
const shardMovementGenerator = fc.record({
  verticalAmplitude: fc.double({ min: 10, max: 50, noNaN: true }),
  verticalFrequency: fc.double({ min: 1, max: 5, noNaN: true }),
  verticalPhase: fc.double({ min: 0, max: Math.PI * 2, noNaN: true }),
  horizontalAmplitude: fc.double({ min: 10, max: 50, noNaN: true }),
  horizontalFrequency: fc.double({ min: 1, max: 5, noNaN: true }),
  horizontalPhase: fc.double({ min: 0, max: Math.PI * 2, noNaN: true }),
});

/**
 * Generator for PlacedShard with movement
 */
const placedShardGenerator: fc.Arbitrary<PlacedShard> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 800 }),
  baseX: fc.integer({ min: 0, max: 1000 }),
  baseY: fc.integer({ min: 0, max: 800 }),
  lane: laneGenerator,
  type: shardTypeGenerator,
  value: fc.integer({ min: 1, max: 100 }),
  collected: fc.boolean(),
  movement: shardMovementGenerator,
  spawnTime: fc.integer({ min: 0, max: Date.now() }),
});

// ============================================================================
// Property Tests - Property 7: Shard Position Validity
// ============================================================================

describe('Shard Placement System - Position Validity Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property 7: Shard Position Validity**
   * **Validates: Requirements 5.1**
   *
   * For any shard spawned from a pattern, the shard's position SHALL be
   * within the playable area and SHALL match the lane specified in the pattern.
   */
  test('Safe shard positions are within playable area', () => {
    fc.assert(
      fc.property(
        gapPositionGenerator,
        laneGenerator,
        canvasDimensionsGenerator,
        ({ gapStart, gapEnd }, lane, { height }) => {
          const position = calculateSafeShardPosition(gapStart, gapEnd, lane, height);
          
          const playableArea: PlayableArea = {
            minX: 0,
            maxX: gapEnd + 100, // Ensure gap is within playable area
            minY: 0,
            maxY: height,
            canvasWidth: gapEnd + 100,
            canvasHeight: height,
          };
          
          // Position should be within playable area
          return isPositionInPlayableArea(position, playableArea);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 7: Shard Position Validity**
   * **Validates: Requirements 5.1**
   *
   * Safe shard Y position matches the specified lane.
   */
  test('Safe shard lane matches Y position', () => {
    fc.assert(
      fc.property(
        gapPositionGenerator,
        laneGenerator,
        canvasDimensionsGenerator,
        ({ gapStart, gapEnd }, lane, { height }) => {
          const position = calculateSafeShardPosition(gapStart, gapEnd, lane, height);
          
          const shard = createPlacedShard(
            'test-shard',
            position,
            lane,
            'safe'
          );
          
          // Shard lane should match its Y position
          return validateShardLanePosition(shard, height);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 7: Shard Position Validity**
   * **Validates: Requirements 5.1**
   *
   * Risky shard positions are valid numbers (not NaN or Infinity).
   */
  test('Risky shard positions are valid numbers', () => {
    fc.assert(
      fc.property(
        obstacleInfoGenerator,
        laneGenerator,
        shardConfigGenerator,
        (obstacle, lane, config) => {
          const position = calculateRiskyShardPosition(
            obstacle.x,
            obstacle.y,
            obstacle.height,
            lane,
            config
          );
          
          // Position should be valid finite numbers
          return (
            Number.isFinite(position.x) &&
            Number.isFinite(position.y)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 7: Shard Position Validity**
   * **Validates: Requirements 5.1**
   *
   * Safe shard X position is centered in the gap.
   */
  test('Safe shard X position is centered in gap', () => {
    fc.assert(
      fc.property(
        gapPositionGenerator,
        laneGenerator,
        canvasDimensionsGenerator,
        ({ gapStart, gapEnd }, lane, { height }) => {
          const position = calculateSafeShardPosition(gapStart, gapEnd, lane, height);
          
          const expectedX = gapStart + (gapEnd - gapStart) * DEFAULT_SHARD_CONFIG.safeGapRatio;
          
          // X should be at the center of the gap (with tolerance)
          return Math.abs(position.x - expectedX) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 7: Shard Position Validity**
   * **Validates: Requirements 5.1**
   *
   * TOP lane shards are in upper half, BOTTOM lane shards are in lower half.
   */
  test('Shard lane determines correct vertical half', () => {
    fc.assert(
      fc.property(
        gapPositionGenerator,
        laneGenerator,
        canvasDimensionsGenerator,
        ({ gapStart, gapEnd }, lane, { height }) => {
          const position = calculateSafeShardPosition(gapStart, gapEnd, lane, height);
          const midpoint = height / 2;
          
          if (lane === 'TOP') {
            return position.y < midpoint;
          } else {
            return position.y >= midpoint;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property Tests - Property 8: Shard Collection Value
// ============================================================================

describe('Shard Placement System - Collection Value Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property 8: Shard Collection Value**
   * **Validates: Requirements 5.4, 5.5**
   *
   * For any shard that is collected, the awarded value SHALL equal
   * the shard's base value, plus bonus if collected via Near Miss.
   */
  test('Shard collection awards base value without Near Miss', () => {
    fc.assert(
      fc.property(
        placedShardGenerator,
        shardConfigGenerator,
        (shard, config) => {
          const awardedValue = collectShard(shard, false, config);
          
          // Without Near Miss, awarded value should equal shard value
          return awardedValue === shard.value;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 8: Shard Collection Value**
   * **Validates: Requirements 5.4, 5.5**
   *
   * Near Miss collection adds bonus to base value.
   */
  test('Near Miss collection adds bonus to base value', () => {
    fc.assert(
      fc.property(
        placedShardGenerator,
        shardConfigGenerator,
        (shard, config) => {
          const awardedValue = collectShard(shard, true, config);
          const expectedValue = shard.value + config.nearMissBonus;
          
          // With Near Miss, awarded value should include bonus
          return awardedValue === expectedValue;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 8: Shard Collection Value**
   * **Validates: Requirements 5.4, 5.5**
   *
   * Near Miss bonus is always positive (increases value).
   */
  test('Near Miss always increases collection value', () => {
    fc.assert(
      fc.property(
        placedShardGenerator,
        shardConfigGenerator,
        (shard, config) => {
          const normalValue = collectShard(shard, false, config);
          const nearMissValue = collectShard(shard, true, config);
          
          // Near Miss value should always be greater than normal value
          return nearMissValue > normalValue;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 8: Shard Collection Value**
   * **Validates: Requirements 5.4, 5.5**
   *
   * Collection value is always positive.
   */
  test('Collection value is always positive', () => {
    fc.assert(
      fc.property(
        placedShardGenerator,
        fc.boolean(),
        shardConfigGenerator,
        (shard, isNearMiss, config) => {
          const awardedValue = collectShard(shard, isNearMiss, config);
          
          // Awarded value should always be positive
          return awardedValue > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 8: Shard Collection Value**
   * **Validates: Requirements 5.4, 5.5**
   *
   * Near Miss bonus difference is exactly the configured bonus amount.
   */
  test('Near Miss bonus difference equals configured bonus', () => {
    fc.assert(
      fc.property(
        placedShardGenerator,
        shardConfigGenerator,
        (shard, config) => {
          const normalValue = collectShard(shard, false, config);
          const nearMissValue = collectShard(shard, true, config);
          const difference = nearMissValue - normalValue;
          
          // Difference should be exactly the near miss bonus
          return difference === config.nearMissBonus;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property Tests - Dynamic Movement Properties
// ============================================================================

describe('Shard Placement System - Dynamic Movement Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property: Movement Generation**
   * 
   * For any shard type, generated movement parameters SHALL be within
   * the configured ranges for that type.
   */
  test('Generated movement parameters are within configured ranges', () => {
    fc.assert(
      fc.property(
        shardTypeGenerator,
        (type) => {
          const movement = generateShardMovement(type);
          const config = SHARD_MOVEMENT_CONFIG[type];
          
          return (
            movement.verticalAmplitude >= config.verticalAmplitude.min &&
            movement.verticalAmplitude <= config.verticalAmplitude.max &&
            movement.verticalFrequency >= config.verticalFrequency.min &&
            movement.verticalFrequency <= config.verticalFrequency.max &&
            movement.horizontalAmplitude >= config.horizontalAmplitude.min &&
            movement.horizontalAmplitude <= config.horizontalAmplitude.max &&
            movement.horizontalFrequency >= config.horizontalFrequency.min &&
            movement.horizontalFrequency <= config.horizontalFrequency.max
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property: Movement Phase Validity**
   * 
   * Generated phase values SHALL be between 0 and 2π.
   */
  test('Generated phase values are valid', () => {
    fc.assert(
      fc.property(
        shardTypeGenerator,
        (type) => {
          const movement = generateShardMovement(type);
          
          return (
            movement.verticalPhase >= 0 &&
            movement.verticalPhase <= Math.PI * 2 &&
            movement.horizontalPhase >= 0 &&
            movement.horizontalPhase <= Math.PI * 2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property: Risky shards move more**
   * 
   * Risky shards SHALL have larger movement ranges than safe shards.
   */
  test('Risky shards have larger movement ranges than safe shards', () => {
    const safeConfig = SHARD_MOVEMENT_CONFIG.safe;
    const riskyConfig = SHARD_MOVEMENT_CONFIG.risky;
    
    // Risky shards should have larger amplitude ranges
    expect(riskyConfig.verticalAmplitude.max).toBeGreaterThan(safeConfig.verticalAmplitude.max);
    expect(riskyConfig.horizontalAmplitude.max).toBeGreaterThan(safeConfig.horizontalAmplitude.max);
    expect(riskyConfig.verticalFrequency.max).toBeGreaterThan(safeConfig.verticalFrequency.max);
  });

  /**
   * **Feature: procedural-gameplay, Property: Position oscillation bounded**
   * 
   * For any shard, the calculated position SHALL oscillate within
   * the amplitude bounds from the base position.
   */
  test('Calculated position stays within amplitude bounds', () => {
    fc.assert(
      fc.property(
        placedShardGenerator,
        fc.integer({ min: 0, max: 10000 }), // time offset in ms
        (shard, timeOffset) => {
          const currentTime = shard.spawnTime + timeOffset;
          const pos = calculateShardPosition(shard, currentTime);
          
          // Position should be within amplitude bounds of base position
          const xDiff = Math.abs(pos.x - shard.baseX);
          const yDiff = Math.abs(pos.y - shard.baseY);
          
          return (
            xDiff <= shard.movement.horizontalAmplitude + 0.001 &&
            yDiff <= shard.movement.verticalAmplitude + 0.001
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property: Position at spawn time**
   * 
   * At spawn time (t=0), the position offset depends on the phase.
   */
  test('Position at spawn time is determined by phase', () => {
    fc.assert(
      fc.property(
        placedShardGenerator,
        (shard) => {
          const pos = calculateShardPosition(shard, shard.spawnTime);
          
          // At t=0, offset = amplitude * sin(phase)
          const expectedXOffset = Math.sin(shard.movement.horizontalPhase) * shard.movement.horizontalAmplitude;
          const expectedYOffset = Math.sin(shard.movement.verticalPhase) * shard.movement.verticalAmplitude;
          
          const actualXOffset = pos.x - shard.baseX;
          const actualYOffset = pos.y - shard.baseY;
          
          return (
            Math.abs(actualXOffset - expectedXOffset) < 0.001 &&
            Math.abs(actualYOffset - expectedYOffset) < 0.001
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property: Update preserves shard identity**
   * 
   * Updating shard position SHALL preserve all other shard properties.
   */
  test('Update preserves shard identity and properties', () => {
    fc.assert(
      fc.property(
        placedShardGenerator,
        fc.integer({ min: 0, max: 10000 }),
        (shard, timeOffset) => {
          const currentTime = shard.spawnTime + timeOffset;
          const updated = updateShardPosition(shard, currentTime);
          
          // All properties except x and y should be preserved
          return (
            updated.id === shard.id &&
            updated.baseX === shard.baseX &&
            updated.baseY === shard.baseY &&
            updated.lane === shard.lane &&
            updated.type === shard.type &&
            updated.value === shard.value &&
            updated.collected === shard.collected &&
            updated.movement === shard.movement &&
            updated.spawnTime === shard.spawnTime
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Edge Cases and Unit Tests
// ============================================================================

describe('Shard Placement System - Edge Cases', () => {
  /**
   * Edge case: Default config produces valid positions
   */
  test('Default config produces valid safe shard positions', () => {
    const position = calculateSafeShardPosition(100, 200, 'TOP', 600);
    
    expect(position.x).toBe(150); // Center of gap
    expect(position.y).toBe(150); // 25% of 600
  });

  /**
   * Edge case: Default config produces valid risky positions
   */
  test('Default config produces valid risky shard positions', () => {
    const position = calculateRiskyShardPosition(100, 50, 40, 'TOP');
    
    expect(position.x).toBe(120); // 100 + 20 (riskyEdgeDistance)
    expect(position.y).toBe(110); // 50 + 40 + 20 (below obstacle)
  });

  /**
   * Edge case: BOTTOM lane risky shard is above obstacle
   */
  test('BOTTOM lane risky shard is positioned above obstacle', () => {
    const position = calculateRiskyShardPosition(100, 400, 40, 'BOTTOM');
    
    expect(position.x).toBe(120); // 100 + 20
    expect(position.y).toBe(380); // 400 - 20 (above obstacle)
  });

  /**
   * Edge case: createPlacedShard creates correct structure with movement
   */
  test('createPlacedShard creates correct structure with movement', () => {
    const shard = createPlacedShard(
      'test-id',
      { x: 100, y: 200 },
      'TOP',
      'safe'
    );
    
    expect(shard.id).toBe('test-id');
    expect(shard.x).toBe(100);
    expect(shard.y).toBe(200);
    expect(shard.baseX).toBe(100);
    expect(shard.baseY).toBe(200);
    expect(shard.lane).toBe('TOP');
    expect(shard.type).toBe('safe');
    expect(shard.value).toBe(DEFAULT_SHARD_CONFIG.baseShardValue);
    expect(shard.collected).toBe(false);
    // Movement should be generated
    expect(shard.movement).toBeDefined();
    expect(shard.movement.verticalAmplitude).toBeGreaterThan(0);
    expect(shard.movement.horizontalAmplitude).toBeGreaterThan(0);
    expect(shard.spawnTime).toBeGreaterThan(0);
  });

  /**
   * Edge case: Collection with default config
   */
  test('Collection with default config works correctly', () => {
    const shard: PlacedShard = {
      id: 'test',
      x: 100,
      y: 200,
      baseX: 100,
      baseY: 200,
      lane: 'TOP',
      type: 'safe',
      value: 1,
      collected: false,
      movement: {
        verticalAmplitude: 20,
        verticalFrequency: 2,
        verticalPhase: 0,
        horizontalAmplitude: 15,
        horizontalFrequency: 1.5,
        horizontalPhase: 0,
      },
      spawnTime: Date.now(),
    };
    
    const normalValue = collectShard(shard, false);
    const nearMissValue = collectShard(shard, true);
    
    expect(normalValue).toBe(1);
    expect(nearMissValue).toBe(1 + DEFAULT_SHARD_CONFIG.nearMissBonus);
  });
});
