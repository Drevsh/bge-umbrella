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

export interface ActTimeTrackState {
  actId: number;
  timeLimit: number;
  timeConsumed: number;
  timeRemaining: number;
  timeContributors: TimeTrackContributor[];
  triggeredEventSlots: TriggeredEventSlot[];
  scenarioEndTriggered: boolean;
  scenarioEndQuestUid?: string;
  autoLockoutStageOnEnd: boolean;
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
  timeTrackByAct: Record<number, ActTimeTrackState>;
}

export function evaluateCampaignSimulation(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  selectedRewardOutcomeIds: string[],
  completedQuestIds: string[],
  customTags: string[] = [],
  manualTimeOffset: number = 0,
  targetActId: number | 'ALL' = 'ALL'
): EvaluatedCampaignState {
  const activeTags = new Set<string>(customTags);
  const completedSet = new Set<string>(completedQuestIds);
  const selectedRewardsSet = new Set<string>(selectedRewardOutcomeIds);

  // 1. Accumulate state tags from reward outcomes across all completed quests / selected choices
  Object.values(quests).forEach((quest) => {
    quest.rewardOutcomes.forEach((reward) => {
      if (
        selectedRewardsSet.has(reward.id) ||
        (!reward.isExclusiveChoice && completedSet.has(quest.uid))
      ) {
        reward.grantsStateTags.forEach((tag) => activeTags.add(tag));
      }
    });
  });

  // 2. Identify all Acts present in the campaign
  const allQuestsList = Object.values(quests);
  const actsPresentSet = new Set<number>();
  allQuestsList.forEach((q) => actsPresentSet.add(q.act || 1));
  const actsPresent = Array.from(actsPresentSet).sort((a, b) => a - b);
  if (actsPresent.length === 0) actsPresent.push(1);

  // 3. Compute independent Time Tracks per Act/Chapter
  const timeTrackByAct: Record<number, ActTimeTrackState> = {};
  const timeTriggeredQuestUids = new Set<string>();

  actsPresent.forEach((actId) => {
    const actQuests = allQuestsList.filter((q) => (q.act || 1) === actId);

    let actTimeLimit = 8;
    let actScenarioEndQuestUid: string | undefined = undefined;
    let actAutoLockout = true;

    actQuests.forEach((q) => {
      if (q.explorationConfig) {
        if (q.explorationConfig.trackLength && q.explorationConfig.trackLength > actTimeLimit) {
          actTimeLimit = q.explorationConfig.trackLength;
        }
        if (q.explorationConfig.scenarioEndQuestId) {
          actScenarioEndQuestUid = q.explorationConfig.scenarioEndQuestId;
        }
        if (q.explorationConfig.autoLockoutStageOnEnd !== undefined) {
          actAutoLockout = q.explorationConfig.autoLockoutStageOnEnd;
        }
      }
    });

    // Time consumed in this specific Act (manualTimeOffset applies to target Act or first Act)
    const isTargetedAct = targetActId === actId || (targetActId === 'ALL' && actId === actsPresent[0]);
    let actTimeConsumed = isTargetedAct ? manualTimeOffset : 0;
    const actTimeContributors: TimeTrackContributor[] = [];

    // Base time costs and choice time advances from quests in THIS Act only
    actQuests.forEach((q) => {
      if (completedSet.has(q.uid) && q.timeAdvance && q.timeAdvance > 0) {
        actTimeConsumed += q.timeAdvance;
        actTimeContributors.push({
          questUid: q.uid,
          questCode: q.code,
          questTitle: q.title,
          source: 'QUEST',
          label: 'Base Exploration Cost',
          amount: q.timeAdvance
        });
      }

      q.rewardOutcomes.forEach((reward) => {
        if (
          (selectedRewardsSet.has(reward.id) || (!reward.isExclusiveChoice && completedSet.has(q.uid))) &&
          reward.timeAdvance &&
          reward.timeAdvance > 0
        ) {
          actTimeConsumed += reward.timeAdvance;
          actTimeContributors.push({
            questUid: q.uid,
            questCode: q.code,
            questTitle: q.title,
            source: 'CHOICE',
            label: reward.label,
            amount: reward.timeAdvance
          });
        }
      });
    });

    const actTimeRemaining = Math.max(0, actTimeLimit - actTimeConsumed);
    const actTriggeredEventSlots: TriggeredEventSlot[] = [];
    const seenEventKeys = new Set<string>();

    actQuests.forEach((quest) => {
      if (quest.explorationConfig?.eventSlots) {
        quest.explorationConfig.eventSlots.forEach((slot) => {
          const threshold =
            slot.triggerAtRemaining !== undefined
              ? slot.triggerAtRemaining
              : Math.max(0, actTimeLimit - slot.slotNumber);
          const isTriggered = actTimeRemaining <= threshold;

          if (isTriggered) {
            const key = `${quest.code}_slot_${slot.slotNumber}`;
            if (!seenEventKeys.has(key)) {
              seenEventKeys.add(key);
              actTriggeredEventSlots.push({
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

    // Check Act-specific TIME_EXPIRED and TIME_TRIGGER edges
    edges.forEach((edge) => {
      const srcQuest = quests[edge.source];
      const tgtQuest = quests[edge.target];
      const edgeAct = srcQuest?.act || tgtQuest?.act || 1;
      if (edgeAct === actId) {
        if (edge.type === 'TIME_EXPIRED' && actTimeRemaining <= 0) {
          timeTriggeredQuestUids.add(edge.target);
          if (!actScenarioEndQuestUid) actScenarioEndQuestUid = edge.target;
        } else if (edge.type === 'TIME_TRIGGER') {
          const match = edge.label?.match(/<=?(\d+)/);
          const thresh = match ? parseInt(match[1], 10) : 0;
          if (actTimeRemaining <= thresh) {
            timeTriggeredQuestUids.add(edge.target);
          }
        }
      }
    });

    const isTimeRanOut = actTimeRemaining <= 0;
    const isScenarioEndCompleted = Boolean(
      actScenarioEndQuestUid && completedSet.has(actScenarioEndQuestUid)
    );
    const actScenarioEndTriggered =
      isTimeRanOut ||
      isScenarioEndCompleted ||
      (actScenarioEndQuestUid ? timeTriggeredQuestUids.has(actScenarioEndQuestUid) : false);

    timeTrackByAct[actId] = {
      actId,
      timeLimit: actTimeLimit,
      timeConsumed: actTimeConsumed,
      timeRemaining: actTimeRemaining,
      timeContributors: actTimeContributors,
      triggeredEventSlots: actTriggeredEventSlots,
      scenarioEndTriggered: actScenarioEndTriggered,
      scenarioEndQuestUid: actScenarioEndQuestUid,
      autoLockoutStageOnEnd: actAutoLockout
    };
  });

  // Determine which Act's metrics to surface at the root for HUD & backward compatibility
  let focusedActId = actsPresent[0] || 1;
  if (typeof targetActId === 'number' && timeTrackByAct[targetActId]) {
    focusedActId = targetActId;
  } else {
    const actWithExploration = actsPresent.find((act) =>
      allQuestsList.some(
        (q) =>
          (q.act || 1) === act &&
          (q.isExplorationStage || q.category === 'EXPLORATION' || q.explorationConfig)
      )
    );
    if (actWithExploration) focusedActId = actWithExploration;
  }

  const focusedTrack = timeTrackByAct[focusedActId] || {
    actId: focusedActId,
    timeLimit: 8,
    timeConsumed: 0,
    timeRemaining: 8,
    timeContributors: [],
    triggeredEventSlots: [],
    scenarioEndTriggered: false,
    autoLockoutStageOnEnd: true
  };

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

  // B. Automatic Stage Lockout when Scenario Ends (Scoped strictly per Act!)
  actsPresent.forEach((actId) => {
    const actTrack = timeTrackByAct[actId];
    if (actTrack && actTrack.scenarioEndTriggered && actTrack.autoLockoutStageOnEnd) {
      const actQuests = allQuestsList.filter((q) => (q.act || 1) === actId);
      actQuests.forEach((q) => {
        const isExplorationTask = q.isExplorationStage || q.category === 'EXPLORATION';
        const isScenarioEndNode =
          q.uid === actTrack.scenarioEndQuestUid ||
          timeTriggeredQuestUids.has(q.uid) ||
          q.category === 'BOSS';

        if (isExplorationTask && !isScenarioEndNode && !completedSet.has(q.uid)) {
          lockedOutQuests.add(q.uid);
        }
      });
    }
  });

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
      const srcQuest = quests[edge.source];
      const edgeAct = srcQuest?.act || quest.act || 1;
      const actTimeRemaining = timeTrackByAct[edgeAct]?.timeRemaining ?? focusedTrack.timeRemaining;

      if (edge.type === 'TIME_EXPIRED') {
        return actTimeRemaining <= 0;
      }
      if (edge.type === 'TIME_TRIGGER') {
        const match = edge.label?.match(/<=?(\d+)/);
        const thresh = match ? parseInt(match[1], 10) : 0;
        return actTimeRemaining <= thresh;
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
    const srcQuest = quests[edge.source];
    const tgtQuest = quests[edge.target];
    const edgeAct = srcQuest?.act || tgtQuest?.act || 1;
    const edgeActTimeRemaining = timeTrackByAct[edgeAct]?.timeRemaining ?? focusedTrack.timeRemaining;

    if (edge.type === 'MUTATION') {
      if (edge.stateTag && activeTags.has(edge.stateTag)) {
        activeEdgeIds.add(edge.id);
      }
    } else if (edge.type === 'LOCKOUT') {
      if (completedSet.has(edge.source) || completedSet.has(edge.target)) {
        activeEdgeIds.add(edge.id);
      }
    } else if (edge.type === 'TIME_EXPIRED') {
      if (edgeActTimeRemaining <= 0) {
        activeEdgeIds.add(edge.id);
      }
    } else if (edge.type === 'TIME_TRIGGER') {
      const match = edge.label?.match(/<=?(\d+)/);
      const thresh = match ? parseInt(match[1], 10) : 0;
      if (edgeActTimeRemaining <= thresh) {
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
    timeConsumed: focusedTrack.timeConsumed,
    timeLimit: focusedTrack.timeLimit,
    timeRemaining: focusedTrack.timeRemaining,
    totalTimeElapsed: focusedTrack.timeConsumed,
    timeContributors: focusedTrack.timeContributors,
    triggeredEventSlots: focusedTrack.triggeredEventSlots,
    scenarioEndTriggered: focusedTrack.scenarioEndTriggered,
    scenarioEndQuestUid: focusedTrack.scenarioEndQuestUid,
    timeTrackByAct
  };
}
