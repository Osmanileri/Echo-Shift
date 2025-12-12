/**
 * Level Map UI Component
 * Requirements: 7.1 - Display a level selection map with 100 levels
 * Requirements: 17.5 - Contextual tutorials for new mechanics
 */

import React, { useState, useMemo } from 'react';
import { X, Star, Lock, Play, ChevronLeft, ChevronRight, Trophy, Zap, Ghost, Waves } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { LEVELS, LevelConfig } from '../../data/levels';
import { isLevelUnlocked, isLevelCompleted, getLevelStars, getProgress } from '../../systems/campaignSystem';
import { getContextualTutorialForLevel } from '../../systems/tutorialSystem';

interface LevelMapProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (levelConfig: LevelConfig, showTutorial?: 'phantom' | 'midline' | 'rhythm' | 'gravity') => void;
}

const LEVELS_PER_PAGE = 20;
const TOTAL_PAGES = Math.ceil(LEVELS.length / LEVELS_PER_PAGE);

const LevelMap: React.FC<LevelMapProps> = ({ isOpen, onClose, onSelectLevel }) => {
  const [currentPage, setCurrentPage] = useState(0);
  
  const completedLevels = useGameStore((state) => state.completedLevels);
  const levelStars = useGameStore((state) => state.levelStars);
  const currentLevel = useGameStore((state) => state.currentLevel);
  
  // Get progress stats
  const progress = useMemo(() => getProgress(), [completedLevels, levelStars]);
  
  // Get levels for current page
  const currentPageLevels = useMemo(() => {
    const start = currentPage * LEVELS_PER_PAGE;
    return LEVELS.slice(start, start + LEVELS_PER_PAGE);
  }, [currentPage]);
  
  // Get page title based on level range
  const getPageTitle = (page: number): string => {
    const start = page * LEVELS_PER_PAGE + 1;
    const end = Math.min((page + 1) * LEVELS_PER_PAGE, 100);
    
    if (start <= 10) return 'Tutorial';
    if (start <= 20) return 'Phantom Zone';
    if (start <= 40) return 'Dynamic Realm';
    if (start <= 60) return 'Challenge Arena';
    if (start <= 80) return 'Expert Domain';
    return 'Master Trials';
  };

  if (!isOpen) return null;

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(TOTAL_PAGES - 1, prev + 1));
  };

  const handleLevelSelect = (level: LevelConfig) => {
    if (isLevelUnlocked(level.id)) {
      // Check if this level introduces a new mechanic - Requirements: 17.5
      const tutorialType = getContextualTutorialForLevel(level.id);
      onSelectLevel(level, tutorialType || undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wider">KAMPANYA</h2>
            <p className="text-sm text-white/50">{getPageTitle(currentPage)}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Progress Display */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 rounded-full border border-yellow-500/30">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">
                  {progress.totalStars}/{progress.maxStars}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
                <Trophy className="w-4 h-4 text-green-400" />
                <span className="text-sm font-bold text-green-400">
                  {progress.completed}/{progress.total}
                </span>
              </div>
            </div>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        {/* Level Grid */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {currentPageLevels.map((level) => (
              <LevelCard
                key={level.id}
                level={level}
                unlocked={isLevelUnlocked(level.id)}
                completed={isLevelCompleted(level.id)}
                stars={getLevelStars(level.id)}
                isCurrent={level.id === currentLevel}
                onClick={() => handleLevelSelect(level)}
              />
            ))}
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

// Level Card Component
interface LevelCardProps {
  level: LevelConfig;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  isCurrent: boolean;
  onClick: () => void;
}

const LevelCard: React.FC<LevelCardProps> = ({
  level,
  unlocked,
  completed,
  stars,
  isCurrent,
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

  return (
    <button
      onClick={onClick}
      disabled={!unlocked}
      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
        !unlocked
          ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-50'
          : completed
          ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
          : isCurrent
          ? 'bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30 ring-2 ring-cyan-400/50'
          : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
      }`}
    >
      {/* Level Number */}
      <div className={`text-lg font-bold ${
        !unlocked
          ? 'text-white/30'
          : completed
          ? 'text-green-400'
          : isCurrent
          ? 'text-cyan-400'
          : 'text-white'
      }`}>
        {unlocked ? level.id : <Lock className="w-5 h-5" />}
      </div>
      
      {/* Stars */}
      {unlocked && (
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
      
      {/* Mechanic Icons */}
      {unlocked && getMechanicIcons().length > 0 && (
        <div className="flex items-center gap-1 mt-1">
          {getMechanicIcons()}
        </div>
      )}
      
      {/* Current Level Indicator */}
      {isCurrent && !completed && (
        <div className="absolute -top-1 -right-1">
          <Play className="w-4 h-4 text-cyan-400 fill-cyan-400" />
        </div>
      )}
    </button>
  );
};

export default LevelMap;
