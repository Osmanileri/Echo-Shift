/**
 * Level Map UI Component
 * Requirements: 7.1 - Display a level selection map with 100 levels
 * Requirements: 17.5 - Contextual tutorials for new mechanics
 * Requirements: 13.1, 13.2, 13.3, 13.4 - Level unlock animations
 * Requirements: 2.2, 2.3, 10.1, 10.3 - Chapter lock system
 */

import { CheckCircle, ChevronLeft, ChevronRight, Ghost, Lock, Play, Star, Trophy, Waves, X, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChapterType, LEVELS, LevelConfig, getChapterForLevel } from '../../data/levels';
import { useGameStore } from '../../store/gameStore';
import { getLevelStars, getProgress, isLevelCompleted, isLevelUnlocked } from '../../systems/campaignSystem';
import { isChapterUnlocked } from '../../systems/chapterSystem';
import { getContextualTutorialForLevel } from '../../systems/tutorialSystem';

interface LevelMapProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (levelConfig: LevelConfig, showTutorial?: 'phantom' | 'midline' | 'rhythm' | 'gravity') => void;
  /** Newly unlocked level ID for triggering unlock animations - Requirements 13.1 */
  newlyUnlockedLevel?: number;
  /** Previously completed level ID for path animation - Requirements 13.2 */
  justCompletedLevel?: number;
}

/**
 * Locked chapter message state
 * Requirements: 2.3 - Show "Complete previous chapter" message on locked chapter tap
 */
interface LockedChapterMessage {
  visible: boolean;
  chapterId: number;
  x: number;
  y: number;
}

const LEVELS_PER_PAGE = 20;
const TOTAL_PAGES = Math.ceil(LEVELS.length / LEVELS_PER_PAGE);

/**
 * Chapter theme configurations for background cross-fade
 * Requirements: 13.4
 */
const CHAPTER_THEMES: Record<ChapterType, { gradient: string; accent: string }> = {
  'SUB_BASS': { gradient: 'from-cyan-900/30 via-gray-900 to-black', accent: '#00F0FF' },
  'BASS': { gradient: 'from-green-900/30 via-gray-900 to-black', accent: '#22C55E' },
  'MID': { gradient: 'from-purple-900/30 via-gray-900 to-black', accent: '#A855F7' },
  'HIGH': { gradient: 'from-amber-900/30 via-gray-900 to-black', accent: '#F59E0B' },
  'PRESENCE': { gradient: 'from-red-900/30 via-gray-900 to-black', accent: '#EF4444' },
};

/**
 * Path Unlock Animation State
 * Requirements: 13.1, 13.2
 */
interface PathUnlockState {
  active: boolean;
  fromLevel: number;
  toLevel: number;
  lineProgress: number; // 0-1 for line drawing animation
}

/**
 * Unlock Pop Animation State
 * Requirements: 13.3
 */
interface UnlockPopState {
  active: boolean;
  levelId: number;
  phase: 'waiting' | 'scale' | 'flash' | 'settle';
}

/**
 * Chapter Transition State
 * Requirements: 13.4
 */
interface ChapterTransitionState {
  active: boolean;
  fromChapter: ChapterType;
  toChapter: ChapterType;
  fadeProgress: number; // 0-1 for cross-fade
}

