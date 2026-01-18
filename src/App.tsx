/**
 * App Root Component
 *
 * Sets up providers and renders the main application layout.
 * Component order defines the visual hierarchy of the application.
 */

import { ConnectionProvider } from './context';
import { ConnectionPanel, Footer, Header, ModeBanner, TabContent } from './components';

/**
 * Main App Content
 *
 * Simple layout listing components in display order.
 */
function AppContent() {
  return (
    <div className="app">
      <ModeBanner />
      <Header />
      <main className="main-content">
        <ConnectionPanel />
        <TabContent />
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
