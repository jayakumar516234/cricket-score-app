// Web Audio API Synthesizer for Cricket Scoring Sound Effects & Haptics
// 100% Client-side, zero external assets, works offline

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const isSoundEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cricket_sound_effects') !== 'false';
};

export const setSoundEnabled = (enabled) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('cricket_sound_effects', String(enabled));
};

function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors if unsupported
    }
  }
}

/**
 * Play a synthesized tone or chord
 */
function playTone({ freq, type = 'sine', duration = 0.15, gain = 0.2, decay = true, delay = 0 }) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const startTime = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gainNode.gain.setValueAtTime(gain, startTime);
  if (decay) {
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  }

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

// ---------------- Cricket Sound Presets ----------------

/**
 * FOUR (4) - Upbeat celebratory boundary chime
 */
export function playFourSound() {
  if (!isSoundEnabled()) return;
  vibrate([80, 50, 120]);

  // Bright brass/bell arpeggio: C5, E5, G5, C6
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    playTone({ freq, type: 'triangle', duration: 0.22, gain: 0.25, delay: idx * 0.07 });
  });
}

/**
 * SIX (6) - Grand celebratory stadium maximum fanfare
 */
export function playSixSound() {
  if (!isSoundEnabled()) return;
  vibrate([100, 60, 100, 60, 220]);

  // Major chords fanfare: F4, A4, C5, F5
  const fanfare = [
    { freq: 440.0, delay: 0.0, dur: 0.15, gain: 0.2 },
    { freq: 554.37, delay: 0.08, dur: 0.15, gain: 0.22 },
    { freq: 659.25, delay: 0.16, dur: 0.2, gain: 0.25 },
    { freq: 880.0, delay: 0.26, dur: 0.35, gain: 0.3 },
    { freq: 1108.73, delay: 0.38, dur: 0.45, gain: 0.28 },
  ];

  fanfare.forEach(({ freq, delay, dur, gain }) => {
    playTone({ freq, type: 'triangle', duration: dur, gain, delay });
    playTone({ freq: freq * 1.5, type: 'sine', duration: dur * 0.8, gain: gain * 0.4, delay });
  });
}

/**
 * WICKET (OUT!) - Dramatic umpire whistle and drop impact
 */
export function playWicketSound() {
  if (!isSoundEnabled()) return;
  vibrate([200, 80, 250]);

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Umpire whistle trill (two alternating high frequencies)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(1400, now);
  osc1.frequency.linearRampToValueAtTime(1600, now + 0.12);
  osc1.frequency.linearRampToValueAtTime(1350, now + 0.25);

  osc2.frequency.setValueAtTime(1750, now);
  osc2.frequency.linearRampToValueAtTime(1900, now + 0.12);
  osc2.frequency.linearRampToValueAtTime(1700, now + 0.25);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.35);
  osc2.stop(now + 0.35);

  // Sub impact drop
  playTone({ freq: 280, type: 'sine', duration: 0.3, gain: 0.3, delay: 0.05 });
}

/**
 * EXTRA (Wide / No-ball) - Crisp referee alert whistle pulse
 */
export function playExtraSound() {
  if (!isSoundEnabled()) return;
  vibrate([60, 40, 60]);

  playTone({ freq: 880, type: 'sine', duration: 0.08, gain: 0.18, delay: 0 });
  playTone({ freq: 1174, type: 'sine', duration: 0.12, gain: 0.2, delay: 0.09 });
}

/**
 * REGULAR RUN (1, 2, 3 runs) - Crisp bat-ball contact tick
 */
export function playRunSound() {
  if (!isSoundEnabled()) return;
  vibrate([40]);

  playTone({ freq: 650, type: 'triangle', duration: 0.09, gain: 0.15 });
  playTone({ freq: 820, type: 'sine', duration: 0.08, gain: 0.12, delay: 0.03 });
}

/**
 * DOT BALL (0) - Subtle soft bat tap
 */
export function playDotBallSound() {
  if (!isSoundEnabled()) return;
  vibrate([20]);

  playTone({ freq: 320, type: 'sine', duration: 0.06, gain: 0.1 });
}

/**
 * UNDO BALL - Soft reverse click
 */
export function playUndoSound() {
  if (!isSoundEnabled()) return;
  vibrate([30, 30]);

  playTone({ freq: 440, type: 'sine', duration: 0.07, gain: 0.12, delay: 0 });
  playTone({ freq: 330, type: 'sine', duration: 0.08, gain: 0.12, delay: 0.05 });
}

/**
 * Helper to dispatch sound based on ball outcome
 */
export function playBallSound(candidate) {
  if (!candidate || !isSoundEnabled()) return;

  if (candidate.wicket?.type) {
    playWicketSound();
  } else if (candidate.runs === 6 && (!candidate.extra || candidate.extra === 'noball')) {
    playSixSound();
  } else if (candidate.runs === 4 && (!candidate.extra || candidate.extra === 'noball')) {
    playFourSound();
  } else if (candidate.extra === 'wide' || candidate.extra === 'noball') {
    playExtraSound();
  } else if (candidate.runs > 0) {
    playRunSound();
  } else {
    playDotBallSound();
  }
}
