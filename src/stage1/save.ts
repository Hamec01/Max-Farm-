import {
  LEGACY_SAVE_KEY,
  STAGE1_ANIMAL_DEFS,
  STAGE1_BIRD_PENS,
  STAGE1_CROP_UNLOCKS,
  STAGE1_GARDEN_PLOT_ORDER,
  STAGE1_PEN_ORDER,
  STAGE1_SAVE_BACKUP_KEY,
  STAGE1_SAVE_KEY,
  STAGE1_STARTING_BIRD_SPECIES,
  STAGE1_UPGRADE,
  STAGE1_WHEAT_UPGRADE,
  STAGE1_WORKER_TEMPLATE,
  createDefaultAnimal,
  createDefaultStage1State,
} from "./content";
import type { Stage1AnimalSpecies, Stage1PersistentState, Stage1SaveData, Stage1TaskState } from "./types";

type LegacyAnimal = {
  species?: string;
  customName?: string;
  isFed?: boolean;
  fedTimeRemaining?: number;
  productionProgress?: number;
  happiness?: number;
};

type LegacyWorker = {
  id?: string;
  isActive?: boolean;
};

type LegacySaveShape = {
  coins?: number;
  level?: number;
  experience?: number;
  inventory?: Record<string, number>;
  upgrades?: Record<string, number>;
  animals?: LegacyAnimal[];
  workers?: LegacyWorker[];
};

type Stage1SaveEnvelopeV1 = {
  version: 1;
  updatedAt?: string;
  state: Omit<Stage1PersistentState, "unlockedPlots" | "starterRescueUsed" | "pens" | "tasks"> &
    Partial<Pick<Stage1PersistentState, "unlockedPlots" | "starterRescueUsed" | "pens" | "tasks">>;
};

type Stage1SaveEnvelopeV2 = {
  version: 2;
  updatedAt?: string;
  state: Omit<Stage1PersistentState, "pens" | "tasks"> &
    Partial<Pick<Stage1PersistentState, "pens" | "tasks">>;
};

type Stage1SaveEnvelopeV3 = Stage1SaveData;

function cloneState(state: Stage1PersistentState): Stage1PersistentState {
  return JSON.parse(JSON.stringify(state)) as Stage1PersistentState;
}

function sanitizeNumber(value: number | undefined, fallback: number, min = 0) {
  return Number.isFinite(value) ? Math.max(min, Math.floor(value as number)) : fallback;
}

function sanitizeUnlockedPlots(input: string[] | undefined, fallback: string[]) {
  const valid = new Set(STAGE1_GARDEN_PLOT_ORDER);
  const list = Array.isArray(input)
    ? input.filter((plotId): plotId is string => typeof plotId === "string" && valid.has(plotId as (typeof STAGE1_GARDEN_PLOT_ORDER)[number]))
    : fallback;
  return list.length > 0 ? Array.from(new Set(list)) : ["plot1"];
}

function sanitizeSpecies(species: unknown): Stage1AnimalSpecies {
  return typeof species === "string" && species in STAGE1_ANIMAL_DEFS
    ? species as Stage1AnimalSpecies
    : STAGE1_STARTING_BIRD_SPECIES;
}

function sanitizeTasks(input: Stage1TaskState[] | undefined) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.type === "string" &&
      typeof task.targetId === "string",
    )
    .map((task) => ({
      id: task.id,
      type: task.type,
      targetId: task.targetId,
      penId: typeof task.penId === "string" ? task.penId : undefined,
      priority: sanitizeNumber(task.priority, 1, 1),
      reservedByWorkerId: typeof task.reservedByWorkerId === "string" ? task.reservedByWorkerId : undefined,
    }));
}

