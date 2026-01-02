/**
 * Tutorial VFX Engine - Echo Shift
 * Profesyonel VFX ve Animasyon Sistemi
 * 
 * Her faz için Canvas üzerinde çizilen efektler:
 * - Faz 1: Focus Mask, Pulse Circle, Ghost Hand
 * - Faz 2: Path Guide (lazer), White Flash
 * - Faz 3: Time Distortion, Vibrating, Glitch Text
 * - Faz 4: Electric Jitter, Lightning Sparks
 * - Faz 5: Motion Trail, ScreenShake
 * - Faz 6: Warp Lines
 * - Faz 7: Diamond Glow, Victory Explosion, Confetti
 */

import { AudioSystem } from './audioSystem';
import type { TutorialState } from './interactiveTutorialSystem';

// ============================================================================
// TYPES
// ============================================================================

interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Point {
    x: number;
    y: number;
}

interface TrailPoint extends Point {
    alpha: number;
    time: number;
}

interface WarpLine {
    x: number;
    y: number;
    speed: number;
    length: number;
}

interface Confetti {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    size: number;
}

interface LightningArc {
    points: Point[];
    alpha: number;
    time: number;
}

// Optimization: Gradient cache key
let lastGradientWidth = 0;
let lastGradientHeight = 0;
let cachedVignette: CanvasGradient | null = null;




export interface TutorialVFXState {
    // Faz 1: Focus Mask & Ghost Hand
    focusMask: {
        enabled: boolean;
        targetArea: Rect;
        alpha: number;
    };
    // Ghost Hand - DISABLED (v4: user performs real interactions)
    ghostHand: {
        visible: boolean;
    };
    // Info Modal - Renk Uyumu Bilgilendirme Ekranı
    infoModal: {
        visible: boolean;
        alpha: number;  // Fade in/out
        showTime: number; // Timestamp when modal opened
        playedSounds: Record<string, number>; // Track played sounds by cycle time
    };
    pulseCircle: {
        active: boolean;
        x: number;
        y: number;
        radius: number;
        alpha: number;
    };

    // Faz 2: Path Guide & Flash
    laserGuides: Array<{
        startX: number;
        y: number;
        color: string;
        alpha: number;
    }>;
    flashOverlay: {
        active: boolean;
        alpha: number;
        startTime: number;
    };

    // Faz 3: Time Distortion
    timeDistortion: {
        active: boolean;
        intensity: number;
        overlayAlpha: number;
    };
    vibration: {
        active: boolean;
        offsetX: number;
        offsetY: number;
    };
    glitchText: {
        visible: boolean;
        text: string;
        glitchOffset: number;
    };

    // Faz 4: Electric Jitter
    lightningArcs: LightningArc[];
    warningBanners: {
        visible: boolean;
        alpha: number;
    };

    // Faz 5: Motion Trail
    motionTrails: TrailPoint[];
    screenShakeActive: boolean;

    // Faz 6: Warp Lines
    warpLines: WarpLine[];

    // Faz 7: Victory Celebration
    diamondGlow: {
        active: boolean;
        intensity: number;
    };
    confetti: Confetti[];
    victoryFlash: {
        active: boolean;
        alpha: number;
    };
    unlockAnimation: {
        active: boolean;
        progress: number;     // 0-1
    };

    // DIAMOND COLLECTION PHASE - Dash Meter & Overlay
    dashMeter: {
        visible: boolean;
        progress: number;           // 0-100
        pulseIntensity: number;     // 0-1
        lastCollectionFlash: number; // 0-1 (decay)
    };
    diamondTutorialOverlay: {
        active: boolean;
        phase: 'intro' | 'collect' | 'dash_explain' | 'store_explain' | 'none';
        textAlpha: number;
        zoomProgress: number;       // 0-1 zoom animasyonu
        particleTimer: number;
    };

    // General timing
    time: number;
    deltaTime: number;
}

// ============================================================================
// COLORS
// ============================================================================

const COLORS = {
    focusMask: 'rgba(0, 0, 0, 0.7)',
    ghostHand: 'rgba(255, 255, 255, 0.3)',
    pulseCircle: 'rgba(0, 240, 255, 0.6)',
    laserWhite: 'rgba(255, 255, 255, 0.4)',
    laserBlack: 'rgba(100, 100, 100, 0.4)',
    timeDistortion: 'rgba(0, 150, 255, 0.15)',
    glitchCyan: '#00f0ff',
    glitchMagenta: '#ff00ff',
    lightning: '#00d4ff',
    warningYellow: '#ffcc00',
    warpLine: 'rgba(255, 255, 255, 0.8)',
    diamondGold: '#ffd700',
    victoryWhite: 'rgba(255, 255, 255, 0.9)',
};

const CONFETTI_COLORS = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
    '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
    '#00f0ff', '#ffd700',
];

// ============================================================================
// STATE CREATION
// ============================================================================

export function createInitialState(): TutorialVFXState {
    return {
        focusMask: {
            enabled: false,
            targetArea: { x: 0, y: 0, width: 0, height: 0 },
            alpha: 0,
        },
        ghostHand: {
            visible: false,
        },
        infoModal: {
            visible: false,
            alpha: 0,
            showTime: 0,
            playedSounds: {},
        },
        pulseCircle: {
            active: false,
            x: 0,
            y: 0,
            radius: 0,
            alpha: 0,
        },
        laserGuides: [],
        flashOverlay: {
            active: false,
            alpha: 0,
            startTime: 0,
        },
        timeDistortion: {
            active: false,
            intensity: 0,
            overlayAlpha: 0,
        },
        vibration: {
            active: false,
            offsetX: 0,
            offsetY: 0,
        },
        glitchText: {
            visible: false,
            text: '',
            glitchOffset: 0,
        },
        lightningArcs: [],
        warningBanners: {
            visible: false,
            alpha: 0,
        },
        motionTrails: [],
        screenShakeActive: false,
        warpLines: [],
        diamondGlow: {
            active: false,
            intensity: 0,
        },
        confetti: [],
        victoryFlash: {
            active: false,
            alpha: 0,
        },
        unlockAnimation: {
            active: false,
            progress: 0,
        },
        // DIAMOND COLLECTION PHASE
        dashMeter: {
            visible: false,
            progress: 0,
            pulseIntensity: 0,
            lastCollectionFlash: 0,
        },
        diamondTutorialOverlay: {
            active: false,
            phase: 'none',
            textAlpha: 0,
            zoomProgress: 0,
            particleTimer: 0,
        },
        time: 0,
        deltaTime: 0,
    };
}

