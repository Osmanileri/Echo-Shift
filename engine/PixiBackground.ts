/**
 * PixiBackground.ts — Parallax Background & Zone Themes
 * 
 * Renders multi-layer scrolling star field, grid lines, and lane separators.
 * Supports 5 zone themes with unique color palettes.
 */

import { Graphics, Container } from 'pixi.js';
import { getLayer, RenderLayer, getWidth, getHeight } from './PixiRenderer';

// ============================================================================
// Zone Theme Definitions
// ============================================================================

export interface ZoneTheme {
  name: string;
  bgGradientTop: number;
  bgGradientBottom: number;
  starColor: number;
  gridColor: number;
  gridAlpha: number;
  laneGlowColor: number;
  ambientParticleColor: number;
}

export const ZONE_THEMES: Record<string, ZoneTheme> = {
  default: {
    name: 'Default',
    bgGradientTop: 0x0a0a1a,
    bgGradientBottom: 0x1a0a2e,
    starColor: 0xffffff,
    gridColor: 0x333366,
    gridAlpha: 0.15,
    laneGlowColor: 0x6366f1,
    ambientParticleColor: 0x8888ff,
  },
  neon_city: {
    name: 'Neon City',
    bgGradientTop: 0x0d0221,
    bgGradientBottom: 0x150535,
    starColor: 0xff00ff,
    gridColor: 0xff00ff,
    gridAlpha: 0.12,
    laneGlowColor: 0xff00ff,
    ambientParticleColor: 0xff44ff,
  },
  shadow_realm: {
    name: 'Shadow Realm',
    bgGradientTop: 0x050505,
    bgGradientBottom: 0x0a0a0a,
    starColor: 0x666666,
    gridColor: 0x222222,
    gridAlpha: 0.1,
    laneGlowColor: 0x444444,
    ambientParticleColor: 0x555555,
  },
  ember_zone: {
    name: 'Ember Zone',
    bgGradientTop: 0x1a0500,
    bgGradientBottom: 0x2a0a00,
    starColor: 0xff6600,
    gridColor: 0xff4400,
    gridAlpha: 0.12,
    laneGlowColor: 0xff4400,
    ambientParticleColor: 0xff8844,
  },
  frost_zone: {
    name: 'Frost Zone',
    bgGradientTop: 0x001020,
    bgGradientBottom: 0x002040,
    starColor: 0x88ccff,
    gridColor: 0x4488cc,
    gridAlpha: 0.12,
    laneGlowColor: 0x44aaff,
    ambientParticleColor: 0x88ddff,
  },
  void_zone: {
    name: 'Void Zone',
    bgGradientTop: 0x000000,
    bgGradientBottom: 0x0a001a,
    starColor: 0xaa00ff,
    gridColor: 0x6600aa,
    gridAlpha: 0.1,
    laneGlowColor: 0x8800ff,
    ambientParticleColor: 0xbb44ff,
  },
};

// ============================================================================
// Star Field
// ============================================================================

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
  graphic: Graphics;
}

const stars: Star[] = [];
let starsInitialized = false;

function initStars(theme: ZoneTheme): void {
  const w = getWidth();
  const h = getHeight();
  const bgLayer = getLayer(RenderLayer.BACKGROUND);

  // Clean previous
  for (const star of stars) {
    star.graphic.destroy();
  }
  stars.length = 0;

  // Slow background stars (40)
  for (let i = 0; i < 40; i++) {
    const g = new Graphics();
    const size = 0.5 + Math.random() * 1.5;
    g.circle(0, 0, size);
    g.fill({ color: theme.starColor, alpha: 0.3 + Math.random() * 0.4 });
    g.position.set(Math.random() * w, Math.random() * h);
    bgLayer.addChild(g);
    stars.push({
      x: g.position.x,
      y: g.position.y,
      speed: 10 + Math.random() * 20,
      size,
      alpha: 0.3 + Math.random() * 0.4,
      graphic: g,
    });
  }

  // Fast foreground stars (20)
  for (let i = 0; i < 20; i++) {
    const g = new Graphics();
    const size = 1 + Math.random() * 2;
    g.circle(0, 0, size);
    g.fill({ color: theme.starColor, alpha: 0.5 + Math.random() * 0.5 });
    g.position.set(Math.random() * w, Math.random() * h);
    bgLayer.addChild(g);
    stars.push({
      x: g.position.x,
      y: g.position.y,
      speed: 40 + Math.random() * 60,
      size,
      alpha: 0.5 + Math.random() * 0.5,
      graphic: g,
    });
  }

  starsInitialized = true;
}

