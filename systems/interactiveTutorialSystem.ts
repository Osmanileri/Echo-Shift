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

import { playObstaclePass, playStreakBonus } from './audioSystem';
// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * 8 Tutorial Phase (Intro + 7 Gameplay)
 */
export type TutorialPhase =
    | 'INTRO'             // Faz 0: Giriş hikayesi
    | 'NAVIGATION'         // Faz 1: Dikey hareket
    | 'COLOR_MATCH'        // Faz 2: Renk uyumu
    | 'SWAP_MECHANIC'      // Faz 3: Swap mekaniği
    | 'SHARP_MANEUVER'     // Faz 4: Keskin manevralar
    | 'DIAMOND_COLLECTION' // Faz 5: Elmas toplama
    | 'SPEED_TEST';        // Faz 6: Hız testi (Final)

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
    phaseIndex: number;           // 0-7 (INTRO dahil)
    progress: number;             // Current progress toward goal
    targetGoal: number;           // Goal for current phase
    speedMultiplier: number;      // Current speed multiplier
    waitingForInput: boolean;     // Waiting for specific input
    inputType?: 'release' | 'tap';

    // Phase completion tracking
    phasesCompleted: boolean[];   // [false x 8] - INTRO dahil 8 faz

    // Message queue
    currentMessage: TutorialMessage | null;
    messageQueue: TutorialMessage[];

    // VFX triggers
    showFocusMask: boolean;
    showGhostHand: boolean;
    showTimeDistortion: boolean;
    showVictoryAnimation: boolean;
    showUnlockAnimation: boolean;
    showInfoModal: boolean;  // v4: Renk uyumu bilgilendirme ekranı
    pausedForModal?: boolean; // NEW: Global pause when modal is open

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

    // Player slide-in animation (NAVIGATION fazında)
    playerSlideInProgress: number;    // 0 (ekran dışı) -> 1 (yerinde)
    playerSlideInComplete: boolean;

    // NAVIGATION sub-phase for timed sequence
    navigationSubPhase: number;
    focusMaskScale: number;

    // INTRO story animation
    introStoryStep: number;      // 0-5 hangi satır gösteriliyor
    introStoryStartTime: number; // Story ekranının başladığı zaman
    introStoryComplete: boolean; // Tüm satırlar gösterildi mi

    // Scheduled messages tracking
    scheduledMessagesShown: Record<string, boolean>;

    // Tutorial Finish Mode (forward rush animation)
    inFinishMode: boolean;
    finishModeStartTime: number;

    // SWAP_MECHANIC sub-states
    swapSubPhase: number;           // 0=waiting, 1=block approaching, 2=show prompt, 3=success
    swapBlockZoomActive: boolean;   // Zoom effect on block
    swapSuccessTime: number;        // When success was shown
    swapLocked: boolean;

    // COLOR_MATCH persistent counter (blocks don't persist in obstacles array)
    colorMatchBlocksPassed: number;
    colorMatchPassedIds: Set<string>;

    // SHARP_MANEUVER persistent counter (blocks don't persist in obstacles array)
    sharpManeuverBlocksPassed: number;
    sharpManeuverPassedIds: Set<string>; // Track which blocks have been counted
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
    requiresSwap?: boolean; // Added to handle restricted interaction generically
}

// ============================================================================
// PHASE CONFIGURATIONS
// ============================================================================

