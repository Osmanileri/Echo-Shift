/**
 * Shard Placement System - Strategic Shard Positioning
 * 
 * Manages intelligent shard placement within patterns, providing
 * risk/reward choices for players through safe and risky shard positions.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { Lane } from '../data/patterns';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Configuration for shard placement and collection
 * Requirements: 5.2, 5.3, 5.5
 */
export interface ShardConfig {
  safeGapRatio: number;      // 0.5 - Gap ortasına yerleşim
  riskyEdgeDistance: number; // 20px - Engel kenarına mesafe
  nearMissBonus: number;     // 5 - Near miss bonus çarpanı
  baseShardValue: number;    // 1 - Temel shard değeri
}

/**
 * Movement configuration for dynamic shards
 */
export interface ShardMovement {
  // Vertical oscillation (yukarı-aşağı)
  verticalAmplitude: number;   // Dikey hareket genliği (piksel)
  verticalFrequency: number;   // Dikey hareket frekansı (rad/s)
  verticalPhase: number;       // Başlangıç fazı (radyan)
  
  // Horizontal oscillation (ileri-geri)
  horizontalAmplitude: number; // Yatay hareket genliği (piksel)
  horizontalFrequency: number; // Yatay hareket frekansı (rad/s)
  horizontalPhase: number;     // Başlangıç fazı (radyan)
}

/**
 * Represents a placed shard in the game world
 * Requirements: 5.1, 5.4
 */
export interface PlacedShard {
  id: string;
  x: number;
  y: number;
  baseX: number;  // Orijinal X pozisyonu (hareket merkezi)
  baseY: number;  // Orijinal Y pozisyonu (hareket merkezi)
  lane: Lane;
  type: 'safe' | 'risky';
  value: number;
  collected: boolean;
  movement: ShardMovement;  // Dinamik hareket parametreleri
  spawnTime: number;        // Spawn zamanı (hareket hesaplaması için)
}

/**
 * Position result from calculation functions
 */
export interface ShardPosition {
  x: number;
  y: number;
}

/**
 * Playable area boundaries
 */
