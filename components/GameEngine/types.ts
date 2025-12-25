/**
 * GameEngine Local Types
 * 
 * Types specific to the GameEngine component and its sub-modules.
 * For global game types, see ../../types.ts
 */

import { LevelConfig } from '../../data/levels';
import { DailyChallengeConfig } from '../../systems/dailyChallenge';
import type { TrailState } from '../../systems/trailingSoul';
import { GameState, MissionEvent } from '../../types';

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

// =============================================================================
// Game Props & Configuration Interfaces
// =============================================================================

// Campaign mode configuration
export interface CampaignModeConfig {
    enabled: boolean;
    levelConfig?: LevelConfig;
    targetScore?: number;
    targetDistance?: number;
    useDistanceMode?: boolean;
    onLevelComplete?: (score: number) => void;
    onDistanceLevelComplete?: (result: {
        distanceTraveled: number;
        shardsCollected: number;
        totalShardsSpawned: number;
        damageTaken: number;
        healthRemaining: number;
    }) => void;
    onDistanceUpdate?: (currentDistance: number, targetDistance: number, progressPercent: number) => void;
    onChapterGameOver?: (result: {
        distanceTraveled: number;
        targetDistance: number;
        shardsCollected: number;
        damageTaken: number;
    }) => void;
}

// Daily Challenge mode configuration
export interface DailyChallengeMode {
    enabled: boolean;
    config?: DailyChallengeConfig;
    onChallengeComplete?: (score: number, echoShardsEarned: number) => void;
}

// Zen Mode configuration
export interface ZenModeConfig {
    enabled: boolean;
    onRespawn?: (respawnCount: number) => void;
}

// Ghost Racer mode configuration
export interface GhostRacerConfig {
    enabled: boolean;
    onNewHighScore?: (finalScore: number) => void;
}

// Restore Mode configuration
export interface RestoreModeConfig {
    enabled: boolean;
    onShowRestorePrompt?: (scoreAtDeath: number, canRestore: boolean) => void;
    onRestoreComplete?: () => void;
}

// Daily Rituals tracking callbacks
export interface RitualTrackingCallbacks {
    onNearMiss?: () => void;
    onPhantomPass?: () => void;
    onScoreAccumulate?: (score: number) => void;
    onSpeedSurvival?: (seconds: number) => void;
    onStreakReached?: (streak: number) => void;
    onNoSwapSurvival?: (seconds: number) => void;
}

export interface GameEngineProps {
    gameState: GameState;
    onScoreUpdate: (score: number) => void;
    onGameOver: (finalScore: number) => void;
    setGameSpeedDisplay: (speed: number) => void;
    onRhythmStateUpdate?: (multiplier: number, streak: number) => void;
    onNearMissStateUpdate?: (streak: number) => void;
    slowMotionActive?: boolean;
    onSlowMotionStateUpdate?: (active: boolean) => void;
    onDashStateUpdate?: (energy: number, active: boolean, remainingPercent?: number) => void;
    onQuantumLockStateUpdate?: (isActive: boolean) => void;
    campaignMode?: CampaignModeConfig;
    dailyChallengeMode?: DailyChallengeMode;
    zenMode?: ZenModeConfig;
    ghostRacerMode?: GhostRacerConfig;
    restoreMode?: RestoreModeConfig;
    restoreRequested?: boolean;
    onRestoreStateUpdate?: (canRestore: boolean, hasBeenUsed: boolean) => void;
    ritualTracking?: RitualTrackingCallbacks;
    onMissionEvent?: (event: MissionEvent) => void;
}
