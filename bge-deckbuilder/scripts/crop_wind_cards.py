"""Extract the 14 printed Wind Action cards from the supplied scan sheets.

Coordinates refer to the original 2480 x 3504 JPEGs. Run from the repository
root with: py -3 scripts/crop_wind_cards.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "wind"
DESTINATION = SOURCE / "cards"

# (source file, printed card number and crop bounds for each card)
SHEETS = [
    (
        "Document_2026-10-11_165924.jpg",
        [
            (45, 104, 90, 1146, 858),
            (54, 1437, 90, 2456, 858),
            (46, 104, 980, 1146, 1769),
            (42, 1437, 980, 2456, 1769),
            (53, 104, 1879, 1146, 2628),
            (51, 1437, 1879, 2456, 2628),
            (50, 104, 2706, 1146, 3455),
            (44, 1437, 2706, 2456, 3455),
        ],
    ),
    (
        "2026-10-11_170327.jpg",
        [
            (49, 77, 23, 1136, 761),
            (47, 1321, 361, 2354, 1108),
            (43, 77, 933, 1136, 1677),
            (48, 1321, 1307, 2354, 2052),
            (52, 77, 1833, 1136, 2579),
            (41, 77, 2697, 1136, 3440),
        ],
    ),
]


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    seen: set[int] = set()
    for filename, cards in SHEETS:
        with Image.open(SOURCE / filename) as scan:
            if scan.size != (2480, 3504):
                raise ValueError(f"Unexpected source dimensions: {filename}: {scan.size}")
            for number, left, top, right, bottom in cards:
                if number in seen:
                    raise ValueError(f"Duplicate card number: {number}")
                seen.add(number)
                card = scan.crop((left, top, right, bottom))
                card = card.transpose(Image.Transpose.ROTATE_270)
                output = DESTINATION / f"DE-CB-{number}-125.jpg"
                card.save(output, quality=95, subsampling=0, optimize=True)
                print(output.relative_to(ROOT))
    if seen != set(range(41, 55)):
        raise ValueError(f"Incomplete Wind card sequence: {sorted(seen)}")


if __name__ == "__main__":
    main()
