import React, { useEffect, useRef, useState } from 'react';
import * as AudioSystem from '../systems/audioSystem';
import { getHapticSystem } from '../systems/hapticSystem';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [touched, setTouched] = useState(false);

  // Simulated loading progress
  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 8 + 2;
      if (currentProgress >= 100) {
        currentProgress = 100;
        setLoadingComplete(true);
        clearInterval(interval);
      }
      setProgress(Math.floor(currentProgress));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Stars/particles
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      color: string;
      alpha: number;
    }> = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? '#00f0ff' : '#a855f7',
      alpha: Math.random(),
    }));

    // Grid properties
    let gridOffset = 0;

    // Glitch effect triggers
    let glitchTimer = 0;
    let isGlitching = false;
    let glitchDuration = 0;

    const draw = () => {
      if (!ctx || !canvas) return;

      // Clear with dark synthwave gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#040814');
      bgGrad.addColorStop(0.5, '#0a0d18');
      bgGrad.addColorStop(1, '#020307');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw perspective grid at bottom
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      const gridYStart = height * 0.55;
      gridOffset = (gridOffset + 1.2) % 40;

      // Horizontal lines with perspective
      for (let y = gridYStart; y < height; y += 20) {
        const relativeY = (y - gridYStart) / (height - gridYStart);
        const yOffset = gridYStart + relativeY * relativeY * (height - gridYStart) + gridOffset * relativeY;
        if (yOffset < height) {
          ctx.beginPath();
          ctx.moveTo(0, yOffset);
          ctx.lineTo(width, yOffset);
          ctx.stroke();
        }
      }

      // Vertical perspective lines
      const lineCount = 30;
      const spacing = width / lineCount;
      const centerX = width / 2;
      for (let i = -lineCount / 2; i <= lineCount / 2; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * spacing * 0.1, gridYStart);
        ctx.lineTo(centerX + i * spacing * 3, height);
        ctx.stroke();
      }

      // Draw and update particles
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Pulsing alpha
        p.alpha += Math.random() * 0.04 - 0.02;
        if (p.alpha < 0.2) p.alpha = 0.2;
        if (p.alpha > 0.9) p.alpha = 0.9;
      });

      // Handle random glitches
      glitchTimer++;
      if (!isGlitching && glitchTimer > 180 && Math.random() < 0.02) {
        isGlitching = true;
        glitchDuration = Math.floor(Math.random() * 12) + 4;
        glitchTimer = 0;
      }

      if (isGlitching) {
        glitchDuration--;
        if (glitchDuration <= 0) {
          isGlitching = false;
        }
      }

      // Render Title Logo with Glitch / Hologram Effect
      const logoX = width / 2;
      const logoY = height * 0.4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const drawLogoText = (text: string, xOffset = 0, yOffset = 0, color = '#ffffff', shadow = '') => {
        ctx.save();
        ctx.font = '900 48px Orbitron, sans-serif';
        ctx.fillStyle = color;
        if (shadow) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = shadow;
        }
        ctx.fillText(text, logoX + xOffset, logoY + yOffset);
        ctx.restore();
      };

      if (isGlitching) {
        // Cyan split
        drawLogoText('ECHO SHIFT', -5 + Math.random() * 4, -2 + Math.random() * 4, '#00f0ff', '#00f0ff');
        // Purple split
        drawLogoText('ECHO SHIFT', 5 - Math.random() * 4, 2 - Math.random() * 4, '#a855f7', '#a855f7');
        // Glitch slice line
        if (Math.random() > 0.3) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
          ctx.fillRect(0, logoY - 15 + Math.random() * 30, width, Math.random() * 10);
        }
      } else {
        // Beautiful glowing white text with slight cyan drop shadow
        drawLogoText('ECHO SHIFT', 0, 0, '#ffffff', '#00f0ff');
      }

      // Subtitle
      ctx.save();
      ctx.font = '700 12px Orbitron, sans-serif';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.letterSpacing = '8px';
      ctx.fillText('SYNTHESIZING FLOW', logoX, logoY + 45);
      ctx.restore();

      // Loading Progress or Start Prompt
      if (!loadingComplete) {
        // Draw loading bar
        const barWidth = 200;
        const barHeight = 4;
        const barX = (width - barWidth) / 2;
        const barY = height * 0.75;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Gradient for progress fill
        const progressGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        progressGrad.addColorStop(0, '#a855f7');
        progressGrad.addColorStop(1, '#00f0ff');

        ctx.fillStyle = progressGrad;
        ctx.fillRect(barX, barY, barWidth * (progress / 100), barHeight);

        ctx.font = '400 11px Orbitron, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(`LOADING SYSTEM... ${progress}%`, logoX, barY + 20);
      } else {
        // Pulsing "TOUCH TO START"
        const pulse = Math.abs(Math.sin(Date.now() / 400));
        ctx.save();
        ctx.font = '900 16px Orbitron, sans-serif';
        ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.6})`;
        ctx.shadowBlur = 10 * pulse;
        ctx.shadowColor = '#00f0ff';
        ctx.fillText('BASLA', logoX, height * 0.75);
        ctx.restore();

        ctx.font = '400 10px Orbitron, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText('DOKUN VE RİTMİ HİSSET', logoX, height * 0.75 + 24);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [loadingComplete, progress]);

  const handleStart = () => {
    if (!loadingComplete || touched) return;
    setTouched(true);

    // Audio iOS Unlock & Game start sound
    AudioSystem.initialize();
    AudioSystem.playGameStart();
    getHapticSystem().trigger('success');

    // Smooth transition
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <div
      onClick={handleStart}
      className="absolute inset-0 w-full h-full z-50 cursor-pointer overflow-hidden select-none touch-none"
      style={{ background: '#020307' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export default SplashScreen;
