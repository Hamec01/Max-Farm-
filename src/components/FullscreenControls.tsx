import React from "react";
import { playClickSound } from "../lib/audio";

const cornerBtn =
  "interactive-element rounded-xl border-[3px] border-[#6B3410] shadow-md active:scale-95 transition-transform flex items-center justify-center touch-manipulation pointer-events-auto";

interface FullscreenEnterButtonProps {
  onEnter: () => void;
  compact?: boolean;
}

export const FullscreenEnterButton: React.FC<FullscreenEnterButtonProps> = ({
  onEnter,
  compact = false,
}) => {
  const fire = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    playClickSound();
    onEnter();
  };

  if (compact) {
    return (
      <button
        type="button"
        className={`${cornerBtn} w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-b from-sky-400 to-sky-500 text-white`}
        onClick={fire}
        aria-label="Полный экран"
        id="fullscreen-enter-button"
        title="Полный экран"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={fire}
      className="w-8 h-8 lg:w-9 lg:h-9 bg-gradient-to-b from-sky-400 to-sky-500 rounded-lg border-2 border-sky-700 hover:brightness-110 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-90 transition-all cursor-pointer interactive-element"
      title="Полный экран"
      aria-label="Полный экран"
      id="fullscreen-enter-button"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 lg:w-5 lg:h-5" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

interface FullscreenExitButtonProps {
  onExit: () => void;
}

export const FullscreenExitButton: React.FC<FullscreenExitButtonProps> = ({ onExit }) => {
  const fire = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    playClickSound();
    onExit();
  };

  return (
    <button
      type="button"
      className={`${cornerBtn} fixed left-2 z-[99999] flex flex-row items-center w-12 h-12 sm:w-auto sm:min-w-[3.5rem] sm:h-14 bg-gradient-to-b from-rose-500 to-rose-600 text-white gap-1 px-2 sm:px-3`}
      style={{ top: "max(0.5rem, env(safe-area-inset-top))" }}
      onClick={fire}
      aria-label="Выйти из полного экрана"
      id="fullscreen-exit-button"
      title="Выйти из полного экрана"
    >
      <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M9 4H4v5M20 9V4h-5M4 15v5h5M15 20h5v-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[10px] font-black leading-none">Выйти</span>
    </button>
  );
};
