/**
 * Block System
 * Centralized obstacle/block management for Echo Shift
 * 
 * Handles:
 * - Block spawning (regular and pattern-based)
 * - Block movement and physics
 * - Block rendering with oscillation effects
 * - Block collision detection helpers
 */

import { INITIAL_CONFIG, INVERTER_CONFIG, PHANTOM_CONFIG } from "../constants";
import { Obstacle } from "../types";
import { getFlippedLane } from "../utils/gameMath";
import { shouldSpawnAsInverter } from "../utils/inverterSystem";
import { calculatePhantomOpacity, createPhantomObstacle, getEffectiveOpacity, shouldSpawnAsPhantom } from "../utils/phantomSystem";
import * as ObjectPool from "./objectPool";
import { hasEffect } from "./themeSystem";

// ============================================================================
// Configuration
// ============================================================================

export interface BlockSystemConfig {
  /** Percentage of blocks that should oscillate (0-1) */
  oscillationChance: number;
  /** Minimum oscillation intensity */
  oscillationMinIntensity: number;
  /** Maximum oscillation intensity */
  oscillationMaxIntensity: number;
  /** Base scale for oscillating blocks */
  oscillationBaseScale: number;
  /** Maximum vertical bobbing in pixels */
  oscillationMaxBob: number;
}

export const DEFAULT_BLOCK_CONFIG: BlockSystemConfig = {
  oscillationChance: 0.25,           // %25 blok sallanacak
  oscillationMinIntensity: 0.7,      // Minimum yoğunluk
  oscillationMaxIntensity: 0.9,      // Maksimum yoğunluk
  oscillationBaseScale: 1.0,         // Scale değişimi yok (sadece dikey hareket)
  oscillationMaxBob: 18,             // 18px dikey hareket
};

// ============================================================================
// Block State
// ============================================================================

export interface BlockSystemState {
  /** Last spawned block polarity for alternation */
  lastSpawnedPolarity: "white" | "black" | null;
  /** Gap center Y position */
  lastGapCenter: number;
  /** Half gap size */
  lastHalfGap: number;
  /** Pattern polarity for mobile readability */
  patternPolarity: "white" | "black";
  /** Shard spawn sequence counter */
  shardSpawnSequence: number;
  /** Same color streak counter */
  sameColorStreak: number;
  /** Counter of pairs spawned since last Phantom pair */
  pairsSinceLastPhantom: number;
  /** Counter of pairs spawned since last Inverter pair */
  pairsSinceLastInverter: number;
}

export function createBlockSystemState(): BlockSystemState {
  return {
    lastSpawnedPolarity: null,
    lastGapCenter: 0,
    lastHalfGap: 0,
    patternPolarity: "white",
    shardSpawnSequence: 0,
    sameColorStreak: 0,
    pairsSinceLastPhantom: 99,
    pairsSinceLastInverter: 99,
  };
}

/**
 * Resets an obstacle object to clean baseline state.
 * Prevents recycled pool items from leaking wasHit, hitTime, or ghost flags across runs or spawns.
 */
export function resetObstacleState(obs: Obstacle): void {
  obs.passed = false;
  obs.nearMissChecked = false;
  obs.hasPhased = false;
  obs.minClearance = Infinity;
  obs.passTime = undefined;
  obs.wasHit = false;
  obs.hitTime = undefined;
  obs.isLatent = false;
  obs.revealDistance = undefined;
  obs.initialX = undefined;
  obs.shouldOscillate = false;
  obs.oscillationIntensity = 0;
  obs.oscillationPhase = 0;
  obs.isInverting = false;
  obs.hasInverted = false;
  obs.invertX = undefined;
  obs.invertTime = undefined;
}

// ============================================================================
// Oscillation Helpers
// ============================================================================

/**
 * Generate oscillation properties for a new block
 */
export function generateOscillationProps(
  rng: () => number,
  config: BlockSystemConfig = DEFAULT_BLOCK_CONFIG
): {
  shouldOscillate: boolean;
  oscillationIntensity: number;
  oscillationPhase: number;
} {
  const shouldOscillate = rng() < config.oscillationChance;
  const intensityRange = config.oscillationMaxIntensity - config.oscillationMinIntensity;

  return {
    shouldOscillate,
    oscillationIntensity: shouldOscillate
      ? config.oscillationMinIntensity + rng() * intensityRange
      : 0,
    oscillationPhase: rng() * Math.PI * 2,
  };
}

// PERF: Pre-allocated result object for oscillation transform
const _oscResult = { scale: 1.0, verticalOffset: 0 };

/**
 * Calculate oscillation transform for rendering
 * Creates a smooth, flowing vertical motion for oscillating blocks
 * BPM-synced: cycle duration = 60000/bpm ms (one full beat)
 * PERF: Returns pre-allocated object - do NOT store reference
 */
