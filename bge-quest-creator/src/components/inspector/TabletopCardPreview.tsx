import React from 'react';
import { Sparkles, Zap, Shield, Target } from 'lucide-react';
import { QuestModel, QuestVariantOverride } from '../../types/campaign';
import { OutcomeEffectsBadges } from './OutcomeEffectsEditor';

interface TabletopCardPreviewProps {
  quest: QuestModel;
  activeVariants: QuestVariantOverride[];
}

export const TabletopCardPreview: React.FC<TabletopCardPreviewProps> = ({
  quest,
  activeVariants
}) => {
  // Merge titles and texts with active variants
  const activeTitleOverride = activeVariants.find((v) => v.overrideTitle)?.overrideTitle;
  const displayTitle = activeTitleOverride || quest.title;

  return (
    <div className="rounded-xl overflow-hidden border border-amber-950/80 bg-gradient-to-b from-[#2a241e] via-[#1f1a14] to-[#17130e] text-[#f4ebd0] p-4 shadow-2xl font-serif relative">
      {/* Subtle parchment border styling */}
      <div className="absolute inset-1 border border-amber-800/30 rounded-lg pointer-events-none" />

      {/* Header */}
      <div className="border-b border-amber-800/40 pb-2 mb-3">
        <div className="flex items-center justify-between text-[11px] font-sans uppercase tracking-widest text-amber-400/80 mb-1">
          <span>{quest.code} • Tier {quest.tier}</span>
          <span className="font-semibold">{quest.category.replace('_', ' ')}</span>
        </div>
        <h4 className="text-lg font-bold text-amber-200 tracking-wide font-serif leading-tight">
          {displayTitle}
        </h4>
        {activeTitleOverride && (
          <div className="text-[10px] font-sans text-amber-400/90 flex items-center gap-1 mt-0.5">
            <Zap className="w-3 h-3 text-amber-400" />
            Title altered by active state tag
          </div>
        )}
      </div>

      {/* Flavor Narrative */}
      <div className="mb-3 text-xs italic text-[#e6dcbe] leading-relaxed relative pl-3 border-l-2 border-amber-700/50">
        <p>{quest.flavorText || 'No narrative flavor text provided.'}</p>
        {activeVariants.map(
          (v) =>
            v.additionalFlavorText && (
              <p
                key={v.id}
                className="mt-1.5 text-amber-300 not-italic font-sans text-[11px] bg-amber-950/60 p-1.5 rounded border border-amber-800/50"
              >
                <strong className="text-amber-200 block text-[10px] uppercase font-mono mb-0.5">
                  ⚡ [{v.requiredStateTag}] Override:
                </strong>
                {v.additionalFlavorText}
              </p>
            )
        )}
      </div>

      {/* Objectives */}
      <div className="mb-3 bg-black/30 p-2.5 rounded border border-amber-900/40 font-sans text-xs">
        <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase tracking-wider text-[10px] mb-1">
          <Target className="w-3.5 h-3.5" />
          Objectives
        </div>
        <p className="text-slate-200">{quest.objectives || 'Complete the scenario conditions.'}</p>
      </div>

      {/* Setup Instructions */}
      <div className="mb-3 font-sans text-xs bg-black/40 p-2.5 rounded border border-amber-900/40">
        <div className="flex items-center gap-1.5 text-amber-300 font-bold uppercase tracking-wider text-[10px] mb-1">
          <Shield className="w-3.5 h-3.5" />
          Setup Instructions
        </div>
        <p className="text-slate-300">{quest.setupInstructions || 'Standard scenario board setup.'}</p>

        {activeVariants.map(
          (v) =>
            v.setupModifications && (
              <div
                key={v.id}
                className="mt-2 text-amber-200 text-[11px] bg-amber-950/80 p-2 rounded border border-amber-700/80 font-mono"
              >
                <div className="text-[10px] uppercase text-amber-400 font-bold flex items-center gap-1 mb-0.5">
                  <Zap className="w-3 h-3" />
                  Variant Rule [{v.requiredStateTag}]:
                </div>
                {v.setupModifications}
              </div>
            )
        )}
      </div>

      {/* Rewards Footnote */}
      <div className="border-t border-amber-800/40 pt-2 font-sans text-[10px] text-amber-400/90 flex flex-wrap gap-2">
        {quest.rewardOutcomes.map((r) => (
          <div
            key={r.id}
            className="bg-amber-950/70 border border-amber-800/60 px-2 py-1 rounded flex flex-wrap items-center gap-1.5"
          >
            <span>{r.label}</span>
            <OutcomeEffectsBadges values={r} />
          </div>
        ))}
      </div>
    </div>
  );
};
