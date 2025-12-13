/**
 * PhasePhysics - Phase Cycle Construct Physics Strategy
 * 
 * Light-cycle construct that locks to floor/ceiling and can flip gravity.
 * Features 1.2x speed multiplier and smooth gravity transitions.
 * 
 * Requirements:
 * - 4.1: WHILE Phase Cycle is active THEN the Physics System SHALL lock the player to either floor or ceiling
 * - 4.2: WHEN the player taps while Phase Cycle is active THEN the Input System SHALL flip gravity direction
 * - 4.3: WHEN gravity flips THEN the Physics System SHALL smoothly transition player position over 200ms
 * - 4.4: WHEN Phase Cycle collides with any obstacle THEN the Collision System SHALL trigger Second Chance
 * - 4.6: WHILE Phase Cycle is active THEN the Speed System SHALL apply 1.2x speed multiplier
 */

import type {
    CollisionResult,
    InputState,
    PhysicsStrategy,
    PlayerEntity,
    Rect
} from '../../types';

/**
 * Phase physics configuration
 * Requirements 4.3, 4.6: Speed multiplier and transition duration
 */
export const PHASE_CONFIG = {
  speedMultiplier: 1.2,        // Requirements 4.6: 1.2x speed
  gravityMultiplier: 0,        // Phase doesn't use gravity (locked to floor/ceiling)
  transitionDuration: 200,     // Requirements 4.3: 200ms smooth transition
  hitboxScale: 1.0,            // Standard hitbox
  floorY: 0,                   // Will be set based on canvas height
  ceilingY: 0,                 // Will be set based on canvas height
} as const;

/**
 * Internal state for Phase physics
 * Tracks gravity direction and transition state
 */
export interface PhaseState {
  gravityDirection: 1 | -1;      // 1 = floor (down), -1 = ceiling (up)
  isTransitioning: boolean;      // Currently transitioning between floor/ceiling
  transitionStartTime: number;   // When transition started (ms)
  transitionStartY: number;      // Y position when transition started
  transitionTargetY: number;     // Target Y position
}

/**
 * Default bounds for floor/ceiling positions
 * These should be configured based on actual canvas dimensions
 */
export interface PhaseBounds {
  floorY: number;    // Bottom position (e.g., canvasHeight - playerHeight)
  ceilingY: number;  // Top position (e.g., 0)
}

const DEFAULT_BOUNDS: PhaseBounds = {
  floorY: 500,   // Default floor position
  ceilingY: 50,  // Default ceiling position
};

/**
 * Creates a PhasePhysics strategy instance
 * 
 * Phase Cycle features:
 * - Locks player to floor or ceiling (no free vertical movement)
 * - Gravity flip on tap (smooth 200ms transition)
 * - 1.2x speed multiplier
 * - All collisions result in DAMAGE (triggers Second Chance)
 * 
 * @param bounds - Optional floor/ceiling bounds configuration
 * @returns PhysicsStrategy for Phase Cycle construct
 */
export function createPhasePhysics(bounds: PhaseBounds = DEFAULT_BOUNDS): PhysicsStrategy {
  const state: PhaseState = {
    gravityDirection: 1,           // Start on floor
    isTransitioning: false,
    transitionStartTime: 0,
    transitionStartY: bounds.floorY,
    transitionTargetY: bounds.floorY,
  };

  // Store bounds for position calculations
  const phaseBounds = { ...bounds };

  /**
   * Get the target Y position based on gravity direction
   */
  function getTargetY(): number {
    return state.gravityDirection === 1 ? phaseBounds.floorY : phaseBounds.ceilingY;
  }

  /**
   * Ease-out cubic function for smooth transitions
   */
  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  return {
    type: 'PHASE',

    /**
     * Update player physics with Phase-specific rules
     * Requirements 4.1: Lock to floor/ceiling
     * Requirements 4.2: Flip gravity on tap
     * Requirements 4.3: Smooth 200ms transition
     * 
     * @param player - The player entity to update
     * @param deltaTime - Time since last frame in milliseconds
     * @param input - Current input state
     */
    update(player: PlayerEntity, deltaTime: number, input: InputState): void {
      const currentTime = Date.now();

      // Requirements 4.2: On tap, flip gravity direction
      if (input.isTapFrame && !state.isTransitioning) {
        state.gravityDirection *= -1;
        state.isTransitioning = true;
        state.transitionStartTime = currentTime;
        state.transitionStartY = player.y;
        state.transitionTargetY = getTargetY();
      }

      // Requirements 4.3: Handle smooth transition
      if (state.isTransitioning) {
        const elapsed = currentTime - state.transitionStartTime;
        const progress = Math.min(elapsed / PHASE_CONFIG.transitionDuration, 1);
        const easedProgress = easeOutCubic(progress);

        // Interpolate position
        player.y = state.transitionStartY + 
          (state.transitionTargetY - state.transitionStartY) * easedProgress;

        // Transition complete
        if (progress >= 1) {
          state.isTransitioning = false;
          player.y = state.transitionTargetY;
        }
      } else {
        // Requirements 4.1: Lock to floor or ceiling when not transitioning
        player.y = getTargetY();
      }

      // Phase doesn't use velocity-based movement
      player.velocity = 0;
    },

    /**
     * Resolve collision - Phase always takes damage
     * Requirements 4.4: All collisions trigger Second Chance
     * 
     * @param _isFromAbove - Not used for Phase physics
     * @returns 'DAMAGE' - Phase always takes damage on collision
     */
    resolveCollision(_isFromAbove: boolean): CollisionResult {
      return 'DAMAGE';
    },

    /**
     * Get hitbox for collision detection
     * Phase uses standard hitbox
     * 
     * @param player - The player entity
     * @returns Rect representing the hitbox
     */
    getHitbox(player: PlayerEntity): Rect {
      return {
        x: player.x,
        y: player.y,
        width: player.width * PHASE_CONFIG.hitboxScale,
        height: player.height * PHASE_CONFIG.hitboxScale,
      };
    },

    /**
     * Get speed multiplier - Phase has 1.2x speed
     * Requirements 4.6: 1.2x speed multiplier
     * @returns 1.2 - Faster movement
     */
    getSpeedMultiplier(): number {
      return PHASE_CONFIG.speedMultiplier;
    },

    /**
     * Get gravity multiplier - Phase doesn't use gravity
     * Position is controlled by floor/ceiling lock
     * @returns 0 - No gravity (position locked)
     */
    getGravityMultiplier(): number {
      return PHASE_CONFIG.gravityMultiplier;
    },
  };
}

