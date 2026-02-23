/**
 * usePixiRenderer.ts — React Hook for PixiJS Lifecycle
 * 
 * Manages PixiJS Application creation, resize handling, and cleanup.
 * Returns a ref to attach to a div container and the engine API.
 */

import { Application } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';
import * as PixiGameBridge from './PixiGameBridge';
import * as PixiGlitchSeeker from './PixiGlitchSeeker';
import * as PixiRenderer from './PixiRenderer';

// ============================================================================
// API Interface
// ============================================================================

export interface PixiRendererAPI {
  isReady: boolean;
  syncFrame: typeof PixiGameBridge.syncFrame;
  onShardCollected: typeof PixiGameBridge.onShardCollected;
  onNearMiss: typeof PixiGameBridge.onNearMiss;
  onCollision: typeof PixiGameBridge.onCollision;
  onObstacleDestroyed: typeof PixiGameBridge.onObstacleDestroyed;
  onOverdriveActivate: typeof PixiGameBridge.onOverdriveActivate;
  onOverdriveDeactivate: typeof PixiGameBridge.onOverdriveDeactivate;
  onSwap: typeof PixiGameBridge.onSwap;
  onGameOver: typeof PixiGameBridge.onGameOver;
  onLetterCollected: typeof PixiGameBridge.onLetterCollected;
  cleanupAllRenderables: typeof PixiGameBridge.cleanupAllRenderables;
  setZoneTheme: typeof PixiGameBridge.setZoneTheme;
  triggerShake: typeof PixiRenderer.triggerShake;
  // Glitch Seeker (homing ghost) PixiJS events
  onSeekerTeleport: typeof PixiGlitchSeeker.onSeekerTeleport;
  initSeeker: typeof PixiGlitchSeeker.initSeeker;
}

// ============================================================================
// Hook
// ============================================================================

export function usePixiRenderer(): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  api: PixiRendererAPI;
} {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const appRef = useRef<Application | null>(null);

  // Initialize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none'; // Let touches pass through to Canvas2D
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const width = container.clientWidth;
    const height = container.clientHeight;

    let destroyed = false;

    PixiRenderer.initRenderer(canvas, width, height)
      .then((pixiApp) => {
        if (destroyed) {
          PixiRenderer.destroyRenderer();
          return;
        }
        appRef.current = pixiApp;
        PixiGameBridge.initBridge('default');
        setIsReady(true);
      })
      .catch((err) => {
        console.warn('[PixiRenderer] Init failed:', err);
      });

    // Resize handler
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          PixiRenderer.resizeRenderer(w, h);
        }
      }
    });
    ro.observe(container);

    return () => {
      destroyed = true;
      ro.disconnect();

      // Safely tear down PixiJS — wrapped to prevent crash from killing React tree
      try {
        PixiGameBridge.destroyBridge();
      } catch (e) {
        console.warn('[usePixiRenderer] bridge cleanup error:', e);
      }
      try {
        PixiRenderer.destroyRenderer();
      } catch (e) {
        console.warn('[usePixiRenderer] renderer cleanup error:', e);
      }

      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasRef.current = null;
      appRef.current = null;
      setIsReady(false);
    };
  }, []);

  // Build API (stable references)
  const api: PixiRendererAPI = {
    isReady,
    syncFrame: PixiGameBridge.syncFrame,
    onShardCollected: PixiGameBridge.onShardCollected,
    onNearMiss: PixiGameBridge.onNearMiss,
    onCollision: PixiGameBridge.onCollision,
    onObstacleDestroyed: PixiGameBridge.onObstacleDestroyed,
    onOverdriveActivate: PixiGameBridge.onOverdriveActivate,
    onOverdriveDeactivate: PixiGameBridge.onOverdriveDeactivate,
    onSwap: PixiGameBridge.onSwap,
    onGameOver: PixiGameBridge.onGameOver,
    onLetterCollected: PixiGameBridge.onLetterCollected,
    cleanupAllRenderables: PixiGameBridge.cleanupAllRenderables,
    setZoneTheme: PixiGameBridge.setZoneTheme,
    triggerShake: PixiRenderer.triggerShake,
    // Glitch Seeker (homing ghost) events
    onSeekerTeleport: PixiGlitchSeeker.onSeekerTeleport,
    initSeeker: PixiGlitchSeeker.initSeeker,
  };

  return { containerRef, canvasRef, api };
}
