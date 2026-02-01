/**
 * App Root Component
 *
 * Sets up providers and renders the main application layout.
 * Component order defines the visual hierarchy of the application.
 */

import { AppProviders, useSmartForm } from './context';
import { ConnectionPanel, ErrorBoundary, Footer, Header, ModeBanner, TabContent } from './components';

/**
 * Main App Content
 *
 * Simple layout listing components in display order.
 */
function AppContent() {
  const { onTabSwitch } = useSmartForm();

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
 * Root component that sets up all providers.
 */
function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
