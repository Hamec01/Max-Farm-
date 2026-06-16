/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { PlayerState, AnimalSpecies, LocationId, CropType, TreeType, AnimalInstance, CropInstance, TreeInstance, Butterfly, FallingStar } from "./types";
import { INITIAL_STATE, ANIMAL_TEMPLATES, CROPS_CONFIG, TREES_CONFIG, LOCATIONS, UPGRADES, BUILDINGS_TEMPLATES, WORKER_DESCRIPTIONS, loadSavedGameState } from "./data";
import { GameHeader } from "./components/GameHeader";
import { HelpOverlay } from "./components/HelpOverlay";
import { AnimalSVG } from "./components/AnimalSVG";
import {
  playLevelUpSound,
  playClickSound,
  playCoinSound,
  playAnimalSound,
  playPetSound,
  playEatSound,
  playShearSound,
  playSadSound,
  playWaterSound,
  playPlantSound
} from "./lib/audio";
import {
  setMuteState,
  unlockAudio,
  playAnimalClickSound,
  playAnimalAmbientSound,
  playButterflySound,
  playStarSound,
  playFootstepSound,
  playWindAmbient,
  playNpcClickSound,
  updateBackgroundMusic,
} from "./lib/soundManager";
import { useGameViewport } from "./hooks/useGameViewport";
import { Sparkles, Trophy, Sprout, Heart, MapPin, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, BookOpen, ShoppingBag, Coins, RefreshCw, Star, Trash2 } from "lucide-react";

interface FishInstance {
  id: string;
  x: number;
  y: number;
  type: string;
  emoji: string;
  vx: number;
  vy: number;
  scaleX: number;
}

const PLOT_COSTS: Record<string, number> = {
  plot5: 120,
  plot6: 200,
  plot7: 320,
  plot8: 480,
};
const ALL_PLOT_IDS = ["plot1", "plot2", "plot3", "plot4", "plot5", "plot6", "plot7", "plot8"];

const ZONES_ORDER: LocationId[] = ["MEADOW", "BARNYARD", "LAKESIDE", "ORCHARD", "DESERT", "FOREST", "LAKE"];

/** Какие культуры можно посадить на грядке (не яблоки/молоко — они с деревьев и доения) */
const PLANTABLE_CROP_CHOICES: { crop: CropType; seed: string; cost: number }[] = (
  Object.keys(CROPS_CONFIG) as CropType[]
).map((crop) => ({
  crop,
  seed: `${crop}_SEED`,
  cost: CROPS_CONFIG[crop].seedCost,
}));

/** Список культур, которые нужны животным, от самых дефицитных в инвентаре */
function getPrioritizedNeededCrops(
  animals: AnimalInstance[],
  inventory: Record<string, number>
): CropType[] {
  const needCount = new Map<CropType, number>();

  animals.forEach((animal) => {
    const config = ANIMAL_TEMPLATES[animal.species];
    const food = config.foodType;
    if (!(food in CROPS_CONFIG)) return;
    const crop = food as CropType;
    needCount.set(crop, (needCount.get(crop) || 0) + 1);
  });

  if (needCount.size === 0) return [];

  return [...needCount.entries()]
    .sort((a, b) => {
      const invA = inventory[a[0]] || 0;
      const invB = inventory[b[0]] || 0;
      if (invA !== invB) return invA - invB;
      // Голодные животные важнее
      const hungryA = animals.filter(
        (an) => !an.isFed && ANIMAL_TEMPLATES[an.species].foodType === a[0]
      ).length;
      const hungryB = animals.filter(
        (an) => !an.isFed && ANIMAL_TEMPLATES[an.species].foodType === b[0]
      ).length;
      if (hungryA !== hungryB) return hungryB - hungryA;
      return b[1] - a[1];
    })
    .map(([crop]) => crop);
}

/** Выбрать семена: сначала из рюкзака, иначе купить нужную культуру (не пшеницу по умолчанию) */
function pickCropSeedForWorker(
  prioritizedCrops: CropType[],
  inventory: Record<string, number>,
  coins: number
): { crop: CropType; seed: string; fromInventory: boolean; cost: number } | null {
  for (const crop of prioritizedCrops) {
    const seed = `${crop}_SEED`;
    if ((inventory[seed] || 0) > 0) {
      return { crop, seed, fromInventory: true, cost: 0 };
    }
  }
  for (const crop of prioritizedCrops) {
    const choice = PLANTABLE_CROP_CHOICES.find((c) => c.crop === crop);
    if (choice && coins >= choice.cost) {
      return { crop, seed: choice.seed, fromInventory: false, cost: choice.cost };
    }
  }
  return null;
}

