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
    // Campaign Update v2.5 State
    lastPlayedLevel: 1,
    levelStats: {},
    levelSession: null,
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

// ============================================================================
// Campaign Update v2.5 Persistence Properties - Requirements 1.4, 10.2, 10.4
// ============================================================================

// Arbitrary for level IDs (1-100)
const levelIdArb = fc.integer({ min: 1, max: 100 });

// Arbitrary for star ratings (1-3, 0 means not completed)
const starRatingArb = fc.integer({ min: 1, max: 3 });

// Arbitrary for LevelResult
const levelResultArb = fc.record({
  completed: fc.constant(true),
  distanceTraveled: fc.integer({ min: 100, max: 10000 }),
  shardsCollected: fc.integer({ min: 0, max: 100 }),
  totalShardsAvailable: fc.integer({ min: 10, max: 100 }),
  damageTaken: fc.integer({ min: 0, max: 10 }),
  healthRemaining: fc.integer({ min: 1, max: 3 }),
});

describe('Campaign Update v2.5 Persistence Properties', () => {
  beforeEach(() => {
    resetStore();
  });

  /**
   * **Feature: campaign-update-v25, Property 21: Star rating persistence**
   * **Validates: Requirements 10.2**
   *
   * For any level completion, the star rating SHALL be persisted to storage
   * and retrievable after a save/load cycle.
   */
  test('Star rating persists after save/load cycle', () => {
    fc.assert(
      fc.property(
        levelIdArb,
        starRatingArb,
        (levelId, stars) => {
          // Reset store
          resetStore();
          
          // Complete the level with the given star rating
          useGameStore.getState().completeLevel(levelId, stars);
          
          // Verify star rating was set
          const stateBeforeSave = useGameStore.getState();
          const starsSet = stateBeforeSave.levelStars[levelId] === stars;
          
          // Save to storage
          useGameStore.getState().saveToStorage();
          
          // Reset state to simulate fresh load
          useGameStore.setState({
            levelStars: {},
            completedLevels: [],
          });
          
          // Load from storage
          useGameStore.getState().loadFromStorage();
          
          // After load, star rating should be preserved
          const stateAfterLoad = useGameStore.getState();
          const starsPreserved = stateAfterLoad.levelStars[levelId] === stars;
          
          return starsSet && starsPreserved;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 22: Higher star rating update**
   * **Validates: Requirements 10.4**
   *
   * For any replay achieving higher stars, the stored rating SHALL be updated
   * to the new value. Lower ratings should not overwrite higher ones.
   */
  test('Higher star rating updates stored value, lower does not', () => {
    fc.assert(
      fc.property(
        levelIdArb,
        starRatingArb,
        starRatingArb,
        (levelId, firstStars, secondStars) => {
          // Reset store
          resetStore();
          
          // Complete the level with first star rating
          useGameStore.getState().completeLevel(levelId, firstStars);
          
          // Verify first rating was set
          const stateAfterFirst = useGameStore.getState();
          const firstRatingSet = stateAfterFirst.levelStars[levelId] === firstStars;
          
          // Complete the level again with second star rating
          useGameStore.getState().completeLevel(levelId, secondStars);
          
          // After second completion, the stored rating should be the maximum
          const stateAfterSecond = useGameStore.getState();
          const expectedStars = Math.max(firstStars, secondStars);
          const maxRatingStored = stateAfterSecond.levelStars[levelId] === expectedStars;
          
          return firstRatingSet && maxRatingStored;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 23: Last played level persistence**
   * **Validates: Requirements 1.4**
   *
   * For any level played, the lastPlayedLevel SHALL be persisted and restored
   * on game launch.
   */
  test('Last played level persists after save/load cycle', () => {
    fc.assert(
      fc.property(
        levelIdArb,
        (levelId) => {
          // Reset store
          resetStore();
          
          // Set last played level
          useGameStore.getState().setLastPlayedLevel(levelId);
          
          // Verify last played level was set
          const stateBeforeSave = useGameStore.getState();
          const levelSet = stateBeforeSave.lastPlayedLevel === levelId;
          
          // Save to storage
          useGameStore.getState().saveToStorage();
          
          // Reset state to simulate fresh load
          useGameStore.setState({
            lastPlayedLevel: 1, // Reset to default
          });
          
          // Load from storage
          useGameStore.getState().loadFromStorage();
          
          // After load, last played level should be preserved
          const stateAfterLoad = useGameStore.getState();
          const levelPreserved = stateAfterLoad.lastPlayedLevel === levelId;
          
          return levelSet && levelPreserved;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Property 21+: Level stats persistence**
   * **Validates: Requirements 10.2, 10.4**
   *
   * For any level completion using completeLevelWithResult, the level stats
   * SHALL be persisted and retrievable after a save/load cycle.
   */
  test('Level stats persist after save/load cycle', () => {
    fc.assert(
      fc.property(
        levelIdArb,
        levelResultArb,
        (levelId, result) => {
          // Reset store
          resetStore();
          
          // Ensure totalShardsAvailable >= shardsCollected
          const adjustedResult = {
            ...result,
            totalShardsAvailable: Math.max(result.totalShardsAvailable, result.shardsCollected),
          };
          
          // Complete the level with result
          useGameStore.getState().completeLevelWithResult(levelId, adjustedResult);
          
          // Verify level stats were set
          const stateBeforeSave = useGameStore.getState();
          const statsExist = stateBeforeSave.levelStats[levelId] !== undefined;
          const statsCorrect = statsExist && 
            stateBeforeSave.levelStats[levelId].bestDistance === adjustedResult.distanceTraveled &&
            stateBeforeSave.levelStats[levelId].bestShardsCollected === adjustedResult.shardsCollected;
          
          // Save to storage
          useGameStore.getState().saveToStorage();
          
          // Reset state to simulate fresh load
          useGameStore.setState({
            levelStats: {},
          });
          
          // Load from storage
          useGameStore.getState().loadFromStorage();
          
          // After load, level stats should be preserved
          const stateAfterLoad = useGameStore.getState();
          const statsPreserved = stateAfterLoad.levelStats[levelId] !== undefined &&
            stateAfterLoad.levelStats[levelId].bestDistance === adjustedResult.distanceTraveled &&
            stateAfterLoad.levelStats[levelId].bestShardsCollected === adjustedResult.shardsCollected;
          
          return statsExist && statsCorrect && statsPreserved;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: campaign-update-v25, Session state not persisted**
   * **Validates: Requirements 2.2, 2.3, 2.4**
   *
   * For any serialization, levelSession SHALL NOT be persisted (session-only).
   * After save/load cycle, levelSession should be null.
   */
  test('Level session resets after save/load cycle', () => {
    fc.assert(
      fc.property(
        levelIdArb,
        fc.integer({ min: 100, max: 10000 }),
        (levelId, targetDistance) => {
          // Reset store
          resetStore();
          
          // Start a level session
          useGameStore.getState().startLevelSession(levelId, targetDistance);
          
          // Verify session was started
          const stateBeforeSave = useGameStore.getState();
          const sessionStarted = stateBeforeSave.levelSession !== null &&
            stateBeforeSave.levelSession.levelId === levelId;
          
          // Save to storage
          useGameStore.getState().saveToStorage();
          
          // Load from storage (simulates app restart)
          useGameStore.getState().loadFromStorage();
          
          // After load, session should be null (session-only state)
          const stateAfterLoad = useGameStore.getState();
          const sessionReset = stateAfterLoad.levelSession === null;
          
          return sessionStarted && sessionReset;
        }
      ),
      { numRuns: 100 }
    );
  });
});
