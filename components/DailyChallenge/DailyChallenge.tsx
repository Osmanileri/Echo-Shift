/**
 * Daily Challenge UI Component
 * Requirements: 8.1, 8.4 - Challenge info display, special rules, completion status
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Trophy, Gem, Clock, Zap, Ghost, Shuffle, Minus, AlertTriangle, Play, CheckCircle } from 'lucide-react';
import { 
  getTodayChallenge, 
  getTimeUntilNextChallenge,
  DailyChallengeConfig 
} from '../../systems/dailyChallenge';
import { useGameStore } from '../../store/gameStore';

interface DailyChallengeProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChallenge: (config: DailyChallengeConfig) => void;
}

const DailyChallenge: React.FC<DailyChallengeProps> = ({ isOpen, onClose, onStartChallenge }) => {
  const [timeRemaining, setTimeRemaining] = useState(getTimeUntilNextChallenge());
  
  const echoShards = useGameStore((state) => state.echoShards);
  
  // Get today's challenge with status
  const challenge = useMemo(() => getTodayChallenge(), []);
  
  // Update countdown timer
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(getTimeUntilNextChallenge());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const formatTime = (time: { hours: number; minutes: number; seconds: number }) => {
    return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`;
  };
  
  const getModifierIcon = (modifier: string) => {
    switch (modifier) {
      case 'speedBoost':
        return <Zap className="w-4 h-4" />;
      case 'phantomOnly':
        return <Ghost className="w-4 h-4" />;
      case 'invertedControls':
        return <Shuffle className="w-4 h-4" />;
      case 'noMidline':
        return <Minus className="w-4 h-4" />;
      case 'doubleObstacles':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };
  
  const getActiveModifiers = () => {
    const modifiers: { key: string; label: string; value: string; color: string }[] = [];
    
    if (challenge.modifiers.speedBoost > 1.1) {
      modifiers.push({
        key: 'speedBoost',
        label: 'Hız Artışı',
        value: `${Math.round(challenge.modifiers.speedBoost * 100)}%`,
        color: 'text-yellow-400',
      });
    } else if (challenge.modifiers.speedBoost < 0.9) {
      modifiers.push({
        key: 'speedBoost',
        label: 'Yavaş Mod',
        value: `${Math.round(challenge.modifiers.speedBoost * 100)}%`,
        color: 'text-blue-400',
      });
    }
    
    if (challenge.modifiers.phantomOnly) {
      modifiers.push({
        key: 'phantomOnly',
        label: 'Sadece Phantom',
        value: 'Aktif',
        color: 'text-purple-400',
      });
    }
    
    if (challenge.modifiers.invertedControls) {
      modifiers.push({
        key: 'invertedControls',
        label: 'Ters Kontrol',
        value: 'Aktif',
        color: 'text-red-400',
      });
    }
    
    if (challenge.modifiers.noMidline) {
      modifiers.push({
        key: 'noMidline',
        label: 'Sabit Orta Çizgi',
        value: 'Aktif',
        color: 'text-green-400',
      });
    }
    
    if (challenge.modifiers.doubleObstacles) {
      modifiers.push({
        key: 'doubleObstacles',
        label: 'Çift Engel',
        value: 'Aktif',
        color: 'text-orange-400',
      });
    }
    
    return modifiers;
  };
  
  const activeModifiers = getActiveModifiers();
  
  const handleStartChallenge = () => {
    onStartChallenge(challenge);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xs sm:max-w-sm bg-gradient-to-b from-gray-900 to-black rounded-xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header - Compact */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 sticky top-0 bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-500/20 rounded-lg">
              <Calendar className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">GÜNLÜK MEYDAN OKUMA</h2>
              <p className="text-[10px] text-white/50">{challenge.date}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Challenge Info - Compact */}
        <div className="p-3 space-y-3">
          {/* Challenge Name & Status */}
          <div className="text-center py-2">
            <h3 className="text-lg font-bold text-white mb-1">{challenge.challengeName}</h3>
            <p className="text-xs text-white/60">{challenge.description}</p>
            
            {/* Completion Badge */}
            {challenge.completed && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/30">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs font-bold text-green-400">TAMAMLANDI</span>
              </div>
            )}
          </div>
          
          {/* Bonus Multiplier - Compact */}
          <div className="flex items-center justify-center gap-2 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Gem className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-cyan-400">
              x{challenge.bonusMultiplier.toFixed(1)} Bonus
            </span>
          </div>
          
          {/* Active Modifiers - Compact */}
          {activeModifiers.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Özel Kurallar
              </h4>
              <div className="grid grid-cols-2 gap-1.5">
                {activeModifiers.map((mod) => (
                  <div
                    key={mod.key}
                    className="flex items-center gap-1.5 p-2 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className={mod.color}>
                      {getModifierIcon(mod.key)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/60 truncate">{mod.label}</p>
                      <p className={`text-xs font-bold ${mod.color}`}>{mod.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Best Score - Compact */}
          {challenge.bestScore > 0 && (
            <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-white/70">En İyi</span>
              </div>
              <span className="text-sm font-bold text-yellow-400">
                {challenge.bestScore.toLocaleString()}
              </span>
            </div>
          )}
          
          {/* Time Until Next Challenge - Compact */}
          <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-white/50" />
              <span className="text-xs text-white/70">Sonraki</span>
            </div>
            <span className="text-sm font-mono font-bold text-white">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Footer - Compact */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Gem className="w-3 h-3 text-cyan-400" />
              <span className="text-xs text-white/70">Bakiye:</span>
              <span className="text-xs font-bold text-cyan-400">{echoShards.toLocaleString()}</span>
            </div>
          </div>
          
          <button
            onClick={handleStartChallenge}
            disabled={challenge.completed}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${
              challenge.completed
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-500 text-white active:scale-[0.98] shadow-lg shadow-orange-500/25'
            }`}
          >
            {challenge.completed ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Yarın Gel
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Başlat
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyChallenge;
