"""Crop and catalog the 2026-10-12 Mystling-specific action and bonus cards."""

import json
from pathlib import Path

import cv2
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SCAN_DIR = ROOT / "images/mystlings/mystling_specific/2026-10-12_123543"
CATALOG = ROOT / "data/catalog.json"
SIZE = (768, 1068)

# Ordered to match the scan panels (six action cards, then the ability panel(s)).
# Printed icons are spelled out for search and accessibility.
ACTIONS = {
    61: ("young_iceling", "Young Iceling", "water", "Freeze Lock", [("active", "Deal Weak in range 2. Trigger.")]),
    62: ("young_iceling", "Young Iceling", "water", "Frostbite", [("active", "Attack +1 Strength (Pierce 2). Fire: Attack.")]),
    63: ("young_iceling", "Young Iceling", "water", "Sap Warmth", [("active", "Deal 2 Damage in range 2 (Drain)."), ("upgrade", "+1 Defense.")]),
    64: ("luminesca", "Luminesca", "light", "Bleaching Brightness", [("active", "Discard the top 3 cards from your deck. Deal 3 Damage in range 1 for each neutral card discarded this way. Gain 1 Brightness for each Luminesca-specific card discarded this way.")]),
    65: ("luminesca", "Luminesca", "light", "Flare-up", [("active", "Gain 1 Brightness. Deal Silence in range 2. Attack in range 2 or Attack (Pierce 2).")]),
    66: ("luminesca", "Luminesca", "light", "Scorching Sun", [("active", "Gain 1 Brightness. Deal Slow in range 2. Moon: Gain 1 Brightness."), ("upgrade", "+3 Defense.")]),
    67: ("prowler", "Prowler", "air", "Cat's Spirit", [("active", "Attack. Trigger.")]),
    68: ("prowler", "Prowler", "air", "Owl's Spirit", [("active", "Move. Trigger.")]),
    69: ("prowler", "Prowler", "air", "Tentative Attempt", [("active", "Move -1 Swiftness and Attack -1 Strength (Pierce 2). Leaf: Attack (Pierce 2) and Move.")]),
    70: ("regalian", "Regalian", "fire", "Bucking", [("active", "Deal 4 Damage in any range in line. Move.")]),
    71: ("regalian", "Regalian", "fire", "Grace of a Spark", [("active", "Cleanse all. Move. You may spend 3 Power to Trigger.")]),
    72: ("regalian", "Regalian", "fire", "Skewer", [("active", "Move in line. For each space moved this way, gain +1 Strength this turn. Attack. Air: Attack +2 Strength.")]),
    73: ("shadeclaw", "Shadeclaw", "dark", "Eclipse Recollection", [("active", "Interrupt 2 in range 3. Move.")]),
    74: ("shadeclaw", "Shadeclaw", "dark", "Impending Doom", [("active", "Move. Attack."), ("passive", "When you gain or are dealt any Willpower, you may discard 1 Mirror Image in range 2 to ignore that Willpower.")]),
    75: ("shadeclaw", "Shadeclaw", "dark", "Sprouting Terror", [("active", "You may Blink to a space with a Mirror Image. Attack (Drain)."), ("passive", "When you gain or are dealt any Willpower, you may discard 1 Mirror Image in range 2 to ignore that Willpower.")]),
    76: ("young_shadeclaw", "Young Shadeclaw", "dark", "Power of Flesh", [("active", "Gain up to 4 Willpower. Place 1 Shadow in range 2 for each Willpower gained this way. Light: Interrupt 1 in any range.")]),
    77: ("young_shadeclaw", "Young Shadeclaw", "dark", "Raising Contrast", [("active", "Place 1 Shadow in range 2 or Attack."), ("passive", "When you gain or are dealt any Willpower, you may discard 1 Shadow in range 2 to ignore that Willpower.")]),
    78: ("young_shadeclaw", "Young Shadeclaw", "dark", "Shadow Puppet", [("active", "Place 1 Shadow in range 2 or Move."), ("passive", "When you gain or are dealt any Willpower, you may discard 1 Shadow in range 2 to ignore that Willpower.")]),
    79: ("siren", "Siren", "water", "Draining Tide", [("active", "If you have Resurface, Attack +2 Strength (Pierce 1). Otherwise, move an opponent in any range by up to its Swiftness. Deal 3 Damage to each opponent in a space with a Whirlpool.")]),
    80: ("siren", "Siren", "water", "Revelation", [("active", "If you have Resurface, Blink to any space with a Whirlpool. Otherwise, Attack +2 Strength against an opponent in a space with a Whirlpool or an opponent (regardless of range)."), ("upgrade", "If you have Resurface, +2 Swiftness and -2 Defense.")]),
    81: ("siren", "Siren", "water", "Water Jets", [("active", "If you have Resurface, Move, Attack (Pierce 2), Move. Otherwise, Attack (Drain). Fire: Place 1 Whirlpool in any range."), ("upgrade", "If you do not have Resurface, +2 Strength.")]),
    82: ("umbra", "Umbra", "dark", "Dusk of Life", [("active", "Move. Interrupt 2 in range 1. If you moved at least 6 spaces this turn, gain 1 Miasma."), ("upgrade", "+1 Strength for every 3 cards in your discard pile.")]),
    83: ("umbra", "Umbra", "dark", "Netherworld", [("active", "Attack (Drain). If you dealt at least 6 Damage to the opponent this turn, gain 1 Miasma."), ("upgrade", "+1 Swiftness for every 3 cards in your discard pile.")]),
    84: ("umbra", "Umbra", "dark", "Seething Darkness", [("active", "Slot 1: Discard 1 card. If you discarded at least 3 cards this turn, gain 1 Miasma."), ("upgrade", "+1 Defense for every 3 cards in your discard pile.")]),
    85: ("vogandr", "Vogandr", "water", "Drag Underwater", [("active", "Place 1 Flood in any range in any space not adjacent to a Flood. Attack, +1 Strength for each Flood in the Arena.")]),
    86: ("vogandr", "Vogandr", "water", "Foaming Coils", [("active", "Place 1 Flood in any range in any space not adjacent to a Flood. Deal 4 Damage in range 2, +1 Damage for each Flood in the Arena.")]),
    87: ("vogandr", "Vogandr", "water", "River of Blood", [("active", "Place 1 Flood in any range in any space not adjacent to a Flood. Gain 1 Power for each Flood in the Arena.")]),
    88: ("windraiser", "Windraiser", "air", "Air Escape", [("active", "Blink to a space with a Tornado. Gain 1 Power. Leaf: Attack.")]),
    89: ("windraiser", "Windraiser", "air", "Cyclone", [("active", "Move. Gain 1 Power for each Tornado in range 1."), ("passive", "When you move a Tornado to a space with an opponent, deal them 4 Damage.")]),
    90: ("windraiser", "Windraiser", "air", "Whirlwind", [("active", "Attack (Pierce 2). Move each Tornado by up to 1 space.")]),
}

