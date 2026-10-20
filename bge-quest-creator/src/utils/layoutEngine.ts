import dagre from '@dagrejs/dagre';
import { QuestModel, CampaignEdge, RewardOutcome } from '../types/campaign';

export type LayoutAlgorithmType = 'TIERED' | 'DAGRE_TREE' | 'DAGRE_NETWORK';

export interface LayoutOptions {
  hSpacing: 'COMPACT' | 'BALANCED' | 'WIDE';
  vScale: number;
  reorderChoices?: boolean;
  algorithm?: LayoutAlgorithmType;
  activeActId?: number | 'ALL';
  measuredSizes?: Record<string, { width: number; height: number }>;
}

export interface AutoArrangeResult {
  positions: Record<string, { x: number; y: number }>;
  reorderedChoices: Record<string, RewardOutcome[]>;
  updatedTiers: Record<string, number>;
}

const H_SPACING_VALUES = {
  COMPACT: 360,
  BALANCED: 440,
  WIDE: 540
};

export const DEFAULT_NODE_WIDTH = 280;
export const DEFAULT_INPUT_HANDLE_Y = 38;

/**
 * Estimates node height based on header, active variants, and outcomes list,
 * preferring React Flow's measured DOM height when available (per idootop/reactflow-auto-layout).
 */
export function estimateNodeHeight(
  quest: QuestModel,
  measuredSizes?: Record<string, { width: number; height: number }>
): number {
  const measured = measuredSizes?.[quest.uid]?.height;
  if (measured && measured > 80) {
    return measured;
  }
  const headerHeight = 112;
  const explorationHeight =
    quest.isExplorationStage || quest.category === 'EXPLORATION' || Boolean(quest.explorationConfig)
      ? 28
      : 0;
  const variantHeight = quest.variants && quest.variants.length > 0 ? 32 : 0;
  const outcomesCount = quest.rewardOutcomes ? quest.rewardOutcomes.length : 0;
  const outcomesHeaderHeight = 32;
  const outcomesListHeight = outcomesCount > 0 ? outcomesCount * 38 : 16;
  return headerHeight + explorationHeight + variantHeight + outcomesHeaderHeight + outcomesListHeight + 16;
}

export function getNodeWidth(
  quest: QuestModel,
  measuredSizes?: Record<string, { width: number; height: number }>
): number {
  const measured = measuredSizes?.[quest.uid]?.width;
  return measured && measured > 100 ? measured : DEFAULT_NODE_WIDTH;
}

/**
 * Calculates vertical offset of a specific outcome's right handle within the node card.
 */
export function getOutcomeHandleYOffset(quest: QuestModel, outcomeIndex: number): number {
  const headerHeight = 112;
  const explorationHeight =
    quest.isExplorationStage || quest.category === 'EXPLORATION' || Boolean(quest.explorationConfig)
      ? 28
      : 0;
  const variantHeight = quest.variants && quest.variants.length > 0 ? 32 : 0;
  const outcomesTop = headerHeight + explorationHeight + variantHeight + 32;
  return outcomesTop + outcomeIndex * 38 + 18;
}

/**
 * Detects back-edges (cycles) in a directed graph using DFS so cycle edges don't cause infinite tier promotion.
 */
function findBackEdgeIds(
  questUids: string[],
  edges: CampaignEdge[]
): Set<string> {
  const uidSet = new Set(questUids);
  const adj: Record<string, CampaignEdge[]> = {};
  questUids.forEach((u) => {
    adj[u] = [];
  });
  edges.forEach((e) => {
    if (uidSet.has(e.source) && uidSet.has(e.target) && e.type !== 'LOCKOUT') {
      adj[e.source].push(e);
    }
  });

  // Sort quests by initial tier and code so DFS starts from natural roots
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const backEdges = new Set<string>();

  const dfs = (u: string) => {
    visited.add(u);
    inStack.add(u);
    for (const edge of adj[u] || []) {
      const v = edge.target;
      if (inStack.has(v)) {
        backEdges.add(edge.id);
      } else if (!visited.has(v)) {
        dfs(v);
      }
    }
    inStack.delete(u);
  };

  questUids.forEach((u) => {
    if (!visited.has(u)) {
      dfs(u);
    }
  });

  return backEdges;
}

