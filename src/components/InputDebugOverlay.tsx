import { useEffect, useState } from "react";
import {
  getInputDebugSnapshot,
  InputDebugSnapshot,
  subscribeInputDebug,
} from "../lib/input/inputDebug";

export function InputDebugOverlay() {
  const [debug, setDebug] = useState<InputDebugSnapshot>(() => getInputDebugSnapshot());

  useEffect(() => subscribeInputDebug(setDebug), []);

  if (!import.meta.env.DEV) return null;

  return (
    <div
      className="fixed bottom-2 left-2 z-[9999] pointer-events-none select-none rounded-lg border border-slate-600/80 bg-slate-900/85 px-2 py-1.5 text-[10px] font-mono text-slate-100 shadow-lg"
      id="input-debug-overlay"
      aria-hidden
    >
      <div>input: {debug.pointerType}</div>
      <div>action: {debug.action}</div>
      <div>target: {debug.targetId ?? "—"}</div>
    </div>
  );
}
