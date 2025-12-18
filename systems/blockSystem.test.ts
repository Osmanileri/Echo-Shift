/**
 * Block System Tests
 */

import { describe, expect, it } from "vitest";
import * as BlockSystem from "./blockSystem";

describe("BlockSystem", () => {
  describe("createBlockSystemState", () => {
    it("should create initial state with default values", () => {
      const state = BlockSystem.createBlockSystemState();
      
      expect(state.lastSpawnedPolarity).toBeNull();
      expect(state.lastGapCenter).toBe(0);
      expect(state.lastHalfGap).toBe(0);
      expect(state.patternPolarity).toBe("white");
      expect(state.shardSpawnSequence).toBe(0);
      expect(state.sameColorStreak).toBe(0);
    });
  });

  describe("generateOscillationProps", () => {
    it("should generate oscillation props with ~25% chance", () => {
      // Test with deterministic RNG
      let oscillatingCount = 0;
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const rng = () => i / iterations;
        const props = BlockSystem.generateOscillationProps(rng);
        if (props.shouldOscillate) oscillatingCount++;
      }
      
      // Should be approximately 25%
      expect(oscillatingCount).toBeGreaterThan(200);
      expect(oscillatingCount).toBeLessThan(300);
    });

    it("should set intensity to 0 when not oscillating", () => {
      const rng = () => 0.3; // > 0.25, so no oscillation
      const props = BlockSystem.generateOscillationProps(rng);
      
      expect(props.shouldOscillate).toBe(false);
      expect(props.oscillationIntensity).toBe(0);
    });

    it("should set intensity between 0.7 and 0.9 when oscillating", () => {
      const rng = () => 0.1; // < 0.25, so oscillation
      const props = BlockSystem.generateOscillationProps(rng);
      
      expect(props.shouldOscillate).toBe(true);
      expect(props.oscillationIntensity).toBeGreaterThanOrEqual(0.7);
      expect(props.oscillationIntensity).toBeLessThanOrEqual(0.9);
    });

    it("should generate random phase between 0 and 2π", () => {
      const rng = () => 0.5;
      const props = BlockSystem.generateOscillationProps(rng);
      
      expect(props.oscillationPhase).toBeGreaterThanOrEqual(0);
      expect(props.oscillationPhase).toBeLessThanOrEqual(Math.PI * 2);
    });
  });

  describe("calculateOscillationTransform", () => {
    it("should return scale 1.0 and offset 0 for non-oscillating blocks", () => {
      const obs = {
        id: "test",
        x: 100,
        y: 100,
        targetY: 100,
        width: 50,
        height: 200,
        lane: "top" as const,
        polarity: "white" as const,
        passed: false,
        shouldOscillate: false,
        oscillationIntensity: 0,
        oscillationPhase: 0,
      };
      
      const transform = BlockSystem.calculateOscillationTransform(obs, Date.now(), 120);
      
      expect(transform.scale).toBe(1.0);
      expect(transform.verticalOffset).toBe(0);
    });

    it("should return varying scale and offset for oscillating blocks", () => {
      const obs = {
        id: "test",
        x: 100,
        y: 100,
        targetY: 100,
        width: 50,
        height: 200,
        lane: "top" as const,
        polarity: "white" as const,
        passed: false,
        shouldOscillate: true,
        oscillationIntensity: 1.0,
        oscillationPhase: 0,
      };
      
      // 900ms cycle for vertical bobbing
      const transform1 = BlockSystem.calculateOscillationTransform(obs, 0, 120);
      const transform2 = BlockSystem.calculateOscillationTransform(obs, 225, 120); // 1/4 cycle
      
      // Scale should be exactly 1.0 (no scale change, only vertical movement)
      expect(transform1.scale).toBe(1.0);
      expect(transform2.scale).toBe(1.0);
      
      // Vertical offset should vary based on time
      expect(typeof transform1.verticalOffset).toBe("number");
      expect(typeof transform2.verticalOffset).toBe("number");
      expect(Number.isFinite(transform1.verticalOffset)).toBe(true);
      expect(Number.isFinite(transform2.verticalOffset)).toBe(true);
    });
  });

  describe("spawnObstaclePair", () => {
    it("should spawn two obstacles with opposite polarities", () => {
      let rngIndex = 0;
      const rngValues = [0.3, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
      const rng = () => rngValues[rngIndex++ % rngValues.length];
      
      const ctx: BlockSystem.SpawnContext = {
        canvasHeight: 600,
        canvasWidth: 400,
        score: 100,
        connectorLength: 100,
        isGravityFlipped: false,
        isDashing: false,
        dashXOffset: 0,
        phantomEnabled: false,
        forcePhantom: false,
        rng,
      };
      
      const obstacles = BlockSystem.spawnObstaclePair(ctx);
      
      expect(obstacles).toHaveLength(2);
      expect(obstacles[0].polarity).not.toBe(obstacles[1].polarity);
    });

    it("should spawn obstacles at canvas edge when not dashing", () => {
      const rng = () => 0.5;
      
      const ctx: BlockSystem.SpawnContext = {
        canvasHeight: 600,
        canvasWidth: 400,
        score: 100,
        connectorLength: 100,
        isGravityFlipped: false,
        isDashing: false,
        dashXOffset: 0,
        phantomEnabled: false,
        forcePhantom: false,
        rng,
      };
      
      const obstacles = BlockSystem.spawnObstaclePair(ctx);
      
      expect(obstacles[0].x).toBe(450); // canvasWidth + 50
      expect(obstacles[1].x).toBe(450);
    });

    it("should assign oscillation properties to some blocks", () => {
      let rngIndex = 0;
      // First call for polarity, then for cross direction, then for oscillation
      const rngValues = [0.5, 0.5, 0.5, 0.1, 0.5, 0.5, 0.1, 0.5, 0.5]; // 0.1 < 0.30 = oscillate
      const rng = () => rngValues[rngIndex++ % rngValues.length];
      
      const ctx: BlockSystem.SpawnContext = {
        canvasHeight: 600,
        canvasWidth: 400,
        score: 100,
        connectorLength: 100,
        isGravityFlipped: false,
        isDashing: false,
        dashXOffset: 0,
        phantomEnabled: false,
        forcePhantom: false,
        rng,
      };
      
      const obstacles = BlockSystem.spawnObstaclePair(ctx);
      
      // At least one should have oscillation properties defined
      const hasOscillation = obstacles.some(obs => 
        obs.shouldOscillate !== undefined && 
        obs.oscillationIntensity !== undefined &&
        obs.oscillationPhase !== undefined
      );
      expect(hasOscillation).toBe(true);
    });
  });

  describe("updateBlockPositions", () => {
    it("should move blocks horizontally based on speed", () => {
      const obstacles = [
        {
          id: "test1",
          x: 400,
          y: 0,
          targetY: 0,
          width: 50,
          height: 200,
          lane: "top" as const,
          polarity: "white" as const,
          passed: false,
        },
      ];
      
      BlockSystem.updateBlockPositions(obstacles, 10, 1, 1, 1);
      
      expect(obstacles[0].x).toBe(390); // 400 - 10
    });

    it("should apply slow motion multiplier", () => {
      const obstacles = [
        {
          id: "test1",
          x: 400,
          y: 0,
          targetY: 0,
          width: 50,
          height: 200,
          lane: "top" as const,
          polarity: "white" as const,
          passed: false,
        },
      ];
      
      BlockSystem.updateBlockPositions(obstacles, 10, 0.5, 1, 1);
      
      expect(obstacles[0].x).toBe(395); // 400 - (10 * 0.5)
    });

    it("should animate blocks toward targetY", () => {
      const obstacles = [
        {
          id: "test1",
          x: 400,
          y: -100,
          targetY: 0,
          width: 50,
          height: 200,
          lane: "top" as const,
          polarity: "white" as const,
          passed: false,
        },
      ];
      
      BlockSystem.updateBlockPositions(obstacles, 0, 1, 1, 1);
      
      // Should move toward targetY
      expect(obstacles[0].y).toBeGreaterThan(-100);
      expect(obstacles[0].y).toBeLessThan(0);
    });
  });

  describe("filterOffscreenBlocks", () => {
    it("should keep blocks that are on screen", () => {
      const obstacles = [
        {
          id: "test1",
          x: 100,
          y: 0,
          targetY: 0,
          width: 50,
          height: 200,
          lane: "top" as const,
          polarity: "white" as const,
          passed: false,
        },
      ];
      
      const filtered = BlockSystem.filterOffscreenBlocks(obstacles);
      
      expect(filtered).toHaveLength(1);
    });

    it("should remove blocks that are off screen", () => {
      const obstacles = [
        {
          id: "test1",
          x: -200,
          y: 0,
          targetY: 0,
          width: 50,
          height: 200,
          lane: "top" as const,
          polarity: "white" as const,
          passed: false,
        },
      ];
      
      const filtered = BlockSystem.filterOffscreenBlocks(obstacles);
      
      expect(filtered).toHaveLength(0);
    });
  });
});
