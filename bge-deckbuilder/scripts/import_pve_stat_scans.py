"""Crop and catalog the 27 PvE Mystling stat cards in scan_pve.

Run from the repository root: py -3 scripts/import_pve_stat_scans.py
The crop coordinates are in source-image pixels, before clockwise rotation.
"""

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SCANS = ROOT / "images" / "mystlings" / "scan_pve"
CATALOG = ROOT / "data" / "catalog.json"

SOURCES = {
    "a": "Document_2026-10-11_182713 (3).jpg",
    "b": "Document_2026-10-11_182534 (2).jpg",
    "c": "Document_2026-10-11_182351.jpg",
    "d": "2026-10-11_182925.jpg",
}

# key, grid position (row, column), id, name, main element, subtype limits,
# willpower, defense, health, strength, swiftness, resource caps.
CARDS = [
    ("a", 0, 0, "205A", "Frogmar", "fire", {}, 0, 2, 32, 4, 1, {"fire_icon": 5}),
    ("a", 0, 1, "190A", "Eftus", "water", {"dark": 1}, 2, 0, 24, 2, 2, {"water_icon": 3}),
    ("a", 1, 0, "200A", "Flitterspark", "fire", {"air": 2}, 1, 0, 28, 2, 3, {}),
    ("a", 1, 1, "183A", "Drosithia", "water", {"light": 1}, 1, 2, 20, 1, 2, {"water_icon": 1}),
    ("a", 2, 0, "195A", "Fale", "water", {}, 0, 1, 31, 5, 2, {}),
    ("a", 2, 1, "40A", "Darktailen", "dark", {}, 0, 0, 30, 3, 3, {"dark_icon": 4}),
    ("a", 3, 0, "57A", "Emberling", "fire", {}, 0, 0, 30, 5, 2, {}),
    ("a", 3, 1, "29A", "Young Bolb", "earth", {"water": 2}, 0, 1, 35, 2, 1, {}),
    ("b", 0, 0, "141A", "Shadeclaw", "dark", {}, 1, 0, 18, 6, 3, {"dark_icon": 2}),
    ("b", 0, 1, "107A", "Golomo", "earth", {}, 0, 0, 24, 2, 1, {"earth_icon": 5}),
    ("b", 1, 0, "135A", "Regalian", "fire", {}, 0, 0, 20, 2, 5, {}),
    ("b", 1, 1, "102A", "Glarexus", "light", {}, 1, 2, 26, 3, 1, {}),
    ("b", 2, 0, "129A", "Prowler", "air", {}, 0, 0, 12, 4, 4, {}),
    ("b", 2, 1, "89A", "Gaiadon", "earth", {}, 1, 0, 35, 4, 2, {"earth_icon": 1}),
    ("b", 3, 0, "210A", "Renewed Golomo", "earth", {}, 0, 0, 34, 2, 2, {"earth_icon": 3}),
    ("b", 3, 1, "83A", "Furwing", "air", {}, 0, 2, 25, 4, 1, {}),
    ("c", 0, 0, "1A", "Alukah", "air", {"dark": 2}, 0, 0, 40, 4, 1, {}),
    ("c", 0, 1, "164A", "Vogandr", "water", {"dark": 2}, 0, 1, 36, 3, 1, {"water_icon": 5}),
    ("c", 1, 0, "18A", "Blazereef", "fire", {"water": 4}, 0, 1, 30, 4, 2, {}),
    ("c", 1, 1, "159A", "Umbra", "dark", {}, 1, 2, 35, 3, 2, {"dark_icon": 4}),
    ("c", 2, 0, "78A", "Renewed Firple", "water", {}, 0, 1, 35, 5, 1, {"water_icon": 5}),
    ("c", 2, 1, "215A", "Sylphidron", "air", {}, 0, 0, 33, 3, 1, {}),
    ("c", 3, 0, "124A", "Luminesca", "light", {}, 0, 2, 30, 3, 2, {"light_icon": 5}),
    ("c", 3, 1, "154A", "Siren", "water", {"air": 4}, 0, 2, 25, 3, 2, {"water_icon": 5, "air_icon": 1}),
    ("d", 0, 0, "24A", "Bolb", "earth", {"air": 3}, 0, 1, 30, 4, 3, {"earth_icon": 5}),
    ("d", 1, 0, "12A", "Artios", "light", {"fire": 1, "water": 1, "earth": 1, "air": 1}, 1, 0, 25, 3, 3, {}),
    ("d", 2, 0, "6A", "Young Alukah", "air", {}, 0, 1, 17, 3, 2, {}),
]

