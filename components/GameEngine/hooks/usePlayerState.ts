/**
 * usePlayerState Hook
 * 
 * Manages all player-related state:
 * - Position (Y coordinate, velocity)
 * - Connector length
 * - Swap mechanics (isSwapped, rotation, phasing)
 * - Spirit VFX trails
 * 
 * This hook extracts ~50 lines of useRef declarations and related
 * reset logic from the main GameEngine component.
 * 
 * @module hooks/usePlayerState
 */

import { useCallback, useRef } from 'react';
import { INITIAL_CONFIG } from '../../../constants';
import * as TrailingSoul from '../../../systems/trailingSoul';
import type { UsePlayerStateReturn } from '../types';

/**
 * Hook that manages all player-related mutable state
 * 
 * @returns Player state refs and control methods
 * 
 * @example
 * ```tsx
 * const player = usePlayerState();
 * 
 * // Access current position
 * const currentY = player.playerY.current;
 * 
 * // Reset player to initial state
 * player.resetPlayer();
 * ```
 */
export function usePlayerState(): UsePlayerStateReturn {
    // ==========================================================================
    // Position State
    // ==========================================================================

    /** Player vertical position (0.0 = top, 1.0 = bottom) */
    const playerY = useRef<number>(0.5);

    /** Target Y position for smooth interpolation */
    const targetPlayerY = useRef<number>(0.5);

    /** Previous frame playerY for velocity calculation */
    const prevPlayerY = useRef<number>(0.5);

    /** Vertical velocity in screen space (pixels per frame) */
    const playerVelocityY = useRef<number>(0);

    // ==========================================================================
    // Connector State
    // ==========================================================================

    /** Current connector length between orbs (grows with score) */
    const currentConnectorLength = useRef<number>(INITIAL_CONFIG.minConnectorLength);

    // ==========================================================================
    // Swap Mechanics State
    // ==========================================================================

    /** 
     * Swap state: false = White Top, true = Black Top
     * This tracks which orb is in which position
     */
    const isSwapped = useRef<boolean>(false);

    /** Current rotation angle for orb positioning */
    const rotationAngle = useRef<number>(0);

    /** Target rotation angle for smooth animation */
    const targetRotation = useRef<number>(0);

    /** Timestamp of last swap (for cooldown/rhythm tracking) */
    const lastSwapTime = useRef<number>(0);

    /** True during swap animation (for invincibility window) */
    const isPhasing = useRef<boolean>(false);

    // ==========================================================================
    // Spirit VFX Trail State
    // ==========================================================================

    /** Trail state for white orb (Trailing Soul VFX) */
    const whiteOrbTrail = useRef<TrailingSoul.TrailState>(
        TrailingSoul.createTrailState()
    );

    /** Trail state for black orb (Trailing Soul VFX) */
    const blackOrbTrail = useRef<TrailingSoul.TrailState>(
        TrailingSoul.createTrailState()
    );

    // ==========================================================================
    // Control Methods
    // ==========================================================================

    /**
     * Reset all player state to initial values
     * Called at game start and when restarting
     */
    const resetPlayer = useCallback(() => {
        // Position reset
        playerY.current = 0.5;
        targetPlayerY.current = 0.5;
        prevPlayerY.current = 0.5;
        playerVelocityY.current = 0;

        // Connector reset
        currentConnectorLength.current = INITIAL_CONFIG.minConnectorLength;

        // Swap mechanics reset
        isSwapped.current = false;
        rotationAngle.current = 0;
        targetRotation.current = 0;
        lastSwapTime.current = 0;
        isPhasing.current = false;

        // Trail reset
        whiteOrbTrail.current = TrailingSoul.createTrailState();
        blackOrbTrail.current = TrailingSoul.createTrailState();
    }, []);

    // ==========================================================================
    // Return Interface
    // ==========================================================================

    return {
        // Position refs
        playerY,
        targetPlayerY,
        prevPlayerY,
        playerVelocityY,

        // Connector ref
        currentConnectorLength,

        // Swap mechanics refs
        isSwapped,
        rotationAngle,
        targetRotation,
        lastSwapTime,
        isPhasing,

        // Trail refs
        whiteOrbTrail,
        blackOrbTrail,

        // Methods
        resetPlayer,
    };
}

export default usePlayerState;
