/**
 * Enemy Death VFX System
 * 
 * Professional death animations for enemies including:
 * - Explosion effects with particle bursts
 * - Shatter effects with physics-based fragments
 * - Element-based death visuals (contrasts with game theme)
 * - Screen flash and shake integration
 */

import { getElementalConfig } from './elementalStyles';
import { getColor } from './themeSystem';

// Death particle interface
export interface DeathParticle {
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    type: 'explosion' | 'shard' | 'energy' | 'ring';
}

// Death VFX State
export interface EnemyDeathVFXState {
    particles: DeathParticle[];
    activeExplosions: ExplosionEffect[];
    shatterFragments: ShatterFragment[];
}

// Explosion effect
export interface ExplosionEffect {
    x: number;
    y: number;
    startTime: number;
    duration: number;
    maxRadius: number;
    color: string;
    secondaryColor: string;
    type: string; // elemental type
}

// Shatter fragment
export interface ShatterFragment {
    x: number;
    y: number;
    vx: number;
    vy: number;
    width: number;
    height: number;
    rotation: number;
    rotationSpeed: number;
    life: number;
    color: string;
    glowColor: string;
}

// Configuration - REDUCED for subtler effect
const DEATH_CONFIG = {
    EXPLOSION_DURATION: 300, // ms (faster)
    EXPLOSION_MAX_RADIUS: 40, // smaller radius
    PARTICLE_COUNT: 10, // fewer particles
    SHARD_COUNT: 5, // fewer shards
    RING_COUNT: 2,
};


/**
 * Create initial VFX state
 */
export function createDeathVFXState(): EnemyDeathVFXState {
    return {
        particles: new Array(100).fill(null).map(() => ({
            active: false,
            x: 0, y: 0,
            vx: 0, vy: 0,
            life: 0, maxLife: 1,
            size: 0,
            rotation: 0,
            rotationSpeed: 0,
            color: '#FFFFFF',
            type: 'explosion' as const,
        })),
        activeExplosions: [],
        shatterFragments: [],
    };
}

// Singleton state
let vfxState: EnemyDeathVFXState = createDeathVFXState();

/**
 * Get a color that contrasts with the current game palette
 * Ensures death effects are always visible against any background
 */
function getContrastingDeathColor(): { primary: string; secondary: string } {
    // Get current theme colors for background (the main game palette)
    const topBgColor = getColor('topBg');
    const bottomBgColor = getColor('bottomBg');

    // Calculate luminance to determine contrast color
    const hexToLum = (hex: string): number => {
        const cleanHex = hex.replace('#', '');
        const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
        const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
        const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
        return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    const avgLum = (hexToLum(topBgColor || '#000000') + hexToLum(bottomBgColor || '#FFFFFF')) / 2;

    // If theme is dark, use bright contrasting colors; if light, use darker accent
    if (avgLum < 0.5) {
        // Dark theme - use bright cyan/magenta for visibility
        return { primary: '#00FFFF', secondary: '#FF00FF' };
    } else {
        // Light theme - use deep red/orange for visibility
        return { primary: '#FF3333', secondary: '#FF6600' };
    }
}

/**
 * Trigger death explosion at position
 * Uses theme-contrasting colors for visibility
 */
export function triggerDeathExplosion(
    x: number,
    y: number,
    elementType: string = 'normal'
): void {
    const config = getElementalConfig(elementType);
    const contrastColors = getContrastingDeathColor();

    // Mix element color with contrast color for balanced visibility
    const blendedPrimary = config.color;
    const blendedSecondary = contrastColors.secondary;

    // Add explosion ring effect
    vfxState.activeExplosions.push({
        x,
        y,
        startTime: Date.now(),
        duration: DEATH_CONFIG.EXPLOSION_DURATION,
        maxRadius: DEATH_CONFIG.EXPLOSION_MAX_RADIUS,
        color: blendedPrimary,
        secondaryColor: blendedSecondary,
        type: elementType,
    });

    // Emit explosion particles
    emitExplosionParticles(x, y, elementType, DEATH_CONFIG.PARTICLE_COUNT);

    // Create shatter fragments
    createShatterFragments(x, y, elementType, DEATH_CONFIG.SHARD_COUNT);
}


/**
 * Emit radial explosion particles
 */
function emitExplosionParticles(
    x: number,
    y: number,
    elementType: string,
    count: number
): void {
    const config = getElementalConfig(elementType);

    for (let i = 0; i < count; i++) {
        const particle = vfxState.particles.find(p => !p.active);
        if (!particle) continue;

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
        const speed = 3 + Math.random() * 5;

        particle.active = true;
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.life = 1.0;
        particle.maxLife = 1.0;
        particle.size = 3 + Math.random() * 6;
        particle.rotation = Math.random() * Math.PI * 2;
        particle.rotationSpeed = (Math.random() - 0.5) * 0.3;
        particle.color = Math.random() > 0.5 ? config.color : config.secondaryColor;
        particle.type = Math.random() > 0.7 ? 'energy' : 'explosion';
    }
}

/**
 * Create shatter fragments
 */
function createShatterFragments(
    x: number,
    y: number,
    elementType: string,
    count: number
): void {
    const config = getElementalConfig(elementType);

    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const speed = 2 + Math.random() * 4;

        vfxState.shatterFragments.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2, // Initial upward velocity
            width: 8 + Math.random() * 12,
            height: 4 + Math.random() * 8,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.4,
            life: 1.0,
            color: config.color,
            glowColor: config.secondaryColor,
        });
    }
}

