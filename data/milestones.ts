/**
 * Milestone System — Pokémon discount offers at every 5 levels
 *
 * When the player reaches a milestone level (5, 10, 15, …), a limited-time
 * discount offer becomes available in the Spirit Shop for 48 hours.
 *
 * Higher milestones unlock higher-tier Pokémon with better discounts.
 */

export interface MilestoneOffer {
  /** Player level that triggers this milestone */
  level: number;
  /** Pokémon tier eligible for discount: 'common' | 'rare' | 'legendary' */
  tier: 'common' | 'rare' | 'legendary';
  /** Number of Pokémon that get the discount (randomly selected from tier) */
  slots: number;
  /** Discount percentage (0-100) */
  discountPercent: number;
  /** Duration of the offer in milliseconds (48h default) */
  durationMs: number;
  /** Turkish label for UI */
  label: string;
  /** Accent color for UI badge */
  color: string;
}

/** Milestone offer duration: 48 hours */
const OFFER_DURATION = 48 * 60 * 60 * 1000;

/**
 * Static milestone definitions.
 * For levels beyond the explicit list, we generate procedurally.
 */
export const MILESTONE_OFFERS: MilestoneOffer[] = [
  {
    level: 5,
    tier: 'common',
    slots: 2,
    discountPercent: 30,
    durationMs: OFFER_DURATION,
    label: 'Seviye 5 Fırsatı',
    color: '#22c55e', // green
  },
  {
    level: 10,
    tier: 'common',
    slots: 3,
    discountPercent: 25,
    durationMs: OFFER_DURATION,
    label: 'Seviye 10 Fırsatı',
    color: '#3b82f6', // blue
  },
  {
    level: 15,
    tier: 'rare',
    slots: 2,
    discountPercent: 25,
    durationMs: OFFER_DURATION,
    label: 'Seviye 15 Fırsatı',
    color: '#a855f7', // purple
  },
  {
    level: 20,
    tier: 'rare',
    slots: 3,
    discountPercent: 20,
    durationMs: OFFER_DURATION,
    label: 'Seviye 20 Fırsatı',
    color: '#f59e0b', // amber
  },
  {
    level: 25,
    tier: 'legendary',
    slots: 1,
    discountPercent: 20,
    durationMs: OFFER_DURATION,
    label: 'Seviye 25 Fırsatı',
    color: '#ef4444', // red
  },
  {
    level: 30,
    tier: 'legendary',
    slots: 2,
    discountPercent: 20,
    durationMs: OFFER_DURATION,
    label: 'Seviye 30 Fırsatı',
    color: '#f97316', // orange
  },
  {
    level: 35,
    tier: 'rare',
    slots: 3,
    discountPercent: 30,
    durationMs: OFFER_DURATION,
    label: 'Seviye 35 Fırsatı',
    color: '#06b6d4', // cyan
  },
  {
    level: 40,
    tier: 'legendary',
    slots: 2,
    discountPercent: 25,
    durationMs: OFFER_DURATION,
    label: 'Seviye 40 Fırsatı',
    color: '#ec4899', // pink
  },
];

/** Persisted milestone claim state */
export interface MilestoneState {
  /** Active offers: level → { activatedAt timestamp, pokemonIds selected for discount } */
  activeOffers: Record<number, {
    activatedAt: number;
    pokemonIds: string[];
    discountPercent: number;
  }>;
  /** Levels that have been fully used (all discounted Pokémon purchased) */
  claimedLevels: number[];
}

export const DEFAULT_MILESTONE_STATE: MilestoneState = {
  activeOffers: {},
  claimedLevels: [],
};

/**
 * Get the milestone offer for a given level.
 * For levels > 40, generates a procedural offer.
 */
export function getMilestoneForLevel(level: number): MilestoneOffer | null {
  if (level % 5 !== 0 || level < 5) return null;

  const explicit = MILESTONE_OFFERS.find(m => m.level === level);
  if (explicit) return explicit;

  // Procedural generation for levels > 40
  const cycle = Math.floor((level - 40) / 15); // 3 tiers cycling
  const tierIndex = ((level / 5) - 1) % 3;
  const tiers: Array<'common' | 'rare' | 'legendary'> = ['common', 'rare', 'legendary'];
  const tier = tiers[tierIndex];
  const colors = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#f97316'];

  return {
    level,
    tier,
    slots: tier === 'legendary' ? 1 + Math.min(cycle, 2) : 2 + Math.min(cycle, 3),
    discountPercent: Math.max(15, 30 - cycle * 3),
    durationMs: OFFER_DURATION,
    label: `Seviye ${level} Fırsatı`,
    color: colors[((level / 5) - 1) % colors.length],
  };
}

/**
 * Check if a milestone offer is still active (within 48h window)
 */
export function isOfferActive(activatedAt: number, durationMs: number = OFFER_DURATION): boolean {
  return Date.now() - activatedAt < durationMs;
}

/**
 * Get remaining time for an offer in milliseconds
 */
export function getOfferTimeRemaining(activatedAt: number, durationMs: number = OFFER_DURATION): number {
  return Math.max(0, durationMs - (Date.now() - activatedAt));
}
