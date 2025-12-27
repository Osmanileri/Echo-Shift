/**
 * Interactive Tutorial System - Echo Shift
 * 7 Aşamalı Eğitim Sistemi
 * 
 * Requirements:
 * - Level 0 olarak kodlanmış tutorial
 * - Pokemon, Enemy, Resonance, Phase Dash, S.H.I.F.T. devre dışı
 * - Zorunlu ilerleme (hasCompletedTutorial flag)
 * - Input interceptor mantığı
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * 7 Tutorial Phase
 */
export type TutorialPhase =
    | 'NAVIGATION'         // Faz 1: Dikey hareket
    | 'COLOR_MATCH'        // Faz 2: Renk uyumu
    | 'SWAP_MECHANIC'      // Faz 3: Swap mekaniği
    | 'CONNECTOR'          // Faz 4: Bağlantı uzaması
    | 'SHARP_MANEUVER'     // Faz 5: Keskin manevralar
    | 'SPEED_TEST'         // Faz 6: Hız testi
    | 'DIAMOND_COLLECTION'; // Faz 7: Elmas toplama finali

/**
 * Tutorial message for display
 */
export interface TutorialMessage {
    text: string;
    duration: number;      // ms
    style: 'normal' | 'glitch' | 'celebration';
    startTime: number;
}

/**
 * Phase configuration
 */
export interface PhaseConfig {
    phase: TutorialPhase;
    title: string;
    message: string;
    targetGoal: number;           // e.g. 3 positions, 5 blocks, 5 diamonds
    speedMultiplier: number;      // 1.0 = normal, 0.05 = almost frozen
    waitForInput: boolean;        // Should wait for specific input?
    inputType?: 'release' | 'tap'; // What input to wait for
}

/**
 * Tutorial state
 */
export interface TutorialState {
    isActive: boolean;
    currentPhase: TutorialPhase;
    phaseIndex: number;           // 0-6
    progress: number;             // Current progress toward goal
    targetGoal: number;           // Goal for current phase
    speedMultiplier: number;      // Current speed multiplier
    waitingForInput: boolean;     // Waiting for specific input
    inputType?: 'release' | 'tap';

    // Phase completion tracking
    phasesCompleted: boolean[];   // [false, false, false, false, false, false, false]

    // Message queue
    currentMessage: TutorialMessage | null;
    messageQueue: TutorialMessage[];

    // VFX triggers
    showFocusMask: boolean;
    showGhostHand: boolean;
    showTimeDistortion: boolean;
    showVictoryAnimation: boolean;
    showUnlockAnimation: boolean;

    // Diamond collection (Phase 7)
    diamondsCollected: number;
    diamondsToCollect: number;

    // Timing
    phaseStartTime: number;
    lastUpdateTime: number;

    // Failure tracking
    failedThisPhase: boolean;

    // Tutorial complete flag
    isComplete: boolean;
}

/**
 * Input state from GameEngine
 */
export interface TutorialInputState {
    isPressed: boolean;
    wasReleased: boolean;
    wasTapped: boolean;
    playerY: number;        // 0-1 normalized
    isSwapped: boolean;
}

/**
 * Obstacle info for phase logic
 */
export interface TutorialObstacle {
    id: string;
    x: number;
    y: number;
    lane: 'top' | 'bottom';
    polarity: 'white' | 'black';
    passed: boolean;
}

// ============================================================================
// PHASE CONFIGURATIONS
// ============================================================================

