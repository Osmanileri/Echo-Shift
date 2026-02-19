/**
 * Performance Utilities - Pre-allocated Reusable Objects
 * 
 * This module provides pre-allocated objects and utility functions
 * that eliminate per-frame garbage collection pressure.
 * 
 * CRITICAL: These objects are reused across frames. Never store references
 * to returned objects - copy the values you need immediately.
 */

// ============================================================================
// Pre-allocated Result Objects (Reused Every Frame)
// ============================================================================

/** Reusable {x, y} result for jitter offset calculations */
const _jitterResult = { x: 0, y: 0 };

/** Reusable {scale, verticalOffset} result for oscillation calculations */
const _oscillationResult = { scale: 1.0, verticalOffset: 0 };

/** Pre-allocated polygon vertex buffer (max 12 vertices) */
const _polygonBuffer: Array<{ x: number; y: number }> = [];
for (let i = 0; i < 12; i++) {
  _polygonBuffer.push({ x: 0, y: 0 });
}

/** Reusable connector render options */
const _connectorOptions = {
  greenTint: false,
  pulseScale: 1.0,
  opacity: 1.0,
};

// ============================================================================
// Jitter Offset (replaces GlitchVFX.generateJitterOffset)
// ============================================================================

/**
 * Generates jitter offset using pre-allocated object.
 * WARNING: Returned object is reused - read values immediately.
 * 
 * @param range - Jitter range in pixels (default 5)
 * @returns Pre-allocated {x, y} object (DO NOT STORE REFERENCE)
 */
export function getJitterOffset(range: number = 5): { x: number; y: number } {
  _jitterResult.x = (Math.random() * 2 - 1) * range;
  _jitterResult.y = (Math.random() * 2 - 1) * range;
  return _jitterResult;
}

// ============================================================================
// Oscillation Transform (replaces blockSystem.calculateOscillationTransform allocation)
// ============================================================================

/**
 * Calculate oscillation transform using pre-allocated object.
 * WARNING: Returned object is reused - read values immediately.
 * 
 * @returns Pre-allocated {scale, verticalOffset} object (DO NOT STORE REFERENCE)
 */
export function getOscillationResult(): { scale: number; verticalOffset: number } {
  return _oscillationResult;
}

/**
 * Set oscillation result values (call before returning)
 */
export function setOscillationResult(scale: number, verticalOffset: number): { scale: number; verticalOffset: number } {
  _oscillationResult.scale = scale;
  _oscillationResult.verticalOffset = verticalOffset;
  return _oscillationResult;
}

// ============================================================================
// Distorted Polygon (replaces GlitchVFX.generateDistortedPolygon allocation)
// ============================================================================

/**
 * Fill pre-allocated polygon buffer with distorted vertices.
 * WARNING: Returned array is reused - read values immediately.
 * 
 * @param centerX - Center X position
 * @param centerY - Center Y position
 * @param radius - Base radius
 * @param numVertices - Number of vertices (max 12)
 * @param offsetRange - Random offset range
 * @returns Pre-allocated vertex array with `numVertices` entries (DO NOT STORE REFERENCE)
 */
export function fillDistortedPolygon(
  centerX: number,
  centerY: number,
  radius: number,
  numVertices: number,
  offsetRange: number
): Array<{ x: number; y: number }> {
  const count = Math.min(numVertices, _polygonBuffer.length);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const distortion = (Math.random() * 2 - 1) * offsetRange;
    const r = radius + distortion;
    _polygonBuffer[i].x = centerX + Math.cos(angle) * r;
    _polygonBuffer[i].y = centerY + Math.sin(angle) * r;
  }
  // Return a view of just the vertices we need
  // Since we always iterate with a known count, callers use numVertices
  return _polygonBuffer;
}

// ============================================================================
// Connector Render Options (replaces GlitchVFX.getConnectorRenderOptions allocation)
// ============================================================================

/**
 * Get pre-allocated connector render options.
 * WARNING: Returned object is reused - read values immediately.
 */
export function getConnectorOptions(): typeof _connectorOptions {
  _connectorOptions.greenTint = false;
  _connectorOptions.pulseScale = 1.0;
  _connectorOptions.opacity = 1.0;
  return _connectorOptions;
}

/**
 * Set connector options values
 */
export function setConnectorOptions(
  greenTint: boolean,
  pulseScale: number,
  opacity: number
): typeof _connectorOptions {
  _connectorOptions.greenTint = greenTint;
  _connectorOptions.pulseScale = pulseScale;
  _connectorOptions.opacity = opacity;
  return _connectorOptions;
}

// ============================================================================
// Array Utilities (avoid .filter() allocations)
// ============================================================================

/**
 * In-place compact: removes elements where predicate returns false.
 * Modifies the array in place and updates its length.
 * Avoids creating a new array like .filter() would.
 * 
 * @param arr - Array to compact in place
 * @param keep - Predicate: return true to keep, false to remove
 * @returns The same array (for chaining convenience)
 */
export function compactInPlace<T>(arr: T[], keep: (item: T, index: number) => boolean): T[] {
  let writeIdx = 0;
  for (let i = 0; i < arr.length; i++) {
    if (keep(arr[i], i)) {
      if (writeIdx !== i) {
        arr[writeIdx] = arr[i];
      }
      writeIdx++;
    }
  }
  arr.length = writeIdx;
  return arr;
}

/**
 * Count items matching predicate without creating a filtered array.
 * Replaces patterns like `arr.filter(fn).length`.
 * 
 * @param arr - Array to count in
 * @param predicate - Function to test each element
 * @returns Count of matching items
 */
export function countWhere<T>(arr: T[], predicate: (item: T) => boolean): number {
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) count++;
  }
  return count;
}

/**
 * Iterate only over items matching predicate without creating filtered array.
 * Replaces patterns like `arr.filter(fn).forEach(cb)`.
 */
export function forEachWhere<T>(
  arr: T[],
  predicate: (item: T) => boolean,
  callback: (item: T, index: number) => void
): void {
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) {
      callback(arr[i], i);
    }
  }
}

// ============================================================================
// Frame Time Cache
// ============================================================================

let _cachedFrameTime = 0;

/**
 * Set the frame time once per frame at the beginning of the game loop.
 * All systems can then read it without calling Date.now() multiple times.
 */
export function setFrameTime(t: number): void {
  _cachedFrameTime = t;
}

/**
 * Get the cached frame time. Must be called AFTER setFrameTime in the same frame.
 */
export function getFrameTime(): number {
  return _cachedFrameTime;
}