/**
 * Reorders choices inside each quest based on the final assigned Y coordinates of target quests
 * so right-hand output ports never cross each other.
 */
function finalizeChoiceReordering(
  actQuests: Record<string, QuestModel>,
  actEdges: CampaignEdge[],
  positions: Record<string, { x: number; y: number }>,
  workingChoices: Record<string, RewardOutcome[]>
): void {
  const outgoingMap: Record<string, CampaignEdge[]> = {};
  Object.keys(actQuests).forEach((uid) => {
    outgoingMap[uid] = [];
  });
  actEdges.forEach((e) => {
    if (e.type !== 'LOCKOUT' && outgoingMap[e.source] && actQuests[e.target]) {
      outgoingMap[e.source].push(e);
    }
  });

  Object.keys(actQuests).forEach((uid) => {
    const quest = actQuests[uid];
    const outcomes = workingChoices[uid];
    if (!quest || !outcomes || outcomes.length <= 1) return;

    const srcPos = positions[uid] || quest.position;
    const outcomesWithTargetY = outcomes.map((outcome, origIdx) => {
      const allOut = outgoingMap[uid].filter((e) => e.sourcePortId === outcome.id);
      // Prefer primary progression edges (UNLOCKS / CHOICE_BRANCH) over secondary MUTATION edges when sorting ports
      const primaryOut = allOut.filter(
        (e) => e.type === 'UNLOCKS' || e.type === 'CHOICE_BRANCH' || e.type === 'TIME_TRIGGER'
      );
      const effectiveOut = primaryOut.length > 0 ? primaryOut : allOut;

      if (effectiveOut.length === 0) {
        return { outcome, origIdx, rankY: 90000 + origIdx };
      }

      let forwardSumY = 0;
      let forwardCount = 0;
      let loopbackSumY = 0;
      let loopbackCount = 0;

      effectiveOut.forEach((e) => {
        const tgtPos = positions[e.target] || actQuests[e.target]?.position;
        if (!tgtPos) return;
        if (tgtPos.x > srcPos.x + 40) {
          forwardSumY += tgtPos.y;
          forwardCount++;
        } else {
          loopbackSumY += tgtPos.y;
          loopbackCount++;
        }
      });

      if (forwardCount > 0) {
        return { outcome, origIdx, rankY: forwardSumY / forwardCount };
      }
      const avgLoopY = loopbackCount > 0 ? loopbackSumY / loopbackCount : 0;
      return { outcome, origIdx, rankY: 180000 + avgLoopY + origIdx * 0.1 };
    });

    outcomesWithTargetY.sort((a, b) => {
      if (Math.abs(a.rankY - b.rankY) > 1) return a.rankY - b.rankY;
      return a.origIdx - b.origIdx;
    });

    workingChoices[uid] = outcomesWithTargetY.map((o) => o.outcome);
  });
}

/**
 * Layouts a single Act's subgraph using either:
 * - 'TIERED': Port-Aware Sugiyama with topological tier promotion & symmetric bidirectional relaxation
 * - 'DAGRE_TREE': Dagre tight-tree with virtual #root for disconnected subflows (idootop/reactflow-auto-layout)
 * - 'DAGRE_NETWORK': Dagre network-simplex with virtual #root for disconnected subflows
 */
