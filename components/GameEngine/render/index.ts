/**
 * Render Layer Index
 * 
 * Central export for all GameEngine render modules.
 * 
 * @example
 * ```tsx
 * import { renderBackground, renderEntities, renderUI } from './render';
 * ```
 */

// Background rendering
export {
    renderBackground, renderCriticalWarning,
    renderForecastHint, renderGravityFlipIndicator, renderGravityWarning, renderMidline,
    renderThemeEffects, renderZoneBackgrounds
} from './BackgroundRenderer';

export type {
    BackgroundRenderContext,
    BackgroundRenderState
} from './BackgroundRenderer';

// Entity rendering
export { drawOrb, getOrbColors, renderConnector, renderEntities, renderObstacles, renderOrbTrails, renderShards } from './EntityRenderer';

export type {
    EntityRenderContext,
    EntityRenderState, OrbRenderData
} from './EntityRenderer';

// UI rendering
export {
    renderOverdriveIndicator, renderResonanceIndicator, renderScorePopups, renderShieldIndicator, renderSlowMotionIndicator, renderUI, renderVisualEffects
} from './UIRenderer';

export type {
    UIRenderContext
} from './UIRenderer';

// Particle rendering
export {
    getVisualIntensity, renderLegacyParticles, renderParticles,
    renderSystemParticles
} from './ParticleRenderer';

export type {
    ParticleRenderContext
} from './ParticleRenderer';

