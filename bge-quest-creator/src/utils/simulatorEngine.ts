import { QuestModel, CampaignEdge, QuestVariantOverride } from '../types/campaign';

export type QuestSimStatus = 'START' | 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'LOCKED_OUT';

export interface TimeTrackContributor {
  questUid: string;
  questCode: string;
  questTitle: string;
  source: 'QUEST' | 'CHOICE';
  label: string;
  amount: number;
}

export interface TriggeredEventSlot {
  slotNumber: number;
  triggerAtRemaining: number;
  title: string;
  description?: string;
  questCode?: string;
  grantsStateTag?: string;
  targetQuestId?: string;
}

export interface EvaluatedCampaignState {
  activeStateTags: Set<string>;
  questStatuses: Record<string, QuestSimStatus>;
  activeVariantsByQuest: Record<string, QuestVariantOverride[]>;
  activeEdgeIds: Set<string>;
  lockedOutQuests: Set<string>;
  timeConsumed: number;
  timeLimit: number;
  timeRemaining: number;
  totalTimeElapsed: number; // backward compatibility alias for timeConsumed
  timeContributors: TimeTrackContributor[];
  triggeredEventSlots: TriggeredEventSlot[];
  scenarioEndTriggered: boolean;
  scenarioEndQuestUid?: string;
}

