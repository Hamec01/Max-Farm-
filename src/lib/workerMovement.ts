import { ANIMAL_TEMPLATES, CROPS_CONFIG, TREES_CONFIG } from "../data";
import { GARDEN_PLOT_COORDS, getGardenPlotApproach } from "../data/gardenPlots";
import { WORLD_ZONES } from "../data/locations";
import { LAKESIDE_POND } from "./penLogic";
import {
  feedOneHungryAnimalInZone,
  GARDEN_PLOT_IDS,
  getAnimalHomeZone,
  harvestGardenPlot,
  harvestOneRipeGardenPlot,
  plantGardenPlot,
  plantOneEmptyGardenPlot,
  POULTRY_SPECIES,
  resolveAnimalFood,
  waterGardenPlot,
  waterOneDryGardenPlot,
  getPlantingCropOrder,
  type FeedOneResult,
} from "./farmAutomation";
import {
  pickWorkerTravelZone,
  randomSpotInZone,
  ZONE_TRAVEL_LABEL,
} from "./workerTravel";
import type { AnimalInstance, CropInstance, LocationId, PlayerState, TreeInstance } from "../types";
import { AnimalSpecies } from "../types";

export type WorkerTravelPhase =
  | "idle"
  | "exitWalk"
  | "entryWalk"
  | "toTask"
  | "working";

export interface WorkerPositionState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isMoving: boolean;
  dir: "left" | "right";
  actionLabel?: string;
  actionTimer: number;
  currentZone: LocationId;
  vx?: number;
  vy?: number;
  angle?: number;
  groundY?: number;
  travelPhase?: WorkerTravelPhase;
  travelTo?: LocationId;
  taskAnimalId?: string;
  taskPlotId?: string;
  taskTreeId?: string;
  pendingWorkLabel?: string;
}

export interface WorkerTaskTarget {
  x: number;
  y: number;
  approachLabel: string;
  workLabel: string;
  animalId?: string;
  plotId?: string;
  treeId?: string;
}

export const WORKER_TRAVEL_WALK_SPEED = 28;
export const WORKER_TASK_ARRIVE_DIST = 2.8;
/** Единый порог «дошёл» — совпадает с stepWalk, иначе дёргается */
export const WORKER_ARRIVE_DIST = 0.5;

function worldZoneIndex(zone: LocationId): number {
  return WORLD_ZONES.indexOf(zone as (typeof WORLD_ZONES)[number]);
}

/** К какому краю идти при переходе между зонами (кольцевой маршрут) */
export function pickTravelEdge(from: LocationId, to: LocationId): "left" | "right" {
  const fromIdx = worldZoneIndex(from);
  const toIdx = worldZoneIndex(to);
  if (fromIdx < 0 || toIdx < 0) return "right";
  const n = WORLD_ZONES.length;
  const forward = (toIdx - fromIdx + n) % n;
  const backward = (fromIdx - toIdx + n) % n;
  return forward <= backward ? "right" : "left";
}

export function getZoneExitPoint(from: LocationId, to: LocationId): { x: number; y: number } {
  const edge = pickTravelEdge(from, to);
  return { x: edge === "right" ? 96 : 4, y: 72 + Math.random() * 10 };
}

export function getZoneEntryPoint(from: LocationId, to: LocationId): { x: number; y: number } {
  const edge = pickTravelEdge(from, to);
  return { x: edge === "right" ? 6 : 94, y: 72 + Math.random() * 10 };
}

export function isWorkerTraveling(pos: WorkerPositionState | undefined): boolean {
  if (!pos?.travelPhase) return false;
  return pos.travelPhase === "exitWalk" || pos.travelPhase === "entryWalk";
}

export function isWorkerBusyWithTask(pos: WorkerPositionState | undefined): boolean {
  if (!pos?.travelPhase) return false;
  return pos.travelPhase === "toTask" || pos.travelPhase === "working";
}

export function canStartZoneTravel(pos: WorkerPositionState | undefined): boolean {
  if (!pos) return false;
  if (isWorkerTraveling(pos) || pos.travelPhase === "toTask") return false;
  if (pos.travelPhase === "working" && pos.actionTimer > 0) return false;
  return true;
}

export function hasReachedExit(pos: WorkerPositionState, x: number): boolean {
  if (pos.travelPhase !== "exitWalk") return false;
  if (pos.targetX >= 90) return x >= 91;
  return x <= 9;
}

