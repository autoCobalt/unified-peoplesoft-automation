import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

// Application mode from environment variables
const appMode = import.meta.env.VITE_APP_MODE || 'development';
const isDevelopment = appMode === 'development';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      {/* Application Mode Banner */}
      <div className={`mode-banner ${isDevelopment ? 'mode-development' : 'mode-production'}`}>
        <span className="mode-indicator"></span>
        <span className="mode-text">
          {isDevelopment ? 'Development Mode' : 'Production Mode'}
        </span>
        <span className="mode-description">
          {isDevelopment
            ? '— Using mock data and placeholder servers'
            : '— Connected to live PeopleSoft & Oracle systems'}
        </span>
      </div>

      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Unified PeopleSoft Automation</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
