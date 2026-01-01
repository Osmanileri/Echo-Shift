/**
 * Start Sequence System - Cinematic Countdown & Slide-In
 * Handles the 3-2-1-GO countdown before gameplay starts
 * 
 * Features:
 * - Countdown timer with neon visual overlay
 * - Player slide-in animation from off-screen
 * - Background blur during countdown
 * - Audio sync for countdown beats
 */

// Countdown duration per number (ms) - 700ms for snappy feel
const COUNTDOWN_INTERVAL = 700;
// Total countdown start value
const COUNTDOWN_START = 3;
// Player slide-in starts at this countdown value
const SLIDE_START_VALUE = 1;
// "GO" display duration before fade
const GO_DISPLAY_DURATION = 400;
// Grace period after GO before obstacles spawn (ms)
const GRACE_PERIOD_DURATION = 1500;

export interface StartSequenceState {
    isActive: boolean;
    countdownValue: number; // 3, 2, 1, 0 (GO), -1 (complete)
    startTime: number;
    lastTickValue: number; // Track last played tick for audio
    goDisplayTime: number; // When "GO" was shown
    // Grace period - obstacles don't spawn during this time
    gracePeriodEndTime: number;
    inGracePeriod: boolean;
}

/**
 * Create initial start sequence state
 */
export function createInitialState(): StartSequenceState {
    return {
        isActive: true,
        countdownValue: COUNTDOWN_START,
        startTime: 0,
        lastTickValue: COUNTDOWN_START + 1,
        goDisplayTime: 0,
        gracePeriodEndTime: 0,
        inGracePeriod: false,
    };
}

/**
 * Reset start sequence to initial state
 */
export function resetState(): StartSequenceState {
    return createInitialState();
}

/**
 * Start the countdown sequence
 */
export function startSequence(state: StartSequenceState, currentTime: number): StartSequenceState {
    return {
        ...state,
        isActive: true,
        countdownValue: COUNTDOWN_START,
        startTime: currentTime,
        lastTickValue: COUNTDOWN_START + 1,
        goDisplayTime: 0,
        gracePeriodEndTime: 0,
        inGracePeriod: false,
    };
}

/**
 * Update countdown state based on elapsed time
 * @returns Updated state and whether a new tick occurred (for audio)
 */
export function updateStartSequence(
    state: StartSequenceState,
    currentTime: number
): { state: StartSequenceState; newTick: number | null } {
    if (!state.isActive) {
        return { state, newTick: null };
    }

    // Initialize start time on first update
    if (state.startTime === 0) {
        return {
            state: { ...state, startTime: currentTime },
            newTick: COUNTDOWN_START,
        };
    }

    const elapsed = currentTime - state.startTime;

    // Calculate current countdown value based on elapsed time
    let newValue = COUNTDOWN_START - Math.floor(elapsed / COUNTDOWN_INTERVAL);

    // Clamp to valid range
    if (newValue < -1) newValue = -1;

    // Check if we hit "GO" (0)
    if (newValue === 0 && state.countdownValue > 0) {
        return {
            state: {
                ...state,
                countdownValue: 0,
                goDisplayTime: currentTime,
            },
            newTick: 0, // Signal GO
        };
    }

    // Check if GO display is complete - start grace period
    if (newValue <= 0 && state.goDisplayTime > 0) {
        const goElapsed = currentTime - state.goDisplayTime;
        if (goElapsed >= GO_DISPLAY_DURATION) {
            return {
                state: {
                    ...state,
                    isActive: false,
                    countdownValue: -1,
                    inGracePeriod: true,
                    gracePeriodEndTime: currentTime + GRACE_PERIOD_DURATION,
                },
                newTick: null,
            };
        }
    }

    // Check for new tick (countdown number changed)
    const newTick = (newValue !== state.countdownValue && newValue >= 0) ? newValue : null;

    return {
        state: {
            ...state,
            countdownValue: newValue,
            lastTickValue: newTick !== null ? newValue : state.lastTickValue,
        },
        newTick,
    };
}

/**
 * Calculate player X position during slide-in animation
 * Uses easeOutQuad for smooth deceleration
 * 
 * @param state Current sequence state
 * @param canvasWidth Canvas width for calculating final position
 * @param currentTime Current timestamp
 * @returns Player X position
 */
