/**
 * Tutorial Intro Renderer - Modular intro screen rendering
 * Handles the 3-stage intro animation for the tutorial:
 * - Stage 1: Large welcome title
 * - Stage 2: Orbs explanation with visual
 * - Stage 3: Instructions panel
 */

import * as AudioSystem from './audioSystem';

// ============================================================================
// TYPES
// ============================================================================

export interface IntroRenderState {
    lineIndex: number;
    lineElapsed: number;
    displayText: string;
    cursorVisible: boolean;
    typeProgress: number;
    alpha: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHAR_SOUND_INTERVAL = 60; // ms between typewriter clicks

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render the tutorial intro screen
 * @param ctx Canvas 2D rendering context
 * @param state Current intro render state
 * @param width Canvas width
 * @param height Canvas height
 * @param lastCharSoundRef Reference to track last char sound index
 */
export function render(
    ctx: CanvasRenderingContext2D,
    state: IntroRenderState,
    width: number,
    height: number,
    lastCharSoundRef: { current: number }
): void {
    const { lineIndex, lineElapsed, displayText, cursorVisible, typeProgress, alpha } = state;

    // Typewriter sound effect
    const charSoundIndex = Math.floor(lineElapsed / CHAR_SOUND_INTERVAL);
    if (charSoundIndex !== lastCharSoundRef.current && displayText.length > 0 && typeProgress < 1) {
        lastCharSoundRef.current = charSoundIndex;
        AudioSystem.playButtonClick();
    }

    ctx.save();

    // ===== Stage-specific intro layouts =====
    const isTitle = lineIndex === 0;
    const isOrbsStage = lineIndex === 1;
    const isInstructions = lineIndex === 2;
    const isStartLine = lineIndex === 3;

    if (isTitle) {
        renderTitleStage(ctx, displayText, cursorVisible, typeProgress, alpha, width, height);
    } else if (isOrbsStage) {
        renderOrbsStage(ctx, displayText, cursorVisible, typeProgress, alpha, width, height);
    } else if (isInstructions) {
        // Pass lineElapsed for animation
        renderInstructionsStage(ctx, displayText, cursorVisible, alpha, width, height, lineElapsed);
    } else if (isStartLine) {
        renderStartStage(ctx, displayText, cursorVisible, alpha, width, height);
    }

    ctx.restore();
}

// ============================================================================
// STAGE 1: TITLE
// ============================================================================

function renderTitleStage(
    ctx: CanvasRenderingContext2D,
    displayText: string,
    cursorVisible: boolean,
    typeProgress: number,
    alpha: number,
    width: number,
    height: number
): void {
    // Smaller title, no border/underline - clean look
    const fontSize = 22;
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;

    ctx.fillText(displayText + (cursorVisible ? '|' : ''), width / 2, height * 0.42);
}

// ============================================================================
// STAGE 2: ORBS EXPLANATION
// ============================================================================

function renderOrbsStage(
    ctx: CanvasRenderingContext2D,
    displayText: string,
    cursorVisible: boolean,
    typeProgress: number,
    alpha: number,
    width: number,
    height: number
): void {
    const panelWidth = Math.min(width * 0.92, 340);
    const panelHeight = 160;
    const panelX = (width - panelWidth) / 2;
    const panelY = height * 0.35 - panelHeight / 2;

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 14);
    ctx.fill();
    ctx.strokeStyle = `rgba(0, 240, 255, 0.8)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Text at top
    const fontSize = 15;
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;

    // Word wrap for text
    const maxTextWidth = panelWidth - 30;
    const textLines = wrapText(ctx, displayText, maxTextWidth);

    const textY = panelY + 35;
    textLines.forEach((tl, i) => {
        const isLast = i === textLines.length - 1;
        ctx.fillText(tl + (isLast && cursorVisible ? '|' : ''), width / 2, textY + i * 20);
    });

    // Orbs visual with blink effect
    if (typeProgress > 0.5) {
        renderOrbs(ctx, panelX, panelY, panelWidth, panelHeight, typeProgress, alpha, width);
    }
}

function renderOrbs(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    panelWidth: number,
    panelHeight: number,
    typeProgress: number,
    alpha: number,
    width: number
): void {
    // VERTICAL orbs layout (top = white, bottom = black)
    const orbX = width / 2;
    const orbSpacing = 50; // vertical distance
    const orbRadius = 14;
    const centerY = panelY + panelHeight - 55;

    // Blink animation: pulse 2 times
    const blinkPhase = (typeProgress - 0.5) * 4;
    const blinkAlpha = blinkPhase < 2
        ? 0.5 + 0.5 * Math.sin(blinkPhase * Math.PI * 2)
        : 1;

    ctx.globalAlpha = blinkAlpha * alpha;

    // White orb (top)
    ctx.beginPath();
    ctx.arc(orbX, centerY - orbSpacing / 2, orbRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Black orb (bottom)
    ctx.beginPath();
    ctx.arc(orbX, centerY + orbSpacing / 2, orbRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#111111';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.stroke();

    // Vertical connecting line
    ctx.beginPath();
    ctx.moveTo(orbX, centerY - orbSpacing / 2 + orbRadius + 3);
    ctx.lineTo(orbX, centerY + orbSpacing / 2 - orbRadius - 3);
    ctx.strokeStyle = `rgba(0, 240, 255, ${blinkAlpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ============================================================================
// STAGE 3: INSTRUCTIONS
// ============================================================================

function renderInstructionsStage(
    ctx: CanvasRenderingContext2D,
    displayText: string,
    cursorVisible: boolean,
    alpha: number,
    width: number,
    height: number,
    lineElapsed: number
): void {
    const panelWidth = Math.min(width * 0.95, 360);
    const panelHeight = 220; // Taller for visual
    const panelX = (width - panelWidth) / 2;
    const panelY = height * 0.40 - panelHeight / 2;

    // Panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
    ctx.fill();
    ctx.strokeStyle = `rgba(0, 240, 255, 0.8)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Text (Higher up)
    const fontSize = 14;
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;

    // Word wrap
    const maxW = panelWidth - 30;
    const instrLines = wrapText(ctx, displayText, maxW);

    const iStartY = panelY + 40; // Fixed top position
    instrLines.forEach((il, idx) => {
        const isL = idx === instrLines.length - 1;
        ctx.fillText(il + (isL && cursorVisible ? '|' : ''), width / 2, iStartY + idx * 18);
    });

    // Draw Mini Animation
    const animHeight = 100;
    const animY = panelY + panelHeight - animHeight - 15;
    const animW = panelWidth - 40;
    const animX = panelX + 20;

    // Only draw if text has started showing
    if (alpha > 0.1) {
        renderMiniGameVisual(ctx, animX, animY, animW, animHeight, lineElapsed, alpha);
    }
}

function renderMiniGameVisual(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    time: number,
    alpha: number
) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // Clip to box
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.clip();

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.8)';
    ctx.fill();

    // Lanes
    const cx = x + w / 2;
    const spacing = 50;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y + h);
    ctx.stroke();

    const speed = 0.15;
    const loopH = 160;
    const offset = (time * speed) % loopH;

    // Draw Moving Blocks (Standard gameplay: White passes white, Black passes black)
    const drawBlock = (bx: number, byOffset: number, color: string, isWhite: boolean) => {
        // Calculate Y wrapping
        const startY = -40; // Start above
        const travel = h + 80; // Total travel distance

        // Loop position
        let by = (offset + byOffset) % travel;
        const drawY = y + by - 40;

        if (drawY > y - 40 && drawY < y + h) {
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(bx - 20, drawY, 40, 25, 4);
            ctx.fill();

            // Symbol inside
            ctx.fillStyle = isWhite ? '#000' : '#fff';
            ctx.shadowBlur = 0;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(isWhite ? 'W' : 'B', bx, drawY + 12.5);
        }
    };

    // Left Lane (White Block)
    drawBlock(cx - spacing, 0, '#ffffff', true);

    // Right Lane (Black Block)
    drawBlock(cx + spacing, 80, '#222222', false);

    // Draw Player Orbs (Fixed at bottom)
    const orbY = y + h - 25;

    // Connector
    ctx.beginPath();
    ctx.moveTo(cx - spacing + 10, orbY);
    ctx.lineTo(cx + spacing - 10, orbY);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // White Orb (Left)
    ctx.beginPath();
    ctx.arc(cx - spacing, orbY, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Black Orb (Right)
    ctx.beginPath();
    ctx.arc(cx + spacing, orbY, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#111111';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
}

// ============================================================================
// STAGE 4: START LINE
// ============================================================================

function renderStartStage(
    ctx: CanvasRenderingContext2D,
    displayText: string,
    cursorVisible: boolean,
    alpha: number,
    width: number,
    height: number
): void {
    // Large centered text, no panel - excitement
    const fontSize = 26;
    ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00f0ff'; // Cyan for excitement
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 25;

    ctx.fillText(displayText + (cursorVisible ? '|' : ''), width / 2, height * 0.42);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Word wrap helper function
 */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        if (ctx.measureText(testLine).width < maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
}

// ============================================================================
// INTRO STATE CALCULATOR
// ============================================================================

/**
 * Calculate intro render state from tutorial state
 */
export function calculateIntroState(
    introStoryStartTime: number,
    currentMessage: string
): IntroRenderState | null {
    const stepTime = Date.now() - introStoryStartTime;
    const INTRO_DELAY = 800;
    const LINE_DURATION = 3500; // 3.5s per line (slower pacing)
    const FADE_DURATION = 500;  // 0.5s fade transitions

    // Current line index and progress
    const lineIndex = Math.floor((stepTime - INTRO_DELAY) / LINE_DURATION);
    const lineElapsed = (stepTime - INTRO_DELAY) % LINE_DURATION;

    // Get lines from message
    const lines = currentMessage.split('\n').filter(line => line.trim() !== '');

    // Only render if past initial delay and have lines
    if (stepTime <= INTRO_DELAY || lineIndex >= lines.length) {
        return null;
    }

    const currentLine = lines[Math.min(lineIndex, lines.length - 1)];

    // Calculate fade
    let alpha = 1;
    if (lineElapsed < FADE_DURATION) {
        alpha = lineElapsed / FADE_DURATION;
    } else if (lineElapsed > LINE_DURATION - FADE_DURATION) {
        alpha = (LINE_DURATION - lineElapsed) / FADE_DURATION;
    }

    // Typewriter progress
    const typeProgress = Math.min(1, lineElapsed / (LINE_DURATION * 0.5));
    const charsToShow = Math.floor(currentLine.length * typeProgress);
    const displayText = currentLine.substring(0, charsToShow);
    const cursorVisible = typeProgress < 1 && Math.floor(stepTime / 400) % 2 === 0;

    return {
        lineIndex,
        lineElapsed,
        displayText,
        cursorVisible,
        typeProgress,
        alpha
    };
}
