/**
 * Unlock Modal Component — Level Unlock Celebration System v2
 *
 * Full-screen overlay that pauses the game to celebrate a new mechanic / enemy
 * unlock. Each unlock type now features a mini canvas animation that visually
 * demonstrates what the mechanic does, making the presentation feel premium and
 * helping the player immediately understand the new feature.
 *
 * Animation demos:
 *   - SHIFT MECHANIC  → Two orbs swapping polarity colors
 *   - QUANTUM LOCK    → Plasma stream locking orbs in place
 *   - PULSE GATE      → Color-shifting gate obstacle
 *   - GHOST MODE      → Orb phasing through obstacle
 *   - PHANTOM OBSTACLES → Obstacles fading in/out
 *   - DYNAMIC MIDLINE → Shifting midline
 *   - RHYTHM SYSTEM   → Beat-synced pulsing
 *   - GRAVITY FLIP    → Orb bouncing with gravity inversion
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UnlockPayload } from '../../types';

// ============================================================================
// Animation phases
// ============================================================================
type ModalPhase = 'enter' | 'icon-slam' | 'demo-play' | 'text-reveal' | 'ready';

/** Delay before the ACKNOWLEDGE button becomes active (ms) */
const ACK_DELAY_MS = 3000;

/** Demo canvas dimensions */
const DEMO_W = 280;
const DEMO_H = 160;

// ============================================================================
// Mini-Demo Canvas Renderers
// ============================================================================

/** Helper: parse hex color to [r,g,b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/** Helper: draw rounded rect path */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ============================================================================
// In-Game Visual Primitives — matches GameEngine.tsx rendering exactly
// ============================================================================

// Game colors (from constants.ts)
const GC = {
  TOP_BG: '#000000',
  BOT_BG: '#FFFFFF',
  WHITE_ORB: '#FFFFFF',
  BLACK_ORB: '#000000',
  CONNECTOR: '#888888',
  MIDLINE: '#888888',
  ACCENT_CYAN: '#00F0FF',
  ACCENT_RED: '#FF2A2A',
  OBSTACLE_W: 14, // scaled for mini-view (game=20)
  ORB_R: 6,       // same as game
  CONN_W: 2,      // same as game
};

/** Draw the split black/white game background */
function drawGameBg(ctx: CanvasRenderingContext2D, midY: number) {
  // Top zone: black
  ctx.fillStyle = GC.TOP_BG;
  ctx.fillRect(0, 0, DEMO_W, midY);
  // Bottom zone: white
  ctx.fillStyle = GC.BOT_BG;
  ctx.fillRect(0, midY, DEMO_W, DEMO_H - midY);
}

