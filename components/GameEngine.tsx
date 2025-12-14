import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  GRAVITY_CONFIG,
  INITIAL_CONFIG,
  MIDLINE_CONFIG,
  PHANTOM_CONFIG,
} from "../constants";
import { getSkinById } from "../data/skins";
import { useGameStore } from "../store/gameStore";
import { applyTheme, getColor, hasEffect } from "../systems/themeSystem";
import {
  EnhancedResonanceState,
  GameState,
  GravityState,
  MidlineConfig,
  MidlineState,
  MissionEvent,
  NearMissState,
  Obstacle,
  Particle,
  RhythmState,
  ScorePopup,
  SnapshotBuffer,
  VisualEffect
} from "../types";
import {
  checkCollision,
  checkNearMiss,
  createInitialGravityState,
  createInitialNearMissState,
  getFlippedLane,
  mirrorPlayerPosition,
  randomRange,
  shouldTriggerFlip,
  updateNearMissState,
} from "../utils/gameMath";
import {
  calculateDynamicAmplitude,
  calculateDynamicFrequency,
  calculateMidlineY,
  calculateMovementBounds,
  calculateNormalBounds,
  calculateNormalizedOffset,
  calculateTensionIntensity,
  createInitialMidlineState,
  getOrbZone,
  isAtPeak,
  isCriticalSpace,
  predictPeakTime,
  shouldApplyMicroPhasing,
} from "../utils/midlineSystem";
import {
  calculatePhantomBonus,
  calculatePhantomOpacity,
  createPhantomObstacle,
  getEffectiveOpacity,
  shouldSpawnAsPhantom,
} from "../utils/phantomSystem";
import {
  calculateExpectedInterval,
  checkRhythmTiming,
  createInitialRhythmState,
  updateRhythmState,
} from "../utils/rhythmSystem";
import { renderOrb } from "../utils/skinRenderer";

// 🔧 DEBUG: Geçici ölümsüzlük modu - test için true yap, bitince false yap
const DEBUG_IMMORTAL_MODE = false;
// Particle System Integration - Requirements 12.1, 12.2, 12.3
import * as ParticleSystem from "../systems/particleSystem";
// Screen Shake System Integration - Requirements 10.1, 10.2, 10.3, 10.4
import * as ScreenShake from "../systems/screenShake";
// Chromatic Aberration System Integration - Requirements 11.1, 11.2, 11.3
import * as ChromaticAberration from "../systems/chromaticAberration";
// Upgrade System Integration - Requirements 6.1, 6.2, 6.4
import { getActiveUpgradeEffects } from "../systems/upgradeSystem";
// Slow Motion System Integration - Requirements 6.4
import * as SlowMotion from "../systems/slowMotion";
// Campaign System Integration - Requirements 7.2, 7.3, 7.4, 7.5, 7.6
import { LevelConfig } from "../data/levels";
// Daily Challenge System Integration - Requirements 8.1, 8.2, 8.3
import { DailyChallengeConfig } from "../systems/dailyChallenge";
// Zen Mode System Integration - Requirements 9.1, 9.2, 9.4
import * as ZenMode from "../systems/zenMode";
// Ghost Racer System Integration - Requirements 15.1, 15.2, 15.3, 15.4
import * as GhostRacer from "../systems/ghostRacer";
// Resonance System Integration - Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.9
import * as ResonanceSystem from "../systems/resonanceSystem";
// Restore System Integration - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
import * as RestoreSystem from "../systems/restoreSystem";
// Haptic Feedback System Integration - Requirements 4.1, 4.2, 4.3, 4.4
import { getHapticSystem } from "../systems/hapticSystem";
// S.H.I.F.T. Protocol System Integration - Requirements 3.2, 3.3, 9.1
import { SHIFT_CONFIG } from "../constants";
import * as ShiftProtocol from "../systems/shiftProtocol";
import { Collectible, ShiftProtocolState } from "../types";
// Flow Curve System Integration - Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
import * as FlowCurve from "../systems/flowCurve";
// Pattern Manager System Integration - Requirements 2.1, 2.2, 2.3, 2.4, 2.5
import { Lane, PATTERNS } from "../data/patterns";
import * as PatternManager from "../systems/patternManager";
// Difficulty Progression System Integration - Requirements 7.1, 7.2, 7.3, 7.4, 7.5
import * as DifficultyProgression from "../systems/difficultyProgression";
// Object Pool System Integration - Requirements 6.1, 6.2, 6.3, 6.4, 6.5
import * as ObjectPool from "../systems/objectPool";
// Shard Placement System Integration - Requirements 5.1, 5.2, 5.3, 5.4, 5.5
import type { ZoneConfig } from "../data/zones";
import * as ShardPlacement from "../systems/shardPlacement";
import { setCustomThemeColors } from "../systems/themeSystem";
// Audio System Integration - Phase 4 Launch Polish
import * as AudioSystem from "../systems/audioSystem";
// Orb Trail System - Skins create trail effects behind orbs
import * as OrbTrailSystem from "../systems/orbTrailSystem";
// Echo Constructs System Integration - Requirements 2.1, 2.3, 2.4, 3.1, 4.1, 5.1
import * as ConstructSystem from "../systems/constructs/ConstructSystem";
import * as GlitchTokenSpawner from "../systems/GlitchTokenSpawner";
import * as SecondChanceSystem from "../systems/SecondChanceSystem";
import type { InputState } from "../types";
// Echo Constructs VFX Integration - Requirements 3.5, 4.5, 5.6, 2.2, 6.4, 6.6, 6.8
import * as ConstructRenderer from "../systems/constructs/ConstructRenderer";
import * as SecondChanceVFX from "../systems/constructs/SecondChanceVFX";
import * as TransformationVFX from "../systems/constructs/TransformationVFX";

// Campaign mode configuration for mechanics enable/disable
export interface CampaignModeConfig {
  enabled: boolean;
  levelConfig?: LevelConfig;
  targetScore?: number;
  onLevelComplete?: (score: number) => void;
}

// Daily Challenge mode configuration - Requirements 8.1, 8.2
export interface DailyChallengeMode {
  enabled: boolean;
  config?: DailyChallengeConfig;
  onChallengeComplete?: (score: number, echoShardsEarned: number) => void;
}

// Zen Mode configuration - Requirements 9.1, 9.2, 9.4
export interface ZenModeConfig {
  enabled: boolean;
  onRespawn?: (respawnCount: number) => void;
}

// Ghost Racer mode configuration - Requirements 15.1, 15.2, 15.3, 15.4
export interface GhostRacerConfig {
  enabled: boolean;
  onNewHighScore?: (finalScore: number) => void;
}

// Restore Mode configuration - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
export interface RestoreModeConfig {
  enabled: boolean;
  onShowRestorePrompt?: (scoreAtDeath: number, canRestore: boolean) => void;
  onRestoreComplete?: () => void;
}

// Daily Rituals tracking callbacks - Requirements 3.7, 3.8, 3.9, 3.10
export interface RitualTrackingCallbacks {
  onNearMiss?: () => void;
  onPhantomPass?: () => void;
  onScoreAccumulate?: (score: number) => void;
  onSpeedSurvival?: (seconds: number) => void;
  onStreakReached?: (streak: number) => void;
  onNoSwapSurvival?: (seconds: number) => void;
}

interface GameEngineProps {
  gameState: GameState;
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  setGameSpeedDisplay: (speed: number) => void;
  onRhythmStateUpdate?: (multiplier: number, streak: number) => void;
  onNearMissStateUpdate?: (streak: number) => void;
  // Slow Motion System - Requirements 6.4
  slowMotionActive?: boolean;
  onSlowMotionStateUpdate?: (active: boolean) => void;
  // Campaign Mode - Requirements 7.2, 7.3, 7.4, 7.5, 7.6
  campaignMode?: CampaignModeConfig;
  // Daily Challenge Mode - Requirements 8.1, 8.2, 8.3
  dailyChallengeMode?: DailyChallengeMode;
  // Zen Mode - Requirements 9.1, 9.2, 9.4
  zenMode?: ZenModeConfig;
  // Ghost Racer Mode - Requirements 15.1, 15.2, 15.3, 15.4
  ghostRacerMode?: GhostRacerConfig;
  // Restore Mode - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
  restoreMode?: RestoreModeConfig;
  restoreRequested?: boolean;
  onRestoreStateUpdate?: (canRestore: boolean, hasBeenUsed: boolean) => void;
  // Daily Rituals Tracking - Requirements 3.7, 3.8, 3.9, 3.10
  ritualTracking?: RitualTrackingCallbacks;
  // Zone System (Phase 2)
  zoneConfig?: ZoneConfig;
  // Mission System - Requirements 7.1, 7.2, 7.3, 7.4, 7.5
  onMissionEvent?: (event: MissionEvent) => void;
}