export function calculateOscillationTransform(
  obs: Obstacle,
  currentTime: number,
  bpm: number,
  config: BlockSystemConfig = DEFAULT_BLOCK_CONFIG
): {
  scale: number;
  verticalOffset: number;
} {
  if (!obs.shouldOscillate || !obs.oscillationIntensity) {
    _oscResult.scale = 1.0;
    _oscResult.verticalOffset = 0;
    return _oscResult;
  }

  const phase = obs.oscillationPhase || 0;
  const intensity = obs.oscillationIntensity;

  // No scale change - only vertical movement
  const scale = config.oscillationBaseScale;

  // BPM-synced vertical bobbing: one full cycle per beat
  // Falls back to 900ms when bpm is 0 or invalid
  const bobCycleDuration = bpm > 0 ? 60000 / bpm : 900;
  const bobPhase = ((currentTime % bobCycleDuration) / bobCycleDuration) * Math.PI * 2 + phase;

  // Pure sine wave for smooth, continuous motion
  const rawBob = Math.sin(bobPhase);
  const verticalOffset = rawBob * config.oscillationMaxBob * intensity;

  _oscResult.scale = scale;
  _oscResult.verticalOffset = verticalOffset;
  return _oscResult;
}

// ============================================================================
// Block Spawning
// ============================================================================

export interface SpawnContext {
  canvasHeight: number;
  canvasWidth: number;
  score: number;
  connectorLength: number;
  isGravityFlipped: boolean;
  isDashing: boolean;
  dashXOffset: number;
  phantomEnabled: boolean;
  inverterEnabled?: boolean;
  currentLevelId?: number;
  forcePhantom: boolean;
  rng: () => number;
}

/**
 * Spawn a pair of obstacles (top and bottom)
 */
