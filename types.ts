export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  RESTORING = 'RESTORING',
  VICTORY = 'VICTORY'
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
 * Trail point for collectible motion trail effect
 */
export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

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
  // Enhanced motion properties
  velocityX: number;                // Horizontal velocity for chase effect
  velocityY: number;                // Vertical velocity for dynamic movement
  trail: TrailPoint[];              // Motion trail history
  spawnTime: number;                // When collectible was spawned
  escapeMode: boolean;              // Whether collectible is trying to escape
  targetY: number;                  // Target Y for smooth movement
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
  currentDistance?: number; // Distance traveled at snapshot time (for restore)
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
  // Oscillation Properties - Selective block animation
  shouldOscillate?: boolean;    // Bu blok sallanacak mı (rastgele belirlenir)
  oscillationIntensity?: number; // Sallanma yoğunluğu (0.5 - 2.0 arası)
  oscillationPhase?: number;    // Sallanma fazı (her blok farklı zamanda sallanır)
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
export type EffectType = 'glow' | 'spark' | 'burst' | 'flash';

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


// ============================================================================
// Echo Constructs System Types - Requirements 2.3, 2.4, 7.1
// ============================================================================

/**
 * Construct type representing the player's current form
 * Requirements 7.1: Define ConstructType for state management
 */
export type ConstructType = 'NONE' | 'TITAN' | 'PHASE' | 'BLINK';

/**
 * Collision result determined by the active physics strategy
 * Requirements 2.3, 2.4: Different constructs have different collision behaviors
 */
export type CollisionResult = 'DAMAGE' | 'DESTROY' | 'IGNORE';

/**
 * Input state for construct-specific input handling
 * Requirements 5.2: Blink Node requires touch Y coordinate for ghost positioning
 */
export interface InputState {
  isPressed: boolean;       // Is touch/mouse currently pressed
  y: number;                // Current touch Y coordinate (for Blink ghost)
  isTapFrame: boolean;      // Was this the frame where press started (for Titan stomp)
  isReleaseFrame: boolean;  // Was this the frame where press ended (for Blink teleport)
}

/**
 * Player entity interface for physics calculations
 * Requirements 2.3, 2.4: Physics strategies operate on player entity
 */
export interface PlayerEntity {
  x: number;
  y: number;
  velocity: number;
  width: number;
  height: number;
}

/**
 * Rectangle interface for hitbox calculations
 * Requirements 2.3: Physics strategies provide hitbox information
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Physics strategy interface - Strategy Pattern for construct physics
 * Requirements 2.3, 2.4: Each construct has its own physics behavior
 */
export interface PhysicsStrategy {
  type: ConstructType;

  /**
   * Update player physics based on construct-specific rules
   * @param player - The player entity to update
   * @param deltaTime - Time since last frame in milliseconds
   * @param input - Current input state
   */
  update(player: PlayerEntity, deltaTime: number, input: InputState): void;

  /**
   * Determine collision result based on construct-specific rules
   * @param isFromAbove - Whether collision is from above (for Titan stomp)
   * @returns CollisionResult - DAMAGE, DESTROY, or IGNORE
   */
  resolveCollision(isFromAbove: boolean): CollisionResult;

  /**
   * Get the hitbox for the current construct
   * @param player - The player entity
   * @returns Rect - The hitbox rectangle
   */
  getHitbox(player: PlayerEntity): Rect;

  /**
   * Get speed multiplier for this construct
   * @returns number - Speed multiplier (e.g., 1.2 for Phase)
   */
  getSpeedMultiplier(): number;

  /**
   * Get gravity multiplier for this construct
   * @returns number - Gravity multiplier (e.g., 2.5 for Titan)
   */
  getGravityMultiplier(): number;
}


// ============================================================================
// Progression System Types - Requirements 2.1, 4.4, 6.1
// ============================================================================

/**
 * Type of mission objective
 * Requirements 2.1: Define mission types for tracking
 */
export type MissionType =
  | 'DISTANCE'      // Total meters traveled
  | 'SWAP_COUNT'    // Number of lane swaps
  | 'NEAR_MISS'     // Near miss count
  | 'COLLECT'       // Shards collected
  | 'STAY_LANE'     // Duration in single lane (ms)
  | 'COLLISION';    // First collision (Sound Check)

/**
 * Mission slot for daily missions
 * Requirements 2.1: Define slots for daily mission generation
 */
export type MissionSlot = 'GRIND' | 'SKILL' | 'MASTERY';

/**
 * Mission category
 * Requirements 2.1: Define mission categories
 */
export type MissionCategory = 'SOUND_CHECK' | 'DAILY' | 'MARATHON';

/**
 * Mission interface
 * Requirements 2.1: Define Mission structure
 */
