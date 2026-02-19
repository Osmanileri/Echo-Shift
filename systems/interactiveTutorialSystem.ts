/**
 * Interactive Tutorial System - Echo Shift
 * 7 Aşamalı Eğitim Sistemi (Tam Yeniden Yazım)
 * 
 * Akış: INTRO → NAVIGATION → SWAP_MECHANIC → COLOR_MATCH → SHARP_MANEUVER → DIAMOND_COLLECTION → SPEED_TEST
 * 
 * Düzeltilen kritik hatalar:
 * - INTRO→NAVIGATION phaseIndex güncellenmiyordu → advanceToNextPhase kullanılıyor
 * - Obstacle ID'ler frame başına değişiyordu → pattern block.id kullanılıyor
 * - SPEED_TEST targetGoal=10 ama 8 blok vardı → targetGoal=8
 * - failPhase sub-state'leri resetlemiyordu → tam reset
 * - Dead updateNavigationPhase fonksiyonu kaldırıldı
 * - NAVIGATION inline code → temiz fonksiyona taşındı
 */

import { playObstaclePass, playStreakBonus } from './audioSystem';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type TutorialPhase =
    | 'INTRO'
    | 'NAVIGATION'
    | 'SWAP_MECHANIC'
    | 'COLOR_MATCH'
    | 'SHARP_MANEUVER'
    | 'DIAMOND_COLLECTION'
    | 'SPEED_TEST';

export interface TutorialMessage {
    text: string;
    duration: number;
    style: 'normal' | 'glitch' | 'celebration';
    startTime: number;
}

export interface PhaseConfig {
    phase: TutorialPhase;
    title: string;
    message: string;
    targetGoal: number;
    speedMultiplier: number;
    waitForInput: boolean;
    inputType?: 'release' | 'tap';
}

export interface TutorialState {
    isActive: boolean;
    currentPhase: TutorialPhase;
    phaseIndex: number;
    progress: number;
    targetGoal: number;
    speedMultiplier: number;
    waitingForInput: boolean;
    inputType?: 'release' | 'tap';

    phasesCompleted: boolean[];

    currentMessage: TutorialMessage | null;
    messageQueue: TutorialMessage[];

    // VFX triggers
    showFocusMask: boolean;
    showGhostHand: boolean;
    showTimeDistortion: boolean;
    showVictoryAnimation: boolean;
    showUnlockAnimation: boolean;
    showInfoModal: boolean;
    pausedForModal?: boolean;

    // Diamond collection
    diamondsCollected: number;
    diamondsToCollect: number;

    // Timing
    phaseStartTime: number;
    lastUpdateTime: number;

    // Failure tracking
    failedThisPhase: boolean;

    // Tutorial complete flag
    isComplete: boolean;

    // Player slide-in animation
    playerSlideInProgress: number;
    playerSlideInComplete: boolean;

    // NAVIGATION sub-phase
    navigationSubPhase: number;
    focusMaskScale: number;

    // INTRO story animation
    introStoryStep: number;
    introStoryStartTime: number;
    introStoryComplete: boolean;

    // Scheduled messages tracking
    scheduledMessagesShown: Record<string, boolean>;

    // Tutorial Finish Mode
    inFinishMode: boolean;
    finishModeStartTime: number;
    completionCallbackFired: boolean;

    // SWAP_MECHANIC sub-states
    swapSubPhase: number;
    swapBlockZoomActive: boolean;
    swapSuccessTime: number;
    swapLocked: boolean;
    swapSuccessCount: number;

    // Persistent block-passed counters (blocks leave obstacles array after passing)
    colorMatchBlocksPassed: number;
    colorMatchPassedIds: Set<string>;
    sharpManeuverBlocksPassed: number;
    sharpManeuverPassedIds: Set<string>;
    speedTestBlocksPassed: number;
    speedTestPassedIds: Set<string>;
}

export interface TutorialInputState {
    isPressed: boolean;
    wasReleased: boolean;
    wasTapped: boolean;
    playerY: number;
    isSwapped: boolean;
}

export interface TutorialObstacle {
    id: string;
    x: number;
    y: number;
    lane: 'top' | 'bottom';
    polarity: 'white' | 'black';
    passed: boolean;
    requiresSwap?: boolean;
}

// ============================================================================
// PHASE CONFIGURATIONS
// ============================================================================

