import { useCallback } from 'react';
import { INITIAL_CONFIG } from '../../../constants';
import { AudioSystem } from '../../../systems/audioSystem';
import { getHapticSystem } from '../../../systems/hapticSystem';
import * as ParticleSystem from '../../../systems/particleSystem';
import { GameState } from '../../../types';

// Types
import { RitualTrackingCallbacks } from '../types';
import { UsePlayerStateReturn } from './usePlayerState';
import { UseSystemRefsReturn } from './useSystemRefs';

export interface UsePlayerActionsOptions {
    gameState: GameState;
    systemRefs: UseSystemRefsReturn;
    playerState: UsePlayerStateReturn;
    ritualTracking?: RitualTrackingCallbacks;
    activeCharacter?: any; // ToDo: Improve type integration
}

export function usePlayerActions({
    gameState,
    systemRefs,
    playerState,
    ritualTracking,
    activeCharacter
}: UsePlayerActionsOptions) {

    /**
     * Trigger Swap Action
     * Handles player orb swapping mechanics including:
     * - Cooldown check
     * - Physics State Updates (rotation, phasing)
     * - Audio & Haptic Feedback
     * - Visual Effects (Burst & Legacy Particles)
     */
    const triggerSwap = useCallback(() => {
        if (gameState !== GameState.PLAYING) return;

        const {
            lastSwapTime,
            isSwapped,
            targetRotation,
            rotationAngle,
            isPhasing,
            playerY
        } = playerState;

        const now = Date.now();

        // 1. Cooldown Check
        if (now - lastSwapTime.current < INITIAL_CONFIG.swapCooldown) return;

        // 2. State Updates
        lastSwapTime.current = now;
        isSwapped.current = !isSwapped.current; // Toggle state

        // Rotate 180 degrees (PI) - Accumulate rotation for continuous direction
        targetRotation.current = rotationAngle.current + Math.PI;

        // Set Phasing state (Invincibility window)
        isPhasing.current = true;
        setTimeout(() => {
            isPhasing.current = false;
        }, INITIAL_CONFIG.swapDuration);

        // 3. Audio & Haptics
        AudioSystem.playSwap();
        getHapticSystem().trigger('light');

        // 4. Visual Effects
        const height = typeof window !== 'undefined' ? window.innerHeight : 800;
        const width = typeof window !== 'undefined' ? window.innerWidth : 400;
        const playerX = width / 8; // Fixed X position
        const midY = playerY.current * height;

        // A. Character Burst (via ParticleSystem Singleton)
        if (activeCharacter) {
            const type = activeCharacter.types ? activeCharacter.types[0] : 'normal';
            ParticleSystem.emitBurst(playerX, midY, type, 12);
        }

        // B. Legacy Particles (Manual Push to ref array)
        // These provide backward compatibility for the classic "cyan" swap effect
        for (let i = 0; i < 8; i++) {
            systemRefs.particles.current.push({
                x: playerX + (Math.random() - 0.5) * 20,
                y: midY + (Math.random() - 0.5) * 60,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 0.5,
                color: "rgba(0, 240, 255, 0.6)", // Classic Cyan
                size: Math.random() * 3 + 2,
                active: true, // Required by some renderers
                type: 'legacy' // Marker
            } as any);
            // Cast to any because types.ts Particle vs ParticleSystem.ts Particle might differ slightly
        }

    }, [gameState, playerState, systemRefs, activeCharacter]);

    return {
        triggerSwap
    };
}
