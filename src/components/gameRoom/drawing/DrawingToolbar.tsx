import React from "react";
import { ColorPalette } from "./ColorPalette";
import { DrawingTool } from "../../../lib/gameRoom/drawingTypes";

interface DrawingToolbarProps {
  tool: DrawingTool;
  color: string;
  paletteOpen: boolean;
  canUndo: boolean;
  compact?: boolean;
  onTool: (t: DrawingTool) => void;
  onColor: (c: string) => void;
  onPaletteToggle: () => void;
  onPaletteClose: () => void;
  onUndo: () => void;
  onClear: () => void;
}

const BTN =
  "min-w-[3.25rem] min-h-[3.25rem] lg:min-w-[4rem] lg:min-h-[4rem] px-3 py-2 rounded-2xl border-4 font-black text-xs lg:text-sm shadow-md active:scale-95 transition-transform touch-manipulation";
const BTN_COMPACT =
  "min-w-[2.75rem] min-h-[2.75rem] px-2 py-1.5 rounded-xl border-3 font-black text-lg shadow-md active:scale-95 transition-transform touch-manipulation";

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
  tool,
  color,
  paletteOpen,
  canUndo,
  compact = false,
  onTool,
  onColor,
  onPaletteToggle,
  onPaletteClose,
  onUndo,
  onClear,
}) => {
  const b = compact ? BTN_COMPACT : BTN;
  const tools: { id: DrawingTool; icon: string; label: string }[] = [
    { id: "pencil", icon: "✏️", label: "Карандаш" },
    { id: "marker", icon: "🖊️", label: "Фломастер" },
    { id: "brush", icon: "🖌️", label: "Кисть" },
    { id: "eraser", icon: "🧽", label: "Ластик" },
  ];

  return (
  <div
    className={`shrink-0 flex flex-wrap items-end justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-amber-200 to-amber-100 border-t-4 border-amber-700`}
    onPointerDown={(e) => e.stopPropagation()}
  >
    {tools.map((t) => (
      <button
        key={t.id}
        type="button"
        className={`${b} ${tool === t.id ? "bg-amber-500 border-amber-800 text-white" : "bg-white border-amber-600"}`}
        onPointerDown={() => onTool(t.id)}
        title={t.label}
      >
        {compact ? t.icon : `${t.icon} ${t.label}`}
      </button>
    ))}
    <div className="relative">
      <button
        type="button"
        className={`${b} bg-white border-amber-600 flex items-center gap-1`}
        onPointerDown={onPaletteToggle}
      >
        <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-gray-500" style={{ backgroundColor: color }} />
        {compact ? "🪣" : "🪣 Краска"}
      </button>
      <ColorPalette color={color} open={paletteOpen} onPick={onColor} onClose={onPaletteClose} />
    </div>
    <button type="button" className={`${b} bg-sky-100 border-sky-600 disabled:opacity-40`} disabled={!canUndo} onPointerDown={onUndo}>
      {compact ? "↩️" : "↩️ Отмена"}
    </button>
    <button type="button" className={`${b} bg-rose-100 border-rose-500`} onPointerDown={onClear}>
      {compact ? "🗑️" : "🗑️ Очистить"}
    </button>
  </div>
  );
};
