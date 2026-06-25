/**
 * Каналы звука: клик по животному/NPC не наслаивается, музыка день/ночь, SFX.
 */

import {
  playAnimalSound,
  getMuteState,
  setMuteState as setMuteStateBase,
  getAudioContext,
  stopActiveSynthSounds,
} from "./audio";

export { getMuteState };

export function setMuteState(muted: boolean) {
  setMuteStateBase(muted);
  if (muted) stopBackgroundMusic();
}

let characterToken = 0;
let nameSpeechTimeout: ReturnType<typeof setTimeout> | null = null;
let activeCharacterAudio: HTMLAudioElement | null = null;
let bgMusic: HTMLAudioElement | null = null;
let musicMode: "day" | "night" | null = null;
let musicSession = 0;
let musicFadeTimer: ReturnType<typeof setInterval> | null = null;
/** Все экземпляры фоновой музыки — гарантия «только один трек» */
const musicRegistry = new Set<HTMLAudioElement>();
let lastFootstepMs = 0;
let voicesLoaded = false;

/** Громкость фоновой музыки — тише SFX и голосов */
const BG_MUSIC_VOLUME = 0.1;
const MUSIC_FADE_MS = 350;

const DAY_MUSIC = [
  "/assets/audio/music/day/01-harvest-hop.mp3",
  "/assets/audio/music/day/02-harvest-hop.mp3",
  "/assets/audio/music/day/03-harvest-hop.mp3",
  "/assets/audio/music/day/04-harvest-hop.mp3",
  "/assets/audio/music/day/05-hayseed-parade.mp3",
  "/assets/audio/music/day/06-hayseed-parade.mp3",
  "/assets/audio/music/day/07-barnyard-moonhop.mp3",
  "/assets/audio/music/day/08-barnyard-moonhop.mp3",
  "/assets/audio/music/day/09-sunlit-barn-waltz.mp3",
  "/assets/audio/music/day/10-sunlit-barn-waltz.mp3",
];

const NIGHT_MUSIC = [
  "/assets/audio/music/night/01-sunbeam-playroom.mp3",
  "/assets/audio/music/night/02-sunbeam-playroom.mp3",
  "/assets/audio/music/night/03-sunny-pillow-parade.mp3",
  "/assets/audio/music/night/04-sunny-pillow-parade.mp3",
];

const ANIMAL_SOUND_MS: Record<string, number> = {
  cow: 880,
  sheep: 680,
  goat: 680,
  chicken: 200,
  duck: 200,
  goose: 280,
  turkey: 320,
  pig: 320,
  rabbit: 160,
  horse: 700,
  donkey: 620,
  bull: 540,
  dog: 260,
  cat: 480,
  dino: 720,
  default: 450,
};

function loadVoicesOnce() {
  if (voicesLoaded || typeof window === "undefined") return;
  voicesLoaded = true;
  window.speechSynthesis?.getVoices();
  window.speechSynthesis?.addEventListener("voiceschanged", () => {
    window.speechSynthesis?.getVoices();
  });
}

/** Разблокировка аудио после первого клика (браузерное правило) */
export function unlockAudio() {
  loadVoicesOnce();
  const ctx = getAudioContext();
  ctx?.resume();
}