export const PHASE_CONFIGS: PhaseConfig[] = [
    {
        phase: 'NAVIGATION',
        title: 'Temel Navigasyon',
        message: 'Ekrana basılı tut ve parmağını yukarı/aşağı kaydırarak hareket et.',
        targetGoal: 3,          // 3 hedef noktaya ulaş
        speedMultiplier: 0.5,   // Yavaş başla
        waitForInput: false,
    },
    {
        phase: 'COLOR_MATCH',
        title: 'Renk Uyumu',
        message: 'Beyaz top beyaz bloktan, siyah top siyah bloktan geçer. Onları hizala!',
        targetGoal: 5,          // 5 bloktan geç
        speedMultiplier: 0.6,
        waitForInput: false,
    },
    {
        phase: 'SWAP_MECHANIC',
        title: 'Yer Değiştirme',
        message: 'Yer değiştirmek için parmağını bırak!',
        targetGoal: 3,          // 3 swap yap
        speedMultiplier: 0.05,  // Neredeyse dondur
        waitForInput: true,
        inputType: 'release',
    },
    {
        phase: 'CONNECTOR',
        title: 'Bağlantı Uzaması',
        message: 'Dikkat: Çubuk uzuyor, mesafe artıyor. Kontrol zorlaşacak!',
        targetGoal: 5,          // 5 saniye gözlemle
        speedMultiplier: 0.7,
        waitForInput: false,
    },
    {
        phase: 'SHARP_MANEUVER',
        title: 'Keskin Manevralar',
        message: 'Biraz daha zorlaştıralım... Keskin manevralar yap!',
        targetGoal: 5,          // 5 keskin manevradan geç
        speedMultiplier: 0.8,
        waitForInput: false,
    },
    {
        phase: 'SPEED_TEST',
        title: 'Hız Testi',
        message: 'Sistem hızlanıyor. Odaklan!',
        targetGoal: 10,         // 10 bloktan geç
        speedMultiplier: 1.2,   // %20 hız artışı
        waitForInput: false,
    },
    {
        phase: 'DIAMOND_COLLECTION',
        title: 'Son Adım',
        message: 'Bu arada... elmasları toplamayı unutma! Büyük sürprizler seni bekliyor! 💎',
        targetGoal: 5,          // 5 elmas topla
        speedMultiplier: 0.8,
        waitForInput: false,
    },
];

// ============================================================================
// STATE CREATION
// ============================================================================

/**
 * Create initial tutorial state
 */
export function createInitialState(): TutorialState {
    const firstPhase = PHASE_CONFIGS[0];

    return {
        isActive: false,
        currentPhase: firstPhase.phase,
        phaseIndex: 0,
        progress: 0,
        targetGoal: firstPhase.targetGoal,
        speedMultiplier: firstPhase.speedMultiplier,
        waitingForInput: firstPhase.waitForInput,
        inputType: firstPhase.inputType,

        phasesCompleted: [false, false, false, false, false, false, false],

        currentMessage: null,
        messageQueue: [],

        showFocusMask: false,
        showGhostHand: false,
        showTimeDistortion: false,
        showVictoryAnimation: false,
        showUnlockAnimation: false,

        diamondsCollected: 0,
        diamondsToCollect: 5,

        phaseStartTime: 0,
        lastUpdateTime: 0,

        failedThisPhase: false,
        isComplete: false,
    };
}

/**
 * Start the tutorial
 */
export function startTutorial(state: TutorialState): TutorialState {
    const firstPhase = PHASE_CONFIGS[0];
    const now = Date.now();

    return {
        ...createInitialState(),
        isActive: true,
        phaseStartTime: now,
        lastUpdateTime: now,
        currentMessage: {
            text: 'Echo Shift\'e hoş geldin. İki enerji çekirdeğini kontrol ediyorsun.',
            duration: 4000,
            style: 'normal',
            startTime: now,
        },
        showFocusMask: true,
        showGhostHand: true,
    };
}

// ============================================================================
// PHASE MANAGEMENT
// ============================================================================

/**
 * Advance to next phase
 */
export function advanceToNextPhase(state: TutorialState): TutorialState {
    const nextIndex = state.phaseIndex + 1;

    // Check if tutorial is complete
    if (nextIndex >= PHASE_CONFIGS.length) {
        return completeTutorial(state);
    }

    const nextConfig = PHASE_CONFIGS[nextIndex];
    const now = Date.now();

    // Mark current phase as completed
    const newPhasesCompleted = [...state.phasesCompleted];
    newPhasesCompleted[state.phaseIndex] = true;

    // Create new message for next phase
    const nextMessage: TutorialMessage = {
        text: nextConfig.message,
        duration: 4000,
        style: nextConfig.phase === 'SWAP_MECHANIC' ? 'glitch' : 'normal',
        startTime: now,
    };

    return {
        ...state,
        phaseIndex: nextIndex,
        currentPhase: nextConfig.phase,
        progress: 0,
        targetGoal: nextConfig.targetGoal,
        speedMultiplier: nextConfig.speedMultiplier,
        waitingForInput: nextConfig.waitForInput,
        inputType: nextConfig.inputType,
        phasesCompleted: newPhasesCompleted,
        currentMessage: nextMessage,
        messageQueue: [],
        phaseStartTime: now,
        failedThisPhase: false,

        // Phase-specific VFX
        showFocusMask: nextConfig.phase === 'NAVIGATION',
        showGhostHand: nextConfig.phase === 'NAVIGATION',
        showTimeDistortion: nextConfig.phase === 'SWAP_MECHANIC',

        // Reset diamonds for phase 7
        diamondsCollected: nextConfig.phase === 'DIAMOND_COLLECTION' ? 0 : state.diamondsCollected,
    };
}

