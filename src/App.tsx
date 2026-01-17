/**
 * App Root Component
 *
 * Sets up providers and renders the main application layout.
 * Tab state is managed here and passed down to components.
 */

import { useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ConnectionProvider } from './context';
import {
  Footer,
  Header,
  ModeBanner,
  TabNavigation,
  AnimatedPanel,
  ComingSoon,
  SmartFormPanel,
} from './components';
import { DEFAULT_TAB, TABS, type TabId } from './types';

/**
 * Main App Content
 *
 * Contains the layout and tab switching logic.
 * Wrapped by providers in the App component.
 */
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB);
  const [direction, setDirection] = useState(0);
  const prevIndexRef = useRef(0);

  /**
   * Handles tab changes and calculates animation direction.
   * Direction is 1 for forward (right) and -1 for backward (left).
   */
  const handleTabChange = (newTabId: TabId) => {
    const newIndex = TABS.findIndex((t) => t.id === newTabId);
    const prevIndex = prevIndexRef.current;

    setDirection(newIndex > prevIndex ? 1 : -1);
    prevIndexRef.current = newIndex;
    setActiveTab(newTabId);
  };

  /**
   * Renders the appropriate panel based on the active tab.
   */
  const renderActivePanel = () => {
    switch (activeTab) {
      case 'smartform':
        return <SmartFormPanel />;
      default:
        // All other tabs show the ComingSoon placeholder
        return <ComingSoon tabId={activeTab} />;
    }
  };

  return (
    <div className="app">
      <ModeBanner />
      <Header />
      <main className="main-content">
        <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        <div style={{ perspective: '1000px', overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <AnimatedPanel panelKey={activeTab} direction={direction}>
              {renderActivePanel()}
            </AnimatedPanel>
          </AnimatePresence>
        </div>
      </main>
      <Footer />
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
