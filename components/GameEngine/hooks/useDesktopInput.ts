/**
 * useDesktopInput Hook
 * 
 * Handles desktop (mouse/keyboard) input for the game:
 * - Mouse movement for player position
 * - Mouse click for swap trigger
 * - Input state tracking for constructs
 * 
 * This hook extracts ~80 lines of input handling from GameEngine.
 * 
 * @module hooks/useDesktopInput
 */

import { useCallback, useEffect } from 'react';
import { GameState } from '../../../types';
import type { InputState } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface UseDesktopInputOptions {
    /** Current game state */
    gameState: GameState;
    /** Reference to the canvas element */
    canvasRef: React.RefObject<HTMLCanvasElement>;
    /** Whether the device is mobile (skip desktop input if true) */
    isMobile: boolean;
    /** Target player Y position ref to update */
    targetPlayerY: React.MutableRefObject<number>;
    /** Function to trigger swap action */
    triggerSwap: () => void;
    /** Input state ref for construct system */
    inputStateRef: React.MutableRefObject<InputState>;
    /** Whether controls are inverted (Daily Challenge modifier) */
    invertedControls?: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages desktop input (mouse movement and clicks)
 * 
 * @param options - Configuration options for the input handler
 * 
 * @example
 * ```tsx
 * useDesktopInput({
 *   gameState,
 *   canvasRef,
 *   isMobile: false,
 *   targetPlayerY: player.targetPlayerY,
 *   triggerSwap: player.triggerSwap,
 *   inputStateRef: systems.inputStateRef,
 *   invertedControls: dailyChallengeMode?.config?.modifiers.invertedControls,
 * });
 * ```
 */
export function useDesktopInput({
    gameState,
    canvasRef,
    isMobile,
    targetPlayerY,
    triggerSwap,
    inputStateRef,
    invertedControls = false,
}: UseDesktopInputOptions): void {

    /**
     * Handle input movement (mouse or touch)
     * Converts screen Y position to normalized player position (0-1)
     */
    const handleInputMove = useCallback((clientY: number) => {
        if (gameState !== GameState.PLAYING) return;
        if (!canvasRef.current) return;
        if (isMobile) return; // Skip for mobile - use touch controls instead

        const rect = canvasRef.current.getBoundingClientRect();
        let y = Math.min(Math.max((clientY - rect.top) / rect.height, 0.0), 1.0);

        // Daily Challenge Mode: Apply inverted controls
        if (invertedControls) {
            y = 1.0 - y;
        }

        targetPlayerY.current = y;
    }, [gameState, canvasRef, isMobile, targetPlayerY, invertedControls]);

    /**
     * Set up event listeners for desktop input
     */
    useEffect(() => {
        if (isMobile) return; // Skip for mobile devices

        /**
         * Handle mouse movement
         */
        const onMouseMove = (e: MouseEvent) => {
            handleInputMove(e.clientY);
            // Update InputState Y for Blink ghost positioning
            inputStateRef.current = {
                ...inputStateRef.current,
                y: e.clientY,
            };
        };

        /**
         * Handle mouse button press
         */
        const onMouseDown = (e: MouseEvent) => {
            inputStateRef.current = {
                ...inputStateRef.current,
                isPressed: true,
                y: e.clientY,
                isTapFrame: true, // Will be cleared next frame
            };
        };

        /**
         * Handle mouse button release
         */
        const onMouseUp = (_e: MouseEvent) => {
            inputStateRef.current = {
                ...inputStateRef.current,
                isPressed: false,
                isReleaseFrame: true, // Will be cleared next frame
            };
        };

        /**
         * Handle mouse click for swap
         */
        const onClick = (_e: MouseEvent) => {
            if (gameState !== GameState.PLAYING) return;
            triggerSwap();
        };

        // Register event listeners
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('click', onClick);

        // Cleanup
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('click', onClick);
        };
    }, [isMobile, handleInputMove, triggerSwap, inputStateRef, gameState]);
}

export default useDesktopInput;
