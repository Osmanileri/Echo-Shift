/**
 * Enemy Manager - Glitch Dart System
 * 
 * Jetpack Joyride-style enemy that:
 * 1. Tracks player position (LERP smoothing)
 * 2. Locks on to position (warning phase)
 * 3. Fires rapidly across screen
 * 4. Can be countered by equipped Pokemon
 */

import { AudioSystem } from './audioSystem';

export type EnemyState = 'idle' | 'tracking' | 'locked' | 'firing' | 'cooldown';

export interface GlitchDart {
    state: EnemyState;
    x: number;          // Horizontal position (right edge during warning, moving left when firing)
    y: number;          // Current vertical position
    targetY: number;    // Target Y for LERP tracking
    timer: number;      // State timer in milliseconds
    width: number;
    height: number;
}

export interface EnemyManagerState {
    dart: GlitchDart;
    isActive: boolean;           // Whether enemy system is active
    spawnThreshold: number;      // Distance/score before enemies start spawning
    lastCounterTime: number;     // For visual effects timing
}

// Configuration (adjustable for difficulty)
export const ENEMY_CONFIG = {
    // Timing (milliseconds)
    TRACKING_DURATION: 2000,    // 2 saniye takip (gerilimi artırır)
    LOCK_DURATION: 1000,        // 1 saniye kilitli (kaçış süresi)
    COOLDOWN_MIN: 3000,         // Minimum bekleme
    COOLDOWN_MAX: 5000,         // Maximum bekleme

    // Movement
    DART_SPEED: 6,             // Panik hızı (6 yavaş, 18 hızlıydı)
    LERP_SMOOTHING: 0.04,       // Hantal takip (ani hareketle kandırılabilir)

    // Spawn
    SPAWN_THRESHOLD_DISTANCE: 50,   // 50m sonra başla
    SPAWN_THRESHOLD_SCORE: 50,      // veya 50 skor sonra

    // Visuals
    DART_WIDTH: 30,
    DART_HEIGHT: 16,
    WARNING_ICON_SIZE: 14,
    DANGER_RADIUS: 100,             // Pokemon vurma menzili (artırıldı)
};

/**
 * Create initial enemy manager state
 */
export function createEnemyManagerState(canvasWidth: number, canvasHeight: number): EnemyManagerState {
    return {
        dart: {
            state: 'idle',
            x: canvasWidth,
            y: canvasHeight / 2,
            targetY: canvasHeight / 2,
            timer: 0,
            width: ENEMY_CONFIG.DART_WIDTH,
            height: ENEMY_CONFIG.DART_HEIGHT,
        },
        isActive: false,
        spawnThreshold: ENEMY_CONFIG.SPAWN_THRESHOLD_DISTANCE,
        lastCounterTime: 0,
    };
}

/**
 * Reset enemy to idle state at screen edge
 */
export function resetDart(state: EnemyManagerState, canvasWidth: number, canvasHeight: number): EnemyManagerState {
    return {
        ...state,
        dart: {
            ...state.dart,
            state: 'idle',
            x: canvasWidth,
            y: canvasHeight / 2,
            targetY: canvasHeight / 2,
            timer: 0,
        },
    };
}

/**
 * Spawn a new dart attack
 */
export function spawnDart(state: EnemyManagerState, canvasWidth: number): EnemyManagerState {
    return {
        ...state,
        dart: {
            ...state.dart,
            state: 'tracking',
            x: canvasWidth - 40,  // Warning icon position
            timer: 0,
        },
    };
}

/**
 * Update enemy state machine
 */
export function updateEnemy(
    state: EnemyManagerState,
    deltaTime: number,
    playerY: number,
    canvasWidth: number,
    canvasHeight: number,
    currentDistance: number = 0,
    currentScore: number = 0
): EnemyManagerState {
    // Check if enemy system should be active
    const shouldBeActive = currentDistance >= ENEMY_CONFIG.SPAWN_THRESHOLD_DISTANCE ||
        currentScore >= ENEMY_CONFIG.SPAWN_THRESHOLD_SCORE;

    if (!shouldBeActive) {
        return { ...state, isActive: false };
    }

    const newState = { ...state, isActive: true };
    const dart = { ...newState.dart };
    dart.timer += deltaTime;

    switch (dart.state) {
        case 'idle': {
            // First attack spawns quickly (500ms), subsequent attacks use random cooldown
            const isFirstAttack = dart.x >= canvasWidth - 50;
            const cooldownDuration = isFirstAttack
                ? 500
                : ENEMY_CONFIG.COOLDOWN_MIN + Math.random() * (ENEMY_CONFIG.COOLDOWN_MAX - ENEMY_CONFIG.COOLDOWN_MIN);

            if (dart.timer > cooldownDuration) {
                dart.state = 'tracking';
                dart.timer = 0;
                dart.x = canvasWidth - 40;
            }
            break;
        }

        case 'tracking': {
            // LERP: Smoothly follow player Y position
            dart.targetY = playerY;
            dart.y += (dart.targetY - dart.y) * ENEMY_CONFIG.LERP_SMOOTHING;

            // Clamp to screen bounds
            dart.y = Math.max(ENEMY_CONFIG.WARNING_ICON_SIZE,
                Math.min(canvasHeight - ENEMY_CONFIG.WARNING_ICON_SIZE, dart.y));

            // Play tracking beep periodically (every ~400ms, faster as timer increases)
            const trackingProgress = dart.timer / ENEMY_CONFIG.TRACKING_DURATION;
            const beepInterval = 400 - (trackingProgress * 200); // 400ms -> 200ms
            if (dart.timer % beepInterval < deltaTime) {
                AudioSystem.playEnemyTracking(trackingProgress);
            }

            // Transition to locked state
            if (dart.timer > ENEMY_CONFIG.TRACKING_DURATION) {
                dart.state = 'locked';
                dart.timer = 0;
                AudioSystem.playLockOn(); // Lock-on confirmation sound
            }
            break;
        }

        case 'locked': {
            // Position is frozen - player's escape window!
            if (dart.timer > ENEMY_CONFIG.LOCK_DURATION) {
                dart.state = 'firing';
                dart.timer = 0;
                dart.x = canvasWidth;
                AudioSystem.playDartFire(); // Dart fire whoosh
            }
            break;
        }

        case 'firing': {
            // Move dart rapidly to the left
            dart.x -= ENEMY_CONFIG.DART_SPEED * (deltaTime / 16); // Normalize for 60fps

            // Check if dart left screen
            if (dart.x < -100) {
                dart.state = 'cooldown';
                dart.timer = 0;
            }
            break;
        }

        case 'cooldown': {
            // Brief pause before resetting
            if (dart.timer > 500) {
                dart.state = 'idle';
                dart.timer = 0;
                dart.x = canvasWidth;
            }
            break;
        }
    }

    return { ...newState, dart };
}

