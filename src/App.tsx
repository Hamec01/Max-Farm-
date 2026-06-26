/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { PlayerState, AnimalSpecies, LocationId, CropType, TreeType, AnimalInstance, CropInstance, TreeInstance, Butterfly, FallingStar, Flower } from "./types";
import { INITIAL_STATE, ANIMAL_TEMPLATES, CROPS_CONFIG, TREES_CONFIG, LOCATIONS, UPGRADES, BUILDINGS_TEMPLATES, WORKER_DESCRIPTIONS, loadSavedGameState } from "./data";
import { GameHeader } from "./components/GameHeader";
import { CoinIcon, CoinPrice, FloatParticle, GameIcon } from "./components/CoinIcon";
import { AnimalShopIcon, SkillIcon, WorkerShopIcon } from "./components/ShopIcons";
import { HelpOverlay } from "./components/HelpOverlay";
import { AnimalSVG } from "./components/AnimalSVG";
import { GroundFoliage } from "./components/GroundFoliage";
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
  playDogBarkSound,
  updateBackgroundMusic,
} from "./lib/soundManager";
import { useGameViewport } from "./hooks/useGameViewport";
import {
  resolveEffectiveZoom,
  resolveCameraShifts,
  resolveDesktopZoom,
  resolveDesktopShiftX,
  buildStageTransform,
  screenFractionToWorld,
  isPointInCameraView,
  shouldCullOffscreen,
  decorLoopMs,
  maxDecorButterflies,
  shouldSpawnWind,
  saveDebounceMs,
  isLiteEffects,
} from "./lib/mobileCamera";
import { stepBoyWalk, BOY_FOOTSTEP_EVERY, type BoyWalkState } from "./lib/boyMovement";
import { createZoneFlower, getBouquetCatalogEntry, getZoneFlora, seedZoneFlowers } from "./data/zoneFlora";
import {
  applyKinematicsToAnimal,
  clearDragRoamerDom,
  computeThrowVelocity,
  isAnimalAirborne,
  placeAnimalDom,
  placeWorkerDom,
  resolveGroundY,
  resolveWorkerGroundY,
  setDragRoamerPosition,
  stepToss,
  stepWalk,
  TOSS_MAX_ANGLE,
  workerAirborne,
} from "./lib/tossPhysics";
import {
  setPerformanceDeviceKind,
  gameTickMs,
  shouldSpinTossedSprites,
} from "./lib/performanceProfile";
import {
  separateAnimalsByLocationSkipAirborne,
  wanderAnimalAvoidingOthers,
  findAnimalSpawnPosition,
} from "./lib/animalSpacing";
import {
  applyPenConstraints,
  findPenAtPoint,
  canSpeciesUsePen,
  getPenTemplate,
  herdAnimalTowardPen,
  isAnimalInsidePen,
  getPenTypeEmoji,
  getPenTypeLabel,
  LAKESIDE_POND,
} from "./lib/penLogic";
import { PEN_TEMPLATES } from "./data/pens";
import { GARDEN_PLOT_COORDS, GARDEN_ROW_Y } from "./data/gardenPlots";
import {
  getPlantingCropOrder,
  plantOneEmptyGardenPlot,
  waterOneDryGardenPlot,
  harvestOneRipeGardenPlot,
  resolveAnimalFood,
  feedOneHungryAnimalInZone,
  getWorkerDutyZone,
  POULTRY_SPECIES,
  WATER_BIRD_SPECIES,
  GARDEN_PLOT_IDS,
} from "./lib/farmAutomation";
import { pickWorkerTravelZone, randomSpotInZone, ZONE_TRAVEL_LABEL } from "./lib/workerTravel";
import {
  beginZoneTravel,
  canStartZoneTravel,
  completeZoneExit,
  findWorkerTaskTarget,
  performWorkerTask,
  randomWanderTarget,
  WORKER_TRAVEL_WALK_SPEED,
  WORKER_ARRIVE_DIST,
  workerNeedsMovement,
  type WorkerPositionState,
} from "./lib/workerMovement";
import { WORLD_ZONES, isInteriorZone } from "./data/locations";
import { WorkerSVG } from "./components/WorkerSVG";
import { ScarecrowSVG } from "./components/ScarecrowSVG";
import { MaxHomeInterior } from "./components/MaxHomeInterior";
import { MaxHomeShop } from "./components/MaxHomeShop";
import { MaxWardrobeModal } from "./components/MaxWardrobeModal";
import { MAX_HOME_FURNITURE } from "./data/maxHomeFurniture";
import { getMaxOutfit, getMaxOutfitSpriteSrc, isMaxOutfitOwned } from "./data/maxOutfits";
import { LocationMapModal } from "./components/LocationMapModal";
import { InputDebugOverlay } from "./components/InputDebugOverlay";
import { isDoubleTap } from "./lib/input/doubleTap";
import {
  beginLongPress,
  cancelLongPress,
  endLongPress,
  moveLongPress,
} from "./lib/input/longPress";
import { reportInputDebug } from "./lib/input/inputDebug";
import { PondFish } from "./types";
import { Sparkles, Trophy, Sprout, Heart, MapPin, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, BookOpen, ShoppingBag, Coins, RefreshCw, Star, Trash2 } from "lucide-react";

interface FishInstance extends PondFish {
  scaleX: number;
}

const PLOT_COSTS: Record<string, number> = {
  plot5: 120,
  plot6: 200,
  plot7: 320,
  plot8: 480,
  plot9: 650,
  plot10: 850,
  plot11: 1100,
  plot12: 1400,
  plot13: 1700,
  plot14: 2000,
  plot15: 2350,
  plot16: 2700,
  plot17: 3100,
  plot18: 3500,
  plot19: 3950,
  plot20: 4400,
  plot21: 4900,
  plot22: 5400,
  plot23: 5900,
  plot24: 6500,
};
const ALL_PLOT_IDS = GARDEN_PLOT_IDS;

