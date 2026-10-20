import React, { useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  Image,
  FileCode,
  Sparkles
} from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';
import {
  downloadJsonFile,
  exportCampaignProject,
  parseAndValidateCampaignJson,
  exportNanDeckCsv,
  downloadCsvFile,
  exportGraphImage
} from '../../utils/exporters';

export const ExportModal: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.modals.exportModal);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);
  const activeMetadata = useCampaignStore((s) => s.activeMetadata);
  const quests = useCampaignStore((s) => s.quests);
  const edges = useCampaignStore((s) => s.edges);
  const acts = useCampaignStore((s) => s.acts);
  const activeGameProfile = useCampaignStore((s) => s.activeGameProfile);
  const importCampaign = useCampaignStore((s) => s.importCampaign);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setModalOpen('exportModal', false);
  };

  const handleExportJson = () => {
    const project = exportCampaignProject(activeMetadata, quests, edges, acts, activeGameProfile.id);
    const filename = `${activeMetadata.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_campaign.json`;
    downloadJsonFile(filename, project);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const project = await parseAndValidateCampaignJson(file);
      await importCampaign(project);
      alert(`Successfully imported "${project.metadata.name}"!`);
      handleClose();
    } catch (err: any) {
      alert(`Invalid campaign file format: ${err?.message || err}`);
    }
  };

  const handleExportCsv = () => {
    const csv = exportNanDeckCsv(quests);
    const filename = `${activeMetadata.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_cards.csv`;
    downloadCsvFile(filename, csv);
  };

  const handleExportImage = async (format: 'png' | 'svg') => {
    const canvasElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!canvasElement) {
      alert('Graph canvas element not found.');
      return;
    }
    const filename = `${activeMetadata.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_graph`;
    try {
      await exportGraphImage(canvasElement, filename, format);
    } catch (err) {
      alert('Failed to generate image export. Check console for details.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                Export & Print Pipeline
              </h3>
              <p className="text-[11px] text-slate-400">
                Save project backups, export tabletop CSVs, or render high-resolution graph diagrams
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

        {/* Export Options Grid */}
        <div className="p-5 space-y-4">
          {/* JSON Project Backup & Restore */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-100">
                  Campaign Project JSON
                </h4>
                <p className="text-[11px] text-slate-400">
                  Full campaign file with coordinates, variants, and edges
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-medium flex items-center gap-1 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium flex items-center gap-1 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>

          {/* NanDeck / Adobe InDesign CSV */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-100">
                  NanDeck / InDesign Data Merge CSV
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tabular scenario data formatted for tabletop card layout software
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium flex items-center gap-1 transition-colors shadow-sm shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          </div>

          {/* High-Res Visual Capture */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-100">
                  High-Resolution Flow Diagram
                </h4>
                <p className="text-[11px] text-slate-400">
                  Retina 2x snapshot of your entire campaign graph
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportImage('png')}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-medium flex items-center gap-1 transition-colors shadow-sm"
              >
                PNG
              </button>
              <button
                type="button"
                onClick={() => handleExportImage('svg')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 font-medium flex items-center gap-1 transition-colors"
              >
                SVG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
