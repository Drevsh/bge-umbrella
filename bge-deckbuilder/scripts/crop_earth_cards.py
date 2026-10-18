"""Extract the 14 printed Earth Action cards from the supplied scan sheets.

Coordinates refer to the original 2480 x 3504 JPEGs. Run from the repository
root with: py -3 scripts/crop_earth_cards.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "earth"
DESTINATION = SOURCE / "cards"

# (source file, columns, rows, printed card IDs in row-major order)
SHEETS = [
    (
        "Document_2026-10-11_162227.jpg",
        [(70, 1111), (1308, 2352)],
        [(35, 804), (930, 1697), (1783, 2586), (2656, 3440)],
        [(88, 87), (86, 96), (85, 95), (94, 92)],
    ),
    (
        "Photo_2026-10-11_162456.jpg",
        [(96, 1150), (1370, 2406)],
        [(74, 852), (938, 1747), (1825, 2573), (2712, 3458)],
        [(91, 83), (89, 84), (93, None), (90, None)],
    ),
]


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    seen: set[int] = set()
    for filename, columns, rows, card_ids in SHEETS:
        with Image.open(SOURCE / filename) as scan:
            if scan.size != (2480, 3504):
                raise ValueError(f"Unexpected source dimensions: {filename}: {scan.size}")
            for row_index, (top, bottom) in enumerate(rows):
                for column_index, (left, right) in enumerate(columns):
                    number = card_ids[row_index][column_index]
                    if number is None:
                        continue
                    if number in seen:
                        raise ValueError(f"Duplicate card number: {number}")
                    seen.add(number)
                    card = scan.crop((left, top, right, bottom))
                    card = card.transpose(Image.Transpose.ROTATE_90)
                    output = DESTINATION / f"DE-CB-{number}-125.jpg"
                    card.save(output, quality=95, subsampling=0, optimize=True)
                    print(output.relative_to(ROOT))
    if seen != set(range(83, 97)):
        raise ValueError(f"Incomplete Earth card sequence: {sorted(seen)}")


if __name__ == "__main__":
    main()
