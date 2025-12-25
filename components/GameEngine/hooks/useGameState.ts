/**
 * useGameState Hook
 * 
 * Manages core game state:
 * - Score and speed
 * - Spawn rate and timing
 * - Frame tracking
 * - Game timing (start time, was playing)
 * 
 * This hook extracts ~30 lines of useRef declarations and related
 * reset logic from the main GameEngine component.
 * 
 * @module hooks/useGameState
 */

import { useCallback, useRef } from 'react';
import { INITIAL_CONFIG } from '../../../constants';

// =============================================================================
// Types
// =============================================================================

export interface GameStateRefs {
    // Frame management
    frameId: React.MutableRefObject<number>;
    wasPlayingRef: React.MutableRefObject<boolean>;

    // Core game values
    score: React.MutableRefObject<number>;
    speed: React.MutableRefObject<number>;

    // Spawn management
    framesSinceSpawn: React.MutableRefObject<number>;
    currentSpawnRate: React.MutableRefObject<number>;

    // Timing
    gameStartTime: React.MutableRefObject<number>;

    // Upgrade effects
    scoreMultiplierUpgrade: React.MutableRefObject<number>;
    magnetRadiusFactorUpgrade: React.MutableRefObject<number>;
    shieldChargesRemaining: React.MutableRefObject<number>;
    shieldInvincibleUntil: React.MutableRefObject<number>;

    // Mission tracking
    accumulatedDistance: React.MutableRefObject<number>;
    lastDistanceEmitTime: React.MutableRefObject<number>;
    laneStayStartTime: React.MutableRefObject<number>;
    lastLaneStayEmitTime: React.MutableRefObject<number>;

    // Daily rituals tracking
    lastSwapTimeForRitual: React.MutableRefObject<number>;
    speedSurvivalTime: React.MutableRefObject<number>;
    noSwapSurvivalTime: React.MutableRefObject<number>;
    lastRitualUpdateTime: React.MutableRefObject<number>;

    // Visual effects
    tensionIntensityRef: React.MutableRefObject<number>;
}

export interface GameStateMethods {
    resetGameState: (upgradeEffects: {
        startingScore: number;
        scoreMultiplier: number;
        magnetRadiusFactor: number;
        shieldCharges: number;
    }, speedModifier?: number, spawnRateModifier?: number) => void;
}

export interface UseGameStateReturn extends GameStateRefs, GameStateMethods { }

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages core game state values
 * 
 * @returns Game state refs and control methods
 * 
 * @example
 * ```tsx
 * const game = useGameState();
 * 
 * // Access current score
 * const currentScore = game.score.current;
 * 
 * // Reset game state with upgrade effects
 * game.resetGameState(upgradeEffects, speedModifier);
 * ```
 */
