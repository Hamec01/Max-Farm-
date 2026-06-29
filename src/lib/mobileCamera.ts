import type { DeviceKind } from "../hooks/useGameViewport";
import type { LocationId } from "../types";
import { isInteriorZone } from "../data/locations";

/** Сдвиг камеры по одной оси (мир в %, zoom — effectiveZoom) */
export function computeAxisShift(worldPercent: number, zoom: number, center = 50): number {
  return Math.max(0, Math.min((zoom - 1) * 100, worldPercent * zoom - center));
}

export function getVisibleWorldBounds(
  shiftX: number,
  shiftY: number,
  zoom: number,
  margin = 8
) {
  if (shiftY <= 0) {
    // transform-origin: left bottom — видна нижняя полоса мира высотой 100/zoom %
    return {
      minX: shiftX / zoom - margin,
      maxX: (100 + shiftX) / zoom + margin,
      minY: 100 - 100 / zoom - margin,
      maxY: 100 + margin,
    };
  }
  return {
    minX: shiftX / zoom - margin,
    maxX: (100 + shiftX) / zoom + margin,
    minY: shiftY / zoom - margin,
    maxY: (100 + shiftY) / zoom + margin,
  };
}

export function isPointInCameraView(
  x: number,
  y: number,
  shiftX: number,
  shiftY: number,
  zoom: number,
  margin = 8
): boolean {
  const b = getVisibleWorldBounds(shiftX, shiftY, zoom, margin);
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

export function screenFractionToWorld(
  fractionX: number,
  fractionY: number,
  shiftX: number,
  shiftY: number,
  effectiveZoom: number,
  deviceKind: DeviceKind,
  baseZoom: number
) {
  // Клики считаем по baseZoom (как до мобильной адаптации); transform — по effectiveZoom
  const coordZoom =
    deviceKind === "desktop" || deviceKind === "phone" ? baseZoom : effectiveZoom;

  if (coordZoom <= 1 && shiftY <= 0) {
    return {
      x: fractionX * 100,
      y: 100 - (1 - fractionY) * 100,
    };
  }

  const x = (fractionX * 100 + shiftX) / coordZoom;
  if (shiftY <= 0) {
    return {
      x,
      y: 100 - ((1 - fractionY) * 100) / coordZoom,
    };
  }
  return {
    x,
    y: (fractionY * 100 + shiftY) / effectiveZoom,
  };
}

export function buildStageTransform(
  zoom: number,
  shiftX: number,
  shiftY: number,
  deviceKind: DeviceKind
): string {
  const tx = `translateX(${-shiftX / zoom}%)`;
  if (deviceKind === "desktop" || shiftY <= 0) {
    return `scale(${zoom}) ${tx}`;
  }
  return `scale(${zoom}) ${tx} translateY(${-shiftY / zoom}%)`;
}

/** Ширина/высота stage (%), чтобы при любом zoom уровень заполнял viewport без белых полос */
export function resolveStageSizePercent(zoom: number): number {
  return zoom > 0 ? 100 / zoom : 100;
}

/** ПК — прежняя логика зума без мобильных надстроек */
export function resolveDesktopZoom(baseZoom: number, zone: LocationId): number {
  return zone === "MAX_HOME" ? baseZoom * 0.92 : baseZoom;
}

export function resolveDesktopShiftX(boyX: number, zoom: number): number {
  return computeAxisShift(boyX, zoom);
}

export function shouldFollowCamera(deviceKind: DeviceKind, zone: LocationId): boolean {
  return deviceKind !== "desktop" && zone !== "GARDEN" && !isInteriorZone(zone);
}

export function shouldCullOffscreen(_deviceKind: DeviceKind, _zone: LocationId): boolean {
  return false;
}

export function resolveEffectiveZoom(
  baseZoom: number,
  deviceKind: DeviceKind,
  zone: LocationId
): number {
  if (zone === "MAX_HOME") return baseZoom * 0.92;
  if (zone === "GARDEN") {
    if (deviceKind === "phone") return Math.min(baseZoom * 0.68, 1.36);
    if (deviceKind === "tablet") return Math.min(baseZoom * 0.82, 1.45);
    return baseZoom;
  }
  if (shouldFollowCamera(deviceKind, zone)) {
    if (deviceKind === "phone") return baseZoom * 1.08;
    if (deviceKind === "tablet") return baseZoom * 1.04;
  }
  return baseZoom;
}

export function resolveCameraShifts(
  boyX: number,
  boyY: number,
  zoom: number,
  deviceKind: DeviceKind,
  zone: LocationId
): { shiftX: number; shiftY: number } {
  if (zone === "GARDEN" && deviceKind !== "desktop") {
    return {
      shiftX: computeAxisShift(50, zoom),
      shiftY: 0,
    };
  }
  return {
    shiftX: computeAxisShift(boyX, zoom),
    shiftY: 0,
  };
}

export function walkLoopMs(kind: DeviceKind): number {
  return kind === "desktop" ? 30 : 50;
}

export function decorLoopMs(kind: DeviceKind): number {
  return kind === "desktop" ? 100 : 220;
}

export function maxDecorButterflies(kind: DeviceKind): number {
  return kind === "desktop" ? 3 : 1;
}

export function shouldSpawnWind(kind: DeviceKind): boolean {
  return kind !== "phone";
}

export function saveDebounceMs(kind: DeviceKind): number {
  if (kind === "desktop") return 0;
  if (kind === "phone") return 2500;
  return 1500;
}

export function isLiteEffects(kind: DeviceKind): boolean {
  return kind === "tablet";
}
