export const DOUBLE_TAP_MIN_MS = 250;
export const DOUBLE_TAP_MAX_MS = 350;
export const DOUBLE_TAP_MOVE_THRESHOLD_PX = 24;

interface TapRecord {
  targetId: string;
  time: number;
  x: number;
  y: number;
}

let lastTap: TapRecord | null = null;

export function resetDoubleTap(): void {
  lastTap = null;
}

/** Returns true when this pointer event is the second tap on the same target. */
export function isDoubleTap(
  targetId: string,
  pointerEvent: { clientX: number; clientY: number }
): boolean {
  const now = Date.now();
  const prev = lastTap;

  if (
    prev &&
    prev.targetId === targetId &&
    now - prev.time >= DOUBLE_TAP_MIN_MS &&
    now - prev.time <= DOUBLE_TAP_MAX_MS &&
    Math.hypot(pointerEvent.clientX - prev.x, pointerEvent.clientY - prev.y) <=
      DOUBLE_TAP_MOVE_THRESHOLD_PX
  ) {
    lastTap = null;
    return true;
  }

  lastTap = {
    targetId,
    time: now,
    x: pointerEvent.clientX,
    y: pointerEvent.clientY,
  };
  return false;
}
