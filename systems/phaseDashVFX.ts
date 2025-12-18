/**
 * Phase Dash VFX System (Profesyonel Sinematik Görsel Efektler)
 * 
 * Echo Shift'in neon/cyberpunk estetiğine uygun, GPU dostu VFX modülü.
 * 
 * Efektler:
 * - Speed Lines (Warp Efekti) - Hız çizgileri
 * - RGB Split (Renk Kayması) - Ghost trail için hologram efekti
 * - Neon Glow (Neon Parlama) - Oyuncu aura
 * - Camera Shake (Kamera Sarsıntısı) - Dash sırasında titreme
 * - Vignette (Odaklanma) - Kenar karartma
 * - Burst Particles - Aktivasyon patlaması
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Speed line for warp effect
 */
export interface SpeedLine {
    x: number;
    y: number;
    length: number;
    speed: number;
    width: number;
}

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
    color: string;
}

/**
 * Comet particle for trail effect
 */
export interface CometParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    life: number;
    decay: number;
    color: string;
}

/**
 * Ghost position for RGB split trail
 */
export interface GhostPosition {
    x: number;
    y: number;
    alpha: number;
}

/**
 * Phase Dash VFX state
 */
export interface PhaseDashVFXState {
    // Speed Lines (Warp Effect)
    speedLines: SpeedLine[];
    
    // Camera Shake
    shakeOffset: { x: number; y: number };
    
    // Pulse Animation (0-1 oscillating)
    pulse: number;
    
    // Transition control
    transitionProgress: number;
    isTransitioning: boolean;
    transitionDirection: 'in' | 'out' | 'none';
    transitionStartTime: number;
    
    // Effect intensities
    darkenOverlay: number;
    vignetteIntensity: number;
    colorShift: { cyan: number; magenta: number };
    
    // Particles
    burstParticles: BurstParticle[];
    cometParticles: CometParticle[];
}

/**
 * VFX configuration
 */
export interface PhaseDashVFXConfig {
    transitionDuration: number;
    maxDarken: number;
    maxVignette: number;
    shakeIntensity: number;
    speedLineCount: number;
    burstParticleCount: number;
    burstParticleSpeed: number;
    burstParticleFadeRate: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const VFX_CONFIG: PhaseDashVFXConfig = {
    transitionDuration: 400,
    maxDarken: 0.4,
    maxVignette: 0.6,
    shakeIntensity: 3,
    speedLineCount: 25,
    burstParticleCount: 24,
    burstParticleSpeed: 10,
    burstParticleFadeRate: 0.05,
};

// ============================================================================
// State Factory
// ============================================================================

/**
 * Creates initial VFX state
 */
export function createInitialVFXState(): PhaseDashVFXState {
    return {
        speedLines: [],
        shakeOffset: { x: 0, y: 0 },
        pulse: 0,
        transitionProgress: 0,
        isTransitioning: false,
        transitionDirection: 'none',
        transitionStartTime: 0,
        darkenOverlay: 0,
        vignetteIntensity: 0,
        colorShift: { cyan: 0, magenta: 0 },
        burstParticles: [],
        cometParticles: [],
    };
}

/**
 * Initialize speed lines for warp effect
 */
export function initSpeedLines(width: number, height: number, count: number = VFX_CONFIG.speedLineCount): SpeedLine[] {
    const lines: SpeedLine[] = [];
    for (let i = 0; i < count; i++) {
        lines.push({
            x: Math.random() * width,
            y: Math.random() * height,
            length: Math.random() * 100 + 50,
            speed: Math.random() * 30 + 20,
            width: Math.random() * 2 + 0.5,
        });
    }
    return lines;
}

// ============================================================================
// Transition Control
// ============================================================================

/**
 * Triggers VFX transition in (dash start)
 */
export function triggerTransitionIn(
    state: PhaseDashVFXState,
    playerX: number,
    playerY: number,
    width: number = 800,
    height: number = 600,
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
        cometParticles: [],
        speedLines: initSpeedLines(width, height, config.speedLineCount),
    };
}

