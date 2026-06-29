export type Stage1LocationId = "MEADOW" | "GARDEN";

export type Stage1LaneId = "meadow-main" | "garden-main";

export type Stage1CropType = "WHEAT" | "CARROT" | "CLOVER";

export type Stage1UnlockableCropType = Exclude<Stage1CropType, "WHEAT">;

export type Stage1AnimalSpecies = "CHICK" | "CHICKEN" | "DUCK" | "GOOSE" | "TURKEY";

export type Stage1AnimalMood = "happy" | "hungry";

export type Stage1TaskType = "feed-animal" | "collect-product" | "clean-pen";

export interface LanePosition {
  laneId: Stage1LaneId;
  x: number;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
  hungerDecayMultiplier?: number;
  yieldBonus?: number;
}

export interface UpgradeState {
  id: string;
  level: number;
}

export interface CropUnlockDefinition {
  id: string;
  cropType: Stage1UnlockableCropType;
  name: string;
  description: string;
  cost: number;
}

export interface Stage1AnimalDefinition {
  species: Stage1AnimalSpecies;
  nameRu: string;
  emoji: string;
  cost: number;
  foodType: string;
  productKey: string;
  productNameRu: string;
  productPrice: number;
  hungerDurationSec: number;
  productionDurationSec: number;
  wanderStep: number;
  spriteHeight: number;
  penType: "BIRD";
  tint: {
    happy: string;
    hungry: string;
    accent: string;
  };
}

export interface Stage1AnimalState {
  id: string;
  species: Stage1AnimalSpecies;
  name: string;
  mood: Stage1AnimalMood;
  happiness: number;
  hunger: number;
  productionProgress: number;
  hasProduct: boolean;
  position: LanePosition;
  penId: string;
}

export interface Stage1WorkerState {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

export interface Stage1CropPlotState {
  id: string;
  cropType: Stage1CropType | null;
  growth: number;
  watered: boolean;
}

export interface Stage1PenDefinition {
  id: string;
  nameRu: string;
  capacity: number;
  cost: number;
  laneId: Stage1LaneId;
  minX: number;
  maxX: number;
  centerX: number;
  groundY: number;
}

export interface Stage1PenState {
  id: string;
  isOwned: boolean;
  cleanliness: number;
}

export interface Stage1TaskState {
  id: string;
  type: Stage1TaskType;
  targetId: string;
  penId?: string;
  priority: number;
  reservedByWorkerId?: string;
}

export interface Stage1PersistentState {
  activeLocation: Stage1LocationId;
  coins: number;
  level: number;
  experience: number;
  inventory: Record<string, number>;
  animals: Stage1AnimalState[];
  crops: Record<string, Stage1CropPlotState>;
  unlockedPlots: string[];
  upgrades: Record<string, UpgradeState>;
  workers: Record<string, Stage1WorkerState>;
  pens: Record<string, Stage1PenState>;
  tasks: Stage1TaskState[];
  starterRescueUsed: boolean;
}

export interface Stage1SaveData {
  version: 3;
  updatedAt: string;
  state: Stage1PersistentState;
}

export interface Stage1Snapshot {
  state: Stage1PersistentState;
  nextLevelAt: number;
}

export type Stage1PromptTone = "info" | "success" | "warn";

export interface Stage1CommandResult {
  ok: boolean;
  message: string;
  tone: Stage1PromptTone;
}
