# Board Game Engine Umbrella (`bge-umbrella`)

A multi-tool companion suite designed for modern tabletop campaign and deckbuilding board games, with specialized tooling built for **Dragon Eclipse**.

---

## 📦 Workspace Architecture

This monorepo brings together two dedicated applications:

```
bge-umbrella/
├── bge-quest-creator/     # QuestFlow Studio — Visual Campaign & Scenario Graph Editor
│   ├── src/               # React 19 + TypeScript + Vite + Tailwind CSS + @xyflow/react
│   └── dev-dist/ / dist/  # Offline PWA assets & Service Worker
└── bge-deckbuilder/       # Dragon Eclipse Deck Construction App
    ├── app/               # Offline Flutter multiplatform application
    ├── data/              # JSON catalog of Action cards, Mystlings, and keywords
    ├── images/            # High-resolution card scans, crops, and reference stat sheets
    └── scripts/           # Python asset pipeline, crop automation, and catalog tagging
```

---

## 📜 1. QuestFlow Studio (`bge-quest-creator`)

A progressive web application (PWA) and visual node-graph editor for drafting, structuring, and simulating complex branching campaign scenarios.

### Features
* **Interactive Node Graph**: Built on `@xyflow/react` with swimlane-based progression tiers, smart bezier/step edge routing, and obstacle avoidance.
* **Streamlined Quest Creation**:
  * **Drag-to-Create**: Drag a connector wire from any scenario outcome port directly onto the canvas to instantly spawn and wire a connected successor quest.
  * **Double-Click Creation**: Double-click empty canvas space or use keyboard shortcuts (`N`) to quick-create or open the wizard.
  * **Archetype Presets**: Pre-configured templates for *Standard Main*, *Branching Choices*, *Boss Climax*, and *Side Ventures*.
* **State Tag Simulation**: Track Act-local (`+Tag`) and Campaign-global (`++Tag`) state flags. Simulate choices in real time to see which scenarios unlock, lock out, or mutate.
* **AI-Assisted Drafting**: Integrated with Google Gemini API to generate dark-fantasy narrative flavor, objectives, tabletop rules, reward branches, and conditional mutations in seconds.
* **TTS Audio Narration**: Studio-quality voiceover generation using Gemini TTS with multiple narrator personas and auto-downloadable `.wav` tracks.
* **Print & Export**: Export campaigns to JSON or CSV matrices, or print formatted tabletop scenario cards.

### Quick Start
```bash
cd bge-quest-creator
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

---

## 🃏 2. Deck Builder (`bge-deckbuilder`)

An offline Flutter deck construction tool for Dragon Eclipse campaign and PvP formats.

### Features
* **Format-Specific Rules Enforcement**:
  * **Campaign Pair Construction**: Build paired decks (16 cards each) honoring Mystling element affinity, subtype limits, and physical card pool constraints.
  * **PvP Quick Battle & Challenge**: Draft 1-deck or 3-deck lineups with multi-Mystling element restrictions.
* **Catalog & Keyword Search**: Search across card names, IDs, effects, and keywords with ALL/ANY boolean matching.
* **Offline Asset Sync**: Local card scans, cropped art, and elemental bonus actions directly integrated into the app.
* **Data Transfer**: Versioned JSON clipboard export/import with collision handling.

### Quick Start
```bash
cd bge-deckbuilder/app
flutter pub get
flutter run
```

Run asset validation and keyword scripts:
```bash
cd bge-deckbuilder
py -3 scripts/tag_catalog_keywords.py
py -3 scripts/sync_app_assets.py
```

---

## 🛠️ Development & Contributing

* **Node.js**: v18+ (tested with v20+)
* **Flutter**: 3.x+ / Dart 3.x+
* **Python**: 3.10+ (for deckbuilder asset processing scripts with PIL/OpenCV)

---

## 📄 License

This repository is maintained for personal and community tools supporting campaign board games. All game content, artwork, and rulebook references belong to their respective copyright holders.
