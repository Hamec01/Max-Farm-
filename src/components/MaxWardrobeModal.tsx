import React from "react";
import {
  DEFAULT_MAX_OUTFIT_ID,
  MAX_OUTFITS,
  getMaxOutfitSpriteSrc,
  isMaxOutfitOwned,
} from "../data/maxOutfits";
import { playClickSound } from "../lib/audio";
import { CoinPrice } from "./CoinIcon";

interface MaxWardrobeModalProps {
  coins: number;
  level: number;
  purchasedOutfitIds: string[];
  activeOutfitId: string;
  onBuy: (outfitId: string) => void;
  onEquip: (outfitId: string) => void;
  onClose: () => void;
}

export const MaxWardrobeModal: React.FC<MaxWardrobeModalProps> = ({
  coins,
  level,
  purchasedOutfitIds,
  activeOutfitId,
  onBuy,
  onEquip,
  onClose,
}) => (
  <div
    className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fade-in"
    id="max-wardrobe-modal"
    onClick={onClose}
  >
    <div
      className="bg-[#FFF8F0] border-4 border-[#92400E] rounded-3xl p-4 shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto relative animate-scale-up"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          playClickSound();
          onClose();
        }}
        className="absolute top-2 right-2 w-9 h-9 bg-white hover:bg-rose-50 text-rose-600 border-2 border-[#92400E] rounded-full font-black text-sm cursor-pointer shadow"
      >
        ✕
      </button>

      <div className="text-center mb-4 border-b-2 border-dashed border-amber-800/20 pb-3">
        <span className="text-4xl">🚪</span>
        <h2 className="text-xl font-black text-[#5C3A21] mt-1">Шкаф Макса</h2>
        <p className="text-[10px] text-amber-800 font-bold mt-1">
          Покупай костюмы и выбирай, во что идти на ферму!
        </p>
        <p className="text-[10px] font-black text-amber-700 mt-2">
          <CoinPrice amount={coins} showLabel iconSize={12} />
        </p>
      </div>

      <div className="space-y-3">
        {MAX_OUTFITS.map((outfit) => {
          const owned = isMaxOutfitOwned(outfit.id, purchasedOutfitIds);
          const equipped = activeOutfitId === outfit.id;
          const canBuy =
            !owned &&
            outfit.cost > 0 &&
            coins >= outfit.cost &&
            level >= outfit.minLevel;

          return (
            <div
              key={outfit.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border-2 ${
                equipped
                  ? "border-sky-400 bg-sky-50/70"
                  : owned
                  ? "border-emerald-400 bg-emerald-50/50"
                  : "border-amber-200 bg-white"
              }`}
            >
              <div className="shrink-0 w-14 h-16 bg-amber-100/80 rounded-lg border-2 border-amber-300 flex items-end justify-center overflow-hidden">
                <img
                  src={getMaxOutfitSpriteSrc(outfit.id)}
                  alt={outfit.nameRu}
                  className="w-12 h-14 object-contain object-bottom"
                  draggable={false}
                />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1">
                  <span>{outfit.emoji}</span>
                  {outfit.nameRu}
                </h4>
                <p className="text-[9px] text-slate-600 mt-0.5 line-clamp-2">{outfit.description}</p>
                {outfit.cost > 0 && !owned && (
                  <p className="text-[9px] text-amber-800 font-black mt-1 inline-flex items-center gap-0.5">
                    Ур. {outfit.minLevel}+ · <CoinPrice amount={outfit.cost} iconSize={11} />
                  </p>
                )}
                {owned && outfit.id !== DEFAULT_MAX_OUTFIT_ID && (
                  <p className="text-[8px] text-emerald-700 font-bold mt-0.5">✅ Куплено — в шкафу</p>
                )}
              </div>
              <div className="shrink-0 flex flex-col gap-1">
                {equipped ? (
                  <span className="text-[9px] font-black text-sky-700 bg-sky-100 px-2 py-1 rounded-lg border border-sky-300 text-center">
                    👕 Надет
                  </span>
                ) : owned ? (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onEquip(outfit.id);
                    }}
                    className="py-1.5 px-3 rounded-xl text-[10px] font-black cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Надеть
                  </button>
                ) : outfit.cost === 0 ? null : (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onBuy(outfit.id);
                    }}
                    disabled={!canBuy}
                    className={`py-1.5 px-3 rounded-xl text-[10px] font-black cursor-pointer ${
                      canBuy
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Купить
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
