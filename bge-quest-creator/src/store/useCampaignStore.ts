import { create } from 'zustand';
import { temporal } from 'zundo';
import * as idb from 'idb-keyval';
import {
  QuestModel,
  CampaignEdge,
  CampaignProjectMetadata,
  CampaignProjectFile,
  CampaignAct,
  RewardOutcome,
  QuestVariantOverride,
  QuestAudioTrack,
  EdgeRoutingStyle,
  EdgeRelationType
} from '../types/campaign';
import {
  DEFAULT_CAMPAIGN_METADATA,
  DEFAULT_QUESTS,
  DEFAULT_EDGES,
  DEFAULT_ACTS,
  DEFAULT_GENERAL_CAMPAIGN_METADATA,
  DEFAULT_GENERAL_ACTS
} from './defaultCampaignData';
import { GameProfile } from '../types/gameProfile';
import {
  BUILT_IN_GAMES,
  DEFAULT_GAME_PROFILE,
  getGameProfileById,
  CORE_GENERAL_GAME
} from '../config/builtInGames';
import { calculateAutoArrangement, LayoutAlgorithmType } from '../utils/layoutEngine';
import { deleteQuestAudioBlob } from '../utils/audioStorage';

const IDB_GAMES_CATALOG_KEY = 'questflow_games_catalog';
const IDB_LEGACY_CATALOG_KEY = 'questflow_campaigns_catalog';
const IDB_CAMPAIGN_PREFIX = 'questflow_campaign_';

// Module-level cache of React Flow measured DOM dimensions (avoids triggering store re-renders on ResizeObserver callbacks)
const measuredNodeSizesCache: Record<string, { width: number; height: number }> = {};

export function reportMeasuredNodeSize(uid: string, width: number, height: number): boolean {
  const prev = measuredNodeSizesCache[uid];
  if (prev && Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
    return false;
  }
  measuredNodeSizesCache[uid] = { width, height };
  return true;
}

export function getMeasuredNodeSizes(): Record<string, { width: number; height: number }> {
  return measuredNodeSizesCache;
}

let saveToStorageTimer: ReturnType<typeof setTimeout> | null = null;

export function getGameCampaignCatalogKey(gameId: string): string {
  return `questflow_catalog_${gameId}`;
}

export interface CampaignStoreState {
  // Game Workspace & Profiles (Multi-game partitioning)
  activeGameId: string;
  activeGameProfile: GameProfile;
  installedGames: GameProfile[];

  // Campaign Metadata
  activeCampaignId: string;
  campaignCatalog: CampaignProjectMetadata[];
  activeMetadata: CampaignProjectMetadata;

  // Domain Data
  acts: CampaignAct[];
  activeActId: number | 'ALL';
  quests: Record<string, QuestModel>;
  edges: CampaignEdge[];

  // Selection & UI State
  selectedQuestId: string | null;
  selectedEdgeId: string | null;
  activeVariantTab: string; // 'base' or variant.id
  viewMode: 'SPLIT' | 'FULL_GRAPH' | 'OVERVIEW';
  edgeRoutingStyle: EdgeRoutingStyle;
  edgeVisibility: {
    unlocks: boolean;
    choices: boolean;
    mutations: boolean;
    lockouts: boolean;
  };
  hSpacingPreset: 'COMPACT' | 'BALANCED' | 'WIDE';
  vSpacingScale: number;
  layoutAlgorithm: LayoutAlgorithmType;
  layoutVersion: number;
  snapToGrid: boolean;
  collapsedQuestUids: Record<string, boolean>;
  geminiApiKey: string;
  isActDrawerOpen: boolean;

  // Simulator State
  simulator: {
    activeRewardChoices: string[]; // RewardOutcome.id
    completedQuestIds: string[];   // Quest uid
    customTags: string[];          // Manually enabled tags
    manualTimeOffset: number;      // Manual adjustment to Exploration Time Track
  };

  // Modals & Creation Config
  wizardInitOptions?: {
    tier?: number;
    parentQuestId?: string;
    parentPortId?: string | null;
    canvasPos?: { x: number; y: number };
  };
  modals: {
    wizard: boolean;
    campaignManager: boolean;
    gameManager: boolean;
    exportModal: boolean;
    printModal: boolean;
    apiKeyModal: boolean;
  };

  // Actions
  initStore: () => Promise<void>;
  selectQuest: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setActiveVariantTab: (tab: string) => void;
  setViewMode: (mode: 'SPLIT' | 'FULL_GRAPH' | 'OVERVIEW') => void;
  setEdgeRoutingStyle: (style: EdgeRoutingStyle) => void;
  toggleEdgeVisibility: (key: keyof CampaignStoreState['edgeVisibility']) => void;
  setSpacing: (hPreset: 'COMPACT' | 'BALANCED' | 'WIDE', vScale: number) => void;
  setLayoutAlgorithm: (algorithm: LayoutAlgorithmType) => void;
  toggleSnapToGrid: () => void;
  toggleQuestNodeCollapsed: (uid: string) => void;
  setAllQuestNodesCollapsed: (collapsed: boolean) => void;
  setModalOpen: (modal: keyof CampaignStoreState['modals'], open: boolean) => void;
  openWizardWithConfig: (config?: CampaignStoreState['wizardInitOptions']) => void;
  setActDrawerOpen: (open: boolean) => void;
  toggleActDrawer: () => void;

  // Game Workspace Actions
  switchGame: (gameId: string) => Promise<void>;
  createGameProfile: (profile: GameProfile) => Promise<void>;
  updateGameProfile: (gameId: string, partial: Partial<GameProfile>) => Promise<void>;
  deleteGameProfile: (gameId: string) => Promise<void>;

  // Act Actions
  setActiveActId: (actId: number | 'ALL') => void;
  addAct: (title?: string) => void;
  updateAct: (actId: number, partial: Partial<CampaignAct>) => void;
  deleteAct: (actId: number) => void;
  reorderActs: (fromIndex: number, toIndex: number) => void;

