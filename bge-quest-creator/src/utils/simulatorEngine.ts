import { QuestModel, CampaignEdge, QuestVariantOverride } from '../types/campaign';

export type QuestSimStatus = 'START' | 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'LOCKED_OUT';

export interface EvaluatedCampaignState {
  activeStateTags: Set<string>;
  questStatuses: Record<string, QuestSimStatus>;
  activeVariantsByQuest: Record<string, QuestVariantOverride[]>;
  activeEdgeIds: Set<string>;
  lockedOutQuests: Set<string>;
}

export function evaluateCampaignSimulation(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  selectedRewardOutcomeIds: string[],
  completedQuestIds: string[],
  customTags: string[] = []
): EvaluatedCampaignState {
  const activeTags = new Set<string>(customTags);
  const completedSet = new Set<string>(completedQuestIds);
  const selectedRewardsSet = new Set<string>(selectedRewardOutcomeIds);

  // 1. Accumulate state tags from all selected reward outcomes on completed quests
  Object.values(quests).forEach((quest) => {
    quest.rewardOutcomes.forEach((reward) => {
      // If reward is selected OR (quest is completed and reward is an "always" reward)
      if (
        selectedRewardsSet.has(reward.id) ||
        (!reward.isExclusiveChoice && completedSet.has(quest.uid))
      ) {
        reward.grantsStateTags.forEach((tag) => activeTags.add(tag));
      }
    });
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
    lockedOutQuests
  };
}
