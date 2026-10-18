import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactFlowProvider } from '@xyflow/react';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Automatically register and reload when new builds or service worker updates are detected
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // When a new version is built, skip waiting and reload immediately
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] Ready to work offline');
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Check for updates every 15 seconds
      setInterval(() => {
        registration.update().catch(() => {});
      }, 15000);

      // Check for updates whenever the user switches back to the app on tablet
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
    }
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  </React.StrictMode>
);
