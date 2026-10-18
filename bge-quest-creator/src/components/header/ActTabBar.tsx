import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Globe,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { CampaignAct } from '../../types/campaign';

export const ActTabBar: React.FC = () => {
  const acts = useCampaignStore((s) => s.acts);
  const activeActId = useCampaignStore((s) => s.activeActId);
  const setActiveActId = useCampaignStore((s) => s.setActiveActId);
  const addAct = useCampaignStore((s) => s.addAct);
  const updateAct = useCampaignStore((s) => s.updateAct);
  const deleteAct = useCampaignStore((s) => s.deleteAct);
  const quests = useCampaignStore((s) => s.quests);

  const [editingActId, setEditingActId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const questCountByAct = React.useMemo(() => {
    const counts: Record<number, number> = {};
    Object.values(quests).forEach((q) => {
      const act = q.act || 1;
      counts[act] = (counts[act] || 0) + 1;
    });
    return counts;
  }, [quests]);

  const handleStartRename = (act: CampaignAct) => {
    setEditingActId(act.id);
    setEditTitle(act.title);
  };

  const handleSaveRename = (actId: number) => {
    if (editTitle.trim()) {
      updateAct(actId, { title: editTitle.trim() });
    }
    setEditingActId(null);
  };

  return (
    <div className="h-10 bg-slate-950/90 border-b border-slate-800/80 px-4 flex items-center justify-between gap-2 text-xs select-none shrink-0 z-20 backdrop-blur-md">
      {/* Left: Act Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          Acts:
        </span>

        {acts.map((act) => {
          const isActive = activeActId === act.id;
          const isEditing = editingActId === act.id;
          const count = questCountByAct[act.id] || 0;

          if (isEditing) {
            return (
              <div
                key={act.id}
                className="flex items-center gap-1 bg-slate-900 border border-indigo-500 rounded-lg px-2 py-0.5 shadow-sm"
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(act.id);
                    if (e.key === 'Escape') setEditingActId(null);
                  }}
                  autoFocus
                  className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none w-44"
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(act.id)}
                  className="text-emerald-400 hover:text-emerald-300 p-0.5"
                  title="Save title"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingActId(null)}
                  className="text-slate-400 hover:text-slate-200 p-0.5"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={act.id}
              onClick={() => setActiveActId(act.id)}
              onDoubleClick={() => handleStartRename(act)}
              className={`group flex items-center gap-2 px-3 py-1 rounded-lg font-medium text-xs cursor-pointer transition-all border ${
                isActive
                  ? 'bg-slate-800 text-indigo-300 border-indigo-500/60 shadow-sm shadow-indigo-950'
                  : 'bg-slate-900/60 hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-700/60 text-slate-300">
                  Act {act.id}
                </span>
                <span className="truncate max-w-[150px]">{act.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                  {count}
                </span>
              </div>

              {/* Action buttons on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(act);
                  }}
                  className="p-0.5 text-slate-400 hover:text-white rounded"
                  title="Rename Act"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                {acts.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete ${act.title}? Any scenarios inside will move to Act 1.`)) {
                        deleteAct(act.id);
                      }
                    }}
                    className="p-0.5 text-slate-400 hover:text-rose-400 rounded"
                    title="Delete Act"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add New Act Button */}
        <button
          type="button"
          onClick={() => addAct()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 text-xs font-medium border border-dashed border-slate-700 hover:border-indigo-500/60 transition-colors"
          title="Add a new Act canvas to this campaign"
        >
          <Plus className="w-3 h-3 text-indigo-400" />
          <span>New Act</span>
        </button>
      </div>

      {/* Right: Global View Switcher */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveActId('ALL')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
            activeActId === 'ALL'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
          }`}
          title="View all campaign acts together on one unified canvas"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">All Acts (Global View)</span>
          <span className="sm:hidden">All Acts</span>
        </button>
      </div>
    </div>
  );
};
