/** Порядок вкладок локаций в шапке — Дом Макса рядом с фермой */
export const HEADER_LOCATION_ORDER = [
  "MEADOW",
  "BARNYARD",
  "MAX_HOME",
  "GARDEN",
  "LAKESIDE",
  "ORCHARD",
  "DESERT",
  "FOREST",
  "LAKE",
  "HILLS",
  "VALLEY",
] as const;

export const WORLD_ZONES = [
  "MEADOW",
  "BARNYARD",
  "LAKESIDE",
  "ORCHARD",
  "DESERT",
  "FOREST",
  "LAKE",
  "HILLS",
  "VALLEY",
] as const;

export const LOCATION_EMOJI: Record<string, string> = {
  MEADOW: "🌸",
  BARNYARD: "🏡",
  MAX_HOME: "🏠",
  GARDEN: "🥕",
  LAKESIDE: "🦆",
  ORCHARD: "🌳",
  DESERT: "🏜️",
  FOREST: "🌲",
  LAKE: "🌊",
  HILLS: "⛰️",
  VALLEY: "🌄",
};

export function isInteriorZone(zone: string): boolean {
  return zone === "GARDEN" || zone === "MAX_HOME";
}
