import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gem,
  Ghost,
  Home,
  Palette,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  Settings,
  ShoppingCart,
  Star,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import React, { useEffect, useState } from "react";
import * as AudioSystem from "../systems/audioSystem";
import { getHapticSystem } from "../systems/hapticSystem";
import { GameState } from "../types";

interface GameUIProps {
  gameState: GameState;
  score: number;
  highScore: number;
  speed: number;
  onStart: () => void;
  onRestart: () => void;
  onPause: () => void;
  onResume: () => void;
  onMainMenu: () => void;
  onOpenShop?: () => void;
  onOpenStudio?: () => void;
  onOpenDailyChallenge?: () => void;
  onOpenMissions?: () => void;
  onOpenRituals?: () => void;
  // Campaign Update v2.5 - Requirements 1.3: Removed onOpenCampaign
  // Campaign is now the primary mode, accessed via "Start Game" button
  rhythmMultiplier?: number;
  rhythmStreak?: number;
  nearMissStreak?: number;
  echoShards?: number;
  earnedShards?: number;
  slowMotionUsesRemaining?: number;
  slowMotionActive?: boolean;
  onActivateSlowMotion?: () => void;
  // Progression System props - Requirements 1.1, 2.1, 4.4, 5.1
  syncRate?: number;
  totalXP?: number;
  lastLoginDate?: string;
  onClaimDailyReward?: () => void;
  soundCheckComplete?: boolean;
  // Campaign Update v2.5 - Distance Mode props - Requirements 6.1, 6.2, 6.3, 6.4
  distanceMode?: boolean;
  currentDistance?: number;
  targetDistance?: number;
  progressPercent?: number;
  isNearFinish?: boolean;
  shardsCollectedInRun?: number;
  // Ghost Pace Indicator - Requirements 15.1, 15.3
  previousBestDistance?: number;
  hasPassedGhost?: boolean;
  dashEnergy?: number;
  dashActive?: boolean;
  dashRemainingPercent?: number; // Remaining dash time (100 = full, 0 = empty)
  // Quantum Lock - Requirements 7.5
  isQuantumLockActive?: boolean;
  // Tutorial Mode - Level 0 interactive tutorial
  tutorialMode?: boolean;
}

