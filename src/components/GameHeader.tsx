/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { LocationId } from "../types";
import { LOCATIONS } from "../data";
import { playClickSound } from "../lib/audio";
import { LOCATION_EMOJI } from "../data/locations";
import { CoinIcon } from "./CoinIcon";
import { FullscreenEnterButton } from "./FullscreenControls";

interface GameHeaderProps {
  coins: number;
  level: number;
  experience: number;
  activeLocationId: LocationId;
  onOpenMap: () => void;
  onOpenShop?: () => void;
  onOpenHelp: () => void;
  onEnterFullscreen?: () => void;
  isFullscreen?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  day?: number;
  dayProgress?: number;
  dayLength?: number;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  coins,
  level,
  experience,
  activeLocationId,
  onOpenMap,
  onOpenShop,
  onOpenHelp,
  onEnterFullscreen,
  isFullscreen = false,
  isMuted,
  onToggleMute,
  day = 1,
  dayProgress = 0,
  dayLength = 240,
}) => {
  const nextLevelExp = level * 100;
  const expPercentage = Math.min((experience / nextLevelExp) * 100, 100);
  const dayRemainingSec = Math.max(0, dayLength - dayProgress);
  const locEmoji = LOCATION_EMOJI[activeLocationId] || "🏡";
  const locName = LOCATIONS[activeLocationId]?.nameRu || "";

  return (
    <div className="absolute top-1.5 lg:top-2 left-2 lg:left-4 right-2 lg:right-4 z-30 flex flex-col md:flex-row items-center justify-between gap-1.5 lg:gap-3 w-auto pointer-events-none select-none" id="game-header">
      <div className="flex flex-col items-center md:items-start text-center md:text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] pointer-events-auto shrink-0">
        <h1 className="text-base sm:text-xl lg:text-3xl font-black text-white tracking-tight uppercase italic leading-none animate-pulse" id="game-title">
          Ферма Макса
        </h1>
        <p className="hidden sm:block text-[8px] lg:text-[9px] text-[#FEF3C7] font-black mt-0.5 lg:mt-1 tracking-wide uppercase leading-none">Добрая ферма для любимого сына</p>
      </div>

      {/* Кнопка карты + текущая локация */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          playClickSound();
          onOpenMap();
        }}
        className="flex items-center gap-1.5 lg:gap-2 bg-[#451A03]/55 backdrop-blur-xs p-1 lg:p-1.5 px-2 lg:px-3 rounded-full border-2 border-amber-400/50 pointer-events-auto shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shrink min-w-0 max-w-[min(92vw,320px)]"
        id="header-map-button"
        title="Открыть карту локаций"
      >
        <span className="flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 border-2 border-emerald-800 text-lg lg:text-xl shadow-inner shrink-0">
          🗺️
        </span>
        <div className="flex flex-col items-start min-w-0 text-left">
          <span className="text-[9px] lg:text-[10px] font-black text-amber-100 uppercase leading-none">Карта</span>
          <span className="text-[8px] lg:text-[9px] font-extrabold text-white leading-tight truncate max-w-[140px] sm:max-w-[180px]">
            {locEmoji} {locName}
          </span>
        </div>
      </button>

      <div className="flex flex-wrap items-center justify-center md:justify-end gap-1 lg:gap-2 pointer-events-auto scale-[0.88] lg:scale-100 origin-center">
        <div className="bg-amber-50/95 backdrop-blur-xs border-2 border-[#3B82F6] rounded-full px-1.5 lg:px-2.5 py-0.5 flex items-center gap-1 lg:gap-1.5 shadow-md select-none transition-all hover:scale-105" id="day-hud-badge">
          <span className="text-sm lg:text-base">📅</span>
          <div className="flex flex-col text-left">
            <span className="text-[7.5px] font-black uppercase text-blue-800 leading-none">День {day}</span>
            <span className="text-[9.5px] font-black text-blue-600 leading-none mt-0.5">{dayRemainingSec}с</span>
          </div>
        </div>

        <div className="bg-amber-50/95 backdrop-blur-xs border-2 border-[#D97706] rounded-full px-1.5 lg:px-2.5 py-0.5 flex items-center gap-1 lg:gap-1.5 shadow-md select-none" id="level-badge">
          <span className="text-sm lg:text-base animate-bounce-slow">🏆</span>
          <div className="flex flex-col text-left">
            <span className="text-[7.5px] font-black uppercase text-[#92400E] leading-none">Уровень</span>
            <span className="text-[11px] font-black text-[#B45309] leading-none mt-0.5">{level}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-[#92400E] w-20 lg:w-28 bg-amber-50/95 backdrop-blur-xs border-2 border-[#D97706] rounded-full px-1.5 lg:px-2 py-0.5 shadow-md" id="exp-container">
          <span className="font-extrabold uppercase text-[7.5px] leading-none shrink-0">Опыт:</span>
          <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden relative border border-[#D97706]/40">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-[#D97706] transition-all duration-300 rounded-full animate-pulse"
              style={{ width: `${expPercentage}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[6.5px] font-black text-[#92400E] leading-none">
              {experience}
            </span>
          </div>
        </div>

        <div className="bg-amber-50/95 backdrop-blur-xs border-2 border-[#D97706] rounded-full px-1.5 lg:px-2.5 py-0.5 flex items-center gap-1 lg:gap-1.5 shadow-lg select-none transition-transform hover:scale-105" id="hud-coins">
          <CoinIcon size={18} className="lg:hidden" />
          <CoinIcon size={20} className="hidden lg:block" />
          <div className="flex flex-col text-left">
            <span className="text-[7.5px] font-black uppercase text-[#92400E] leading-none">Монеты</span>
            <span className="text-[11px] font-black text-[#B45309] leading-none mt-0.5 select-all">
              {coins.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex gap-1" id="hud-buttons">
          {!isFullscreen && onEnterFullscreen && (
            <FullscreenEnterButton onEnter={onEnterFullscreen} />
          )}

          {onOpenShop && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playClickSound();
                onOpenShop();
              }}
              className="w-8 h-8 lg:w-9 lg:h-9 bg-gradient-to-b from-amber-400 to-amber-600 rounded-lg border-2 border-[#92400E] hover:brightness-110 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-90 transition-all text-base lg:text-lg cursor-pointer"
              title="Рынок: зверята, навыки, рабочие"
              id="header-shop-button"
            >
              <span className="leading-none">🏪</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
              onToggleMute();
            }}
            className="w-6 h-6 lg:w-7 lg:h-7 bg-white rounded-lg border-2 border-[#3B82F6] hover:bg-blue-50 text-[#3B82F6] flex items-center justify-center shadow-md hover:scale-105 active:scale-90 transition-all text-[10px] lg:text-xs cursor-pointer"
            title={isMuted ? "Включить звук" : "Выключить звук"}
            id="mute-button"
          >
            <span className="font-sans leading-none">{isMuted ? "🔇" : "🔊"}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
              onOpenHelp();
            }}
            className="w-6 h-6 lg:w-7 lg:h-7 bg-white rounded-lg border-2 border-[#F43F5E] hover:bg-rose-50 text-[#F43F5E] flex items-center justify-center shadow-md hover:scale-105 active:scale-90 transition-all text-[10px] lg:text-xs cursor-pointer"
            title="Помощь / Инструкция"
            id="help-button"
          >
            <span className="leading-none">💡</span>
          </button>
        </div>
      </div>
    </div>
  );
};
