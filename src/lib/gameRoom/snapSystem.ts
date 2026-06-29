export interface PieceSnapState {
  id: string;
  row: number;
  col: number;
  groupId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  correctX: number;
  correctY: number;
  locked: boolean;
  canvas: HTMLCanvasElement;
}

const SLOT_SNAP_RATIO = 0.32;
const NEIGHBOR_SNAP_RATIO = 0.36;
const MAGNET_SNAP_RATIO = 0.42;

export function trySnapToSlot(piece: PieceSnapState): boolean {
  if (piece.locked) return false;
  const threshold = piece.width * SLOT_SNAP_RATIO;
  const dx = piece.x - piece.correctX;
  const dy = piece.y - piece.correctY;
  if (Math.hypot(dx, dy) <= threshold) {
    piece.x = piece.correctX;
    piece.y = piece.correctY;
    piece.locked = true;
    return true;
  }
  return false;
}

/** Притягивание к ближайшему слоту при отпускании */
export function magnetSnapToNearestSlot(piece: PieceSnapState): boolean {
  if (piece.locked) return false;
  const threshold = piece.width * MAGNET_SNAP_RATIO;
  const dx = piece.x - piece.correctX;
  const dy = piece.y - piece.correctY;
  if (Math.hypot(dx, dy) <= threshold) {
    piece.x = piece.correctX;
    piece.y = piece.correctY;
    piece.locked = true;
    return true;
  }
  return false;
}

function areNeighbors(a: PieceSnapState, b: PieceSnapState): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 0 && dc === 1) || (dr === 1 && dc === 0);
}

export function trySnapNeighbors(pieces: PieceSnapState[]): boolean {
  let merged = false;
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const a = pieces[i];
      const b = pieces[j];
      if (a.groupId === b.groupId || a.locked || b.locked) continue;
      if (!areNeighbors(a, b)) continue;

      const threshold = Math.min(a.width, b.width) * NEIGHBOR_SNAP_RATIO;
      let snap = false;

      if (a.col + 1 === b.col && a.row === b.row) {
        if (Math.abs(a.x + a.width - b.x) < threshold && Math.abs(a.y - b.y) < threshold) {
          b.x = a.x + a.width;
          b.y = a.y;
          snap = true;
        }
      } else if (b.col + 1 === a.col && a.row === b.row) {
        if (Math.abs(b.x + b.width - a.x) < threshold && Math.abs(a.y - b.y) < threshold) {
          a.x = b.x + b.width;
          a.y = b.y;
          snap = true;
        }
      } else if (a.row + 1 === b.row && a.col === b.col) {
        if (Math.abs(a.y + a.height - b.y) < threshold && Math.abs(a.x - b.x) < threshold) {
          b.x = a.x;
          b.y = a.y + a.height;
          snap = true;
        }
      } else if (b.row + 1 === a.row && a.col === b.col) {
        if (Math.abs(b.y + b.height - a.y) < threshold && Math.abs(a.x - b.x) < threshold) {
          a.x = b.x;
          a.y = b.y + b.height;
          snap = true;
        }
      }

      if (snap) {
        const gid = a.groupId;
        const oldGid = b.groupId;
        pieces.forEach((p) => {
          if (p.groupId === oldGid) p.groupId = gid;
        });
        merged = true;
      }
    }
  }
  return merged;
}

export function isPuzzleComplete(pieces: PieceSnapState[]): boolean {
  return pieces.length > 0 && pieces.every((p) => p.locked);
}

export function mergeGroups(pieces: PieceSnapState[], fromId: string, toId: string) {
  pieces.forEach((p) => {
    if (p.groupId === fromId) p.groupId = toId;
  });
}

export function scatterPieces(
  pieces: PieceSnapState[],
  area: { x: number; y: number; w: number; h: number }
) {
  const padding = 8;
  pieces.forEach((p, i) => {
    const cols = Math.ceil(Math.sqrt(pieces.length));
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cellW = (area.w - padding * 2) / cols;
    const cellH = (area.h - padding * 2) / Math.ceil(pieces.length / cols);
    p.x = area.x + padding + col * cellW + (cellW - p.width) / 2;
    p.y = area.y + padding + row * cellH + (cellH - p.height) / 2;
    p.locked = false;
  });
}
