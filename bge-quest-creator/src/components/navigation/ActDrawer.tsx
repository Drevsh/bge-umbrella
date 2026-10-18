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
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { CampaignAct } from '../../types/campaign';

export const ActDrawer: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.isActDrawerOpen);
  const setOpen = useCampaignStore((s) => s.setActDrawerOpen);
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

  const totalQuests = Object.keys(quests).length;

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 animate-in fade-in duration-200"
        onClick={() => setOpen(false)}
      />

      {/* Slide-out Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-left duration-250 select-none">
        {/* Drawer Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Campaign Acts</h3>
              <p className="text-[10px] text-slate-400">Manage campaign narrative chapters</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* Global View Option */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 px-1">
              Global Overview
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveActId('ALL');
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                activeActId === 'ALL'
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-950'
                  : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeActId === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold">All Acts (Unified Canvas)</div>
                  <div className="text-[10px] text-slate-400">View entire campaign graph</div>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700/60 text-slate-400">
                {totalQuests}
              </span>
            </button>
          </div>

          {/* Act List */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Acts ({acts.length})
              </span>
              <button
                type="button"
                onClick={() => addAct()}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3 h-3" />
                Add Act
              </button>
            </div>

            <div className="space-y-2">
              {acts.map((act) => {
                const isActive = activeActId === act.id;
                const isEditing = editingActId === act.id;
                const count = questCountByAct[act.id] || 0;

                if (isEditing) {
                  return (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-indigo-500 shadow-lg space-y-2"
                    >
                      <div className="text-[10px] font-mono font-bold text-indigo-400">
                        Renaming Act {act.id}
                      </div>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(act.id);
                          if (e.key === 'Escape') setEditingActId(null);
                        }}
                        autoFocus
                        placeholder="Act Title"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingActId(null)}
                          className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveRename(act.id)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      setActiveActId(act.id);
                      setOpen(false);
                    }}
                    className={`group flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-slate-800 text-indigo-200 border-indigo-500 shadow-md shadow-indigo-950/60'
                        : 'bg-slate-950/50 hover:bg-slate-800/50 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {act.id}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate group-hover:text-white">
                          {act.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {count} {count === 1 ? 'quest' : 'quests'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(act);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                        title="Rename Act"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>

                      {acts.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${act.title}"? Any quests in this act will move to Act 1.`)) {
                              deleteAct(act.id);
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700/60 transition-colors"
                          title="Delete Act"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select an act to switch canvas</span>
          </div>
          <button
            type="button"
            onClick={() => addAct()}
            className="p-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm"
            title="Create New Act"
          >
            <Plus className="w-3 h-3" />
            <span>New</span>
          </button>
        </div>
      </div>
    </>
  );
};
