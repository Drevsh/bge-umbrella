"""Crop Eldrithia's stat, ability, and Action cards from the supplied scan.

Run from the repository root with: py -3 scripts/crop_eldrithia_cards.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "mystlings" / "eldrithia" / "Document_2026-10-11_174045.jpg"
DESTINATION = SOURCE.parent / "cards"

# (output file, left, top, right, bottom) in the original 2480 x 3504 scan.
CARDS = [
    ("stat_46A.jpg", 91, 211, 1145, 969),
    ("ability_50A.jpg", 99, 1174, 1153, 1938),
    ("DE-CB-M25-90.jpg", 1386, 1102, 2449, 1885),
    ("DE-CB-M26-90.jpg", 1357, 2115, 2419, 2899),
    ("DE-CB-M27-90.jpg", 1372, 127, 2427, 890),
]


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as scan:
        if scan.size != (2480, 3504):
            raise ValueError(f"Unexpected source dimensions: {scan.size}")
        for filename, left, top, right, bottom in CARDS:
            card = scan.crop((left, top, right, bottom))
            card = card.transpose(Image.Transpose.ROTATE_270)
            output = DESTINATION / filename
            card.save(output, quality=95, subsampling=0, optimize=True)
            print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
