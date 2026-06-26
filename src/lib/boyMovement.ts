/** Скорость ходьбы Макса — % мира в секунду (ниже = меньше «скольжения») */
export const BOY_WALK_SPEED = 14;

/** Порог «дошёл до цели» */
export const BOY_ARRIVE_THRESHOLD = 0.35;

/** Дистанция между звуками шагов (% мира) */
export const BOY_FOOTSTEP_EVERY = 1.15;

export interface BoyWalkState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  isMoving: boolean;
  dir: "left" | "right";
}

/** Плавное движение с постоянной скоростью (не зависит от FPS) */
export function stepBoyWalk(
  prev: BoyWalkState,
  dtMs: number,
  speedPerSec = BOY_WALK_SPEED
): BoyWalkState & { movedDistance: number } {
  const dx = prev.targetX - prev.x;
  const dy = prev.targetY - prev.y;
  const dist = Math.hypot(dx, dy);

  if (dist < BOY_ARRIVE_THRESHOLD) {
    if (!prev.isMoving) {
      return { ...prev, movedDistance: 0 };
    }
    return {
      ...prev,
      x: prev.targetX,
      y: prev.targetY,
      isMoving: false,
      movedDistance: 0,
    };
  }

  const step = Math.min(dist, (speedPerSec * dtMs) / 1000);
  const nextX = prev.x + (dx / dist) * step;
  const nextY = prev.y + (dy / dist) * step;
  const nextDir = dx < -0.01 ? "left" : dx > 0.01 ? "right" : prev.dir;

  return {
    ...prev,
    x: nextX,
    y: nextY,
    isMoving: true,
    dir: nextDir,
    movedDistance: step,
  };
}