/**
 * Triggers VFX transition out (dash end)
 */
export function triggerTransitionOut(state: PhaseDashVFXState): PhaseDashVFXState {
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
    width: number = 800,
    height: number = 600,
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

        if (progress >= 1) {
            newState.isTransitioning = false;
            newState.transitionDirection = 'none';
        }
    } else if (dashActive && newState.transitionProgress < 1) {
        newState.transitionProgress = 1;
    } else if (!dashActive && newState.transitionProgress > 0 && !newState.isTransitioning) {
        newState = triggerTransitionOut(newState);
    }

    const t = newState.transitionProgress;

    // Update effect values
    newState.darkenOverlay = t * config.maxDarken;
    newState.vignetteIntensity = t * config.maxVignette;
    newState.colorShift = { cyan: t, magenta: t * 0.8 };

    // Pulse animation (0-1 oscillating)
    newState.pulse = (Math.sin(Date.now() / 50) + 1) / 2;

    // Camera shake (only during active dash)
    if (dashActive && t > 0.5) {
        const intensity = config.shakeIntensity * t;
        newState.shakeOffset = {
            x: (Math.random() - 0.5) * intensity,
            y: (Math.random() - 0.5) * intensity,
        };
    } else {
        newState.shakeOffset = { x: 0, y: 0 };
    }

    // Update speed lines
    if (t > 0) {
        // Initialize if empty
        if (newState.speedLines.length === 0) {
            newState.speedLines = initSpeedLines(width, height, config.speedLineCount);
        }

        newState.speedLines = newState.speedLines.map(line => {
            let newY = line.y + line.speed * (1 + t * 2);
            if (newY > height + line.length) {
                newY = -line.length;
                line.x = Math.random() * width;
            }
            return { ...line, y: newY };
        });
    }

    // Update comet particles (trail behind player)
    if (dashActive && t > 0) {
        const emissionCount = Math.floor(3 * t);
        for (let i = 0; i < emissionCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 8;
            newState.cometParticles.push({
                x: playerX + Math.cos(angle) * dist,
                y: playerY + Math.sin(angle) * dist,
                vx: (Math.random() - 0.5) * 3,
                vy: 4 + Math.random() * 8,
                size: 2 + Math.random() * 4,
                alpha: 1,
                life: 1,
                decay: 0.04 + Math.random() * 0.04,
                color: Math.random() > 0.5 ? '#00FFFF' : '#0088FF',
            });
        }
    }

    newState.cometParticles = newState.cometParticles
        .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            alpha: p.alpha - p.decay,
            size: p.size * 0.96,
        }))
        .filter(p => p.alpha > 0);

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
 * Draws vignette with radial gradient (focus effect)
 */
function drawVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    intensity: number,
    pulse: number
): void {
    if (intensity <= 0) return;

    const pulseIntensity = intensity * (0.85 + 0.15 * pulse);
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, height
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 10, 20, ${pulseIntensity})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

/**
 * Draws speed lines (warp effect)
 */
function drawSpeedLines(
    ctx: CanvasRenderingContext2D,
    lines: SpeedLine[],
    intensity: number
): void {
    if (intensity <= 0 || lines.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00FFFF';

    lines.forEach(line => {
        const alpha = Math.min(0.8, line.speed / 60) * intensity;
        ctx.beginPath();
        ctx.strokeStyle = `rgba(200, 255, 255, ${alpha})`;
        ctx.lineWidth = line.width;
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x, line.y + line.length);
        ctx.stroke();
    });

    ctx.restore();
}

/**
 * Connector trail position for spinning effect
 */
export interface ConnectorTrailPosition {
    x: number;
    y: number;
    angle: number;  // Rotation angle at this position
    alpha: number;
    length: number; // Connector length
}

// Store connector trail in module scope
let connectorTrail: ConnectorTrailPosition[] = [];
const MAX_CONNECTOR_TRAIL = 12;
const CONNECTOR_TRAIL_FADE = 0.12;

/**
 * Adds a connector position to the trail
 */
