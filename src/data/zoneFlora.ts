import type { LocationId } from "../types";
import type { Flower } from "../types";

export interface FoliageTree {
  top: string;
  left: string;
  emoji: string;
  sizeClass: string;
  fruits?: string[];
}

export interface FoliageBush {
  top: string;
  left: string;
  accent?: string;
}

export interface GrassTuft {
  top: string;
  left: string;
  emoji: string;
}

export interface ZoneFloraConfig {
  flowers: string[];
  bouquetKey: string;
  bouquetNameRu: string;
  bouquetIcon: string;
  bouquetSellPrice: number;
  grass: GrassTuft[];
  trees: FoliageTree[];
  bushes: FoliageBush[];
  flowerYMin: number;
  flowerYMax: number;
}

export const BOUQUET_PREFIX = "BOUQUET_";

export const ZONE_FLORA: Partial<Record<LocationId, ZoneFloraConfig>> = {
  MEADOW: {
    flowers: ["🌸", "🌼", "🌻", "🌹"],
    bouquetKey: "BOUQUET_MEADOW",
    bouquetNameRu: "Луговой букет",
    bouquetIcon: "💐",
    bouquetSellPrice: 18,
    flowerYMin: 60,
    flowerYMax: 84,
    grass: [
      { top: "60%", left: "15%", emoji: "🌿" },
      { top: "74%", left: "52%", emoji: "🌿" },
      { top: "82%", left: "26%", emoji: "🌿" },
      { top: "68%", left: "72%", emoji: "🌱" },
    ],
    trees: [
      { top: "38%", left: "2%", emoji: "🌳", sizeClass: "text-6xl", fruits: ["🍎", "🍎", "🍎"] },
      { top: "42%", left: "88%", emoji: "🌳", sizeClass: "text-5xl", fruits: ["🍎", "🍎"] },
    ],
    bushes: [
      { top: "63%", left: "33%", accent: "🫐" },
      { top: "70%", left: "78%", accent: "🌼" },
    ],
  },
  BARNYARD: {
    flowers: ["🌾", "🌼", "🌻"],
    bouquetKey: "BOUQUET_BARNYARD",
    bouquetNameRu: "Сенокосный букет",
    bouquetIcon: "🌾",
    bouquetSellPrice: 14,
    flowerYMin: 62,
    flowerYMax: 86,
    grass: [
      { top: "64%", left: "18%", emoji: "🌾" },
      { top: "78%", left: "45%", emoji: "🌿" },
      { top: "84%", left: "68%", emoji: "🌾" },
    ],
    trees: [],
    bushes: [
      { top: "66%", left: "55%", accent: "🌼" },
    ],
  },
  GARDEN: {
    flowers: ["🌷", "🌹", "🌼", "🌸"],
    bouquetKey: "BOUQUET_GARDEN",
    bouquetNameRu: "Садовый букет",
    bouquetIcon: "🌷",
    bouquetSellPrice: 22,
    flowerYMin: 58,
    flowerYMax: 82,
    grass: [
      { top: "62%", left: "12%", emoji: "🌱" },
      { top: "76%", left: "38%", emoji: "🌿" },
      { top: "80%", left: "62%", emoji: "🌱" },
    ],
    trees: [],
    bushes: [
      { top: "58%", left: "82%", accent: "🌹" },
      { top: "72%", left: "22%", accent: "🌷" },
    ],
  },
  LAKESIDE: {
    flowers: ["🪷", "🌾", "🌸"],
    bouquetKey: "BOUQUET_LAKESIDE",
    bouquetNameRu: "Прибрежный букет",
    bouquetIcon: "🪷",
    bouquetSellPrice: 20,
    flowerYMin: 58,
    flowerYMax: 88,
    grass: [
      { top: "58%", left: "8%", emoji: "🎋" },
      { top: "72%", left: "18%", emoji: "🌾" },
      { top: "84%", left: "75%", emoji: "🎋" },
      { top: "66%", left: "85%", emoji: "🌿" },
    ],
    trees: [
      { top: "36%", left: "4%", emoji: "🌳", sizeClass: "text-5xl" },
    ],
    bushes: [
      { top: "68%", left: "42%", accent: "🪷" },
    ],
  },
  LAKE: {
    flowers: ["🪷", "💮", "🌾"],
    bouquetKey: "BOUQUET_LAKE",
    bouquetNameRu: "Озёрный букет",
    bouquetIcon: "💮",
    bouquetSellPrice: 20,
    flowerYMin: 58,
    flowerYMax: 88,
    grass: [
      { top: "56%", left: "10%", emoji: "🎋" },
      { top: "70%", left: "22%", emoji: "🌾" },
      { top: "82%", left: "80%", emoji: "🎋" },
    ],
    trees: [
      { top: "34%", left: "86%", emoji: "🌲", sizeClass: "text-5xl" },
    ],
    bushes: [
      { top: "65%", left: "48%", accent: "🪷" },
    ],
  },
  ORCHARD: {
    flowers: ["🌸", "🌼", "🌻"],
    bouquetKey: "BOUQUET_ORCHARD",
    bouquetNameRu: "Фруктовый букет",
    bouquetIcon: "🌸",
    bouquetSellPrice: 24,
    flowerYMin: 60,
    flowerYMax: 84,
    grass: [
      { top: "64%", left: "20%", emoji: "🌿" },
      { top: "78%", left: "55%", emoji: "🌿" },
      { top: "86%", left: "35%", emoji: "🌱" },
    ],
    trees: [
      { top: "34%", left: "6%", emoji: "🌳", sizeClass: "text-6xl", fruits: ["🍎", "🍎", "🍒"] },
      { top: "40%", left: "82%", emoji: "🌳", sizeClass: "text-5xl", fruits: ["🍒", "🍎"] },
    ],
    bushes: [
      { top: "67%", left: "70%", accent: "🌼" },
    ],
  },
  FOREST: {
    flowers: ["🍄", "🌸", "🌿"],
    bouquetKey: "BOUQUET_FOREST",
    bouquetNameRu: "Лесной букет",
    bouquetIcon: "🍄",
    bouquetSellPrice: 26,
    flowerYMin: 58,
    flowerYMax: 82,
    grass: [
      { top: "62%", left: "14%", emoji: "🍃" },
      { top: "76%", left: "48%", emoji: "🌿" },
      { top: "84%", left: "72%", emoji: "🍃" },
    ],
    trees: [
      { top: "32%", left: "3%", emoji: "🌲", sizeClass: "text-6xl" },
      { top: "38%", left: "78%", emoji: "🌳", sizeClass: "text-5xl" },
      { top: "44%", left: "45%", emoji: "🌲", sizeClass: "text-4xl" },
    ],
    bushes: [
      { top: "64%", left: "28%", accent: "🍄" },
      { top: "72%", left: "62%", accent: "🌿" },
    ],
  },
  HILLS: {
    flowers: ["🌼", "🌸", "🏵️"],
    bouquetKey: "BOUQUET_HILLS",
    bouquetNameRu: "Горный букет",
    bouquetIcon: "🏵️",
    bouquetSellPrice: 22,
    flowerYMin: 58,
    flowerYMax: 80,
    grass: [
      { top: "60%", left: "16%", emoji: "🌿" },
      { top: "74%", left: "50%", emoji: "🌱" },
      { top: "82%", left: "30%", emoji: "🌿" },
    ],
    trees: [
      { top: "30%", left: "5%", emoji: "🌲", sizeClass: "text-6xl" },
      { top: "36%", left: "85%", emoji: "🌲", sizeClass: "text-5xl" },
    ],
    bushes: [
      { top: "66%", left: "40%", accent: "🌼" },
    ],
  },
  VALLEY: {
    flowers: ["🌻", "🌼", "🌸", "🌷"],
    bouquetKey: "BOUQUET_VALLEY",
    bouquetNameRu: "Долинный букет",
    bouquetIcon: "🌻",
    bouquetSellPrice: 20,
    flowerYMin: 60,
    flowerYMax: 84,
    grass: [
      { top: "62%", left: "12%", emoji: "🌿" },
      { top: "70%", left: "58%", emoji: "🌿" },
      { top: "84%", left: "28%", emoji: "🌱" },
      { top: "78%", left: "78%", emoji: "🌿" },
    ],
    trees: [
      { top: "40%", left: "4%", emoji: "🌳", sizeClass: "text-5xl", fruits: ["🍎"] },
      { top: "38%", left: "88%", emoji: "🌳", sizeClass: "text-5xl", fruits: ["🍎"] },
    ],
    bushes: [
      { top: "68%", left: "35%", accent: "🌻" },
      { top: "74%", left: "65%", accent: "🌼" },
    ],
  },
  DESERT: {
    flowers: ["🏵️", "🌼", "🌵"],
    bouquetKey: "BOUQUET_DESERT",
    bouquetNameRu: "Пустынный букет",
    bouquetIcon: "🏵️",
    bouquetSellPrice: 28,
    flowerYMin: 62,
    flowerYMax: 86,
    grass: [
      { top: "66%", left: "20%", emoji: "🌵" },
      { top: "80%", left: "55%", emoji: "🪨" },
      { top: "84%", left: "75%", emoji: "🌵" },
    ],
    trees: [],
    bushes: [
      { top: "70%", left: "38%", accent: "🏵️" },
    ],
  },
};

