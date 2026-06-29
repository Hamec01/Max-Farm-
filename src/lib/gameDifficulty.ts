import { INITIAL_STATE, LOCATIONS } from "../data";
import { isInteriorZone } from "../data/locations";
import { createInitialPenStates } from "./penLogic";
import type { GameDifficulty, LocationId, PlayerState } from "../types";

export function allLocationIds(): LocationId[] {
  return Object.keys(LOCATIONS) as LocationId[];
}

export function isNormalDifficulty(state: PlayerState): boolean {
  return state.difficulty === "normal";
}

export function isLocationAccessible(state: PlayerState, locId: LocationId): boolean {
  if (isNormalDifficulty(state)) return true;
  return isInteriorZone(locId) || state.unlockedLocations.includes(locId);
}

export function buildInitialStateForDifficulty(difficulty: GameDifficulty): PlayerState {
  const workers = INITIAL_STATE.workers!.map((w) => ({
    ...w,
    isActive: difficulty === "normal" ? true : w.isActive,
    dailyWage: difficulty === "normal" ? 0 : w.dailyWage,
  }));

  return {
    ...INITIAL_STATE,
    difficulty,
    workers,
    pens: createInitialPenStates(),
    unlockedLocations:
      difficulty === "normal" ? allLocationIds() : [...INITIAL_STATE.unlockedLocations],
  };
}

export function normalizeLoadedDifficulty(parsed: Partial<PlayerState>): GameDifficulty {
  return parsed.difficulty === "normal" || parsed.difficulty === "hard"
    ? parsed.difficulty
    : "hard";
}