/** Начать переход в другую зону — идём к краю карты */
export function beginZoneTravel(
  pos: WorkerPositionState,
  dutyZone: LocationId
): WorkerPositionState {
  const exit = getZoneExitPoint(pos.currentZone, dutyZone);
  return {
    ...pos,
    travelPhase: "exitWalk",
    travelTo: dutyZone,
    targetX: exit.x,
    targetY: exit.y,
    isMoving: true,
    actionLabel: ZONE_TRAVEL_LABEL[dutyZone] || "На дело!",
    actionTimer: 3500,
    taskAnimalId: undefined,
    taskPlotId: undefined,
    taskTreeId: undefined,
  };
}

/** Дошли до края — переносим в новую зону и идём внутрь */
export function completeZoneExit(
  pos: WorkerPositionState
): WorkerPositionState {
  if (!pos.travelTo) return { ...pos, travelPhase: "idle" };
  const entry = getZoneEntryPoint(pos.currentZone, pos.travelTo);
  const inner = randomSpotInZone(pos.travelTo);
  return {
    ...pos,
    currentZone: pos.travelTo,
    x: entry.x,
    y: entry.y,
    targetX: inner.x,
    targetY: inner.y,
    travelPhase: "entryWalk",
    isMoving: true,
    actionLabel: ZONE_TRAVEL_LABEL[pos.travelTo] || "Пришёл!",
    actionTimer: 2500,
    travelTo: pos.travelTo,
  };
}