export function addConnectorTrailPosition(
    x: number,
    y: number,
    angle: number,
    length: number
): void {
    connectorTrail.push({
        x,
        y,
        angle,
        alpha: 1.0,
        length,
    });
    
    // Limit trail length
    if (connectorTrail.length > MAX_CONNECTOR_TRAIL) {
        connectorTrail = connectorTrail.slice(-MAX_CONNECTOR_TRAIL);
    }
}

// Comet tail particles for the spinning connector
let cometTailParticles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string }[] = [];

/**
 * Updates and draws the connector trail (spinning bar effect) with border and comet tail
 */
export function updateAndDrawConnectorTrail(
    ctx: CanvasRenderingContext2D,
    orbRadius: number
): void {
    if (connectorTrail.length === 0) return;

    ctx.save();

    connectorTrail = connectorTrail
        .map((trail, i) => {
            if (trail.alpha <= 0.05) return trail;

            const halfLen = trail.length / 2;
            
            // Calculate orb positions based on trail angle
            const yOffset = Math.cos(trail.angle) * halfLen;
            const xOffset = Math.sin(trail.angle) * 15;
            
            const topX = trail.x - xOffset;
            const topY = trail.y - yOffset;
            const bottomX = trail.x + xOffset;
            const bottomY = trail.y + yOffset;

            // Draw dark border first (for visibility on white background)
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(bottomX, bottomY);
            ctx.strokeStyle = `rgba(0, 0, 0, ${trail.alpha * 0.8})`;
            ctx.lineWidth = 8;
            ctx.stroke();

            // Draw trail connector with neon glow
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(bottomX, bottomY);
            ctx.strokeStyle = `rgba(0, 255, 255, ${trail.alpha * 0.9})`;
            ctx.lineWidth = 4;
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 20 * trail.alpha;
            ctx.stroke();

            // Draw trail orbs with border
            const trailOrbSize = orbRadius * (0.7 + trail.alpha * 0.3);
            
            // Top orb border
            ctx.beginPath();
            ctx.arc(topX, topY, trailOrbSize + 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${trail.alpha * 0.7})`;
            ctx.fill();
            
            // Top orb trail (cyan)
            ctx.beginPath();
            ctx.arc(topX, topY, trailOrbSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 255, ${trail.alpha * 0.8})`;
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 15;
            ctx.fill();
            
            // Bottom orb border
            ctx.beginPath();
            ctx.arc(bottomX, bottomY, trailOrbSize + 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${trail.alpha * 0.7})`;
            ctx.shadowBlur = 0;
            ctx.fill();
            
            // Bottom orb trail (magenta)
            ctx.beginPath();
            ctx.arc(bottomX, bottomY, trailOrbSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 255, ${trail.alpha * 0.8})`;
            ctx.shadowColor = '#FF00FF';
            ctx.shadowBlur = 15;
            ctx.fill();

            // Emit comet tail particles from both orbs
            if (trail.alpha > 0.8 && Math.random() > 0.3) {
                // Particles from top orb
                cometTailParticles.push({
                    x: topX,
                    y: topY,
                    vx: -3 - Math.random() * 4,
                    vy: (Math.random() - 0.5) * 3,
                    size: 2 + Math.random() * 4,
                    alpha: 1,
                    color: '#00FFFF',
                });
                // Particles from bottom orb
                cometTailParticles.push({
                    x: bottomX,
                    y: bottomY,
                    vx: -3 - Math.random() * 4,
                    vy: (Math.random() - 0.5) * 3,
                    size: 2 + Math.random() * 4,
                    alpha: 1,
                    color: '#FF00FF',
                });
            }

            // Update alpha
            return {
                ...trail,
                alpha: trail.alpha - CONNECTOR_TRAIL_FADE,
            };
        })
        .filter(trail => trail.alpha > 0);

    // Draw and update comet tail particles
    ctx.globalCompositeOperation = 'screen';
    cometTailParticles = cometTailParticles
        .map(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color.replace(')', `, ${p.alpha * 0.7})`).replace('rgb', 'rgba').replace('#00FFFF', 'rgba(0, 255, 255').replace('#FF00FF', 'rgba(255, 0, 255');
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fill();

            return {
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy,
                alpha: p.alpha - 0.05,
                size: p.size * 0.95,
            };
        })
        .filter(p => p.alpha > 0);

    ctx.restore();
}

