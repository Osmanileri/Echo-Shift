/**
 * EnemySpriteCache - Pre-rendered Enemy Sprite System
 * 
 * Performans optimizasyonu: Düşmanı her frame prosedürel çizmek yerine
 * off-screen canvas'a bir kez çizip sprite olarak kullanır.
 * 
 * Bu, mobil GPU'da:
 * - ShadowBlur hesaplamalarını elimine eder
 * - Gradient oluşturmayı tek sefere indirir
 * - Draw call sayısını dramatik azaltır
 */

// ============================================================================
// TYPES
// ============================================================================

interface CachedSprite {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    width: number;
    height: number;
}

interface EnemySpriteCache {
    tracking: CachedSprite | null;
    locked: CachedSprite | null;
    firing: CachedSprite | null;
    size: number;
    isInitialized: boolean;
}

// ============================================================================
// MODULE STATE
// ============================================================================

let spriteCache: EnemySpriteCache = {
    tracking: null,
    locked: null,
    firing: null,
    size: 0,
    isInitialized: false,
};

// Animation time for cached sprites (updates less frequently)
let cachedTime = 0;
const CACHE_UPDATE_INTERVAL = 100; // Update cache every 100ms for animation
let lastCacheUpdate = 0;

// ============================================================================
// HELPER: Create Off-screen Canvas
// ============================================================================

function createOffscreenCanvas(width: number, height: number): CachedSprite | null {
    try {
        // Try OffscreenCanvas first (better performance)
        if (typeof OffscreenCanvas !== 'undefined') {
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
                return { canvas, ctx, width, height };
            }
        }

        // Fallback to regular canvas for older browsers
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            return { canvas, ctx, width, height };
        }
    } catch (e) {
        console.warn('[EnemySpriteCache] Failed to create off-screen canvas:', e);
    }

    return null;
}

// ============================================================================
// SPRITE DRAWING - Based on EnemyManager.drawCyberEnemy
// ============================================================================

