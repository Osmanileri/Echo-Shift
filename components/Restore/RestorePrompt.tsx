/**
 * RestorePrompt UI Component
 * Requirements: 8.1, 8.2, 8.3
 * 
 * Displays the "System Crash" death screen with restore option.
 * Shows static noise effect and allows player to spend Echo Shards to continue.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RotateCcw, X, Gem } from 'lucide-react';
import { RESTORE_CONFIG } from '../../systems/restoreSystem';

interface RestorePromptProps {
  /** Player's current Echo Shards balance */
  balance: number;
  /** Whether restore is available (not already used this run) */
  isAvailable: boolean;
  /** Callback when player accepts restore */
  onRestore: () => void;
  /** Callback when player declines restore */
  onDecline: () => void;
  /** Current score at death */
  scoreAtDeath: number;
}

/**
 * Static noise canvas effect
 * Requirements 2.4: Display static noise (TV static) visual effect
 */
const StaticNoiseCanvas: React.FC<{ opacity: number }> = ({ opacity }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    const drawNoise = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
        data[i + 3] = 255 * opacity; // A
      }
      
      ctx.putImageData(imageData, 0, 0);
      animationId = requestAnimationFrame(drawNoise);
    };

    drawNoise();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={150}
      className="absolute inset-0 w-full h-full pointer-events-none mix-blend-overlay"
    />
  );
};

/**
 * RestorePrompt Component
 * Requirements 8.1, 8.2, 8.3: Display "System Crash" message with restore option
 */
const RestorePrompt: React.FC<RestorePromptProps> = ({
  balance,
  isAvailable,
  onRestore,
  onDecline,
  scoreAtDeath,
}) => {
  const [showNoise, setShowNoise] = useState(true);
  const [noiseOpacity, setNoiseOpacity] = useState(0.8);
  const [glitchText, setGlitchText] = useState(false);

  const cost = RESTORE_CONFIG.cost;
  const canAfford = balance >= cost;
  const canRestore = isAvailable && canAfford;

  // Initial static noise effect that fades
  useEffect(() => {
    // Fade out noise over 0.5 seconds
    const fadeInterval = setInterval(() => {
      setNoiseOpacity(prev => {
        if (prev <= 0.1) {
          clearInterval(fadeInterval);
          setShowNoise(false);
          return 0;
        }
        return prev - 0.1;
      });
    }, 50);

    return () => clearInterval(fadeInterval);
  }, []);

  // Glitch text effect
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      setGlitchText(true);
      setTimeout(() => setGlitchText(false), 100);
    }, 2000);

    return () => clearInterval(glitchInterval);
  }, []);

  const handleRestore = useCallback(() => {
    if (canRestore) {
      onRestore();
    }
  }, [canRestore, onRestore]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-40 overflow-hidden">
      {/* Dark background with red tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/95 via-black/95 to-black" />
      
      {/* Static noise overlay */}
      {showNoise && <StaticNoiseCanvas opacity={noiseOpacity} />}
      
      {/* Scanlines effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
      
      {/* Glitch lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-full h-px bg-red-500/50 animate-pulse" />
        <div className="absolute top-1/3 left-0 w-full h-0.5 bg-cyan-500/30 animate-pulse delay-100" />
        <div className="absolute top-2/3 left-0 w-full h-px bg-red-500/30 animate-pulse delay-200" />
        <div className="absolute bottom-1/4 left-0 w-full h-0.5 bg-white/20 animate-pulse delay-300" />
      </div>

      {/* Content - Mobile optimized */}
      <div className="relative z-10 flex flex-col items-center px-4 max-w-sm w-full">
        
        {/* Error Icon - Smaller */}
        <div className="mb-3 p-3 bg-red-500/20 rounded-full border-2 border-red-500/50 animate-pulse">
          <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
        </div>
        
        {/* Requirements 8.1: "System Crash" message */}
        <h2 
          className={`text-2xl sm:text-3xl md:text-4xl font-black mb-1 tracking-[0.1em] text-red-500 relative transition-all duration-100 ${
            glitchText ? 'translate-x-1 skew-x-2' : ''
          }`}
        >
          SYSTEM
          {glitchText && (
            <span className="absolute -left-1 top-0 text-cyan-500 opacity-70 blur-[1px]">
              SYSTEM
            </span>
          )}
        </h2>
        <h2 
          className={`text-2xl sm:text-3xl md:text-4xl font-black mb-4 tracking-[0.1em] text-white relative transition-all duration-100 ${
            glitchText ? '-translate-x-1 -skew-x-1' : ''
          }`}
        >
          CRASH
          {glitchText && (
            <span className="absolute -right-1 top-0 text-red-500 opacity-50 blur-[1px]">
              CRASH
            </span>
          )}
        </h2>
        
        {/* Terminal-style error message - Compact */}
        <div className="w-full mb-4 p-3 bg-black/50 border border-red-500/30 rounded font-mono text-xs">
          <p className="text-red-400 mb-0.5">&gt; SYSTEM_CRASH</p>
          <p className="text-gray-400 mb-0.5">&gt; Score: <span className="text-white">{scoreAtDeath}</span></p>
          <p className="text-cyan-400">&gt; Recovery possible...</p>
        </div>
        
        {/* Requirements 8.1, 8.2: Restore option with cost display */}
        <div className="w-full space-y-2">
          
          {/* Requirements 8.1: "Restore System" Button */}
          <button
            onClick={handleRestore}
            disabled={!canRestore}
            className={`group relative w-full py-3 font-bold text-sm sm:text-base tracking-widest transition-all duration-300 overflow-hidden rounded-lg ${
              canRestore
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] active:scale-[0.98]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
            }`}
          >
            <span className="relative flex items-center justify-center gap-2">
              <RotateCcw className={`w-4 h-4 ${canRestore ? 'group-hover:rotate-180 transition-transform duration-500' : ''}`} />
              RESTORE SYSTEM
            </span>
          </button>
          
          {/* Requirements 8.2: Cost Display (100 shards) and current balance */}
          <div className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded border ${
            canAfford 
              ? 'bg-cyan-500/10 border-cyan-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <Gem className={`w-3 h-3 ${canAfford ? 'text-cyan-400' : 'text-red-400'}`} />
            <span className={`text-xs font-bold tracking-wider ${canAfford ? 'text-cyan-400' : 'text-red-400'}`}>
              {cost} SHARDS
            </span>
            <span className="text-gray-500 text-xs">
              (Balance: {balance})
            </span>
          </div>
          
          {/* Requirements 8.3: Insufficient shards message when balance < 100 */}
          {!canAfford && (
            <p className="text-center text-red-400 text-xs font-medium animate-pulse">
              INSUFFICIENT SHARDS
            </p>
          )}
          
          {/* Already used message */}
          {!isAvailable && canAfford && (
            <p className="text-center text-yellow-400 text-xs font-medium">
              ALREADY USED THIS RUN
            </p>
          )}
          
          {/* Decline option */}
          <button
            onClick={onDecline}
            className="group flex items-center justify-center gap-2 w-full py-2.5 border border-white/20 text-white/70 font-bold text-xs sm:text-sm tracking-widest hover:bg-white/5 hover:border-white/30 hover:text-white transition-all duration-300 rounded-lg"
          >
            <X className="w-4 h-4" />
            ACCEPT FATE
          </button>
        </div>
        
        {/* Rewind info */}
        <p className="mt-3 text-center text-gray-500 text-[10px] tracking-wider">
          Rewinds {RESTORE_CONFIG.rewindSeconds} seconds before collision
        </p>
      </div>
    </div>
  );
};

export default RestorePrompt;
