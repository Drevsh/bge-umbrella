import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Eye,
  Flag,
  Lock
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { evaluateCampaignSimulation } from '../../utils/simulatorEngine';
import { DragonEclipseEventSlot } from '../../types/campaign';

type SimulationEvaluation = ReturnType<typeof evaluateCampaignSimulation>;

export const ExplorationHudPill: React.FC = () => {
  const quests = useCampaignStore((s) => s.quests);
  const edges = useCampaignStore((s) => s.edges);
  const simulator = useCampaignStore((s) => s.simulator);
  const adjustSimulatorTime = useCampaignStore((s) => s.adjustSimulatorTime);
  const selectQuest = useCampaignStore((s) => s.selectQuest);
  const activeGameProfile = useCampaignStore((s) => s.activeGameProfile);

  const [isExpanded, setIsExpanded] = useState(false);
  const pillRef = useRef<HTMLElement | null>(null);

  // Close expanded audit popover on outside click or Escape
  useEffect(() => {
    if (!isExpanded) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const simSignature = React.useMemo(() => {
    const qPart = Object.values(quests)
      .map(
        (q) =>
          `${q.uid}:${q.prereqLogic}:${q.requiredTag || ''}:${q.timeAdvance || 0}:${
            q.isExplorationStage ? 1 : 0
          }:${q.rewardOutcomes.map((r) => `${r.id}:${r.grantsStateTags.join(',')}:${r.timeAdvance || 0}`).join(';')}`
      )
      .join('|');
    const ePart = edges
      .map((e) => `${e.id}:${e.source}:${e.sourcePortId || ''}:${e.target}:${e.type}`)
      .join('|');
    const sPart = `${simulator.activeRewardChoices.join(',')}|${simulator.completedQuestIds.join(
      ','
    )}|${simulator.customTags.join(',')}|${simulator.manualTimeOffset || 0}`;
    return `${qPart}#${ePart}#${sPart}`;
  }, [quests, edges, simulator]);

  const simCacheRef = React.useRef<{ sig: string; value: SimulationEvaluation } | null>(null);

  // Evaluate simulation state only when simulation logic changes (ignores node position updates)
  const simState = React.useMemo(() => {
    if (simCacheRef.current && simCacheRef.current.sig === simSignature) {
      return simCacheRef.current.value;
    }
    const evaluated = evaluateCampaignSimulation(
      quests,
      edges,
      simulator.activeRewardChoices,
      simulator.completedQuestIds,
      simulator.customTags,
      simulator.manualTimeOffset || 0
    );
    simCacheRef.current = { sig: simSignature, value: evaluated };
    return evaluated;
  }, [simSignature, quests, edges, simulator]);

  // Check if any quest has exploration or Dragon Eclipse
  const explorationQuests = Object.values(quests).filter(
    (q) => q.isExplorationStage || q.category === 'EXPLORATION' || q.explorationConfig
  );

  const isDragonEclipse = activeGameProfile.id === 'dragon-eclipse';
  if (explorationQuests.length === 0 && !isDragonEclipse) {
    return null;
  }

  const { timeRemaining, timeLimit, timeConsumed, timeContributors, scenarioEndTriggered } = simState;

  // Determine color status based on countdown
  const ratio = timeLimit > 0 ? timeRemaining / timeLimit : 0;
  const isExpired = timeRemaining <= 0;
  const isUrgent = ratio <= 0.25;

  const statusColor = isExpired
    ? 'text-rose-400 bg-rose-950/80 border-rose-500/60 ring-rose-500/30'
    : isUrgent
    ? 'text-amber-400 bg-amber-950/80 border-amber-500/60 ring-amber-500/30'
    : 'text-teal-400 bg-teal-950/80 border-teal-500/50 ring-teal-500/20';

  // Aggregate event slots from active exploration config or defaults
  const eventSlots: DragonEclipseEventSlot[] = [];
  explorationQuests.forEach((q) => {
    if (q.explorationConfig?.eventSlots) {
      q.explorationConfig.eventSlots.forEach((slot) => {
        if (!eventSlots.some((s) => s.slotNumber === slot.slotNumber)) {
          eventSlots.push(slot);
        }
      });
    }
  });

  // Sort by triggerAtRemaining descending (highest remaining triggers first)
  eventSlots.sort((a, b) => b.triggerAtRemaining - a.triggerAtRemaining);

  const handleFocusQuest = (questUid?: string) => {
    if (!questUid || !quests[questUid]) return;
    selectQuest(questUid);

    const targetQ = quests[questUid];
    if (targetQ?.position) {
      const el = document.querySelector(`[data-quest-uid="${questUid}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  };

  return (
    <aside
      ref={pillRef}
      aria-label="World Exploration Countdown HUD"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={`relative pointer-events-auto select-none max-w-full min-w-0 ${
        isExpanded ? 'z-40' : 'z-10'
      }`}
    >
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur-md ring-1 ring-white/5 max-w-full">
        {/* Main Pill Bar */}
        <div className="px-2.5 py-1 flex items-center gap-1.5 sm:gap-2 text-xs max-w-full overflow-x-auto scrollbar-none">
          {/* Compass Icon Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`p-1 rounded-lg border ${statusColor}`}>
              <Compass className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-slate-200 hidden xl:inline text-[11px] uppercase tracking-wider">
              Exploration
            </span>
          </div>

          <div className="h-3.5 w-px bg-slate-800 shrink-0" />

          {/* Time Remaining Gauge & Display */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 font-mono whitespace-nowrap">
              <Clock
                className={`w-3.5 h-3.5 shrink-0 ${
                  isExpired ? 'text-rose-400 animate-pulse' : isUrgent ? 'text-amber-400' : 'text-teal-400'
                }`}
              />
              <span
                className={`font-bold ${
                  isExpired ? 'text-rose-400' : isUrgent ? 'text-amber-300' : 'text-teal-300'
                }`}
              >
                {timeRemaining}
              </span>
              <span className="text-slate-400 text-[10px]">
                / {timeLimit} <span className="hidden md:inline">Time </span>Left
              </span>
            </div>

            {/* Segmented mini progress bar */}
            <div className="hidden sm:flex w-12 lg:w-16 h-2 rounded-full bg-slate-800 overflow-hidden p-0.5 gap-0.5 shrink-0">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isExpired
                    ? 'bg-rose-500 w-full animate-pulse'
                    : isUrgent
                    ? 'bg-amber-500'
                    : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(100, (timeRemaining / timeLimit) * 100)}%` }}
              />
            </div>
          </div>

          <div className="h-3.5 w-px bg-slate-800 shrink-0" />

          {/* Trigger Milestones / Quests Chips */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[130px] sm:max-w-[200px] lg:max-w-[280px] scrollbar-none py-0.5 shrink-0">
            {eventSlots.map((slot) => {
              const isTriggered = timeRemaining <= slot.triggerAtRemaining;
              const hasTarget = Boolean(slot.targetQuestId && quests[slot.targetQuestId]);
              const targetCode = hasTarget ? quests[slot.targetQuestId!]?.code : undefined;

              return (
                <button
                  key={slot.slotNumber}
                  type="button"
                  onClick={() => slot.targetQuestId && handleFocusQuest(slot.targetQuestId)}
                  title={`${slot.title} (Triggers at ≤${slot.triggerAtRemaining} Time Remaining)${
                    hasTarget ? ` -> Unlocks ${targetCode}` : ''
                  }`}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                    isTriggered
                      ? 'bg-amber-950/80 text-amber-300 border-amber-600/70 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Zap
                    className={`w-2.5 h-2.5 shrink-0 ${
                      isTriggered ? 'text-amber-400 animate-pulse' : 'text-slate-500'
                    }`}
                  />
                  <span>≤{slot.triggerAtRemaining}</span>
                  {targetCode && (
                    <span className="font-mono text-indigo-300 font-bold hidden sm:inline">
                      [{targetCode}]
                    </span>
                  )}
                </button>
              );
            })}

            {/* Scenario End Milestone */}
            <div
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 shrink-0 ${
                scenarioEndTriggered
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse'
                  : 'bg-slate-900/80 text-slate-500 border-slate-800'
              }`}
              title="Scenario End (Time Expiration: 0 Time Remaining)"
            >
              <Flag className="w-2.5 h-2.5 shrink-0" />
              <span>0 End</span>
              {scenarioEndTriggered && <Lock className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
            </div>
          </div>

          <div className="h-3.5 w-px bg-slate-800 shrink-0" />

          {/* Steppers & Expand button */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => adjustSimulatorTime(1)}
              title="Simulate +1 Time Spent (deducts 1 remaining)"
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => adjustSimulatorTime(-1)}
              title="Simulate -1 Time Spent (restores 1 remaining)"
              className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isExpanded
                  ? 'bg-slate-800 text-white'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Expand Time Trail Audit"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Audit Trail Popover (Does not stretch the pill bar) */}
      {isExpanded && (
        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[min(92vw,340px)] p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl space-y-2.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 text-xs z-50">
          {scenarioEndTriggered && (
            <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-200 text-[11px] flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Scenario End Triggered: Unfinished exploration quests locked!</span>
              </span>
              {simState.scenarioEndQuestUid && (
                <button
                  type="button"
                  onClick={() => handleFocusQuest(simState.scenarioEndQuestUid)}
                  className="underline text-indigo-300 hover:text-indigo-200 font-mono text-[10px] shrink-0"
                >
                  Locate
                </button>
              )}
            </div>
          )}

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Time Consumed Breakdown ({timeConsumed} Time Units Spent)
            </span>
            {timeContributors.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                No exploration quests or choices completed yet.
              </p>
            ) : (
              <div className="space-y-1">
                {timeContributors.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800 text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <span className="font-mono text-indigo-400 font-bold">{c.questCode}</span>
                      <span className="text-slate-300 truncate max-w-[130px]">{c.questTitle}</span>
                      <span className="text-slate-500 text-[10px] truncate">({c.label})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-semibold text-teal-400">+{c.amount}h</span>
                      <button
                        type="button"
                        onClick={() => handleFocusQuest(c.questUid)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                        title="Locate quest on canvas"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
