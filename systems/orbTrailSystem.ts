/**
 * Orb Trail System
 * Skins now create animated trail effects behind orbs instead of changing orb colors.
 * This ensures orbs remain visible with theme colors while skins add visual flair.
 */


/**
 * Trail particle interface
 */
interface TrailParticle {
    x: number;
    y: number;
    age: number; // 0 to 1 (0 = new, 1 = expired)
    size: number;
    color: string;
    alpha: number;
}

/**
 * Trail configuration based on skin type
 */
export interface TrailConfig {
    enabled: boolean;
    color: string;
    secondaryColor?: string;
    particleCount: number; // particles per frame
    particleLifetime: number; // seconds
    particleSize: number; // base size
    glowIntensity: number; // 0-1
    style: 'solid' | 'gradient' | 'sparkle' | 'fire' | 'ice';
}

/**
 * Default trail config (no trail for classic skin)
 */
export const DEFAULT_TRAIL_CONFIG: TrailConfig = {
    enabled: false,
    color: '#FFFFFF',
    particleCount: 0,
    particleLifetime: 0,
    particleSize: 0,
    glowIntensity: 0,
    style: 'solid',
};

/**
 * Skin ID to trail config mapping
 */
export const SKIN_TRAIL_CONFIGS: Record<string, TrailConfig> = {
    'default': {
        enabled: false,
        color: '#FFFFFF',
        particleCount: 0,
        particleLifetime: 0,
        particleSize: 0,
        glowIntensity: 0,
        style: 'solid',
    },
    'neon-blue': {
        enabled: true,
        color: '#00F0FF',
        secondaryColor: '#0066FF',
        particleCount: 3,
        particleLifetime: 0.4,
        particleSize: 4,
        glowIntensity: 0.8,
        style: 'gradient',
    },
    'neon-pink': {
        enabled: true,
        color: '#FF00FF',
        secondaryColor: '#FF0066',
        particleCount: 3,
        particleLifetime: 0.4,
        particleSize: 4,
        glowIntensity: 0.8,
        style: 'gradient',
    },
    'fire': {
        enabled: true,
        color: '#FF6600',
        secondaryColor: '#FF0000',
        particleCount: 4,
        particleLifetime: 0.5,
        particleSize: 5,
        glowIntensity: 1.0,
        style: 'fire',
    },
    'ice': {
        enabled: true,
        color: '#00FFFF',
        secondaryColor: '#0099FF',
        particleCount: 3,
        particleLifetime: 0.5,
        particleSize: 4,
        glowIntensity: 0.7,
        style: 'ice',
    },
    'emoji-star': {
        enabled: true,
        color: '#FFD700',
        secondaryColor: '#FFA500',
        particleCount: 2,
        particleLifetime: 0.3,
        particleSize: 3,
        glowIntensity: 0.6,
        style: 'sparkle',
    },
    'emoji-heart': {
        enabled: true,
        color: '#FF1493',
        secondaryColor: '#FF69B4',
        particleCount: 2,
        particleLifetime: 0.3,
        particleSize: 3,
        glowIntensity: 0.6,
        style: 'sparkle',
    },
};

/**
 * Active trail particles for each orb
 */
let topOrbTrail: TrailParticle[] = [];
let bottomOrbTrail: TrailParticle[] = [];

/**
 * Get trail config for a skin
 */
export function getTrailConfig(skinId: string): TrailConfig {
    return SKIN_TRAIL_CONFIGS[skinId] || DEFAULT_TRAIL_CONFIG;
}

/**
 * Emit trail particles from orb position
 */
export function emitTrail(
    x: number,
    y: number,
    isTopOrb: boolean,
    config: TrailConfig
): void {
    if (!config.enabled) return;

    const trail = isTopOrb ? topOrbTrail : bottomOrbTrail;

    for (let i = 0; i < config.particleCount; i++) {
        // Add slight randomness to position
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetY = (Math.random() - 0.5) * 8;

        // Random color between primary and secondary
        let color = config.color;
        if (config.secondaryColor && Math.random() > 0.5) {
            color = config.secondaryColor;
        }

        trail.push({
            x: x + offsetX,
            y: y + offsetY,
            age: 0,
            size: config.particleSize * (0.8 + Math.random() * 0.4),
            color,
            alpha: 1,
        });
    }

    // Limit trail length
    const maxParticles = 50;
    if (trail.length > maxParticles) {
        if (isTopOrb) {
            topOrbTrail = trail.slice(-maxParticles);
        } else {
            bottomOrbTrail = trail.slice(-maxParticles);
        }
    }
}

/**
 * Update trail particles (call each frame)
 */
export function updateTrails(deltaTime: number, config: TrailConfig): void {
    if (!config.enabled || config.particleLifetime <= 0) return;

    const ageIncrement = deltaTime / config.particleLifetime;

    // Update top orb trail
    topOrbTrail = topOrbTrail.filter(p => {
        p.age += ageIncrement;
        p.alpha = 1 - p.age;
        p.size *= 0.98; // Shrink over time
        return p.age < 1;
    });

    // Update bottom orb trail
    bottomOrbTrail = bottomOrbTrail.filter(p => {
        p.age += ageIncrement;
        p.alpha = 1 - p.age;
        p.size *= 0.98;
        return p.age < 1;
    });
}

/**
 * Render trail particles
 */
export function renderTrails(
    ctx: CanvasRenderingContext2D,
    config: TrailConfig
): void {
    if (!config.enabled) return;

    ctx.save();

    // Apply glow effect
    if (config.glowIntensity > 0) {
        ctx.shadowBlur = 10 * config.glowIntensity;
    }

    // Render all particles
    [...topOrbTrail, ...bottomOrbTrail].forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.globalAlpha = particle.alpha * 0.8;
        ctx.shadowColor = particle.color;
        ctx.fillStyle = particle.color;

        // Special rendering for different styles
        if (config.style === 'sparkle') {
            // Star-like sparkle
            ctx.globalAlpha = particle.alpha * (0.5 + Math.random() * 0.5);
        } else if (config.style === 'fire') {
            // Upward drift for fire
            particle.y -= 0.5;
        } else if (config.style === 'ice') {
            // Slight downward drift for ice
            particle.y += 0.2;
        }

        ctx.fill();
    });

    ctx.restore();
}

/**
 * Reset all trails
 */
export function resetTrails(): void {
    topOrbTrail = [];
    bottomOrbTrail = [];
}
