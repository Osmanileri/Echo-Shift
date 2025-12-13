/**
 * Difficulty Progression System
 *
 * Manages pattern availability and selection weights based on player score.
 * Ensures difficulty increases through pattern complexity rather than just speed.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { Pattern, PatternDifficulty, PATTERNS } from "../data/patterns";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Difficulty threshold configuration
 * Defines which patterns are available and their selection weights at each score level
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export interface DifficultyThreshold {
  score: number;
  unlockedDifficulties: PatternDifficulty[];
  weights: Record<PatternDifficulty, number>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Difficulty thresholds defining pattern availability by score
 *
 * Requirements:
 * - 7.1: score < 1000 → only basic patterns (Gate, Breather)
 * - 7.2: score >= 1000 → introduce Zig-Zag (intermediate)
 * - 7.3: score >= 2500 → introduce Tunnel (advanced)
 * - 7.4: score >= 5000 → introduce Gauntlet (expert)
 * - 7.5: weight selection toward harder patterns as score increases
 */
export const DIFFICULTY_THRESHOLDS: DifficultyThreshold[] = [
  {
    score: 0,
    unlockedDifficulties: ["basic"],
    weights: { basic: 1.0, intermediate: 0, advanced: 0, expert: 0 },
  },
  {
    score: 1000,
    unlockedDifficulties: ["basic", "intermediate"],
    weights: { basic: 0.6, intermediate: 0.4, advanced: 0, expert: 0 },
  },
  {
    score: 2500,
    unlockedDifficulties: ["basic", "intermediate", "advanced"],
    weights: { basic: 0.3, intermediate: 0.4, advanced: 0.3, expert: 0 },
  },
  {
    score: 5000,
    unlockedDifficulties: ["basic", "intermediate", "advanced", "expert"],
    weights: { basic: 0.1, intermediate: 0.3, advanced: 0.3, expert: 0.3 },
  },
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the current difficulty threshold based on score
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 *
 * @param score - Current player score
 * @returns The applicable DifficultyThreshold for the given score
 */
export function getCurrentDifficultyThreshold(
  score: number
): DifficultyThreshold {
  // Handle negative scores by treating them as 0
  const normalizedScore = Math.max(0, score);

  // Find the highest threshold that the score meets
  let applicableThreshold = DIFFICULTY_THRESHOLDS[0];

  for (const threshold of DIFFICULTY_THRESHOLDS) {
    if (normalizedScore >= threshold.score) {
      applicableThreshold = threshold;
    } else {
      break; // Thresholds are sorted, so we can stop early
    }
  }

  return applicableThreshold;
}

/**
 * Check if a pattern is available at the current score
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 *
 * @param pattern - Pattern to check
 * @param score - Current player score
 * @returns True if the pattern can be used at this score
 */
export function isPatternAvailable(pattern: Pattern, score: number): boolean {
  const threshold = getCurrentDifficultyThreshold(score);
  return threshold.unlockedDifficulties.includes(pattern.difficulty);
}

/**
 * Get all available patterns for the current score
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 *
 * @param score - Current player score
 * @param patterns - Pool of patterns to filter (defaults to PATTERNS)
 * @returns Array of patterns available at this score
 */
export function getAvailablePatterns(
  score: number,
  patterns: Pattern[] = PATTERNS
): Pattern[] {
  return patterns.filter((pattern) => isPatternAvailable(pattern, score));
}

/**
 * Select a pattern using weighted random selection based on difficulty
 *
 * Requirements: 7.5
 *
 * @param patterns - Pool of patterns to select from
 * @param threshold - Current difficulty threshold with weights
 * @returns Selected pattern
 */
export function selectPatternByWeight(
  patterns: Pattern[],
  threshold: DifficultyThreshold
): Pattern {
  // Filter to only available patterns
  const availablePatterns = patterns.filter((p) =>
    threshold.unlockedDifficulties.includes(p.difficulty)
  );

  if (availablePatterns.length === 0) {
    // Fallback to first pattern if none available
    return patterns[0];
  }

  if (availablePatterns.length === 1) {
    return availablePatterns[0];
  }

  // Calculate total weight for available patterns
  const patternWeights = availablePatterns.map((pattern) => ({
    pattern,
    weight: threshold.weights[pattern.difficulty] || 0,
  }));

  const totalWeight = patternWeights.reduce((sum, pw) => sum + pw.weight, 0);

  // If all weights are 0, use uniform distribution
  if (totalWeight === 0) {
    const randomIndex = Math.floor(Math.random() * availablePatterns.length);
    return availablePatterns[randomIndex];
  }

  // Weighted random selection
  const random = Math.random() * totalWeight;
  let cumulativeWeight = 0;

  for (const { pattern, weight } of patternWeights) {
    cumulativeWeight += weight;
    if (random < cumulativeWeight) {
      return pattern;
    }
  }

  // Fallback (should not reach here)
  return availablePatterns[availablePatterns.length - 1];
}

/**
 * Select a pattern based on score with weighted selection
 * Convenience function combining threshold lookup and weighted selection
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 *
 * @param score - Current player score
 * @param patterns - Pool of patterns (defaults to PATTERNS)
 * @returns Selected pattern
 */
export function selectPatternForScore(
  score: number,
  patterns: Pattern[] = PATTERNS
): Pattern {
  const threshold = getCurrentDifficultyThreshold(score);
  return selectPatternByWeight(patterns, threshold);
}

/**
 * Deterministic pattern selection (no Math.random)
 *
 * Designed for offline/roguelite runs where we want learnable patterns and
 * repeatability. Uses the configured difficulty weights to build a small
 * repeating schedule and then cycles through patterns deterministically.
 *
 * @param score - Current player score
 * @param patterns - Pool of patterns (defaults to PATTERNS)
 * @param sequenceIndex - Monotonic counter incremented each time we need a new pattern
 */
export function selectPatternForScoreDeterministic(
  score: number,
  patterns: Pattern[] = PATTERNS,
  sequenceIndex: number = 0
): Pattern {
  const threshold = getCurrentDifficultyThreshold(score);
  const available = getAvailablePatterns(score, patterns);

  if (available.length === 0) {
    return patterns[0];
  }
  if (available.length === 1) {
    return available[0];
  }

  const schedule = buildDifficultySchedule(threshold, 10);
  const scheduledDifficulty =
    schedule.length > 0
      ? schedule[Math.abs(sequenceIndex) % schedule.length]
      : threshold.unlockedDifficulties[0];

  const byDifficulty = available.filter(
    (p) => p.difficulty === scheduledDifficulty
  );
  const pool = byDifficulty.length > 0 ? byDifficulty : available;

  // Sort for stability (deterministic order)
  const stable = [...pool].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  );
  return stable[Math.abs(sequenceIndex) % stable.length];
}

