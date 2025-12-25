/**
 * EntityRenderer
 * 
 * Handles rendering of game entities:
 * - Player orbs (with skins, spirits, trails)
 * - Obstacles (blocks)
 * - Shards (collectibles)
 * - Connector line between orbs
 * 
 * This module extracts ~400 lines of entity drawing from GameEngine loop.
 * 
 * @module render/EntityRenderer
 */

import { getSkinById } from '../../../data/skins';
import * as OrbTrailSystem from '../../../systems/orbTrailSystem';
import * as ResonanceSystem from '../../../systems/resonanceSystem';
import type { PlacedShard } from '../../../systems/shardPlacement';
import * as SpiritRenderer from '../../../systems/spiritRenderer';
import { getColor, hasEffect } from '../../../systems/themeSystem';
import * as TrailingSoul from '../../../systems/trailingSoul';
import type { GlitchModeState, Obstacle } from '../../../types';
import { renderOrb as renderSkinOrb } from '../../../utils/skinRenderer';

// =============================================================================
// Types
// =============================================================================

export interface OrbRenderData {
    x: number;
    y: number;
    radius: number;
    color: string;
}

export interface EntityRenderContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    midlineY: number;
}

export interface EntityRenderState {
    // Orb data
    whiteOrb: OrbRenderData;
    blackOrb: OrbRenderData;

    // Skin and character
    equippedSkin: string;
    activeCharacter: any | null; // PokemonCharacter
    spiritSprite: HTMLImageElement | null;

    // State refs for effects
    resonanceState: ResonanceSystem.ResonanceState;
    glitchModeState: GlitchModeState;
    playerVelocityY: number;

    // Trail state
    whiteOrbTrail: TrailingSoul.TrailState;
    blackOrbTrail: TrailingSoul.TrailState;
}

// =============================================================================
// Orb Rendering
// =============================================================================

/**
 * Get orb colors based on theme and zone
 */
export function getOrbColors(
    isWhite: boolean,
    orbY: number,
    midY: number,
    glitchModeState: GlitchModeState
): { fillColor: string; borderColor: string; needsBorder: boolean } {
    // Use obstacle colors for orbs to match blocks
    let fillColor = isWhite ? getColor('topObstacle') : getColor('bottomObstacle');
    let borderColor = isWhite ? getColor('bottomObstacle') : getColor('topObstacle');

    // Fallback to default
    if (!fillColor) fillColor = isWhite ? '#FFFFFF' : '#000000';
    if (!borderColor) borderColor = isWhite ? '#000000' : '#FFFFFF';

    // Determine if border is needed
    const currentZoneBg = orbY < midY
        ? (getColor('topBg') || '#000000')
        : (getColor('bottomBg') || '#FFFFFF');

    const isQuantumLockActive = glitchModeState.isActive ||
        glitchModeState.phase === 'warning' ||
        glitchModeState.phase === 'exiting';

    const needsBorder = isQuantumLockActive ||
        fillColor.toLowerCase() === currentZoneBg.toLowerCase();

    return { fillColor, borderColor, needsBorder };
}

/**
 * Render a single orb with all effects
 */
export function drawOrb(
    ctx: CanvasRenderingContext2D,
    orb: OrbRenderData,
    isWhite: boolean,
    state: EntityRenderState
): void {
    ctx.save();

    // Reset shadow effects
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalCompositeOperation = 'source-over';

    const skin = getSkinById(state.equippedSkin);
    const { resonanceState, glitchModeState } = state;

    // Resonance Mode: Special rendering
    const resonanceInversion = ResonanceSystem.getColorInversion(resonanceState);

    if (resonanceState.isActive || resonanceInversion.factor > 0) {
        renderResonanceOrb(ctx, orb, isWhite, resonanceInversion.factor);
    } else {
        // Normal orb rendering
        const { fillColor, borderColor, needsBorder } = getOrbColors(
            isWhite,
            orb.y,
            ctx.canvas.height / 2,
            glitchModeState
        );

        if (skin.id === 'default') {
            // Default orb - simple circle
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.fill();

            if (needsBorder) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = borderColor;
                ctx.stroke();
            }
        } else {
            // Custom skin rendering
            const isTopOrb = isWhite;
            renderSkinOrb(
                { ctx, x: orb.x, y: orb.y, radius: orb.radius, isTopOrb } as any,
                skin
            );

            if (needsBorder) {
                ctx.beginPath();
                ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
                ctx.lineWidth = 2;
                ctx.strokeStyle = borderColor;
                ctx.stroke();
            }
        }

        // Cyberpunk glow edges
        if (hasEffect('glowEdges')) {
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
            ctx.shadowColor = fillColor;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Spirit character rendering
        if (state.activeCharacter && state.spiritSprite) {
            renderSpiritOrb(ctx, orb, isWhite, state);
        }
    }

    ctx.restore();
}

/**
 * Render orb in Resonance mode (cyan glow)
 */
function renderResonanceOrb(
    ctx: CanvasRenderingContext2D,
    orb: OrbRenderData,
    isWhite: boolean,
    glowIntensity: number
): void {
    const resonanceColor = ResonanceSystem.getResonanceOrbColor();

    // Bloom/glow effect
    if (glowIntensity > 0) {
        ctx.save();
        ctx.shadowColor = resonanceColor;
        ctx.shadowBlur = 20 + glowIntensity * 15;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = resonanceColor + Math.floor(glowIntensity * 128).toString(16).padStart(2, '0');
        ctx.fill();
        ctx.restore();
    }

    // Main orb
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fillStyle = ResonanceSystem.interpolateColor(
        isWhite ? getColor('topOrb') : getColor('bottomOrb'),
        resonanceColor,
        glowIntensity
    );
    ctx.fill();

    // Glowing border
    ctx.lineWidth = 2;
    ctx.strokeStyle = resonanceColor;
    ctx.shadowColor = resonanceColor;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
}

