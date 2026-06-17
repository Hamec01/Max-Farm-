export type InputPointerKind = "mouse" | "touch" | "pen" | "unknown";
export type InputActionKind =
  | "tap"
  | "doubleTap"
  | "longPress"
  | "drag"
  | "pointerDown"
  | "context"
  | "-";

export interface InputDebugSnapshot {
  pointerType: InputPointerKind;
  action: InputActionKind;
  targetId: string | null;
  updatedAt: number;
}

let snapshot: InputDebugSnapshot = {
  pointerType: "unknown",
  action: "-",
  targetId: null,
  updatedAt: 0,
};

const listeners = new Set<(state: InputDebugSnapshot) => void>();

export function normalizePointerKind(
  pointerType?: string
): InputPointerKind {
  if (pointerType === "mouse" || pointerType === "touch" || pointerType === "pen") {
    return pointerType;
  }
  return "unknown";
}

export function reportInputDebug(
  pointerType: string | undefined,
  action: InputActionKind,
  targetId: string | null = null
): void {
  snapshot = {
    pointerType: normalizePointerKind(pointerType),
    action,
    targetId,
    updatedAt: Date.now(),
  };
  listeners.forEach((listener) => listener(snapshot));
}

export function getInputDebugSnapshot(): InputDebugSnapshot {
  return snapshot;
}

export function subscribeInputDebug(
  listener: (state: InputDebugSnapshot) => void
): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}
