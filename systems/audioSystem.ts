/**
 * Audio System - Phase 4 Launch Polish
 * Web Audio API based procedural sound effects system
 * No external audio files required - all sounds generated programmatically
 */

// Storage keys for persistence
const STORAGE_KEYS = {
  VOLUME: 'echo-shift-sfx-volume',
  ENABLED: 'echo-shift-sfx-enabled',
  INTERACTIVE_MELODY: 'echo-shift-interactive-melody',
  BACKING_TRACK: 'echo-shift-backing-track-enabled',
};

// Load persisted settings
function loadPersistedSettings(): { volume: number; enabled: boolean; interactiveMelody: boolean; backingTrackEnabled: boolean } {
  try {
    const volume = localStorage.getItem(STORAGE_KEYS.VOLUME);
    const enabled = localStorage.getItem(STORAGE_KEYS.ENABLED);
    const interactiveMelody = localStorage.getItem(STORAGE_KEYS.INTERACTIVE_MELODY);
    const backingTrackEnabled = localStorage.getItem(STORAGE_KEYS.BACKING_TRACK);
    return {
      volume: volume !== null ? parseFloat(volume) : 0.5,
      enabled: enabled !== null ? enabled === 'true' : true,
      interactiveMelody: interactiveMelody !== null ? interactiveMelody === 'true' : false,
      backingTrackEnabled: backingTrackEnabled !== null ? backingTrackEnabled === 'true' : true,
    };
  } catch {
    return { volume: 0.5, enabled: true, interactiveMelody: false, backingTrackEnabled: true };
  }
}

// Audio System State
interface AudioState {
  context: AudioContext | null;
  masterGain: GainNode | null;
  enabled: boolean;
  volume: number;
  interactiveMelody: boolean;
  backingTrackEnabled: boolean;
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
  interactiveMelody: persisted.interactiveMelody,
  backingTrackEnabled: persisted.backingTrackEnabled,
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

// Public aliases so external systems (beatEngine) can share the AudioContext
export function getAudioContext(): AudioContext | null {
  return getContext();
}
export { getMasterGain };

/**
 * Suspend the AudioContext — called when app goes to background.
 * Saves battery by stopping the audio hardware clock.
 */
export function suspendAudioContext(): void {
  if (state.context && state.context.state === 'running') {
    state.context.suspend().catch(() => {/* ignore */});
  }
}

/**
 * Resume the AudioContext — called when app returns to foreground.
 * On iOS this must be triggered within a user-gesture handler to succeed.
 */
export function resumeAudioContext(): void {
  if (state.context && state.context.state !== 'running') {
    state.context.resume().catch(() => {/* ignore */});
  }
}

/**
 * Listen for AudioContext state changes (iOS interruption: phone call, Siri, etc.)
 * Returns a cleanup function to remove the listener.
 */
export function onAudioContextStateChange(cb: (state: AudioContextState) => void): () => void {
  const ctx = getContext();
  if (!ctx) return () => {};
  const handler = () => cb(ctx.state as AudioContextState);
  ctx.addEventListener('statechange', handler);
  return () => ctx.removeEventListener('statechange', handler);
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

export function playSwap(playerY?: number) {
  if (state.interactiveMelody && playerY !== undefined) {
    playInteractiveNote(playerY, 'swap');
    return;
  }
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

  // Soft, crystal-clear high pitch sine chime (no harsh sawtooth noise)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);

  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(master);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

/**
 * Dodge master - dramatic elite whoosh with triumphant chime
 */
export function playDodgeMaster() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Power sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.25);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.25);

  // Whoosh noise
  playNoise(0.15, 3000, 'bandpass', 0.15);

  // Triumphant chime tones
  setTimeout(() => {
    playTone(1800, 0.15, 'sine', 0.22, 0.01, 0.05);
    playTone(2400, 0.15, 'sine', 0.18, 0.01, 0.05);
  }, 80);
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

export function playObstaclePass(playerY?: number) {
  if (state.interactiveMelody && playerY !== undefined) {
    playInteractiveNote(playerY, 'pass');
    return;
  }
  playTone(523.25, 0.04, 'sine', 0.04, 0.01, 0.02);
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
 * Inverter obstacle polarity flip - crisp sci-fi digital pitch chirp
 */
export function playColorInvert() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1280, ctx.currentTime + 0.06);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1800, ctx.currentTime);
  filter.Q.value = 3.5;

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
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

  gain.gain.setValueAtTime(0.035 + intensity * 0.02, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.045 + intensity * 0.025, ctx.currentTime + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.15);

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

  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.10, ctx.currentTime + 0.16);
  gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.3);

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

  bassGain.gain.setValueAtTime(0.10, ctx.currentTime);
  bassGain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.2);

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

  whooshGain.gain.setValueAtTime(0.05, ctx.currentTime);
  whooshGain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.3);

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

// ============ GLITCH SEEKER SOUNDS ============

/**
 * Seeker enter — digital materialize: ascending granular noise + sine sweep
 */
export function playSeekerEnter() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // White noise burst (100ms)
  playNoise(0.12, 6000, 'bandpass', 0.12);

  // Ascending sine sweep 200→800Hz over 400ms
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.3);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);

  // Eerie triangle undertone
  setTimeout(() => {
    playTone(120, 0.3, 'triangle', 0.08, 0.05, 0.15);
  }, 100);
}

/**
 * Seeker hunting ambient drone — proximity-based intensity
 * Lower drone that intensifies as seeker gets closer to player
 */
export function playSeekerHunting(proximity: number = 0.5) {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Base frequency scales with proximity (80→160Hz)
  const baseFreq = 80 + proximity * 80;
  const vol = 0.02 + proximity * 0.03;

  // Short drone pulse (200ms)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(baseFreq * 1.02, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.02);
  gain.gain.linearRampToValueAtTime(vol * 0.5, ctx.currentTime + 0.12);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.22);
}

/**
 * Seeker glitch teleport — ultra-short crackle snap
 */
export function playSeekerTeleport() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Short square wave burst 1200Hz (30ms)
  playTone(1200, 0.04, 'square', 0.15, 0.002, 0.01);

  // Noise crackle
  playNoise(0.03, 8000, 'highpass', 0.12);

  // Quick pitch drop
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(2000, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);
}

