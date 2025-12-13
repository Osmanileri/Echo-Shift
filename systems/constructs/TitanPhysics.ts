/**
 * TitanPhysics - Titan Resonance Construct Physics Strategy
 * 
 * Heavy mech-like construct with 2.5x gravity and stomp ability.
 * Can destroy obstacles when stomping from above.
 * 
 * Requirements:
 * - 3.1: WHILE Titan Resonance is active THEN the Physics System SHALL apply 2.5x gravity multiplier
 * - 3.2: WHEN the player taps while Titan is active THEN the Input System SHALL trigger a downward Stomp
 * - 3.3: WHEN Titan stomps on an obstacle THEN the Collision System SHALL destroy the obstacle
 * - 3.4: WHEN Titan collides with an obstacle from the side THEN the Collision System SHALL trigger Second Chance
 */

import type {
    CollisionResult,
    InputState,
    PhysicsStrategy,
    PlayerEntity,
    Rect
} from '../../types';

/**
 * Titan physics configuration
 * Requirements 3.1, 3.2: Heavy gravity and stomp mechanics
 */
export const TITAN_CONFIG = {
  gravityMultiplier: 2.5,    // Requirements 3.1: 2.5x gravity
  stompVelocity: 25,         // Requirements 3.2: Instant max fall velocity on tap
  speedMultiplier: 1.0,      // Titan doesn't modify speed
  hitboxScale: 1.2,          // Slightly larger hitbox for mech form
} as const;

/**
 * Internal state for Titan physics
 * Tracks whether the player is currently in a stomp
 */
interface TitanState {
  isStomping: boolean;
}

/**
 * Creates a TitanPhysics strategy instance
 * 
 * Titan Resonance features:
 * - 2.5x gravity multiplier (heavy, falls faster)
 * - Stomp ability on tap (instant max fall velocity)
 * - Destroys obstacles when colliding from above (stomp)
 * - Takes damage on side collisions (triggers Second Chance)
 * 
 * @returns PhysicsStrategy for Titan Resonance construct
 */
export function createTitanPhysics(): PhysicsStrategy {
  const state: TitanState = {
    isStomping: false,
  };

  return {
    type: 'TITAN',

    /**
     * Update player physics with Titan-specific rules
     * Requirements 3.1: Apply 2.5x gravity
     * Requirements 3.2: Trigger stomp on tap
     * 
     * @param player - The player entity to update
     * @param _deltaTime - Time since last frame (not used directly, gravity applied by game engine)
     * @param input - Current input state
     */
    update(player: PlayerEntity, _deltaTime: number, input: InputState): void {
      // Requirements 3.2: On tap, trigger stomp (instant max fall velocity)
      if (input.isTapFrame) {
        player.velocity = TITAN_CONFIG.stompVelocity;
        state.isStomping = true;
      }
      
      // Reset stomp state when player lands or velocity changes direction
      if (player.velocity <= 0) {
        state.isStomping = false;
      }
    },

    /**
     * Resolve collision based on Titan-specific rules
     * Requirements 3.3: Stomp from above destroys obstacles
     * Requirements 3.4: Side collisions trigger Second Chance (DAMAGE)
     * 
     * @param isFromAbove - Whether collision is from above (stomp)
     * @returns CollisionResult - DESTROY if stomping from above, DAMAGE otherwise
     */
    resolveCollision(isFromAbove: boolean): CollisionResult {
      // Requirements 3.3: Stomp destroys obstacles when hitting from above
      if (isFromAbove) {
        return 'DESTROY';
      }
      // Requirements 3.4: Side collisions trigger Second Chance
      return 'DAMAGE';
    },

    /**
     * Get hitbox for collision detection
     * Titan has a slightly larger hitbox (1.2x scale)
     * 
     * @param player - The player entity
     * @returns Rect representing the hitbox
     */
    getHitbox(player: PlayerEntity): Rect {
      return {
        x: player.x,
        y: player.y,
        width: player.width * TITAN_CONFIG.hitboxScale,
        height: player.height * TITAN_CONFIG.hitboxScale,
      };
    },

    /**
     * Get speed multiplier - Titan has no speed modification
     * @returns 1.0 - No speed change
     */
    getSpeedMultiplier(): number {
      return TITAN_CONFIG.speedMultiplier;
    },

    /**
     * Get gravity multiplier - Titan has 2.5x gravity
     * Requirements 3.1: Heavy gravity for mech-like feel
     * @returns 2.5 - Heavy gravity
     */
    getGravityMultiplier(): number {
      return TITAN_CONFIG.gravityMultiplier;
    },
  };
}

/**
 * Singleton instance for performance (avoid creating new objects each frame)
 */
let titanPhysicsInstance: PhysicsStrategy | null = null;

/**
 * Get or create the TitanPhysics singleton instance
 * @returns The TitanPhysics strategy instance
 */
export function getTitanPhysics(): PhysicsStrategy {
  if (!titanPhysicsInstance) {
    titanPhysicsInstance = createTitanPhysics();
  }
  return titanPhysicsInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetTitanPhysics(): void {
  titanPhysicsInstance = null;
}