# The three full sheets use the same two-column, four-row layout.
GRID = {
    "a": [((130, 1360), (70, 930, 1790, 2640)), ((1150, 2400), (850, 1710, 2570, 3440))],
    "b": [((105, 1360), (55, 950, 1810, 2670)), ((1180, 2420), (840, 1740, 2600, 3480))],
    "c": [((95, 1430), (115, 980, 1810, 2700)), ((1170, 2475), (900, 1770, 2630, 3500))],
}


def crop_box(source: str, row: int, column: int) -> tuple[int, int, int, int]:
    if source == "d":
        return [(235, 235, 1280, 1000), (235, 1300, 1280, 2070), (195, 2300, 1260, 3080)][row]
    (left, right_start), tops = GRID[source][0]
    (left_end, right_end), bottoms = GRID[source][1]
    x1, x2 = (left, left_end) if column == 0 else (right_start, right_end)
    return (x1, tops[row], x2, bottoms[row])


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    by_id = {mystling["id"]: mystling for mystling in catalog["mystlings"]}
    for source, row, column, card_id, name, element, limits, willpower, defense, health, strength, swiftness, caps in CARDS:
        mystling_id = name.lower().replace(" ", "_")
        image_relative = f"images/mystlings/{mystling_id}/cards/stat_{card_id}.jpg"
        (ROOT / image_relative).parent.mkdir(parents=True, exist_ok=True)
        with Image.open(SCANS / SOURCES[source]) as scan:
            if scan.size != (2480, 3504):
                raise ValueError(f"Unexpected dimensions in {SOURCES[source]}: {scan.size}")
            scan.crop(crop_box(source, row, column)).transpose(Image.Transpose.ROTATE_270).save(
                ROOT / image_relative, quality=95, subsampling=0, optimize=True
            )
        record = by_id.get(mystling_id, {"id": mystling_id, "name": name})
        if record.get("statCardId") not in (None, card_id):
            raise ValueError(f"Conflicting stat card for {name}: {record['statCardId']}")
        record.update({
            "statCardId": card_id,
            "mainElement": element,
            "stats": {"willpower": willpower, "defense": defense, "health": health, "strength": strength, "swiftness": swiftness},
            "resourceCaps": caps,
            "statCardImagePath": image_relative,
            "sourceScanPath": f"images/mystlings/scan_pve/{SOURCES[source]}",
        })
        if len(limits) == 1:
            subtype_element, limit = next(iter(limits.items()))
            record["subtype"] = {"element": subtype_element, "maxCards": limit}
        elif len(limits) > 1:
            record["subtype"] = None
            record["subtypes"] = [{"element": subtype_element, "maxCards": limit} for subtype_element, limit in limits.items()]
        else:
            record["subtype"] = None
        if name == "Artios":
            record["printedResourceCaps"] = [
                {"maxEach": 3, "icons": ["air", "fire", "water"]},
                {"maxEach": 1, "icons": ["air", "water", "fire", "earth", "light"]},
            ]
        by_id[mystling_id] = record
    catalog["mystlings"] = sorted(by_id.values(), key=lambda item: item["name"].lower())
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Cataloged {len(CARDS)} PvE stat cards; {len(catalog['mystlings'])} Mystlings total")


if __name__ == "__main__":
    main()