function layoutActSubgraph(
  actQuests: Record<string, QuestModel>,
  actEdges: CampaignEdge[],
  options: LayoutOptions,
  startYOffset: number
): {
  positions: Record<string, { x: number; y: number }>;
  reorderedChoices: Record<string, RewardOutcome[]>;
  updatedTiers: Record<string, number>;
  maxBottomY: number;
} {
  const algorithm = options.algorithm || 'TIERED';
  const hGap = H_SPACING_VALUES[options.hSpacing] || 440;
  const vGap = Math.max(32, Math.round(48 * options.vScale));
  const shouldReorderChoices = options.reorderChoices ?? true;
  const measuredSizes = options.measuredSizes;

  const questList = Object.values(actQuests);
  if (questList.length === 0) {
    return { positions: {}, reorderedChoices: {}, updatedTiers: {}, maxBottomY: startYOffset };
  }

  const workingChoices: Record<string, RewardOutcome[]> = {};
  questList.forEach((q) => {
    workingChoices[q.uid] = [...(q.rewardOutcomes || [])];
  });

  // Sort quests initially by tier and code for deterministic cycle detection
  const sortedInitialUids = [...questList]
    .sort((a, b) => (a.tier || 1) - (b.tier || 1) || a.code.localeCompare(b.code))
    .map((q) => q.uid);

  const primaryEdges = actEdges.filter(
    (e) =>
      actQuests[e.source] &&
      actQuests[e.target] &&
      (e.type === 'UNLOCKS' || e.type === 'CHOICE_BRANCH' || e.type === 'TIME_TRIGGER')
  );
  const secondaryEdges = actEdges.filter(
    (e) =>
      actQuests[e.source] &&
      actQuests[e.target] &&
      (e.type === 'MUTATION' || e.type === 'TIME_EXPIRED')
  );

  const backEdgeIds = findBackEdgeIds(sortedInitialUids, [...primaryEdges, ...secondaryEdges]);

  // If user selected Dagre Tree or Dagre Network (from idootop/reactflow-auto-layout)
  if (algorithm === 'DAGRE_TREE' || algorithm === 'DAGRE_NETWORK') {
    const g = new dagre.graphlib.Graph();
    const ranksep = hGap - DEFAULT_NODE_WIDTH;
    const nodesep = vGap;

    g.setGraph({
      rankdir: 'LR',
      ranker: algorithm === 'DAGRE_TREE' ? 'tight-tree' : 'network-simplex',
      ranksep,
      nodesep
    });
    g.setDefaultEdgeLabel(() => ({}));

    const incomerCounts: Record<string, number> = {};
    questList.forEach((q) => {
      incomerCounts[q.uid] = 0;
      const w = getNodeWidth(q, measuredSizes);
      const h = estimateNodeHeight(q, measuredSizes);
      g.setNode(q.uid, { width: w, height: h });
    });

    const dagEdges = [...primaryEdges, ...secondaryEdges].filter((e) => !backEdgeIds.has(e.id));
    dagEdges.forEach((edge) => {
      const isPrimary = edge.type === 'UNLOCKS' || edge.type === 'CHOICE_BRANCH';
      g.setEdge(edge.source, edge.target, {
        weight: isPrimary ? 2 : 1,
        minlen: 1
      });
      incomerCounts[edge.target] = (incomerCounts[edge.target] || 0) + 1;
    });

    // Attach sub-workflow root nodes (nodes without incoming edges) to a virtual #root node
    // (technique from idootop/reactflow-auto-layout/src/layout/node/algorithms/dagre-tree.ts)
    const rootNodes = questList.filter((q) => (incomerCounts[q.uid] || 0) === 0);
    g.setNode('#root', { width: 1, height: 1 });
    rootNodes.forEach((rn) => {
      g.setEdge('#root', rn.uid, { weight: 1, minlen: 1 });
    });

    dagre.layout(g);

    const rawPositions: Record<string, { x: number; y: number }> = {};
    let minX = Infinity;
    let minY = Infinity;

    questList.forEach((q) => {
      const n = g.node(q.uid);
      const w = getNodeWidth(q, measuredSizes);
      const h = estimateNodeHeight(q, measuredSizes);
      if (n && Number.isFinite(n.x) && Number.isFinite(n.y)) {
        const x = Math.round(n.x - w / 2);
        const y = Math.round(n.y - h / 2);
        rawPositions[q.uid] = { x, y };
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
      } else {
        rawPositions[q.uid] = { ...q.position };
      }
    });

    if (!Number.isFinite(minX)) minX = 0;
    if (!Number.isFinite(minY)) minY = 0;

    const startX = 60;
    const positions: Record<string, { x: number; y: number }> = {};
    const updatedTiers: Record<string, number> = {};
    let maxBottomY = startYOffset;

    // Normalize coordinates to (startX, startYOffset) and snap X columns to clean progression tiers
    const uniqueX = Array.from(new Set(Object.values(rawPositions).map((p) => p.x))).sort(
      (a, b) => a - b
    );
    const xClusters: number[] = [];
    uniqueX.forEach((x) => {
      if (xClusters.length === 0 || x - xClusters[xClusters.length - 1] > 120) {
        xClusters.push(x);
      }
    });

    questList.forEach((q) => {
      const raw = rawPositions[q.uid];
      let clusterIdx = 0;
      let bestDist = Infinity;
      xClusters.forEach((cx, idx) => {
        const d = Math.abs(raw.x - cx);
        if (d < bestDist) {
          bestDist = d;
          clusterIdx = idx;
        }
      });

      const finalX = startX + clusterIdx * hGap;
      const finalY = Math.round(raw.y - minY + startYOffset);
      positions[q.uid] = { x: finalX, y: finalY };
      updatedTiers[q.uid] = clusterIdx + 1;
      const h = estimateNodeHeight(q, measuredSizes);
      maxBottomY = Math.max(maxBottomY, finalY + h);
    });

    if (shouldReorderChoices) {
      finalizeChoiceReordering(actQuests, actEdges, positions, workingChoices);
    }

    return { positions, reorderedChoices: workingChoices, updatedTiers, maxBottomY };
  }

  // ============================================================================
  // Smart Tiered Sugiyama Layout ('TIERED')
  // ============================================================================

  // 1. Topological Tier Assignment (Promotes target tiers when connected quests share a tier)
  const effectiveTiers: Record<string, number> = {};
  questList.forEach((q) => {
    effectiveTiers[q.uid] = Math.max(1, q.tier || 1);
  });

  // Relax forward DAG edges so if A -> B is not a cycle and B.tier <= A.tier, B is promoted to A.tier + 1
  const forwardDagEdges = primaryEdges.filter((e) => !backEdgeIds.has(e.id));
  for (let pass = 0; pass < questList.length; pass++) {
    let changed = false;
    forwardDagEdges.forEach((e) => {
      const srcTier = effectiveTiers[e.source];
      const tgtTier = effectiveTiers[e.target];
      // Only promote if user hadn't explicitly created an intentional backward tier jump,
      // OR if source and target were left on the exact same tier
      const origSrcTier = actQuests[e.source].tier || 1;
      const origTgtTier = actQuests[e.target].tier || 1;
      if (origTgtTier >= origSrcTier && tgtTier <= srcTier) {
        effectiveTiers[e.target] = srcTier + 1;
        changed = true;
      }
    });
    if (!changed) break;
  }

  // Group quests by effective tier
  const tierBuckets: Record<number, QuestModel[]> = {};
  questList.forEach((quest) => {
    const tier = effectiveTiers[quest.uid];
    if (!tierBuckets[tier]) tierBuckets[tier] = [];
    tierBuckets[tier].push(quest);
  });

  const sortedTiers = Object.keys(tierBuckets)
    .map(Number)
    .sort((a, b) => a - b);

  // Build adjacency maps for non-back-edges
  interface WeightedEdge {
    source: string;
    target: string;
    sourcePortId: string | null;
    type: string;
    weight: number;
  }

  const outgoingMap: Record<string, WeightedEdge[]> = {};
  const incomingMap: Record<string, WeightedEdge[]> = {};
  questList.forEach((q) => {
    outgoingMap[q.uid] = [];
    incomingMap[q.uid] = [];
  });

  [...primaryEdges, ...secondaryEdges].forEach((e) => {
    if (backEdgeIds.has(e.id)) return;
    const isPrimary =
      e.type === 'UNLOCKS' || e.type === 'CHOICE_BRANCH' || e.type === 'TIME_TRIGGER';
    const we: WeightedEdge = {
      source: e.source,
      target: e.target,
      sourcePortId: e.sourcePortId,
      type: e.type,
      weight: isPrimary ? 1.0 : 0.15
    };
    outgoingMap[e.source].push(we);
    incomingMap[e.target].push(we);
  });

  // Initial vertical ordering within each tier
  const tierOrder: Record<number, string[]> = {};
  sortedTiers.forEach((tier) => {
    const nodes = [...tierBuckets[tier]];
    nodes.sort((a, b) => {
      if (a.prereqLogic === 'START' && b.prereqLogic !== 'START') return -1;
      if (b.prereqLogic === 'START' && a.prereqLogic !== 'START') return 1;
      // Side quests naturally sit above or below main quests based on existing Y or category
      if (a.parentSlot && b.parentSlot && a.parentSlot !== b.parentSlot) {
        return a.parentSlot.localeCompare(b.parentSlot);
      }
      return a.code.localeCompare(b.code);
    });
    tierOrder[tier] = nodes.map((n) => n.uid);
  });

  // Helper to reorder choices inside a quest during barycentric sweeps
  const reorderNodeChoicesByTierRank = (questUid: string) => {
    if (!shouldReorderChoices) return;
    const outcomes = workingChoices[questUid];
    if (!outcomes || outcomes.length <= 1) return;

    const srcTier = effectiveTiers[questUid];
    const outcomesWithRank = outcomes.map((outcome, origIdx) => {
      const allOut = outgoingMap[questUid].filter((e) => e.sourcePortId === outcome.id);
      const primaryOut = allOut.filter((e) => e.weight >= 1.0);
      const usedOut = primaryOut.length > 0 ? primaryOut : allOut;

      if (usedOut.length === 0) {
        return { outcome, origIdx, rank: 100 + origIdx };
      }

      let forwardRankSum = 0;
      let forwardWeightSum = 0;
      let loopbackRankSum = 0;
      let loopbackCount = 0;

      usedOut.forEach((edge) => {
        const tTier = effectiveTiers[edge.target];
        const orderInTier = tierOrder[tTier] || [];
        const idx = orderInTier.indexOf(edge.target);
        const effectiveIdx = idx !== -1 ? idx : 0;

        if (tTier > srcTier) {
          forwardRankSum += effectiveIdx * edge.weight;
          forwardWeightSum += edge.weight;
        } else {
          loopbackRankSum += effectiveIdx;
          loopbackCount++;
        }
      });

      if (forwardWeightSum > 0) {
        return { outcome, origIdx, rank: forwardRankSum / forwardWeightSum };
      }
      const avgLoopRank = loopbackCount > 0 ? loopbackRankSum / loopbackCount : 0;
      return { outcome, origIdx, rank: 500 + avgLoopRank + origIdx * 0.01 };
    });

    outcomesWithRank.sort((a, b) => {
      if (Math.abs(a.rank - b.rank) > 0.001) return a.rank - b.rank;
      return a.origIdx - b.origIdx;
    });

    workingChoices[questUid] = outcomesWithRank.map((o) => o.outcome);
  };

  // 2. Multi-Pass Barycentric Crossing Reduction
  const SWEEP_ITERATIONS = 6;
  for (let iter = 0; iter < SWEEP_ITERATIONS; iter++) {
    // Forward sweep (Tiers 1 -> N)
    for (let tIdx = 0; tIdx < sortedTiers.length; tIdx++) {
      const tier = sortedTiers[tIdx];
      const uids = tierOrder[tier];

      if (tIdx > 0) {
        const scored = uids.map((uid, origIdx) => {
          const allIn = incomingMap[uid].filter((e) => effectiveTiers[e.source] < tier);
          const primaryIn = allIn.filter((e) => e.weight >= 1.0);
          const inEdges = primaryIn.length > 0 ? primaryIn : allIn;

          if (inEdges.length === 0) {
            return { uid, origIdx, score: 9999 + origIdx };
          }

          let scoreSum = 0;
          let weightSum = 0;
          inEdges.forEach((edge) => {
            const srcTier = effectiveTiers[edge.source];
            const srcOrder = tierOrder[srcTier] || [];
            const srcIndex = srcOrder.indexOf(edge.source);

            const choices = workingChoices[edge.source] || [];
            const portIdx = choices.findIndex((c) => c.id === edge.sourcePortId);
            const portFraction =
              choices.length > 0 && portIdx >= 0 ? (portIdx + 0.5) / choices.length : 0.5;

            scoreSum += ((srcIndex >= 0 ? srcIndex : 0) + portFraction) * edge.weight;
            weightSum += edge.weight;
          });

          return { uid, origIdx, score: scoreSum / weightSum };
        });

        scored.sort((a, b) => {
          if (Math.abs(a.score - b.score) > 0.001) return a.score - b.score;
          return a.origIdx - b.origIdx;
        });

        tierOrder[tier] = scored.map((s) => s.uid);
      }

      tierOrder[tier].forEach((uid) => reorderNodeChoicesByTierRank(uid));
    }

    // Backward sweep (Tiers N -> 1)
    for (let tIdx = sortedTiers.length - 1; tIdx >= 0; tIdx--) {
      const tier = sortedTiers[tIdx];
      const uids = tierOrder[tier];

      if (tIdx < sortedTiers.length - 1) {
        const scored = uids.map((uid, origIdx) => {
          const allOut = outgoingMap[uid].filter((e) => effectiveTiers[e.target] > tier);
          const primaryOut = allOut.filter((e) => e.weight >= 1.0);
          const outEdges = primaryOut.length > 0 ? primaryOut : allOut;

          if (outEdges.length === 0) {
            return { uid, origIdx, score: 9999 + origIdx };
          }

          let scoreSum = 0;
          let weightSum = 0;
          outEdges.forEach((edge) => {
            const tgtTier = effectiveTiers[edge.target];
            const tgtOrder = tierOrder[tgtTier] || [];
            const tgtIndex = tgtOrder.indexOf(edge.target);
            scoreSum += (tgtIndex >= 0 ? tgtIndex : 0) * edge.weight;
            weightSum += edge.weight;
          });

          return { uid, origIdx, score: scoreSum / weightSum };
        });

        scored.sort((a, b) => {
          if (Math.abs(a.score - b.score) > 0.001) return a.score - b.score;
          return a.origIdx - b.origIdx;
        });

        tierOrder[tier] = scored.map((s) => s.uid);
      }

      tierOrder[tier].forEach((uid) => reorderNodeChoicesByTierRank(uid));
    }
  }

  // 3. Symmetric Bidirectional Coordinate Assignment (Tallest Column Anchor + Relaxation)
  const startX = 60;
  const nodeHeights: Record<string, number> = {};
  questList.forEach((q) => {
    nodeHeights[q.uid] = estimateNodeHeight(q, measuredSizes);
  });

  const positions: Record<string, { x: number; y: number }> = {};

  // Helper to stack a tier's nodes cleanly without overlaps, respecting desiredY targets
  const resolveColumnCollisions = (uids: string[], desiredYs: Record<string, number>, colX: number) => {
    if (uids.length === 0) return;

    // 1. Top-down pass to enforce minimum vGap between consecutive nodes
    const placedYs: number[] = [];
    for (let i = 0; i < uids.length; i++) {
      const uid = uids[i];
      const desired = desiredYs[uid];
      if (i === 0) {
        placedYs.push(desired);
      } else {
        const prevUid = uids[i - 1];
        const minAllowed = placedYs[i - 1] + nodeHeights[prevUid] + vGap;
        placedYs.push(Math.max(minAllowed, desired));
      }
    }

    // 2. Shift the whole column vertically so its average displacement from desiredYs is 0 (centered)
    let shiftSum = 0;
    let connectedCount = 0;
    for (let i = 0; i < uids.length; i++) {
      const uid = uids[i];
      if (Number.isFinite(desiredYs[uid])) {
        shiftSum += placedYs[i] - desiredYs[uid];
        connectedCount++;
      }
    }
    const avgShift = connectedCount > 0 ? Math.round(shiftSum / connectedCount) : 0;

    for (let i = 0; i < uids.length; i++) {
      positions[uids[i]] = {
        x: colX,
        y: Math.round(placedYs[i] - avgShift)
      };
    }
  };

  // Step 3a: Initial stacked placement per column centered around a shared vertical midline
  const colTotalHeights: Record<number, number> = {};
  let maxColHeight = 0;
  sortedTiers.forEach((tier) => {
    const uids = tierOrder[tier];
    const totalH =
      uids.reduce((acc, uid) => acc + nodeHeights[uid], 0) +
      Math.max(0, uids.length - 1) * vGap;
    colTotalHeights[tier] = totalH;
    maxColHeight = Math.max(maxColHeight, totalH);
  });

  const midLineY = startYOffset + maxColHeight / 2;

  sortedTiers.forEach((tier, tierIdx) => {
    const colX = startX + tierIdx * hGap;
    const uids = tierOrder[tier];
    let curY = Math.round(midLineY - colTotalHeights[tier] / 2);
    uids.forEach((uid) => {
      positions[uid] = { x: colX, y: curY };
      curY += nodeHeights[uid] + vGap;
    });
  });

  // Step 3b: Iterative Forward & Backward Port-Aligned Relaxation Passes
  const RELAX_PASSES = 6;
  for (let pass = 0; pass < RELAX_PASSES; pass++) {
    // Forward pass (align targets with their incoming source port handles)
    for (let tIdx = 1; tIdx < sortedTiers.length; tIdx++) {
      const tier = sortedTiers[tIdx];
      const colX = startX + tIdx * hGap;
      const uids = tierOrder[tier];
      const desiredYs: Record<string, number> = {};

      uids.forEach((uid) => {
        const allIn = incomingMap[uid].filter((e) => effectiveTiers[e.source] < tier);
        const primaryIn = allIn.filter((e) => e.weight >= 1.0);
        const inEdges = primaryIn.length > 0 ? primaryIn : allIn;

        if (inEdges.length === 0) {
          desiredYs[uid] = positions[uid].y;
          return;
        }

        let sumTargetY = 0;
        let weightSum = 0;
        inEdges.forEach((edge) => {
          const srcQuest = actQuests[edge.source];
          const srcPos = positions[edge.source];
          const srcChoices = workingChoices[edge.source] || [];
          const outcomeIdx = srcChoices.findIndex((c) => c.id === edge.sourcePortId);
          const handleOffset =
            outcomeIdx >= 0 ? getOutcomeHandleYOffset(srcQuest, outcomeIdx) : 50;

          // Align target input handle (top: 38px) with source outcome handle Y
          const idealTargetY = srcPos.y + handleOffset - DEFAULT_INPUT_HANDLE_Y;
          sumTargetY += idealTargetY * edge.weight;
          weightSum += edge.weight;
        });

        desiredYs[uid] = Math.round(sumTargetY / weightSum);
      });

      resolveColumnCollisions(uids, desiredYs, colX);
    }

    // Backward pass (align parents with their outgoing target input handles)
    for (let tIdx = sortedTiers.length - 2; tIdx >= 0; tIdx--) {
      const tier = sortedTiers[tIdx];
      const colX = startX + tIdx * hGap;
      const uids = tierOrder[tier];
      const desiredYs: Record<string, number> = {};

      uids.forEach((uid) => {
        const srcQuest = actQuests[uid];
        const allOut = outgoingMap[uid].filter((e) => effectiveTiers[e.target] > tier);
        const primaryOut = allOut.filter((e) => e.weight >= 1.0);
        const outEdges = primaryOut.length > 0 ? primaryOut : allOut;

        if (outEdges.length === 0) {
          desiredYs[uid] = positions[uid].y;
          return;
        }

        const srcChoices = workingChoices[uid] || [];
        let sumParentY = 0;
        let weightSum = 0;

        outEdges.forEach((edge) => {
          const tgtPos = positions[edge.target];
          const outcomeIdx = srcChoices.findIndex((c) => c.id === edge.sourcePortId);
          const handleOffset =
            outcomeIdx >= 0 ? getOutcomeHandleYOffset(srcQuest, outcomeIdx) : 50;

          // We want srcPos.y + handleOffset = tgtPos.y + DEFAULT_INPUT_HANDLE_Y
          const idealParentY = tgtPos.y + DEFAULT_INPUT_HANDLE_Y - handleOffset;
          sumParentY += idealParentY * edge.weight;
          weightSum += edge.weight;
        });

        desiredYs[uid] = Math.round(sumParentY / weightSum);
      });

      resolveColumnCollisions(uids, desiredYs, colX);
    }
  }

  // Step 4: Normalize all Y coordinates in this Act so the highest node starts at startYOffset
  let minAssignedY = Infinity;
  Object.values(positions).forEach((pos) => {
    minAssignedY = Math.min(minAssignedY, pos.y);
  });
  if (!Number.isFinite(minAssignedY)) minAssignedY = startYOffset;

  const yOffsetCorrection = startYOffset - minAssignedY;
  let maxBottomY = startYOffset;

  Object.keys(positions).forEach((uid) => {
    const correctedY = Math.round(positions[uid].y + yOffsetCorrection);
    positions[uid] = {
      x: positions[uid].x,
      y: correctedY
    };
    maxBottomY = Math.max(maxBottomY, correctedY + nodeHeights[uid]);
  });

  // Step 5: Final pass for intra-node choice reordering based on final assigned positions
  if (shouldReorderChoices) {
    finalizeChoiceReordering(actQuests, actEdges, positions, workingChoices);
  }

  return {
    positions,
    reorderedChoices: workingChoices,
    updatedTiers: effectiveTiers,
    maxBottomY
  };
}

