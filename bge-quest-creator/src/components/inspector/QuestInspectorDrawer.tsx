import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Trash2,
  Plus,
  Zap,
  Eye,
  EyeOff,
  Package,
  Layers,
  Tag,
  AlertTriangle,
  ChevronRight,
  GitBranch,
  RotateCcw,
  Pencil,
  ChevronUp,
  ChevronDown,
  Check,
  Globe,
  Volume2,
  Sparkles,
  Key,
  Loader2,
  Mic,
  Dices,
  Compass,
  Clock
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { VariantTabsEditor } from './VariantTabsEditor';
import { DragonEclipseTestTableEditor } from './DragonEclipseTestTableEditor';
import { OutcomeEffectsEditor, OutcomeEffectsBadges, OutcomeEffectsValues } from './OutcomeEffectsEditor';
import { TabletopCardPreview } from './TabletopCardPreview';
import { evaluateCampaignSimulation } from '../../utils/simulatorEngine';
import {
  QuestModel,
  RewardOutcome,
  QuestCategory,
  PrereqLogic,
  DevStatus,
  EdgeRelationType,
  QuestAudioTrack,
  QuestVariantOverride,
  createDefaultDragonEclipseTestConfig,
  syncTestOutcomesToRewardOutcomes,
  DragonEclipseEventSlot,
  createDefaultExplorationConfig
} from '../../types/campaign';
import { NumberStepperInput } from '../common/NumberStepperInput';
import { QuestAudioPlayer } from '../audio/QuestAudioPlayer';
import {
  generateQuestAudioWithGemini,
  GEMINI_TTS_VOICES,
  NARRATOR_STYLES
} from '../../services/geminiTtsService';
import { saveQuestAudioBlob, triggerAudioFileDownload } from '../../utils/audioStorage';

