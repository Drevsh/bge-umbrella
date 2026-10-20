import React from 'react';
import { Plus } from 'lucide-react';

interface TierSwimlaneHeaderProps {
  tiers: number[];
  onAddQuestInTier: (tier: number) => void;
}

export const TierSwimlaneHeader: React.FC<TierSwimlaneHeaderProps> = ({
  tiers,
  onAddQuestInTier
}) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-xl max-w-full min-w-0 select-none">
      <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
        <span className="hidden md:inline">Progression </span>Tiers
      </span>
      <div className="h-3 w-px bg-slate-700 shrink-0" />
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-[160px] xs:max-w-[220px] sm:max-w-[300px] lg:max-w-[420px] scrollbar-none">
        {tiers.map((t) => (
          <div
            key={t}
            className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-lg text-xs text-slate-200 border border-slate-700/60 shrink-0"
          >
            <span className="font-mono font-bold text-indigo-400">
              <span className="hidden sm:inline">Tier </span>
              <span className="sm:hidden">T</span>
              {t}
            </span>
            <button
              type="button"
              onClick={() => onAddQuestInTier(t)}
              className="hover:text-white hover:bg-slate-700 rounded p-0.5 transition-colors cursor-pointer"
              title={`Add Quest in Tier ${t}`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