/**
 * Seeker death sound — different profile for countered vs escaped
 */
export function playSeekerDeath(reason: 'countered' | 'escaped' = 'escaped') {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  if (reason === 'countered') {
    // Aggressive noise burst + descending sawtooth
    playNoise(0.15, 5000, 'bandpass', 0.2);
    playTone(800, 0.2, 'sawtooth', 0.15, 0.005, 0.08);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } else {
    // Soft descending sine + fade ("power down")
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(master);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }
}

// ============ FLUX OVERLOAD SOUNDS ============

/**
 * Flux Overload warning - electrical buzzing buildup
 * Plays when warning phase starts
 */
export function playFluxOverloadWarning() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Low frequency electrical hum
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.5);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.3);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

  osc.connect(gain);
  gain.connect(master);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.6);

  // Crackling noise
  playNoise(0.4, 2000, 'bandpass', 0.06);
}

/**
 * Flux Overload strike - harsh electrical shock
 * Plays when player takes a strike (orbs too close)
 */
export function playFluxOverloadStrike() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Sharp electric zap
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'square';
  osc2.type = 'sawtooth';

  // Glitchy frequency jumps
  osc1.frequency.setValueAtTime(1500, ctx.currentTime);
  osc1.frequency.setValueAtTime(800, ctx.currentTime + 0.03);
  osc1.frequency.setValueAtTime(2000, ctx.currentTime + 0.06);
  osc1.frequency.setValueAtTime(400, ctx.currentTime + 0.1);

  osc2.frequency.setValueAtTime(300, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.2);
  osc2.stop(ctx.currentTime + 0.2);

  // Heavy static burst
  playNoise(0.15, 1500, 'bandpass', 0.25);

  // Low impact thud
  setTimeout(() => playNoise(0.1, 200, 'lowpass', 0.15), 50);
}

// ============ START SEQUENCE SOUNDS ============

/**
 * Countdown tick - deep resonant beat for 3, 2, 1
 * Creates anticipation with a heavy, impactful tick
 */
export function playCountdown(value: number) {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Base frequency increases as countdown approaches GO
  const baseFreq = 80 + (3 - value) * 20; // 80, 100, 120 for 3, 2, 1

  // Heavy kick-style oscillator
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(master);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);

  // Add a metallic click layer
  setTimeout(() => {
    playTone(800 + value * 100, 0.08, 'square', 0.1, 0.005, 0.02);
  }, 10);

  // Low rumble
  playNoise(0.15, 150, 'lowpass', 0.15);
}

/**
 * Countdown GO - rising energetic sweep with impact
 * Signals game start with a powerful, exciting sound
 */
export function playCountdownGo() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Rising sweep
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'square';

  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);

  osc2.frequency.setValueAtTime(100, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.35);
  osc2.stop(ctx.currentTime + 0.35);

  // Impact burst
  playNoise(0.2, 2000, 'bandpass', 0.2);

  // Harmonic chime
  setTimeout(() => {
    playTone(1047, 0.15, 'sine', 0.25, 0.01, 0.04); // C6
    setTimeout(() => playTone(1319, 0.12, 'sine', 0.2, 0.01, 0.03), 50); // E6
    setTimeout(() => playTone(1568, 0.2, 'sine', 0.25, 0.01, 0.05), 100); // G6
  }, 150);
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
 * Check if interactive melody mode is enabled
 */
export function isInteractiveMelodyEnabled(): boolean {
  return state.interactiveMelody;
}

/**
 * Enable/disable interactive melody mode
 */
export function setInteractiveMelodyEnabled(enabled: boolean): void {
  state.interactiveMelody = enabled;
  try {
    localStorage.setItem(STORAGE_KEYS.INTERACTIVE_MELODY, state.interactiveMelody.toString());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if background backing track is enabled
 */
export function isBackingTrackEnabled(): boolean {
  return state.backingTrackEnabled;
}

/**
 * Enable/disable background backing track
 */
export function setBackingTrackEnabled(enabled: boolean): void {
  state.backingTrackEnabled = enabled;
  try {
    localStorage.setItem(STORAGE_KEYS.BACKING_TRACK, state.backingTrackEnabled.toString());
  } catch {
    // Ignore storage errors
  }
}

// ============ BONUS SCORING SOUNDS ============

/**
 * Overdrive destroy - powerful crunch with metallic resonance
 */
export function playOverdriveDestroy() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Metallic crunch
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);

  // Bright sparkle layer
  setTimeout(() => playTone(1200, 0.08, 'sine', 0.12, 0.005, 0.02), 40);
  setTimeout(() => playTone(1600, 0.06, 'sine', 0.1, 0.005, 0.02), 70);

  // Impact noise burst
  playNoise(0.1, 600, 'bandpass', 0.15);
}

/**
 * Resonance destroy - ethereal shatter with harmonic overtones
 */
export function playResonanceDestroy() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Crystalline shatter — two detuned sines for "glass" timbre
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(880, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
  osc2.frequency.setValueAtTime(887, ctx.currentTime); // slight detune for shimmer
  osc2.frequency.exponentialRampToValueAtTime(1767, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.08);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(master);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.2);
  osc2.stop(ctx.currentTime + 0.2);

  // High shimmer tail
  setTimeout(() => playNoise(0.12, 8000, 'highpass', 0.06), 80);
  // Harmonic chime
  setTimeout(() => playTone(1568, 0.12, 'triangle', 0.1, 0.01, 0.04), 100);
}

/**
 * Phantom pass - eerie whisper whoosh
 */
export function playPhantomPass() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Ghostly descending sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);

  // Breathy noise layer
  playNoise(0.18, 2000, 'bandpass', 0.06);
}

/**
 * Phantom near-miss combo - phantom + near miss layered sound
 */
export function playPhantomCombo() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Reverse-sweep sparkle
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.08);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);

  // Ascending chime cascade
  setTimeout(() => playTone(784, 0.1, 'triangle', 0.15, 0.005, 0.03), 50);
  setTimeout(() => playTone(1047, 0.1, 'triangle', 0.12, 0.005, 0.03), 100);
  setTimeout(() => playTone(1319, 0.08, 'sine', 0.1, 0.005, 0.02), 150);

  // Sparkle noise
  playNoise(0.12, 6000, 'highpass', 0.05);
}

