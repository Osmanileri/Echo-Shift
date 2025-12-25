/**
 * UIRenderer
 * 
 * Handles rendering of UI elements during gameplay:
 * - Score popups
 * - Visual effects (glow, flash)
 * - Resonance mode indicators
 * - Mode-specific UI (SHIFT Overdrive, etc.)
 * 
 * This module extracts ~100 lines of UI drawing from GameEngine loop.
 * 
 * @module render/UIRenderer
 */

import * as ResonanceSystem from '../../../systems/resonanceSystem';
import type { ScorePopup, VisualEffect } from '../../../types';

// =============================================================================
// Types
// =============================================================================

export interface UIRenderContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
}

// =============================================================================
// Rendering Functions
// =============================================================================

/**
 * Render score popups (floating text showing points earned)
 */
export function renderScorePopups(
    ctx: CanvasRenderingContext2D,
    popups: ScorePopup[]
): void {
    popups.forEach((popup) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, popup.life);
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = popup.color;
        ctx.textAlign = 'center';
        ctx.shadowColor = popup.color;
        ctx.shadowBlur = 10;
        ctx.fillText(popup.text, popup.x, popup.y);
        ctx.restore();
    });
}

/**
 * Render visual effects (glow, flash, etc.)
 */
export function renderVisualEffects(
    ctx: CanvasRenderingContext2D,
    effects: VisualEffect[]
): void {
    effects.forEach((effect) => {
        ctx.save();
        ctx.globalAlpha = effect.life * 0.5;

        if (effect.type === 'glow') {
            // Expanding glow effect
            const gradient = ctx.createRadialGradient(
                effect.x, effect.y, 0,
                effect.x, effect.y, effect.scale * 30
            );
            gradient.addColorStop(0, effect.color);
            gradient.addColorStop(0.5, effect.color + '80');
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, effect.scale * 30, 0, Math.PI * 2);
            ctx.fill();
        } else if (effect.type === 'flash') {
            // Screen flash effect
            ctx.fillStyle = effect.color;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        ctx.restore();
    });
}

/**
 * Render Resonance mode timer and indicator
 */
export function renderResonanceIndicator(
    ctx: CanvasRenderingContext2D,
    width: number,
    resonanceState: ResonanceSystem.ResonanceState
): void {
    if (!resonanceState.isActive) return;

    const remainingSeconds = Math.ceil(resonanceState.remainingTime / 1000);
    const timerProgress = resonanceState.remainingTime / ResonanceSystem.RESONANCE_CONFIG.duration;

    // Progress bar at top
    const barWidth = 200;
    const barHeight = 8;
    const barX = (width - barWidth) / 2;
    const barY = 50;

    // Background bar
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress bar with cyan glow
    ctx.shadowColor = '#00F0FF';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00F0FF';
    ctx.fillRect(barX, barY, barWidth * timerProgress, barHeight);
    ctx.shadowBlur = 0;

    // Timer text
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#00F0FF';
    ctx.textAlign = 'center';
    ctx.fillText(
        `⚡ HARMONIC RESONANCE ⚡ ${remainingSeconds}s`,
        width / 2,
        barY - 10
    );

    // Destroyed count
    if (resonanceState.obstaclesDestroyed > 0) {
        ctx.font = 'bold 12px Arial';
        ctx.fillText(
            `💥 ${resonanceState.obstaclesDestroyed} destroyed (+${resonanceState.bonusScore})`,
            width / 2,
            barY + 25
        );
    }
}

/**
 * Render SHIFT Overdrive indicator
 */
export function renderOverdriveIndicator(
    ctx: CanvasRenderingContext2D,
    width: number,
    isActive: boolean,
    timer: number,
    maxDuration: number
): void {
    if (!isActive) return;

    const progress = timer / maxDuration;
    const barWidth = 180;
    const barHeight = 6;
    const barX = (width - barWidth) / 2;
    const barY = 110;

    // Background
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress with gold glow
    const goldColor = '#FFD700';
    ctx.shadowColor = goldColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = goldColor;
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    ctx.shadowBlur = 0;

    // Label
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = goldColor;
    ctx.textAlign = 'center';
    ctx.fillText('⚡ S.H.I.F.T. OVERDRIVE ⚡', width / 2, barY - 8);
}

/**
 * Render slow motion indicator
 */
export function renderSlowMotionIndicator(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isActive: boolean,
    remainingUses: number
): void {
    if (!isActive) return;

    // Vignette effect
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, height * 0.8
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, 'rgba(0, 100, 255, 0.15)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Indicator text
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#66CCFF';
    ctx.textAlign = 'center';
    ctx.fillText(`⏱ SLOW MOTION (${remainingUses} left)`, width / 2, 130);
}

/**
 * Render shield indicator
 */
export function renderShieldIndicator(
    ctx: CanvasRenderingContext2D,
    width: number,
    shieldCharges: number,
    isInvincible: boolean
): void {
    if (shieldCharges <= 0 && !isInvincible) return;

    // Shield icon and count
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = isInvincible ? '#00FF00' : '#AAAAAA';
    ctx.textAlign = 'left';
    ctx.fillText(`🛡️ x${shieldCharges}`, 20, 30);

    if (isInvincible) {
        ctx.fillStyle = '#00FF00';
        ctx.fillText(' (ACTIVE)', 70, 30);
    }
}

/**
 * Main UI render function
 */
export function renderUI(
    context: UIRenderContext,
    scorePopups: ScorePopup[],
    visualEffects: VisualEffect[],
    resonanceState: ResonanceSystem.ResonanceState
): void {
    const { ctx, width } = context;

    renderScorePopups(ctx, scorePopups);
    renderVisualEffects(ctx, visualEffects);
    renderResonanceIndicator(ctx, width, resonanceState);
}
