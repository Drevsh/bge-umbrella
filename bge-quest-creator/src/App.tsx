import React, { useEffect } from 'react';
import { TopHeaderBar } from './components/header/TopHeaderBar';
import { ActDrawer } from './components/navigation/ActDrawer';
import { QuestGraphCanvas } from './components/canvas/QuestGraphCanvas';
import { QuestInspectorDrawer } from './components/inspector/QuestInspectorDrawer';
import { CampaignMatrixTable, StateTagAuditGrid } from './components/overview/CampaignMatrixTable';
import { NewQuestWizardModal } from './components/wizard/NewQuestWizardModal';
import { CampaignManagerModal } from './components/modals/CampaignManagerModal';
import { GameManagerModal } from './components/modals/GameManagerModal';
import { ExportModal } from './components/modals/ExportModal';
import { PrintCardsModal } from './components/modals/PrintCardsModal';
import { ApiKeyModal } from './components/modals/ApiKeyModal';
import { ExplorationTimeTrackBar } from './components/canvas/ExplorationTimeTrackBar';
import { useCampaignStore } from './store/useCampaignStore';

export const App: React.FC = () => {
  const initStore = useCampaignStore((s) => s.initStore);
  const viewMode = useCampaignStore((s) => s.viewMode);
  const selectedQuestId = useCampaignStore((s) => s.selectedQuestId);
  const selectedEdgeId = useCampaignStore((s) => s.selectedEdgeId);

  // Initialize store from IndexedDB on startup
  useEffect(() => {
    initStore();
  }, [initStore]);

  // Global Keyboard Shortcuts (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if active element is an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useCampaignStore.temporal.getState().redo();
        } else {
          useCampaignStore.temporal.getState().undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useCampaignStore.temporal.getState().redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        // Ctrl+D: Duplicate currently selected quest
        const state = useCampaignStore.getState();
        if (state.selectedQuestId) {
          e.preventDefault();
          state.duplicateQuest(state.selectedQuestId);
        }
      } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // N: Quick Open New Quest Wizard
        e.preventDefault();
        useCampaignStore.getState().setModalOpen('wizard', true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete/Backspace: Delete selected quest if any
        const state = useCampaignStore.getState();
        if (state.selectedQuestId) {
          e.preventDefault();
          state.deleteQuest(state.selectedQuestId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <TopHeaderBar />

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden relative">
        {viewMode === 'OVERVIEW' ? (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
            <CampaignMatrixTable />
            <StateTagAuditGrid />
          </div>
        ) : (
          <>
            {/* React Flow Interactive Canvas */}
            <QuestGraphCanvas />

            {/* Dragon Eclipse World Exploration Stage Time Track */}
            <ExplorationTimeTrackBar />

            {/* Split View: Automatically closes when nothing is selected */}
            {viewMode === 'SPLIT' && Boolean(selectedQuestId || selectedEdgeId) && (
              <QuestInspectorDrawer />
            )}
            {viewMode === 'FULL_GRAPH' && Boolean(selectedQuestId || selectedEdgeId) && (
              <div className="md:hidden">
                <QuestInspectorDrawer />
              </div>
            )}
          </>
        )}
      </main>

      {/* Left Act Overview Drawer */}
      <ActDrawer />

      {/* Modal Dialogs */}
      <NewQuestWizardModal />
      <CampaignManagerModal />
      <GameManagerModal />
      <ExportModal />
      <PrintCardsModal />
      <ApiKeyModal />
    </div>
  );
};
export default App;