# source file index, component index (row-major, zero-based)
PANEL_TO_CARD = {
    0: ("vogandr", 85), 1: ("windraiser", 88), 2: ("vogandr", 86), 3: ("windraiser", 89),
    4: ("vogandr", 87), 5: ("windraiser", 90),
    8: ("renewed_golomo", 0), 9: ("renewed_golomo", 0), 10: ("renewed_golomo", 0),
    11: ("renewed_golomo", 0), 12: ("renewed_golomo", 0), 13: ("renewed_golomo", 0),
    17: ("umbra", 82), 18: ("sylphidron", 0), 19: ("umbra", 83),
    20: ("sylphidron", 0), 21: ("umbra", 84), 22: ("sylphidron", 0),
    24: ("regalian", 72), 25: ("luminesca", 64), 26: ("luminesca", 65), 27: ("regalian", 70),
    28: ("luminesca", 66), 29: ("regalian", 71),
    32: ("shadeclaw", 73), 33: ("young_shadeclaw", 76), 34: ("shadeclaw", 74),
    35: ("young_shadeclaw", 77), 36: ("young_shadeclaw", 78), 37: ("shadeclaw", 75),
    40: ("siren", 80), 41: ("prowler", 67), 42: ("prowler", 68), 43: ("siren", 79),
    44: ("siren", 81), 45: ("prowler", 69),
    48: ("young_iceling", 63), 49: ("young_iceling", 62), 50: ("young_iceling", 61),
}

