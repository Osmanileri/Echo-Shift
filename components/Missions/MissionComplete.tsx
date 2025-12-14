/**
 * MissionComplete Component
 * Shows completion animation and rewards
 * 
 * Requirements: 2.5, 3.3
 */

import { CheckCircle, Gem, Sparkles, Trophy, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Mission } from '../../types';

interface MissionCompleteProps {
  /** The completed mission */
  mission: Mission;
  /** Callback when the modal is closed */
  onClose: () => void;
  /** Callback when rewards are claimed */
  onClaim: () => void;
}

/**
 * MissionComplete Component
 * Requirements 2.5: WHEN a player completes a daily mission THEN the Mission_System 
 * SHALL award the specified XP and Shard rewards immediately
 * Requirements 3.3: WHEN the player reaches the Marathon goal THEN the Mission_System 
 * SHALL award high XP and a unique cosmetic Trail reward
 */
const MissionComplete: React.FC<MissionCompleteProps> = ({
  mission,
  onClose,
  onClaim,
}) => {
  const [showRewards, setShowRewards] = useState(false);
  const [claimed, setClaimed] = useState(false);
  
  // Animate rewards appearing
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRewards(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  const handleClaim = () => {
    setClaimed(true);
    onClaim();
    // Auto-close after claim animation
    setTimeout(() => {
      onClose();
    }, 1000);
  };
  
  const isMarathon = mission.category === 'MARATHON';
  const isSoundCheck = mission.category === 'SOUND_CHECK';
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Backdrop with particles effect */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Celebration particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          >
            <Sparkles 
              className={`w-4 h-4 ${
                isMarathon ? 'text-purple-400' : 
                isSoundCheck ? 'text-green-400' : 'text-cyan-400'
              }`} 
              style={{ opacity: 0.3 + Math.random() * 0.4 }}
            />
          </div>
        ))}
      </div>
      
      {/* Modal */}
      <div className={`relative w-full max-w-sm rounded-2xl border overflow-hidden transform transition-all duration-500 ${
        claimed ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
      } ${
        isMarathon 
          ? 'bg-gradient-to-b from-purple-900/90 to-black border-purple-500/30' 
          : isSoundCheck
            ? 'bg-gradient-to-b from-green-900/90 to-black border-green-500/30'
            : 'bg-gradient-to-b from-cyan-900/90 to-black border-cyan-500/30'
      }`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-white/50 hover:text-white" />
        </button>
        
        {/* Header with icon */}
        <div className="relative pt-8 pb-4 text-center">
          <div className={`inline-flex p-4 rounded-full mb-4 ${
            isMarathon 
              ? 'bg-purple-500/20 ring-2 ring-purple-500/50' 
              : isSoundCheck
                ? 'bg-green-500/20 ring-2 ring-green-500/50'
                : 'bg-cyan-500/20 ring-2 ring-cyan-500/50'
          }`}>
            {isMarathon ? (
              <Trophy className="w-10 h-10 text-purple-400" />
            ) : (
              <CheckCircle className={`w-10 h-10 ${
                isSoundCheck ? 'text-green-400' : 'text-cyan-400'
              }`} />
            )}
          </div>
          
          <h2 className={`text-2xl font-black tracking-wider mb-1 ${
            isMarathon ? 'text-purple-400' : 
            isSoundCheck ? 'text-green-400' : 'text-cyan-400'
          }`}>
            {isMarathon ? 'MARATON TAMAMLANDI!' : 
             isSoundCheck ? 'GÖREV TAMAMLANDI!' : 'PROTOKOL TAMAMLANDI!'}
          </h2>
          
          <p className="text-white/70 text-sm font-medium">
            {mission.title}
          </p>
        </div>
        
        {/* Rewards Section */}
        <div className={`p-6 transition-all duration-500 ${
          showRewards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="text-center mb-4">
            <span className="text-xs text-white/50 tracking-widest uppercase">
              Kazanılan Ödüller
            </span>
          </div>
          
          <div className="flex items-center justify-center gap-6">
            {/* XP Reward */}
            {mission.rewards.xp > 0 && (
              <div className="text-center">
                <div className={`p-3 rounded-xl mb-2 ${
                  isMarathon ? 'bg-purple-500/20' : 
                  isSoundCheck ? 'bg-green-500/20' : 'bg-cyan-500/20'
                }`}>
                  <Zap className={`w-8 h-8 ${
                    isMarathon ? 'text-purple-400' : 
                    isSoundCheck ? 'text-green-400' : 'text-cyan-400'
                  }`} />
                </div>
                <p className={`text-2xl font-black ${
                  isMarathon ? 'text-purple-400' : 
                  isSoundCheck ? 'text-green-400' : 'text-cyan-400'
                }`}>
                  +{mission.rewards.xp}
                </p>
                <p className="text-xs text-white/50">XP</p>
              </div>
            )}
            
            {/* Shards Reward */}
            {mission.rewards.shards > 0 && (
              <div className="text-center">
                <div className={`p-3 rounded-xl mb-2 ${
                  isMarathon ? 'bg-purple-500/20' : 
                  isSoundCheck ? 'bg-green-500/20' : 'bg-cyan-500/20'
                }`}>
                  <Gem className={`w-8 h-8 ${
                    isMarathon ? 'text-purple-400' : 
                    isSoundCheck ? 'text-green-400' : 'text-cyan-400'
                  }`} />
                </div>
                <p className={`text-2xl font-black ${
                  isMarathon ? 'text-purple-400' : 
                  isSoundCheck ? 'text-green-400' : 'text-cyan-400'
                }`}>
                  +{mission.rewards.shards}
                </p>
                <p className="text-xs text-white/50">Parça</p>
              </div>
            )}
            
            {/* Cosmetic Reward (Marathon) */}
            {mission.rewards.cosmetic && (
              <div className="text-center">
                <div className="p-3 rounded-xl mb-2 bg-gradient-to-br from-purple-500/30 to-pink-500/30 ring-1 ring-purple-400/50">
                  <Sparkles className="w-8 h-8 text-purple-300" />
                </div>
                <p className="text-lg font-bold text-purple-300">
                  İz
                </p>
                <p className="text-xs text-white/50">Kozmetik</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Claim Button */}
        <div className="p-4 pt-0">
          <button
            onClick={handleClaim}
            disabled={claimed}
            className={`w-full py-4 rounded-xl font-black text-sm tracking-[0.2em] transition-all ${
              claimed
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : isMarathon
                  ? 'bg-gradient-to-r from-purple-500 to-purple-400 text-black hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] active:scale-[0.98]'
                  : isSoundCheck
                    ? 'bg-gradient-to-r from-green-500 to-green-400 text-black hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] active:scale-[0.98]'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] active:scale-[0.98]'
            }`}
          >
            {claimed ? 'ALINDI!' : 'ÖDÜLLERİ AL'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionComplete;
