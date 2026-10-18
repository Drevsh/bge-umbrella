# Board Game Quest Dependency & Narrative Editor (`QuestFlow Studio`)
**Complete Architectural Specification, Domain Model & Agentic Implementation Blueprint**

---

## 1. Executive Summary & Core Design Philosophy

This document serves as the complete Single Source of Truth for building **QuestFlow Studio**, a local-first React + TypeScript application designed for board game designers to model, write, simulate, and export branching campaign quests.

### Core Problems Solved
1. **Visualizing Complex Tabletop Dependencies:** Quests in campaign board games (like *Gloomhaven*, *Arkham Horror LCG*, or *ISS Vanguard*) require modeling sequential prerequisites, **parallel side-by-side quests**, `AND` / `OR` logic gates, and **mutually exclusive faction lockouts**.
2. **Reward-Driven Branching vs. Downstream Quest Mutation (Avoiding Combinatorial Explosion):**
   * **Structural Branching (Multi-Port Reward Handles):** A quest node has distinct output ports for each **Reward Outcome** (`Always Granted` vs. `Pick-1 Exclusive Choice`). Connecting an edge from a specific reward port unlocks a brand-new follow-up quest node.
   * **Subflow Replacement Slots:** When a reward choice replaces a quest with an alternate scenario at the exact same progression tier (e.g., `M02_A: Hunted by the Cult` vs. `M02_B: Temple's Blessing`), both nodes live inside a visual **Subflow Slot Container** (`Slot M02`) with mutual lockout rules.
   * **Internal Quest Mutations (Conditional Variants via State Tags):** When an earlier reward choice only alters the flavor text, setup instructions, or boss stats of a later quest (e.g., Act Boss `B01`), it is modeled as a **`QuestVariantOverride`** triggered by a **State Tag** (`[Idol_Kept]`) inside the existing node—preventing the designer from having to duplicate $2^n$ nearly identical boss nodes.
3. **Decoupled "Single Source of Truth" State:**
   * Graph coordinates (`nodes`, `edges`, `x/y`) are strictly decoupled from heavy narrative text (`questsById`). Typing story prose in the right-hand Inspector Drawer never triggers expensive SVG canvas re-renders.
4. **Macro Overview, Playtest Simulation & Print Pipeline:**
   * Includes a live **Playtest Simulator** on the canvas to test reward choices and catch soft-locks, a **Campaign Matrix & State Tag Audit** view to catch orphaned tags, a **4-Step Guided Quest Creation Wizard**, and one-click **CSV/JSON exporters** for physical card layout tools (*NanDeck*, *Component.Studio*, *Adobe InDesign Data Merge*).

---

## 2. Tech Stack & Strict Engineering Constraints

When implementing this application via an AI coding agent (Claude Code, Cursor, Windsurf, Aider), adhere strictly to the following stack and architectural rules:

### Target Stack
* **Build & Framework:** Vite + React 19 + TypeScript (`strict: true`)
* **Styling & Icons:** Tailwind CSS v4 (`@tailwindcss/vite`) + `lucide-react`
* **Node Graph Engine:** `@xyflow/react` (React Flow v12+)
* **Auto-Layout Engine:** `@dagrejs/dagre` (topological left-to-right parallel tier alignment)
* **State Management:** `zustand` + `immer` + `zundo` (for `Ctrl+Z` / `Ctrl+Y` undo/redo)
* **Local Persistence:** `idb-keyval` (IndexedDB async storage) + Browser File System Access API
* **Table & Export Utilities:** `@tanstack/react-table` + `papaparse` (CSV) + `zod` (JSON schema validation)

