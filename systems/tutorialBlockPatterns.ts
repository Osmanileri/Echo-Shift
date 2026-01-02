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
        { id: 'cm-1', delay: 1500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false, width: 20, height: 470 },
        { id: 'cm-2', delay: 2800, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false, width: 20, height: 470 },
        { id: 'cm-3', delay: 4100, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false, width: 20, height: 470 },

        // STAGE 2: Swap Required (No Midline, Mismatched Color) - "Döndürme gerektiren"
        { id: 'cm-6', delay: 6500, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, width: 20, height: 470 },
        { id: 'cm-7', delay: 7800, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: false, requiresSwap: true, width: 20, height: 470 },
        { id: 'cm-8', delay: 9100, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, width: 20, height: 470 },
        { id: 'cm-9', delay: 10400, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: false, requiresSwap: true, width: 20, height: 470 },

        // STAGE 3: Double Gates (Top + Bottom Layout) - "İkili Geçiş"
        // Gate 1: Safe (Matches default)
        { id: 'cm-10a', delay: 12500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false, width: 20, height: 460 },
        { id: 'cm-10b', delay: 12500, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false, width: 20, height: 420 },

        // Gate 2: Swap Required
        { id: 'cm-11a', delay: 14000, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, width: 20, height: 460 },
        { id: 'cm-11b', delay: 14000, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: false, requiresSwap: true, width: 20, height: 430 },

        // Gate 3: Safe
        { id: 'cm-12a', delay: 15500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false, width: 20, height: 440 },
        { id: 'cm-12b', delay: 15500, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false, width: 20, height: 460 },

        // Gate 4: Swap Required
        { id: 'cm-13a', delay: 17000, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, width: 20, height: 460 },
        { id: 'cm-13b', delay: 17000, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: false, requiresSwap: true, width: 20, height: 440 },

        // STAGE 4: Midline Crossing (Large Blocks) - "Orta Çizgiyi Geçen"
        // Block 1: Top Heavy (White) - Safe
        { id: 'cm-14', delay: 19500, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: true, requiresSwap: false, width: 20, height: 490 },

        // Block 2: Bottom Heavy (Black) - Safe
        { id: 'cm-15', delay: 21000, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: true, requiresSwap: false, width: 20, height: 485 },

        // Block 3: Top Heavy (Black) - Swap Required
        { id: 'cm-16', delay: 22500, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: true, requiresSwap: true, width: 20, height: 490 },

        // Block 4: Bottom Heavy (White) - Swap Required
        { id: 'cm-17', delay: 24000, lane: 'bottom', polarity: 'white', y: 0.75, crossesCenter: true, requiresSwap: true, width: 20, height: 495 },
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
        { id: 'sm-1', delay: 4000, lane: 'top', polarity: 'black', y: 0.25, crossesCenter: false, requiresSwap: true, height: 450 },
        // Block 2: Spawns AFTER first block is handled (~12 seconds to allow for slow-mo + success message)
        { id: 'sm-2', delay: 6200, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: true, height: 450 },
    ],
    diamonds: [],
};


/**
 * Phase 5: SHARP_MANEUVER - Blocks that cross the center line
 * Requires quick vertical movement
 * Height is calculated dynamically in GameEngine (55% of screen height for crossesCenter)
 */
const SHARP_MANEUVER_PATTERN: PhasePattern = {
    phase: 'SHARP_MANEUVER',
    blocks: [
        // Blocks that cross center - player must dodge quickly
        // crossesCenter: true -> GameEngine will use 55% of screen height
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
        { id: 'st-4', delay: 2500, lane: 'top', polarity: 'black', y: 0.3, crossesCenter: false, requiresSwap: true },
        { id: 'st-5', delay: 3000, lane: 'bottom', polarity: 'white', y: 0.7, crossesCenter: false, requiresSwap: true },
        { id: 'st-6', delay: 4000, lane: 'bottom', polarity: 'black', y: 0.6, crossesCenter: true, requiresSwap: false },
        { id: 'st-7', delay: 4600, lane: 'top', polarity: 'white', y: 0.25, crossesCenter: false, requiresSwap: false },
        { id: 'st-8', delay: 5200, lane: 'bottom', polarity: 'black', y: 0.75, crossesCenter: false, requiresSwap: false },
    ],
    diamonds: [],
};

/**
 * Phase 5: DIAMOND_COLLECTION - Elmas toplama öğretici
 * 8 elmas spawn olur ama 5. elmasta Dash dolar ve faz tamamlanır
 */
const DIAMOND_COLLECTION_PATTERN: PhasePattern = {
    phase: 'DIAMOND_COLLECTION',
    blocks: [],  // Engel yok, sadece elmas
    diamonds: [
        // 8 elmas - ama 5. elmasta Dash %100 doluyor
        { id: 'dc-1', delay: 1500, y: 0.5 },    // Tam ortada
        { id: 'dc-2', delay: 3000, y: 0.5 },    // Tam ortada
        { id: 'dc-3', delay: 4500, y: 0.48 },   // Hafif yukarı
        { id: 'dc-4', delay: 6000, y: 0.52 },   // Hafif aşağı
        { id: 'dc-5', delay: 7500, y: 0.5 },    // 5. elmas - DASH DOLU!
        // Bonus elmaslar (faz tamamlandıktan sonra, oyuncu isterse toplayabilir)
        { id: 'dc-6', delay: 9000, y: 0.45 },   // Bonus
        { id: 'dc-7', delay: 10500, y: 0.55 },  // Bonus
        { id: 'dc-8', delay: 12000, y: 0.5 },   // Bonus
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


