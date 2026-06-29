import { useEffect, useState } from "react";
import { MAX_OUTFITS } from "../data/maxOutfits";
import { FILE_SPRITE_SPECIES } from "./AnimalSVG";
import {
  MEADOW_BACKGROUND_SRC,
  BARNYARD_BACKGROUND_SRC,
  LAKESIDE_BACKGROUND_SRC,
  ORCHARD_BACKGROUND_SRC,
  DESERT_BACKGROUND_SRC,
} from "../lib/sceneLayout";

/** Те же кастомные PNG, что грузит WorkerSVG */
const WORKER_SPRITE_IDS = [
  "worker-papa",
  "worker-mama",
  "worker-nadya",
  "worker-lena",
  "worker-andrey",
  "worker-dima",
  "worker-arina",
  "worker-sveta",
  "worker-sergey",
  "worker-masha",
  "worker-misha",
  "worker-pastuh",
  "worker-petya",
  "worker-olya",
  "worker-nina",
  "worker-fyodor",
  "worker-vera",
  "worker-igor",
  "worker-kolya",
];

const ANIMAL_STATES = ["happy", "hungry"] as const;

function buildAssetList(): string[] {
  const max = MAX_OUTFITS.map((o) => `/assets/characters/maxim/${o.spriteFile}`);
  const workers = WORKER_SPRITE_IDS.map((id) => `/assets/characters/workers/${id}.png`);
  const animals = FILE_SPRITE_SPECIES.flatMap((species) => {
    const folder =
      species === "BULL" ? "cow" : species.toLowerCase();
    return ANIMAL_STATES.map((st) => `/assets/animals/${folder}/${st}.png`);
  });
  const backgrounds = [
    MEADOW_BACKGROUND_SRC,
    "/assets/backgrounds/ground.png",
    BARNYARD_BACKGROUND_SRC,
    LAKESIDE_BACKGROUND_SRC,
    ORCHARD_BACKGROUND_SRC,
    DESERT_BACKGROUND_SRC,
    "/assets/backgrounds/спрайты фруктовых деревьев и кустов.png",
  ];
  return [...backgrounds, ...max, ...workers, ...animals];
}

/**
 * Предзагрузка критичных спрайтов, чтобы они не «выскакивали» во время игры.
 * Реальный лимит времени — safety-таймаут, чтобы старт не подвисал, если
 * какой-то файл отсутствует/медленный.
 */
export function useAssetPreloader(maxWaitMs = 5000): { ready: boolean; progress: number } {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const list = buildAssetList();
    const total = list.length || 1;
    let done = 0;
    let cancelled = false;

    const bump = () => {
      if (cancelled) return;
      done += 1;
      setProgress(Math.round((done / total) * 100));
      if (done >= total) setReady(true);
    };

    list.forEach((src) => {
      const img = new Image();
      img.onload = bump;
      img.onerror = bump;
      img.src = src;
    });

    const safety = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, maxWaitMs);

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [maxWaitMs]);

  return { ready, progress };
}

export function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-sky-300 via-emerald-200 to-amber-100 select-none">
      <div className="flex items-end gap-1 text-5xl animate-bounce drop-shadow-lg">
        <span>🐔</span>
        <span style={{ animationDelay: "0.1s" }}>🐮</span>
        <span style={{ animationDelay: "0.2s" }}>🐷</span>
        <span style={{ animationDelay: "0.3s" }}>🦆</span>
      </div>

      <h1 className="mt-6 text-3xl font-black text-emerald-900 drop-shadow-sm tracking-wide">
        Ферма Максима
      </h1>
      <p className="mt-1 text-sm font-bold text-emerald-800/80">Загружаем ферму…</p>

      <div className="mt-6 w-64 max-w-[70vw] h-4 rounded-full bg-white/60 border-2 border-emerald-700/30 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-[width] duration-200 ease-out"
          style={{ width: `${Math.max(8, progress)}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-black text-emerald-800/70">{progress}%</p>
    </div>
  );
}
