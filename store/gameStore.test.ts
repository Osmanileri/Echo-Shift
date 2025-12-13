/**
 * Property-Based Tests for Game Store Purchase System
 * Uses fast-check for property-based testing
 */

import * as fc from 'fast-check';
import { beforeEach, describe, test } from 'vitest';
import { ItemCategory, useGameStore } from './gameStore';

// Helper to reset store state before each test
const resetStore = () => {
  useGameStore.setState({
    echoShards: 0,
    ownedSkins: ['default'],
    ownedEffects: ['default'],
    ownedThemes: ['default'],
    ownedUpgrades: {},
    equippedSkin: 'default',
    equippedEffect: 'default',
    equippedTheme: 'default',
    completedLevels: [],
    currentLevel: 1,
    levelStars: {},
    lastDailyChallengeDate: '',
    dailyChallengeCompleted: false,
    dailyChallengeBestScore: 0,
    ghostTimeline: [],
    // V2 Mechanics State
    shift: {
      targetWord: ['S', 'H', 'I', 'F', 'T'],
      collectedMask: [false, false, false, false, false],
      overdriveActive: false,
      overdriveTimer: 0,
      coreRotation: 0,
    },
    resonance: {
      isActive: false,
      isPaused: false,
      pausedTimeRemaining: 0,
      streakCount: 0,
      activationThreshold: 10,
      duration: 10000,
      remainingTime: 0,
      multiplier: 1,
      intensity: 0,
      colorTransitionProgress: 0,
    },
    snapshots: {
      snapshots: [],
      head: 0,
      capacity: 180,
      size: 0,
    },
    // Echo Constructs State
    unlockedConstructs: ['TITAN'],
    activeConstruct: 'NONE',
    isConstructInvulnerable: false,
    constructInvulnerabilityEndTime: 0,
    tutorialCompleted: false,
    soundEnabled: true,
    musicEnabled: true,
  });
};

// Arbitrary for item categories
const categoryArb = fc.constantFrom<ItemCategory>('skin', 'effect', 'theme');

// Arbitrary for unique item IDs (not 'default' which is already owned)
const itemIdArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(id => id !== 'default' && id.trim().length > 0);

describe('Purchase Balance Validation Properties', () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * **Feature: echo-shift-professionalization, Property 3: Purchase Balance Validation**
   * **Validates: Requirements 2.2**
   *
   * For any purchase attempt where player balance is less than item price,
   * the purchase SHALL fail and balance SHALL remain unchanged.
   */
  test('Purchase fails and balance unchanged when balance < price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),  // balance
        fc.integer({ min: 1, max: 10000 }),  // price (must be positive)
        itemIdArb,
        categoryArb,
        (balance, price, itemId, category) => {
          // Only test cases where balance < price
          fc.pre(balance < price);
          
          // Reset and set initial balance
          resetStore();
          useGameStore.setState({ echoShards: balance });
          
          const initialBalance = useGameStore.getState().echoShards;
          
          // Attempt purchase
          const result = useGameStore.getState().purchaseItem(itemId, category, price);
          
          const finalBalance = useGameStore.getState().echoShards;
          
          // Purchase should fail
          const purchaseFailed = result === false;
          // Balance should remain unchanged
          const balanceUnchanged = finalBalance === initialBalance;
          
          return purchaseFailed && balanceUnchanged;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Purchase State Consistency Properties', () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * **Feature: echo-shift-professionalization, Property 4: Purchase State Consistency**
   * **Validates: Requirements 2.3**
   *
   * For any successful purchase, the player's balance SHALL decrease by exactly
   * the item price AND the item SHALL be marked as owned.
   */
  test('Successful purchase decreases balance by price and marks item as owned', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),  // balance
        fc.integer({ min: 0, max: 10000 }),  // price
        itemIdArb,
        categoryArb,
        (balance, price, itemId, category) => {
          // Only test cases where balance >= price (purchase should succeed)
          fc.pre(balance >= price);
          
          // Reset and set initial balance
          resetStore();
          useGameStore.setState({ echoShards: balance });
          
          const initialBalance = useGameStore.getState().echoShards;
          
          // Get the owned items array key based on category
          const getOwnedItems = (cat: ItemCategory): string[] => {
            const state = useGameStore.getState();
            switch (cat) {
              case 'skin': return state.ownedSkins;
              case 'effect': return state.ownedEffects;
              case 'theme': return state.ownedThemes;
            }
          };
          
          // Verify item is not already owned
          const initialOwned = getOwnedItems(category);
          const wasAlreadyOwned = initialOwned.includes(itemId);
          
          // Skip if item was already owned (would fail for different reason)
          fc.pre(!wasAlreadyOwned);
          
          // Attempt purchase
          const result = useGameStore.getState().purchaseItem(itemId, category, price);
          
          const finalBalance = useGameStore.getState().echoShards;
          const finalOwned = getOwnedItems(category);
          
          // Purchase should succeed
          const purchaseSucceeded = result === true;
          // Balance should decrease by exactly the price
          const balanceDecreasedCorrectly = finalBalance === initialBalance - price;
          // Item should now be owned
          const itemNowOwned = finalOwned.includes(itemId);
          
          return purchaseSucceeded && balanceDecreasedCorrectly && itemNowOwned;
        }
      ),
      { numRuns: 100 }
    );
  });
});

