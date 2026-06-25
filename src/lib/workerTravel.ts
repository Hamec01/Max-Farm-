import { ANIMAL_TEMPLATES } from "../data";
import { WORLD_ZONES } from "../data/locations";
import { AnimalInstance, AnimalSpecies, LocationId } from "../types";
import {
  resolveAnimalFood,
  getAnimalHomeZone,
  POULTRY_SPECIES,
  WATER_BIRD_SPECIES,
} from "./farmAutomation";

const ANIMAL_ZONES: LocationId[] = [...WORLD_ZONES, "MAX_HOME"];

const GARDEN_WORKERS = new Set([
  "worker-nadya",
  "worker-kolya",
  "worker-vera",
  "worker-fyodor",
  "worker-sonya",
  "worker-grisha",
]);

export { getAnimalHomeZone };

function firstZoneMatching(
  animals: AnimalInstance[],
  predicate: (animal: AnimalInstance) => boolean
): LocationId | null {
  for (const zone of ANIMAL_ZONES) {
    if (animals.some((a) => getAnimalHomeZone(a) === zone && predicate(a))) {
      return zone;
    }
  }
  return null;
}

function findHungryFeedableZone(
  animals: AnimalInstance[],
  inventory: Record<string, number>
): LocationId | null {
  for (const zone of ANIMAL_ZONES) {
    const zoneAnimals = animals.filter((a) => getAnimalHomeZone(a) === zone && !a.isFed);
    for (const animal of zoneAnimals) {
      const { hasFood } = resolveAnimalFood(
        inventory,
        ANIMAL_TEMPLATES[animal.species].foodType
      );
      if (hasFood) return zone;
    }
  }
  return null;
}

export function pickWorkerTravelZone(
  workerId: string,
  animals: AnimalInstance[],
  inventory: Record<string, number>,
  homeZone: LocationId
): LocationId {
  if (GARDEN_WORKERS.has(workerId)) return "GARDEN";

  switch (workerId) {
    case "worker-mama":
      return findHungryFeedableZone(animals, inventory) || homeZone;

    case "worker-pasha":
      return (
        firstZoneMatching(
          animals,
          (a) => a.cleanliness < 70 || a.happiness < 75
        ) || homeZone
      );

    case "worker-papa":
      return firstZoneMatching(animals, (a) => a.happiness < 85) || homeZone;

    case "worker-lena":
      return (
        firstZoneMatching(animals, (a) => a.productionProgress >= 100) ||
        homeZone
      );

    case "worker-misha":
      return (
        firstZoneMatching(
          animals,
          (a) =>
            a.species === AnimalSpecies.SHEEP &&
            a.productionProgress >= 100 &&
            !a.isSheared
        ) || homeZone
      );

    case "worker-nina":
    case "worker-petya":
      return (
        firstZoneMatching(
          animals,
          (a) =>
            POULTRY_SPECIES.includes(a.species) &&
            (!a.isFed || a.productionProgress >= 100)
        ) || homeZone
      );

    case "worker-olya":
      return (
        firstZoneMatching(
          animals,
          (a) =>
            a.species === AnimalSpecies.RABBIT &&
            (!a.isFed || a.productionProgress >= 100)
        ) || homeZone
      );

    case "worker-vika":
      return (
        firstZoneMatching(
          animals,
          (a) =>
            a.species === AnimalSpecies.PIG &&
            (!a.isFed || a.productionProgress >= 100 || a.cleanliness < 75)
        ) || homeZone
      );

    case "worker-pastuh":
      return findHungryFeedableZone(animals, inventory) || homeZone;

    case "worker-andrey":
      return "ORCHARD";

    case "worker-sergey":
      return firstZoneMatching(animals, (a) => a.happiness < 90) || "ORCHARD";

    case "worker-dima":
    case "worker-arina":
      return "LAKESIDE";

    case "worker-sveta":
    case "worker-igor":
      return "DESERT";

    case "worker-masha":
      return "LAKE";

    case "worker-zoya":
      return (
        firstZoneMatching(
          animals,
          (a) =>
            WATER_BIRD_SPECIES.includes(a.species) &&
            (!a.isFed || a.productionProgress >= 100)
        ) || "LAKE"
      );

    case "worker-tolya":
      return "FOREST";

    default:
      return homeZone;
  }
}

export function randomSpotInZone(zone: LocationId): { x: number; y: number } {
  if (zone === "GARDEN") {
    return { x: 20 + Math.random() * 60, y: 56 + Math.random() * 14 };
  }
  if (zone === "LAKESIDE") {
    return { x: 25 + Math.random() * 50, y: 68 + Math.random() * 12 };
  }
  if (zone === "ORCHARD") {
    return { x: 18 + Math.random() * 64, y: 58 + Math.random() * 18 };
  }
  return { x: 18 + Math.random() * 64, y: 62 + Math.random() * 18 };
}

export const ZONE_TRAVEL_LABEL: Partial<Record<LocationId, string>> = {
  MEADOW: "На луг!",
  BARNYARD: "В хлев!",
  ORCHARD: "В сад!",
  LAKESIDE: "К пруду!",
  GARDEN: "На огород!",
  FOREST: "В лес!",
  DESERT: "В пустыню!",
  LAKE: "На озеро!",
  HILLS: "В горы!",
  VALLEY: "В долину!",
  MAX_HOME: "Домой!",
};
