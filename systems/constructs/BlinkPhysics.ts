/**
 * BlinkPhysics - Blink Node Construct Physics Strategy
 * 
 * Holographic node construct that freezes vertical movement and allows teleportation.
 * Player drags to position a ghost, then releases to teleport to that position.
 * 
 * Requirements:
 * - 5.1: WHILE Blink Node is active THEN the Physics System SHALL freeze vertical movement (static Y position)
 * - 5.2: WHEN the player touches and drags while Blink Node is active THEN the Input System SHALL display a Teleport Ghost at drag position
 * - 5.3: WHEN the player releases touch while Blink Node is active THEN the Teleport System SHALL instantly move player to Ghost position
 * - 5.4: WHEN teleporting THEN the Collision System SHALL ignore obstacles during the teleport frame
 * - 5.5: WHEN Blink Node collides with an obstacle (non-teleport) THEN the Collision System SHALL trigger Second Chance
 */

import type {
    CollisionResult,
    InputState,
    PhysicsStrategy,
    PlayerEntity,
    Rect
} from '../../types';

/**
 * Blink physics configuration
 * Requirements 5.1, 5.2, 5.3, 5.4: Teleport mechanics
 */
export const BLINK_CONFIG = {
  teleportCooldown: 200,     // Requirements: Cooldown between teleports (ms)
  ghostOpacity: 0.5,         // Requirements 5.2: Ghost visual opacity
  speedMultiplier: 1.0,      // Blink doesn't modify speed
  gravityMultiplier: 0,      // Requirements 5.1: No gravity (static Y)
  hitboxScale: 1.0,          // Standard hitbox
} as const;

/**
 * Internal state for Blink physics
 * Tracks ghost position, dragging state, and teleport timing
 */
export interface BlinkState {
  ghostY: number;              // Y position of teleport ghost
  isDragging: boolean;         // Is player currently dragging
  lastTeleportTime: number;    // Timestamp of last teleport (for cooldown)
  isTeleporting: boolean;      // Is currently in teleport frame (for collision ignore)
}

/**
 * Creates a BlinkPhysics strategy instance
 * 
 * Blink Node features:
 * - Static Y position (no vertical movement, velocity = 0)
 * - Ghost projection at touch Y position during drag
 * - Instant teleport to ghost position on release
 * - Collision ignored during teleport frame
 * - Takes damage on non-teleport collisions (triggers Second Chance)
 * 
 * @param initialY - Initial Y position for the player
 * @returns PhysicsStrategy for Blink Node construct
 */
export function createBlinkPhysics(initialY: number = 250): PhysicsStrategy {
  const state: BlinkState = {
    ghostY: initialY,
    isDragging: false,
    lastTeleportTime: 0,
    isTeleporting: false,
  };

  return {
    type: 'BLINK',

    /**
     * Update player physics with Blink-specific rules
     * Requirements 5.1: Freeze vertical movement (velocity = 0)
     * Requirements 5.2: Update ghost position from InputState.y
     * Requirements 5.3: Teleport on release
     * 
     * @param player - The player entity to update
     * @param _deltaTime - Time since last frame (not used for Blink)
     * @param input - Current input state
     */
    update(player: PlayerEntity, _deltaTime: number, input: InputState): void {
      const currentTime = Date.now();
      
      // Clear teleporting flag from previous frame
      state.isTeleporting = false;

      // Requirements 5.1: Freeze vertical movement
      player.velocity = 0;

      // Requirements 5.2: Track ghost position during drag
      if (input.isPressed) {
        state.isDragging = true;
        state.ghostY = input.y;
      }

      // Requirements 5.3: Teleport on release
      if (input.isReleaseFrame && state.isDragging) {
        const timeSinceLastTeleport = currentTime - state.lastTeleportTime;
        
        // Check cooldown
        if (timeSinceLastTeleport >= BLINK_CONFIG.teleportCooldown) {
          // Perform teleport
          player.y = state.ghostY;
          state.lastTeleportTime = currentTime;
          state.isTeleporting = true;
        }
        
        state.isDragging = false;
      }
    },

    /**
     * Resolve collision based on Blink-specific rules
     * Requirements 5.4: Ignore collisions during teleport frame
     * Requirements 5.5: Non-teleport collisions trigger Second Chance (DAMAGE)
     * 
     * @param _isFromAbove - Not used for Blink physics
     * @returns CollisionResult - IGNORE if teleporting, DAMAGE otherwise
     */
    resolveCollision(_isFromAbove: boolean): CollisionResult {
      // Requirements 5.4: Ignore obstacles during teleport frame
      if (state.isTeleporting) {
        return 'IGNORE';
      }
      // Requirements 5.5: Non-teleport collisions trigger Second Chance
      return 'DAMAGE';
    },

    /**
     * Get hitbox for collision detection
     * Blink uses standard hitbox
     * 
     * @param player - The player entity
     * @returns Rect representing the hitbox
     */
    getHitbox(player: PlayerEntity): Rect {
      return {
        x: player.x,
        y: player.y,
        width: player.width * BLINK_CONFIG.hitboxScale,
        height: player.height * BLINK_CONFIG.hitboxScale,
      };
    },

    /**
     * Get speed multiplier - Blink has no speed modification
     * @returns 1.0 - No speed change
     */
    getSpeedMultiplier(): number {
      return BLINK_CONFIG.speedMultiplier;
    },

    /**
     * Get gravity multiplier - Blink has no gravity
     * Requirements 5.1: Static Y position (no gravity)
     * @returns 0 - No gravity
     */
    getGravityMultiplier(): number {
      return BLINK_CONFIG.gravityMultiplier;
    },
  };
}


