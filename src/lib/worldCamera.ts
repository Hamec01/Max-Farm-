import type { DeviceKind } from "../hooks/useGameViewport";
import type { LocationId } from "../types";
import {
  DEFAULT_WORLD_HEIGHT,
  DEFAULT_WORLD_WIDTH,
  MEADOW_LEVEL_HEIGHT,
  MEADOW_LEVEL_WIDTH,
} from "./sceneLayout";
import { isInteriorZone } from "../data/locations";

/** Сдвиг камеры по одной оси (мир в %, zoom = effectiveZoom) */
export function computeAxisShift(worldPercent: number, zoom: number, center = 50): number {
  return Math.max(0, Math.min((zoom - 1) * 100, worldPercent * zoom - center));
}

export interface WorldCamera {
  camX: number;
  camY: number;
  zoom: number;
  /** Letterbox when viewport shows more world space than exists */
  centerOffsetX: number;
  centerOffsetY: number;
}

export function getWorldSizeForZone(zone: LocationId): { width: number; height: number } {
  if (!isInteriorZone(zone)) {
    return { width: MEADOW_LEVEL_WIDTH, height: MEADOW_LEVEL_HEIGHT };
  }
  return { width: DEFAULT_WORLD_WIDTH, height: DEFAULT_WORLD_HEIGHT };
}

export function getDeviceCameraZoom(
  kind: DeviceKind,
  worldWidth = DEFAULT_WORLD_WIDTH
): number {
  if (kind === "phone") return worldWidth >= MEADOW_LEVEL_WIDTH ? 0.8 : 0.88;
  if (kind === "tablet") return worldWidth >= MEADOW_LEVEL_WIDTH ? 1.02 : 1.15;
  return 1;
}

export function computeCameraFollow(
  boyXPercent: number,
  boyYPercent: number,
  viewportW: number,
  viewportH: number,
  zoom: number,
  worldWidth = DEFAULT_WORLD_WIDTH,
  worldHeight = DEFAULT_WORLD_HEIGHT
): Pick<WorldCamera, "camX" | "camY" | "centerOffsetX" | "centerOffsetY"> {
  const boyPx = (boyXPercent / 100) * worldWidth;
  const boyPy = (boyYPercent / 100) * worldHeight;
  const visibleW = viewportW / zoom;
  const visibleH = viewportH / zoom;

  const maxCamX = Math.max(0, worldWidth - visibleW);
  const maxCamY = Math.max(0, worldHeight - visibleH);

  let camX: number;
  if (maxCamX <= 0) {
    camX = 0;
  } else {
    camX = boyPx - visibleW / 2;
    camX = Math.max(0, Math.min(maxCamX, camX));
  }

  let camY: number;
  if (maxCamY <= 0) {
    camY = 0;
  } else {
    camY = boyPy - visibleH / 2;
    camY = Math.max(0, Math.min(maxCamY, camY));
  }

  const centerOffsetX = maxCamX <= 0 ? (visibleW - worldWidth) / 2 : 0;
  const centerOffsetY = maxCamY <= 0 ? (visibleH - worldHeight) / 2 : 0;

  return { camX, camY, centerOffsetX, centerOffsetY };
}

/** transform-origin: 0 0 — камера как окно просмотра */
export function buildWorldTransform(
  camX: number,
  camY: number,
  zoom: number,
  centerOffsetX = 0,
  centerOffsetY = 0
): string {
  const tx = (centerOffsetX - camX) * zoom;
  const ty = (centerOffsetY - camY) * zoom;
  return `translate3d(${tx}px, ${ty}px, 0) scale(${zoom})`;
}

export function screenToWorldPercent(
  clientX: number,
  clientY: number,
  viewportRect: DOMRect,
  camX: number,
  camY: number,
  zoom: number,
  centerOffsetX = 0,
  centerOffsetY = 0,
  worldWidth = DEFAULT_WORLD_WIDTH,
  worldHeight = DEFAULT_WORLD_HEIGHT
): { x: number; y: number } {
  const sx = clientX - viewportRect.left;
  const sy = clientY - viewportRect.top;
  const worldX = camX + sx / zoom - centerOffsetX;
  const worldY = camY + sy / zoom - centerOffsetY;
  return {
    x: (worldX / worldWidth) * 100,
    y: (worldY / worldHeight) * 100,
  };
}

export function getVisibleWorldPercentBounds(
  camX: number,
  camY: number,
  viewportW: number,
  viewportH: number,
  zoom: number,
  margin = 4,
  centerOffsetX = 0,
  centerOffsetY = 0,
  worldWidth = DEFAULT_WORLD_WIDTH,
  worldHeight = DEFAULT_WORLD_HEIGHT
): { minX: number; maxX: number; minY: number; maxY: number } {
  const visibleW = viewportW / zoom;
  const visibleH = viewportH / zoom;
  const viewMinX = camX - centerOffsetX;
  const viewMinY = camY - centerOffsetY;
  return {
    minX: (viewMinX / worldWidth) * 100 - margin,
    maxX: ((viewMinX + visibleW) / worldWidth) * 100 + margin,
    minY: (viewMinY / worldHeight) * 100 - margin,
    maxY: ((viewMinY + visibleH) / worldHeight) * 100 + margin,
  };
}

export function isWorldPointVisible(
  xPercent: number,
  yPercent: number,
  camX: number,
  camY: number,
  viewportW: number,
  viewportH: number,
  zoom: number,
  margin = 4,
  centerOffsetX = 0,
  centerOffsetY = 0,
  worldWidth = DEFAULT_WORLD_WIDTH,
  worldHeight = DEFAULT_WORLD_HEIGHT
): boolean {
  const b = getVisibleWorldPercentBounds(
    camX,
    camY,
    viewportW,
    viewportH,
    zoom,
    margin,
    centerOffsetX,
    centerOffsetY,
    worldWidth,
    worldHeight
  );
  return xPercent >= b.minX && xPercent <= b.maxX && yPercent >= b.minY && yPercent <= b.maxY;
}

/** transform-origin: 0 0 — world-size utility */
export function resolveDesktopZoom(
  baseZoom: number,
  zone: LocationId,
  worldWidth = DEFAULT_WORLD_WIDTH
): number {
  if (!isInteriorZone(zone) && worldWidth >= MEADOW_LEVEL_WIDTH) {
    return baseZoom;
  }
  return zone === "MAX_HOME" ? baseZoom * 0.92 : baseZoom;
}
