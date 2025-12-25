/**
 * Logic Layer Index
 * 
 * Central export for all GameEngine logic modules.
 * 
 * @example
 * ```tsx
 * import { updatePhysics, checkAllCollisions } from './logic';
 * ```
 */

// Physics System
export {
    calculateConnectorLength,
    calculateOrbPositions, calculateVelocity,
    clampPosition, DEFAULT_PHYSICS_CONFIG, interpolatePosition,
    interpolateRotation, updatePhysics
} from './PhysicsSystem';

export type {
    PhysicsBounds,
    PhysicsConfig, PlayerPhysicsState
} from './PhysicsSystem';

// Collision System
export {
    checkAllCollisions, checkMidlineCollision, checkOrbNearMiss, checkOrbObstacleCollision, checkShardCollection, checkZoneViolation, markShardCollected, removeCollidedObstacle
} from './CollisionSystem';

export type {
    CollisionContext,
    CollisionResult,
    NearMissData, OrbData
} from './CollisionSystem';

// Progression System
export {
    calculateBaseSpeed,
    calculateCurrentSpeed, calculateDifficultyMultiplier,
    calculateSpeedIntensity, checkDistanceMilestone, updateDistance
} from './ProgressionSystem';

export type {
    ProgressionState,
    SpeedMultipliers
} from './ProgressionSystem';

