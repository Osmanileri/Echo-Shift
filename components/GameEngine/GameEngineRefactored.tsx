import React, { useEffect, useRef, useState } from "react";
import { INITIAL_CONFIG } from "../../constants";
import { useCharacterStore } from "../../store/characterStore";
import { GameState } from "../../types";
import { MIDLINE_CONFIG } from "../../utils/midlineSystem";
import {
    useDesktopInput,
    useGameState,
    useMobileInput,
    usePlayerActions,
    usePlayerState,
    useSystemRefs
} from "./hooks";
import { useSpawnLogic } from "./hooks/useSpawnLogic";

import {
    MobileControlsHint,
    renderBackground,
    renderEntities,
    renderParticles,
    renderUI
} from "./index";
import { GameEngineProps } from "./types";

// Logic Systems
import * as AudioSystem from "../../systems/audioSystem";
import * as GlitchSystem from "../../systems/glitchSystem";
import * as ParticleSystem from "../../systems/particleSystem";
import * as ResonanceSystem from "../../systems/resonanceSystem";
import * as CollisionSystem from "./logic/CollisionSystem";
import * as PhysicsSystem from "./logic/PhysicsSystem";
import * as ProgressionSystem from "./logic/ProgressionSystem";

/**
 * GameEngineRefactored
 * 
 * The modular version of the GameEngine component.
 * Integrates extracted hooks, logic systems, and renderers.
 */
