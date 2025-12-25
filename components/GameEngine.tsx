import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  GLITCH_CONFIG,
  GRAVITY_CONFIG,
  INITIAL_CONFIG,
  MIDLINE_CONFIG,
  PHANTOM_CONFIG,
} from "../constants";
import { getSkinById } from "../data/skins";
import { useCharacterStore } from "../store/characterStore";
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
  mirrorPlayerPosition,
  randomRange,
  shouldTriggerFlip,
  updateNearMissState
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
  calculatePhantomBonus
} from "../utils/phantomSystem";
import {
  calculateExpectedInterval,
  checkRhythmTiming,
  createInitialRhythmState,
  updateRhythmState,
} from "../utils/rhythmSystem";
import { renderOrb } from "../utils/skinRenderer";
import { calculateCharacterModifiers } from "../utils/statMapper";

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
// Distance Tracking System Integration - Campaign Update v2.5
// Requirements: 2.2, 2.3, 2.4, 3.2
import { DistanceState, DistanceTracker, createDistanceTracker } from "../systems/distanceTracker";
// Speed Controller System Integration - Campaign Update v2.5
// Requirements: 3.1, 3.2, 3.3
import { SpeedController, createSpeedController } from "../systems/speedController";
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
// Holographic Gate System Integration - Finish line visualization
import * as HolographicGate from "../systems/holographicGate";
import type { InputState } from "../types";
// Echo Constructs VFX Integration - Requirements 3.5, 4.5, 5.6, 2.2, 6.4, 6.6, 6.8
import * as ConstructRenderer from "../systems/constructs/ConstructRenderer";
import * as SecondChanceVFX from "../systems/constructs/SecondChanceVFX";
import * as TransformationVFX from "../systems/constructs/TransformationVFX";
// Environmental Effects System Integration - Campaign Update v2.5
// Requirements: 14.1, 14.2, 14.3, 14.4
import * as EnvironmentalEffects from "../systems/environmentalEffects";
// Phase Dash System Integration - Warp mechanics with energy bar
import * as PhaseDash from "../systems/phaseDash";
import * as PhaseDashVFX from "../systems/phaseDashVFX";
// Block System Integration - Centralized obstacle management
import * as BlockSystem from "../systems/blockSystem";
// Glitch Protocol System Integration - Requirements 1.1-10.5
// Quantum Lock bonus mode triggered by collecting Glitch Shards
import * as GlitchSystem from "../systems/glitchSystem";
import * as GlitchVFX from "../systems/GlitchVFX";
// Spirit Character Rendering - Pokemon silhouettes and elemental auras
import * as SpiritRenderer from "../systems/spiritRenderer";
// Spirit VFX Systems - Trailing Soul, Elemental Styles, Enhanced Particles
import { SpriteManager } from "../systems/spriteManager";
import * as TrailingSoul from "../systems/trailingSoul";
import type { GlitchModeState, GlitchShard } from "../types";
// Enemy Manager System - Glitch Dart attacks
import * as EnemyManager from "../systems/EnemyManager";
// Enemy Death VFX System - Explosion, shatter, and element-based death effects
import * as EnemyDeathVFX from "../systems/enemyDeathVFX";
// Flux Overload System - Yasaklı Hat Mekaniği (2-Strike damage system)
import * as FluxOverload from "../systems/fluxOverloadSystem";

// Campaign mode configuration for mechanics enable/disable
// Campaign Update v2.5 - Distance-based progression
// Campaign Chapter System - Requirements: 4.1, 4.5, 1.5, 6.1, 6.2, 6.3
export interface CampaignModeConfig {
  enabled: boolean;
  levelConfig?: LevelConfig;
  targetScore?: number;  // Legacy: score-based completion
  targetDistance?: number;  // New: distance-based completion (meters)
  useDistanceMode?: boolean;  // Enable distance-based mode
  onLevelComplete?: (score: number) => void;
  onDistanceLevelComplete?: (result: {
    distanceTraveled: number;
    shardsCollected: number;
    totalShardsSpawned: number;
    damageTaken: number;
    healthRemaining: number;
  }) => void;
  onDistanceUpdate?: (currentDistance: number, targetDistance: number, progressPercent: number) => void;
  // Campaign Chapter System - Game over callback with distance info
  // Requirements: 6.1, 6.2, 6.3 - Pass distance traveled to game over screen
  onChapterGameOver?: (result: {
    distanceTraveled: number;
    targetDistance: number;
    shardsCollected: number;
    damageTaken: number;
  }) => void;
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
  // Phase Dash System - Energy bar updates
  onDashStateUpdate?: (energy: number, active: boolean, remainingPercent?: number) => void;
  // Quantum Lock updates - Requirements 7.5
  onQuantumLockStateUpdate?: (isActive: boolean) => void;
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
  onDashStateUpdate,
  onQuantumLockStateUpdate,
  campaignMode,
  dailyChallengeMode,
  zenMode,
  ghostRacerMode,
  restoreMode,
  restoreRequested = false,
  onRestoreStateUpdate,
  ritualTracking,
  onMissionEvent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Theme System Integration - Requirements 5.1, 5.2, 5.3
  const equippedTheme = useGameStore((state) => state.equippedTheme);
  const customThemeColors = useGameStore((state) => state.customThemeColors);

  // Skin System Integration - Requirements 3.1, 3.2
  const equippedSkin = useGameStore((state) => state.equippedSkin);

  // Spirit Character System Integration - PokeAPI
  // Active spirit character affects gameplay modifiers (speed, shield, etc.)
  const activeCharacter = useCharacterStore((state) => state.activeCharacter);
  const spiritModifiers = calculateCharacterModifiers(activeCharacter);

  // Apply theme when equipped theme changes
  useEffect(() => {
    applyTheme(equippedTheme);
  }, [equippedTheme]);

  // Keep latest campaignMode in ref to avoid effect dependencies causing loop restarts
  const campaignModeRef = useRef(campaignMode);
  useEffect(() => {
    campaignModeRef.current = campaignMode;
  }, [campaignMode]);

  // Keep ThemeSystem in sync with custom theme payload
  useEffect(() => {
    setCustomThemeColors(customThemeColors);
  }, [customThemeColors]);

  // Spirit Character: Live update modifiers when active character changes
  // This allows immediate effect when equipping a character during gameplay
  useEffect(() => {
    if (activeCharacter) {
      // Apply speed modifier live
      const baseSpeedModifier = campaignMode?.enabled && campaignMode.levelConfig
        ? campaignMode.levelConfig.modifiers.speedMultiplier
        : 1;
      speed.current = INITIAL_CONFIG.baseSpeed * baseSpeedModifier * spiritModifiers.speedMultiplier;

      // Update score multiplier live
      const upgradeEffects = getActiveUpgradeEffects();
      scoreMultiplierUpgrade.current = upgradeEffects.scoreMultiplier * spiritModifiers.shardValueMultiplier;
      magnetRadiusFactorUpgrade.current = upgradeEffects.magnetRadiusFactor * spiritModifiers.magnetRadiusMultiplier;
    }
  }, [activeCharacter, spiritModifiers, campaignMode]);

