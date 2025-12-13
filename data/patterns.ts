/**
 * Pattern Data Definitions for Procedural Gameplay System
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5
 */

/**
 * Lane type - represents the two playable lanes
 */
export type Lane = "TOP" | "BOTTOM";

/**
 * Pattern difficulty levels
 */
export type PatternDifficulty =
  | "basic"
  | "intermediate"
  | "advanced"
  | "expert";

/**
 * Obstacle definition within a pattern
 * Requirements: 2.2, 2.4
 */
export interface PatternObstacle {
  lane: Lane;
  timeOffset: number; // ms - Pattern başlangıcına göre
  heightRatio?: number; // 0-1 arası, varsayılan 0.5
}

/**
 * Shard definition within a pattern
 * Requirements: 5.1, 5.2, 5.3
 */
export interface PatternShard {
  lane: Lane;
  timeOffset: number;
  type: "safe" | "risky";
  positionOffset?: number; // Engele göre offset (risky için)
}

/**
 * PatternChunk - higher level building block for patterns.
 *
 * This is a convenience structure for authoring: a chunk represents a short,
 * learnable sequence (e.g. Gate, Stairs, ZigZag). Chunks can be compiled into a
 * `Pattern` by converting `beat` offsets into `timeOffset` values.
 *
 * NOTE: The engine currently consumes `Pattern` directly; Chunk support exists
 * for tooling/authoring and future refactors.
 */
export interface PatternChunk {
  id: string;
  name: string;
  difficulty: PatternDifficulty;
  beatMs: number; // duration of one beat in ms (authoring resolution)
  steps: Array<{
    beat: number;
    heightRatio?: number;
    shard?: { lane: Lane; type: "safe" | "risky" };
  }>;
}

/**
 * Complete pattern configuration
 * Requirements: 2.1, 2.6, 2.7
 */
export interface Pattern {
  id: string;
  name: string;
  difficulty: PatternDifficulty;
  duration: number; // ms - Pattern toplam süresi
  obstacles: PatternObstacle[];
  shards: PatternShard[];
}

/**
 * Gate Pattern - Simultaneous TOP and BOTTOM obstacles with passable gap
 * Requirements: 3.1
 * Most common pattern - altlı üstlü bloklar
 */
const GATE_PATTERN: Pattern = {
  id: "gate",
  name: "The Gate",
  difficulty: "basic",
  duration: 800, // Faster pattern (was 1500)
  obstacles: [
    { lane: "TOP", timeOffset: 0 },
    { lane: "BOTTOM", timeOffset: 0 },
  ],
  shards: [{ lane: "TOP", timeOffset: 400, type: "safe" }],
};

/**
 * Double Gate Pattern - Two consecutive gates
 * Requirements: 3.1
 */
const DOUBLE_GATE_PATTERN: Pattern = {
  id: "double_gate",
  name: "Double Gate",
  difficulty: "basic",
  duration: 1200,
  obstacles: [
    { lane: "TOP", timeOffset: 0 },
    { lane: "BOTTOM", timeOffset: 0 },
    { lane: "TOP", timeOffset: 600 },
    { lane: "BOTTOM", timeOffset: 600 },
  ],
  shards: [
    { lane: "TOP", timeOffset: 300, type: "safe" },
    { lane: "BOTTOM", timeOffset: 900, type: "safe" },
  ],
};

/**
 * Breather Pattern - Sparse obstacles allowing recovery
 * Requirements: 3.5
 */
const BREATHER_PATTERN: Pattern = {
  id: "breather",
  name: "Breather",
  difficulty: "basic",
  duration: 1000, // Faster (was 2000)
  obstacles: [
    { lane: "TOP", timeOffset: 0 },
    { lane: "BOTTOM", timeOffset: 0 }, // Added bottom for gate style
  ],
  shards: [
    { lane: "BOTTOM", timeOffset: 300, type: "safe" },
    { lane: "TOP", timeOffset: 600, type: "safe" },
  ],
};

/**
 * Zig-Zag Pattern - Alternating TOP-BOTTOM-TOP-BOTTOM obstacles
 * Requirements: 3.2
 */
