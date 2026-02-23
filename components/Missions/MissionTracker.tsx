/**
 * MissionTracker — In-game compact HUD (max 2 missions)
 *
 * Sits on the left side during PLAYING state. Shows the 2 missions
 * closest to completion with tiny progress bars. Tappable to expand
 * to DailyMissionsPanel.
 *
 * Animations:
 *   • Staggered slide-in from left with spring bounce
 *   • Progress bars animate on change
 *   • Completion glow flash
 *   • Subtle breathing pulse on the container
 */

import { Award, Crown, Swords, Target, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import type { Mission } from '../../types';

/* ── Keyframe styles ─────────────────────────────────────────────────────── */
const TRACKER_STYLES = `
@keyframes trackerSlideIn {
  0%   { transform: translateX(-100%) scale(0.9); opacity: 0; }
  60%  { transform: translateX(6px) scale(1.02); opacity: 1; }
  80%  { transform: translateX(-2px) scale(0.99); }
  100% { transform: translateX(0) scale(1); opacity: 1; }
}
@keyframes trackerRowIn {
  0%   { transform: translateX(-20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes trackerCompletePulse {
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  50%  { box-shadow: 0 0 12px 4px rgba(34,197,94,0.3); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
}
@keyframes trackerBreathing {
  0%, 100% { border-color: rgba(255,255,255,0.06); }
  50%      { border-color: rgba(6,182,212,0.15); }
}
`;

/* ========================================================================== */
/*  Props                                                                      */
/* ========================================================================== */

interface MissionTrackerProps {
  /** Up to 2 missions closest to completion */
  missions: Mission[];
  /** Called when user taps the tracker to expand */
  onTap?: () => void;
}

/* ========================================================================== */
/*  Mini slot icon                                                             */
/* ========================================================================== */

function SlotIcon({ mission }: { mission: Mission }) {
  const slot = (mission as any).slot as string | undefined;
  const cls = 'w-3.5 h-3.5';
  if (mission.category === 'WEEKLY') return <Award className={`${cls} text-purple-400`} />;
  switch (slot) {
    case 'COMBAT':
      return <Swords className={`${cls} text-red-400`} />;
    case 'EXPLORER':
      return <Target className={`${cls} text-cyan-400`} />;
    case 'MASTER':
      return <Crown className={`${cls} text-amber-400`} />;
    default:
      return <Zap className={`${cls} text-cyan-400`} />;
  }
}

/* ========================================================================== */
/*  Single tracker row                                                         */
/* ========================================================================== */

const TrackerRow: React.FC<{
  mission: Mission;
  index: number;
}> = ({ mission, index }) => {
  const pct = Math.min((mission.progress / mission.goal) * 100, 100);
  const isComplete = mission.completed;
  const prevPctRef = useRef(pct);
  const [flash, setFlash] = useState(false);

  // Flash on completion
  useEffect(() => {
    if (isComplete && prevPctRef.current < 100) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 800);
      return () => clearTimeout(t);
    }
    prevPctRef.current = pct;
  }, [isComplete, pct]);

  const slotColor = (() => {
    if (mission.category === 'WEEKLY') return 'purple';
    const slot = (mission as any).slot as string | undefined;
    if (slot === 'COMBAT') return 'red';
    if (slot === 'MASTER') return 'amber';
    return 'cyan';
  })();

  const barColorMap: Record<string, string> = {
    cyan: 'bg-cyan-400',
    red: 'bg-red-400',
    amber: 'bg-amber-400',
    purple: 'bg-purple-400',
  };

  return (
    <div
      className={`flex items-center gap-1.5 ${flash ? '' : ''}`}
      style={{
        animation: `trackerRowIn 0.35s ease-out ${0.15 + index * 0.12}s both`,
        ...(flash ? { animation: 'trackerCompletePulse 0.8s ease-out' } : {}),
      }}
    >
      <SlotIcon mission={mission} />
      <div className="flex-1 min-w-0">
        <div className="text-[9px] text-white/70 truncate leading-none mb-0.5 font-medium">
          {mission.title}
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isComplete ? 'bg-green-400' : (barColorMap[slotColor] || 'bg-cyan-400/80')
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-[8px] text-white/50 font-mono tabular-nums whitespace-nowrap">
        {mission.progress}/{mission.goal}
      </span>
    </div>
  );
};

/* ========================================================================== */
/*  Main Tracker                                                               */
/* ========================================================================== */

const MissionTracker: React.FC<MissionTrackerProps> = ({ missions, onTap }) => {
  const stylesInjected = useRef(false);

  useEffect(() => {
    if (!stylesInjected.current) {
      const s = document.createElement('style');
      s.textContent = TRACKER_STYLES;
      document.head.appendChild(s);
      stylesInjected.current = true;
    }
  }, []);

  if (missions.length === 0) return null;

  return (
    <button
      onClick={onTap}
      className="fixed left-2 top-1/3 w-[148px] p-2 rounded-xl bg-black/65 backdrop-blur-sm border border-white/8 hover:bg-black/75 hover:border-cyan-500/25 active:scale-95 z-20 transition-colors duration-200"
      style={{
        paddingTop: 'max(8px, var(--safe-top, 0px))',
        animation: 'trackerSlideIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both, trackerBreathing 4s ease-in-out 2s infinite',
      }}
    >
      <div className="space-y-2">
        {missions.map((m, i) => (
          <TrackerRow key={m.id} mission={m} index={i} />
        ))}
      </div>
    </button>
  );
};

export default MissionTracker;
