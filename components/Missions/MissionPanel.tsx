/**
 * MissionPanel Component
 * Displays active missions with progress bars
 * Shows Sound Check or Daily Protocols based on state
 * 
 * Requirements: 1.1, 2.1
 */

import { CheckCircle, Circle, Gem, Radio, Target, X, Zap } from 'lucide-react';
import React from 'react';
import type { Mission, MissionState } from '../../types';

interface MissionPanelProps {
  /** Current mission state */
  missionState: MissionState;
  /** Whether Sound Check is completed */
  soundCheckComplete: boolean;
  /** Callback when a completed mission is claimed */
  onClaimMission?: (missionId: string) => void;
  /** Callback to close the panel */
  onClose: () => void;
}

/**
 * Progress bar component for mission progress
 */
const MissionProgressBar: React.FC<{
  current: number;
  target: number;
  completed: boolean;
}> = ({ current, target, completed }) => {
  const percentage = Math.min((current / target) * 100, 100);
  
  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ${
          completed 
            ? 'bg-gradient-to-r from-green-500 to-green-400' 
            : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

/**
 * Get icon for mission type
 */
const getMissionIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'SWAP_COUNT':
      return <Zap className="w-4 h-4" />;
    case 'DISTANCE':
      return <Target className="w-4 h-4" />;
    case 'NEAR_MISS':
      return <Radio className="w-4 h-4" />;
    case 'COLLECT':
      return <Gem className="w-4 h-4" />;
    case 'STAY_LANE':
      return <Target className="w-4 h-4" />;
    case 'COLLISION':
      return <Radio className="w-4 h-4" />;
    default:
      return <Target className="w-4 h-4" />;
  }
};


/**
 * Format mission progress display
 */
const formatProgress = (mission: Mission): string => {
  if (mission.type === 'STAY_LANE') {
    // Convert ms to seconds for display
    const currentSec = Math.floor(mission.progress / 1000);
    const goalSec = Math.floor(mission.goal / 1000);
    return `${currentSec}s / ${goalSec}s`;
  }
  if (mission.type === 'DISTANCE') {
    return `${Math.floor(mission.progress)}m / ${mission.goal}m`;
  }
  return `${mission.progress} / ${mission.goal}`;
};

/**
 * Single mission item display
 */
