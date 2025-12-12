/**
 * Slow Motion System
 * Requirements: 6.4
 * 
 * Provides slow motion ability that reduces game speed to 50% for 3 seconds.
 * Uses are tracked per game session based on the Time Warp upgrade level.
 */

export interface SlowMotionState {
  isActive: boolean;
  startTime: number;
  duration: number;
  usesRemaining: number;
  maxUses: number;
  speedMultiplier: number;
}

// Configuration
export const SLOW_MOTION_CONFIG = {
  duration: 3000,           // 3 seconds
  speedMultiplier: 0.5,     // 50% speed reduction
  fadeInDuration: 200,      // Fade in time (ms)
  fadeOutDuration: 300,     // Fade out time (ms)
};

/**
 * Create initial slow motion state for a new game
 */
export function createInitialSlowMotionState(maxUses: number): SlowMotionState {
  return {
    isActive: false,
    startTime: 0,
    duration: SLOW_MOTION_CONFIG.duration,
    usesRemaining: maxUses,
    maxUses,
    speedMultiplier: 1.0,
  };
}

/**
 * Activate slow motion if uses are available
 * Returns updated state
 */
export function activateSlowMotion(state: SlowMotionState, currentTime: number): SlowMotionState {
  if (state.isActive || state.usesRemaining <= 0) {
    return state;
  }
  
  return {
    ...state,
    isActive: true,
    startTime: currentTime,
    usesRemaining: state.usesRemaining - 1,
    speedMultiplier: SLOW_MOTION_CONFIG.speedMultiplier,
  };
}

/**
 * Update slow motion state each frame
 * Returns updated state with current speed multiplier
 */
export function updateSlowMotion(state: SlowMotionState, currentTime: number): SlowMotionState {
  if (!state.isActive) {
    return state;
  }
  
  const elapsed = currentTime - state.startTime;
  
  // Check if slow motion should end
  if (elapsed >= state.duration) {
    return {
      ...state,
      isActive: false,
      startTime: 0,
      speedMultiplier: 1.0,
    };
  }
  
  // Calculate speed multiplier with fade in/out
  let multiplier = SLOW_MOTION_CONFIG.speedMultiplier;
  
  // Fade in
  if (elapsed < SLOW_MOTION_CONFIG.fadeInDuration) {
    const fadeProgress = elapsed / SLOW_MOTION_CONFIG.fadeInDuration;
    multiplier = 1.0 - (1.0 - SLOW_MOTION_CONFIG.speedMultiplier) * fadeProgress;
  }
  // Fade out
  else if (elapsed > state.duration - SLOW_MOTION_CONFIG.fadeOutDuration) {
    const fadeProgress = (elapsed - (state.duration - SLOW_MOTION_CONFIG.fadeOutDuration)) / SLOW_MOTION_CONFIG.fadeOutDuration;
    multiplier = SLOW_MOTION_CONFIG.speedMultiplier + (1.0 - SLOW_MOTION_CONFIG.speedMultiplier) * fadeProgress;
  }
  
  return {
    ...state,
    speedMultiplier: multiplier,
  };
}

/**
 * Get the current speed multiplier
 */
export function getSpeedMultiplier(state: SlowMotionState): number {
  return state.speedMultiplier;
}

/**
 * Check if slow motion can be activated
 */
export function canActivateSlowMotion(state: SlowMotionState): boolean {
  return !state.isActive && state.usesRemaining > 0;
}

/**
 * Reset slow motion state for a new game
 */
export function resetSlowMotion(maxUses: number): SlowMotionState {
  return createInitialSlowMotionState(maxUses);
}
