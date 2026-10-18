import { QuestModel, CampaignEdge, CampaignProjectMetadata, CampaignAct } from '../types/campaign';

export const DEFAULT_CAMPAIGN_METADATA: CampaignProjectMetadata = {
  id: 'dragon-eclipse-act-1',
  name: 'Dragon Eclipse: Act I - Shadows Over Highgate',
  description: 'The canonical Act I narrative questline featuring the Blood Idol branching choice, secret smuggler passages, and High Inquisitor Malakor.',
  author: 'Lead Story Designer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const DEFAULT_ACTS: CampaignAct[] = [
  {
    id: 1,
    code: 'ACT_1',
    title: 'Act I: Shadows Over Highgate',
    description: 'The canonical Act I narrative questline featuring the Blood Idol branching choice.'
  },
  {
    id: 2,
    code: 'ACT_2',
    title: 'Act II: The Ashen Peaks',
    description: 'Journey across the frozen volcanic ridges toward the Wyrm Peak.'
  }
];

export const DEFAULT_QUESTS: Record<string, QuestModel> = {
  M01: {
    uid: 'M01',
    code: 'M01',
    title: 'The Sunken Shrine',
    act: 1,
    tier: 1,
    category: 'MAIN',
    prereqLogic: 'START',
    parentSlot: null,
    position: { x: 50, y: 180 },
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
        grantsStateTags: ['+Harbor_Mapped']
      },
      {
        id: 'out-choice-a',
        label: '[Choice A] Keep Idol',
        isExclusiveChoice: true,
        gold: 25,
        items: ['Cursed Blood Idol'],
        grantsStateTags: ['++Idol_Kept']
      },
      {
        id: 'out-choice-b',
        label: '[Choice B] Destroy Idol',
        isExclusiveChoice: true,
        gold: 5,
        items: ['Purified Shard'],
        grantsStateTags: ['++Idol_Broken']
      }
    ],
    variants: [],
    devStatus: 'FINAL'
  },
  S01: {
    uid: 'S01',
    code: 'S01',
    title: "Smuggler's Cove",
    act: 1,
    tier: 2,
    category: 'SIDE',
    prereqLogic: 'ALL',
    parentSlot: null,
    position: { x: 440, y: 40 },
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
        grantsStateTags: ['+Secret_Passage']
      }
    ],
    variants: [],
    devStatus: 'PLAYTESTED'
  },
  M02_A: {
    uid: 'M02_A',
    code: 'M02_A',
    title: 'Hunted by the Cult',
    act: 1,
    tier: 2,
    category: 'MAIN_BRANCH',
    prereqLogic: 'ALL',
    requiredTag: '++Idol_Kept',
    parentSlot: 'SLOT_M02',
    position: { x: 440, y: 240 },
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
    variants: [],
    devStatus: 'PLAYTESTED'
  },
  M02_B: {
    uid: 'M02_B',
    code: 'M02_B',
    title: "Temple's Blessing",
    act: 1,
    tier: 2,
    category: 'MAIN_BRANCH',
    prereqLogic: 'ALL',
    requiredTag: '++Idol_Broken',
    parentSlot: 'SLOT_M02',
    position: { x: 440, y: 440 },
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
        grantsStateTags: ['+Sun_Blessed']
      }
    ],
    variants: [],
    devStatus: 'PLAYTESTED'
  },
  B01: {
    uid: 'B01',
    code: 'B01',
    title: 'The High Inquisitor',
    act: 1,
    tier: 3,
    category: 'BOSS',
    prereqLogic: 'ANY',
    parentSlot: null,
    position: { x: 840, y: 200 },
    flavorText:
      'At the heart of the Grand Basilica stands High Inquisitor Malakor, orchestrating both the city watch and the sunken cult from behind his gilded mask.',
    setupInstructions:
      'Place Boss Tile 4X (Grand Basilica). Spawn High Inquisitor Malakor (Base HP: 40) at the altar and 2 Cathedral Guards at the main doors.',
    objectives: 'Defeat High Inquisitor Malakor.',
    rewardOutcomes: [
      {
        id: 'out-b01-win',
        label: 'Act I Climax Victory',
        isExclusiveChoice: false,
        gold: 50,
        items: ['Inquisitor Signet'],
        grantsStateTags: ['++Act1_Cleared']
      }
    ],
    variants: [
      {
        id: 'var_b01_idol_kept',
        requiredStateTag: '++Idol_Kept',
        overrideTitle: 'The High Inquisitor (Blood Awakened)',
        additionalFlavorText:
          'Malakor raises his hand, and the Blood Idol in your pack violently tears itself free, fusing into his scepter with a crimson shockwave!',
        setupModifications:
          'Malakor gains +15 Max HP (55 HP total) and the "Siphon Blood" aura. All heroes start with 1 Bleed token.',
        rewardModifications: 'Bonus Drop: Awakened Blood Scepter (Mythic Weapon).'
      },
      {
        id: 'var_b01_idol_broken',
        requiredStateTag: '++Idol_Broken',
        overrideTitle: 'The High Inquisitor (Shaken Faith)',
        additionalFlavorText:
          'Seeing the shattered remnants of his prized relic, Malakor’s composure cracks. Two of his acolytes hesitate, questioning his divine mandate.',
        setupModifications:
          'Remove 1 Cathedral Guard from setup. Malakor starts with -5 HP (35 HP total) and the "Enraged" status.',
        rewardModifications: 'Bonus Reward: +15 Reputation with the Sun Order.'
      },
      {
        id: 'var_b01_secret',
        requiredStateTag: '+Secret_Passage',
        overrideTitle: '',
        additionalFlavorText:
          'Slipping through the smuggler’s undercroft grate, your party bypasses the heavily fortified basilica nave and strikes from behind the choir loft!',
        setupModifications:
          'Deploy heroes in the Rear Choir Zone instead of the Main Doors. Party gains Surprise Round (free Move or Attack action in Round 1).',
        rewardModifications: 'Keep all looted Contraband Tokens (+10 Gold).'
      }
    ],
    devStatus: 'DRAFT'
  }
};