// ============================================================================
// UPDATE
// ============================================================================

export function update(
    vfxState: TutorialVFXState,
    tutorialState: TutorialState,
    deltaTime: number,
    canvasWidth: number,
    canvasHeight: number
): TutorialVFXState {
    const newState = { ...vfxState };
    newState.deltaTime = deltaTime;
    newState.time += deltaTime;

    // Update based on current phase
    switch (tutorialState.currentPhase) {
        case 'INTRO':
            // INTRO fazında VFX yok - temiz hikaye ekranı
            updateIntroVFX(newState, tutorialState, canvasWidth, canvasHeight);
            break;
        case 'NAVIGATION':
            updateNavigationVFX(newState, tutorialState, canvasWidth, canvasHeight);
            break;
        case 'COLOR_MATCH':
            updateColorMatchVFX(newState, tutorialState);
            break;
        case 'SWAP_MECHANIC':
            updateSwapVFX(newState, tutorialState);
            break;
        case 'SHARP_MANEUVER':
            updateSharpManeuverVFX(newState, tutorialState);
            break;
        case 'SPEED_TEST':
            updateSpeedTestVFX(newState, tutorialState, canvasWidth);
            break;
        case 'DIAMOND_COLLECTION':
            updateDiamondVFX(newState, tutorialState);
            break;
    }

    // Update victory animation if active
    if (tutorialState.showVictoryAnimation) {
        updateVictoryVFX(newState, tutorialState);
    }

    // Update confetti
    updateConfetti(newState);

    // Sync Info Modal state from tutorial state
    if ((tutorialState as any).showInfoModal) {
        // Track when modal first opened for staged reveal timing
        if (!newState.infoModal.visible) {
            newState.infoModal.showTime = newState.time;
        }
        newState.infoModal.visible = true;
        newState.infoModal.alpha = Math.min(1, newState.infoModal.alpha + 0.08);
    } else {
        newState.infoModal.alpha = Math.max(0, newState.infoModal.alpha - 0.1);
        if (newState.infoModal.alpha <= 0) {
            newState.infoModal.visible = false;
            newState.infoModal.showTime = 0;
        }
    }

    return newState;
}

// ============================================================================
// PHASE-SPECIFIC VFX UPDATES
// ============================================================================

/**
 * INTRO Phase - Clean screen, no VFX distractions
 */
function updateIntroVFX(
    state: TutorialVFXState,
    tutorial: TutorialState,
    canvasWidth: number,
    canvasHeight: number
): void {
    // INTRO fazında tüm VFX kapalı - temiz hikaye ekranı
    state.focusMask.enabled = false;
    state.ghostHand.visible = false;
    state.pulseCircle.active = false;
    state.timeDistortion.active = false;
    state.warningBanners.visible = false;
    state.screenShakeActive = false;
    state.diamondGlow.active = false;
}

function updateNavigationVFX(
    state: TutorialVFXState,
    tutorial: TutorialState,
    canvasWidth: number,
    canvasHeight: number
): void {
    const orbX = canvasWidth / 8;
    const connectorLength = 160;
    const orbRadius = 18;
    const padding = 20;

    const subPhase = tutorial.navigationSubPhase ?? 0;

    // Ghost Hand - DISABLED in v4
    // User performs real swipes instead of watching an animation
    state.ghostHand.visible = false;

    // --- SWIPE DIRECTION INDICATOR ---
    // Show pulsing circle with arrow to indicate which way to swipe
    if (subPhase === 1 || subPhase === 2) {
        state.pulseCircle.active = true;
        state.pulseCircle.x = canvasWidth * 0.5;
        // Arrow position: UP for subPhase 1, DOWN for subPhase 2
        state.pulseCircle.y = subPhase === 1 ? canvasHeight * 0.2 : canvasHeight * 0.8;
        state.pulseCircle.radius = 50 + Math.sin(state.time * 0.008) * 10;
        state.pulseCircle.alpha = 0.6 + Math.sin(state.time * 0.01) * 0.3;
    } else {
        state.pulseCircle.active = false;
    }

    // --- FOCUS MASK (Dynamic Tracking) ---
    // "Gelen karakter ile aynı şekilde büyüyen ve sabit duran"
    const focusWidth = (orbRadius + padding) * 2;
    const focusHeight = connectorLength + (orbRadius + padding) * 2;

    const scale = tutorial.focusMaskScale ?? 0;
    const showMask = tutorial.showFocusMask !== undefined ? tutorial.showFocusMask : true;

    // Calculate current player X based on slide progress
    // SYNC FIX: Match GameEngine rendering logic exactly
    // Slide from left (-50) to target (width / 8)
    const slideProgress = tutorial.playerSlideInProgress ?? 1;
    const targetX = canvasWidth / 8;
    const startX = -50;
    const currentOrbX = startX + (targetX - startX) * slideProgress;

    state.focusMask.enabled = scale > 0 && showMask;
    state.focusMask.alpha = Math.min(0.85, scale * 0.85);

    const scaledWidth = focusWidth * scale;
    const scaledHeight = focusHeight * scale;

    state.focusMask.targetArea = {
        x: currentOrbX - scaledWidth / 2,
        y: canvasHeight / 2 - scaledHeight / 2,
        width: scaledWidth,
        height: scaledHeight,
    };

    // Re-enable Focus Mask ONLY for Explain phase (3) to highlight the connector constraint
    if (subPhase === 3) {
        state.focusMask.enabled = true;
        state.focusMask.alpha = 0.6;

        const width = 120;
        state.focusMask.targetArea = {
            x: orbX - width / 2,
            y: canvasHeight / 2 - (connectorLength + 100) / 2,
            width: width,
            height: connectorLength + 100
        };
    }

    // Warning Banners for Phase 3 (Growth Warning)
    if (subPhase === 3) {
        state.warningBanners.visible = true;
        state.warningBanners.alpha = 0.4 + Math.sin(state.time * 0.005) * 0.2;
    } else {
        state.warningBanners.visible = false;
    }

    state.pulseCircle.active = false;
}



