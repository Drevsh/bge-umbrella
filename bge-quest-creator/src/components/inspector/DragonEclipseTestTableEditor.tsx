import React, { useState } from 'react';
import {
  Dices,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  RotateCcw,
  Tag,
  Globe,
  Coins,
  Package,
  AlertTriangle,
  Play,
  CheckCircle2,
  Layers,
  ArrowRight,
  Clock
} from 'lucide-react';
import {
  QuestModel,
  DragonEclipseTestConfig,
  DragonEclipseTestOutcome,
  DragonEclipseTestOutcomeType,
  createDefaultDragonEclipseTestConfig,
  syncTestOutcomesToRewardOutcomes
} from '../../types/campaign';
import { useCampaignStore } from '../../store/useCampaignStore';
import { OutcomeEffectsEditor, OutcomeEffectsBadges } from './OutcomeEffectsEditor';

interface DragonEclipseTestTableEditorProps {
  quest: QuestModel;
}

interface SimulatedCard {
  id: string;
  value: number;
  hasDangerSkull: boolean;
  name: string;
}

export const DragonEclipseTestTableEditor: React.FC<DragonEclipseTestTableEditorProps> = ({ quest }) => {
  const updateQuestField = useCampaignStore((s) => s.updateQuestField);
  const toggleSimulatorRewardChoice = useCampaignStore((s) => s.toggleSimulatorRewardChoice);
  const simulator = useCampaignStore((s) => s.simulator);

  const testConfig: DragonEclipseTestConfig =
    quest.testConfig || createDefaultDragonEclipseTestConfig(quest.title || 'Skill Test');

  // Interactive Push-Your-Luck Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const [drawnCards, setDrawnCards] = useState<SimulatedCard[]>([]);
  const [modifierBonus, setModifierBonus] = useState(0);

  const totalScore = drawnCards.reduce((acc, c) => acc + c.value, 0) + modifierBonus;
  const skullCount = drawnCards.filter((c) => c.hasDangerSkull).length;

  // Find which test outcome range matches the current total score
  const matchedOutcome = React.useMemo(() => {
    if (drawnCards.length === 0) return null;
    return (
      testConfig.outcomes.find((o) => {
        const min = o.minScore ?? -Infinity;
        const max = o.maxScore ?? Infinity;
        return totalScore >= min && totalScore <= max;
      }) || testConfig.outcomes[0]
    );
  }, [testConfig.outcomes, totalScore, drawnCards.length]);

  const handleUpdateConfig = (newConfig: DragonEclipseTestConfig) => {
    const updatedRewards = syncTestOutcomesToRewardOutcomes(newConfig, quest.rewardOutcomes);
    updateQuestField(quest.uid, 'testConfig', newConfig);
    updateQuestField(quest.uid, 'rewardOutcomes', updatedRewards);
  };

  const handleTestNameChange = (name: string) => {
    handleUpdateConfig({
      ...testConfig,
      testName: name
    });
  };

  const handleModifiersPromptChange = (prompt: string) => {
    handleUpdateConfig({
      ...testConfig,
      modifiersPrompt: prompt
    });
  };

  const handleUpdateOutcome = (index: number, partial: Partial<DragonEclipseTestOutcome>) => {
    const updatedOutcomes = testConfig.outcomes.map((o, idx) =>
      idx === index ? { ...o, ...partial } : o
    );
    handleUpdateConfig({
      ...testConfig,
      outcomes: updatedOutcomes
    });
  };

  const handleAddOutcome = () => {
    const ts = Date.now().toString(36);
    const newOutcome: DragonEclipseTestOutcome = {
      id: `test-${ts}-${testConfig.outcomes.length + 1}`,
      rangeLabel: '10+',
      minScore: 10,
      maxScore: 99,
      type: 'POSITIVE',
      title: 'Major Breakthrough',
      narrative: 'A remarkable discovery beyond all expectations.',
      gold: 0,
      items: [],
      grantsStateTags: [],
      timeAdvance: 0
    };
    handleUpdateConfig({
      ...testConfig,
      outcomes: [...testConfig.outcomes, newOutcome]
    });
  };

  const handleDeleteOutcome = (index: number) => {
    if (testConfig.outcomes.length <= 1) return;
    const updatedOutcomes = testConfig.outcomes.filter((_, idx) => idx !== index);
    handleUpdateConfig({
      ...testConfig,
      outcomes: updatedOutcomes
    });
  };

  const handleReorderOutcome = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= testConfig.outcomes.length) return;
    const items = [...testConfig.outcomes];
    const [moved] = items.splice(index, 1);
    items.splice(targetIdx, 0, moved);
    handleUpdateConfig({
      ...testConfig,
      outcomes: items
    });
  };

  // Push-your-luck Item deck card draw simulation
  const handleDrawCard = () => {
    const itemNames = [
      'Stamina Draught',
      'Elven Rope',
      'Lockpicks',
      'Torchlight',
      'Grappling Hook',
      'Smoke Bomb',
      'Warding Charm',
      'Leather Canteen',
      'Dowsing Rod',
      'Herbal Salve'
    ];
    // Values on Item cards: weighted distribution 1-4
    const randVal = Math.floor(Math.random() * 4) + 1;
    const hasSkull = Math.random() < 0.25; // 25% chance of danger skull icon
    const randomName = itemNames[Math.floor(Math.random() * itemNames.length)];

    const card: SimulatedCard = {
      id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      value: randVal,
      hasDangerSkull: hasSkull,
      name: randomName
    };

    setDrawnCards((prev) => [...prev, card]);
    setIsSimulating(true);
  };

  const handleResetSimulation = () => {
    setDrawnCards([]);
    setIsSimulating(false);
  };

  const handleApplySimulatedResult = () => {
    if (!matchedOutcome) return;
    toggleSimulatorRewardChoice(matchedOutcome.id, quest.uid);
  };

  return (
    <div className="pt-3 border-t border-slate-800/80 space-y-3">
      {/* Header Banner */}
      <div className="p-3 bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 border border-amber-500/50 rounded-xl space-y-1 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Dices className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <span>Dragon Eclipse Test Table</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-200 font-normal">
                  Rulebook p. 11
                </span>
              </h4>
            </div>
          </div>
          <span className="text-[10px] text-amber-400 font-mono">Push Your Luck</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Tests draw cards from the Item deck and add up Test Values. Match total to the Test Table.
          Each outcome row wires as an output port on the canvas.
        </p>
      </div>

      {/* Test Name & Modifiers Configuration */}
      <div className="space-y-2">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Test Title / Action
          </label>
          <input
            type="text"
            value={testConfig.testName}
            onChange={(e) => handleTestNameChange(e.target.value)}
            placeholder="e.g. Infiltrate Castle Highgate, Repair Ancient Engine"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Active Modifiers (Rulebook: printed above Test Table)
          </label>
          <input
            type="text"
            value={testConfig.modifiersPrompt || ''}
            onChange={(e) => handleModifiersPromptChange(e.target.value)}
            placeholder="e.g. +1 to final test value if you possess Wind element Mystling or Grappling Hook"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300/90 placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Outcome Ranges List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Outcome Results ({testConfig.outcomes.length})
          </span>
          <button
            type="button"
            onClick={handleAddOutcome}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add Result Tier
          </button>
        </div>

        <div className="space-y-2.5">
          {testConfig.outcomes.map((outcome, idx) => {
            const isNegative = outcome.type === 'NEGATIVE';
            const isNeutral = outcome.type === 'NEUTRAL';
            const isPositive = outcome.type === 'POSITIVE';

            const borderClass = isPositive
              ? 'border-emerald-500/50 bg-emerald-950/20'
              : isNeutral
              ? 'border-slate-700/70 bg-slate-900/40'
              : 'border-rose-500/50 bg-rose-950/20';

            const badgeBg = isPositive
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
              : isNeutral
              ? 'bg-slate-800 text-slate-300 border-slate-600'
              : 'bg-rose-950 text-rose-300 border-rose-500/60';

            return (
              <div
                key={outcome.id}
                className={`p-3 rounded-xl border ${borderClass} space-y-2 transition-all shadow-sm`}
              >
                {/* Row Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeBg}`}>
                      {outcome.rangeLabel}
                    </span>

                    {/* Result Type Selector (Rulebook p.11: Green, Gray, Red) */}
                    <select
                      value={outcome.type}
                      onChange={(e) =>
                        handleUpdateOutcome(idx, {
                          type: e.target.value as DragonEclipseTestOutcomeType
                        })
                      }
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="POSITIVE">🟢 Positive (Green Outcome)</option>
                      <option value="NEUTRAL">⚪ Neutral (Gray Outcome)</option>
                      <option value="NEGATIVE">🔴 Negative (Red Outcome)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleReorderOutcome(idx, 'UP')}
                      className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === testConfig.outcomes.length - 1}
                      onClick={() => handleReorderOutcome(idx, 'DOWN')}
                      className="p-1 rounded text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {testConfig.outcomes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOutcome(idx)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Delete Result"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Score Range & Title */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                      Range Text
                    </label>
                    <input
                      type="text"
                      value={outcome.rangeLabel}
                      onChange={(e) => {
                        const lbl = e.target.value;
                        let min = outcome.minScore;
                        let max = outcome.maxScore;
                        const matchBetween = lbl.match(/^(\d+)\s*[-–]\s*(\d+)$/);
                        const matchPlus = lbl.match(/^(\d+)\+$/);
                        if (matchBetween) {
                          min = parseInt(matchBetween[1], 10);
                          max = parseInt(matchBetween[2], 10);
                        } else if (matchPlus) {
                          min = parseInt(matchPlus[1], 10);
                          max = 99;
                        }
                        handleUpdateOutcome(idx, {
                          rangeLabel: lbl,
                          minScore: min,
                          maxScore: max
                        });
                      }}
                      placeholder="e.g. 0-4, 5-8, 9+"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                      Outcome Headline
                    </label>
                    <input
                      type="text"
                      value={outcome.title}
                      onChange={(e) => handleUpdateOutcome(idx, { title: e.target.value })}
                      placeholder="e.g. Slipped Past Unseen"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-medium"
                    />
                  </div>
                </div>

                {/* Story Narrative */}
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                    Story Consequence
                  </label>
                  <textarea
                    rows={2}
                    value={outcome.narrative || ''}
                    onChange={(e) => handleUpdateOutcome(idx, { narrative: e.target.value })}
                    placeholder="Describe what happens in the adventure when landing on this test result..."
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Rewards, Penalties (Damage / Fatigue / Energy / Essence / Gold / Time) & State Tags */}
                <div className="space-y-2.5 pt-1">
                  <OutcomeEffectsEditor
                    values={{
                      damage: outcome.damage,
                      fatigue: outcome.fatigue,
                      energy: outcome.energy,
                      essence: outcome.essence,
                      gold: outcome.gold,
                      timeAdvance: outcome.timeAdvance
                    }}
                    onChange={(partial) => handleUpdateOutcome(idx, partial)}
                  />

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                      Items (comma-separated)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <input
                        type="text"
                        value={(outcome.items || []).join(', ')}
                        onChange={(e) => {
                          const items = e.target.value
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean);
                          handleUpdateOutcome(idx, { items });
                        }}
                        placeholder="e.g. Ancient Compass, Healing Herb"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] font-medium text-slate-400">
                        Grants State Tags (comma-separated)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const currentTag = outcome.grantsStateTags?.[0] || '+Tag';
                          const toggled = currentTag.startsWith('++')
                            ? `+${currentTag.replace(/^\+{1,2}/, '')}`
                            : `++${currentTag.replace(/^\+{1,2}/, '')}`;
                          handleUpdateOutcome(idx, { grantsStateTags: [toggled] });
                        }}
                        className="text-[9px] font-mono text-cyan-400 hover:underline cursor-pointer"
                        title="Toggle Global (++) or Act Local (+)"
                      >
                        ++ / +
                      </button>
                    </div>
                    <input
                      type="text"
                      value={(outcome.grantsStateTags || []).join(', ')}
                      onChange={(e) => {
                        const tags = e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean);
                        handleUpdateOutcome(idx, { grantsStateTags: tags });
                      }}
                      placeholder="e.g. +Stealth_Success"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-emerald-300"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Push-Your-Luck Item Deck Simulator */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">
              Interactive Test Simulator
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Push Your Luck</span>
        </div>

        <p className="text-[11px] text-slate-400 leading-tight">
          Flip cards from the Item Deck one by one. Choose whether to stop or push your luck to reach a higher bracket!
        </p>

        {/* Live Drawn Cards Display */}
        {drawnCards.length > 0 && (
          <div className="space-y-2 p-2.5 bg-slate-900/90 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Drawn Item Cards:</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-amber-300 font-bold">
                  Total Score: {totalScore}
                </span>
                {skullCount > 0 && (
                  <span className="text-[11px] font-mono text-rose-400 font-bold flex items-center gap-0.5">
                    💀 {skullCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {drawnCards.map((card, idx) => (
                <div
                  key={card.id}
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-700 flex items-center gap-1 text-[11px]"
                >
                  <span className="text-slate-500 font-mono">#{idx + 1}</span>
                  <span className="font-bold text-amber-400 font-mono">+{card.value}</span>
                  <span className="text-slate-300 text-[10px] truncate max-w-[90px]">
                    ({card.name})
                  </span>
                  {card.hasDangerSkull && (
                    <span className="text-rose-400 font-bold" title="Danger Skull on Item card">
                      💀
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Matched Outcome Highlight */}
            {matchedOutcome && (
              <div
                className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                  matchedOutcome.type === 'POSITIVE'
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                    : matchedOutcome.type === 'NEUTRAL'
                    ? 'bg-slate-800/80 border-slate-600 text-slate-200'
                    : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="font-mono uppercase px-1 py-0.2 rounded bg-black/40 text-[10px]">
                      {matchedOutcome.rangeLabel}
                    </span>
                    <span>{matchedOutcome.title}</span>
                  </div>
                  {matchedOutcome.narrative && (
                    <p className="text-[11px] opacity-90 mt-0.5">
                      {matchedOutcome.narrative}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleApplySimulatedResult}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[11px] font-semibold shrink-0 ml-2 shadow cursor-pointer"
                  title="Apply this outcome to the active Playtest Simulator"
                >
                  Set as Result
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDrawCard}
            className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>{drawnCards.length === 0 ? 'Start Test: Draw Card' : 'Draw Another Card (Push Luck)'}</span>
          </button>

          {drawnCards.length > 0 && (
            <button
              type="button"
              onClick={handleResetSimulation}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
