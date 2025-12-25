import { useCallback, useRef } from 'react';
import { INITIAL_CONFIG } from '../../../constants';
import { Lane } from '../../../data/patterns';
import * as BlockSystem from '../../../systems/blockSystem';
import * as PatternManager from '../../../systems/patternManager';
import * as PhaseDash from '../../../systems/phaseDash';
import * as ShardPlacement from '../../../systems/shardPlacement';
import { GameState } from '../../../types';
import { UsePlayerStateReturn } from '../types';
import { UseGameStateReturn } from './useGameState';
import { UseSystemRefsReturn } from './useSystemRefs';

export interface UseSpawnLogicOptions {
    gameState: GameState;
    systemRefs: UseSystemRefsReturn;
    gameStateHook: UseGameStateReturn;
    playerState: UsePlayerStateReturn;
    campaignMode: any;
    dailyChallengeMode: any;
}

export function useSpawnLogic({
    gameState,
    systemRefs,
    gameStateHook,
    playerState,
    campaignMode,
    dailyChallengeMode
}: UseSpawnLogicOptions) {

    // RNG State
    const runRngState = useRef<number>(Date.now() >>> 0 || 1);

    const nextRunRand = useCallback(() => {
        let t = runRngState.current;
        t ^= t << 13;
        t ^= t >>> 17;
        t ^= t << 5;
        runRngState.current = t >>> 0;
        return (t >>> 0) / 4294967296;
    }, []);

    // Block System State
    const blockSystemState = useRef<BlockSystem.BlockSystemState>(
        BlockSystem.createBlockSystemState()
    );

    // Legacy Refs for Shard Placement Context
    const lastSpawnedPolarity = useRef<"white" | "black" | null>(null);
    const lastGapCenter = useRef<number>(0);
    const lastHalfGap = useRef<number>(0);
    const shardSpawnSequence = useRef<number>(0);

    // --------------------------------------------------------------------------
    // Spawn Obstacles (Pattern Based)
    // --------------------------------------------------------------------------
    const spawnPatternObstacle = useCallback((
        lane: Lane,
        heightRatio: number,
        canvasHeight: number,
        canvasWidth: number
    ) => {
        // Only spawn on TOP call (spawns pair)
        if (lane !== "TOP") return;

        const phantomEnabled = !campaignMode?.enabled || campaignMode.levelConfig?.mechanics.phantom !== false;
        const forcePhantom = (dailyChallengeMode?.enabled && dailyChallengeMode.config?.modifiers.phantomOnly) || false;

        const spawnCtx: BlockSystem.PatternSpawnContext = {
            canvasHeight,
            canvasWidth,
            score: gameStateHook.score.current,
            connectorLength: playerState.currentConnectorLength.current,
            isGravityFlipped: systemRefs.gravityState.current.isFlipped,
            isDashing: PhaseDash.isDashActive(systemRefs.phaseDashState.current),
            dashXOffset: PhaseDash.getPlayerXOffset(systemRefs.phaseDashState.current),
            phantomEnabled: phantomEnabled ?? true,
            forcePhantom,
            rng: nextRunRand,
            obstaclePool: systemRefs.obstaclePool.current,
            state: blockSystemState.current,
        };

        const newObstacles = BlockSystem.spawnPatternObstaclePair(spawnCtx);
        systemRefs.obstacles.current.push(...newObstacles);

        // Sync legacy refs for shards
        lastSpawnedPolarity.current = blockSystemState.current.lastSpawnedPolarity;
        lastGapCenter.current = blockSystemState.current.lastGapCenter;
        lastHalfGap.current = blockSystemState.current.lastHalfGap;
    }, [gameStateHook, systemRefs, nextRunRand, campaignMode, dailyChallengeMode, playerState]);

    // --------------------------------------------------------------------------
    // Spawn Shards (Pattern Based)
    // --------------------------------------------------------------------------
    const spawnPatternShard = useCallback((
        lane: Lane,
        type: "safe" | "risky",
        canvasHeight: number,
        canvasWidth: number
    ) => {
        shardSpawnSequence.current += 1;
        const score = gameStateHook.score.current;

        // Determine max active shards based on score
        const maxActiveShards = score < 800 ? 3 : score < 2500 ? 5 : 8;
        if (systemRefs.activeShards.current.length >= maxActiveShards) return;

        // Risky shard warm-up
        if (type === "risky" && score < 500) return;

        // Position logic
        const dashXOffsetShard = PhaseDash.getPlayerXOffset(systemRefs.phaseDashState.current);
        const isDashingShard = PhaseDash.isDashActive(systemRefs.phaseDashState.current);
        const spawnX = isDashingShard
            ? canvasWidth * 0.5 + dashXOffsetShard + Math.random() * canvasWidth * 0.2
            : canvasWidth + 50;

        const midY = canvasHeight / 2;
        const gapCenter = lastGapCenter.current || midY;
        const halfGap = lastHalfGap.current || INITIAL_CONFIG.orbRadius + 10;
        const riskyEdge = 12;

        // Bonus Shard Logic
        let actualType: "safe" | "risky" | "bonus" = type;
        if (score >= 1000 && nextRunRand() < 0.25) {
            actualType = "bonus";
        }

        let y: number;
        if (actualType === "safe") {
            y = gapCenter;
        } else if (actualType === "bonus") {
            const bonusOffset = (nextRunRand() - 0.5) * halfGap * 0.8;
            y = gapCenter + bonusOffset;
        } else {
            y = lane === "TOP"
                ? gapCenter - halfGap + riskyEdge
                : gapCenter + halfGap - riskyEdge;
        }
        y = Math.max(20, Math.min(canvasHeight - 20, y));

        // Movement
        const movement = ShardPlacement.generateShardMovement(actualType, nextRunRand);

        // Acquire from pool
        const pooled = systemRefs.shardPool.current.acquire();
        pooled.x = spawnX;
        pooled.y = y;
        pooled.baseX = spawnX;
        pooled.baseY = y;
        pooled.lane = lane;
        pooled.type = actualType;
        pooled.value = actualType === "bonus"
            ? ShardPlacement.DEFAULT_SHARD_CONFIG.baseShardValue * 3
            : ShardPlacement.DEFAULT_SHARD_CONFIG.baseShardValue;
        pooled.collected = false;
        pooled.movement = movement;
        pooled.spawnTime = Date.now();
        (pooled as ShardPlacement.PlacedShard).isBonus = actualType === "bonus";

        systemRefs.activeShards.current.push(pooled);

        // Stats
        if (campaignMode?.enabled && campaignMode.useDistanceMode) {
            systemRefs.totalShardsSpawnedRef.current += 1;
        }
    }, [gameStateHook, systemRefs, nextRunRand, campaignMode]);


    // --------------------------------------------------------------------------
    // Update Logic (Called each frame)
    // --------------------------------------------------------------------------
    const updateSpawnLogic = useCallback((currentTime: number, canvasWidth: number, canvasHeight: number) => {
        if (gameState !== GameState.PLAYING) return;

        // 1. Select New Pattern if needed
        if (PatternManager.isPatternComplete(systemRefs.patternManagerState.current, currentTime)) {
            const pattern = PatternManager.selectPattern(gameStateHook.score.current);
            systemRefs.patternManagerState.current = PatternManager.startPattern(
                systemRefs.patternManagerState.current,
                pattern,
                currentTime
            );
        }

        // 2. Update Pattern Spawning
        systemRefs.patternManagerState.current = PatternManager.updatePatternSpawn(
            systemRefs.patternManagerState.current,
            currentTime,
            (lane, heightRatio) => spawnPatternObstacle(lane, heightRatio, canvasHeight, canvasWidth),
            (lane, type) => spawnPatternShard(lane, type, canvasHeight, canvasWidth)
        );

        // 3. Update Block Positions (Movement)
        const speed = gameStateHook.speed.current;
        const slowMotionMultiplier = systemRefs.slowMotionState.current.isActive ? 0.5 : 1.0;
        const constructSpeedMultiplier = 1.0;
        const dashSpeedMultiplier = PhaseDash.getSpeedMultiplier(systemRefs.phaseDashState.current);

        BlockSystem.updateBlockPositions(
            systemRefs.obstacles.current,
            speed,
            slowMotionMultiplier,
            constructSpeedMultiplier,
            dashSpeedMultiplier
        );

        // 4. Clean up offscreen blocks
        systemRefs.obstacles.current = BlockSystem.filterOffscreenBlocks(
            systemRefs.obstacles.current,
            systemRefs.obstaclePool.current
        );

        // 5. Shard Movement & Cleanup
        const activeShards = systemRefs.activeShards.current;
        const nextShards: ShardPlacement.PlacedShard[] = [];
        const shardPool = systemRefs.shardPool.current;

        for (const shard of activeShards) {
            if (shard.collected) {
                shardPool.release(shard as any);
                continue;
            }

            // Move Logic
            shard.baseX -= speed * slowMotionMultiplier * constructSpeedMultiplier * dashSpeedMultiplier;

            const dynamicPos = ShardPlacement.calculateShardPosition(shard, currentTime);
            shard.x = dynamicPos.x;
            shard.y = dynamicPos.y;

            if (shard.x > -50) {
                nextShards.push(shard);
            } else {
                shardPool.release(shard as any);
            }
        }
        systemRefs.activeShards.current = nextShards;

    }, [
        gameState,
        systemRefs,
        gameStateHook,
        spawnPatternObstacle,
        spawnPatternShard
    ]);

    return {
        updateSpawnLogic
    };
}
