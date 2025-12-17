/**
 * Stage (Bölüm) Data Definitions
 * Oyun bölümleri için konfigürasyon - Level (oyuncu seviyesi) ile karıştırılmamalı
 * 
 * Stage = Oyun bölümü (1, 2, 3... şeklinde ilerleyen oyun aşamaları)
 * Level = Oyuncu seviyesi (XP kazanarak yükselen genel seviye)
 */

/**
 * Stage (Bölüm) konfigürasyonu
 */
export interface StageConfig {
  id: number;                    // Bölüm numarası (1-100)
  name: string;                  // Bölüm adı
  targetDistance: number;        // Hedef mesafe (metre)
  baseSpeed: number;             // Temel hız
  speedMultiplier: number;       // Hız çarpanı
  spawnRateMultiplier: number;   // Engel spawn hızı çarpanı
  rewards: {
    baseShards: number;          // Temel ödül
    bonusPerStar: number;        // Yıldız başına bonus
  };
}

/**
 * Bölüm için hedef mesafe hesapla
 * Bölüm 1: 100m (giriş bölümü)
 * Bölüm 2+: Kademeli artış
 */
export function calculateStageDistance(stageId: number): number {
  if (stageId === 1) return 100;
  return 100 + (stageId * 50);
}

/**
 * Bölüm için temel hız hesapla
 */
export function calculateStageSpeed(stageId: number): number {
  if (stageId === 1) return 3;
  return 3 + (stageId * 0.2);
}

/**
 * Bölüm için hız çarpanı hesapla
 */
export function calculateStageSpeedMultiplier(stageId: number): number {
  if (stageId === 1) return 0.3;
  return Math.min(1.2, 0.4 + (stageId * 0.02));
}

/**
 * Bölüm için spawn hızı çarpanı hesapla
 */
export function calculateStageSpawnMultiplier(stageId: number): number {
  if (stageId === 1) return 0.25;
  return Math.min(1.0, 0.3 + (stageId * 0.02));
}

/**
 * Tek bir bölüm konfigürasyonu oluştur
 */
function createStageConfig(stageId: number): StageConfig {
  return {
    id: stageId,
    name: `Bölüm ${stageId}`,
    targetDistance: calculateStageDistance(stageId),
    baseSpeed: calculateStageSpeed(stageId),
    speedMultiplier: calculateStageSpeedMultiplier(stageId),
    spawnRateMultiplier: calculateStageSpawnMultiplier(stageId),
    rewards: {
      baseShards: 10 + (stageId * 2),
      bonusPerStar: 5 + Math.floor(stageId * 0.5),
    },
  };
}

/**
 * Tüm bölümler (100 adet)
 */
export const STAGES: StageConfig[] = Array.from(
  { length: 100 },
  (_, index) => createStageConfig(index + 1)
);

/**
 * ID'ye göre bölüm getir
 */
export function getStageById(stageId: number): StageConfig | undefined {
  if (stageId < 1 || stageId > 100) return undefined;
  return STAGES[stageId - 1];
}

/**
 * Varsayılan bölüm (Bölüm 1)
 */
export function getDefaultStage(): StageConfig {
  return STAGES[0];
}

/**
 * Toplam bölüm sayısı
 */
export function getTotalStages(): number {
  return STAGES.length;
}
