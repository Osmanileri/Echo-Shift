/**
 * Particle System - Requirements 12.1, 12.2, 12.3, 12.4, 12.5
 * 
 * Manages particle effects for trail, burst, and spark effects.
 * Uses object pooling for performance optimization.
 */

// Particle interface - Requirements 12.4
export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'trail' | 'burst' | 'spark';
}

// Particle configuration - Requirements 12.4
export interface ParticleConfig {
  count: number;
  speed: { min: number; max: number };
  size: { min: number; max: number };
  life: { min: number; max: number };
  colors: string[];
  spread: number;
  gravity: number;
  baseAngle?: number; // Optional base direction for particles (radians)
}

// Default configurations for different particle types
export const PARTICLE_CONFIGS: Record<string, ParticleConfig> = {
  trail: {
    count: 1,
    speed: { min: 0.5, max: 1.5 },
    size: { min: 2, max: 4 },
    life: { min: 0.3, max: 0.6 },
    colors: ['#00F0FF', '#00CCFF'],
    spread: 0.4,
    gravity: 0,
    baseAngle: Math.PI, // Trail particles go backward (left, behind the orb)
  },
  burst: {
    count: 12,
    speed: { min: 3, max: 8 },
    size: { min: 3, max: 6 },
    life: { min: 0.4, max: 0.8 },
    colors: ['#00F0FF', '#FF00FF', '#FFFFFF'],
    spread: Math.PI * 2,
    gravity: 0.1,
  },
  spark: {
    count: 6,
    speed: { min: 4, max: 10 },
    size: { min: 2, max: 4 },
    life: { min: 0.3, max: 0.5 },
    colors: ['#FFD700', '#FFA500', '#FF6600'],
    spread: Math.PI * 0.5,
    gravity: 0.2,
  },
};

// Maximum particles in pool - Requirements 12.5
const MAX_PARTICLES = 200;

// Particle pool for object reuse
let particlePool: Particle[] = [];
let activeParticles: Particle[] = [];
let particleIdCounter = 0;

/**
 * Generates a unique particle ID
 */
function generateParticleId(): string {
  return `p_${++particleIdCounter}`;
}

/**
 * Random number in range utility
 */
function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Gets a particle from pool or creates new one
 * Requirements 12.5: Particle pool management
 */
function getParticleFromPool(): Particle | null {
  // Check if we've hit the max limit
  if (activeParticles.length >= MAX_PARTICLES) {
    // Remove oldest particle to make room
    const oldest = activeParticles.shift();
    if (oldest) {
      particlePool.push(oldest);
    }
  }
  
  // Try to reuse from pool
  if (particlePool.length > 0) {
    return particlePool.pop()!;
  }
  
  // Create new particle
  return {
    id: generateParticleId(),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 1,
    maxLife: 1,
    size: 3,
    color: '#FFFFFF',
    alpha: 1,
    type: 'trail',
  };
}

/**
 * Returns a particle to the pool
 * Requirements 12.5: Remove particle when lifetime expires
 */
function returnToPool(particle: Particle): void {
  particlePool.push(particle);
}

/**
 * Creates a single particle with given configuration
 * Requirements 12.4: Assign velocity, lifetime, color, and size based on config
 */
function createParticle(
  x: number,
  y: number,
  type: 'trail' | 'burst' | 'spark',
  config: ParticleConfig,
  angle?: number
): Particle | null {
  const particle = getParticleFromPool();
  if (!particle) return null;
  
  // Calculate velocity based on spread and optional angle
  // If config has baseAngle, use it as center direction with spread around it
  const configBaseAngle = config.baseAngle ?? 0;
  const spreadAngle = randomRange(-config.spread / 2, config.spread / 2);
  const finalAngle = angle ?? (configBaseAngle + spreadAngle);
  const speed = randomRange(config.speed.min, config.speed.max);
  
  particle.id = generateParticleId();
  particle.x = x;
  particle.y = y;
  particle.vx = Math.cos(finalAngle) * speed;
  particle.vy = Math.sin(finalAngle) * speed;
  particle.life = randomRange(config.life.min, config.life.max);
  particle.maxLife = particle.life;
  particle.size = randomRange(config.size.min, config.size.max);
  particle.color = config.colors[Math.floor(Math.random() * config.colors.length)];
  particle.alpha = 1;
  particle.type = type;
  
  return particle;
}

/**
 * Emits particles at a position with given configuration
 * Requirements 12.1, 12.2, 12.3
 */
