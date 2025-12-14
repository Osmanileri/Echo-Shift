/**
 * SyncRateDisplay Component
 * Shows current level, XP bar, daily reward info
 * 
 * Requirements: 4.4, 5.1
 */

import { Gem, Gift, TrendingUp, Zap } from 'lucide-react';
import React from 'react';
import { calculateDailyReward, getLevelInfo, MAX_LEVEL } from '../../systems/levelSystem';
import type { LevelInfo } from '../../types';

interface SyncRateDisplayProps {
  /** Player's total XP */
  totalXP: number;
  /** Player's current Sync Rate (level) */
  syncRate: number;
  /** Last login date for daily reward */
  lastLoginDate: string;
  /** Callback when claiming daily reward */
  onClaimDailyReward?: () => void;
  /** Whether to show compact version */
  compact?: boolean;
}

/**
 * XP Progress Bar Component
 */
const XPProgressBar: React.FC<{
  progress: number;
  isMaxLevel: boolean;
}> = ({ progress, isMaxLevel }) => {
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ${
          isMaxLevel 
            ? 'bg-gradient-to-r from-yellow-500 to-amber-400' 
            : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
        }`}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
};

/**
 * Check if daily reward can be claimed
 */
const canClaimDailyReward = (lastLoginDate: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  return lastLoginDate !== today;
};

/**
 * SyncRateDisplay Component
 * Requirements 4.4: WHEN displaying player profile THEN the Level_System 
 * SHALL show current Sync Rate, current XP, and XP needed for next level
 * Requirements 5.1: WHEN the player logs in for the first time each day 
 * THEN the Reward_System SHALL grant Shards based on current Sync Rate
 */
const SyncRateDisplay: React.FC<SyncRateDisplayProps> = ({
  totalXP,
  syncRate,
  lastLoginDate,
  onClaimDailyReward,
  compact = false,
}) => {
  const levelInfo: LevelInfo = getLevelInfo(totalXP);
  const dailyReward = calculateDailyReward(syncRate);
  const canClaim = canClaimDailyReward(lastLoginDate);
  const isMaxLevel = syncRate >= MAX_LEVEL;
  
  // Calculate XP values for display
  const xpInCurrentLevel = totalXP - levelInfo.xpForCurrentLevel;
  const xpNeededForLevel = levelInfo.xpForNextLevel - levelInfo.xpForCurrentLevel;
  
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/10">
        {/* Level Badge */}
        <div className="flex items-center gap-1.5">
          <div className={`p-1.5 rounded-lg ${
            isMaxLevel ? 'bg-yellow-500/20' : 'bg-cyan-500/20'
          }`}>
            <TrendingUp className={`w-4 h-4 ${
              isMaxLevel ? 'text-yellow-400' : 'text-cyan-400'
            }`} />
          </div>
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wider">Senkron Oranı</p>
            <p className={`text-sm font-black ${
              isMaxLevel ? 'text-yellow-400' : 'text-cyan-400'
            }`}>
              {syncRate}
            </p>
          </div>
        </div>
        
        {/* XP Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-white/50">XP</span>
            <span className="text-white/70">
              {isMaxLevel ? 'MAKS' : `${xpInCurrentLevel} / ${xpNeededForLevel}`}
            </span>
          </div>
          <XPProgressBar progress={levelInfo.progress} isMaxLevel={isMaxLevel} />
        </div>
        
        {/* Daily Reward Button (compact) */}
        {canClaim && onClaimDailyReward && (
          <button
            onClick={onClaimDailyReward}
            className="p-2 bg-gradient-to-r from-yellow-500 to-amber-400 rounded-lg animate-pulse"
          >
            <Gift className="w-4 h-4 text-black" />
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-gray-900/50 rounded-xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isMaxLevel ? 'bg-yellow-500/20 ring-2 ring-yellow-500/30' : 'bg-cyan-500/20'
          }`}>
            <TrendingUp className={`w-6 h-6 ${
              isMaxLevel ? 'text-yellow-400' : 'text-cyan-400'
            }`} />
          </div>
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider">Senkron Oranı</p>
            <p className={`text-2xl font-black ${
              isMaxLevel ? 'text-yellow-400' : 'text-cyan-400'
            }`}>
              Seviye {syncRate}
              {isMaxLevel && <span className="ml-2 text-sm">MAKS</span>}
            </p>
          </div>
        </div>
        
        {/* Total XP Badge */}
        <div className="text-right">
          <p className="text-xs text-white/50">Toplam XP</p>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-lg font-bold text-white">
              {totalXP.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      
      {/* XP Progress Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-white/50">Seviye {syncRate + 1} için ilerleme</span>
          <span className="text-white/70 font-mono">
            {isMaxLevel ? 'MAKS SEVİYE' : `${xpInCurrentLevel} / ${xpNeededForLevel} XP`}
          </span>
        </div>
        <XPProgressBar progress={levelInfo.progress} isMaxLevel={isMaxLevel} />
        {!isMaxLevel && (
          <p className="text-[10px] text-white/40 mt-1">
            Sonraki seviye için {xpNeededForLevel - xpInCurrentLevel} XP gerekli
          </p>
        )}
      </div>
      
      {/* Daily Reward Section */}
      <div className={`p-3 rounded-xl border transition-all ${
        canClaim 
          ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30' 
          : 'bg-white/5 border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className={`w-5 h-5 ${canClaim ? 'text-yellow-400' : 'text-white/40'}`} />
            <div>
              <p className="text-xs font-bold text-white">Günlük Giriş Ödülü</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Gem className="w-3 h-3 text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400">
                  +{dailyReward.toLocaleString()}
                </span>
                <span className="text-[10px] text-white/40">Parça</span>
              </div>
            </div>
          </div>
          
          {onClaimDailyReward && (
            <button
              onClick={onClaimDailyReward}
              disabled={!canClaim}
              className={`px-4 py-2 rounded-lg font-bold text-xs tracking-wider transition-all ${
                canClaim
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black hover:shadow-[0_0_20px_rgba(255,200,0,0.3)] active:scale-[0.98]'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {canClaim ? 'AL' : 'ALINDI'}
            </button>
          )}
        </div>
        
        {!canClaim && (
          <p className="text-[10px] text-white/40 mt-2">
            Sonraki ödülün için yarın tekrar gel!
          </p>
        )}
      </div>
      
      {/* Level Tier Info */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-[10px] text-white/40">
          {syncRate < 10 && `Kademe 1 (Sv 1-9): Taban ${100} + ${10}×Seviye parça/gün`}
          {syncRate >= 10 && syncRate < 50 && `Kademe 2 (Sv 10-49): Taban ${200} + ${8}×(Seviye-10) parça/gün`}
          {syncRate >= 50 && `Kademe 3 (Sv 50+): Taban ${600} + ${5}×(Seviye-50) parça/gün`}
        </p>
      </div>
    </div>
  );
};

export default SyncRateDisplay;
