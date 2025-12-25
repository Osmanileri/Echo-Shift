/**
 * Flux Overload System - Yasaklı Hat Mekaniği
 * 
 * DOĞRU MEKANİK:
 * - SIFIR ÇİZGİSİ (midline) tehlikeli hale gelir
 * - KALP ATIŞI GİBİ YANIP SÖNER - "YANIK" iken tehlikeli, "SÖNÜK" iken güvenli
 * - Oyuncu zamanlama ile blokları geçebilir
 * - Toplar midline'a "yanık" anında değerse hasar alır
 * 
 * 2-Strike System:
 * - 1st strike: Screen glitches, warning given
 * - 2nd strike: Game over
 */

// ============================================================================
// Interfaces
// ============================================================================

export interface FluxOverloadState {
    isActive: boolean;           // Is the flux overload event currently active?
    isWarningPhase: boolean;     // Yellow warning phase before active
    strikes: number;             // How many times player has been hit (max 2)
    lastHitTime: number;         // For hit cooldown tracking
    glitchIntensity: number;     // Screen glitch amount (0-1)
    phaseStartTime: number;      // When current phase started
    lastTriggerDistance: number; // Distance when last triggered (for cooldown)
}

// ============================================================================
// Configuration
// ============================================================================

export const FLUX_OVERLOAD_CONFIG = {
    // FEATURE FLAG - Set to false to disable entire feature
    // TODO: Bu özellik daha sonra düzenlenecek - nabız mekaniği ve görsellik iyileştirilecek
    enabled: false,  // DEVRE DIŞI - sonra aktifleştirilecek

    // Trigger settings
    minDistanceToActivate: 500,     // 500m minimum before first trigger (normal levels)
    testLevel: 2,                   // Level 2 test mode - triggers from start
    triggerChance: 0.005,           // 0.5% chance per frame when eligible
    testLevelTriggerChance: 0.02,   // 2% chance in test level

    // Phase durations
    warningDuration: 2000,          // 2 seconds warning phase
    activeDuration: 10000,          // 10 seconds active phase
    cooldownDistance: 200,          // 200m cooldown between events

    // PULSE MECHANIC - Kalp atışı gibi yanıp sönme
    pulseOnDuration: 800,           // 0.8 saniye "yanık" (tehlikeli)
    pulseOffDuration: 1200,         // 1.2 saniye "sönük" (güvenli geçiş fırsatı)

    // 2-Strike Damage System
    maxStrikes: 2,                  // 2nd hit = game over
    hitCooldown: 500,               // 0.5 second between hits

    // Midline collision
    midlineDangerMargin: 8,         // Orb must be within 8px of midline

    // Visual settings
    warningColor: '#FFDD00',        // Yellow warning
    activeColor: '#FF0055',         // Neon red/pink
    safeColor: '#330011',           // Dim red when safe (off pulse)
    jitterAmount: 6,                // Electric jitter pixels
    segments: 12,                   // Electric segments

    // Glitch overlay
    glitchDecayRate: 0.04,          // How fast glitch fades per frame
};

// ============================================================================
// State Factory
// ============================================================================

export function createInitialState(): FluxOverloadState {
    return {
        isActive: false,
        isWarningPhase: false,
        strikes: 0,
        lastHitTime: 0,
        glitchIntensity: 0,
        phaseStartTime: 0,
        lastTriggerDistance: 0,
    };
}

// ============================================================================
// Pulse Logic - Kalp Atışı
// ============================================================================

/**
 * Check if the pulse is currently "ON" (dangerous) or "OFF" (safe)
 * Returns true if dangerous (yanık), false if safe (sönük)
 */
