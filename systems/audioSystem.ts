/**
 * Audio System - Phase 4 Launch Polish
 * Web Audio API based procedural sound effects system
 * No external audio files required - all sounds generated programmatically
 */

// Storage keys for persistence
const STORAGE_KEYS = {
  VOLUME: 'echo-shift-sfx-volume',
  ENABLED: 'echo-shift-sfx-enabled',
};

// Load persisted settings
function loadPersistedSettings(): { volume: number; enabled: boolean } {
  try {
    const volume = localStorage.getItem(STORAGE_KEYS.VOLUME);
    const enabled = localStorage.getItem(STORAGE_KEYS.ENABLED);
    return {
      volume: volume !== null ? parseFloat(volume) : 0.5,
      enabled: enabled !== null ? enabled === 'true' : true,
    };
  } catch {
    return { volume: 0.5, enabled: true };
  }
}

// Audio System State
interface AudioState {
  context: AudioContext | null;
  masterGain: GainNode | null;
  enabled: boolean;
  volume: number;
}

const persisted = loadPersistedSettings();
const state: AudioState = {
  context: null,
  masterGain: null,
  enabled: persisted.enabled,
  volume: persisted.volume,
};

// Lazy initialization of AudioContext
function getContext(): AudioContext | null {
  if (!state.enabled) return null;
  
  if (!state.context) {
    try {
      state.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      state.masterGain = state.context.createGain();
      state.masterGain.gain.value = state.volume;
      state.masterGain.connect(state.context.destination);
    } catch (e) {
      console.warn('Audio System: Web Audio API not supported');
      state.enabled = false;
      return null;
    }
  }
  
  // Resume context if suspended (needed for user gesture requirement)
  if (state.context.state === 'suspended') {
    state.context.resume();
  }
  
  return state.context;
}

function getMasterGain(): GainNode | null {
  return state.masterGain;
}

// ============ UTILITY FUNCTIONS ============

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
  attack: number = 0.01,
  decay: number = 0.1
) {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
  gain.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + attack + decay);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(
  duration: number,
  filterFreq: number,
  filterType: BiquadFilterType = 'lowpass',
  volume: number = 0.2
) {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  
  source.start(ctx.currentTime);
}

// ============ SOUND EFFECTS ============

/**
 * Button click - light, crisp tap sound
 */
export function playButtonClick() {
  playTone(800, 0.08, 'sine', 0.15, 0.005, 0.02);
  playTone(1200, 0.06, 'sine', 0.1, 0.005, 0.02);
}

/**
 * Menu selection - slightly more prominent click
 */
export function playMenuSelect() {
  playTone(600, 0.1, 'triangle', 0.2, 0.01, 0.03);
  setTimeout(() => playTone(900, 0.08, 'triangle', 0.15, 0.01, 0.02), 30);
}

/**
 * Zone selection - distinctive tone
 */
export function playZoneSelect() {
  playTone(440, 0.15, 'sine', 0.2, 0.01, 0.05);
  setTimeout(() => playTone(660, 0.12, 'sine', 0.18, 0.01, 0.04), 60);
  setTimeout(() => playTone(880, 0.1, 'sine', 0.15, 0.01, 0.03), 120);
}

/**
 * Orb swap - quick whoosh with pitch shift
 */
export function playSwap() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Descending sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
  
  // Add subtle noise layer
  playNoise(0.08, 2000, 'bandpass', 0.1);
}

/**
 * Shard collect - bright, rewarding chime
 */
export function playShardCollect() {
  playTone(1047, 0.15, 'sine', 0.25, 0.01, 0.04); // C6
  setTimeout(() => playTone(1319, 0.12, 'sine', 0.2, 0.01, 0.03), 40); // E6
  setTimeout(() => playTone(1568, 0.1, 'sine', 0.15, 0.01, 0.03), 80); // G6
}

/**
 * Near miss - tense whoosh
 */
export function playNearMiss() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Rising sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.12);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.12);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.12);
  
  // Noise whoosh
  playNoise(0.1, 1500, 'highpass', 0.08);
}

/**
 * Streak bonus - ascending triumphant tones
 */
export function playStreakBonus() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2 - i * 0.02, 'triangle', 0.2 - i * 0.02, 0.01, 0.05), i * 60);
  });
}

/**
 * Obstacle pass - subtle confirmation
 */
export function playObstaclePass() {
  playTone(440, 0.06, 'sine', 0.08, 0.01, 0.02);
}

/**
 * Game start - energetic rising sweep
 */
export function playGameStart() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Main sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
  
  // Confirmation tones
  setTimeout(() => {
    playTone(523, 0.15, 'triangle', 0.2, 0.01, 0.04);
    setTimeout(() => playTone(784, 0.2, 'triangle', 0.25, 0.01, 0.05), 80);
  }, 250);
}