function sanitizeState(
  input: Partial<Stage1PersistentState>,
  options?: {
    unlockAllPlots?: boolean;
  },
): Stage1PersistentState {
  const fallback = createDefaultStage1State();
  const state = cloneState({ ...fallback, ...input } as Stage1PersistentState);

  state.activeLocation = state.activeLocation === "GARDEN" ? "GARDEN" : "MEADOW";
  state.coins = sanitizeNumber(state.coins, fallback.coins);
  state.level = sanitizeNumber(state.level, fallback.level, 1);
  state.experience = sanitizeNumber(state.experience, fallback.experience);
  state.inventory = typeof state.inventory === "object" && state.inventory
    ? Object.fromEntries(Object.entries(state.inventory).map(([key, value]) => [key, sanitizeNumber(value, 0)]))
    : { ...fallback.inventory };
  state.crops = typeof state.crops === "object" && state.crops
    ? { ...cloneState(fallback).crops, ...state.crops }
    : cloneState(fallback).crops;
  state.upgrades = typeof state.upgrades === "object" && state.upgrades ? state.upgrades : cloneState(fallback).upgrades;
  state.workers = typeof state.workers === "object" && state.workers ? state.workers : cloneState(fallback).workers;
  state.pens = typeof state.pens === "object" && state.pens ? state.pens : cloneState(fallback).pens;

  const defaultPens = cloneState(fallback).pens;
  for (const penId of STAGE1_PEN_ORDER) {
    state.pens[penId] = {
      ...(defaultPens[penId] ?? { id: penId, isOwned: false, cleanliness: 100 }),
      ...(state.pens[penId] ?? {}),
      id: penId,
      cleanliness: sanitizeNumber(state.pens[penId]?.cleanliness, defaultPens[penId]?.cleanliness ?? 100, 0),
      isOwned: Boolean(state.pens[penId]?.isOwned ?? defaultPens[penId]?.isOwned),
    };
  }

  if (!state.upgrades[STAGE1_UPGRADE.id]) {
    state.upgrades[STAGE1_UPGRADE.id] = cloneState(fallback).upgrades[STAGE1_UPGRADE.id];
  }
  if (!state.upgrades[STAGE1_WHEAT_UPGRADE.id]) {
    state.upgrades[STAGE1_WHEAT_UPGRADE.id] = cloneState(fallback).upgrades[STAGE1_WHEAT_UPGRADE.id];
  }
  for (const unlock of Object.values(STAGE1_CROP_UNLOCKS)) {
    if (!state.upgrades[unlock.id]) {
      state.upgrades[unlock.id] = cloneState(fallback).upgrades[unlock.id];
    }
  }

  if (!state.workers[STAGE1_WORKER_TEMPLATE.id]) {
    state.workers[STAGE1_WORKER_TEMPLATE.id] = cloneState(fallback).workers[STAGE1_WORKER_TEMPLATE.id];
  }

  const fallbackUnlocked = options?.unlockAllPlots ? [...STAGE1_GARDEN_PLOT_ORDER] : fallback.unlockedPlots;
  state.unlockedPlots = sanitizeUnlockedPlots(state.unlockedPlots, fallbackUnlocked);
  state.starterRescueUsed = Boolean(state.starterRescueUsed);
  state.tasks = sanitizeTasks(state.tasks);

  const fallbackAnimal = fallback.animals[0];
  const firstOwnedPenId = STAGE1_PEN_ORDER.find((penId) => state.pens[penId]?.isOwned) ?? "bird-pen-1";
  state.animals = Array.isArray(state.animals) && state.animals.length > 0
    ? state.animals.map((animal, index) => {
      const species = sanitizeSpecies(animal.species);
      const penId = typeof animal.penId === "string" && state.pens[animal.penId]?.isOwned
        ? animal.penId
        : firstOwnedPenId;
      const pen = STAGE1_BIRD_PENS[penId];
      const spawnX = pen ? Math.min(pen.maxX - 48, pen.minX + 80 + index * 90) : fallbackAnimal.position.x + index * 90;
      return {
        id: typeof animal.id === "string" ? animal.id : `stage1-bird-${index + 1}`,
        species,
        name: typeof animal.name === "string" && animal.name.trim().length > 0 ? animal.name : STAGE1_ANIMAL_DEFS[species].nameRu,
        mood: animal.mood === "hungry" ? "hungry" : "happy",
        happiness: sanitizeNumber(animal.happiness, fallbackAnimal.happiness, 0),
        hunger: sanitizeNumber(animal.hunger, fallbackAnimal.hunger, 0),
        productionProgress: Math.max(0, Math.min(1, Number.isFinite(animal.productionProgress) ? animal.productionProgress : fallbackAnimal.productionProgress)),
        hasProduct: Boolean(animal.hasProduct),
        penId,
        position: {
          laneId: animal.position?.laneId === "garden-main" ? "garden-main" : "meadow-main",
          x: sanitizeNumber(animal.position?.x, spawnX, 0),
        },
      };
    })
    : [createDefaultAnimal("stage1-bird-1", STAGE1_STARTING_BIRD_SPECIES, "Цыпа", 810, "bird-pen-1")];

  return state;
}