export interface PlayableArea {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  canvasHeight: number;
  canvasWidth: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default shard configuration
 * Requirements: 5.2, 5.3, 5.5
 */
export const DEFAULT_SHARD_CONFIG: ShardConfig = {
  safeGapRatio: 0.5,
  riskyEdgeDistance: 20,
  nearMissBonus: 5,
  baseShardValue: 1
};

/**
 * Movement configuration for different shard types
 * Risky shards move more aggressively
 */
export const SHARD_MOVEMENT_CONFIG = {
  safe: {
    verticalAmplitude: { min: 15, max: 25 },    // Yumuşak dikey hareket
    verticalFrequency: { min: 1.5, max: 2.5 },  // Yavaş salınım
    horizontalAmplitude: { min: 10, max: 20 },  // Hafif yatay hareket
    horizontalFrequency: { min: 1.0, max: 2.0 },
  },
  risky: {
    verticalAmplitude: { min: 25, max: 40 },    // Agresif dikey hareket
    verticalFrequency: { min: 2.5, max: 4.0 },  // Hızlı salınım
    horizontalAmplitude: { min: 20, max: 35 },  // Belirgin yatay hareket
    horizontalFrequency: { min: 2.0, max: 3.5 },
  }
};

/**
 * Generate random movement parameters for a shard
 * @param type - Shard type (safe/risky)
 * @param rand - Optional RNG function (defaults to Math.random)
 * @returns Movement configuration
 */
export function generateShardMovement(type: 'safe' | 'risky', rand: () => number = Math.random): ShardMovement {
  const config = SHARD_MOVEMENT_CONFIG[type];
  
  return {
    verticalAmplitude: randomInRange(config.verticalAmplitude.min, config.verticalAmplitude.max, rand),
    verticalFrequency: randomInRange(config.verticalFrequency.min, config.verticalFrequency.max, rand),
    verticalPhase: rand() * Math.PI * 2, // Rastgele başlangıç fazı
    
    horizontalAmplitude: randomInRange(config.horizontalAmplitude.min, config.horizontalAmplitude.max, rand),
    horizontalFrequency: randomInRange(config.horizontalFrequency.min, config.horizontalFrequency.max, rand),
    horizontalPhase: rand() * Math.PI * 2,
  };
}

/**
 * Helper function for random range
 */
function randomInRange(min: number, max: number, rand: () => number): number {
  return min + rand() * (max - min);
}

/**
 * Calculate current shard position based on movement and time
 * @param shard - The shard to calculate position for
 * @param currentTime - Current timestamp (ms)
 * @returns Updated x, y coordinates
 */
export function calculateShardPosition(
  shard: PlacedShard,
  currentTime: number
): { x: number; y: number } {
  const elapsed = (currentTime - shard.spawnTime) / 1000; // Saniyeye çevir
  
  // Sinüzoidal hareket hesaplaması
  const verticalOffset = Math.sin(elapsed * shard.movement.verticalFrequency + shard.movement.verticalPhase) 
    * shard.movement.verticalAmplitude;
  
  const horizontalOffset = Math.sin(elapsed * shard.movement.horizontalFrequency + shard.movement.horizontalPhase) 
    * shard.movement.horizontalAmplitude;
  
  return {
    x: shard.baseX + horizontalOffset,
    y: shard.baseY + verticalOffset
  };
}

/**
 * Update shard position based on movement pattern
 * Call this every frame to animate the shard
 * @param shard - Shard to update
 * @param currentTime - Current timestamp
 * @returns Updated shard with new position
 */
export function updateShardPosition(
  shard: PlacedShard,
  currentTime: number
): PlacedShard {
  const newPos = calculateShardPosition(shard, currentTime);
  return {
    ...shard,
    x: newPos.x,
    y: newPos.y
  };
}

/**
 * Default playable area (can be overridden based on canvas size)
 */
export const DEFAULT_PLAYABLE_AREA: PlayableArea = {
  minX: 0,
  maxX: 800,
  minY: 0,
  maxY: 600,
  canvasHeight: 600,
  canvasWidth: 800
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate safe shard position - centered in gap between obstacles
 * 
 * Requirements: 5.2
 * Safe shards are placed in the center of a gap between obstacles,
 * making them easy to collect without risk.
 * 
 * @param gapStart - X coordinate where the gap starts
 * @param gapEnd - X coordinate where the gap ends
 * @param lane - Which lane (TOP/BOTTOM) the shard should be in
 * @param canvasHeight - Height of the game canvas
 * @returns Position for the safe shard
 */
export function calculateSafeShardPosition(
  gapStart: number,
  gapEnd: number,
  lane: Lane,
  canvasHeight: number
): ShardPosition {
  // Calculate X position at center of gap
  const x = gapStart + (gapEnd - gapStart) * DEFAULT_SHARD_CONFIG.safeGapRatio;
  
  // Calculate Y position based on lane
  // TOP lane: upper quarter of screen
  // BOTTOM lane: lower quarter of screen
  const y = lane === 'TOP' 
    ? canvasHeight * 0.25 
    : canvasHeight * 0.75;
  
  return { x, y };
}

/**
 * Calculate risky shard position - adjacent to obstacle edge
 * 
 * Requirements: 5.3
 * Risky shards are placed close to obstacles, requiring precise
 * movement to collect without collision.
 * 
 * @param obstacleX - X coordinate of the obstacle
 * @param obstacleY - Y coordinate of the obstacle
 * @param obstacleHeight - Height of the obstacle
 * @param lane - Which lane (TOP/BOTTOM) the shard should be in
 * @param config - Shard configuration
 * @returns Position for the risky shard
 */
export function calculateRiskyShardPosition(
  obstacleX: number,
  obstacleY: number,
  obstacleHeight: number,
  lane: Lane,
  config: ShardConfig = DEFAULT_SHARD_CONFIG
): ShardPosition {
  // Place shard at edge distance from obstacle
  const x = obstacleX + config.riskyEdgeDistance;
  
  // Y position is at the edge of the obstacle based on lane
  // For TOP lane obstacles, place shard just below the obstacle
  // For BOTTOM lane obstacles, place shard just above the obstacle
  const y = lane === 'TOP'
    ? obstacleY + obstacleHeight + config.riskyEdgeDistance
    : obstacleY - config.riskyEdgeDistance;
  
  return { x, y };
}

/**
 * Collect a shard and calculate awarded value
 * 
 * Requirements: 5.4, 5.5
 * Awards base value for normal collection, bonus for Near Miss collection.
 * 
 * @param shard - The shard being collected
 * @param isNearMiss - Whether this was a Near Miss collection
 * @param config - Shard configuration
 * @returns Total points awarded for collection
 */
export function collectShard(
  shard: PlacedShard,
  isNearMiss: boolean,
  config: ShardConfig = DEFAULT_SHARD_CONFIG
): number {
  // Base value from the shard
  let awardedValue = shard.value;
  
  // Add Near Miss bonus if applicable - Requirements 5.5
  if (isNearMiss) {
    awardedValue += config.nearMissBonus;
  }
  
  return awardedValue;
}

/**
 * Create a new placed shard with dynamic movement
 * 
 * Requirements: 5.1
 * 
 * @param id - Unique identifier for the shard
 * @param position - X/Y position
 * @param lane - Lane the shard is in
 * @param type - Safe or risky shard
 * @param config - Shard configuration
 * @returns New PlacedShard object with movement
 */
export function createPlacedShard(
  id: string,
  position: ShardPosition,
  lane: Lane,
  type: 'safe' | 'risky',
  config: ShardConfig = DEFAULT_SHARD_CONFIG
): PlacedShard {
  const movement = generateShardMovement(type);
  
  return {
    id,
    x: position.x,
    y: position.y,
    baseX: position.x,
    baseY: position.y,
    lane,
    type,
    value: config.baseShardValue,
    collected: false,
    movement,
    spawnTime: Date.now()
  };
}

/**
 * Check if a shard position is within the playable area
 * 
 * Requirements: 5.1
 * Ensures shards are always collectible by the player.
 * 
 * @param position - Position to validate
 * @param playableArea - Boundaries of the playable area
 * @returns True if position is valid
 */
export function isPositionInPlayableArea(
  position: ShardPosition,
  playableArea: PlayableArea = DEFAULT_PLAYABLE_AREA
): boolean {
  return (
    position.x >= playableArea.minX &&
    position.x <= playableArea.maxX &&
    position.y >= playableArea.minY &&
    position.y <= playableArea.maxY
  );
}

/**
 * Validate that a shard's lane matches its Y position
 * 
 * Requirements: 5.1
 * TOP lane shards should be in upper half, BOTTOM in lower half.
 * 
 * @param shard - Shard to validate
 * @param canvasHeight - Height of the game canvas
 * @returns True if lane and position are consistent
 */
export function validateShardLanePosition(
  shard: PlacedShard,
  canvasHeight: number
): boolean {
  const midpoint = canvasHeight / 2;
  
  if (shard.lane === 'TOP') {
    return shard.y < midpoint;
  } else {
    return shard.y >= midpoint;
  }
}

/**
 * Clamp a position to be within the playable area
 * 
 * @param position - Position to clamp
 * @param playableArea - Boundaries to clamp to
 * @returns Clamped position
 */
export function clampToPlayableArea(
  position: ShardPosition,
  playableArea: PlayableArea = DEFAULT_PLAYABLE_AREA
): ShardPosition {
  return {
    x: Math.max(playableArea.minX, Math.min(playableArea.maxX, position.x)),
    y: Math.max(playableArea.minY, Math.min(playableArea.maxY, position.y))
  };
}

/**
 * Calculate shard position based on pattern definition
 * 
 * Requirements: 5.1, 5.2, 5.3
 * Determines position based on shard type (safe/risky).
 * 
 * @param lane - Lane for the shard
 * @param type - Safe or risky shard
 * @param timeOffset - Time offset in the pattern
 * @param gameSpeed - Current game speed
 * @param canvasHeight - Canvas height
 * @param canvasWidth - Canvas width
 * @param obstacleInfo - Optional obstacle info for risky shards
 * @returns Calculated position
 */
export function calculateShardPositionFromPattern(
  lane: Lane,
  type: 'safe' | 'risky',
  timeOffset: number,
  gameSpeed: number,
  canvasHeight: number,
  canvasWidth: number,
  obstacleInfo?: { x: number; y: number; height: number }
): ShardPosition {
  // Calculate X based on time offset and speed
  // Shards spawn from the right side of the screen
  const baseX = canvasWidth + (timeOffset * gameSpeed / 100);
  
  if (type === 'safe') {
    // Safe shards: centered in lane
    return calculateSafeShardPosition(
      baseX - 50,  // Gap start
      baseX + 50,  // Gap end
      lane,
      canvasHeight
    );
  } else {
    // Risky shards: near obstacle edge
    if (obstacleInfo) {
      return calculateRiskyShardPosition(
        obstacleInfo.x,
        obstacleInfo.y,
        obstacleInfo.height,
        lane
      );
    }
    // Fallback if no obstacle info
    return {
      x: baseX,
      y: lane === 'TOP' ? canvasHeight * 0.25 : canvasHeight * 0.75
    };
  }
}

/**
 * Generate unique shard ID
 * 
 * @param patternId - ID of the pattern
 * @param shardIndex - Index of the shard in the pattern
 * @returns Unique shard ID
 */
export function generateShardId(patternId: string, shardIndex: number): string {
  return `${patternId}-shard-${shardIndex}-${Date.now()}`;
}

/**
 * Check if player is close enough to collect a shard
 * 
 * @param playerX - Player X position
 * @param playerY - Player Y position
 * @param shard - Shard to check
 * @param collectionRadius - Radius for collection (default 30)
 * @returns True if player can collect the shard
 */
export function canCollectShard(
  playerX: number,
  playerY: number,
  shard: PlacedShard,
  collectionRadius: number = 30
): boolean {
  if (shard.collected) {
    return false;
  }
  
  const dx = playerX - shard.x;
  const dy = playerY - shard.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= collectionRadius;
}

/**
 * Mark a shard as collected
 * 
 * @param shard - Shard to mark
 * @returns Updated shard with collected = true
 */
export function markShardCollected(shard: PlacedShard): PlacedShard {
  return {
    ...shard,
    collected: true
  };
}
