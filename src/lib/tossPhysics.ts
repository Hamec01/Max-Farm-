import type { AnimalInstance } from "../types";

/** Нормализованный шаг (1.0 ≈ один кадр при 60 FPS) */
function frames(dtMs: number): number {
  return dtMs / 16.667;
}

export interface TossKinematics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  groundY: number;
}

export const TOSS_GRAVITY = 0.46;
export const TOSS_AIR_DRAG = 0.988;
export const TOSS_BOUNCE = 0.22;
export const TOSS_BOUNCE_MIN_VY = 1.15;
export const TOSS_MAX_SPEED = 4.8;
export const TOSS_VELOCITY_SCALE = 8.5;
export const TOSS_MAX_ANGLE = 28;

export function computeThrowVelocity(
  points: { x: number; y: number; t: number }[],
  maxSpeed = TOSS_MAX_SPEED,
  scale = TOSS_VELOCITY_SCALE
): { vx: number; vy: number } {
  if (points.length < 2) return { vx: 0, vy: 0 };
  const first = points[0];
  const last = points[points.length - 1];
  const dt = Math.max(8, last.t - first.t);
  let vx = ((last.x - first.x) / dt) * scale;
  let vy = ((last.y - first.y) / dt) * scale;
  const speed = Math.hypot(vx, vy);
  if (speed > maxSpeed) {
    vx = (vx / speed) * maxSpeed;
    vy = (vy / speed) * maxSpeed;
  }
  return { vx, vy };
}

export function resolveGroundY(animal: AnimalInstance): number {
  const stored = animal.groundY;
  if (typeof stored === "number") {
    if (stored <= animal.y + 0.1 && animal.y < 58) return 75;
    return stored;
  }
  return animal.y >= 58 ? animal.y : 75;
}

export function isTossActive(k: TossKinematics): boolean {
  return (
    k.y < k.groundY - 0.08 ||
    Math.abs(k.vy) > 0.025 ||
    Math.abs(k.vx) > 0.025 ||
    Math.abs(k.angle) > 0.25
  );
}

export function isAnimalAirborne(animal: AnimalInstance): boolean {
  return isTossActive(animalToKinematics(animal));
}

/** Мягкое подбрасывание — плавная дуга и лёгкий отскок */
export function stepToss(
  k: TossKinematics,
  dtMs: number,
  spinSprites: boolean
): { next: TossKinematics; active: boolean } {
  if (!isTossActive(k)) {
    return { next: k, active: false };
  }

  const f = frames(dtMs);
  let { x, y, vx, vy, angle, groundY } = k;

  vy += TOSS_GRAVITY * f;
  y += vy * f;
  x += vx * f;
  vx *= Math.pow(TOSS_AIR_DRAG, f);

  if (spinSprites && y < groundY) {
    angle += vx * 1.1 * f;
    angle = Math.max(-TOSS_MAX_ANGLE, Math.min(TOSS_MAX_ANGLE, angle));
  } else if (spinSprites) {
    angle *= Math.pow(0.62, f);
    if (Math.abs(angle) < 0.35) angle = 0;
  } else {
    angle *= Math.pow(0.7, f);
    if (Math.abs(angle) < 0.35) angle = 0;
  }

  if (x < 5) {
    x = 5;
    vx = -vx * 0.35;
  }
  if (x > 95) {
    x = 95;
    vx = -vx * 0.35;
  }

  if (y >= groundY) {
    y = groundY;
    if (Math.abs(vy) > TOSS_BOUNCE_MIN_VY) {
      vy = -vy * TOSS_BOUNCE;
      vx *= 0.72;
    } else {
      vy = 0;
      vx = 0;
      angle = 0;
    }
  }

  const next = { x, y, vx, vy, angle, groundY };
  return { next, active: isTossActive(next) };
}

export function animalToKinematics(animal: AnimalInstance): TossKinematics {
  return {
    x: animal.x,
    y: animal.y,
    vx: animal.vx ?? 0,
    vy: animal.vy ?? 0,
    angle: animal.angle ?? 0,
    groundY: resolveGroundY(animal),
  };
}

export function applyKinematicsToAnimal(animal: AnimalInstance, k: TossKinematics): AnimalInstance {
  return {
    ...animal,
    x: k.x,
    y: k.y,
    vx: k.vx,
    vy: k.vy,
    angle: k.angle,
    groundY: k.groundY,
  };
}

export function setRoamerWillChange(root: HTMLElement | null, active: boolean): void {
  if (!root) return;
  root.style.willChange = active ? "transform" : "";
}

