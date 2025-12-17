/**
 * Victory Screen Component
 * Campaign Chapter System - Victory animations and rewards display
 * Requirements: 5.2, 5.3, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5
 * 
 * 5.2 - Display completed chapter number
 * 5.3 - Display distance traveled / target distance
 * 5.5 - Provide "Next Chapter", "Replay", and "Main Menu" buttons
 */

import { Gem, Home, Play, RotateCcw, Star } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as AudioSystem from '../../systems/audioSystem';
import { getHapticSystem } from '../../systems/hapticSystem';

/**
 * Currency particle for flying animation
 * Requirements: 8.4 - Bezier curve paths
 */
export interface CurrencyParticle {
  id: number;
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
  progress: number;
  delay: number;
}

/**
 * Victory screen state phases
 * Requirements: 8.1, 8.2, 8.3
 */
export type VictoryPhase = 'slowmo' | 'stars' | 'rewards' | 'complete';

/**
 * Generate flying currency particles
 * Requirements: 8.4 - Spawn 10-20 particles with Bezier curve paths
 * 
 * @param count - Number of particles (10-20)
 * @param startX - Starting X position (screen center)
 * @param startY - Starting Y position (screen center)
 * @param endX - Target X position (counter location)
 * @param endY - Target Y position (counter location)
 * @returns Array of CurrencyParticle objects
 */
export function generateFlyingCurrencyParticles(
  count: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): CurrencyParticle[] {
  // Clamp count to 10-20 range per Requirements 8.4
  const clampedCount = Math.max(10, Math.min(20, count));
  
  const particles: CurrencyParticle[] = [];
  
  for (let i = 0; i < clampedCount; i++) {
    // Random control point for Bezier curve (creates arc effect)
    const controlOffsetX = (Math.random() - 0.5) * 200;
    const controlOffsetY = -100 - Math.random() * 150; // Always arc upward
    
    particles.push({
      id: i,
      startX: startX + (Math.random() - 0.5) * 60, // Slight spread at start
      startY: startY + (Math.random() - 0.5) * 60,
      controlX: (startX + endX) / 2 + controlOffsetX,
      controlY: Math.min(startY, endY) + controlOffsetY,
      endX: endX + (Math.random() - 0.5) * 20, // Slight spread at end
      endY: endY,
      progress: 0,
      delay: i * 50, // Stagger particle starts
    });
  }
  
  return particles;
}

/**
 * Calculate position on quadratic Bezier curve
 * @param t - Progress (0-1)
 * @param p0 - Start point
 * @param p1 - Control point
 * @param p2 - End point
 * @returns Position at t
 */
function bezierPoint(t: number, p0: number, p1: number, p2: number): number {
  const oneMinusT = 1 - t;
  return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
}

interface VictoryScreenProps {
  levelId: number;
  stars: number;
  distanceTraveled: number;
  targetDistance: number;
  shardsEarned: number;
  firstClearBonus: number;
  isFirstClear: boolean;
  onRestart: () => void;
  onNextLevel: () => void;
  onMainMenu: () => void;
}

