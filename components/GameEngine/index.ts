/**
 * GameEngine Module Index
 * 
 * This is the main entry point for the refactored GameEngine.
 * It exports all hooks, render utilities, logic systems, and types.
 * 
 * The original GameEngine.tsx (../GameEngine.tsx) will gradually be refactored
 * to use these extracted modules.
 * 
 * ## Architecture Overview
 * 
 * ```
 * GameEngine/
 * ├── hooks/           # State and input management hooks
 * │   ├── usePlayerState.ts    # Player position, swap, trails
 * │   ├── useGameState.ts      # Score, speed, timing
 * │   ├── useSystemRefs.ts     # All system state refs
 * │   ├── useDesktopInput.ts   # Mouse input handling
 * │   └── useMobileInput.ts    # Touch input handling
 * │
 * ├── render/          # Canvas rendering modules
 * │   ├── BackgroundRenderer.ts # Zones, midline, effects
 * │   ├── EntityRenderer.ts     # Orbs, obstacles, shards
 * │   ├── UIRenderer.ts         # Popups, indicators
 * │   └── ParticleRenderer.ts   # Particle effects
 * │
 * ├── logic/           # Game logic systems
 * │   ├── PhysicsSystem.ts      # Movement, velocity, clamping
 * │   └── CollisionSystem.ts    # Collision detection
 * │
 * ├── types.ts         # Local TypeScript types
 * └── index.ts         # This file
 * ```
 * 
 * @module GameEngine
 */

// =============================================================================
// Hooks
// =============================================================================

export {
    // Input hooks
    useDesktopInput, useGameState, useMobileInput,
    // State hooks
    usePlayerState, useSystemRefs
} from './hooks';

export type {
    UseDesktopInputOptions, UseGameStateReturn, UseMobileInputOptions, UsePlayerStateReturn, UseSystemRefsReturn
} from './hooks';

// =============================================================================
// Render Utilities
// =============================================================================

export {
    drawOrb, getOrbColors, getVisualIntensity,
    // Background
    renderBackground, renderConnector, renderCriticalWarning,
    // Entities
    renderEntities, renderGravityWarning, renderLegacyParticles, renderMidline, renderObstacles, renderOrbTrails, renderOverdriveIndicator,
    // Particles
    renderParticles, renderResonanceIndicator, renderScorePopups, renderShards, renderShieldIndicator, renderSlowMotionIndicator, renderSystemParticles, renderThemeEffects,
    // UI
    renderUI, renderVisualEffects, renderZoneBackgrounds
} from './render';

export type {
    BackgroundRenderContext,
    BackgroundRenderState,
    EntityRenderContext,
    EntityRenderState,
    OrbRenderData, ParticleRenderContext, UIRenderContext
} from './render';

// =============================================================================
// Logic Systems
// =============================================================================

export {
    calculateConnectorLength,
    calculateOrbPositions, calculateVelocity, checkAllCollisions, checkMidlineCollision, checkOrbNearMiss,
    // Collision
    checkOrbObstacleCollision, checkShardCollection, checkZoneViolation, clampPosition, DEFAULT_PHYSICS_CONFIG,
    // Physics
    interpolatePosition,
    interpolateRotation, markShardCollected, removeCollidedObstacle, updatePhysics
} from './logic';

export type {
    CollisionContext,
    CollisionResult,
    NearMissData, PhysicsBounds,
    PhysicsConfig, PlayerPhysicsState
} from './logic';

// =============================================================================
// UI Components
// =============================================================================

export {
    MobileControlsHint
} from './ui';

// =============================================================================
// Local Types
// =============================================================================

export type {
    InputState, JoystickState, OrbData,
    OrbPositionContext, PlayerStateMethods, PlayerStateRefs, TouchControlState
} from './types';