const ZIGZAG_PATTERN: Pattern = {
  id: "zigzag",
  name: "Zig-Zag",
  difficulty: "intermediate",
  duration: 1400, // Faster (was 2000)
  obstacles: [
    { lane: "TOP", timeOffset: 0 },
    { lane: "BOTTOM", timeOffset: 0 },
    { lane: "TOP", timeOffset: 350 },
    { lane: "BOTTOM", timeOffset: 350 },
    { lane: "TOP", timeOffset: 700 },
    { lane: "BOTTOM", timeOffset: 700 },
    { lane: "TOP", timeOffset: 1050 },
    { lane: "BOTTOM", timeOffset: 1050 },
  ],
  shards: [
    { lane: "BOTTOM", timeOffset: 175, type: "safe" },
    { lane: "TOP", timeOffset: 525, type: "safe" },
    { lane: "BOTTOM", timeOffset: 875, type: "safe" },
  ],
};

/**
 * Tunnel Pattern - Consecutive same-lane obstacles forcing single-lane play
 * Requirements: 3.3
 */
const TUNNEL_PATTERN: Pattern = {
  id: "tunnel",
  name: "The Tunnel",
  difficulty: "advanced",
  duration: 1600, // Faster (was 2500)
  obstacles: [
    { lane: "TOP", timeOffset: 0 },
    { lane: "BOTTOM", timeOffset: 0 },
    { lane: "TOP", timeOffset: 400 },
    { lane: "BOTTOM", timeOffset: 400 },
    { lane: "TOP", timeOffset: 800 },
    { lane: "BOTTOM", timeOffset: 800 },
    { lane: "TOP", timeOffset: 1200 },
    { lane: "BOTTOM", timeOffset: 1200 },
  ],
  shards: [
    { lane: "BOTTOM", timeOffset: 200, type: "safe" },
    { lane: "TOP", timeOffset: 600, type: "safe" },
    { lane: "BOTTOM", timeOffset: 1000, type: "safe" },
  ],
};

/**
 * Gauntlet Pattern - Rapid alternating obstacles with minimal gaps
 * Requirements: 3.4
 */
const GAUNTLET_PATTERN: Pattern = {
  id: "gauntlet",
  name: "The Gauntlet",
  difficulty: "expert",
  duration: 1500, // Faster (was 2000)
  obstacles: [
    { lane: "TOP", timeOffset: 0, heightRatio: 0.75 },
    { lane: "BOTTOM", timeOffset: 0, heightRatio: 0.75 },
    { lane: "TOP", timeOffset: 250, heightRatio: 0.25 },
    { lane: "BOTTOM", timeOffset: 250, heightRatio: 0.25 },
    { lane: "TOP", timeOffset: 500, heightRatio: 0.8 },
    { lane: "BOTTOM", timeOffset: 500, heightRatio: 0.8 },
    { lane: "TOP", timeOffset: 750, heightRatio: 0.2 },
    { lane: "BOTTOM", timeOffset: 750, heightRatio: 0.2 },
    { lane: "TOP", timeOffset: 1000, heightRatio: 0.7 },
    { lane: "BOTTOM", timeOffset: 1000, heightRatio: 0.7 },
    { lane: "TOP", timeOffset: 1250, heightRatio: 0.3 },
    { lane: "BOTTOM", timeOffset: 1250, heightRatio: 0.3 },
  ],
  shards: [
    { lane: "BOTTOM", timeOffset: 125, type: "risky" },
    { lane: "TOP", timeOffset: 375, type: "risky" },
    { lane: "BOTTOM", timeOffset: 625, type: "risky" },
    { lane: "TOP", timeOffset: 875, type: "risky" },
  ],
};

/**
 * Stairs Pattern - Gap center climbs steadily (learnable "stairs" motion)
 */
const STAIRS_PATTERN: Pattern = {
  id: "stairs",
  name: "Stairs",
  difficulty: "intermediate",
  duration: 1600,
  obstacles: [
    { lane: "TOP", timeOffset: 0, heightRatio: 0.25 },
    { lane: "BOTTOM", timeOffset: 0, heightRatio: 0.25 },
    { lane: "TOP", timeOffset: 400, heightRatio: 0.35 },
    { lane: "BOTTOM", timeOffset: 400, heightRatio: 0.35 },
    { lane: "TOP", timeOffset: 800, heightRatio: 0.5 },
    { lane: "BOTTOM", timeOffset: 800, heightRatio: 0.5 },
    { lane: "TOP", timeOffset: 1200, heightRatio: 0.65 },
    { lane: "BOTTOM", timeOffset: 1200, heightRatio: 0.65 },
  ],
  shards: [
    { lane: "TOP", timeOffset: 200, type: "safe" },
    { lane: "BOTTOM", timeOffset: 1000, type: "safe" },
  ],
};

/**
 * Switchback Pattern - Alternates high/low gap center, forcing quick re-centering
 */
