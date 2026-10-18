import dagre from '@dagrejs/dagre';
import { QuestModel, CampaignEdge, RewardOutcome } from '../types/campaign';

export interface LayoutOptions {
  hSpacing: 'COMPACT' | 'BALANCED' | 'WIDE';
  vScale: number;
  reorderChoices?: boolean;
}

export interface AutoArrangeResult {
  positions: Record<string, { x: number; y: number }>;
  reorderedChoices: Record<string, RewardOutcome[]>;
}

const H_SPACING_VALUES = {
  COMPACT: 360,
  BALANCED: 440,
  WIDE: 540
};

export const DEFAULT_NODE_WIDTH = 280;
export const DEFAULT_INPUT_HANDLE_Y = 38;

/**
 * Estimates node height based on header, active variants, and outcomes list.
 */
export function estimateNodeHeight(quest: QuestModel): number {
  const headerHeight = 106;
  const variantHeight = quest.variants && quest.variants.length > 0 ? 28 : 0;
  const outcomesCount = quest.rewardOutcomes ? quest.rewardOutcomes.length : 0;
  const outcomesHeaderHeight = 32;
  const outcomesListHeight = outcomesCount > 0 ? outcomesCount * 36 : 16;
  return headerHeight + variantHeight + outcomesHeaderHeight + outcomesListHeight + 14;
}

/**
 * Calculates vertical offset of a specific outcome's right handle within the node card.
 */
export function getOutcomeHandleYOffset(quest: QuestModel, outcomeIndex: number): number {
  const headerHeight = 106;
  const variantHeight = quest.variants && quest.variants.length > 0 ? 28 : 0;
  const outcomesTop = headerHeight + variantHeight + 32;
  return outcomesTop + outcomeIndex * 36 + 18;
}

/**
 * Advanced Port-Aware Tiered Sugiyama Auto-Arrangement.
 *
 * 1. Groups strictly by quest.tier (Progression Columns).
 * 2. Filters out LOCKOUT edges from driving primary layout.
 * 3. Sweeps iteratively (forward & backward) using barycentric crossing minimization.
 * 4. Optimizes intra-node choice order (`rewardOutcomes`) so output handles point
 *    directly towards the vertical positions of their target quests.
 * 5. Straightens connections by aligning source outcome handle Y with target input handle Y.
 * 6. Enforces non-overlap bounding boxes and neatly docks unconnected side quests.
 */