/**
 * Clears the connector trail and comet particles
 */
export function clearConnectorTrail(): void {
    connectorTrail = [];
    cometTailParticles = [];
}

/**
 * Draws ghost trail with RGB split effect (hologram look) - DEPRECATED, use connector trail instead
 */
export function drawGhostTrailRGBSplit(
    ctx: CanvasRenderingContext2D,
    ghostTrail: GhostPosition[],
    orbRadius: number
): void {
    // This function is kept for compatibility but connector trail is preferred
    if (ghostTrail.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    ghostTrail.forEach((ghost, i) => {
        if (ghost.alpha <= 0.05) return;

        const scale = 1 - (i * 0.04);
        const size = orbRadius * scale;

        ctx.save();
        ctx.translate(ghost.x, ghost.y);

        // Cyan glow
        ctx.fillStyle = `rgba(0, 255, 255, ${ghost.alpha * 0.4})`;
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

    ctx.restore();
}

/**
 * Debris particle for obstacle destruction effect
 */
export interface DebrisParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
}

// Store debris particles in module scope for persistence
let debrisParticles: DebrisParticle[] = [];

/**
 * Creates debris particles when obstacle is destroyed
 * Enhanced for satisfying destruction feel
 */
export function createObstacleDebris(
    obstacleX: number,
    obstacleY: number,
    obstacleWidth: number,
    obstacleHeight: number,
    obstacleColor: string
): void {
    // More particles for bigger impact (16-24 particles)
    const particleCount = 16 + Math.floor(Math.random() * 8);
    
    // Center of obstacle for explosion origin
    const centerX = obstacleX + obstacleWidth / 2;
    const centerY = obstacleY + obstacleHeight / 2;
    
    for (let i = 0; i < particleCount; i++) {
        // Radial explosion pattern - particles fly outward from center
        const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        
        // Varied speeds for dynamic feel (faster = more impact)
        const speedBase = 8 + Math.random() * 12;
        const speed = speedBase * (0.7 + Math.random() * 0.6);
        
        // Varied sizes - mix of large chunks and small fragments
        const isLargeChunk = Math.random() > 0.6;
        const size = isLargeChunk ? (10 + Math.random() * 15) : (3 + Math.random() * 8);
        
        // Spawn from within obstacle bounds
        const spawnOffsetX = (Math.random() - 0.5) * obstacleWidth * 0.8;
        const spawnOffsetY = (Math.random() - 0.5) * obstacleHeight * 0.8;
        
        // Color variation - add neon accents to debris
        let particleColor = obstacleColor;
        if (Math.random() > 0.7) {
            // Add cyan/magenta neon sparks
            particleColor = Math.random() > 0.5 ? '#00FFFF' : '#FF00FF';
        }
        
        debrisParticles.push({
            x: centerX + spawnOffsetX,
            y: centerY + spawnOffsetY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3, // Upward bias for explosion feel
            size,
            alpha: 1,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.5, // Faster spin
            color: particleColor,
        });
    }
    
    // Add extra spark particles for visual flair
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 15 + Math.random() * 10;
        debrisParticles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 3,
            alpha: 1,
            rotation: 0,
            rotationSpeed: 0,
            color: '#FFFFFF', // White sparks
        });
    }
}

/**
 * Updates and renders debris particles
 * Enhanced with glow effects and motion blur
 */
