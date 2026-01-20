/**
 * Oracle Connection Panel
 *
 * Displays Oracle SQL connection form with credentials.
 * Collapses to a minimal view when connected, showing a green border
 * and expandable connection info.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnection } from '../../context';
import {
  slideLeftFadeStagger,
  fadeInOut,
  expandCollapseQuick,
  buttonInteraction,
  slideDownSmallFade,
} from '../../utils/motion';

/**
 * Oracle configuration from environment variables
 */
const oracleConfig = {
  hostname: (import.meta.env.VITE_ORACLE_HOSTNAME as string | undefined) ?? 'Not configured',
  port: (import.meta.env.VITE_ORACLE_PORT as string | undefined) ?? '1521',
  serviceName: (import.meta.env.VITE_ORACLE_SERVICE_NAME as string | undefined) ?? 'N/A',
};

export function OracleConnection() {
  const {
    oracleState,
    oracleCredentials,
    connectOracle,
  } = useConnection();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // Display username from credentials when connected, form input when not
  const displayUsername = oracleCredentials?.username ?? username;

  const handleConnect = () => {
    void connectOracle({ username, password });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleConnect();
  };

  return (
    <motion.div
      className={`connection-panel oracle-panel ${oracleState.isConnected ? 'connected' : ''}`}
      {...slideLeftFadeStagger}
    >
      <AnimatePresence mode="wait">
        {oracleState.isConnected ? (
          /* Connected State - Single Line */
          <motion.div
            key="connected"
            className="connected-single-line"
            {...fadeInOut}
          >
            <div className="connected-line">
              <h2 className="connected-title">
                <span className="title-full">Oracle SQL</span>
              </h2>
              <span className="connected-service-name">{oracleConfig.serviceName}</span>
              <div className="connected-user-badge">
                <svg viewBox="0 0 24 24" fill="none" className="check-icon">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{displayUsername}</span>
              </div>
              <button
                type="button"
                className="info-toggle-compact"
                onClick={() => { setShowInfo(!showInfo); }}
                title="Connection Info"
              >
                <svg
                  className={`chevron ${showInfo ? 'open' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M6 9L12 15L18 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <AnimatePresence>
              {showInfo && (
                <motion.div
                  className="info-content"
                  {...expandCollapseQuick}
                >
                  <div className="info-row">
                    <span className="info-label">Hostname:</span>
                    <span className="info-value">{oracleConfig.hostname}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Port:</span>
                    <span className="info-value">{oracleConfig.port}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Service Name:</span>
                    <span className="info-value service-name">{oracleConfig.serviceName}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Disconnected State - Full Form */
          <motion.div
            key="disconnected"
            {...fadeInOut}
          >
            <div className="panel-header">
              <h2>Oracle SQL Connection</h2>
            </div>
            <form onSubmit={handleSubmit} className="connection-form">
              <div className="form-group">
                <label htmlFor="oracle-username-input">Username</label>
                <input
                  id="oracle-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); }}
                  placeholder="Enter Oracle username"
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="oracle-password-input">Password</label>
                <input
                  id="oracle-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); }}
                  placeholder="Enter Oracle password"
                  autoComplete="current-password"
                />
              </div>

              <motion.button
                type="submit"
                className="submit-button"
                disabled={oracleState.isConnecting || !username || !password}
                {...buttonInteraction}
              >
                {oracleState.isConnecting ? (
                  <>
                    <span className="spinner" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </motion.button>

              <AnimatePresence>
                {oracleState.error && (
                  <motion.div
                    className="error-message"
                    {...slideDownSmallFade}
                  >
                    {oracleState.error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Connection Info Section */}
              <div className="connection-info">
                <button
                  type="button"
                  className="info-toggle"
                  onClick={() => { setShowInfo(!showInfo); }}
                >
                  <svg
                    className={`chevron ${showInfo ? 'open' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Connection Info
                  <span className="info-badge">Service Name: {oracleConfig.serviceName}</span>
                </button>

                <AnimatePresence>
                  {showInfo && (
                    <motion.div
                      className="info-content"
                      {...expandCollapseQuick}
                    >
                      <div className="info-row">
                        <span className="info-label">Database Type:</span>
                        <span className="info-value">Oracle</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Role:</span>
                        <span className="info-value">default</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Auth Type:</span>
                        <span className="info-value">Default</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Connection:</span>
                        <span className="info-value">Basic</span>
                      </div>
                      <div className="info-row highlight">
                        <span className="info-label">Hostname:</span>
                        <span className="info-value">{oracleConfig.hostname}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Port:</span>
                        <span className="info-value">{oracleConfig.port}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Service Name:</span>
                        <span className="info-value service-name">{oracleConfig.serviceName}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