/**
 * Update all death VFX
 */
export function updateDeathVFX(deltaTime: number = 16): void {
    const dt = deltaTime / 16; // Normalize to 60fps

    // Update particles
    vfxState.particles.forEach(p => {
        if (!p.active) return;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96; // Friction
        p.vy *= 0.96;
        p.vy += 0.1 * dt; // Gravity
        p.rotation += p.rotationSpeed;
        p.life -= 0.02 * dt;

        if (p.life <= 0) {
            p.active = false;
        }
    });

    // Update explosions (remove completed)
    const now = Date.now();
    vfxState.activeExplosions = vfxState.activeExplosions.filter(
        e => now - e.startTime < e.duration
    );

    // Update shatter fragments
    vfxState.shatterFragments = vfxState.shatterFragments.filter(f => {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 0.15 * dt; // Gravity
        f.rotation += f.rotationSpeed;
        f.life -= 0.015 * dt;

        return f.life > 0;
    });
}

/**
 * Draw all death VFX
 */
export function drawDeathVFX(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // Draw explosion rings
    vfxState.activeExplosions.forEach(explosion => {
        drawExplosionRing(ctx, explosion);
    });

    // Draw shatter fragments
    vfxState.shatterFragments.forEach(fragment => {
        drawShatterFragment(ctx, fragment);
    });

    // Draw particles
    vfxState.particles.forEach(p => {
        if (!p.active) return;
        drawDeathParticle(ctx, p);
    });

    ctx.restore();
}

/**
 * Draw explosion ring effect
 */
