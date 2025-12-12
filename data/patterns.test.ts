/**
 * Property-Based Tests for Pattern System
 * Uses fast-check for property-based testing
 * 
 * Requirements: 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    deserializePattern,
    FALLBACK_PATTERN,
    getBasicPatterns,
    getPatternById,
    getPatternsByDifficulty,
    isValidPatternId,
    Lane,
    Pattern,
    PatternDifficulty,
    PatternObstacle,
    PATTERNS,
    PatternShard,
    serializePattern,
    validatePattern,
} from './patterns';

/**
 * Custom generators for pattern-related types
 */
const laneGenerator: fc.Arbitrary<Lane> = fc.constantFrom('TOP', 'BOTTOM');

const difficultyGenerator: fc.Arbitrary<PatternDifficulty> = fc.constantFrom(
  'basic',
  'intermediate',
  'advanced',
  'expert'
);

const patternObstacleGenerator: fc.Arbitrary<PatternObstacle> = fc.record({
  lane: laneGenerator,
  timeOffset: fc.integer({ min: 0, max: 5000 }),
  heightRatio: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
});

const patternShardGenerator: fc.Arbitrary<PatternShard> = fc.record({
  lane: laneGenerator,
  timeOffset: fc.integer({ min: 0, max: 5000 }),
  type: fc.constantFrom('safe', 'risky'),
  positionOffset: fc.option(fc.integer({ min: -100, max: 100 }), { nil: undefined }),
});

const patternGenerator: fc.Arbitrary<Pattern> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
  name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  difficulty: difficultyGenerator,
  duration: fc.integer({ min: 100, max: 10000 }),
  obstacles: fc.array(patternObstacleGenerator, { minLength: 1, maxLength: 10 }),
  shards: fc.array(patternShardGenerator, { minLength: 0, maxLength: 5 }),
});