export function isPulseOn(phaseStartTime: number, currentTime: number): boolean {
    const elapsed = currentTime - phaseStartTime;
    const pulseCycle = FLUX_OVERLOAD_CONFIG.pulseOnDuration + FLUX_OVERLOAD_CONFIG.pulseOffDuration;
    const positionInCycle = elapsed % pulseCycle;

    // First part of cycle = ON (dangerous)
    return positionInCycle < FLUX_OVERLOAD_CONFIG.pulseOnDuration;
}

/**
 * Get pulse intensity for visual effects (0-1)
 * 1.0 = full danger (bright), 0.0 = safe (dim)
 */
export function getPulseIntensity(phaseStartTime: number, currentTime: number): number {
    const elapsed = currentTime - phaseStartTime;
    const pulseCycle = FLUX_OVERLOAD_CONFIG.pulseOnDuration + FLUX_OVERLOAD_CONFIG.pulseOffDuration;
    const positionInCycle = elapsed % pulseCycle;

    const onDuration = FLUX_OVERLOAD_CONFIG.pulseOnDuration;
    const offDuration = FLUX_OVERLOAD_CONFIG.pulseOffDuration;

    if (positionInCycle < onDuration) {
        // ON phase - fade in at start, then full
        const fadeIn = Math.min(1, positionInCycle / 150); // 150ms fade in
        return fadeIn;
    } else {
        // OFF phase - fade out then dim
        const offPosition = positionInCycle - onDuration;
        const fadeOut = Math.max(0.15, 1 - (offPosition / 200)); // 200ms fade out, minimum 0.15
        return fadeOut;
    }
}

// ============================================================================
// Trigger Logic
// ============================================================================

export function shouldTrigger(
    distanceTraveled: number,
    currentLevel: number,
    state: FluxOverloadState
): boolean {
    // FEATURE DISABLED
    if (!FLUX_OVERLOAD_CONFIG.enabled) {
        return false;
    }

    // Already active? Don't trigger again
    if (state.isActive || state.isWarningPhase) {
        return false;
    }

    // Test level (Level 2) - immediate trigger from game start
    if (currentLevel === FLUX_OVERLOAD_CONFIG.testLevel) {
        // Only check cooldown after first trigger
        if (state.lastTriggerDistance > 0 &&
            distanceTraveled - state.lastTriggerDistance < FLUX_OVERLOAD_CONFIG.cooldownDistance) {
            return false;
        }
        return Math.random() < FLUX_OVERLOAD_CONFIG.testLevelTriggerChance;
    }

    // Normal levels: Cooldown check
    if (state.lastTriggerDistance > 0 &&
        distanceTraveled - state.lastTriggerDistance < FLUX_OVERLOAD_CONFIG.cooldownDistance) {
        return false;
    }

    // Must be past 500m for non-test levels
    if (distanceTraveled < FLUX_OVERLOAD_CONFIG.minDistanceToActivate) {
        return false;
    }

    return Math.random() < FLUX_OVERLOAD_CONFIG.triggerChance;
}

// ============================================================================
// Collision Detection
// ============================================================================

/**
 * Check if an orb is touching/crossing the midline
 */
export function isOrbTouchingMidline(
    orbY: number,
    orbRadius: number,
    midlineY: number
): boolean {
    const orbTop = orbY - orbRadius;
    const orbBottom = orbY + orbRadius;
    const margin = FLUX_OVERLOAD_CONFIG.midlineDangerMargin;

    return midlineY >= orbTop - margin && midlineY <= orbBottom + margin;
}

/**
 * Check if either orb is touching the midline
 */
export function checkMidlineCollision(
    whiteOrbY: number,
    blackOrbY: number,
    orbRadius: number,
    midlineY: number
): { collision: boolean; hitOrbY: number } {
    const whiteTouching = isOrbTouchingMidline(whiteOrbY, orbRadius, midlineY);
    const blackTouching = isOrbTouchingMidline(blackOrbY, orbRadius, midlineY);

    return {
        collision: whiteTouching || blackTouching,
        hitOrbY: whiteTouching ? whiteOrbY : blackOrbY,
    };
}

