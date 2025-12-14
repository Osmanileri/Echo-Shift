/**
 * Property-Based Tests for Zone Unlock System
 * Uses fast-check for property-based testing
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import * as fc from 'fast-check';
import { describe, test } from 'vitest';
import { getZoneUnlockStatus, unlockZone } from './zoneUnlockSystem';

/**
 * Arbitrary for generating valid zone requirements
 */
const zoneRequirementsArb = fc.record({
  levelRequired: fc.integer({ min: 1, max: 100 }),
  shardCost: fc.integer({ min: 0, max: 100000 }),
});

/**
 * Arbitrary for generating player state
 */
const playerStateArb = fc.record({
  level: fc.integer({ min: 1, max: 100 }),
  shards: fc.integer({ min: 0, max: 200000 }),
});

describe('Zone Unlock System - Status Determination Properties', () => {
  /**
   * **Feature: progression-system, Property 4: Zone Unlock Status Determination**
   * **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
   *
   * For any combination of player level, player shards, zone requirements, and unlock state,
   * the returned status should correctly reflect:
   * - FULLY_LOCKED when level < required AND shards < required
   * - LEVEL_LOCKED when level < required AND shards >= required
   * - SHARD_LOCKED when level >= required AND shards < required
   * - UNLOCKABLE when level >= required AND shards >= required AND not unlocked
   * - UNLOCKED when already unlocked
   */
  test('FULLY_LOCKED when neither requirement is met', () => {
    fc.assert(
      fc.property(
        zoneRequirementsArb,
        playerStateArb,
        (zone, player) => {
          // Ensure player doesn't meet either requirement
          const adjustedPlayer = {
            level: Math.min(player.level, zone.levelRequired - 1),
            shards: Math.min(player.shards, zone.shardCost - 1),
          };
          
          // Skip if we can't create a valid "neither met" scenario
          if (adjustedPlayer.level < 1 || adjustedPlayer.shards < 0) {
            return true;
          }
          
          const result = getZoneUnlockStatus(
            zone,
            adjustedPlayer.level,
            adjustedPlayer.shards,
            false
          );
          
          return (
            result.status === 'FULLY_LOCKED' &&
            result.canPurchase === false &&
            result.levelMet === false &&
            result.shardsMet === false &&
            result.message === 'Sinyal Çok Zayıf. Daha fazla deneyim gerekli.'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('LEVEL_LOCKED when shards met but level not met', () => {
    fc.assert(
      fc.property(
        zoneRequirementsArb,
        playerStateArb,
        (zone, player) => {
          // Ensure player has enough shards but not enough level
          const adjustedPlayer = {
            level: Math.min(player.level, zone.levelRequired - 1),
            shards: Math.max(player.shards, zone.shardCost),
          };
          
          // Skip if we can't create a valid scenario
          if (adjustedPlayer.level < 1) {
            return true;
          }
          
          const result = getZoneUnlockStatus(
            zone,
            adjustedPlayer.level,
            adjustedPlayer.shards,
            false
          );
          
          return (
            result.status === 'LEVEL_LOCKED' &&
            result.canPurchase === false &&
            result.levelMet === false &&
            result.shardsMet === true &&
            result.message.includes('Senkronizasyon Yetersiz')
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('SHARD_LOCKED when level met but shards not met', () => {
    fc.assert(
      fc.property(
        zoneRequirementsArb,
        playerStateArb,
        (zone, player) => {
          // Ensure player has enough level but not enough shards
          const adjustedPlayer = {
            level: Math.max(player.level, zone.levelRequired),
            shards: Math.min(player.shards, zone.shardCost - 1),
          };
          
          // Skip if we can't create a valid scenario (shardCost is 0)
          if (adjustedPlayer.shards < 0) {
            return true;
          }
          
          const result = getZoneUnlockStatus(
            zone,
            adjustedPlayer.level,
            adjustedPlayer.shards,
            false
          );
          
          return (
            result.status === 'SHARD_LOCKED' &&
            result.canPurchase === false &&
            result.levelMet === true &&
            result.shardsMet === false &&
            result.message === 'Yetersiz Veri Parçası.'
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('UNLOCKABLE when both requirements met and not unlocked', () => {
    fc.assert(
      fc.property(
        zoneRequirementsArb,
        playerStateArb,
        (zone, player) => {
          // Ensure player meets both requirements
          const adjustedPlayer = {
            level: Math.max(player.level, zone.levelRequired),
            shards: Math.max(player.shards, zone.shardCost),
          };
          
          const result = getZoneUnlockStatus(
            zone,
            adjustedPlayer.level,
            adjustedPlayer.shards,
            false
          );
          
          return (
            result.status === 'UNLOCKABLE' &&
            result.canPurchase === true &&
            result.levelMet === true &&
            result.shardsMet === true
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('UNLOCKED when zone is already unlocked', () => {
    fc.assert(
      fc.property(
        zoneRequirementsArb,
        playerStateArb,
        (zone, player) => {
          // Zone is already unlocked - player state doesn't matter
          const result = getZoneUnlockStatus(
            zone,
            player.level,
            player.shards,
            true
          );
          
          return (
            result.status === 'UNLOCKED' &&
            result.canPurchase === false &&
            result.levelMet === true &&
            result.shardsMet === true
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 4: Zone Unlock Status Determination (Completeness)**
   * **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
   *
   * For any valid input, the function should return one of the five valid statuses.
   */
  test('Status is always one of the five valid values', () => {
    fc.assert(
      fc.property(
        zoneRequirementsArb,
        playerStateArb,
        fc.boolean(),
        (zone, player, isUnlocked) => {
          const result = getZoneUnlockStatus(
            zone,
            player.level,
            player.shards,
            isUnlocked
          );
          
          const validStatuses = ['FULLY_LOCKED', 'LEVEL_LOCKED', 'SHARD_LOCKED', 'UNLOCKABLE', 'UNLOCKED'];
          return validStatuses.includes(result.status);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 4: Zone Unlock Status Determination (Consistency)**
   * **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
   *
   * The levelMet and shardsMet flags should be consistent with the actual comparison.
   */
  test('levelMet and shardsMet flags are consistent with requirements', () => {
    fc.assert(
      fc.property(
        zoneRequirementsArb,
        playerStateArb,
        fc.boolean(),
        (zone, player, isUnlocked) => {
          const result = getZoneUnlockStatus(
            zone,
            player.level,
            player.shards,
            isUnlocked
          );
          
          // If unlocked, both should be true
          if (isUnlocked) {
            return result.levelMet === true && result.shardsMet === true;
          }
          
          // Otherwise, flags should match actual comparison
          const expectedLevelMet = player.level >= zone.levelRequired;
          const expectedShardsMet = player.shards >= zone.shardCost;
          
          return result.levelMet === expectedLevelMet && result.shardsMet === expectedShardsMet;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Zone Unlock System - Transaction Integrity Properties', () => {
  /**
   * **Feature: progression-system, Property 5: Zone Unlock Transaction Integrity**
   * **Validates: Requirements 6.6**
   *
   * For any zone unlock action where both requirements are met,
   * the player's shard balance should decrease by exactly the zone cost,
   * and the zone should be added to unlocked zones.
   */
  test('Successful unlock deducts exact shard cost', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 100000 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
        (zoneId, shardCost, extraShards, existingZones) => {
          // Ensure player has enough shards and zone is not already unlocked
          const currentShards = shardCost + extraShards;
          const filteredZones = existingZones.filter(z => z !== zoneId);
          
          const result = unlockZone(zoneId, shardCost, currentShards, filteredZones);
          
          // Transaction should succeed
          if (!result.success) {
            return false;
          }
          
          // Shards should decrease by exactly the cost
          const shardsDeducted = currentShards - result.newShards;
          return shardsDeducted === shardCost;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Successful unlock adds zone to unlocked list', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 100000 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
        (zoneId, shardCost, extraShards, existingZones) => {
          // Ensure player has enough shards and zone is not already unlocked
          const currentShards = shardCost + extraShards;
          const filteredZones = existingZones.filter(z => z !== zoneId);
          
          const result = unlockZone(zoneId, shardCost, currentShards, filteredZones);
          
          // Transaction should succeed
          if (!result.success) {
            return false;
          }
          
          // Zone should be in the unlocked list
          return result.unlockedZones.includes(zoneId);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Unlock preserves existing unlocked zones', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 100000 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
        (zoneId, shardCost, extraShards, existingZones) => {
          // Ensure player has enough shards and zone is not already unlocked
          const currentShards = shardCost + extraShards;
          const filteredZones = existingZones.filter(z => z !== zoneId);
          
          const result = unlockZone(zoneId, shardCost, currentShards, filteredZones);
          
          // Transaction should succeed
          if (!result.success) {
            return true; // Skip if transaction failed
          }
          
          // All existing zones should still be in the list
          return filteredZones.every(z => result.unlockedZones.includes(z));
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Unlock fails when shards are insufficient', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 0, max: 9999 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
        (zoneId, shardCost, maxShards, existingZones) => {
          // Ensure player doesn't have enough shards
          const currentShards = Math.min(maxShards, shardCost - 1);
          
          // Skip if we can't create insufficient shards scenario
          if (currentShards < 0) {
            return true;
          }
          
          const filteredZones = existingZones.filter(z => z !== zoneId);
          
          const result = unlockZone(zoneId, shardCost, currentShards, filteredZones);
          
          // Transaction should fail
          return (
            result.success === false &&
            result.newShards === currentShards &&
            result.unlockedZones.length === filteredZones.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Unlock fails when zone is already unlocked', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 100000 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
        (zoneId, shardCost, currentShards, existingZones) => {
          // Ensure zone is already in the unlocked list
          const zonesWithTarget = existingZones.includes(zoneId) 
            ? existingZones 
            : [...existingZones, zoneId];
          
          const result = unlockZone(zoneId, shardCost, currentShards, zonesWithTarget);
          
          // Transaction should fail
          return (
            result.success === false &&
            result.newShards === currentShards
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: progression-system, Property 5: Zone Unlock Transaction Integrity (Idempotence)**
   * **Validates: Requirements 6.6**
   *
   * Attempting to unlock an already unlocked zone should not change state.
   */
  test('Double unlock does not change state', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 0, max: 100000 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
        (zoneId, shardCost, extraShards, existingZones) => {
          const currentShards = shardCost + extraShards;
          const filteredZones = existingZones.filter(z => z !== zoneId);
          
          // First unlock
          const firstResult = unlockZone(zoneId, shardCost, currentShards, filteredZones);
          
          if (!firstResult.success) {
            return true; // Skip if first unlock failed
          }
          
          // Second unlock attempt
          const secondResult = unlockZone(
            zoneId, 
            shardCost, 
            firstResult.newShards, 
            firstResult.unlockedZones
          );
          
          // Second attempt should fail and not change state
          return (
            secondResult.success === false &&
            secondResult.newShards === firstResult.newShards &&
            secondResult.unlockedZones.length === firstResult.unlockedZones.length
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