# Ability-panel indices: each record is printed card ID and its bonus actions.
ABILITIES = {
    6: ("windraiser", "175A", [(1, "Airflow", "If there are no Tornados in the Arena, place 3 Tornados in range 1. Otherwise, move each Tornado up to 1 space."), (6, "Twister", "Each opponent gains 3 Damage for each Tornado within range 1 of them.")]),
    7: ("vogandr", "168A", [(4, "Grasping Tide", "Deal Weak within range 1 of a Flood, or discard 1 Flood from the Arena to Move +2 Swiftness."), (7, "Crushing Wave", "If there are 6 Flood in the Arena, deal 15 Damage in range 1. Otherwise, place 1 Flood in range 4.")]),
    14: ("young_iceling", "122A", [(6, "Cold Drain", "Deal 3 Damage (Drain) in range 2.")]),
    15: ("renewed_golomo", "214A", [(3, "Exploding Cone", "Spend 1 Cone to choose a space in range 3. Deal 4 Damage to an opponent in that space and to each other opponent in range 1 of that space."), (6, "Forage", "Gain 2 Cones.")]),
    22: ("sylphidron", "219A", [(6, "Sneak Attack", "Blink 6. Deal 1 Damage in range 1, +1 Damage for each different card in your slots.")]),
    23: ("umbra", "163A", [(1, "Extract Essence", "Discard the top 3 cards from your deck. Place each Umbra-specific card discarded this way on top of your deck in any order."), (10, "Sun Eater", "If you have 4 Miasma, deal 50 Damage in range 4. Otherwise, deal 1 Damage (Pierce 2) in any range.")]),
    30: ("luminesca", "128A", [(1, "Flare-up", "Spend 1 Brightness to deal 2 Damage in any range."), (3, "Prismatic Lens", "Deal 1 Damage in range 4 for each Brightness you have.")]),
    31: ("regalian", "139A", [(6, "Charge", "Move. You can move through but cannot stop in a space with an opponent. If you move through a space with an opponent, deal 4 Damage to that opponent (once per Charge).")]),
    38: ("shadeclaw", "146A", [(1, "Puppeteer", "Move each Mirror Image by up to 2 spaces."), (4, "Smoke and Mirrors", "Place 1 Mirror Image in range 2."), (4, "Reflection", "Deal 1 Damage in range 1 for every 2 neutral cards in your discard pile. Repeat this effect for each Mirror Image within range 1 of the opponent.")]),
    39: ("young_shadeclaw", "152A", [(1, "Gloom Manipulation", "Move each Shadow by up to 2 spaces."), (4, "Vengeful Shadows", "Each Shadow deals 3 Damage in range 1."), (10, "Reconstruction", "Move and Attack. Discard all Shadows from the Arena. For each Shadow discarded this way, Move and Attack.")]),
    46: ("siren", "158A", [(1, "Enviro Change", "If you have Resurface, discard it. Otherwise, gain Resurface."), (2, "Stir Waters", "Place 1 Whirlpool in range 2."), (3, "Drag Down", "Deal 4 Damage and Slow in any range to an opponent in a space with a Whirlpool. Discard that Whirlpool.")]),
    47: ("prowler", "133A", [(3, "Flee", "Blink 4.")]),
}


def detected_panels(path: Path):
    image = cv2.imread(str(path))
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    count, _labels, stats, _centroids = cv2.connectedComponentsWithStats((gray < 240).astype("uint8"), 8)
    boxes = [(int(x), int(y), int(x + w), int(y + h)) for x, y, w, h, area in stats[1:count]
             if w > 700 and h > 400 and area > 500_000]
    return sorted(boxes, key=lambda box: (box[1], box[0]))


