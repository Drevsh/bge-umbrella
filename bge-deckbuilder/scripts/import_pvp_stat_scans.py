"""Crop and catalog the 37 PvP Mystling stat sides in scan_pvp.

Run from the repository root: py -3 scripts/import_pvp_stat_scans.py
Coordinates are source-image pixels, before clockwise rotation.
"""

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SCANS = ROOT / "images" / "mystlings" / "scan_pvp"
CATALOG = ROOT / "data" / "catalog.json"

SOURCES = {
    "a": "Document_2026-10-11_183344.jpg",
    "b": "Document_2026-10-11_183516 (2).jpg",
    "c": "Document_2026-10-11_183735 (3).jpg",
    "d": "Document_2026-10-11_184021 (4).jpg",
    "e": "2026-10-11_184213.jpg",
}

# sheet, row, column, printed ID, catalog ID, willpower, defense,
# health, strength, swiftness, visible resource caps.
CARDS = [
    ("a", 0, 0, "24B", "bolb", 0, 1, 30, 4, 3, {"earth_icon": 5}),
    ("a", 0, 1, "46B", "eldrithia", 0, 0, 28, 1, 3, {"glow": 4, "gloam": 4}),
    ("a", 1, 0, "12B", "artios", 1, 0, 25, 3, 3, {}),
    ("a", 1, 1, "113B", "iceling", 0, 1, 30, 4, 2, {"ice": 4}),
    ("a", 2, 0, "6B", "young_alukah", 0, 1, 28, 3, 3, {}),
    ("a", 2, 1, "171B", "windraiser", 1, 1, 22, 3, 3, {"air_icon": 3}),
    ("a", 3, 0, "57B", "emberling", 0, 0, 30, 5, 2, {}),
    ("a", 3, 1, "147B", "young_shadeclaw", 0, 0, 19, 5, 3, {"dark_icon": 2}),
    ("b", 0, 0, "35B", "chrysomallon", 0, 3, 25, 5, 1, {}),
    ("b", 0, 1, "51B", "elkthorn", 0, 0, 33, 4, 2, {"earth_icon": 1}),
    ("b", 1, 0, "118B", "young_iceling", 0, 0, 22, 4, 3, {}),
    ("b", 1, 1, "68B", "firple", 0, 1, 20, 2, 2, {"water_icon": 5}),
    ("b", 2, 0, "96B", "young_gaiadon", 0, 0, 22, 4, 2, {}),
    ("b", 2, 1, "PS 190B", "eftus", 2, 0, 24, 2, 2, {"water_icon": 3}),
    ("b", 3, 0, "62B", "young_emberling", 0, 0, 22, 4, 3, {}),
    ("b", 3, 1, "29B", "young_bolb", 0, 1, 40, 2, 1, {}),
    ("c", 0, 0, "40B", "darktailen", 0, 0, 30, 4, 3, {"dark_icon": 4}),
    ("c", 0, 1, "102B", "glarexus", 1, 2, 26, 3, 1, {}),
    ("c", 1, 0, "83B", "furwing", 0, 2, 32, 4, 1, {}),
    ("c", 1, 1, "PS 205B", "frogmar", 0, 2, 32, 4, 1, {"fire_icon": 3}),
    ("c", 2, 0, "107B", "golomo", 1, 1, 28, 3, 1, {"earth_icon": 5}),
    ("c", 2, 1, "PS 195B", "fale", 0, 1, 31, 4, 2, {}),
    ("c", 3, 0, "PS 210B", "renewed_golomo", 0, 0, 34, 3, 2, {"earth_icon": 3}),
    ("c", 3, 1, "PS 200B", "flitterspark", 1, 0, 28, 3, 3, {}),
    ("d", 0, 0, "PS 183B", "drosithia", 1, 2, 20, 1, 2, {"water_icon": 1}),
    ("d", 0, 1, "124B", "luminesca", 0, 2, 30, 3, 2, {"light_icon": 5}),
    ("d", 1, 0, "135B", "regalian", 1, 0, 25, 2, 5, {}),
    ("d", 1, 1, "154B", "siren", 0, 2, 25, 3, 2, {"water_icon": 5, "air_icon": 1}),
    ("d", 2, 0, "78B", "renewed_firple", 0, 1, 35, 5, 1, {"water_icon": 5}),
    ("d", 2, 1, "129B", "prowler", 0, 0, 18, 4, 4, {}),
    ("d", 3, 0, "18B", "blazereef", 0, 1, 30, 4, 2, {}),
    ("d", 3, 1, "89B", "gaiadon", 1, 0, 35, 4, 2, {"earth_icon": 1}),
    ("e", 0, 0, "PS 215B", "sylphidron", 0, 0, 27, 4, 1, {}),
    ("e", 0, 1, "141B", "shadeclaw", 1, 2, 18, 5, 2, {"dark_icon": 2}),
    ("e", 1, 0, "164B", "vogandr", 0, 1, 36, 3, 1, {"water_icon": 5}),
    ("e", 2, 0, "159B", "umbra", 1, 1, 35, 3, 2, {"dark_icon": 4}),
    ("e", 3, 0, "1B", "alukah", 0, 0, 40, 4, 1, {}),
]

