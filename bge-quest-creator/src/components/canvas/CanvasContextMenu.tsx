import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  PlusCircle,
  Copy,
  Trash2,
  Route,
  Sparkles,
  Maximize2,
  CornerDownRight,
  RotateCcw,
  CheckCircle2,
  Circle,
  Layers,
  ArrowRightCircle,
  Milestone,
  ChevronRight,
  Dices,
  Compass,
  Clock
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import {
  QuestCategory,
  QuestModel,
  RewardOutcome,
  DragonEclipseTestConfig,
  createDefaultDragonEclipseTestConfig,
  syncTestOutcomesToRewardOutcomes,
  DragonEclipseExplorationConfig,
  createDefaultExplorationConfig
} from '../../types/campaign';

export interface ContextMenuState {
  isOpen: boolean;
  targetType: 'CANVAS' | 'NODE' | 'EDGE';
  targetId?: string; // quest uid or edge id
  screenPos: { x: number; y: number };
  flowPos: { x: number; y: number };
}

interface CanvasContextMenuProps {
  menuState: ContextMenuState;
  onClose: () => void;
  onFitView?: () => void;
  onAutoLayout?: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  menuState,
  onClose,
  onFitView,
  onAutoLayout
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<'act' | 'category' | null>(null);

  const quests = useCampaignStore((s) => s.quests);
  const edges = useCampaignStore((s) => s.edges);
  const acts = useCampaignStore((s) => s.acts);
  const activeActId = useCampaignStore((s) => s.activeActId);
  const simulator = useCampaignStore((s) => s.simulator);

  const addQuest = useCampaignStore((s) => s.addQuest);
  const duplicateQuest = useCampaignStore((s) => s.duplicateQuest);
  const deleteQuest = useCampaignStore((s) => s.deleteQuest);
  const updateQuestField = useCampaignStore((s) => s.updateQuestField);
  const addRewardOutcome = useCampaignStore((s) => s.addRewardOutcome);
  const toggleSimulatorQuestCompletion = useCampaignStore((s) => s.toggleSimulatorQuestCompletion);

