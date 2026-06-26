#!/usr/bin/env python3
"""
Исправляет PNG-спрайты:
- белые белки глаз (заливка внутренних дыр + полупрозрачного фringe в зоне глаза)
- тёмные зрачки поверх
- удаление белого ореола у гребня / волос
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Установите Pillow: pip install pillow", file=sys.stderr)
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"

GLOBS = [
    "characters/maxim/*.png",
    "characters/workers/*.png",
    "animals/chicken/*.png",
    "animals/chick/*.png",
    "animals/goose/*.png",
    "animals/turkey/*.png",
]

ALPHA_BG = 32
ALPHA_SOLID = 200
WHITE = (255, 255, 255, 255)
PUPIL = (30, 30, 30, 255)
CLEAR = (0, 0, 0, 0)

EyeDef = tuple[
    tuple[float, float, float, float],
    tuple[float, float, float],
    float | None,
]

PROFILES: dict[str, dict] = {
    "maxim": {
        "eyes": [
            ((0.30, 0.30, 0.40, 0.355), (0.339, 0.328, 0.014), 0.313),
            ((0.60, 0.30, 0.70, 0.355), (0.658, 0.328, 0.014), 0.313),
        ],
        "scrub": [],
        "fringe_y_max": 0.42,
    },
    "workers": {
        "eyes": [
            ((0.31, 0.26, 0.41, 0.34), (0.36, 0.298, 0.013), None),
            ((0.59, 0.26, 0.69, 0.34), (0.64, 0.298, 0.013), None),
        ],
        "scrub": [],
        "fringe_y_max": 0.36,
    },
    "chicken": {
        "eyes": [
            ((0.36, 0.23, 0.46, 0.31), (0.405, 0.270, 0.017), None),
            ((0.54, 0.23, 0.64, 0.31), (0.595, 0.270, 0.017), None),
        ],
        "scrub": [(0.35, 0.14, 0.57, 0.24)],
        "fringe_y_max": 0.26,
    },
    "chick": {
        "eyes": [
            ((0.36, 0.25, 0.46, 0.35), (0.405, 0.298, 0.016), None),
            ((0.54, 0.25, 0.64, 0.35), (0.595, 0.298, 0.016), None),
        ],
        "scrub": [(0.35, 0.15, 0.57, 0.27)],
        "fringe_y_max": 0.28,
    },
    "goose": {
        "eyes": [
            ((0.36, 0.20, 0.46, 0.30), (0.405, 0.252, 0.015), None),
            ((0.54, 0.20, 0.64, 0.30), (0.595, 0.252, 0.015), None),
        ],
        "scrub": [(0.40, 0.10, 0.60, 0.22)],
        "fringe_y_max": 0.24,
    },
    "turkey": {
        "eyes": [
            ((0.36, 0.20, 0.46, 0.30), (0.405, 0.252, 0.015), None),
            ((0.54, 0.20, 0.64, 0.30), (0.595, 0.252, 0.015), None),
        ],
        "scrub": [(0.38, 0.08, 0.62, 0.22)],
        "fringe_y_max": 0.24,
    },
}


def sprite_kind(path: Path) -> str:
    parts = path.parts
    if "maxim" in parts:
        return "maxim"
    if "workers" in parts:
        return "workers"
    for kind in ("chicken", "chick", "goose", "turkey"):
        if kind in parts:
            return kind
    return "workers"


def in_box(fx: float, fy: float, box: tuple[float, float, float, float]) -> bool:
    return box[0] <= fx <= box[2] and box[1] <= fy <= box[3]


def in_pupil(x: int, y: int, w: int, h: int, pupil: tuple[float, float, float]) -> bool:
    cx, cy, radius = pupil
    rx = radius * w
    return ((x - cx * w) / rx) ** 2 + ((y - cy * h) / rx) ** 2 <= 1


def mark_outside(px, w: int, h: int) -> list[list[bool]]:
    outside = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_push(x: int, y: int) -> None:
        if x < 0 or x >= w or y < 0 or y >= h:
            return
        if outside[y][x] or px[x, y][3] > ALPHA_BG:
            return
        outside[y][x] = True
        q.append((x, y))

    for x in range(w):
        try_push(x, 0)
        try_push(x, h - 1)
    for y in range(h):
        try_push(0, y)
        try_push(w - 1, y)

    while q:
        x, y = q.popleft()
        try_push(x + 1, y)
        try_push(x - 1, y)
        try_push(x, y + 1)
        try_push(x, y - 1)

    return outside


def opaque_neighbors(px, x: int, y: int, w: int, h: int, radius: int = 2) -> int:
    count = 0
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = x + dx, y + dy
            if nx < 0 or nx >= w or ny < 0 or ny >= h:
                continue
            if px[nx, ny][3] > ALPHA_SOLID:
                count += 1
    return count


def fill_eyes(px, w: int, h: int, outside: list[list[bool]], eyes: list[EyeDef]) -> int:
    changed = 0
    for zone, pupil, min_y in eyes:
        x0, y0 = int(zone[0] * w), int(zone[1] * h)
        x1, y1 = int(zone[2] * w), int(zone[3] * h)
        for y in range(max(0, y0), min(h, y1)):
            fy = y / h
            if min_y is not None and fy < min_y:
                continue
            for x in range(max(0, x0), min(w, x1)):
                if outside[y][x]:
                    continue
                if in_pupil(x, y, w, h, pupil):
                    continue
                if px[x, y][3] > ALPHA_SOLID:
                    continue
                px[x, y] = WHITE
                changed += 1
    return changed


def paint_pupils(px, w: int, h: int, eyes: list[EyeDef]) -> int:
    changed = 0
    for _, pupil, _ in eyes:
        cx, cy, radius = pupil
        rcx, rcy, rr = cx * w, cy * h, radius * w
        y0 = max(0, int(rcy - rr - 1))
        y1 = min(h, int(rcy + rr + 2))
        x0 = max(0, int(rcx - rr - 1))
        x1 = min(w, int(rcx + rr + 2))
        for y in range(y0, y1):
            for x in range(x0, x1):
                if not in_pupil(x, y, w, h, pupil):
                    continue
                if px[x, y][3] > ALPHA_SOLID:
                    continue
                px[x, y] = PUPIL
                changed += 1
    return changed


def scrub_light_fringe(
    px,
    w: int,
    h: int,
    outside: list[list[bool]],
    boxes: list[tuple[float, float, float, float]],
    y_max_frac: float,
) -> int:
    changed = 0
    y_limit = int(h * y_max_frac)
    targets = list(boxes)
    targets.append((0.0, 0.0, 1.0, y_max_frac))

    for y in range(y_limit):
        fy = y / h
        for x in range(w):
            fx = x / w
            if not any(in_box(fx, fy, box) for box in targets):
                continue
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r + g + b < 280:
                continue
            if a > 240 and not outside[y][x]:
                continue
            if not outside[y][x]:
                if opaque_neighbors(px, x, y, w, h, 1) > 2:
                    continue
            px[x, y] = CLEAR
            changed += 1
    return changed


def fix_sprite(path: Path) -> tuple[int, int, int]:
    profile = PROFILES[sprite_kind(path)]
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()
    outside = mark_outside(px, w, h)

    white = fill_eyes(px, w, h, outside, profile["eyes"])
    pupils = paint_pupils(px, w, h, profile["eyes"])
    fringe = scrub_light_fringe(px, w, h, outside, profile["scrub"], profile["fringe_y_max"])

    total = white + pupils + fringe
    if total:
        tmp = path.with_suffix(".tmp.png")
        img.save(tmp)
        tmp.replace(path)
    return white, pupils, fringe


def main() -> int:
    count = 0
    for pattern in GLOBS:
        for path in sorted(ASSETS.glob(pattern)):
            w, p, f = fix_sprite(path)
            if w or p or f:
                print(f"{path.relative_to(ROOT)}: white={w} pupil={p} fringe={f}")
                count += 1
    print(f"Готово: {count} файлов." if count else "Изменений не потребовалось.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
