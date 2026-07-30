import React, { useEffect, useRef } from 'react';

const MenuBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Particles/Nodes
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      alphaSpeed: number;
    }> = Array.from({ length: 25 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 1,
      color: Math.random() > 0.6 ? '#a855f7' : '#00f0ff',
      alpha: Math.random() * 0.5 + 0.2,
      alphaSpeed: Math.random() * 0.01 + 0.005,
    }));

    // Grid lines
    let time = 0;

    const draw = () => {
      if (!ctx || !canvas) return;
      time += 0.005;

      // Dark background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#060a16');
      bgGrad.addColorStop(0.5, '#0a0e1c');
      bgGrad.addColorStop(1, '#020306');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Background ambient glows
      const glow1 = ctx.createRadialGradient(
        width / 2, -100, 10,
        width / 2, -100, width * 0.5
      );
      glow1.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
      glow1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, width, height);

      const glow2 = ctx.createRadialGradient(
        width * 0.2, height * 0.8, 10,
        width * 0.2, height * 0.8, width * 0.4
      );
      glow2.addColorStop(0, 'rgba(168, 85, 247, 0.04)');
      glow2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, width, height);

      // Draw subtle horizontal grid waves (Cyberpunk horizon)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.03)';
      ctx.lineWidth = 1;
      const waveCount = 5;
      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 20) {
          const yOffset = Math.sin(x * 0.003 + time + i) * 20 * Math.sin(time * 0.5);
          const y = height * 0.4 + (i * 40) + yOffset;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Draw and update ambient particles
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        // Wrap boundaries
        if (n.x < 0) n.x = width;
        if (n.x > width) n.x = 0;
        if (n.y < 0) n.y = height;
        if (n.y > height) n.y = 0;

        // Pulse alpha
        n.alpha += n.alphaSpeed;
        if (n.alpha > 0.8 || n.alpha < 0.1) {
          n.alphaSpeed = -n.alphaSpeed;
        }

        ctx.save();
        ctx.globalAlpha = n.alpha;
        ctx.fillStyle = n.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw thin lines connecting close particles
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15 * Math.min(nodes[i].alpha, nodes[j].alpha);
            ctx.strokeStyle = nodes[i].color === '#00f0ff' ? 'rgba(0, 240, 255, ' + alpha + ')' : 'rgba(168, 85, 247, ' + alpha + ')';
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

export default MenuBackground;
