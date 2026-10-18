# Dragon Eclipse deck construction

This repository contains an offline Flutter deck builder for the Dragon Eclipse base game. The [implementation plan](PLAN.md) records the agreed app behavior. The repository also contains the rulebook, card scans and crops, and a [partial JSON catalog](data/catalog.json).

## Run the app

The Flutter project is in [`app/`](app/). Install Flutter, then run `cd app`, `flutter pub get`, and `flutter run` with an Android device or emulator. The app keeps loadouts in its local documents directory; no account or network connection is needed. Create a Campaign pair, PvP Quick Battle deck, or PvP Challenge lineup, choose Mystlings, add card copies, and review live rule warnings. Drafts save automatically even if warnings remain.

The catalog screen searches names, IDs, effects, and keywords, and filters by element, rarity, source, Mystling, and categorized keywords with ALL/ANY matching modes. Active keywords are displayed as removable chips. Card details show the cropped image, transcribed effects, and interactive keyword chips that filter the catalog or editor on tap. Mystling details show available stat and ability scans. The bolt icon opens elemental bonus actions, which are reference actions and do not count toward a deck.

The transfer screen copies a versioned JSON export to the clipboard or writes it to the app documents directory. Paste exported JSON to preview and import it. Unknown card IDs are reported before import; same-ID identical loadouts are skipped, while conflicting IDs are imported as named copies. Exports contain loadout data and catalog version, not images. The app's catalog remains **partial**, so rule warnings can only cover cards currently entered in the catalog. Campaign unlocks and the other PvP player's physical cards remain the player's responsibility.

Run `py -3 scripts/tag_catalog_keywords.py` to extract and tag keywords across all cards in `data/catalog.json`. The Flutter app in `app/` links directly to `./data` and `./images` without duplicate asset files. Run `py -3 scripts/sync_app_assets.py` to verify directory links and image coverage. Validate with `cd app`, `flutter analyze`, and `flutter test`. Android and iOS project files are included. An iOS build needs macOS tooling.

The rulebook in this repository is the authority if this summary is incomplete or differs from the printed game. Deck construction is on page 7, choosing campaign Mystlings on page 6, Action card effects on page 18, and PvP setup on pages 27–28.

## Campaign deck construction

Deck construction starts before the **second** campaign scenario. Choose two Mystlings with different **main** elements, then build one deck for each from cards unlocked so far. Starting cards, later Advancement cards, and Booster cards can be used as they become available. Neutral Starting cards may be exchanged between the two Mystlings.

Each deck must follow all of these rules:

1. Contain **Action cards only** and **exactly 16 cards**.
2. Contain **at least 3 and at most 6 Mystling-specific Action cards** belonging to its chosen Mystling.
3. Contain **at most 1 Legendary** card.
4. Use only **Neutral** cards, cards matching the Mystling's **main element**, and cards matching its **subtype element**, if it has one. The number of subtype-element cards cannot exceed the number printed beside the small subtype icon on the Mystling's stat card. There is no corresponding main-element cap in the rulebook.

For example, Young Bolb has Earth as its main element and Water as its subtype with a limit of 2. It can use any number of eligible Earth Action cards, at most two Water Action cards, and Neutral Action cards, while still meeting the other deck rules.

The physical card pool matters when assembling two decks: one card copy cannot be in both decks at the same time. Campaign eligibility also depends on which cards have actually been unlocked. The planned app will **warn about base-game copy conflicts** but will **not track unlocks or personal ownership**. All app rule checks are advisory so drafts and proxy decks can still be saved.

## PvP deck construction

PvP Quick Battle uses one Mystling and one deck per player. PvP Challenge uses three Mystlings and three decks per player; a player's three Mystlings must have different main elements. Both formats use the deck rules above.

PvP has a shared physical card allocation procedure: split Neutral cards into two piles with one copy of each card per pile, give one pile to each player, and divide Elemental cards by element. Players may agree to trade Neutral cards. When players need the same Elemental cards and cannot agree, they choose alternately starting with the designated first or host player. A Mystling using a subtype chooses subtype cards from those remaining after the other player finishes construction. See pages 27–28 for the full procedure.