export const PHASE_CONFIGS: PhaseConfig[] = [
    // Faz 0: Giriş
    {
        phase: 'INTRO',
        title: 'Echo Shift',
        message: 'İki enerji çekirdeğini\nengellerin arasından geçir.\n\n⟨ Dokun ⟩',
        targetGoal: 1,
        speedMultiplier: 0,
        waitForInput: true,
        inputType: 'tap',
    },
    // Faz 1: Hareket
    {
        phase: 'NAVIGATION',
        title: 'Hareket',
        message: 'Yukarı / Aşağı kaydır',
        targetGoal: 3,
        speedMultiplier: 0.5,
        waitForInput: false,
    },
    // Faz 2: Yer Değiştirme (SWAP)
    {
        phase: 'SWAP_MECHANIC',
        title: 'Yer Değiştirme',
        message: 'Ters renk blok geliyor!\nParmağını BIRAK = Yer Değiştir',
        targetGoal: 2,           // 2 başarılı swap yeterli
        speedMultiplier: 0.8,    // Normal yaklaşım hızı
        waitForInput: true,
        inputType: 'release',
    },
    // Faz 3: Renk Eşleştirme (Ana Pratik)
    {
        phase: 'COLOR_MATCH',
        title: 'Pratik Zamanı',
        message: 'Şimdi öğrendiklerini test edelim!\nAynı Renk Top → Aynı Renk Blok',
        targetGoal: 19,
        speedMultiplier: 0.55,
        waitForInput: false,
    },
    // Faz 4: Keskin Manevralar
    {
        phase: 'SHARP_MANEUVER',
        title: 'Keskin Manevralar',
        message: 'Biraz daha zorlaştıralım... Keskin manevralar yap!',
        targetGoal: 5,
        speedMultiplier: 0.8,
        waitForInput: false,
    },
    // Faz 5: Elmas Toplama
    {
        phase: 'DIAMOND_COLLECTION',
        title: '💎 Elmas Avı',
        message: '💎 ELMASLARI TOPLA!\n⚡ DASH güçlendirmesi için!',
        targetGoal: 5,  // 5 diamonds to fill Dash meter
        speedMultiplier: 0.65,  // Orta hız (öğretici)
        waitForInput: false,
    },
    // Faz 6: Hız Testi (Final)
    {
        phase: 'SPEED_TEST',
        title: 'Final: Hız Testi',
        message: 'Sistem hızlanıyor. Odaklan!',
        targetGoal: 10,
        speedMultiplier: 1.2,
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
    const firstPhase = PHASE_CONFIGS[0]; // INTRO fazı

    return {
        isActive: false,
        currentPhase: firstPhase.phase,
        phaseIndex: 0,
        progress: 0,
        targetGoal: firstPhase.targetGoal,
        speedMultiplier: firstPhase.speedMultiplier,
        waitingForInput: firstPhase.waitForInput,
        inputType: firstPhase.inputType,

        phasesCompleted: [false, false, false, false, false, false, false, false], // 8 faz

        currentMessage: null,
        messageQueue: [],

        showFocusMask: false,
        showGhostHand: false,
        showTimeDistortion: false,
        showVictoryAnimation: false,
        showUnlockAnimation: false,
        showInfoModal: false,

        diamondsCollected: 0,
        diamondsToCollect: 5,  // 5 diamonds to fill Dash meter

        phaseStartTime: 0,
        lastUpdateTime: 0,

        failedThisPhase: false,
        isComplete: false,

        // Player slide-in animation
        playerSlideInProgress: 0,
        playerSlideInComplete: false,

        // Timed sequence
        navigationSubPhase: 0,
        focusMaskScale: 0,

        // Intro story animation
        introStoryStep: 0,
        introStoryStartTime: 0,
        introStoryComplete: false,

        scheduledMessagesShown: {},

        // Tutorial Finish Mode
        inFinishMode: false,
        finishModeStartTime: 0,

        // SWAP_MECHANIC sub-states
        swapSubPhase: 0,
        swapBlockZoomActive: false,
        swapSuccessTime: 0,
        swapLocked: true, // Başlangıçta kilitli

        // COLOR_MATCH persistent counter
        colorMatchBlocksPassed: 0,
        colorMatchPassedIds: new Set<string>(),

        // SHARP_MANEUVER persistent counter
        sharpManeuverBlocksPassed: 0,
        sharpManeuverPassedIds: new Set<string>(),
    };
}




/**
 * Start the tutorial
 */
export function startTutorial(state: TutorialState): TutorialState {
    const firstPhase = PHASE_CONFIGS[0]; // INTRO
    const now = Date.now();

    return {
        ...createInitialState(),
        isActive: true,
        phaseStartTime: now,
        lastUpdateTime: now,
        currentMessage: {
            text: firstPhase.message,
            duration: 10000, // INTRO mesajı uzun süre görünsün
            style: 'normal',
            startTime: now,
        },
        showFocusMask: false,  // INTRO'da focus mask yok
        showGhostHand: false,  // INTRO'da ghost hand yok
        playerSlideInProgress: 0, // Başlangıçta ekran dışı
        playerSlideInComplete: false,
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

        swapLocked: true, // Her faz başında swap kilitli (Sadece slow-mo'da açılacak)

        // Reset diamonds for DIAMOND_COLLECTION phase
        diamondsCollected: nextConfig.phase === 'DIAMOND_COLLECTION' ? 0 : state.diamondsCollected,

        // Reset COLOR_MATCH counter for that phase
        colorMatchBlocksPassed: nextConfig.phase === 'COLOR_MATCH' ? 0 : state.colorMatchBlocksPassed,
        colorMatchPassedIds: nextConfig.phase === 'COLOR_MATCH' ? new Set<string>() : state.colorMatchPassedIds,

        // Reset SHARP_MANEUVER counter for that phase
        sharpManeuverBlocksPassed: nextConfig.phase === 'SHARP_MANEUVER' ? 0 : state.sharpManeuverBlocksPassed,
        sharpManeuverPassedIds: nextConfig.phase === 'SHARP_MANEUVER' ? new Set<string>() : state.sharpManeuverPassedIds,
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

    // Phase-specific update logic
    switch (state.currentPhase) {
        case 'INTRO':
            newState = updateIntroPhase(newState, input);
            break;
        case 'NAVIGATION': {
            // TIMED SEQUENCE based on elapsed time
            const elapsed = now - newState.phaseStartTime;

            // Sub-phase timings (milliseconds)
            const WAIT_TIME = 0;          // No wait, start sliding immediately
            const SLIDE_DURATION = 2000;  // Exact 2s slide as requested
            const FOCUS_DELAY = 100;      // Almost immediately start focus mask
            const INSTRUCTION_DELAY = 500; // Shorter delay after focus

            // Sub-phase 0: Wait for few seconds (story absorbed)
            if (newState.navigationSubPhase < 2 && elapsed < WAIT_TIME) {
                newState.navigationSubPhase = 0;
            }
            // Sub-phase 1: Bar sliding in
            else if (newState.navigationSubPhase < 2 && elapsed < WAIT_TIME + SLIDE_DURATION) {
                newState.navigationSubPhase = 1;
                const slideElapsed = elapsed - WAIT_TIME;
                const slideProgress = Math.min(1, slideElapsed / SLIDE_DURATION);
                newState.playerSlideInProgress = slideProgress * slideProgress * (3 - 2 * slideProgress);

                if (slideElapsed > FOCUS_DELAY) {
                    const focusElapsed = slideElapsed - FOCUS_DELAY;
                    newState.focusMaskScale = Math.min(1, focusElapsed / (SLIDE_DURATION - FOCUS_DELAY));
                }
            }
            // Sub-phase 2+: Navigation detection
            else {
                newState.playerSlideInProgress = 1;
                newState.playerSlideInComplete = true;
                newState.focusMaskScale = 1;

                // DEBUG LOG
                if (Math.random() < 0.02) {
                    console.log('[NAV] playerY:', input.playerY.toFixed(3), 'subPhase:', newState.navigationSubPhase);
                }

                // SUB-PHASE 2: Waiting for UP movement
                if (newState.navigationSubPhase === 2 || newState.navigationSubPhase < 2) {
                    if (newState.navigationSubPhase < 2) {
                        newState.navigationSubPhase = 2;
                    }
                    if (!newState.currentMessage || !newState.currentMessage.text.includes('YUKARI')) {
                        newState.currentMessage = {
                            text: '↑ YUKARI KAYDIR',
                            duration: 30000,
                            style: 'normal',
                            startTime: now,
                        };
                    }
                    // Check UP: playerY < 0.48 (relaxed threshold for connector constraints)
                    if (input.playerY < 0.48) {
                        console.log('[NAV] UP DONE! playerY:', input.playerY);
                        playObstaclePass(); // Success tick sound
                        newState.navigationSubPhase = 3;
                        newState.currentMessage = {
                            text: '✓ Harika! Şimdi ↓ AŞAĞI KAYDIR',
                            duration: 30000,
                            style: 'celebration',
                            startTime: now,
                        };
                    }
                }
                // SUB-PHASE 3: Waiting for DOWN movement
                else if (newState.navigationSubPhase === 3) {
                    // Check DOWN: playerY > 0.52 (relaxed threshold for connector constraints)
                    if (input.playerY > 0.52) {
                        console.log('[NAV] DOWN DONE! playerY:', input.playerY);
                        playStreakBonus(); // Celebration sound
                        newState.navigationSubPhase = 4;
                        newState.showInfoModal = true;
                        newState.phaseStartTime = now; // Reset for modal timing
                        newState.currentMessage = {
                            text: '✓✓ ÇOK GÜZEL!',
                            duration: 2000,
                            style: 'celebration',
                            startTime: now,
                        };
                    }
                }
                // SUB-PHASE 4: INFO MODAL displayed
                else if (newState.navigationSubPhase === 4) {
                    // Hide instruction text and focus mask while modal is open
                    newState.currentMessage = null;
                    newState.messageQueue = []; // Force clear queue to prevent reappearing text
                    newState.showFocusMask = false;

                    // Wait at least 1.2 seconds before allowing dismiss (enough for visual scan)
                    const modalDisplayTime = now - newState.phaseStartTime;

                    // Allow dismiss if touched/tapped after delay
                    if (modalDisplayTime > 1200 && (input.isPressed || input.wasTapped)) {
                        console.log('[NAV] INFO MODAL dismissed after', modalDisplayTime, 'ms');
                        playObstaclePass(); // Confirmation sound
                        newState.showInfoModal = false;
                        newState.showFocusMask = true; // Restore focus mask for next phase
                        newState.progress = newState.targetGoal + 1; // Complete phase
                    }
                }
            }
            break;
        }
        case 'COLOR_MATCH':
            newState = updateColorMatchPhase(newState, obstacles, canvasWidth);
            break;
        case 'SWAP_MECHANIC':
            newState = updateSwapPhase(newState, input, obstacles, canvasWidth);
            break;
        case 'SHARP_MANEUVER':
            newState = updateSharpManeuverPhase(newState, obstacles);
            break;
        case 'SPEED_TEST':
            newState = updateSpeedTestPhase(newState, obstacles, canvasWidth);
            break;
        case 'DIAMOND_COLLECTION':
            return updateDiamondCollectionPhase(newState, obstacles, canvasWidth);
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

// INTRO story - welcoming message
const INTRO_STORY_LINES = [
    "Echo Shift'e hoş geldin.",
    "İki enerji çekirdeğini kontrol ediyorsun.",
    "Görevin, çekirdekleri engellerle aynı hizaya getirerek yolun sonuna ulaşmak.",
    "Hadi başlayalım!",
];

const INTRO_DELAY_START = 800;    // 0.8s before first line
const INTRO_LINE_DELAY = 3500;    // 3.5s per line (slower pacing)
const INTRO_TAP_DELAY = 800;      // 0.8s before tap hint

/**
 * Phase 0: Intro - animated story screen then tap to continue
 */
function updateIntroPhase(
    state: TutorialState,
    input: TutorialInputState
): TutorialState {
    const now = Date.now();
    let newState = { ...state };

    // Initialize story start time if not set
    if (newState.introStoryStartTime === 0) {
        newState.introStoryStartTime = now;
    }

    const elapsed = now - newState.introStoryStartTime;

    // Calculate which story step we're on
    if (elapsed < INTRO_DELAY_START) {
        // Waiting period - show nothing
        newState.introStoryStep = -1;
        newState.currentMessage = null;
    } else {
        const lineTime = elapsed - INTRO_DELAY_START;
        const currentStep = Math.min(
            Math.floor(lineTime / INTRO_LINE_DELAY),
            INTRO_STORY_LINES.length - 1
        );

        // Update story step and message
        if (currentStep !== newState.introStoryStep) {
            newState.introStoryStep = currentStep;

            // Build cumulative message (all lines up to current)
            const visibleLines = INTRO_STORY_LINES.slice(0, currentStep + 1);
            newState.currentMessage = {
                text: visibleLines.join('\n'),
                duration: 30000, // Long duration
                style: 'normal',
                startTime: now,
            };
        }

        // Check if all lines shown
        // Custom timing: Last line ("Hadi başlayalım") should be shorter (2000ms) to avoid waiting
        const lastLineIndex = INTRO_STORY_LINES.length - 1;
        const lastLineDuration = 2000;
        const allLinesTime = INTRO_DELAY_START + (lastLineIndex * INTRO_LINE_DELAY) + lastLineDuration;

        if (elapsed > allLinesTime) {
            newState.introStoryComplete = true;
        }
    }

    // Auto-transition immediately when story is complete (no tap required)
    if (newState.introStoryComplete) {
        return {
            ...newState,
            currentPhase: 'NAVIGATION' as any,
            phaseStartTime: now,
            currentMessage: {
                text: "Senkronizasyon başlatılıyor... Bağlantı kuruluyor.",
                duration: 4000,
                style: 'normal',
                startTime: now,
            },
        };
    }

    return newState;
}


/**
 * Phase 1: Navigation - reach target positions
 */

function updateNavigationPhase(
    state: TutorialState,
    input: TutorialInputState,
    canvasHeight: number
): TutorialState {
    const now = Date.now();
    const elapsed = now - state.phaseStartTime;
    let newState = { ...state };

    // DEBUG: Log navigation phase entry
    if (Math.random() < 0.01) {
        console.log('[Tutorial NAV] subPhase:', state.navigationSubPhase, 'elapsed:', elapsed, 'playerY:', input.playerY.toFixed(3));
    }

    // Sub-phase timings
    const SLIDE_DURATION = 2000;

    // === SUB-PHASE 0: SLIDE IN ===
    if (state.navigationSubPhase === 0) {
        // Slide logic
        const slideProgress = Math.min(1, elapsed / SLIDE_DURATION);
        newState.playerSlideInProgress = slideProgress * slideProgress * (3 - 2 * slideProgress);

        if (slideProgress >= 1) {
            // Transition to UP task
            newState.navigationSubPhase = 1;
            newState.currentMessage = {
                text: "KALİBRASYON: Sistem senkronizasyonu için enerjiyi YUKARI yönlendir.",
                duration: 10000,
                style: 'normal',
                startTime: now
            };
            newState.focusMaskScale = 0; // Reset for new anim
        }
    }
    // === SUB-PHASE 1: TEACH UP ===
    else if (state.navigationSubPhase === 1) {
        newState.focusMaskScale = Math.min(1, newState.focusMaskScale + 0.05);

        // DEBUG: Log playerY to see actual values
        if (Math.random() < 0.02) {
            console.log('[Tutorial] SubPhase 1 - playerY:', input.playerY.toFixed(3));
        }

        // Check for Up movement (Y < 0.40) - Relaxed threshold
        if (input.playerY < 0.40) {
            console.log('[Tutorial] UP detected! playerY:', input.playerY);
            // Success -> Transition to DOWN
            newState.navigationSubPhase = 2;
            newState.currentMessage = {
                text: "HİZALAMA: Alt kanal verimliliği için enerjiyi AŞAĞI yönlendir.",
                duration: 10000,
                style: 'normal',
                startTime: now
            };
            // VFX feedback could be triggered here via state flags if needed
        }
    }
    // === SUB-PHASE 2: TEACH DOWN ===
    else if (newState.navigationSubPhase === 2) {
        // DEBUG: Log playerY to see actual values
        if (Math.random() < 0.02) {
            console.log('[Tutorial] SubPhase 2 - playerY:', input.playerY.toFixed(3));
        }

        // Check for Down movement (Y > 0.60) - Relaxed threshold
        if (input.playerY > 0.60) {
            console.log('[Tutorial] DOWN detected! playerY:', input.playerY);
            // Success -> Show INFO MODAL
            newState.navigationSubPhase = 4;
            newState.phaseStartTime = now;
            newState.showInfoModal = true;
            newState.currentMessage = null; // Clear message for modal
        }
    }
    // === SUB-PHASE 4: INFO MODAL ===
    else if (newState.navigationSubPhase === 4) {
        // Wait for tap to dismiss
        if (input.wasTapped || input.wasReleased) {
            newState.navigationSubPhase = 3;
            newState.showInfoModal = false;
            newState.phaseStartTime = now;
            newState.currentMessage = {
                text: "KRİTİK UYARI: Bağlantı stabil değil. Çubuk sürekli uzuyor...\nHareket alanın bu hattın sınırlarıdır.",
                duration: 8000,
                style: 'glitch',
                startTime: now
            };
        }
    }
    // === SUB-PHASE 3: EXPLAIN GROWTH ===
    else if (newState.navigationSubPhase === 3) {
        const explainElapsed = now - state.phaseStartTime;

        // Wait for explanation
        if (explainElapsed > 6000) {
            newState.progress = 100; // Complete phase
            // Advance logic handles transition
            return {
                ...newState,
                progress: newState.targetGoal + 1 // Ensure completion trigger
            };
        }
    }

    // Check completion (if not handled above)
    if (newState.progress > state.targetGoal) {
        return newState;
    }

    return newState;
}

/**
 * Phase 2: Color Match - pass through blocks with correct color
 * Uses persistent counter because obstacles are removed from array after passing
 */
function updateColorMatchPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[],
    canvasWidth: number
): TutorialState {
    let newBlocksPassed = state.colorMatchBlocksPassed;
    const newPassedIds = new Set(state.colorMatchPassedIds);

    // Check for newly passed obstacles (not already counted)
    obstacles.forEach(obs => {
        if (obs.passed && !newPassedIds.has(obs.id)) {
            newPassedIds.add(obs.id);
            newBlocksPassed++;
            playObstaclePass(); // Sound for each passed block
            console.log('[COLOR_MATCH] Block passed:', obs.id, 'Total:', newBlocksPassed);
        }
    });

    // COLOR_MATCH: No slow motion, just normal phase speed
    const speedMultiplier = 0.55; // Faz hızı (sabit)

    // Swap her zaman açık
    const swapLocked = false;

    // Check for phase completion
    if (newBlocksPassed >= state.targetGoal) {
        console.log('[TUTORIAL] COLOR_MATCH phase complete! Passed:', newBlocksPassed, '/', state.targetGoal);
        return advanceToNextPhase({
            ...state,
            speedMultiplier,
            swapLocked,
            colorMatchBlocksPassed: newBlocksPassed,
            colorMatchPassedIds: newPassedIds,
            progress: newBlocksPassed,
        });
    }

    return {
        ...state,
        speedMultiplier,
        swapLocked,
        colorMatchBlocksPassed: newBlocksPassed,
        colorMatchPassedIds: newPassedIds,
        progress: newBlocksPassed,
    };
}

/**
 * Phase 3: Swap Mechanic - Cinematic "Matrix" Pause & Prompt
 * Sub-phases:
 * 0: WAITING - Normal hızda blok yaklaşır
 * 1: FREEZE_FRAME - Blok tehlikeli mesafeye girince oyun donar, zoom başlar
 * 2: ACTION_PROMPT - "ŞİMDİ BIRAK" yazısı ve slow-mo
 * 3: SUCCESS_ANIM - Başarılı swap sonrası kutlama
 */
function updateSwapPhase(
    state: TutorialState,
    input: TutorialInputState,
    obstacles: TutorialObstacle[],
    canvasWidth: number
): TutorialState {
    const now = Date.now();
    let newState = { ...state };
    const playerX = canvasWidth / 8;

    // Hedeflenen "tehlikeli" blok
    const targetBlock = obstacles.find(o => !o.passed && o.x > 0 && o.requiresSwap);

    // === SUB-PHASE 0: WAITING (Normal Akış) ===
    if (newState.swapSubPhase === 0) {
        newState.swapLocked = true; // Swap başlangıçta kilitli

        // Initial Message Update: "Hold to start" context
        // Initial Message Update: "Hold to start" context
        // REMOVED DUPLICATE MESSAGE OVERRIDE HERE
        // Logic moved to phase initialization or relied on default phase message

        // Blok görüş alanına (Mobile: ~300px) girdiğinde uyarı ver
        if (targetBlock && targetBlock.x < 300) {
            // NEW: Trigger Info Modal for the first block ONLY
            if (newState.progress === 0 && !newState.scheduledMessagesShown['swap_info_modal']) {
                newState.showInfoModal = true;
                newState.pausedForModal = true;
                newState.scheduledMessagesShown['swap_info_modal'] = true;
                return newState; // Stop update while modal is open
            }

            newState.swapSubPhase = 1;
            // SECURITY: Ensure modal is closed
            newState.showInfoModal = false;
            newState.pausedForModal = false;

            // Note: Removed playNearMiss() sound - was confusing for users
        }
    }

    // === SUB-PHASE 1: BLOCK VISIBLE (WARNING) ===
    else if (newState.swapSubPhase === 1) {
        newState.swapLocked = true; // Hala kilitli

        // Blok yaklaşırken ambient uyarısı ver
        if (targetBlock && targetBlock.x < playerX + 150 && !newState.showTimeDistortion) {
            newState.showTimeDistortion = true;
            newState.currentMessage = {
                text: "TERS RENK GELİYOR!\nHAZIR OL...",
                duration: 2000,
                style: 'glitch',
                startTime: now,
            };
        }

        // Blok çok yakın mesafeye (35px - Extreme close) girdiğinde -> Aksiyon fazına geç
        if (targetBlock && targetBlock.x < playerX + 35) {
            newState.swapSubPhase = 2;
            newState.speedMultiplier = 0.15; // Matrix Slow-Mo (Faster: 0.05 -> 0.15)
            newState.swapBlockZoomActive = true; // Zoom yap
            newState.swapLocked = false; // KİLİDİ AÇ!
            newState.swapLocked = false; // KİLİDİ AÇ!
            newState.phaseStartTime = now;

            // SECURITY: Ensure modal is closed
            newState.showInfoModal = false;
            newState.pausedForModal = false;

            // Mesajı güncelle
            newState.currentMessage = {
                text: "DİKKAT! TERS RENK!\nŞİMDİ DÖNDÜR!",
                duration: 10000,
                style: 'celebration',
                startTime: now,
            };
        }
    }

    // === SUB-PHASE 2: CRITICAL MOMENT (ACTION) ===
    else if (newState.swapSubPhase === 2) {
        // Ensure message is correct based on platform
        const actionText = "ŞİMDİ DÖNDÜR!\n(Ekrana TIKLA)";
        if (!newState.currentMessage || !newState.currentMessage.text.includes('DÖNDÜR')) {
            newState.currentMessage = {
                text: actionText,
                duration: 10000,
                style: 'celebration',
                startTime: now,
            };
        }

        // Oyuncu swap yaptı mı? VEYA block zaten geçildi mi? (Hayatta kaldıysa başarmıştır)
        const isBlockPassed = !targetBlock || targetBlock.x < playerX - 50;

        if (input.wasTapped || input.wasReleased || isBlockPassed) {
            // Eğer block geçildiyse ve subPhase hala 2 ise, input kaçmış olabilir.
            // Biz yine de başarı sayalım çünkü ölmedi.
            newState.swapSubPhase = 3;
            newState.swapSuccessTime = now;
            newState.swapBlockZoomActive = false; // Zoom kapa
            newState.speedMultiplier = 0.5; // Hızlan
            newState.swapLocked = false;

            newState.currentMessage = {
                text: "HARİKA! 🎉\nBAŞARDIN!",
                duration: 2000,
                style: 'celebration',
                startTime: now,
            };
            playStreakBonus(); // Success sound

            newState.progress = newState.progress + 1;
        }
    }

    // === SUB-PHASE 3: POST SUCCESS ===
    else if (newState.swapSubPhase === 3) {
        // Wait for 1.5 seconds (reduced from 2.5s) then continue
        const successElapsed = now - newState.swapSuccessTime;
        if (successElapsed > 1500) {
            newState.swapSubPhase = 0; // Reset for next block
            newState.speedMultiplier = 0.8;
            newState.swapLocked = true;
            newState.showTimeDistortion = false;
            // Eğer daha yapılacak varsa devam et
            if (newState.progress < newState.targetGoal) {
                newState.currentMessage = {
                    text: "HADİ BİR KEZ DAHA!",
                    duration: 3000,
                    style: 'celebration', // Make it pop!
                    startTime: now,
                };
            }
        }
    }

    return newState;
}




/**
 * Phase 5: Sharp Maneuver - pass through center-crossing blocks
 * Uses persistent counter because obstacles are removed from array after passing
 */
function updateSharpManeuverPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[]
): TutorialState {
    let newBlocksPassed = state.sharpManeuverBlocksPassed;
    const newPassedIds = new Set(state.sharpManeuverPassedIds);

    // Check for newly passed obstacles (not already counted)
    obstacles.forEach(obs => {
        if (obs.passed && !newPassedIds.has(obs.id)) {
            newPassedIds.add(obs.id);
            newBlocksPassed++;
            console.log('[SHARP_MANEUVER] Block passed:', obs.id, 'Total:', newBlocksPassed);
        }
    });

    // DEBUG: Log progress periodically
    if (Math.random() < 0.02) {
        console.log('[SHARP_MANEUVER] obstacles:', obstacles.length, 'persistentPassed:', newBlocksPassed, 'target:', state.targetGoal);
    }

    // S.H.I.F.T. mekaniği aktif (Keskin manevralar için swap gerekli olabilir)
    const swapLocked = false;

    return {
        ...state,
        swapLocked,
        sharpManeuverBlocksPassed: newBlocksPassed,
        sharpManeuverPassedIds: newPassedIds,
        progress: newBlocksPassed,
    };
}

/**
 * Phase 6: Speed Test - pass through blocks at higher speed
 */
function updateSpeedTestPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[],
    canvasWidth: number
): TutorialState {
    const now = Date.now();
    let newState = { ...state };
    const playerX = canvasWidth / 8;
    const passedCount = obstacles.filter(o => o.passed).length;

    // SPEED_TEST: No slow motion, fast phase speed
    newState.speedMultiplier = 1.2; // Faz hızı (sabit, hızlı)

    // Swap her zaman açık
    newState.swapLocked = false;

    return {
        ...newState,
        progress: passedCount,
    };
}

/**
 * Phase 5: Diamond Collection - collect diamonds to fill Dash meter
 * Shows enticing teaser about Dash feature when complete
 */
function updateDiamondCollectionPhase(
    state: TutorialState,
    obstacles: TutorialObstacle[],
    canvasWidth: number
): TutorialState {
    let newState = { ...state };

    // DIAMOND_COLLECTION: No slow motion, steady phase speed
    newState.speedMultiplier = 0.65; // Faz hızı (sabit)

    // Swap her zaman açık
    newState.swapLocked = false;

    // Check for phase completion (5 diamonds)
    if (newState.diamondsCollected >= state.targetGoal) {
        console.log('[TUTORIAL] DIAMOND_COLLECTION phase complete! Diamonds:', newState.diamondsCollected);

        // Show teaser message before advancing
        newState.currentMessage = {
            text: '⚡ DASH HAZIR! ⚡\nÇift tıkla aktif et - AMA ŞİMDİ DEĞİL!\nGerçek oyunda dene!',
            duration: 3500,
            style: 'celebration',
            startTime: Date.now(),
        };

        // Advance to next phase after showing message
        return advanceToNextPhase({
            ...newState,
            progress: newState.diamondsCollected,
        });
    }

    return {
        ...newState,
        progress: newState.diamondsCollected,
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