function drawExplosionRing(
    ctx: CanvasRenderingContext2D,
    explosion: ExplosionEffect
): void {
    const progress = (Date.now() - explosion.startTime) / explosion.duration;
    const radius = explosion.maxRadius * progress;
    const alpha = 1 - progress;

    ctx.save();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = explosion.color;
    ctx.lineWidth = 4 * (1 - progress);
    ctx.shadowColor = explosion.color;
    ctx.shadowBlur = 20 * alpha;
    ctx.globalAlpha = alpha * 0.8;
    ctx.stroke();

    // Inner flash
    if (progress < 0.3) {
        const flashAlpha = (0.3 - progress) / 0.3;
        const gradient = ctx.createRadialGradient(
            explosion.x, explosion.y, 0,
            explosion.x, explosion.y, radius * 0.8
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
        gradient.addColorStop(0.5, explosion.secondaryColor);
        gradient.addColorStop(1, 'transparent');

        ctx.globalAlpha = flashAlpha * 0.6;
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // Secondary ring (delayed)
    if (progress > 0.2 && progress < 0.8) {
        const secondProgress = (progress - 0.2) / 0.6;
        const secondRadius = explosion.maxRadius * 0.6 * secondProgress;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, secondRadius, 0, Math.PI * 2);
        ctx.strokeStyle = explosion.secondaryColor;
        ctx.lineWidth = 2 * (1 - secondProgress);
        ctx.globalAlpha = (1 - secondProgress) * 0.6;
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Draw shatter fragment
 */
function drawShatterFragment(
    ctx: CanvasRenderingContext2D,
    fragment: ShatterFragment
): void {
    ctx.save();
    ctx.translate(fragment.x, fragment.y);
    ctx.rotate(fragment.rotation);
    ctx.globalAlpha = fragment.life;

    // Glow effect
    ctx.shadowColor = fragment.glowColor;
    ctx.shadowBlur = 10 * fragment.life;

    // Fragment shape (irregular polygon)
    ctx.beginPath();
    ctx.moveTo(-fragment.width / 2, -fragment.height / 2);
    ctx.lineTo(fragment.width / 2 * 0.8, -fragment.height / 2 * 0.6);
    ctx.lineTo(fragment.width / 2, fragment.height / 2 * 0.7);
    ctx.lineTo(-fragment.width / 2 * 0.7, fragment.height / 2);
    ctx.closePath();

    // Fill with gradient
    const gradient = ctx.createLinearGradient(
        -fragment.width / 2, 0, fragment.width / 2, 0
    );
    gradient.addColorStop(0, fragment.color);
    gradient.addColorStop(1, fragment.glowColor);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Edge highlight
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.globalAlpha = fragment.life * 0.5;
    ctx.stroke();

    ctx.restore();
}

/**
 * Draw death particle
 */
function drawDeathParticle(
    ctx: CanvasRenderingContext2D,
    particle: DeathParticle
): void {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.globalAlpha = particle.life;

    // Glow
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 8 * particle.life;
    ctx.fillStyle = particle.color;

    if (particle.type === 'energy') {
        // Energy spark (diamond shape)
        ctx.beginPath();
        ctx.moveTo(0, -particle.size);
        ctx.lineTo(particle.size * 0.6, 0);
        ctx.lineTo(0, particle.size);
        ctx.lineTo(-particle.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
    } else if (particle.type === 'shard') {
        // Sharp shard
        ctx.beginPath();
        ctx.moveTo(-particle.size / 2, -particle.size / 2);
        ctx.lineTo(particle.size / 2, 0);
        ctx.lineTo(-particle.size / 2, particle.size / 2);
        ctx.closePath();
        ctx.fill();
    } else {
        // Standard circle particle
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Reset all VFX state
 */
export function resetDeathVFX(): void {
    vfxState = createDeathVFXState();
}

/**
 * Check if any death VFX are active
 */
export function hasActiveDeathVFX(): boolean {
    return (
        vfxState.activeExplosions.length > 0 ||
        vfxState.shatterFragments.length > 0 ||
        vfxState.particles.some(p => p.active)
    );
}

/**
 * Emit counter-attack projectile effect
 * Creates a beam from orb to enemy position
 */
export function emitCounterAttackBeam(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    elementType: string
): void {
    const config = getElementalConfig(elementType);

    // Create particles along the beam path
    const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
    const particleCount = Math.min(15, Math.floor(distance / 20));

    for (let i = 0; i <= particleCount; i++) {
        const t = i / particleCount;
        const x = startX + (endX - startX) * t;
        const y = startY + (endY - startY) * t;

        const particle = vfxState.particles.find(p => !p.active);
        if (!particle) continue;

        // Offset perpendicular to beam direction
        const angle = Math.atan2(endY - startY, endX - startX);
        const perpOffset = (Math.random() - 0.5) * 10;

        particle.active = true;
        particle.x = x + Math.sin(angle) * perpOffset;
        particle.y = y - Math.cos(angle) * perpOffset;
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = (Math.random() - 0.5) * 2;
        particle.life = 0.5 + (1 - t) * 0.5; // Fade from start
        particle.maxLife = 1.0;
        particle.size = 2 + Math.random() * 4;
        particle.rotation = angle;
        particle.rotationSpeed = (Math.random() - 0.5) * 0.2;
        particle.color = config.color;
        particle.type = 'energy';
    }
}

// =============================================================================
// KNOCKBACK VFX SYSTEM
// Visual effects for when enemy is pushed back
// =============================================================================

interface KnockbackEffect {
    x: number;
    y: number;
    startTime: number;
    duration: number;
    startX: number;
    targetX: number;
    color: string;
}

let activeKnockbackEffects: KnockbackEffect[] = [];

/**
 * Trigger knockback visual effects
 * Creates impact flash, speed lines, and particles
 */
export function triggerKnockbackVFX(
    x: number,
    y: number,
    targetX: number,
    elementType: string = 'normal'
): void {
    const config = getElementalConfig(elementType);

    // Add knockback effect
    activeKnockbackEffects.push({
        x,
        y,
        startTime: Date.now(),
        duration: 400, // 400ms animation
        startX: x,
        targetX,
        color: config.color,
    });

    // Emit impact particles (burst to the right)
    for (let i = 0; i < 8; i++) {
        const particle = vfxState.particles.find(p => !p.active);
        if (!particle) continue;

        const angle = (Math.random() * 0.6 - 0.3) + Math.PI; // Spread to the right
        const speed = 3 + Math.random() * 5;

        particle.active = true;
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.life = 0.4 + Math.random() * 0.3;
        particle.maxLife = 0.7;
        particle.size = 3 + Math.random() * 4;
        particle.rotation = angle;
        particle.rotationSpeed = (Math.random() - 0.5) * 0.5;
        particle.color = config.color;
        particle.type = 'energy';
    }
}

/**
 * Draw knockback VFX - speed lines and impact flash
 */
export function drawKnockbackVFX(ctx: CanvasRenderingContext2D): void {
    const now = Date.now();

    activeKnockbackEffects = activeKnockbackEffects.filter(effect => {
        const elapsed = now - effect.startTime;
        const progress = elapsed / effect.duration;

        if (progress >= 1) return false;

        const alpha = 1 - progress;

        ctx.save();

        // Impact flash circle
        const flashRadius = 20 + progress * 30;
        const flashGradient = ctx.createRadialGradient(
            effect.x, effect.y, 0,
            effect.x, effect.y, flashRadius
        );
        flashGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`);
        flashGradient.addColorStop(0.5, `${effect.color}${Math.floor(alpha * 128).toString(16).padStart(2, '0')}`);
        flashGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = flashGradient;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, flashRadius, 0, Math.PI * 2);
        ctx.fill();

        // Speed lines (pointing right - direction of push)
        ctx.strokeStyle = effect.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        const lineCount = 5;
        for (let i = 0; i < lineCount; i++) {
            const yOffset = (i - lineCount / 2) * 8;
            const lineLength = 30 + progress * 50;
            const lineStartX = effect.x + progress * 20;

            ctx.beginPath();
            ctx.moveTo(lineStartX, effect.y + yOffset);
            ctx.lineTo(lineStartX + lineLength, effect.y + yOffset);
            ctx.stroke();
        }

        // Shockwave ring
        if (progress < 0.5) {
            const ringProgress = progress * 2;
            const ringRadius = 15 + ringProgress * 40;
            ctx.strokeStyle = effect.color;
            ctx.globalAlpha = (1 - ringProgress) * 0.6;
            ctx.lineWidth = 3 - ringProgress * 2;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        return true;
    });
}
