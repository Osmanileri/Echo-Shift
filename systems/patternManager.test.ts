/**
 * Property-Based Tests for Pattern Manager System
 * Uses fast-check for property-based testing
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    FALLBACK_PATTERN,
    Lane,
    Pattern,
    PatternDifficulty,
    PATTERNS,
} from '../data/patterns';
import {
    calculateSpawnInterval,
    createPatternManagerState,
    DEFAULT_SPAWN_CONFIG,
    isPatternAvailableForScore,
    isPatternComplete,
    selectPattern,
    SpawnedObstacle,
    startPattern,
    updatePatternSpawn
} from './patternManager';

// ============================================================================
// Test Generators
// ============================================================================

/**
 * Generator for valid Lane values
 */
const laneGenerator = fc.constantFrom<Lane>('TOP', 'BOTTOM');

/**
 * Generator for valid PatternDifficulty values
 */
const difficultyGenerator = fc.constantFrom<PatternDifficulty>(
  'basic', 'intermediate', 'advanced', 'expert'
);

/**
 * Generator for valid PatternObstacle
 */
const obstacleGenerator = fc.record({
  lane: laneGenerator,
  timeOffset: fc.integer({ min: 0, max: 5000 }),
  heightRatio: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
});

/**
 * Generator for valid PatternShard
 */
const shardGenerator = fc.record({
  lane: laneGenerator,
  timeOffset: fc.integer({ min: 0, max: 5000 }),
  type: fc.constantFrom<'safe' | 'risky'>('safe', 'risky'),
  positionOffset: fc.option(fc.integer({ min: -100, max: 100 }), { nil: undefined }),
});

/**
 * Generator for valid Pattern
 * Ensures obstacles and shards are sorted by timeOffset and within duration
 */
const patternGenerator: fc.Arbitrary<Pattern> = fc.integer({ min: 500, max: 5000 }).chain(duration =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
    name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    difficulty: difficultyGenerator,
    duration: fc.constant(duration),
    obstacles: fc.array(
      fc.record({
        lane: laneGenerator,
        timeOffset: fc.integer({ min: 0, max: duration }),
        heightRatio: fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
      }),
      { minLength: 1, maxLength: 10 }
    ).map(obs => obs.sort((a, b) => a.timeOffset - b.timeOffset)),
    shards: fc.array(
      fc.record({
        lane: laneGenerator,
        timeOffset: fc.integer({ min: 0, max: duration }),
        type: fc.constantFrom<'safe' | 'risky'>('safe', 'risky'),
        positionOffset: fc.option(fc.integer({ min: -100, max: 100 }), { nil: undefined }),
      }),
      { minLength: 0, maxLength: 5 }
    ).map(shards => shards.sort((a, b) => a.timeOffset - b.timeOffset)),
  })
);

// ============================================================================
// Property 3: Pattern Obstacle Completeness
// ============================================================================

