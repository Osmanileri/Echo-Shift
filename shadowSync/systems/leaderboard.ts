/**
 * Leaderboard System (localStorage-based)
 * Requirements: 14.1, 14.3, 14.4, 14.5
 */

import { safePersist, safeLoad, STORAGE_KEYS } from '../utils/persistence';

/**
 * Leaderboard entry interface
 */
export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  submissionDate: string; // ISO date string
}

/**
 * Time period filter for leaderboard
 */
export type LeaderboardPeriod = 'weekly' | 'allTime';

/**
 * Maximum number of entries to store/display
 */
const MAX_ENTRIES = 100;

/**
 * Generate a unique ID for a leaderboard entry
 */
function generateEntryId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the start of the current week (Monday 00:00:00)
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Monday (day 1), if Sunday (day 0), go back 6 days
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check if a date is within the current week
 */
export function isWithinCurrentWeek(dateString: string): boolean {
  const entryDate = new Date(dateString);
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  return entryDate >= weekStart && entryDate < weekEnd;
}

/**
 * Load all leaderboard entries from storage
 */
export function loadLeaderboard(): LeaderboardEntry[] {
  return safeLoad<LeaderboardEntry[]>(STORAGE_KEYS.LEADERBOARD, []);
}

/**
 * Save leaderboard entries to storage
 */
export function saveLeaderboard(entries: LeaderboardEntry[]): boolean {
  return safePersist(STORAGE_KEYS.LEADERBOARD, entries);
}

/**
 * Add a new score to the leaderboard
 * Returns the entry if added, null if score didn't qualify
 */
export function addScore(playerName: string, score: number): LeaderboardEntry | null {
  if (!playerName || playerName.trim() === '') {
    console.warn('[Leaderboard] Invalid player name');
    return null;
  }
  
  if (score < 0 || !Number.isFinite(score)) {
    console.warn('[Leaderboard] Invalid score');
    return null;
  }
  
  const entries = loadLeaderboard();
  
  const newEntry: LeaderboardEntry = {
    id: generateEntryId(),
    playerName: playerName.trim(),
    score: Math.floor(score),
    submissionDate: new Date().toISOString(),
  };
  
  // Add new entry and sort by score descending
  entries.push(newEntry);
  entries.sort((a, b) => b.score - a.score);
  
  // Keep only top MAX_ENTRIES
  const trimmedEntries = entries.slice(0, MAX_ENTRIES);
  
  // Check if our entry made it into the top 100
  const entryIncluded = trimmedEntries.some(e => e.id === newEntry.id);
  
  if (entryIncluded) {
    saveLeaderboard(trimmedEntries);
    return newEntry;
  }
  
  return null;
}

/**
 * Get top scores with optional period filter
 * Requirements: 14.1, 14.4, 14.5
 */
export function getTopScores(
  period: LeaderboardPeriod = 'allTime',
  limit: number = MAX_ENTRIES
): LeaderboardEntry[] {
  const entries = loadLeaderboard();
  
  let filtered: LeaderboardEntry[];
  
  if (period === 'weekly') {
    // Filter to current week only (Requirement 14.4)
    filtered = entries.filter(entry => isWithinCurrentWeek(entry.submissionDate));
  } else {
    // All Time - no date filtering (Requirement 14.5)
    filtered = entries;
  }
  
  // Sort by score descending and limit
  return filtered
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(limit, MAX_ENTRIES));
}

/**
 * Filter entries by period
 * Requirements: 14.4, 14.5
 */
export function filterByPeriod(
  entries: LeaderboardEntry[],
  period: LeaderboardPeriod
): LeaderboardEntry[] {
  if (period === 'weekly') {
    return entries.filter(entry => isWithinCurrentWeek(entry.submissionDate));
  }
  // All Time - return all entries
  return entries;
}

/**
 * Get a player's rank for a given score
 * Returns 1-based rank, or null if not in top 100
 */
export function getPlayerRank(
  score: number,
  period: LeaderboardPeriod = 'allTime'
): number | null {
  const entries = getTopScores(period);
  
  // Find position where this score would rank
  const rank = entries.findIndex(entry => score > entry.score);
  
  if (rank === -1) {
    // Score is lower than all entries
    if (entries.length < MAX_ENTRIES) {
      return entries.length + 1;
    }
    return null;
  }
  
  return rank + 1;
}

/**
 * Check if a score qualifies for the leaderboard
 */
export function isQualifyingScore(score: number): boolean {
  const entries = loadLeaderboard();
  
  if (entries.length < MAX_ENTRIES) {
    return true;
  }
  
  // Check if score beats the lowest entry
  const lowestScore = entries[entries.length - 1]?.score ?? 0;
  return score > lowestScore;
}

/**
 * Clear all leaderboard entries (for testing/reset)
 */
export function clearLeaderboard(): void {
  saveLeaderboard([]);
}
