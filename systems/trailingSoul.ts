/**
 * Trailing Soul System - Spirit of the Resonance
 * 
 * Creates afterimage/echo effects that follow orbs based on velocity.
 * The faster the orb moves, the more echoes appear behind it.
 * 
 * Features:
 * - Velocity-based echo generation
 * - Fading and shrinking over time
 * - LOD (Level of Detail) for performance optimization
 */

import { getElementalConfig } from './elementalStyles';

/**
 * Individual trail point representing one echo position
 */
export interface TrailPoint {
    x: number;
    y: number;
    alpha: number;      // 0-1, fades over time
    scale: number;      // 0-1, shrinks over time
    timestamp: number;  // When this point was created
}

/**
 * Trail state for a single orb
 */
export interface TrailState {
    points: TrailPoint[];
    lastEmitTime: number;
}

/**
 * Configuration for trail rendering
 */
export interface TrailConfig {
    maxPoints: number;          // Maximum trail points to maintain
    velocityThreshold: number;  // Min velocity to emit trail
    emitInterval: number;       // Ms between emissions
    fadeRate: number;           // Alpha decrease per frame
    shrinkRate: number;         // Scale decrease per frame
    lodThreshold: number;       // Reduce quality when > this many particles on screen
}

/**
 * Default trail configuration optimized for mobile
 */
export const DEFAULT_TRAIL_CONFIG: TrailConfig = {
    maxPoints: 12,
    velocityThreshold: 2,
    emitInterval: 16, // ~60fps
    fadeRate: 0.05,
    shrinkRate: 0.03,
    lodThreshold: 100, // Start reducing quality at 100+ particles
};

/**
 * Create initial empty trail state
 */
export const createTrailState = (): TrailState => ({
    points: [],
    lastEmitTime: 0,
});

/**
 * Update trail state with new position based on velocity
 * Higher velocity = more frequent emissions
 */
export const updateTrail = (
    state: TrailState,
    x: number,
    y: number,
    velocityY: number,
    config: TrailConfig = DEFAULT_TRAIL_CONFIG,
    currentTime: number = Date.now()
): TrailState => {
    const absVelocity = Math.abs(velocityY);
    const newPoints = [...state.points];

    // Only emit if velocity exceeds threshold
    if (absVelocity > config.velocityThreshold) {
        // Adjust emit rate based on velocity (faster = more frequent)
        const adjustedInterval = config.emitInterval / (1 + absVelocity * 0.1);

        if (currentTime - state.lastEmitTime >= adjustedInterval) {
            // Add new point at start of array (newest first)
            newPoints.unshift({
                x,
                y,
                alpha: Math.min(0.6 + absVelocity * 0.02, 0.9), // Higher velocity = more opaque
                scale: 1.0,
                timestamp: currentTime,
            });

            state.lastEmitTime = currentTime;
        }
    }

    // Update existing points (fade and shrink)
    const updatedPoints = newPoints
        .map(point => ({
            ...point,
            alpha: point.alpha - config.fadeRate,
            scale: Math.max(0.3, point.scale - config.shrinkRate),
        }))
        .filter(point => point.alpha > 0) // Remove fully faded points
        .slice(0, config.maxPoints); // Limit max points

    return {
        points: updatedPoints,
        lastEmitTime: state.lastEmitTime,
    };
};

/**
 * Render trailing soul echoes behind an orb
 * Uses additive blending for neon glow effect
 */
export const renderTrailingSoul = (
    ctx: CanvasRenderingContext2D,
    trail: TrailState,
    image: HTMLImageElement | null,
    orbRadius: number,
    elementType: string,
    orbColor: string
): void => {
    if (trail.points.length === 0) return;

    const style = getElementalConfig(elementType);

    ctx.save();

    // Use additive blending for neon glow effect
    ctx.globalCompositeOperation = 'lighter';

    // Render points from oldest to newest (back to front)
    const reversedPoints = [...trail.points].reverse();

    reversedPoints.forEach((point, index) => {
        const progress = index / Math.max(1, reversedPoints.length - 1);

        ctx.save();
        ctx.globalAlpha = point.alpha * 0.6;

        // Draw echo orb (smaller and faded)
        const echoRadius = orbRadius * point.scale * (0.6 + progress * 0.3);

        // Outer glow
        ctx.shadowColor = style.glowColor;
        ctx.shadowBlur = 15 * point.alpha;

        // Draw orb silhouette
        ctx.beginPath();
        ctx.arc(point.x, point.y, echoRadius, 0, Math.PI * 2);
        ctx.fillStyle = orbColor;
        ctx.fill();

        // Draw Pokemon silhouette if image available
        if (image && image.complete && image.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(point.x, point.y, Math.max(0, echoRadius - 2), 0, Math.PI * 2);
            ctx.clip();

            const imgSize = echoRadius * 2 * 0.9;
            ctx.globalAlpha = point.alpha * 0.4;
            ctx.drawImage(
                image,
                point.x - imgSize / 2,
                point.y - imgSize / 2,
                imgSize,
                imgSize
            );
            ctx.restore();
        }

        ctx.restore();
    });

    ctx.restore();
};

/**
 * Calculate LOD (Level of Detail) reduction factor
 * Returns a multiplier (0.5-1.0) for maxPoints based on total particle count
 */
export const calculateLOD = (
    totalParticleCount: number,
    config: TrailConfig = DEFAULT_TRAIL_CONFIG
): number => {
    if (totalParticleCount <= config.lodThreshold) {
        return 1.0;
    }

    // Reduce quality proportionally as particle count increases
    const excess = totalParticleCount - config.lodThreshold;
    const reduction = Math.min(0.5, excess / (config.lodThreshold * 2));

    return Math.max(0.5, 1.0 - reduction);
};

/**
 * Get adjusted config based on current particle count (LOD)
 */
export const getAdjustedTrailConfig = (
    totalParticleCount: number,
    baseConfig: TrailConfig = DEFAULT_TRAIL_CONFIG
): TrailConfig => {
    const lodFactor = calculateLOD(totalParticleCount, baseConfig);

    return {
        ...baseConfig,
        maxPoints: Math.floor(baseConfig.maxPoints * lodFactor),
        fadeRate: baseConfig.fadeRate / lodFactor, // Faster fade at lower LOD
    };
};

/**
 * Reset trail state (clear all points)
 */
export const resetTrail = (): TrailState => createTrailState();
