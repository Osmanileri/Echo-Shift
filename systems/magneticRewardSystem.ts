/**
 * Magnetic Reward Particle System
 * Two-phase animation: burst → magnet
 * Particles fly from center toward gem counter
 */

export interface MagneticParticle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    phase: 'burst' | 'magnet';
    delay: number;
    size: number;
}

export class MagneticRewardSystem {
    particles: MagneticParticle[] = [];
    targetX: number = 0;
    targetY: number = 0;
    onCollect: (() => void) | null = null;

    private nextId = 0;

    /**
     * Set target position (gem counter location)
     */
    setTarget(x: number, y: number) {
        this.targetX = x;
        this.targetY = y;
    }

    /**
     * Emit a burst of particles from a point
     */
    emit(startX: number, startY: number, count: number = 20) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                id: this.nextId++,
                x: startX,
                y: startY,
                // Random burst direction
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.0,
                phase: 'burst',
                delay: Math.random() * 20, // 0-20 frame delay for staggered magnet start
                size: 6 + Math.random() * 4,
            });
        }
    }

    /**
     * Update all particles
     * Returns number of particles that reached target this frame
     */
    update(): number {
        const FRICTION = 0.92;
        const MAGNET_SPEED = 0.2;
        const MAX_SPEED = 25;
        const BURST_THRESHOLD = 0.5;
        const COLLECT_DISTANCE = 30;

        let collectedCount = 0;

        this.particles = this.particles.filter(p => {
            // Phase 1: BURST (scatter outward)
            if (p.phase === 'burst') {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= FRICTION;
                p.vy *= FRICTION;

                // Transition to magnet phase when slow enough
                if (Math.abs(p.vx) < BURST_THRESHOLD && Math.abs(p.vy) < BURST_THRESHOLD) {
                    p.phase = 'magnet';
                }
                return true;
            }

            // Phase 2: MAGNET (fly toward target)
            if (p.phase === 'magnet') {
                // Stagger the start
                if (p.delay > 0) {
                    p.delay--;
                    return true;
                }

                // Calculate direction to target
                const dx = this.targetX - p.x;
                const dy = this.targetY - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Check if reached target
                if (dist < COLLECT_DISTANCE) {
                    collectedCount++;
                    if (this.onCollect) {
                        this.onCollect();
                    }
                    return false; // Remove particle
                }

                // Accelerate toward target (faster as closer)
                const angle = Math.atan2(dy, dx);
                const acceleration = MAGNET_SPEED * (3000 / (dist + 100));

                p.vx += Math.cos(angle) * acceleration;
                p.vy += Math.sin(angle) * acceleration;

                // Clamp speed
                p.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, p.vx));
                p.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, p.vy));

                // Apply velocity
                p.x += p.vx;
                p.y += p.vy;

                // Fade as approaching target
                p.life = Math.max(0.3, dist / 200);
            }

            return true;
        });

        return collectedCount;
    }

    /**
     * Draw particles to canvas
     */
    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();

        this.particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);

            // Glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00F0FF';
            ctx.fillStyle = '#00F0FF';
            ctx.globalAlpha = p.life;

            // Motion blur when in magnet phase
            if (p.phase === 'magnet' && p.delay <= 0) {
                const angle = Math.atan2(p.vy, p.vx);
                ctx.rotate(angle);
                ctx.scale(1.5, 0.5); // Stretch in direction of motion
            } else {
                ctx.rotate(p.id * 0.5); // Random rotation during burst
            }

            // Diamond shape
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.lineTo(p.size * 0.6, 0);
            ctx.lineTo(0, p.size);
            ctx.lineTo(-p.size * 0.6, 0);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        });

        ctx.restore();
    }

    /**
     * Check if animation is complete
     */
    isComplete(): boolean {
        return this.particles.length === 0;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    /**
     * Get active particle count
     */
    getParticleCount(): number {
        return this.particles.length;
    }
}

// Singleton instance for easy access
export const magneticRewardSystem = new MagneticRewardSystem();
