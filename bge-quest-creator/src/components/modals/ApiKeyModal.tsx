import React, { useState } from 'react';
import { X, Key, ExternalLink, Check, ShieldCheck } from 'lucide-react';
import { useCampaignStore } from '../../store/useCampaignStore';

export const ApiKeyModal: React.FC = () => {
  const isOpen = useCampaignStore((s) => s.modals.apiKeyModal);
  const setModalOpen = useCampaignStore((s) => s.setModalOpen);
  const geminiApiKey = useCampaignStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useCampaignStore((s) => s.setGeminiApiKey);

  const [inputKey, setInputKey] = useState(geminiApiKey);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setModalOpen('apiKeyModal', false);
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(inputKey.trim());
    setIsSaved(true);
    setTimeout(() => {
      handleClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Google Gemini API Key</h3>
              <p className="text-[11px] text-slate-400">Required for Gemini 3.8 Flash TTS Voice Narration</p>
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Gemini API Key
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none transition-colors"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Your API key is stored locally in your browser and used directly to communicate with Google Gemini APIs. It is never sent to any external server.
            </p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Don't have an API key yet? You can create one for free in the Google AI Studio console.
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium underline block"
              >
                <span>Get API key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-colors"
            >
              {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : null}
              <span>{isSaved ? 'Saved!' : 'Save Key'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