/**
 * Render spirit character effects on orb
 */
function renderSpiritOrb(
    ctx: CanvasRenderingContext2D,
    orb: OrbRenderData,
    isWhite: boolean,
    state: EntityRenderState
): void {
    const { activeCharacter, spiritSprite, playerVelocityY } = state;
    const types = activeCharacter.types;
    const primaryType = types[0] || 'normal';
    const now = Date.now();

    // Get correct fill color for trail
    const { fillColor } = getOrbColors(
        isWhite,
        orb.y,
        ctx.canvas.height / 2,
        state.glitchModeState
    );

    // Update and render trails
    const trailRef = isWhite ? state.whiteOrbTrail : state.blackOrbTrail;

    // Render Trailing Soul
    TrailingSoul.renderTrailingSoul(
        ctx,
        trailRef,
        spiritSprite!,
        orb.radius,
        primaryType,
        fillColor
    );

    // Render professional orb with silhouette
    SpiritRenderer.renderProfessionalOrb(
        ctx,
        orb.x,
        orb.y,
        orb.radius,
        spiritSprite!,
        fillColor,
        primaryType,
        playerVelocityY,
        now
    );

    // Elemental aura particles
    SpiritRenderer.renderElementalParticles(
        ctx,
        orb.x,
        orb.y,
        orb.radius,
        primaryType,
        now
    );
}

// =============================================================================
// Obstacle Rendering
// =============================================================================

/**
 * Render all obstacles
 */
export function renderObstacles(
    ctx: CanvasRenderingContext2D,
    obstacles: Obstacle[],
    midlineY: number
): void {
    obstacles.forEach((obs) => {
        ctx.save();

        // Determine obstacle color based on zone
        const isTopZone = obs.y < midlineY;
        const fillColor = isTopZone
            ? getColor('topObstacle')
            : getColor('bottomObstacle');

        ctx.fillStyle = fillColor || (isTopZone ? '#FFFFFF' : '#000000');

        // Draw obstacle (rectangle with rounded corners optional)
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Glow effect for cyberpunk theme
        if (hasEffect('glowEdges')) {
            ctx.shadowColor = fillColor;
            ctx.shadowBlur = 8;
            ctx.strokeStyle = fillColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    });
}

// =============================================================================
// Shard Rendering
// =============================================================================

/**
 * Render all shards (collectibles)
 */
export function renderShards(
    ctx: CanvasRenderingContext2D,
    shards: PlacedShard[]
): void {
    const now = Date.now();

    shards.forEach((shard) => {
        if (shard.collected) return;

        ctx.save();

        // Pulsing glow effect
        const pulse = Math.sin(now * 0.005 + shard.x) * 0.3 + 0.7;

        // Draw shard (diamond shape)
        const size = 12;
        ctx.translate(shard.x, shard.y);
        ctx.rotate(Math.PI / 4); // 45 degree rotation for diamond

        // Glow
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10 * pulse;

        // Fill
        ctx.fillStyle = `rgba(255, 215, 0, ${0.8 * pulse})`;
        ctx.fillRect(-size / 2, -size / 2, size, size);

        // Border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(-size / 2, -size / 2, size, size);

        ctx.restore();
    });
}

// =============================================================================
// Connector Rendering
// =============================================================================

/**
 * Render the connector line between orbs
 */
export function renderConnector(
    ctx: CanvasRenderingContext2D,
    whiteOrb: OrbRenderData,
    blackOrb: OrbRenderData,
    connectorColor?: string
): void {
    ctx.save();

    const color = connectorColor || getColor('connector') || '#888888';

    ctx.beginPath();
    ctx.moveTo(whiteOrb.x, whiteOrb.y);
    ctx.lineTo(blackOrb.x, blackOrb.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
}

// =============================================================================
// Orb Trail Rendering
// =============================================================================

/**
 * Render orb trails (skin-based trail effects)
 */
export function renderOrbTrails(
    ctx: CanvasRenderingContext2D,
    whiteOrb: OrbRenderData,
    blackOrb: OrbRenderData,
    equippedSkin: string
): void {
    const trailConfig = OrbTrailSystem.getTrailConfig(equippedSkin);

    if (trailConfig.enabled) {
        OrbTrailSystem.emitTrail(whiteOrb.x, whiteOrb.y, true, trailConfig);
        OrbTrailSystem.emitTrail(blackOrb.x, blackOrb.y, false, trailConfig);
        OrbTrailSystem.updateTrails(1 / 60, trailConfig);
    }

    OrbTrailSystem.renderTrails(ctx, trailConfig);
}

// =============================================================================
// Main Entity Render Function
// =============================================================================

/**
 * Render all game entities
 */
export function renderEntities(
    context: EntityRenderContext,
    state: EntityRenderState,
    obstacles: Obstacle[],
    shards: PlacedShard[]
): void {
    const { ctx, midlineY } = context;
    const { whiteOrb, blackOrb, equippedSkin } = state;

    // 1. Render orb trails (behind orbs)
    renderOrbTrails(ctx, whiteOrb, blackOrb, equippedSkin);

    // 2. Render connector
    renderConnector(ctx, whiteOrb, blackOrb);

    // 3. Render obstacles
    renderObstacles(ctx, obstacles, midlineY);

    // 4. Render shards
    renderShards(ctx, shards);

    // 5. Render orbs (on top)
    drawOrb(ctx, whiteOrb, true, state);
    drawOrb(ctx, blackOrb, false, state);
}