export const PHASE_CONFIGS: PhaseConfig[] = [
    {
        phase: 'INTRO',
        title: 'Echo Shift',
        message: 'İki enerji çekirdeğini\nengellerin arasından geçir.\n\n⟨ Dokun ⟩',
        targetGoal: 1,
        speedMultiplier: 0,
        waitForInput: true,
        inputType: 'tap',
    },
    {
        phase: 'NAVIGATION',
        title: 'Hareket',
        message: 'Yukarı / Aşağı kaydır',
        targetGoal: 3,
        speedMultiplier: 0.5,
        waitForInput: false,
    },
    {
        phase: 'SWAP_MECHANIC',
        title: 'Yer Değiştirme',
        message: 'Ters renk blok geliyor!\nParmağını BIRAK = Yer Değiştir',
        targetGoal: 2,
        speedMultiplier: 0.8,
        waitForInput: true,
        inputType: 'release',
    },
    {
        phase: 'COLOR_MATCH',
        title: 'Pratik Zamanı',
        message: 'Şimdi öğrendiklerini test edelim!\nAynı Renk Top → Aynı Renk Blok',
        targetGoal: 19,
        speedMultiplier: 0.55,
        waitForInput: false,
    },
    {
        phase: 'SHARP_MANEUVER',
        title: 'Keskin Manevralar',
        message: 'Biraz daha zorlaştıralım...\nKeskin manevralar yap!',
        targetGoal: 5,
        speedMultiplier: 0.8,
        waitForInput: false,
    },
    {
        phase: 'DIAMOND_COLLECTION',
        title: '💎 Elmas Avı',
        message: '💎 ELMASLARI TOPLA!\n⚡ DASH güçlendirmesi için!',
        targetGoal: 5,
        speedMultiplier: 0.65,
        waitForInput: false,
    },
    {
        phase: 'SPEED_TEST',
        title: 'Final: Hız Testi',
        message: 'Sistem hızlanıyor. Odaklan!',
        targetGoal: 8,   // Matches actual block count in tutorialBlockPatterns.ts
        speedMultiplier: 1.2,
        waitForInput: false,
    },
];

// ============================================================================
// INTRO STORY
// ============================================================================

const INTRO_STORY_LINES = [
    "Echo Shift'e hoş geldin.",
    "İki enerji çekirdeğini kontrol ediyorsun.",
    "Görevin, çekirdekleri engellerle aynı hizaya getirerek yolun sonuna ulaşmak.",
    "Hadi başlayalım!",
];

const INTRO_DELAY_START = 800;
const INTRO_LINE_DELAY = 3500;

// ============================================================================
// STATE CREATION
// ============================================================================

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

        phasesCompleted: new Array(PHASE_CONFIGS.length).fill(false),

        currentMessage: null,
        messageQueue: [],

        showFocusMask: false,
        showGhostHand: false,
        showTimeDistortion: false,
        showVictoryAnimation: false,
        showUnlockAnimation: false,
        showInfoModal: false,

        diamondsCollected: 0,
        diamondsToCollect: 5,

        phaseStartTime: 0,
        lastUpdateTime: 0,

        failedThisPhase: false,
        isComplete: false,

        playerSlideInProgress: 0,
        playerSlideInComplete: false,

        navigationSubPhase: 0,
        focusMaskScale: 0,

        introStoryStep: 0,
        introStoryStartTime: 0,
        introStoryComplete: false,

        scheduledMessagesShown: {},

        inFinishMode: false,
        finishModeStartTime: 0,
        completionCallbackFired: false,

        swapSubPhase: 0,
        swapBlockZoomActive: false,
        swapSuccessTime: 0,
        swapLocked: true,
        swapSuccessCount: 0,

        colorMatchBlocksPassed: 0,
        colorMatchPassedIds: new Set<string>(),
        sharpManeuverBlocksPassed: 0,
        sharpManeuverPassedIds: new Set<string>(),
        speedTestBlocksPassed: 0,
        speedTestPassedIds: new Set<string>(),
    };
}

export function startTutorial(state: TutorialState): TutorialState {
    const firstPhase = PHASE_CONFIGS[0];
    const now = Date.now();

    return {
        ...createInitialState(),
        isActive: true,
        phaseStartTime: now,
        lastUpdateTime: now,
        currentMessage: {
            text: firstPhase.message,
            duration: 30000,
            style: 'normal',
            startTime: now,
        },
        showFocusMask: false,
        showGhostHand: false,
        playerSlideInProgress: 0,
        playerSlideInComplete: false,
    };
}

