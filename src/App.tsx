import { Header, ModeBanner } from './components';

function App() {
  return (
    <div className="app">
      <ModeBanner />
      <Header />
      <main className="main-content">
        {/* Main application content will go here */}
      </main>
    </div>
  );
}

export default App;
