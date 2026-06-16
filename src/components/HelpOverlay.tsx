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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 lg:p-4 animate-fade-in" id="help-overlay-dimmer">
      <div
        className="bg-[#FEF3C7] rounded-2xl lg:rounded-[42px] border-4 lg:border-8 border-[#92400E] p-3 lg:p-6 shadow-2xl max-w-[min(92vw,340px)] lg:max-w-xl w-full relative animate-scale-up max-h-[82vh] lg:max-h-none overflow-y-auto"
        id="help-modal"
      >
        {/* Close Button */}
        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute top-2 right-2 lg:top-4 lg:right-4 p-1.5 lg:p-2 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] border-2 border-[#D97706] transition rounded-full cursor-pointer shadow-md"
          id="close-help-btn"
        >
          <X className="w-4 h-4 lg:w-5 lg:h-5 font-black" />
        </button>

        {/* Title */}
        <div className="text-center mb-3 lg:mb-5">
          <span className="text-3xl lg:text-5xl select-none">👨‍🌾</span>
          <h2 className="text-lg lg:text-2xl font-black text-[#92400E] mt-1 lg:mt-2">Добро пожаловать, Максим!</h2>
          <p className="text-[10px] lg:text-sm font-extrabold text-[#B45309]">Правила твоей волшебной доброй фермы:</p>
        </div>

        {/* List of rules */}
        <div className="space-y-2 lg:space-y-4 text-[#92400E] text-[10px] lg:text-sm font-medium py-1 max-h-[48vh] lg:max-h-[350px] overflow-y-auto pr-1">
          {/* Rule 1 */}
          <div className="flex gap-2 lg:gap-4 bg-[#FFFBEB] p-2 lg:p-3.5 rounded-xl lg:rounded-2xl border-2 lg:border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-2xl lg:text-3.5xl shrink-0 select-none">🌾</span>
            <div>
              <strong className="text-amber-955 font-black block text-xs lg:text-sm">Покорми меня, я голоден!</strong>
              <p className="text-amber-900/70 text-[10px] lg:text-xs mt-0.5 font-bold leading-3.5 lg:leading-4">
                Животные не работают, если их вовремя не кормить. Переводи урожай с грядок, чтобы кормить животных! Курица любит пшеницу, кролик любит морковку, коровка обожает клевер, а ослик — сочные яблоки!
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="flex gap-2 lg:gap-4 bg-[#FFFBEB] p-2 lg:p-3.5 rounded-xl lg:rounded-2xl border-2 lg:border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-2xl lg:text-3.5xl shrink-0 select-none">🐑</span>
            <div>
              <strong className="text-amber-955 font-black block text-xs lg:text-sm">Веселая стрижка и дойка!</strong>
              <p className="text-amber-900/70 text-[10px] lg:text-xs mt-0.5 font-bold leading-3.5 lg:leading-4">
                Когда шкала производства заполнится на 100%, ты сможешь собрать продукт. Особый сюрприз: постриги овечку Кудряшку — она временно станет забавной голой розовой овечкой, пока не отрастит шерстку назад! А коровок и козочек — подои!
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="flex gap-2 lg:gap-4 bg-[#FFFBEB] p-2 lg:p-3.5 rounded-xl lg:rounded-2xl border-2 lg:border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-2xl lg:text-3.5xl shrink-0 select-none">🧼</span>
            <div>
              <strong className="text-amber-955 font-black block text-xs lg:text-sm">Гладь щёткой и люби животных!</strong>
              <p className="text-amber-900/70 text-[10px] lg:text-xs mt-0.5 font-bold leading-3.5 lg:leading-4">
                Нажимай на кнопку «Гладить (+Щетка)», чтобы почистить своего любимца и подарить ему счастье. От ласки у животных будут лететь летающие сердечки! А еще жми на саму зверушку, чтобы услышать ее забавный голос!
              </p>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="flex gap-2 lg:gap-4 bg-[#FFFBEB] p-2 lg:p-3.5 rounded-xl lg:rounded-2xl border-2 lg:border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-2xl lg:text-3.5xl shrink-0 select-none">🥕</span>
            <div>
              <strong className="text-amber-955 font-black block text-xs lg:text-sm">Выращивай грядки и деревья!</strong>
              <p className="text-amber-900/70 text-[10px] lg:text-xs mt-0.5 font-bold leading-3.5 lg:leading-4">
                Поливай ростки на огороде, чтобы они не засохли! Сажай яблони и вишни — плоды созревают прямо на веточках дерева! Просто кликай на созревшее яблоко на дереве, чтобы сорвать его!
              </p>
            </div>
          </div>

          {/* Rule 5 */}
          <div className="flex gap-2 lg:gap-4 bg-[#FFFBEB] p-2 lg:p-3.5 rounded-xl lg:rounded-2xl border-2 lg:border-4 border-[#92400E]/20 shadow-sm">
            <span className="text-2xl lg:text-3.5xl shrink-0 select-none">🗺️</span>
            <div>
              <strong className="text-amber-955 font-black block text-xs lg:text-sm">Открывай новые локации!</strong>
              <p className="text-amber-900/70 text-[10px] lg:text-xs mt-0.5 font-bold leading-3.5 lg:leading-4">
                Зарабатывай золото в магазине и открывай красивые пастбища у рынка: Уютный Загон, Озерный Утиный Пруд или Фрутовый Сад для яблонек. У каждого животного свои любимые места!
              </p>
            </div>
          </div>
        </div>

        {/* OK Button */}
        <div className="mt-3 lg:mt-5 text-center">
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full sm:w-auto py-2 lg:py-2.5 px-6 lg:px-10 bg-[#F59E0B] hover:bg-[#D97706] text-white font-black text-xs lg:text-sm rounded-xl lg:rounded-2xl shadow-md border-2 lg:border-4 border-[#92400E] active:translate-y-0.5 transition-all text-center flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            id="close-help-confirm"
          >
            <Check className="w-4 h-4 lg:w-5 lg:h-5 stroke-[3px]" />
            <span>Всё понял, вперед играть!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