export interface Mission {
  id: string;
  category: MissionCategory;
  slot?: MissionSlot;
  type: MissionType;
  title: string;
  description: string;
  goal: number;
  progress: number;
  completed: boolean;
  rewards: {
    xp: number;
    shards: number;
    cosmetic?: string;
  };
}

/**
 * Mission state tracking
 * Requirements 2.1: Define MissionState for persistence
 */
export interface MissionState {
  soundCheck: {
    missions: Mission[];
    completed: boolean;
  };
  daily: {
    missions: Mission[];
    lastResetDate: string;
  };
  marathon: {
    mission: Mission | null;
    lastResetDate: string;
  };
}

/**
 * Level information
 * Requirements 4.4: Define LevelInfo for display
 */
export interface LevelInfo {
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number; // 0-1 percentage
}

/**
 * Zone lock status
 * Requirements 6.1: Define lock states for dual-lock system
 */
export type ZoneLockStatus =
  | 'FULLY_LOCKED'      // Neither requirement met
  | 'LEVEL_LOCKED'      // Has shards, needs level
  | 'SHARD_LOCKED'      // Has level, needs shards
  | 'UNLOCKABLE'        // Both requirements met
  | 'UNLOCKED';         // Already unlocked

/**
 * Zone unlock requirements
 * Requirements 6.1: Define requirements for zone unlocking
 */
export interface ZoneRequirements {
  levelRequired: number;
  shardCost: number;
}

/**
 * Zone unlock state
 * Requirements 6.1: Define state for zone unlock UI
 */
export interface ZoneUnlockState {
  status: ZoneLockStatus;
  message: string;
  canPurchase: boolean;
  levelMet: boolean;
  shardsMet: boolean;
}

/**
 * Mission event for progress tracking
 * Requirements 7.1-7.5: Define events for mission progress
 */
export interface MissionEvent {
  type: MissionType;
  value: number;
}


// ============================================================================
// Glitch Protocol Types - Requirements 1.1, 2.1, 4.1, 7.1
// ============================================================================

/**
 * Phase type for Glitch Protocol state machine
 * Requirements 7.1, 7.2, 7.3, 7.4: Define phase transitions
 */
export type GlitchPhase = 'inactive' | 'active' | 'warning' | 'exiting' | 'ghost';

/**
 * Glitch Shard interface - the collectible that triggers Quantum Lock
 * Requirements 1.1, 2.1: Define Glitch Shard properties
 */
export interface GlitchShard {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  colorTimer: number;           // Timer for color flicker effect (50ms cycle)
  spawnTime: number;            // When the shard was spawned
  trailPositions: Array<{ x: number; y: number; alpha: number }>; // Comet trail positions
}

/**
 * Glitch Mode state tracking
 * Requirements 4.1, 7.1: Define state for Quantum Lock mode
 */
export interface GlitchModeState {
  isActive: boolean;
  startTime: number;
  duration: number;             // 8000ms
  originalConnectorLength: number;
  waveOffset: number;           // For sinusoidal wave animation
  phase: GlitchPhase;
  ghostModeEndTime: number;
  // Paused mode tracking for priority system
  pausedOverdriveTime: number;
  pausedResonanceTime: number;
  // Midline collision tracking for Quantum Lock
  midlineHits: number;          // Number of times orbs hit the zero line
  lastMidlineHitTime: number;   // Prevent rapid-fire hits
}

/**
 * Glitch Protocol configuration
 * Requirements 7.1, 6.5, 2.7, 2.6: Define configuration constants
 */
export interface GlitchConfig {
  duration: number;              // 8000ms
  idealConnectorLength: number;  // 120px
  waveSpeed: number;             // 0.05
  waveAmplitude: number;         // 120px
  ghostModeDuration: number;     // 1500ms
  warningThreshold: number;      // 0.75 (75%)
  flattenThreshold: number;      // 0.80 (80%)
  shardMultiplier: number;       // 2x
  minSpawnDistance: number;      // 500m
  spawnClearance: number;        // 150px
  colors: string[];              // Flicker colors
}

// ============================================================================
// Numbers Mission Types - Dynamic API-driven missions
// ============================================================================

/**
 * Numbers Mission data from API
 */
export interface NumbersMissionData {
  number: number;                 // Target distance (200-5000)
  text: string;                   // Trivia text about the number
  fetchedAt: number;              // Timestamp when fetched
}

/**
 * Numbers Mission state tracking
 */
export interface NumbersMissionState {
  isActive: boolean;              // Currently playing a numbers mission
  isAvailable: boolean;           // Can start a new mission (no cooldown)
  currentMission: NumbersMissionData | null;
  currentDistance: number;        // Progress toward target
  cooldownUntil: number | null;   // Timestamp when cooldown ends
  isCompleted: boolean;           // Just completed, showing victory
  selectedTrialPokemon: string | null; // ID of selected trial pokemon
}

/**
 * Numbers Mission rewards
 */
export interface NumbersMissionRewards {
  xp: number;
  gems: number;
}
