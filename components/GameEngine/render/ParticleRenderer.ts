/**
 * ParticleRenderer
 * 
 * Handles rendering of particle effects:
 * - Legacy particles (from GameEngine)
 * - Zen Mode intensity adjustments
 * - Spirit character trail particles
 * 
 * This module extracts ~50 lines of particle drawing from GameEngine loop.
 * 
 * @module render/ParticleRenderer
 */

import * as ParticleSystem from '../../../systems/particleSystem';
import * as ZenMode from '../../../systems/zenMode';
import type { Particle } from '../../../types';

// =============================================================================
// Types
// =============================================================================

export interface ParticleRenderContext {
    ctx: CanvasRenderingContext2D;
    zenModeEnabled: boolean;
    zenModeState: ZenMode.ZenModeState;
    hasActiveCharacter: boolean;
}

// =============================================================================
// Rendering Functions
// =============================================================================

/**
 * Render the main ParticleSystem particles
 * Only renders if a character is equipped (spirit particles)
 */
export function renderSystemParticles(
    ctx: CanvasRenderingContext2D,
    visualIntensity: number,
    hasActiveCharacter: boolean
): void {
    ctx.save();
    ctx.globalAlpha = visualIntensity;

    if (hasActiveCharacter) {
        ParticleSystem.render(ctx);
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
}

/**
 * Render legacy particles (sparkle effects, etc.)
 */
export function renderLegacyParticles(
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    visualIntensity: number
): void {
    ctx.save();

    particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.life * visualIntensity;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * p.life;

        const size = (2 + p.life * 4) * (0.8 + Math.random() * 0.4);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.5, p.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    ctx.restore();
}

/**
 * Get visual intensity multiplier based on Zen Mode
 */
export function getVisualIntensity(
    zenModeEnabled: boolean,
    zenModeState: ZenMode.ZenModeState
): number {
    return zenModeEnabled
        ? ZenMode.getVisualIntensity(zenModeState)
        : 1.0;
}

/**
 * Main particle render function
 */
export function renderParticles(
    context: ParticleRenderContext,
    legacyParticles: Particle[]
): void {
    const { ctx, zenModeEnabled, zenModeState, hasActiveCharacter } = context;

    const visualIntensity = getVisualIntensity(zenModeEnabled, zenModeState);

    // Render system particles (spirit trails, etc.)
    renderSystemParticles(ctx, visualIntensity, hasActiveCharacter);

    // Render legacy particles
    renderLegacyParticles(ctx, legacyParticles, visualIntensity);
}