export default function App() {
  const { zoomScale, viewportHeightPx, deviceKind } = useGameViewport();
  const isPhone = deviceKind === "phone";

  // Load state from local storage or use initial state
  const [gameState, setGameState] = useState<PlayerState>(() => loadSavedGameState());

  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [draggedAnimalId, setDraggedAnimalId] = useState<string | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [showShopModal, setShowShopModal] = useState<boolean>(false);
  const [isBagCollapsed, setIsBagCollapsed] = useState<boolean>(false);
  const [shopActiveTab, setShopActiveTab] = useState<"sell" | "animals" | "upgrades" | "lands" | "workers">("sell");

  const [workersPositions, setWorkersPositions] = useState<Record<string, {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    isMoving: boolean;
    dir: "left" | "right";
    actionLabel?: string;
    actionTimer: number;
  }>>({
    "worker-papa": { x: 25, y: 72, targetX: 25, targetY: 72, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-mama": { x: 38, y: 74, targetX: 38, targetY: 74, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-nadya": { x: 48, y: 76, targetX: 48, targetY: 76, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-lena": { x: 58, y: 78, targetX: 58, targetY: 78, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-pasha": { x: 68, y: 75, targetX: 68, targetY: 75, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-andrey": { x: 78, y: 73, targetX: 78, targetY: 73, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-dima": { x: 45, y: 71, targetX: 45, targetY: 71, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-arina": { x: 82, y: 74, targetX: 82, targetY: 74, isMoving: false, dir: "left", actionTimer: 0 },
    "worker-sveta": { x: 35, y: 73, targetX: 35, targetY: 73, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-misha": { x: 42, y: 76, targetX: 42, targetY: 76, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-masha": { x: 55, y: 72, targetX: 55, targetY: 72, isMoving: false, dir: "right", actionTimer: 0 },
    "worker-sergey": { x: 62, y: 75, targetX: 62, targetY: 75, isMoving: false, dir: "right", actionTimer: 0 },
  });

  const triggerWorkerActionFeedback = (workerId: string, x: number, y: number, label: string) => {
    setWorkersPositions((prev) => {
      const current = prev[workerId];
      if (!current) return prev;
      return {
        ...prev,
        [workerId]: {
          ...current,
          targetX: Math.max(5, Math.min(95, x)),
          targetY: Math.max(30, Math.min(84, y)),
          actionLabel: label,
          actionTimer: 2000
        }
      };
    });
  };

  const [showHelp, setShowHelp] = useState<boolean>(() => {
    return !localStorage.getItem("maxim_fermer_save");
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeZone, setActiveZone] = useState<LocationId>("MEADOW");
  const [customNotification, setCustomNotification] = useState<string | null>(null);

  // Kid-friendly Room/Room Transition helpers (all 7 locations, circular)
  const currentZoneIndex = ZONES_ORDER.indexOf(activeZone);
  const prevZone = ZONES_ORDER[(currentZoneIndex - 1 + ZONES_ORDER.length) % ZONES_ORDER.length];
  const nextZone = ZONES_ORDER[(currentZoneIndex + 1) % ZONES_ORDER.length];

  // Character walking state
  const [boyPosition, setBoyPosition] = useState({
    x: 50,
    y: 60,
    targetX: 50,
    targetY: 60,
    isMoving: false,
    dir: "right" as "left" | "right"
  });

  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);

  // 🦋 БАБОЧКИ И 🌠 ПАДАЮЩИЕ ЗВЕЗДЫ - REALTIME ENGINE:
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const [fallingStars, setFallingStars] = useState<FallingStar[]>([]);

  // Инициализируем несколько стартовых красивых бабочек (теперь меньше и разные)
  useEffect(() => {
    const initialButterflies: Butterfly[] = [
      { id: "b1", x: 30, y: 35, type: "green", emoji: "🦋", vx: 0.1, vy: -0.1 },
      { id: "b2", x: 65, y: 45, type: "pink", emoji: "🦋", vx: -0.12, vy: 0.08 }
    ];
    setButterflies(initialButterflies);
  }, []);

  // Высокочастотный таймер анимации бабочек и звезд (100мс)
  useEffect(() => {
    const isNightVal = gameState.dayProgress !== undefined && gameState.dayProgress >= 192;

    // Утром все звезды растворяются в лучах солнца
    if (!isNightVal) {
      setFallingStars([]);
    }

    const timer = setInterval(() => {
      // 1. Плавное порхание бабочек по синусоидальной траектории
      setButterflies((prev) =>
        prev.map((b) => {
          const nvx = b.vx * 0.9 + (Math.random() - 0.5) * 0.35;
          const nvy = b.vy * 0.9 + (Math.random() - 0.5) * 0.35;

          let nx = b.x + nvx;
          let ny = b.y + nvy;

          let vxFinal = nvx;
          let vyFinal = nvy;

          // Ограничиваем невидимыми границами пастбища
          if (nx < 5 || nx > 95) {
            vxFinal = -nvx;
            nx = Math.max(5, Math.min(95, nx));
          }
          if (ny < 15 || ny > 62) {
            vyFinal = -nvy;
            ny = Math.max(15, Math.min(62, ny));
          }

          return {
            ...b,
            x: nx,
            y: ny,
            vx: vxFinal,
            vy: vyFinal
          };
        })
      );

      // 2. Движение падающих звезд вниз к траве
      setFallingStars((prev) =>
        prev
          .map((s) => {
            if (!s.isGrounded) {
              const ny = s.y + 2.5; // Скорость падения
              if (ny >= s.targetY) {
                return { ...s, y: s.targetY, isGrounded: true };
              }
              return { ...s, y: ny };
            }
            return s;
          })
          .filter((s) => !s.collected)
      );

      // 3. Динамический спавн (каждые 100мс с маленькой вероятностью)
      // А. Спавн бабочек (теперь максимум 3 на экране)
      if (Math.random() < 0.005) {
        setButterflies((prev) => {
          if (prev.length >= 3) return prev;
          const colors: ("blue" | "orange" | "purple" | "gold" | "pink" | "green")[] = ["blue", "orange", "purple", "gold", "pink", "green"];
          const chosenColor = colors[Math.floor(Math.random() * colors.length)];
          
          let emoji = "🦋";
          if (chosenColor === "orange") emoji = "🐝";
          if (chosenColor === "purple") emoji = "🐞";
          if (chosenColor === "gold") emoji = "🧚";

          const newB: Butterfly = {
            id: `b-${Date.now()}-${Math.random()}`,
            x: Math.random() * 80 + 10,
            y: Math.random() * 40 + 20,
            type: chosenColor,
            emoji,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
          };
          return [...prev, newB];
        });
      }

      // Б. Спавн падающих звезд ночью (максимум 4 лежащих на земле)
      if (isNightVal && Math.random() < 0.015) {
        setFallingStars((prev) => {
          const activeGrounded = prev.filter((s) => s.isGrounded).length;
          if (activeGrounded >= 4) return prev;
          const newS: FallingStar = {
            id: `star-${Date.now()}-${Math.random()}`,
            x: Math.random() * 80 + 10,
            y: 0,
            targetY: 53 + Math.random() * 32,
            isGrounded: false,
            collected: false,
            size: 22 + Math.random() * 15
          };
          return [...prev, newS];
        });
      }
    }, 100);

    return () => clearInterval(timer);
  }, [gameState.dayProgress]);

  // Сбор бабочки: за нее даются золотые монетки и опыт!
  const handleCollectButterfly = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const butterfly = butterflies.find((b) => b.id === id);
    if (!butterfly) return;

    playButterflySound();
    setGameState((prev) => {
      const nextCoins = prev.coins + 10;
      setTimeout(() => {
        spawnFloatHeart(butterfly.x, butterfly.y, `${butterfly.emoji} +10🪙`);
      }, 50);

      let msg = "🦋 Отличный улов! Красивая бабочка принесла тебе 10 золотых монет! 🪙";
      if (butterfly.emoji === "🐝") msg = "🐝 Сладкая медовая пчёлка принесла тебе 10 золотых монет! 🪙";
      else if (butterfly.emoji === "🐞") msg = "🐞 Яркая божья коровка принесла тебе 10 золотых монет! 🪙";
      else if (butterfly.emoji === "🧚") msg = "🧚 Волшебная лесная фея подарила тебе 10 золотых монет! 🪙";

      triggerNotification(msg);
      return awardExperience(
        8,
        {
          ...prev,
          coins: nextCoins,
          stats: { ...prev.stats, totalCoinsEarned: prev.stats.totalCoinsEarned + 10 }
        }
      );
    });

    setButterflies((prev) => prev.filter((b) => b.id !== id));
  };

  // Сбор упавшей звезды: дает редкие монетки и опыт!
  const handleCollectStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const star = fallingStars.find((s) => s.id === id);
    if (!star) return;

    playStarSound();
    setGameState((prev) => {
      const nextCoins = prev.coins + 25;
      setTimeout(() => {
        spawnFloatHeart(star.x, star.y, "⭐ +25🪙");
      }, 50);
      triggerNotification("🌠 Волшебство! Упавшая золотая звезда дала тебе 25 монет! 🪙");
      return awardExperience(
        15,
        {
          ...prev,
          coins: nextCoins,
          stats: { ...prev.stats, totalCoinsEarned: prev.stats.totalCoinsEarned + 25 }
        }
      );
    });

    setFallingStars((prev) => prev.filter((s) => s.id !== id));
  };

  // Sync mute + фоновая музыка день/ночь
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    setMuteState(nextMute);
    if (!nextMute) {
      const dp = gameState.dayProgress ?? 0;
      updateBackgroundMusic(dp >= 192);
    }
  };

  // Разблокировка звука и музыки после первого жеста
  useEffect(() => {
    const onFirstInteract = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      unlockAudio();
      const dp = gameState.dayProgress ?? 0;
      if (!isMuted) updateBackgroundMusic(dp >= 192);
    };
    window.addEventListener("pointerdown", onFirstInteract, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstInteract);
  }, []);

  useEffect(() => {
    if (!audioUnlockedRef.current || isMuted) return;
    const dp = gameState.dayProgress ?? 0;
    updateBackgroundMusic(dp >= 192);
  }, [gameState.dayProgress, isMuted]);

  // Helper to show brief in-game floating notifications
  const triggerNotification = (text: string) => {
    setCustomNotification(text);
    setTimeout(() => {
      setCustomNotification((curr) => curr === text ? null : curr);
    }, 4000);
  };

  // Award Experience points & level up with high-contrast cheer
  const awardExperience = (amount: number, state: PlayerState): PlayerState => {
    let newExp = state.experience + amount;
    let newLvl = state.level;
    let newCoins = state.coins;

    const nextLevelExp = newLvl * 100;
    if (newExp >= nextLevelExp) {
      newExp -= nextLevelExp;
      newLvl += 1;
      newCoins += 150; // level up gold bonus
      setTimeout(() => {
        playLevelUpSound();
        triggerNotification(`🎉 Ура-а! Максим взял ${newLvl} уровень! Получено +150 монет!`);
      }, 50);
    }

    return {
      ...state,
      experience: newExp,
      level: newLvl,
      coins: newCoins
    };
  };

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("maxim_fermer_save", JSON.stringify(gameState));
  }, [gameState]);

  // Real-time ticking engine for crops growth, satiety decay, animal production, day cycles and helper workers
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState((prev) => {
        // --- 0. Day Progression & Payment Tracking ---
        let currentDay = prev.day || 1;
        let currentDayProgress = prev.dayProgress !== undefined ? prev.dayProgress + 1 : 0;
        let nextCoins = prev.coins;
        let updatedWorkers = prev.workers ? [...prev.workers] : [];
        
        let paymentNotice: string | null = null;
        let shouldSoundCoin = false;
        let shouldSoundSad = false;

        const DAY_LENGTH_SECONDS = 240; // 1 day = 240 game ticks (seconds)

        if (currentDayProgress >= DAY_LENGTH_SECONDS) {
          currentDayProgress = 0;
          currentDay += 1;

          // Check hired workers wages
          const activeWorkers = updatedWorkers.filter((w) => w.isActive);
          const totalWage = activeWorkers.reduce((acc, curr) => acc + curr.dailyWage, 0);

          if (totalWage > 0) {
            if (nextCoins >= totalWage) {
              nextCoins -= totalWage;
              shouldSoundCoin = true;
              paymentNotice = `💰 Закат дня! Выплачено жалование работникам за отличный труд: -${totalWage}🪙.`;
            } else {
              // Dismiss workers who aren't paid
              updatedWorkers = updatedWorkers.map((w) => {
                if (w.isActive) {
                  return {
                    ...w,
                    isActive: false,
                    statusText: "Уволился (не получена плата за ежедневную работу!)"
                  };
                }
                return w;
              });
              shouldSoundSad = true;
              paymentNotice = `😢 У вас не хватило ${totalWage}🪙 на оплату труда в конце дня! Все работники ушли.`;
            }
          } else {
            paymentNotice = `📆 С новым рассветом! Наступил прекрасный День ${currentDay}.`;
          }
        }

        if (paymentNotice) {
          const finalNotice = paymentNotice;
          const soundVal = shouldSoundCoin;
          const sadVal = shouldSoundSad;
          setTimeout(() => {
            if (soundVal) playCoinSound();
            else if (sadVal) playSadSound();
            else playClickSound();
            triggerNotification(finalNotice);
          }, 100);
        }

        // --- 1. Tick Crops Growth (Meadow, Barnyard, Lakeside show crops) ---
        const updatedCrops = { ...prev.crops };
        Object.keys(updatedCrops).forEach((plotId) => {
          const crop = updatedCrops[plotId];
          if (crop && crop.progress > 0 && crop.progress < 100) {
            const config = CROPS_CONFIG[crop.type];
            const spadeLvl = prev.upgrades["goldenSpade"] || 1;
            const spadeSpeedMultiplier = 1 + (spadeLvl - 1) * 0.15;
            
            // Crops grow only if they are watered
            if (crop.isWatered) {
              const secondsElapsed = 1 * spadeSpeedMultiplier;
              const totalGrowSeconds = config.growTime;
              const addedProgress = (secondsElapsed / totalGrowSeconds) * 100;
              crop.progress = Math.min(crop.progress + addedProgress, 100);
            }
          }
        });

        // --- 2. Tick Orchard Trees ripening (Orchard shows trees) ---
        const updatedTrees = { ...prev.trees };
        Object.keys(updatedTrees).forEach((plotId) => {
          const tree = updatedTrees[plotId];
          if (tree) {
            const config = TREES_CONFIG[tree.type];
            if (tree.fruitCount < config.yieldCount) {
              const secondsElapsed = 1;
              const growSeconds = config.growTime;
              const addedProgress = (secondsElapsed / growSeconds) * 100;
              tree.fruitProgress = tree.fruitProgress + addedProgress;

              if (tree.fruitProgress >= 100) {
                tree.fruitCount = Math.min(tree.fruitCount + 1, config.yieldCount);
                tree.fruitProgress = 0;
              }
            }
          }
        });

        // --- 3. Tick Animals (Satiety decay, grow wool, increase cleanliness timer) ---
        let updatedAnimals = prev.animals.map((animal) => {
          let isFed = animal.isFed;
          let fedTimeRemaining = animal.fedTimeRemaining;
          let productionProgress = animal.productionProgress;
          let sheared = animal.isSheared || false;
          let regrowTime = animal.regrowWoolTimeRemaining || 0;
          let cleanliness = Math.max(animal.cleanliness - 0.25, 0); // slightly faster debris accumulation

          if (sheared && regrowTime > 0) {
            regrowTime -= 1;
            if (regrowTime <= 0) {
              sheared = false;
            }
          }

          if (isFed && fedTimeRemaining > 0) {
            fedTimeRemaining -= 1;
            if (fedTimeRemaining <= 0) {
              isFed = false;
            }

            if (productionProgress < 100) {
              const config = ANIMAL_TEMPLATES[animal.species];
              const addedProgress = (1 / config.productionTime) * 100;
              productionProgress = Math.min(productionProgress + addedProgress, 100);
            }
          }

          return {
            ...animal,
            isFed,
            fedTimeRemaining,
            productionProgress,
            isSheared: sheared,
            regrowWoolTimeRemaining: regrowTime,
            cleanliness
          };
        });

        // --- 4. Hired Workers Automation Tasks ---
        let updatedInventory = { ...prev.inventory };
        let totalXpEarned = 0;
        let statsFedAdd = 0;
        let statsHarvestedAdd = 0;
        let statsCollectedAdd = 0;

        const isFeedHired = updatedWorkers.find(w => w.id === "worker-mama")?.isActive;
        const isGrowHired = updatedWorkers.find(w => w.id === "worker-nadya")?.isActive;
        const isCleanHired = updatedWorkers.find(w => w.id === "worker-lena")?.isActive;
        const isVetHired = updatedWorkers.find(w => w.id === "worker-pasha")?.isActive;
        const isBuilderHired = updatedWorkers.find(w => w.id === "worker-papa")?.isActive;
        const isOrchardHired = updatedWorkers.find(w => w.id === "worker-andrey")?.isActive;
        const isFisherHired = updatedWorkers.find(w => w.id === "worker-dima")?.isActive;
        const isClerkHired = updatedWorkers.find(w => w.id === "worker-arina")?.isActive;
        const isBakerHired = updatedWorkers.find(w => w.id === "worker-sveta")?.isActive;
        const isShepherdHired = updatedWorkers.find(w => w.id === "worker-misha")?.isActive;
        const isStargazerHired = updatedWorkers.find(w => w.id === "worker-masha")?.isActive;
        const isHandymanHired = updatedWorkers.find(w => w.id === "worker-sergey")?.isActive;

        // A. 👨‍🌾 Дядя Ваня (FEED WORKER) - feeds 1 hungry animal max per second
        if (isFeedHired) {
          let hasFedOne = false;
          updatedAnimals = updatedAnimals.map((animal) => {
            if (!animal.isFed && !hasFedOne) {
              const config = ANIMAL_TEMPLATES[animal.species];
              const foodType = config.foodType;
              let hasFood = (updatedInventory[foodType] || 0) > 0;
              let usedFoodKey = foodType;

              if (foodType === "MILK") {
                if ((updatedInventory["MILK"] || 0) > 0) { usedFoodKey = "MILK"; hasFood = true; }
                else if ((updatedInventory["Парное молоко"] || 0) > 0) { usedFoodKey = "Парное молоко"; hasFood = true; }
                else if ((updatedInventory["Козье молоко"] || 0) > 0) { usedFoodKey = "Козье молоко"; hasFood = true; }
              }

              if (hasFood) {
                updatedInventory[usedFoodKey] = (updatedInventory[usedFoodKey] || 1) - 1;
                hasFedOne = true;
                statsFedAdd += 1;
                totalXpEarned += 8;

                const feederLvl = prev.upgrades["autoFeeder"] || 1;
                const autoFeederMultiplier = 1 + (feederLvl - 1) * 0.20;

                setTimeout(() => {
                  playEatSound();
                  spawnFloatHeart(animal.x, animal.y, "🍿");
                  triggerWorkerActionFeedback("worker-mama", animal.x, animal.y, `🍿 Кормлю ${config.nameRu.split(" ")[0]}!`);
                }, 40);

                return {
                  ...animal,
                  isFed: true,
                  fedTimeRemaining: Math.round(config.productionTime * 2 * autoFeederMultiplier),
                  happiness: Math.min(animal.happiness + 20, 100)
                };
              }
            }
            return animal;
          });
        }

        // B. 👩‍🌾 Тётя Маша (GARDEN WORKER) - Waters, Seeds, and Harvests up to 1 plot respectively per second
        if (isGrowHired) {
          // B1. Waters 1 dry growing plot
          let waterCheck = false;
          Object.keys(updatedCrops).forEach((plotId) => {
            const crop = updatedCrops[plotId];
            if (crop && crop.progress > 0 && crop.progress < 100 && !crop.isWatered && !waterCheck) {
              crop.isWatered = true;
              waterCheck = true;
              setTimeout(() => {
                spawnFloatHeart(40, 42, "💧");
                const coords = getPlotsCoords(plotId);
                if (coords) {
                  triggerWorkerActionFeedback("worker-nadya", coords.x, coords.y, "💧 Поливаю!");
                }
              }, 40);
            }
          });

          // B2. Сеет то, что нужно животным (не только пшеницу!)
          let plantCheck = false;
          const prioritizedCrops = getPrioritizedNeededCrops(prev.animals || [], updatedInventory);

          Object.keys(updatedCrops).forEach((plotId) => {
            const crop = updatedCrops[plotId];
            if (crop && crop.progress === 0 && !plantCheck && prioritizedCrops.length > 0) {
              const pick = pickCropSeedForWorker(prioritizedCrops, updatedInventory, nextCoins);
              if (!pick) return;

              updatedCrops[plotId] = {
                id: plotId,
                type: pick.crop,
                progress: 2,
                isWatered: true,
                isDead: false,
                timeRemaining: CROPS_CONFIG[pick.crop].growTime
              };

              if (pick.fromInventory) {
                updatedInventory[pick.seed] = (updatedInventory[pick.seed] || 1) - 1;
              } else {
                nextCoins -= pick.cost;
              }

              plantCheck = true;
              setTimeout(() => {
                spawnFloatHeart(50, 42, "🌱");
                const coords = getPlotsCoords(plotId);
                if (coords) {
                  triggerWorkerActionFeedback(
                    "worker-nadya",
                    coords.x,
                    coords.y,
                    `🌱 Сею ${CROPS_CONFIG[pick.crop].nameRu}!`
                  );
                }
              }, 45);
            }
          });

          // B3. Harvests 1 ripe crop
          let harvestCheck = false;
          Object.keys(updatedCrops).forEach((plotId) => {
            const crop = updatedCrops[plotId];
            if (crop && crop.progress >= 100 && !crop.isDead && !harvestCheck) {
              const config = CROPS_CONFIG[crop.type];
              updatedInventory[crop.type] = (updatedInventory[crop.type] || 0) + config.yieldCount;
              crop.progress = 0;
              crop.isWatered = false;
              harvestCheck = true;
              statsHarvestedAdd += 1;
              totalXpEarned += 10;
              setTimeout(() => {
                spawnFloatHeart(45, 45, config.icon);
                const coords = getPlotsCoords(plotId);
                if (coords) {
                  triggerWorkerActionFeedback("worker-nadya", coords.x, coords.y, `🧺 Сбор ${config.nameRu}!`);
                }
              }, 45);
            }
          });
        }

        // C. 👦🏻 Озорной Вася (CLEANER WORKER) - Brushes, Gathers animal products & Orchard fruits
        if (isCleanHired) {
          // C1. Collects 1 ripe animal product
          let collectCheck = false;
          updatedAnimals = updatedAnimals.map((animal) => {
            if (animal.productionProgress >= 100 && !collectCheck && animal.species !== AnimalSpecies.SHEEP) {
              const config = ANIMAL_TEMPLATES[animal.species];
              const prodKey = config.productName;
              updatedInventory[prodKey] = (updatedInventory[prodKey] || 0) + 1;
              collectCheck = true;
              statsCollectedAdd += 1;
              totalXpEarned += 12;
              setTimeout(() => {
                playCoinSound();
                spawnFloatHeart(animal.x, animal.y, config.productIcon);
                triggerWorkerActionFeedback("worker-lena", animal.x, animal.y, `🧺 Сбор у ${config.nameRu.split(" ")[0]}!`);
              }, 50);
              return {
                ...animal,
                productionProgress: 0
              };
            }
            return animal;
          });

          // C2. Collects 1 Orchard fruit
          let fruitCheck = false;
          Object.keys(updatedTrees).forEach((treeId) => {
            const tree = updatedTrees[treeId];
            if (tree && tree.fruitCount > 0 && !fruitCheck) {
              const config = TREES_CONFIG[tree.type];
              const fruitKey = config.fruitNameRu === "Яблоко" ? "APPLE" : "CHERRY";
              updatedInventory[fruitKey] = (updatedInventory[fruitKey] || 0) + 1;
              tree.fruitCount -= 1;
              fruitCheck = true;
              statsCollectedAdd += 1;
              totalXpEarned += 15;
              setTimeout(() => {
                spawnFloatHeart(80, 50, config.icon);
                const coords = getTreeCoords(treeId);
                if (coords) {
                  triggerWorkerActionFeedback("worker-lena", coords.x, coords.y, `🍎 Сбор ${config.fruitNameRu}!`);
                }
              }, 50);
            }
          });

          // C3. Brushes moved to Дедушка Паша (worker-pasha)
        }

        // D. 👴🏼 Дедушка Паша (VET) - Brushes 1 dirty or unhappy animal
        if (isVetHired) {
          let brushCheck = false;
          updatedAnimals = updatedAnimals.map((animal) => {
            if ((animal.cleanliness < 70 || animal.happiness < 75) && !brushCheck) {
              brushCheck = true;
              setTimeout(() => {
                spawnFloatHeart(animal.x, animal.y, "🧼");
                triggerWorkerActionFeedback("worker-pasha", animal.x, animal.y, `🧼 Чищу ${ANIMAL_TEMPLATES[animal.species].nameRu.split(" ")[0]}!`);
              }, 40);
              return {
                ...animal,
                cleanliness: 100,
                happiness: Math.min(animal.happiness + 20, 100)
              };
            }
            return animal;
          });
        }

        // E. 🧔🏽‍♂️ Папа Андрей (BUILDER) - Pets 1 sad animal
        if (isBuilderHired) {
          let petCheck = false;
          updatedAnimals = updatedAnimals.map((animal) => {
            if (animal.happiness < 85 && !petCheck) {
              petCheck = true;
              setTimeout(() => {
                playPetSound();
                spawnFloatHeart(animal.x, animal.y, "❤️");
                triggerWorkerActionFeedback("worker-papa", animal.x, animal.y, `❤️ Глажу ${animal.customName}!`);
              }, 40);
              return {
                ...animal,
                happiness: Math.min(animal.happiness + 15, 100)
              };
            }
            return animal;
          });
        }

        // F. 👴🏽 Дедушка Андрей (ORCHARD) - Speeds up 1 tree fruit growth
        if (isOrchardHired) {
          let treeCheck = false;
          Object.keys(updatedTrees).forEach((treeId) => {
            const tree = updatedTrees[treeId];
            if (tree && tree.fruitCount < TREES_CONFIG[tree.type].yieldCount && !treeCheck) {
              tree.fruitProgress = Math.min(tree.fruitProgress + 12, 100);
              if (tree.fruitProgress >= 100) {
                tree.fruitCount = Math.min(tree.fruitCount + 1, TREES_CONFIG[tree.type].yieldCount);
                tree.fruitProgress = 0;
              }
              treeCheck = true;
              setTimeout(() => {
                const coords = getTreeCoords(treeId);
                if (coords) {
                  triggerWorkerActionFeedback("worker-andrey", coords.x, coords.y, "🌳 Ухаживаю!");
                }
              }, 45);
            }
          });
        }

        // G. 🧔🏻‍♂️ Дядя Дима (FISHER) - Catches fish for coins
        if (isFisherHired) {
          let fishCheck = false;
          if (!fishCheck) {
            nextCoins += 6;
            totalXpEarned += 4;
            fishCheck = true;
            setTimeout(() => {
              playCoinSound();
              spawnFloatHeart(50, 75, "🐟");
              triggerWorkerActionFeedback("worker-dima", 50, 75, "🐟 Поймал рыбку!");
            }, 50);
          }
        }

        // H. 👩🏻‍💼 Тётя Арина (CLERK) - Organizes inventory for bonus XP
        if (isClerkHired) {
          totalXpEarned += 5;
        }

        // I. 👩🏻 Тётя Светa (BAKER) - Bakes bread from wheat
        if (isBakerHired && (updatedInventory["WHEAT"] || 0) > 0) {
          updatedInventory["WHEAT"] = (updatedInventory["WHEAT"] || 1) - 1;
          nextCoins += 12;
          totalXpEarned += 6;
          setTimeout(() => {
            playCoinSound();
            spawnFloatHeart(40, 70, "🍞");
            triggerWorkerActionFeedback("worker-sveta", 40, 70, "🍞 Пеку хлеб!");
          }, 45);
        }

        // J. 👦🏻 Кузен Мишa (SHEPHERD) - Shears 1 ready sheep
        if (isShepherdHired) {
          let shearCheck = false;
          updatedAnimals = updatedAnimals.map((animal) => {
            if (
              !shearCheck &&
              animal.species === AnimalSpecies.SHEEP &&
              animal.productionProgress >= 100 &&
              !animal.isSheared
            ) {
              shearCheck = true;
              const config = ANIMAL_TEMPLATES[animal.species];
              updatedInventory[config.productName] = (updatedInventory[config.productName] || 0) + 1;
              statsCollectedAdd += 1;
              totalXpEarned += 12;
              setTimeout(() => {
                playShearSound();
                spawnFloatHeart(animal.x, animal.y, "🧶");
                triggerWorkerActionFeedback("worker-misha", animal.x, animal.y, "✂️ Стригу овечку!");
              }, 50);
              return {
                ...animal,
                productionProgress: 0,
                isSheared: true,
                regrowWoolTimeRemaining: 30,
                happiness: Math.max(animal.happiness - 5, 40)
              };
            }
            return animal;
          });
        }

        // K. 👵🏽 Бабушка Маша (STARGAZER) - Finds stars at night
        if (isStargazerHired && currentDayProgress >= 192) {
          nextCoins += 8;
          totalXpEarned += 8;
          setTimeout(() => {
            spawnFloatHeart(60, 30, "⭐");
            triggerWorkerActionFeedback("worker-masha", 60, 30, "⭐ Звёздочка!");
          }, 55);
        }

        // L. 🧑🏻‍🔧 Дядя Сергей (HANDYMAN) - Helps orchard + cheers animals
        if (isHandymanHired) {
          let handymanTreeCheck = false;
          Object.keys(updatedTrees).forEach((treeId) => {
            const tree = updatedTrees[treeId];
            if (tree && tree.fruitCount < TREES_CONFIG[tree.type].yieldCount && !handymanTreeCheck) {
              tree.fruitProgress = Math.min(tree.fruitProgress + 8, 100);
              handymanTreeCheck = true;
              setTimeout(() => {
                const coords = getTreeCoords(treeId);
                if (coords) {
                  triggerWorkerActionFeedback("worker-sergey", coords.x, coords.y, "🔧 Чиню сад!");
                }
              }, 45);
            }
          });
          let cheerCheck = false;
          updatedAnimals = updatedAnimals.map((animal) => {
            if (animal.happiness < 90 && !cheerCheck) {
              cheerCheck = true;
              return { ...animal, happiness: Math.min(animal.happiness + 8, 100) };
            }
            return animal;
          });
        }

        // --- 5. Animal dynamic wanders & sleeping shelter gathering ---
        const isNightVal = currentDayProgress >= 192;
        if (isNightVal) {
          // At night, all animals slowly gather and walk towards their cozy sleep shelters!
          const getSleepSpot = (loc: string) => {
            if (loc === "MEADOW") return { x: 28, y: 74 };
            if (loc === "BARNYARD") return { x: 28, y: 76 };
            if (loc === "LAKESIDE") return { x: 24, y: 75 };
            if (loc === "ORCHARD") return { x: 75, y: 74 };
            if (loc === "DESERT") return { x: 30, y: 75 };
            if (loc === "FOREST") return { x: 32, y: 73 };
            return { x: 28, y: 75 }; // Default LAKE
          };

          updatedAnimals = updatedAnimals.map((a) => {
            const spot = getSleepSpot(prev.activeLocation);
            // Slowly drift towards the cozy shelter spot with a little offset so they don't overlap completely
            const offsetIdx = a.id.charCodeAt(a.id.length - 1) % 6;
            const targetX = spot.x + (offsetIdx - 2.5) * 4.5;
            const targetY = spot.y + (offsetIdx - 2.5) * 2;
            
            const dx = targetX - a.x;
            const dy = targetY - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1.5) {
              const stepX = dx * 0.15;
              const stepY = dy * 0.15;
              return {
                ...a,
                x: Math.max(10, Math.min(90, a.x + stepX)),
                y: Math.max(54, Math.min(86, a.y + stepY)),
                scaleX: dx > 0 ? -1 : 1
              };
            }
            return a;
          });
        } else {
          // Normal daylight random wandering
          const shouldShift = Math.random() < 0.22; 
          if (shouldShift && updatedAnimals.length > 0) {
            const randomIndex = Math.floor(Math.random() * updatedAnimals.length);
            const a = { ...updatedAnimals[randomIndex] };
            const dx = (Math.random() * 8 - 4);
            const dy = (Math.random() * 6 - 3);
            
            a.x = Math.max(12, Math.min(88, a.x + dx));
            a.y = Math.max(56, Math.min(84, a.y + dy));
            a.scaleX = dx > 0 ? -1 : 1;
            
            updatedAnimals[randomIndex] = a;
          }
        }

        // Apply a gentle repulsion force to prevent animals from stacking in a pile!
        for (let i = 0; i < updatedAnimals.length; i++) {
          for (let j = i + 1; j < updatedAnimals.length; j++) {
            const a1 = updatedAnimals[i];
            const a2 = updatedAnimals[j];
            const dx = a2.x - a1.x;
            const dy = a2.y - a1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 4.8 && dist > 0.1) {
              // Push them slightly apart
              const pushX = (dx / dist) * 0.65;
              const pushY = (dy / dist) * 0.45;
              
              updatedAnimals[i] = {
                ...a1,
                x: Math.max(10, Math.min(90, a1.x - pushX)),
                y: Math.max(54, Math.min(86, a1.y - pushY))
              };
              updatedAnimals[j] = {
                ...a2,
                x: Math.max(10, Math.min(90, a2.x + pushX)),
                y: Math.max(54, Math.min(86, a2.y + pushY))
              };
            }
          }
        }

        let updatedState = {
          ...prev,
          coins: nextCoins,
          day: currentDay,
          dayProgress: currentDayProgress,
          crops: updatedCrops,
          trees: updatedTrees,
          animals: updatedAnimals,
          inventory: updatedInventory,
          workers: updatedWorkers,
          stats: {
            ...prev.stats,
            animalsFed: prev.stats.animalsFed + statsFedAdd,
            cropsHarvested: prev.stats.cropsHarvested + statsHarvestedAdd,
            productsCollected: prev.stats.productsCollected + statsCollectedAdd
          }
        };

        if (totalXpEarned > 0) {
          updatedState = awardExperience(totalXpEarned, updatedState);
        }

        return updatedState;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Редкие звуки природы и животных на локации
  useEffect(() => {
    if (isMuted) return;
    const ambientTimer = setInterval(() => {
      if (Math.random() < 0.022) {
        const zoneAnimals = gameState.animals.filter(
          (a) => (a.locationId || "MEADOW") === activeZone
        );
        if (zoneAnimals.length > 0) {
          const pick = zoneAnimals[Math.floor(Math.random() * zoneAnimals.length)];
          playAnimalAmbientSound(ANIMAL_TEMPLATES[pick.species].soundType);
        }
      }
      const dp = gameState.dayProgress ?? 0;
      const isNightVal = dp >= 192;
      const now = Date.now();
      if (!isNightVal && now - lastWindRef.current > 42000 && Math.random() < 0.35) {
        lastWindRef.current = now;
        playWindAmbient();
      }
    }, 2500);
    return () => clearInterval(ambientTimer);
  }, [gameState.animals, gameState.dayProgress, activeZone, isMuted]);

  const shiftPercent = Math.max(0, Math.min((zoomScale - 1) * 100, (boyPosition.x * zoomScale) - 50));

  // Tossing & Dragging tracking
  const draggedDistanceRef = useRef(0);
  const lastDragCoordsRef = useRef<{ x: number, y: number, t: number }[]>([]);
  const justFinishedDraggingRef = useRef<boolean>(false);

  // Advanced Long-Press/Drag-to-Toss tracking refs:
  const animalPressTimerRef = useRef<any>(null);
  const animalPressStartCoordsRef = useRef<{ x: number, y: number } | null>(null);
  const isAnimalDraggingConfirmedRef = useRef<boolean>(false);
  const pendingAnimalIdRef = useRef<string | null>(null);
  const pendingAnimalSpeciesRef = useRef<AnimalSpecies | null>(null);
  const audioUnlockedRef = useRef(false);
  const lastWindRef = useRef(0);

  // Smooth walk & animal physics loop
  useEffect(() => {
    const walkTimer = setInterval(() => {
      // 1. Move player boy
      setBoyPosition((prev) => {
        if (draggedAnimalId) {
          // Keep stationary and reset targeting while dragging an animal!
          return { ...prev, targetX: prev.x, targetY: prev.y, isMoving: false };
        }

        const dx = prev.targetX - prev.x;
        const dy = prev.targetY - prev.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.6) {
          if (prev.isMoving) {
            return { ...prev, x: prev.targetX, y: prev.targetY, isMoving: false };
          }
          return prev;
        }

        // Calculate smooth ease-out step (lerp decoding)
        // Decelerates beautifully as he approaches the destination
        const easeRatio = 0.045; // Silky-smooth slow walking blend deceleration
        let stepX = dx * easeRatio;
        let stepY = dy * easeRatio;

        // Establish boundaries for minimum step rate to prevent lingering
        const minStep = 0.5;
        const currentStepSize = Math.sqrt(stepX * stepX + stepY * stepY);
        if (currentStepSize < minStep && dist > 0.01) {
          const scale = minStep / dist;
          stepX = dx * scale;
          stepY = dy * scale;
        }

        const nextX = Math.abs(dx) <= Math.abs(stepX) ? prev.targetX : prev.x + stepX;
        const nextY = Math.abs(dy) <= Math.abs(stepY) ? prev.targetY : prev.y + stepY;
        const nextDir = dx < 0 ? ("left" as const) : dx > 0 ? ("right" as const) : prev.dir;

        playFootstepSound();

        return {
          ...prev,
          x: nextX,
          y: nextY,
          isMoving: true,
          dir: nextDir
        };
      });

      // 2. Gravity physical motion update for un-dragged animals
      setGameState((prev) => {
        let hasChanges = false;
        const updatedAnimals = prev.animals.map((animal) => {
          if (animal.id === draggedAnimalId) {
            return animal; // handled dynamically in dragging handlers
          }

          let ax = animal.x;
          let ay = animal.y;
          let avx = animal.vx || 0;
          let avy = animal.vy || 0;
          let angle = animal.angle || 0;
          const groundY = animal.groundY || 75;

          // If animal is above its ground level or has velocity
          if (ay < groundY || Math.abs(avy) > 0.05 || Math.abs(avx) > 0.05) {
            hasChanges = true;
            avy += 0.45; // softer, higher trajectory gravity index
            ay += avy;
            ax += avx;
            avx *= 0.96; // air resistance decay

            if (ay < groundY) {
              angle += avx * 3.5; // gorgeous physical flip spin!
            } else {
              angle *= 0.65; // settle angle rotation once hit the deck
              if (Math.abs(angle) < 0.5) angle = 0;
            }

            // Keep inside visible screen bounds (5% to 95%)
            if (ax < 5) {
              ax = 5;
              avx = -avx * 0.55; // bounce off walls with elastic reflection!
            }
            if (ax > 95) {
              ax = 95;
              avx = -avx * 0.55;
            }

            // Hit ground bounce logic
            if (ay >= groundY) {
              ay = groundY;
              if (Math.abs(avy) > 1.8) {
                avy = -avy * 0.40; // bouncy response
                playClickSound(); // landing tick sound
              } else {
                avy = 0;
                avx = 0;
                angle = 0;
              }
            }

            return {
              ...animal,
              x: ax,
              y: ay,
              vx: avx,
              vy: avy,
              angle,
              groundY
            };
          }
          return animal;
        });

        if (hasChanges) {
          return {
            ...prev,
            animals: updatedAnimals
          };
        }
        return prev;
      });

      // 1.5. Move hired workers dynamically on the pasture
      setWorkersPositions((prev) => {
        const next = { ...prev };
        let updated = false;

        Object.keys(next).forEach((wid) => {
          const w = next[wid];
          // Check if worker is active
          const isWorkerActive = gameState.workers?.find((gw) => gw.id === wid)?.isActive;
          if (!isWorkerActive) return; // don't move or animate if not hired

          // Tick action bubble timer If active
          let currentActionTimer = w.actionTimer;
          let currentActionLabel = w.actionLabel;
          if (currentActionTimer > 0) {
            currentActionTimer -= 30; // 30ms step
            if (currentActionTimer <= 0) {
              currentActionTimer = 0;
              currentActionLabel = undefined;
            }
          }

          const dx = w.targetX - w.x;
          const dy = w.targetY - w.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let newX = w.x;
          let newY = w.y;
          let isMoving = w.isMoving;
          let dir = w.dir;
          let targetX = w.targetX;
          let targetY = w.targetY;

          if (dist < 0.8) {
            isMoving = false;
            newX = w.targetX;
            newY = w.targetY;

            // Pick a random new spot occasionally near their zones!
            const shouldPickNewTarget = Math.random() < 0.015; // check on tick
            if (shouldPickNewTarget && currentActionTimer === 0) {
              isMoving = true;
              if (wid === "worker-papa" || wid === "worker-pasha" || wid === "worker-sergey") {
                targetX = 20 + Math.random() * 50;
                targetY = 60 + Math.random() * 20;
              } else if (wid === "worker-mama" || wid === "worker-nadya" || wid === "worker-lena" || wid === "worker-sveta") {
                targetX = 15 + Math.random() * 65;
                targetY = 62 + Math.random() * 18;
              } else if (wid === "worker-andrey" || wid === "worker-misha") {
                targetX = 15 + Math.random() * 70;
                targetY = 56 + Math.random() * 24;
              } else if (wid === "worker-dima" || wid === "worker-arina" || wid === "worker-masha") {
                targetX = 20 + Math.random() * 60;
                targetY = 65 + Math.random() * 18;
              } else {
                targetX = 20 + Math.random() * 60;
                targetY = 60 + Math.random() * 20;
              }
            }
          } else {
            // Smoothly move towards target
            isMoving = true;
            const ease = 0.035; // gentle walk
            newX = w.x + dx * ease;
            newY = w.y + dy * ease;
            dir = dx < 0 ? ("left" as const) : dx > 0 ? ("right" as const) : w.dir;
          }

          next[wid] = {
            ...w,
            x: newX,
            y: newY,
            targetX,
            targetY,
            isMoving,
            dir,
            actionLabel: currentActionLabel,
            actionTimer: currentActionTimer
          };
          updated = true;
        });

        return updated ? next : prev;
      });
    }, 30);

    return () => clearInterval(walkTimer);
  }, [draggedAnimalId]);

  // Keyboard controls
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const speedOffset = 12;
      let dx = 0;
      let dy = 0;

      if (key === "arrowup" || key === "w") {
        dy = -speedOffset;
      } else if (key === "arrowdown" || key === "s") {
        dy = speedOffset;
      } else if (key === "arrowleft" || key === "a") {
        dx = -speedOffset;
      } else if (key === "arrowright" || key === "d") {
        dx = speedOffset;
      }

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        setBoyPosition((prev) => ({
          ...prev,
          targetX: Math.max(5, Math.min(95, prev.targetX + dx)),
          targetY: Math.max(54, Math.min(86, prev.targetY + dy)),
          isMoving: true
        }));
      }
    };

    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, []);

  // Semyon Semyonich's stand coordinates
  const merchantCoords = { x: 82, y: 68 };

  const getPlotsCoords = (plotId: string) => {
    if (plotId === "plot1") return { x: 44, y: 68 };
    if (plotId === "plot2") return { x: 62, y: 68 };
    if (plotId === "plot3") return { x: 40, y: 84 };
    if (plotId === "plot4") return { x: 58, y: 84 };
    if (plotId === "plot5") return { x: 26, y: 68 };
    if (plotId === "plot6") return { x: 80, y: 68 };
    if (plotId === "plot7") return { x: 22, y: 84 };
    if (plotId === "plot8") return { x: 76, y: 84 };
    return { x: 50, y: 75 };
  };

  const getTreeCoords = (plotId: string) => {
    if (plotId === "treePlot1") return { x: 38, y: 56 };
    return { x: 72, y: 56 }; // treePlot2
  };

  // Drag-and-drop animal events
  const triggerAnimalDragConfirmed = (animalId: string, species: AnimalSpecies) => {
    if (isAnimalDraggingConfirmedRef.current) return;
    isAnimalDraggingConfirmedRef.current = true;
    setDraggedAnimalId(animalId);
    setSelectedAnimalId(null); // Hide details menu completely when entering physics throwing mode!
    setSelectedPlotId(null);
    setSelectedTreeId(null);
    draggedDistanceRef.current = 0;

    const animalInstance = gameState.animals.find((a) => a.id === animalId);
    if (animalInstance) {
      lastDragCoordsRef.current = [{ x: animalInstance.x, y: animalInstance.y, t: Date.now() }];
    } else {
      lastDragCoordsRef.current = [{ x: 50, y: 75, t: Date.now() }];
    }

    setGameState((prev) => {
      const updated = prev.animals.map((a) => {
        if (a.id === animalId) {
          return {
            ...a,
            vx: 0,
            vy: 0,
            groundY: a.groundY || a.y || 75
          };
        }
        return a;
      });
      return {
        ...prev,
        animals: updated
      };
    });
  };

  const handleAnimalStartDrag = (e: React.MouseEvent | React.TouchEvent, animalId: string, species: AnimalSpecies) => {
    e.stopPropagation();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    pendingAnimalIdRef.current = animalId;
    pendingAnimalSpeciesRef.current = species;
    animalPressStartCoordsRef.current = { x: clientX, y: clientY };
    isAnimalDraggingConfirmedRef.current = false;

    if (animalPressTimerRef.current) clearTimeout(animalPressTimerRef.current);
    animalPressTimerRef.current = setTimeout(() => {
      if (pendingAnimalIdRef.current === animalId) {
        triggerAnimalDragConfirmed(animalId, species);
      }
    }, 220); // 220ms holding threshold to distinguish tapping from holding
  };

  const handlePastureDragMove = (clientX: number, clientY: number, container: HTMLDivElement) => {
    if (!draggedAnimalId) return;

    const rect = container.getBoundingClientRect();
    const fractionX = (clientX - rect.left) / rect.width;
    const fractionY = (clientY - rect.top) / rect.height;

    // Inverse mathematical screen translation
    const internalX = (fractionX * 100 + shiftPercent) / zoomScale;
    const internalY = 100 - ((1 - fractionY) * 100) / zoomScale;

    const constrainedX = Math.max(5, Math.min(95, internalX));
    const constrainedY = Math.max(30, Math.min(84, internalY)); // allow tossing up to the sky

    const now = Date.now();
    const list = lastDragCoordsRef.current;
    list.push({ x: constrainedX, y: constrainedY, t: now });
    if (list.length > 5) {
      list.shift(); // keep last 5 points
    }

    setGameState((prev) => {
      const updated = prev.animals.map((a) => {
        if (a.id === draggedAnimalId) {
          const dx = constrainedX - a.x;
          const dy = constrainedY - a.y;
          draggedDistanceRef.current += Math.abs(dx) + Math.abs(dy);

          return {
            ...a,
            x: constrainedX,
            y: constrainedY,
            vx: dx * 0.98,
            vy: dy * 0.98,
            // Keep original ground under the pasture lawn
            groundY: a.groundY || Math.max(58, Math.min(84, constrainedY))
          };
        }
        return a;
      });
      return {
        ...prev,
        animals: updated
      };
    });
  };

  const handlePastureMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pendingAnimalIdRef.current && !draggedAnimalId) {
      const start = animalPressStartCoordsRef.current;
      if (start) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 9) {
          if (animalPressTimerRef.current) {
            clearTimeout(animalPressTimerRef.current);
            animalPressTimerRef.current = null;
          }
          triggerAnimalDragConfirmed(pendingAnimalIdRef.current, pendingAnimalSpeciesRef.current!);
        }
      }
    }
    if (draggedAnimalId) {
      handlePastureDragMove(e.clientX, e.clientY, e.currentTarget);
    }
  };

  const handlePastureTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (pendingAnimalIdRef.current && !draggedAnimalId && e.touches.length > 0) {
      const start = animalPressStartCoordsRef.current;
      if (start) {
        const dx = e.touches[0].clientX - start.x;
        const dy = e.touches[0].clientY - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 9) {
          if (animalPressTimerRef.current) {
            clearTimeout(animalPressTimerRef.current);
            animalPressTimerRef.current = null;
          }
          triggerAnimalDragConfirmed(pendingAnimalIdRef.current, pendingAnimalSpeciesRef.current!);
        }
      }
    }
    if (draggedAnimalId && e.touches.length > 0) {
      handlePastureDragMove(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
    }
  };

  const handlePastureMouseUp = () => {
    if (animalPressTimerRef.current) {
      clearTimeout(animalPressTimerRef.current);
      animalPressTimerRef.current = null;
    }

    if (pendingAnimalIdRef.current && !isAnimalDraggingConfirmedRef.current) {
      // Simple quiet light click - select & groom animal!
      const animalInstance = gameState.animals.find((a) => a.id === pendingAnimalIdRef.current);
      if (animalInstance) {
        unlockAudio();
        setBoyPosition((p) => ({ ...p, targetX: animalInstance.x, targetY: animalInstance.y, isMoving: true }));
        setSelectedAnimalId(animalInstance.id);
        setSelectedPlotId(null);
        setSelectedTreeId(null);
        const template = ANIMAL_TEMPLATES[animalInstance.species];
        const nameLabel = template.nameRu.split(" ")[0];
        playAnimalClickSound(template.soundType, nameLabel);
        triggerNotification(`🐕 Гладим питомца: ${animalInstance.customName}!`);
      }
    }

    pendingAnimalIdRef.current = null;
    pendingAnimalSpeciesRef.current = null;

    if (draggedAnimalId) {
      const distance = draggedDistanceRef.current;
      const animal = gameState.animals.find((a) => a.id === draggedAnimalId);
      
      const list = lastDragCoordsRef.current;
      let calculatedVx = 0;
      let calculatedVy = 0;
      if (list.length >= 2) {
        const first = list[0];
        const last = list[list.length - 1];
        const dt = Math.max(1, last.t - first.t);
        calculatedVx = ((last.x - first.x) / dt) * 15;
        calculatedVy = ((last.y - first.y) / dt) * 15;
        
        const speed = Math.sqrt(calculatedVx * calculatedVx + calculatedVy * calculatedVy);
        const maxSpeed = 7.0;
        if (speed > maxSpeed) {
          calculatedVx = (calculatedVx / speed) * maxSpeed;
          calculatedVy = (calculatedVy / speed) * maxSpeed;
        }
      }

      setDraggedAnimalId(null);
      justFinishedDraggingRef.current = true;
      setTimeout(() => {
        justFinishedDraggingRef.current = false;
      }, 150);

      setGameState((prev) => {
        const updated = prev.animals.map((a) => {
          if (a.id === draggedAnimalId) {
            return {
              ...a,
              vx: calculatedVx,
              vy: calculatedVy,
              angle: calculatedVx * 4
            };
          }
          return a;
        });
        return {
          ...prev,
          animals: updated
        };
      });
    }
  };

  const buyPlot = (plotId: string) => {
    const cost = PLOT_COSTS[plotId] || 120;
    if (gameState.coins < cost) {
      playSadSound();
      triggerNotification(`😢 Не хватает монеток! Чтобы вспахать Рядок ${plotId.replace("plot", "")}, нужно ${cost} 🪙`);
      return;
    }
    playCoinSound();
    setGameState((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      crops: {
        ...prev.crops,
        [plotId]: { id: plotId, type: "WHEAT", progress: 0, isWatered: false, isDead: false, timeRemaining: 0 }
      }
    }));
    triggerNotification(`🎉 Ура! Куплен новый Рядок ${plotId.replace("plot", "")}! Можно сажать семена.`);
  };

  const getBoyDist = (tgtX: number, tgtY: number) => {
    return Math.sqrt(Math.pow(boyPosition.x - tgtX, 2) + Math.pow(boyPosition.y - tgtY, 2));
  };

  const isBoyNear = (tgtX: number, tgtY: number) => {
    return getBoyDist(tgtX, tgtY) <= 18; // generous touch zone
  };

  // Helper inside click button move trigger
  const moveBoy = (dx: number, dy: number) => {
    setBoyPosition((prev) => {
      const nextX = Math.max(5, Math.min(95, prev.targetX + dx));
      const nextY = Math.max(54, Math.min(86, prev.targetY + dy)); // Constrained on lawn!
      return {
        ...prev,
        targetX: nextX,
        targetY: nextY,
        isMoving: true
      };
    });
  };

  // 1. FEED ANIMAL (using milk or harvested plants)
  const handleFeedAnimal = (id: string) => {
    setGameState((prev) => {
      const animal = prev.animals.find((a) => a.id === id);
      if (!animal) return prev;
      const template = ANIMAL_TEMPLATES[animal.species];

      // Smart product check: if they require MILK, check if they have goat/cow milk too
      const foodItem = template.foodType;
      let hasFood = (prev.inventory[foodItem] || 0) > 0;
      let usedFoodKey = foodItem;

      if (foodItem === "MILK") {
        if ((prev.inventory["MILK"] || 0) > 0) {
          usedFoodKey = "MILK";
          hasFood = true;
        } else if ((prev.inventory["Парное молоко"] || 0) > 0) {
          usedFoodKey = "Парное молоко";
          hasFood = true;
        } else if ((prev.inventory["Козье молоко"] || 0) > 0) {
          usedFoodKey = "Козье молоко";
          hasFood = true;
        }
      }

      if (hasFood) {
        playEatSound();
        const updatedInventory = {
          ...prev.inventory,
          [usedFoodKey]: (prev.inventory[usedFoodKey] || 1) - 1
        };

        const feederLvl = prev.upgrades["autoFeeder"] || 1;
        const autoFeederMultiplier = 1 + (feederLvl - 1) * 0.20;

        const updatedAnimals = prev.animals.map((a) => {
          if (a.id === id) {
            return {
              ...a,
              isFed: true,
              fedTimeRemaining: Math.round(template.productionTime * 2 * autoFeederMultiplier),
              happiness: Math.min(a.happiness + 25, 100)
            };
          }
          return a;
        });

        triggerNotification(`😋 Ты накормил питомца ${animal.customName}! Он радостно кушает.`);
        spawnFloatHeart(animal.x, animal.y, "🍿");

        const stateWithFed = {
          ...prev,
          inventory: updatedInventory,
          animals: updatedAnimals,
          stats: { ...prev.stats, animalsFed: prev.stats.animalsFed + 1 }
        };

        return awardExperience(15, stateWithFed);
      } else {
        playSadSound();
        triggerNotification(`😢 Ой! Нужна еда: ${template.foodNameRu}! Вырасти её на грядках сначала!`);
      }
      return prev;
    });
  };

  // 2. PET ANIMAL
  const handlePetAnimal = (id: string) => {
    playPetSound();
    setGameState((prev) => {
      const brushLvl = prev.upgrades["brushTool"] || 1;
      const brushCareMod = 1.25 * brushLvl; 

      const targetAnimal = prev.animals.find(a => a.id === id);
      if (targetAnimal) {
        spawnFloatHeart(targetAnimal.x, targetAnimal.y, "❤️");
      }

      const updatedAnimals = prev.animals.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            happiness: Math.min(a.happiness + Math.round(15 * brushCareMod), 100),
            cleanliness: 100 
          };
        }
        return a;
      });

      triggerNotification(`🧹 Щекотно! Питомцу нравится ласка и чистка!`);

      const nextState = {
        ...prev,
        animals: updatedAnimals,
        stats: { ...prev.stats, animalsPetted: prev.stats.animalsPetted + 1 }
      };

      return awardExperience(5, nextState);
    });
  };

  // 3. SHEAR sheep specifically
  const handleShearSheep = (id: string) => {
    playShearSound();
    setGameState((prev) => {
      const animal = prev.animals.find((a) => a.id === id);
      if (!animal) return prev;
      const template = ANIMAL_TEMPLATES[animal.species];

      const productKey = template.productName;
      const updatedInventory = {
        ...prev.inventory,
        [productKey]: (prev.inventory[productKey] || 0) + 1
      };

      const updatedAnimals = prev.animals.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            productionProgress: 0,
            isSheared: true,
            regrowWoolTimeRemaining: 30, // 30 seconds bald sheep
            happiness: Math.max(a.happiness - 10, 30) 
          };
        }
        return a;
      });

      triggerNotification(`✂️ Опочки! Овечка ${animal.customName} пострижена! Какая она забавно розовая и лысая!`);
      spawnFloatHeart(animal.x, animal.y, "🧶");

      const nextState = {
        ...prev,
        inventory: updatedInventory,
        animals: updatedAnimals,
        stats: { ...prev.stats, productsCollected: prev.stats.productsCollected + 1 }
      };

      return awardExperience(35, nextState);
    });
  };

  // 4. MILK goat/cow
  const handleMilkAnimal = (id: string) => {
    playCoinSound();
    setGameState((prev) => {
      const animal = prev.animals.find((a) => a.id === id);
      if (!animal) return prev;
      const template = ANIMAL_TEMPLATES[animal.species];

      const productKey = template.productName;
      const updatedInventory = {
        ...prev.inventory,
        [productKey]: (prev.inventory[productKey] || 0) + 1
      };

      const updatedAnimals = prev.animals.map((a) => {
        if (a.id === id) {
          return { ...a, productionProgress: 0 };
        }
        return a;
      });

      triggerNotification(`🥛 Буль-буль! Получено свежее молоко от ${animal.customName}!`);
      spawnFloatHeart(animal.x, animal.y, "🥛");

      const nextState = {
        ...prev,
        inventory: updatedInventory,
        animals: updatedAnimals,
        stats: { ...prev.stats, productsCollected: prev.stats.productsCollected + 1 }
      };

      return awardExperience(30, nextState);
    });
  };

  // 5. GATHER product for general birds or pig truffles
  const handleCollectProduct = (id: string) => {
    playCoinSound();
    setGameState((prev) => {
      const animal = prev.animals.find((a) => a.id === id);
      if (!animal) return prev;
      const template = ANIMAL_TEMPLATES[animal.species];

      const productKey = template.productName;
      const updatedInventory = {
        ...prev.inventory,
        [productKey]: (prev.inventory[productKey] || 0) + 1
      };

      const updatedAnimals = prev.animals.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            productionProgress: 0,
            happiness: Math.min(a.happiness + 10, 100)
          };
        }
        return a;
      });

      triggerNotification(`✨ Получен подарок: ${template.productIcon} ${template.productName} от ${animal.customName}!`);
      spawnFloatHeart(animal.x, animal.y, template.productIcon);

      const nextState = {
        ...prev,
        inventory: updatedInventory,
        animals: updatedAnimals,
        stats: { ...prev.stats, productsCollected: prev.stats.productsCollected + 1 }
      };

      return awardExperience(25, nextState);
    });
  };

  // Buy seeds and plant crop directly
  const handleBuyAndPlantCrop = (plotId: string, type: CropType) => {
    setGameState((prev) => {
      const config = CROPS_CONFIG[type];
      if (prev.coins < config.seedCost) {
        playSadSound();
        triggerNotification(`😢 Не хватает монет на семена! Нужно ${config.seedCost}м.`);
        return prev;
      }

      playPlantSound();
      const newCoins = prev.coins - config.seedCost;
      const updatedCrops = {
        ...prev.crops,
        [plotId]: {
          id: plotId,
          type,
          progress: 5, 
          isWatered: false,
          isDead: false,
          timeRemaining: config.growTime
        }
      };

      const coords = getPlotsCoords(plotId);
      spawnFloatHeart(coords.x, coords.y, "🌱");
      triggerNotification(`🌱 Посажена ${config.nameRu}! Полей её чистой водичкой!`);

      return {
        ...prev,
        coins: newCoins,
        crops: updatedCrops
      };
    });
  };

  // Water crop plot
  const handleWaterCrop = (plotId: string) => {
    playWaterSound();
    setGameState((prev) => {
      const crops = { ...prev.crops };
      if (crops[plotId]) {
        crops[plotId].isWatered = true;
      }
      const coords = getPlotsCoords(plotId);
      spawnFloatHeart(coords.x, coords.y, "💧");
      triggerNotification(`💧 Грядка полита водой! Растет сочно и весело!`);
      return {
        ...prev,
        crops
      };
    });
  };

  // Harvest ripe crop
  const handleHarvestCrop = (plotId: string) => {
    playCoinSound();
    setGameState((prev) => {
      const crop = prev.crops[plotId];
      if (!crop || crop.progress < 100) return prev;

      const config = CROPS_CONFIG[crop.type];
      const yieldCount = config.yieldCount;

      const finalInventory = { ...prev.inventory };
      finalInventory[crop.type] = (finalInventory[crop.type] || 0) + yieldCount;
      // bonus free seed for easy loop!
      finalInventory[`${crop.type}_SEED`] = (finalInventory[`${crop.type}_SEED`] || 0) + 1;

      const updatedCrops = {
        ...prev.crops,
        [plotId]: { id: plotId, type: "WHEAT", progress: 0, isWatered: false, isDead: false, timeRemaining: 0 }
      };

      const coords = getPlotsCoords(plotId);
      spawnFloatHeart(coords.x, coords.y, config.icon);
      triggerNotification(`🌾 Собрано: ${config.icon} ${yieldCount} шт.! Даны новые семена бесплатно.`);

      const nextState = {
        ...prev,
        crops: updatedCrops,
        inventory: finalInventory,
        stats: { ...prev.stats, cropsHarvested: prev.stats.cropsHarvested + yieldCount }
      };

      return awardExperience(15, nextState);
    });
  };

  // Plant a tree
  const handleBuyTreeOrUpgrade = (plotId: string, type: TreeType) => {
    setGameState((prev) => {
      const config = TREES_CONFIG[type];
      if (prev.coins < config.cost) {
        playSadSound();
        triggerNotification(`😢 Не хватает ${config.cost - prev.coins} монет на дерево.`);
        return prev;
      }

      playPlantSound();
      const newCoins = prev.coins - config.cost;
      const updatedTrees = {
        ...prev.trees,
        [plotId]: {
          id: plotId,
          type,
          fruitProgress: 0,
          fruitCount: 0,
          timeRemaining: config.growTime
        }
      };

      const coords = getTreeCoords(plotId);
      spawnFloatHeart(coords.x, coords.y, "🌳");
      triggerNotification(`🌳 Посажено дерево: ${config.nameRu}!`);

      return {
        ...prev,
        coins: newCoins,
        trees: updatedTrees
      };
    });
  };

  // Harvest hanging orchard fruit
  const handleHarvestTree = (plotId: string) => {
    playCoinSound();
    setGameState((prev) => {
      const tree = prev.trees[plotId];
      if (!tree || tree.fruitCount <= 0) return prev;

      const config = TREES_CONFIG[tree.type];
      const harvestedCount = tree.fruitCount;

      const updatedInventory = {
        ...prev.inventory,
        [tree.type]: (prev.inventory[tree.type] || 0) + harvestedCount
      };

      const updatedTrees = {
        ...prev.trees,
        [plotId]: {
          ...tree,
          fruitCount: 0,
          fruitProgress: 0
        }
      };

      const coords = getTreeCoords(plotId);
      spawnFloatHeart(coords.x, coords.y, config.icon);
      triggerNotification(`🍎 Стрясли плоды! Собрано ${harvestedCount} шт. сочных яблок/вишен!`);

      const nextState = {
        ...prev,
        inventory: updatedInventory,
        trees: updatedTrees,
        stats: { ...prev.stats, productsCollected: prev.stats.productsCollected + harvestedCount }
      };

      return awardExperience(20, nextState);
    });
  };

  // Buy new animal
  const handleBuyAnimal = (species: AnimalSpecies) => {
    const template = ANIMAL_TEMPLATES[species];
    if (gameState.coins < template.cost) {
      playSadSound();
      triggerNotification(`😢 Не хватает монеток! Эта зверушка стоит ${template.cost} золотых.`);
      return;
    }

    // Limit check per active zone based on player level: min(10, level * 2)
    const animalsInCurrentZone = gameState.animals.filter(a => (a.locationId || "MEADOW") === activeZone).length;
    const maxAllowed = Math.min(10, 2 * gameState.level);
    if (animalsInCurrentZone >= maxAllowed) {
      playSadSound();
      triggerNotification(`⚠️ Достигнут лимит! На Уровне ${gameState.level} можно держать до ${maxAllowed} животных на одной локации (максимум 10).`);
      return;
    }

    playAnimalSound(template.soundType);
    setGameState((prev) => {
      const freshId = `animal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const randomX = Math.round(20 + Math.random() * 60);
      const randomY = Math.round(58 + Math.random() * 26); // Strictly on lawn grass!

      const newAnimal: AnimalInstance = {
        id: freshId,
        species,
        customName: `${template.nameRu.split(" ")[0]} ${prev.animals.length + 1}`,
        isFed: false,
        fedTimeRemaining: 0,
        productionProgress: 0,
        happiness: 80,
        cleanliness: 90,
        x: randomX,
        y: randomY,
        scaleX: 1,
        locationId: activeZone
      };

      triggerNotification(`🐣 Ура! Куплен ${template.nameRu}! Он гуляет по нашей ферме!`);
      spawnFloatHeart(50, 50, template.emoji);

      return {
        ...prev,
        coins: prev.coins - template.cost,
        animals: [...prev.animals, newAnimal]
      };
    });
  };

  // Sell animal back
  const handleSellAnimal = (id: string) => {
    setGameState((prev) => {
      const animal = prev.animals.find((a) => a.id === id);
      if (!animal) return prev;
      const template = ANIMAL_TEMPLATES[animal.species];

      const refund = Math.floor(template.cost / 2);
      const updatedAnimals = prev.animals.filter((a) => a.id !== id);

      if (selectedAnimalId === id) {
        setSelectedAnimalId(null);
      }

      triggerNotification(`🍂 ${animal.customName} ушел гулять на новые поля. Получено +${refund} монет.`);

      return {
        ...prev,
        coins: prev.coins + refund,
        animals: updatedAnimals
      };
    });
  };

  // Upgrade skills
  const handleUpgradeFarm = (upgradeId: string) => {
    const upgrade = UPGRADES[upgradeId];
    const currentLvl = gameState.upgrades[upgradeId] || 1;
    const cost = upgrade.cost * currentLvl;

    if (gameState.coins < cost) {
      playSadSound();
      triggerNotification(`😢 Не хватает золотых на этот навык!`);
      return;
    }

    playCoinSound();
    setGameState((prev) => {
      const updatedUpgrades = {
        ...prev.upgrades,
        [upgradeId]: currentLvl + 1
      };

      triggerNotification(`🪄 Класс! Твой навык «${upgrade.nameRu}» улучшен до уровня ${currentLvl + 1}!`);
      return {
        ...prev,
        coins: prev.coins - cost,
        upgrades: updatedUpgrades
      };
    });
  };

  // Buy and build structures
  const handleBuyBuilding = (locId: string, bldId: string, cost: number, minLevel: number) => {
    if (gameState.coins < cost) {
      playSadSound();
      triggerNotification("⚠️ Ой! Не хватает монет для этой постройки.");
      return;
    }
    if (gameState.level < minLevel) {
      playSadSound();
      triggerNotification(`⚠️ Требуется уровень ${minLevel}, чтобы разблокировать чертежи!`);
      return;
    }

    playCoinSound();
    setGameState((prev) => {
      const prevBlds = prev.buildings || {};
      const locBlds = prevBlds[locId] || [];
      if (locBlds.includes(bldId)) return prev;

      const updatedBlds = {
        ...prevBlds,
        [locId]: [...locBlds, bldId]
      };

      triggerNotification(`🏗️ Строительство завершено! Открыто прекрасное здание! (+35 опыта)`);
      return {
        ...prev,
        coins: prev.coins - cost,
        buildings: updatedBlds,
        experience: prev.experience + 35
      };
    });
  };

  // Buy and unlock locations
  const handleUnlocks = (locId: LocationId, cost: number, minLvl: number) => {
    if (gameState.level < minLvl) {
      playSadSound();
      triggerNotification(`🔒 Ой! Нужен уровень ${minLvl}, вырасти ещё грядки!`);
      return;
    }

    if (gameState.coins < cost) {
      playSadSound();
      triggerNotification(`😢 Нужно ${cost} золотых, накопи ещё чуть-чуть!`);
      return;
    }

    playCoinSound();
    setGameState((prev) => {
      const updatedUnlocks = [...prev.unlockedLocations, locId];
      triggerNotification(`🗺️ Чудо! Локация "${LOCATIONS[locId].nameRu}" теперь разблокирована!`);
      return {
        ...prev,
        coins: prev.coins - cost,
        unlockedLocations: updatedUnlocks
      };
    });
  };

  // Sell single product group
  const handleSellProductGroup = (key: string, count: number) => {
    if (count <= 0) return;
    playCoinSound();
    setGameState((prev) => {
      let basePrice = 10;
      if (key === "WHEAT") basePrice = 8;
      else if (key === "CARROT") basePrice = 18;
      else if (key === "CLOVER") basePrice = 32;
      else if (key === "CABBAGE") basePrice = 50;
      else if (key === "APPLE") basePrice = 50;
      else if (key === "CHERRY") basePrice = 80;
      else {
        const found = Object.values(ANIMAL_TEMPLATES).find(t => t.productName === key);
        if (found) basePrice = found.productPrice;
      }

      const marketLvl = prev.upgrades["marketContract"] || 1;
      const finalPrice = Math.round(basePrice * (1 + (marketLvl - 1) * 0.10));
      const goldEarned = finalPrice * count;

      const updatedInventory = { ...prev.inventory, [key]: 0 };

      triggerNotification(`💰 Купец Семен забрал весь товар "${key}" за ${goldEarned} монет!`);

      return {
        ...prev,
        coins: prev.coins + goldEarned,
        inventory: updatedInventory,
        stats: { ...prev.stats, totalCoinsEarned: prev.stats.totalCoinsEarned + goldEarned }
      };
    });
  };

  // Sell ALL crops & animal products instantly
  const handleSellAllProducts = () => {
    playCoinSound();
    setGameState((prev) => {
      let totalEarned = 0;
      const updatedInventory = { ...prev.inventory };

      Object.keys(updatedInventory).forEach((key) => {
        if (key.endsWith("_SEED")) return; // save seeds
        const count = updatedInventory[key];
        if (count > 0) {
          let basePrice = 10;
          if (key === "WHEAT") basePrice = 8;
          else if (key === "CARROT") basePrice = 18;
          else if (key === "CLOVER") basePrice = 32;
          else if (key === "CABBAGE") basePrice = 50;
          else if (key === "APPLE") basePrice = 50;
          else if (key === "CHERRY") basePrice = 80;
          else {
            const found = Object.values(ANIMAL_TEMPLATES).find(t => t.productName === key);
            if (found) basePrice = found.productPrice;
          }

          const marketLvl = prev.upgrades["marketContract"] || 1;
          const finalPrice = Math.round(basePrice * (1 + (marketLvl - 1) * 0.10));
          totalEarned += finalPrice * count;
          updatedInventory[key] = 0;
        }
      });

      if (totalEarned === 0) {
        triggerNotification("🎒 У тебя пусто! Продавать пока нечего.");
        return prev;
      }

      triggerNotification(`💰 Потрясающе! Продано всего добра на сумму ${totalEarned} монет! 🪙`);
      spawnFloatHeart(20, 40, "🪙");

      return {
        ...prev,
        coins: prev.coins + totalEarned,
        inventory: updatedInventory,
        stats: { ...prev.stats, totalCoinsEarned: prev.stats.totalCoinsEarned + totalEarned }
      };
    });
  };

  const spawnFloatHeart = (xPercentage: number, yPercentage: number, emoji: string = "❤️") => {
    const fId = Date.now() + Math.random();
    setFloatingHearts((prev) => [...prev, { id: fId, x: xPercentage, y: yPercentage, emoji }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== fId));
    }, 1100);
  };

  const handlePastureTape = (e: React.MouseEvent<HTMLDivElement>) => {
    // If we are actively dragging/re-placing or just finished throwing, do not move the boy!
    if (draggedAnimalId || justFinishedDraggingRef.current) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const fractionX = (e.clientX - rect.left) / rect.width;
    const fractionY = (e.clientY - rect.top) / rect.height;

    // Inverse mathematical screen translation matching zoom scale
    const clickX = (fractionX * 100 + shiftPercent) / zoomScale;
    const clickY = 100 - ((1 - fractionY) * 100) / zoomScale;

    const constrainedX = Math.max(5, Math.min(95, clickX));
    const constrainedY = Math.max(54, Math.min(86, clickY)); // Player click bounds constrained to grass!

    // Reset floating details unless we specifically touched an item
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest(".interactive-element")) {
      return; // let element click handle selection
    }

    setBoyPosition((prev) => ({
      ...prev,
      targetX: constrainedX,
      targetY: constrainedY,
      isMoving: true
    }));

    setSelectedAnimalId(null);
    setSelectedPlotId(null);
    setSelectedTreeId(null);
  };

  // Get active subsets of animal species currently hanging out on selected location tab
  const getAnimalsInZone = (zone: LocationId) => {
    return gameState.animals.filter((animal) => {
      const sp = animal.species;
      if (zone === "MEADOW") {
        return [AnimalSpecies.CHICKEN, AnimalSpecies.DUCK].includes(sp);
      }
      if (zone === "BARNYARD") {
        return [AnimalSpecies.COW, AnimalSpecies.BULL, AnimalSpecies.PIG, AnimalSpecies.HORSE, AnimalSpecies.DONKEY, AnimalSpecies.GOAT, AnimalSpecies.SHEEP, AnimalSpecies.DOG].includes(sp);
      }
      if (zone === "LAKESIDE") {
        return [AnimalSpecies.DUCK, AnimalSpecies.GOOSE, AnimalSpecies.GOAT, AnimalSpecies.SHEEP, AnimalSpecies.COW, AnimalSpecies.CAT].includes(sp);
      }
      if (zone === "ORCHARD") {
        return [AnimalSpecies.HORSE, AnimalSpecies.DONKEY, AnimalSpecies.RABBIT, AnimalSpecies.CAT, AnimalSpecies.DOG, AnimalSpecies.SHEEP, AnimalSpecies.CHICKEN].includes(sp);
      }
      if (zone === "DESERT") {
        return [AnimalSpecies.T_REX, AnimalSpecies.TRICERATOPS, AnimalSpecies.PTERODACTYL, AnimalSpecies.DIPLODOCUS, AnimalSpecies.DONKEY, AnimalSpecies.GOAT].includes(sp);
      }
      if (zone === "FOREST") {
        return [AnimalSpecies.RABBIT, AnimalSpecies.SHEEP, AnimalSpecies.PIG, AnimalSpecies.CAT, AnimalSpecies.DOG, AnimalSpecies.T_REX, AnimalSpecies.DIPLODOCUS].includes(sp);
      }
      if (zone === "LAKE") {
        return [AnimalSpecies.DUCK, AnimalSpecies.GOOSE, AnimalSpecies.CAT, AnimalSpecies.SHEEP].includes(sp);
      }
      return true;
    });
  };

  const renderVectorCrop = (cropType: CropType, progress: number) => {
    const isRipe = progress >= 100;
    
    if (cropType === "WHEAT") {
      if (isRipe) {
        return (
          <svg viewBox="0 0 40 40" className="w-12 h-12 filter drop-shadow">
            <path d="M 20 40 Q 20 20 12 8" stroke="#EAB308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 20 40 Q 24 20 28 8" stroke="#EAB308" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 20 40 Q 20 15 20 4" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            
            <circle cx="12" cy="8" r="3.5" fill="#F59E0B" />
            <circle cx="28" cy="8" r="3.5" fill="#F59E0B" />
            <circle cx="20" cy="4" r="3" fill="#EAB308" />
            <circle cx="14" cy="14" r="3" fill="#EAB308" />
            <circle cx="26" cy="14" r="3" fill="#EAB308" />
            <circle cx="16" cy="20" r="3" fill="#F59E0B" />
            <circle cx="24" cy="20" r="3" fill="#F59E0B" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 40 40" className="w-10 h-10 animate-pulse">
          <path d="M 20 40 Q 15 25 10 22" stroke="#22C55E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 20 40 Q 25 25 30 22" stroke="#22C55E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 20 40 Q 20 20 20 16" stroke="#10B981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    }

    if (cropType === "CARROT") {
      if (isRipe) {
        return (
          <svg viewBox="0 0 40 40" className="w-12 h-12 filter drop-shadow">
            <ellipse cx="20" cy="30" rx="14" ry="4" fill="#4B3423" />
            <path d="M 12 28 C 12 24, 28 24, 28 28 L 20 41 Z" fill="#F97316" stroke="#712F12" strokeWidth="1" />
            <line x1="15" y1="31" x2="19" y2="31" stroke="#EA580C" strokeWidth="1.5" />
            <line x1="18" y1="35" x2="22" y2="35" stroke="#EA580C" strokeWidth="1.5" />
            <path d="M 20 26 Q 10 10 8 13" stroke="#15803D" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 20 26 Q 20 6 20 10" stroke="#16A34A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 20 26 Q 30 10 32 13" stroke="#15803D" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 40 40" className="w-10 h-10 animate-pulse">
          <path d="M 20 40 Q 20 20 12 18" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 20 40 Q 23 16 30 18" stroke="#15803D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    }

    if (cropType === "CLOVER") {
      if (isRipe) {
        return (
          <svg viewBox="0 0 40 40" className="w-12 h-12 filter drop-shadow">
            <path d="M 20 38 Q 20 28 15 28" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="14" cy="22" r="6" fill="#22C55E" />
            <circle cx="26" cy="22" r="6" fill="#22C55E" />
            <circle cx="20" cy="13" r="6.5" fill="#15803D" />
            <path d="M 14 22 C 14 20, 20 14, 20 22 Z" fill="#4ADE80" opacity="0.4" />
            <circle cx="30" cy="14" r="2.2" fill="#FACC15" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 40 40" className="w-10 h-10 animate-pulse">
          <circle cx="16" cy="28" r="3" fill="#4ADE80" />
          <circle cx="24" cy="28" r="3" fill="#4ADE80" />
          <path d="M 20 40 L 20 30" stroke="#16A34A" strokeWidth="2" />
        </svg>
      );
    }

    if (cropType === "CABBAGE") {
      if (isRipe) {
        return (
          <svg viewBox="0 0 40 40" className="w-12 h-12 filter drop-shadow">
            <circle cx="20" cy="25" r="14" fill="#15803D" />
            <circle cx="11" cy="24" r="10" fill="#16A34A" />
            <circle cx="29" cy="24" r="10" fill="#16A34A" />
            <circle cx="20" cy="25" r="9" fill="#22C55E" />
            <path d="M 12 21 Q 20 29 28 21" stroke="#86EFAC" strokeWidth="1.5" fill="none" opacity="0.6" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 40 40" className="w-10 h-10 animate-pulse">
          <circle cx="20" cy="32" r="5" fill="#16A34A" />
          <path d="M 13 32 Q 20 37 27 32" stroke="#22C55E" strokeWidth="2.5" fill="none" />
        </svg>
      );
    }

    if (cropType === "RASPBERRY_BUSH") {
      if (isRipe) {
        return (
          <svg viewBox="0 0 40 40" className="w-12 h-12 filter drop-shadow">
            {/* Round leafy base */}
            <circle cx="20" cy="24" r="12" fill="#166534" />
            <circle cx="12" cy="20" r="8" fill="#15803D" />
            <circle cx="28" cy="20" r="8" fill="#15803D" />
            <circle cx="20" cy="14" r="9" fill="#22C55E" />
            {/* Red Raspberries */}
            <circle cx="14" cy="18" r="3" fill="#DC2626" />
            <circle cx="26" cy="16" r="3.2" fill="#EF4444" />
            <circle cx="20" cy="11" r="3" fill="#B91C1C" />
            <circle cx="18" cy="22" r="3" fill="#EF4444" />
            <circle cx="23" cy="25" r="3.1" fill="#DC2626" />
            <circle cx="10" cy="24" r="2.5" fill="#B91C1C" />
            <circle cx="30" cy="23" r="2.5" fill="#EF4444" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 40 40" className="w-10 h-10 animate-pulse">
          <circle cx="20" cy="30" r="7" fill="#15803D" />
          <circle cx="15" cy="27" r="5" fill="#166534" />
          <circle cx="25" cy="27" r="5" fill="#166534" />
          <path d="M 20 23 L 20 18" stroke="#10B981" strokeWidth="2" />
        </svg>
      );
    }

    if (cropType === "BLUEBERRY_BUSH") {
      if (isRipe) {
        return (
          <svg viewBox="0 0 40 40" className="w-12 h-12 filter drop-shadow">
            {/* Round deep leafy base */}
            <circle cx="20" cy="24" r="12" fill="#065F46" />
            <circle cx="11" cy="20" r="8" fill="#0F766E" />
            <circle cx="29" cy="20" r="8" fill="#0F766E" />
            <circle cx="20" cy="14" r="9" fill="#115E59" />
            {/* Blueberries - dark blue, royal blue and sapphire */}
            <circle cx="13" cy="18" r="3.2" fill="#10B981" /> {/* leaf highlight */}
            <circle cx="27" cy="17" r="3" fill="#2563EB" />
            <circle cx="20" cy="11" r="3.1" fill="#1E40AF" />
            <circle cx="17" cy="22" r="3.2" fill="#3B82F6" />
            <circle cx="24" cy="25" r="2.8" fill="#1D4ED8" />
            <circle cx="9" cy="23" r="2.6" fill="#1E3A8A" />
            <circle cx="30" cy="22" r="2.8" fill="#2563EB" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 40 40" className="w-10 h-10 animate-pulse">
          <circle cx="20" cy="30" r="7" fill="#0D9488" />
          <circle cx="14" cy="28" r="5" fill="#065F46" />
          <circle cx="26" cy="28" r="5" fill="#065F46" />
          <circle cx="20" cy="22" r="2.2" fill="#2563EB" />
        </svg>
      );
    }
    
    return <span className="text-3xl">🌱</span>;
  };

  const activeAnimalsList = getAnimalsInZone(activeZone);
  const isNearMerchant = isBoyNear(merchantCoords.x, merchantCoords.y);

  const onSelectZoneWithLock = (locId: LocationId) => {
    const loc = LOCATIONS[locId];
    const isUnlocked = gameState.unlockedLocations.includes(locId);
    if (isUnlocked) {
      playClickSound();
      setActiveZone(locId);
      setBoyPosition({ x: 50, y: 70, targetX: 50, targetY: 70, isMoving: false, dir: "right" });
      setSelectedAnimalId(null);
      setSelectedPlotId(null);
      setSelectedTreeId(null);
      triggerNotification(`🚪 Переместились в: ${loc.nameRu}!`);
    } else {
      playSadSound();
      triggerNotification(`🔒 Ой! Эта локация закрыта. Разблокируйте её на рынке за ${loc.unlockCost} монет на Уровне ${loc.minLevel}!`);
      setShopActiveTab("lands");
      setShowShopModal(true);
    }
  };

  const handleNextZone = () => {
    const nextIndex = (currentZoneIndex + 1) % ZONES_ORDER.length;
    onSelectZoneWithLock(ZONES_ORDER[nextIndex]);
  };

  const handlePrevZone = () => {
    const prevIndex = (currentZoneIndex - 1 + ZONES_ORDER.length) % ZONES_ORDER.length;
    onSelectZoneWithLock(ZONES_ORDER[prevIndex]);
  };

  // Core objects positions
  const plotCoordsMap = {
    plot1: getPlotsCoords("plot1"),
    plot2: getPlotsCoords("plot2"),
    plot3: getPlotsCoords("plot3"),
    plot4: getPlotsCoords("plot4")
  };

  const treeCoordsMap = {
    treePlot1: getTreeCoords("treePlot1"),
    treePlot2: getTreeCoords("treePlot2")
  };

  const dp = gameState.dayProgress ?? 0;
  const isMorning = dp >= 0 && dp < 48;
  const isDay = dp >= 48 && dp < 144;
  const isEvening = dp >= 144 && dp < 192;
  const isNight = dp >= 192 && dp <= 240;

  return (
    <div
      className={`min-h-[100dvh] bg-[#FFFEEF] flex flex-col font-sans transition-all duration-500 overflow-x-hidden ${
        isPhone ? "pb-0" : "pb-12"
      }`}
      id="root-viewport-game"
    >
      {/* HUD Header bar has been integrated directly "above the sky" inside the pasture viewport below! */}

      <main className="w-full max-w-none mt-0 flex flex-col gap-0 sm:gap-4 animate-fade-in flex-1" id="main-farm-container">
        
        {/* WALKING WORLD VIEWPORT CANVAS - FULL BLEED RESIZING FOR ALL SCREENS */}
        <div className="relative w-full shadow-lg flex-1" id="playground-viewport-wrapper">
          <div
            onClick={handlePastureTape}
            onMouseMove={handlePastureMouseMove}
            onMouseUp={handlePastureMouseUp}
            onMouseLeave={handlePastureMouseUp}
            onTouchMove={handlePastureTouchMove}
            onTouchEnd={handlePastureMouseUp}
            onTouchCancel={handlePastureMouseUp}
            style={{
                height: `${viewportHeightPx}px`,
                transition: "height 280ms ease-out",
              }}
            className={`w-full rounded-none sm:rounded-3xl relative overflow-hidden transition-[background-color,box-shadow] duration-[1000ms] select-none touch-none ${
              isPhone ? "max-h-[100dvh]" : ""
            } ${
              isNight
                ? "bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#2E1065]"
                : "bg-gradient-to-b from-sky-400 to-sky-300"
            }`}
            id="scenic-pasture"
          >
            {/* FLOATING HEADER INTEGRATED DIRECTLY "ABOVE THE SKY" */}
            <GameHeader
              coins={gameState.coins}
              level={gameState.level}
              experience={gameState.experience}
              activeLocationId={activeZone}
              unlockedLocationIds={gameState.unlockedLocations}
              onSelectLocation={onSelectZoneWithLock}
              onOpenHelp={() => setShowHelp(true)}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              day={gameState.day}
              dayProgress={gameState.dayProgress}
            />



            {/* STAGE CONTAINER WITH SMOOTH PERSPECTIVE SCROLLING */}
            <div
              id="scrolling-stage"
              className="absolute inset-0 select-none"
              style={{
                transform: `scale(${zoomScale}) translateX(${-shiftPercent / zoomScale}%)`,
                transformOrigin: "left bottom",
                width: "100%",
                height: "100%",
                transition: "transform 220ms cubic-bezier(0.25, 0.8, 0.25, 1)"
              }}
            >
              {/* 1. SKY CELESTIAL BODIES & LARGE LAYERED DRIFTING CLOUDS */}
              <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden" id="dynamic-sky-layer">
                {isNight ? (
                  <>
                    {/* Glowing crescent moon (placed nicely below floating header) */}
                    <div className="absolute top-28 left-[18%] w-16 h-16 rounded-full bg-amber-100 shadow-[0_0_20px_rgba(251,243,219,0.5)] flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#1E1B4B] absolute -top-1 -left-2" />
                    </div>
                    {/* Twinkling mini stars */}
                    <div className="absolute top-24 left-[8%] animate-ping text-white text-[10px] opacity-70">✨</div>
                    <div className="absolute top-[35%] left-[48%] animate-ping text-yellow-200 text-xs opacity-80" style={{ animationDelay: '1s' }}>✨</div>
                    <div className="absolute top-24 right-[12%] animate-ping text-white text-[9px] opacity-60" style={{ animationDelay: '2s' }}>✨</div>
                    <div className="absolute top-[40%] right-[38%] animate-ping text-amber-200 text-xs opacity-70" style={{ animationDelay: '1.5s' }}>✨</div>
                  </>
                ) : (
                  <>
                    {/* Happy rising sun (sun sits beautiful and low in the tall sky) */}
                    <div className="absolute top-[20%] left-[12%] w-16 h-16 rounded-full bg-yellow-400 border-4 border-yellow-300 shadow-[0_0_35px_rgba(250,204,21,0.6)]" />
                    
                    {/* Sunny animated clouds with drifting classes! */}
                    <div className="absolute top-[18%] left-[24%] w-24 h-9 bg-white/40 rounded-full blur-[0.5px] animate-drift-cloud-1" />
                    <div className="absolute top-[28%] left-[50%] w-36 h-11 bg-white/60 rounded-full animate-drift-cloud-2" />
                  </>
                )}
                {/* Layered clouds visible in both Day and Night */}
                <div className="absolute top-[14%] right-[15%] w-28 h-9 bg-white/30 rounded-full animate-drift-cloud-1" style={{ animationDelay: '-5s' }} />
                <div className="absolute top-[22%] left-[8%] w-20 h-7 bg-white/20 rounded-full animate-drift-cloud-2" style={{ animationDelay: '-12s' }} />
                <div className="absolute top-[26%] right-[32%] w-32 h-10 bg-white/45 rounded-full animate-drift-cloud-1" style={{ animationDelay: '-8s' }} />
                <div className="absolute top-24 right-[5%] w-24 h-8 bg-white/25 rounded-full animate-drift-cloud-2" style={{ animationDelay: '-3s' }} />
              </div>

            {/* 2. OVERLAPPING GREEN HILLS (vector style) */}
            <div className="absolute inset-x-0 bottom-[36px] h-64 z-0 pointer-events-none select-none overflow-hidden">
              {/* Far Hills (Layer 1) - Darker/Cooler green */}
              <div className={`absolute -bottom-8 -left-12 w-[60%] h-[180px] rounded-t-[140px] opacity-75 ${
                activeZone === "MEADOW" ? "bg-emerald-800/40" :
                activeZone === "BARNYARD" ? "bg-amber-900/30" :
                activeZone === "LAKESIDE" ? "bg-sky-800/30" :
                "bg-[#115E59]/45"
              }`} />
              <div className={`absolute -bottom-12 -right-16 w-[65%] h-[200px] rounded-t-[160px] opacity-70 ${
                activeZone === "MEADOW" ? "bg-emerald-800/30" :
                activeZone === "BARNYARD" ? "bg-amber-900/25" :
                activeZone === "LAKESIDE" ? "bg-sky-800/25" :
                "bg-[#115E59]/35"
              }`} />

              {/* Mid Hills (Layer 2) - Medium green */}
              <div className={`absolute -bottom-6 left-[20%] w-[55%] h-[130px] rounded-t-[120px] shadow-sm opacity-90 ${
                activeZone === "MEADOW" ? "bg-[#059669]/60" :
                activeZone === "BARNYARD" ? "bg-[#B45309]/50" :
                activeZone === "LAKESIDE" ? "bg-[#0284C7]/50" :
                "bg-[#0D9488]/70"
              }`} />
              <div className={`absolute -bottom-8 left-[-10%] w-[45%] h-[140px] rounded-t-[110px] shadow-sm opacity-90 ${
                activeZone === "MEADOW" ? "bg-[#059669]/55" :
                activeZone === "BARNYARD" ? "bg-[#B45309]/45" :
                activeZone === "LAKESIDE" ? "bg-[#0284C7]/45" :
                "bg-[#0D9488]/65"
              }`} />
            </div>

            {/* 3. MULTI-POST WOODEN FENCE (behind character/cabin) */}
            <div className="absolute inset-x-0 top-[54%] -translate-y-[26px] h-[36px] z-0 pointer-events-none select-none flex justify-between px-2" id="fence-midground">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div key={idx} className="relative flex items-end">
                  {/* Vertical Post */}
                  <div className="w-3 h-[34px] bg-gradient-to-r from-[#78350F] to-[#5C3A21] rounded-t-sm shadow-md border-r-2 border-stone-900/20" />
                  {/* Metal bracket on post */}
                  <div className="absolute top-2 left-0.5 w-2 h-2 rounded-full bg-slate-400" />
                  {/* Connecting horizontal rail */}
                  {idx < 11 && (
                    <div className="absolute bottom-5 left-1 w-[90px] h-2.5 bg-[#5C3A21] border-b-2 border-stone-900/35" style={{ minWidth: '95px' }} />
                  )}
                  {idx < 11 && (
                    <div className="absolute bottom-1 left-1 w-[90px] h-2.5 bg-[#5C3A21] border-b-2 border-stone-900/35" style={{ minWidth: '95px' }} />
                  )}
                </div>
              ))}
            </div>

            {/* 4. WALKING LAWN RUNNING SURFACE (Elevated relative to top-[54%] so sky-walking is physically impossible) */}
            <div className={`absolute inset-x-0 bottom-0 top-[54%] z-0 shadow-inner overflow-hidden ${
              activeZone === "MEADOW" ? "bg-gradient-to-t from-emerald-600 via-green-500 to-[#10B981]" :
              activeZone === "BARNYARD" ? "bg-gradient-to-t from-[#B45309] via-amber-600 to-[#F59E0B]" :
              activeZone === "LAKESIDE" ? "bg-gradient-to-t from-sky-400 via-emerald-500 to-green-500" :
              "bg-gradient-to-t from-[#0F766E] via-emerald-600 to-[#2DD4BF]"
            }`} id="lawn-grass">
              {/* Stepping Path Stones */}
              <div className="absolute inset-x-0 bottom-10 h-12 pointer-events-none select-none flex justify-around opacity-40 px-8">
                <div className="w-10 h-3 bg-stone-300 rounded-full" />
                <div className="w-7 h-2 bg-stone-400 rounded-full mt-2" />
                <div className="w-12 h-3 bg-stone-300 rounded-full mt-1" />
                <div className="w-8 h-2 bg-stone-400 rounded-full mt-4" />
                <div className="w-11 h-3 bg-stone-300 rounded-full mt-2" />
                <div className="w-6 h-2 bg-stone-500 rounded-full" />
              </div>
            </div>

            {/* Lakeside Pond layout */}
            {activeZone === "LAKESIDE" && (
              <div className="absolute inset-x-0 bottom-[36px] top-[75%] bg-gradient-to-t from-blue-600 via-sky-500/80 to-transparent z-10 pointer-events-none select-none" id="lakeside-water">
                <div className="absolute inset-x-0 bottom-0 h-8 bg-blue-700/40 flex items-center justify-around">
                  {/* Lilies */}
                  <span className="text-2xl animate-pulse opacity-85">🪷</span>
                  <span className="text-xl opacity-75">🪷</span>
                  <span className="text-2xl opacity-85 animate-bounce-slow">🪷</span>
                </div>
              </div>
            )}

            {/* 5. UNDERGROUND SOIL LAYER (CROSS-SECTION ACCORDING TO SCREENSHOT) */}
            <div className="absolute bottom-0 inset-x-0 h-[38px] bg-gradient-to-b from-[#451A03] to-[#271207] z-10 select-none pointer-events-none border-t-[5px] border-[#92400E] shadow-[inset_0_4px_4px_rgba(0,0,0,0.4)]">
              {/* Scattered Pebbles in Cross Section */}
              <div className="absolute inset-0 opacity-45 flex justify-around items-center px-4">
                <span className="w-2.5 h-1.5 bg-[#78350F] rounded-full" />
                <span className="w-3.5 h-2 bg-[#92400E] rounded-full rotate-12" />
                <span className="w-2 h-1 bg-[#5C3A21] rounded-full" />
                <span className="w-3 h-2 bg-[#78350F] rounded-full -rotate-12" />
                <span className="w-4 h-1.5 bg-[#92400E] rounded-full" />
                <span className="w-2.5 h-2 bg-[#5C3A21] rounded-full" />
                <span className="w-3 h-1 bg-[#78350F] rounded-full" />
              </div>
            </div>

            {/* Joint Room Decorations - WILDFLOWERS SECURELY GROWING ON GREEN LAWN */}
            {activeZone === "MEADOW" && (
              <div className="absolute inset-0 pointer-events-none select-none z-0" id="meadow-flowers-decor">
                <span className="absolute top-[62%] left-[10%] text-xl opacity-80 filter drop-shadow">🌸</span>
                <span className="absolute top-[70%] right-[15%] text-lg opacity-85 filter drop-shadow">🌼</span>
                <span className="absolute top-[82%] left-[24%] text-2xl opacity-80 filter drop-shadow">🌻</span>
                <span className="absolute top-[76%] left-[72%] text-lg opacity-85 filter drop-shadow">🌹</span>
                {/* Flapping cute cartoon butterflies */}
                <span className="absolute top-[40%] left-[18%] text-3xl animate-bounce-slow select-none opacity-80 z-11">🦋</span>
                <span className="absolute top-[58%] right-[22%] text-2xl animate-pulse select-none opacity-70 z-11">🦋</span>
              </div>
            )}

            {/* Lakeside Extra Decor (Frog and Ducks) */}
            {activeZone === "LAKESIDE" && (
              <div className="absolute inset-0 pointer-events-none select-none z-0" id="lakeside-extra-decor">
                {/* Cute cartoon green frog sitting on the pond level */}
                <span className="absolute bottom-[36px] left-[15%] text-3xl select-none animate-bounce z-11">🐸</span>
                {/* Swimming baby ducklings */}
                <span className="absolute bottom-[40px] right-[28%] text-3xl select-none animate-pulse opacity-85 z-11">🪿</span>
                <span className="absolute bottom-[44px] right-[21%] text-2xl select-none opacity-75 z-11">🦆</span>
              </div>
            )}

            {/* Orchard Extra Decor (Honeybees searching flowers) */}
            {activeZone === "ORCHARD" && (
              <div className="absolute inset-0 pointer-events-none select-none z-0" id="orchard-extra-decor">
                {/* Cute honeybees */}
                <span className="absolute top-[32%] left-[28%] text-2xl animate-pulse select-none opacity-85 z-11">🐝</span>
                <span className="absolute top-[38%] right-[32%] text-2xl animate-bounce-slow select-none opacity-80 z-11">🐝</span>
              </div>
            )}

            {/* Barnyard Hay Decor */}
            {activeZone === "BARNYARD" && (
              <div className="absolute inset-x-0 bottom-10 pointer-events-none select-none opacity-40 flex justify-around z-0" id="hayyard-decor">
                <div className="w-10 h-8 bg-amber-400 rounded-md border-b-2 border-amber-900/40 shadow flex items-center justify-center text-xs text-amber-900 font-bold">🌾</div>
                <div className="w-10 h-8 bg-amber-400 rounded-md border-b-2 border-amber-900/40 shadow flex items-center justify-center text-xs text-amber-900 font-bold">🟨</div>
                <div className="w-10 h-8 bg-amber-400 rounded-md border-b-2 border-amber-900/40 shadow flex items-center justify-center text-xs text-amber-900 font-bold">🌾</div>
              </div>
            )}

            {/* UNIFIED BOTTOM HUD CONTROL BAR (Backpack and Shop placed nicely on brown subterranean soil strip) */}
            <div className="absolute left-2 lg:left-4 right-2 lg:right-4 bottom-2 lg:bottom-2.5 z-30 flex items-center justify-between gap-2 lg:gap-4 pointer-events-none select-none">
              {/* Miniature Cartoon Backpack containing non-empty items (No letters, only images/emojis and count figures) */}
              <div className="flex items-center gap-1 lg:gap-1.5 bg-[#FFF8DF]/95 border-2 border-[#7A4E31] p-0.5 lg:p-1 px-1.5 lg:px-2.5 rounded-full shadow-md pointer-events-auto max-w-[calc(100%-88px)] lg:max-w-[calc(100%-110px)] overflow-x-auto scrollbar-none scale-[0.92] lg:scale-100 origin-left" id="compact-backpack-hud">
                <span className="text-xs lg:text-sm select-none" title="Твой Рюкзак">🎒</span>
                {Object.keys(gameState.inventory).map((key) => {
                  const count = gameState.inventory[key];
                  if (count <= 0) return null;

                  let icon = "📦";
                  if (key === "WHEAT") icon = "🌾";
                  else if (key === "CARROT") icon = "🥕";
                  else if (key === "CLOVER") icon = "☘️";
                  else if (key === "CABBAGE") icon = "🥬";
                  else if (key === "APPLE") icon = "🍎";
                  else if (key === "CHERRY") icon = "🍒";
                  else if (key.endsWith("_SEED")) icon = "🌱";
                  else {
                    const match = Object.values(ANIMAL_TEMPLATES).find(t => t.productName === key);
                    if (match) icon = match.productIcon;
                  }

                  return (
                    <div key={key} className="flex items-center gap-0.5 bg-white/70 px-2 py-0.5 rounded-full border border-amber-900/10 text-[9.5px] font-black text-[#5C3A21] shrink-0 transform transition-all active:scale-95" title={key}>
                      <span className="text-xs leading-none select-none">{icon}</span>
                      <span className="leading-none">{count}</span>
                    </div>
                  );
                })}
                {Object.keys(gameState.inventory).filter(k => gameState.inventory[k] > 0).length === 0 && (
                  <span className="text-[8px] text-[#5C3A21]/50 font-black tracking-tight leading-none uppercase pr-1">Пусто!</span>
                )}
              </div>

              {/* Miniature elegant "Лавка Семена" seed button on the right */}
              {activeZone !== "BARNYARD" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playClickSound();
                    setShopActiveTab("sell");
                    setShowShopModal(true);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white rounded-full border-2 border-[#7A4E31] shadow-md flex items-center justify-center gap-0.5 lg:gap-1 active:scale-95 transform transition-all p-0.5 lg:p-1 px-2 lg:px-3 pointer-events-auto cursor-pointer select-none font-sans font-black text-[8px] lg:text-[9.5px] uppercase tracking-wider shrink-0 leading-none scale-[0.92] lg:scale-100 origin-right"
                  id="floating-market-btn"
                >
                  <span className="text-xs leading-none select-none">🏪</span>
                  <span>Семена</span>
                </button>
              )}
            </div>

            {/* A. COZY RUSSIAN WOOD CABIN - Only in BARNYARD Room to avoid crowding meadow and lake! */}
            {activeZone === "BARNYARD" && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  playClickSound();
                  setBoyPosition(p => ({ ...p, targetX: merchantCoords.x + 5, targetY: merchantCoords.y + 4, isMoving: true }));
                  setShowShopModal(true);
                  triggerNotification("🏃 Бежим торговать к купцу Семену!");
                }}
                className="absolute right-3 bottom-[44px] w-[260px] h-[280px] cursor-pointer z-10 interactive-element hover:scale-105 active:scale-95 transition-all duration-300 flex flex-col justify-end"
                id="cozy-cabin"
              >
                {isNearMerchant && (
                  <span className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-amber-950 font-black text-[10.5px] p-1 px-2.5 rounded-full border-2 border-[#92400E] shadow-md animate-bounce whitespace-nowrap z-20">
                    🏪 Жми! Лавка Семена
                  </span>
                )}
                
                <svg viewBox="0 0 240 260" className="w-full h-full drop-shadow-xl select-none pointer-events-none">
                  <defs>
                    <linearGradient id="logGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#B45309" />
                      <stop offset="100%" stopColor="#78350F" />
                    </linearGradient>
                  </defs>

                  {/* Log Walls */}
                  <rect x="25" y="60" width="190" height="190" rx="10" fill="url(#logGradient)" stroke="#451A03" strokeWidth="4" />
                  <path d="M 25 90 L 215 90 M 25 120 L 215 120 M 25 150 L 215 150 M 25 180 L 215 180 M 25 210 L 215 210" stroke="#5C3A21" strokeWidth="4" opacity="0.4" />
                  <path d="M 25 90 L 215 90 M 25 120 L 215 120 M 25 150 L 215 150 M 25 180 L 215 180 M 25 210 L 215 210" stroke="#78350F" strokeWidth="1" strokeDasharray="3,12" />
                  
                  {/* Roof (Red shingles) */}
                  <polygon points="10,65 120,10 230,65" fill="#B91C1C" stroke="#451A03" strokeWidth="4" />
                  <polygon points="25,60 120,18 215,60" fill="#991B1B" />
                  <path d="M 30 55 L 210 55 M 50 45 L 190 45 M 70 35 L 170 35 M 90 25 L 150 25" stroke="#7F1D1D" strokeWidth="3" />

                  {/* Cute Window */}
                  <rect x="45" y="95" width="45" height="50" rx="4" fill="#FEF08A" stroke="#451A03" strokeWidth="3" />
                  <line x1="67.5" y1="95" x2="67.5" y2="145" stroke="#451A03" strokeWidth="2.5" />
                  <line x1="45" y1="120" x2="90" y2="120" stroke="#451A03" strokeWidth="2.5" />
                  <rect x="45" y="95" width="45" height="50" rx="4" fill="#FBBF24" opacity="0.35" />

                  {/* Flower Box beneath window */}
                  <rect x="38" y="142" width="60" height="12" rx="3" fill="#D97706" stroke="#451A03" strokeWidth="2" />
                  <g id="window-flowers">
                    <circle cx="45" cy="138" r="4" fill="#FFFFFF" /> <circle cx="45" cy="138" r="1.5" fill="#FBBF24" />
                    <circle cx="53" cy="136" r="4" fill="#FF8DA1" /> <circle cx="53" cy="136" r="1.5" fill="#FBBF24" />
                    <circle cx="61" cy="139" r="4" fill="#FFFFFF" /> <circle cx="61" cy="139" r="1.5" fill="#FBBF24" />
                    <circle cx="69" cy="137" r="4" fill="#67E8F9" /> <circle cx="69" cy="137" r="1.5" fill="#FBBF24" />
                    <circle cx="77" cy="139" r="4" fill="#FFFFFF" /> <circle cx="77" cy="139" r="1.5" fill="#FBBF24" />
                    <circle cx="85" cy="137" r="4" fill="#FBBF24" /> <circle cx="85" cy="137" r="1.5" fill="#E2E8F0" />
                    <circle cx="92" cy="139" r="4" fill="#FFFFFF" /> <circle cx="92" cy="139" r="1.5" fill="#FBBF24" />
                  </g>

                  {/* Wooden Main Door */}
                  <rect x="125" y="110" width="60" height="135" rx="5" fill="#92400E" stroke="#451A03" strokeWidth="4" />
                  <line x1="129" y1="115" x2="181" y2="240" stroke="#451A03" strokeWidth="3.5" strokeLinecap="round" opacity="0.75" />
                  <line x1="129" y1="240" x2="181" y2="115" stroke="#451A03" strokeWidth="3.5" strokeLinecap="round" opacity="0.25" />
                  <circle cx="138" cy="175" r="4" fill="#1E293B" />
                  <path d="M 138 175 C 138 185 133 190 133 192" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  
                  {/* Warm hanging wall lantern hanger */}
                  <path d="M 102 100 L 115 100" stroke="#1F2937" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 115 100 L 115 108" stroke="#1F2937" strokeWidth="3.5" />
                  {/* Lantern body */}
                  <polygon points="107,108 123,108 120,128 110,128" fill="#F59E0B" stroke="#1F2937" strokeWidth="2.5" />
                  <polygon points="104,108 126,108 115,103" fill="#111827" />

                  {/* Ivy green vines climbing up walls */}
                  <path d="M 215 250 Q 200 180 212 110" stroke="#047857" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                  <circle cx="205" cy="220" r="5" fill="#059669" />
                  <circle cx="218" cy="190" r="6" fill="#10B981" />
                  <circle cx="203" cy="160" r="5" fill="#047857" />
                  <circle cx="215" cy="130" r="4" fill="#059669" />
                  <circle cx="208" cy="100" r="5" fill="#10B981" />
                </svg>
                
                {/* Dynamic Lantern Aura Glow */}
                <div className="absolute right-[114px] bottom-[136px] w-[28px] h-[28px] rounded-full bg-yellow-400 opacity-60 animate-pulse pointer-events-none filter blur-[3px]" style={{ mixBlendMode: 'screen' }} />
                
                <span className="text-[10px] bg-amber-950 text-amber-50 p-0.5 px-2 rounded-md font-black uppercase tracking-wider shadow absolute bottom-2 right-12 z-10">Лавка Купца</span>
                <span className="absolute bottom-[36px] right-24 text-3xl animate-bounce-slow">👨‍🌾</span>
              </div>
            )}

            {/* B. VINTAGE WOODEN WHEELBARROW CART - Only in BARNYARD Room to avoid crowding meadow! */}
            {activeZone === "BARNYARD" && (
              <div className="absolute left-[4%] bottom-[42px] w-[130px] h-[90px] select-none pointer-events-none z-10" id="rustic-wheelbarrow">
                <svg viewBox="0 0 140 100" className="w-full h-full drop-shadow-md">
                  {/* Legs */}
                  <line x1="30" y1="55" x2="35" y2="80" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" />
                  <line x1="85" y1="55" x2="80" y2="80" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" />
                  
                  {/* Wheel on left */}
                  <circle cx="45" cy="74" r="16" fill="none" stroke="#78350F" strokeWidth="5.5" />
                  <circle cx="45" cy="74" r="13" fill="none" stroke="#B45309" strokeWidth="2" />
                  <circle cx="45" cy="74" r="3.5" fill="#451A03" />
                  <line x1="45" y1="58" x2="45" y2="90" stroke="#78350F" strokeWidth="3" />
                  <line x1="29" y1="74" x2="61" y2="74" stroke="#78350F" strokeWidth="3" />

                  {/* Cart Body */}
                  <polygon points="20,40 115,28 110,58 35,58" fill="#92400E" stroke="#451A03" strokeWidth="3.5" />
                  <line x1="22" y1="49" x2="112" y2="43" stroke="#451A03" strokeWidth="2.5" />
                  
                  {/* Handle */}
                  <line x1="105" y1="44" x2="135" y2="48" stroke="#78350F" strokeWidth="5" strokeLinecap="round" />
                  
                  {/* Vegetables piled inside */}
                  <g id="cart-veggies">
                    <circle cx="48" cy="28" r="11" fill="#22C55E" />
                    <circle cx="42" cy="29" r="8" fill="#4ADE80" />
                    <circle cx="54" cy="27" r="9" fill="#16A34A" />
                    
                    <path d="M 68 28 L 84 15" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
                    <path d="M 84 15 L 89 11" stroke="#22C55E" strokeWidth="3.5" />
                    <path d="M 74 30 L 92 19" stroke="#F97316" strokeWidth="6" strokeLinecap="round" />
                    
                    <circle cx="98" cy="28" r="8.5" fill="#EF4444" />
                    <circle cx="94" cy="32" r="7" fill="#F87171" />
                    <circle cx="106" cy="33" r="8" fill="#DC2626" />
                    <path d="M 98 21 L 96 25 Q 102 24 105 19" stroke="#15803D" strokeWidth="2" fill="none" />
                  </g>
                </svg>
              </div>
            )}


            {/* C. DUAL-ROW COZY ORGANIC SOIL BEDS (Visible in BARNYARD zone ONLY!) */}
            {activeZone === "BARNYARD" && (
              <div className="absolute w-[44%] h-[200px] pointer-events-none select-none z-0" style={{ left: "50%", top: "72%", transform: "translateX(-45%)" }} id="tilled-soil-strips">
                {/* Upper Dirt Strip */}
                <div className="absolute left-0 bottom-16 w-full h-[32px] bg-gradient-to-r from-[#451A03] to-[#3B2314] rounded-full opacity-90 shadow-md border-b-2 border-stone-900/40" />
                {/* Lower Dirt Strip */}
                <div className="absolute left-[5%] bottom-2 w-[90%] h-[32px] bg-gradient-to-r from-[#451A03] to-[#3B2314] rounded-full opacity-90 shadow-md border-b-2 border-stone-900/40" />
              </div>
            )}

            {/* D. CROP PLOTS (Rendering directly out of pasture dirt - ONLY in BARNYARD room!) */}
            {activeZone === "BARNYARD" && (
              ALL_PLOT_IDS.map((plotId) => {
                const crop = gameState.crops[plotId];
                const coords = getPlotsCoords(plotId);
                const isSelected = selectedPlotId === plotId;

                if (!crop) {
                  // Render locked plot sign card
                  const cost = PLOT_COSTS[plotId] || 120;
                  return (
                    <div
                      key={plotId}
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setBoyPosition((p) => ({ ...p, targetX: coords.x, targetY: coords.y, isMoving: true }));
                        setSelectedPlotId(plotId);
                        setSelectedAnimalId(null);
                        setSelectedTreeId(null);
                        triggerNotification(`🪵 Рядок закрито! Можно открыть его за ${cost} монеток.`);
                      }}
                      className={`absolute cursor-pointer flex flex-col items-center justify-center p-1 rounded-3xl border-4 transition-all select-none z-10 interactive-element ${
                        isSelected
                          ? "border-yellow-400 bg-amber-100/90 ring-4 ring-yellow-400/50 scale-110"
                          : "border-stone-500/20 bg-stone-300/30 hover:bg-stone-300/50"
                      }`}
                      style={{
                        left: `${coords.x}%`,
                        top: `${coords.y}%`,
                        transform: 'translate(-50%, -100%)',
                        width: '68px',
                        height: '62px'
                      }}
                    >
                      <span className="text-xl">🪵</span>
                      <span className="text-[7.5px] font-black text-amber-950 uppercase tracking-tight mt-0.5 leading-none">вспахать</span>
                      <span className="text-[8.5px] font-extrabold text-amber-900 bg-amber-200/90 rounded px-1 mt-1 leading-none border border-amber-300 select-none">
                        {cost}🪙
                      </span>
                      <span className="absolute -bottom-2.5 bg-stone-700 text-stone-100 border border-stone-604 text-[8px] p-0.5 px-1.5 rounded-full font-black scale-90 select-none">
                        Рядок {plotId.replace("plot", "")}
                      </span>
                    </div>
                  );
                }

                const isGrowing = crop.progress > 0 && crop.progress < 100;
                const isRipe = crop.progress >= 100;

                return (
                  <div
                    key={plotId}
                    onClick={(e) => {
                      e.stopPropagation();
                      playClickSound();
                      setBoyPosition(p => ({ ...p, targetX: coords.x, targetY: coords.y, isMoving: true }));
                      setSelectedPlotId(plotId);
                      setSelectedAnimalId(null);
                      setSelectedTreeId(null);
                      triggerNotification(`🌱 Выбрана Грядка ${plotId.replace("plot", "")}`);
                    }}
                    className={`absolute cursor-pointer flex flex-col items-center justify-center p-1 rounded-3xl border-4 transition-all select-none z-10 interactive-element ${
                      isSelected
                        ? "border-yellow-400 bg-amber-100/90 ring-4 ring-yellow-400/50 scale-110"
                        : isRipe
                        ? "border-amber-600 bg-amber-50"
                        : "border-amber-950/15 bg-[#5C3A21]/15 hover:bg-[#5C3A21]/25"
                    }`}
                    style={{
                      left: `${coords.x}%`,
                      top: `${coords.y}%`,
                      transform: 'translate(-50%, -100%)',
                      width: '68px',
                      height: '62px'
                    }}
                  >
                    {/* Render our advanced custom vector crop graphics helper */}
                    {crop.progress > 0 ? (
                      <div className="flex flex-col items-center">
                        {renderVectorCrop(crop.type, crop.progress)}
                        {isGrowing && (
                          <div className="w-10 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1 shadow-inner">
                            <div className="bg-emerald-500 h-full" style={{ width: `${crop.progress}%` }} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-950/30 font-black uppercase">пусто</span>
                    )}

                    {crop.isWatered && !isRipe && (
                      <span className="absolute -top-3 -right-2 text-[14px] animate-bounce">💧</span>
                    )}
                    
                    <span className="absolute -bottom-2.5 bg-amber-950 text-amber-50 border border-amber-955 text-[8px] p-0.5 px-1.5 rounded-full font-black scale-90 select-none">
                      Рядок {plotId.replace("plot", "")}
                    </span>
                  </div>
                );
              })
            )}

            {/* D1.5 VISUAL PURCHASED BUILDINGS & STRUCTURES */}
            {(() => {
              const zoneBuildings = BUILDINGS_TEMPLATES[activeZone] || [];
              const activeBuildings = zoneBuildings.filter((bld) => gameState.buildings?.[activeZone]?.includes(bld.id));

              return activeBuildings.map((bld) => (
                <div
                  key={bld.id}
                  className="absolute flex flex-col items-center justify-center select-none pointer-events-none animate-scale-up z-10 group"
                  style={{
                    left: `${bld.x}%`,
                    top: `${bld.y}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                  title={`${bld.nameRu}: ${bld.benefitRu}`}
                  id={`pasture-bld-${bld.id}`}
                >
                  <div className="absolute bottom-0 w-20 h-5 bg-black/10 rounded-full blur-[2px] -z-10 group-hover:bg-black/20 transition-all duration-300" />
                  {bld.id === "max_house" ? (
                    <div className="flex flex-col items-center text-center drop-shadow-md relative">
                      <span className="text-7xl md:text-8xl select-none transform hover:scale-110 active:scale-95 transition-transform duration-300 hover:rotate-2 cursor-pointer pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          const currentLvl = gameState.maxHouseLevel || 1;
                          const upgradeCost = currentLvl * 300;
                          if (gameState.coins >= upgradeCost) {
                            setGameState(prev => ({
                              ...prev,
                              coins: prev.coins - upgradeCost,
                              maxHouseLevel: currentLvl + 1
                            }));
                            playLevelUpSound();
                            triggerNotification(`🎉 Дом Макса улучшен до уровня ${currentLvl + 1}! Собака и кошка счастливы!`);
                            spawnFloatHeart(bld.x, bld.y - 12, "👑");
                          } else {
                            playSadSound();
                            triggerNotification(`⚠️ Нужно ${upgradeCost} монет для улучшения дома до уровня ${currentLvl + 1}!`);
                          }
                        }}
                      >
                        {(gameState.maxHouseLevel || 1) === 1 ? "🛖" : (gameState.maxHouseLevel || 1) === 2 ? "🏡" : (gameState.maxHouseLevel || 1) === 3 ? "🧱" : (gameState.maxHouseLevel || 1) === 4 ? "🏰" : "🏰👑"}
                      </span>
                      <div className="bg-[#5C3A21] border-2 border-[#FEF3C7] text-[9px] font-black text-[#FEF3C7] uppercase px-2 py-0.5 rounded-full shadow-md mt-1 scale-90 whitespace-nowrap pointer-events-auto cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          playClickSound();
                          const currentLvl = gameState.maxHouseLevel || 1;
                          const upgradeCost = currentLvl * 300;
                          triggerNotification(`🏡 Дом Макса (Ур. ${currentLvl}). Кликни, чтобы улучшить за ${upgradeCost} 🪙!`);
                        }}
                      >
                        🏡 {bld.nameRu} (Ур. {gameState.maxHouseLevel || 1})
                      </div>
                      
                      {/* Lounging owned pets */}
                      <div className="absolute top-[75%] -left-10 flex gap-2.5 z-10">
                        {gameState.animals.some(a => a.species === AnimalSpecies.CAT) && (
                          <div className="text-xl bg-white/80 p-1 rounded-lg border border-amber-800 animate-pulse pointer-events-auto cursor-help" title="Кошка Мурка нежится у крыльца">🐱</div>
                        )}
                        {gameState.animals.some(a => a.species === AnimalSpecies.DOG) && (
                          <div className="text-xl bg-white/80 p-1 rounded-lg border border-amber-800 animate-bounce pointer-events-auto cursor-help" title="Пес Шарик охраняет крыльцо">🐶</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center drop-shadow-md cursor-help pointer-events-auto">
                      <span className="text-6xl md:text-7xl select-none transform hover:scale-110 active:scale-95 transition-transform duration-300 hover:rotate-2">
                        {bld.emoji}
                      </span>
                      <div className="bg-[#5C3A21] border-2 border-[#FEF3C7] text-[8px] font-black text-[#FEF3C7] uppercase px-2 py-0.5 rounded-full shadow-md mt-1 scale-90 whitespace-nowrap">
                        🏡 {bld.nameRu}
                      </div>
                    </div>
                  )}
                </div>
              ));
            })()}

            {/* D2. FRUIT TREES (exclusive in ORCHARD tab) */}
            {activeZone === "ORCHARD" && (
              Object.keys(gameState.trees).map((plotId) => {
                const tree = gameState.trees[plotId];
                const config = TREES_CONFIG[tree.type];
                const coords = getTreeCoords(plotId);
                const isSelected = selectedTreeId === plotId;

                return (
                  <div
                    key={plotId}
                    onClick={(e) => {
                      e.stopPropagation();
                      playClickSound();
                      setBoyPosition(p => ({ ...p, targetX: coords.x, targetY: coords.y + 7, isMoving: true }));
                      setSelectedTreeId(plotId);
                      setSelectedAnimalId(null);
                      setSelectedPlotId(null);
                      triggerNotification(`🌳 Локатор Сада: ${config ? config.nameRu : "Пустая лунка"}`);
                    }}
                    className={`absolute cursor-pointer flex flex-col items-center justify-center p-2 rounded-3xl border-4 transition-all select-none z-10 interactive-element ${
                      isSelected
                        ? "border-yellow-400 bg-[#E8F5E9]/90 ring-4 ring-yellow-400/50 scale-105 shadow-lg"
                        : "border-[#2E7D32]/20 hover:border-[#2E7D32]/50 bg-white/20 hover:bg-white/30"
                    }`}
                    style={{
                      left: `${coords.x}%`,
                      top: `${coords.y}%`,
                      transform: 'translate(-50%, -100%)',
                      width: '100px',
                      height: '120px'
                    }}
                  >
                    <div className="relative flex flex-col items-center animate-fade-in">
                      {/* Detailed Vector Foliage & Wood Trunk */}
                      <svg viewBox="0 0 100 110" className="w-18 h-20 filter drop-shadow select-none pointer-events-none">
                        <path d="M 46 110 Q 48 85 44 65 L 56 65 Q 52 85 54 110 Z" fill="#78350F" stroke="#451A03" strokeWidth="1.5" />
                        <path d="M 44 65 Q 36 50 32 52 M 56 65 Q 64 50 68 53" stroke="#78350F" strokeWidth="4.5" strokeLinecap="round" opacity="0.3" />
                        <circle cx="34" cy="48" r="18" fill="#15803D" />
                        <circle cx="66" cy="48" r="18" fill="#15803D" />
                        <circle cx="50" cy="32" r="22" fill="#166534" />
                        <circle cx="50" cy="48" r="20" fill="#16A34A" />
                        <circle cx="48" cy="40" r="14" fill="#4ADE80" opacity="0.3" />
                      </svg>
                      
                      {/* Hanging dynamic fruits on branches */}
                      {tree && tree.fruitCount > 0 && (
                        <div className="absolute inset-x-0 top-3 h-12 flex justify-center items-center pointer-events-none">
                          <div className="relative w-16 h-12">
                            {Array.from({ length: tree.fruitCount }).map((_, i) => {
                              const xPositions = [20, 50, 80, 35, 65];
                              const yPositions = [12, 16, 14, 25, 27];
                              return (
                                <span
                                  key={i}
                                  className="absolute text-sm filter drop-shadow animate-bounce-slow"
                                  style={{ left: `${xPositions[i % 5]}%`, top: `${yPositions[i % 5]}%` }}
                                >
                                  {tree.type === "APPLE" ? "🍎" : "🍒"}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <span className="text-[10px] font-black text-emerald-950 mt-1 uppercase leading-3">
                        {config ? config.nameRu : "Луночка"}
                      </span>

                      {tree && tree.fruitCount < config.yieldCount && (
                        <div className="w-14 h-1.5 bg-yellow-100 rounded-full overflow-hidden mt-1 shadow-inner border border-yellow-800/10">
                          <div className="bg-yellow-400 h-full" style={{ width: `${tree.fruitProgress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* E. ANIMALS ROAMING & WALKING (Enlarged with massive size for kid touch!) */}
            {activeAnimalsList.map((animal) => {
              const isSelected = selectedAnimalId === animal.id;
              const template = ANIMAL_TEMPLATES[animal.species];
              const isDragged = draggedAnimalId === animal.id;

              return (
                <button
                  key={animal.id}
                  onMouseDown={(e) => handleAnimalStartDrag(e, animal.id, animal.species)}
                  onTouchStart={(e) => handleAnimalStartDrag(e, animal.id, animal.species)}
                  className={`absolute w-24 h-24 origin-bottom select-none z-10 interactive-element touch-none ${
                    isDragged
                      ? "transition-none scale-135 filter drop-shadow-[0_12px_12px_rgba(251,191,36,0.95)] brightness-110 z-50 cursor-grabbing"
                      : isSelected
                      ? "transition-transform duration-500 scale-125 filter drop-shadow-[0_8px_8px_rgba(251,191,36,0.9)] brightness-105"
                      : "transition-transform duration-500 hover:scale-110 cursor-pointer filter drop-shadow"
                  }`}
                  style={{
                    left: `${animal.x}%`,
                    top: `${animal.y}%`,
                    transform: `translate(-50%, -100%) scaleX(${animal.scaleX}) rotate(${animal.angle || 0}deg)`
                  }}
                  id={`roamer-${animal.id}`}
                >
                  {!animal.isFed ? (
                    <span className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-rose-50 text-rose-600 rounded-full px-2 py-0.5 text-[8.5px] border-2 border-rose-300 font-black shadow-md animate-bounce whitespace-nowrap uppercase z-20">
                      😋 Покорми!
                    </span>
                  ) : animal.productionProgress >= 100 ? (
                    <span className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-amber-950 rounded-full px-2 py-0.5 text-[8.5px] border-2 border-yellow-600 font-black shadow-md animate-pulse whitespace-nowrap uppercase z-20">
                      {template.productIcon} Готово!
                    </span>
                  ) : isNight ? (
                    <span className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-indigo-950 text-sky-200 border-2 border-indigo-400 rounded-full px-2 py-0.5 text-[8px] font-black shadow-md animate-bounce select-none whitespace-nowrap uppercase z-20">
                      💤 Спит...
                    </span>
                  ) : null}

                  {animal.isSheared && (
                    <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-pink-100 text-pink-700 rounded-full px-1.5 py-0.2 text-[8px] font-black border border-pink-300 whitespace-nowrap">
                      лысый барашек
                    </span>
                  )}

                  <div className={`w-24 h-24 pointer-events-none transition-all duration-1000 ${isNight ? "brightness-50 saturate-75 contrast-90" : ""}`}>
                    <AnimalSVG
                      species={animal.species}
                      happiness={animal.happiness}
                      isFed={animal.isFed}
                      isSheared={animal.isSheared}
                      cleanliness={animal.cleanliness}
                    />
                  </div>
                </button>
              );
            })}

            {/* 🦋 3D-EFFECT COLLECTIBLE BUTTERFLIES (Flit dynamically around pasture) */}
            {butterflies.map((b) => (
              <button
                key={b.id}
                onClick={(e) => handleCollectButterfly(b.id, e)}
                className="absolute w-12 h-12 flex items-center justify-center select-none cursor-pointer transition-transform duration-200 active:scale-75 hover:scale-125 z-10"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  transform: "translate(-50%, -100%)",
                }}
                id={`butterfly-${b.id}`}
              >
                <div className={`relative flex items-center justify-center p-1 rounded-full text-2xl transition animate-pulse duration-1000 ${
                  b.type === "blue" ? "text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.95)]" :
                  b.type === "orange" ? "text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.95)] filter hue-rotate-[45deg]" :
                  b.type === "purple" ? "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(192,38,211,0.95)] filter hue-rotate-[260deg]" :
                  b.type === "pink" ? "text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.95)] filter hue-rotate-[300deg]" :
                  b.type === "green" ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.95)] filter hue-rotate-[110deg]" :
                  "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,1.05)] animate-bounce filter hue-rotate-[60deg]"
                }`}>
                  {b.emoji}
                  <span className="absolute text-[8px] -top-1 animate-bounce">✨</span>
                </div>
              </button>
            ))}

            {/* 🌠 CELESTIAL COLLECTIBLE FALLING STARS (Descending / Grounded at night) */}
            {fallingStars.map((s) => (
              <button
                key={s.id}
                onClick={(e) => handleCollectStar(s.id, e)}
                className={`absolute flex flex-col items-center justify-center select-none z-10 ${
                  s.isGrounded ? "cursor-pointer animate-pulse" : "pointer-events-none"
                }`}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: "translate(-50%, -100%)",
                }}
                id={`star-${s.id}`}
              >
                <div
                  className="flex items-center justify-center transition-all duration-300"
                  style={{
                    width: `${s.size}px`,
                    height: `${s.size}px`,
                  }}
                >
                  <span
                    className={`text-2xl md:text-3xl filter ${
                      s.isGrounded
                        ? "drop-shadow-[0_0_12px_rgba(250,204,21,0.95)] scale-110 saturate-150 text-yellow-300"
                        : "drop-shadow-[0_0_15px_rgba(255,255,255,1.0)] opacity-90 text-white"
                    }`}
                  >
                    ⭐
                  </span>
                </div>
                {s.isGrounded && (
                  <span className="text-[7.5px] bg-[#1E1B4B]/80 text-yellow-300 font-extrabold px-1 rounded-full border border-yellow-400 scale-90 -mt-1 shadow-sm whitespace-nowrap">
                    ЖМИ!
                  </span>
                )}
              </button>
            ))}

            {/* F. THE BOY EXPLORER CHARACTER (👦🏼) - High-fidelity Vector Model! */}
            <div
              className="absolute w-16 h-18 z-20 pointer-events-none select-none transition-all duration-[40ms]"
              style={{
                left: `${boyPosition.x}%`,
                top: `${boyPosition.y}%`,
                transform: `translate(-50%, -100%) scaleX(${boyPosition.dir === "left" ? -1 : 1})`
              }}
            >
              <div className={`relative flex flex-col items-center ${boyPosition.isMoving ? "animate-walk-wobble" : ""}`}>
                <svg viewBox="0 0 60 70" className="w-16 h-18 filter drop-shadow-md">
                  {/* Straw strawhat */}
                  <ellipse cx="30" cy="18" rx="14" ry="10" fill="#EAB308" stroke="#713F12" strokeWidth="2" />
                  <rect x="20" y="16" width="20" height="3" fill="#B45309" />
                  <ellipse cx="30" cy="21" rx="22" ry="5" fill="#FACC15" stroke="#713F12" strokeWidth="2" />

                  {/* Curly golden locks of toddler Maxim */}
                  <circle cx="16" cy="27" r="4.5" fill="#78350F" />
                  <circle cx="44" cy="27" r="4.5" fill="#78350F" />
                  <path d="M 18 24 Q 30 19 42 24" fill="#78350F" />

                  {/* Cheerful head and chubby cheeks */}
                  <circle cx="30" cy="30" r="11" fill="#FFD1A9" stroke="#713F12" strokeWidth="1.5" />
                  <circle cx="22" cy="32" r="2.5" fill="#EF4444" opacity="0.6" />
                  <circle cx="38" cy="32" r="2.5" fill="#EF4444" opacity="0.6" />
                  <circle cx="25" cy="28" r="1.8" fill="#1F2937" />
                  <circle cx="35" cy="28" r="1.8" fill="#1F2937" />
                  <circle cx="26" cy="27" r="0.6" fill="#FFFFFF" />
                  <circle cx="36" cy="27" r="0.6" fill="#FFFFFF" />
                  <path d="M 26 33 Q 30 38 34 33" stroke="#713F12" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                  {/* Arms */}
                  <line x1="18" y1="44" x2="14" y2="52" stroke="#FFF7ED" strokeWidth="6" strokeLinecap="round" />
                  <line x1="42" y1="44" x2="46" y2="52" stroke="#FFF7ED" strokeWidth="6" strokeLinecap="round" />
                  {/* Little helper hands */}
                  <circle cx="12" cy="53" r="3.5" fill="#B45309" stroke="#713F12" strokeWidth="1" />
                  <circle cx="48" cy="53" r="3.5" fill="#B45309" stroke="#713F12" strokeWidth="1" />

                  {/* Cute blue farmer overalls */}
                  <rect x="20" y="39" width="20" height="18" rx="4" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
                  <line x1="23" y1="38" x2="23" y2="44" stroke="#1D4ED8" strokeWidth="3" strokeLinecap="round" />
                  <line x1="37" y1="38" x2="37" y2="44" stroke="#1D4ED8" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="23" cy="44" r="1.5" fill="#FBBF24" />
                  <circle cx="37" cy="44" r="1.5" fill="#FBBF24" />
                  <rect x="24" y="47" width="12" height="6" rx="1.5" fill="none" stroke="#1D4ED8" strokeWidth="1" />

                  {/* Overalls trousers leg cuffs */}
                  <rect x="21" y="55" width="8" height="7" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
                  <rect x="31" y="55" width="8" height="7" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />

                  {/* Cute leather brown boots */}
                  <ellipse cx="23" cy="63" rx="5" ry="3.5" fill="#713F12" stroke="#451A03" strokeWidth="1.5" />
                  <ellipse cx="37" cy="63" rx="5" ry="3.5" fill="#713F12" stroke="#451A03" strokeWidth="1.5" />
                </svg>

                {/* Feet shadow */}
                <div className="absolute bottom-[-2px] bg-black/15 w-8 h-2 rounded-full filter blur-[1px]" />
              </div>
            </div>

            {/* F2. ACTIVE HIRED WORKERS (👨‍🌾 👩‍🌾 👦🏻) - High-fidelity Visual Sprites! */}
            {(gameState.workers ?? []).map((worker) => {
              if (!worker.isActive || worker.assignedLocationId !== activeZone) return null;

              // Determine placement on screen depending on role
              const pos = workersPositions[worker.id];
              const posX = pos ? pos.x : 20;
              const posY = pos ? pos.y : 72;
              const workerVisualType =
                worker.id === "worker-mama" ? "feed"
                : worker.id === "worker-nadya" ? "grow"
                : worker.id === "worker-lena" || worker.id === "worker-pasha" ? "clean"
                : null;
              let actionIcon = "💼";
              let workerSVG = null;

              if (workerVisualType === "feed") {
                actionIcon = "🍿";
                workerSVG = (
                  <svg viewBox="0 0 60 70" className="w-16 h-18 filter drop-shadow-md">
                    {/* Hat with flat border */}
                    <ellipse cx="30" cy="18" rx="15" ry="5" fill="#B45309" stroke="#713F12" strokeWidth="2" />
                    <rect x="22" y="10" width="16" height="8" rx="2" fill="#D97706" stroke="#713F12" strokeWidth="2" />
                    {/* Gray hair and hair bangs */}
                    <circle cx="16" cy="27" r="4" fill="#9CA3AF" />
                    <circle cx="44" cy="27" r="4" fill="#9CA3AF" />
                    <path d="M 18 24 Q 30 19 42 24" fill="#9CA3AF" />
                    {/* Experienced tanned face */}
                    <circle cx="30" cy="30" r="11" fill="#FFC08A" stroke="#713F12" strokeWidth="1.5" />
                    <circle cx="25" cy="28" r="1.5" fill="#1F2937" />
                    <circle cx="35" cy="28" r="1.5" fill="#1F2937" />
                    {/* Kindly grey mustache */}
                    <path d="M 22 34 Q 30 33 38 34" stroke="#D1D5DB" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    <path d="M 22 34 Q 18 38 16 34 M 38 34 Q 42 38 44 34" stroke="#713F12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    {/* Cozy green vest and plaid shirt */}
                    <rect x="20" y="39" width="20" height="18" rx="4" fill="#047857" stroke="#065F46" strokeWidth="1.5" />
                    <rect x="23" y="39" width="14" height="18" fill="#F59E0B" opacity="0.3" />
                    {/* Arms holding feed bucket */}
                    <line x1="18" y1="44" x2="12" y2="52" stroke="#FFC08A" strokeWidth="5" strokeLinecap="round" />
                    <line x1="42" y1="44" x2="48" y2="52" stroke="#FFC08A" strokeWidth="5" strokeLinecap="round" />
                    {/* Feed Bucket */}
                    <path d="M 44 50 L 52 50 L 50 62 L 46 62 Z" fill="#9CA3AF" stroke="#374151" strokeWidth="1.5" />
                    <ellipse cx="48" cy="50" rx="4" ry="1.5" fill="#F59E0B" />
                  </svg>
                );
              } else if (workerVisualType === "grow") {
                actionIcon = "🌱";
                workerSVG = (
                  <svg viewBox="0 0 60 70" className="w-16 h-18 filter drop-shadow-md">
                    {/* Elegant pink headscarf (Платочек) wrapping the head */}
                    <ellipse cx="30" cy="22" rx="14" ry="11" fill="#EC4899" stroke="#9D174D" strokeWidth="1.5" />
                    <path d="M 16 24 C 18 10, 42 10, 44 24" fill="#EC4899" stroke="#9D174D" strokeWidth="1.5" />
                    <path d="M 44 22 L 48 18 L 43 25" stroke="#9D174D" strokeWidth="1.5" fill="#EC4899" />
                    {/* Kind face */}
                    <circle cx="30" cy="30" r="11" fill="#FFE4E6" stroke="#713F12" strokeWidth="1.5" />
                    <circle cx="22" cy="32" r="2.5" fill="#EF4444" opacity="0.5" />
                    <circle cx="38" cy="32" r="2.5" fill="#EF4444" opacity="0.5" />
                    <circle cx="25" cy="28" r="1.5" fill="#1F2937" />
                    <circle cx="35" cy="28" r="1.5" fill="#1F2937" />
                    <path d="M 26 33 Q 30 36 34 33" stroke="#713F12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    {/* Green field dress and yellow apron */}
                    <path d="M 20 41 L 40 41 L 44 57 L 16 57 Z" fill="#059669" stroke="#047857" strokeWidth="1.5" />
                    <rect x="23" y="44" width="14" height="13" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
                    {/* Hands holding mini watering tool */}
                    <line x1="18" y1="44" x2="14" y2="52" stroke="#FFE4E6" strokeWidth="5.5" strokeLinecap="round" />
                    <line x1="42" y1="44" x2="46" y2="52" stroke="#FFE4E6" strokeWidth="5.5" strokeLinecap="round" />
                    <rect x="10" y="48" width="6" height="6" rx="1" fill="#0D9488" />
                    <path d="M 10 51 L 6 54 L 6 52 Z" stroke="#0D9488" strokeWidth="1.5" />
                  </svg>
                );
              } else if (workerVisualType === "clean") {
                actionIcon = worker.id === "worker-pasha" ? "🧼" : "🧹";
                workerSVG = (
                  <svg viewBox="0 0 60 70" className="w-16 h-18 filter drop-shadow-md">
                    {/* Cap worn backwards */}
                    <ellipse cx="30" cy="21" rx="11" ry="8" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
                    <path d="M 30 15 L 14 18" stroke="#B45309" strokeWidth="3" strokeLinecap="round" />
                    {/* Playful brunette hair */}
                    <circle cx="17" cy="27" r="4" fill="#4B5563" />
                    <circle cx="43" cy="27" r="4" fill="#4B5563" />
                    <path d="M 18 24 Q 30 20 42 24" fill="#4B5563" />
                    {/* Chubby face */}
                    <circle cx="30" cy="30" r="11" fill="#FFE5D9" stroke="#713F12" strokeWidth="1.5" />
                    <circle cx="25" cy="28" r="1.8" fill="#1F2937" />
                    <circle cx="35" cy="28" r="1.8" fill="#1F2937" />
                    <path d="M 26 33 Q 30 38 34 33" stroke="#713F12" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    {/* Red t-shirt & white shorts */}
                    <rect x="20" y="39" width="20" height="16" rx="3" fill="#EF4444" stroke="#DC2626" strokeWidth="1.5" />
                    <rect x="21" y="55" width="18" height="4" fill="#FFFFFF" />
                    {/* Sweeping broom */}
                    <line x1="18" y1="44" x2="10" y2="35" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 11 38 Q 4 30 6 39 Z" fill="#FCD34D" stroke="#D97706" strokeWidth="1" />
                  </svg>
                );
              }

              const isMoving = pos ? pos.isMoving : false;
              const dir = pos ? pos.dir : "right";
              const actionLabel = pos ? pos.actionLabel : undefined;

              return (
                <div
                  key={worker.id}
                  className="absolute w-16 h-18 z-20 pointer-events-auto cursor-pointer select-none transition-all duration-[40ms]"
                  style={{
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: `translate(-50%, -100%) scaleX(${dir === "left" ? -1 : 1})`
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    unlockAudio();
                    playNpcClickSound(worker.id);
                  }}
                >
                  <div className={`relative flex flex-col items-center ${isMoving ? "animate-walk-wobble" : ""}`}>
                    {/* Bubbled tooltip detailing what they are doing! */}
                    <div className="absolute -top-7 px-1.5 py-0.5 bg-slate-900 border border-slate-600 text-slate-50 rounded-full text-[8px] font-black shadow-md flex items-center gap-1 whitespace-nowrap uppercase tracking-wider" style={{ transform: `scaleX(${dir === "left" ? -1 : 1})` }}>
                      <span>{worker.emoji}</span>
                      <span>{worker.name.split(" ")[1] || worker.name}</span>
                      <span className="text-[10px] animate-bounce">{actionIcon}</span>
                    </div>

                    {/* Pop up Action Status bubble */}
                    {actionLabel && (
                      <div className="absolute -top-13 px-2 py-0.5 bg-amber-50 border-2 border-amber-500 text-amber-950 rounded-xl text-[8.5px] font-black shadow-lg flex items-center gap-1 whitespace-nowrap animate-bounce z-40" style={{ transform: `scaleX(${dir === "left" ? -1 : 1})` }}>
                        {actionLabel}
                      </div>
                    )}

                    <div className="w-16 h-18">
                      {workerSVG || (
                        <span className="text-5xl filter drop-shadow-md block text-center leading-none">{worker.emoji}</span>
                      )}
                    </div>

                    {/* Ground shadow for physical depth */}
                    <div className="absolute bottom-[-2px] bg-black/15 w-8 h-2 rounded-full filter blur-[1px]" />
                  </div>
                </div>
              );
            })}

            {/* G. COSMIC FLOATING COSY PARTICLES (Hearts & emoji splashes) */}
            {floatingHearts.map((heart) => (
              <span
                key={heart.id}
                className="absolute text-5xl font-extrabold animate-float-heart pointer-events-none select-none z-30"
                style={{
                  left: `${heart.x}%`,
                  top: `${heart.y}%`,
                }}
              >
                {heart.emoji}
              </span>
            ))}

            {/* H. FLOATING CONTEXT-BUBBLE FOR CROP PLOTS (No split view!) */}
            {selectedPlotId && (() => {
              const crop = gameState.crops[selectedPlotId];
              const coords = getPlotsCoords(selectedPlotId);
              const isNear = isBoyNear(coords.x, coords.y);

              return (
                <div
                  className="absolute bg-white border-2 lg:border-4 border-[#92400E] rounded-2xl lg:rounded-3xl p-2 lg:p-3 shadow-2xl flex flex-col items-center text-center gap-1 lg:gap-2 z-30 select-none animate-scale-up w-[148px] lg:w-[180px]"
                  style={{
                    left: `${coords.x}%`,
                    top: `${coords.y - 12}%`,
                    transform: 'translateX(-50%) translateY(-50%)',
                  }}
                >
                  <span className="text-[9px] lg:text-xs bg-amber-950 text-white font-black px-1.5 lg:px-2 py-0.5 rounded-full scale-90 block">
                    ГРЯДКА №{selectedPlotId.replace("plot", "")} 🥕
                  </span>

                  {!isNear ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setBoyPosition(p => ({ ...p, targetX: coords.x, targetY: coords.y, isMoving: true }));
                      }}
                      className="mt-1 py-1.5 px-3 bg-[#D97706] hover:bg-[#B45309] text-white text-[10px] font-black rounded-full cursor-pointer uppercase flex items-center gap-1"
                    >
                      <span>🏃‍♂️ Бежать сюда</span>
                    </button>
                  ) : (
                    <div className="w-full">
                      {!crop ? (
                        <div className="space-y-1 w-full p-2 bg-amber-50/50 rounded-2xl border-2 border-dashed border-[#92400E]/20 text-center">
                          <p className="text-[10px] text-amber-950 font-black">РЯДОК ЗАКРЫТ 🪵</p>
                          <p className="text-[9px] text-[#92400E] font-medium leading-normal">Хочешь вспахать новую грядку для посадки семян?</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); buyPlot(selectedPlotId); }}
                            className="w-full mt-2 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-lg cursor-pointer uppercase shadow flex items-center justify-center gap-1 active:scale-95 transition-transform"
                          >
                            <span>🌱 ВСПАХАТЬ ЗА {PLOT_COSTS[selectedPlotId]} 🪙</span>
                          </button>
                        </div>
                      ) : crop.progress > 0 ? (
                        <div className="space-y-1.5 w-full">
                          <p className="text-[10px] text-gray-700 font-black">
                            {CROPS_CONFIG[crop.type].icon} {CROPS_CONFIG[crop.type].nameRu} ({Math.round(crop.progress)}%)
                          </p>

                          {crop.progress >= 100 ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleHarvestCrop(selectedPlotId); }}
                              className="mt-1 w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black rounded-xl cursor-pointer uppercase shadow animate-pulse"
                            >
                              🧺 Собрать!
                            </button>
                          ) : (
                            <div className="w-full">
                              {!crop.isWatered ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleWaterCrop(selectedPlotId); }}
                                  className="w-full py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-black rounded-xl cursor-pointer uppercase flex items-center justify-center gap-1"
                                >
                                  💧 ПОЛИТЬ!
                                </button>
                              ) : (
                                <span className="text-[9px] text-green-700 font-extrabold block bg-green-50 rounded px-1.5 py-0.5">☀️ Подрастает...</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 w-full">
                          <p className="text-[9px] text-[#92400E] font-bold">Что посадим в почву?</p>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {(Object.keys(CROPS_CONFIG) as CropType[]).map((type) => {
                              const config = CROPS_CONFIG[type];
                              const affordable = gameState.coins >= config.seedCost;
                              return (
                                <button
                                  key={type}
                                  onClick={(e) => { e.stopPropagation(); handleBuyAndPlantCrop(selectedPlotId, type); }}
                                  disabled={!affordable}
                                  className={`p-1 rounded-lg border flex flex-col items-center justify-center text-[9px] font-black ${
                                    affordable 
                                      ? "bg-amber-50 hover:bg-amber-100 border-[#D97706]" 
                                      : "bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                                  }`}
                                  title={`Стоимость: ${config.seedCost} монет`}
                                >
                                  <span className="text-lg">{config.icon}</span>
                                  <span className="truncate w-full text-center leading-3">{config.nameRu}</span>
                                  <span className="text-[7.5px] text-slate-500">{config.seedCost}м</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Arrow Pointing Down */}
                  <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-[#92400E] z-10" />
                </div>
              );
            })()}

            {/* I. FLOATING CONTEXT-BUBBLE FOR TREES (Orchard exclusively - No split view!) */}
            {selectedTreeId && (() => {
              const tree = gameState.trees[selectedTreeId];
              const coords = getTreeCoords(selectedTreeId);
              const isNear = isBoyNear(coords.x, coords.y);

              return (
                <div
                  className="absolute bg-white border-2 lg:border-4 border-emerald-700 rounded-2xl lg:rounded-3xl p-2 lg:p-3 shadow-2xl flex flex-col items-center text-center gap-1 lg:gap-2 z-30 select-none animate-scale-up w-[148px] lg:w-[180px]"
                  style={{
                    left: `${coords.x}%`,
                    top: `${coords.y - 14}%`,
                    transform: 'translateX(-50%) translateY(-50%)',
                  }}
                >
                  <span className="text-[9px] lg:text-xs bg-emerald-700 text-white font-black px-1.5 lg:px-2.5 py-0.5 rounded-full scale-90 block">
                    🌳 ПЛОДОВАЯ ЛУНКА 🍎
                  </span>

                  {!isNear ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setBoyPosition(p => ({ ...p, targetX: coords.x, targetY: coords.y + 6, isMoving: true }));
                      }}
                      className="mt-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-full cursor-pointer uppercase flex items-center justify-center gap-1"
                    >
                      <span>🏃‍♂️ Бежать сюда</span>
                    </button>
                  ) : (
                    <div className="w-full">
                      {tree ? (
                        <div className="space-y-1.5 w-full text-[10px] font-black">
                          <p className="text-slate-800 uppercase text-[9px]">{TREES_CONFIG[tree.type].nameRu}</p>
                          <p className="text-slate-500">На ветках: {tree.fruitCount} / {TREES_CONFIG[tree.type].yieldCount} шт.</p>
                          
                          {tree.fruitCount > 0 ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleHarvestTree(selectedTreeId); }}
                              className="w-full py-1.5 bg-yellow-400 hover:bg-yellow-500 text-amber-950 text-[10px] font-black rounded-xl cursor-pointer uppercase shadow"
                            >
                              🍎 Стрясти Ветки!
                            </button>
                          ) : (
                            <span className="text-[9px] text-emerald-800 bg-emerald-50 rounded px-2 py-0.5 block">⏳ Спеет плод...</span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 w-full">
                          <p className="text-[9px] text-emerald-950 font-bold">Посадим прекрасный сад?</p>
                          <div className="grid grid-cols-2 gap-1.5 mt-1">
                            {(Object.keys(TREES_CONFIG) as TreeType[]).map((type) => {
                              const config = TREES_CONFIG[type];
                              const affordable = gameState.coins >= config.cost;
                              return (
                                <button
                                  key={type}
                                  onClick={(e) => { e.stopPropagation(); handleBuyTreeOrUpgrade(selectedTreeId, type); }}
                                  disabled={!affordable}
                                  className={`p-1 rounded-xl border flex flex-col items-center justify-center text-[9px] font-black ${
                                    affordable 
                                      ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-500 text-emerald-950" 
                                      : "bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed"
                                  }`}
                                >
                                  <span className="text-xl">{config.icon}</span>
                                  <span className="truncate w-full leading-3">{config.nameRu}</span>
                                  <span className="text-[8px] text-emerald-800">{config.cost}м</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Arrow Pointing Down */}
                  <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-emerald-700 z-10" />
                </div>
              );
            })()}

            {/* J. FLOATING CONTEXT-BUBBLE FOR ANIMALS (All operations right on top!) */}
            {selectedAnimalId && (() => {
              const animal = gameState.animals.find(a => a.id === selectedAnimalId);
              if (!animal) return null;
              const template = ANIMAL_TEMPLATES[animal.species];
              const isNear = isBoyNear(animal.x, animal.y);
              const foodCount = gameState.inventory[template.foodType] || 0;

              return (
                <div
                  className="absolute bg-white border-2 lg:border-4 border-[#92400E] rounded-xl lg:rounded-[24px] p-1.5 lg:p-2.5 shadow-2xl flex flex-col items-center text-center gap-1 lg:gap-1.5 z-30 select-none animate-scale-up w-[162px] lg:w-[210px]"
                  style={{
                    left: `${animal.x}%`,
                    top: `${animal.y - 15}%`,
                    transform: 'translateX(-50%) translateY(-50%)',
                  }}
                >
                  <div className="text-[10px] lg:text-sm font-sans font-black text-slate-800 leading-3">
                    {animal.customName} {template.emoji}
                  </div>
                  <div className="text-[8px] lg:text-[10px] text-slate-500 font-extrabold uppercase bg-amber-50 rounded px-1">{template.nameRu}</div>

                  {!isNear ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setBoyPosition(p => ({ ...p, targetX: animal.x, targetY: animal.y, isMoving: true }));
                      }}
                      className="mt-0.5 lg:mt-1 py-1 lg:py-2 px-2 lg:px-4 bg-[#D97706] hover:bg-[#B45309] text-white text-[9px] lg:text-xs font-black rounded-full cursor-pointer uppercase flex items-center justify-center gap-1"
                    >
                      <span>🏃‍♂️ Иди ко мне!</span>
                    </button>
                  ) : (
                    <div className="w-full space-y-0.5 lg:space-y-1 px-0.5 lg:px-1">
                      {/* STATS */}
                      <div className="flex justify-between text-[8px] lg:text-[10px] text-slate-600 font-black border-b pb-0.5 mb-0.5 lg:mb-1 bg-slate-50 p-0.5 lg:p-1 rounded">
                        <span>🍗Еда: {animal.isFed ? "сыт 💚" : "хочет 🥺"}</span>
                        <span>🧼Чистка: {Math.round(animal.cleanliness)}%</span>
                      </div>

                      {/* FEED BUTTON */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleFeedAnimal(animal.id); }}
                        className="w-full py-1 lg:py-2 bg-yellow-400 hover:bg-yellow-500 text-[#402315] text-[9px] lg:text-xs font-black rounded-md lg:rounded-lg cursor-pointer flex items-center justify-center gap-1 uppercase border-b-2 border-yellow-600"
                      >
                        🌾 Кормить ({foodCount} шт)
                      </button>

                      {/* BRUSH BUTTON */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePetAnimal(animal.id); }}
                        className="w-full py-1 lg:py-2 bg-blue-400 hover:bg-blue-500 text-white text-[9px] lg:text-xs font-black rounded-md lg:rounded-lg cursor-pointer flex items-center justify-center gap-1 uppercase border-b-2 border-blue-600"
                      >
                        🧼 Погладить & щетка
                      </button>

                      {/* GATHER PRODUCT */}
                      {animal.productionProgress >= 100 && (
                        animal.species === AnimalSpecies.SHEEP ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleShearSheep(animal.id); }}
                            className="w-full py-1 lg:py-2 bg-pink-500 hover:bg-pink-600 text-white text-[9px] lg:text-xs font-bold rounded-md lg:rounded-lg cursor-pointer flex items-center justify-center gap-1 uppercase animate-pulse shadow-sm border-b-2 border-pink-700"
                          >
                            ✂️ Постричь шерсть!
                          </button>
                        ) : [AnimalSpecies.COW, AnimalSpecies.GOAT].includes(animal.species) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMilkAnimal(animal.id); }}
                            className="w-full py-1 lg:py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-[9px] lg:text-xs font-bold rounded-md lg:rounded-lg cursor-pointer flex items-center justify-center gap-1 uppercase animate-pulse shadow-sm border-b-2 border-cyan-700"
                          >
                            🥛 Подоить молоко!
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCollectProduct(animal.id); }}
                            className="w-full py-1 lg:py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] lg:text-xs font-bold rounded-md lg:rounded-lg cursor-pointer flex items-center justify-center gap-1 uppercase animate-pulse shadow-sm border-b-2 border-emerald-700"
                          >
                            🧺 Собрать {template.productIcon}
                          </button>
                        )
                      )}

                      {/* SELL / DISMISS ANIMAL */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Отпустить красавца в лес играть? Получишь компенсацию.`)) {
                            handleSellAnimal(animal.id);
                          }
                        }}
                        className="w-full py-0.5 lg:py-1 mt-0.5 lg:mt-1 text-[8px] lg:text-[10px] bg-red-50 text-red-700 hover:bg-red-100 font-extrabold rounded-md cursor-pointer uppercase block border border-red-200"
                      >
                        🍂 Отпустить погулять
                      </button>
                    </div>
                  )}
                  {/* Arrow Pointing Down */}
                  <div className="absolute -bottom-2.5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-[#92400E] z-10" />
                </div>
              );
            })()}

            </div> {/* END OF scrolling-stage */}

            {/* --- MULTI-ROOM / LEVEL NAVIGATION ARROWS (all 7 locations) --- */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevZone();
              }}
              className={`absolute left-2 sm:left-3 top-[50%] transform -translate-y-1/2 bg-gradient-to-b from-[#FEF3C7] to-[#FDE68A] hover:from-white hover:to-amber-50 border-4 border-[#7A4E31] rounded-[20px] flex flex-col items-center gap-0.5 shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 z-30 cursor-pointer ${
                isPhone ? "p-2.5 px-3 min-w-[52px] min-h-[52px]" : "p-2 px-2.5"
              }`}
              id="transition-left-room"
            >
              <span className={`${isPhone ? "text-2xl" : "text-xl"} animate-bounce-slow`}>⬅️</span>
              {!isPhone && (
                <>
                  <span className="text-[8px] font-black text-[#5C3A21] uppercase tracking-wider leading-none">Назад</span>
                  <span className="text-[7.5px] font-extrabold text-[#92400E] max-w-[55px] truncate leading-none mt-0.5 text-center">{LOCATIONS[prevZone].nameRu}</span>
                </>
              )}
            </button>

            {(() => {
              const isUnlocked = gameState.unlockedLocations.includes(nextZone);
              const nextConfig = LOCATIONS[nextZone];
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextZone();
                  }}
                  className={`absolute right-2 sm:right-3 top-[50%] transform -translate-y-1/2 rounded-[20px] flex flex-col items-center gap-0.5 shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 z-30 border-4 cursor-pointer ${
                    isPhone ? "p-2.5 px-3 min-w-[52px] min-h-[52px]" : "p-2 px-2.5"
                  } ${
                    isUnlocked
                      ? "bg-gradient-to-b from-[#FEF3C7] to-[#FDE68A] border-[#7A4E31] text-[#5C3A21] hover:from-white hover:to-amber-50"
                      : "bg-stone-100 border-stone-400 text-stone-500 opacity-95 cursor-help"
                  }`}
                  id="transition-right-room"
                >
                  <span className={isPhone ? "text-2xl" : "text-xl"}>{isUnlocked ? "➡️" : "🔒"}</span>
                  {!isPhone && (
                    <>
                      <span className="text-[8px] font-black uppercase tracking-wider leading-none">{isUnlocked ? "Вперед" : "Закрыто"}</span>
                      <span className="text-[7.5px] font-extrabold max-w-[55px] truncate leading-none mt-0.5 text-center text-[#92400E]">
                        {isUnlocked ? nextConfig.nameRu : `Ур. ${nextConfig.minLevel}`}
                      </span>
                    </>
                  )}
                </button>
              );
            })()}

          </div>
        </div>

      </main>

      {/* TODDLER-FRIENDLY POPUP OVERLAY SHOP MODAL (No giant menus at the bottom!) */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 lg:p-4 animate-fade-in" id="shop-modal-panel">
          <div className="bg-[#FFFCEF] border-4 lg:border-8 border-[#6B3F23] rounded-2xl lg:rounded-[42px] p-3 lg:p-6 shadow-2xl max-w-[min(92vw,360px)] lg:max-w-2xl w-full relative max-h-[80vh] lg:max-h-[92vh] overflow-y-auto animate-scale-up" id="merchant-nearby-drawer">
            {/* Close Shop Button */}
            <button
              onClick={() => { playClickSound(); setShowShopModal(false); }}
              className="absolute top-2 right-2 lg:top-4 lg:right-4 w-8 h-8 lg:w-10 lg:h-10 bg-white hover:bg-rose-50 text-rose-600 border-2 lg:border-4 border-[#6B3F23] transition rounded-full cursor-pointer shadow-md font-black text-xs lg:text-sm flex items-center justify-center"
            >
              ❌
            </button>

            {/* Shop Header */}
            <div className="text-center mb-2 lg:mb-4 border-b-2 lg:border-b-4 border-dashed border-[#6B3F23]/25 pb-2 lg:pb-3">
              <span className="text-3xl lg:text-5xl select-none">🏪</span>
              <h2 className="text-lg lg:text-2xl font-black text-[#6B3F23] mt-0.5 lg:mt-1">Рынок купца Семена</h2>
              <p className="text-[10px] lg:text-xs text-amber-800 font-bold">Веселый и мирный обмен без забоя животных! 🌸</p>
            </div>

             {/* Central big category tabs */}
            <div className="flex flex-wrap gap-1 lg:gap-1.5 justify-center mb-2 lg:mb-4 bg-[#6B3F23]/10 p-1 lg:p-1.5 rounded-xl lg:rounded-2xl" id="shop-tabs">
              {(["sell", "animals", "upgrades", "lands", "workers"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { playClickSound(); setShopActiveTab(tab); }}
                  className={`flex-1 min-w-[68px] lg:min-w-[90px] py-1 lg:py-2 px-1.5 lg:px-3 text-center text-[9px] lg:text-xs font-black rounded-lg lg:rounded-xl uppercase transition cursor-pointer border-2 ${
                    shopActiveTab === tab
                      ? "bg-[#6B3F23] text-white border-yellow-500 shadow-md scale-103"
                      : "bg-white text-[#6B3F23] border-transparent hover:bg-amber-50"
                  }`}
                >
                  {tab === "sell" && "💰 Сбыт"}
                  {tab === "animals" && "🐣 Зверята"}
                  {tab === "upgrades" && "🪄 Навыки"}
                  {tab === "lands" && "🗺️ Карта"}
                  {tab === "workers" && "💼 Рабочие"}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: 1. SELL MERCHANDISE */}
            {shopActiveTab === "sell" && (
              <div className="space-y-2 lg:space-y-4">
                {/* GIANT SATISFYING BUTTON TO SELL ALL FOR KIDS */}
                <div className="bg-yellow-400/90 border-2 lg:border-4 border-yellow-600 rounded-xl lg:rounded-[24px] p-2 lg:p-4 text-center shadow-lg transform hover:scale-102 transition-transform">
                  <span className="text-2xl lg:text-4xl block animate-bounce-slow">🪙</span>
                  <p className="text-[9px] lg:text-xs text-amber-950 font-black mt-0.5 lg:mt-1 uppercase tracking-wide">Самая крутая кнопка на ферме:</p>
                  <button
                    onClick={handleSellAllProducts}
                    className="mt-1.5 lg:mt-2 py-2 lg:py-3 px-4 lg:px-8 rounded-xl lg:rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-black text-xs lg:text-sm border-b-4 border-orange-700 shadow-md active:translate-y-0.5 cursor-pointer uppercase w-full sm:w-auto"
                  >
                    💰 ПРОДАТЬ ВСЁ НАШЕ ДОБРО! 💰
                  </button>
                  <p className="text-[8px] lg:text-[10px] text-amber-900 font-bold mt-1 lg:mt-2">Купец Семен выкупит весь сорванный урожай, молоко и шерстку одной кнопкой!</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 lg:gap-2 max-h-[130px] lg:max-h-[220px] overflow-y-auto pr-1">
                  {Object.keys(gameState.inventory).filter(k => !k.endsWith("_SEED")).map((key) => {
                    const count = gameState.inventory[key];
                    if (count <= 0) return null;

                    let basePrice = 10;
                    let icon = "📦";
                    let nameRu = key;
                    if (key === "WHEAT") { basePrice = 8; icon = "🌾"; nameRu = "Пшеница"; }
                    else if (key === "CARROT") { basePrice = 18; icon = "🥕"; nameRu = "Морковь"; }
                    else if (key === "CLOVER") { basePrice = 32; icon = "☘️"; nameRu = "Клевер"; }
                    else if (key === "CABBAGE") { basePrice = 50; icon = "🥬"; nameRu = "Капуста"; }
                    else if (key === "APPLE") { basePrice = 50; icon = "🍎"; nameRu = "Яблоко"; }
                    else if (key === "CHERRY") { basePrice = 80; icon = "🍒"; nameRu = "Вишня"; }
                    else {
                      const template = Object.values(ANIMAL_TEMPLATES).find((t) => t.productName === key);
                      if (template) {
                        basePrice = template.productPrice;
                        icon = template.productIcon;
                        nameRu = template.productName;
                      }
                    }

                    const marketMultiplier = 1 + ((gameState.upgrades.marketContract || 1) - 1) * 0.10;
                    const finalPrice = Math.round(basePrice * marketMultiplier);

                    return (
                      <div key={key} className="bg-white p-1.5 lg:p-2.5 rounded-xl lg:rounded-2xl border-2 border-[#6B3F23]/15 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-1.5 lg:gap-2">
                          <span className="text-2xl lg:text-3xl select-none">{icon}</span>
                          <div>
                            <h4 className="font-black text-[10px] lg:text-xs text-[#6B3F23]">{nameRu}</h4>
                            <p className="text-[8px] lg:text-[9px] text-gray-500 font-black">У тебя в заначе: {count} шт.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSellProductGroup(key, count)}
                          className="py-0.5 lg:py-1 px-2 lg:px-3 bg-[#FEF3C7] hover:bg-[#FEF9E7] border border-[#D97706]/40 rounded-lg lg:rounded-xl text-[8px] lg:text-[9.5px] font-black text-[#92400E] cursor-pointer"
                        >
                          Сбыть ({finalPrice * count}м)
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. BUY ANIMALS */}
            {shopActiveTab === "animals" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 lg:gap-2.5 max-h-[240px] lg:max-h-[360px] overflow-y-auto pr-1">
                {(Object.keys(ANIMAL_TEMPLATES) as AnimalSpecies[]).map((species) => {
                  const config = ANIMAL_TEMPLATES[species];
                  const isAffordable = gameState.coins >= config.cost;

                  return (
                    <div
                      key={species}
                      className={`bg-white p-2 lg:p-3 rounded-2xl lg:rounded-3xl border-2 lg:border-4 flex flex-col justify-between text-center transition-all shadow-sm ${
                        isAffordable ? "border-[#6B3F23]/15 hover:border-[#6B3F23]/50" : "border-slate-100 opacity-60"
                      }`}
                    >
                      <div>
                        <span className="text-2xl lg:text-4xl filter drop-shadow inline-block animate-bounce-slow mt-0.5 lg:mt-1 select-none">
                          {config.emoji}
                        </span>
                        <h4 className="font-extrabold text-xs text-amber-950 mt-1 line-clamp-1 uppercase">
                          {config.nameRu.split(" ")[0]}
                        </h4>
                        <p className="text-[8.5px] text-gray-500 mt-1 min-h-[25px] line-clamp-2 leading-3 font-semibold">
                          Любит: {config.foodNameRu} {config.foodType === "WHEAT" ? "🌾" : config.foodType === "CARROT" ? "🥕" : "☘️"}
                        </p>
                      </div>

                      <div className="mt-2.5 border-t border-[#6B3F23]/10 pt-2 bg-slate-50/50 rounded-xl p-1">
                        <button
                          onClick={() => handleBuyAnimal(species)}
                          disabled={!isAffordable}
                          className={`w-full py-1 rounded-xl text-[9.5px] font-black flex items-center justify-center gap-1 cursor-pointer ${
                            isAffordable
                              ? "bg-yellow-400 hover:bg-yellow-500 text-[#402315] border-b-2 border-yellow-600 active:translate-y-0.5"
                              : "bg-slate-100 text-slate-400 border-dashed border border-slate-200 cursor-not-allowed"
                          }`}
                        >
                          <Coins className="w-3 h-3 text-amber-700" />
                          <span>{config.cost} золотых</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: 3. SKILLS UPGRADES & SEEDS */}
            {shopActiveTab === "upgrades" && (
              <div className="space-y-2 lg:space-y-4 max-h-[260px] lg:max-h-[380px] overflow-y-auto pr-1">
                {/* Seed purchasing safeguards */}
                <div className="bg-amber-100/40 p-3 rounded-2xl border-2 border-dashed border-[#6B3F23]/20">
                  <h4 className="text-[10px] font-black text-[#5C3A21] uppercase tracking-wider block mb-1.5">🆘 Семена закончились и не растут? Закупи новые здесь:</h4>
                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      onClick={() => {
                        if (gameState.coins >= 10) {
                          setGameState(p => ({
                            ...p,
                            coins: p.coins - 10,
                            inventory: { ...p.inventory, "WHEAT_SEED": (p.inventory["WHEAT_SEED"] || 0) + 2 }
                          }));
                          playClickSound();
                          triggerNotification("🌱 Куплено 2 шт. семян Пшеницы!");
                        } else {
                          triggerNotification("😢 Не хватает золотых монет!");
                        }
                      }}
                      className="py-1.5 px-3 rounded-xl bg-white hover:bg-amber-50 border border-amber-600 text-[10px] font-black text-[#532D15] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      🌾 Закупить семена Пшеницы (2 шт.) за 10м
                    </button>
                    <button
                      onClick={() => {
                        if (gameState.coins >= 15) {
                          setGameState(p => ({
                            ...p,
                            coins: p.coins - 15,
                            inventory: { ...p.inventory, "CARROT_SEED": (p.inventory["CARROT_SEED"] || 0) + 2 }
                          }));
                          playClickSound();
                          triggerNotification("🌱 Куплено 2 шт. семян Моркови!");
                        } else {
                          triggerNotification("😢 Не хватает золотых монет!");
                        }
                      }}
                      className="py-1.5 px-3 rounded-xl bg-white hover:bg-[#FFF8EE] border border-orange-500 text-[10px] font-black text-[#532D15] flex items-center justify-center gap-1 cursor-pointer"
                    >
                      🥕 Закупить семена Моркови (2 шт.) за 15м
                    </button>
                  </div>
                </div>

                {/* Skills rendering lists */}
                <div className="space-y-2">
                  {Object.keys(UPGRADES).map((id) => {
                    const upgrade = UPGRADES[id];
                    const currentLvl = gameState.upgrades[id] || 1;
                    const maxedOut = currentLvl >= upgrade.maxLevel;
                    const cost = upgrade.cost * currentLvl;
                    const isAffordable = gameState.coins >= cost && !maxedOut;

                    return (
                      <div key={id} className="bg-white p-2 lg:p-3 rounded-xl lg:rounded-2xl border-2 border-[#6B3F23]/15 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-1.5 lg:gap-2.5">
                          <span className="text-2xl lg:text-3xl bg-amber-50 p-1 lg:p-1.5 rounded-lg lg:rounded-xl border border-amber-100 select-none">{upgrade.icon}</span>
                          <div>
                            <h4 className="font-black text-xs text-[#6B3F23] flex items-center gap-1.5">
                              <span>{upgrade.nameRu}</span>
                              <span className="bg-amber-100 text-[#92400E] text-[8.5px] px-1.5 py-0.2 rounded-full border border-orange-200">
                                Ур. {currentLvl} / {upgrade.maxLevel}
                              </span>
                            </h4>
                            <p className="text-[9px] text-[#9209] text-gray-500 leading-3 mt-0.5">{upgrade.description}</p>
                          </div>
                        </div>
                        <div>
                          {maxedOut ? (
                            <span className="text-[9px] text-green-700 bg-green-50 font-black px-2.5 py-1 rounded-full border border-green-300">МАКСИМУМ</span>
                          ) : (
                            <button
                              onClick={() => handleUpgradeFarm(id)}
                              disabled={!isAffordable}
                              className={`py-1.5 px-3.5 rounded-xl text-[9.5px] font-black cursor-pointer transition flex items-center gap-0.5 uppercase ${
                                isAffordable
                                  ? "bg-yellow-400 hover:bg-yellow-500 text-amber-950 border-b-2 border-yellow-600 active:translate-y-0.5"
                                  : "bg-slate-100 text-slate-400 border-dashed border border-slate-200 cursor-not-allowed opacity-75"
                              }`}
                            >
                              <Coins className="w-3 h-3 text-amber-700" />
                              <span>{cost}м</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. LAND PLOTS & BUILDINGS */}
            {shopActiveTab === "lands" && (
              <div className="space-y-2 lg:space-y-4 max-h-[260px] lg:max-h-[380px] overflow-y-auto pr-1">
                <div className="text-center font-extrabold text-[#5C3A21] text-[10px] uppercase bg-[#FFFDF5] p-2 rounded-xl border border-amber-200 shadow-inner">
                  🗺️ Открывайте новые заповедники и стройте на них чудесные здания для бонусов!
                </div>

                {Object.keys(LOCATIONS).map((locId) => {
                  const loc = LOCATIONS[locId as LocationId];
                  const isUnlocked = gameState.unlockedLocations.includes(locId as LocationId);
                  const isAffordable = gameState.coins >= loc.unlockCost && gameState.level >= loc.minLevel;
                  const locationBuildings = BUILDINGS_TEMPLATES[locId as LocationId] || [];

                  return (
                    <div key={locId} className={`bg-white p-2 lg:p-3 rounded-xl lg:rounded-2xl border-2 flex flex-col gap-2 lg:gap-3 shadow-xs ${isUnlocked ? "border-green-400 bg-green-50/10" : "border-[#6B3F23]/15"}`}>
                      {/* FIRST ROW: LAND LOCATION DETAILS */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl lg:text-3xl bg-[#FEF3C7] p-1.5 lg:p-2 rounded-lg lg:rounded-xl h-10 w-10 lg:h-12 lg:w-12 flex items-center justify-center">
                            {locId === "MEADOW" && "🌸"}
                            {locId === "BARNYARD" && "🏡"}
                            {locId === "LAKESIDE" && "🦆"}
                            {locId === "ORCHARD" && "🌳"}
                            {locId === "DESERT" && "🏜️"}
                            {locId === "FOREST" && "🌲"}
                            {locId === "LAKE" && "🌊"}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 leading-4">
                              <span>{loc.nameRu}</span>
                              {isUnlocked && <span className="text-[8px] bg-green-100 text-green-700 px-1.5 rounded-full font-black">ОТКРЫТО!</span>}
                            </h4>
                            <p className="text-[9px] text-[#9209] text-gray-500 leading-3 mt-1 max-w-[280px]">{loc.description}</p>
                          </div>
                        </div>

                        <div>
                          {isUnlocked ? (
                            <span className="text-[9px] text-green-700 font-extrabold bg-green-50 p-1 px-2.5 border border-green-200 rounded-full">Разблокирована</span>
                          ) : (
                            <div className="text-right space-y-0.5 shrink-0">
                              <button
                                onClick={() => handleUnlocks(locId as LocationId, loc.unlockCost, loc.minLevel)}
                                className={`py-1.5 px-3 rounded-xl text-[10px] font-black cursor-pointer transition shadow-sm ${
                                  isAffordable
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-slate-100 text-slate-400 border-dashed border-2 cursor-not-allowed opacity-75"
                                }`}
                              >
                                Отпереть за {loc.unlockCost}м
                              </button>
                              <span className="text-[8px] text-[#92400E] font-black uppercase block">ур. {loc.minLevel}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* SUB-SECTION: BUILDINGS */}
                      {isUnlocked && locationBuildings.length > 0 && (
                        <div className="bg-amber-50/50 border border-amber-900/10 rounded-xl p-2.5 mt-1 space-y-2">
                          <span className="text-[9px] font-black text-amber-900 uppercase tracking-wider block border-b border-amber-900/10 pb-1">
                            🏗️ Архитектура и Строения ({locationBuildings.length})
                          </span>
                          
                          <div className="space-y-2">
                            {locationBuildings.map((bld) => {
                              const alreadyOwned = gameState.buildings?.[locId]?.includes(bld.id) || false;
                              const canAffordBld = gameState.coins >= bld.cost && gameState.level >= bld.minLevel;

                              return (
                                <div key={bld.id} className="flex items-center justify-between bg-white/85 p-2 rounded-lg border border-amber-950/5 gap-1.5 text-left shadow-2xs">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">{bld.emoji}</span>
                                    <div>
                                      <h5 className="text-[10px] font-black text-[#5C3A21] leading-3">{bld.nameRu}</h5>
                                      <span className="text-[8px] font-extrabold text-[#2F855A] block leading-3 mt-0.5">⭐ Бонус: {bld.benefitRu}</span>
                                      <span className="text-[8.5px] text-stone-500 block leading-3">{bld.description}</span>
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    {alreadyOwned ? (
                                      <span className="text-[8px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">🏗️ Построено!</span>
                                    ) : (
                                      <button
                                        onClick={() => handleBuyBuilding(locId, bld.id, bld.cost, bld.minLevel)}
                                        className={`p-1 px-2.5 rounded-lg text-[9px] font-extrabold transition cursor-pointer ${
                                          canAffordBld
                                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                                            : "bg-stone-100 text-stone-400 cursor-not-allowed"
                                        }`}
                                        title={`Требуется Уровень ${bld.minLevel}`}
                                      >
                                        Купить: {bld.cost}м
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: 5. RECRUIT / HIRE WORKERS */}
            {shopActiveTab === "workers" && (
              <div className="space-y-2 lg:space-y-3.5 max-h-[260px] lg:max-h-[380px] overflow-y-auto pr-1">
                {/* Intro child tip */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3 text-xs text-blue-900 font-bold" id="workers-tip">
                  💡 <strong>Совет Максима:</strong> Рабочие будут автоматически делать повседневные дела, пока у тебя есть монетки! Их зарплата вычитается в конце каждого дня 🌅. Если денег не останется, они уйдут.
                </div>
                
                {(gameState.workers || []).map((worker) => {
                  const isAffordableToHire = gameState.coins >= worker.dailyWage;
                  return (
                    <div key={worker.id} className={`bg-white p-2 lg:p-3 rounded-xl lg:rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between shadow-xs ${worker.isActive ? "border-green-400 bg-green-50/10" : "border-[#6B3F23]/15"}`}>
                      <div className="flex items-center gap-2 lg:gap-3 w-full sm:w-auto">
                        <span className={`text-3xl lg:text-4xl p-1.5 lg:p-2.5 rounded-xl lg:rounded-2xl ${worker.color}`}>
                          {worker.emoji}
                        </span>
                        <div className="text-left">
                          <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{worker.name}</span>
                            <span className="text-[10px] text-[#92400E] font-black italic">({worker.roleRu})</span>
                            {worker.isActive ? (
                              <span className="text-[8px] bg-green-100 text-green-700 px-1.5 rounded-full font-black animate-pulse">РАБОТАЕТ</span>
                            ) : (
                              <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 rounded-full font-black">ОТДЫХАЕТ</span>
                            )}
                          </h4>
                          <p className="text-[9px] text-slate-500 leading-3.5 mt-1.5 max-w-[340px]">
                            {WORKER_DESCRIPTIONS[worker.id] || worker.statusText}
                          </p>
                          <div className="text-[9px] text-[#92400E] font-extrabold mt-1">Оплата: {worker.dailyWage} монет 🪙 / день</div>
                        </div>
                      </div>
                      <div className="w-full sm:w-auto mt-2 sm:mt-0 text-right">
                        <button
                          onClick={() => {
                            // Toggle worker hiring contract
                            setGameState((prev) => {
                              const updatedWorkers = (prev.workers || []).map((w) => {
                                if (w.id === worker.id) {
                                  if (w.isActive) {
                                    setTimeout(() => {
                                      playClickSound();
                                      triggerNotification(`💼 ${w.name} ушел на отдых.`);
                                    }, 40);
                                    return {
                                      ...w,
                                      isActive: false,
                                      statusText: "Завершен контракт"
                                    };
                                  } else {
                                    if (prev.coins < w.dailyWage) {
                                      setTimeout(() => {
                                        playSadSound();
                                        triggerNotification(`😢 Не хватает ${w.dailyWage}м для аванса ${w.name}!`);
                                      }, 40);
                                      return w;
                                    }
                                    prev.coins -= w.dailyWage;
                                    setTimeout(() => {
                                      playCoinSound();
                                      triggerNotification(`🎉 ${w.name} приступил к обязанностям!`);
                                    }, 40);
                                    return {
                                      ...w,
                                      isActive: true,
                                      statusText: "Помогает ухаживать за фермой"
                                    };
                                  }
                                }
                                return w;
                              });
                              return {
                                ...prev,
                                workers: updatedWorkers
                              };
                            });
                          }}
                          className={`w-full sm:w-auto py-1.5 px-3.5 rounded-xl text-[10px] font-black cursor-pointer transition shadow-sm ${
                            worker.isActive
                              ? "bg-rose-500 hover:bg-rose-600 text-white"
                              : isAffordableToHire
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-slate-100 text-slate-400 border-dashed border-2 cursor-not-allowed opacity-75"
                          }`}
                        >
                          {worker.isActive ? "Уволить 💼" : "Нанять за " + worker.dailyWage + "м"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dialogue footer statistics */}
            <div className="mt-2 lg:mt-4 pt-2 lg:pt-3.5 border-t-2 lg:border-t-4 border-dashed border-[#6B3F23]/15 flex justify-between items-center text-[8px] lg:text-[10px] text-[#6B3F23] font-black uppercase tracking-wider">
              <span>Золотой баланс: <strong className="text-yellow-600">{gameState.coins} монет 🪙</strong></span>
              <span>Максим Фермер • Весело и Мирно!</span>
            </div>
          </div>
        </div>
      )}

      {/* Help Instructions popup Overlay */}
      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}

      {/* Floating brief action banner feedback */}
      {customNotification && (
        <div className="fixed bottom-4 lg:bottom-6 left-1/2 transform -translate-x-1/2 bg-[#FFFBEB] text-[#92400E] text-[10px] lg:text-sm font-black p-2 px-4 lg:p-3.5 lg:px-6 rounded-2xl lg:rounded-3xl shadow-2xl border-2 lg:border-4 border-[#92400E] z-50 animate-bounce-slow flex items-center gap-1.5 lg:gap-2 max-w-[92vw]" id="live-notification">
          <span className="text-base lg:text-xl animate-spin-slow">🌟</span>
          <span>{customNotification}</span>
        </div>
      )}
    </div>
  );
}
