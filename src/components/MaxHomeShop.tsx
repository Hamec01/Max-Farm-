import React from "react";
import { MAX_HOME_FURNITURE } from "../data/maxHomeFurniture";
import { playClickSound } from "../lib/audio";
import { CoinPrice } from "./CoinIcon";

interface MaxHomeShopProps {
  coins: number;
  level: number;
  ownedIds: string[];
  onBuy: (furnitureId: string, cost: number, minLevel: number) => void;
  onClose: () => void;
}

export const MaxHomeShop: React.FC<MaxHomeShopProps> = ({
  coins,
  level,
  ownedIds,
  onBuy,
  onClose,
}) => (
  <div
    className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fade-in"
    id="max-home-shop-modal"
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
        <span className="text-4xl">🏠</span>
        <h2 className="text-xl font-black text-[#5C3A21] mt-1">Магазин мебели</h2>
        <p className="text-[10px] text-amber-800 font-bold mt-1">
          Обставь комнату Макса — покупай по одной вещи!
        </p>
        <p className="text-[10px] font-black text-amber-700 mt-2">
          <CoinPrice amount={coins} showLabel iconSize={12} />
        </p>
      </div>

      <div className="space-y-2">
        {MAX_HOME_FURNITURE.map((item) => {
          const owned = ownedIds.includes(item.id);
          const canBuy = !owned && coins >= item.cost && level >= item.minLevel;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border-2 ${
                owned ? "border-emerald-400 bg-emerald-50/50" : "border-amber-200 bg-white"
              }`}
            >
              <span className="text-3xl shrink-0 w-10 text-center">{item.emoji}</span>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="font-extrabold text-sm text-slate-900">{item.nameRu}</h4>
                <p className="text-[9px] text-slate-600 mt-0.5 line-clamp-2">{item.description}</p>
                <p className="text-[8px] text-emerald-800 font-bold mt-0.5">{item.benefitRu}</p>
                <p className="text-[9px] text-amber-800 font-black mt-1 inline-flex items-center gap-0.5">
                  Ур. {item.minLevel}+ · <CoinPrice amount={item.cost} iconSize={11} />
                </p>
              </div>
              <div className="shrink-0">
                {owned ? (
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-300">
                    ✅ Есть
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onBuy(item.id, item.cost, item.minLevel);
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