function buildSaveData(state: Stage1PersistentState): Stage1SaveData {
  return {
    version: 3,
    updatedAt: new Date().toISOString(),
    state: sanitizeState(state),
  };
}

function mapLegacySpecies(species: string | undefined): Stage1AnimalSpecies {
  switch (species) {
    case "CHICKEN":
    case "DUCK":
    case "GOOSE":
    case "TURKEY":
      return species;
    case "CHICK":
    default:
      return "CHICK";
  }
}

function migrateLegacySave(parsed: LegacySaveShape): Stage1PersistentState {
  const fallback = createDefaultStage1State();
  const birds = (parsed.animals ?? [])
    .filter((animal) => ["CHICK", "CHICKEN", "DUCK", "GOOSE", "TURKEY"].includes(animal.species ?? ""))
    .slice(0, 6);
  const hasManyBirds = birds.length > fallback.animals.length;
  const workerIsActive = (parsed.workers ?? []).some((worker) =>
    worker.id === STAGE1_WORKER_TEMPLATE.id && worker.isActive,
  );
  const carrotUnlocked = (parsed.inventory?.CARROT_SEED ?? 0) > 0 || (parsed.inventory?.CARROT ?? 0) > 0;
  const cloverUnlocked = (parsed.inventory?.CLOVER_SEED ?? 0) > 0 || (parsed.inventory?.CLOVER ?? 0) > 0;

  const pens = {
    ...fallback.pens,
    "bird-pen-1": {
      ...fallback.pens["bird-pen-1"],
      isOwned: true,
      cleanliness: 88,
    },
    "bird-pen-2": {
      ...fallback.pens["bird-pen-2"],
      isOwned: hasManyBirds,
      cleanliness: 100,
    },
  };

  return sanitizeState({
    ...fallback,
    activeLocation: "MEADOW",
    coins: sanitizeNumber(parsed.coins, fallback.coins),
    level: sanitizeNumber(parsed.level, fallback.level, 1),
    experience: sanitizeNumber(parsed.experience, fallback.experience),
    inventory: {
      ...fallback.inventory,
      WHEAT: Math.max(fallback.inventory.WHEAT, sanitizeNumber(parsed.inventory?.WHEAT, 0)),
      WHEAT_SEED: Math.max(fallback.inventory.WHEAT_SEED, sanitizeNumber(parsed.inventory?.WHEAT_SEED, 0)),
      CARROT_SEED: Math.max(fallback.inventory.CARROT_SEED, sanitizeNumber(parsed.inventory?.CARROT_SEED, 0)),
      CLOVER_SEED: Math.max(fallback.inventory.CLOVER_SEED, sanitizeNumber(parsed.inventory?.CLOVER_SEED, 0)),
      CARROT: sanitizeNumber(parsed.inventory?.CARROT, 0),
      CLOVER: sanitizeNumber(parsed.inventory?.CLOVER, 0),
      CHICK_PRODUCT: sanitizeNumber(parsed.inventory?.TINY_EGG, fallback.inventory.CHICK_PRODUCT),
    },
    animals: (birds.length > 0 ? birds : [{ species: "CHICK", customName: "Цыпа" }]).map((animal, index) => {
      const species = mapLegacySpecies(animal.species);
      const penId = index < STAGE1_BIRD_PENS["bird-pen-1"].capacity ? "bird-pen-1" : "bird-pen-2";
      const pen = STAGE1_BIRD_PENS[penId];
      return {
        id: `stage1-bird-${index + 1}`,
        species,
        name: animal.customName || STAGE1_ANIMAL_DEFS[species].nameRu,
        mood: animal.isFed ? "happy" : "hungry",
        hunger: animal.isFed ? 20 : Math.min(100, 100 - (((animal.fedTimeRemaining ?? 0) * 4))),
        productionProgress: Math.max(0, Math.min(1, ((animal.productionProgress ?? 0) / 100))),
        happiness: Math.max(20, Math.min(100, animal.happiness ?? fallback.animals[0].happiness)),
        hasProduct: (animal.productionProgress ?? 0) >= 100,
        penId,
        position: {
          laneId: "meadow-main",
          x: Math.min(pen.maxX - 42, pen.minX + 84 + (index % pen.capacity) * 88),
        },
      };
    }),
    unlockedPlots: ["plot1"],
    pens,
    tasks: [],
    workers: {
      [STAGE1_WORKER_TEMPLATE.id]: {
        id: STAGE1_WORKER_TEMPLATE.id,
        name: STAGE1_WORKER_TEMPLATE.name,
        role: STAGE1_WORKER_TEMPLATE.role,
        isActive: workerIsActive || fallback.workers[STAGE1_WORKER_TEMPLATE.id].isActive,
      },
    },
    upgrades: {
      ...fallback.upgrades,
      [STAGE1_UPGRADE.id]: {
        id: STAGE1_UPGRADE.id,
        level: Math.max(0, Math.min(STAGE1_UPGRADE.maxLevel, parsed.upgrades?.[STAGE1_UPGRADE.id] ?? 0)),
      },
      [STAGE1_WHEAT_UPGRADE.id]: {
        id: STAGE1_WHEAT_UPGRADE.id,
        level: 0,
      },
      [STAGE1_CROP_UNLOCKS.CARROT.id]: {
        id: STAGE1_CROP_UNLOCKS.CARROT.id,
        level: carrotUnlocked ? 1 : 0,
      },
      [STAGE1_CROP_UNLOCKS.CLOVER.id]: {
        id: STAGE1_CROP_UNLOCKS.CLOVER.id,
        level: cloverUnlocked ? 1 : 0,
      },
    },
    starterRescueUsed: false,
  });
}

