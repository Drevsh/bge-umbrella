"""Import the unique Mystling action and special ability cards in the 2026-10-12 scan."""

import json
from pathlib import Path

import cv2
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SCAN_DIR = ROOT / "images/mystlings/mystling_specific/2026-10-12_211549"
CATALOG = ROOT / "data/catalog.json"
SIZE = (768, 1068)

# Panel index -> (printed number, Mystling owner, printed card title)
CARDS = {
    0:(6,"young_alukah","Shadow Wings"), 1:(5,"young_alukah","Flight"), 2:(4,"young_alukah","Conditional Courage"),
    4:(28,"elkthorn","Barkskin"), 5:(39,"firple","Wave Thrust"), 6:(29,"elkthorn","Gore"),
    7:(38,"firple","Reinvigorating Splash"), 8:(30,"elkthorn","Rampage"), 9:(37,"firple","Plunge"),
    12:(57,"golomo","Stone Roll"), 13:(42,"renewed_firple","Resurgence"), 14:(56,"golomo","Soil Feed"),
    15:(41,"renewed_firple","Hydro Lance"), 16:(55,"golomo","Earth Shield"), 17:(40,"renewed_firple","Drenching Charge"),
    20:(12,"flitterspark","Swoop","PS"), 21:(49,"young_gaiadon","Seedling"), 22:(10,"flitterspark","Flitter","PS"),
    23:(50,"young_gaiadon","Sheltering Hollow"), 24:(11,"flitterspark","Spark","PS"), 25:(51,"young_gaiadon","Teeth and Vines"),
    28:(22,"darktailen","Bloodlust"), 29:(32,"emberling","Shared Experience"), 30:(33,"emberling","Torrid Claws"),
    31:(23,"darktailen","Draw Blood"), 32:(24,"darktailen","Hemomagnetism"), 33:(31,"emberling","Burning Fangs"),
    36:(43,"furwing","Majestic Flight"), 37:(46,"gaiadon","Ancient Roots"), 38:(45,"furwing","Thick Bristle"),
    39:(47,"gaiadon","Branching Knowledge"), 40:(44,"furwing","Maul"), 41:(48,"gaiadon","Hungry Roots"),
    44:(34,"young_emberling","Flame Burst"), 45:(1,"drosithia","Homing Quills","PS"),
    46:(35,"young_emberling","Flaming Bite"), 47:(3,"drosithia","Power of Rebirth","PS"),
    48:(36,"young_emberling","Lava Lash"), 49:(2,"drosithia","Permafrost","PS"),
    52:(52,"glarexus","Bouncing Strike"), 53:(13,"frogmar","Burning Hope","PS"),
    54:(53,"glarexus","Shell Bash"), 55:(14,"frogmar","Magma Explosion","PS"),
    56:(54,"glarexus","Solid Light"), 57:(15,"frogmar","Rain of Fire","PS"),
    60:(8,"fale","Riptide","PS"), 61:(4,"eftus","Bait","PS"), 62:(6,"eftus","Whirling Rod","PS"),
    63:(7,"fale","Aqua Bite","PS"), 64:(5,"eftus","Vortex","PS"), 65:(9,"fale","Sea Embrace","PS"),
    68:(3,"alukah","Piercing Claws"), 69:(19,"chrysomallon","Lava Trail"), 70:(2,"alukah","Intimidation"),
    71:(20,"chrysomallon","Smoldering Grasp"), 72:(21,"chrysomallon","Tectonic Stress"), 73:(1,"alukah","Crescent Midnight"),
    76:(14,"bolb","Debilitating Pollen"), 77:(18,"young_bolb","Tricky Morass"), 78:(16,"young_bolb","Absence of Mind"),
    79:(13,"bolb","Butterfly Dance"), 80:(17,"young_bolb","Mud Toss"), 81:(15,"bolb","Swarm of Butterflies"),
}

# Panel index -> (owner, printed special ability card ID)
ABILITIES = {
    3:("young_alukah","10A"), 10:("firple","72A"), 11:("elkthorn","55A"),
    18:("golomo","111A"), 19:("renewed_firple","82A"), 26:("flitterspark","204A"),
    27:("young_gaiadon","100A"), 34:("darktailen","44A"), 35:("emberling","61A"),
    42:("furwing","87A"), 43:("gaiadon","95A"), 50:("young_emberling","66A"),
    51:("drosithia","189A"), 58:("glarexus","106A"), 59:("frogmar","209A"),
    66:("eftus","194A"), 67:("fale","199A"), 74:("chrysomallon","39A"),
    75:("alukah","5A"), 82:("young_bolb","33A"), 83:("bolb","28A"),
}

