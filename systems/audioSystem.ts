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
  // Glitch Protocol low-pass filter state
  glitchFilter: BiquadFilterNode | null;
  glitchFilterActive: boolean;
  glitchFilterFadeTimeout: ReturnType<typeof setTimeout> | null;
}

const persisted = loadPersistedSettings();
const state: AudioState = {
  context: null,
  masterGain: null,
  enabled: persisted.enabled,
  volume: persisted.volume,
  // Glitch Protocol filter state
  glitchFilter: null,
  glitchFilterActive: false,
  glitchFilterFadeTimeout: null,
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

// ============ GLITCH PROTOCOL SOUNDS ============

/**
 * Glitch Shard spawn - distorted beep sound
 * Requirements 9.1: Play glitch spawn sound (distorted beep)
 */
export function playGlitchSpawn() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Distorted beep with frequency modulation
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const distortion = ctx.createWaveShaper();
  const gain = ctx.createGain();

  osc1.type = 'square';
  osc2.type = 'sawtooth';

  // Glitchy frequency jumps for distorted beep effect
  osc1.frequency.setValueAtTime(800, ctx.currentTime);
  osc1.frequency.setValueAtTime(1200, ctx.currentTime + 0.03);
  osc1.frequency.setValueAtTime(600, ctx.currentTime + 0.06);
  osc1.frequency.setValueAtTime(1000, ctx.currentTime + 0.09);
  osc1.frequency.setValueAtTime(700, ctx.currentTime + 0.12);

  // Secondary oscillator for thickness
  osc2.frequency.setValueAtTime(850, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 0.15);

  // Create distortion curve
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(x * 3);
  }
  distortion.curve = curve;

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18);

  osc1.connect(distortion);
  osc2.connect(distortion);
  distortion.connect(gain);
  gain.connect(master);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.18);
  osc2.stop(ctx.currentTime + 0.18);

  // High frequency glitch noise
  playNoise(0.1, 5000, 'highpass', 0.08);
}

/**
 * Glitch Shard impact - heavy bass hit with distortion
 * Requirements 9.2: Play glitch impact sound (heavy bass hit with distortion)
 */
export function playGlitchImpact() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Heavy bass hit
  const bassOsc = ctx.createOscillator();
  const subOsc = ctx.createOscillator();
  const distortion = ctx.createWaveShaper();
  const bassGain = ctx.createGain();
  const subGain = ctx.createGain();
  const masterImpactGain = ctx.createGain();

  bassOsc.type = 'sine';
  subOsc.type = 'sine';

  // Bass sweep down for impact
  bassOsc.frequency.setValueAtTime(150, ctx.currentTime);
  bassOsc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);

  // Sub bass layer
  subOsc.frequency.setValueAtTime(80, ctx.currentTime);
  subOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);

  // Create heavy distortion curve
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(x * 5) * 0.8;
  }
  distortion.curve = curve;

  bassGain.gain.setValueAtTime(0.35, ctx.currentTime);
  bassGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

  subGain.gain.setValueAtTime(0.25, ctx.currentTime);
  subGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

  masterImpactGain.gain.setValueAtTime(1, ctx.currentTime);

  bassOsc.connect(bassGain);
  subOsc.connect(subGain);
  bassGain.connect(distortion);
  subGain.connect(distortion);
  distortion.connect(masterImpactGain);
  masterImpactGain.connect(master);

  bassOsc.start(ctx.currentTime);
  subOsc.start(ctx.currentTime);
  bassOsc.stop(ctx.currentTime + 0.35);
  subOsc.stop(ctx.currentTime + 0.35);

  // Distorted mid-range punch
  const punchOsc = ctx.createOscillator();
  const punchGain = ctx.createGain();

  punchOsc.type = 'sawtooth';
  punchOsc.frequency.setValueAtTime(200, ctx.currentTime);
  punchOsc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

  punchGain.gain.setValueAtTime(0.2, ctx.currentTime);
  punchGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

  punchOsc.connect(distortion);
  punchOsc.start(ctx.currentTime);
  punchOsc.stop(ctx.currentTime + 0.2);

  // Heavy noise burst
  playNoise(0.2, 400, 'lowpass', 0.25);

  // Glitch crackle
  setTimeout(() => playNoise(0.1, 3000, 'bandpass', 0.12), 50);
}

/**
 * Apply low-pass filter to background music during Quantum Lock
 * Requirements 9.3: Apply low-pass filter to background music (distorted/bass-heavy version)
 * 
 * Note: This creates a low-pass filter effect on the master output.
 * For actual background music filtering, integrate with your music system.
 */