function updateStars(dt: number): void {
  const dtSec = dt / 1000;
  const w = getWidth();
  const h = getHeight();

  for (const star of stars) {
    star.x -= star.speed * dtSec;
    if (star.x < -5) {
      star.x = w + 5;
      star.y = Math.random() * h;
    }
    star.graphic.position.set(star.x, star.y);
  }
}

// ============================================================================
// Grid Lines
// ============================================================================

let gridGraphics: Graphics | null = null;
let gridScrollOffset = 0;

function initGrid(theme: ZoneTheme): void {
  const gridLayer = getLayer(RenderLayer.GRID);
  if (gridGraphics) {
    gridGraphics.destroy();
  }
  gridGraphics = new Graphics();
  gridLayer.addChild(gridGraphics);
}

function updateGrid(dt: number, gameSpeed: number, theme: ZoneTheme): void {
  if (!gridGraphics) return;
  const dtSec = dt / 1000;
  const w = getWidth();
  const h = getHeight();
  const spacing = 60;

  gridScrollOffset = (gridScrollOffset + gameSpeed * 30 * dtSec) % spacing;

  gridGraphics.clear();

  // Vertical lines scrolling left
  for (let x = -gridScrollOffset; x < w + spacing; x += spacing) {
    gridGraphics.moveTo(x, 0);
    gridGraphics.lineTo(x, h);
  }

  // Horizontal lines (static)
  for (let y = 0; y < h + spacing; y += spacing) {
    gridGraphics.moveTo(0, y);
    gridGraphics.lineTo(w, y);
  }

  gridGraphics.stroke({ color: theme.gridColor, alpha: theme.gridAlpha, width: 1 });
}

// ============================================================================
// Lane Separator Glows
// ============================================================================

let laneGlowGraphics: Graphics | null = null;

function initLaneGlow(theme: ZoneTheme): void {
  const laneLayer = getLayer(RenderLayer.LANE_GLOW);
  if (laneGlowGraphics) {
    laneGlowGraphics.destroy();
  }
  laneGlowGraphics = new Graphics();
  laneLayer.addChild(laneGlowGraphics);
}

function updateLaneGlow(midlineY: number, theme: ZoneTheme): void {
  if (!laneGlowGraphics) return;
  const w = getWidth();

  laneGlowGraphics.clear();

  // Center lane glow line
  laneGlowGraphics.moveTo(0, midlineY);
  laneGlowGraphics.lineTo(w, midlineY);
  laneGlowGraphics.stroke({ color: theme.laneGlowColor, alpha: 0.3, width: 2 });

  // Soft glow band
  laneGlowGraphics.rect(0, midlineY - 15, w, 30);
  laneGlowGraphics.fill({ color: theme.laneGlowColor, alpha: 0.05 });
}

// ============================================================================
// Public API
// ============================================================================

let currentThemeKey = 'default';

export function setZoneTheme(themeKey: string): void {
  const theme = ZONE_THEMES[themeKey] || ZONE_THEMES.default;
  currentThemeKey = themeKey;
  initStars(theme);
  initGrid(theme);
  initLaneGlow(theme);
}

export function getCurrentTheme(): ZoneTheme {
  return ZONE_THEMES[currentThemeKey] || ZONE_THEMES.default;
}

export function updateBackground(dt: number, gameSpeed: number, midlineY: number): void {
  if (!starsInitialized) return;
  const theme = getCurrentTheme();
  updateStars(dt);
  updateGrid(dt, gameSpeed, theme);
  updateLaneGlow(midlineY, theme);
}

export function destroyBackground(): void {
  for (const star of stars) {
    star.graphic.destroy();
  }
  stars.length = 0;
  starsInitialized = false;

  if (gridGraphics) {
    gridGraphics.destroy();
    gridGraphics = null;
  }
  if (laneGlowGraphics) {
    laneGlowGraphics.destroy();
    laneGlowGraphics = null;
  }
  gridScrollOffset = 0;
}
