/**
 * Phase Dash VFX System (Sinematik Görsel Efektler)
 * 
 * Provides cinematic visual effects for Phase Dash:
 * - Environment darkening (overlay)
 * - Cyan/Magenta neon color grading (dystopian atmosphere)
 * - Pulsing vignette effect
 * - Radial particle burst on activation
 * - Comet Tail (behind player)
 * - Enhanced Warp Lines (cinematic speed)
 * - Smooth 0.5s transitions in/out
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Burst particle for activation effect
 */
export interface BurstParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    size: number;
    color: string;      // '#00FFFF' (cyan) or '#FF00FF' (magenta)
}

/**
 * Comet particle for the trail effect
 */
export interface CometParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    life: number;     // 0-1
    decay: number;
    color: string;
}

/**
 * Warp line for cinematic speed effect
 */
export interface WarpLine {
    x: number;
    y: number;
    length: number;
    speed: number;
    angle: number;
}

/**
 * Phase Dash VFX state
 */
export interface PhaseDashVFXState {
    // Transition control
    transitionProgress: number;     // 0-1 (0=normal, 1=full dash atmosphere)
    isTransitioning: boolean;
    transitionDirection: 'in' | 'out' | 'none';
    transitionStartTime: number;

    // Effect layers
    darkenOverlay: number;          // 0-0.35 darkness
    vignetteIntensity: number;      // 0-0.7 edge darkness
    colorShift: {
        cyan: number;                 // 0-1
        magenta: number;              // 0-1
    };
    pulsePhase: number;             // 0-2π for animation

    // Particles
    burstParticles: BurstParticle[];
    cometParticles: CometParticle[];
    warpLines: WarpLine[];
}

/**
 * VFX configuration
 */
export interface PhaseDashVFXConfig {
    transitionDuration: number;     // ms for fade in/out
    maxDarken: number;              // max darkness (0-1)
    maxVignette: number;            // max vignette intensity
    pulseFrequency: number;         // pulses per second
    burstParticleCount: number;     // particles in activation burst
    burstParticleSpeed: number;     // particle velocity
    burstParticleFadeRate: number;  // particle fade speed
}

// ============================================================================
// Default Configuration
// ============================================================================

export const VFX_CONFIG: PhaseDashVFXConfig = {
    transitionDuration: 500,        // 0.5 second transition
    maxDarken: 0.35,                // 35% darkness
    maxVignette: 0.7,               // 70% vignette at edges
    pulseFrequency: 2,              // 2 pulses per second
    burstParticleCount: 24,         // 24 particles in burst
    burstParticleSpeed: 8,          // pixels per frame
    burstParticleFadeRate: 0.04,    // alpha decrease per frame
};

// ============================================================================
// State Factory
// ============================================================================

/**
 * Creates initial VFX state
 */
export function createInitialVFXState(): PhaseDashVFXState {
    return {
        transitionProgress: 0,
        isTransitioning: false,
        transitionDirection: 'none',
        transitionStartTime: 0,
        darkenOverlay: 0,
        vignetteIntensity: 0,
        colorShift: { cyan: 0, magenta: 0 },
        pulsePhase: 0,
        burstParticles: [],
        cometParticles: [],
        warpLines: [],
    };
}

// ============================================================================
// Transition Control
// ============================================================================

/**
 * Triggers VFX transition in (dash start)
 * Creates burst particles
 */
export function triggerTransitionIn(
    state: PhaseDashVFXState,
    playerX: number,
    playerY: number,
    config: PhaseDashVFXConfig = VFX_CONFIG
): PhaseDashVFXState {
    // Create burst particles
    const particles: BurstParticle[] = [];
    for (let i = 0; i < config.burstParticleCount; i++) {
        const angle = (i / config.burstParticleCount) * Math.PI * 2;
        const speed = config.burstParticleSpeed * (0.8 + Math.random() * 0.4);
        particles.push({
            x: playerX,
            y: playerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: 4 + Math.random() * 6,
            color: i % 2 === 0 ? '#00FFFF' : '#FF00FF',
        });
    }

    return {
        ...state,
        isTransitioning: true,
        transitionDirection: 'in',
        transitionStartTime: Date.now(),
        burstParticles: particles,
        cometParticles: [], // Reset comet
        warpLines: [],      // Reset warp
    };
}

