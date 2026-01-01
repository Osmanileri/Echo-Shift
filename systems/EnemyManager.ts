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
import * as EnemySpriteCache from './EnemySpriteCache';

// =============================================================================
// CYBER ENEMY ANIMATION SYSTEM
// Procedural animated enemy - no image loading needed
// =============================================================================

// Animation state for VFX
interface EnemyAnimationState {
    glowPulse: number;      // 0-1 pulsing glow
    rotationAngle: number;  // Slight wobble
    scaleWobble: number;    // 0.95-1.05 breathing effect
    trailPositions: { x: number; y: number; alpha: number }[];  // Motion trail
    shieldRotation: number; // Rotating energy shield
    particleTimer: number;  // For spawning particles
}

const enemyAnimState: EnemyAnimationState = {
    glowPulse: 0,
    rotationAngle: 0,
    scaleWobble: 1,
    trailPositions: [],
    shieldRotation: 0,
    particleTimer: 0
};

export type EnemyState = 'idle' | 'tracking' | 'locked' | 'firing' | 'cooldown';

export interface GlitchDart {
    state: EnemyState;
    x: number;          // Horizontal position (right edge during warning, moving left when firing)
    y: number;          // Current vertical position
    targetY: number;    // Target Y for LERP tracking
    timer: number;      // State timer in milliseconds
    width: number;
    height: number;
    // Knockback Physics - Level-based pushback mechanics
    knockbackActive: boolean;
    knockbackTargetX: number;  // Where dart will be pushed to
    knockbackStartX: number;   // Where dart was when pushed
    knockbackProgress: number; // 0-1 animation progress
    hasBeenKnockedBack: boolean; // Once true, immune to further knockbacks this attack
}

export interface EnemyManagerState {
    dart: GlitchDart;
    isActive: boolean;           // Whether enemy system is active
    spawnThreshold: number;      // Distance/score before enemies start spawning
    lastCounterTime: number;     // For visual effects timing
    // Professional Spawn Scheduler State
    spawnScheduler: SpawnSchedulerState;
}

/**
 * Spawn Scheduler State - Controls dynamic enemy spawn patterns
 * 
 * Algorithm:
 * - Uses weighted random cooldowns (not fixed intervals)
 * - Implements "tension waves" with active and rest periods
 * - Tracks attack history for dynamic difficulty
 */
export interface SpawnSchedulerState {
    nextSpawnTime: number;       // Calculated next spawn time (ms from game start)
    wavePhase: 'active' | 'rest';  // Current wave phase
    waveTimer: number;           // Time remaining in current wave phase
    attackCount: number;         // Attacks in current wave
    totalAttacks: number;        // Total attacks spawned
    lastSpawnGameTime: number;   // Last spawn time for cooldown calculation
}

// Configuration (adjustable for difficulty)
export const ENEMY_CONFIG = {
    // Timing (milliseconds)
    TRACKING_DURATION: 2000,    // 2 saniye takip (gerilimi artırır)
    LOCK_DURATION: 1500,        // 1.5 saniye kilitli (daha uzun kaçış süresi)

    // Professional Spawn Algorithm Configuration
    SPAWN: {
        // Cooldown ranges (weighted random - not fixed intervals)
        COOLDOWN_BASE: 4000,        // Base cooldown (orta değer)
        COOLDOWN_VARIANCE: 3000,    // +/- variance range
        COOLDOWN_MIN: 2500,         // Absolute minimum (oyuncu nefes alabilsin)
        COOLDOWN_MAX: 8000,         // Absolute maximum (çok uzun beklemesin)

        // Wave system - periods of activity and rest
        WAVE_ACTIVE_DURATION: 15000,  // 15 saniye aktif dönem
        WAVE_REST_DURATION: 5000,     // 5 saniye dinlenme dönemi
        ATTACKS_PER_WAVE_MIN: 2,      // Dalga başına minimum saldırı
        ATTACKS_PER_WAVE_MAX: 4,      // Dalga başına maximum saldırı

        // Dynamic difficulty
        TENSION_RAMP: 0.95,           // Her saldırıda cooldown çarpanı (azalır)
        REST_PHASE_SPAWN_CHANCE: 0.15, // Rest fazında spawn ihtimali
    },

    // Movement
    DART_SPEED: 6,             // Panik hızı (6 yavaş, 18 hızlıydı)
    LERP_SMOOTHING: 0.04,       // Hantal takip (ani hareketle kandırılabilir)

    // Spawn Threshold (aynı kalıyor - test için)
    SPAWN_THRESHOLD_DISTANCE: 50,   // 50m sonra başla
    SPAWN_THRESHOLD_SCORE: 50,      // veya 50 skor sonra

    // Visuals (eski boyutlara geri döndürüldü)
    DART_WIDTH: 22,
    DART_HEIGHT: 12,
    WARNING_ICON_SIZE: 12,
    DANGER_RADIUS: 100,             // Pokemon vurma menzili
    // Procedural enemy render size
    SPRITE_SIZE: 22,                // Enemy render size (daha küçük)
};