/**
 * Rhythm multiplier score - musical confirmation scaled by multiplier
 */
export function playRhythmScore(multiplier: number) {
  if (multiplier >= 3) {
    // x3 — triumphant major chord
    playTone(523, 0.12, 'triangle', 0.15, 0.005, 0.04); // C5
    setTimeout(() => playTone(659, 0.1, 'triangle', 0.12, 0.005, 0.03), 30); // E5
    setTimeout(() => playTone(784, 0.1, 'sine', 0.1, 0.005, 0.03), 60);  // G5
  } else {
    // x2 — two-note confirmation
    playTone(523, 0.1, 'triangle', 0.12, 0.005, 0.03);
    setTimeout(() => playTone(659, 0.08, 'sine', 0.1, 0.005, 0.02), 40);
  }
}

// ============ BEAT-ALIGNED SOUND ============

/**
 * Short percussive "tick" played when obstacle pass is on-beat.
 * Tuned to be satisfying without masking the kick drum.
 */
export function playBeatHit() {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  // Bright tap
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06);
  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);

  // Tiny click noise
  playNoise(0.03, 6000, 'highpass', 0.06);
}

// ============ LAYERED PROCEDURAL MUSIC — FULL RHYTHM ENGINE ============
// 7 layers: Kick · Snare · Hi-hat · Bass · Synth Pad · Lead Melody · Arp
// Chord progression: Am → F → C → G (8-bar cycle = 32 beats)
// All scheduled via Web Audio clock for sample-accurate timing.

import { BEAT_MUSIC_CONFIG } from '../constants';
import * as BeatEngine from './beatEngine';

// ──── Musical Constants ────

/** Chord progression — each chord lasts 8 beats (2 bars) */
const CHORDS = [
  { root: 110,    third: 130.81, fifth: 164.81, seventh: 196 },    // Am7
  { root: 87.31,  third: 110,    fifth: 130.81, seventh: 174.61 }, // Fmaj7
  { root: 130.81, third: 164.81, fifth: 196,    seventh: 246.94 }, // Cmaj7
  { root: 98,     third: 123.47, fifth: 146.83, seventh: 174.61 }, // G7
];

/** Bass rhythm pattern per 8-beat chord: steady synthwave rolling octaves */
const BASS_HITS: Array<{ beat: number; durRatio: number; octUp: boolean }> = [
  { beat: 0,   durRatio: 0.35, octUp: false },
  { beat: 0.5, durRatio: 0.35, octUp: true  },
  { beat: 1,   durRatio: 0.35, octUp: false },
  { beat: 1.5, durRatio: 0.35, octUp: true  },
  { beat: 2,   durRatio: 0.35, octUp: false },
  { beat: 2.5, durRatio: 0.35, octUp: true  },
  { beat: 3,   durRatio: 0.35, octUp: false },
  { beat: 3.5, durRatio: 0.35, octUp: true  },
  { beat: 4,   durRatio: 0.35, octUp: false },
  { beat: 4.5, durRatio: 0.35, octUp: true  },
  { beat: 5,   durRatio: 0.35, octUp: false },
  { beat: 5.5, durRatio: 0.35, octUp: true  },
  { beat: 6,   durRatio: 0.35, octUp: false },
  { beat: 6.5, durRatio: 0.35, octUp: true  },
  { beat: 7,   durRatio: 0.35, octUp: false },
  { beat: 7.5, durRatio: 0.35, octUp: true  },
];

/** Lead melody: two 16-beat phrases in Am pentatonic */
const MELODY_PHRASES = [
  // Phrase A — ascending, hopeful
  [
    { beat: 0,  freq: 440,    dur: 0.8  },
    { beat: 1,  freq: 523.25, dur: 0.5  },
    { beat: 2,  freq: 587.33, dur: 1.2  },
    { beat: 4,  freq: 659.25, dur: 0.8  },
    { beat: 5,  freq: 783.99, dur: 0.6  },
    { beat: 6,  freq: 659.25, dur: 0.8  },
    { beat: 7,  freq: 587.33, dur: 0.8  },
    { beat: 8,  freq: 523.25, dur: 1.2  },
    { beat: 10, freq: 440,    dur: 0.8  },
    { beat: 12, freq: 392,    dur: 0.8  },
    { beat: 13, freq: 440,    dur: 1.5  },
  ],
  // Phrase B — descending, resolving
  [
    { beat: 0,  freq: 783.99, dur: 0.8  },
    { beat: 1,  freq: 659.25, dur: 0.8  },
    { beat: 2,  freq: 587.33, dur: 0.5  },
    { beat: 3,  freq: 523.25, dur: 1.2  },
    { beat: 5,  freq: 440,    dur: 0.8  },
    { beat: 6,  freq: 523.25, dur: 0.5  },
    { beat: 7,  freq: 587.33, dur: 0.8  },
    { beat: 8,  freq: 659.25, dur: 1.5  },
    { beat: 10, freq: 587.33, dur: 0.8  },
    { beat: 11, freq: 523.25, dur: 0.5  },
    { beat: 12, freq: 440,    dur: 1.5  },
    { beat: 14, freq: 392,    dur: 0.8  },
    { beat: 15, freq: 440,    dur: 0.5  },
  ],
];

/** Arp note order cycling through chord tones */
const ARP_CHORD_KEYS: Array<'root' | 'third' | 'fifth' | 'seventh'> = [
  'root', 'third', 'fifth', 'seventh', 'fifth', 'third',
];

// ──── Music Layer State ────