/** Скорость ходьбы работников — % мира в секунду (не зависит от FPS) */
export const WORKER_WALK_SPEED = 22;

export interface WalkStep {
  x: number;
  y: number;
  dir: "left" | "right";
  moving: boolean;
  arrived: boolean;
}

/** Плавный шаг к цели с постоянной скоростью */
export function stepWalk(
  x: number,
  y: number,
  targetX: number,
  targetY: number,
  dtMs: number,
  prevDir: "left" | "right",
  speedPerSec = WORKER_WALK_SPEED,
  arriveDist = 0.5
): WalkStep {
  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.hypot(dx, dy);
  if (dist <= arriveDist) {
    return { x: targetX, y: targetY, dir: prevDir, moving: false, arrived: true };
  }
  const stepSize = (speedPerSec * dtMs) / 1000;
  const step = Math.min(dist, stepSize);
  const dir = dx < -0.01 ? "left" : dx > 0.01 ? "right" : prevDir;
  return {
    x: x + (dx / dist) * step,
    y: y + (dy / dist) * step,
    dir,
    moving: true,
    arrived: false,
  };
}

/**
 * Низкоуровневое позиционирование животного: left%/top% + поворот спрайта.
 * Единая система координат с React-рендером, якорь translate(-50%,-100%) статичен.
 */
export function placeAnimalDom(
  id: string,
  x: number,
  y: number,
  angle: number,
  scaleX: number,
  willChange = false
): void {
  const root = document.getElementById(`roamer-${id}`);
  if (!root) return;
  root.style.left = `${x}%`;
  root.style.top = `${y}%`;
  root.style.willChange = willChange ? "transform" : "";
  const sprite = root.querySelector("[data-animal-sprite]") as HTMLElement | null;
  if (sprite) {
    sprite.style.transform = `rotate(${angle || 0}deg) scaleX(${scaleX})`;
  }
}

export function placeWorkerDom(
  id: string,
  x: number,
  y: number,
  angle: number,
  dir: "left" | "right",
  isMoving: boolean,
  willChange = false
): void {
  const root = document.getElementById(`worker-roamer-${id}`);
  if (!root) return;
  root.style.left = `${x}%`;
  root.style.top = `${y}%`;
  root.style.willChange = willChange ? "transform" : "";
  const sprite = root.querySelector("[data-worker-sprite]") as HTMLElement | null;
  if (sprite) {
    sprite.style.transform = `rotate(${angle}deg) scaleX(${dir === "left" ? -1 : 1})`;
  }
  const wob = root.querySelector("[data-worker-wobble]") as HTMLElement | null;
  if (wob) {
    wob.classList.toggle("animate-walk-wobble", isMoving && !willChange);
  }
}

/** Drag: двигаем DOM напрямую (left%/top%), без React-ререндера каждый пиксель */
export function setDragRoamerPosition(elementId: string, x: number, y: number): void {
  const root = document.getElementById(elementId);
  if (!root) return;
  root.style.left = `${x}%`;
  root.style.top = `${y}%`;
  root.style.willChange = "transform";
}

export function clearDragRoamerDom(elementId: string): void {
  const root = document.getElementById(elementId);
  if (!root) return;
  root.style.willChange = "";
}

export function resolveWorkerGroundY(w: {
  y: number;
  groundY?: number;
  targetY?: number;
}): number {
  const stored = w.groundY;
  if (typeof stored === "number") {
    if (stored <= w.y + 0.1 && w.y < 58) return w.targetY ?? 72;
    return stored;
  }
  return w.y >= 58 ? w.y : (w.targetY ?? 72);
}

export function workerAirborne(w: {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  angle?: number;
  groundY?: number;
  targetY?: number;
}): boolean {
  return isTossActive({
    x: w.x,
    y: w.y,
    vx: w.vx ?? 0,
    vy: w.vy ?? 0,
    angle: w.angle ?? 0,
    groundY: resolveWorkerGroundY(w),
  });
}

export function needsTossSimulation(
  animals: AnimalInstance[],
  workers: Record<string, { x: number; vx?: number; vy?: number; angle?: number; y: number; groundY?: number; targetY?: number }>,
  draggedAnimalId: string | null,
  draggedWorkerId: string | null
): boolean {
  if (draggedAnimalId || draggedWorkerId) return true;
  if (animals.some((a) => a.id !== draggedAnimalId && isAnimalAirborne(a))) return true;
  return Object.values(workers).some((w) => workerAirborne(w));
}
