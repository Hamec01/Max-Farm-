import React from "react";
import { LocationId } from "../types";
import { LOCATIONS } from "../data";
import { HEADER_LOCATION_ORDER, LOCATION_EMOJI, isInteriorZone } from "../data/locations";
import { playClickSound } from "../lib/audio";

interface LocationMapModalProps {
  activeLocationId: LocationId;
  unlockedLocationIds: LocationId[];
  level: number;
  coins: number;
  onSelectLocation: (locId: LocationId) => void;
  onClose: () => void;
}

/** Позиции на схеме карты (проценты) */
const MAP_LAYOUT: Record<string, { x: number; y: number }> = {
  MEADOW: { x: 18, y: 22 },
  BARNYARD: { x: 42, y: 18 },
  MAX_HOME: { x: 58, y: 28 },
  GARDEN: { x: 28, y: 48 },
  LAKESIDE: { x: 72, y: 38 },
  ORCHARD: { x: 82, y: 58 },
  FOREST: { x: 15, y: 68 },
  DESERT: { x: 48, y: 72 },
  LAKE: { x: 78, y: 78 },
  HILLS: { x: 35, y: 88 },
  VALLEY: { x: 62, y: 88 },
};

export const LocationMapModal: React.FC<LocationMapModalProps> = ({
  activeLocationId,
  unlockedLocationIds,
  level,
  coins,
  onSelectLocation,
  onClose,
}) => {
  const handlePick = (e: React.MouseEvent, locId: LocationId) => {
    e.stopPropagation();
    e.preventDefault();
    playClickSound();
    onSelectLocation(locId);
    const isUnlocked = isInteriorZone(locId) || unlockedLocationIds.includes(locId);
    if (isUnlocked) {
      requestAnimationFrame(() => onClose());
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3 animate-fade-in"
      id="location-map-modal"
      onClick={onClose}
    >
      <div
        className="bg-[#FFF8E7] border-4 border-[#5C3A21] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-amber-900/20 bg-gradient-to-r from-emerald-100 to-amber-100">
          <div>
            <h2 className="text-lg font-black text-[#5C3A21] flex items-center gap-2">
              <span className="text-2xl">🗺️</span> Карта фермы
            </h2>
            <p className="text-[10px] font-bold text-amber-800 mt-0.5">Нажми на локацию, чтобы быстро переместиться</p>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white border-2 border-rose-500 text-rose-600 font-black text-sm hover:bg-rose-50 cursor-pointer shadow"
          >
            ✕
          </button>
        </div>

        {/* Схематичная карта */}
        <div className="relative mx-3 mt-3 mb-2 h-44 sm:h-52 rounded-2xl border-4 border-emerald-700/40 bg-gradient-to-br from-emerald-200 via-lime-100 to-sky-100 overflow-hidden shadow-inner">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_40%,#86EFAC_0%,transparent_50%),radial-gradient(circle_at_70%_60%,#7DD3FC_0%,transparent_45%)]" />
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M 10 50 Q 30 30 50 40 T 90 55" stroke="#92400E" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
            <path d="M 20 75 Q 50 65 80 70" stroke="#0284C7" strokeWidth="1.2" fill="none" opacity="0.6" />
          </svg>
          {HEADER_LOCATION_ORDER.map((locId) => {
            const pos = MAP_LAYOUT[locId] || { x: 50, y: 50 };
            const isUnlocked = isInteriorZone(locId) || unlockedLocationIds.includes(locId as LocationId);
            const isActive = activeLocationId === locId;
            const emoji = LOCATION_EMOJI[locId] || "🏡";
            return (
              <button
                key={locId}
                type="button"
                onClick={(e) => handlePick(e, locId as LocationId)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                  isActive ? "scale-110 z-10" : "hover:scale-105"
                }`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                title={LOCATIONS[locId as LocationId].nameRu}
              >
                <span
                  className={`text-xl sm:text-2xl p-1 rounded-xl border-2 shadow-md ${
                    isActive
                      ? "bg-amber-500 border-yellow-300 ring-2 ring-yellow-400"
                      : isUnlocked
                      ? "bg-white/95 border-amber-700/30"
                      : "bg-stone-300/90 border-stone-500 grayscale opacity-80"
                  }`}
                >
                  {isUnlocked ? emoji : "🔒"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Список локаций */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {HEADER_LOCATION_ORDER.map((locId) => {
            const loc = LOCATIONS[locId as LocationId];
            const isUnlocked = isInteriorZone(locId) || unlockedLocationIds.includes(locId as LocationId);
            const isActive = activeLocationId === locId;
            const canAfford = coins >= loc.unlockCost && level >= loc.minLevel;
            const emoji = LOCATION_EMOJI[locId] || "🏡";

            return (
              <button
                key={locId}
                type="button"
                onClick={(e) => handlePick(e, locId as LocationId)}
                className={`text-left p-2 rounded-xl border-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-amber-500 bg-amber-100 ring-2 ring-amber-400 shadow-md"
                    : isUnlocked
                    ? "border-emerald-300 bg-white hover:bg-emerald-50 hover:border-emerald-500"
                    : "border-stone-300 bg-stone-100/80 opacity-90 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{isUnlocked ? emoji : "🔒"}</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-[#5C3A21] leading-tight">{loc.nameRu}</span>
                </div>
                {!isUnlocked && (
                  <p className="text-[8px] font-bold text-stone-600 mt-1 leading-tight">
                    Ур. {loc.minLevel} · {loc.unlockCost}🪙
                    {canAfford ? " ✓" : ""}
                  </p>
                )}
                {isActive && (
                  <p className="text-[8px] font-black text-amber-700 mt-0.5">📍 Вы здесь</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