The planned app is used separately by each PvP player. It will warn about card copies reused within that player's Challenge lineup, but it cannot check the other player's device or enforce PvP card allocation between players.

## Reading an Action card

| Printed feature | Meaning for deck construction and the catalog |
| --- | --- |
| Card ID, such as `DE-CB-24/125` or `DE-CB-M19/90` | Stable printed identifier for a distinct card. The `M` series identifies Mystling-specific Action cards. |
| Element icon at the upper left | Elemental cards have an icon; Neutral cards have none. A Mystling-specific card is also Elemental. |
| Upper-right marker | `S` means Starting, `A` or `B` means the corresponding Advancement deck; a Mystling name identifies a Mystling-specific card. This marker is **not** the rarity. |
| Card name and effect text | Describes what the card does in combat. Some effects mention a particular slot. |
| Rarity icon at the bottom | Common, Rare, Ultra Rare, Legendary, or Mystling-specific. The Legendary icon matters to the one-Legendary deck limit. |

Common cards are Neutral, with two physical copies of each. Rare Elemental cards also have two copies each. Ultra Rare and Legendary Elemental cards have one copy each. The catalog will record the physical copy count for every distinct card, including Mystling-specific cards, from the rulebook and supplied scan inventory.

Effect text may contain **active** effects resolved when the card is played, **passive** effects in a frame that apply while the card is on top of the discard pile, or **Upgrade** effects in a frame that stay attached until the deck is reshuffled. A card can combine effect types. These details are useful for browsing cards but do not change the page 7 deck limits.

For the app catalog, each Action card needs at least: printed ID, name, element or Neutral, rarity, source marker or owning Mystling, effects, physical copy count, and image reference. Each Mystling needs its name, main element, optional subtype element, and subtype card limit. Multiple physical copies of one printed card share one catalog entry and are selected by quantity in a deck.

## Elemental bonus actions

