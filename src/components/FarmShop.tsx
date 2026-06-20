/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AnimalSpecies, LocationId, FarmUpgrade } from "../types";
import { ANIMAL_TEMPLATES, LOCATIONS, UPGRADES } from "../data";
import { ShoppingBag, Star, Lock, PlusCircle, Coins, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { playCoinSound, playClickSound, playAnimalSound } from "../lib/audio";
import { GameIcon } from "./CoinIcon";

interface FarmShopProps {
  coins: number;
  level: number;
  inventory: Record<string, number>;
  unlockedLocations: LocationId[];
  upgrades: Record<string, number>; // current level of upgrades { upgradeId: level }
  onSellProduct: (itemKey: string, count: number) => void;
  onSellAll: () => void;
  onBuyAnimal: (species: AnimalSpecies) => void;
  onUpgradeFarm: (upgradeId: string) => void;
  onUnlockLocation: (locId: LocationId) => void;
}

type ShopTab = "SELL_MARKET" | "BUY_ANIMALS" | "KEEPER_UPGRADES" | "EXPANSIONS";

export const FarmShop: React.FC<FarmShopProps> = ({
  coins,
  level,
  inventory,
  unlockedLocations,
  upgrades,
  onSellProduct,
  onSellAll,
  onBuyAnimal,
  onUpgradeFarm,
  onUnlockLocation,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>("SELL_MARKET");

  const marketMultiplier = 1 + ((upgrades.marketContract || 1) - 1) * 0.10;

  // Calculate list of sellable products currently in the player's directory
  const getProductPrice = (key: string): number => {
    // Check if it's agricultural crop
    if (key === "WHEAT") return 8;
    if (key === "CARROT") return 18;
    if (key === "CLOVER") return 32;
    if (key === "CABBAGE") return 50;

    // Check if it's fruit orchard
    if (key === "APPLE") return 50;
    if (key === "CHERRY") return 80;

    // Check animal products
    const foundAnimal = Object.values(ANIMAL_TEMPLATES).find((t) => t.productName === key || t.productIcon === key);
    if (foundAnimal) return foundAnimal.productPrice;

    // Search by matching names
    if (key === "Яйцо") return 15;
    if (key === "Утиное яйцо") return 30;
    if (key === "Гусиное перо") return 55;
    if (key === "Индюшачье перо") return 90;
    if (key === "Кроличий пух") return 130;
    if (key === "Овечья шерсть") return 200;
    if (key === "Трюфель") return 320;
    if (key === "Козье молоко") return 420;
    if (key === "Парное молоко") return 600;
    if (key === "Подкова удачи") return 850;
    if (key === "Золотая подкова") return 1400;
    if (key === "Золотой бубенчик") return 2200;
    if (key === "Игрушечная мышка") return 1800;
    if (key === "Косточка дружбы") return 250;
    
    return 10; // general salvage placeholder
  };

  const getProductRuName = (key: string): string => {
    switch (key) {
      case "WHEAT": return "Пшеница";
      case "CARROT": return "Морковь";
      case "CLOVER": return "Клевер";
      case "CABBAGE": return "Капуста";
      case "APPLE": return "Спелое яблоко";
      case "CHERRY": return "Вишня";
      case "WHEAT_SEED": return "Семена пшеницы";
      case "CARROT_SEED": return "Семена моркови";
      default: return key;
    }
  };

  const currentSellableItems = Object.keys(inventory).filter((key) => {
    // Exclude seeds from primary sales
    if (key.endsWith("_SEED")) return false;
    return inventory[key] > 0;
  });

  const handleSellProduct = (key: string, count: number) => {
    playCoinSound();
    onSellProduct(key, count);
  };

  const handleSellAll = () => {
    if (currentSellableItems.length === 0) return;
    playCoinSound();
    onSellAll();
  };

  const handleBuyAnimal = (species: AnimalSpecies) => {
    const template = ANIMAL_TEMPLATES[species];
    if (coins >= template.cost) {
      playAnimalSound(template.soundType);
      onBuyAnimal(species);
    } else {
      alert(`Максим, не хватает монет! Эта зверушка стоит ${template.cost} монет.`);
    }
  };

  const handleUpgradeClick = (id: string, upgrade: FarmUpgrade) => {
    const currentLevel = upgrades[id] || 1;
    const upgradeCost = upgrade.cost * currentLevel;
    if (coins >= upgradeCost) {
      playCoinSound();
      onUpgradeFarm(id);
    } else {
      alert(`Не хватает монет на улучшение! Нужно ${upgradeCost} монет.`);
    }
  };

  const handleUnlockLocationClick = (locId: LocationId, cost: number, minLevel: number) => {
    if (level < minLevel) {
      alert(`Максим, нужен уровень ${minLevel} для открытия этой локации. Выращивай животных и огород, чтобы получить опыт!`);
      return;
    }
    if (coins < cost) {
      alert(`Не хватает ${cost - coins} монет для покупки этой локации.`);
      return;
    }
    playCoinSound();
    onUnlockLocation(locId);
  };

  return (
    <section className="bg-[#FEF3C7] border-8 border-[#92400E] rounded-[42px] p-6 shadow-2xl flex flex-col justify-between min-h-[470px]" id="farm-shop-panel">
      {/* Shop Category Tabs */}
      <div id="shop-container-and-hud">
        <div className="flex items-center justify-between border-b-4 pb-4 border-[#92400E]/20 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-4xl text-center">🛒</span>
            <div>
              <h2 className="text-2xl font-black text-[#92400E] tracking-tight">Городской Рынок</h2>
              <p className="text-xs text-[#B45309] font-bold">Веселая беспошлинная торговля для Максима</p>
            </div>
          </div>
          {marketMultiplier > 1 && (
            <span className="text-xs bg-[#FFFBEB] text-[#92400E] font-black px-3 py-1 rounded-full border-2 border-[#D97706] shadow-md animate-pulse">
              📈 Сделки: +{Math.round((marketMultiplier - 1) * 100)}% к ценам!
            </span>
          )}
        </div>

        {/* Tab Header Buttons matching custom badges */}
        <div className="flex mt-3.5 p-1 bg-[#D97706]/15 rounded-2xl gap-1 shrink-0 overflow-x-auto scrollbar-none border border-[#92400E]/15 shadow-inner" id="shop-tabs">
          {(["SELL_MARKET", "BUY_ANIMALS", "KEEPER_UPGRADES", "EXPANSIONS"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                playClickSound();
                setActiveTab(tab);
              }}
              className={`flex-1 py-1.5 px-3 text-center rounded-xl text-xs font-black whitespace-nowrap transition-all shrink-0 border-2 ${
                activeTab === tab
                  ? "bg-[#D97706] text-white border-[#92400E] shadow-md"
                  : "bg-white/40 text-[#92400E]/80 hover:bg-[#FFFBEB]/80 border-transparent text-[#92400E]/70"
              }`}
              id={`shop-tab-${tab}`}
            >
              {tab === "SELL_MARKET" && "💸 Сбыт урожая"}
              {tab === "BUY_ANIMALS" && "🐣 Животные"}
              {tab === "KEEPER_UPGRADES" && "💡 Улучшения"}
              {tab === "EXPANSIONS" && "🗺️ Локации"}
            </button>
          ))}
        </div>

        {/* 1. SELLING PORTAL */}
        {activeTab === "SELL_MARKET" && (
          <div className="mt-4 space-y-3" id="sell-market-view">
            {currentSellableItems.length === 0 ? (
              <div className="text-center py-12 text-amber-950/60">
                <span className="text-6xl block mb-2 opacity-50">🌾</span>
                <p className="text-sm font-black uppercase tracking-wider">Корзина пуста!</p>
                <p className="text-xs mt-1 text-amber-900/60 font-bold">Собери плоды или шерсть, чтобы продать их здесь.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                <div className="flex justify-between items-center bg-[#FFFBEB] p-3 rounded-2xl border-2 border-[#D97706]">
                  <span className="text-xs text-[#92400E] font-black">У тебя в корзине: {currentSellableItems.length} товаров</span>
                  <button
                    onClick={handleSellAll}
                    className="py-1.5 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-white text-xs font-black rounded-xl hover:scale-103 shadow-md active:scale-95 transition-all border-2 border-[#92400E] cursor-pointer"
                    id="sell-all-btn"
                  >
                    🎉 Продать Прямо Всё!
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" id="sell-grid">
                  {currentSellableItems.map((key) => {
                    const count = inventory[key];
                    const basePrice = getProductPrice(key);
                    const finalPrice = Math.round(basePrice * marketMultiplier);

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-[#FFFBEB] p-3 rounded-2xl border-4 border-[#92400E]/20 hover:border-[#D97706]/55 transition-all shadow"
                        id={`sell-item-${key}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl bg-[#FEF3C7] p-2 rounded-xl border-2 border-[#D97706]/40 shadow-inner">
                            {key === "WHEAT" ? "🌾" : key === "CARROT" ? "🥕" : key === "CLOVER" ? "☘️" : key === "CABBAGE" ? "🥬" : key === "APPLE" ? "🍎" : key === "CHERRY" ? "🍒" : "🥛"}
                          </span>
                          <div>
                            <h4 className="font-black text-sm text-[#92400E] leading-4">
                              {getProductRuName(key)}
                            </h4>
                            <p className="text-[10px] text-amber-900/60 font-bold mt-0.5">
                              В наличии: <strong className="text-emerald-700">{count} шт</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <button
                            onClick={() => handleSellProduct(key, count)}
                            className="py-1.5 px-3 bg-[#EAB308] text-white hover:bg-[#D97706] transition-all rounded-xl text-[10px] font-black flex items-center gap-1 shadow border-2 border-yellow-700 active:translate-y-0.5 cursor-pointer"
                            id={`sell-itm-btn-${key}`}
                          >
                            <span>Продать всё за</span>
                            <strong className="text-xs">{finalPrice * count}м</strong>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. BUYING ANIMALS */}
        {activeTab === "BUY_ANIMALS" && (
          <div className="mt-4 grid grid-cols-2 xs:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1" id="buy-animals-view">
            {(Object.keys(ANIMAL_TEMPLATES) as AnimalSpecies[]).map((species) => {
              const config = ANIMAL_TEMPLATES[species];
              const isAffordable = coins >= config.cost;

              return (
                <div
                  key={species}
                  className={`bg-[#FFFBEB] p-3 rounded-3xl border-4 transition-all flex flex-col justify-between shadow ${
                    isAffordable ? "border-[#92400E]/20 hover:border-[#D97706]/70" : "border-[#92400E]/5 opacity-70"
                  }`}
                  id={`shop-buy-card-${species}`}
                >
                  <div className="text-center">
                    <span className="text-4xl filter drop-shadow inline-block animate-bounce-slow mt-1 select-none">
                      {config.emoji}
                    </span>
                    <h4 className="font-extrabold text-xs text-amber-950 mt-1 line-clamp-1 uppercase tracking-tight">
                      {config.nameRu.split(" ")[0]}
                    </h4>
                    <p className="text-[10px] text-amber-900/70 mt-1 min-h-[30px] line-clamp-2 leading-3 font-semibold">
                      {config.description}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-1.5 border-t border-[#92400E]/15">
                    <button
                      onClick={() => handleBuyAnimal(species)}
                      disabled={!isAffordable}
                      className={`w-full py-1.5 px-2 rounded-xl text-[10.5px] font-black flex items-center justify-center gap-1 shadow transition cursor-pointer ${
                        isAffordable
                          ? "bg-[#F59E0B] text-white border-b-2 border-[#92400E] hover:bg-[#D97706] active:translate-y-0.5"
                          : "bg-amber-100/20 text-amber-900/30 border-dashed border-2 border-amber-200 cursor-not-allowed"
                      }`}
                      id={`buy-animal-btn-${species}`}
                      title={`Купить за ${config.cost} монет`}
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-300 fill-current" />
                      <span>{config.cost} монет</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. KEEPER UPGRADES */}
        {activeTab === "KEEPER_UPGRADES" && (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1" id="keeper-upgrades-view">
            {Object.keys(UPGRADES).map((id) => {
              const upgrade = UPGRADES[id];
              const currentLvl = upgrades[id] || 1;
              const maxedOut = currentLvl >= upgrade.maxLevel;
              const cost = upgrade.cost * currentLvl;
              const isAffordable = coins >= cost;

              return (
                <div
                  key={id}
                  className="bg-[#FFFBEB] p-3 rounded-2xl border-4 border-[#92400E]/20 hover:border-[#D97706]/40 transition-all flex items-center justify-between shadow"
                  id={`upgrade-row-${id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-[#FEF3C7] p-2 rounded-xl border-2 border-[#D97706]/30 inline-flex items-center justify-center">
                      <GameIcon icon={upgrade.icon} size={28} />
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-[#92400E] flex items-center gap-2">
                        <span>{upgrade.nameRu}</span>
                        <span className="bg-[#FEF3C7] text-[#92400E] text-[9px] px-1.5 py-0.5 rounded-full font-mono border border-[#D97706]/40 font-black">
                          Ур. {currentLvl} / {upgrade.maxLevel}
                        </span>
                      </h4>
                      <p className="text-[10px] text-amber-900/70 mt-1 max-w-[240px] leading-3 font-semibold">
                        {upgrade.description}
                      </p>
                    </div>
                  </div>

                  <div>
                     {maxedOut ? (
                      <span className="text-[10px] bg-green-50 text-green-700 font-extrabold px-3 py-1.5 rounded-full border border-green-300 flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Максимум</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleUpgradeClick(id, upgrade)}
                        disabled={!isAffordable}
                        className={`py-1.5 px-3 rounded-xl text-[10px] font-black flex items-center gap-1 shadow border-2 cursor-pointer ${
                          isAffordable
                            ? "bg-[#EAB308] text-white border-yellow-700 hover:bg-[#D97706] active:translate-y-0.5"
                            : "bg-amber-100/20 text-amber-900/30 border-dashed border-amber-200 cursor-not-allowed"
                        }`}
                        id={`buy-upgrade-btn-${id}`}
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-300" />
                        <span>{cost}м</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. EXPANSIONS / NEW LOCATIONS */}
        {activeTab === "EXPANSIONS" && (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1" id="expansions-view">
            {Object.keys(LOCATIONS).map((locId) => {
              const config = LOCATIONS[locId as LocationId];
              const isUnlocked = unlockedLocations.includes(locId as LocationId);

              return (
                <div
                  key={locId}
                  className={`bg-[#FFFBEB] p-3 rounded-2xl border-4 transition flex items-center justify-between shadow ${
                    isUnlocked ? "border-green-400 bg-green-50/40" : "border-[#92400E]/20"
                  }`}
                  id={`expansion-row-${locId}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-[#FEF3C7] p-2 rounded-xl border border-[#D97706]/30">
                      {locId === "MEADOW" && "🌸"}
                      {locId === "BARNYARD" && "🏠"}
                      {locId === "LAKESIDE" && "🌊"}
                      {locId === "ORCHARD" && "🍎"}
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-[#92400E] flex items-center gap-1.5">
                        <span>{config.nameRu}</span>
                        {isUnlocked && (
                          <span className="text-[9px] bg-green-100 text-green-700 px-1.5 rounded-full font-black border border-green-300">
                            Открыта!
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-amber-900/70 mt-1 max-w-[240px] leading-3 font-semibold">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isUnlocked ? (
                      <span className="text-[10px] text-green-700 bg-green-50 p-1.5 px-3 border border-green-300 font-extrabold rounded-full">
                        Готово!
                      </span>
                    ) : (
                      <div className="text-right space-y-1">
                        <button
                          onClick={() => handleUnlockLocationClick(locId as LocationId, config.unlockCost, config.minLevel)}
                          className={`py-1.5 px-3 rounded-xl text-[10px] font-black flex items-center gap-1 shadow border-2 cursor-pointer ${
                            level >= config.minLevel && coins >= config.unlockCost
                              ? "bg-emerald-600 text-white border-emerald-800 hover:bg-emerald-700 active:translate-y-0.5"
                              : "bg-amber-100/20 text-amber-900/30 border-dashed border-amber-200 cursor-not-allowed"
                          }`}
                          id={`unlock-loc-${locId}`}
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>{config.unlockCost}м</span>
                        </button>
                        <p className="text-[9px] text-[#B45309] font-black uppercase tracking-wider block">
                          нужен ур. {config.minLevel}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cozy themed footer statistics */}
      <div className="mt-4 pt-3.5 border-t-4 border-dashed border-[#92400E]/20 flex justify-between items-center text-[10px] text-[#92400E] font-black uppercase tracking-wider">
        <span>Баланс: <strong className="text-[#D97706]">{coins} монет</strong></span>
        <span>Максим Фермер • Мирно и весело! 🍏</span>
      </div>
    </section>
  );
};
