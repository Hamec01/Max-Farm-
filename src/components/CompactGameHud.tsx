import React, { useState } from "react";
import { playClickSound } from "../lib/audio";
import { CoinIcon } from "./CoinIcon";
import { FullscreenEnterButton } from "./FullscreenControls";

interface CompactGameHudProps {
  coins: number;
  day?: number;
  onOpenMap: () => void;
  onOpenShop: () => void;
  onOpenHelp: () => void;
  onExit: () => void;
  onEnterFullscreen?: () => void;
  isFullscreen?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

const cornerBtn =
  "interactive-element w-11 h-11 sm:w-12 sm:h-12 rounded-xl border-[3px] border-[#6B3410] shadow-md active:scale-95 transition-transform flex items-center justify-center touch-manipulation pointer-events-auto";

export const CompactGameHud: React.FC<CompactGameHudProps> = ({
  coins,
  day = 1,
  onOpenMap,
  onOpenShop,
  onOpenHelp,
  onExit,
  onEnterFullscreen,
  isFullscreen = false,
  isMuted,
  onToggleMute,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const fire = (fn: () => void) => (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    fn();
  };

  return (
    <div
      className="absolute left-2 z-[45] flex items-start gap-2 pointer-events-none select-none interactive-element"
      style={{ top: "max(0.5rem, env(safe-area-inset-top))" }}
      id="compact-game-hud"
    >
      <div className="relative pointer-events-auto">
        <button
          type="button"
          className={`${cornerBtn} bg-[#F5F0E6]`}
          onPointerDown={fire(() => setMenuOpen((v) => !v))}
          aria-label="Меню и настройки"
          id="compact-menu-button"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
            <rect x="4" y="6" width="16" height="2.5" rx="1.2" fill="#5C3A21" />
            <rect x="4" y="11" width="16" height="2.5" rx="1.2" fill="#5C3A21" />
            <rect x="4" y="16" width="16" height="2.5" rx="1.2" fill="#5C3A21" />
          </svg>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-[44] cursor-default"
              aria-hidden
              onPointerDown={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <div className="absolute left-0 top-[calc(100%+6px)] min-w-[180px] rounded-2xl border-[3px] border-[#6B3410] bg-[#FFF8DF]/98 shadow-xl p-2 flex flex-col gap-1 z-[46]">
              <div className="px-2 py-1 text-[10px] font-black text-[#78350F] flex items-center justify-between gap-2 border-b border-amber-900/15 pb-2 mb-0.5">
                <span>📅 День {day}</span>
                <span className="inline-flex items-center gap-0.5">
                  <CoinIcon size={12} />
                  {coins}
                </span>
              </div>
              <button
                type="button"
                className="interactive-element text-left px-3 py-2 rounded-xl text-sm font-black text-[#451A03] hover:bg-amber-100 active:bg-amber-200"
                onPointerDown={fire(() => {
                  onOpenMap();
                  setMenuOpen(false);
                })}
              >
                🗺️ Карта
              </button>
              <button
                type="button"
                className="interactive-element text-left px-3 py-2 rounded-xl text-sm font-black text-[#451A03] hover:bg-amber-100 active:bg-amber-200"
                onPointerDown={fire(onToggleMute)}
              >
                {isMuted ? "🔇 Включить звук" : "🔊 Выключить звук"}
              </button>
              <button
                type="button"
                className="interactive-element text-left px-3 py-2 rounded-xl text-sm font-black text-[#451A03] hover:bg-amber-100 active:bg-amber-200"
                onPointerDown={fire(() => {
                  onOpenHelp();
                  setMenuOpen(false);
                })}
              >
                💡 Помощь
              </button>
              {onEnterFullscreen && !isFullscreen && (
                <button
                  type="button"
                  className="interactive-element text-left px-3 py-2 rounded-xl text-sm font-black text-[#451A03] hover:bg-amber-100 active:bg-amber-200"
                  onPointerDown={fire(() => {
                    onEnterFullscreen();
                    setMenuOpen(false);
                  })}
                >
                  ⛶ Полный экран
                </button>
              )}
              <button
                type="button"
                className="interactive-element text-left px-3 py-2 rounded-xl text-sm font-black text-rose-800 hover:bg-rose-50 active:bg-rose-100 border-t border-amber-900/15 mt-0.5 pt-2"
                onPointerDown={fire(() => {
                  setMenuOpen(false);
                  onExit();
                })}
              >
                🚪 Выход (режим игры)
              </button>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className={`${cornerBtn} bg-gradient-to-b from-amber-500 to-yellow-400 relative overflow-visible`}
        onPointerDown={fire(onOpenShop)}
        aria-label="Закупки: зверята, навыки, рабочие"
        id="compact-shop-button"
      >
        <span className="text-xl leading-none">🏪</span>
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-0.5 rounded-full bg-emerald-500 border-2 border-[#6B3410] text-[9px] font-black text-white flex items-center justify-center leading-none">
          24
        </span>
      </button>

      {!isFullscreen && onEnterFullscreen && (
        <FullscreenEnterButton compact onEnter={onEnterFullscreen} />
      )}
    </div>
  );
};