export function getPlayerSlideX(
    state: StartSequenceState,
    canvasWidth: number,
    currentTime: number
): number {
    const finalX = canvasWidth * 0.125; // 12.5% = standard player X position
    const startX = -100; // Off-screen left

    if (!state.isActive) {
        return finalX;
    }

    // Slide starts when countdown reaches 1
    if (state.countdownValue > SLIDE_START_VALUE) {
        return startX;
    }

    // Calculate progress through slide animation
    // Slide takes place during countdown value 1 → GO (1 second)
    const slideStartTime = state.startTime + (COUNTDOWN_START - SLIDE_START_VALUE) * COUNTDOWN_INTERVAL;
    const slideDuration = COUNTDOWN_INTERVAL; // 1 second

    const slideElapsed = currentTime - slideStartTime;
    let progress = Math.min(1, Math.max(0, slideElapsed / slideDuration));

    // EaseOutQuad: t*(2-t)
    progress = easeOutQuad(progress);

    return startX + (finalX - startX) * progress;
}

/**
 * EaseOutQuad interpolation function
 * Starts fast, decelerates to stop
 */
function easeOutQuad(t: number): number {
    return t * (2 - t);
}

/**
 * Check if game should start (countdown complete)
 */
export function shouldGameStart(state: StartSequenceState): boolean {
    return !state.isActive && state.countdownValue === -1;
}

/**
 * Get the current countdown display text
 */
export function getDisplayText(state: StartSequenceState): string | null {
    if (!state.isActive) return null;
    if (state.countdownValue > 0) return state.countdownValue.toString();
    if (state.countdownValue === 0) return 'GO!';
    return null;
}

/**
 * Calculate scale for countdown number animation
 * Starts large (1.5) and shrinks to normal (1.0)
 */
export function getNumberScale(
    state: StartSequenceState,
    currentTime: number
): number {
    if (!state.isActive || state.countdownValue < 0) return 1;

    // Find when current number started
    const numberIndex = COUNTDOWN_START - state.countdownValue;
    const numberStartTime = state.startTime + numberIndex * COUNTDOWN_INTERVAL;
    const elapsed = currentTime - numberStartTime;

    // Scale animation over 300ms
    const animDuration = 300;
    const progress = Math.min(1, elapsed / animDuration);

    // Ease from 1.5 to 1.0
    return 1.5 - 0.5 * easeOutQuad(progress);
}

/**
 * Get GO text opacity for fade out
 */
export function getGoOpacity(
    state: StartSequenceState,
    currentTime: number
): number {
    if (state.countdownValue !== 0 || state.goDisplayTime === 0) return 1;

    const elapsed = currentTime - state.goDisplayTime;
    const fadeStart = GO_DISPLAY_DURATION * 0.3; // Start fading at 30%

    if (elapsed < fadeStart) return 1;

    const fadeProgress = (elapsed - fadeStart) / (GO_DISPLAY_DURATION - fadeStart);
    return Math.max(0, 1 - fadeProgress);
}

/**
 * Check if blur should be applied to background
 */
export function shouldApplyBlur(state: StartSequenceState): boolean {
    return state.isActive && state.countdownValue > 0;
}

/**
 * Check if currently in grace period (after countdown, before obstacles)
 */
export function isInGracePeriod(state: StartSequenceState, currentTime: number): boolean {
    if (!state.inGracePeriod) return false;
    return currentTime < state.gracePeriodEndTime;
}

/**
 * Update grace period state - call this every frame after countdown ends
 * Returns updated state with inGracePeriod set to false when period ends
 */
export function updateGracePeriod(state: StartSequenceState, currentTime: number): StartSequenceState {
    if (!state.inGracePeriod) return state;

    if (currentTime >= state.gracePeriodEndTime) {
        return {
            ...state,
            inGracePeriod: false,
        };
    }
    return state;
}

/**
 * Get grace period progress (0 = just started, 1 = complete)
 */
export function getGracePeriodProgress(state: StartSequenceState, currentTime: number): number {
    if (!state.inGracePeriod || state.gracePeriodEndTime === 0) return 1;

    const gracePeriodStart = state.gracePeriodEndTime - GRACE_PERIOD_DURATION;
    const elapsed = currentTime - gracePeriodStart;
    return Math.min(1, Math.max(0, elapsed / GRACE_PERIOD_DURATION));
}

// Export constants for external use
export const CONFIG = {
    COUNTDOWN_INTERVAL,
    COUNTDOWN_START,
    SLIDE_START_VALUE,
    GO_DISPLAY_DURATION,
    GRACE_PERIOD_DURATION,
    BLUR_AMOUNT: 12, // pixels
};
