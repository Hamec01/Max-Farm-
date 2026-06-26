from collections import deque
from pathlib import Path
from PIL import Image

ALPHA = 32
HEAD = 0.38
ROOT = Path(__file__).resolve().parents[1]


def analyze(rel: str) -> None:
    p = ROOT / rel
    im = Image.open(p).convert("RGBA")
    w, h = im.size
    px = im.load()
    outside = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or x >= w or y < 0 or y >= h or outside[y][x] or px[x, y][3] > ALPHA:
            return
        outside[y][x] = True
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            push(nx, ny)

    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > ALPHA:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    head = miny + int((maxy - miny + 1) * HEAD)
    vis = [[False] * w for _ in range(h)]
    comps: list[list[tuple[int, int]]] = []

    for y in range(head + 1):
        for x in range(w):
            if vis[y][x] or outside[y][x] or px[x, y][3] > ALPHA:
                continue
            cq: deque[tuple[int, int]] = deque([(x, y)])
            comp: list[tuple[int, int]] = []
            vis[y][x] = True
            while cq:
                cx, cy = cq.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or nx >= w or ny < 0 or ny > head or vis[ny][nx] or outside[ny][nx]:
                        continue
                    if px[nx, ny][3] > ALPHA:
                        continue
                    vis[ny][nx] = True
                    cq.append((nx, ny))
            if comp:
                comps.append(comp)

    comps.sort(key=len, reverse=True)
    print(f"== {rel} size {w}x{h} head_bottom={head}")
    for i, c in enumerate(comps[:10]):
        xs = [p[0] for p in c]
        ys = [p[1] for p in c]
        print(
            i,
            "n=",
            len(c),
            "cx=",
            round((min(xs) + max(xs)) / 2 / w, 3),
            "cy=",
            round((min(ys) + max(ys)) / 2 / h, 3),
        )


if __name__ == "__main__":
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        analyze("public/assets/characters/maxim/idle.png")
        analyze("public/assets/animals/chicken/happy.png")
    out = ROOT / "scripts" / "analyze-output.txt"
    out.write_text(buf.getvalue(), encoding="utf-8")
    print(buf.getvalue())