function drawCyberEnemyToCache(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    isLocked: boolean,
    glowPulse: number = 0.5
): void {
    ctx.save();
    ctx.translate(centerX, centerY);

    const halfSize = size / 2;
    const glowIntensity = 0.5 + glowPulse * 0.5;

    // === OUTER GLOW AURA ===
    const auraGrad = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, size * 0.8);
    auraGrad.addColorStop(0, `rgba(255, 80, 30, ${0.4 * glowIntensity})`);
    auraGrad.addColorStop(0.5, `rgba(255, 30, 0, ${0.2 * glowIntensity})`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // === DARK METALLIC HEAD/BODY ===
    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.6, -halfSize * 0.4);
    ctx.lineTo(-halfSize * 0.8, 0);
    ctx.lineTo(-halfSize * 0.6, halfSize * 0.5);
    ctx.lineTo(halfSize * 0.2, halfSize * 0.5);
    ctx.lineTo(halfSize * 0.6, halfSize * 0.2);
    ctx.lineTo(halfSize * 0.7, -halfSize * 0.2);
    ctx.lineTo(halfSize * 0.4, -halfSize * 0.5);
    ctx.lineTo(-halfSize * 0.2, -halfSize * 0.6);
    ctx.closePath();

    const bodyGrad = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
    bodyGrad.addColorStop(0, '#1a1a2e');
    bodyGrad.addColorStop(0.3, '#16213e');
    bodyGrad.addColorStop(0.6, '#0f0f23');
    bodyGrad.addColorStop(1, '#0a0a15');
    ctx.fillStyle = bodyGrad;

    // Reduced shadowBlur for performance (baked in once, not per-frame)
    ctx.shadowBlur = 10;
    ctx.shadowColor = isLocked ? '#FF3300' : '#FF6600';
    ctx.fill();

    // Metallic edge
    ctx.strokeStyle = `rgba(100, 150, 200, ${0.3 + glowIntensity * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // === PANEL LINES ===
    ctx.shadowBlur = 0; // Disable shadow for detail lines
    ctx.strokeStyle = `rgba(60, 80, 120, ${0.4 + glowIntensity * 0.2})`;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.4, -halfSize * 0.35);
    ctx.lineTo(halfSize * 0.3, -halfSize * 0.35);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.65, -halfSize * 0.15);
    ctx.lineTo(-halfSize * 0.65, halfSize * 0.25);
    ctx.stroke();

    // === GLOWING EYES ===
    const eyeGlow = 0.85; // Fixed for cache

    // Left eye
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = isLocked ? '#FF2200' : '#FF6B00';

    const leftEyeGrad = ctx.createRadialGradient(
        -halfSize * 0.35, -halfSize * 0.05, 0,
        -halfSize * 0.35, -halfSize * 0.05, halfSize * 0.18
    );
    leftEyeGrad.addColorStop(0, '#FFFFFF');
    leftEyeGrad.addColorStop(0.2, isLocked ? '#FF4400' : '#FF8800');
    leftEyeGrad.addColorStop(0.6, isLocked ? '#FF2200' : '#FF5500');
    leftEyeGrad.addColorStop(1, isLocked ? '#CC0000' : '#DD3300');

    ctx.fillStyle = leftEyeGrad;
    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.5, -halfSize * 0.05);
    ctx.lineTo(-halfSize * 0.35, -halfSize * 0.18);
    ctx.lineTo(-halfSize * 0.15, -halfSize * 0.05);
    ctx.lineTo(-halfSize * 0.35, halfSize * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right eye
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = isLocked ? '#FF2200' : '#FF6B00';

    const rightEyeGrad = ctx.createRadialGradient(
        halfSize * 0.15, -halfSize * 0.05, 0,
        halfSize * 0.15, -halfSize * 0.05, halfSize * 0.18
    );
    rightEyeGrad.addColorStop(0, '#FFFFFF');
    rightEyeGrad.addColorStop(0.2, isLocked ? '#FF4400' : '#FF8800');
    rightEyeGrad.addColorStop(0.6, isLocked ? '#FF2200' : '#FF5500');
    rightEyeGrad.addColorStop(1, isLocked ? '#CC0000' : '#DD3300');

    ctx.fillStyle = rightEyeGrad;
    ctx.beginPath();
    ctx.moveTo(halfSize * 0.0, -halfSize * 0.05);
    ctx.lineTo(halfSize * 0.15, -halfSize * 0.18);
    ctx.lineTo(halfSize * 0.35, -halfSize * 0.05);
    ctx.lineTo(halfSize * 0.15, halfSize * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // === ENERGY CIRCUITS ===
    ctx.strokeStyle = `rgba(255, ${isLocked ? 50 : 120}, 0, ${0.5 + glowIntensity * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 5;
    ctx.shadowColor = isLocked ? '#FF3300' : '#FF6600';

    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.15, -halfSize * 0.5);
    ctx.lineTo(0, -halfSize * 0.45);
    ctx.lineTo(halfSize * 0.2, -halfSize * 0.4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.7, halfSize * 0.1);
    ctx.lineTo(-halfSize * 0.55, halfSize * 0.2);
    ctx.lineTo(-halfSize * 0.5, halfSize * 0.35);
    ctx.stroke();

    ctx.restore();
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Initialize sprite cache with given sprite size
 * Call this once during game setup
 */
export function initSpriteCaches(spriteSize: number): void {
    // Add padding for glow effects
    const canvasSize = Math.ceil(spriteSize * 2.5);
    const center = canvasSize / 2;

    // Create caches for each state
    spriteCache.tracking = createOffscreenCanvas(canvasSize, canvasSize);
    spriteCache.locked = createOffscreenCanvas(canvasSize, canvasSize);
    spriteCache.firing = createOffscreenCanvas(canvasSize, canvasSize);

    if (spriteCache.tracking && spriteCache.locked && spriteCache.firing) {
        // Pre-render tracking state
        drawCyberEnemyToCache(
            spriteCache.tracking.ctx,
            center, center, spriteSize,
            false, 0.5
        );

        // Pre-render locked state
        drawCyberEnemyToCache(
            spriteCache.locked.ctx,
            center, center, spriteSize,
            true, 0.7
        );

        // Pre-render firing state (same as locked but could be different)
        drawCyberEnemyToCache(
            spriteCache.firing.ctx,
            center, center, spriteSize,
            true, 0.9
        );

        spriteCache.size = spriteSize;
        spriteCache.isInitialized = true;

        console.log('[EnemySpriteCache] Sprites cached successfully:', {
            size: spriteSize,
            canvasSize,
        });
    } else {
        console.warn('[EnemySpriteCache] Failed to initialize sprite caches');
    }
}

/**
 * Get the cached sprite for a given enemy state
 */
export function getSprite(state: 'tracking' | 'locked' | 'firing'): CanvasImageSource | null {
    if (!spriteCache.isInitialized) return null;

    switch (state) {
        case 'tracking':
            return spriteCache.tracking?.canvas ?? null;
        case 'locked':
            return spriteCache.locked?.canvas ?? null;
        case 'firing':
            return spriteCache.firing?.canvas ?? null;
        default:
            return null;
    }
}

/**
 * Get sprite dimensions for proper positioning
 */
export function getSpriteSize(): { width: number; height: number; offset: number } {
    if (!spriteCache.isInitialized || !spriteCache.tracking) {
        return { width: 0, height: 0, offset: 0 };
    }

    return {
        width: spriteCache.tracking.width,
        height: spriteCache.tracking.height,
        offset: spriteCache.tracking.width / 2, // Center offset
    };
}

/**
 * Check if cache is ready to use
 */
export function isReady(): boolean {
    return spriteCache.isInitialized;
}

/**
 * Invalidate cache (call when sprite size changes)
 */
export function invalidateCache(): void {
    spriteCache.tracking = null;
    spriteCache.locked = null;
    spriteCache.firing = null;
    spriteCache.size = 0;
    spriteCache.isInitialized = false;
}

/**
 * Update cached time for animation (call periodically, not every frame)
 */
export function updateAnimationTime(currentTime: number): void {
    if (currentTime - lastCacheUpdate > CACHE_UPDATE_INTERVAL) {
        cachedTime = currentTime;
        lastCacheUpdate = currentTime;
    }
}

/**
 * Get cached animation time
 */
export function getCachedTime(): number {
    return cachedTime;
}
