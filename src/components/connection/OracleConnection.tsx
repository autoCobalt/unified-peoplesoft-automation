/**
 * Oracle Connection Panel
 *
 * Displays Oracle SQL connection form with credentials.
 * Collapses to a minimal view when connected, showing a green border
 * and expandable connection info.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { oracleConfig } from '../../config';
import { useConnection } from '../../context';
import { slideLeftFadeStagger, fadeInOut } from '../../utils/motion';
import {
  InfoRow,
  CredentialsForm,
  ConnectionInfoPanel,
  ConnectedHeader,
} from './shared';

export function OracleConnection() {
  const {
    oracleState,
    oracleCredentials,
    connectOracle,
  } = useConnection();

  const [showInfo, setShowInfo] = useState(false);

  const displayUsername = oracleCredentials?.username ?? '';

  const handleConnect = (credentials: { username: string; password: string }) => {
    void connectOracle(credentials);
  };

  const toggleInfo = () => { setShowInfo(!showInfo); };

  return (
    <motion.div
      className={`connection-panel oracle-panel ${oracleState.isConnected ? 'connected' : ''}`}
      {...slideLeftFadeStagger}
    >
      <AnimatePresence mode="wait">
        {oracleState.isConnected ? (
          <ConnectedHeader
            title="Oracle"
            subtitle={<span className="connected-service-name">{oracleConfig.serviceName}</span>}
            username={displayUsername}
            showInfo={showInfo}
            onToggleInfo={toggleInfo}
          >
            <InfoRow label="Hostname" value={oracleConfig.hostname} />
            <InfoRow label="Port" value={oracleConfig.port} />
            <InfoRow label="Service Name" value={oracleConfig.serviceName} valueClassName="service-name" />
          </ConnectedHeader>
        ) : (
          <motion.div key="disconnected" {...fadeInOut}>
            <div className="panel-header">
              <h2>Oracle SQL Connection</h2>
            </div>

            <CredentialsForm
              idPrefix="oracle"
              placeholders={{
                username: 'Enter Oracle username',
                password: 'Enter Oracle password',
              }}
              submitLabel="Test Connection"
              loadingLabel="Testing..."
              isSubmitting={oracleState.isConnecting}
              error={oracleState.error}
              onSubmit={handleConnect}
            />

            <ConnectionInfoPanel
              isOpen={showInfo}
              onToggle={toggleInfo}
              badge={<>Service Name: {oracleConfig.serviceName}</>}
            >
              <InfoRow label="Database Type" value="Oracle" />
              <InfoRow label="Role" value="default" />
              <InfoRow label="Auth Type" value="Default" />
              <InfoRow label="Connection" value="Basic" />
              <InfoRow label="Hostname" value={oracleConfig.hostname} highlight />
              <InfoRow label="Port" value={oracleConfig.port} />
              <InfoRow label="Service Name" value={oracleConfig.serviceName} valueClassName="service-name" />
            </ConnectionInfoPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
