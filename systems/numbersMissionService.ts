/**
 * Numbers Mission Service - Epic Edition
 * Fetches random number trivia from Numbers API and processes it
 * through the EpicMissionEngine for professional Echo Shift narrative
 * 
 * Features:
 * - Year mode for historical dates (200-2025)
 * - Trivia mode for larger numbers (2025-5000)
 * - Intelligent boring text detection and replacement
 * - Professional archive-style text formatting
 */

import {
    generateFallbackEpicFact,
    getApiType,
    processEpicMissionText
} from './EpicMissionEngine';

export interface NumbersMissionData {
    number: number;
    text: string;
    fetchedAt: number;
    category?: string; // Archive category type
}

// Trial Pokémon available during Numbers Mission
export const TRIAL_POKEMON = [
    { id: 'pidgey', name: 'Pidgey', type: 'flying' },
    { id: 'rattata', name: 'Rattata', type: 'normal' },
    { id: 'caterpie', name: 'Caterpie', type: 'bug' },
    { id: 'weedle', name: 'Weedle', type: 'poison' },
    { id: 'zubat', name: 'Zubat', type: 'flying' },
] as const;

/**
 * Generate a random number between min and max (inclusive)
 */
function getRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Fetch a random mission from Numbers API
 * Uses year endpoint for 200-2025, trivia for larger numbers
 * Processes all responses through EpicMissionEngine
 */
export async function fetchNumbersMission(): Promise<NumbersMissionData> {
    const randomNumber = getRandomNumber(200, 5000);
    const apiType = getApiType(randomNumber);

    try {
        // Use year endpoint for historical dates, trivia for larger numbers
        const response = await fetch(
            `http://numbersapi.com/${randomNumber}/${apiType}?json`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                // 5 second timeout
                signal: AbortSignal.timeout(5000),
            }
        );

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        const rawText = data.text || '';

        // Process through EpicMissionEngine for professional formatting
        const epicText = processEpicMissionText(data.number || randomNumber, rawText);

        return {
            number: data.number || randomNumber,
            text: epicText,
            fetchedAt: Date.now(),
        };
    } catch (error) {
        console.warn('[NumbersMission] API fetch failed, using Epic fallback:', error);

        // Generate epic fallback using EpicMissionEngine
        return {
            number: randomNumber,
            text: generateFallbackEpicFact(randomNumber),
            fetchedAt: Date.now(),
        };
    }
}

/**
 * Mission rewards configuration
 */
export const NUMBERS_MISSION_REWARDS = {
    xp: 100,
    gems: 50,
} as const;

/**
 * Cooldown configuration (in milliseconds)
 */
export const NUMBERS_MISSION_COOLDOWN = 60 * 1000; // 60 seconds

/**
 * Check if cooldown has expired
 */
export function isCooldownExpired(cooldownUntil: number | null): boolean {
    if (!cooldownUntil) return true;
    return Date.now() >= cooldownUntil;
}

/**
 * Get remaining cooldown time in seconds
 */
export function getRemainingCooldown(cooldownUntil: number | null): number {
    if (!cooldownUntil) return 0;
    const remaining = cooldownUntil - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
}