/**
 * Advanced Multi-Algorithm Port-Aware Auto-Arrangement.
 * Scopes layout by Act (so hidden Acts never collide with the active Act),
 * promotes topological tiers for same-tier connected quests,
 * uses React Flow measured DOM dimensions, and supports both Tiered Sugiyama and Dagre layouts.
 */
export function calculateAutoArrangement(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  options: LayoutOptions
): AutoArrangeResult {
  const activeActId = options.activeActId ?? 'ALL';
  const allPositions: Record<string, { x: number; y: number }> = {};
  const allReorderedChoices: Record<string, RewardOutcome[]> = {};
  const allUpdatedTiers: Record<string, number> = {};

  if (activeActId !== 'ALL') {
    // Layout ONLY the active Act's quests so other Acts are untouched and never distort current Act alignment
    const actQuests: Record<string, QuestModel> = {};
    Object.values(quests).forEach((q) => {
      if ((q.act || 1) === activeActId) {
        actQuests[q.uid] = q;
      }
    });
    const actEdges = edges.filter((e) => actQuests[e.source] && actQuests[e.target]);
    const res = layoutActSubgraph(actQuests, actEdges, options, 80);
    return {
      positions: res.positions,
      reorderedChoices: res.reorderedChoices,
      updatedTiers: res.updatedTiers
    };
  }

  // When viewing 'ALL' Acts, layout each Act in its own vertical swimlane band
  const actBuckets: Record<number, Record<string, QuestModel>> = {};
  Object.values(quests).forEach((q) => {
    const act = q.act || 1;
    if (!actBuckets[act]) actBuckets[act] = {};
    actBuckets[act][q.uid] = q;
  });

  const sortedActs = Object.keys(actBuckets)
    .map(Number)
    .sort((a, b) => a - b);

  let currentStartY = 80;
  sortedActs.forEach((actId) => {
    const actQuests = actBuckets[actId];
    const actEdges = edges.filter((e) => actQuests[e.source] && actQuests[e.target]);
    const res = layoutActSubgraph(actQuests, actEdges, options, currentStartY);

    Object.assign(allPositions, res.positions);
    Object.assign(allReorderedChoices, res.reorderedChoices);
    Object.assign(allUpdatedTiers, res.updatedTiers);

    currentStartY = res.maxBottomY + 140;
  });

  return {
    positions: allPositions,
    reorderedChoices: allReorderedChoices,
    updatedTiers: allUpdatedTiers
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
  return calculateAutoArrangement(quests, edges, {
    ...options,
    algorithm: 'DAGRE_TREE'
  }).positions;
}