/**
 * Complete the tutorial
 */
export function completeTutorial(state: TutorialState): TutorialState {
    const now = Date.now();

    return {
        ...state,
        isComplete: true,
        showVictoryAnimation: true,
        showUnlockAnimation: true,
        currentMessage: {
            text: '🎉 BAŞARDIN! 🎉',
            duration: 5000,
            style: 'celebration',
            startTime: now,
        },
        messageQueue: [
            {
                text: 'BÖLÜM 1 KİLİDİ AÇILDI!',
                duration: 3000,
                style: 'celebration',
                startTime: now + 2000,
            },
        ],
    };
}

/**
 * Fail current phase (restart from beginning of phase)
 */
export function failPhase(state: TutorialState): TutorialState {
    const currentConfig = PHASE_CONFIGS[state.phaseIndex];
    const now = Date.now();

    return {
        ...state,
        progress: 0,
        failedThisPhase: true,
        phaseStartTime: now,
        currentMessage: {
            text: 'Tekrar dene! ' + currentConfig.message,
            duration: 3000,
            style: 'normal',
            startTime: now,
        },
    };
}

// ============================================================================
// UPDATE LOGIC
// ============================================================================

/**
 * Update tutorial state based on game events
 */
export function update(
    state: TutorialState,
    input: TutorialInputState,
    obstacles: TutorialObstacle[],
    deltaTime: number,
    canvasHeight: number
): TutorialState {
    if (!state.isActive || state.isComplete) {
        return state;
    }

    let newState = { ...state };
    const now = Date.now();
    newState.lastUpdateTime = now;

    // Update message timing
    newState = updateMessages(newState, now);

    // Phase-specific update logic
    switch (state.currentPhase) {
        case 'NAVIGATION':
            newState = updateNavigationPhase(newState, input, canvasHeight);
            break;
        case 'COLOR_MATCH':
            newState = updateColorMatchPhase(newState, obstacles);
            break;
        case 'SWAP_MECHANIC':
            newState = updateSwapPhase(newState, input);
            break;
        case 'CONNECTOR':
            newState = updateConnectorPhase(newState, deltaTime);
            break;
        case 'SHARP_MANEUVER':
            newState = updateSharpManeuverPhase(newState, obstacles);
            break;
        case 'SPEED_TEST':
            newState = updateSpeedTestPhase(newState, obstacles);
            break;
        case 'DIAMOND_COLLECTION':
            newState = updateDiamondPhase(newState);
            break;
    }

    // Check phase completion
    if (newState.progress >= newState.targetGoal) {
        newState = advanceToNextPhase(newState);
    }

    return newState;
}

/**
 * Update message display timing
 */
function updateMessages(state: TutorialState, now: number): TutorialState {
    if (!state.currentMessage) {
        // Try to show next message from queue
        if (state.messageQueue.length > 0) {
            const nextMessage = state.messageQueue[0];
            if (now >= nextMessage.startTime) {
                return {
                    ...state,
                    currentMessage: nextMessage,
                    messageQueue: state.messageQueue.slice(1),
                };
            }
        }
        return state;
    }

    // Check if current message has expired
    const elapsed = now - state.currentMessage.startTime;
    if (elapsed >= state.currentMessage.duration) {
        return {
            ...state,
            currentMessage: null,
        };
    }

    return state;
}

// ============================================================================
// PHASE-SPECIFIC UPDATE LOGIC
// ============================================================================

/**
 * Phase 1: Navigation - reach target positions
 */
function updateNavigationPhase(
    state: TutorialState,
    input: TutorialInputState,
    canvasHeight: number
): TutorialState {
    // Target positions: top third, middle, bottom third
    const targets = [0.25, 0.5, 0.75];
    const currentTarget = targets[Math.min(state.progress, targets.length - 1)];

    // Check if player reached target
    const tolerance = 0.1;
    if (Math.abs(input.playerY - currentTarget) < tolerance) {
        return {
            ...state,
            progress: state.progress + 1,
        };
    }

    return state;
}

