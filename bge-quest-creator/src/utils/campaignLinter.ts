import { QuestModel, CampaignEdge, getStateTagScope } from '../types/campaign';
import { getAvailableStateTagsForQuest } from './tagAnalysis';

export type LintSeverity = 'error' | 'warning' | 'info';
export type LintCategory = 'TAG' | 'LOGIC' | 'FLOW';

export interface CampaignLintIssue {
  id: string;
  severity: LintSeverity;
  category: LintCategory;
  questUid: string;
  questCode: string;
  questTitle: string;
  act: number;
  message: string;
  suggestion?: string;
}

export interface CampaignLintReport {
  issues: CampaignLintIssue[];
  issuesByQuest: Record<string, CampaignLintIssue[]>;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * Normalizes a state tag with a leading '+' or '++' so comparisons between
 * requiredTag ("Idol_Kept" or "+Idol_Kept") and granted tags ("+Idol_Kept" or "++Idol_Kept") work reliably.
 */
function normalizeTagBody(tag: string): string {
  return tag.trim().replace(/^\+{1,2}/, '').toLowerCase();
}

export function evaluateCampaignLinter(
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[],
  activeActId: number | 'ALL' = 'ALL'
): CampaignLintReport {
  const issues: CampaignLintIssue[] = [];
  const issuesByQuest: Record<string, CampaignLintIssue[]> = {};

  const addIssue = (issue: CampaignLintIssue) => {
    if (activeActId !== 'ALL' && issue.act !== activeActId) {
      return;
    }
    issues.push(issue);
    if (!issuesByQuest[issue.questUid]) {
      issuesByQuest[issue.questUid] = [];
    }
    issuesByQuest[issue.questUid].push(issue);
  };

  const allQuests = Object.values(quests);

  // Collect all granted state tags across the entire campaign (outcomes, edges, exploration milestones)
  const grantedTagsByBody = new Map<
    string,
    { rawTag: string; questUid: string; questCode: string; act: number; label: string }[]
  >();

  // Collect all consumed/checked state tags across the entire campaign (quest.requiredTag, variant.requiredStateTag, edge.stateTag)
  const consumedTagBodies = new Set<string>();

  // Collect quests unlocked via Exploration Milestones or Scenario End
  const explorationUnlockedQuestUids = new Set<string>();

  // Compute max tier per Act to identify non-final tiers
  const maxTierByAct = new Map<number, number>();

  for (const q of allQuests) {
    const act = q.act || 1;
    const prevMax = maxTierByAct.get(act) || 1;
    if ((q.tier || 1) > prevMax) {
      maxTierByAct.set(act, q.tier || 1);
    }

    if (q.requiredTag && q.requiredTag.trim()) {
      consumedTagBodies.add(normalizeTagBody(q.requiredTag));
    }

    for (const v of q.variants || []) {
      if (v.requiredStateTag && v.requiredStateTag.trim()) {
        consumedTagBodies.add(normalizeTagBody(v.requiredStateTag));
      }
    }

    for (const r of q.rewardOutcomes || []) {
      for (const t of r.grantsStateTags || []) {
        const body = normalizeTagBody(t);
        if (!body) continue;
        const list = grantedTagsByBody.get(body) || [];
        list.push({
          rawTag: t.trim(),
          questUid: q.uid,
          questCode: q.code,
          act,
          label: r.label
        });
        grantedTagsByBody.set(body, list);
      }
    }

    if (q.explorationConfig) {
      if (q.explorationConfig.scenarioEndQuestId) {
        explorationUnlockedQuestUids.add(q.explorationConfig.scenarioEndQuestId);
      }
      for (const slot of q.explorationConfig.eventSlots || []) {
        if (slot.targetQuestId) {
          explorationUnlockedQuestUids.add(slot.targetQuestId);
        }
        if (slot.grantsStateTag && slot.grantsStateTag.trim()) {
          const body = normalizeTagBody(slot.grantsStateTag);
          if (body) {
            const list = grantedTagsByBody.get(body) || [];
            list.push({
              rawTag: slot.grantsStateTag.trim(),
              questUid: q.uid,
              questCode: q.code,
              act,
              label: slot.title
            });
            grantedTagsByBody.set(body, list);
          }
        }
      }
    }
  }

  for (const e of edges) {
    if (e.stateTag && e.stateTag.trim()) {
      consumedTagBodies.add(normalizeTagBody(e.stateTag));
    }
  }

  // Per-quest validation checks
  for (const quest of allQuests) {
    const act = quest.act || 1;
    const incoming = edges.filter((e) => e.target === quest.uid && e.type !== 'LOCKOUT');
    const outgoing = edges.filter((e) => e.source === quest.uid && e.type !== 'LOCKOUT');
    const tagAnalysis = getAvailableStateTagsForQuest(quest.uid, quests, edges);

    // 1. Check Unconnected Non-Starter Quests
    if (
      quest.prereqLogic !== 'START' &&
      incoming.length === 0 &&
      !explorationUnlockedQuestUids.has(quest.uid)
    ) {
      addIssue({
        id: `unconnected-${quest.uid}`,
        severity: 'warning',
        category: 'FLOW',
        questUid: quest.uid,
        questCode: quest.code,
        questTitle: quest.title,
        act,
        message: `Gate is set to "${quest.prereqLogic}", but this node has 0 incoming connections.`,
        suggestion: 'Connect an upstream quest port or change Prereq Gate to "Starter (No Prereqs)".'
      });
    }

    // 2. Check Starter Quests that have Incoming Unlock Edges
    if (quest.prereqLogic === 'START' && incoming.length > 0 && quest.category !== 'TEST') {
      addIssue({
        id: `starter-with-incoming-${quest.uid}`,
        severity: 'info',
        category: 'LOGIC',
        questUid: quest.uid,
        questCode: quest.code,
        questTitle: quest.title,
        act,
        message: `Node has ${incoming.length} incoming connection(s), but Prereq Gate is still "START".`,
        suggestion: 'Switch Prereq Gate to "ANY" (OR) or "ALL" (AND) so incoming connections gate this quest.'
      });
    }

    // 3. Check Impossible ALL (AND) Gate from mutually exclusive choices of the same parent quest
    if (quest.prereqLogic === 'ALL' && incoming.length >= 2) {
      const parentExclusivePorts = new Map<string, Set<string>>();
      for (const edge of incoming) {
        if (!edge.sourcePortId) continue;
        const parentQuest = quests[edge.source];
        const port = parentQuest?.rewardOutcomes.find((r) => r.id === edge.sourcePortId);
        if (parentQuest && port?.isExclusiveChoice) {
          const set = parentExclusivePorts.get(parentQuest.uid) || new Set<string>();
          set.add(port.label);
          parentExclusivePorts.set(parentQuest.uid, set);
        }
      }

      parentExclusivePorts.forEach((portLabels, parentUid) => {
        if (portLabels.size >= 2) {
          const parentQuest = quests[parentUid];
          addIssue({
            id: `impossible-and-${quest.uid}-${parentUid}`,
            severity: 'error',
            category: 'LOGIC',
            questUid: quest.uid,
            questCode: quest.code,
            questTitle: quest.title,
            act,
            message: `Unreachable AND gate: requires mutually exclusive choices (${Array.from(portLabels).join(' & ')}) from [${parentQuest?.code || parentUid}].`,
            suggestion: 'Change Prereq Gate from "ALL" (AND) to "ANY" (OR), or uncheck Exclusive Choice on the parent ports.'
          });
        }
      });
    }

    // 4. Validate quest.requiredTag and variant.requiredStateTag
    const requiredTagsToCheck: { raw: string; context: string }[] = [];
    if (quest.requiredTag && quest.requiredTag.trim()) {
      requiredTagsToCheck.push({
        raw: quest.requiredTag.trim(),
        context: 'Quest Required Tag'
      });
    }
    for (const v of quest.variants || []) {
      if (v.requiredStateTag && v.requiredStateTag.trim()) {
        requiredTagsToCheck.push({
          raw: v.requiredStateTag.trim(),
          context: `Variant "${v.overrideTitle || v.requiredStateTag}"`
        });
      }
    }

    for (const req of requiredTagsToCheck) {
      const body = normalizeTagBody(req.raw);
      if (!body) continue;
      const grantSources = grantedTagsByBody.get(body);

      if (!grantSources || grantSources.length === 0) {
        addIssue({
          id: `missing-tag-${quest.uid}-${req.context}-${body}`,
          severity: 'error',
          category: 'TAG',
          questUid: quest.uid,
          questCode: quest.code,
          questTitle: quest.title,
          act,
          message: `${req.context} requires tag "${req.raw}", which is never granted anywhere in the campaign.`,
          suggestion: `Add "+${req.raw.replace(/^\+{1,2}/, '')}" to an upstream outcome's Granted State Tags.`
        });
      } else {
        // Check if it is upstream in tagAnalysis
        const matchingInfo = tagAnalysis.allTags.find(
          (t) => normalizeTagBody(t.tag) === body
        );
        if (matchingInfo?.isExpiredFromPriorAct) {
          addIssue({
            id: `expired-tag-${quest.uid}-${req.context}-${body}`,
            severity: 'error',
            category: 'TAG',
            questUid: quest.uid,
            questCode: quest.code,
            questTitle: quest.title,
            act,
            message: `${req.context} checks Act-local tag "${matchingInfo.tag}" from a prior Act, which expires at Act transition.`,
            suggestion: `Format the tag as Campaign Global ("++${req.raw.replace(/^\+{1,2}/, '')}") so it persists across Acts.`
          });
        } else if (
          matchingInfo &&
          !matchingInfo.isUpstream &&
          !grantSources.some((s) => s.questUid === quest.uid)
        ) {
          const sourceCodes = Array.from(new Set(grantSources.map((s) => s.questCode))).join(', ');
          addIssue({
            id: `non-upstream-tag-${quest.uid}-${req.context}-${body}`,
            severity: 'warning',
            category: 'TAG',
            questUid: quest.uid,
            questCode: quest.code,
            questTitle: quest.title,
            act,
            message: `${req.context} checks "${req.raw}", which is granted by [${sourceCodes}] but is not on an upstream path to this quest.`,
            suggestion: 'Ensure the quest granting this tag can be completed before reaching this node.'
          });
        }
      }
    }

    // 5. Check Orphaned Granted State Tags (granted here, never checked anywhere)
    for (const r of quest.rewardOutcomes || []) {
      for (const rawTag of r.grantsStateTags || []) {
        const body = normalizeTagBody(rawTag);
        if (!body) continue;
        if (!consumedTagBodies.has(body)) {
          const scope = getStateTagScope(rawTag);
          addIssue({
            id: `orphan-tag-${quest.uid}-${r.id}-${body}`,
            severity: 'info',
            category: 'TAG',
            questUid: quest.uid,
            questCode: quest.code,
            questTitle: quest.title,
            act,
            message: `Outcome "${r.label}" grants ${scope === 'CAMPAIGN_GLOBAL' ? 'global' : 'local'} tag "${rawTag}", which is not checked by any quest or variant yet.`,
            suggestion: 'Use this tag in a downstream Quest Required Tag or Variant Override.'
          });
        }
      }
    }

    // 6. Check Dead-End Outcome Ports on non-final tiers
    const maxTier = maxTierByAct.get(act) || 1;
    if (
      (quest.tier || 1) < maxTier &&
      quest.category !== 'BOSS' &&
      quest.category !== 'ACT_TRANSITION' &&
      quest.category !== 'SIDE' &&
      outgoing.length === 0 &&
      quest.rewardOutcomes.length > 0
    ) {
      addIssue({
        id: `dead-end-${quest.uid}`,
        severity: 'warning',
        category: 'FLOW',
        questUid: quest.uid,
        questCode: quest.code,
        questTitle: quest.title,
        act,
        message: `Tier ${quest.tier} main-path node has no outgoing connections to subsequent tiers.`,
        suggestion: 'Drag a connection from one of its outcome ports to a downstream quest.'
      });
    }
  }

  // Sort issues: error -> warning -> info, then by questCode
  const severityRank: Record<LintSeverity, number> = {
    error: 0,
    warning: 1,
    info: 2
  };
  issues.sort((a, b) => {
    if (severityRank[a.severity] !== severityRank[b.severity]) {
      return severityRank[a.severity] - severityRank[b.severity];
    }
    return a.questCode.localeCompare(b.questCode);
  });

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return {
    issues,
    issuesByQuest,
    errorCount,
    warningCount,
    infoCount
  };
}