const SWITCHBACK_PATTERN: Pattern = {
  id: "switchback",
  name: "Switchback",
  difficulty: "intermediate",
  duration: 1500,
  obstacles: [
    { lane: "TOP", timeOffset: 0, heightRatio: 0.2 },
    { lane: "BOTTOM", timeOffset: 0, heightRatio: 0.2 },
    { lane: "TOP", timeOffset: 500, heightRatio: 0.8 },
    { lane: "BOTTOM", timeOffset: 500, heightRatio: 0.8 },
    { lane: "TOP", timeOffset: 1000, heightRatio: 0.25 },
    { lane: "BOTTOM", timeOffset: 1000, heightRatio: 0.25 },
  ],
  shards: [
    { lane: "BOTTOM", timeOffset: 250, type: "risky" },
    { lane: "TOP", timeOffset: 750, type: "risky" },
  ],
};

/**
 * Pulse Pattern - Repeated center-ish gates with slight offset pulses
 */
const PULSE_PATTERN: Pattern = {
  id: "pulse",
  name: "Pulse",
  difficulty: "basic",
  duration: 1500,
  obstacles: [
    { lane: "TOP", timeOffset: 0, heightRatio: 0.45 },
    { lane: "BOTTOM", timeOffset: 0, heightRatio: 0.45 },
    { lane: "TOP", timeOffset: 500, heightRatio: 0.55 },
    { lane: "BOTTOM", timeOffset: 500, heightRatio: 0.55 },
    { lane: "TOP", timeOffset: 1000, heightRatio: 0.5 },
    { lane: "BOTTOM", timeOffset: 1000, heightRatio: 0.5 },
  ],
  shards: [
    { lane: "TOP", timeOffset: 250, type: "safe" },
    { lane: "BOTTOM", timeOffset: 1250, type: "safe" },
  ],
};

/**
 * Chicane Pattern - Quick left/right (high/low) with short cadence
 */
const CHICANE_PATTERN: Pattern = {
  id: "chicane",
  name: "Chicane",
  difficulty: "advanced",
  duration: 1400,
  obstacles: [
    { lane: "TOP", timeOffset: 0, heightRatio: 0.7 },
    { lane: "BOTTOM", timeOffset: 0, heightRatio: 0.7 },
    { lane: "TOP", timeOffset: 350, heightRatio: 0.3 },
    { lane: "BOTTOM", timeOffset: 350, heightRatio: 0.3 },
    { lane: "TOP", timeOffset: 700, heightRatio: 0.75 },
    { lane: "BOTTOM", timeOffset: 700, heightRatio: 0.75 },
    { lane: "TOP", timeOffset: 1050, heightRatio: 0.35 },
    { lane: "BOTTOM", timeOffset: 1050, heightRatio: 0.35 },
  ],
  shards: [
    { lane: "TOP", timeOffset: 175, type: "safe" },
    { lane: "BOTTOM", timeOffset: 875, type: "risky" },
  ],
};

/**
 * Squeeze Pattern - Narrow-ish, consistent bias to one side
 */
const SQUEEZE_PATTERN: Pattern = {
  id: "squeeze",
  name: "Squeeze",
  difficulty: "advanced",
  duration: 1600,
  obstacles: [
    { lane: "TOP", timeOffset: 0, heightRatio: 0.2 },
    { lane: "BOTTOM", timeOffset: 0, heightRatio: 0.2 },
    { lane: "TOP", timeOffset: 400, heightRatio: 0.25 },
    { lane: "BOTTOM", timeOffset: 400, heightRatio: 0.25 },
    { lane: "TOP", timeOffset: 800, heightRatio: 0.3 },
    { lane: "BOTTOM", timeOffset: 800, heightRatio: 0.3 },
    { lane: "TOP", timeOffset: 1200, heightRatio: 0.25 },
    { lane: "BOTTOM", timeOffset: 1200, heightRatio: 0.25 },
  ],
  shards: [
    { lane: "BOTTOM", timeOffset: 600, type: "safe" },
    { lane: "TOP", timeOffset: 1000, type: "risky" },
  ],
};

/**
 * All available patterns
 * Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5
 * Gate patterns are most common for altlı üstlü blok gameplay
 */
export const PATTERNS: Pattern[] = [
  GATE_PATTERN,
  GATE_PATTERN, // Duplicate for higher weight
  DOUBLE_GATE_PATTERN,
  BREATHER_PATTERN,
  PULSE_PATTERN,
  ZIGZAG_PATTERN,
  STAIRS_PATTERN,
  SWITCHBACK_PATTERN,
  TUNNEL_PATTERN,
  CHICANE_PATTERN,
  SQUEEZE_PATTERN,
  GAUNTLET_PATTERN,
];

