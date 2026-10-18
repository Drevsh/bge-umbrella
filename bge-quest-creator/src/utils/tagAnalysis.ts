import { QuestModel, CampaignEdge, getStateTagScope, StateTagScope } from '../types/campaign';

export interface StateTagSource {
  questUid: string;
  questCode: string;
  questTitle: string;
  rewardLabel?: string;
  act?: number;
}

export interface StateTagInfo {
  tag: string;
  scope: StateTagScope;
  isUpstream: boolean;
  isExpiredFromPriorAct?: boolean;
  sources: StateTagSource[];
}

export interface QuestTagAnalysisResult {
  upstreamTags: StateTagInfo[];
  otherCampaignTags: StateTagInfo[];
  allTags: StateTagInfo[];
  tagMap: Map<string, StateTagInfo>;
  isTagUpstream: (tag: string) => boolean;
  isTagInCampaign: (tag: string) => boolean;
}

/**
 * Computes all available state tags for a given quest, classifying them as
 * upstream (reachable via DAG ancestry) vs. other campaign branches,
 * taking into account Act-local (+Tag) expiration vs. Campaign-global (++Tag) persistence.
 */
export function getAvailableStateTagsForQuest(
  questUid: string,
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  customTags: string[] = []
): QuestTagAnalysisResult {
  const targetQuest = quests[questUid];
  const targetAct = targetQuest?.act || 1;

  // 1. Traverse DAG backwards from questUid to find all ancestor quest UIDs
  const ancestorUids = new Set<string>();
  const queue: string[] = [questUid];
  const visited = new Set<string>([questUid]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    // Find all incoming non-lockout edges
    for (const edge of edges) {
      if (edge.target === current && edge.type !== 'LOCKOUT') {
        const parentUid = edge.source;
        if (!visited.has(parentUid)) {
          visited.add(parentUid);
          ancestorUids.add(parentUid);
          queue.push(parentUid);
        }
      }
    }
  }

  // 2. Aggregate tags and their sources from all quests
  const tagSourcesMap = new Map<string, StateTagSource[]>();

  Object.values(quests).forEach((q) => {
    q.rewardOutcomes.forEach((r) => {
      r.grantsStateTags.forEach((tag) => {
        if (!tag) return;
        const list = tagSourcesMap.get(tag) || [];
        list.push({
          questUid: q.uid,
          questCode: q.code,
          questTitle: q.title,
          rewardLabel: r.label,
          act: q.act || 1
        });
        tagSourcesMap.set(tag, list);
      });
    });
  });

  // Also include edge-level state tags
  edges.forEach((edge) => {
    if (edge.stateTag) {
      const q = quests[edge.source];
      const list = tagSourcesMap.get(edge.stateTag) || [];
      if (q && !list.some((s) => s.questUid === q.uid)) {
        list.push({
          questUid: q.uid,
          questCode: q.code,
          questTitle: q.title,
          rewardLabel: edge.label || 'Connection Tag',
          act: q.act || 1
        });
        tagSourcesMap.set(edge.stateTag, list);
      }
    }
  });

  // Also include custom simulator tags
  customTags.forEach((tag) => {
    if (!tag) return;
    const list = tagSourcesMap.get(tag) || [];
    if (!list.some((s) => s.questUid === '__SIM__')) {
      list.push({
        questUid: '__SIM__',
        questCode: 'SIM',
        questTitle: 'Simulator Custom Tag',
        act: 1
      });
      tagSourcesMap.set(tag, list);
    }
  });

  // 3. Classify tags into upstream vs other with Act scoping
  const upstreamTags: StateTagInfo[] = [];
  const otherCampaignTags: StateTagInfo[] = [];
  const tagMap = new Map<string, StateTagInfo>();

  tagSourcesMap.forEach((sources, tag) => {
    const scope = getStateTagScope(tag);

    // Check upstream ancestry
    let isUpstream = false;
    let isExpiredFromPriorAct = false;

    const ancestorSources = sources.filter((s) => ancestorUids.has(s.questUid));
    if (ancestorSources.length > 0) {
      // If any ancestor source is in the same Act (or later), it's upstream
      const hasSameActAncestor = ancestorSources.some((s) => (s.act || 1) >= targetAct);
      if (hasSameActAncestor) {
        isUpstream = true;
      } else {
        // Ancestor is from an earlier Act: only valid if Campaign Global (++Tag)
        if (scope === 'CAMPAIGN_GLOBAL') {
          isUpstream = true;
        } else {
          isExpiredFromPriorAct = true;
        }
      }
    }

    const info: StateTagInfo = {
      tag,
      scope,
      isUpstream,
      isExpiredFromPriorAct,
      sources
    };
    tagMap.set(tag, info);

    if (isUpstream) {
      upstreamTags.push(info);
    } else {
      otherCampaignTags.push(info);
    }
  });

  // Sort alphabetically
  upstreamTags.sort((a, b) => a.tag.localeCompare(b.tag));
  otherCampaignTags.sort((a, b) => a.tag.localeCompare(b.tag));

  const allTags = [...upstreamTags, ...otherCampaignTags];

  return {
    upstreamTags,
    otherCampaignTags,
    allTags,
    tagMap,
    isTagUpstream: (tag: string) => Boolean(tagMap.get(tag)?.isUpstream),
    isTagInCampaign: (tag: string) => tagMap.has(tag)
  };
}