function updateColorMatchVFX(
    state: TutorialVFXState,
    tutorial: TutorialState
): void {
    // Disable navigation VFX
    state.focusMask.enabled = false;
    state.ghostHand.visible = false;
    state.pulseCircle.active = false;

    // Flash overlay on successful pass
    if (state.flashOverlay.active) {
        const elapsed = state.time - state.flashOverlay.startTime;
        state.flashOverlay.alpha = Math.max(0, 0.5 - elapsed * 0.002);
        if (state.flashOverlay.alpha <= 0) {
            state.flashOverlay.active = false;
        }
    }
}

function updateSwapVFX(
    state: TutorialVFXState,
    tutorial: TutorialState
): void {
    // Time distortion overlay - Advanced Vignette & Aberration
    state.timeDistortion.active = true;
    state.timeDistortion.intensity = (tutorial.speedMultiplier < 0.2) ? 0.9 : 0.6; // High intensity when slow
    state.timeDistortion.overlayAlpha = 0.3; // Increased for vignette visibility

    // Vibration effect
    if (tutorial.waitingForInput) {
        state.vibration.active = true;
        state.vibration.offsetX = (Math.random() - 0.5) * 2;
        state.vibration.offsetY = (Math.random() - 0.5) * 2;
    } else {
        state.vibration.active = false;
        state.vibration.offsetX = 0;
        state.vibration.offsetY = 0;
    }

    // Glitch text - DISABLED (Using tutorialOverlayRenderer instead)
    state.glitchText.visible = false;
    // state.glitchText.text = 'ŞİMDİ DÖNDÜR!';
    state.glitchText.glitchOffset = 0;

}



function updateSharpManeuverVFX(
    state: TutorialVFXState,
    tutorial: TutorialState
): void {
    // Disable connector VFX
    state.warningBanners.visible = false;
    state.lightningArcs = [];

    // Screen shake on near-miss maneuvers
    state.screenShakeActive = true;

    // Motion trails decay
    state.motionTrails = state.motionTrails
        .map(t => ({ ...t, alpha: t.alpha - 0.02 }))
        .filter(t => t.alpha > 0);
}

function updateSpeedTestVFX(
    state: TutorialVFXState,
    tutorial: TutorialState,
    canvasWidth: number
): void {
    // Warp lines for speed effect
    if (Math.random() < 0.3) {
        state.warpLines.push({
            x: canvasWidth + 10,
            y: Math.random() * window.innerHeight,
            speed: 15 + Math.random() * 10,
            length: 30 + Math.random() * 50,
        });
    }

    // Move warp lines
    state.warpLines = state.warpLines
        .map(line => ({ ...line, x: line.x - line.speed }))
        .filter(line => line.x + line.length > 0);
}

function updateDiamondVFX(
    state: TutorialVFXState,
    tutorial: TutorialState
): void {
    // Clear speed test VFX
    state.warpLines = [];
    state.screenShakeActive = false;

    // Diamond glow pulsing
    state.diamondGlow.active = true;
    state.diamondGlow.intensity = 0.7 + Math.sin(state.time * 0.008) * 0.3;

    // === DASH METER ===
    state.dashMeter.visible = true;

    // Calculate progress based on collected diamonds (5 total for tutorial)
    const targetProgress = (tutorial.diamondsCollected / 5) * 100;

    // Smooth interpolation toward target
    state.dashMeter.progress += (targetProgress - state.dashMeter.progress) * 0.1;

    // Pulse effect (continuous)
    state.dashMeter.pulseIntensity = 0.5 + Math.sin(state.time * 0.01) * 0.5;

    // Flash decay on collection
    if (state.dashMeter.lastCollectionFlash > 0) {
        state.dashMeter.lastCollectionFlash = Math.max(0, state.dashMeter.lastCollectionFlash - 0.05);
    }

    // === DIAMOND TUTORIAL OVERLAY ===
    const elapsed = Date.now() - tutorial.phaseStartTime;

    // INTRO phase (0-3s): Big diamond icon + "ELMASLARI TOPLA!"
    if (elapsed < 3000) {
        state.diamondTutorialOverlay.active = true;
        state.diamondTutorialOverlay.phase = 'intro';
        state.diamondTutorialOverlay.textAlpha = Math.min(1, elapsed / 500);
        state.diamondTutorialOverlay.particleTimer += state.deltaTime;
    }
    // COLLECT phase (3s-6s): Normal collection with dash explanation
    else if (elapsed < 6000 && tutorial.diamondsCollected < 3) {
        state.diamondTutorialOverlay.active = true;
        state.diamondTutorialOverlay.phase = 'collect';
        state.diamondTutorialOverlay.textAlpha = 1;
    }
    // DASH EXPLAIN phase: After 3 center diamonds (zoom to dash meter)
    else if (tutorial.diamondsCollected === 3 && elapsed < 9000) {
        state.diamondTutorialOverlay.active = true;
        state.diamondTutorialOverlay.phase = 'dash_explain';
        state.diamondTutorialOverlay.zoomProgress = Math.min(1, (elapsed - 6000) / 1500);
    }
    // Hide overlay during normal collection
    else {
        state.diamondTutorialOverlay.active = false;
        state.diamondTutorialOverlay.phase = 'none';
        state.diamondTutorialOverlay.zoomProgress = 0;
    }
}

function updateVictoryVFX(
    state: TutorialVFXState,
    tutorial: TutorialState
): void {
    // Victory flash
    if (tutorial.showVictoryAnimation && !state.victoryFlash.active) {
        state.victoryFlash.active = true;
        state.victoryFlash.alpha = 1;

        // Spawn confetti
        for (let i = 0; i < 100; i++) {
            state.confetti.push({
                x: Math.random() * window.innerWidth,
                y: -20,
                vx: (Math.random() - 0.5) * 5,
                vy: 2 + Math.random() * 4,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
                size: 5 + Math.random() * 10,
            });
        }
    }

    // Fade victory flash
    if (state.victoryFlash.active) {
        state.victoryFlash.alpha = Math.max(0, state.victoryFlash.alpha - 0.02);
    }

    // Unlock animation progress
    if (tutorial.showUnlockAnimation) {
        state.unlockAnimation.active = true;
        state.unlockAnimation.progress = Math.min(1, state.unlockAnimation.progress + 0.01);
    }
}

