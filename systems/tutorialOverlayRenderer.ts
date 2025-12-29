import { TutorialState } from './interactiveTutorialSystem';

/**
 * Handles rendering of tutorial overlay messages (non-intro).
 * Implements the "Top-Pop" animation system.
 */
export class TutorialOverlayRenderer {
    static render(
        ctx: CanvasRenderingContext2D,
        state: TutorialState,
        width: number,
        height: number
    ): void {
        const msg = state.currentMessage;
        if (!msg) return;

        const now = Date.now();
        const elapsed = now - msg.startTime;

        // Timing Constants
        const POP_DURATION = 400;      // Entrance (Elastic)
        const STAY_DURATION = 1500;    // Read time
        const MOVE_DURATION = 600;     // Move to top

        // Dynamic State
        let animScale = 0;
        let animY = height * 0.15;
        let animPanelAlpha = 0;

        // Total time trackers
        const phase1End = POP_DURATION;
        const phase2End = POP_DURATION + STAY_DURATION;
        const phase3End = phase2End + MOVE_DURATION;

        // --- ANIMATION LOGIC ---
        // Requirement: "Appear at TOP large, then shrink. Do NOT cover center."

        // Fixed Top Position (15% from top)
        animY = height * 0.15;

        if (elapsed < phase1End) {
            // Phase 0: ENTRANCE (Elastic Pop at Top)
            const t = elapsed / POP_DURATION;
            // Elastic Out Easing
            const c1 = 1.70158;
            const c3 = c1 + 1;
            const backOut = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);

            animScale = backOut * 1.35; // Pop to Large (1.35x)
            animPanelAlpha = Math.min(1, t * 2);

        } else if (elapsed < phase2End) {
            // Phase 1: STAY LARGE (Reading)
            animScale = 1.35;
            animPanelAlpha = 0.9;

        } else if (elapsed < phase3End) {
            // Phase 2: SHRINK IN PLACE
            const t = (elapsed - phase2End) / MOVE_DURATION; // 0-1
            const smoothT = t * t * (3 - 2 * t); // Smoothstep

            animScale = 1.35 - ((1.35 - 0.9) * smoothT); // 1.35 -> 0.9
            animPanelAlpha = 0.9;

        } else {
            // Phase 3: DOCKED (Compact)
            animScale = 0.9;
            animPanelAlpha = 0.9;
        }

        // Global Fade Out at end of duration
        const remaining = msg.duration - elapsed;
        if (remaining < 500) {
            animPanelAlpha *= Math.max(0, remaining / 500); // Fade alpha directly
            ctx.globalAlpha = Math.max(0, remaining / 500);
        }

        // Apply Transformations
        ctx.translate(width / 2, animY);
        ctx.scale(animScale, animScale);

        // Responsive Layout
        const lines = msg.text.split('\n').filter(line => line.trim() !== '');
        const lineHeight = 22;
        const fontSize = 18;
        const totalTextHeight = lines.length * lineHeight;
        const pPadding = 20;
        // Limit width to 85% of screen or Max 340px (Mobile Friendly)
        const pWidth = Math.min(width * 0.85, 340);
        const pHeight = totalTextHeight + pPadding * 2;

        // Draw Panel (Centered at 0,0)
        ctx.fillStyle = `rgba(0, 0, 0, ${animPanelAlpha})`;
        ctx.beginPath();
        // Check for roundRect support, fallback if needed (though widely supported now)
        if (ctx.roundRect) {
            ctx.roundRect(-pWidth / 2, -pHeight / 2, pWidth, pHeight, 16);
        } else {
            ctx.rect(-pWidth / 2, -pHeight / 2, pWidth, pHeight);
        }
        ctx.fill();

        // Neon Border (Pulsing?)
        ctx.strokeStyle = `rgba(0, 240, 255, ${animPanelAlpha})`; // Use alpha
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10 + Math.sin(now / 100) * 5; // Subtle pulse
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Text Rendering
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textStartY = -(totalTextHeight / 2) + (lineHeight / 2);

        lines.forEach((line, index) => {
            const lineY = textStartY + index * lineHeight;
            ctx.fillStyle = `rgba(255, 255, 255, ${animPanelAlpha})`; // Fade text too
            ctx.fillText(line, 0, lineY);
        });
    }
}
