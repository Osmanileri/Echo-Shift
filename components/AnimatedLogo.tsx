import React, { useEffect, useRef } from 'react';

const AnimatedLogo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const width = (canvas.width = 400);
    const height = (canvas.height = 100);

    let frame = 0;
    let glitchActive = false;
    let glitchTimer = 0;
    let glitchDuration = 0;

    const draw = () => {
      if (!ctx || !canvas) return;
      frame++;

      // Clear transparent
      ctx.clearRect(0, 0, width, height);

      // Handle random glitches
      glitchTimer++;
      if (!glitchActive && glitchTimer > 120 && Math.random() < 0.03) {
        glitchActive = true;
        glitchDuration = Math.floor(Math.random() * 8) + 3;
        glitchTimer = 0;
      }

      if (glitchActive) {
        glitchDuration--;
        if (glitchDuration <= 0) {
          glitchActive = false;
        }
      }

      const centerX = width / 2;
      const centerY = height / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const drawText = (text: string, xOffset = 0, yOffset = 0, color = '#ffffff', shadow = '') => {
        ctx.save();
        ctx.font = '900 36px Orbitron, sans-serif';
        ctx.fillStyle = color;
        ctx.letterSpacing = '6px';
        if (shadow) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = shadow;
        }
        ctx.fillText(text, centerX + xOffset, centerY + yOffset);
        ctx.restore();
      };

      if (glitchActive) {
        // Cyan color split
        drawText('ECHO SHIFT', -4 + Math.random() * 3, -1 + Math.random() * 2, '#00f0ff', '#00f0ff');
        // Magenta color split
        drawText('ECHO SHIFT', 4 - Math.random() * 3, 1 - Math.random() * 2, '#a855f7', '#a855f7');

        // Draw horizontal glitch lines
        if (Math.random() > 0.4) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
          ctx.fillRect(50, centerY - 10 + Math.random() * 20, 300, Math.random() * 4);
        }
      } else {
        // Ambient neon pulse glow
        const pulse = 10 + Math.abs(Math.sin(frame * 0.05)) * 12;
        
        // Draw glow layer underneath
        ctx.save();
        ctx.font = '900 36px Orbitron, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.letterSpacing = '6px';
        ctx.shadowBlur = pulse;
        ctx.shadowColor = '#00f0ff';
        ctx.fillText('ECHO SHIFT', centerX, centerY);
        ctx.restore();

        // Inner clean text
        drawText('ECHO SHIFT', 0, 0, '#ffffff');
      }

      // Subtitle scanline pulse
      ctx.save();
      ctx.font = '700 8px Orbitron, sans-serif';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.letterSpacing = '4px';
      ctx.fillText('ÇUBUK UZAR • HIZ ARTAR • HAYATTA KAL', centerX, centerY + 28);
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="flex items-center justify-center w-full max-w-[400px] mx-auto select-none pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-auto" />
    </div>
  );
};

export default AnimatedLogo;
