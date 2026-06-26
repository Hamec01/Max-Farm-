import type { DeviceKind } from "../hooks/useGameViewport";

let activeDeviceKind: DeviceKind = "desktop";

/** Вызывается из App при смене viewport */
export function setPerformanceDeviceKind(kind: DeviceKind): void {
  activeDeviceKind = kind;
}

export function getPerformanceDeviceKind(): DeviceKind {
  return activeDeviceKind;
}

/** Тяжёлые PNG-спрайты (600KB+) — только ПК/планшет */
export function shouldUseHeavySprites(): boolean {
  return activeDeviceKind !== "phone";
}

/** Интервал ходьбы работников (подбрасывание — отдельно через RAF) */
export function physicsLoopMs(kind: DeviceKind = activeDeviceKind): number {
  if (kind === "phone") return 120;
  if (kind === "tablet") return 80;
  return 50;
}

/** Вращение спрайта при «подбрасывании» — на телефоне отключено (лаги + артефакты) */
export function shouldSpinTossedSprites(kind: DeviceKind = activeDeviceKind): boolean {
  return kind !== "phone";
}

/** Игровой тик (рост, голод, автоматизация) */
export function gameTickMs(kind: DeviceKind = activeDeviceKind): number {
  if (kind === "phone") return 1600;
  if (kind === "tablet") return 1200;
  return 1000;
}

/** Синхронизация React-позиции Макса (DOM обновляется каждый кадр, React — реже) */
export function boyStateSyncMs(_kind: DeviceKind = activeDeviceKind): number {
  return 240;
}