const GameEngine: React.FC<GameEngineProps> = ({
  gameState,
  onScoreUpdate,
  onGameOver,
  setGameSpeedDisplay,
  onRhythmStateUpdate,
  onNearMissStateUpdate,
  slowMotionActive = false,
  onSlowMotionStateUpdate,
  campaignMode,
  dailyChallengeMode,
  zenMode,
  ghostRacerMode,
  restoreMode,
  restoreRequested = false,
  onRestoreStateUpdate,
  ritualTracking,
  zoneConfig,
  onMissionEvent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Theme System Integration - Requirements 5.1, 5.2, 5.3
  const equippedTheme = useGameStore((state) => state.equippedTheme);
  const customThemeColors = useGameStore((state) => state.customThemeColors);

  // Skin System Integration - Requirements 3.1, 3.2
  const equippedSkin = useGameStore((state) => state.equippedSkin);

  // Apply theme when equipped theme changes
  useEffect(() => {
    applyTheme(equippedTheme);
  }, [equippedTheme]);

  // Keep ThemeSystem in sync with custom theme payload
  useEffect(() => {
    setCustomThemeColors(customThemeColors);
  }, [customThemeColors]);

  // Mutable Game State
  const frameId = useRef<number>(0);
  const score = useRef<number>(0);
  const speed = useRef<number>(INITIAL_CONFIG.baseSpeed);

  // Entities
  const playerY = useRef<number>(0.5); // Vertical position (0.0 - 1.0)
  const targetPlayerY = useRef<number>(0.5);
  const currentConnectorLength = useRef<number>(
    INITIAL_CONFIG.minConnectorLength
  );

  // Swap Mechanics
  const isSwapped = useRef<boolean>(false); // false = White Top, true = Black Top
  const rotationAngle = useRef<number>(0);
  const targetRotation = useRef<number>(0);
  const lastSwapTime = useRef<number>(0);
  const isPhasing = useRef<boolean>(false); // True during swap animation

  const obstacles = useRef<Obstacle[]>([]);
  const particles = useRef<Particle[]>([]);

  // Near Miss System State - Requirements 3.1
  const nearMissState = useRef<NearMissState>(createInitialNearMissState());
  const scorePopups = useRef<ScorePopup[]>([]);
  const visualEffects = useRef<VisualEffect[]>([]);

  // Rhythm System State - Requirements 1.1
  const rhythmState = useRef<RhythmState>(createInitialRhythmState());

  // Gravity System State - Requirements 2.1
  const gravityState = useRef<GravityState>(createInitialGravityState());

  // Dynamic Midline System State - Requirements 4.1, 4.9
  const midlineState = useRef<MidlineState>(
    createInitialMidlineState(window.innerHeight)
  );
  const gameStartTime = useRef<number>(0);

  // Logic Timers
  const framesSinceSpawn = useRef<number>(0);
  const currentSpawnRate = useRef<number>(INITIAL_CONFIG.spawnRate);

  // Tension Visual Effect - midline hareket ettiğinde görsel gerilim
  const tensionIntensityRef = useRef<number>(0);

  // Slow Motion State - Requirements 6.4
  const slowMotionState = useRef<SlowMotion.SlowMotionState>(
    SlowMotion.createInitialSlowMotionState(0)
  );
  const slowMotionStartTime = useRef<number>(0);

  // Score Multiplier from Upgrades - Requirements 6.2
  const scoreMultiplierUpgrade = useRef<number>(1);

  // Phase 2 Upgrades: Magnet + Shield
  const magnetRadiusFactorUpgrade = useRef<number>(0);
  const shieldChargesRemaining = useRef<number>(0);
  const shieldInvincibleUntil = useRef<number>(0);

  // Campaign Mode State - Requirements 7.3
  const levelCompleted = useRef<boolean>(false);

  // Zen Mode State - Requirements 9.1, 9.2, 9.4
  const zenModeState = useRef<ZenMode.ZenModeState>(
    ZenMode.createInitialZenModeState()
  );

  // Ghost Racer State - Requirements 15.1, 15.2, 15.3, 15.4
  const ghostRacerState = useRef<GhostRacer.GhostRacerState>(
    GhostRacer.createInitialGhostRacerState()
  );
  const lastGhostRecordTime = useRef<number>(0);
  const savedGhostTimeline = useRef<GhostRacer.GhostTimeline | null>(null);

  // Resonance System State - Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.9
  const resonanceState = useRef<ResonanceSystem.ResonanceState>(
    ResonanceSystem.createInitialResonanceState()
  );

  // S.H.I.F.T. Protocol State - Requirements 3.2, 3.3, 9.1
  const shiftState = useRef<ShiftProtocolState>(
    ShiftProtocol.initializeShiftState()
  );
  const collectibles = useRef<Collectible[]>([]);
  const framesSinceCollectibleSpawn = useRef<number>(0);

  // Pattern Manager State - Requirements 2.1, 2.2, 2.3, 2.4, 2.5
  const patternManagerState = useRef<PatternManager.PatternManagerState>(
    PatternManager.createPatternManagerState()
  );
  const patternStartTime = useRef<number>(0);
  const usePatternBasedSpawning = useRef<boolean>(true); // Enable pattern-based spawning
  const patternSequenceIndex = useRef<number>(0);

  // Deterministic RNG for run-local variety without Math.random() in core spawning
  const runRngState = useRef<number>(0);
  const nextRunRand = useCallback((): number => {
    // LCG (Numerical Recipes)
    runRngState.current = (runRngState.current * 1664525 + 1013904223) >>> 0;
    return runRngState.current / 4294967296;
  }, []);

  // Object Pool State - Requirements 6.1, 6.2, 6.3, 6.4, 6.5
  const obstaclePool = useRef<
    ObjectPool.ObjectPool<ObjectPool.PooledEngineObstacle>
  >(ObjectPool.createEngineObstaclePool());
  const shardPool = useRef<ObjectPool.ObjectPool<ObjectPool.PooledEngineShard>>(
    ObjectPool.createEngineShardPool()
  );

  // Active Shards from Pattern System - Requirements 5.1, 5.2, 5.3, 5.4, 5.5
  const activeShards = useRef<ShardPlacement.PlacedShard[]>([]);

  // Restore System State - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
  const restoreState = useRef<RestoreSystem.RestoreState>(
    RestoreSystem.createInitialRestoreState()
  );
  const pendingRestore = useRef<boolean>(false);
  const scoreAtDeath = useRef<number>(0);

  // Snapshot Buffer for System Restore - Requirements 7.1, 7.3
  // Circular buffer storing 180 snapshots (3 seconds at 60fps)
  const snapshotBuffer = useRef<SnapshotBuffer>(
    RestoreSystem.initializeSnapshotBuffer()
  );

  // Daily Rituals Tracking State - Requirements 3.7, 3.8, 3.9, 3.10
  const lastSwapTimeForRitual = useRef<number>(0);
  const speedSurvivalTime = useRef<number>(0);
  const noSwapSurvivalTime = useRef<number>(0);
  const lastRitualUpdateTime = useRef<number>(0);

  // Mission System: Distance tracking - Requirements 7.2
  const accumulatedDistance = useRef<number>(0);
  const lastDistanceEmitTime = useRef<number>(0);

  // Mission System: Lane stay tracking - Requirements 7.5
  const laneStayStartTime = useRef<number>(0);
  const lastLaneStayEmitTime = useRef<number>(0);

  // Mobile Controls State
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(true);
  const joystickRef = useRef<{
    active: boolean;
    startY: number;
    currentY: number;
  }>({
    active: false,
    startY: 0,
    currentY: 0,
  });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);

  // New Mobile Touch Control State - Hold to move, release to swap
  const touchControlRef = useRef<{
    active: boolean;
    startY: number;
    currentY: number;
    touchId: number | null;
    hasMoved: boolean; // Track if user moved significantly
  }>({
    active: false,
    startY: 0,
    currentY: 0,
    touchId: null,
    hasMoved: false,
  });

  // Echo Constructs - InputState for construct-specific input handling
  // Requirements 5.2: Track touch Y coordinate for Blink ghost positioning
  const inputStateRef = useRef<InputState>({
    isPressed: false,
    y: 0,
    isTapFrame: false,
    isReleaseFrame: false,
  });
  // Track previous frame's pressed state to detect tap/release frames
  const prevInputPressed = useRef<boolean>(false);

  // Echo Constructs System State - Requirements 2.1, 7.1, 7.2, 7.3
  const constructSystemState = useRef<ConstructSystem.ConstructSystemState>(
    ConstructSystem.createConstructSystemState()
  );

  // Glitch Tokens for Construct transformation - Requirements 1.1, 1.2, 1.3, 1.4
  const glitchTokens = useRef<GlitchTokenSpawner.GlitchToken[]>([]);
  const framesSinceGlitchTokenSpawn = useRef<number>(0);

  // Echo Constructs VFX State - Requirements 3.5, 4.5, 5.6, 2.2, 6.4, 6.6, 6.8
  const constructRenderState = useRef<ConstructRenderer.ConstructRenderState>(
    ConstructRenderer.createConstructRenderState()
  );
  const transformationVFXState = useRef<TransformationVFX.TransformationVFXState>(
    TransformationVFX.createTransformationVFXState()
  );
  const secondChanceVFXState = useRef<SecondChanceVFX.SecondChanceVFXState>(
    SecondChanceVFX.createSecondChanceVFXState()
  );

  const resetGame = useCallback(() => {
    // Apply starting score from upgrades - Requirements 6.1
    const upgradeEffects = getActiveUpgradeEffects();
    score.current = upgradeEffects.startingScore;

    // Campaign Mode: Apply speed modifier - Requirements 7.2
    let speedModifier =
      campaignMode?.enabled && campaignMode.levelConfig
        ? campaignMode.levelConfig.modifiers.speedMultiplier
        : 1;

    // Zone modifier (endless) - Phase 2
    if (zoneConfig) {
      speedModifier *= zoneConfig.modifiers.speedMultiplier;
    }

    // Daily Challenge Mode: Apply speed boost modifier - Requirements 8.2
    if (dailyChallengeMode?.enabled && dailyChallengeMode.config) {
      speedModifier *= dailyChallengeMode.config.modifiers.speedBoost;
    }

    speed.current = INITIAL_CONFIG.baseSpeed * speedModifier;

    // Store score multiplier from upgrades - Requirements 6.2
    scoreMultiplierUpgrade.current = upgradeEffects.scoreMultiplier;

    // Phase 2: Magnet + Shield
    magnetRadiusFactorUpgrade.current = upgradeEffects.magnetRadiusFactor;
    shieldChargesRemaining.current = Math.max(
      0,
      Math.floor(upgradeEffects.shieldCharges)
    );
    shieldInvincibleUntil.current = 0;

    // Reset slow motion state - Requirements 6.4
    slowMotionState.current = SlowMotion.createInitialSlowMotionState(
      upgradeEffects.slowMotionUses
    );
    slowMotionStartTime.current = 0;
    obstacles.current = [];
    particles.current = [];
    framesSinceSpawn.current = 0;

    // Campaign Mode: Apply spawn rate modifier - Requirements 7.2
    let spawnRateModifier =
      campaignMode?.enabled && campaignMode.levelConfig
        ? campaignMode.levelConfig.modifiers.spawnRateMultiplier
        : 1;

    // Zone modifier (endless) - Phase 2
    if (zoneConfig) {
      spawnRateModifier *= zoneConfig.modifiers.spawnRateMultiplier;
    }

    // Daily Challenge Mode: Apply double obstacles modifier - Requirements 8.2
    if (
      dailyChallengeMode?.enabled &&
      dailyChallengeMode.config?.modifiers.doubleObstacles
    ) {
      spawnRateModifier *= 2; // Double spawn rate = half the time between spawns
    }

    currentSpawnRate.current = INITIAL_CONFIG.spawnRate / spawnRateModifier;
    playerY.current = 0.5;
    targetPlayerY.current = 0.5;
    currentConnectorLength.current = INITIAL_CONFIG.minConnectorLength;

    // Reset Swap
    isSwapped.current = false;
    rotationAngle.current = 0;
    targetRotation.current = 0;
    lastSwapTime.current = 0;
    isPhasing.current = false;

    // Reset Near Miss State - Requirements 3.1
    nearMissState.current = createInitialNearMissState();
    scorePopups.current = [];
    visualEffects.current = [];

    // Reset Campaign Mode State - Requirements 7.3
    levelCompleted.current = false;

    // Reset Rhythm State - Requirements 1.1
    rhythmState.current = createInitialRhythmState();

    // Reset Gravity State - Requirements 2.1
    gravityState.current = createInitialGravityState();

    // Reset Midline State - Requirements 4.1, 4.9
    midlineState.current = createInitialMidlineState(window.innerHeight);
    gameStartTime.current = Date.now();

    onScoreUpdate(score.current);
    setGameSpeedDisplay(INITIAL_CONFIG.baseSpeed);

    // Reset UI state indicators
    onRhythmStateUpdate?.(1, 0);
    onNearMissStateUpdate?.(0);
    onSlowMotionStateUpdate?.(false);

    // Reset tension visual effect
    tensionIntensityRef.current = 0;

    // Reset ParticleSystem - Requirements 12.5
    ParticleSystem.reset();

    // Reset ScreenShake - Requirements 10.4
    ScreenShake.reset();

    // Reset Chromatic Aberration - Requirements 11.3
    ChromaticAberration.reset();

    // Reset Orb Trail System
    OrbTrailSystem.resetTrails();


    // Reset/Initialize Zen Mode State - Requirements 9.1, 9.2, 9.4
    if (zenMode?.enabled) {
      zenModeState.current = ZenMode.activateZenMode(
        ZenMode.createInitialZenModeState()
      );
      // In Zen Mode, score is disabled - Requirements 9.1
      score.current = 0;
    } else {
      zenModeState.current = ZenMode.createInitialZenModeState();
    }

    // Ghost Racer Initialization - Requirements 15.1, 15.4
    if (ghostRacerMode?.enabled) {
      // Load saved ghost timeline
      savedGhostTimeline.current = GhostRacer.loadTimeline();
      // Start recording new timeline
      ghostRacerState.current = GhostRacer.startRecording(
        GhostRacer.createInitialGhostRacerState(),
        Date.now()
      );
      lastGhostRecordTime.current = 0;
    } else {
      ghostRacerState.current = GhostRacer.createInitialGhostRacerState();
      savedGhostTimeline.current = null;
    }

    // Reset Resonance State - Requirements 1.1
    resonanceState.current = ResonanceSystem.createInitialResonanceState();

    // Reset S.H.I.F.T. Protocol State - Requirements 1.3, 1.4
    shiftState.current = ShiftProtocol.initializeShiftState();
    collectibles.current = [];
    framesSinceCollectibleSpawn.current = 0;

    // Reset Pattern Manager State - Requirements 2.1, 2.2, 2.3, 2.4, 2.5
    patternManagerState.current = PatternManager.createPatternManagerState();
    patternStartTime.current = 0;
    patternSequenceIndex.current = 0;
    runRngState.current = Date.now() >>> 0 || 1;

    // Reset Object Pools - Requirements 6.1, 6.2, 6.3, 6.4, 6.5
    obstaclePool.current.reset();
    shardPool.current.reset();

    // Reset Active Shards - Requirements 5.1, 5.2, 5.3, 5.4, 5.5
    activeShards.current = [];

    // Reset Restore State - Requirements 2.1, 2.8
    restoreState.current = RestoreSystem.createInitialRestoreState();
    pendingRestore.current = false;
    scoreAtDeath.current = 0;

    // Reset Snapshot Buffer - Requirements 7.1, 7.4
    snapshotBuffer.current = RestoreSystem.initializeSnapshotBuffer();

    // Reset Daily Rituals Tracking State - Requirements 3.7, 3.8, 3.9, 3.10
    lastSwapTimeForRitual.current = Date.now();
    speedSurvivalTime.current = 0;
    noSwapSurvivalTime.current = 0;
    lastRitualUpdateTime.current = 0;
    onRestoreStateUpdate?.(true, false);

    // Reset Mission System Distance Tracking - Requirements 7.2
    accumulatedDistance.current = 0;
    lastDistanceEmitTime.current = 0;

    // Reset Mission System Lane Stay Tracking - Requirements 7.5
    laneStayStartTime.current = Date.now();
    lastLaneStayEmitTime.current = 0;

    // Reset Echo Constructs System State - Requirements 7.1, 7.5
    constructSystemState.current = ConstructSystem.resetConstructSystem();
    glitchTokens.current = [];
    framesSinceGlitchTokenSpawn.current = 0;
    inputStateRef.current = {
      isPressed: false,
      y: 0,
      isTapFrame: false,
      isReleaseFrame: false,
    };
    prevInputPressed.current = false;

    // Reset Echo Constructs VFX State - Requirements 3.5, 4.5, 5.6, 2.2, 6.4, 6.6, 6.8
    constructRenderState.current = ConstructRenderer.createConstructRenderState();
    transformationVFXState.current = TransformationVFX.createTransformationVFXState();
    secondChanceVFXState.current = SecondChanceVFX.createSecondChanceVFXState();
  }, [
    onScoreUpdate,
    setGameSpeedDisplay,
    onRhythmStateUpdate,
    onNearMissStateUpdate,
    onSlowMotionStateUpdate,
    campaignMode,
    dailyChallengeMode,
    zenMode,
    ghostRacerMode,
    onRestoreStateUpdate,
  ]);

  // ============================================================================
  // BLOK SPAWN SİSTEMİ - KRİTİK KURALLAR:
  // 1. Bloklar SIFIR ÇİZGİSİNİ (midY) GEÇMELİ
  // 2. Üst blok BEYAZ ise alt blok SİYAH olmalı (ZIT RENKLER)
  // 3. Aralarındaki boşluk = oyuncunun max uzanabileceği mesafe (connectorLength)
  // ============================================================================

  /**
   * Gap center helper:
   * - Bloklar sıfır noktasını (midline) GEÇECEK şekilde konumlandırılır
   * - Geçiş miktarı connector uzunluğuna bağlıdır: uzun çubuk = daha fazla geçiş
   * - Gap'in tamamı ekranda kalır (kenarlarda "kağıt inceliği" oluşmaz)
   * 
   * SIFIR GEÇİŞ FORMÜLÜ:
   * - midY = canvas yüksekliğinin yarısı (sıfır çizgisi)
   * - maxCrossDistance = connectorLen * crossFactor (çubuk uzunluğuna bağlı max geçiş)
   * - Gap merkezi, midY'den maxCrossDistance kadar aşağı veya yukarı gidebilir
   */
  const computeGapCenter = useCallback(
    (canvasHeight: number, halfGap: number, ratio: number, connectorLen: number) => {
      const clamped = Math.max(0, Math.min(1, ratio));
      const midY = canvasHeight / 2;
      const edgeMargin = 30; // Kenar güvenlik payı (küçültüldü)

      // Çubuk uzunluğuna bağlı sıfır geçiş miktarı
      // crossFactor: 0.6 = çubuk uzunluğunun %60'ı kadar midline'ı geçebilir (daha geniş alan)
      const crossFactor = 0.6;
      const maxCrossDistance = connectorLen * crossFactor;

      // Gap merkezi sınırları:
      // - Ekran kenarından halfGap + edgeMargin kadar içeride kalmalı
      // - Midline'dan maxCrossDistance kadar uzaklaşabilir
      const screenMin = halfGap + edgeMargin;
      const screenMax = canvasHeight - halfGap - edgeMargin;

      // Midline'ı geçebilecek alan
      const crossMin = midY - maxCrossDistance;
      const crossMax = midY + maxCrossDistance;

      // Her iki kısıtlamayı da uygula
      const minCenter = Math.max(screenMin, crossMin);
      const maxCenter = Math.min(screenMax, crossMax);

      if (maxCenter <= minCenter) return midY;
      return minCenter + (maxCenter - minCenter) * clamped;
    },
    []
  );

  const spawnObstacle = (canvasHeight: number, canvasWidth: number) => {
    const obsWidth = INITIAL_CONFIG.obstacleWidth;
    const spawnX = canvasWidth + 50;
    const midY = canvasHeight / 2; // Merkez çizgi (SIFIR NOKTASI)
    const orbRadius = INITIAL_CONFIG.orbRadius;
    const connectorLen = currentConnectorLength.current;

    // OYUN MEKANİĞİ:
    // 1. Bloklar sıfır noktasını (midline) AGRESİF şekilde GEÇMELİ
    // 2. Aynı renkli top, aynı renkli blokun içinden geçer (hasar almaz)
    // 3. Zıt renkli top, bloka değerse ölür
    // 4. Max geçiş = connector uzunluğu (oyuncunun uzanabileceği max nokta)

    // Minimum boşluk = connector + 2 orb + güvenlik payı (artırıldı)
    const minGap = connectorLen + orbRadius * 2 + 25;

    // Rastgele polarite - üst ve alt bloklar ZIT renklerde
    const topPolarity: "white" | "black" = Math.random() > 0.5 ? "white" : "black";
    const bottomPolarity: "white" | "black" = topPolarity === "white" ? "black" : "white";

    // === DAHA YUMUŞAK SIFIR GEÇİŞ MEKANİĞİ ===
    // maxCrossDistance = connector uzunluğu - orb yarıçapı (oyuncunun max erişimi)
    const maxCrossDistance = connectorLen - orbRadius;

    // Rastgele geçiş miktarı: %15 ile %60 arası (daha kolay başlangıç)
    // Skor arttıkça zorluk artacak
    const difficultyFactor = Math.min(1, score.current / 3000); // 3000 skorda max zorluk
    const minCross = 0.15 + difficultyFactor * 0.15; // 0.15 -> 0.30
    const maxCross = 0.45 + difficultyFactor * 0.25; // 0.45 -> 0.70
    const crossAmount = minCross + Math.random() * (maxCross - minCross);
    const actualCross = crossAmount * maxCrossDistance;

    // TAM RASTGELE YÖN: %50 üst aşağı geçer, %50 alt yukarı geçer
    const crossFromTop = Math.random() > 0.5;

    // Blok yükseklikleri hesapla
    let topBlockHeight: number;
    let bottomBlockTop: number;
    let bottomBlockHeight: number;

    if (crossFromTop) {
      // ÜST BLOK AŞAĞI DOĞRU SIFIRI GEÇİYOR
      // Üst blok midY + actualCross kadar aşağı uzanır
      topBlockHeight = midY + actualCross;
      // Alt blok üst bloğun altından minGap kadar aşağıda başlar
      bottomBlockTop = topBlockHeight + minGap;
      bottomBlockHeight = Math.max(30, canvasHeight - bottomBlockTop);
    } else {
      // ALT BLOK YUKARI DOĞRU SIFIRI GEÇİYOR
      // Alt blok midY - actualCross'tan başlar (yukarı doğru uzanır)
      bottomBlockTop = midY - actualCross;
      bottomBlockHeight = canvasHeight - bottomBlockTop;
      // Üst blok alt bloğun üstünden minGap kadar yukarıda biter
      topBlockHeight = Math.max(30, bottomBlockTop - minGap);
    }

    // Güvenlik: ekran sınırları içinde kal
    topBlockHeight = Math.max(30, topBlockHeight);
    bottomBlockTop = Math.min(canvasHeight - 30, Math.max(30, bottomBlockTop));
    bottomBlockHeight = Math.max(30, canvasHeight - bottomBlockTop);

    // --- LANE INVERSION FOR GRAVITY FLIP ---
    const isGravityFlipped = gravityState.current.isFlipped;
    const topLane: "top" | "bottom" = isGravityFlipped ? getFlippedLane("top") : "top";
    const bottomLane: "top" | "bottom" = isGravityFlipped ? getFlippedLane("bottom") : "bottom";

    let topObstacle: Obstacle = {
      id: Math.random().toString(36).substring(2, 11),
      x: spawnX,
      y: -topBlockHeight,
      targetY: 0,
      width: obsWidth,
      height: topBlockHeight,
      lane: topLane,
      polarity: topPolarity,
      passed: false,
    };

    // Phantom check
    const phantomEnabled =
      !campaignMode?.enabled ||
      campaignMode.levelConfig?.mechanics.phantom !== false;
    const forcePhantom =
      dailyChallengeMode?.enabled &&
      dailyChallengeMode.config?.modifiers.phantomOnly;
    if (
      forcePhantom ||
      (phantomEnabled && shouldSpawnAsPhantom(score.current, PHANTOM_CONFIG))
    ) {
      topObstacle = createPhantomObstacle(topObstacle, spawnX, PHANTOM_CONFIG);
    }
    obstacles.current.push(topObstacle);

    let bottomObstacle: Obstacle = {
      id: Math.random().toString(36).substring(2, 11),
      x: spawnX,
      y: canvasHeight,
      targetY: bottomBlockTop,
      width: obsWidth,
      height: bottomBlockHeight,
      lane: bottomLane,
      polarity: bottomPolarity,
      passed: false,
    };

    // Phantom check
    if (
      forcePhantom ||
      (phantomEnabled && shouldSpawnAsPhantom(score.current, PHANTOM_CONFIG))
    ) {
      bottomObstacle = createPhantomObstacle(
        bottomObstacle,
        spawnX,
        PHANTOM_CONFIG
      );
    }
    obstacles.current.push(bottomObstacle);
  };

  // Son spawn edilen bloğun polaritesini ve boşluk bilgisini takip et
  const lastSpawnedPolarity = useRef<"white" | "black" | null>(null);
  const lastGapCenter = useRef<number>(0);
  const lastHalfGap = useRef<number>(0);
  // Mobile readability: keep polarity stable within a pattern (and across a few patterns)
  const patternPolarity = useRef<"white" | "black">("white");
  const shardSpawnSequence = useRef<number>(0);
  // Aynı renk üst üste 4 kere gelmesin
  const consecutivePolarityCount = useRef<number>(0);
  const lastTopPolarity = useRef<"white" | "black">("white");

  // Pattern-Based Obstacle Spawn
  // BLOK SPAWN - İKİ BLOK BİRLİKTE (BEYAZ + SİYAH)
  // KRİTİK KURAL: Bir blok sıfırı geçerse, sıfırdan itibaren max uzunluğu = çubuk uzunluğu - orb
  // Bu sayede ters renkteki orbu her zaman kaçırabilirsin
  const spawnPatternObstacle = (
    lane: Lane,
    heightRatio: number,
    canvasHeight: number,
    canvasWidth: number
  ) => {
    // Sadece TOP çağrıldığında ikisini birden spawn et
    if (lane !== "TOP") return;

    const obsWidth = INITIAL_CONFIG.obstacleWidth;
    const spawnX = canvasWidth + 50;
    const midY = canvasHeight / 2;
    const orbRadius = INITIAL_CONFIG.orbRadius;
    const connectorLen = currentConnectorLength.current;

    // MAX SIFIR GEÇİŞ = çubuk uzunluğunun yarısı - orb yarıçapı
    // Bu, ters orbu kaçırabilmen için gereken maksimum mesafe
    // GÜNCELLEME: Daha uzun geçiş = daha dinamik oyun
    const maxCrossing = connectorLen / 2 - orbRadius + 8; // Artırıldı

    // BOŞLUK = çubuk uzunluğu + orb çapları (geçilebilir)
    const minGap = connectorLen + orbRadius * 2 + 9;

    // RASTGELE POLARİTE - ama aynı renk üst üste 4 kere gelmesin
    let topPolarity: "white" | "black" = nextRunRand() > 0.5 ? "white" : "black";
    
    // Eğer aynı renk 3 kere üst üste geldiyse, zorla değiştir
    if (topPolarity === lastTopPolarity.current) {
      consecutivePolarityCount.current++;
      if (consecutivePolarityCount.current >= 3) {
        // Zorla ters renk yap
        topPolarity = topPolarity === "white" ? "black" : "white";
        consecutivePolarityCount.current = 0;
      }
    } else {
      consecutivePolarityCount.current = 0;
    }
    lastTopPolarity.current = topPolarity;
    
    const bottomPolarity: "white" | "black" = topPolarity === "white" ? "black" : "white";

    // RASTGELE GAP TİPİ:
    // 0: Alt blok sıfırı yukarı geçiyor (gap üstte) - %37.5
    // 1: Üst blok sıfırı aşağı geçiyor (gap altta) - %37.5
    // 2: İkisi de sıfıra değmiyor (gap ortada) - %25
    // Toplam %75 sıfır geçişi olasılığı
    const rand = nextRunRand();
    const gapType = rand < 0.375 ? 0 : rand < 0.75 ? 1 : 2;

    let topBlockHeight: number;
    let bottomBlockTop: number;

    if (gapType === 0) {
      // ALT BLOK SIFIRI GEÇİYOR (yukarı doğru uzanıyor)
      // Alt blok sıfırın üstüne çıkıyor
      const crossAmount = 0.3 * maxCrossing + nextRunRand() * 0.7 * maxCrossing; // %30-%100 arası geçiş
      bottomBlockTop = midY - crossAmount; // Sıfırın üstüne çıkıyor
      // Üst blok: alt bloğun üstünde, minGap kadar boşluk bırakarak
      topBlockHeight = bottomBlockTop - minGap;
    } else if (gapType === 1) {
      // ÜST BLOK SIFIRI GEÇİYOR (aşağı doğru uzanıyor)
      // Üst blok sıfırın altına iniyor
      const crossAmount = 0.3 * maxCrossing + nextRunRand() * 0.7 * maxCrossing; // %30-%100 arası geçiş
      topBlockHeight = midY + crossAmount; // Sıfırın altına iniyor
      // Alt blok: üst bloğun altında, minGap kadar boşluk bırakarak
      bottomBlockTop = topBlockHeight + minGap;
    } else {
      // İKİSİ DE SIFIRA DEĞMİYOR (gap ortada)
      const offset = (nextRunRand() - 0.5) * 60; // Rastgele kayma
      topBlockHeight = midY - minGap / 2 + offset - 10; // Sıfıra değmiyor
      bottomBlockTop = midY + minGap / 2 + offset + 10; // Sıfıra değmiyor
    }

    // Ekran sınırları kontrolü (ama gap'i bozmadan)
    if (topBlockHeight < 15) {
      topBlockHeight = 15;
      bottomBlockTop = topBlockHeight + minGap;
    }
    if (bottomBlockTop > canvasHeight - 15) {
      bottomBlockTop = canvasHeight - 15;
      topBlockHeight = bottomBlockTop - minGap;
    }

    // Shard spawn için kaydet
    lastGapCenter.current = (topBlockHeight + bottomBlockTop) / 2;
    lastHalfGap.current = (bottomBlockTop - topBlockHeight) / 2;
    lastSpawnedPolarity.current = topPolarity;

    // ÜST BLOK
    if (topBlockHeight > 15) {
      const topPooled = obstaclePool.current.acquire();
      topPooled.x = spawnX;
      topPooled.y = -topBlockHeight;
      topPooled.targetY = 0;
      topPooled.width = obsWidth;
      topPooled.height = topBlockHeight;
      topPooled.lane = gravityState.current.isFlipped ? "bottom" : "top";
      topPooled.polarity = topPolarity;
      topPooled.passed = false;
      topPooled.nearMissChecked = false;
      topPooled.hasPhased = false;
      topPooled.isLatent = false;
      topPooled.initialX = spawnX;

      const phantomEnabled = !campaignMode?.enabled || campaignMode.levelConfig?.mechanics.phantom !== false;
      const forcePhantom = dailyChallengeMode?.enabled && dailyChallengeMode.config?.modifiers.phantomOnly;
      if (forcePhantom || (phantomEnabled && shouldSpawnAsPhantom(score.current, PHANTOM_CONFIG))) {
        obstacles.current.push(createPhantomObstacle(topPooled, spawnX, PHANTOM_CONFIG));
      } else {
        obstacles.current.push(topPooled);
      }
    }

    // ALT BLOK
    const bottomBlockHeight = canvasHeight - bottomBlockTop;
    if (bottomBlockHeight > 15) {
      const bottomPooled = obstaclePool.current.acquire();
      bottomPooled.x = spawnX;
      bottomPooled.y = canvasHeight;
      bottomPooled.targetY = bottomBlockTop;
      bottomPooled.width = obsWidth;
      bottomPooled.height = bottomBlockHeight;
      bottomPooled.lane = gravityState.current.isFlipped ? "top" : "bottom";
      bottomPooled.polarity = bottomPolarity;
      bottomPooled.passed = false;
      bottomPooled.nearMissChecked = false;
      bottomPooled.hasPhased = false;
      bottomPooled.isLatent = false;
      bottomPooled.initialX = spawnX;

      const phantomEnabled = !campaignMode?.enabled || campaignMode.levelConfig?.mechanics.phantom !== false;
      const forcePhantom = dailyChallengeMode?.enabled && dailyChallengeMode.config?.modifiers.phantomOnly;
      if (forcePhantom || (phantomEnabled && shouldSpawnAsPhantom(score.current, PHANTOM_CONFIG))) {
        obstacles.current.push(createPhantomObstacle(bottomPooled, spawnX, PHANTOM_CONFIG));
      } else {
        obstacles.current.push(bottomPooled);
      }
    }
  };

  // Pattern-Based Shard Spawn - Requirements 5.1, 5.2, 5.3
  // DÜZELTME: midlineY tabanlı "Erişilebilirlik Alanı" hesaplaması
  // DİNAMİK HAREKET: Elmaslar yukarı-aşağı ve ileri-geri hareket eder
  // GÜNCELLEME: Bonus shard tipi eklendi - patlayarak ekstra ödül verir
  const spawnPatternShard = (
    lane: Lane,
    type: "safe" | "risky",
    canvasHeight: number,
    canvasWidth: number
  ) => {
    shardSpawnSequence.current += 1;
    // Mobile clarity: cap shards on screen (deterministic budget)
    const maxActiveShards =
      score.current < 800 ? 1 : score.current < 2500 ? 2 : 4; // Artırıldı
    if (activeShards.current.length >= maxActiveShards) return;

    // Delay risky shards until player is warmed up
    if (type === "risky" && score.current < 1200) return;

    // Early game: reduce shard frequency (still deterministic)
    if (score.current < 800 && shardSpawnSequence.current % 2 === 1) return;

    const spawnX = canvasWidth + 50;
    const midY = canvasHeight / 2; // Merkez çizgi (midlineY)

    // Use current gate geometry if available (pattern-defined gap center)
    const gapCenter = lastGapCenter.current || midY;
    const halfGap = lastHalfGap.current || INITIAL_CONFIG.orbRadius + 10;
    const riskyEdge = 12;

    // BONUS SHARD: %15 şansla bonus shard spawn et (1500+ skor sonrası)
    let actualType: "safe" | "risky" | "bonus" = type;
    if (score.current >= 1500 && nextRunRand() < 0.15) {
      actualType = "bonus";
    }

    let y: number;
    if (actualType === "safe") {
      // Safe shard: center of the passable gap (easy pickup, learnable)
      y = gapCenter;
    } else if (actualType === "bonus") {
      // Bonus shard: gap içinde rastgele konum (zor yakalanır)
      const bonusOffset = (nextRunRand() - 0.5) * halfGap * 0.8;
      y = gapCenter + bonusOffset;
    } else {
      // Risky shard: hug the edge of the gap in the requested lane
      y =
        lane === "TOP"
          ? gapCenter - halfGap + riskyEdge
          : gapCenter + halfGap - riskyEdge;
    }

    // Ekran sınırlarını kontrol et
    y = Math.max(20, Math.min(canvasHeight - 20, y));

    // Dinamik hareket parametreleri oluştur
    const movement = ShardPlacement.generateShardMovement(actualType, nextRunRand);

    const pooled = shardPool.current.acquire();
    pooled.x = spawnX;
    pooled.y = y;
    pooled.baseX = spawnX;
    pooled.baseY = y;
    pooled.lane = lane;
    pooled.type = actualType;
    // Bonus shardlar 3x değer verir
    pooled.value = actualType === "bonus" 
      ? ShardPlacement.DEFAULT_SHARD_CONFIG.baseShardValue * 3 
      : ShardPlacement.DEFAULT_SHARD_CONFIG.baseShardValue;
    pooled.collected = false;
    pooled.movement = movement;
    pooled.spawnTime = Date.now();
    (pooled as ShardPlacement.PlacedShard).isBonus = actualType === "bonus";
    activeShards.current.push(pooled);
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 20; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        color,
      });
    }
  };

  // Swap Effect - Requirements 12.2: Emit burst of particles at swap location
  const createSwapEffect = (x: number, y: number) => {
    // Use new ParticleSystem for burst effect
    const accentColor = getColor("accent");
    ParticleSystem.emitBurst(x, y, [accentColor, "#FFFFFF", "#FF00FF"]);

    // Also add to legacy particles for backward compatibility
    for (let i = 0; i < 8; i++) {
      particles.current.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0.5,
        color: "rgba(0, 240, 255, 0.6)",
      });
    }
  };

  // Near Miss Visual Effects - Requirements 3.3, 3.4, 3.5, 3.9
  const createNearMissEffect = (
    orbX: number,
    orbY: number,
    closestPoint: { x: number; y: number },
    isStreakBonus: boolean
  ) => {
    // Theme System Integration - Requirements 5.1, 5.2, 5.3
    const accentColor = getColor("accent");

    // Haptic Feedback: Medium pulse for near miss - Requirements 4.3
    getHapticSystem().trigger("medium");

    // Audio: Near miss sound - Phase 4
    if (isStreakBonus) {
      AudioSystem.playStreakBonus();
    } else {
      AudioSystem.playNearMiss();
    }

    // Screen Shake on near miss - Requirements 10.2
    if (isStreakBonus) {
      ScreenShake.triggerStreakBonus();
    } else {
      ScreenShake.triggerNearMiss();
    }

    // Requirements 3.3: Floating score popup (+20)
    scorePopups.current.push({
      x: orbX,
      y: orbY - 20,
      text: "+20",
      color: accentColor,
      life: 1.0,
      vy: -2,
    });

    // Requirements 3.4: Accent glow pulse effect around the orb
    visualEffects.current.push({
      type: "glow",
      x: orbX,
      y: orbY,
      life: 1.0,
      color: accentColor,
      scale: 1.0,
    });

    // Requirements 3.5, 12.3: Spark particles from closest point using ParticleSystem
    ParticleSystem.emitSpark(closestPoint.x, closestPoint.y, [
      accentColor,
      "#FFD700",
      "#FFA500",
    ]);

    // Also add to legacy particles for backward compatibility
    const sparkCount = Math.floor(randomRange(5, 9));
    for (let i = 0; i < sparkCount; i++) {
      particles.current.push({
        x: closestPoint.x,
        y: closestPoint.y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 0.8,
        color: accentColor,
      });
    }

    // Requirements 3.8, 3.9: "PERFECT DODGE!" text and golden burst for streak bonus
    if (isStreakBonus) {
      scorePopups.current.push({
        x: orbX,
        y: orbY - 50,
        text: "PERFECT DODGE!",
        color: "#FFD700", // Golden color
        life: 1.5,
        vy: -1.5,
      });

      // Requirements 3.9: Enhanced golden particle burst
      for (let i = 0; i < 12; i++) {
        particles.current.push({
          x: orbX,
          y: orbY,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 12,
          life: 1.0,
          color: "#FFD700",
        });
      }

      visualEffects.current.push({
        type: "burst",
        x: orbX,
        y: orbY,
        life: 1.0,
        color: "#FFD700",
        scale: 1.5,
      });
    }
  };

  // Input Handling
  const triggerSwap = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const now = Date.now();
    if (now - lastSwapTime.current < INITIAL_CONFIG.swapCooldown) return;

    isSwapped.current = !isSwapped.current;
    targetRotation.current = isSwapped.current ? Math.PI : 0;
    lastSwapTime.current = now;
    isPhasing.current = true; // Invincibility ON

    // Haptic Feedback: Light pulse for swap action - Requirements 4.1
    getHapticSystem().trigger("light");
    // Audio: Swap sound - Phase 4
    AudioSystem.playSwap();

    // Mission System: Emit SWAP_COUNT event - Requirements 7.1
    onMissionEvent?.({ type: 'SWAP_COUNT', value: 1 });

    // Mission System: Emit STAY_LANE event for time spent in previous lane - Requirements 7.5
    const laneStayDuration = now - laneStayStartTime.current;
    if (laneStayDuration > 0) {
      onMissionEvent?.({ type: 'STAY_LANE', value: laneStayDuration });
    }
    laneStayStartTime.current = now; // Reset for new lane

    // Daily Rituals: Reset no-swap survival tracking
    lastSwapTimeForRitual.current = now;
    noSwapSurvivalTime.current = 0;

    createSwapEffect(
      window.innerWidth / 4,
      playerY.current * window.innerHeight
    );

    // End phasing after duration
    setTimeout(() => {
      isPhasing.current = false;
    }, INITIAL_CONFIG.swapDuration);
  }, [gameState, onMissionEvent]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Hide mobile hint after 4 seconds when game starts
  useEffect(() => {
    if (gameState === GameState.PLAYING && isMobile) {
      setShowMobileHint(true);
      const timer = setTimeout(() => {
        setShowMobileHint(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [gameState, isMobile]);

  // Joystick handlers - Using native event listeners to avoid passive event issues
  const handleJoystickStartNative = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (gameState !== GameState.PLAYING) return;
      e.preventDefault();
      e.stopPropagation();

      const clientY =
        "touches" in e
          ? (e as TouchEvent).touches[0].clientY
          : (e as MouseEvent).clientY;
      joystickRef.current = {
        active: true,
        startY: clientY,
        currentY: clientY,
      };
    },
    [gameState]
  );

  const handleJoystickMoveNative = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!joystickRef.current.active || gameState !== GameState.PLAYING)
        return;
      e.preventDefault();
      e.stopPropagation();

      const clientY =
        "touches" in e
          ? (e as TouchEvent).touches[0].clientY
          : (e as MouseEvent).clientY;
      joystickRef.current.currentY = clientY;

      // Calculate joystick offset (clamped to -50 to 50 pixels)
      const maxOffset = 50;
      let offset = Math.max(
        -maxOffset,
        Math.min(maxOffset, clientY - joystickRef.current.startY)
      );

      // Daily Challenge Mode: Apply inverted controls - Requirements 8.2
      if (
        dailyChallengeMode?.enabled &&
        dailyChallengeMode.config?.modifiers.invertedControls
      ) {
        offset = -offset; // Invert joystick direction
      }

      // Update knob position visually
      if (joystickKnobRef.current) {
        joystickKnobRef.current.style.transform = `translate(-50%, calc(-50% + ${offset}px))`;
      }

      // Convert offset to player movement (-1 to 1, then to 0-1 range)
      const normalizedOffset = offset / maxOffset; // -1 to 1
      const currentY = playerY.current;
      const moveSpeed = 0.02; // How fast the player moves
      const newY = Math.max(
        0,
        Math.min(1, currentY + normalizedOffset * moveSpeed)
      );
      targetPlayerY.current = newY;
    },
    [gameState, dailyChallengeMode]
  );

  const handleJoystickEndNative = useCallback((e: TouchEvent | MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    joystickRef.current.active = false;

    // Reset knob position
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = "translate(-50%, -50%)";
    }
  }, []);

  // Swap button handler - Using native event listener
  const handleSwapButtonNative = useCallback(
    (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      triggerSwap();
    },
    [triggerSwap]
  );

  // New Mobile Touch Control - Hold anywhere to move up/down, release to swap
  const handleTouchControlStart = useCallback(
    (e: TouchEvent) => {
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

      // Update InputState for Construct system - Requirements 5.2
      inputStateRef.current = {
        ...inputStateRef.current,
        isPressed: true,
        y: touch.clientY,
        isTapFrame: true, // Will be cleared next frame
      };
    },
    [gameState, isMobile]
  );

  const handleTouchControlMove = useCallback(
    (e: TouchEvent) => {
      if (!touchControlRef.current.active || gameState !== GameState.PLAYING)
        return;
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

      // Daily Challenge Mode: Apply inverted controls - Requirements 8.2
      if (
        dailyChallengeMode?.enabled &&
        dailyChallengeMode.config?.modifiers.invertedControls
      ) {
        movement = -movement;
      }

      // Apply movement relative to current position
      const newY = Math.max(0, Math.min(1, playerY.current + movement));
      targetPlayerY.current = newY;

      // Update start position for continuous dragging
      touchControlRef.current.startY = touch.clientY;

      // Update InputState Y coordinate for Blink ghost - Requirements 5.2
      inputStateRef.current = {
        ...inputStateRef.current,
        y: touch.clientY,
      };
    },
    [gameState, isMobile, dailyChallengeMode]
  );

  const handleTouchControlEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchControlRef.current.active) return;
      if (!isMobile) return;

      // Check if this is the correct touch ending
      const touchEnded = !Array.from(e.touches).some(
        (t) => t.identifier === touchControlRef.current.touchId
      );
      if (!touchEnded) return;

      // Update InputState for Construct system - Requirements 5.3
      inputStateRef.current = {
        ...inputStateRef.current,
        isPressed: false,
        isReleaseFrame: true, // Will be cleared next frame
      };

      // Trigger swap on release (only if didn't move much - prevents accidental swaps)
      // Actually, always swap on release for the new mechanic
      triggerSwap();

      touchControlRef.current = {
        active: false,
        startY: 0,
        currentY: 0,
        touchId: null,
        hasMoved: false,
      };
    },
    [isMobile, triggerSwap]
  );

  // Attach native event listeners for new mobile touch control system
  // Hold anywhere to drag up/down, release to swap
  useEffect(() => {
    if (!isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // New touch control - entire screen
    canvas.addEventListener("touchstart", handleTouchControlStart, {
      passive: false,
    });
    canvas.addEventListener("touchmove", handleTouchControlMove, {
      passive: false,
    });
    canvas.addEventListener("touchend", handleTouchControlEnd, {
      passive: false,
    });
    canvas.addEventListener("touchcancel", handleTouchControlEnd, {
      passive: false,
    });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchControlStart);
      canvas.removeEventListener("touchmove", handleTouchControlMove);
      canvas.removeEventListener("touchend", handleTouchControlEnd);
      canvas.removeEventListener("touchcancel", handleTouchControlEnd);
    };
  }, [
    handleTouchControlStart,
    handleTouchControlMove,
    handleTouchControlEnd,
    isMobile,
    gameState,
  ]);

  useEffect(() => {
    const handleInputMove = (clientY: number) => {
      if (gameState !== GameState.PLAYING) return;
      if (!canvasRef.current) return;
      if (isMobile) return; // Skip for mobile - use joystick instead

      const rect = canvasRef.current.getBoundingClientRect();
      let y = Math.min(Math.max((clientY - rect.top) / rect.height, 0.0), 1.0);

      // Daily Challenge Mode: Apply inverted controls - Requirements 8.2
      if (
        dailyChallengeMode?.enabled &&
        dailyChallengeMode.config?.modifiers.invertedControls
      ) {
        y = 1.0 - y; // Invert Y position
      }

      targetPlayerY.current = y;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isMobile) return; // Skip for mobile - use joystick instead
      handleInputMove(e.touches[0].clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isMobile) return; // Skip for mobile
      handleInputMove(e.clientY);
      // Update InputState Y for Blink ghost on desktop - Requirements 5.2
      inputStateRef.current = {
        ...inputStateRef.current,
        y: e.clientY,
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      if (isMobile) return;
      // Update InputState for Construct system - Requirements 5.2
      inputStateRef.current = {
        ...inputStateRef.current,
        isPressed: true,
        y: e.clientY,
        isTapFrame: true,
      };
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isMobile) return;
      // Update InputState for Construct system - Requirements 5.3
      inputStateRef.current = {
        ...inputStateRef.current,
        isPressed: false,
        isReleaseFrame: true,
      };
    };

    const onClick = (e: MouseEvent) => {
      if (isMobile) return; // Skip for mobile - use swap button instead
      triggerSwap();
    };

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("click", onClick);
    };
  }, [gameState, triggerSwap, isMobile]);

  // Main Loop
  useEffect(() => {
    if (gameState === GameState.MENU) {
      resetGame();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Theme System Integration - Requirements 5.1, 5.2, 5.3
        ctx.fillStyle = getColor("topBg");
        ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
        ctx.fillStyle = getColor("bottomBg");
        ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

        const cx = canvas.width / 3;
        const cy = canvas.height / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 40);
        ctx.lineTo(cx, cy + 40);
        ctx.strokeStyle = getColor("connector");
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy - 40, 15, 0, Math.PI * 2);
        ctx.fillStyle = getColor("topOrb");
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy + 40, 15, 0, Math.PI * 2);
        ctx.fillStyle = getColor("bottomOrb");
        ctx.fill();
      }
      return;
    }

    if (gameState === GameState.PAUSED) {
      // Paused - don't reset, just stop the loop
      return;
    }

    if (gameState !== GameState.PLAYING) return;
    console.log("[GAME] Starting game loop, gameState:", gameState);
    resetGame();

    const loop = () => {
      // Skip main loop if restore animation is playing
      if (isRestoreAnimating.current) {
        frameId.current = requestAnimationFrame(loop);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (
        canvas.width !== window.innerWidth ||
        canvas.height !== window.innerHeight
      ) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const width = canvas.width;
      const height = canvas.height;
      const halfHeight = height / 2;

      // --- UPDATE LOGIC ---

      // --- INPUT STATE FRAME MANAGEMENT - Requirements 5.2 ---
      // Clear tap/release frame flags from previous frame
      if (inputStateRef.current.isTapFrame) {
        inputStateRef.current = { ...inputStateRef.current, isTapFrame: false };
      }
      if (inputStateRef.current.isReleaseFrame) {
        inputStateRef.current = { ...inputStateRef.current, isReleaseFrame: false };
      }

      // --- SLOW MOTION UPDATE - Requirements 6.4 ---
      const gameTime = Date.now();

      // Handle slow motion activation from props
      if (
        slowMotionActive &&
        !slowMotionState.current.isActive &&
        slowMotionState.current.usesRemaining >= 0
      ) {
        slowMotionState.current = SlowMotion.activateSlowMotion(
          slowMotionState.current,
          gameTime
        );
        slowMotionStartTime.current = gameTime;
      }

      // Update slow motion state
      if (slowMotionState.current.isActive) {
        slowMotionState.current = SlowMotion.updateSlowMotion(
          slowMotionState.current,
          gameTime
        );

        // Notify parent if slow motion ended
        if (!slowMotionState.current.isActive) {
          onSlowMotionStateUpdate?.(false);
        }
      }

      // Get current speed multiplier (1.0 normally, 0.5 during slow motion)
      const slowMotionMultiplier = SlowMotion.getSpeedMultiplier(
        slowMotionState.current
      );

      // --- CONSTRUCT SYSTEM UPDATE - Requirements 2.3, 2.4, 3.1, 4.1, 4.6, 5.1 ---
      // Update construct system state (check invincibility expiration)
      constructSystemState.current = ConstructSystem.updateConstructState(
        constructSystemState.current,
        gameTime
      );

      // Get construct speed multiplier (1.0 for Standard/Titan/Blink, 1.2 for Phase)
      const constructSpeedMultiplier = constructSystemState.current.currentStrategy.getSpeedMultiplier();

      // Get construct gravity multiplier (1.0 for Standard, 2.5 for Titan, 0 for Phase/Blink)
      const constructGravityMultiplier = constructSystemState.current.currentStrategy.getGravityMultiplier();

      // --- CONSTRUCT VFX UPDATE - Requirements 3.5, 4.5, 5.6, 2.2, 6.4, 6.8 ---
      // Update transformation VFX
      transformationVFXState.current = TransformationVFX.updateTransformationVFX(
        transformationVFXState.current,
        Date.now()
      );
      
      // Update Second Chance VFX
      secondChanceVFXState.current = SecondChanceVFX.updateSecondChanceVFX(
        secondChanceVFXState.current,
        Date.now()
      );

      playerY.current += (targetPlayerY.current - playerY.current) * 0.15;

      // Dynamic Connector Growth
      const targetLen = Math.min(
        INITIAL_CONFIG.maxConnectorLength,
        INITIAL_CONFIG.minConnectorLength +
        score.current * INITIAL_CONFIG.connectorGrowthRate
      );
      currentConnectorLength.current +=
        (targetLen - currentConnectorLength.current) * 0.01;

      // --- DYNAMIC MIDLINE CALCULATION - Requirements 4.1, 4.2, 4.11, 4.12, 7.6 ---
      const elapsedTime = Date.now() - gameStartTime.current;
      const midlineConfig = MIDLINE_CONFIG as MidlineConfig;

      // Campaign Mode: Check if midline mechanic is enabled - Requirements 7.6
      // Daily Challenge Mode: Apply noMidline modifier - Requirements 8.2
      const midlineEnabled =
        (!campaignMode?.enabled ||
          campaignMode.levelConfig?.mechanics.midline !== false) &&
        !(
          dailyChallengeMode?.enabled &&
          dailyChallengeMode.config?.modifiers.noMidline
        );

      // Calculate dynamic frequency and amplitude based on score
      const currentFrequency = midlineEnabled
        ? calculateDynamicFrequency(midlineConfig.baseFrequency, score.current)
        : 0;
      const currentAmplitude = midlineEnabled
        ? calculateDynamicAmplitude(
          midlineConfig.baseAmplitude,
          score.current,
          midlineConfig
        )
        : 0;

      // Calculate current midline Y position (static at center if midline disabled)
      const currentMidlineY = midlineEnabled
        ? calculateMidlineY(height, elapsedTime, midlineConfig, score.current)
        : height / 2;

      // Calculate normalized offset for visual effects
      const normalizedOffset = calculateNormalizedOffset(
        height,
        currentMidlineY
      );

      // Update midline state
      const tensionIntensity = calculateTensionIntensity(normalizedOffset);
      midlineState.current = {
        ...midlineState.current,
        currentMidlineY,
        normalizedOffset,
        currentAmplitude,
        currentFrequency,
        isAtPeak: isAtPeak(normalizedOffset),
        tensionIntensity,
      };

      // Store tension intensity for visual effects
      tensionIntensityRef.current = tensionIntensity;

      // --- CLAMP PLAYER POSITION - Requirements 4.5 ---
      const halfLen = currentConnectorLength.current / 2;
      const radius = INITIAL_CONFIG.orbRadius;
      const margin = 2;

      // Calculate movement bounds based on dynamic midline - Requirements 4.5
      const dynamicBounds = calculateMovementBounds(
        currentMidlineY,
        currentConnectorLength.current,
        radius,
        height
      );

      // Also calculate normal bounds for critical space detection
      const normalBounds = calculateNormalBounds(
        height,
        currentConnectorLength.current,
        radius
      );

      // Check if space is critically small - Requirements 4.8
      const isCritical = isCriticalSpace(dynamicBounds, normalBounds);
      midlineState.current.isMicroPhasing = isCritical;

      // Apply screen edge constraints
      const minCyScreen = halfLen + radius + margin;
      const maxCyScreen = height - halfLen - radius - margin;

      // Use dynamic midline for zone constraints
      const maxCyMiddleTop = currentMidlineY + halfLen - radius - margin;
      const minCyMiddleBottom = currentMidlineY - halfLen + radius + margin;

      const absoluteMinY = Math.max(minCyScreen, minCyMiddleBottom);
      const absoluteMaxY = Math.min(maxCyMiddleTop, maxCyScreen);

      let currentYPx = playerY.current * height;
      if (absoluteMinY < absoluteMaxY) {
        currentYPx = Math.max(absoluteMinY, Math.min(currentYPx, absoluteMaxY));
      } else {
        currentYPx = currentMidlineY;
      }
      playerY.current = currentYPx / height;

      // Rotation Animation
      const diff = targetRotation.current - rotationAngle.current;
      if (Math.abs(diff) > 0.001) {
        rotationAngle.current += diff * 0.35;
      } else {
        rotationAngle.current = targetRotation.current;
      }

      // Spawning - Pattern-Based System - Requirements 2.1, 2.2, 2.3, 2.4, 2.5
      const spawnTime = Date.now();

      if (usePatternBasedSpawning.current) {
        // Update speed using Flow Curve early (used for deterministic pacing)
        speed.current = FlowCurve.calculateGameSpeed(score.current);

        // Pattern-Based Spawning
        // Check if we need to select a new pattern
        if (
          !patternManagerState.current.currentPattern ||
          PatternManager.isPatternComplete(
            patternManagerState.current,
            spawnTime
          )
        ) {
          // Stabilize polarity: flip only every few patterns (readability)
          patternPolarity.current =
            Math.floor(patternSequenceIndex.current / 3) % 2 === 0
              ? "white"
              : "black";

          // Select new pattern based on difficulty progression - Requirements 7.1, 7.2, 7.3, 7.4, 7.5
          const selectedPattern =
            DifficultyProgression.selectPatternForScoreDeterministic(
              score.current,
              PATTERNS,
              patternSequenceIndex.current
            );
          patternSequenceIndex.current += 1;

          // Dynamic pattern pacing: scale timings as speed changes (keeps spacing feel consistent)
          // Mobile: don't let patterns compress too aggressively at high speeds
          const baselineSpeed = 5.0;
          const timeScale = Math.max(
            0.75,
            Math.min(1.35, baselineSpeed / Math.max(0.1, speed.current))
          );
          const scaledPattern = {
            ...selectedPattern,
            duration: Math.max(
              250,
              Math.round(selectedPattern.duration * timeScale)
            ),
            obstacles: selectedPattern.obstacles.map((o) => ({
              ...o,
              timeOffset: Math.max(0, Math.round(o.timeOffset * timeScale)),
            })),
            shards: selectedPattern.shards.map((s) => ({
              ...s,
              timeOffset: Math.max(0, Math.round(s.timeOffset * timeScale)),
            })),
          };

          patternManagerState.current = PatternManager.startPattern(
            patternManagerState.current,
            scaledPattern,
            spawnTime
          );
          patternStartTime.current = spawnTime;
        }

        // Update pattern spawn - spawn obstacles and shards based on time
        patternManagerState.current = PatternManager.updatePatternSpawn(
          patternManagerState.current,
          spawnTime,
          (lane: Lane, heightRatio: number) =>
            spawnPatternObstacle(lane, heightRatio, height, width),
          (lane: Lane, type: "safe" | "risky") =>
            spawnPatternShard(lane, type, height, width)
        );

        // Update spawn rate based on speed for UI display
        const spawnInterval = PatternManager.calculateSpawnInterval(
          speed.current
        );
        if (currentSpawnRate.current !== spawnInterval / 16.67) {
          // Convert ms to frames
          currentSpawnRate.current = Math.max(
            INITIAL_CONFIG.minSpawnRate,
            spawnInterval / 16.67
          );
        }

        if (framesSinceSpawn.current % 30 === 0)
          setGameSpeedDisplay(speed.current);
        framesSinceSpawn.current++;
      } else {
        // Legacy Random Spawning (fallback)
        framesSinceSpawn.current++;
        if (framesSinceSpawn.current >= currentSpawnRate.current) {
          spawnObstacle(height, width);
          framesSinceSpawn.current = 0;

          if (currentSpawnRate.current > INITIAL_CONFIG.minSpawnRate) {
            currentSpawnRate.current -= 1.2;
          }

          speed.current = FlowCurve.calculateGameSpeed(score.current);

          if (framesSinceSpawn.current % 30 === 0)
            setGameSpeedDisplay(speed.current);
        }
      }

      // --- GLITCH TOKEN SPAWN LOGIC - Requirements 1.1, 1.2, 1.3, 1.4 ---
      // Spawn Glitch Tokens for Construct transformation
      framesSinceGlitchTokenSpawn.current++;
      if (framesSinceGlitchTokenSpawn.current >= 60) { // Check every ~1 second
        framesSinceGlitchTokenSpawn.current = 0;
        
        // Get unlocked constructs from store
        const unlockedConstructs = useGameStore.getState().unlockedConstructs;
        
        // Try to spawn a token
        const newToken = GlitchTokenSpawner.trySpawnToken(
          score.current,
          constructSystemState.current.activeConstruct,
          unlockedConstructs,
          obstacles.current,
          width,
          height
        );
        
        if (newToken) {
          glitchTokens.current.push(newToken);
        }
      }

      // S.H.I.F.T. PROTOCOL - DISABLED (spawn/update removed)
      // Collectibles array kept for compatibility but not spawning new letters
      const playerPosX = width / 4;
      const gameTimeSeconds = Date.now() / 1000;
      const now = Date.now();

      // --- GRAVITY FLIP LOGIC - Requirements 2.1, 2.3, 2.6, 2.7 ---
      const currentTime = Date.now();

      // Check if invincibility window should end - Requirements 2.7
      if (gravityState.current.isInvincible) {
        const timeSinceFlip = currentTime - gravityState.current.flipStartTime;
        if (timeSinceFlip >= GRAVITY_CONFIG.invincibilityDuration) {
          gravityState.current.isInvincible = false;
        }
      }

      // Check if warning should be shown - Requirements 2.2, 2.5
      if (
        !gravityState.current.warningActive &&
        !gravityState.current.isFlipped
      ) {
        // Check if we should start warning (500ms before flip)
        if (
          shouldTriggerFlip(
            score.current,
            gravityState.current.lastFlipTime,
            currentTime
          )
        ) {
          // Random chance to trigger warning (to add unpredictability)
          if (Math.random() < 0.005) {
            // ~0.5% chance per frame when eligible
            gravityState.current.warningActive = true;
            gravityState.current.warningStartTime = currentTime;
          }
        }
      }

      // Check if warning period is over and flip should occur
      if (gravityState.current.warningActive) {
        const warningElapsed =
          currentTime - gravityState.current.warningStartTime;
        if (warningElapsed >= GRAVITY_CONFIG.warningDuration) {
          // Execute the flip - Requirements 2.3
          gravityState.current.isFlipped = !gravityState.current.isFlipped;
          gravityState.current.flipStartTime = currentTime;
          gravityState.current.lastFlipTime = currentTime;
          gravityState.current.warningActive = false;
          gravityState.current.isInvincible = true; // Requirements 2.7: 200ms invincibility

          // Mirror player position - Requirements 2.3
          playerY.current = mirrorPlayerPosition(playerY.current);
          targetPlayerY.current = mirrorPlayerPosition(targetPlayerY.current);
        }
      }

      // Check if flip should end (after minimum duration) - Requirements 2.6
      if (gravityState.current.isFlipped) {
        const flipDuration = currentTime - gravityState.current.flipStartTime;
        if (flipDuration >= GRAVITY_CONFIG.minTimeBetweenFlips) {
          // Check for another flip opportunity
          if (Math.random() < 0.003) {
            // Lower chance to flip back
            gravityState.current.warningActive = true;
            gravityState.current.warningStartTime = currentTime;
          }
        }
      }

      // --- DAILY RITUALS TRACKING - Requirements 3.7, 3.8, 3.9, 3.10 ---
      if (ritualTracking) {
        const deltaTime =
          lastRitualUpdateTime.current > 0
            ? (currentTime - lastRitualUpdateTime.current) / 1000
            : 0;
        lastRitualUpdateTime.current = currentTime;

        // Requirements 3.10: Track speed survival (time at 100+ km/h)
        // Speed is in pixels/frame, convert to approximate km/h (speed * 3.6 is a rough conversion)
        const speedKmh = speed.current * 3.6;
        if (speedKmh >= 100 && deltaTime > 0) {
          speedSurvivalTime.current += deltaTime;
          ritualTracking.onSpeedSurvival?.(
            Math.floor(speedSurvivalTime.current)
          );
        }

        // Track no-swap survival time
        const timeSinceLastSwap =
          (currentTime - lastSwapTimeForRitual.current) / 1000;
        if (timeSinceLastSwap > noSwapSurvivalTime.current) {
          noSwapSurvivalTime.current = timeSinceLastSwap;
          ritualTracking.onNoSwapSurvival?.(
            Math.floor(noSwapSurvivalTime.current)
          );
        }

        // Track streak for rituals
        if (rhythmState.current.streakCount > 0) {
          ritualTracking.onStreakReached?.(rhythmState.current.streakCount);
        }
      }

      // --- MISSION SYSTEM: DISTANCE TRACKING - Requirements 7.2 ---
      // Track distance traveled based on game speed (pixels per frame converted to meters)
      // Emit DISTANCE events periodically (every ~100ms) to avoid excessive callbacks
      const distanceThisFrame = speed.current * slowMotionMultiplier * constructSpeedMultiplier;
      accumulatedDistance.current += distanceThisFrame / 10; // Convert pixels to approximate meters
      
      if (currentTime - lastDistanceEmitTime.current >= 100) {
        const distanceToEmit = Math.floor(accumulatedDistance.current);
        if (distanceToEmit > 0) {
          onMissionEvent?.({ type: 'DISTANCE', value: distanceToEmit });
          accumulatedDistance.current -= distanceToEmit;
        }
        lastDistanceEmitTime.current = currentTime;
      }

      // Orb Positions
      const playerX = width / 4;

      const yOffset = Math.cos(rotationAngle.current) * halfLen;
      const xRotOffset = Math.sin(rotationAngle.current) * 15;

      const whiteOrbY = playerY.current * height - yOffset;
      const whiteOrbX = playerX - xRotOffset;

      const blackOrbY = playerY.current * height + yOffset;
      const blackOrbX = playerX + xRotOffset;

      // Theme System Integration - Requirements 5.1, 5.2, 5.3
      const whiteOrb = {
        x: whiteOrbX,
        y: whiteOrbY,
        radius: INITIAL_CONFIG.orbRadius,
        color: getColor("topOrb"),
      };
      const blackOrb = {
        x: blackOrbX,
        y: blackOrbY,
        radius: INITIAL_CONFIG.orbRadius,
        color: getColor("bottomOrb"),
      };

      // Phase 2: Shield visual feedback (simple readable ring)
      const shieldRemainingMs = shieldInvincibleUntil.current - Date.now();
      if (shieldRemainingMs > 0) {
        const a = Math.max(0, Math.min(1, shieldRemainingMs / 2000));
        ctx.save();
        ctx.globalAlpha = 0.45 * a;
        ctx.strokeStyle = "#00F0FF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(whiteOrb.x, whiteOrb.y, whiteOrb.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(blackOrb.x, blackOrb.y, blackOrb.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Trail Particles - Requirements 12.1: Emit trail particles based on movement speed
      // Emit trail particles behind both orbs based on game speed
      ParticleSystem.emitTrail(whiteOrbX - 5, whiteOrbY, speed.current, [
        whiteOrb.color,
        getColor("accent"),
      ]);
      ParticleSystem.emitTrail(blackOrbX - 5, blackOrbY, speed.current, [
        blackOrb.color,
        getColor("accent"),
      ]);

      // --- GLITCH TOKEN UPDATE AND COLLECTION - Requirements 1.1, 1.2, 1.3, 1.4 ---
      glitchTokens.current = glitchTokens.current.filter((token) => {
        if (token.collected) return false;
        
        // Move token with game speed
        const updatedToken = GlitchTokenSpawner.updateTokenPosition(
          token,
          -speed.current * slowMotionMultiplier * constructSpeedMultiplier
        );
        token.x = updatedToken.x;
        
        // Check if off-screen
        if (GlitchTokenSpawner.isTokenOffScreen(token)) {
          return false;
        }
        
        // Check collision with white orb
        const whiteTokenCollision = GlitchTokenSpawner.canCollectToken(
          whiteOrbX, whiteOrbY, token
        );
        
        // Check collision with black orb
        const blackTokenCollision = GlitchTokenSpawner.canCollectToken(
          blackOrbX, blackOrbY, token
        );
        
        if (whiteTokenCollision || blackTokenCollision) {
          // Mark as collected
          token.collected = true;
          
          // Get position for VFX
          const vfxX = whiteTokenCollision ? whiteOrbX : blackOrbX;
          const vfxY = whiteTokenCollision ? whiteOrbY : blackOrbY;
          
          // Transform to the construct - Requirements 1.3, 2.1
          constructSystemState.current = ConstructSystem.transformTo(
            constructSystemState.current,
            token.constructType,
            Date.now()
          );
          
          // Trigger transformation VFX - Requirements 2.2
          transformationVFXState.current = TransformationVFX.triggerTransformation(
            transformationVFXState.current,
            vfxX,
            vfxY,
            Date.now()
          );
          
          // Play transformation sound - Requirements 6.5
          AudioSystem.playConstructTransform();
          AudioSystem.playGlitchTokenCollect();
          ScreenShake.triggerNearMiss();
          ChromaticAberration.setStreakLevel(3); // Trigger chromatic aberration effect
          getHapticSystem().trigger("heavy");
          
          // Score popup for transformation
          scorePopups.current.push({
            x: token.x,
            y: token.y - 20,
            text: `⚡ ${token.constructType} ⚡`,
            color: "#00F0FF",
            life: 2.0,
            vy: -2,
          });
          
          return false;
        }
        
        return true;
      });

      // --- S.H.I.F.T. COLLECTIBLE COLLISION DETECTION - Requirements 9.1, 9.2, 9.3, 9.4 ---
      const orbCollisionRadius = INITIAL_CONFIG.orbRadius;
      collectibles.current = collectibles.current.filter((collectible) => {
        if (collectible.isCollected) return false;

        // Check collision with white orb - Requirements 9.1, 9.2
        const whiteCollision = ShiftProtocol.checkCollectibleCollision(
          { x: whiteOrbX, y: whiteOrbY },
          { x: collectible.x, y: collectible.y },
          orbCollisionRadius
        );

        // Check collision with black orb - Requirements 9.1, 9.2
        const blackCollision = ShiftProtocol.checkCollectibleCollision(
          { x: blackOrbX, y: blackOrbY },
          { x: collectible.x, y: collectible.y },
          orbCollisionRadius
        );

        if (whiteCollision || blackCollision) {
          // Find the letter index in the target word
          const letterIndex = ShiftProtocol.TARGET_WORD.indexOf(
            collectible.value
          );

          if (letterIndex !== -1) {
            // Mark letter as collected - Requirements 9.1
            shiftState.current = ShiftProtocol.collectLetter(
              shiftState.current,
              letterIndex
            );

            // Award Echo Shards - Requirements 9.4
            const currentShards = useGameStore.getState().echoShards;
            const newShards =
              ShiftProtocol.awardCollectionReward(currentShards);
            useGameStore
              .getState()
              .addEchoShards(SHIFT_CONFIG.collectionReward);

            // Visual feedback - collection particle burst with golden/purple colors
            const collisionX = whiteCollision ? whiteOrbX : blackOrbX;
            const collisionY = whiteCollision ? whiteOrbY : blackOrbY;

            // Dramatic collection animation - multiple bursts
            ParticleSystem.emitBurst(collectible.x, collectible.y, [
              "#FFD700",
              "#FF00FF",
              "#FFFFFF",
            ]);
            ParticleSystem.emitBurst(collisionX, collisionY, [
              "#FFD700",
              "#FF00FF",
              "#FFFFFF",
            ]);

            // Audio: S.H.I.F.T. letter collect sound - Phase 4
            AudioSystem.playShiftCollect();

            // Screen shake for satisfying feedback
            ScreenShake.triggerNearMiss();

            // Score popup for letter collection - golden color
            scorePopups.current.push({
              x: collectible.x,
              y: collectible.y - 20,
              text: `+${SHIFT_CONFIG.collectionReward} ⚡`,
              color: "#FFD700",
              life: 1.5,
              vy: -2.5,
            });

            // Show letter collected popup - larger and more visible
            scorePopups.current.push({
              x: collectible.x,
              y: collectible.y - 50,
              text: `✦ ${collectible.value} ✦`,
              color: "#FFD700",
              life: 2.0,
              vy: -1.5,
            });

            // Haptic feedback for collection
            getHapticSystem().trigger("medium");

            // Check if all letters collected - activate Overdrive - Requirements 4.1
            if (
              ShiftProtocol.checkOverdriveActivation(
                shiftState.current.collectedMask
              )
            ) {
              shiftState.current = ShiftProtocol.activateOverdrive(
                shiftState.current
              );

              // State Priority System: Pause Resonance when Overdrive activates
              // Requirements: Overdrive > Resonance (Override pattern)
              if (
                resonanceState.current.isActive &&
                !resonanceState.current.isPaused
              ) {
                resonanceState.current = ResonanceSystem.pauseResonance(
                  resonanceState.current
                );
              }

              // Visual feedback for Overdrive activation
              ParticleSystem.emitBurst(playerX, playerY.current * height, [
                "#FFD700",
                "#FF00FF",
                "#00F0FF",
              ]);
              scorePopups.current.push({
                x: width / 2,
                y: height / 2 - 80,
                text: "⚡ OVERDRIVE ACTIVATED! ⚡",
                color: "#FFD700",
                life: 2.5,
                vy: -0.5,
              });

              // Haptic feedback for Overdrive activation
              getHapticSystem().trigger("success");

              // Screen shake for dramatic effect
              ScreenShake.triggerStreakBonus();
            }
          }

          // Remove collectible - Requirements 9.3
          return false;
        }

        return true;
      });

      // Filter Obstacles - Release back to pool if using object pooling
      obstacles.current = obstacles.current.filter((obs) => {
        const keep = obs.x + obs.width > -100;
        if (!keep) {
          // release is safe even if the item wasn't pooled (ignored gracefully)
          obstaclePool.current.release(
            obs as unknown as ObjectPool.PooledEngineObstacle
          );
        }
        return keep;
      });

      // --- SHARD MOVEMENT AND COLLECTION - Requirements 5.1, 5.2, 5.3, 5.4, 5.5 ---
      // Move shards with game speed + dynamic oscillation
      // Note: currentTime is already defined above in gravity flip logic
      activeShards.current = activeShards.current.filter((shard) => {
        if (shard.collected) {
          shardPool.current.release(
            shard as unknown as ObjectPool.PooledEngineShard
          );
          return false;
        }

        // Move base position left with game speed - Apply construct speed multiplier
        shard.baseX -= speed.current * slowMotionMultiplier * constructSpeedMultiplier;

        // Calculate dynamic position with oscillation (yukarı-aşağı + ileri-geri)
        const dynamicPos = ShardPlacement.calculateShardPosition(
          shard,
          currentTime
        );
        shard.x = dynamicPos.x;
        shard.y = dynamicPos.y;

        // Check collection with both orbs
        const playerX = width / 4;
        const xRotOffset = Math.sin(rotationAngle.current) * 15;
        const whiteOrbX = playerX - xRotOffset;
        const blackOrbX = playerX + xRotOffset;
        const whiteOrbY =
          playerY.current * height -
          Math.cos(rotationAngle.current) *
          (currentConnectorLength.current / 2);
        const blackOrbY =
          playerY.current * height +
          Math.cos(rotationAngle.current) *
          (currentConnectorLength.current / 2);

        // Phase 2: Magnet attraction (deterministic, no RNG)
        if (magnetRadiusFactorUpgrade.current > 0) {
          const minDim = Math.min(width, height);
          const radius = Math.max(
            40,
            Math.min(minDim * 0.45, minDim * magnetRadiusFactorUpgrade.current)
          );

          // Choose nearest orb
          const dxW = shard.x - whiteOrbX;
          const dyW = shard.y - whiteOrbY;
          const d2W = dxW * dxW + dyW * dyW;

          const dxB = shard.x - blackOrbX;
          const dyB = shard.y - blackOrbY;
          const d2B = dxB * dxB + dyB * dyB;

          const targetX = d2W <= d2B ? whiteOrbX : blackOrbX;
          const targetY = d2W <= d2B ? whiteOrbY : blackOrbY;
          const d2 = Math.min(d2W, d2B);

          if (d2 < radius * radius) {
            const dist = Math.sqrt(Math.max(1e-6, d2));
            const pull = 1 - dist / radius;
            // Stronger pull when closer; tuned for mobile readability
            const t = Math.min(0.22, 0.06 + pull * pull * 0.16);
            shard.baseX += (targetX - shard.baseX) * t;
            shard.baseY += (targetY - shard.baseY) * t;

            // Recompute dynamic position after base shift (keeps motion smooth)
            const dynamicAfterMagnet = ShardPlacement.calculateShardPosition(
              shard,
              currentTime
            );
            shard.x = dynamicAfterMagnet.x;
            shard.y = dynamicAfterMagnet.y;
          }
        }

        const canCollectWhite = ShardPlacement.canCollectShard(
          whiteOrbX,
          whiteOrbY,
          shard,
          30
        );
        const canCollectBlack = ShardPlacement.canCollectShard(
          blackOrbX,
          blackOrbY,
          shard,
          30
        );

        if (canCollectWhite || canCollectBlack) {
          // Check for near miss bonus - Requirements 5.5
          const isNearMiss = nearMissState.current.streakCount > 0;
          const awardedValue = ShardPlacement.collectShard(shard, isNearMiss);
          
          // BONUS SHARD: Ekstra ödül ve büyük patlama efekti
          const isBonus = (shard as ShardPlacement.PlacedShard).isBonus || shard.type === "bonus";
          const finalValue = isBonus ? awardedValue * 2 : awardedValue; // Bonus 2x ekstra

          // Award Echo Shards
          useGameStore.getState().addEchoShards(finalValue);

          // Mission System: Emit COLLECT event - Requirements 7.4
          onMissionEvent?.({ type: 'COLLECT', value: 1 });

          // Visual feedback - BONUS için büyük patlama
          if (isBonus) {
            // Büyük patlama efekti - 3 dalga
            ParticleSystem.emitBurst(shard.x, shard.y, [
              "#FFD700", "#FF6B00", "#FFFFFF",
            ]);
            ParticleSystem.emitBurst(shard.x, shard.y, [
              "#FF00FF", "#00FFFF", "#FFD700",
            ]);
            // Ekstra parçacıklar
            for (let i = 0; i < 15; i++) {
              particles.current.push({
                x: shard.x,
                y: shard.y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                life: 1.2,
                color: Math.random() > 0.5 ? "#FFD700" : "#FF6B00",
              });
            }
            // Screen shake for bonus
            ScreenShake.triggerStreakBonus();
            // Haptic feedback - strong for bonus
            getHapticSystem().trigger("heavy");
            // Audio feedback
            AudioSystem.playStreakBonus();
          } else {
            ParticleSystem.emitBurst(shard.x, shard.y, [
              "#00F0FF",
              "#FFD700",
              "#FFFFFF",
            ]);
            // Haptic feedback
            getHapticSystem().trigger("light");
          }
          
          scorePopups.current.push({
            x: shard.x,
            y: shard.y - 20,
            text: isBonus ? `+${finalValue} 💥` : `+${finalValue} ⚡`,
            color: isBonus ? "#FFD700" : (shard.type === "risky" ? "#FFD700" : "#00F0FF"),
            life: isBonus ? 1.5 : 1.0,
            vy: isBonus ? -3 : -2,
          });

          // Remove collected shard + release to pool
          shardPool.current.release(
            shard as unknown as ObjectPool.PooledEngineShard
          );
          return false;
        }

        // Remove if off-screen
        const keep = shard.x > -50;
        if (!keep) {
          shardPool.current.release(
            shard as unknown as ObjectPool.PooledEngineShard
          );
        }
        return keep;
      });

      // Restore System: Record snapshot every frame (60fps) - Requirements 7.1, 7.2
      // Capture snapshot for potential rewind using circular buffer
      if (restoreMode?.enabled && !restoreState.current.hasBeenUsed) {
        // Convert ResonanceState to EnhancedResonanceState format for snapshot
        const enhancedResonanceState: EnhancedResonanceState = {
          isActive: resonanceState.current.isActive,
          isPaused: resonanceState.current.isPaused,
          pausedTimeRemaining: resonanceState.current.pausedTimeRemaining,
          streakCount: resonanceState.current.streakCount,
          activationThreshold: 10, // Default threshold
          duration: 10000, // Default duration in ms
          remainingTime: resonanceState.current.remainingTime,
          multiplier: resonanceState.current.multiplier,
          intensity: resonanceState.current.transitionFactor,
          colorTransitionProgress: resonanceState.current.transitionFactor,
        };

        // Capture complete snapshot with all required fields - Requirements 7.2
        const snapshot = RestoreSystem.captureSnapshot({
          timestamp: Date.now(),
          score: score.current,
          gameSpeed: speed.current,
          playerPosition: playerY.current,
          orbSwapState: isSwapped.current,
          obstacles: obstacles.current,
          shiftState: shiftState.current,
          resonanceState: enhancedResonanceState,
          connectorLength: currentConnectorLength.current,
          midlineY: currentMidlineY,
        });

        // Push to circular buffer - Requirements 7.1, 7.3
        snapshotBuffer.current = RestoreSystem.pushSnapshot(
          snapshotBuffer.current,
          snapshot
        );

        // Also record to legacy restore state for backward compatibility
        const legacySnapshot = RestoreSystem.createSnapshot(
          Date.now(),
          score.current,
          playerY.current,
          isSwapped.current,
          obstacles.current,
          speed.current,
          currentSpawnRate.current,
          currentConnectorLength.current
        );
        restoreState.current = RestoreSystem.recordSnapshot(
          restoreState.current,
          legacySnapshot
        );
      }

      let collisionDetected = false;

      obstacles.current.forEach((obs) => {
        // Horizontal Movement - Apply slow motion and construct speed multipliers - Requirements 6.4, 4.6
        obs.x -= speed.current * slowMotionMultiplier * constructSpeedMultiplier;

        // Vertical Animation
        if (Math.abs(obs.y - obs.targetY) > 0.5) {
          obs.y += (obs.targetY - obs.y) * 0.05;
        } else {
          obs.y = obs.targetY;
        }

        // Scoring with Rhythm System - Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7
        // Phantom Bonus - Requirements 5.7, 5.10
        if (
          !obs.passed &&
          obs.x + obs.width < playerX - INITIAL_CONFIG.orbRadius
        ) {
          obs.passed = true;
          if (obs.lane === "top") {
            // Note: currentTime is already defined above in gravity flip logic

            // Calculate expected interval based on current speed - Requirements 1.6
            const expectedInterval = calculateExpectedInterval(
              speed.current,
              currentSpawnRate.current
            );

            // Check rhythm timing - Requirements 1.1, 1.2
            const rhythmResult = checkRhythmTiming(
              currentTime,
              rhythmState.current
            );

            // Update rhythm state - Requirements 1.2, 1.3, 1.4, 1.5
            rhythmState.current = updateRhythmState(
              rhythmState.current,
              currentTime,
              rhythmResult.isOnBeat,
              expectedInterval
            );

            // Notify UI of rhythm state change - Requirements 1.3, 1.4
            onRhythmStateUpdate?.(
              rhythmState.current.activeMultiplier,
              rhythmState.current.streakCount
            );

            // Resonance System Activation Check - Requirements 1.1
            // Check if streak reaches threshold and activate Harmonic Resonance
            if (
              !resonanceState.current.isActive &&
              ResonanceSystem.checkActivation(rhythmState.current.streakCount)
            ) {
              resonanceState.current = ResonanceSystem.activate(
                resonanceState.current,
                Date.now()
              );
              // Haptic Feedback: Success pattern for resonance activation - Requirements 4.4
              getHapticSystem().trigger("success");
              // Visual feedback: Show "HARMONIC RESONANCE!" text
              scorePopups.current.push({
                x: width / 2,
                y: height / 2 - 80,
                text: "HARMONIC RESONANCE!",
                color: "#00F0FF",
                life: 2.0,
                vy: -0.5,
              });
              // Emit burst particles for activation effect
              ParticleSystem.emitBurst(playerX, playerY.current * height, [
                "#00F0FF",
                "#FF00FF",
                "#FFFFFF",
              ]);
            }

            // Chromatic Aberration - Requirements 11.1, 11.2: Trigger based on rhythm streak
            ChromaticAberration.setStreakLevel(
              rhythmState.current.activeMultiplier
            );

            // Calculate score with multiplier - Requirements 1.7
            const baseScore = 10;
            const multiplier = rhythmState.current.activeMultiplier;
            let earnedScore = baseScore * multiplier;

            // --- PHANTOM BONUS - Requirements 5.7, 14.1 ---
            // Award +20 bonus for passing phantom obstacles (total 30 points base)
            if (obs.isLatent) {
              const phantomBonus = calculatePhantomBonus(false, PHANTOM_CONFIG);
              earnedScore += phantomBonus;

              // Daily Rituals: Track phantom pass event - Requirements 3.8
              ritualTracking?.onPhantomPass?.();

              // Visual feedback for phantom bonus - Requirements 14.1
              // Show total score (+30) with purple/pink color for phantom obstacles
              const phantomTotalScore = baseScore + phantomBonus; // 10 + 20 = 30
              scorePopups.current.push({
                x: playerX + 30,
                y: playerY.current * height - 20,
                text: `+${phantomTotalScore}`,
                color: "#9B59B6", // Purple color for phantom bonus
                life: 1.0,
                vy: -1.5,
              });
            }

            // Apply score multiplier upgrade - Requirements 6.2
            // Zen Mode: Skip score tracking - Requirements 9.1
            if (!zenMode?.enabled) {
              const finalScore = Math.floor(
                earnedScore * scoreMultiplierUpgrade.current
              );
              score.current += finalScore;
              onScoreUpdate(score.current);

              // Daily Rituals: Track score accumulation - Requirements 3.9
              ritualTracking?.onScoreAccumulate?.(score.current);
            }

            // Campaign Mode: Check for level completion - Requirements 7.3
            if (
              campaignMode?.enabled &&
              campaignMode.targetScore &&
              !levelCompleted.current
            ) {
              if (score.current >= campaignMode.targetScore) {
                levelCompleted.current = true;
                campaignMode.onLevelComplete?.(score.current);
              }
            }

            // Visual effects for rhythm - Requirements 1.3
            // Theme System Integration - Requirements 5.1, 5.2, 5.3
            const rhythmAccentColor = getColor("accent");

            // Show "RHYTHM!" text when streak reaches 5 (x2 multiplier activated)
            if (rhythmState.current.streakCount === 5) {
              scorePopups.current.push({
                x: width / 2,
                y: height / 2 - 50,
                text: "RHYTHM!",
                color: rhythmAccentColor,
                life: 1.5,
                vy: -1,
              });
            }

            // Show multiplier popup when on-beat with active multiplier
            if (rhythmResult.isOnBeat && multiplier > 1) {
              scorePopups.current.push({
                x: playerX,
                y: playerY.current * height - 40,
                text: `x${multiplier}`,
                color: multiplier === 3 ? "#FFD700" : rhythmAccentColor,
                life: 0.8,
                vy: -1.5,
              });
            }
          }
        }

        // --- COLLISION LOGIC ---
        // Skip collision if phasing (swap), gravity invincibility, Zen Mode respawn invincibility, post-restore invincibility, or Overdrive is active
        // Requirements 2.7, 4.3, 9.2
        const zenModeInvincible =
          zenMode?.enabled &&
          ZenMode.isRespawnInvincible(zenModeState.current, Date.now());

        // Check Overdrive invulnerability - Requirements 4.3
        const overdriveInvincible = ShiftProtocol.isInvulnerableDuringOverdrive(
          shiftState.current
        );

        // Check post-restore invincibility (1 second after restore)
        let postRestoreInvincibleActive = false;
        if (postRestoreInvincible.current) {
          const timeSinceRestore = Date.now() - postRestoreStartTime.current;
          if (timeSinceRestore < POST_RESTORE_INVINCIBILITY_DURATION) {
            postRestoreInvincibleActive = true;
          } else {
            // Invincibility period ended
            postRestoreInvincible.current = false;
          }
        }

        // Phase 2: Shield invincibility window (2s after shield break)
        const shieldInvincibleActive =
          Date.now() < shieldInvincibleUntil.current;

        // --- OVERDRIVE OBSTACLE DESTRUCTION - Requirements 4.4 ---
        // During Overdrive, destroy obstacles on contact instead of dying
        if (overdriveInvincible) {
          const whiteOrbPos = { x: whiteOrb.x, y: whiteOrb.y };
          const blackOrbPos = { x: blackOrb.x, y: blackOrb.y };

          const whiteCollision = checkCollision(
            whiteOrbPos,
            whiteOrb.radius,
            obs
          );
          const blackCollision = checkCollision(
            blackOrbPos,
            blackOrb.radius,
            obs
          );

          if (whiteCollision || blackCollision) {
            // Destroy obstacle - Requirements 4.4
            const { shouldDestroy } = ShiftProtocol.handleOverdriveCollision(
              shiftState.current
            );

            if (shouldDestroy) {
              // Create destruction particle effect
              createExplosion(
                obs.x + obs.width / 2,
                obs.y + obs.height / 2,
                "#FFD700"
              );
              ParticleSystem.emitBurst(
                obs.x + obs.width / 2,
                obs.y + obs.height / 2,
                ["#FFD700", "#FF00FF", "#00F0FF"]
              );

              // Screen shake for impact
              ScreenShake.triggerNearMiss();

              // Haptic feedback
              getHapticSystem().trigger("medium");

              // Award bonus points
              if (!zenMode?.enabled) {
                score.current += 25;
                onScoreUpdate(score.current);
              }

              // Show destruction popup
              scorePopups.current.push({
                x: obs.x + obs.width / 2,
                y: obs.y + obs.height / 2,
                text: "+25 💥",
                color: "#FFD700",
                life: 1.0,
                vy: -2,
              });

              // Mark obstacle for removal
              obs.passed = true;
              obs.x = -1000;
            }
          }
          return; // Skip normal collision logic during Overdrive
        }

        // Check Construct System invincibility - Requirements 2.1, 6.3
        const constructInvincible = ConstructSystem.isInvulnerable(
          constructSystemState.current,
          Date.now()
        );

        // Also skip if pending restore (waiting for user decision) or restore animation is playing
        if (
          isPhasing.current ||
          gravityState.current.isInvincible ||
          zenModeInvincible ||
          postRestoreInvincibleActive ||
          shieldInvincibleActive ||
          constructInvincible ||
          pendingRestore.current ||
          isRestoreAnimating.current
        )
          return;

        const whiteOrbPos = { x: whiteOrb.x, y: whiteOrb.y };
        const blackOrbPos = { x: blackOrb.x, y: blackOrb.y };
        const collisionTime = Date.now();

        // Requirements 4.6: Determine orb zones based on dynamic midline
        const whiteOrbZone = getOrbZone(whiteOrb.y, currentMidlineY);
        const blackOrbZone = getOrbZone(blackOrb.y, currentMidlineY);

        // Requirements 4.13: Check micro-phasing for boundary protection
        const whiteMicroPhasing = shouldApplyMicroPhasing(
          whiteOrb.y,
          currentMidlineY
        );
        const blackMicroPhasing = shouldApplyMicroPhasing(
          blackOrb.y,
          currentMidlineY
        );

        // White Orb Checks
        const whiteCollision = checkCollision(
          whiteOrbPos,
          whiteOrb.radius,
          obs
        );
        if (whiteCollision) {
          // Requirements 4.13: Skip collision if micro-phasing is active at zone boundary
          if (whiteMicroPhasing) {
            // Mark obstacle as phased to prevent repeated checks
            if (!obs.hasPhased) {
              obs.hasPhased = true;
            }
          } else if (obs.polarity === "black") {
            // Resonance Mode: Destroy obstacle instead of game over - Requirements 1.4, 1.5
            if (resonanceState.current.isActive) {
              const { result, newState } = ResonanceSystem.handleCollision(
                resonanceState.current
              );
              resonanceState.current = newState;

              if (result.destroyed) {
                // Requirements 1.6: Trigger explosion particle effect at obstacle position
                createExplosion(
                  obs.x + obs.width / 2,
                  obs.y + obs.height / 2,
                  "#00F0FF"
                );
                ParticleSystem.emitBurst(
                  obs.x + obs.width / 2,
                  obs.y + obs.height / 2,
                  ["#00F0FF", "#FF00FF", "#FFFFFF"]
                );

                // Requirements 1.5: Award 50 bonus points
                if (!zenMode?.enabled) {
                  score.current += result.bonus;
                  onScoreUpdate(score.current);
                }

                // Show bonus popup
                scorePopups.current.push({
                  x: obs.x + obs.width / 2,
                  y: obs.y + obs.height / 2,
                  text: `+${result.bonus}`,
                  color: "#00F0FF",
                  life: 1.0,
                  vy: -2,
                });

                // Remove the obstacle
                obs.passed = true;
                obs.x = -1000; // Move off screen to be filtered
              }
            } else {
              // Phase 2: Shield (consume instead of dying)
              if (shieldChargesRemaining.current > 0) {
                shieldChargesRemaining.current -= 1;
                shieldInvincibleUntil.current = collisionTime + 2000;

                // VFX: shatter burst + popup + mild shake + haptic
                ParticleSystem.emitBurst(whiteOrb.x, whiteOrb.y, [
                  "#00F0FF",
                  "#FFFFFF",
                  "#A855F7",
                ]);
                scorePopups.current.push({
                  x: whiteOrb.x,
                  y: whiteOrb.y - 20,
                  text: "🛡️ SHIELD",
                  color: "#00F0FF",
                  life: 1.0,
                  vy: -2,
                });
                ScreenShake.triggerNearMiss();
                // Audio: Shield block sound - Phase 4
                AudioSystem.playShieldBlock();
                getHapticSystem().trigger("medium");

                // Reset streak systems on shield break (clarity + fairness)
                rhythmState.current = createInitialRhythmState();
                onRhythmStateUpdate?.(1, 0);
                ChromaticAberration.endStreak();
                resonanceState.current =
                  ResonanceSystem.createInitialResonanceState();

                // Remove obstacle to prevent immediate re-hit
                obs.passed = true;
                obs.x = -1000;
                return;
              }

              // --- CONSTRUCT COLLISION RESOLUTION - Requirements 3.3, 3.4, 4.4, 5.4, 5.5 ---
              // Check if construct is active and use its collision resolution
              const collisionResult = constructSystemState.current.currentStrategy.resolveCollision(
                whiteOrb.y > obs.y + obs.height // isFromAbove check for Titan stomp
              );

              if (collisionResult === 'IGNORE') {
                // Blink teleport - ignore collision
                return;
              } else if (collisionResult === 'DESTROY') {
                // Titan stomp - destroy obstacle
                createExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, "#FFD700");
                ParticleSystem.emitBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, ["#FFD700", "#FF6600", "#FFFFFF"]);
                ScreenShake.triggerNearMiss();
                getHapticSystem().trigger("medium");
                // Audio for Titan stomp - Requirements 6.5
                AudioSystem.playTitanStomp();
                if (!zenMode?.enabled) {
                  score.current += 25;
                  onScoreUpdate(score.current);
                }
                scorePopups.current.push({
                  x: obs.x + obs.width / 2,
                  y: obs.y + obs.height / 2,
                  text: "+25 💥",
                  color: "#FFD700",
                  life: 1.0,
                  vy: -2,
                });
                obs.passed = true;
                obs.x = -1000;
                return;
              }

              // DAMAGE result - check Second Chance first
              if (SecondChanceSystem.hasSecondChance(constructSystemState.current)) {
                // Process Second Chance - Requirements 6.1, 6.2, 6.3, 6.7
                const secondChanceResult = SecondChanceSystem.processSecondChance(
                  constructSystemState.current,
                  Date.now(),
                  obstacles.current,
                  playerX
                );
                constructSystemState.current = secondChanceResult.newState;

                // Smart Bomb - destroy obstacles in radius - Requirements 6.7
                secondChanceResult.obstaclesToDestroy.forEach(obsId => {
                  const targetObs = obstacles.current.find(o => o.id === obsId);
                  if (targetObs) {
                    createExplosion(targetObs.x + targetObs.width / 2, targetObs.y + targetObs.height / 2, "#FF00FF");
                    targetObs.passed = true;
                    targetObs.x = -1000;
                  }
                });

                // VFX for Second Chance - Requirements 6.4, 6.8
                secondChanceVFXState.current = SecondChanceVFX.triggerSecondChance(
                  secondChanceVFXState.current,
                  whiteOrb.x,
                  whiteOrb.y,
                  Date.now()
                );
                createExplosion(whiteOrb.x, whiteOrb.y, "#FF00FF");
                ParticleSystem.emitBurst(whiteOrb.x, whiteOrb.y, ["#FF00FF", "#00F0FF", "#FFFFFF"]);
                getHapticSystem().trigger("heavy");
                
                // Audio for Second Chance - Requirements 6.5
                AudioSystem.playConstructDestruction();
                AudioSystem.playSmartBombShockwave();
                
                scorePopups.current.push({
                  x: whiteOrb.x,
                  y: whiteOrb.y - 20,
                  text: "💥 SECOND CHANCE",
                  color: "#FF00FF",
                  life: 1.5,
                  vy: -2,
                });

                // Reset streak systems
                rhythmState.current = createInitialRhythmState();
                onRhythmStateUpdate?.(1, 0);
                ChromaticAberration.endStreak();
                resonanceState.current = ResonanceSystem.createInitialResonanceState();
                return;
              }

              // Normal collision - game over
              createExplosion(whiteOrb.x, whiteOrb.y, whiteOrb.color);
              collisionDetected = true;
              // Screen Shake on collision - Requirements 10.1
              ScreenShake.triggerCollision();
              // Audio: Game over sound - Phase 4
              AudioSystem.playGameOver();
              // Haptic Feedback: Heavy impact for collision - Requirements 4.2
              getHapticSystem().trigger("heavy");
              // Mission System: Emit COLLISION event for Sound Check - Requirements 1.4
              onMissionEvent?.({ type: 'COLLISION', value: 1 });
              // Reset rhythm state on collision - Requirements 1.5
              rhythmState.current = createInitialRhythmState();
              onRhythmStateUpdate?.(1, 0);
              // End chromatic aberration on collision - Requirements 11.3
              ChromaticAberration.endStreak();
              // Reset resonance state on collision
              resonanceState.current =
                ResonanceSystem.createInitialResonanceState();
            }
          }
        }

        // Black Orb Checks
        const blackCollision = checkCollision(
          blackOrbPos,
          blackOrb.radius,
          obs
        );
        if (blackCollision) {
          // Requirements 4.13: Skip collision if micro-phasing is active at zone boundary
          if (blackMicroPhasing) {
            // Mark obstacle as phased to prevent repeated checks
            if (!obs.hasPhased) {
              obs.hasPhased = true;
            }
          } else if (obs.polarity === "white") {
            // Resonance Mode: Destroy obstacle instead of game over - Requirements 1.4, 1.5
            if (resonanceState.current.isActive) {
              const { result, newState } = ResonanceSystem.handleCollision(
                resonanceState.current
              );
              resonanceState.current = newState;

              if (result.destroyed) {
                // Requirements 1.6: Trigger explosion particle effect at obstacle position
                createExplosion(
                  obs.x + obs.width / 2,
                  obs.y + obs.height / 2,
                  "#00F0FF"
                );
                ParticleSystem.emitBurst(
                  obs.x + obs.width / 2,
                  obs.y + obs.height / 2,
                  ["#00F0FF", "#FF00FF", "#FFFFFF"]
                );

                // Requirements 1.5: Award 50 bonus points
                if (!zenMode?.enabled) {
                  score.current += result.bonus;
                  onScoreUpdate(score.current);
                }

                // Show bonus popup
                scorePopups.current.push({
                  x: obs.x + obs.width / 2,
                  y: obs.y + obs.height / 2,
                  text: `+${result.bonus}`,
                  color: "#00F0FF",
                  life: 1.0,
                  vy: -2,
                });

                // Remove the obstacle
                obs.passed = true;
                obs.x = -1000; // Move off screen to be filtered
              }
            } else {
              // Phase 2: Shield (consume instead of dying)
              if (shieldChargesRemaining.current > 0) {
                shieldChargesRemaining.current -= 1;
                shieldInvincibleUntil.current = collisionTime + 2000;

                ParticleSystem.emitBurst(blackOrb.x, blackOrb.y, [
                  "#00F0FF",
                  "#FFFFFF",
                  "#A855F7",
                ]);
                scorePopups.current.push({
                  x: blackOrb.x,
                  y: blackOrb.y - 20,
                  text: "🛡️ SHIELD",
                  color: "#00F0FF",
                  life: 1.0,
                  vy: -2,
                });
                ScreenShake.triggerNearMiss();
                // Audio: Shield block sound - Phase 4
                AudioSystem.playShieldBlock();
                getHapticSystem().trigger("medium");

                rhythmState.current = createInitialRhythmState();
                onRhythmStateUpdate?.(1, 0);
                ChromaticAberration.endStreak();
                resonanceState.current =
                  ResonanceSystem.createInitialResonanceState();

                obs.passed = true;
                obs.x = -1000;
                return;
              }

              // --- CONSTRUCT COLLISION RESOLUTION - Requirements 3.3, 3.4, 4.4, 5.4, 5.5 ---
              // Check if construct is active and use its collision resolution
              const blackCollisionResult = constructSystemState.current.currentStrategy.resolveCollision(
                blackOrb.y > obs.y + obs.height // isFromAbove check for Titan stomp
              );

              if (blackCollisionResult === 'IGNORE') {
                // Blink teleport - ignore collision
                return;
              } else if (blackCollisionResult === 'DESTROY') {
                // Titan stomp - destroy obstacle
                createExplosion(obs.x + obs.width / 2, obs.y + obs.height / 2, "#FFD700");
                ParticleSystem.emitBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, ["#FFD700", "#FF6600", "#FFFFFF"]);
                ScreenShake.triggerNearMiss();
                getHapticSystem().trigger("medium");
                // Audio for Titan stomp - Requirements 6.5
                AudioSystem.playTitanStomp();
                if (!zenMode?.enabled) {
                  score.current += 25;
                  onScoreUpdate(score.current);
                }
                scorePopups.current.push({
                  x: obs.x + obs.width / 2,
                  y: obs.y + obs.height / 2,
                  text: "+25 💥",
                  color: "#FFD700",
                  life: 1.0,
                  vy: -2,
                });
                obs.passed = true;
                obs.x = -1000;
                return;
              }

              // DAMAGE result - check Second Chance first
              if (SecondChanceSystem.hasSecondChance(constructSystemState.current)) {
                // Process Second Chance - Requirements 6.1, 6.2, 6.3, 6.7
                const blackSecondChanceResult = SecondChanceSystem.processSecondChance(
                  constructSystemState.current,
                  Date.now(),
                  obstacles.current,
                  playerX
                );
                constructSystemState.current = blackSecondChanceResult.newState;

                // Smart Bomb - destroy obstacles in radius - Requirements 6.7
                blackSecondChanceResult.obstaclesToDestroy.forEach(obsId => {
                  const targetObs = obstacles.current.find(o => o.id === obsId);
                  if (targetObs) {
                    createExplosion(targetObs.x + targetObs.width / 2, targetObs.y + targetObs.height / 2, "#FF00FF");
                    targetObs.passed = true;
                    targetObs.x = -1000;
                  }
                });

                // VFX for Second Chance - Requirements 6.4, 6.8
                secondChanceVFXState.current = SecondChanceVFX.triggerSecondChance(
                  secondChanceVFXState.current,
                  blackOrb.x,
                  blackOrb.y,
                  Date.now()
                );
                createExplosion(blackOrb.x, blackOrb.y, "#FF00FF");
                ParticleSystem.emitBurst(blackOrb.x, blackOrb.y, ["#FF00FF", "#00F0FF", "#FFFFFF"]);
                getHapticSystem().trigger("heavy");
                
                // Audio for Second Chance - Requirements 6.5
                AudioSystem.playConstructDestruction();
                AudioSystem.playSmartBombShockwave();
                
                scorePopups.current.push({
                  x: blackOrb.x,
                  y: blackOrb.y - 20,
                  text: "💥 SECOND CHANCE",
                  color: "#FF00FF",
                  life: 1.5,
                  vy: -2,
                });

                // Reset streak systems
                rhythmState.current = createInitialRhythmState();
                onRhythmStateUpdate?.(1, 0);
                ChromaticAberration.endStreak();
                resonanceState.current = ResonanceSystem.createInitialResonanceState();
                return;
              }

              // Normal collision - game over
              createExplosion(blackOrb.x, blackOrb.y, blackOrb.color);
              collisionDetected = true;
              // Screen Shake on collision - Requirements 10.1
              ScreenShake.triggerCollision();
              // Audio: Game over sound - Phase 4
              AudioSystem.playGameOver();
              // Haptic Feedback: Heavy impact for collision - Requirements 4.2
              getHapticSystem().trigger("heavy");
              // Mission System: Emit COLLISION event for Sound Check - Requirements 1.4
              onMissionEvent?.({ type: 'COLLISION', value: 1 });
              // Reset rhythm state on collision - Requirements 1.5
              rhythmState.current = createInitialRhythmState();
              onRhythmStateUpdate?.(1, 0);
              // End chromatic aberration on collision - Requirements 11.3
              ChromaticAberration.endStreak();
              // Reset resonance state on collision
              resonanceState.current =
                ResonanceSystem.createInitialResonanceState();
            }
          }
        }

        // --- NEAR MISS LOGIC - Requirements 3.1, 3.2, 3.7, 3.8, 5.10 ---
        // Only check near miss if no collision occurred AND not already checked for this obstacle
        if (!whiteCollision && !blackCollision && !obs.nearMissChecked) {
          // Check white orb near miss with black obstacles (dangerous ones)
          if (obs.polarity === "black") {
            const whiteNearMiss = checkNearMiss(
              whiteOrbPos,
              whiteOrb.radius,
              obs
            );
            if (whiteNearMiss.isNearMiss) {
              obs.nearMissChecked = true; // Mark as checked to prevent duplicate triggers
              const streakResult = updateNearMissState(
                nearMissState.current,
                whiteNearMiss,
                currentTime
              );
              nearMissState.current = streakResult.newState;

              // Notify UI of near miss state change - Requirements 3.7
              onNearMissStateUpdate?.(nearMissState.current.streakCount);

              // Daily Rituals: Track near miss event - Requirements 3.7
              ritualTracking?.onNearMiss?.();

              // Mission System: Emit NEAR_MISS event for white orb - Requirements 7.3
              onMissionEvent?.({ type: 'NEAR_MISS', value: 1 });

              // Add bonus points to score
              let totalBonus = streakResult.totalBonusPoints;

              // --- PHANTOM + NEAR MISS COMBINATION - Requirements 5.10, 14.1 ---
              // Near miss + phantom = x2 multiplier on phantom bonus (40 bonus + base = 60 total)
              if (obs.isLatent) {
                const phantomNearMissBonus = calculatePhantomBonus(
                  true,
                  PHANTOM_CONFIG
                );
                totalBonus += phantomNearMissBonus;

                // Visual feedback for phantom + near miss combo - Requirements 14.1
                // Show total score (+60) with pink/magenta color for phantom combo
                // Total: 10 base + 10 near miss + 40 phantom near miss = 60
                const phantomComboTotal = 60;
                scorePopups.current.push({
                  x: whiteOrb.x + 40,
                  y: whiteOrb.y - 30,
                  text: `+${phantomComboTotal}`,
                  color: "#E91E63", // Pink/magenta for phantom combo
                  life: 1.2,
                  vy: -2,
                });
              }

              // Apply score multiplier upgrade - Requirements 6.2
              // Zen Mode: Skip score tracking - Requirements 9.1
              if (!zenMode?.enabled) {
                const finalBonus = Math.floor(
                  totalBonus * scoreMultiplierUpgrade.current
                );
                score.current += finalBonus;
                onScoreUpdate(score.current);

                // Campaign Mode: Check for level completion - Requirements 7.3
                if (
                  campaignMode?.enabled &&
                  campaignMode.targetScore &&
                  !levelCompleted.current
                ) {
                  if (score.current >= campaignMode.targetScore) {
                    levelCompleted.current = true;
                    campaignMode.onLevelComplete?.(score.current);
                  }
                }
              }

              // Create visual effects (will be implemented in 5.3)
              createNearMissEffect(
                whiteOrb.x,
                whiteOrb.y,
                whiteNearMiss.closestPoint,
                streakResult.streakBonusAwarded
              );
            }
          }

          // Check black orb near miss with white obstacles (dangerous ones)
          if (obs.polarity === "white") {
            const blackNearMiss = checkNearMiss(
              blackOrbPos,
              blackOrb.radius,
              obs
            );
            if (blackNearMiss.isNearMiss) {
              obs.nearMissChecked = true; // Mark as checked to prevent duplicate triggers
              const streakResult = updateNearMissState(
                nearMissState.current,
                blackNearMiss,
                currentTime
              );
              nearMissState.current = streakResult.newState;

              // Notify UI of near miss state change - Requirements 3.7
              onNearMissStateUpdate?.(nearMissState.current.streakCount);

              // Daily Rituals: Track near miss event - Requirements 3.7
              ritualTracking?.onNearMiss?.();

              // Mission System: Emit NEAR_MISS event for black orb - Requirements 7.3
              onMissionEvent?.({ type: 'NEAR_MISS', value: 1 });

              // Add bonus points to score
              let totalBonus = streakResult.totalBonusPoints;

              // --- PHANTOM + NEAR MISS COMBINATION - Requirements 5.10, 14.1 ---
              // Near miss + phantom = x2 multiplier on phantom bonus (40 bonus + base = 60 total)
              if (obs.isLatent) {
                const phantomNearMissBonus = calculatePhantomBonus(
                  true,
                  PHANTOM_CONFIG
                );
                totalBonus += phantomNearMissBonus;

                // Visual feedback for phantom + near miss combo - Requirements 14.1
                // Show total score (+60) with pink/magenta color for phantom combo
                // Total: 10 base + 10 near miss + 40 phantom near miss = 60
                const phantomComboTotal = 60;
                scorePopups.current.push({
                  x: blackOrb.x + 40,
                  y: blackOrb.y - 30,
                  text: `+${phantomComboTotal}`,
                  color: "#E91E63", // Pink/magenta for phantom combo
                  life: 1.2,
                  vy: -2,
                });
              }

              // Apply score multiplier upgrade - Requirements 6.2
              // Zen Mode: Skip score tracking - Requirements 9.1
              if (!zenMode?.enabled) {
                const finalBonusBlack = Math.floor(
                  totalBonus * scoreMultiplierUpgrade.current
                );
                score.current += finalBonusBlack;
                onScoreUpdate(score.current);

                // Campaign Mode: Check for level completion - Requirements 7.3
                if (
                  campaignMode?.enabled &&
                  campaignMode.targetScore &&
                  !levelCompleted.current
                ) {
                  if (score.current >= campaignMode.targetScore) {
                    levelCompleted.current = true;
                    campaignMode.onLevelComplete?.(score.current);
                  }
                }
              }

              // Create visual effects (will be implemented in 5.3)
              createNearMissEffect(
                blackOrb.x,
                blackOrb.y,
                blackNearMiss.closestPoint,
                streakResult.streakBonusAwarded
              );
            }
          }
        }
      });

      // Ghost Racer Recording - Requirements 15.4
      if (ghostRacerMode?.enabled && ghostRacerState.current.isRecording) {
        const recordingInterval = GhostRacer.getRecordingInterval();
        const timeSinceStart =
          gameTime - ghostRacerState.current.recordingStartTime;

        if (timeSinceStart - lastGhostRecordTime.current >= recordingInterval) {
          const frame: GhostRacer.GhostFrame = {
            timestamp: timeSinceStart,
            score: score.current,
            playerY: playerY.current,
            isSwapped: isSwapped.current,
          };
          ghostRacerState.current = GhostRacer.recordFrame(
            ghostRacerState.current,
            frame
          );
          lastGhostRecordTime.current = timeSinceStart;
        }
      }

      // Update Particles - Requirements 12.4, 12.5
      // Update new ParticleSystem
      ParticleSystem.update(16.67); // ~60fps delta time

      // Update Screen Shake - Requirements 10.3, 10.4
      ScreenShake.update(Date.now());

      // Update Chromatic Aberration - Requirements 11.2, 11.3
      ChromaticAberration.update(Date.now());

      // Update Resonance System - Requirements 1.7, 1.8, 1.9
      const resonanceDeltaTime = 16.67; // ~60fps
      resonanceState.current = ResonanceSystem.update(
        resonanceState.current,
        resonanceDeltaTime,
        Date.now()
      );

      // Update S.H.I.F.T. Overdrive Timer - Requirements 4.6, 4.7
      if (shiftState.current.overdriveActive) {
        const overdriveDeltaTime = 16.67; // ~60fps
        shiftState.current = ShiftProtocol.updateOverdrive(
          shiftState.current,
          overdriveDeltaTime
        );

        // Update core rotation for visual effect
        shiftState.current = {
          ...shiftState.current,
          coreRotation:
            (shiftState.current.coreRotation + 0.05) % (Math.PI * 2),
        };

        // Check if Overdrive just ended - Requirements 4.7
        if (!shiftState.current.overdriveActive) {
          // State Priority System: Resume Resonance when Overdrive ends
          // Requirements: Overdrive > Resonance (Override pattern)
          if (
            resonanceState.current.isActive &&
            resonanceState.current.isPaused
          ) {
            resonanceState.current = ResonanceSystem.resumeResonance(
              resonanceState.current
            );

            // Visual feedback for Resonance resuming
            scorePopups.current.push({
              x: width / 2,
              y: height / 2 - 80,
              text: "⚡ RESONANCE RESUMED ⚡",
              color: "#00F0FF",
              life: 1.5,
              vy: -0.5,
            });
          }

          // Visual feedback for Overdrive end
          scorePopups.current.push({
            x: width / 2,
            y: height / 2 - 50,
            text: "OVERDRIVE ENDED",
            color: "#888888",
            life: 1.5,
            vy: -0.5,
          });
        }
      }

      // Update legacy particles
      particles.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
      });
      particles.current = particles.current.filter((p) => p.life > 0);

      // Update Score Popups - Requirements 3.3
      scorePopups.current.forEach((popup) => {
        popup.y += popup.vy;
        popup.life -= 0.02;
      });
      scorePopups.current = scorePopups.current.filter(
        (popup) => popup.life > 0
      );

      // Update Visual Effects - Requirements 3.4, 3.9
      visualEffects.current.forEach((effect) => {
        effect.life -= 0.03;
        if (effect.type === "glow") {
          effect.scale += 0.05; // Expand glow
        }
      });
      visualEffects.current = visualEffects.current.filter(
        (effect) => effect.life > 0
      );

      // --- DRAW LOGIC ---

      // Screen Shake Transform - Requirements 10.3: Apply shake offset to canvas
      // Zen Mode: Reduce shake intensity - Requirements 9.4
      const shakeOffset = ScreenShake.getOffset();
      const shakeMultiplier = zenMode?.enabled
        ? ZenMode.getShakeMultiplier(zenModeState.current)
        : 1.0;
      ctx.save();
      ctx.translate(
        shakeOffset.x * shakeMultiplier,
        shakeOffset.y * shakeMultiplier
      );

      // Theme System Integration - Requirements 5.1, 5.2, 5.3
      // Backgrounds - Requirements 2.2, 4.3: Swap colors when gravity is flipped, use dynamic midline
      let topBgColor = gravityState.current.isFlipped
        ? getColor("bottomBg")
        : getColor("topBg");
      let bottomBgColor = gravityState.current.isFlipped
        ? getColor("topBg")
        : getColor("bottomBg");

      // Resonance Mode: Color Inversion - Requirements 1.2, 1.9
      const resonanceInversion = ResonanceSystem.getColorInversion(
        resonanceState.current
      );
      if (resonanceInversion.factor > 0) {
        // Interpolate between normal and inverted colors based on transition factor
        const invertedTop = ResonanceSystem.invertColor(topBgColor);
        const invertedBottom = ResonanceSystem.invertColor(bottomBgColor);
        topBgColor = ResonanceSystem.interpolateColor(
          topBgColor,
          invertedTop,
          resonanceInversion.factor
        );
        bottomBgColor = ResonanceSystem.interpolateColor(
          bottomBgColor,
          invertedBottom,
          resonanceInversion.factor
        );
      }

      // Requirements 4.3: Draw top zone from Y=0 to Y=currentMidlineY
      ctx.fillStyle = topBgColor;
      ctx.fillRect(0, 0, width, currentMidlineY);
      // Requirements 4.3: Draw bottom zone from Y=currentMidlineY to Y=canvasHeight
      ctx.fillStyle = bottomBgColor;
      ctx.fillRect(0, currentMidlineY, width, height - currentMidlineY);

      // Theme Effects - Requirements 5.4: Cyberpunk grid lines
      if (hasEffect("gridLines")) {
        ctx.strokeStyle = getColor("accent") + "20"; // 20% opacity
        ctx.lineWidth = 1;
        const gridSize = 40;
        // Vertical lines
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        // Horizontal lines
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      // Theme Effects - Requirements 5.6: Zen soft gradients
      if (hasEffect("softGradients")) {
        // Add subtle gradient overlay for zen effect
        const zenGradient = ctx.createLinearGradient(0, 0, 0, height);
        zenGradient.addColorStop(0, "rgba(255, 255, 255, 0.05)");
        zenGradient.addColorStop(0.5, "rgba(255, 255, 255, 0)");
        zenGradient.addColorStop(1, "rgba(0, 0, 0, 0.05)");
        ctx.fillStyle = zenGradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Requirements 4.4: Horizon Line at currentMidlineY position
      ctx.beginPath();
      ctx.moveTo(0, currentMidlineY);
      ctx.lineTo(width, currentMidlineY);

      // Gerilim görsel efekti - midline hareket ettiğinde
      const tension = tensionIntensityRef.current;
      // Theme System Integration - Requirements 5.1, 5.2, 5.3
      const accentColor = getColor("accent");

      if (tension > 0.1) {
        // Gerilim arttıkça çizgi kalınlaşır ve renk değişir
        const tensionColor =
          tension > 0.7 ? "#FF4444" : tension > 0.4 ? "#FFAA00" : accentColor;
        const lineWidth = 2 + tension * 6; // 2-8 arası kalınlık

        // Titreşim efekti - gerilim yüksekken çizgi hafifçe titrer
        const shake =
          tension > 0.5 ? Math.sin(Date.now() * 0.05) * tension * 3 : 0;

        ctx.strokeStyle = tensionColor;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = tensionColor;
        ctx.shadowBlur = 10 + tension * 20;

        // Titreşimli çizgi
        ctx.beginPath();
        ctx.moveTo(0, currentMidlineY + shake);
        ctx.lineTo(width, currentMidlineY + shake);
        ctx.stroke();

        // Ek glow katmanı
        ctx.globalAlpha = tension * 0.3;
        ctx.lineWidth = lineWidth * 2;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      } else if (midlineState.current.isAtPeak) {
        // Requirements 4.7: Accent highlight when at peak/trough
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
      } else {
        ctx.strokeStyle = getColor("connector");
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
      ctx.shadowBlur = 0; // Reset shadow

      // Requirements 4.8: Critical space warning overlay
      if (isCritical) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = "#FF6600"; // Orange warning tint
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1.0;

        // Warning text
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = "#FF6600";
        ctx.textAlign = "center";
        ctx.fillText("⚠ CRITICAL SPACE", width / 2, 100);
      }

      // Requirements 4.14: Forecasting hint - directional shadow on horizon
      const peakPrediction = predictPeakTime(elapsedTime, currentFrequency);
      if (peakPrediction.timeToNextPeak < MIDLINE_CONFIG.forecastTime) {
        const forecastAlpha =
          1 - peakPrediction.timeToNextPeak / MIDLINE_CONFIG.forecastTime;
        const forecastOffset = peakPrediction.direction === "down" ? 15 : -15;

        ctx.globalAlpha = forecastAlpha * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, currentMidlineY + forecastOffset);
        ctx.lineTo(width, currentMidlineY + forecastOffset);
        // Theme System Integration - Requirements 5.1, 5.2, 5.3
        ctx.strokeStyle = getColor("accent");
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
      }

      // --- GRAVITY WARNING INDICATOR - Requirements 2.2, 2.5 ---
      if (gravityState.current.warningActive) {
        const warningElapsed =
          currentTime - gravityState.current.warningStartTime;
        const warningProgress = warningElapsed / GRAVITY_CONFIG.warningDuration;
        const pulseIntensity =
          Math.sin(warningProgress * Math.PI * 4) * 0.5 + 0.5; // Pulsing effect

        // Draw warning overlay
        ctx.globalAlpha = 0.3 * pulseIntensity;
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1.0;

        // Draw warning text
        ctx.font = "bold 24px Arial";
        ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + pulseIntensity * 0.5})`;
        ctx.textAlign = "center";
        ctx.fillText("⚠ GRAVITY FLIP ⚠", width / 2, 60);

        // Draw countdown bar
        const barWidth = 200;
        const barHeight = 8;
        const barX = (width - barWidth) / 2;
        const barY = 80;

        ctx.fillStyle = "#333";
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = "#FF0000";
        ctx.fillRect(barX, barY, barWidth * (1 - warningProgress), barHeight);
      }

      // Draw flip indicator when gravity is flipped
      if (gravityState.current.isFlipped) {
        ctx.font = "bold 14px Arial";
        // Theme System Integration - Requirements 5.1, 5.2, 5.3
        ctx.fillStyle = getColor("accent");
        ctx.textAlign = "right";
        ctx.fillText("🔄 FLIPPED", width - 20, 30);
      }

      // Resonance Mode Timer Indicator - Requirements 1.7
      if (resonanceState.current.isActive) {
        const remainingSeconds = Math.ceil(
          resonanceState.current.remainingTime / 1000
        );
        const timerProgress =
          resonanceState.current.remainingTime /
          ResonanceSystem.RESONANCE_CONFIG.duration;

        // Draw resonance indicator bar at top
        const barWidth = 200;
        const barHeight = 8;
        const barX = (width - barWidth) / 2;
        const barY = 50;

        // Background bar
        ctx.fillStyle = "#333333";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress bar with cyan glow
        ctx.shadowColor = "#00F0FF";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#00F0FF";
        ctx.fillRect(barX, barY, barWidth * timerProgress, barHeight);
        ctx.shadowBlur = 0;

        // Timer text
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "#00F0FF";
        ctx.textAlign = "center";
        ctx.fillText(
          `⚡ HARMONIC RESONANCE ⚡ ${remainingSeconds}s`,
          width / 2,
          barY - 10
        );

        // Destroyed count
        if (resonanceState.current.obstaclesDestroyed > 0) {
          ctx.font = "bold 12px Arial";
          ctx.fillText(
            `💥 ${resonanceState.current.obstaclesDestroyed} destroyed (+${resonanceState.current.bonusScore})`,
            width / 2,
            barY + 25
          );
        }
      }

      // Obstacles - Requirements 5.3, 5.4, 5.5
      // Theme System Integration - Requirements 5.1, 5.2, 5.3
      // Obstacle colors are based on POLARITY (white/black), not lane (top/bottom)
      // This matches the game logic: white orb passes through white obstacles, black orb passes through black obstacles
      const whiteObstacleColor = getColor("topOrb"); // White obstacles use topOrb color (same as white orb)
      const blackObstacleColor = getColor("bottomOrb"); // Black obstacles use bottomOrb color (same as black orb)

      if (obstacles.current.length > 0 && framesSinceSpawn.current % 60 === 0) {
        console.log(
          "[RENDER] Drawing",
          obstacles.current.length,
          "obstacles. First obs:",
          obstacles.current[0]?.x,
          obstacles.current[0]?.y
        );
      }

      obstacles.current.forEach((obs) => {
        // Use polarity to determine obstacle color - matches orb colors
        // white polarity = topOrb color (white orb can pass through)
        // black polarity = bottomOrb color (black orb can pass through)
        const isWhitePolarity = obs.polarity === "white";
        const obstacleColor = isWhitePolarity
          ? whiteObstacleColor
          : blackObstacleColor;
        const oppositeColor = isWhitePolarity
          ? blackObstacleColor
          : whiteObstacleColor;

        // --- PHANTOM OPACITY CALCULATION - Requirements 5.3, 5.4, 5.5 ---
        let obstacleOpacity = 1.0;
        if (
          obs.isLatent &&
          obs.initialX !== undefined &&
          obs.revealDistance !== undefined
        ) {
          // Calculate opacity based on current position - Requirements 5.3
          const calculatedOpacity = calculatePhantomOpacity(
            obs.x,
            obs.initialX,
            obs.revealDistance
          );
          // Apply minimum opacity threshold for ghost outline - Requirements 5.4
          obstacleOpacity = getEffectiveOpacity(
            calculatedOpacity,
            PHANTOM_CONFIG.minOpacity
          );
        }

        // Apply opacity to context
        ctx.globalAlpha = obstacleOpacity;

        // Draw the block body - Theme System Integration
        ctx.fillStyle = obstacleColor;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Border - contrasting color for visibility
        ctx.lineWidth = 2;
        ctx.strokeStyle = oppositeColor;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // Theme Effects - Requirements 5.4: Cyberpunk glowing edges
        if (hasEffect("glowEdges")) {
          ctx.shadowColor = obstacleColor;
          ctx.shadowBlur = 10;
          ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
          ctx.shadowBlur = 0;
        }

        // Theme Effects - Requirements 5.5: Retro pixelated edges
        if (hasEffect("pixelated")) {
          // Add pixelated corner effect
          const pixelSize = 4;
          ctx.fillStyle = oppositeColor;
          // Top-left corner
          ctx.fillRect(obs.x, obs.y, pixelSize, pixelSize);
          // Top-right corner
          ctx.fillRect(
            obs.x + obs.width - pixelSize,
            obs.y,
            pixelSize,
            pixelSize
          );
          // Bottom-left corner
          ctx.fillRect(
            obs.x,
            obs.y + obs.height - pixelSize,
            pixelSize,
            pixelSize
          );
          // Bottom-right corner
          ctx.fillRect(
            obs.x + obs.width - pixelSize,
            obs.y + obs.height - pixelSize,
            pixelSize,
            pixelSize
          );
        }

        // Requirements 5.5: When fully transparent, draw faint ghost outline (α = 0.05)
        // This is already handled by getEffectiveOpacity ensuring minOpacity
        // But we can add an extra subtle glow for phantom obstacles
        if (obs.isLatent && obstacleOpacity < 0.5) {
          ctx.globalAlpha = PHANTOM_CONFIG.minOpacity;
          ctx.strokeStyle = `${obstacleColor}4D`; // 30% opacity
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]); // Dashed line for ghost effect
          ctx.strokeRect(obs.x - 2, obs.y - 2, obs.width + 4, obs.height + 4);
          ctx.setLineDash([]); // Reset dash
        }

        // Reset opacity
        ctx.globalAlpha = 1.0;
      });

      // --- PATTERN SHARD RENDERING - Requirements 5.1, 5.2, 5.3, 5.4, 5.5 ---
      // GÜNCELLEME: Bonus shard görünümü eklendi
      activeShards.current.forEach((shard) => {
        if (shard.collected) return;

        const shardTime = Date.now() * 0.003;
        const isBonus = (shard as ShardPlacement.PlacedShard).isBonus || shard.type === "bonus";
        
        // Bonus shardlar daha büyük ve daha hızlı pulse
        const pulseSpeed = isBonus ? 2.5 : 1;
        const pulseScale = 1 + Math.sin(shardTime * pulseSpeed) * (isBonus ? 0.2 : 0.1);
        const baseSize = isBonus ? 16 : 12;
        const shardSize = baseSize * pulseScale;

        ctx.save();
        ctx.translate(shard.x, shard.y);
        
        // Bonus shardlar döner
        if (isBonus) {
          ctx.rotate(shardTime * 2);
        }

        // Draw outer glow - bonus için daha güçlü
        if (isBonus) {
          ctx.shadowColor = "#FF6B00";
          ctx.shadowBlur = 25 + Math.sin(shardTime * 3) * 10;
        } else {
          ctx.shadowColor = shard.type === "risky" ? "#FFD700" : "#00F0FF";
          ctx.shadowBlur = 15;
        }

        // Draw diamond shape
        ctx.beginPath();
        ctx.moveTo(0, -shardSize);
        ctx.lineTo(shardSize, 0);
        ctx.lineTo(0, shardSize);
        ctx.lineTo(-shardSize, 0);
        ctx.closePath();

        // Fill with gradient
        const gradient = ctx.createLinearGradient(
          -shardSize,
          -shardSize,
          shardSize,
          shardSize
        );
        if (isBonus) {
          // Bonus: Turuncu-altın gradient
          gradient.addColorStop(0, "#FF6B00");
          gradient.addColorStop(0.5, "#FFD700");
          gradient.addColorStop(1, "#FF6B00");
        } else if (shard.type === "risky") {
          gradient.addColorStop(0, "#FFD700");
          gradient.addColorStop(1, "#FFA500");
        } else {
          gradient.addColorStop(0, "#00F0FF");
          gradient.addColorStop(1, "#00BFFF");
        }
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw border
        ctx.strokeStyle = isBonus ? "#FFFFFF" : "#FFFFFF";
        ctx.lineWidth = isBonus ? 3 : 2;
        ctx.stroke();
        
        // Bonus için ekstra iç yıldız
        if (isBonus) {
          ctx.beginPath();
          const innerSize = shardSize * 0.5;
          ctx.moveTo(0, -innerSize);
          ctx.lineTo(innerSize, 0);
          ctx.lineTo(0, innerSize);
          ctx.lineTo(-innerSize, 0);
          ctx.closePath();
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
        }

        ctx.restore();
      });

      // --- GLITCH TOKEN RENDERING - Requirements 1.2 ---
      const tokenTime = Date.now() * 0.001;
      glitchTokens.current.forEach((token) => {
        if (token.collected) return;
        
        // Pulsing glow effect
        const pulseIntensity = 0.5 + 0.5 * Math.sin(tokenTime * 5);
        const glowSize = 20 + pulseIntensity * 15;
        
        ctx.save();
        ctx.shadowColor = "#00F0FF";
        ctx.shadowBlur = glowSize;
        
        // Draw rotating hexagon
        ctx.translate(token.x, token.y);
        ctx.rotate(tokenTime * 3);
        
        // Outer hexagon
        ctx.beginPath();
        const hexSize = 25;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = Math.cos(angle) * hexSize;
          const y = Math.sin(angle) * hexSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = "#00F0FF";
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Inner hexagon with different color
        ctx.beginPath();
        const innerHexSize = 15;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = Math.cos(angle) * innerHexSize;
          const y = Math.sin(angle) * innerHexSize;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255, 0, 255, ${0.5 + pulseIntensity * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.rotate(-tokenTime * 3);
        ctx.translate(-token.x, -token.y);
        
        // Draw construct type indicator
        ctx.font = "bold 12px Arial";
        ctx.fillStyle = "#00F0FF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#FF00FF";
        ctx.shadowBlur = 8;
        
        // Show first letter of construct type
        const typeLabel = token.constructType.charAt(0);
        ctx.fillText(typeLabel, token.x, token.y);
        
        ctx.restore();
      });

      // S.H.I.F.T. COLLECTIBLE RENDERING - DISABLED


      // --- S.H.I.F.T. HUD RENDERING - Modern Neon Design ---
      const hudX = width / 2;
      const hudY = 28;
      const letterSpacing = 28;
      const letters = ShiftProtocol.TARGET_WORD;
      const hudTime = Date.now() * 0.001;
      const hudPulse = 0.5 + 0.5 * Math.sin(hudTime * 3);

      // HUD arka plan çerçevesi
      const hudWidth = letterSpacing * 5 + 20;
      const hudHeight = 36;
      ctx.save();
      
      // Yarı saydam arka plan
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.roundRect(hudX - hudWidth / 2, hudY - hudHeight / 2, hudWidth, hudHeight, 8);
      ctx.fill();
      
      // Çerçeve
      ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      letters.forEach((letter, index) => {
        const x = hudX + (index - 2) * letterSpacing;
        const isCollected = shiftState.current.collectedMask[index];

        if (isCollected) {
          // Toplanan harf - parlak neon efekti
          // Arka plan glow
          ctx.beginPath();
          ctx.arc(x, hudY, 12, 0, Math.PI * 2);
          const glowGrad = ctx.createRadialGradient(x, hudY, 0, x, hudY, 12);
          glowGrad.addColorStop(0, "rgba(0, 240, 255, 0.4)");
          glowGrad.addColorStop(1, "rgba(0, 240, 255, 0)");
          ctx.fillStyle = glowGrad;
          ctx.fill();
          
          // Harf
          ctx.font = "bold 16px 'Arial Black', sans-serif";
          ctx.fillStyle = "#00F0FF";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = "#00F0FF";
          ctx.shadowBlur = 12 + hudPulse * 5;
          ctx.fillText(letter, x, hudY);
        } else {
          // Toplanmamış harf - soluk
          ctx.font = "bold 16px 'Arial Black', sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowBlur = 0;
          ctx.fillText(letter, x, hudY);
        }
      });

      ctx.restore();

      // Overdrive aktifse - özel efekt
      if (shiftState.current.overdriveActive) {
        const remainingSeconds = Math.ceil(shiftState.current.overdriveTimer / 1000);
        const timerProgress = shiftState.current.overdriveTimer / SHIFT_CONFIG.overdriveDuration;
        const overdrivePulse = 0.5 + 0.5 * Math.sin(hudTime * 6);

        // Progress bar
        const barWidth = 140;
        const barHeight = 4;
        const barX = hudX - barWidth / 2;
        const barY = hudY + 22;

        // Bar arka plan
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.beginPath();
        ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 3);
        ctx.fill();

        // Progress gradient
        const barGrad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
        barGrad.addColorStop(0, "#00F0FF");
        barGrad.addColorStop(0.5, "#8A2BE2");
        barGrad.addColorStop(1, "#FF00FF");
        
        ctx.fillStyle = barGrad;
        ctx.shadowColor = "#00F0FF";
        ctx.shadowBlur = 10 + overdrivePulse * 5;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth * timerProgress, barHeight, 2);
        ctx.fill();

        // Timer text
        ctx.font = "bold 10px 'Arial', sans-serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.shadowColor = "#FF00FF";
        ctx.shadowBlur = 8;
        ctx.fillText(`⚡ OVERDRIVE ${remainingSeconds}s ⚡`, hudX, barY + 14);
        ctx.shadowBlur = 0;
      }

      // Calculate center point
      const centerX = (whiteOrb.x + blackOrb.x) / 2;
      const centerY = (whiteOrb.y + blackOrb.y) / 2;
      const time = Date.now() * 0.003;

      // 1. Draw Connector - Theme System Integration - Requirements 5.1, 5.2, 5.3
      const gradient = ctx.createLinearGradient(
        whiteOrb.x,
        whiteOrb.y,
        blackOrb.x,
        blackOrb.y
      );
      gradient.addColorStop(0, getColor("topOrb"));
      gradient.addColorStop(0.5, getColor("connector"));
      gradient.addColorStop(1, getColor("bottomOrb"));

      ctx.beginPath();
      ctx.moveTo(whiteOrb.x, whiteOrb.y);
      ctx.lineTo(blackOrb.x, blackOrb.y);
      ctx.lineWidth = INITIAL_CONFIG.connectorWidth;
      ctx.strokeStyle = gradient;
      ctx.stroke();

      // Helper to draw an orb - Skin System Integration - Requirements 3.1, 3.2, 3.3, 3.4
      // Theme System Integration - Requirements 5.1, 5.2, 5.3
      // isWhite parameter determines the orb's identity (not position):
      // - isWhite=true: This is the "white/top" orb, uses topOrb theme color
      // - isWhite=false: This is the "black/bottom" orb, uses bottomOrb theme color
      // When swapped, positions change but color identity stays the same
      const drawOrb = (
        orb: { x: number; y: number; radius: number; color: string },
        isWhite: boolean
      ) => {
        const skin = getSkinById(equippedSkin);

        // Use isWhite to determine color identity (topOrb vs bottomOrb)
        // This matches the default theme logic: white orb = topOrb color, black orb = bottomOrb color
        const isTopOrb = isWhite;

        // Resonance Mode: Change orb colors to bright cyan with bloom/glow - Requirements 1.3
        if (resonanceState.current.isActive || resonanceInversion.factor > 0) {
          const resonanceColor = ResonanceSystem.getResonanceOrbColor();
          const glowIntensity = resonanceInversion.factor;

          // Draw bloom/glow effect
          if (glowIntensity > 0) {
            ctx.save();
            ctx.shadowColor = resonanceColor;
            ctx.shadowBlur = 20 + glowIntensity * 15;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius * 1.2, 0, Math.PI * 2);
            ctx.fillStyle =
              resonanceColor +
              Math.floor(glowIntensity * 128)
                .toString(16)
                .padStart(2, "0");
            ctx.fill();
            ctx.restore();
          }

          // Draw orb with resonance color
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
          ctx.fillStyle = ResonanceSystem.interpolateColor(
            isWhite ? getColor("topOrb") : getColor("bottomOrb"),
            resonanceColor,
            glowIntensity
          );
          ctx.fill();

          // Glowing border
          ctx.lineWidth = 2;
          ctx.strokeStyle = resonanceColor;
          ctx.shadowColor = resonanceColor;
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          // Orb renkleri (tema sisteminden):
          // - topOrb = bottomBg (beyaz/açık renk)
          // - bottomOrb = topBg (siyah/koyu renk)
          let orbFillColor = isWhite ? getColor("topOrb") : getColor("bottomOrb");
          let orbBorderColor = isWhite ? getColor("bottomOrb") : getColor("topOrb");

          // Fallback to default colors if theme system returns empty
          if (!orbFillColor) orbFillColor = isWhite ? "#FFFFFF" : "#000000";
          if (!orbBorderColor) orbBorderColor = isWhite ? "#000000" : "#FFFFFF";

          // Determine zone background: check orb Y position against midline
          const midY = height / 2;
          const currentZoneBg = orb.y < midY ? getColor("topBg") || "#000000" : getColor("bottomBg") || "#FFFFFF";

          // Only draw border if orb color matches background (for visibility)
          const needsBorder = orbFillColor.toLowerCase() === currentZoneBg.toLowerCase();

          // Her zaman içi dolu çiz (orb rengiyle), border SADECE gerektiğinde
          if (skin.id === "default") {
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            ctx.fillStyle = orbFillColor;
            ctx.fill();

            // Border only when orb blends with background
            if (needsBorder) {
              ctx.beginPath();
              ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
              ctx.lineWidth = 2;
              ctx.strokeStyle = orbBorderColor;
              ctx.stroke();
            }
          } else {
            renderOrb(
              { ctx, x: orb.x, y: orb.y, radius: orb.radius, isTopOrb },
              skin
            );
            // Border for custom skins if needed
            if (needsBorder) {
              ctx.beginPath();
              ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
              ctx.lineWidth = 2;
              ctx.strokeStyle = orbBorderColor;
              ctx.stroke();
            }
          }

          // Theme Effects - Requirements 5.4: Cyberpunk glowing edges
          if (hasEffect("glowEdges")) {
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            ctx.shadowColor = orbFillColor;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      };

      // Ghost Racer Rendering - Requirements 15.1, 15.2, 15.3
      if (ghostRacerMode?.enabled && savedGhostTimeline.current) {
        const timeSinceStart =
          gameTime - ghostRacerState.current.recordingStartTime;
        const ghostPosition = GhostRacer.getGhostPosition(
          savedGhostTimeline.current,
          timeSinceStart
        );

        if (ghostPosition) {
          const ghostY = ghostPosition.playerY * height;
          const ghostX = playerX - 50; // Slightly behind player

          // Render ghost orbs - Requirements 15.1
          GhostRacer.renderGhost(
            ctx,
            ghostX,
            ghostY,
            INITIAL_CONFIG.orbRadius,
            ghostPosition.isSwapped,
            getColor("topOrb"),
            getColor("bottomOrb"),
            currentConnectorLength.current
          );

          // Check if player is ahead and show indicator - Requirements 15.3
          if (
            GhostRacer.isPlayerAhead(
              score.current,
              timeSinceStart,
              savedGhostTimeline.current
            )
          ) {
            GhostRacer.renderAheadIndicator(
              ctx,
              playerX,
              playerY.current * height
            );
          }
        }
      }

      // 2. Draw Orbs with Trail Effects
      // Get trail config for equipped skin
      const trailConfig = OrbTrailSystem.getTrailConfig(equippedSkin);

      // Emit trail particles from current orb positions
      if (trailConfig.enabled) {
        OrbTrailSystem.emitTrail(whiteOrb.x, whiteOrb.y, true, trailConfig);
        OrbTrailSystem.emitTrail(blackOrb.x, blackOrb.y, false, trailConfig);
        OrbTrailSystem.updateTrails(1 / 60, trailConfig); // Assume 60fps
      }

      // Render trails BEFORE orbs so they appear behind
      OrbTrailSystem.renderTrails(ctx, trailConfig);

      // --- CONSTRUCT RENDERING - Requirements 3.5, 4.5, 5.6 ---
      // Update construct render state for animations
      const playerCenterX = playerX;
      const playerCenterY = playerY.current * height;
      constructRenderState.current = ConstructRenderer.updateConstructRenderState(
        constructRenderState.current,
        16.67, // Assume ~60fps
        playerCenterX,
        playerCenterY
      );
      
      // Render construct sprite if active (instead of normal orbs)
      const activeConstruct = constructSystemState.current.activeConstruct;
      const isConstructInvulnerable = ConstructSystem.isInvulnerable(
        constructSystemState.current,
        Date.now()
      );
      
      if (activeConstruct !== 'NONE') {
        // Get ghost Y for Blink construct (from input state)
        const blinkGhostY = activeConstruct === 'BLINK' && inputStateRef.current.isPressed
          ? inputStateRef.current.y
          : null;
        
        // Render the construct at player position
        ConstructRenderer.renderConstruct(
          ctx,
          activeConstruct,
          playerCenterX,
          playerCenterY,
          INITIAL_CONFIG.orbRadius,
          constructRenderState.current,
          isConstructInvulnerable,
          blinkGhostY,
          1 // gravityDirection - could be from PhasePhysics state
        );
      } else {
        // Draw the normal orbs when no construct is active
        drawOrb(blackOrb, false);
        drawOrb(whiteOrb, true);
      }

      // Post-restore invincibility visual effect - cyan glow and countdown
      if (postRestoreInvincible.current) {
        const timeSinceRestore = Date.now() - postRestoreStartTime.current;
        const remainingTime =
          POST_RESTORE_INVINCIBILITY_DURATION - timeSinceRestore;

        if (remainingTime > 0) {
          // Pulsing cyan glow around orbs
          const pulseIntensity = 15 + 10 * Math.sin(timeSinceRestore * 0.02);

          ctx.save();
          ctx.shadowColor = "#00F0FF";
          ctx.shadowBlur = pulseIntensity;

          // Glow around white orb
          ctx.beginPath();
          ctx.arc(whiteOrb.x, whiteOrb.y, whiteOrb.radius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "#00F0FF";
          ctx.lineWidth = 3;
          ctx.stroke();

          // Glow around black orb
          ctx.beginPath();
          ctx.arc(blackOrb.x, blackOrb.y, blackOrb.radius + 5, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();

          // "HAZIR OL!" text with countdown
          const textOpacity = 0.5 + 0.5 * Math.sin(timeSinceRestore * 0.01);
          ctx.fillStyle = `rgba(0, 240, 255, ${textOpacity})`;
          ctx.font = "bold 28px monospace";
          ctx.textAlign = "center";
          ctx.fillText("HAZIR OL!", width / 2, height / 2);

          // Countdown number
          const secondsLeft = Math.ceil(remainingTime / 1000);
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.font = "bold 48px monospace";
          ctx.fillText(secondsLeft.toString(), width / 2, height / 2 + 50);
        }
      }

      // No center symbol - clean design

      // --- CONSTRUCT INVINCIBILITY VFX - Requirements 6.6 ---
      // Flashing effect when invulnerable after transformation or Second Chance
      if (ConstructSystem.isInvulnerable(constructSystemState.current, Date.now())) {
        const remainingInvincibility = ConstructSystem.getRemainingInvincibility(
          constructSystemState.current,
          Date.now()
        );
        
        // Pulsing magenta glow around orbs
        const pulseIntensity = 15 + 10 * Math.sin(Date.now() * 0.02);
        const flashOpacity = 0.3 + 0.4 * Math.sin(Date.now() * 0.015);
        
        ctx.save();
        ctx.shadowColor = "#FF00FF";
        ctx.shadowBlur = pulseIntensity;
        ctx.globalAlpha = flashOpacity;
        
        // Glow around white orb
        ctx.beginPath();
        ctx.arc(whiteOrb.x, whiteOrb.y, whiteOrb.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = "#FF00FF";
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Glow around black orb
        ctx.beginPath();
        ctx.arc(blackOrb.x, blackOrb.y, blackOrb.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // Show active construct indicator
        if (constructSystemState.current.activeConstruct !== 'NONE') {
          ctx.fillStyle = `rgba(255, 0, 255, ${0.5 + 0.3 * Math.sin(Date.now() * 0.01)})`;
          ctx.font = "bold 20px monospace";
          ctx.textAlign = "center";
          ctx.fillText(
            `⚡ ${constructSystemState.current.activeConstruct} ⚡`,
            width / 2,
            50
          );
        }
      }

      // --- CONSTRUCT VFX RENDERING - Requirements 2.2, 6.4, 6.8 ---
      // Render transformation VFX
      if (TransformationVFX.isTransformationActive(transformationVFXState.current)) {
        TransformationVFX.renderTransformationVFX(ctx, canvas, transformationVFXState.current);
      }
      
      // Render Second Chance VFX (shockwave, explosion)
      if (SecondChanceVFX.isSecondChanceVFXActive(secondChanceVFXState.current)) {
        SecondChanceVFX.renderSecondChanceVFX(ctx, secondChanceVFXState.current);
      }

      // Particles - Requirements 12.1, 12.2, 12.3
      // Zen Mode: Reduce visual intensity - Requirements 9.4
      const visualIntensity = zenMode?.enabled
        ? ZenMode.getVisualIntensity(zenModeState.current)
        : 1.0;

      // Render new ParticleSystem particles with Zen Mode intensity
      ctx.globalAlpha = visualIntensity;
      ParticleSystem.render(ctx);
      ctx.globalAlpha = 1.0;

      // Render legacy particles with Zen Mode intensity - VFX Polish Phase 4
      particles.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.life * visualIntensity;

        // Add glow effect
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * p.life;

        // Dynamic size based on life
        const size = (2 + p.life * 4) * (0.8 + Math.random() * 0.4);

        // Draw particle with gradient
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.5, p.color);
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw Visual Effects - Requirements 3.4, 3.9
      // Zen Mode: Reduce visual intensity - Requirements 9.4
      visualEffects.current.forEach((effect) => {
        ctx.globalAlpha = effect.life * visualIntensity;

        if (effect.type === "glow") {
          // Requirements 3.4: Cyan glow pulse effect
          const glowRadius = INITIAL_CONFIG.orbRadius * effect.scale * 2;
          const glowGradient = ctx.createRadialGradient(
            effect.x,
            effect.y,
            0,
            effect.x,
            effect.y,
            glowRadius
          );
          glowGradient.addColorStop(0, effect.color);
          glowGradient.addColorStop(1, "transparent");
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        } else if (effect.type === "burst") {
          // Requirements 3.9: Enhanced golden burst effect
          const burstRadius = 20 * effect.scale;
          const burstGradient = ctx.createRadialGradient(
            effect.x,
            effect.y,
            0,
            effect.x,
            effect.y,
            burstRadius
          );
          burstGradient.addColorStop(0, effect.color);
          burstGradient.addColorStop(0.5, effect.color + "80");
          burstGradient.addColorStop(1, "transparent");
          ctx.fillStyle = burstGradient;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, burstRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1.0;
      });

      // Draw Score Popups - Requirements 3.3, 3.8 - VFX Polish Phase 4
      scorePopups.current.forEach((popup) => {
        ctx.save();

        // Calculate scale based on life (pop-in effect then shrink)
        const lifeProgress = 1 - popup.life;
        const scale = lifeProgress < 0.1
          ? 0.5 + lifeProgress * 5  // Pop-in from 0.5 to 1.0
          : 1.0 - lifeProgress * 0.3; // Shrink from 1.0 to 0.7

        ctx.globalAlpha = popup.life;

        // Glow effect
        ctx.shadowColor = popup.color;
        ctx.shadowBlur = 12 * popup.life;

        // Determine font size based on content
        const isSpecial = popup.text.includes("PERFECT") ||
          popup.text.includes("SHIELD") ||
          popup.text.includes("⚡");
        const baseFontSize = isSpecial ? 18 : 15;
        const fontSize = Math.round(baseFontSize * scale);

        ctx.font = `bold ${fontSize}px "Segoe UI", system-ui, sans-serif`;
        ctx.fillStyle = popup.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw text with slight outline for better visibility
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 2;
        ctx.strokeText(popup.text, popup.x, popup.y);
        ctx.fillText(popup.text, popup.x, popup.y);

        ctx.restore();
      });

      // Restore canvas context after screen shake transform - Requirements 10.4
      ctx.restore();

      // Apply Chromatic Aberration post-process effect - Requirements 11.1, 11.2
      // This must be applied after ctx.restore() to affect the entire frame
      ChromaticAberration.applyEffect(ctx, canvas);

      if (collisionDetected && !DEBUG_IMMORTAL_MODE) {
        // Zen Mode: Respawn instead of game over - Requirements 9.2
        if (zenMode?.enabled && zenModeState.current.isActive) {
          const collisionTime = Date.now();
          const { newState, shouldRespawn } = ZenMode.handleZenModeCollision(
            zenModeState.current,
            collisionTime
          );
          zenModeState.current = newState;

          if (shouldRespawn) {
            // Respawn player at center - Requirements 9.2
            playerY.current = ZenMode.getRespawnPosition();
            targetPlayerY.current = ZenMode.getRespawnPosition();

            // Reset swap state
            isSwapped.current = false;
            rotationAngle.current = 0;
            targetRotation.current = 0;

            // Notify callback
            zenMode.onRespawn?.(zenModeState.current.respawnCount);
          }
        } else if (
          restoreMode?.enabled &&
          !restoreState.current.hasBeenUsed &&
          !pendingRestore.current
        ) {
          // Restore Mode: Show restore prompt instead of immediate game over - Requirements 2.1, 2.2
          pendingRestore.current = true;
          scoreAtDeath.current = score.current;

          // Notify parent to show restore prompt - Requirements 2.1
          const canRestore = RestoreSystem.canRestore(
            restoreState.current,
            useGameStore.getState().echoShards
          );
          restoreMode.onShowRestorePrompt?.(score.current, canRestore);

          // Don't return here - let the loop continue but collision detection will be skipped
          // because pendingRestore.current is now true
        } else {
          // Normal mode: Game over
          // Ghost Racer: Save timeline if new high score - Requirements 15.4
          if (ghostRacerMode?.enabled && ghostRacerState.current.isRecording) {
            const finalScore = score.current;
            ghostRacerState.current = GhostRacer.stopRecording(
              ghostRacerState.current,
              finalScore
            );

            // Check if new high score and save - Requirements 15.4
            if (
              GhostRacer.isNewHighScore(finalScore, savedGhostTimeline.current)
            ) {
              if (ghostRacerState.current.savedTimeline) {
                GhostRacer.saveTimeline(ghostRacerState.current.savedTimeline);
                ghostRacerMode.onNewHighScore?.(finalScore);
              }
            }
          }

          // Clear snapshot buffer on game end - Requirements 7.4
          snapshotBuffer.current = RestoreSystem.clearSnapshotBuffer(
            snapshotBuffer.current
          );

          // Mission System: Emit final STAY_LANE event on game end - Requirements 7.5
          const finalLaneStayDuration = Date.now() - laneStayStartTime.current;
          if (finalLaneStayDuration > 0) {
            onMissionEvent?.({ type: 'STAY_LANE', value: finalLaneStayDuration });
          }

          setTimeout(() => {
            onGameOver(score.current);
          }, 50);
          return;
        }
      }

      frameId.current = requestAnimationFrame(loop);
    };

    frameId.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Restore animation state - stores all snapshots for rewind playback
  const isRestoreAnimating = useRef<boolean>(false);
  const restoreSnapshotsForRewind = useRef<RestoreSystem.GameSnapshot[]>([]);
  const rewindFrameIndex = useRef<number>(0);
  const rewindStartTime = useRef<number>(0);

  // Post-restore invincibility state
  const postRestoreInvincible = useRef<boolean>(false);
  const postRestoreStartTime = useRef<number>(0);
  const POST_RESTORE_INVINCIBILITY_DURATION = 1000; // 1 second invincibility after restore

  // Handle restore request - Requirements 2.5, 2.6
  // Plays back recorded snapshots in REVERSE for a true rewind effect
  useEffect(() => {
  }, [
    restoreRequested,
    restoreMode,
    onRestoreStateUpdate,
    onScoreUpdate,
    setGameSpeedDisplay,
    onGameOver,
  ]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden cursor-pointer touch-none select-none"
    >
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />

      {/* Mobile Controls Hint - Show briefly when playing on mobile */}
      {isMobile && gameState === GameState.PLAYING && showMobileHint && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-500">
          <div className="flex flex-col items-center gap-1 text-white/60 text-sm bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">↕</span>
              <span>Basılı tut & kaydır</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 16V4M7 4L3 8M7 4L11 8" />
                <path d="M17 8V20M17 20L21 16M17 20L13 16" />
              </svg>
              <span>Bırak = Dön</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameEngine;
