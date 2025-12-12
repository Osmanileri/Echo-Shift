import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameEngine, { DailyChallengeMode, RestoreModeConfig } from './components/GameEngine';
import GameUI from './components/GameUI';
import Shop from './components/Shop/Shop';
import DailyChallenge from './components/DailyChallenge/DailyChallenge';
import TutorialOverlay from './components/Tutorial/TutorialOverlay';
import RestorePrompt from './components/Restore/RestorePrompt';
import { GameState } from './types';
import { STORAGE_KEYS } from './constants';
import { calculateEchoShards } from './utils/echoShards';
import { useGameStore } from './store/gameStore';
import { getActiveUpgradeEffects } from './systems/upgradeSystem';
// Daily Challenge System - Requirements 8.1, 8.2, 8.3
import { DailyChallengeConfig, submitScore as submitDailyChallengeScore } from './systems/dailyChallenge';
// Tutorial System - Requirements 17.1, 17.3, 17.4, 17.5
import { 
  shouldShowMainTutorial, 
  startMainTutorial, 
  startContextualTutorial,
  isTutorialActive,
  TutorialState
} from './systems/tutorialSystem';
// Restore System - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
import { RESTORE_CONFIG } from './systems/restoreSystem';
// Haptic Feedback System - Requirements 4.6
import { getHapticSystem } from './systems/hapticSystem';
// Analytics System - Requirements 5.1, 5.2, 5.4, 5.5, 5.6
import { createAnalyticsSystem, AnalyticsSystem } from './systems/analyticsSystem';
// Daily Rituals System - Requirements 5.5
import { setupRitualAnalytics } from './systems/dailyRituals';
// Rate Us System - Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
import { createRateUsSystem, RateUsSystem } from './systems/rateUsSystem';
import RatePrompt from './components/RateUs/RatePrompt';

// Global analytics system instance
let analyticsSystemInstance: AnalyticsSystem | null = null;

export function getAnalyticsSystem(): AnalyticsSystem {
  if (!analyticsSystemInstance) {
    analyticsSystemInstance = createAnalyticsSystem();
    
    // Set up ritual analytics callback - Requirements 5.5
    setupRitualAnalytics((ritualId, completionTime) => {
      analyticsSystemInstance?.logEvent('ritual_complete', {
        ritual_id: ritualId,
        completion_time: completionTime,
      });
      analyticsSystemInstance?.flush();
    });
  }
  return analyticsSystemInstance;
}

// Global rate us system instance - Requirements 6.1, 6.2, 6.3
let rateUsSystemInstance: RateUsSystem | null = null;

