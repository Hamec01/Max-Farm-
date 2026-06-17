import { AnimalSpecies, AnimalInstance, PenTemplate, PenState, PenType } from "../types";
import { PEN_TEMPLATES } from "../data/pens";

const CHICKEN_GROUP: AnimalSpecies[] = [
  AnimalSpecies.CHICKEN,
  AnimalSpecies.DUCK,
  AnimalSpecies.GOOSE,
  AnimalSpecies.TURKEY,
  AnimalSpecies.PEACOCK,
];

const COW_GROUP: AnimalSpecies[] = [
  AnimalSpecies.COW,
  AnimalSpecies.BULL,
  AnimalSpecies.GOAT,
];

const HORSE_GROUP: AnimalSpecies[] = [
  AnimalSpecies.HORSE,
  AnimalSpecies.DONKEY,
];

const PET_GROUP: AnimalSpecies[] = [AnimalSpecies.CAT, AnimalSpecies.DOG];

const DINOSAUR_GROUP: AnimalSpecies[] = [
  AnimalSpecies.T_REX,
  AnimalSpecies.TRICERATOPS,
  AnimalSpecies.PTERODACTYL,
  AnimalSpecies.DIPLODOCUS,
];

const WATER_GROUP: AnimalSpecies[] = [
  AnimalSpecies.DUCK,
  AnimalSpecies.GOOSE,
  AnimalSpecies.SWAN,
];

const DESERT_GROUP: AnimalSpecies[] = [AnimalSpecies.FENNEC, AnimalSpecies.CAMEL];

export function getPenTemplate(templateId: string): PenTemplate | undefined {
  return PEN_TEMPLATES.find((p) => p.id === templateId);
}

export function canSpeciesUsePen(species: AnimalSpecies, penType: PenType): boolean {
  if (penType === "UNIVERSAL") return true;
  if (penType === "CHICKEN") return CHICKEN_GROUP.includes(species);
  if (penType === "RABBIT") return species === AnimalSpecies.RABBIT;
  if (penType === "SHEEP") return species === AnimalSpecies.SHEEP;
  if (penType === "PIG") return species === AnimalSpecies.PIG;
  if (penType === "COW") return COW_GROUP.includes(species);
  if (penType === "HORSE") return HORSE_GROUP.includes(species);
  if (penType === "PET") return PET_GROUP.includes(species);
  if (penType === "DINOSAUR") return DINOSAUR_GROUP.includes(species);
  if (penType === "WATER") return WATER_GROUP.includes(species);
  if (penType === "DESERT") return DESERT_GROUP.includes(species);
  return false;
}

export function getPenTypeEmoji(penType: PenType): string {
  switch (penType) {
    case "CHICKEN": return "🐔";
    case "RABBIT": return "🐰";
    case "SHEEP": return "🐑";
    case "PIG": return "🐷";
    case "COW": return "🐄";
    case "HORSE": return "🐴";
    case "PET": return "🐾";
    case "DINOSAUR": return "🦕";
    case "WATER": return "🦢";
    case "DESERT": return "🐪";
    case "UNIVERSAL": return "🌈";
    default: return "🚧";
  }
}

export function getPenTypeLabel(penType: PenType): string {
  switch (penType) {
    case "CHICKEN": return "куры, утки, гуси, индейки, павлины";
    case "RABBIT": return "кролики";
    case "SHEEP": return "овечки";
    case "PIG": return "свинки";
    case "COW": return "коровы, быки, козы";
    case "HORSE": return "лошади, ослы";
    case "PET": return "кошки и собаки";
    case "DINOSAUR": return "динозавры";
    case "WATER": return "утки, гуси, лебеди";
    case "DESERT": return "фенеки и верблюды";
    case "UNIVERSAL": return "любые зверушки";
    default: return "";
  }
}

export function getPenBounds(pen: PenTemplate) {
  return {
    minX: pen.x - pen.width / 2,
    maxX: pen.x + pen.width / 2,
    minY: pen.y - pen.height / 2,
    maxY: pen.y + pen.height / 2,
  };
}

export function isPointInPen(x: number, y: number, pen: PenTemplate): boolean {
  const b = getPenBounds(pen);
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

export function clampToPenBounds(x: number, y: number, pen: PenTemplate) {
  const b = getPenBounds(pen);
  return {
    x: Math.max(b.minX, Math.min(b.maxX, x)),
    y: Math.max(b.minY, Math.min(b.maxY, y)),
  };
}

export function findPenAtPoint(
  x: number,
  y: number,
  pens: PenState[],
  zoneId: string
): PenTemplate | undefined {
  for (const ps of pens) {
    if (!ps.isOwned) continue;
    const tpl = getPenTemplate(ps.templateId);
    if (!tpl || tpl.locationId !== zoneId) continue;
    if (isPointInPen(x, y, tpl)) return tpl;
  }
  return undefined;
}

export function getOwnedPensForZone(pens: PenState[], zoneId: string): PenTemplate[] {
  return pens
    .filter((p) => p.isOwned)
    .map((p) => getPenTemplate(p.templateId))
    .filter((t): t is PenTemplate => !!t && t.locationId === zoneId);
}

export function isAnimalInsidePen(animal: AnimalInstance, pen: PenTemplate): boolean {
  return isPointInPen(animal.x, animal.y, pen);
}

export function constrainAnimalToPen(
  animal: AnimalInstance,
  pen: PenTemplate
): AnimalInstance {
  const clamped = clampToPenBounds(animal.x, animal.y, pen);
  return { ...animal, x: clamped.x, y: clamped.y };
}

export function herdAnimalTowardPen(
  animal: AnimalInstance,
  pen: PenTemplate,
  step = 0.18
): AnimalInstance {
  const dx = pen.x - animal.x;
  const dy = pen.y - animal.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
  if (dist < 1.2) return constrainAnimalToPen(animal, pen);
  return {
    ...animal,
    x: animal.x + (dx / dist) * step * Math.min(dist, 4),
    y: animal.y + (dy / dist) * step * Math.min(dist, 4),
    scaleX: dx > 0 ? -1 : 1,
  };
}

export function applyPenConstraints(
  animals: AnimalInstance[],
  pens: PenState[]
): AnimalInstance[] {
  return animals.map((animal) => {
    if (!animal.penId) return animal;
    const penState = pens.find((p) => p.templateId === animal.penId && p.isOwned);
    if (!penState || penState.isOpen) return animal;
    const tpl = getPenTemplate(animal.penId);
    if (!tpl) return animal;
    return constrainAnimalToPen(animal, tpl);
  });
}

export function createInitialPenStates(): PenState[] {
  return PEN_TEMPLATES.map((t) => ({
    templateId: t.id,
    isOwned: false,
    isOpen: true,
  }));
}

/** Pond area where Dima fishes and fish swim (LAKESIDE) */
export const LAKESIDE_POND = {
  minX: 12,
  maxX: 88,
  minY: 76,
  maxY: 92,
  dockX: 52,
  dockY: 78,
};

export function clampFishToPond(x: number, y: number) {
  return {
    x: Math.max(LAKESIDE_POND.minX, Math.min(LAKESIDE_POND.maxX, x)),
    y: Math.max(LAKESIDE_POND.minY + 2, Math.min(LAKESIDE_POND.maxY - 1, y)),
  };
}