// ============================================================================
// PHASE MANAGEMENT
// ============================================================================

export function advanceToNextPhase(state: TutorialState): TutorialState {
    const nextIndex = state.phaseIndex + 1;

    if (nextIndex >= PHASE_CONFIGS.length) {
        return completeTutorial(state);
    }

    const nextConfig = PHASE_CONFIGS[nextIndex];
    const now = Date.now();

    const newPhasesCompleted = [...state.phasesCompleted];
    newPhasesCompleted[state.phaseIndex] = true;

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
        showInfoModal: false,

        // Reset all sub-states for clean phase entry
        swapSubPhase: 0,
        swapBlockZoomActive: false,
        swapSuccessTime: 0,
        swapLocked: nextConfig.phase === 'SWAP_MECHANIC',
        swapSuccessCount: 0,

        navigationSubPhase: nextConfig.phase === 'NAVIGATION' ? 0 : state.navigationSubPhase,
        focusMaskScale: nextConfig.phase === 'NAVIGATION' ? 0 : state.focusMaskScale,
        playerSlideInProgress: nextConfig.phase === 'NAVIGATION' ? 0 : state.playerSlideInProgress,
        playerSlideInComplete: nextConfig.phase === 'NAVIGATION' ? false : state.playerSlideInComplete,

        // Reset phase-specific counters
        diamondsCollected: nextConfig.phase === 'DIAMOND_COLLECTION' ? 0 : state.diamondsCollected,
        colorMatchBlocksPassed: nextConfig.phase === 'COLOR_MATCH' ? 0 : state.colorMatchBlocksPassed,
        colorMatchPassedIds: nextConfig.phase === 'COLOR_MATCH' ? new Set<string>() : state.colorMatchPassedIds,
        sharpManeuverBlocksPassed: nextConfig.phase === 'SHARP_MANEUVER' ? 0 : state.sharpManeuverBlocksPassed,
        sharpManeuverPassedIds: nextConfig.phase === 'SHARP_MANEUVER' ? new Set<string>() : state.sharpManeuverPassedIds,
        speedTestBlocksPassed: nextConfig.phase === 'SPEED_TEST' ? 0 : state.speedTestBlocksPassed,
        speedTestPassedIds: nextConfig.phase === 'SPEED_TEST' ? new Set<string>() : state.speedTestPassedIds,
    };
}

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
        // Reset ALL sub-states for a true phase restart
        swapSubPhase: 0,
        swapBlockZoomActive: false,
        swapSuccessTime: 0,
        swapLocked: currentConfig.phase === 'SWAP_MECHANIC',
        swapSuccessCount: 0,
        showTimeDistortion: currentConfig.phase === 'SWAP_MECHANIC',

        // Reset persistent counters for the current phase
        diamondsCollected: state.currentPhase === 'DIAMOND_COLLECTION' ? 0 : state.diamondsCollected,
        colorMatchBlocksPassed: state.currentPhase === 'COLOR_MATCH' ? 0 : state.colorMatchBlocksPassed,
        colorMatchPassedIds: state.currentPhase === 'COLOR_MATCH' ? new Set<string>() : state.colorMatchPassedIds,
        sharpManeuverBlocksPassed: state.currentPhase === 'SHARP_MANEUVER' ? 0 : state.sharpManeuverBlocksPassed,
        sharpManeuverPassedIds: state.currentPhase === 'SHARP_MANEUVER' ? new Set<string>() : state.sharpManeuverPassedIds,
        speedTestBlocksPassed: state.currentPhase === 'SPEED_TEST' ? 0 : state.speedTestBlocksPassed,
        speedTestPassedIds: state.currentPhase === 'SPEED_TEST' ? new Set<string>() : state.speedTestPassedIds,
    };
}

// ============================================================================
// MAIN UPDATE
// ============================================================================

