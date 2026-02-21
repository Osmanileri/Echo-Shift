/**
 * Bonus VFX System — Professional visual effects for scoring events
 * 
 * Provides animated overlays rendered on the game canvas:
 * - Shockwave rings (overdrive/resonance destroy)
 * - Radial light rays (streak bonus, phantom combo)
 * - Screen flash (resonance destroy)
 * - Speed lines (rhythm multiplier)
 * - Floating emoji particles (special events)
 */

// ============ TYPES ============

export interface ShockwaveEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;       // 1.0 → 0.0
  color: string;
  lineWidth: number;
  speed: number;       // expansion rate per frame
}

export interface LightRayEffect {
  x: number;
  y: number;
  life: number;
  color: string;
  rayCount: number;
  rotation: number;
  rotationSpeed: number;
  maxLength: number;
}

export interface ScreenFlashEffect {
  life: number;
  color: string;
  intensity: number;   // 0.0-1.0
}

export interface SpeedLineEffect {
  life: number;
  color: string;
  count: number;
  direction: 'left' | 'converge';
}

export interface FloatingEmoji {
  x: number;
  y: number;
  vy: number;
  vx: number;
  emoji: string;
  life: number;
  scale: number;
  rotation: number;
  rotationSpeed: number;
}

export interface ScoreRipple {
  x: number;
  y: number;
  life: number;
  color: string;
  maxRadius: number;
}

// ============ STATE ============

const shockwaves: ShockwaveEffect[] = [];
const lightRays: LightRayEffect[] = [];
const screenFlashes: ScreenFlashEffect[] = [];
const speedLines: SpeedLineEffect[] = [];
const floatingEmojis: FloatingEmoji[] = [];
const scoreRipples: ScoreRipple[] = [];

// ============ SPAWN FUNCTIONS ============

/**
 * Overdrive destroy — golden shockwave + emoji sparks
 */
export function spawnOverdriveDestroy(x: number, y: number): void {
  // Double shockwave ring
  shockwaves.push({
    x, y,
    radius: 5,
    maxRadius: 80,
    life: 1.0,
    color: '#FFD700',
    lineWidth: 3,
    speed: 4.5,
  });
  shockwaves.push({
    x, y,
    radius: 5,
    maxRadius: 55,
    life: 1.0,
    color: '#FFA500',
    lineWidth: 2,
    speed: 3.0,
  });

  // Light rays
  lightRays.push({
    x, y,
    life: 1.0,
    color: '#FFD700',
    rayCount: 6,
    rotation: Math.random() * Math.PI,
    rotationSpeed: 0.03,
    maxLength: 45,
  });

  // Emoji sparks
  const emojis = ['💥', '⚡', '✨'];
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
    floatingEmojis.push({
      x, y,
      vx: Math.cos(angle) * 2.5,
      vy: Math.sin(angle) * 2.5 - 1.5,
      emoji: emojis[i],
      life: 1.0,
      scale: 0.8 + Math.random() * 0.4,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
    });
  }
}

/**
 * Resonance destroy — cyan shockwave + screen flash + crystal shatter
 */
export function spawnResonanceDestroy(x: number, y: number): void {
  // Expanding cyan ring
  shockwaves.push({
    x, y,
    radius: 5,
    maxRadius: 100,
    life: 1.0,
    color: '#00F0FF',
    lineWidth: 2.5,
    speed: 5.0,
  });

  // Screen flash
  screenFlashes.push({
    life: 1.0,
    color: '#00F0FF',
    intensity: 0.15,
  });

  // Crystal emoji particles
  const crystals = ['💎', '✦', '❄️'];
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.4;
    floatingEmojis.push({
      x, y,
      vx: Math.cos(angle) * 2.0,
      vy: Math.sin(angle) * 2.0 - 2.0,
      emoji: crystals[i % crystals.length],
      life: 1.2,
      scale: 0.7 + Math.random() * 0.3,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.08,
    });
  }

  // Ripple
  scoreRipples.push({
    x, y,
    life: 1.0,
    color: '#00F0FF',
    maxRadius: 60,
  });
}

/**
 * Construct stomp — heavy shockwave + ground impact
 */