/**
 * Extended PhysicsStrategy interface with Blink-specific methods
 */
export interface BlinkPhysicsStrategy extends PhysicsStrategy {
  getState(): BlinkState;
  resetState(initialY?: number): void;
  setTeleporting(isTeleporting: boolean): void;
}

/**
 * Creates a BlinkPhysics strategy with extended state access
 * Useful for testing and debugging
 * 
 * @param initialY - Initial Y position for the player
 * @returns BlinkPhysicsStrategy with state access methods
 */
export function createBlinkPhysicsWithState(initialY: number = 250): BlinkPhysicsStrategy {
  const state: BlinkState = {
    ghostY: initialY,
    isDragging: false,
    lastTeleportTime: 0,
    isTeleporting: false,
  };

  return {
    type: 'BLINK',

    update(player: PlayerEntity, _deltaTime: number, input: InputState): void {
      const currentTime = Date.now();
      
      // Clear teleporting flag from previous frame
      state.isTeleporting = false;

      // Requirements 5.1: Freeze vertical movement
      player.velocity = 0;

      // Requirements 5.2: Track ghost position during drag
      if (input.isPressed) {
        state.isDragging = true;
        state.ghostY = input.y;
      }

      // Requirements 5.3: Teleport on release
      if (input.isReleaseFrame && state.isDragging) {
        const timeSinceLastTeleport = currentTime - state.lastTeleportTime;
        
        // Check cooldown
        if (timeSinceLastTeleport >= BLINK_CONFIG.teleportCooldown) {
          // Perform teleport
          player.y = state.ghostY;
          state.lastTeleportTime = currentTime;
          state.isTeleporting = true;
        }
        
        state.isDragging = false;
      }
    },

    resolveCollision(_isFromAbove: boolean): CollisionResult {
      if (state.isTeleporting) {
        return 'IGNORE';
      }
      return 'DAMAGE';
    },

    getHitbox(player: PlayerEntity): Rect {
      return {
        x: player.x,
        y: player.y,
        width: player.width * BLINK_CONFIG.hitboxScale,
        height: player.height * BLINK_CONFIG.hitboxScale,
      };
    },

    getSpeedMultiplier(): number {
      return BLINK_CONFIG.speedMultiplier;
    },

    getGravityMultiplier(): number {
      return BLINK_CONFIG.gravityMultiplier;
    },

    // Extended methods for state access
    getState(): BlinkState {
      return { ...state };
    },

    resetState(initialY: number = 250): void {
      state.ghostY = initialY;
      state.isDragging = false;
      state.lastTeleportTime = 0;
      state.isTeleporting = false;
    },

    setTeleporting(isTeleporting: boolean): void {
      state.isTeleporting = isTeleporting;
    },
  };
}

/**
 * Singleton instance for performance
 */
let blinkPhysicsInstance: BlinkPhysicsStrategy | null = null;

/**
 * Get or create the BlinkPhysics singleton instance
 * @param initialY - Optional initial Y position (only used on first call)
 * @returns The BlinkPhysics strategy instance
 */
export function getBlinkPhysics(initialY?: number): BlinkPhysicsStrategy {
  if (!blinkPhysicsInstance) {
    blinkPhysicsInstance = createBlinkPhysicsWithState(initialY);
  }
  return blinkPhysicsInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetBlinkPhysics(): void {
  blinkPhysicsInstance = null;
}
