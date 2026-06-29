import { ANIMAL_TEMPLATES, CROPS_CONFIG, INITIAL_STATE, UPGRADES } from "../data";
import { AnimalSpecies } from "../types";
import { MEADOW_LEVEL_HEIGHT, MEADOW_LEVEL_WIDTH } from "../lib/sceneLayout";
import type {
  CropUnlockDefinition,
  Stage1AnimalDefinition,
  Stage1AnimalSpecies,
  Stage1CropPlotState,
  Stage1CropType,
  Stage1LaneId,
  Stage1PenDefinition,
  Stage1PersistentState,
  Stage1UnlockableCropType,
  UpgradeDefinition,
} from "./types";

export const STAGE1_SAVE_KEY = "max-farm-stage1-save";
export const STAGE1_SAVE_BACKUP_KEY = "max-farm-stage1-save-backup";
export const LEGACY_SAVE_KEY = "maxim_fermer_save";

export const STAGE1_WORLD = {
  height: MEADOW_LEVEL_HEIGHT,
  locations: {
    MEADOW: {
      width: MEADOW_LEVEL_WIDTH,
      groundY: Math.round(MEADOW_LEVEL_HEIGHT * 0.741),
      lanes: {
        "meadow-main": {
          id: "meadow-main" as Stage1LaneId,
          y: Math.round(MEADOW_LEVEL_HEIGHT * 0.741),
          minX: 140,
          maxX: MEADOW_LEVEL_WIDTH - 140,
        },
      },
    },
    GARDEN: {
      width: 2172,
      groundY: 612,
      lanes: {
        "garden-main": {
          id: "garden-main" as Stage1LaneId,
          y: 612,
          minX: 180,
          maxX: 1992,
        },
      },
    },
  },
};

export const STAGE1_ASSETS = {
  meadowBackground: "/assets/backgrounds/meadow-level-01.png",
  gardenBackground: "/assets/backgrounds/garden-stage1.png",
  max: "/assets/characters/maxim/idle.png",
  workerMama: "/assets/characters/workers/worker-mama.png",
};

function createBirdDefinition(
  species: Stage1AnimalSpecies,
  tint: Stage1AnimalDefinition["tint"],
  spriteHeight: number,
): Stage1AnimalDefinition {
  const legacy = ANIMAL_TEMPLATES[species as AnimalSpecies];
  return {
    species,
    nameRu: legacy.nameRu,
    emoji: legacy.emoji,
    cost: legacy.cost,
    foodType: legacy.foodType,
    productKey: `${species}_PRODUCT`,
    productNameRu: legacy.productName,
    productPrice: legacy.productPrice,
    hungerDurationSec: Math.max(28, legacy.productionTime + 18),
    productionDurationSec: Math.max(12, legacy.productionTime),
    wanderStep: species === "TURKEY" ? 95 : species === "GOOSE" ? 88 : 72,
    spriteHeight,
    penType: "BIRD",
    tint,
  };
}

export const STAGE1_ANIMAL_DEFS: Record<Stage1AnimalSpecies, Stage1AnimalDefinition> = {
  CHICK: createBirdDefinition("CHICK", {
    happy: "#ffe36f",
    hungry: "#f4b35e",
    accent: "#ff9b47",
  }, 82),
  CHICKEN: createBirdDefinition("CHICKEN", {
    happy: "#fff1db",
    hungry: "#f7c9a9",
    accent: "#e36b4f",
  }, 94),
  DUCK: createBirdDefinition("DUCK", {
    happy: "#d9f4ff",
    hungry: "#a7d5e6",
    accent: "#ffb04c",
  }, 96),
  GOOSE: createBirdDefinition("GOOSE", {
    happy: "#f8f8f4",
    hungry: "#d8ddd6",
    accent: "#ff9f59",
  }, 108),
  TURKEY: createBirdDefinition("TURKEY", {
    happy: "#9b6745",
    hungry: "#75513a",
    accent: "#d64a58",
  }, 114),
};

export const STAGE1_STARTING_BIRD_SPECIES: Stage1AnimalSpecies = "CHICK";
export const STAGE1_PRODUCT_XP = 12;
export const STAGE1_FEED_XP = 5;
export const STAGE1_HARVEST_XP = 9;
export const STAGE1_CLEAN_PEN_XP = 6;
export const STAGE1_BUY_PEN_XP = 8;
export const STAGE1_RESCUE_SEED_GRANT = 3;
export const STAGE1_INTERACTION_RANGE = 120;
export const STAGE1_PLAYER_SPEED = 260;
export const STAGE1_WORKER_SPEED = 210;
export const STAGE1_WANDER_STEP = 72;
export const STAGE1_CHICK_TEMPLATE = STAGE1_ANIMAL_DEFS.CHICK;
export const STAGE1_BUY_CHICK_LIMIT = 6;
export const STAGE1_INVENTORY_FOOD_KEY = "WHEAT";
export const STAGE1_PRODUCT_KEY = "CHICK_PRODUCT";

export const STAGE1_BIRD_PENS: Record<string, Stage1PenDefinition> = {
  "bird-pen-1": {
    id: "bird-pen-1",
    nameRu: "Птичий двор",
    capacity: 3,
    cost: 0,
    laneId: "meadow-main",
    minX: 620,
    maxX: 1030,
    centerX: 825,
    groundY: STAGE1_WORLD.locations.MEADOW.groundY,
  },
  "bird-pen-2": {
    id: "bird-pen-2",
    nameRu: "Большой курятник",
    capacity: 3,
    cost: 140,
    laneId: "meadow-main",
    minX: 1080,
    maxX: 1480,
    centerX: 1280,
    groundY: STAGE1_WORLD.locations.MEADOW.groundY,
  },
};