export function update(
    state: TutorialState,
    input: TutorialInputState,
    obstacles: TutorialObstacle[],
    deltaTime: number,
    canvasWidth: number,
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

    // Phase-specific update
    switch (newState.currentPhase) {
        case 'INTRO':
            newState = updateIntroPhase(newState);
            break;

        case 'NAVIGATION':
            newState = updateNavigationPhase(newState, input, now);
            break;

        case 'SWAP_MECHANIC':
            newState = updateSwapPhase(newState, input, obstacles, canvasWidth);
            break;

        case 'COLOR_MATCH':
            newState = updateColorMatchPhase(newState, obstacles);
            break;

        case 'SHARP_MANEUVER':
            newState = updateSharpManeuverPhase(newState, obstacles);
            break;

        case 'DIAMOND_COLLECTION':
            newState = updateDiamondCollectionPhase(newState);
            break;

        case 'SPEED_TEST':
            newState = updateSpeedTestPhase(newState, obstacles);
            break;
    }

    // Check phase completion (INTRO and NAVIGATION handle their own transitions)
    if (newState.progress >= newState.targetGoal &&
        newState.currentPhase !== 'INTRO' &&
        newState.currentPhase !== 'NAVIGATION') {
        newState = advanceToNextPhase(newState);
    }

    return newState;
}

