/**
 * useSystemRefs Hook
 * 
 * Manages all game system state references:
 * - Entities (obstacles, particles, shards)
 * - Core systems (near miss, rhythm, gravity, midline)
 * - Mode systems (slow motion, zen, ghost racer, restore)
 * - Effect systems (glitch, phase dash, construct, enemy)
 * - Pattern and spawning systems
 * 
 * This hook extracts ~200 lines of useRef declarations from GameEngine.
 * 
 * @module hooks/useSystemRefs
 */

import { useCallback, useRef, useState } from 'react';

// Entity types
import type { Collectible, Obstacle, Particle, ScorePopup, VisualEffect } from '../../../types';

// Core state types from types.ts
import type {
    GlitchModeState,
    GlitchShard,
    GravityState,
    MidlineState,
    NearMissState,
    RhythmState,
    ShiftProtocolState,
    SnapshotBuffer,
} from '../../../types';

// Distance/Speed types from their own modules
import type { DistanceState, DistanceTracker } from '../../../systems/distanceTracker';
import type { SpeedController } from '../../../systems/speedController';

// InputState from local types
import type { InputState } from '../types';

// System imports
import * as ConstructRenderer from '../../../systems/constructs/ConstructRenderer';
import * as ConstructSystem from '../../../systems/constructs/ConstructSystem';
import * as SecondChanceVFX from '../../../systems/constructs/SecondChanceVFX';
import * as TransformationVFX from '../../../systems/constructs/TransformationVFX';
import * as EnemyManager from '../../../systems/EnemyManager';
import * as FluxOverload from '../../../systems/fluxOverloadSystem';
import * as GhostRacer from '../../../systems/ghostRacer';
import * as GlitchSystem from '../../../systems/glitchSystem';
import * as GlitchTokenSpawner from '../../../systems/GlitchTokenSpawner';
import * as GlitchVFX from '../../../systems/GlitchVFX';
import * as HolographicGate from '../../../systems/holographicGate';
import * as ObjectPool from '../../../systems/objectPool';
import * as PatternManager from '../../../systems/patternManager';
import * as PhaseDash from '../../../systems/phaseDash';
import * as PhaseDashVFX from '../../../systems/phaseDashVFX';
import * as ResonanceSystem from '../../../systems/resonanceSystem';
import * as RestoreSystem from '../../../systems/restoreSystem';
import * as ShardPlacement from '../../../systems/shardPlacement';
import * as ShiftProtocol from '../../../systems/shiftProtocol';
import * as SlowMotion from '../../../systems/slowMotion';
import * as ZenMode from '../../../systems/zenMode';

// Utility functions from correct modules
import { createInitialGravityState, createInitialNearMissState } from '../../../utils/gameMath';
import { createInitialMidlineState } from '../../../utils/midlineSystem';
import { createInitialRhythmState } from '../../../utils/rhythmSystem';


// =============================================================================
// Types
// =============================================================================

export interface UseSystemRefsReturn {
    // Entity arrays
    obstacles: React.MutableRefObject<Obstacle[]>;
    particles: React.MutableRefObject<Particle[]>;
    collectibles: React.MutableRefObject<Collectible[]>;
    scorePopups: React.MutableRefObject<ScorePopup[]>;
    visualEffects: React.MutableRefObject<VisualEffect[]>;
    activeShards: React.MutableRefObject<ShardPlacement.PlacedShard[]>;
    glitchTokens: React.MutableRefObject<GlitchTokenSpawner.GlitchToken[]>;
    wavePathShards: React.MutableRefObject<GlitchSystem.WavePathShard[]>;

    // Core system states
    nearMissState: React.MutableRefObject<NearMissState>;
    rhythmState: React.MutableRefObject<RhythmState>;
    gravityState: React.MutableRefObject<GravityState>;
    midlineState: React.MutableRefObject<MidlineState>;

