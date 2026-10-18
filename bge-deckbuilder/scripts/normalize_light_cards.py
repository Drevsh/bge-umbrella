"""Remove outside white margins and normalize a directory of card PNGs.

Run from the repository root. Defaults to the Light card folder and writes
previews under tmp/normalized_light_cards. Requires OpenCV (`cv2`).
"""

import argparse
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SIZE = (768, 1068)  # width, height; approximately the source card ratio


def normalize(source: Path, output_dir: Path) -> Path:
    image = cv2.imread(str(source), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"Cannot read image: {source}")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    foreground = (gray < 245).astype(np.uint8)
    contours, _ = cv2.findContours(
        foreground, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if not contours:
        raise ValueError(f"No card boundary found: {source}")

    contour = max(contours, key=cv2.contourArea)
    x, y, width, height = cv2.boundingRect(contour)
    if width < image.shape[1] * 0.85 or height < image.shape[0] * 0.85:
        raise ValueError(f"Detected boundary is unexpectedly small: {source}")

    mask = np.zeros(gray.shape, dtype=np.uint8)
    cv2.drawContours(mask, [contour], -1, 255, thickness=cv2.FILLED)
    crop = image[y : y + height, x : x + width]
    alpha = mask[y : y + height, x : x + width]

    resized = cv2.resize(crop, SIZE, interpolation=cv2.INTER_LANCZOS4)
    resized_alpha = cv2.resize(alpha, SIZE, interpolation=cv2.INTER_AREA)
    output = cv2.cvtColor(resized, cv2.COLOR_BGR2BGRA)
    output[:, :, 3] = resized_alpha

    destination = output_dir / source.name
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(destination), output):
        raise OSError(f"Cannot write image: {destination}")
    return destination


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cards-dir",
        type=Path,
        default=Path("images/light/cards"),
        help="directory containing card PNGs (relative to repository root by default)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("tmp/normalized_light_cards"),
        help="directory for normalized previews",
    )
    parser.add_argument(
        "--expected-count",
        type=int,
        help="fail if the number of card PNGs differs from this count",
    )
    args = parser.parse_args()
    cards_dir = args.cards_dir if args.cards_dir.is_absolute() else ROOT / args.cards_dir
    output_dir = (
        args.output_dir if args.output_dir.is_absolute() else ROOT / args.output_dir
    )
    sources = sorted(cards_dir.glob("DE-CB-*-125.png"))
    if not sources:
        raise ValueError(f"No card PNGs found in {cards_dir}")
    if args.expected_count is not None and len(sources) != args.expected_count:
        raise ValueError(
            f"Expected {args.expected_count} cards in {cards_dir}; found {len(sources)}"
        )
    for source in sources:
        destination = normalize(source, output_dir)
        try:
            print(destination.relative_to(ROOT))
        except ValueError:
            print(destination)


if __name__ == "__main__":
    main()
