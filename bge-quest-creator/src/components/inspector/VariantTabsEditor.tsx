import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Zap, BookOpen, Layers, Pencil, Check, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { QuestModel, QuestVariantOverride } from '../../types/campaign';
import { useCampaignStore } from '../../store/useCampaignStore';
import { getAvailableStateTagsForQuest } from '../../utils/tagAnalysis';
import { StateTagAutocompleteInput } from './StateTagAutocompleteInput';
import { generateQuestDraftWithGemini } from '../../services/geminiQuestService';

interface VariantTabsEditorProps {
  quest: QuestModel;
}

export const VariantTabsEditor: React.FC<VariantTabsEditorProps> = ({ quest }) => {
  const activeTab = useCampaignStore((s) => s.activeVariantTab);
  const setActiveTab = useCampaignStore((s) => s.setActiveVariantTab);
  const updateQuestField = useCampaignStore((s) => s.updateQuestField);
  const addVariant = useCampaignStore((s) => s.addVariant);
  const updateVariant = useCampaignStore((s) => s.updateVariant);
  const deleteVariant = useCampaignStore((s) => s.deleteVariant);
  const quests = useCampaignStore((s) => s.quests);
  const edges = useCampaignStore((s) => s.edges);
  const simulator = useCampaignStore((s) => s.simulator);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);

  const [newTagInput, setNewTagInput] = useState('');
  const [isEditingTriggerTag, setIsEditingTriggerTag] = useState(false);
  const [editedTag, setEditedTag] = useState('');
  const [isSuggestingVariant, setIsSuggestingVariant] = useState(false);

  // Analyze available and upstream state tags for this quest
  const tagAnalysis = useMemo(() => {
    return getAvailableStateTagsForQuest(quest.uid, quests, edges, simulator.customTags);
  }, [quest.uid, quests, edges, simulator.customTags]);

  const handleCreateVariant = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().replace(/\s+/g, '_');
    const newVariant: QuestVariantOverride = {
      id: `var_${quest.uid}_${Date.now().toString(36)}`,
      requiredStateTag: cleanTag,
      overrideTitle: '',
      additionalFlavorText: '',
      setupModifications: '',
      rewardModifications: ''
    };
    addVariant(quest.uid, newVariant);
    setNewTagInput('');
  };

  const selectedVariant = quest.variants.find((v) => v.id === activeTab);

  return (
    <div className="space-y-4">
      {/* Tabs Switcher */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('base')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'base'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Base Card
        </button>

        {quest.variants.map((v) => {
          const isUpstream = tagAnalysis.isTagUpstream(v.requiredStateTag);
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setActiveTab(v.id);
                setIsEditingTriggerTag(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
                activeTab === v.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{v.requiredStateTag}</span>
              {!isUpstream && (
                <span title="Unlinked state: Not granted upstream">
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content: Base Card */}
      {activeTab === 'base' ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Flavor Text (Story)
            </label>
            <textarea
              rows={3}
              value={quest.flavorText}
              onChange={(e) => updateQuestField(quest.uid, 'flavorText', e.target.value)}
              placeholder="Narrative scene setting..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Objectives
            </label>
            <textarea
              rows={2}
              value={quest.objectives}
              onChange={(e) => updateQuestField(quest.uid, 'objectives', e.target.value)}
              placeholder="Victory and defeat conditions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Setup Instructions
            </label>
            <textarea
              rows={3}
              value={quest.setupInstructions}
              onChange={(e) => updateQuestField(quest.uid, 'setupInstructions', e.target.value)}
              placeholder="Tiles, spawn markers, and initial tokens..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>

          {/* Inline Add Variant Quick Form with Autocomplete */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                + Inject Conditional State Tag Variant
              </label>
              {tagAnalysis.allTags.length > 0 && (
                <button
                  type="button"
                  disabled={isSuggestingVariant}
                  onClick={async () => {
                    if (!geminiApiKey) {
                      setModalOpen('apiKeyModal', true);
                      return;
                    }
                    setIsSuggestingVariant(true);
                    try {
                      const candidateTag = tagAnalysis.upstreamTags[0]?.tag || tagAnalysis.allTags[0]?.tag || '+New_Tag';
                      const draft = await generateQuestDraftWithGemini({
                        apiKey: geminiApiKey,
                        category: quest.category,
                        tier: quest.tier,
                        act: quest.act,
                        userPrompt: `Generate a mutation variant for quest "${quest.title}" triggered by state tag ${candidateTag}`,
                        availableTags: [candidateTag]
                      });
                      const suggestedVariant = draft.variants?.[0];
                      const newVariant: QuestVariantOverride = {
                        id: `var_${quest.uid}_${Date.now().toString(36)}`,
                        requiredStateTag: suggestedVariant?.requiredStateTag || candidateTag,
                        overrideTitle: suggestedVariant?.overrideTitle || '',
                        additionalFlavorText: suggestedVariant?.additionalFlavorText || 'The consequences of past deeds echo in this place...',
                        setupModifications: suggestedVariant?.setupModifications || 'Enemies gain +2 HP and aggressive behavior.',
                        rewardModifications: suggestedVariant?.rewardModifications || ''
                      };
                      addVariant(quest.uid, newVariant);
                    } catch (err: any) {
                      console.error('Failed to suggest variant:', err);
                    } finally {
                      setIsSuggestingVariant(false);
                    }
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  {isSuggestingVariant ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Drafting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>✨ AI Suggest Variant</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <StateTagAutocompleteInput
                  value={newTagInput}
                  onChange={setNewTagInput}
                  onSubmit={handleCreateVariant}
                  tagAnalysis={tagAnalysis}
                  placeholder="Select or enter state tag (e.g. Beacon_Lit)"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateVariant}
                disabled={!newTagInput.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Variants mutate this quest when a prior reward choice grants this state tag.
            </p>
          </div>
        </div>
      ) : selectedVariant ? (
        /* Tab Content: Variant Override Fields */
        <div className="space-y-3 bg-amber-950/20 p-3 rounded-xl border border-amber-900/40">
          <div className="pb-2 border-b border-amber-900/40">
            {isEditingTriggerTag ? (
              <div className="space-y-2 p-2 bg-slate-950 rounded-lg border border-amber-500/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Change Trigger State Tag
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTriggerTag(false)}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>
                <StateTagAutocompleteInput
                  value={editedTag}
                  onChange={setEditedTag}
                  tagAnalysis={tagAnalysis}
                  placeholder="e.g. Beacon_Lit"
                  autoFocus
                  onSubmit={() => {
                    if (editedTag.trim()) {
                      updateVariant(quest.uid, selectedVariant.id, {
                        requiredStateTag: editedTag.trim()
                      });
                      setIsEditingTriggerTag(false);
                    }
                  }}
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingTriggerTag(false)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!editedTag.trim()}
                    onClick={() => {
                      if (editedTag.trim()) {
                        updateVariant(quest.uid, selectedVariant.id, {
                          requiredStateTag: editedTag.trim()
                        });
                        setIsEditingTriggerTag(false);
                      }
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-slate-950 font-bold rounded text-xs flex items-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Tag
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-amber-300 font-mono text-xs font-bold">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tag Trigger: [{selectedVariant.requiredStateTag}]</span>
                  </div>

                  {tagAnalysis.isTagUpstream(selectedVariant.requiredStateTag) ? (
                    <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Upstream
                    </span>
                  ) : (
                    <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> Unlinked State
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditedTag(selectedVariant.requiredStateTag);
                      setIsEditingTriggerTag(true);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800/60 transition-colors"
                    title="Change Trigger Tag"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => deleteVariant(quest.uid, selectedVariant.id)}
                  className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/50 transition-colors"
                  title="Delete this variant override"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Override Scenario Title (Optional)
            </label>
            <input
              type="text"
              value={selectedVariant.overrideTitle || ''}
              onChange={(e) =>
                updateVariant(quest.uid, selectedVariant.id, { overrideTitle: e.target.value })
              }
              placeholder="e.g. The High Inquisitor (Blood Awakened)"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Additional Flavor Story
            </label>
            <textarea
              rows={2}
              value={selectedVariant.additionalFlavorText}
              onChange={(e) =>
                updateVariant(quest.uid, selectedVariant.id, {
                  additionalFlavorText: e.target.value
                })
              }
              placeholder="Narrative text injected when this tag is active..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Setup Modifications (Rules / Enemies / HP)
            </label>
            <textarea
              rows={2}
              value={selectedVariant.setupModifications}
              onChange={(e) =>
                updateVariant(quest.uid, selectedVariant.id, {
                  setupModifications: e.target.value
                })
              }
              placeholder="e.g. Malakor gains +15 HP and Bleed aura..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500 resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Reward Modifications (Bonus Loot)
            </label>
            <input
              type="text"
              value={selectedVariant.rewardModifications || ''}
              onChange={(e) =>
                updateVariant(quest.uid, selectedVariant.id, {
                  rewardModifications: e.target.value
                })
              }
              placeholder="e.g. Bonus Drop: Awakened Scepter"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
