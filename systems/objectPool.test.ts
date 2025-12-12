/**
 * Property-Based Tests for Object Pool System
 * Uses fast-check for property-based testing
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import * as fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import {
    createObstaclePool,
    createShardPool,
    getPoolStats,
    PooledObstacle,
    PooledShard
} from './objectPool';

describe('Object Pool System - Pool Invariant Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property 9: Object Pool Invariant**
   * **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
   *
   * For any object pool state, the sum of active objects and available objects
   * SHALL equal the total pool size. When an object is released, it SHALL
   * become available for reuse.
   */
  test('Pool invariant: active + available = total (obstacle pool)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.constantFrom('acquire', 'release'), { minLength: 0, maxLength: 100 }),
        (initialSize, operations) => {
          const pool = createObstaclePool(initialSize);
          const acquiredItems: PooledObstacle[] = [];
          
          for (const op of operations) {
            if (op === 'acquire') {
              const item = pool.acquire();
              acquiredItems.push(item);
            } else if (op === 'release' && acquiredItems.length > 0) {
              const item = acquiredItems.pop()!;
              pool.release(item);
            }
          }
          
          const stats = getPoolStats(pool);
          
          // Invariant: active + available = total
          return stats.active + stats.available === stats.total;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 9: Object Pool Invariant**
   * **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
   *
   * For any object pool state, the sum of active objects and available objects
   * SHALL equal the total pool size. When an object is released, it SHALL
   * become available for reuse.
   */
  test('Pool invariant: active + available = total (shard pool)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.constantFrom('acquire', 'release'), { minLength: 0, maxLength: 100 }),
        (initialSize, operations) => {
          const pool = createShardPool(initialSize);
          const acquiredItems: PooledShard[] = [];
          
          for (const op of operations) {
            if (op === 'acquire') {
              const item = pool.acquire();
              acquiredItems.push(item);
            } else if (op === 'release' && acquiredItems.length > 0) {
              const item = acquiredItems.pop()!;
              pool.release(item);
            }
          }
          
          const stats = getPoolStats(pool);
          
          // Invariant: active + available = total
          return stats.active + stats.available === stats.total;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 9: Object Pool Invariant (Release Reuse)**
   * **Validates: Requirements 6.2, 6.5**
   *
   * When an object is released, it SHALL become available for reuse.
   */
  test('Released objects become available for reuse', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (initialSize) => {
          const pool = createObstaclePool(initialSize);
          
          // Acquire all items
          const acquired: PooledObstacle[] = [];
          for (let i = 0; i < initialSize; i++) {
            acquired.push(pool.acquire());
          }
          
          // All should be active
          const statsAfterAcquire = getPoolStats(pool);
          if (statsAfterAcquire.active !== initialSize) return false;
          if (statsAfterAcquire.available !== 0) return false;
          
          // Release one item
          const releasedItem = acquired.pop()!;
          pool.release(releasedItem);
          
          // One should now be available
          const statsAfterRelease = getPoolStats(pool);
          if (statsAfterRelease.active !== initialSize - 1) return false;
          if (statsAfterRelease.available !== 1) return false;
          
          // Acquire again - should get the released item back
          const reacquired = pool.acquire();
          
          // Should be the same item (by id)
          return reacquired.id === releasedItem.id;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property 9: Object Pool Invariant (Pool Expansion)**
   * **Validates: Requirements 6.4**
   *
   * When the pool is empty, the Pool System SHALL expand the pool by creating
   * additional objects.
   */
  test('Pool expands when exhausted', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (initialSize, extraAcquires) => {
          const pool = createObstaclePool(initialSize);
          
          // Acquire more than initial size
          const totalAcquires = initialSize + extraAcquires;
          for (let i = 0; i < totalAcquires; i++) {
            pool.acquire();
          }
          
          const stats = getPoolStats(pool);
          
          // Pool should have expanded
          // Total should be >= totalAcquires
          // Active should equal totalAcquires
          return stats.total >= totalAcquires && stats.active === totalAcquires;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Object Pool System - Pre-allocation Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property: Pre-allocation**
   * **Validates: Requirements 6.1**
   *
   * When the game initializes, the Pool System SHALL pre-allocate obstacle
   * and shard objects.
   */
  test('Pool pre-allocates objects on creation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (size) => {
          const obstaclePool = createObstaclePool(size);
          const shardPool = createShardPool(size);
          
          // Both pools should have pre-allocated items
          return obstaclePool.items.length === size && 
                 shardPool.items.length === size;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: procedural-gameplay, Property: Initial State**
   * **Validates: Requirements 6.1**
   *
   * All pre-allocated objects SHALL start in inactive state.
   */
  test('Pre-allocated objects start inactive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (size) => {
          const pool = createObstaclePool(size);
          
          // All items should be inactive initially
          return pool.items.every(item => !item.active) &&
                 pool.activeCount === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Object Pool System - Reset Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property: Reset Behavior**
   * **Validates: Requirements 6.2**
   *
   * After reset, all objects SHALL be inactive and available.
   */
  test('Reset makes all objects available', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        (initialSize, acquireCount) => {
          const pool = createObstaclePool(initialSize);
          
          // Acquire some items
          const toAcquire = Math.min(acquireCount, initialSize);
          for (let i = 0; i < toAcquire; i++) {
            pool.acquire();
          }
          
          // Reset the pool
          pool.reset();
          
          const stats = getPoolStats(pool);
          
          // All should be available after reset
          return stats.active === 0 && 
                 stats.available === stats.total &&
                 pool.items.every(item => !item.active);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Object Pool System - getActive Properties', () => {
  /**
   * **Feature: procedural-gameplay, Property: getActive Consistency**
   * **Validates: Requirements 6.2, 6.3**
   *
   * getActive() SHALL return exactly the active objects.
   */
  test('getActive returns exactly active objects', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        (initialSize, acquireCount) => {
          const pool = createObstaclePool(initialSize);
          
          // Acquire some items
          const acquired: PooledObstacle[] = [];
          for (let i = 0; i < acquireCount; i++) {
            acquired.push(pool.acquire());
          }
          
          const active = pool.getActive();
          
          // getActive should return same count as acquired
          if (active.length !== acquired.length) return false;
          
          // All returned items should be active
          if (!active.every(item => item.active)) return false;
          
          // All acquired items should be in active list
          return acquired.every(acq => 
            active.some(act => act.id === acq.id)
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Object Pool System - Edge Cases', () => {
  /**
   * Edge case: Releasing non-pool item should be ignored
   */
  test('Releasing non-pool item is ignored gracefully', () => {
    const pool = createObstaclePool(5);
    
    // Create a fake item not in the pool
    const fakeItem: PooledObstacle = {
      id: 'fake-item-not-in-pool',
      x: 0,
      y: 0,
      width: 60,
      height: 80,
      lane: 'TOP',
      polarity: 'white',
      active: true
    };
    
    const statsBefore = getPoolStats(pool);
    
    // This should not throw and should not affect pool state
    pool.release(fakeItem);
    
    const statsAfter = getPoolStats(pool);
    
    expect(statsAfter.active).toBe(statsBefore.active);
    expect(statsAfter.available).toBe(statsBefore.available);
    expect(statsAfter.total).toBe(statsBefore.total);
  });

  /**
   * Edge case: Double release should be handled gracefully
   */
  test('Double release is handled gracefully', () => {
    const pool = createObstaclePool(5);
    
    const item = pool.acquire();
    const statsAfterAcquire = getPoolStats(pool);
    
    // First release
    pool.release(item);
    const statsAfterFirstRelease = getPoolStats(pool);
    
    // Second release of same item
    pool.release(item);
    const statsAfterSecondRelease = getPoolStats(pool);
    
    // Stats should be same after first and second release
    expect(statsAfterFirstRelease.active).toBe(statsAfterAcquire.active - 1);
    expect(statsAfterSecondRelease.active).toBe(statsAfterFirstRelease.active);
  });

  /**
   * Edge case: Pool with size 1
   */
  test('Pool with size 1 works correctly', () => {
    const pool = createObstaclePool(1);
    
    const item1 = pool.acquire();
    expect(pool.activeCount).toBe(1);
    
    // Acquiring again should expand pool
    const item2 = pool.acquire();
    expect(pool.activeCount).toBe(2);
    expect(pool.items.length).toBeGreaterThan(1);
    
    pool.release(item1);
    pool.release(item2);
    expect(pool.activeCount).toBe(0);
  });
});
