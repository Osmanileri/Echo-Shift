/**
 * engine/index.ts — Barrel Export
 * 
 * Central export point for the PixiJS engine layer.
 */

// Core Renderer
export * as PixiRenderer from './PixiRenderer';

// Particle System
export * as PixiParticles from './PixiParticles';

// Background & Zones
export * as PixiBackground from './PixiBackground';
export type { ZoneTheme } from './PixiBackground';

// Screen Effects
export * as PixiEffects from './PixiEffects';

// Glitch Seeker (Homing Ghost) — GPU-rendered enemy
export * as PixiGlitchSeeker from './PixiGlitchSeeker';

// Game Bridge
export * as PixiGameBridge from './PixiGameBridge';

// React Hook
export { usePixiRenderer } from './usePixiRenderer';
export type { PixiRendererAPI } from './usePixiRenderer';