export function getRateUsSystem(): RateUsSystem {
  if (!rateUsSystemInstance) {
    rateUsSystemInstance = createRateUsSystem();
    rateUsSystemInstance.load(); // Load persisted state
  }
  return rateUsSystemInstance;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameSpeed, setGameSpeed] = useState<number>(0);
  
  // Analytics tracking - Requirements 5.1, 5.2, 5.6
  const sessionStartTime = useRef<number>(0);
  const currentLevelId = useRef<number>(0);
  
  // Rhythm System UI State - Requirements 1.3, 1.4
  const [rhythmMultiplier, setRhythmMultiplier] = useState<number>(1);
  const [rhythmStreak, setRhythmStreak] = useState<number>(0);
  
  // Near Miss System UI State - Requirements 3.7
  const [nearMissStreak, setNearMissStreak] = useState<number>(0);
  
  // Echo Shards earned in current session - Requirements 1.1, 1.3
  const [earnedShards, setEarnedShards] = useState<number>(0);
  
  // Shop state - Requirements 2.1
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  
  // Daily Challenge state - Requirements 8.1, 8.2, 8.3, 8.4
  const [isDailyChallengeOpen, setIsDailyChallengeOpen] = useState<boolean>(false);
  const [dailyChallengeMode, setDailyChallengeMode] = useState<DailyChallengeMode>({ enabled: false });
  
  // Slow Motion state - Requirements 6.4
  const [slowMotionUsesRemaining, setSlowMotionUsesRemaining] = useState<number>(0);
  const [slowMotionActive, setSlowMotionActive] = useState<boolean>(false);
  
  // Tutorial state - Requirements 17.1, 17.3, 17.4, 17.5
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  
  // Restore System state - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
  const [showRestorePrompt, setShowRestorePrompt] = useState<boolean>(false);
  const [restoreScoreAtDeath, setRestoreScoreAtDeath] = useState<number>(0);
  const [restoreCanRestore, setRestoreCanRestore] = useState<boolean>(true);
  const [restoreHasBeenUsed, setRestoreHasBeenUsed] = useState<boolean>(false);
  const [restoreRequested, setRestoreRequested] = useState<boolean>(false);
  
  // Rate Us System state - Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
  const [showRatePrompt, setShowRatePrompt] = useState<boolean>(false);
  
  // Global store for Echo Shards - Requirements 1.3, 1.4
  const echoShards = useGameStore((state) => state.echoShards);
  const addEchoShards = useGameStore((state) => state.addEchoShards);
  const spendEchoShards = useGameStore((state) => state.spendEchoShards);
  
  // Haptic Settings - Requirements 4.6
  const hapticEnabled = useGameStore((state) => state.hapticEnabled);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);
  
  // Sync haptic system with store setting - Requirements 4.6
  useEffect(() => {
    getHapticSystem().setEnabled(hapticEnabled);
  }, [hapticEnabled]);

  // Check for first-run tutorial - Requirements 17.1
  useEffect(() => {
    if (gameState === GameState.MENU && shouldShowMainTutorial()) {
      startMainTutorial();
      setShowTutorial(true);
    }
  }, [gameState]);

  const handleStart = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    setEarnedShards(0);
    
    // Initialize slow motion uses from upgrade - Requirements 6.4
    const effects = getActiveUpgradeEffects();
    setSlowMotionUsesRemaining(effects.slowMotionUses);
    setSlowMotionActive(false);
    
    // Reset restore state for new game - Requirements 2.8
    setShowRestorePrompt(false);
    setRestoreHasBeenUsed(false);
    setRestoreRequested(false);
    setRestoreCanRestore(true);
    
    // Analytics: Track session start - Requirements 5.6
    sessionStartTime.current = Date.now();
    currentLevelId.current = 0; // Endless mode
  };

  // Handle contextual tutorial for campaign levels - Requirements 17.5
  const handleStartWithTutorial = (tutorialType: TutorialState['tutorialType']) => {
    startContextualTutorial(tutorialType);
    setShowTutorial(true);
  };

  // Tutorial completion handler - Requirements 17.4
  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  const handlePause = () => {
    setGameState(GameState.PAUSED);
  };

  const handleResume = () => {
    setGameState(GameState.PLAYING);
  };

  const handleMainMenu = () => {
    // Analytics: Log session quit if quitting during gameplay - Requirements 5.6
    if (gameState === GameState.PLAYING || gameState === GameState.PAUSED) {
      const sessionDuration = Date.now() - sessionStartTime.current;
      getAnalyticsSystem().logEvent('session_quit', {
        current_score: score,
        level_id: currentLevelId.current,
        session_duration: sessionDuration,
      });
      getAnalyticsSystem().flush();
    }
    
    setGameState(GameState.MENU);
    setScore(0);
    // Reset daily challenge mode when returning to menu
    setDailyChallengeMode({ enabled: false });
  };

  // Shop handlers - Requirements 2.1
  const handleOpenShop = () => {
    setIsShopOpen(true);
  };

  const handleCloseShop = () => {
    setIsShopOpen(false);
  };

  // Daily Challenge handlers - Requirements 8.1, 8.2, 8.3, 8.4
  const handleOpenDailyChallenge = () => {
    setIsDailyChallengeOpen(true);
  };

  const handleCloseDailyChallenge = () => {
    setIsDailyChallengeOpen(false);
  };

  const handleStartDailyChallenge = (config: DailyChallengeConfig) => {
    setDailyChallengeMode({
      enabled: true,
      config,
      onChallengeComplete: (score, echoShardsEarned) => {
        console.log(`Daily Challenge completed! Score: ${score}, Shards: ${echoShardsEarned}`);
      }
    });
    setGameState(GameState.PLAYING);
    setScore(0);
    setEarnedShards(0);
    
    // Initialize slow motion uses from upgrade - Requirements 6.4
    const effects = getActiveUpgradeEffects();
    setSlowMotionUsesRemaining(effects.slowMotionUses);
    setSlowMotionActive(false);
  };

  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  const handleGameOver = useCallback((finalScore: number) => {
    setGameState(GameState.GAME_OVER);
    
    // Analytics: Log level fail event - Requirements 5.1
    const timePlayed = Date.now() - sessionStartTime.current;
    getAnalyticsSystem().logEvent('level_fail', {
      level_id: currentLevelId.current,
      score_at_death: finalScore,
      time_played: timePlayed,
    });
    
    // Flush analytics to localStorage - Requirements 5.7
    getAnalyticsSystem().flush();
    
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, finalScore.toString());
      
      // Rate Us: Record positive moment for new high score - Requirements 6.1
      getRateUsSystem().recordPositiveMoment();
      getRateUsSystem().save();
    }
    
    // Daily Challenge Mode: Submit score and calculate rewards - Requirements 8.3, 8.4
    if (dailyChallengeMode.enabled) {
      const result = submitDailyChallengeScore(finalScore);
      setEarnedShards(result.echoShardsEarned);
      
      // Reset daily challenge mode
      setDailyChallengeMode({ enabled: false });
      
      // Notify completion callback if provided
      dailyChallengeMode.onChallengeComplete?.(finalScore, result.echoShardsEarned);
    } else {
      // Normal mode: Calculate and award Echo Shards - Requirements 1.1, 1.3
      const shardsEarned = calculateEchoShards(finalScore);
      setEarnedShards(shardsEarned);
      if (shardsEarned > 0) {
        addEchoShards(shardsEarned);
      }
    }
  }, [highScore, addEchoShards, dailyChallengeMode]);

  // Rhythm state update handler - Requirements 1.3, 1.4
  const handleRhythmStateUpdate = useCallback((multiplier: number, streak: number) => {
    setRhythmMultiplier(multiplier);
    setRhythmStreak(streak);
  }, []);

  // Near miss state update handler - Requirements 3.7
  const handleNearMissStateUpdate = useCallback((streak: number) => {
    setNearMissStreak(streak);
  }, []);

  // Slow motion activation handler - Requirements 6.4
  const handleActivateSlowMotion = useCallback(() => {
    if (slowMotionUsesRemaining > 0 && !slowMotionActive) {
      setSlowMotionUsesRemaining(prev => prev - 1);
      setSlowMotionActive(true);
    }
  }, [slowMotionUsesRemaining, slowMotionActive]);

  // Slow motion state update handler - Requirements 6.4
  const handleSlowMotionStateUpdate = useCallback((active: boolean) => {
    setSlowMotionActive(active);
  }, []);

  // Restore System handlers - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
  const handleShowRestorePrompt = useCallback((scoreAtDeath: number, canRestore: boolean) => {
    setRestoreScoreAtDeath(scoreAtDeath);
    setRestoreCanRestore(canRestore);
    setShowRestorePrompt(true);
  }, []);

  const handleRestoreAccept = useCallback(() => {
    // Requirements 2.3: Deduct 100 Echo Shards
    const success = spendEchoShards(RESTORE_CONFIG.cost);
    if (success) {
      // Analytics: Log restore used event - Requirements 5.4
      getAnalyticsSystem().logEvent('restore_used', {
        score_at_death: restoreScoreAtDeath,
        restore_success: true,
      });
      getAnalyticsSystem().flush();
      
      setShowRestorePrompt(false);
      setRestoreRequested(true);
      // Note: restoreRequested will be reset by onRestoreComplete callback
    }
  }, [spendEchoShards, restoreScoreAtDeath]);

  const handleRestoreDecline = useCallback(() => {
    setShowRestorePrompt(false);
    // Proceed to game over
    handleGameOver(restoreScoreAtDeath);
  }, [handleGameOver, restoreScoreAtDeath]);

  const handleRestoreComplete = useCallback(() => {
    setRestoreHasBeenUsed(true);
    setRestoreRequested(false);
  }, []);

  const handleRestoreStateUpdate = useCallback((canRestore: boolean, hasBeenUsed: boolean) => {
    setRestoreCanRestore(canRestore);
    setRestoreHasBeenUsed(hasBeenUsed);
  }, []);

  // Rate Us System handlers - Requirements 6.3, 6.4, 6.5, 6.6
  const handleRatePositive = useCallback(() => {
    // Requirements 6.4: Open app store rating page
    getRateUsSystem().markRated();
    setShowRatePrompt(false);
    // Open app store - in a real app, this would use a native plugin
    // For web, we can open a feedback URL or just close the prompt
    window.open('https://play.google.com/store/apps', '_blank');
  }, []);

  const handleRateNegative = useCallback(() => {
    // Requirements 6.5: Show feedback form or dismiss
    getRateUsSystem().markDismissed();
    setShowRatePrompt(false);
    // In a real app, this could open a feedback form
  }, []);

  const handleRateDismiss = useCallback(() => {
    // Requirements 6.6: Don't show for 7 days after dismiss
    getRateUsSystem().markDismissed();
    setShowRatePrompt(false);
  }, []);

  // Check if rate prompt should be shown after game over - Requirements 6.3
  useEffect(() => {
    if (gameState === GameState.GAME_OVER && !showRestorePrompt) {
      // Small delay to let the game over screen appear first
      const timer = setTimeout(() => {
        if (getRateUsSystem().shouldShowPrompt()) {
          setShowRatePrompt(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState, showRestorePrompt]);

  // Restore mode configuration - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
  const restoreMode: RestoreModeConfig = {
    enabled: true,
    onShowRestorePrompt: handleShowRestorePrompt,
    onRestoreComplete: handleRestoreComplete,
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none touch-none">
      <GameEngine 
        gameState={gameState} 
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        setGameSpeedDisplay={setGameSpeed}
        onRhythmStateUpdate={handleRhythmStateUpdate}
        onNearMissStateUpdate={handleNearMissStateUpdate}
        slowMotionActive={slowMotionActive}
        onSlowMotionStateUpdate={handleSlowMotionStateUpdate}
        dailyChallengeMode={dailyChallengeMode}
        restoreMode={restoreMode}
        restoreRequested={restoreRequested}
        onRestoreStateUpdate={handleRestoreStateUpdate}
      />
      <GameUI 
        gameState={gameState}
        score={score}
        highScore={highScore}
        speed={gameSpeed}
        onStart={handleStart}
        onRestart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onMainMenu={handleMainMenu}
        onOpenShop={handleOpenShop}
        onOpenDailyChallenge={handleOpenDailyChallenge}
        rhythmMultiplier={rhythmMultiplier}
        rhythmStreak={rhythmStreak}
        nearMissStreak={nearMissStreak}
        echoShards={echoShards}
        earnedShards={earnedShards}
        slowMotionUsesRemaining={slowMotionUsesRemaining}
        slowMotionActive={slowMotionActive}
        onActivateSlowMotion={handleActivateSlowMotion}
      />
      <Shop isOpen={isShopOpen} onClose={handleCloseShop} />
      <DailyChallenge 
        isOpen={isDailyChallengeOpen} 
        onClose={handleCloseDailyChallenge}
        onStartChallenge={handleStartDailyChallenge}
      />
      {/* Tutorial Overlay - Requirements 17.1, 17.2 */}
      {showTutorial && (
        <TutorialOverlay 
          onTutorialComplete={handleTutorialComplete}
        />
      )}
      {/* Restore Prompt - Requirements 2.1, 2.2, 2.4, 2.9, 2.10 */}
      {showRestorePrompt && (
        <RestorePrompt
          balance={echoShards}
          isAvailable={!restoreHasBeenUsed}
          onRestore={handleRestoreAccept}
          onDecline={handleRestoreDecline}
          scoreAtDeath={restoreScoreAtDeath}
        />
      )}
      {/* Rate Us Prompt - Requirements 6.3, 6.4, 6.5, 6.6 */}
      {showRatePrompt && (
        <RatePrompt
          onPositive={handleRatePositive}
          onNegative={handleRateNegative}
          onDismiss={handleRateDismiss}
        />
      )}
    </div>
  );
};

export default App;