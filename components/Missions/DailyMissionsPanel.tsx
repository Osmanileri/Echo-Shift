/**
 * DailyMissionsPanel — Unified daily missions panel (replaces RitualsPanel)
 *
 * Shows:
 *   • 3 daily mission cards (COMBAT / EXPLORER / MASTER) with progress bars
 *   • Daily bonus bar (complete all 3 → bonus reward)
 *   • 1 weekly mission card
 *   • Countdown to next reset
 *   • Sound Check missions if not yet completed
 *
 * Professional enter/exit animations:
 *   • Backdrop fade-in/out
 *   • Panel scale-up from 0.85 + slide-up with spring overshoot
 *   • Cards stagger fade-in
 *   • Claim overlays with glow pulse
 */

import {
    Award,
    CheckCircle,
    Circle,
    Clock,
    Crown,
    Gem,
    Gift,
    Shield,
    Sparkles,
    Swords,
    Target,
    X,
    Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DAILY_BONUS_REWARD } from '../../data/missionPool';
import AudioSystem from '../../systems/audioSystem';
import { getHapticSystem } from '../../systems/hapticSystem';
import type { Mission, MissionState } from '../../types';

/* ── Keyframe styles ─────────────────────────────────────────────────────── */
const PANEL_STYLES = `
@keyframes panelBackdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes panelBackdropOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}
@keyframes panelSlideIn {
  0%   { transform: translateY(40px) scale(0.88); opacity: 0; }
  60%  { transform: translateY(-6px) scale(1.01); opacity: 1; }
  80%  { transform: translateY(2px) scale(0.995); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes panelSlideOut {
  0%   { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(50px) scale(0.9); opacity: 0; }
}
@keyframes cardStagger {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}
@keyframes claimGlow {
  0%, 100% { box-shadow: 0 0 12px rgba(34,197,94,0.3); }
  50%      { box-shadow: 0 0 25px rgba(34,197,94,0.5), 0 0 50px rgba(34,197,94,0.15); }
}
@keyframes headerShine {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

/* ========================================================================== */
/*  Props                                                                      */
/* ========================================================================== */

interface DailyMissionsPanelProps {
  /** Current unified mission state */
  missionState: MissionState;
  /** Callback when claiming a single mission reward */
  onClaimMission: (missionId: string) => void;
  /** Callback when claiming daily bonus */
  onClaimBonus: () => void;
  /** Close the panel */
  onClose: () => void;
  /** When true, plays exit animation then calls onClose */
  isClosing?: boolean;
}

/* ========================================================================== */
/*  Slot helpers                                                               */
/* ========================================================================== */

const SLOT_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  COMBAT: {
    icon: <Swords className="w-5 h-5" />,
    color: 'red',
    label: 'SAVAŞ',
  },
  EXPLORER: {
    icon: <Target className="w-5 h-5" />,
    color: 'cyan',
    label: 'KEŞİF',
  },
  MASTER: {
    icon: <Crown className="w-5 h-5" />,
    color: 'amber',
    label: 'USTA',
  },
};

function getSlotMeta(mission: Mission) {
  const slot = (mission as any).slot as string | undefined;
  return slot && SLOT_META[slot] ? SLOT_META[slot] : { icon: <Zap className="w-5 h-5" />, color: 'cyan', label: '' };
}

const DIFF_COLORS: Record<string, string> = {
  easy: 'text-green-400 border-green-400/30 bg-green-400/10',
  medium: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  hard: 'text-red-400 border-red-400/30 bg-red-400/10',
};

/* ========================================================================== */
/*  Progress Bar                                                               */
/* ========================================================================== */

const ProgressBar: React.FC<{
  current: number;
  goal: number;
  completed: boolean;
  color?: string;
}> = ({ current, goal, completed, color = 'cyan' }) => {
  const pct = Math.min((current / goal) * 100, 100);
  const gradientMap: Record<string, string> = {
    cyan: 'from-cyan-500 to-cyan-400',
    red: 'from-red-500 to-red-400',
    amber: 'from-amber-500 to-amber-400',
    purple: 'from-purple-500 to-purple-400',
    green: 'from-green-500 to-green-400',
  };
  const gradient = completed ? 'from-green-500 to-green-400' : (gradientMap[color] || gradientMap.cyan);

  return (
    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-700 ease-out bg-gradient-to-r ${gradient}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

/* ========================================================================== */
/*  Mission Card                                                               */
/* ========================================================================== */

const MissionCard: React.FC<{
  mission: Mission;
  onClaim: (id: string) => void;
}> = ({ mission, onClaim }) => {
  const meta = getSlotMeta(mission);
  const diff = mission.difficulty || 'medium';
  const canClaim = mission.completed && !mission.claimed;
  const isClaimed = mission.claimed;

  const colorVars: Record<string, { border: string; bg: string; text: string; glow: string }> = {
    red: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400', glow: 'shadow-[0_0_12px_rgba(239,68,68,0.2)]' },
    cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-400', glow: 'shadow-[0_0_12px_rgba(6,182,212,0.2)]' },
    amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]' },
    purple: { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.2)]' },
    green: { border: 'border-green-500/30', bg: 'bg-green-500/10', text: 'text-green-400', glow: 'shadow-[0_0_12px_rgba(34,197,94,0.2)]' },
  };
  const cv = colorVars[meta.color] || colorVars.cyan;

  return (
    <div
      className={`relative p-4 border rounded-xl transition-all duration-300 ${
        isClaimed
          ? 'bg-gray-900/30 border-gray-700/30 opacity-60'
          : mission.completed
          ? `${cv.bg} ${cv.border} ${cv.glow}`
          : `bg-gray-900/50 ${cv.border} hover:${cv.bg}`
      }`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`${cv.text}`}>{meta.icon}</div>
          <span className={`font-bold tracking-wide text-sm ${mission.completed ? 'text-green-400' : 'text-white'}`}>
            {mission.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {mission.difficulty && (
            <span className={`text-[10px] px-1.5 py-0.5 border rounded font-bold ${DIFF_COLORS[diff]}`}>
              {diff.toUpperCase()}
            </span>
          )}
          {mission.completed ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <Circle className="w-5 h-5 text-gray-600" />
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-xs mb-3 leading-relaxed">
        {mission.icon && <span className="mr-1">{mission.icon}</span>}
        {mission.description}
      </p>

      {/* Progress */}
      <ProgressBar
        current={mission.progress}
        goal={mission.goal}
        completed={mission.completed}
        color={meta.color}
      />

      <div className="flex items-center justify-between mt-2">
        <span className="text-gray-500 text-xs font-mono tabular-nums">
          {mission.progress}/{mission.goal}
        </span>
        <div className="flex items-center gap-2">
          {mission.rewards.xp > 0 && (
            <div className="flex items-center gap-0.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold">+{mission.rewards.xp}</span>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <Gem className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400 text-xs font-bold">+{mission.rewards.shards}</span>
          </div>
        </div>
      </div>

      {/* Claim button overlay */}
      {canClaim && (
        <button
          onClick={() => {
            AudioSystem.playButtonClick();
            getHapticSystem().trigger('selection');
            onClaim(mission.id);
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl hover:bg-black/70 active:scale-[0.98]"
          style={{ animation: 'cardStagger 0.3s ease-out both' }}
        >
          <div
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-400 rounded-lg text-black font-black text-xs tracking-[0.15em]"
            style={{ animation: 'claimGlow 1.5s ease-in-out infinite' }}
          >
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
            ÖDÜLÜ AL
          </div>
        </button>
      )}
    </div>
  );
};

/* ========================================================================== */
/*  Weekly Mission Card                                                        */
/* ========================================================================== */

const WeeklyCard: React.FC<{
  mission: Mission;
  onClaim: (id: string) => void;
}> = ({ mission, onClaim }) => {
  const canClaim = mission.completed && !mission.claimed;

  return (
    <div className={`relative p-4 border rounded-xl transition-all duration-300 ${
      mission.completed
        ? 'bg-purple-500/10 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
        : 'bg-gray-900/50 border-purple-500/20 hover:border-purple-500/40'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-400" />
          <span className="font-bold tracking-wide text-sm text-white">
            {mission.title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 border border-purple-500/40 bg-purple-500/10 rounded text-purple-400 font-bold">
            HAFTALIK
          </span>
        </div>
        {mission.completed ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <Circle className="w-5 h-5 text-gray-600" />
        )}
      </div>

      <p className="text-gray-400 text-xs mb-3">
        {mission.icon && <span className="mr-1">{mission.icon}</span>}
        {mission.description}
      </p>

      <ProgressBar current={mission.progress} goal={mission.goal} completed={mission.completed} color="purple" />
      <div className="flex items-center justify-between mt-2">
        <span className="text-gray-500 text-xs font-mono tabular-nums">{mission.progress}/{mission.goal}</span>
        <div className="flex items-center gap-2">
          {mission.rewards.xp > 0 && (
            <div className="flex items-center gap-0.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-yellow-400 text-xs font-bold">+{mission.rewards.xp}</span>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <Gem className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400 text-xs font-bold">+{mission.rewards.shards}</span>
          </div>
        </div>
      </div>

      {canClaim && (
        <button
          onClick={() => {
            AudioSystem.playButtonClick();
            getHapticSystem().trigger('selection');
            onClaim(mission.id);
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl hover:bg-black/70 active:scale-[0.98]"
          style={{ animation: 'cardStagger 0.3s ease-out both' }}
        >
          <div
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-violet-400 rounded-lg text-white font-black text-xs tracking-[0.15em]"
            style={{ animation: 'claimGlow 1.5s ease-in-out infinite', '--glow-color': 'rgba(168,85,247,0.4)' } as React.CSSProperties}
          >
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
            ÖDÜLÜ AL
          </div>
        </button>
      )}
    </div>
  );
};

/* ========================================================================== */
/*  Countdown Timer                                                            */
/* ========================================================================== */

const ResetCountdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-mono">
      <Clock className="w-3.5 h-3.5" />
      <span>Yenilenmeye <span className="text-cyan-400 tabular-nums">{timeLeft}</span> kaldı</span>
    </div>
  );
};

/* ========================================================================== */
/*  Daily Bonus Bar                                                            */
/* ========================================================================== */

const DailyBonusBar: React.FC<{
  completedCount: number;
  total: number;
  bonusClaimed: boolean;
  canClaim: boolean;
  onClaim: () => void;
}> = ({ completedCount, total, bonusClaimed, canClaim, onClaim }) => {
  return (
    <div className={`p-3 border rounded-xl transition-all duration-300 ${
      canClaim
        ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
        : bonusClaimed
        ? 'bg-gray-900/30 border-gray-700/30 opacity-60'
        : 'bg-gray-900/50 border-gray-700/40'
    }`}>
      {/* Mini progress dots */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Gift className={`w-5 h-5 ${canClaim ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`} />
          <span className="text-sm font-bold text-white">Günlük Bonus</span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full border transition-all ${
                i < completedCount
                  ? 'bg-green-400 border-green-400/50 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                  : 'bg-gray-800 border-gray-600/50'
              }`}
            />
          ))}
        </div>
      </div>

      {canClaim ? (
        <button
          onClick={() => {
            AudioSystem.playButtonClick();
            getHapticSystem().trigger('medium');
            onClaim();
          }}
          className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-black text-xs tracking-[0.15em] rounded-lg hover:shadow-[0_0_20px_rgba(255,200,0,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          BONUSU AL (+{DAILY_BONUS_REWARD.shards} Shard)
        </button>
      ) : bonusClaimed ? (
        <div className="text-center text-gray-500 text-xs font-mono py-1">
          ✓ Bonus alındı
        </div>
      ) : (
        <div className="text-center text-gray-500 text-xs py-1">
          {total - completedCount} görev daha tamamla → <span className="text-yellow-400 font-bold">+{DAILY_BONUS_REWARD.shards}</span>
        </div>
      )}
    </div>
  );
};

/* ========================================================================== */
/*  Main Panel                                                                 */
/* ========================================================================== */

const DailyMissionsPanel: React.FC<DailyMissionsPanelProps> = ({
  missionState,
  onClaimMission,
  onClaimBonus,
  onClose,
  isClosing = false,
}) => {
  const dailyMissions = missionState.daily.missions;
  const weeklyMission = missionState.weekly?.mission;
  const soundCheckMissions = !missionState.soundCheck.completed
    ? missionState.soundCheck.missions.filter(m => !m.claimed)
    : [];

  const completedCount = useMemo(
    () => dailyMissions.filter(m => m.completed).length,
    [dailyMissions]
  );

  const canClaimBonus = completedCount === dailyMissions.length
    && dailyMissions.length > 0
    && !missionState.daily.bonusClaimed;

  /* ── Animation state ────────────────────────────────────────────────── */
  const [animPhase, setAnimPhase] = useState<'entering' | 'open' | 'exiting'>('entering');
  const stylesInjected = useRef(false);

  useEffect(() => {
    if (!stylesInjected.current) {
      const s = document.createElement('style');
      s.textContent = PANEL_STYLES;
      document.head.appendChild(s);
      stylesInjected.current = true;
    }
  }, []);

  // Enter animation
  useEffect(() => {
    const t = setTimeout(() => setAnimPhase('open'), 50);
    return () => clearTimeout(t);
  }, []);

  // External close trigger
  useEffect(() => {
    if (isClosing && animPhase !== 'exiting') {
      setAnimPhase('exiting');
    }
  }, [isClosing, animPhase]);

  const handleRequestClose = useCallback(() => {
    if (animPhase === 'exiting') return;
    setAnimPhase('exiting');
    setTimeout(() => onClose(), 350);
  }, [animPhase, onClose]);

  // Total card count for stagger delay
  const totalCards = soundCheckMissions.length + dailyMissions.length + (weeklyMission ? 1 : 0) + (dailyMissions.length > 0 ? 1 : 0);

  let cardIndex = 0;
  const nextStagger = () => {
    const delay = 0.06 * cardIndex;
    cardIndex++;
    return delay;
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={handleRequestClose}
        style={{
          animation: animPhase === 'exiting'
            ? 'panelBackdropOut 0.3s ease-out forwards'
            : 'panelBackdropIn 0.3s ease-out forwards',
        }}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-gradient-to-b from-gray-900 via-gray-950 to-black border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.1)] flex flex-col"
        style={{
          maxHeight: 'calc(100vh - max(2rem, var(--safe-top, 0px)) - max(2rem, var(--safe-bottom, 0px)))',
          animation: animPhase === 'exiting'
            ? 'panelSlideOut 0.3s ease-in forwards'
            : 'panelSlideIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards',
        }}
      >
        {/* Grid BG overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(6,182,212,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.3) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Header */}
        <div className="relative p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 overflow-hidden">
          {/* Header shine sweep */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
              backgroundSize: '200% 100%',
              animation: 'headerShine 3s ease-in-out 0.6s infinite',
            }}
          />
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-7 h-7 text-cyan-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wider">
                GÜNLÜK GÖREVLER
              </h2>
              <p className="text-cyan-400/70 text-xs font-mono">
                {completedCount}/{dailyMissions.length} tamamlandı
                {weeklyMission && !weeklyMission.completed && ' • 1 haftalık aktif'}
              </p>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={handleRequestClose}
            className="absolute top-3 right-3 p-2.5 hover:bg-white/10 rounded-full transition-all active:scale-90"
            aria-label="Kapat"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="relative p-4 space-y-3 flex-1 min-h-0 overflow-y-auto">
          {/* Sound Check (onboarding) */}
          {soundCheckMissions.length > 0 && (
            <>
              <div className="text-green-400 text-[10px] font-bold tracking-widest uppercase mb-1">
                🎵 Sound Check
              </div>
              {soundCheckMissions.map(m => (
                <div key={m.id} style={{ animation: `cardStagger 0.4s ease-out ${nextStagger()}s both` }}>
                  <MissionCard mission={m} onClaim={onClaimMission} />
                </div>
              ))}
              <div className="border-t border-white/5 my-2" />
            </>
          )}

          {/* Daily missions */}
          {dailyMissions.length > 0 && (
            <>
              {dailyMissions.map(m => (
                <div key={m.id} style={{ animation: `cardStagger 0.4s ease-out ${nextStagger()}s both` }}>
                  <MissionCard mission={m} onClaim={onClaimMission} />
                </div>
              ))}
            </>
          )}

          {dailyMissions.length === 0 && missionState.soundCheck.completed && (
            <div className="text-center text-gray-500 text-sm py-8">
              Sound Check'i tamamla → günlük görevler açılsın
            </div>
          )}

          {/* Daily Bonus */}
          {dailyMissions.length > 0 && (
            <div style={{ animation: `cardStagger 0.4s ease-out ${nextStagger()}s both` }}>
              <DailyBonusBar
                completedCount={completedCount}
                total={dailyMissions.length}
                bonusClaimed={missionState.daily.bonusClaimed}
                canClaim={canClaimBonus}
                onClaim={onClaimBonus}
              />
            </div>
          )}

          {/* Divider */}
          {weeklyMission && <div className="border-t border-white/5 my-1" />}

          {/* Weekly mission */}
          {weeklyMission && (
            <div style={{ animation: `cardStagger 0.4s ease-out ${nextStagger()}s both` }}>
              <WeeklyCard mission={weeklyMission} onClaim={onClaimMission} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative p-3 border-t border-white/5 bg-black/30">
          <ResetCountdown />
        </div>
      </div>
    </div>
  );
};

export default DailyMissionsPanel;