# left edge, left-card right edge, right-card left edge, right edge,
# then each row's top and bottom. Card positions vary slightly by sheet.
GRIDS = {
    "a": ((165, 1215, 1370, 2420), ((65, 850), (920, 1705), (1810, 2580), (2670, 3470))),
    "b": ((120, 1200, 1360, 2430), ((50, 830), (880, 1670), (1790, 2570), (2640, 3440))),
    "c": ((125, 1200, 1370, 2440), ((85, 865), (890, 1690), (1790, 2600), (2660, 3480))),
    "d": ((145, 1210, 1380, 2440), ((115, 905), (960, 1760), (1810, 2620), (2690, 3480))),
    "e": ((115, 1190, 1370, 2440), ((170, 960), (980, 1780), (1830, 2630), (2690, 3480))),
}


def crop_box(source: str, row: int, column: int) -> tuple[int, int, int, int]:
    (left, left_end, right_start, right_end), rows = GRIDS[source]
    top, bottom = rows[row]
    return (left, top, left_end, bottom) if column == 0 else (right_start, top, right_end, bottom)


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    by_id = {record["id"]: record for record in catalog["mystlings"]}
    if len(CARDS) != len(by_id):
        raise ValueError(f"Expected one PvP side per catalog Mystling: {len(CARDS)} scans, {len(by_id)} Mystlings")
    seen: set[str] = set()
    for source, row, column, printed_id, mystling_id, willpower, defense, health, strength, swiftness, caps in CARDS:
        if mystling_id in seen or mystling_id not in by_id:
            raise ValueError(f"Duplicate or unknown Mystling: {mystling_id}")
        seen.add(mystling_id)
        image_name = printed_id.replace("PS ", "")
        image_relative = f"images/mystlings/{mystling_id}/cards/stat_{image_name}.jpg"
        (ROOT / image_relative).parent.mkdir(parents=True, exist_ok=True)
        with Image.open(SCANS / SOURCES[source]) as scan:
            if scan.size != (2480, 3504):
                raise ValueError(f"Unexpected dimensions in {SOURCES[source]}: {scan.size}")
            scan.crop(crop_box(source, row, column)).transpose(Image.Transpose.ROTATE_270).save(
                ROOT / image_relative, quality=95, subsampling=0, optimize=True
            )
        pvp_card = {
            "cardId": printed_id,
            "stats": {"willpower": willpower, "defense": defense, "health": health, "strength": strength, "swiftness": swiftness},
            "resourceCaps": caps,
            "imagePath": image_relative,
            "sourceScanPath": f"images/mystlings/scan_pvp/{SOURCES[source]}",
        }
        if mystling_id == "artios":
            pvp_card["printedResourceCaps"] = [{"maxEach": 1, "icons": ["air", "water", "fire", "earth", "light"]}]
        by_id[mystling_id]["pvpStatCard"] = pvp_card
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Cataloged PvP stat sides for all {len(seen)} Mystlings")


if __name__ == "__main__":
    main()
