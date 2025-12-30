/**
 * Tutorial Block Patterns - Echo Shift
 * Önceden Tanımlanmış Blok Dizileri
 * 
 * Her tutorial fazı için özel blok/engel dizileri.
 * Bu dosya, tutorial sırasında spawn edilecek engellerin tam kontrolünü sağlar.
 */

import type { TutorialPhase } from './interactiveTutorialSystem';

// ============================================================================
// TYPES
// ============================================================================

export interface TutorialBlock {
    id: string;
    delay: number;           // ms after phase start
    lane: 'top' | 'bottom';
    polarity: 'white' | 'black';
    y: number;               // 0-1 normalized position
    crossesCenter: boolean;  // Does block cross center line?
    requiresSwap: boolean;   // Forces player to swap to pass
    width?: number;          // Optional custom width
    height?: number;         // Optional custom height
}

export interface TutorialDiamond {
    id: string;
    delay: number;           // ms after phase start
    y: number;               // 0-1 normalized position
}

export interface PhasePattern {
    phase: TutorialPhase;
    blocks: TutorialBlock[];
    diamonds: TutorialDiamond[];
}

// ============================================================================
// PHASE PATTERNS
// ============================================================================

/**
 * Phase 0: INTRO - No obstacles, just story screen
 */
const INTRO_PATTERN: PhasePattern = {
    phase: 'INTRO',
    blocks: [],  // No blocks in intro phase
    diamonds: [],
};

/**
 * Phase 1: NAVIGATION - No obstacles, just movement practice
 */
const NAVIGATION_PATTERN: PhasePattern = {
    phase: 'NAVIGATION',
    blocks: [],  // No blocks in navigation phase
    diamonds: [],
};


/**
 * Phase 2: COLOR_MATCH - Simple blocks that don't cross center
 * White blocks in top lane, black blocks in bottom lane
 */
const COLOR_MATCH_PATTERN: PhasePattern = {
    phase: 'COLOR_MATCH',
    blocks: [
        // STAGE 1: Simple Blocks (No Midline, Matching Color) - "Sıfır çizgisini geçmeyen"
        { id: 'cm-1', delay: 1500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false, width: 20, height: 120 },
        { id: 'cm-2', delay: 2800, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false, width: 20, height: 120 },
        { id: 'cm-3', delay: 4100, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false, width: 20, height: 120 },

        // STAGE 2: Swap Required (No Midline, Mismatched Color) - "Döndürme gerektiren"
        { id: 'cm-6', delay: 6500, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, width: 20, height: 120 },
        { id: 'cm-7', delay: 7800, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: false, requiresSwap: true, width: 20, height: 120 },
        { id: 'cm-8', delay: 9100, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, width: 20, height: 120 },
        { id: 'cm-9', delay: 10400, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: false, requiresSwap: true, width: 20, height: 120 },

        // STAGE 3: Double Gates (Top + Bottom Layout) - "İkili Geçiş"
        // Gate 1: Safe (Matches default)
        { id: 'cm-10a', delay: 12500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false, width: 20, height: 120 },
        { id: 'cm-10b', delay: 12500, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false, width: 20, height: 120 },

        // Gate 2: Swap Required
        { id: 'cm-11a', delay: 14000, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, width: 20, height: 120 },
        { id: 'cm-11b', delay: 14000, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: false, requiresSwap: true, width: 20, height: 120 },

        // Gate 3: Safe
        { id: 'cm-12a', delay: 15500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false, width: 20, height: 120 },
        { id: 'cm-12b', delay: 15500, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false, width: 20, height: 120 },

        // Gate 4: Swap Required
        { id: 'cm-13a', delay: 17000, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, width: 20, height: 120 },
        { id: 'cm-13b', delay: 17000, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: false, requiresSwap: true, width: 20, height: 120 },

        // STAGE 4: Midline Crossing (Large Blocks) - "Orta Çizgiyi Geçen"
        // Block 1: Top Heavy (White) - Safe
        { id: 'cm-14', delay: 19500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: true, requiresSwap: false, width: 20, height: 320 },

        // Block 2: Bottom Heavy (Black) - Safe
        { id: 'cm-15', delay: 21000, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: true, requiresSwap: false, width: 20, height: 320 },

        // Block 3: Top Heavy (Black) - Swap Required
        { id: 'cm-16', delay: 22500, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: true, requiresSwap: true, width: 20, height: 320 },

        // Block 4: Bottom Heavy (White) - Swap Required
        { id: 'cm-17', delay: 24000, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: true, requiresSwap: true, width: 20, height: 320 },
    ],
    diamonds: [],
};

