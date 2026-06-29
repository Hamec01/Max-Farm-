/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AnimalSpecies {
  CHICK = "CHICK",
  CHICKEN = "CHICKEN",
  DUCK = "DUCK",
  GOOSE = "GOOSE",
  TURKEY = "TURKEY",
  RABBIT = "RABBIT",
  SHEEP = "SHEEP",
  PIG = "PIG",
  GOAT = "GOAT",
  COW = "COW",
  DONKEY = "DONKEY",
  HORSE = "HORSE",
  BULL = "BULL",
  CAT = "CAT",
  DOG = "DOG",
  T_REX = "T_REX",
  TRICERATOPS = "TRICERATOPS",
  PTERODACTYL = "PTERODACTYL",
  DIPLODOCUS = "DIPLODOCUS",
  FENNEC = "FENNEC",
  CAMEL = "CAMEL",
  PEACOCK = "PEACOCK",
  SWAN = "SWAN"
}

export interface AnimalConfig {
  species: AnimalSpecies;
  nameRu: string;
  emoji: string;
  cost: number;
  foodType: string;
  foodNameRu: string;
  productionTime: number; // in seconds
  productName: string;
  productPrice: number;
  productIcon: string;
  description: string;
  soundType: string;
}

export interface AnimalInstance {
  id: string;
  species: AnimalSpecies;
  customName: string;
  isFed: boolean;
  fedTimeRemaining: number; // in seconds
  productionProgress: number; // 0 to 100
  happiness: number; // 0 to 100
  isSheared?: boolean; // specifically for sheep (makes them bald)
  regrowWoolTimeRemaining?: number; // sheep grows back wool
  cleanliness: number; // 0 to 100, needs brushing
  isMilked?: boolean; // specifically for milker animals
  x: number; // position in viewport (percentage)
  y: number; // position in viewport (percentage)
  scaleX: number; // for flipping left/right
  vx?: number; // physical speed x
  vy?: number; // physical speed y
  groundY?: number; // physical ground target
  angle?: number; // rotation angle for flying flips
  locationId?: LocationId; // location where this animal resides
  penId?: string; // assigned enclosure — stays inside when gate is closed
}

export type CropType = "WHEAT" | "CARROT" | "CLOVER" | "CABBAGE" | "RASPBERRY_BUSH" | "BLUEBERRY_BUSH";

export interface CropConfig {
  type: CropType;
  nameRu: string;
  seedCost: number;
  growTime: number; // in seconds
  yieldCount: number;
  sellPrice: number;
  icon: string;
}

export interface CropInstance {
  id: string;
  type: CropType;
  progress: number; // 0 to 100
  isWatered: boolean;
  isDead: boolean;
  timeRemaining: number; // in seconds
}

export type TreeType = "APPLE" | "CHERRY";

export interface TreeConfig {
  type: TreeType;
  nameRu: string;
  cost: number;
  growTime: number; // time to produce fruit
  yieldCount: number;
  fruitSellPrice: number;
  fruitNameRu: string;
  icon: string;
}

export interface TreeInstance {
  id: string;
  type: TreeType;
  fruitProgress: number; // 0 to 100
  fruitCount: number; // current fruits hanging (max yieldCount)
  timeRemaining: number;
}

export type LocationId =
  | "MEADOW"
  | "BARNYARD"
  | "MAX_HOME"
  | "GARDEN"
  | "LAKESIDE"
  | "ORCHARD"
  | "DESERT"
  | "FOREST"
  | "LAKE"
  | "HILLS"
  | "VALLEY";

export interface LocationConfig {
  id: LocationId;
  nameRu: string;
  description: string;
  unlockCost: number;
  isUnlocked: boolean;
  bgGradient: string;
  minLevel: number;
  backgroundImage?: string;
}

export interface FarmUpgrade {
  id: string;
  nameRu: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  multiplier: number;
  icon: string;
}

export interface GameStats {
  totalCoinsEarned: number;
  animalsPetted: number;
  productsCollected: number;
  cropsHarvested: number;
  animalsFed: number;
}

export interface WorkerInstance {
  id: string;
  name: string;
  emoji: string;
  roleRu: string;
  dailyWage: number;
  isActive: boolean;
  color: string;
  statusText: string;
  assignedLocationId?: LocationId;
  /** Идёт в комплекте с домом — не нанимается и не получает зарплату */
  isBundledWithHome?: boolean;
}

export type PenType =
  | "CHICKEN"
  | "RABBIT"
  | "SHEEP"
  | "PIG"
  | "COW"
  | "HORSE"
  | "PET"
  | "DINOSAUR"
  | "WATER"
  | "DESERT"
  | "UNIVERSAL";

export interface PenTemplate {
  id: string;
  nameRu: string;
  penType: PenType;
  cost: number;
  minLevel: number;
  locationId: LocationId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PenState {
  templateId: string;
  isOwned: boolean;
  isOpen: boolean;
}

export interface PondFish {
  id: string;
  x: number;
  y: number;
  emoji: string;
  vx: number;
  vy: number;
}

export interface BuildingConfig {
  id: string;
  nameRu: string;
  emoji: string;
  cost: number;
  minLevel: number;
  description: string;
  benefitRu: string;
  x: number;
  y: number;
}

export type GameDifficulty = "normal" | "hard";

export interface PlayerState {
  /** normal — всё открыто, работники бесплатно; hard — как раньше */
  difficulty?: GameDifficulty;
  coins: number;
  level: number;
  experience: number;
  activeLocation: LocationId;
  inventory: Record<string, number>; // { "WHEAT": 5, "EGG": 3, ... }
  animals: AnimalInstance[];
  crops: Record<string, CropInstance>; // "plot1": CropInstance
  trees: Record<string, TreeInstance>; // "plot1": TreeInstance
  unlockedLocations: LocationId[];
  upgrades: Record<string, number>; // { upgradeId: level }
  stats: GameStats;
  buildings?: Record<string, string[]>; // { MEADOW: ["barnyard_house"] }
  workers?: WorkerInstance[]; // hireable helper worker units
  pens?: PenState[];
  maxHouseLevel?: number; // Level of Max's house
  /** Купленные наряды Макса (кроме стартового default) */
  maxOutfits?: string[];
  /** Активный наряд на поле */
  activeMaxOutfit?: string;
  day?: number; // current gameplay day
  dayProgress?: number; // current ticks elapsed in this day
}

export interface Butterfly {
  id: string;
  x: number;
  y: number;
  type: "blue" | "orange" | "purple" | "gold" | "pink" | "green";
  emoji: string;
  vx: number;
  vy: number;
}

export interface FallingStar {
  id: string;
  x: number;
  y: number;
  targetY: number;
  isGrounded: boolean;
  collected: boolean;
  size: number;
}

export interface Flower {
  id: string;
  x: number;
  y: number;
  emoji: string;
  bouquetKey: string;
  /** небольшая фаза для покачивания на ветру */
  swayDelay: number;
}
