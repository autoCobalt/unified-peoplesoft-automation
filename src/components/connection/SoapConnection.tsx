/**
 * SOAP Connection Panel
 *
 * Displays PeopleSoft ExcelToCI connection form and configuration info.
 * Collapses to a minimal view when connected, showing a green border
 * and expandable connection info.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnection } from '../../context';

/**
 * PeopleSoft SOAP configuration from environment variables
 */
const soapConfig = {
  protocol: (import.meta.env.VITE_PS_PROTOCOL as string | undefined) ?? 'https',
  server: (import.meta.env.VITE_PS_SERVER as string | undefined) ?? 'Not configured',
  port: (import.meta.env.VITE_PS_PORT as string | undefined) ?? '443',
  siteName: (import.meta.env.VITE_PS_SITE_NAME as string | undefined) ?? 'N/A',
  portal: (import.meta.env.VITE_PS_PORTAL as string | undefined) ?? 'N/A',
  node: (import.meta.env.VITE_PS_NODE as string | undefined) ?? 'N/A',
};

export function SoapConnection() {
  const {
    soapState,
    soapCredentials,
    connectSoap,
  } = useConnection();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  // Display username from credentials when connected, form input when not
  const displayUsername = soapCredentials?.username ?? username;

  const handleConnect = () => {
    void connectSoap({ username, password });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleConnect();
  };

  return (
    <motion.div
      className={`connection-panel soap-panel ${soapState.isConnected ? 'connected' : ''}`}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {soapState.isConnected ? (
          /* Connected State - Single Line */
          <motion.div
            key="connected"
            className="connected-single-line"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="connected-line">
              <h2 className="connected-title">
                <span className="title-full">PeopleSoft CI</span>
              </h2>
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
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="info-row">
                    <span className="info-label">Server:</span>
                    <span className="info-value">
                      {soapConfig.server}:{soapConfig.port}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Site:</span>
                    <span className="info-value">{soapConfig.siteName}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Node:</span>
                    <span className="info-value">{soapConfig.node}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Disconnected State - Full Form */
          <motion.div
            key="disconnected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="panel-header">
              <h2>PeopleSoft CI Connection</h2>
            </div>
            <form onSubmit={handleSubmit} className="connection-form">
              <div className="form-group">
                <label htmlFor="soap-username-input">Username</label>
                <input
                  id="soap-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); }}
                  placeholder="Enter PeopleSoft username"
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="soap-password-input">Password</label>
                <input
                  id="soap-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); }}
                  placeholder="Enter PeopleSoft password"
                  autoComplete="current-password"
                />
              </div>

              <motion.button
                type="submit"
                className="submit-button"
                disabled={soapState.isConnecting || !username || !password}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {soapState.isConnecting ? (
                  <>
                    <span className="spinner" />
                    Connecting...
                  </>
                ) : (
                  'Connect to SOAP'
                )}
              </motion.button>

              <AnimatePresence>
                {soapState.error && (
                  <motion.div
                    className="error-message"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {soapState.error}
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
                </button>

                <AnimatePresence>
                  {showInfo && (
                    <motion.div
                      className="info-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="info-row">
                        <span className="info-label">Server:</span>
                        <span className="info-value">
                          {soapConfig.server}:{soapConfig.port}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Site:</span>
                        <span className="info-value">{soapConfig.siteName}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Portal:</span>
                        <span className="info-value">{soapConfig.portal}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Node:</span>
                        <span className="info-value">{soapConfig.node}</span>
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
