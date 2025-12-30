import { playButtonClick } from './audioSystem';
import { TutorialState } from './interactiveTutorialSystem';

// Track last played sound index for typewriter effect
let lastSoundIndex = 0;
let lastMessageId = '';

/**
 * Handles rendering of tutorial overlay messages (non-intro).
 * Implements the "Top-Pop" animation system with typewriter text effect.
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
        const POP_DURATION = 300;       // Entrance (Quick pop)
        const STAY_DURATION = 3500;     // Read time (extended for slower typewriter)
        const SHRINK_DURATION = 400;    // Shrink animation

        // Dynamic State
        let animScale = 1.0;
        let animPanelAlpha = 0;

        // Position: Bottom for "BIRAK" prompts, Top for other messages
        const isBottomPrompt = msg.text.includes('BIRAK');
        const animY = isBottomPrompt ? height * 0.85 : height * 0.12;

        // Total time trackers
        const phase1End = POP_DURATION;
        const phase2End = POP_DURATION + STAY_DURATION;
        const phase3End = phase2End + SHRINK_DURATION;

        // --- ANIMATION LOGIC ---
        if (elapsed < phase1End) {
            // Phase 0: ENTRANCE (Quick Pop)
            const t = elapsed / POP_DURATION;
            // Smooth ease-out
            const easeOut = 1 - Math.pow(1 - t, 3);

            animScale = 0.8 + (0.2 * easeOut); // 0.8 -> 1.0
            animPanelAlpha = easeOut * 0.9;

        } else if (elapsed < phase2End) {
            // Phase 1: STAY (Reading with typewriter)
            animScale = 1.0;
            animPanelAlpha = 0.9;

        } else if (elapsed < phase3End) {
            // Phase 2: SHRINK IN PLACE
            const t = (elapsed - phase2End) / SHRINK_DURATION;
            const smoothT = t * t * (3 - 2 * t); // Smoothstep

            animScale = 1.0 - ((1.0 - 0.85) * smoothT); // 1.0 -> 0.85
            animPanelAlpha = 0.9;

        } else {
            // Phase 3: DOCKED (Compact)
            animScale = 0.85;
            animPanelAlpha = 0.85;
        }

        // Global Fade Out at end of duration (extended window)
        const remaining = msg.duration - elapsed;
        if (remaining < 800) {
            const fade = Math.max(0, remaining / 800);
            animPanelAlpha *= fade;
            ctx.globalAlpha = fade;
        }

        // Apply Transformations
        ctx.save();
        ctx.translate(width / 2, animY);
        ctx.scale(animScale, animScale);

        // Responsive Layout
        const fullText = msg.text;
        const lines = fullText.split('\n').filter(line => line.trim() !== '');
        const lineHeight = 18;
        const fontSize = 14;
        const totalTextHeight = lines.length * lineHeight;
        const pPadding = 14;
        // Limit width to 80% of screen or Max 280px (Mobile Friendly)
        const pWidth = Math.min(width * 0.80, 280);
        const pHeight = totalTextHeight + pPadding * 2;

        // Draw Panel (Centered at 0,0)
        ctx.fillStyle = `rgba(0, 0, 0, ${animPanelAlpha})`;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(-pWidth / 2, -pHeight / 2, pWidth, pHeight, 12);
        } else {
            ctx.rect(-pWidth / 2, -pHeight / 2, pWidth, pHeight);
        }
        ctx.fill();

        // Neon Border
        ctx.strokeStyle = `rgba(0, 240, 255, ${animPanelAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // --- TYPEWRITER TEXT EFFECT ---
        // Calculate visible characters based on elapsed time
        const CHARS_PER_SECOND = 22; // Slower typing speed
        const typewriterDelay = POP_DURATION; // Start typewriter after pop
        const typewriterElapsed = Math.max(0, elapsed - typewriterDelay);
        const totalChars = fullText.length;
        const visibleChars = Math.min(totalChars, Math.floor(typewriterElapsed * CHARS_PER_SECOND / 1000));

        // Typewriter Sound Effect - play every 3 characters
        const messageId = msg.text.substring(0, 20); // Use first chars as ID
        if (messageId !== lastMessageId) {
            lastMessageId = messageId;
            lastSoundIndex = 0;
        }
        const currentSoundIndex = Math.floor(visibleChars / 3);
        if (currentSoundIndex > lastSoundIndex && visibleChars < totalChars) {
            lastSoundIndex = currentSoundIndex;
            playButtonClick();
        }

        // Build visible text
        let charsRemaining = visibleChars;
        const visibleLines: string[] = [];

        for (const line of lines) {
            if (charsRemaining <= 0) {
                visibleLines.push('');
            } else if (charsRemaining >= line.length) {
                visibleLines.push(line);
                charsRemaining -= line.length + 1; // +1 for newline
            } else {
                visibleLines.push(line.substring(0, charsRemaining));
                charsRemaining = 0;
            }
        }

        // Text Rendering
        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textStartY = -(totalTextHeight / 2) + (lineHeight / 2);

        visibleLines.forEach((line, index) => {
            if (line) {
                const lineY = textStartY + index * lineHeight;
                ctx.fillStyle = `rgba(255, 255, 255, ${animPanelAlpha})`;
                // Use maxWidth to prevent text overflow
                ctx.fillText(line, 0, lineY, pWidth - pPadding * 2);
            }
        });

        ctx.restore();
    }

    /**
     * Matrix Style "ŞİMDİ BIRAK" Cinematic Overlay
     * Sadece SWAP_MECHANIC fazında, SubPhase 2 iken çalışır.
     * Ekranı karartır ve devasa, neon parlamalı "ŞİMDİ BIRAK!" yazısı gösterir.
     */
    static renderCinematicAction(
        ctx: CanvasRenderingContext2D,
        state: TutorialState,
        width: number,
        height: number
    ): void {
        // Sadece Swap Fazı ve Action Prompt alt fazında çalış
        if (state.currentPhase !== 'SWAP_MECHANIC' || state.swapSubPhase !== 2) return;

        const time = Date.now();
        const pulse = Math.sin(time / 100); // Hızlı nabız efekti

        ctx.save();

        // 1. Sinematik Karartma (Hafif Vignette - Oyun görünür kalsın)
        // Merkez şeffaf, kenarlar hafif karanlık
        const gradient = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.8);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)"); // Merkez tamamen şeffaf
        gradient.addColorStop(0.7, "rgba(0, 0, 0, 0.2)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.6)"); // Kenarlar hafif karanlık
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // 2. "ŞİMDİ BIRAK!" Yazısı (Ekranın Altında)
        // Yazı okunabilirliği için arkasına hafif bir glow/gölge paneli ekleyelim
        const textY = height * 0.75;
        const scale = 1.0 + (pulse * 0.05); // Hafif büyüme/küçülme

        ctx.translate(width / 2, textY);
        ctx.scale(scale, scale);

        // Neon Glow Efekti
        ctx.shadowColor = "#00F0FF";
        ctx.shadowBlur = 20 + (pulse * 10);

        ctx.font = "bold 40px 'Arial Black', sans-serif";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("ŞİMDİ DÖNDÜR!", 0, 0);

        // Glitch Efekti (Rastgele kayan kırmızı/mavi katmanlar)
        if (Math.random() > 0.8) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
            ctx.fillText("ŞİMDİ DÖNDÜR!", 2, 0); // Kırmızı kayma
            ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
            ctx.fillText("ŞİMDİ DÖNDÜR!", -2, 0); // Cyan kayma
        }

        // 3. Tap/Dönme İkonu
        ctx.translate(0, 60);

        // Dış halka
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.stroke();

        // İç dolu daire (Buton hissi)
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + pulse * 0.2})`;
        ctx.fill();

        ctx.restore();
    }
}