export function useGameState(): UseGameStateReturn {
    // ==========================================================================
    // Frame Management
    // ==========================================================================

    /** Current animation frame ID (for cleanup) */
    const frameId = useRef<number>(0);

    /** Track if game was previously playing (to detect resume vs new game) */
    const wasPlayingRef = useRef<boolean>(false);

    // ==========================================================================
    // Core Game Values
    // ==========================================================================

    /** Current player score */
    const score = useRef<number>(0);

    /** Current game speed (affects obstacle movement and spawning) */
    const speed = useRef<number>(INITIAL_CONFIG.baseSpeed);

    // ==========================================================================
    // Spawn Management
    // ==========================================================================

    /** Frames since last obstacle spawn */
    const framesSinceSpawn = useRef<number>(0);

    /** Current spawn rate (frames between spawns) */
    const currentSpawnRate = useRef<number>(INITIAL_CONFIG.spawnRate);

    // ==========================================================================
    // Timing
    // ==========================================================================

    /** Game start timestamp (for elapsed time calculations) */
    const gameStartTime = useRef<number>(0);

    // ==========================================================================
    // Upgrade Effects
    // ==========================================================================

    /** Score multiplier from upgrades */
    const scoreMultiplierUpgrade = useRef<number>(1);

    /** Magnet radius factor from upgrades */
    const magnetRadiusFactorUpgrade = useRef<number>(0);

    /** Remaining shield charges from upgrades */
    const shieldChargesRemaining = useRef<number>(0);

    /** Shield invincibility end timestamp */
    const shieldInvincibleUntil = useRef<number>(0);

    // ==========================================================================
    // Mission Tracking
    // ==========================================================================

    /** Accumulated distance for mission events */
    const accumulatedDistance = useRef<number>(0);

    /** Last time distance event was emitted */
    const lastDistanceEmitTime = useRef<number>(0);

    /** Start time of current lane stay */
    const laneStayStartTime = useRef<number>(0);

    /** Last time lane stay event was emitted */
    const lastLaneStayEmitTime = useRef<number>(0);

    // ==========================================================================
    // Daily Rituals Tracking
    // ==========================================================================

    /** Last swap time for ritual tracking */
    const lastSwapTimeForRitual = useRef<number>(0);

    /** Speed survival time accumulator */
    const speedSurvivalTime = useRef<number>(0);

    /** No-swap survival time accumulator */
    const noSwapSurvivalTime = useRef<number>(0);

    /** Last ritual update timestamp */
    const lastRitualUpdateTime = useRef<number>(0);

    // ==========================================================================
    // Visual Effects
    // ==========================================================================

    /** Tension intensity for midline visual effects */
    const tensionIntensityRef = useRef<number>(0);

    // ==========================================================================
    // Control Methods
    // ==========================================================================

    /**
     * Reset all game state to initial values
     * 
     * @param upgradeEffects - Active upgrade effects to apply
     * @param speedModifier - Combined speed modifier (campaign + challenge + spirit)
     * @param spawnRateModifier - Combined spawn rate modifier
     */
    const resetGameState = useCallback((
        upgradeEffects: {
            startingScore: number;
            scoreMultiplier: number;
            magnetRadiusFactor: number;
            shieldCharges: number;
        },
        speedModifier = 1,
        spawnRateModifier = 1
    ) => {
        // Frame management
        frameId.current = 0;
        // Note: wasPlayingRef is intentionally NOT reset here

        // Core values
        score.current = upgradeEffects.startingScore;
        speed.current = INITIAL_CONFIG.baseSpeed * speedModifier;

        // Spawn management
        framesSinceSpawn.current = 0;
        currentSpawnRate.current = INITIAL_CONFIG.spawnRate / spawnRateModifier;

        // Timing
        gameStartTime.current = Date.now();

        // Upgrade effects
        scoreMultiplierUpgrade.current = upgradeEffects.scoreMultiplier;
        magnetRadiusFactorUpgrade.current = upgradeEffects.magnetRadiusFactor;
        shieldChargesRemaining.current = Math.max(0, Math.floor(upgradeEffects.shieldCharges));
        shieldInvincibleUntil.current = 0;

        // Mission tracking
        accumulatedDistance.current = 0;
        lastDistanceEmitTime.current = 0;
        laneStayStartTime.current = Date.now();
        lastLaneStayEmitTime.current = 0;

        // Daily rituals tracking
        lastSwapTimeForRitual.current = Date.now();
        speedSurvivalTime.current = 0;
        noSwapSurvivalTime.current = 0;
        lastRitualUpdateTime.current = 0;

        // Visual effects
        tensionIntensityRef.current = 0;
    }, []);

    // ==========================================================================
    // Return Interface
    // ==========================================================================

    return {
        // Frame management
        frameId,
        wasPlayingRef,

        // Core game values
        score,
        speed,

        // Spawn management
        framesSinceSpawn,
        currentSpawnRate,

        // Timing
        gameStartTime,

        // Upgrade effects
        scoreMultiplierUpgrade,
        magnetRadiusFactorUpgrade,
        shieldChargesRemaining,
        shieldInvincibleUntil,

        // Mission tracking
        accumulatedDistance,
        lastDistanceEmitTime,
        laneStayStartTime,
        lastLaneStayEmitTime,

        // Daily rituals tracking
        lastSwapTimeForRitual,
        speedSurvivalTime,
        noSwapSurvivalTime,
        lastRitualUpdateTime,

        // Visual effects
        tensionIntensityRef,

        // Methods
        resetGameState,
    };
}

export default useGameState;