describe('Pattern Serialization - Property Tests', () => {
  /**
   * **Feature: procedural-gameplay, Property 5: Pattern Serialization Round-Trip**
   * **Validates: Requirements 2.6, 2.7**
   *
   * For any valid Pattern object, serializing to JSON and then deserializing
   * SHALL produce an equivalent Pattern object with all fields intact.
   */
  test('Pattern serialization round-trip preserves all fields', () => {
    fc.assert(
      fc.property(
        patternGenerator,
        (pattern) => {
          const serialized = serializePattern(pattern);
          const deserialized = deserializePattern(serialized);
          
          // Check all required fields are preserved
          if (deserialized.id !== pattern.id) return false;
          if (deserialized.name !== pattern.name) return false;
          if (deserialized.difficulty !== pattern.difficulty) return false;
          if (deserialized.duration !== pattern.duration) return false;
          if (deserialized.obstacles.length !== pattern.obstacles.length) return false;
          if (deserialized.shards.length !== pattern.shards.length) return false;
          
          // Check obstacles are preserved
          for (let i = 0; i < pattern.obstacles.length; i++) {
            const orig = pattern.obstacles[i];
            const deser = deserialized.obstacles[i];
            if (orig.lane !== deser.lane) return false;
            if (orig.timeOffset !== deser.timeOffset) return false;
            // heightRatio may be undefined in both
            if (orig.heightRatio !== deser.heightRatio) return false;
          }
          
          // Check shards are preserved
          for (let i = 0; i < pattern.shards.length; i++) {
            const orig = pattern.shards[i];
            const deser = deserialized.shards[i];
            if (orig.lane !== deser.lane) return false;
            if (orig.timeOffset !== deser.timeOffset) return false;
            if (orig.type !== deser.type) return false;
            // positionOffset may be undefined in both
            if (orig.positionOffset !== deser.positionOffset) return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 5: Pattern Serialization Round-Trip (Predefined Patterns)**
   * **Validates: Requirements 2.6, 2.7**
   *
   * All predefined patterns SHALL successfully round-trip through serialization.
   */
  test('All predefined patterns round-trip correctly', () => {
    for (const pattern of PATTERNS) {
      const serialized = serializePattern(pattern);
      const deserialized = deserializePattern(serialized);
      
      expect(deserialized.id).toBe(pattern.id);
      expect(deserialized.name).toBe(pattern.name);
      expect(deserialized.difficulty).toBe(pattern.difficulty);
      expect(deserialized.duration).toBe(pattern.duration);
      expect(deserialized.obstacles).toEqual(pattern.obstacles);
      expect(deserialized.shards).toEqual(pattern.shards);
    }
  });
});

describe('Pattern Validation - Property Tests', () => {
  /**
   * Validation should accept all valid patterns
   */
  test('validatePattern accepts all valid patterns', () => {
    fc.assert(
      fc.property(
        patternGenerator,
        (pattern) => {
          return validatePattern(pattern) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validation should reject invalid structures
   */
  test('validatePattern rejects null and undefined', () => {
    expect(validatePattern(null)).toBe(false);
    expect(validatePattern(undefined)).toBe(false);
  });

  test('validatePattern rejects patterns with missing required fields', () => {
    expect(validatePattern({})).toBe(false);
    expect(validatePattern({ id: 'test' })).toBe(false);
    expect(validatePattern({ id: 'test', name: 'Test' })).toBe(false);
  });

  test('validatePattern rejects patterns with invalid difficulty', () => {
    const invalidPattern = {
      id: 'test',
      name: 'Test',
      difficulty: 'invalid',
      duration: 1000,
      obstacles: [],
      shards: [],
    };
    expect(validatePattern(invalidPattern)).toBe(false);
  });

  test('validatePattern rejects patterns with invalid duration', () => {
    const invalidPattern = {
      id: 'test',
      name: 'Test',
      difficulty: 'basic',
      duration: -100,
      obstacles: [],
      shards: [],
    };
    expect(validatePattern(invalidPattern)).toBe(false);
  });

  test('validatePattern rejects obstacles with invalid lane', () => {
    const invalidPattern = {
      id: 'test',
      name: 'Test',
      difficulty: 'basic',
      duration: 1000,
      obstacles: [{ lane: 'INVALID', timeOffset: 0 }],
      shards: [],
    };
    expect(validatePattern(invalidPattern)).toBe(false);
  });

  test('validatePattern rejects shards with invalid type', () => {
    const invalidPattern = {
      id: 'test',
      name: 'Test',
      difficulty: 'basic',
      duration: 1000,
      obstacles: [],
      shards: [{ lane: 'TOP', timeOffset: 0, type: 'invalid' }],
    };
    expect(validatePattern(invalidPattern)).toBe(false);
  });
});

describe('Pattern Library - Unit Tests', () => {
  /**
   * Verify all required patterns exist (including duplicates for weighting)
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   */
  test('Pattern library contains all required patterns', () => {
    // PATTERNS array includes duplicates for weighting, so check unique IDs
    const uniquePatternIds = [...new Set(PATTERNS.map(p => p.id))];
    expect(uniquePatternIds.length).toBeGreaterThanOrEqual(5);
    
    expect(uniquePatternIds).toContain('gate');
    expect(uniquePatternIds).toContain('breather');
    expect(uniquePatternIds).toContain('zigzag');
    expect(uniquePatternIds).toContain('tunnel');
    expect(uniquePatternIds).toContain('gauntlet');
  });

  /**
   * Gate pattern: simultaneous TOP and BOTTOM obstacles
   * Requirements: 3.1
   */
  test('Gate pattern has simultaneous TOP and BOTTOM obstacles', () => {
    const gate = getPatternById('gate');
    expect(gate).toBeDefined();
    expect(gate!.difficulty).toBe('basic');
    
    // Should have obstacles at same timeOffset in both lanes
    const topObstacles = gate!.obstacles.filter(o => o.lane === 'TOP');
    const bottomObstacles = gate!.obstacles.filter(o => o.lane === 'BOTTOM');
    
    expect(topObstacles.length).toBeGreaterThan(0);
    expect(bottomObstacles.length).toBeGreaterThan(0);
    expect(topObstacles[0].timeOffset).toBe(bottomObstacles[0].timeOffset);
  });

  /**
   * Zig-Zag pattern: has gate-style obstacles (TOP+BOTTOM pairs)
   * Requirements: 3.2
   */
  test('Zig-Zag pattern has gate-style obstacles', () => {
    const zigzag = getPatternById('zigzag');
    expect(zigzag).toBeDefined();
    expect(zigzag!.difficulty).toBe('intermediate');
    
    // Check that pattern has both TOP and BOTTOM obstacles
    const topCount = zigzag!.obstacles.filter(o => o.lane === 'TOP').length;
    const bottomCount = zigzag!.obstacles.filter(o => o.lane === 'BOTTOM').length;
    expect(topCount).toBeGreaterThan(0);
    expect(bottomCount).toBeGreaterThan(0);
    // Gate-style: equal number of TOP and BOTTOM
    expect(topCount).toBe(bottomCount);
  });

  /**
   * Tunnel pattern: has gate-style obstacles (TOP+BOTTOM pairs)
   * Requirements: 3.3
   */
  test('Tunnel pattern has gate-style obstacles', () => {
    const tunnel = getPatternById('tunnel');
    expect(tunnel).toBeDefined();
    expect(tunnel!.difficulty).toBe('advanced');
    
    // Check that pattern has both TOP and BOTTOM obstacles
    const topCount = tunnel!.obstacles.filter(o => o.lane === 'TOP').length;
    const bottomCount = tunnel!.obstacles.filter(o => o.lane === 'BOTTOM').length;
    expect(topCount).toBeGreaterThan(0);
    expect(bottomCount).toBeGreaterThan(0);
    expect(tunnel!.obstacles.length).toBeGreaterThanOrEqual(4);
  });

  /**
   * Gauntlet pattern: rapid gate-style obstacles
   * Requirements: 3.4
   */
  test('Gauntlet pattern has rapid gate-style obstacles', () => {
    const gauntlet = getPatternById('gauntlet');
    expect(gauntlet).toBeDefined();
    expect(gauntlet!.difficulty).toBe('expert');
    
    // Should have many obstacles with small time gaps
    expect(gauntlet!.obstacles.length).toBeGreaterThanOrEqual(5);
    
    // Check for gate-style (TOP+BOTTOM pairs)
    const topCount = gauntlet!.obstacles.filter(o => o.lane === 'TOP').length;
    const bottomCount = gauntlet!.obstacles.filter(o => o.lane === 'BOTTOM').length;
    expect(topCount).toBe(bottomCount);
  });

  /**
   * Breather pattern: sparse obstacles for recovery
   * Requirements: 3.5
   */
  test('Breather pattern has sparse obstacles', () => {
    const breather = getPatternById('breather');
    expect(breather).toBeDefined();
    expect(breather!.difficulty).toBe('basic');
    
    // Should have few obstacles
    expect(breather!.obstacles.length).toBeLessThanOrEqual(2);
    // Should have safe shards for recovery
    expect(breather!.shards.some(s => s.type === 'safe')).toBe(true);
  });
});

describe('Pattern Utility Functions', () => {
  test('getPatternById returns correct pattern', () => {
    expect(getPatternById('gate')?.id).toBe('gate');
    expect(getPatternById('nonexistent')).toBeUndefined();
  });

  test('getPatternsByDifficulty filters correctly', () => {
    const basicPatterns = getPatternsByDifficulty('basic');
    expect(basicPatterns.every(p => p.difficulty === 'basic')).toBe(true);
    // Includes duplicates for weighting, so check at least 2 unique basic patterns
    const uniqueBasicIds = [...new Set(basicPatterns.map(p => p.id))];
    expect(uniqueBasicIds.length).toBeGreaterThanOrEqual(2);
  });

  test('getBasicPatterns returns only basic patterns', () => {
    const basicPatterns = getBasicPatterns();
    expect(basicPatterns.every(p => p.difficulty === 'basic')).toBe(true);
  });

  test('isValidPatternId validates correctly', () => {
    expect(isValidPatternId('gate')).toBe(true);
    expect(isValidPatternId('zigzag')).toBe(true);
    expect(isValidPatternId('nonexistent')).toBe(false);
  });

  test('FALLBACK_PATTERN is a valid basic pattern', () => {
    expect(validatePattern(FALLBACK_PATTERN)).toBe(true);
    expect(FALLBACK_PATTERN.difficulty).toBe('basic');
  });
});

describe('Deserialization Error Handling', () => {
  test('deserializePattern throws on invalid JSON', () => {
    expect(() => deserializePattern('not valid json')).toThrow();
  });

  test('deserializePattern throws on invalid pattern structure', () => {
    expect(() => deserializePattern('{}')).toThrow('Invalid pattern structure');
    expect(() => deserializePattern('{"id": "test"}')).toThrow('Invalid pattern structure');
  });
});