interface MusicLayerState {
  kickGain: GainNode | null;
  snareGain: GainNode | null;
  hihatGain: GainNode | null;
  bassGain: GainNode | null;
  bassFilter: BiquadFilterNode | null;
  padGain: GainNode | null;
  padFilter: BiquadFilterNode | null;
  leadGain: GainNode | null;
  arpGain: GainNode | null;
  isPlaying: boolean;
  currentBPM: number;
  currentScore: number;
  melodyPhraseIndex: number;
  /** Scheduled oscillator/source nodes for cleanup — auto-pruned via onended */
  _scheduledNodes: Set<AudioScheduledSourceNode>;
  activeChord?: { root: number; third: number; fifth: number; seventh: number };
  glowOsc1: OscillatorNode | null;
  glowOsc2: OscillatorNode | null;
  glowGain: GainNode | null;
  glowFilter: BiquadFilterNode | null;
  interactiveMelodyFreq: number;
  playerIsMoving: boolean;
}

const musicState: MusicLayerState = {
  kickGain: null,
  snareGain: null,
  hihatGain: null,
  bassGain: null,
  bassFilter: null,
  padGain: null,
  padFilter: null,
  leadGain: null,
  arpGain: null,
  isPlaying: false,
  currentBPM: 90,
  currentScore: 0,
  melodyPhraseIndex: 0,
  _scheduledNodes: new Set(),
  glowOsc1: null,
  glowOsc2: null,
  glowGain: null,
  glowFilter: null,
  interactiveMelodyFreq: 220,
  playerIsMoving: false,
};

/** Track a scheduled node and auto-remove when it finishes playing */
function _trackNode(node: AudioScheduledSourceNode): void {
  musicState._scheduledNodes.add(node);
  node.onended = () => {
    musicState._scheduledNodes.delete(node);
  };
}

/** Get current chord based on beat index (8-beat cycle per chord, 32 beats total) */
function _getChord(beatIndex: number) {
  const chordIndex = Math.floor((beatIndex % 32) / 8);
  return CHORDS[chordIndex];
}

// ──── Gain Node Setup ────

function _ensureMusicGains(): boolean {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return false;

  if (!musicState.kickGain) {
    musicState.kickGain = ctx.createGain();
    musicState.kickGain.gain.value = BEAT_MUSIC_CONFIG.kickGain;
    musicState.kickGain.connect(master);
  }
  if (!musicState.snareGain) {
    musicState.snareGain = ctx.createGain();
    musicState.snareGain.gain.value = BEAT_MUSIC_CONFIG.snareGain;
    musicState.snareGain.connect(master);
  }
  if (!musicState.hihatGain) {
    musicState.hihatGain = ctx.createGain();
    musicState.hihatGain.gain.value = BEAT_MUSIC_CONFIG.hihatGain;
    musicState.hihatGain.connect(master);
  }
  if (!musicState.bassGain) {
    // Bass chain: source → filter → gain → master
    musicState.bassFilter = ctx.createBiquadFilter();
    musicState.bassFilter.type = 'lowpass';
    musicState.bassFilter.frequency.value = 400;
    musicState.bassFilter.Q.value = 5;
    musicState.bassGain = ctx.createGain();
    musicState.bassGain.gain.value = BEAT_MUSIC_CONFIG.bassGain; // plays from start
    musicState.bassFilter.connect(musicState.bassGain);
    musicState.bassGain.connect(master);
  }
  if (!musicState.padGain) {
    // Pad chain: source → filter → gain → master
    musicState.padFilter = ctx.createBiquadFilter();
    musicState.padFilter.type = 'lowpass';
    musicState.padFilter.frequency.value = 2000;
    musicState.padFilter.Q.value = 1;
    musicState.padGain = ctx.createGain();
    musicState.padGain.gain.value = 0; // fades in at threshold
    musicState.padFilter.connect(musicState.padGain);
    musicState.padGain.connect(master);
  }
  if (!musicState.leadGain) {
    musicState.leadGain = ctx.createGain();
    musicState.leadGain.gain.value = 0; // fades in at threshold
    musicState.leadGain.connect(master);
  }
  if (!musicState.arpGain) {
    musicState.arpGain = ctx.createGain();
    musicState.arpGain.gain.value = 0; // fades in at threshold
    musicState.arpGain.connect(master);
  }
  return true;
}

// ──── Instrument Schedulers ────

/**
 * Kick drum: sub-bass sine sweep (150→40Hz) + transient click layer.
 * Punchy EDM-style kick with chest-thumping low end.
 */
function _scheduleKick(time: number): void {
  const ctx = getContext();
  if (!ctx || !musicState.kickGain) return;

  // Sub layer — soft deep sine sweep down (no hard click attack for lofi chill)
  const sub = ctx.createOscillator();
  const subEnv = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(90, time); // lower start frequency
  sub.frequency.exponentialRampToValueAtTime(45, time + 0.10);
  subEnv.gain.setValueAtTime(0.65, time); // softer sub volume
  subEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  sub.connect(subEnv);
  subEnv.connect(musicState.kickGain);
  sub.start(time);
  sub.stop(time + 0.20);
  _trackNode(sub);

  // Soft click layer for minimal transient definition
  const click = ctx.createOscillator();
  const clickEnv = ctx.createGain();
  click.type = 'triangle';
  click.frequency.setValueAtTime(2500, time);
  click.frequency.exponentialRampToValueAtTime(250, time + 0.02);
  clickEnv.gain.setValueAtTime(0.12, time); // extremely soft click transient
  clickEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.022);
  click.connect(clickEnv);
  clickEnv.connect(musicState.kickGain);
  click.start(time);
  click.stop(time + 0.03);
  _trackNode(click);
}

/**
 * Snare: soft lofi white noise brush snare.
 * Plays on backbeats (2 & 4).
 */
function _scheduleSnare(time: number): void {
  const ctx = getContext();
  if (!ctx || !musicState.snareGain) return;

  // Soft noise burst
  const dur = 0.07; // shorter decay
  const bufSize = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2500;
  const noiseEnv = ctx.createGain();
  noiseEnv.gain.setValueAtTime(0.25, time); // much softer snare noise
  noiseEnv.gain.exponentialRampToValueAtTime(0.001, time + dur);
  noiseSrc.connect(hp);
  hp.connect(noiseEnv);
  noiseEnv.connect(musicState.snareGain);
  noiseSrc.start(time);
  _trackNode(noiseSrc);

  // Soft sine body
  const body = ctx.createOscillator();
  const bodyEnv = ctx.createGain();
  body.type = 'sine';
  body.frequency.setValueAtTime(180, time);
  body.frequency.exponentialRampToValueAtTime(110, time + 0.05);
  bodyEnv.gain.setValueAtTime(0.25, time); // softer sine thump
  bodyEnv.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
  body.connect(bodyEnv);
  bodyEnv.connect(musicState.snareGain);
  body.start(time);
  body.stop(time + 0.09);
  _trackNode(body);
}

