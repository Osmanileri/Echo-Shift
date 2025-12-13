import {
  ArrowRightLeft,
  ChevronDown,
  Clock,
  Gem,
  Home,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { ZONES, ZoneConfig, ZoneId } from "../data/zones";
import { GameState } from "../types";
import { ZoneSelector } from "./Zones/ZoneSelector";
import { ZoneUnlockModal } from "./Zones/ZoneUnlockModal";
// Haptic Feedback System Integration - Requirements 4.5
import { getHapticSystem } from "../systems/hapticSystem";

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
  // Shop System - Requirements 2.1
  onOpenShop?: () => void;
  // Daily Challenge System - Requirements 8.1, 8.4
  onOpenDailyChallenge?: () => void;
  // Rhythm System UI - Requirements 1.3, 1.4
  rhythmMultiplier?: number;
  rhythmStreak?: number;
  // Near Miss System UI - Requirements 3.7
  nearMissStreak?: number;
  // Echo Shards System - Requirements 1.1, 1.3, 1.4
  echoShards?: number;
  earnedShards?: number;
  // Zone System (Phase 2)
  selectedZoneId?: ZoneId;
  unlockedZones?: ZoneId[];
  onSelectZone?: (zoneId: ZoneId) => void;
  onUnlockZone?: (zoneId: ZoneId, cost: number) => boolean;
  // Slow Motion System - Requirements 6.4
  slowMotionUsesRemaining?: number;
  slowMotionActive?: boolean;
  onActivateSlowMotion?: () => void;
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
  onOpenDailyChallenge,
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
}) => {
  const [showContent, setShowContent] = useState(false);
  const [orbAnimation, setOrbAnimation] = useState(0);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [unlockTargetZone, setUnlockTargetZone] = useState<ZoneConfig | null>(
    null
  );

  // Haptic feedback helper for button presses - Requirements 4.5
  const handleButtonClick = (callback: () => void) => {
    getHapticSystem().trigger("selection");
    callback();
  };

  useEffect(() => {
    if (gameState === GameState.MENU) {
      setTimeout(() => setShowContent(true), 300);
      const interval = setInterval(() => {
        setOrbAnimation((prev) => (prev + 1) % 360);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  if (gameState === GameState.PLAYING) {
    return (
      <>
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10">
          <div className="flex flex-col items-start">
            <span className="text-3xl md:text-4xl font-black text-white mix-blend-difference tracking-widest drop-shadow-lg">
              {score.toString().padStart(5, "0")}
            </span>
            <span className="text-[10px] md:text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">
              Skor
            </span>
          </div>
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

        {/* Multiplier Indicator - Requirements 1.3, 1.4 */}
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

        {/* Streak Counters - Requirements 1.2, 3.7 */}
        <div className="absolute top-20 right-4 pointer-events-none z-10 flex flex-col gap-2 items-end">
          {/* Rhythm Streak - Requirements 1.2 */}
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

          {/* Near Miss Streak - Requirements 3.7 */}
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

        {/* Slow Motion Button - Requirements 6.4 */}
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

        {/* Slow Motion Active Overlay - Requirements 6.4 */}
        {slowMotionActive && (
          <div className="absolute inset-0 pointer-events-none z-5 border-4 border-purple-500/30 animate-pulse" />
        )}
      </>
    );
  }

  if (gameState === GameState.PAUSED) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md z-30 text-white px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 tracking-[0.2em] text-white/90 relative z-10">
          DURAKLADI
        </h2>
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-8"></div>

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

  if (gameState === GameState.MENU) {
    const orbY = Math.sin((orbAnimation * Math.PI) / 180) * 15;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-between bg-gradient-to-b from-black via-gray-950 to-black z-20 text-white overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-black"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-white/5"></div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

          {/* Floating particles - reduced for mobile */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>

        {/* Header Section - Compact for mobile */}
        <div
          className={`flex flex-col items-center pt-6 sm:pt-10 md:pt-16 transition-all duration-1000 ${
            showContent
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-10"
          }`}
        >
          {/* Logo - Smaller on mobile */}
          <div className="relative mb-2">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-[0.15em] sm:tracking-[0.2em] bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent drop-shadow-2xl">
              ECHO
            </h1>
            <div className="absolute -bottom-1 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
          </div>

          <p className="text-cyan-400 text-xs sm:text-sm tracking-[0.4em] font-light mb-3 animate-pulse">
            SHIFT
          </p>

          {/* High Score & Shards Row - Compact */}
          <div className="flex flex-wrap items-center justify-center gap-2 px-4">
            {highScore > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
                <Trophy className="w-3 h-3 text-yellow-500" />
                <span className="text-[10px] sm:text-xs text-white/70 tracking-wider">
                  {highScore}
                </span>
              </div>
            )}

            {/* Echo Shards Balance */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 rounded-full border border-cyan-500/30 backdrop-blur-sm">
              <Gem className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] sm:text-xs text-cyan-400 tracking-wider font-bold">
                {echoShards.toLocaleString()}
              </span>
            </div>

            {/* Shop Button */}
            {onOpenShop && (
              <button
                onClick={() => handleButtonClick(onOpenShop)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/20 hover:border-white/30 backdrop-blur-sm transition-colors"
              >
                <ShoppingBag className="w-3 h-3 text-white/70" />
                <span className="text-[10px] sm:text-xs text-white/70 tracking-wider font-medium">
                  MAĞAZA
                </span>
              </button>
            )}
          </div>

          {/* Daily Challenge Button */}
          {onOpenDailyChallenge && (
            <button
              onClick={() => handleButtonClick(onOpenDailyChallenge)}
              className="flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30 rounded-full border border-orange-500/30 hover:border-orange-500/50 backdrop-blur-sm transition-all"
            >
              <span className="text-sm">🔥</span>
              <span className="text-[10px] sm:text-xs text-orange-400 tracking-wider font-bold">
                GÜNLÜK MEYDAN OKUMA
              </span>
            </button>
          )}
        </div>

        {/* Center - Animated Demo - Compact */}
        <div
          className={`flex-1 flex flex-col items-center justify-center w-full max-w-sm px-4 transition-all duration-1000 delay-300 ${
            showContent ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
          {/* Interactive Demo - Smaller */}
          <div className="relative w-full h-32 sm:h-40 mb-4">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {/* Connector line */}
              <div
                className="absolute left-1/2 w-0.5 bg-gradient-to-b from-white via-gray-500 to-black rounded-full transition-all duration-300"
                style={{
                  height: "60px",
                  transform: `translateX(-50%) translateY(${orbY * 0.5}px)`,
                  top: "-30px",
                }}
              ></div>

              {/* White orb */}
              <div
                className="absolute w-6 h-6 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] border border-black/20 transition-all duration-300"
                style={{
                  left: "50%",
                  transform: `translateX(-50%) translateY(${-30 + orbY}px)`,
                }}
              ></div>

              {/* Black orb */}
              <div
                className="absolute w-6 h-6 bg-black rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/20 transition-all duration-300"
                style={{
                  left: "50%",
                  transform: `translateX(-50%) translateY(${30 + orbY}px)`,
                }}
              ></div>

              {/* Center glow */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(0,240,255,0.8)] animate-pulse"></div>
            </div>

            {/* Demo blocks - Smaller */}
            <div className="absolute right-6 top-2 w-6 h-14 bg-white/20 border border-white/30 rounded animate-pulse"></div>
            <div className="absolute right-6 bottom-2 w-6 h-12 bg-black border border-white/10 rounded animate-pulse delay-500"></div>
          </div>

          {/* Instructions - Compact */}
          <div className="w-full space-y-2">
            <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center flex-shrink-0">
                <ChevronDown className="w-4 h-4 text-white animate-bounce" />
              </div>
              <div>
                <p className="text-white font-semibold text-xs">KAYDIR</p>
                <p className="text-white/50 text-[10px]">
                  Yukarı ve aşağı hareket et
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-cyan-400 font-semibold text-xs">DOKUN</p>
                <p className="text-white/50 text-[10px]">
                  Topların yerini değiştir
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
              <div className="flex gap-0.5 w-8 h-8 items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-white border border-black/30"></div>
                <div className="w-3 h-3 rounded-full bg-black border border-white/30"></div>
              </div>
              <div>
                <p className="text-white font-semibold text-xs">RENK EŞLE</p>
                <p className="text-white/50 text-[10px]">
                  Aynı renkten geç, zıt renkten kaç
                </p>
              </div>
            </div>
          </div>

          {/* Zone Selector (Phase 2) */}
          <div className="w-full mt-4">
            <ZoneSelector
              zones={ZONES}
              selectedZoneId={selectedZoneId}
              unlockedZones={unlockedZones}
              balance={echoShards}
              onSelect={(id) => {
                if (!onSelectZone) return;
                handleButtonClick(() => onSelectZone(id));
              }}
              onUnlockRequest={(zone) => {
                setUnlockTargetZone(zone);
                setUnlockModalOpen(true);
              }}
            />
          </div>
        </div>

        {/* Bottom - Start Button - Compact */}
        <div
          className={`w-full px-4 pb-6 sm:pb-8 transition-all duration-1000 delay-500 ${
            showContent
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-10"
          }`}
        >
          <button
            onClick={() => handleButtonClick(onStart)}
            className="group relative w-full py-4 sm:py-5 bg-gradient-to-r from-white to-gray-200 text-black font-black text-lg sm:text-xl tracking-[0.2em] overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-[0.98] rounded-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative flex items-center justify-center gap-3">
              <Play
                size={22}
                fill="currentColor"
                className="group-hover:scale-110 transition-transform"
              />
              BAŞLA
            </span>
          </button>

          <p className="text-center text-white/30 text-[9px] sm:text-[10px] mt-3 tracking-wider">
            ÇUBUK UZAR • HIZ ARTAR • HAYATTA KAL
          </p>
        </div>

        {/* Zone Unlock Modal */}
        <ZoneUnlockModal
          isOpen={unlockModalOpen}
          zone={unlockTargetZone}
          balance={echoShards}
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

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 text-white overflow-hidden px-4">
        {/* Animated red background */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/80 via-black/90 to-black backdrop-blur-md"></div>

        {/* Glitch effect lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-0 w-full h-px bg-red-500/30 animate-pulse"></div>
          <div className="absolute top-1/3 left-0 w-full h-px bg-red-500/20 animate-pulse delay-100"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
          {/* Game Over Text - Smaller */}
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

          {/* Score Display - Compact */}
          <div className="flex flex-col items-center gap-1 mb-4 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm w-full">
            <span className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
              {score}
            </span>
            <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-[0.2em]">
              Final Skor
            </span>
          </div>

          {/* New High Score - Compact */}
          {score >= highScore && score > 0 && (
            <div className="flex items-center gap-2 mb-3 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30 animate-pulse">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-yellow-500 tracking-wider">
                YENİ REKOR!
              </span>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
          )}

          {/* Echo Shards Earned - Compact */}
          {earnedShards > 0 && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 rounded-full border border-cyan-500/30">
              <Gem className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 tracking-wider">
                +{earnedShards} SHARDS
              </span>
            </div>
          )}

          {/* Buttons - Compact */}
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
