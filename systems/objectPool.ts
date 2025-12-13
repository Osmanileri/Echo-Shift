/**
 * Object Pool System - Performance Optimization
 *
 * Provides reusable object pools for obstacles and shards to minimize
 * garbage collection and improve performance at high game speeds.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Lane } from "../data/patterns";
import type { Obstacle } from "../types";
import type { PlacedShard, ShardMovement } from "./shardPlacement";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Generic Object Pool interface
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export interface ObjectPool<T> {
  items: T[];
  activeCount: number;

  acquire(): T;
  release(item: T): void;
  reset(): void;
  getActive(): T[];
}

/**
 * Pooled obstacle representation
 * Requirements: 6.1
 */
export interface PooledObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lane: Lane;
  polarity: "white" | "black";
  active: boolean;
}

/**
 * Pooled shard representation
 * Requirements: 6.1
 */
export interface PooledShard {
  id: string;
  x: number;
  y: number;
  type: "safe" | "risky";
  value: number;
  active: boolean;
}

/**
 * Engine-facing pooled obstacle (matches `types.ts` Obstacle shape).
 * This keeps the generic pool implementation, while letting GameEngine reuse
 * objects without allocating new obstacles every spawn.
 */
export interface PooledEngineObstacle extends Obstacle {
  active: boolean;
}

/**
 * Engine-facing pooled shard (matches `ShardPlacement.PlacedShard` shape).
 */
