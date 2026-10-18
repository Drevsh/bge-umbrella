import {
  GitBranch,
  Grid,
  Zap,
  Lock,
  Compass,
  Sliders,
  Move,
  Route
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { EdgeRoutingStyle } from '../../types/campaign';

export const GraphOptionsBar: React.FC = () => {
  const edgeRoutingStyle = useCampaignStore((s) => s.edgeRoutingStyle);
  const setEdgeRoutingStyle = useCampaignStore((s) => s.setEdgeRoutingStyle);
  const edgeVisibility = useCampaignStore((s) => s.edgeVisibility);
  const toggleEdgeVisibility = useCampaignStore((s) => s.toggleEdgeVisibility);
  const hSpacingPreset = useCampaignStore((s) => s.hSpacingPreset);
  const vSpacingScale = useCampaignStore((s) => s.vSpacingScale);
  const setSpacing = useCampaignStore((s) => s.setSpacing);
  const snapToGrid = useCampaignStore((s) => s.snapToGrid);
  const toggleSnapToGrid = useCampaignStore((s) => s.toggleSnapToGrid);
  const smartRouteAllEdges = useCampaignStore((s) => s.smartRouteAllEdges);

  return (
    <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-3 text-xs select-none shrink-0 z-20 overflow-x-auto scrollbar-none">
      {/* Edge Routing Style */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5 text-slate-400">
          <GitBranch className="w-3.5 h-3.5" />
          <span className="font-medium text-[11px]">Routing:</span>
        </div>
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {(['BEZIER', 'STEP', 'STRAIGHT'] as EdgeRoutingStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setEdgeRoutingStyle(style)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                edgeRoutingStyle === style
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {style === 'BEZIER' ? 'Curved' : style === 'STEP' ? 'Orthogonal' : 'Straight'}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Spacing Presets */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <Sliders className="w-3.5 h-3.5" />
          <span className="font-medium text-[11px]">Spacing:</span>
        </div>
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {(['COMPACT', 'BALANCED', 'WIDE'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setSpacing(preset, vSpacingScale)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                hSpacingPreset === preset
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset.charAt(0) + preset.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Smart Route Obstacle Avoidance Button */}
        <button
          type="button"
          onClick={smartRouteAllEdges}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white text-[11px] font-semibold transition-all shadow-sm"
          title="Automatically route edges around quest nodes to prevent crossing cards"
        >
          <Route className="w-3.5 h-3.5 text-indigo-400" />
          <span>Smart Route Edges</span>
        </button>
      </div>

      {/* Edge Filter Layer Toggles & Grid Snap */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">Layers:</span>

        {/* Unlocks Filter */}
        <button
          type="button"
          onClick={() => toggleEdgeVisibility('unlocks')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border transition-all ${
            edgeVisibility.unlocks
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
              : 'bg-slate-950 text-slate-600 border-slate-800'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Unlocks
        </button>

        {/* Choices Filter */}
        <button
          type="button"
          onClick={() => toggleEdgeVisibility('choices')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border transition-all ${
            edgeVisibility.choices
              ? 'bg-sky-950/80 text-sky-300 border-sky-700/80'
              : 'bg-slate-950 text-slate-600 border-slate-800'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Choices
        </button>

        {/* Mutations Filter */}
        <button
          type="button"
          onClick={() => toggleEdgeVisibility('mutations')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border transition-all ${
            edgeVisibility.mutations
              ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
              : 'bg-slate-950 text-slate-600 border-slate-800'
          }`}
        >
          <Zap className="w-2.5 h-2.5" />
          Mutations
        </button>

        {/* Lockouts Filter */}
        <button
          type="button"
          onClick={() => toggleEdgeVisibility('lockouts')}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border transition-all ${
            edgeVisibility.lockouts
              ? 'bg-rose-950/80 text-rose-300 border-rose-700/80'
              : 'bg-slate-950 text-slate-600 border-slate-800'
          }`}
        >
          <Lock className="w-2.5 h-2.5" />
          Lockouts
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Snap to Grid */}
        <button
          type="button"
          onClick={toggleSnapToGrid}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-all ${
            snapToGrid
              ? 'bg-indigo-950 text-indigo-300 border-indigo-700/60'
              : 'bg-slate-950 text-slate-500 border-slate-800'
          }`}
          title="Toggle 16px Grid Snapping"
        >
          <Grid className="w-3 h-3" />
          <span>Snap 16px</span>
        </button>
      </div>
    </div>
  );
};
