import React, { useState } from 'react';
import {
  X,
  Plus,
  Gamepad2,
  CheckCircle2,
  Trash2,
  Download,
  Upload,
  BookOpen,
  Sparkles,
  Layers,
  Coins
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { GameProfile, GameCategoryDef, GameRewardResourceDef } from '../../types/gameProfile';

export const GameManagerModal: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.modals.gameManager);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);
  const installedGames = useCampaignStore((s) => s.installedGames);
  const activeGameId = useCampaignStore((s) => s.activeGameId);
  const activeGameProfile = useCampaignStore((s) => s.activeGameProfile);
  const switchGame = useCampaignStore((s) => s.switchGame);
  const createGameProfile = useCampaignStore((s) => s.createGameProfile);
  const deleteGameProfile = useCampaignStore((s) => s.deleteGameProfile);

  const [isCreating, setIsCreating] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newQuestTerm, setNewQuestTerm] = useState('Quest');
  const [newActTerm, setNewActTerm] = useState('Act');
  const [newTierTerm, setNewTierTerm] = useState('Tier');
  const [newCampaignTerm, setNewCampaignTerm] = useState('Campaign');

  const [newCategories, setNewCategories] = useState<GameCategoryDef[]>([
    {
      id: 'MAIN',
      label: 'Main Quest',
      color: '#3b82f6',
      defaultCodePrefix: 'M',
      badgeStyle: 'border-blue-500/60 bg-blue-950/40 text-blue-300'
    },
    {
      id: 'SIDE',
      label: 'Side Quest',
      color: '#10b981',
      defaultCodePrefix: 'S',
      badgeStyle: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
    },
    {
      id: 'BOSS',
      label: 'Boss Encounter',
      color: '#f43f5e',
      defaultCodePrefix: 'B',
      badgeStyle: 'border-rose-500/70 bg-rose-950/40 text-rose-300'
    }
  ]);

  const [newResources, setNewResources] = useState<GameRewardResourceDef[]>([
    { key: 'gold', label: 'Gold', type: 'number', defaultValue: 0, icon: 'Coins' }
  ]);

  const [catInputId, setCatInputId] = useState('');
  const [catInputLabel, setCatInputLabel] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setModalOpen('gameManager', false);
    setIsCreating(false);
  };

  const handleSwitch = async (gameId: string) => {
    await switchGame(gameId);
    handleClose();
  };

  const handleExportProfile = (profile: GameProfile) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `game-profile-${profile.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string) as GameProfile;
        if (!parsed.id || !parsed.name) {
          alert('Invalid Game Profile file format: missing ID or Name.');
          return;
        }
        await createGameProfile({
          ...parsed,
          isBuiltIn: false
        });
        alert(`Successfully imported game profile: "${parsed.name}"!`);
      } catch (err) {
        console.error('Import game profile failed:', err);
        alert('Failed to parse Game Profile JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAddCategory = () => {
    if (!catInputId.trim() || !catInputLabel.trim()) return;
    const cleanId = catInputId.trim().toUpperCase().replace(/\s+/g, '_');
    if (newCategories.some((c) => c.id === cleanId)) return;

    setNewCategories((prev) => [
      ...prev,
      {
        id: cleanId,
        label: catInputLabel.trim(),
        color: '#64748b',
        defaultCodePrefix: cleanId.slice(0, 2),
        badgeStyle: 'border-slate-500/60 bg-slate-800/40 text-slate-300'
      }
    ]);
    setCatInputId('');
    setCatInputLabel('');
  };

  const handleRemoveCategory = (catId: string) => {
    setNewCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  const handleCreateGame = async () => {
    if (!newName.trim()) return;
    const gameId = newId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || `game-${Date.now()}`;

    const profile: GameProfile = {
      id: gameId,
      name: newName.trim(),
      description: newDesc.trim() || 'Custom game profile',
      version: '1.0.0',
      icon: 'Gamepad2',
      themeColor: '#10b981',
      isBuiltIn: false,
      terminology: {
        questTerm: newQuestTerm.trim() || 'Quest',
        questsTermPlural: `${newQuestTerm.trim() || 'Quest'}s`,
        actTerm: newActTerm.trim() || 'Act',
        actsTermPlural: `${newActTerm.trim() || 'Act'}s`,
        tierTerm: newTierTerm.trim() || 'Tier',
        campaignTerm: newCampaignTerm.trim() || 'Campaign'
      },
      categories: newCategories,
      rewardResources: newResources
    };

    await createGameProfile(profile);
    setIsCreating(false);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Game Workspace Manager</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  Active: {activeGameProfile.name}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Switch between game universes or define custom schema, categories, and resources
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Header Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Installed Games ({installedGames.length})
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Import Profile</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportProfile}
                  className="hidden"
                />
              </label>

              {!isCreating && (
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Custom Game</span>
                </button>
              )}
            </div>
          </div>

          {/* Creation Form */}
          {isCreating && (
            <div className="p-4 bg-slate-950 border border-emerald-500/50 rounded-xl space-y-3 animate-in fade-in duration-100">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Define New Game Profile
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Game Title *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (!newId || newId.startsWith('game-') || newId === newName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')) {
                        setNewId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
                      }
                    }}
                    placeholder="e.g. Gloomhaven, Frosthaven, Sci-Fi Odyssey"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Unique Game ID
                  </label>
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="e.g. gloomhaven-custom"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief summary of game rules and scenario flow"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Terminology Settings */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  Terminology Mapping
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Quest Term</span>
                    <input
                      type="text"
                      value={newQuestTerm}
                      onChange={(e) => setNewQuestTerm(e.target.value)}
                      placeholder="Quest / Scenario"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Act Term</span>
                    <input
                      type="text"
                      value={newActTerm}
                      onChange={(e) => setNewActTerm(e.target.value)}
                      placeholder="Act / Chapter"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Tier Term</span>
                    <input
                      type="text"
                      value={newTierTerm}
                      onChange={(e) => setNewTierTerm(e.target.value)}
                      placeholder="Tier / Danger Level"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Campaign Term</span>
                    <input
                      type="text"
                      value={newCampaignTerm}
                      onChange={(e) => setNewCampaignTerm(e.target.value)}
                      placeholder="Campaign / Chronicle"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  Node Categories ({newCategories.length})
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {newCategories.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-slate-700 bg-slate-900 text-slate-300"
                    >
                      <span className="font-semibold">{c.label}</span>
                      <span className="text-[10px] font-mono text-slate-500">({c.id})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategory(c.id)}
                        className="text-slate-500 hover:text-rose-400 ml-1 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={catInputId}
                    onChange={(e) => setCatInputId(e.target.value)}
                    placeholder="CODE (e.g. EVENT)"
                    className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200"
                  />
                  <input
                    type="text"
                    value={catInputLabel}
                    onChange={(e) => setCatInputLabel(e.target.value)}
                    placeholder="Display Label (e.g. World Event)"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newName.trim()}
                  onClick={handleCreateGame}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50 transition-colors shadow cursor-pointer"
                >
                  Save & Switch to Game
                </button>
              </div>
            </div>
          )}

          {/* List of Game Profiles */}
          <div className="space-y-2.5">
            {installedGames.map((game) => {
              const isActive = game.id === activeGameId;
              return (
                <div
                  key={game.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-slate-800/90 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">{game.name}</span>
                        {game.isBuiltIn ? (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                            Built-in
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                            Custom
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">v{game.version}</span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {game.description}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-cyan-400" />
                          <span>{game.categories?.length || 0} categories</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-amber-400" />
                          <span>Terminology: {game.terminology.questTerm} / {game.terminology.actTerm}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportProfile(game)}
                        title="Export Game Profile JSON"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/80 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      {!game.isBuiltIn && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete custom game profile "${game.name}"?`)) {
                              deleteGameProfile(game.id);
                            }
                          }}
                          title="Delete Custom Game Profile"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700/80 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isActive ? (
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 text-xs font-medium border border-emerald-700/60">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSwitch(game.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow transition-colors cursor-pointer"
                        >
                          Switch
                        </button>
                      )}
                    </div>
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
