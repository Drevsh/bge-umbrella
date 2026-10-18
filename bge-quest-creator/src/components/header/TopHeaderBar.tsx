import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Printer,
  Columns,
  Maximize2,
  Table,
  Zap,
  AlignHorizontalSpaceAround,
  Key,
  Expand,
  Shrink,
  Layers,
  ChevronDown,
  RefreshCw,
  Gamepad2,
  MoreHorizontal
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
export const TopHeaderBar: React.FC = () => {
  const activeGameProfile = useCampaignStore((s) => s.activeGameProfile);
  const activeMetadata = useCampaignStore((s) => s.activeMetadata);
  const viewMode = useCampaignStore((s) => s.viewMode);
  const setViewMode = useCampaignStore((s) => s.setViewMode);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const selectedQuestId = useCampaignStore((s) => s.selectedQuestId);
  const autoArrangeCampaign = useCampaignStore((s) => s.autoArrangeCampaign);
  const activeActId = useCampaignStore((s) => s.activeActId);
  const acts = useCampaignStore((s) => s.acts);
  const toggleActDrawer = useCampaignStore((s) => s.toggleActDrawer);

  const currentActLabel = React.useMemo(() => {
    const actTerm = activeGameProfile.terminology?.actTerm || 'Act';
    if (activeActId === 'ALL') return `All ${actTerm}s`;
    const found = acts.find((a) => a.id === activeActId);
    return found ? `${actTerm} ${found.id}: ${found.title}` : `${actTerm} ${activeActId}`;
  }, [activeActId, acts, activeGameProfile]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isToolsMenuOpen) return;
    const handleClose = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClose);
    return () => window.removeEventListener('mousedown', handleClose);
  }, [isToolsMenuOpen]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Simulator
  const simulator = useCampaignStore((s) => s.simulator);
  const toggleSimulatorRewardChoice = useCampaignStore((s) => s.toggleSimulatorRewardChoice);
  const resetSimulator = useCampaignStore((s) => s.resetSimulator);

  const handleAutoAlign = () => {
    autoArrangeCampaign();
  };

  const handleForceReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.warn('Failed to clean caches:', e);
    }
    window.location.reload();
  };

  const isChoiceA = simulator.activeRewardChoices.includes('out-choice-a');
  const isChoiceB = simulator.activeRewardChoices.includes('out-choice-b');
  const isSecret = simulator.activeRewardChoices.includes('out-secret');

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-2 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3 select-none shrink-0 relative z-50 pt-[env(safe-area-inset-top)]">
      {/* Left: Branding & Campaign Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-sm sm:text-base">
            <span className="font-black">📜</span>
          </div>
          <div>
            <h1 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1 sm:gap-1.5 leading-tight">
              <span>QuestFlow</span>
              <span className="hidden md:inline text-slate-300">Studio</span>
              <span className="hidden lg:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-normal">
                v1.0
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[100px] sm:max-w-[180px] hidden sm:block">
              {activeMetadata.name}
            </p>
          </div>
        </div>

        {/* Game Workspace Switcher */}
        <button
          type="button"
          onClick={() => setModalOpen('gameManager', true)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/60 transition-colors shadow-sm text-xs font-semibold shrink-0 cursor-pointer"
          title="Switch Game Workspace & Ruleset"
        >
          <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="max-w-[70px] xs:max-w-[100px] sm:max-w-[130px] truncate">
            {activeGameProfile.name}
          </span>
          <ChevronDown className="w-3 h-3 text-emerald-400 shrink-0" />
        </button>

        {/* Act Overview Drawer Toggle Button */}
        <button
          type="button"
          onClick={toggleActDrawer}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 transition-colors shadow-sm text-xs font-semibold shrink-0"
          title="Open Campaign Acts Overview Drawer"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="max-w-[70px] xs:max-w-[110px] sm:max-w-[150px] truncate">
            {currentActLabel}
          </span>
          <ChevronDown className="w-3 h-3 text-indigo-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setModalOpen('campaignManager', true)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/80 transition-colors shrink-0"
          title="Switch or Manage Campaigns"
        >
          <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Campaigns</span>
        </button>
      </div>

      {/* Center: Playtest Simulator Quick Bar (Visible only on ultra-wide screens to prevent header overflow) */}
      <div className="hidden 2xl:flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800/80 shadow-inner shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Play className="w-3 h-3 text-cyan-400" />
          Playtest:
        </span>

        {/* Quick Toggles for M01 choices */}
        <button
          type="button"
          onClick={() => toggleSimulatorRewardChoice('out-choice-a', 'M01')}
          className={`text-xs px-2 py-0.5 rounded font-mono font-medium transition-all ${
            isChoiceA
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          +Idol_Kept
        </button>

        <button
          type="button"
          onClick={() => toggleSimulatorRewardChoice('out-choice-b', 'M01')}
          className={`text-xs px-2 py-0.5 rounded font-mono font-medium transition-all ${
            isChoiceB
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          +Idol_Broken
        </button>

        <button
          type="button"
          onClick={() => toggleSimulatorRewardChoice('out-secret', 'S01')}
          className={`text-xs px-2 py-0.5 rounded font-mono font-medium transition-all ${
            isSecret
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
              : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          +Secret_Passage
        </button>

        <div className="h-3 w-px bg-slate-800 mx-0.5" />

        <button
          type="button"
          onClick={resetSimulator}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
          title="Reset Simulation State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: View Mode & Primary Action CTAs */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* View Mode Segmented Control */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('FULL_GRAPH')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
              viewMode === 'FULL_GRAPH'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Full Graph (100% Canvas)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Canvas</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('SPLIT')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
              viewMode === 'SPLIT'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Split Graph + Inspector"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Split</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('OVERVIEW')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-all ${
              viewMode === 'OVERVIEW'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Campaign Matrix & Tag Audit"
          >
            <Table className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Matrix</span>
          </button>
        </div>

        {/* Auto-Align Button */}
        <button
          type="button"
          onClick={handleAutoAlign}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm shrink-0"
          title="Auto-Align Quests and Optimize Choice Order"
        >
          <AlignHorizontalSpaceAround className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden xl:inline">Auto-Align</span>
        </button>

        {/* Primary Add Quest CTA */}
        <button
          type="button"
          onClick={() => setModalOpen('wizard', true)}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors shrink-0"
          title="Add New Quest"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="font-semibold">+ Quest</span>
        </button>

        {/* Quick icon buttons visible on ultra-wide 2xl screens */}
        <div className="hidden 2xl:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setModalOpen('exportModal', true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center shrink-0 cursor-pointer"
            title="Export Campaign Data (JSON, CSV, Image)"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setModalOpen('printModal', true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center shrink-0 cursor-pointer"
            title="Print Scenario Card Sheets"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setModalOpen('apiKeyModal', true)}
            className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
              geminiApiKey
                ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border-slate-700'
                : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-700/60'
            }`}
            title={geminiApiKey ? 'Gemini API Key Configured' : 'Configure Gemini API Key'}
          >
            <Key className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleForceReload}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors flex items-center shrink-0 cursor-pointer"
            title="Force Update App (Purge PWA cache & reload latest build)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            title={isFullscreen ? 'Exit Immersive Fullscreen' : 'Enter Immersive Fullscreen'}
          >
            {isFullscreen ? (
              <Shrink className="w-3.5 h-3.5 text-indigo-400" />
            ) : (
              <Expand className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Responsive More Tools Dropdown (Visible on standard/laptop screens) */}
        <div className="relative 2xl:hidden" ref={toolsMenuRef}>
          <button
            type="button"
            onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
            className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
              isToolsMenuOpen
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="More Options & Tools"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isToolsMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-800">
              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen('exportModal', true);
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white text-left transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Export Campaign...</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen('printModal', true);
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white text-left transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Print Card Sheets...</span>
                </button>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen('apiKeyModal', true);
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white text-left transition-colors cursor-pointer"
                >
                  <Key className="w-4 h-4 text-amber-400" />
                  <div className="flex flex-col">
                    <span>Gemini API Key</span>
                    <span className="text-[10px] text-slate-400">
                      {geminiApiKey ? 'Configured' : 'Not set'}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toggleFullscreen();
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white text-left transition-colors cursor-pointer"
                >
                  {isFullscreen ? (
                    <Shrink className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Expand className="w-4 h-4 text-indigo-400" />
                  )}
                  <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleForceReload();
                    setIsToolsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white text-left transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  <span>Force Reload App</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
