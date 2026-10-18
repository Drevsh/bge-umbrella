"""Crop the six Elemental Bonus Action reference cards from their scan.

Run from the repository root with: py -3 scripts/crop_elemental_bonus_actions.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "elementatl cards" / "Document_2026-10-11_173705.jpg"
DESTINATION = ROOT / "images" / "elemental_bonus_actions"

# (element, left, top, right, bottom) in the original 2480 x 3504 scan.
CARDS = [
    ("fire", 82, 69, 1141, 850),
    ("air", 1398, 50, 2462, 852),
    ("earth", 72, 891, 1141, 1690),
    ("light", 1380, 899, 2454, 1695),
    ("dark", 65, 1749, 1134, 2564),
    ("water", 1375, 1752, 2440, 2573),
]


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as scan:
        if scan.size != (2480, 3504):
            raise ValueError(f"Unexpected source dimensions: {scan.size}")
        for element, left, top, right, bottom in CARDS:
            card = scan.crop((left, top, right, bottom))
            card = card.transpose(Image.Transpose.ROTATE_270)
            output = DESTINATION / f"{element}.jpg"
            card.save(output, quality=95, subsampling=0, optimize=True)
            print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
