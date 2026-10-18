import React, { useState } from 'react';
import {
  Compass,
  Clock,
  Zap,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  Info,
  Layers
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { evaluateCampaignSimulation } from '../../utils/simulatorEngine';
import { DragonEclipseEventSlot } from '../../types/campaign';

export const ExplorationTimeTrackBar: React.FC = () => {
  const quests = useCampaignStore((s) => s.quests);
  const edges = useCampaignStore((s) => s.edges);
  const simulator = useCampaignStore((s) => s.simulator);
  const adjustSimulatorTime = useCampaignStore((s) => s.adjustSimulatorTime);
  const selectQuest = useCampaignStore((s) => s.selectQuest);
  const activeGameProfile = useCampaignStore((s) => s.activeGameProfile);

  const [isExpanded, setIsExpanded] = useState(false);

  // Evaluate simulation state including time track
  const simState = React.useMemo(() => {
    return evaluateCampaignSimulation(
      quests,
      edges,
      simulator.activeRewardChoices,
      simulator.completedQuestIds,
      simulator.customTags,
      simulator.manualTimeOffset || 0
    );
  }, [quests, edges, simulator]);

  // Check if any quest is in exploration stage or has explorationConfig
  const explorationQuests = Object.values(quests).filter(
    (q) => q.isExplorationStage || q.category === 'EXPLORATION' || q.explorationConfig
  );

  const isDragonEclipse = activeGameProfile.id === 'dragon-eclipse';
  // If no exploration quests exist and not Dragon Eclipse, we can still show if user wants or hide
  const hasExplorationElements = explorationQuests.length > 0 || isDragonEclipse;

  // Determine overall track length & event slots
  // Aggregate event slots across exploration quests or default to 8 slots with slots 3 & 6
  let trackLength = 8;
  const eventSlotsMap = new Map<number, DragonEclipseEventSlot>();

  // Default Dragon Eclipse exploration slots
  eventSlotsMap.set(3, {
    slotNumber: 3,
    title: 'Dusk Descends',
    description: 'Draw an Event card from the Exploration Event deck.',
    grantsStateTag: '+Event_Dusk'
  });
  eventSlotsMap.set(6, {
    slotNumber: 6,
    title: 'Nightfall Peril',
    description: 'Night falls over the realm. Perils increase and roaming beasts emerge.',
    grantsStateTag: '+Event_Nightfall'
  });

  explorationQuests.forEach((q) => {
    if (q.explorationConfig) {
      if (q.explorationConfig.trackLength > trackLength) {
        trackLength = q.explorationConfig.trackLength;
      }
      q.explorationConfig.eventSlots.forEach((slot) => {
        eventSlotsMap.set(slot.slotNumber, slot);
      });
    }
  });

  const slots = Array.from({ length: trackLength }, (_, i) => i + 1);
  const currentTime = Math.max(0, simState.totalTimeElapsed);

  return (
    <aside aria-label="Exploration Time Track" className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-3 pointer-events-none">
      <div className="bg-slate-900/95 border border-teal-500/40 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden pointer-events-auto transition-all duration-200 ring-1 ring-teal-500/20">
        {/* Main Bar Strip */}
        <div className="p-2 sm:px-3 sm:py-2 flex items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/60">
          {/* Left Title & Status */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="p-1 rounded-lg bg-teal-950/90 text-teal-300 border border-teal-500/50 shadow-[0_0_10px_rgba(20,184,166,0.3)]">
              <Compass className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                  World Exploration
                </span>
                <span className="text-[10px] font-mono font-bold text-teal-300 bg-teal-950 px-1.5 py-0.2 rounded border border-teal-800/80">
                  Time: {currentTime}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                {simState.timeContributors.length} choice(s) advanced time &bull; {simState.triggeredEventSlots.length} event(s) triggered
              </p>
            </div>
          </div>

          {/* Stepper & Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => adjustSimulatorTime(-1)}
                disabled={currentTime <= 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
                title="Rewind Time Track by -1"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-1.5 text-xs font-mono font-bold text-teal-300">
                {currentTime}
              </span>
              <button
                type="button"
                onClick={() => adjustSimulatorTime(1)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Advance Time Track by +1"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-950/60 hover:bg-teal-900/60 border border-teal-700/50 text-teal-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Inspect which choices advanced time and view event slots"
            >
              <span>Follow Trail</span>
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Visual Slot Track Strip */}
        <div className="px-3 py-2 bg-slate-900/70 overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-between gap-1.5 min-w-[340px]">
            {slots.map((slotNum) => {
              const eventSlot = eventSlotsMap.get(slotNum);
              const isPassed = currentTime >= slotNum;
              const isCurrent = currentTime === slotNum;
              const isEvent = Boolean(eventSlot);

              return (
                <div
                  key={slotNum}
                  className={`relative flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border transition-all text-center select-none ${
                    isCurrent
                      ? 'bg-teal-500/20 border-teal-400 text-teal-200 ring-2 ring-teal-500/40 shadow-[0_0_12px_rgba(20,184,166,0.35)] font-bold'
                      : isPassed
                      ? 'bg-teal-950/50 border-teal-800/80 text-teal-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                  title={
                    eventSlot
                      ? `Slot ${slotNum}: ${eventSlot.title}${isPassed ? ' (Triggered!)' : ''}`
                      : `Time Slot ${slotNum}`
                  }
                >
                  <div className="flex items-center gap-0.5 text-xs font-mono">
                    <span>{slotNum}</span>
                    {isEvent && (
                      <Zap
                        className={`w-3 h-3 shrink-0 ${
                          isPassed ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-amber-500/60'
                        }`}
                      />
                    )}
                  </div>

                  {isEvent && eventSlot && (
                    <span
                      className={`text-[8px] font-semibold uppercase tracking-wider truncate max-w-[50px] ${
                        isPassed ? 'text-amber-300 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {eventSlot.title.split(' ')[0]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Expandable Trail Inspector */}
        {isExpanded && (
          <div className="p-3.5 border-t border-slate-800 space-y-3 max-h-72 overflow-y-auto animate-in slide-in-from-bottom duration-150">
            {/* Event Slots Status */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                Exploration Event Slots
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from(eventSlotsMap.values()).map((slot) => {
                  const isTriggered = currentTime >= slot.slotNumber;

                  return (
                    <div
                      key={slot.slotNumber}
                      className={`p-2 rounded-lg border text-xs space-y-0.5 ${
                        isTriggered
                          ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <span>Slot {slot.slotNumber}:</span>
                          <span>{slot.title}</span>
                        </span>
                        {isTriggered ? (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-900/60 text-amber-300 border border-amber-700/60 font-bold">
                            TRIGGERED
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-500">
                            {slot.slotNumber - currentTime} away
                          </span>
                        )}
                      </div>
                      {slot.description && (
                        <p className="text-[10px] text-slate-300 leading-relaxed">
                          {slot.description}
                        </p>
                      )}
                      {slot.grantsStateTag && (
                        <div className="text-[9px] font-mono text-teal-400 pt-0.5">
                          Tag: <span className="underline">{slot.grantsStateTag}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Contributors Trail */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5">
                <Clock className="w-3 h-3 text-teal-400" />
                Choices & Quests That Advanced Time ({simState.timeContributors.length})
              </span>

              {simState.timeContributors.length === 0 ? (
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center text-slate-500 text-xs">
                  No quests or choices have advanced the Time Track yet in this playtest session.
                  Complete an exploration quest or select a choice that consumes time to follow the trail.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {simState.timeContributors.map((c, idx) => (
                    <div
                      key={`${c.questUid}-${idx}`}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500/50 flex items-center justify-between gap-2 text-xs transition-colors group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 shrink-0">
                          {c.questCode}
                        </span>
                        <div className="truncate">
                          <span className="text-slate-200 font-medium">{c.questTitle}:</span>{' '}
                          <span className="text-teal-300 font-normal">{c.label}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-teal-300 bg-teal-950/80 px-1.5 py-0.5 rounded border border-teal-800/80 text-[10px]">
                          +{c.amount} Time
                        </span>
                        <button
                          type="button"
                          onClick={() => selectQuest(c.questUid)}
                          className="p-1 rounded bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Locate quest card on canvas"
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
      </div>
    </aside>
  );
};