  // Quest Actions
  updateQuestPosition: (uid: string, pos: { x: number; y: number }) => void;
  batchUpdateQuestPositions: (positions: Record<string, { x: number; y: number }>) => void;
  updateQuestField: <K extends keyof QuestModel>(uid: string, field: K, value: QuestModel[K]) => void;
  addQuest: (quest: QuestModel) => void;
  duplicateQuest: (uid: string, offset?: { x: number; y: number }) => void;
  deleteQuest: (uid: string) => void;
  attachQuestAudioTrack: (questUid: string, track: QuestAudioTrack) => void;
  deleteQuestAudioTrack: (questUid: string, trackId: string) => Promise<void>;
  setGeminiApiKey: (key: string) => void;

  // Reward Outcome Actions
  addRewardOutcome: (questUid: string, reward: RewardOutcome) => void;
  updateRewardOutcome: (questUid: string, rewardId: string, partial: Partial<RewardOutcome>) => void;
  reorderRewardOutcome: (questUid: string, rewardId: string, direction: 'UP' | 'DOWN') => void;
  deleteRewardOutcome: (questUid: string, rewardId: string) => void;

  // Variant Actions
  addVariant: (questUid: string, variant: QuestVariantOverride) => void;
  updateVariant: (questUid: string, variantId: string, partial: Partial<QuestVariantOverride>) => void;
  deleteVariant: (questUid: string, variantId: string) => void;

  // Edge Actions
  addEdge: (edge: CampaignEdge) => void;
  deleteEdge: (edgeId: string) => void;
  updateEdge: (edgeId: string, partial: Partial<CampaignEdge>) => void;
  reconnectEdge: (
    oldEdgeId: string,
    newConnection: { source: string; sourcePortId: string | null; target: string }
  ) => void;
  updateEdgeWaypoints: (edgeId: string, waypoints: { id?: string; x: number; y: number }[]) => void;
  clearEdgeWaypoints: (edgeId: string) => void;
  smartRouteAllEdges: () => void;
  autoArrangeCampaign: (options?: { reorderChoices?: boolean; algorithm?: LayoutAlgorithmType }) => void;

  // Simulator Actions
  toggleSimulatorRewardChoice: (rewardId: string, questUid: string) => void;
  toggleSimulatorQuestCompletion: (questUid: string) => void;
  toggleSimulatorCustomTag: (tag: string) => void;
  adjustSimulatorTime: (delta: number) => void;
  resetSimulator: () => void;

  // Multi-Project DB Actions
  createCampaign: (name: string, description: string) => Promise<string>;
  switchCampaign: (campaignId: string) => Promise<void>;
  duplicateCampaign: (campaignId: string) => Promise<void>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  renameActiveCampaign: (name: string, description: string) => Promise<void>;
  importCampaign: (projectFile: CampaignProjectFile) => Promise<void>;
  saveToStorage: (immediate?: boolean) => Promise<void>;
}