function updateMessages(state: TutorialState, now: number): TutorialState {
    if (!state.currentMessage) {
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

    const elapsed = now - state.currentMessage.startTime;
    if (elapsed >= state.currentMessage.duration) {
        return { ...state, currentMessage: null };
    }

    return state;
}

// ============================================================================
// PHASE: INTRO
// ============================================================================

function updateIntroPhase(state: TutorialState): TutorialState {
    const now = Date.now();
    let newState = { ...state };

    if (newState.introStoryStartTime === 0) {
        newState.introStoryStartTime = now;
    }

    const elapsed = now - newState.introStoryStartTime;

    if (elapsed < INTRO_DELAY_START) {
        newState.introStoryStep = -1;
        newState.currentMessage = null;
    } else {
        const lineTime = elapsed - INTRO_DELAY_START;
        const currentStep = Math.min(
            Math.floor(lineTime / INTRO_LINE_DELAY),
            INTRO_STORY_LINES.length - 1
        );

        if (currentStep !== newState.introStoryStep) {
            newState.introStoryStep = currentStep;
            const visibleLines = INTRO_STORY_LINES.slice(0, currentStep + 1);
            newState.currentMessage = {
                text: visibleLines.join('\n'),
                duration: 30000,
                style: 'normal',
                startTime: now,
            };
        }

        const lastLineIndex = INTRO_STORY_LINES.length - 1;
        const lastLineDuration = 2000;
        const allLinesTime = INTRO_DELAY_START + (lastLineIndex * INTRO_LINE_DELAY) + lastLineDuration;

        if (elapsed > allLinesTime) {
            newState.introStoryComplete = true;
        }
    }

    // FIX: Use advanceToNextPhase to properly update phaseIndex
    if (newState.introStoryComplete) {
        return advanceToNextPhase(newState);
    }

    return newState;
}

// ============================================================================
// PHASE: NAVIGATION
// ============================================================================

function updateNavigationPhase(
    state: TutorialState,
    input: TutorialInputState,
    now: number
): TutorialState {
    let newState = { ...state };
    const elapsed = now - newState.phaseStartTime;

    const SLIDE_DURATION = 2000;
    const FOCUS_DELAY = 100;

    // SUB-PHASE 0/1: Slide-in animation
    if (newState.navigationSubPhase < 2) {
        if (elapsed < SLIDE_DURATION) {
            newState.navigationSubPhase = 1;
            const slideProgress = Math.min(1, elapsed / SLIDE_DURATION);
            newState.playerSlideInProgress = slideProgress * slideProgress * (3 - 2 * slideProgress);

            if (elapsed > FOCUS_DELAY) {
                const focusElapsed = elapsed - FOCUS_DELAY;
                newState.focusMaskScale = Math.min(1, focusElapsed / (SLIDE_DURATION - FOCUS_DELAY));
            }
        } else {
            newState.playerSlideInProgress = 1;
            newState.playerSlideInComplete = true;
            newState.focusMaskScale = 1;
            newState.navigationSubPhase = 2;
            newState.currentMessage = {
                text: '↑ YUKARI KAYDIR',
                duration: 30000,
                style: 'normal',
                startTime: now,
            };
        }
        return newState;
    }

    // SUB-PHASE 2: Teach UP
    if (newState.navigationSubPhase === 2) {
        if (!newState.currentMessage || !newState.currentMessage.text.includes('YUKARI')) {
            newState.currentMessage = {
                text: '↑ YUKARI KAYDIR',
                duration: 30000,
                style: 'normal',
                startTime: now,
            };
        }
        if (input.playerY < 0.48) {
            playObstaclePass();
            newState.navigationSubPhase = 3;
            newState.currentMessage = {
                text: '✓ Harika! Şimdi ↓ AŞAĞI KAYDIR',
                duration: 30000,
                style: 'celebration',
                startTime: now,
            };
        }
        return newState;
    }

    // SUB-PHASE 3: Teach DOWN
    if (newState.navigationSubPhase === 3) {
        if (input.playerY > 0.52) {
            playStreakBonus();
            newState.navigationSubPhase = 4;
            newState.showInfoModal = true;
            newState.pausedForModal = true;
            newState.phaseStartTime = now;
            newState.currentMessage = {
                text: '✓✓ ÇOK GÜZEL!',
                duration: 2000,
                style: 'celebration',
                startTime: now,
            };
        }
        return newState;
    }

    // SUB-PHASE 4: Info modal displayed → dismiss → advance
    if (newState.navigationSubPhase === 4) {
        newState.currentMessage = null;
        newState.messageQueue = [];
        newState.showFocusMask = false;

        const modalDisplayTime = now - newState.phaseStartTime;
        if (modalDisplayTime > 1200 && (input.isPressed || input.wasTapped)) {
            playObstaclePass();
            newState.showInfoModal = false;
            newState.pausedForModal = false;
            newState.showFocusMask = true;
            newState.progress = newState.targetGoal + 1;
            return advanceToNextPhase(newState);
        }
        return newState;
    }

    return newState;
}

// ============================================================================
// PHASE: SWAP MECHANIC
// ============================================================================

function updateSwapPhase(
    state: TutorialState,
    input: TutorialInputState,
    obstacles: TutorialObstacle[],
    canvasWidth: number
): TutorialState {
    const now = Date.now();
    let newState = { ...state };
    const playerX = canvasWidth / 8;

    const targetBlock = obstacles.find(o => !o.passed && o.x > 0 && o.requiresSwap);

    // === SUB-PHASE 0: WAITING for block to appear ===
    if (newState.swapSubPhase === 0) {
        newState.swapLocked = true;

        if (targetBlock && targetBlock.x < 300) {
            newState.swapSubPhase = 1;
            newState.currentMessage = {
                text: '⚠ TERS RENK BLOK GELİYOR!',
                duration: 5000,
                style: 'glitch',
                startTime: now,
            };
        }
        return newState;
    }

    // === SUB-PHASE 1: BLOCK APPROACHING (slow-mo warning) ===
    if (newState.swapSubPhase === 1) {
        newState.swapLocked = true;

        if (targetBlock && targetBlock.x < playerX + 150 && !newState.showTimeDistortion) {
            newState.showTimeDistortion = true;
            newState.speedMultiplier = 0.15;
        }

        if (targetBlock && targetBlock.x < playerX + 35) {
            newState.swapSubPhase = 2;
            newState.swapLocked = false;
            newState.swapBlockZoomActive = true;
            newState.speedMultiplier = 0.05;
            newState.currentMessage = {
                text: 'ŞİMDİ DÖNDÜR!\n(Ekrana TIKLA)',
                duration: 10000,
                style: 'glitch',
                startTime: now,
            };
        }
        return newState;
    }

    // === SUB-PHASE 2: CRITICAL MOMENT (action) ===
    if (newState.swapSubPhase === 2) {
        const isBlockPassed = !targetBlock || targetBlock.x < playerX - 50;

        if (input.wasTapped || input.wasReleased || isBlockPassed) {
            newState.swapSubPhase = 3;
            newState.swapSuccessCount += 1;
            newState.swapBlockZoomActive = false;
            newState.showTimeDistortion = false;
            newState.speedMultiplier = PHASE_CONFIGS[state.phaseIndex].speedMultiplier;
            newState.swapSuccessTime = now;
            newState.swapLocked = true;
            playStreakBonus();

            newState.currentMessage = {
                text: `✓ BAŞARILI! (${newState.swapSuccessCount}/${state.targetGoal})`,
                duration: 1500,
                style: 'celebration',
                startTime: now,
            };
        }
        return newState;
    }

    // === SUB-PHASE 3: POST SUCCESS (wait then reset for next block) ===
    if (newState.swapSubPhase === 3) {
        const successElapsed = now - newState.swapSuccessTime;
        if (successElapsed > 1500) {
            newState.progress = newState.swapSuccessCount;

            if (newState.progress >= newState.targetGoal) {
                return newState; // Will be advanced by main update loop
            }

            newState.swapSubPhase = 0;
            newState.swapLocked = true;
            newState.currentMessage = {
                text: 'Bir sonraki blok geliyor...',
                duration: 3000,
                style: 'normal',
                startTime: now,
            };
        }
        return newState;
    }

    return newState;
}

// ============================================================================
// PHASE: COLOR MATCH
// ============================================================================

function updateColorMatchPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[]
): TutorialState {
    let newBlocksPassed = state.colorMatchBlocksPassed;
    const newPassedIds = new Set(state.colorMatchPassedIds);

    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (obs.passed && !newPassedIds.has(obs.id)) {
            newPassedIds.add(obs.id);
            newBlocksPassed++;
        }
    }

    return {
        ...state,
        speedMultiplier: 0.55,
        swapLocked: false,
        colorMatchBlocksPassed: newBlocksPassed,
        colorMatchPassedIds: newPassedIds,
        progress: newBlocksPassed,
    };
}