export function calculateAutoArrangement(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  options: LayoutOptions
): AutoArrangeResult {
  const hGap = H_SPACING_VALUES[options.hSpacing] || 440;
  const vGap = Math.max(28, Math.round(50 * options.vScale));
  const shouldReorderChoices = options.reorderChoices ?? true;

  // 1. Group quests by explicit tier
  const tierBuckets: Record<number, QuestModel[]> = {};
  Object.values(quests).forEach((quest) => {
    const tier = quest.tier || 1;
    if (!tierBuckets[tier]) tierBuckets[tier] = [];
    tierBuckets[tier].push(quest);
  });

  const sortedTiers = Object.keys(tierBuckets)
    .map(Number)
    .sort((a, b) => a - b);

  // Filter progression edges (ignore LOCKOUT edges during layout)
  const progressionEdges = edges.filter((e) => e.type !== 'LOCKOUT');

  // Adjacency maps
  const outgoingMap: Record<
    string,
    Array<{ target: string; sourcePortId: string | null; type: string }>
  > = {};
  const incomingMap: Record<
    string,
    Array<{ source: string; sourcePortId: string | null; type: string }>
  > = {};

  Object.values(quests).forEach((q) => {
    outgoingMap[q.uid] = [];
    incomingMap[q.uid] = [];
  });

  progressionEdges.forEach((e) => {
    if (outgoingMap[e.source]) {
      outgoingMap[e.source].push({ target: e.target, sourcePortId: e.sourcePortId, type: e.type });
    }
    if (incomingMap[e.target]) {
      incomingMap[e.target].push({ source: e.source, sourcePortId: e.sourcePortId, type: e.type });
    }
  });

  // Working copy of reward outcomes for reordering
  const workingChoices: Record<string, RewardOutcome[]> = {};
  Object.values(quests).forEach((q) => {
    workingChoices[q.uid] = [...(q.rewardOutcomes || [])];
  });

  // Track vertical orders of quests in each tier
  const tierOrder: Record<number, string[]> = {};
  sortedTiers.forEach((tier) => {
    const nodes = [...tierBuckets[tier]];
    // Initial sort: parentSlot, start quests first, then code
    nodes.sort((a, b) => {
      if (a.prereqLogic === 'START' && b.prereqLogic !== 'START') return -1;
      if (b.prereqLogic === 'START' && a.prereqLogic !== 'START') return 1;
      if (a.parentSlot && b.parentSlot) return a.parentSlot.localeCompare(b.parentSlot);
      if (a.parentSlot) return -1;
      if (b.parentSlot) return 1;
      return a.code.localeCompare(b.code);
    });
    tierOrder[tier] = nodes.map((n) => n.uid);
  });

  // Reorder choices inside a quest to match the vertical rank of target nodes
  const reorderNodeChoices = (questUid: string) => {
    if (!shouldReorderChoices) return;
    const quest = quests[questUid];
    if (!quest || !workingChoices[questUid] || workingChoices[questUid].length <= 1) return;

    const outcomes = workingChoices[questUid];
    const outcomesWithRank = outcomes.map((outcome, origIdx) => {
      const outEdges = outgoingMap[questUid].filter((e) => e.sourcePortId === outcome.id);
      if (outEdges.length === 0) {
        // Untargeted outcome: retain original position bias
        return { outcome, origIdx, rank: origIdx + 0.5 };
      }

      // Compute average target rank in their respective tiers
      let rankSum = 0;
      let count = 0;
      outEdges.forEach((edge) => {
        const targetQuest = quests[edge.target];
        if (targetQuest) {
          const tTier = targetQuest.tier || 1;
          const orderInTier = tierOrder[tTier] || [];
          const idx = orderInTier.indexOf(edge.target);
          if (idx !== -1) {
            rankSum += idx;
            count++;
          }
        }
      });

      const avgRank = count > 0 ? rankSum / count : origIdx;
      return { outcome, origIdx, rank: avgRank };
    });

    outcomesWithRank.sort((a, b) => {
      if (Math.abs(a.rank - b.rank) > 0.001) return a.rank - b.rank;
      return a.origIdx - b.origIdx;
    });

    workingChoices[questUid] = outcomesWithRank.map((o) => o.outcome);
  };

  // 2. Multi-Pass Barycentric Sweep (Crossing Reduction)
  const SWEEP_ITERATIONS = 4;
  for (let iter = 0; iter < SWEEP_ITERATIONS; iter++) {
    // Forward sweep (Tiers 1 -> N)
    for (let tIdx = 0; tIdx < sortedTiers.length; tIdx++) {
      const tier = sortedTiers[tIdx];
      const uids = tierOrder[tier];

      if (tIdx > 0) {
        // Sort nodes in this tier based on incoming edges from previous tiers
        const scored = uids.map((uid, origIdx) => {
          const inEdges = incomingMap[uid].filter((e) => {
            const srcQuest = quests[e.source];
            return srcQuest && (srcQuest.tier || 1) < tier;
          });

          if (inEdges.length === 0) {
            // Unconnected or root in this tier: place toward bottom or keep stable
            return { uid, origIdx, score: 9999 + origIdx };
          }

          let scoreSum = 0;
          inEdges.forEach((edge) => {
            const srcQuest = quests[edge.source];
            const srcTier = srcQuest.tier || 1;
            const srcOrder = tierOrder[srcTier] || [];
            const srcIndex = srcOrder.indexOf(edge.source);

            // Compute port fractional offset
            const choices = workingChoices[edge.source] || [];
            const portIdx = choices.findIndex((c) => c.id === edge.sourcePortId);
            const portFraction = choices.length > 0 && portIdx >= 0 ? (portIdx + 0.5) / choices.length : 0.5;

            scoreSum += (srcIndex >= 0 ? srcIndex : 0) + portFraction;
          });

          return { uid, origIdx, score: scoreSum / inEdges.length };
        });

        scored.sort((a, b) => {
          if (Math.abs(a.score - b.score) > 0.001) return a.score - b.score;
          return a.origIdx - b.origIdx;
        });

        tierOrder[tier] = scored.map((s) => s.uid);
      }

      // Reorder choices in this tier based on downstream targets
      uids.forEach((uid) => reorderNodeChoices(uid));
    }

    // Backward sweep (Tiers N -> 1)
    for (let tIdx = sortedTiers.length - 1; tIdx >= 0; tIdx--) {
      const tier = sortedTiers[tIdx];
      const uids = tierOrder[tier];

      if (tIdx < sortedTiers.length - 1) {
        const scored = uids.map((uid, origIdx) => {
          const outEdges = outgoingMap[uid].filter((e) => {
            const tgtQuest = quests[e.target];
            return tgtQuest && (tgtQuest.tier || 1) > tier;
          });

          if (outEdges.length === 0) {
            return { uid, origIdx, score: 9999 + origIdx };
          }

          let scoreSum = 0;
          outEdges.forEach((edge) => {
            const tgtQuest = quests[edge.target];
            const tgtTier = tgtQuest.tier || 1;
            const tgtOrder = tierOrder[tgtTier] || [];
            const tgtIndex = tgtOrder.indexOf(edge.target);
            scoreSum += tgtIndex >= 0 ? tgtIndex : 0;
          });

          return { uid, origIdx, score: scoreSum / outEdges.length };
        });

        scored.sort((a, b) => {
          if (Math.abs(a.score - b.score) > 0.001) return a.score - b.score;
          return a.origIdx - b.origIdx;
        });

        tierOrder[tier] = scored.map((s) => s.uid);
      }

      // Reorder choices in this tier again
      uids.forEach((uid) => reorderNodeChoices(uid));
    }
  }

  // 3. Coordinate Assignment: Straight-line Y alignment with non-overlap
  const newPositions: Record<string, { x: number; y: number }> = {};
  const startX = 60;
  const startY = 80;

  // Track assigned node bounds: uid -> { top, bottom, height }
  const nodeBounds: Record<string, { top: number; bottom: number; height: number }> = {};

  sortedTiers.forEach((tier, tierIndex) => {
    const colX = startX + tierIndex * hGap;
    const uids = tierOrder[tier];

    // Compute ideal Y positions
    const idealYMap: Record<string, number> = {};

    uids.forEach((uid) => {
      const quest = quests[uid];
      const inEdges = incomingMap[uid].filter((e) => {
        const srcQuest = quests[e.source];
        return srcQuest && (srcQuest.tier || 1) < tier && nodeBounds[e.source];
      });

      if (inEdges.length === 0) {
        // No incoming progression edges from prior tiers: default undefined
        idealYMap[uid] = -1;
      } else {
        // Align target input handle (top: 38px) with source outcome handle
        let sumIdealY = 0;
        inEdges.forEach((edge) => {
          const srcQuest = quests[edge.source];
          const srcPos = newPositions[edge.source];
          const srcChoices = workingChoices[edge.source] || [];
          const outcomeIdx = srcChoices.findIndex((c) => c.id === edge.sourcePortId);
          const handleOffset =
            outcomeIdx >= 0 ? getOutcomeHandleYOffset(srcQuest, outcomeIdx) : 50;

          // Target input handle is at Y + DEFAULT_INPUT_HANDLE_Y
          // Source handle is at srcPos.y + handleOffset
          // Setting targetPos.y + DEFAULT_INPUT_HANDLE_Y = srcPos.y + handleOffset
          // => targetPos.y = srcPos.y + handleOffset - DEFAULT_INPUT_HANDLE_Y
          const targetY = srcPos.y + handleOffset - DEFAULT_INPUT_HANDLE_Y;
          sumIdealY += targetY;
        });

        idealYMap[uid] = Math.round(sumIdealY / inEdges.length);
      }
    });

    // Partition into connected nodes and unconnected/side nodes
    const connectedUids = uids.filter((uid) => idealYMap[uid] !== -1);
    const unconnectedUids = uids.filter((uid) => idealYMap[uid] === -1);

    // Sort connected nodes by idealY
    connectedUids.sort((a, b) => idealYMap[a] - idealYMap[b]);

    // Position connected nodes with collision resolution (non-overlap)
    let currentY = startY;
    connectedUids.forEach((uid) => {
      const quest = quests[uid];
      const height = estimateNodeHeight(quest);
      const idealY = idealYMap[uid];

      const assignedY = Math.max(currentY, idealY);
      newPositions[uid] = { x: colX, y: assignedY };
      nodeBounds[uid] = { top: assignedY, bottom: assignedY + height, height };
      currentY = assignedY + height + vGap;
    });

    // Position unconnected / orphan nodes cleanly below
    if (unconnectedUids.length > 0) {
      if (connectedUids.length > 0) {
        currentY += Math.round(vGap * 0.5); // extra separation
      }
      unconnectedUids.forEach((uid) => {
        const quest = quests[uid];
        const height = estimateNodeHeight(quest);
        newPositions[uid] = { x: colX, y: currentY };
        nodeBounds[uid] = { top: currentY, bottom: currentY + height, height };
        currentY += height + vGap;
      });
    }
  });

  // 4. Centering Relaxation Pass (Align parents with bounding center of children)
  for (let tIdx = sortedTiers.length - 2; tIdx >= 0; tIdx--) {
    const tier = sortedTiers[tIdx];
    const uids = tierOrder[tier];

    for (let i = 0; i < uids.length; i++) {
      const uid = uids[i];
      const quest = quests[uid];
      const outEdges = outgoingMap[uid].filter((e) => {
        const tgtQuest = quests[e.target];
        return tgtQuest && (tgtQuest.tier || 1) === sortedTiers[tIdx + 1] && nodeBounds[e.target];
      });

      if (outEdges.length >= 2) {
        // Parent branches into 2 or more children
        const childTops = outEdges.map((e) => nodeBounds[e.target].top);
        const childBottoms = outEdges.map((e) => nodeBounds[e.target].bottom);
        const minChildTop = Math.min(...childTops);
        const maxChildBottom = Math.max(...childBottoms);
        const childrenCenterY = (minChildTop + maxChildBottom) / 2;

        const currentBounds = nodeBounds[uid];
        const desiredY = Math.round(childrenCenterY - currentBounds.height / 2);

        // Find sibling constraints in the same tier
        const prevUid = i > 0 ? uids[i - 1] : null;
        const nextUid = i < uids.length - 1 ? uids[i + 1] : null;

        const minY = prevUid ? nodeBounds[prevUid].bottom + vGap : startY;
        const maxY = nextUid ? nodeBounds[nextUid].top - currentBounds.height - vGap : 999999;

        if (minY <= maxY) {
          const clampedY = Math.max(minY, Math.min(maxY, desiredY));
          newPositions[uid].y = clampedY;
          nodeBounds[uid].top = clampedY;
          nodeBounds[uid].bottom = clampedY + currentBounds.height;
        }
      }
    }
  }

  // 5. Final pass for intra-node choice reordering based on final assigned positions
  if (shouldReorderChoices) {
    Object.keys(quests).forEach((uid) => {
      const quest = quests[uid];
      const outcomes = workingChoices[uid];
      if (!quest || !outcomes || outcomes.length <= 1) return;

      const outcomesWithFinalTargetY = outcomes.map((outcome, origIdx) => {
        const outEdges = outgoingMap[uid].filter((e) => e.sourcePortId === outcome.id);
        if (outEdges.length === 0) {
          return { outcome, origIdx, targetY: 99999 + origIdx };
        }
        let ySum = 0;
        outEdges.forEach((e) => {
          const tgtPos = newPositions[e.target];
          ySum += tgtPos ? tgtPos.y : 99999;
        });
        return { outcome, origIdx, targetY: ySum / outEdges.length };
      });

      outcomesWithFinalTargetY.sort((a, b) => {
        if (Math.abs(a.targetY - b.targetY) > 1) return a.targetY - b.targetY;
        return a.origIdx - b.origIdx;
      });

      workingChoices[uid] = outcomesWithFinalTargetY.map((o) => o.outcome);
    });
  }

  return {
    positions: newPositions,
    reorderedChoices: workingChoices
  };
}

