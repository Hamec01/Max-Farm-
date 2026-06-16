/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { LocationId, LocationConfig } from "../types";
import { LOCATIONS } from "../data";
import { Coins, HelpCircle, Volume2, VolumeX, Award, ShieldAlert, MapPin } from "lucide-react";
import { playClickSound } from "../lib/audio";

interface GameHeaderProps {
  coins: number;
  level: number;
  experience: number;
  activeLocationId: LocationId;
  unlockedLocationIds: LocationId[];
  onSelectLocation: (locId: LocationId) => void;
  onOpenHelp: () => void;
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
  unlockedLocationIds,
  onSelectLocation,
  onOpenHelp,
  isMuted,
  onToggleMute,
  day = 1,
  dayProgress = 0,
  dayLength = 240
}) => {
  const nextLevelExp = level * 100;
  const expPercentage = Math.min((experience / nextLevelExp) * 100, 100);

  const handleLocationClick = (locId: LocationId) => {
    playClickSound();
    onSelectLocation(locId);
  };

  const dayRemainingSec = Math.max(0, dayLength - dayProgress);

  return (
    <div className="absolute top-1.5 lg:top-2 left-2 lg:left-4 right-2 lg:right-4 z-30 flex flex-col md:flex-row items-center justify-between gap-1.5 lg:gap-3 w-auto pointer-events-none select-none" id="game-header">
      {/* Title and Subtitle with high-contrast text shadows */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] pointer-events-auto shrink-0">
        <h1 className="text-base sm:text-xl lg:text-3xl font-black text-white tracking-tight uppercase italic leading-none animate-pulse" id="game-title">
          Ферма Макса
        </h1>
        <p className="hidden sm:block text-[8px] lg:text-[9px] text-[#FEF3C7] font-black mt-0.5 lg:mt-1 tracking-wide uppercase leading-none">Добрая ферма для любимого сына</p>
      </div>

      {/* COMPACT LOCATION TABS — горизонтальная прокрутка на телефоне */}
      <div className="flex items-center justify-start gap-0.5 lg:gap-1 bg-[#451A03]/50 backdrop-blur-xs p-0.5 lg:p-1 px-1 lg:px-1.5 rounded-full border border-amber-900/20 pointer-events-auto shrink min-w-0 max-w-full lg:max-w-[45%] overflow-x-auto scrollbar-none" id="header-map-tabs">
        {Object.keys(LOCATIONS).map((locId) => {
          const loc = LOCATIONS[locId as LocationId];
          const isUnlocked = unlockedLocationIds.includes(locId as LocationId);
          const isActive = activeLocationId === locId;
          
          let emoji = "🏡";
          if (locId === "MEADOW") emoji = "🌸";
          else if (locId === "BARNYARD") emoji = "🏡";
          else if (locId === "LAKESIDE") emoji = "🦆";
          else if (locId === "ORCHARD") emoji = "🌳";
          else if (locId === "DESERT") emoji = "🏜️";
          else if (locId === "FOREST") emoji = "🌲";
          else if (locId === "LAKE") emoji = "🌊";

          return (
            <button
              key={locId}
              onClick={() => onSelectLocation(locId as LocationId)}
              className={`flex items-center gap-0.5 lg:gap-1 p-0.5 lg:p-1 px-1.5 lg:px-2.5 rounded-full text-[8px] lg:text-[9.5px] font-black whitespace-nowrap transition-all duration-150 cursor-pointer border shrink-0 ${
                isActive
                  ? "bg-amber-600 border-yellow-300 text-white shadow"
                  : isUnlocked
                  ? "bg-white/95 border-transparent text-[#5C3A21] hover:bg-amber-50"
                  : "bg-stone-500/80 border-transparent text-stone-300 opacity-60 cursor-help"
              }`}
              title={loc.description}
            >
              <span className="text-[11px] shrink-0">{emoji}</span>
              <span className="leading-none">{loc.nameRu}</span>
              {!isUnlocked && (
                <span className="text-[8px] leading-none ml-0.5">🔒</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Level Progress Bar, Money, and Control Badges in a single tight row */}
      <div className="flex flex-wrap items-center justify-center md:justify-end gap-1 lg:gap-2 pointer-events-auto scale-[0.88] lg:scale-100 origin-center">
        {/* Day / Sunset Widget */}
        <div className="bg-amber-50/95 backdrop-blur-xs border-2 border-[#3B82F6] rounded-full px-1.5 lg:px-2.5 py-0.5 flex items-center gap-1 lg:gap-1.5 shadow-md select-none transition-all hover:scale-105" id="day-hud-badge">
          <span className="text-sm lg:text-base">📅</span>
          <div className="flex flex-col text-left">
            <span className="text-[7.5px] font-black uppercase text-blue-800 leading-none">День {day}</span>
            <span className="text-[9.5px] font-black text-blue-600 leading-none mt-0.5">{dayRemainingSec}с</span>
          </div>
        </div>

        {/* Level Badge matching layout */}
        <div className="bg-amber-50/95 backdrop-blur-xs border-2 border-[#D97706] rounded-full px-1.5 lg:px-2.5 py-0.5 flex items-center gap-1 lg:gap-1.5 shadow-md select-none" id="level-badge">
          <span className="text-sm lg:text-base animate-bounce-slow">🏆</span>
          <div className="flex flex-col text-left">
            <span className="text-[7.5px] font-black uppercase text-[#92400E] leading-none">Уровень</span>
            <span className="text-[11px] font-black text-[#B45309] leading-none mt-0.5">{level}</span>
          </div>
        </div>

        {/* Experience Progress integrated with custom branding */}
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

        {/* Coins Badge matching layout */}
        <div className="bg-amber-50/95 backdrop-blur-xs border-2 border-[#D97706] rounded-full px-1.5 lg:px-2.5 py-0.5 flex items-center gap-1 lg:gap-1.5 shadow-lg select-none transition-transform hover:scale-105" id="hud-coins">
          <span className="text-sm lg:text-base">💰</span>
          <div className="flex flex-col text-left">
            <span className="text-[7.5px] font-black uppercase text-[#92400E] leading-none">Монеты</span>
            <span className="text-[11px] font-black text-[#B45309] leading-none mt-0.5 select-all">
              {coins.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Sound, Help with thick blue/red buttons */}
        <div className="flex gap-1" id="hud-buttons">
          <button
            onClick={() => {
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
            onClick={() => {
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
