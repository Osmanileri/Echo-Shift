/**
 * Tutorial Overlay UI Component
 * Requirements: 17.1, 17.2
 * 
 * Displays step-by-step instructions with UI element highlighting and skip option.
 */

import React, { useCallback, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Target, Zap, Ghost, Waves, RotateCcw } from 'lucide-react';
import {
  TutorialStep,
  TutorialState,
  getCurrentStep,
  getTutorialState,
  getTutorialProgress,
  advanceStep,
  previousStep,
  skipTutorial,
  isTutorialActive,
  HighlightTarget,
} from '../../systems/tutorialSystem';

interface TutorialOverlayProps {
  onTutorialComplete?: () => void;
  onStepChange?: (step: TutorialStep) => void;
}

/**
 * Get icon for tutorial step based on type
 */
const getStepIcon = (stepId: string) => {
  switch (stepId) {
    case 'welcome':
      return <Sparkles className="w-6 h-6" />;
    case 'swap_mechanic':
      return <Target className="w-6 h-6" />;
    case 'scoring':
      return <Zap className="w-6 h-6" />;
    case 'obstacles':
      return <Target className="w-6 h-6" />;
    case 'near_miss':
      return <Sparkles className="w-6 h-6" />;
    case 'shop_intro':
      return <Sparkles className="w-6 h-6" />;
    case 'phantom_intro':
      return <Ghost className="w-6 h-6" />;
    case 'midline_intro':
      return <Waves className="w-6 h-6" />;
    case 'rhythm_intro':
      return <Zap className="w-6 h-6" />;
    case 'gravity_intro':
      return <RotateCcw className="w-6 h-6" />;
    default:
      return <Sparkles className="w-6 h-6" />;
  }
};


/**
 * Get highlight style based on target
 * Requirements: 17.2 - UI element highlighting
 */
const getHighlightStyle = (target: HighlightTarget): React.CSSProperties => {
  // These are approximate positions - actual implementation would need
  // to measure DOM elements or receive positions as props
  switch (target) {
    case 'score_display':
      return {
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '120px',
        height: '50px',
        borderRadius: '12px',
      };
    case 'orbs':
      return {
        position: 'absolute',
        top: '50%',
        left: '20%',
        transform: 'translate(-50%, -50%)',
        width: '100px',
        height: '200px',
        borderRadius: '50px',
      };
    case 'shop_button':
      return {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
      };
    case 'echo_shards':
      return {
        position: 'absolute',
        top: '10px',
        right: '20px',
        width: '100px',
        height: '40px',
        borderRadius: '8px',
      };
    case 'game_area':
      return {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        height: '60%',
        borderRadius: '20px',
      };
    default:
      return {};
  }
};

/**
 * Get position style for tutorial card
 */
const getCardPositionStyle = (position: 'top' | 'center' | 'bottom'): string => {
  switch (position) {
    case 'top':
      return 'top-20';
    case 'bottom':
      return 'bottom-20';
    case 'center':
    default:
      return 'top-1/2 -translate-y-1/2';
  }
};

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  onTutorialComplete,
  onStepChange,
}) => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  const tutorialState = getTutorialState();
  const currentStep = getCurrentStep();
  const progress = getTutorialProgress();
  const isActive = isTutorialActive();
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);
  
  const handleNext = useCallback(() => {
    const hasMore = advanceStep();
    forceUpdate();
    
    if (!hasMore) {
      onTutorialComplete?.();
    } else {
      const newStep = getCurrentStep();
      if (newStep) {
        onStepChange?.(newStep);
      }
    }
  }, [onTutorialComplete, onStepChange]);
  
  const handlePrevious = useCallback(() => {
    previousStep();
    forceUpdate();
    
    const newStep = getCurrentStep();
    if (newStep) {
      onStepChange?.(newStep);
    }
  }, [onStepChange]);
  
  const handleSkip = useCallback(() => {
    skipTutorial();
    forceUpdate();
    onTutorialComplete?.();
  }, [onTutorialComplete]);
  
  // Don't render if tutorial is not active
  if (!isActive || !currentStep) {
    return null;
  }
  
  const highlightStyle = getHighlightStyle(currentStep.highlightTarget);
  const cardPosition = getCardPositionStyle(currentStep.position);
  const isFirstStep = progress.current === 1;
  const isLastStep = progress.current === progress.total;
  
  // Get tutorial type color
  const getTutorialColor = () => {
    switch (tutorialState.tutorialType) {
      case 'phantom':
        return 'from-purple-500 to-indigo-600';
      case 'midline':
        return 'from-blue-500 to-cyan-600';
      case 'rhythm':
        return 'from-yellow-500 to-orange-600';
      case 'gravity':
        return 'from-red-500 to-pink-600';
      default:
        return 'from-cyan-500 to-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
      
      {/* Highlight cutout */}
      {currentStep.highlightTarget !== 'none' && (
        <div
          className="absolute border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.5)] animate-pulse pointer-events-none"
          style={highlightStyle}
        />
      )}
      
      {/* Tutorial Card - Mobile optimized */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 ${cardPosition} w-[calc(100%-2rem)] max-w-xs sm:max-w-sm mx-auto pointer-events-auto`}
      >
        <div className="bg-gradient-to-b from-gray-900 to-black rounded-xl border border-white/20 overflow-hidden shadow-2xl">
          {/* Header - Compact */}
          <div className={`flex items-center justify-between p-3 bg-gradient-to-r ${getTutorialColor()}`}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                {getStepIcon(currentStep.id)}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">{currentStep.title}</h3>
                <p className="text-[10px] text-white/70">
                  {progress.current} / {progress.total}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title="Eğitimi Atla"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>
          
          {/* Content - Compact */}
          <div className="p-3 sm:p-4">
            <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
              {currentStep.description}
            </p>
            
            {/* Action hint */}
            {currentStep.requiresAction && currentStep.actionText && (
              <div className="mt-3 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <p className="text-xs text-cyan-400 font-medium text-center">
                  👆 {currentStep.actionText}
                </p>
              </div>
            )}
          </div>
          
          {/* Progress dots - Smaller */}
          <div className="flex justify-center gap-1.5 pb-2">
            {Array.from({ length: progress.total }).map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === progress.current - 1
                    ? 'bg-cyan-400 w-4'
                    : index < progress.current - 1
                    ? 'bg-cyan-400/50'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
          
          {/* Navigation - Compact */}
          <div className="flex items-center justify-between p-3 border-t border-white/10">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isFirstStep
                  ? 'text-white/30 cursor-not-allowed'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <ChevronLeft className="w-3 h-3" />
              Geri
            </button>
            
            <button
              onClick={handleSkip}
              className="text-[10px] text-white/50 hover:text-white/70 transition-colors"
            >
              Atla
            </button>
            
            <button
              onClick={handleNext}
              className={`flex items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-gradient-to-r ${getTutorialColor()} text-white hover:opacity-90`}
            >
              {isLastStep ? 'Başla!' : 'İleri'}
              {!isLastStep && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialOverlay;