// ============================================================================
// State Updates
// ============================================================================

export function startWarning(
    state: FluxOverloadState,
    currentTime: number,
    distanceTraveled: number
): FluxOverloadState {
    return {
        ...state,
        isWarningPhase: true,
        isActive: false,
        phaseStartTime: currentTime,
        lastTriggerDistance: distanceTraveled,
    };
}

export function startActive(
    state: FluxOverloadState,
    currentTime: number
): FluxOverloadState {
    return {
        ...state,
        isWarningPhase: false,
        isActive: true,
        phaseStartTime: currentTime,
    };
}

export function endEvent(state: FluxOverloadState): FluxOverloadState {
    return {
        ...state,
        isWarningPhase: false,
        isActive: false,
        phaseStartTime: 0,
    };
}

/**
 * Main update function - handles phase transitions and midline collision
 * NOW WITH PULSE MECHANIC - only damages during "ON" pulse
 */
export function update(
    state: FluxOverloadState,
    currentTime: number,
    whiteOrbY: number,
    blackOrbY: number,
    orbRadius: number,
    midlineY: number
): { newState: FluxOverloadState; triggerGameOver: boolean; hitOrbY: number | null } {
    let newState = { ...state };
    let triggerGameOver = false;
    let hitOrbY: number | null = null;

    // Decay glitch intensity
    if (newState.glitchIntensity > 0) {
        newState.glitchIntensity = Math.max(0, newState.glitchIntensity - FLUX_OVERLOAD_CONFIG.glitchDecayRate);
    }

    // Warning phase transition to active
    if (newState.isWarningPhase) {
        const elapsed = currentTime - newState.phaseStartTime;
        if (elapsed >= FLUX_OVERLOAD_CONFIG.warningDuration) {
            newState = startActive(newState, currentTime);
        }
    }

    // Active phase logic
    if (newState.isActive) {
        const elapsed = currentTime - newState.phaseStartTime;

        // Check if active phase has ended
        if (elapsed >= FLUX_OVERLOAD_CONFIG.activeDuration) {
            newState = endEvent(newState);
        } else {
            // PULSE CHECK - Only dangerous when pulse is ON
            const pulseIsOn = isPulseOn(newState.phaseStartTime, currentTime);

            if (pulseIsOn) {
                // Check for midline collision during ON pulse
                const collision = checkMidlineCollision(whiteOrbY, blackOrbY, orbRadius, midlineY);

                if (collision.collision) {
                    // Cooldown check
                    if (currentTime - newState.lastHitTime > FLUX_OVERLOAD_CONFIG.hitCooldown) {
                        newState.strikes += 1;
                        newState.lastHitTime = currentTime;
                        newState.glitchIntensity = 1.0;
                        hitOrbY = collision.hitOrbY;

                        if (newState.strikes >= FLUX_OVERLOAD_CONFIG.maxStrikes) {
                            triggerGameOver = true;
                        }
                    }
                }
            }
            // During OFF pulse - safe to cross midline, no damage
        }
    }

    return { newState, triggerGameOver, hitOrbY };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getPhaseProgress(state: FluxOverloadState, currentTime: number): number {
    if (!state.isWarningPhase && !state.isActive) {
        return 0;
    }

    const elapsed = currentTime - state.phaseStartTime;
    const duration = state.isWarningPhase
        ? FLUX_OVERLOAD_CONFIG.warningDuration
        : FLUX_OVERLOAD_CONFIG.activeDuration;

    return Math.min(1, elapsed / duration);
}

export function getCurrentPhase(state: FluxOverloadState): 'inactive' | 'warning' | 'active' {
    if (state.isWarningPhase) return 'warning';
    if (state.isActive) return 'active';
    return 'inactive';
}

export function getRemainingStrikes(state: FluxOverloadState): number {
    return FLUX_OVERLOAD_CONFIG.maxStrikes - state.strikes;
}