export function evaluateCampaignSimulation(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  selectedRewardOutcomeIds: string[],
  completedQuestIds: string[],
  customTags: string[] = [],
  manualTimeOffset: number = 0
): EvaluatedCampaignState {
  const activeTags = new Set<string>(customTags);
  const completedSet = new Set<string>(completedQuestIds);
  const selectedRewardsSet = new Set<string>(selectedRewardOutcomeIds);
  const timeContributors: TimeTrackContributor[] = [];

  // Determine track time limit from exploration configs or default to 8
  let timeLimit = 8;
  let scenarioEndQuestUid: string | undefined = undefined;
  let autoLockoutStageOnEnd = true;

  Object.values(quests).forEach((q) => {
    if (q.explorationConfig) {
      if (q.explorationConfig.trackLength && q.explorationConfig.trackLength > timeLimit) {
        timeLimit = q.explorationConfig.trackLength;
      }
      if (q.explorationConfig.scenarioEndQuestId) {
        scenarioEndQuestUid = q.explorationConfig.scenarioEndQuestId;
      }
      if (q.explorationConfig.autoLockoutStageOnEnd !== undefined) {
        autoLockoutStageOnEnd = q.explorationConfig.autoLockoutStageOnEnd;
      }
    }
  });

  // Calculate consumed time
  let timeConsumed = manualTimeOffset;

  // 1. Time from completed quests base duration
  completedSet.forEach((uid) => {
    const q = quests[uid];
    if (q && q.timeAdvance && q.timeAdvance > 0) {
      timeConsumed += q.timeAdvance;
      timeContributors.push({
        questUid: q.uid,
        questCode: q.code,
        questTitle: q.title,
        source: 'QUEST',
        label: 'Base Exploration Cost',
        amount: q.timeAdvance
      });
    }
  });

  // 2. Accumulate state tags & time from reward outcomes on completed quests / selected choices
  Object.values(quests).forEach((quest) => {
    quest.rewardOutcomes.forEach((reward) => {
      if (
        selectedRewardsSet.has(reward.id) ||
        (!reward.isExclusiveChoice && completedSet.has(quest.uid))
      ) {
        reward.grantsStateTags.forEach((tag) => activeTags.add(tag));

        if (reward.timeAdvance && reward.timeAdvance > 0) {
          timeConsumed += reward.timeAdvance;
          timeContributors.push({
            questUid: quest.uid,
            questCode: quest.code,
            questTitle: quest.title,
            source: 'CHOICE',
            label: reward.label,
            amount: reward.timeAdvance
          });
        }
      }
    });
  });

  // Countdown time remaining
  const timeRemaining = Math.max(0, timeLimit - timeConsumed);

  // 3. Evaluate Triggered Event Slots from exploration quests
  const triggeredEventSlots: TriggeredEventSlot[] = [];
  const timeTriggeredQuestUids = new Set<string>();
  const seenEventKeys = new Set<string>();

  Object.values(quests).forEach((quest) => {
    if (quest.explorationConfig?.eventSlots) {
      quest.explorationConfig.eventSlots.forEach((slot) => {
        // Triggers if timeRemaining <= triggerAtRemaining (or if legacy slotNumber passed)
        const threshold = slot.triggerAtRemaining !== undefined ? slot.triggerAtRemaining : Math.max(0, timeLimit - slot.slotNumber);
        const isTriggered = timeRemaining <= threshold;

        if (isTriggered) {
          const key = `${quest.code}_slot_${slot.slotNumber}`;
          if (!seenEventKeys.has(key)) {
            seenEventKeys.add(key);
            triggeredEventSlots.push({
              slotNumber: slot.slotNumber,
              triggerAtRemaining: threshold,
              title: slot.title,
              description: slot.description,
              questCode: quest.code,
              grantsStateTag: slot.grantsStateTag,
              targetQuestId: slot.targetQuestId
            });
            if (slot.grantsStateTag) {
              activeTags.add(slot.grantsStateTag);
            }
            if (slot.targetQuestId) {
              timeTriggeredQuestUids.add(slot.targetQuestId);
            }
          }
        }
      });
    }
  });

  // Check TIME_TRIGGER and TIME_EXPIRED edges
  edges.forEach((edge) => {
    if (edge.type === 'TIME_EXPIRED' && timeRemaining <= 0) {
      timeTriggeredQuestUids.add(edge.target);
      if (!scenarioEndQuestUid) scenarioEndQuestUid = edge.target;
    } else if (edge.type === 'TIME_TRIGGER') {
      // Look for custom threshold in edge label e.g. "≤4" or default to trigger
      const match = edge.label?.match(/<=?(\d+)/);
      const thresh = match ? parseInt(match[1], 10) : 0;
      if (timeRemaining <= thresh) {
        timeTriggeredQuestUids.add(edge.target);
      }
    }
  });

  // Check if scenario end is triggered
  const isTimeRanOut = timeRemaining <= 0;
  const isScenarioEndCompleted = Boolean(scenarioEndQuestUid && completedSet.has(scenarioEndQuestUid));
  const scenarioEndTriggered = isTimeRanOut || isScenarioEndCompleted || (scenarioEndQuestUid ? timeTriggeredQuestUids.has(scenarioEndQuestUid) : false);

  // 4. Identify Lockouts
  const lockedOutQuests = new Set<string>();

  // A. Explicit lockout edges
  edges
    .filter((e) => e.type === 'LOCKOUT')
    .forEach((e) => {
      if (completedSet.has(e.source)) {
        lockedOutQuests.add(e.target);
      }
      if (completedSet.has(e.target)) {
        lockedOutQuests.add(e.source);
      }
    });

  // B. Automatic Stage Lockout when Scenario Ends
  if (scenarioEndTriggered && autoLockoutStageOnEnd) {
    Object.values(quests).forEach((q) => {
      // If it's an exploration quest, not completed, and not the scenario end quest itself
      const isExplorationTask = q.isExplorationStage || q.category === 'EXPLORATION';
      const isScenarioEndNode = q.uid === scenarioEndQuestUid || timeTriggeredQuestUids.has(q.uid) || q.category === 'BOSS';

      if (isExplorationTask && !isScenarioEndNode && !completedSet.has(q.uid)) {
        lockedOutQuests.add(q.uid);
      }
    });
  }

  // 5. Evaluate quest statuses
  const questStatuses: Record<string, QuestSimStatus> = {};

  Object.values(quests).forEach((quest) => {
    if (lockedOutQuests.has(quest.uid)) {
      questStatuses[quest.uid] = 'LOCKED_OUT';
      return;
    }

    if (completedSet.has(quest.uid)) {
      questStatuses[quest.uid] = 'COMPLETED';
      return;
    }

    // Direct Time Trigger unlock
    if (timeTriggeredQuestUids.has(quest.uid)) {
      questStatuses[quest.uid] = 'AVAILABLE';
      return;
    }

    if (quest.prereqLogic === 'START') {
      questStatuses[quest.uid] = 'AVAILABLE';
      return;
    }

    // Required Tag check (e.g. Idol_Kept)
    if (quest.requiredTag && !activeTags.has(quest.requiredTag)) {
      questStatuses[quest.uid] = 'LOCKED';
      return;
    }

    // Incoming unlocking edges
    const incomingUnlocks = edges.filter(
      (e) =>
        e.target === quest.uid &&
        (e.type === 'UNLOCKS' || e.type === 'CHOICE_BRANCH' || e.type === 'TIME_TRIGGER' || e.type === 'TIME_EXPIRED')
    );

    if (incomingUnlocks.length === 0) {
      questStatuses[quest.uid] = 'AVAILABLE';
      return;
    }

    const isPrereqSatisfied = (edge: CampaignEdge): boolean => {
      if (edge.type === 'TIME_EXPIRED') {
        return timeRemaining <= 0;
      }
      if (edge.type === 'TIME_TRIGGER') {
        const match = edge.label?.match(/<=?(\d+)/);
        const thresh = match ? parseInt(match[1], 10) : 0;
        return timeRemaining <= thresh;
      }

      const sourceCompleted = completedSet.has(edge.source);
      if (!sourceCompleted) return false;

      // If tied to a specific reward outcome, that reward must be selected or active
      if (edge.sourcePortId) {
        const sourceQuest = quests[edge.source];
        const reward = sourceQuest?.rewardOutcomes.find((r) => r.id === edge.sourcePortId);
        if (reward?.isExclusiveChoice) {
          return selectedRewardsSet.has(edge.sourcePortId);
        }
      }
      return true;
    };

    if (quest.prereqLogic === 'ALL') {
      const allPassed = incomingUnlocks.every(isPrereqSatisfied);
      questStatuses[quest.uid] = allPassed ? 'AVAILABLE' : 'LOCKED';
    } else {
      // 'ANY' / OR logic gate
      const anyPassed = incomingUnlocks.some(isPrereqSatisfied);
      questStatuses[quest.uid] = anyPassed ? 'AVAILABLE' : 'LOCKED';
    }
  });

  // 6. Resolve active variants per quest based on accumulated tags
  const activeVariantsByQuest: Record<string, QuestVariantOverride[]> = {};
  Object.values(quests).forEach((quest) => {
    const matchingVariants = quest.variants.filter((variant) =>
      activeTags.has(variant.requiredStateTag)
    );
    activeVariantsByQuest[quest.uid] = matchingVariants;
  });

  // 7. Active Edges for visual glow / animated particles
  const activeEdgeIds = new Set<string>();
  edges.forEach((edge) => {
    if (edge.type === 'MUTATION') {
      if (edge.stateTag && activeTags.has(edge.stateTag)) {
        activeEdgeIds.add(edge.id);
      }
    } else if (edge.type === 'LOCKOUT') {
      if (completedSet.has(edge.source) || completedSet.has(edge.target)) {
        activeEdgeIds.add(edge.id);
      }
    } else if (edge.type === 'TIME_EXPIRED') {
      if (timeRemaining <= 0) {
        activeEdgeIds.add(edge.id);
      }
    } else if (edge.type === 'TIME_TRIGGER') {
      const match = edge.label?.match(/<=?(\d+)/);
      const thresh = match ? parseInt(match[1], 10) : 0;
      if (timeRemaining <= thresh) {
        activeEdgeIds.add(edge.id);
      }
    } else {
      const srcStatus = questStatuses[edge.source];
      if (srcStatus === 'COMPLETED') {
        if (!edge.sourcePortId || selectedRewardsSet.has(edge.sourcePortId)) {
          activeEdgeIds.add(edge.id);
        }
      }
    }
  });

  return {
    activeStateTags: activeTags,
    questStatuses,
    activeVariantsByQuest,
    activeEdgeIds,
    lockedOutQuests,
    timeConsumed,
    timeLimit,
    timeRemaining,
    totalTimeElapsed: timeConsumed,
    timeContributors,
    triggeredEventSlots,
    scenarioEndTriggered,
    scenarioEndQuestUid
  };
}