    // Mode system states
    slowMotionState: React.MutableRefObject<SlowMotion.SlowMotionState>;
    slowMotionStartTime: React.MutableRefObject<number>;
    zenModeState: React.MutableRefObject<ZenMode.ZenModeState>;
    ghostRacerState: React.MutableRefObject<GhostRacer.GhostRacerState>;
    lastGhostRecordTime: React.MutableRefObject<number>;
    savedGhostTimeline: React.MutableRefObject<GhostRacer.GhostTimeline | null>;
    resonanceState: React.MutableRefObject<ResonanceSystem.ResonanceState>;
    shiftState: React.MutableRefObject<ShiftProtocolState>;

    // Restore system
    restoreState: React.MutableRefObject<RestoreSystem.RestoreState>;
    pendingRestore: React.MutableRefObject<boolean>;
    scoreAtDeath: React.MutableRefObject<number>;
    snapshotBuffer: React.MutableRefObject<SnapshotBuffer>;

    // Pattern system
    patternManagerState: React.MutableRefObject<PatternManager.PatternManagerState>;
    patternStartTime: React.MutableRefObject<number>;
    usePatternBasedSpawning: React.MutableRefObject<boolean>;
    patternSequenceIndex: React.MutableRefObject<number>;
    patternPolarity: React.MutableRefObject<'white' | 'black'>;

    // Object pools
    obstaclePool: React.MutableRefObject<ObjectPool.ObjectPool<ObjectPool.PooledEngineObstacle>>;
    shardPool: React.MutableRefObject<ObjectPool.ObjectPool<ObjectPool.PooledEngineShard>>;

    // Spawn counters
    framesSinceCollectibleSpawn: React.MutableRefObject<number>;
    framesSinceGlitchTokenSpawn: React.MutableRefObject<number>;

    // Construct system
    constructSystemState: React.MutableRefObject<ConstructSystem.ConstructSystemState>;
    constructRenderState: React.MutableRefObject<ConstructRenderer.ConstructRenderState>;
    transformationVFXState: React.MutableRefObject<TransformationVFX.TransformationVFXState>;
    secondChanceVFXState: React.MutableRefObject<SecondChanceVFX.SecondChanceVFXState>;

    // Input state (for constructs)
    inputStateRef: React.MutableRefObject<InputState>;
    prevInputPressed: React.MutableRefObject<boolean>;

    // Phase Dash system
    phaseDashState: React.MutableRefObject<PhaseDash.PhaseDashState>;
    phaseDashVFXState: React.MutableRefObject<PhaseDashVFX.PhaseDashVFXState>;
    lastTapTime: React.MutableRefObject<number>;

    // Glitch/Quantum Lock system
    glitchShardRef: React.MutableRefObject<GlitchShard | null>;
    glitchModeState: React.MutableRefObject<GlitchModeState>;
    prevQuantumLockActive: React.MutableRefObject<boolean>;
    hitStopFramesRemaining: React.MutableRefObject<number>;
    hasSpawnedGlitchShardThisLevel: React.MutableRefObject<boolean>;
    glitchScreenFlashState: React.MutableRefObject<GlitchVFX.ScreenFlashState>;
    connectorAnimationStartTime: React.MutableRefObject<number>;
    lastDiamondCollectTime: React.MutableRefObject<number>;
    diamondStreak: React.MutableRefObject<number>;
    burnEffectState: React.MutableRefObject<GlitchVFX.BurnEffectState>;

    // Enemy system
    enemyManagerState: React.MutableRefObject<EnemyManager.EnemyManagerState | null>;
    counterAttackActive: React.MutableRefObject<boolean>;

    // Flux Overload system
    fluxOverloadState: React.MutableRefObject<FluxOverload.FluxOverloadState>;

    // Holographic Gate (finish line)
    holographicGateState: React.MutableRefObject<HolographicGate.HolographicGateState>;

