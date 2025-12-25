/**
 * GameEngine Hooks Index
 * 
 * Central export for all GameEngine hook modules.
 * Import hooks from here for cleaner import statements.
 * 
 * @example
 * ```tsx
 * import { usePlayerState, useDesktopInput } from './hooks';
 * ```
 */

// State hooks
export { useGameState } from './useGameState';
export { usePlayerState } from './usePlayerState';
export { useSystemRefs } from './useSystemRefs';

// Input hooks
export { useDesktopInput } from './useDesktopInput';
export { useMobileInput } from './useMobileInput';
export { usePlayerActions } from './usePlayerActions';
export { useSpawnLogic } from './useSpawnLogic';

// Type exports
export type { UsePlayerStateReturn } from '../types';
export type { UseDesktopInputOptions } from './useDesktopInput';
export type { UseGameStateReturn } from './useGameState';
export type { UseMobileInputOptions } from './useMobileInput';
export type { UseSystemRefsReturn } from './useSystemRefs';