/**
 * Phase 3: SWAP_MECHANIC - Blocks positioned to force swapping
 * Player MUST swap to survive - only 2 blocks needed
 */
const SWAP_MECHANIC_PATTERN: PhasePattern = {
    phase: 'SWAP_MECHANIC',
    blocks: [
        // Block 1: Opposite color - forces first swap
        { id: 'sm-1', delay: 4000, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, width: 35, height: 120 },
        // Block 2: Opposite color again - forces second swap
        { id: 'sm-2', delay: 10000, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: false, requiresSwap: true, width: 35, height: 120 },
    ],
    diamonds: [],
};

/**
 * Phase 4: CONNECTOR - Normal blocks while connector expands
 */
const CONNECTOR_PATTERN: PhasePattern = {
    phase: 'CONNECTOR',
    blocks: [
        { id: 'cn-1', delay: 1000, lane: 'top', polarity: 'white', y: 0.2, crossesCenter: false, requiresSwap: false },
        { id: 'cn-2', delay: 2000, lane: 'bottom', polarity: 'black', y: 0.8, crossesCenter: false, requiresSwap: false },
        { id: 'cn-3', delay: 3000, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false },
        { id: 'cn-4', delay: 4000, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false },
    ],
    diamonds: [],
};

/**
 * Phase 5: SHARP_MANEUVER - Blocks that cross the center line
 * Requires quick vertical movement
 */
const SHARP_MANEUVER_PATTERN: PhasePattern = {
    phase: 'SHARP_MANEUVER',
    blocks: [
        // Blocks that cross center - player must dodge quickly
        { id: 'sh-1', delay: 1000, lane: 'top', polarity: 'white', y: 0.45, crossesCenter: true, requiresSwap: false },
        { id: 'sh-2', delay: 2500, lane: 'bottom', polarity: 'black', y: 0.55, crossesCenter: true, requiresSwap: false },
        { id: 'sh-3', delay: 4000, lane: 'top', polarity: 'white', y: 0.48, crossesCenter: true, requiresSwap: false },
        { id: 'sh-4', delay: 5500, lane: 'bottom', polarity: 'black', y: 0.52, crossesCenter: true, requiresSwap: false },
        { id: 'sh-5', delay: 7000, lane: 'top', polarity: 'white', y: 0.42, crossesCenter: true, requiresSwap: false },
    ],
    diamonds: [],
};

/**
 * Phase 6: SPEED_TEST - Mixed blocks at faster speed
 */
const SPEED_TEST_PATTERN: PhasePattern = {
    phase: 'SPEED_TEST',
    blocks: [
        { id: 'st-1', delay: 500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false },
        { id: 'st-2', delay: 1000, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false },
        { id: 'st-3', delay: 1500, lane: 'top', polarity: 'white', y: 0.35, crossesCenter: false, requiresSwap: false },
        { id: 'st-4', delay: 2000, lane: 'bottom', polarity: 'black', y: 0.65, crossesCenter: false, requiresSwap: true },
        { id: 'st-5', delay: 2500, lane: 'top', polarity: 'black', y: 0.3, crossesCenter: false, requiresSwap: true },
        { id: 'st-6', delay: 3000, lane: 'bottom', polarity: 'white', y: 0.7, crossesCenter: false, requiresSwap: true },
        { id: 'st-7', delay: 3500, lane: 'top', polarity: 'white', y: 0.4, crossesCenter: true, requiresSwap: false },
        { id: 'st-8', delay: 4000, lane: 'bottom', polarity: 'black', y: 0.6, crossesCenter: true, requiresSwap: false },
        { id: 'st-9', delay: 4500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false },
        { id: 'st-10', delay: 5000, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false },
    ],
    diamonds: [],
};

/**
 * Phase 7: DIAMOND_COLLECTION - No blocks, only diamonds to collect
 */