/**
 * Hi-hat: high-pass filtered noise burst.
 * Very soft metallic ticks.
 */
function _scheduleHihat(time: number, open: boolean): void {
  const ctx = getContext();
  if (!ctx || !musicState.hihatGain) return;

  const dur = open ? 0.10 : 0.03;
  const vol = open ? 0.28 : 0.14; // soft and subtle hi-hats
  const filterFreq = open ? 8000 : 11000;
  const bufSize = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = filterFreq;
  const env = ctx.createGain();
  env.gain.setValueAtTime(vol, time);
  env.gain.exponentialRampToValueAtTime(0.001, time + dur);

  src.connect(hp);
  hp.connect(env);
  env.connect(musicState.hihatGain);
  src.start(time);
  _trackNode(src);
}

/**
 * Bass: warm, smooth synthwave rolling bass pluck.
 */
function _scheduleBassNote(time: number, freq: number, durBeats: number): void {
  const ctx = getContext();
  if (!ctx || !musicState.bassFilter) return;

  const dur = (60 / musicState.currentBPM) * durBeats;

  // Triangle wave for smooth, warm bass
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);

  // Amplitude envelope: fast attack, smooth release
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(0.75, time + 0.008);
  env.gain.setValueAtTime(0.75, time + dur * 0.6);
  env.gain.linearRampToValueAtTime(0, time + dur);

  // Filter envelope: warm sweep
  musicState.bassFilter.frequency.setValueAtTime(350, time);
  musicState.bassFilter.frequency.exponentialRampToValueAtTime(150, time + dur * 0.5);

  osc.connect(env);
  env.connect(musicState.bassFilter);
  osc.start(time);
  osc.stop(time + dur + 0.01);
  _trackNode(osc);
}

/**
 * Synth Pad: warm, lush ambient triad chord sweep using detuned triangles.
 * Sustained for 8 beats.
 */
function _schedulePadChord(time: number, chord: typeof CHORDS[0]): void {
  const ctx = getContext();
  if (!ctx || !musicState.padFilter) return;

  const beatDur = 60 / musicState.currentBPM;
  const dur = beatDur * 8; // sustain for full chord duration

  // Full chord triad (root, third, fifth) for rich lush harmony
  const freqs = [chord.root, chord.third, chord.fifth];
  for (const f of freqs) {
    // Voice A (detuned)
    const oscA = ctx.createOscillator();
    oscA.type = 'triangle';
    oscA.frequency.setValueAtTime(f * 2, time);
    oscA.detune.setValueAtTime(-6, time);

    // Voice B (detuned)
    const oscB = ctx.createOscillator();
    oscB.type = 'triangle';
    oscB.frequency.setValueAtTime(f * 2, time);
    oscB.detune.setValueAtTime(6, time);

    // Smooth envelope with crossfade
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.24, time + 1.0); // slow fade-in
    env.gain.setValueAtTime(0.24, time + dur - 1.2);
    env.gain.linearRampToValueAtTime(0, time + dur); // smooth fade-out

    oscA.connect(env);
    oscB.connect(env);
    env.connect(musicState.padFilter);

    oscA.start(time);
    oscB.start(time);
    oscA.stop(time + dur + 0.1);
    oscB.stop(time + dur + 0.1);

    _trackNode(oscA);
    _trackNode(oscB);
  }
}

/**
 * Lead melody: square + detuned sawtooth blend with vibrato & LP filter.
 * Used when Interactive Melody Mode is disabled.
 */
function _scheduleLeadNote(time: number, freq: number, durBeats: number): void {
  const ctx = getContext();
  if (!ctx || !musicState.leadGain) return;

  const dur = (60 / musicState.currentBPM) * durBeats;

  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle'; // softer lead wave
  osc1.frequency.setValueAtTime(freq, time);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine'; // pure tone voice
  osc2.frequency.setValueAtTime(freq, time);
  osc2.detune.setValueAtTime(4, time);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = 4.5;
  lfoGain.gain.value = 2; // mod
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);
  lfoGain.connect(osc2.frequency);
  lfo.start(time);
  lfo.stop(time + dur + 0.1);
  _trackNode(lfo);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, time);
  filter.frequency.linearRampToValueAtTime(900, time + dur);
  filter.Q.value = 1.0;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(0.35, time + 0.03);
  env.gain.setValueAtTime(0.30, time + dur * 0.7);
  env.gain.linearRampToValueAtTime(0, time + dur);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(env);
  env.connect(musicState.leadGain);

  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + dur + 0.01);
  osc2.stop(time + dur + 0.01);

  _trackNode(osc1);
  _trackNode(osc2);
}

/**
 * Arp: flowing delay chimes arpeggiator.
 * Pure sine wave notes that repeat as a spacey echo.
 */
function _scheduleArpNote(time: number, freq: number): void {
  const ctx = getContext();
  if (!ctx || !musicState.arpGain) return;

  const dur = 0.22; // longer decay
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine'; // pure glassy tone
  osc.frequency.setValueAtTime(freq * 2, time); // 1 octave up for melody range

  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(0.08, time + 0.005); // soft attack
  env.gain.exponentialRampToValueAtTime(0.001, time + dur);

  osc.connect(env);
  env.connect(musicState.arpGain);
  osc.start(time);
  osc.stop(time + dur + 0.01);
  _trackNode(osc);

  // Echo delay voice (softer repeat after 150ms)
  const echoTime = time + 0.15;
  const echoOsc = ctx.createOscillator();
  const echoEnv = ctx.createGain();
  echoOsc.type = 'sine';
  echoOsc.frequency.setValueAtTime(freq * 2, echoTime);

  echoEnv.gain.setValueAtTime(0, echoTime);
  echoEnv.gain.linearRampToValueAtTime(0.03, echoTime + 0.005); // softer echo
  echoEnv.gain.exponentialRampToValueAtTime(0.001, echoTime + 0.15);

  echoOsc.connect(echoEnv);
  echoEnv.connect(musicState.arpGain);
  echoOsc.start(echoTime);
  echoOsc.stop(echoTime + 0.16);
  _trackNode(echoOsc);
}

