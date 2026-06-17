import React from "react";
import { WorkerSVG } from "./WorkerSVG";
import { playClickSound } from "../lib/audio";

interface MaxHomeInteriorProps {
  ownedFurniture: string[];
  onOpenShop: () => void;
}

/** Роман-домовой — всегда в доме, идёт в комплекте */
export const MaxHomeInterior: React.FC<MaxHomeInteriorProps> = ({
  ownedFurniture,
  onOpenShop,
}) => {
  const has = (id: string) => ownedFurniture.includes(id);
  const isEmpty = ownedFurniture.length === 0;

  const handleRomanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    onOpenShop();
  };

  return (
    <div className="absolute inset-0 z-0 select-none" id="max-home-interior">
      <div className="absolute inset-x-0 top-0 bottom-[38%] bg-gradient-to-b from-amber-100 via-orange-50 to-amber-200 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[8%] bg-[#92400E]/20 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 top-[62%] bg-gradient-to-t from-amber-800 via-amber-700 to-amber-600 pointer-events-none">
        <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_18px,rgba(0,0,0,0.08)_18px,rgba(0,0,0,0.08)_20px)]" />
      </div>

      {has("max_rug") && (
        <div className="absolute left-[32%] top-[68%] w-[36%] h-[18%] bg-rose-300/80 rounded-3xl border-4 border-rose-400/60 shadow-inner pointer-events-none" />
      )}

      {has("max_window") && (
        <div className="absolute right-[8%] top-[18%] w-[22%] h-[28%] bg-sky-200 border-8 border-amber-900 rounded-lg shadow-lg overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-sky-100" />
          <div className="absolute top-[20%] left-[25%] text-3xl">☀️</div>
          <div className="absolute bottom-[15%] left-[10%] text-xl opacity-70">☁️</div>
          <div className="absolute inset-y-0 left-1/2 w-1 bg-amber-900/50" />
          <div className="absolute inset-x-0 top-1/2 h-1 bg-amber-900/50" />
          <div className="absolute -left-1 top-0 bottom-0 w-3 bg-rose-200/90 rounded-l" />
          <div className="absolute -right-1 top-0 bottom-0 w-3 bg-rose-200/90 rounded-r" />
        </div>
      )}

      {has("max_photo") && (
        <div className="absolute left-[10%] top-[16%] w-[14%] h-[18%] bg-amber-50 border-4 border-amber-900 rounded-lg shadow-md flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl">👦</span>
          <span className="text-[7px] font-black text-amber-900 mt-0.5">МАКС</span>
        </div>
      )}

      {has("max_bed") && (
        <div className="absolute left-[6%] top-[52%] w-[28%] h-[22%] pointer-events-none">
          <div className="absolute bottom-0 w-full h-[35%] bg-amber-900 rounded-lg" />
          <div className="absolute bottom-[30%] w-full h-[45%] bg-sky-300 rounded-t-xl border-4 border-sky-400" />
          <div className="absolute bottom-[55%] left-[8%] w-[28%] h-[22%] bg-white rounded-full border-2 border-sky-200 shadow" />
          <div className="absolute bottom-[55%] right-[8%] w-[28%] h-[22%] bg-white rounded-full border-2 border-sky-200 shadow" />
          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black bg-amber-100 px-2 py-0.5 rounded-full border border-amber-800 text-amber-900">🛏️</span>
        </div>
      )}

      {has("max_desk") && (
        <div className="absolute right-[28%] top-[58%] w-[20%] h-[16%] pointer-events-none">
          <div className="absolute bottom-0 w-full h-[70%] bg-amber-700 rounded-t-lg border-2 border-amber-900" />
          <div className="absolute -top-1 left-[10%] w-[35%] h-[50%] bg-white border border-amber-400 rounded rotate-[-6deg] shadow flex items-center justify-center text-lg">🖍️</div>
          <div className="absolute -top-2 right-[5%] w-[40%] h-[55%] bg-yellow-50 border border-amber-400 rounded rotate-[4deg] shadow flex items-center justify-center text-xl">🌈</div>
        </div>
      )}

      {has("max_toy_chest") && (
        <div className="absolute left-[38%] top-[72%] w-[16%] h-[12%] pointer-events-none">
          <div className="absolute bottom-0 w-full h-full bg-amber-600 rounded-lg border-3 border-amber-900 shadow-md" />
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">🧸</span>
          <span className="absolute top-[10%] right-[-10%] text-lg">🚗</span>
          <span className="absolute top-[5%] left-[-8%] text-base">⚽</span>
        </div>
      )}

      {has("max_bookshelf") && (
        <div className="absolute right-[6%] top-[50%] w-[12%] h-[24%] bg-amber-800 border-4 border-amber-950 rounded-sm shadow-lg flex flex-col justify-around px-1 py-1 pointer-events-none">
          <div className="h-2 bg-red-400 rounded-sm" />
          <div className="h-2 bg-blue-400 rounded-sm" />
          <div className="h-2 bg-green-400 rounded-sm" />
          <div className="h-2 bg-yellow-400 rounded-sm" />
          <span className="text-[6px] font-black text-amber-100 text-center">📚</span>
        </div>
      )}

      {has("max_bedroom_lamp") && (
        <div className="absolute right-[32%] top-[48%] text-2xl animate-pulse pointer-events-none">🌙</div>
      )}

      {has("max_plush_sofa") && (
        <div className="absolute left-[44%] top-[58%] w-[22%] h-[14%] pointer-events-none">
          <div className="absolute bottom-0 w-full h-[80%] bg-indigo-400 rounded-xl border-4 border-indigo-600 shadow-md" />
          <div className="absolute bottom-[50%] left-[5%] w-[30%] h-[40%] bg-pink-300 rounded-lg border-2 border-pink-400" />
          <div className="absolute bottom-[50%] right-[5%] w-[30%] h-[40%] bg-pink-300 rounded-lg border-2 border-pink-400" />
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg">🛋️</span>
        </div>
      )}

      {has("max_ball_pit") && (
        <div className="absolute left-[52%] top-[70%] w-[20%] h-[14%] rounded-2xl border-4 border-blue-400 bg-blue-100/90 overflow-hidden pointer-events-none">
          <div className="absolute inset-1 flex flex-wrap gap-0.5 justify-center items-center p-1">
            {["🔴", "🟡", "🔵", "🟢", "🟣", "🟠"].map((c, i) => (
              <span key={i} className="text-[10px]">{c}</span>
            ))}
          </div>
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-sm font-black bg-white/90 px-1 rounded">🎈</span>
        </div>
      )}

      {isEmpty && (
        <div className="absolute left-[28%] top-[38%] text-center pointer-events-none">
          <span className="text-5xl block mb-2 opacity-60">📦</span>
          <p className="text-sm font-black text-amber-900/80 bg-white/70 px-4 py-2 rounded-2xl border-2 border-amber-700/30">
            Комната пустая…<br />
            <span className="text-[11px] font-bold text-amber-800">Нажми на Романа — он продаст мебель!</span>
          </p>
        </div>
      )}

      {/* Роман-домовой — всегда здесь, в комплекте с домом */}
      <div
        className="absolute z-30 pointer-events-auto"
        style={{ left: "48%", top: "64%", transform: "translate(-50%, -100%)" }}
      >
        <button
          type="button"
          onClick={handleRomanClick}
          className="flex flex-col items-center cursor-pointer hover:scale-105 active:scale-95 transition-transform animate-walk-wobble"
          id="max-home-roman-npc"
          title="Роман-домовой — магазин мебели"
        >
        <div className="absolute -top-16 px-2.5 py-1 bg-rose-100 border-2 border-rose-500 text-rose-950 rounded-xl text-[9px] font-black shadow-lg whitespace-nowrap animate-pulse">
          👆 Нажми — купить мебель!
        </div>
        <div className="px-2 py-0.5 bg-slate-900 border border-slate-600 text-slate-50 rounded-full text-[8px] font-black shadow-md flex items-center gap-1 mb-1">
          <span>🧹</span>
          <span>Роман</span>
          <span>🛋️</span>
        </div>
        <div className="w-20 h-24">
          <WorkerSVG workerId="worker-roman" className="w-20 h-24 filter drop-shadow-lg" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-2 bg-black/20 rounded-full blur-[1px]" />
        </button>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 top-[22%] text-[11px] font-black text-amber-900 bg-white/80 px-3 py-1 rounded-full border-2 border-amber-700 shadow pointer-events-none z-10">
        🏠 Дом Макса {isEmpty ? "— пусто" : `— ${ownedFurniture.length} вещей`}
      </div>
    </div>
  );
};
