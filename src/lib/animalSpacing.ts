import type { AnimalInstance, LocationId } from "../types";
import { isAnimalAirborne } from "./tossPhysics";
import { clampWalkYForZone, getGroundYForZone } from "./sceneLayout";
import { isInteriorZone } from "../data/locations";

/** Minimum center-to-center distance so large animal sprites don't overlap */
export const MIN_ANIMAL_DIST = 12;

const clampAnimalPos = (x: number, y: number, locationId: LocationId) => ({
  x: Math.max(10, Math.min(90, x)),
  y: clampWalkYForZone(locationId, y),
});

function animalLocation(a: AnimalInstance): LocationId {
  return a.locationId || "MEADOW";
}

/** Push overlapping animals apart within one location group (multiple passes for stability) */
export function separateAnimalsGroup(
  animals: AnimalInstance[],
  lockVerticalAxis = false
): AnimalInstance[] {
  if (animals.length < 2) return animals;

  const result = animals.map((a) => ({ ...a }));

  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a1 = result[i];
        const a2 = result[j];
        const dx = a2.x - a1.x;
        const dy = a2.y - a1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

        if (dist < MIN_ANIMAL_DIST) {
          const overlap = (MIN_ANIMAL_DIST - dist) / 2;
          const pushX = (dx / dist) * overlap * 1.15;
          const pushY = lockVerticalAxis ? 0 : (dy / dist) * overlap * 0.9;
          const p1 = clampAnimalPos(a1.x - pushX, a1.y - pushY, animalLocation(a1));
          const p2 = clampAnimalPos(a2.x + pushX, a2.y + pushY, animalLocation(a2));
          result[i] = { ...a1, ...p1 };
          result[j] = { ...a2, ...p2 };
        }
      }
    }
  }

  return result;
}

/** Separate animals per pasture (locationId) so different zones don't affect each other */
export function separateAnimalsByLocation(animals: AnimalInstance[]): AnimalInstance[] {
  if (animals.length < 2) return animals;

  const result = animals.map((a) => ({ ...a }));
  const groups = new Map<LocationId, number[]>();

  result.forEach((a, idx) => {
    const loc = animalLocation(a);
    if (!groups.has(loc)) groups.set(loc, []);
    groups.get(loc)!.push(idx);
  });

  groups.forEach((indices) => {
    if (indices.length < 2) return;
    const group = indices.map((i) => result[i]);
    const groupLoc = animalLocation(group[0]);
    const separated = separateAnimalsGroup(group, !isInteriorZone(groupLoc));
    separated.forEach((a, gi) => {
      result[indices[gi]] = a;
    });
  });

  return result;
}

/** Separate only grounded animals; airborne keep in-flight positions */
export function separateAnimalsByLocationSkipAirborne(animals: AnimalInstance[]): AnimalInstance[] {
  const airborneIds = new Set(
    animals.filter(isAnimalAirborne).map((a) => a.id)
  );
  if (airborneIds.size === 0) return separateAnimalsByLocation(animals);
  const grounded = animals.filter((a) => !airborneIds.has(a.id));
  if (grounded.length < 2) return animals;
  const separated = separateAnimalsByLocation(grounded);
  const byId = new Map(separated.map((a) => [a.id, a]));
  return animals.map((a) => (airborneIds.has(a.id) ? a : (byId.get(a.id) ?? a)));
}

/** Steer a wandering animal away from neighbours in the same location */
export function wanderAnimalAvoidingOthers(
  animal: AnimalInstance,
  others: AnimalInstance[]
): AnimalInstance {
  const loc = animalLocation(animal);
  let dx = Math.random() * 8 - 4;
  let dy = isInteriorZone(loc) ? Math.random() * 6 - 3 : 0;

  others.forEach((other) => {
    if (other.id === animal.id || animalLocation(other) !== loc) return;
    const odx = animal.x - other.x;
    const ody = animal.y - other.y;
    const odist = Math.sqrt(odx * odx + ody * ody);
    if (odist < MIN_ANIMAL_DIST && odist > 0.1) {
      const strength = ((MIN_ANIMAL_DIST - odist) / MIN_ANIMAL_DIST) * 3.5;
      dx += (odx / odist) * strength;
      if (isInteriorZone(loc)) {
        dy += (ody / odist) * strength * 0.8;
      }
    }
  });

  const pos = clampAnimalPos(animal.x + dx, animal.y + dy, loc);
  return {
    ...animal,
    ...pos,
    scaleX: dx > 0 ? -1 : 1,
  };
}

/** Find a spawn point that isn't on top of existing animals */
export function findAnimalSpawnPosition(
  existing: AnimalInstance[],
  locationId: LocationId,
  preferredPosition?: { x: number; y: number }
): { x: number; y: number } {
  const sameLoc = existing.filter((a) => animalLocation(a) === locationId);
  const isOutdoor = !isInteriorZone(locationId);
  const minX = isOutdoor ? 8 : 15;
  const maxX = isOutdoor ? 92 : 85;
  const outdoorGroundY = getGroundYForZone(locationId);
  const minY = isOutdoor ? outdoorGroundY : 58;
  const maxY = isOutdoor ? outdoorGroundY : 82;
  const anchor = preferredPosition
    ? {
        x: Math.max(minX, Math.min(maxX, preferredPosition.x)),
        y: isOutdoor ? outdoorGroundY : Math.max(minY, Math.min(maxY, preferredPosition.y)),
      }
    : null;

  for (let attempt = 0; attempt < 40; attempt++) {
    const x = anchor
      ? Math.max(minX, Math.min(maxX, anchor.x + (Math.random() - 0.5) * 14))
      : minX + Math.random() * (maxX - minX);
    const y = isOutdoor
      ? outdoorGroundY
      : anchor
      ? Math.max(minY, Math.min(maxY, anchor.y + (Math.random() - 0.5) * 8))
      : minY + Math.random() * (maxY - minY);
    const tooClose = sameLoc.some((a) => {
      const dx = a.x - x;
      const dy = a.y - y;
      return Math.sqrt(dx * dx + dy * dy) < MIN_ANIMAL_DIST;
    });
    if (!tooClose) {
      return { x: Math.round(x), y: Math.round(y) };
    }
  }

  return { x: 50, y: isOutdoor ? outdoorGroundY : 70 };
}
