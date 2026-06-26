/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Custom Sound Synthesizer for "Maxim Farmer" using Web Audio API.
// This is 100% offline-friendly, doesn’t require loading mp3 files,
// and works on Mobile Safari (iOS) and Android Chrome with user-gesture unlocking.

let audioCtx: AudioContext | null = null;
let isMuted = false;
let audioUnlocked = false;

/** Вызывать только после pointerdown / keydown / click пользователя */
export function unlockAudioContext(): void {
  if (typeof window === "undefined") return;
  audioUnlocked = true;
  if (isMuted) return;

  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }

  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {
      /* браузер отклонил — ждём следующего жеста */
    });
  }
}

export function isAudioUnlocked(): boolean {
  return audioUnlocked;
}

export function getAudioContext(): AudioContext | null {
  if (isMuted || !audioUnlocked) return null;

  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }

  if (audioCtx.state === "suspended") {
    void audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function setMuteState(muted: boolean) {
  isMuted = muted;
  if (muted && audioCtx) {
    void audioCtx.suspend();
  } else if (!muted && audioCtx && audioUnlocked) {
    void audioCtx.resume().catch(() => {});
  }
}

/** Мгновенно обрывает все синтезированные звуки (клик по другому животному) */
export function stopActiveSynthSounds() {
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch {
      /* ignore */
    }
    audioCtx = null;
  }
}

export function getMuteState() {
  return isMuted;
}

// 1. Play standard UI Click
export function playClickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
}

// 2. Play standard Cash Register / Coin Sound
export function playCoinSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  
  // Note 1 (higher)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(987.77, time); // B5
  gain1.gain.setValueAtTime(0.08, time);
  gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(time);
  osc1.stop(time + 0.3);

  // Note 2 (delayed slightly)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1318.51, time + 0.08); // E6
  gain2.gain.setValueAtTime(0.06, time + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(time + 0.08);
  osc2.stop(time + 0.4);
}

// 3. Play level up sound (Major chord arpeggio)
export function playLevelUpSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.50]; // C4, E4, G4, C5, E5, C6
  
  notes.forEach((freq, idx) => {
    const t = time + idx * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    
    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  });
}

// 4. Play Bubble / Water Sound for Watering garden
export function playWaterSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  const count = 4;

  for (let i = 0; i < count; i++) {
    const t = time + i * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const startFreq = 200 + Math.random() * 100;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 3.5, t + 0.15);

    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }
}

// 5. Play Seed Planting Sound (rustle and soft drop)
export function playPlantSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(70, time + 0.18);

  gain.gain.setValueAtTime(0.15, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.18);
}

// 6. Play brush / petting sound (sweet soft swoosh of noise and chord)
export function playPetSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;

  // Soft high pure note (heart feeling)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(523.25, time); // C5
  osc.frequency.exponentialRampToValueAtTime(783.99, time + 0.2); // G5
  
  gain.gain.setValueAtTime(0.0, time);
  gain.gain.linearRampToValueAtTime(0.08, time + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.3);
}

// 7. Play shear sound (snip-snip scissors)
export function playShearSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  const snips = [0, 0.15];

  snips.forEach((delay) => {
    const t = time + delay;
    // Create random white noise for the metal scissor rubbing sound
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter noise to sound like metallic snip
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2000, t);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.15, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    noiseNode.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noiseNode.start(t);
    noiseNode.stop(t + 0.08);
  });
}

// 8. Play Eat Sound (Animals munches food)
export function playEatSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  const bites = [0, 0.12, 0.24];

  bites.forEach((delay) => {
    const t = time + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(15, t + 0.08);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  });
}

// 9. Play sad animal sound
export function playSadSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(260, time);
  osc.frequency.linearRampToValueAtTime(130, time + 0.6);

  gain.gain.setValueAtTime(0.1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.61);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.61);
}

