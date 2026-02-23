/**
 * GameCanvas.tsx — React Component for PixiJS Engine Layer
 * 
 * Wraps the PixiJS renderer in a React component that sits BEHIND
 * the existing Canvas2D game. Provides the PixiRendererAPI to parent
 * via forwardRef/useImperativeHandle.
 * 
 * Architecture:
 *   [PixiJS WebGL Canvas] ← backgrounds, particles, VFX
 *   [Canvas2D]            ← game objects (orbs, obstacles)
 *   [React DOM]           ← UI overlays
 */

import React, { forwardRef, useImperativeHandle } from 'react';
import { usePixiRenderer, PixiRendererAPI } from '../engine/usePixiRenderer';

export interface GameCanvasHandle {
  api: PixiRendererAPI;
}

const GameCanvas = forwardRef<GameCanvasHandle>((_, ref) => {
  const { containerRef, api } = usePixiRenderer();

  useImperativeHandle(ref, () => ({ api }), [api]);

  return (
    <div
      ref={containerRef as React.Ref<HTMLDivElement>}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
});

GameCanvas.displayName = 'GameCanvas';

export default GameCanvas;