const DIAMOND_COLLECTION_PATTERN: PhasePattern = {
    phase: 'DIAMOND_COLLECTION',
    blocks: [],  // No blocks in diamond phase
    diamonds: [
        { id: 'dm-1', delay: 1000, y: 0.3 },
        { id: 'dm-2', delay: 2000, y: 0.7 },
        { id: 'dm-3', delay: 3000, y: 0.5 },
        { id: 'dm-4', delay: 4000, y: 0.25 },
        { id: 'dm-5', delay: 5000, y: 0.75 },
    ],
};

// ============================================================================
// PATTERN REGISTRY
// ============================================================================

export const PHASE_PATTERNS: Record<TutorialPhase, PhasePattern> = {
    'INTRO': INTRO_PATTERN,
    'NAVIGATION': NAVIGATION_PATTERN,
    'COLOR_MATCH': COLOR_MATCH_PATTERN,
    'SWAP_MECHANIC': SWAP_MECHANIC_PATTERN,
    'CONNECTOR': CONNECTOR_PATTERN,
    'SHARP_MANEUVER': SHARP_MANEUVER_PATTERN,
    'SPEED_TEST': SPEED_TEST_PATTERN,
    'DIAMOND_COLLECTION': DIAMOND_COLLECTION_PATTERN,
};

// ============================================================================
// ACCESSOR FUNCTIONS
// ============================================================================

/**
 * Get pattern for a specific phase
 */
export function getPatternForPhase(phase: TutorialPhase): PhasePattern {
    return PHASE_PATTERNS[phase];
}

/**
 * Get blocks that should spawn at a given time
 * @param phase - Current tutorial phase
 * @param elapsedTime - Time since phase started (ms)
 * @param spawnedBlockIds - Set of already spawned block IDs
 * @returns Array of blocks to spawn
 */
export function getBlocksToSpawn(
    phase: TutorialPhase,
    elapsedTime: number,
    spawnedBlockIds: Set<string>
): TutorialBlock[] {
    const pattern = PHASE_PATTERNS[phase];

    return pattern.blocks.filter(block =>
        elapsedTime >= block.delay && !spawnedBlockIds.has(block.id)
    );
}

/**
 * Get diamonds that should spawn at a given time
 * @param phase - Current tutorial phase
 * @param elapsedTime - Time since phase started (ms)
 * @param spawnedDiamondIds - Set of already spawned diamond IDs
 * @returns Array of diamonds to spawn
 */
export function getDiamondsToSpawn(
    phase: TutorialPhase,
    elapsedTime: number,
    spawnedDiamondIds: Set<string>
): TutorialDiamond[] {
    const pattern = PHASE_PATTERNS[phase];

    return pattern.diamonds.filter(diamond =>
        elapsedTime >= diamond.delay && !spawnedDiamondIds.has(diamond.id)
    );
}

/**
 * Get total block count for a phase
 */
export function getTotalBlockCount(phase: TutorialPhase): number {
    return PHASE_PATTERNS[phase].blocks.length;
}

/**
 * Get total diamond count for a phase
 */
export function getTotalDiamondCount(phase: TutorialPhase): number {
    return PHASE_PATTERNS[phase].diamonds.length;
}

/**
 * Check if phase has any blocks
 */
export function phaseHasBlocks(phase: TutorialPhase): boolean {
    return PHASE_PATTERNS[phase].blocks.length > 0;
}

/**
 * Check if phase has diamonds
 */
export function phaseHasDiamonds(phase: TutorialPhase): boolean {
    return PHASE_PATTERNS[phase].diamonds.length > 0;
}

// ============================================================================
// CONNECTOR EXPANSION CONFIG
// ============================================================================

/**
 * Connector expansion settings for Phase 4
 */
export const CONNECTOR_EXPANSION = {
    startLength: 100,        // Starting connector length (px)
    endLength: 200,          // End connector length (px)
    duration: 5000,          // Duration of expansion (ms)

    /**
     * Calculate connector length at given time
     */
    getLengthAtTime: (elapsedTime: number): number => {
        const progress = Math.min(1, elapsedTime / CONNECTOR_EXPANSION.duration);
        const eased = easeOutQuad(progress);
        return CONNECTOR_EXPANSION.startLength +
            (CONNECTOR_EXPANSION.endLength - CONNECTOR_EXPANSION.startLength) * eased;
    },
};

/**
 * Easing function for smooth expansion
 */
function easeOutQuad(t: number): number {
    return t * (2 - t);
}
