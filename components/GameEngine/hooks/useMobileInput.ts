/**
 * useMobileInput Hook
 * 
 * Handles mobile touch input for the game:
 * - Touch drag for player movement
 * - Touch release for swap trigger
 * - Double-tap detection for Phase Dash activation
 * - Joystick control (legacy, optional)
 * 
 * This hook extracts ~150 lines of touch handling from GameEngine.
 * 
 * @module hooks/useMobileInput
 */

import { useCallback, useEffect, useRef } from 'react';
import { getHapticSystem } from '../../../systems/hapticSystem';
import * as PhaseDash from '../../../systems/phaseDash';
import * as ScreenShake from '../../../systems/screenShake';
import { getActiveUpgradeEffects } from '../../../systems/upgradeSystem';
import type { GlitchModeState } from '../../../types';
import { GameState } from '../../../types';
import type { InputState, TouchControlState } from '../types';

// =============================================================================
// Types
// =============================================================================

export interface UseMobileInputOptions {
    /** Current game state */
    gameState: GameState;
    /** Reference to the canvas element */
    canvasRef: React.RefObject<HTMLCanvasElement>;
    /** Whether the device is mobile */
    isMobile: boolean;
    /** Current player Y position ref */
    playerY: React.MutableRefObject<number>;
    /** Target player Y position ref to update */
    targetPlayerY: React.MutableRefObject<number>;
    /** Function to trigger swap action */
    triggerSwap: () => void;
    /** Input state ref for construct system */
    inputStateRef: React.MutableRefObject<InputState>;
    /** Phase Dash state ref */
    phaseDashState: React.MutableRefObject<PhaseDash.PhaseDashState>;
    /** Phase Dash VFX state ref */
    phaseDashVFXState: React.MutableRefObject<any>; // PhaseDashVFX.PhaseDashVFXState
    /** Glitch mode state ref (for blocking dash during Quantum Lock) */
    glitchModeState: React.MutableRefObject<GlitchModeState>;
    /** Whether controls are inverted (Daily Challenge modifier) */
    invertedControls?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Double-tap threshold in milliseconds for Phase Dash activation */
const DOUBLE_TAP_THRESHOLD = 300;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages mobile touch input (drag and tap)
 * 
 * @param options - Configuration options for the input handler
 * 
 * @example
 * ```tsx
 * useMobileInput({
 *   gameState,
 *   canvasRef,
 *   isMobile: true,
 *   playerY: player.playerY,
 *   targetPlayerY: player.targetPlayerY,
 *   triggerSwap: player.triggerSwap,
 *   inputStateRef: systems.inputStateRef,
 *   phaseDashState: systems.phaseDashState,
 *   phaseDashVFXState: systems.phaseDashVFXState,
 *   glitchModeState: systems.glitchModeState,
 * });
 * ```
 */
export function useMobileInput({
    gameState,
    canvasRef,
    isMobile,
    playerY,
    targetPlayerY,
    triggerSwap,
    inputStateRef,
    phaseDashState,
    phaseDashVFXState,
    glitchModeState,
    invertedControls = false,
}: UseMobileInputOptions): void {

    // Touch control state
    const touchControlRef = useRef<TouchControlState>({
        active: false,
        startY: 0,
        currentY: 0,
        touchId: null,
        hasMoved: false,
    });

    // Double-tap detection for Phase Dash
    const lastTapTime = useRef<number>(0);

    /**
     * Handle touch start - begin tracking touch position
     */
    const handleTouchControlStart = useCallback((e: TouchEvent) => {
        if (gameState !== GameState.PLAYING) return;
        if (!isMobile) return;

        const touch = e.touches[0];
        touchControlRef.current = {
            active: true,
            startY: touch.clientY,
            currentY: touch.clientY,
            touchId: touch.identifier,
            hasMoved: false,
        };

        // Update InputState for Construct system
        inputStateRef.current = {
            ...inputStateRef.current,
            isPressed: true,
            y: touch.clientY,
            isTapFrame: true, // Will be cleared next frame
        };

        // --- PHASE DASH: Double-tap detection for activation ---
        const now = Date.now();
        if (now - lastTapTime.current < DOUBLE_TAP_THRESHOLD) {
            // Double-tap detected - check if dash can activate
            // Prevent activation during Active, Warning, or Exiting phases of Quantum Lock
            const isQuantumLockEngaged = glitchModeState.current.isActive ||
                glitchModeState.current.phase === 'warning' ||
                glitchModeState.current.phase === 'exiting';

            if (PhaseDash.canActivate(phaseDashState.current) && !isQuantumLockEngaged) {
                const dashDuration = getActiveUpgradeEffects().dashDuration;
                phaseDashState.current = PhaseDash.activateDash(phaseDashState.current, dashDuration);

                // Trigger VFX transition in (with particle burst at player position)
                const playerX = window.innerWidth / 8;
                const playerYPos = playerY.current * window.innerHeight;

                // Import PhaseDashVFX dynamically to avoid circular deps
                import('../../../systems/phaseDashVFX').then((PhaseDashVFX) => {
                    phaseDashVFXState.current = PhaseDashVFX.triggerTransitionIn(
                        phaseDashVFXState.current,
                        playerX,
                        playerYPos,
                        window.innerWidth,
                        window.innerHeight
                    );
                });

                // Heavy screen shake on activation
                ScreenShake.trigger({ intensity: 20, duration: 400, frequency: 25, decay: true });

                // Haptic feedback
                getHapticSystem().trigger('heavy');
            }
        }
        lastTapTime.current = now;
    }, [gameState, isMobile, inputStateRef, phaseDashState, phaseDashVFXState, glitchModeState, playerY]);

    /**
     * Handle touch move - update player position based on drag
     */
    const handleTouchControlMove = useCallback((e: TouchEvent) => {
        if (!touchControlRef.current.active || gameState !== GameState.PLAYING) return;
        if (!isMobile) return;

        // Find the correct touch
        const touch = Array.from(e.touches).find(
            (t) => t.identifier === touchControlRef.current.touchId
        );
        if (!touch) return;

        const deltaY = touch.clientY - touchControlRef.current.startY;
        touchControlRef.current.currentY = touch.clientY;

        // Mark as moved if delta exceeds threshold (10px)
        if (Math.abs(deltaY) > 10) {
            touchControlRef.current.hasMoved = true;
        }

        // Calculate movement - drag sensitivity
        const sensitivity = 0.003; // How much the player moves per pixel dragged
        let movement = deltaY * sensitivity;

        // Daily Challenge Mode: Apply inverted controls
        if (invertedControls) {
            movement = -movement;
        }

        // Apply movement relative to current position
        const newY = Math.max(0, Math.min(1, playerY.current + movement));
        targetPlayerY.current = newY;

        // Update start position for continuous dragging
        touchControlRef.current.startY = touch.clientY;

        // Update InputState Y coordinate for Blink ghost
        inputStateRef.current = {
            ...inputStateRef.current,
            y: touch.clientY,
        };
    }, [gameState, isMobile, playerY, targetPlayerY, inputStateRef, invertedControls]);

    /**
     * Handle touch end - trigger swap and reset state
     */
    const handleTouchControlEnd = useCallback((e: TouchEvent) => {
        if (!touchControlRef.current.active) return;
        if (!isMobile) return;

        // Check if this is the correct touch ending
        const touchEnded = !Array.from(e.touches).some(
            (t) => t.identifier === touchControlRef.current.touchId
        );
        if (!touchEnded) return;

        // Update InputState for Construct system
        inputStateRef.current = {
            ...inputStateRef.current,
            isPressed: false,
            isReleaseFrame: true, // Will be cleared next frame
        };

        // Trigger swap on release
        triggerSwap();

        // Reset touch control state
        touchControlRef.current = {
            active: false,
            startY: 0,
            currentY: 0,
            touchId: null,
            hasMoved: false,
        };
    }, [isMobile, triggerSwap, inputStateRef]);

    /**
     * Set up event listeners for mobile touch input
     */
    useEffect(() => {
        if (!isMobile) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Add touch event listeners with passive: false to allow preventDefault
        canvas.addEventListener('touchstart', handleTouchControlStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchControlMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchControlEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleTouchControlEnd, { passive: false });

        // Cleanup
        return () => {
            canvas.removeEventListener('touchstart', handleTouchControlStart);
            canvas.removeEventListener('touchmove', handleTouchControlMove);
            canvas.removeEventListener('touchend', handleTouchControlEnd);
            canvas.removeEventListener('touchcancel', handleTouchControlEnd);
        };
    }, [
        handleTouchControlStart,
        handleTouchControlMove,
        handleTouchControlEnd,
        isMobile,
        canvasRef,
    ]);
}

export default useMobileInput;