/**
 * Triggers VFX transition out (dash end)
 */
export function triggerTransitionOut(
    state: PhaseDashVFXState
): PhaseDashVFXState {
    return {
        ...state,
        isTransitioning: true,
        transitionDirection: 'out',
        transitionStartTime: Date.now(),
    };
}

// ============================================================================
// Frame Update
// ============================================================================

/**
 * Updates VFX state each frame
 */
export function updateVFXState(
    state: PhaseDashVFXState,
    dashActive: boolean,
    playerX: number,
    playerY: number,
    deltaTime: number,
    config: PhaseDashVFXConfig = VFX_CONFIG
): PhaseDashVFXState {
    let newState = { ...state };

    // Update transition progress
    if (newState.isTransitioning) {
        const elapsed = Date.now() - newState.transitionStartTime;
        const progress = Math.min(1, elapsed / config.transitionDuration);

        if (newState.transitionDirection === 'in') {
            newState.transitionProgress = progress;
        } else {
            newState.transitionProgress = 1 - progress;
        }

        // Check if transition complete
        if (progress >= 1) {
            newState.isTransitioning = false;
            newState.transitionDirection = 'none';
        }
    } else if (dashActive && newState.transitionProgress < 1) {
        // Force full progress if dash is active but transition didn't complete
        newState.transitionProgress = 1;
    } else if (!dashActive && newState.transitionProgress > 0 && !newState.isTransitioning) {
        // Auto-trigger transition out if dash ended
        newState = triggerTransitionOut(newState);
    }

    const t = newState.transitionProgress;

    // Update effect values based on transition
    newState.darkenOverlay = t * config.maxDarken;
    newState.vignetteIntensity = t * config.maxVignette;
    newState.colorShift = {
        cyan: t,
        magenta: t * 0.8,
    };

    // Pulse
    if (t > 0) {
        newState.pulsePhase += deltaTime * 0.001 * config.pulseFrequency * Math.PI * 2;
        if (newState.pulsePhase > Math.PI * 2) {
            newState.pulsePhase -= Math.PI * 2;
        }
    }

    // --- COMET TAIL UPDATE ---
    if (dashActive || t > 0) {
        const emissionCount = Math.floor(4 * t);
        for (let i = 0; i < emissionCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 10;
            newState.cometParticles.push({
                x: playerX + Math.cos(angle) * dist,
                y: playerY + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 4,
                vy: 5 + Math.random() * 10,    // Trail falls 'down' as player moves 'up' effectively
                size: 2 + Math.random() * 4,
                alpha: 1,
                life: 1,
                decay: 0.03 + Math.random() * 0.05,
                color: Math.random() > 0.5 ? '#00FFFF' : '#0088FF'
            });
        }
    }

    // Update comet particles
    newState.cometParticles = newState.cometParticles.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        alpha: p.alpha - p.decay,
        size: p.size * 0.95
    })).filter(p => p.alpha > 0);

    // --- WARP LINES UPDATE ---
    if (t > 0) {
        if (newState.warpLines.length < 40) {
            newState.warpLines.push({
                x: Math.random() * window.innerWidth, // Fallback width
                y: -100 - Math.random() * 500, // Start above screen
                length: 50 + Math.random() * 100,
                speed: 30 + Math.random() * 40,
                angle: Math.PI / 2
            });
        }
    }

    // Update warp lines
    newState.warpLines = newState.warpLines.map(l => ({
        ...l,
        y: l.y + l.speed * (1 + t * 3), // Speed up with dash
        length: l.length + l.speed * 0.2
    })).filter(l => l.y < window.innerHeight + 200);

    // Update burst particles
    newState.burstParticles = newState.burstParticles
        .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            alpha: p.alpha - config.burstParticleFadeRate,
        }))
        .filter(p => p.alpha > 0);

    return newState;
}

// ============================================================================
// Rendering Functions
// ============================================================================

/**
 * Draws environment darkening overlay
 */