/**
 * Plays a short quantized arpeggiated note generated by sliding.
 */
function _scheduleSlidingArpNote(time: number, freq: number): void {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master || !state.enabled) return;

  const dur = 0.14; // shorter decay
  const attack = 0.003;

  // Triangle wave + detuned sine octave up
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, time);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, time);
  osc2.detune.setValueAtTime(6, time);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 4.0;
  filter.frequency.setValueAtTime(2200, time);
  filter.frequency.exponentialRampToValueAtTime(500, time + 0.07);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, time);
  env.gain.linearRampToValueAtTime(0.12, time + attack); // softer volume
  env.gain.exponentialRampToValueAtTime(0.001, time + dur);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(env);
  env.connect(master);

  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + dur + 0.01);
  osc2.stop(time + dur + 0.01);

  _trackNode(osc1);
  _trackNode(osc2);
}

// ──── Master Beat Callback ────

/**
 * Master beat callback — called by beatEngine's schedule-ahead loop.
 * Schedules appropriate instrument hits for every quarter-note beat.
 * `audioTime` is the precise AudioContext time for sample-accurate scheduling.
 */
export function _onBeatScheduleMusic(beatIndex: number, _isDownbeat: boolean, audioTime?: number): void {
  const ctx = getContext();
  if (!ctx || !musicState.isPlaying) return;

  const beatDur = 60 / musicState.currentBPM;
  const baseTime = audioTime ?? (ctx.currentTime + 0.005);
  const chord = _getChord(beatIndex);
  
  // Track current active chord for interactive melody mode
  musicState.activeChord = chord;

  // If backing track is disabled, stop here and schedule nothing else!
  if (!state.backingTrackEnabled) return;

  const barBeat = beatIndex % 4;     // position within 4-beat bar
  const chordBeat = beatIndex % 8;   // position within 8-beat chord

  // ── KICK: downbeat (every 4th beat) ──
  if (barBeat === 0) {
    _scheduleKick(baseTime);
  }

  // ── SNARE: backbeat (beats 2 of each bar) ──
  if (barBeat === 2) {
    _scheduleSnare(baseTime);
  }

  // ── HI-HAT: every beat + off-beat 1/8th ──
  const isOpenHat = barBeat === 1 || barBeat === 3;
  _scheduleHihat(baseTime, isOpenHat);
  _scheduleHihat(baseTime + beatDur / 2, false); // off-beat 1/8th

  // ── BASS: rolling octave pattern (plays from start!) ──
  if (musicState.currentScore >= 0) {
    for (const hit of BASS_HITS) {
      if (Math.floor(hit.beat) === chordBeat) {
        const offset = (hit.beat - Math.floor(hit.beat)) * beatDur;
        const freq = hit.octUp ? chord.root * 2 : chord.root;
        _scheduleBassNote(baseTime + offset, freq, hit.durRatio);
      }
    }
  }

  // ── PAD: schedule new chord on chord boundaries (every 8 beats, unlocks at 50m) ──
  if (musicState.currentScore >= 50 && chordBeat === 0) {
    _schedulePadChord(baseTime, chord);
  }

  // ── LEAD MELODY: 16-beat alternating phrases (Bypassed in Interactive Melody Mode, unlocks at 300m) ──
  if (!state.interactiveMelody && musicState.currentScore >= 300) {
    const phraseBeat = beatIndex % 16;
    const phrase = MELODY_PHRASES[musicState.melodyPhraseIndex % MELODY_PHRASES.length];

    for (const note of phrase) {
      if (note.beat === phraseBeat) {
        _scheduleLeadNote(baseTime, note.freq, note.dur);
      }
    }

    // Switch phrase at boundary
    if (phraseBeat === 15) {
      musicState.melodyPhraseIndex++;
    }
  }

  // ── ARP: 1/8th note chord arpeggios (flowing chimes, unlocks at 150m) ──
  if (musicState.currentScore >= 150) {
    for (let i = 0; i < 2; i++) {
      const noteIdx = (beatIndex * 2 + i) % ARP_CHORD_KEYS.length;
      const key = ARP_CHORD_KEYS[noteIdx];
      const freq = chord[key];
      _scheduleArpNote(baseTime + (i * beatDur / 2), freq);
    }
  }

  // ── INTERACTIVE MELODY SLIDE SEQUENCER: 8th note quantized chimes (triggered by sliding) ──
  if (state.interactiveMelody && musicState.playerIsMoving) {
    _scheduleSlidingArpNote(baseTime, musicState.interactiveMelodyFreq);
    _scheduleSlidingArpNote(baseTime + beatDur / 2, musicState.interactiveMelodyFreq);
  }
}

// ──── Music Lifecycle ────

/**
 * Start the layered beat music. Called by beatEngine.start().
 */
export function startBeatMusic(bpm: number): void {
  if (!state.enabled) return;
  if (!_ensureMusicGains()) return;

  musicState.currentBPM = bpm;
  musicState.currentScore = 0;
  musicState.isPlaying = true;
  musicState.melodyPhraseIndex = 0;

  // Reset layer gains to initial state
  const ctx = getContext();
  if (ctx) {
    musicState.kickGain!.gain.setValueAtTime(BEAT_MUSIC_CONFIG.kickGain, ctx.currentTime);
    musicState.snareGain!.gain.setValueAtTime(BEAT_MUSIC_CONFIG.snareGain, ctx.currentTime);
    musicState.hihatGain!.gain.setValueAtTime(BEAT_MUSIC_CONFIG.hihatGain, ctx.currentTime);
    musicState.bassGain!.gain.setValueAtTime(BEAT_MUSIC_CONFIG.bassGain, ctx.currentTime);
    musicState.padGain!.gain.setValueAtTime(0, ctx.currentTime);
    musicState.leadGain!.gain.setValueAtTime(0, ctx.currentTime);
    musicState.arpGain!.gain.setValueAtTime(0, ctx.currentTime);
  }

  // Start the continuous Glow Drone if Interactive Melody Mode is enabled
  if (state.interactiveMelody) {
    _startGlowDrone();
  }
}

