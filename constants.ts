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
  // Speed - starts at 4.2 km/h (2.1), comfortable start for mobile
  baseSpeed: 2.1,  // 2.5 was too fast (User Feedback) - Reduced by ~16%
  maxSpeed: 4,     // 40km/h max speed (unchanged)
  speedIncreaseInterval: 5000, // Faster interval to compensate for slower start (was 6000)
  speedIncreaseAmount: 0.01, // Constant increase

  // Spawn rate - SUPER slow obstacle spawning for mobile-friendly gameplay
  spawnRate: 350,  // Süper yavaş spawn - çok daha fazla zaman (was 280)
  minSpawnRate: 150, // Daha az yoğun - minimum spawn aralığı (was 120)

  // MOBILE OPTIMIZED - Wider view for better visibility
  orbRadius: 6,      // Smaller orbs for wider view
  connectorWidth: 2, // Thinner connector
  obstacleWidth: 20, // Narrower obstacles (daha ince bloklar)

  // Gate Logic - WIDER GAP for easier gameplay
  gapHeight: 180, // Larger gap for easier passage (was 140)

  // Dynamic Connector Config - Longer for wider view
  minConnectorLength: 55, // Longer starting connector (was 45)
  maxConnectorLength: 140, // Longer max connector (was 120)
  connectorGrowthRate: 0.04, // Slower growth (was 0.06)

  // Swap Mechanics - Snappy & Responsive
  swapCooldown: 150,
  swapDuration: 150, // Faster animation (was 200)

  // Layout / Safe Zones
  uiSafeArea: 100, // Space reserved at top for UI
  bottomMargin: 50, // Space reserved at bottom
};

// Legacy key - use utils/persistence.ts STORAGE_KEYS instead
// Kept for backward compatibility migration
export const STORAGE_KEYS = {
  HIGH_SCORE: 'echo-shift-high-score', // Standardized prefix
  LEGACY_HIGH_SCORE: 'shadow_sync_highscore', // Old key for migration
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
  invincibilityDuration: 100,   // Dokunulmazlık süresi (ms) - düşürüldü
};