/** Остановить звук животного + детское имя (переключение без наслоения) */
export function stopCharacterSounds() {
  characterToken++;
  stopActiveSynthSounds();
  if (activeCharacterAudio) {
    activeCharacterAudio.pause();
    activeCharacterAudio.src = "";
    activeCharacterAudio = null;
  }
  if (nameSpeechTimeout) {
    clearTimeout(nameSpeechTimeout);
    nameSpeechTimeout = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function getSoundDuration(soundType: string): number {
  return ANIMAL_SOUND_MS[soundType.toLowerCase()] ?? ANIMAL_SOUND_MS.default;
}

function tryPlayAudioFile(src: string, channel: "character" | "sfx" = "sfx"): Promise<boolean> {
  return new Promise((resolve) => {
    if (getMuteState()) {
      resolve(false);
      return;
    }
    const audio = new Audio(src);
    audio.volume = 0.85;
    if (channel === "character") {
      if (activeCharacterAudio) {
        activeCharacterAudio.pause();
        activeCharacterAudio.src = "";
      }
      activeCharacterAudio = audio;
    }
    const done = (ok: boolean) => {
      audio.oncanplaythrough = null;
      audio.onerror = null;
      if (channel === "character" && activeCharacterAudio === audio && !ok) {
        activeCharacterAudio = null;
      }
      resolve(ok);
    };
    audio.oncanplaythrough = () => {
      audio.play().then(() => done(true)).catch(() => done(false));
    };
    audio.onerror = () => done(false);
    audio.onended = () => {
      if (channel === "character" && activeCharacterAudio === audio) {
        activeCharacterAudio = null;
      }
    };
    audio.load();
    setTimeout(() => done(false), 1200);
  });
}

function speakChildLabel(label: string, token: number) {
  if (getMuteState() || token !== characterToken) return;

  const mp3Path = `/assets/audio/voices/names/${encodeURIComponent(label.toLowerCase())}.mp3`;
  tryPlayAudioFile(mp3Path, "character").then((played) => {
    if (played || token !== characterToken) return;

    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const utter = new SpeechSynthesisUtterance(label);
    utter.lang = "ru-RU";
    utter.rate = 0.92;
    utter.pitch = 1.45;
    utter.volume = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const ru =
      voices.find((v) => v.lang.startsWith("ru") && /child|milena|dmitri|irina/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("ru"));
    if (ru) utter.voice = ru;

    utter.onend = () => {
      if (token === characterToken) characterToken++;
    };
    window.speechSynthesis.speak(utter);
  });
}

/** Клик по животному: звук зверя → детский голос с названием */
export function playAnimalClickSound(soundType: string, nameLabel: string) {
  stopCharacterSounds();
  const token = characterToken;
  const type = soundType.toLowerCase();

  const mp3Animal = `/assets/audio/voices/animals/${type}.mp3`;
  tryPlayAudioFile(mp3Animal, "character").then((played) => {
    if (token !== characterToken) return;
    if (!played) {
      playAnimalSound(type);
    }
  });

  const delay = getSoundDuration(type);
  nameSpeechTimeout = setTimeout(() => {
    if (token !== characterToken) return;
    speakChildLabel(nameLabel, token);
  }, delay);
}

/** Редкий случайный звук животного (без названия) */
export function playAnimalAmbientSound(soundType: string) {
  if (getMuteState()) return;
  playAnimalSound(soundType.toLowerCase());
}

/** NPC — заглушка + опциональный mp3 позже */
export function playNpcClickSound(workerId: string) {
  stopCharacterSounds();
  const path = `/assets/audio/voices/npc/${workerId}.mp3`;
  tryPlayAudioFile(path, "character").then((played) => {
    if (!played && !getMuteState()) {
      playAnimalSound("rabbit");
    }
  });
}

function synthBlip(freq: number, dur: number, vol = 0.08) {
  const ctx = getAudioContext();
  if (!ctx || getMuteState()) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export function playButterflySound() {
  synthBlip(880, 0.12, 0.06);
  setTimeout(() => synthBlip(1320, 0.1, 0.05), 60);
  setTimeout(() => synthBlip(1760, 0.08, 0.04), 120);
}

export function playStarSound() {
  synthBlip(523, 0.15, 0.07);
  setTimeout(() => synthBlip(784, 0.12, 0.06), 80);
  setTimeout(() => synthBlip(1046, 0.2, 0.08), 160);
}

const DOG_BARK_SRC = "/assets/audio/sfx/dog.ogg";

/** Лай собаки — подбрасывание питомца или пазл со щенком */
export function playDogBarkSound() {
  if (getMuteState()) return;
  tryPlayAudioFile(DOG_BARK_SRC, "sfx").then((played) => {
    if (!played) playAnimalSound("dog");
  });
}

export function playFootstepSound() {
  const now = Date.now();
  if (now - lastFootstepMs < 340) return;
  lastFootstepMs = now;

  tryPlayAudioFile("/assets/audio/sfx/footstep.mp3").then((played) => {
    if (played) return;
    const ctx = getAudioContext();
    if (!ctx || getMuteState()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.06);
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  });
}

export function playWindAmbient() {
  if (getMuteState()) return;
  tryPlayAudioFile("/assets/audio/sfx/wind.mp3").then((played) => {
    if (played) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 1.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.02, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + 1.25);
  });
}

function clearMusicFadeTimer() {
  if (musicFadeTimer) {
    clearInterval(musicFadeTimer);
    musicFadeTimer = null;
  }
}

function detachBgMusic(audio: HTMLAudioElement) {
  audio.oncanplaythrough = null;
  audio.onended = null;
  audio.onerror = null;
  musicRegistry.delete(audio);
}

function killMusicElement(audio: HTMLAudioElement) {
  detachBgMusic(audio);
  audio.pause();
  audio.currentTime = 0;
  audio.removeAttribute("src");
  audio.load();
}

/** Мгновенно глушит ВСЕ фоновые треки (день + ночь + «зомби» из колбэков) */
function killAllBackgroundTracks(except?: HTMLAudioElement) {
  clearMusicFadeTimer();
  for (const audio of [...musicRegistry]) {
    if (except && audio === except) continue;
    killMusicElement(audio);
  }
  if (!except || bgMusic !== except) {
    bgMusic = except ?? null;
  }
}

function fadeVolume(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
  onDone?: () => void
) {
  clearMusicFadeTimer();
  const steps = Math.max(4, Math.round(durationMs / 40));
  const stepMs = durationMs / steps;
  let step = 0;
  audio.volume = from;
  musicFadeTimer = setInterval(() => {
    if (!musicRegistry.has(audio)) {
      clearMusicFadeTimer();
      onDone?.();
      return;
    }
    step++;
    const t = step / steps;
    audio.volume = from + (to - from) * t;
    if (step >= steps) {
      clearMusicFadeTimer();
      audio.volume = to;
      onDone?.();
    }
  }, stepMs);
}

function pickRandomTrack(list: string[]): string[] {
  return [...list].sort(() => Math.random() - 0.5);
}

function playMusicFromList(
  paths: string[],
  index = 0,
  session: number,
  mode: "day" | "night",
  fadeIn = true
) {
  if (getMuteState() || paths.length === 0 || index >= paths.length) return;
  if (session !== musicSession || musicMode !== mode) return;

  killAllBackgroundTracks();

  const audio = new Audio(paths[index]);
  audio.volume = fadeIn ? 0 : BG_MUSIC_VOLUME;
  musicRegistry.add(audio);
  bgMusic = audio;

  const tryPlay = () => {
    if (session !== musicSession || musicMode !== mode || bgMusic !== audio || getMuteState()) {
      killMusicElement(audio);
      if (bgMusic === audio) bgMusic = null;
      return;
    }
    audio
      .play()
      .then(() => {
        if (session !== musicSession || musicMode !== mode || bgMusic !== audio) {
          killMusicElement(audio);
          if (bgMusic === audio) bgMusic = null;
          return;
        }
        if (fadeIn) {
          fadeVolume(audio, 0, BG_MUSIC_VOLUME, MUSIC_FADE_MS);
        } else {
          audio.volume = BG_MUSIC_VOLUME;
        }
      })
      .catch(() => {
        if (session === musicSession && musicMode === mode) {
          playMusicFromList(paths, index + 1, session, mode, fadeIn);
        }
      });
  };

  audio.oncanplaythrough = tryPlay;
  audio.onerror = () => {
    if (session === musicSession && musicMode === mode) {
      playMusicFromList(paths, index + 1, session, mode, fadeIn);
    }
  };
  audio.onended = () => {
    if (session !== musicSession || musicMode !== mode || bgMusic !== audio || getMuteState()) return;
    playMusicFromList(pickRandomTrack(paths), 0, session, mode, true);
  };
  audio.load();

  if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    tryPlay();
  }
}

export function stopBackgroundMusic() {
  musicSession++;
  killAllBackgroundTracks();
  musicMode = null;
}

export function updateBackgroundMusic(isNight: boolean) {
  if (getMuteState()) {
    stopBackgroundMusic();
    return;
  }

  const mode: "day" | "night" = isNight ? "night" : "day";
  const list = mode === "night" ? NIGHT_MUSIC : DAY_MUSIC;
  if (list.length === 0) {
    stopBackgroundMusic();
    return;
  }

  if (musicMode === mode && bgMusic && musicRegistry.has(bgMusic)) return;

  const prev = bgMusic;
  const prevMode = musicMode;
  const session = musicSession + 1;
  musicSession = session;
  musicMode = mode;

  const startNext = () => {
    if (session !== musicSession || musicMode !== mode) return;
    playMusicFromList(pickRandomTrack(list), 0, session, mode, true);
  };

  if (prev && musicRegistry.has(prev) && prevMode && prevMode !== mode) {
    clearMusicFadeTimer();
    fadeVolume(prev, prev.volume, 0, MUSIC_FADE_MS, () => {
      killMusicElement(prev);
      if (bgMusic === prev) bgMusic = null;
      startNext();
    });
    return;
  }

  killAllBackgroundTracks();
  startNext();
}