export function spawnObstaclePair(
  ctx: SpawnContext,
  config: BlockSystemConfig = DEFAULT_BLOCK_CONFIG
): Obstacle[] {
  const obsWidth = INITIAL_CONFIG.obstacleWidth;
  const playerBaseX = ctx.canvasWidth / 8;
  const spawnX = ctx.isDashing
    ? playerBaseX + ctx.dashXOffset + 150 + ctx.rng() * 200
    : ctx.canvasWidth + 50;

  const midY = ctx.canvasHeight / 2;
  const orbRadius = INITIAL_CONFIG.orbRadius;

  // Minimum gap = connector + 2 orbs + safety margin
  const minGap = ctx.connectorLength + orbRadius * 2 + 45;

  // Random polarity - top and bottom are opposite colors
  const topPolarity: "white" | "black" = ctx.rng() > 0.5 ? "white" : "black";
  const bottomPolarity: "white" | "black" = topPolarity === "white" ? "black" : "white";

  // Calculate crossing distance
  const maxCrossDistance = ctx.connectorLength - orbRadius;
  const difficultyFactor = Math.min(1, ctx.score / 3000);
  const minCross = 0.15 + difficultyFactor * 0.15;
  const maxCross = 0.45 + difficultyFactor * 0.25;
  const crossAmount = minCross + ctx.rng() * (maxCross - minCross);
  const actualCross = crossAmount * maxCrossDistance;

  // Random direction
  const crossFromTop = ctx.rng() > 0.5;

  let topBlockHeight: number;
  let bottomBlockTop: number;
  let bottomBlockHeight: number;

  if (crossFromTop) {
    topBlockHeight = midY + actualCross;
    bottomBlockTop = topBlockHeight + minGap;
    bottomBlockHeight = Math.max(30, ctx.canvasHeight - bottomBlockTop);
  } else {
    bottomBlockTop = midY - actualCross;
    bottomBlockHeight = ctx.canvasHeight - bottomBlockTop;
    topBlockHeight = Math.max(30, bottomBlockTop - minGap);
  }

  // Safety bounds
  topBlockHeight = Math.max(30, topBlockHeight);
  bottomBlockTop = Math.min(ctx.canvasHeight - 30, Math.max(30, bottomBlockTop));
  bottomBlockHeight = Math.max(30, ctx.canvasHeight - bottomBlockTop);

  // Lane inversion for gravity flip
  const topLane: "top" | "bottom" = ctx.isGravityFlipped ? getFlippedLane("top") : "top";
  const bottomLane: "top" | "bottom" = ctx.isGravityFlipped ? getFlippedLane("bottom") : "bottom";

  // Generate oscillation properties
  const topOscillation = generateOscillationProps(ctx.rng, config);
  const bottomOscillation = generateOscillationProps(ctx.rng, config);

  let topObstacle: Obstacle = {
    id: Math.random().toString(36).substring(2, 11),
    x: spawnX,
    y: ctx.isDashing ? 0 : -topBlockHeight,
    targetY: 0,
    width: obsWidth,
    height: topBlockHeight,
    lane: topLane,
    polarity: topPolarity,
    passed: false,
    minClearance: Infinity,
    passTime: undefined,
    ...topOscillation,
  };
  resetObstacleState(topObstacle);
  topObstacle.shouldOscillate = topOscillation.shouldOscillate;
  topObstacle.oscillationIntensity = topOscillation.oscillationIntensity;
  topObstacle.oscillationPhase = topOscillation.oscillationPhase;

  let bottomObstacle: Obstacle = {
    id: Math.random().toString(36).substring(2, 11),
    x: spawnX,
    y: ctx.isDashing ? bottomBlockTop : ctx.canvasHeight,
    targetY: bottomBlockTop,
    width: obsWidth,
    height: bottomBlockHeight,
    lane: bottomLane,
    polarity: bottomPolarity,
    passed: false,
    minClearance: Infinity,
    passTime: undefined,
    ...bottomOscillation,
  };
  resetObstacleState(bottomObstacle);
  bottomObstacle.shouldOscillate = bottomOscillation.shouldOscillate;
  bottomObstacle.oscillationIntensity = bottomOscillation.oscillationIntensity;
  bottomObstacle.oscillationPhase = bottomOscillation.oscillationPhase;

  // ── SPECIAL FEATURE SELECTION (MUTUALLY EXCLUSIVE + ANTI-STREAK COOLDOWN) ──
  // Rule 1: A block pair can NEVER have both Phantom and Inverter. It is AT MOST one special feature.
  // Rule 2: Special features CANNOT spawn back-to-back in consecutive pairs (at least 2 normal pairs between spawns).

  if (!ctx.state) {
    ctx.state = createBlockSystemState();
  }
  if (ctx.state.pairsSinceLastPhantom === undefined) ctx.state.pairsSinceLastPhantom = 99;
  if (ctx.state.pairsSinceLastInverter === undefined) ctx.state.pairsSinceLastInverter = 99;

  const canSpawnPhantom = !ctx.isDashing && ctx.state.pairsSinceLastPhantom >= 2;
  const canSpawnInverter = !ctx.isDashing && ctx.state.pairsSinceLastInverter >= 2;

  let isPhantomPair = false;
  let isInverterPair = false;

  // 1. Try Phantom (if allowed & probability rolls true)
  if (canSpawnPhantom && (ctx.forcePhantom || (ctx.phantomEnabled && shouldSpawnAsPhantom(ctx.score, PHANTOM_CONFIG)))) {
    isPhantomPair = true;
    ctx.state.pairsSinceLastPhantom = 0;
    ctx.state.pairsSinceLastInverter++;
  }
  // 2. Try Inverter ONLY IF NOT PHANTOM (mutually exclusive) and unlocked & allowed
  else {
    ctx.state.pairsSinceLastPhantom++;
    const isInverterUnlocked = (ctx.score >= 500) && (ctx.inverterEnabled ?? (ctx.currentLevelId === undefined || ctx.currentLevelId > 3));
    
    if (canSpawnInverter && isInverterUnlocked && shouldSpawnAsInverter(ctx.score, false, ctx.rng)) {
      isInverterPair = true;
      ctx.state.pairsSinceLastInverter = 0;
    } else {
      ctx.state.pairsSinceLastInverter++;
    }
  }

  // Apply Phantom to pair
  if (isPhantomPair) {
    topObstacle.isLatent = true;
    topObstacle.revealDistance = PHANTOM_CONFIG.revealDistance;
    topObstacle.initialX = spawnX;

    bottomObstacle.isLatent = true;
    bottomObstacle.revealDistance = PHANTOM_CONFIG.revealDistance;
    bottomObstacle.initialX = spawnX;
  }
  // Apply Inverter to pair (ONLY IF NOT PHANTOM)
  else if (isInverterPair) {
    const responsiveInvertX = Math.round(ctx.canvasWidth * 0.70);
    topObstacle.isInverting = true;
    topObstacle.hasInverted = false;
    topObstacle.invertX = responsiveInvertX;

    bottomObstacle.isInverting = true;
    bottomObstacle.hasInverted = false;
    bottomObstacle.invertX = responsiveInvertX;
  }

  return [topObstacle, bottomObstacle];
}

// ============================================================================
// Pattern-Based Spawning
// ============================================================================

export interface PatternSpawnContext extends SpawnContext {
  obstaclePool: ObjectPool.ObjectPool<ObjectPool.PooledEngineObstacle>;
  state: BlockSystemState;
}

/**
 * Spawn obstacle pair based on pattern - returns array of obstacles
 * Uses object pooling for better performance
 */
