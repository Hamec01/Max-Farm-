import React from "react";
import { DRAWING_COLORS } from "../../../lib/gameRoom/drawingTypes";

interface ColorPaletteProps {
  color: string;
  open: boolean;
  onPick: (c: string) => void;
  onClose: () => void;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({ color, open, onPick, onClose }) => {
  if (!open) return null;
  return (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-white border-4 border-amber-700 rounded-2xl shadow-2xl z-50 grid grid-cols-4 gap-2"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {DRAWING_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => {
            onPick(c);
            onClose();
          }}
          className={`w-11 h-11 lg:w-12 lg:h-12 rounded-xl transition-transform active:scale-95 ${
            color === c ? "ring-4 ring-amber-500 scale-110" : ""
          } ${c === "#FFFFFF" ? "border-2 border-gray-400" : ""}`}
          style={{ backgroundColor: c }}
          aria-label={`Цвет ${c}`}
        />
      ))}
    </div>
  );
};