export const STAGE1_PEN_ORDER = ["bird-pen-1", "bird-pen-2"] as const;

export const STAGE1_UPGRADE: UpgradeDefinition = {
  id: "autoFeeder",
  name: "Суперкорм",
  description: "Птички дольше сыты.",
  cost: UPGRADES.autoFeeder.cost,
  maxLevel: 1,
  hungerDecayMultiplier: 0.8,
};

export const STAGE1_WHEAT_UPGRADE: UpgradeDefinition = {
  id: "wheatYield",
  name: "Урожай пшеницы",
  description: "Плюс 1 пшеница с грядки.",
  cost: 40,
  maxLevel: 1,
  yieldBonus: 1,
};

const legacyMama = INITIAL_STATE.workers?.find((worker) => worker.id === "worker-mama");

export const STAGE1_WORKER_TEMPLATE = {
  id: "worker-mama",
  name: legacyMama?.name ?? "Мама Женя",
  role: legacyMama?.roleRu ?? "Заботливая кормилица",
};

export const STAGE1_GARDEN_PLOT_ORDER = ["plot1", "plot2", "plot3", "plot4"] as const;
export const STAGE1_GARDEN_PLOT_LAYOUT = {
  plot1: { x: 700, y: 468 },
  plot2: { x: 1050, y: 468 },
  plot3: { x: 1400, y: 468 },
  plot4: { x: 1750, y: 468 },
} as const;

export const STAGE1_SEED_KEYS: Record<Stage1CropType, string> = {
  WHEAT: "WHEAT_SEED",
  CARROT: "CARROT_SEED",
  CLOVER: "CLOVER_SEED",
};

export const STAGE1_CROP_DEFS = {
  WHEAT: CROPS_CONFIG.WHEAT,
  CARROT: CROPS_CONFIG.CARROT,
  CLOVER: CROPS_CONFIG.CLOVER,
};

export const STAGE1_CROP_UNLOCKS: Record<Stage1UnlockableCropType, CropUnlockDefinition> = {
  CARROT: {
    id: "unlockCarrotSeeds",
    cropType: "CARROT",
    name: "Открыть морковь",
    description: "Откроет посадку моркови.",
    cost: 45,
  },
  CLOVER: {
    id: "unlockCloverSeeds",
    cropType: "CLOVER",
    name: "Открыть клевер",
    description: "Откроет посадку клевера.",
    cost: 85,
  },
};

function createDefaultPlots(): Record<string, Stage1CropPlotState> {
  return Object.fromEntries(
    STAGE1_GARDEN_PLOT_ORDER.map((plotId) => [
      plotId,
      {
        id: plotId,
        cropType: null,
        growth: 0,
        watered: false,
      },
    ]),
  );
}

export function createDefaultAnimal(
  id: string,
  species: Stage1AnimalSpecies,
  name: string,
  x: number,
  penId: string,
) {
  return {
    id,
    species,
    name,
    mood: "happy" as const,
    happiness: 82,
    hunger: 36,
    productionProgress: 0,
    hasProduct: false,
    position: {
      laneId: STAGE1_WORLD.locations.MEADOW.lanes["meadow-main"].id,
      x,
    },
    penId,
  };
}

export function createDefaultStage1State(): Stage1PersistentState {
  return {
    activeLocation: "MEADOW",
    coins: 50,
    level: INITIAL_STATE.level,
    experience: INITIAL_STATE.experience,
    inventory: {
      WHEAT_SEED: 5,
      CARROT_SEED: 0,
      CLOVER_SEED: 0,
      WHEAT: 3,
      CARROT: 0,
      CLOVER: 0,
      CHICK_PRODUCT: 1,
      CHICKEN_PRODUCT: 0,
      DUCK_PRODUCT: 0,
      GOOSE_PRODUCT: 0,
      TURKEY_PRODUCT: 0,
    },
    animals: [
      createDefaultAnimal("stage1-bird-1", STAGE1_STARTING_BIRD_SPECIES, "Цыпа", 810, "bird-pen-1"),
    ],
    crops: createDefaultPlots(),
    unlockedPlots: ["plot1"],
    upgrades: {
      [STAGE1_UPGRADE.id]: { id: STAGE1_UPGRADE.id, level: 0 },
      [STAGE1_WHEAT_UPGRADE.id]: { id: STAGE1_WHEAT_UPGRADE.id, level: 0 },
      [STAGE1_CROP_UNLOCKS.CARROT.id]: { id: STAGE1_CROP_UNLOCKS.CARROT.id, level: 0 },
      [STAGE1_CROP_UNLOCKS.CLOVER.id]: { id: STAGE1_CROP_UNLOCKS.CLOVER.id, level: 0 },
    },
    workers: {
      [STAGE1_WORKER_TEMPLATE.id]: {
        id: STAGE1_WORKER_TEMPLATE.id,
        name: STAGE1_WORKER_TEMPLATE.name,
        role: STAGE1_WORKER_TEMPLATE.role,
        isActive: true,
      },
    },
    pens: {
      "bird-pen-1": {
        id: "bird-pen-1",
        isOwned: true,
        cleanliness: 92,
      },
      "bird-pen-2": {
        id: "bird-pen-2",
        isOwned: false,
        cleanliness: 100,
      },
    },
    tasks: [],
    starterRescueUsed: false,
  };
}

export function getNextLevelExperience(level: number): number {
  return 25 + (level - 1) * 20;
}