import type { ConstructType } from '../types';

// Arbitrary for construct types (excluding 'NONE' for unlock tests)
const constructTypeArb = fc.constantFrom<ConstructType>('TITAN', 'PHASE', 'BLINK');

// Arbitrary for active construct types (including 'NONE')
const activeConstructArb = fc.constantFrom<ConstructType>('NONE', 'TITAN', 'PHASE', 'BLINK');

describe('Echo Constructs State Persistence Properties', () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * **Feature: echo-constructs, Property 16: Construct State Not Persisted**
   * **Validates: Requirements 7.4**
   *
   * For any serialization, activeConstruct, isConstructInvulnerable, and
   * constructInvulnerabilityEndTime SHALL NOT be included (session-only).
   * After save/load cycle, these values should reset to defaults.
   */
  test('Session-only construct state resets after save/load cycle', () => {
    fc.assert(
      fc.property(
        activeConstructArb,
        fc.boolean(),
        fc.integer({ min: 0, max: 100000 }),
        (activeConstruct, isInvulnerable, invulnerabilityEndTime) => {
          // Reset store
          resetStore();
          
          // Set session-only state to non-default values
          useGameStore.setState({
            activeConstruct,
            isConstructInvulnerable: isInvulnerable,
            constructInvulnerabilityEndTime: invulnerabilityEndTime,
          });
          
          // Verify state was set
          const stateBeforeSave = useGameStore.getState();
          const activeConstructSet = stateBeforeSave.activeConstruct === activeConstruct;
          const invulnerableSet = stateBeforeSave.isConstructInvulnerable === isInvulnerable;
          const endTimeSet = stateBeforeSave.constructInvulnerabilityEndTime === invulnerabilityEndTime;
          
          // Save to storage
          useGameStore.getState().saveToStorage();
          
          // Load from storage (simulates app restart)
          useGameStore.getState().loadFromStorage();
          
          // After load, session-only state should be reset to defaults
          const stateAfterLoad = useGameStore.getState();
          const activeConstructReset = stateAfterLoad.activeConstruct === 'NONE';
          const invulnerableReset = stateAfterLoad.isConstructInvulnerable === false;
          const endTimeReset = stateAfterLoad.constructInvulnerabilityEndTime === 0;
          
          return activeConstructSet && invulnerableSet && endTimeSet &&
                 activeConstructReset && invulnerableReset && endTimeReset;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Echo Constructs Unlock Persistence Properties', () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * **Feature: echo-constructs, Property 17: Unlock Persistence**
   * **Validates: Requirements 8.2, 8.3, 8.4**
   *
   * For any unlock event, unlockedConstructs SHALL be persisted.
   * After save/load cycle, unlocked constructs should remain unlocked.
   */
  test('Unlocked constructs persist after save/load cycle', () => {
    fc.assert(
      fc.property(
        constructTypeArb,
        (constructToUnlock) => {
          // Reset store
          resetStore();
          
          // Get initial unlocked constructs (should be ['TITAN'] by default)
          const initialUnlocked = [...useGameStore.getState().unlockedConstructs];
          
          // Skip if construct is already unlocked
          fc.pre(!initialUnlocked.includes(constructToUnlock));
          
          // Unlock the construct
          useGameStore.getState().unlockConstruct(constructToUnlock);
          
          // Verify construct was unlocked
          const afterUnlock = useGameStore.getState().unlockedConstructs;
          const wasUnlocked = afterUnlock.includes(constructToUnlock);
          
          // Save to storage
          useGameStore.getState().saveToStorage();
          
          // Reset state to simulate fresh load
          useGameStore.setState({
            unlockedConstructs: ['TITAN'], // Reset to default
          });
          
          // Load from storage
          useGameStore.getState().loadFromStorage();
          
          // After load, construct should still be unlocked
          const afterLoad = useGameStore.getState().unlockedConstructs;
          const stillUnlocked = afterLoad.includes(constructToUnlock);
          
          return wasUnlocked && stillUnlocked;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-constructs, Property 17: Unlock Persistence (Default Titan)**
   * **Validates: Requirements 8.1**
   *
   * Titan Resonance SHALL be the default unlocked Construct.
   */
  test('Titan is default unlocked construct', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // No input needed, just verify default state
        () => {
          // Reset store to defaults
          resetStore();
          
          const state = useGameStore.getState();
          
          // Titan should be in unlocked constructs by default
          const titanUnlocked = state.unlockedConstructs.includes('TITAN');
          
          // PHASE and BLINK should NOT be unlocked by default
          const phaseNotUnlocked = !state.unlockedConstructs.includes('PHASE');
          const blinkNotUnlocked = !state.unlockedConstructs.includes('BLINK');
          
          return titanUnlocked && phaseNotUnlocked && blinkNotUnlocked;
        }
      ),
      { numRuns: 100 }
    );
  });
});