export function spawnPatternObstaclePair(
  ctx: PatternSpawnContext,
  config: BlockSystemConfig = DEFAULT_BLOCK_CONFIG
): Obstacle[] {
  const obsWidth = INITIAL_CONFIG.obstacleWidth;
  const playerBaseX = ctx.canvasWidth / 8;
  const spawnX = ctx.canvasWidth + 50;

  const midY = ctx.canvasHeight / 2;
  const orbRadius = INITIAL_CONFIG.orbRadius;
  // Pattern-based uses slightly different gap calculation
  const minGap = ctx.connectorLength + orbRadius * 2 + 35;
  const maxCrossing = ctx.connectorLength / 2 - orbRadius + 8;

  // Determine polarity with streak prevention (max 3 same color in a row)
  let topPolarity: "white" | "black";
  if (ctx.state.lastSpawnedPolarity === null) {
    topPolarity = ctx.rng() > 0.5 ? "white" : "black";
    ctx.state.sameColorStreak = 1;
  } else {
    if (ctx.state.sameColorStreak >= 3) {
      topPolarity = ctx.state.lastSpawnedPolarity === "white" ? "black" : "white";
      ctx.state.sameColorStreak = 1;
    } else {
      topPolarity = ctx.rng() > 0.5 ? "white" : "black";
      if (topPolarity === ctx.state.lastSpawnedPolarity) {
        ctx.state.sameColorStreak++;
      } else {
        ctx.state.sameColorStreak = 1;
      }
    }
  }
  ctx.state.lastSpawnedPolarity = topPolarity;
  const bottomPolarity: "white" | "black" = topPolarity === "white" ? "black" : "white";

  // Random gap type:
  // 0: Bottom block crosses midline up (37.5%)
  // 1: Top block crosses midline down (37.5%)
  // 2: Neither crosses midline (25%)
  const rand = ctx.rng();
  const gapType = rand < 0.375 ? 0 : rand < 0.75 ? 1 : 2;

  let topBlockHeight: number;
  let bottomBlockTop: number;

  if (gapType === 0) {
    const crossAmount = 0.3 * maxCrossing + ctx.rng() * 0.7 * maxCrossing;
    bottomBlockTop = midY - crossAmount;
    topBlockHeight = bottomBlockTop - minGap;
  } else if (gapType === 1) {
    const crossAmount = 0.3 * maxCrossing + ctx.rng() * 0.7 * maxCrossing;
    topBlockHeight = midY + crossAmount;
    bottomBlockTop = topBlockHeight + minGap;
  } else {
    const offset = (ctx.rng() - 0.5) * 60;
    topBlockHeight = midY - minGap / 2 + offset - 10;
    bottomBlockTop = midY + minGap / 2 + offset + 10;
  }

  // Bounds check
  if (topBlockHeight < 15) {
    topBlockHeight = 15;
    bottomBlockTop = topBlockHeight + minGap;
  }
  if (bottomBlockTop > ctx.canvasHeight - 15) {
    bottomBlockTop = ctx.canvasHeight - 15;
    topBlockHeight = bottomBlockTop - minGap;
  }

  // Update state for shard spawning
  ctx.state.lastGapCenter = (topBlockHeight + bottomBlockTop) / 2;
  ctx.state.lastHalfGap = (bottomBlockTop - topBlockHeight) / 2;

  const responsiveInvertX = Math.round(ctx.canvasWidth * 0.70);
  const results: Obstacle[] = [];

  // Top block
  if (topBlockHeight > 15) {
    const topPooled = ctx.obstaclePool.acquire();
    resetObstacleState(topPooled);

    const topOscillation = generateOscillationProps(ctx.rng, config);
    topPooled.x = spawnX;
    topPooled.y = ctx.isDashing ? 0 : -topBlockHeight;
    topPooled.targetY = 0;
    topPooled.width = obsWidth;
    topPooled.height = topBlockHeight;
    topPooled.lane = ctx.isGravityFlipped ? "bottom" : "top";
    topPooled.polarity = topPolarity;
    topPooled.initialX = spawnX;
    topPooled.shouldOscillate = topOscillation.shouldOscillate;
    topPooled.oscillationIntensity = topOscillation.oscillationIntensity;
    topPooled.oscillationPhase = topOscillation.oscillationPhase;
    results.push(topPooled);
  }

  // Bottom block
  const bottomBlockHeight = ctx.canvasHeight - bottomBlockTop;
  if (bottomBlockHeight > 15) {
    const bottomPooled = ctx.obstaclePool.acquire();
    resetObstacleState(bottomPooled);

    const bottomOscillation = generateOscillationProps(ctx.rng, config);
    bottomPooled.x = spawnX;
    bottomPooled.y = ctx.isDashing ? bottomBlockTop : ctx.canvasHeight;
    bottomPooled.targetY = bottomBlockTop;
    bottomPooled.width = obsWidth;
    bottomPooled.height = bottomBlockHeight;
    bottomPooled.lane = ctx.isGravityFlipped ? "top" : "bottom";
    bottomPooled.polarity = bottomPolarity;
    bottomPooled.initialX = spawnX;
    bottomPooled.shouldOscillate = bottomOscillation.shouldOscillate;
    bottomPooled.oscillationIntensity = bottomOscillation.oscillationIntensity;
    bottomPooled.oscillationPhase = bottomOscillation.oscillationPhase;
    results.push(bottomPooled);
  }

  // ── SPECIAL FEATURE SELECTION (MUTUALLY EXCLUSIVE + ANTI-STREAK COOLDOWN) ──
  if (!ctx.state) {
    ctx.state = createBlockSystemState();
  }
  if (ctx.state.pairsSinceLastPhantom === undefined) ctx.state.pairsSinceLastPhantom = 99;
  if (ctx.state.pairsSinceLastInverter === undefined) ctx.state.pairsSinceLastInverter = 99;

  const canSpawnPhantom = !ctx.isDashing && ctx.state.pairsSinceLastPhantom >= 2;
  const canSpawnInverter = !ctx.isDashing && ctx.state.pairsSinceLastInverter >= 2;

  let isPhantomPair = false;
  let isInverterPair = false;

  if (canSpawnPhantom && (ctx.forcePhantom || (ctx.phantomEnabled && shouldSpawnAsPhantom(ctx.score, PHANTOM_CONFIG)))) {
    isPhantomPair = true;
    ctx.state.pairsSinceLastPhantom = 0;
    ctx.state.pairsSinceLastInverter++;
  } else {
    ctx.state.pairsSinceLastPhantom++;
    const isInverterUnlocked = (ctx.score >= 500) && (ctx.inverterEnabled ?? (ctx.currentLevelId === undefined || ctx.currentLevelId > 3));
    
    if (canSpawnInverter && isInverterUnlocked && shouldSpawnAsInverter(ctx.score, false, ctx.rng)) {
      isInverterPair = true;
      ctx.state.pairsSinceLastInverter = 0;
    } else {
      ctx.state.pairsSinceLastInverter++;
    }
  }

  // Apply Phantom or Inverter exclusively to the pattern pair
  if (isPhantomPair) {
    for (const obs of results) {
      obs.isLatent = true;
      obs.revealDistance = PHANTOM_CONFIG.revealDistance;
      obs.initialX = spawnX;
    }
  } else if (isInverterPair) {
    const responsiveInvertX = Math.round(ctx.canvasWidth * 0.70);
    for (const obs of results) {
      obs.isInverting = true;
      obs.hasInverted = false;
      obs.invertX = responsiveInvertX;
    }
  }

  return results;
}

