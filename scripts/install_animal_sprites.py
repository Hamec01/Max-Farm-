"""Copy user animal PNGs into public/assets/animals/ and key out black backgrounds."""
from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Install Pillow: pip install pillow")

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "assets"
OUT = ROOT / "public" / "assets" / "animals"

MAPPING: list[tuple[str, str, str]] = [
    ("sheep_happy.png", "sheep", "happy.png"),
    ("sheep_sad.png", "sheep", "hungry.png"),
    ("cow_happy.png", "cow", "happy.png"),
    ("cow_sad.png", "cow", "hungry.png"),
    ("goat_happy.png", "goat", "happy.png"),
    ("goat_sad.png", "goat", "hungry.png"),
    ("pig_happy.png", "pig", "happy.png"),
    ("pig_sad.png", "pig", "hungry.png"),
    ("rabbit_happy.png", "rabbit", "happy.png"),
    ("rabbit_sad.png", "rabbit", "hungry.png"),
    ("mule_happy.png", "donkey", "happy.png"),
    ("mule_sad.png", "donkey", "hungry.png"),
]

# Bull shares cow art
BULL_COPIES = [("cow", "happy.png"), ("cow", "hungry.png")]


def key_black(img: Image.Image, threshold: int = 28) -> Image.Image:
    rgba = img.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (0, 0, 0, 0)
    return rgba


def write_sprite(src_name: str, folder: str, dest_name: str) -> None:
    src = SRC / src_name
    if not src.exists():
        alt = ROOT / "assets" / src_name
        if alt.exists():
            src = alt
        else:
            print(f"SKIP missing: {src_name}")
            return
    dest_dir = OUT / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    img = Image.open(src)
    keyed = key_black(img)
    dest = dest_dir / dest_name
    keyed.save(dest, "PNG")
    print(f"OK {src_name} -> {dest.relative_to(ROOT)}")


def main() -> None:
    for src_name, folder, dest_name in MAPPING:
        write_sprite(src_name, folder, dest_name)

    bull_dir = OUT / "bull"
    bull_dir.mkdir(parents=True, exist_ok=True)
    for folder, name in BULL_COPIES:
        src = OUT / folder / name
        if src.exists():
            Image.open(src).save(bull_dir / name, "PNG")
            print(f"OK bull/{name} <- {folder}/{name}")


if __name__ == "__main__":
    main()
