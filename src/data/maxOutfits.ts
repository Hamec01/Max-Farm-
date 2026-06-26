export interface MaxOutfitConfig {
  id: string;
  nameRu: string;
  description: string;
  spriteFile: string;
  /** 0 = бесплатный стартовый наряд */
  cost: number;
  minLevel: number;
  emoji: string;
}

export const DEFAULT_MAX_OUTFIT_ID = "default";

export const MAX_OUTFITS: MaxOutfitConfig[] = [
  {
    id: "default",
    nameRu: "Пижама с мишками",
    description: "Уютная зелёная пижама — домашний любимый наряд.",
    spriteFile: "idle.png",
    cost: 0,
    minLevel: 1,
    emoji: "🩲",
  },
  {
    id: "farm_suit",
    nameRu: "Фермерский комбинезон",
    description: "Настоящий костюм фермера для работы на полях!",
    spriteFile: "maxim_farm_suit.png",
    cost: 220,
    minLevel: 2,
    emoji: "👨‍🌾",
  },
  {
    id: "smoking_suit",
    nameRu: "Нарядный костюм",
    description: "Элегантный костюмчик — Макс как на праздник!",
    spriteFile: "maxim_smoking_suit.png",
    cost: 380,
    minLevel: 3,
    emoji: "🤵",
  },
];

export function getMaxOutfit(id?: string): MaxOutfitConfig {
  return MAX_OUTFITS.find((o) => o.id === id) ?? MAX_OUTFITS[0];
}

export function getMaxOutfitSpriteSrc(outfitId?: string): string {
  const outfit = getMaxOutfit(outfitId);
  return `/assets/characters/maxim/${outfit.spriteFile}`;
}

export function isMaxOutfitOwned(outfitId: string, purchasedIds: string[] = []): boolean {
  if (outfitId === DEFAULT_MAX_OUTFIT_ID) return true;
  return purchasedIds.includes(outfitId);
}