export function emit(x: number, y: number, config: ParticleConfig, type: 'trail' | 'burst' | 'spark'): void {
  for (let i = 0; i < config.count; i++) {
    // For burst, distribute angles evenly
    let angle: number | undefined;
    if (type === 'burst') {
      angle = (i / config.count) * Math.PI * 2;
    }
    
    const particle = createParticle(x, y, type, config, angle);
    if (particle) {
      activeParticles.push(particle);
    }
  }
}

/**
 * Emits trail particles behind the orb based on movement speed
 * Requirements 12.1: Emit trail particles based on movement speed
 */
export function emitTrail(x: number, y: number, speed: number, colors?: string[]): void {
  // Emission rate based on speed - faster = more particles
  const emissionChance = Math.min(speed / 10, 1);
  
  if (Math.random() < emissionChance) {
    const config = { 
      ...PARTICLE_CONFIGS.trail,
      colors: colors ?? PARTICLE_CONFIGS.trail.colors,
    };
    // Adjust particle count based on speed
    config.count = Math.ceil(speed / 3);
    
    emit(x, y, config, 'trail');
  }
}

/**
 * Emits burst particles at swap location
 * Requirements 12.2: Emit burst of particles at swap location
 */
export function emitBurst(x: number, y: number, colors?: string[]): void {
  const config = {
    ...PARTICLE_CONFIGS.burst,
    colors: colors ?? PARTICLE_CONFIGS.burst.colors,
  };
  emit(x, y, config, 'burst');
}

/**
 * Emits spark particles at near miss point
 * Requirements 12.3: Emit spark particles at near miss point
 */
export function emitSpark(x: number, y: number, colors?: string[]): void {
  const config = {
    ...PARTICLE_CONFIGS.spark,
    colors: colors ?? PARTICLE_CONFIGS.spark.colors,
  };
  emit(x, y, config, 'spark');
}

/**
 * Updates all active particles
 * Requirements 12.4, 12.5: Update particles and remove expired ones
 */
export function update(deltaTime: number): void {
  const dt = deltaTime / 16.67; // Normalize to ~60fps
  
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const particle = activeParticles[i];
    
    // Update position
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    
    // Apply gravity based on type
    const config = PARTICLE_CONFIGS[particle.type];
    if (config) {
      particle.vy += config.gravity * dt;
    }
    
    // Update lifetime
    particle.life -= deltaTime / 1000;
    
    // Update alpha based on remaining life
    particle.alpha = Math.max(0, particle.life / particle.maxLife);
    
    // Requirements 12.5: Remove particle when lifetime expires
    if (particle.life <= 0) {
      activeParticles.splice(i, 1);
      returnToPool(particle);
    }
  }
}

/**
 * Renders all active particles to canvas
 */
export function render(ctx: CanvasRenderingContext2D): void {
  for (const particle of activeParticles) {
    ctx.save();
    ctx.globalAlpha = particle.alpha;
    ctx.fillStyle = particle.color;
    
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Add glow effect for burst and spark particles
    if (particle.type === 'burst' || particle.type === 'spark') {
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = particle.size * 2;
      ctx.fill();
    }
    
    ctx.restore();
  }
}

/**
 * Gets all active particles (for testing/debugging)
 */
export function getActiveParticles(): Particle[] {
  return [...activeParticles];
}

/**
 * Gets particle count
 */
export function getParticleCount(): number {
  return activeParticles.length;
}

/**
 * Clears all particles and resets the system
 */
export function reset(): void {
  // Return all active particles to pool
  while (activeParticles.length > 0) {
    const particle = activeParticles.pop();
    if (particle) {
      particlePool.push(particle);
    }
  }
}

/**
 * Creates the particle system interface
 */
export interface ParticleSystem {
  particles: Particle[];
  emit: (x: number, y: number, config: ParticleConfig, type: 'trail' | 'burst' | 'spark') => void;
  emitTrail: (x: number, y: number, speed: number, colors?: string[]) => void;
  emitBurst: (x: number, y: number, colors?: string[]) => void;
  emitSpark: (x: number, y: number, colors?: string[]) => void;
  update: (deltaTime: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
  reset: () => void;
  getParticleCount: () => number;
}

/**
 * Creates a new particle system instance
 */
export function createParticleSystem(): ParticleSystem {
  return {
    get particles() {
      return getActiveParticles();
    },
    emit,
    emitTrail,
    emitBurst,
    emitSpark,
    update,
    render,
    reset,
    getParticleCount,
  };
}