// ============================================================================
// Block Movement
// ============================================================================

/**
 * Update block positions - PERF: for-loop instead of forEach
 */
export function updateBlockPositions(
  obstacles: Obstacle[],
  speed: number,
  slowMotionMultiplier: number,
  constructSpeedMultiplier: number,
  dashSpeedMultiplier: number
): void {
  const combinedSpeed = speed * slowMotionMultiplier * constructSpeedMultiplier * dashSpeedMultiplier;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    // Horizontal movement
    obs.x -= combinedSpeed;

    // Vertical animation (entry)
    if (Math.abs(obs.y - obs.targetY) > 0.5) {
      obs.y += (obs.targetY - obs.y) * 0.05;
    } else {
      obs.y = obs.targetY;
    }
  }
}

/**
 * Filter out off-screen blocks - PERF: In-place compaction, no new array
 */
export function filterOffscreenBlocks(
  obstacles: Obstacle[],
  pool?: ObjectPool.ObjectPool<ObjectPool.PooledEngineObstacle>
): Obstacle[] {
  let writeIdx = 0;
  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    const keep = obs.x + obs.width > -100;
    if (keep) {
      if (writeIdx !== i) {
        obstacles[writeIdx] = obs;
      }
      writeIdx++;
    } else if (pool) {
      pool.release(obs as ObjectPool.PooledEngineObstacle);
    }
  }
  obstacles.length = writeIdx;
  return obstacles;
}

// ============================================================================
// Block Rendering
// ============================================================================

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  currentTime: number;
  bpm: number;
  whiteObstacleColor: string;
  blackObstacleColor: string;
}

/**
 * Render a single block with all effects
 */
