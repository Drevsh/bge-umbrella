import React, { memo, useEffect, useRef } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import {
  Zap,
  Lock,
  CheckCircle2,
  XCircle,
  Coins,
  Package,
  Tag,
  Globe,
  Volume2,
  Dices,
  Compass,
  Clock,
  Heart,
  HeartCrack,
  Layers,
  Sparkles,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { QuestModel, QuestVariantOverride } from '../../types/campaign';
import { QuestSimStatus } from '../../utils/simulatorEngine';
import { CampaignLintIssue } from '../../utils/campaignLinter';
import { useCampaignStore } from '../../store/useCampaignStore';

export interface QuestNodeCardData extends Record<string, unknown> {
  quest: QuestModel;
  status: QuestSimStatus;
  activeVariants: QuestVariantOverride[];
  activeRewardChoices: string[];
  activeStateTags?: Set<string>;
  lintIssues?: CampaignLintIssue[];
}

interface QuestNodeCardProps {
  id: string;
  data: QuestNodeCardData;
  selected?: boolean;
}

function areQuestNodePropsEqual(prev: QuestNodeCardProps, next: QuestNodeCardProps): boolean {
  if (prev.id !== next.id || Boolean(prev.selected) !== Boolean(next.selected)) {
    return false;
  }
  if (prev.data.quest !== next.data.quest || prev.data.status !== next.data.status) {
    return false;
  }
  if (prev.data.lintIssues !== next.data.lintIssues) {
    const prevIssues = prev.data.lintIssues || [];
    const nextIssues = next.data.lintIssues || [];
    if (prevIssues.length !== nextIssues.length) return false;
    for (let i = 0; i < prevIssues.length; i++) {
      if (prevIssues[i].id !== nextIssues[i].id) return false;
    }
  }
  const prevVars = prev.data.activeVariants;
  const nextVars = next.data.activeVariants;
  if (prevVars.length !== nextVars.length) return false;
  for (let i = 0; i < prevVars.length; i++) {
    if (prevVars[i].id !== nextVars[i].id) return false;
  }

  // Only re-render for rewardChoices / stateTags if THIS quest's outcomes are affected
  if (prev.data.activeRewardChoices !== next.data.activeRewardChoices) {
    const outcomes = next.data.quest.rewardOutcomes;
    for (let i = 0; i < outcomes.length; i++) {
      const rid = outcomes[i].id;
      if (prev.data.activeRewardChoices.includes(rid) !== next.data.activeRewardChoices.includes(rid)) {
        return false;
      }
    }
  }

  if (prev.data.activeStateTags !== next.data.activeStateTags) {
    const outcomes = next.data.quest.rewardOutcomes;
    for (let i = 0; i < outcomes.length; i++) {
      const tags = outcomes[i].grantsStateTags;
      for (let j = 0; j < tags.length; j++) {
        const t = tags[j];
        if (Boolean(prev.data.activeStateTags?.has(t)) !== Boolean(next.data.activeStateTags?.has(t))) {
          return false;
        }
      }
    }
  }

  return true;
}

export const QuestNodeCard = memo(({ id, data, selected }: QuestNodeCardProps) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const selectQuest = useCampaignStore((s) => s.selectQuest);
  const updateQuestField = useCampaignStore((s) => s.updateQuestField);
  const toggleSimulatorRewardChoice = useCampaignStore((s) => s.toggleSimulatorRewardChoice);
  const toggleSimulatorQuestCompletion = useCampaignStore((s) => s.toggleSimulatorQuestCompletion);
  const activeGameProfile = useCampaignStore((s) => s.activeGameProfile);
  const isCollapsed = useCampaignStore((s) => Boolean(s.collapsedQuestUids[id]));
  const toggleQuestNodeCollapsed = useCampaignStore((s) => s.toggleQuestNodeCollapsed);

  const { quest, status, activeVariants, activeRewardChoices, activeStateTags, lintIssues = [] } = data;
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(quest.title);

  useEffect(() => {
    setEditedTitle(quest.title);
  }, [quest.title]);

  // Recalculate node handle internals when handle topology or collapsed state changes AFTER initial mount
  const handleSignature = `${isCollapsed}|${quest.prereqLogic}|${quest.category}|${Boolean(quest.testConfig)}|${quest.rewardOutcomes
    .map((r) => r.id)
    .join(',')}`;
  const prevHandleSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevHandleSignatureRef.current === null) {
      prevHandleSignatureRef.current = handleSignature;
      return;
    }
    if (prevHandleSignatureRef.current !== handleSignature) {
      prevHandleSignatureRef.current = handleSignature;
      requestAnimationFrame(() => {
        updateNodeInternals(id);
      });
    }
  }, [id, handleSignature, updateNodeInternals]);

  const errorIssues = lintIssues.filter((i) => i.severity === 'error');
  const warningIssues = lintIssues.filter((i) => i.severity === 'warning');
  const actionableLintIssues = lintIssues.filter((i) => i.severity === 'error' || i.severity === 'warning');

  const categoryColors: Record<string, string> = {
    MAIN: 'border-blue-500/60 bg-blue-950/40 text-blue-300',
    MAIN_BRANCH: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300',
    SIDE: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300',
    FACTION: 'border-purple-500/60 bg-purple-950/40 text-purple-300',
    BOSS: 'border-rose-500/70 bg-rose-950/40 text-rose-300',
    ACT_TRANSITION: 'border-amber-400/80 bg-amber-950/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    TEST: 'border-amber-500/70 bg-amber-950/50 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
  };

  const categoryDef = activeGameProfile?.categories?.find((c) => c.id === quest.category);
  const categoryLabel = categoryDef?.label || quest.category.replace('_', ' ');
  const categoryBadgeStyle =
    categoryDef?.badgeStyle ||
    categoryColors[quest.category] ||
    'border-slate-500/60 bg-slate-800/40 text-slate-300';

  const statusStyles: Record<QuestSimStatus, { border: string; glow: string; badge: string; icon: React.ReactNode }> = {
    START: {
      border: 'border-slate-600',
      glow: '',
      badge: 'bg-slate-800 text-slate-300',
      icon: null
    },
    AVAILABLE: {
      border: 'border-emerald-500/80',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      badge: 'bg-emerald-950 text-emerald-300 border border-emerald-700/60',
      icon: <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />
    },
    COMPLETED: {
      border: 'border-cyan-500/80',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.25)]',
      badge: 'bg-cyan-950 text-cyan-300 border border-cyan-700/60',
      icon: <CheckCircle2 className="w-3 h-3 text-cyan-400 inline mr-1" />
    },
    LOCKED: {
      border: 'border-slate-800/80 opacity-60',
      glow: '',
      badge: 'bg-slate-900 text-slate-500',
      icon: <Lock className="w-3 h-3 text-slate-500 inline mr-1" />
    },
    LOCKED_OUT: {
      border: 'border-rose-900/60 opacity-40 line-through',
      glow: '',
      badge: 'bg-rose-950 text-rose-400',
      icon: <XCircle className="w-3 h-3 text-rose-400 inline mr-1" />
    }
  };

  const currentStatus = statusStyles[status] || statusStyles.START;

  return (
    <div
      data-quest-uid={quest.uid}
      onClick={() => selectQuest(quest.uid)}
      className={`group relative w-[280px] rounded-xl border bg-slate-900 transition-[border-color,box-shadow] duration-150 cursor-pointer shadow-xl ${
        selected
          ? 'ring-2 ring-indigo-400 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]'
          : currentStatus.border
      } ${currentStatus.glow}`}
    >
      {/* Left Input Port Handle */}
      {(quest.prereqLogic !== 'START' || quest.category === 'TEST' || Boolean(quest.testConfig)) && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className={`!w-3.5 !h-3.5 ${
            quest.category === 'TEST' || Boolean(quest.testConfig)
              ? '!bg-amber-400 hover:!bg-amber-300 ring-2 ring-amber-500/50'
              : '!bg-slate-400 hover:!bg-indigo-400'
          } !border-2 !border-slate-900 after:content-[''] after:absolute after:-inset-3 after:bg-transparent`}
          style={{ top: '38px' }}
          title={
            quest.category === 'TEST' || Boolean(quest.testConfig)
              ? 'Skill Test Input: Connect incoming quest to trigger this test'
              : 'Prerequisite Input'
          }
        />
      )}

      {/* Card Header */}
      <div className={`p-3 pb-2 ${isCollapsed ? '' : 'border-b border-slate-800/80'}`}>
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-xs font-black tracking-wider text-slate-200 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
              {quest.code}
            </span>
            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border truncate ${categoryBadgeStyle}`}>
              {categoryLabel}
            </span>
            {actionableLintIssues.length > 0 && (
              <span
                className={`flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                  errorIssues.length > 0
                    ? 'bg-rose-950/90 text-rose-300 border-rose-600/80'
                    : 'bg-amber-950/90 text-amber-300 border-amber-600/80'
                }`}
                title={actionableLintIssues.map((i) => `[${i.severity.toUpperCase()}] ${i.message}`).join('\n')}
              >
                {errorIssues.length > 0 ? (
                  <AlertCircle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                )}
                <span>{actionableLintIssues.length}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {quest.prereqLogic !== 'START' && (
              <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700/60">
                {quest.prereqLogic === 'ALL' ? 'AND' : 'OR'}
              </span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center ${currentStatus.badge}`}>
              {currentStatus.icon}
              {status}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleQuestNodeCollapsed(quest.uid);
              }}
              className="nodrag p-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/70 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand quest card details' : 'Collapse quest card to compact mode'}
            >
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {isEditingTitle ? (
          <input
            type="text"
            value={editedTitle}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={() => {
              setIsEditingTitle(false);
              if (editedTitle.trim()) {
                updateQuestField(quest.uid, 'title', editedTitle.trim());
              }
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                setIsEditingTitle(false);
                if (editedTitle.trim()) {
                  updateQuestField(quest.uid, 'title', editedTitle.trim());
                }
              } else if (e.key === 'Escape') {
                setIsEditingTitle(false);
                setEditedTitle(quest.title);
              }
            }}
            className="w-full bg-slate-950 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-slate-100 font-semibold focus:outline-none nodrag"
          />
        ) : (
          <h3
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditingTitle(true);
            }}
            title="Double-click to rename"
            className="font-semibold text-sm text-slate-100 line-clamp-1 group-hover:text-indigo-300 transition-colors"
          >
            {quest.title}
          </h3>
        )}

        {/* Dragon Eclipse Exploration Stage Badge */}
        {!isCollapsed && (quest.isExplorationStage || quest.category === 'EXPLORATION' || Boolean(quest.explorationConfig)) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950 border border-teal-500/50 px-1.5 py-0.5 rounded">
              <Compass className="w-2.5 h-2.5 text-teal-400" />
              Exploration Stage
            </span>
            {Boolean(quest.timeAdvance && quest.timeAdvance > 0) && (
              <span
                className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-teal-300 bg-teal-950 px-1.5 py-0.5 rounded border border-teal-700/60"
                title={`Base exploration duration: +${quest.timeAdvance} Time`}
              >
                <Clock className="w-2.5 h-2.5 text-teal-400" />+{quest.timeAdvance} Time
              </span>
            )}
          </div>
        )}

        {/* Simulator Toggle Button & Compact Summary */}
        <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-800/40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-slate-400">Tier {quest.tier}</span>
            {isCollapsed && (
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                {quest.rewardOutcomes.length} port{quest.rewardOutcomes.length === 1 ? '' : 's'}
              </span>
            )}
            {quest.audioTracks && quest.audioTracks.length > 0 && (
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 bg-indigo-950 text-indigo-300 border border-indigo-700/60"
                title={`${quest.audioTracks.length} Voice Narration track(s)`}
              >
                <Volume2 className="w-2.5 h-2.5 text-indigo-400" />
                {!isCollapsed && 'Audio'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleSimulatorQuestCompletion(quest.uid);
            }}
            className={`nodrag text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
              status === 'COMPLETED'
                ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            {status === 'COMPLETED' ? '✓ Done' : isCollapsed ? 'Complete' : 'Playtest Complete'}
          </button>
        </div>
      </div>

      {/* When Collapsed: keep all source handles mounted along the right edge so React Flow edges stay connected */}
      {isCollapsed &&
        quest.rewardOutcomes.map((reward, idx) => {
          const total = quest.rewardOutcomes.length;
          const topPct = total <= 1 ? 50 : 25 + (idx / (total - 1)) * 55;
          return (
            <Handle
              key={reward.id}
              type="source"
              position={Position.Right}
              id={reward.id}
              title={`Output Port: ${reward.label}`}
              className="!w-3 !h-3 !bg-slate-400 hover:!bg-indigo-400 !border-2 !border-slate-900 after:content-[''] after:absolute after:-inset-2 after:bg-transparent"
              style={{
                top: `${topPct}%`,
                transform: 'translateY(-50%)',
                right: '-6px'
              }}
            />
          );
        })}

      {/* Active Variants Pills */}
      {!isCollapsed && quest.variants.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800/60 flex flex-wrap gap-1">
          {quest.variants.map((variant) => {
            const isActive = activeVariants.some((v) => v.id === variant.id);
            return (
              <span
                key={variant.id}
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60'
                    : 'bg-slate-800/50 text-slate-500 border border-slate-800'
                }`}
                title={`Variant triggered by [${variant.requiredStateTag}]`}
              >
                <Zap className="w-2.5 h-2.5" />
                {variant.requiredStateTag}
              </span>
            );
          })}
        </div>
      )}

      {/* Dynamic Multi-Port Reward Rows / Test Table */}
      {!isCollapsed && (
      <div className="p-2 space-y-1.5">
        {quest.testConfig ? (
          <div className="flex items-center justify-between text-[10px] font-bold text-amber-300 uppercase tracking-wider px-1 pb-1 mb-1 border-b border-amber-900/40">
            <span className="flex items-center gap-1">
              <Dices className="w-3 h-3 text-amber-400" />
              <span className="truncate max-w-[150px]">{quest.testConfig.testName || 'Skill Test'}</span>
            </span>
            <span className="text-[9px] font-mono text-amber-400/90 bg-amber-950 px-1 py-0.2 rounded border border-amber-800/60">
              p.11
            </span>
          </div>
        ) : (
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Outcomes & Rewards
          </div>
        )}

        {quest.rewardOutcomes.map((reward) => {
          const isSelected = activeRewardChoices.includes(reward.id);
          const testOutcome = quest.testConfig?.outcomes?.find((o) => o.id === reward.id);
          const isNegative = testOutcome?.type === 'NEGATIVE';
          const isNeutral = testOutcome?.type === 'NEUTRAL';
          const isPositive = testOutcome?.type === 'POSITIVE';

          const outcomeStyle = isPositive
            ? isSelected
              ? 'bg-emerald-950/70 border-emerald-400 text-emerald-100'
              : 'bg-emerald-950/30 hover:bg-emerald-950/60 border-emerald-700/50 text-emerald-200'
            : isNeutral
            ? isSelected
              ? 'bg-slate-800 border-slate-400 text-slate-100'
              : 'bg-slate-900/50 hover:bg-slate-800/60 border-slate-700/60 text-slate-300'
            : isNegative
            ? isSelected
              ? 'bg-rose-950/70 border-rose-400 text-rose-100'
              : 'bg-rose-950/30 hover:bg-rose-950/60 border-rose-800/50 text-rose-200'
            : isSelected
            ? 'bg-indigo-950/60 border-indigo-500/60 text-indigo-200'
            : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800 text-slate-300';

          return (
            <div
              key={reward.id}
              onClick={(e) => {
                e.stopPropagation();
                toggleSimulatorRewardChoice(reward.id, quest.uid);
              }}
              className={`nodrag relative flex items-center justify-between text-[11px] p-1.5 rounded-md border transition-colors ${outcomeStyle}`}
            >
              <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 w-3 h-3 cursor-pointer pointer-events-none"
                />
                {testOutcome && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                      isPositive
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                        : isNeutral
                        ? 'bg-slate-800 text-slate-300 border-slate-600'
                        : 'bg-rose-950 text-rose-300 border-rose-500/60'
                    }`}
                  >
                    {testOutcome.rangeLabel}
                  </span>
                )}
                <span className="truncate font-medium">
                  {testOutcome ? testOutcome.title : reward.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-1 text-[10px] shrink-0 text-slate-400 mr-2 max-w-[145px]">
                {(() => {
                  const effTime = reward.timeAdvance ?? testOutcome?.timeAdvance ?? 0;
                  const effDamage = reward.damage ?? testOutcome?.damage ?? 0;
                  const effFatigue = reward.fatigue ?? testOutcome?.fatigue ?? 0;
                  const effEnergy = reward.energy ?? testOutcome?.energy ?? 0;
                  const effEssence = reward.essence ?? testOutcome?.essence ?? 0;
                  const effGold = reward.gold ?? testOutcome?.gold ?? 0;

                  return (
                    <>
                      {effTime > 0 && (
                        <span
                          className="flex items-center gap-0.5 font-mono text-[9px] font-bold text-teal-300 bg-teal-950 border border-teal-600/70 px-1 py-0.2 rounded"
                          title={`Advances Exploration Time Track by +${effTime}`}
                        >
                          <Clock className="w-2.5 h-2.5 text-teal-400" />+{effTime}h
                        </span>
                      )}

                      {effDamage !== 0 && (
                        <span
                          className={`flex items-center gap-0.5 font-mono text-[9px] font-bold px-1 py-0.2 rounded border ${
                            effDamage > 0
                              ? 'text-rose-300 bg-rose-950/90 border-rose-600/70'
                              : 'text-emerald-300 bg-emerald-950/90 border-emerald-600/70'
                          }`}
                          title={
                            effDamage > 0
                              ? `Deals ${effDamage} Damage`
                              : `Removes / Heals ${Math.abs(effDamage)} Damage`
                          }
                        >
                          {effDamage > 0 ? (
                            <HeartCrack className="w-2.5 h-2.5 text-rose-400" />
                          ) : (
                            <Heart className="w-2.5 h-2.5 text-emerald-400" />
                          )}
                          {effDamage > 0 ? `+${effDamage}` : effDamage} Dmg
                        </span>
                      )}

                      {effFatigue !== 0 && (
                        <span
                          className={`flex items-center gap-0.5 font-mono text-[9px] font-bold px-1 py-0.2 rounded border ${
                            effFatigue > 0
                              ? 'text-orange-300 bg-orange-950/90 border-orange-600/70'
                              : 'text-sky-300 bg-sky-950/90 border-sky-600/70'
                          }`}
                          title={
                            effFatigue > 0
                              ? `Gives ${effFatigue} Fatigue card${effFatigue === 1 ? '' : 's'}`
                              : `Removes ${Math.abs(effFatigue)} Fatigue card${Math.abs(effFatigue) === 1 ? '' : 's'}`
                          }
                        >
                          <Layers
                            className={`w-2.5 h-2.5 ${
                              effFatigue > 0 ? 'text-orange-400' : 'text-sky-400'
                            }`}
                          />
                          {effFatigue > 0 ? `+${effFatigue}` : effFatigue} Fat
                        </span>
                      )}

                      {effEnergy !== 0 && (
                        <span
                          className={`flex items-center gap-0.5 font-mono text-[9px] font-bold px-1 py-0.2 rounded border ${
                            effEnergy > 0
                              ? 'text-cyan-300 bg-cyan-950/90 border-cyan-600/70'
                              : 'text-rose-300 bg-rose-950/90 border-rose-600/70'
                          }`}
                          title={
                            effEnergy > 0
                              ? `Grants +${effEnergy} Energy`
                              : `Loses ${Math.abs(effEnergy)} Energy`
                          }
                        >
                          <Zap className="w-2.5 h-2.5 text-cyan-400" />
                          {effEnergy > 0 ? `+${effEnergy}` : effEnergy} Eng
                        </span>
                      )}

                      {effEssence !== 0 && (
                        <span
                          className={`flex items-center gap-0.5 font-mono text-[9px] font-bold px-1 py-0.2 rounded border ${
                            effEssence > 0
                              ? 'text-purple-300 bg-purple-950/90 border-purple-600/70'
                              : 'text-rose-300 bg-rose-950/90 border-rose-600/70'
                          }`}
                          title={
                            effEssence > 0
                              ? `Grants +${effEssence} Essence`
                              : `Loses ${Math.abs(effEssence)} Essence`
                          }
                        >
                          <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                          {effEssence > 0 ? `+${effEssence}` : effEssence} Ess
                        </span>
                      )}

                      {effGold !== 0 && (
                        <span
                          className={`flex items-center gap-0.5 font-mono text-[9px] font-bold ${
                            effGold > 0 ? 'text-amber-400' : 'text-rose-400'
                          }`}
                          title={effGold > 0 ? `Grants ${effGold} Gold` : `Costs / Loses ${Math.abs(effGold)} Gold`}
                        >
                          <Coins className="w-2.5 h-2.5" />
                          {effGold > 0 ? `${effGold}g` : `${effGold}g`}
                        </span>
                      )}
                    </>
                  );
                })()}
                {reward.items.length > 0 && (
                  <span title={reward.items.join(', ')}>
                    <Package className="w-2.5 h-2.5 text-blue-400" />
                  </span>
                )}
                {reward.grantsStateTags.length > 0 &&
                  (() => {
                    const primaryTag = reward.grantsStateTags[0];
                    const extraCount = reward.grantsStateTags.length - 1;
                    const isAnyTagActive = reward.grantsStateTags.some((t) => activeStateTags?.has(t));
                    const isGlobal = primaryTag.startsWith('++');

                    return (
                      <span
                        className={`flex items-center gap-0.5 font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                          isGlobal
                            ? isAnyTagActive
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-400 font-semibold'
                              : 'bg-slate-900 text-cyan-400/90 border-cyan-900/60'
                            : isAnyTagActive
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/80 font-semibold'
                            : 'bg-slate-900 text-emerald-400/90 border-emerald-900/60'
                        }`}
                        title={`${isGlobal ? 'Campaign Global State' : 'Act Local State'}: ${reward.grantsStateTags.join(', ')}${
                          isAnyTagActive ? ' (Active in current simulation)' : ''
                        }`}
                      >
                        {isGlobal ? (
                          <Globe className="w-2.5 h-2.5 shrink-0 text-cyan-400" />
                        ) : (
                          <Tag className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                        )}
                        <span className="truncate max-w-[75px]">{primaryTag}</span>
                        {extraCount > 0 && (
                          <span className={`text-[8px] font-bold ml-0.5 ${isGlobal ? 'text-cyan-300' : 'text-emerald-300'}`}>
                            +{extraCount}
                          </span>
                        )}
                      </span>
                    );
                  })()}
              </div>

              {/* Dedicated Output Port for this Reward Outcome */}
              <Handle
                type="source"
                position={Position.Right}
                id={reward.id}
                className="!w-3.5 !h-3.5 !bg-slate-400 hover:!bg-indigo-400 !border-2 !border-slate-900 after:content-[''] after:absolute after:-inset-3 after:bg-transparent"
                style={{
                  top: '50%',
                  transform: 'translateY(-50%)',
                  right: '-7px'
                }}
              />
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}, areQuestNodePropsEqual);

QuestNodeCard.displayName = 'QuestNodeCard';
