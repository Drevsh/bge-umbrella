"""Extract one image per distinct Dark Action card from the supplied scans.

Coordinates refer to the original 2480 x 3504 JPEGs. Run from the repository
root with: py -3 scripts/crop_dark_cards.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "dark" / "2026-10-11_173022"
DESTINATION = ROOT / "images" / "dark" / "cards"

# The first sheet repeats 82; its second physical copy is not a separate card.
SHEETS = [
    (
        "Document_2026-10-11_172819.jpg",
        [
            (79, 70, 117, 1136, 902),
            (77, 1344, 58, 2427, 846),
            (82, 52, 998, 1109, 1764),
            (75, 1332, 912, 2401, 1692),
            (73, 55, 1842, 1119, 2621),
            (80, 1357, 1808, 2414, 2591),
            (78, 62, 2671, 1139, 3463),
        ],
    ),
    (
        "2026-10-11_172942.jpg",
        [
            (74, 98, 84, 1158, 856),
            (71, 1437, 84, 2464, 855),
            (81, 83, 898, 1138, 1660),
            (70, 1445, 970, 2464, 1756),
            (72, 80, 1706, 1141, 2490),
            (76, 71, 2549, 1133, 3321),
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
    expected = set(range(70, 83))
    if seen != expected:
        raise ValueError(f"Unexpected Dark card sequence: {sorted(seen)}")


if __name__ == "__main__":
    main()
