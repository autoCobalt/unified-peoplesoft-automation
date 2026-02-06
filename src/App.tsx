/**
 * App Root Component
 *
 * Renders the main application layout.
 * All state is managed by Zustand stores (no Context providers needed).
 * Component order defines the visual hierarchy of the application.
 */

import { ConnectionPanel, ErrorBoundary, Footer, Header, ModeBanner, TabContent } from './components';
import { useSmartFormStore } from './stores';

/**
 * Main App Content
 *
 * Simple layout listing components in display order.
 */
function AppContent() {
  const onTabSwitch = useSmartFormStore(s => s.onTabSwitch);

  return (
    <div className="app">
      <ModeBanner />
      <Header />
      <main className="main-content">
        <ConnectionPanel />
        <TabContent onTabChange={onTabSwitch} />
      </main>
      <Footer />
    </div>
  );
}

/**
 * App Component
 *
 * Root component wrapping content in an error boundary.
 */
function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