function updateConfetti(state: TutorialVFXState): void {
    state.confetti = state.confetti
        .map(c => ({
            ...c,
            x: c.x + c.vx,
            y: c.y + c.vy,
            rotation: c.rotation + c.rotationSpeed,
            vy: c.vy + 0.1, // gravity
        }))
        .filter(c => c.y < window.innerHeight + 50);
}

// ============================================================================
// RENDER
// ============================================================================

export function render(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    ctx.save();

    // Apply vibration offset
    if (state.vibration.active) {
        ctx.translate(state.vibration.offsetX, state.vibration.offsetY);
    }

    // Render in order (back to front)
    renderFocusMask(ctx, state, canvasWidth, canvasHeight);
    renderTimeDistortion(ctx, state, canvasWidth, canvasHeight);
    renderLaserGuides(ctx, state);
    renderWarpLines(ctx, state);
    renderLightningArcs(ctx, state);
    renderMotionTrails(ctx, state);
    renderPulseCircle(ctx, state);
    renderGhostHand(ctx, state, canvasWidth, canvasHeight);
    renderInfoModal(ctx, state, canvasWidth, canvasHeight);
    renderGlitchText(ctx, state, canvasWidth, canvasHeight);
    renderDiamondGlow(ctx, state, canvasWidth, canvasHeight);
    renderDashMeter(ctx, state, canvasWidth, canvasHeight);  // Diamond phase
    renderDiamondTutorialOverlay(ctx, state, canvasWidth, canvasHeight);  // Diamond phase overlay
    renderFlashOverlay(ctx, state, canvasWidth, canvasHeight);
    renderVictoryFlash(ctx, state, canvasWidth, canvasHeight);
    renderConfetti(ctx, state);
    renderUnlockAnimation(ctx, state, canvasWidth, canvasHeight);

    ctx.restore();
}

// ============================================================================
// INDIVIDUAL RENDER FUNCTIONS
// ============================================================================

function renderFocusMask(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.focusMask.enabled) return;

    const { targetArea, alpha } = state.focusMask;

    // Draw dark overlay with cutout
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

    // Top section
    ctx.fillRect(0, 0, canvasWidth, targetArea.y);
    // Bottom section
    ctx.fillRect(0, targetArea.y + targetArea.height, canvasWidth, canvasHeight - targetArea.y - targetArea.height);
    // Left section
    ctx.fillRect(0, targetArea.y, targetArea.x, targetArea.height);
    // Right section
    ctx.fillRect(targetArea.x + targetArea.width, targetArea.y, canvasWidth - targetArea.x - targetArea.width, targetArea.height);

    // Glow border around cutout
    ctx.strokeStyle = COLORS.pulseCircle;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.pulseCircle;
    ctx.shadowBlur = 20;
    ctx.strokeRect(targetArea.x, targetArea.y, targetArea.width, targetArea.height);
    ctx.shadowBlur = 0;
}

function renderGhostHand(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    // Ghost Hand is DISABLED in v4
    // User performs real interactions instead of watching an animation
    // This function is kept for API compatibility but does nothing
}
/**
 * INFO MODAL - Staged Reveal Tutorial
 * Stage 1: Text appears first (0-2s) - user reads instructions
 * Stage 2: Animation fades in (2s+) - visual demonstration
 * Stage 3: Tap to close modal AND focus mask
 */
