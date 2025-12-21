/**
 * MissionPanel Component - Numbers Mission Exclusive
 * Professional design with animated elements and neon glow effects
 */

import { Clock, Gem, Hash, Lock as LockIcon, Play, RefreshCw, Sparkles, X, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import * as AudioSystem from '../../systems/audioSystem';
import { getHapticSystem } from '../../systems/hapticSystem';
import { NUMBERS_MISSION_REWARDS, TRIAL_POKEMON } from '../../systems/numbersMissionService';
import { useNumbersMission } from '../../systems/useNumbersMission';

interface MissionPanelProps {
  missionState: unknown; // Legacy prop, keeping for compatibility
  soundCheckComplete: boolean;
  onClaimMission?: (missionId: string) => void;
  onClose: () => void;
  onStartNumbersMission?: (targetDistance: number, pokemonId?: string) => void;
}

const MissionPanel: React.FC<MissionPanelProps> = ({
  onClose,
  onStartNumbersMission,
}) => {
  // Numbers Mission hook
  const {
    currentMission,
    isOnCooldown,
    timeLeft,
    isLoading,
    error,
    isLocked,
    fetchMission,
    startMission,
    lockMission,
    unlockMission,
  } = useNumbersMission();

  const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);
  const [typedText, setTypedText] = useState('');
  const [showText, setShowText] = useState(false);

  // Typewriter effect for trivia text
  useEffect(() => {
    if (!currentMission?.text) {
      setTypedText('');
      setShowText(false);
      return;
    }

    setShowText(true);
    let index = 0;
    const text = currentMission.text;
    setTypedText('');

    const interval = setInterval(() => {
      if (index < text.length) {
        setTypedText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 20); // 20ms per character

    return () => clearInterval(interval);
  }, [currentMission?.text]);

  // Auto-fetch mission when panel opens (only if not locked)
  useEffect(() => {
    if (!currentMission && !isLoading && !isOnCooldown && !error && !isLocked) {
      fetchMission();
    }
  }, [currentMission, isLoading, isOnCooldown, error, isLocked, fetchMission]);

  // Format cooldown time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  // Handle starting mission
  const handleStart = useCallback(() => {
    if (!currentMission) return;

    const started = startMission(selectedPokemon || undefined);
    if (started && onStartNumbersMission) {
      AudioSystem.playGameStart();
      getHapticSystem().trigger('success');
      onStartNumbersMission(currentMission.number, selectedPokemon || undefined);
      onClose();
    }
  }, [currentMission, startMission, selectedPokemon, onStartNumbersMission, onClose]);

  const handleClose = () => {
    AudioSystem.playButtonClick();
    getHapticSystem().trigger('light');
    onClose();
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 p-4">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Main Panel */}
      <div className="relative w-full max-w-lg bg-gradient-to-b from-gray-900 via-gray-950 to-black border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,240,255,0.15)]">
        {/* Animated background lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 49%, rgba(0,240,255,0.1) 49%, rgba(0,240,255,0.1) 51%, transparent 51%),
              linear-gradient(0deg, transparent 49%, rgba(0,240,255,0.05) 49%, rgba(0,240,255,0.05) 51%, transparent 51%)
            `,
            backgroundSize: '30px 30px',
          }} />
        </div>

        {/* Header */}
        <div className="relative p-5 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 backdrop-blur-sm border border-cyan-500/30">
                <Hash className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-[0.1em] flex items-center gap-2">
                SAYI GÖREVİ
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </h2>
              <p className="text-cyan-400/70 text-xs font-mono tracking-wide">
                DİNAMİK HEDEF MODU
              </p>
            </div>
          </div>

          {/* Close button only */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-all active:scale-90"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="relative p-5">
          {/* Cooldown State */}
          {isOnCooldown && (
            <div className="flex flex-col items-center py-10">
              <div className="relative mb-6">
                <div className="w-28 h-28 rounded-full border-4 border-yellow-500/30 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-yellow-400" />
                </div>
                <svg className="absolute inset-0 w-28 h-28 -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="52"
                    fill="none"
                    stroke="rgba(234, 179, 8, 0.5)"
                    strokeWidth="4"
                    strokeDasharray={`${(timeLeft / 60) * 327} 327`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="text-5xl font-black text-yellow-400 tabular-nums tracking-tight mb-2">
                {formatTime(timeLeft)}
              </div>
              <p className="text-gray-400 text-sm">Yeni hedef için bekleniyor...</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !isOnCooldown && (
            <div className="flex flex-col items-center py-16">
              <div className="relative mb-4">
                <div className="w-16 h-16 border-2 border-cyan-500/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-cyan-400 text-sm font-medium">Hedef yükleniyor...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isOnCooldown && (
            <div className="flex flex-col items-center py-12">
              <p className="text-red-400 mb-4 text-center">{error}</p>
              <button
                onClick={fetchMission}
                className="px-6 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all active:scale-95 font-bold"
              >
                Tekrar Dene
              </button>
            </div>
          )}

          {/* Mission Available */}
          {!isOnCooldown && !isLoading && !error && currentMission && (
            <>
              {/* Target Number - Large and Glowing */}
              <div className="relative text-center py-6 mb-4">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                </div>
                <div className="relative text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-cyan-400 to-cyan-600 tracking-tight"
                  style={{
                    textShadow: '0 0 40px rgba(0, 240, 255, 0.5), 0 0 80px rgba(0, 240, 255, 0.3)',
                    WebkitTextStroke: '1px rgba(0, 240, 255, 0.3)',
                  }}
                >
                  {currentMission.number}
                </div>
                <div className="text-cyan-400/60 text-lg font-bold tracking-[0.2em] mt-1">
                  METRE
                </div>

                {/* Professional PIN Toggle Button */}
                <button
                  onClick={() => {
                    if (isLocked) {
                      unlockMission();
                    } else {
                      lockMission();
                    }
                    AudioSystem.playButtonClick();
                    getHapticSystem().trigger('selection');
                  }}
                  className={`mt-4 px-5 py-2 rounded-full text-xs font-bold tracking-[0.15em] transition-all duration-300 active:scale-95 flex items-center gap-2 mx-auto ${isLocked
                    ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 border border-green-400/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                    : 'bg-white/5 border border-white/20 text-white/60 hover:bg-white/10 hover:text-white/80 hover:border-white/30'
                    }`}
                >
                  {isLocked ? (
                    <>
                      <LockIcon className="w-3.5 h-3.5" />
                      SABİTLENDİ
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      YENİ HEDEF
                    </>
                  )}
                </button>
              </div>

              {/* Trivia Text with Typewriter Effect */}
              {showText && (
                <div className="relative bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/10 rounded-xl p-4 mb-5">
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                  <p className="text-gray-300 text-sm italic leading-relaxed min-h-[3rem]">
                    "{typedText}"
                    <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 animate-pulse" />
                  </p>
                </div>
              )}

              {/* Trial Pokemon Selection */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400 text-xs font-bold tracking-[0.15em]">
                    DENEME POKéMON SEÇ
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {TRIAL_POKEMON.map((pokemon) => (
                    <button
                      key={pokemon.id}
                      onClick={() => {
                        setSelectedPokemon(selectedPokemon === pokemon.id ? null : pokemon.id);
                        AudioSystem.playButtonClick();
                        getHapticSystem().trigger('selection');
                      }}
                      className={`relative py-2 px-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${selectedPokemon === pokemon.id
                        ? 'bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-105'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                    >
                      {pokemon.name}
                      {selectedPokemon === pokemon.id && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rewards Preview */}
              <div className="flex items-center justify-center gap-6 p-4 bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-purple-500/10 border border-white/10 rounded-xl mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20">
                    <Gem className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-cyan-400 font-black text-lg">+{NUMBERS_MISSION_REWARDS.gems}</div>
                    <div className="text-cyan-400/50 text-xs -mt-1">GEM</div>
                  </div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-yellow-500/20">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-yellow-400 font-black text-lg">+{NUMBERS_MISSION_REWARDS.xp}</div>
                    <div className="text-yellow-400/50 text-xs -mt-1">XP</div>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStart}
                className="group relative w-full py-4 bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 text-black font-black text-lg tracking-[0.2em] rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:shadow-[0_0_50px_rgba(0,240,255,0.6)] active:scale-[0.98] transition-all overflow-hidden"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="relative flex items-center justify-center gap-3">
                  <Play className="w-6 h-6 fill-black" />
                  GÖREVE BAŞLA
                </div>
              </button>
            </>
          )}

          {/* No mission and no loading */}
          {!isOnCooldown && !isLoading && !error && !currentMission && (
            <div className="flex flex-col items-center py-12">
              <button
                onClick={fetchMission}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 text-cyan-400 rounded-xl hover:from-cyan-500/30 hover:to-cyan-400/30 transition-all active:scale-95 font-bold border border-cyan-500/30"
              >
                Yeni Hedef Yükle
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="relative px-5 py-3 border-t border-white/5 bg-black/30">
          <p className="text-center text-gray-500 text-xs">
            Hedef tamamlandığında ödüller otomatik verilir
          </p>
        </div>
      </div>
    </div>
  );
};

export default MissionPanel;