/**
 * Fallback pattern for error recovery
 */
export const FALLBACK_PATTERN: Pattern = BREATHER_PATTERN;

/**
 * Get pattern by ID
 * @param patternId - Pattern identifier
 * @returns Pattern or undefined if not found
 */
export function getPatternById(patternId: string): Pattern | undefined {
  return PATTERNS.find((p) => p.id === patternId);
}

/**
 * Get patterns by difficulty
 * @param difficulty - Difficulty level to filter by
 * @returns Array of patterns matching the difficulty
 */
export function getPatternsByDifficulty(
  difficulty: PatternDifficulty
): Pattern[] {
  return PATTERNS.filter((p) => p.difficulty === difficulty);
}

/**
 * Get all basic patterns (for early game)
 */
export function getBasicPatterns(): Pattern[] {
  return getPatternsByDifficulty("basic");
}

/**
 * Check if a pattern ID is valid
 */
export function isValidPatternId(patternId: string): boolean {
  return PATTERNS.some((p) => p.id === patternId);
}

/**
 * Serialize pattern to JSON string
 * Requirements: 2.6
 * @param pattern - Pattern to serialize
 * @returns JSON string representation
 */
export function serializePattern(pattern: Pattern): string {
  return JSON.stringify(pattern);
}

/**
 * Deserialize JSON string to Pattern
 * Requirements: 2.7
 * @param json - JSON string to parse
 * @returns Parsed Pattern object
 * @throws Error if JSON is invalid or pattern structure is invalid
 */
export function deserializePattern(json: string): Pattern {
  const parsed = JSON.parse(json);

  if (!validatePattern(parsed)) {
    throw new Error("Invalid pattern structure");
  }

  return parsed as Pattern;
}

/**
 * Validate pattern structure
 * Requirements: 2.7
 * @param obj - Object to validate
 * @returns true if valid Pattern structure
 */
export function validatePattern(obj: unknown): obj is Pattern {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const pattern = obj as Record<string, unknown>;

  // Check required string fields
  if (typeof pattern.id !== "string" || pattern.id.length === 0) {
    return false;
  }
  if (typeof pattern.name !== "string" || pattern.name.length === 0) {
    return false;
  }

  // Check difficulty
  const validDifficulties = ["basic", "intermediate", "advanced", "expert"];
  if (!validDifficulties.includes(pattern.difficulty as string)) {
    return false;
  }

  // Check duration
  if (typeof pattern.duration !== "number" || pattern.duration <= 0) {
    return false;
  }

  // Check obstacles array
  if (!Array.isArray(pattern.obstacles)) {
    return false;
  }
  for (const obstacle of pattern.obstacles) {
    if (!validatePatternObstacle(obstacle)) {
      return false;
    }
  }

  // Check shards array
  if (!Array.isArray(pattern.shards)) {
    return false;
  }
  for (const shard of pattern.shards) {
    if (!validatePatternShard(shard)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate obstacle structure
 */
function validatePatternObstacle(obj: unknown): obj is PatternObstacle {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const obstacle = obj as Record<string, unknown>;

  // Check lane
  if (obstacle.lane !== "TOP" && obstacle.lane !== "BOTTOM") {
    return false;
  }

  // Check timeOffset
  if (typeof obstacle.timeOffset !== "number" || obstacle.timeOffset < 0) {
    return false;
  }

  // Check optional heightRatio
  if (obstacle.heightRatio !== undefined) {
    if (
      typeof obstacle.heightRatio !== "number" ||
      obstacle.heightRatio < 0 ||
      obstacle.heightRatio > 1
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validate shard structure
 */
function validatePatternShard(obj: unknown): obj is PatternShard {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const shard = obj as Record<string, unknown>;

  // Check lane
  if (shard.lane !== "TOP" && shard.lane !== "BOTTOM") {
    return false;
  }

  // Check timeOffset
  if (typeof shard.timeOffset !== "number" || shard.timeOffset < 0) {
    return false;
  }

  // Check type
  if (shard.type !== "safe" && shard.type !== "risky") {
    return false;
  }

  // Check optional positionOffset
  if (shard.positionOffset !== undefined) {
    if (typeof shard.positionOffset !== "number") {
      return false;
    }
  }

  return true;
}
