import type { AnimalSpecies, LocationId } from "../types";
import { isInteriorZone } from "../data/locations";

export const MEADOW_LEVEL_WIDTH = 3832;
export const MEADOW_LEVEL_HEIGHT = 824;

export const MEADOW_BACKGROUND_SRC = "/assets/backgrounds/meadow-level-01.png";
export const BARNYARD_BACKGROUND_SRC = "/assets/backgrounds/уютный загон.png";
export const LAKESIDE_BACKGROUND_SRC = "/assets/backgrounds/утиный пруд.png";
export const ORCHARD_BACKGROUND_SRC = "/assets/backgrounds/фруктовый сад.png";
export const DESERT_BACKGROUND_SRC = "/assets/backgrounds/солнечная пустыня.png";

export const MEADOW_GROUND_LAYER_SRC = "/assets/backgrounds/ground.png";
export const MEADOW_GROUND_LAYER_HEIGHT = 170;

export const DEFAULT_WORLD_WIDTH = 2800;
export const DEFAULT_WORLD_HEIGHT = 1600;

export const MEADOW_GROUND_Y = 74.1;
export const MEADOW_WALK_MIN_Y = MEADOW_GROUND_Y;
export const MEADOW_WALK_MAX_Y = MEADOW_GROUND_Y;

export interface SpriteBox {
  width: number;
  height: number;
}

export function getWorldSizeForZone(zone: LocationId): SpriteBox {
  if (!isInteriorZone(zone)) {
    return { width: MEADOW_LEVEL_WIDTH, height: MEADOW_LEVEL_HEIGHT };
  }
  return { width: DEFAULT_WORLD_WIDTH, height: DEFAULT_WORLD_HEIGHT };
}

export function getGroundYForZone(zone: LocationId): number {
  return !isInteriorZone(zone) ? MEADOW_GROUND_Y : 75;
}

export function getWalkBoundsForZone(zone: LocationId): { minY: number; maxY: number } {
  if (!isInteriorZone(zone)) {
    return { minY: MEADOW_WALK_MIN_Y, maxY: MEADOW_WALK_MAX_Y };
  }
  return { minY: 54, maxY: 86 };
}

export function clampWalkYForZone(zone: LocationId, y: number): number {
  const bounds = getWalkBoundsForZone(zone);
  return Math.max(bounds.minY, Math.min(bounds.maxY, y));
}

export function getBackgroundForZone(zone: LocationId): string | null {
  switch (zone) {
    case "MEADOW":
      return MEADOW_BACKGROUND_SRC;
    case "BARNYARD":
      return BARNYARD_BACKGROUND_SRC;
    case "LAKESIDE":
      return LAKESIDE_BACKGROUND_SRC;
    case "ORCHARD":
      return ORCHARD_BACKGROUND_SRC;
    case "DESERT":
      return DESERT_BACKGROUND_SRC;
    default:
      return !isInteriorZone(zone) ? MEADOW_BACKGROUND_SRC : null;
  }
}

export function getGroundLayerForZone(_zone: LocationId): string | null {
  return null;
}

const MEADOW_ANIMAL_SIZES: Partial<Record<AnimalSpecies, SpriteBox>> = {
  CHICK: { width: 112, height: 100 },
  CHICKEN: { width: 136, height: 122 },
  DUCK: { width: 140, height: 124 },
  GOOSE: { width: 152, height: 136 },
  TURKEY: { width: 170, height: 146 },
  RABBIT: { width: 144, height: 126 },
  SHEEP: { width: 181, height: 156 },
  PIG: { width: 166, height: 136 },
  GOAT: { width: 176, height: 148 },
  COW: { width: 194, height: 154 },
  DONKEY: { width: 188, height: 154 },
  HORSE: { width: 202, height: 160 },
  BULL: { width: 214, height: 166 },
  CAT: { width: 122, height: 112 },
  DOG: { width: 136, height: 120 },
  T_REX: { width: 230, height: 176 },
  TRICERATOPS: { width: 226, height: 176 },
  PTERODACTYL: { width: 212, height: 160 },
  DIPLODOCUS: { width: 238, height: 178 },
  FENNEC: { width: 148, height: 128 },
  CAMEL: { width: 198, height: 150 },
  PEACOCK: { width: 162, height: 148 },
  SWAN: { width: 158, height: 136 },
};

const MEADOW_ANIMAL_FOOT_OFFSETS: Partial<Record<AnimalSpecies, number>> = {
  CHICK: 12,
  CHICKEN: 9,
  DUCK: 8,
  GOOSE: 8,
  TURKEY: 7,
  RABBIT: 3,
  SHEEP: 3,
  PIG: 3,
  GOAT: 3,
  COW: 1,
  DONKEY: 1,
  HORSE: 1,
  BULL: 1,
  CAT: 5,
  DOG: 4,
  T_REX: 0,
  TRICERATOPS: 2,
  PTERODACTYL: -4,
  DIPLODOCUS: 1,
  FENNEC: 2,
  CAMEL: 1,
  PEACOCK: 7,
  SWAN: 8,
};

export function getMeadowAnimalBox(species: AnimalSpecies): SpriteBox {
  return MEADOW_ANIMAL_SIZES[species] ?? { width: 150, height: 132 };
}

export function getMeadowAnimalFootOffset(species: AnimalSpecies): number {
  return MEADOW_ANIMAL_FOOT_OFFSETS[species] ?? 0;
}

export function getMeadowWorkerBox(workerId: string): SpriteBox {
  if (workerId === "worker-roman") {
    return { width: 106, height: 138 };
  }
  return { width: 118, height: 152 };
}

export function getMeadowMaxBox(): SpriteBox {
  return { width: 136, height: 176 };
}