export function updateAndDrawDebris(ctx: CanvasRenderingContext2D): void {
    if (debrisParticles.length === 0) return;

    ctx.save();
    
    debrisParticles = debrisParticles
        .map(p => {
            // Draw particle with enhanced effects
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.globalAlpha = p.alpha;
            
            // Determine glow color based on particle color
            let glowColor = '#00FFFF';
            if (p.color === '#FFFFFF') {
                glowColor = '#00FFFF';
            } else if (p.color === '#000000') {
                glowColor = '#FF00FF';
            } else {
                glowColor = p.color;
            }
            
            // Draw glow layer first (larger, more transparent)
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 15 * p.alpha;
            ctx.fillStyle = glowColor;
            ctx.globalAlpha = p.alpha * 0.3;
            ctx.fillRect(-p.size * 0.7, -p.size * 0.7, p.size * 1.4, p.size * 1.4);
            
            // Draw main particle
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            
            // Draw as rectangle for chunk feel, or circle for sparks
            if (p.size > 5) {
                // Chunky debris - rectangular
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                // Add highlight edge
                ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha * 0.5})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
            } else {
                // Small sparks - circular
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();

            // Update particle physics
            const drag = 0.98; // Air resistance
            return {
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy,
                vx: p.vx * drag,
                vy: p.vy * drag + 0.4, // Gravity (slightly stronger)
                alpha: p.alpha - 0.02, // Slower fade for longer visibility
                rotation: p.rotation + p.rotationSpeed,
                size: p.size * 0.97,
            };
        })
        .filter(p => p.alpha > 0 && p.size > 0.5);

    ctx.restore();
}

/**
 * Clears all debris particles
 */
export function clearDebris(): void {
    debrisParticles = [];
}

/**
 * Draws comet tail particles
 */
