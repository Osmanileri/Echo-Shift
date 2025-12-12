/**
 * Ghost Racer System Property Tests
 * Requirements: 15.2, 15.5, 15.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  GhostFrame,
  GhostTimeline,
  getGhostPosition,
  serializeTimeline,
  deserializeTimeline,
} from './ghostRacer';

// Arbitrary for generating valid GhostFrame
const ghostFrameArb = fc.record({
  timestamp: fc.integer({ min: 0, max: 1000000 }),
  score: fc.integer({ min: 0, max: 100000 }),
  playerY: fc.float({ min: 0, max: 1, noNaN: true }),
  isSwapped: fc.boolean(),
});

// Arbitrary for generating valid GhostTimeline with sorted frames
const ghostTimelineArb = fc
  .array(ghostFrameArb, { minLength: 2, maxLength: 100 })
  .map((frames) => {
    // Sort frames by timestamp to ensure valid timeline
    const sortedFrames = [...frames].sort((a, b) => a.timestamp - b.timestamp);
    // Ensure unique timestamps
    const uniqueFrames: GhostFrame[] = [];
    let lastTimestamp = -1;
    for (const frame of sortedFrames) {
      if (frame.timestamp > lastTimestamp) {
        uniqueFrames.push(frame);
        lastTimestamp = frame.timestamp;
      }
    }
    // Ensure at least 2 frames
    if (uniqueFrames.length < 2) {
      uniqueFrames.push({
        timestamp: lastTimestamp + 100,
        score: 100,
        playerY: 0.5,
        isSwapped: false,
      });
    }
    return {
      frames: uniqueFrames,
      finalScore: uniqueFrames[uniqueFrames.length - 1].score,
      recordedAt: Date.now(),
    } as GhostTimeline;
  });

describe('Ghost Racer System', () => {
  /**
   * **Feature: echo-shift-professionalization, Property 12: Ghost Timeline Interpolation**
   * **Validates: Requirements 15.2**
   *
   * For any recorded ghost timeline and timestamp T within the timeline range,
   * the interpolated position SHALL be between the positions of the two nearest recorded frames.
   */
  it('Property 12: interpolated position is between nearest frames', () => {
    fc.assert(
      fc.property(ghostTimelineArb, (timeline) => {
        const frames = timeline.frames;
        if (frames.length < 2) return true;

        const minTime = frames[0].timestamp;
        const maxTime = frames[frames.length - 1].timestamp;

        // Test multiple timestamps within the range
        for (let i = 0; i < 10; i++) {
          const t = minTime + Math.random() * (maxTime - minTime);
          const result = getGhostPosition(timeline, t);

          if (!result) continue;

          // Find the two frames that bracket this timestamp
          let lowFrame: GhostFrame | null = null;
          let highFrame: GhostFrame | null = null;

          for (let j = 0; j < frames.length; j++) {
            if (frames[j].timestamp <= t) {
              lowFrame = frames[j];
            }
            if (frames[j].timestamp >= t && !highFrame) {
              highFrame = frames[j];
              break;
            }
          }

          if (lowFrame && highFrame) {
            const minY = Math.min(lowFrame.playerY, highFrame.playerY);
            const maxY = Math.max(lowFrame.playerY, highFrame.playerY);

            // Allow small floating point tolerance
            const tolerance = 0.0001;
            expect(result.playerY).toBeGreaterThanOrEqual(minY - tolerance);
            expect(result.playerY).toBeLessThanOrEqual(maxY + tolerance);
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: echo-shift-professionalization, Property 13: Ghost Data Round-Trip**
   * **Validates: Requirements 15.5, 15.6**
   *
   * For any valid ghost timeline array, serializing to JSON and deserializing
   * SHALL produce an equivalent array with all frames intact.
   */
  it('Property 13: serialize then deserialize produces equivalent timeline', () => {
    fc.assert(
      fc.property(ghostTimelineArb, (timeline) => {
        // Serialize to JSON
        const json = serializeTimeline(timeline);

        // Deserialize back
        const restored = deserializeTimeline(json);

        // Should not be null
        expect(restored).not.toBeNull();
        if (!restored) return false;

        // Check finalScore
        expect(restored.finalScore).toBe(timeline.finalScore);

        // Check recordedAt
        expect(restored.recordedAt).toBe(timeline.recordedAt);

        // Check frames length
        expect(restored.frames.length).toBe(timeline.frames.length);

        // Check each frame
        for (let i = 0; i < timeline.frames.length; i++) {
          const original = timeline.frames[i];
          const restoredFrame = restored.frames[i];

          expect(restoredFrame.timestamp).toBe(original.timestamp);
          expect(restoredFrame.score).toBe(original.score);
          expect(restoredFrame.isSwapped).toBe(original.isSwapped);
          // playerY may have floating point differences, use close comparison
          expect(restoredFrame.playerY).toBeCloseTo(original.playerY, 10);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