/**
 * Extended PhysicsStrategy interface with Phase-specific methods
 */
export interface PhasePhysicsStrategy extends PhysicsStrategy {
  getState(): PhaseState;
  setBounds(bounds: PhaseBounds): void;
  resetState(): void;
}

/**
 * Creates a PhasePhysics strategy with extended state access
 * Useful for testing and debugging
 * 
 * @param bounds - Optional floor/ceiling bounds configuration
 * @returns PhasePhysicsStrategy with state access methods
 */
export function createPhasePhysicsWithState(bounds: PhaseBounds = DEFAULT_BOUNDS): PhasePhysicsStrategy {
  const state: PhaseState = {
    gravityDirection: 1,
    isTransitioning: false,
    transitionStartTime: 0,
    transitionStartY: bounds.floorY,
    transitionTargetY: bounds.floorY,
  };

  const phaseBounds = { ...bounds };

  function getTargetY(): number {
    return state.gravityDirection === 1 ? phaseBounds.floorY : phaseBounds.ceilingY;
  }

  function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  return {
    type: 'PHASE',

    update(player: PlayerEntity, _deltaTime: number, input: InputState): void {
      const currentTime = Date.now();

      if (input.isTapFrame && !state.isTransitioning) {
        state.gravityDirection *= -1;
        state.isTransitioning = true;
        state.transitionStartTime = currentTime;
        state.transitionStartY = player.y;
        state.transitionTargetY = getTargetY();
      }

      if (state.isTransitioning) {
        const elapsed = currentTime - state.transitionStartTime;
        const progress = Math.min(elapsed / PHASE_CONFIG.transitionDuration, 1);
        const easedProgress = easeOutCubic(progress);

        player.y = state.transitionStartY + 
          (state.transitionTargetY - state.transitionStartY) * easedProgress;

        if (progress >= 1) {
          state.isTransitioning = false;
          player.y = state.transitionTargetY;
        }
      } else {
        player.y = getTargetY();
      }

      player.velocity = 0;
    },

    resolveCollision(_isFromAbove: boolean): CollisionResult {
      return 'DAMAGE';
    },

    getHitbox(player: PlayerEntity): Rect {
      return {
        x: player.x,
        y: player.y,
        width: player.width * PHASE_CONFIG.hitboxScale,
        height: player.height * PHASE_CONFIG.hitboxScale,
      };
    },

    getSpeedMultiplier(): number {
      return PHASE_CONFIG.speedMultiplier;
    },

    getGravityMultiplier(): number {
      return PHASE_CONFIG.gravityMultiplier;
    },

    // Extended methods for state access
    getState(): PhaseState {
      return { ...state };
    },

    setBounds(newBounds: PhaseBounds): void {
      phaseBounds.floorY = newBounds.floorY;
      phaseBounds.ceilingY = newBounds.ceilingY;
    },

    resetState(): void {
      state.gravityDirection = 1;
      state.isTransitioning = false;
      state.transitionStartTime = 0;
      state.transitionStartY = phaseBounds.floorY;
      state.transitionTargetY = phaseBounds.floorY;
    },
  };
}

/**
 * Singleton instance for performance
 */
let phasePhysicsInstance: PhasePhysicsStrategy | null = null;

/**
 * Get or create the PhasePhysics singleton instance
 * @param bounds - Optional bounds configuration (only used on first call)
 * @returns The PhasePhysics strategy instance
 */
export function getPhasePhysics(bounds?: PhaseBounds): PhasePhysicsStrategy {
  if (!phasePhysicsInstance) {
    phasePhysicsInstance = createPhasePhysicsWithState(bounds);
  }
  return phasePhysicsInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetPhasePhysics(): void {
  phasePhysicsInstance = null;
}