### 6 Non-Negotiable React & React Flow v12 Rules
1. **Mandatory React Flow Stylesheet:** Always include `import '@xyflow/react/dist/style.css';` in `src/index.css` or `src/main.tsx`. Without it, handles and node wrappers fail to position.
2. **React Flow v12 Measured Dimensions:** In `@xyflow/react` v12, node dimensions are stored on `node.measured?.width` and `node.measured?.height` (NOT `node.width` / `node.height`). Always provide fallback dimensions (`width = node.measured?.width ?? 270`, `height = node.measured?.height ?? 180`) when running Dagre layout calculations.
3. **Define `nodeTypes` and `edgeTypes` Outside Components:** Never define `nodeTypes` or `edgeTypes` inside a React component render function, and wrap custom nodes/edges in `React.memo`.
4. **Dynamic Handle Recalculation:** Whenever `rewardOutcomes` are added, removed, or reordered on a quest, call `useUpdateNodeInternals(nodeId)` inside a `useEffect` in the custom node so React Flow recalculates port attachment coordinates immediately.
5. **Immutable UUIDs vs. Mutable Quest Codes:** Use an immutable `uid` (`crypto.randomUUID()`) for React Flow `node.id` and `edge.source`/`target`. Store the human-readable code (`"M01"`, `"S01"`, `"B01"`) in `quest.code` so renaming a quest code never breaks connected arrows.
6. **Viewport & Split-Pane Guarantee:** The graph container must use `flex-1 h-full min-w-0 relative` inside a `flex-row` workspace. The right-hand Quest Inspector (`w-96`) must be collapsible (`SPLIT` vs. `FULL_GRAPH` mode) so the inspector never covers or collapses the graph.

---

## 3. Complete TypeScript Domain Schema (`src/types/campaign.ts`)

```typescript
import { z } from 'zod';

export type PrereqLogic = 'START' | 'ALL' | 'ANY'; // Starter vs AND gate vs OR gate
export type QuestCategory = 'MAIN' | 'MAIN_BRANCH' | 'SIDE' | 'FACTION' | 'BOSS';
export type EdgeRelationType = 'UNLOCKS' | 'CHOICE_BRANCH' | 'MUTATION' | 'LOCKOUT';
export type EdgeRoutingStyle = 'BEZIER' | 'STEP' | 'STRAIGHT';
export type DevStatus = 'IDEA' | 'DRAFT' | 'PLAYTESTED' | 'FINAL';

export interface RewardOutcome {
  id: string;                 // Used as React Flow sourceHandle ID (e.g., "out-choice-a")
  label: string;              // e.g., "[Choice A] Keep Blood Idol"
  isExclusiveChoice: boolean; // false = Always granted; true = Player picks 1 exclusive choice
  gold: number;
  items: string[];
  grantsStateTags: string[];  // e.g., ["Idol_Kept"] -> triggers downstream mutations or branches
}

export interface QuestVariantOverride {
  id: string;
  requiredStateTag: string;   // e.g., "Idol_Kept" or "Secret_Passage"
  overrideTitle?: string;     // Optional replacement title when tag is active
  additionalFlavorText: string;
  setupModifications: string; // e.g., "Malakor gains +15 HP and Siphon Blood aura."
  rewardModifications?: string;
}

export interface QuestModel {
  uid: string;                // Immutable internal ID (used for graph node.id)
  code: string;               // Designer-facing ID ("M01", "S01", "M02_A", "B01")
  title: string;
  tier: number;               // Parallel swimlane column (1 = Starter, 2 = Mid-Act, 3 = Finale)
  category: QuestCategory;
  prereqLogic: PrereqLogic;
  requiredTag?: string;       // Optional explicit State Tag required to unlock this node
  parentSlot?: string | null; // Optional Subflow Group ID (e.g., "SLOT_M02")
  position: { x: number; y: number };

  // Tabletop Scenario Card Content
  flavorText: string;
  setupInstructions: string;
  objectives: string;

  // Dynamic Output Ports & Downstream Variant Overrides
  rewardOutcomes: RewardOutcome[];
  variants: QuestVariantOverride[];
  devStatus: DevStatus;
}

export interface CampaignEdge {
  id: string;
  source: string;             // Source Quest uid
  sourcePortId: string | null;// RewardOutcome.id (null for node-level LOCKOUT edges)
  target: string;             // Target Quest uid
  type: EdgeRelationType;     // Drives color, dash pattern, and simulator evaluation
  stateTag?: string | null;   // Tag carried across this connection
  label?: string;
}

export interface CampaignProjectFile {
  version: string;
  exportedAt: string;
  quests: Record<string, QuestModel>;
  edges: CampaignEdge[];
}
```

