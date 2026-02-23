/**
 * PixiRenderer.ts — Core WebGL Application & Layer System
 * 
 * Creates and manages the PixiJS Application, organizes rendering into
 * a 10-layer container hierarchy, and provides camera shake utilities.
 * 
 * Architecture: This canvas sits BEHIND the existing Canvas2D,
 * handling backgrounds, particles, and post-processing effects.
 */

import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
  BlurFilter,
} from 'pixi.js';

// ============================================================================
// Layer System — 10 ordered layers for z-depth management
// ============================================================================

export enum RenderLayer {
  BACKGROUND = 0,
  GRID = 1,
  LANE_GLOW = 2,
  PARTICLES_BACK = 3,
  OBSTACLES = 4,
  SHARDS = 5,
  ORBS = 6,
  PARTICLES_FRONT = 7,
  EFFECTS = 8,
  HUD = 9,
}

const LAYER_NAMES: Record<RenderLayer, string> = {
  [RenderLayer.BACKGROUND]: 'background',
  [RenderLayer.GRID]: 'grid',
  [RenderLayer.LANE_GLOW]: 'laneGlow',
  [RenderLayer.PARTICLES_BACK]: 'particlesBack',
  [RenderLayer.OBSTACLES]: 'obstacles',
  [RenderLayer.SHARDS]: 'shards',
  [RenderLayer.ORBS]: 'orbs',
  [RenderLayer.PARTICLES_FRONT]: 'particlesFront',
  [RenderLayer.EFFECTS]: 'effects',
  [RenderLayer.HUD]: 'hud',
};

// ============================================================================
// Camera Shake State
// ============================================================================

interface ShakeState {
  active: boolean;
  intensity: number;
  decay: number;
  offsetX: number;
  offsetY: number;
  duration: number;
  elapsed: number;
}

const shakeState: ShakeState = {
  active: false,
  intensity: 0,
  decay: 0.92,
  offsetX: 0,
  offsetY: 0,
  duration: 0,
  elapsed: 0,
};

// ============================================================================
// Module State
// ============================================================================

let app: Application | null = null;
let stage: Container | null = null;
const layers: Map<RenderLayer, Container> = new Map();
let _width = 0;
let _height = 0;
let _initialized = false;

// ============================================================================
// Initialization
// ============================================================================

export async function initRenderer(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Promise<Application> {
  if (_initialized && app) {
    app.renderer.resize(width, height);
    _width = width;
    _height = height;
    return app;
  }

  app = new Application();

  await app.init({
    canvas,
    width,
    height,
    backgroundAlpha: 0,          // Transparent — sees through to CSS bg
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    powerPreference: 'high-performance',
  });

  stage = app.stage;
  _width = width;
  _height = height;

  // Create ordered layers
  for (let i = RenderLayer.BACKGROUND; i <= RenderLayer.HUD; i++) {
    const container = new Container();
    container.label = LAYER_NAMES[i as RenderLayer];
    layers.set(i as RenderLayer, container);
    stage.addChild(container);
  }

  _initialized = true;
  return app;
}

// ============================================================================
// Accessors
// ============================================================================

export function getApp(): Application | null {
  return app;
}

export function getLayer(layer: RenderLayer): Container {
  const c = layers.get(layer);
  if (!c) {
    throw new Error(`PixiRenderer: Layer ${RenderLayer[layer]} not initialized`);
  }
  return c;
}

export function getWidth(): number {
  return _width;
}

export function getHeight(): number {
  return _height;
}

export function isInitialized(): boolean {
  return _initialized;
}

// ============================================================================
// Camera Shake
// ============================================================================

export function triggerShake(intensity: number = 8, duration: number = 300): void {
  shakeState.active = true;
  shakeState.intensity = intensity;
  shakeState.duration = duration;
  shakeState.elapsed = 0;
}

export function updateShake(dt: number): void {
  if (!shakeState.active || !stage) return;

  shakeState.elapsed += dt;

  if (shakeState.elapsed >= shakeState.duration) {
    shakeState.active = false;
    shakeState.offsetX = 0;
    shakeState.offsetY = 0;
    stage.position.set(0, 0);
    return;
  }

  const progress = shakeState.elapsed / shakeState.duration;
  const currentIntensity = shakeState.intensity * (1 - progress);

  shakeState.offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
  shakeState.offsetY = (Math.random() - 0.5) * 2 * currentIntensity;

  stage.position.set(shakeState.offsetX, shakeState.offsetY);
}

// ============================================================================
// Resize
// ============================================================================

export function resizeRenderer(width: number, height: number): void {
  if (!app) return;
  app.renderer.resize(width, height);
  _width = width;
  _height = height;
}

// ============================================================================
// Utility Primitives
// ============================================================================

export function createRoundedRect(
  w: number,
  h: number,
  radius: number,
  color: number,
  alpha: number = 1,
): Graphics {
  const g = new Graphics();
  g.roundRect(0, 0, w, h, radius);
  g.fill({ color, alpha });
  return g;
}

export function createCircle(
  radius: number,
  color: number,
  alpha: number = 1,
): Graphics {
  const g = new Graphics();
  g.circle(0, 0, radius);
  g.fill({ color, alpha });
  return g;
}

export function addGlow(
  target: Container,
  blurStrength: number = 8,
): void {
  const filter = new BlurFilter({ strength: blurStrength });
  target.filters = [...(target.filters || []), filter];
}

export function createText(
  content: string,
  fontSize: number = 24,
  color: number = 0xffffff,
): Text {
  const style = new TextStyle({
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize,
    fontWeight: 'bold',
    fill: color,
    dropShadow: {
      color: 0x000000,
      blur: 4,
      distance: 0,
      alpha: 0.5,
    },
  });
  return new Text({ text: content, style });
}

// ============================================================================
// Cleanup
// ============================================================================

export function destroyRenderer(): void {
  if (app) {
    // Clean up layers first (safe — no PixiJS internal calls)
    layers.forEach((container) => {
      container.removeChildren();
    });
    layers.clear();

    // PixiJS v8 bug: app.destroy() crashes with "this._cancelResize is not a function"
    // when resizeTo was never set. Guard with try-catch and manual cleanup.
    try {
      // Remove stage children before destroy to reduce internal iteration
      if (app.stage) {
        app.stage.removeChildren();
      }
      app.destroy(true, { children: true });
    } catch (e) {
      // Fallback: manually destroy renderer if app.destroy fails
      console.warn('[PixiRenderer] destroy fallback:', e);
      try {
        app.renderer?.destroy();
      } catch (_) { /* ignore */ }
      try {
        app.stage?.destroy({ children: true });
      } catch (_) { /* ignore */ }
    }
    app = null;
    stage = null;
  }

  _initialized = false;
  _width = 0;
  _height = 0;

  // Reset shake
  shakeState.active = false;
  shakeState.offsetX = 0;
  shakeState.offsetY = 0;
}