export const DEFAULT_EDGES: CampaignEdge[] = [
  { id: 'e-m01-s01', source: 'M01', sourcePortId: 'out-always', target: 'S01', type: 'UNLOCKS', label: 'Unlocks Side' },
  { id: 'e-m02a-b01', source: 'M02_A', sourcePortId: 'out-m02a-clear', target: 'B01', type: 'UNLOCKS', label: 'OR Path A' },
  { id: 'e-m02b-b01', source: 'M02_B', sourcePortId: 'out-m02b-clear', target: 'B01', type: 'UNLOCKS', label: 'OR Path B' },
  { id: 'e-m01-m02a', source: 'M01', sourcePortId: 'out-choice-a', target: 'M02_A', type: 'CHOICE_BRANCH', stateTag: '++Idol_Kept', label: '++Idol_Kept' },
  { id: 'e-m01-m02b', source: 'M01', sourcePortId: 'out-choice-b', target: 'M02_B', type: 'CHOICE_BRANCH', stateTag: '++Idol_Broken', label: '++Idol_Broken' },
  { id: 'e-mut-secret-b01', source: 'S01', sourcePortId: 'out-secret', target: 'B01', type: 'MUTATION', stateTag: '+Secret_Passage', label: '⚡ +Secret_Passage' },
  { id: 'e-mut-kept-b01', source: 'M01', sourcePortId: 'out-choice-a', target: 'B01', type: 'MUTATION', stateTag: '++Idol_Kept', label: '⚡ Mutates B01 (++Idol_Kept)' },
  { id: 'e-mut-broken-b01', source: 'M01', sourcePortId: 'out-choice-b', target: 'B01', type: 'MUTATION', stateTag: '++Idol_Broken', label: '⚡ Mutates B01 (++Idol_Broken)' },
  { id: 'e-lock-m02a-m02b', source: 'M02_A', sourcePortId: null, target: 'M02_B', type: 'LOCKOUT', label: '✕ LOCKS OUT' }
];