---

## 4. Reference Campaign Dataset (`src/store/defaultCampaignData.ts`)

Pre-populate the store with this rich Act I scenario so every relationship type (`UNLOCKS`, `CHOICE_BRANCH`, `MUTATION`, `LOCKOUT`, and `Subflow Slot M02`) is immediately demonstrable on first launch:

1. **`M01: The Sunken Shrine` (Tier 1, `START`):**
   * **Port 1 (`out-always`):** `[Always] Harbor Map` (+10g, grants `Harbor_Mapped`) $\rightarrow$ `UNLOCKS` edge to **`S01`**.
   * **Port 2 (`out-choice-a`, Exclusive Choice):** `[Choice A] Keep Idol` (+25g, grants `Idol_Kept`) $\rightarrow$ `CHOICE_BRANCH` edge to **`M02_A`** AND `MUTATION` edge to **`B01`**.
   * **Port 3 (`out-choice-b`, Exclusive Choice):** `[Choice B] Destroy Idol` (+5g, grants `Idol_Broken`) $\rightarrow$ `CHOICE_BRANCH` edge to **`M02_B`** AND `MUTATION` edge to **`B01`**.
2. **`S01: Smuggler's Cove` (Tier 2 Parallel Side Quest, `ALL`):**
   * Unlocked by `M01`. Can be played side-by-side with `M02_A` or `M02_B`.
   * **Port 1 (`out-secret`):** `Undercroft Key` (+15g, grants `Secret_Passage`) $\rightarrow$ `MUTATION` edge to **`B01`**.
3. **Subflow Container `SLOT_M02: The Aftermath` (Tier 2 Replacement Branch):**
   * Contains **`M02_A: Hunted by the Cult`** (requires `Idol_Kept`, grants `Cult_Tracked`) and **`M02_B: Temple's Blessing`** (requires `Idol_Broken`, grants `Sun_Blessed`).
   * Connected by a red bidirectional **`LOCKOUT`** edge (`✕ LOCKS OUT`) between `M02_A` and `M02_B`.
   * Both `M02_A` and `M02_B` connect to **`B01`** via `UNLOCKS` edges (`OR Path A` / `OR Path B`).
4. **`B01: The High Inquisitor` (Tier 3 Act Boss, `ANY` / OR Gate):**
   * Unlocks when *either* `M02_A` OR `M02_B` is completed.
   * Contains **3 Conditional Variants (`variants[]`)** instead of duplicating the Boss node:
     1. `requiredStateTag: 'Idol_Kept'` $\rightarrow$ Overrides title to *"The High Inquisitor (Blood Awakened)"*, +15 Boss HP, Siphon Blood aura.
     2. `requiredStateTag: 'Idol_Broken'` $\rightarrow$ Overrides title to *"The High Inquisitor (Shaken Faith)"*, -1 Guard, Boss starts with -5 HP.
     3. `requiredStateTag: 'Secret_Passage'` $\rightarrow$ Heroes deploy in Rear Choir Zone and gain a Surprise Round in Round 1.

---

## 5. Visual & UI Architecture

### A. 4 Semantic Edge Types (High-Contrast Color & Marker Coding)
| Edge Type | Visual Encoding | Meaning in Game Logic |
|---|---|---|
| **`UNLOCKS`** | Solid Emerald (`#10b981`) + Emerald Arrowhead | Standard prerequisite completion unlocks the target quest. |
| **`CHOICE_BRANCH`** | Solid Sky Cyan (`#38bdf8`) + Cyan Arrowhead | Specific exclusive reward choice unlocks a dedicated branch node. |
| **`MUTATION`** | Dashed Amber (`#f59e0b`) + Amber Arrowhead | Reward's State Tag reaches forward to activate a conditional variant inside a downstream quest. |
| **`LOCKOUT`** | Dashed Rose Red (`#ef4444`) + Bidirectional Markers | Completing one quest permanently locks out the connected sibling quest. |

