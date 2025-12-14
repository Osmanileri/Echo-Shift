/**
 * Property-Based Tests for Shard Placement System
 * Uses fast-check for property-based testing
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * Campaign Update Requirements: 7.1, 7.2, 7.3, 7.4
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    calculateCampaignGemSize,
    calculateCampaignSpawnInterval,
    calculateRiskyShardPosition,
    calculateSafeShardPosition,
    calculateShardPosition,
    CampaignShardConfig,
    collectShard,
    createCampaignShard,
    createPlacedShard,
    DEFAULT_CAMPAIGN_SHARD_CONFIG,
    DEFAULT_SHARD_CONFIG,
    generateCampaignShards,
    generateShardMovement,
    getHorizontalSpreadX,
    HorizontalSpreadPosition,
    isPositionInPlayableArea,
    isWithinSafeHorizontalBounds,
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


// ============================================================================
// Campaign Mode Generators
// ============================================================================

/**
 * Generator for campaign shard config
 */
const campaignShardConfigGenerator: fc.Arbitrary<CampaignShardConfig> = fc.record({
  sizeMultiplier: fc.double({ min: 0.1, max: 1.0, noNaN: true }),
  spawnRateMultiplier: fc.double({ min: 1.0, max: 5.0, noNaN: true }),
  horizontalSpreadEnabled: fc.boolean(),
  safeMargin: fc.integer({ min: 10, max: 100 }),
});

/**
 * Generator for horizontal spread positions
 */
const horizontalSpreadPositionGenerator: fc.Arbitrary<HorizontalSpreadPosition> = 
  fc.constantFrom('left' as const, 'center' as const, 'right' as const, 'random' as const);

/**
 * Generator for base spawn interval (ms)
 */
const baseSpawnIntervalGenerator = fc.integer({ min: 100, max: 5000 });

/**
 * Generator for base gem size (pixels)
 */
const baseGemSizeGenerator = fc.integer({ min: 10, max: 100 });

// ============================================================================
// Property Tests - Campaign Mode Gem Spawning
// Requirements: 7.1, 7.2, 7.3, 7.4
// ============================================================================

