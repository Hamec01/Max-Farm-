let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext) {
    const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency: number, durationMs: number, gainValue: number, type: OscillatorType) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + durationMs / 1000);
}

export function unlockStage1Audio() {
  getAudioContext();
}

export function playStepTone() {
  playTone(170, 60, 0.03, "square");
}

export function playChickTone() {
  playTone(740, 110, 0.04, "triangle");
}

export function playCollectTone() {
  playTone(460, 120, 0.05, "sine");
  setTimeout(() => playTone(620, 140, 0.04, "sine"), 45);
}

export function playWarnTone() {
  playTone(210, 180, 0.04, "sawtooth");
}