/** Draw the gray midline */
function drawMidline(
  ctx: CanvasRenderingContext2D, midY: number,
  color = GC.MIDLINE, width = 2, dash?: number[],
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(DEMO_W, midY);
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

/** Draw the player: two orbs + connector bar, exactly like GameEngine */
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  px: number, midY: number, connLen: number,
  isSwapped = false, alpha = 1,
) {
  const topOrbY = midY - connLen / 2;
  const botOrbY = midY + connLen / 2;
  const topColor = isSwapped ? GC.BLACK_ORB : GC.WHITE_ORB;
  const botColor = isSwapped ? GC.WHITE_ORB : GC.BLACK_ORB;

  ctx.globalAlpha = alpha;

  // Connector bar (gradient like game)
  const grad = ctx.createLinearGradient(px, topOrbY, px, botOrbY);
  grad.addColorStop(0, GC.CONNECTOR);
  grad.addColorStop(0.5, '#AAAAAA');
  grad.addColorStop(1, GC.CONNECTOR);
  ctx.strokeStyle = grad;
  ctx.lineWidth = GC.CONN_W;
  ctx.beginPath();
  ctx.moveTo(px, topOrbY);
  ctx.lineTo(px, botOrbY);
  ctx.stroke();

  // Top orb
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.arc(px, topOrbY, GC.ORB_R, 0, Math.PI * 2);
  ctx.fill();
  // Border for visibility (game does this when orb matches bg)
  if (topColor === GC.WHITE_ORB) {
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Bottom orb
  ctx.fillStyle = botColor;
  ctx.beginPath();
  ctx.arc(px, botOrbY, GC.ORB_R, 0, Math.PI * 2);
  ctx.fill();
  if (botColor === GC.BLACK_ORB) {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

/** Draw a game obstacle block (polarity-aware, like GameEngine) */
function drawObstacle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  isWhite: boolean, alpha = 1,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = isWhite ? '#FFFFFF' : '#000000';
  ctx.fillRect(x, y, w, h);
  // Border in opposite color (game style)
  ctx.strokeStyle = isWhite ? '#000000' : '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

/** Draw a gate-style obstacle pair with a gap (like game obstacles) */
function drawGateObstacle(
  ctx: CanvasRenderingContext2D,
  x: number, midY: number, gapCenter: number, gapH: number,
  isWhiteTop: boolean,
) {
  // Top block (in black zone)
  const topBlockH = gapCenter - gapH / 2;
  if (topBlockH > 0) {
    drawObstacle(ctx, x, 0, GC.OBSTACLE_W, topBlockH, isWhiteTop);
  }
  // Bottom block (in white zone)
  const botBlockY = gapCenter + gapH / 2;
  const botBlockH = DEMO_H - botBlockY;
  if (botBlockH > 0) {
    drawObstacle(ctx, x, botBlockY, GC.OBSTACLE_W, botBlockH, !isWhiteTop);
  }
}

/** Draw a scrolling distance marker at bottom */
function drawDistanceHUD(ctx: CanvasRenderingContext2D, meters: number) {
  ctx.fillStyle = 'rgba(0,240,255,0.5)';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(meters)}m`, DEMO_W - 6, DEMO_H - 4);
}

/**
 * Each demo renderer takes (ctx, t, color) where t ∈ [0..∞) is elapsed seconds.
 * They render one frame of the mini-animation on a DEMO_W × DEMO_H canvas.
 * All renderers now draw actual in-game visuals (split bg, real orbs, real obstacles).
 */
type DemoRenderer = (ctx: CanvasRenderingContext2D, t: number, color: string) => void;

const DEMO_RENDERERS: Record<string, DemoRenderer> = {
  /**
   * SHIFT MECHANIC — Shows actual gameplay: player taps to swap polarity,
   * white orb passes through white obstacles, black through black.
   */
  'SHIFT MECHANIC': (ctx, t, color) => {
    const midY = DEMO_H / 2;
    drawGameBg(ctx, midY);
    drawMidline(ctx, midY);

    // Scrolling obstacles
    const speed = 50; // px/s
    const spacing = 90;

    // Two obstacles: one needs white on top, one needs black on top
    for (let i = 0; i < 3; i++) {
      const obstX = ((DEMO_W + 40) - ((t * speed + i * spacing) % (DEMO_W + 80))) + DEMO_W * 0.3;
      if (obstX > -20 && obstX < DEMO_W + 20) {
        drawGateObstacle(ctx, obstX, midY, midY, 50, i % 2 === 0);
      }
    }

    // Player at left side
    const px = 50;
    const cycle = t % 2.4;
    const isSwapped = cycle > 1.2;

    // Swap flash
    const swapMoment1 = Math.abs(cycle - 1.2);
    const swapMoment2 = Math.abs(cycle - 2.4) < 0.15 || Math.abs(cycle) < 0.15;
    if (swapMoment1 < 0.1 || swapMoment2) {
      const flash = Math.sin(t * 30) * 0.2;
      ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},${Math.abs(flash)})`;
      ctx.fillRect(0, 0, DEMO_W, DEMO_H);
    }

    drawPlayer(ctx, px, midY, 40, isSwapped);

    // TAP indicator
    const tapPulse = 0.4 + Math.sin(t * 5) * 0.3;
    ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},${tapPulse})`;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ TAP TO SWAP', DEMO_W / 2, DEMO_H - 5);

    drawDistanceHUD(ctx, t * 12);
  },

  /**
   * QUANTUM LOCK — Shows actual gameplay: plasma stream connects orbs,
   * connector turns green, obstacles scroll but player is locked in place.
   */
  'QUANTUM LOCK': (ctx, t, color) => {
    const midY = DEMO_H / 2;
    drawGameBg(ctx, midY);

    const px = 50;
    const connLen = 45;
    const topOrbY = midY - connLen / 2;
    const botOrbY = midY + connLen / 2;

    // Scrolling obstacles (player safely avoids them while locked)
    const speed = 40;
    for (let i = 0; i < 3; i++) {
      const obstX = DEMO_W - ((t * speed + i * 100) % (DEMO_W + 40));
      if (obstX > -20 && obstX < DEMO_W + 20) {
        drawGateObstacle(ctx, obstX, midY, midY, 55, true);
      }
    }

    // Midline
    drawMidline(ctx, midY);

    // Green connector (Quantum Lock active)
    const glowPulse = 0.6 + Math.sin(t * 4) * 0.3;
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 12 * glowPulse;
    ctx.strokeStyle = `rgba(0,255,0,${glowPulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, topOrbY);
    ctx.lineTo(px, botOrbY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Plasma wave along connector (sinusoidal)
    const segments = 20;
    ctx.strokeStyle = `rgba(${hexToRgb(color).join(',')},${0.5 + Math.sin(t * 3) * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const sy = topOrbY + (botOrbY - topOrbY) * frac;
      const sx = px + Math.sin(frac * Math.PI * 4 + t * 8) * 6;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Orbs (white top, black bottom) with green tint
    ctx.fillStyle = GC.WHITE_ORB;
    ctx.beginPath();
    ctx.arc(px, topOrbY, GC.ORB_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = GC.BLACK_ORB;
    ctx.beginPath();
    ctx.arc(px, botOrbY, GC.ORB_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Lock particles orbiting
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 3;
      const dist = 18 + Math.sin(t * 5 + i) * 3;
      const ppx = px + Math.cos(angle) * dist;
      const ppy = midY + Math.sin(angle) * (connLen / 2 + 5);
      ctx.fillStyle = `rgba(0,255,136,${0.3 + Math.sin(t * 4 + i) * 0.2})`;
      ctx.beginPath();
      ctx.arc(ppx, ppy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label
    const lockPulse = 0.5 + Math.sin(t * 3) * 0.3;
    ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},${lockPulse})`;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🔒 POSITION LOCKED', DEMO_W / 2, DEMO_H - 5);

    drawDistanceHUD(ctx, 340 + t * 10);
  },

  /**
   * PULSE GATE — Shows actual gameplay: obstacle changes polarity color
   * while scrolling. Player must react to the color shift.
   */
  'PULSE GATE': (ctx, t, color) => {
    const midY = DEMO_H / 2;
    drawGameBg(ctx, midY);
    drawMidline(ctx, midY);

    // Normal obstacles scrolling
    const speed = 45;
    for (let i = 0; i < 2; i++) {
      const obstX = DEMO_W - ((t * speed + i * 130) % (DEMO_W + 40));
      if (obstX > -20 && obstX < DEMO_W + 20) {
        drawGateObstacle(ctx, obstX, midY, midY, 50, true);
      }
    }

    // PULSE GATE — special obstacle that changes color
    const pulseX = DEMO_W - ((t * speed + 65) % (DEMO_W + 40));
    if (pulseX > -20 && pulseX < DEMO_W + 20) {
      const pulseCycle = (t % 2.5) / 2.5;
      const isWhitePhase = pulseCycle < 0.5;
      const isTransitioning = (pulseCycle > 0.45 && pulseCycle < 0.55) ||
                               (pulseCycle > 0.95 || pulseCycle < 0.05);

      // Pulsing glow during transition
      if (isTransitioning) {
        ctx.shadowColor = GC.ACCENT_RED;
        ctx.shadowBlur = 15 + Math.sin(t * 20) * 8;
      }

      const gapCenter = midY;
      const gapH = 50;

      // Top block — changes polarity!
      const topH = gapCenter - gapH / 2;
      if (topH > 0) {
        const tAlpha = isTransitioning ? 0.5 + Math.sin(t * 15) * 0.3 : 1;
        drawObstacle(ctx, pulseX, 0, GC.OBSTACLE_W, topH, isWhitePhase, tAlpha);
      }
      // Bottom block
      const botY = gapCenter + gapH / 2;
      const botH = DEMO_H - botY;
      if (botH > 0) {
        const bAlpha = isTransitioning ? 0.5 + Math.sin(t * 15 + 1) * 0.3 : 1;
        drawObstacle(ctx, pulseX, botY, GC.OBSTACLE_W, botH, !isWhitePhase, bAlpha);
      }
      ctx.shadowBlur = 0;

      // Warning indicator above gate
      if (isTransitioning) {
        ctx.fillStyle = `rgba(255,42,42,${0.6 + Math.sin(t * 12) * 0.3})`;
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠', pulseX + GC.OBSTACLE_W / 2, Math.max(12, (gapCenter - gapH / 2) - 6));
      }
    }

    // Player
    drawPlayer(ctx, 45, midY, 40);

    // Label
    ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},0.7)`;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ POLARITY SHIFTS', DEMO_W / 2, DEMO_H - 5);

    drawDistanceHUD(ctx, t * 14);
  },

  /**
   * GHOST MODE — Shows actual gameplay: player activates ghost mode to
   * phase through an obstacle. Orbs become translucent cyan.
   */
  'GHOST MODE': (ctx, t, color) => {
    const midY = DEMO_H / 2;
    drawGameBg(ctx, midY);
    drawMidline(ctx, midY);

    const px = 45;
    const cycle = t % 5;

    // Scrolling obstacles
    const speed = 50;
    for (let i = 0; i < 3; i++) {
      const obstX = DEMO_W - ((t * speed + i * 95) % (DEMO_W + 40));
      if (obstX > -20 && obstX < DEMO_W + 20) {
        drawGateObstacle(ctx, obstX, midY, midY, 50, i % 2 === 0);
      }
    }

    // Dangerous obstacle right in the player's path
    const dangerX = DEMO_W * 0.35 - ((t * speed) % (DEMO_W + 40)) + DEMO_W * 0.5;
    const nearDanger = dangerX > px - 20 && dangerX < px + 30;

    if (dangerX > -20 && dangerX < DEMO_W + 20) {
      // This obstacle has NO gap — full wall!
      drawObstacle(ctx, dangerX, 0, GC.OBSTACLE_W, midY, true);
      drawObstacle(ctx, dangerX, midY, GC.OBSTACLE_W, DEMO_H - midY, false);
    }

    // Ghost mode activation
    const ghostActive = cycle > 1.5 && cycle < 3.5;
    const connLen = 40;
    const topOrbY = midY - connLen / 2;
    const botOrbY = midY + connLen / 2;

    if (ghostActive) {
      const ghostAlpha = 0.25 + Math.sin(t * 10) * 0.1;

      // Ghost trail
      for (let i = 1; i <= 4; i++) {
        const trailAlpha = ghostAlpha * (1 - i / 5) * 0.5;
        ctx.globalAlpha = trailAlpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px - i * 5, topOrbY, GC.ORB_R - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px - i * 5, botOrbY, GC.ORB_R - 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Ghosted player (translucent cyan)
      ctx.globalAlpha = ghostAlpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = GC.CONN_W;
      ctx.beginPath();
      ctx.moveTo(px, topOrbY);
      ctx.lineTo(px, botOrbY);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, topOrbY, GC.ORB_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, botOrbY, GC.ORB_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Sparkle particles
      for (let i = 0; i < 4; i++) {
        const sx = px + Math.sin(t * 8 + i * 2) * 12;
        const sy = midY + Math.cos(t * 6 + i * 1.5) * (connLen / 2 + 8);
        ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},${0.3 + Math.sin(t * 10 + i) * 0.2})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      drawPlayer(ctx, px, midY, connLen);
    }

    // Label
    ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},0.7)`;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ghostActive ? '👻 PHASING...' : '👻 GHOST MODE', DEMO_W / 2, DEMO_H - 5);

    drawDistanceHUD(ctx, 150 + t * 14);
  },

  /**
   * PHANTOM OBSTACLES — Shows actual gameplay: obstacles gradually appear
   * from invisible. Dashed outline → solid. Player must stay alert.
   */
  'PHANTOM OBSTACLES': (ctx, t, color) => {
    const midY = DEMO_H / 2;
    drawGameBg(ctx, midY);
    drawMidline(ctx, midY);

    const speed = 35;

    // Normal visible obstacles
    for (let i = 0; i < 2; i++) {
      const obstX = DEMO_W - ((t * speed + i * 140) % (DEMO_W + 40));
      if (obstX > -20 && obstX < DEMO_W + 20) {
        drawGateObstacle(ctx, obstX, midY, midY, 50, true);
      }
    }

    // PHANTOM obstacles — fade in as they approach
    for (let i = 0; i < 2; i++) {
      const rawX = DEMO_W - ((t * speed + 70 + i * 120) % (DEMO_W + 40));
      if (rawX > -20 && rawX < DEMO_W + 20) {
        // Visibility increases as obstacle gets closer to player (left side)
        const distFromRight = DEMO_W - rawX;
        const visibility = Math.min(1, Math.max(0, distFromRight / (DEMO_W * 0.6)));

        const gapCenter = midY;
        const gapH = 50;

        if (visibility < 0.3) {
          // Ghost outline phase — dashed border only
          ctx.setLineDash([4, 4]);
          ctx.globalAlpha = visibility * 2;

          // Top phantom
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = 1;
          const topH = gapCenter - gapH / 2;
          if (topH > 0) {
            ctx.strokeRect(rawX, 0, GC.OBSTACLE_W, topH);
          }

          // Bottom phantom
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          const botY = gapCenter + gapH / 2;
          const botH = DEMO_H - botY;
          if (botH > 0) {
            ctx.strokeRect(rawX, botY, GC.OBSTACLE_W, botH);
          }

          ctx.setLineDash([]);
          ctx.globalAlpha = 1;

          // "?" indicator
          ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},${0.3 + Math.sin(t * 4) * 0.2})`;
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('?', rawX + GC.OBSTACLE_W / 2, gapCenter + 3);
        } else {
          // Materializing → solid
          drawObstacle(ctx, rawX, 0, GC.OBSTACLE_W, gapCenter - gapH / 2, true, visibility);
          drawObstacle(ctx, rawX, gapCenter + gapH / 2, GC.OBSTACLE_W, DEMO_H - (gapCenter + gapH / 2), false, visibility);
        }
      }
    }

    // Player
    drawPlayer(ctx, 45, midY, 40);

    // Scanning line effect
    const scanX = (t * 60) % DEMO_W;
    const scanGrad = ctx.createLinearGradient(scanX - 15, 0, scanX + 15, 0);
    const [cr, cg, cb] = hexToRgb(color);
    scanGrad.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
    scanGrad.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.08)`);
    scanGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = scanGrad;
    ctx.fillRect(scanX - 15, 0, 30, DEMO_H);

    // Label
    ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},0.7)`;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('👁️ INVISIBLE UNTIL CLOSE', DEMO_W / 2, DEMO_H - 5);

    drawDistanceHUD(ctx, 200 + t * 10);
  },

  /**
   * DYNAMIC MIDLINE — Shows actual gameplay: the midline moves up/down,
   * changing zone proportions. Player orbs follow accordingly.
   */
  'DYNAMIC MIDLINE': (ctx, t, color) => {
    // Midline oscillates
    const midY = DEMO_H / 2 + Math.sin(t * 1.0) * 28;

    drawGameBg(ctx, midY);

    // Midline with accent glow (dynamic = special color)
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    drawMidline(ctx, midY, color, 2);
    ctx.shadowBlur = 0;

    // Also draw a faded forecast of where it's heading
    const forecastY = DEMO_H / 2 + Math.sin((t + 0.8) * 1.0) * 28;
    ctx.globalAlpha = 0.2;
    drawMidline(ctx, forecastY, color, 1, [6, 4]);
    ctx.globalAlpha = 1;

    // Scrolling obstacles that adapt to the new midline
    const speed = 40;
    for (let i = 0; i < 3; i++) {
      const obstX = DEMO_W - ((t * speed + i * 100) % (DEMO_W + 40));
      if (obstX > -20 && obstX < DEMO_W + 20) {
        drawGateObstacle(ctx, obstX, midY, midY, 50, i % 2 === 0);
      }
    }

    // Player follows the midline
    const px = 50;
    drawPlayer(ctx, px, midY, 40);

    // Direction arrow
    const vel = Math.cos(t * 1.0); // derivative of sin
    const arrowY = midY + (vel > 0 ? 1 : -1) * 15;
    const arrowAlpha = 0.4 + Math.abs(vel) * 0.4;
    ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},${arrowAlpha})`;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(vel > 0 ? '▼' : '▲', DEMO_W - 18, arrowY);

    // Label
    ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},0.7)`;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('〰️ MIDLINE SHIFTS', DEMO_W / 2, DEMO_H - 5);

    drawDistanceHUD(ctx, 400 + t * 10);
  },

  /**
   * RHYTHM SYSTEM — Shows actual gameplay: obstacles pulse on beat,
   * player passes through on-beat for streak multiplier.
   */
  'RHYTHM SYSTEM': (ctx, t, color) => {
    const midY = DEMO_H / 2;
    drawGameBg(ctx, midY);
    drawMidline(ctx, midY);

    const bpm = 120;
    const beatInterval = 60 / bpm;
    const beatPhase = (t % beatInterval) / beatInterval;
    const onBeat = beatPhase < 0.15;

    // Scrolling obstacles that pulse on beat
    const speed = 50;
    for (let i = 0; i < 3; i++) {
      const obstX = DEMO_W - ((t * speed + i * 95) % (DEMO_W + 40));
      if (obstX > -20 && obstX < DEMO_W + 20) {
        // Beat pulse effect on obstacles
        if (onBeat) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
        }
        drawGateObstacle(ctx, obstX, midY, midY, 50, i % 2 === 0);
        ctx.shadowBlur = 0;

        // Beat ring expanding from obstacle on beat
        if (onBeat) {
          const ringRadius = beatPhase / 0.15 * 20;
          ctx.strokeStyle = `rgba(${hexToRgb(color).join(',')},${(1 - beatPhase / 0.15) * 0.4})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(obstX + GC.OBSTACLE_W / 2, midY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Player
    drawPlayer(ctx, 45, midY, 40);

    // Beat flash overlay on beat
    if (onBeat) {
      ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},0.06)`;
      ctx.fillRect(0, 0, DEMO_W, DEMO_H);
    }

    // Beat indicator bars at very bottom
    const barCount = 8;
    const barW = (DEMO_W - 60) / barCount - 3;
    const barStartX = 30;
    for (let i = 0; i < barCount; i++) {
      const active = Math.floor(t / beatInterval * 2) % barCount === i;
      const barH = active ? 6 : 3;
      const barAlpha = active ? 0.8 : 0.15;
      ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},${barAlpha})`;
      ctx.fillRect(barStartX + i * (barW + 3), DEMO_H - barH - 12, barW, barH);
    }

    // Streak counter
    const streak = Math.min(10, Math.floor(t * 1.5) % 12);
    if (streak > 0) {
      ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},0.8)`;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`×${streak} STREAK`, DEMO_W / 2, 14);
    }

    // Label
    ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},0.7)`;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🎵 PASS ON BEAT', DEMO_W / 2, DEMO_H - 5);

    drawDistanceHUD(ctx, 600 + t * 14);
  },

  /**
   * GRAVITY FLIP — Shows actual gameplay: background zones swap
   * (black↔white), player orbs invert, controls reverse.
   */
  'GRAVITY FLIP': (ctx, t, color) => {
    // Gravity flips every 3s
    const cycle = t % 6;
    const flipped = cycle > 3;
    const isTransitioning = Math.abs(cycle - 3) < 0.3 || (cycle < 0.3);

    const midY = DEMO_H / 2;

    // Flipped: top=white, bottom=black (inverted)
    if (flipped) {
      ctx.fillStyle = GC.BOT_BG; // white on top
      ctx.fillRect(0, 0, DEMO_W, midY);
      ctx.fillStyle = GC.TOP_BG; // black on bottom
      ctx.fillRect(0, midY, DEMO_W, DEMO_H - midY);
    } else {
      drawGameBg(ctx, midY);
    }

    // Transition flash
    if (isTransitioning) {
      const flash = Math.sin(t * 25) * 0.15;
      ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},${Math.abs(flash)})`;
      ctx.fillRect(0, 0, DEMO_W, DEMO_H);

      // Flip arrows
      ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},0.6)`;
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔄', DEMO_W / 2, midY + 6);
    }

    drawMidline(ctx, midY, isTransitioning ? color : GC.MIDLINE, isTransitioning ? 3 : 2);

    // Obstacles (polarity matches the current gravity)
    const speed = 42;
    for (let i = 0; i < 3; i++) {
      const obstX = DEMO_W - ((t * speed + i * 100) % (DEMO_W + 40));
      if (obstX > -20 && obstX < DEMO_W + 20) {
        if (flipped) {
          // Inverted polarity obstacles
          const gapCenter = midY;
          const gapH = 50;
          const topH = gapCenter - gapH / 2;
          if (topH > 0) drawObstacle(ctx, obstX, 0, GC.OBSTACLE_W, topH, i % 2 !== 0); // inverted
          const botY = gapCenter + gapH / 2;
          const botH = DEMO_H - botY;
          if (botH > 0) drawObstacle(ctx, obstX, botY, GC.OBSTACLE_W, botH, i % 2 === 0); // inverted
        } else {
          drawGateObstacle(ctx, obstX, midY, midY, 50, i % 2 === 0);
        }
      }
    }

    // Player (orb colors swap when gravity flips)
    drawPlayer(ctx, 50, midY, 40, flipped);

    // Label
    ctx.fillStyle = `rgba(${hexToRgb(color).join(',')},0.7)`;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(flipped ? '🔄 INVERTED!' : '🔄 GRAVITY FLIP', DEMO_W / 2, DEMO_H - 5);

    drawDistanceHUD(ctx, 800 + t * 12);
  },
};