### B. Workspace Layout & View Modes
1. **Top Header Toolbar:**
   * **Segmented View Switcher:** `Full Graph` (100% canvas) | `Graph + Inspector` (Split view) | `Overview & Audit` (Matrix table + State Tag audit).
   * **Primary CTAs:** `+ Add Quest Node` (launches the 4-step Guided Creation Wizard), `Auto-Align Tiers`, and `JSON` / `CSV` export buttons.
   * **Playtest Simulator Bar:** Instant toggles to test `M01` Reward Choices (`Choice A: +Idol_Kept`, `Choice B: +Idol_Broken`, or `All Paths`), toggle side quest completion (`+Secret_Passage`), and reset the graph.
2. **Secondary Visualization & Spacing Toolbar:**
   * **Edge Routing Style:** `Curved` (Cubic Bézier) | `Orthogonal` (Step) | `Straight`.
   * **Interactive Spacing Presets:**
     * *Horizontal Tier Spacing:* `Compact` | `Balanced` | `Wide`.
     * *Vertical Card Gap:* `Tight` | `Normal` | `Airy`.
     * *Grid Snap:* `Snap Grid (16px)` toggle + live `X / Y` coordinate badge while dragging nodes.
   * **Edge Layer Toggles:** Individual pill buttons to show/hide `Unlocks`, `Choices`, and `⚡ Mutations`.
3. **Collapsible Right-Hand Quest Inspector (`340px`):**
   * Edits `Title`, `Prereq Gate Logic` (`START` / `AND` / `OR`), and switches between the **`Base Card`** tab and each **`⚡ State_Tag`** conditional variant tab.
   * Includes a **Live Tabletop Card Preview** (parchment card styling) that dynamically merges the base flavor/setup text with all currently active conditional variants.
   * Lists outgoing edges with one-click delete and an inline form to add new Reward Outcome ports.
4. **4-Step Guided New Quest Creation Wizard (Modal):**
   * **Step 1 (Identity & Parallel Tier):** Select category (`MAIN`, `SIDE`, `FACTION`, `BOSS`), auto-suggest Quest ID (`S02`, `M03`), and pick Swimlane Tier (`Tier 1`, `Tier 2`, `Tier 3`).
   * **Step 2 (Prerequisites & Lockouts):** Choose `AND` vs `OR` gate, click existing quest reward ports to auto-wire incoming prerequisite arrows, and optionally pick a mutually exclusive lockout quest.
   * **Step 3 (Rewards, State Tags & Downstream Effects):** Define reward outcome ports and state tags (`+Beacon_Lit`), and choose whether completing this quest **unlocks** or **mutates** a later quest (such as injecting a new variant directly into `B01`).
   * **Step 4 (Scenario Text & Summary):** Enter flavor text, setup instructions, and objectives, review the generated graph connections, and place the node onto the appropriate tier column without overlapping existing cards.

---

## 6. Target Directory Structure

```text
boardgame-quest-editor/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── index.css                     # Imports tailwindcss & @xyflow/react/dist/style.css
    ├── App.tsx                       # Main layout shell & modal coordinator
    ├── types/
    │   └── campaign.ts               # Domain interfaces & Zod validation schemas
    ├── store/
    │   ├── defaultCampaignData.ts    # Initial Act I quests (M01, S01, M02_A, M02_B, B01) & edges
    │   └── useCampaignStore.ts       # Zustand + Immer + Zundo + IndexedDB persistence
    ├── utils/
    │   ├── simulatorEngine.ts        # Computes activeStateTags, quest statuses, & active edges
    │   ├── layoutEngine.ts           # Dagre & Tier-column spacing calculators + DFS cycle check
    │   └── exporters.ts              # JSON export/import & NanDeck/InDesign CSV generator
    └── components/
        ├── header/
        │   ├── TopHeaderBar.tsx      # Mode switcher, Wizard trigger, Exports, & Simulator controls
        │   └── GraphOptionsBar.tsx   # Routing style, Tier/Vertical spacing presets, & Edge filters
        ├── canvas/
        │   ├── QuestGraphCanvas.tsx  # Interactive SVG / React Flow canvas with Swimlane headers
        │   ├── QuestNodeCard.tsx     # Multi-port quest card with Variant & Gate badges
        │   ├── SubflowSlotBox.tsx    # Container box for mutually exclusive replacement branches
        │   └── SemanticEdgeLayer.tsx # Bezier/Step/Straight paths with animated flow particles
        ├── inspector/
        │   ├── QuestInspectorDrawer.tsx # Collapsible right-hand editor drawer
        │   ├── VariantTabsEditor.tsx    # Base Card vs Conditional Variant override fields
        │   └── TabletopCardPreview.tsx  # Live parchment scenario card previewer
        ├── overview/
        │   ├── CampaignMatrixTable.tsx  # Tier-grouped quest overview table
        │   └── StateTagAuditGrid.tsx    # Audits Granted By vs Consumed By (flags orphan tags)
        └── wizard/
            └── NewQuestWizardModal.tsx  # 4-step guided quest & connection builder
```