# Card text is also recorded in the catalog so bonus actions remain searchable.
ABILITY_ACTIONS = {
    "10A": [(3,"Hunt","Discard the top card of your deck. If it is a neutral card, Blink to a space within range 1 of the opponent and Attack (Pierce 3). Otherwise, Move.")],
    "72A": [(1,"Splash","Your Attacks have (Pierce 3) this turn."),(4,"Water Drain","In any range, Interrupt 1 for each Puddle within range 2 of the chosen opponent. For each card discarded this way, the opponent gains 1 Damage.")],
    "55A": [(4,"Enrage","Gain Rage."),(8,"Restlessness","If you have Rage, Move and Attack +2 Strength. Otherwise, Trigger.")],
    "111A": [(2,"Tromp","Place 1 Quake in range 2."),(8,"Tremors","Each opponent gains 2 Damage for each Quake within range 2 of them.")],
    "82A": [(1,"Drench","Renewed Firple has +1 Swiftness this turn for each Puddle within range 1 of the opponent it Attacks."),(3,"Rain Song","Place 1 Puddle in range 2.")],
    "204A": [(2,"Blow on Embers","Deal 1 Damage in range 2 for each Burn on this opponent.")],
    "100A": [(4,"Nibble","Attack (Pierce 2)."),(6,"Leaves Storm","Discard all cards. Draw 4 cards. Deal 2 Damage in range 2 for each Earth card you drew this way.")],
    "44A": [(1,"Taste Thorn","Spend any number of Thorns. Your next Attack this turn has +1 Strength for each Thorn spent."),(4,"Slashing Tail","Gain 1 Thorn. Interrupt 2 in any range.")],
    "61A": [(1,"Duo","Move Sibling by 1 space. If Sibling is not in the Arena, place the Sibling in range 1. Sibling cannot be dealt Damage. Mystlings cannot move to or be placed in a space with Sibling."),(2,"Sincere Effort","Deal 1 Burn in range 1 of Sibling."),(8,"Fire Breath","Deal 8 Damage in range 3.")],
    "87A": [(6,"Reckless Abandon","Attack. Attack. Gain 4 Damage.")],
    "95A": [(4,"Spirit Sapling","Place Spiritbound Tree in range 2."),(8,"Storm of Leaves","Deal 4 Damage in range 1, 3 Damage in range 2, and 2 Damage in range 3 of each Spiritbound Tree.")],
    "66A": [(8,"Firenova","Deal 6 Damage in range 3.")],
    "189A": [(7,"Egg of Rebirth","Place 1 Egg in range 3.")],
    "106A": [(7,"Reflect","Cleanse 2. Deal 4 Damage in any range.")],
    "209A": [(3,"Boiling Depths","Place 1 Crater in range 1."),(4,"Eruption","Each opponent gains 2 Damage and 1 Burn for each Crater within range 2 of them.")],
    "194A": [(1,"Lucky Stumble","Move. Attack in range 2."),(3,"Spurt","Spend up to 3 Water. If you spent 1, deal 4 Damage in range 3. If you spent 2, deal 6 Damage and Weak in range 3. If you spent 3, deal 8 Damage and Weak in range 3. Move the opponent in range 3 by up to 2 spaces.")],
    "199A": [(6,"Lockjaw","Attack; this attack has +2 Strength for every 10 Damage on Fale.")],
    "39A": [(4,"Burn to the Ground","Deal 1 Burn in range 2 for each space you moved during this turn.")],
    "5A": [(3,"Steal Breath","Deal Silence in range 3.")],
    "33A": [(3,"Drying Mud","Deal Slow in range 2."),(6,"Prophetic Swiftness","Blink to a space within range 1 of an opponent with Slow. Attack.")],
    "28A": [(1,"Flutter","Move 1 Butterfly in any range by 1 space."),(3,"Summon the Rabble","Place 1 Butterfly in range 2.")],
}


def collect_panels():
    panels = []
    for path in sorted(SCAN_DIR.glob("*.jpg")):
        image = cv2.imread(str(path))
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        count, _labels, stats, _centroids = cv2.connectedComponentsWithStats((gray < 240).astype("uint8"), 8)
        boxes = sorted(
            [(int(x), int(y), int(x + w), int(y + h)) for x, y, w, h, area in stats[1:count]
             if w > 700 and h > 400 and area > 500_000],
            key=lambda box: (box[1], box[0]),
        )
        scan = Image.open(path).convert("RGB")
        panels.extend((scan, box) for box in boxes)
    return panels


def save_panel(panels, index, relative_path):
    target = ROOT / relative_path
    if target.is_file():
        return
    scan, box = panels[index]
    crop = scan.crop(box).transpose(Image.Transpose.ROTATE_270).resize(SIZE, Image.Resampling.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    crop.save(target, optimize=True)


def main():
    panels = collect_panels()
    if len(panels) != 84:
        raise ValueError(f"Expected 84 scanned panels, found {len(panels)}")
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    mystlings = {m["id"]: m for m in catalog["mystlings"]}
    cards = {card["id"]: card for card in catalog["cards"]}

    added = 0
    for index, data in CARDS.items():
        number, owner, title, *kind = data
        specific = bool(kind and kind[0] == "PS")
        prefix = "DE-PS" if specific else "DE-CB"
        denominator = "21" if specific else "90"
        card_id = f"{prefix}-M{number}/{denominator}"
        relative = f"images/mystlings/{owner}/cards/{card_id.replace('/', '-')}.png"
        entry = cards.get(card_id, {})
        entry.update({
            "id": card_id,
            "type": "action",
            "name": title,
            "element": mystlings[owner]["mainElement"],
            "rarity": "mystling_specific",
            "source": "mystling",
            "mystlingId": owner,
            "copiesInBaseGame": 2,
            "effects": entry.get("effects", []),
            "imagePath": relative,
            "keywords": entry.get("keywords", []),
            "sourceScanPath": str(SCAN_DIR.relative_to(ROOT)).replace("\\", "/"),
        })
        cards[card_id] = entry
        save_panel(panels, index, relative)
        added += 1

    for index, (owner, card_id) in ABILITIES.items():
        relative = f"images/mystlings/{owner}/cards/ability_{card_id}.png"
        mystlings[owner]["specialAbility"] = {
            "cardId": card_id,
            "bonusActions": [
                {"name": name, "powerCost": cost, "effect": text}
                for cost, name, text in ABILITY_ACTIONS[card_id]
            ],
            "imagePath": relative,
            "sourceScanPath": str(SCAN_DIR.relative_to(ROOT)).replace("\\", "/"),
        }
        save_panel(panels, index, relative)

    catalog["cards"] = sorted(cards.values(), key=lambda card: (card["id"].split("-")[1], card["id"]))
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported/updated {added} Mystling action card images and {len(ABILITIES)} special ability card images.")


if __name__ == "__main__":
    main()
