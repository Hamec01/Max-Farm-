import React from "react";
import { ColorPalette } from "./ColorPalette";
import { DrawingTool } from "../../../lib/gameRoom/drawingTypes";

interface DrawingToolbarProps {
  tool: DrawingTool;
  color: string;
  paletteOpen: boolean;
  canUndo: boolean;
  onTool: (t: DrawingTool) => void;
  onColor: (c: string) => void;
  onPaletteToggle: () => void;
  onPaletteClose: () => void;
  onUndo: () => void;
  onClear: () => void;
}

const BTN =
  "min-w-[3.25rem] min-h-[3.25rem] lg:min-w-[4rem] lg:min-h-[4rem] px-3 py-2 rounded-2xl border-4 font-black text-xs lg:text-sm shadow-md active:scale-95 transition-transform touch-manipulation";

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  tool,
  color,
  paletteOpen,
  canUndo,
  onTool,
  onColor,
  onPaletteToggle,
  onPaletteClose,
  onUndo,
  onClear,
}) => (
  <div
    className="shrink-0 flex flex-wrap items-end justify-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-amber-200 to-amber-100 border-t-4 border-amber-700"
    onPointerDown={(e) => e.stopPropagation()}
  >
    <button type="button" className={`${BTN} ${tool === "pencil" ? "bg-amber-500 border-amber-800 text-white" : "bg-white border-amber-600"}`} onClick={() => onTool("pencil")}>✏️ Карандаш</button>
    <button type="button" className={`${BTN} ${tool === "marker" ? "bg-amber-500 border-amber-800 text-white" : "bg-white border-amber-600"}`} onClick={() => onTool("marker")}>🖊️ Фломастер</button>
    <button type="button" className={`${BTN} ${tool === "brush" ? "bg-amber-500 border-amber-800 text-white" : "bg-white border-amber-600"}`} onClick={() => onTool("brush")}>🖌️ Кисть</button>
    <button type="button" className={`${BTN} ${tool === "eraser" ? "bg-amber-500 border-amber-800 text-white" : "bg-white border-amber-600"}`} onClick={() => onTool("eraser")}>🧽 Ластик</button>
    <div className="relative">
      <button type="button" className={`${BTN} bg-white border-amber-600 flex items-center gap-1`} onClick={onPaletteToggle}>
        <span className="w-6 h-6 rounded-full border-2 border-gray-500" style={{ backgroundColor: color }} />
        🪣 Краска
      </button>
      <ColorPalette color={color} open={paletteOpen} onPick={onColor} onClose={onPaletteClose} />
    </div>
    <button type="button" className={`${BTN} bg-sky-100 border-sky-600 disabled:opacity-40`} disabled={!canUndo} onClick={onUndo}>↩️ Отмена</button>
    <button type="button" className={`${BTN} bg-rose-100 border-rose-500`} onClick={onClear}>🗑️ Очистить</button>
  </div>
);
