/**
 * RitualsPanel UI Component
 * Requirements: 3.5, 3.6
 * 
 * Displays the terminal-styled "Daily Logs" interface for daily rituals.
 * Shows progress bars (current/target) and completion status with rewards.
 */

import React, { useMemo } from 'react';
import { Terminal, CheckCircle, Circle, Gift, Gem } from 'lucide-react';
import { RitualProgress, DailyRitualsState } from '../../systems/dailyRituals';
import { RITUAL_POOL, BONUS_REWARD } from '../../data/rituals';

interface RitualsPanelProps {
  /** Current rituals state */
  state: DailyRitualsState;
  /** Callback when claiming bonus reward */
  onClaimBonus: () => void;
  /** Callback to close the panel */
  onClose: () => void;
}

/**
 * Progress bar component for ritual progress
 * Requirements 3.5: Show progress (current/target) for each active ritual
 */
const RitualProgressBar: React.FC<{
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
 * Single ritual item display
 */
const RitualItem: React.FC<{
  progress: RitualProgress;
}> = ({ progress }) => {
  const ritualDef = RITUAL_POOL.find(r => r.id === progress.ritualId);
  if (!ritualDef) return null;
  
  const difficultyColors = {
    easy: 'text-green-400 border-green-400/30',
    medium: 'text-yellow-400 border-yellow-400/30',
    hard: 'text-red-400 border-red-400/30',
  };
  
  return (
    <div className={`p-4 border rounded-lg transition-all duration-300 ${
      progress.completed 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-gray-900/50 border-gray-700/50 hover:border-cyan-500/30'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {progress.completed ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <Circle className="w-5 h-5 text-gray-500" />
          )}
          <span className={`font-bold tracking-wide ${
            progress.completed ? 'text-green-400' : 'text-white'
          }`}>
            {ritualDef.name}
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 border rounded ${difficultyColors[ritualDef.difficulty]}`}>
          {ritualDef.difficulty.toUpperCase()}
        </span>
      </div>
      
      {/* Description */}
      <p className="text-gray-400 text-sm mb-3 font-mono">
        &gt; {ritualDef.description}
      </p>
      
      {/* Progress */}
      <div className="space-y-2">
        <RitualProgressBar
          current={progress.current}
          target={progress.target}
          completed={progress.completed}
        />
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 font-mono">
            [{progress.current}/{progress.target}]
          </span>
          <div className="flex items-center gap-1">
            <Gem className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-bold">+{ritualDef.reward}</span>
          </div>
        </div>
      </div>
    </div>
  );
};


/**
 * RitualsPanel Component
 * Requirements 3.6: Display a terminal-styled "Daily Logs" interface
 */
const RitualsPanel: React.FC<RitualsPanelProps> = ({
  state,
  onClaimBonus,
  onClose,
}) => {
  const completedCount = useMemo(
    () => state.rituals.filter(r => r.completed).length,
    [state.rituals]
  );
  
  const totalReward = useMemo(() => {
    return state.rituals.reduce((sum, progress) => {
      if (progress.completed) {
        const def = RITUAL_POOL.find(r => r.id === progress.ritualId);
        return sum + (def?.reward || 0);
      }
      return sum;
    }, 0);
  }, [state.rituals]);
  
  const canClaimBonus = state.allCompleted && !state.bonusClaimed;
  
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
            <Terminal className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-wider">
                DAILY LOGS
              </h2>
              <p className="text-cyan-400 text-xs font-mono">
                {state.date} | {completedCount}/3 COMPLETE
              </p>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Rituals List */}
        <div className="relative p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {state.rituals.map((progress) => (
            <RitualItem key={progress.ritualId} progress={progress} />
          ))}
        </div>
        
        {/* Footer - Bonus Section */}
        <div className="relative p-4 border-t border-cyan-500/30 bg-gradient-to-r from-transparent to-cyan-500/5">
          {/* Total earned */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-sm font-mono">
              &gt; REWARDS_EARNED:
            </span>
            <div className="flex items-center gap-1">
              <Gem className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 font-bold">{totalReward}</span>
            </div>
          </div>
          
          {/* Bonus claim button */}
          {state.allCompleted && (
            <button
              onClick={onClaimBonus}
              disabled={state.bonusClaimed}
              className={`group w-full py-3 font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${
                canClaimBonus
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black hover:shadow-[0_0_20px_rgba(255,200,0,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
              }`}
            >
              <Gift className={`w-5 h-5 ${canClaimBonus ? 'group-hover:rotate-12 transition-transform' : ''}`} />
              {state.bonusClaimed ? 'BONUS CLAIMED' : `CLAIM BONUS (+${BONUS_REWARD})`}
            </button>
          )}
          
          {!state.allCompleted && (
            <div className="text-center text-gray-500 text-sm font-mono py-2">
              Complete all rituals for +{BONUS_REWARD} bonus
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RitualsPanel;
