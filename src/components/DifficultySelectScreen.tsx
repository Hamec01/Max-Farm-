import React from "react";
import { playClickSound } from "../lib/audio";
import type { GameDifficulty } from "../types";

interface DifficultySelectScreenProps {
  onSelect: (difficulty: GameDifficulty) => void;
}

export const DifficultySelectScreen: React.FC<DifficultySelectScreenProps> = ({ onSelect }) => {
  const pick = (d: GameDifficulty) => {
    playClickSound();
    onSelect(d);
  };

  return (
    <div
      className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-400 touch-none select-none"
      style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      role="dialog"
      aria-modal="true"
      aria-label="Выбор сложности"
    >
      <div className="w-full max-w-md flex flex-col items-center gap-6 animate-scale-up">
        <div className="text-center drop-shadow-md">
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tight">
            Ферма Макса
          </h1>
          <p className="mt-2 text-sm sm:text-base font-bold text-[#FEF3C7]">
            Выбери, как играть
          </p>
        </div>

        <div className="w-full flex flex-col gap-4">
          <button
            type="button"
            onClick={() => pick("normal")}
            className="w-full text-left p-5 rounded-3xl border-4 border-emerald-800 bg-gradient-to-br from-emerald-100 to-green-50 shadow-xl active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-4xl">🌈</span>
              <div>
                <span className="block text-xl font-black text-emerald-900">Нормальная</span>
                <span className="block text-xs font-bold text-emerald-800/80 mt-1 leading-snug">
                  Все локации открыты · работники бесплатно · простой экран — больше места для
                  животных!
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => pick("hard")}
            className="w-full text-left p-5 rounded-3xl border-4 border-[#6B3410] bg-gradient-to-br from-amber-100 to-[#FFF8DF] shadow-xl active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏆</span>
              <div>
                <span className="block text-xl font-black text-[#451A03]">Высокая</span>
                <span className="block text-xs font-bold text-[#78350F] mt-1 leading-snug">
                  Открывай локации, плати работникам, копи монеты — полная фермерская жизнь!
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
