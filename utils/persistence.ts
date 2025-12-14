/**
 * localStorage Persistence Adapter
 * Provides safe JSON serialization/deserialization with error handling and fallback
 * Requirements: 1.3, 1.4, 18.4, 18.5
 */

// In-memory fallback storage when localStorage is unavailable
const memoryStorage = new Map<string, unknown>();

/**
 * Safely persist data to localStorage with JSON serialization
 * Falls back to in-memory storage if localStorage is unavailable
 * @param key - Storage key
 * @param data - Data to persist
 * @returns true if persisted to localStorage, false if using fallback
 */
export function safePersist(key: string, data: unknown): boolean {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.warn(`[Persistence] localStorage unavailable for key "${key}", using memory storage:`, error);
    memoryStorage.set(key, data);
    return false;
  }
}

/**
 * Safely load data from localStorage with JSON deserialization
 * Falls back to in-memory storage if localStorage is unavailable
 * @param key - Storage key
 * @param defaultValue - Default value if key doesn't exist or data is corrupted
 * @returns Parsed data or default value
 */
export function safeLoad<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      // Check memory fallback
      if (memoryStorage.has(key)) {
        return memoryStorage.get(key) as T;
      }
      return defaultValue;
    }
    
    const parsed = JSON.parse(stored);
    return validateData(parsed, defaultValue);
  } catch (error) {
    console.error(`[Persistence] Failed to load key "${key}", returning default:`, error);
    // Try memory fallback
    if (memoryStorage.has(key)) {
      return memoryStorage.get(key) as T;
    }
    return defaultValue;
  }
}

/**
 * Validate loaded data structure against default value
 * Ensures data integrity after deserialization
 * @param data - Parsed data from storage
 * @param defaultValue - Default value with expected structure
 * @returns Validated data or default if validation fails
 */
function validateData<T>(data: unknown, defaultValue: T): T {
  if (data === null || data === undefined) {
    return defaultValue;
  }
  
  // For primitive types, just return the data
  if (typeof defaultValue !== 'object' || defaultValue === null) {
    return data as T;
  }
  
  // For objects, ensure it's an object
  if (typeof data !== 'object') {
    console.warn('[Persistence] Data type mismatch, returning default');
    return defaultValue;
  }
  
  return data as T;
}

/**
 * Remove a key from storage
 * @param key - Storage key to remove
 */
export function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Persistence] Failed to remove key "${key}":`, error);
  }
  memoryStorage.delete(key);
}

/**
 * Clear all game-related storage
 * @param prefix - Optional prefix to filter keys (default: 'echo-shift-')
 */
export function safeClear(prefix: string = 'echo-shift-'): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('[Persistence] Failed to clear localStorage:', error);
  }
  
  // Clear memory storage with prefix
  const memoryKeys = Array.from(memoryStorage.keys());
  memoryKeys.forEach(key => {
    if (key.startsWith(prefix)) {
      memoryStorage.delete(key);
    }
  });
}

/**
 * Check if localStorage is available
 * @returns true if localStorage is available and working
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Storage keys constants
export const STORAGE_KEYS = {
  GAME_STATE: 'echo-shift-game-state',
  ECHO_SHARDS: 'echo-shift-echo-shards',
  INVENTORY: 'echo-shift-inventory',
  EQUIPPED: 'echo-shift-equipped',
  CAMPAIGN: 'echo-shift-campaign',
  SETTINGS: 'echo-shift-settings',
  GHOST_DATA: 'echo-shift-ghost',
  DAILY_CHALLENGE: 'echo-shift-daily',
  LEADERBOARD: 'echo-shift-leaderboard',
  // Progression System Keys - Requirements 8.1
  MISSIONS: 'echo-shift-missions',
  SYNC_RATE: 'echo-shift-sync-rate',
  LAST_LOGIN: 'echo-shift-last-login',
} as const;
