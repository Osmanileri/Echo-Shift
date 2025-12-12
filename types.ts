export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  RESTORING = 'RESTORING'  // NEW: VHS rewind state - Requirements 7.2
}

// ============================================================================
// S.H.I.F.T. Protocol Types - Requirements 1.1, 1.2
// ============================================================================

/**
 * Type of collectible item
 * Requirements 1.1: Define collectible types
 */
export type CollectibleType = 'LETTER' | 'SHARD';

/**
 * Collectible interface for S.H.I.F.T. letters and shards
 * Requirements 1.1: Define Collectible interface with required properties
 */
export interface Collectible {
  id: string;
  type: CollectibleType;
  value: string;                    // 'S', 'H', 'I', 'F', 'T' or shard value
  x: number;
  y: number;
  baseY: number;                    // Oscillation center point
  oscillationPhase: number;
  oscillationAmplitude: number;
  oscillationFrequency: number;
  isCollected: boolean;
}

/**
 * S.H.I.F.T. Protocol state tracking
 * Requirements 1.2: Define ShiftProtocolState interface
 */
export interface ShiftProtocolState {
  targetWord: string[];             // ['S', 'H', 'I', 'F', 'T']
  collectedMask: boolean[];         // [true, false, true, false, false]
  overdriveActive: boolean;
  overdriveTimer: number;           // milliseconds remaining
  coreRotation: number;             // Ying-Yang visual rotation
}

// ============================================================================
// Enhanced Resonance State - Requirements 5.4, 6.2
// ============================================================================

/**
 * Enhanced Resonance state with pause support for Overdrive override
 * Requirements: State Priority System - Overdrive > Resonance
 */
export interface EnhancedResonanceState {
  isActive: boolean;
  isPaused: boolean;                // NEW: For Overdrive override
  pausedTimeRemaining: number;      // NEW: Frozen timer during pause
  streakCount: number;
  activationThreshold: number;      // 10
  duration: number;                 // Total duration in ms
  remainingTime: number;            // Current remaining time
  multiplier: number;               // x2 when active
  intensity: number;                // 0.0 - 1.0 for effects
  colorTransitionProgress: number;  // 0.0 - 1.0 for smooth transitions
}

// ============================================================================
// Snapshot System Types - Requirements 7.1, 7.2, 7.3
// ============================================================================

/**
 * Game state snapshot for System Restore
 * Requirements 7.2: Capture all required fields
 */
export interface GameSnapshot {
  timestamp: number;
  score: number;
  gameSpeed: number;
  playerPosition: number;
  orbSwapState: boolean;
  obstacles: Obstacle[];
  shiftState: ShiftProtocolState;
  resonanceState: EnhancedResonanceState;
  connectorLength: number;
  midlineY: number;
}

/**
 * Circular buffer for storing game snapshots
 * Requirements 7.1, 7.3: Maintain 3 seconds of history at 60fps
 */
export interface SnapshotBuffer {
  snapshots: GameSnapshot[];
  head: number;                     // Circular buffer head index
  capacity: number;                 // 180 (3 seconds at 60fps)
  size: number;                     // Current number of snapshots
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  targetY: number; // The final vertical position for the animation
  width: number;
  height: number;
  lane: 'top' | 'bottom'; 
  polarity: 'white' | 'black'; // 'white' obstacle is safe for White Orb, deadly for Black Orb. And vice versa.
  passed: boolean;
  hasPhased?: boolean;
  nearMissChecked?: boolean; // Her engel için sadece bir kez near miss kontrolü
  // Phantom Obstacle Properties - Requirements 5.2
  isLatent?: boolean;           // Engelin görünmez modda başlayıp başlamadığı
  revealDistance?: number;      // Tam görünür olacağı mesafe (piksel)
  initialX?: number;            // Spawn anındaki X koordinatı
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface GameConfig {
  baseSpeed: number;
  speedIncreasePerScore: number;
  spawnRate: number; // Frames between spawns
  orbRadius: number;
  connectorWidth: number;
}

// Rhythm System State - Requirements 1.1
export interface RhythmState {
  lastPassTime: number;           // Son başarılı geçiş zamanı (ms)
  expectedInterval: number;       // Beklenen ritim aralığı (ms)
  streakCount: number;            // Ardışık başarılı ritim sayısı
  activeMultiplier: number;       // Aktif çarpan (1, 2 veya 3)
  isRhythmActive: boolean;        // Ritim modu aktif mi
}

// Gravity System State - Requirements 2.1
export interface GravityState {
  isFlipped: boolean;             // Gravite tersine mi
  flipStartTime: number;          // Flip başlangıç zamanı
  warningActive: boolean;         // Uyarı gösteriliyor mu
  warningStartTime: number;       // Uyarı başlangıç zamanı
  lastFlipTime: number;           // Son flip zamanı
  isInvincible: boolean;          // Flip sonrası dokunulmazlık
}

// Near Miss System State - Requirements 3.1
export interface NearMissState {
  lastNearMissTime: number;       // Son close call zamanı
  streakCount: number;            // Ardışık close call sayısı
  totalNearMisses: number;        // Toplam close call sayısı
}

// Near Miss Result - Requirements 3.1, 3.6
export interface NearMissResult {
  isNearMiss: boolean;            // Close call mı
  distance: number;               // Mesafe (piksel)
  closestPoint: Point;            // En yakın nokta (efekt için)
  bonusPoints: number;            // Kazanılan bonus puan
}

// Score Popup for visual feedback - Requirements 3.3
export interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;  // Yukarı hareket hızı
}

// Visual Effect Types - Requirements 3.4, 3.5, 3.9
export type EffectType = 'glow' | 'spark' | 'burst';

export interface VisualEffect {
  type: EffectType;
  x: number;
  y: number;
  life: number;
  color: string;
  scale: number;
}

// Dynamic Midline System State - Requirements 4.1, 4.2
export interface MidlineState {
  startTime: number;              // Oyun başlangıç zamanı (ms)
  currentMidlineY: number;        // Anlık merkez çizgi Y pozisyonu (piksel)
  normalizedOffset: number;       // Normalize edilmiş offset (-1 ile 1 arası)
  currentAmplitude: number;       // Anlık genlik (0.05 - 0.08)
  currentFrequency: number;       // Anlık frekans
  isAtPeak: boolean;              // Maksimum genlikte mi
  isMicroPhasing: boolean;        // Sınır dokunulmazlığı aktif mi
  tensionIntensity: number;       // Gerilim ses yoğunluğu (0-1)
}

// Dynamic Midline Configuration - Requirements 4.2, 4.11, 4.12, 4.13
export interface MidlineConfig {
  activationScore: number;        // Bu skora kadar midline sabit kalır (500)
  baseAmplitude: number;          // Temel genlik (0.03)
  maxAmplitude: number;           // Maksimum genlik (0.08)
  baseFrequency: number;          // Temel frekans (0.0015)
  amplitudeThreshold1: number;    // İlk genlik artış skoru (2000)
  amplitudeThreshold2: number;    // İkinci genlik artış skoru (5000)
  frequencyScaleFactor: number;   // Frekans ölçekleme faktörü (0.15)
  frequencyMaxScore: number;      // Frekans etkisinin maksimum olduğu skor
  microPhasingDistance: number;   // Micro-phasing mesafesi (10px)
  forecastTime: number;           // Öngörü süresi (500ms)
  criticalSpaceRatio: number;     // Kritik alan oranı (0.30)
}