/**
 * Legacy wrapper for calculateTierLayout to maintain backwards compatibility.
 */
export function calculateTierLayout(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  options: LayoutOptions
): Record<string, { x: number; y: number }> {
  return calculateAutoArrangement(quests, edges, options).positions;
}

/**
 * Fallback Dagre Layout for users who specifically request Dagre graphlib ranking.
 */
export function calculateDagreLayout(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  options: LayoutOptions
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  const ranksep = options.hSpacing === 'COMPACT' ? 90 : options.hSpacing === 'WIDE' ? 180 : 130;
  const nodesep = Math.round(40 * options.vScale);

  g.setGraph({
    rankdir: 'LR',
    align: 'DL',
    ranksep,
    nodesep
  });
  g.setDefaultEdgeLabel(() => ({}));

  Object.values(quests).forEach((quest) => {
    const estimatedHeight = estimateNodeHeight(quest);
    g.setNode(quest.uid, {
      width: DEFAULT_NODE_WIDTH,
      height: estimatedHeight
    });
  });

  edges.forEach((edge) => {
    if (edge.type !== 'LOCKOUT') {
      g.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(g);

  const newPositions: Record<string, { x: number; y: number }> = {};
  Object.values(quests).forEach((quest) => {
    const nodeWithPos = g.node(quest.uid);
    if (nodeWithPos) {
      const height = estimateNodeHeight(quest);
      newPositions[quest.uid] = {
        x: Math.round(nodeWithPos.x - DEFAULT_NODE_WIDTH / 2),
        y: Math.round(nodeWithPos.y - height / 2)
      };
    } else {
      newPositions[quest.uid] = quest.position;
    }
  });

  return newPositions;
}
