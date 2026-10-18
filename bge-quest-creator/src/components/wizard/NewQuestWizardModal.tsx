import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Zap,
  Lock,
  Layers,
  Coins,
  Package,
  Wand2,
  Plus,
  Trash2,
  BookOpen,
  GitBranch,
  ShieldAlert,
  Loader2,
  FileCode2
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import {
  QuestModel,
  QuestCategory,
  PrereqLogic,
  RewardOutcome,
  CampaignEdge,
  QuestVariantOverride
} from '../../types/campaign';
import { getAvailableStateTagsForQuest } from '../../utils/tagAnalysis';
import { StateTagAutocompleteInput } from '../inspector/StateTagAutocompleteInput';
import { generateQuestDraftWithGemini } from '../../services/geminiQuestService';

export const NewQuestWizardModal: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.modals.wizard);
  const wizardInitOptions = useCampaignStore((s) => s.wizardInitOptions);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);
  const quests = useCampaignStore((s) => s.quests);
  const edges = useCampaignStore((s) => s.edges);
  const activeActId = useCampaignStore((s) => s.activeActId);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const simulator = useCampaignStore((s) => s.simulator);
  const addQuest = useCampaignStore((s) => s.addQuest);
  const addEdge = useCampaignStore((s) => s.addEdge);
  const selectQuest = useCampaignStore((s) => s.selectQuest);

  const [step, setStep] = useState(1);

  // Form State
  const [category, setCategory] = useState<QuestCategory>('MAIN');
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('M01');
  const [tier, setTier] = useState(1);
  const [prereqLogic, setPrereqLogic] = useState<PrereqLogic>('START');
  const [selectedParentQuestId, setSelectedParentQuestId] = useState<string>('');
  const [selectedParentPortId, setSelectedParentPortId] = useState<string>('');
  const [selectedLockoutQuestId, setSelectedLockoutQuestId] = useState<string>('');
  const [rewards, setRewards] = useState<RewardOutcome[]>([]);
  const [variants, setVariants] = useState<QuestVariantOverride[]>([]);
  const [flavorText, setFlavorText] = useState('');
  const [objectives, setObjectives] = useState('');
  const [setupInstructions, setSetupInstructions] = useState('');

  // AI drafting state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Tag analysis for auto-complete
  const tagAnalysis = useMemo(() => {
    return getAvailableStateTagsForQuest(
      selectedParentQuestId || 'dummy',
      quests,
      edges,
      simulator.customTags
    );
  }, [selectedParentQuestId, quests, edges, simulator.customTags]);

  // Compute next available code for a given category
  const computeNextCode = (cat: QuestCategory): string => {
    const existing = new Set(Object.values(quests).map((q) => q.code.toUpperCase()));
    let prefix = 'M';
    if (cat === 'MAIN_BRANCH') prefix = 'MB';
    if (cat === 'SIDE') prefix = 'S';
    if (cat === 'FACTION') prefix = 'F';
    if (cat === 'BOSS') prefix = 'B';
    if (cat === 'ACT_TRANSITION') prefix = 'ACT_TRANS';

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

  // Reset/populate form when modal opens or when wizardInitOptions change
  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setAiError(null);
    setAiPrompt('');

    const targetTier = wizardInitOptions?.tier ?? (typeof activeActId === 'number' ? 1 : 1);
    const parentId = wizardInitOptions?.parentQuestId || '';
    const parentPort = wizardInitOptions?.parentPortId || '';

    setTier(targetTier);

    if (parentId && quests[parentId]) {
      setPrereqLogic('ALL');
      setSelectedParentQuestId(parentId);
      setSelectedParentPortId(parentPort || quests[parentId]?.rewardOutcomes?.[0]?.id || '');
      setCategory('MAIN');
      setCode(computeNextCode('MAIN'));
    } else {
      setPrereqLogic('START');
      setSelectedParentQuestId('');
      setSelectedParentPortId('');
      setCategory('MAIN');
      setCode(computeNextCode('MAIN'));
    }

    setTitle('');
    setSelectedLockoutQuestId('');
    setFlavorText('');
    setObjectives('');
    setSetupInstructions('');
    setVariants([]);
    setRewards([
      {
        id: `r-${Date.now().toString(36)}-1`,
        label: 'Victory Outcome',
        isExclusiveChoice: false,
        gold: 25,
        items: [],
        grantsStateTags: []
      }
    ]);
  }, [isOpen, wizardInitOptions, quests, activeActId]);

  // When category changes, update code if title/code hasn't been heavily customized
  const handleCategorySelect = (newCat: QuestCategory) => {
    setCategory(newCat);
    setCode(computeNextCode(newCat));
  };

  // Archetype Presets
  const applyPreset = (presetType: 'STANDARD' | 'CHOICE_BRANCH' | 'BOSS_CLIMAX' | 'SIDE_QUEST') => {
    const timestamp = Date.now().toString(36);
    if (presetType === 'STANDARD') {
      setCategory('MAIN');
      setCode(computeNextCode('MAIN'));
      setRewards([
        {
          id: `r-${timestamp}-1`,
          label: 'Scenario Victory',
          isExclusiveChoice: false,
          gold: 25,
          items: ['Supplies'],
          grantsStateTags: []
        }
      ]);
    } else if (presetType === 'CHOICE_BRANCH') {
      setCategory('MAIN_BRANCH');
      setCode(computeNextCode('MAIN_BRANCH'));
      setRewards([
        {
          id: `r-${timestamp}-a`,
          label: '[Choice A] Preserve the Artifact',
          isExclusiveChoice: true,
          gold: 20,
          items: ['Ancient Relic'],
          grantsStateTags: ['+Artifact_Preserved']
        },
        {
          id: `r-${timestamp}-b`,
          label: '[Choice B] Destroy the Artifact',
          isExclusiveChoice: true,
          gold: 40,
          items: ['Shattered Shard'],
          grantsStateTags: ['+Artifact_Destroyed']
        }
      ]);
    } else if (presetType === 'BOSS_CLIMAX') {
      setCategory('BOSS');
      setCode(computeNextCode('BOSS'));
      setPrereqLogic('ALL');
      setRewards([
        {
          id: `r-${timestamp}-boss`,
          label: 'Boss Defeated',
          isExclusiveChoice: false,
          gold: 100,
          items: ['Trophy of the Conqueror'],
          grantsStateTags: ['++Boss_Slain']
        }
      ]);
      setVariants([
        {
          id: `var-${timestamp}-1`,
          requiredStateTag: '+Boss_Weakened',
          overrideTitle: 'Weakened Overlord',
          additionalFlavorText: 'Due to past sacrifices, the beast staggers, bleeding dark ichor.',
          setupModifications: 'The Boss starts the encounter with -25% Max HP.',
          rewardModifications: '+1 Bonus Loot Card'
        }
      ]);
    } else if (presetType === 'SIDE_QUEST') {
      setCategory('SIDE');
      setCode(computeNextCode('SIDE'));
      setRewards([
        {
          id: `r-${timestamp}-side`,
          label: 'Contract Complete',
          isExclusiveChoice: false,
          gold: 50,
          items: ['Health Potion'],
          grantsStateTags: []
        }
      ]);
    }
  };

  // AI Generation with Gemini
  const handleGenerateAiDraft = async () => {
    if (!geminiApiKey) {
      setModalOpen('apiKeyModal', true);
      return;
    }

    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const parentQuest = selectedParentQuestId ? quests[selectedParentQuestId] : undefined;
      const draft = await generateQuestDraftWithGemini({
        apiKey: geminiApiKey,
        category,
        tier,
        act: typeof activeActId === 'number' ? activeActId : 1,
        userPrompt: aiPrompt || title,
        parentQuestContext: parentQuest
          ? {
              code: parentQuest.code,
              title: parentQuest.title,
              flavorText: parentQuest.flavorText,
              objectives: parentQuest.objectives
            }
          : undefined,
        availableTags: tagAnalysis.allTags.map((t) => t.tag)
      });

      if (draft.title) setTitle(draft.title);
      if (draft.flavorText) setFlavorText(draft.flavorText);
      if (draft.objectives) setObjectives(draft.objectives);
      if (draft.setupInstructions) setSetupInstructions(draft.setupInstructions);

      if (draft.rewards && draft.rewards.length > 0) {
        setRewards(
          draft.rewards.map((r, i) => ({
            id: `r-${Date.now().toString(36)}-${i + 1}`,
            label: r.label,
            isExclusiveChoice: r.isExclusiveChoice,
            gold: r.gold || 0,
            items: r.items || [],
            grantsStateTags: r.grantsStateTags || []
          }))
        );
      }

      if (draft.variants && draft.variants.length > 0) {
        setVariants(
          draft.variants.map((v, i) => ({
            id: `var-${Date.now().toString(36)}-${i + 1}`,
            requiredStateTag: v.requiredStateTag,
            overrideTitle: v.overrideTitle,
            additionalFlavorText: v.additionalFlavorText || '',
            setupModifications: v.setupModifications || '',
            rewardModifications: v.rewardModifications
          }))
        );
      }
    } catch (err: any) {
      console.error('AI draft generation failed:', err);
      setAiError(err?.message || 'Failed to generate quest with Gemini');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setModalOpen('wizard', false);
    setStep(1);
  };

  const handleFinish = () => {
    const finalCode = (code || computeNextCode(category)).trim().toUpperCase();
    const uid = `q-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // Position calculation: honor wizardInitOptions.canvasPos if available, else swimlane placement
    let posX = 60 + (tier - 1) * 380;
    let posY = 80;

    if (wizardInitOptions?.canvasPos) {
      posX = Math.round(wizardInitOptions.canvasPos.x);
      posY = Math.round(wizardInitOptions.canvasPos.y);
    } else {
      const sameTierQuests = Object.values(quests).filter((q) => q.tier === tier);
      posY = 80 + sameTierQuests.length * 240;
    }

    const newQuest: QuestModel = {
      uid,
      code: finalCode,
      title: title.trim() || `Quest ${finalCode}`,
      act: typeof activeActId === 'number' ? activeActId : 1,
      tier,
      category,
      prereqLogic,
      parentSlot: null,
      position: { x: posX, y: posY },
      flavorText,
      setupInstructions,
      objectives,
      rewardOutcomes: rewards.length > 0 ? rewards : [
        {
          id: `r-${uid}-1`,
          label: 'Victory',
          isExclusiveChoice: false,
          gold: 25,
          items: [],
          grantsStateTags: []
        }
      ],
      variants,
      devStatus: 'DRAFT'
    };

    addQuest(newQuest);
    selectQuest(uid);

    // Auto-wire incoming prerequisite edge
    if (prereqLogic !== 'START' && selectedParentQuestId && quests[selectedParentQuestId]) {
      const parentQuest = quests[selectedParentQuestId];
      const portId = selectedParentPortId || parentQuest.rewardOutcomes[0]?.id || null;
      const portReward = parentQuest.rewardOutcomes.find((r) => r.id === portId);
      const isChoice = Boolean(portReward?.isExclusiveChoice);
      const carriedTag = portReward?.grantsStateTags?.[0] || null;

      const newEdge: CampaignEdge = {
        id: `e-${selectedParentQuestId}-${uid}-${Date.now().toString(36)}`,
        source: selectedParentQuestId,
        sourcePortId: portId,
        target: uid,
        type: isChoice ? 'CHOICE_BRANCH' : 'UNLOCKS',
        stateTag: carriedTag,
        label: isChoice ? `+${carriedTag || 'Choice'}` : 'Unlocks'
      };
      addEdge(newEdge);
    }

    // Auto-wire mutual lockout edge if specified
    if (selectedLockoutQuestId && quests[selectedLockoutQuestId]) {
      const lockoutEdge: CampaignEdge = {
        id: `e-lock-${uid}-${selectedLockoutQuestId}`,
        source: uid,
        sourcePortId: null,
        target: selectedLockoutQuestId,
        type: 'LOCKOUT',
        label: '✕ LOCKS OUT'
      };
      addEdge(lockoutEdge);
    }

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>New Quest Creation Wizard</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                  {code}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Step {step} of 4: {
                  step === 1 ? 'Identity, Archetype & Tier' :
                  step === 2 ? 'Prerequisites, Choice Ports & Lockouts' :
                  step === 3 ? 'Reward Outcomes & State Tags' :
                  'Narrative Story & Tabletop Rules'
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="h-1 bg-slate-800 w-full flex">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`h-full flex-1 transition-all duration-300 cursor-pointer ${
                s <= step ? 'bg-indigo-600' : 'bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quick AI Drafting Banner */}
          <div className="p-3 bg-indigo-950/30 border border-indigo-800/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Gemini AI Quick-Draft Assistant
              </span>
              {!geminiApiKey && (
                <button
                  type="button"
                  onClick={() => setModalOpen('apiKeyModal', true)}
                  className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                >
                  Set Gemini API Key
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Ancient submerged temple with poisoned water, moral choice to drain it or bless it"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isGeneratingAi) {
                    handleGenerateAiDraft();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleGenerateAiDraft}
                disabled={isGeneratingAi}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Drafting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Auto-Draft</span>
                  </>
                )}
              </button>
            </div>
            {aiError && (
              <p className="text-[11px] text-rose-400">{aiError}</p>
            )}
          </div>

          {/* STEP 1: IDENTITY & ARCHETYPE */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Archetype Quick-Picks */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Start From Archetype Template (Optional)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('STANDARD')}
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-indigo-500/60 hover:bg-slate-800/40 text-left transition-all cursor-pointer"
                  >
                    <div className="font-semibold text-xs text-indigo-300">Standard Main</div>
                    <div className="text-[10px] text-slate-500">Linear main progression quest</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('CHOICE_BRANCH')}
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-cyan-500/60 hover:bg-slate-800/40 text-left transition-all cursor-pointer"
                  >
                    <div className="font-semibold text-xs text-cyan-300">Branching Choice</div>
                    <div className="text-[10px] text-slate-500">2 exclusive outcome paths</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('BOSS_CLIMAX')}
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-rose-500/60 hover:bg-slate-800/40 text-left transition-all cursor-pointer"
                  >
                    <div className="font-semibold text-xs text-rose-300">Boss Climax</div>
                    <div className="text-[10px] text-slate-500">AND gate + Boss variant</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('SIDE_QUEST')}
                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-emerald-500/60 hover:bg-slate-800/40 text-left transition-all cursor-pointer"
                  >
                    <div className="font-semibold text-xs text-emerald-300">Side Venture</div>
                    <div className="text-[10px] text-slate-500">Optional contract / loot</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Quest Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Whispers in the Catacombs"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Quest Code (Designer ID)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. M02, S01, B01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Parallel Progression Tier
                  </label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={1}>Tier 1 (Starter Zone)</option>
                    <option value={2}>Tier 2 (Mid-Act Branching)</option>
                    <option value={3}>Tier 3 (Climax / Finale)</option>
                    <option value={4}>Tier 4 (Late Campaign)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MAIN', 'MAIN_BRANCH', 'SIDE', 'FACTION', 'BOSS', 'ACT_TRANSITION'] as QuestCategory[]).map(
                    (cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          category === cat
                            ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 font-semibold shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="text-xs truncate">{cat.replace('_', ' ')}</div>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREREQUISITES & CONNECTIONS */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Prerequisite Gate Logic
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div
                    onClick={() => {
                      setPrereqLogic('START');
                      setSelectedParentQuestId('');
                      setSelectedParentPortId('');
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      prereqLogic === 'START'
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">Starter</div>
                    <div className="text-[11px] text-slate-500">Available from the beginning; no incoming edge.</div>
                  </div>

                  <div
                    onClick={() => setPrereqLogic('ALL')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      prereqLogic === 'ALL'
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">AND Gate (ALL)</div>
                    <div className="text-[11px] text-slate-500">Requires all incoming connections to be satisfied.</div>
                  </div>

                  <div
                    onClick={() => setPrereqLogic('ANY')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      prereqLogic === 'ANY'
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">OR Gate (ANY)</div>
                    <div className="text-[11px] text-slate-500">Unlocks if any one incoming path is satisfied.</div>
                  </div>
                </div>
              </div>

              {prereqLogic !== 'START' && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Incoming Parent Quest:
                    </label>
                    <select
                      value={selectedParentQuestId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedParentQuestId(pid);
                        setSelectedParentPortId(quests[pid]?.rewardOutcomes[0]?.id || '');
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">Select Preceding Quest...</option>
                      {Object.values(quests).map((q) => (
                        <option key={q.uid} value={q.uid}>
                          {q.code}: {q.title} (Tier {q.tier})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedParentQuestId && quests[selectedParentQuestId] && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                        Wire Specifically From Outcome Port:
                      </label>
                      <select
                        value={selectedParentPortId}
                        onChange={(e) => setSelectedParentPortId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {quests[selectedParentQuestId].rewardOutcomes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label} {r.isExclusiveChoice ? '(Choice Branch)' : '(Always Granted)'}
                            {r.grantsStateTags.length > 0 ? ` [${r.grantsStateTags.join(', ')}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mutually Exclusive Lockout (Optional):
                </label>
                <select
                  value={selectedLockoutQuestId}
                  onChange={(e) => setSelectedLockoutQuestId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">None (No lockout)</option>
                  {Object.values(quests).map((q) => (
                    <option key={q.uid} value={q.uid}>
                      {q.code}: {q.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Connecting a lockout edge ensures completing one permanently disables the other.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: REWARD OUTCOMES & TAGS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Reward Outcomes & Output Ports ({rewards.length})
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Each outcome creates a dedicated port handle on the quest card to branch from.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `out-${Date.now().toString(36)}-${rewards.length + 1}`;
                    setRewards([
                      ...rewards,
                      {
                        id: newId,
                        label: `[Choice ${String.fromCharCode(65 + rewards.length)}] New Path`,
                        isExclusiveChoice: true,
                        gold: 20,
                        items: [],
                        grantsStateTags: []
                      }
                    ]);
                  }}
                  className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Outcome
                </button>
              </div>

              {rewards.map((r, idx) => (
                <div key={r.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 font-bold">#{idx + 1}</span>
                    <input
                      type="text"
                      value={r.label}
                      onChange={(e) => {
                        const copy = [...rewards];
                        copy[idx].label = e.target.value;
                        setRewards(copy);
                      }}
                      placeholder="Outcome label (e.g. Keep Blood Idol)"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      <input
                        type="checkbox"
                        checked={r.isExclusiveChoice}
                        onChange={(e) => {
                          const copy = [...rewards];
                          copy[idx].isExclusiveChoice = e.target.checked;
                          setRewards(copy);
                        }}
                        className="rounded bg-slate-950 border-slate-700 text-indigo-500 cursor-pointer"
                      />
                      Exclusive Choice
                    </label>
                    {rewards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRewards(rewards.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Gold</label>
                      <input
                        type="number"
                        value={r.gold}
                        onChange={(e) => {
                          const copy = [...rewards];
                          copy[idx].gold = Number(e.target.value) || 0;
                          setRewards(copy);
                        }}
                        placeholder="Gold"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-amber-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Items (CSV)</label>
                      <input
                        type="text"
                        value={r.items.join(', ')}
                        onChange={(e) => {
                          const copy = [...rewards];
                          copy[idx].items = e.target.value
                            .split(',')
                            .map((i) => i.trim())
                            .filter(Boolean);
                          setRewards(copy);
                        }}
                        placeholder="e.g. Iron Shield"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-blue-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Granted Tags (+/+)</label>
                      <input
                        type="text"
                        value={r.grantsStateTags.join(', ')}
                        onChange={(e) => {
                          const copy = [...rewards];
                          copy[idx].grantsStateTags = e.target.value
                            .split(',')
                            .map((t) => {
                              const trimmed = t.trim();
                              if (!trimmed) return '';
                              const prefix = trimmed.startsWith('++') ? '++' : '+';
                              const cleanBody = trimmed.replace(/^\+{1,2}/, '').trim().replace(/\s+/g, '_');
                              return cleanBody ? `${prefix}${cleanBody}` : '';
                            })
                            .filter(Boolean);
                          setRewards(copy);
                        }}
                        placeholder="+Tag or ++GlobalTag"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 4: NARRATIVE & RULES */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Flavor Story Text
                </label>
                <textarea
                  rows={3}
                  value={flavorText}
                  onChange={(e) => setFlavorText(e.target.value)}
                  placeholder="Atmospheric narrative scene..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Primary Objectives
                </label>
                <textarea
                  rows={2}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Primary victory and defeat conditions..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Setup Instructions (Tabletop Rules)
                </label>
                <textarea
                  rows={2}
                  value={setupInstructions}
                  onChange={(e) => setSetupInstructions(e.target.value)}
                  placeholder="Tiles, standees, enemy spawn markers, and token setup..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>

              {variants.length > 0 && (
                <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-900/40 space-y-2">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Conditional Story Variants Configured ({variants.length})
                  </span>
                  {variants.map((v) => (
                    <div key={v.id} className="text-xs text-slate-300">
                      <span className="font-mono text-amber-400 font-bold">{v.requiredStateTag}</span>: {v.setupModifications || v.additionalFlavorText}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            {/* Quick Create shortcut button available on any step */}
            <button
              type="button"
              onClick={handleFinish}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Create quest immediately without filling remaining steps"
            >
              Quick Create
            </button>
          </div>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/30 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Place Quest on Canvas
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