// Helper to get legacy cooldown values (for backwards compatibility)
export const getLegacyCooldown = () => ({
    COOLDOWN_MIN: ENEMY_CONFIG.SPAWN.COOLDOWN_MIN,
    COOLDOWN_MAX: ENEMY_CONFIG.SPAWN.COOLDOWN_MAX,
});

/**
 * Create initial spawn scheduler state
 */
function createSpawnSchedulerState(): SpawnSchedulerState {
    return {
        nextSpawnTime: 0,
        wavePhase: 'rest', // Start with rest phase, will switch to active
        waveTimer: 1000,   // Short initial delay
        attackCount: 0,
        totalAttacks: 0,
        lastSpawnGameTime: 0,
    };
}

/**
 * Calculate next spawn cooldown using weighted random distribution
 * Creates more interesting patterns than pure random
 */
function calculateNextCooldown(scheduler: SpawnSchedulerState): number {
    const config = ENEMY_CONFIG.SPAWN;

    // Base cooldown with Gaussian-like distribution (more likely to be near center)
    const rand1 = Math.random();
    const rand2 = Math.random();
    const gaussianRandom = (rand1 + rand2) / 2; // Simple approximation

    // Calculate weighted cooldown
    let cooldown = config.COOLDOWN_BASE + (gaussianRandom - 0.5) * 2 * config.COOLDOWN_VARIANCE;

    // Apply tension ramp based on consecutive attacks
    const tensionMultiplier = Math.pow(config.TENSION_RAMP, scheduler.attackCount);
    cooldown *= tensionMultiplier;

    // Clamp to valid range
    cooldown = Math.max(config.COOLDOWN_MIN, Math.min(config.COOLDOWN_MAX, cooldown));

    // Add some unpredictability (occasional fast or slow attack)
    const surpriseRoll = Math.random();
    if (surpriseRoll < 0.1) {
        // 10% chance: Quick follow-up attack
        cooldown = config.COOLDOWN_MIN + Math.random() * 500;
    } else if (surpriseRoll > 0.95) {
        // 5% chance: Extended pause
        cooldown = config.COOLDOWN_MAX - Math.random() * 1000;
    }

    return cooldown;
}

/**
 * Update spawn scheduler - determines when next enemy should spawn
 */
