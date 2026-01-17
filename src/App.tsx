/**
 * App Root Component
 *
 * Sets up providers and renders the main application layout.
 * Tab state is managed here and passed down to components.
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ConnectionProvider } from './context';
import { Header, ModeBanner, TabNavigation, ComingSoon } from './components';
import { SmartFormPanel } from './features/smartform';
import { DEFAULT_TAB, type TabId } from './types';

/**
 * Main App Content
 *
 * Contains the layout and tab switching logic.
 * Wrapped by providers in the App component.
 */
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB);

  /**
   * Renders the appropriate panel based on the active tab.
   * Uses a key prop to trigger AnimatePresence exit/enter animations.
   */
  const renderActivePanel = () => {
    switch (activeTab) {
      case 'smartform':
        return <SmartFormPanel key="smartform" />;
      default:
        // All other tabs show the ComingSoon placeholder
        return <ComingSoon key={activeTab} tabId={activeTab} />;
    }
  };

  return (
    <div className="app">
      <ModeBanner />
      <Header />
      <main className="main-content">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <AnimatePresence mode="wait">
          {renderActivePanel()}
        </AnimatePresence>
      </main>
    </div>
  );
}

/**
 * App Component
 *
 * Root component that sets up all providers.
 */
function App() {
  return (
    <ConnectionProvider>
      <AppContent />
    </ConnectionProvider>
  );
}

export default App;