export default function App() {
  const { zoomScale, deviceKind } = useGameViewport();
  const isPhone = deviceKind === "phone";
  const isCompact = deviceKind !== "desktop";
  const liteEffects = isLiteEffects(deviceKind);

  useEffect(() => {
    setPerformanceDeviceKind(deviceKind);
  }, [deviceKind]);

  // Load state from local storage or use initial state
  const [gameState, setGameState] = useState<PlayerState>(() => loadSavedGameState());

  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [draggedAnimalId, setDraggedAnimalId] = useState<string | null>(null);
  const draggedAnimalIdRef = useRef<string | null>(null);
  const draggedWorkerIdRef = useRef<string | null>(null);
  const [draggedWorkerId, setDraggedWorkerId] = useState<string | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [showShopModal, setShowShopModal] = useState<boolean>(false);
  const [isBagCollapsed, setIsBagCollapsed] = useState<boolean>(false);
  const [shopActiveTab, setShopActiveTab] = useState<"sell" | "animals" | "upgrades" | "lands" | "workers" | "pens">("sell");
  const [showMaxHomeShop, setShowMaxHomeShop] = useState<boolean>(false);
  const [showMaxWardrobe, setShowMaxWardrobe] = useState<boolean>(false);
  const [showLocationMap, setShowLocationMap] = useState<boolean>(false);

  const [workersPositions, setWorkersPositions] = useState<Record<string, WorkerPositionState>>({
    "worker-papa": { x: 25, y: 72, targetX: 25, targetY: 72, isMoving: false, dir: "right", actionTimer: 0, currentZone: "MEADOW" },
    "worker-mama": { x: 38, y: 74, targetX: 38, targetY: 74, isMoving: false, dir: "right", actionTimer: 0, currentZone: "BARNYARD" },
    "worker-nadya": { x: 48, y: 76, targetX: 48, targetY: 76, isMoving: false, dir: "right", actionTimer: 0, currentZone: "GARDEN" },
    "worker-lena": { x: 58, y: 78, targetX: 58, targetY: 78, isMoving: false, dir: "right", actionTimer: 0, currentZone: "BARNYARD" },
    "worker-pasha": { x: 68, y: 75, targetX: 68, targetY: 75, isMoving: false, dir: "right", actionTimer: 0, currentZone: "MEADOW" },
    "worker-andrey": { x: 78, y: 73, targetX: 78, targetY: 73, isMoving: false, dir: "right", actionTimer: 0, currentZone: "ORCHARD" },
    "worker-dima": { x: LAKESIDE_POND.dockX, y: LAKESIDE_POND.dockY, targetX: LAKESIDE_POND.dockX, targetY: LAKESIDE_POND.dockY, isMoving: false, dir: "right", actionTimer: 0, currentZone: "LAKESIDE" },
    "worker-arina": { x: 82, y: 74, targetX: 82, targetY: 74, isMoving: false, dir: "left", actionTimer: 0, currentZone: "LAKESIDE" },
    "worker-sveta": { x: 35, y: 73, targetX: 35, targetY: 73, isMoving: false, dir: "right", actionTimer: 0, currentZone: "DESERT" },
    "worker-misha": { x: 42, y: 76, targetX: 42, targetY: 76, isMoving: false, dir: "right", actionTimer: 0, currentZone: "FOREST" },
    "worker-masha": { x: 55, y: 72, targetX: 55, targetY: 72, isMoving: false, dir: "right", actionTimer: 0, currentZone: "LAKE" },
    "worker-sergey": { x: 62, y: 75, targetX: 62, targetY: 75, isMoving: false, dir: "right", actionTimer: 0, currentZone: "ORCHARD" },
    "worker-pastuh": { x: 32, y: 73, targetX: 32, targetY: 73, isMoving: false, dir: "right", actionTimer: 0, currentZone: "MEADOW" },
    "worker-kolya": { x: 50, y: 76, targetX: 50, targetY: 76, isMoving: false, dir: "right", actionTimer: 0, currentZone: "GARDEN" },
    "worker-vera": { x: 22, y: 58, targetX: 22, targetY: 58, isMoving: false, dir: "right", actionTimer: 0, currentZone: "GARDEN" },
    "worker-fyodor": { x: 62, y: 66, targetX: 62, targetY: 66, isMoving: false, dir: "left", actionTimer: 0, currentZone: "GARDEN" },
    "worker-sonya": { x: 38, y: 74, targetX: 38, targetY: 74, isMoving: false, dir: "right", actionTimer: 0, currentZone: "GARDEN" },
    "worker-grisha": { x: 70, y: 50, targetX: 70, targetY: 50, isMoving: false, dir: "left", actionTimer: 0, currentZone: "GARDEN" },
    "worker-nina": { x: 40, y: 72, targetX: 40, targetY: 72, isMoving: false, dir: "right", actionTimer: 0, currentZone: "MEADOW" },
    "worker-petya": { x: 46, y: 74, targetX: 46, targetY: 74, isMoving: false, dir: "right", actionTimer: 0, currentZone: "BARNYARD" },
    "worker-olya": { x: 55, y: 74, targetX: 55, targetY: 74, isMoving: false, dir: "right", actionTimer: 0, currentZone: "MEADOW" },
    "worker-vika": { x: 45, y: 76, targetX: 45, targetY: 76, isMoving: false, dir: "right", actionTimer: 0, currentZone: "MEADOW" },
    "worker-igor": { x: 38, y: 72, targetX: 38, targetY: 72, isMoving: false, dir: "right", actionTimer: 0, currentZone: "DESERT" },
    "worker-tolya": { x: 52, y: 70, targetX: 52, targetY: 70, isMoving: false, dir: "right", actionTimer: 0, currentZone: "FOREST" },
    "worker-zoya": { x: 48, y: 78, targetX: 48, targetY: 78, isMoving: false, dir: "right", actionTimer: 0, currentZone: "LAKE" },
    "worker-roman": { x: 50, y: 68, targetX: 50, targetY: 68, isMoving: false, dir: "right", actionTimer: 0, currentZone: "MAX_HOME" },
  });
  const workersPositionsRef = useRef(workersPositions);
  workersPositionsRef.current = workersPositions;

  // Живые позиции для плавного движения (RAF — единственный владелец во время движения).
  // Эти refs НЕ перезаписываются при ререндере, поэтому React не может «дёрнуть» спрайт.
  const animalLiveRef = useRef<
    Map<string, { x: number; y: number; angle: number; vx: number; vy: number }>
  >(new Map());
  const workerLiveRef = useRef<
    Map<
      string,
      {
        x: number;
        y: number;
        angle: number;
        dir: "left" | "right";
        moving: boolean;
        vx: number;
        vy: number;
        groundY: number;
      }
    >
  >(new Map());

  /** Подставить живую RAF-позицию в state — иначе при смене цели спрайт прыгает назад */
  const patchWorkerFromLive = (wid: string, w: WorkerPositionState): WorkerPositionState => {
    const live = workerLiveRef.current.get(wid);
    if (!live) return w;
    return { ...w, x: live.x, y: live.y, dir: live.dir, isMoving: live.moving };
  };

  const triggerWorkerActionFeedback = (_workerId: string, _x: number, _y: number, _label: string) => {
    // NPC работают тихо — визуальные эффекты только у действий игрока
  };

  const [showHelp, setShowHelp] = useState<boolean>(() => {
    return !localStorage.getItem("maxim_fermer_save");
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeZone, setActiveZone] = useState<LocationId>("MEADOW");
  const activeZoneRef = useRef(activeZone);
  activeZoneRef.current = activeZone;
  const workersRef = useRef(gameState.workers);
  workersRef.current = gameState.workers;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    draggedAnimalIdRef.current = draggedAnimalId;
  }, [draggedAnimalId]);

  useEffect(() => {
    draggedWorkerIdRef.current = draggedWorkerId;
  }, [draggedWorkerId]);
  const workerZoneTickRef = useRef(0);
  const [customNotification, setCustomNotification] = useState<string | null>(null);
  const [gameRoomImmersive, setGameRoomImmersive] = useState(false);
  const specialReturnZoneRef = useRef<LocationId>("MEADOW");

  const isInterior = isInteriorZone(activeZone);
  const worldZone = isInterior ? specialReturnZoneRef.current : activeZone;
  const currentZoneIndex = WORLD_ZONES.indexOf(worldZone as (typeof WORLD_ZONES)[number]);
  const prevZone = WORLD_ZONES[(currentZoneIndex - 1 + WORLD_ZONES.length) % WORLD_ZONES.length];
  const nextZone = WORLD_ZONES[(currentZoneIndex + 1) % WORLD_ZONES.length];
  const isMobileCamera = deviceKind === "phone";
  const effectiveZoom = isMobileCamera
    ? resolveEffectiveZoom(zoomScale, deviceKind, activeZone)
    : resolveDesktopZoom(zoomScale, activeZone);

  // Character walking state
  const [boyPosition, setBoyPosition] = useState({
    x: 50,
    y: 60,
    targetX: 50,
    targetY: 60,
    isMoving: false,
    dir: "right" as "left" | "right",
  });
  const boyPositionRef = useRef(boyPosition);
  const maxElRef = useRef<HTMLDivElement | null>(null);
  const maxWobbleElRef = useRef<HTMLDivElement | null>(null);
  const tossWakeRef = useRef<() => void>(() => {});
  const stageElRef = useRef<HTMLDivElement | null>(null);
  const effectiveZoomRef = useRef(effectiveZoom);
  effectiveZoomRef.current = effectiveZoom;

  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);

  // 🦋 БАБОЧКИ И 🌠 ПАДАЮЩИЕ ЗВЕЗДЫ - REALTIME ENGINE:
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  const [fallingStars, setFallingStars] = useState<FallingStar[]>([]);
  const [pondFish, setPondFish] = useState<FishInstance[]>([]);
  // 🌸 Собираемые цветы, растущие на траве
  const [flowers, setFlowers] = useState<Flower[]>([]);

  // Инициализируем бабочек — теперь их можно собирать на любом устройстве
  useEffect(() => {
    const initialButterflies: Butterfly[] = [
      { id: "b1", x: 30, y: 35, type: "green", emoji: "🦋", vx: 0.1, vy: -0.1 },
      { id: "b2", x: 65, y: 45, type: "pink", emoji: "🦋", vx: -0.12, vy: 0.08 },
    ];
    // На телефоне оставляем одну бабочку, чтобы не нагружать слабые устройства
    setButterflies(isPhone ? initialButterflies.slice(0, 1) : initialButterflies);
  }, [isPhone]);

  // 🌸 Засеваем собираемые цветы на траве при заходе в уличные зоны (палитра зависит от локации)
  useEffect(() => {
    if (activeZone === "MAX_HOME" || !getZoneFlora(activeZone)) {
      setFlowers([]);
      return;
    }
    const count = isPhone ? 3 : 5;
    setFlowers(seedZoneFlowers(activeZone, count));
  }, [activeZone, isPhone]);

  // Рыбки в пруду (озеро LAKESIDE)
  useEffect(() => {
    if (activeZone !== "LAKESIDE") return;
    if (pondFish.length > 0) return;
    const emojis = ["🐟", "🐠", "🎏"];
    setPondFish(
      emojis.map((emoji, i) => ({
        id: `fish-${i}`,
        x: 30 + i * 18,
        y: 82 + (i % 2) * 3,
        emoji,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.1,
        scaleX: 1,
      }))
    );
  }, [activeZone, pondFish.length]);

  // Высокочастотный таймер анимации бабочек и звезд
  useEffect(() => {
    const isNightVal = gameState.dayProgress !== undefined && gameState.dayProgress >= 192;
    const decorMs = decorLoopMs(deviceKind);
    const butterflyCap = maxDecorButterflies(deviceKind);

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

      // 1.5 Плавание рыбок в пруду
      if (activeZone === "LAKESIDE") {
        setPondFish((prev) =>
          prev.map((f) => {
            let nx = f.x + f.vx;
            let ny = f.y + f.vy;
            let nvx = f.vx;
            let nvy = f.vy;
            if (nx < LAKESIDE_POND.minX || nx > LAKESIDE_POND.maxX) {
              nvx = -f.vx;
              nx = Math.max(LAKESIDE_POND.minX, Math.min(LAKESIDE_POND.maxX, nx));
            }
            if (ny < LAKESIDE_POND.minY || ny > LAKESIDE_POND.maxY) {
              nvy = -f.vy;
              ny = Math.max(LAKESIDE_POND.minY, Math.min(LAKESIDE_POND.maxY, ny));
            }
            return {
              ...f,
              x: nx,
              y: ny,
              vx: nvx + (Math.random() - 0.5) * 0.04,
              vy: nvy + (Math.random() - 0.5) * 0.03,
              scaleX: nvx < 0 ? -1 : 1,
            };
          })
        );
      }

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
      // А. Спавн бабочек (собираются на всех устройствах)
      if (Math.random() < 0.005) {
        setButterflies((prev) => {
          if (prev.length >= butterflyCap) return prev;
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

      // А.2 Подсев новых цветов на траве (вырастают взамен собранных)
      if (activeZone !== "MAX_HOME" && getZoneFlora(activeZone) && Math.random() < 0.01) {
        const flowerCap = deviceKind === "phone" ? 3 : 6;
        setFlowers((prev) => {
          if (prev.length >= flowerCap) return prev;
          const newF = createZoneFlower(activeZone, `flower-${Date.now()}-${Math.random()}`);
          if (!newF) return prev;
          return [...prev, newF];
        });
      }

      // Б. Спавн падающих звезд ночью (максимум 4 лежащих на земле)
      if (deviceKind !== "phone" && isNightVal && Math.random() < (deviceKind === "tablet" ? 0.008 : 0.015)) {
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
    }, decorMs);

    return () => clearInterval(timer);
  }, [gameState.dayProgress, activeZone, deviceKind, isPhone]);

  // Сбор бабочки: за нее даются золотые монетки и опыт!
  const handleCollectButterfly = (id: string, e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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

  // Сбор цветка: кладёт букет в рюкзак и даёт немного опыта
  const handleCollectFlower = (id: string, e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setFlowers((prev) => {
      const flower = prev.find((f) => f.id === id);
      if (!flower) return prev;

      const bouquetInfo = getBouquetCatalogEntry(flower.bouquetKey);

      playButterflySound();
      setGameState((prevState) => {
        const updatedInventory = {
          ...prevState.inventory,
          [flower.bouquetKey]: (prevState.inventory[flower.bouquetKey] || 0) + 1,
        };
        setTimeout(() => {
          spawnFloatHeart(flower.x, flower.y, `${flower.emoji} +1${bouquetInfo?.icon ?? "💐"}`);
        }, 50);
        const bouquetLabel = bouquetInfo?.nameRu ?? "букет";
        triggerNotification(`${flower.emoji} Цветок сорван! В рюкзак положен ${bouquetLabel}.`);
        return awardExperience(4, {
          ...prevState,
          inventory: updatedInventory,
        });
      });

      return prev.filter((f) => f.id !== id);
    });
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
    window.addEventListener("pointerdown", onFirstInteract, { once: true, capture: true });
    window.addEventListener("keydown", onFirstInteract, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstInteract, { capture: true });
      window.removeEventListener("keydown", onFirstInteract, { capture: true });
    };
  }, [gameState.dayProgress, isMuted]);

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

  useEffect(() => {
    if (draggedAnimalId || draggedWorkerId) return;
    // Не сохраняем посреди движения/подбрасывания
    if (animalLiveRef.current.size > 0 || workerLiveRef.current.size > 0) return;
    if (gameState.animals.some((a) => isAnimalAirborne(a))) return;

    const delay = saveDebounceMs(deviceKind);
    if (delay <= 0) {
      localStorage.setItem("maxim_fermer_save", JSON.stringify(gameState));
      return;
    }
    const timer = setTimeout(() => {
      localStorage.setItem("maxim_fermer_save", JSON.stringify(gameState));
    }, delay);
    return () => clearTimeout(timer);
  }, [gameState, workersPositions, draggedAnimalId, draggedWorkerId, deviceKind]);

  // Real-time ticking engine for crops growth, satiety decay, animal production, day cycles and helper workers
  useEffect(() => {
    const tickMs = gameTickMs(deviceKind);
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
          const activeWorkers = updatedWorkers.filter((w) => w.isActive && !w.isBundledWithHome);
          const totalWage = activeWorkers.reduce((acc, curr) => acc + curr.dailyWage, 0);

          if (totalWage > 0) {
            if (nextCoins >= totalWage) {
              nextCoins -= totalWage;
              shouldSoundCoin = true;
              paymentNotice = `💰 Закат дня! Выплачено жалование работникам за отличный труд: -${totalWage}🪙.`;
            } else {
              // Dismiss workers who aren't paid
              updatedWorkers = updatedWorkers.map((w) => {
                if (w.isActive && !w.isBundledWithHome) {
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

        // --- 1. Tick Crops Growth (all plots live on the Garden) ---
        const updatedCrops = { ...prev.crops };
        const dripLvl = prev.upgrades["dripIrrigation"] || 0;
        const hasScarecrow = prev.buildings?.GARDEN?.includes("garden_scarecrow");
        const hasAutoSprinkler = prev.buildings?.GARDEN?.includes("garden_autowater");
        if (dripLvl > 0) {
          let autoWatered = 0;
          Object.keys(updatedCrops).forEach((plotId) => {
            const crop = updatedCrops[plotId];
            if (
              crop &&
              crop.progress > 0 &&
              crop.progress < 100 &&
              !crop.isWatered &&
              autoWatered < dripLvl * 2
            ) {
              crop.isWatered = true;
              autoWatered += 1;
            }
          });
        }
        if (hasAutoSprinkler) {
          let sprinklerCount = 0;
          Object.keys(updatedCrops).forEach((plotId) => {
            const crop = updatedCrops[plotId];
            if (
              crop &&
              crop.progress > 0 &&
              crop.progress < 100 &&
              !crop.isWatered &&
              sprinklerCount < 5
            ) {
              crop.isWatered = true;
              sprinklerCount += 1;
            }
          });
        }
        if (hasScarecrow) {
          Object.keys(updatedCrops).forEach((plotId) => {
            const crop = updatedCrops[plotId];
            if (crop && crop.progress > 0 && crop.progress < 100 && !crop.isWatered) {
              crop.isWatered = true;
            }
          });
        }
        Object.keys(updatedCrops).forEach((plotId) => {
          const crop = updatedCrops[plotId];
          if (crop && crop.progress > 0 && crop.progress < 100) {
            const config = CROPS_CONFIG[crop.type];
            const spadeLvl = prev.upgrades["goldenSpade"] || 1;
            const greenhouseLvl = prev.upgrades["gardenGreenhouse"] || 0;
            const spadeSpeedMultiplier = 1 + (spadeLvl - 1) * 0.15;
            const greenhouseMultiplier = 1 + greenhouseLvl * 0.12;
            
            // Crops grow only if they are watered
            if (crop.isWatered) {
              const secondsElapsed = 1 * spadeSpeedMultiplier * greenhouseMultiplier;
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

        // NPC задачи выполняются визуально (workerMovement.ts + decision timer)
        const isPastuhHired = updatedWorkers.find((w) => w.id === "worker-pastuh")?.isActive;
        const isRomanHired = true;

        // M. 🤠 Пастух Ваня — загоняет зверушек в загоны (кормление — визуально)
        if (isPastuhHired) {
          const pensList = prev.pens || [];
          updatedAnimals = updatedAnimals.map((animal) => {
            if (!animal.penId) return animal;
            const penState = pensList.find((p) => p.templateId === animal.penId && p.isOwned && !p.isOpen);
            if (!penState) return animal;
            const tpl = getPenTemplate(animal.penId);
            if (!tpl || isAnimalInsidePen(animal, tpl)) return animal;

            return herdAnimalTowardPen(animal, tpl);
          });
        }

        // U. 🧹 Роман — убирает в доме Макса
        if (isRomanHired) {
          nextCoins += 2;
          totalXpEarned += 3;
          let romanCheer = false;
          updatedAnimals = updatedAnimals.map((animal) => {
            if (!romanCheer && [AnimalSpecies.CAT, AnimalSpecies.DOG].includes(animal.species) && animal.happiness < 95) {
              romanCheer = true;
              return { ...animal, happiness: Math.min(animal.happiness + 12, 100) };
            }
            return animal;
          });

        }

        // --- 5. Animal wandering (day only; at night they stay in place and sleep) ---
        const isNightVal = currentDayProgress >= 192;
        if (!isNightVal) {
          const groundedAnimals = updatedAnimals.filter((a) => !isAnimalAirborne(a));
          const shouldShift = Math.random() < 0.22;
          if (shouldShift && groundedAnimals.length > 0) {
            const pick = groundedAnimals[Math.floor(Math.random() * groundedAnimals.length)];
            const idx = updatedAnimals.findIndex((a) => a.id === pick.id);
            if (idx >= 0) {
              updatedAnimals[idx] = wanderAnimalAvoidingOthers(pick, updatedAnimals);
            }
          }
        }

        updatedAnimals = separateAnimalsByLocationSkipAirborne(updatedAnimals);
        updatedAnimals = applyPenConstraints(updatedAnimals, prev.pens || []);

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
    }, tickMs);

    return () => clearInterval(timer);
  }, [deviceKind]);

  // Редкие звуки природы и животных на локации
  useEffect(() => {
    if (isMuted) return;
    const ambientTimer = setInterval(() => {
      if (Math.random() < (deviceKind === "phone" ? 0.01 : 0.022)) {
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
      if (!isNightVal && shouldSpawnWind(deviceKind) && now - lastWindRef.current > 42000 && Math.random() < 0.35) {
        lastWindRef.current = now;
        playWindAmbient();
      }
    }, 2500);
    return () => clearInterval(ambientTimer);
  }, [gameState.animals, gameState.dayProgress, activeZone, isMuted, deviceKind]);

  const { shiftX, shiftY } = isMobileCamera
    ? resolveCameraShifts(boyPositionRef.current.x, boyPositionRef.current.y, effectiveZoom, deviceKind, activeZone)
    : { shiftX: resolveDesktopShiftX(boyPositionRef.current.x, effectiveZoom), shiftY: 0 };
  const cullOffscreen = shouldCullOffscreen(deviceKind, activeZone);

  const isEntityVisible = (x: number, y: number, margin = 10) =>
    !cullOffscreen || isPointInCameraView(x, y, shiftX, shiftY, effectiveZoom, margin);

  // Tossing & Dragging tracking
  const draggedDistanceRef = useRef(0);
  const lastDragCoordsRef = useRef<{ x: number, y: number, t: number }[]>([]);
  const justFinishedDraggingRef = useRef<boolean>(false);
  const dragAnimalLiveRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const dragWorkerLiveRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const dragDomRafRef = useRef(0);

  // Advanced Long-Press/Drag-to-Toss tracking refs:
  const animalPressTimerRef = useRef<any>(null);
  const animalPressStartCoordsRef = useRef<{ x: number, y: number } | null>(null);
  const isAnimalDraggingConfirmedRef = useRef<boolean>(false);
  const pendingAnimalIdRef = useRef<string | null>(null);
  const pendingAnimalSpeciesRef = useRef<AnimalSpecies | null>(null);
  const workerPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workerPressStartCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const isWorkerDraggingConfirmedRef = useRef<boolean>(false);
  const pendingWorkerIdRef = useRef<string | null>(null);
  const workerDraggedDistanceRef = useRef(0);
  const lastWorkerDragCoordsRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const justFinishedDraggingWorkerRef = useRef<boolean>(false);
  const audioUnlockedRef = useRef(false);
  const lastWindRef = useRef(0);
  const animalSpacingTickRef = useRef(0);
  const footstepDistanceRef = useRef(0);

  const applyBoyVisuals = (pos: BoyWalkState) => {
    boyPositionRef.current = pos;
    if (maxElRef.current) {
      maxElRef.current.style.left = `${pos.x}%`;
      maxElRef.current.style.top = `${pos.y}%`;
      maxElRef.current.style.transform = `translate3d(-50%, -100%, 0) scaleX(${pos.dir === "left" ? -1 : 1})`;
    }
    if (maxWobbleElRef.current) {
      maxWobbleElRef.current.classList.toggle("animate-walk-wobble", pos.isMoving);
    }
    if (stageElRef.current) {
      const { shiftX, shiftY } = isMobileCamera
        ? resolveCameraShifts(
            pos.x,
            pos.y,
            effectiveZoomRef.current,
            deviceKind,
            activeZoneRef.current
          )
        : {
            shiftX: resolveDesktopShiftX(pos.x, effectiveZoomRef.current),
            shiftY: 0,
          };
      stageElRef.current.style.transform = buildStageTransform(
        effectiveZoomRef.current,
        shiftX,
        shiftY,
        deviceKind
      );
    }
  };

  // Цель/телепорт из React → ref; x/y во время ходьбы не трогаем (их ведёт RAF)
  useEffect(() => {
    const r = boyPositionRef.current;
    boyPositionRef.current = {
      ...r,
      targetX: boyPosition.targetX,
      targetY: boyPosition.targetY,
      isMoving: boyPosition.isMoving,
      dir: boyPosition.dir,
      ...(boyPosition.isMoving ? {} : { x: boyPosition.x, y: boyPosition.y }),
    };
    if (!boyPosition.isMoving) {
      applyBoyVisuals(boyPositionRef.current);
    }
  }, [
    boyPosition.targetX,
    boyPosition.targetY,
    boyPosition.isMoving,
    boyPosition.dir,
    boyPosition.x,
    boyPosition.y,
  ]);

  // Ходьба Макса: только DOM каждый кадр; React обновляется лишь по приходу к цели
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;

      if (!draggedAnimalId && !draggedWorkerId) {
        const prev = boyPositionRef.current;
        const next = stepBoyWalk(prev, dt);

        if (
          next.x !== prev.x ||
          next.y !== prev.y ||
          next.isMoving !== prev.isMoving ||
          next.dir !== prev.dir
        ) {
          if (next.movedDistance > 0) {
            footstepDistanceRef.current += next.movedDistance;
            if (footstepDistanceRef.current >= BOY_FOOTSTEP_EVERY) {
              playFootstepSound();
              footstepDistanceRef.current = 0;
            }
          }

          applyBoyVisuals(next);

          if (prev.isMoving && !next.isMoving) {
            setBoyPosition({
              x: next.x,
              y: next.y,
              targetX: next.targetX,
              targetY: next.targetY,
              isMoving: false,
              dir: next.dir,
            });
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draggedAnimalId, draggedWorkerId, deviceKind, isMobileCamera]);

  useLayoutEffect(() => {
    applyBoyVisuals(boyPositionRef.current);
  }, [effectiveZoom, activeZone, deviceKind, isMobileCamera]);

  // Drag: позицию двигаем напрямую в DOM (left%/top%), React не ререндерим
  const flushDragDom = () => {
    dragDomRafRef.current = 0;

    const aid = draggedAnimalIdRef.current;
    if (aid && dragAnimalLiveRef.current) {
      const live = dragAnimalLiveRef.current;
      setDragRoamerPosition(`roamer-${aid}`, live.x, live.y);
    }

    const wid = draggedWorkerIdRef.current;
    if (wid && dragWorkerLiveRef.current) {
      const live = dragWorkerLiveRef.current;
      setDragRoamerPosition(`worker-roamer-${wid}`, live.x, live.y);
    }
  };

  const scheduleDragDomFlush = () => {
    if (!dragDomRafRef.current) {
      dragDomRafRef.current = requestAnimationFrame(flushDragDom);
    }
  };

  // ЕДИНЫЙ ДВИЖОК ДВИЖЕНИЯ (RAF):
  // toss животных + toss работников + плавная ходьба работников.
  // Источник правды во время движения — live-refs (НЕ перетираются ререндером).
  // React-state обновляется редко (throttle) — только для отсечения/сохранения.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastAnimalSync = 0;
    let lastWorkerSync = 0;
    let loopActive = false;
    const spinAnimals = shouldSpinTossedSprites(deviceKind);

    const syncAnimals = (animals: AnimalInstance[], force = false) => {
      const now = performance.now();
      if (!force && now - lastAnimalSync < 150) return;
      lastAnimalSync = now;
      setGameState((prev) => ({ ...prev, animals }));
    };

    const syncWorkers = (next: typeof workersPositionsRef.current, force = false) => {
      const now = performance.now();
      if (!force && now - lastWorkerSync < 150) return;
      lastWorkerSync = now;
      workersPositionsRef.current = next;
      setWorkersPositions(next);
    };

    const stopLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      loopActive = false;
    };

    const wakeLoop = () => {
      if (loopActive) return;
      loopActive = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      const rawDt = now - last;
      const dt = Math.min(32, Math.max(8, rawDt));
      last = now;

      const draggedAnimal = draggedAnimalIdRef.current;
      const draggedWorker = draggedWorkerIdRef.current;
      const zone = activeZoneRef.current;
      // Перетаскивание двигается своим RAF (flushDragDom); здесь — только toss/ходьба
      let busy = false;

      // ---------- ЖИВОТНЫЕ (только подбрасывание) ----------
      const aLive = animalLiveRef.current;
      const animals = gameStateRef.current.animals;
      const hasAirborneAnimal =
        aLive.size > 0 ||
        animals.some((a) => a.id !== draggedAnimal && isAnimalAirborne(a));

      if (hasAirborneAnimal) {
        let animalsDirty = false;
        const nextAnimals = animals.map((animal) => {
          if (animal.id === draggedAnimal) return animal;
          const k = aLive.get(animal.id);
          if (!k && !isAnimalAirborne(animal)) return animal;
          const kin = {
            x: k ? k.x : animal.x,
            y: k ? k.y : animal.y,
            vx: k ? k.vx : animal.vx ?? 0,
            vy: k ? k.vy : animal.vy ?? 0,
            angle: k ? k.angle : animal.angle ?? 0,
            groundY: resolveGroundY({ ...animal, y: k ? k.y : animal.y }),
          };
          const { next, active } = stepToss(kin, dt, spinAnimals);
          placeAnimalDom(animal.id, next.x, next.y, next.angle, animal.scaleX, active);
          animalsDirty = true;
          if (active) {
            aLive.set(animal.id, {
              x: next.x,
              y: next.y,
              angle: next.angle,
              vx: next.vx,
              vy: next.vy,
            });
            busy = true;
          } else {
            aLive.delete(animal.id);
          }
          return applyKinematicsToAnimal(animal, next);
        });
        if (animalsDirty) {
          gameStateRef.current = { ...gameStateRef.current, animals: nextAnimals };
          syncAnimals(nextAnimals, !busy);
        }
      }

      // ---------- РАБОТНИКИ (подбрасывание + ходьба) ----------
      const wLive = workerLiveRef.current;
      const workers = workersPositionsRef.current;
      let workersDirty = false;
      const nextWorkers = { ...workers };

      for (const wid of Object.keys(nextWorkers)) {
        if (wid === draggedWorker) continue;
        const ws = nextWorkers[wid];
        const inst = workersRef.current?.find((gw) => gw.id === wid);
        if (!inst?.isActive) continue;

        const isVisible = ws.currentZone === zone;

        let L = wLive.get(wid);
        const stateAirborne = workerAirborne(ws);
        const enRoute = workerNeedsMovement(ws, L?.x ?? ws.x, L?.y ?? ws.y);

        if (!L) {
          if (!stateAirborne && !enRoute) continue;
          L = {
            x: ws.x,
            y: ws.y,
            vx: ws.vx ?? 0,
            vy: ws.vy ?? 0,
            angle: ws.angle ?? 0,
            groundY: resolveWorkerGroundY(ws),
            dir: ws.dir,
            moving: enRoute,
          };
          wLive.set(wid, L);
        }

        const tossing = workerAirborne({
          x: L.x,
          y: L.y,
          vx: L.vx,
          vy: L.vy,
          angle: L.angle,
          groundY: L.groundY,
          targetY: ws.targetY,
        });

        const walkSpeed = WORKER_TRAVEL_WALK_SPEED;

        if (tossing) {
          const { next: k, active } = stepToss(
            { x: L.x, y: L.y, vx: L.vx, vy: L.vy, angle: L.angle, groundY: L.groundY },
            dt,
            false
          );
          L.x = k.x;
          L.y = k.y;
          L.vx = active ? k.vx : 0;
          L.vy = active ? k.vy : 0;
          L.angle = active ? k.angle : 0;
          L.groundY = k.groundY;
          L.moving = false;
          if (isVisible) placeWorkerDom(wid, k.x, k.y, L.angle, L.dir, false, active);
          nextWorkers[wid] = {
            ...ws,
            x: k.x,
            y: k.y,
            vx: active ? k.vx : 0,
            vy: active ? k.vy : 0,
            angle: active ? k.angle : 0,
            groundY: k.groundY,
            isMoving: false,
            targetX: k.x,
            targetY: k.y,
          };
          workersDirty = true;
          if (active) busy = true;
          else wLive.delete(wid);
        } else if (enRoute) {
          const step = stepWalk(
            L.x,
            L.y,
            ws.targetX,
            ws.targetY,
            dt,
            L.dir,
            walkSpeed,
            WORKER_ARRIVE_DIST
          );

          L.x = step.x;
          L.y = step.y;
          L.dir = step.dir;
          L.angle = 0;
          L.vx = 0;
          L.vy = 0;
          L.moving = step.moving;

          let nextWs: WorkerPositionState = {
            ...ws,
            x: step.x,
            y: step.y,
            dir: step.dir,
            isMoving: step.moving,
            angle: 0,
            vx: 0,
            vy: 0,
          };

          if (step.arrived && ws.travelPhase === "exitWalk" && ws.travelTo) {
            nextWs = completeZoneExit(nextWs);
            L.x = nextWs.x;
            L.y = nextWs.y;
            L.dir = nextWs.dir;
            L.moving = true;
            workersDirty = true;
            if (isVisible) {
              placeWorkerDom(wid, nextWs.x, nextWs.y, 0, nextWs.dir, true, false);
            }
            nextWorkers[wid] = nextWs;
            busy = true;
            continue;
          }

          if (isVisible) {
            placeWorkerDom(wid, step.x, step.y, 0, step.dir, step.moving, true);
          }
          nextWorkers[wid] = nextWs;
          workersDirty = true;
          busy = true;
        } else if (L.moving) {
          L.moving = false;
          if (isVisible) placeWorkerDom(wid, L.x, L.y, 0, L.dir, false, false);
        }
      }

      if (workersDirty) {
        workersPositionsRef.current = nextWorkers;
        const syncNow = performance.now();
        if (!busy || syncNow - lastWorkerSync >= 80) {
          lastWorkerSync = syncNow;
          setWorkersPositions(nextWorkers);
        }
      }

      let stillMoving = false;
      const anyActiveWorker = (workersRef.current ?? []).some(
        (w) => w.isActive && !w.isBundledWithHome
      );
      for (const wid of Object.keys(nextWorkers)) {
        if (wid === draggedWorker) continue;
        const ws = nextWorkers[wid];
        const inst = workersRef.current?.find((gw) => gw.id === wid);
        if (!inst?.isActive) continue;
        const live = wLive.get(wid);
        if (workerNeedsMovement(ws, live?.x, live?.y)) stillMoving = true;
      }

      if (anyActiveWorker || busy || stillMoving) {
        raf = requestAnimationFrame(tick);
      } else {
        stopLoop();
      }
      return;
    };

    tossWakeRef.current = wakeLoop;
    wakeLoop();

    return () => {
      tossWakeRef.current = () => {};
      stopLoop();
    };
  }, [deviceKind]);

  // Гарантия: после КАЖДОГО ререндера возвращаем живые позиции в DOM,
  // чтобы React не «дёргал» движущиеся спрайты своим left/top из state.
  useLayoutEffect(() => {
    const zone = activeZoneRef.current;
    const da = draggedAnimalIdRef.current;
    const dw = draggedWorkerIdRef.current;

    for (const a of gameStateRef.current.animals) {
      if ((a.locationId || "MEADOW") !== zone) continue;
      if (a.id === da) continue;
      const live = animalLiveRef.current.get(a.id);
      if (live) {
        placeAnimalDom(a.id, live.x, live.y, live.angle, a.scaleX, true);
      } else {
        placeAnimalDom(a.id, a.x, a.y, a.angle ?? 0, a.scaleX, false);
      }
    }

    const workers = workersPositionsRef.current;
    for (const wid of Object.keys(workers)) {
      if (wid === dw) continue;
      const ws = workers[wid];
      const inst = workersRef.current?.find((w) => w.id === wid);
      if (!inst?.isActive || ws.currentZone !== zone) continue;
      const live = workerLiveRef.current.get(wid);
      if (live) {
        const airborne = live.vx !== 0 || live.vy !== 0;
        placeWorkerDom(wid, live.x, live.y, live.angle, live.dir, live.moving, airborne);
      } else if (!workerNeedsMovement(ws)) {
        placeWorkerDom(wid, ws.x, ws.y, ws.angle ?? 0, ws.dir, false, false);
      }
    }
  });

  useEffect(() => {
    if (draggedAnimalId || draggedWorkerId) {
      tossWakeRef.current();
    }
  }, [draggedAnimalId, draggedWorkerId]);

  // «Решения» работников: куда идти, переход между зонами, таймеры действий.
  // Покадровое движение делает единый RAF-движок (никакой интерполяции здесь).
  useEffect(() => {
    const decisionMs = isPhone ? 450 : 320;
    const walkTimer = setInterval(() => {
      if (!draggedAnimalIdRef.current) {
        animalSpacingTickRef.current += 1;
        if (animalSpacingTickRef.current % 6 === 0) {
          setGameState((prev) => {
            const separated = separateAnimalsByLocationSkipAirborne(prev.animals);
            const moved = separated.some((a, i) => a.x !== prev.animals[i].x || a.y !== prev.animals[i].y);
            return moved ? { ...prev, animals: separated } : prev;
          });
        }
      }

      workerZoneTickRef.current += 1;
      const gs = gameStateRef.current;
      const pendingTaskResults: Array<{ wid: string; workLabel: string }> = [];
      const next = { ...workersPositionsRef.current };
      let updated = false;

      if (workerZoneTickRef.current % (isPhone ? 30 : 20) === 0) {
        (gs.workers ?? []).forEach((worker) => {
          if (!worker.isActive || worker.isBundledWithHome) return;
          const pos = next[worker.id];
          if (!pos) return;
          const home = worker.assignedLocationId || "MEADOW";
          const dutyZone = pickWorkerTravelZone(
            worker.id,
            gs.animals || [],
            gs.inventory || {},
            home
          );
          if (dutyZone !== pos.currentZone && canStartZoneTravel(pos)) {
            const synced = patchWorkerFromLive(worker.id, pos);
            next[worker.id] = beginZoneTravel(synced, dutyZone);
            updated = true;
          }
        });
      }

      Object.keys(next).forEach((wid) => {
        let w = patchWorkerFromLive(wid, next[wid]);
        const workerInst = workersRef.current?.find((gw) => gw.id === wid);
        if (!workerInst?.isActive) return;
        if (wid === draggedWorkerIdRef.current) return;
        if (w.vy || w.vx || (w.angle ?? 0) !== 0) return;

        let currentActionTimer = w.actionTimer;
        let currentActionLabel = w.actionLabel;
        let travelPhase = w.travelPhase ?? "idle";

        if (currentActionTimer > 0) {
          currentActionTimer -= decisionMs;
          if (currentActionTimer <= 0) {
            currentActionTimer = 0;
            currentActionLabel = undefined;
            if (travelPhase === "working") travelPhase = "idle";
          }
        }

        const live = workerLiveRef.current.get(wid);
        const curX = live ? live.x : w.x;
        const curY = live ? live.y : w.y;

        // Пока идём — не меняем цель (иначе дёргается)
        if (workerNeedsMovement(w, curX, curY)) {
          if (
            w.x !== next[wid]?.x ||
            w.y !== next[wid]?.y ||
            currentActionTimer !== w.actionTimer ||
            currentActionLabel !== w.actionLabel
          ) {
            next[wid] = { ...w, actionTimer: currentActionTimer, actionLabel: currentActionLabel };
            updated = true;
          }
          return;
        }

        const dist = Math.hypot(w.targetX - curX, w.targetY - curY);

        let targetX = w.targetX;
        let targetY = w.targetY;
        let isMoving = false;
        let taskAnimalId = w.taskAnimalId;
        let taskPlotId = w.taskPlotId;
        let taskTreeId = w.taskTreeId;
        let pendingWorkLabel = w.pendingWorkLabel;
        let changed = false;

        if (travelPhase === "entryWalk" && dist < 1.2) {
          travelPhase = "idle";
          currentActionLabel = undefined;
          changed = true;
        }

        if (
          travelPhase === "toTask" &&
          !workerNeedsMovement(w, curX, curY) &&
          currentActionTimer === 0
        ) {
          const taskResult = performWorkerTask(wid, gs, {
            animalId: w.taskAnimalId,
            plotId: w.taskPlotId,
            treeId: w.taskTreeId,
          });
          if (taskResult.didWork) {
            setGameState((prevState) => {
              let nextState = { ...prevState };
              if (taskResult.animals) nextState = { ...nextState, animals: taskResult.animals! };
              if (taskResult.inventory) nextState = { ...nextState, inventory: taskResult.inventory! };
              if (taskResult.crops) nextState = { ...nextState, crops: taskResult.crops! };
              if (taskResult.trees) nextState = { ...nextState, trees: taskResult.trees! };
              if (taskResult.coins !== undefined) nextState = { ...nextState, coins: taskResult.coins };
              if (taskResult.xp) {
                nextState = awardExperience(taskResult.xp, nextState);
                if (taskResult.fed) {
                  nextState = {
                    ...nextState,
                    stats: { ...nextState.stats, animalsFed: nextState.stats.animalsFed + 1 },
                  };
                }
              }
              return nextState;
            });
            pendingTaskResults.push({
              wid,
              workLabel: w.pendingWorkLabel || "✅ Готово!",
            });
            travelPhase = "working";
            currentActionTimer = 2800;
            currentActionLabel = w.pendingWorkLabel || "✅ Готово!";
          } else {
            travelPhase = "idle";
            currentActionLabel = undefined;
          }
          targetX = curX;
          targetY = curY;
          taskAnimalId = undefined;
          taskPlotId = undefined;
          taskTreeId = undefined;
          pendingWorkLabel = undefined;
          changed = true;
        }

        if (travelPhase === "idle" && currentActionTimer === 0 && dist < 1.2) {
          const home = workerInst.assignedLocationId || "MEADOW";
          const dutyZone = pickWorkerTravelZone(
            wid,
            gs.animals || [],
            gs.inventory || {},
            home
          );
          if (w.currentZone === dutyZone) {
            const task = findWorkerTaskTarget(wid, gs, dutyZone);
            if (task) {
              travelPhase = "toTask";
              targetX = task.x;
              targetY = task.y;
              taskAnimalId = task.animalId;
              taskPlotId = task.plotId;
              taskTreeId = task.treeId;
              currentActionLabel = task.approachLabel;
              pendingWorkLabel = task.workLabel;
              isMoving = true;
              changed = true;
            } else {
              const wander = randomWanderTarget(wid, w.currentZone);
              if (Math.hypot(wander.x - curX, wander.y - curY) > 2) {
                targetX = wander.x;
                targetY = wander.y;
                isMoving = true;
                changed = true;
              }
            }
          }
        }

        const timerChanged =
          currentActionTimer !== w.actionTimer || currentActionLabel !== w.actionLabel;
        if (
          changed ||
          isMoving !== w.isMoving ||
          timerChanged ||
          travelPhase !== (w.travelPhase ?? "idle") ||
          targetX !== w.targetX ||
          targetY !== w.targetY
        ) {
          next[wid] = {
            ...w,
            targetX,
            targetY,
            isMoving,
            actionLabel: currentActionLabel,
            actionTimer: currentActionTimer,
            travelPhase,
            taskAnimalId,
            taskPlotId,
            taskTreeId,
            pendingWorkLabel,
          };
          updated = true;
        }
      });

      if (updated) {
        workersPositionsRef.current = next;
        setWorkersPositions(next);
      }

      pendingTaskResults.forEach(({ workLabel }) => {
        triggerNotification(workLabel);
      });

      const anyWorkerMoving = (Object.keys(next) as string[]).some((wid) => {
        const w = next[wid];
        const inst = workersRef.current?.find((gw) => gw.id === wid);
        if (!inst?.isActive || !w) return false;
        const live = workerLiveRef.current.get(wid);
        return workerNeedsMovement(w, live?.x, live?.y);
      });
      if (anyWorkerMoving) tossWakeRef.current();
    }, decisionMs);

    return () => clearInterval(walkTimer);
  }, [deviceKind, isPhone]);

  // Сразу даём работникам цель при входе в их зону (не ждём таймер решений)
  useEffect(() => {
    const gs = gameStateRef.current;
    const next = { ...workersPositionsRef.current };
    let changed = false;

    (gs.workers ?? []).forEach((worker) => {
      if (!worker.isActive || worker.isBundledWithHome) return;
      const pos = next[worker.id];
      if (!pos || pos.currentZone !== activeZone) return;
      if (pos.travelPhase && pos.travelPhase !== "idle") return;
      if (pos.actionTimer > 0) return;

      const dutyZone = pickWorkerTravelZone(
        worker.id,
        gs.animals || [],
        gs.inventory || {},
        worker.assignedLocationId || "MEADOW"
      );
      const task =
        pos.currentZone === dutyZone
          ? findWorkerTaskTarget(worker.id, gs, dutyZone)
          : null;

      if (task) {
        next[worker.id] = {
          ...patchWorkerFromLive(worker.id, pos),
          travelPhase: "toTask",
          targetX: task.x,
          targetY: task.y,
          taskAnimalId: task.animalId,
          taskPlotId: task.plotId,
          taskTreeId: task.treeId,
          actionLabel: task.approachLabel,
          pendingWorkLabel: task.workLabel,
          isMoving: true,
        };
        changed = true;
      } else {
        const synced = patchWorkerFromLive(worker.id, pos);
        const wander = randomWanderTarget(worker.id, pos.currentZone);
        if (Math.hypot(wander.x - synced.x, wander.y - synced.y) > 2) {
          next[worker.id] = {
            ...synced,
            targetX: wander.x,
            targetY: wander.y,
            isMoving: true,
          };
          changed = true;
        }
      }
    });

    if (changed) {
      workersPositionsRef.current = next;
      setWorkersPositions(next);
      tossWakeRef.current();
    }
  }, [activeZone]);

  // Keyboard controls
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const speedOffset = 8;
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
    return GARDEN_PLOT_COORDS[plotId] ?? { x: 50, y: 68 };
  };

  const getTreeCoords = (plotId: string) => {
    if (plotId === "treePlot1") return { x: 38, y: 56 };
    return { x: 72, y: 56 }; // treePlot2
  };

  // Drag-and-drop animal events
  const triggerAnimalDragConfirmed = (animalId: string, species: AnimalSpecies) => {
    if (isAnimalDraggingConfirmedRef.current) return;
    isAnimalDraggingConfirmedRef.current = true;
    if (species === AnimalSpecies.DOG) {
      unlockAudio();
      playDogBarkSound();
    }
    setDraggedAnimalId(animalId);
    setSelectedAnimalId(null); // Hide details menu completely when entering physics throwing mode!
    setSelectedPlotId(null);
    setSelectedTreeId(null);
    draggedDistanceRef.current = 0;

    const animalInstance = gameState.animals.find((a) => a.id === animalId);
    const startX = animalInstance?.x ?? 50;
    const startY = animalInstance?.y ?? 75;
    if (animalInstance) {
      lastDragCoordsRef.current = [{ x: startX, y: startY, t: Date.now() }];
    } else {
      lastDragCoordsRef.current = [{ x: 50, y: 75, t: Date.now() }];
    }
    dragAnimalLiveRef.current = { x: startX, y: startY, vx: 0, vy: 0 };
    setDragRoamerPosition(`roamer-${animalId}`, startX, startY);

    setGameState((prev) => {
      const updated = prev.animals.map((a) => {
        if (a.id === animalId) {
          return {
            ...a,
            vx: 0,
            vy: 0,
            groundY: resolveGroundY(a),
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

  const handleAnimalPointerDown = (e: React.PointerEvent, animalId: string, species: AnimalSpecies) => {
    e.stopPropagation();
    if (e.pointerType === "touch") e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    reportInputDebug(e.pointerType, "pointerDown", animalId);
    beginLongPress(
      e.pointerId,
      animalId,
      e.clientX,
      e.clientY,
      () => handleAnimalLongPress(animalId),
      { pointerType: e.pointerType }
    );

    pendingAnimalIdRef.current = animalId;
    pendingAnimalSpeciesRef.current = species;
    animalPressStartCoordsRef.current = { x: e.clientX, y: e.clientY };
    isAnimalDraggingConfirmedRef.current = false;

    if (animalPressTimerRef.current) clearTimeout(animalPressTimerRef.current);
    animalPressTimerRef.current = setTimeout(() => {
      if (pendingAnimalIdRef.current === animalId) {
        cancelLongPress(e.pointerId);
        triggerAnimalDragConfirmed(animalId, species);
        reportInputDebug(e.pointerType, "drag", animalId);
      }
    }, 220);
  };

  const handleAnimalLongPress = (animalId: string) => {
    const animal = gameState.animals.find((a) => a.id === animalId);
    if (!animal) return;
    unlockAudio();
    const template = ANIMAL_TEMPLATES[animal.species];
    const foodType = template.foodType;
    const hasFood = (gameState.inventory[foodType] || 0) > 0;
    if (!animal.isFed && hasFood) {
      handleFeedAnimal(animalId);
      triggerNotification(`🍽️ Быстрое кормление: ${animal.customName}!`);
      return;
    }
    triggerNotification(
      `ℹ️ ${animal.customName} (${template.nameRu}) — сытость: ${animal.isFed ? "да" : "нет"}, настроение: ${Math.round(animal.happiness)}%`
    );
  };

  const screenToPasturePercent = (
    clientX: number,
    clientY: number,
    container: HTMLDivElement
  ) => {
    const rect = container.getBoundingClientRect();
    const fractionX = (clientX - rect.left) / rect.width;
    const fractionY = (clientY - rect.top) / rect.height;
    const world = screenFractionToWorld(
      fractionX,
      fractionY,
      shiftX,
      shiftY,
      effectiveZoom,
      deviceKind,
      zoomScale
    );
    return {
      x: Math.max(5, Math.min(95, world.x)),
      y: Math.max(30, Math.min(84, world.y)),
    };
  };

  const triggerWorkerDragConfirmed = (workerId: string) => {
    if (isWorkerDraggingConfirmedRef.current) return;
    isWorkerDraggingConfirmedRef.current = true;
    setDraggedWorkerId(workerId);
    workerDraggedDistanceRef.current = 0;
    const pos = workersPositions[workerId];
    const startX = pos?.x ?? 50;
    const startY = pos?.y ?? 72;
    lastWorkerDragCoordsRef.current = [{ x: startX, y: startY, t: Date.now() }];
    dragWorkerLiveRef.current = { x: startX, y: startY, vx: 0, vy: 0 };
    setDragRoamerPosition(`worker-roamer-${workerId}`, startX, startY);
    setWorkersPositions((prev) => {
      const w = prev[workerId];
      if (!w) return prev;
      return {
        ...prev,
        [workerId]: {
          ...w,
          vx: 0,
          vy: 0,
          groundY: resolveWorkerGroundY(w),
        },
      };
    });
  };

  const handleWorkerGreeting = (workerId: string, pointerType?: string) => {
    const worker = workersRef.current?.find((w) => w.id === workerId);
    if (!worker) return;
    unlockAudio();
    playNpcClickSound(worker.id);
    triggerNotification(`${worker.emoji} Привет! Меня зовут ${worker.name}!`);
    setWorkersPositions((prev) => {
      const pos = prev[workerId];
      if (!pos) return prev;
      return {
        ...prev,
        [workerId]: {
          ...pos,
          actionLabel: `Я — ${worker.name}!`,
          actionTimer: 2800,
        },
      };
    });
    const pos = workersPositions[workerId];
    if (pos) spawnFloatHeart(pos.x, pos.y - 10, "💬");
    reportInputDebug(pointerType, "tap", workerId);
  };

  const handleWorkerPointerDown = (e: React.PointerEvent, workerId: string) => {
    e.stopPropagation();
    if (e.pointerType === "touch") e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    reportInputDebug(e.pointerType, "pointerDown", workerId);
    pendingWorkerIdRef.current = workerId;
    workerPressStartCoordsRef.current = { x: e.clientX, y: e.clientY };
    isWorkerDraggingConfirmedRef.current = false;

    if (workerPressTimerRef.current) clearTimeout(workerPressTimerRef.current);
    workerPressTimerRef.current = setTimeout(() => {
      if (pendingWorkerIdRef.current === workerId) {
        triggerWorkerDragConfirmed(workerId);
        reportInputDebug(e.pointerType, "drag", workerId);
      }
    }, 220);
  };

  const handleWorkerDragMove = (clientX: number, clientY: number, container: HTMLDivElement) => {
    const workerId = draggedWorkerIdRef.current;
    if (!workerId) return;

    const { x: constrainedX, y: constrainedY } = screenToPasturePercent(clientX, clientY, container);
    const now = Date.now();
    const list = lastWorkerDragCoordsRef.current;
    list.push({ x: constrainedX, y: constrainedY, t: now });
    if (list.length > 5) list.shift();

    const prev = dragWorkerLiveRef.current;
    const w = workersPositionsRef.current[workerId];
    const prevX = prev?.x ?? w?.x ?? constrainedX;
    const prevY = prev?.y ?? w?.y ?? constrainedY;
    workerDraggedDistanceRef.current += Math.abs(constrainedX - prevX) + Math.abs(constrainedY - prevY);
    dragWorkerLiveRef.current = {
      x: constrainedX,
      y: constrainedY,
      vx: (constrainedX - prevX) * 0.98,
      vy: (constrainedY - prevY) * 0.98,
    };
    scheduleDragDomFlush();
  };

  const handlePastureDragMove = (clientX: number, clientY: number, container: HTMLDivElement) => {
    const animalId = draggedAnimalIdRef.current;
    if (!animalId) return;

    const { x: constrainedX, y: constrainedY } = screenToPasturePercent(clientX, clientY, container);

    const now = Date.now();
    const list = lastDragCoordsRef.current;
    list.push({ x: constrainedX, y: constrainedY, t: now });
    if (list.length > 5) {
      list.shift();
    }

    const prev = dragAnimalLiveRef.current;
    const animal = gameStateRef.current.animals.find((a) => a.id === animalId);
    const prevX = prev?.x ?? animal?.x ?? constrainedX;
    const prevY = prev?.y ?? animal?.y ?? constrainedY;
    draggedDistanceRef.current += Math.abs(constrainedX - prevX) + Math.abs(constrainedY - prevY);
    dragAnimalLiveRef.current = {
      x: constrainedX,
      y: constrainedY,
      vx: (constrainedX - prevX) * 0.98,
      vy: (constrainedY - prevY) * 0.98,
    };
    scheduleDragDomFlush();
  };

  const handlePasturePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pendingWorkerIdRef.current && !draggedWorkerId) {
      const start = workerPressStartCoordsRef.current;
      if (start) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 9) {
          if (workerPressTimerRef.current) {
            clearTimeout(workerPressTimerRef.current);
            workerPressTimerRef.current = null;
          }
          triggerWorkerDragConfirmed(pendingWorkerIdRef.current);
          reportInputDebug(e.pointerType, "drag", pendingWorkerIdRef.current);
        }
      }
    }
    if (pendingAnimalIdRef.current && !draggedAnimalId) {
      const start = animalPressStartCoordsRef.current;
      if (start) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        moveLongPress(e.pointerId, e.clientX, e.clientY);
        if (dist > 9) {
          if (animalPressTimerRef.current) {
            clearTimeout(animalPressTimerRef.current);
            animalPressTimerRef.current = null;
          }
          cancelLongPress(e.pointerId);
          triggerAnimalDragConfirmed(
            pendingAnimalIdRef.current,
            pendingAnimalSpeciesRef.current!
          );
          reportInputDebug(e.pointerType, "drag", pendingAnimalIdRef.current);
        }
      }
    }
    if (draggedWorkerIdRef.current) {
      if (e.pointerType === "touch") e.preventDefault();
      handleWorkerDragMove(e.clientX, e.clientY, e.currentTarget);
      reportInputDebug(e.pointerType, "drag", draggedWorkerIdRef.current);
      return;
    }
    if (draggedAnimalIdRef.current) {
      if (e.pointerType === "touch") e.preventDefault();
      handlePastureDragMove(e.clientX, e.clientY, e.currentTarget);
      reportInputDebug(e.pointerType, "drag", draggedAnimalIdRef.current);
    }
  };

  const handlePasturePointerUp = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (workerPressTimerRef.current) {
      clearTimeout(workerPressTimerRef.current);
      workerPressTimerRef.current = null;
    }

    if (pendingWorkerIdRef.current && !isWorkerDraggingConfirmedRef.current) {
      handleWorkerGreeting(pendingWorkerIdRef.current, e?.pointerType);
    }
    pendingWorkerIdRef.current = null;

    if (e) {
      const { wasLongPress } = endLongPress(e.pointerId);
      if (wasLongPress) {
        if (animalPressTimerRef.current) {
          clearTimeout(animalPressTimerRef.current);
          animalPressTimerRef.current = null;
        }
        pendingAnimalIdRef.current = null;
        pendingAnimalSpeciesRef.current = null;
        return;
      }
    }

    if (animalPressTimerRef.current) {
      clearTimeout(animalPressTimerRef.current);
      animalPressTimerRef.current = null;
    }

    if (pendingAnimalIdRef.current && !isAnimalDraggingConfirmedRef.current) {
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
        reportInputDebug(e?.pointerType, "tap", animalInstance.id);
      }
    }

    pendingAnimalIdRef.current = null;
    pendingAnimalSpeciesRef.current = null;

    if (draggedWorkerId) {
      const list = lastWorkerDragCoordsRef.current;
      const { vx: calculatedVx, vy: calculatedVy } = computeThrowVelocity(list);
      const live = dragWorkerLiveRef.current;

      const tossedId = draggedWorkerId;
      setDraggedWorkerId(null);
      dragWorkerLiveRef.current = null;
      if (dragDomRafRef.current) {
        cancelAnimationFrame(dragDomRafRef.current);
        dragDomRafRef.current = 0;
      }
      justFinishedDraggingWorkerRef.current = true;
      setTimeout(() => {
        justFinishedDraggingWorkerRef.current = false;
      }, 150);

      setWorkersPositions((prev) => {
        const w = prev[tossedId];
        if (!w) return prev;
        const fx = live?.x ?? w.x;
        const fy = live?.y ?? w.y;
        const groundY = resolveWorkerGroundY(w);
        let next = {
          ...w,
          x: fx,
          y: fy,
          vx: calculatedVx,
          vy: calculatedVy,
          groundY,
          angle: 0,
          targetX: fx,
          targetY: fy,
          isMoving: false,
        };
        if (next.y < groundY - 0.5 && Math.abs(calculatedVy) < 0.05 && Math.abs(calculatedVx) < 0.05) {
          next = { ...next, vy: 0.25 };
        }
        const result = { ...prev, [tossedId]: next };
        workersPositionsRef.current = result;
        return result;
      });
      clearDragRoamerDom(`worker-roamer-${tossedId}`);
      tossWakeRef.current();
    }

    isWorkerDraggingConfirmedRef.current = false;

    if (draggedAnimalId) {
      const live = dragAnimalLiveRef.current;

      const list = lastDragCoordsRef.current;
      const { vx: calculatedVx, vy: calculatedVy } = computeThrowVelocity(list);

      const tossedId = draggedAnimalId;
      setDraggedAnimalId(null);
      dragAnimalLiveRef.current = null;
      if (dragDomRafRef.current) {
        cancelAnimationFrame(dragDomRafRef.current);
        dragDomRafRef.current = 0;
      }
      justFinishedDraggingRef.current = true;
      setTimeout(() => {
        justFinishedDraggingRef.current = false;
      }, 150);

      setGameState((prev) => {
        const updated = prev.animals.map((a) => {
          if (a.id === tossedId) {
            const fx = live?.x ?? a.x;
            const fy = live?.y ?? a.y;
            const penTpl = findPenAtPoint(fx, fy, prev.pens || [], activeZone);
            let next = {
              ...a,
              x: fx,
              y: fy,
              vx: calculatedVx,
              vy: calculatedVy,
              groundY: resolveGroundY(a),
              angle: shouldSpinTossedSprites(deviceKind)
                ? Math.max(-TOSS_MAX_ANGLE, Math.min(TOSS_MAX_ANGLE, calculatedVx * 1.2))
                : 0,
            };
            if (next.y < next.groundY - 0.5 && Math.abs(calculatedVy) < 0.05 && Math.abs(calculatedVx) < 0.05) {
              next = { ...next, vy: 0.25 };
            }
            if (penTpl && canSpeciesUsePen(a.species, penTpl.penType)) {
              next = { ...next, penId: penTpl.id };
              setTimeout(() => {
                triggerNotification(`🚧 ${a.customName} теперь в загоне «${penTpl.nameRu}»!`);
              }, 60);
            }
            return next;
          }
          return a;
        });
        const nextState = {
          ...prev,
          animals: updated
        };
        gameStateRef.current = nextState;
        return nextState;
      });
      clearDragRoamerDom(`roamer-${tossedId}`);
      tossWakeRef.current();
    }
  };

  const handleEnterMaxHome = () => {
    if (!isInteriorZone(activeZone)) specialReturnZoneRef.current = activeZone;
    onSelectZoneWithLock("MAX_HOME");
  };

  const handleUpgradeMaxHouse = (heartX = 50, heartY = 50) => {
    const currentLvl = gameState.maxHouseLevel || 1;
    const upgradeCost = currentLvl * 300;
    if (gameState.coins >= upgradeCost) {
      setGameState((prev) => ({
        ...prev,
        coins: prev.coins - upgradeCost,
        maxHouseLevel: currentLvl + 1,
      }));
      playLevelUpSound();
      triggerNotification(`🎉 Дом Макса улучшен до уровня ${currentLvl + 1}!`);
      spawnFloatHeart(heartX, heartY - 12, "👑");
    } else {
      playSadSound();
      triggerNotification(`⚠️ Нужно ${upgradeCost} монет для улучшения!`);
    }
  };

  const showBuildingInfo = (nameRu: string, benefitRu: string, buildingId: string, pointerType?: string) => {
    playClickSound();
    triggerNotification(`ℹ️ ${nameRu}: ${benefitRu}`);
    reportInputDebug(pointerType, "context", buildingId);
  };

  const handleMaxHousePointerUp = (e: React.PointerEvent, heartX: number, heartY: number) => {
    e.stopPropagation();
    const { wasLongPress } = endLongPress(e.pointerId);
    if (wasLongPress) return;

    playClickSound();
    const altAction = e.shiftKey || isDoubleTap("max-house", e);
    if (altAction) {
      handleUpgradeMaxHouse(heartX, heartY);
      reportInputDebug(e.pointerType, "doubleTap", "max-house");
      return;
    }
    handleEnterMaxHome();
    reportInputDebug(e.pointerType, "tap", "max-house");
  };

  const handleBuyPen = (templateId: string, cost: number, minLevel: number) => {
    const tpl = PEN_TEMPLATES.find((p) => p.id === templateId);
    if (!tpl) return;
    if (gameState.level < minLevel) {
      playSadSound();
      triggerNotification(`⭐ Нужен уровень ${minLevel}, чтобы купить загон!`);
      return;
    }
    if (gameState.coins < cost) {
      playSadSound();
      triggerNotification(`😢 Не хватает ${cost} монеток для загона!`);
      return;
    }
    const already = gameState.pens?.find((p) => p.templateId === templateId)?.isOwned;
    if (already) return;
    playCoinSound();
    setGameState((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      pens: (prev.pens || []).map((p) =>
        p.templateId === templateId ? { ...p, isOwned: true, isOpen: true } : p
      ),
    }));
    triggerNotification(`🚧 Построен загон: ${tpl.nameRu}! Бросай туда зверушек.`);
  };

  const handleTogglePenGate = (templateId: string) => {
    playClickSound();
    setGameState((prev) => ({
      ...prev,
      pens: (prev.pens || []).map((p) =>
        p.templateId === templateId ? { ...p, isOpen: !p.isOpen } : p
      ),
    }));
    const penState = gameState.pens?.find((p) => p.templateId === templateId);
    const tpl = getPenTemplate(templateId);
    if (tpl) {
      const willOpen = penState ? !penState.isOpen : true;
      triggerNotification(willOpen ? `🔓 Ворота «${tpl.nameRu}» открыты` : `🔒 Ворота «${tpl.nameRu}» закрыты — звери не уйдут!`);
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
    const b = boyPositionRef.current;
    return Math.sqrt(Math.pow(b.x - tgtX, 2) + Math.pow(b.y - tgtY, 2));
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
      const { hasFood, usedFoodKey } = resolveAnimalFood(prev.inventory, template.foodType);

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
      const hasWell = prev.buildings?.GARDEN?.includes("garden_well");
      const nextState = {
        ...prev,
        crops
      };
      return hasWell ? awardExperience(5, nextState) : nextState;
    });
  };

  // Harvest ripe crop
  const handleHarvestCrop = (plotId: string) => {
    playCoinSound();
    setGameState((prev) => {
      const crop = prev.crops[plotId];
      if (!crop || crop.progress < 100) return prev;

      const config = CROPS_CONFIG[crop.type];
      const compostLvl = prev.upgrades["richCompost"] || 0;
      const yieldCount = config.yieldCount + Math.min(compostLvl, 2);
      const hasGardenShed = prev.buildings?.GARDEN?.includes("garden_shed");

      const finalInventory = { ...prev.inventory };
      finalInventory[crop.type] = (finalInventory[crop.type] || 0) + yieldCount;
      finalInventory[`${crop.type}_SEED`] = (finalInventory[`${crop.type}_SEED`] || 0) + (hasGardenShed ? 2 : 1);

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
      const spawnPos = findAnimalSpawnPosition(prev.animals, activeZone);

      const newAnimal: AnimalInstance = {
        id: freshId,
        species,
        customName: `${template.nameRu.split(" ")[0]} ${prev.animals.length + 1}`,
        isFed: false,
        fedTimeRemaining: 0,
        productionProgress: 0,
        happiness: 80,
        cleanliness: 90,
        x: spawnPos.x,
        y: spawnPos.y,
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
    const currentLvl = gameState.upgrades[upgradeId] ?? upgrade.level ?? 0;
    const cost = upgrade.cost * (currentLvl + 1);

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

  const handleBuyMaxHomeFurniture = (furnitureId: string, cost: number, minLevel: number) => {
    if (gameState.coins < cost) {
      playSadSound();
      triggerNotification("⚠️ Не хватает монет для этой вещи.");
      return;
    }
    if (gameState.level < minLevel) {
      playSadSound();
      triggerNotification(`⚠️ Нужен уровень ${minLevel}!`);
      return;
    }
    const owned = gameState.buildings?.MAX_HOME || [];
    if (owned.includes(furnitureId)) return;

    playCoinSound();
    const item = MAX_HOME_FURNITURE.find((f) => f.id === furnitureId);
    setGameState((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      buildings: {
        ...prev.buildings,
        MAX_HOME: [...(prev.buildings?.MAX_HOME || []), furnitureId],
      },
      experience: prev.experience + 20,
    }));
    triggerNotification(`🛋️ ${item?.nameRu ?? "Вещь"} появилась в комнате!`);
    if (furnitureId === "max_wardrobe") {
      triggerNotification("👕 Шкаф готов! Нажми на него — купи костюмы для Макса!");
    }
  };

  const handleBuyMaxOutfit = (outfitId: string) => {
    const outfit = getMaxOutfit(outfitId);
    if (outfit.cost <= 0 || isMaxOutfitOwned(outfitId, gameState.maxOutfits)) return;

    if (gameState.coins < outfit.cost) {
      playSadSound();
      triggerNotification("⚠️ Не хватает монет для этого костюма.");
      return;
    }
    if (gameState.level < outfit.minLevel) {
      playSadSound();
      triggerNotification(`⚠️ Нужен уровень ${outfit.minLevel}!`);
      return;
    }

    playCoinSound();
    setGameState((prev) => ({
      ...prev,
      coins: prev.coins - outfit.cost,
      maxOutfits: [...(prev.maxOutfits ?? []), outfitId],
      activeMaxOutfit: outfitId,
      experience: prev.experience + 15,
    }));
    triggerNotification(`👕 ${outfit.nameRu} куплен и уже на Максе!`);
  };

  const handleEquipMaxOutfit = (outfitId: string) => {
    if (!isMaxOutfitOwned(outfitId, gameState.maxOutfits)) return;
    if (gameState.activeMaxOutfit === outfitId) return;

    playClickSound();
    const outfit = getMaxOutfit(outfitId);
    setGameState((prev) => ({
      ...prev,
      activeMaxOutfit: outfitId,
    }));
    triggerNotification(`👦 Макс надел: ${outfit.nameRu}!`);
  };

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
        const bouquet = getBouquetCatalogEntry(key);
        if (bouquet) basePrice = bouquet.sellPrice;
        else {
          const found = Object.values(ANIMAL_TEMPLATES).find(t => t.productName === key);
          if (found) basePrice = found.productPrice;
        }
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
            const bouquet = getBouquetCatalogEntry(key);
            if (bouquet) basePrice = bouquet.sellPrice;
            else {
              const found = Object.values(ANIMAL_TEMPLATES).find(t => t.productName === key);
              if (found) basePrice = found.productPrice;
            }
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
      spawnFloatHeart(20, 40, "coin");

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

  const handlePastureTape = (
    e: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>
  ) => {
    if (draggedAnimalId || draggedWorkerId || justFinishedDraggingRef.current || justFinishedDraggingWorkerRef.current) {
      return;
    }

    const targetElement = e.target as HTMLElement;
    if (showLocationMap || targetElement.closest("#game-header") || targetElement.closest("#location-map-modal")) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const fractionX = (e.clientX - rect.left) / rect.width;
    const fractionY = (e.clientY - rect.top) / rect.height;

    const world = screenFractionToWorld(
      fractionX,
      fractionY,
      shiftX,
      shiftY,
      effectiveZoom,
      deviceKind,
      zoomScale
    );

    const clickX = world.x;
    const clickY = world.y;

    const constrainedX = Math.max(5, Math.min(95, clickX));
    const constrainedY = Math.max(54, Math.min(86, clickY));

    if (targetElement.closest(".interactive-element") || targetElement.closest(".collectible-decor")) {
      return;
    }

    setBoyPosition((prev) => ({
      ...prev,
      targetX: constrainedX,
      targetY: constrainedY,
      isMoving: true,
    }));

    setSelectedAnimalId(null);
    setSelectedPlotId(null);
    setSelectedTreeId(null);
    reportInputDebug("pointerType" in e ? e.pointerType : "mouse", "tap", "pasture-ground");
  };

  // Get active subsets of animal species currently hanging out on selected location tab
  const getAnimalsInZone = (zone: LocationId) => {
    if (zone === "GARDEN") return [];
    if (zone === "MAX_HOME") {
      return gameState.animals.filter((a) =>
        [AnimalSpecies.CAT, AnimalSpecies.DOG].includes(a.species)
      );
    }
    return gameState.animals.filter((animal) => {
      const loc = animal.locationId || "MEADOW";
      if (loc !== zone) return false;
      const sp = animal.species;
      if ([AnimalSpecies.CAT, AnimalSpecies.DOG].includes(sp)) return true;
      if (zone === "MEADOW") {
        return [AnimalSpecies.CHICK, AnimalSpecies.CHICKEN, AnimalSpecies.DUCK, AnimalSpecies.PEACOCK, AnimalSpecies.RABBIT].includes(sp);
      }
      if (zone === "BARNYARD") {
        return [AnimalSpecies.COW, AnimalSpecies.BULL, AnimalSpecies.PIG, AnimalSpecies.HORSE, AnimalSpecies.DONKEY, AnimalSpecies.GOAT, AnimalSpecies.SHEEP, AnimalSpecies.DOG].includes(sp);
      }
      if (zone === "LAKESIDE") {
        return [AnimalSpecies.DUCK, AnimalSpecies.GOOSE, AnimalSpecies.SWAN, AnimalSpecies.GOAT, AnimalSpecies.SHEEP, AnimalSpecies.COW, AnimalSpecies.CAT].includes(sp);
      }
      if (zone === "ORCHARD") {
        return [AnimalSpecies.HORSE, AnimalSpecies.DONKEY, AnimalSpecies.RABBIT, AnimalSpecies.CAT, AnimalSpecies.DOG, AnimalSpecies.SHEEP, AnimalSpecies.CHICK, AnimalSpecies.CHICKEN, AnimalSpecies.TURKEY].includes(sp);
      }
      if (zone === "DESERT") {
        return [AnimalSpecies.T_REX, AnimalSpecies.TRICERATOPS, AnimalSpecies.PTERODACTYL, AnimalSpecies.DIPLODOCUS, AnimalSpecies.DONKEY, AnimalSpecies.GOAT, AnimalSpecies.FENNEC, AnimalSpecies.CAMEL].includes(sp);
      }
      if (zone === "FOREST") {
        return [AnimalSpecies.RABBIT, AnimalSpecies.SHEEP, AnimalSpecies.PIG, AnimalSpecies.CAT, AnimalSpecies.DOG, AnimalSpecies.T_REX, AnimalSpecies.DIPLODOCUS].includes(sp);
      }
      if (zone === "LAKE") {
        return [AnimalSpecies.DUCK, AnimalSpecies.GOOSE, AnimalSpecies.SWAN, AnimalSpecies.CAT, AnimalSpecies.SHEEP].includes(sp);
      }
      if (zone === "HILLS") {
        return [AnimalSpecies.HORSE, AnimalSpecies.DONKEY, AnimalSpecies.SHEEP, AnimalSpecies.GOAT, AnimalSpecies.PEACOCK, AnimalSpecies.DOG].includes(sp);
      }
      if (zone === "VALLEY") {
        return [AnimalSpecies.COW, AnimalSpecies.BULL, AnimalSpecies.PIG, AnimalSpecies.RABBIT, AnimalSpecies.CHICK, AnimalSpecies.CHICKEN, AnimalSpecies.DUCK, AnimalSpecies.GOAT].includes(sp);
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
    const isUnlocked = isInteriorZone(locId) || gameState.unlockedLocations.includes(locId);
    if (isUnlocked) {
      playClickSound();
      if (isInteriorZone(locId) && !isInteriorZone(activeZone)) {
        specialReturnZoneRef.current = activeZone;
      }
      setActiveZone(locId);
      setBoyPosition({
        x: 50,
        y: locId === "GARDEN" ? 63 : locId === "MAX_HOME" ? 72 : 70,
        targetX: 50,
        targetY: locId === "GARDEN" ? 63 : locId === "MAX_HOME" ? 72 : 70,
        isMoving: false,
        dir: "right",
      });
      setSelectedAnimalId(null);
      setSelectedPlotId(null);
      setSelectedTreeId(null);
      const welcome =
        locId === "GARDEN" ? "🥕 Добро пожаловать на большой огород!"
        : locId === "MAX_HOME" ? "🏠 Дом Макса! Роман-домовой поможет купить мебель."
        : `🚪 Переместились в: ${loc.nameRu}!`;
      triggerNotification(welcome);
    } else {
      playSadSound();
      triggerNotification(`🔒 Ой! Эта локация закрыта. Разблокируйте её на рынке за ${loc.unlockCost} монет на Уровне ${loc.minLevel}!`);
      setShopActiveTab("lands");
      setShowShopModal(true);
    }
  };

  const handleNextZone = () => {
    if (isInterior) return;
    const nextIndex = (currentZoneIndex + 1) % WORLD_ZONES.length;
    onSelectZoneWithLock(WORLD_ZONES[nextIndex]);
  };

  const handlePrevZone = () => {
    if (isInterior) return;
    const prevIndex = (currentZoneIndex - 1 + WORLD_ZONES.length) % WORLD_ZONES.length;
    onSelectZoneWithLock(WORLD_ZONES[prevIndex]);
  };

  const handleEnterGarden = () => {
    if (activeZone === "GARDEN") return;
    if (!isInterior) specialReturnZoneRef.current = activeZone;
    onSelectZoneWithLock("GARDEN");
  };

  const handleExitInterior = () => {
    if (!isInterior) return;
    playClickSound();
    const back = specialReturnZoneRef.current;
    setActiveZone(back);
    setBoyPosition({ x: 50, y: 70, targetX: 50, targetY: 70, isMoving: false, dir: "right" });
    setSelectedPlotId(null);
    triggerNotification(`⬆️ Возвращаемся: ${LOCATIONS[back].nameRu}`);
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
      className="h-[100dvh] min-h-[100dvh] bg-[#FFFEEF] flex flex-col font-sans transition-all duration-500 overflow-hidden"
      id="root-viewport-game"
    >
      {/* HUD Header bar has been integrated directly "above the sky" inside the pasture viewport below! */}

      <main className="w-full max-w-none mt-0 flex flex-col gap-0 animate-fade-in flex-1 min-h-0" id="main-farm-container">
        
        {/* WALKING WORLD VIEWPORT CANVAS - FULL BLEED RESIZING FOR ALL SCREENS */}
        <div
          className={`relative w-full shadow-lg flex-1 min-h-0 h-full ${gameRoomImmersive ? "invisible pointer-events-none" : ""}`}
          id="playground-viewport-wrapper"
          aria-hidden={gameRoomImmersive}
        >
          <div
            onPointerDown={(e) => {
              if (e.pointerType === "touch" && !(e.target as HTMLElement).closest(".interactive-element")) {
                e.currentTarget.setPointerCapture(e.pointerId);
              }
            }}
            onClick={handlePastureTape}
            onPointerMove={handlePasturePointerMove}
            onPointerUp={handlePasturePointerUp}
            onPointerLeave={handlePasturePointerUp}
            onPointerCancel={handlePasturePointerUp}
            onContextMenu={(e) => {
              const el = e.target as HTMLElement;
              if (el.closest(".interactive-element") || el.closest("#game-header")) {
                e.preventDefault();
              }
            }}
            style={{
                transition: "height 280ms ease-out",
              }}
            className={`w-full h-full min-h-0 rounded-none relative overflow-hidden transition-[background-color,box-shadow] duration-[1000ms] select-none touch-none ${
              liteEffects ? "mobile-lite" : ""
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
              onOpenMap={() => setShowLocationMap(true)}
              onOpenHelp={() => setShowHelp(true)}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              day={gameState.day}
              dayProgress={gameState.dayProgress}
            />



            {/* STAGE CONTAINER WITH SMOOTH PERSPECTIVE SCROLLING */}
            <div
              ref={stageElRef}
              id="scrolling-stage"
              className="absolute inset-0 select-none"
              style={{
                transformOrigin: "left bottom" as const,
                width: "100%",
                height: "100%",
                willChange: isPhone ? undefined : "transform",
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

            {/* === ДОМ МАКСА — уютный интерьер === */}
            {activeZone === "MAX_HOME" && (
              <MaxHomeInterior
                ownedFurniture={gameState.buildings?.MAX_HOME || []}
                onOpenShop={() => {
                  playClickSound();
                  setShowMaxHomeShop(true);
                  triggerNotification("🛋️ Роман-домовой: выбирай мебель для комнаты!");
                }}
                onOpenWardrobe={() => {
                  if (!(gameState.buildings?.MAX_HOME || []).includes("max_wardrobe")) return;
                  playClickSound();
                  setShowMaxWardrobe(true);
                  triggerNotification("👕 Шкаф Макса — покупай и меняй костюмы!");
                }}
                onImmersiveChange={setGameRoomImmersive}
              />
            )}

            {activeZone !== "MAX_HOME" && (
            <>
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
              activeZone === "GARDEN" ? "bg-gradient-to-t from-[#365314] via-lime-600 to-[#84CC16]" :
              activeZone === "LAKESIDE" ? "bg-gradient-to-t from-sky-400 via-emerald-500 to-green-500" :
              activeZone === "HILLS" ? "bg-gradient-to-t from-lime-700 via-emerald-500 to-green-400" :
              activeZone === "VALLEY" ? "bg-gradient-to-t from-teal-600 via-green-500 to-lime-400" :
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
            </>
            )}

            {/* Lakeside Pond layout — явный пруд с причалом */}
            {activeZone === "LAKESIDE" && (
              <>
                <div
                  className="absolute z-[8] pointer-events-none select-none rounded-t-[40%] border-4 border-sky-600/50 shadow-inner"
                  style={{
                    left: `${LAKESIDE_POND.minX}%`,
                    right: `${100 - LAKESIDE_POND.maxX}%`,
                    top: `${LAKESIDE_POND.minY}%`,
                    bottom: `${100 - LAKESIDE_POND.maxY}%`,
                    background: "linear-gradient(to top, #1D4ED8 0%, #38BDF8 55%, #7DD3FC 100%)",
                  }}
                  id="lakeside-water"
                >
                  <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent 12px,rgba(255,255,255,0.15)_12px,rgba(255,255,255,0.15)_24px)] animate-pulse" />
                  <div className="absolute inset-x-0 bottom-0 h-8 flex items-center justify-around">
                    <span className="text-2xl animate-pulse opacity-85">🪷</span>
                    <span className="text-xl opacity-75">🪷</span>
                    <span className="text-2xl opacity-85 animate-bounce-slow">🪷</span>
                  </div>
                </div>
                {/* Причал для рыбака Димы */}
                <div
                  className="absolute z-[9] pointer-events-none"
                  style={{ left: `${LAKESIDE_POND.dockX - 4}%`, top: `${LAKESIDE_POND.dockY - 2}%` }}
                >
                  <div className="w-16 h-4 bg-amber-800 rounded-sm border-2 border-amber-950 shadow-md" />
                  <div className="text-[8px] font-black text-amber-950 bg-amber-100/90 px-1 rounded mt-0.5 whitespace-nowrap">🎣 Пруд</div>
                </div>
                {/* Плавающие рыбки */}
                {pondFish.map((f) => (
                  <div
                    key={f.id}
                    className="absolute z-[10] pointer-events-none text-2xl select-none"
                    style={{
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      transform: `translate(-50%, -50%) scaleX(${f.scaleX})`,
                    }}
                  >
                    {f.emoji}
                  </div>
                ))}
              </>
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

            {/* 🌳 GROUND FOLIAGE — трава, кусты и деревья по типу локации */}
            {activeZone !== "MAX_HOME" && <GroundFoliage zone={activeZone} />}

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
                <div className="w-10 h-8 bg-amber-400 rounded-md border-b-2 border-amber-900/40 shadow flex items-center justify-center text-xs text-amber-900 font-bold">🌾</div>
                <div className="w-10 h-8 bg-amber-400 rounded-md border-b-2 border-amber-900/40 shadow flex items-center justify-center text-xs text-amber-900 font-bold">🌾</div>
              </div>
            )}

            {/* UNIFIED TOP HUD (рюкзак и лавка — полупрозрачные, не перекрывают игровое поле снизу) */}
            <div className="absolute left-2 lg:left-4 right-2 lg:right-4 top-10 lg:top-11 z-30 flex items-center justify-between gap-2 lg:gap-4 pointer-events-none select-none">
              {/* Miniature Cartoon Backpack containing non-empty items (No letters, only images/emojis and count figures) */}
              <div className="flex items-center gap-1 lg:gap-1.5 bg-[#FFF8DF]/45 backdrop-blur-sm border-2 border-[#7A4E31]/35 p-0.5 lg:p-1 px-1.5 lg:px-2.5 rounded-full shadow-md pointer-events-auto max-w-[calc(100%-88px)] lg:max-w-[calc(100%-110px)] overflow-x-auto scrollbar-none scale-[0.92] lg:scale-100 origin-left" id="compact-backpack-hud">
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
                    const bouquet = getBouquetCatalogEntry(key);
                    if (bouquet) icon = bouquet.icon;
                    else {
                      const match = Object.values(ANIMAL_TEMPLATES).find(t => t.productName === key);
                      if (match) icon = match.productIcon;
                    }
                  }

                  return (
                    <div key={key} className="flex items-center gap-0.5 bg-white/35 px-2 py-0.5 rounded-full border border-amber-900/10 text-[9.5px] font-black text-[#5C3A21] shrink-0 transform transition-all active:scale-95" title={key}>
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
                  className="bg-gradient-to-r from-amber-500/75 to-yellow-400/75 hover:from-amber-600/90 hover:to-yellow-500/90 backdrop-blur-sm text-white rounded-full border-2 border-[#7A4E31]/45 shadow-md flex items-center justify-center gap-0.5 active:scale-95 transform transition-all p-0.5 px-1.5 pointer-events-auto cursor-pointer select-none font-sans font-black text-[7px] uppercase tracking-wider shrink-0 leading-none scale-[0.82] origin-right"
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
                className="absolute right-2 bottom-[48px] w-[168px] h-[182px] sm:w-[185px] sm:h-[200px] cursor-pointer z-10 interactive-element hover:scale-105 active:scale-95 transition-all duration-300 flex flex-col justify-end"
                id="cozy-cabin"
              >
                {isNearMerchant && (
                  <span className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-amber-950 font-black text-[9px] p-0.5 px-2 rounded-full border-2 border-[#92400E] shadow-md animate-bounce whitespace-nowrap z-20">
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


            {/* C. Компактные грядки — всё на одном экране */}
            {activeZone === "GARDEN" && (
              <div className="absolute inset-x-[4%] top-[48%] bottom-[24px] pointer-events-none select-none z-0" id="garden-field">
                {GARDEN_ROW_Y.map((rowY) => (
                  <div
                    key={rowY}
                    className="absolute left-0 right-0 h-[18px] bg-gradient-to-r from-[#3F2A14] via-[#5C3A21] to-[#3F2A14] rounded-full opacity-95 shadow-md border-b-2 border-stone-900/50"
                    style={{ top: `${((rowY - 48) / 24) * 100}%` }}
                  />
                ))}
                <span className="absolute left-[2%] top-[8%] text-2xl opacity-85">🧑‍🌾</span>
                <span className="absolute right-[2%] top-[12%] text-2xl opacity-85">🪣</span>
                <span className="absolute left-1/2 -translate-x-1/2 top-[-8%] text-xl opacity-75">🌻</span>
                {(gameState.buildings?.GARDEN || []).includes("garden_autowater") && (
                  <>
                    <span className="absolute left-[25%] top-[55%] text-xl opacity-90 animate-pulse">💦</span>
                    <span className="absolute left-1/2 -translate-x-1/2 top-[58%] text-xl opacity-90 animate-pulse" style={{ animationDelay: "0.5s" }}>💦</span>
                    <span className="absolute right-[25%] top-[55%] text-xl opacity-90 animate-pulse" style={{ animationDelay: "1s" }}>💦</span>
                  </>
                )}
              </div>
            )}

            {/* D. CROP PLOTS — только на большом огороде */}
            {activeZone === "GARDEN" && (
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
                        width: '52px',
                        height: '46px'
                      }}
                    >
                      <span className="text-xl">🪵</span>
                      <span className="text-[7.5px] font-black text-amber-950 uppercase tracking-tight mt-0.5 leading-none">вспахать</span>
                      <span className="text-[8.5px] font-extrabold text-amber-900 bg-amber-200/90 rounded px-1 mt-1 leading-none border border-amber-300 select-none inline-flex items-center gap-0.5">
                        <CoinPrice amount={cost} iconSize={10} />
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
                      width: '52px',
                      height: '46px'
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
                  id={`pasture-bld-${bld.id}`}
                >
                  <div className="absolute bottom-0 w-20 h-5 bg-black/10 rounded-full blur-[2px] -z-10 group-hover:bg-black/20 transition-all duration-300" />
                  {bld.id === "max_house" ? (
                    <div className="flex flex-col items-center text-center drop-shadow-md relative">
                      <span
                        className="text-7xl md:text-8xl select-none transform hover:scale-110 active:scale-95 transition-transform duration-300 hover:rotate-2 cursor-pointer pointer-events-auto touch-none"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          beginLongPress(
                            e.pointerId,
                            "max-house",
                            e.clientX,
                            e.clientY,
                            () => showBuildingInfo(
                              bld.nameRu,
                              `Коснись — войти. Двойной тап — улучшить (Ур. ${gameState.maxHouseLevel || 1}).`,
                              bld.id,
                              e.pointerType
                            ),
                            { pointerType: e.pointerType }
                          );
                        }}
                        onPointerUp={(e) => handleMaxHousePointerUp(e, bld.x, bld.y)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          showBuildingInfo(
                            bld.nameRu,
                            `Коснись — войти. Двойной тап — улучшить (Ур. ${gameState.maxHouseLevel || 1}).`,
                            bld.id,
                            "mouse"
                          );
                        }}
                      >
                        {(gameState.maxHouseLevel || 1) === 1 ? "🛖" : (gameState.maxHouseLevel || 1) === 2 ? "🏡" : (gameState.maxHouseLevel || 1) === 3 ? "🧱" : (gameState.maxHouseLevel || 1) === 4 ? "🏰" : "🏰👑"}
                      </span>
                      <div
                        className="bg-[#5C3A21] border-2 border-[#FEF3C7] text-[9px] font-black text-[#FEF3C7] uppercase px-2 py-0.5 rounded-full shadow-md mt-1 scale-90 whitespace-nowrap pointer-events-auto cursor-pointer touch-none"
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          showBuildingInfo(
                            bld.nameRu,
                            `Коснись — войти. Двойной тап на дом — улучшить (Ур. ${gameState.maxHouseLevel || 1}).`,
                            bld.id,
                            e.pointerType
                          );
                        }}
                      >
                        🏡 {bld.nameRu} (Ур. {gameState.maxHouseLevel || 1})
                      </div>
                    </div>
                  ) : bld.id === "garden_scarecrow" ? (
                    <div
                      className="flex flex-col items-center text-center drop-shadow-md cursor-pointer pointer-events-auto touch-none"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        beginLongPress(
                          e.pointerId,
                          bld.id,
                          e.clientX,
                          e.clientY,
                          () => showBuildingInfo(bld.nameRu, bld.benefitRu, bld.id, e.pointerType),
                          { pointerType: e.pointerType }
                        );
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        if (endLongPress(e.pointerId).wasLongPress) return;
                        showBuildingInfo(bld.nameRu, bld.benefitRu, bld.id, e.pointerType);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        showBuildingInfo(bld.nameRu, bld.benefitRu, bld.id, "mouse");
                      }}
                    >
                      <ScarecrowSVG className="w-24 h-32 md:w-28 md:h-36 filter drop-shadow-lg hover:scale-105 transition-transform" />
                      <div className="bg-[#5C3A21] border-2 border-[#FEF3C7] text-[8px] font-black text-[#FEF3C7] uppercase px-2 py-0.5 rounded-full shadow-md mt-1 scale-90 whitespace-nowrap">
                        🌾 {bld.nameRu}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center text-center drop-shadow-md cursor-pointer pointer-events-auto touch-none"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        beginLongPress(
                          e.pointerId,
                          bld.id,
                          e.clientX,
                          e.clientY,
                          () => showBuildingInfo(bld.nameRu, bld.benefitRu, bld.id, e.pointerType),
                          { pointerType: e.pointerType }
                        );
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        if (endLongPress(e.pointerId).wasLongPress) return;
                        showBuildingInfo(bld.nameRu, bld.benefitRu, bld.id, e.pointerType);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        showBuildingInfo(bld.nameRu, bld.benefitRu, bld.id, "mouse");
                      }}
                    >
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

            {/* Загоны с забором (покупаемые) */}
            {(gameState.pens || [])
              .filter((p) => p.isOwned)
              .map((penState) => {
                const tpl = getPenTemplate(penState.templateId);
                if (!tpl || tpl.locationId !== activeZone) return null;
                const b = {
                  left: tpl.x - tpl.width / 2,
                  top: tpl.y - tpl.height / 2,
                  width: tpl.width,
                  height: tpl.height,
                };
                return (
                  <div
                    key={tpl.id}
                    className="absolute z-[6] pointer-events-auto"
                    style={{
                      left: `${b.left}%`,
                      top: `${b.top}%`,
                      width: `${b.width}%`,
                      height: `${b.height}%`,
                    }}
                  >
                    <div className={`absolute inset-0 rounded-xl border-4 border-dashed ${
                      penState.isOpen ? "border-amber-600/70 bg-amber-50/10" : "border-emerald-700 bg-emerald-50/15"
                    }`} />
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1">
                      <span className="text-[7px] font-black bg-white/90 px-1.5 py-0.5 rounded-full border border-amber-800 text-amber-950 whitespace-nowrap">
                        {getPenTypeEmoji(tpl.penType)} {tpl.nameRu}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePenGate(tpl.id);
                        }}
                        className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white border border-amber-700 shadow cursor-pointer hover:bg-amber-600"
                      >
                        {penState.isOpen ? "🔓" : "🔒"}
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* E. ANIMALS ROAMING & WALKING (Enlarged with massive size for kid touch!) */}
            {activeAnimalsList.map((animal) => {
              const isSelected = selectedAnimalId === animal.id;
              const template = ANIMAL_TEMPLATES[animal.species];
              const isDragged = draggedAnimalId === animal.id;
              const roamX = isDragged ? (dragAnimalLiveRef.current?.x ?? animal.x) : animal.x;
              const roamY = isDragged ? (dragAnimalLiveRef.current?.y ?? animal.y) : animal.y;

              if (
                !isEntityVisible(roamX, roamY) &&
                !isDragged &&
                !isSelected
              ) {
                return null;
              }

              return (
                <button
                  key={animal.id}
                  type="button"
                  onPointerDown={(e) => handleAnimalPointerDown(e, animal.id, animal.species)}
                  className={`absolute select-none z-[18] interactive-element touch-none border-0 bg-transparent p-0 outline-none focus:outline-none ${
                    isDragged
                      ? "z-50 cursor-grabbing"
                      : isSelected
                      ? "cursor-pointer"
                      : "cursor-pointer"
                  }`}
                  style={{ transform: "translate(-50%, -100%)" }}
                  id={`roamer-${animal.id}`}
                >
                  {!animal.isFed ? (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-rose-50 text-rose-600 rounded-full px-2 py-0.5 text-[8.5px] border-2 border-rose-300 font-black shadow-md animate-bounce whitespace-nowrap uppercase z-20 pointer-events-none">
                      😋 Покорми!
                    </span>
                  ) : animal.productionProgress >= 100 ? (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-yellow-400 text-amber-950 rounded-full px-2 py-0.5 text-[8.5px] border-2 border-yellow-600 font-black shadow-md animate-pulse whitespace-nowrap uppercase z-20 pointer-events-none">
                      {template.productIcon} Готово!
                    </span>
                  ) : isNight ? (
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-indigo-950 text-sky-200 border-2 border-indigo-400 rounded-full px-2 py-0.5 text-[8px] font-black shadow-md animate-bounce select-none whitespace-nowrap uppercase z-20 pointer-events-none">
                      💤 Спит...
                    </span>
                  ) : null}

                  {animal.isSheared && (
                    <>
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-rose-50 text-rose-700 rounded-full px-1.5 py-0.5 text-[8px] font-black border border-rose-300 whitespace-nowrap z-20 pointer-events-none">
                        Вай, холодно!
                      </span>
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-100 text-pink-700 rounded-full px-1.5 py-0.2 text-[8px] font-black border border-pink-300 whitespace-nowrap pointer-events-none">
                        {animal.customName}
                      </span>
                    </>
                  )}

                  <div
                    data-animal-sprite
                    className="w-24 h-24 origin-bottom pointer-events-none"
                  >
                    <div
                      className={`w-full h-full ${
                        isDragged
                          ? "scale-135 filter drop-shadow-[0_12px_12px_rgba(251,191,36,0.95)] brightness-110"
                          : isSelected
                          ? "scale-125 filter drop-shadow-[0_8px_8px_rgba(251,191,36,0.9)] brightness-105"
                          : "filter drop-shadow"
                      } ${isNight ? "brightness-50 saturate-75 contrast-90" : ""}`}
                    >
                    <AnimalSVG
                      species={animal.species}
                      happiness={animal.happiness}
                      isFed={animal.isFed}
                      isSheared={animal.isSheared}
                      cleanliness={animal.cleanliness}
                    />
                    </div>
                  </div>
                </button>
              );
            })}

            {/* 🌸 COLLECTIBLE WILDFLOWERS (grow on the lawn, click to pick) */}
            {flowers.filter((f) => isEntityVisible(f.x, f.y, 6)).map((f) => (
              <button
                key={f.id}
                type="button"
                onPointerUp={(e) => {
                  if (e.button !== 0) return;
                  handleCollectFlower(f.id, e);
                }}
                className="absolute w-14 h-14 flex items-end justify-center select-none cursor-pointer transition-transform duration-200 active:scale-90 hover:scale-125 z-20 interactive-element touch-none collectible-decor"
                style={{
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  transform: "translate(-50%, -100%)",
                }}
                id={`flower-${f.id}`}
              >
                <span
                  className="text-2xl filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.25)]"
                  style={{
                    transformOrigin: "bottom center",
                    animation: `flower-sway 3s ease-in-out ${f.swayDelay}s infinite`,
                  }}
                >
                  {f.emoji}
                </span>
              </button>
            ))}

            {/* 🦋 3D-EFFECT COLLECTIBLE BUTTERFLIES (Flit dynamically around pasture) */}
            {butterflies.filter((b) => isEntityVisible(b.x, b.y, 6)).map((b) => (
              <button
                key={b.id}
                type="button"
                onPointerUp={(e) => {
                  if (e.button !== 0) return;
                  handleCollectButterfly(b.id, e);
                }}
                className="absolute w-12 h-12 flex items-center justify-center select-none cursor-pointer transition-transform duration-200 active:scale-75 hover:scale-125 z-20 interactive-element touch-none collectible-decor"
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
            {fallingStars.filter((s) => isEntityVisible(s.x, s.y, 6)).map((s) => (
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

            {/* F2. ACTIVE HIRED WORKERS — под зверями, Макс всегда сверху */}
            {(gameState.workers ?? []).map((worker) => {
              if (worker.isBundledWithHome || worker.id === "worker-roman") return null;
              if (!worker.isActive) return null;
              const pos = workersPositions[worker.id];
              if (!pos || pos.currentZone !== activeZone) return null;
              const posX = pos ? pos.x : 20;
              const posY = pos ? pos.y : 72;
              const actionIcon =
                worker.id === "worker-mama" ? "🍿"
                : worker.id === "worker-nadya" || worker.id === "worker-kolya" || worker.id === "worker-fyodor" ? "🌱"
                : worker.id === "worker-vera" || worker.id === "worker-grisha" ? "💧"
                : worker.id === "worker-sonya" ? "🌾"
                : worker.id === "worker-lena" ? "🧹"
                : worker.id === "worker-pasha" ? "🧼"
                : worker.id === "worker-papa" ? "🔨"
                : worker.id === "worker-dima" ? "🎣"
                : worker.id === "worker-pastuh" ? "🤠"
                : worker.id === "worker-nina" ? "🥚"
                : worker.id === "worker-petya" ? "🐥"
                : worker.id === "worker-sveta" ? "🍞"
                : worker.id === "worker-misha" ? "✂️"
                : worker.id === "worker-masha" ? "⭐"
                : worker.id === "worker-sergey" ? "🔧"
                : worker.id === "worker-olya" ? "🐰"
                : worker.id === "worker-vika" ? "🐷"
                : worker.id === "worker-igor" ? "🏜️"
                : worker.id === "worker-tolya" ? "🦕"
                : worker.id === "worker-zoya" ? "🦢"
                : worker.id === "worker-roman" ? "🧹"
                : "💼";
              const isMoving = pos ? pos.isMoving : false;
              const dir = pos ? pos.dir : "right";
              const actionLabel = pos ? pos.actionLabel : undefined;

              const isDragged = draggedWorkerId === worker.id;
              const tossAngle = pos?.angle ?? 0;
              const roamX = isDragged ? (dragWorkerLiveRef.current?.x ?? posX) : posX;
              const roamY = isDragged ? (dragWorkerLiveRef.current?.y ?? posY) : posY;

              if (!isEntityVisible(roamX, roamY) && !isDragged) return null;

              return (
                <button
                  key={worker.id}
                  type="button"
                  id={`worker-roamer-${worker.id}`}
                  onPointerDown={(e) => handleWorkerPointerDown(e, worker.id)}
                  className={`absolute z-[14] pointer-events-auto cursor-pointer select-none interactive-element touch-none border-0 bg-transparent p-0 outline-none focus:outline-none ${
                    isDragged
                      ? "z-50 cursor-grabbing"
                      : ""
                  }`}
                  style={{ transform: "translate(-50%, -100%)" }}
                >
                  <div
                    data-worker-wobble
                    className="relative flex flex-col items-center"
                  >
                    <div className="absolute -top-7 px-1.5 py-0.5 bg-slate-900 border border-slate-600 text-slate-50 rounded-full text-[8px] font-black shadow-md flex items-center gap-1 whitespace-nowrap uppercase tracking-wider pointer-events-none">
                      <span>{worker.emoji}</span>
                      <span className={worker.id === "worker-fyodor" ? "normal-case" : ""}>
                        {worker.id === "worker-fyodor"
                          ? "деда Дима"
                          : worker.name.split(" ")[1] || worker.name}
                      </span>
                      <span className="text-[10px] animate-bounce">{actionIcon}</span>
                    </div>

                    {actionLabel && (
                      <div className="absolute -top-13 px-2 py-0.5 bg-amber-50 border-2 border-amber-500 text-amber-950 rounded-xl text-[8.5px] font-black shadow-lg flex items-center gap-1 whitespace-nowrap animate-bounce z-40 pointer-events-none">
                        {actionLabel}
                      </div>
                    )}

                    <div data-worker-sprite className="w-16 h-20 origin-bottom">
                      <div
                        className={`w-full h-full ${
                          isDragged
                            ? "scale-125 brightness-110 filter drop-shadow-[0_12px_12px_rgba(251,191,36,0.95)]"
                            : "filter drop-shadow-md"
                        }`}
                      >
                        <WorkerSVG workerId={worker.id} className="w-16 h-20" />
                      </div>
                    </div>

                    {/* Ground shadow for physical depth */}
                    <div className="absolute bottom-[-2px] bg-black/15 w-8 h-2 rounded-full filter blur-[1px]" />
                  </div>
                </button>
              );
            })}

            {/* F. MAXIM — всегда поверх зверей и NPC */}
            <div
              ref={maxElRef}
              className="absolute w-16 h-20 z-[40] pointer-events-none select-none"
            >
              <div ref={maxWobbleElRef} className="relative flex flex-col items-center">
                <img
                  src={getMaxOutfitSpriteSrc(gameState.activeMaxOutfit)}
                  alt="Максим"
                  className={`w-16 h-20 object-contain object-bottom ${isPhone ? "" : "filter drop-shadow-md"}`}
                  draggable={false}
                  loading={isPhone ? "lazy" : "eager"}
                  decoding="async"
                  key={gameState.activeMaxOutfit ?? "default"}
                />
                <div className="absolute bottom-[-2px] bg-black/15 w-8 h-2 rounded-full filter blur-[1px]" />
              </div>
            </div>

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
                <FloatParticle text={heart.emoji} />
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
                            <span className="inline-flex items-center gap-1">
                              🌱 ВСПАХАТЬ ЗА <CoinPrice amount={PLOT_COSTS[selectedPlotId]} iconSize={12} />
                            </span>
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

            {/* --- MULTI-ROOM NAVIGATION: left/right (мир) + down/up (огород) --- */}
            {!isInterior && (
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
            )}

            {!isInterior && (() => {
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

            {!isInterior && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnterGarden();
                }}
                className={`absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4 bg-gradient-to-b from-lime-200 to-emerald-400 hover:from-lime-100 hover:to-emerald-300 border-4 border-[#166534] rounded-[20px] flex flex-col items-center gap-0.5 shadow-2xl hover:scale-110 active:scale-95 transition-all z-30 cursor-pointer ${
                  isPhone ? "p-2 px-4 min-w-[64px]" : "p-2 px-5"
                }`}
                id="transition-down-garden"
              >
                <span className={isPhone ? "text-2xl" : "text-xl"}>⬇️</span>
                {!isPhone && (
                  <>
                    <span className="text-[8px] font-black text-[#14532D] uppercase tracking-wider leading-none">Огород</span>
                    <span className="text-[7.5px] font-extrabold text-[#166534] leading-none mt-0.5">🥕 Грядки</span>
                  </>
                )}
              </button>
            )}

            {isInterior && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExitInterior();
                }}
                className={`absolute left-1/2 -translate-x-1/2 bottom-3 sm:bottom-4 bg-gradient-to-b from-amber-100 to-amber-300 hover:from-white hover:to-amber-200 border-4 border-[#7A4E31] rounded-[20px] flex flex-col items-center gap-0.5 shadow-2xl hover:scale-110 active:scale-95 transition-all z-30 cursor-pointer ${
                  isPhone ? "p-2 px-4 min-w-[64px]" : "p-2 px-5"
                }`}
                id="transition-up-from-interior"
              >
                <span className={isPhone ? "text-2xl" : "text-xl"}>⬆️</span>
                {!isPhone && (
                  <>
                    <span className="text-[8px] font-black text-[#5C3A21] uppercase tracking-wider leading-none">Наверх</span>
                    <span className="text-[7.5px] font-extrabold text-[#92400E] max-w-[70px] truncate leading-none mt-0.5 text-center">
                      {LOCATIONS[specialReturnZoneRef.current].nameRu}
                    </span>
                  </>
                )}
              </button>
            )}

          </div>
        </div>

      </main>

      {/* TODDLER-FRIENDLY POPUP OVERLAY SHOP MODAL (No giant menus at the bottom!) */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-2 lg:p-4 animate-fade-in" id="shop-modal-panel">
          <div className="bg-[#FFFCEF] border-4 lg:border-6 border-[#6B3F23] rounded-2xl lg:rounded-3xl p-2 lg:p-4 shadow-2xl max-w-[min(88vw,300px)] lg:max-w-xl w-full relative max-h-[72vh] lg:max-h-[85vh] overflow-y-auto animate-scale-up" id="merchant-nearby-drawer">
            {/* Close Shop Button */}
            <button
              onClick={() => { playClickSound(); setShowShopModal(false); }}
              className="absolute top-2 right-2 lg:top-4 lg:right-4 w-8 h-8 lg:w-10 lg:h-10 bg-white hover:bg-rose-50 text-rose-600 border-2 lg:border-4 border-[#6B3F23] transition rounded-full cursor-pointer shadow-md font-black text-xs lg:text-sm flex items-center justify-center"
            >
              ❌
            </button>

            {/* Shop Header */}
            <div className="text-center mb-1.5 lg:mb-3 border-b-2 border-dashed border-[#6B3F23]/25 pb-1.5 lg:pb-2">
              <span className="text-2xl lg:text-4xl select-none">🏪</span>
              <h2 className="text-base lg:text-xl font-black text-[#6B3F23] mt-0.5">Рынок купца Семена</h2>
              <p className="text-[9px] lg:text-[11px] text-amber-800 font-bold">Веселый и мирный обмен без забоя животных! 🌸</p>
            </div>

             {/* Central big category tabs */}
            <div className="flex flex-wrap gap-1 lg:gap-1.5 justify-center mb-2 lg:mb-4 bg-[#6B3F23]/10 p-1 lg:p-1.5 rounded-xl lg:rounded-2xl" id="shop-tabs">
              {(["sell", "animals", "upgrades", "lands", "workers", "pens"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { playClickSound(); setShopActiveTab(tab); }}
                  className={`flex-1 min-w-[68px] lg:min-w-[90px] py-1 lg:py-2 px-1.5 lg:px-3 text-center text-[9px] lg:text-xs font-black rounded-lg lg:rounded-xl uppercase transition cursor-pointer border-2 ${
                    shopActiveTab === tab
                      ? "bg-[#6B3F23] text-white border-yellow-500 shadow-md scale-103"
                      : "bg-white text-[#6B3F23] border-transparent hover:bg-amber-50"
                  }`}
                >
                  {tab === "sell" && (
                    <span className="inline-flex items-center justify-center gap-0.5">
                      <CoinIcon size={12} /> Сбыт
                    </span>
                  )}
                  {tab === "animals" && "🐣 Зверята"}
                  {tab === "upgrades" && (
                    <span className="inline-flex items-center justify-center gap-0.5">
                      <SkillIcon size={12} /> Навыки
                    </span>
                  )}
                  {tab === "lands" && "🗺️ Карта"}
                  {tab === "workers" && "💼 Рабочие"}
                  {tab === "pens" && "🚧 Загоны"}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: 1. SELL MERCHANDISE */}
            {shopActiveTab === "sell" && (
              <div className="space-y-2 lg:space-y-4">
                {/* GIANT SATISFYING BUTTON TO SELL ALL FOR KIDS */}
                <div className="bg-yellow-400/90 border-2 lg:border-4 border-yellow-600 rounded-xl lg:rounded-[24px] p-2 lg:p-4 text-center shadow-lg transform hover:scale-102 transition-transform">
                  <CoinIcon className="mx-auto animate-bounce-slow" size={40} />
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
                      const bouquet = getBouquetCatalogEntry(key);
                      if (bouquet) {
                        basePrice = bouquet.sellPrice;
                        icon = bouquet.icon;
                        nameRu = bouquet.nameRu;
                      } else {
                        const template = Object.values(ANIMAL_TEMPLATES).find((t) => t.productName === key);
                        if (template) {
                          basePrice = template.productPrice;
                          icon = template.productIcon;
                          nameRu = template.productName;
                        }
                      }
                    }

                    const marketMultiplier = 1 + ((gameState.upgrades.marketContract || 1) - 1) * 0.10;
                    const finalPrice = Math.round(basePrice * marketMultiplier);

                    return (
                      <div key={key} className="bg-white p-1.5 lg:p-2.5 rounded-xl lg:rounded-2xl border-2 border-[#6B3F23]/15 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-1.5 lg:gap-2">
                          <GameIcon icon={icon} size={28} className="lg:hidden" />
                          <GameIcon icon={icon} size={32} className="hidden lg:block" />
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
                        <AnimalShopIcon species={species} />
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
                          <CoinIcon size={12} />
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
                    const currentLvl = gameState.upgrades[id] ?? upgrade.level ?? 0;
                    const maxedOut = currentLvl >= upgrade.maxLevel;
                    const cost = upgrade.cost * (currentLvl + 1);
                    const isAffordable = gameState.coins >= cost && !maxedOut;

                    return (
                      <div key={id} className="bg-white p-2 lg:p-3 rounded-xl lg:rounded-2xl border-2 border-[#6B3F23]/15 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-1.5 lg:gap-2.5">
                          <span className="text-2xl lg:text-3xl bg-amber-50 p-1 lg:p-1.5 rounded-lg lg:rounded-xl border border-amber-100 select-none inline-flex items-center justify-center">
                            <GameIcon icon={upgrade.icon} size={28} />
                          </span>
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
                              <CoinIcon size={12} />
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
                  if (locId === "MAX_HOME") return null;
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
                            {locId === "MAX_HOME" && "🏠"}
                            {locId === "GARDEN" && "🥕"}
                            {locId === "HILLS" && "⛰️"}
                            {locId === "VALLEY" && "🌄"}
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
                
                {(gameState.workers || []).filter((w) => !w.isBundledWithHome).map((worker) => {
                  const isAffordableToHire = gameState.coins >= worker.dailyWage;
                  return (
                    <div key={worker.id} className={`bg-white p-2 lg:p-3 rounded-xl lg:rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between shadow-xs ${worker.isActive ? "border-green-400 bg-green-50/10" : "border-[#6B3F23]/15"}`}>
                      <div className="flex items-center gap-2 lg:gap-3 w-full sm:w-auto">
                        <div className={`p-0.5 rounded-xl lg:rounded-2xl bg-gradient-to-br shadow-sm shrink-0 ${worker.color}`}>
                          <WorkerShopIcon workerId={worker.id} />
                        </div>
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
                          <div className="text-[9px] text-[#92400E] font-extrabold mt-1 inline-flex items-center gap-0.5">
                            Оплата: <CoinPrice amount={worker.dailyWage} iconSize={10} /> / день
                          </div>
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

            {/* TAB CONTENT: 6. PENS / ENCLOSURES */}
            {shopActiveTab === "pens" && (
              <div className="space-y-2 lg:space-y-3 max-h-[260px] lg:max-h-[380px] overflow-y-auto pr-1">
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 font-bold">
                  🚧 <strong>Загоны:</strong> купи забор, брось туда зверушку (удержи и перетащи). Закрой ворота 🔒 — животные не убегут! Пастух Ваня загонит разбежавшихся.
                </div>
                {PEN_TEMPLATES.map((penTpl) => {
                  const penState = gameState.pens?.find((p) => p.templateId === penTpl.id);
                  const owned = penState?.isOwned ?? false;
                  const canBuy = gameState.coins >= penTpl.cost && gameState.level >= penTpl.minLevel;
                  const locName = LOCATIONS[penTpl.locationId]?.nameRu || penTpl.locationId;
                  const animalLabel = `${getPenTypeEmoji(penTpl.penType)} ${getPenTypeLabel(penTpl.penType)}`;
                  return (
                    <div key={penTpl.id} className={`bg-white p-2 lg:p-3 rounded-xl border-2 flex flex-col sm:flex-row items-center justify-between gap-2 ${owned ? "border-emerald-400 bg-emerald-50/20" : "border-[#6B3F23]/15"}`}>
                      <div className="text-left">
                        <h4 className="font-extrabold text-xs text-slate-900">{penTpl.nameRu}</h4>
                        <p className="text-[9px] text-slate-500 mt-1">📍 {locName} · {animalLabel}</p>
                        <p className="text-[9px] text-amber-800 font-bold mt-0.5 inline-flex items-center gap-0.5">
                          Уровень {penTpl.minLevel}+ · <CoinPrice amount={penTpl.cost} iconSize={10} />
                        </p>
                      </div>
                      <div className="shrink-0">
                        {owned ? (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-300">
                            ✅ Построен {penState?.isOpen ? "🔓 открыт" : "🔒 закрыт"}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleBuyPen(penTpl.id, penTpl.cost, penTpl.minLevel)}
                            disabled={!canBuy}
                            className={`py-1.5 px-3 rounded-xl text-[10px] font-black cursor-pointer ${
                              canBuy ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            Купить {penTpl.cost}м
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dialogue footer statistics */}
            <div className="mt-2 lg:mt-4 pt-2 lg:pt-3.5 border-t-2 lg:border-t-4 border-dashed border-[#6B3F23]/15 flex justify-between items-center text-[8px] lg:text-[10px] text-[#6B3F23] font-black uppercase tracking-wider">
              <span className="inline-flex items-center gap-1">
                Золотой баланс: <strong className="text-yellow-600 inline-flex items-center gap-0.5"><CoinPrice amount={gameState.coins} iconSize={11} showLabel /></strong>
              </span>
              <span>Максим Фермер • Весело и Мирно!</span>
            </div>
          </div>
        </div>
      )}

      {showLocationMap && !gameRoomImmersive && (
        <LocationMapModal
          activeLocationId={activeZone}
          unlockedLocationIds={gameState.unlockedLocations}
          level={gameState.level}
          coins={gameState.coins}
          onSelectLocation={onSelectZoneWithLock}
          onClose={() => setShowLocationMap(false)}
        />
      )}

      {showMaxHomeShop && activeZone === "MAX_HOME" && !gameRoomImmersive && (
        <MaxHomeShop
          coins={gameState.coins}
          level={gameState.level}
          ownedIds={gameState.buildings?.MAX_HOME || []}
          onBuy={handleBuyMaxHomeFurniture}
          onClose={() => setShowMaxHomeShop(false)}
        />
      )}

      {showMaxWardrobe && activeZone === "MAX_HOME" && !gameRoomImmersive && (
        <MaxWardrobeModal
          coins={gameState.coins}
          level={gameState.level}
          purchasedOutfitIds={gameState.maxOutfits ?? []}
          activeOutfitId={gameState.activeMaxOutfit ?? "default"}
          onBuy={handleBuyMaxOutfit}
          onEquip={handleEquipMaxOutfit}
          onClose={() => setShowMaxWardrobe(false)}
        />
      )}

      {/* Help Instructions popup Overlay */}
      {showHelp && !gameRoomImmersive && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}

      {/* Floating brief action banner feedback */}
      {customNotification && !gameRoomImmersive && (
        <div className="fixed top-14 sm:top-16 lg:top-[4.25rem] left-1/2 transform -translate-x-1/2 bg-[#FFFBEB]/50 backdrop-blur-md text-[#92400E] text-[10px] lg:text-sm font-black p-2 px-4 lg:p-2.5 lg:px-5 rounded-2xl lg:rounded-3xl shadow-lg border-2 lg:border-[3px] border-[#92400E]/35 z-50 flex items-center gap-1.5 lg:gap-2 max-w-[92vw] pointer-events-none" id="live-notification">
          <span className="text-base lg:text-lg opacity-80">🌟</span>
          <span>{customNotification}</span>
        </div>
      )}

      <InputDebugOverlay />
    </div>
  );
}
