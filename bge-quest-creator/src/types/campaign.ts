import { z } from 'zod';

export type PrereqLogic = 'START' | 'ALL' | 'ANY'; // Starter vs AND gate vs OR gate
export type QuestCategory = 'MAIN' | 'MAIN_BRANCH' | 'SIDE' | 'FACTION' | 'BOSS' | 'ACT_TRANSITION';
export type EdgeRelationType = 'UNLOCKS' | 'CHOICE_BRANCH' | 'MUTATION' | 'LOCKOUT';
export type EdgeRoutingStyle = 'BEZIER' | 'STEP' | 'STRAIGHT';
export type DevStatus = 'IDEA' | 'DRAFT' | 'PLAYTESTED' | 'FINAL';

export interface CampaignAct {
  id: number;
  code: string;
  title: string;
  description?: string;
}

export type StateTagScope = 'ACT_LOCAL' | 'CAMPAIGN_GLOBAL';

export function getStateTagScope(tag: string): StateTagScope {
  return tag.startsWith('++') ? 'CAMPAIGN_GLOBAL' : 'ACT_LOCAL';
}

export function getCleanTagName(tag: string): string {
  return tag.replace(/^\+{1,2}/, '');
}

export function formatScopedTag(rawName: string, scope: StateTagScope): string {
  const clean = getCleanTagName(rawName).trim().replace(/\s+/g, '_');
  return scope === 'CAMPAIGN_GLOBAL' ? `++${clean}` : `+${clean}`;
}

export interface RewardOutcome {
  id: string;                 // Source handle ID (e.g. "out-always", "out-choice-a")
  label: string;              // e.g. "[Choice A] Keep Blood Idol"
  isExclusiveChoice: boolean; // false = Always granted; true = Player picks 1 exclusive choice
  gold: number;
  items: string[];
  grantsStateTags: string[];  // e.g. ["++Arnak_saved" or "+Beacon_lit"]
  customResources?: Record<string, any>; // Dynamic resource bag for game-specific reward types
}

export interface QuestVariantOverride {
  id: string;
  requiredStateTag: string;   // e.g. "++Arnak_saved" or "+Beacon_lit"
  overrideTitle?: string;     // Optional replacement title when tag is active
  additionalFlavorText: string;
  setupModifications: string; // e.g. "Malakor gains +15 HP"
  rewardModifications?: string;
}

export interface QuestAudioTrack {
  id: string;               // Unique audio track ID
  targetField: 'flavorText' | 'setupInstructions' | 'combined';
  scope?: 'base' | 'mutation' | 'merged';
  variantId?: string;       // ID of the variant if mutation or merged
  variantTag?: string;      // State tag triggering the mutation
  fileName: string;         // Downloadable file name (e.g. m01_merged_arnak_saved_flavor_algenib_dark_fantasy.wav)
  voice: string;            // Gemini TTS Voice (e.g. Algenib, Charon, Kore, Puck)
  stylePrompt?: string;     // Speech metadata narration style
  mimeType: string;         // audio/wav
  blobKey: string;          // Storage key in audio IndexedDB store
  createdAt: string;
}

export type DragonEclipseTestOutcomeType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface DragonEclipseTestOutcome {
  id: string;                 // Corresponds to RewardOutcome.id
  rangeLabel: string;         // e.g. "0 - 4", "5 - 8", "9+"
  minScore?: number;
  maxScore?: number;
  type: DragonEclipseTestOutcomeType; // POSITIVE (Green), NEUTRAL (Gray), NEGATIVE (Red)
  title: string;              // e.g. "Failure: Trigger Alarm", "Success: Slipped Past"
  narrative?: string;         // Story text describing what happens
  gold?: number;
  items?: string[];
  grantsStateTags?: string[];
}

export interface DragonEclipseTestConfig {
  testName: string;           // e.g. "Stealth Infiltration Check"
  modifiersPrompt?: string;   // Rulebook p.11: Modifiers directly above the Test Table
  outcomes: DragonEclipseTestOutcome[];
}

export function createDefaultDragonEclipseTestConfig(testName: string = 'Skill Test'): DragonEclipseTestConfig {
  const ts = Date.now().toString(36);
  return {
    testName,
    modifiersPrompt: '+1 to final test value if you possess an appropriate Item card or Mystling element',
    outcomes: [
      {
        id: `test-${ts}-neg`,
        rangeLabel: '0 - 4',
        minScore: 0,
        maxScore: 4,
        type: 'NEGATIVE',
        title: 'Failure: Complication Arises',
        narrative: 'Your efforts falter. A trap clicks or guards turn in your direction.',
        gold: 0,
        items: [],
        grantsStateTags: ['+Test_Failed']
      },
      {
        id: `test-${ts}-neu`,
        rangeLabel: '5 - 8',
        minScore: 5,
        maxScore: 8,
        type: 'NEUTRAL',
        title: 'Complication: Narrow Escape',
        narrative: 'You barely make it through, but resource or stamina was lost in the struggle.',
        gold: 10,
        items: [],
        grantsStateTags: ['+Test_Narrow']
      },
      {
        id: `test-${ts}-pos`,
        rangeLabel: '9+',
        minScore: 9,
        maxScore: 99,
        type: 'POSITIVE',
        title: 'Success: Flawless Execution',
        narrative: 'You execute the task with mastery, discovering extra spoils along the way.',
        gold: 25,
        items: ['Valuable Clue'],
        grantsStateTags: ['++Test_Triumph']
      }
    ]
  };
}

