import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { playClickSound, playCoinSound } from "../../../lib/audio";
import { saveDrawingDataUrl } from "../../../lib/gameRoom/drawingStorage";
import {
  DrawStroke,
  DrawingTool,
  redrawAllStrokes,
  interpolatePoints,
  drawStrokeOnContext,
} from "../../../lib/gameRoom/drawingTypes";
import { useBodyScrollLock } from "../../../lib/gameRoom/useBodyScrollLock";
import { DrawingToolbar } from "./DrawingToolbar";

interface DrawingGameProps {
  onClose: () => void;
  onSaved?: () => void;
  initialImage?: string | null;
}

const MAX_UNDO = 24;

export const DrawingGame: React.FC<DrawingGameProps> = ({ onClose, onSaved, initialImage }) => {
  useBodyScrollLock(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<DrawStroke[]>([]);
  const currentStrokeRef = useRef<DrawStroke | null>(null);
  const activePointerRef = useRef<number | null>(null);
  const lastDrawnPointIdxRef = useRef(1);

  const [tool, setTool] = useState<DrawingTool>("pencil");
  const [color, setColor] = useState("#000000");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [confirmAction, setConfirmAction] = useState<"clear" | "exit" | null>(null);

  const paintCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    redrawAllStrokes(ctx, strokesRef.current, w, h);
    if (currentStrokeRef.current) {
      drawStrokeOnContext(ctx, currentStrokeRef.current);
    }
  }, []);

  const drawIncrementalSegment = useCallback((stroke: DrawStroke, fromIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas || stroke.points.length <= fromIdx) return;
    const ctx = canvas.getContext("2d")!;
    const segment: DrawStroke = {
      ...stroke,
      points: stroke.points.slice(Math.max(0, fromIdx - 1)),
    };
    drawStrokeOnContext(ctx, segment);
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = canvasWrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w <= 0 || h <= 0) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintCanvas();
  }, [paintCanvas]);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    if (canvasWrapRef.current) ro.observe(canvasWrapRef.current);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    if (!initialImage) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w <= 0 || h <= 0) return;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      const scale = Math.min(w / img.width, h / img.height, 1);
      const iw = img.width * scale;
      const ih = img.height * scale;
      ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
    };
    img.src = initialImage;
  }, [initialImage]);

  const getPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (activePointerRef.current !== null) return;
    activePointerRef.current = e.pointerId;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const widthMul = e.pointerType === "touch" ? 2 : 1;
    currentStrokeRef.current = {
      tool,
      color,
      points: [getPoint(e.clientX, e.clientY)],
      widthMul,
    };
    lastDrawnPointIdxRef.current = 1;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointerRef.current !== e.pointerId || !currentStrokeRef.current) return;
    e.preventDefault();
    const stroke = currentStrokeRef.current;
    const native = e.nativeEvent as PointerEvent;
    const coalesced =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [native];
    const step = e.pointerType === "touch" ? 1 : 2;
    for (const ev of coalesced) {
      const last = stroke.points[stroke.points.length - 1];
      const next = getPoint(ev.clientX, ev.clientY);
      stroke.points.push(...interpolatePoints(last, next, step));
    }
    const fromIdx = lastDrawnPointIdxRef.current;
    if (stroke.points.length > fromIdx) {
      drawIncrementalSegment(stroke, fromIdx);
      lastDrawnPointIdxRef.current = stroke.points.length;
    }
  };

  const endStroke = (e: React.PointerEvent) => {
    if (activePointerRef.current !== e.pointerId) return;
    const stroke = currentStrokeRef.current;
    if (stroke && stroke.points.length > 1) {
      strokesRef.current = [...strokesRef.current, stroke].slice(-MAX_UNDO);
      setUndoCount(strokesRef.current.length);
    }
    currentStrokeRef.current = null;
    activePointerRef.current = null;
    lastDrawnPointIdxRef.current = 1;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    paintCanvas();
  };

  const handleUndo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setUndoCount(strokesRef.current.length);
    paintCanvas();
    playClickSound();
  };

  const handleClear = () => {
    setConfirmAction("clear");
  };

  const confirmClear = () => {
    strokesRef.current = [];
    setUndoCount(0);
    setConfirmAction(null);
    resizeCanvas();
    playClickSound();
  };

  const handleExit = () => {
    playClickSound();
    const hasContent = strokesRef.current.length > 0 || !!initialImage;
    if (hasContent) {
      setConfirmAction("exit");
      return;
    }
    onClose();
  };

  const confirmExit = async (save: boolean) => {
    setConfirmAction(null);
    if (save && canvasRef.current) {
      await saveDrawingDataUrl(canvasRef.current.toDataURL("image/png"));
      playCoinSound();
      onSaved?.();
    }
    onClose();
  };

  const overlay = (
    <div
      className="fixed inset-0 z-[10000] flex flex-col touch-none select-none"
      style={{
        width: "100vw",
        height: "100dvh",
        overscrollBehavior: "none",
        backgroundColor: "#FEF3C7",
      }}
      onContextMenu={(e) => e.preventDefault()}
      role="dialog"
      aria-modal="true"
      aria-label="Рисование на мольберте"
    >
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-3 py-2 bg-amber-200 border-b-4 border-amber-800 shadow-md z-[10002]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <span className="text-sm lg:text-base font-black text-amber-950 pl-1">🎨 Мольберт</span>
        <button
          type="button"
          onClick={handleExit}
          className="flex items-center gap-2 min-w-[3.5rem] min-h-[3.5rem] lg:min-w-[4rem] lg:min-h-[4rem] px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl border-4 border-rose-800 shadow-lg active:scale-95 touch-manipulation"
          aria-label="Выйти из рисования"
        >
          <X className="w-7 h-7 lg:w-8 lg:h-8 shrink-0" strokeWidth={3.5} />
          <span className="font-black text-sm lg:text-base hidden sm:inline">Выход</span>
        </button>
      </div>

      {confirmAction && (
        <div className="absolute inset-x-4 top-[4.5rem] z-[10003] flex flex-col items-center gap-3 p-4 bg-white/95 rounded-2xl border-4 border-amber-700 shadow-xl">
          <p className="font-black text-amber-950 text-center text-sm sm:text-base">
            {confirmAction === "clear" ? "Стереть весь рисунок?" : "Сохранить рисунок на мольберте?"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {confirmAction === "clear" ? (
              <>
                <button
                  type="button"
                  onClick={confirmClear}
                  className="px-5 py-3 bg-rose-500 text-white font-black rounded-xl border-4 border-rose-800 active:scale-95 touch-manipulation"
                >
                  Стереть
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-5 py-3 bg-white font-black rounded-xl border-4 border-amber-600 active:scale-95 touch-manipulation"
                >
                  Отмена
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => confirmExit(true)}
                  className="px-5 py-3 bg-green-500 text-white font-black rounded-xl border-4 border-green-800 active:scale-95 touch-manipulation"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => confirmExit(false)}
                  className="px-5 py-3 bg-white font-black rounded-xl border-4 border-amber-600 active:scale-95 touch-manipulation"
                >
                  Не сохранять
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-5 py-3 bg-sky-100 font-black rounded-xl border-4 border-sky-500 active:scale-95 touch-manipulation"
                >
                  Назад
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div ref={canvasWrapRef} className="flex-1 min-h-[50dvh] px-1 py-1 sm:px-2 sm:py-2">
        <canvas
          ref={canvasRef}
          className="block w-full h-full bg-white rounded-2xl border-4 border-amber-800 shadow-inner"
          style={{ touchAction: "none", userSelect: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onLostPointerCapture={endStroke}
        />
      </div>

      <DrawingToolbar
        compact
        tool={tool}
        color={color}
        paletteOpen={paletteOpen}
        canUndo={undoCount > 0}
        onTool={setTool}
        onColor={setColor}
        onPaletteToggle={() => setPaletteOpen((v) => !v)}
        onPaletteClose={() => setPaletteOpen(false)}
        onUndo={handleUndo}
        onClear={handleClear}
      />
    </div>
  );

  return createPortal(overlay, document.body);
};