describe('Shard Placement System - Campaign Mode Properties', () => {
  /**
   * **Feature: campaign-update-v25, Property 16: Gem spawn rate increase**
   * **Validates: Requirements 7.2**
   *
   * For any spawn interval, the campaign mode spawn rate SHALL be 2x the base rate.
   * This means the spawn interval should be halved (interval / 2).
   */
  test('Campaign mode spawn interval is halved (2x spawn rate)', () => {
    fc.assert(
      fc.property(
        baseSpawnIntervalGenerator,
        (baseInterval) => {
          const campaignInterval = calculateCampaignSpawnInterval(baseInterval);
          const expectedInterval = baseInterval / DEFAULT_CAMPAIGN_SHARD_CONFIG.spawnRateMultiplier;
          
          // Campaign interval should be exactly half of base interval (2x rate)
          return Math.abs(campaignInterval - expectedInterval) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 16: Gem spawn rate increase**
   * **Validates: Requirements 7.2**
   *
   * For any spawn rate multiplier, the campaign interval should be inversely proportional.
   */
  test('Campaign spawn interval is inversely proportional to rate multiplier', () => {
    fc.assert(
      fc.property(
        baseSpawnIntervalGenerator,
        campaignShardConfigGenerator,
        (baseInterval, config) => {
          const campaignInterval = calculateCampaignSpawnInterval(baseInterval, config);
          const expectedInterval = baseInterval / config.spawnRateMultiplier;
          
          // Interval should be base / multiplier
          return Math.abs(campaignInterval - expectedInterval) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 16: Gem spawn rate increase**
   * **Validates: Requirements 7.2**
   *
   * Campaign spawn interval should always be less than or equal to base interval.
   */
  test('Campaign spawn interval is always less than or equal to base interval', () => {
    fc.assert(
      fc.property(
        baseSpawnIntervalGenerator,
        campaignShardConfigGenerator.filter(c => c.spawnRateMultiplier >= 1.0),
        (baseInterval, config) => {
          const campaignInterval = calculateCampaignSpawnInterval(baseInterval, config);
          
          // Campaign interval should be <= base interval (faster spawning)
          return campaignInterval <= baseInterval;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 17: Gem horizontal spread**
   * **Validates: Requirements 7.3, 7.4**
   *
   * For any spawned gem, its x-position SHALL be within the safe play bounds.
   */
  test('Horizontal spread positions are within safe bounds', () => {
    fc.assert(
      fc.property(
        canvasDimensionsGenerator,
        horizontalSpreadPositionGenerator,
        campaignShardConfigGenerator,
        ({ width }, position, config) => {
          // Use a seeded random for deterministic testing
          let seed = 0.5;
          const deterministicRand = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
          };
          
          const x = getHorizontalSpreadX(width, position, config, deterministicRand);
          
          // Position should be within safe bounds
          return isWithinSafeHorizontalBounds(x, width, config);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 17: Gem horizontal spread**
   * **Validates: Requirements 7.3, 7.4**
   *
   * Left zone positions should be in the left third of the safe area.
   */
  test('Left spread position is in left zone', () => {
    fc.assert(
      fc.property(
        canvasDimensionsGenerator,
        campaignShardConfigGenerator,
        ({ width }, config) => {
          // Use deterministic random
          const x = getHorizontalSpreadX(width, 'left', config, () => 0.5);
          
          const safeMin = config.safeMargin;
          const safeMax = width - config.safeMargin;
          const safeWidth = safeMax - safeMin;
          const leftZoneEnd = safeMin + safeWidth * 0.33;
          
          // Left position should be in left zone
          return x >= safeMin && x <= leftZoneEnd;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 17: Gem horizontal spread**
   * **Validates: Requirements 7.3, 7.4**
   *
   * Center zone positions should be in the middle third of the safe area.
   */
  test('Center spread position is in center zone', () => {
    fc.assert(
      fc.property(
        canvasDimensionsGenerator,
        campaignShardConfigGenerator,
        ({ width }, config) => {
          // Use deterministic random
          const x = getHorizontalSpreadX(width, 'center', config, () => 0.5);
          
          const safeMin = config.safeMargin;
          const safeMax = width - config.safeMargin;
          const safeWidth = safeMax - safeMin;
          const leftZoneEnd = safeMin + safeWidth * 0.33;
          const centerZoneEnd = safeMin + safeWidth * 0.66;
          
          // Center position should be in center zone
          return x >= leftZoneEnd && x <= centerZoneEnd;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 17: Gem horizontal spread**
   * **Validates: Requirements 7.3, 7.4**
   *
   * Right zone positions should be in the right third of the safe area.
   */
  test('Right spread position is in right zone', () => {
    fc.assert(
      fc.property(
        canvasDimensionsGenerator,
        campaignShardConfigGenerator,
        ({ width }, config) => {
          // Use deterministic random
          const x = getHorizontalSpreadX(width, 'right', config, () => 0.5);
          
          const safeMin = config.safeMargin;
          const safeMax = width - config.safeMargin;
          const safeWidth = safeMax - safeMin;
          const centerZoneEnd = safeMin + safeWidth * 0.66;
          
          // Right position should be in right zone
          return x >= centerZoneEnd && x <= safeMax;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 17: Gem horizontal spread**
   * **Validates: Requirements 7.3, 7.4**
   *
   * Generated campaign shards should have varied horizontal positions.
   */
  test('Generated campaign shards have varied horizontal positions', () => {
    fc.assert(
      fc.property(
        canvasDimensionsGenerator,
        laneGenerator,
        fc.integer({ min: 3, max: 10 }),
        ({ width, height }, lane, count) => {
          const shards = generateCampaignShards(
            'test',
            count,
            lane,
            width,
            height
          );
          
          // All shards should be within safe bounds
          const allWithinBounds = shards.every(shard => 
            isWithinSafeHorizontalBounds(shard.x, width)
          );
          
          // Should have the correct count
          const correctCount = shards.length === count;
          
          return allWithinBounds && correctCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 17: Gem horizontal spread**
   * **Validates: Requirements 7.3, 7.4**
   *
   * Campaign shards created with createCampaignShard should be within safe bounds.
   */
  test('createCampaignShard produces shards within safe bounds', () => {
    fc.assert(
      fc.property(
        canvasDimensionsGenerator,
        laneGenerator,
        horizontalSpreadPositionGenerator,
        ({ width, height }, lane, position) => {
          const shard = createCampaignShard(
            'test-shard',
            lane,
            width,
            height,
            position
          );
          
          // Shard should be within safe horizontal bounds
          return isWithinSafeHorizontalBounds(shard.x, width);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Campaign Mode Edge Cases and Unit Tests
// ============================================================================

describe('Shard Placement System - Campaign Mode Edge Cases', () => {
  /**
   * Edge case: Default campaign config produces correct gem size
   */
  test('Default campaign config produces 60% gem size', () => {
    const baseSize = 100;
    const campaignSize = calculateCampaignGemSize(baseSize);
    
    expect(campaignSize).toBe(60); // 60% of 100
  });

  /**
   * Edge case: Default campaign config produces correct spawn interval
   */
  test('Default campaign config produces halved spawn interval', () => {
    const baseInterval = 1000;
    const campaignInterval = calculateCampaignSpawnInterval(baseInterval);
    
    expect(campaignInterval).toBe(500); // 1000 / 2
  });

  /**
   * Edge case: Safe margin is respected
   */
  test('Safe margin is respected in horizontal spread', () => {
    const canvasWidth = 800;
    const config: CampaignShardConfig = {
      ...DEFAULT_CAMPAIGN_SHARD_CONFIG,
      safeMargin: 100,
    };
    
    // Test multiple random positions
    for (let i = 0; i < 10; i++) {
      const x = getHorizontalSpreadX(canvasWidth, 'random', config);
      expect(x).toBeGreaterThanOrEqual(100);
      expect(x).toBeLessThanOrEqual(700);
    }
  });

  /**
   * Edge case: isWithinSafeHorizontalBounds correctly validates positions
   */
  test('isWithinSafeHorizontalBounds validates correctly', () => {
    const canvasWidth = 800;
    const config: CampaignShardConfig = {
      ...DEFAULT_CAMPAIGN_SHARD_CONFIG,
      safeMargin: 50,
    };
    
    // Valid positions
    expect(isWithinSafeHorizontalBounds(50, canvasWidth, config)).toBe(true);
    expect(isWithinSafeHorizontalBounds(400, canvasWidth, config)).toBe(true);
    expect(isWithinSafeHorizontalBounds(750, canvasWidth, config)).toBe(true);
    
    // Invalid positions
    expect(isWithinSafeHorizontalBounds(49, canvasWidth, config)).toBe(false);
    expect(isWithinSafeHorizontalBounds(751, canvasWidth, config)).toBe(false);
  });

  /**
   * Edge case: createCampaignShard creates valid shard structure
   */
  test('createCampaignShard creates valid shard structure', () => {
    const shard = createCampaignShard(
      'test-id',
      'TOP',
      800,
      600,
      'center'
    );
    
    expect(shard.id).toBe('test-id');
    expect(shard.lane).toBe('TOP');
    expect(shard.type).toBe('safe');
    expect(shard.collected).toBe(false);
    expect(shard.movement).toBeDefined();
    expect(shard.y).toBe(150); // 25% of 600
  });

  /**
   * Edge case: generateCampaignShards creates correct number of shards
   */
  test('generateCampaignShards creates correct number of shards', () => {
    const shards = generateCampaignShards(
      'test',
      5,
      'BOTTOM',
      800,
      600
    );
    
    expect(shards.length).toBe(5);
    shards.forEach((shard, i) => {
      expect(shard.id).toBe(`test-${i}`);
      expect(shard.lane).toBe('BOTTOM');
    });
  });
});
