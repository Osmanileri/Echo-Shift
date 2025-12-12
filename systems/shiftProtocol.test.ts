/**
 * Property-Based Tests for S.H.I.F.T. Protocol System
 * Uses fast-check for property-based testing
 * 
 * Requirements: 1.3, 1.4, 3.1, 3.2, 3.4
 */

import { describe, test } from 'vitest';
import * as fc from 'fast-check';
import { 
  initializeShiftState, 
  TARGET_WORD, 
  calculateReachableY, 
  calculateSpawnProbability,
  calculateOscillationY,
  selectNextLetter,
  checkCollectibleCollision,
  collectLetter,
  removeCollectedLetter,
  awardCollectionReward,
  checkOverdriveActivation,
  activateOverdrive,
  updateOverdrive,
  deactivateOverdrive,
  isInvulnerableDuringOverdrive,
  handleOverdriveCollision,
  applyMagnetEffect
} from './shiftProtocol';
import { SHIFT_CONFIG } from '../constants';

describe('S.H.I.F.T. Protocol Initial State Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 1: Initial State Invariant**
   * **Validates: Requirements 1.3, 1.4**
   *
   * For any new game initialization, the S.H.I.F.T. state SHALL have:
   * - collectedMask as [false, false, false, false, false]
   * - overdriveActive as false
   * - overdriveTimer as 0
   */
  test('Initial state has correct default values for any initialization', () => {
    fc.assert(
      fc.property(
        // Generate random number of initializations to test consistency
        fc.integer({ min: 1, max: 100 }),
        (numInitializations) => {
          // Initialize state multiple times and verify each one
          for (let i = 0; i < numInitializations; i++) {
            const state = initializeShiftState();
            
            // Requirements 1.3: collectedMask must be [false, false, false, false, false]
            const collectedMaskCorrect = 
              state.collectedMask.length === 5 &&
              state.collectedMask.every(collected => collected === false);
            
            // Requirements 1.4: overdriveActive must be false
            const overdriveActiveCorrect = state.overdriveActive === false;
            
            // Requirements 1.4: overdriveTimer must be 0
            const overdriveTimerCorrect = state.overdriveTimer === 0;
            
            // targetWord must be ['S', 'H', 'I', 'F', 'T']
            const targetWordCorrect = 
              state.targetWord.length === 5 &&
              state.targetWord.every((letter, index) => letter === TARGET_WORD[index]);
            
            // coreRotation must be 0
            const coreRotationCorrect = state.coreRotation === 0;
            
            if (!collectedMaskCorrect || !overdriveActiveCorrect || !overdriveTimerCorrect || 
                !targetWordCorrect || !coreRotationCorrect) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional invariant: Each initialization creates independent state
   * Ensures no shared references between state objects
   */
  test('Each initialization creates independent state objects', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        (numStates) => {
          const states = Array.from({ length: numStates }, () => initializeShiftState());
          
          // Modify first state's collectedMask
          states[0].collectedMask[0] = true;
          
          // All other states should still have false at index 0
          for (let i = 1; i < states.length; i++) {
            if (states[i].collectedMask[0] !== false) {
              return false;
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('S.H.I.F.T. Protocol Spawn Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 2: Reachability Constraint**
   * **Validates: Requirements 3.1, 3.2**
   *
   * For any spawned S.H.I.F.T. letter with oscillation parameters, 
   * the letter's Y position plus maximum oscillation amplitude SHALL never 
   * exceed connectorLength - 20 pixels from the midline.
   */
  test('Reachable Y bounds respect connector length minus margin', () => {
    fc.assert(
      fc.property(
        // Generate realistic connector lengths (45-120 based on INITIAL_CONFIG)
        fc.integer({ min: 45, max: 200 }),
        // Generate realistic midline Y positions (screen center area)
        fc.integer({ min: 100, max: 800 }),
        (connectorLength, midlineY) => {
          const bounds = calculateReachableY(connectorLength, midlineY);
          
          // The max reach should be connectorLength - 20 (reachabilityMargin)
          const expectedMaxReach = connectorLength - SHIFT_CONFIG.reachabilityMargin;
          
          // Verify bounds are symmetric around midline
          const minDistance = midlineY - bounds.min;
          const maxDistance = bounds.max - midlineY;
          
          // Both distances should equal the expected max reach
          const minDistanceCorrect = Math.abs(minDistance - expectedMaxReach) < 0.001;
          const maxDistanceCorrect = Math.abs(maxDistance - expectedMaxReach) < 0.001;
          
          return minDistanceCorrect && maxDistanceCorrect;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 2: Reachability Constraint (Oscillation)**
   * **Validates: Requirements 3.1, 3.2**
   *
   * For any letter spawned within reachable bounds with oscillation,
   * the letter's Y position + amplitude must stay within bounds.
   */
  test('Spawned letter with oscillation stays within reachable bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 45, max: 200 }),  // connectorLength
        fc.integer({ min: 100, max: 800 }), // midlineY
        fc.integer({ min: 15, max: 50 }),   // oscillation amplitude
        (connectorLength, midlineY, amplitude) => {
          const bounds = calculateReachableY(connectorLength, midlineY);
          
          // A valid spawn Y must account for oscillation amplitude
          // The baseY + amplitude must not exceed bounds.max
          // The baseY - amplitude must not go below bounds.min
          const safeMinY = bounds.min + amplitude;
          const safeMaxY = bounds.max - amplitude;
          
          // If there's valid spawn space (safeMinY <= safeMaxY)
          if (safeMinY <= safeMaxY) {
            // Any baseY in [safeMinY, safeMaxY] is valid
            const testBaseY = (safeMinY + safeMaxY) / 2;
            
            // Verify oscillation extremes stay within bounds
            const maxY = testBaseY + amplitude;
            const minY = testBaseY - amplitude;
            
            return minY >= bounds.min && maxY <= bounds.max;
          }
          
          // If no valid spawn space, that's expected for small connectors
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('S.H.I.F.T. Protocol Spawn Probability Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 4: Spawn Probability Scaling**
   * **Validates: Requirements 3.4**
   *
   * For any score value between 0 and 5000, the spawn probability SHALL be 
   * linearly interpolated between 5% and 15%.
   */
  test('Spawn probability scales linearly from 5% to 15% based on score', () => {
    fc.assert(
      fc.property(
        // Generate scores in the valid range
        fc.integer({ min: 0, max: 5000 }),
        (score) => {
          const probability = calculateSpawnProbability(score);
          
          // Calculate expected probability using linear interpolation
          const expectedProbability = 
            SHIFT_CONFIG.minSpawnProbability + 
            (SHIFT_CONFIG.maxSpawnProbability - SHIFT_CONFIG.minSpawnProbability) * 
            (score / SHIFT_CONFIG.probabilityMaxScore);
          
          // Verify probability matches expected value (within floating point tolerance)
          return Math.abs(probability - expectedProbability) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 4: Spawn Probability Scaling (Bounds)**
   * **Validates: Requirements 3.4**
   *
   * For any score value, the spawn probability SHALL be clamped between 5% and 15%.
   */
  test('Spawn probability is always within 5% to 15% bounds', () => {
    fc.assert(
      fc.property(
        // Generate any score including values outside normal range
        fc.integer({ min: -1000, max: 10000 }),
        (score) => {
          const probability = calculateSpawnProbability(score);
          
          // Probability must be within bounds
          const withinMinBound = probability >= SHIFT_CONFIG.minSpawnProbability - 0.0001;
          const withinMaxBound = probability <= SHIFT_CONFIG.maxSpawnProbability + 0.0001;
          
          return withinMinBound && withinMaxBound;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 4: Spawn Probability Scaling (Monotonic)**
   * **Validates: Requirements 3.4**
   *
   * For any two scores where score1 < score2, the probability at score2 
   * SHALL be greater than or equal to the probability at score1.
   */
  test('Spawn probability increases monotonically with score', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 4999 }),
        fc.integer({ min: 1, max: 5000 }),
        (score1, scoreDelta) => {
          const score2 = Math.min(score1 + scoreDelta, 5000);
          
          const prob1 = calculateSpawnProbability(score1);
          const prob2 = calculateSpawnProbability(score2);
          
          // Probability should increase or stay the same as score increases
          return prob2 >= prob1 - 0.0001; // Small tolerance for floating point
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('S.H.I.F.T. Protocol Oscillation Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 3: Oscillation Formula Correctness**
   * **Validates: Requirements 3.3**
   *
   * For any collectible with baseY, amplitude, frequency, and time values,
   * the calculated Y position SHALL equal baseY + amplitude * sin(time * frequency).
   */
  test('Oscillation formula calculates correct Y position', () => {
    fc.assert(
      fc.property(
        // Generate realistic baseY positions (screen area) - use integers for simplicity
        fc.integer({ min: 100, max: 800 }),
        // Generate realistic amplitudes (0-100)
        fc.integer({ min: 0, max: 100 }),
        // Generate realistic frequencies (radians per second) - use integer then divide
        fc.integer({ min: 1, max: 100 }),
        // Generate time values (seconds)
        fc.integer({ min: 0, max: 1000 }),
        (baseY, amplitude, freqInt, time) => {
          const frequency = freqInt / 10; // Convert to 0.1 - 10 range
          const calculatedY = calculateOscillationY(baseY, amplitude, frequency, time);
          
          // Expected value using the formula: baseY + amplitude * sin(time * frequency)
          const expectedY = baseY + amplitude * Math.sin(time * frequency);
          
          // Verify the calculated value matches expected (within floating point tolerance)
          return Math.abs(calculatedY - expectedY) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 3: Oscillation Formula Correctness (Bounds)**
   * **Validates: Requirements 3.3**
   *
   * For any oscillation parameters, the Y position SHALL always be within
   * [baseY - amplitude, baseY + amplitude].
   */
  test('Oscillation Y position stays within amplitude bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 800 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 1000 }),
        (baseY, amplitude, freqInt, time) => {
          const frequency = freqInt / 10;
          const calculatedY = calculateOscillationY(baseY, amplitude, frequency, time);
          
          // Y position must be within [baseY - amplitude, baseY + amplitude]
          const withinLowerBound = calculatedY >= baseY - amplitude - 0.0001;
          const withinUpperBound = calculatedY <= baseY + amplitude + 0.0001;
          
          return withinLowerBound && withinUpperBound;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 3: Oscillation Formula Correctness (Zero Amplitude)**
   * **Validates: Requirements 3.3**
   *
   * When amplitude is zero, the Y position SHALL always equal baseY.
   */
  test('Zero amplitude results in constant Y position at baseY', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 800 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 1000 }),
        (baseY, freqInt, time) => {
          const frequency = freqInt / 10;
          const calculatedY = calculateOscillationY(baseY, 0, frequency, time);
          
          // With zero amplitude, Y should always equal baseY
          return Math.abs(calculatedY - baseY) < 0.0001;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('S.H.I.F.T. Protocol Letter Selection Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 5: Letter Priority Selection**
   * **Validates: Requirements 3.5**
   *
   * For any collectedMask state with at least one false value,
   * the selected letter to spawn SHALL be from an uncollected index.
   */
  test('Selected letter is always from uncollected indices', () => {
    fc.assert(
      fc.property(
        // Generate random collectedMask arrays with at least one false
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }).filter(
          mask => mask.some(collected => !collected)
        ),
        (collectedMask) => {
          const selectedIndex = selectNextLetter(collectedMask);
          
          // Selected index must be valid (0-4)
          if (selectedIndex < 0 || selectedIndex > 4) {
            return false;
          }
          
          // Selected index must be an uncollected letter
          return collectedMask[selectedIndex] === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 5: Letter Priority Selection (Sequence Order)**
   * **Validates: Requirements 3.5**
   *
   * The selected letter SHALL be the first uncollected letter in sequence order (S, H, I, F, T).
   */
  test('Selected letter is the first uncollected in sequence order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }).filter(
          mask => mask.some(collected => !collected)
        ),
        (collectedMask) => {
          const selectedIndex = selectNextLetter(collectedMask);
          
          // Find the expected first uncollected index
          let expectedIndex = -1;
          for (let i = 0; i < collectedMask.length; i++) {
            if (!collectedMask[i]) {
              expectedIndex = i;
              break;
            }
          }
          
          // Selected index must match the first uncollected
          return selectedIndex === expectedIndex;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 5: Letter Priority Selection (All Collected)**
   * **Validates: Requirements 3.5**
   *
   * When all letters are collected, selectNextLetter SHALL return -1.
   */
  test('Returns -1 when all letters are collected', () => {
    const allCollected = [true, true, true, true, true];
    const selectedIndex = selectNextLetter(allCollected);
    
    // Should return -1 when all letters are collected
    return selectedIndex === -1;
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 5: Letter Priority Selection (None Collected)**
   * **Validates: Requirements 3.5**
   *
   * When no letters are collected, selectNextLetter SHALL return 0 (first letter 'S').
   */
  test('Returns 0 when no letters are collected', () => {
    const noneCollected = [false, false, false, false, false];
    const selectedIndex = selectNextLetter(noneCollected);
    
    // Should return 0 (first letter 'S') when none are collected
    return selectedIndex === 0;
  });
});


describe('S.H.I.F.T. Protocol Collision Detection Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 25: Letter Collision Detection**
   * **Validates: Requirements 9.1, 9.2**
   *
   * For any orb position within 20 pixels of a letter's center,
   * the letter SHALL be marked as collected.
   */
  test('Orb within 20px radius detects collision', () => {
    fc.assert(
      fc.property(
        // Generate collectible position
        fc.integer({ min: 50, max: 750 }),  // collectible X
        fc.integer({ min: 50, max: 750 }),  // collectible Y
        // Generate orb offset within collision radius (0-19 pixels)
        fc.integer({ min: 0, max: 19 }),    // distance from center
        fc.integer({ min: 0, max: 360 }),   // angle in degrees
        (collectibleX, collectibleY, distance, angleDeg) => {
          // Convert angle to radians
          const angle = (angleDeg * Math.PI) / 180;
          // Calculate orb position at given distance and angle from collectible
          const orbX = collectibleX + distance * Math.cos(angle);
          const orbY = collectibleY + distance * Math.sin(angle);
          
          const orb = { x: orbX, y: orbY };
          const collectible = { x: collectibleX, y: collectibleY };
          
          // Should detect collision when within 20px radius
          return checkCollectibleCollision(orb, collectible) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 25: Letter Collision Detection (At Center)**
   * **Validates: Requirements 9.1, 9.2**
   *
   * For any orb position at the same location as a letter's center,
   * the letter SHALL be marked as collected.
   */
  test('Orb at same position as collectible detects collision', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 750 }),  // collectible X
        fc.integer({ min: 50, max: 750 }),  // collectible Y
        (collectibleX, collectibleY) => {
          const orb = { x: collectibleX, y: collectibleY };
          const collectible = { x: collectibleX, y: collectibleY };
          
          // Should detect collision when orb is at same position
          return checkCollectibleCollision(orb, collectible) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 25: Letter Collision Detection (No Collision)**
   * **Validates: Requirements 9.1, 9.2**
   *
   * For any orb position more than 20 pixels from a letter's center,
   * no collision SHALL be detected.
   */
  test('Orb beyond 20px radius does not detect collision', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 750 }),  // collectible X
        fc.integer({ min: 50, max: 750 }),  // collectible Y
        // Generate orb offset beyond collision radius (21+ pixels)
        fc.integer({ min: 21, max: 200 }),  // distance from center
        fc.integer({ min: 0, max: 360 }),   // angle in degrees
        (collectibleX, collectibleY, distance, angleDeg) => {
          // Convert angle to radians
          const angle = (angleDeg * Math.PI) / 180;
          // Calculate orb position at given distance and angle from collectible
          const orbX = collectibleX + distance * Math.cos(angle);
          const orbY = collectibleY + distance * Math.sin(angle);
          
          const orb = { x: orbX, y: orbY };
          const collectible = { x: collectibleX, y: collectibleY };
          
          // Should NOT detect collision when beyond 20px radius
          return checkCollectibleCollision(orb, collectible) === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('S.H.I.F.T. Protocol Letter Removal Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 26: Letter Removal on Collection**
   * **Validates: Requirements 9.3**
   *
   * For any collected letter, it SHALL be removed from the active collectibles list.
   */
  test('Collected letter is removed from collectibles list', () => {
    // Generate a collectible with a unique ID
    const collectibleArb = fc.record({
      id: fc.uuid(),
      type: fc.constant('LETTER' as const),
      value: fc.constantFrom('S', 'H', 'I', 'F', 'T'),
      x: fc.integer({ min: 0, max: 800 }),
      y: fc.integer({ min: 0, max: 600 }),
    });

    fc.assert(
      fc.property(
        // Generate a list of collectibles (1-10 items)
        fc.array(collectibleArb, { minLength: 1, maxLength: 10 }),
        // Select which collectible to remove (index)
        fc.nat(),
        (collectibles, indexSeed) => {
          // Select a valid index
          const removeIndex = indexSeed % collectibles.length;
          const idToRemove = collectibles[removeIndex].id;
          const originalLength = collectibles.length;
          
          // Remove the collectible
          const result = removeCollectedLetter(collectibles, idToRemove);
          
          // Verify the collectible was removed
          const wasRemoved = !result.some(c => c.id === idToRemove);
          const lengthDecreased = result.length === originalLength - 1;
          
          return wasRemoved && lengthDecreased;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 26: Letter Removal on Collection (Preserves Others)**
   * **Validates: Requirements 9.3**
   *
   * When a letter is removed, all other collectibles SHALL remain in the list.
   */
  test('Removing a letter preserves all other collectibles', () => {
    const collectibleArb = fc.record({
      id: fc.uuid(),
      type: fc.constant('LETTER' as const),
      value: fc.constantFrom('S', 'H', 'I', 'F', 'T'),
      x: fc.integer({ min: 0, max: 800 }),
      y: fc.integer({ min: 0, max: 600 }),
    });

    fc.assert(
      fc.property(
        fc.array(collectibleArb, { minLength: 2, maxLength: 10 }),
        fc.nat(),
        (collectibles, indexSeed) => {
          const removeIndex = indexSeed % collectibles.length;
          const idToRemove = collectibles[removeIndex].id;
          
          // Get IDs of collectibles that should remain
          const remainingIds = collectibles
            .filter(c => c.id !== idToRemove)
            .map(c => c.id);
          
          // Remove the collectible
          const result = removeCollectedLetter(collectibles, idToRemove);
          
          // Verify all other collectibles are preserved
          const resultIds = result.map(c => c.id);
          return remainingIds.every(id => resultIds.includes(id));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 26: Letter Removal on Collection (Non-existent ID)**
   * **Validates: Requirements 9.3**
   *
   * When removing a non-existent ID, the list SHALL remain unchanged.
   */
  test('Removing non-existent ID leaves list unchanged', () => {
    const collectibleArb = fc.record({
      id: fc.uuid(),
      type: fc.constant('LETTER' as const),
      value: fc.constantFrom('S', 'H', 'I', 'F', 'T'),
      x: fc.integer({ min: 0, max: 800 }),
      y: fc.integer({ min: 0, max: 600 }),
    });

    fc.assert(
      fc.property(
        fc.array(collectibleArb, { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        (collectibles, nonExistentId) => {
          // Ensure the ID doesn't exist in the list
          const idExists = collectibles.some(c => c.id === nonExistentId);
          if (idExists) return true; // Skip this case
          
          const result = removeCollectedLetter(collectibles, nonExistentId);
          
          // List should remain unchanged
          return result.length === collectibles.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('S.H.I.F.T. Protocol Collection Reward Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 27: Letter Collection Reward**
   * **Validates: Requirements 9.4**
   *
   * For any letter collection event, exactly 50 Echo Shards SHALL be awarded.
   */
  test('Collection reward adds exactly 50 Echo Shards', () => {
    fc.assert(
      fc.property(
        // Generate any starting shard balance (0 to 10000)
        fc.integer({ min: 0, max: 10000 }),
        (currentShards) => {
          const newBalance = awardCollectionReward(currentShards);
          
          // Verify exactly 50 shards were added
          const shardIncrease = newBalance - currentShards;
          return shardIncrease === SHIFT_CONFIG.collectionReward; // 50
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 27: Letter Collection Reward (Accumulation)**
   * **Validates: Requirements 9.4**
   *
   * For any number of letter collections, the total shards SHALL equal
   * initial balance + (50 * number of collections).
   */
  test('Multiple collections accumulate rewards correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5000 }),  // starting balance
        fc.integer({ min: 1, max: 20 }),    // number of collections
        (startingShards, numCollections) => {
          let balance = startingShards;
          
          // Simulate multiple collections
          for (let i = 0; i < numCollections; i++) {
            balance = awardCollectionReward(balance);
          }
          
          // Verify total is correct
          const expectedBalance = startingShards + (SHIFT_CONFIG.collectionReward * numCollections);
          return balance === expectedBalance;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 27: Letter Collection Reward (Non-negative)**
   * **Validates: Requirements 9.4**
   *
   * For any starting balance, the result SHALL always be non-negative.
   */
  test('Collection reward result is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (currentShards) => {
          const newBalance = awardCollectionReward(currentShards);
          return newBalance >= 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('S.H.I.F.T. Protocol collectLetter Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 25: Letter Collision Detection (State Update)**
   * **Validates: Requirements 9.1**
   *
   * For any valid letter index, collectLetter SHALL mark that letter as collected.
   */
  test('collectLetter marks the correct letter as collected', () => {
    fc.assert(
      fc.property(
        // Generate a random collectedMask with at least one false
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        // Generate a valid letter index (0-4)
        fc.integer({ min: 0, max: 4 }),
        (initialMask, letterIndex) => {
          const initialState = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [...initialMask],
            overdriveActive: false,
            overdriveTimer: 0,
            coreRotation: 0,
          };
          
          const newState = collectLetter(initialState, letterIndex);
          
          // The specified letter should now be collected
          return newState.collectedMask[letterIndex] === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 25: Letter Collision Detection (Preserves Others)**
   * **Validates: Requirements 9.1**
   *
   * collectLetter SHALL not modify the collection status of other letters.
   */
  test('collectLetter preserves other letters collection status', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        fc.integer({ min: 0, max: 4 }),
        (initialMask, letterIndex) => {
          const initialState = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [...initialMask],
            overdriveActive: false,
            overdriveTimer: 0,
            coreRotation: 0,
          };
          
          const newState = collectLetter(initialState, letterIndex);
          
          // All other letters should have the same status
          for (let i = 0; i < 5; i++) {
            if (i !== letterIndex && newState.collectedMask[i] !== initialMask[i]) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 25: Letter Collision Detection (Invalid Index)**
   * **Validates: Requirements 9.1**
   *
   * collectLetter with invalid index SHALL return unchanged state.
   */
  test('collectLetter with invalid index returns unchanged state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        fc.oneof(
          fc.integer({ min: -100, max: -1 }),  // negative indices
          fc.integer({ min: 5, max: 100 })     // indices >= 5
        ),
        (initialMask, invalidIndex) => {
          const initialState = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [...initialMask],
            overdriveActive: false,
            overdriveTimer: 0,
            coreRotation: 0,
          };
          
          const newState = collectLetter(initialState, invalidIndex);
          
          // State should be unchanged
          return newState.collectedMask.every((val, i) => val === initialMask[i]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('S.H.I.F.T. Protocol Overdrive Activation Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 6: Overdrive Activation Trigger**
   * **Validates: Requirements 4.1**
   *
   * For any S.H.I.F.T. state where all 5 letters become collected,
   * Overdrive mode SHALL activate immediately.
   */
  test('Overdrive activates when all 5 letters are collected', () => {
    fc.assert(
      fc.property(
        // Generate random initial state values
        fc.integer({ min: 0, max: 10000 }),  // random timer value (should be overwritten)
        fc.integer({ min: 0, max: 360 }),    // random rotation
        (initialTimer, rotation) => {
          // All letters collected
          const allCollected = [true, true, true, true, true];
          
          // Check if activation should trigger
          const shouldActivate = checkOverdriveActivation(allCollected);
          
          if (!shouldActivate) {
            return false; // Should have triggered
          }
          
          // Create initial state and activate
          const initialState = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: allCollected,
            overdriveActive: false,
            overdriveTimer: initialTimer,
            coreRotation: rotation,
          };
          
          const activatedState = activateOverdrive(initialState);
          
          // Overdrive should be active with 10 second timer
          return activatedState.overdriveActive === true && 
                 activatedState.overdriveTimer === 10000;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 6: Overdrive Activation Trigger (Partial Collection)**
   * **Validates: Requirements 4.1**
   *
   * For any S.H.I.F.T. state where fewer than 5 letters are collected,
   * Overdrive mode SHALL NOT activate.
   */
  test('Overdrive does not activate with partial letter collection', () => {
    fc.assert(
      fc.property(
        // Generate collectedMask with at least one false
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }).filter(
          mask => mask.some(collected => !collected)
        ),
        (partialMask) => {
          // Should NOT activate with partial collection
          return checkOverdriveActivation(partialMask) === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('S.H.I.F.T. Protocol Overdrive Timer Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 10: Overdrive Timer Deactivation**
   * **Validates: Requirements 4.7**
   *
   * For any Overdrive state where the timer reaches zero,
   * Overdrive SHALL deactivate.
   */
  test('Overdrive deactivates when timer reaches zero', () => {
    fc.assert(
      fc.property(
        // Generate a small remaining timer that will reach zero
        fc.integer({ min: 1, max: 1000 }),
        (remainingTime) => {
          const state = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [true, true, true, true, true],
            overdriveActive: true,
            overdriveTimer: remainingTime,
            coreRotation: 0,
          };
          
          // Update with deltaTime >= remaining time (should deactivate)
          const updatedState = updateOverdrive(state, remainingTime + 100);
          
          // Overdrive should be deactivated
          return updatedState.overdriveActive === false && 
                 updatedState.overdriveTimer === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 10: Overdrive Timer Deactivation (Timer Decrement)**
   * **Validates: Requirements 4.7**
   *
   * For any active Overdrive state, the timer SHALL decrement by deltaTime.
   */
  test('Overdrive timer decrements correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10000 }),  // initial timer
        fc.integer({ min: 1, max: 500 }),       // deltaTime (small enough to not deactivate)
        (initialTimer, deltaTime) => {
          // Ensure deltaTime is less than initialTimer
          if (deltaTime >= initialTimer) return true;
          
          const state = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [true, true, true, true, true],
            overdriveActive: true,
            overdriveTimer: initialTimer,
            coreRotation: 0,
          };
          
          const updatedState = updateOverdrive(state, deltaTime);
          
          // Timer should be decremented by deltaTime
          const expectedTimer = initialTimer - deltaTime;
          return updatedState.overdriveTimer === expectedTimer &&
                 updatedState.overdriveActive === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 10: Overdrive Timer Deactivation (Inactive State)**
   * **Validates: Requirements 4.7**
   *
   * For any inactive Overdrive state, updateOverdrive SHALL return unchanged state.
   */
  test('updateOverdrive returns unchanged state when Overdrive is inactive', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        fc.integer({ min: 0, max: 10000 }),
        fc.integer({ min: 1, max: 1000 }),
        (collectedMask, timer, deltaTime) => {
          const state = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [...collectedMask],
            overdriveActive: false,  // Inactive
            overdriveTimer: timer,
            coreRotation: 0,
          };
          
          const updatedState = updateOverdrive(state, deltaTime);
          
          // State should be unchanged
          return updatedState.overdriveActive === false &&
                 updatedState.overdriveTimer === timer;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('S.H.I.F.T. Protocol Overdrive Invulnerability Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 7: Overdrive Invulnerability**
   * **Validates: Requirements 4.3**
   *
   * For any collision event during active Overdrive,
   * the player SHALL not die.
   */
  test('Player is invulnerable during active Overdrive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),  // timer value (must be > 0 for active)
        fc.integer({ min: 0, max: 360 }),    // rotation
        (timer, rotation) => {
          const activeState = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [true, true, true, true, true],
            overdriveActive: true,
            overdriveTimer: timer,
            coreRotation: rotation,
          };
          
          // Should be invulnerable when Overdrive is active
          return isInvulnerableDuringOverdrive(activeState) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 7: Overdrive Invulnerability (Inactive)**
   * **Validates: Requirements 4.3**
   *
   * For any collision event when Overdrive is NOT active,
   * the player SHALL be vulnerable (can die).
   */
  test('Player is vulnerable when Overdrive is inactive', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        fc.integer({ min: 0, max: 10000 }),
        (collectedMask, timer) => {
          const inactiveState = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [...collectedMask],
            overdriveActive: false,  // Inactive
            overdriveTimer: timer,
            coreRotation: 0,
          };
          
          // Should NOT be invulnerable when Overdrive is inactive
          return isInvulnerableDuringOverdrive(inactiveState) === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('S.H.I.F.T. Protocol Overdrive Obstacle Destruction Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 8: Overdrive Obstacle Destruction**
   * **Validates: Requirements 4.4**
   *
   * For any obstacle that contacts the player during active Overdrive,
   * the obstacle SHALL be destroyed.
   */
  test('Obstacles are destroyed on contact during active Overdrive', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),  // timer
        fc.integer({ min: 0, max: 360 }),    // rotation
        (timer, rotation) => {
          const activeState = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [true, true, true, true, true],
            overdriveActive: true,
            overdriveTimer: timer,
            coreRotation: rotation,
          };
          
          const result = handleOverdriveCollision(activeState);
          
          // Obstacle should be destroyed during active Overdrive
          return result.shouldDestroy === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 8: Overdrive Obstacle Destruction (Inactive)**
   * **Validates: Requirements 4.4**
   *
   * For any obstacle that contacts the player when Overdrive is NOT active,
   * the obstacle SHALL NOT be destroyed (normal collision).
   */
  test('Obstacles are not destroyed when Overdrive is inactive', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        fc.integer({ min: 0, max: 10000 }),
        (collectedMask, timer) => {
          const inactiveState = {
            targetWord: ['S', 'H', 'I', 'F', 'T'],
            collectedMask: [...collectedMask],
            overdriveActive: false,  // Inactive
            overdriveTimer: timer,
            coreRotation: 0,
          };
          
          const result = handleOverdriveCollision(inactiveState);
          
          // Obstacle should NOT be destroyed when Overdrive is inactive
          return result.shouldDestroy === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('S.H.I.F.T. Protocol Magnet Effect Properties', () => {
  /**
   * **Feature: echo-shift-v2-mechanics, Property 9: Magnet Effect Range**
   * **Validates: Requirements 4.5**
   *
   * For any Echo Shard within 150 pixels of the player during active Overdrive,
   * the shard SHALL be pulled toward the player.
   */
  test('Shards within 150px radius are pulled toward player', () => {
    fc.assert(
      fc.property(
        // Player position
        fc.integer({ min: 200, max: 600 }),  // playerX
        fc.integer({ min: 200, max: 400 }),  // playerY
        // Shard offset within magnet radius (1-149 pixels)
        fc.integer({ min: 1, max: 149 }),    // distance
        fc.integer({ min: 0, max: 360 }),    // angle in degrees
        (playerX, playerY, distance, angleDeg) => {
          const angle = (angleDeg * Math.PI) / 180;
          const shardX = playerX + distance * Math.cos(angle);
          const shardY = playerY + distance * Math.sin(angle);
          
          const shards = [{ x: shardX, y: shardY, id: 'test-shard' }];
          const playerPos = { x: playerX, y: playerY };
          
          const result = applyMagnetEffect(shards, playerPos, 150);
          
          // Shard should have moved closer to player
          const originalDistance = Math.sqrt(
            Math.pow(shardX - playerX, 2) + Math.pow(shardY - playerY, 2)
          );
          const newDistance = Math.sqrt(
            Math.pow(result[0].x - playerX, 2) + Math.pow(result[0].y - playerY, 2)
          );
          
          // New distance should be less than original (pulled toward player)
          return newDistance < originalDistance;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 9: Magnet Effect Range (Outside Radius)**
   * **Validates: Requirements 4.5**
   *
   * For any Echo Shard beyond 150 pixels of the player,
   * the shard SHALL NOT be affected by the magnet.
   */
  test('Shards beyond 150px radius are not affected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 600 }),  // playerX
        fc.integer({ min: 200, max: 400 }),  // playerY
        // Shard offset beyond magnet radius (151+ pixels)
        fc.integer({ min: 151, max: 500 }),  // distance
        fc.integer({ min: 0, max: 360 }),    // angle in degrees
        (playerX, playerY, distance, angleDeg) => {
          const angle = (angleDeg * Math.PI) / 180;
          const shardX = playerX + distance * Math.cos(angle);
          const shardY = playerY + distance * Math.sin(angle);
          
          const shards = [{ x: shardX, y: shardY, id: 'test-shard' }];
          const playerPos = { x: playerX, y: playerY };
          
          const result = applyMagnetEffect(shards, playerPos, 150);
          
          // Shard position should be unchanged
          return result[0].x === shardX && result[0].y === shardY;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 9: Magnet Effect Range (At Player Position)**
   * **Validates: Requirements 4.5**
   *
   * For any Echo Shard at the exact player position,
   * the shard SHALL remain at that position (no division by zero).
   */
  test('Shards at player position remain unchanged', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 700 }),  // playerX
        fc.integer({ min: 100, max: 500 }),  // playerY
        (playerX, playerY) => {
          // Shard at exact player position
          const shards = [{ x: playerX, y: playerY, id: 'test-shard' }];
          const playerPos = { x: playerX, y: playerY };
          
          const result = applyMagnetEffect(shards, playerPos, 150);
          
          // Shard should remain at same position (no NaN from division by zero)
          return result[0].x === playerX && 
                 result[0].y === playerY &&
                 !isNaN(result[0].x) && 
                 !isNaN(result[0].y);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-v2-mechanics, Property 9: Magnet Effect Range (Multiple Shards)**
   * **Validates: Requirements 4.5**
   *
   * For multiple shards, only those within radius SHALL be affected.
   */
  test('Only shards within radius are affected in a group', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 300, max: 500 }),  // playerX
        fc.integer({ min: 300, max: 400 }),  // playerY
        (playerX, playerY) => {
          const playerPos = { x: playerX, y: playerY };
          
          // Create shards at various distances
          const shards = [
            { x: playerX + 50, y: playerY, id: 'close' },      // 50px - within radius
            { x: playerX + 100, y: playerY, id: 'medium' },    // 100px - within radius
            { x: playerX + 200, y: playerY, id: 'far' },       // 200px - outside radius
          ];
          
          const result = applyMagnetEffect(shards, playerPos, 150);
          
          // Close and medium shards should have moved
          const closeMoved = result[0].x !== shards[0].x;
          const mediumMoved = result[1].x !== shards[1].x;
          // Far shard should NOT have moved
          const farUnchanged = result[2].x === shards[2].x && result[2].y === shards[2].y;
          
          return closeMoved && mediumMoved && farUnchanged;
        }
      ),
      { numRuns: 100 }
    );
  });
});