const LevelMap: React.FC<LevelMapProps> = ({ 
  isOpen, 
  onClose, 
  onSelectLevel,
  newlyUnlockedLevel,
  justCompletedLevel,
}) => {
  const completedLevels = useGameStore((state) => state.completedLevels);
  const levelStars = useGameStore((state) => state.levelStars);
  const currentLevel = useGameStore((state) => state.currentLevel);
  const lastPlayedLevel = useGameStore((state) => state.lastPlayedLevel);
  // Chapter progress state - Requirements: 2.2, 2.3, 10.1, 10.3
  const chapterProgress = useGameStore((state) => state.chapterProgress);
  
  // Animation states - Requirements 13.1, 13.2, 13.3, 13.4
  const [pathUnlock, setPathUnlock] = useState<PathUnlockState>({
    active: false,
    fromLevel: 0,
    toLevel: 0,
    lineProgress: 0,
  });
  
  const [unlockPop, setUnlockPop] = useState<UnlockPopState>({
    active: false,
    levelId: 0,
    phase: 'waiting',
  });
  
  const [chapterTransition, setChapterTransition] = useState<ChapterTransitionState>({
    active: false,
    fromChapter: 'SUB_BASS',
    toChapter: 'SUB_BASS',
    fadeProgress: 0,
  });
  
  // Locked chapter message state - Requirements: 2.3
  const [lockedMessage, setLockedMessage] = useState<LockedChapterMessage>({
    visible: false,
    chapterId: 0,
    x: 0,
    y: 0,
  });
  
  // Animation frame ref for cleanup
  const animationFrameRef = useRef<number | null>(null);
  const pathAnimationStartRef = useRef<number>(0);
  
  // Auto-select page containing last played level - Requirements 1.4
  const initialPage = useMemo(() => {
    const targetLevel = lastPlayedLevel || currentLevel || 1;
    return Math.floor((targetLevel - 1) / LEVELS_PER_PAGE);
  }, [lastPlayedLevel, currentLevel]);
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  // Current chapter based on page
  const currentChapter = useMemo(() => {
    const firstLevelOnPage = currentPage * LEVELS_PER_PAGE + 1;
    return getChapterForLevel(firstLevelOnPage);
  }, [currentPage]);
  
  // Get progress stats
  const progress = useMemo(() => getProgress(), [completedLevels, levelStars]);
  
  // Get levels for current page
  const currentPageLevels = useMemo(() => {
    const start = currentPage * LEVELS_PER_PAGE;
    return LEVELS.slice(start, start + LEVELS_PER_PAGE);
  }, [currentPage]);
  
  /**
   * Trigger Path Unlock Animation
   * Requirements: 13.1, 13.2
   */
  const triggerPathUnlockAnimation = useCallback((fromLevel: number, toLevel: number) => {
    setPathUnlock({
      active: true,
      fromLevel,
      toLevel,
      lineProgress: 0,
    });
    
    pathAnimationStartRef.current = performance.now();
    
    const animatePath = (timestamp: number) => {
      const elapsed = timestamp - pathAnimationStartRef.current;
      const duration = 800; // 800ms for line drawing
      const progress = Math.min(1, elapsed / duration);
      
      setPathUnlock(prev => ({
        ...prev,
        lineProgress: progress,
      }));
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animatePath);
      } else {
        // Line complete, trigger unlock pop
        triggerUnlockPopAnimation(toLevel);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animatePath);
  }, []);
  
  /**
   * Trigger Unlock Pop Animation
   * Requirements: 13.3
   */
  const triggerUnlockPopAnimation = useCallback((levelId: number) => {
    setUnlockPop({
      active: true,
      levelId,
      phase: 'scale',
    });
    
    // Phase timing: scale (200ms) -> flash (150ms) -> settle (200ms)
    setTimeout(() => {
      setUnlockPop(prev => ({ ...prev, phase: 'flash' }));
    }, 200);
    
    setTimeout(() => {
      setUnlockPop(prev => ({ ...prev, phase: 'settle' }));
    }, 350);
    
    setTimeout(() => {
      setUnlockPop({ active: false, levelId: 0, phase: 'waiting' });
      setPathUnlock({ active: false, fromLevel: 0, toLevel: 0, lineProgress: 0 });
      
      // Check for chapter transition
      const prevChapter = getChapterForLevel(levelId - 1);
      const newChapter = getChapterForLevel(levelId);
      if (prevChapter !== newChapter) {
        triggerChapterTransition(prevChapter, newChapter);
      }
    }, 550);
  }, []);
  
  /**
   * Trigger Chapter Background Cross-fade
   * Requirements: 13.4
   */
  const triggerChapterTransition = useCallback((fromChapter: ChapterType, toChapter: ChapterType) => {
    setChapterTransition({
      active: true,
      fromChapter,
      toChapter,
      fadeProgress: 0,
    });
    
    const startTime = performance.now();
    const duration = 1000; // 1 second cross-fade
    
    const animateFade = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      setChapterTransition(prev => ({
        ...prev,
        fadeProgress: progress,
      }));
      
      if (progress < 1) {
        requestAnimationFrame(animateFade);
      } else {
        setChapterTransition(prev => ({
          ...prev,
          active: false,
        }));
      }
    };
    
    requestAnimationFrame(animateFade);
  }, []);
  
  // Trigger animations when newly unlocked level is provided - Requirements 13.1
  useEffect(() => {
    if (isOpen && newlyUnlockedLevel && justCompletedLevel) {
      // Navigate to the page containing the newly unlocked level
      const targetPage = Math.floor((newlyUnlockedLevel - 1) / LEVELS_PER_PAGE);
      setCurrentPage(targetPage);
      
      // Small delay to ensure page is rendered before animation
      setTimeout(() => {
        triggerPathUnlockAnimation(justCompletedLevel, newlyUnlockedLevel);
      }, 300);
    }
  }, [isOpen, newlyUnlockedLevel, justCompletedLevel, triggerPathUnlockAnimation]);
  
  // Cleanup animation frames on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Get page title based on level range
  const getPageTitle = (page: number): string => {
    const start = page * LEVELS_PER_PAGE + 1;
    
    if (start <= 10) return 'Sub-Bass';
    if (start <= 20) return 'Bass';
    if (start <= 30) return 'Mid';
    if (start <= 40) return 'High';
    return 'Presence';
  };

  if (!isOpen) return null;

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(TOTAL_PAGES - 1, prev + 1));
  };

  /**
   * Handle level selection with chapter lock check
   * Requirements: 2.2, 2.3 - Prevent selection of locked chapters and show message
   */
  const handleLevelSelect = (level: LevelConfig, event?: React.MouseEvent) => {
    // Check if chapter is unlocked using chapter system
    const chapterUnlocked = isChapterUnlocked(level.id, chapterProgress.completedChapters);
    
    if (!chapterUnlocked) {
      // Show "Complete previous chapter" message - Requirements: 2.3
      if (event) {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setLockedMessage({
          visible: true,
          chapterId: level.id,
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
        
        // Auto-hide message after 2 seconds
        setTimeout(() => {
          setLockedMessage(prev => 
            prev.chapterId === level.id ? { ...prev, visible: false } : prev
          );
        }, 2000);
      }
      return;
    }
    
    if (isLevelUnlocked(level.id)) {
      const tutorialType = getContextualTutorialForLevel(level.id);
      // Filter out 'main' tutorial type as it's not a contextual tutorial
      const contextualTutorial = tutorialType && tutorialType !== 'main' ? tutorialType : undefined;
      onSelectLevel(level, contextualTutorial);
    }
  };
  
  /**
   * Hide locked message when clicking elsewhere
   */
  const handleBackdropClick = () => {
    if (lockedMessage.visible) {
      setLockedMessage(prev => ({ ...prev, visible: false }));
    }
  };

  // Get background gradient based on chapter transition state
  const getBackgroundGradient = () => {
    if (chapterTransition.active) {
      // During transition, blend between chapters
      return CHAPTER_THEMES[chapterTransition.toChapter].gradient;
    }
    return CHAPTER_THEMES[currentChapter].gradient;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={handleBackdropClick}>
      {/* Chapter Background with Cross-fade - Requirements 13.4 */}
      <div 
        className={`absolute inset-0 bg-gradient-to-b ${getBackgroundGradient()} transition-all duration-1000`}
        style={{
          opacity: chapterTransition.active ? chapterTransition.fadeProgress : 1,
        }}
      />
      {chapterTransition.active && (
        <div 
          className={`absolute inset-0 bg-gradient-to-b ${CHAPTER_THEMES[chapterTransition.fromChapter].gradient}`}
          style={{
            opacity: 1 - chapterTransition.fadeProgress,
          }}
        />
      )}
      
      {/* Locked Chapter Message Tooltip - Requirements: 2.3 */}
      {lockedMessage.visible && (
        <div 
          className="fixed z-[60] px-4 py-2 bg-red-500/90 text-white text-sm font-medium rounded-lg shadow-lg animate-bounce pointer-events-none"
          style={{
            left: lockedMessage.x,
            top: lockedMessage.y - 50,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Önceki bölümü tamamla</span>
          </div>
          {/* Arrow pointing down */}
          <div 
            className="absolute left-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-red-500/90"
            style={{ transform: 'translateX(-50%)' }}
          />
        </div>
      )}
      
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] bg-gradient-to-b from-gray-900/90 to-black/90 rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white tracking-wider">KAMPANYA</h2>
            <p className="text-sm text-white/50">{getPageTitle(currentPage)}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Progress Display - Hidden on very small screens */}
            <div className="hidden xs:flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-xs sm:text-sm font-bold text-yellow-400">
                  {progress.totalStars}/{progress.maxStars}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                <span className="text-xs sm:text-sm font-bold text-green-400">
                  {progress.completed}/{progress.total}
                </span>
              </div>
            </div>
            {/* Close Button - Always visible, larger touch target on mobile */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-3 sm:p-2 hover:bg-white/10 rounded-full transition-colors touch-manipulation"
              aria-label="Kapat"
            >
              <X className="w-6 h-6 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Level Grid with Path Animation Overlay */}
        <div className="relative p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Path Unlock Animation SVG Overlay - Requirements 13.1, 13.2 */}
          {pathUnlock.active && (
            <PathUnlockOverlay
              fromLevel={pathUnlock.fromLevel}
              toLevel={pathUnlock.toLevel}
              lineProgress={pathUnlock.lineProgress}
              currentPageStart={currentPage * LEVELS_PER_PAGE + 1}
              accentColor={CHAPTER_THEMES[currentChapter].accent}
            />
          )}
          
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {currentPageLevels.map((level) => {
              // Check chapter unlock status - Requirements: 2.2, 2.3
              const chapterUnlocked = isChapterUnlocked(level.id, chapterProgress.completedChapters);
              const chapterCompleted = chapterProgress.completedChapters.includes(level.id);
              
              return (
                <LevelCard
                  key={level.id}
                  level={level}
                  unlocked={isLevelUnlocked(level.id)}
                  completed={isLevelCompleted(level.id)}
                  stars={getLevelStars(level.id)}
                  isCurrent={level.id === currentLevel}
                  isLastPlayed={level.id === lastPlayedLevel}
                  unlockPopState={unlockPop.active && unlockPop.levelId === level.id ? unlockPop : null}
                  chapterUnlocked={chapterUnlocked}
                  chapterCompleted={chapterCompleted}
                  onClick={(e) => handleLevelSelect(level, e)}
                />
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === 0
                ? 'text-white/30 cursor-not-allowed'
                : 'text-white hover:bg-white/10'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Önceki
          </button>
          
          {/* Page Indicators */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_PAGES }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  index === currentPage
                    ? 'bg-cyan-400 scale-125'
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage === TOTAL_PAGES - 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              currentPage === TOTAL_PAGES - 1
                ? 'text-white/30 cursor-not-allowed'
                : 'text-white hover:bg-white/10'
            }`}
          >
            Sonraki
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Path Unlock Animation Overlay Component
 * Requirements: 13.1, 13.2 - Glowing line animation between level nodes
 */
interface PathUnlockOverlayProps {
  fromLevel: number;
  toLevel: number;
  lineProgress: number;
  currentPageStart: number;
  accentColor: string;
}

const PathUnlockOverlay: React.FC<PathUnlockOverlayProps> = ({
  fromLevel,
  toLevel,
  lineProgress,
  currentPageStart,
  accentColor,
}) => {
  // Calculate grid positions (5 columns on desktop, 4 on mobile)
  const getGridPosition = (levelId: number) => {
    const indexOnPage = levelId - currentPageStart;
    const cols = 5; // Assuming 5 columns
    const row = Math.floor(indexOnPage / cols);
    const col = indexOnPage % cols;
    // Each cell is approximately 80px wide with 12px gap
    const cellWidth = 80;
    const cellHeight = 80;
    const gap = 12;
    return {
      x: col * (cellWidth + gap) + cellWidth / 2,
      y: row * (cellHeight + gap) + cellHeight / 2,
    };
  };
  
  const fromPos = getGridPosition(fromLevel);
  const toPos = getGridPosition(toLevel);
  
  // Calculate the line endpoint based on progress
  const currentX = fromPos.x + (toPos.x - fromPos.x) * lineProgress;
  const currentY = fromPos.y + (toPos.y - fromPos.y) * lineProgress;
  
  return (
    <svg 
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Glow filter for the line */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Gradient for the line */}
        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.3" />
          <stop offset="50%" stopColor={accentColor} stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
        </linearGradient>
      </defs>
      
      {/* Background line (faded) */}
      <line
        x1={fromPos.x}
        y1={fromPos.y}
        x2={toPos.x}
        y2={toPos.y}
        stroke={accentColor}
        strokeWidth="2"
        strokeOpacity="0.2"
        strokeDasharray="4 4"
      />
      
      {/* Animated glowing line - Requirements 13.2 */}
      <line
        x1={fromPos.x}
        y1={fromPos.y}
        x2={currentX}
        y2={currentY}
        stroke="url(#pathGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      
      {/* Leading particle/dot */}
      {lineProgress > 0 && lineProgress < 1 && (
        <circle
          cx={currentX}
          cy={currentY}
          r="6"
          fill={accentColor}
          filter="url(#glow)"
        >
          <animate
            attributeName="r"
            values="4;8;4"
            dur="0.3s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </svg>
  );
};

// Level Card Component
interface LevelCardProps {
  level: LevelConfig;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  isCurrent: boolean;
  isLastPlayed: boolean;
  unlockPopState: UnlockPopState | null;
  /** Whether the chapter is unlocked based on chapter system - Requirements: 2.2 */
  chapterUnlocked: boolean;
  /** Whether the chapter has been completed - Requirements: 10.3 */
  chapterCompleted: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const LevelCard: React.FC<LevelCardProps> = ({
  level,
  unlocked,
  completed,
  stars,
  isCurrent,
  isLastPlayed,
  unlockPopState,
  chapterUnlocked,
  chapterCompleted,
  onClick,
}) => {
  // Get mechanic icons for the level
  const getMechanicIcons = () => {
    const icons = [];
    if (level.mechanics.phantom) {
      icons.push(<Ghost key="phantom" className="w-3 h-3 text-purple-400" />);
    }
    if (level.mechanics.midline) {
      icons.push(<Waves key="midline" className="w-3 h-3 text-blue-400" />);
    }
    if (level.mechanics.rhythm) {
      icons.push(<Zap key="rhythm" className="w-3 h-3 text-yellow-400" />);
    }
    return icons;
  };

  // Only pulse the NEXT level to play (current level that hasn't been completed yet)
  // Don't pulse completed levels or last played levels
  const isNextToPlay = isCurrent && !completed && unlocked && chapterUnlocked;
  const isHighlighted = isLastPlayed || isCurrent;
  
  // Use chapter unlock status for determining if level is accessible - Requirements: 2.2, 2.3
  const isAccessible = chapterUnlocked && unlocked;
  const isLocked = !chapterUnlocked;
  
  /**
   * Get animation styles for Unlock Pop
   * Requirements: 13.3 - scale up, flash, settle animation
   */
  const getUnlockPopStyles = (): React.CSSProperties => {
    if (!unlockPopState) return {};
    
    switch (unlockPopState.phase) {
      case 'scale':
        return {
          transform: 'scale(1.3)',
          transition: 'transform 200ms ease-out',
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)',
        };
      case 'flash':
        return {
          transform: 'scale(1.2)',
          transition: 'transform 150ms ease-in-out',
          boxShadow: '0 0 40px rgba(255, 255, 255, 0.8)',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
        };
      case 'settle':
        return {
          transform: 'scale(1)',
          transition: 'transform 200ms ease-in',
          boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)',
        };
      default:
        return {};
    }
  };
  
  // Determine if this card should show the lock being removed
  const showLockRemoval = unlockPopState && unlockPopState.phase !== 'waiting';
  
  /**
   * Get card styling based on chapter lock status
   * Requirements: 2.2 - Show lock icon on locked chapters
   * Requirements: 10.3 - Display completion status for each chapter
   */
  const getCardClassName = () => {
    const baseClasses = 'relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all';
    
    // Locked chapter - Requirements: 2.2
    if (isLocked && !showLockRemoval) {
      return `${baseClasses} bg-gray-800/50 border-gray-600/30 cursor-not-allowed opacity-60`;
    }
    
    // Unlocking animation
    if (showLockRemoval) {
      return `${baseClasses} bg-cyan-500/30 border-cyan-500/50`;
    }
    
    // Chapter completed - Requirements: 10.3
    if (chapterCompleted && !isHighlighted) {
      return `${baseClasses} bg-green-500/10 border-green-500/30 hover:bg-green-500/20`;
    }
    
    // Next level to play (glow animation only for this one)
    if (isNextToPlay) {
      return `${baseClasses} bg-cyan-500/20 border-cyan-500 hover:bg-cyan-500/30 ring-2 ring-cyan-400 next-level-glow`;
    }
    
    // Last played or current level (highlighted but no pulse)
    if (isHighlighted && !isNextToPlay) {
      return `${baseClasses} bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30 ring-2 ring-cyan-400/50`;
    }
    
    // Unlocked but not completed
    if (isAccessible) {
      return `${baseClasses} bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30`;
    }
    
    // Default locked state
    return `${baseClasses} bg-white/5 border-white/10 cursor-not-allowed opacity-50`;
  };
  
  // Glow animation style for next level to play
  const getGlowStyle = (): React.CSSProperties => {
    if (!isNextToPlay) return {};
    return {
      animation: 'nextLevelGlow 2s ease-in-out infinite',
      boxShadow: '0 0 15px rgba(0, 240, 255, 0.6), inset 0 0 10px rgba(0, 240, 255, 0.1)',
    };
  };
  
  return (
    <>
      {/* CSS Animation for next level glow */}
      {isNextToPlay && (
        <style>{`
          @keyframes nextLevelGlow {
            0%, 100% {
              box-shadow: 0 0 10px rgba(0, 240, 255, 0.4), inset 0 0 5px rgba(0, 240, 255, 0.1);
              transform: scale(1);
            }
            50% {
              box-shadow: 0 0 25px rgba(0, 240, 255, 0.8), inset 0 0 15px rgba(0, 240, 255, 0.2);
              transform: scale(1.02);
            }
          }
        `}</style>
      )}
      <button
        onClick={onClick}
        disabled={false} // Allow click to show locked message - Requirements: 2.3
        className={getCardClassName()}
        style={{ ...getUnlockPopStyles(), ...getGlowStyle() }}
      >
      {/* Level Number - Requirements: 2.2 */}
      <div className={`text-lg font-bold ${
        isLocked && !showLockRemoval
          ? 'text-gray-500'
          : isNextToPlay
          ? 'text-cyan-400'
          : isHighlighted
          ? 'text-cyan-400'
          : chapterCompleted
          ? 'text-green-400'
          : showLockRemoval
          ? 'text-cyan-400'
          : 'text-white'
      }`}>
        {isLocked && !showLockRemoval ? (
          <Lock className="w-5 h-5 text-gray-500" />
        ) : (
          level.id
        )}
      </div>
      
      {/* Lock removal animation - Requirements 13.3 */}
      {showLockRemoval && unlockPopState?.phase === 'flash' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="w-5 h-5 text-white/50 animate-ping" />
        </div>
      )}
      
      {/* Chapter Completion Indicator - Requirements: 10.3 */}
      {chapterCompleted && !isLocked && (
        <div className="absolute -top-1 -left-1">
          <CheckCircle className="w-4 h-4 text-green-400 fill-green-400/20" />
        </div>
      )}
      
      {/* Stars - only show for unlocked chapters */}
      {(chapterUnlocked || showLockRemoval) && (
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3].map((starNum) => (
            <Star
              key={starNum}
              className={`w-3 h-3 ${
                starNum <= stars
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-white/20'
              }`}
            />
          ))}
        </div>
      )}
      
      {/* Target Distance for locked chapters - Requirements: 2.2 */}
      {isLocked && !showLockRemoval && (
        <div className="text-xs text-gray-500 mt-1">
          {level.id * 100}m
        </div>
      )}
      
      {/* Mechanic Icons - only show for unlocked chapters */}
      {(chapterUnlocked || showLockRemoval) && getMechanicIcons().length > 0 && (
        <div className="flex items-center gap-1 mt-1">
          {getMechanicIcons()}
        </div>
      )}
      
      {/* Next Level to Play Indicator - Requirements 1.4 */}
      {isNextToPlay && (
        <div className="absolute -top-1 -right-1">
          <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
        </div>
      )}
      </button>
    </>
  );
};

export default LevelMap;
