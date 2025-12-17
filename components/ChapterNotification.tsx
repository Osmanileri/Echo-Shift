/**
 * Chapter Notification Component
 * Shows current chapter/level at the start of each level
 * Animates in from top and fades out
 */

import React, { useEffect, useState } from 'react';

interface ChapterNotificationProps {
  levelId: number;
  onComplete?: () => void;
}

const ChapterNotification: React.FC<ChapterNotificationProps> = ({
  levelId,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit' | 'done'>('enter');
  const onCompleteRef = React.useRef(onComplete);
  
  // Keep ref updated without triggering effect
  React.useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Reset phase when levelId changes (new level started)
    setPhase('enter');
    
    // Animation timeline
    const enterTimer = setTimeout(() => setPhase('visible'), 100);
    const visibleTimer = setTimeout(() => setPhase('exit'), 2000);
    const exitTimer = setTimeout(() => {
      setPhase('done');
      onCompleteRef.current?.();
    }, 2800);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(visibleTimer);
      clearTimeout(exitTimer);
    };
  }, [levelId]); // Only re-run when levelId changes

  if (phase === 'done') return null;

  const getTransform = () => {
    switch (phase) {
      case 'enter':
        return 'translateY(-100%)';
      case 'visible':
        return 'translateY(0)';
      case 'exit':
        return 'translateY(-100%)';
      default:
        return 'translateY(-100%)';
    }
  };

  const getOpacity = () => {
    switch (phase) {
      case 'enter':
        return 0;
      case 'visible':
        return 1;
      case 'exit':
        return 0;
      default:
        return 0;
    }
  };

  return (
    <div
      className="fixed top-4 left-1/2 z-50 pointer-events-none"
      style={{
        transform: `translateX(-50%) ${getTransform()}`,
        opacity: getOpacity(),
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="px-6 py-3 bg-gradient-to-r from-cyan-900/90 via-black/90 to-cyan-900/90 rounded-xl border border-cyan-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(0,255,255,0.2)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/40">
            <span className="text-cyan-400 font-bold text-sm">{levelId}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-400/60 uppercase tracking-[0.2em]">
              Bölüm
            </span>
            <span className="text-lg font-bold text-white tracking-wider">
              BÖLÜM {levelId}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterNotification;
