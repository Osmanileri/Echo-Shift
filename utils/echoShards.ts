/**
 * Echo Shards Currency System
 * Requirements: 1.1, 1.2
 * 
 * Echo Shards are the in-game currency earned from gameplay.
 * Players earn 10% of their final score as Echo Shards.
 */

/**
 * Calculates Echo Shards earned from a game score.
 * Requirements 1.1: Award Echo Shards equal to 10% of final score rounded down
 * 
 * @param score - The final game score
 * @returns The number of Echo Shards earned (Math.floor(score * 0.1))
 */
export function calculateEchoShards(score: number): number {
  // Clamp negative scores to 0
  if (score < 0) {
    return 0;
  }
  return Math.floor(score * 0.1);
}

/**
 * Collectible bonus types and their Echo Shard values
 * Requirements 1.2: Bonus Echo Shards from special collectibles
 */
export const COLLECTIBLE_BONUSES = {
  SMALL: 5,    // Small collectible bonus
  MEDIUM: 15,  // Medium collectible bonus
  LARGE: 30,   // Large collectible bonus
  RARE: 50,    // Rare collectible bonus
} as const;

export type CollectibleType = keyof typeof COLLECTIBLE_BONUSES;

/**
 * Calculates bonus Echo Shards from a collectible.
 * Requirements 1.2: Add bonus Echo Shards for special collectibles
 * 
 * @param collectibleType - The type of collectible collected
 * @returns The bonus Echo Shards for that collectible
 */
export function calculateCollectibleBonus(collectibleType: CollectibleType): number {
  return COLLECTIBLE_BONUSES[collectibleType];
}

/**
 * Calculates total Echo Shards from a game session.
 * Combines base score calculation with any collectible bonuses.
 * 
 * @param score - The final game score
 * @param collectibleBonuses - Array of collectible types collected during the game
 * @returns Total Echo Shards earned (base + bonuses)
 */
export function calculateTotalEchoShards(
  score: number,
  collectibleBonuses: CollectibleType[] = []
): number {
  const baseShards = calculateEchoShards(score);
  const bonusShards = collectibleBonuses.reduce(
    (total, type) => total + calculateCollectibleBonus(type),
    0
  );
  return baseShards + bonusShards;
}
