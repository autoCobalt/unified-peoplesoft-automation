import { useState } from 'react';
import { motion } from 'framer-motion';
import { useConnection } from '../context';
import { slideDownBanner } from '../utils/motion';
import './ModeBanner.css';

// Application mode from environment variables
const appMode = (import.meta.env.VITE_APP_MODE as string | undefined) ?? 'development';
const isDevelopment = appMode === 'development';

/**
 * ModeBanner Component
 *
 * Displays a banner at the top of the application indicating
 * whether the app is running in development or production mode.
 * - Development: Green banner, uses mock data and placeholder servers
 * - Production: Red banner, connects to live PeopleSoft & Oracle systems
 *
 * In development mode, includes helper buttons to quickly simulate
 * connections without using the browser console.
 *
 * Animates in from the top with a slide-down fade effect.
 */
export function ModeBanner() {
  const [devUsername, setDevUsername] = useState('dev_user');
  const {
    oracleState,
    soapState,
    disconnectAll,
  } = useConnection();

  const hasAnyConnection = oracleState.isConnected || soapState.isConnected;

  const handleSimulateOracle = () => {
    window.devSimulate?.oracleConnect(devUsername);
  };

  const handleSimulateSoap = () => {
    window.devSimulate?.soapConnect(devUsername);
  };

  const handleSimulateBoth = () => {
    window.devSimulate?.oracleConnect(devUsername);
    window.devSimulate?.soapConnect(devUsername);
  };

  return (
    <motion.div
      className={`mode-banner ${isDevelopment ? 'mode-development' : 'mode-production'}`}
      {...slideDownBanner}
    >
      <div className="mode-info">
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

      {isDevelopment && (
        <div className="dev-controls">
          <input
            type="text"
            className="dev-username-input"
            value={devUsername}
            onChange={(e) => { setDevUsername(e.target.value); }}
            placeholder="username"
            title="Username for simulated connections"
          />
          <button
            type="button"
            className="dev-button"
            onClick={handleSimulateOracle}
            disabled={oracleState.isConnected}
            title="Simulate Oracle connection"
          >
            Oracle
          </button>
          <button
            type="button"
            className="dev-button"
            onClick={handleSimulateSoap}
            disabled={soapState.isConnected}
            title="Simulate PeopleSoft connection"
          >
            PeopleSoft
          </button>
          <button
            type="button"
            className="dev-button dev-button-both"
            onClick={handleSimulateBoth}
            disabled={oracleState.isConnected && soapState.isConnected}
            title="Simulate both connections"
          >
            Both
          </button>
          {hasAnyConnection && (
            <button
              type="button"
              className="dev-button dev-button-disconnect"
              onClick={disconnectAll}
              title="Disconnect all"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
