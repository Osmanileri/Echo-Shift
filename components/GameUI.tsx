import {
    ArrowRightLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Gem,
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
import React, { useEffect, useRef, useState } from "react";
import { ZONES, ZoneConfig, ZoneId } from "../data/zones";
import * as AudioSystem from "../systems/audioSystem";
import { getHapticSystem } from "../systems/hapticSystem";
import { GameState } from "../types";
import { ZoneUnlockModal } from "./Zones/ZoneUnlockModal";

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
  selectedZoneId?: ZoneId;
  unlockedZones?: ZoneId[];
  onSelectZone?: (zoneId: ZoneId) => void;
  onUnlockZone?: (zoneId: ZoneId, cost: number) => boolean;
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
  selectedZoneId = "sub-bass",
  unlockedZones = ["sub-bass"],
  onSelectZone,
  onUnlockZone,
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
}) => {
  const [showContent, setShowContent] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockTargetZone, setUnlockTargetZone] = useState<ZoneConfig | null>(
    null
  );
  const zoneScrollRef = useRef<HTMLDivElement>(null);
  
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
  useEffect(() => {
    if (
      gameState === GameState.MENU &&
      zoneScrollRef.current &&
      selectedZoneId
    ) {
      const container = zoneScrollRef.current;
      const selectedIndex = ZONES.findIndex((z) => z.id === selectedZoneId);
      if (selectedIndex >= 0) {
        const cardWidth = 140 + 12; // card width + gap
        const containerWidth = container.offsetWidth;
        const scrollPosition =
          selectedIndex * cardWidth - containerWidth / 2 + 140 / 2;
        setTimeout(() => {
          container.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: "smooth",
          });
        }, 400);
      }
    }
  }, [gameState, selectedZoneId]);

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
    return (
      <>
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10">
          {/* Campaign Update v2.5 - Distance Mode HUD - Requirements 6.1, 6.2, 6.3, 6.4 */}
          {distanceMode ? (
            <div className="flex flex-col items-start">
              {/* Distance Counter - Requirements 6.1 */}
              <span className="text-3xl md:text-4xl font-black text-white mix-blend-difference tracking-widest drop-shadow-lg">
                {Math.floor(currentDistance)}m
              </span>
              <span className="text-[10px] md:text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">
                Mesafe
              </span>
              {/* Distance Bar - Requirements 6.2, 6.3, 6.4 */}
              <div className="mt-2 w-32 md:w-40">
                <div 
                  className={`relative h-2 bg-white/10 rounded-full overflow-hidden border border-white/20 ${
                    isNearFinish ? 'animate-pulse shadow-[0_0_10px_rgba(0,240,255,0.5)]' : ''
                  }`}
                >
                  {/* Progress fill */}
                  <div 
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                      isNearFinish 
                        ? 'bg-gradient-to-r from-cyan-400 to-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.6)]' 
                        : 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                  {/* Position indicator */}
                  <div 
                    className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg transition-all duration-300 ${
                      isNearFinish ? 'bg-cyan-300 animate-ping' : 'bg-white'
                    }`}
                    style={{ left: `calc(${Math.min(100, progressPercent)}% - 6px)` }}
                  />
                </div>
                {/* Distance labels - Requirements 6.3 */}
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-white/40 font-mono">0m</span>
                  <span className={`text-[8px] font-mono ${isNearFinish ? 'text-cyan-400' : 'text-white/40'}`}>
                    {Math.floor(targetDistance)}m
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start">
              <span className="text-3xl md:text-4xl font-black text-white mix-blend-difference tracking-widest drop-shadow-lg">
                {score.toString().padStart(5, "0")}
              </span>
              <span className="text-[10px] md:text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">
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
            <span className="text-lg md:text-xl font-bold text-white mix-blend-difference opacity-50">
              {Math.floor(speed * 10)} km/h
            </span>
          </div>
        </div>

        {rhythmMultiplier > 1 && (
          <div className="absolute top-20 left-4 pointer-events-none z-10">
            <div
              className={`px-3 py-1.5 rounded-lg backdrop-blur-sm border ${
                rhythmMultiplier === 3
                  ? "bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                  : "bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              }`}
            >
              <span
                className={`text-xl md:text-2xl font-black tracking-wider ${
                  rhythmMultiplier === 3 ? "text-yellow-400" : "text-cyan-400"
                }`}
              >
                x{rhythmMultiplier}
              </span>
            </div>
          </div>
        )}

        <div className="absolute top-20 right-4 pointer-events-none z-10 flex flex-col gap-2 items-end">
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

        <div className="absolute bottom-6 right-6 pointer-events-none z-10 opacity-70">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-cyan-500/50 flex items-center justify-center bg-black/20 backdrop-blur-sm shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <ArrowRightLeft className="text-cyan-400 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold text-cyan-400 tracking-widest uppercase">
              Dokun: Değiştir
            </span>
          </div>
        </div>

        {slowMotionUsesRemaining > 0 && onActivateSlowMotion && (
          <div className="absolute bottom-6 left-6 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleButtonClick(onActivateSlowMotion);
              }}
              disabled={slowMotionActive}
              className={`pointer-events-auto flex flex-col items-center gap-2 transition-all duration-300 ${
                slowMotionActive ? "opacity-50" : "opacity-100 hover:scale-105"
              }`}
            >
              <div
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${
                  slowMotionActive
                    ? "border-purple-500 bg-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                    : "border-purple-500/50 bg-black/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:bg-purple-500/20"
                }`}
              >
                <Clock
                  className={`w-6 h-6 md:w-8 md:h-8 ${
                    slowMotionActive
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
    const unlockedSet = new Set(unlockedZones);

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
          className={`absolute inset-0 flex flex-col px-4 py-6 transition-all duration-700 ${
            showContent ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* ===== SETTINGS BUTTON (Top Right) ===== */}
          <div className="absolute top-4 right-4 z-30">
            <button
              onClick={() => {
                AudioSystem.playButtonClick();
                setShowSettings(!showSettings);
              }}
              className={`p-2.5 rounded-full backdrop-blur-sm border transition-all duration-300 ${
                showSettings 
                  ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                  : 'bg-black/40 border-white/10 hover:bg-white/10'
              }`}
            >
              <Settings className={`w-5 h-5 transition-transform duration-300 ${
                showSettings ? 'text-cyan-400 rotate-90' : 'text-white/70'
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

          {/* ===== ZONE SELECTOR ===== */}
          <div className="w-full mb-4">
            <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mb-2 px-1">
              FREKANS SEÇ
            </p>
            <div
              ref={zoneScrollRef}
              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [-webkit-overflow-scrolling:touch] no-scrollbar"
            >
              {ZONES.map((zone) => {
                const isUnlocked = unlockedSet.has(zone.id);
                const isSelected = selectedZoneId === zone.id;
                const canAfford = echoShards >= zone.unlockCost;

                // Zone color mapping
                const zoneColors: Record<
                  ZoneId,
                  { bg: string; border: string; text: string }
                > = {
                  "sub-bass": {
                    bg: "from-blue-600/30 to-blue-900/20",
                    border: "border-blue-500/40",
                    text: "text-blue-300",
                  },
                  bass: {
                    bg: "from-purple-600/30 to-purple-900/20",
                    border: "border-purple-500/40",
                    text: "text-purple-300",
                  },
                  mid: {
                    bg: "from-green-600/30 to-green-900/20",
                    border: "border-green-500/40",
                    text: "text-green-300",
                  },
                  high: {
                    bg: "from-orange-600/30 to-orange-900/20",
                    border: "border-orange-500/40",
                    text: "text-orange-300",
                  },
                  ultra: {
                    bg: "from-red-600/30 to-red-900/20",
                    border: "border-red-500/40",
                    text: "text-red-300",
                  },
                };
                const colors = zoneColors[zone.id];

                return (
                  <button
                    key={zone.id}
                    onClick={() => {
                      if (isUnlocked) {
                        AudioSystem.playZoneSelect();
                        onSelectZone?.(zone.id);
                      } else {
                        AudioSystem.playButtonClick();
                        setUnlockTargetZone(zone);
                        setUnlockModalOpen(true);
                      }
                    }}
                    className={`relative snap-center flex-shrink-0 w-[140px] rounded-2xl overflow-hidden transition-all duration-300 ${
                      isSelected
                        ? `${colors.border} border-2 shadow-[0_0_25px_rgba(0,240,255,0.2)] scale-105`
                        : "border border-white/10"
                    } ${!isUnlocked ? "opacity-60 grayscale" : ""}`}
                  >
                    {/* Top gradient section */}
                    <div
                      className={`h-20 bg-gradient-to-b ${colors.bg} flex flex-col items-center justify-center relative`}
                    >
                      <p className="text-[8px] text-white/60 uppercase tracking-wider">
                        {zone.subtitle.split("/")[0]}
                      </p>
                      <h4
                        className={`text-lg font-black ${colors.text} tracking-widest uppercase`}
                      >
                        {zone.name}
                      </h4>

                      {isSelected && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30">
                          <span className="text-[7px] font-bold text-cyan-400">
                            SEÇİLİ
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom info section */}
                    <div className="bg-black/60 backdrop-blur-md p-3">
                      <p className="text-[8px] text-white/50 leading-relaxed line-clamp-2 mb-2">
                        {zone.description}
                      </p>
                      <div className="text-[8px] text-white/40 uppercase font-bold mb-1">
                        MODİFİLER:
                      </div>
                      <div className="flex flex-col gap-0.5 text-[9px] font-mono">
                        <span
                          className={
                            zone.modifiers.speedMultiplier > 1
                              ? "text-orange-300"
                              : "text-green-300"
                          }
                        >
                          - Hız x{zone.modifiers.speedMultiplier}
                        </span>
                        <span
                          className={
                            zone.modifiers.spawnRateMultiplier > 1
                              ? "text-orange-300"
                              : "text-green-300"
                          }
                        >
                          - Spawn x{zone.modifiers.spawnRateMultiplier}
                        </span>
                      </div>
                    </div>

                    {/* Lock overlay */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center">
                        <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
                          <Gem
                            className={`w-3.5 h-3.5 ${
                              canAfford ? "text-cyan-400" : "text-red-400"
                            }`}
                          />
                          <span
                            className={`text-sm font-bold ${
                              canAfford ? "text-cyan-400" : "text-red-400"
                            }`}
                          >
                            {zone.unlockCost}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
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

        {/* Zone Unlock Modal */}
        <ZoneUnlockModal
          isOpen={unlockModalOpen}
          zone={unlockTargetZone}
          balance={echoShards}
          playerLevel={syncRate}
          onClose={() => {
            setUnlockModalOpen(false);
            setUnlockTargetZone(null);
          }}
          onConfirmUnlock={(zone) => {
            if (!onUnlockZone) return;
            const ok = onUnlockZone(zone.id, zone.unlockCost);
            if (ok) {
              setUnlockModalOpen(false);
              setUnlockTargetZone(null);
            }
          }}
        />
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
