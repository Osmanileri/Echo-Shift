/**
 * Property-Based Tests for Game Store Purchase System
 * Uses fast-check for property-based testing
 */

import { describe, test, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useGameStore, ItemCategory } from './gameStore';

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