// ============================================================================
// Mini-Demo Canvas Component
// ============================================================================

interface DemoCanvasProps {
  unlockName: string;
  color: string;
  active: boolean;
}

const DemoCanvas: React.FC<DemoCanvasProps> = ({ unlockName, color, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = DEMO_RENDERERS[unlockName];
    if (!renderer) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = DEMO_W * dpr;
    canvas.height = DEMO_H * dpr;
    ctx.scale(dpr, dpr);

    startRef.current = performance.now();

    const animate = (now: number) => {
      const t = (now - startRef.current) / 1000;
      ctx.clearRect(0, 0, DEMO_W, DEMO_H);

      // Clip to rounded rect so game bg doesn't bleed into corners
      ctx.save();
      roundRect(ctx, 0, 0, DEMO_W, DEMO_H, 12);
      ctx.clip();

      // Run demo (renderers draw their own game background)
      renderer(ctx, t, color);

      ctx.restore();

      // Subtle border overlay
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = 1.5;
      roundRect(ctx, 0.5, 0.5, DEMO_W - 1, DEMO_H - 1, 12);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, unlockName, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: DEMO_W,
        height: DEMO_H,
        borderRadius: 12,
        boxShadow: `0 0 20px rgba(0,0,0,0.5), 0 0 40px ${color}15`,
      }}
    />
  );
};