const VictoryScreen: React.FC<VictoryScreenProps> = ({
  levelId,
  stars,
  distanceTraveled,
  targetDistance,
  shardsEarned,
  firstClearBonus,
  isFirstClear,
  onRestart,
  onNextLevel,
  onMainMenu,
}) => {
  // Phase state
  const [phase, setPhase] = useState<VictoryPhase>('slowmo');
  const [starsRevealed, setStarsRevealed] = useState(0);
  const [displayedShards, setDisplayedShards] = useState(0);
  const [counterScale, setCounterScale] = useState(1);
  const [particles, setParticles] = useState<CurrencyParticle[]>([]);
  const [slowmoProgress, setSlowmoProgress] = useState(0);
  
  // Refs for animation
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const counterRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  
  // Total shards to animate
  const totalShards = shardsEarned + firstClearBonus;

  const handleButtonClick = useCallback((callback: () => void) => {
    getHapticSystem().trigger('selection');
    AudioSystem.playButtonClick();
    callback();
  }, []);

  // Phase 1: Slow motion effect (Requirements 8.1)
  useEffect(() => {
    if (phase !== 'slowmo') return;
    
    startTimeRef.current = performance.now();
    const slowmoDuration = 1000; // 1 second at 0.2x speed
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(1, elapsed / slowmoDuration);
      setSlowmoProgress(progress);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Transition to stars phase
        setPhase('stars');
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [phase]);

  // Phase 2: Sequential star reveal (Requirements 8.2)
  useEffect(() => {
    if (phase !== 'stars') return;
    
    const revealStar = (starIndex: number) => {
      if (starIndex > stars) {
        // All stars revealed, move to rewards phase
        setPhase('rewards');
        return;
      }
      
      setStarsRevealed(starIndex);
      
      // Play star pop SFX (Requirements 8.2)
      if (starIndex > 0) {
        AudioSystem.playShardCollect(); // Using shard collect as star pop
        getHapticSystem().trigger('success');
      }
      
      // Schedule next star reveal with 300ms delay
      setTimeout(() => revealStar(starIndex + 1), 300);
    };
    
    // Start revealing stars after a brief delay
    setTimeout(() => revealStar(1), 200);
  }, [phase, stars]);

  // Phase 3: Flying currency animation (Requirements 8.3, 8.4, 8.5)
  useEffect(() => {
    if (phase !== 'rewards') return;
    if (totalShards === 0) {
      setPhase('complete');
      return;
    }
    
    // Get positions for particle animation
    const counterRect = counterRef.current?.getBoundingClientRect();
    const centerRect = centerRef.current?.getBoundingClientRect();
    
    if (!counterRect || !centerRect) {
      setPhase('complete');
      return;
    }
    
    // Generate particles (10-20 based on shard count)
    const particleCount = Math.min(20, Math.max(10, Math.ceil(totalShards / 5)));
    const newParticles = generateFlyingCurrencyParticles(
      particleCount,
      centerRect.left + centerRect.width / 2,
      centerRect.top + centerRect.height / 2,
      counterRect.left + counterRect.width / 2,
      counterRect.top + counterRect.height / 2
    );
    
    setParticles(newParticles);
    
    // Animate particles
    startTimeRef.current = performance.now();
    const particleDuration = 800; // Each particle takes 800ms
    const totalDuration = particleDuration + (particleCount - 1) * 50 + 200;
    
    let arrivedCount = 0;
    const shardsPerParticle = totalShards / particleCount;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      
      setParticles(prev => {
        const updated = prev.map(p => {
          const particleElapsed = elapsed - p.delay;
          if (particleElapsed < 0) return p;
          
          const progress = Math.min(1, particleElapsed / particleDuration);
          
          // Check if particle just arrived
          if (progress >= 1 && p.progress < 1) {
            arrivedCount++;
            
            // Update displayed shards count
            setDisplayedShards(Math.min(totalShards, Math.round(arrivedCount * shardsPerParticle)));
            
            // Counter scale pop (Requirements 8.5)
            setCounterScale(1.2);
            setTimeout(() => setCounterScale(1), 100);
            
            // Play coin count SFX (Requirements 8.5)
            AudioSystem.playShardCollect();
            getHapticSystem().trigger('light');
          }
          
          return { ...p, progress };
        });
        
        return updated;
      });
      
      if (elapsed < totalDuration) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure final count is correct
        setDisplayedShards(totalShards);
        setPhase('complete');
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [phase, totalShards]);

  // Render star with animation
  const renderStar = (index: number) => {
    const isRevealed = index < starsRevealed;
    const isFilled = index < stars;
    
    return (
      <div
        key={index}
        className={`transition-all duration-300 ${
          isRevealed 
            ? 'scale-100 opacity-100' 
            : 'scale-0 opacity-0'
        }`}
        style={{
          transform: isRevealed ? 'scale(1)' : 'scale(0)',
          transitionDelay: `${index * 100}ms`,
        }}
      >
        <Star
          className={`w-12 h-12 md:w-14 md:h-14 ${
            isFilled
              ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]'
              : 'text-white/20'
          }`}
        />
      </div>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-30 text-white overflow-hidden px-4">
      {/* Background with victory gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-cyan-950/80 via-black/90 to-black backdrop-blur-md"
        style={{
          opacity: phase === 'slowmo' ? 0.5 + slowmoProgress * 0.5 : 1,
        }}
      />
      
      {/* Animated glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Flying currency particles */}
      {particles.map(particle => {
        if (particle.progress <= 0 || particle.progress >= 1) return null;
        
        const x = bezierPoint(particle.progress, particle.startX, particle.controlX, particle.endX);
        const y = bezierPoint(particle.progress, particle.startY, particle.controlY, particle.endY);
        const scale = 1 - particle.progress * 0.5; // Shrink as they approach
        const opacity = 1 - particle.progress * 0.3;
        
        return (
          <div
            key={particle.id}
            className="fixed pointer-events-none z-50"
            style={{
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
            }}
          >
            <Gem className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
          </div>
        );
      })}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
        {/* Victory title - Requirements 5.2 */}
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl font-black mb-1 tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-500"
          style={{
            opacity: phase === 'slowmo' ? slowmoProgress : 1,
            transform: `scale(${phase === 'slowmo' ? 0.8 + slowmoProgress * 0.2 : 1})`,
          }}
        >
          BÖLÜM
        </h2>
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-[0.15em] text-cyan-400"
          style={{
            opacity: phase === 'slowmo' ? slowmoProgress : 1,
            transform: `scale(${phase === 'slowmo' ? 0.8 + slowmoProgress * 0.2 : 1})`,
          }}
        >
          TAMAMLANDI!
        </h2>

        {/* Chapter info - Requirements 5.2 */}
        <div className="text-sm text-white/60 mb-4">
          Bölüm {levelId}
        </div>

        {/* Stars display (Requirements 8.2) */}
        <div className="flex items-center gap-2 mb-6">
          {[0, 1, 2].map(renderStar)}
        </div>

        {/* Distance info - Requirements 5.3 */}
        <div 
          ref={centerRef}
          className="flex flex-col items-center gap-2 mb-4 p-4 bg-white/5 rounded-xl border border-cyan-500/20 backdrop-blur-sm w-full"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tighter text-cyan-400">
              {Math.floor(distanceTraveled)}m
            </span>
            <span className="text-lg text-white/40">/</span>
            <span className="text-lg text-white/60 font-bold">
              {Math.floor(targetDistance)}m
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-[0.2em]">
            Mesafe Tamamlandı
          </span>
        </div>

        {/* Rewards display (Requirements 8.3, 8.4, 8.5) */}
        <div 
          ref={counterRef}
          className="flex flex-col items-center gap-2 mb-4"
          style={{
            transform: `scale(${counterScale})`,
            transition: 'transform 100ms ease-out',
          }}
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-full border border-cyan-500/30">
            <Gem className="w-5 h-5 text-cyan-400" />
            <span className="text-lg font-bold text-cyan-400 tracking-wider tabular-nums">
              +{displayedShards}
            </span>
          </div>
          
          {/* First clear bonus indicator */}
          {isFirstClear && firstClearBonus > 0 && phase !== 'slowmo' && (
            <div className="flex items-center gap-1 text-xs text-yellow-400/80">
              <Star className="w-3 h-3 fill-yellow-400" />
              <span>İlk Tamamlama Bonusu: +{firstClearBonus}</span>
            </div>
          )}
        </div>

        {/* Action buttons - Requirements 5.5 */}
        {phase === 'complete' && (
          <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => handleButtonClick(onNextLevel)}
              className="group flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-sm tracking-widest active:scale-[0.98] transition-all duration-300 rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.3)]"
            >
              <Play size={18} className="fill-black" />
              SONRAKİ BÖLÜM
            </button>
            <button
              onClick={() => handleButtonClick(onRestart)}
              className="group flex items-center justify-center gap-2 w-full py-3 border border-white/30 text-white font-bold text-sm tracking-widest hover:bg-white/10 transition-all duration-300 rounded-lg"
            >
              <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
              TEKRAR OYNA
            </button>
            <button
              onClick={() => handleButtonClick(onMainMenu)}
              className="group flex items-center justify-center gap-2 w-full py-3 border border-white/10 text-white/50 font-bold text-sm tracking-widest hover:text-white/80 transition-all duration-300 rounded-lg"
            >
              <Home size={18} />
              ANA MENÜ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VictoryScreen;
