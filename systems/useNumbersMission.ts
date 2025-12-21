/**
 * useNumbersMission Hook
 * Manages Numbers Mission state, cooldown timer, and API fetching
 */

import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { NumbersMissionData, NumbersMissionState } from '../types';
import {
    fetchNumbersMission,
    getRemainingCooldown,
    isCooldownExpired,
    NUMBERS_MISSION_COOLDOWN,
    NUMBERS_MISSION_REWARDS,
    TRIAL_POKEMON,
} from './numbersMissionService';

const STORAGE_KEY = 'echo-shift-numbers-mission';

interface StoredMissionState {
    cooldownUntil: number | null;
    lastMission: NumbersMissionData | null;
    lockedMission: NumbersMissionData | null;
}

/**
 * Load mission state from localStorage
 */
function loadMissionState(): StoredMissionState {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('[useNumbersMission] Failed to load state:', e);
    }
    return { cooldownUntil: null, lastMission: null, lockedMission: null };
}

/**
 * Save mission state to localStorage
 */
function saveMissionState(state: StoredMissionState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('[useNumbersMission] Failed to save state:', e);
    }
}

/**
 * Hook for managing the cooldown timer
 */
export function useMissionTimer(cooldownUntil: number | null) {
    const [timeLeft, setTimeLeft] = useState(() => getRemainingCooldown(cooldownUntil));
    const [isOnCooldown, setIsOnCooldown] = useState(() => !isCooldownExpired(cooldownUntil));

    useEffect(() => {
        if (!cooldownUntil) {
            setTimeLeft(0);
            setIsOnCooldown(false);
            return;
        }

        const updateTimer = () => {
            const remaining = getRemainingCooldown(cooldownUntil);
            setTimeLeft(remaining);
            setIsOnCooldown(remaining > 0);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [cooldownUntil]);

    return { timeLeft, isOnCooldown };
}

/**
 * Main hook for Numbers Mission system
 */
export function useNumbersMission() {
    // Load stored state
    const stored = loadMissionState();

    // Locked mission state
    const [isLocked, setIsLocked] = useState<boolean>(() => stored.lockedMission !== null);
    const [lockedMission, setLockedMission] = useState<NumbersMissionData | null>(() => stored.lockedMission);

    // State
    const [missionState, setMissionState] = useState<NumbersMissionState>(() => {
        return {
            isActive: false,
            isAvailable: isCooldownExpired(stored.cooldownUntil),
            currentMission: stored.lockedMission, // Load locked mission if exists
            currentDistance: 0,
            cooldownUntil: stored.cooldownUntil,
            isCompleted: false,
            selectedTrialPokemon: null,
        };
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Timer hook
    const { timeLeft, isOnCooldown } = useMissionTimer(missionState.cooldownUntil);

    // Keep mission state synced with cooldown
    useEffect(() => {
        if (!isOnCooldown && !missionState.isAvailable && !missionState.isActive) {
            setMissionState(prev => ({
                ...prev,
                isAvailable: true,
            }));
        }
    }, [isOnCooldown, missionState.isAvailable, missionState.isActive]);

    /**
     * Fetch a new mission from API
     */
    const fetchMission = useCallback(async () => {
        if (isOnCooldown) {
            setError('Bekleme süresi devam ediyor');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const missionData = await fetchNumbersMission();
            setMissionState(prev => ({
                ...prev,
                currentMission: missionData,
                isAvailable: true,
            }));
            return missionData;
        } catch (e) {
            setError('Görev yüklenemedi');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [isOnCooldown]);

    /**
     * Start the mission with selected trial Pokemon
     */
    const startMission = useCallback((trialPokemonId?: string) => {
        if (!missionState.currentMission) {
            setError('Önce bir görev yüklemelisiniz');
            return false;
        }

        setMissionState(prev => ({
            ...prev,
            isActive: true,
            isAvailable: false,
            currentDistance: 0,
            isCompleted: false,
            selectedTrialPokemon: trialPokemonId || null,
        }));

        return true;
    }, [missionState.currentMission]);

    /**
     * Update distance progress during gameplay
     */
    const updateDistance = useCallback((distance: number) => {
        setMissionState(prev => {
            if (!prev.isActive || !prev.currentMission) return prev;

            const targetReached = distance >= prev.currentMission.number;

            return {
                ...prev,
                currentDistance: distance,
                isCompleted: targetReached,
                isActive: !targetReached,
            };
        });
    }, []);

    /**
     * Complete the mission and claim rewards
     */
    const completeMission = useCallback(() => {
        const cooldownUntil = Date.now() + NUMBERS_MISSION_COOLDOWN;

        setMissionState(prev => ({
            ...prev,
            isActive: false,
            isAvailable: false,
            isCompleted: false,
            cooldownUntil,
            selectedTrialPokemon: null,
        }));

        // Clear locked mission after completion
        setIsLocked(false);
        setLockedMission(null);

        // Persist cooldown and clear lock
        saveMissionState({
            cooldownUntil,
            lastMission: missionState.currentMission,
            lockedMission: null,
        });

        // Distribute rewards via gameStore
        const { addEchoShards, addXP } = useGameStore.getState();
        addEchoShards(NUMBERS_MISSION_REWARDS.gems);
        addXP(NUMBERS_MISSION_REWARDS.xp);

        return NUMBERS_MISSION_REWARDS;
    }, [missionState.currentMission]);

    /**
     * Cancel the current mission (e.g., game over before reaching target)
     */
    const cancelMission = useCallback(() => {
        setMissionState(prev => ({
            ...prev,
            isActive: false,
            isAvailable: true,
            currentDistance: 0,
            isCompleted: false,
            selectedTrialPokemon: null,
        }));
    }, []);

    /**
     * Reset mission state (for testing/debugging)
     */
    const resetMission = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setMissionState({
            isActive: false,
            isAvailable: true,
            currentMission: null,
            currentDistance: 0,
            cooldownUntil: null,
            isCompleted: false,
            selectedTrialPokemon: null,
        });
    }, []);

    /**
     * Lock current mission to prevent auto-fetch
     */
    const lockMission = useCallback(() => {
        if (!missionState.currentMission) return;

        setIsLocked(true);
        setLockedMission(missionState.currentMission);

        // Persist locked mission
        const stored = loadMissionState();
        saveMissionState({
            ...stored,
            lockedMission: missionState.currentMission,
        });
    }, [missionState.currentMission]);

    /**
     * Unlock mission to allow new fetch
     */
    const unlockMission = useCallback(() => {
        setIsLocked(false);
        setLockedMission(null);

        // Clear locked mission from storage
        const stored = loadMissionState();
        saveMissionState({
            ...stored,
            lockedMission: null,
        });
    }, []);

    return {
        // State
        missionState,
        isLoading,
        error,
        timeLeft,
        isOnCooldown,
        isLocked,

        // Mission data
        currentMission: missionState.currentMission,
        currentDistance: missionState.currentDistance,
        targetDistance: missionState.currentMission?.number ?? 0,
        progress: missionState.currentMission
            ? Math.min(1, missionState.currentDistance / missionState.currentMission.number)
            : 0,

        // Trial Pokemon
        trialPokemon: TRIAL_POKEMON,
        selectedTrialPokemon: missionState.selectedTrialPokemon,

        // Rewards
        rewards: NUMBERS_MISSION_REWARDS,

        // Actions
        fetchMission,
        startMission,
        updateDistance,
        completeMission,
        cancelMission,
        resetMission,
        lockMission,
        unlockMission,
    };
}
