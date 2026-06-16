/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AnimalInstance, AnimalSpecies } from "../types";
import { ANIMAL_TEMPLATES } from "../data";
import { AnimalSVG } from "./AnimalSVG";
import { Heart, Star, Sparkles, Pencil, Check, RefreshCw, Scissors, Milk, Volume2, Trash2 } from "lucide-react";
import {
  playAnimalSound,
  playPetSound,
  playEatSound,
  playShearSound,
  playClickSound,
  playSadSound
} from "../lib/audio";

interface AnimalCardProps {
  animal: AnimalInstance;
  foodInventoryCount: number; // current count of food items in inventory
  onFeed: (id: string) => void;
  onPetBeforeStateUpdate: (id: string) => void; // local heart effects trigger
  onPet: (id: string) => void;
  onShear: (id: string) => void;
  onMilk: (id: string) => void;
  onCollect: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onSellAnimal: (id: string) => void; // Allow selling animals back to clear space
}

export const AnimalCard: React.FC<AnimalCardProps> = ({
  animal,
  foodInventoryCount,
  onFeed,
  onPetBeforeStateUpdate,
  onPet,
  onShear,
  onMilk,
  onCollect,
  onRename,
  onSellAnimal,
}) => {
  const template = ANIMAL_TEMPLATES[animal.species];
  const [isEditingName, setIsEditingName] = useState(false);
  const [newNameInput, setNewNameInput] = useState(animal.customName);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isWobbling, setIsWobbling] = useState(false);

  // Trigger animal sound on clicking the animal itself or speaker
  const handleAnimalSound = () => {
    setIsWobbling(true);
    setTimeout(() => setIsWobbling(false), 500);
    playAnimalSound(template.soundType);
  };

  const handleRenameSubmit = () => {
    playClickSound();
    if (newNameInput.trim()) {
      onRename(animal.id, newNameInput.trim());
    }
    setIsEditingName(false);
  };

  // Petting action with cute floating hearts
  const handlePetPress = () => {
    playPetSound();
    
    // Spawn 4 floating hearts at random positions on the animal viewport
    const newHearts = Array.from({ length: 4 }).map((_, idx) => ({
      id: Date.now() + idx,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 45
    }));
    setHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !newHearts.find((nh) => nh.id === h.id)));
    }, 1200);

    onPetBeforeStateUpdate(animal.id);
    onPet(animal.id);
  };

  // Feed action
  const handleFeed = () => {
    if (foodInventoryCount > 0) {
      playEatSound();
      onFeed(animal.id);
      
      // Joyous bounce
      setIsWobbling(true);
      setTimeout(() => setIsWobbling(false), 600);
    } else {
      playSadSound();
      // Throw alert message or visual cues
    }
  };

  return (
    <div
      className="bg-[#FEF3C7] border-8 border-[#92400E] rounded-[42px] p-6 shadow-2xl relative min-h-[490px] flex flex-col justify-between transition-all duration-300"
      id={`animal-card-${animal.id}`}
    >
      {/* Top Floating Ribbon Badge */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#D97706] text-white px-6 py-1 rounded-full font-black text-xs uppercase shadow-md border-2 border-white tracking-wider whitespace-nowrap">
        Главный Загон
      </div>

      {/* Top Banner Status */}
      <div className="flex justify-between items-start gap-2 mt-2 pt-1" id="card-header">
        <div className="flex-1">
          {/* Custom Naming edit row */}
          {isEditingName ? (
            <div className="flex items-center gap-1.5" id="name-editor">
              <input
                type="text"
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                maxLength={14}
                className="bg-white border-4 border-[#D97706] text-sm font-black rounded-xl px-2.5 py-0.5 w-32 focus:outline-none text-[#92400E]"
                autoFocus
              />
              <button
                onClick={handleRenameSubmit}
                className="p-1 px-1.5 bg-[#D97706] rounded-xl text-white hover:bg-[#92400E] transition-colors border-2 border-[#92400E]"
                id="save-name-btn"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <h3 className="font-black text-2xl text-[#92400E] flex items-center gap-1 tracking-tight" id="animal-name">
                {animal.customName}
              </h3>
              <button
                onClick={() => {
                  playClickSound();
                  setIsEditingName(true);
                }}
                className="p-1 text-[#D97706] hover:text-[#92400E]"
                id="edit-name-btn"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs text-[#B45309] font-black bg-[#FFFBEB] border-2 border-[#D97706] px-3 py-0.5 rounded-full inline-block mt-1">
            {template.emoji} {template.nameRu}
          </p>
        </div>

        {/* Feeding indicator bubble */}
        {animal.isFed ? (
          <span className="text-[11px] bg-[#FFFBEB] text-green-700 font-black py-1 px-3 rounded-full border-2 border-green-400 shadow-sm animate-pulse whitespace-nowrap">
            😋 Сыт ({animal.fedTimeRemaining} сек)
          </span>
        ) : (
          <span className="text-[11px] bg-rose-100 text-rose-700 font-black py-1 px-3 rounded-full border-2 border-rose-400 shadow-sm animate-bounce whitespace-nowrap">
            😢 Голодает!
          </span>
        )}
      </div>

      {/* Main Focus Close-Up View (Gives the up-close feel requested) */}
      <div
        className="relative h-48 my-3 flex items-center justify-center bg-white/70 rounded-[28px] border-4 border-dashed border-[#D97706]/40 overflow-hidden cursor-pointer shadow-inner"
        onClick={handleAnimalSound}
        title="Нажми, чтобы погладить и послушать голос!"
        id="closeup-viewport"
      >
        <div
          className={`w-36 h-36 transition-all duration-300 select-none ${
            isWobbling ? "scale-110 -rotate-6" : "hover:scale-105"
          }`}
        >
          <AnimalSVG
            species={animal.species}
            happiness={animal.happiness}
            isFed={animal.isFed}
            isSheared={animal.isSheared}
            cleanliness={animal.cleanliness}
          />
        </div>

        {/* Floating Hearts effect */}
        {hearts.map((h) => (
          <div
            key={h.id}
            className="absolute text-red-500 text-3xl font-bold animate-float-heart select-none pointer-events-none"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            ❤️
          </div>
        ))}

        {/* Hunger bubbles or dirt indicators */}
        {!animal.isFed && (
          <div className="absolute top-2.5 left-3 bg-[#FFFBEB] rounded-2xl p-1.5 px-3 border-2 border-[#D97706] shadow-md text-[11px] font-black flex items-center gap-1 text-[#92400E] animate-pulse pointer-events-none">
            🌱 Дай {template.productIcon === "🥛" ? "🥛" : template.foodNameRu}!
          </div>
        )}

        {animal.cleanliness < 40 && (
          <div className="absolute bottom-2.5 right-3 bg-amber-50 rounded-xl p-1 px-2.5 border-2 border-[#D97706] text-[10px] font-black text-[#92400E] flex items-center gap-1">
            🧼 Грязно! Щётка!
          </div>
        )}

        {/* Voice Trigger Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAnimalSound();
          }}
          className="absolute bottom-2.5 left-2.5 bg-[#D97706] text-white p-2 rounded-full shadow-md hover:bg-[#92400E] hover:scale-110 active:scale-95 transition border border-white"
          id="sound-trigger-btn"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Production progress bar */}
      <div className="space-y-1 mb-2.5" id="production-tracker">
        <div className="flex justify-between text-xs font-black text-[#92400E]">
          <span className="flex items-center gap-1">
            <span>{template.productIcon}</span>
            <span>{template.productName}:</span>
          </span>
          <span>{Math.floor(animal.productionProgress)}%</span>
        </div>
        <div className="h-4 bg-white/80 rounded-full overflow-hidden border-2 border-[#92400E]/30 relative shadow-inner">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              animal.isFed ? "bg-gradient-to-r from-amber-400 to-[#D97706]" : "bg-gray-300"
            }`}
            style={{ width: `${animal.productionProgress}%` }}
          />
        </div>

        {/* Collect / Shear / Milk Button matching mockup */}
        <div className="h-11 mt-1.5">
          {animal.productionProgress >= 100 ? (
            animal.species === AnimalSpecies.SHEEP ? (
              // Sheep Shearing action
              <button
                onClick={() => {
                  playShearSound();
                  onShear(animal.id);
                }}
                className="w-full h-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 animate-bounce border-4 border-[#92400E] active:translate-y-0.5 transition-all"
                id="shear-wool-btn"
              >
                <Scissors className="w-4 h-4 text-white" />
                <span>Постричь овечку {animal.customName}! (+Шерсть)</span>
              </button>
            ) : animal.species === AnimalSpecies.COW || animal.species === AnimalSpecies.GOAT ? (
              // Cow/Goat Milking action
              <button
                onClick={() => {
                  playClickSound();
                  onMilk(animal.id);
                }}
                className="w-full h-full bg-[#3B82F6] hover:bg-blue-600 text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 animate-bounce border-4 border-[#92400E] active:translate-y-0.5 transition-all"
                id="milk-animal-btn"
              >
                <Milk className="w-4 h-4 text-white" />
                <span>Подоить {animal.customName}! (+Молоко)</span>
              </button>
            ) : (
              // Normal gathering action (eggs, feathers, truffles)
              <button
                onClick={() => {
                  playClickSound();
                  onCollect(animal.id);
                }}
                className="w-full h-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-black text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2 animate-bounce border-4 border-[#92400E] active:translate-y-0.5 transition-all"
                id="collect-product-btn"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>Собрать {template.productName}!</span>
              </button>
            )
          ) : (
            <div className="w-full h-full bg-white/40 border-2 border-dashed border-[#92400E]/20 text-[#92400E]/60 font-black text-xs rounded-2xl flex items-center justify-center gap-1 text-center">
              <span>{animal.isFed ? "Работает на ферме..." : "Спит голодный • Покорми его"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action panel with chunky buttons */}
      <div className="grid grid-cols-2 gap-3 mt-1.5" id="card-actions">
        {/* Feed Button */}
        <button
          onClick={handleFeed}
          disabled={foodInventoryCount <= 0 || animal.isFed}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl text-xs font-black border-4 transition-all ${
            animal.isFed
              ? "bg-[#FFFBEB] text-green-700 border-green-400 cursor-not-allowed"
              : foodInventoryCount > 0
              ? "bg-[#F59E0B] hover:bg-[#D97706] text-white border-[#92400E] hover:scale-103 shadow-md active:translate-y-0.5 cursor-pointer"
              : "bg-amber-100/50 text-[#92400E]/40 border-[#92400E]/20 cursor-not-allowed"
          }`}
          id="feed-action"
        >
          <span>🌾 Покормить</span>
          <span className="bg-white/30 text-[10px] px-1.5 py-0.2 rounded-full font-black">
            ({foodInventoryCount})
          </span>
        </button>

        {/* Pet / Care Button */}
        <button
          onClick={handlePetPress}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black text-xs rounded-2xl border-4 border-[#92400E] hover:scale-103 active:translate-y-0.5 transition-all shadow-md cursor-pointer"
          id="pet-action"
        >
          <Heart className="w-3.5 h-3.5 fill-current text-white animate-pulse" />
          <span>Гладить (+Щётка)</span>
        </button>
      </div>

      {/* Card statistics & Danger room */}
      <div className="mt-4 pt-2 border-t-2 border-dashed border-[#92400E]/20 flex items-center justify-between text-[10px] text-[#92400E] font-bold" id="card-footer">
        <div className="flex gap-3">
          <span>Любовь: <strong className="text-[#B45309]">{animal.happiness}%</strong></span>
          <span>Чистота: <strong className="text-[#D97706]">{animal.cleanliness}%</strong></span>
        </div>
        <button
          onClick={() => {
            if (window.confirm(`Максим, ты точно хочешь отпустить ${animal.customName} обратно на волю? Дадут половину монет!`)) {
              playClickSound();
              onSellAnimal(animal.id);
            }
          }}
          className="text-[#92400E]/40 hover:text-rose-600 transition-colors p-1"
          title="Подарить свободу (Продать)"
          id="sell-animal-btn"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