/**
 * Update the music system when BPM or score changes.
 * Smoothly fades in new layers when score thresholds are crossed.
 * Dynamically opens filters as intensity increases.
 */
export function updateBeatMusic(bpm: number, distance: number): void {
  if (!musicState.isPlaying) return;
  musicState.currentBPM = bpm;
  musicState.currentScore = distance; // store distance in currentScore for beat scheduling

  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const fadeSec = BEAT_MUSIC_CONFIG.layerFadeInDuration / 1000;

  // Fade in pad layer (unlocks at 50m)
  if (distance >= 50 && musicState.padGain) {
    const current = musicState.padGain.gain.value;
    if (current < BEAT_MUSIC_CONFIG.padGain * 0.9) {
      musicState.padGain.gain.setValueAtTime(current, now);
      musicState.padGain.gain.linearRampToValueAtTime(BEAT_MUSIC_CONFIG.padGain, now + fadeSec);
    }
  }

  // Fade in lead melody layer (unlocks at 300m)
  if (distance >= 300 && musicState.leadGain) {
    const current = musicState.leadGain.gain.value;
    if (current < BEAT_MUSIC_CONFIG.leadGain * 0.9) {
      musicState.leadGain.gain.setValueAtTime(current, now);
      musicState.leadGain.gain.linearRampToValueAtTime(BEAT_MUSIC_CONFIG.leadGain, now + fadeSec);
    }
  }

  // Fade in arp layer (unlocks at 150m)
  if (distance >= 150 && musicState.arpGain) {
    const current = musicState.arpGain.gain.value;
    if (current < BEAT_MUSIC_CONFIG.arpGain * 0.9) {
      musicState.arpGain.gain.setValueAtTime(current, now);
      musicState.arpGain.gain.linearRampToValueAtTime(BEAT_MUSIC_CONFIG.arpGain, now + fadeSec);
    }
  }

  // Dynamic bass filter: opens up as distance increases for richer harmonics
  if (musicState.bassFilter) {
    const filterTarget = Math.min(800, 300 + distance * 0.1);
    musicState.bassFilter.frequency.setTargetAtTime(filterTarget, now, 0.5);
  }

  // Dynamic pad filter: brighter as distance increases
  if (musicState.padFilter) {
    const filterTarget = Math.min(4000, 1500 + distance * 0.3);
    musicState.padFilter.frequency.setTargetAtTime(filterTarget, now, 0.5);
  }
}

/**
 * Stop all music layers with fadeout. Called by beatEngine.stop().
 */
export function stopBeatMusic(): void {
  musicState.isPlaying = false;

  const ctx = getContext();
  if (ctx) {
    const fadeOut = 0.3;
    const now = ctx.currentTime;
    const layers = [
      musicState.kickGain,
      musicState.snareGain,
      musicState.hihatGain,
      musicState.bassGain,
      musicState.padGain,
      musicState.leadGain,
      musicState.arpGain,
    ];
    for (const g of layers) {
      if (g) {
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + fadeOut);
      }
    }
  }

  // Stop continuous Glow Drone
  _stopGlowDrone();

  // Clean up scheduled nodes that haven't finished yet
  for (const node of musicState._scheduledNodes) {
    try { node.stop(); } catch { /* already stopped */ }
  }
  musicState._scheduledNodes.clear();
}

/**
 * Starts the continuous sliding glow drone synth layer.
 * Soft ambient layer following the player's Y position.
 */
function _startGlowDrone(): void {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master) return;

  _stopGlowDrone();

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 450; // higher cutoff for warmer harmonic presence
  filter.Q.value = 0.7; // low resonance for smooth warmth

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime); // silent initially, excited by motion

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine'; // pure fundamental tone
  osc1.frequency.value = 220; 

  const osc2 = ctx.createOscillator();
  osc2.type = 'triangle'; // mellow harmonics
  osc2.frequency.value = 220.5;
  osc2.detune.setValueAtTime(12, ctx.currentTime); // wider chorus detune (12 cents)

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);

  musicState.glowFilter = filter;
  musicState.glowGain = gain;
  musicState.glowOsc1 = osc1;
  musicState.glowOsc2 = osc2;
}

/**
 * Stops the continuous glow drone layer with a smooth fade-out.
 */
function _stopGlowDrone(): void {
  const ctx = getContext();
  const now = ctx ? ctx.currentTime : 0;

  if (musicState.glowGain && ctx) {
    const g = musicState.glowGain;
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + 0.3); // smooth fade out
  }

  const osc1 = musicState.glowOsc1;
  const osc2 = musicState.glowOsc2;
  if (ctx) {
    setTimeout(() => {
      try { osc1?.stop(); } catch {}
      try { osc2?.stop(); } catch {}
    }, 350);
  } else {
    try { osc1?.stop(); } catch {}
    try { osc2?.stop(); } catch {}
  }

  musicState.glowOsc1 = null;
  musicState.glowOsc2 = null;
  musicState.glowGain = null;
  musicState.glowFilter = null;
}

let _lastGlowFreq = 0;
let _lastGlowVol = -1;

/**
 * Updates the glow drone's target pitch and envelope.
 * Snaps to chord notes. Swells dynamically with movement velocity (includes baseline presence).
 */
