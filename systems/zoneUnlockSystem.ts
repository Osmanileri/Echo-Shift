/**
 * Zone Unlock System for Echo Shift Progression
 * Handles dual-lock zone unlocking (level + shards requirements)
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import type { ZoneLockStatus, ZoneRequirements, ZoneUnlockState } from '../types';

/**
 * Messages for each zone lock status
 * Requirements 6.2, 6.3, 6.4, 6.5: Display appropriate messages for each lock state
 */
const ZONE_MESSAGES: Record<ZoneLockStatus, string | ((levelRequired: number) => string)> = {
  FULLY_LOCKED: 'Sinyal Çok Zayıf. Daha fazla deneyim gerekli.',
  LEVEL_LOCKED: (levelRequired: number) => `Senkronizasyon Yetersiz! (Gereken Seviye: ${levelRequired})`,
  SHARD_LOCKED: 'Yetersiz Veri Parçası.',
  UNLOCKABLE: 'Açmaya hazır!',
  UNLOCKED: 'Bölge açıldı.',
};

/**
 * Determine the unlock status of a zone based on player state
 * 
 * Requirements 6.1: WHEN displaying a locked zone THEN the Zone_System SHALL show 
 * both Level requirement and Shard cost with individual lock status indicators
 * 
 * Requirements 6.2: WHEN the player meets neither requirement THEN the Zone_System 
 * SHALL display "Signal Too Weak. More experience required." with both indicators locked
 * 
 * Requirements 6.3: WHEN the player meets the Shard requirement but not the Level requirement 
 * THEN the Zone_System SHALL display "Synchronization Insufficient! (Required Rank: X)" 
 * with the purchase button disabled
 * 
 * Requirements 6.4: WHEN the player meets the Level requirement but not the Shard requirement 
 * THEN the Zone_System SHALL display "Insufficient Data Shards." with the purchase button disabled
 * 
 * Requirements 6.5: WHEN the player meets both requirements THEN the Zone_System 
 * SHALL enable the "UNLOCK FREQUENCY" button and allow purchase
 * 
 * @param zone - Zone requirements (levelRequired, shardCost)
 * @param playerLevel - Player's current Sync Rate level
 * @param playerShards - Player's current Echo Shards balance
 * @param isUnlocked - Whether the zone is already unlocked
 * @returns ZoneUnlockState with status, message, and flags
 */
export function getZoneUnlockStatus(
  zone: ZoneRequirements,
  playerLevel: number,
  playerShards: number,
  isUnlocked: boolean
): ZoneUnlockState {
  // Already unlocked - highest priority
  if (isUnlocked) {
    return {
      status: 'UNLOCKED',
      message: ZONE_MESSAGES.UNLOCKED as string,
      canPurchase: false,
      levelMet: true,
      shardsMet: true,
    };
  }

  const levelMet = playerLevel >= zone.levelRequired;
  const shardsMet = playerShards >= zone.shardCost;

  // Both requirements met - can unlock
  if (levelMet && shardsMet) {
    return {
      status: 'UNLOCKABLE',
      message: ZONE_MESSAGES.UNLOCKABLE as string,
      canPurchase: true,
      levelMet: true,
      shardsMet: true,
    };
  }

  // Has shards but needs level
  if (shardsMet && !levelMet) {
    const getMessage = ZONE_MESSAGES.LEVEL_LOCKED as (levelRequired: number) => string;
    return {
      status: 'LEVEL_LOCKED',
      message: getMessage(zone.levelRequired),
      canPurchase: false,
      levelMet: false,
      shardsMet: true,
    };
  }

  // Has level but needs shards
  if (levelMet && !shardsMet) {
    return {
      status: 'SHARD_LOCKED',
      message: ZONE_MESSAGES.SHARD_LOCKED as string,
      canPurchase: false,
      levelMet: true,
      shardsMet: false,
    };
  }

  // Neither requirement met
  return {
    status: 'FULLY_LOCKED',
    message: ZONE_MESSAGES.FULLY_LOCKED as string,
    canPurchase: false,
    levelMet: false,
    shardsMet: false,
  };
}

/**
 * Result of a zone unlock transaction
 */
export interface ZoneUnlockResult {
  success: boolean;
  newShards: number;
  unlockedZones: string[];
  error?: string;
}

/**
 * Execute a zone unlock transaction
 * 
 * Requirements 6.6: WHEN the player confirms zone unlock THEN the Zone_System 
 * SHALL deduct the Shard cost and permanently unlock the zone
 * 
 * @param zoneId - ID of the zone to unlock
 * @param shardCost - Cost in shards to unlock
 * @param currentShards - Player's current shard balance
 * @param currentUnlockedZones - List of currently unlocked zone IDs
 * @returns ZoneUnlockResult with new state
 */
export function unlockZone(
  zoneId: string,
  shardCost: number,
  currentShards: number,
  currentUnlockedZones: string[]
): ZoneUnlockResult {
  // Check if already unlocked
  if (currentUnlockedZones.includes(zoneId)) {
    return {
      success: false,
      newShards: currentShards,
      unlockedZones: currentUnlockedZones,
      error: 'Bölge zaten açık.',
    };
  }

  // Check if player has enough shards
  if (currentShards < shardCost) {
    return {
      success: false,
      newShards: currentShards,
      unlockedZones: currentUnlockedZones,
      error: 'Yetersiz parça.',
    };
  }

  // Execute transaction: deduct shards and add zone to unlocked list
  const newShards = currentShards - shardCost;
  const unlockedZones = [...currentUnlockedZones, zoneId];

  return {
    success: true,
    newShards,
    unlockedZones,
  };
}