export function spawnConstructStomp(x: number, y: number): void {
  // Heavy shockwave
  shockwaves.push({
    x, y,
    radius: 8,
    maxRadius: 70,
    life: 1.0,
    color: '#FFD700',
    lineWidth: 4,
    speed: 6.0,
  });

  // Impact emojis
  const impacts = ['💥', '🔨'];
  for (let i = 0; i < 2; i++) {
    floatingEmojis.push({
      x: x + (Math.random() - 0.5) * 30,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: -2.5 - Math.random() * 1.5,
      emoji: impacts[i],
      life: 1.0,
      scale: 0.9 + Math.random() * 0.3,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.12,
    });
  }
}

/**
 * Phantom pass — ghostly ripple + wisp emojis
 */
export function spawnPhantomPass(x: number, y: number): void {
  // Ghostly purple ripple
  scoreRipples.push({
    x, y,
    life: 1.0,
    color: '#9B59B6',
    maxRadius: 40,
  });

  // Wisp emoji
  floatingEmojis.push({
    x, y,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -1.5,
    emoji: '👻',
    life: 1.2,
    scale: 0.8,
    rotation: 0,
    rotationSpeed: 0.02,
  });
}

/**
 * Phantom near-miss combo — magenta flash + layered effects
 */
export function spawnPhantomCombo(x: number, y: number): void {
  // Magenta shockwave
  shockwaves.push({
    x, y,
    radius: 5,
    maxRadius: 65,
    life: 1.0,
    color: '#E91E63',
    lineWidth: 2.5,
    speed: 4.0,
  });

  // Light rays
  lightRays.push({
    x, y,
    life: 1.0,
    color: '#E91E63',
    rayCount: 8,
    rotation: Math.random() * Math.PI,
    rotationSpeed: 0.05,
    maxLength: 35,
  });

  // Screen flash
  screenFlashes.push({
    life: 1.0,
    color: '#E91E63',
    intensity: 0.1,
  });

  // Combo emojis
  const combos = ['🔥', '⭐', '✨'];
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i;
    floatingEmojis.push({
      x, y,
      vx: Math.cos(angle) * 1.8,
      vy: Math.sin(angle) * 1.8 - 1.5,
      emoji: combos[i],
      life: 1.0,
      scale: 0.8 + Math.random() * 0.3,
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.06,
    });
  }
}

/**
 * Rhythm multiplier score — speed lines + color burst
 */
export function spawnRhythmBonus(x: number, y: number, multiplier: number): void {
  const color = multiplier >= 3 ? '#FFD700' : '#00F0FF';

  // Speed lines emanating from player
  speedLines.push({
    life: 1.0,
    color,
    count: multiplier >= 3 ? 8 : 5,
    direction: 'left',
  });

  // Ripple at player
  scoreRipples.push({
    x, y,
    life: 1.0,
    color,
    maxRadius: multiplier >= 3 ? 50 : 35,
  });

  // Multiplier-specific emojis
  if (multiplier >= 3) {
    floatingEmojis.push({
      x, y,
      vx: 0,
      vy: -2.0,
      emoji: '🌟',
      life: 1.0,
      scale: 1.0,
      rotation: 0,
      rotationSpeed: 0.04,
    });
  }
}

/**
 * Near miss bonus — accent ripple 
 */
export function spawnNearMissBonus(x: number, y: number, color: string, isStreak: boolean): void {
  scoreRipples.push({
    x, y,
    life: 1.0,
    color,
    maxRadius: isStreak ? 50 : 30,
  });

  if (isStreak) {
    // Light rays for streak
    lightRays.push({
      x, y,
      life: 0.8,
      color: '#FFD700',
      rayCount: 6,
      rotation: Math.random() * Math.PI,
      rotationSpeed: 0.06,
      maxLength: 30,
    });
  }
}

// ============ UPDATE ============

const DECAY_RATE = 0.016; // ~60fps frame time

