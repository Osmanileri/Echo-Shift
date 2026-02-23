/**
 * MissionBanner — In-game slide-down notification when a mission completes
 *
 * Professional animated banner with:
 *   • Spring-physics slide from top
 *   • Glow pulse + shimmer sweep
 *   • Reward counter pop
 *   • Smooth exit to top
 */

import { CheckCircle, Sparkles, Star } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { Mission } from '../../types';

/* ── keyframe styles injected once ───────────────────────────────────────── */
const BANNER_STYLES = `
@keyframes bannerSlideIn {
  0%   { transform: translateY(-120%) scale(0.8); opacity: 0; }
  60%  { transform: translateY(8%) scale(1.02); opacity: 1; }
  80%  { transform: translateY(-2%) scale(0.99); }
  100% { transform: translateY(0%) scale(1); opacity: 1; }
}
@keyframes bannerSlideOut {
  0%   { transform: translateY(0%) scale(1); opacity: 1; }
  100% { transform: translateY(-130%) scale(0.85); opacity: 0; }
}
@keyframes bannerGlow {
  0%, 100% { box-shadow: 0 4px 30px var(--glow-color); }
  50%      { box-shadow: 0 4px 50px var(--glow-color), 0 0 80px var(--glow-color); }
}
@keyframes shimmerSweep {
  0%   { transform: translateX(-100%) skewX(-15deg); }
  100% { transform: translateX(200%) skewX(-15deg); }
}
@keyframes iconPop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes rewardFloat {
  0%   { transform: translateY(8px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes starBurst {
  0%   { transform: scale(0) rotate(0deg); opacity: 1; }
  70%  { opacity: 1; }
  100% { transform: scale(1.8) rotate(180deg); opacity: 0; }
}
`;

interface MissionBannerProps {
  /** The mission that was just completed */
  mission: Mission;
  /** Called when the banner auto-dismisses */
  onDismiss: () => void;
}

const MissionBanner: React.FC<MissionBannerProps> = ({ mission, onDismiss }) => {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const stylesInjected = useRef(false);

  /* inject keyframes once */
  useEffect(() => {
    if (!stylesInjected.current) {
      const style = document.createElement('style');
      style.textContent = BANNER_STYLES;
      document.head.appendChild(style);
      stylesInjected.current = true;
    }
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 30);
    const t2 = setTimeout(() => setPhase('exit'), 2800);
    const t3 = setTimeout(() => onDismiss(), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDismiss]);

  const isWeekly = mission.category === 'WEEKLY';
  const glowRGB = isWeekly ? '168,85,247' : '34,197,94';
  const accentFrom = isWeekly ? 'from-purple-900/95' : 'from-green-900/95';
  const accentTo = isWeekly ? 'to-violet-900/95' : 'to-emerald-900/95';
  const borderColor = isWeekly ? 'border-purple-400/50' : 'border-green-400/50';
  const iconBg = isWeekly ? 'bg-purple-500/25 ring-purple-400/60' : 'bg-green-500/25 ring-green-400/60';
  const iconColor = isWeekly ? 'text-purple-300' : 'text-green-300';
  const textColor = isWeekly ? 'text-purple-300' : 'text-green-300';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingTop: 'max(12px, var(--safe-top, 0px))' }}
    >
      <div
        className={`
          relative mx-4 px-5 py-3.5 rounded-2xl overflow-hidden
          bg-gradient-to-r ${accentFrom} ${accentTo}
          border ${borderColor} backdrop-blur-lg
          flex items-center gap-3 max-w-sm w-full
        `}
        style={{
          '--glow-color': `rgba(${glowRGB},0.35)`,
          animation:
            phase === 'exit'
              ? 'bannerSlideOut 0.5s cubic-bezier(0.6,0,1,1) forwards'
              : 'bannerSlideIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards, bannerGlow 2s ease-in-out infinite 0.6s',
        } as React.CSSProperties}
      >
        {/* Shimmer sweep */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            animation: 'shimmerSweep 1.2s ease-in-out 0.4s',
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)`,
            animationFillMode: 'both',
          }}
        />

        {/* Star burst particles behind icon */}
        {phase === 'show' && [...Array(4)].map((_, i) => (
          <Star
            key={i}
            className={`absolute ${iconColor} w-3 h-3`}
            style={{
              left: 22 + Math.cos((i * Math.PI) / 2) * 16,
              top: '50%',
              marginTop: Math.sin((i * Math.PI) / 2) * 16 - 6,
              animation: `starBurst 0.8s ease-out ${0.3 + i * 0.08}s both`,
            }}
          />
        ))}

        {/* Icon circle */}
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg} ring-2`}
          style={{ animation: 'iconPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}
        >
          <CheckCircle className={`w-6 h-6 ${iconColor}`} />
        </div>

        {/* Text */}
        <div
          className="flex-1 min-w-0"
          style={{ animation: 'rewardFloat 0.4s ease-out 0.2s both' }}
        >
          <div className="text-white font-bold text-sm truncate drop-shadow-lg">{mission.title}</div>
          <div className={`${textColor} text-xs font-bold tracking-wider flex items-center gap-1`}>
            <Sparkles className="w-3 h-3 animate-pulse" />
            GÖREV TAMAMLANDI!
          </div>
        </div>

        {/* Reward peek */}
        <div
          className="flex-shrink-0 text-right"
          style={{ animation: 'rewardFloat 0.4s ease-out 0.35s both' }}
        >
          {mission.rewards.xp > 0 && (
            <div className="text-yellow-400 text-xs font-bold drop-shadow-lg">+{mission.rewards.xp} XP</div>
          )}
          <div className="text-cyan-400 text-[11px] font-bold drop-shadow-lg">+{mission.rewards.shards} 💎</div>
        </div>
      </div>
    </div>
  );
};

export default MissionBanner;
