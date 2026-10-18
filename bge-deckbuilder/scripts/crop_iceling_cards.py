"""Crop Iceling's stat, ability, and Action cards from the supplied scan.

Run from the repository root with: py -3 scripts/crop_iceling_cards.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "mystlings" / "iceling" / "Document_2026-10-11_174614.jpg"
DESTINATION = SOURCE.parent / "cards"

# (output file, left, top, right, bottom) in the original 2480 x 3504 scan.
CARDS = [
    ("stat_113A.jpg", 101, 63, 1160, 831),
    ("ability_117A.jpg", 113, 1142, 1168, 1902),
    ("DE-CB-M58-90.jpg", 1355, 2243, 2422, 3023),
    ("DE-CB-M59-90.jpg", 1402, 1175, 2464, 1958),
    ("DE-CB-M60-90.jpg", 1387, 141, 2443, 906),
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