export function update(): void {
  // Shockwaves
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.radius += sw.speed;
    sw.life -= DECAY_RATE / 0.4; // ~0.4s lifetime
    if (sw.life <= 0 || sw.radius >= sw.maxRadius) {
      shockwaves.splice(i, 1);
    }
  }

  // Light rays
  for (let i = lightRays.length - 1; i >= 0; i--) {
    const lr = lightRays[i];
    lr.life -= DECAY_RATE / 0.5;
    lr.rotation += lr.rotationSpeed;
    if (lr.life <= 0) {
      lightRays.splice(i, 1);
    }
  }

  // Screen flashes
  for (let i = screenFlashes.length - 1; i >= 0; i--) {
    const sf = screenFlashes[i];
    sf.life -= DECAY_RATE / 0.2; // ~0.2s
    if (sf.life <= 0) {
      screenFlashes.splice(i, 1);
    }
  }

  // Speed lines
  for (let i = speedLines.length - 1; i >= 0; i--) {
    const sl = speedLines[i];
    sl.life -= DECAY_RATE / 0.35;
    if (sl.life <= 0) {
      speedLines.splice(i, 1);
    }
  }

  // Floating emojis
  for (let i = floatingEmojis.length - 1; i >= 0; i--) {
    const fe = floatingEmojis[i];
    fe.x += fe.vx;
    fe.y += fe.vy;
    fe.vy += 0.03; // gentle gravity
    fe.rotation += fe.rotationSpeed;
    fe.life -= DECAY_RATE / 0.8;
    if (fe.life <= 0) {
      floatingEmojis.splice(i, 1);
    }
  }

  // Score ripples
  for (let i = scoreRipples.length - 1; i >= 0; i--) {
    const sr = scoreRipples[i];
    sr.life -= DECAY_RATE / 0.45;
    if (sr.life <= 0) {
      scoreRipples.splice(i, 1);
    }
  }
}

// ============ RENDER ============

export function render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // --- Screen flashes (full-screen overlay, draw first) ---
  for (const sf of screenFlashes) {
    const alpha = sf.life * sf.intensity;
    if (alpha > 0.001) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = sf.color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  // --- Speed lines ---
  for (const sl of speedLines) {
    ctx.save();
    ctx.globalAlpha = sl.life * 0.4;
    ctx.strokeStyle = sl.color;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < sl.count; i++) {
      const y = Math.random() * height;
      const lineLen = 30 + Math.random() * 60;
      const x = Math.random() * width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - lineLen * sl.life, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Score ripples ---
  for (const sr of scoreRipples) {
    const progress = 1 - sr.life;
    const radius = sr.maxRadius * progress;
    const alpha = sr.life * 0.5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = sr.color;
    ctx.lineWidth = 2 * sr.life;
    ctx.beginPath();
    ctx.arc(sr.x, sr.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow
    if (sr.life > 0.5) {
      const gradient = ctx.createRadialGradient(sr.x, sr.y, 0, sr.x, sr.y, radius * 0.6);
      gradient.addColorStop(0, sr.color + '30');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sr.x, sr.y, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Shockwaves ---
  for (const sw of shockwaves) {
    ctx.save();
    ctx.globalAlpha = sw.life * 0.7;
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = sw.lineWidth * sw.life;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Outer glow ring
    ctx.globalAlpha = sw.life * 0.2;
    ctx.lineWidth = sw.lineWidth * sw.life * 3;
    ctx.shadowColor = sw.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // --- Light rays ---
  for (const lr of lightRays) {
    ctx.save();
    ctx.globalAlpha = lr.life * 0.35;
    ctx.translate(lr.x, lr.y);
    ctx.rotate(lr.rotation);

    const rayAngle = (Math.PI * 2) / lr.rayCount;
    const rayWidth = 3;
    const rayLength = lr.maxLength * (1 - (1 - lr.life) * 0.3);

    for (let i = 0; i < lr.rayCount; i++) {
      const angle = rayAngle * i;
      ctx.save();
      ctx.rotate(angle);

      // Gradient ray
      const gradient = ctx.createLinearGradient(0, 0, rayLength, 0);
      gradient.addColorStop(0, lr.color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(0, -rayWidth);
      ctx.lineTo(rayLength, 0);
      ctx.lineTo(0, rayWidth);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // --- Floating emojis ---
  for (const fe of floatingEmojis) {
    ctx.save();
    ctx.globalAlpha = Math.min(fe.life, 1.0);
    ctx.translate(fe.x, fe.y);
    ctx.rotate(fe.rotation);
    const size = 16 * fe.scale * (0.5 + fe.life * 0.5);
    ctx.font = `${Math.round(size)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fe.emoji, 0, 0);
    ctx.restore();
  }
}

// ============ RESET ============

export function reset(): void {
  shockwaves.length = 0;
  lightRays.length = 0;
  screenFlashes.length = 0;
  speedLines.length = 0;
  floatingEmojis.length = 0;
  scoreRipples.length = 0;
}

/**
 * Returns true if any effects are currently active
 */
export function hasActiveEffects(): boolean {
  return shockwaves.length > 0 ||
    lightRays.length > 0 ||
    screenFlashes.length > 0 ||
    speedLines.length > 0 ||
    floatingEmojis.length > 0 ||
    scoreRipples.length > 0;
}