---

## 7. Phased Agentic Execution Plan (Prompts for AI Coding Agents)

To build this cleanly with an AI coding agent, execute the following **5 sequential phases**. Verify each phase with `npm run build` before proceeding.

### Phase 1: Bootstrap Project, Packages & Styles
Run these exact commands in the project root:
```bash
npm create vite@latest boardgame-quest-editor -- --template react-ts
cd boardgame-quest-editor
npm install @xyflow/react zustand immer zundo idb-keyval lucide-react @dagrejs/dagre papaparse clsx zod tailwindcss @tailwindcss/vite
npm install --save-dev @types/papaparse @types/dagre
```
Configure `src/index.css`:
```css
@import "tailwindcss";
@import "@xyflow/react/dist/style.css";

@keyframes edgeFlowDash {
  to {
    stroke-dashoffset: -28;
  }
}
.animate-edge-flow {
  animation: edgeFlowDash 0.85s linear infinite;
}
```

### Phase 2: Domain Types, Default Campaign Data & Normalized Zustand Store
* **Agent Task:** Create `src/types/campaign.ts`, `src/store/defaultCampaignData.ts`, and `src/store/useCampaignStore.ts`.
* **Key Requirements:**
  * Store `quests` (keyed by `uid`), `edges`, `selectedQuestId`, `viewMode` (`'SPLIT' | 'FULL_GRAPH' | 'OVERVIEW'`), `edgeRoutingStyle` (`'BEZIER' | 'STEP' | 'STRAIGHT'`), `hSpacingPreset` (`'COMPACT' | 'BALANCED' | 'WIDE'`), `vSpacingScale` (`0.82 | 1 | 1.22`), and `simulatorState` (`m01Choice`, `s01Completed`, `customCompletedIds`).
  * Implement actions for `updateQuestField`, `updateVariantField`, `addVariant`, `addRewardOutcome`, `addEdge`, `deleteEdge`, `applyLayoutSpacing`, and `createQuestFromWizard`.
  * Persist state automatically to IndexedDB via `idb-keyval`.