export function drawDarkenOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number
): void {
    if (intensity <= 0) return;

    ctx.save();
    ctx.fillStyle = `rgba(0, 10, 20, ${intensity})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

/**
 * Draws neon color grading
 */
export function drawColorGrading(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cyan: number,
    magenta: number
): void {
    if (cyan <= 0 && magenta <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';

    if (cyan > 0) {
        const cyanGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.6);
        cyanGrad.addColorStop(0, `rgba(0, 255, 255, ${cyan * 0.15})`);
        cyanGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = cyanGrad;
        ctx.fillRect(0, 0, width, height);
    }

    if (magenta > 0) {
        const magentaGrad = ctx.createRadialGradient(width, height, 0, width, height, width * 0.6);
        magentaGrad.addColorStop(0, `rgba(255, 0, 255, ${magenta * 0.12})`);
        magentaGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = magentaGrad;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
}

/**
 * Draws pulsing vignette
 */
export function drawVignettePulse(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number,
    phase: number
): void {
    if (intensity <= 0) return;

    const pulseIntensity = intensity * (0.8 + 0.2 * Math.sin(phase));
    const centerX = width / 2;
    const centerY = height / 2;
    const innerRadius = Math.min(width, height) * 0.2;
    const outerRadius = Math.max(width, height) * 0.8;

    const gradient = ctx.createRadialGradient(
        centerX, centerY, innerRadius,
        centerX, centerY, outerRadius
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.6, `rgba(0, 0, 0, ${pulseIntensity * 0.3})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${pulseIntensity})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

/**
 * Draws burst particles
 */
export function drawBurstParticles(
    ctx: CanvasRenderingContext2D,
    particles: BurstParticle[]
): void {
    particles.forEach(p => {
        if (p.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

/**
 * Draws comet tail
 */
export function drawCometTail(ctx: CanvasRenderingContext2D, particles: CometParticle[]) {
    if (particles.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

/**
 * Draws enhanced warp lines
 */
export function drawWarpLines(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number, lines: WarpLine[]) {
    if (intensity <= 0) return;

    ctx.save();
    // Cyan glow style
    ctx.strokeStyle = `rgba(180, 255, 255, ${intensity * 0.5})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 5;

    lines.forEach(line => {
        // Simple vertical lines falling
        // If we want radial, we generate them differently. Let's stick to vertical "rain/warp" look for speed.
        // It matches the game vertical flow roughly or adds contrast.
        // Actually user wanted "forward" movement. Vertical lines moving down fast simulates moving UP fast.

        // Let's re-use the generic generation we had or just draw these lines.
        // We generated them as random X, falling Y.

        const grad = ctx.createLinearGradient(line.x, line.y, line.x, line.y + line.length);
        grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
        grad.addColorStop(0.5, `rgba(0, 255, 255, ${intensity * 0.8})`);
        grad.addColorStop(1, 'rgba(0, 255, 255, 0)');

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x, line.y + line.length);
        ctx.stroke();
    });

    ctx.restore();
}

/**
 * Renders all VFX layers in correct order
 */
export function renderAllVFX(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: PhaseDashVFXState
): void {
    const t = state.transitionProgress;
    // Always render if active or particles exist
    if (t <= 0 && state.burstParticles.length === 0 && state.cometParticles.length === 0) return;

    // 1. Darken overlay
    drawDarkenOverlay(ctx, width, height, state.darkenOverlay);

    // 2. Comet Tail (behind UI, around player)
    drawCometTail(ctx, state.cometParticles);

    // 3. Color grading
    drawColorGrading(ctx, width, height, state.colorShift.cyan, state.colorShift.magenta);

    // 4. Warp Lines
    drawWarpLines(ctx, width, height, t, state.warpLines);

    // 5. Vignette pulse
    drawVignettePulse(ctx, width, height, state.vignetteIntensity, state.pulsePhase);

    // 6. Burst particles (on top)
    drawBurstParticles(ctx, state.burstParticles);
}

// ============================================================================
// Utility Functions
// ============================================================================

export function isVFXActive(state: PhaseDashVFXState): boolean {
    return state.transitionProgress > 0 || state.burstParticles.length > 0 || state.cometParticles.length > 0;
}

export function resetVFXState(): PhaseDashVFXState {
    return createInitialVFXState();
}
