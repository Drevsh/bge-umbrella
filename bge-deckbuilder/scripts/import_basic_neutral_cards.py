"""Crop and catalog the scanned Neutral Starting cards (DE-CB-11–40)."""

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCAN_DIR = ROOT / "images/basic/2026-10-12_120504"
CARD_DIR = ROOT / "images/basic/cards"
CATALOG = ROOT / "data/catalog.json"
SIZE = (768, 1068)

# Scan order is row-major by page and then left-to-right. Card IDs were read
# from the printed footer; the A/B marker is printed at the upper-right corner.
SCANS = [
    (
        "2026-10-12_120130.jpg",
        [(136, 69, 1196, 838), (1399, 78, 2455, 840), (157, 959, 1210, 1711),
         (1401, 1030, 2452, 1791), (145, 1858, 1193, 2609), (1423, 1910, 2456, 2671),
         (144, 2698, 1196, 3458)],
        [35, 29, 34, 39, 40, 27, 32],
        ["B"] * 7,
    ),
    (
        "2026-10-12_120233 (2).jpg",
        [(1435, 22, 2456, 756), (199, 48, 1260, 814), (1448, 891, 2456, 1653),
         (200, 935, 1260, 1699), (190, 1790, 1243, 2548), (1412, 1826, 2456, 2588),
         (185, 2670, 1241, 3433)],
        [21, 25, 15, 11, 12, 18, 13],
        ["A"] * 7,
    ),
    (
        "Document_2026-10-12_120008.jpg",
        [(172, 22, 1219, 757), (1440, 22, 2456, 778), (163, 864, 1210, 1617),
         (1452, 910, 2456, 1664), (156, 1712, 1202, 2459), (1454, 1790, 2456, 2549),
         (135, 2577, 1187, 3332), (1443, 2725, 2456, 3479)],
        [33, 37, 38, 30, 26, 36, 31, 28],
        ["B"] * 8,
    ),
    (
        "Document_2026-10-12_120350 (2).jpg",
        [(127, 62, 1185, 829), (1419, 80, 2456, 839), (118, 910, 1170, 1669),
         (1424, 909, 2456, 1668), (96, 1767, 1147, 2515), (1427, 1754, 2456, 2507),
         (91, 2650, 1146, 3406), (1416, 2614, 2456, 3375)],
        [22, 23, 24, 14, 17, 19, 20, 16],
        ["A"] * 8,
    ),
]

# Each record stores the exact title and a readable transcription of printed
# rules. Icon names are written out for search and accessibility.
CARD_TEXT = {
    11: ("According to Plan", [("active", "Move. Slot 3: Attack.")]),
    12: ("Bite Back", [("active", "Move. If you are in a Moon space, Attack.")]),
    13: ("Blind Fury", [("active", "Attack. You may gain 4 Willpower to Attack again.")]),
    14: ("Channeling", [("active", "Gain 1 Power. Slot 3: Gain an additional 2 Power.")]),
    15: ("Dash", [("active", "Move +2 Swiftness. You may spend 2 Power to Move +2 Swiftness again.")]),
    16: ("Defensive Position", [("active", "You may discard another card."), ("upgrade", "+2 Defense, -1 Strength.")]),
    17: ("Deliberate Strike", [("active", "Attack. Attack again if you have at least 8 cards in your discard pile.")]),
    18: ("Heavy Strike", [("active", "Attack. Move an opponent in range 1 by up to 2 spaces.")]),
    19: ("Honed to Perfection", [("active", "Move."), ("upgrade", "Bonus Action: Spend 1 Power to Sharpen — your Attacks this turn have +1 Strength.")]),
    20: ("Push", [("active", "Move an opponent in range 3 by up to 2 spaces away from you (each space must be farther from you than the previous one). You may spend 2 Power to Trigger.")]),
    21: ("Reach", [("active", "Gain 1 Power."), ("passive", "Your Attacks have +1 range.")]),
    22: ("Regeneration", [("active", "Slot 3: Move +1 Swiftness. You and your ally in range 1 Heal 2.")]),
    23: ("Smart Approach", [("active", "Move. Place 1 card from your discard pile on the top of your deck.")]),
    24: ("Strike", [("active", "Attack. Gain 1 Power.")]),
    25: ("Swiftness", [("active", "Move. Move.")]),
    26: ("Defensive Stance", [("active", "Gain 1 Power."), ("upgrade", "+2 Defense, +2 Damage.")]),
    27: ("Disperse", [("active", "Gain 1 Power."), ("passive", "Whenever an opponent deals you Damage, reduce it by 1 for each space between you and that opponent.")]),
    28: ("Double Strike", [("active", "Attack. You may spend 3 Power to Attack again.")]),
    29: ("Energetic Infusion", [("active", "Slot 1: Gain 3 Power. Slot 2 or 3: Gain 2 Power. Slot 4: Gain 1 Power.")]),
    30: ("Energy Flow", [("active", "Gain 1 Power from all slots to the left of this card.")]),
    31: ("Energy Geyser", [("active", "Discard 4 Power."), ("passive", "All your Action card effects that deal Damage deal an additional 2 Damage (once per Action card).")]),
    32: ("Full Focus", [("active", "Move."), ("upgrade", "+1 Swiftness, +1 Defense, +1 Damage.")]),
    33: ("Grapple", [("active", "Move an opponent in range 3 by up to 2 spaces toward you (each space must be closer to you than the previous one). You may spend 2 Power to Trigger.")]),
    34: ("Haste", [("active", "Move. +2 Swiftness.")]),
    35: ("Hunch", [("active", "Move. Trigger one chosen card to the left of this card.")]),
    36: ("Inertia", [("active", "Choose one: Move +2 Swiftness and Attack -2 Strength; or Attack +2 Strength and Move -2 Swiftness.")]),
    37: ("Projectile", [("active", "Deal 4 Damage in any range in line.")]),
    38: ("Quick Learner", [("active", "Gain 1 Power."), ("passive", "Your Special abilities cost 2 less (to a minimum of 1).")]),
    39: ("Spectral Blast", [("active", "Deal 3 Damage in range 3.")]),
    40: ("Sundering Roar", [("active", "Gain 2 Damage. Gain 2 Power. Discard 2 cards. Interrupt 2 in any range. (Damage you gain is reduced by your Defense.)")]),
}