function updateSpawnScheduler(
    scheduler: SpawnSchedulerState,
    deltaTime: number,
    currentGameTime: number
): { scheduler: SpawnSchedulerState; shouldSpawn: boolean } {
    const config = ENEMY_CONFIG.SPAWN;
    const newScheduler = { ...scheduler };
    let shouldSpawn = false;

    // Update wave timer
    newScheduler.waveTimer -= deltaTime;

    // Handle wave phase transitions
    if (newScheduler.waveTimer <= 0) {
        if (newScheduler.wavePhase === 'active') {
            // Transition to rest phase
            newScheduler.wavePhase = 'rest';
            newScheduler.waveTimer = config.WAVE_REST_DURATION;
            newScheduler.attackCount = 0; // Reset attack count for next wave
        } else {
            // Transition to active phase
            newScheduler.wavePhase = 'active';
            newScheduler.waveTimer = config.WAVE_ACTIVE_DURATION;
            // Schedule first attack quickly
            newScheduler.nextSpawnTime = currentGameTime + 500 + Math.random() * 1000;
        }
    }

    // Check if should spawn based on phase
    if (newScheduler.wavePhase === 'active') {
        // Active phase: spawn based on scheduled time
        if (currentGameTime >= newScheduler.nextSpawnTime) {
            // Check if we haven't exceeded wave attack limit
            if (newScheduler.attackCount < config.ATTACKS_PER_WAVE_MAX) {
                shouldSpawn = true;
                newScheduler.attackCount++;
                newScheduler.totalAttacks++;
                newScheduler.lastSpawnGameTime = currentGameTime;

                // Calculate next spawn time
                const nextCooldown = calculateNextCooldown(newScheduler);
                newScheduler.nextSpawnTime = currentGameTime + nextCooldown;
            }
        }
    } else {
        // Rest phase: rare chance to spawn (keeps player alert)
        const timeSinceLastAttack = currentGameTime - newScheduler.lastSpawnGameTime;
        if (timeSinceLastAttack > config.COOLDOWN_MAX && Math.random() < config.REST_PHASE_SPAWN_CHANCE * (deltaTime / 1000)) {
            shouldSpawn = true;
            newScheduler.totalAttacks++;
            newScheduler.lastSpawnGameTime = currentGameTime;
        }
    }

    return { scheduler: newScheduler, shouldSpawn };
}

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
            // Knockback physics initialization
            knockbackActive: false,
            knockbackTargetX: 0,
            knockbackStartX: 0,
            knockbackProgress: 0,
            hasBeenKnockedBack: false, // Reset each attack cycle
        },
        isActive: false,
        spawnThreshold: ENEMY_CONFIG.SPAWN_THRESHOLD_DISTANCE,
        lastCounterTime: 0,
        spawnScheduler: createSpawnSchedulerState(),
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
            // Reset knockback state for new attack cycle
            knockbackActive: false,
            knockbackProgress: 0,
            hasBeenKnockedBack: false, // Reset immunity for next attack
        },
    };
}

// =============================================================================
// KNOCKBACK PHYSICS SYSTEM
// Level-based pushback mechanics with cubic ease-out animation
// =============================================================================

/**
 * Knockback Configuration
 */
const KNOCKBACK_CONFIG = {
    ANIMATION_DURATION: 600,     // 600ms animation
    BASE_PUSH_DISTANCE: 150,     // Base push distance (pixels)
    LEVEL_MULTIPLIER: 20,        // Extra pixels per level
    MAX_PUSH_DISTANCE: 500,      // Maximum push distance
    STUN_DURATION: 500,          // Time before enemy can relock
};

/**
 * Calculate push distance based on Pokemon level and attack stat
 * Formula: basePush + (level × multiplier)
 */
export function calculatePushDistance(pokemonLevel: number, pokemonAttack: number = 50): number {
    const basePush = KNOCKBACK_CONFIG.BASE_PUSH_DISTANCE;
    const levelBonus = pokemonLevel * KNOCKBACK_CONFIG.LEVEL_MULTIPLIER;
    const attackBonus = Math.floor((pokemonAttack - 50) / 10) * 10; // Every 10 attack = +10px

    const totalPush = basePush + levelBonus + attackBonus;
    return Math.min(totalPush, KNOCKBACK_CONFIG.MAX_PUSH_DISTANCE);
}

/**
 * Apply knockback to enemy - pushes dart back with cubic ease-out physics
 * Called when Pokemon counter-attacks but is NOT Legendary
 * 
 * @param state Current enemy manager state
 * @param pushDistance How far to push (calculated from Pokemon stats)
 * @param canvasWidth Screen width for bounds clamping
 */
export function applyKnockback(
    state: EnemyManagerState,
    pushDistance: number,
    canvasWidth: number
): EnemyManagerState {
    const dart = { ...state.dart };

    // Set knockback physics parameters
    dart.knockbackStartX = dart.x;
    // IMPORTANT: Clamp target to screen edge (canvasWidth - 40) to keep enemy VISIBLE
    // Enemy gets pushed to right edge then re-tracks from there
    const maxTargetX = canvasWidth - 40; // Same as spawn position
    dart.knockbackTargetX = Math.min(maxTargetX, dart.x + pushDistance);
    dart.knockbackProgress = 0;
    dart.knockbackActive = true;
    dart.hasBeenKnockedBack = true; // Mark as knocked back - immune to further knockbacks!

    // IMPORTANT: Do NOT change dart.state!
    // Enemy continues attacking from pushed position (gives player more time)
    // If firing: enemy continues moving left from further away
    // If tracking: enemy re-tracks from pushed position

    return { ...state, dart };
}

