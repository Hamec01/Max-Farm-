import { useEffect } from "react";

/** Блокирует прокрутку страницы во время полноэкранных мини-игр */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}