function renderInfoModal(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.infoModal.visible || state.infoModal.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = state.infoModal.alpha;

    // === STAGED REVEAL TIMING ===
    const modalShowTime = state.time - state.infoModal.showTime; // Time since modal appeared
    const textDelay = 0;        // Text appears immediately
    const animDelay = 7500;     // Animation starts after text is fully revealed (4 lines * 1.5s + buffer)
    const animFadeDuration = 1000; // Animation fade-in duration

    // Calculate animation alpha (fades in after text is read)
    const animAlpha = modalShowTime < animDelay
        ? 0
        : Math.min(1, (modalShowTime - animDelay) / animFadeDuration);

    // === MODAL BACKGROUND ===
    const modalWidth = Math.min(canvasWidth * 0.92, 360);
    const modalHeight = Math.min(canvasHeight * 0.75, 400);
    const modalX = (canvasWidth - modalWidth) / 2;
    const modalY = (canvasHeight - modalHeight) / 2;

    // Draw modal background - always cyan border
    ctx.fillStyle = 'rgba(0, 10, 20, 0.96)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.roundRect(modalX, modalY, modalWidth, modalHeight, 14);
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // === STAGE 1: TEXT CONTENT (sequential reveal) ===

    // Line timing (each line fades in 1500ms after previous - VERY SLOW)
    const lineDelay = 1500;
    const lineFadeDuration = 1800; // Slow fade-in for readability

    const line0Alpha = Math.min(1, modalShowTime / lineFadeDuration);
    const line1Alpha = Math.max(0, Math.min(1, (modalShowTime - lineDelay) / lineFadeDuration));
    const line2Alpha = Math.max(0, Math.min(1, (modalShowTime - lineDelay * 2) / lineFadeDuration));
    const line3Alpha = Math.max(0, Math.min(1, (modalShowTime - lineDelay * 3) / lineFadeDuration));

    // Header
    const headerY = modalY + 28;
    ctx.globalAlpha = state.infoModal.alpha * line0Alpha;
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillText('⚠️ KRİTİK BİLGİ', canvasWidth / 2, headerY);
    ctx.shadowBlur = 0;

    // Line 1
    const textY = headerY + 35;
    ctx.globalAlpha = state.infoModal.alpha * line1Alpha;
    ctx.font = '13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillText('Yanlış renk bloğuna çarparsan ölürsün!', canvasWidth / 2, textY);

    // Line 2
    ctx.globalAlpha = state.infoModal.alpha * line2Alpha;
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('ÇÖZÜM: Ekrana dokunarak topları döndür', canvasWidth / 2, textY + 22);

    // Line 3
    ctx.globalAlpha = state.infoModal.alpha * line3Alpha;
    ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('Aynı renk top → Aynı renk blok = GEÇ!', canvasWidth / 2, textY + 46);

    ctx.globalAlpha = state.infoModal.alpha; // Reset alpha

    // === STAGE 2: ANIMATION AREA (fades in after 2 seconds) ===
    const animX = modalX + 20;
    const animY = modalY + 130; // Below text
    const animW = modalWidth - 40;
    const animH = 130;

    // Only render animation if visible (after 2 second delay)
    if (animAlpha > 0) {
        ctx.globalAlpha = state.infoModal.alpha * animAlpha;

        // Animation timing (14 second cycle - very slow)
        // Reset cycle relative to when animation appears
        const animRelativeTime = Math.max(0, modalShowTime - animDelay);
        const cycle = animRelativeTime % 14000;
        const isNormal = cycle < 3000;
        const isWarning = cycle >= 3000 && cycle < 9000;
        const isSwapping = cycle >= 7500 && cycle < 9500;
        const isSuccess = cycle >= 9500;

        // === AUDIO SYNC ===
        // Reset sounds on new cycle
        if (cycle < 100 && Object.keys(state.infoModal.playedSounds || {}).length > 0) {
            state.infoModal.playedSounds = {};
        }

        // Warning Sound
        if (cycle > 3000 && !state.infoModal.playedSounds?.['warning']) {
            AudioSystem.playNearMiss();
            if (!state.infoModal.playedSounds) state.infoModal.playedSounds = {};
            state.infoModal.playedSounds['warning'] = state.time;
        }

        // Action Prompt (DOKUN!)
        if (cycle > 5500 && !state.infoModal.playedSounds?.['prompt']) {
            // Subtle beep for prompt
            AudioSystem.playMenuSelect();
            state.infoModal.playedSounds['prompt'] = state.time;
        }

        // Swap Sound
        if (cycle > 7500 && !state.infoModal.playedSounds?.['swap']) {
            AudioSystem.playSwap();
            state.infoModal.playedSounds['swap'] = state.time;
        }

        // Success Sound
        if (cycle > 9500 && !state.infoModal.playedSounds?.['success']) {
            AudioSystem.playObstaclePass();
            state.infoModal.playedSounds['success'] = state.time;
        }

        // Clip animation area
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(animX, animY, animW, animH, 10);
        ctx.clip();

        // Animation background
        ctx.fillStyle = isWarning && !isSuccess
            ? 'rgba(40, 15, 25, 0.9)'
            : 'rgba(15, 20, 30, 0.9)';
        ctx.fill();

        // === ORB AND BLOCK ANIMATION ===
        const cx = animX + animW / 2;
        const orbY = animY + animH - 35;
        const spacing = 55;
        const orbRadius = 14;

        // Block dimensions and movement
        const blockW = 45;
        const blockH = 28;

        // Blocks move from top toward orbs
        const blockStartY = animY - 10;
        const blockEndY = orbY - 45;

        // Block movement progress based on phase (very slow)
        const blockMoveProgress = isNormal
            ? Math.min(1, cycle / 3000)
            : isSuccess
                ? 1  // Stay at final position during success
                : Math.min(1, (cycle - 3000) / 3000 + 0.5);

        const blockY = blockStartY + (blockEndY - blockStartY) * blockMoveProgress;

        // Swap rotation calculation (very slow - 2000ms)
        const swapProgress = isSwapping
            ? Math.min(1, (cycle - 7500) / 2000)
            : isSuccess ? 1 : 0;
        const rotation = swapProgress * Math.PI;

        // CORRECT MATCHING after 180° swap:
        // - Black orb rotates to LEFT side → should face BLACK block
        // - White orb rotates to RIGHT side → should face WHITE block

        // LEFT BLOCK = BLACK (after swap: black orb passes through ✓)
        ctx.fillStyle = '#1a1a1a';
        ctx.shadowColor = '#333333';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(cx - spacing - blockW / 2, blockY, blockW, blockH, 4);
        ctx.fill();
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.stroke();

        // RIGHT BLOCK = WHITE (after swap: white orb passes through ✓)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(cx + spacing - blockW / 2, blockY, blockW, blockH, 4);
        ctx.fill();
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Success phase: orbs move up through blocks and continue        // Success phase: orbs move up through blocks and continue (very slow)
        let orbOffsetY = 0;
        if (isSuccess) {
            const passProgress = Math.min(1, (cycle - 9500) / 3000);
            orbOffsetY = -passProgress * 100; // Move up through blocks
        }

        // === ROTATING ORBS ===
        ctx.save();
        ctx.translate(cx, orbY + orbOffsetY);
        ctx.rotate(rotation);

        // Motion blur trails during swap
        if (isSwapping && swapProgress > 0.1 && swapProgress < 0.9) {
            for (let i = 1; i <= 3; i++) {
                const trailAlpha = 0.15 * (1 - i * 0.25);
                const trailAngle = -rotation * 0.15 * i;
                ctx.save();
                ctx.rotate(trailAngle);
                ctx.globalAlpha = state.infoModal.alpha * trailAlpha;

                // Trail white orb
                ctx.beginPath();
                ctx.arc(-spacing, 0, orbRadius - 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();

                // Trail black orb
                ctx.beginPath();
                ctx.arc(spacing, 0, orbRadius - 2, 0, Math.PI * 2);
                ctx.fillStyle = '#222222';
                ctx.fill();

                ctx.restore();
            }
            ctx.globalAlpha = state.infoModal.alpha;
        }

        // Chromatic aberration during swap
        if (isSwapping) {
            const aberration = Math.sin(swapProgress * Math.PI) * 3;

            // Red channel offset
            ctx.globalAlpha = state.infoModal.alpha * 0.3;
            ctx.beginPath();
            ctx.arc(-spacing - aberration, 0, orbRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ff0000';
            ctx.fill();

            // Blue channel offset
            ctx.beginPath();
            ctx.arc(-spacing + aberration, 0, orbRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#0000ff';
            ctx.fill();

            ctx.globalAlpha = state.infoModal.alpha;
        }

        // White orb with cyan glow (LEFT initially, RIGHT after swap)
        ctx.beginPath();
        ctx.arc(-spacing, 0, orbRadius + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 200, 255, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(-spacing, 0, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Black orb (RIGHT initially, LEFT after swap)
        ctx.beginPath();
        ctx.arc(spacing, 0, orbRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dashed connector
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.moveTo(-spacing + orbRadius + 4, 0);
        ctx.lineTo(spacing - orbRadius - 4, 0);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore(); // End orb rotation

        // === ACTION PROMPT ===
        if (isWarning && !isSwapping && cycle < 7500) {
            const promptPulse = 0.6 + Math.sin(state.time * 0.02) * 0.4;
            ctx.globalAlpha = state.infoModal.alpha * promptPulse;
            ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#00f0ff';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 15;
            ctx.fillText('DOKUN!', cx, orbY - 45);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = state.infoModal.alpha;
        }

        // === WARNING TEXT ===
        if (isWarning && !isSuccess) {
            ctx.font = 'bold 11px Monospace';
            ctx.fillStyle = '#ff4466';
            ctx.textAlign = 'center';
            const warningPulse = 0.7 + Math.sin(state.time * 0.015) * 0.3;
            ctx.globalAlpha = state.infoModal.alpha * warningPulse;
            ctx.fillText('⚠ MISMATCH DETECTED!', cx, animY + 18);
            ctx.globalAlpha = state.infoModal.alpha;
        }

        ctx.restore(); // End animation clip

        // === SUCCESS FLASH ===
        if (cycle >= 9500 && cycle < 10500) {
            const flashAlpha = 1 - (cycle - 9500) / 1000;
            ctx.fillStyle = `rgba(50, 255, 130, ${flashAlpha * 0.35})`;
            ctx.fillRect(modalX, modalY, modalWidth, modalHeight);
        }

        // === PHASE STATUS TEXT ===
        const statusY = animY + animH + 25;
        ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';

        if (isNormal) {
            ctx.fillStyle = '#ffaa00';
            ctx.fillText('⚠ BEYAZ TOP → SİYAH BLOK = ÖLÜM', canvasWidth / 2, statusY);
        } else if (isWarning && !isSuccess) {
            ctx.fillStyle = '#ff4466';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 10;
            ctx.fillText('⚠ TEHLİKE! SWAP YAP!', canvasWidth / 2, statusY);
            ctx.shadowBlur = 0;
        } else if (isSuccess) {
            ctx.fillStyle = '#22dd55';
            ctx.shadowColor = '#00ff44';
            ctx.shadowBlur = 10;
            ctx.fillText('✓ GÜVENLİ GEÇİŞ!', canvasWidth / 2, statusY);
            ctx.shadowBlur = 0;
        }
    } // End animAlpha condition

    // === STAGE 3: TAP TO CONTINUE (static, dim) ===
    const continueY = modalY + modalHeight - 22;
    ctx.globalAlpha = state.infoModal.alpha * 0.6; // Dimmed, no pulse
    ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 5;
    ctx.textAlign = 'center';
    ctx.fillText('[ EKRANA DOKUN ]', canvasWidth / 2, continueY);
    ctx.shadowBlur = 0;

    ctx.restore();
}





function renderPulseCircle(ctx: CanvasRenderingContext2D, state: TutorialVFXState): void {
    if (!state.pulseCircle.active) return;

    const { x, y, radius, alpha } = state.pulseCircle;
    const isUp = y < 300; // Approximate check - if pulse is in upper half, show UP arrow

    ctx.save();
    ctx.globalAlpha = alpha;

    // Pulsing circle
    ctx.strokeStyle = COLORS.pulseCircle;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.pulseCircle;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // === LARGE DIRECTION ARROW ===
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 25;

    const arrowSize = 40;
    ctx.beginPath();
    if (isUp) {
        // UP arrow: pointing upward
        ctx.moveTo(x, y - arrowSize);       // Top point
        ctx.lineTo(x - arrowSize * 0.6, y + arrowSize * 0.3);  // Bottom left
        ctx.lineTo(x + arrowSize * 0.6, y + arrowSize * 0.3);  // Bottom right
    } else {
        // DOWN arrow: pointing downward
        ctx.moveTo(x, y + arrowSize);       // Bottom point
        ctx.lineTo(x - arrowSize * 0.6, y - arrowSize * 0.3);  // Top left
        ctx.lineTo(x + arrowSize * 0.6, y - arrowSize * 0.3);  // Top right
    }
    ctx.closePath();
    ctx.fill();

    // Text label
    ctx.shadowBlur = 0;
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    const labelY = isUp ? y + 70 : y - 70;
    ctx.fillText(isUp ? 'YUKARI KAYDIR' : 'AŞAĞI KAYDIR', x, labelY);

    ctx.restore();
}

function renderTimeDistortion(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.timeDistortion.active) return;

    ctx.save();

    // 1. Vinyet Efekti (Vignette) - Optimize by caching gradient
    // Only recreate if dimensions change significantly
    if (!cachedVignette || Math.abs(lastGradientWidth - canvasWidth) > 10 || Math.abs(lastGradientHeight - canvasHeight) > 10) {
        lastGradientWidth = canvasWidth;
        lastGradientHeight = canvasHeight;
        // Outer dark, inner transparent
        cachedVignette = ctx.createRadialGradient(canvasWidth / 2, canvasHeight / 2, canvasWidth / 4, canvasWidth / 2, canvasHeight / 2, canvasWidth / 1.1);
        cachedVignette.addColorStop(0, 'rgba(0, 150, 255, 0)'); // Center transparent
        cachedVignette.addColorStop(1, `rgba(0, 30, 80, 0.8)`); // Edges dark blue
    }

    if (cachedVignette) {
        ctx.fillStyle = cachedVignette;
        ctx.globalAlpha = state.timeDistortion.overlayAlpha * 1.5; // Adjustable intensity
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // 2. Chromatic Aberration / Neo-Glow Edges
    // Only visible when intensity is high (slow motion active)
    if (state.timeDistortion.intensity > 0.5) {
        const pulse = Math.sin(Date.now() / 150); // Faster pulse

        // Aberration Border
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + pulse * 0.2})`;
        ctx.lineWidth = 15;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

        // Inner RGB shift simulation (simplified)
        ctx.strokeStyle = `rgba(255, 0, 255, ${0.2 + pulse * 0.1})`;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, canvasWidth - 10, canvasHeight - 10);
    }

    ctx.restore();
}

function renderLaserGuides(ctx: CanvasRenderingContext2D, state: TutorialVFXState): void {
    state.laserGuides.forEach(guide => {
        ctx.save();
        ctx.globalAlpha = guide.alpha;
        ctx.strokeStyle = guide.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.moveTo(guide.startX, guide.y);
        ctx.lineTo(guide.startX + 200, guide.y);
        ctx.stroke();

        ctx.restore();
    });
}

function renderWarpLines(ctx: CanvasRenderingContext2D, state: TutorialVFXState): void {
    ctx.save();
    ctx.strokeStyle = COLORS.warpLine;
    ctx.lineWidth = 1;

    state.warpLines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x + line.length, line.y);
        ctx.stroke();
    });

    ctx.restore();
}

function renderLightningArcs(ctx: CanvasRenderingContext2D, state: TutorialVFXState): void {
    state.lightningArcs.forEach(arc => {
        ctx.save();
        ctx.globalAlpha = arc.alpha;
        ctx.strokeStyle = COLORS.lightning;
        ctx.lineWidth = 2;
        ctx.shadowColor = COLORS.lightning;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        if (arc.points.length > 0) {
            ctx.moveTo(arc.points[0].x, arc.points[0].y);
            arc.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        }
        ctx.stroke();

        ctx.restore();
    });
}

function renderMotionTrails(ctx: CanvasRenderingContext2D, state: TutorialVFXState): void {
    state.motionTrails.forEach(trail => {
        ctx.save();
        ctx.globalAlpha = trail.alpha;
        ctx.fillStyle = COLORS.pulseCircle;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function renderWarningBanners(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.warningBanners.visible) return;

    ctx.save();
    ctx.globalAlpha = state.warningBanners.alpha;
    ctx.fillStyle = COLORS.warningYellow;

    // Top banner
    ctx.fillRect(0, 0, canvasWidth, 30);
    // Bottom banner
    ctx.fillRect(0, canvasHeight - 30, canvasWidth, 30);

    // Text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ WARNING: EXPANDING ⚠', canvasWidth / 2, 20);
    ctx.fillText('⚠ WARNING: EXPANDING ⚠', canvasWidth / 2, canvasHeight - 10);

    ctx.restore();
}

function renderGlitchText(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.glitchText.visible) return;

    const { text, glitchOffset } = state.glitchText;
    const x = canvasWidth / 2;
    const y = canvasHeight / 2;

    ctx.save();
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Chromatic aberration effect
    ctx.fillStyle = COLORS.glitchCyan;
    ctx.fillText(text, x - glitchOffset, y);

    ctx.fillStyle = COLORS.glitchMagenta;
    ctx.fillText(text, x + glitchOffset, y);

    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y);

    ctx.restore();
}

function renderDiamondGlow(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.diamondGlow.active) return;

    // Ambient diamond glow around edges
    const gradient = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, 0,
        canvasWidth / 2, canvasHeight / 2, canvasWidth
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.7, 'transparent');
    gradient.addColorStop(1, `rgba(255, 215, 0, ${state.diamondGlow.intensity * 0.2})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
}

/**
 * DASH METER - Circular progress with zoom animation
 * Shows charging progress for dash ability
 */
function renderDashMeter(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.dashMeter.visible) return;

    const x = canvasWidth - 70;
    const y = canvasHeight - 100;
    const baseRadius = 40;

    // Zoom/Scale animation (on diamond collection)
    const zoomBoost = state.dashMeter.lastCollectionFlash > 0 ?
        Math.sin(state.dashMeter.lastCollectionFlash * Math.PI) * 0.3 : 0;
    const radius = baseRadius * (1 + zoomBoost);

    ctx.save();

    // Glow aura
    const glowIntensity = state.dashMeter.pulseIntensity;
    ctx.shadowColor = '#00dcff';
    ctx.shadowBlur = 20 + glowIntensity * 30;

    // Background circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 20, 40, 0.85)';
    ctx.fill();
    ctx.strokeStyle = '#00dcff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Progress arc (animated)
    const progress = state.dashMeter.progress / 100;
    const isFull = progress >= 0.99;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + progress * Math.PI * 2;

    ctx.beginPath();
    ctx.arc(x, y, radius - 8, startAngle, endAngle);
    // Turn GOLD when full
    ctx.strokeStyle = isFull ? '#ffd700' : '#00f0ff';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Electric sparks around the arc end
    if (zoomBoost > 0.1 || isFull) {
        const sparkCount = isFull ? 8 : 5;
        for (let i = 0; i < sparkCount; i++) {
            const sparkAngle = endAngle + (Math.random() - 0.5) * 0.5;
            const sparkDist = radius - 8 + (Math.random() - 0.5) * 15;
            const sx = x + Math.cos(sparkAngle) * sparkDist;
            const sy = y + Math.sin(sparkAngle) * sparkDist;

            ctx.beginPath();
            ctx.arc(sx, sy, 2 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fillStyle = isFull
                ? `rgba(255, 215, 0, ${0.5 + Math.random() * 0.5})`
                : `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`;
            ctx.fill();
        }
    }

    // Center icon - golden when full
    ctx.shadowBlur = isFull ? 15 : 0;
    ctx.shadowColor = isFull ? '#ffd700' : 'transparent';
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = isFull ? '#ffd700' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', x, y - 6);

    // DASH label or HAZIR! when full
    ctx.font = 'bold 11px Arial';
    if (isFull) {
        ctx.fillStyle = '#ffd700';
        ctx.fillText('HAZIR!', x, y + 14);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillText('DASH', x, y + 14);
    }

    // Progress percentage (hide when full, show checkmark)
    ctx.font = 'bold 9px Arial';
    ctx.fillStyle = isFull ? '#ffd700' : '#00f0ff';
    ctx.fillText(isFull ? '✓' : `${Math.floor(state.dashMeter.progress)}%`, x, y + 28);

    ctx.shadowBlur = 0;
    ctx.restore();
}

/**
 * DIAMOND TUTORIAL OVERLAY - Animated explanations
 * Phases: intro, collect, dash_explain
 */
function renderDiamondTutorialOverlay(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    const overlay = state.diamondTutorialOverlay;
    if (!overlay.active) return;

    ctx.save();

    // === PHASE: INTRO ===
    if (overlay.phase === 'intro') {
        // Darker vignette background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // === BORDERED FRAME ===
        const frameWidth = Math.min(320, canvasWidth * 0.85);
        const frameHeight = 220;
        const frameX = (canvasWidth - frameWidth) / 2;
        const frameY = (canvasHeight - frameHeight) / 2 - 30;

        // Frame background with gradient
        const frameBg = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameHeight);
        frameBg.addColorStop(0, 'rgba(0, 30, 60, 0.95)');
        frameBg.addColorStop(1, 'rgba(0, 15, 35, 0.98)');

        ctx.beginPath();
        ctx.roundRect(frameX, frameY, frameWidth, frameHeight, 16);
        ctx.fillStyle = frameBg;
        ctx.fill();

        // Cyan glowing border
        ctx.strokeStyle = '#00dcff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00dcff';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner border highlight
        ctx.strokeStyle = 'rgba(0, 220, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(frameX + 6, frameY + 6, frameWidth - 12, frameHeight - 12, 12);
        ctx.stroke();

        // === BIG DIAMOND ICON with smooth bounce ===
        const bounceSpeed = 0.003; // Slower bounce
        const scale = 1 + Math.sin(state.time * bounceSpeed) * 0.1;
        const diamondY = frameY + 70;

        ctx.save();
        ctx.translate(canvasWidth / 2, diamondY);
        ctx.scale(scale, scale);
        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = '#00dcff';
        ctx.shadowColor = '#00dcff';
        ctx.shadowBlur = 30;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💎', 0, 0);
        ctx.restore();

        // === SPARKLE PARTICLES - slower rotation ===
        for (let i = 0; i < 6; i++) {
            const angle = (state.time * 0.001 + i * 1.047) % (Math.PI * 2);
            const dist = 55 + Math.sin(state.time * 0.002 + i) * 10;
            const px = canvasWidth / 2 + Math.cos(angle) * dist;
            const py = diamondY + Math.sin(angle) * dist * 0.5;
            const pAlpha = 0.4 + Math.sin(state.time * 0.005 + i * 2) * 0.4;

            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 220, 255, ${pAlpha})`;
            ctx.fill();
        }

        // === TITLE TEXT - slower typewriter ===
        const text = 'ELMASLARI TOPLA!';
        const typeSpeed = 150; // Slower: 150ms per char
        const visibleChars = Math.min(text.length, Math.floor((state.time % 4000) / typeSpeed));
        const titleY = frameY + frameHeight - 80;

        ctx.globalAlpha = overlay.textAlpha;
        ctx.font = 'bold 26px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00dcff';
        ctx.shadowBlur = 12;
        ctx.textAlign = 'center';
        ctx.fillText(text.substring(0, visibleChars), canvasWidth / 2, titleY);

        // === SUB-TEXT with Dash teaser ===
        if (visibleChars >= text.length) {
            const subAlpha = Math.min(1, (state.time % 4000 - 2400) / 600);
            ctx.globalAlpha = Math.max(0, subAlpha) * overlay.textAlpha;
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffa500';
            ctx.shadowBlur = 8;
            ctx.fillText('⚡ DASH güçlendirmesi için önemli!', canvasWidth / 2, titleY + 35);
        }

        ctx.shadowBlur = 0;
    }

    // === PHASE: COLLECT ===
    if (overlay.phase === 'collect') {
        // Small hint text at top
        ctx.globalAlpha = 0.9;
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 8;
        ctx.fillText('💎 Elmasları topla!', canvasWidth / 2, 60);
    }

    // === PHASE: DASH EXPLAIN ===
    if (overlay.phase === 'dash_explain') {
        const zoom = overlay.zoomProgress;

        // Darkened vignette focusing on dash meter
        const gradient = ctx.createRadialGradient(
            canvasWidth - 70, canvasHeight - 100, 80,
            canvasWidth - 70, canvasHeight - 100, 350
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, 'transparent');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${0.7 * zoom})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Arrow pointing to dash meter
        if (zoom > 0.5) {
            const arrowX = canvasWidth - 150;
            const arrowY = canvasHeight - 100;
            const arrowAlpha = (zoom - 0.5) * 2;

            ctx.globalAlpha = arrowAlpha;
            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.fillText('👉', arrowX, arrowY);

            // Explanation text
            ctx.font = 'bold 18px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00dcff';
            ctx.shadowBlur = 10;
            ctx.textAlign = 'center';
            ctx.fillText('⚡ DASH İÇİN ŞARJ!', canvasWidth / 2, canvasHeight * 0.25);
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#00f0ff';
            ctx.fillText('Elmaslar topladıkça Dash dolacak!', canvasWidth / 2, canvasHeight * 0.32);
        }
    }

    ctx.restore();
}

function renderFlashOverlay(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.flashOverlay.active || state.flashOverlay.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = state.flashOverlay.alpha;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
}

function renderVictoryFlash(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.victoryFlash.active || state.victoryFlash.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = state.victoryFlash.alpha;
    ctx.fillStyle = COLORS.victoryWhite;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.restore();
}

function renderConfetti(ctx: CanvasRenderingContext2D, state: TutorialVFXState): void {
    state.confetti.forEach(c => {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
        ctx.restore();
    });
}

function renderUnlockAnimation(
    ctx: CanvasRenderingContext2D,
    state: TutorialVFXState,
    canvasWidth: number,
    canvasHeight: number
): void {
    if (!state.unlockAnimation.active) return;

    const progress = state.unlockAnimation.progress;
    const x = canvasWidth / 2;
    const y = canvasHeight / 2 + 80;

    ctx.save();
    ctx.globalAlpha = Math.min(1, progress * 2);
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.diamondGold;
    ctx.shadowColor = COLORS.diamondGold;
    ctx.shadowBlur = 20;

    // Unlock text with scale animation
    const scale = 0.5 + progress * 0.5;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillText('🔓 BÖLÜM 1 KİLİDİ AÇILDI!', 0, 0);

    ctx.restore();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateLightningPoints(count: number, yMin: number, yMax: number): Point[] {
    const points: Point[] = [];
    const startX = window.innerWidth * 0.15;

    for (let i = 0; i < count; i++) {
        points.push({
            x: startX + (Math.random() - 0.5) * 20,
            y: yMin + (yMax - yMin) * (i / (count - 1)) + (Math.random() - 0.5) * 10,
        });
    }

    return points;
}

// ============================================================================
// TRIGGER FUNCTIONS (called from game engine)
// ============================================================================

/**
 * Trigger flash effect when player passes block
 */
export function triggerFlash(state: TutorialVFXState): TutorialVFXState {
    return {
        ...state,
        flashOverlay: {
            active: true,
            alpha: 0.5,
            startTime: state.time,
        },
    };
}

/**
 * Add motion trail point
 */
export function addMotionTrail(state: TutorialVFXState, x: number, y: number): TutorialVFXState {
    const trails = [...state.motionTrails, { x, y, alpha: 1, time: state.time }];
    return {
        ...state,
        motionTrails: trails.slice(-50), // Keep last 50 points
    };
}


