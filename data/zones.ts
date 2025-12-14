/**
 * Zone Data Definitions (Offline Roguelite Loop)
 *
 * Zones are the primary progression gates for endless runs.
 * No backend: unlocks are stored in Zustand + localStorage persist.
 * 
 * Requirements 6.1: Dual-lock system with level and shard requirements
 */

import type { ZoneRequirements } from '../types';

export type ZoneId = "sub-bass" | "bass" | "mid" | "high" | "ultra";

export interface ZoneModifiers {
  speedMultiplier: number;
  spawnRateMultiplier: number;
}

export interface ZoneConfig {
  id: ZoneId;
  name: string;
  subtitle: string;
  description: string;
  accent: string; // hex
  gradient: { from: string; via: string; to: string }; // tailwind tokens for UI
  modifiers: ZoneModifiers;
  unlockCost: number; // Echo Shards cost (0 = default) - legacy field
  /** Dual-lock requirements: level + shards - Requirements 6.1 */
  unlockRequirements: ZoneRequirements;
}

export const ZONES: ZoneConfig[] = [
  {
    id: "sub-bass",
    name: "SUB‑BASS",
    subtitle: "Warmup / Readability",
    description: "Geniş nefes alan ritim. Öğren, ısın, akışı kur.",
    accent: "#00F0FF",
    gradient: {
      from: "from-cyan-500/20",
      via: "via-white/5",
      to: "to-transparent",
    },
    modifiers: { speedMultiplier: 0.7, spawnRateMultiplier: 0.6 }, // Çok yavaş başlangıç
    unlockCost: 0,
    unlockRequirements: { levelRequired: 1, shardCost: 0 }, // Default zone, always unlocked
  },
  {
    id: "bass",
    name: "BASS",
    subtitle: "Flow",
    description: "Daha sık pattern. Refleks + renk okuma.",
    accent: "#22C55E",
    gradient: {
      from: "from-green-500/20",
      via: "via-white/5",
      to: "to-transparent",
    },
    modifiers: { speedMultiplier: 0.85, spawnRateMultiplier: 0.8 }, // Yavaş
    unlockCost: 300,
    unlockRequirements: { levelRequired: 5, shardCost: 300 },
  },
  {
    id: "mid",
    name: "MID",
    subtitle: "Pressure",
    description: "Akış sıkılaşıyor. Shard risk/ödül belirgin.",
    accent: "#A855F7",
    gradient: {
      from: "from-purple-500/20",
      via: "via-white/5",
      to: "to-transparent",
    },
    modifiers: { speedMultiplier: 1.0, spawnRateMultiplier: 1.0 }, // Normal
    unlockCost: 900,
    unlockRequirements: { levelRequired: 10, shardCost: 900 },
  },
  {
    id: "high",
    name: "HIGH",
    subtitle: "Precision",
    description: "Hatalar affetmez. Kalkan ve mıknatıs değer kazanır.",
    accent: "#F59E0B",
    gradient: {
      from: "from-amber-500/20",
      via: "via-white/5",
      to: "to-transparent",
    },
    modifiers: { speedMultiplier: 1.1, spawnRateMultiplier: 1.1 }, // Biraz hızlı
    unlockCost: 2000,
    unlockRequirements: { levelRequired: 25, shardCost: 2000 },
  },
  {
    id: "ultra",
    name: "ULTRA",
    subtitle: "Limit",
    description: "Saf tempo. Sadece ustalar.",
    accent: "#EF4444",
    gradient: {
      from: "from-red-500/25",
      via: "via-white/5",
      to: "to-transparent",
    },
    modifiers: { speedMultiplier: 1.2, spawnRateMultiplier: 1.15 }, // Hızlı
    unlockCost: 5000,
    unlockRequirements: { levelRequired: 50, shardCost: 5000 },
  },
];

export function getZoneById(id: ZoneId): ZoneConfig | undefined {
  return ZONES.find((z) => z.id === id);
}