// 10. ANIMAL SYNTHESIZERS (Mooo, Baaa, Cluck, Oink!)
export function playAnimalSound(type: string) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const time = ctx.currentTime;

  switch (type.toLowerCase()) {
    case "cow": { // Moo-ooo
      const mainOsc = ctx.createOscillator();
      const modOsc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      mainOsc.type = "sawtooth";
      mainOsc.frequency.setValueAtTime(130, time); // C3
      mainOsc.frequency.exponentialRampToValueAtTime(85, time + 0.7);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(500, time);
      filter.frequency.exponentialRampToValueAtTime(250, time + 0.7);
      filter.Q.setValueAtTime(5, time);

      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.18, time + 0.15); // soft swell
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.82);

      mainOsc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      mainOsc.start(time);
      mainOsc.stop(time + 0.85);
      break;
    }

    case "sheep": // Baaa-aa-aa
    case "goat": { // Meh-eh-eh
      const isGoat = type.toLowerCase() === "goat";
      const baseFreq = isGoat ? 200 : 160;
      
      const mainOsc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      mainOsc.type = "triangle";
      mainOsc.frequency.setValueAtTime(baseFreq, time);
      mainOsc.frequency.linearRampToValueAtTime(baseFreq * 0.85, time + 0.65);

      // Tremolo / Vibrato for the sheep bleat
      lfo.frequency.setValueAtTime(13, time); // 13Hz flutter
      lfoGain.gain.setValueAtTime(isGoat ? 14 : 10, time); // frequency offset

      lfo.connect(lfoGain);
      lfoGain.connect(mainOsc.frequency);

      gain.gain.setValueAtTime(0.01, time);
      gain.gain.linearRampToValueAtTime(isGoat ? 0.12 : 0.15, time + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);

      mainOsc.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(time);
      mainOsc.start(time);
      lfo.stop(time + 0.65);
      mainOsc.stop(time + 0.65);
      break;
    }

    case "chicken": { // Cluck! Cluck!
      const times = [0, 0.14];
      times.forEach((delay) => {
        const t = time + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.08);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.08);
      });
      break;
    }

    case "duck": { // Quack! nasal triangle wave
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(240, time);
      osc.frequency.linearRampToValueAtTime(190, time + 0.16);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(900, time);
      filter.Q.setValueAtTime(4, time);

      gain.gain.setValueAtTime(0.14, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.17);
      break;
    }

    case "goose": { // Honk! High-nasal honk
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, time);
      osc.frequency.exponentialRampToValueAtTime(420, time + 0.1);
      osc.frequency.exponentialRampToValueAtTime(260, time + 0.22);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, time);
      filter.Q.setValueAtTime(5, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.25);
      break;
    }

    case "turkey": { // Gobble-obble-obble
      const parts = [0, 0.06, 0.12, 0.18, 0.24];
      parts.forEach((delay, idx) => {
        const t = time + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        const base = 480 - idx * 30;
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.linearRampToValueAtTime(base * 0.7, t + 0.05);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.05);
      });
      break;
    }

    case "pig": { // Oink oink
      const times = [0, 0.18];
      times.forEach((delay) => {
        const t = time + delay;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(95, t);
        osc.frequency.linearRampToValueAtTime(80, t + 0.12);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(190, t);
        filter.Q.setValueAtTime(8, t);

        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.12);
      });
      break;
    }

    case "dog": { // Woof! Woof!
      const times = [0, 0.18];
      times.forEach((delay) => {
        const t = time + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(280, t);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.11);

        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.11);
      });
      break;
    }

    case "cat": { // Meooow-w-w
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(420, time);
      osc.frequency.exponentialRampToValueAtTime(680, time + 0.2); // rises
      osc.frequency.exponentialRampToValueAtTime(310, time + 0.45); // falls

      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.45);
      break;
    }

    case "donkey": { // Ieee-haaw!
      // Part 1: Ieee (high pitch)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(580, time);
      osc1.frequency.linearRampToValueAtTime(750, time + 0.25);
      gain1.gain.setValueAtTime(0.07, time);
      gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
      osc1.connect(gain1); gain1.connect(ctx.destination);
      osc1.start(time); osc1.stop(time + 0.25);

      // Part 2: Haaw (low pitch)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(140, time + 0.23);
      osc2.frequency.linearRampToValueAtTime(90, time + 0.58);
      gain2.gain.setValueAtTime(0.0, time + 0.23);
      gain2.gain.linearRampToValueAtTime(0.12, time + 0.28);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.58);
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.start(time + 0.23); osc2.stop(time + 0.58);
      break;
    }

    case "horse": { // Neigh-eigh-eigh-h!
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(350, time);
      osc.frequency.exponentialRampToValueAtTime(650, time + 0.15);
      osc.frequency.linearRampToValueAtTime(190, time + 0.65);

      lfo.frequency.setValueAtTime(18, time); // vibrato
      lfoGain.gain.setValueAtTime(35, time);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.11, time + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(time);
      osc.start(time);
      lfo.stop(time + 0.65);
      osc.stop(time + 0.65);
      break;
    }

    case "bull": { // low resonant snort
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(80, time);
      osc.frequency.exponentialRampToValueAtTime(50, time + 0.5);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(150, time);
      filter.Q.setValueAtTime(6, time);

      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.5);
      break;
    }

    case "rabbit": { // tiny squeaks
      const times = [0, 0.1];
      times.forEach((delay) => {
        const t = time + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1100, t + 0.06);

        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.06);
      });
      break;
    }

    case "dino": { // Roar for dinosaurs
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(55, time + 0.75);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, time);
      filter.frequency.exponentialRampToValueAtTime(180, time + 0.75);

      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.16, time + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.78);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.8);
      break;
    }

    default:
      // Fallback sweet chip sound
      playClickSound();
      break;
  }
}
