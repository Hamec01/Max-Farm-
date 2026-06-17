import { reportInputDebug } from "./inputDebug";

export const LONG_PRESS_DEFAULT_MS = 580;
export const LONG_PRESS_MOVE_THRESHOLD_PX = 20;

interface ActivePress {
  targetId: string;
  startX: number;
  startY: number;
  moveThresholdPx: number;
  pointerType?: string;
  timer: ReturnType<typeof setTimeout>;
  fired: boolean;
}

const active = new Map<number, ActivePress>();

export function beginLongPress(
  pointerId: number,
  targetId: string,
  clientX: number,
  clientY: number,
  onLongPress: () => void,
  options?: { durationMs?: number; moveThresholdPx?: number; pointerType?: string }
): void {
  cancelLongPress(pointerId);

  const durationMs = options?.durationMs ?? LONG_PRESS_DEFAULT_MS;
  const moveThresholdPx = options?.moveThresholdPx ?? LONG_PRESS_MOVE_THRESHOLD_PX;
  const startX = clientX;
  const startY = clientY;

  const timer = setTimeout(() => {
    const press = active.get(pointerId);
    if (!press || press.fired) return;
    press.fired = true;
    reportInputDebug(options?.pointerType, "longPress", targetId);
    onLongPress();
  }, durationMs);

  active.set(pointerId, {
    targetId,
    startX,
    startY,
    moveThresholdPx,
    pointerType: options?.pointerType,
    timer,
    fired: false,
  });
}

export function moveLongPress(
  pointerId: number,
  clientX: number,
  clientY: number,
  moveThresholdPx: number = LONG_PRESS_MOVE_THRESHOLD_PX
): void {
  const press = active.get(pointerId);
  if (!press || press.fired) return;
  if (Math.hypot(clientX - press.startX, clientY - press.startY) > (moveThresholdPx ?? press.moveThresholdPx)) {
    cancelLongPress(pointerId);
  }
}

export function cancelLongPress(pointerId: number): void {
  const press = active.get(pointerId);
  if (!press) return;
  clearTimeout(press.timer);
  active.delete(pointerId);
}

export function endLongPress(pointerId: number): { wasLongPress: boolean; targetId: string | null } {
  const press = active.get(pointerId);
  if (!press) return { wasLongPress: false, targetId: null };
  const wasLongPress = press.fired;
  const targetId = press.targetId;
  clearTimeout(press.timer);
  active.delete(pointerId);
  return { wasLongPress, targetId };
}

export function isLongPressActive(pointerId: number): boolean {
  return active.get(pointerId)?.fired ?? false;
}
