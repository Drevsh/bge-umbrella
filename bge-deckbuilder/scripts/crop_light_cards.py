"""Extract one image per distinct Light Action card from the supplied scans.

Coordinates refer to the original 2480 x 3504 JPEGs. Run from the repository
root with: py -3 scripts/crop_light_cards.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "light"
DESTINATION = SOURCE / "cards"

# (source file, printed card number and crop bounds for each unique card)
# The second scan repeats 99; its second physical copy is not a separate card.
SHEETS = [
    (
        "2026-10-11_171601.jpg",
        [
            (97, 67, 97, 1123, 860),
            (101, 1310, 80, 2373, 854),
            (109, 61, 955, 1121, 1725),
            (106, 1301, 962, 2363, 1737),
            (105, 39, 1842, 1098, 2607),
            (108, 1301, 1817, 2367, 2612),
            (98, 58, 2703, 1117, 3471),
            (110, 1316, 2709, 2383, 3488),
        ],
    ),
    (
        "Document_2026-10-11_171807.jpg",
        [
            (99, 135, 53, 1198, 831),
            (104, 1411, 234, 2464, 995),
            (107, 112, 900, 1173, 1680),
            (100, 94, 1840, 1149, 2604),
            (103, 1368, 2120, 2431, 2902),
            (102, 89, 2690, 1160, 3474),
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
    expected = set(range(97, 111))
    if seen != expected:
        raise ValueError(f"Unexpected Light card sequence: {sorted(seen)}")


if __name__ == "__main__":
    main()
