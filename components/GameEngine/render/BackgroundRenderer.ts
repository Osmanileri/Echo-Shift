/**
 * BackgroundRenderer
 * 
 * Handles rendering of background elements:
 * - Zone backgrounds (top/bottom with gradients)
 * - Midline with tension effects
 * - Grid lines (Cyberpunk theme)
 * - Soft gradients (Zen theme)
 * - Critical space warning overlay
 * - Forecasting hints
 * 
 * This module extracts ~200 lines of background drawing from GameEngine loop.
 * 
 * @module render/BackgroundRenderer
 */

import * as ResonanceSystem from '../../../systems/resonanceSystem';
import { getColor, hasEffect } from '../../../systems/themeSystem';
import type { GravityState, MidlineState } from '../../../types';
import { MIDLINE_CONFIG, predictPeakTime } from '../../../utils/midlineSystem';

// =============================================================================
// Types
// =============================================================================

export interface BackgroundRenderContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    midlineY: number;
    elapsedTime: number;
    currentFrequency: number;
}

export interface BackgroundRenderState {
    gravityState: GravityState;
    midlineState: MidlineState;
    resonanceState: ResonanceSystem.ResonanceState;
    tensionIntensity: number;
    isCritical: boolean;
    zenModeEnabled: boolean;
}

// =============================================================================
// Rendering Functions
// =============================================================================

/**
 * Render the zone backgrounds (top and bottom areas)
 */
export function renderZoneBackgrounds(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    midlineY: number,
    gravityFlipped: boolean,
    resonanceState: ResonanceSystem.ResonanceState
): void {
    // Get base colors from theme, swap if gravity is flipped
    let topBgColor = gravityFlipped ? getColor('bottomBg') : getColor('topBg');
    let bottomBgColor = gravityFlipped ? getColor('topBg') : getColor('bottomBg');

    // Resonance Mode: Apply color inversion during transition
    const resonanceInversion = ResonanceSystem.getColorInversion(resonanceState);
    if (resonanceInversion.factor > 0) {
        const invertedTop = ResonanceSystem.invertColor(topBgColor);
        const invertedBottom = ResonanceSystem.invertColor(bottomBgColor);
        topBgColor = ResonanceSystem.interpolateColor(topBgColor, invertedTop, resonanceInversion.factor);
        bottomBgColor = ResonanceSystem.interpolateColor(bottomBgColor, invertedBottom, resonanceInversion.factor);
    }

    // Draw top zone
    ctx.fillStyle = topBgColor;
    ctx.fillRect(0, 0, width, midlineY);

    // Draw bottom zone
    ctx.fillStyle = bottomBgColor;
    ctx.fillRect(0, midlineY, width, height - midlineY);
}

/**
 * Render the midline (horizon line) with tension effects
 */
export function renderMidline(
    ctx: CanvasRenderingContext2D,
    width: number,
    midlineY: number,
    tensionIntensity: number,
    isAtPeak: boolean
): void {
    const accentColor = getColor('accent');

    ctx.beginPath();
    ctx.moveTo(0, midlineY);
    ctx.lineTo(width, midlineY);

    if (tensionIntensity > 0.1) {
        // Tension effect - line thickens and changes color
        const tensionColor = tensionIntensity > 0.7 ? '#FF4444'
            : tensionIntensity > 0.4 ? '#FFAA00'
                : accentColor;
        const lineWidth = 2 + tensionIntensity * 6;

        // Shake effect when tension is high
        const shake = tensionIntensity > 0.5
            ? Math.sin(Date.now() * 0.05) * tensionIntensity * 3
            : 0;

        ctx.strokeStyle = tensionColor;
        ctx.lineWidth = lineWidth;
        ctx.shadowColor = tensionColor;
        ctx.shadowBlur = 10 + tensionIntensity * 20;

        // Draw shaking line
        ctx.beginPath();
        ctx.moveTo(0, midlineY + shake);
        ctx.lineTo(width, midlineY + shake);
        ctx.stroke();

        // Additional glow layer
        ctx.globalAlpha = tensionIntensity * 0.3;
        ctx.lineWidth = lineWidth * 2;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    } else if (isAtPeak) {
        // Accent highlight when at peak/trough
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 10;
        ctx.stroke();
    } else {
        // Normal midline
        ctx.strokeStyle = getColor('connector');
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
    }

    ctx.shadowBlur = 0; // Reset shadow
}

