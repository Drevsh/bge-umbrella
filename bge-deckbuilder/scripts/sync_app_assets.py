"""Ensure Flutter app links to ./data and ./images, and verify catalog asset coverage."""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_DIR = ROOT / "app"


def ensure_link(target: Path, link: Path) -> None:
    if link.is_symlink() or link.is_dir():
        return
    if sys.platform == "win32":
        os.system(f'cmd /c mklink /J "{link}" "{target}"')
    else:
        link.symlink_to(target, target_is_directory=True)


def main() -> None:
    # Ensure links exist so the app sources directly from ./data and ./images
    ensure_link(ROOT / "data", APP_DIR / "data")
    ensure_link(ROOT / "images", APP_DIR / "images")

    catalog_path = ROOT / "data" / "catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    paths = {card["imagePath"] for card in catalog["cards"] if card["imagePath"]}
    paths.update(entry["imagePath"] for entry in catalog["bonusActions"]["elemental"])
    for mystling in catalog["mystlings"]:
        for path in (
            mystling.get("statCardImagePath"),
            mystling.get("specialAbility", {}).get("imagePath"),
            mystling.get("pvpStatCard", {}).get("imagePath"),
        ):
            if path:
                paths.add(path)

    missing = []
    for relative in sorted(paths):
        source = ROOT / relative
        if not source.is_file():
            missing.append(str(source))

    if missing:
        raise FileNotFoundError(f"Missing {len(missing)} referenced asset(s):\n" + "\n".join(missing[:5]))

    print(f"Verified links: app/data and app/images active. All {len(paths)} referenced images exist.")


if __name__ == "__main__":
    main()