def main():
    scans = sorted(SCAN_DIR.glob("*.jpg"))
    panels = []
    for scan_path in scans:
        boxes = detected_panels(scan_path)
        with Image.open(scan_path) as opened:
            scan = opened.copy()
            for box in boxes:
                panels.append((scan, box))
    if len(panels) != 51:
        raise ValueError(f"Expected 51 scanned panels, found {len(panels)}")

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    mystlings = {item["id"]: item for item in catalog["mystlings"]}
    cards = {item["id"]: item for item in catalog["cards"]}
    for index, (mystling_id, number) in PANEL_TO_CARD.items():
        if number == 0:
            # Three unique Sylphidron cards and three unique Renewed Golomo cards.
            continue
        if number not in ACTIONS:
            continue
        owner, name, element, title, effects = ACTIONS[number]
        if owner != mystling_id:
            raise ValueError(f"Panel mapping mismatch at {index + 1}")
        card_id = f"DE-CB-M{number}/125" if number == 79 else f"DE-CB-M{number}/90"
        entry = cards.get(card_id, {"id": card_id, "type": "action", "rarity": "mystling_specific", "source": "mystling", "copiesInBaseGame": 2, "keywords": []})
        entry.update({"name": title, "element": element, "mystlingId": owner,
                      "effects": [{"type": kind, "text": text} for kind, text in effects],
                      "imagePath": f"images/mystlings/{owner}/cards/{card_id.replace('/', '-')}.png"})
        cards[card_id] = entry
        scan, box = panels[index]
        out = scan.crop(box).transpose(Image.Transpose.ROTATE_270).resize(SIZE, Image.Resampling.LANCZOS)
        out_path = ROOT / entry["imagePath"]
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out.save(out_path, optimize=True)

    ps_cards = {
        16: ("Sly Escape", [("active", "Move, +1 Swiftness for each Cone you have.") , ("upgrade", "+1 Defense and +1 Damage for each Cone you have.")]),
        17: ("Taunting Juggler", [("active", "Choose one: Gain 2 Power; or spend 1 Cone to deal 6 Damage in range 1.")]),
        18: ("Trip", [("active", "Attack, +2 Strength for each Cone you have. Water: Gain 1 Cone."), ("upgrade", "+1 Defense and +1 Damage for each Cone you have.")]),
        19: ("Ethereal", [("active", "Gain 3 Power."), ("passive", "Each time you gain any Willpower, reduce it to 1.")]),
        20: ("Phantasmal Claw", [("active", "Attack. Leaf: Attack (Pierce 2)."), ("passive", "Each time you gain any Willpower, reduce it to 1.")]),
        21: ("Spectral Wings", [("active", "Blink 4. Deal Weak and Silence in range 2. Attack (Pierce 2).")]),
    }
    ps_map = {8: (16, "renewed_golomo"), 10: (17, "renewed_golomo"), 11: (18, "renewed_golomo"),
              16: (19, "sylphidron"), 18: (20, "sylphidron"), 20: (21, "sylphidron")}
    # Only one image per distinct printed card; the scans contain duplicate physical copies.
    for index, (number, owner) in ps_map.items():
        title, effects = ps_cards[number]
        card_id = f"DE-PS-M{number}/21"
        entry = {"id": card_id, "type": "action", "name": title, "element": mystlings[owner]["mainElement"],
                 "rarity": "mystling_specific", "source": "mystling", "mystlingId": owner,
                 "copiesInBaseGame": 2, "effects": [{"type": kind, "text": text} for kind, text in effects],
                 "imagePath": f"images/mystlings/{owner}/cards/DE-PS-M{number}-21.png", "keywords": []}
        cards[card_id] = entry
        scan, box = panels[index]
        out = scan.crop(box).transpose(Image.Transpose.ROTATE_270).resize(SIZE, Image.Resampling.LANCZOS)
        out_path = ROOT / entry["imagePath"]
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out.save(out_path, optimize=True)

    for index, (owner, card_id, actions) in ABILITIES.items():
        image_path = f"images/mystlings/{owner}/cards/ability_{card_id}.png"
        mystlings[owner]["specialAbility"] = {
            "cardId": card_id,
            "bonusActions": [{"name": name, "powerCost": cost, "effect": text} for cost, name, text in actions],
            "imagePath": image_path,
        }
        scan, box = panels[index]
        out = scan.crop(box).transpose(Image.Transpose.ROTATE_270).resize(SIZE, Image.Resampling.LANCZOS)
        out_path = ROOT / image_path
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out.save(out_path, optimize=True)

    catalog["cards"] = sorted(cards.values(), key=lambda card: (card["id"].split("-")[1], card["id"]))
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported 30 standard actions, 6 PS actions, and {len(ABILITIES)} special ability cards.")


if __name__ == "__main__":
    main()
