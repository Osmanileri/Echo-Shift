/**
 * StandardPhysics - Base Form Physics Strategy
 * 
 * Wraps the existing dual-orb swap mechanics for the base player form.
 * This is the default physics when no Construct is active.
 * 
 * Requirements: 2.5 - WHEN the player is in Base Form THEN the Physics System
 * SHALL use standard dual-orb swap mechanics
 */

import type {
    CollisionResult,
    InputState,
    PhysicsStrategy,
    PlayerEntity,
    Rect
} from '../../types';

/**
 * Standard physics configuration
 * Base form has no multipliers - everything is 1.0
 */
export const STANDARD_CONFIG = {
  speedMultiplier: 1.0,
  gravityMultiplier: 1.0,
  hitboxScale: 1.0,
} as const;

/**
 * Creates a StandardPhysics strategy instance
 * 
 * The standard physics wraps the existing dual-orb swap mechanics:
 * - No gravity modification (multiplier = 1.0)
 * - No speed modification (multiplier = 1.0)
 * - All collisions result in DAMAGE
 * 
 * @returns PhysicsStrategy for base form
 */
export function createStandardPhysics(): PhysicsStrategy {
  return {
    type: 'NONE',

    /**
     * Update player physics - Standard form uses existing game loop physics
     * The actual physics (swap, rotation) are handled by GameEngine
     * This is a pass-through that doesn't modify player state
     */
    update(_player: PlayerEntity, _deltaTime: number, _input: InputState): void {
      // Standard physics delegates to GameEngine's existing swap mechanics
      // No additional physics modifications needed for base form
    },

    /**
     * Resolve collision - Standard form always takes damage
     * Requirements: 2.5 - Base form uses standard collision behavior
     * 
     * @param _isFromAbove - Not used for standard physics
     * @returns 'DAMAGE' - Standard form always takes damage on collision
     */
    resolveCollision(_isFromAbove: boolean): CollisionResult {
      return 'DAMAGE';
    },

    /**
     * Get hitbox for collision detection
     * Standard form uses the player's actual dimensions
     * 
     * @param player - The player entity
     * @returns Rect representing the hitbox
     */
    getHitbox(player: PlayerEntity): Rect {
      return {
        x: player.x,
        y: player.y,
        width: player.width * STANDARD_CONFIG.hitboxScale,
        height: player.height * STANDARD_CONFIG.hitboxScale,
      };
    },

    /**
     * Get speed multiplier - Standard form has no speed modification
     * @returns 1.0 - No speed change
     */
    getSpeedMultiplier(): number {
      return STANDARD_CONFIG.speedMultiplier;
    },

    /**
     * Get gravity multiplier - Standard form has no gravity modification
     * @returns 1.0 - No gravity change
     */
    getGravityMultiplier(): number {
      return STANDARD_CONFIG.gravityMultiplier;
    },
  };
}

/**
 * Singleton instance for performance (avoid creating new objects each frame)
 */
let standardPhysicsInstance: PhysicsStrategy | null = null;

/**
 * Get or create the StandardPhysics singleton instance
 * @returns The StandardPhysics strategy instance
 */
export function getStandardPhysics(): PhysicsStrategy {
  if (!standardPhysicsInstance) {
    standardPhysicsInstance = createStandardPhysics();
  }
  return standardPhysicsInstance;
}
