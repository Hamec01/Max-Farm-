import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Star } from "lucide-react";
import { PUZZLE_CATALOG, PuzzleConfig, isDogPuzzle, pickRandomPuzzle, pickRandomPieceCount } from "../../../data/puzzles";
import { generatePuzzleFromImage } from "../../../lib/gameRoom/puzzleGenerator";
import {
  PieceSnapState,
  trySnapToSlot,
  trySnapNeighbors,
  magnetSnapToNearestSlot,
  isPuzzleComplete,
  scatterPieces,
} from "../../../lib/gameRoom/snapSystem";
import { useBodyScrollLock } from "../../../lib/gameRoom/useBodyScrollLock";
import { playClickSound, playCoinSound, playLevelUpSound } from "../../../lib/audio";
import { playDogBarkSound } from "../../../lib/soundManager";

interface PuzzleGameProps {
  onClose: () => void;
}

type Phase = "select" | "play" | "won";

export const PuzzleGame: React.FC<PuzzleGameProps> = ({ onClose }) => {
  useBodyScrollLock(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const piecesRef = useRef<PieceSnapState[]>([]);
  const dragRef = useRef<{
    pointerId: number;
    groupId: string;
    startX: number;
    startY: number;
    origins: Map<string, { x: number; y: number }>;
    touchLift: number;
  } | null>(null);

  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState<PuzzleConfig | null>(null);
  const [difficulty, setDifficulty] = useState(4);
  const [pieces, setPieces] = useState<PieceSnapState[]>([]);
  const [ghostSrc, setGhostSrc] = useState("");
  const [boardSize, setBoardSize] = useState({ w: 300, h: 200, scale: 1 });
  const [stars, setStars] = useState<{ id: number; x: number; y: number }[]>([]);
  const [, tick] = useState(0);

  const layoutBoard = useCallback((pieceCount: number, imgW: number, imgH: number) => {
    const el = boardRef.current;
    if (!el) return { w: 280, h: 200, scale: 0.3, boardX: 20, boardY: 20, trayY: 0, trayH: 100 };
    const rect = el.getBoundingClientRect();
    const maxBoardW = rect.width * 0.88;
    const maxBoardH = rect.height * 0.55;
    const boardScale = Math.min(maxBoardW / imgW, maxBoardH / imgH);
    const w = imgW * boardScale;
    const h = imgH * boardScale;
    const boardX = (rect.width - w) / 2;
    const boardY = rect.height * 0.06;
    const trayH = Math.min(rect.height * 0.16, 108);
    const trayY = rect.height - trayH - 8;
    return { w, h, scale: boardScale, boardX, boardY, trayY, trayH };
  }, []);

  const startPuzzle = async (config: PuzzleConfig, count: number) => {
    const gen = await generatePuzzleFromImage(config.image, count);
    const layout = layoutBoard(count, gen.boardWidth, gen.boardHeight);
    const pieceStates: PieceSnapState[] = gen.pieces.map((p) => ({
      id: p.id,
      row: p.row,
      col: p.col,
      groupId: p.id,
      x: 0,
      y: 0,
      width: p.width * layout.scale,
      height: p.height * layout.scale,
      correctX: layout.boardX + p.col * p.width * layout.scale,
      correctY: layout.boardY + p.row * p.height * layout.scale,
      locked: false,
      canvas: p.canvas,
    }));
    scatterPieces(pieceStates, {
      x: 8,
      y: layout.trayY,
      w: (boardRef.current?.clientWidth ?? 400) - 16,
      h: layout.trayH,
    });
    piecesRef.current = pieceStates;
    setPieces([...pieceStates]);
    setBoardSize({ w: layout.w, h: layout.h, scale: layout.scale });
    setGhostSrc(config.image);
    setSelected(config);
    setDifficulty(count);
    setPhase("play");
    playClickSound();
  };

  const startRandomPuzzle = () => {
    const config = pickRandomPuzzle();
    const count = pickRandomPieceCount(config);
    startPuzzle(config, count);
  };

  const handleSnap = () => {
    let snapped = false;
    piecesRef.current.forEach((p) => {
      if (magnetSnapToNearestSlot(p)) snapped = true;
      else if (trySnapToSlot(p)) snapped = true;
    });
    if (trySnapNeighbors(piecesRef.current)) snapped = true;
    if (snapped) {
      playClickSound();
      setStars((s) => [
        ...s,
        { id: Date.now(), x: 40 + Math.random() * 60, y: 20 + Math.random() * 40 },
      ]);
      setTimeout(() => setStars((s) => s.slice(1)), 600);
    }
    setPieces([...piecesRef.current]);
    if (isPuzzleComplete(piecesRef.current)) {
      if (isDogPuzzle(selected)) {
        playDogBarkSound();
      } else {
        playLevelUpSound();
      }
      playCoinSound();
      setPhase("won");
    }
  };

  const onPiecePointerDown = (e: React.PointerEvent, pieceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const p = piecesRef.current.find((x) => x.id === pieceId);
    if (!p || p.locked || phase === "won") return;
    if (dragRef.current) return;
    const origins = new Map<string, { x: number; y: number }>();
    piecesRef.current
      .filter((x) => x.groupId === p.groupId)
      .forEach((x) => origins.set(x.id, { x: x.x, y: x.y }));
    dragRef.current = {
      pointerId: e.pointerId,
      groupId: p.groupId,
      startX: e.clientX,
      startY: e.clientY,
      origins,
      touchLift: e.pointerType === "touch" ? 48 : 0,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onBoardPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY - drag.touchLift;
    piecesRef.current.forEach((p) => {
      const o = drag.origins.get(p.id);
      if (o) {
        p.x = o.x + dx;
        p.y = o.y + dy;
      }
    });
    setPieces([...piecesRef.current]);
  };

  const onBoardPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current = null;
    handleSnap();
  };

  useEffect(() => {
    const onResize = () => tick((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const short = Math.min(window.innerWidth, window.innerHeight);
    if (short >= 640) return;
    const t = window.setTimeout(() => startRandomPuzzle(), 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-start once on phone mount
  }, []);

  const layout = boardRef.current
    ? layoutBoard(pieces.length, boardSize.w / boardSize.scale, boardSize.h / boardSize.scale)
    : null;

  return createPortal(
    <div
      ref={boardRef}
      className="fixed inset-0 z-[10000] bg-gradient-to-b from-sky-100 to-indigo-100 touch-none select-none overflow-hidden"
      style={{ width: "100vw", height: "100dvh", overscrollBehavior: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerMove={onBoardPointerMove}
      onPointerUp={onBoardPointerUp}
      onPointerCancel={onBoardPointerUp}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-[260] w-14 h-14 flex items-center justify-center bg-rose-500 text-white rounded-2xl border-4 border-rose-700 shadow-lg active:scale-95"
        style={{ marginTop: "env(safe-area-inset-top)" }}
        aria-label="Выйти"
      >
        <X className="w-8 h-8" strokeWidth={3} />
      </button>

      {phase === "select" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pt-16 gap-4 overflow-y-auto">
          <h2 className="text-xl lg:text-2xl font-black text-indigo-900">🧩 Выбери картинку!</h2>
          <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
            {PUZZLE_CATALOG.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelected(p);
                  setDifficulty(p.difficulties[0]);
                }}
                className={`p-2 rounded-2xl border-4 bg-white shadow-md active:scale-95 ${
                  selected?.id === p.id ? "border-amber-500 ring-2 ring-amber-300" : "border-amber-200"
                }`}
              >
                <img src={p.image} alt={p.name} className="w-full h-24 object-contain" draggable={false} />
                <span className="text-sm font-black text-amber-950">{p.name}</span>
              </button>
            ))}
          </div>
          {selected && (
            <div className="flex flex-col items-center gap-3">
              <p className="font-bold text-indigo-800">Сколько частей?</p>
              <div className="flex gap-3">
                {selected.difficulties.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`min-w-[4rem] min-h-[3rem] px-4 py-2 rounded-2xl border-4 font-black text-lg ${
                      difficulty === d ? "bg-amber-400 border-amber-700" : "bg-white border-amber-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => startPuzzle(selected, difficulty)}
                className="mt-2 px-8 py-4 bg-green-500 text-white font-black text-lg rounded-2xl border-4 border-green-700 shadow-lg active:scale-95"
              >
                ▶️ Начать!
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "play" && layout && (
        <>
          <div
            className="absolute border-4 border-dashed border-indigo-400/90 rounded-xl bg-slate-100 overflow-hidden"
            style={{
              left: layout.boardX,
              top: layout.boardY,
              width: boardSize.w,
              height: boardSize.h,
            }}
          >
            {ghostSrc && (
              <img
                src={ghostSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-fill grayscale contrast-75 brightness-95 pointer-events-none select-none"
                draggable={false}
              />
            )}
            {pieces
              .filter((p) => p.locked)
              .map((p) => (
                <img
                  key={`locked-${p.id}`}
                  src={p.canvas.toDataURL()}
                  alt=""
                  className="absolute pointer-events-none select-none"
                  style={{
                    left: p.correctX - layout.boardX,
                    top: p.correctY - layout.boardY,
                    width: p.width,
                    height: p.height,
                  }}
                  draggable={false}
                />
              ))}
          </div>
          {pieces
            .filter((p) => !p.locked)
            .map((p) => (
            <div
              key={p.id}
              role="presentation"
              onPointerDown={(e) => onPiecePointerDown(e, p.id)}
              className={`absolute cursor-grab active:cursor-grabbing touch-none ${
                dragRef.current?.groupId === p.groupId ? "z-50 scale-110" : "z-30"
              }`}
              style={{
                left: p.x,
                top: p.y,
                width: p.width,
                height: p.height,
                transform: dragRef.current?.groupId === p.groupId ? "scale(1.08)" : undefined,
              }}
            >
              <img
                src={p.canvas.toDataURL()}
                alt=""
                className="w-full h-full pointer-events-none select-none"
                draggable={false}
              />
            </div>
          ))}
          {stars.map((s) => (
            <Star
              key={s.id}
              className="absolute text-yellow-400 fill-yellow-300 animate-ping pointer-events-none"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: 28, height: 28 }}
            />
          ))}
        </>
      )}

      {phase === "won" && (
        <div className="absolute inset-0 z-[270] flex flex-col items-center justify-center bg-black/40 p-6 gap-6">
          <p className="text-4xl font-black text-white drop-shadow-lg animate-bounce">🎉 Молодец!</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <button
              type="button"
              onClick={startRandomPuzzle}
              className="flex-1 py-4 px-6 bg-amber-400 text-amber-950 font-black text-lg rounded-2xl border-4 border-amber-700 active:scale-95"
            >
              🎲 Ещё пазл!
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-green-500 text-white font-black text-lg rounded-2xl border-4 border-green-700 active:scale-95"
            >
              🏠 В комнату
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
