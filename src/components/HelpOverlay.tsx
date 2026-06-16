/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X, Check } from "lucide-react";
import { playClickSound } from "../lib/audio";

interface HelpOverlayProps {
  onClose: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="help-overlay-dimmer">
      <div className="bg-[#FEF3C7] rounded-[42px] border-8 border-[#92400E] p-6 shadow-2xl max-w-xl w-full relative animate-scale-up" id="help-modal">
        {/* Close Button */}
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border-2 border-[#D97706] transition rounded-full cursor-pointer shadow-md"
          id="close-help-btn"
        >
          <X className="w-5 h-5 font-black" />
        </button>

        {/* Title */}
        <div className="text-center mb-5">
          <span className="text-5xl select-none">👨‍🌾</span>
          <h2 className="text-2xl font-black text-[#92400E] mt-2">Добро пожаловать, Максим!</h2>
          <p className="text-sm font-extrabold text-[#B45309]">Правила твоей волшебной доброй фермы:</p>
        </div>

        {/* List of rules */}
        <div className="space-y-4 text-[#92400E] text-xs md:text-sm font-medium py-1.5 max-h-[350px] overflow-y-auto pr-1">
          {/* Rule 1 */}
          <div className="flex gap-4 bg-[#FFFBEB] p-3.5 rounded-2xl border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-3.5xl shrink-0 select-none">🌾</span>
            <div>
              <strong className="text-amber-955 font-black block text-sm">Покорми меня, я голоден!</strong>
              <p className="text-amber-900/70 text-[11px] md:text-xs mt-0.5 font-bold leading-4">
                Животные не работают, если их вовремя не кормить. Переводи урожай с грядок, чтобы кормить животных! Курица любит пшеницу, кролик любит морковку, коровка обожает клевер, а ослик — сочные яблоки!
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="flex gap-4 bg-[#FFFBEB] p-3.5 rounded-2xl border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-3.5xl shrink-0 select-none">🐑</span>
            <div>
              <strong className="text-amber-955 font-black block text-sm">Веселая стрижка и дойка!</strong>
              <p className="text-amber-900/70 text-[11px] md:text-xs mt-0.5 font-bold leading-4">
                Когда шкала производства заполнится на 100%, ты сможешь собрать продукт. Особый сюрприз: постриги овечку Кудряшку — она временно станет забавной голой розовой овечкой, пока не отрастит шерстку назад! А коровок и козочек — подои!
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="flex gap-4 bg-[#FFFBEB] p-3.5 rounded-2xl border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-3.5xl shrink-0 select-none">🧼</span>
            <div>
              <strong className="text-amber-955 font-black block text-sm">Гладь щёткой и люби животных!</strong>
              <p className="text-amber-900/70 text-[11px] md:text-xs mt-0.5 font-bold leading-4">
                Нажимай на кнопку «Гладить (+Щетка)», чтобы почистить своего любимца и подарить ему счастье. От ласки у животных будут лететь летающие сердечки! А еще жми на саму зверушку, чтобы услышать ее забавный голос!
              </p>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="flex gap-4 bg-[#FFFBEB] p-3.5 rounded-2xl border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-3.5xl shrink-0 select-none">🥕</span>
            <div>
              <strong className="text-amber-955 font-black block text-sm">Выращивай грядки и деревья!</strong>
              <p className="text-amber-900/70 text-[11px] md:text-xs mt-0.5 font-bold leading-4">
                Поливай ростки на огороде, чтобы они не засохли! Сажай яблони и вишни — плоды созревают прямо на веточках дерева! Просто кликай на созревшее яблоко на дереве, чтобы сорвать его!
              </p>
            </div>
          </div>

          {/* Rule 5 */}
          <div className="flex gap-4 bg-[#FFFBEB] p-3.5 rounded-2xl border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-3.5xl shrink-0 select-none">🗺️</span>
            <div>
              <strong className="text-amber-955 font-black block text-sm">Открывай новые локации!</strong>
              <p className="text-amber-900/70 text-[11px] md:text-xs mt-0.5 font-bold leading-4">
                Зарабатывай золото в магазине и открывай красивые пастбища у рынка: Уютный Загон, Озерный Утиный Пруд или Фрутовый Сад для яблонек. У каждого животного свои любимые места!
              </p>
            </div>
          </div>
        </div>

        {/* OK Button */}
        <div className="mt-5 text-center">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full sm:w-auto py-2.5 px-10 bg-[#F59E0B] hover:bg-[#D97706] text-white font-black text-sm rounded-2xl shadow-md border-4 border-[#92400E] active:translate-y-0.5 transition-all text-center flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            id="close-help-confirm"
          >
            <Check className="w-5 h-5 stroke-[3px]" />
            <span>Всё понял, вперед играть!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