### Phase 3: Interactive Graph Canvas, Multi-Port Cards & Semantic Edge Routing
* **Agent Task:** Implement the primary Graph Canvas (`QuestGraphCanvas.tsx`), Swimlane Tier headers (`Tier 1`, `Tier 2`, `Tier 3` with quick `+ Add Tier X` buttons), `SubflowSlotBox`, `QuestNodeCard`, and `SemanticEdgeLayer`.
* **Key Requirements:**
  * Render each `QuestNodeCard` with a left input port (`AND Gate` / `OR Gate` badge), conditional variant pills (`⚡ Idol_Kept`, `⚡ Secret_Passage`), and clickable reward outcome rows where each row has its own right-hand output port handle.
  * Support interactive port-to-port connection drawing (clicking any right output port starts a live rubberband line; clicking a target node's left input port creates the edge with a selectable type: `UNLOCKS`, `CHOICE_BRANCH`, or `MUTATION`).
  * Implement true screen-to-canvas coordinate conversion and optional 16px grid snapping with a live `X / Y` coordinate tooltip while dragging.

### Phase 4: Collapsible Quest Inspector & Live Tabletop Card Preview
* **Agent Task:** Build `QuestInspectorDrawer.tsx`, `VariantTabsEditor.tsx`, and `TabletopCardPreview.tsx`.
* **Key Requirements:**
  * Clicking a variant pill on a node or a tab in the inspector switches the editor between `Base Card` and `⚡ [State_Tag]` override fields.
  * The **Live Tabletop Card Preview** renders a warm parchment scenario card that dynamically injects active variant titles, bonus flavor text, and setup modifications based on the current Playtest Simulator state.

### Phase 5: Guided 4-Step Quest Wizard, Overview Matrix & Print Exporters
* **Agent Task:** Build `NewQuestWizardModal.tsx`, `CampaignMatrixTable.tsx`, `StateTagAuditGrid.tsx`, and `exporters.ts`.
* **Key Requirements:**
  * The 4-step wizard must allow creating a new quest, linking incoming prerequisites from existing quest reward ports, setting optional mutual lockouts, and optionally injecting a new `MUTATION` edge + `QuestVariantOverride` directly into a downstream target quest (like `B01`).
  * The **Overview & Audit** view must display all quests sorted by Parallel Tier and audit every State Tag (`Granted By` vs. `Unlocks Nodes` vs. `Mutates Variants`), highlighting unused orphan tags in amber.
  * Wire up the `JSON` and `CSV` buttons in the header to trigger instant browser file downloads formatted for NanDeck / InDesign Data Merge.

---

## 8. Complete Working Reference Implementation (Single-File React Artifact)

Below is the complete, self-contained reference implementation of **QuestFlow Studio** (`QuestEditorApp.jsx`). An AI agent or developer can either run this directly as a unified component or split its modules across the directory structure defined in Section 6:

```tsx
import React, { useState, useRef, useMemo } from 'react';
import {
  GitBranch,
  Layers,
  Sparkles,
  CheckCircle2,
  Play,
  RotateCcw,
  Plus,
  BookOpen,
  Tag,
  Sliders,
  Link2,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Columns,
  X,
  Move,
  Grid,
  Wand2,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround
} from 'lucide-react';

// ============================================================================
// DETERMINISTIC SVG GRAPH GEOMETRY CONSTANTS
// ============================================================================
const VIEWBOX_W = 1280;
const VIEWBOX_H = 680;
const NODE_WIDTH = 270;
const INPUT_PORT_Y_OFFSET = 44;
const REWARD_PORT_BASE_Y = 132;
const REWARD_PORT_STEP_Y = 30;

const getNodeHeight = (quest: any) => {
  return 122 + quest.rewardOutcomes.length * REWARD_PORT_STEP_Y + 12;
};

const getOutputPortCoords = (quest: any, portIndex: number) => ({
  x: quest.position.x + NODE_WIDTH,
  y: quest.position.y + REWARD_PORT_BASE_Y + portIndex * REWARD_PORT_STEP_Y
});

const getInputPortCoords = (quest: any) => ({
  x: quest.position.x,
  y: quest.position.y + INPUT_PORT_Y_OFFSET
});

// ============================================================================
// INITIAL CAMPAIGN DATA MODEL (Nodes, Ports, Variants, & Explicit Edge List)
// ============================================================================
export const INITIAL_QUESTS: Record<string, any> = {
  M01: {
    uid: 'M01',
    id: 'M01',
    title: 'The Sunken Shrine',
    tier: 1,
    category: 'MAIN',
    prereqLogic: 'START',
    parentSlot: null,
    position: { x: 45, y: 190 },
    flavorText:
      'Water drips from the ancient vault ceiling. Upon the obsidian dais rests the pulsing Blood Idol, surrounded by scattered navigational charts of the jagged coast.',
    setupInstructions:
      'Place Tile 1A (Flooded Sanctum). Spawn 3 Deep-Mire Cultists on red markers and place the Blood Idol token on the central altar.',
    objectives:
      'Retrieve the altar artifacts and escape before the chamber floods at the end of Round 5.',
    rewardOutcomes: [
      {
        id: 'out-always',
        label: '[Always] Harbor Map',
        isExclusiveChoice: false,
        gold: 10,
        items: ['Coastal Chart'],
        grantsStateTags: ['Harbor_Mapped']
      },
      {
        id: 'out-choice-a',
        label: '[Choice A] Keep Idol',
        isExclusiveChoice: true,
        gold: 25,
        items: ['Cursed Blood Idol'],
        grantsStateTags: ['Idol_Kept']
      },
      {
        id: 'out-choice-b',
        label: '[Choice B] Destroy Idol',
        isExclusiveChoice: true,
        gold: 5,
        items: ['Purified Shard'],
        grantsStateTags: ['Idol_Broken']
      }
    ],
    variants: []
  },
  S01: {
    uid: 'S01',
    id: 'S01',
    title: "Smuggler's Cove",
    tier: 2,
    category: 'SIDE',
    prereqLogic: 'ALL',
    parentSlot: null,
    position: { x: 455, y: 52 },
    flavorText:
      'Using the coastal chart recovered from the shrine, your party locates a hidden sea cave beneath the cathedral cliffs where smugglers move illicit cargo.',
    setupInstructions:
      'Place Tile 2C (Sea Cave). Place 2 Contraband Crates and 4 Dockside Cutthroats.',
    objectives:
      'Secure the smuggler tunnels or bribe the Boatswain to reveal the cathedral undercroft entrance.',
    rewardOutcomes: [
      {
        id: 'out-secret',
        label: 'Undercroft Key',
        isExclusiveChoice: false,
        gold: 15,
        items: ['Rusty Iron Key'],
        grantsStateTags: ['Secret_Passage']
      }
    ],
    variants: []
  },
  M02_A: {
    uid: 'M02_A',
    id: 'M02_A',
    title: 'Hunted by the Cult',
    tier: 2,
    category: 'MAIN_BRANCH',
    prereqLogic: 'ALL',
    requiredTag: 'Idol_Kept',
    parentSlot: 'SLOT_M02',
    position: { x: 455, y: 248 },
    flavorText:
      'The Blood Idol whispers through the night. Drawn by its dark resonance, Fanatic Assassins ambush your camp in the Highgate alleys!',
    setupInstructions:
      'Place Tile 3A (Night Streets). Ambush Rules apply: Enemies act first in Round 1. Spawn 4 Cult Assassins.',
    objectives:
      'Survive 5 rounds and interrogate the Assassin Leader to learn who ordered the bounty.',
    rewardOutcomes: [
      {
        id: 'out-m02a-clear',
        label: 'Cult Cipher',
        isExclusiveChoice: false,
        gold: 20,
        items: ['Bloodstained Orders'],
        grantsStateTags: ['Cult_Tracked']
      }
    ],
    variants: []
  },
  M02_B: {
    uid: 'M02_B',
    id: 'M02_B',
    title: "Temple's Blessing",
    tier: 2,
    category: 'MAIN_BRANCH',
    prereqLogic: 'ALL',
    requiredTag: 'Idol_Broken',
    parentSlot: 'SLOT_M02',
    position: { x: 455, y: 446 },
    flavorText:
      'Word of the Idol’s destruction reaches the Sun Clerics. They welcome you into their fortified cloister to consecrate your weapons for the coming purge.',
    setupInstructions:
      'Place Tile 3B (Sun Cloister). Friendly NPCs: Place 2 Sun Initiates under party control.',
    objectives:
      'Protect the High Cleric during the Consecration Ritual while fending off corrupted gargoyles.',
    rewardOutcomes: [
      {
        id: 'out-m02b-clear',
        label: 'Sun Anointing',
        isExclusiveChoice: false,
        gold: 10,
        items: ['Sun-Blessed Seal'],
        grantsStateTags: ['Sun_Blessed']
      }
    ],
    variants: []
  },
  B01: {
    uid: 'B01',
    id: 'B01',
    title: 'The High Inquisitor',
    tier: 3,
    category: 'BOSS',
    prereqLogic: 'ANY',
    parentSlot: null,
    position: { x: 865, y: 215 },
    flavorText:
      'At the heart of the Grand Basilica stands High Inquisitor Malakor, orchestrating both the city watch and the sunken cult from behind his gilded mask.',
    setupInstructions:
      'Place Boss Tile 4X (Grand Basilica). Spawn High Inquisitor Malakor (Base HP: 40) at the altar and 2 Cathedral Guards at the main doors.',
    objectives: 'Defeat High Inquisitor Malakor.',
    rewardOutcomes: [
      {
        id: 'out-b01-win',
        label: 'Act I Complete',
        isExclusiveChoice: false,
        gold: 50,
        items: ['Inquisitor Signet'],
        grantsStateTags: ['Act1_Cleared']
      }
    ],
    variants: [
      {
        id: 'var_b01_idol_kept',
        requiredStateTag: 'Idol_Kept',
        overrideTitle: 'The High Inquisitor (Blood Awakened)',
        additionalFlavorText:
          'Malakor raises his hand, and the Blood Idol in your pack violently tears itself free, fusing into his scepter with a crimson shockwave!',
        setupModifications:
          'Malakor gains +15 Max HP (55 HP total) and the "Siphon Blood" aura. All heroes start with 1 Bleed token.',
        rewardModifications: 'Bonus Drop: Awakened Blood Scepter (Mythic Weapon).'
      },
      {
        id: 'var_b01_idol_broken',
        requiredStateTag: 'Idol_Broken',
        overrideTitle: 'The High Inquisitor (Shaken Faith)',
        additionalFlavorText:
          'Seeing the shattered remnants of his prized relic, Malakor’s composure cracks. Two of his acolytes hesitate, questioning his divine mandate.',
        setupModifications:
          'Remove 1 Cathedral Guard from setup. Malakor starts with -5 HP (35 HP total) and the "Enraged" status.',
        rewardModifications: 'Bonus Reward: +15 Reputation with the Sun Order.'
      },
      {
        id: 'var_b01_secret',
        requiredStateTag: 'Secret_Passage',
        overrideTitle: '',
        additionalFlavorText:
          'Slipping through the smuggler’s undercroft grate, your party bypasses the heavily fortified basilica nave and strikes from behind the choir loft!',
        setupModifications:
          'Deploy heroes in the Rear Choir Zone instead of the Main Doors. Party gains Surprise Round (free Move or Attack action in Round 1).',
        rewardModifications: 'Keep all looted Contraband Tokens (+10 Gold).'
      }
    ]
  }
};

export const INITIAL_EDGES = [
  { id: 'e-m01-s01', source: 'M01', sourcePortId: 'out-always', target: 'S01', type: 'UNLOCKS', label: 'Unlocks Side' },
  { id: 'e-m02a-b01', source: 'M02_A', sourcePortId: 'out-m02a-clear', target: 'B01', type: 'UNLOCKS', label: 'OR Path A' },
  { id: 'e-m02b-b01', source: 'M02_B', sourcePortId: 'out-m02b-clear', target: 'B01', type: 'UNLOCKS', label: 'OR Path B' },
  { id: 'e-m01-m02a', source: 'M01', sourcePortId: 'out-choice-a', target: 'M02_A', type: 'CHOICE_BRANCH', stateTag: 'Idol_Kept', label: '+Idol_Kept' },
  { id: 'e-m01-m02b', source: 'M01', sourcePortId: 'out-choice-b', target: 'M02_B', type: 'CHOICE_BRANCH', stateTag: 'Idol_Broken', label: '+Idol_Broken' },
  { id: 'e-mut-secret-b01', source: 'S01', sourcePortId: 'out-secret', target: 'B01', type: 'MUTATION', stateTag: 'Secret_Passage', label: '⚡ +Secret_Passage' },
  { id: 'e-mut-kept-b01', source: 'M01', sourcePortId: 'out-choice-a', target: 'B01', type: 'MUTATION', stateTag: 'Idol_Kept', label: '⚡ Mutates B01 (+Idol_Kept)' },
  { id: 'e-mut-broken-b01', source: 'M01', sourcePortId: 'out-choice-b', target: 'B01', type: 'MUTATION', stateTag: 'Idol_Broken', label: '⚡ Mutates B01 (+Idol_Broken)' },
  { id: 'e-lock-m02a-m02b', source: 'M02_A', sourcePortId: null, target: 'M02_B', type: 'LOCKOUT', label: '✕ LOCKS OUT' }
];
```

*(Note: The full interactive component implementation is live in `QuestEditorApp.jsx` in your canvas editor and matches this specification 1:1.)*