/**
 * Render theme-specific effects
 */
export function renderThemeEffects(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
): void {
    // Cyberpunk grid lines
    if (hasEffect('gridLines')) {
        ctx.strokeStyle = getColor('accent') + '20'; // 20% opacity
        ctx.lineWidth = 1;
        const gridSize = 40;

        // Vertical lines
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    // Zen soft gradients
    if (hasEffect('softGradients')) {
        const zenGradient = ctx.createLinearGradient(0, 0, 0, height);
        zenGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        zenGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        zenGradient.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
        ctx.fillStyle = zenGradient;
        ctx.fillRect(0, 0, width, height);
    }
}

/**
 * Render critical space warning overlay
 */
export function renderCriticalWarning(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    isCritical: boolean
): void {
    if (!isCritical) return;

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#FF6600'; // Orange warning tint
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1.0;

    // Warning text
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#FF6600';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ CRITICAL SPACE', width / 2, 100);
}

/**
 * Render forecasting hint (directional shadow)
 */
export function renderForecastHint(
    ctx: CanvasRenderingContext2D,
    width: number,
    midlineY: number,
    elapsedTime: number,
    currentFrequency: number
): void {
    const peakPrediction = predictPeakTime(elapsedTime, currentFrequency);

    if (peakPrediction.timeToNextPeak < MIDLINE_CONFIG.forecastTime) {
        const forecastAlpha = 1 - peakPrediction.timeToNextPeak / MIDLINE_CONFIG.forecastTime;
        const forecastOffset = peakPrediction.direction === 'down' ? 15 : -15;

        ctx.globalAlpha = forecastAlpha * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, midlineY + forecastOffset);
        ctx.lineTo(width, midlineY + forecastOffset);
        ctx.strokeStyle = getColor('accent');
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
    }
}

/**
 * Render gravity warning indicator
 */
export function renderGravityWarning(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    gravityState: GravityState,
    currentTime: number,
    warningDuration: number
): void {
    if (!gravityState.warningActive) return;

    const warningElapsed = currentTime - gravityState.warningStartTime;
    const warningProgress = warningElapsed / warningDuration;
    const pulseIntensity = Math.sin(warningProgress * Math.PI * 4) * 0.5 + 0.5;

    // Warning overlay
    ctx.globalAlpha = 0.3 * pulseIntensity;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1.0;

    // Warning text
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + pulseIntensity * 0.5})`;
    ctx.textAlign = 'center';
    ctx.fillText('⚠ GRAVITY FLIP ⚠', width / 2, 60);

    // Countdown bar
    const barWidth = 200;
    const barHeight = 8;
    const barX = (width - barWidth) / 2;
    const barY = 80;

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(barX, barY, barWidth * (1 - warningProgress), barHeight);
}

/**
 * Render gravity flip indicator
 */
export function renderGravityFlipIndicator(
    ctx: CanvasRenderingContext2D,
    width: number,
    isFlipped: boolean
): void {
    if (!isFlipped) return;

    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = getColor('accent');
    ctx.textAlign = 'right';
    ctx.fillText('🔄 FLIPPED', width - 20, 30);
}

/**
 * Main background render function - renders all background elements
 */
export function renderBackground(
    context: BackgroundRenderContext,
    state: BackgroundRenderState
): void {
    const { ctx, width, height, midlineY, elapsedTime, currentFrequency } = context;
    const { gravityState, midlineState, resonanceState, tensionIntensity, isCritical } = state;

    // 1. Zone backgrounds
    renderZoneBackgrounds(ctx, width, height, midlineY, gravityState.isFlipped, resonanceState);

    // 2. Theme effects (grid, gradients)
    renderThemeEffects(ctx, width, height);

    // 3. Midline with tension
    renderMidline(ctx, width, midlineY, tensionIntensity, midlineState.isAtPeak);

    // 4. Critical space warning
    renderCriticalWarning(ctx, width, height, isCritical);

    // 5. Forecast hint
    renderForecastHint(ctx, width, midlineY, elapsedTime, currentFrequency);

    // 6. Gravity indicators
    renderGravityWarning(ctx, width, height, gravityState, Date.now(), 2000);
    renderGravityFlipIndicator(ctx, width, gravityState.isFlipped);
}