export const useCampaignStore = create<CampaignStoreState>()(
  temporal(
    (set, get) => ({
      // Multi-Game Workspace Defaults
      activeGameId: CORE_GENERAL_GAME.id,
      activeGameProfile: CORE_GENERAL_GAME,
      installedGames: BUILT_IN_GAMES,

      // Initial defaults
      activeCampaignId: DEFAULT_GENERAL_CAMPAIGN_METADATA.id,
      campaignCatalog: [DEFAULT_GENERAL_CAMPAIGN_METADATA],
      activeMetadata: DEFAULT_GENERAL_CAMPAIGN_METADATA,

      acts: DEFAULT_GENERAL_ACTS,
      activeActId: 1,
      quests: {},
      edges: [],

      selectedQuestId: null,
      selectedEdgeId: null,
      activeVariantTab: 'base',
      viewMode: 'SPLIT',
      edgeRoutingStyle: 'STEP',
      edgeVisibility: {
        unlocks: true,
        choices: true,
        mutations: false,
        lockouts: false
      },
      hSpacingPreset: 'BALANCED',
      vSpacingScale: 1.0,
      layoutAlgorithm: 'TIERED',
      layoutVersion: 0,
      snapToGrid: true,
      collapsedQuestUids: {},
      geminiApiKey: (typeof window !== 'undefined' ? localStorage.getItem('questflow_gemini_api_key') : '') || '',
      isActDrawerOpen: false,

      simulator: {
        activeRewardChoices: [],
        completedQuestIds: [],
        customTags: [],
        manualTimeOffset: 0
      },

      modals: {
        wizard: false,
        campaignManager: false,
        gameManager: false,
        exportModal: false,
        printModal: false,
        apiKeyModal: false
      },

      initStore: async () => {
        try {
          // 1. Load custom installed games and merge with built-ins
          const customGames = ((await idb.get(IDB_GAMES_CATALOG_KEY)) as GameProfile[]) || [];
          const installedGamesMap = new Map<string, GameProfile>();
          BUILT_IN_GAMES.forEach((g) => installedGamesMap.set(g.id, g));
          customGames.forEach((g) => installedGamesMap.set(g.id, g));
          const installedGames = Array.from(installedGamesMap.values());

          // 2. Backward compatibility: check for legacy single-game catalog
          const legacyCatalog = (await idb.get(IDB_LEGACY_CATALOG_KEY)) as CampaignProjectMetadata[] | undefined;
          if (legacyCatalog && legacyCatalog.length > 0) {
            const deCatalogKey = getGameCampaignCatalogKey('dragon-eclipse');
            const existingDeCatalog = await idb.get(deCatalogKey);
            if (!existingDeCatalog) {
              const migrated = legacyCatalog.map((c) => ({ ...c, gameId: 'dragon-eclipse' }));
              await idb.set(deCatalogKey, migrated);
            }
          }

          // 3. Determine active game
          let activeGameId = typeof window !== 'undefined' ? localStorage.getItem('questflow_active_game_id') : null;
          if (!activeGameId || !installedGamesMap.has(activeGameId)) {
            // If user had legacy dragon-eclipse data, default to dragon-eclipse, otherwise core-general
            if (legacyCatalog && legacyCatalog.length > 0) {
              activeGameId = 'dragon-eclipse';
            } else {
              activeGameId = 'core-general';
            }
          }
          const activeGameProfile = installedGamesMap.get(activeGameId) || CORE_GENERAL_GAME;

          // 4. Load the campaign catalog for the active game
          const catalogKey = getGameCampaignCatalogKey(activeGameId);
          let storedCatalog = (await idb.get(catalogKey)) as CampaignProjectMetadata[] | undefined;

          if (!storedCatalog || storedCatalog.length === 0) {
            if (activeGameId === 'dragon-eclipse') {
              storedCatalog = [DEFAULT_CAMPAIGN_METADATA];
              await idb.set(catalogKey, storedCatalog);
              await idb.set(`${IDB_CAMPAIGN_PREFIX}${DEFAULT_CAMPAIGN_METADATA.id}`, {
                metadata: DEFAULT_CAMPAIGN_METADATA,
                acts: DEFAULT_ACTS,
                quests: DEFAULT_QUESTS,
                edges: DEFAULT_EDGES
              });
            } else if (activeGameId === 'core-general') {
              storedCatalog = [DEFAULT_GENERAL_CAMPAIGN_METADATA];
              await idb.set(catalogKey, storedCatalog);
              await idb.set(`${IDB_CAMPAIGN_PREFIX}${DEFAULT_GENERAL_CAMPAIGN_METADATA.id}`, {
                metadata: DEFAULT_GENERAL_CAMPAIGN_METADATA,
                acts: DEFAULT_GENERAL_ACTS,
                quests: {},
                edges: []
              });
            } else {
              const newMeta: CampaignProjectMetadata = {
                id: `campaign_${crypto.randomUUID().slice(0, 8)}`,
                gameId: activeGameId,
                name: `${activeGameProfile.name} Campaign 1`,
                description: `Default campaign for ${activeGameProfile.name}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              storedCatalog = [newMeta];
              await idb.set(catalogKey, storedCatalog);
              await idb.set(`${IDB_CAMPAIGN_PREFIX}${newMeta.id}`, {
                metadata: newMeta,
                acts: [{ id: 1, code: 'ACT_1', title: `${activeGameProfile.terminology.actTerm} 1`, description: '' }],
                quests: {},
                edges: []
              });
            }
          }

          const firstId = storedCatalog[0].id;
          const campaignData = (await idb.get(`${IDB_CAMPAIGN_PREFIX}${firstId}`)) as {
            metadata: CampaignProjectMetadata;
            acts?: CampaignAct[];
            quests: Record<string, QuestModel>;
            edges: CampaignEdge[];
          } | undefined;

          const defaultActs = activeGameId === 'dragon-eclipse' ? DEFAULT_ACTS : DEFAULT_GENERAL_ACTS;
          if (campaignData) {
            set({
              installedGames,
              activeGameId,
              activeGameProfile,
              campaignCatalog: storedCatalog,
              activeCampaignId: firstId,
              activeMetadata: campaignData.metadata || storedCatalog[0],
              acts: campaignData.acts || defaultActs,
              activeActId: (campaignData.acts && campaignData.acts[0]?.id) || 1,
              quests: campaignData.quests || {},
              edges: campaignData.edges || [],
              selectedQuestId: Object.keys(campaignData.quests || {})[0] || null,
              selectedEdgeId: null
            });
          } else {
            set({
              installedGames,
              activeGameId,
              activeGameProfile,
              campaignCatalog: storedCatalog,
              activeCampaignId: firstId
            });
          }
        } catch (err) {
          console.warn('IndexedDB initial load error:', err);
        }
      },

      selectQuest: (id) =>
        set((state) => ({
          selectedQuestId: id,
          selectedEdgeId: id ? null : state.selectedEdgeId,
          activeVariantTab: 'base',
          viewMode: state.viewMode === 'FULL_GRAPH' && id ? 'SPLIT' : state.viewMode
        })),

      selectEdge: (id) =>
        set((state) => ({
          selectedEdgeId: id,
          selectedQuestId: id ? null : state.selectedQuestId,
          viewMode: state.viewMode === 'FULL_GRAPH' && id ? 'SPLIT' : state.viewMode
        })),

      setActiveVariantTab: (tab) => set({ activeVariantTab: tab }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setEdgeRoutingStyle: (style) => set({ edgeRoutingStyle: style }),

      toggleEdgeVisibility: (key) =>
        set((state) => ({
          edgeVisibility: {
            ...state.edgeVisibility,
            [key]: !state.edgeVisibility[key]
          }
        })),

      setSpacing: (hPreset, vScale) =>
        set({ hSpacingPreset: hPreset, vSpacingScale: vScale }),

      setLayoutAlgorithm: (algorithm) =>
        set({ layoutAlgorithm: algorithm }),

      toggleSnapToGrid: () =>
        set((state) => ({ snapToGrid: !state.snapToGrid })),

      toggleQuestNodeCollapsed: (uid) =>
        set((state) => ({
          collapsedQuestUids: {
            ...state.collapsedQuestUids,
            [uid]: !state.collapsedQuestUids[uid]
          }
        })),

      setAllQuestNodesCollapsed: (collapsed) =>
        set((state) => {
          if (!collapsed) {
            return { collapsedQuestUids: {} };
          }
          const next: Record<string, boolean> = {};
          Object.keys(state.quests).forEach((uid) => {
            next[uid] = true;
          });
          return { collapsedQuestUids: next };
        }),

      setModalOpen: (modal, open) =>
        set((state) => ({
          modals: { ...state.modals, [modal]: open }
        })),

      openWizardWithConfig: (config) =>
        set((state) => ({
          wizardInitOptions: config,
          modals: { ...state.modals, wizard: true }
        })),

      setActDrawerOpen: (open) => set({ isActDrawerOpen: open }),

      toggleActDrawer: () => set((state) => ({ isActDrawerOpen: !state.isActDrawerOpen })),

      // Game Workspace Actions
      switchGame: async (gameId: string) => {
        const state = get();
        if (state.activeGameId === gameId) return;

        // Save current campaign first
        await state.saveToStorage(true);

        if (typeof window !== 'undefined') {
          localStorage.setItem('questflow_active_game_id', gameId);
        }

        const profile = state.installedGames.find((g) => g.id === gameId) || CORE_GENERAL_GAME;
        const catalogKey = getGameCampaignCatalogKey(gameId);
        let catalog = (await idb.get(catalogKey)) as CampaignProjectMetadata[] | undefined;

        if (!catalog || catalog.length === 0) {
          if (gameId === 'dragon-eclipse') {
            catalog = [DEFAULT_CAMPAIGN_METADATA];
            await idb.set(catalogKey, catalog);
            await idb.set(`${IDB_CAMPAIGN_PREFIX}${DEFAULT_CAMPAIGN_METADATA.id}`, {
              metadata: DEFAULT_CAMPAIGN_METADATA,
              acts: DEFAULT_ACTS,
              quests: DEFAULT_QUESTS,
              edges: DEFAULT_EDGES
            });
          } else if (gameId === 'core-general') {
            catalog = [DEFAULT_GENERAL_CAMPAIGN_METADATA];
            await idb.set(catalogKey, catalog);
            await idb.set(`${IDB_CAMPAIGN_PREFIX}${DEFAULT_GENERAL_CAMPAIGN_METADATA.id}`, {
              metadata: DEFAULT_GENERAL_CAMPAIGN_METADATA,
              acts: DEFAULT_GENERAL_ACTS,
              quests: {},
              edges: []
            });
          } else {
            const newMeta: CampaignProjectMetadata = {
              id: `campaign_${crypto.randomUUID().slice(0, 8)}`,
              gameId: gameId,
              name: `${profile.name} Campaign 1`,
              description: `Default campaign for ${profile.name}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            catalog = [newMeta];
            await idb.set(catalogKey, catalog);
            await idb.set(`${IDB_CAMPAIGN_PREFIX}${newMeta.id}`, {
              metadata: newMeta,
              acts: [{ id: 1, code: 'ACT_1', title: `${profile.terminology.actTerm} 1`, description: '' }],
              quests: {},
              edges: []
            });
          }
        }

        const targetCampaignId = catalog[0].id;
        const campaignData = (await idb.get(`${IDB_CAMPAIGN_PREFIX}${targetCampaignId}`)) as {
          metadata: CampaignProjectMetadata;
          acts?: CampaignAct[];
          quests: Record<string, QuestModel>;
          edges: CampaignEdge[];
        } | undefined;

        const fallbackActs = gameId === 'dragon-eclipse' ? DEFAULT_ACTS : DEFAULT_GENERAL_ACTS;
        set({
          activeGameId: gameId,
          activeGameProfile: profile,
          campaignCatalog: catalog,
          activeCampaignId: targetCampaignId,
          activeMetadata: campaignData?.metadata || catalog[0],
          acts: campaignData?.acts || fallbackActs,
          activeActId: (campaignData?.acts && campaignData.acts[0]?.id) || 1,
          quests: campaignData?.quests || {},
          edges: campaignData?.edges || [],
          selectedQuestId: Object.keys(campaignData?.quests || {})[0] || null,
          selectedEdgeId: null,
          simulator: {
            activeRewardChoices: [],
            completedQuestIds: [],
            customTags: [],
            manualTimeOffset: 0
          }
        });
      },

      createGameProfile: async (profile: GameProfile) => {
        const state = get();
        const existingIdx = state.installedGames.findIndex((g) => g.id === profile.id);
        let updated: GameProfile[];
        if (existingIdx >= 0) {
          updated = state.installedGames.map((g) => (g.id === profile.id ? profile : g));
        } else {
          updated = [...state.installedGames, profile];
        }

        const customOnly = updated.filter((g) => !g.isBuiltIn);
        await idb.set(IDB_GAMES_CATALOG_KEY, customOnly);
        set({ installedGames: updated });
        await get().switchGame(profile.id);
      },

      updateGameProfile: async (gameId: string, partial: Partial<GameProfile>) => {
        const state = get();
        const updated = state.installedGames.map((g) =>
          g.id === gameId ? { ...g, ...partial } : g
        );
        const customOnly = updated.filter((g) => !g.isBuiltIn);
        await idb.set(IDB_GAMES_CATALOG_KEY, customOnly);

        const updatedActive =
          state.activeGameId === gameId
            ? { ...state.activeGameProfile, ...partial }
            : state.activeGameProfile;

        set({
          installedGames: updated,
          activeGameProfile: updatedActive
        });
      },

      deleteGameProfile: async (gameId: string) => {
        const state = get();
        const target = state.installedGames.find((g) => g.id === gameId);
        if (!target || target.isBuiltIn) return;

        const updated = state.installedGames.filter((g) => g.id !== gameId);
        const customOnly = updated.filter((g) => !g.isBuiltIn);
        await idb.set(IDB_GAMES_CATALOG_KEY, customOnly);

        await idb.del(getGameCampaignCatalogKey(gameId));
        set({ installedGames: updated });

        if (state.activeGameId === gameId) {
          await get().switchGame(CORE_GENERAL_GAME.id);
        }
      },

      setActiveActId: (actId) => {
        set({ activeActId: actId });
      },

      addAct: (title) => {
        set((state) => {
          const nextId = Math.max(0, ...state.acts.map((a) => a.id)) + 1;
          const newAct: CampaignAct = {
            id: nextId,
            code: `ACT_${nextId}`,
            title: title || `Act ${nextId}: New Chapter`,
            description: ''
          };
          return {
            acts: [...state.acts, newAct],
            activeActId: nextId
          };
        });
        get().saveToStorage();
      },

      updateAct: (actId, partial) => {
        set((state) => ({
          acts: state.acts.map((a) => (a.id === actId ? { ...a, ...partial } : a))
        }));
        get().saveToStorage();
      },

      deleteAct: (actId) => {
        set((state) => {
          if (state.acts.length <= 1) return state;
          const remainingActs = state.acts.filter((a) => a.id !== actId);
          const fallbackActId = remainingActs[0].id;
          const updatedQuests = { ...state.quests };
          Object.values(updatedQuests).forEach((q) => {
            if (q.act === actId) {
              updatedQuests[q.uid] = { ...q, act: fallbackActId };
            }
          });
          return {
            acts: remainingActs,
            quests: updatedQuests,
            activeActId: state.activeActId === actId ? fallbackActId : state.activeActId
          };
        });
        get().saveToStorage();
      },

      reorderActs: (fromIndex, toIndex) => {
        set((state) => {
          if (
            fromIndex < 0 ||
            fromIndex >= state.acts.length ||
            toIndex < 0 ||
            toIndex >= state.acts.length
          )
            return state;
          const newActs = [...state.acts];
          const [moved] = newActs.splice(fromIndex, 1);
          newActs.splice(toIndex, 0, moved);
          return { acts: newActs };
        });
        get().saveToStorage();
      },

      updateQuestPosition: (uid, pos) => {
        const currentQuest = get().quests[uid];
        if (
          !currentQuest ||
          (currentQuest.position.x === pos.x && currentQuest.position.y === pos.y)
        ) {
          return;
        }
        set((state) => {
          const quest = state.quests[uid];
          if (!quest) return state;
          return {
            quests: {
              ...state.quests,
              [uid]: { ...quest, position: pos }
            }
          };
        });
        get().saveToStorage();
      },

      batchUpdateQuestPositions: (positions) => {
        const currentQuests = get().quests;
        let hasChanges = false;
        Object.entries(positions).forEach(([uid, pos]) => {
          const q = currentQuests[uid];
          if (q && (q.position.x !== pos.x || q.position.y !== pos.y)) {
            hasChanges = true;
          }
        });
        if (!hasChanges) return;

        set((state) => {
          const nextQuests = { ...state.quests };
          Object.entries(positions).forEach(([uid, pos]) => {
            const q = nextQuests[uid];
            if (q && (q.position.x !== pos.x || q.position.y !== pos.y)) {
              nextQuests[uid] = { ...q, position: pos };
            }
          });
          return { quests: nextQuests };
        });
        get().saveToStorage();
      },

      updateQuestField: (uid, field, value) => {
        set((state) => {
          const quest = state.quests[uid];
          if (!quest) return state;
          return {
            quests: {
              ...state.quests,
              [uid]: { ...quest, [field]: value }
            }
          };
        });
        get().saveToStorage();
      },

      addQuest: (quest) => {
        set((state) => {
          const defaultAct = typeof state.activeActId === 'number' ? state.activeActId : 1;
          const questWithAct: QuestModel = {
            ...quest,
            act: quest.act || defaultAct,
            gameId: quest.gameId || state.activeGameId
          };
          return {
            quests: { ...state.quests, [quest.uid]: questWithAct },
            selectedQuestId: quest.uid
          };
        });
        get().saveToStorage();
      },

      duplicateQuest: (uid, offset = { x: 260, y: 50 }) => {
        set((state) => {
          const original = state.quests[uid];
          if (!original) return state;

          const newUid = `q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
          
          // Smart code increment: if e.g. "S02" -> look for next available S03, S04 etc.
          // Otherwise fall back to base_COPY
          let newCode = '';
          const matchNum = original.code.match(/^([A-Za-z]+)(\d+)$/);
          if (matchNum) {
            const prefix = matchNum[1];
            const digits = matchNum[2].length;
            let num = parseInt(matchNum[2], 10) + 1;
            while (Object.values(state.quests).some((q) => q.code === `${prefix}${String(num).padStart(digits, '0')}`)) {
              num++;
            }
            newCode = `${prefix}${String(num).padStart(digits, '0')}`;
          } else {
            const codeBase = original.code.replace(/_COPY\d*$/, '');
            newCode = `${codeBase}_COPY`;
            let counter = 2;
            while (Object.values(state.quests).some((q) => q.code === newCode)) {
              newCode = `${codeBase}_COPY${counter++}`;
            }
          }

          const clonedRewards = original.rewardOutcomes.map((r, idx) => ({
            ...r,
            id: `r-${newUid}-${idx + 1}`
          }));

          const clonedVariants = original.variants.map((v, idx) => ({
            ...v,
            id: `var-${newUid}-${idx + 1}`
          }));

          const clonedQuest: QuestModel = {
            ...original,
            uid: newUid,
            code: newCode,
            title: `${original.title} (Copy)`,
            position: {
              x: (original.position?.x ?? 0) + offset.x,
              y: (original.position?.y ?? 0) + offset.y
            },
            rewardOutcomes: clonedRewards,
            variants: clonedVariants
          };

          return {
            quests: {
              ...state.quests,
              [newUid]: clonedQuest
            },
            selectedQuestId: newUid
          };
        });
        get().saveToStorage();
      },

      deleteQuest: (uid) => {
        set((state) => {
          const { [uid]: deleted, ...remainingQuests } = state.quests;
          const filteredEdges = state.edges.filter(
            (e) => e.source !== uid && e.target !== uid
          );
          return {
            quests: remainingQuests,
            edges: filteredEdges,
            selectedQuestId: state.selectedQuestId === uid ? null : state.selectedQuestId
          };
        });
        get().saveToStorage();
      },

      attachQuestAudioTrack: (questUid, track) => {
        set((state) => {
          const quest = state.quests[questUid];
          if (!quest) return state;
          const currentTracks = quest.audioTracks || [];
          const updatedTracks = [...currentTracks.filter((t) => t.id !== track.id), track];
          return {
            quests: {
              ...state.quests,
              [questUid]: {
                ...quest,
                audioTracks: updatedTracks
              }
            }
          };
        });
        get().saveToStorage();
      },

      deleteQuestAudioTrack: async (questUid, trackId) => {
        const state = get();
        const quest = state.quests[questUid];
        const track = quest?.audioTracks?.find((t) => t.id === trackId);
        if (track) {
          try {
            await deleteQuestAudioBlob(track.blobKey);
          } catch (err) {
            console.error('Failed to delete audio blob from IndexedDB:', err);
          }
        }
        set((s) => {
          const q = s.quests[questUid];
          if (!q) return s;
          return {
            quests: {
              ...s.quests,
              [questUid]: {
                ...q,
                audioTracks: (q.audioTracks || []).filter((t) => t.id !== trackId)
              }
            }
          };
        });
        get().saveToStorage();
      },

      setGeminiApiKey: (key) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('questflow_gemini_api_key', key);
        }
        set({ geminiApiKey: key });
      },

      addRewardOutcome: (questUid, reward) => {
        set((state) => {
          const quest = state.quests[questUid];
          if (!quest) return state;
          return {
            quests: {
              ...state.quests,
              [questUid]: {
                ...quest,
                rewardOutcomes: [...quest.rewardOutcomes, reward]
              }
            }
          };
        });
        get().saveToStorage();
      },

      updateRewardOutcome: (questUid, rewardId, partial) => {
        set((state) => {
          const quest = state.quests[questUid];
          if (!quest) return state;

          const updatedRewards = quest.rewardOutcomes.map((r) =>
            r.id === rewardId ? { ...r, ...partial } : r
          );

          // Auto-sync connected edges
          const updatedEdges = state.edges.map((e) => {
            if (e.source === questUid && e.sourcePortId === rewardId) {
              const updatedEdge = { ...e };
              if (partial.isExclusiveChoice !== undefined) {
                if (e.type === 'CHOICE_BRANCH' || e.type === 'UNLOCKS') {
                  updatedEdge.type = partial.isExclusiveChoice ? 'CHOICE_BRANCH' : 'UNLOCKS';
                }
              }
              if (partial.grantsStateTags !== undefined) {
                updatedEdge.stateTag = partial.grantsStateTags[0] || null;
              }
              return updatedEdge;
            }
            return e;
          });

          return {
            quests: {
              ...state.quests,
              [questUid]: {
                ...quest,
                rewardOutcomes: updatedRewards
              }
            },
            edges: updatedEdges
          };
        });
        get().saveToStorage();
      },

      reorderRewardOutcome: (questUid, rewardId, direction) => {
        set((state) => {
          const quest = state.quests[questUid];
          if (!quest) return state;
          const index = quest.rewardOutcomes.findIndex((r) => r.id === rewardId);
          if (index === -1) return state;
          const targetIndex = direction === 'UP' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= quest.rewardOutcomes.length) return state;

          const newRewards = [...quest.rewardOutcomes];
          const [moved] = newRewards.splice(index, 1);
          newRewards.splice(targetIndex, 0, moved);

          return {
            quests: {
              ...state.quests,
              [questUid]: {
                ...quest,
                rewardOutcomes: newRewards
              }
            }
          };
        });
        get().saveToStorage();
      },

      deleteRewardOutcome: (questUid, rewardId) => {
        set((state) => {
          const quest = state.quests[questUid];
          if (!quest) return state;
          return {
            quests: {
              ...state.quests,
              [questUid]: {
                ...quest,
                rewardOutcomes: quest.rewardOutcomes.filter((r) => r.id !== rewardId)
              }
            },
            edges: state.edges.filter(
              (e) => !(e.source === questUid && e.sourcePortId === rewardId)
            )
          };
        });
        get().saveToStorage();
      },

      addVariant: (questUid, variant) => {
        set((state) => {
          const quest = state.quests[questUid];
          if (!quest) return state;
          return {
            quests: {
              ...state.quests,
              [questUid]: {
                ...quest,
                variants: [...quest.variants, variant]
              }
            },
            activeVariantTab: variant.id
          };
        });
        get().saveToStorage();
      },

      updateVariant: (questUid, variantId, partial) => {
        set((state) => {
          const quest = state.quests[questUid];
          if (!quest) return state;
          return {
            quests: {
              ...state.quests,
              [questUid]: {
                ...quest,
                variants: quest.variants.map((v) =>
                  v.id === variantId ? { ...v, ...partial } : v
                )
              }
            }
          };
        });
        get().saveToStorage();
      },

      deleteVariant: (questUid, variantId) => {
        set((state) => {
          const quest = state.quests[questUid];
          if (!quest) return state;
          return {
            quests: {
              ...state.quests,
              [questUid]: {
                ...quest,
                variants: quest.variants.filter((v) => v.id !== variantId)
              }
            },
            activeVariantTab: state.activeVariantTab === variantId ? 'base' : state.activeVariantTab
          };
        });
        get().saveToStorage();
      },

      addEdge: (edge) => {
        set((state) => {
          // Avoid duplicate edges
          if (state.edges.some((e) => e.source === edge.source && e.target === edge.target && e.sourcePortId === edge.sourcePortId && e.type === edge.type)) {
            return state;
          }
          return { edges: [...state.edges, edge] };
        });
        get().saveToStorage();
      },

      deleteEdge: (edgeId) => {
        set((state) => ({
          edges: state.edges.filter((e) => e.id !== edgeId),
          selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId
        }));
        get().saveToStorage();
      },

      updateEdge: (edgeId, partial) => {
        set((state) => ({
          edges: state.edges.map((e) => (e.id === edgeId ? { ...e, ...partial } : e))
        }));
        get().saveToStorage();
      },

      reconnectEdge: (oldEdgeId, newConn) => {
        set((state) => {
          const oldEdge = state.edges.find((e) => e.id === oldEdgeId);
          if (!oldEdge) return state;

          const sourceQuest = state.quests[newConn.source];
          const reward = sourceQuest?.rewardOutcomes.find((r) => r.id === newConn.sourcePortId);
          const isChoice = Boolean(reward?.isExclusiveChoice);
          const carriedTag = reward?.grantsStateTags?.[0] || null;
          const edgeRelation: EdgeRelationType = isChoice
            ? 'CHOICE_BRANCH'
            : oldEdge.type === 'LOCKOUT'
            ? 'LOCKOUT'
            : 'UNLOCKS';

          const updatedEdges: CampaignEdge[] = state.edges.map((e) => {
            if (e.id === oldEdgeId) {
              return {
                ...e,
                source: newConn.source,
                sourcePortId: newConn.sourcePortId,
                target: newConn.target,
                type: edgeRelation,
                stateTag: carriedTag,
                label: isChoice ? `+${carriedTag || 'Choice'}` : e.label,
                waypoints: [] // reset custom waypoints on reconnection
              };
            }
            return e;
          });

          return { edges: updatedEdges };
        });
        get().saveToStorage();
      },

      updateEdgeWaypoints: (edgeId, waypoints) => {
        set((state) => ({
          edges: state.edges.map((e) => (e.id === edgeId ? { ...e, waypoints } : e))
        }));
        get().saveToStorage();
      },

      clearEdgeWaypoints: (edgeId) => {
        set((state) => ({
          edges: state.edges.map((e) => (e.id === edgeId ? { ...e, waypoints: [] } : e))
        }));
        get().saveToStorage();
      },

      smartRouteAllEdges: () => {
        set((s) => ({
          edges: s.edges.map((e) => ({
            ...e,
            waypoints: []
          }))
        }));
        get().saveToStorage();
      },

      autoArrangeCampaign: (options = {}) => {
        const state = get();
        const shouldReorder = options.reorderChoices ?? true;
        const algorithm = options.algorithm ?? state.layoutAlgorithm;
        const { positions, reorderedChoices, updatedTiers } = calculateAutoArrangement(
          state.quests,
          state.edges,
          {
            hSpacing: state.hSpacingPreset,
            vScale: state.vSpacingScale,
            reorderChoices: shouldReorder,
            algorithm,
            activeActId: state.activeActId,
            measuredSizes: getMeasuredNodeSizes()
          }
        );

        set((curr) => {
          const nextQuests = { ...curr.quests };

          Object.entries(positions).forEach(([uid, pos]) => {
            if (nextQuests[uid]) {
              nextQuests[uid] = {
                ...nextQuests[uid],
                position: pos,
                tier: updatedTiers[uid] ?? nextQuests[uid].tier,
                rewardOutcomes:
                  shouldReorder && reorderedChoices[uid]
                    ? reorderedChoices[uid]
                    : nextQuests[uid].rewardOutcomes
              };
            }
          });

          // Reset manual edge waypoints on arranged edges so lines render clean routes
          const nextEdges = curr.edges.map((e) => {
            if (positions[e.source] || positions[e.target]) {
              return { ...e, waypoints: [] };
            }
            return e;
          });

          return {
            quests: nextQuests,
            edges: nextEdges,
            layoutAlgorithm: algorithm,
            layoutVersion: curr.layoutVersion + 1
          };
        });

        get().saveToStorage();
      },

      // Simulator
      toggleSimulatorRewardChoice: (rewardId, questUid) => {
        set((state) => {
          const quest = state.quests[questUid];
          const outcome = quest?.rewardOutcomes.find((r) => r.id === rewardId);
          if (!outcome) return state;

          const isCurrentlyActive = state.simulator.activeRewardChoices.includes(rewardId);
          let newChoices: string[];

          if (outcome.isExclusiveChoice) {
            // Uncheck other exclusive choices on the same quest
            const siblingExclusiveIds = quest.rewardOutcomes
              .filter((r) => r.isExclusiveChoice)
              .map((r) => r.id);
            const withoutSiblings = state.simulator.activeRewardChoices.filter(
              (id) => !siblingExclusiveIds.includes(id)
            );
            newChoices = isCurrentlyActive
              ? withoutSiblings
              : [...withoutSiblings, rewardId];
          } else {
            newChoices = isCurrentlyActive
              ? state.simulator.activeRewardChoices.filter((id) => id !== rewardId)
              : [...state.simulator.activeRewardChoices, rewardId];
          }

          // Ensure quest is marked completed if choice is made
          const completed = state.simulator.completedQuestIds.includes(questUid)
            ? state.simulator.completedQuestIds
            : [...state.simulator.completedQuestIds, questUid];

          return {
            simulator: {
              ...state.simulator,
              activeRewardChoices: newChoices,
              completedQuestIds: completed
            }
          };
        });
      },

      toggleSimulatorQuestCompletion: (questUid) => {
        set((state) => {
          const isCompleted = state.simulator.completedQuestIds.includes(questUid);
          return {
            simulator: {
              ...state.simulator,
              completedQuestIds: isCompleted
                ? state.simulator.completedQuestIds.filter((id) => id !== questUid)
                : [...state.simulator.completedQuestIds, questUid]
            }
          };
        });
      },

      toggleSimulatorCustomTag: (tag) => {
        set((state) => {
          const hasTag = state.simulator.customTags.includes(tag);
          return {
            simulator: {
              ...state.simulator,
              customTags: hasTag
                ? state.simulator.customTags.filter((t) => t !== tag)
                : [...state.simulator.customTags, tag]
            }
          };
        });
      },

      adjustSimulatorTime: (delta) => {
        set((state) => ({
          simulator: {
            ...state.simulator,
            manualTimeOffset: Math.max(-10, (state.simulator.manualTimeOffset || 0) + delta)
          }
        }));
      },

      resetSimulator: () => {
        set({
          simulator: {
            activeRewardChoices: [],
            completedQuestIds: [],
            customTags: [],
            manualTimeOffset: 0
          }
        });
      },

      // Storage (Debounced to prevent IndexedDB & state thrashing during rapid canvas interactions)
      saveToStorage: async (immediate = false) => {
        const persistNow = async () => {
          const state = get();
          try {
            const payload = {
              metadata: {
                ...state.activeMetadata,
                gameId: state.activeGameId,
                updatedAt: new Date().toISOString()
              },
              acts: state.acts,
              quests: state.quests,
              edges: state.edges
            };
            await idb.set(`${IDB_CAMPAIGN_PREFIX}${state.activeCampaignId}`, payload);

            // Update catalog in IndexedDB without triggering a secondary store re-render unless metadata name/description changed
            const updatedCatalog = state.campaignCatalog.map((c) =>
              c.id === state.activeCampaignId ? payload.metadata : c
            );
            const catalogKey = getGameCampaignCatalogKey(state.activeGameId);
            await idb.set(catalogKey, updatedCatalog);
          } catch (err) {
            console.error('Failed saving to IndexedDB:', err);
          }
        };

        if (saveToStorageTimer) {
          clearTimeout(saveToStorageTimer);
          saveToStorageTimer = null;
        }

        if (immediate) {
          await persistNow();
        } else {
          saveToStorageTimer = setTimeout(() => {
            saveToStorageTimer = null;
            persistNow();
          }, 350);
        }
      },

      createCampaign: async (name, description) => {
        const state = get();
        const id = 'campaign_' + crypto.randomUUID().slice(0, 8);
        const newMeta: CampaignProjectMetadata = {
          id,
          gameId: state.activeGameId,
          name,
          description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const defaultActs: CampaignAct[] = [
          {
            id: 1,
            code: 'ACT_1',
            title: `${state.activeGameProfile.terminology.actTerm} 1`,
            description: ''
          }
        ];

        const updatedCatalog = [...state.campaignCatalog, newMeta];
        const catalogKey = getGameCampaignCatalogKey(state.activeGameId);
        await idb.set(catalogKey, updatedCatalog);
        await idb.set(`${IDB_CAMPAIGN_PREFIX}${id}`, {
          metadata: newMeta,
          acts: defaultActs,
          quests: {},
          edges: []
        });

        set({
          campaignCatalog: updatedCatalog,
          activeCampaignId: id,
          activeMetadata: newMeta,
          acts: defaultActs,
          activeActId: 1,
          quests: {},
          edges: [],
          selectedQuestId: null
        });

        return id;
      },

      switchCampaign: async (campaignId) => {
        const data = (await idb.get(`${IDB_CAMPAIGN_PREFIX}${campaignId}`)) as {
          metadata: CampaignProjectMetadata;
          acts?: CampaignAct[];
          quests: Record<string, QuestModel>;
          edges: CampaignEdge[];
        } | undefined;

        if (data) {
          const state = get();
          const fallbackActs =
            state.activeGameId === 'dragon-eclipse' ? DEFAULT_ACTS : DEFAULT_GENERAL_ACTS;
          set({
            activeCampaignId: campaignId,
            activeMetadata: data.metadata,
            acts: data.acts || fallbackActs,
            activeActId: (data.acts && data.acts[0]?.id) || 1,
            quests: data.quests,
            edges: data.edges,
            selectedQuestId: Object.keys(data.quests)[0] || null,
            simulator: {
              activeRewardChoices: [],
              completedQuestIds: [],
              customTags: [],
              manualTimeOffset: 0
            }
          });
        }
      },

      duplicateCampaign: async (campaignId) => {
        const data = (await idb.get(`${IDB_CAMPAIGN_PREFIX}${campaignId}`)) as {
          metadata: CampaignProjectMetadata;
          acts?: CampaignAct[];
          quests: Record<string, QuestModel>;
          edges: CampaignEdge[];
        } | undefined;

        if (!data) return;

        const state = get();
        const newId = 'campaign_' + crypto.randomUUID().slice(0, 8);
        const newMeta: CampaignProjectMetadata = {
          id: newId,
          gameId: state.activeGameId,
          name: `${data.metadata.name} (Copy)`,
          description: data.metadata.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const updatedCatalog = [...state.campaignCatalog, newMeta];
        const catalogKey = getGameCampaignCatalogKey(state.activeGameId);
        await idb.set(catalogKey, updatedCatalog);
        await idb.set(`${IDB_CAMPAIGN_PREFIX}${newId}`, {
          metadata: newMeta,
          acts: data.acts || state.acts,
          quests: data.quests,
          edges: data.edges
        });

        set({
          campaignCatalog: updatedCatalog,
          activeCampaignId: newId,
          activeMetadata: newMeta,
          acts: data.acts || state.acts,
          activeActId: 1,
          quests: data.quests,
          edges: data.edges,
          selectedQuestId: Object.keys(data.quests)[0] || null
        });
      },

      deleteCampaign: async (campaignId) => {
        const state = get();
        if (state.campaignCatalog.length <= 1) return; // Keep at least one

        const updatedCatalog = state.campaignCatalog.filter((c) => c.id !== campaignId);
        const catalogKey = getGameCampaignCatalogKey(state.activeGameId);
        await idb.del(`${IDB_CAMPAIGN_PREFIX}${campaignId}`);
        await idb.set(catalogKey, updatedCatalog);

        const nextCampaign = updatedCatalog[0];
        set({ campaignCatalog: updatedCatalog });
        await get().switchCampaign(nextCampaign.id);
      },

      renameActiveCampaign: async (name, description) => {
        set((state) => {
          const updatedMeta = {
            ...state.activeMetadata,
            name,
            description,
            updatedAt: new Date().toISOString()
          };
          return {
            activeMetadata: updatedMeta,
            campaignCatalog: state.campaignCatalog.map((c) =>
              c.id === updatedMeta.id ? updatedMeta : c
            )
          };
        });
        await get().saveToStorage();
      },

      importCampaign: async (projectFile) => {
        const state = get();
        const id = 'campaign_' + crypto.randomUUID().slice(0, 8);
        const targetGameId = projectFile.metadata.gameId || state.activeGameId;
        const meta: CampaignProjectMetadata = {
          id,
          gameId: targetGameId,
          name: projectFile.metadata.name || 'Imported Campaign',
          description: projectFile.metadata.description || '',
          createdAt: projectFile.metadata.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const updatedCatalog = [...state.campaignCatalog, meta];
        const catalogKey = getGameCampaignCatalogKey(state.activeGameId);
        await idb.set(catalogKey, updatedCatalog);
        await idb.set(`${IDB_CAMPAIGN_PREFIX}${id}`, {
          metadata: meta,
          acts: projectFile.acts || state.acts,
          quests: projectFile.quests,
          edges: projectFile.edges
        });

        set({
          campaignCatalog: updatedCatalog,
          activeCampaignId: id,
          activeMetadata: meta,
          acts: projectFile.acts || state.acts,
          activeActId: 1,
          quests: projectFile.quests,
          edges: projectFile.edges,
          selectedQuestId: Object.keys(projectFile.quests)[0] || null
        });
      }
    }),
    {
      limit: 50,
      partialize: (state) => ({
        quests: state.quests,
        edges: state.edges
      })
    }
  )
);