export function applyGlitchMusicFilter() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Clear any pending fade timeout
  if (state.glitchFilterFadeTimeout) {
    clearTimeout(state.glitchFilterFadeTimeout);
    state.glitchFilterFadeTimeout = null;
  }

  // If filter already exists and active, just ensure it's at target frequency
  if (state.glitchFilter && state.glitchFilterActive) {
    state.glitchFilter.frequency.cancelScheduledValues(ctx.currentTime);
    state.glitchFilter.frequency.setValueAtTime(state.glitchFilter.frequency.value, ctx.currentTime);
    state.glitchFilter.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
    return;
  }

  // Create low-pass filter for bass-heavy distorted effect
  state.glitchFilter = ctx.createBiquadFilter();
  state.glitchFilter.type = 'lowpass';
  state.glitchFilter.frequency.setValueAtTime(20000, ctx.currentTime); // Start at full range
  state.glitchFilter.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.15); // Sweep down to bass-heavy
  state.glitchFilter.Q.setValueAtTime(1.5, ctx.currentTime); // Slight resonance for character

  // Reconnect audio chain: masterGain -> glitchFilter -> destination
  master.disconnect();
  master.connect(state.glitchFilter);
  state.glitchFilter.connect(ctx.destination);

  state.glitchFilterActive = true;
}

/**
 * Remove low-pass filter and restore normal audio
 * Requirements 9.4: Fade out filter effect and restore normal audio over 500ms
 */
export function removeGlitchMusicFilter() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Clear any pending fade timeout
  if (state.glitchFilterFadeTimeout) {
    clearTimeout(state.glitchFilterFadeTimeout);
    state.glitchFilterFadeTimeout = null;
  }

  if (!state.glitchFilter || !state.glitchFilterActive) return;

  // Fade out filter over 500ms by sweeping frequency back up
  state.glitchFilter.frequency.cancelScheduledValues(ctx.currentTime);
  state.glitchFilter.frequency.setValueAtTime(state.glitchFilter.frequency.value, ctx.currentTime);
  state.glitchFilter.frequency.linearRampToValueAtTime(20000, ctx.currentTime + 0.5);

  // After fade completes, remove filter from chain
  state.glitchFilterFadeTimeout = setTimeout(() => {
    if (state.glitchFilter && master && ctx) {
      try {
        master.disconnect();
        state.glitchFilter.disconnect();
        master.connect(ctx.destination);
      } catch {
        // Ignore disconnection errors
      }
      state.glitchFilter = null;
      state.glitchFilterActive = false;
    }
    state.glitchFilterFadeTimeout = null;
  }, 500);
}

/**
 * Check if glitch music filter is currently active
 */
export function isGlitchMusicFilterActive(): boolean {
  return state.glitchFilterActive;
}

/**
 * Glitch damage - distorted digital damage sound
 * Requirements 14.3: Trigger glitch SFX on damage taken
 */
export function playGlitchDamage() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Harsh digital distortion
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'square';
  osc2.type = 'sawtooth';

  // Chaotic frequency jumps
  osc1.frequency.setValueAtTime(200, ctx.currentTime);
  osc1.frequency.setValueAtTime(800, ctx.currentTime + 0.02);
  osc1.frequency.setValueAtTime(100, ctx.currentTime + 0.05);
  osc1.frequency.setValueAtTime(600, ctx.currentTime + 0.08);
  osc1.frequency.setValueAtTime(150, ctx.currentTime + 0.12);

  osc2.frequency.setValueAtTime(400, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.2);
  osc2.stop(ctx.currentTime + 0.2);

  // Heavy noise burst
  playNoise(0.15, 1000, 'bandpass', 0.2);

  // High frequency glitch
  setTimeout(() => playNoise(0.08, 6000, 'highpass', 0.1), 50);
}

// ============ ENEMY SOUNDS - Glitch Dart System ============

/**
 * Enemy tracking alarm - menacing dual-tone siren that builds tension
 * @param intensity 0-1 (higher = more urgent)
 */
export function playEnemyTracking(intensity: number = 0.5) {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Dual-tone alarm (like a threat warning)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  // Low ominous tone + high warning tone
  osc1.type = 'sine';
  osc2.type = 'triangle';

  const basePitch = 220 + (intensity * 110); // 220-330Hz (menacing bass)
  const alertPitch = 660 + (intensity * 220); // 660-880Hz (alert)

  osc1.frequency.setValueAtTime(basePitch, ctx.currentTime);
  osc2.frequency.setValueAtTime(alertPitch, ctx.currentTime);
  // Slight pitch bend up for urgency
  osc2.frequency.linearRampToValueAtTime(alertPitch * 1.1, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.08 + intensity * 0.04, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1 + intensity * 0.05, ctx.currentTime + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.15);
  osc2.stop(ctx.currentTime + 0.15);
}

/**
 * Lock-on confirmation - aggressive "TARGET ACQUIRED" sound
 * Sharp, unmistakable danger signal
 */