    // Distance tracking (campaign mode)
    distanceTrackerRef: React.MutableRefObject<DistanceTracker | null>;
    speedControllerRef: React.MutableRefObject<SpeedController | null>;
    distanceStateRef: React.MutableRefObject<DistanceState>;
    shardsCollectedRef: React.MutableRefObject<number>;
    totalShardsSpawnedRef: React.MutableRefObject<number>;
    damageTakenRef: React.MutableRefObject<number>;
    playerHealthRef: React.MutableRefObject<number>;
    lastDistanceUpdateTime: React.MutableRefObject<number>;

    // Finish mode
    levelCompleted: React.MutableRefObject<boolean>;
    isInFinishMode: React.MutableRefObject<boolean>;
    finishModePlayerX: React.MutableRefObject<number>;
    finishModeStartTime: React.MutableRefObject<number>;
    finishLineX: React.MutableRefObject<number>;
    hasReachedFinishLine: React.MutableRefObject<boolean>;
    finishExplosionTriggered: React.MutableRefObject<boolean>;

    // Mobile state (useState values - unique case)
    isMobile: boolean;
    setIsMobile: React.Dispatch<React.SetStateAction<boolean>>;
    showMobileHint: boolean;
    setShowMobileHint: React.Dispatch<React.SetStateAction<boolean>>;

