"""Crop the Mystling stat cards from the supplied mixed stat sheet.

Run from the repository root with: py -3 scripts/crop_mystling_stat_sheet.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "images" / "mystlings" / "Document_2026-10-11_175016 (2).jpg"
DESTINATION = SOURCE.parent

# (Mystling directory, output file, left, top, right, bottom).
CARDS = [
    ("young_gaiadon", "stat_96A.jpg", 39, 31, 1100, 814),
    ("firple", "stat_68A.jpg", 1327, 16, 2386, 778),
    ("chrysomallon", "stat_35A.jpg", 57, 887, 1114, 1663),
    ("elkthorn", "stat_51A.jpg", 1345, 899, 2402, 1679),
    ("windraiser", "stat_171A.jpg", 48, 1798, 1103, 2567),
    ("young_iceling", "stat_118A.jpg", 1342, 1796, 2397, 2570),
    ("young_shadeclaw", "stat_147A.jpg", 77, 2708, 1132, 3478),
    ("young_emberling", "stat_62B_pvp.jpg", 1336, 2670, 2390, 3435),
]


def main() -> None:
    with Image.open(SOURCE) as scan:
        if scan.size != (2480, 3504):
            raise ValueError(f"Unexpected source dimensions: {scan.size}")
        for mystling, filename, left, top, right, bottom in CARDS:
            destination = DESTINATION / mystling / "cards"
            destination.mkdir(parents=True, exist_ok=True)
            card = scan.crop((left, top, right, bottom))
            card = card.transpose(Image.Transpose.ROTATE_270)
            output = destination / filename
            card.save(output, quality=95, subsampling=0, optimize=True)
            print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
