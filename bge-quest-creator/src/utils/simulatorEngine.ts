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
  title: string;
  description?: string;
  questCode?: string;
  grantsStateTag?: string;
}

export interface EvaluatedCampaignState {
  activeStateTags: Set<string>;
  questStatuses: Record<string, QuestSimStatus>;
  activeVariantsByQuest: Record<string, QuestVariantOverride[]>;
  activeEdgeIds: Set<string>;
  lockedOutQuests: Set<string>;
  totalTimeElapsed: number;
  timeContributors: TimeTrackContributor[];
  triggeredEventSlots: TriggeredEventSlot[];
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

  let totalTime = manualTimeOffset;

  // 1. Calculate time from completed quests base duration
  completedSet.forEach((uid) => {
    const q = quests[uid];
    if (q && q.timeAdvance && q.timeAdvance > 0) {
      totalTime += q.timeAdvance;
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
      // If reward is selected OR (quest is completed and reward is an "always" reward)
      if (
        selectedRewardsSet.has(reward.id) ||
        (!reward.isExclusiveChoice && completedSet.has(quest.uid))
      ) {
        reward.grantsStateTags.forEach((tag) => activeTags.add(tag));

        if (reward.timeAdvance && reward.timeAdvance > 0) {
          totalTime += reward.timeAdvance;
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

  // 3. Evaluate Triggered Event Slots from exploration quests
  const triggeredEventSlots: TriggeredEventSlot[] = [];
  const seenEventKeys = new Set<string>();

  Object.values(quests).forEach((quest) => {
    if (quest.explorationConfig?.eventSlots) {
      quest.explorationConfig.eventSlots.forEach((slot) => {
        if (totalTime >= slot.slotNumber) {
          const key = `${quest.code}_slot_${slot.slotNumber}`;
          if (!seenEventKeys.has(key)) {
            seenEventKeys.add(key);
            triggeredEventSlots.push({
              slotNumber: slot.slotNumber,
              title: slot.title,
              description: slot.description,
              questCode: quest.code,
              grantsStateTag: slot.grantsStateTag
            });
            if (slot.grantsStateTag) {
              activeTags.add(slot.grantsStateTag);
            }
          }
        }
      });
    }
  });

  // 2. Identify Lockouts
  const lockedOutQuests = new Set<string>();
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

  // 3. Evaluate quest statuses
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
      (e) => e.target === quest.uid && (e.type === 'UNLOCKS' || e.type === 'CHOICE_BRANCH')
    );

    if (incomingUnlocks.length === 0) {
      questStatuses[quest.uid] = 'AVAILABLE';
      return;
    }

    const isPrereqSatisfied = (edge: CampaignEdge): boolean => {
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

  // 4. Resolve active variants per quest based on accumulated tags
  const activeVariantsByQuest: Record<string, QuestVariantOverride[]> = {};
  Object.values(quests).forEach((quest) => {
    const matchingVariants = quest.variants.filter((variant) =>
      activeTags.has(variant.requiredStateTag)
    );
    activeVariantsByQuest[quest.uid] = matchingVariants;
  });

  // 5. Active Edges for visual glow / animated particles
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
    totalTimeElapsed: totalTime,
    timeContributors,
    triggeredEventSlots
  };
}
