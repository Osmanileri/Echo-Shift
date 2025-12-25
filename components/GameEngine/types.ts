/**
 * GameEngine Local Types
 * 
 * Types specific to the GameEngine component and its sub-modules.
 * For global game types, see ../../types.ts
 */

import type { TrailState } from '../../systems/trailingSoul';

// =============================================================================
// Input State Types
// =============================================================================

/**
 * Input state for construct-specific input handling
 * Used for tracking touch/mouse input for abilities like Blink ghost positioning
 */
export interface InputState {
    isPressed: boolean;
    y: number;
    isTapFrame: boolean;
    isReleaseFrame: boolean;
}

// =============================================================================
// Player State Types
// =============================================================================

/**
 * Player state refs returned by usePlayerState hook
 */
export interface PlayerStateRefs {
    // Position
    playerY: React.MutableRefObject<number>;
    targetPlayerY: React.MutableRefObject<number>;
    prevPlayerY: React.MutableRefObject<number>;
    playerVelocityY: React.MutableRefObject<number>;

    // Connector
    currentConnectorLength: React.MutableRefObject<number>;

    // Swap mechanics
    isSwapped: React.MutableRefObject<boolean>;
    rotationAngle: React.MutableRefObject<number>;
    targetRotation: React.MutableRefObject<number>;
    lastSwapTime: React.MutableRefObject<number>;
    isPhasing: React.MutableRefObject<boolean>;

    // Spirit VFX trails
    whiteOrbTrail: React.MutableRefObject<TrailState>;
    blackOrbTrail: React.MutableRefObject<TrailState>;
}

/**
 * Player state methods returned by usePlayerState hook
 */
export interface PlayerStateMethods {
    resetPlayer: () => void;
}

/**
 * Complete player state hook return type
 */
export interface UsePlayerStateReturn extends PlayerStateRefs, PlayerStateMethods { }

// =============================================================================
// Orb Rendering Types
// =============================================================================

/**
 * Orb data for rendering and collision detection
 */
export interface OrbData {
    x: number;
    y: number;
    radius: number;
    color: string;
}

/**
 * Orb position calculation context
 */
export interface OrbPositionContext {
    playerY: number;
    playerX: number;
    rotationAngle: number;
    connectorLength: number;
    canvasHeight: number;
}

// =============================================================================
// Mobile Control Types
// =============================================================================

/**
 * Joystick control state
 */
export interface JoystickState {
    active: boolean;
    startY: number;
    currentY: number;
}

/**
 * Touch control state for mobile
 */
export interface TouchControlState {
    active: boolean;
    startY: number;
    currentY: number;
    touchId: number | null;
    hasMoved: boolean;
}
