import React, { useEffect, useState } from "react";
import { playClickSound } from "../../lib/audio";
import { loadDrawingDataUrl } from "../../lib/gameRoom/drawingStorage";
import { DrawingGame } from "./drawing/DrawingGame";
import { PuzzleGame } from "./puzzle/PuzzleGame";

interface GameRoomProps {
  onBack: () => void;
  onImmersiveChange?: (immersive: boolean) => void;
}

export const GameRoom: React.FC<GameRoomProps> = ({ onBack, onImmersiveChange }) => {
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [puzzleOpen, setPuzzleOpen] = useState(false);
  const [easelPreview, setEaselPreview] = useState<string | null>(null);

  const refreshEasel = () => {
    loadDrawingDataUrl().then(setEaselPreview);
  };

  useEffect(() => {
    refreshEasel();
  }, []);

  useEffect(() => {
    onImmersiveChange?.(drawingOpen || puzzleOpen);
    return () => onImmersiveChange?.(false);
  }, [drawingOpen, puzzleOpen, onImmersiveChange]);

  return (
    <div className="absolute inset-0 z-[15] select-none" id="max-home-game-room">
      <div className="absolute inset-x-0 top-0 bottom-[38%] bg-gradient-to-b from-violet-100 via-pink-50 to-amber-100 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 top-[62%] bg-gradient-to-t from-violet-300 via-fuchsia-200 to-pink-100 pointer-events-none">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,#fff_0%,transparent_50%)]" />
      </div>

      <button
        type="button"
        onClick={() => {
          playClickSound();
          onBack();
        }}
        className="absolute left-3 top-3 z-40 px-4 py-2 bg-white/90 border-3 border-violet-600 text-violet-900 font-black text-xs rounded-2xl shadow-lg active:scale-95 pointer-events-auto"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        ← В дом
      </button>

      <div className="absolute left-1/2 -translate-x-1/2 top-[10%] text-[11px] font-black text-violet-900 bg-white/85 px-4 py-1.5 rounded-full border-2 border-violet-600 shadow pointer-events-none z-10">
        🎮 Игровая комната Макса
      </div>

      {/* Мольберт */}
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setDrawingOpen(true);
        }}
        className="absolute z-30 pointer-events-auto touch-none active:scale-95 transition-transform"
        style={{ left: "18%", top: "42%", transform: "translate(-50%, -50%)" }}
        aria-label="Мольберт — рисовать"
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-100 border-2 border-amber-600 text-amber-950 rounded-xl text-[9px] font-black whitespace-nowrap animate-pulse shadow">
          👆 Рисовать!
        </div>
        <div className="relative w-[28vw] max-w-[140px] min-w-[90px]">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-[45%] bg-amber-800 rounded-sm" />
          <div className="absolute bottom-[38%] left-1/2 -translate-x-1/2 w-[90%] h-2 bg-amber-700 rotate-[-12deg] origin-left" />
          <div className="absolute bottom-[38%] left-1/2 -translate-x-1/2 w-[90%] h-2 bg-amber-700 rotate-[12deg] origin-right" />
          <div className="relative mx-auto w-[75%] aspect-[4/5] bg-white border-4 border-amber-900 rounded-sm shadow-lg overflow-hidden">
            {easelPreview ? (
              <img src={easelPreview} alt="Твой рисунок" className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl opacity-40">🖼️</div>
            )}
          </div>
        </div>
      </button>

      {/* Стол с пазлами */}
      <button
        type="button"
        onClick={() => {
          playClickSound();
          setPuzzleOpen(true);
        }}
        className="absolute z-30 pointer-events-auto touch-none active:scale-95 transition-transform"
        style={{ left: "72%", top: "58%", transform: "translate(-50%, -50%)" }}
        aria-label="Пазлы"
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-sky-100 border-2 border-sky-600 text-sky-950 rounded-xl text-[9px] font-black whitespace-nowrap animate-pulse shadow">
          👆 Пазлы!
        </div>
        <div className="relative w-[32vw] max-w-[160px] min-w-[100px]">
          <div className="h-3 bg-amber-700 rounded-t-lg border-2 border-amber-900" />
          <div className="h-[18%] bg-amber-600 border-x-4 border-amber-900" />
          <div className="relative bg-amber-500 border-4 border-amber-900 rounded-b-xl p-2 shadow-lg">
            <div className="grid grid-cols-2 gap-1">
              {["🧩", "🧩", "🧩", "🧩"].map((e, i) => (
                <span key={i} className="text-lg lg:text-xl text-center">{e}</span>
              ))}
            </div>
            <div className="absolute -right-2 -top-1 text-xl">📦</div>
          </div>
        </div>
      </button>

      <div className="absolute right-[8%] bottom-[42%] text-4xl opacity-60 pointer-events-none">🧸</div>
      <div className="absolute left-[8%] bottom-[40%] text-3xl opacity-50 pointer-events-none">🎈</div>

      {drawingOpen && (
        <DrawingGame
          initialImage={easelPreview}
          onClose={() => setDrawingOpen(false)}
          onSaved={refreshEasel}
        />
      )}
      {puzzleOpen && <PuzzleGame onClose={() => setPuzzleOpen(false)} />}
    </div>
  );
};
