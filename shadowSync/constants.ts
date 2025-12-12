export const COLORS = {
  TOP_BG: '#000000',
  BOTTOM_BG: '#FFFFFF',
  TOP_ORB: '#FFFFFF',
  BOTTOM_ORB: '#000000',
  TOP_OBSTACLE: '#FFFFFF',
  BOTTOM_OBSTACLE: '#000000',
  CONNECTOR: '#888888',
  ACCENT_CYAN: '#00F0FF',
  ACCENT_RED: '#FF2A2A',
  TEXT_LIGHT: '#FFFFFF',
  TEXT_DARK: '#000000',
};

export const INITIAL_CONFIG = {
  // Speed - starts at 30 km/h (3.0), MUCH faster acceleration
  baseSpeed: 3.3, 
  maxSpeed: 16, 
  speedIncreaseInterval: 600, // Was 1200 - now increases every 600ms (2x faster)
  speedIncreaseAmount: 0.20, // Speed increase per interval
  
  // Spawn rate
  spawnRate: 120, // Was 140 - faster obstacle spawning
  minSpawnRate: 40, // Was 50 - can get more intense
  
  // MOBILE OPTIMIZED - Zoomed out view for better visibility
  orbRadius: 7,      // Smaller orbs for zoom out effect
  connectorWidth: 2, // Thinner connector
  obstacleWidth: 24, // Narrower obstacles
  
  // Gate Logic
  gapHeight: 140, // Smaller gap for zoom out
  
  // Dynamic Connector Config - Smaller for zoom out
  minConnectorLength: 45, // Shorter starting connector
  maxConnectorLength: 120, // Shorter max connector
  connectorGrowthRate: 0.06, // Slower growth
  
  // Swap Mechanics - Snappy & Responsive
  swapCooldown: 150, 
  swapDuration: 150, // Faster animation (was 200)

  // Layout / Safe Zones
  uiSafeArea: 100, // Space reserved at top for UI
  bottomMargin: 50, // Space reserved at bottom
};

export const STORAGE_KEYS = {
  HIGH_SCORE: 'shadow_sync_highscore',
};

// Rhythm System Configuration - Requirements 1.2, 1.6
export const RHYTHM_CONFIG = {
  toleranceMs: 200,             // ±200ms tolerans (daha kolay)
  streakForX2: 3,               // x2 için gereken streak (düşürüldü)
  streakForX3: 6,               // x3 için gereken streak (düşürüldü)
  baseInterval: 800,            // Temel ritim aralığı (ms)
};

// Gravity System Configuration - Requirements 2.6
export const GRAVITY_CONFIG = {
  minScoreToActivate: 1000,     // Minimum skor
  warningDuration: 500,         // Uyarı süresi (ms)
  flipDuration: 300,            // Flip animasyon süresi (ms)
  minTimeBetweenFlips: 5000,    // Flipler arası minimum süre (ms)
  invincibilityDuration: 200,   // Dokunulmazlık süresi (ms)
};

// Near Miss System Configuration - Requirements 3.1, 3.7
export const NEAR_MISS_CONFIG = {
  threshold: 15,                // Yakın geçiş mesafesi (piksel)
  bonusMultiplier: 2,           // Temel puan çarpanı (20 puan)
  streakWindow: 4000,           // Streak penceresi (ms) - 4 saniye
  streakBonusAt: 3,             // Bonus için gereken streak
  streakBonusPoints: 25,        // Streak bonusu
  maxStreakMultiplier: 3,       // Maksimum combo çarpanı (x3)
};

// Dynamic Midline System Configuration - Requirements 4.2, 4.11, 4.12, 4.13
export const MIDLINE_CONFIG = {
  activationScore: 500,         // Bu skora kadar midline sabit kalır
  baseAmplitude: 0.03,          // Temel genlik (%3 - daha yavaş başlangıç)
  maxAmplitude: 0.08,           // Maksimum genlik (%8)
  baseFrequency: 0.0015,        // Temel frekans (düşürüldü - daha yavaş salınım)
  amplitudeThreshold1: 2000,    // İlk genlik artış skoru
  amplitudeThreshold2: 5000,    // İkinci genlik artış skoru
  frequencyScaleFactor: 0.15,   // Frekans ölçekleme faktörü
  frequencyMaxScore: 5000,      // Frekans etkisinin maksimum olduğu skor
  microPhasingDistance: 10,     // Micro-phasing mesafesi (piksel)
  forecastTime: 500,            // Öngörü süresi (ms)
  criticalSpaceRatio: 0.30,     // Kritik alan oranı (%30)
};

// Phantom Obstacle System Configuration - Requirements 5.1, 5.2, 5.7, 5.8, 5.10, 5.11
export const PHANTOM_CONFIG = {
  activationScore: 0,           // TEST: Phantom spawn'ın aktif olacağı skor (normalde 500)
  revealDistance: 300,          // Tam görünür olma mesafesi (piksel)
  baseSpawnProbability: 0.10,   // Temel spawn olasılığı (%10)
  maxSpawnProbability: 0.40,    // Maksimum spawn olasılığı (%40)
  probabilityMaxScore: 5000,    // Max olasılığa ulaşılan skor
  minOpacity: 0.05,             // Minimum saydamlık (hayalet kontur)
  bonusPoints: 20,              // Phantom geçiş bonusu
  nearMissMultiplier: 2,        // Near miss çarpanı
};