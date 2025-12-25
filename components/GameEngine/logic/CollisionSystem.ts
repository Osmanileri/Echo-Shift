/**
 * CollisionSystem
 * 
 * Handles all collision detection:
 * - Orb vs Obstacle collision
 * - Orb vs Shard collection
 * - Near miss detection
 * - Midline collision
 * 
 * This module extracts ~200 lines of collision code from GameEngine loop.
 * 
 * @module logic/CollisionSystem
 */

import type { PlacedShard } from '../../../systems/shardPlacement';
import type { Obstacle } from '../../../types';
import { checkCollision as gameMathCheckCollision } from '../../../utils/gameMath';

// =============================================================================
// Types
// =============================================================================

export interface OrbData {
    x: number;
    y: number;
    radius: number;
}

export interface CollisionContext {
    whiteOrb: OrbData;
    blackOrb: OrbData;
    obstacles: Obstacle[];
    shards: PlacedShard[];
    midlineY: number;
    isPhasing: boolean;
    shieldActive: boolean;
}

export interface CollisionResult {
    obstacleHit: Obstacle | null;
    shardCollected: PlacedShard | null;
    nearMissObstacles: NearMissData[];
    midlineCollision: boolean;
    orbHitType: 'white' | 'black' | null;
}

export interface NearMissData {
    obstacle: Obstacle;
    orb: 'white' | 'black';
    distance: number;
}

// =============================================================================
// Collision Detection Functions
// =============================================================================

/**
 * Check if an orb collides with an obstacle
 */
export function checkOrbObstacleCollision(
    orb: OrbData,
    obstacle: Obstacle
): boolean {
    return gameMathCheckCollision(
        { x: orb.x, y: orb.y },
        orb.radius,
        obstacle
    );
}

/**
 * Check for near miss (close call without collision)
 */
export function checkOrbNearMiss(
    orb: OrbData,
    obstacle: Obstacle,
    nearMissThreshold: number = 20
): { isNearMiss: boolean; distance: number } {
    // Calculate closest point on obstacle to orb center
    const closestX = Math.max(obstacle.x, Math.min(orb.x, obstacle.x + obstacle.width));
    const closestY = Math.max(obstacle.y, Math.min(orb.y, obstacle.y + obstacle.height));

    // Calculate distance
    const dx = orb.x - closestX;
    const dy = orb.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Near miss if close but not colliding
    const gap = distance - orb.radius;
    const isNearMiss = gap > 0 && gap < nearMissThreshold;

    return { isNearMiss, distance: gap };
}

/**
 * Check if orb collides with a shard (collection)
 */
export function checkShardCollection(
    orb: OrbData,
    shard: PlacedShard
): boolean {
    if (shard.collected) return false;

    const dx = orb.x - shard.x;
    const dy = orb.y - shard.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Collection radius slightly larger than orb
    const collectionRadius = orb.radius + 10;

    return distance < collectionRadius;
}

/**
 * Check if orb touches the midline
 */
export function checkMidlineCollision(
    orb: OrbData,
    midlineY: number,
    tolerance: number = 0
): boolean {
    const orbTop = orb.y - orb.radius;
    const orbBottom = orb.y + orb.radius;

    return orbTop - tolerance <= midlineY && orbBottom + tolerance >= midlineY;
}

/**
 * Check if orb is in the wrong zone (white orb below midline or black orb above)
 */
export function checkZoneViolation(
    orb: OrbData,
    isWhiteOrb: boolean,
    midlineY: number,
    isSwapped: boolean
): boolean {
    // When not swapped: white orb should be above midline, black below
    // When swapped: white orb should be below midline, black above
    const shouldBeAbove = isSwapped ? !isWhiteOrb : isWhiteOrb;

    if (shouldBeAbove) {
        return orb.y + orb.radius > midlineY; // White orb going below midline
    } else {
        return orb.y - orb.radius < midlineY; // Black orb going above midline
    }
}

// =============================================================================
// Main Collision Check Function
// =============================================================================

/**
 * Check all collisions in one pass
 * 
 * @param context - Collision context with all game entities
 * @returns Collision results
 */
export function checkAllCollisions(context: CollisionContext): CollisionResult {
    const result: CollisionResult = {
        obstacleHit: null,
        shardCollected: null,
        nearMissObstacles: [],
        midlineCollision: false,
        orbHitType: null,
    };

    const { whiteOrb, blackOrb, obstacles, shards, midlineY, isPhasing, shieldActive } = context;

    // Skip collision checks during phasing (swap animation)
    if (isPhasing) {
        return result;
    }

    // Check obstacle collisions
    for (const obstacle of obstacles) {
        // Check white orb
        if (!result.obstacleHit && checkOrbObstacleCollision(whiteOrb, obstacle)) {
            if (!shieldActive) {
                result.obstacleHit = obstacle;
                result.orbHitType = 'white';
            }
            continue;
        }

        // Check black orb
        if (!result.obstacleHit && checkOrbObstacleCollision(blackOrb, obstacle)) {
            if (!shieldActive) {
                result.obstacleHit = obstacle;
                result.orbHitType = 'black';
            }
            continue;
        }

        // Check near misses (only if no collision)
        if (!result.obstacleHit) {
            const whiteNearMiss = checkOrbNearMiss(whiteOrb, obstacle);
            if (whiteNearMiss.isNearMiss) {
                result.nearMissObstacles.push({
                    obstacle,
                    orb: 'white',
                    distance: whiteNearMiss.distance,
                });
            }

            const blackNearMiss = checkOrbNearMiss(blackOrb, obstacle);
            if (blackNearMiss.isNearMiss) {
                result.nearMissObstacles.push({
                    obstacle,
                    orb: 'black',
                    distance: blackNearMiss.distance,
                });
            }
        }
    }

    // Check shard collection
    for (const shard of shards) {
        if (checkShardCollection(whiteOrb, shard) || checkShardCollection(blackOrb, shard)) {
            result.shardCollected = shard;
            break;
        }
    }

    // Check midline collision (for Flux Overload, Quantum Lock, etc.)
    result.midlineCollision =
        checkMidlineCollision(whiteOrb, midlineY) ||
        checkMidlineCollision(blackOrb, midlineY);

    return result;
}

/**
 * Filter out collided obstacles from array
 */
export function removeCollidedObstacle(
    obstacles: Obstacle[],
    collidedObstacle: Obstacle
): Obstacle[] {
    return obstacles.filter(obs => obs !== collidedObstacle);
}

/**
 * Mark shard as collected
 */
export function markShardCollected(shard: PlacedShard): PlacedShard {
    return { ...shard, collected: true };
}