export function getZoneFlora(zone: LocationId): ZoneFloraConfig | null {
  return ZONE_FLORA[zone] ?? null;
}

export function createZoneFlower(zone: LocationId, id: string): Flower | null {
  const flora = getZoneFlora(zone);
  if (!flora) return null;
  const emoji = flora.flowers[Math.floor(Math.random() * flora.flowers.length)];
  return {
    id,
    x: 8 + Math.random() * 84,
    y: flora.flowerYMin + Math.random() * (flora.flowerYMax - flora.flowerYMin),
    emoji,
    bouquetKey: flora.bouquetKey,
    swayDelay: Math.random() * 2,
  };
}

export function seedZoneFlowers(zone: LocationId, count: number): Flower[] {
  const flora = getZoneFlora(zone);
  if (!flora) return [];
  return Array.from({ length: count }).map((_, i) => {
    const emoji = flora.flowers[i % flora.flowers.length];
    return {
      id: `flower-seed-${zone}-${i}`,
      x: 8 + Math.random() * 84,
      y: flora.flowerYMin + Math.random() * (flora.flowerYMax - flora.flowerYMin),
      emoji,
      bouquetKey: flora.bouquetKey,
      swayDelay: Math.random() * 2,
    };
  });
}

export function getBouquetCatalogEntry(key: string): { nameRu: string; icon: string; sellPrice: number } | null {
  if (!key.startsWith(BOUQUET_PREFIX)) return null;
  for (const flora of Object.values(ZONE_FLORA)) {
    if (flora?.bouquetKey === key) {
      return {
        nameRu: flora.bouquetNameRu,
        icon: flora.bouquetIcon,
        sellPrice: flora.bouquetSellPrice,
      };
    }
  }
  return null;
}

export function isBouquetKey(key: string): boolean {
  return key.startsWith(BOUQUET_PREFIX);
}
