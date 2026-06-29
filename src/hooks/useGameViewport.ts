import { useEffect, useState } from "react";

export type DeviceKind = "phone" | "tablet" | "desktop";

export interface GameViewport {
  width: number;
  height: number;
  zoomScale: number;
  viewportHeightPx: number;
  deviceKind: DeviceKind;
  isPortrait: boolean;
}

function getDeviceKind(width: number, height: number): DeviceKind {
  const shortSide = Math.min(width, height);
  if (shortSide < 640) return "phone";
  if (shortSide < 1024) return "tablet";
  return "desktop";
}

/** Zoom камеры — только через worldCamera; здесь legacy fallback = 1 */
export function computeZoomScale(_width: number, _height: number, kind: DeviceKind): number {
  if (kind === "phone") return 0.88;
  if (kind === "tablet") return 1.15;
  return 1;
}

export function computeViewportHeight(
  _width: number,
  visibleHeight: number,
  _kind: DeviceKind
): number {
  // Вся видимая область — без пустой полосы снизу на ПК и планшете
  return Math.round(Math.max(280, visibleHeight));
}

function readViewport(): GameViewport {
  const vv = window.visualViewport;
  const width = vv?.width ?? window.innerWidth;
  const height = vv?.height ?? window.innerHeight;
  const deviceKind = getDeviceKind(width, height);

  return {
    width,
    height,
    deviceKind,
    isPortrait: height > width,
    zoomScale: computeZoomScale(width, height, deviceKind),
    viewportHeightPx: computeViewportHeight(width, height, deviceKind),
  };
}

const SSR_FALLBACK: GameViewport = {
  width: 1280,
  height: 800,
  zoomScale: 1.32,
  viewportHeightPx: 720,
  deviceKind: "desktop",
  isPortrait: false,
};

export function useGameViewport(): GameViewport {
  const [vp, setVp] = useState<GameViewport>(() =>
    typeof window !== "undefined" ? readViewport() : SSR_FALLBACK
  );

  useEffect(() => {
    let raf = 0;
    let orientTimers: ReturnType<typeof setTimeout>[] = [];

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVp(readViewport()));
    };

    const onOrientationChange = () => {
      update();
      // Браузеры иногда отдают старый размер сразу после поворота
      orientTimers.forEach(clearTimeout);
      orientTimers = [120, 350].map((ms) => setTimeout(update, ms));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", onOrientationChange);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    screen.orientation?.addEventListener("change", onOrientationChange);

    return () => {
      cancelAnimationFrame(raf);
      orientTimers.forEach(clearTimeout);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", onOrientationChange);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      screen.orientation?.removeEventListener("change", onOrientationChange);
    };
  }, []);

  return vp;
}

/** Телефон и планшет — компактные меню; ПК (≥1024px) — без изменений */
export function isCompactDevice(kind: DeviceKind): boolean {
  return kind !== "desktop";
}
