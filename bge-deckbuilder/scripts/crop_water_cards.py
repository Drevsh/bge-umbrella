"""Extract one image per distinct Water Action card from the supplied scans.

Coordinates refer to the original 2480 x 3504 JPEGs. Run from the repository
root with: py -3 scripts/crop_water_cards.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "water"
DESTINATION = SOURCE / "cards"

# (source file, printed card number and crop bounds for each unique card)
# The second scan also repeats 111 and 123; those physical duplicates are not
# separate catalog entries or output images.
SHEETS = [
    (
        "Document_2026-10-11_170511.jpg",
        [
            (116, 89, 66, 1136, 825),
            (124, 1366, 66, 2424, 825),
            (121, 89, 926, 1136, 1726),
            (119, 1366, 926, 2424, 1726),
            (123, 89, 1797, 1136, 2609),
            (113, 1366, 1797, 2424, 2609),
            (115, 89, 2656, 1136, 3451),
            (117, 1366, 2656, 2424, 3451),
        ],
    ),
    (
        "2026-10-11_170904.jpg",
        [
            (122, 91, 23, 1150, 769),
            (111, 1358, 144, 2406, 889),
            (120, 91, 909, 1150, 1652),
            (118, 1358, 2094, 2406, 2836),
            (114, 91, 2706, 1150, 3451),
        ],
    ),
    (
        "2026-10-11_171331.jpg",
        [
            (112, 780, 1160, 1855, 1960),
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
    expected = set(range(111, 125))
    if seen != expected:
        raise ValueError(f"Unexpected Water card sequence: {sorted(seen)}")


if __name__ == "__main__":
    main()
