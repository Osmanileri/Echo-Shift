/**
 * NumbersMissionVictory Component
 * Victory screen for completed Numbers Mission with reward animation
 */

import { Gem, Home, Play, Star, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as AudioSystem from '../../systems/audioSystem';
import { getHapticSystem } from '../../systems/hapticSystem';
import { magneticRewardSystem } from '../../systems/magneticRewardSystem';
import { NUMBERS_MISSION_REWARDS } from '../../systems/numbersMissionService';
import type { NumbersMissionData } from '../../types';
import AnimatedCounter from '../AnimatedCounter';

interface NumbersMissionVictoryProps {
    mission: NumbersMissionData;
    distanceTraveled: number;
    onClaim: () => void;
    onPlayAgain: () => void;
    onMainMenu: () => void;
}

type VictoryPhase = 'reveal' | 'rewards' | 'complete';

const NumbersMissionVictory: React.FC<NumbersMissionVictoryProps> = ({
    mission,
    distanceTraveled,
    onClaim,
    onPlayAgain,
    onMainMenu,
}) => {
    const [phase, setPhase] = useState<VictoryPhase>('reveal');
    const [displayedGems, setDisplayedGems] = useState(0);
    const [counterScale, setCounterScale] = useState(1);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const counterRef = useRef<HTMLDivElement>(null);
    const centerRef = useRef<HTMLDivElement>(null);
    const animationFrameRef = useRef<number>(0);

    const handleButtonClick = useCallback((callback: () => void) => {
        getHapticSystem().trigger('selection');
        AudioSystem.playButtonClick();
        callback();
    }, []);

    // Phase 1: Reveal animation
    useEffect(() => {
        if (phase !== 'reveal') return;

        // Play success sound
        AudioSystem.playNewHighScore();
        getHapticSystem().trigger('success');

        // Transition to rewards phase after delay
        const timer = setTimeout(() => {
            setPhase('rewards');
        }, 1500);

        return () => clearTimeout(timer);
    }, [phase]);

    // Phase 2: Flying gems animation
    useEffect(() => {
        if (phase !== 'rewards') return;

        const canvas = canvasRef.current;
        const counterRect = counterRef.current?.getBoundingClientRect();
        const centerRect = centerRef.current?.getBoundingClientRect();

        if (!canvas || !counterRect || !centerRect) {
            setPhase('complete');
            return;
        }

        // Setup canvas
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setPhase('complete');
            return;
        }

        // Configure magnetic system
        magneticRewardSystem.setTarget(
            counterRect.left + counterRect.width / 2,
            counterRect.top + counterRect.height / 2
        );

        // Track collected gems
        let collectedGems = 0;
        const totalParticles = 15;
        const gemsPerParticle = NUMBERS_MISSION_REWARDS.gems / totalParticles;

        magneticRewardSystem.onCollect = () => {
            collectedGems++;
            setDisplayedGems(Math.min(NUMBERS_MISSION_REWARDS.gems, Math.round(collectedGems * gemsPerParticle)));

            // Counter pop animation
            setCounterScale(1.15);
            setTimeout(() => setCounterScale(1), 100);

            // Sound and haptic
            AudioSystem.playShardCollect();
            getHapticSystem().trigger('light');
        };

        // Emit particles from center
        magneticRewardSystem.emit(
            centerRect.left + centerRect.width / 2,
            centerRect.top + centerRect.height / 2,
            totalParticles
        );

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            magneticRewardSystem.update();
            magneticRewardSystem.draw(ctx);

            if (!magneticRewardSystem.isComplete()) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Ensure final count
                setDisplayedGems(NUMBERS_MISSION_REWARDS.gems);
                setPhase('complete');
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            magneticRewardSystem.clear();
        };
    }, [phase]);

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 text-white overflow-hidden px-4">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/90 via-black/95 to-black backdrop-blur-md" />

            {/* Animated glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
            </div>

            {/* Canvas for particle animation */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none z-50"
            />

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                {/* Victory title */}
                <div
                    className={`transition-all duration-500 ${phase === 'reveal' ? 'scale-100 opacity-100' : 'scale-100 opacity-100'
                        }`}
                >
                    <h2 className="text-2xl sm:text-3xl font-black mb-1 tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-500">
                        GÖREV
                    </h2>
                    <h2 className="text-2xl sm:text-3xl font-black mb-4 tracking-[0.15em] text-cyan-400">
                        TAMAMLANDI!
                    </h2>
                </div>

                {/* Star */}
                <div className={`mb-4 transition-all duration-500 ${phase !== 'reveal' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`}>
                    <Star className="w-12 h-12 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                </div>

                {/* Mission info */}
                <div
                    ref={centerRef}
                    className="flex flex-col items-center gap-2 mb-4 p-4 bg-white/5 rounded-xl border border-cyan-500/20 backdrop-blur-sm w-full"
                >
                    {/* Target achieved */}
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter text-cyan-400">
                            {Math.floor(distanceTraveled)}m
                        </span>
                        <span className="text-lg text-white/40">/</span>
                        <span className="text-lg text-white/60 font-bold">
                            {mission.number}m
                        </span>
                    </div>

                    {/* Trivia reminder */}
                    <p className="text-gray-400 text-xs italic text-center mt-2">
                        "{mission.text.substring(0, 80)}{mission.text.length > 80 ? '...' : ''}"
                    </p>
                </div>

                {/* Rewards display */}
                <div
                    ref={counterRef}
                    className="flex flex-col items-center gap-2 mb-6"
                    style={{
                        transform: `scale(${counterScale})`,
                        transition: 'transform 100ms ease-out',
                    }}
                >
                    {/* Gems */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-full border border-cyan-500/30">
                        <Gem className="w-5 h-5 text-cyan-400" />
                        <span className="text-lg font-bold text-cyan-400 tracking-wider">
                            +<AnimatedCounter value={displayedGems} duration={500} />
                        </span>
                    </div>

                    {/* XP */}
                    <div className="flex items-center gap-1 text-sm text-yellow-400">
                        <Zap className="w-4 h-4" />
                        <span className="font-bold">+{NUMBERS_MISSION_REWARDS.xp} XP</span>
                    </div>
                </div>

                {/* Action buttons */}
                {phase === 'complete' && (
                    <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <button
                            onClick={() => {
                                handleButtonClick(onClaim);
                            }}
                            className="group flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-sm tracking-widest active:scale-[0.98] transition-all duration-300 rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                        >
                            <Gem className="w-5 h-5" />
                            TOPLA & DEVAM ET
                        </button>

                        <button
                            onClick={() => handleButtonClick(onPlayAgain)}
                            className="group flex items-center justify-center gap-2 w-full py-3 border border-white/30 text-white font-bold text-sm tracking-widest hover:bg-white/10 transition-all duration-300 rounded-lg"
                        >
                            <Play className="w-4 h-4 fill-white" />
                            YENİ GÖREV
                        </button>

                        <button
                            onClick={() => handleButtonClick(onMainMenu)}
                            className="group flex items-center justify-center gap-2 w-full py-3 border border-white/10 text-white/50 font-bold text-sm tracking-widest hover:text-white/80 transition-all duration-300 rounded-lg"
                        >
                            <Home className="w-4 h-4" />
                            ANA MENÜ
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NumbersMissionVictory;