export function updateInteractiveGlow(playerY: number, velocity: number): void {
  const ctx = getContext();
  if (
    !ctx || 
    !musicState.isPlaying || 
    !state.interactiveMelody || 
    !musicState.glowOsc1 || 
    !musicState.glowOsc2 ||
    !musicState.glowGain
  ) return;

  const chord = musicState.activeChord || CHORDS[0];
  
  // Scale of chord tones (spanning 2 octaves)
  const scale = [
    chord.root * 2,
    chord.third * 2,
    chord.fifth * 2,
    chord.seventh * 2,
    chord.root * 4,
    chord.third * 4,
    chord.fifth * 4,
    chord.seventh * 4,
  ];

  // Quantize inverted Y position to the nearest chord note (scale snapping arpeggiation)
  const invY = 1.0 - Math.min(1.0, Math.max(0.0, playerY));
  const scaleIndex = Math.min(7, Math.floor(invY * 8));
  const freq = scale[scaleIndex];

  const time = ctx.currentTime;
  
  // Apply discrete portamento glide only when target frequency changes
  if (freq !== _lastGlowFreq) {
    _lastGlowFreq = freq;
    musicState.glowOsc1.frequency.setTargetAtTime(freq, time, 0.08); 
    musicState.glowOsc2.frequency.setTargetAtTime(freq + 0.5, time, 0.08);
  }

  // Store frequency and movement status for the beat scheduler arpeggiator
  musicState.interactiveMelodyFreq = freq;
  musicState.playerIsMoving = velocity > 0.005;

  // Dynamic Volume Excitation: Very quiet, subtle background pad cushion
  const basePresence = velocity > 0.003 ? 0.025 : 0;
  const targetVolume = Math.min(0.04, basePresence + velocity * 0.05);

  if (Math.abs(targetVolume - _lastGlowVol) > 0.002) {
    _lastGlowVol = targetVolume;
    const currentVolume = musicState.glowGain.gain.value;
    // SWELL faster (50ms), DECAY slightly slower (150ms)
    const timeConstant = targetVolume > currentVolume ? 0.05 : 0.15;
    musicState.glowGain.gain.setTargetAtTime(targetVolume, time, timeConstant);
  }
}

/**
 * Plays a discrete synthesized cyber-pluck chime mapped to player Y position.
 * Quantized to active chord degrees for perfect consonance.
 * Action Quantized to the next 1/16th note beat of the master song clock.
 */
export function playInteractiveNote(playerY: number, source: 'pass' | 'swap'): void {
  const ctx = getContext();
  const master = getMasterGain();
  if (!ctx || !master || !state.enabled) return;

  const chord = musicState.activeChord || CHORDS[0];

  // Scale of chord tones (spanning 2 octaves)
  const scale = [
    chord.root * 2,
    chord.third * 2,
    chord.fifth * 2,
    chord.seventh * 2,
    chord.root * 4,
    chord.third * 4,
    chord.fifth * 4,
    chord.seventh * 4,
  ];

  // Map inverted Y so top is highest note (index 7), bottom is lowest (index 0)
  const invY = 1.0 - Math.min(1.0, Math.max(0.0, playerY));
  const scaleIndex = Math.min(7, Math.floor(invY * 8));
  let freq = scale[scaleIndex];

  // Swap notes can be pitch shifted or modified slightly for texture
  if (source === 'swap') {
    freq = freq * 1.5; // Fifth interval offset
  }

  // Action Quantization to the next 1/16th note grid of the master tempo to align with rhythm!
  const start = BeatEngine.getStartTime();
  const paused = BeatEngine.getTotalPausedDuration();
  const bpm = musicState.currentBPM;
  const beatDur = 60 / bpm;
  const sixteenthDur = beatDur / 4;
  
  const now = ctx.currentTime;
  const elapsed = now - start - paused;
  const nextSixteenthIndex = Math.ceil(elapsed / sixteenthDur);
  let playTime = start + paused + nextSixteenthIndex * sixteenthDur;

  // Prevent latency issues / scheduling in the past
  if (playTime < now + 0.015) {
    playTime += sixteenthDur;
  }

  const isPass = source === 'pass';
  const dur = isPass ? 0.14 : 0.20;
  const attack = isPass ? 0.01 : 0.005;

  // Voice 1: Pure sine wave for pass (ultra-soft, smooth chime), triangle for swap
  const osc1 = ctx.createOscillator();
  osc1.type = isPass ? 'sine' : 'triangle';
  osc1.frequency.setValueAtTime(freq, playTime);

  // Voice 2: Soft secondary sine wave 1 octave higher
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, playTime);
  osc2.detune.setValueAtTime(isPass ? 4 : 8, playTime);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = isPass ? 1.0 : 2.0; // gentle warm filter, no piercing resonance peaks
  
  filter.frequency.setValueAtTime(isPass ? 1600 : 2500, playTime);
  filter.frequency.exponentialRampToValueAtTime(isPass ? 400 : 600, playTime + 0.1);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, playTime);
  
  // Soft, subtle volume (0.07 for pass vs old loud 0.45!)
  const peakVolume = isPass ? 0.07 : 0.16;
  env.gain.linearRampToValueAtTime(peakVolume, playTime + attack);
  env.gain.exponentialRampToValueAtTime(0.001, playTime + dur);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(env);
  env.connect(master);

  osc1.start(playTime);
  osc2.start(playTime);
  
  osc1.stop(playTime + dur + 0.01);
  osc2.stop(playTime + dur + 0.01);

  _trackNode(osc1);
  _trackNode(osc2);
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
  isInteractiveMelodyEnabled,
  setInteractiveMelodyEnabled,
  isBackingTrackEnabled,
  setBackingTrackEnabled,
  updateInteractiveGlow,
  playInteractiveNote,

  // UI Sounds
  playButtonClick,
  playMenuSelect,
  playZoneSelect,

  // Gameplay Sounds
  playSwap,
  playShardCollect,
  playNearMiss,
  playDodgeMaster,
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
  playColorInvert,
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

  // Enemy Sounds - Glitch Seeker (Homing Ghost)
  playSeekerEnter,
  playSeekerHunting,
  playSeekerTeleport,
  playSeekerDeath,

  // Flux Overload Sounds - Yasaklı Hat Mekaniği
  playFluxOverloadWarning,
  playFluxOverloadStrike,

  // Start Sequence - Countdown sounds
  playCountdown,
  playCountdownGo,

  // Bonus Scoring Sounds
  playOverdriveDestroy,
  playResonanceDestroy,
  playPhantomPass,
  playPhantomCombo,
  playRhythmScore,

  // Beat / Rhythm Music - BPM Engine integration
  playBeatHit,
  startBeatMusic,
  updateBeatMusic,
  stopBeatMusic,

  // Mobile lifecycle — AudioContext suspend/resume
  suspendAudioContext,
  resumeAudioContext,
  onAudioContextStateChange,
};

export default AudioSystem;

