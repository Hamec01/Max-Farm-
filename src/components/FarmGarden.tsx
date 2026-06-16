/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { CropInstance, CropType, TreeInstance, TreeType } from "../types";
import { CROPS_CONFIG, TREES_CONFIG } from "../data";
import { Droplet, Sun, Sprout, ShoppingCart, RefreshCw, Sparkles } from "lucide-react";
import { playWaterSound, playPlantSound, playClickSound } from "../lib/audio";

interface FarmGardenProps {
  crops: Record<string, CropInstance>;
  trees: Record<string, TreeInstance>;
  coins: number;
  inventory: Record<string, number>;
  onBuyAndPlantCrop: (plotId: string, type: CropType) => void;
  onWaterCrop: (plotId: string) => void;
  onHarvestCrop: (plotId: string) => void;
  onBuyTreeOrUpgrade: (plotId: string, type: TreeType) => void;
  onHarvestTree: (plotId: string) => void;
}

export const FarmGarden: React.FC<FarmGardenProps> = ({
  crops,
  trees,
  coins,
  inventory,
  onBuyAndPlantCrop,
  onWaterCrop,
  onHarvestCrop,
  onBuyTreeOrUpgrade,
  onHarvestTree
}) => {

  const renderCropVisual = (crop: CropInstance) => {
    if (crop.progress === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-24">
          <span className="text-3xl filter saturate-50 animate-pulse">🟫</span>
          <span className="text-[10px] font-black text-amber-900 mt-1">Пустая грядка</span>
        </div>
      );
    }

    if (crop.progress < 40) {
      return (
        <div className="flex flex-col items-center justify-center h-24 animate-bounce-slow">
          <span className="text-lg">🌱</span>
          <span className="text-[10px] font-bold text-emerald-800">Крошечный росток</span>
        </div>
      );
    }

    if (crop.progress < 100) {
      return (
        <div className="flex flex-col items-center justify-center h-24">
          <span className="text-2xl">🌿</span>
          <span className="text-[10px] font-bold text-green-700">Подрастает...</span>
        </div>
      );
    }

    // Fully grown!
    const config = CROPS_CONFIG[crop.type];
    return (
      <div className="flex flex-col items-center justify-center h-24 animate-pulse">
        <span className="text-4xl filter drop-shadow">{config.icon}</span>
        <span className="text-[11px] bg-amber-400 font-extrabold text-amber-950 px-2 py-0.5 rounded-full mt-1.5 border-b-2 border-amber-600">
          Спелый {config.nameRu}!
        </span>
      </div>
    );
  };

  const handlePlantClick = (plotId: string, type: CropType) => {
    const config = CROPS_CONFIG[type];
    if (coins >= config.seedCost) {
      playPlantSound();
      onBuyAndPlantCrop(plotId, type);
    } else {
      alert("Максим, не хватает монет на семена! Продай что-нибудь на рынке.");
    }
  };

  return (
    <section className="bg-[#FEF3C7] border-8 border-[#92400E] rounded-[42px] p-6 shadow-2xl space-y-6" id="farm-garden-panel">
      {/* Garden Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-4 pb-4 border-[#92400E]/20" id="garden-header">
        <div className="flex items-center gap-3">
          <span className="text-4xl text-center">🥕</span>
          <div>
            <h2 className="text-2xl font-black text-[#92400E] tracking-tight">Огород Максима</h2>
            <p className="text-xs text-[#B45309] font-bold">Выращивай корм для любимых животных</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#FFFBEB] text-[#92400E] text-xs px-4 py-2 rounded-full font-black border-2 border-[#D97706] shadow-md">
          <Sprout className="w-4 h-4 animate-bounce-slow text-emerald-600" />
          <span>Семена: Пшеница ({inventory.WHEAT_SEED || 0} шт), Морковь ({inventory.CARROT_SEED || 0} шт)</span>
        </div>
      </div>

      {/* 4 Gardening Beds Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="crops-grid">
        {(["plot1", "plot2", "plot3", "plot4"] as const).map((plotId, index) => {
          const crop = crops[plotId];
          const isGrowing = crop && crop.progress > 0;
          const isRipe = crop && crop.progress >= 100;

          return (
            <div
              key={plotId}
              className={`border-4 p-4 rounded-3xl flex flex-col justify-between min-h-[195px] shadow-md relative transition-all ${
                isRipe
                  ? "bg-[#FFFBEB] border-[#D97706] ring-4 ring-orange-200"
                  : isGrowing
                  ? crop.isWatered
                    ? "bg-emerald-50/70 border-emerald-500"
                    : "bg-rose-50/70 border-rose-400 animate-pulse"
                  : "bg-amber-50/40 border-[#92400E]/20 hover:bg-[#FFFBEB]"
              }`}
              id={`crop-plot-${plotId}`}
            >
              <div className="absolute top-1.5 right-3 text-[10px] font-black text-[#92400E]/40 uppercase">
                Грядка {index + 1}
              </div>

              {/* Core visual view */}
              <div className="flex-1 mt-2">
                {crop ? renderCropVisual(crop) : (
                  <div className="flex flex-col items-center justify-center h-24">
                    <span className="text-4xl filter saturate-50 opacity-45">🟫</span>
                    <span className="text-[10px] font-black text-amber-900/40 mt-1 uppercase tracking-wider">Пусто</span>
                  </div>
                )}
              </div>

              {/* Bed Controls */}
              <div className="space-y-1.5 mt-2">
                {crop && isGrowing ? (
                  <div className="space-y-1.5">
                    {/* Grow timer progress bar */}
                    {!isRipe && (
                      <div className="w-full bg-white/60 h-2 rounded-full overflow-hidden border border-[#92400E]/20">
                        <div
                          className="bg-[#D97706] h-full transition-all duration-300"
                          style={{ width: `${crop.progress}%` }}
                        />
                      </div>
                    )}

                    {isRipe ? (
                      <button
                        onClick={() => {
                          playClickSound();
                          onHarvestCrop(plotId);
                        }}
                        className="w-full py-1.5 px-2 bg-[#F59E0B] hover:bg-[#D97706] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1 animate-pulse border-2 border-[#92400E] active:scale-95 transition-transform"
                        id="harvest-crop-btn"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Собрать!</span>
                      </button>
                    ) : (
                      <div className="flex gap-1" id="watering-or-status">
                        {/* Watering logic */}
                        {crop.isWatered ? (
                          <div className="w-full py-1 bg-green-100 border-2 border-green-400 text-green-700 text-[10px] font-black rounded-xl text-center flex items-center justify-center gap-1 shadow-inner">
                            <Sun className="w-3.5 h-3.5 text-yellow-500 animate-spin-slow animate-pulse" />
                            <span>Полито!</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              playWaterSound();
                              onWaterCrop(plotId);
                            }}
                            className="w-full py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-black rounded-xl flex items-center justify-center gap-1 shadow-md hover:scale-103 active:translate-y-0.5 border-2 border-sky-700"
                            id="water-crop-btn"
                          >
                            <Droplet className="w-3.5 h-3.5 animate-bounce" fill="currentColor" />
                            <span>Полить!</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Plant options
                  <div className="grid grid-cols-2 gap-1.5" id="plant-seeds-selector">
                    <button
                      onClick={() => handlePlantClick(plotId, "WHEAT")}
                      className="py-1.5 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#92400E] text-[10px] font-black border-2 border-[#D97706] rounded-xl flex flex-col items-center justify-center shadow-sm"
                      title="Семена Пшеницы (5 монет)"
                    >
                      <span className="text-lg">🌾</span>
                      <span className="leading-3 mt-1">Пшеница</span>
                      <span className="text-[8px] opacity-70">5м</span>
                    </button>
                    <button
                      onClick={() => handlePlantClick(plotId, "CARROT")}
                      className="py-1.5 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#B45309] text-[10px] font-black border-2 border-orange-500 rounded-xl flex flex-col items-center justify-center shadow-sm"
                      title="Семена Моркови (10 монет)"
                    >
                      <span className="text-lg">🥕</span>
                      <span className="leading-3 mt-1">Морковь</span>
                      <span className="text-[8px] opacity-70">10м</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Orchard Sections */}
      <div className="border-t-4 pt-5 border-[#92400E]/20" id="orchard-section">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl text-center">🌳</span>
          <div>
            <h3 className="text-2xl font-black text-[#92400E] tracking-tight">Сказочный Сад</h3>
            <p className="text-xs text-[#B45309] font-bold">Выращивай сочные спелые яблоки и вишни</p>
          </div>
        </div>

        {/* 2 Orchards Trees rendering close-up */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="trees-grid">
          {(["treePlot1", "treePlot2"] as const).map((plotId) => {
            const tree = trees[plotId];
            const isPlanted = tree !== undefined;
            const config = isPlanted ? TREES_CONFIG[tree.type] : null;

            return (
              <div
                key={plotId}
                className={`border-4 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4 shadow-md relative transition-all ${
                  isPlanted ? "bg-[#FFFBEB] border-amber-300" : "bg-[#FEF3C7]/40 border-[#92400E]/20 border-dashed"
                }`}
                id={`tree-plot-${plotId}`}
              >
                {/* Visual Tree representation */}
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center bg-white/70 rounded-2xl border-4 border-dashed border-[#D97706]/20 shadow-inner">
                  {isPlanted && tree && config ? (
                    <div className="relative w-full h-full flex items-center justify-center" id="orchard-tree-view">
                      {/* Tree Crown Drawing */}
                      <span className="text-4xl select-none">{config.icon}</span>

                      {/* Render Hanging Fruits */}
                      {tree.fruitCount > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" id="hanging-fruits">
                          {Array.from({ length: tree.fruitCount }).map((_, idx) => {
                            const fruitIcons = tree.type === "APPLE" ? "🍎" : "🍒";
                            const positions = [
                              { top: "35%", left: "30%" },
                              { top: "25%", left: "50%" },
                              { top: "45%", left: "60%" },
                              { top: "30%", left: "70%" },
                            ];
                            const pos = positions[idx % positions.length];
                            return (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playClickSound();
                                  onHarvestTree(plotId);
                                }}
                                className="absolute text-base hover:scale-130 active:scale-95 transition-transform animate-bounce-slow pointer-events-auto cursor-pointer drop-shadow-md"
                                style={{ top: pos.top, left: pos.left }}
                                title="Нажми, чтобы сорвать плод!"
                              >
                                {fruitIcons}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-4xl opacity-35 filter grayscale select-none">🪵</span>
                  )}
                </div>

                {/* Tree Description column */}
                <div className="flex-1 space-y-2 w-full text-center md:text-left">
                  {isPlanted && tree && config ? (
                    <div>
                      <h4 className="font-black text-lg text-[#92400E] flex items-center justify-center md:justify-start gap-1">
                        <span>{config.icon}</span>
                        <span>{config.nameRu}</span>
                      </h4>
                      <p className="text-xs text-amber-955 font-bold mt-1 leading-4">
                        Дает {config.fruitNameRu} по цене <strong className="text-[#D97706]">{config.fruitSellPrice} монет</strong> на рынке.
                      </p>

                      {/* Growth Tracker */}
                      {tree.fruitCount < config.yieldCount ? (
                        <div className="mt-2.5 space-y-1">
                          <div className="flex justify-between text-[10px] text-amber-900/60 font-black">
                            <span>Созревание плодов...</span>
                            <span>{Math.floor(tree.fruitProgress)}%</span>
                          </div>
                          <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-[#92400E]/20">
                            <div
                              className="bg-[#D97706] h-full transition-all duration-300"
                              style={{ width: `${tree.fruitProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 text-xs text-green-800 font-extrabold bg-green-50 p-2 rounded-xl border border-green-300 flex items-center justify-center md:justify-start gap-1.5 animate-pulse">
                          <span>🍎</span>
                          <span>Все плоды созрели! сорви их кликом!</span>
                        </div>
                      )}

                      {/* Harvest button */}
                      {tree.fruitCount > 0 && (
                        <button
                          onClick={() => {
                            playClickSound();
                            onHarvestTree(plotId);
                          }}
                          className="mt-3 w-full md:w-auto py-1 px-3 bg-[#EAB308] hover:bg-[#D97706] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1 border-2 border-yellow-700 hover:scale-103 active:translate-y-0.5"
                          id="shake-tree-btn"
                        >
                          💸 Собрать всё {tree.type === "APPLE" ? "🍎" : "🍒"} ({tree.fruitCount} шт)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-[#92400E]/50 text-sm uppercase tracking-wider">Садовый Сектор</h4>
                      <p className="text-[11px] text-amber-900/60 font-bold leading-4">
                        Посади раскидистое плодовое дерево, чтобы собирать ароматные плоды.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1" id="buy-seeds-tree-selector">
                        <button
                          onClick={() => {
                            if (coins >= TREES_CONFIG.APPLE.cost) {
                              playPlantSound();
                              onBuyTreeOrUpgrade(plotId, "APPLE");
                            } else {
                              alert("Максим, не хватает монет на яблоню!");
                            }
                          }}
                          className="flex-1 py-1.5 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-emerald-800 font-black text-xs rounded-xl border-4 border-[#92400E] hover:scale-103 transition-transform shadow active:translate-y-0.5 cursor-pointer"
                          id="plant-apple-btn"
                        >
                          🌳 Яблоня (180м)
                        </button>
                        <button
                          onClick={() => {
                            if (coins >= TREES_CONFIG.CHERRY.cost) {
                              playPlantSound();
                              onBuyTreeOrUpgrade(plotId, "CHERRY");
                            } else {
                              alert("Максим, не хватает монет на вишню!");
                            }
                          }}
                          className="flex-1 py-1.5 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-rose-700 font-black text-xs rounded-xl border-4 border-[#92400E] hover:scale-103 transition-transform shadow active:translate-y-0.5 cursor-pointer"
                          id="plant-cherry-btn"
                        >
                          🍒 Вишня (350м)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