/**
 * Game over - dramatic descending tones
 */
export function playGameOver() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Descending sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
  
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
  
  // Impact thud
  setTimeout(() => playNoise(0.2, 200, 'lowpass', 0.15), 100);
}

/**
 * New high score - celebratory fanfare
 */
export function playNewHighScore() {
  const fanfare = [
    { freq: 523, delay: 0, dur: 0.15 },     // C5
    { freq: 659, delay: 100, dur: 0.15 },   // E5
    { freq: 784, delay: 200, dur: 0.15 },   // G5
    { freq: 1047, delay: 300, dur: 0.3 },   // C6
    { freq: 1319, delay: 450, dur: 0.25 },  // E6
    { freq: 1047, delay: 600, dur: 0.4 },   // C6
  ];
  
  fanfare.forEach(note => {
    setTimeout(() => playTone(note.freq, note.dur, 'triangle', 0.25, 0.01, 0.05), note.delay);
  });
}

/**
 * Purchase/Upgrade - satisfying cha-ching
 */
export function playPurchase() {
  playTone(880, 0.1, 'sine', 0.2, 0.01, 0.03);
  setTimeout(() => playTone(1109, 0.1, 'sine', 0.18, 0.01, 0.03), 50);
  setTimeout(() => playTone(1319, 0.15, 'sine', 0.22, 0.01, 0.04), 100);
  
  // Coin-like shimmer
  setTimeout(() => playNoise(0.1, 8000, 'highpass', 0.08), 80);
}

/**
 * Upgrade activate - power-up sound
 */
export function playUpgradeActivate() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Rising power sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
  
  // Shimmer
  playNoise(0.15, 4000, 'highpass', 0.1);
}

/**
 * Multiplier increase - rising confirmation
 */
export function playMultiplierUp() {
  playTone(660, 0.1, 'triangle', 0.18, 0.01, 0.03);
  setTimeout(() => playTone(880, 0.15, 'triangle', 0.2, 0.01, 0.04), 60);
}

/**
 * S.H.I.F.T. letter collect - special effect
 */
export function playShiftCollect() {
  // Magnetic pull sound
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
  
  // Bright chime
  setTimeout(() => {
    playTone(1568, 0.12, 'sine', 0.25, 0.01, 0.03);
    playTone(2093, 0.1, 'sine', 0.2, 0.01, 0.02);
  }, 100);
}

/**
 * Overdrive mode activate - dramatic power surge
 */
export function playOverdriveActivate() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Power surge sweep
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc1.type = 'sawtooth';
  osc2.type = 'square';
  
  osc1.frequency.setValueAtTime(100, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.4);
  
  osc2.frequency.setValueAtTime(100, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.4);
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.2);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);
  
  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.4);
  osc2.stop(ctx.currentTime + 0.4);
  
  // Impact
  setTimeout(() => playNoise(0.15, 3000, 'bandpass', 0.12), 350);
}

/**
 * Slow motion activate - time warp effect
 */
export function playSlowMotion() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Descending sweep (time slowing)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
  
  // Low rumble
  playNoise(0.25, 300, 'lowpass', 0.1);
}

/**
 * Shield activate - protective bubble
 */
export function playShieldActivate() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Bubble formation
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.15);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
  
  // Shimmer
  setTimeout(() => playNoise(0.1, 5000, 'highpass', 0.08), 100);
}

/**
 * Shield block - hit absorbed
 */
export function playShieldBlock() {
  playNoise(0.15, 800, 'bandpass', 0.2);
  playTone(300, 0.12, 'triangle', 0.15, 0.01, 0.04);
}

// ============ ECHO CONSTRUCTS SOUNDS ============

/**
 * Construct transformation - dramatic phase shift sound
 * Requirements 6.5: Transformation sound
 */
export function playConstructTransform() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Rising power sweep with wobble
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc1.type = 'sawtooth';
  osc2.type = 'sine';
  
  // Main sweep
  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.25);
  osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.35);
  
  // Wobble layer
  osc2.frequency.setValueAtTime(200, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.15);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);
  
  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.35);
  osc2.stop(ctx.currentTime + 0.35);
  
  // Shimmer burst
  setTimeout(() => playNoise(0.12, 6000, 'highpass', 0.1), 200);
  
  // Confirmation chime
  setTimeout(() => {
    playTone(880, 0.1, 'sine', 0.2, 0.01, 0.03);
    playTone(1320, 0.15, 'sine', 0.18, 0.01, 0.04);
  }, 280);
}

/**
 * Titan stomp - heavy impact sound
 * Requirements 6.5: Construct-specific sounds (stomp)
 */
export function playTitanStomp() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Heavy thud
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
  
  // Impact noise
  playNoise(0.15, 400, 'lowpass', 0.25);
  
  // Metallic clang
  setTimeout(() => playTone(200, 0.08, 'square', 0.1, 0.005, 0.02), 30);
}

