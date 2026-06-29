import { useCallback, useEffect, useState, type RefObject } from "react";

const IMMERSIVE_CLASS = "is-immersive-fullscreen";
const ROOT_CLASS = "game-fullscreen-active";

function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** iPhone/iPad Safari не поддерживает полноценный Fullscreen API для div */
export function isIosTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function canUseNativeFullscreen(): boolean {
  if (typeof document === "undefined" || isIosTouchDevice()) return false;
  const probe = document.createElement("div") as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  return !!(probe.requestFullscreen || probe.webkitRequestFullscreen);
}

async function requestElementFullscreen(el: HTMLElement): Promise<boolean> {
  const node = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  };
  try {
    if (node.requestFullscreen) {
      await node.requestFullscreen();
    } else if (node.webkitRequestFullscreen) {
      await node.webkitRequestFullscreen();
    } else if (node.msRequestFullscreen) {
      await node.msRequestFullscreen();
    } else {
      return false;
    }
    return getFullscreenElement() === el;
  } catch {
    return false;
  }
}

async function exitDocumentFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  };
  try {
    if (doc.exitFullscreen) await doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    else if (doc.msExitFullscreen) await doc.msExitFullscreen();
  } catch {
    /* ignore */
  }
}

function nudgeMobileChrome() {
  if (!isIosTouchDevice()) return;
  requestAnimationFrame(() => {
    window.scrollTo(0, 1);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  });
}

function clearImmersive(el: HTMLElement | null) {
  el?.classList.remove(IMMERSIVE_CLASS);
  document.documentElement.classList.remove(ROOT_CLASS);
  document.body.classList.remove(ROOT_CLASS);

  const scrollY = Number.parseInt(document.body.dataset.fsScrollY ?? "0", 10);
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  delete document.body.dataset.fsScrollY;
  window.scrollTo(0, scrollY);
}

function applyImmersive(el: HTMLElement) {
  const scrollY = window.scrollY;
  document.body.dataset.fsScrollY = String(scrollY);

  el.classList.add(IMMERSIVE_CLASS);
  document.documentElement.classList.add(ROOT_CLASS);
  document.body.classList.add(ROOT_CLASS);

  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";

  nudgeMobileChrome();
}

export function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  const sync = useCallback(() => {
    const el = targetRef.current;
    const native = !!el && getFullscreenElement() === el;
    const immersive = el?.classList.contains(IMMERSIVE_CLASS) ?? false;
    setIsImmersive(immersive);
    setIsFullscreen(native || immersive);
  }, [targetRef]);

  useEffect(() => {
    sync();
    const events = ["fullscreenchange", "webkitfullscreenchange"] as const;
    events.forEach((ev) => document.addEventListener(ev, sync));
    return () => events.forEach((ev) => document.removeEventListener(ev, sync));
  }, [sync]);

  useEffect(() => {
    if (!isImmersive) return;
    const onResize = () => nudgeMobileChrome();
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [isImmersive]);

  const enter = useCallback(async () => {
    const el = targetRef.current;
    if (!el) return;

    if (canUseNativeFullscreen()) {
      const ok = await requestElementFullscreen(el);
      if (ok) {
        sync();
        return;
      }
    }

    applyImmersive(el);
    sync();
  }, [targetRef, sync]);

  const exit = useCallback(async () => {
    const el = targetRef.current;
    clearImmersive(el);

    if (getFullscreenElement()) {
      await exitDocumentFullscreen();
    }
    sync();
  }, [targetRef, sync]);

  const toggle = useCallback(async () => {
    if (isFullscreen) await exit();
    else await enter();
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, isImmersive, enter, exit, toggle };
}
