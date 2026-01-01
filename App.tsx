import React, { useCallback, useEffect, useRef, useState } from "react";
import DailyChallenge from "./components/DailyChallenge/DailyChallenge";
import GameEngine, {
  DailyChallengeMode,
  RestoreModeConfig
} from "./components/GameEngine.tsx";
import GameUI from "./components/GameUI";
import MissionComplete from "./components/Missions/MissionComplete";
import MissionPanel from "./components/Missions/MissionPanel";
import NumbersMissionVictory from "./components/Missions/NumbersMissionVictory";
import RestorePrompt from "./components/Restore/RestorePrompt";
import Shop from "./components/Shop/Shop";
import TutorialOverlay from "./components/Tutorial/TutorialOverlay";
import { STORAGE_KEYS } from "./constants";
import { useGameStore } from "./store/gameStore";
import { getActiveUpgradeEffects } from "./systems/upgradeSystem";
import { GameState, GlitchPhase, Mission, MissionEvent } from "./types";
import { calculateEchoShards } from "./utils/echoShards";
// Daily Challenge System - Requirements 8.1, 8.2, 8.3
import {
  DailyChallengeConfig,
  submitScore as submitDailyChallengeScore,
} from "./systems/dailyChallenge";
// Tutorial System - Requirements 17.1, 17.3, 17.4, 17.5
import {
  shouldShowMainTutorial,
  startContextualTutorial,
  startMainTutorial,
  TutorialState,
} from "./systems/tutorialSystem";
// Restore System - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
import { RESTORE_CONFIG } from "./systems/restoreSystem";
// Haptic Feedback System - Requirements 4.6
import { getHapticSystem } from "./systems/hapticSystem";
// Analytics System - Requirements 5.1, 5.2, 5.4, 5.5, 5.6
import {
  AnalyticsSystem,
  createAnalyticsSystem,
} from "./systems/analyticsSystem";
// Daily Rituals System - Requirements 5.5
import RitualsPanel from "./components/Rituals/RitualsPanel";
import { DailyRitualsState, getDailyRitualsSystem, setupRitualAnalytics } from "./systems/dailyRituals";
// Campaign Mode - Requirements 7.1
import LevelMap from "./components/Campaign/LevelMap";
import ChapterNotification from "./components/ChapterNotification";
import VictoryScreen from "./components/VictoryScreen/VictoryScreen";
import { getLevelById, LevelConfig } from "./data/levels";
// Rate Us System - Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
import RatePrompt from "./components/RateUs/RatePrompt";
import ThemeCreatorModal from "./components/ThemeCreator/ThemeCreatorModal";
import { createRateUsSystem, RateUsSystem } from "./systems/rateUsSystem";
// Audio System - Phase 4 Launch Polish
import * as AudioSystem from "./systems/audioSystem";
import { calculateLevelReward, calculateStarRating } from "./systems/campaignSystem";

// Global analytics system instance
let analyticsSystemInstance: AnalyticsSystem | null = null;