export function playLockOn() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Sharp staccato tones (military lock-on feel)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const gain = ctx.createGain();
  const distortion = ctx.createWaveShaper();

  osc1.type = 'square';
  osc2.type = 'sawtooth';
  osc3.type = 'square';

  // Three rapid descending tones (target lock sequence)
  osc1.frequency.setValueAtTime(1200, ctx.currentTime);
  osc1.frequency.setValueAtTime(900, ctx.currentTime + 0.08);
  osc1.frequency.setValueAtTime(1200, ctx.currentTime + 0.16);

  osc2.frequency.setValueAtTime(600, ctx.currentTime);
  osc3.frequency.setValueAtTime(300, ctx.currentTime + 0.1);

  // Create harsh distortion for aggression
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128) - 1;
    curve[i] = Math.tanh(x * 2);
  }
  distortion.curve = curve;

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.25, ctx.currentTime + 0.16);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc1.connect(distortion);
  osc2.connect(distortion);
  osc3.connect(distortion);
  distortion.connect(gain);
  gain.connect(master);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc3.start(ctx.currentTime + 0.1);
  osc1.stop(ctx.currentTime + 0.3);
  osc2.stop(ctx.currentTime + 0.15);
  osc3.stop(ctx.currentTime + 0.3);

  // Digital noise burst for "lock" feel
  playNoise(0.08, 6000, 'bandpass', 0.12);
}

/**
 * Dart fire - aggressive projectile launch with bass impact
 * Sounds like a cyber-missile being fired
 */
export function playDartFire() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Bass thud (launch impact)
  const bassOsc = ctx.createOscillator();
  const bassGain = ctx.createGain();

  bassOsc.type = 'sine';
  bassOsc.frequency.setValueAtTime(120, ctx.currentTime);
  bassOsc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);

  bassGain.gain.setValueAtTime(0.25, ctx.currentTime);
  bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  bassOsc.connect(bassGain);
  bassGain.connect(master);
  bassOsc.start(ctx.currentTime);
  bassOsc.stop(ctx.currentTime + 0.2);

  // High-speed whoosh (projectile in motion)
  const whooshOsc = ctx.createOscillator();
  const whooshOsc2 = ctx.createOscillator();
  const whooshGain = ctx.createGain();

  whooshOsc.type = 'sawtooth';
  whooshOsc2.type = 'sine';

  // Fast descending sweep indicates speed
  whooshOsc.frequency.setValueAtTime(1500, ctx.currentTime);
  whooshOsc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.25);

  whooshOsc2.frequency.setValueAtTime(800, ctx.currentTime);
  whooshOsc2.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

  whooshGain.gain.setValueAtTime(0.12, ctx.currentTime);
  whooshGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  whooshOsc.connect(whooshGain);
  whooshOsc2.connect(whooshGain);
  whooshGain.connect(master);

  whooshOsc.start(ctx.currentTime);
  whooshOsc2.start(ctx.currentTime);
  whooshOsc.stop(ctx.currentTime + 0.3);
  whooshOsc2.stop(ctx.currentTime + 0.3);

  // Air rush noise
  playNoise(0.2, 2000, 'bandpass', 0.15);
}

/**
 * Counter attack success - elemental burst based on Pokemon type
 */
export function playCounterAttack(pokemonType: string) {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  switch (pokemonType.toLowerCase()) {
    case 'electric':
      // Lightning crackle
      playTone(1500, 0.05, 'square', 0.2, 0.002, 0.01);
      setTimeout(() => playTone(2000, 0.03, 'square', 0.15, 0.002, 0.01), 30);
      setTimeout(() => playTone(1200, 0.08, 'sawtooth', 0.12, 0.002, 0.02), 60);
      playNoise(0.1, 8000, 'highpass', 0.15);
      break;

    case 'fire':
      // Fire burst
      playTone(200, 0.15, 'sawtooth', 0.15, 0.01, 0.04);
      playNoise(0.2, 1500, 'bandpass', 0.2);
      setTimeout(() => playNoise(0.15, 3000, 'highpass', 0.1), 50);
      break;

    case 'water':
      // Water splash
      playTone(300, 0.1, 'sine', 0.12, 0.01, 0.03);
      playTone(600, 0.08, 'sine', 0.1, 0.02, 0.02);
      playNoise(0.15, 2000, 'lowpass', 0.15);
      break;

    default:
      // Generic energy burst
      playTone(800, 0.1, 'triangle', 0.15, 0.01, 0.03);
      playTone(1200, 0.08, 'triangle', 0.12, 0.01, 0.02);
      playNoise(0.12, 4000, 'bandpass', 0.12);
  }
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

  // Environmental Effects - Requirements 14.3
  playGlitchDamage,

  // Glitch Protocol - Requirements 9.1, 9.2, 9.3, 9.4
  playGlitchSpawn,
  playGlitchImpact,
  applyGlitchMusicFilter,
  removeGlitchMusicFilter,
  isGlitchMusicFilterActive,

  // Enemy Sounds - Glitch Dart System
  playEnemyTracking,
  playLockOn,
  playDartFire,
  playCounterAttack,
};

export default AudioSystem;