describe('Pattern Manager - Property 3: Pattern Obstacle Completeness', () => {
  /**
   * **Feature: procedural-gameplay, Property 3: Pattern Obstacle Completeness**
   * **Validates: Requirements 2.2**
   *
   * For any pattern that is spawned, the number of obstacles spawned SHALL equal
   * the number of obstacles defined in that pattern's obstacle array.
   */
  test('All obstacles in pattern are spawned when pattern completes', () => {
    fc.assert(
      fc.property(
        patternGenerator,
        (pattern) => {
          // Track spawned obstacles
          const spawnedObstacles: SpawnedObstacle[] = [];
          
          // Mock spawn callback that records spawned obstacles
          const spawnObstacle = (lane: Lane, heightRatio: number) => {
            spawnedObstacles.push({
              lane,
              timeOffset: 0, // We don't track this in the callback
              heightRatio,
              spawnTime: 0,
            });
          };
          
          // Mock shard spawn callback (no-op for this test)
          const spawnShard = () => {};
          
          // Initialize state and start pattern
          let state = createPatternManagerState();
          state = startPattern(state, pattern, 0);
          
          // Simulate time passing until pattern completes
          // We need to advance time past all obstacle timeOffsets
          const maxTimeOffset = Math.max(
            ...pattern.obstacles.map(o => o.timeOffset),
            pattern.duration
          );
          
          // Update spawn at the end of pattern duration
          state = updatePatternSpawn(state, maxTimeOffset + 1, spawnObstacle, spawnShard);
          
          // Verify: number of spawned obstacles equals pattern definition
          return spawnedObstacles.length === pattern.obstacles.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 3: Pattern Obstacle Completeness (Incremental)**
   * **Validates: Requirements 2.2, 2.3**
   *
   * Obstacles are spawned incrementally as time progresses, respecting timeOffset.
   */
  test('Obstacles spawn incrementally based on timeOffset', () => {
    fc.assert(
      fc.property(
        patternGenerator,
        fc.integer({ min: 0, max: 5000 }),
        (pattern, checkTime) => {
          const spawnedObstacles: SpawnedObstacle[] = [];
          
          const spawnObstacle = (lane: Lane, heightRatio: number) => {
            spawnedObstacles.push({
              lane,
              timeOffset: 0,
              heightRatio,
              spawnTime: checkTime,
            });
          };
          
          const spawnShard = () => {};
          
          let state = createPatternManagerState();
          state = startPattern(state, pattern, 0);
          state = updatePatternSpawn(state, checkTime, spawnObstacle, spawnShard);
          
          // Count how many obstacles should have spawned by checkTime
          const expectedCount = pattern.obstacles.filter(
            o => o.timeOffset <= checkTime
          ).length;
          
          return spawnedObstacles.length === expectedCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test with predefined patterns from the game
   */
  test('All predefined patterns spawn correct obstacle count', () => {
    for (const pattern of PATTERNS) {
      const spawnedObstacles: SpawnedObstacle[] = [];
      
      const spawnObstacle = (lane: Lane, heightRatio: number) => {
        spawnedObstacles.push({
          lane,
          timeOffset: 0,
          heightRatio,
          spawnTime: 0,
        });
      };
      
      const spawnShard = () => {};
      
      let state = createPatternManagerState();
      state = startPattern(state, pattern, 0);
      
      // Advance time past pattern duration
      state = updatePatternSpawn(state, pattern.duration + 1, spawnObstacle, spawnShard);
      
      expect(spawnedObstacles.length).toBe(pattern.obstacles.length);
    }
  });
});

// ============================================================================
// Property 4: Pattern Lane Correctness
// ============================================================================

describe('Pattern Manager - Property 4: Pattern Lane Correctness', () => {
  /**
   * **Feature: procedural-gameplay, Property 4: Pattern Lane Correctness**
   * **Validates: Requirements 2.4**
   *
   * For any obstacle spawned from a pattern, the obstacle's lane SHALL match
   * the lane specified in the pattern's obstacle definition.
   */
  test('Spawned obstacles have correct lanes matching pattern definition', () => {
    fc.assert(
      fc.property(
        patternGenerator,
        (pattern) => {
          // Track spawned obstacles with their lanes
          const spawnedLanes: Lane[] = [];
          
          const spawnObstacle = (lane: Lane) => {
            spawnedLanes.push(lane);
          };
          
          const spawnShard = () => {};
          
          let state = createPatternManagerState();
          state = startPattern(state, pattern, 0);
          
          // Advance time past all obstacles
          const maxTime = Math.max(
            ...pattern.obstacles.map(o => o.timeOffset),
            pattern.duration
          );
          state = updatePatternSpawn(state, maxTime + 1, spawnObstacle, spawnShard);
          
          // Verify each spawned obstacle's lane matches the pattern definition
          // Obstacles are spawned in array order (which is sorted by timeOffset in our generator)
          if (spawnedLanes.length !== pattern.obstacles.length) {
            return false;
          }
          
          for (let i = 0; i < spawnedLanes.length; i++) {
            if (spawnedLanes[i] !== pattern.obstacles[i].lane) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 4: Pattern Lane Correctness (Individual)**
   * **Validates: Requirements 2.4**
   *
   * Each individual obstacle spawn call receives the correct lane from pattern.
   */
  test('Each obstacle spawn receives correct lane parameter', () => {
    fc.assert(
      fc.property(
        patternGenerator,
        (pattern) => {
          // Track spawn calls with index
          const spawnCalls: { index: number; lane: Lane }[] = [];
          let callIndex = 0;
          
          const spawnObstacle = (lane: Lane) => {
            spawnCalls.push({ index: callIndex++, lane });
          };
          
          const spawnShard = () => {};
          
          let state = createPatternManagerState();
          state = startPattern(state, pattern, 0);
          
          // Spawn all obstacles by advancing time past all timeOffsets
          // Pattern obstacles are already sorted by timeOffset in our generator
          for (const obstacle of pattern.obstacles) {
            state = updatePatternSpawn(
              state, 
              obstacle.timeOffset, 
              spawnObstacle, 
              spawnShard
            );
          }
          
          // Verify lanes match in order
          for (let i = 0; i < spawnCalls.length; i++) {
            if (spawnCalls[i].lane !== pattern.obstacles[i].lane) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test with predefined patterns - verify specific lane sequences
   */
  test('Predefined patterns spawn obstacles in correct lanes', () => {
    // Test Zig-Zag pattern specifically (alternating lanes)
    const zigzag = PATTERNS.find(p => p.id === 'zigzag');
    if (zigzag) {
      const spawnedLanes: Lane[] = [];
      
      const spawnObstacle = (lane: Lane) => {
        spawnedLanes.push(lane);
      };
      
      let state = createPatternManagerState();
      state = startPattern(state, zigzag, 0);
      state = updatePatternSpawn(state, zigzag.duration + 1, spawnObstacle, () => {});
      
      // Zig-Zag should have gate-style obstacles (equal TOP and BOTTOM)
      const topCount = spawnedLanes.filter(l => l === 'TOP').length;
      const bottomCount = spawnedLanes.filter(l => l === 'BOTTOM').length;
      expect(topCount).toBe(bottomCount);
    }
    
    // Test Tunnel pattern (gate-style obstacles)
    const tunnel = PATTERNS.find(p => p.id === 'tunnel');
    if (tunnel) {
      const spawnedLanes: Lane[] = [];
      
      const spawnObstacle = (lane: Lane) => {
        spawnedLanes.push(lane);
      };
      
      let state = createPatternManagerState();
      state = startPattern(state, tunnel, 0);
      state = updatePatternSpawn(state, tunnel.duration + 1, spawnObstacle, () => {});
      
      // Tunnel should have gate-style obstacles (both TOP and BOTTOM)
      const topCount = spawnedLanes.filter(l => l === 'TOP').length;
      const bottomCount = spawnedLanes.filter(l => l === 'BOTTOM').length;
      expect(topCount).toBeGreaterThan(0);
      expect(bottomCount).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Additional Pattern Manager Tests
// ============================================================================

describe('Pattern Manager - Pattern Selection', () => {
  /**
   * Test pattern availability based on score
   */
  test('Pattern availability respects score thresholds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (score) => {
          for (const pattern of PATTERNS) {
            const available = isPatternAvailableForScore(pattern, score);
            
            switch (pattern.difficulty) {
              case 'basic':
                if (!available) return false;
                break;
              case 'intermediate':
                if (available !== (score >= 1000)) return false;
                break;
              case 'advanced':
                if (available !== (score >= 2500)) return false;
                break;
              case 'expert':
                if (available !== (score >= 5000)) return false;
                break;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test selectPattern returns valid pattern
   */
  test('selectPattern always returns a valid pattern', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (score) => {
          const pattern = selectPattern(score, PATTERNS);
          
          // Pattern should be defined
          if (!pattern) return false;
          
          // Pattern should have required fields
          if (!pattern.id || !pattern.name) return false;
          if (!Array.isArray(pattern.obstacles)) return false;
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test selectPattern with empty array returns fallback
   */
  test('selectPattern with empty array returns fallback', () => {
    const pattern = selectPattern(1000, []);
    expect(pattern).toBe(FALLBACK_PATTERN);
  });
});

describe('Pattern Manager - Pattern Completion', () => {
  /**
   * Test isPatternComplete
   */
  test('Pattern completes after duration and all spawns', () => {
    fc.assert(
      fc.property(
        patternGenerator,
        (pattern) => {
          let state = createPatternManagerState();
          state = startPattern(state, pattern, 0);
          
          // Before duration - not complete
          const beforeComplete = isPatternComplete(state, pattern.duration - 1);
          
          // Spawn all obstacles
          state = updatePatternSpawn(
            state, 
            pattern.duration + 1, 
            () => {}, 
            () => {}
          );
          
          // After duration with all spawned - complete
          const afterComplete = isPatternComplete(state, pattern.duration + 1);
          
          return !beforeComplete && afterComplete;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 6: Spawn Interval Formula Correctness
// ============================================================================

describe('Pattern Manager - Property 6: Spawn Interval Formula Correctness', () => {
  /**
   * **Feature: procedural-gameplay, Property 6: Spawn Interval Formula Correctness**
   * **Validates: Requirements 4.1, 4.4**
   *
   * For any speed value > 0, the spawn interval SHALL equal REACTION_TIME / (speed / 10),
   * and SHALL never be less than MIN_INTERVAL (400ms).
   */
  test('Spawn interval equals REACTION_TIME / (speed / 10) with MIN_INTERVAL floor', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (speed) => {
          const config = DEFAULT_SPAWN_CONFIG;
          const interval = calculateSpawnInterval(speed, config);
          
          // Calculate expected value using the formula: REACTION_TIME / (speed / 10)
          const rawInterval = config.baseReactionTime / (speed / 10);
          const expectedInterval = Math.max(rawInterval, config.minInterval);
          
          // Property 1: Interval should match formula (with floating point tolerance)
          const matchesFormula = Math.abs(interval - expectedInterval) < 0.001;
          
          // Property 2: Interval should never be less than MIN_INTERVAL (400ms)
          const respectsMinimum = interval >= config.minInterval;
          
          return matchesFormula && respectsMinimum;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 6: Spawn Interval Formula Correctness (Minimum Enforcement)**
   * **Validates: Requirements 4.4**
   *
   * At high speeds, the interval should be clamped to MIN_INTERVAL.
   */
  test('High speed values result in MIN_INTERVAL floor', () => {
    fc.assert(
      fc.property(
        // Generate speeds high enough that raw formula would go below MIN_INTERVAL
        // At speed 30, interval = 1200 / 3 = 400ms (exactly MIN_INTERVAL)
        // At speed > 30, interval would be < 400ms without clamping
        fc.double({ min: 31, max: 100, noNaN: true }),
        (speed) => {
          const config = DEFAULT_SPAWN_CONFIG;
          const interval = calculateSpawnInterval(speed, config);
          
          // At high speeds, interval should be exactly MIN_INTERVAL
          return interval === config.minInterval;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 6: Spawn Interval Formula Correctness (Inverse Relationship)**
   * **Validates: Requirements 4.1**
   *
   * As speed increases, spawn interval should decrease (inverse relationship).
   */
  test('Spawn interval decreases as speed increases', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 29, noNaN: true }),
        fc.double({ min: 0.1, max: 29, noNaN: true }),
        (speed1, speed2) => {
          // Ensure we're testing in the range where MIN_INTERVAL doesn't apply
          const config = DEFAULT_SPAWN_CONFIG;
          const interval1 = calculateSpawnInterval(speed1, config);
          const interval2 = calculateSpawnInterval(speed2, config);
          
          // If speed1 < speed2, then interval1 should be >= interval2
          if (speed1 < speed2) {
            return interval1 >= interval2;
          }
          // If speed1 > speed2, then interval1 should be <= interval2
          if (speed1 > speed2) {
            return interval1 <= interval2;
          }
          // If speeds are equal, intervals should be equal
          return Math.abs(interval1 - interval2) < 0.001;
        }
      ),
      { numRuns: 100 }
    );
  });
});