/**
 * Check collision between dart and player orb
 */
export function checkDartCollision(
    state: EnemyManagerState,
    orbX: number,
    orbY: number,
    orbRadius: number
): boolean {
    if (state.dart.state !== 'firing') return false;

    const dart = state.dart;

    // Rectangle vs Circle collision
    // Find closest point on dart rectangle to orb center
    const closestX = Math.max(dart.x - dart.width / 2, Math.min(orbX, dart.x + dart.width / 2));
    const closestY = Math.max(dart.y - dart.height / 2, Math.min(orbY, dart.y + dart.height / 2));

    // Calculate distance from closest point to orb center
    const distanceX = orbX - closestX;
    const distanceY = orbY - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    return distanceSquared < orbRadius * orbRadius;
}

/**
 * Check if dart is within counter-attack range
 */
export function isDartInCounterRange(
    state: EnemyManagerState,
    orbX: number,
    orbY: number
): boolean {
    if (state.dart.state !== 'firing') return false;

    const dart = state.dart;
    const distanceX = dart.x - orbX;
    const distanceY = dart.y - orbY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    return distance < ENEMY_CONFIG.DANGER_RADIUS;
}

/**
 * Mark dart as countered (destroyed by Pokemon)
 */
export function counterDart(state: EnemyManagerState): EnemyManagerState {
    return {
        ...state,
        dart: {
            ...state.dart,
            state: 'cooldown',
            timer: 0,
            x: -500, // Move off screen immediately
        },
        lastCounterTime: Date.now(),
    };
}

/**
 * Draw enemy visuals on canvas - Cyber-Glitch VFX
 */
export function drawEnemy(
    ctx: CanvasRenderingContext2D,
    state: EnemyManagerState,
    canvasWidth: number
): void {
    const dart = state.dart;
    if (dart.state === 'idle' || dart.state === 'cooldown') return;

    ctx.save();

    // Profesyonel Glitch Titremesi (Jitter)
    const jitterX = (Math.random() - 0.5) * 3;
    const jitterY = (Math.random() - 0.5) * 3;

    if (dart.state === 'tracking' || dart.state === 'locked') {
        const isLocked = dart.state === 'locked';
        const pulse = isLocked ? 1.2 : 1 + Math.sin(Date.now() * 0.01) * 0.2;
        const iconX = canvasWidth - 40;

        // 1. Hedef Hattı (Lazer)
        ctx.beginPath();
        ctx.setLineDash(isLocked ? [] : [10, 10]); // Kilitlenince düz çizgi
        ctx.moveTo(0, dart.y);
        ctx.lineTo(canvasWidth, dart.y);
        ctx.strokeStyle = isLocked ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 0, 0, 0.25)';
        ctx.lineWidth = isLocked ? 2 : 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Uyarı İkonu (Neon Baklava/Elmas Formu)
        ctx.save();
        ctx.translate(iconX + jitterX, dart.y + jitterY);
        ctx.rotate(Math.PI / 4); // Elmas şekli

        // Dış Parlama (Bloom)
        ctx.shadowBlur = 15 * pulse;
        ctx.shadowColor = '#FF0000';

        ctx.fillStyle = isLocked ? '#FF0000' : 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(-10 * pulse, -10 * pulse, 20 * pulse, 20 * pulse);

        // İç Çekirdek
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-4, -4, 8, 8);

        ctx.restore();
    }
    else if (dart.state === 'firing') {
        // 3. FIRING: Siber Ok (Motion Blur ile)
        ctx.save();
        ctx.translate(dart.x, dart.y);

        // Arka İz (Ghosting/Trail)
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FF0000';

        // Kuyruk Efekti (Gradient Trail)
        const grad = ctx.createLinearGradient(0, 0, 60, 0);
        grad.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
        grad.addColorStop(1, 'rgba(255, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, -3, 60, 6); // Uzun kuyruk

        // Dart Gövdesi (Keskin Geometri)
        ctx.beginPath();
        ctx.moveTo(-15 + jitterX, 0); // Uç
        ctx.lineTo(12, -8);  // Üst arka
        ctx.lineTo(6, 0);    // İç girinti
        ctx.lineTo(12, 8);   // Alt arka
        ctx.closePath();

        ctx.fillStyle = '#FFFFFF'; // Parlayan beyaz gövde
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFFFFF';
        ctx.fill();

        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }

    ctx.restore();
}

/**
 * Get dart position for external use (counter-attack visuals)
 */
export function getDartPosition(state: EnemyManagerState): { x: number; y: number } | null {
    if (state.dart.state !== 'firing') return null;
    return { x: state.dart.x, y: state.dart.y };
}