  const deleteEdge = useCampaignStore((s) => s.deleteEdge);
  const updateEdgeWaypoints = useCampaignStore((s) => s.updateEdgeWaypoints);
  const clearEdgeWaypoints = useCampaignStore((s) => s.clearEdgeWaypoints);
  const smartRouteAllEdges = useCampaignStore((s) => s.smartRouteAllEdges);
  const openWizardWithConfig = useCampaignStore((s) => s.openWizardWithConfig);
  const selectQuest = useCampaignStore((s) => s.selectQuest);
  const addEdge = useCampaignStore((s) => s.addEdge);
  const activeGameProfile = useCampaignStore((s) => s.activeGameProfile);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuState.isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('wheel', onClose);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('wheel', onClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState.isOpen, onClose]);

  if (!menuState.isOpen) return null;

  const targetQuest = menuState.targetId ? quests[menuState.targetId] : undefined;
  const targetEdge = menuState.targetId ? edges.find((e) => e.id === menuState.targetId) : undefined;
  const isQuestCompleted = targetQuest ? simulator.completedQuestIds.includes(targetQuest.uid) : false;

  // Viewport boundary adjustment
  const menuWidth = 230;
  const menuHeight = 280;
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;

  let posX = menuState.screenPos.x;
  let posY = menuState.screenPos.y;

  const flipX = posX + menuWidth > winWidth;
  const flipY = posY + menuHeight > winHeight;

  if (flipX) posX = Math.max(10, posX - menuWidth);
  if (flipY) posY = Math.max(10, posY - menuHeight);

  // Helper to compute next code for category
  const computeNextCode = (cat: string): string => {
    const existing = new Set(Object.values(quests).map((q) => q.code.toUpperCase()));
    let prefix = 'M';
    if (cat === 'MAIN_BRANCH') prefix = 'MB';
    else if (cat === 'SIDE') prefix = 'S';
    else if (cat === 'FACTION') prefix = 'F';
    else if (cat === 'BOSS') prefix = 'B';
    else if (cat === 'TEST') prefix = 'T';
    else if (cat === 'EXPLORATION') prefix = 'E';
    else if (cat === 'ACT_TRANSITION') prefix = 'ACT_TRANS';
    else {
      prefix = cat.slice(0, 2).toUpperCase();
    }

    if (prefix === 'ACT_TRANS') {
      const act = typeof activeActId === 'number' ? activeActId : 1;
      const c = `ACT${act}_TRANS`;
      if (!existing.has(c)) return c;
    }

    let num = 1;
    while (existing.has(`${prefix}${String(num).padStart(2, '0')}`)) {
      num++;
    }
    return `${prefix}${String(num).padStart(2, '0')}`;
  };

  // Helper to create a new quest at click position with inferred tier
  const handleCreateQuest = (category: string = 'MAIN') => {
    const actId = typeof activeActId === 'number' ? activeActId : 1;
    const code = computeNextCode(category);

    // Infer tier from x coordinate (columns roughly every 380px starting at 60px)
    const inferredTier = Math.max(1, Math.min(10, Math.floor((menuState.flowPos.x - 20) / 380) + 1));

    const newUid = `q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    
    let testConfig: DragonEclipseTestConfig | undefined = undefined;
    let isExplorationStage: boolean | undefined = undefined;
    let timeAdvance: number | undefined = undefined;
    let explorationConfig: DragonEclipseExplorationConfig | undefined = undefined;

    let defaultRewards: RewardOutcome[] = [
      {
        id: `r-${newUid}-1`,
        label: 'Scenario Victory',
        isExclusiveChoice: false,
        gold: 25,
        items: [],
        grantsStateTags: []
      }
    ];

    if (category === 'TEST') {
      testConfig = createDefaultDragonEclipseTestConfig(`Skill Test ${code}`);
      defaultRewards = syncTestOutcomesToRewardOutcomes(testConfig);
    } else if (category === 'EXPLORATION') {
      isExplorationStage = true;
      timeAdvance = 1;
      explorationConfig = createDefaultExplorationConfig();
      defaultRewards = [
        {
          id: `r-${newUid}-1`,
          label: 'Quick Scout (+1 Time)',
          isExclusiveChoice: true,
          gold: 20,
          items: ['Field Map'],
          grantsStateTags: ['+Hex_Scouted'],
          timeAdvance: 1
        },
        {
          id: `r-${newUid}-2`,
          label: 'Thorough Search (+2 Time)',
          isExclusiveChoice: true,
          gold: 40,
          items: ['Rare Sample'],
          grantsStateTags: ['+Deep_Secrets'],
          timeAdvance: 2
        }
      ];
    }

    const newQuest: QuestModel = {
      uid: newUid,
      code,
      title:
        category === 'TEST'
          ? `Skill Test: ${code}`
          : category === 'EXPLORATION'
          ? `World Exploration: ${code}`
          : category === 'ACT_TRANSITION'
          ? `Act ${actId} Transition Bridge`
          : `New Quest ${code}`,
      act: actId,
      tier: inferredTier,
      category,
      prereqLogic: category === 'TEST' ? 'ANY' : 'START',
      position: {
        x: Math.round(menuState.flowPos.x),
        y: Math.round(menuState.flowPos.y)
      },
      flavorText:
        category === 'TEST'
          ? 'Draw cards from the Item deck and add up their Test Values to determine your outcome.'
          : category === 'EXPLORATION'
          ? 'Traversing dangerous terrain. Choices made will advance the World Exploration Time Track.'
          : 'A new adventure awaits the heroes...',
      setupInstructions:
        category === 'TEST'
          ? 'Consult the Dragon Eclipse Test Table (Page 11). Verify element & item modifiers.'
          : category === 'EXPLORATION'
          ? 'Set Time Track marker to current stage time. Reveal Event Slots as time advances.'
          : 'Place hero standees on the entrance hex.',
      objectives:
        category === 'TEST'
          ? 'Perform the Test and resolve the corresponding outcome tier.'
          : category === 'EXPLORATION'
          ? 'Explore the region and make your choices before time runs out.'
          : 'Complete the scenario objectives to proceed.',
      devStatus: 'DRAFT',
      testConfig,
      isExplorationStage,
      timeAdvance,
      explorationConfig,
      rewardOutcomes: defaultRewards,
      variants: []
    };

    addQuest(newQuest);
    selectQuest(newUid);
    onClose();
  };

  // Helper to create a follow-up quest connected to the selected quest
  const handleCreateFollowUpQuest = (sourceQuest: QuestModel) => {
    const actId = sourceQuest.act || (typeof activeActId === 'number' ? activeActId : 1);
    const targetTier = (sourceQuest.tier || 1) + 1;
    const cat = sourceQuest.category === 'BOSS' ? 'ACT_TRANSITION' : sourceQuest.category;
    const code = computeNextCode(cat);

    const sameTierQuests = Object.values(quests).filter((q) => (q.tier || 1) === targetTier);
    const posX = Math.round((sourceQuest.position?.x ?? 60) + 360);
    const posY = Math.round((sourceQuest.position?.y ?? 80) + (sameTierQuests.length % 2 === 0 ? 0 : 70));

    const newUid = `q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newQuest: QuestModel = {
      uid: newUid,
      code,
      title: `Follow-up to ${sourceQuest.code}`,
      act: actId,
      tier: targetTier,
      category: cat,
      prereqLogic: 'ALL',
      position: { x: posX, y: posY },
      flavorText: `Continuing from ${sourceQuest.title}...`,
      setupInstructions: 'Place hero standees on the entrance hex.',
      objectives: 'Complete the scenario objectives to proceed.',
      devStatus: 'DRAFT',
      rewardOutcomes: [
        {
          id: `r-${newUid}-1`,
          label: 'Victory',
          isExclusiveChoice: false,
          gold: 25,
          items: [],
          grantsStateTags: []
        }
      ],
      variants: []
    };

    addQuest(newQuest);

    const defaultPort = sourceQuest.rewardOutcomes[0]?.id || null;
    const isChoice = Boolean(sourceQuest.rewardOutcomes[0]?.isExclusiveChoice);
    const carriedTag = sourceQuest.rewardOutcomes[0]?.grantsStateTags?.[0] || null;

    addEdge({
      id: `e-${sourceQuest.uid}-${newUid}-${Date.now().toString(36)}`,
      source: sourceQuest.uid,
      sourcePortId: defaultPort,
      target: newUid,
      type: isChoice ? 'CHOICE_BRANCH' : 'UNLOCKS',
      stateTag: carriedTag,
      label: isChoice ? `+${carriedTag || 'Choice'}` : 'Unlocks'
    });

    selectQuest(newUid);
    onClose();
  };

  // Helper to trigger a skill test from the selected quest
  const handleTriggerSkillTest = (sourceQuest: QuestModel) => {
    const actId = sourceQuest.act || (typeof activeActId === 'number' ? activeActId : 1);
    const code = computeNextCode('TEST');
    const newUid = `q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const testConfig = createDefaultDragonEclipseTestConfig(`Skill Test ${code}`);
    const defaultRewards = syncTestOutcomesToRewardOutcomes(testConfig);

    const sameTierQuests = Object.values(quests).filter((q) => (q.tier || 1) === (sourceQuest.tier || 1) + 1);
    const posX = Math.round((sourceQuest.position?.x ?? 60) + 360);
    const posY = Math.round((sourceQuest.position?.y ?? 80) + (sameTierQuests.length % 2 === 0 ? 0 : 70));

    const newQuest: QuestModel = {
      uid: newUid,
      code,
      title: `Skill Test: ${code}`,
      act: actId,
      tier: (sourceQuest.tier || 1) + 1,
      category: 'TEST',
      prereqLogic: 'ANY',
      position: { x: posX, y: posY },
      flavorText: 'Draw cards from the Item deck and add up their Test Values to determine your outcome.',
      setupInstructions: 'Consult the Dragon Eclipse Test Table (Page 11). Verify element & item modifiers.',
      objectives: 'Perform the Test and resolve the corresponding outcome tier.',
      devStatus: 'DRAFT',
      testConfig,
      rewardOutcomes: defaultRewards,
      variants: []
    };

    addQuest(newQuest);

    const defaultPort = sourceQuest.rewardOutcomes[0]?.id || null;
    addEdge({
      id: `e-${sourceQuest.uid}-${newUid}-${Date.now().toString(36)}`,
      source: sourceQuest.uid,
      sourcePortId: defaultPort,
      target: newUid,
      targetHandle: 'in',
      type: 'UNLOCKS',
      label: 'Triggers Test'
    });

    selectQuest(newUid);
    onClose();
  };

  // Helper to append a port
  const handleAddPort = () => {
    if (!targetQuest) return;
    const portCount = targetQuest.rewardOutcomes.length + 1;
    const newReward: RewardOutcome = {
      id: `r-${targetQuest.uid}-${Date.now().toString(36)}`,
      label: `Outcome ${portCount}`,
      isExclusiveChoice: false,
      gold: 0,
      items: [],
      grantsStateTags: []
    };
    addRewardOutcome(targetQuest.uid, newReward);
    onClose();
  };

  // Helper to add waypoint to edge at click coordinate
  const handleAddWaypoint = () => {
    if (!targetEdge) return;
    const currentWaypoints = targetEdge.waypoints || [];
    const newWaypoint = {
      x: Math.round(menuState.flowPos.x),
      y: Math.round(menuState.flowPos.y)
    };
    updateEdgeWaypoints(targetEdge.id, [...currentWaypoints, newWaypoint]);
    onClose();
  };

  const categories = activeGameProfile?.categories?.map((c) => ({
    label: c.label,
    value: c.id
  })) || [
    { label: 'Main Quest', value: 'MAIN' },
    { label: 'Main Branch', value: 'MAIN_BRANCH' },
    { label: 'Side Quest', value: 'SIDE' },
    { label: 'Faction Quest', value: 'FACTION' },
    { label: 'Act Boss', value: 'BOSS' },
    { label: 'Act Transition', value: 'ACT_TRANSITION' }
  ];

  return (
    <div
      ref={menuRef}
      style={{ left: `${posX}px`, top: `${posY}px` }}
      className="fixed z-50 w-[220px] bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md py-1.5 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. CANVAS CONTEXT */}
      {menuState.targetType === 'CANVAS' && (
        <div className="space-y-0.5">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80 mb-1">
            Canvas Actions
          </div>

          <button
            type="button"
            onClick={() => handleCreateQuest('MAIN')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Main Quest Here</span>
          </button>

          <button
            type="button"
            onClick={() => handleCreateQuest('TEST')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-amber-300 hover:text-amber-200 cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Skill Test Here</span>
          </button>

          <button
            type="button"
            onClick={() => handleCreateQuest('EXPLORATION')}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-teal-300 hover:text-teal-200 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            <span>Add Exploration Quest Here</span>
          </button>

          {/* Add Categorized Quest Submenu */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('category')}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Add Categorized Quest...
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {activeSubmenu === 'category' && (
              <div
                className={`absolute top-0 ${
                  flipX ? 'right-full mr-1' : 'left-full ml-1'
                } w-[180px] bg-slate-900/98 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs text-slate-200 animate-in fade-in duration-75`}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 mb-0.5">
                  Select Category
                </div>
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCreateQuest(cat.value)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors cursor-pointer"
                  >
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              openWizardWithConfig({
                canvasPos: menuState.flowPos
              });
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Quest Wizard Here</span>
          </button>

          <div className="my-1 border-t border-slate-800/80" />

          <button
            type="button"
            onClick={() => {
              smartRouteAllEdges();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white cursor-pointer"
          >
            <Route className="w-3.5 h-3.5 text-cyan-400" />
            <span>Smart Route Edges</span>
          </button>

          {onAutoLayout && (
            <button
              type="button"
              onClick={() => {
                onAutoLayout();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Align Layout</span>
            </button>
          )}

          {onFitView && (
            <button
              type="button"
              onClick={() => {
                onFitView();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Fit View / Reset Zoom</span>
            </button>
          )}
        </div>
      )}

      {/* 2. NODE CONTEXT (QUEST CARD) */}
      {menuState.targetType === 'NODE' && targetQuest && (
        <div className="space-y-0.5">
          {/* Header pill */}
          <div className="px-3 py-1 flex items-center justify-between border-b border-slate-800/80 mb-1">
            <span className="font-mono text-[11px] font-bold text-indigo-400">
              {targetQuest.code}
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {targetQuest.title}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleCreateFollowUpQuest(targetQuest)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-indigo-950/60 text-left transition-colors text-indigo-300 hover:text-indigo-200 font-semibold cursor-pointer"
          >
            <ArrowRightCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Create Follow-up Quest</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerSkillTest(targetQuest)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-amber-950/60 text-left transition-colors text-amber-300 hover:text-amber-200 font-semibold cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5 text-amber-400" />
            <span>Trigger Skill Test</span>
          </button>

          <button
            type="button"
            onClick={() => {
              duplicateQuest(targetQuest.uid);
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              Duplicate Quest
            </span>
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800/80 text-slate-400">
              Ctrl+D
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleAddPort}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Port Handle</span>
          </button>

          {/* Move to Act Submenu */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('act')}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <ArrowRightCircle className="w-3.5 h-3.5 text-amber-400" />
                Move to Act...
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {activeSubmenu === 'act' && (
              <div
                className={`absolute top-0 ${
                  flipX ? 'right-full mr-1' : 'left-full ml-1'
                } w-[190px] bg-slate-900/98 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs text-slate-200 animate-in fade-in duration-75`}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 mb-0.5">
                  Select Target Act
                </div>
                {acts.map((act) => {
                  const isCurrent = (targetQuest.act || 1) === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        updateQuestField(targetQuest.uid, 'act', act.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors"
                    >
                      <span className="truncate">
                        Act {act.id}: {act.title}
                      </span>
                      {isCurrent && <span className="text-[10px] text-indigo-400 font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Change Category Submenu */}
          <div
            className="relative"
            onMouseEnter={() => setActiveSubmenu('category')}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white"
            >
              <span className="flex items-center gap-2.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Change Category...
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {activeSubmenu === 'category' && (
              <div
                className={`absolute top-0 ${
                  flipX ? 'right-full mr-1' : 'left-full ml-1'
                } w-[180px] bg-slate-900/98 border border-slate-700/80 rounded-xl shadow-2xl py-1 text-xs text-slate-200 animate-in fade-in duration-75`}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800 mb-0.5">
                  Category
                </div>
                {categories.map((cat) => {
                  const isCurrent = targetQuest.category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        updateQuestField(targetQuest.uid, 'category', cat.value);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors"
                    >
                      <span>{cat.label}</span>
                      {isCurrent && <span className="text-[10px] text-indigo-400 font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toggle Simulator Completed */}
          <button
            type="button"
            onClick={() => {
              toggleSimulatorQuestCompletion(targetQuest.uid);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white"
          >
            {isQuestCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>{isQuestCompleted ? 'Mark Incomplete' : 'Simulate Complete'}</span>
          </button>

          <div className="my-1 border-t border-slate-800/80" />

          {/* Delete Quest */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete quest "${targetQuest.title}" (${targetQuest.code})?`)) {
                deleteQuest(targetQuest.uid);
              }
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 text-left transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Delete Quest
            </span>
            <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800/80 text-slate-400">
              Del
            </kbd>
          </button>
        </div>
      )}

      {/* 3. EDGE CONTEXT (CONNECTION) */}
      {menuState.targetType === 'EDGE' && targetEdge && (
        <div className="space-y-0.5">
          <div className="px-3 py-1 flex items-center justify-between border-b border-slate-800/80 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Connection
            </span>
            <span className="font-mono text-[10px] text-slate-500 truncate max-w-[110px]">
              {targetEdge.type}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddWaypoint}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white"
          >
            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Waypoint Here</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearEdgeWaypoints(targetEdge.id);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-800/80 text-left transition-colors text-slate-200 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset / Straighten</span>
          </button>

          <div className="my-1 border-t border-slate-800/80" />

          <button
            type="button"
            onClick={() => {
              deleteEdge(targetEdge.id);
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 text-left transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              Delete Connection
            </span>
            <kbd className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800/80 text-slate-400">
              Del
            </kbd>
          </button>
        </div>
      )}
    </div>
  );
};