// ============================================================================
// Floating Particles Background
// ============================================================================

const FloatingParticles: React.FC<{ color: string; active: boolean }> = ({ color, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number;
  }>>([]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Initialize particles
    const [r, g, b] = hexToRgb(color);
    particlesRef.current = Array.from({ length: 30 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.3 - Math.random() * 0.7,
      size: 1 + Math.random() * 3,
      alpha: 0.1 + Math.random() * 0.4,
      life: Math.random(),
    }));

    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.003;
        if (p.y < -10 || p.life > 1) {
          p.x = Math.random() * W;
          p.y = H + 10;
          p.life = 0;
        }
        const fade = Math.sin(p.life * Math.PI);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * fade})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

// ============================================================================
// Component
// ============================================================================

interface UnlockModalProps {
  unlock: UnlockPayload;
  onAcknowledge: () => void;
}

const UnlockModal: React.FC<UnlockModalProps> = ({ unlock, onAcknowledge }) => {
  const [phase, setPhase] = useState<ModalPhase>('enter');
  const [canAck, setCanAck] = useState(false);

  const hasDemo = !!DEMO_RENDERERS[unlock.name];

  // Phase state-machine driven by timeouts
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // 0ms → backdrop fades in (enter)
    // 300ms → icon slams in
    timers.push(setTimeout(() => setPhase('icon-slam'), 300));
    // 900ms → demo starts playing
    timers.push(setTimeout(() => setPhase('demo-play'), 900));
    // 2000ms → text reveals
    timers.push(setTimeout(() => setPhase('text-reveal'), 2000));
    // 2500ms → ready (all visible)
    timers.push(setTimeout(() => setPhase('ready'), 2500));
    // ACK_DELAY_MS → button activates
    timers.push(setTimeout(() => setCanAck(true), ACK_DELAY_MS));

    return () => timers.forEach(clearTimeout);
  }, []);

  const handleAcknowledge = useCallback(() => {
    if (!canAck) return;
    onAcknowledge();
  }, [canAck, onAcknowledge]);

  const isEnemy = unlock.type === 'ENEMY';
  const headerText = unlock.title || (isEnemy ? 'YENİ TEHDİT TESPİT EDİLDİ' : 'SİSTEM GÜNCELLEMESİ');
  const demoActive = ['demo-play', 'text-reveal', 'ready'].includes(phase);
  const textVisible = ['text-reveal', 'ready'].includes(phase);

  return (
    <div
      className={`
        fixed inset-0 z-[80] flex items-center justify-center
        transition-opacity duration-500
        ${phase === 'enter' ? 'opacity-0' : 'opacity-100'}
      `}
      style={{ touchAction: 'none' }}
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" />

      {/* Floating particles background */}
      <FloatingParticles color={unlock.color} active={phase !== 'enter'} />

      {/* Content card */}
      <div className="relative w-full max-w-sm mx-4 flex flex-col items-center gap-4">

        {/* ── Scan-lines decorative ── */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)',
          }}
        />

        {/* ── Header badge ── */}
        <div
          className={`
            text-xs font-black tracking-[0.35em] px-4 py-1.5 rounded-full
            border transition-all duration-500
            ${phase === 'enter'
              ? 'opacity-0 -translate-y-6 scale-90'
              : 'opacity-100 translate-y-0 scale-100'}
          `}
          style={{
            color: unlock.color,
            borderColor: `${unlock.color}66`,
            backgroundColor: `${unlock.color}12`,
            textShadow: `0 0 20px ${unlock.color}`,
          }}
        >
          {headerText}
        </div>

        {/* ── Icon slam ── */}
        <div
          className="flex items-center justify-center w-20 h-20 rounded-2xl"
          style={{
            background: `radial-gradient(circle, ${unlock.color}20 0%, transparent 70%)`,
            boxShadow: phase !== 'enter'
              ? `0 0 60px ${unlock.color}30, inset 0 0 30px ${unlock.color}10`
              : 'none',
            border: `2px solid ${unlock.color}40`,
            transform:
              phase === 'enter'
                ? 'scale(0) rotate(-20deg)'
                : phase === 'icon-slam'
                  ? 'scale(1.3) rotate(5deg)'
                  : 'scale(1) rotate(0deg)',
            transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease',
          }}
        >
          <span className="text-4xl select-none" role="img" aria-label={unlock.name}>
            {unlock.icon}
          </span>
        </div>

        {/* ── Feature name ── */}
        <h2
          className={`
            text-xl font-black tracking-[0.2em] text-center
            transition-all duration-500
          `}
          style={{
            color: unlock.color,
            textShadow: `0 0 30px ${unlock.color}80`,
            opacity: phase === 'enter' ? 0 : 1,
            transform: phase === 'enter' ? 'translateY(8px)' : 'translateY(0)',
          }}
        >
          {unlock.name}
        </h2>

        {/* ── Mini Demo Animation ── */}
        {hasDemo && (
          <div
            className="transition-all duration-700"
            style={{
              opacity: demoActive ? 1 : 0,
              transform: demoActive ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.95)',
            }}
          >
            <DemoCanvas
              unlockName={unlock.name}
              color={unlock.color}
              active={demoActive}
            />
          </div>
        )}

        {/* ── Description ── */}
        <p
          className={`
            text-sm text-white/75 text-center leading-relaxed max-w-[280px]
            transition-all duration-500
          `}
          style={{
            opacity: textVisible ? 1 : 0,
            transform: textVisible ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          {unlock.description}
        </p>

        {/* ── Decorative line ── */}
        <div
          className="w-48 h-px transition-all duration-700"
          style={{
            background: `linear-gradient(90deg, transparent, ${unlock.color}50, transparent)`,
            opacity: phase === 'ready' ? 1 : 0,
          }}
        />

        {/* ── ACKNOWLEDGE button ── */}
        <button
          onClick={handleAcknowledge}
          disabled={!canAck}
          className={`
            relative px-8 py-3 rounded-xl font-black text-sm
            tracking-[0.25em] transition-all duration-500
            ${canAck
              ? 'text-black active:scale-95'
              : 'text-white/30 cursor-not-allowed'}
          `}
          style={{
            background: canAck
              ? `linear-gradient(135deg, ${unlock.color}, ${unlock.color}CC)`
              : 'rgba(255,255,255,0.06)',
            boxShadow: canAck
              ? `0 0 30px ${unlock.color}50, 0 4px 15px rgba(0,0,0,0.3)`
              : 'none',
          }}
        >
          ANLADIM
          {/* Loading bar while locked */}
          {!canAck && (
            <div className="absolute bottom-0 left-0 h-0.5 rounded-b-xl overflow-hidden w-full">
              <div
                className="h-full rounded-b-xl"
                style={{
                  background: unlock.color,
                  animation: `ack-fill ${ACK_DELAY_MS}ms linear forwards`,
                }}
              />
            </div>
          )}
        </button>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes ack-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default UnlockModal;