export const QuestInspectorDrawer: React.FC = () => {
  const selectedQuestId = useCampaignStore((s) => s.selectedQuestId);
  const selectedEdgeId = useCampaignStore((s) => s.selectedEdgeId);
  const quests = useCampaignStore((s) => s.quests);
  const edges = useCampaignStore((s) => s.edges);
  const acts = useCampaignStore((s) => s.acts);
  const simulator = useCampaignStore((s) => s.simulator);
  const activeVariantTab = useCampaignStore((s) => s.activeVariantTab);
  const activeGameProfile = useCampaignStore((s) => s.activeGameProfile);

  const selectQuest = useCampaignStore((s) => s.selectQuest);
  const selectEdge = useCampaignStore((s) => s.selectEdge);
  const updateQuestField = useCampaignStore((s) => s.updateQuestField);
  const deleteQuest = useCampaignStore((s) => s.deleteQuest);
  const addRewardOutcome = useCampaignStore((s) => s.addRewardOutcome);
  const updateRewardOutcome = useCampaignStore((s) => s.updateRewardOutcome);
  const reorderRewardOutcome = useCampaignStore((s) => s.reorderRewardOutcome);
  const deleteRewardOutcome = useCampaignStore((s) => s.deleteRewardOutcome);
  const addEdge = useCampaignStore((s) => s.addEdge);
  const addQuest = useCampaignStore((s) => s.addQuest);
  const deleteEdge = useCampaignStore((s) => s.deleteEdge);
  const updateEdge = useCampaignStore((s) => s.updateEdge);
  const clearEdgeWaypoints = useCampaignStore((s) => s.clearEdgeWaypoints);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);
  const attachQuestAudioTrack = useCampaignStore((s) => s.attachQuestAudioTrack);
  const deleteQuestAudioTrack = useCampaignStore((s) => s.deleteQuestAudioTrack);

  const [showCardPreview, setShowCardPreview] = useState(true);

  // Drawer Resizing State & Persistence
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('questflow_drawer_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 320 && parsed <= 1200) return parsed;
      }
    } catch {}
    return 400;
  });

  const [isResizing, setIsResizing] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(drawerWidth);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = drawerWidth;
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startXRef.current - e.clientX;
      const minW = 320;
      const maxW = Math.min(1200, Math.floor(window.innerWidth * 0.85));
      const newWidth = Math.max(minW, Math.min(maxW, startWidthRef.current + deltaX));
      setDrawerWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem('questflow_drawer_width', String(drawerWidth));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, drawerWidth]);

  // New reward outcome form state
  const [newRewardLabel, setNewRewardLabel] = useState('');
  const [newRewardIsChoice, setNewRewardIsChoice] = useState(false);
  const [newRewardEffects, setNewRewardEffects] = useState<OutcomeEffectsValues>({
    gold: 0,
    damage: 0,
    fatigue: 0,
    energy: 0,
    essence: 0,
    timeAdvance: 0
  });
  const [newRewardItems, setNewRewardItems] = useState('');
  const [newRewardTags, setNewRewardTags] = useState('');
  const [isAddingReward, setIsAddingReward] = useState(false);

  // Editing existing reward outcome form state
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [editRewardLabel, setEditRewardLabel] = useState('');
  const [editRewardIsChoice, setEditRewardIsChoice] = useState(false);
  const [editRewardEffects, setEditRewardEffects] = useState<OutcomeEffectsValues>({
    gold: 0,
    damage: 0,
    fatigue: 0,
    energy: 0,
    essence: 0,
    timeAdvance: 0
  });
  const [editRewardItems, setEditRewardItems] = useState('');
  const [editRewardTags, setEditRewardTags] = useState('');
  const [newRewardTargetTestId, setNewRewardTargetTestId] = useState('');
  const [editRewardTargetTestId, setEditRewardTargetTestId] = useState('');
  const [selectedTestToTrigger, setSelectedTestToTrigger] = useState('');

  // TTS Voice Narration state
  const [selectedVoice, setSelectedVoice] = useState<string>(GEMINI_TTS_VOICES[0].id);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(NARRATOR_STYLES[0].id);
  const [audioTargetField, setAudioTargetField] = useState<'flavorText' | 'setupInstructions' | 'combined'>('flavorText');
  const [selectedVariantTarget, setSelectedVariantTarget] = useState<string>('base');
  const [showTtsPreview, setShowTtsPreview] = useState<boolean>(false);
  const [isGeneratingTts, setIsGeneratingTts] = useState<boolean>(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const currentQuest = selectedQuestId ? quests[selectedQuestId] : null;

  // Active variants in current simulation
  const simState = useMemo(() => {
    return evaluateCampaignSimulation(
      quests,
      edges,
      simulator.activeRewardChoices,
      simulator.completedQuestIds,
      simulator.customTags,
      simulator.manualTimeOffset || 0
    );
  }, [quests, edges, simulator]);

  const activeVariants = currentQuest
    ? simState.activeVariantsByQuest[currentQuest.uid] || []
    : [];

  // Outgoing and Incoming edges for this quest
  const outgoingEdges = useMemo(() => {
    if (!currentQuest) return [];
    return edges.filter((e) => e.source === currentQuest.uid);
  }, [edges, currentQuest]);

  const incomingEdges = useMemo(() => {
    if (!currentQuest) return [];
    return edges.filter((e) => e.target === currentQuest.uid);
  }, [edges, currentQuest]);

  const testQuests = useMemo(() => {
    return Object.values(quests).filter((q) => q.category === 'TEST' || Boolean(q.testConfig));
  }, [quests]);

  const outgoingTestEdges = useMemo(() => {
    if (!currentQuest) return [];
    return outgoingEdges.filter((e) => {
      const tgt = quests[e.target];
      return tgt && (tgt.category === 'TEST' || Boolean(tgt.testConfig));
    });
  }, [outgoingEdges, quests, currentQuest]);

  const currentEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  // Compute synthesized text and word/char counts based on target scope and field
  // (Must be declared before any conditional early returns to satisfy Rules of Hooks)
  const computedNarration = useMemo(() => {
    if (!currentQuest) {
      return {
        scope: 'base' as const,
        variant: null as QuestVariantOverride | null,
        effectiveTitle: '',
        body: '',
        fullText: '',
        wordCount: 0,
        charCount: 0
      };
    }

    let scope: 'base' | 'mutation' | 'merged' = 'base';
    let variant: QuestVariantOverride | null = null;

    if (selectedVariantTarget.startsWith('mutation:')) {
      scope = 'mutation';
      const vid = selectedVariantTarget.slice('mutation:'.length);
      variant = currentQuest.variants.find((v) => v.id === vid) || null;
    } else if (selectedVariantTarget.startsWith('merged:')) {
      scope = 'merged';
      const vid = selectedVariantTarget.slice('merged:'.length);
      variant = currentQuest.variants.find((v) => v.id === vid) || null;
    }

    // Effective title (overrideTitle if present on variant, else quest base title)
    const effectiveTitle = (variant && variant.overrideTitle?.trim())
      ? variant.overrideTitle.trim()
      : currentQuest.title.trim();

    let body = '';
    if (scope === 'base' || !variant) {
      scope = 'base';
      if (audioTargetField === 'flavorText') {
        body = currentQuest.flavorText?.trim() || '';
      } else if (audioTargetField === 'setupInstructions') {
        body = currentQuest.setupInstructions?.trim() || '';
      } else {
        body = [currentQuest.flavorText?.trim(), currentQuest.setupInstructions?.trim()]
          .filter(Boolean)
          .join('\n\n');
      }
    } else if (scope === 'mutation') {
      if (audioTargetField === 'flavorText') {
        body = variant.additionalFlavorText?.trim() || '';
      } else if (audioTargetField === 'setupInstructions') {
        body = variant.setupModifications?.trim() || '';
      } else {
        body = [variant.additionalFlavorText?.trim(), variant.setupModifications?.trim()]
          .filter(Boolean)
          .join('\n\n');
      }
    } else if (scope === 'merged') {
      const mergedFlavor = [currentQuest.flavorText?.trim(), variant.additionalFlavorText?.trim()]
        .filter(Boolean)
        .join('\n\n');
      const mergedSetup = [currentQuest.setupInstructions?.trim(), variant.setupModifications?.trim()]
        .filter(Boolean)
        .join('\n\n');

      if (audioTargetField === 'flavorText') {
        body = mergedFlavor;
      } else if (audioTargetField === 'setupInstructions') {
        body = mergedSetup;
      } else {
        body = [mergedFlavor, mergedSetup].filter(Boolean).join('\n\n');
      }
    }

    let fullText = '';
    if (effectiveTitle && body) {
      const titleWithPunctuation = /[.!?]$/.test(effectiveTitle) ? effectiveTitle : `${effectiveTitle}.`;
      fullText = `${titleWithPunctuation}\n\n${body}`;
    } else if (effectiveTitle) {
      fullText = effectiveTitle;
    } else {
      fullText = body;
    }

    const trimmed = fullText.trim();
    const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
    const charCount = fullText.length;

    return {
      scope,
      variant,
      effectiveTitle,
      body,
      fullText,
      wordCount,
      charCount
    };
  }, [currentQuest, selectedVariantTarget, audioTargetField]);

  const previewFileName = useMemo(() => {
    if (!currentQuest) return '';
    const { scope, variant } = computedNarration;
    const fieldCode = audioTargetField === 'flavorText' ? 'flavor' : audioTargetField === 'setupInstructions' ? 'setup' : 'combined';
    const cleanTag = variant?.requiredStateTag
      ? variant.requiredStateTag.replace(/^\+{1,2}/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
      : '';
    const styleCode = selectedStyleId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return cleanTag
      ? `${currentQuest.code.toLowerCase()}_${scope}_${cleanTag}_${fieldCode}_${selectedVoice.toLowerCase()}_${styleCode}.wav`
      : `${currentQuest.code.toLowerCase()}_${scope}_${fieldCode}_${selectedVoice.toLowerCase()}_${styleCode}.wav`;
  }, [currentQuest, computedNarration, audioTargetField, selectedVoice, selectedStyleId]);

  // If an edge is selected, render Connection Properties Inspector
  if (selectedEdgeId && currentEdge) {
    const srcQuest = quests[currentEdge.source];
    const tgtQuest = quests[currentEdge.target];
    const srcReward = srcQuest?.rewardOutcomes.find((r) => r.id === currentEdge.sourcePortId);

    return (
      <>
        {/* Mobile Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
          onClick={() => selectEdge(null)}
        />
        {isResizing && (
          <div className="fixed inset-0 z-50 cursor-ew-resize select-none" />
        )}
        <div
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${drawerWidth}px` : undefined }}
          className="w-full md:w-auto h-full bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden shadow-2xl z-40 fixed md:relative inset-y-0 right-0 animate-in slide-in-from-right duration-200 shrink-0"
        >
          {/* Drag Handle on Left Edge (desktop) */}
          <div
            onMouseDown={handleMouseDownResize}
            className="hidden md:flex absolute top-0 bottom-0 -left-1.5 w-3 cursor-ew-resize hover:bg-indigo-500/30 active:bg-indigo-500/60 transition-colors z-50 group items-center justify-center select-none"
            title="Drag to resize inspector drawer"
          >
            <div className="w-1 h-10 rounded-full bg-slate-600/60 group-hover:bg-indigo-400 group-active:bg-indigo-300 transition-colors" />
          </div>
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
              <GitBranch className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-xs text-slate-100">Connection Properties</h3>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                {currentEdge.label || currentEdge.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => selectEdge(null)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Source & Target Cards */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Source Quest
              </span>
              <div className="text-xs font-semibold text-slate-200 mt-0.5">
                {srcQuest?.code}: {srcQuest?.title}
              </div>
              {srcReward && (
                <div className="text-[11px] text-indigo-400 mt-0.5">
                  Port: {srcReward.label}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Target Quest
              </span>
              <div className="text-xs font-semibold text-slate-200 mt-0.5">
                {tgtQuest?.code}: {tgtQuest?.title}
              </div>
            </div>
          </div>

          {/* Connection Type */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Connection Type
            </label>
            <select
              value={currentEdge.type}
              onChange={(e) =>
                updateEdge(currentEdge.id, { type: e.target.value as EdgeRelationType })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="UNLOCKS">UNLOCKS (Standard Prerequisite)</option>
              <option value="CHOICE_BRANCH">CHOICE_BRANCH (Exclusive Pick)</option>
              <option value="MUTATION">MUTATION (Carries State Tag)</option>
              <option value="LOCKOUT">LOCKOUT (Mutually Exclusive)</option>
            </select>
          </div>

          {/* State Tag carried */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Carried State Tag (Optional)
            </label>
            <input
              type="text"
              value={currentEdge.stateTag || ''}
              onChange={(e) =>
                updateEdge(currentEdge.id, { stateTag: e.target.value || null })
              }
              placeholder="e.g. Idol_Kept"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Edge Display Label
            </label>
            <input
              type="text"
              value={currentEdge.label || ''}
              onChange={(e) =>
                updateEdge(currentEdge.id, { label: e.target.value || undefined })
              }
              placeholder="e.g. +Idol_Kept"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Waypoints info */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-300">Custom Bends</span>
              <p className="text-[10px] text-slate-500">
                {currentEdge.waypoints?.length
                  ? `${currentEdge.waypoints.length} waypoint(s) defined`
                  : 'Default direct route'}
              </p>
            </div>
            {Boolean(currentEdge.waypoints?.length) && (
              <button
                type="button"
                onClick={() => clearEdgeWaypoints(currentEdge.id)}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 text-xs text-slate-300 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Route
              </button>
            )}
          </div>

          {/* Delete Connection CTA */}
          <div className="pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                deleteEdge(currentEdge.id);
                selectEdge(null);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold transition-colors shadow"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Connection
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2 leading-relaxed">
              Tip: You can also select the edge and press <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Delete</kbd> or <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Backspace</kbd>.
            </p>
          </div>
        </div>
      </div>
      </>
    );
  }

  if (!currentQuest) {
    return (
      <div className="w-full sm:w-[400px] md:w-80 h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col items-center justify-center text-center text-slate-500 fixed md:relative inset-y-0 right-0 z-40">
        <Layers className="w-10 h-10 mb-3 opacity-30" />
        <h3 className="font-semibold text-slate-300 mb-1">No Selection</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Click any quest card or connection on the canvas to inspect details, modify scenario rewards, or edit properties.
        </p>
      </div>
    );
  }

  const handleLinkExistingTest = (targetTestUid: string, sourcePortId?: string | null) => {
    if (!currentQuest || !targetTestUid) return;
    const exists = edges.some(
      (e) => e.source === currentQuest.uid && e.target === targetTestUid && (sourcePortId ? e.sourcePortId === sourcePortId : true)
    );
    if (exists) return;

    addEdge({
      id: `e-${currentQuest.uid}-${targetTestUid}-${Date.now().toString(36)}`,
      source: currentQuest.uid,
      sourcePortId: sourcePortId || null,
      target: targetTestUid,
      targetHandle: 'in',
      label: 'Triggers Test',
      type: sourcePortId ? 'CHOICE_BRANCH' : 'UNLOCKS'
    });
  };

  const handleCreateAndTriggerNewTest = (sourcePortId?: string | null) => {
    if (!currentQuest) return;
    const actId = currentQuest.act || 1;
    const existingCodes = new Set(Object.values(quests).map((q) => q.code.toUpperCase()));
    let num = 1;
    while (existingCodes.has(`T${String(num).padStart(2, '0')}`)) {
      num++;
    }
    const code = `T${String(num).padStart(2, '0')}`;
    const newUid = `q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const testConfig = createDefaultDragonEclipseTestConfig(`Skill Test ${code}`);
    const defaultRewards = syncTestOutcomesToRewardOutcomes(testConfig);

    const sameTierQuests = Object.values(quests).filter((q) => (q.tier || 1) === (currentQuest.tier || 1) + 1);
    const posX = Math.round((currentQuest.position?.x ?? 60) + 360);
    const posY = Math.round((currentQuest.position?.y ?? 80) + (sameTierQuests.length % 2 === 0 ? 0 : 70));

    const newQuest: QuestModel = {
      uid: newUid,
      code,
      title: `Skill Test: ${code}`,
      act: actId,
      tier: (currentQuest.tier || 1) + 1,
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

    addEdge({
      id: `e-${currentQuest.uid}-${newUid}-${Date.now().toString(36)}`,
      source: currentQuest.uid,
      sourcePortId: sourcePortId || currentQuest.rewardOutcomes[0]?.id || null,
      target: newUid,
      targetHandle: 'in',
      type: sourcePortId ? 'CHOICE_BRANCH' : 'UNLOCKS',
      label: 'Triggers Test'
    });

    selectQuest(newUid);
  };

  const handleCreateReward = () => {
    if (!newRewardLabel.trim()) return;
    const cleanTags = newRewardTags
      .split(',')
      .map((t) => {
        const trimmed = t.trim();
        if (!trimmed) return '';
        const prefix = trimmed.startsWith('++') ? '++' : '+';
        const cleanBody = trimmed.replace(/^\+{1,2}/, '').trim().replace(/\s+/g, '_');
        return cleanBody ? `${prefix}${cleanBody}` : '';
      })
      .filter(Boolean);
    const cleanItems = newRewardItems
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    const newRewardId = `out-${Date.now().toString(36)}`;
    const newReward: RewardOutcome = {
      id: newRewardId,
      label: newRewardLabel.trim(),
      isExclusiveChoice: newRewardIsChoice,
      gold: Number(newRewardEffects.gold) || 0,
      damage: Number(newRewardEffects.damage) || 0,
      fatigue: Number(newRewardEffects.fatigue) || 0,
      energy: Number(newRewardEffects.energy) || 0,
      essence: Number(newRewardEffects.essence) || 0,
      timeAdvance: Number(newRewardEffects.timeAdvance) || 0,
      items: cleanItems,
      grantsStateTags: cleanTags
    };

    addRewardOutcome(currentQuest.uid, newReward);

    if (newRewardTargetTestId) {
      handleLinkExistingTest(newRewardTargetTestId, newRewardId);
    }

    setNewRewardLabel('');
    setNewRewardIsChoice(false);
    setNewRewardEffects({
      gold: 0,
      damage: 0,
      fatigue: 0,
      energy: 0,
      essence: 0,
      timeAdvance: 0
    });
    setNewRewardItems('');
    setNewRewardTags('');
    setNewRewardTargetTestId('');
    setIsAddingReward(false);
  };

  const handleStartEditReward = (reward: RewardOutcome) => {
    setEditingRewardId(reward.id);
    setEditRewardLabel(reward.label);
    setEditRewardIsChoice(reward.isExclusiveChoice);
    setEditRewardEffects({
      gold: reward.gold || 0,
      damage: reward.damage || 0,
      fatigue: reward.fatigue || 0,
      energy: reward.energy || 0,
      essence: reward.essence || 0,
      timeAdvance: reward.timeAdvance || 0
    });
    setEditRewardItems(reward.items.join(', '));
    setEditRewardTags(reward.grantsStateTags.join(', '));

    const existingEdge = outgoingEdges.find(
      (e) => e.sourcePortId === reward.id && quests[e.target] && (quests[e.target].category === 'TEST' || Boolean(quests[e.target].testConfig))
    );
    setEditRewardTargetTestId(existingEdge?.target || '');
    setIsAddingReward(false);
  };

  const handleCancelEditReward = () => {
    setEditingRewardId(null);
    setEditRewardTargetTestId('');
  };

  const handleSaveEditReward = (rewardId: string) => {
    if (!currentQuest || !editRewardLabel.trim()) return;
    const cleanTags = editRewardTags
      .split(',')
      .map((t) => {
        const trimmed = t.trim();
        if (!trimmed) return '';
        const prefix = trimmed.startsWith('++') ? '++' : '+';
        const cleanBody = trimmed.replace(/^\+{1,2}/, '').trim().replace(/\s+/g, '_');
        return cleanBody ? `${prefix}${cleanBody}` : '';
      })
      .filter(Boolean);
    const cleanItems = editRewardItems
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    updateRewardOutcome(currentQuest.uid, rewardId, {
      label: editRewardLabel.trim(),
      isExclusiveChoice: editRewardIsChoice,
      gold: Number(editRewardEffects.gold) || 0,
      damage: Number(editRewardEffects.damage) || 0,
      fatigue: Number(editRewardEffects.fatigue) || 0,
      energy: Number(editRewardEffects.energy) || 0,
      essence: Number(editRewardEffects.essence) || 0,
      timeAdvance: Number(editRewardEffects.timeAdvance) || 0,
      items: cleanItems,
      grantsStateTags: cleanTags
    });

    // Check if test edge changed
    const existingTestEdge = outgoingEdges.find(
      (e) => e.sourcePortId === rewardId && quests[e.target] && (quests[e.target].category === 'TEST' || Boolean(quests[e.target].testConfig))
    );

    if (existingTestEdge && existingTestEdge.target !== editRewardTargetTestId) {
      deleteEdge(existingTestEdge.id);
    }
    if (editRewardTargetTestId && (!existingTestEdge || existingTestEdge.target !== editRewardTargetTestId)) {
      handleLinkExistingTest(editRewardTargetTestId, rewardId);
    }

    setEditingRewardId(null);
    setEditRewardTargetTestId('');
  };

  const handleGenerateAudio = async () => {
    if (!currentQuest) return;

    if (!geminiApiKey) {
      setModalOpen('apiKeyModal', true);
      return;
    }

    const { fullText, scope, variant } = computedNarration;

    if (!fullText.trim()) {
      setTtsError(`No text found for the selected scope (${scope}) and field (${audioTargetField}). Please write some quest text first.`);
      return;
    }

    setIsGeneratingTts(true);
    setTtsError(null);

    try {
      const selectedStyle = NARRATOR_STYLES.find((s) => s.id === selectedStyleId);
      const audioResult = await generateQuestAudioWithGemini({
        apiKey: geminiApiKey,
        text: fullText,
        voice: selectedVoice,
        stylePrompt: selectedStyle?.prompt
      });

      const trackId = `audio_${Date.now()}`;
      
      const fieldCode = audioTargetField === 'flavorText' ? 'flavor' : audioTargetField === 'setupInstructions' ? 'setup' : 'combined';
      const cleanTag = variant?.requiredStateTag
        ? variant.requiredStateTag.replace(/^\+{1,2}/, '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
        : '';
      const styleCode = (selectedStyle?.id || selectedStyleId).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      
      const fileName = cleanTag
        ? `${currentQuest.code.toLowerCase()}_${scope}_${cleanTag}_${fieldCode}_${selectedVoice.toLowerCase()}_${styleCode}.wav`
        : `${currentQuest.code.toLowerCase()}_${scope}_${fieldCode}_${selectedVoice.toLowerCase()}_${styleCode}.wav`;

      // 1. Save binary Blob to IndexedDB
      await saveQuestAudioBlob(trackId, audioResult.blob);

      // 2. Attach track metadata to quest
      const track: QuestAudioTrack = {
        id: trackId,
        targetField: audioTargetField,
        scope,
        variantId: variant?.id,
        variantTag: variant?.requiredStateTag,
        fileName,
        voice: selectedVoice,
        stylePrompt: selectedStyle?.label,
        mimeType: audioResult.mimeType,
        blobKey: trackId,
        createdAt: new Date().toISOString()
      };
      attachQuestAudioTrack(currentQuest.uid, track);

      // 3. Immediately trigger automatic browser download
      triggerAudioFileDownload(fileName, audioResult.blob);
    } catch (err: any) {
      console.error('Gemini TTS generation failed:', err);
      setTtsError(err?.message || 'Failed to generate audio via Gemini TTS');
    } finally {
      setIsGeneratingTts(false);
    }
  };

  if (!currentQuest) {
    return null;
  }

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        onClick={() => selectQuest(null)}
      />
      {isResizing && (
        <div className="fixed inset-0 z-50 cursor-ew-resize select-none" />
      )}
      <div
        style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${drawerWidth}px` : undefined }}
        className="w-full md:w-auto h-full bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden shadow-2xl z-40 fixed md:relative inset-y-0 right-0 animate-in slide-in-from-right duration-200 shrink-0"
      >
        {/* Drag Handle on Left Edge (desktop) */}
        <div
          onMouseDown={handleMouseDownResize}
          className="hidden md:flex absolute top-0 bottom-0 -left-1.5 w-3 cursor-ew-resize hover:bg-indigo-500/30 active:bg-indigo-500/60 transition-colors z-50 group items-center justify-center select-none"
          title="Drag to resize inspector drawer"
        >
          <div className="w-1 h-10 rounded-full bg-slate-600/60 group-hover:bg-indigo-400 group-active:bg-indigo-300 transition-colors" />
        </div>
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
            {currentQuest.code}
          </span>
          <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">
            {currentQuest.title}
          </span>
        </div>
        <button
          type="button"
          onClick={() => selectQuest(null)}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Identity & Core Settings */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              {activeGameProfile.terminology?.questTerm || 'Quest'} Title
            </label>
            <input
              type="text"
              value={currentQuest.title}
              onChange={(e) => updateQuestField(currentQuest.uid, 'title', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {activeGameProfile.terminology?.questTerm || 'Quest'} Code
              </label>
              <input
                type="text"
                value={currentQuest.code}
                onChange={(e) => updateQuestField(currentQuest.uid, 'code', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Parallel {activeGameProfile.terminology?.tierTerm || 'Tier'}
              </label>
              <NumberStepperInput
                value={currentQuest.tier}
                onChange={(val) => updateQuestField(currentQuest.uid, 'tier', val)}
                min={1}
                max={10}
                colorScheme="indigo"
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {activeGameProfile.terminology?.campaignTerm || 'Campaign'} {activeGameProfile.terminology?.actTerm || 'Act'}
              </label>
              <select
                value={currentQuest.act || 1}
                onChange={(e) => updateQuestField(currentQuest.uid, 'act', Number(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              >
                {acts.map((act) => (
                  <option key={act.id} value={act.id}>
                    {activeGameProfile.terminology?.actTerm || 'Act'} {act.id}: {act.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Category
              </label>
              <select
                value={currentQuest.category}
                onChange={(e) => {
                  const newCategory = e.target.value;
                  updateQuestField(currentQuest.uid, 'category', newCategory);
                  if (newCategory === 'TEST' && !currentQuest.testConfig) {
                    const defaultCfg = createDefaultDragonEclipseTestConfig(currentQuest.title || 'Skill Test');
                    updateQuestField(currentQuest.uid, 'testConfig', defaultCfg);
                    updateQuestField(currentQuest.uid, 'rewardOutcomes', syncTestOutcomesToRewardOutcomes(defaultCfg));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {(activeGameProfile.categories || []).map((catDef) => (
                  <option key={catDef.id} value={catDef.id}>
                    {catDef.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Prereq Gate
            </label>
            <select
              value={currentQuest.prereqLogic}
              onChange={(e) => updateQuestField(currentQuest.uid, 'prereqLogic', e.target.value as PrereqLogic)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="START">Starter (No Prereqs)</option>
              <option value="ALL">AND Gate (Requires All)</option>
              <option value="ANY">OR Gate (Requires Any)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Subflow Slot
              </label>
              <input
                type="text"
                value={currentQuest.parentSlot || ''}
                onChange={(e) => updateQuestField(currentQuest.uid, 'parentSlot', e.target.value || null)}
                placeholder="e.g. SLOT_M02"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Required Tag
              </label>
              <input
                type="text"
                value={currentQuest.requiredTag || ''}
                onChange={(e) => updateQuestField(currentQuest.uid, 'requiredTag', e.target.value || undefined)}
                placeholder="e.g. Idol_Kept"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Dragon Eclipse World Exploration Stage & Time Track */}
        <div className="p-3 rounded-xl bg-teal-950/20 border border-teal-900/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(currentQuest.isExplorationStage || currentQuest.category === 'EXPLORATION' || currentQuest.explorationConfig)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateQuestField(currentQuest.uid, 'isExplorationStage', checked);
                  if (checked && !currentQuest.explorationConfig) {
                    updateQuestField(currentQuest.uid, 'explorationConfig', createDefaultExplorationConfig());
                  }
                }}
                className="rounded border-teal-700 bg-slate-900 text-teal-500 focus:ring-0"
              />
              <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-teal-400" />
                World Exploration Stage (Time Track)
              </span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-teal-400 font-semibold flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                Base Cost:
              </span>
              <NumberStepperInput
                value={currentQuest.timeAdvance || 0}
                onChange={(val) => updateQuestField(currentQuest.uid, 'timeAdvance', val)}
                min={0}
                max={10}
                colorScheme="teal"
                title="Base exploration time cost to enter/complete this quest"
              />
            </div>
          </div>

          {Boolean(currentQuest.isExplorationStage || currentQuest.category === 'EXPLORATION' || currentQuest.explorationConfig) && (
            <div className="space-y-3 pt-2.5 border-t border-teal-900/40 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 block">
                    Starting Time Limit
                  </span>
                  <span className="text-[10px] text-slate-500">Counts down to 0</span>
                </div>
                <NumberStepperInput
                  value={currentQuest.explorationConfig?.trackLength || 8}
                  onChange={(val) => {
                    const existingConfig = currentQuest.explorationConfig || createDefaultExplorationConfig();
                    updateQuestField(currentQuest.uid, 'explorationConfig', {
                      ...existingConfig,
                      trackLength: val
                    });
                  }}
                  min={2}
                  max={24}
                  colorScheme="teal"
                  suffix="units"
                />
              </div>

              {/* Scenario End Quest Selection */}
              <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-400" />
                    Scenario End Quest (at 0 Time)
                  </span>
                  <select
                    value={currentQuest.explorationConfig?.scenarioEndQuestId || ''}
                    onChange={(e) => {
                      const existing = currentQuest.explorationConfig || createDefaultExplorationConfig();
                      updateQuestField(currentQuest.uid, 'explorationConfig', {
                        ...existing,
                        scenarioEndQuestId: e.target.value || undefined
                      });
                    }}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200 max-w-[150px] truncate focus:outline-none focus:border-rose-500"
                  >
                    <option value="">None (Custom Edge)</option>
                    {Object.values(quests)
                      .filter((q) => q.uid !== currentQuest.uid)
                      .map((q) => (
                        <option key={q.uid} value={q.uid}>
                          {q.code}: {q.title}
                        </option>
                      ))}
                  </select>
                </div>

                <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentQuest.explorationConfig?.autoLockoutStageOnEnd !== false}
                    onChange={(e) => {
                      const existing = currentQuest.explorationConfig || createDefaultExplorationConfig();
                      updateQuestField(currentQuest.uid, 'explorationConfig', {
                        ...existing,
                        autoLockoutStageOnEnd: e.target.checked
                      });
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-teal-500"
                  />
                  <span>Auto-lock uncompleted exploration quests on Scenario End</span>
                </label>
              </div>

              {/* Event Slots Config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      Milestone Triggers
                    </span>
                    <span className="text-[10px] text-slate-500">Unlocks quest steps when time runs low</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const existingConfig = currentQuest.explorationConfig || createDefaultExplorationConfig();
                      const trackLen = existingConfig.trackLength || 8;
                      const nextThresh = Math.max(
                        1,
                        (existingConfig.eventSlots[existingConfig.eventSlots.length - 1]?.triggerAtRemaining || 4) - 2
                      );
                      const newSlot: DragonEclipseEventSlot = {
                        slotNumber: existingConfig.eventSlots.length + 1,
                        triggerAtRemaining: nextThresh,
                        title: `Event Step ${existingConfig.eventSlots.length + 1}`,
                        description: 'Draw an Event card or resolve scenario milestone.',
                        grantsStateTag: `+Event_Step_${existingConfig.eventSlots.length + 1}`
                      };
                      updateQuestField(currentQuest.uid, 'explorationConfig', {
                        ...existingConfig,
                        eventSlots: [...existingConfig.eventSlots, newSlot]
                      });
                    }}
                    className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Milestone
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(currentQuest.explorationConfig?.eventSlots || []).map((slot, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2 rounded bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-[10px]">
                            ≤ {slot.triggerAtRemaining ?? Math.max(0, (currentQuest.explorationConfig?.trackLength || 8) - slot.slotNumber)} Left
                          </span>
                          <NumberStepperInput
                            value={slot.triggerAtRemaining ?? Math.max(0, (currentQuest.explorationConfig?.trackLength || 8) - slot.slotNumber)}
                            onChange={(val) => {
                              const existingConfig = currentQuest.explorationConfig || createDefaultExplorationConfig();
                              const updatedSlots = existingConfig.eventSlots.map((s, idx) =>
                                idx === sIdx ? { ...s, triggerAtRemaining: val } : s
                              );
                              updateQuestField(currentQuest.uid, 'explorationConfig', {
                                ...existingConfig,
                                eventSlots: updatedSlots
                              });
                            }}
                            min={0}
                            max={currentQuest.explorationConfig?.trackLength || 8}
                            colorScheme="amber"
                            title="Trigger threshold (when Time Remaining reaches this value)"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const existingConfig = currentQuest.explorationConfig || createDefaultExplorationConfig();
                            const updatedSlots = existingConfig.eventSlots.filter((_, idx) => idx !== sIdx);
                            updateQuestField(currentQuest.uid, 'explorationConfig', {
                              ...existingConfig,
                              eventSlots: updatedSlots
                            });
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                          title="Delete milestone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={slot.title}
                          onChange={(e) => {
                            const existingConfig = currentQuest.explorationConfig || createDefaultExplorationConfig();
                            const updatedSlots = existingConfig.eventSlots.map((s, idx) =>
                              idx === sIdx ? { ...s, title: e.target.value } : s
                            );
                            updateQuestField(currentQuest.uid, 'explorationConfig', {
                              ...existingConfig,
                              eventSlots: updatedSlots
                            });
                          }}
                          className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                          placeholder="Event Title"
                        />

                        {/* Trigger Target Quest Selection */}
                        <select
                          value={slot.targetQuestId || ''}
                          onChange={(e) => {
                            const existingConfig = currentQuest.explorationConfig || createDefaultExplorationConfig();
                            const updatedSlots = existingConfig.eventSlots.map((s, idx) =>
                              idx === sIdx ? { ...s, targetQuestId: e.target.value || undefined } : s
                            );
                            updateQuestField(currentQuest.uid, 'explorationConfig', {
                              ...existingConfig,
                              eventSlots: updatedSlots
                            });
                          }}
                          className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 truncate"
                          title="Quest step to unlock when this milestone triggers"
                        >
                          <option value="">(No Quest - State Tag Only)</option>
                          {Object.values(quests)
                            .filter((q) => q.uid !== currentQuest.uid)
                            .map((q) => (
                              <option key={q.uid} value={q.uid}>
                                Unlocks [{q.code}] {q.title}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dragon Eclipse Skill Test Section (Page 11) */}
        {(currentQuest.category === 'TEST' || Boolean(currentQuest.testConfig)) ? (
          <div className="pt-3 border-t border-slate-800">
            <DragonEclipseTestTableEditor quest={currentQuest} />
          </div>
        ) : (
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Dices className="w-3.5 h-3.5 text-amber-400" />
                  Skill Test Triggers (Page 11)
                </span>
                <span className="text-[10px] text-amber-400/80 font-mono bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-800/60">
                  Item Flips
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Connect this quest to a Dragon Eclipse Skill Test table node to resolve card flip stat checks.
              </p>

              {/* Existing Linked Tests */}
              {outgoingTestEdges.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                    Triggered Skill Tests ({outgoingTestEdges.length}):
                  </span>
                  {outgoingTestEdges.map((e) => {
                    const targetTest = quests[e.target];
                    const sourcePort = currentQuest.rewardOutcomes.find((r) => r.id === e.sourcePortId);
                    return (
                      <div
                        key={e.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-amber-900/40 text-xs"
                      >
                        <div className="min-w-0 flex items-center gap-1.5">
                          <Dices className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <button
                            type="button"
                            onClick={() => selectQuest(e.target)}
                            className="font-medium text-amber-300 hover:text-amber-200 truncate text-left hover:underline cursor-pointer"
                            title="Jump to Skill Test"
                          >
                            [{targetTest?.code || 'Test'}] {targetTest?.title || e.target}
                          </button>
                          {sourcePort && (
                            <span className="text-[10px] text-slate-500 font-mono truncate">
                              via &quot;{sourcePort.label}&quot;
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteEdge(e.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors ml-2 shrink-0 cursor-pointer"
                          title="Disconnect Test"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Wire Existing Test */}
              <div className="space-y-1.5 pt-1 border-t border-amber-900/30">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Trigger Existing Test
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedTestToTrigger}
                    onChange={(e) => setSelectedTestToTrigger(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 truncate"
                  >
                    <option value="">Select a Skill Test...</option>
                    {testQuests
                      .filter((t) => t.uid !== currentQuest.uid)
                      .map((t) => (
                        <option key={t.uid} value={t.uid}>
                          [{t.code}] {t.title}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedTestToTrigger}
                    onClick={() => {
                      if (selectedTestToTrigger) {
                        handleLinkExistingTest(selectedTestToTrigger);
                        setSelectedTestToTrigger('');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold text-xs shrink-0 transition-colors shadow-sm cursor-pointer"
                  >
                    Link Test
                  </button>
                </div>
              </div>

              {/* Quick Create & Trigger New Test */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCreateAndTriggerNewTest()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-amber-400" />
                  <span>+ Create & Trigger New Test</span>
                </button>
              </div>

              {/* Secondary Option: Turn this node into a test */}
              <div className="pt-2 border-t border-amber-900/20 text-right">
                <button
                  type="button"
                  onClick={() => {
                    const defaultCfg = createDefaultDragonEclipseTestConfig(currentQuest.title || 'Skill Test');
                    updateQuestField(currentQuest.uid, 'testConfig', defaultCfg);
                    updateQuestField(currentQuest.uid, 'category', 'TEST');
                    updateQuestField(currentQuest.uid, 'prereqLogic', 'ANY');
                    updateQuestField(currentQuest.uid, 'rewardOutcomes', syncTestOutcomesToRewardOutcomes(defaultCfg));
                  }}
                  className="text-[10px] text-slate-500 hover:text-amber-400/90 underline transition-colors cursor-pointer"
                >
                  Convert this node itself into a Skill Test
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Narrative & Variant Editor */}
        <div className="pt-3 border-t border-slate-800">
          <VariantTabsEditor quest={currentQuest} />
        </div>

        {/* Voice Narration (Gemini TTS) */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              Voice Narration (Gemini TTS)
            </h4>
            <button
              type="button"
              onClick={() => setModalOpen('apiKeyModal', true)}
              className="text-[11px] text-slate-400 hover:text-indigo-400 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-indigo-500/50 transition-colors"
              title="Configure Gemini API Key"
            >
              <Key className="w-3 h-3" />
              {geminiApiKey ? 'API Key Set' : 'Set API Key'}
            </button>
          </div>

          {/* List of attached audio tracks */}
          {currentQuest.audioTracks && currentQuest.audioTracks.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Attached Audio Tracks ({currentQuest.audioTracks.length})
              </span>
              {currentQuest.audioTracks.map((track) => (
                <QuestAudioPlayer
                  key={track.id}
                  track={track}
                  isActiveInSimulation={
                    track.variantTag
                      ? simState.activeStateTags.has(track.variantTag)
                      : track.scope === 'base' || !track.scope
                  }
                  isCurrentTab={
                    track.variantId
                      ? activeVariantTab === track.variantId
                      : (track.scope === 'base' || !track.scope) && activeVariantTab === 'base'
                  }
                  onDelete={() => deleteQuestAudioTrack(currentQuest.uid, track.id)}
                />
              ))}
            </div>
          )}

          {/* Generation Controls */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
            {/* Target Narrative Scope */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Target Narrative Scope
                </label>
                {activeVariantTab !== 'base' && (
                  <button
                    type="button"
                    onClick={() => setSelectedVariantTarget(`merged:${activeVariantTab}`)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors flex items-center gap-0.5"
                    title="Quickly target the variant currently open in the editor tabs"
                  >
                    <span>Use Active Tab</span>
                  </button>
                )}
              </div>
              <select
                value={selectedVariantTarget}
                onChange={(e) => setSelectedVariantTarget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="base">Base Quest Narrative</option>
                {currentQuest.variants.length > 0 && (
                  <optgroup label="── Quest Mutations & Variants ──">
                    {currentQuest.variants.map((v) => (
                      <React.Fragment key={v.id}>
                        <option value={`merged:${v.id}`}>
                          Merged: [{v.requiredStateTag}] (Base + Mutation)
                        </option>
                        <option value={`mutation:${v.id}`}>
                          Mutation Only: [{v.requiredStateTag}] {v.overrideTitle ? `("${v.overrideTitle}")` : ''}
                        </option>
                      </React.Fragment>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Text Source
                </label>
                <select
                  value={audioTargetField}
                  onChange={(e) => setAudioTargetField(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="flavorText">Flavor Text</option>
                  <option value="setupInstructions">Setup Notes</option>
                  <option value="combined">Both (Combined)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Voice
                </label>
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                >
                  {GEMINI_TTS_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Narrator Acting Style
              </label>
              <select
                value={selectedStyleId}
                onChange={(e) => setSelectedStyleId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              >
                {NARRATOR_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Spoken Text Preview Box */}
            <div className="rounded-md border border-slate-800/80 bg-slate-900/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTtsPreview(!showTtsPreview)}
                className="w-full p-2 flex items-center justify-between text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="font-semibold text-slate-400 shrink-0">Preview Spoken Text:</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 shrink-0">
                    {computedNarration.wordCount} words ({computedNarration.charCount} chars)
                  </span>
                </div>
                {showTtsPreview ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </button>

              {showTtsPreview && (
                <div className="p-2.5 pt-0 border-t border-slate-800/60 space-y-1">
                  {computedNarration.fullText ? (
                    <pre className="text-[11px] text-slate-300 font-sans whitespace-pre-wrap max-h-40 overflow-y-auto p-2 rounded bg-slate-950 border border-slate-800 leading-relaxed scrollbar-thin">
                      {computedNarration.fullText}
                    </pre>
                  ) : (
                    <div className="p-2 text-[11px] text-amber-400/90 italic bg-amber-950/20 border border-amber-900/30 rounded">
                      ⚠️ No text found for this combination ({computedNarration.scope} & {audioTargetField}). Enter text above first.
                    </div>
                  )}
                </div>
              )}
            </div>

            {ttsError && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-900/80 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1">{ttsError}</span>
              </div>
            )}

            {previewFileName && (
              <div className="flex items-center justify-between text-[10px] text-slate-400/90 px-1 font-mono">
                <span className="text-slate-500 shrink-0">Download name:</span>
                <span className="text-indigo-300/90 truncate ml-1.5" title={previewFileName}>
                  {previewFileName}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateAudio}
              disabled={isGeneratingTts}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-sm"
            >
              {isGeneratingTts ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Audio via Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate & Download Narration</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Reward Outcome Handles */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Reward Handles & Branch Ports
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsAddingReward(!isAddingReward);
                if (!isAddingReward) setEditingRewardId(null);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Port
            </button>
          </div>

          {/* Reward Rows */}
          <div className="space-y-2">
            {currentQuest.rewardOutcomes.map((reward, index) => {
              const isEditing = editingRewardId === reward.id;

              if (isEditing) {
                return (
                  <div
                    key={reward.id}
                    className="p-3 rounded-lg bg-slate-950 border border-indigo-500/60 shadow-lg space-y-2.5 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Pencil className="w-3 h-3 text-indigo-400" />
                        Edit Port
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {reward.id}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Port Label
                      </label>
                      <input
                        type="text"
                        value={editRewardLabel}
                        onChange={(e) => setEditRewardLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditReward(reward.id);
                          if (e.key === 'Escape') handleCancelEditReward();
                        }}
                        placeholder="e.g. [Choice A] Keep Blood Idol"
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editRewardIsChoice}
                          onChange={(e) => setEditRewardIsChoice(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0"
                        />
                        <span>Pick-1 Exclusive Choice</span>
                      </label>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                      <OutcomeEffectsEditor
                        values={editRewardEffects}
                        onChange={(patch) => setEditRewardEffects((prev) => ({ ...prev, ...patch }))}
                        compact
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Items (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={editRewardItems}
                        onChange={(e) => setEditRewardItems(e.target.value)}
                        placeholder="e.g. Ancient Compass, Rope"
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Grants State Tags (comma-separated)
                        </label>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditRewardTags((prev) => {
                                const tags = prev.split(',').map((t) => t.trim()).filter(Boolean);
                                if (tags.length === 0) return '++Global_State';
                                return tags
                                  .map((t) => (t.startsWith('++') ? t : `++${t.replace(/^\+{1,2}/, '')}`))
                                  .join(', ');
                              });
                            }}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                            title="Format as Campaign Global State (persists across all Acts)"
                          >
                            <Globe className="w-2.5 h-2.5 shrink-0" />
                            <span>++Global</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditRewardTags((prev) => {
                                const tags = prev.split(',').map((t) => t.trim()).filter(Boolean);
                                if (tags.length === 0) return '+Act_State';
                                return tags
                                  .map((t) => (t.startsWith('++') ? `+${t.replace(/^\+{1,2}/, '')}` : t.startsWith('+') ? t : `+${t}`))
                                  .join(', ');
                              });
                            }}
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                            title="Format as Act Local State (scoped to this Act only)"
                          >
                            <Tag className="w-2.5 h-2.5 shrink-0" />
                            <span>+Act Local</span>
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={editRewardTags}
                        onChange={(e) => setEditRewardTags(e.target.value)}
                        placeholder="e.g. ++Idol_Kept, +Beacon_Lit"
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                        <Dices className="w-3 h-3 text-amber-400" />
                        Trigger Skill Test (Page 11)
                      </label>
                      <select
                        value={editRewardTargetTestId}
                        onChange={(e) => setEditRewardTargetTestId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
                      >
                        <option value="">None (Standard Outcome)</option>
                        {testQuests.map((t) => (
                          <option key={t.uid} value={t.uid}>
                            [{t.code}] {t.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => deleteRewardOutcome(currentQuest.uid, reward.id)}
                        className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 transition-colors"
                        title="Delete Port"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Port</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEditReward}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditReward(reward.id)}
                          disabled={!editRewardLabel.trim()}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded-md text-xs flex items-center gap-1 transition-colors shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save Port
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={reward.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Move Up / Down Reorder Arrows */}
                      <div className="flex flex-col gap-0.5 shrink-0 mr-0.5">
                        <button
                          type="button"
                          onClick={() => reorderRewardOutcome(currentQuest.uid, reward.id, 'UP')}
                          disabled={index === 0}
                          className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-20 disabled:hover:text-slate-500 transition-opacity"
                          title="Move Port Up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => reorderRewardOutcome(currentQuest.uid, reward.id, 'DOWN')}
                          disabled={index === currentQuest.rewardOutcomes.length - 1}
                          className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-20 disabled:hover:text-slate-500 transition-opacity"
                          title="Move Port Down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="font-semibold text-xs text-slate-200 truncate">
                        {reward.label}
                      </span>
                      {reward.isExclusiveChoice && (
                        <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/80 px-1.5 py-0.2 rounded font-mono shrink-0">
                          Choice
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditReward(reward)}
                        className="text-slate-400 hover:text-indigo-300 p-1 rounded hover:bg-slate-800/60 transition-colors"
                        title="Edit Port"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRewardOutcome(currentQuest.uid, reward.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800/60 transition-colors"
                        title="Delete Port"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pl-5">
                    <OutcomeEffectsBadges values={reward} />
                    {reward.items.length > 0 && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Package className="w-3 h-3" />
                        {reward.items.join(', ')}
                      </span>
                    )}
                    {reward.grantsStateTags.map((tag) => {
                      const isGlobal = tag.startsWith('++');
                      return (
                        <span
                          key={tag}
                          className={`flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                            isGlobal
                              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80 font-medium'
                              : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80 font-medium'
                          }`}
                          title={isGlobal ? 'Campaign Global State (carries across all Acts)' : 'Act Local State (scoped to this Act)'}
                        >
                          {isGlobal ? (
                            <Globe className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                          ) : (
                            <Tag className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          )}
                          <span>{tag}</span>
                        </span>
                      );
                    })}
                    {(() => {
                      const linkedEdge = outgoingEdges.find(
                        (e) => e.sourcePortId === reward.id && quests[e.target] && (quests[e.target].category === 'TEST' || Boolean(quests[e.target].testConfig))
                      );
                      const linkedTest = linkedEdge ? quests[linkedEdge.target] : null;
                      if (!linkedTest) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => selectQuest(linkedTest.uid)}
                          className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 hover:text-amber-200 hover:border-amber-700 transition-colors cursor-pointer"
                          title={`Jump to triggered Skill Test: ${linkedTest.title}`}
                        >
                          <Dices className="w-2.5 h-2.5 text-amber-400" />
                          <span>Triggers [{linkedTest.code}]</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Reward Form */}
          {isAddingReward && (
            <div className="p-3 rounded-lg bg-slate-950 border border-indigo-500/40 space-y-2">
              <input
                type="text"
                value={newRewardLabel}
                onChange={(e) => setNewRewardLabel(e.target.value)}
                placeholder="Reward Port Label (e.g. [Choice C] Bargain)"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRewardIsChoice}
                    onChange={(e) => setNewRewardIsChoice(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-500"
                  />
                  <span>Pick-1 Exclusive Choice</span>
                </label>
              </div>

              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <OutcomeEffectsEditor
                  values={newRewardEffects}
                  onChange={(patch) => setNewRewardEffects((prev) => ({ ...prev, ...patch }))}
                  compact
                />
              </div>

              <input
                type="text"
                value={newRewardItems}
                onChange={(e) => setNewRewardItems(e.target.value)}
                placeholder="Items (comma-separated)"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
              />

              <div>
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Grants State Tags (comma-separated)
                  </label>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setNewRewardTags((prev) => {
                          const tags = prev.split(',').map((t) => t.trim()).filter(Boolean);
                          if (tags.length === 0) return '++Global_State';
                          return tags
                            .map((t) => (t.startsWith('++') ? t : `++${t.replace(/^\+{1,2}/, '')}`))
                            .join(', ');
                        });
                      }}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                      title="Format as Campaign Global State (persists across all Acts)"
                    >
                      <Globe className="w-2.5 h-2.5 shrink-0" />
                      <span>++Global</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewRewardTags((prev) => {
                          const tags = prev.split(',').map((t) => t.trim()).filter(Boolean);
                          if (tags.length === 0) return '+Act_State';
                          return tags
                            .map((t) => (t.startsWith('++') ? `+${t.replace(/^\+{1,2}/, '')}` : t.startsWith('+') ? t : `+${t}`))
                            .join(', ');
                        });
                      }}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                      title="Format as Act Local State (scoped to this Act only)"
                    >
                      <Tag className="w-2.5 h-2.5 shrink-0" />
                      <span>+Act Local</span>
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={newRewardTags}
                  onChange={(e) => setNewRewardTags(e.target.value)}
                  placeholder="e.g. ++Idol_Kept, +Beacon_Lit"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-emerald-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
                  <Dices className="w-3 h-3 text-amber-400" />
                  Trigger Skill Test (Optional)
                </label>
                <select
                  value={newRewardTargetTestId}
                  onChange={(e) => setNewRewardTargetTestId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="">None (Standard Outcome)</option>
                  {testQuests.map((t) => (
                    <option key={t.uid} value={t.uid}>
                      [{t.code}] {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingReward(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateReward}
                  disabled={!newRewardLabel.trim()}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded text-xs"
                >
                  Create Port
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Connected Graph Edges */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Connected Graph Edges ({incomingEdges.length + outgoingEdges.length})
          </h4>

          {outgoingEdges.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Outgoing:</span>
              {outgoingEdges.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between text-xs p-1.5 bg-slate-950 rounded border border-slate-800 font-mono"
                >
                  <span className="text-slate-300">
                    → {quests[e.target]?.code || e.target} ({e.type})
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteEdge(e.id)}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                    title="Delete connection"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Parchment Card Preview */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tabletop Scenario Card Preview
            </h4>
            <button
              type="button"
              onClick={() => setShowCardPreview(!showCardPreview)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              {showCardPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showCardPreview && (
            <TabletopCardPreview quest={currentQuest} activeVariants={activeVariants} />
          )}
        </div>

        {/* Danger Zone: Delete Quest */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete quest "${currentQuest.title}" (${currentQuest.code})?`)) {
                deleteQuest(currentQuest.uid);
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Quest Node
          </button>
        </div>
      </div>
    </div>
    </>
  );
};