export function syncTestOutcomesToRewardOutcomes(testConfig: DragonEclipseTestConfig): RewardOutcome[] {
  return testConfig.outcomes.map((o) => ({
    id: o.id,
    label: `[${o.rangeLabel}] ${o.title}`,
    isExclusiveChoice: true,
    gold: o.gold || 0,
    items: o.items || [],
    grantsStateTags: o.grantsStateTags || []
  }));
}

export interface QuestModel {
  uid: string;                // Immutable internal ID (used for graph node.id)
  code: string;               // Designer-facing ID ("M01", "S01", "M02_A", "B01")
  title: string;
  gameId?: string;            // Workspace game profile ID (e.g. "core-general", "dragon-eclipse")
  act?: number;               // Act number (1, 2, 3...) - defaults to 1
  tier: number;               // Progression tier column (1, 2, 3...)
  category: QuestCategory | string;
  prereqLogic: PrereqLogic;
  requiredTag?: string;       // Optional explicit tag required
  parentSlot?: string | null; // Subflow Slot ID (e.g. "SLOT_M02")
  position: { x: number; y: number };

  // Tabletop Scenario Card Content (Standard core fields)
  flavorText: string;
  setupInstructions: string;
  objectives: string;

  // Custom Game Payload for specialized game profiles
  customFields?: Record<string, any>;

  // Dynamic Output Ports & Variants
  rewardOutcomes: RewardOutcome[];
  variants: QuestVariantOverride[];
  devStatus: DevStatus;
  audioTracks?: QuestAudioTrack[];
  testConfig?: DragonEclipseTestConfig;
}

export interface CampaignEdge {
  id: string;
  source: string;             // Source Quest uid
  sourcePortId: string | null;// RewardOutcome.id (null for node-level LOCKOUT edges)
  target: string;             // Target Quest uid
  type: EdgeRelationType;     // Drives color, dash, and simulator evaluation
  stateTag?: string | null;   // Tag carried across this connection
  label?: string;
  waypoints?: { x: number; y: number }[]; // Custom bend points or obstacle avoidance routes
}

export interface CampaignProjectMetadata {
  id: string;
  name: string;
  description: string;
  gameId?: string;            // Game profile identifier scoping this campaign
  author?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignProjectFile {
  metadata: CampaignProjectMetadata;
  version: string;
  exportedAt: string;
  gameId?: string;
  acts?: CampaignAct[];
  quests: Record<string, QuestModel>;
  edges: CampaignEdge[];
}

// Zod Schemas for runtime import validation
export const RewardOutcomeSchema = z.object({
  id: z.string(),
  label: z.string(),
  isExclusiveChoice: z.boolean(),
  gold: z.number().default(0),
  items: z.array(z.string()).default([]),
  grantsStateTags: z.array(z.string()).default([]),
  customResources: z.record(z.any()).optional()
});

export const QuestVariantOverrideSchema = z.object({
  id: z.string(),
  requiredStateTag: z.string(),
  overrideTitle: z.string().optional(),
  additionalFlavorText: z.string().default(''),
  setupModifications: z.string().default(''),
  rewardModifications: z.string().optional()
});

export const QuestAudioTrackSchema = z.object({
  id: z.string(),
  targetField: z.enum(['flavorText', 'setupInstructions', 'combined']),
  scope: z.enum(['base', 'mutation', 'merged']).optional(),
  variantId: z.string().optional(),
  variantTag: z.string().optional(),
  fileName: z.string(),
  voice: z.string(),
  stylePrompt: z.string().optional(),
  mimeType: z.string().default('audio/wav'),
  blobKey: z.string(),
  createdAt: z.string()
});

export const QuestModelSchema = z.object({
  uid: z.string(),
  code: z.string(),
  title: z.string(),
  gameId: z.string().optional(),
  act: z.number().default(1),
  tier: z.number().default(1),
  category: z.string().default('MAIN'),
  prereqLogic: z.enum(['START', 'ALL', 'ANY']),
  requiredTag: z.string().optional(),
  parentSlot: z.string().nullable().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  flavorText: z.string().default(''),
  setupInstructions: z.string().default(''),
  objectives: z.string().default(''),
  customFields: z.record(z.any()).optional(),
  rewardOutcomes: z.array(RewardOutcomeSchema).default([]),
  variants: z.array(QuestVariantOverrideSchema).default([]),
  devStatus: z.enum(['IDEA', 'DRAFT', 'PLAYTESTED', 'FINAL']).default('DRAFT'),
  audioTracks: z.array(QuestAudioTrackSchema).optional(),
  testConfig: z.object({
    testName: z.string(),
    modifiersPrompt: z.string().optional(),
    outcomes: z.array(z.object({
      id: z.string(),
      rangeLabel: z.string(),
      minScore: z.number().optional(),
      maxScore: z.number().optional(),
      type: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
      title: z.string(),
      narrative: z.string().optional(),
      gold: z.number().optional(),
      items: z.array(z.string()).optional(),
      grantsStateTags: z.array(z.string()).optional()
    }))
  }).optional()
});

export const CampaignActSchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  description: z.string().optional()
});

export const CampaignEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourcePortId: z.string().nullable(),
  target: z.string(),
  type: z.enum(['UNLOCKS', 'CHOICE_BRANCH', 'MUTATION', 'LOCKOUT']),
  stateTag: z.string().nullable().optional(),
  label: z.string().optional(),
  waypoints: z.array(z.object({ x: z.number(), y: z.number() })).optional()
});

export const CampaignProjectFileSchema = z.object({
  metadata: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().default(''),
    gameId: z.string().optional(),
    author: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string()
  }),
  version: z.string().default('1.0'),
  exportedAt: z.string(),
  gameId: z.string().optional(),
  acts: z.array(CampaignActSchema).optional(),
  quests: z.record(QuestModelSchema),
  edges: z.array(CampaignEdgeSchema)
});