export function findWorkerTaskTarget(
  workerId: string,
  gs: PlayerState,
  dutyZone: LocationId
): WorkerTaskTarget | null {
  const animals = (gs.animals || []).filter((a) => getAnimalHomeZone(a) === dutyZone);
  const inv = gs.inventory || {};
  const crops = gs.crops || {};
  const trees = gs.trees || {};

  switch (workerId) {
    case "worker-mama":
    case "worker-pastuh": {
      const hungry = animals.find((a) => {
        if (a.isFed) return false;
        const { hasFood } = resolveAnimalFood(inv, ANIMAL_TEMPLATES[a.species].foodType);
        return hasFood;
      });
      if (!hungry) return null;
      return {
        x: hungry.x,
        y: hungry.y,
        animalId: hungry.id,
        approachLabel: "Иду кормить...",
        workLabel: "🍽️ Кормлю!",
      };
    }

    case "worker-pasha": {
      const dirty = animals.find((a) => a.cleanliness < 70 || a.happiness < 75);
      if (!dirty) return null;
      return {
        x: dirty.x,
        y: dirty.y,
        animalId: dirty.id,
        approachLabel: "Иду мыть...",
        workLabel: "🧼 Чищу!",
      };
    }

    case "worker-papa": {
      const sad = animals.find((a) => a.happiness < 85);
      if (!sad) return null;
      return {
        x: sad.x,
        y: sad.y,
        animalId: sad.id,
        approachLabel: "Иду гладить...",
        workLabel: "❤️ Глажу!",
      };
    }

    case "worker-lena": {
      const ripe = animals.find(
        (a) => a.productionProgress >= 100 && a.species !== AnimalSpecies.SHEEP
      );
      if (ripe) {
        return {
          x: ripe.x,
          y: ripe.y,
          animalId: ripe.id,
          approachLabel: "За урожаем...",
          workLabel: "🧺 Собираю!",
        };
      }
      const treeId = Object.keys(trees).find((id) => trees[id]?.fruitCount > 0);
      if (treeId) {
        return {
          x: 28 + Math.random() * 44,
          y: 58 + Math.random() * 12,
          treeId,
          approachLabel: "К деревьям...",
          workLabel: "🍎 Срываю!",
        };
      }
      return null;
    }

    case "worker-misha": {
      const sheep = animals.find(
        (a) =>
          a.species === AnimalSpecies.SHEEP &&
          a.productionProgress >= 100 &&
          !a.isSheared
      );
      if (!sheep) return null;
      return {
        x: sheep.x,
        y: sheep.y,
        animalId: sheep.id,
        approachLabel: "К овечке...",
        workLabel: "✂️ Стригу!",
      };
    }

    case "worker-nina":
    case "worker-petya": {
      const bird = animals.find(
        (a) =>
          POULTRY_SPECIES.includes(a.species) &&
          (!a.isFed || a.productionProgress >= 100)
      );
      if (!bird) return null;
      return {
        x: bird.x,
        y: bird.y,
        animalId: bird.id,
        approachLabel: bird.isFed ? "За яйцом..." : "Кормлю птиц...",
        workLabel: bird.isFed ? "🥚 Собираю!" : "🍽️ Кормлю!",
      };
    }

    case "worker-olya": {
      const rabbit = animals.find(
        (a) =>
          a.species === AnimalSpecies.RABBIT &&
          (!a.isFed || a.productionProgress >= 100)
      );
      if (!rabbit) return null;
      return {
        x: rabbit.x,
        y: rabbit.y,
        animalId: rabbit.id,
        approachLabel: "К кролику...",
        workLabel: rabbit.isFed ? "🐰 Собираю!" : "🍽️ Кормлю!",
      };
    }

    case "worker-vika": {
      const pig = animals.find(
        (a) =>
          a.species === AnimalSpecies.PIG &&
          (!a.isFed || a.productionProgress >= 100 || a.cleanliness < 75)
      );
      if (!pig) return null;
      return {
        x: pig.x,
        y: pig.y,
        animalId: pig.id,
        approachLabel: "К хрюшке...",
        workLabel: pig.cleanliness < 75 ? "🧼 Мою!" : "🍽️ Кормлю!",
      };
    }

    case "worker-zoya": {
      const bird = animals.find(
        (a) =>
          [AnimalSpecies.DUCK, AnimalSpecies.GOOSE, AnimalSpecies.SWAN].includes(a.species) &&
          (!a.isFed || a.productionProgress >= 100)
      );
      if (!bird) return null;
      return {
        x: bird.x,
        y: bird.y,
        animalId: bird.id,
        approachLabel: "К водоплавам...",
        workLabel: "🦢 Ухаживаю!",
      };
    }

    case "worker-sergey": {
      const sad = animals.find((a) => a.happiness < 90);
      if (sad) {
        return {
          x: sad.x,
          y: sad.y,
          animalId: sad.id,
          approachLabel: "Подбодрить...",
          workLabel: "😊 Радую!",
        };
      }
      const treeId = Object.keys(trees).find(
        (id) => trees[id] && trees[id].fruitCount < TREES_CONFIG[trees[id].type].yieldCount
      );
      if (treeId) {
        return {
          x: 22 + Math.random() * 50,
          y: 56 + Math.random() * 16,
          treeId,
          approachLabel: "К деревьям...",
          workLabel: "🌳 Ухаживаю!",
        };
      }
      return null;
    }

    case "worker-andrey": {
      const treeId = Object.keys(trees).find(
        (id) => trees[id] && trees[id].fruitCount < TREES_CONFIG[trees[id].type].yieldCount
      );
      if (!treeId) return null;
      return {
        x: 20 + Math.random() * 55,
        y: 56 + Math.random() * 18,
        treeId,
        approachLabel: "В сад...",
        workLabel: "🌳 Ухаживаю!",
      };
    }

    case "worker-dima":
      return {
        x: LAKESIDE_POND.dockX,
        y: LAKESIDE_POND.dockY,
        approachLabel: "К пруду...",
        workLabel: "🎣 Ловлю!",
      };

    case "worker-arina":
      return {
        x: 40 + Math.random() * 35,
        y: 68 + Math.random() * 12,
        approachLabel: "По берегу...",
        workLabel: "📋 Работаю!",
      };

    case "worker-masha":
      return {
        x: 35 + Math.random() * 30,
        y: 66 + Math.random() * 14,
        approachLabel: "Смотрю звёзды...",
        workLabel: "⭐ Звёзды!",
      };

    case "worker-sveta":
      return {
        x: 30 + Math.random() * 40,
        y: 68 + Math.random() * 14,
        approachLabel: "К печи...",
        workLabel: "🍞 Пеку!",
      };

    case "worker-igor": {
      const desertAnimal = animals.find(
        (a) =>
          a.productionProgress >= 100 &&
          [AnimalSpecies.FENNEC, AnimalSpecies.CAMEL].includes(a.species)
      );
      if (desertAnimal) {
        return {
          x: desertAnimal.x,
          y: desertAnimal.y,
          animalId: desertAnimal.id,
          approachLabel: "К верблюду...",
          workLabel: "🏜️ Собираю!",
        };
      }
      return {
        x: 25 + Math.random() * 50,
        y: 66 + Math.random() * 16,
        approachLabel: "По пустыне...",
        workLabel: "🏜️ Собираю!",
      };
    }

    case "worker-tolya": {
      const dino = animals.find((a) => a.happiness < 80);
      if (!dino) return null;
      return {
        x: dino.x,
        y: dino.y,
        animalId: dino.id,
        approachLabel: "К динозавру...",
        workLabel: "🦕 Глажу!",
      };
    }

    case "worker-kolya":
    case "worker-vera":
    case "worker-grisha": {
      const dryId = GARDEN_PLOT_IDS.find((id) => {
        const c = crops[id];
        return c && c.progress > 0 && c.progress < 100 && !c.isWatered;
      });
      if (dryId) {
        const coords = getGardenPlotApproach(dryId);
        return {
          x: coords.x,
          y: coords.y,
          plotId: dryId,
          approachLabel: "К грядке...",
          workLabel: "💧 Поливаю!",
        };
      }
      return null;
    }

    case "worker-nadya": {
      const dryId = GARDEN_PLOT_IDS.find((id) => {
        const c = crops[id];
        return c && c.progress > 0 && c.progress < 100 && !c.isWatered;
      });
      if (dryId) {
        const coords = getGardenPlotApproach(dryId);
        return { x: coords.x, y: coords.y, plotId: dryId, approachLabel: "К грядке...", workLabel: "💧 Поливаю!" };
      }
      const emptyId = GARDEN_PLOT_IDS.find((id) => {
        const c = crops[id];
        return c && c.progress === 0 && !c.isDead;
      });
      if (emptyId) {
        const coords = getGardenPlotApproach(emptyId);
        return { x: coords.x, y: coords.y, plotId: emptyId, approachLabel: "Сажаю...", workLabel: "🌱 Сажаю!" };
      }
      const ripeId = GARDEN_PLOT_IDS.find((id) => crops[id]?.progress >= 100);
      if (ripeId) {
        const coords = getGardenPlotApproach(ripeId);
        return { x: coords.x, y: coords.y, plotId: ripeId, approachLabel: "На сбор...", workLabel: "🌾 Собираю!" };
      }
      return null;
    }

    case "worker-fyodor": {
      const emptyId = GARDEN_PLOT_IDS.find((id) => {
        const c = crops[id];
        return c && c.progress === 0 && !c.isDead;
      });
      if (emptyId) {
        const coords = getGardenPlotApproach(emptyId);
        return {
          x: coords.x,
          y: coords.y,
          plotId: emptyId,
          approachLabel: "Сажаю...",
          workLabel: "🌱 Сажаю!",
        };
      }
      return null;
    }

    case "worker-sonya": {
      const ripeId = GARDEN_PLOT_IDS.find((id) => crops[id]?.progress >= 100);
      if (!ripeId) return null;
      const coords = getGardenPlotApproach(ripeId);
      return {
        x: coords.x,
        y: coords.y,
        plotId: ripeId,
        approachLabel: "На сбор...",
        workLabel: "🌾 Собираю!",
      };
    }

    default:
      return null;
  }
}

