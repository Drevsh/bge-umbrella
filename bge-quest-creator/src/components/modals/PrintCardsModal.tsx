import React from 'react';
import { X, Printer } from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { TabletopCardPreview } from '../inspector/TabletopCardPreview';

export const PrintCardsModal: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.modals.printModal);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);
  const quests = useCampaignStore((s) => s.quests);

  if (!isOpen) return null;

  const questList = Object.values(quests).sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.code.localeCompare(b.code);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Print Tabletop Scenario Cards
              </h3>
              <p className="text-[11px] text-slate-400">
                Print-ready scenario card sheets for tabletop prototyping and playtesting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/30"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Cards
            </button>
            <button
              type="button"
              onClick={() => setModalOpen('printModal', false)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questList.map((quest) => (
              <div key={quest.uid} className="break-inside-avoid">
                <TabletopCardPreview quest={quest} activeVariants={[]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
