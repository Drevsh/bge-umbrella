import React, { useState } from 'react';
import {
  X,
  Plus,
  Copy,
  Trash2,
  FolderOpen,
  CheckCircle2,
  Clock,
  FileText,
  Edit2
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';

export const CampaignManagerModal: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.modals.campaignManager);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);
  const catalog = useCampaignStore((s) => s.campaignCatalog);
  const activeCampaignId = useCampaignStore((s) => s.activeCampaignId);
  const switchCampaign = useCampaignStore((s) => s.switchCampaign);
  const createCampaign = useCampaignStore((s) => s.createCampaign);
  const duplicateCampaign = useCampaignStore((s) => s.duplicateCampaign);
  const deleteCampaign = useCampaignStore((s) => s.deleteCampaign);
  const renameActiveCampaign = useCampaignStore((s) => s.renameActiveCampaign);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setModalOpen('campaignManager', false);
    setIsCreating(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCampaign(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Campaign Project Manager
              </h3>
              <p className="text-[11px] text-slate-400">
                Manage, switch, or duplicate your local-first campaigns stored in IndexedDB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Create Button / Form */}
          {isCreating ? (
            <div className="p-3 bg-slate-950 border border-indigo-500/50 rounded-xl space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Campaign Name (e.g. Dragon Eclipse: Expansion Act)"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <textarea
                rows={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Campaign description / notes..."
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded text-xs"
                >
                  Create Campaign
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-slate-900/60 text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              + Create New Campaign
            </button>
          )}

          {/* Campaign List */}
          <div className="space-y-2 pt-2">
            {catalog.map((camp) => {
              const isActive = camp.id === activeCampaignId;
              return (
                <div
                  key={camp.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500/70 shadow-md'
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      switchCampaign(camp.id);
                      handleClose();
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-xs text-slate-100 flex items-center gap-1.5">
                        {camp.name}
                        {isActive && (
                          <span className="text-[10px] bg-indigo-900 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                            Active
                          </span>
                        )}
                      </h4>
                    </div>
                    {camp.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-1 mb-1">
                        {camp.description}
                      </p>
                    )}
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Updated {new Date(camp.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => duplicateCampaign(camp.id)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Duplicate Campaign"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {catalog.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete campaign "${camp.name}"?`)) {
                            deleteCampaign(camp.id);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
