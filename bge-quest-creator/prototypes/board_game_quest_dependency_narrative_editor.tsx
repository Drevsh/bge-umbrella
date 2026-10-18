import React, { useState, useRef, useMemo } from 'react';
import {
  GitBranch,
  Layers,
  Sparkles,
  CheckCircle2,
  Lock,
  Play,
  RotateCcw,
  Plus,
  BookOpen,
  Tag,
  Sliders,
  Compass,
  Link2,
  Eye,
  Zap,
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
// DETERMINISTIC SVG GRAPH GEOMETRY CONSTANTS (Dynamic ViewBox Width/Height)
// Guarantees 100% pixel-perfect port-to-arrow alignment at any screen width!
// ============================================================================
const VIEWBOX_W = 1280;
const VIEWBOX_H = 680;
const NODE_WIDTH = 270;
const INPUT_PORT_Y_OFFSET = 44; // Left input port center Y relative to node.y
const REWARD_PORT_BASE_Y = 132; // First right output port center Y relative to node.y
const REWARD_PORT_STEP_Y = 30;  // Vertical spacing between output ports

const getNodeHeight = (quest) => {
  return 122 + quest.rewardOutcomes.length * REWARD_PORT_STEP_Y + 12;
};

const getOutputPortCoords = (quest, portIndex) => ({
  x: quest.position.x + NODE_WIDTH,
  y: quest.position.y + REWARD_PORT_BASE_Y + portIndex * REWARD_PORT_STEP_Y
});

const getInputPortCoords = (quest) => ({
  x: quest.position.x,
  y: quest.position.y + INPUT_PORT_Y_OFFSET
});

// ============================================================================
// INITIAL CAMPAIGN DATA MODEL (Nodes, Ports, Variants, & Explicit Edge List)
// ============================================================================
const INITIAL_QUESTS = {
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

// Explicit Edges connecting Nodes & Ports so all 4 relationship types are crystal clear
const INITIAL_EDGES = [
  // 1. Standard Prerequisite Unlocks (Green)
  {
    id: 'e-m01-s01',
    source: 'M01',
    sourcePortId: 'out-always',
    target: 'S01',
    type: 'UNLOCKS',
    label: 'Unlocks Side'
  },
  {
    id: 'e-m02a-b01',
    source: 'M02_A',
    sourcePortId: 'out-m02a-clear',
    target: 'B01',
    type: 'UNLOCKS',
    label: 'OR Path A'
  },
  {
    id: 'e-m02b-b01',
    source: 'M02_B',
    sourcePortId: 'out-m02b-clear',
    target: 'B01',
    type: 'UNLOCKS',
    label: 'OR Path B'
  },

  // 2. Exclusive Reward Choice Branches (Cyan)
  {
    id: 'e-m01-m02a',
    source: 'M01',
    sourcePortId: 'out-choice-a',
    target: 'M02_A',
    type: 'CHOICE_BRANCH',
    stateTag: 'Idol_Kept',
    label: '+Idol_Kept'
  },
  {
    id: 'e-m01-m02b',
    source: 'M01',
    sourcePortId: 'out-choice-b',
    target: 'M02_B',
    type: 'CHOICE_BRANCH',
    stateTag: 'Idol_Broken',
    label: '+Idol_Broken'
  },

  // 3. State-Tag Variant Mutation Links (Amber Dashed Lines to Boss B01)
  {
    id: 'e-mut-secret-b01',
    source: 'S01',
    sourcePortId: 'out-secret',
    target: 'B01',
    type: 'MUTATION',
    stateTag: 'Secret_Passage',
    label: '⚡ +Secret_Passage'
  },
  {
    id: 'e-mut-kept-b01',
    source: 'M01',
    sourcePortId: 'out-choice-a',
    target: 'B01',
    type: 'MUTATION',
    stateTag: 'Idol_Kept',
    label: '⚡ Mutates B01 (+Idol_Kept)'
  },
  {
    id: 'e-mut-broken-b01',
    source: 'M01',
    sourcePortId: 'out-choice-b',
    target: 'B01',
    type: 'MUTATION',
    stateTag: 'Idol_Broken',
    label: '⚡ Mutates B01 (+Idol_Broken)'
  },

  // 4. Mutually Exclusive Lockout Link between M02_A and M02_B (Red)
  {
    id: 'e-lock-m02a-m02b',
    source: 'M02_A',
    sourcePortId: null,
    target: 'M02_B',
    type: 'LOCKOUT',
    label: '✕ LOCKS OUT'
  }
];

export default function App() {
  // Core Campaign State
  const [quests, setQuests] = useState(INITIAL_QUESTS);
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [selectedQuestId, setSelectedQuestId] = useState('B01');

  // Layout View Mode: 'SPLIT' (Graph + Compact Drawer) | 'FULL_GRAPH' (100% Graph) | 'OVERVIEW' (Matrix Table)
  const [viewMode, setViewMode] = useState('SPLIT');
  const [inspectorTab, setInspectorTab] = useState('BASE');

  // Playtest Simulator State
  const [m01Choice, setM01Choice] = useState('Idol_Kept'); // 'Idol_Kept' | 'Idol_Broken' | 'UNDECIDED'
  const [s01Completed, setS01Completed] = useState(true);
  const [customCompletedIds, setCustomCompletedIds] = useState(() => new Set());

  // Graph Visualization & Edge Controls
  const [edgeRoutingStyle, setEdgeRoutingStyle] = useState('BEZIER'); // 'BEZIER' | 'STEP' | 'STRAIGHT'
  const [hSpacingPreset, setHSpacingPreset] = useState('BALANCED');
  const [vSpacingScale, setVSpacingScale] = useState(1);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [animateFlow, setAnimateFlow] = useState(true);
  const [edgeFilters, setEdgeFilters] = useState({
    UNLOCKS: true,
    CHOICE_BRANCH: true,
    MUTATION: true,
    LOCKOUT: true
  });

  // Interactive SVG Dragging & Port Connection Refs/States
  const svgRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [mouseSvgPos, setMouseSvgPos] = useState({ x: 0, y: 0 });
  const [newEdgeType, setNewEdgeType] = useState('UNLOCKS');

  // Guided New Quest Creation Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    id: 'S02',
    title: 'The Watchtower Signal',
    category: 'SIDE',
    tier: 2,
    prereqLogic: 'ALL',
    selectedPrereqs: [{ questId: 'M01', portId: 'out-always', relation: 'UNLOCKS' }],
    locksOutQuestId: '',
    rewardOutcomes: [
      {
        id: 'out-wiz-1',
        label: 'Signal Beacon Lit',
        isExclusiveChoice: false,
        gold: 15,
        items: ['Watchman Flare'],
        grantsStateTags: ['Beacon_Lit']
      }
    ],
    downstreamTargetId: 'B01',
    downstreamRelation: 'MUTATION',
    downstreamMutationText: 'Allied archers fire a volley at the start of Round 1 (Deal 8 damage to Boss).',
    flavorText: 'Atop the ruined sea-watch tower, an ancient brazier awaits ignition to alert the fleet.',
    setupInstructions: 'Place Tile 2B (Watchtower). Spawn 3 Harpy Raiders and 1 Unlit Brazier objective token.',
    objectives: 'Light the brazier and defend it for 3 rounds.'
  });

  // Inspector Quick-Add Form States
  const [newVariantTag, setNewVariantTag] = useState('');
  const [newRewardLabel, setNewRewardLabel] = useState('');
  const [newRewardTag, setNewRewardTag] = useState('');
  const [exportBanner, setExportBanner] = useState(null);

  // ==========================================================================
  // JSON & CSV EXPORT HANDLERS (For NanDeck / InDesign Data Merge)
  // ==========================================================================
  const handleExportJSON = () => {
    const payload = { quests, edges, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campaign-quests-graph.json';
    a.click();
    URL.revokeObjectURL(url);
    setExportBanner('Exported campaign-quests-graph.json!');
    setTimeout(() => setExportBanner(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = [
      'Quest_ID',
      'Title',
      'Parallel_Tier',
      'Category',
      'Prereq_Logic',
      'Flavor_Text',
      'Setup_Instructions',
      'Objectives',
      'Reward_Branches',
      'Granted_State_Tags',
      'Conditional_Variants'
    ];
    const rows = Object.values(quests).map((q) => {
      const rewardsStr = q.rewardOutcomes.map((r) => `${r.label} (${r.gold}g)`).join(' | ');
      const tagsStr = q.rewardOutcomes.flatMap((r) => r.grantsStateTags).join(', ');
      const varsStr = q.variants
        .map((v) => `[If ${v.requiredStateTag}: ${v.setupModifications}]`)
        .join(' | ');
      return [
        q.id,
        `"${(q.title || '').replace(/"/g, '""')}"`,
        q.tier,
        q.category,
        q.prereqLogic,
        `"${(q.flavorText || '').replace(/"/g, '""')}"`,
        `"${(q.setupInstructions || '').replace(/"/g, '""')}"`,
        `"${(q.objectives || '').replace(/"/g, '""')}"`,
        `"${rewardsStr.replace(/"/g, '""')}"`,
        `"${tagsStr}"`,
        `"${varsStr.replace(/"/g, '""')}"`
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nandeck-quest-cards.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExportBanner('Exported nandeck-quest-cards.csv for Card Printing!');
    setTimeout(() => setExportBanner(null), 3000);
  };

  // ==========================================================================
  // SIMULATOR DERIVED STATE (Includes user-created quests & state tags)
  // ==========================================================================
  const activeStateTags = useMemo(() => {
    const tags = new Set();
    if (m01Choice !== 'UNDECIDED') {
      tags.add('Harbor_Mapped');
      tags.add(m01Choice);
      if (m01Choice === 'Idol_Kept') tags.add('Cult_Tracked');
      if (m01Choice === 'Idol_Broken') tags.add('Sun_Blessed');
    }
    if (s01Completed && m01Choice !== 'UNDECIDED') {
      tags.add('Secret_Passage');
    }
    // Include tags from any custom completed quests
    customCompletedIds.forEach((qId) => {
      const q = quests[qId];
      if (q) {
        q.rewardOutcomes.forEach((ro) => {
          ro.grantsStateTags.forEach((t) => tags.add(t));
        });
      }
    });
    return tags;
  }, [m01Choice, s01Completed, customCompletedIds, quests]);

  const getQuestStatus = (qId) => {
    if (m01Choice === 'UNDECIDED') return 'DESIGN';
    if (qId === 'M01') return 'COMPLETED';
    if (qId === 'S01') return s01Completed ? 'COMPLETED' : 'AVAILABLE';
    if (qId === 'M02_A') return m01Choice === 'Idol_Kept' ? 'COMPLETED' : 'LOCKED_OUT';
    if (qId === 'M02_B') return m01Choice === 'Idol_Broken' ? 'COMPLETED' : 'LOCKED_OUT';
    if (customCompletedIds.has(qId)) return 'COMPLETED';
    return 'AVAILABLE';
  };

  // ==========================================================================
  // TRUE SVG MATRIX COORDINATE CONVERSION (getScreenCTM().inverse())
  // Ensures 1:1 mouse-to-node dragging regardless of aspect ratio or zoom!
  // ==========================================================================
  const getSvgCoords = (e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    if (svg.createSVGPoint && svg.getScreenCTM) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const transformed = pt.matrixTransform(ctm.inverse());
        return { x: transformed.x, y: transformed.y };
      }
    }
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (VIEWBOX_W / rect.width),
      y: (e.clientY - rect.top) * (VIEWBOX_H / rect.height)
    };
  };

  const handleNodePointerDown = (e, qId) => {
    e.stopPropagation();
    setSelectedQuestId(qId);
    setDraggingId(qId);
    const coords = getSvgCoords(e);
    const q = quests[qId];
    dragOffset.current = {
      x: coords.x - q.position.x,
      y: coords.y - q.position.y
    };
  };

  const handleSvgPointerMove = (e) => {
    const coords = getSvgCoords(e);
    if (connectingFrom) {
      setMouseSvgPos(coords);
    }
    if (!draggingId) return;
    const rawX = coords.x - dragOffset.current.x;
    const rawY = coords.y - dragOffset.current.y;
    const snappedX = snapToGrid ? Math.round(rawX / 16) * 16 : Math.round(rawX);
    const snappedY = snapToGrid ? Math.round(rawY / 16) * 16 : Math.round(rawY);
    const newX = Math.max(12, Math.min(VIEWBOX_W - NODE_WIDTH - 16, snappedX));
    const newY = Math.max(42, Math.min(VIEWBOX_H - 150, snappedY));

    setQuests((prev) => ({
      ...prev,
      [draggingId]: {
        ...prev[draggingId],
        position: { x: newX, y: newY }
      }
    }));
  };

  const handleSvgPointerUp = () => {
    setDraggingId(null);
  };

  // ==========================================================================
  // INTERACTIVE SPACING & AUTO-LAYOUT ENGINE
  // ==========================================================================
  const applyLayoutSpacing = (hPreset = hSpacingPreset, vScale = vSpacingScale) => {
    setHSpacingPreset(hPreset);
    setVSpacingScale(vScale);

    const tierXMap =
      hPreset === 'COMPACT'
        ? { 1: 36, 2: 375, 3: 715, 4: 990 }
        : hPreset === 'WIDE'
        ? { 1: 32, 2: 475, 3: 925, 4: 1000 }
        : { 1: 45, 2: 455, 3: 865, 4: 995 };

    // Group quests by tier and preserve relative vertical order
    const byTier = {};
    Object.values(quests).forEach((q) => {
      const t = q.tier || 2;
      if (!byTier[t]) byTier[t] = [];
      byTier[t].push(q);
    });

    const updated = { ...quests };
    Object.keys(byTier).forEach((tKey) => {
      const tierNum = Number(tKey);
      const list = byTier[tierNum].sort((a, b) => a.position.y - b.position.y);
      const targetX = tierXMap[tierNum] || 455;

      let cursorY = list.length === 1 ? Math.round(195 * vScale) : 52;
      list.forEach((q) => {
        updated[q.id] = {
          ...q,
          position: {
            x: targetX,
            y: Math.min(VIEWBOX_H - getNodeHeight(q) - 14, Math.round(cursorY))
          }
        };
        cursorY += Math.round((getNodeHeight(q) + 28) * vScale);
      });
    });

    setQuests(updated);
  };

  // ==========================================================================
  // GUIDED NEW QUEST WIZARD HANDLERS
  // ==========================================================================
  const openWizardForTier = (defaultTier = 2, defaultCategory = 'SIDE') => {
    const prefix =
      defaultCategory === 'MAIN'
        ? 'M'
        : defaultCategory === 'FACTION'
        ? 'F'
        : defaultCategory === 'BOSS'
        ? 'B'
        : 'S';
    const existingCount = Object.keys(quests).filter((k) => k.startsWith(prefix)).length + 1;
    const suggestedId = `${prefix}0${existingCount}`;

    setWizardData((prev) => ({
      ...prev,
      category: defaultCategory,
      tier: defaultTier,
      id: quests[suggestedId] ? `${prefix}0${existingCount + 1}` : suggestedId,
      title: defaultTier === 1 ? 'The Harbor Blockade' : defaultTier === 3 ? 'Sanctum Showdown' : 'The Watchtower Signal',
      prereqLogic: defaultTier === 1 ? 'START' : 'ALL',
      selectedPrereqs:
        defaultTier === 1
          ? []
          : defaultTier === 2
          ? [{ questId: 'M01', portId: 'out-always', relation: 'UNLOCKS' }]
          : [{ questId: 'S01', portId: 'out-secret', relation: 'UNLOCKS' }]
    }));
    setWizardStep(1);
    setWizardOpen(true);
  };

  const handleToggleWizardPrereq = (questId, portId, defaultRel = 'UNLOCKS') => {
    setWizardData((prev) => {
      const exists = prev.selectedPrereqs.some(
        (p) => p.questId === questId && p.portId === portId
      );
      if (exists) {
        return {
          ...prev,
          selectedPrereqs: prev.selectedPrereqs.filter(
            (p) => !(p.questId === questId && p.portId === portId)
          )
        };
      }
      return {
        ...prev,
        selectedPrereqs: [
          ...prev.selectedPrereqs,
          { questId, portId, relation: defaultRel }
        ]
      };
    });
  };

  const handleCompleteWizard = () => {
    const cleanId = (wizardData.id.trim() || `Q${Object.keys(quests).length + 1}`).replace(/\s+/g, '_');
    const tierNum = Number(wizardData.tier) || 2;

    // Calculate a non-overlapping position in the chosen Tier column
    const tierX = tierNum === 1 ? 45 : tierNum === 2 ? 455 : 865;
    const sameTierQuests = Object.values(quests).filter((q) => q.tier === tierNum);
    const maxY = sameTierQuests.reduce(
      (max, q) => Math.max(max, q.position.y + getNodeHeight(q)),
      35
    );
    const placedY = Math.min(VIEWBOX_H - 180, maxY + 24);
    const placedX = maxY + 180 > VIEWBOX_H ? tierX + 45 : tierX;

    const newQuestNode = {
      uid: cleanId,
      id: cleanId,
      title: wizardData.title.trim() || 'Untitled Quest',
      tier: tierNum,
      category: wizardData.category,
      prereqLogic: tierNum === 1 ? 'START' : wizardData.prereqLogic,
      parentSlot: null,
      position: { x: placedX, y: placedY },
      flavorText: wizardData.flavorText,
      setupInstructions: wizardData.setupInstructions,
      objectives: wizardData.objectives,
      rewardOutcomes: wizardData.rewardOutcomes.map((ro, i) => ({
        ...ro,
        id: ro.id || `out-${cleanId}-${i}`
      })),
      variants: []
    };

    const createdEdges = [];

    // 1. Incoming Prerequisite / Choice Branch Edges
    if (tierNum !== 1) {
      wizardData.selectedPrereqs.forEach((p, idx) => {
        const srcQ = quests[p.questId];
        const portObj = srcQ?.rewardOutcomes.find((r) => r.id === p.portId);
        const grantedTag = portObj?.grantsStateTags?.[0] || null;
        const isChoice = portObj?.isExclusiveChoice;
        createdEdges.push({
          id: `e-wiz-in-${cleanId}-${idx}-${Date.now()}`,
          source: p.questId,
          sourcePortId: p.portId,
          target: cleanId,
          type: isChoice ? 'CHOICE_BRANCH' : 'UNLOCKS',
          stateTag: grantedTag,
          label: grantedTag ? `+${grantedTag}` : 'Unlocks'
        });
      });
    }

    // 2. Optional Mutual Lockout Edge
    if (wizardData.locksOutQuestId && quests[wizardData.locksOutQuestId]) {
      createdEdges.push({
        id: `e-wiz-lock-${cleanId}-${Date.now()}`,
        source: cleanId,
        sourcePortId: null,
        target: wizardData.locksOutQuestId,
        type: 'LOCKOUT',
        label: '✕ LOCKS OUT'
      });
    }

    // 3. Downstream Unlock or State-Tag Mutation Edge
    const primaryOutcome = newQuestNode.rewardOutcomes[0];
    const primaryTag = primaryOutcome?.grantsStateTags?.[0] || `${cleanId}_Cleared`;
    if (
      wizardData.downstreamTargetId &&
      wizardData.downstreamRelation !== 'NONE' &&
      quests[wizardData.downstreamTargetId]
    ) {
      createdEdges.push({
        id: `e-wiz-out-${cleanId}-${Date.now()}`,
        source: cleanId,
        sourcePortId: primaryOutcome.id,
        target: wizardData.downstreamTargetId,
        type: wizardData.downstreamRelation,
        stateTag: primaryTag,
        label:
          wizardData.downstreamRelation === 'MUTATION'
            ? `⚡ +${primaryTag}`
            : `Unlocks ${wizardData.downstreamTargetId}`
      });
    }

    setQuests((prev) => {
      const next = { ...prev, [cleanId]: newQuestNode };
      // If downstreamRelation === 'MUTATION', also inject the conditional variant on the target quest!
      if (
        wizardData.downstreamTargetId &&
        wizardData.downstreamRelation === 'MUTATION' &&
        next[wizardData.downstreamTargetId]
      ) {
        const targetQ = next[wizardData.downstreamTargetId];
        next[wizardData.downstreamTargetId] = {
          ...targetQ,
          variants: [
            ...targetQ.variants,
            {
              id: `var_${Date.now()}`,
              requiredStateTag: primaryTag,
              overrideTitle: '',
              additionalFlavorText: `Triggered by completing ${cleanId} ([${primaryTag}]).`,
              setupModifications:
                wizardData.downstreamMutationText ||
                `Modify setup when party has [${primaryTag}].`,
              rewardModifications: '+10 Bonus Gold'
            }
          ]
        };
      }
      return next;
    });

    setEdges((prev) => [...prev, ...createdEdges]);
    setCustomCompletedIds((prev) => new Set(prev).add(cleanId));
    setSelectedQuestId(cleanId);
    setInspectorTab('BASE');
    setWizardOpen(false);
  };

  // Start drawing a new arrow from an Output Port
  const handleStartConnect = (e, quest, outcome, portIndex) => {
    e.stopPropagation();
    const pt = getOutputPortCoords(quest, portIndex);
    setConnectingFrom({
      questId: quest.id,
      portId: outcome.id,
      portLabel: outcome.label,
      stateTag: outcome.grantsStateTags[0] || null,
      x: pt.x,
      y: pt.y
    });
    setMouseSvgPos(pt);
  };

  // Complete drawing a new arrow onto a Target Node's Input Port
  const handleCompleteConnect = (e, targetQuestId) => {
    e.stopPropagation();
    if (!connectingFrom || connectingFrom.questId === targetQuestId) {
      setConnectingFrom(null);
      return;
    }
    const newEdge = {
      id: `e-custom-${Date.now()}`,
      source: connectingFrom.questId,
      sourcePortId: connectingFrom.portId,
      target: targetQuestId,
      type: newEdgeType,
      stateTag: connectingFrom.stateTag,
      label:
        newEdgeType === 'MUTATION'
          ? `⚡ Mutates ${targetQuestId}`
          : newEdgeType === 'LOCKOUT'
          ? '✕ LOCKS OUT'
          : connectingFrom.stateTag
          ? `+${connectingFrom.stateTag}`
          : 'Unlocks'
    };
    setEdges((prev) => [...prev, newEdge]);
    setConnectingFrom(null);
  };

  const deleteEdge = (edgeId) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
  };

  const resetAll = () => {
    setQuests(INITIAL_QUESTS);
    setEdges(INITIAL_EDGES);
    setConnectingFrom(null);
    setM01Choice('Idol_Kept');
    setS01Completed(true);
  };

  // ==========================================================================
  // GEOMETRIC PATH BUILDERS (Curved Bézier, Orthogonal Step, Straight Direct)
  // ==========================================================================
  const computeEdgePathAndMidpoint = (x1, y1, x2, y2, style, isMutation, edgeId) => {
    if (style === 'STRAIGHT') {
      return {
        d: `M ${x1} ${y1} L ${x2} ${y2}`,
        mx: (x1 + x2) / 2,
        my: (y1 + y2) / 2
      };
    }

    if (style === 'STEP') {
      const midX = x1 + (x2 - x1) * (isMutation ? 0.65 : 0.48);
      return {
        d: `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`,
        mx: midX,
        my: (y1 + y2) / 2
      };
    }

    // Default: Smooth Cubic Bézier with high visibility curvature
    const dx = Math.max(85, Math.abs(x2 - x1) * 0.48);
    // Arch long-distance M01 -> B01 mutation lines cleanly so they don't hide behind Tier 2 cards
    let curveOffsetY = 0;
    if (edgeId === 'e-mut-kept-b01') curveOffsetY = -75;
    else if (edgeId === 'e-mut-broken-b01') curveOffsetY = 85;
    else if (isMutation) curveOffsetY = -28;

    const c1x = x1 + dx;
    const c1y = y1 + curveOffsetY;
    const c2x = x2 - dx;
    const c2y = y2 + curveOffsetY;

    // Cubic Bézier midpoint at t = 0.5
    const mx = 0.125 * x1 + 0.375 * c1x + 0.375 * c2x + 0.125 * x2;
    const my = 0.125 * y1 + 0.375 * c1y + 0.375 * c2y + 0.125 * y2;

    return {
      d: `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`,
      mx,
      my
    };
  };

  // ==========================================================================
  // QUEST & VARIANT MUTATION HANDLERS
  // ==========================================================================
  const selectedQuest = quests[selectedQuestId];

  const updateSelectedQuestField = (field, value) => {
    setQuests((prev) => ({
      ...prev,
      [selectedQuestId]: {
        ...prev[selectedQuestId],
        [field]: value
      }
    }));
  };

  const updateVariantField = (variantId, field, value) => {
    setQuests((prev) => ({
      ...prev,
      [selectedQuestId]: {
        ...prev[selectedQuestId],
        variants: prev[selectedQuestId].variants.map((v) =>
          v.id === variantId ? { ...v, [field]: value } : v
        )
      }
    }));
  };

  const handleAddVariant = () => {
    const cleanTag = newVariantTag.trim() || 'Custom_Tag';
    const newVar = {
      id: 'var_' + Date.now(),
      requiredStateTag: cleanTag,
      overrideTitle: '',
      additionalFlavorText: `If party has [${cleanTag}], read this additional narrative section...`,
      setupModifications: `Modify setup for [${cleanTag}]: Spawn 1 Elite Champion.`,
      rewardModifications: 'Add +10 Bonus Gold.'
    };
    setQuests((prev) => ({
      ...prev,
      [selectedQuestId]: {
        ...prev[selectedQuestId],
        variants: [...prev[selectedQuestId].variants, newVar]
      }
    }));
    setNewVariantTag('');
    setInspectorTab(newVar.id);
  };

  const handleAddRewardOutcome = () => {
    if (!newRewardLabel.trim()) return;
    const cleanTag = newRewardTag.trim();
    const newOutcome = {
      id: 'out-' + Date.now(),
      label: newRewardLabel.trim(),
      isExclusiveChoice: false,
      gold: 10,
      items: [],
      grantsStateTags: cleanTag ? [cleanTag] : []
    };
    setQuests((prev) => ({
      ...prev,
      [selectedQuestId]: {
        ...prev[selectedQuestId],
        rewardOutcomes: [...prev[selectedQuestId].rewardOutcomes, newOutcome]
      }
    }));
    setNewRewardLabel('');
    setNewRewardTag('');
  };

  // Subflow Container Slot M02 Bounding Box
  const slotM02Bounds = useMemo(() => {
    const a = quests.M02_A.position;
    const b = quests.M02_B.position;
    const hA = getNodeHeight(quests.M02_A);
    const hB = getNodeHeight(quests.M02_B);
    const minX = Math.min(a.x, b.x) - 18;
    const minY = Math.min(a.y, b.y) - 34;
    const maxX = Math.max(a.x, b.x) + NODE_WIDTH + 18;
    const maxY = Math.max(a.y + hA, b.y + hB) + 14;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [quests.M02_A, quests.M02_B]);

  // State Tag Audit List for Overview Tab
  const tagAuditList = useMemo(() => {
    const map = {};
    Object.values(quests).forEach((q) => {
      q.rewardOutcomes.forEach((ro) => {
        ro.grantsStateTags.forEach((tag) => {
          if (!map[tag]) map[tag] = { tag, grantedBy: [], consumedByNodes: [], consumedByVariants: [] };
          map[tag].grantedBy.push(`${q.id} (${ro.label})`);
        });
      });
    });
    Object.values(quests).forEach((q) => {
      if (q.requiredTag) {
        if (!map[q.requiredTag]) {
          map[q.requiredTag] = { tag: q.requiredTag, grantedBy: [], consumedByNodes: [], consumedByVariants: [] };
        }
        map[q.requiredTag].consumedByNodes.push(`${q.id}: ${q.title}`);
      }
      q.variants.forEach((v) => {
        const t = v.requiredStateTag;
        if (!map[t]) {
          map[t] = { tag: t, grantedBy: [], consumedByNodes: [], consumedByVariants: [] };
        }
        map[t].consumedByVariants.push(`${q.id} Variant`);
      });
    });
    return Object.values(map);
  }, [quests]);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden">
      {/* Inline Keyframe Animation for Flowing SVG Arrows */}
      <style>{`
        @keyframes edgeFlowDash {
          to {
            stroke-dashoffset: -28;
          }
        }
        .animate-edge-flow {
          animation: edgeFlowDash 0.85s linear infinite;
        }
      `}</style>

      {/* ===================================================================
          1. TOP HEADER: MODE SWITCHER, GUIDED WIZARD BUTTON & SIMULATOR BAR
      =================================================================== */}
      <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 z-30">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <GitBranch className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white hidden sm:inline">
              QuestFlow Studio
            </span>
          </div>

          {/* Segmented View Mode Switcher */}
          <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewMode('FULL_GRAPH')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'FULL_GRAPH'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Maximize Graph Canvas (100% Width)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Graph</span>
            </button>
            <button
              onClick={() => setViewMode('SPLIT')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'SPLIT'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Split View: Graph Canvas + Quest Inspector"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Graph + Inspector</span>
            </button>
            <button
              onClick={() => setViewMode('OVERVIEW')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'OVERVIEW'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Campaign Matrix & State Tag Audit"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overview &amp; Audit</span>
            </button>
          </div>

          {/* PROMINENT GUIDED NEW QUEST WIZARD CTA & EXPORTERS */}
          <button
            onClick={() => openWizardForTier(2, 'SIDE')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 border border-emerald-400/30 transition"
          >
            <Wand2 className="w-3.5 h-3.5" />
            + Add Quest Node
          </button>

          <button
            onClick={() => applyLayoutSpacing('BALANCED', 1)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition flex items-center gap-1"
            title="Auto-Align Parallel Tiers"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Auto-Align Tiers</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handleExportJSON}
              className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-semibold border border-zinc-800 transition"
              title="Export Full Campaign Graph JSON"
            >
              JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-300 text-[11px] font-semibold border border-zinc-800 transition"
              title="Export CSV for NanDeck / InDesign Card Printing"
            >
              CSV
            </button>
          </div>
        </div>

        {/* Export Toast Notification */}
        {exportBanner && (
          <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold animate-pulse">
            ✓ {exportBanner}
          </div>
        )}

        {/* Playtest Simulator Quick-Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <Play className="w-3 h-3 fill-emerald-400" />
            M01 Reward:
          </span>

          <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded border border-zinc-800 text-[11px]">
            <button
              onClick={() => setM01Choice('Idol_Kept')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                m01Choice === 'Idol_Kept'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🔀 Choice A: +Idol_Kept
            </button>
            <button
              onClick={() => setM01Choice('Idol_Broken')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                m01Choice === 'Idol_Broken'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              🔀 Choice B: +Idol_Broken
            </button>
            <button
              onClick={() => setM01Choice('UNDECIDED')}
              className={`px-2 py-0.5 rounded font-semibold transition ${
                m01Choice === 'UNDECIDED'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Paths
            </button>
          </div>

          <button
            onClick={() => setS01Completed(!s01Completed)}
            disabled={m01Choice === 'UNDECIDED'}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition flex items-center gap-1 ${
              m01Choice === 'UNDECIDED'
                ? 'opacity-40 cursor-not-allowed border-zinc-800 text-zinc-500'
                : s01Completed
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            +Secret_Passage
          </button>

          <button
            onClick={resetAll}
            title="Reset Graph Positions & Edges"
            className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ===================================================================
          2. EDGE, SPACING & LAYOUT VISUALIZATION OPTIONS BAR
      =================================================================== */}
      {viewMode !== 'OVERVIEW' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800 text-xs shrink-0 z-20">
          {/* Edge Routing Style & Colored Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <div className="flex bg-zinc-950 p-0.5 rounded border border-zinc-800">
                {[
                  { id: 'BEZIER', label: 'Curved' },
                  { id: 'STEP', label: 'Orthogonal' },
                  { id: 'STRAIGHT', label: 'Straight' }
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setEdgeRoutingStyle(st.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                      edgeRoutingStyle === st.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Node Spacing & Alignment Controls */}
            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              <AlignHorizontalSpaceAround className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] font-bold uppercase text-zinc-400">
                Tier Space:
              </span>
              {[
                { id: 'COMPACT', label: 'Compact' },
                { id: 'BALANCED', label: 'Balanced' },
                { id: 'WIDE', label: 'Wide' }
              ].map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => applyLayoutSpacing(sp.id, vSpacingScale)}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition ${
                    hSpacingPreset === sp.id
                      ? 'bg-sky-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              <AlignVerticalSpaceAround className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase text-zinc-400">
                Vertical Gap:
              </span>
              {[
                { val: 0.82, label: 'Tight' },
                { val: 1, label: 'Normal' },
                { val: 1.22, label: 'Airy' }
              ].map((vg) => (
                <button
                  key={vg.label}
                  onClick={() => applyLayoutSpacing(hSpacingPreset, vg.val)}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition ${
                    vSpacingScale === vg.val
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {vg.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`px-2 py-0.5 rounded border text-[11px] font-semibold flex items-center gap-1 transition ${
                snapToGrid
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
              title="Snap dragged nodes to 16px alignment grid"
            >
              <Grid className="w-3 h-3" /> Snap Grid
            </button>
          </div>

          {/* Colored Edge Layer Toggles & Drawer Switch */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() =>
                setEdgeFilters((f) => ({ ...f, UNLOCKS: !f.UNLOCKS }))
              }
              className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border flex items-center gap-1 transition ${
                edgeFilters.UNLOCKS
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Unlocks
            </button>

            <button
              onClick={() =>
                setEdgeFilters((f) => ({ ...f, CHOICE_BRANCH: !f.CHOICE_BRANCH }))
              }
              className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border flex items-center gap-1 transition ${
                edgeFilters.CHOICE_BRANCH
                  ? 'bg-sky-500/20 border-sky-500/60 text-sky-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Choices
            </button>

            <button
              onClick={() =>
                setEdgeFilters((f) => ({ ...f, MUTATION: !f.MUTATION }))
              }
              className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold border flex items-center gap-1 transition ${
                edgeFilters.MUTATION
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />⚡ Mutations
            </button>

            <button
              onClick={() =>
                setViewMode(viewMode === 'SPLIT' ? 'FULL_GRAPH' : 'SPLIT')
              }
              className="ml-1 px-2.5 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-semibold flex items-center gap-1"
            >
              {viewMode === 'SPLIT' ? (
                <>
                  <PanelRightClose className="w-3.5 h-3.5" /> Hide Info
                </>
              ) : (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5" /> Quest Info ({selectedQuest.id})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          3. STRICT ROW FLEX WORKSPACE: GRAPH CANVAS IS ALWAYS PRIMARY VIEW!
      =================================================================== */}
      {viewMode !== 'OVERVIEW' ? (
        <div className="flex flex-row flex-1 w-full h-full overflow-hidden relative">
          {/* PRIMARY LEFT/CENTER COLUMN: AUTO-FITTING UNIFIED SVG GRAPH CANVAS */}
          <div
            className="relative flex-1 h-full min-w-0 bg-zinc-950 flex flex-col overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(#27272a 1.5px, transparent 1.5px)',
              backgroundSize: '22px 22px'
            }}
          >
            {/* Interactive Connection Banner when drawing a new arrow */}
            {connectingFrom && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-3 left-4 z-40 inline-flex flex-wrap items-center gap-2.5 px-3.5 py-2 rounded-xl bg-indigo-950/95 border-2 border-indigo-400 text-xs text-indigo-100 shadow-2xl"
              >
                <Link2 className="w-4 h-4 text-indigo-300 animate-pulse" />
                <span>
                  Drawing arrow from <b>{connectingFrom.questId}</b> ({connectingFrom.portLabel}) → Click any target node's green/amber <b>[IN]</b> port on its left edge!
                </span>
                <select
                  value={newEdgeType}
                  onChange={(e) => setNewEdgeType(e.target.value)}
                  className="bg-zinc-900 border border-indigo-400/50 rounded px-2 py-0.5 text-xs text-white font-semibold"
                >
                  <option value="UNLOCKS">Type: Prereq Unlock (Green)</option>
                  <option value="CHOICE_BRANCH">Type: Choice Branch (Cyan)</option>
                  <option value="MUTATION">Type: State-Tag Mutation (Amber)</option>
                </select>
                <button
                  onClick={() => setConnectingFrom(null)}
                  className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* UNIFIED AUTO-SCALING SVG GRAPH & NODE CANVAS */}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              preserveAspectRatio="xMidYMid meet"
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onClick={() => setConnectingFrom(null)}
              className="w-full h-full flex-1 select-none touch-none"
            >
              <defs>
                {/* High-contrast Arrowhead Markers */}
                <marker
                  id="arrow-emerald"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6.5"
                  markerHeight="6.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
                <marker
                  id="arrow-sky"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6.5"
                  markerHeight="6.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
                <marker
                  id="arrow-amber"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6.5"
                  markerHeight="6.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                </marker>
                <marker
                  id="arrow-rose"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
                </marker>
                <marker
                  id="arrow-muted"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#52525b" />
                </marker>

                {/* Subtle Card Drop Shadow */}
                <filter id="node-shadow" x="-10%" y="-10%" width="125%" height="125%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.55" />
                </filter>
              </defs>

              {/* 3A. SWIMLANE COLUMN DIVIDERS & HEADERS WITH QUICK "+ ADD QUEST" BUTTONS */}
              <g>
                <rect x="385" y="0" width="420" height={VIEWBOX_H} fill="#18181b" fillOpacity="0.35" />
                <line x1="385" y1="0" x2="385" y2={VIEWBOX_H} stroke="#27272a" strokeWidth="2" strokeDasharray="6,6" />
                <line x1="805" y1="0" x2="805" y2={VIEWBOX_H} stroke="#27272a" strokeWidth="2" strokeDasharray="6,6" />

                {/* Tier 1 Header + Quick Add */}
                <g transform="translate(24, 10)">
                  <rect width="310" height="28" rx="14" fill="#18181b" stroke="#3f3f46" strokeWidth="1.2" />
                  <text x="16" y="18" fill="#a1a1aa" fontSize="10.5" fontWeight="800">
                    TIER 1: STARTER QUESTS
                  </text>
                  <g
                    transform="translate(226, 4)"
                    onClick={(e) => {
                      e.stopPropagation();
                      openWizardForTier(1, 'MAIN');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect width="78" height="20" rx="10" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1" />
                    <text x="39" y="13.5" textAnchor="middle" fill="#6ee7b7" fontSize="9.5" fontWeight="800">
                      + Add Tier 1
                    </text>
                  </g>
                </g>

                {/* Tier 2 Header + Quick Add */}
                <g transform="translate(425, 10)">
                  <rect width="345" height="28" rx="14" fill="#18181b" stroke="#3f3f46" strokeWidth="1.2" />
                  <text x="16" y="18" fill="#38bdf8" fontSize="10.5" fontWeight="800">
                    TIER 2: PARALLEL &amp; BRANCHING
                  </text>
                  <g
                    transform="translate(260, 4)"
                    onClick={(e) => {
                      e.stopPropagation();
                      openWizardForTier(2, 'SIDE');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect width="80" height="20" rx="10" fill="#0284c7" fillOpacity="0.25" stroke="#38bdf8" strokeWidth="1" />
                    <text x="40" y="13.5" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontWeight="800">
                      + Add Tier 2
                    </text>
                  </g>
                </g>

                {/* Tier 3 Header + Quick Add */}
                <g transform="translate(835, 10)">
                  <rect width="345" height="28" rx="14" fill="#18181b" stroke="#3f3f46" strokeWidth="1.2" />
                  <text x="16" y="18" fill="#fbbf24" fontSize="10.5" fontWeight="800">
                    TIER 3: ACT CLIMAX &amp; FINALE
                  </text>
                  <g
                    transform="translate(260, 4)"
                    onClick={(e) => {
                      e.stopPropagation();
                      openWizardForTier(3, 'BOSS');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect width="80" height="20" rx="10" fill="#d97706" fillOpacity="0.25" stroke="#fbbf24" strokeWidth="1" />
                    <text x="40" y="13.5" textAnchor="middle" fill="#fde68a" fontSize="9.5" fontWeight="800">
                      + Add Tier 3
                    </text>
                  </g>
                </g>
              </g>

              {/* 3B. SUBFLOW SLOT M02 CONTAINER BOX */}
              <g>
                <rect
                  x={slotM02Bounds.x}
                  y={slotM02Bounds.y}
                  width={slotM02Bounds.width}
                  height={slotM02Bounds.height}
                  rx="16"
                  fill="#0c4a6e"
                  fillOpacity="0.12"
                  stroke="#38bdf8"
                  strokeOpacity="0.5"
                  strokeWidth="2"
                  strokeDasharray="8,5"
                />
                <rect
                  x={slotM02Bounds.x}
                  y={slotM02Bounds.y}
                  width={slotM02Bounds.width}
                  height="26"
                  rx="12"
                  fill="#082f49"
                  fillOpacity="0.9"
                />
                <text
                  x={slotM02Bounds.x + 14}
                  y={slotM02Bounds.y + 17}
                  fill="#7dd3fc"
                  fontSize="10.5"
                  fontWeight="800"
                  letterSpacing="0.04em"
                >
                  SUBFLOW SLOT M02: THE AFTERMATH (REPLACEMENT BRANCH)
                </text>
              </g>

              {/* 3C. QUEST NODES RENDERED DIRECTLY IN UNIFIED SVG */}
              {Object.values(quests).map((q) => {
                const status = getQuestStatus(q.id);
                const isSelected = selectedQuestId === q.id;
                const isBeingDragged = draggingId === q.id;
                const nodeH = getNodeHeight(q);
                const activeVariantsOnNode = q.variants.filter((v) =>
                  activeStateTags.has(v.requiredStateTag)
                );
                const displayTitle =
                  activeVariantsOnNode.find((v) => v.overrideTitle)?.overrideTitle || q.title;

                const borderStroke = isBeingDragged
                  ? '#38bdf8'
                  : isSelected
                  ? '#818cf8'
                  : status === 'COMPLETED'
                  ? '#10b981'
                  : status === 'LOCKED_OUT'
                  ? '#ef4444'
                  : '#52525b';

                return (
                  <g
                    key={q.id}
                    transform={`translate(${q.position.x}, ${q.position.y})`}
                    onPointerDown={(e) => handleNodePointerDown(e, q.id)}
                    style={{
                      cursor: isBeingDragged ? 'grabbing' : 'grab',
                      opacity: status === 'LOCKED_OUT' ? 0.52 : 1
                    }}
                  >
                    {/* Live Coordinates Tooltip Pill While Dragging */}
                    {isBeingDragged && (
                      <g transform="translate(0, -24)">
                        <rect
                          width="135"
                          height="19"
                          rx="5"
                          fill="#0284c7"
                          stroke="#7dd3fc"
                          strokeWidth="1"
                        />
                        <text
                          x="67"
                          y="13"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="800"
                          fontFamily="monospace"
                        >
                          ✥ X:{q.position.x} Y:{q.position.y}
                        </text>
                      </g>
                    )}

                    {/* Selection Outer Halo */}
                    {isSelected && (
                      <rect
                        x="-4"
                        y="-4"
                        width={NODE_WIDTH + 8}
                        height={nodeH + 8}
                        rx="16"
                        fill="none"
                        stroke="#6366f1"
                        strokeOpacity="0.45"
                        strokeWidth="4"
                      />
                    )}

                    {/* Card Main Background */}
                    <rect
                      width={NODE_WIDTH}
                      height={nodeH}
                      rx="12"
                      fill="#18181b"
                      stroke={borderStroke}
                      strokeWidth={isSelected ? '2.8' : '2'}
                      filter="url(#node-shadow)"
                    />

                    {/* Card Header Bar */}
                    <rect
                      width={NODE_WIDTH}
                      height="28"
                      rx="12"
                      fill="#09090b"
                    />
                    <line
                      x1="0"
                      y1="28"
                      x2={NODE_WIDTH}
                      y2="28"
                      stroke="#27272a"
                      strokeWidth="1.5"
                    />

                    {/* Quest ID & Logic Gate Badge */}
                    <text
                      x="12"
                      y="18"
                      fill="#818cf8"
                      fontSize="12"
                      fontWeight="800"
                      fontFamily="monospace"
                    >
                      {q.id}
                    </text>

                    <rect
                      x="54"
                      y="6"
                      width="64"
                      height="16"
                      rx="4"
                      fill={
                        q.prereqLogic === 'ANY'
                          ? '#451a03'
                          : q.prereqLogic === 'ALL'
                          ? '#064e3b'
                          : '#27272a'
                      }
                      stroke={
                        q.prereqLogic === 'ANY'
                          ? '#f59e0b'
                          : q.prereqLogic === 'ALL'
                          ? '#10b981'
                          : '#52525b'
                      }
                      strokeWidth="1"
                    />
                    <text
                      x="86"
                      y="17"
                      textAnchor="middle"
                      fill={
                        q.prereqLogic === 'ANY'
                          ? '#fcd34d'
                          : q.prereqLogic === 'ALL'
                          ? '#6ee7b7'
                          : '#a1a1aa'
                      }
                      fontSize="9.5"
                      fontWeight="800"
                      fontFamily="monospace"
                    >
                      {q.prereqLogic === 'ANY'
                        ? 'OR GATE'
                        : q.prereqLogic === 'ALL'
                        ? 'AND GATE'
                        : 'START'}
                    </text>

                    {/* Status Text on Right of Header */}
                    <text
                      x={NODE_WIDTH - 12}
                      y="18"
                      textAnchor="end"
                      fill={
                        status === 'COMPLETED'
                          ? '#34d399'
                          : status === 'LOCKED_OUT'
                          ? '#f87171'
                          : '#38bdf8'
                      }
                      fontSize="10.5"
                      fontWeight="800"
                    >
                      {status === 'COMPLETED'
                        ? '✓ ACTIVE'
                        : status === 'LOCKED_OUT'
                        ? '✕ LOCKED OUT'
                        : '● UNLOCKED'}
                    </text>

                    {/* Quest Title */}
                    <text
                      x="14"
                      y="50"
                      fill="#ffffff"
                      fontSize="13.5"
                      fontWeight="800"
                    >
                      {displayTitle.length > 30
                        ? displayTitle.slice(0, 29) + '…'
                        : displayTitle}
                    </text>

                    {/* Required State Tag Or Variant Badges */}
                    {q.requiredTag && (
                      <g transform="translate(14, 59)">
                        <rect
                          width="148"
                          height="18"
                          rx="4"
                          fill="#082f49"
                          stroke="#0284c7"
                          strokeWidth="1"
                        />
                        <text
                          x="7"
                          y="12.5"
                          fill="#7dd3fc"
                          fontSize="10"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          Requires: [{q.requiredTag}]
                        </text>
                      </g>
                    )}

                    {/* Conditional Variant Pills on Boss B01 */}
                    {q.variants.length > 0 && (
                      <g transform="translate(14, 58)">
                        {q.variants.map((v, vIdx) => {
                          const isTrig = activeStateTags.has(v.requiredStateTag);
                          const pillX = (vIdx % 2) * 122;
                          const pillY = Math.floor(vIdx / 2) * 20;
                          return (
                            <g
                              key={v.id}
                              transform={`translate(${pillX}, ${pillY})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedQuestId(q.id);
                                setInspectorTab(v.id);
                                setViewMode('SPLIT');
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <rect
                                width="118"
                                height="17"
                                rx="4"
                                fill={isTrig ? '#f59e0b' : '#27272a'}
                                stroke={isTrig ? '#fde68a' : '#3f3f46'}
                                strokeWidth="1"
                              />
                              <text
                                x="59"
                                y="12"
                                textAnchor="middle"
                                fill={isTrig ? '#09090b' : '#a1a1aa'}
                                fontSize="9.5"
                                fontWeight="800"
                                fontFamily="monospace"
                              >
                                ⚡ {v.requiredStateTag}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* Divider above Output Ports */}
                    <line
                      x1="0"
                      y1="100"
                      x2={NODE_WIDTH}
                      y2="100"
                      stroke="#27272a"
                      strokeWidth="1.5"
                    />
                    <text
                      x="12"
                      y="114"
                      fill="#71717a"
                      fontSize="9.5"
                      fontWeight="800"
                      letterSpacing="0.05em"
                    >
                      REWARD &amp; OUTCOME PORTS (CLICK ROW OR PORT)
                    </text>

                    {/* LEFT INPUT PORT (TARGET HANDLE) */}
                    {q.prereqLogic !== 'START' && (
                      <g
                        transform={`translate(0, ${INPUT_PORT_Y_OFFSET})`}
                        onClick={(e) => handleCompleteConnect(e, q.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle
                          r={connectingFrom ? '11' : '8'}
                          fill={
                            connectingFrom
                              ? '#34d399'
                              : q.prereqLogic === 'ANY'
                              ? '#f59e0b'
                              : '#10b981'
                          }
                          stroke="#09090b"
                          strokeWidth="2.5"
                        />
                        <circle r="3" fill="#09090b" />
                      </g>
                    )}

                    {/* RIGHT REWARD OUTCOME ROWS & SOURCE PORTS */}
                    {q.rewardOutcomes.map((ro, idx) => {
                      const rowY = REWARD_PORT_BASE_Y + idx * REWARD_PORT_STEP_Y - 13;
                      const portCenterY = REWARD_PORT_BASE_Y + idx * REWARD_PORT_STEP_Y;

                      const isChosenInSim =
                        m01Choice !== 'UNDECIDED' &&
                        ((!ro.isExclusiveChoice && status !== 'LOCKED_OUT') ||
                          ro.grantsStateTags.includes(m01Choice));

                      return (
                        <g key={ro.id}>
                          {/* Clickable Outcome Row */}
                          <g
                            transform={`translate(10, ${rowY})`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (q.id === 'M01' && ro.isExclusiveChoice) {
                                setM01Choice(ro.grantsStateTags[0]);
                              } else if (q.id === 'S01') {
                                setS01Completed(!s01Completed);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <rect
                              width={NODE_WIDTH - 20}
                              height="25"
                              rx="6"
                              fill={isChosenInSim ? '#064e3b' : '#09090b'}
                              stroke={isChosenInSim ? '#10b981' : '#27272a'}
                              strokeWidth="1.4"
                            />
                            <text
                              x="8"
                              y="16"
                              fill={isChosenInSim ? '#ecfdf5' : '#d4d4d8'}
                              fontSize="10.5"
                              fontWeight="700"
                            >
                              {ro.isExclusiveChoice ? '🔀 ' : '✓ '}
                              {ro.label.length > 21 ? ro.label.slice(0, 20) + '…' : ro.label}
                            </text>
                            {ro.grantsStateTags[0] && (
                              <text
                                x={NODE_WIDTH - 28}
                                y="16"
                                textAnchor="end"
                                fill="#38bdf8"
                                fontSize="9.5"
                                fontWeight="800"
                                fontFamily="monospace"
                              >
                                +{ro.grantsStateTags[0]}
                              </text>
                            )}
                          </g>

                          {/* Right Output Port Circle (Click to draw a custom arrow) */}
                          <g
                            transform={`translate(${NODE_WIDTH}, ${portCenterY})`}
                            onClick={(e) => handleStartConnect(e, q, ro, idx)}
                            style={{ cursor: 'crosshair' }}
                          >
                            <circle
                              r="7.5"
                              fill={ro.isExclusiveChoice ? '#38bdf8' : '#10b981'}
                              stroke="#09090b"
                              strokeWidth="2.5"
                            />
                            <circle r="2.5" fill="#09090b" />
                          </g>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* 3D. HIGH-CONTRAST SVG EDGES & ARROWS LAYER (Rendered on top of cards) */}
              {edges.map((edge) => {
                if (!edgeFilters[edge.type]) return null;

                const srcQuest = quests[edge.source];
                const tgtQuest = quests[edge.target];
                if (!srcQuest || !tgtQuest) return null;

                // Special Case: Vertical Mutual Lockout Edge between M02_A and M02_B
                if (edge.type === 'LOCKOUT') {
                  const x1 = srcQuest.position.x + NODE_WIDTH / 2;
                  const y1 = srcQuest.position.y + getNodeHeight(srcQuest) + 4;
                  const x2 = tgtQuest.position.x + NODE_WIDTH / 2;
                  const y2 = tgtQuest.position.y - 4;
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2;

                  return (
                    <g key={edge.id}>
                      <path
                        d={`M ${x1} ${y1} L ${x2} ${y2}`}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3.2"
                        strokeDasharray="5,4"
                        markerEnd="url(#arrow-rose)"
                        markerStart="url(#arrow-rose)"
                      />
                      {showEdgeLabels && (
                        <g transform={`translate(${mx - 48}, ${my - 10})`}>
                          <rect
                            width="96"
                            height="20"
                            rx="5"
                            fill="#450a0a"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                          />
                          <text
                            x="48"
                            y="13.5"
                            textAnchor="middle"
                            fill="#fecaca"
                            fontSize="9.5"
                            fontWeight="800"
                            fontFamily="monospace"
                          >
                            ✕ LOCKS OUT
                          </text>
                        </g>
                      )}
                    </g>
                  );
                }

                // Standard Port-to-Port Coordinates
                const portIdx = Math.max(
                  0,
                  srcQuest.rewardOutcomes.findIndex((r) => r.id === edge.sourcePortId)
                );
                const startPt = getOutputPortCoords(srcQuest, portIdx);
                const endPt = getInputPortCoords(tgtQuest);

                // Offset mutation arrows slightly on B01 so they don't overlap the primary unlock arrows
                const adjustedEndY =
                  edge.type === 'MUTATION' ? endPt.y - 12 : endPt.y;

                const { d, mx, my } = computeEdgePathAndMidpoint(
                  startPt.x,
                  startPt.y,
                  endPt.x - 8,
                  adjustedEndY,
                  edgeRoutingStyle,
                  edge.type === 'MUTATION',
                  edge.id
                );

                // Determine if this edge is active or locked out in the Playtest Simulator
                let isEdgeActive = true;
                if (m01Choice !== 'UNDECIDED') {
                  if (edge.stateTag === 'Idol_Kept') {
                    isEdgeActive = m01Choice === 'Idol_Kept';
                  } else if (edge.stateTag === 'Idol_Broken') {
                    isEdgeActive = m01Choice === 'Idol_Broken';
                  } else if (edge.stateTag === 'Secret_Passage') {
                    isEdgeActive = s01Completed;
                  } else if (edge.source === 'M02_A') {
                    isEdgeActive = m01Choice === 'Idol_Kept';
                  } else if (edge.source === 'M02_B') {
                    isEdgeActive = m01Choice === 'Idol_Broken';
                  }
                }

                // Select high-contrast stroke color & marker
                let strokeColor = '#10b981'; // Emerald for UNLOCKS
                let markerUrl = 'url(#arrow-emerald)';

                if (!isEdgeActive) {
                  strokeColor = '#52525b';
                  markerUrl = 'url(#arrow-muted)';
                } else if (edge.type === 'CHOICE_BRANCH') {
                  strokeColor = '#38bdf8'; // Cyan for Choice Branches
                  markerUrl = 'url(#arrow-sky)';
                } else if (edge.type === 'MUTATION') {
                  strokeColor = '#f59e0b'; // Amber for State-Tag Mutations
                  markerUrl = 'url(#arrow-amber)';
                }

                return (
                  <g
                    key={edge.id}
                    style={{ opacity: isEdgeActive ? 1 : 0.32 }}
                  >
                    {/* Outer Glow Halo for Active Paths */}
                    {isEdgeActive && (
                      <path
                        d={d}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="8"
                        strokeOpacity="0.16"
                      />
                    )}

                    {/* Solid or Dashed Base Track */}
                    <path
                      d={d}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isEdgeActive ? '3' : '2'}
                      strokeDasharray={
                        edge.type === 'MUTATION'
                          ? '7,5'
                          : !isEdgeActive
                          ? '4,5'
                          : 'none'
                      }
                      markerEnd={markerUrl}
                    />

                    {/* Animated Marching Flow Particles */}
                    {animateFlow && isEdgeActive && (
                      <path
                        d={d}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.2"
                        strokeDasharray="5,23"
                        strokeLinecap="round"
                        className="animate-edge-flow"
                        opacity="0.85"
                      />
                    )}

                    {/* Midpoint Edge Label Badge */}
                    {showEdgeLabels && edge.label && (
                      <g transform={`translate(${mx - 62}, ${my - 10})`}>
                        <rect
                          width="124"
                          height="20"
                          rx="5"
                          fill="#09090b"
                          fillOpacity="0.92"
                          stroke={strokeColor}
                          strokeWidth="1.3"
                        />
                        <text
                          x="62"
                          y="13.5"
                          textAnchor="middle"
                          fill={isEdgeActive ? strokeColor : '#a1a1aa'}
                          fontSize="9.5"
                          fontWeight="800"
                          fontFamily="monospace"
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Live Rubberband Line when user is connecting ports */}
              {connectingFrom && (
                <path
                  d={`M ${connectingFrom.x} ${connectingFrom.y} L ${mouseSvgPos.x} ${mouseSvgPos.y}`}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="3.5"
                  strokeDasharray="6,4"
                  markerEnd="url(#arrow-sky)"
                />
              )}
            </svg>

            {/* Bottom Interactive Legend Bar inside Graph Canvas */}
            <div className="px-3 py-1.5 bg-zinc-900/90 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-sky-400" />
                  Drag any Quest Card to customize spacing • Use <b>Tier Space / Vertical Gap</b> presets above • Click <b>+ Guided New Quest</b> to build a node step-by-step
                </span>
              </div>
              <div className="font-mono text-[10px] text-indigo-300">
                Selected: <b>{selectedQuest.id} ({selectedQuest.title})</b> [X:{selectedQuest.position.x}, Y:{selectedQuest.position.y}]
              </div>
            </div>
          </div>

          {/* =================================================================
              4. COLLAPSIBLE RIGHT-HAND QUEST INFO & VARIANT DRAWER (330px)
              Never obscures the primary graph canvas; closes with 1 click!
          ================================================================= */}
          {viewMode === 'SPLIT' && (
            <aside className="w-[330px] sm:w-[350px] bg-zinc-900 border-l border-zinc-800 flex flex-col h-full shrink-0 z-30 overflow-y-auto">
              {/* Drawer Header with Close [X] Button */}
              <div className="p-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                    Quest Inspector • {selectedQuest.id}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">
                    Tier {selectedQuest.tier}
                  </span>
                </div>
                <button
                  onClick={() => setViewMode('FULL_GRAPH')}
                  title="Minimize Quest Info Drawer to Maximize Graph"
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quest Title & Gate Selector */}
              <div className="p-3 border-b border-zinc-800 space-y-2">
                <div className="flex gap-1.5">
                  <input
                    value={selectedQuest.title}
                    onChange={(e) => updateSelectedQuestField('title', e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={selectedQuest.prereqLogic}
                    onChange={(e) => updateSelectedQuestField('prereqLogic', e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-300"
                  >
                    <option value="START">Start</option>
                    <option value="ALL">AND Gate</option>
                    <option value="ANY">OR Gate</option>
                  </select>
                </div>

                {/* Tabbed Content Selector: Base Card vs Variant Overrides */}
                <div className="pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center justify-between">
                    <span>Base Card &amp; Conditional Variants</span>
                    <span className="text-amber-400">
                      {selectedQuest.variants.length} Variant(s)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setInspectorTab('BASE')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                        inspectorTab === 'BASE'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Base Card
                    </button>

                    {selectedQuest.variants.map((v) => {
                      const isActive = activeStateTags.has(v.requiredStateTag);
                      return (
                        <button
                          key={v.id}
                          onClick={() => setInspectorTab(v.id)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold flex items-center gap-1 transition ${
                            inspectorTab === v.id
                              ? 'bg-amber-500 text-zinc-950'
                              : isActive
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          ⚡ {v.requiredStateTag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Tab Editor Body */}
              <div className="p-3 space-y-2.5 border-b border-zinc-800">
                {inspectorTab === 'BASE' ? (
                  <>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase">
                        Base Flavor Text
                      </label>
                      <textarea
                        rows={2}
                        value={selectedQuest.flavorText}
                        onChange={(e) => updateSelectedQuestField('flavorText', e.target.value)}
                        className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase">
                        Base Setup Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={selectedQuest.setupInstructions}
                        onChange={(e) =>
                          updateSelectedQuestField('setupInstructions', e.target.value)
                        }
                        className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </>
                ) : (
                  (() => {
                    const activeVar = selectedQuest.variants.find((v) => v.id === inspectorTab);
                    if (!activeVar) return null;
                    return (
                      <div className="space-y-2 bg-amber-950/15 p-2.5 rounded-xl border border-amber-500/30">
                        <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          When Party Has [{activeVar.requiredStateTag}]
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400">
                            Override Title
                          </label>
                          <input
                            value={activeVar.overrideTitle}
                            onChange={(e) =>
                              updateVariantField(activeVar.id, 'overrideTitle', e.target.value)
                            }
                            className="w-full mt-0.5 bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400">
                            Additional Flavor Text
                          </label>
                          <textarea
                            rows={2}
                            value={activeVar.additionalFlavorText}
                            onChange={(e) =>
                              updateVariantField(
                                activeVar.id,
                                'additionalFlavorText',
                                e.target.value
                              )
                            }
                            className="w-full mt-0.5 bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-amber-200"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400">
                            Setup &amp; Boss Modifications
                          </label>
                          <textarea
                            rows={2}
                            value={activeVar.setupModifications}
                            onChange={(e) =>
                              updateVariantField(
                                activeVar.id,
                                'setupModifications',
                                e.target.value
                              )
                            }
                            className="w-full mt-0.5 bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-emerald-300"
                          />
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Quick Add Variant Input */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    value={newVariantTag}
                    onChange={(e) => setNewVariantTag(e.target.value)}
                    placeholder="New Variant Tag (e.g. Sun_Blessed)..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200"
                  />
                  <button
                    onClick={handleAddVariant}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Variant
                  </button>
                </div>
              </div>

              {/* LIVE PRINTED SCENARIO CARD PREVIEW */}
              <div className="p-3 border-b border-zinc-800 bg-zinc-950/60">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  Live Tabletop Card Preview ({selectedQuest.id})
                </div>

                <div className="rounded-xl bg-amber-50/95 text-zinc-900 p-2.5 shadow-inner border-2 border-amber-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center border-b border-amber-900/20 pb-1">
                    <span className="font-serif font-extrabold text-xs text-zinc-900">
                      {selectedQuest.id}:{' '}
                      {selectedQuest.variants.find(
                        (v) => activeStateTags.has(v.requiredStateTag) && v.overrideTitle
                      )?.overrideTitle || selectedQuest.title}
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-900/15 text-amber-950">
                      Tier {selectedQuest.tier}
                    </span>
                  </div>

                  <p className="italic text-[11px] text-zinc-700 leading-snug">
                    "{selectedQuest.flavorText}"
                  </p>

                  {selectedQuest.variants.map((v) => {
                    if (!activeStateTags.has(v.requiredStateTag)) return null;
                    return (
                      <div
                        key={v.id}
                        className="p-1.5 rounded bg-amber-200/80 border-l-4 border-amber-700 text-zinc-900 space-y-0.5"
                      >
                        <div className="font-bold text-[10px] uppercase text-amber-950">
                          ⚡ Active Variant [{v.requiredStateTag}]:
                        </div>
                        {v.additionalFlavorText && (
                          <p className="italic text-[10.5px]">{v.additionalFlavorText}</p>
                        )}
                        <p className="font-semibold text-[10.5px] text-emerald-950">
                          Mod: {v.setupModifications}
                        </p>
                      </div>
                    );
                  })}

                  <div className="pt-1 border-t border-amber-900/20 text-[11px]">
                    <span className="font-bold">Setup: </span>
                    <span>{selectedQuest.setupInstructions}</span>
                  </div>
                </div>
              </div>

              {/* Connected Edges & Output Ports Manager */}
              <div className="p-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Outgoing Arrows from {selectedQuest.id}
                </div>

                {edges
                  .filter((e) => e.source === selectedQuest.id)
                  .map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            e.type === 'UNLOCKS'
                              ? 'bg-emerald-400'
                              : e.type === 'CHOICE_BRANCH'
                              ? 'bg-sky-400'
                              : e.type === 'MUTATION'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-mono text-zinc-300">
                          {e.source} → <b className="text-white">{e.target}</b>
                        </span>
                        <span className="text-[10px] text-zinc-500 truncate">
                          ({e.label})
                        </span>
                      </div>
                      <button
                        onClick={() => deleteEdge(e.id)}
                        className="text-zinc-500 hover:text-rose-400 p-0.5"
                        title="Remove Arrow"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                {/* Add New Output Port */}
                <div className="pt-1.5 flex gap-1">
                  <input
                    value={newRewardLabel}
                    onChange={(e) => setNewRewardLabel(e.target.value)}
                    placeholder="New Reward Port..."
                    className="w-1/2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs"
                  />
                  <input
                    value={newRewardTag}
                    onChange={(e) => setNewRewardTag(e.target.value)}
                    placeholder="+State_Tag"
                    className="w-1/3 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono"
                  />
                  <button
                    onClick={handleAddRewardOutcome}
                    className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
                  >
                    + Port
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      ) : (
        /* ===================================================================
           5. CAMPAIGN OVERVIEW & STATE TAG DEPENDENCY AUDIT TAB
        =================================================================== */
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-zinc-950">
          {/* Top Matrix Table Grouped by Parallel Tier */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Campaign Quest Matrix (Grouped by Parallel Swimlane Tier)
                </h2>
                <p className="text-xs text-zinc-400">
                  Click any row to inspect or edit that quest on the canvas. Quests in the same Tier can be played side-by-side unless locked out.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold"
                >
                  Export CSV for Printing
                </button>
                <button
                  onClick={() => setViewMode('SPLIT')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  ← Back to Graph Canvas
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10.5px] bg-zinc-950/60">
                    <th className="py-2.5 px-3">Quest ID</th>
                    <th className="py-2.5 px-3">Parallel Tier</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Gate Logic</th>
                    <th className="py-2.5 px-3">Reward Outcomes &amp; Tags</th>
                    <th className="py-2.5 px-3">Conditional Variants</th>
                    <th className="py-2.5 px-3">Sim Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {Object.values(quests)
                    .sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id))
                    .map((q) => {
                      const st = getQuestStatus(q.id);
                      return (
                        <tr
                          key={q.id}
                          onClick={() => {
                            setSelectedQuestId(q.id);
                            setViewMode('SPLIT');
                          }}
                          className="hover:bg-zinc-800/50 cursor-pointer transition"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                            {q.id}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-semibold text-[11px]">
                              Tier {q.tier}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">{q.title}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300">
                            {q.prereqLogic}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {q.rewardOutcomes.map((ro) => (
                                <span
                                  key={ro.id}
                                  className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10.5px] text-sky-300 font-mono"
                                >
                                  {ro.isExclusiveChoice ? '🔀 ' : '✓ '}
                                  {ro.label}{' '}
                                  {ro.grantsStateTags[0] ? `[+${ro.grantsStateTags[0]}]` : ''}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {q.variants.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {q.variants.map((v) => (
                                  <span
                                    key={v.id}
                                    className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10.5px]"
                                  >
                                    ⚡ If: {v.requiredStateTag}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                                st === 'COMPLETED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : st === 'LOCKED_OUT'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-sky-500/20 text-sky-300'
                              }`}
                            >
                              {st}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom State Tag Dependency Audit */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-sky-400" />
                  State Tag Health &amp; Dependency Audit (Rewards → Downstream Consumers)
                </h2>
                <p className="text-xs text-zinc-400">
                  Verifies that every State Tag granted by a quest reward actually unlocks a branch or mutates a downstream quest card.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {tagAuditList.map((item) => {
                const totalConsumers =
                  item.consumedByNodes.length + item.consumedByVariants.length;
                const isOrphan = totalConsumers === 0;
                return (
                  <div
                    key={item.tag}
                    className={`p-3.5 rounded-xl bg-zinc-950 border ${
                      isOrphan ? 'border-amber-500/50' : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        [{item.tag}]
                      </span>
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${
                          isOrphan
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {isOrphan ? '⚠️ Unused Tag (0 Consumers)' : `✓ ${totalConsumers} Consumer(s)`}
                      </span>
                    </div>
                    <div className="mt-2.5 text-xs space-y-1 text-zinc-400">
                      <div>
                        <b className="text-zinc-200">Granted By:</b>{' '}
                        {item.grantedBy.join(', ') || '⚠️ Never Granted!'}
                      </div>
                      <div>
                        <b className="text-zinc-200">Unlocks Nodes:</b>{' '}
                        {item.consumedByNodes.join(', ') || '—'}
                      </div>
                      <div>
                        <b className="text-zinc-200">Mutates Variants:</b>{' '}
                        {item.consumedByVariants.join(', ') || '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          6. GUIDED "NEW QUEST WIZARD" MODAL (4-STEP SIMPLIFIED BUILDER)
      =================================================================== */}
      {wizardOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setWizardOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-zinc-900 border-2 border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Wizard Header & Step Indicator */}
            <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Guided New Quest Creation Wizard
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Step {wizardStep} of 4 — Automatically places your quest and connects prerequisite &amp; reward arrows
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWizardOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Progress Pills */}
            <div className="grid grid-cols-4 gap-1 px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-800 text-[11px] font-bold">
              {[
                { num: 1, label: '1. Identity & Tier' },
                { num: 2, label: '2. Prerequisites' },
                { num: 3, label: '3. Rewards & Tags' },
                { num: 4, label: '4. Text & Review' }
              ].map((st) => (
                <button
                  key={st.num}
                  onClick={() => setWizardStep(st.num)}
                  className={`py-1.5 px-2 rounded-lg text-center transition ${
                    wizardStep === st.num
                      ? 'bg-indigo-600 text-white shadow'
                      : wizardStep > st.num
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                      : 'bg-zinc-950 text-zinc-500'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Step Body Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* STEP 1: QUEST IDENTITY, CATEGORY & PARALLEL TIER */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-2">
                      Choose Quest Type
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'MAIN', label: 'Main Story Quest', prefix: 'M', desc: 'Core spine progression' },
                        { id: 'SIDE', label: 'Parallel Side Quest', prefix: 'S', desc: 'Optional side-by-side quest' },
                        { id: 'FACTION', label: 'Choice Branch', prefix: 'F', desc: 'Unlocked by specific reward' },
                        { id: 'BOSS', label: 'Act Boss / Climax', prefix: 'B', desc: 'Converges multiple paths' }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            const count =
                              Object.keys(quests).filter((k) => k.startsWith(cat.prefix)).length + 1;
                            setWizardData((prev) => ({
                              ...prev,
                              category: cat.id,
                              id: `${cat.prefix}0${count}`
                            }));
                          }}
                          className={`p-2.5 rounded-xl border text-left transition ${
                            wizardData.category === cat.id
                              ? 'bg-indigo-600/20 border-indigo-400 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div className="font-bold text-xs text-white">{cat.label}</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">{cat.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                        Quest ID Code
                      </label>
                      <input
                        value={wizardData.id}
                        onChange={(e) =>
                          setWizardData((prev) => ({ ...prev, id: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-indigo-300"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                        Quest Title
                      </label>
                      <input
                        value={wizardData.title}
                        onChange={(e) =>
                          setWizardData((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="e.g., The Watchtower Signal"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-bold text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-2">
                      Which Parallel Swimlane / Tier does this quest belong to?
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { t: 1, title: 'Tier 1: Starter', sub: 'Left Column (No Prereqs)' },
                        { t: 2, title: 'Tier 2: Parallel Mid-Act', sub: 'Middle Column (Side-by-Side)' },
                        { t: 3, title: 'Tier 3: Act Finale', sub: 'Right Column (Climax / Boss)' }
                      ].map((tierOpt) => (
                        <button
                          key={tierOpt.t}
                          onClick={() =>
                            setWizardData((prev) => ({
                              ...prev,
                              tier: tierOpt.t,
                              prereqLogic: tierOpt.t === 1 ? 'START' : 'ALL'
                            }))
                          }
                          className={`p-3 rounded-xl border text-left transition ${
                            wizardData.tier === tierOpt.t
                              ? 'bg-sky-600/20 border-sky-400 text-white'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <div className="font-bold text-xs">{tierOpt.title}</div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">{tierOpt.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PREREQUISITES, LOGIC GATES & MUTUAL LOCKOUTS */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  {wizardData.tier === 1 ? (
                    <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200">
                      <b>Tier 1 Starter Quest:</b> This quest starts unlocked at the beginning of the campaign and does not require earlier prerequisites. Click <b>Next Step</b> to configure its rewards!
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <div>
                          <div className="font-bold text-white">Prerequisite Gate Logic</div>
                          <div className="text-[11px] text-zinc-400">
                            If you select multiple prerequisites below, must the party complete ALL of them or ANY one of them?
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              setWizardData((prev) => ({ ...prev, prereqLogic: 'ALL' }))
                            }
                            className={`px-3 py-1.5 rounded-lg font-bold transition ${
                              wizardData.prereqLogic === 'ALL'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            AND Gate (All)
                          </button>
                          <button
                            onClick={() =>
                              setWizardData((prev) => ({ ...prev, prereqLogic: 'ANY' }))
                            }
                            className={`px-3 py-1.5 rounded-lg font-bold transition ${
                              wizardData.prereqLogic === 'ANY'
                                ? 'bg-amber-500 text-zinc-950'
                                : 'bg-zinc-900 text-zinc-400'
                            }`}
                          >
                            OR Gate (Any)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-2">
                          Select Which Existing Quest Outcomes Unlock "{wizardData.title}":
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {Object.values(quests).map((q) =>
                            q.rewardOutcomes.map((ro) => {
                              const isChecked = wizardData.selectedPrereqs.some(
                                (p) => p.questId === q.id && p.portId === ro.id
                              );
                              return (
                                <button
                                  key={`${q.id}-${ro.id}`}
                                  onClick={() => handleToggleWizardPrereq(q.id, ro.id)}
                                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${
                                    isChecked
                                      ? 'bg-emerald-950/50 border-emerald-400 text-white'
                                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                  }`}
                                >
                                  <div>
                                    <div className="font-bold text-xs text-white">
                                      {q.id}: {q.title}
                                    </div>
                                    <div className="text-[10.5px] text-sky-300 font-mono">
                                      Port: {ro.label}{' '}
                                      {ro.grantsStateTags[0] ? `(+${ro.grantsStateTags[0]})` : ''}
                                    </div>
                                  </div>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isChecked
                                        ? 'bg-emerald-500 text-zinc-950'
                                        : 'bg-zinc-800 text-zinc-400'
                                    }`}
                                  >
                                    {isChecked ? '✓ Linked' : 'Connect'}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Optional Mutual Lockout Selector */}
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-rose-300">
                        Optional: Does this quest Lock Out a mutually exclusive quest?
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Draws a red bidirectional [✕ LOCKS OUT] line on the graph
                      </div>
                    </div>
                    <select
                      value={wizardData.locksOutQuestId}
                      onChange={(e) =>
                        setWizardData((prev) => ({
                          ...prev,
                          locksOutQuestId: e.target.value
                        }))
                      }
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">None (Can play side-by-side)</option>
                      {Object.values(quests).map((q) => (
                        <option key={q.id} value={q.id}>
                          Locks Out {q.id}: {q.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* STEP 3: REWARD OUTCOMES, STATE TAGS & DOWNSTREAM MUTATION */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">
                          Reward Outcomes &amp; State Tags Granted
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Each reward outcome creates an output port on the right side of your quest card
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setWizardData((prev) => ({
                            ...prev,
                            rewardOutcomes: [
                              ...prev.rewardOutcomes,
                              {
                                id: `out-wiz-${Date.now()}`,
                                label: `Choice ${prev.rewardOutcomes.length + 1}`,
                                isExclusiveChoice: true,
                                gold: 10,
                                items: [],
                                grantsStateTags: [`Choice_${prev.rewardOutcomes.length + 1}_Tag`]
                              }
                            ]
                          }))
                        }
                        className="px-2.5 py-1 rounded-lg bg-sky-600/20 border border-sky-500/40 text-sky-300 font-bold text-xs"
                      >
                        + Add Choice Branch
                      </button>
                    </div>

                    <div className="space-y-2">
                      {wizardData.rewardOutcomes.map((ro, idx) => (
                        <div
                          key={ro.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-zinc-900 p-2 rounded-lg border border-zinc-800"
                        >
                          <div className="sm:col-span-5">
                            <label className="text-[10px] text-zinc-400 block">
                              Reward Label
                            </label>
                            <input
                              value={ro.label}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWizardData((prev) => ({
                                  ...prev,
                                  rewardOutcomes: prev.rewardOutcomes.map((r, i) =>
                                    i === idx ? { ...r, label: val } : r
                                  )
                                }));
                              }}
                              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="text-[10px] text-zinc-400 block">
                              Grants State Tag (Keyword)
                            </label>
                            <input
                              value={ro.grantsStateTags[0] || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\s+/g, '_');
                                setWizardData((prev) => ({
                                  ...prev,
                                  rewardOutcomes: prev.rewardOutcomes.map((r, i) =>
                                    i === idx ? { ...r, grantsStateTags: val ? [val] : [] } : r
                                  )
                                }));
                              }}
                              placeholder="e.g. Beacon_Lit"
                              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-sky-300"
                            />
                          </div>
                          <div className="sm:col-span-3 flex items-center justify-between pt-3">
                            <label className="flex items-center gap-1 text-[11px] text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={ro.isExclusiveChoice}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setWizardData((prev) => ({
                                    ...prev,
                                    rewardOutcomes: prev.rewardOutcomes.map((r, i) =>
                                      i === idx ? { ...r, isExclusiveChoice: checked } : r
                                    )
                                  }));
                                }}
                              />
                              🔀 Choice
                            </label>
                            {wizardData.rewardOutcomes.length > 1 && (
                              <button
                                onClick={() =>
                                  setWizardData((prev) => ({
                                    ...prev,
                                    rewardOutcomes: prev.rewardOutcomes.filter((_, i) => i !== idx)
                                  }))
                                }
                                className="text-zinc-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Downstream Follow-Up or Boss Mutation Selector */}
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2.5">
                    <div className="font-bold text-amber-300">
                      How does completing this quest affect later quests?
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">
                          Downstream Target Quest
                        </label>
                        <select
                          value={wizardData.downstreamTargetId}
                          onChange={(e) =>
                            setWizardData((prev) => ({
                              ...prev,
                              downstreamTargetId: e.target.value
                            }))
                          }
                          className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          {Object.values(quests).map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.id}: {q.title} (Tier {q.tier})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 uppercase font-bold">
                          Connection Effect Type
                        </label>
                        <select
                          value={wizardData.downstreamRelation}
                          onChange={(e) =>
                            setWizardData((prev) => ({
                              ...prev,
                              downstreamRelation: e.target.value
                            }))
                          }
                          className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="MUTATION">
                            ⚡ Mutate Target Quest via State Tag (Amber Dashed Arrow)
                          </option>
                          <option value="UNLOCKS">
                            ✓ Directly Unlock Target Quest (Green Solid Arrow)
                          </option>
                          <option value="NONE">No Downstream Arrow Yet</option>
                        </select>
                      </div>
                    </div>

                    {wizardData.downstreamRelation === 'MUTATION' && (
                      <div>
                        <label className="text-[10px] text-amber-300 font-bold">
                          Variant Setup Modification Added to {wizardData.downstreamTargetId}:
                        </label>
                        <input
                          value={wizardData.downstreamMutationText}
                          onChange={(e) =>
                            setWizardData((prev) => ({
                              ...prev,
                              downstreamMutationText: e.target.value
                            }))
                          }
                          className="w-full mt-1 bg-zinc-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs text-amber-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: QUEST TEXT & AUTO-GENERATED GRAPH SUMMARY */}
              {wizardStep === 4 && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                      Flavor Text (Read Aloud by Players)
                    </label>
                    <textarea
                      rows={2}
                      value={wizardData.flavorText}
                      onChange={(e) =>
                        setWizardData((prev) => ({ ...prev, flavorText: e.target.value }))
                      }
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                        Tabletop Setup Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={wizardData.setupInstructions}
                        onChange={(e) =>
                          setWizardData((prev) => ({
                            ...prev,
                            setupInstructions: e.target.value
                          }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-zinc-400 mb-1">
                        Victory Objectives
                      </label>
                      <textarea
                        rows={2}
                        value={wizardData.objectives}
                        onChange={(e) =>
                          setWizardData((prev) => ({ ...prev, objectives: e.target.value }))
                        }
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200"
                      />
                    </div>
                  </div>

                  {/* Summary Preview Box */}
                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-1.5">
                    <div className="font-bold text-indigo-300 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Ready to Generate Node &amp; Graph Arrows:
                    </div>
                    <div className="text-zinc-300 text-[11.5px]">
                      • <b>Node:</b> <span className="font-mono text-white">{wizardData.id}: {wizardData.title}</span> placed in <b>Tier {wizardData.tier}</b>
                    </div>
                    <div className="text-zinc-300 text-[11.5px]">
                      • <b>Incoming Arrows:</b>{' '}
                      {wizardData.tier === 1
                        ? 'None (Starter Quest)'
                        : wizardData.selectedPrereqs.length > 0
                        ? wizardData.selectedPrereqs.map((p) => `${p.questId} (${p.portId})`).join(', ')
                        : 'None selected'}
                    </div>
                    <div className="text-zinc-300 text-[11.5px]">
                      • <b>Outgoing Effect:</b>{' '}
                      {wizardData.downstreamRelation === 'NONE'
                        ? 'None'
                        : `${wizardData.downstreamRelation} arrow to ${wizardData.downstreamTargetId}`}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer Navigation */}
            <div className="px-5 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() =>
                  wizardStep > 1 ? setWizardStep(wizardStep - 1) : setWizardOpen(false)
                }
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {wizardStep > 1 ? 'Previous Step' : 'Cancel'}
              </button>

              {wizardStep < 4 ? (
                <button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  Next Step <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleCompleteWizard}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Create Quest &amp; Place on Graph
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}