    // Methods
    resetAllSystems: (screenHeight: number, slowMotionUses?: number) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages all game system state references
 */
export function useSystemRefs(): UseSystemRefsReturn {
    // ==========================================================================
    // Entity Arrays
    // ==========================================================================

    const obstacles = useRef<Obstacle[]>([]);
    const particles = useRef<Particle[]>([]);
    const collectibles = useRef<Collectible[]>([]);
    const scorePopups = useRef<ScorePopup[]>([]);
    const visualEffects = useRef<VisualEffect[]>([]);
    const activeShards = useRef<ShardPlacement.PlacedShard[]>([]);
    const glitchTokens = useRef<GlitchTokenSpawner.GlitchToken[]>([]);
    const wavePathShards = useRef<GlitchSystem.WavePathShard[]>([]);

    // ==========================================================================
    // Core System States
    // ==========================================================================

    const nearMissState = useRef<NearMissState>(createInitialNearMissState());
    const rhythmState = useRef<RhythmState>(createInitialRhythmState());
    const gravityState = useRef<GravityState>(createInitialGravityState());
    const midlineState = useRef<MidlineState>(
        createInitialMidlineState(typeof window !== 'undefined' ? window.innerHeight : 800)
    );

    // ==========================================================================
    // Mode System States
    // ==========================================================================

    const slowMotionState = useRef<SlowMotion.SlowMotionState>(
        SlowMotion.createInitialSlowMotionState(0)
    );
    const slowMotionStartTime = useRef<number>(0);

    const zenModeState = useRef<ZenMode.ZenModeState>(
        ZenMode.createInitialZenModeState()
    );

    const ghostRacerState = useRef<GhostRacer.GhostRacerState>(
        GhostRacer.createInitialGhostRacerState()
    );
    const lastGhostRecordTime = useRef<number>(0);
    const savedGhostTimeline = useRef<GhostRacer.GhostTimeline | null>(null);

    const resonanceState = useRef<ResonanceSystem.ResonanceState>(
        ResonanceSystem.createInitialResonanceState()
    );

    const shiftState = useRef<ShiftProtocolState>(
        ShiftProtocol.initializeShiftState()
    );

    // ==========================================================================
    // Restore System
    // ==========================================================================

    const restoreState = useRef<RestoreSystem.RestoreState>(
        RestoreSystem.createInitialRestoreState()
    );
    const pendingRestore = useRef<boolean>(false);
    const scoreAtDeath = useRef<number>(0);
    const snapshotBuffer = useRef<SnapshotBuffer>(
        RestoreSystem.initializeSnapshotBuffer()
    );

    // ==========================================================================
    // Pattern System
    // ==========================================================================

    const patternManagerState = useRef<PatternManager.PatternManagerState>(
        PatternManager.createPatternManagerState()
    );
    const patternStartTime = useRef<number>(0);
    const usePatternBasedSpawning = useRef<boolean>(true);
    const patternSequenceIndex = useRef<number>(0);
    const patternPolarity = useRef<'white' | 'black'>('white');

    // ==========================================================================
    // Object Pools
    // ==========================================================================

    const obstaclePool = useRef<ObjectPool.ObjectPool<ObjectPool.PooledEngineObstacle>>(
        ObjectPool.createEngineObstaclePool()
    );
    const shardPool = useRef<ObjectPool.ObjectPool<ObjectPool.PooledEngineShard>>(
        ObjectPool.createEngineShardPool()
    );

    // ==========================================================================
    // Spawn Counters
    // ==========================================================================

    const framesSinceCollectibleSpawn = useRef<number>(0);
    const framesSinceGlitchTokenSpawn = useRef<number>(0);

    // ==========================================================================
    // Construct System
    // ==========================================================================

    const constructSystemState = useRef<ConstructSystem.ConstructSystemState>(
        ConstructSystem.createConstructSystemState()
    );
    const constructRenderState = useRef<ConstructRenderer.ConstructRenderState>(
        ConstructRenderer.createConstructRenderState()
    );
    const transformationVFXState = useRef<TransformationVFX.TransformationVFXState>(
        TransformationVFX.createTransformationVFXState()
    );
    const secondChanceVFXState = useRef<SecondChanceVFX.SecondChanceVFXState>(
        SecondChanceVFX.createSecondChanceVFXState()
    );

    // ==========================================================================
    // Input State
    // ==========================================================================

    const inputStateRef = useRef<InputState>({
        isPressed: false,
        y: 0,
        isTapFrame: false,
        isReleaseFrame: false,
    });
    const prevInputPressed = useRef<boolean>(false);

    // ==========================================================================
    // Phase Dash System
    // ==========================================================================

    const phaseDashState = useRef<PhaseDash.PhaseDashState>(
        PhaseDash.createInitialPhaseDashState()
    );
    const phaseDashVFXState = useRef<PhaseDashVFX.PhaseDashVFXState>(
        PhaseDashVFX.createInitialVFXState()
    );
    const lastTapTime = useRef<number>(0);

    // ==========================================================================
    // Glitch/Quantum Lock System
    // ==========================================================================

    const glitchShardRef = useRef<GlitchShard | null>(null);
    const glitchModeState = useRef<GlitchModeState>(
        GlitchSystem.createInitialGlitchModeState()
    );
    const prevQuantumLockActive = useRef<boolean>(false);
    const hitStopFramesRemaining = useRef<number>(0);
    const hasSpawnedGlitchShardThisLevel = useRef<boolean>(false);
    const glitchScreenFlashState = useRef<GlitchVFX.ScreenFlashState>(
        GlitchVFX.createScreenFlashState()
    );
    const connectorAnimationStartTime = useRef<number>(0);
    const lastDiamondCollectTime = useRef<number>(0);
    const diamondStreak = useRef<number>(0);
    const burnEffectState = useRef<GlitchVFX.BurnEffectState>(
        GlitchVFX.createBurnEffectState()
    );

    // ==========================================================================
    // Enemy System
    // ==========================================================================

    const enemyManagerState = useRef<EnemyManager.EnemyManagerState | null>(null);
    const counterAttackActive = useRef<boolean>(false);

    // ==========================================================================
    // Flux Overload System
    // ==========================================================================

    const fluxOverloadState = useRef<FluxOverload.FluxOverloadState>(
        FluxOverload.createInitialState()
    );

    // ==========================================================================
    // Holographic Gate
    // ==========================================================================

    const holographicGateState = useRef<HolographicGate.HolographicGateState>(
        HolographicGate.createHolographicGateState()
    );

    // ==========================================================================
    // Distance Tracking (Campaign Mode)
    // ==========================================================================

    const distanceTrackerRef = useRef<DistanceTracker | null>(null);
    const speedControllerRef = useRef<SpeedController | null>(null);
    const distanceStateRef = useRef<DistanceState>({
        currentDistance: 0,
        targetDistance: 0,
        progressPercent: 0,
        isInClimaxZone: false,
        isNearFinish: false,
    });
    const shardsCollectedRef = useRef<number>(0);
    const totalShardsSpawnedRef = useRef<number>(0);
    const damageTakenRef = useRef<number>(0);
    const playerHealthRef = useRef<number>(1);
    const lastDistanceUpdateTime = useRef<number>(0);

    // ==========================================================================
    // Finish Mode
    // ==========================================================================

    const levelCompleted = useRef<boolean>(false);
    const isInFinishMode = useRef<boolean>(false);
    const finishModePlayerX = useRef<number>(0);
    const finishModeStartTime = useRef<number>(0);
    const finishLineX = useRef<number>(0);
    const hasReachedFinishLine = useRef<boolean>(false);
    const finishExplosionTriggered = useRef<boolean>(false);

    // ==========================================================================
    // Mobile State (useState - synchronous UI updates needed)
    // ==========================================================================

    const [isMobile, setIsMobile] = useState(false);
    const [showMobileHint, setShowMobileHint] = useState(true);

    // ==========================================================================
    // Reset Methods
    // ==========================================================================

    const resetAllSystems = useCallback((screenHeight: number, slowMotionUses = 0) => {
        // Entity arrays
        obstacles.current = [];
        particles.current = [];
        collectibles.current = [];
        scorePopups.current = [];
        visualEffects.current = [];
        activeShards.current = [];
        glitchTokens.current = [];
        wavePathShards.current = [];

        // Core systems
        nearMissState.current = createInitialNearMissState();
        rhythmState.current = createInitialRhythmState();
        gravityState.current = createInitialGravityState();
        midlineState.current = createInitialMidlineState(screenHeight);

        // Mode systems
        slowMotionState.current = SlowMotion.createInitialSlowMotionState(slowMotionUses);
        slowMotionStartTime.current = 0;
        zenModeState.current = ZenMode.createInitialZenModeState();
        ghostRacerState.current = GhostRacer.createInitialGhostRacerState();
        lastGhostRecordTime.current = 0;
        savedGhostTimeline.current = null;
        resonanceState.current = ResonanceSystem.createInitialResonanceState();
        shiftState.current = ShiftProtocol.initializeShiftState();

        // Restore system
        restoreState.current = RestoreSystem.createInitialRestoreState();
        pendingRestore.current = false;
        scoreAtDeath.current = 0;
        snapshotBuffer.current = RestoreSystem.initializeSnapshotBuffer();

        // Pattern system
        patternManagerState.current = PatternManager.createPatternManagerState();
        patternStartTime.current = 0;
        patternSequenceIndex.current = 0;

        // Object pools
        obstaclePool.current.reset();
        shardPool.current.reset();

        // Spawn counters
        framesSinceCollectibleSpawn.current = 0;
        framesSinceGlitchTokenSpawn.current = 0;

        // Construct system
        constructSystemState.current = ConstructSystem.resetConstructSystem();
        constructRenderState.current = ConstructRenderer.createConstructRenderState();
        transformationVFXState.current = TransformationVFX.createTransformationVFXState();
        secondChanceVFXState.current = SecondChanceVFX.createSecondChanceVFXState();

        // Input state
        inputStateRef.current = { isPressed: false, y: 0, isTapFrame: false, isReleaseFrame: false };
        prevInputPressed.current = false;

        // Phase Dash
        phaseDashState.current = PhaseDash.createInitialPhaseDashState();
        phaseDashVFXState.current = PhaseDashVFX.createInitialVFXState();
        lastTapTime.current = 0;

        // Glitch system
        glitchShardRef.current = null;
        glitchModeState.current = GlitchSystem.createInitialGlitchModeState();
        prevQuantumLockActive.current = false;
        hitStopFramesRemaining.current = 0;
        hasSpawnedGlitchShardThisLevel.current = false;
        glitchScreenFlashState.current = GlitchVFX.createScreenFlashState();
        connectorAnimationStartTime.current = 0;
        lastDiamondCollectTime.current = 0;
        diamondStreak.current = 0;
        burnEffectState.current = GlitchVFX.createBurnEffectState();

        // Enemy system
        enemyManagerState.current = EnemyManager.createEnemyManagerState(
            typeof window !== 'undefined' ? window.innerWidth : 1920,
            screenHeight
        );
        counterAttackActive.current = false;

        // Flux Overload
        fluxOverloadState.current = FluxOverload.createInitialState();

        // Holographic Gate
        holographicGateState.current = HolographicGate.createHolographicGateState();

        // Distance tracking
        distanceTrackerRef.current = null;
        speedControllerRef.current = null;
        distanceStateRef.current = {
            currentDistance: 0,
            targetDistance: 0,
            progressPercent: 0,
            isInClimaxZone: false,
            isNearFinish: false,
        };
        shardsCollectedRef.current = 0;
        totalShardsSpawnedRef.current = 0;
        damageTakenRef.current = 0;
        playerHealthRef.current = 1;
        lastDistanceUpdateTime.current = 0;

        // Finish mode
        levelCompleted.current = false;
        isInFinishMode.current = false;
        finishModePlayerX.current = 0;
        finishModeStartTime.current = 0;
        finishLineX.current = 0;
        hasReachedFinishLine.current = false;
        finishExplosionTriggered.current = false;
    }, []);

    // ==========================================================================
    // Return Interface
    // ==========================================================================

    return {
        // Entity arrays
        obstacles,
        particles,
        collectibles,
        scorePopups,
        visualEffects,
        activeShards,
        glitchTokens,
        wavePathShards,

        // Core system states
        nearMissState,
        rhythmState,
        gravityState,
        midlineState,

        // Mode system states
        slowMotionState,
        slowMotionStartTime,
        zenModeState,
        ghostRacerState,
        lastGhostRecordTime,
        savedGhostTimeline,
        resonanceState,
        shiftState,

        // Restore system
        restoreState,
        pendingRestore,
        scoreAtDeath,
        snapshotBuffer,

        // Pattern system
        patternManagerState,
        patternStartTime,
        usePatternBasedSpawning,
        patternSequenceIndex,
        patternPolarity,

        // Object pools
        obstaclePool,
        shardPool,

        // Spawn counters
        framesSinceCollectibleSpawn,
        framesSinceGlitchTokenSpawn,

        // Construct system
        constructSystemState,
        constructRenderState,
        transformationVFXState,
        secondChanceVFXState,

        // Input state
        inputStateRef,
        prevInputPressed,

        // Phase Dash
        phaseDashState,
        phaseDashVFXState,
        lastTapTime,

        // Glitch system
        glitchShardRef,
        glitchModeState,
        prevQuantumLockActive,
        hitStopFramesRemaining,
        hasSpawnedGlitchShardThisLevel,
        glitchScreenFlashState,
        connectorAnimationStartTime,
        lastDiamondCollectTime,
        diamondStreak,
        burnEffectState,

        // Enemy system
        enemyManagerState,
        counterAttackActive,

        // Flux Overload
        fluxOverloadState,

        // Holographic Gate
        holographicGateState,

        // Distance tracking
        distanceTrackerRef,
        speedControllerRef,
        distanceStateRef,
        shardsCollectedRef,
        totalShardsSpawnedRef,
        damageTakenRef,
        playerHealthRef,
        lastDistanceUpdateTime,

        // Finish mode
        levelCompleted,
        isInFinishMode,
        finishModePlayerX,
        finishModeStartTime,
        finishLineX,
        hasReachedFinishLine,
        finishExplosionTriggered,

        // Mobile state
        isMobile,
        setIsMobile,
        showMobileHint,
        setShowMobileHint,

        // Methods
        resetAllSystems,
    };
}

export default useSystemRefs;