def main() -> None:
    CARD_DIR.mkdir(parents=True, exist_ok=True)
    seen: dict[int, str] = {}
    for filename, boxes, numbers, decks in SCANS:
        if not (len(boxes) == len(numbers) == len(decks)):
            raise ValueError(f"Incomplete crop map for {filename}")
        scan_path = SCAN_DIR / filename
        with Image.open(scan_path) as scan:
            if scan.size != (2480, 3504):
                raise ValueError(f"Unexpected scan size: {scan_path}: {scan.size}")
            for box, number, _deck in zip(boxes, numbers, decks):
                if number in seen:
                    raise ValueError(f"Duplicate printed card ID: {number}")
                seen[number] = filename
                card = scan.crop(box).transpose(Image.Transpose.ROTATE_270)
                card = card.resize(SIZE, Image.Resampling.LANCZOS)
                card.save(CARD_DIR / f"DE-CB-{number}-125.png", optimize=True)

    if set(seen) != set(range(11, 41)):
        raise ValueError(f"Expected IDs 11–40; found {sorted(seen)}")

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    existing = {card["id"]: card for card in catalog["cards"]}
    for filename, _boxes, numbers, decks in SCANS:
        for number, starting_deck in zip(numbers, decks):
            name, effects = CARD_TEXT[number]
            card_id = f"DE-CB-{number}/125"
            entry = existing.get(card_id)
            if entry is None:
                entry = {
                    "id": card_id,
                    "type": "action",
                    "name": name,
                    "element": None,
                    "rarity": "common",
                    "source": "starting",
                    "mystlingId": None,
                    "copiesInBaseGame": 2,
                    "effects": [dict(type=kind, text=text) for kind, text in effects],
                    "imagePath": None,
                    "keywords": [],
                }
                catalog["cards"].append(entry)
                existing[card_id] = entry
            entry["name"] = name
            entry["element"] = None
            entry["source"] = "starting"
            entry["copiesInBaseGame"] = 2
            entry["effects"] = [dict(type=kind, text=text) for kind, text in effects]
            entry["imagePath"] = f"images/basic/cards/DE-CB-{number}-125.png"
            entry["startingDeck"] = starting_deck

    catalog["cards"].sort(
        key=lambda card: (
            0 if card["id"].startswith("DE-CB-") and card["id"].split("-")[2][0].isdigit() else 1,
            int(card["id"].split("-")[2].split("/")[0])
            if card["id"].startswith("DE-CB-") and card["id"].split("-")[2][0].isdigit()
            else card["id"],
        )
    )
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(seen)} Neutral Starting cards, including existing Strike image")


if __name__ == "__main__":
    main()