export function renderBlock(
  obs: Obstacle,
  renderCtx: RenderContext,
  config: BlockSystemConfig = DEFAULT_BLOCK_CONFIG
): void {
  const { ctx, currentTime, bpm, whiteObstacleColor, blackObstacleColor } = renderCtx;

  const isWhitePolarity = obs.polarity === "white";
  const obstacleColor = isWhitePolarity ? whiteObstacleColor : blackObstacleColor;
  const oppositeColor = isWhitePolarity ? blackObstacleColor : whiteObstacleColor;

  // Calculate phantom opacity
  let obstacleOpacity = 1.0;
  if (obs.isLatent && obs.initialX !== undefined && obs.revealDistance !== undefined) {
    const calculatedOpacity = calculatePhantomOpacity(obs.x, obs.initialX, obs.revealDistance);
    obstacleOpacity = getEffectiveOpacity(calculatedOpacity, PHANTOM_CONFIG.minOpacity);
  }

  ctx.globalAlpha = obstacleOpacity;

  // Calculate oscillation transform
  const { scale, verticalOffset } = calculateOscillationTransform(obs, currentTime, bpm, config);

  // Apply vertical offset directly to Y position for oscillating blocks
  const drawY = obs.y + verticalOffset;

  // Apply scale transform centered on block
  const obsCenterX = obs.x + obs.width / 2;
  const obsCenterY = drawY + obs.height / 2;
  ctx.save();
  ctx.translate(obsCenterX, obsCenterY);
  ctx.scale(scale, scale);
  ctx.translate(-obsCenterX, -obsCenterY);

  // Draw block body at offset Y position
  ctx.fillStyle = obstacleColor;
  ctx.fillRect(obs.x, drawY, obs.width, obs.height);

  // Draw border
  ctx.lineWidth = 2;
  ctx.strokeStyle = oppositeColor;
  ctx.strokeRect(obs.x, drawY, obs.width, obs.height);

  // Theme effects - glowing edges
  if (hasEffect("glowEdges")) {
    ctx.shadowColor = obstacleColor;
    ctx.shadowBlur = 10;
    ctx.strokeRect(obs.x, drawY, obs.width, obs.height);
    ctx.shadowBlur = 0;
  }

  // Theme effects - pixelated edges
  if (hasEffect("pixelated")) {
    const pixelSize = 4;
    ctx.fillStyle = oppositeColor;
    ctx.fillRect(obs.x, drawY, pixelSize, pixelSize);
    ctx.fillRect(obs.x + obs.width - pixelSize, drawY, pixelSize, pixelSize);
    ctx.fillRect(obs.x, drawY + obs.height - pixelSize, pixelSize, pixelSize);
    ctx.fillRect(obs.x + obs.width - pixelSize, drawY + obs.height - pixelSize, pixelSize, pixelSize);
  }

  // Phantom sci-fi ghost outline & digital scanlines
  if (obs.isLatent) {
    const pulse = Math.sin(currentTime * 0.006 + (obs.x * 0.04)) * 0.25 + 0.75;
    ctx.globalAlpha = Math.min(1.0, Math.max(0.2, (1 - obstacleOpacity) * 0.8 * pulse));
    
    // Cyber-neon dashed outline
    ctx.strokeStyle = isWhitePolarity ? '#00F0FF' : '#FF00FF';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(obs.x - 1, drawY - 1, obs.width + 2, obs.height + 2);
    ctx.setLineDash([]);

    // Subtle horizontal digital scanlines across block body
    ctx.fillStyle = isWhitePolarity ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 0, 255, 0.25)';
    const scanlineSpacing = 10;
    const startY = Math.floor(drawY);
    const endY = Math.floor(drawY + obs.height);
    for (let sy = startY + 4; sy < endY - 4; sy += scanlineSpacing) {
      ctx.fillRect(obs.x + 2, sy, obs.width - 4, 1.5);
    }
  }

  // High-End Cyberpunk Inverter Warning & Quantum Flip VFX
  if (obs.isInverting) {
    const targetInvertX = obs.invertX ?? INVERTER_CONFIG.invertDistance;
    const warningX = targetInvertX + INVERTER_CONFIG.warningDistance;
    
    // ── PHASE 1: PRE-INVERSION QUANTUM WARNING (Rapid Cybernetic Gauge & Electric Arcs) ──
    if (!obs.hasInverted && obs.x <= warningX && obs.x > targetInvertX) {
      const warnPulse = Math.sin(currentTime * 0.05) * 0.5 + 0.5;
      const primaryGlow = isWhitePolarity ? '#00F0FF' : '#FF00FF';

      // 1. Dual-Tone Cyberpunk Plasma Shield Border
      ctx.save();
      ctx.strokeStyle = `rgba(255, 0, 85, ${0.6 + warnPulse * 0.4})`;
      ctx.lineWidth = 3.5 + warnPulse * 1.5;
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 14 + warnPulse * 10;
      ctx.strokeRect(obs.x - 3, drawY - 3, obs.width + 6, obs.height + 6);

      // 2. Corner Electric Plasma Arc Brackets
      ctx.strokeStyle = primaryGlow;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = primaryGlow;
      ctx.shadowBlur = 10;

      const cSize = 9;
      // Top-Left Bracket
      ctx.beginPath();
      ctx.moveTo(obs.x - 5, drawY + cSize);
      ctx.lineTo(obs.x - 5, drawY - 5);
      ctx.lineTo(obs.x + cSize, drawY - 5);
      ctx.stroke();

      // Bottom-Right Bracket
      ctx.beginPath();
      ctx.moveTo(obs.x + obs.width + 5, drawY + obs.height - cSize);
      ctx.lineTo(obs.x + obs.width + 5, drawY + obs.height + 5);
      ctx.lineTo(obs.x + obs.width - cSize, drawY + obs.height + 5);
      ctx.stroke();

      // 3. Fast-Rotating Cybernetic Gauge with Polarity Swap Emblem
      const gaugeY = drawY + (obs.height > 80 ? 30 : obs.height / 2);
      const rot = currentTime * 0.016; // Fast, energetic rotation

      // Outer Spinning Segmented Ring
      ctx.save();
      ctx.translate(obsCenterX, gaugeY);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 1.5);
      ctx.strokeStyle = 'rgba(255, 0, 85, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      // Inner Counter-Rotating Dashed Ring
      ctx.save();
      ctx.translate(obsCenterX, gaugeY);
      ctx.rotate(-rot * 1.8);
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = primaryGlow;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Center Glowing Polarity Swap Icon (⇄)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 13px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = primaryGlow;
      ctx.shadowBlur = 12;
      ctx.fillText('⇄', obsCenterX, gaugeY + 0.5);

      ctx.restore();
    }
    // ── PHASE 2: POST-INVERSION QUANTUM IMPACT (Ultra-Fast 150ms Crisp Shockwaves) ──
    else if (obs.hasInverted && obs.invertTime) {
      const elapsed = currentTime - obs.invertTime;
      const duration = 150; // Ultra-fast 150ms instant flash

      if (elapsed < duration) {
        const progress = elapsed / duration;
        const alpha = 1 - progress;

        ctx.save();

        // 1. Concentric Expanding Quantum Shockwave Rings
        const maxRadius = Math.max(obs.width, obs.height) * 0.75;
        const ringRadius = progress * maxRadius;

        ctx.beginPath();
        ctx.arc(obsCenterX, obsCenterY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isWhitePolarity ? `rgba(0, 240, 255, ${alpha * 0.95})` : `rgba(255, 0, 255, ${alpha * 0.95})`;
        ctx.lineWidth = 3.5 * alpha;
        ctx.shadowColor = isWhitePolarity ? '#00F0FF' : '#FF00FF';
        ctx.shadowBlur = 16 * alpha;
        ctx.stroke();

        // Outer Wavefront Edge
        if (progress > 0.12) {
          const outerR = (progress - 0.12) * maxRadius * 1.25;
          ctx.beginPath();
          ctx.arc(obsCenterX, obsCenterY, outerR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // 2. Chromatic Glitch Aberration Offset Borders
        const glitchOff = alpha * 5;

        // Cyan Offset
        ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(obs.x - glitchOff, drawY - glitchOff, obs.width + glitchOff * 2, obs.height + glitchOff * 2);

        // Magenta Offset
        ctx.strokeStyle = `rgba(255, 0, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(obs.x + glitchOff, drawY + glitchOff, obs.width - glitchOff * 2, obs.height - glitchOff * 2);

        // Core White Flare Overlay
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.35})`;
        ctx.fillRect(obs.x, drawY, obs.width, obs.height);

        ctx.restore();
      }
    }
  }

  // Collision Hit / Failure feedback (RED impact flash when player hits block)
  if (obs.wasHit && obs.hitTime !== undefined) {
    const elapsed = currentTime - obs.hitTime;
    const duration = 450; // 450ms red flash duration
    if (elapsed < duration) {
      const hitProgress = elapsed / duration;
      const alpha = 1 - hitProgress;

      // Draw flashing RED border
      ctx.strokeStyle = `rgba(255, 42, 42, ${alpha * 0.95})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = '#FF2A2A';
      ctx.shadowBlur = 10;
      ctx.strokeRect(obs.x, drawY, obs.width, obs.height);
      ctx.shadowBlur = 0;

      // Draw red diagonal impact sweep
      const shineX = obs.x - 40 + hitProgress * (obs.width + 80);
      ctx.save();
      ctx.beginPath();
      ctx.rect(obs.x, drawY, obs.width, obs.height);
      ctx.clip();

      const grad = ctx.createLinearGradient(shineX, drawY, shineX + 30, drawY + obs.height);
      grad.addColorStop(0, 'rgba(255, 42, 42, 0)');
      grad.addColorStop(0.5, `rgba(255, 42, 42, ${alpha * 0.9})`);
      grad.addColorStop(1, 'rgba(255, 42, 42, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(obs.x, drawY, obs.width, obs.height);
      ctx.restore();
    }
  }
  // Successful passage shine/glow sweep feedback (ONLY if NOT hit!)
  else if (obs.passed && !obs.wasHit && obs.passTime !== undefined) {
    const elapsed = currentTime - obs.passTime;
    const duration = 400; // 400ms flash duration
    if (elapsed < duration) {
      const passProgress = elapsed / duration;
      const alpha = 1 - passProgress;

      // Draw flashing neon border
      ctx.strokeStyle = isWhitePolarity ? `rgba(0, 240, 255, ${alpha * 0.95})` : `rgba(255, 0, 255, ${alpha * 0.95})`;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = isWhitePolarity ? '#00F0FF' : '#FF00FF';
      ctx.shadowBlur = 8;
      ctx.strokeRect(obs.x, drawY, obs.width, obs.height);
      ctx.shadowBlur = 0; // reset shadowBlur immediately

      // Draw linear gradient diagonal shine sweep
      const shineX = obs.x - 40 + passProgress * (obs.width + 80);
      ctx.save();
      // Clip shine within the block bounds
      ctx.beginPath();
      ctx.rect(obs.x, drawY, obs.width, obs.height);
      ctx.clip();

      const grad = ctx.createLinearGradient(shineX, drawY, shineX + 30, drawY + obs.height);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.8})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(obs.x, drawY, obs.width, obs.height);
      ctx.restore();
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1.0;
}

/**
 * Render all blocks with synchronized pair inverter laser conduits
 */
export function renderAllBlocks(
  obstacles: Obstacle[],
  renderCtx: RenderContext,
  config: BlockSystemConfig = DEFAULT_BLOCK_CONFIG
): void {
  const { ctx, currentTime } = renderCtx;

  // 1. Render individual blocks
  for (let i = 0; i < obstacles.length; i++) {
    renderBlock(obstacles[i], renderCtx, config);
  }

  // 2. Render Pair Energy Crossover Conduit between matching inverting top & bottom pairs
  for (let i = 0; i < obstacles.length; i++) {
    const obsA = obstacles[i];
    if (!obsA.isInverting) continue;

    for (let j = i + 1; j < obstacles.length; j++) {
      const obsB = obstacles[j];
      if (!obsB.isInverting || Math.abs(obsA.x - obsB.x) > 30) continue;

      // Found matching inverting pair!
      const topObs = obsA.y < obsB.y ? obsA : obsB;
      const bottomObs = obsA.y < obsB.y ? obsB : obsA;

      const topBottomY = topObs.y + topObs.height;
      const bottomTopY = bottomObs.y;
      const midGapX = topObs.x + topObs.width / 2;

      const targetInvertX = topObs.invertX ?? INVERTER_CONFIG.invertDistance;
      const warningX = targetInvertX + INVERTER_CONFIG.warningDistance;

      // ── WARNING CONDUIT (Electric Plasma Arc Conduit Across Gap) ──
      if (!topObs.hasInverted && topObs.x <= warningX && topObs.x > targetInvertX) {
        const warnPulse = Math.sin(currentTime * 0.035) * 0.5 + 0.5;
        const beamAlpha = 0.6 + warnPulse * 0.4;

        ctx.save();
        ctx.shadowColor = '#FF0055';
        ctx.shadowBlur = 15;

        // Central Vertical Plasma Laser Core
        ctx.strokeStyle = `rgba(255, 0, 85, ${beamAlpha})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(midGapX, topBottomY);
        ctx.lineTo(midGapX, bottomTopY);
        ctx.stroke();

        // Electric Plasma Jitter Line (Cracking energy stream)
        const jitter = (Math.random() - 0.5) * 10;
        ctx.strokeStyle = `rgba(0, 240, 255, ${beamAlpha * 0.85})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(midGapX, topBottomY);
        ctx.lineTo(midGapX + jitter, (topBottomY + bottomTopY) / 2);
        ctx.lineTo(midGapX, bottomTopY);
        ctx.stroke();

        // Pulsing Energy Junction Core at Gap Center
        const gapCenterY = (topBottomY + bottomTopY) / 2;
        ctx.beginPath();
        ctx.arc(midGapX, gapCenterY, 7 + warnPulse * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 85, ${beamAlpha * 0.8})`;
        ctx.fill();

        ctx.restore();
      }
      // ── FLIP IMPACT CONDUIT (Ultra-Fast 150ms X-Shape Energy Crossover Laser Stream) ──
      else if (topObs.hasInverted && topObs.invertTime) {
        const elapsed = currentTime - topObs.invertTime;
        const duration = 150; // Ultra-fast 150ms laser crossover snap
        if (elapsed < duration) {
          const alpha = 1 - (elapsed / duration);

          ctx.save();

          // 1. Diagonal X-Crossover Energy Laser Beams (Explicit Swapping Streams!)
          ctx.lineWidth = 4 * alpha;
          ctx.shadowBlur = 20 * alpha;

          // Stream 1: Top-Left to Bottom-Right (Cyan Plasma Stream)
          ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.95})`;
          ctx.shadowColor = '#00F0FF';
          ctx.beginPath();
          ctx.moveTo(topObs.x, topBottomY);
          ctx.lineTo(topObs.x + topObs.width, bottomTopY);
          ctx.stroke();

          // Stream 2: Top-Right to Bottom-Left (Magenta Plasma Stream)
          ctx.strokeStyle = `rgba(255, 0, 255, ${alpha * 0.95})`;
          ctx.shadowColor = '#FF00FF';
          ctx.beginPath();
          ctx.moveTo(topObs.x + topObs.width, topBottomY);
          ctx.lineTo(topObs.x, bottomTopY);
          ctx.stroke();

          // 2. Central Quantum Energy Fusion Core Blast
          const gapCenterY = (topBottomY + bottomTopY) / 2;
          const burstRadius = (1 - alpha) * 28 + 6;

          ctx.beginPath();
          ctx.arc(midGapX, gapCenterY, burstRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.shadowColor = '#FFFFFF';
          ctx.shadowBlur = 25;
          ctx.stroke();

          ctx.restore();
        }
      }
    }
  }
}