function parseSavedEnvelope(raw: string): Stage1SaveData | null {
  const parsed = JSON.parse(raw) as Partial<Stage1SaveEnvelopeV1 | Stage1SaveEnvelopeV2 | Stage1SaveEnvelopeV3>;
  if (!parsed || typeof parsed !== "object" || !parsed.state) {
    return null;
  }

  if (parsed.version === 3) {
    return buildSaveData(parsed.state as Stage1PersistentState);
  }

  if (parsed.version === 2) {
    return buildSaveData(sanitizeState(parsed.state as Partial<Stage1PersistentState>, { unlockAllPlots: false }));
  }

  if (parsed.version === 1) {
    return buildSaveData(sanitizeState(parsed.state as Partial<Stage1PersistentState>, { unlockAllPlots: true }));
  }

  return null;
}

export function loadStage1State(): Stage1PersistentState {
  return loadStage1SaveData().state;
}

export function loadStage1SaveData(): Stage1SaveData {
  try {
    const saved = localStorage.getItem(STAGE1_SAVE_KEY);
    if (saved) {
      const envelope = parseSavedEnvelope(saved);
      if (envelope) {
        return envelope;
      }
    }
  } catch {
    // Ignore broken Stage 1 saves and continue to backup or legacy paths.
  }

  const backup = localStorage.getItem(STAGE1_SAVE_BACKUP_KEY);
  if (backup) {
    try {
      const envelope = parseSavedEnvelope(backup);
      if (envelope) {
        persistStage1State(envelope.state);
        return buildSaveData(envelope.state);
      }
    } catch {
      // Keep falling through to legacy and defaults.
    }
  }

  try {
    const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
    if (legacy) {
      const migrated = migrateLegacySave(JSON.parse(legacy) as LegacySaveShape);
      persistStage1State(migrated);
      return buildSaveData(migrated);
    }
  } catch {
    // Ignore broken legacy saves too.
  }

  const fallback = createDefaultStage1State();
  persistStage1State(fallback);
  return buildSaveData(fallback);
}

export function persistStage1State(state: Stage1PersistentState) {
  const envelope = buildSaveData(state);
  const previous = localStorage.getItem(STAGE1_SAVE_KEY);
  if (previous) {
    localStorage.setItem(STAGE1_SAVE_BACKUP_KEY, previous);
  }
  localStorage.setItem(STAGE1_SAVE_KEY, JSON.stringify(envelope));
}