function buildDifficultySchedule(
  threshold: DifficultyThreshold,
  resolution: number
): PatternDifficulty[] {
  const unlocked = threshold.unlockedDifficulties;
  if (!unlocked || unlocked.length === 0 || resolution <= 0) return [];

  // Convert weights into integer counts that sum to `resolution`.
  const raw = unlocked.map((d) => ({
    d,
    w: Math.max(0, threshold.weights[d] ?? 0),
  }));

  const total = raw.reduce((sum, r) => sum + r.w, 0);
  if (total <= 0) {
    // Uniform schedule if weights are all 0
    const schedule: PatternDifficulty[] = [];
    for (let i = 0; i < resolution; i++) {
      schedule.push(unlocked[i % unlocked.length]);
    }
    return schedule;
  }

  const counts = raw.map((r) => ({
    d: r.d,
    c: Math.max(0, Math.floor((r.w / total) * resolution)),
    frac: (r.w / total) * resolution - Math.floor((r.w / total) * resolution),
  }));

  let used = counts.reduce((sum, c) => sum + c.c, 0);
  while (used < resolution) {
    // Distribute remaining slots by largest fractional remainder
    counts.sort((a, b) => b.frac - a.frac);
    for (const item of counts) {
      if (used >= resolution) break;
      item.c += 1;
      used += 1;
    }
  }

  // Build an interleaved schedule so difficulties are distributed (learnable, not streaky).
  const schedule: PatternDifficulty[] = [];
  const stableCounts = [...counts].sort((a, b) =>
    a.d < b.d ? -1 : a.d > b.d ? 1 : 0
  );

  // Round-robin drain counts
  let remaining = stableCounts.reduce((sum, c) => sum + c.c, 0);
  while (remaining > 0) {
    for (const item of stableCounts) {
      if (item.c <= 0) continue;
      schedule.push(item.d);
      item.c -= 1;
      remaining -= 1;
      if (remaining <= 0) break;
    }
  }

  return schedule.length > 0 ? schedule : unlocked;
}

/**
 * Get the weight sum for a difficulty threshold
 * Used for validation - weights should sum to 1.0
 *
 * Requirements: 7.5
 *
 * @param threshold - Difficulty threshold to check
 * @returns Sum of weights for unlocked difficulties
 */
export function getWeightSum(threshold: DifficultyThreshold): number {
  return threshold.unlockedDifficulties.reduce(
    (sum, difficulty) => sum + (threshold.weights[difficulty] || 0),
    0
  );
}

/**
 * Validate that a threshold has proper weight distribution
 *
 * Requirements: 7.5
 *
 * @param threshold - Threshold to validate
 * @returns True if weights sum to approximately 1.0
 */
export function isValidWeightDistribution(
  threshold: DifficultyThreshold
): boolean {
  const sum = getWeightSum(threshold);
  // Allow small floating point tolerance
  return Math.abs(sum - 1.0) < 0.0001;
}

/**
 * Check if harder patterns have higher weights as score increases
 * Compares two thresholds to verify progression
 *
 * Requirements: 7.5
 *
 * @param lowerThreshold - Threshold at lower score
 * @param higherThreshold - Threshold at higher score
 * @returns True if harder patterns have equal or higher weights in higherThreshold
 */
export function hasProgressiveWeights(
  lowerThreshold: DifficultyThreshold,
  higherThreshold: DifficultyThreshold
): boolean {
  // Expert weight should increase or stay same
  if (higherThreshold.weights.expert < lowerThreshold.weights.expert) {
    return false;
  }

  // Advanced weight should increase or stay same (unless expert takes over)
  if (
    higherThreshold.weights.advanced < lowerThreshold.weights.advanced &&
    higherThreshold.weights.expert <= lowerThreshold.weights.expert
  ) {
    return false;
  }

  // Basic weight should decrease or stay same
  if (higherThreshold.weights.basic > lowerThreshold.weights.basic) {
    return false;
  }

  return true;
}