export interface WorkerTaskResult {
  animals?: AnimalInstance[];
  inventory?: Record<string, number>;
  crops?: Record<string, CropInstance>;
  trees?: Record<string, TreeInstance>;
  coins?: number;
  xp?: number;
  fed?: boolean;
  didWork?: boolean;
}

/** Выполнить задачу работника по прибытии к цели */
export function performWorkerTask(
  workerId: string,
  gs: PlayerState,
  task: Pick<WorkerTaskTarget, "animalId" | "plotId" | "treeId">
): WorkerTaskResult {
  const result: WorkerTaskResult = { didWork: false };
  let animals = [...(gs.animals || [])];
  let inventory = { ...(gs.inventory || {}) };
  let crops = { ...(gs.crops || {}) };
  let trees = { ...(gs.trees || {}) };
  let coins = gs.coins;
  let xp = 0;
  const feederLvl = gs.upgrades?.autoFeeder || 1;
  const autoFeederMultiplier = 1 + (feederLvl - 1) * 0.2;
  const compostLvl = gs.upgrades?.richCompost || 0;
  const isNight = (gs.dayProgress ?? 0) >= 192;

  const feedInZone = (
    zone: LocationId,
    options?: Parameters<typeof feedOneHungryAnimalInZone>[3]
  ): FeedOneResult => {
    return feedOneHungryAnimalInZone(animals, inventory, zone, {
      autoFeederMultiplier,
      ...options,
    });
  };

  switch (workerId) {
    case "worker-mama":
    case "worker-pastuh": {
      const zone = pickWorkerTravelZone(workerId, animals, inventory, "BARNYARD");
      const feed = feedInZone(zone, workerId === "worker-pastuh" ? { happinessBoost: 12, xpReward: 6 } : undefined);
      if (feed.fed) {
        animals = feed.animals;
        inventory = feed.inventory;
        xp += feed.xp;
        result.didWork = true;
        result.fed = true;
      }
      break;
    }

    case "worker-pasha": {
      let brushed = false;
      animals = animals.map((a) => {
        if (!brushed && (a.cleanliness < 70 || a.happiness < 75)) {
          brushed = true;
          return { ...a, cleanliness: 100, happiness: Math.min(a.happiness + 20, 100) };
        }
        return a;
      });
      if (brushed) { result.didWork = true; xp += 8; }
      break;
    }

    case "worker-papa": {
      let petted = false;
      animals = animals.map((a) => {
        if (!petted && a.happiness < 85) {
          petted = true;
          return { ...a, happiness: Math.min(a.happiness + 15, 100) };
        }
        return a;
      });
      if (petted) { result.didWork = true; xp += 6; }
      break;
    }

    case "worker-lena": {
      let collected = false;
      animals = animals.map((a) => {
        if (!collected && a.productionProgress >= 100 && a.species !== AnimalSpecies.SHEEP) {
          collected = true;
          const config = ANIMAL_TEMPLATES[a.species];
          inventory[config.productName] = (inventory[config.productName] || 0) + 1;
          xp += 12;
          return { ...a, productionProgress: 0 };
        }
        return a;
      });
      if (!collected && task.treeId && trees[task.treeId]?.fruitCount > 0) {
        const tree = trees[task.treeId];
        const fruitKey = TREES_CONFIG[tree.type].fruitNameRu === "Яблоко" ? "APPLE" : "CHERRY";
        inventory[fruitKey] = (inventory[fruitKey] || 0) + 1;
        trees = { ...trees, [task.treeId]: { ...tree, fruitCount: tree.fruitCount - 1 } };
        collected = true;
        xp += 15;
      }
      if (collected) result.didWork = true;
      break;
    }

    case "worker-misha": {
      let sheared = false;
      animals = animals.map((a) => {
        if (
          !sheared &&
          a.species === AnimalSpecies.SHEEP &&
          a.productionProgress >= 100 &&
          !a.isSheared
        ) {
          sheared = true;
          const config = ANIMAL_TEMPLATES[a.species];
          inventory[config.productName] = (inventory[config.productName] || 0) + 1;
          xp += 12;
          return {
            ...a,
            productionProgress: 0,
            isSheared: true,
            regrowWoolTimeRemaining: 30,
            happiness: Math.max(a.happiness - 5, 40),
          };
        }
        return a;
      });
      if (sheared) result.didWork = true;
      break;
    }

    case "worker-nina":
    case "worker-petya": {
      const zone = pickWorkerTravelZone(workerId, animals, inventory, "MEADOW");
      const feed = feedInZone(zone, {
        speciesFilter: POULTRY_SPECIES,
        happinessBoost: 15,
        xpReward: 7,
      });
      if (feed.fed) {
        animals = feed.animals;
        inventory = feed.inventory;
        xp += feed.xp;
        result.didWork = true;
      } else {
        let collected = false;
        animals = animals.map((a) => {
          if (!collected && a.productionProgress >= 100 && POULTRY_SPECIES.includes(a.species)) {
            collected = true;
            const config = ANIMAL_TEMPLATES[a.species];
            inventory[config.productName] = (inventory[config.productName] || 0) + 1;
            xp += 10;
            return { ...a, productionProgress: 0 };
          }
          return a;
        });
        if (collected) result.didWork = true;
      }
      break;
    }

    case "worker-olya": {
      const feed = feedInZone("MEADOW", {
        speciesFilter: [AnimalSpecies.RABBIT],
        happinessBoost: 12,
        xpReward: 6,
      });
      if (feed.fed) {
        animals = feed.animals;
        inventory = feed.inventory;
        xp += feed.xp;
        result.didWork = true;
      } else {
        let collected = false;
        animals = animals.map((a) => {
          if (!collected && a.species === AnimalSpecies.RABBIT && a.productionProgress >= 100) {
            collected = true;
            const config = ANIMAL_TEMPLATES[a.species];
            inventory[config.productName] = (inventory[config.productName] || 0) + 1;
            xp += 10;
            return { ...a, productionProgress: 0 };
          }
          return a;
        });
        if (collected) result.didWork = true;
      }
      break;
    }

    case "worker-vika": {
      const feed = feedInZone("BARNYARD", {
        speciesFilter: [AnimalSpecies.PIG],
        happinessBoost: 10,
        xpReward: 6,
      });
      if (feed.fed) {
        animals = feed.animals;
        inventory = feed.inventory;
        xp += feed.xp;
        result.didWork = true;
      } else {
        let cleaned = false;
        animals = animals.map((a) => {
          if (!cleaned && a.species === AnimalSpecies.PIG && a.cleanliness < 75) {
            cleaned = true;
            return { ...a, cleanliness: 100 };
          }
          return a;
        });
        if (cleaned) result.didWork = true;
      }
      break;
    }

    case "worker-zoya": {
      const feed = feedInZone("LAKE", {
        speciesFilter: [AnimalSpecies.DUCK, AnimalSpecies.GOOSE, AnimalSpecies.SWAN],
        happinessBoost: 12,
        xpReward: 6,
      });
      if (feed.fed) {
        animals = feed.animals;
        inventory = feed.inventory;
        xp += feed.xp;
        result.didWork = true;
      }
      break;
    }

    case "worker-sergey": {
      let cheered = false;
      animals = animals.map((a) => {
        if (!cheered && a.happiness < 90) {
          cheered = true;
          return { ...a, happiness: Math.min(a.happiness + 8, 100) };
        }
        return a;
      });
      if (cheered) {
        result.didWork = true;
      } else if (task.treeId && trees[task.treeId]) {
        const tree = trees[task.treeId];
        const updated = { ...tree, fruitProgress: Math.min(tree.fruitProgress + 8, 100) };
        if (updated.fruitProgress >= 100) {
          updated.fruitCount = Math.min(updated.fruitCount + 1, TREES_CONFIG[tree.type].yieldCount);
          updated.fruitProgress = 0;
        }
        trees = { ...trees, [task.treeId]: updated };
        result.didWork = true;
      }
      break;
    }

    case "worker-andrey": {
      if (task.treeId && trees[task.treeId]) {
        const tree = trees[task.treeId];
        const updated = { ...tree, fruitProgress: Math.min(tree.fruitProgress + 12, 100) };
        if (updated.fruitProgress >= 100) {
          updated.fruitCount = Math.min(updated.fruitCount + 1, TREES_CONFIG[tree.type].yieldCount);
          updated.fruitProgress = 0;
        }
        trees = { ...trees, [task.treeId]: updated };
        result.didWork = true;
      }
      break;
    }

    case "worker-dima":
      coins += 6;
      xp += 4;
      result.didWork = true;
      break;

    case "worker-arina":
      xp += 5;
      result.didWork = true;
      break;

    case "worker-masha":
      if (isNight) {
        coins += 8;
        xp += 8;
        result.didWork = true;
      }
      break;

    case "worker-sveta":
      if ((inventory.WHEAT || 0) > 0) {
        inventory = { ...inventory, WHEAT: inventory.WHEAT - 1 };
        coins += 12;
        xp += 6;
        result.didWork = true;
      }
      break;

    case "worker-igor": {
      let collected = false;
      animals = animals.map((a) => {
        if (
          !collected &&
          a.productionProgress >= 100 &&
          [AnimalSpecies.FENNEC, AnimalSpecies.CAMEL].includes(a.species)
        ) {
          collected = true;
          const config = ANIMAL_TEMPLATES[a.species];
          inventory[config.productName] = (inventory[config.productName] || 0) + 1;
          xp += 12;
          return { ...a, productionProgress: 0 };
        }
        return a;
      });
      coins += 3;
      xp += 2;
      result.didWork = collected || true;
      break;
    }

    case "worker-tolya": {
      let petted = false;
      animals = animals.map((a) => {
        if (!petted && a.happiness < 80) {
          petted = true;
          return { ...a, happiness: Math.min(a.happiness + 12, 100) };
        }
        return a;
      });
      if (petted) { result.didWork = true; xp += 5; }
      break;
    }

    case "worker-kolya":
    case "worker-vera":
    case "worker-grisha":
      if (task.plotId && waterGardenPlot(crops, task.plotId)) {
        result.didWork = true;
        xp += 4;
      } else if (!task.plotId && waterOneDryGardenPlot(crops)) {
        result.didWork = true;
        xp += 4;
      }
      break;

    case "worker-nadya": {
      const plotId = task.plotId;
      if (plotId && waterGardenPlot(crops, plotId)) {
        result.didWork = true;
        xp += 4;
        break;
      }
      const order = getPlantingCropOrder(animals, inventory);
      if (plotId) {
        const planted = plantGardenPlot(crops, plotId, order, inventory, coins);
        if (planted.planted) {
          coins -= planted.coinsSpent;
          result.didWork = true;
          xp += 5;
          break;
        }
      } else {
        const planted = plantOneEmptyGardenPlot(crops, order, inventory, coins);
        if (planted.planted) {
          coins -= planted.coinsSpent;
          result.didWork = true;
          xp += 5;
          break;
        }
      }
      if (plotId && harvestGardenPlot(crops, plotId, inventory, compostLvl)) {
        result.didWork = true;
        xp += 10;
      } else if (!plotId && harvestOneRipeGardenPlot(crops, inventory, compostLvl)) {
        result.didWork = true;
        xp += 10;
      }
      break;
    }

    case "worker-fyodor": {
      const order = getPlantingCropOrder(animals, inventory);
      if (task.plotId) {
        const planted = plantGardenPlot(crops, task.plotId, order, inventory, coins);
        if (planted.planted) {
          coins -= planted.coinsSpent;
          result.didWork = true;
          xp += 5;
        }
      } else {
        const planted = plantOneEmptyGardenPlot(crops, order, inventory, coins);
        if (planted.planted) {
          coins -= planted.coinsSpent;
          result.didWork = true;
          xp += 5;
        }
      }
      break;
    }

    case "worker-sonya":
      if (task.plotId && harvestGardenPlot(crops, task.plotId, inventory, compostLvl)) {
        result.didWork = true;
        xp += 10;
      } else if (!task.plotId && harvestOneRipeGardenPlot(crops, inventory, compostLvl)) {
        result.didWork = true;
        xp += 10;
      }
      break;

    default:
      break;
  }

  if (result.didWork) {
    result.animals = animals;
    result.inventory = inventory;
    result.crops = crops;
    result.trees = trees;
    result.coins = coins;
    result.xp = xp;
  }
  return result;
}

/** Случайная прогулка, когда нет задач */
export function randomWanderTarget(
  workerId: string,
  zone: LocationId
): { x: number; y: number } {
  if (workerId === "worker-dima" && zone === "LAKESIDE") {
    return {
      x: LAKESIDE_POND.dockX - 6 + Math.random() * 12,
      y: LAKESIDE_POND.dockY - 3 + Math.random() * 5,
    };
  }
  if (zone === "GARDEN") {
    const plotId = GARDEN_PLOT_IDS[Math.floor(Math.random() * GARDEN_PLOT_IDS.length)];
    return getGardenPlotApproach(plotId);
  }
  return randomSpotInZone(zone);
}

export function workerNeedsMovement(
  w: WorkerPositionState,
  liveX?: number,
  liveY?: number
): boolean {
  const cx = liveX ?? w.x;
  const cy = liveY ?? w.y;
  const dist = Math.hypot(w.targetX - cx, w.targetY - cy);
  if (dist > WORKER_ARRIVE_DIST) return true;
  const phase = w.travelPhase ?? "idle";
  // toTask/working — только пока не дошли; иначе таймер решений не вызовет performWorkerTask
  return phase === "exitWalk" || phase === "entryWalk";
}