const MissionItem: React.FC<{
  mission: Mission;
  onClaim?: (missionId: string) => void;
}> = ({ mission, onClaim }) => {
  const slotColors: Record<string, string> = {
    GRIND: 'text-cyan-400 border-cyan-400/30',
    SKILL: 'text-yellow-400 border-yellow-400/30',
    MASTERY: 'text-purple-400 border-purple-400/30',
  };
  
  const slotColor = mission.slot ? slotColors[mission.slot] : 'text-white/60 border-white/20';
  
  return (
    <div className={`p-3 border rounded-lg transition-all duration-300 ${
      mission.completed 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-gray-900/50 border-gray-700/50 hover:border-cyan-500/30'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {mission.completed ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Circle className="w-4 h-4 text-gray-500" />
          )}
          <div className={`p-1 rounded ${mission.completed ? 'bg-green-500/20' : 'bg-white/10'}`}>
            {getMissionIcon(mission.type)}
          </div>
          <span className={`font-bold text-sm tracking-wide ${
            mission.completed ? 'text-green-400' : 'text-white'
          }`}>
            {mission.title}
          </span>
        </div>
        {mission.slot && (
          <span className={`text-[10px] px-2 py-0.5 border rounded ${slotColor}`}>
            {mission.slot}
          </span>
        )}
      </div>
      
      {/* Description */}
      <p className="text-gray-400 text-xs mb-2 font-mono pl-6">
        &gt; {mission.description}
      </p>
      
      {/* Progress */}
      <div className="space-y-1.5 pl-6">
        <MissionProgressBar
          current={mission.progress}
          target={mission.goal}
          completed={mission.completed}
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 font-mono">
            [{formatProgress(mission)}]
          </span>
          <div className="flex items-center gap-2">
            {mission.rewards.xp > 0 && (
              <span className="text-cyan-400 font-bold">+{mission.rewards.xp} XP</span>
            )}
            {mission.rewards.shards > 0 && (
              <div className="flex items-center gap-1">
                <Gem className="w-3 h-3 text-cyan-400" />
                <span className="text-cyan-400 font-bold">+{mission.rewards.shards}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Claim button for completed missions */}
      {mission.completed && onClaim && (
        <button
          onClick={() => onClaim(mission.id)}
          className="mt-2 w-full py-1.5 bg-green-500 text-black font-bold text-xs tracking-wider rounded hover:bg-green-400 transition-colors"
        >
          ÖDÜLÜ AL
        </button>
      )}
    </div>
  );
};


/**
 * MissionPanel Component
 * Requirements 1.1: Display Sound Check missions as the only available missions for new players
 * Requirements 2.1: Display Daily Protocols after Sound Check completion
 */
const MissionPanel: React.FC<MissionPanelProps> = ({
  missionState,
  soundCheckComplete,
  onClaimMission,
  onClose,
}) => {
  // Determine which missions to show
  const showSoundCheck = !soundCheckComplete;
  const missions = showSoundCheck 
    ? missionState.soundCheck.missions 
    : missionState.daily.missions;
  
  const completedCount = missions.filter(m => m.completed).length;
  const totalCount = missions.length;
  
  // Calculate total rewards available
  const totalRewards = missions.reduce(
    (acc, m) => ({
      xp: acc.xp + (m.completed ? m.rewards.xp : 0),
      shards: acc.shards + (m.completed ? m.rewards.shards : 0),
    }),
    { xp: 0, shards: 0 }
  );
  
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-md bg-gray-950 border border-cyan-500/30 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.1)]">
        {/* Scanlines effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          }}
        />
        
        {/* Header */}
        <div className="relative p-4 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              {showSoundCheck ? (
                <Radio className="w-5 h-5 text-cyan-400" />
              ) : (
                <Target className="w-5 h-5 text-cyan-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wider">
                {showSoundCheck ? 'SES KONTROLÜ' : 'GÜNLÜK GÖREVLER'}
              </h2>
              <p className="text-cyan-400 text-xs font-mono">
                {showSoundCheck 
                  ? 'Günlük Görevleri açmak için tamamla' 
                  : `${missionState.daily.lastResetDate} | ${completedCount}/${totalCount} TAMAMLANDI`
                }
              </p>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-white" />
          </button>
        </div>
        
        {/* Missions List */}
        <div className="relative p-4 space-y-3 max-h-[50vh] overflow-y-auto">
          {missions.length > 0 ? (
            missions.map((mission) => (
              <MissionItem 
                key={mission.id} 
                mission={mission} 
                onClaim={onClaimMission}
              />
            ))
          ) : (
            <div className="text-center text-gray-500 py-8 font-mono">
              &gt; Aktif görev yok
            </div>
          )}
        </div>
        
        {/* Marathon Section (only show after Sound Check) */}
        {!showSoundCheck && missionState.marathon.mission && (
          <div className="relative p-4 border-t border-cyan-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-purple-400 tracking-wider">
                HAFTALIK MARATON
              </span>
            </div>
            <MissionItem 
              mission={missionState.marathon.mission} 
              onClaim={onClaimMission}
            />
          </div>
        )}
        
        {/* Footer - Total Rewards */}
        <div className="relative p-4 border-t border-cyan-500/30 bg-gradient-to-r from-transparent to-cyan-500/5">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm font-mono">
              &gt; KAZANILAN_ÖDÜLLER:
            </span>
            <div className="flex items-center gap-3">
              {totalRewards.xp > 0 && (
                <span className="text-cyan-400 font-bold text-sm">
                  +{totalRewards.xp} XP
                </span>
              )}
              {totalRewards.shards > 0 && (
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 font-bold text-sm">
                    +{totalRewards.shards}
                  </span>
                </div>
              )}
              {totalRewards.xp === 0 && totalRewards.shards === 0 && (
                <span className="text-gray-500 text-sm">0</span>
              )}
            </div>
          </div>
          
          {/* Sound Check completion message */}
          {showSoundCheck && completedCount === totalCount && totalCount > 0 && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <span className="text-green-400 font-bold tracking-wider">
                🎉 SENKRON TAMAM! Günlük Görevler Açıldı!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionPanel;
