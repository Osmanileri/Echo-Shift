/**
 * Level Unlock Manager - Pro-Grade Progression System
 * 
 * Manages the unlock celebration schedule: when a level is completed,
 * checks if a new mechanic / enemy / ability is unlocked and returns
 * the payload for the UnlockModal. Uses persistence so each unlock
 * is only shown once per player.
 *
 * Design rules:
 * - Pure data module — no React, no Canvas, no DOM.
 * - Persists "seen" set via utils/persistence (localStorage + memory fallback).
 * - Unlock schedule is static; adding a new milestone = one array entry.
 */

import { UnlockPayload } from '../types';
import { safeLoad, safePersist, STORAGE_KEYS } from '../utils/persistence';

// ============================================================================
// Unlock Schedule — static milestone table
// ============================================================================

/**
 * Master unlock schedule.
 * `levelId` = the level the player just **completed** (not the one they're about to start).
 * The modal is shown *after* completing this level and *before* the next level starts.
 */
export const UNLOCK_SCHEDULE: UnlockPayload[] = [
  {
    levelId: 1,
    type: 'ABILITY',
    title: 'SİSTEM GÜNCELLEMESİ',
    name: 'KUTUP DEĞİŞTİRME (SHIFT)',
    description: 'Dokunarak bilyelerin kutbunu değiştir. Beyaz bilya beyaz engellerden, siyah bilya siyah engellerden zarar görmeden geçer!',
    icon: '⚡',
    color: '#00F0FF',
  },
  {
    levelId: 3,
    type: 'MECHANIC',
    title: '3. BÖLÜM TAMAMLANDI - YENİ ÖZELLİK',
    name: 'DÖNÜŞTÜRÜCÜ BLOKLAR KİLİDİ AÇILDI!',
    description: 'Tebrikler! 3. Bölümü başarıyla tamamladınız. Artık engeller saniyeler öncesinden uyarı verip anlık olarak Beyaz ve Siyah renk değiştirebilir. Dikkatli ol!',
    icon: '🔄',
    color: '#A855F7',
  },
  {
    levelId: 5,
    type: 'ENEMY',
    title: 'YENİ TEHDİT TESPİT EDİLDİ',
    name: 'DARBE KAPISI (PULSE GATE)',
    description: 'Bu kapı zamanla kutbunu değiştirir. Renk değişimini izle ve hızlı tepki ver!',
    icon: '🚨',
    color: '#FF2A2A',
  },
  {
    levelId: 10,
    type: 'ABILITY',
    title: 'SİSTEM GÜNCELLEMESİ',
    name: 'HAYALET MODU (PHASE DASH)',
    description: 'Kısa bir süreliğine engellerin içinden ölümsüzce geç ve tüm engelleri yık! Akıllıca kullan — bekleme süresi uzundur.',
    icon: '👻',
    color: '#22D3EE',
  },
  {
    levelId: 11,
    type: 'ENEMY',
    title: 'YENİ TEHDİT TESPİT EDİLDİ',
    name: 'SAYDAMLAYAN HAYALET BLOKLAR',
    description: 'Bazı bloklar yaklaşana kadar az saydam görünür. Gözlerini dört aç!',
    icon: '👁️',
    color: '#EC4899',
  },
  {
    levelId: 21,
    type: 'ABILITY',
    title: 'SİSTEM GÜNCELLEMESİ',
    name: 'DİNAMİK ORTA ÇİZGİ',
    description: 'Orta çizgi artık konum değiştirir. Hayatta kalmak için mesafeni ayarla!',
    icon: '〰️',
    color: '#F59E0B',
  },
  {
    levelId: 31,
    type: 'ABILITY',
    title: 'SİSTEM GÜNCELLEMESİ',
    name: 'RİTİM SİSTEMİ',
    description: 'Engellerden ritme uygun geçerek seri çarpanı oluştur. Ritmi hisset!',
    icon: '🎵',
    color: '#10B981',
  },
  {
    levelId: 41,
    type: 'ABILITY',
    title: 'SİSTEM GÜNCELLEMESİ',
    name: 'YERÇEKİMİ TERSİNE DÖNMESİ',
    description: 'Yerçekimi periyodik olarak tersine döner. Kontrollerin ters çevrilir — odaklan!',
    icon: '🔄',
    color: '#6366F1',
  },
];

// ============================================================================
// Persistence helpers
// ============================================================================

/** Load the set of level-IDs whose unlock modal has already been shown. */
function loadSeenUnlocks(): Set<number> {
  const raw = safeLoad<number[]>(STORAGE_KEYS.SEEN_UNLOCKS, []);
  return new Set(raw);
}

/** Persist the seen-unlock set. */
function saveSeenUnlocks(seen: Set<number>): void {
  safePersist(STORAGE_KEYS.SEEN_UNLOCKS, Array.from(seen));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check whether completing `levelId` triggers an unlock celebration.
 *
 * @param levelId - The level the player just completed (1-based).
 * @returns The `UnlockPayload` to show, or `null` if no new unlock.
 */
export function checkUnlocks(levelId: number): UnlockPayload | null {
  const entry = UNLOCK_SCHEDULE.find(u => u.levelId === levelId);
  if (!entry) return null;

  const seen = loadSeenUnlocks();
  if (seen.has(levelId)) return null;

  return entry;
}

/**
 * Mark an unlock as "seen" so it won't be shown again.
 * Call this when the player taps ACKNOWLEDGE on the modal.
 *
 * @param levelId - The level whose unlock was acknowledged.
 */
export function markUnlockSeen(levelId: number): void {
  const seen = loadSeenUnlocks();
  seen.add(levelId);
  saveSeenUnlocks(seen);
}

/**
 * Get ALL unlock payloads (regardless of seen state).
 * Useful for a "codex" or settings screen.
 */
export function getAllUnlocks(): readonly UnlockPayload[] {
  return UNLOCK_SCHEDULE;
}

/**
 * Get all unlocks that the player has NOT yet seen.
 * Useful for debugging or showing a backlog.
 */
export function getUnseenUnlocks(): UnlockPayload[] {
  const seen = loadSeenUnlocks();
  return UNLOCK_SCHEDULE.filter(u => !seen.has(u.levelId));
}

/**
 * Reset all seen-unlock state (for testing / new-game).
 */
export function resetUnlockState(): void {
  saveSeenUnlocks(new Set());
}