function drawCometTail(ctx: CanvasRenderingContext2D, particles: CometParticle[]): void {
    if (particles.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();
}

/**
 * Draws burst particles
 */
function drawBurstParticles(ctx: CanvasRenderingContext2D, particles: BurstParticle[]): void {
    if (particles.length === 0) return;

    particles.forEach(p => {
        if (p.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

/**
 * Draws color grading overlay (cyan/magenta neon atmosphere)
 */
function drawColorGrading(
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
        cyanGrad.addColorStop(0, `rgba(0, 255, 255, ${cyan * 0.12})`);
        cyanGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = cyanGrad;
        ctx.fillRect(0, 0, width, height);
    }

    if (magenta > 0) {
        const magentaGrad = ctx.createRadialGradient(width, height, 0, width, height, width * 0.6);
        magentaGrad.addColorStop(0, `rgba(255, 0, 255, ${magenta * 0.1})`);
        magentaGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = magentaGrad;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
}

/**
 * Renders all VFX layers in correct order
 * Call this BEFORE rendering obstacles/player for background effects
 */
export function renderAllVFX(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: PhaseDashVFXState
): void {
    const t = state.transitionProgress;
    if (t <= 0 && state.burstParticles.length === 0 && state.cometParticles.length === 0) return;

    // 1. Vignette (edge darkening for focus)
    drawVignette(ctx, width, height, state.vignetteIntensity, state.pulse);

    // 2. Speed Lines (warp effect)
    drawSpeedLines(ctx, state.speedLines, t);

    // 3. Comet Tail (behind player)
    drawCometTail(ctx, state.cometParticles);

    // 4. Color Grading (neon atmosphere)
    drawColorGrading(ctx, width, height, state.colorShift.cyan, state.colorShift.magenta);

    // 5. Burst Particles (activation effect)
    drawBurstParticles(ctx, state.burstParticles);
}

/**
 * Gets camera shake offset for applying to other elements
 */
export function getShakeOffset(state: PhaseDashVFXState): { x: number; y: number } {
    return state.shakeOffset;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function isVFXActive(state: PhaseDashVFXState): boolean {
    return state.transitionProgress > 0 || 
           state.burstParticles.length > 0 || 
           state.cometParticles.length > 0;
}

export function resetVFXState(): PhaseDashVFXState {
    return createInitialVFXState();
}

// ============================================================================
// Neon Spin Connector (Replaces normal connector during dash)
// ============================================================================

/**
 * Draws the neon spinning connector that replaces the normal player during dash
 * This is the main visual element - a glowing cyan/magenta bar that spins
 */
export function drawNeonSpinConnector(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    angle: number,
    connectorLength: number,
    orbRadius: number,
    transitionProgress: number // 0-1, for fade in/out animation
): void {
    if (transitionProgress <= 0) return;

    const halfLen = connectorLength / 2;
    const alpha = transitionProgress;

    // Calculate orb positions based on angle
    const yOffset = Math.cos(angle) * halfLen;
    const xOffset = Math.sin(angle) * 15;

    const topX = centerX - xOffset;
    const topY = centerY - yOffset;
    const bottomX = centerX + xOffset;
    const bottomY = centerY + yOffset;

    ctx.save();

    // Outer glow layer
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00FFFF';

    // Draw glowing connector line
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(bottomX, bottomY);
    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Inner bright line
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(bottomX, bottomY);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FFFFFF';
    ctx.stroke();

    // Top orb (Cyan)
    ctx.beginPath();
    ctx.arc(topX, topY, orbRadius * 1.2, 0, Math.PI * 2);
    const topGrad = ctx.createRadialGradient(topX, topY, 0, topX, topY, orbRadius * 1.5);
    topGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    topGrad.addColorStop(0.4, `rgba(0, 255, 255, ${alpha * 0.9})`);
    topGrad.addColorStop(1, `rgba(0, 255, 255, 0)`);
    ctx.fillStyle = topGrad;
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 20;
    ctx.fill();

    // Bottom orb (Magenta)
    ctx.beginPath();
    ctx.arc(bottomX, bottomY, orbRadius * 1.2, 0, Math.PI * 2);
    const bottomGrad = ctx.createRadialGradient(bottomX, bottomY, 0, bottomX, bottomY, orbRadius * 1.5);
    bottomGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    bottomGrad.addColorStop(0.4, `rgba(255, 0, 255, ${alpha * 0.9})`);
    bottomGrad.addColorStop(1, `rgba(255, 0, 255, 0)`);
    ctx.fillStyle = bottomGrad;
    ctx.shadowColor = '#FF00FF';
    ctx.shadowBlur = 20;
    ctx.fill();

    // Center energy core
    ctx.beginPath();
    ctx.arc(centerX, centerY, orbRadius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 15;
    ctx.fill();

    ctx.restore();
}

/**
 * Gets the opacity for the normal connector during dash transition
 * Returns 1 when not dashing, fades to 0 when dashing
 * During return animation, smoothly fades back in
 */
export function getNormalConnectorOpacity(transitionProgress: number): number {
    return 1 - transitionProgress;
}

/**
 * Calculates the morph factor for transitioning between neon and normal connector
 * 0 = fully normal connector, 1 = fully neon connector
 * Uses smooth easing for professional look
 */
export function getConnectorMorphFactor(
    transitionProgress: number,
    isReturning: boolean,
    returnProgress: number // 0-1, how far into return animation
): number {
    if (isReturning) {
        // During return: smooth fade from neon to normal
        // Use ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(returnProgress, 3);
        return eased * 0.8; // Cap at 0.8 to start fading earlier
    }
    return transitionProgress;
}

/**
 * Gets the spin slowdown factor during return animation
 * Spin gradually slows down as player returns to normal
 */
export function getSpinSlowdownFactor(
    isReturning: boolean,
    returnProgress: number
): number {
    if (!isReturning) return 1;
    // Spin slows down as return progresses
    // Use quadratic ease-out for natural deceleration
    return Math.max(0, 1 - returnProgress * returnProgress);
}

/**
 * Creates end-of-dash burst particles (celebration effect)
 */
export function createDashEndBurst(
    centerX: number,
    centerY: number
): BurstParticle[] {
    const particles: BurstParticle[] = [];
    const particleCount = 16;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 6 + Math.random() * 4;
        particles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            size: 3 + Math.random() * 4,
            color: i % 3 === 0 ? '#00FFFF' : i % 3 === 1 ? '#FF00FF' : '#FFFFFF',
        });
    }
    
    return particles;
}
