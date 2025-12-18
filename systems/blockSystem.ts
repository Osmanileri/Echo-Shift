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

import { INITIAL_CONFIG, PHANTOM_CONFIG } from "../constants";
import { Obstacle } from "../types";
import { getFlippedLane } from "../utils/gameMath";
import { createPhantomObstacle, shouldSpawnAsPhantom } from "../utils/phantomSystem";
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
}

export function createBlockSystemState(): BlockSystemState {
  return {
    lastSpawnedPolarity: null,
    lastGapCenter: 0,
    lastHalfGap: 0,
    patternPolarity: "white",
    shardSpawnSequence: 0,
    sameColorStreak: 0,
  };
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

/**
 * Calculate oscillation transform for rendering
 * Creates a smooth, flowing vertical motion for oscillating blocks
 */
export function calculateOscillationTransform(
  obs: Obstacle,
  currentTime: number,
  _bpm: number, // Not used - using smooth fixed cycle
  config: BlockSystemConfig = DEFAULT_BLOCK_CONFIG
): {
  scale: number;
  verticalOffset: number;
} {
  if (!obs.shouldOscillate || !obs.oscillationIntensity) {
    return { scale: 1.0, verticalOffset: 0 };
  }

  const phase = obs.oscillationPhase || 0;
  const intensity = obs.oscillationIntensity;
  
  // No scale change - only vertical movement
  const scale = config.oscillationBaseScale;
  
  // Fast vertical bobbing - 900ms per full cycle
  // Visible during fast gameplay
  const bobCycleDuration = 900;
  const bobPhase = ((currentTime % bobCycleDuration) / bobCycleDuration) * Math.PI * 2 + phase;
  
  // Pure sine wave for smooth, continuous motion
  const rawBob = Math.sin(bobPhase);
  const verticalOffset = rawBob * config.oscillationMaxBob * intensity;
  
  return { scale, verticalOffset };
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
    ...topOscillation,
  };
  
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
    ...bottomOscillation,
  };
  
  // Apply phantom if needed
  if (ctx.forcePhantom || (ctx.phantomEnabled && shouldSpawnAsPhantom(ctx.score, PHANTOM_CONFIG))) {
    topObstacle = createPhantomObstacle(topObstacle, spawnX, PHANTOM_CONFIG);
  }
  if (ctx.forcePhantom || (ctx.phantomEnabled && shouldSpawnAsPhantom(ctx.score, PHANTOM_CONFIG))) {
    bottomObstacle = createPhantomObstacle(bottomObstacle, spawnX, PHANTOM_CONFIG);
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
  const spawnX = ctx.isDashing 
    ? playerBaseX + ctx.dashXOffset + 150 + ctx.rng() * 200
    : ctx.canvasWidth + 50;
  
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
  
  const results: Obstacle[] = [];
  
  // Top block
  if (topBlockHeight > 15) {
    const topPooled = ctx.obstaclePool.acquire();
    const topOscillation = generateOscillationProps(ctx.rng, config);
    
    topPooled.x = spawnX;
    topPooled.y = ctx.isDashing ? 0 : -topBlockHeight;
    topPooled.targetY = 0;
    topPooled.width = obsWidth;
    topPooled.height = topBlockHeight;
    topPooled.lane = ctx.isGravityFlipped ? "bottom" : "top";
    topPooled.polarity = topPolarity;
    topPooled.passed = false;
    topPooled.nearMissChecked = false;
    topPooled.hasPhased = false;
    topPooled.isLatent = false;
    topPooled.initialX = spawnX;
    topPooled.shouldOscillate = topOscillation.shouldOscillate;
    topPooled.oscillationIntensity = topOscillation.oscillationIntensity;
    topPooled.oscillationPhase = topOscillation.oscillationPhase;
    
    if (ctx.forcePhantom || (ctx.phantomEnabled && shouldSpawnAsPhantom(ctx.score, PHANTOM_CONFIG))) {
      results.push(createPhantomObstacle(topPooled, spawnX, PHANTOM_CONFIG));
    } else {
      results.push(topPooled);
    }
  }
  
  // Bottom block
  const bottomBlockHeight = ctx.canvasHeight - bottomBlockTop;
  if (bottomBlockHeight > 15) {
    const bottomPooled = ctx.obstaclePool.acquire();
    const bottomOscillation = generateOscillationProps(ctx.rng, config);
    
    bottomPooled.x = spawnX;
    bottomPooled.y = ctx.isDashing ? bottomBlockTop : ctx.canvasHeight;
    bottomPooled.targetY = bottomBlockTop;
    bottomPooled.width = obsWidth;
    bottomPooled.height = bottomBlockHeight;
    bottomPooled.lane = ctx.isGravityFlipped ? "top" : "bottom";
    bottomPooled.polarity = bottomPolarity;
    bottomPooled.passed = false;
    bottomPooled.nearMissChecked = false;
    bottomPooled.hasPhased = false;
    bottomPooled.isLatent = false;
    bottomPooled.initialX = spawnX;
    bottomPooled.shouldOscillate = bottomOscillation.shouldOscillate;
    bottomPooled.oscillationIntensity = bottomOscillation.oscillationIntensity;
    bottomPooled.oscillationPhase = bottomOscillation.oscillationPhase;
    
    if (ctx.forcePhantom || (ctx.phantomEnabled && shouldSpawnAsPhantom(ctx.score, PHANTOM_CONFIG))) {
      results.push(createPhantomObstacle(bottomPooled, spawnX, PHANTOM_CONFIG));
    } else {
      results.push(bottomPooled);
    }
  }
  
  return results;
}

// ============================================================================
// Block Movement
// ============================================================================

/**
 * Update block positions
 */
export function updateBlockPositions(
  obstacles: Obstacle[],
  speed: number,
  slowMotionMultiplier: number,
  constructSpeedMultiplier: number,
  dashSpeedMultiplier: number
): void {
  obstacles.forEach((obs) => {
    // Horizontal movement
    obs.x -= speed * slowMotionMultiplier * constructSpeedMultiplier * dashSpeedMultiplier;
    
    // Vertical animation (entry)
    if (Math.abs(obs.y - obs.targetY) > 0.5) {
      obs.y += (obs.targetY - obs.y) * 0.05;
    } else {
      obs.y = obs.targetY;
    }
  });
}

/**
 * Filter out off-screen blocks
 */
export function filterOffscreenBlocks(
  obstacles: Obstacle[],
  pool?: ObjectPool.ObjectPool<ObjectPool.PooledEngineObstacle>
): Obstacle[] {
  return obstacles.filter((obs) => {
    const keep = obs.x + obs.width > -100;
    if (!keep && pool) {
      pool.release(obs as ObjectPool.PooledEngineObstacle);
    }
    return keep;
  });
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
    const { calculatePhantomOpacity, getEffectiveOpacity } = require("../utils/phantomSystem");
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
  
  // Phantom ghost outline
  if (obs.isLatent && obstacleOpacity < 0.5) {
    ctx.globalAlpha = PHANTOM_CONFIG.minOpacity;
    ctx.strokeStyle = `${obstacleColor}4D`;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(obs.x - 2, drawY - 2, obs.width + 4, obs.height + 4);
    ctx.setLineDash([]);
  }
  
  ctx.restore();
  ctx.globalAlpha = 1.0;
}

/**
 * Render all blocks
 */
export function renderAllBlocks(
  obstacles: Obstacle[],
  renderCtx: RenderContext,
  config: BlockSystemConfig = DEFAULT_BLOCK_CONFIG
): void {
  obstacles.forEach((obs) => renderBlock(obs, renderCtx, config));
}