const GameEngineRefactored: React.FC<GameEngineProps> = (props) => {
    const {
        gameState,
        onScoreUpdate,
        onGameOver,
        setGameSpeedDisplay,
        dailyChallengeMode,
        campaignMode,
        zenMode,
        ghostRacerMode,
        restoreMode,
        ritualTracking,
        onMissionEvent
    } = props;

    // Global Store
    const { activeCharacter, equippedSkin } = useCharacterStore();

    // ===========================================================================
    // 1. Initialization & Refs
    // ===========================================================================

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const containerRef = useRef<HTMLDivElement>(null);

    // Mobile detection state
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            const isMobileDevice = /android|iPad|iPhone|iPod/i.test(userAgent);
            const isSmallScreen = window.innerWidth < 768;
            setIsMobile(isMobileDevice || isSmallScreen);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // System State Hooks
    const systemRefs = useSystemRefs();
    const gameStateHook = useGameState(systemRefs.resetAllSystems);
    const playerStateHook = usePlayerState(systemRefs.resetAllSystems);

    // Player Logic & Actions
    const { triggerSwap } = usePlayerActions({
        gameState,
        systemRefs,
        playerState: playerStateHook,
        ritualTracking,
        activeCharacter
    });

    // Spawn Logic
    const { updateSpawnLogic } = useSpawnLogic({
        gameState,
        systemRefs,
        gameStateHook,
        playerState: playerStateHook,
        campaignMode,
        dailyChallengeMode
    });

    // ===========================================================================
    // 2. Input Handling
    // ===========================================================================

    const invertedControls = dailyChallengeMode?.enabled && dailyChallengeMode?.config?.modifiers?.invertedControls;

    // Mobile Input
    useMobileInput({
        gameState,
        canvasRef,
        isMobile,
        playerY: playerStateHook.playerY,
        targetPlayerY: playerStateHook.targetPlayerY,
        triggerSwap,
        inputStateRef: systemRefs.inputStateRef,
        phaseDashState: systemRefs.phaseDashState,
        phaseDashVFXState: systemRefs.phaseDashVFXState,
        glitchModeState: systemRefs.glitchModeState,
        invertedControls
    });

    // Desktop Input
    useDesktopInput({
        gameState,
        canvasRef,
        isMobile,
        targetPlayerY: playerStateHook.targetPlayerY,
        triggerSwap,
        inputStateRef: systemRefs.inputStateRef,
        invertedControls
    });

    // ===========================================================================
    // 3. Game Loop
    // ===========================================================================

    const loop = (time: number) => {
        const canvas = canvasRef.current;

        // Safety check for canvas dimensions before logic
        const width = canvas?.width || 800;
        const height = canvas?.height || 600;
        const midlineY = height / 2;

        // A. Logic Updates
        if (gameState === GameState.PLAYING) {
            // 1. Progression (Speed & Distance)
            const speed = ProgressionSystem.calculateBaseSpeed(
                gameStateHook.score.current,
                gameStateHook.gameStartTime.current
            );
            gameStateHook.speed.current = speed;
            setGameSpeedDisplay(speed);

            // 2. Player Physics
            // Manual Interpolation (PhysicsSystem.updatePhysics returns state w/o refs)
            playerStateHook.playerY.current = PhysicsSystem.interpolatePosition(
                playerStateHook.playerY.current,
                playerStateHook.targetPlayerY.current,
                0.1 // Smoothing
            );

            // Calculate velocity
            playerStateHook.playerVelocityY.current = (playerStateHook.playerY.current - playerStateHook.targetPlayerY.current) * height * -0.1;

            // 3. Rotation Logic (Manual Update)
            const rotDiff = playerStateHook.targetRotation.current - playerStateHook.rotationAngle.current;
            if (Math.abs(rotDiff) > 0.001) {
                playerStateHook.rotationAngle.current += rotDiff * 0.15;
            } else {
                playerStateHook.rotationAngle.current = playerStateHook.targetRotation.current;
            }

            // 4. Calculate Orb Positions
            const orbPos = PhysicsSystem.calculateOrbPositions({
                playerY: playerStateHook.playerY.current,
                connectorLength: playerStateHook.currentConnectorLength.current,
                rotationAngle: playerStateHook.rotationAngle.current,
                isSwapped: playerStateHook.isSwapped.current,
                canvasWidth: width,
                canvasHeight: height
            });

            // 5. Collision Detection
            const colResult = CollisionSystem.checkAllCollisions({
                whiteOrb: { ...orbPos.whiteOrb, radius: INITIAL_CONFIG.orbRadius },
                blackOrb: { ...orbPos.blackOrb, radius: INITIAL_CONFIG.orbRadius },
                obstacles: systemRefs.obstacles.current,
                shards: systemRefs.activeShards.current,
                midlineY: midlineY,
                isPhasing: playerStateHook.isPhasing.current,
                shieldActive: false
            });

            // Handle Collision Results
            if (colResult.obstacleHit) {
                // Type assertion for hasCollided property
                const obs = colResult.obstacleHit as any;
                if (!obs.hasCollided) {
                    obs.hasCollided = true;
                    AudioSystem.playGameOver();
                    onGameOver(gameStateHook.score.current);
                }
            }

            if (colResult.shardCollected) {
                if (!colResult.shardCollected.collected) {
                    colResult.shardCollected.collected = true;
                    const newScore = gameStateHook.score.current + colResult.shardCollected.value;
                    gameStateHook.score.current = newScore;
                    onScoreUpdate(newScore);

                    AudioSystem.playShardCollect();

                    systemRefs.scorePopups.current.push({
                        x: colResult.shardCollected.x,
                        y: colResult.shardCollected.y - 20,
                        text: `+${colResult.shardCollected.value}`,
                        color: "#FFD700",
                        life: 1.0,
                        vy: -2
                    });
                }
            }

            // 6. Particle System Update
            ParticleSystem.update();

            // 7. Spawn & Entity Logic (Blocks & Shards)
            updateSpawnLogic(Date.now(), width, height);

            // 8. Side Systems Update
            const delta = 16.67;
            const now = Date.now();

            // Resonance Update
            systemRefs.resonanceState.current = ResonanceSystem.update(
                systemRefs.resonanceState.current,
                delta,
                now
            );

            // Glitch Update
            systemRefs.glitchModeState.current = GlitchSystem.updateGlitchMode(
                systemRefs.glitchModeState.current,
                delta
            );
        }

        // B. Render
        if (canvas) {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
                    canvas.width = clientWidth;
                    canvas.height = clientHeight;
                }
            }

            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Determine orb positions for rendering
                const orbPos = PhysicsSystem.calculateOrbPositions({
                    playerY: playerStateHook.playerY.current,
                    connectorLength: playerStateHook.currentConnectorLength.current,
                    rotationAngle: playerStateHook.rotationAngle.current,
                    isSwapped: playerStateHook.isSwapped.current,
                    canvasWidth: width,
                    canvasHeight: height
                });

                // 1. Background
                renderBackground(
                    {
                        ctx, width, height, midlineY,
                        elapsedTime: Date.now() - gameStateHook.gameStartTime.current,
                        currentFrequency: MIDLINE_CONFIG.baseFrequency
                    },
                    {
                        gravityState: systemRefs.gravityState.current,
                        midlineState: systemRefs.midlineState.current,
                        resonanceState: systemRefs.resonanceState.current,
                        tensionIntensity: systemRefs.midlineState.current.tension,
                        isCritical: false,
                        zenModeEnabled: zenMode?.enabled || false
                    }
                );

                // 2. Legacy Particles
                // Note: Modified ParticleRenderContext to match actual implementation
                renderParticles(
                    {
                        ctx,
                        zenModeEnabled: zenMode?.enabled || false,
                        zenModeState: systemRefs.zenModeState.current,
                        hasActiveCharacter: !!activeCharacter
                    },
                    systemRefs.particles.current
                );

                // 3. System Particles (Singleton)
                ParticleSystem.render(ctx);

                // 4. Entities
                renderEntities(
                    { ctx, width, height, midlineY },
                    {
                        whiteOrb: {
                            x: orbPos.whiteOrb.x,
                            y: orbPos.whiteOrb.y,
                            radius: INITIAL_CONFIG.orbRadius,
                            color: '#fff'
                        },
                        blackOrb: {
                            x: orbPos.blackOrb.x,
                            y: orbPos.blackOrb.y,
                            radius: INITIAL_CONFIG.orbRadius,
                            color: '#000'
                        },
                        equippedSkin: equippedSkin?.id || 'default', // Access from store
                        activeCharacter: activeCharacter,
                        spiritSprite: null, // TODO: Sprite integration
                        resonanceState: systemRefs.resonanceState.current,
                        glitchModeState: systemRefs.glitchModeState.current,
                        playerVelocityY: playerStateHook.playerVelocityY.current,
                        whiteOrbTrail: playerStateHook.whiteOrbTrail.current,
                        blackOrbTrail: playerStateHook.blackOrbTrail.current
                    },
                    systemRefs.obstacles.current,
                    systemRefs.activeShards.current
                );

                // 5. UI Layer
                renderUI(
                    { ctx, width, height },
                    {
                        scorePopups: systemRefs.scorePopups.current,
                        visualEffects: systemRefs.visualEffects.current,
                        resonanceState: systemRefs.resonanceState.current,
                        shiftState: systemRefs.shiftState.current,
                        slowMotionState: systemRefs.slowMotionState.current,
                        shieldActive: false
                    }
                );
            }
        }

        requestRef.current = requestAnimationFrame(loop);
    };

    // Start/Stop Loop
    useEffect(() => {
        requestRef.current = requestAnimationFrame(loop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [gameState]);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full overflow-hidden cursor-pointer touch-none select-none"
        >
            <canvas ref={canvasRef} className="block w-full h-full touch-none" />
            <MobileControlsHint
                isMobile={isMobile}
                gameState={gameState}
                showMobileHint={true}
            />
        </div>
    );
};

export default GameEngineRefactored;
