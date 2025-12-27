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

export interface TutorialVFXState {
    // Faz 1: Focus Mask & Ghost Hand
    focusMask: {
        enabled: boolean;
        targetArea: Rect;
        alpha: number;
    };
    ghostHand: {
        visible: boolean;
        y: number;
        phase: number;        // Sinusoidal phase
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
            y: 0.5,
            phase: 0,
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
        case 'NAVIGATION':
            updateNavigationVFX(newState, tutorialState, canvasWidth, canvasHeight);
            break;
        case 'COLOR_MATCH':
            updateColorMatchVFX(newState, tutorialState);
            break;
        case 'SWAP_MECHANIC':
            updateSwapVFX(newState, tutorialState);
            break;
        case 'CONNECTOR':
            updateConnectorVFX(newState, tutorialState, canvasHeight);
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

    return newState;
}

// ============================================================================
// PHASE-SPECIFIC VFX UPDATES
// ============================================================================

function updateNavigationVFX(
    state: TutorialVFXState,
    tutorial: TutorialState,
    canvasWidth: number,
    canvasHeight: number
): void {
    // Focus mask - darken edges, highlight the orb area
    // Player orbs are at x = canvasWidth / 8 (12.5% from left)
    const orbX = canvasWidth / 8;
    const focusRadius = 100; // Radius around player to keep visible

    state.focusMask.enabled = true;
    state.focusMask.alpha = Math.min(0.6, state.focusMask.alpha + 0.02);
    state.focusMask.targetArea = {
        x: orbX - focusRadius,
        y: canvasHeight * 0.15,
        width: focusRadius * 2,
        height: canvasHeight * 0.7,
    };

    // Ghost hand animation - sinusoidal up/down
    state.ghostHand.visible = true;
    state.ghostHand.phase += 0.03;
    state.ghostHand.y = 0.5 + Math.sin(state.ghostHand.phase) * 0.2;

    // Pulse circle at target position
    const targets = [0.25, 0.5, 0.75];
    const currentTarget = targets[Math.min(tutorial.progress, targets.length - 1)];
    state.pulseCircle.active = true;
    state.pulseCircle.x = orbX;
    state.pulseCircle.y = canvasHeight * currentTarget;
    state.pulseCircle.radius = 30 + Math.sin(state.time * 0.005) * 10;
    state.pulseCircle.alpha = 0.5 + Math.sin(state.time * 0.008) * 0.3;
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
    // Time distortion overlay
    state.timeDistortion.active = true;
    state.timeDistortion.intensity = 0.8;
    state.timeDistortion.overlayAlpha = 0.15;

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

    // Glitch text
    state.glitchText.visible = tutorial.waitingForInput;
    state.glitchText.text = 'ŞİMDİ BIRAK!';
    state.glitchText.glitchOffset = Math.sin(state.time * 0.1) * 3;
}

function updateConnectorVFX(
    state: TutorialVFXState,
    tutorial: TutorialState,
    canvasHeight: number
): void {
    // Disable time distortion
    state.timeDistortion.active = false;
    state.glitchText.visible = false;

    // Generate lightning arcs on connector
    if (Math.random() < 0.1) {
        const arc: LightningArc = {
            points: generateLightningPoints(5, canvasHeight * 0.4, canvasHeight * 0.6),
            alpha: 1,
            time: state.time,
        };
        state.lightningArcs.push(arc);
    }

    // Fade out old arcs
    state.lightningArcs = state.lightningArcs
        .map(arc => ({ ...arc, alpha: arc.alpha - 0.05 }))
        .filter(arc => arc.alpha > 0);

    // Warning banners
    state.warningBanners.visible = true;
    state.warningBanners.alpha = 0.5 + Math.sin(state.time * 0.01) * 0.3;
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
    renderWarningBanners(ctx, state, canvasWidth, canvasHeight);
    renderGlitchText(ctx, state, canvasWidth, canvasHeight);
    renderDiamondGlow(ctx, state, canvasWidth, canvasHeight);
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
    if (!state.ghostHand.visible) return;

    const x = canvasWidth * 0.15;
    const y = canvasHeight * state.ghostHand.y;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = COLORS.ghostHand;

    // Simple hand shape (pointing finger)
    ctx.beginPath();
    ctx.ellipse(x, y, 15, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Finger
    ctx.beginPath();
    ctx.ellipse(x, y - 30, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function renderPulseCircle(ctx: CanvasRenderingContext2D, state: TutorialVFXState): void {
    if (!state.pulseCircle.active) return;

    const { x, y, radius, alpha } = state.pulseCircle;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLORS.pulseCircle;
    ctx.lineWidth = 3;
    ctx.shadowColor = COLORS.pulseCircle;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

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
    ctx.globalAlpha = state.timeDistortion.overlayAlpha;
    ctx.fillStyle = COLORS.timeDistortion;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
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