/**
 * Phase 2: Color Match - pass through blocks with correct color
 */
function updateColorMatchPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[]
): TutorialState {
    // Count passed obstacles
    const passedCount = obstacles.filter(o => o.passed).length;

    return {
        ...state,
        progress: passedCount,
    };
}

/**
 * Phase 3: Swap - wait for release input then swap
 */
function updateSwapPhase(
    state: TutorialState,
    input: TutorialInputState
): TutorialState {
    // If waiting for release and player released
    if (state.waitingForInput && input.wasReleased) {
        return {
            ...state,
            progress: state.progress + 1,
            waitingForInput: state.progress + 1 < state.targetGoal,
        };
    }

    return state;
}

/**
 * Phase 4: Connector - observe connector expansion over time
 */
function updateConnectorPhase(
    state: TutorialState,
    deltaTime: number
): TutorialState {
    // Progress is time-based (5 seconds)
    const elapsedSeconds = (Date.now() - state.phaseStartTime) / 1000;

    return {
        ...state,
        progress: Math.floor(elapsedSeconds),
    };
}

/**
 * Phase 5: Sharp Maneuver - pass through center-crossing blocks
 */
function updateSharpManeuverPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[]
): TutorialState {
    // Count passed obstacles that crossed center
    const passedCount = obstacles.filter(o => o.passed).length;

    return {
        ...state,
        progress: passedCount,
    };
}

/**
 * Phase 6: Speed Test - pass through blocks at higher speed
 */
function updateSpeedTestPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[]
): TutorialState {
    const passedCount = obstacles.filter(o => o.passed).length;

    return {
        ...state,
        progress: passedCount,
    };
}

/**
 * Phase 7: Diamond Collection - collect diamonds
 */
function updateDiamondPhase(state: TutorialState): TutorialState {
    // Progress is updated externally when diamonds are collected
    return {
        ...state,
        progress: state.diamondsCollected,
    };
}

// ============================================================================
// DIAMOND COLLECTION (Phase 7)
// ============================================================================

/**
 * Called when player collects a diamond in Phase 7
 */
export function collectDiamond(state: TutorialState): TutorialState {
    if (state.currentPhase !== 'DIAMOND_COLLECTION') {
        return state;
    }

    const newDiamonds = state.diamondsCollected + 1;

    return {
        ...state,
        diamondsCollected: newDiamonds,
        progress: newDiamonds,
    };
}

// ============================================================================
// COLLISION HANDLING
// ============================================================================

/**
 * Handle collision during tutorial
 */
export function handleCollision(state: TutorialState): TutorialState {
    if (!state.isActive || state.isComplete) {
        return state;
    }

    // In tutorial, collision restarts current phase
    return failPhase(state);
}

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Get current speed multiplier for game
 */
export function getSpeedMultiplier(state: TutorialState): number {
    return state.isActive ? state.speedMultiplier : 1.0;
}

/**
 * Should obstacles spawn?
 */
export function shouldSpawnObstacles(state: TutorialState): boolean {
    if (!state.isActive) return true;

    // No obstacles in navigation phase
    if (state.currentPhase === 'NAVIGATION') return false;

    // No obstacles in diamond phase
    if (state.currentPhase === 'DIAMOND_COLLECTION') return false;

    return true;
}

/**
 * Should diamonds spawn? (Only in Phase 7)
 */
export function shouldSpawnDiamonds(state: TutorialState): boolean {
    return state.isActive && state.currentPhase === 'DIAMOND_COLLECTION';
}

/**
 * Get current phase config
 */
export function getCurrentPhaseConfig(state: TutorialState): PhaseConfig {
    return PHASE_CONFIGS[state.phaseIndex];
}

/**
 * Is tutorial waiting for specific input?
 */
export function isWaitingForInput(state: TutorialState): boolean {
    return state.waitingForInput;
}

/**
 * Get progress percentage
 */
export function getProgressPercent(state: TutorialState): number {
    if (state.targetGoal === 0) return 0;
    return Math.min(100, (state.progress / state.targetGoal) * 100);
}

/**
 * Get elapsed time since current phase started (ms)
 */
export function getPhaseElapsedTime(state: TutorialState): number {
    if (!state.isActive) return 0;
    return Date.now() - state.phaseStartTime;
}
