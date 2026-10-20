import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  GitBranch,
  Layers,
  ChevronDown,
  Sliders,
  Route,
  Zap,
  Lock,
  Grid,
  Check,
  Sparkles,
  ChevronsDownUp,
  ChevronsUpDown,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  ArrowUpRight
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { EdgeRoutingStyle } from '../../types/campaign';
import { LayoutAlgorithmType, DEFAULT_NODE_WIDTH } from '../../utils/layoutEngine';
import { CampaignLintReport, CampaignLintIssue } from '../../utils/campaignLinter';

interface CanvasGraphToolbarProps {
  lintReport?: CampaignLintReport;
}

export const CanvasGraphToolbar: React.FC<CanvasGraphToolbarProps> = ({ lintReport }) => {
  const quests = useCampaignStore((s) => s.quests);
  const activeActId = useCampaignStore((s) => s.activeActId);
  const setActiveActId = useCampaignStore((s) => s.setActiveActId);
  const selectQuest = useCampaignStore((s) => s.selectQuest);
  const collapsedQuestUids = useCampaignStore((s) => s.collapsedQuestUids);
  const setAllQuestNodesCollapsed = useCampaignStore((s) => s.setAllQuestNodesCollapsed);

  const edgeRoutingStyle = useCampaignStore((s) => s.edgeRoutingStyle);
  const setEdgeRoutingStyle = useCampaignStore((s) => s.setEdgeRoutingStyle);
  const edgeVisibility = useCampaignStore((s) => s.edgeVisibility);
  const toggleEdgeVisibility = useCampaignStore((s) => s.toggleEdgeVisibility);
  const hSpacingPreset = useCampaignStore((s) => s.hSpacingPreset);
  const vSpacingScale = useCampaignStore((s) => s.vSpacingScale);
  const setSpacing = useCampaignStore((s) => s.setSpacing);
  const layoutAlgorithm = useCampaignStore((s) => s.layoutAlgorithm);
  const autoArrangeCampaign = useCampaignStore((s) => s.autoArrangeCampaign);
  const snapToGrid = useCampaignStore((s) => s.snapToGrid);
  const toggleSnapToGrid = useCampaignStore((s) => s.toggleSnapToGrid);
  const smartRouteAllEdges = useCampaignStore((s) => s.smartRouteAllEdges);

  const { setCenter } = useReactFlow();

  const [activeMenu, setActiveMenu] = useState<'routing' | 'layers' | 'linter' | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const visibleQuests = useMemo(
    () =>
      Object.values(quests).filter(
        (q) => activeActId === 'ALL' || (q.act || 1) === activeActId
      ),
    [quests, activeActId]
  );

  const collapsedCount = useMemo(
    () => visibleQuests.filter((q) => Boolean(collapsedQuestUids[q.uid])).length,
    [visibleQuests, collapsedQuestUids]
  );
  const allCollapsed = visibleQuests.length > 0 && collapsedCount === visibleQuests.length;

  const handleFocusQuestIssue = (issue: CampaignLintIssue) => {
    const targetQuest = quests[issue.questUid];
    if (!targetQuest) return;
    if (activeActId !== 'ALL' && (targetQuest.act || 1) !== activeActId) {
      setActiveActId(targetQuest.act || 1);
    }
    selectQuest(issue.questUid);
    const centerX = targetQuest.position.x + DEFAULT_NODE_WIDTH / 2;
    const centerY = targetQuest.position.y + 120;
    setTimeout(() => {
      setCenter(centerX, centerY, { zoom: 1.05, duration: 350 });
    }, 30);
    setActiveMenu(null);
  };

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute active layer count
  const activeLayersCount = Object.values(edgeVisibility).filter(Boolean).length;
  const allLayersActive = activeLayersCount === 4;

  const routingLabel =
    edgeRoutingStyle === 'BEZIER'
      ? 'Curved'
      : edgeRoutingStyle === 'STEP'
      ? 'Orthogonal'
      : 'Straight';

  return (
    <div
      ref={toolbarRef}
      className={`relative flex items-center gap-1.5 sm:gap-2 pointer-events-auto select-none shrink-0 ${
        activeMenu ? 'z-40' : 'z-20'
      }`}
    >
      {/* 1. Routing Pill */}
      <div className="relative">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenu((prev) => (prev === 'routing' ? null : 'routing'));
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md shadow-xl transition-all active:scale-95 ${
            activeMenu === 'routing'
              ? 'bg-slate-800 text-white border-indigo-500 ring-2 ring-indigo-500/30'
              : 'bg-slate-900/90 text-slate-200 border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600'
          }`}
          title="Edge Routing, Spacing & Auto-Route"
        >
          <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{routingLabel}</span>
          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
              activeMenu === 'routing' ? 'rotate-180 text-indigo-400' : ''
            }`}
          />
        </button>

        {/* Routing Popover Menu */}
        {activeMenu === 'routing' && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-2 w-72 p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                Edge Routing & Spacing
              </span>
            </div>

            {/* Geometry Style */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Connection Curves
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['BEZIER', 'STEP', 'STRAIGHT'] as EdgeRoutingStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      setEdgeRoutingStyle(style);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      edgeRoutingStyle === style
                        ? 'bg-indigo-600 text-white shadow-md font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {style === 'BEZIER' ? 'Curved' : style === 'STEP' ? 'Orthogonal' : 'Straight'}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-Layout Algorithm */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Auto-Layout Engine
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(
                  [
                    { id: 'TIERED', label: 'Tiered' },
                    { id: 'DAGRE_TREE', label: 'Dagre Tree' },
                    { id: 'DAGRE_NETWORK', label: 'Simplex' }
                  ] as { id: LayoutAlgorithmType; label: string }[]
                ).map((alg) => (
                  <button
                    key={alg.id}
                    type="button"
                    onClick={() => {
                      autoArrangeCampaign({ algorithm: alg.id });
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      layoutAlgorithm === alg.id
                        ? 'bg-emerald-700/80 text-white shadow-md font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {alg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horizontal Spacing Preset */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-slate-400" />
                Column Spacing
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['COMPACT', 'BALANCED', 'WIDE'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSpacing(preset, vSpacingScale);
                      setTimeout(() => autoArrangeCampaign(), 0);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      hSpacingPreset === preset
                        ? 'bg-slate-800 text-white shadow-md font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {preset.charAt(0) + preset.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Route Edges Button */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  autoArrangeCampaign();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white text-xs font-semibold transition-all shadow-md active:scale-98 cursor-pointer"
                title="Run Auto-Layout & Port Alignment"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Align Nodes & Ports</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  smartRouteAllEdges();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white text-xs font-semibold transition-all shadow-md active:scale-98 cursor-pointer"
                title="Automatically route edges around quest nodes using A* Manhattan pathfinding"
              >
                <Route className="w-3.5 h-3.5 text-indigo-400" />
                <span>A* Smart Route Edges</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Layers Pill */}
      <div className="relative">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenu((prev) => (prev === 'layers' ? null : 'layers'));
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md shadow-xl transition-all active:scale-95 ${
            activeMenu === 'layers'
              ? 'bg-slate-800 text-white border-indigo-500 ring-2 ring-indigo-500/30'
              : 'bg-slate-900/90 text-slate-200 border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600'
          }`}
          title="Toggle Connection Layers & Grid Snapping"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Layers</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
              allLayersActive
                ? 'bg-slate-800 text-slate-300'
                : 'bg-amber-950 text-amber-300 border border-amber-700/60'
            }`}
          >
            {activeLayersCount}/4
          </span>
          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
              activeMenu === 'layers' ? 'rotate-180 text-indigo-400' : ''
            }`}
          />
        </button>

        {/* Layers Popover Menu */}
        {activeMenu === 'layers' && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-2 w-64 p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Connection Layers
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {activeLayersCount} visible
              </span>
            </div>

            {/* Layer Toggles */}
            <div className="space-y-1.5">
              {/* Unlocks */}
              <button
                type="button"
                onClick={() => toggleEdgeVisibility('unlocks')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  edgeVisibility.unlocks
                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/70 font-semibold'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${edgeVisibility.unlocks ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span>Unlocks (Progression)</span>
                </div>
                {edgeVisibility.unlocks && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              {/* Choices */}
              <button
                type="button"
                onClick={() => toggleEdgeVisibility('choices')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  edgeVisibility.choices
                    ? 'bg-sky-950/70 text-sky-300 border-sky-700/70 font-semibold'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${edgeVisibility.choices ? 'bg-sky-400' : 'bg-slate-600'}`} />
                  <span>Choices (Branching)</span>
                </div>
                {edgeVisibility.choices && <Check className="w-3.5 h-3.5 text-sky-400" />}
              </button>

              {/* Mutations */}
              <button
                type="button"
                onClick={() => toggleEdgeVisibility('mutations')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  edgeVisibility.mutations
                    ? 'bg-amber-950/70 text-amber-300 border-amber-700/70 font-semibold'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap className={`w-3.5 h-3.5 ${edgeVisibility.mutations ? 'text-amber-400' : 'text-slate-600'}`} />
                  <span>Mutations (State Tags)</span>
                </div>
                {edgeVisibility.mutations && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              {/* Lockouts */}
              <button
                type="button"
                onClick={() => toggleEdgeVisibility('lockouts')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  edgeVisibility.lockouts
                    ? 'bg-rose-950/70 text-rose-300 border-rose-700/70 font-semibold'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lock className={`w-3.5 h-3.5 ${edgeVisibility.lockouts ? 'text-rose-400' : 'text-slate-600'}`} />
                  <span>Lockouts (Mutual Exclusion)</span>
                </div>
                {edgeVisibility.lockouts && <Check className="w-3.5 h-3.5 text-rose-400" />}
              </button>
            </div>

            {/* Grid Snapping */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={toggleSnapToGrid}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  snapToGrid
                    ? 'bg-indigo-950/70 text-indigo-300 border-indigo-700/70 font-semibold'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Grid className={`w-3.5 h-3.5 ${snapToGrid ? 'text-indigo-400' : 'text-slate-600'}`} />
                  <span>Snap to 16px Grid</span>
                </div>
                {snapToGrid && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Compact / Expand All Nodes Toggle Pill */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setAllQuestNodesCollapsed(!allCollapsed);
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md shadow-xl transition-all active:scale-95 cursor-pointer ${
          allCollapsed
            ? 'bg-indigo-950/90 text-indigo-200 border-indigo-500/80 hover:bg-indigo-900/90'
            : collapsedCount > 0
            ? 'bg-slate-900/90 text-indigo-300 border-indigo-700/70 hover:bg-slate-800/90'
            : 'bg-slate-900/90 text-slate-200 border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600'
        }`}
        title={
          allCollapsed
            ? 'Expand all quest cards on the canvas'
            : 'Collapse all quest cards into compact mode'
        }
      >
        {allCollapsed ? (
          <>
            <ChevronsUpDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Expand Cards</span>
          </>
        ) : (
          <>
            <ChevronsDownUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Compact</span>
            {collapsedCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-bold">
                {collapsedCount}/{visibleQuests.length}
              </span>
            )}
          </>
        )}
      </button>

      {/* 4. Graph Validation & Linter Pill */}
      {lintReport && (
        <div className="relative">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu((prev) => (prev === 'linter' ? null : 'linter'));
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md shadow-xl transition-all active:scale-95 cursor-pointer ${
              activeMenu === 'linter'
                ? 'bg-slate-800 text-white border-indigo-500 ring-2 ring-indigo-500/30'
                : lintReport.errorCount > 0
                ? 'bg-rose-950/90 text-rose-200 border-rose-600/80 hover:bg-rose-900/90'
                : lintReport.warningCount > 0
                ? 'bg-amber-950/90 text-amber-200 border-amber-600/80 hover:bg-amber-900/90'
                : 'bg-slate-900/90 text-emerald-300 border-slate-700/80 hover:bg-slate-800/90 hover:border-slate-600'
            }`}
            title="Campaign Graph Validation & Linter Diagnostics"
          >
            {lintReport.errorCount > 0 ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : lintReport.warningCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}

            <span>Validate</span>

            {lintReport.errorCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-rose-900/90 text-rose-100 border border-rose-500/60 font-bold">
                {lintReport.errorCount} err
              </span>
            )}
            {lintReport.warningCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-900/90 text-amber-100 border border-amber-500/60 font-bold">
                {lintReport.warningCount} warn
              </span>
            )}
            {lintReport.errorCount === 0 && lintReport.warningCount === 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 font-bold">
                OK
              </span>
            )}

            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                activeMenu === 'linter' ? 'rotate-180 text-indigo-400' : ''
              }`}
            />
          </button>

          {/* Linter Diagnostics Popover */}
          {activeMenu === 'linter' && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 mt-2 w-80 sm:w-96 p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl space-y-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
                  Graph Validation & Linter
                </span>
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-rose-400 font-bold">{lintReport.errorCount}E</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-400 font-bold">{lintReport.warningCount}W</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-sky-400 font-bold">{lintReport.infoCount}I</span>
                </div>
              </div>

              {lintReport.issues.length === 0 ? (
                <div className="py-6 text-center space-y-1.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto" />
                  <p className="text-xs font-semibold text-emerald-300">
                    All campaign graph checks passed!
                  </p>
                  <p className="text-[11px] text-slate-400">
                    No unreachable state tags, impossible gates, or disconnected quests detected.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {lintReport.issues.map((issue) => {
                    const isErr = issue.severity === 'error';
                    const isWarn = issue.severity === 'warning';
                    return (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => handleFocusQuestIssue(issue)}
                        className={`w-full text-left p-2 rounded-xl border transition-all flex items-start gap-2 group cursor-pointer ${
                          isErr
                            ? 'bg-rose-950/40 hover:bg-rose-950/70 border-rose-800/70 text-rose-200'
                            : isWarn
                            ? 'bg-amber-950/35 hover:bg-amber-950/65 border-amber-800/60 text-amber-200'
                            : 'bg-slate-950/60 hover:bg-slate-800/70 border-slate-800 text-slate-300'
                        }`}
                      >
                        {isErr ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        ) : isWarn ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold truncate">
                              [{issue.questCode}] {issue.questTitle}
                            </span>
                            <span className="text-[9px] font-mono uppercase tracking-wider opacity-75 flex items-center gap-0.5 shrink-0">
                              Jump
                              <ArrowUpRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </span>
                          </div>
                          <p className="text-[10px] opacity-90 leading-snug mt-0.5">
                            {issue.message}
                          </p>
                          {issue.suggestion && (
                            <p className="text-[9px] opacity-70 italic leading-snug mt-0.5">
                              {issue.suggestion}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
