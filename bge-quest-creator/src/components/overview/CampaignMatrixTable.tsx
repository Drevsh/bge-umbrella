import React, { useMemo } from 'react';
import {
  Tag,
  AlertTriangle,
  CheckCircle2,
  Zap,
  ArrowRight,
  HelpCircle,
  Coins,
  Package
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';

export const CampaignMatrixTable: React.FC = () => {
  const quests = useCampaignStore((s) => s.quests);
  const selectQuest = useCampaignStore((s) => s.selectQuest);
  const setViewMode = useCampaignStore((s) => s.setViewMode);

  const sortedQuests = useMemo(() => {
    return Object.values(quests).sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.code.localeCompare(b.code);
    });
  }, [quests]);

  const handleRowClick = (uid: string) => {
    selectQuest(uid);
    setViewMode('SPLIT');
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <span>Campaign Quest Matrix</span>
          <span className="text-xs font-mono font-normal bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
            {sortedQuests.length} Quests Total
          </span>
        </h3>
        <p className="text-xs text-slate-400">
          Click any row to open the quest in the graph editor
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Tier</th>
              <th className="py-2.5 px-3">Code</th>
              <th className="py-2.5 px-3">Title</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Gate</th>
              <th className="py-2.5 px-3">Rewards</th>
              <th className="py-2.5 px-3">Variants</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {sortedQuests.map((q) => (
              <tr
                key={q.uid}
                onClick={() => handleRowClick(q.uid)}
                className="hover:bg-slate-800/60 cursor-pointer transition-colors"
              >
                <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                  Tier {q.tier}
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-200">{q.code}</td>
                <td className="py-2.5 px-3 text-slate-100 font-semibold">{q.title}</td>
                <td className="py-2.5 px-3">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
                    {q.category}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-mono text-slate-400">{q.prereqLogic}</td>
                <td className="py-2.5 px-3 text-slate-300">
                  {q.rewardOutcomes.length} Ports
                </td>
                <td className="py-2.5 px-3">
                  {q.variants.length > 0 ? (
                    <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {q.variants.length} Overrides
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                    {q.devStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const StateTagAuditGrid: React.FC = () => {
  const quests = useCampaignStore((s) => s.quests);

  // Analyze all tags: producers vs consumers
  const auditData = useMemo(() => {
    const producers: Record<string, { questCode: string; rewardLabel: string }[]> = {};
    const consumers: Record<string, { questCode: string; type: 'VARIANT' | 'PREREQ' }[]> = {};

    Object.values(quests).forEach((q) => {
      // Producers: reward outcomes
      q.rewardOutcomes.forEach((r) => {
        r.grantsStateTags.forEach((tag) => {
          if (!producers[tag]) producers[tag] = [];
          producers[tag].push({ questCode: q.code, rewardLabel: r.label });
        });
      });

      // Consumers: requiredTag
      if (q.requiredTag) {
        if (!consumers[q.requiredTag]) consumers[q.requiredTag] = [];
        consumers[q.requiredTag].push({ questCode: q.code, type: 'PREREQ' });
      }

      // Consumers: variants
      q.variants.forEach((v) => {
        if (!consumers[v.requiredStateTag]) consumers[v.requiredStateTag] = [];
        consumers[v.requiredStateTag].push({ questCode: q.code, type: 'VARIANT' });
      });
    });

    const allTags = Array.from(
      new Set([...Object.keys(producers), ...Object.keys(consumers)])
    ).sort();

    return allTags.map((tag) => {
      const prods = producers[tag] || [];
      const cons = consumers[tag] || [];
      const isOrphan = prods.length === 0 || cons.length === 0;

      return {
        tag,
        prods,
        cons,
        isOrphan
      };
    });
  }, [quests]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <span>State Tag Audit Matrix</span>
          <span className="text-xs font-mono font-normal bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
            {auditData.length} Tags Analyzed
          </span>
        </h3>
        <p className="text-xs text-slate-400">
          Flags orphaned tags that are granted but never consumed (or consumed without a source)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">State Tag</th>
              <th className="py-2.5 px-3">Granted By (Producers)</th>
              <th className="py-2.5 px-3">Consumed By (Variants & Prereqs)</th>
              <th className="py-2.5 px-3">Integrity Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {auditData.map(({ tag, prods, cons, isOrphan }) => (
              <tr key={tag} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-3 font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  {tag}
                </td>
                <td className="py-2.5 px-3">
                  {prods.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {prods.map((p, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-200 border border-slate-700"
                        >
                          {p.questCode}: {p.rewardLabel}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-rose-400 font-mono text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Missing Source
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  {cons.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {cons.map((c, idx) => (
                        <span
                          key={idx}
                          className="bg-indigo-950/70 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[10px] border border-indigo-800/50"
                        >
                          {c.questCode} ({c.type})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-amber-400 font-mono text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Orphan (Never Consumed)
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  {isOrphan ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/80 text-amber-400 border border-amber-800 flex items-center gap-1 w-fit">
                      <AlertTriangle className="w-3 h-3" />
                      Orphan Warning
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