/**
 * Phase gravity flip - whoosh with pitch shift
 * Requirements 6.5: Construct-specific sounds (flip)
 */
export function playPhaseFlip() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Whoosh sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.08);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
  
  // Air whoosh
  playNoise(0.15, 2500, 'bandpass', 0.12);
}

/**
 * Blink teleport - digital glitch sound
 * Requirements 6.5: Construct-specific sounds (teleport)
 */
export function playBlinkTeleport() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Digital zap
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc1.type = 'square';
  osc2.type = 'sawtooth';
  
  // Glitchy frequency jumps
  osc1.frequency.setValueAtTime(1200, ctx.currentTime);
  osc1.frequency.setValueAtTime(600, ctx.currentTime + 0.03);
  osc1.frequency.setValueAtTime(1500, ctx.currentTime + 0.06);
  osc1.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
  
  osc2.frequency.setValueAtTime(800, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.12);
  
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);
  
  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.15);
  osc2.stop(ctx.currentTime + 0.15);
  
  // Digital noise burst
  playNoise(0.08, 8000, 'highpass', 0.08);
}

/**
 * Construct destruction - explosion sound
 * Requirements 6.5: Destruction sound
 */
export function playConstructDestruction() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Explosion sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
  
  // Heavy impact noise
  playNoise(0.25, 500, 'lowpass', 0.3);
  
  // Debris scatter
  setTimeout(() => playNoise(0.2, 2000, 'bandpass', 0.15), 100);
  
  // Metallic shatter
  setTimeout(() => {
    playTone(150, 0.1, 'square', 0.12, 0.01, 0.03);
    playTone(100, 0.15, 'triangle', 0.1, 0.01, 0.04);
  }, 50);
}

/**
 * Smart Bomb shockwave - expanding pulse sound
 * Requirements 6.5: Smart Bomb activation sound
 */
export function playSmartBombShockwave() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Expanding pulse
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
  
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  
  osc.connect(gain);
  gain.connect(master);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
  
  // Whoosh layer
  playNoise(0.35, 1000, 'lowpass', 0.2);
  
  // High frequency shimmer
  setTimeout(() => playNoise(0.2, 6000, 'highpass', 0.08), 150);
}

/**
 * Glitch Token collect - digital pickup sound
 */
export function playGlitchTokenCollect() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Digital chime with glitch
  playTone(880, 0.1, 'square', 0.15, 0.01, 0.02);
  setTimeout(() => playTone(1320, 0.08, 'square', 0.12, 0.01, 0.02), 40);
  setTimeout(() => playTone(1760, 0.12, 'sine', 0.18, 0.01, 0.03), 80);
  
  // Glitch noise
  playNoise(0.06, 4000, 'highpass', 0.08);
}

// ============ SETTINGS CONTROL ============

/**
 * Set master volume (0-1)
 */
export function setVolume(volume: number) {
  state.volume = Math.max(0, Math.min(1, volume));
  if (state.masterGain) {
    state.masterGain.gain.value = state.volume;
  }
  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEYS.VOLUME, state.volume.toString());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get current volume
 */
export function getVolume(): number {
  return state.volume;
}

/**
 * Enable/disable audio
 */
export function setEnabled(enabled: boolean) {
  state.enabled = enabled;
  if (!enabled && state.context) {
    state.context.suspend();
  } else if (enabled && state.context) {
    state.context.resume();
  }
  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEYS.ENABLED, state.enabled.toString());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if audio is enabled
 */
export function isEnabled(): boolean {
  return state.enabled;
}

/**
 * Initialize audio context (call on first user interaction)
 */
export function initialize() {
  getContext();
}

/**
 * Audio System singleton
 */
export const AudioSystem = {
  // Control
  initialize,
  setVolume,
  getVolume,
  setEnabled,
  isEnabled,
  
  // UI Sounds
  playButtonClick,
  playMenuSelect,
  playZoneSelect,
  
  // Gameplay Sounds
  playSwap,
  playShardCollect,
  playNearMiss,
  playStreakBonus,
  playObstaclePass,
  playMultiplierUp,
  
  // Game Events
  playGameStart,
  playGameOver,
  playNewHighScore,
  
  // Shop/Upgrades
  playPurchase,
  playUpgradeActivate,
  
  // Special Effects
  playShiftCollect,
  playOverdriveActivate,
  playSlowMotion,
  playShieldActivate,
  playShieldBlock,
  
  // Echo Constructs
  playConstructTransform,
  playTitanStomp,
  playPhaseFlip,
  playBlinkTeleport,
  playConstructDestruction,
  playSmartBombShockwave,
  playGlitchTokenCollect,
};

export default AudioSystem;