/**
 * Cubic Ease-Out function
 * Movement starts fast, slows down naturally at the end
 * Formula: 1 - (1 - t)³
 */
function cubicEaseOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Update knockback physics - call this in updateEnemy before state switch
 * Returns true if knockback is currently animating
 */
function updateKnockbackPhysics(dart: GlitchDart, deltaTime: number): boolean {
    if (!dart.knockbackActive) return false;

    // DEBUG: Log knockback animation
    console.log('[KNOCKBACK] Animating:', {
        progress: dart.knockbackProgress.toFixed(2),
        startX: dart.knockbackStartX,
        targetX: dart.knockbackTargetX,
        currentX: dart.x.toFixed(0),
        deltaTime
    });

    // Progress animation
    dart.knockbackProgress += deltaTime / KNOCKBACK_CONFIG.ANIMATION_DURATION;

    if (dart.knockbackProgress >= 1) {
        // Animation complete
        console.log('[KNOCKBACK] Animation complete, final X:', dart.knockbackTargetX);
        dart.x = dart.knockbackTargetX;
        dart.knockbackActive = false;
        dart.knockbackProgress = 0;
        return false;
    }

    // Apply cubic ease-out interpolation
    const easeProgress = cubicEaseOut(dart.knockbackProgress);
    dart.x = dart.knockbackStartX + (dart.knockbackTargetX - dart.knockbackStartX) * easeProgress;

    return true; // Still animating
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

    // ========================================
    // KNOCKBACK PHYSICS UPDATE
    // Process knockback animation before state machine
    // This allows smooth pushback during any state
    // ========================================
    const isKnockbackAnimating = updateKnockbackPhysics(dart, deltaTime);

    // If knockback is active and dart goes off-screen, reset to cooldown
    if (dart.knockbackActive && dart.x > canvasWidth + 50) {
        dart.state = 'cooldown';
        dart.timer = 0;
        dart.knockbackActive = false;
    }

    switch (dart.state) {
        case 'idle': {
            // Use professional spawn scheduler for variable, wave-based spawning
            const currentGameTime = Date.now();
            const schedulerResult = updateSpawnScheduler(
                newState.spawnScheduler,
                deltaTime,
                currentGameTime
            );
            newState.spawnScheduler = schedulerResult.scheduler;

            // Check if spawn scheduler says it's time to attack
            if (schedulerResult.shouldSpawn) {
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
            // If knocked back, move SLOWER to give player more time
            const speedMultiplier = dart.hasBeenKnockedBack ? 0.6 : 1.0; // 40% slower after knockback
            dart.x -= ENEMY_CONFIG.DART_SPEED * speedMultiplier * (deltaTime / 16); // Normalize for 60fps

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
                // IMPORTANT: Reset knockback immunity for NEW attack cycle!
                dart.hasBeenKnockedBack = false;
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
    // ALWAYS check collision regardless of dart state
    // If dart touches orb, it's a hit

    const dart = state.dart;

    // Enemy hitbox - matches actual visual size for FAIR collision
    // If you can visually dodge between orbs, collision won't happen
    const halfWidth = ENEMY_CONFIG.DART_WIDTH / 2;  // 11px each side
    const halfHeight = ENEMY_CONFIG.DART_HEIGHT / 2; // 6px each side
    const enemyLeft = dart.x - halfWidth;
    const enemyRight = dart.x + halfWidth;
    const enemyTop = dart.y - halfHeight;
    const enemyBottom = dart.y + halfHeight;

    // Orb hitbox
    const orbLeft = orbX - orbRadius;
    const orbRight = orbX + orbRadius;
    const orbTop = orbY - orbRadius;
    const orbBottom = orbY + orbRadius;

    // AABB overlap
    const xOverlap = enemyRight >= orbLeft && enemyLeft <= orbRight;
    const yOverlap = enemyBottom >= orbTop && enemyTop <= orbBottom;

    return xOverlap && yOverlap;
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
 * Update enemy animation state (call each frame)
 */
function updateEnemyAnimation(deltaTime: number): void {
    const dt = deltaTime / 1000;

    // Glow pulse (sine wave 0-1)
    enemyAnimState.glowPulse = (Math.sin(Date.now() * 0.006) + 1) / 2;

    // Rotation wobble
    enemyAnimState.rotationAngle = Math.sin(Date.now() * 0.003) * 0.1;

    // Scale breathing
    enemyAnimState.scaleWobble = 1 + Math.sin(Date.now() * 0.004) * 0.05;

    // Shield rotation
    enemyAnimState.shieldRotation += dt * 2;

    // Update trail alphas
    enemyAnimState.trailPositions = enemyAnimState.trailPositions
        .map(t => ({ ...t, alpha: t.alpha - dt * 2 }))
        .filter(t => t.alpha > 0);
}

// =============================================================================
// CYBER ENEMY PROCEDURAL DRAWING
// Full animated robot/cyborg enemy based on reference image
// =============================================================================

/**
 * Draw the cyber enemy procedurally on canvas
 * Based on reference image: Dark armored robot head with glowing red-orange eyes
 */
function drawCyberEnemy(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isLocked: boolean,
    time: number
): void {
    ctx.save();
    ctx.translate(x, y);

    // Apply wobble animation
    ctx.rotate(enemyAnimState.rotationAngle);
    ctx.scale(enemyAnimState.scaleWobble, enemyAnimState.scaleWobble);

    const halfSize = size / 2;
    const glowIntensity = 0.5 + enemyAnimState.glowPulse * 0.5;

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
    // Main head shape - angular helmet-like design
    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.6, -halfSize * 0.4);  // Top left
    ctx.lineTo(-halfSize * 0.8, 0);                 // Left side
    ctx.lineTo(-halfSize * 0.6, halfSize * 0.5);   // Bottom left
    ctx.lineTo(halfSize * 0.2, halfSize * 0.5);    // Bottom right
    ctx.lineTo(halfSize * 0.6, halfSize * 0.2);    // Right lower
    ctx.lineTo(halfSize * 0.7, -halfSize * 0.2);   // Right upper
    ctx.lineTo(halfSize * 0.4, -halfSize * 0.5);   // Top right
    ctx.lineTo(-halfSize * 0.2, -halfSize * 0.6);  // Top
    ctx.closePath();

    // Dark metallic gradient
    const bodyGrad = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
    bodyGrad.addColorStop(0, '#1a1a2e');
    bodyGrad.addColorStop(0.3, '#16213e');
    bodyGrad.addColorStop(0.6, '#0f0f23');
    bodyGrad.addColorStop(1, '#0a0a15');
    ctx.fillStyle = bodyGrad;
    ctx.shadowBlur = 15;
    ctx.shadowColor = isLocked ? '#FF3300' : '#FF6600';
    ctx.fill();

    // Metallic edge highlight
    ctx.strokeStyle = `rgba(100, 150, 200, ${0.3 + glowIntensity * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // === ARMOR PLATES / PANEL LINES ===
    ctx.strokeStyle = `rgba(60, 80, 120, ${0.4 + glowIntensity * 0.2})`;
    ctx.lineWidth = 1;

    // Forehead panel line
    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.4, -halfSize * 0.35);
    ctx.lineTo(halfSize * 0.3, -halfSize * 0.35);
    ctx.stroke();

    // Side panel lines
    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.65, -halfSize * 0.15);
    ctx.lineTo(-halfSize * 0.65, halfSize * 0.25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(halfSize * 0.5, -halfSize * 0.15);
    ctx.lineTo(halfSize * 0.55, halfSize * 0.15);
    ctx.stroke();

    // === GLOWING EYES ===
    // Eye glow pulse
    const eyeGlow = 0.7 + Math.sin(time * 0.01) * 0.3;

    // Left eye
    ctx.save();
    ctx.shadowBlur = 25 * eyeGlow;
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
    // Angular eye shape
    ctx.moveTo(-halfSize * 0.5, -halfSize * 0.05);
    ctx.lineTo(-halfSize * 0.35, -halfSize * 0.18);
    ctx.lineTo(-halfSize * 0.15, -halfSize * 0.05);
    ctx.lineTo(-halfSize * 0.35, halfSize * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right eye
    ctx.save();
    ctx.shadowBlur = 25 * eyeGlow;
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
    // Angular eye shape
    ctx.moveTo(halfSize * 0.0, -halfSize * 0.05);
    ctx.lineTo(halfSize * 0.15, -halfSize * 0.18);
    ctx.lineTo(halfSize * 0.35, -halfSize * 0.05);
    ctx.lineTo(halfSize * 0.15, halfSize * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // === ENERGY CIRCUITS / LINES ===
    ctx.strokeStyle = `rgba(255, ${isLocked ? 50 : 120}, 0, ${0.5 + glowIntensity * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = isLocked ? '#FF3300' : '#FF6600';

    // Circuit line 1 - forehead
    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.15, -halfSize * 0.5);
    ctx.lineTo(0, -halfSize * 0.45);
    ctx.lineTo(halfSize * 0.2, -halfSize * 0.4);
    ctx.stroke();

    // Circuit line 2 - cheek left
    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.7, halfSize * 0.1);
    ctx.lineTo(-halfSize * 0.55, halfSize * 0.2);
    ctx.lineTo(-halfSize * 0.5, halfSize * 0.35);
    ctx.stroke();

    // Circuit line 3 - cheek right
    ctx.beginPath();
    ctx.moveTo(halfSize * 0.5, halfSize * 0.0);
    ctx.lineTo(halfSize * 0.4, halfSize * 0.15);
    ctx.lineTo(halfSize * 0.35, halfSize * 0.3);
    ctx.stroke();

    // === GLITCH EFFECT ===
    if (Math.random() > 0.7) {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = isLocked ? '#00FFFF' : '#FF00FF';
        ctx.lineWidth = 1;
        const glitchY = (Math.random() - 0.5) * size * 0.6;
        ctx.beginPath();
        ctx.moveTo(-halfSize * 0.8, glitchY);
        ctx.lineTo(halfSize * 0.8, glitchY + (Math.random() - 0.5) * 5);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // === SCAN LINE EFFECT ===
    const scanY = ((time * 0.002) % 1) * size - halfSize;
    ctx.strokeStyle = `rgba(255, 100, 50, ${0.2 + glowIntensity * 0.2})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-halfSize * 0.7, scanY);
    ctx.lineTo(halfSize * 0.6, scanY);
    ctx.stroke();

    // === ENERGY PARTICLES around enemy ===
    for (let i = 0; i < 3; i++) {
        const particleAngle = (time * 0.003 + i * 2.1) % (Math.PI * 2);
        const particleR = halfSize * 0.7 + Math.sin(time * 0.008 + i) * 5;
        const px = Math.cos(particleAngle) * particleR;
        const py = Math.sin(particleAngle) * particleR;

        ctx.fillStyle = `rgba(255, ${150 + i * 30}, 50, ${0.6 + Math.sin(time * 0.01 + i) * 0.3})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FF6600';
        ctx.beginPath();
        ctx.arc(px, py, 2 + Math.sin(time * 0.015 + i) * 1, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Draw enemy visuals on canvas - New Sprite-Based Enemy with Professional VFX
 * Features: Sprite rendering, energy aura, motion trails, rotating shields
 */
export function drawEnemy(
    ctx: CanvasRenderingContext2D,
    state: EnemyManagerState,
    canvasWidth: number
): void {
    const dart = state.dart;
    if (dart.state === 'idle' || dart.state === 'cooldown') return;

    // Update animations
    updateEnemyAnimation(16);

    ctx.save();

    const time = Date.now();
    const jitterX = (Math.random() - 0.5) * 3;
    const jitterY = (Math.random() - 0.5) * 3;

    const spriteSize = ENEMY_CONFIG.SPRITE_SIZE;

    if (dart.state === 'tracking' || dart.state === 'locked') {
        const isLocked = dart.state === 'locked';
        const iconX = canvasWidth - 60;
        const trackingProgress = dart.timer / ENEMY_CONFIG.TRACKING_DURATION;

        // Pulse animation
        const pulse = isLocked
            ? 1.3 + Math.sin(time * 0.02) * 0.2
            : 1 + Math.sin(time * 0.008) * 0.15;

        // === 1. TARGETING LASER BEAM ===
        ctx.save();

        // Multi-layer laser effect
        const laserAlpha = isLocked ? 0.9 : 0.3 + trackingProgress * 0.4;

        // Outer glow
        ctx.beginPath();
        ctx.moveTo(0, dart.y);
        ctx.lineTo(canvasWidth, dart.y);
        ctx.strokeStyle = `rgba(255, 50, 50, ${laserAlpha * 0.4})`;
        ctx.lineWidth = isLocked ? 16 : 8;
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 30;
        ctx.stroke();

        // Core laser
        ctx.beginPath();
        ctx.setLineDash(isLocked ? [] : [20, 10]);
        ctx.moveTo(0, dart.y);
        ctx.lineTo(canvasWidth, dart.y);
        ctx.strokeStyle = isLocked ? '#FF4444' : `rgba(255, 100, 100, ${laserAlpha})`;
        ctx.lineWidth = isLocked ? 4 : 2;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.setLineDash([]);

        // Scanning particles along laser
        if (!isLocked) {
            const scanX = (time * 0.6) % canvasWidth;
            ctx.beginPath();
            ctx.arc(scanX, dart.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FF6666';
            ctx.fill();
        }

        ctx.restore();

        // === 2. ENEMY SPRITE WITH VFX ===
        ctx.save();
        ctx.translate(iconX + jitterX, dart.y + jitterY);

        // Rotating energy shield rings
        const shieldRotation = enemyAnimState.shieldRotation;
        for (let ring = 0; ring < 2; ring++) {
            const ringSize = (spriteSize * 0.8 + ring * 15) * pulse;
            const ringAlpha = isLocked ? 0.7 - ring * 0.2 : 0.4 - ring * 0.15;

            ctx.save();
            ctx.rotate(shieldRotation * (ring % 2 === 0 ? 1 : -1));

            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, ${isLocked ? 50 : 100}, ${isLocked ? 50 : 100}, ${ringAlpha})`;
            ctx.lineWidth = 2;
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 20 * pulse;

            // Hexagonal shield
            for (let i = 0; i <= 6; i++) {
                const angle = (Math.PI / 3) * i + ring * 0.3;
                const x = Math.cos(angle) * ringSize;
                const y = Math.sin(angle) * ringSize;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        }

        // Outer glow aura
        const glowSize = spriteSize * pulse * 1.2;
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        glowGradient.addColorStop(0, `rgba(255, 100, 100, ${0.6 + enemyAnimState.glowPulse * 0.3})`);
        glowGradient.addColorStop(0.4, `rgba(255, 50, 50, ${0.3 + enemyAnimState.glowPulse * 0.2})`);
        glowGradient.addColorStop(0.8, 'rgba(255, 0, 0, 0.1)');
        glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.shadowBlur = 40;
        ctx.shadowColor = isLocked ? '#FF0000' : '#FF6666';
        ctx.fill();

        // === DRAW CYBER ENEMY (Cached Sprite for Performance) ===
        // Use pre-rendered sprite if available, fallback to procedural
        const cachedSprite = EnemySpriteCache.getSprite(isLocked ? 'locked' : 'tracking');
        if (cachedSprite && EnemySpriteCache.isReady()) {
            const { offset } = EnemySpriteCache.getSpriteSize();
            const scaledSize = spriteSize * pulse;
            ctx.drawImage(
                cachedSprite,
                -offset * (scaledSize / spriteSize),
                -offset * (scaledSize / spriteSize),
                offset * 2 * (scaledSize / spriteSize),
                offset * 2 * (scaledSize / spriteSize)
            );
        } else {
            // Fallback: Procedural drawing (for first frame before cache is ready)
            drawCyberEnemy(ctx, 0, 0, spriteSize * pulse, isLocked, time);
        }

        // Danger symbol (!) for locked state
        if (isLocked) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#000000';
            ctx.fillText('!', 0, spriteSize * 0.5 + 15);
        }

        // Glitch effect lines
        if (Math.random() > 0.65) {
            ctx.strokeStyle = isLocked ? '#00FFFF' : '#FF00FF';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(-30, (Math.random() - 0.5) * 40);
            ctx.lineTo(30, (Math.random() - 0.5) * 40);
            ctx.stroke();
        }

        ctx.restore();
    }
    else if (dart.state === 'firing') {
        // === FIRING STATE: ENEMY SPRITE PROJECTILE ===

        // Update motion trail
        enemyAnimState.trailPositions.push({
            x: dart.x,
            y: dart.y,
            alpha: 0.8
        });
        // Limit trail length
        if (enemyAnimState.trailPositions.length > 8) {
            enemyAnimState.trailPositions.shift();
        }

        // === MOTION TRAIL ===
        ctx.save();
        for (let i = 0; i < enemyAnimState.trailPositions.length; i++) {
            const trail = enemyAnimState.trailPositions[i];
            const trailScale = 0.3 + (i / enemyAnimState.trailPositions.length) * 0.5;

            ctx.globalAlpha = trail.alpha * 0.5;

            // Trail glow
            const trailGlow = ctx.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, spriteSize * trailScale);
            trailGlow.addColorStop(0, 'rgba(255, 100, 100, 0.6)');
            trailGlow.addColorStop(0.5, 'rgba(255, 50, 50, 0.3)');
            trailGlow.addColorStop(1, 'rgba(255, 0, 0, 0)');

            ctx.beginPath();
            ctx.arc(trail.x, trail.y, spriteSize * trailScale, 0, Math.PI * 2);
            ctx.fillStyle = trailGlow;
            ctx.fill();
        }
        ctx.restore();

        ctx.save();
        ctx.translate(dart.x + jitterX, dart.y + jitterY);

        // === ENERGY STREAM (behind sprite) ===
        const streamGradient = ctx.createLinearGradient(0, 0, 120, 0);
        streamGradient.addColorStop(0, 'rgba(255, 150, 150, 0.9)');
        streamGradient.addColorStop(0.3, 'rgba(255, 50, 50, 0.6)');
        streamGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

        ctx.fillStyle = streamGradient;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(120, -8);
        ctx.lineTo(120, 8);
        ctx.closePath();
        ctx.fill();

        // === OUTER AURA ===
        const auraSize = spriteSize * 0.8;
        const auraGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, auraSize);
        auraGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        auraGradient.addColorStop(0.3, 'rgba(255, 100, 100, 0.5)');
        auraGradient.addColorStop(0.7, 'rgba(255, 0, 0, 0.2)');
        auraGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(0, 0, auraSize, 0, Math.PI * 2);
        ctx.fillStyle = auraGradient;
        ctx.shadowBlur = 35;
        ctx.shadowColor = '#FF0000';
        ctx.fill();

        // === DRAW CYBER ENEMY (Cached Sprite for Performance - Firing State) ===
        const firingSprite = EnemySpriteCache.getSprite('firing');
        if (firingSprite && EnemySpriteCache.isReady()) {
            const { offset } = EnemySpriteCache.getSpriteSize();
            const scaledSize = spriteSize * enemyAnimState.scaleWobble;
            ctx.drawImage(
                firingSprite,
                -offset * (scaledSize / spriteSize),
                -offset * (scaledSize / spriteSize),
                offset * 2 * (scaledSize / spriteSize),
                offset * 2 * (scaledSize / spriteSize)
            );
        } else {
            drawCyberEnemy(ctx, 0, 0, spriteSize * enemyAnimState.scaleWobble, true, time);
        }

        // === LEADING EDGE SPARK ===
        ctx.beginPath();
        ctx.moveTo(-spriteSize / 2 - 15 + jitterX, 0);
        ctx.lineTo(-spriteSize / 2 - 5, -6);
        ctx.lineTo(-spriteSize / 2 - 5, 6);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FF6666';
        ctx.shadowBlur = 15;
        ctx.fill();

        // === ELECTRIC ARCS ===
        ctx.strokeStyle = '#FFAAAA';
        ctx.lineWidth = 1.5;
        for (let arc = 0; arc < 4; arc++) {
            if (Math.random() > 0.4) {
                const arcAngle = Math.random() * Math.PI * 2;
                const arcDist = spriteSize / 2 + 5;
                ctx.beginPath();
                ctx.moveTo(Math.cos(arcAngle) * arcDist, Math.sin(arcAngle) * arcDist);
                ctx.lineTo(
                    Math.cos(arcAngle + 0.4) * (arcDist + 12),
                    Math.sin(arcAngle + 0.4) * (arcDist + 12)
                );
                ctx.stroke();
            }
        }

        // === PARTICLE SPARKS ===
        for (let p = 0; p < 3; p++) {
            if (Math.random() > 0.5) {
                const px = (Math.random() - 0.3) * spriteSize;
                const py = (Math.random() - 0.5) * spriteSize;
                ctx.beginPath();
                ctx.arc(px, py, 2 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fillStyle = '#FFFF00';
                ctx.shadowColor = '#FF6600';
                ctx.shadowBlur = 8;
                ctx.fill();
            }
        }

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
