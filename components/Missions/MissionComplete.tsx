/**
 * MissionComplete Component — Professional celebration modal
 *
 * Features:
 *   • Backdrop blur + fade
 *   • Modal scale-bounce entry with spring physics
 *   • Confetti particle burst (canvas-free, CSS-only)
 *   • Icon ring pulse + pop
 *   • Reward counters with count-up animation
 *   • Smooth exit scale-down on claim
 *   • Shimmer shine sweep across header
 *
 * Requirements: 2.5, 3.3
 */

import { CheckCircle, Gem, Sparkles, Star, Trophy, X, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { Mission } from '../../types';

/* ── Keyframe Styles ─────────────────────────────────────────────────────── */
const CELEBRATION_STYLES = `
@keyframes celebBackdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes celebModalIn {
  0%   { transform: scale(0.5) translateY(30px); opacity: 0; }
  50%  { transform: scale(1.04) translateY(-4px); opacity: 1; }
  75%  { transform: scale(0.98) translateY(1px); }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
@keyframes celebModalOut {
  0%   { transform: scale(1) translateY(0); opacity: 1; }
  100% { transform: scale(0.8) translateY(40px); opacity: 0; }
}
@keyframes celebIconRing {
  0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes celebIconPulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--ring-glow); }
  50%      { box-shadow: 0 0 30px 8px var(--ring-glow); }
}
@keyframes celebTitleIn {
  0%   { transform: translateY(15px) scale(0.9); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes celebRewardIn {
  0%   { transform: translateY(20px) scale(0.8); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes celebCountUp {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.15); }
  100% { transform: scale(1); }
}
@keyframes celebConfetti {
  0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translate(var(--cx), var(--cy)) rotate(var(--cr)) scale(0.3); opacity: 0; }
}
@keyframes celebShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes celebStarSpin {
  0%   { transform: scale(0) rotate(0deg); opacity: 0.8; }
  50%  { opacity: 1; }
  100% { transform: scale(1.5) rotate(360deg); opacity: 0; }
}
@keyframes celebBtnPulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--btn-glow); }
  50%      { box-shadow: 0 0 20px 4px var(--btn-glow); }
}
`;

interface MissionCompleteProps {
  mission: Mission;
  onClose: () => void;
  onClaim: () => void;
}

/* ── Confetti particle ───────────────────────────────────────────────────── */
const CONFETTI_COLORS = ['#06b6d4', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6'];

function ConfettiPiece({ index }: { index: number }) {
  const angle = (index / 24) * 360;
  const radius = 80 + Math.random() * 120;
  const cx = Math.cos((angle * Math.PI) / 180) * radius;
  const cy = Math.sin((angle * Math.PI) / 180) * radius - 40;
  const rotation = Math.random() * 720 - 360;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 4 + Math.random() * 6;
  const delay = Math.random() * 0.3;
  const isCircle = index % 3 === 0;

  return (
    <div
      className="absolute left-1/2 top-1/3 pointer-events-none"
      style={{
        width: size,
        height: isCircle ? size : size * 2.5,
        backgroundColor: color,
        borderRadius: isCircle ? '50%' : '2px',
        '--cx': `${cx}px`,
        '--cy': `${cy}px`,
        '--cr': `${rotation}deg`,
        animation: `celebConfetti 1s ease-out ${delay}s both`,
      } as React.CSSProperties}
    />
  );
}

/* ── Orbiting star ───────────────────────────────────────────────────────── */
function OrbitStar({ index }: { index: number }) {
  const angle = (index / 6) * 360;
  const x = Math.cos((angle * Math.PI) / 180) * 50;
  const y = Math.sin((angle * Math.PI) / 180) * 50;
  const colors = ['text-yellow-400', 'text-cyan-400', 'text-purple-400', 'text-green-400', 'text-pink-400', 'text-amber-400'];

  return (
    <Star
      className={`absolute w-3 h-3 ${colors[index % colors.length]}`}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(33% + ${y}px)`,
        animation: `celebStarSpin 1.2s ease-out ${0.2 + index * 0.1}s both`,
      }}
    />
  );
}

/* ── Count-up number ─────────────────────────────────────────────────────── */
function CountUpNumber({ value, delay, className }: { value: number; delay: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const startTime = performance.now() + delay * 1000;
    const duration = 600;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed < 0) { rafRef.current = requestAnimationFrame(animate); return; }
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, delay]);

  return <span className={className}>+{display}</span>;
}

/* ── Main Component ──────────────────────────────────────────────────────── */

const MissionComplete: React.FC<MissionCompleteProps> = ({ mission, onClose, onClaim }) => {
  const [showRewards, setShowRewards] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [exiting, setExiting] = useState(false);
  const stylesInjected = useRef(false);

  useEffect(() => {
    if (!stylesInjected.current) {
      const s = document.createElement('style');
      s.textContent = CELEBRATION_STYLES;
      document.head.appendChild(s);
      stylesInjected.current = true;
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowRewards(true), 700);
    return () => clearTimeout(t);
  }, []);

  const handleClaim = () => {
    setClaimed(true);
    onClaim();
    setTimeout(() => {
      setExiting(true);
      setTimeout(() => onClose(), 400);
    }, 600);
  };

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose(), 400);
  };

  const isMarathon = mission.category === 'MARATHON' || mission.category === 'WEEKLY';
  const isSoundCheck = mission.category === 'SOUND_CHECK';
  const isWeekly = mission.category === 'WEEKLY';

  // Color scheme
  const scheme = isMarathon
    ? { from: 'from-purple-900/95', border: 'border-purple-500/30', accent: 'text-purple-400', bg: 'bg-purple-500/20', ring: 'ring-purple-500/50', glow: 'rgba(168,85,247,0.3)', btnGlow: 'rgba(168,85,247,0.4)', btnFrom: 'from-purple-500', btnTo: 'to-purple-400' }
    : isSoundCheck
    ? { from: 'from-green-900/95', border: 'border-green-500/30', accent: 'text-green-400', bg: 'bg-green-500/20', ring: 'ring-green-500/50', glow: 'rgba(34,197,94,0.3)', btnGlow: 'rgba(34,197,94,0.4)', btnFrom: 'from-green-500', btnTo: 'to-green-400' }
    : { from: 'from-cyan-900/95', border: 'border-cyan-500/30', accent: 'text-cyan-400', bg: 'bg-cyan-500/20', ring: 'ring-cyan-500/50', glow: 'rgba(6,182,212,0.3)', btnGlow: 'rgba(6,182,212,0.4)', btnFrom: 'from-cyan-500', btnTo: 'to-cyan-400' };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        paddingTop: 'max(1rem, var(--safe-top, 0px))',
        paddingBottom: 'max(1rem, var(--safe-bottom, 0px))',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={handleClose}
        style={{ animation: 'celebBackdropIn 0.3s ease-out forwards' }}
      />

      {/* Confetti burst */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(24)].map((_, i) => <ConfettiPiece key={i} index={i} />)}
      </div>

      {/* Orbiting stars */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => <OrbitStar key={i} index={i} />)}
      </div>

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm rounded-2xl border overflow-hidden bg-gradient-to-b ${scheme.from} to-black ${scheme.border}`}
        style={{
          animation: exiting
            ? 'celebModalOut 0.35s ease-in forwards'
            : 'celebModalIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'celebShimmer 4s ease-in-out 1s infinite',
          }}
        />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2.5 hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-white/50 hover:text-white" />
        </button>

        {/* Header with icon */}
        <div className="relative pt-8 pb-4 text-center">
          <div
            className={`inline-flex p-4 rounded-full mb-4 ${scheme.bg} ring-2 ${scheme.ring}`}
            style={{
              '--ring-glow': scheme.glow,
              animation: 'celebIconRing 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, celebIconPulse 2s ease-in-out 0.8s infinite',
            } as React.CSSProperties}
          >
            {isMarathon ? (
              <Trophy className={`w-10 h-10 ${scheme.accent}`} />
            ) : (
              <CheckCircle className={`w-10 h-10 ${scheme.accent}`} />
            )}
          </div>

          <h2
            className={`text-2xl font-black tracking-wider mb-1 ${scheme.accent}`}
            style={{ animation: 'celebTitleIn 0.5s ease-out 0.35s both' }}
          >
            {isWeekly ? 'HAFTALIK GÖREV TAMAMLANDI!' :
             isMarathon ? 'MARATON TAMAMLANDI!' :
             'GÖREV TAMAMLANDI!'}
          </h2>

          <p
            className="text-white/70 text-sm font-medium"
            style={{ animation: 'celebTitleIn 0.5s ease-out 0.45s both' }}
          >
            {mission.title}
          </p>
        </div>

        {/* Rewards Section */}
        <div
          className="p-6 pt-2"
          style={{
            animation: showRewards ? 'celebRewardIn 0.5s ease-out forwards' : 'none',
            opacity: showRewards ? 1 : 0,
          }}
        >
          <div className="text-center mb-4">
            <span className="text-xs text-white/50 tracking-widest uppercase">
              Kazanılan Ödüller
            </span>
          </div>

          <div className="flex items-center justify-center gap-6">
            {/* XP Reward */}
            {mission.rewards.xp > 0 && (
              <div
                className="text-center"
                style={{ animation: showRewards ? 'celebRewardIn 0.4s ease-out 0.1s both' : 'none' }}
              >
                <div className={`p-3 rounded-xl mb-2 ${scheme.bg}`}>
                  <Zap className={`w-8 h-8 ${scheme.accent}`} />
                </div>
                <p className={`text-2xl font-black ${scheme.accent}`}
                   style={{ animation: showRewards ? 'celebCountUp 0.3s ease-out 0.9s both' : 'none' }}>
                  <CountUpNumber value={mission.rewards.xp} delay={0.8} />
                </p>
                <p className="text-xs text-white/50">XP</p>
              </div>
            )}

            {/* Shards Reward */}
            {mission.rewards.shards > 0 && (
              <div
                className="text-center"
                style={{ animation: showRewards ? 'celebRewardIn 0.4s ease-out 0.25s both' : 'none' }}
              >
                <div className={`p-3 rounded-xl mb-2 ${scheme.bg}`}>
                  <Gem className={`w-8 h-8 ${scheme.accent}`} />
                </div>
                <p className={`text-2xl font-black ${scheme.accent}`}
                   style={{ animation: showRewards ? 'celebCountUp 0.3s ease-out 1.1s both' : 'none' }}>
                  <CountUpNumber value={mission.rewards.shards} delay={1.0} />
                </p>
                <p className="text-xs text-white/50">Parça</p>
              </div>
            )}

            {/* Cosmetic Reward (Marathon) */}
            {mission.rewards.cosmetic && (
              <div
                className="text-center"
                style={{ animation: showRewards ? 'celebRewardIn 0.4s ease-out 0.4s both' : 'none' }}
              >
                <div className="p-3 rounded-xl mb-2 bg-gradient-to-br from-purple-500/30 to-pink-500/30 ring-1 ring-purple-400/50">
                  <Sparkles className="w-8 h-8 text-purple-300" />
                </div>
                <p className="text-lg font-bold text-purple-300">İz</p>
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
                ? 'bg-white/10 text-white/30 cursor-not-allowed scale-95'
                : `bg-gradient-to-r ${scheme.btnFrom} ${scheme.btnTo} text-black hover:scale-[1.02] active:scale-[0.98]`
            }`}
            style={{
              '--btn-glow': scheme.btnGlow,
              animation: !claimed && showRewards ? 'celebBtnPulse 2s ease-in-out 1.5s infinite' : 'none',
            } as React.CSSProperties}
          >
            {claimed ? '✓ ALINDI!' : 'ÖDÜLLERİ AL'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissionComplete;