export interface PooledEngineShard extends PlacedShard {
  active: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default pool sizes
 */
export const DEFAULT_OBSTACLE_POOL_SIZE = 20;
export const DEFAULT_SHARD_POOL_SIZE = 15;

/**
 * Pool expansion factor when exhausted
 * Requirements: 6.4
 */
export const POOL_EXPANSION_FACTOR = 1.5;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate unique ID for pooled objects
 */
function generatePooledId(prefix: string, index: number): string {
  return `${prefix}-${index}-${Date.now()}`;
}

/**
 * Create a default pooled obstacle
 * Requirements: 6.1
 */
function createDefaultObstacle(index: number): PooledObstacle {
  return {
    id: generatePooledId("obstacle", index),
    x: 0,
    y: 0,
    width: 60,
    height: 80,
    lane: "TOP",
    polarity: "white",
    active: false,
  };
}

/**
 * Create a default pooled shard
 * Requirements: 6.1
 */
function createDefaultShard(index: number): PooledShard {
  return {
    id: generatePooledId("shard", index),
    x: 0,
    y: 0,
    type: "safe",
    value: 1,
    active: false,
  };
}

function createDefaultEngineObstacle(index: number): PooledEngineObstacle {
  return {
    id: generatePooledId("engine-obstacle", index),
    x: 0,
    y: 0,
    targetY: 0,
    width: 60,
    height: 80,
    lane: "top",
    polarity: "white",
    passed: false,
    active: false,
  };
}

function createDefaultEngineShard(index: number): PooledEngineShard {
  const movement: ShardMovement = {
    verticalAmplitude: 0,
    verticalFrequency: 0,
    verticalPhase: 0,
    horizontalAmplitude: 0,
    horizontalFrequency: 0,
    horizontalPhase: 0,
  };

  return {
    id: generatePooledId("engine-shard", index),
    x: 0,
    y: 0,
    baseX: 0,
    baseY: 0,
    lane: "TOP",
    type: "safe",
    value: 1,
    collected: false,
    movement,
    spawnTime: 0,
    active: false,
  };
}

// ============================================================================
// Pool Implementation
// ============================================================================

/**
 * Create an obstacle pool
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * @param initialSize - Initial number of obstacles to pre-allocate
 * @returns ObjectPool for obstacles
 */
export function createObstaclePool(
  initialSize: number = DEFAULT_OBSTACLE_POOL_SIZE
): ObjectPool<PooledObstacle> {
  // Pre-allocate obstacles - Requirements 6.1
  const items: PooledObstacle[] = [];
  for (let i = 0; i < initialSize; i++) {
    items.push(createDefaultObstacle(i));
  }

  let activeCount = 0;

  return {
    items,
    get activeCount() {
      return activeCount;
    },
    set activeCount(value: number) {
      activeCount = value;
    },

    /**
     * Acquire an obstacle from the pool
     * Requirements: 6.3, 6.4
     */
    acquire(): PooledObstacle {
      // Find an inactive obstacle
      const inactive = items.find((item) => !item.active);

      if (inactive) {
        inactive.active = true;
        activeCount++;
        return inactive;
      }

      // Pool exhausted - expand pool - Requirements 6.4
      const currentSize = items.length;
      const expansionCount = Math.ceil(
        currentSize * (POOL_EXPANSION_FACTOR - 1)
      );

      for (let i = 0; i < expansionCount; i++) {
        items.push(createDefaultObstacle(currentSize + i));
      }

      // Return the first newly created obstacle
      const newObstacle = items[currentSize];
      newObstacle.active = true;
      activeCount++;
      return newObstacle;
    },

    /**
     * Release an obstacle back to the pool
     * Requirements: 6.2
     */
    release(item: PooledObstacle): void {
      // Find the item in the pool
      const poolItem = items.find((i) => i.id === item.id);

      if (poolItem && poolItem.active) {
        poolItem.active = false;
        activeCount = Math.max(0, activeCount - 1);
      }
      // Ignore if not in pool (graceful handling)
    },

    /**
     * Reset all obstacles to inactive state
     */
    reset(): void {
      for (const item of items) {
        item.active = false;
      }
      activeCount = 0;
    },

    /**
     * Get all active obstacles
     */
    getActive(): PooledObstacle[] {
      return items.filter((item) => item.active);
    },
  };
}

/**
 * Create a shard pool
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * @param initialSize - Initial number of shards to pre-allocate
 * @returns ObjectPool for shards
 */
export function createShardPool(
  initialSize: number = DEFAULT_SHARD_POOL_SIZE
): ObjectPool<PooledShard> {
  // Pre-allocate shards - Requirements 6.1
  const items: PooledShard[] = [];
  for (let i = 0; i < initialSize; i++) {
    items.push(createDefaultShard(i));
  }

  let activeCount = 0;

  return {
    items,
    get activeCount() {
      return activeCount;
    },
    set activeCount(value: number) {
      activeCount = value;
    },

    /**
     * Acquire a shard from the pool
     * Requirements: 6.3, 6.4
     */
    acquire(): PooledShard {
      // Find an inactive shard
      const inactive = items.find((item) => !item.active);

      if (inactive) {
        inactive.active = true;
        activeCount++;
        return inactive;
      }

      // Pool exhausted - expand pool - Requirements 6.4
      const currentSize = items.length;
      const expansionCount = Math.ceil(
        currentSize * (POOL_EXPANSION_FACTOR - 1)
      );

      for (let i = 0; i < expansionCount; i++) {
        items.push(createDefaultShard(currentSize + i));
      }

      // Return the first newly created shard
      const newShard = items[currentSize];
      newShard.active = true;
      activeCount++;
      return newShard;
    },

    /**
     * Release a shard back to the pool
     * Requirements: 6.2, 6.5
     */
    release(item: PooledShard): void {
      // Find the item in the pool
      const poolItem = items.find((i) => i.id === item.id);

      if (poolItem && poolItem.active) {
        poolItem.active = false;
        activeCount = Math.max(0, activeCount - 1);
      }
      // Ignore if not in pool (graceful handling)
    },

    /**
     * Reset all shards to inactive state
     */
    reset(): void {
      for (const item of items) {
        item.active = false;
      }
      activeCount = 0;
    },

    /**
     * Get all active shards
     */
    getActive(): PooledShard[] {
      return items.filter((item) => item.active);
    },
  };
}

/**
 * Create an engine obstacle pool (Obstacle-compatible objects).
 */
export function createEngineObstaclePool(
  initialSize: number = DEFAULT_OBSTACLE_POOL_SIZE
): ObjectPool<PooledEngineObstacle> {
  const items: PooledEngineObstacle[] = [];
  for (let i = 0; i < initialSize; i++) {
    items.push(createDefaultEngineObstacle(i));
  }

  let activeCount = 0;

  return {
    items,
    get activeCount() {
      return activeCount;
    },
    set activeCount(value: number) {
      activeCount = value;
    },
    acquire(): PooledEngineObstacle {
      const inactive = items.find((item) => !item.active);

      if (inactive) {
        inactive.active = true;
        activeCount++;
        return inactive;
      }

      const currentSize = items.length;
      const expansionCount = Math.ceil(
        currentSize * (POOL_EXPANSION_FACTOR - 1)
      );

      for (let i = 0; i < expansionCount; i++) {
        items.push(createDefaultEngineObstacle(currentSize + i));
      }

      const newObstacle = items[currentSize];
      newObstacle.active = true;
      activeCount++;
      return newObstacle;
    },
    release(item: PooledEngineObstacle): void {
      const poolItem = items.find((i) => i.id === item.id);
      if (poolItem && poolItem.active) {
        poolItem.active = false;
        activeCount = Math.max(0, activeCount - 1);
      }
    },
    reset(): void {
      for (const item of items) {
        item.active = false;
      }
      activeCount = 0;
    },
    getActive(): PooledEngineObstacle[] {
      return items.filter((item) => item.active);
    },
  };
}

/**
 * Create an engine shard pool (PlacedShard-compatible objects).
 */
export function createEngineShardPool(
  initialSize: number = DEFAULT_SHARD_POOL_SIZE
): ObjectPool<PooledEngineShard> {
  const items: PooledEngineShard[] = [];
  for (let i = 0; i < initialSize; i++) {
    items.push(createDefaultEngineShard(i));
  }

  let activeCount = 0;

  return {
    items,
    get activeCount() {
      return activeCount;
    },
    set activeCount(value: number) {
      activeCount = value;
    },
    acquire(): PooledEngineShard {
      const inactive = items.find((item) => !item.active);

      if (inactive) {
        inactive.active = true;
        activeCount++;
        return inactive;
      }

      const currentSize = items.length;
      const expansionCount = Math.ceil(
        currentSize * (POOL_EXPANSION_FACTOR - 1)
      );

      for (let i = 0; i < expansionCount; i++) {
        items.push(createDefaultEngineShard(currentSize + i));
      }

      const newShard = items[currentSize];
      newShard.active = true;
      activeCount++;
      return newShard;
    },
    release(item: PooledEngineShard): void {
      const poolItem = items.find((i) => i.id === item.id);
      if (poolItem && poolItem.active) {
        poolItem.active = false;
        activeCount = Math.max(0, activeCount - 1);
      }
    },
    reset(): void {
      for (const item of items) {
        item.active = false;
      }
      activeCount = 0;
    },
    getActive(): PooledEngineShard[] {
      return items.filter((item) => item.active);
    },
  };
}

/**
 * Configure a pooled obstacle with specific values
 *
 * @param obstacle - Obstacle to configure
 * @param config - Configuration values
 * @returns Configured obstacle
 */
export function configureObstacle(
  obstacle: PooledObstacle,
  config: Partial<Omit<PooledObstacle, "id" | "active">>
): PooledObstacle {
  if (config.x !== undefined) obstacle.x = config.x;
  if (config.y !== undefined) obstacle.y = config.y;
  if (config.width !== undefined) obstacle.width = config.width;
  if (config.height !== undefined) obstacle.height = config.height;
  if (config.lane !== undefined) obstacle.lane = config.lane;
  if (config.polarity !== undefined) obstacle.polarity = config.polarity;
  return obstacle;
}

/**
 * Configure a pooled shard with specific values
 *
 * @param shard - Shard to configure
 * @param config - Configuration values
 * @returns Configured shard
 */
export function configureShard(
  shard: PooledShard,
  config: Partial<Omit<PooledShard, "id" | "active">>
): PooledShard {
  if (config.x !== undefined) shard.x = config.x;
  if (config.y !== undefined) shard.y = config.y;
  if (config.type !== undefined) shard.type = config.type;
  if (config.value !== undefined) shard.value = config.value;
  return shard;
}

/**
 * Get pool statistics
 *
 * @param pool - Pool to get stats for
 * @returns Pool statistics
 */
export function getPoolStats<T extends { active: boolean }>(
  pool: ObjectPool<T>
): { total: number; active: number; available: number } {
  const total = pool.items.length;
  const active = pool.activeCount;
  const available = total - active;

  return { total, active, available };
}
