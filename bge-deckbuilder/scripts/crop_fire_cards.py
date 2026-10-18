"""Extract one image per distinct Fire Action card from the supplied scans.

Coordinates refer to the original 2480 x 3504 JPEGs. Run from the repository
root with: py -3 scripts/crop_fire_cards.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "fire" / "2026-10-11_172356"
DESTINATION = ROOT / "images" / "fire" / "cards"

# Card 57 appears on both sheets. Card 59 is absent from the supplied scans.
SHEETS = [
    (
        "Document_2026-10-11_172200.jpg",
        [
            (67, 77, 40, 1136, 819),
            (58, 1400, 68, 2463, 846),
            (65, 85, 868, 1161, 1662),
            (57, 1393, 929, 2461, 1708),
            (55, 81, 1792, 1162, 2580),
            (68, 1366, 1814, 2459, 2601),
            (66, 92, 2686, 1146, 3446),
            (64, 1437, 2676, 2464, 3451),
        ],
    ),
    (
        "Document_2026-10-11_172314 (2).jpg",
        [
            (60, 113, 96, 1174, 866),
            (63, 1418, 385, 2464, 1168),
            (61, 116, 980, 1177, 1750),
            (69, 1409, 1403, 2464, 2190),
            (62, 123, 1829, 1180, 2593),
            (56, 1380, 2388, 2440, 3157),
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
    expected = set(range(55, 70)) - {59}
    if seen != expected:
        raise ValueError(f"Unexpected Fire card sequence: {sorted(seen)}")


if __name__ == "__main__":
    main()
