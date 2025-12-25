/**
 * GameEngine Hooks Index
 * 
 * Central export for all GameEngine hook modules.
 * Import hooks from here for cleaner import statements.
 * 
 * @example
 * ```tsx
 * import { usePlayerState } from './hooks';
 * ```
 */

export type { UsePlayerStateReturn } from '../types';
export { usePlayerState } from './usePlayerState';

// Future exports (to be added as we create more hooks):
// export { useGameState } from './useGameState';
// export { useSystemRefs } from './useSystemRefs';
// export { useDesktopInput } from './useDesktopInput';
// export { useMobileInput } from './useMobileInput';
// export { usePhaseDashInput } from './usePhaseDashInput';