const GameUI: React.FC<GameUIProps> = ({
  gameState,
  score,
  highScore,
  speed,
  onStart,
  onRestart,
  onPause,
  onResume,
  onMainMenu,
  onOpenShop,
  onOpenStudio,
  onOpenDailyChallenge,
  onOpenMissions,
  onOpenRituals,
  // Campaign Update v2.5 - Requirements 1.3: Removed onOpenCampaign
  rhythmMultiplier = 1,
  rhythmStreak = 0,
  nearMissStreak = 0,
  echoShards = 0,
  earnedShards = 0,
  slowMotionUsesRemaining = 0,
  slowMotionActive = false,
  onActivateSlowMotion,
  // Progression System props
  syncRate = 1,
  totalXP = 0,
  lastLoginDate = '',
  onClaimDailyReward,
  soundCheckComplete = false,
  // Campaign Update v2.5 - Distance Mode props
  distanceMode = false,
  currentDistance = 0,
  targetDistance = 0,
  progressPercent = 0,
  isNearFinish = false,
  shardsCollectedInRun = 0,
  // Ghost Pace Indicator
  previousBestDistance = 0,
  hasPassedGhost = false,
  // Phase Dash
  dashEnergy = 0,
  dashActive = false,
  dashRemainingPercent = 100,
  isQuantumLockActive = false,
  // Tutorial Mode - hide all HUD during tutorial
  tutorialMode = false,
}) => {
  const [showContent, setShowContent] = useState(false);

  // Audio volume state
  const [sfxVolume, setSfxVolume] = useState(() => AudioSystem.getVolume());
  const [sfxEnabled, setSfxEnabled] = useState(() => AudioSystem.isEnabled());
  const [showSettings, setShowSettings] = useState(false);

  const handleButtonClick = (callback: () => void) => {
    getHapticSystem().trigger("selection");
    AudioSystem.playButtonClick();
    callback();
  };

  // Volume control handlers
  const handleVolumeChange = (newVolume: number) => {
    setSfxVolume(newVolume);
    AudioSystem.setVolume(newVolume);
    // Play a test sound so user can hear the volume level
    if (newVolume > 0) {
      AudioSystem.playButtonClick();
    }
  };

  const handleToggleSfx = () => {
    const newEnabled = !sfxEnabled;
    setSfxEnabled(newEnabled);
    AudioSystem.setEnabled(newEnabled);
    if (newEnabled) {
      AudioSystem.playButtonClick();
    }
  };

  useEffect(() => {
    if (gameState === GameState.MENU) {
      setTimeout(() => setShowContent(true), 300);
    }
  }, [gameState]);

  // Center selected zone card
  // Tutorial cards data
  const tutorialCards = [
    {
      title: "KAYDIR",
      desc: "Yukarı ve aşağı kaydırarak topları hareket ettir.",
      icon: (
        <div className="flex flex-col items-center gap-0.5">
          <ChevronLeft className="w-3.5 h-3.5 text-cyan-400 rotate-90" />
          <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
          <ChevronRight className="w-3.5 h-3.5 text-cyan-400 rotate-90" />
        </div>
      ),
    },
    {
      title: "RENK EŞLE",
      desc: "Beyaz top → beyaz engel, siyah top → siyah engel.",
      icon: (
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.3)]" />
            <div className="w-2.5 h-4 rounded-sm bg-white/80" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-3.5 h-3.5 rounded-full bg-black border border-white/30" />
            <div className="w-2.5 h-4 rounded-sm bg-black border border-white/20" />
          </div>
        </div>
      ),
    },
    {
      title: "DİKKAT",
      desc: "Çubuk uzuyor, hız artıyor. Hayatta kal!",
      icon: (
        <div className="flex flex-col items-center justify-center gap-0.5">
          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.3)]" />
          <div className="w-0.5 h-3 bg-gradient-to-b from-white/80 to-cyan-400/60 rounded-full animate-pulse" />
          <div className="w-0.5 h-1.5 bg-cyan-400/40 rounded-full" />
          <div className="w-3.5 h-3.5 rounded-full bg-black border border-white/30" />
        </div>
      ),
    },
  ];

  // ============ PLAYING STATE ============
  if (gameState === GameState.PLAYING) {
    // Tutorial Mode: Hide all HUD elements for clean learning experience
    if (tutorialMode) {
      return (
        <>
          {/* Only show pause button during tutorial */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-auto z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleButtonClick(onPause);
              }}
              className="p-2 bg-black/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-colors"
            >
              <Pause className="w-5 h-5 text-white" />
            </button>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="absolute top-6 left-0 w-full px-5 flex justify-between items-start pointer-events-none z-10">
          {/* Campaign Update v2.5 - Distance Mode HUD - Requirements 6.1, 6.2, 6.3, 6.4 */}
          {/* Visual Legibility: Enhanced shadows for guaranteed visibility on any background */}
          {distanceMode ? (
            <div className="flex flex-col items-start">
              {/* Distance Counter - Requirements 6.1 */}
              {/* During dash, show bonus effect with cyan-to-purple gradient and x4 indicator */}
              <div className="relative">
                <span
                  className={`text-3xl md:text-4xl font-black tracking-widest transition-all duration-300 ${dashActive
                    ? 'bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent animate-pulse'
                    : 'text-white'
                    }`}
                  style={{
                    textShadow: dashActive
                      ? '0 0 20px rgba(0,240,255,0.8)'
                      : '0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.6)'
                  }}
                >
                  {Math.floor(currentDistance)}m
                </span>
                {/* Bonus multiplier badge during dash */}
                {dashActive && (
                  <span className="absolute -right-10 top-1 px-1.5 py-0.5 bg-cyan-500/30 border border-cyan-400/50 rounded text-[10px] font-black text-cyan-300 animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                    x4
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] md:text-xs font-bold mt-1 uppercase tracking-widest transition-all duration-300 ${dashActive ? 'text-cyan-400' : 'text-gray-300'}`}
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.7)' }}
              >
                {dashActive ? 'WARP!' : 'Mesafe'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-start">
              <span
                className="text-3xl md:text-4xl font-black text-white tracking-widest"
                style={{ textShadow: '0 0 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,1), 0 0 16px rgba(0,0,0,0.6)' }}
              >
                {score.toString().padStart(5, "0")}
              </span>
              <span
                className="text-[10px] md:text-xs text-gray-300 font-bold mt-1 uppercase tracking-widest"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
              >
                Skor
              </span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleButtonClick(onPause);
            }}
            className="pointer-events-auto p-2 bg-black/30 backdrop-blur-sm rounded-full border border-white/20 hover:bg-white/20 transition-colors"
          >
            <Pause className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
          <div className="flex flex-col items-end">
            <span
              className="text-lg md:text-xl font-bold text-white/70"
              style={{ textShadow: '0 0 6px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.7)' }}
            >
              {Math.floor(speed * 10)} km/h
            </span>
          </div>
        </div>

        {/* Distance Progress Bar - Bottom Center (Mobile Optimized) */}
        {distanceMode && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[75%] max-w-sm pointer-events-none z-10">
            <div
              className={`relative h-4 bg-black/40 backdrop-blur-sm rounded-full overflow-visible border-2 ${isNearFinish
                ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.6)] animate-pulse'
                : 'border-white/30'
                }`}
            >
              {/* Progress fill */}
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${isNearFinish
                  ? 'bg-gradient-to-r from-cyan-400 to-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.8)]'
                  : 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-400'
                  }`}
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />

              {/* Ghost Marker - Previous Best Distance - Requirements 15.1, 15.3 */}
              {previousBestDistance > 0 && targetDistance > 0 && (
                <div
                  className={`absolute z-30 transition-all duration-700 ease-out ${hasPassedGhost
                    ? 'opacity-60 scale-90'
                    : 'opacity-100'
                    }`}
                  style={{
                    left: `calc(${Math.min(98, (previousBestDistance / targetDistance) * 100)}%)`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {/* Ghost container with glow effect */}
                  <div className={`relative group ${!hasPassedGhost ? 'animate-bounce' : ''}`}>
                    {/* Outer glow ring */}
                    <div className={`absolute inset-0 rounded-full blur-md transition-all duration-500 ${hasPassedGhost
                      ? 'bg-green-400/40'
                      : 'bg-rose-400/60 animate-ping'
                      }`} style={{ transform: 'scale(1.5)' }} />

                    {/* Main ghost circle */}
                    <div className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 backdrop-blur-sm transition-all duration-500 ${hasPassedGhost
                      ? 'bg-green-900/80 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.6)]'
                      : 'bg-rose-900/80 border-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.6)]'
                      }`}>
                      <Ghost className={`w-5 h-5 transition-all duration-300 ${hasPassedGhost
                        ? 'text-green-300 drop-shadow-[0_0_8px_rgba(74,222,128,1)]'
                        : 'text-rose-300 drop-shadow-[0_0_8px_rgba(251,113,133,1)]'
                        }`} />
                    </div>

                    {/* Label above ghost */}
                    <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-500 ${hasPassedGhost
                      ? 'bg-green-500/30 text-green-300 border border-green-400/50'
                      : 'bg-rose-500/30 text-rose-300 border border-rose-400/50'
                      }`}>
                      {hasPassedGhost ? '✓ GEÇTİN!' : `👻 ${Math.floor(previousBestDistance)}m`}
                    </div>

                    {/* Vertical line indicator */}
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-3 transition-all duration-300 ${hasPassedGhost
                      ? 'bg-gradient-to-b from-green-400 to-transparent'
                      : 'bg-gradient-to-b from-rose-400 to-transparent'
                      }`} />
                  </div>
                </div>
              )}

              {/* Current Position indicator */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg transition-all duration-300 z-20 ${isNearFinish ? 'bg-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.8)]' : 'bg-white'
                  }`}
                style={{ left: `calc(${Math.min(100, progressPercent)}% - 10px)` }}
              />

              {/* Finish flag at end */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                <Target className={`w-5 h-5 ${isNearFinish ? 'text-cyan-400' : 'text-white/50'}`} />
              </div>
            </div>

            {/* Distance labels */}
            <div className="flex justify-between mt-2 px-1">
              <span className="text-xs text-white/50 font-mono">0m</span>
              <span className={`text-xs font-mono font-bold ${isNearFinish ? 'text-cyan-400' : 'text-white/50'}`}>
                {Math.floor(targetDistance)}m
              </span>
            </div>
          </div>
        )}

        {rhythmMultiplier > 1 && (
          <div className="absolute top-24 left-5 pointer-events-none z-10">
            <div
              className={`px-3 py-1.5 rounded-lg backdrop-blur-sm border ${rhythmMultiplier === 3
                ? "bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                : "bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                }`}
            >
              <span
                className={`text-xl md:text-2xl font-black tracking-wider ${rhythmMultiplier === 3 ? "text-yellow-400" : "text-cyan-400"
                  }`}
              >
                x{rhythmMultiplier}
              </span>
            </div>
          </div>
        )}

        <div className="absolute top-24 right-5 pointer-events-none z-10 flex flex-col gap-2 items-end">
          {rhythmStreak > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-cyan-500/10 rounded-md border border-cyan-500/30 backdrop-blur-sm">
              <span className="text-[10px] md:text-xs text-cyan-400/70 uppercase tracking-wider">
                Ritim
              </span>
              <span className="text-sm md:text-base font-bold text-cyan-400">
                {rhythmStreak}
              </span>
            </div>
          )}
          {nearMissStreak > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 rounded-md border border-purple-500/30 backdrop-blur-sm">
              <span className="text-[10px] md:text-xs text-purple-400/70 uppercase tracking-wider">
                Dodge
              </span>
              <span className="text-sm md:text-base font-bold text-purple-400">
                {nearMissStreak}
              </span>
            </div>
          )}
        </div>

        {slowMotionUsesRemaining > 0 && onActivateSlowMotion && (
          <div className="absolute bottom-28 left-5 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleButtonClick(onActivateSlowMotion);
              }}
              disabled={slowMotionActive}
              className={`pointer-events-auto flex flex-col items-center gap-2 transition-all duration-300 ${slowMotionActive ? "opacity-50" : "opacity-100 hover:scale-105"
                }`}
            >
              <div
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${slowMotionActive
                  ? "border-purple-500 bg-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                  : "border-purple-500/50 bg-black/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:bg-purple-500/20"
                  }`}
              >
                <Clock
                  className={`w-6 h-6 md:w-8 md:h-8 ${slowMotionActive
                    ? "text-purple-300 animate-pulse"
                    : "text-purple-400"
                    }`}
                />
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-purple-400 tracking-widest uppercase">
                {slowMotionActive
                  ? "AKTİF"
                  : `YAVAŞLAT (${slowMotionUsesRemaining})`}
              </span>
            </button>
          </div>
        )}

        {slowMotionActive && (
          <div className="absolute inset-0 pointer-events-none z-5 border-4 border-purple-500/30 animate-pulse" />
        )}

        {/* Phase Dash Circular Energy Icon - Hidden during Quantum Lock */}
        {!isQuantumLockActive && (
          <div className="absolute bottom-28 right-5 pointer-events-none z-10 flex flex-col items-center gap-2">
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Background Circle */}
              <div className={`absolute inset-0 rounded-full border-2 bg-black/40 backdrop-blur-sm transition-all duration-300 ${dashActive ? 'border-yellow-500/50' : 'border-white/10'
                }`} />

              {/* Progress Circle (Conic Gradient) */}
              {/* When dash is active, show remaining time (yellow draining). Otherwise show energy charging (cyan filling) */}
              <div
                className="absolute inset-0 rounded-full transition-all duration-100"
                style={{
                  background: dashActive
                    ? `conic-gradient(#FACC15 ${dashRemainingPercent}%, transparent 0)` // Yellow draining during dash
                    : `conic-gradient(${dashEnergy >= 100 ? '#FACC15' : '#06B6D4'} ${dashEnergy}%, transparent 0)`, // Cyan charging / Yellow when full
                  maskImage: 'radial-gradient(transparent 55%, black 56%)',
                  WebkitMaskImage: 'radial-gradient(transparent 55%, black 56%)'
                }}
              />

              {/* Glowing Ring when full or active */}
              {(dashEnergy >= 100 || dashActive) && (
                <div className={`absolute inset-0 rounded-full border-2 animate-pulse shadow-[0_0_15px_rgba(250,204,21,0.6)] ${dashActive ? 'border-yellow-500' : 'border-yellow-400'
                  }`} />
              )}

              {/* Center Icon */}
              <div className={`z-10 transition-transform duration-300 ${dashActive || dashEnergy >= 100 ? 'scale-110' : 'scale-100'}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-7 h-7 transition-all duration-300 ${dashActive
                    ? 'text-yellow-300 drop-shadow-[0_0_15px_rgba(250,204,21,1)] animate-pulse'
                    : dashEnergy >= 100
                      ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse'
                      : 'text-cyan-400/50'
                    }`}
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
            </div>

            {/* Label - Shows remaining time during dash */}
            <span className={`text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${dashActive
              ? 'text-yellow-300 animate-pulse'
              : dashEnergy >= 100
                ? 'text-yellow-400 animate-pulse'
                : 'text-cyan-400/60'
              }`}>
              {dashActive ? `${Math.floor(dashRemainingPercent)}%` : dashEnergy >= 100 ? 'HAZIR' : `${Math.floor(dashEnergy)}%`}
            </span>
          </div>
        )}

        {/* Phase Dash Active Border */}
        {dashActive && (
          <div className="absolute inset-0 pointer-events-none z-5 border-4 border-cyan-500/50 animate-pulse" />
        )}
      </>
    );
  }

  // ============ PAUSED STATE ============
  if (gameState === GameState.PAUSED) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md z-30 text-white px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 tracking-[0.2em] text-white/90 relative z-10">
          DURAKLADI
        </h2>
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-6" />

        {/* Volume Control */}
        <div className="relative z-10 w-full max-w-xs mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSfx}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              {sfxEnabled ? (
                <Volume2 className="w-5 h-5 text-cyan-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-white/40" />
              )}
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/50 uppercase tracking-wider">
                  Ses Efektleri
                </span>
                <span className="text-[10px] text-cyan-400 font-bold">
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                disabled={!sfxEnabled}
                className={`w-full h-2 rounded-full appearance-none cursor-pointer
                  ${sfxEnabled ? 'bg-white/20' : 'bg-white/10 opacity-50'}
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-cyan-400
                  [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,240,255,0.5)]
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-all
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-moz-range-thumb]:w-4
                  [&::-moz-range-thumb]:h-4
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-cyan-400
                  [&::-moz-range-thumb]:border-none
                  [&::-moz-range-thumb]:cursor-pointer
                `}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 relative z-10 w-full max-w-xs">
          <button
            onClick={() => handleButtonClick(onResume)}
            className="group flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-sm tracking-widest active:scale-[0.98] transition-all duration-300 shadow-[0_0_30px_rgba(0,240,255,0.3)] rounded-lg"
          >
            <PlayCircle size={20} /> DEVAM ET
          </button>
          <button
            onClick={() => handleButtonClick(onRestart)}
            className="group flex items-center justify-center gap-2 w-full py-3 border border-white/30 text-white font-bold text-sm tracking-widest hover:bg-white/10 transition-all duration-300 rounded-lg"
          >
            <RotateCcw size={20} /> YENİDEN BAŞLA
          </button>
          <button
            onClick={() => handleButtonClick(onMainMenu)}
            className="group flex items-center justify-center gap-2 w-full py-3 border border-white/10 text-white/50 font-bold text-sm tracking-widest hover:text-white/80 transition-all duration-300 rounded-lg"
          >
            <Home size={20} /> ANA MENÜ
          </button>
        </div>
      </div>
    );
  }

  // ============ MENU STATE ============
  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 z-20 text-white overflow-hidden select-none">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] via-[#0d1117] to-black" />

        {/* Animated particles/glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-purple-500/5 blur-[100px] rounded-full" />
          <div className="absolute bottom-1/3 right-0 w-[300px] h-[200px] bg-blue-500/5 blur-[80px] rounded-full" />

          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-400/40 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div
          className={`absolute inset-0 flex flex-col px-4 py-6 transition-all duration-700 ${showContent ? "opacity-100" : "opacity-0"
            }`}
        >
          {/* ===== SETTINGS BUTTON (Top Right) ===== */}
          <div className="absolute top-6 right-5 z-30">
            <button
              onClick={() => {
                AudioSystem.playButtonClick();
                setShowSettings(!showSettings);
              }}
              className={`p-2.5 rounded-full backdrop-blur-sm border transition-all duration-300 ${showSettings
                ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                : 'bg-black/40 border-white/10 hover:bg-white/10'
                }`}
            >
              <Settings className={`w-5 h-5 transition-transform duration-300 ${showSettings ? 'text-cyan-400 rotate-90' : 'text-white/70'
                }`} />
            </button>

            {/* Settings Panel */}
            {showSettings && (
              <div className="absolute top-14 right-0 w-56 p-4 bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Ayarlar</span>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>

                {/* Volume Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleToggleSfx}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        {sfxEnabled ? (
                          <Volume2 className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-white/40" />
                        )}
                      </button>
                      <span className="text-[11px] text-white/60">Ses Efektleri</span>
                    </div>
                    <span className="text-[11px] text-cyan-400 font-bold tabular-nums">
                      {Math.round(sfxVolume * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sfxVolume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    disabled={!sfxEnabled}
                    className={`w-full h-2 rounded-full appearance-none cursor-pointer
                      ${sfxEnabled ? 'bg-white/10' : 'bg-white/5 opacity-50'}
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-cyan-400
                      [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,240,255,0.5)]
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-110
                      [&::-moz-range-thumb]:w-4
                      [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-cyan-400
                      [&::-moz-range-thumb]:border-none
                    `}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ===== HEADER: Logo + Slogan ===== */}
          <div className="text-center mb-3">
            <h1 className="text-4xl sm:text-5xl font-black tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-300 drop-shadow-[0_0_30px_rgba(0,240,255,0.3)]">
              ECHO SHIFT
            </h1>
            <p className="text-[9px] text-cyan-400/70 tracking-[0.25em] uppercase font-medium mt-1">
              ÇUBUK UZAR • HIZ ARTAR • HAYATTA KAL
            </p>
          </div>

          {/* ===== STATS - Clean Display ===== */}
          <div className="flex items-center justify-center gap-6 mb-5">
            {/* Sync Rate / Level */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                  <span className="text-[10px] font-black text-black">{syncRate}</span>
                </div>
              </div>
              <span className="text-[8px] text-cyan-400/50 uppercase tracking-widest">
                Seviye
              </span>
            </div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-xl font-black text-white">
                  {highScore}
                </span>
              </div>
              <span className="text-[8px] text-white/40 uppercase tracking-widest">
                En İyi
              </span>
            </div>
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <Gem className="w-4 h-4 text-cyan-400" />
                <span className="text-xl font-black text-cyan-400">
                  {echoShards.toLocaleString()}
                </span>
              </div>
              <span className="text-[8px] text-cyan-400/50 uppercase tracking-widest">
                Parça
              </span>
            </div>
          </div>

          {/* ===== FEATURE NAV - Floating Orbs ===== */}
          <div className="flex items-center justify-center gap-6 mb-5">
            {onOpenShop && (
              <button
                onClick={() => handleButtonClick(onOpenShop)}
                className="group flex flex-col items-center gap-2 active:scale-90 transition-all duration-200"
              >
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute inset-[-8px] bg-emerald-500/40 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  {/* Ring */}
                  <div className="absolute inset-[-4px] rounded-full border border-emerald-500/0 group-hover:border-emerald-400/50 group-hover:scale-110 transition-all duration-300" />
                  {/* Main circle */}
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-900/80 to-emerald-950/90 border border-emerald-500/40 flex items-center justify-center group-hover:border-emerald-400 group-hover:from-emerald-800/90 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(16,185,129,0.2)]">
                    <ShoppingCart className="w-6 h-6 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400/70 font-bold tracking-wider uppercase group-hover:text-emerald-300 transition-colors">
                  Store
                </span>
              </button>
            )}
            {onOpenStudio && (
              <button
                onClick={() => handleButtonClick(onOpenStudio)}
                className="group flex flex-col items-center gap-2 active:scale-90 transition-all duration-200"
              >
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute inset-[-8px] bg-violet-500/40 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  {/* Ring */}
                  <div className="absolute inset-[-4px] rounded-full border border-violet-500/0 group-hover:border-violet-400/50 group-hover:scale-110 transition-all duration-300" />
                  {/* Main circle */}
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-violet-900/80 to-violet-950/90 border border-violet-500/40 flex items-center justify-center group-hover:border-violet-400 group-hover:from-violet-800/90 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(139,92,246,0.2)]">
                    <Palette className="w-6 h-6 text-violet-400 group-hover:text-violet-300 transition-colors" />
                  </div>
                </div>
                <span className="text-[10px] text-violet-400/70 font-bold tracking-wider uppercase group-hover:text-violet-300 transition-colors">
                  Studio
                </span>
              </button>
            )}
            {onOpenDailyChallenge && (
              <button
                onClick={() => handleButtonClick(onOpenDailyChallenge)}
                className="group flex flex-col items-center gap-2 active:scale-90 transition-all duration-200"
              >
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute inset-[-8px] bg-amber-500/40 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  {/* Ring */}
                  <div className="absolute inset-[-4px] rounded-full border border-amber-500/0 group-hover:border-amber-400/50 group-hover:scale-110 transition-all duration-300" />
                  {/* Main circle */}
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-900/80 to-amber-950/90 border border-amber-500/40 flex items-center justify-center group-hover:border-amber-400 group-hover:from-amber-800/90 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(245,158,11,0.2)]">
                    <Calendar className="w-6 h-6 text-amber-400 group-hover:text-amber-300 transition-colors" />
                  </div>
                </div>
                <span className="text-[10px] text-amber-400/70 font-bold tracking-wider uppercase group-hover:text-amber-300 transition-colors">
                  Daily
                </span>
              </button>
            )}
            {onOpenMissions && (
              <button
                onClick={() => handleButtonClick(onOpenMissions)}
                className="group flex flex-col items-center gap-2 active:scale-90 transition-all duration-200"
              >
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute inset-[-8px] bg-cyan-500/40 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  {/* Ring */}
                  <div className="absolute inset-[-4px] rounded-full border border-cyan-500/0 group-hover:border-cyan-400/50 group-hover:scale-110 transition-all duration-300" />
                  {/* Main circle */}
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-cyan-900/80 to-cyan-950/90 border border-cyan-500/40 flex items-center justify-center group-hover:border-cyan-400 group-hover:from-cyan-800/90 transition-all duration-300 shadow-[inset_0_2px_10px_rgba(0,240,255,0.2)]">
                    <Target className="w-6 h-6 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                  </div>
                  {/* Sound Check indicator */}
                  {!soundCheckComplete && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  )}
                </div>
                <span className="text-[10px] text-cyan-400/70 font-bold tracking-wider uppercase group-hover:text-cyan-300 transition-colors">
                  {soundCheckComplete ? 'Missions' : 'Sound Check'}
                </span>
              </button>
            )}
          </div>

          {/* ===== SECONDARY NAV - Rituals ===== */}
          {/* Campaign Update v2.5 - Requirements 1.3: Removed "Kampanya" button */}
          {/* Campaign is now the primary mode, accessed via "Start Game" button */}
          <div className="flex items-center justify-center gap-4 mb-4">
            {onOpenRituals && soundCheckComplete && (
              <button
                onClick={() => handleButtonClick(onOpenRituals)}
                className="group flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 hover:border-purple-400/50 active:scale-95 transition-all duration-200"
              >
                <Star className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                <span className="text-xs text-purple-400 font-bold tracking-wider uppercase group-hover:text-purple-300">
                  Günlük Görevler
                </span>
              </button>
            )}
          </div>

          {/* ===== TUTORIAL CARDS ===== */}
          <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full mb-3">
            <div className="space-y-2">
              {tutorialCards.map((card) => (
                <div
                  key={card.title}
                  className="bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-3 hover:bg-white/[0.05] hover:border-cyan-500/20 transition-all duration-300"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                    {card.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold tracking-wider text-[11px] uppercase">
                      {card.title}
                    </h3>
                    <p className="text-[9px] text-white/50 leading-relaxed mt-0.5">
                      {card.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== START BUTTON - Campaign First Flow ===== */}
          {/* Campaign Update v2.5 - Requirements 1.1, 1.2: "Start Game" opens level selection directly */}
          <div className="w-full max-w-xs mx-auto">
            <button
              onClick={() => handleButtonClick(onStart)}
              className="group relative w-full py-5 rounded-2xl overflow-hidden active:scale-[0.97] transition-all duration-200 shadow-[0_10px_40px_-10px_rgba(6,182,212,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(6,182,212,0.7)]"
            >
              {/* Multi-layer gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

              {/* Top highlight line */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

              {/* Shine sweep on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />

              {/* Outer glow */}
              <div className="absolute -inset-2 bg-cyan-400/40 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

              {/* Content */}
              <div className="relative flex items-center justify-center gap-3">
                <Play
                  size={26}
                  fill="currentColor"
                  className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform duration-300"
                />
                <span className="text-xl font-black text-white tracking-[0.2em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] group-hover:tracking-[0.25em] transition-all duration-300">
                  OYNA
                </span>
              </div>

              {/* Bottom edge for depth */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-t from-black/25 to-transparent" />
            </button>

            {/* Subtitle hint */}
            <p className="text-center text-[9px] text-white/30 mt-2 tracking-wider uppercase">
              Seviye Seç ve Başla
            </p>
          </div>
        </div>

      </div>
    );
  }

  // ============ GAME OVER STATE ============
  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 text-white overflow-hidden px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/80 via-black/90 to-black backdrop-blur-md" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-0 w-full h-px bg-red-500/30 animate-pulse" />
          <div className="absolute top-1/3 left-0 w-full h-px bg-red-500/20 animate-pulse delay-100" />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-1 tracking-[0.15em] text-white relative">
            OYUN
            <span className="absolute -right-1 top-0 text-red-500 opacity-50 blur-sm">
              OYUN
            </span>
          </h2>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-[0.15em] text-red-500 relative">
            BİTTİ
            <span className="absolute -left-1 top-0 text-white opacity-30 blur-sm">
              BİTTİ
            </span>
          </h2>

          {/* Campaign Update v2.5 - Distance Mode Game Over - Requirements 6.1 */}
          {distanceMode ? (
            <div className="flex flex-col items-center gap-3 mb-4 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm w-full">
              {/* Distance traveled / Target distance */}
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
                    {Math.floor(currentDistance)}m
                  </span>
                  <span className="text-lg text-white/40">/</span>
                  <span className="text-lg text-white/60 font-bold">
                    {Math.floor(targetDistance)}m
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-[0.2em]">
                  Gidilen Mesafe / Hedef Mesafe
                </span>
              </div>

              {/* Progress percentage */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <span className="text-sm font-bold text-cyan-400">
                  %{Math.floor(progressPercent)} tamamlandı
                </span>
              </div>

              {/* Shards collected during run */}
              {shardsCollectedInRun > 0 && (
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-cyan-400 font-bold">
                    {shardsCollectedInRun} parça toplandı
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 mb-4 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm w-full">
              <span className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
                {score}
              </span>
              <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-[0.2em]">
                Final Skor
              </span>
            </div>
          )}

          {score >= highScore && score > 0 && (
            <div className="flex items-center gap-2 mb-3 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30 animate-pulse">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-yellow-500 tracking-wider">
                YENİ REKOR!
              </span>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
          )}

          {earnedShards > 0 && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-full border border-cyan-500/30">
              <Gem className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 tracking-wider">
                +{earnedShards} SHARDS
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => handleButtonClick(onRestart)}
              className="group flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-white to-gray-200 text-black font-bold text-sm tracking-widest active:scale-[0.98] transition-all duration-300 rounded-lg"
            >
              <RotateCcw
                size={18}
                className="group-hover:rotate-180 transition-transform duration-500"
              />
              TEKRAR OYNA
            </button>
            <button
              onClick={() => handleButtonClick(onMainMenu)}
              className="group flex items-center justify-center gap-2 w-full py-3 border border-white/30 text-white font-bold text-sm tracking-widest hover:bg-white/10 transition-all duration-300 rounded-lg"
            >
              <Home size={18} />
              ANA MENÜ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GameUI;