// ============================================================================
// PHASE: SHARP MANEUVER
// ============================================================================

function updateSharpManeuverPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[]
): TutorialState {
    let newBlocksPassed = state.sharpManeuverBlocksPassed;
    const newPassedIds = new Set(state.sharpManeuverPassedIds);

    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (obs.passed && !newPassedIds.has(obs.id)) {
            newPassedIds.add(obs.id);
            newBlocksPassed++;
        }
    }

    return {
        ...state,
        swapLocked: false,
        sharpManeuverBlocksPassed: newBlocksPassed,
        sharpManeuverPassedIds: newPassedIds,
        progress: newBlocksPassed,
    };
}

// ============================================================================
// PHASE: DIAMOND COLLECTION
// ============================================================================

function updateDiamondCollectionPhase(state: TutorialState): TutorialState {
    let newState = { ...state };
    newState.speedMultiplier = 0.65;
    newState.swapLocked = false;

    if (newState.diamondsCollected >= state.targetGoal) {
        newState.currentMessage = {
            text: '⚡ DASH HAZIR! ⚡\nGerçek oyunda çift tıkla aktif et!',
            duration: 3500,
            style: 'celebration',
            startTime: Date.now(),
        };
        newState.progress = newState.diamondsCollected;
        return advanceToNextPhase(newState);
    }

    return {
        ...newState,
        progress: newState.diamondsCollected,
    };
}

// ============================================================================
// PHASE: SPEED TEST
// ============================================================================

function updateSpeedTestPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[]
): TutorialState {
    let newBlocksPassed = state.speedTestBlocksPassed;
    const newPassedIds = new Set(state.speedTestPassedIds);

    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (obs.passed && !newPassedIds.has(obs.id)) {
            newPassedIds.add(obs.id);
            newBlocksPassed++;
        }
    }

    return {
        ...state,
        speedMultiplier: 1.2,
        swapLocked: false,
        speedTestBlocksPassed: newBlocksPassed,
        speedTestPassedIds: newPassedIds,
        progress: newBlocksPassed,
    };
}

// ============================================================================
// DIAMOND COLLECTION CALLBACK
// ============================================================================

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

export function handleCollision(state: TutorialState): TutorialState {
    if (!state.isActive || state.isComplete) {
        return state;
    }
    return failPhase(state);
}

// ============================================================================
// GETTERS
// ============================================================================

export function getSpeedMultiplier(state: TutorialState): number {
    return state.isActive ? state.speedMultiplier : 1.0;
}

export function shouldSpawnObstacles(state: TutorialState): boolean {
    if (!state.isActive) return true;
    if (state.currentPhase === 'INTRO') return false;
    if (state.currentPhase === 'NAVIGATION') return false;
    if (state.currentPhase === 'DIAMOND_COLLECTION') return false;
    return true;
}

export function shouldSpawnDiamonds(state: TutorialState): boolean {
    return state.isActive && state.currentPhase === 'DIAMOND_COLLECTION';
}

export function getCurrentPhaseConfig(state: TutorialState): PhaseConfig {
    return PHASE_CONFIGS[state.phaseIndex];
}

export function isWaitingForInput(state: TutorialState): boolean {
    return state.waitingForInput;
}

export function getProgressPercent(state: TutorialState): number {
    if (state.targetGoal === 0) return 0;
    return Math.min(100, (state.progress / state.targetGoal) * 100);
}

export function getPhaseElapsedTime(state: TutorialState): number {
    if (!state.isActive) return 0;
    return Date.now() - state.phaseStartTime;
}
