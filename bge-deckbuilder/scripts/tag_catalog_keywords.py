"""Extract and tag keywords for all cards in data/catalog.json."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "catalog.json"

CATEGORIES = {
    "Combat Actions": [
        "Attack",
        "Move",
        "Blink",
        "Pierce",
        "Trigger",
        "Interrupt",
        "Drain",
        "Resolve",
    ],
    "Status & Conditions": [
        "Slow",
        "Weak",
        "Burn",
        "Silence",
        "Cleanse",
        "Heal",
        "Defense",
    ],
    "Economy & Flow": [
        "Power Ramp",
        "Draw",
        "Discard",
        "Search",
        "Remove from Play",
        "Slot Synergies",
    ],
    "Effect Frames": [
        "Active",
        "Passive",
        "Upgrade",
    ],
    "Elemental Advantages": [
        "Against Air",
        "Against Dark",
        "Against Earth",
        "Against Fire",
        "Against Light",
        "Against Water",
    ],
    "Strategy & Archetypes": [
        "Mobility",
        "Burst Damage",
        "Tank & Sustain",
        "Crowd Control",
        "Card Advantage",
    ],
}


def extract_keywords_for_card(card: dict) -> list[str]:
    keywords = set()
    effects = card.get("effects", [])
    all_text = " ".join(e.get("text", "") for e in effects)

    # 1. Combat Actions
    for action in ["Attack", "Move", "Blink", "Pierce", "Trigger", "Interrupt", "Drain", "Resolve"]:
        if re.search(rf"\b{action}\b", all_text, re.IGNORECASE):
            keywords.add(action)

    # 2. Status & Conditions
    for status in ["Slow", "Weak", "Burn", "Silence", "Cleanse"]:
        if re.search(rf"\b{status}\b", all_text, re.IGNORECASE):
            keywords.add(status)
    if re.search(r"\bHeal\b|\bHealed\b", all_text, re.IGNORECASE):
        keywords.add("Heal")
    if re.search(r"\bDefense\b", all_text, re.IGNORECASE):
        keywords.add("Defense")

    # 3. Economy & Flow
    if re.search(r"\bGain \d+ Power\b|\bSpend \d+ Power\b|\bPower to Trigger\b", all_text, re.IGNORECASE):
        keywords.add("Power Ramp")
    if re.search(r"\bDraw\b", all_text, re.IGNORECASE):
        keywords.add("Draw")
    if re.search(r"\bDiscard\b", all_text, re.IGNORECASE):
        keywords.add("Discard")
    if re.search(r"\bSearch\b", all_text, re.IGNORECASE):
        keywords.add("Search")
    if re.search(r"\bRemove [^\.]*from play\b", all_text, re.IGNORECASE):
        keywords.add("Remove from Play")
    if re.search(r"\bslot\b|\bslots\b", all_text, re.IGNORECASE):
        keywords.add("Slot Synergies")

    # 4. Effect Frames
    for e in effects:
        etype = e.get("type", "").capitalize()
        if etype in ["Active", "Passive", "Upgrade"]:
            keywords.add(etype)

    # 5. Elemental Advantages
    for elem in ["Air", "Dark", "Earth", "Fire", "Light", "Water"]:
        tag = f"Against {elem}"
        if tag.lower() in all_text.lower():
            keywords.add(tag)

    # 6. Strategy & Archetypes
    if "Move" in keywords or "Blink" in keywords or re.search(r"\bSwiftness\b", all_text, re.IGNORECASE):
        keywords.add("Mobility")

    # Burst Damage: deals >= 4 damage or high damage numbers
    damage_matches = re.findall(r"(?:Deal|Attack)\s*\(?.*?(\d+)\s*Damage", all_text, re.IGNORECASE)
    damage_values = [int(d) for d in damage_matches] if damage_matches else []
    deal_matches = re.findall(r"Deal\s+(\d+)\s+Damage", all_text, re.IGNORECASE)
    damage_values.extend(int(d) for d in deal_matches)
    if any(v >= 4 for v in damage_values) or len(damage_values) >= 2 or "Galeforce Gambit" in card.get("name", ""):
        keywords.add("Burst Damage")

    # Tank & Sustain: Defense, Heal, Cleanse, or damage reduction
    if "Defense" in keywords or "Heal" in keywords or "Cleanse" in keywords or "reduce it to" in all_text.lower():
        keywords.add("Tank & Sustain")

    # Crowd Control: Slow, Weak, Silence, forced opponent movement
    if "Slow" in keywords or "Weak" in keywords or "Silence" in keywords or re.search(r"Move (?:an|the) opponent", all_text, re.IGNORECASE):
        keywords.add("Crowd Control")

    # Card Advantage: Draw, top-deck reveal, search/deck manipulation
    if "Draw" in keywords or re.search(r"\blook at the topmost card\b|\bReveal the top\b|\bSearch your deck\b", all_text, re.IGNORECASE):
        keywords.add("Card Advantage")

    # Sort keywords deterministically following category order
    all_ordered = []
    for cat_list in CATEGORIES.values():
        for kw in cat_list:
            if kw in keywords and kw not in all_ordered:
                all_ordered.append(kw)

    return all_ordered


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    tagged_count = 0
    for card in catalog["cards"]:
        kws = extract_keywords_for_card(card)
        card["keywords"] = kws
        tagged_count += 1

    CATALOG_PATH.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Successfully tagged {tagged_count} cards in {CATALOG_PATH}")


if __name__ == "__main__":
    main()