  // Spirit Character: Sprite image loading via SpriteManager (LRU Cache)
  const spiritSpriteRef = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (activeCharacter && activeCharacter.spriteUrl) {
      SpriteManager.getSprite(activeCharacter.spriteUrl)
        .then(img => {
          spiritSpriteRef.current = img;
        })
        .catch(err => {
          console.warn('Failed to load spirit sprite:', err);
          spiritSpriteRef.current = null;
        });
    } else {
      spiritSpriteRef.current = null;
    }
  }, [activeCharacter]);

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

  // Spirit VFX: Velocity tracking for dynamic lean and trailing soul
  const prevPlayerY = useRef<number>(0.5); // Previous frame playerY for velocity calculation
  const playerVelocityY = useRef<number>(0); // Vertical velocity in screen space
  const whiteOrbTrail = useRef<TrailingSoul.TrailState>(TrailingSoul.createTrailState());
  const blackOrbTrail = useRef<TrailingSoul.TrailState>(TrailingSoul.createTrailState());

  // Track if game was previously playing (to detect resume vs new game)
  const wasPlayingRef = useRef<boolean>(false);


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

  // Holographic Gate State - Requirements 12.1, 12.2
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

  // Finish Mode State - Player moves right to finish line when reaching target distance
  const isInFinishMode = useRef<boolean>(false);
  const finishModePlayerX = useRef<number>(0); // Player X offset during finish mode
  const finishModeStartTime = useRef<number>(0); // When finish mode started
  const finishLineX = useRef<number>(0); // Finish line X position
  const hasReachedFinishLine = useRef<boolean>(false); // Player touched finish line
  const finishExplosionTriggered = useRef<boolean>(false); // Explosion effect triggered

  // Holographic Gate State for finish line visualization
  const holographicGateState = useRef<HolographicGate.HolographicGateState>(
    HolographicGate.createHolographicGateState()
  );

  // Campaign Update v2.5 - Distance Tracking State
  // Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
  const distanceTrackerRef = useRef<DistanceTracker | null>(null);
  const speedControllerRef = useRef<SpeedController | null>(null);
  const distanceStateRef = useRef<DistanceState>({
    currentDistance: 0,
    targetDistance: 0,
    progressPercent: 0,
    isInClimaxZone: false,
    isNearFinish: false,
  });
  // Track shards collected and damage taken for star rating
  const shardsCollectedRef = useRef<number>(0);
  const totalShardsSpawnedRef = useRef<number>(0);
  const damageTakenRef = useRef<number>(0);
  const playerHealthRef = useRef<number>(1); // 1 = full health, 0 = dead
  const lastDistanceUpdateTime = useRef<number>(0);

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

  // Phase Dash State - Energy bar and warp mechanics
  const phaseDashState = useRef<PhaseDash.PhaseDashState>(
    PhaseDash.createInitialPhaseDashState()
  );
  const phaseDashVFXState = useRef<PhaseDashVFX.PhaseDashVFXState>(
    PhaseDashVFX.createInitialVFXState()
  );
  // Double-tap detection for dash activation
  const lastTapTime = useRef<number>(0);
  const DOUBLE_TAP_THRESHOLD = 300; // ms

  // Glitch Protocol State - Quantum Lock bonus mode
  // Requirements: All (1.1-10.5)
  const glitchShardRef = useRef<GlitchShard | null>(null);
  const glitchModeState = useRef<GlitchModeState>(
    GlitchSystem.createInitialGlitchModeState()
  );
  // Track previous state to emit updates
  const prevQuantumLockActive = useRef<boolean>(false);

  const hitStopFramesRemaining = useRef<number>(0);
  const hasSpawnedGlitchShardThisLevel = useRef<boolean>(false);
  const glitchScreenFlashState = useRef<GlitchVFX.ScreenFlashState>(
    GlitchVFX.createScreenFlashState()
  );
  // Connector animation tracking for elastic easing
  const connectorAnimationStartTime = useRef<number>(0);
  // Wave path shards during Quantum Lock

  // Maneuver-based Shield System - Requirements Update
  const SHIELD_REWARD_STREAK = 20; // 20 near misses = 1 shield
  const wavePathShards = useRef<GlitchSystem.WavePathShard[]>([]);
  // Diamond bonus tracking for reflex rewards
  const lastDiamondCollectTime = useRef<number>(0);
  const diamondStreak = useRef<number>(0);
  // Burn effect state for midline collision failure
  const burnEffectState = useRef<GlitchVFX.BurnEffectState>(
    GlitchVFX.createBurnEffectState()
  );

  // Enemy Manager State - Glitch Dart attacks
  const enemyManagerState = useRef<EnemyManager.EnemyManagerState | null>(null);
  // Track if counter-attack was rendered this frame (to prevent double-rendering)
  const counterAttackActive = useRef<boolean>(false);

  // Flux Overload State - Yasaklı Hat Mekaniği (2-Strike damage)
  const fluxOverloadState = useRef<FluxOverload.FluxOverloadState>(
    FluxOverload.createInitialState()
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

    // Daily Challenge Mode: Apply speed boost modifier - Requirements 8.2
    if (dailyChallengeMode?.enabled && dailyChallengeMode.config) {
      speedModifier *= dailyChallengeMode.config.modifiers.speedBoost;
    }

    // Spirit Character: Apply speed modifier from active character
    // Higher Speed stat Pokemon = faster gameplay
    speedModifier *= spiritModifiers.speedMultiplier;

    speed.current = INITIAL_CONFIG.baseSpeed * speedModifier;

    // Store score multiplier from upgrades - Requirements 6.2
    // Spirit Character: Apply shard value multiplier from active character
    scoreMultiplierUpgrade.current = upgradeEffects.scoreMultiplier * spiritModifiers.shardValueMultiplier;

    // Phase 2: Magnet + Shield
    // Spirit Character: Apply magnet radius bonus from active character
    magnetRadiusFactorUpgrade.current = upgradeEffects.magnetRadiusFactor * spiritModifiers.magnetRadiusMultiplier;
    shieldChargesRemaining.current = Math.max(
      0,
      Math.floor(upgradeEffects.shieldCharges)
    );
    // Spirit Character: Note - shieldTimeBonus will be applied when shield activates
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

    // Reset Finish Mode State
    isInFinishMode.current = false;
    finishModePlayerX.current = 0;
    finishModeStartTime.current = 0;
    finishLineX.current = 0;
    hasReachedFinishLine.current = false;
    finishExplosionTriggered.current = false;
    holographicGateState.current = HolographicGate.createHolographicGateState();

    // Campaign Update v2.5 - Initialize Distance Tracking
    // Requirements: 2.2, 2.3, 3.1, 3.2, 3.3
    // Use campaignModeRef.current to get the latest value (prop may not be updated yet)
    const activeCampaignMode = campaignModeRef.current;
    if (activeCampaignMode?.enabled && activeCampaignMode.useDistanceMode && activeCampaignMode.targetDistance) {
      // Initialize distance tracker with target distance
      distanceTrackerRef.current = createDistanceTracker(activeCampaignMode.targetDistance);

      // Initialize speed controller for the level
      const levelId = activeCampaignMode.levelConfig?.id || 1;
      speedControllerRef.current = createSpeedController(levelId);

      // Reset distance state
      distanceStateRef.current = {
        currentDistance: 0,
        targetDistance: activeCampaignMode.targetDistance,
        progressPercent: 0,
        isInClimaxZone: false,
        isNearFinish: false,
      };

      // Reset star rating tracking
      shardsCollectedRef.current = 0;
      totalShardsSpawnedRef.current = 0;
      damageTakenRef.current = 0;
      playerHealthRef.current = 1;
      lastDistanceUpdateTime.current = Date.now();
    } else {
      // Non-distance mode: clear refs
      distanceTrackerRef.current = null;
      speedControllerRef.current = null;
    }

    // Reset Rhythm State - Requirements 1.1
    rhythmState.current = createInitialRhythmState();

    // Reset Gravity State - Requirements 2.1
    gravityState.current = createInitialGravityState();

    // Reset Midline State - Requirements 4.1, 4.9
    midlineState.current = createInitialMidlineState(window.innerHeight);
    gameStartTime.current = Date.now();

    onScoreUpdate(score.current);
    setGameSpeedDisplay(INITIAL_CONFIG.baseSpeed);

    // Reset level completion flag on game start
    levelCompleted.current = false;

    // Reset UI state indicators
    onRhythmStateUpdate?.(1, 0);
    onNearMissStateUpdate?.(0);
    onSlowMotionStateUpdate?.(false);

    // Reset tension visual effect
    tensionIntensityRef.current = 0;

    // Reset ParticleSystem - Requirements 12.5
    ParticleSystem.reset();

    // Reset Holographic Gate - Requirements 12.1
    // Reset ScreenShake - Requirements 10.4
    ScreenShake.reset();

    // Reset Chromatic Aberration - Requirements 11.3
    ChromaticAberration.reset();

    // Reset Orb Trail System
    OrbTrailSystem.resetTrails();

    // Reset Enemy Death VFX
    EnemyDeathVFX.resetDeathVFX();


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

    // Reset Environmental Effects State - Requirements 14.1, 14.2, 14.3, 14.4
    EnvironmentalEffects.resetGlobalEnvironmentalEffects();

    // Reset Phase Dash State
    phaseDashState.current = PhaseDash.createInitialPhaseDashState();
    phaseDashVFXState.current = PhaseDashVFX.createInitialVFXState();
    PhaseDashVFX.clearDebris(); // Clear any remaining debris particles
    PhaseDashVFX.clearConnectorTrail(); // Clear connector trail
    lastTapTime.current = 0;

    // Reset Glitch Protocol State - Requirements All
    glitchShardRef.current = null;
    glitchModeState.current = GlitchSystem.createInitialGlitchModeState();
    hitStopFramesRemaining.current = 0;
    hasSpawnedGlitchShardThisLevel.current = false;
    glitchScreenFlashState.current = GlitchVFX.createScreenFlashState();
    connectorAnimationStartTime.current = 0;
    wavePathShards.current = [];
    // Reset diamond bonus tracking
    lastDiamondCollectTime.current = 0;
    diamondStreak.current = 0;
    GlitchSystem.clearInputBuffer();

    // Reset Enemy Manager State - Glitch Dart attacks
    enemyManagerState.current = EnemyManager.createEnemyManagerState(
      window.innerWidth,
      window.innerHeight
    );
    counterAttackActive.current = false;

    // Reset Flux Overload State - Yasaklı Hat Mekaniği
    fluxOverloadState.current = FluxOverload.createInitialState();
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
    spiritModifiers,
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
    // Use BlockSystem for spawning
    const phantomEnabled =
      !campaignMode?.enabled ||
      campaignMode.levelConfig?.mechanics.phantom !== false;
    const forcePhantom =
      (dailyChallengeMode?.enabled &&
        dailyChallengeMode.config?.modifiers.phantomOnly) || false;

    const spawnCtx: BlockSystem.SpawnContext = {
      canvasHeight,
      canvasWidth,
      score: score.current,
      connectorLength: currentConnectorLength.current,
      isGravityFlipped: gravityState.current.isFlipped,
      isDashing: PhaseDash.isDashActive(phaseDashState.current),
      dashXOffset: PhaseDash.getPlayerXOffset(phaseDashState.current),
      phantomEnabled: phantomEnabled ?? true,
      forcePhantom,
      rng: Math.random,
    };

    const newObstacles = BlockSystem.spawnObstaclePair(spawnCtx);
    obstacles.current.push(...newObstacles);
  };

  // Block System State - tracks polarity and gap info for shard spawning
  const blockSystemState = useRef<BlockSystem.BlockSystemState>(
    BlockSystem.createBlockSystemState()
  );

  // Legacy refs for shard spawning compatibility
  const lastSpawnedPolarity = useRef<"white" | "black" | null>(null);
  const lastGapCenter = useRef<number>(0);
  const lastHalfGap = useRef<number>(0);
  const shardSpawnSequence = useRef<number>(0);
  // Mobile readability: keep polarity stable within a pattern
  const patternPolarity = useRef<"white" | "black">("white");

  // Pattern-Based Obstacle Spawn - Uses BlockSystem
  const spawnPatternObstacle = (
    lane: Lane,
    _heightRatio: number,
    canvasHeight: number,
    canvasWidth: number
  ) => {
    // Only spawn on TOP call (spawns both top and bottom)
    if (lane !== "TOP") return;

    const phantomEnabled = !campaignMode?.enabled || campaignMode.levelConfig?.mechanics.phantom !== false;
    const forcePhantom = (dailyChallengeMode?.enabled && dailyChallengeMode.config?.modifiers.phantomOnly) || false;

    const spawnCtx: BlockSystem.PatternSpawnContext = {
      canvasHeight,
      canvasWidth,
      score: score.current,
      connectorLength: currentConnectorLength.current,
      isGravityFlipped: gravityState.current.isFlipped,
      isDashing: PhaseDash.isDashActive(phaseDashState.current),
      dashXOffset: PhaseDash.getPlayerXOffset(phaseDashState.current),
      phantomEnabled: phantomEnabled ?? true,
      forcePhantom,
      rng: nextRunRand,
      obstaclePool: obstaclePool.current,
      state: blockSystemState.current,
    };

    const newObstacles = BlockSystem.spawnPatternObstaclePair(spawnCtx);
    obstacles.current.push(...newObstacles);

    // Sync state for shard spawning
    lastSpawnedPolarity.current = blockSystemState.current.lastSpawnedPolarity;
    lastGapCenter.current = blockSystemState.current.lastGapCenter;
    lastHalfGap.current = blockSystemState.current.lastHalfGap;
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
    // Mobile clarity: cap shards on screen (deterministic budget) - Increased for more rewards
    const maxActiveShards =
      score.current < 800 ? 3 : score.current < 2500 ? 5 : 8; // Significantly increased limits
    if (activeShards.current.length >= maxActiveShards) return;

    // Delay risky shards until player is warmed up
    if (type === "risky" && score.current < 500) return; // Reduced warm-up score

    // REMOVED: Early game skipping logic to increase density
    // if (score.current < 800 && shardSpawnSequence.current % 2 === 1) return;

    // During dash, spawn shards closer to player
    const dashXOffsetShard = PhaseDash.getPlayerXOffset(phaseDashState.current);
    const isDashingShard = PhaseDash.isDashActive(phaseDashState.current);
    const spawnX = isDashingShard
      ? canvasWidth * 0.5 + dashXOffsetShard + Math.random() * canvasWidth * 0.2
      : canvasWidth + 50;
    const midY = canvasHeight / 2; // Merkez çizgi (midlineY)

    // Use current gate geometry if available (pattern-defined gap center)
    const gapCenter = lastGapCenter.current || midY;
    const halfGap = lastHalfGap.current || INITIAL_CONFIG.orbRadius + 10;
    const riskyEdge = 12;

    // BONUS SHARD: Artırılmış şans (%25) (1000+ skor sonrası)
    let actualType: "safe" | "risky" | "bonus" = type;
    if (score.current >= 1000 && nextRunRand() < 0.25) {
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

    // Campaign Update v2.5 - Track total shards spawned for star rating
    // Requirements: 4.2
    if (campaignMode?.enabled && campaignMode.useDistanceMode) {
      totalShardsSpawnedRef.current += 1;
    }
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
    // Only emit spirit particles if a character is equipped
    if (activeCharacter) {
      // Use new ParticleSystem for burst effect with character's type
      ParticleSystem.emitBurst(x, y, activeCharacter.types[0] || 'normal', 12);
    }

    // Legacy cyan particles for backward compatibility (always shown)
    const accentColor = getColor("accent");
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
    ParticleSystem.emitBurst(closestPoint.x, closestPoint.y, activeCharacter?.types[0] || 'normal', 6);

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

      // --- PHASE DASH: Double-tap detection for activation ---
      const now = Date.now();
      if (now - lastTapTime.current < DOUBLE_TAP_THRESHOLD) {
        // Double-tap detected - check if dash can activate
        // Requirement: Dash disabled during Quantum Lock (Requirements 7.5)
        // Prevent activation during Active, Warning, or Exiting phases
        const isQuantumLockEngaged = glitchModeState.current.isActive ||
          glitchModeState.current.phase === 'warning' ||
          glitchModeState.current.phase === 'exiting';

        if (PhaseDash.canActivate(phaseDashState.current) && !isQuantumLockEngaged) {
          const dashDuration = getActiveUpgradeEffects().dashDuration;
          phaseDashState.current = PhaseDash.activateDash(phaseDashState.current, dashDuration);

          // Trigger VFX transition in (with particle burst at player position)
          const playerX = window.innerWidth / 8;
          const playerYPos = playerY.current * window.innerHeight;
          phaseDashVFXState.current = PhaseDashVFX.triggerTransitionIn(
            phaseDashVFXState.current,
            playerX,
            playerYPos,
            window.innerWidth,
            window.innerHeight
          );

          // Heavy screen shake on activation
          ScreenShake.trigger({ intensity: 20, duration: 400, frequency: 25, decay: true });

          // Haptic feedback
          getHapticSystem().trigger("heavy");
        }
      }
      lastTapTime.current = now;
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
    // GAME_OVER or VICTORY state - stop the game loop completely
    if (gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) {
      // Cancel any running animation frame to stop the game
      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
        frameId.current = 0;
      }
      return;
    }

    if (gameState === GameState.MENU) {
      wasPlayingRef.current = false; // Reset flag when returning to menu
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
      // Paused - mark that we were playing, don't reset
      wasPlayingRef.current = true;
      return;
    }

    if (gameState !== GameState.PLAYING) return;

    // Only reset if this is a NEW game, not resuming from pause
    if (!wasPlayingRef.current) {
      console.log("[GAME] Starting NEW game, resetting...");
      resetGame();
    } else {
      console.log("[GAME] Resuming from pause, NOT resetting");
    }

    // Mark that we're now playing
    wasPlayingRef.current = true;

    const loop = () => {
      // Skip main loop if restore animation is playing
      if (isRestoreAnimating.current) {
        frameId.current = requestAnimationFrame(loop);
        return;
      }

      // Pause game loop when pending restore (waiting for user decision)
      // Game should freeze while SYSTEM CRASH prompt is shown
      if (pendingRestore.current) {
        frameId.current = requestAnimationFrame(loop);
        return;
      }

      // Distance-based level completion logic with finish mode
      const currentCampaignMode = campaignModeRef.current;

      // DEBUG: Log every 60 frames (~1 second)
      if (framesSinceSpawn.current % 60 === 0) {
        console.log('[DEBUG] Campaign:', currentCampaignMode?.enabled,
          'DistanceMode:', currentCampaignMode?.useDistanceMode,
          'Tracker:', !!distanceTrackerRef.current,
          'FinishMode:', isInFinishMode.current,
          'Completed:', levelCompleted.current);
        if (distanceTrackerRef.current) {
          console.log('[DEBUG] Distance:', distanceTrackerRef.current.getCurrentDistance().toFixed(1),
            '/', distanceTrackerRef.current.getTargetDistance(),
            'Complete:', distanceTrackerRef.current.isLevelComplete());
        }
      }

      if (currentCampaignMode?.enabled && currentCampaignMode.useDistanceMode && distanceTrackerRef.current) {
        const currentDist = distanceTrackerRef.current.getCurrentDistance();
        const targetDist = distanceTrackerRef.current.getTargetDistance();
        const isComplete = distanceTrackerRef.current.isLevelComplete();

        const canvas = canvasRef.current;
        const screenWidth = canvas?.width || window.innerWidth;
        const screenHeight = canvas?.height || window.innerHeight;

        // When target distance is reached, enter finish mode
        if (isComplete && !isInFinishMode.current && !levelCompleted.current) {
          console.log('[FINISH MODE] Starting - Distance:', currentDist, '/', targetDist);
          isInFinishMode.current = true;
          finishModePlayerX.current = 0;
          finishModeStartTime.current = Date.now();
          // Finish line at 85% of screen width
          finishLineX.current = screenWidth * 0.85;
          hasReachedFinishLine.current = false;
          finishExplosionTriggered.current = false;

          // Initialize holographic gate at finish line position
          holographicGateState.current = {
            ...HolographicGate.createHolographicGateState(),
            visible: true,
            distanceFromPlayer: finishLineX.current - (screenWidth / 8),
          };

          // Trigger haptic feedback
          getHapticSystem().trigger('success');
        }

        // In finish mode, animate player moving to finish line
        if (isInFinishMode.current && !levelCompleted.current) {
          const basePlayerX = screenWidth / 8;
          const currentPlayerX = basePlayerX + finishModePlayerX.current;

          // Phase 1: Player moves towards finish line
          if (!hasReachedFinishLine.current) {
            // Accelerating movement towards finish line
            const progress = finishModePlayerX.current / (finishLineX.current - basePlayerX);
            const acceleration = 1 + progress * 2; // Speed up as we approach
            finishModePlayerX.current += 6 * acceleration;

            // Update holographic gate pulse
            holographicGateState.current = HolographicGate.updateHolographicGate(
              holographicGateState.current,
              Date.now(),
              finishLineX.current - currentPlayerX,
              HolographicGate.DEFAULT_HOLOGRAPHIC_GATE_CONFIG
            );

            // Check if player reached finish line
            if (currentPlayerX >= finishLineX.current - 20) {
              console.log('[FINISH MODE] Player reached finish line!');
              hasReachedFinishLine.current = true;

              // Trigger gate shatter animation
              holographicGateState.current = HolographicGate.triggerGateShatter(
                holographicGateState.current,
                Date.now(),
                finishLineX.current,
                screenHeight / 2,
                HolographicGate.DEFAULT_HOLOGRAPHIC_GATE_CONFIG
              );

              // Play victory sound
              AudioSystem.playNewHighScore();

              // Strong haptic feedback for explosion
              getHapticSystem().trigger('heavy');

              // Trigger screen shake for explosion effect
              ScreenShake.triggerCollision();
            }
          }

          // Phase 2: Explosion animation after reaching finish line
          if (hasReachedFinishLine.current && !finishExplosionTriggered.current) {
            finishExplosionTriggered.current = true;

            // Create explosion particles at finish line using ParticleSystem
            ParticleSystem.emitBurst(finishLineX.current, screenHeight / 2, activeCharacter?.types[0] || 'normal');
          }

          // Phase 3: Wait for explosion animation then trigger victory
          if (hasReachedFinishLine.current) {
            // Update shatter particles
            holographicGateState.current = HolographicGate.updateHolographicGate(
              holographicGateState.current,
              Date.now(),
              0,
              HolographicGate.DEFAULT_HOLOGRAPHIC_GATE_CONFIG
            );

            // Continue moving player off screen after explosion
            finishModePlayerX.current += 12;

            // Check if animation is complete (player off screen or enough time passed)
            // Extended animation time for better visual experience
            const timeSinceFinishLine = Date.now() - (finishModeStartTime.current + 500);
            const playerOffScreen = currentPlayerX > screenWidth + 50;

            // Wait at least 1.5 seconds after reaching finish line for full animation
            if (playerOffScreen || timeSinceFinishLine > 1500) {
              console.log('[LEVEL COMPLETE] Animation finished - triggering victory');
              levelCompleted.current = true;

              // Stop game loop
              if (frameId.current) {
                cancelAnimationFrame(frameId.current);
                frameId.current = 0;
              }

              // Trigger victory callback
              currentCampaignMode.onDistanceLevelComplete?.({
                distanceTraveled: currentDist,
                shardsCollected: shardsCollectedRef.current,
                totalShardsSpawned: totalShardsSpawnedRef.current,
                damageTaken: damageTakenRef.current,
                healthRemaining: playerHealthRef.current,
              });

              return; // Stop game loop
            }
          }
        }
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

      // --- PHASE DASH UPDATE - Speed multiplier and state management ---
      // Update Phase Dash state (check duration, update ghost trail)
      const dashUpdate = PhaseDash.updateDashState(
        phaseDashState.current,
        width / 8,  // playerX position
        playerY.current * height,
        Math.floor(gameTime / 16)  // approximate frame number
      );
      phaseDashState.current = dashUpdate.state;

      // Trigger end VFX and screen shake when dash ends
      if (dashUpdate.dashEnded) {
        phaseDashVFXState.current = PhaseDashVFX.triggerTransitionOut(phaseDashVFXState.current);
        ScreenShake.trigger({ intensity: 10, duration: 250, frequency: 20, decay: true });

        // Create end-of-dash burst particles for celebration effect
        const dashEndX = width / 8 + PhaseDash.getPlayerXOffset(phaseDashState.current);
        const dashEndY = playerY.current * height;
        const endBurstParticles = PhaseDashVFX.createDashEndBurst(dashEndX, dashEndY);
        phaseDashVFXState.current.burstParticles.push(...endBurstParticles);

        // Haptic feedback for dash end
        getHapticSystem().trigger("medium");
      }

      // Update Phase Dash VFX state (using ~16ms assumed delta for 60fps)
      // Visual Y offset is calculated later for rendering, here we pass physics Y
      // Include dash X offset for accurate particle positioning
      const vfxDashXOffset = PhaseDash.getPlayerXOffset(phaseDashState.current);
      phaseDashVFXState.current = PhaseDashVFX.updateVFXState(
        phaseDashVFXState.current,
        phaseDashState.current.isActive,
        width / 8 + vfxDashXOffset, // playerX with dash offset
        playerY.current * height, // playerY
        16,  // Approximate delta time in ms
        width,
        height
      );

      // Get Phase Dash speed multiplier (1.0 normally, 4.0 during dash)
      const phaseDashSpeedMultiplier = PhaseDash.getSpeedMultiplier(phaseDashState.current);

      // Report Phase Dash state to parent for UI
      // Calculate remaining percent: 100% at start, 0% when dash ends
      const dashProgress = PhaseDash.getDashProgress(phaseDashState.current);
      const dashRemainingPercent = phaseDashState.current.isActive ? (1 - dashProgress) * 100 : 100;
      onDashStateUpdate?.(phaseDashState.current.energy, phaseDashState.current.isActive, dashRemainingPercent);

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

      // Spirit VFX: Calculate velocity for dynamic lean and trailing soul
      // Velocity is in screen space (pixels per frame)
      playerVelocityY.current = (playerY.current - prevPlayerY.current) * height;
      prevPlayerY.current = playerY.current;

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
        (!campaignModeRef.current?.enabled ||
          campaignModeRef.current.levelConfig?.mechanics.midline !== false) &&
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
      let currentMidlineY = midlineEnabled
        ? calculateMidlineY(height, elapsedTime, midlineConfig, score.current)
        : height / 2;

      // Quantum Lock: Sync midline with wave position at player X
      // This makes the "zero line" move proportionally with the green wave line
      if (glitchModeState.current.isActive || glitchModeState.current.phase === 'warning' || glitchModeState.current.phase === 'exiting') {
        const glitchProgress = GlitchSystem.getGlitchProgress(glitchModeState.current);
        const waveAmplitude = GlitchSystem.getWaveAmplitudeForPhase(
          glitchModeState.current.phase,
          glitchProgress
        ) * GLITCH_CONFIG.waveAmplitude;

        if (waveAmplitude > 0) {
          const playerX = width / 8; // Player X position
          currentMidlineY = GlitchSystem.calculateWaveY(
            playerX,
            glitchModeState.current.waveOffset,
            waveAmplitude,
            height / 2
          );
        }
      }

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

      // NOTE: Enemy Manager update is done after orb definitions (see line ~2800)

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
        // Campaign Update v2.5 - Distance-based speed calculation
        // Requirements: 2.2, 2.3, 3.1, 3.2, 3.3
        const activeCampaign = campaignModeRef.current;
        if (activeCampaign?.enabled && activeCampaign.useDistanceMode && distanceTrackerRef.current && speedControllerRef.current) {
          const currentTime = Date.now();
          const deltaTimeMs = currentTime - lastDistanceUpdateTime.current;
          const deltaTimeSec = deltaTimeMs / 1000;
          lastDistanceUpdateTime.current = currentTime;

          // Get current distance state
          const distState = distanceTrackerRef.current.getState();

          // Update speed controller transition (for smooth climax zone entry)
          speedControllerRef.current.update(deltaTimeMs, distState.isInClimaxZone);

          // Calculate speed using progressive formula with climax boost
          const levelId = activeCampaign.levelConfig?.id || 1;
          speed.current = speedControllerRef.current.calculateSpeed(distState, levelId);

          // Update distance based on current speed
          // Convert speed from pixels/frame to meters/second
          // Factor 0.8 gives good pacing (~45-60 seconds for level 1 with 100m target)
          // During dash, distance increases 4x faster
          // During Quantum Lock, distance increases 3x faster
          const dashDistanceMultiplier = PhaseDash.getDistanceMultiplier(phaseDashState.current);
          const quantumLockDistanceMultiplier = GlitchSystem.getDistanceMultiplier(glitchModeState.current);
          const speedMetersPerSec = speed.current * slowMotionMultiplier * constructSpeedMultiplier * dashDistanceMultiplier * quantumLockDistanceMultiplier * 0.8;
          distanceTrackerRef.current.update(deltaTimeSec, speedMetersPerSec);

          // Update distance state ref
          distanceStateRef.current = distanceTrackerRef.current.getState();

          // Notify parent of distance update
          activeCampaign.onDistanceUpdate?.(
            distanceStateRef.current.currentDistance,
            distanceStateRef.current.targetDistance,
            distanceStateRef.current.progressPercent
          );

          // Check for Quantum Lock state change updates - Requirements 7.5
          const isQuantumLockActive = glitchModeState.current.isActive ||
            glitchModeState.current.phase === 'warning' ||
            glitchModeState.current.phase === 'exiting';

          if (isQuantumLockActive !== prevQuantumLockActive.current) {
            prevQuantumLockActive.current = isQuantumLockActive;
            onQuantumLockStateUpdate?.(isQuantumLockActive);
          }

          // Environmental Effects: Haptic feedback on distance bar pulse - Requirements 14.4
          // Trigger haptic when near finish (within 50m of target)
          if (distanceStateRef.current.isNearFinish) {
            const envState = EnvironmentalEffects.getEnvironmentalEffectsState();
            if (EnvironmentalEffects.shouldTriggerDistanceBarPulseHaptic(
              distanceStateRef.current.isNearFinish,
              envState,
              currentTime
            )) {
              EnvironmentalEffects.triggerDistanceBarPulseHaptic(envState, currentTime);
            }
          }

          // Level completion is now handled at the start of loop()
          // This section removed to avoid duplicate checks
        } else {
          // Legacy: Update speed using Flow Curve (score-based)
          // Skip speed update during Quantum Lock - Requirements 5.7
          if (!GlitchSystem.shouldStabilizeSpeed(glitchModeState.current)) {
            speed.current = FlowCurve.calculateGameSpeed(score.current);
          }
        }

        // Pattern-Based Spawning
        // Stop spawning new obstacles when at 98% of target distance or in finish mode
        // Also stop during post-dash cooldown to give player breathing room
        // Also stop during Quantum Lock - Requirements 6.1
        const isInPostDashCooldown = PhaseDash.isInPostDashCooldown(phaseDashState.current);
        const isDashingNow = PhaseDash.isDashActive(phaseDashState.current);
        const isQuantumLockActive = GlitchSystem.shouldBlockObstacleSpawn(glitchModeState.current);
        const shouldStopSpawning = isInFinishMode.current ||
          isInPostDashCooldown ||
          isQuantumLockActive ||
          (distanceStateRef.current.targetDistance > 0 &&
            distanceStateRef.current.progressPercent >= 98);

        // DASH BURST SPAWN: During dash, spawn obstacles directly every few frames
        // This bypasses the pattern system for intense obstacle barrage
        if (isDashingNow && !shouldStopSpawning) {
          // Spawn obstacle every 30 frames during dash (~2 obstacles per second at 60fps)
          // Further reduced to avoid overlapping obstacles
          if (frameId.current % 30 === 0) {
            spawnPatternObstacle("TOP" as Lane, 0.5, height, width);
          }
        }

        // Check if we need to select a new pattern
        // Skip pattern spawning during dash - burst spawn handles it
        if (
          !shouldStopSpawning &&
          !isDashingNow &&
          (!patternManagerState.current.currentPattern ||
            PatternManager.isPatternComplete(
              patternManagerState.current,
              spawnTime
            ))
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
          // During dash, patterns are 3x faster (more obstacles)
          const dashPatternMultiplier = PhaseDash.getObstacleSpawnMultiplier(phaseDashState.current);
          const baselineSpeed = 5.0;
          const timeScale = Math.max(
            0.75,
            Math.min(1.35, baselineSpeed / Math.max(0.1, speed.current))
          ) / dashPatternMultiplier; // Faster patterns during dash
          const scaledPattern = {
            ...selectedPattern,
            duration: Math.max(
              150, // Shorter minimum during dash
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
        // Skip spawning when near finish to give player clear path
        if (!shouldStopSpawning) {
          patternManagerState.current = PatternManager.updatePatternSpawn(
            patternManagerState.current,
            spawnTime,
            (lane: Lane, heightRatio: number) =>
              spawnPatternObstacle(lane, heightRatio, height, width),
            (lane: Lane, type: "safe" | "risky") =>
              spawnPatternShard(lane, type, height, width)
          );
        }

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
        // Skip spawning during post-dash cooldown
        const isInPostDashCooldownLegacy = PhaseDash.isInPostDashCooldown(phaseDashState.current);

        if (!isInPostDashCooldownLegacy) {
          // During dash, spawn obstacles faster (but reduced from 3x to 2x)
          const dashSpawnMultiplier = PhaseDash.getObstacleSpawnMultiplier(phaseDashState.current);
          framesSinceSpawn.current += dashSpawnMultiplier;
        } else {
          framesSinceSpawn.current++; // Normal increment during cooldown
        }

        if (framesSinceSpawn.current >= currentSpawnRate.current && !isInPostDashCooldownLegacy) {
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

      // --- GLITCH SHARD SPAWN LOGIC - Requirements 2.1, 2.6, 2.7 ---
      // Spawn Glitch Shard for Quantum Lock bonus mode (once per level)
      // Only spawn if not already spawned this level and not in Quantum Lock mode
      if (
        !hasSpawnedGlitchShardThisLevel.current &&
        !glitchModeState.current.isActive &&
        glitchModeState.current.phase === 'inactive' &&
        !glitchShardRef.current
      ) {
        // Get current distance traveled (use distance tracker if available, else estimate from score)
        const distanceTraveled = distanceTrackerRef.current
          ? distanceTrackerRef.current.getCurrentDistance()
          : score.current * 0.5; // Rough estimate: 0.5m per point

        // Check if we should spawn - Requirements 2.7: minimum 500m distance
        if (GlitchSystem.shouldSpawnGlitchShard(distanceTraveled, hasSpawnedGlitchShardThisLevel.current)) {
          // Check if spawn position is safe - Requirements 2.6: 150px clearance
          const centerY = height / 2;
          const potentialY = centerY + (Math.random() * 2 - 1) * 100; // ±100px from center

          if (GlitchSystem.isSpawnPositionSafe(potentialY, obstacles.current)) {
            // Create the Glitch Shard - Requirements 2.2, 2.3
            glitchShardRef.current = GlitchSystem.createGlitchShard(width, height);
            hasSpawnedGlitchShardThisLevel.current = true;

            // Play spawn sound - Requirements 9.1
            AudioSystem.playGlitchSpawn();
          }
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

      // Orb Positions - moved further left for ultra-wide view angle
      // In finish mode, player moves right towards screen exit
      // During Phase Dash, player also moves forward for visual effect
      const basePlayerX = width / 8;
      const dashXOffset = PhaseDash.getPlayerXOffset(phaseDashState.current);
      const playerX = basePlayerX + finishModePlayerX.current + dashXOffset;

      // During dash, use spin angle for clockwise rotation effect
      const dashSpinAngle = PhaseDash.getSpinAngle(phaseDashState.current);
      const effectiveRotation = phaseDashState.current.isActive
        ? rotationAngle.current + dashSpinAngle
        : rotationAngle.current;

      const yOffset = Math.cos(effectiveRotation) * halfLen;
      const xRotOffset = Math.sin(effectiveRotation) * 15;

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
      // Emit converging trail particles: top orb particles go down, bottom orb particles go up
      // This creates a V-shaped trail that meets at the connector level
      // ONLY emit particles when a Spirit character is equipped (not in default state)
      if (activeCharacter) {
        const isWhiteTop = whiteOrbY < blackOrbY;
        const activeType = activeCharacter.types[0] || 'normal';

        // White Orb emission
        ParticleSystem.emit(whiteOrbX - 5, whiteOrbY, activeType, isWhiteTop);

        // Black Orb emission (opposite direction)
        ParticleSystem.emit(blackOrbX - 5, blackOrbY, activeType, !isWhiteTop);
      }

      // --- ENEMY MANAGER UPDATE - Glitch Dart System ---
      // Update enemy state: tracking → locked → firing → cooldown
      // DISABLED during special abilities: Phase Dash and Quantum Lock (diamond collection)
      const isInSpecialAbility = PhaseDash.isDashActive(phaseDashState.current) || glitchModeState.current.isActive;
      if (enemyManagerState.current && !isInSpecialAbility) {
        // Get current distance for spawn threshold check
        const currentDistance = distanceStateRef.current.currentDistance || 0;

        // Player Y in screen coordinates (center of connector)
        const playerYScreen = playerY.current * height;

        // Calculate deltaTime for enemy update (ms since last frame)
        const enemyDeltaTime = 16; // Approximate 60fps

        // Update enemy state machine
        enemyManagerState.current = EnemyManager.updateEnemy(
          enemyManagerState.current,
          enemyDeltaTime,
          playerYScreen,
          width,
          height,
          currentDistance,
          score.current
        );

        // Reset counter-attack flag for new frame
        counterAttackActive.current = false;

        // Check for counter-attack if Pokemon is equipped and dart is firing
        // IMPORTANT: Don't counter if knockback is active OR already been knocked back this attack
        const dartPos = EnemyManager.getDartPosition(enemyManagerState.current);
        const isKnockbackActive = enemyManagerState.current.dart.knockbackActive;
        const hasBeenKnockedBack = enemyManagerState.current.dart.hasBeenKnockedBack;

        if (dartPos && activeCharacter && !isKnockbackActive && !hasBeenKnockedBack) {
          // Check if dart is within counter-attack range of either orb
          const whiteOrbClose = EnemyManager.isDartInCounterRange(
            enemyManagerState.current,
            whiteOrb.x,
            whiteOrb.y
          );
          const blackOrbClose = EnemyManager.isDartInCounterRange(
            enemyManagerState.current,
            blackOrb.x,
            blackOrb.y
          );

          if (whiteOrbClose || blackOrbClose) {
            // COUNTER-ATTACK! Pokemon defends the player
            counterAttackActive.current = true;

            // Store counter positions BEFORE destroying dart
            const counterRenderData = {
              startX: whiteOrbClose ? whiteOrb.x : blackOrb.x,
              startY: whiteOrbClose ? whiteOrb.y : blackOrb.y,
              endX: dartPos.x,
              endY: dartPos.y,
              type: activeCharacter.types[0] || 'normal',
            };

            // ============================================
            // RARITY-BASED COUNTER-ATTACK SYSTEM
            // Legendary: Instant destroy (counterDart)
            // Epic/Rare/Common: Knockback based on level
            // ============================================
            const pokemonTier = activeCharacter.tier || 'common';
            // Derive "level" from BST: BST/50 gives roughly 1-14 range
            const pokemonLevel = Math.floor((activeCharacter.bst || 300) / 50);
            const pokemonAttack = activeCharacter.stats?.attack || 50;

            if (pokemonTier === 'legendary') {
              // DEBUG: Log tier detection
              console.log('[COUNTER] LEGENDARY tier detected - destroying enemy', { pokemonTier, pokemonLevel, pokemonAttack });
              // LEGENDARY: Instant destroy - bypass knockback
              enemyManagerState.current = EnemyManager.counterDart(enemyManagerState.current);

              // Epic death explosion for Legendary
              EnemyDeathVFX.triggerDeathExplosion(dartPos.x, dartPos.y, activeCharacter.types[0] || 'normal');
              ParticleSystem.emitBurst(dartPos.x, dartPos.y, activeCharacter.types[0] || 'normal', 25);

              // Strong feedback
              ScreenShake.triggerCollision();
              getHapticSystem().trigger('heavy');
              AudioSystem.playShieldBlock();

              scorePopups.current.push({
                x: dartPos.x,
                y: dartPos.y - 20,
                text: '💀 DESTROY!',
                color: '#FF00FF',
                life: 2.0,
                vy: -3,
              });
            } else {
              // DEBUG: Log knockback path
              console.log('[COUNTER] NON-LEGENDARY - applying knockback', { pokemonTier, pokemonLevel, pokemonAttack });
              // COMMON/RARE/EPIC: Knockback with level-based distance
              const pushDistance = EnemyManager.calculatePushDistance(pokemonLevel, pokemonAttack);
              console.log('[COUNTER] Push distance calculated:', pushDistance);
              enemyManagerState.current = EnemyManager.applyKnockback(
                enemyManagerState.current,
                pushDistance,
                width
              );
              console.log('[COUNTER] Knockback applied, new dart state:', enemyManagerState.current.dart);

              // Knockback VFX - impact flash, speed lines, shockwave
              const knockbackTargetX = enemyManagerState.current.dart.knockbackTargetX;
              EnemyDeathVFX.triggerKnockbackVFX(dartPos.x, dartPos.y, knockbackTargetX, activeCharacter.types[0] || 'normal');

              // Visual feedback - smaller burst for knockback
              ParticleSystem.emitBurst(dartPos.x, dartPos.y, activeCharacter.types[0] || 'normal', 10);

              // Medium feedback
              ScreenShake.triggerNearMiss();
              getHapticSystem().trigger('medium');
              AudioSystem.playShieldBlock();

              // Show push distance indicator
              const pushText = pushDistance >= 400 ? '💨 MEGA PUSH!' :
                pushDistance >= 250 ? '💨 PUSHED!' : '💨 Push';
              scorePopups.current.push({
                x: dartPos.x,
                y: dartPos.y - 20,
                text: pushText,
                color: '#FFD700',
                life: 1.5,
                vy: -2,
              });
            }

            // Store render data for projectile visualization
            (enemyManagerState.current as any).counterAttackRender = counterRenderData;
          }
        }

        // Check for collision - Enemy ALWAYS deals damage when touching orbs
        // No state check - if dart touches an orb, player takes damage
        // Use LARGER collision radius (4x) to ensure reliable detection
        if (enemyManagerState.current.isActive) {
          // Use actual orb visual radius for fair collision
          const collisionRadius = whiteOrb.radius * 2; // 2x for visual match, not 4x
          const whiteHit = EnemyManager.checkDartCollision(
            enemyManagerState.current,
            whiteOrb.x,
            whiteOrb.y,
            collisionRadius
          );
          const blackHit = EnemyManager.checkDartCollision(
            enemyManagerState.current,
            blackOrb.x,
            blackOrb.y,
            collisionRadius
          );

          if (whiteHit || blackHit) {
            // Check for shield first
            if (shieldChargesRemaining.current > 0) {
              shieldChargesRemaining.current -= 1;
              shieldInvincibleUntil.current = Date.now() + 2000 + spiritModifiers.shieldTimeBonus;

              // Reset dart
              enemyManagerState.current = EnemyManager.counterDart(enemyManagerState.current);

              // Visual feedback
              const hitOrb = whiteHit ? whiteOrb : blackOrb;
              ParticleSystem.emitBurst(hitOrb.x, hitOrb.y, 'electric', 10);
              ScreenShake.triggerNearMiss();
              getHapticSystem().trigger('medium');
              AudioSystem.playShieldBlock();

              scorePopups.current.push({
                x: hitOrb.x,
                y: hitOrb.y - 20,
                text: '🛡️ SHIELD',
                color: '#00F0FF',
                life: 1.0,
                vy: -2,
              });
            } else if (!activeCharacter) {
              // No shield, no Pokemon = take damage (reset streak, not game over)
              const hitOrb = whiteHit ? whiteOrb : blackOrb;
              createExplosion(hitOrb.x, hitOrb.y, '#FF0000');

              // Reset dart
              enemyManagerState.current = EnemyManager.counterDart(enemyManagerState.current);

              // Reset streaks
              nearMissState.current = createInitialNearMissState();
              onNearMissStateUpdate?.(0);
              rhythmState.current = createInitialRhythmState();
              onRhythmStateUpdate?.(1, 0);

              // Visual/audio feedback
              ScreenShake.triggerCollision();
              getHapticSystem().trigger('heavy');
              AudioSystem.playGlitchDamage();

              scorePopups.current.push({
                x: hitOrb.x,
                y: hitOrb.y - 20,
                text: '💥 HIT!',
                color: '#FF0000',
                life: 1.0,
                vy: -2,
              });
            } else {
              // Pokemon is active but still got hit (knockback wasn't enough)
              // DEAL DAMAGE - enemy reached the orb
              const hitOrb = whiteHit ? whiteOrb : blackOrb;
              createExplosion(hitOrb.x, hitOrb.y, '#FF0000');

              // Reset dart after hit
              enemyManagerState.current = EnemyManager.counterDart(enemyManagerState.current);

              // Reset streaks (penalty for getting hit)
              nearMissState.current = createInitialNearMissState();
              onNearMissStateUpdate?.(0);
              rhythmState.current = createInitialRhythmState();
              onRhythmStateUpdate?.(1, 0);

              // Visual/audio feedback
              ScreenShake.triggerCollision();
              getHapticSystem().trigger('heavy');
              AudioSystem.playGlitchDamage();

              scorePopups.current.push({
                x: hitOrb.x,
                y: hitOrb.y - 20,
                text: '💥 DAMAGE!',
                color: '#FF0000',
                life: 1.0,
                vy: -2,
              });
            }
          }
        }
      } else if (enemyManagerState.current && isInSpecialAbility) {
        // Force reset enemy to idle state if it was active
        if (enemyManagerState.current.dart.state !== 'idle') {
          enemyManagerState.current = EnemyManager.resetDart(enemyManagerState.current, width, height);
          counterAttackActive.current = false;
        }
      }  // NOTE: Enemy drawing moved to DRAW section (after orbs) to prevent being covered by background

      // --- FLUX OVERLOAD UPDATE - Yasaklı Hat Mekaniği (2-Strike System) ---
      // SIFIR ÇİZGİSİ (midline) tehlikeli: toplar midline'a "YANIK" anında değerse hasar
      // DİKKAT: Yetenekler sırasında (Phase Dash, Quantum Lock) çalışmaz!
      const fluxDistance = distanceStateRef.current.currentDistance || 0;
      const fluxLevel = campaignModeRef.current?.levelConfig?.id || 1;
      const fluxCurrentTime = Date.now();

      // Check if player is using any special ability (immune to FluxOverload)
      const isUsingAbility = PhaseDash.isDashActive(phaseDashState.current) ||
        glitchModeState.current.isActive ||
        glitchModeState.current.phase === 'warning';

      // Trigger check - Only trigger when not using abilities
      if (!isUsingAbility && FluxOverload.shouldTrigger(fluxDistance, fluxLevel, fluxOverloadState.current)) {
        fluxOverloadState.current = FluxOverload.startWarning(
          fluxOverloadState.current,
          fluxCurrentTime,
          fluxDistance
        );
        AudioSystem.playFluxOverloadWarning();
        getHapticSystem().trigger('light');
      }

      // Update FluxOverload state - skip damage check if using ability
      const prevStrikes = fluxOverloadState.current.strikes;
      const fluxResult = isUsingAbility
        ? { newState: fluxOverloadState.current, triggerGameOver: false, hitOrbY: null }
        : FluxOverload.update(
          fluxOverloadState.current,
          fluxCurrentTime,
          whiteOrbY,
          blackOrbY,
          INITIAL_CONFIG.orbRadius,
          currentMidlineY
        );
      fluxOverloadState.current = fluxResult.newState;

      // Strike detected - orb touched the midline
      if (fluxResult.newState.strikes > prevStrikes) {
        ScreenShake.triggerCollision();
        getHapticSystem().trigger('heavy');
        AudioSystem.playFluxOverloadStrike();

        // Show strike indicator at the hit position (on midline)
        const midX = (whiteOrbX + blackOrbX) / 2;
        const strikeY = fluxResult.hitOrbY || currentMidlineY;
        scorePopups.current.push({
          x: midX,
          y: strikeY - 30,
          text: fluxResult.newState.strikes === 1 ? '⚡ STRIKE 1!' : '💀 STRIKE 2!',
          color: '#FF0055',
          life: 1.5,
          vy: -3,
        });
      }

      // Game over on 2nd strike
      if (fluxResult.triggerGameOver) {
        // Create explosion effect at midline
        const midX = (whiteOrbX + blackOrbX) / 2;
        createExplosion(midX, currentMidlineY, '#FF0055');
        onGameOver(score.current);
        return;
      }

      // --- GLITCH TOKEN UPDATE AND COLLECTION - Requirements 1.1, 1.2, 1.3, 1.4 ---
      // Get dash speed multiplier for glitch tokens
      const dashSpeedMultiplierForTokens = PhaseDash.getSpeedMultiplier(phaseDashState.current);
      glitchTokens.current = glitchTokens.current.filter((token) => {
        if (token.collected) return false;

        // Move token with game speed - Apply dash multiplier for warp feel
        const updatedToken = GlitchTokenSpawner.updateTokenPosition(
          token,
          -speed.current * slowMotionMultiplier * constructSpeedMultiplier * dashSpeedMultiplierForTokens
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

      // --- GLITCH SHARD UPDATE AND COLLISION - Requirements 2.4, 2.5, 3.1, 3.2, 3.3 ---
      // Skip if hit stop is active - Requirements 3.2
      if (hitStopFramesRemaining.current > 0) {
        // Decrement hit stop counter
        hitStopFramesRemaining.current = GlitchSystem.updateHitStop(hitStopFramesRemaining.current);

        // If hit stop just ended, flush buffered input
        if (hitStopFramesRemaining.current === 0) {
          const bufferedInput = GlitchSystem.flushBufferedInput();
          if (bufferedInput && bufferedInput.isReleaseFrame) {
            // Trigger swap from buffered input
            triggerSwap();
          }
        }
      } else if (glitchShardRef.current && glitchShardRef.current.active) {
        // Update shard position - Requirements 2.4
        const dashSpeedMultiplierForShard = PhaseDash.getSpeedMultiplier(phaseDashState.current);
        glitchShardRef.current = GlitchSystem.updateGlitchShard(
          glitchShardRef.current,
          speed.current * slowMotionMultiplier * constructSpeedMultiplier * dashSpeedMultiplierForShard,
          16.67 // Approximate delta time for 60fps
        );

        // Check if shard should be removed (exited left edge) - Requirements 2.5
        if (GlitchSystem.shouldRemoveShard(glitchShardRef.current)) {
          glitchShardRef.current = null;
        } else {
          // Check collision with player connector - Requirements 3.1
          const collision = GlitchSystem.checkGlitchShardCollision(
            playerX,
            playerY.current * height,
            currentConnectorLength.current,
            glitchShardRef.current
          );

          if (collision) {
            // Handle collision response - Requirements 3.2, 3.3, 3.5, 3.6
            const collisionResponse = GlitchSystem.handleGlitchShardCollision(
              glitchModeState.current,
              currentConnectorLength.current
            );

            // Update glitch mode state
            glitchModeState.current = collisionResponse.glitchModeState;

            // Set hit stop frames - Requirements 3.2
            hitStopFramesRemaining.current = collisionResponse.hitStopFrames;

            // Trigger screen shake - Requirements 3.3
            if (collisionResponse.shouldTriggerScreenShake) {
              ScreenShake.triggerCollision();
            }

            // Play impact sound - Requirements 9.2
            if (collisionResponse.shouldPlayImpactSound) {
              AudioSystem.playGlitchImpact();
            }

            // Remove shard - Requirements 3.5
            if (collisionResponse.shardRemoved) {
              glitchShardRef.current = GlitchSystem.deactivateGlitchShard(glitchShardRef.current);
              glitchShardRef.current = null;
            }

            // Trigger screen flash - Requirements 8.3
            glitchScreenFlashState.current = GlitchVFX.triggerScreenFlash('enter');

            // Start connector animation - Requirements 4.2
            connectorAnimationStartTime.current = Date.now();

            // Generate wave path shards - Requirements 5.6, 6.4
            wavePathShards.current = GlitchSystem.generateWavePathShards(
              glitchModeState.current.waveOffset,
              width,
              height / 2,
              120 // Wave amplitude
            );

            // Pause Overdrive if active - Requirements 6.7, 10.1
            if (shiftState.current.overdriveActive) {
              const pauseResult = GlitchSystem.pauseOverdrive(
                glitchModeState.current,
                shiftState.current
              );
              glitchModeState.current = pauseResult.glitchState;
              shiftState.current = pauseResult.overdriveState;
            }

            // Pause Resonance if active - Requirements 10.2
            if (resonanceState.current.isActive && !resonanceState.current.isPaused) {
              const pauseResult = GlitchSystem.pauseResonance(
                glitchModeState.current,
                resonanceState.current
              );
              glitchModeState.current = pauseResult.glitchState;
              resonanceState.current = pauseResult.resonanceState;
            }

            // Apply low-pass filter to music - Requirements 9.3
            AudioSystem.applyGlitchMusicFilter();

            // Haptic feedback
            getHapticSystem().trigger("heavy");

            // Score popup
            scorePopups.current.push({
              x: playerX,
              y: playerY.current * height - 40,
              text: "⚡ QUANTUM LOCK ⚡",
              color: "#00FF00",
              life: 2.0,
              vy: -2,
            });
          }
        }
      }

      // --- QUANTUM LOCK MODE UPDATE - Requirements 5.2, 7.2, 7.3, 7.4 ---
      // Update Glitch Mode state (phase transitions, wave offset, ghost mode)
      if (glitchModeState.current.isActive || glitchModeState.current.phase === 'ghost') {
        const previousPhase = glitchModeState.current.phase;

        // Update mode state - Requirements 7.2, 7.3, 7.4
        glitchModeState.current = GlitchSystem.updateGlitchMode(
          glitchModeState.current,
          16.67 // Approximate delta time for 60fps
        );

        // Check for phase transitions
        const currentPhase = glitchModeState.current.phase;

        // Handle transition to warning phase - Requirements 7.2
        if (previousPhase === 'active' && currentPhase === 'warning') {
          // Start exit warning visual effects
          scorePopups.current.push({
            x: width / 2,
            y: height / 2 - 60,
            text: "⚠️ EXITING SOON ⚠️",
            color: "#FFFF00",
            life: 1.5,
            vy: -1,
          });
        }

        // Handle transition to exiting phase - Requirements 7.3
        if (previousPhase === 'warning' && currentPhase === 'exiting') {
          // Start wave flattening animation
          connectorAnimationStartTime.current = Date.now();
        }

        // Handle transition to ghost mode - Requirements 7.4
        if (previousPhase === 'exiting' && currentPhase === 'ghost') {
          // Trigger exit screen flash - Requirements 8.4
          glitchScreenFlashState.current = GlitchVFX.triggerScreenFlash('exit');

          // Remove low-pass filter from music - Requirements 9.4
          AudioSystem.removeGlitchMusicFilter();

          // Resume paused modes - Requirements 7.8, 10.3
          if (glitchModeState.current.pausedOverdriveTime > 0) {
            shiftState.current = GlitchSystem.resumeOverdrive(
              glitchModeState.current,
              shiftState.current
            );
          }
          if (glitchModeState.current.pausedResonanceTime > 0) {
            resonanceState.current = GlitchSystem.resumeResonance(
              glitchModeState.current,
              resonanceState.current
            );
          }

          // Clear paused mode times
          glitchModeState.current = GlitchSystem.clearPausedModeTimes(glitchModeState.current);

          // Clear wave path shards
          wavePathShards.current = [];

          // Finalize connector length - Requirements 4.4
          currentConnectorLength.current = GlitchSystem.finalizeConnectorLength(
            glitchModeState.current,
            glitchModeState.current.originalConnectorLength
          );

          scorePopups.current.push({
            x: width / 2,
            y: height / 2 - 40,
            text: "👻 GHOST MODE 👻",
            color: "#00FF00",
            life: 1.5,
            vy: -1,
          });
        }

        // Handle ghost mode ending - Requirements 7.7
        if (previousPhase === 'ghost' && currentPhase === 'inactive') {
          // Normal gameplay restored
          scorePopups.current.push({
            x: width / 2,
            y: height / 2 - 40,
            text: "NORMAL MODE",
            color: "#FFFFFF",
            life: 1.0,
            vy: -1,
          });
        }

        // Update connector length animation during Quantum Lock - Requirements 4.2, 4.3
        if (glitchModeState.current.isActive) {
          const animationProgress = GlitchSystem.getConnectorAnimationProgress(
            glitchModeState.current,
            connectorAnimationStartTime.current
          );
          const targetLength = GlitchSystem.getTargetConnectorLength(glitchModeState.current);

          currentConnectorLength.current = GlitchSystem.calculateConnectorLength(
            glitchModeState.current,
            currentConnectorLength.current,
            targetLength,
            16.67,
            animationProgress
          );
        }

        // Update wave path shards positions - Requirements 5.6
        if (glitchModeState.current.isActive && wavePathShards.current.length > 0) {
          const waveAmplitude = GlitchSystem.getWaveAmplitudeForPhase(
            glitchModeState.current.phase,
            GlitchSystem.getGlitchProgress(glitchModeState.current)
          ) * 120; // Base amplitude

          wavePathShards.current = GlitchSystem.updateWavePathShards(
            wavePathShards.current,
            glitchModeState.current.waveOffset,
            waveAmplitude,
            height / 2,
            speed.current, // Pass game speed for horizontal movement
            width // Canvas width for respawning
          );

          // --- MIDLINE COLLISION DETECTION ---
          // Check if orbs are touching the wave (zero line)
          const whiteOrbWaveY = GlitchSystem.calculateWaveY(
            whiteOrbX,
            glitchModeState.current.waveOffset,
            waveAmplitude,
            height / 2
          );
          const blackOrbWaveY = GlitchSystem.calculateWaveY(
            blackOrbX,
            glitchModeState.current.waveOffset,
            waveAmplitude,
            height / 2
          );

          const whiteHit = GlitchSystem.checkMidlineCollision(whiteOrbY, whiteOrbWaveY, 20);
          const blackHit = GlitchSystem.checkMidlineCollision(blackOrbY, blackOrbWaveY, 20);

          if (whiteHit || blackHit) {
            const collisionResult = GlitchSystem.registerMidlineHit(glitchModeState.current);

            if (collisionResult.hit) {
              glitchModeState.current = collisionResult.updatedState;

              // Visual/audio feedback for hit
              const hitX = whiteHit ? whiteOrbX : blackOrbX;
              const hitY = whiteHit ? whiteOrbY : blackOrbY;
              ParticleSystem.emitBurst(hitX, hitY, activeCharacter?.types[0] || 'normal');
              ScreenShake.triggerNearMiss();

              // Show hit counter
              scorePopups.current.push({
                x: hitX,
                y: hitY - 30,
                text: `⚠️ HIT ${collisionResult.updatedState.midlineHits}/${GLITCH_CONFIG.midlineCollision.maxHits}`,
                color: "#FF4444",
                life: 0.8,
                vy: -2,
              });

              // Check if Quantum Lock should end
              if (collisionResult.shouldEndQuantumLock) {
                glitchModeState.current = GlitchSystem.forceEndQuantumLock(glitchModeState.current);
                burnEffectState.current = GlitchVFX.triggerBurnEffect();

                // Failure popup
                scorePopups.current.push({
                  x: width / 2,
                  y: height / 2,
                  text: "🔥 QUANTUM LOCK FAILED 🔥",
                  color: "#FF0000",
                  life: 2.0,
                  vy: -1,
                });

                ScreenShake.triggerCollision();
                wavePathShards.current = [];
              }
            }
          }

          // Check collection of wave path shards
          wavePathShards.current.forEach((shard, index) => {
            if (shard.collected) return;

            // Check collision with player orbs
            const distToWhite = Math.sqrt(
              Math.pow(shard.x - whiteOrbX, 2) + Math.pow(shard.y - whiteOrbY, 2)
            );
            const distToBlack = Math.sqrt(
              Math.pow(shard.x - blackOrbX, 2) + Math.pow(shard.y - blackOrbY, 2)
            );

            // Check collision with connector (line between orbs)
            // Calculate distance from point to line segment
            const connectorCollision = (() => {
              const px = shard.x;
              const py = shard.y;
              const x1 = whiteOrbX;
              const y1 = whiteOrbY;
              const x2 = blackOrbX;
              const y2 = blackOrbY;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const lengthSquared = dx * dx + dy * dy;

              if (lengthSquared === 0) return distToWhite; // Degenerate case

              // Project point onto line, clamped to segment
              const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
              const closestX = x1 + t * dx;
              const closestY = y1 + t * dy;

              return Math.sqrt(Math.pow(px - closestX, 2) + Math.pow(py - closestY, 2));
            })();

            // Collect if touching orbs OR connector
            if (distToWhite < 30 || distToBlack < 30 || connectorCollision < 15) {
              // Collect shard - Requirements 6.5: 2x multiplier
              wavePathShards.current = GlitchSystem.collectWavePathShard(wavePathShards.current, index);

              // Diamond Bonus System - Reflex rewards
              const bonusConfig = GLITCH_CONFIG.diamondBonus;
              const currentTime = Date.now();
              const timeSinceLastCollect = currentTime - (lastDiamondCollectTime.current || 0);

              // Calculate reflex bonus (fast collection = 2x)
              const isReflexCollect = timeSinceLastCollect < bonusConfig.reflexWindowMs && lastDiamondCollectTime.current > 0;
              const reflexMultiplier = isReflexCollect ? bonusConfig.reflexMultiplier : 1;

              // Update streak
              if (isReflexCollect) {
                diamondStreak.current = Math.min(diamondStreak.current + 1, bonusConfig.maxStreak);
              } else {
                diamondStreak.current = 1;
              }
              lastDiamondCollectTime.current = currentTime;

              // Calculate total value: base * glitch multiplier * reflex * streak
              const baseValue = bonusConfig.baseValue;
              const glitchMultiplier = GlitchSystem.getShardMultiplier(glitchModeState.current);
              const streakBonus = (diamondStreak.current - 1) * bonusConfig.streakBonus;
              const shardValue = Math.floor((baseValue + streakBonus) * glitchMultiplier * reflexMultiplier);

              useGameStore.getState().addEchoShards(shardValue);

              // Visual feedback with bonus indicator
              ParticleSystem.emitBurst(shard.x, shard.y, activeCharacter?.types[0] || 'normal');

              // Show bonus text
              let bonusText = `+${shardValue} 💎`;
              if (isReflexCollect) {
                bonusText = `+${shardValue} 💎 REFLEX!`;
              }
              if (diamondStreak.current >= 3) {
                bonusText = `+${shardValue} 💎 x${diamondStreak.current} STREAK!`;
              }

              scorePopups.current.push({
                x: shard.x,
                y: shard.y - 20,
                text: bonusText,
                color: isReflexCollect ? "#FFD700" : "#00FF00",
                life: isReflexCollect ? 1.2 : 0.8,
                vy: -2,
              });

              // Haptic feedback - stronger for combos
              getHapticSystem().trigger(diamondStreak.current >= 3 ? "medium" : "light");

              // Audio feedback
              AudioSystem.playShardCollect();
            }
          });
        }
      }

      // Update screen flash state
      glitchScreenFlashState.current = GlitchVFX.updateScreenFlash(glitchScreenFlashState.current);

      // Update burn effect state
      burnEffectState.current = GlitchVFX.updateBurnEffect(burnEffectState.current);

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
            ParticleSystem.emitBurst(collectible.x, collectible.y, activeCharacter?.types[0] || 'normal');
            ParticleSystem.emitBurst(collisionX, collisionY, activeCharacter?.types[0] || 'normal');

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
              ParticleSystem.emitBurst(playerX, playerY.current * height, activeCharacter?.types[0] || 'normal');
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
      // Get dash speed multiplier - makes everything fly faster during dash for warp feel
      const dashSpeedMultiplierForShards = PhaseDash.getSpeedMultiplier(phaseDashState.current);
      activeShards.current = activeShards.current.filter((shard) => {
        if (shard.collected) {
          shardPool.current.release(
            shard as unknown as ObjectPool.PooledEngineShard
          );
          return false;
        }

        // Move base position left with game speed - Apply construct and dash speed multipliers
        // Dash multiplier makes shards fly faster too for consistent warp feel
        shard.baseX -= speed.current * slowMotionMultiplier * constructSpeedMultiplier * dashSpeedMultiplierForShards;

        // Calculate dynamic position with oscillation (yukarı-aşağı + ileri-geri)
        const dynamicPos = ShardPlacement.calculateShardPosition(
          shard,
          currentTime
        );
        shard.x = dynamicPos.x;
        shard.y = dynamicPos.y;

        // Check collection with both orbs
        // In finish mode, player moves right. During dash, player also moves forward.
        const shardDashXOffset = PhaseDash.getPlayerXOffset(phaseDashState.current);
        const shardPlayerX = (width / 8) + finishModePlayerX.current + shardDashXOffset;
        const xRotOffset = Math.sin(rotationAngle.current) * 15;
        const whiteOrbX = shardPlayerX - xRotOffset;
        const blackOrbX = shardPlayerX + xRotOffset;
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
          let finalValue = isBonus ? awardedValue * 2 : awardedValue; // Bonus 2x ekstra

          // Apply Quantum Lock shard multiplier - Requirements 6.5
          const glitchMultiplier = GlitchSystem.getShardMultiplier(glitchModeState.current);
          finalValue = finalValue * glitchMultiplier;

          // Campaign Update v2.5 - Track shards collected for star rating
          // Requirements: 4.2
          if (campaignModeRef.current?.enabled && campaignModeRef.current.useDistanceMode) {
            shardsCollectedRef.current += 1;
          }

          // Award Echo Shards
          useGameStore.getState().addEchoShards(finalValue);

          // Phase Dash: Energy gain from shard collection
          const dashRechargeMultiplier = getActiveUpgradeEffects().dashRechargeMultiplier;
          phaseDashState.current = PhaseDash.updateEnergy(
            phaseDashState.current,
            PhaseDash.PHASE_DASH_CONFIG.energyPerShard * dashRechargeMultiplier
          );

          // Mission System: Emit COLLECT event - Requirements 7.4
          onMissionEvent?.({ type: 'COLLECT', value: 1 });

          // Visual feedback - BONUS için büyük patlama
          if (isBonus) {
            // Büyük patlama efekti - 3 dalga
            ParticleSystem.emitBurst(shard.x, shard.y, activeCharacter?.types[0] || 'normal');
            ParticleSystem.emitBurst(shard.x, shard.y, activeCharacter?.types[1] || activeCharacter?.types[0] || 'normal');
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
            // Particle burst on shard collection - Requirements 14.1
            ParticleSystem.emitBurst(shard.x, shard.y, activeCharacter?.types[0] || 'normal');
            // Haptic feedback
            getHapticSystem().trigger("light");
            // Audio: Collection SFX on shard pickup - Requirements 14.1
            AudioSystem.playShardCollect();
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
          currentDistance: distanceTrackerRef.current?.getCurrentDistance() ?? 0,
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
          currentConnectorLength.current,
          distanceTrackerRef.current?.getCurrentDistance() ?? 0
        );
        restoreState.current = RestoreSystem.recordSnapshot(
          restoreState.current,
          legacySnapshot
        );
      }

      let collisionDetected = false;

      // Get dash speed multiplier for obstacle movement - makes obstacles fly faster during dash
      const dashSpeedMultiplier = PhaseDash.getSpeedMultiplier(phaseDashState.current);

      obstacles.current.forEach((obs) => {
        // Horizontal Movement - Apply slow motion, construct, and dash speed multipliers
        // Dash multiplier makes obstacles move faster = feels like player is warping through
        obs.x -= speed.current * slowMotionMultiplier * constructSpeedMultiplier * dashSpeedMultiplier;

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
              ParticleSystem.emitBurst(playerX, playerY.current * height, activeCharacter?.types[0] || 'normal');
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
            // Campaign Mode: Check for level completion (score-based only) - Requirements 7.3
            // Skip if using distance mode - distance completion is handled separately
            const campMode = campaignModeRef.current;
            if (
              campMode?.enabled &&
              campMode.targetScore &&
              !campMode.useDistanceMode &&
              !levelCompleted.current
            ) {
              if (score.current >= campMode.targetScore) {
                levelCompleted.current = true;
                campMode.onLevelComplete?.(score.current);
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
              ParticleSystem.emitBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, activeCharacter?.types[0] || 'normal');

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

        // Check Quantum Lock / Ghost Mode invulnerability - Requirements 6.3, 7.6
        const glitchInvincible = GlitchSystem.isInvulnerable(glitchModeState.current);

        // Also skip if pending restore (waiting for user decision) or restore animation is playing
        // Skip collision in finish mode - player is exiting screen
        if (
          isPhasing.current ||
          gravityState.current.isInvincible ||
          zenModeInvincible ||
          postRestoreInvincibleActive ||
          shieldInvincibleActive ||
          constructInvincible ||
          glitchInvincible ||
          pendingRestore.current ||
          isRestoreAnimating.current ||
          isInFinishMode.current
        )
          return;

        // Phase Dash: Destroy obstacles with satisfying impact
        if (PhaseDash.isInvincible(phaseDashState.current)) {
          const whiteOrbPos = { x: whiteOrb.x, y: whiteOrb.y };
          const blackOrbPos = { x: blackOrb.x, y: blackOrb.y };

          const whiteHit = checkCollision(whiteOrbPos, whiteOrb.radius, obs);
          const blackHit = checkCollision(blackOrbPos, blackOrb.radius, obs);

          if (whiteHit || blackHit) {
            // Create enhanced debris particles for satisfying destruction
            const obsColor = obs.polarity === 'white' ? '#FFFFFF' : '#000000';
            PhaseDashVFX.createObstacleDebris(
              obs.x,
              obs.y,
              obs.width,
              obs.height,
              obsColor
            );

            // Add particle burst at impact point for extra visual feedback
            const impactX = obs.x + obs.width / 2;
            const impactY = obs.y + obs.height / 2;
            ParticleSystem.emitBurst(impactX, impactY, activeCharacter?.types[0] || 'normal');

            // Mark obstacle for removal
            obs.passed = true;
            obs.x = -1000; // Move off screen

            // Strong screen shake on impact - feels like breaking through
            ScreenShake.trigger({
              intensity: 12,
              duration: 200,
              frequency: 40,
              decay: true
            });

            // Strong haptic feedback - feels like smashing
            getHapticSystem().trigger("heavy");

            // Audio feedback for destruction
            AudioSystem.playTitanStomp(); // Reuse stomp sound for impact
          }
          return;
        }

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
                ParticleSystem.emitBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, activeCharacter?.types[0] || 'normal');

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
                shieldInvincibleUntil.current = collisionTime + 2000 + spiritModifiers.shieldTimeBonus;

                // VFX: shatter burst + popup + mild shake + haptic
                ParticleSystem.emitBurst(whiteOrb.x, whiteOrb.y, activeCharacter?.types[0] || 'normal');
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
                ParticleSystem.emitBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, activeCharacter?.types[0] || 'normal');
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
                ParticleSystem.emitBurst(whiteOrb.x, whiteOrb.y, activeCharacter?.types[0] || 'normal');
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

              // Campaign Update v2.5 - Track damage taken for star rating
              // Requirements: 4.3
              if (campaignModeRef.current?.enabled && campaignModeRef.current.useDistanceMode) {
                damageTakenRef.current += 1;
                playerHealthRef.current = 0; // Player died
              }

              // Environmental Effects: Glitch artifact on damage - Requirements 14.3
              EnvironmentalEffects.triggerGlobalGlitchArtifact(canvas.height);
              // Audio: Glitch damage SFX - Requirements 14.3
              AudioSystem.playGlitchDamage();

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

              // Reset near-miss streak on collision - Requirements Update
              nearMissState.current = createInitialNearMissState();
              onNearMissStateUpdate?.(0);
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
                ParticleSystem.emitBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, activeCharacter?.types[0] || 'normal');

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
                shieldInvincibleUntil.current = collisionTime + 2000 + spiritModifiers.shieldTimeBonus;

                ParticleSystem.emitBurst(blackOrb.x, blackOrb.y, activeCharacter?.types[0] || 'normal');
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
                ParticleSystem.emitBurst(obs.x + obs.width / 2, obs.y + obs.height / 2, activeCharacter?.types[0] || 'normal');
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
                ParticleSystem.emitBurst(blackOrb.x, blackOrb.y, activeCharacter?.types[0] || 'normal');
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

              // Campaign Update v2.5 - Track damage taken for star rating
              // Requirements: 4.3
              if (campaignModeRef.current?.enabled && campaignModeRef.current.useDistanceMode) {
                damageTakenRef.current += 1;
                playerHealthRef.current = 0; // Player died
              }

              // Environmental Effects: Glitch artifact on damage - Requirements 14.3
              EnvironmentalEffects.triggerGlobalGlitchArtifact(canvas.height);
              // Audio: Glitch damage SFX - Requirements 14.3
              AudioSystem.playGlitchDamage();

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

              // Reset near-miss streak on collision - Requirements Update
              nearMissState.current = createInitialNearMissState();
              onNearMissStateUpdate?.(0);
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

              // Maneuver-based Shield System: Award shield every X near misses - Requirements Update
              if (nearMissState.current.streakCount > 0 && nearMissState.current.streakCount % SHIELD_REWARD_STREAK === 0) {
                shieldChargesRemaining.current += 1;

                // Visual feedback for shield gain
                scorePopups.current.push({
                  x: whiteOrb.x,
                  y: whiteOrb.y - 40,
                  text: "🛡️ SHIELD RESTORED (+1)",
                  color: "#00F0FF",
                  life: 2.0,
                  vy: -1.5,
                });

                // Audio: Shield gain sound
                AudioSystem.playShieldBlock();
                getHapticSystem().trigger("heavy");
              }

              // Daily Rituals: Track near miss event - Requirements 3.7
              ritualTracking?.onNearMiss?.();

              // Mission System: Emit NEAR_MISS event for white orb - Requirements 7.3
              onMissionEvent?.({ type: 'NEAR_MISS', value: 1 });

              // Phase Dash: Energy gain from near-miss (+10%)
              const dashRechargeMultiplier = getActiveUpgradeEffects().dashRechargeMultiplier;
              phaseDashState.current = PhaseDash.updateEnergy(
                phaseDashState.current,
                PhaseDash.PHASE_DASH_CONFIG.energyPerNearMiss * dashRechargeMultiplier
              );

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

                // Campaign Mode: Check for level completion (score-based only) - Requirements 7.3
                // Skip if using distance mode - distance completion is handled separately
                const campMode = campaignModeRef.current;
                if (
                  campMode?.enabled &&
                  campMode.targetScore &&
                  !campMode.useDistanceMode &&
                  !levelCompleted.current
                ) {
                  if (score.current >= campMode.targetScore) {
                    levelCompleted.current = true;
                    campMode.onLevelComplete?.(score.current);
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

              // Audio and Haptic Feedback for successful near-miss - User Request
              AudioSystem.playNearMiss();
              getHapticSystem().trigger('medium');
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

              // Maneuver-based Shield System: Award shield every X near misses - Requirements Update
              if (nearMissState.current.streakCount > 0 && nearMissState.current.streakCount % SHIELD_REWARD_STREAK === 0) {
                shieldChargesRemaining.current += 1;

                // Visual feedback for shield gain
                scorePopups.current.push({
                  x: blackOrb.x,
                  y: blackOrb.y - 40,
                  text: "🛡️ SHIELD RESTORED (+1)",
                  color: "#00F0FF",
                  life: 2.0,
                  vy: -1.5,
                });

                // Audio: Shield gain sound
                AudioSystem.playShieldBlock();
                getHapticSystem().trigger("heavy");
              }

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

                // Campaign Mode: Check for level completion (score-based only) - Requirements 7.3
                // Skip if using distance mode - distance completion is handled separately
                if (
                  campaignMode?.enabled &&
                  campaignMode.targetScore &&
                  !campaignMode.useDistanceMode &&
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

              // Audio and Haptic Feedback for successful near-miss - User Request
              AudioSystem.playNearMiss();
              getHapticSystem().trigger('medium');
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
      ParticleSystem.update();

      // Update Screen Shake - Requirements 10.3, 10.4
      ScreenShake.update(Date.now());

      // Update Chromatic Aberration - Requirements 11.2, 11.3
      ChromaticAberration.update(Date.now());

      // Update Environmental Effects - Requirements 14.2, 14.3
      // BPM-synced pulse and glitch artifact updates
      EnvironmentalEffects.updateGlobalEnvironmentalEffects();

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

      // --- PARTICLES (BACKGROUND LAYER) ---
      // Render new ParticleSystem particles with Zen Mode intensity
      const visualIntensity = zenMode?.enabled
        ? ZenMode.getVisualIntensity(zenModeState.current)
        : 1.0;

      ctx.save();
      ctx.globalAlpha = visualIntensity;
      // Only render spirit particles if a character is equipped
      if (activeCharacter) {
        ParticleSystem.render(ctx);
      }
      ctx.globalAlpha = 1.0;

      // Render legacy particles with Zen Mode intensity
      particles.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.life * visualIntensity;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * p.life;
        const size = (2 + p.life * 4) * (0.8 + Math.random() * 0.4);
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
      ctx.restore();

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

      // Render all blocks using BlockSystem
      BlockSystem.renderAllBlocks(obstacles.current, {
        ctx,
        currentTime: Date.now(),
        bpm: EnvironmentalEffects.getEnvironmentalEffectsState().currentBPM,
        whiteObstacleColor,
        blackObstacleColor,
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

      // --- GLITCH SHARD RENDERING - Requirements 1.1, 1.2, 1.3, 1.4, 1.5 ---
      if (glitchShardRef.current && glitchShardRef.current.active) {
        GlitchVFX.renderGlitchShard(ctx, glitchShardRef.current);
      }

      // --- QUANTUM LOCK VFX RENDERING - Requirements 5.3, 5.4, 5.5, 8.1, 8.6 ---
      if (glitchModeState.current.isActive || glitchModeState.current.phase === 'warning' || glitchModeState.current.phase === 'exiting') {
        const glitchProgress = GlitchSystem.getGlitchProgress(glitchModeState.current);

        // Render sinus tunnel - Requirements 5.3, 5.4, 5.5
        const waveAmplitude = GlitchSystem.getWaveAmplitudeForPhase(
          glitchModeState.current.phase,
          glitchProgress
        ) * 120; // Base amplitude

        if (waveAmplitude > 0) {
          GlitchVFX.renderSinusTunnel(
            ctx,
            width,
            height,
            glitchModeState.current.waveOffset,
            waveAmplitude
          );
        }

        // Render static noise - Requirements 8.1, 8.6
        const noiseIntensity = GlitchVFX.getNoiseIntensity(
          glitchModeState.current.phase,
          glitchProgress
        );
        if (noiseIntensity > 0) {
          GlitchVFX.renderStaticNoise(ctx, width, height, noiseIntensity);
        }

        // Render Quantum Lock Ambiance - Vignette, Scanlines, Danger Pulse
        GlitchVFX.renderQuantumLockAmbiance(ctx, width, height, glitchModeState.current);

        // Render wave path shards - Requirements 5.6, 6.4
        wavePathShards.current.forEach((shard) => {
          if (shard.collected) return;

          const shardTime = Date.now() * 0.003;
          const pulseScale = 1 + Math.sin(shardTime * 2) * 0.15;
          const shardSize = 10 * pulseScale;

          ctx.save();
          ctx.translate(shard.x, shard.y);

          // Green glow for wave path shards
          ctx.shadowColor = "#00FF00";
          ctx.shadowBlur = 15 + Math.sin(shardTime * 3) * 5;

          // Draw diamond shape
          ctx.beginPath();
          ctx.moveTo(0, -shardSize);
          ctx.lineTo(shardSize, 0);
          ctx.lineTo(0, shardSize);
          ctx.lineTo(-shardSize, 0);
          ctx.closePath();

          // Green gradient
          const gradient = ctx.createLinearGradient(-shardSize, -shardSize, shardSize, shardSize);
          gradient.addColorStop(0, "#00FF00");
          gradient.addColorStop(0.5, "#00FFFF");
          gradient.addColorStop(1, "#00FF00");
          ctx.fillStyle = gradient;
          ctx.fill();

          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.restore();
        });

        // Quantum Lock timer indicator
        const remainingMs = glitchModeState.current.duration - (Date.now() - glitchModeState.current.startTime);
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const timerProgress = 1 - glitchProgress;

        // Draw timer bar at top
        const barWidth = 200;
        const barHeight = 8;
        const barX = (width - barWidth) / 2;
        const barY = 90;

        // Background bar
        ctx.fillStyle = "#333333";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress bar with green glow
        ctx.shadowColor = "#00FF00";
        ctx.shadowBlur = 10;
        ctx.fillStyle = glitchModeState.current.phase === 'warning' || glitchModeState.current.phase === 'exiting'
          ? "#FFFF00"
          : "#00FF00";
        ctx.fillRect(barX, barY, barWidth * timerProgress, barHeight);
        ctx.shadowBlur = 0;

        // Timer text
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "#00FF00";
        ctx.textAlign = "center";
        ctx.fillText(
          `⚡ QUANTUM LOCK ⚡ ${remainingSeconds}s`,
          width / 2,
          barY - 10
        );
      }

      // Ghost Mode indicator - Requirements 7.5
      if (glitchModeState.current.phase === 'ghost') {
        const ghostProgress = GlitchSystem.getGhostModeProgress(glitchModeState.current);
        const remainingMs = GlitchSystem.getGhostModeRemainingTime(glitchModeState.current);
        const remainingSeconds = Math.ceil(remainingMs / 1000);

        // Draw ghost mode indicator
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = `rgba(0, 255, 0, ${0.5 + (1 - ghostProgress) * 0.5})`;
        ctx.textAlign = "center";
        ctx.fillText(
          `👻 GHOST MODE 👻 ${remainingSeconds}s`,
          width / 2,
          90
        );
      }

      // Render screen flash - Requirements 8.3, 8.4
      GlitchVFX.renderScreenFlash(ctx, width, height, glitchScreenFlashState.current);

      // Render burn effect - Quantum Lock failure
      GlitchVFX.renderBurnEffect(ctx, width, height, burnEffectState.current);

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


      // --- PHASE DASH VISUAL OFFSET ---
      // Move player visually UP (forward) during dash animation
      let dashVisualYOffset = 0;
      if (PhaseDashVFX.isVFXActive(phaseDashVFXState.current)) {
        const t = phaseDashVFXState.current.transitionProgress;
        // Move up by 25% of screen height at max intensity
        dashVisualYOffset = -t * (height * 0.25);
      }

      // Create visual orb positions including the offset for RENDERING
      const visualWhiteOrb = { ...whiteOrb, y: whiteOrb.y + dashVisualYOffset };
      const visualBlackOrb = { ...blackOrb, y: blackOrb.y + dashVisualYOffset };

      // Calculate center point (using visual position)
      const centerX = (visualWhiteOrb.x + visualBlackOrb.x) / 2;
      const centerY = (visualWhiteOrb.y + visualBlackOrb.y) / 2;
      const time = Date.now() * 0.003;

      // 1. Draw Connector - Theme System Integration - Requirements 5.1, 5.2, 5.3
      // During dash, fade out normal connector and show neon spin instead
      const dashTransition = phaseDashVFXState.current.transitionProgress;
      const normalOpacity = PhaseDashVFX.getNormalConnectorOpacity(dashTransition);

      // Get Quantum Lock connector render options - Requirements 4.5, 4.6, 7.5
      const glitchConnectorOptions = GlitchVFX.getConnectorRenderOptions(glitchModeState.current);

      if (normalOpacity > 0) {
        // Spirit VFX: Elemental Connector
        // Override standard connector if character is active AND not in Quantum Lock mode
        if (activeCharacter && !glitchConnectorOptions.greenTint) {
          ctx.save();
          ctx.globalAlpha = normalOpacity;
          SpiritRenderer.renderElementalConnector(
            ctx,
            visualWhiteOrb.x,
            visualWhiteOrb.y,
            visualBlackOrb.x,
            visualBlackOrb.y,
            activeCharacter.types,
            Date.now()
          );
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha = normalOpacity * glitchConnectorOptions.opacity;

          // Apply pulse scale during Quantum Lock - Requirements 4.6
          const pulseScale = glitchConnectorOptions.pulseScale;

          const gradient = ctx.createLinearGradient(
            visualWhiteOrb.x,
            visualWhiteOrb.y,
            visualBlackOrb.x,
            visualBlackOrb.y
          );

          // Apply green tint during Quantum Lock - Requirements 4.5
          if (glitchConnectorOptions.greenTint) {
            gradient.addColorStop(0, "#00FF00");
            gradient.addColorStop(0.5, "#00FF88");
            gradient.addColorStop(1, "#00FF00");

            // Add glow effect
            ctx.shadowColor = "#00FF00";
            ctx.shadowBlur = 15;
          } else {
            gradient.addColorStop(0, getColor("topOrb"));
            gradient.addColorStop(0.5, getColor("connector"));
            gradient.addColorStop(1, getColor("bottomOrb"));
          }

          ctx.beginPath();
          ctx.moveTo(visualWhiteOrb.x, visualWhiteOrb.y);
          ctx.lineTo(visualBlackOrb.x, visualBlackOrb.y);
          ctx.lineWidth = INITIAL_CONFIG.connectorWidth * pulseScale;
          ctx.strokeStyle = gradient;
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.restore();
        }
      }

      // --- FLUX OVERLOAD MIDLINE - Yasaklı Hat (Sıfır Çizgisi Tehlikeli) ---
      // Render unstable MIDLINE during warning and active phases
      // KALP ATIŞI: Yanık iken tehlikeli, sönük iken güvenli geçiş
      const fluxPhase = FluxOverload.getCurrentPhase(fluxOverloadState.current);
      if (fluxPhase !== 'inactive') {
        // Get pulse intensity for visual (1.0 = bright/danger, 0.15 = dim/safe)
        const pulseIntensity = fluxPhase === 'active'
          ? FluxOverload.getPulseIntensity(fluxOverloadState.current.phaseStartTime, Date.now())
          : 0.7; // Warning phase = steady medium brightness

        // Check if any orb is near the midline (for danger indicator)
        const whiteNearMidline = FluxOverload.isOrbTouchingMidline(
          visualWhiteOrb.y, visualWhiteOrb.radius, currentMidlineY
        );
        const blackNearMidline = FluxOverload.isOrbTouchingMidline(
          visualBlackOrb.y, visualBlackOrb.radius, currentMidlineY
        );
        const isInDanger = whiteNearMidline || blackNearMidline;

        // Render the unstable midline (horizontal laser line across screen)
        SpiritRenderer.renderFluxOverloadConnector(
          ctx,
          { x: 0, y: currentMidlineY },           // Left edge of screen
          { x: width, y: currentMidlineY },       // Right edge of screen
          fluxPhase as 'warning' | 'active',
          Date.now(),
          isInDanger,
          pulseIntensity                          // Pass pulse intensity for visual
        );
      }

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
        // Save canvas state to prevent shadow bleeding from other rendering
        ctx.save();

        // CRITICAL: Reset ALL shadow effects at the very start
        // This ensures no glow bleeds from previous rendering operations
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.globalCompositeOperation = 'source-over';

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
          // [CRITICAL FIX] Orb renkleri BLOKLARLA AYNI OLMALI
          // Bloklar topObstacle/bottomObstacle kullanıyor ve doğru çalışıyor
          // Bu yüzden aynı renkleri orblar için de kullanıyoruz:
          // - isWhite=true (üst orb) → topObstacle = bottomBg (mor/lacivert)
          // - isWhite=false (alt orb) → bottomObstacle = topBg (yeşil/kırmızı)
          let orbFillColor = isWhite ? getColor("topObstacle") : getColor("bottomObstacle");
          let orbBorderColor = isWhite ? getColor("bottomObstacle") : getColor("topObstacle");

          // Fallback to default colors if theme system returns empty
          if (!orbFillColor) orbFillColor = isWhite ? "#FFFFFF" : "#000000";
          if (!orbBorderColor) orbBorderColor = isWhite ? "#000000" : "#FFFFFF";

          // Determine zone background: check orb Y position against midline
          const midY = height / 2;
          const currentZoneBg = orb.y < midY ? getColor("topBg") || "#000000" : getColor("bottomBg") || "#FFFFFF";

          // Only draw border if orb color matches background (for visibility)
          // During Quantum Lock, always show border since ambiance changes background
          const isQuantumLockActive = glitchModeState.current.isActive ||
            glitchModeState.current.phase === 'warning' ||
            glitchModeState.current.phase === 'exiting';
          const needsBorder = isQuantumLockActive || orbFillColor.toLowerCase() === currentZoneBg.toLowerCase();

          // Her zaman içi dolu çiz (orb rengiyle), border SADECE gerektiğinde
          if (skin.id === "default") {
            // Reset shadow effects for clean default orb rendering
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

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

          // Spirit Character: Draw Pokemon silhouette and elemental aura
          if (activeCharacter && spiritSpriteRef.current) {
            const types = activeCharacter.types;
            const primaryType = types[0] || 'normal';
            const now = Date.now();

            // Update trails - Requirements 9.2: Trailing Soul
            // Use velocity-based emission and LOD optimization
            const trailRef = isWhite ? whiteOrbTrail : blackOrbTrail;

            // Calculate total particles for LOD
            const totalParticles = particles.current.length;
            const lodConfig = TrailingSoul.getAdjustedTrailConfig(
              totalParticles,
              TrailingSoul.DEFAULT_TRAIL_CONFIG
            );

            trailRef.current = TrailingSoul.updateTrail(
              trailRef.current,
              orb.x,
              orb.y,
              playerVelocityY.current,
              lodConfig,
              now
            );

            // Render Trailing Soul (Behind Orb)
            TrailingSoul.renderTrailingSoul(
              ctx,
              trailRef.current,
              spiritSpriteRef.current,
              orb.radius,
              primaryType,
              orbFillColor
            );

            // Draw professional orb with silhouette and lean - Spirit VFX System
            SpiritRenderer.renderProfessionalOrb(
              ctx,
              orb.x,
              orb.y,
              orb.radius,
              spiritSpriteRef.current,
              orbFillColor,
              primaryType,
              playerVelocityY.current,
              now
            );

            // Draw elemental aura particles (passive)
            SpiritRenderer.renderElementalParticles(
              ctx,
              orb.x,
              orb.y,
              orb.radius,
              primaryType,
              now
            );

            // Note: Main converging trail particles are emitted in the main game loop (lines 2584-2594)
            // Those emissions correctly use isTopOrb for V-shaped convergence
          }
        }

        // Restore canvas state
        ctx.restore();
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

      // Emit trail particles from current orb positions (using visual position)
      if (trailConfig.enabled) {
        OrbTrailSystem.emitTrail(visualWhiteOrb.x, visualWhiteOrb.y, true, trailConfig);
        OrbTrailSystem.emitTrail(visualBlackOrb.x, visualBlackOrb.y, false, trailConfig);
        OrbTrailSystem.updateTrails(1 / 60, trailConfig); // Assume 60fps
      }

      // Render trails BEFORE orbs so they appear behind
      OrbTrailSystem.renderTrails(ctx, trailConfig);

      // --- HOLOGRAPHIC GATE / FINISH LINE RENDER ---
      // Requirements: 12.1, 12.2 - Render finish line when in finish mode
      if (isInFinishMode.current && !levelCompleted.current) {
        const gateState = holographicGateState.current;

        // Render holographic gate (finish line)
        if (gateState.visible && !gateState.isShattered) {
          HolographicGate.renderHolographicGate(
            ctx,
            gateState,
            finishLineX.current,
            height / 2,
            HolographicGate.DEFAULT_HOLOGRAPHIC_GATE_CONFIG
          );
        }

        // Render shatter particles after gate is broken
        if (gateState.isShattered && gateState.shatterParticles.length > 0) {
          HolographicGate.renderShatterParticles(ctx, gateState.shatterParticles);
        }

        // Draw "FINISH" text above gate
        if (gateState.visible && !hasReachedFinishLine.current) {
          ctx.save();
          ctx.font = 'bold 24px monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#00ffff';
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 15;
          ctx.fillText('FINISH', finishLineX.current, height / 2 - 180);
          ctx.restore();
        }
      }

      // --- ENEMY RENDERING - Glitch Dart System ---
      // Draw enemy AFTER other game elements so it's visible on top
      // HIDDEN during special abilities: Phase Dash and Quantum Lock (diamond collection)
      const isInSpecialAbilityRender = PhaseDash.isDashActive(phaseDashState.current) || glitchModeState.current.isActive;
      if (enemyManagerState.current && enemyManagerState.current.isActive && !isInSpecialAbilityRender) {
        EnemyManager.drawEnemy(ctx, enemyManagerState.current, width);

        // Draw knockback VFX (impact flash, speed lines, shockwave)
        EnemyDeathVFX.drawKnockbackVFX(ctx);

        // Draw counter-attack projectile if active
        const counterRender = (enemyManagerState.current as any).counterAttackRender;
        if (counterRender && counterAttackActive.current) {
          SpiritRenderer.renderElementalProjectile(
            ctx,
            counterRender.startX,
            counterRender.startY,
            counterRender.endX,
            counterRender.endY,
            counterRender.type,
            Date.now()
          );
          // Clear after rendering
          (enemyManagerState.current as any).counterAttackRender = null;
        }
      }

      // --- ENEMY DEATH VFX RENDERING - Explosion and Shatter Effects ---
      // Update and draw death VFX (runs independently of enemy state)
      EnemyDeathVFX.updateDeathVFX(16); // ~60fps
      EnemyDeathVFX.drawDeathVFX(ctx);

      // --- CONSTRUCT RENDERING - Requirements 3.5, 4.5, 5.6 ---
      // Update construct render state for animations
      // Update construct render state for animations
      const playerCenterX = playerX;
      // Use visual Y center for construct as well
      const playerCenterY = (playerY.current * height) + dashVisualYOffset;
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
        // Use visual orbs with offset
        // During dash, fade out normal orbs (neon spin replaces them)
        const orbOpacity = PhaseDashVFX.getNormalConnectorOpacity(phaseDashVFXState.current.transitionProgress);
        if (orbOpacity > 0) {
          ctx.save();
          ctx.globalAlpha = orbOpacity;
          drawOrb(visualBlackOrb, false);
          drawOrb(visualWhiteOrb, true);
          ctx.restore();
        }
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
          ctx.arc(visualWhiteOrb.x, visualWhiteOrb.y, visualWhiteOrb.radius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "#00F0FF";
          ctx.lineWidth = 3;
          ctx.stroke();

          // Glow around black orb
          ctx.beginPath();
          ctx.arc(visualBlackOrb.x, visualBlackOrb.y, visualBlackOrb.radius + 5, 0, Math.PI * 2);
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

      // Apply Glitch Artifact post-process effect - Requirements 14.3
      // This creates a digital distortion effect when damage is taken
      const envEffectsState = EnvironmentalEffects.getEnvironmentalEffectsState();
      if (EnvironmentalEffects.isGlitchActive(envEffectsState)) {
        EnvironmentalEffects.applyGlitchArtifact(ctx, canvas, envEffectsState);
      }

      // --- FLUX OVERLOAD RENDERING - Yasaklı Hat Glitch Efektleri ---
      // Glitch overlay when player took damage (intensity fades over time)
      if (fluxOverloadState.current.glitchIntensity > 0) {
        SpiritRenderer.drawGlitchOverlay(
          ctx,
          width,
          height,
          fluxOverloadState.current.glitchIntensity
        );
      }

      // Warning text during warning phase
      if (fluxOverloadState.current.isWarningPhase) {
        SpiritRenderer.drawFluxOverloadWarning(ctx, width, Date.now());
      }

      // --- PHASE DASH VFX RENDERING ---
      // Render all Phase Dash visual effects (darken overlay, color grading, speed lines, vignette, particles)
      if (PhaseDashVFX.isVFXActive(phaseDashVFXState.current)) {
        PhaseDashVFX.renderAllVFX(ctx, width, height, phaseDashVFXState.current);
      }

      // Render Phase Dash connector trail (spinning bar effect)
      if (phaseDashState.current.isActive) {
        const orbRadius = Math.min(width, height) * 0.03;
        // Add current connector position to trail
        const dashXOffset = PhaseDash.getPlayerXOffset(phaseDashState.current);
        const trailX = width / 8 + dashXOffset;
        const trailY = playerY.current * height;
        const trailAngle = rotationAngle.current + PhaseDash.getSpinAngle(phaseDashState.current);
        PhaseDashVFX.addConnectorTrailPosition(
          trailX,
          trailY,
          trailAngle,
          currentConnectorLength.current
        );
        // Draw the trail
        PhaseDashVFX.updateAndDrawConnectorTrail(ctx, orbRadius);
      }

      // Render Phase Dash debris particles (from destroyed obstacles)
      PhaseDashVFX.updateAndDrawDebris(ctx);


      if (collisionDetected) {
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

          // Campaign Chapter System - Game over handling
          // Requirements: 6.1, 6.2, 6.3 - Pass distance traveled to game over screen
          // Note: Chapter is NOT unlocked on game over (handled by NOT calling onDistanceLevelComplete)
          const currentCampaign = campaignModeRef.current;
          if (currentCampaign?.enabled && currentCampaign.useDistanceMode && distanceTrackerRef.current) {
            // Call chapter game over callback with distance info
            currentCampaign.onChapterGameOver?.({
              distanceTraveled: distanceTrackerRef.current.getCurrentDistance(),
              targetDistance: distanceTrackerRef.current.getTargetDistance(),
              shardsCollected: shardsCollectedRef.current,
              damageTaken: damageTakenRef.current,
            });
          }

          setTimeout(() => {
            onGameOver(score.current);
          }, 50);
          return;
        }
      }



      frameId.current = requestAnimationFrame(loop);
    };

    // Preload active character sprite before starting if possible
    if (activeCharacter?.spriteUrl) {
      SpriteManager.getSprite(activeCharacter.spriteUrl).catch(console.error);
    }

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
    if (restoreRequested && pendingRestore.current && restoreMode?.enabled) {
      // Get all snapshots for rewind animation (last 2 seconds of gameplay)
      const allSnapshots = [...restoreState.current.snapshots];

      if (allSnapshots.length === 0) {
        pendingRestore.current = false;
        return;
      }

      // Store snapshots for rewind playback (will play in reverse)
      restoreSnapshotsForRewind.current = allSnapshots;
      rewindFrameIndex.current = allSnapshots.length - 1; // Start from most recent
      rewindStartTime.current = Date.now();

      const playerX = (canvasRef.current?.width || window.innerWidth) / 8;
      const { newState } = RestoreSystem.executeRestore(
        restoreState.current,
        playerX
      );

      // Update restore state
      restoreState.current = newState;
      pendingRestore.current = false;

      // Notify parent of restore state change - Requirements 2.8
      onRestoreStateUpdate?.(false, true);

      // Start restore animation
      isRestoreAnimating.current = true;

      // VHS-style rewind animation - plays snapshots backwards
      const animateRewind = () => {
        if (!isRestoreAnimating.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const halfHeight = height / 2;
        const snapshots = restoreSnapshotsForRewind.current;

        // 2 second rewind animation - play snapshots backwards smoothly
        const elapsed = Date.now() - rewindStartTime.current;
        const rewindDuration = 1600; // 1.6 seconds rewind animation
        const progress = Math.min(1, elapsed / rewindDuration);

        // Calculate which snapshot to show based on progress
        const currentIndex = Math.max(0, Math.floor((1 - progress) * (snapshots.length - 1)));

        // Get current snapshot to display
        const currentSnapshot = snapshots[currentIndex];
        if (!currentSnapshot) {
          isRestoreAnimating.current = false;
          return;
        }

        // === RENDER NORMAL GAME VIEW WITH REWIND EFFECTS ===

        // Normal game background - top half black, bottom half white (or theme colors)
        ctx.fillStyle = getColor('topBg');
        ctx.fillRect(0, 0, width, halfHeight);
        ctx.fillStyle = getColor('bottomBg');
        ctx.fillRect(0, halfHeight, width, halfHeight);

        // Draw midline
        ctx.strokeStyle = getColor('connector');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, halfHeight);
        ctx.lineTo(width, halfHeight);
        ctx.stroke();

        // Draw obstacles from snapshot (moving RIGHT = rewinding effect)
        const obstacleShift = (1 - progress) * 150; // Obstacles shift right during rewind
        currentSnapshot.obstacles.forEach(obs => {
          const obsColor = obs.polarity === 'white' ? getColor('topOrb') : getColor('bottomOrb');
          ctx.fillStyle = obsColor;
          ctx.fillRect(obs.x + obstacleShift, obs.y, obs.width || INITIAL_CONFIG.obstacleWidth, obs.height || 100);
        });

        // Draw player orbs from snapshot
        const snapshotPlayerY = currentSnapshot.playerY;
        const snapshotIsSwapped = currentSnapshot.isSwapped;
        const orbRadius = INITIAL_CONFIG.orbRadius;
        const snapshotConnectorLength = currentSnapshot.connectorLength || Math.min(
          INITIAL_CONFIG.maxConnectorLength,
          INITIAL_CONFIG.minConnectorLength + (currentSnapshot.score * INITIAL_CONFIG.connectorGrowthRate)
        );
        const halfLen = snapshotConnectorLength / 2;

        const snapshotRotation = snapshotIsSwapped ? Math.PI : 0;
        const yOffset = Math.cos(snapshotRotation) * halfLen;
        const xRotOffset = Math.sin(snapshotRotation) * 15;

        const whiteOrbY = snapshotPlayerY * height - yOffset;
        const whiteOrbX = playerX - xRotOffset;
        const blackOrbY = snapshotPlayerY * height + yOffset;
        const blackOrbX = playerX + xRotOffset;

        // Draw connector with cyan glow
        ctx.strokeStyle = getColor('connector');
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 15 * (1 - progress * 0.5);
        ctx.beginPath();
        ctx.moveTo(whiteOrbX, whiteOrbY);
        ctx.lineTo(blackOrbX, blackOrbY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw orbs with intense rewind glow
        const glowIntensity = 25 * (1 - progress * 0.3);

        // White orb
        ctx.beginPath();
        ctx.arc(whiteOrbX, whiteOrbY, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = getColor('topOrb');
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = glowIntensity;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Black orb
        ctx.beginPath();
        ctx.arc(blackOrbX, blackOrbY, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = getColor('bottomOrb');
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = glowIntensity;
        ctx.fill();
        ctx.shadowBlur = 0;

        // === REWIND OVERLAY EFFECTS ===

        // Semi-transparent cyan overlay for rewind feel
        ctx.fillStyle = `rgba(0, 240, 255, ${0.05 + 0.05 * Math.sin(elapsed * 0.01)})`;
        ctx.fillRect(0, 0, width, height);

        // Horizontal scan lines moving RIGHT (rewind direction)
        const scanLineCount = 5;
        for (let i = 0; i < scanLineCount; i++) {
          const lineY = ((elapsed * 0.3 + i * (height / scanLineCount)) % height);
          ctx.fillStyle = `rgba(0, 240, 255, 0.15)`;
          ctx.fillRect(0, lineY, width, 2);
        }

        // Rewind icon (◀◀) with pulsing effect
        const pulse = 0.7 + Math.sin(elapsed * 0.005) * 0.3;
        ctx.fillStyle = `rgba(0, 240, 255, ${pulse})`;
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 20;
        ctx.fillText('◀◀', width / 2, height / 2 - 40);
        ctx.shadowBlur = 0;

        // "GERİ SARILIYOR" text
        ctx.fillStyle = `rgba(0, 240, 255, 0.9)`;
        ctx.font = 'bold 24px monospace';
        ctx.fillText('GERİ SARILIYOR', width / 2, height / 2 + 10);

        // Time indicator (showing how far back we're going)
        const secondsBack = (progress * 1.6).toFixed(1); // 1.6 second rewind
        ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
        ctx.font = '16px monospace';
        ctx.fillText(`-${secondsBack} sn`, width / 2, height / 2 + 40);

        // Progress bar at bottom
        const barWidth = width * 0.5;
        const barX = (width - barWidth) / 2;
        const barY = height - 50;

        // Bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, 12);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(barX, barY, barWidth, 8);

        // Bar fill (cyan, filling from left to right)
        ctx.fillStyle = '#00F0FF';
        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 10;
        ctx.fillRect(barX, barY, barWidth * progress, 8);
        ctx.shadowBlur = 0;

        // Check if rewind is complete
        if (currentIndex <= 0 || progress >= 1) {
          // Rewind complete - apply final state from first snapshot
          const finalSnapshot = snapshots[0];

          score.current = finalSnapshot.score;
          playerY.current = finalSnapshot.playerY;
          targetPlayerY.current = finalSnapshot.playerY;
          isSwapped.current = finalSnapshot.isSwapped;
          speed.current = finalSnapshot.speed;

          rotationAngle.current = finalSnapshot.isSwapped ? Math.PI : 0;
          targetRotation.current = finalSnapshot.isSwapped ? Math.PI : 0;

          // Reset connector length to minimum
          currentConnectorLength.current = INITIAL_CONFIG.minConnectorLength;

          // Reset midline state to prevent visual glitches
          midlineState.current = createInitialMidlineState(window.innerHeight);

          // Reset phasing state
          isPhasing.current = false;

          // Restore obstacles from final snapshot with correct dimensions
          // Also apply safe zone clearing to prevent immediate collision after restore
          const canvas = canvasRef.current;
          const playerX = canvas ? canvas.width / 8 : 100;
          const safeZoneRadius = 150; // Clear obstacles within 150px of player

          obstacles.current = finalSnapshot.obstacles
            .filter(obs => {
              // Remove obstacles that are too close to player (safe zone)
              const distance = Math.abs(obs.x - playerX);
              return distance > safeZoneRadius;
            })
            .map(obs => ({
              id: obs.id,
              x: obs.x,
              y: obs.y,
              targetY: obs.y,
              width: obs.width || INITIAL_CONFIG.obstacleWidth,
              height: obs.height || 100,
              lane: obs.lane,
              polarity: obs.polarity,
              passed: obs.passed,
              isLatent: obs.type === 'phantom',
              latentOpacity: obs.type === 'phantom' ? 0.3 : 1,
              hasPhased: false,
            }));

          // Clear animation state
          isRestoreAnimating.current = false;
          restoreSnapshotsForRewind.current = [];

          // Restore connector length from snapshot
          if (finalSnapshot.connectorLength) {
            currentConnectorLength.current = finalSnapshot.connectorLength;
          } else {
            const restoredConnectorLength = Math.min(
              INITIAL_CONFIG.maxConnectorLength,
              INITIAL_CONFIG.minConnectorLength + (finalSnapshot.score * INITIAL_CONFIG.connectorGrowthRate)
            );
            currentConnectorLength.current = restoredConnectorLength;
          }

          // Restore spawn rate from snapshot
          if (finalSnapshot.spawnRate) {
            currentSpawnRate.current = finalSnapshot.spawnRate;
          } else {
            const estimatedSpawns = Math.floor(finalSnapshot.score / 10);
            currentSpawnRate.current = Math.max(30, INITIAL_CONFIG.spawnRate - (estimatedSpawns * 0.5));
          }

          // Reset frames since spawn to prevent immediate spawn
          framesSinceSpawn.current = 0;

          // CRITICAL: Reset pattern manager state to prevent duplicate obstacle spawning
          // This fixes the bug where obstacles would overlap after restore
          patternManagerState.current = PatternManager.createPatternManagerState();
          patternStartTime.current = 0;

          // CRITICAL: Reset lastDistanceUpdateTime to prevent huge deltaTime jump
          // This fixes the bug where distance would jump after restore animation
          lastDistanceUpdateTime.current = Date.now();

          // Restore distance from snapshot if available
          if (distanceTrackerRef.current && finalSnapshot.currentDistance !== undefined) {
            distanceTrackerRef.current.setDistance(finalSnapshot.currentDistance);
            // Update distance state ref
            distanceStateRef.current = distanceTrackerRef.current.getState();
            // Notify parent of restored distance
            const activeCampaign = campaignModeRef.current;
            if (activeCampaign?.enabled && activeCampaign.useDistanceMode) {
              activeCampaign.onDistanceUpdate?.(
                distanceStateRef.current.currentDistance,
                distanceStateRef.current.targetDistance,
                distanceStateRef.current.progressPercent
              );
            }
          }

          // Enable post-restore invincibility (1 second)
          postRestoreInvincible.current = true;
          postRestoreStartTime.current = Date.now();

          // Update score display
          onScoreUpdate(score.current);
          setGameSpeedDisplay(speed.current);

          // Notify restore complete
          restoreMode?.onRestoreComplete?.();
        } else {
          // Continue rewind animation
          requestAnimationFrame(animateRewind);
        }
      };

      // Start the rewind animation
      requestAnimationFrame(animateRewind);
    }
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
