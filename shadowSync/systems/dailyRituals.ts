// systems/dailyRituals.ts
// Daily Rituals System for Echo Shift Engagement Update
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13
// Analytics Integration: Requirements 5.5

import { RitualDefinition, RitualType, RITUAL_POOL, BONUS_REWARD } from '../data/rituals';

export interface RitualProgress {
  ritualId: string;
  current: number;
  target: number;
  completed: boolean;
  completedAt?: number;
}

export interface DailyRitualsState {
  date: string;                    // YYYY-MM-DD
  rituals: RitualProgress[];
  allCompleted: boolean;
  bonusClaimed: boolean;
}

export interface DailyRitualsSystem {
  state: DailyRitualsState;
  
  generateRituals: (date: Date) => RitualDefinition[];
  updateProgress: (type: RitualType, value: number) => void;
  completeRitual: (ritualId: string) => number;
  claimBonus: () => number;
  checkDayChange: () => boolean;
  reset: () => void;
  
  serialize: () => string;
  deserialize: (data: string) => DailyRitualsState;
  
  // Analytics callback - Requirements 5.5
  onRitualComplete?: (ritualId: string, completionTime: number) => void;
}

const STORAGE_KEY = 'echo_shift_daily_rituals';

// Seeded random for deterministic ritual generation
export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export function dateToSeed(date: Date): number {
  const dateStr = date.toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}


function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Generate 3 rituals for a given date using seeded random
export function generateRituals(date: Date): RitualDefinition[] {
  const seed = dateToSeed(date);
  const random = seededRandom(seed);
  
  // Shuffle pool using Fisher-Yates with seeded random
  const shuffled = [...RITUAL_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return first 3 rituals
  return shuffled.slice(0, 3);
}

function createInitialState(date: Date): DailyRitualsState {
  const rituals = generateRituals(date);
  return {
    date: formatDate(date),
    rituals: rituals.map(r => ({
      ritualId: r.id,
      current: 0,
      target: r.target,
      completed: false,
    })),
    allCompleted: false,
    bonusClaimed: false,
  };
}

export function createDailyRitualsSystem(): DailyRitualsSystem {
  let state: DailyRitualsState = createInitialState(new Date());
  
  // Try to load from localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DailyRitualsState;
      // Validate and use if same day
      if (parsed.date === formatDate(new Date())) {
        state = parsed;
      }
    }
  } catch {
    // Use fresh state on error
  }
  
  const system: DailyRitualsSystem = {
    state,
    
    // Analytics callback - Requirements 5.5
    onRitualComplete: undefined,
    
    generateRituals,
    
    updateProgress(type: RitualType, value: number): void {
      // Find ritual definition by type
      const ritualDef = RITUAL_POOL.find(r => r.type === type);
      if (!ritualDef) return;
      
      // Find matching progress entry
      const progress = this.state.rituals.find(p => {
        const def = RITUAL_POOL.find(r => r.id === p.ritualId);
        return def?.type === type;
      });
      
      if (!progress || progress.completed) return;
      
      // Update progress, capped at target
      progress.current = Math.min(progress.current + value, progress.target);
      
      // Check if completed
      if (progress.current >= progress.target && !progress.completed) {
        progress.completed = true;
        progress.completedAt = Date.now();
      }
      
      // Check if all completed
      this.state.allCompleted = this.state.rituals.every(r => r.completed);
      
      // Persist
      this.serialize();
    },

    
    completeRitual(ritualId: string): number {
      const progress = this.state.rituals.find(p => p.ritualId === ritualId);
      if (!progress || progress.completed) return 0;
      
      const ritualDef = RITUAL_POOL.find(r => r.id === ritualId);
      if (!ritualDef) return 0;
      
      const completionTime = Date.now();
      progress.completed = true;
      progress.completedAt = completionTime;
      progress.current = progress.target;
      
      // Check if all completed
      this.state.allCompleted = this.state.rituals.every(r => r.completed);
      
      // Persist
      this.serialize();
      
      // Analytics: Log ritual complete event - Requirements 5.5
      // Note: Analytics is logged via callback to avoid circular dependency
      if (this.onRitualComplete) {
        this.onRitualComplete(ritualId, completionTime);
      }
      
      return ritualDef.reward;
    },
    
    claimBonus(): number {
      if (!this.state.allCompleted || this.state.bonusClaimed) {
        return 0;
      }
      
      this.state.bonusClaimed = true;
      this.serialize();
      
      return BONUS_REWARD;
    },
    
    checkDayChange(): boolean {
      const today = formatDate(new Date());
      if (this.state.date !== today) {
        // Day changed, reset rituals
        this.state = createInitialState(new Date());
        this.serialize();
        return true;
      }
      return false;
    },
    
    reset(): void {
      this.state = createInitialState(new Date());
      this.serialize();
    },
    
    serialize(): string {
      const json = JSON.stringify(this.state);
      try {
        localStorage.setItem(STORAGE_KEY, json);
      } catch {
        // localStorage might be full
      }
      return json;
    },
    
    deserialize(data: string): DailyRitualsState {
      try {
        const parsed = JSON.parse(data) as DailyRitualsState;
        // Validate structure
        if (
          typeof parsed.date === 'string' &&
          Array.isArray(parsed.rituals) &&
          typeof parsed.allCompleted === 'boolean' &&
          typeof parsed.bonusClaimed === 'boolean'
        ) {
          this.state = parsed;
          return parsed;
        }
      } catch {
        // Invalid data
      }
      // Return current state on failure
      return this.state;
    },
  };
  
  return system;
}

// Export for testing
export { RITUAL_POOL, BONUS_REWARD };
export type { RitualType, RitualDefinition };

// Singleton instance for global access
let dailyRitualsInstance: DailyRitualsSystem | null = null;

/**
 * Gets the global daily rituals system instance
 * Creates one if it doesn't exist
 */
export function getDailyRitualsSystem(): DailyRitualsSystem {
  if (!dailyRitualsInstance) {
    dailyRitualsInstance = createDailyRitualsSystem();
  }
  return dailyRitualsInstance;
}

/**
 * Sets up analytics callback for ritual completion
 * Requirements 5.5: Log ritual complete events
 * 
 * @param callback - Function to call when a ritual is completed
 */
export function setupRitualAnalytics(
  callback: (ritualId: string, completionTime: number) => void
): void {
  const system = getDailyRitualsSystem();
  system.onRitualComplete = callback;
}