// Near Miss System Configuration - Requirements 3.1, 3.7
// AYNI RENKLİ blok + orbdan yakın geçiş bonusu
export const NEAR_MISS_CONFIG = {
  threshold: 8,                 // Yakın geçiş mesafesi (piksel) - düşürüldü
  bonusMultiplier: 1.5,         // Temel puan çarpanı (15 puan) - düşürüldü
  streakWindow: 3000,           // Streak penceresi (ms) - 3 saniye 
  streakBonusAt: 4,             // Bonus için gereken streak - artırıldı
  streakBonusPoints: 15,        // Streak bonusu - düşürüldü
  maxStreakMultiplier: 2,       // Maksimum combo çarpanı (x2) - düşürüldü
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

// S.H.I.F.T. Protocol Configuration - Requirements 3.1, 3.4, 4.5, 4.6, 9.2, 9.4
export const SHIFT_CONFIG = {
  // Spawn Probability - Requirements 3.4
  minSpawnProbability: 0.05,    // 5% at score 0
  maxSpawnProbability: 0.15,    // 15% at score 5000
  probabilityMaxScore: 5000,    // Score at which max probability is reached

  // Collision - Requirements 9.2
  letterHitboxRadius: 20,       // 20px circular hitbox for letters

  // Overdrive Mode - Requirements 4.6
  overdriveDuration: 10000,     // 10 seconds in milliseconds

  // Magnet Effect - Requirements 4.5
  magnetRadius: 150,            // 150px pull radius for Echo Shards

  // Collection Reward - Requirements 9.4
  collectionReward: 50,         // 50 Echo Shards per letter

  // Oscillation Parameters - Requirements 3.3
  oscillation: {
    defaultAmplitude: 30,       // Default vertical oscillation amplitude (pixels)
    defaultFrequency: 2,        // Default oscillation frequency (rad/s)
    minAmplitude: 15,           // Minimum amplitude
    maxAmplitude: 50,           // Maximum amplitude
  },

  // Reachability - Requirements 3.1
  reachabilityMargin: 20,       // Margin from max reach (connectorLength - 20)

  // Horizontal Drift Spawning (like shards - right to left)
  horizontalDrift: {
    spawnChance: 0.02,          // 2% chance per spawn cycle when eligible
    minSpawnInterval: 150,      // Minimum frames between spawns (~2.5 seconds at 60fps)
    spawnXOffset: 60,           // Spawn offset beyond right edge of screen
    driftSpeedFactor: 1.0,      // Letter drift speed relative to gameSpeed (same as obstacles)
    verticalMargin: 100,        // Margin from top/bottom for Y spawn position
    despawnXMargin: 50,         // Distance past left edge to despawn
    verticalOscillation: 20,    // Gentle up/down wobble amplitude
    oscillationFrequency: 1.2,  // Wobble frequency
  },
};


// Glitch Protocol Configuration - Requirements 7.1, 6.5, 2.7, 2.6
export const GLITCH_CONFIG = {
  // Duration - Requirements 7.1
  duration: 8000,                // Quantum Lock duration (8 seconds)
  chargingDuration: 3000, // Cinematic slow entry (3 seconds)

  // Connector - Requirements 4.2
  idealConnectorLength: 80,       // Target connector length during Quantum Lock (minimal growth)

  waveSpeed: 0.05,                // Wave offset increment per frame (smoother, faster animation)
  waveAmplitude: 120,             // Sinusoidal wave amplitude (pixels)

  // Phase Thresholds
  warningThreshold: 0.75,         // Start warning at 75%
  flattenThreshold: 0.80,         // Start exiting (Snake Out) at 80%

  // Ghost Mode - Requirements 7.4
  ghostModeDuration: 1500,       // Ghost Mode duration after Quantum Lock (ms)

  // Phase Thresholds - Requirements 7.2, 7.3
  warningThreshold: 0.75,        // 75% - start exit warning
  flattenThreshold: 0.80,        // 80% - start wave flattening

  // Shard Value - Requirements 6.5
  shardMultiplier: 2,            // 2x shard value during Quantum Lock
  distanceMultiplier: 3,         // 3x distance accumulation during Quantum Lock

  // Spawn Rules - Requirements 2.7, 2.6
  minSpawnDistance: 0,         // Minimum distance traveled before spawn (meters) - TEST: 100m (was 500)
  spawnClearance: 150,           // Minimum clearance from obstacles (pixels)

  // Visual Effects - Requirements 1.2
  colors: ['#00FFFF', '#FF00FF', '#FFFFFF', '#00FF00'], // Cyan, Magenta, White, Green
  colorCycleInterval: 50,        // Color flicker interval (ms)

  // Shard Dimensions
  shardWidth: 40,                // Glitch Shard width (pixels)
  shardHeight: 40,               // Glitch Shard height (pixels)

  // Spawn Position - Requirements 2.2, 2.3
  spawnXOffset: 100,             // Spawn offset beyond right edge (pixels)
  spawnYRange: 100,              // Y position range from center (±pixels)

  // Hit Stop - Requirements 3.2
  hitStopFrames: 10,             // Frames to freeze on collision

  // Quantum Lock Ambiance VFX - Atmospheric effects (more dramatic)
  ambiance: {
    vignetteIntensity: 0.85,       // Strong edge darkening (0-1)
    vignetteColor: [20, 0, 60],    // RGB for deep purple/electric tint
    pulseSpeed: 0.006,             // Faster pulse animation
    scanlineOpacity: 0.12,         // More visible scanlines
    scanlineSpacing: 2,            // Tighter scanlines for CRT effect
    dangerPulseIntensity: 0.25,    // Stronger danger pulse overlay
    glowColor: [0, 255, 200],      // Cyan glow for wave
    backgroundDarken: 0.3,         // Darken background by 30%
  },

  // Kuyruklu Yıldız Efekti - Glitch Shard ileri doğru kaçar, arkasından iz bırakır
  cometTrail: {
    forwardSpeed: 0.5,             // Shard oyun hızının %50'unda ileri kaçar
    effectiveSpeedRatio: 0.2,      // Net hareket = oyun hızının %10'u (çok yavaş yaklaşır)
    trailLength: 12,               // Saklanacak kuyruk pozisyonu sayısı
    trailDecay: 0.85,              // Pozisyon başına alfa azalması (0.85^n solma)
    trailColors: ['#00FFFF', '#FF00FF', '#8800FF', '#0088FF'], // Kuyruk renk gradyanı
    particleSize: 6,               // Kuyruk parçacık boyutu
    glowIntensity: 25,             // Kuyruk parıltı yoğunluğu
  },

  // Diamond Bonus System - Reflex rewards
  diamondBonus: {
    baseValue: 5,                  // Base diamond value
    reflexMultiplier: 2,           // Fast collection bonus (2x)
    reflexWindowMs: 300,           // Time window for reflex bonus (ms)
    streakBonus: 1,                // Extra value per streak
    maxStreak: 10,                 // Maximum streak multiplier
  },

  // Midline Collision - Quantum Lock failure condition
  midlineCollision: {
    maxHits: 3,                    // Max hits before Quantum Lock ends
    hitCooldownMs: 500,            // Cooldown between registering hits (ms)
    burnEffectDuration: 300,       // Burn effect duration (ms)
  },
};
