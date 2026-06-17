import { ANIMAL_TEMPLATES, CROPS_CONFIG } from "../data";
import { AnimalInstance, CropInstance, CropType } from "../types";

const ALL_CROP_TYPES = Object.keys(CROPS_CONFIG) as CropType[];

export const GARDEN_PLOT_IDS = [
  "plot1", "plot2", "plot3", "plot4", "plot5", "plot6", "plot7", "plot8",
  "plot9", "plot10", "plot11", "plot12", "plot13", "plot14", "plot15", "plot16",
  "plot17", "plot18", "plot19", "plot20", "plot21", "plot22", "plot23", "plot24",
];

/** Список культур, которые нужны животным, от самых дефицитных в инвентаре */
export function getPrioritizedNeededCrops(
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

/** Приоритет животных + все культуры огорода (чтобы пустые грядки всегда засевались) */
export function getPlantingCropOrder(
  animals: AnimalInstance[],
  inventory: Record<string, number>
): CropType[] {
  const prioritized = getPrioritizedNeededCrops(animals, inventory);
  const seen = new Set<CropType>(prioritized);
  const fallback = ALL_CROP_TYPES.filter((c) => !seen.has(c));
  return [...prioritized, ...fallback];
}

export function pickCropSeedForWorker(
  cropOrder: CropType[],
  inventory: Record<string, number>,
  coins: number
): { crop: CropType; seed: string; fromInventory: boolean; cost: number } | null {
  for (const crop of cropOrder) {
    const seed = `${crop}_SEED`;
    if ((inventory[seed] || 0) > 0) {
      return { crop, seed, fromInventory: true, cost: 0 };
    }
  }
  for (const crop of cropOrder) {
    const config = CROPS_CONFIG[crop];
    if (config && coins >= config.seedCost) {
      return { crop, seed: `${crop}_SEED`, fromInventory: false, cost: config.seedCost };
    }
  }
  return null;
}

/** Найти еду для животного в инвентаре */
export function resolveAnimalFood(
  inventory: Record<string, number>,
  foodType: string
): { hasFood: boolean; usedFoodKey: string } {
  if (foodType === "MILK") {
    if ((inventory.MILK || 0) > 0) return { hasFood: true, usedFoodKey: "MILK" };
    if ((inventory["Парное молоко"] || 0) > 0) return { hasFood: true, usedFoodKey: "Парное молоко" };
    if ((inventory["Козье молоко"] || 0) > 0) return { hasFood: true, usedFoodKey: "Козье молоко" };
    return { hasFood: false, usedFoodKey: "MILK" };
  }
  if ((inventory[foodType] || 0) > 0) {
    return { hasFood: true, usedFoodKey: foodType };
  }
  return { hasFood: false, usedFoodKey: foodType };
}

/** Посадить одну пустую грядку; возвращает true если посадили */
export function plantOneEmptyGardenPlot(
  crops: Record<string, CropInstance>,
  cropOrder: CropType[],
  inventory: Record<string, number>,
  coins: number
): { planted: boolean; coinsSpent: number } {
  for (const plotId of GARDEN_PLOT_IDS) {
    const crop = crops[plotId];
    if (!crop || crop.progress !== 0 || crop.isDead) continue;

    const plotNum = parseInt(plotId.replace("plot", ""), 10) || 0;
    const offset = plotNum % Math.max(cropOrder.length, 1);
    const rotated = [...cropOrder.slice(offset), ...cropOrder.slice(0, offset)];
    const pick = pickCropSeedForWorker(rotated, inventory, coins);
    if (!pick) continue;

    crops[plotId] = {
      id: plotId,
      type: pick.crop,
      progress: 2,
      isWatered: true,
      isDead: false,
      timeRemaining: CROPS_CONFIG[pick.crop].growTime,
    };

    if (pick.fromInventory) {
      inventory[pick.seed] = (inventory[pick.seed] || 1) - 1;
    }
    return { planted: true, coinsSpent: pick.fromInventory ? 0 : pick.cost };
  }
  return { planted: false, coinsSpent: 0 };
}

/** Полить одну сухую растущую грядку */
export function waterOneDryGardenPlot(crops: Record<string, CropInstance>): boolean {
  for (const plotId of GARDEN_PLOT_IDS) {
    const crop = crops[plotId];
    if (crop && crop.progress > 0 && crop.progress < 100 && !crop.isWatered) {
      crop.isWatered = true;
      return true;
    }
  }
  return false;
}

/** Собрать один спелый урожай */
export function harvestOneRipeGardenPlot(
  crops: Record<string, CropInstance>,
  inventory: Record<string, number>,
  compostLvl: number
): boolean {
  for (const plotId of GARDEN_PLOT_IDS) {
    const crop = crops[plotId];
    if (crop && crop.progress >= 100 && !crop.isDead) {
      const config = CROPS_CONFIG[crop.type];
      const harvestYield = config.yieldCount + Math.min(compostLvl, 2);
      inventory[crop.type] = (inventory[crop.type] || 0) + harvestYield;
      crop.progress = 0;
      crop.isWatered = false;
      return true;
    }
  }
  return false;
}