export function getAnalyticsSystem(): AnalyticsSystem {
  if (!analyticsSystemInstance) {
    analyticsSystemInstance = createAnalyticsSystem();

    // Set up ritual analytics callback - Requirements 5.5
    setupRitualAnalytics((ritualId, completionTime) => {
      analyticsSystemInstance?.logEvent("ritual_complete", {
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
  // Echo Studio (Phase 3)
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);

  // Daily Challenge state - Requirements 8.1, 8.2, 8.3, 8.4
  const [isDailyChallengeOpen, setIsDailyChallengeOpen] =
    useState<boolean>(false);
  const [dailyChallengeMode, setDailyChallengeMode] =
    useState<DailyChallengeMode>({ enabled: false });

  // Slow Motion state - Requirements 6.4
  const [slowMotionUsesRemaining, setSlowMotionUsesRemaining] =
    useState<number>(0);
  const [slowMotionActive, setSlowMotionActive] = useState<boolean>(false);

  // Phase Dash state - Energy bar UI
  const [dashEnergy, setDashEnergy] = useState<number>(0);
  const [dashActive, setDashActive] = useState<boolean>(false);
  const [dashRemainingPercent, setDashRemainingPercent] = useState<number>(100); // Remaining dash time (100 = full, 0 = empty)
  // Quantum Lock UI State - Requirements 7.5
  const [isQuantumLockActive, setIsQuantumLockActive] = useState<boolean>(false);
  const [glitchPhase, setGlitchPhase] = useState<GlitchPhase>('inactive');

  // Tutorial state - Requirements 17.1, 17.3, 17.4, 17.5
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Interactive Tutorial System - Level 0 (7-Phase Tutorial)
  const [interactiveTutorialMode, setInteractiveTutorialMode] = useState<boolean>(false);
  const [tutorialPhase, setTutorialPhase] = useState<string>('NAVIGATION');
  const [tutorialPhaseIndex, setTutorialPhaseIndex] = useState<number>(0);
  // Restore System state - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
  const [showRestorePrompt, setShowRestorePrompt] = useState<boolean>(false);
  const [restoreScoreAtDeath, setRestoreScoreAtDeath] = useState<number>(0);
  const [restoreCanRestore, setRestoreCanRestore] = useState<boolean>(true);
  const [restoreHasBeenUsed, setRestoreHasBeenUsed] = useState<boolean>(false);
  const [restoreRequested, setRestoreRequested] = useState<boolean>(false);

  // Rate Us System state - Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
  const [showRatePrompt, setShowRatePrompt] = useState<boolean>(false);

  // Progression System state - Requirements 1.1, 2.1, 4.3, 5.1
  const [showMissionPanel, setShowMissionPanel] = useState<boolean>(false);
  const [completedMission, setCompletedMission] = useState<Mission | null>(null);
  const [showLevelUpNotification, setShowLevelUpNotification] = useState<boolean>(false);
  const [newLevel, setNewLevel] = useState<number>(1);
  const [showDailyRewardClaim, setShowDailyRewardClaim] = useState<boolean>(false);
  const [dailyRewardAmount, setDailyRewardAmount] = useState<number>(0);
  const [showSyncComplete, setShowSyncComplete] = useState<boolean>(false);

  // Numbers Mission state - Dynamic API-driven missions
  const [numbersMissionMode, setNumbersMissionMode] = useState<{
    enabled: boolean;
    targetDistance: number;
    pokemonId?: string;
  } | null>(null);
  const [showNumbersMissionVictory, setShowNumbersMissionVictory] = useState<boolean>(false);
  const [numbersMissionVictoryData, setNumbersMissionVictoryData] = useState<{
    number: number;
    text: string;
    distanceTraveled: number;
  } | null>(null);

  // Daily Rituals state
  const [showRitualsPanel, setShowRitualsPanel] = useState<boolean>(false);
  const [ritualsState, setRitualsState] = useState<DailyRitualsState>(() => getDailyRitualsSystem().state);

  // Campaign Mode state
  const [showCampaignMap, setShowCampaignMap] = useState<boolean>(false);
  const [campaignLevelConfig, setCampaignLevelConfig] = useState<LevelConfig | null>(null);
  // Campaign Update v2.5 - Level unlock animation state - Requirements 13.1
  const [newlyUnlockedLevel, setNewlyUnlockedLevel] = useState<number | undefined>(undefined);
  const [justCompletedLevel, setJustCompletedLevel] = useState<number | undefined>(undefined);
  // Campaign Update v2.5 - Distance tracking state for HUD - Requirements 6.1, 6.2, 6.3, 6.4
  const [currentDistance, setCurrentDistance] = useState<number>(0);
  const [targetDistance, setTargetDistance] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isNearFinish, setIsNearFinish] = useState<boolean>(false);
  const [isLevelCompleting, setIsLevelCompleting] = useState<boolean>(false); // Prevent multiple triggers

  // Ghost Pace Indicator state - Requirements 15.1, 15.3
  const [previousBestDistance, setPreviousBestDistance] = useState<number>(0);
  const [hasPassedGhost, setHasPassedGhost] = useState<boolean>(false);

  // Victory Screen state - for level completion
  const [showVictoryScreen, setShowVictoryScreen] = useState<boolean>(false);
  const [victoryData, setVictoryData] = useState<{
    levelId: number;
    stars: number;
    distanceTraveled: number;
    targetDistance: number;
    shardsEarned: number;
    firstClearBonus: number;
    isFirstClear: boolean;
  } | null>(null);

  // Campaign Chapter System - Game over distance info
  // Requirements: 6.1, 6.2, 6.3 - Track distance traveled on game over
  const [gameOverDistanceInfo, setGameOverDistanceInfo] = useState<{
    distanceTraveled: number;
    targetDistance: number;
    shardsCollected: number;
    damageTaken: number;
  } | null>(null);

  // Game start notification state
  const [gameStartNotification, setGameStartNotification] = useState<string | null>(null);

  // Chapter notification state - shows current level at game start
  const [showChapterNotification, setShowChapterNotification] = useState<boolean>(false);
  const [chapterNotificationLevel, setChapterNotificationLevel] = useState<number>(1);

  // Global store for Echo Shards - Requirements 1.3, 1.4
  const echoShards = useGameStore((state) => state.echoShards);
  const addEchoShards = useGameStore((state) => state.addEchoShards);
  const spendEchoShards = useGameStore((state) => state.spendEchoShards);

  // Haptic Settings - Requirements 4.6
  const hapticEnabled = useGameStore((state) => state.hapticEnabled);

  // Progression System store - Requirements 1.1, 2.1, 4.1, 5.1
  const syncRate = useGameStore((state) => state.syncRate);
  const totalXP = useGameStore((state) => state.totalXP);
  const missions = useGameStore((state) => state.missions);
  const lastLoginDate = useGameStore((state) => state.lastLoginDate);
  const soundCheckComplete = useGameStore((state) => state.soundCheckComplete);
  const processMissionEvent = useGameStore((state) => state.processMissionEvent);
  const completeMission = useGameStore((state) => state.completeMission);
  const claimDailyReward = useGameStore((state) => state.claimDailyReward);
  const addXP = useGameStore((state) => state.addXP);
  // Ghost Pace Indicator - get level stats for previous best distance
  const levelStats = useGameStore((state) => state.levelStats);

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

  // Check for daily reward on app load - Requirements 5.1
  useEffect(() => {
    if (gameState === GameState.MENU) {
      const today = new Date().toISOString().split('T')[0];
      if (lastLoginDate !== today) {
        setShowDailyRewardClaim(true);
      }
    }
  }, [gameState, lastLoginDate]);

  // Track Sound Check completion for celebration - Requirements 1.5
  const prevSoundCheckComplete = useRef(soundCheckComplete);
  useEffect(() => {
    if (soundCheckComplete && !prevSoundCheckComplete.current) {
      setShowSyncComplete(true);
      // Play celebration sound
      AudioSystem.playNewHighScore();
      // Auto-hide after 3 seconds
      setTimeout(() => setShowSyncComplete(false), 3000);
    }
    prevSoundCheckComplete.current = soundCheckComplete;
  }, [soundCheckComplete]);

  // Track level-up for notification - Requirements 4.3
  const prevSyncRate = useRef(syncRate);
  useEffect(() => {
    if (syncRate > prevSyncRate.current) {
      setNewLevel(syncRate);
      setShowLevelUpNotification(true);
      // Play level up sound
      AudioSystem.playNewHighScore();
      // Auto-hide after 3 seconds
      setTimeout(() => setShowLevelUpNotification(false), 3000);
    }
    prevSyncRate.current = syncRate;
  }, [syncRate]);

  // Ghost Pace Indicator - Detect when player passes their previous best - Requirements 15.3
  useEffect(() => {
    if (
      previousBestDistance > 0 &&
      currentDistance > previousBestDistance &&
      !hasPassedGhost &&
      gameState === GameState.PLAYING
    ) {
      setHasPassedGhost(true);
      // Play celebration sound when passing ghost
      AudioSystem.playStreakBonus();
    }
  }, [currentDistance, previousBestDistance, hasPassedGhost, gameState]);

  // Campaign Update v2.5 - Requirements 1.1, 1.2, 1.3, 1.4
  // "Start Game" now opens level selection directly (campaign-first flow)
  const handleStart = () => {
    // Audio: Initialize and play button click sound
    AudioSystem.initialize();
    AudioSystem.playButtonClick();

    // Check if interactive tutorial is needed (Level 0)
    // New users must complete tutorial before accessing campaign
    const tutorialCompleted = useGameStore.getState().tutorialCompleted;
    if (!tutorialCompleted) {
      console.log('[Tutorial] User has not completed tutorial, redirecting to Level 0');
      handleStartInteractiveTutorial();
      return;
    }

    // Open campaign level selection directly - Requirements 1.1
    setShowCampaignMap(true);
  };

  // Legacy endless mode start (for internal use or future features)
  const handleStartEndlessMode = () => {
    // Audio: Initialize and play game start sound - Phase 4
    AudioSystem.initialize();
    AudioSystem.playGameStart();

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

    // Reset campaign mode
    setCampaignLevelConfig(null);

    // Campaign Chapter System - Reset game over distance info
    setGameOverDistanceInfo(null);

    // Show active ritual notification at game start
    const ritualSystem = getDailyRitualsSystem();
    ritualSystem.checkDayChange(); // Check if day changed
    const activeRitual = ritualSystem.state.rituals.find(r => !r.completed);
    if (activeRitual && soundCheckComplete) {
      // Find ritual definition for display
      const { RITUAL_POOL } = require('./data/rituals');
      const ritualDef = RITUAL_POOL.find((r: { id: string }) => r.id === activeRitual.ritualId);
      if (ritualDef) {
        setGameStartNotification(`🎯 ${ritualDef.name}: ${ritualDef.description}`);
        // Auto-hide after 3 seconds
        setTimeout(() => setGameStartNotification(null), 3000);
      }
    }
  };

  // Handle contextual tutorial for campaign levels - Requirements 17.5
  const handleStartWithTutorial = (
    tutorialType: TutorialState["tutorialType"]
  ) => {
    startContextualTutorial(tutorialType);
    setShowTutorial(true);
  };

  // Tutorial completion handler - Requirements 17.4
  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  // Interactive Tutorial System handlers - Level 0
  const handleInteractiveTutorialComplete = useCallback(() => {
    console.log('[Tutorial] Interactive tutorial completed!');
    setInteractiveTutorialMode(false);
    setGameState(GameState.MENU);

    // Mark tutorial as completed in store
    useGameStore.getState().setTutorialCompleted(true);

    // Play celebration sound
    AudioSystem.playNewHighScore();

    // Open campaign map directly after tutorial
    setShowCampaignMap(true);
  }, []);

  const handleTutorialPhaseChange = useCallback((phase: string, phaseIndex: number) => {
    console.log('[Tutorial] Phase changed:', phase, phaseIndex);
    setTutorialPhase(phase);
    setTutorialPhaseIndex(phaseIndex);
  }, []);

  const handleStartInteractiveTutorial = useCallback(() => {
    console.log('[Tutorial] Starting interactive tutorial (Level 0)');
    AudioSystem.initialize();
    AudioSystem.playGameStart();

    setInteractiveTutorialMode(true);
    setTutorialPhase('NAVIGATION');
    setTutorialPhaseIndex(0);
    setGameState(GameState.PLAYING);
    setScore(0);
    setEarnedShards(0);

    // Reset campaign config (tutorial is Level 0)
    setCampaignLevelConfig(null);
  }, []);
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
      getAnalyticsSystem().logEvent("session_quit", {
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

    // Campaign Update v2.5 - Open campaign map with unlock animation if returning from victory
    // Requirements 13.1: Show path unlock animation when returning to level map after victory
    if (campaignLevelConfig && newlyUnlockedLevel) {
      setShowCampaignMap(true);
    }
  };

  // Shop handlers - Requirements 2.1
  const handleOpenShop = () => {
    setIsShopOpen(true);
  };

  const handleCloseShop = () => {
    setIsShopOpen(false);
  };

  const handleOpenStudio = () => {
    setIsStudioOpen(true);
  };

  const handleCloseStudio = () => {
    setIsStudioOpen(false);
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
        console.log(
          `Daily Challenge completed! Score: ${score}, Shards: ${echoShardsEarned}`
        );
      },
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

  const handleGameOver = useCallback(
    (finalScore: number) => {
      setGameState(GameState.GAME_OVER);

      // Analytics: Log level fail event - Requirements 5.1
      const timePlayed = Date.now() - sessionStartTime.current;
      getAnalyticsSystem().logEvent("level_fail", {
        level_id: currentLevelId.current,
        score_at_death: finalScore,
        time_played: timePlayed,
      });

      // Flush analytics to localStorage - Requirements 5.7
      getAnalyticsSystem().flush();

      if (finalScore > highScore) {
        setHighScore(finalScore);
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, finalScore.toString());

        // Audio: New high score celebration - Phase 4
        AudioSystem.playNewHighScore();

        // Rate Us: Record positive moment for new high score - Requirements 6.1
        getRateUsSystem().recordPositiveMoment();
        getRateUsSystem().save();
      }

      // Ghost Pace Indicator - Save best distance on normal game over
      // This ensures ghost marker shows on next attempt even without using recovery
      if (campaignLevelConfig && currentDistance > 0) {
        const levelId = campaignLevelConfig.id;
        const currentStats = useGameStore.getState().levelStats[levelId];
        const currentBest = currentStats?.bestDistance || 0;

        console.log('[Ghost] Normal game over - Level:', levelId, 'Distance:', currentDistance, 'Current best:', currentBest);

        if (currentDistance > currentBest) {
          useGameStore.setState((state) => ({
            levelStats: {
              ...state.levelStats,
              [levelId]: {
                ...state.levelStats[levelId],
                bestDistance: currentDistance,
                bestShardsCollected: state.levelStats[levelId]?.bestShardsCollected || 0,
                bestStars: state.levelStats[levelId]?.bestStars || 0,
                timesPlayed: (state.levelStats[levelId]?.timesPlayed || 0) + 1,
                firstClearBonus: state.levelStats[levelId]?.firstClearBonus || false,
              },
            },
          }));
          useGameStore.getState().saveToStorage();
          console.log('[Ghost] ✅ Saved best distance on game over:', currentDistance);
        }
      }

      // Daily Challenge Mode: Submit score and calculate rewards - Requirements 8.3, 8.4
      if (dailyChallengeMode.enabled) {
        const result = submitDailyChallengeScore(finalScore);
        setEarnedShards(result.echoShardsEarned);

        // Reset daily challenge mode
        setDailyChallengeMode({ enabled: false });

        // Notify completion callback if provided
        dailyChallengeMode.onChallengeComplete?.(
          finalScore,
          result.echoShardsEarned
        );
      } else {
        // Normal mode: Calculate and award Echo Shards - Requirements 1.1, 1.3
        const shardsEarned = calculateEchoShards(finalScore);
        setEarnedShards(shardsEarned);
        if (shardsEarned > 0) {
          addEchoShards(shardsEarned);
        }
      }
    },
    [highScore, addEchoShards, dailyChallengeMode, campaignLevelConfig, currentDistance]
  );

  // Rhythm state update handler - Requirements 1.3, 1.4
  const handleRhythmStateUpdate = useCallback(
    (multiplier: number, streak: number) => {
      setRhythmMultiplier(multiplier);
      setRhythmStreak(streak);
    },
    []
  );

  // Near miss state update handler - Requirements 3.7
  const handleNearMissStateUpdate = useCallback((streak: number) => {
    setNearMissStreak(streak);
  }, []);

  // Slow motion activation handler - Requirements 6.4
  const handleActivateSlowMotion = useCallback(() => {
    if (slowMotionUsesRemaining > 0 && !slowMotionActive) {
      setSlowMotionUsesRemaining((prev) => prev - 1);
      setSlowMotionActive(true);
    }
  }, [slowMotionUsesRemaining, slowMotionActive]);

  // Slow motion state update handler - Requirements 6.4
  const handleSlowMotionStateUpdate = useCallback((active: boolean) => {
    setSlowMotionActive(active);
  }, []);

  // Phase Dash state update handler
  const handleDashStateUpdate = useCallback((energy: number, active: boolean, remainingPercent: number = 100) => {
    setDashEnergy(energy);
    setDashActive(active);
    setDashRemainingPercent(remainingPercent);
  }, []);

  // Quantum Lock state update handler - Requirements 7.5
  const handleQuantumLockStateUpdate = useCallback((isActive: boolean, phase?: GlitchPhase) => {
    setIsQuantumLockActive(isActive);
    if (phase) setGlitchPhase(phase);
  }, []);

  // Restore System handlers - Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.8
  const handleShowRestorePrompt = useCallback(
    (scoreAtDeath: number, canRestore: boolean) => {
      setRestoreScoreAtDeath(scoreAtDeath);
      setRestoreCanRestore(canRestore);
      setShowRestorePrompt(true);
    },
    []
  );

  const handleRestoreAccept = useCallback(() => {
    // Requirements 2.3: Deduct 100 Echo Shards
    const success = spendEchoShards(RESTORE_CONFIG.cost);
    if (success) {
      // Analytics: Log restore used event - Requirements 5.4
      getAnalyticsSystem().logEvent("restore_used", {
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

  const handleRestoreStateUpdate = useCallback(
    (canRestore: boolean, hasBeenUsed: boolean) => {
      setRestoreCanRestore(canRestore);
      setRestoreHasBeenUsed(hasBeenUsed);
    },
    []
  );

  // Progression System handlers - Requirements 1.1, 2.1, 4.3, 5.1
  const handleOpenMissionPanel = useCallback(() => {
    setShowMissionPanel(true);
  }, []);

  const handleCloseMissionPanel = useCallback(() => {
    setShowMissionPanel(false);
  }, []);

  // Daily Rituals handlers
  const handleOpenRituals = useCallback(() => {
    // Refresh state from system
    setRitualsState({ ...getDailyRitualsSystem().state });
    setShowRitualsPanel(true);
  }, []);

  const handleCloseRituals = useCallback(() => {
    setShowRitualsPanel(false);
  }, []);

  const handleClaimRitualBonus = useCallback(() => {
    const system = getDailyRitualsSystem();
    const bonus = system.claimBonus();
    if (bonus > 0) {
      addEchoShards(bonus);
      setRitualsState({ ...system.state });
      AudioSystem.playNewHighScore();
    }
  }, [addEchoShards]);

  // Campaign Mode handlers
  const handleOpenCampaign = useCallback(() => {
    setShowCampaignMap(true);
  }, []);

  const handleCloseCampaign = useCallback(() => {
    setShowCampaignMap(false);
    // Clear unlock animation state - Requirements 13.1
    setNewlyUnlockedLevel(undefined);
    setJustCompletedLevel(undefined);
  }, []);

  const handleSelectCampaignLevel = useCallback((levelConfig: LevelConfig, showTutorial?: 'phantom' | 'midline' | 'rhythm' | 'gravity') => {
    setCampaignLevelConfig(levelConfig);
    setShowCampaignMap(false);

    // Show tutorial if needed
    if (showTutorial) {
      handleStartWithTutorial(showTutorial);
    }

    // Start the game with campaign config
    AudioSystem.initialize();
    AudioSystem.playGameStart();

    // Fix bug: Ensure tutorial mode is disabled when starting a normal level
    setInteractiveTutorialMode(false);
    setShowTutorial(false);

    // Force game state to MENU first to ensure GameEngine resets
    // This triggers wasPlayingRef to become false
    setGameState(GameState.MENU);

    setScore(0);
    setEarnedShards(0);

    // Show chapter notification at game start
    setChapterNotificationLevel(levelConfig.id);
    setShowChapterNotification(true);

    // Use queueMicrotask instead of requestAnimationFrame to switch to PLAYING
    // before the browser has a chance to render the MENU state canvas
    queueMicrotask(() => {
      setGameState(GameState.PLAYING);
    });

    // Initialize slow motion uses from upgrade
    const effects = getActiveUpgradeEffects();
    setSlowMotionUsesRemaining(effects.slowMotionUses);
    setSlowMotionActive(false);

    // Reset restore state
    setShowRestorePrompt(false);
    setRestoreHasBeenUsed(false);
    setRestoreRequested(false);
    setRestoreCanRestore(true);

    // Campaign Chapter System - Reset game over distance info
    setGameOverDistanceInfo(null);

    // Ghost Pace Indicator - Load previous best distance for this level
    // Only show ghost for UNCOMPLETED levels (0 stars)
    // Once a level is completed (1+ stars), ghost is no longer needed
    const freshLevelStats = useGameStore.getState().levelStats;
    const freshLevelStars = useGameStore.getState().levelStars;
    const stats = freshLevelStats[levelConfig.id];
    const levelStarsCount = freshLevelStars[levelConfig.id] || 0;

    // Only set ghost distance if level is NOT completed
    if (levelStarsCount === 0) {
      const bestDist = stats?.bestDistance || 0;
      console.log('[Ghost] Loading best distance for UNCOMPLETED level', levelConfig.id, ':', bestDist);
      setPreviousBestDistance(bestDist);
    } else {
      // Level already completed - no ghost needed
      console.log('[Ghost] Level', levelConfig.id, 'already completed with', levelStarsCount, 'stars - no ghost');
      setPreviousBestDistance(0);
    }
    setHasPassedGhost(false);

    sessionStartTime.current = Date.now();
    currentLevelId.current = levelConfig.id;
  }, [levelStats]);

  // Campaign level completion handler (legacy score-based)
  const handleCampaignLevelComplete = useCallback((finalScore: number) => {
    if (!campaignLevelConfig) return;

    // Calculate stars based on score
    const [oneStar, twoStar, threeStar] = campaignLevelConfig.starThresholds;
    let stars = 0;
    if (finalScore >= threeStar) stars = 3;
    else if (finalScore >= twoStar) stars = 2;
    else if (finalScore >= oneStar) stars = 1;

    if (stars > 0) {
      // Check if next level will be newly unlocked - Requirements 13.1
      const currentLevelId = campaignLevelConfig.id;
      const nextLevelId = currentLevelId + 1;
      const wasNextLevelUnlocked = useGameStore.getState().completedLevels.includes(currentLevelId);

      // Update store with level completion
      const completeLevel = useGameStore.getState().completeLevel;
      completeLevel(campaignLevelConfig.id, stars);

      // Track newly unlocked level for animation - Requirements 13.1
      if (!wasNextLevelUnlocked && nextLevelId <= 100) {
        setJustCompletedLevel(currentLevelId);
        setNewlyUnlockedLevel(nextLevelId);
      }

      // Calculate and award shards
      const baseReward = campaignLevelConfig.rewards.echoShards;
      const starBonus = campaignLevelConfig.rewards.bonusPerStar * stars;
      const totalReward = baseReward + starBonus;
      addEchoShards(totalReward);
      setEarnedShards(totalReward);

      // Play celebration sound
      AudioSystem.playNewHighScore();
    }
  }, [campaignLevelConfig, addEchoShards]);

  // Campaign Update v2.5 - Distance-based level completion handler
  // Requirements: 2.2, 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3
  const handleDistanceLevelComplete = useCallback((result: {
    distanceTraveled: number;
    shardsCollected: number;
    totalShardsSpawned: number;
    damageTaken: number;
    healthRemaining: number;
  }) => {
    console.log('[App] handleDistanceLevelComplete called', result);
    if (!campaignLevelConfig) {
      console.error('[App] campaignLevelConfig is missing in callback!');
      return;
    }

    try {
      // Calculate star rating based on distance-mode criteria
      const levelResult = {
        completed: true,
        distanceTraveled: result.distanceTraveled,
        shardsCollected: result.shardsCollected,
        totalShardsAvailable: result.totalShardsSpawned,
        damageTaken: result.damageTaken,
        healthRemaining: result.healthRemaining,
      };

      const starRating = calculateStarRating(levelResult);
      const stars = starRating.stars;
      console.log('[App] Stars calculated:', stars);

      // Check if next level will be newly unlocked - Requirements 13.1
      const currentLevelId = campaignLevelConfig.id;
      const nextLevelId = currentLevelId + 1;
      const state = useGameStore.getState();
      const wasNextLevelUnlocked = state.completedLevels.includes(currentLevelId);

      console.log('[App] Completing level in store:', currentLevelId);
      // Update store with level completion
      state.completeLevel(campaignLevelConfig.id, stars);

      // Track newly unlocked level for animation - Requirements 13.1
      if (!wasNextLevelUnlocked && nextLevelId <= 100) {
        setJustCompletedLevel(currentLevelId);
        setNewlyUnlockedLevel(nextLevelId);
      }

      // Calculate reward using new formula - Requirements 9.1, 9.2, 9.3
      const rewardResult = calculateLevelReward(
        currentLevelId,
        stars,
        !state.completedLevels.includes(currentLevelId),
        state.levelStars[currentLevelId] || 0
      );

      console.log('[App] Reward calculated:', rewardResult);

      // Award Echo Shards
      if (rewardResult.totalReward > 0) {
        addEchoShards(rewardResult.totalReward);
        setEarnedShards(rewardResult.totalReward);
      }

      // Initializing Victory Data
      const victoryDataPayload = {
        levelId: currentLevelId,
        stars: stars,
        distanceTraveled: result.distanceTraveled,
        targetDistance: campaignLevelConfig.targetDistance,
        shardsEarned: rewardResult.totalReward,
        firstClearBonus: rewardResult.firstClearBonus,
        isFirstClear: rewardResult.isFirstClear,
      };
      console.log('[App] Setting Victory Data:', victoryDataPayload);

      setVictoryData(victoryDataPayload);

      // Play celebration sound
      AudioSystem.playNewHighScore(); // Ensure this doesn't throw

      // Update Game state LAST to ensure data is ready
      console.log('[App] Setting GameState to VICTORY');
      setGameState(GameState.VICTORY);
      setShowVictoryScreen(true);

    } catch (e) {
      console.error('[App] Error in handleDistanceLevelComplete:', e);
      // Fallback: try to just end the game
      setGameState(GameState.VICTORY);
    }
  }, [campaignLevelConfig, addEchoShards]);

  // Campaign Chapter System - Game over handler with distance info
  // Requirements: 6.1, 6.2, 6.3 - Pass distance traveled to game over screen
  // Note: Chapter is NOT unlocked on game over (only on level complete)
  const handleChapterGameOver = useCallback((result: {
    distanceTraveled: number;
    targetDistance: number;
    shardsCollected: number;
    damageTaken: number;
  }) => {
    console.log('[App] handleChapterGameOver called', result);
    // Store distance info for game over screen display
    setGameOverDistanceInfo(result);

    console.log('[Ghost] handleChapterGameOver called, distance:', result.distanceTraveled, 'campaignConfig:', campaignLevelConfig?.id);

    // Ghost Pace Indicator - Save best distance even on death
    // This allows the ghost marker to show on the next attempt
    if (campaignLevelConfig && result.distanceTraveled > 0) {
      const levelId = campaignLevelConfig.id;
      const currentStats = useGameStore.getState().levelStats[levelId];
      const currentBest = currentStats?.bestDistance || 0;

      console.log('[Ghost] Level:', levelId, 'Current best:', currentBest, 'This run:', result.distanceTraveled);

      // Only update if this attempt was better than previous best
      if (result.distanceTraveled > currentBest) {
        useGameStore.setState((state) => ({
          levelStats: {
            ...state.levelStats,
            [levelId]: {
              ...state.levelStats[levelId],
              bestDistance: result.distanceTraveled,
              bestShardsCollected: Math.max(
                state.levelStats[levelId]?.bestShardsCollected || 0,
                result.shardsCollected
              ),
              bestStars: state.levelStats[levelId]?.bestStars || 0,
              timesPlayed: (state.levelStats[levelId]?.timesPlayed || 0) + 1,
              firstClearBonus: state.levelStats[levelId]?.firstClearBonus || false,
            },
          },
        }));
        // Save to storage
        useGameStore.getState().saveToStorage();
        console.log('[Ghost] ✅ Saved new best distance:', result.distanceTraveled, 'for level', levelId);

        // Verify save
        const verifyStats = useGameStore.getState().levelStats[levelId];
        console.log('[Ghost] Verified stats after save:', verifyStats);
      } else {
        console.log('[Ghost] Not saving - current run not better than best');
      }
    } else {
      console.log('[Ghost] Not saving - no campaignConfig or distance is 0');
    }
  }, [campaignLevelConfig]);

  const handleClaimMission = useCallback((missionId: string) => {
    // Find the mission to show completion modal
    let mission = missions.soundCheck.missions.find(m => m.id === missionId);
    if (!mission) {
      mission = missions.daily.missions.find(m => m.id === missionId);
    }
    if (!mission && missions.marathon.mission?.id === missionId) {
      mission = missions.marathon.mission;
    }

    if (mission && mission.completed) {
      setCompletedMission(mission);
    }
  }, [missions]);

  const handleMissionRewardClaim = useCallback(() => {
    if (completedMission) {
      // completeMission handles XP and shard rewards internally
      // Level-up notification is handled by the syncRate useEffect
      completeMission(completedMission.id);
      setCompletedMission(null);
    }
  }, [completedMission, completeMission]);

  const handleMissionCompleteClose = useCallback(() => {
    setCompletedMission(null);
  }, []);

  // Numbers Mission handler - Start game with target distance
  const handleStartNumbersMission = useCallback((targetDistance: number, pokemonId?: string) => {
    console.log('[App] Starting Numbers Mission:', targetDistance, pokemonId);

    // Set Numbers Mission mode
    setNumbersMissionMode({ enabled: true, targetDistance, pokemonId });

    // Initialize game
    AudioSystem.initialize();
    AudioSystem.playGameStart();

    setGameState(GameState.MENU);
    setScore(0);
    setEarnedShards(0);
    setTargetDistance(targetDistance);
    setCurrentDistance(0);
    setProgressPercent(0);
    setIsNearFinish(false);
    setIsLevelCompleting(false);

    // Initialize slow motion
    const effects = getActiveUpgradeEffects();
    setSlowMotionUsesRemaining(effects.slowMotionUses);
    setSlowMotionActive(false);

    // Reset restore state
    setShowRestorePrompt(false);
    setRestoreHasBeenUsed(false);
    setRestoreRequested(false);
    setRestoreCanRestore(true);

    // Clear campaign mode
    setCampaignLevelConfig(null);

    // Start playing - use queueMicrotask to prevent visible MENU state flash
    queueMicrotask(() => {
      setGameState(GameState.PLAYING);
    });

    sessionStartTime.current = Date.now();
  }, []);

  // Numbers Mission completion handler
  const handleNumbersMissionComplete = useCallback(() => {
    if (!numbersMissionMode) return;

    console.log('[App] Numbers Mission completed!');

    // Show victory screen (the hook will handle rewards)
    setShowNumbersMissionVictory(true);
    setNumbersMissionVictoryData({
      number: numbersMissionMode.targetDistance,
      text: 'Mission target reached!', // This will be replaced by the actual API text from the hook
      distanceTraveled: currentDistance,
    });

    // Clear mission mode
    setNumbersMissionMode(null);
    setGameState(GameState.MENU);
  }, [numbersMissionMode, currentDistance]);

  // Check if Numbers Mission target reached during gameplay
  useEffect(() => {
    if (
      numbersMissionMode?.enabled &&
      gameState === GameState.PLAYING &&
      currentDistance >= numbersMissionMode.targetDistance &&
      !isLevelCompleting
    ) {
      setIsLevelCompleting(true);
      handleNumbersMissionComplete();
    }
  }, [currentDistance, numbersMissionMode, gameState, isLevelCompleting, handleNumbersMissionComplete]);

  // Mission event handler from GameEngine - Requirements 7.1-7.5
  const handleMissionEvent = useCallback((event: MissionEvent) => {
    processMissionEvent(event);

    // Check if any mission just completed and show notification
    // This is handled by the mission panel UI
  }, [processMissionEvent]);

  // Daily reward claim handler - Requirements 5.1
  const handleClaimDailyReward = useCallback(() => {
    const result = claimDailyReward();
    if (result.claimed) {
      setDailyRewardAmount(result.amount);
      setShowDailyRewardClaim(false);
      // Show a brief notification (could be enhanced with a modal)
      console.log(`Daily reward claimed: ${result.amount} shards`);
    }
  }, [claimDailyReward]);

  // Rate Us System handlers - Requirements 6.3, 6.4, 6.5, 6.6
  const handleRatePositive = useCallback(() => {
    // Requirements 6.4: Open app store rating page
    getRateUsSystem().markRated();
    setShowRatePrompt(false);
    // Open app store - in a real app, this would use a native plugin
    // For web, we can open a feedback URL or just close the prompt
    window.open("https://play.google.com/store/apps", "_blank");
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
        onDashStateUpdate={handleDashStateUpdate}
        onQuantumLockStateUpdate={handleQuantumLockStateUpdate}
        campaignMode={React.useMemo(() => campaignLevelConfig ? {
          enabled: true,
          levelConfig: campaignLevelConfig,
          targetScore: campaignLevelConfig.targetScore,
          // Campaign Update v2.5 - Enable distance-based mode
          useDistanceMode: true,
          targetDistance: campaignLevelConfig.targetDistance,
          onLevelComplete: handleCampaignLevelComplete,
          onDistanceLevelComplete: handleDistanceLevelComplete,
          onDistanceUpdate: (current: number, target: number, percent: number) => {
            setCurrentDistance(current);
            setTargetDistance(target);
            setProgressPercent(percent);
            setIsNearFinish(target - current <= 50 && target - current > 0);
          },
          // Campaign Chapter System - Game over callback with distance info
          // Requirements: 6.1, 6.2, 6.3
          onChapterGameOver: handleChapterGameOver,
        } : undefined, [campaignLevelConfig, handleCampaignLevelComplete, handleDistanceLevelComplete, handleChapterGameOver])}
        dailyChallengeMode={dailyChallengeMode}
        restoreMode={restoreMode}
        restoreRequested={restoreRequested}
        onRestoreStateUpdate={handleRestoreStateUpdate}
        onMissionEvent={handleMissionEvent}
        tutorialMode={interactiveTutorialMode ? { enabled: true } : undefined}
        onTutorialComplete={handleInteractiveTutorialComplete}
        onTutorialPhaseChange={handleTutorialPhaseChange}
      />
      <GameUI
        gameState={gameState}
        score={score}
        highScore={highScore}
        speed={gameSpeed}
        onStart={handleStart}
        onRestart={() => {
          // Reset game state first to ensure clean restart
          setScore(0);
          setEarnedShards(0);
          setCurrentDistance(0);
          setProgressPercent(0);
          setIsNearFinish(false);
          setGameOverDistanceInfo(null);

          // If in campaign mode, restart the same level
          if (campaignLevelConfig) {
            // Reset to MENU briefly to trigger full game reset, then start level
            setGameState(GameState.MENU);
            // Use setTimeout to ensure state is cleared before starting new game
            setTimeout(() => {
              handleSelectCampaignLevel(campaignLevelConfig);
            }, 50);
          } else {
            // Fallback to campaign map if no level selected
            setGameState(GameState.MENU);
            setShowCampaignMap(true);
          }
        }}
        onPause={handlePause}
        onResume={handleResume}
        onMainMenu={handleMainMenu}
        onOpenShop={handleOpenShop}
        onOpenStudio={handleOpenStudio}
        onOpenDailyChallenge={handleOpenDailyChallenge}
        onOpenMissions={handleOpenMissionPanel}
        onOpenRituals={handleOpenRituals}
        rhythmMultiplier={rhythmMultiplier}
        rhythmStreak={rhythmStreak}
        nearMissStreak={nearMissStreak}
        echoShards={echoShards}
        earnedShards={earnedShards}
        slowMotionUsesRemaining={slowMotionUsesRemaining}
        slowMotionActive={slowMotionActive}
        onActivateSlowMotion={handleActivateSlowMotion}
        syncRate={syncRate}
        totalXP={totalXP}
        lastLoginDate={lastLoginDate}
        onClaimDailyReward={handleClaimDailyReward}
        soundCheckComplete={soundCheckComplete}
        // Campaign Update v2.5 - Distance Mode props - Requirements 6.1, 6.2, 6.3, 6.4
        distanceMode={!!campaignLevelConfig}
        currentDistance={currentDistance}
        targetDistance={targetDistance}
        progressPercent={progressPercent}
        isNearFinish={isNearFinish}
        // Ghost Pace Indicator - Requirements 15.1, 15.3
        previousBestDistance={previousBestDistance}
        hasPassedGhost={hasPassedGhost}
        // Phase Dash
        dashEnergy={dashEnergy}
        dashActive={dashActive}
        dashRemainingPercent={dashRemainingPercent}
        isQuantumLockActive={isQuantumLockActive}
        glitchPhase={glitchPhase}
        // Tutorial Mode - Level 0
        tutorialMode={interactiveTutorialMode}
      />
      <Shop isOpen={isShopOpen} onClose={handleCloseShop} />
      <ThemeCreatorModal isOpen={isStudioOpen} onClose={handleCloseStudio} />
      {/* Chapter Notification - Shows current level at game start */}
      {showChapterNotification && gameState === GameState.PLAYING && (
        <ChapterNotification
          levelId={chapterNotificationLevel}
          onComplete={() => setShowChapterNotification(false)}
        />
      )}
      {/* Victory Screen - Level Complete */}
      {showVictoryScreen && victoryData && (
        <VictoryScreen
          levelId={victoryData.levelId}
          stars={victoryData.stars}
          distanceTraveled={victoryData.distanceTraveled}
          targetDistance={victoryData.targetDistance}
          shardsEarned={victoryData.shardsEarned}
          firstClearBonus={victoryData.firstClearBonus}
          isFirstClear={victoryData.isFirstClear}
          onRestart={() => {
            setShowVictoryScreen(false);
            setVictoryData(null);
            if (campaignLevelConfig) {
              handleSelectCampaignLevel(campaignLevelConfig);
            }
          }}
          onNextLevel={() => {
            setShowVictoryScreen(false);
            setVictoryData(null);
            // Go to next level
            const nextLevelId = victoryData.levelId + 1;
            if (nextLevelId <= 100) {
              const nextLevel = getLevelById(nextLevelId);
              if (nextLevel) {
                handleSelectCampaignLevel(nextLevel);
              }
            } else {
              // All levels complete, go to menu
              setGameState(GameState.MENU);
              setShowCampaignMap(true);
            }
          }}
          onMainMenu={() => {
            setShowVictoryScreen(false);
            setVictoryData(null);
            setCampaignLevelConfig(null);
            setGameState(GameState.MENU);
            setShowCampaignMap(true);
          }}
        />
      )}
      <DailyChallenge
        isOpen={isDailyChallengeOpen}
        onClose={handleCloseDailyChallenge}
        onStartChallenge={handleStartDailyChallenge}
      />
      {/* Tutorial Overlay - Requirements 17.1, 17.2 */}
      {showTutorial && (
        <TutorialOverlay onTutorialComplete={handleTutorialComplete} />
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
      {/* Mission Panel - Numbers Mission Only */}
      {showMissionPanel && (
        <MissionPanel
          missionState={missions}
          soundCheckComplete={soundCheckComplete}
          onClaimMission={handleClaimMission}
          onClose={handleCloseMissionPanel}
          onStartNumbersMission={handleStartNumbersMission}
        />
      )}
      {/* Numbers Mission Victory Screen */}
      {showNumbersMissionVictory && numbersMissionVictoryData && (
        <NumbersMissionVictory
          mission={{
            number: numbersMissionVictoryData.number,
            text: numbersMissionVictoryData.text,
            fetchedAt: Date.now(),
          }}
          distanceTraveled={numbersMissionVictoryData.distanceTraveled}
          onClaim={() => {
            setShowNumbersMissionVictory(false);
            setNumbersMissionVictoryData(null);
            // Rewards are handled by the hook
          }}
          onPlayAgain={() => {
            setShowNumbersMissionVictory(false);
            setNumbersMissionVictoryData(null);
            setShowMissionPanel(true); // Open mission panel to start new mission
          }}
          onMainMenu={() => {
            setShowNumbersMissionVictory(false);
            setNumbersMissionVictoryData(null);
          }}
        />
      )}
      {/* Mission Complete Modal - Requirements 2.5, 3.3 */}
      {completedMission && (
        <MissionComplete
          mission={completedMission}
          onClose={handleMissionCompleteClose}
          onClaim={handleMissionRewardClaim}
        />
      )}
      {/* Daily Rituals Panel */}
      {showRitualsPanel && (
        <RitualsPanel
          state={ritualsState}
          onClaimBonus={handleClaimRitualBonus}
          onClose={handleCloseRituals}
        />
      )}
      {/* Campaign Level Map */}
      {showCampaignMap && (
        <LevelMap
          isOpen={showCampaignMap}
          onClose={handleCloseCampaign}
          onSelectLevel={handleSelectCampaignLevel}
          newlyUnlockedLevel={newlyUnlockedLevel}
          justCompletedLevel={justCompletedLevel}
          onStartTutorial={() => {
            setShowCampaignMap(false);
            handleStartInteractiveTutorial();
          }}
        />
      )}
      {/* Daily Reward Claim Modal - Requirements 5.1 */}
      {showDailyRewardClaim && gameState === GameState.MENU && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-gradient-to-b from-yellow-900/90 to-black rounded-2xl border border-yellow-500/30 overflow-hidden shadow-[0_0_40px_rgba(255,200,0,0.2)]">
            {/* Header */}
            <div className="p-6 text-center">
              <div className="inline-flex p-4 rounded-full bg-yellow-500/20 ring-2 ring-yellow-500/50 mb-4">
                <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-yellow-400 tracking-wider mb-2">
                GÜNLÜK ÖDÜL
              </h2>
              <p className="text-white/60 text-sm">
                Tekrar hoş geldin! Günlük giriş bonusunu al.
              </p>
            </div>

            {/* Reward Display */}
            <div className="px-6 pb-4">
              <div className="p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20 text-center">
                <p className="text-xs text-white/50 mb-2">Senkron Oranı {syncRate} bazında</p>
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                  <span className="text-4xl font-black text-cyan-400">
                    +{(() => {
                      // Calculate reward based on level
                      if (syncRate < 10) return 100 + 10 * syncRate;
                      if (syncRate < 50) return 200 + 8 * (syncRate - 10);
                      return 600 + 5 * (syncRate - 50);
                    })().toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-cyan-400/70 mt-1">Eko Parçası</p>
              </div>
            </div>

            {/* Claim Button */}
            <div className="p-6 pt-2">
              <button
                onClick={handleClaimDailyReward}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 text-black font-black text-sm tracking-[0.2em] hover:shadow-[0_0_25px_rgba(255,200,0,0.4)] active:scale-[0.98] transition-all"
              >
                ÖDÜLÜ AL
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Level Up Notification - Requirements 4.3 */}
      {showLevelUpNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.4)]">
            <p className="text-black font-black text-lg tracking-wider">
              SEVİYE ATLADI! SENKRON ORANI {newLevel}
            </p>
          </div>
        </div>
      )}
      {/* Sound Check Complete Celebration - Requirements 1.5 */}
      {showSyncComplete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center animate-pulse">
            <p className="text-4xl font-black text-green-400 tracking-[0.3em] drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]">
              SENKRON TAMAM
            </p>
            <p className="text-lg text-white/70 mt-2">
              Günlük Görevler Açıldı!
            </p>
          </div>
        </div>
      )}
      {/* Game Start Notification - Active Ritual Reminder */}
      {gameStartNotification && gameState === GameState.PLAYING && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down pointer-events-none">
          <div className="px-6 py-3 bg-gradient-to-r from-purple-900/90 to-purple-800/90 backdrop-blur-md rounded-xl border border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            <p className="text-white font-bold text-sm tracking-wide whitespace-nowrap">
              {gameStartNotification}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