The six Element reference cards in `images/elementatl cards/` list two shared Bonus Actions, **Dash** (1 Power: Move) and **Prepare** (1 Power: discard 1 card, then you may draw 1 card), plus one action for each element. Each Bonus Action can be used once per turn. These reference cards have no printed Action card IDs and do not count toward a deck's 16 cards. In the deck builder, the bonus action dialog filters to the chosen Mystling's main element and includes its printed special abilities (such as Eldrithia's Seek Equilibrium and Contrast); the general card catalog displays all elemental bonus actions.

| Element | Action | Power cost | Effect |
| --- | --- | ---: | --- |
| Air | Accelerate | 5 | Look at the top card of your deck. You may resolve it or put it back on top. |
| Dark | Foresight | 7 | Resolve the active effect of any card in your discard pile, then remove it from play. |
| Earth | Unity | 4 | Put any card from your discard pile on top of that pile. |
| Fire | Fury | 5 | Attack. |
| Light | Exchange | 1 | Deal 1 Damage (Pierce 2) in any range; gain 1 Damage. |
| Water | Flow | 4 | Move the opponent by its Swiftness; Heal 1. |

## JSON catalog

`data/catalog.json` is a starter catalog, not a complete playable card database. Its `status` remains `partial` until all base-game cards and Mystlings have been checked against scans. `schemaVersion` describes the JSON shape so future readers can reject unsupported versions; version 2 added `bonusActions`, version 3 added scanned Mystling stats and special abilities, and version 4 adds a separate `pvpStatCard` for a PvP-only scan.

`bonusActions` stores the two shared actions once and one elemental action per element. `usesPerTurnPerAction: 1` records the printed limit. Each elemental entry includes `powerCost`, effect text, and a cropped reference image path. The six images can be regenerated with `py -3 scripts/crop_elemental_bonus_actions.py`.

Each entry in `cards` represents one **distinct printed Action card**. `id` is the printed card ID and is the stable reference used by saved decks. `element: null` means Neutral; otherwise it is the card's element in lowercase. `mystlingId: null` means any eligible Mystling may use it; a non-null value must refer to an entry in `mystlings`. `source` is one of `starting`, `advancement_a`, `advancement_b`, `booster`, or `mystling`; it describes where the card comes from, separately from `rarity`. `rarity` is one of `common`, `rare`, `ultra_rare`, `legendary`, or `mystling_specific`. `copiesInBaseGame` is the number of physical copies, while `imagePath: null` means no cropped image is available yet.

`effects` is an ordered list of `active`, `passive`, and `upgrade` sections, preserving the different printed frames. The text writes known icons as words (for example, Power, Damage, Defense, Willpower, and Strength) for search and accessibility. `Against Water:` expands the Earth card's Water advantage icon. The three terrain symbols on Geokinetic Grasp and Magnetism are temporarily transcribed as `[terrain-chevron]`, `[terrain-arch]`, and `[terrain-cross]` by their visible shapes; the card image remains the reference for those symbols.

The scans in `images/basic/2026-10-12_120504/` contain the 30 Neutral Starting cards, IDs `DE-CB-11/125` through `DE-CB-40/125`. Each card has two physical copies. Their printed A/B starting-deck marker is stored in `startingDeck`; Strike (`24`) already had a catalog entry and now has its scan image. Run `py -3 scripts/import_basic_neutral_cards.py` to regenerate all 30 cropped images and catalog entries.

The first card entry is **Strike**, verified against page 7 of the rulebook:

```json
{
  "id": "DE-CB-24/125",
  "type": "action",
  "name": "Strike",
  "element": null,
  "rarity": "common",
  "source": "advancement_a",
  "mystlingId": null,
  "copiesInBaseGame": 2,
  "keywords": [
    "Attack",
    "Power Ramp",
    "Active"
  ],
  "effects": [
    { "type": "active", "text": "Attack. Gain 1 Power." }
  ],
  "imagePath": null
}
```

Each entry in `mystlings` holds the information needed to validate element eligibility. `subtype` is `null` when absent or an object with `element` and `maxCards`. The Young Bolb example records Earth as its main element and a Water subtype limit of two, as shown on rulebook page 7. Where scanned, a Mystling also has `stats`, `resourceCaps`, `statCardImagePath`, and a `specialAbility` object with its separate card ID, bonus actions, and image. These stat and ability cards are reference cards, not Action cards in a deck.

Eldrithia's scan contains stat card `46A`, special ability card `50A`, and three distinct Mystling-specific Action cards, `DE-CB-M25/90` through `DE-CB-M27/90`. She is Light with a Dark subtype limit of one card. Her stat card has 28 Health, 0 Willpower, 0 Defense, 1 Strength, 3 Swiftness, and maximum 4 each of Glow and Gloam. The Action cards belong only to Eldrithia and have two physical copies each; the rulebook component list records 180 Mystling-specific Action cards for the 90 numbered designs. Run `py -3 scripts/crop_eldrithia_cards.py` to regenerate all five crops from the supplied sheet.

Iceling's scan contains stat card `113A`, special ability card `117A`, and three distinct Mystling-specific Action cards, `DE-CB-M58/90` through `DE-CB-M60/90`. Iceling is Water with no subtype. Its stat card has 30 Health, 0 Willpower, 1 Defense, 4 Strength, 2 Swiftness, and a maximum of 4 Ice. Each of its Action cards has two physical copies. Run `py -3 scripts/crop_iceling_cards.py` to regenerate all five crops from the supplied sheet.

The mixed Mystling stat sheet adds standard stat cards for Chrysomallon (`35A`, Fire with Earth subtype limit 2), Elkthorn (`51A`, Earth), Firple (`68A`, Water), Young Gaiadon (`96A`, Earth), Young Iceling (`118A`, Water), Young Shadeclaw (`147A`, Dark with Air subtype limit 2), and Windraiser (`171A`, Air). Young Iceling and Iceling are separate Mystlings. The same sheet includes Young Emberling `62B`, clearly marked **PvP**; its 22 Health, 4 Strength, and 3 Swiftness are stored under `pvpStatCard` and are not treated as campaign stats. The printed resource caps on Firple, Chrysomallon, Elkthorn, Windraiser, and Young Shadeclaw are recorded with `*_icon` keys until their ability cards identify the token names. Run `py -3 scripts/crop_mystling_stat_sheet.py` to regenerate all eight stat crops.

The four sheets in `images/mystlings/scan_pve/` add 27 PvE stat cards. They fill Young Bolb's previously missing stats and add 26 Mystlings, for 37 Mystlings in the partial catalog. Run `py -3 scripts/import_pve_stat_scans.py` to regenerate the individual crops and catalog entries. Each entry records the source scan, printed stat card ID, main element, visible subtype limits, stats, and identifiable resource caps. Artios (`12A`) has four separate subtype limits: one Fire, Water, Earth, and Air card each. Its printed resource cap boxes are preserved as `printedResourceCaps` because the two groups use visually similar icons with different limits. The deck validator reads `subtypes` for this multi-subtype case; ordinary Mystlings still use `subtype`.

The five sheets in `images/mystlings/scan_pvp/` contain a PvP stat side for every one of the 37 cataloged Mystlings. Run `py -3 scripts/import_pvp_stat_scans.py` to regenerate their crops and `pvpStatCard` data. PvP Quick Battle and Challenge loadouts show the PvP image and printed stats first; campaign loadouts show the PvE side first. The two sides stay separate because several printed stats differ, such as Young Bolb's 35 PvE Health versus 40 PvP Health. PvP card IDs, source scans, and visible resource caps are recorded with each side. Young Emberling currently has only a PvP side in the supplied scans.

The two Earth sheets have been split into fourteen distinct card images, IDs `DE-CB-83/125` through `DE-CB-96/125`. The two Wind sheets have also been split into fourteen distinct card images, IDs `DE-CB-41/125` through `DE-CB-54/125`. The rulebook calls the Wind element **Air**, so these entries use `"element": "air"`; their image directory remains `images/wind/cards/`. `Against Earth:` expands the Air cards' Earth advantage icon.

The Water scans contain fourteen distinct cards, IDs `DE-CB-111/125` through `DE-CB-124/125`. Storm (`111`) and Seeking Tendrils (`123`) each appear twice in the original two sheets, so each has one catalog entry and one selected crop. A later scan supplies Cost in Blood (`112`). `Against Fire:` expands the Water cards' Fire advantage icon.

The two Light scans contain fourteen distinct cards, IDs `DE-CB-97/125` through `DE-CB-110/125`. Blinding Radiance (`99`) appears twice, so it has one catalog entry and one selected crop. `Against Dark:` expands the Light cards' Dark advantage icon.

The Light catalog images use PNG files with straighter borders and clearer color and print. They are normalized to 768×1068 pixels, with transparent rounded corners replacing the outside white margin. `py -3 scripts/normalize_light_cards.py` regenerates normalized previews under `tmp/normalized_light_cards/`. These were made with imagegen, which can reinterpret fine visual details; use the printed cards and rulebook to verify anything uncertain. The earlier Light JPG crops are no longer kept in the project.

See the [card image enhancement workflow](docs/card-image-workflow.md) for the step-by-step edit, review, normalization, and catalog sync process to use for other elements.

The two Fire scans contain fourteen distinct cards, IDs `DE-CB-55/125` through `DE-CB-69/125` except `DE-CB-59/125`, which is absent from the supplied scans. Fire Barrier (`57`) appears twice, so it has one catalog entry and one selected crop. `Against Air:` and `Against Water:` expand the corresponding element icons on Fire cards.

The two Dark scans contain thirteen distinct cards, IDs `DE-CB-70/125` through `DE-CB-82/125`. Succumb to Darkness (`82`) appears twice, so it has one catalog entry and one selected crop. `Against Light:` expands the Light advantage icon on Dark cards.

All catalog entries include printed names, rarity, effect sections, copy counts, and paths to individual images where available. Run `py -3 scripts/crop_earth_cards.py`, `py -3 scripts/crop_wind_cards.py`, `py -3 scripts/crop_water_cards.py`, `py -3 scripts/crop_fire_cards.py`, or `py -3 scripts/crop_dark_cards.py` from the repository root to regenerate crops from the original sheets.
